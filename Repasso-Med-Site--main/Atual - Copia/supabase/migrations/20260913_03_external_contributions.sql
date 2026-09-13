/* =====================================================================
   REPASSO MED · CONTRIBUIÇÕES DE MATERIAL EXTERNO
   20260913_03_external_contributions.sql

   O QUE ESTA MIGRATION FAZ
   -----------------------------------------------------------------
   Cria a via «o aluno manda material» — resumo, prova antiga, foto do
   quadro, PDF da cátedra — que hoje não existe. O canal de texto já
   existe (tabela `feedback`, card «Caja de sugerencias»); esta é a
   parte que faltava: o ARQUIVO.

   1. tabela  public.external_contributions   (só METADADOS)
   2. bucket  storage 'aportes'               (PRIVADO, é onde vão os bytes)
   3. RLS nas duas pontas, no mesmo padrão já usado em `feedback`
   4. trigger anti-spam, no mesmo padrão de `feedback_rate_limit()`

   O QUE ELA NÃO FAZ
   -----------------------------------------------------------------
   Não apaga, não trunca, não altera nenhuma tabela, policy, função ou
   RPC que já existia. Não toca Auth, `profiles`, `user_subjects`,
   `subjects`, `products`, `orders`, `user_sessions` nem `user_devices`.
   Só acrescenta.

   POR QUE OS BYTES NÃO FICAM NO POSTGRES
   -----------------------------------------------------------------
   Um PDF de aula passa fácil de 10 MB. Guardar base64 em coluna
   inflaria a tabela, estouraria o payload da função Netlify (6 MB) e
   tornaria cada SELECT do painel administrativo caríssimo. Os bytes
   ficam no Storage; aqui fica só o caminho.

   IDEMPOTENTE: pode ser rodada mais de uma vez sem erro.
   ROLLBACK: 20260913_03_external_contributions_rollback.sql
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. TABELA — só metadados
   ------------------------------------------------------------------ */
create table if not exists public.external_contributions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,

  /* Fotografia do cadastro no momento do envio. Igual a `feedback`:
     o painel precisa saber quem mandou mesmo que o perfil mude depois. */
  nombre        text,
  email         text,

  /* Destino pedagógico. Vem de `public.subjects`, nunca de uma lista
     paralela escrita à mão no frontend. `semester` pode ser nulo porque
     há matérias sem semestre atribuído no catálogo atual. */
  semester      int,
  subject_slug  text,

  /* Recado opcional do aluno. O material pode vir sem texto nenhum. */
  mensaje       text,

  /* Arquivos: um array de objetos
       { path, name, size, mime }
     `path` é o caminho DENTRO do bucket privado 'aportes'.
     Aqui nunca entra base64, blob, nem o conteúdo do arquivo. */
  files         jsonb not null default '[]'::jsonb,

  /* Estado do espelhamento para o Google Drive. */
  drive_status  text not null default 'pendiente',
  drive_folder_url text,
  drive_error   text,
  drive_sent_at timestamptz,

  /* Badge NOVA no painel administrativo — mesmo mecanismo de `feedback`. */
  leido_en      timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.external_contributions is
  'Material externo enviado pelos alunos. Só metadados: os arquivos vivem no bucket privado de Storage «aportes» e são espelhados no Google Drive.';
comment on column public.external_contributions.files is
  'Array de {path,name,size,mime}. NUNCA conteúdo de arquivo.';
comment on column public.external_contributions.drive_status is
  'pendiente | enviado | error — estado do espelhamento no Drive.';

/* CHECKs criados à parte para a migration continuar idempotente. */
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'external_contributions_status_valid') then
    alter table public.external_contributions
      add constraint external_contributions_status_valid
      check (drive_status in ('pendiente', 'enviado', 'error'));
  end if;

  /* Um envio precisa ter conteúdo: ou arquivo, ou recado. Um envio
     vazio só geraria ruído no painel. */
  if not exists (select 1 from pg_constraint where conname = 'external_contributions_no_vacio') then
    alter table public.external_contributions
      add constraint external_contributions_no_vacio
      check (jsonb_array_length(files) > 0 or coalesce(length(btrim(mensaje)), 0) >= 3);
  end if;

  /* Teto de arquivos por envio. Segura tanto o abuso quanto o clique
     acidental em «selecionar tudo». */
  if not exists (select 1 from pg_constraint where conname = 'external_contributions_max_archivos') then
    alter table public.external_contributions
      add constraint external_contributions_max_archivos
      check (jsonb_array_length(files) <= 10);
  end if;
end $$;

create index if not exists external_contributions_user_idx
  on public.external_contributions (user_id, created_at desc);
create index if not exists external_contributions_nuevas_idx
  on public.external_contributions (created_at desc) where leido_en is null;

/* ---------------------------------------------------------------------
   2. RLS — o mesmo trio já usado em `feedback`
   ------------------------------------------------------------------ */
alter table public.external_contributions enable row level security;

drop policy if exists external_contributions_insert_self on public.external_contributions;
create policy external_contributions_insert_self
  on public.external_contributions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists external_contributions_select_self on public.external_contributions;
create policy external_contributions_select_self
  on public.external_contributions for select to authenticated
  using (user_id = auth.uid());

/* Não existe policy de UPDATE para o aluno: depois de enviado, nem o
   estado do Drive nem o `leido_en` podem ser mexidos por ele. */
drop policy if exists external_contributions_admin_all on public.external_contributions;
create policy external_contributions_admin_all
  on public.external_contributions for all to authenticated
  using (is_admin()) with check (is_admin());

/* ---------------------------------------------------------------------
   3. ANTI-SPAM — mesmo desenho de feedback_rate_limit()
   ------------------------------------------------------------------ */
create or replace function public.external_contributions_rate_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare n int;
begin
  select count(*) into n
    from public.external_contributions
   where user_id = new.user_id
     and created_at > now() - interval '1 hour';
  if n >= 5 then
    raise exception 'Ya enviaste varios materiales en poco tiempo. Probá de nuevo en un rato.';
  end if;
  return new;
end;
$function$;

drop trigger if exists external_contributions_rate_limit_trg on public.external_contributions;
create trigger external_contributions_rate_limit_trg
  before insert on public.external_contributions
  for each row execute function public.external_contributions_rate_limit();

/* ---------------------------------------------------------------------
   4. BUCKET PRIVADO 'aportes'
   O bucket `flyers` que já existe é PÚBLICO — foi feito para os
   anúncios. Material de aluno não pode ficar em URL pública adivinhável,
   então ganha bucket próprio, privado, com teto de tamanho e lista de
   tipos permitidos.
   ------------------------------------------------------------------ */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aportes', 'aportes', false, 52428800,
  array[
    'application/pdf',
    'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/* Caminho obrigatório: <user_id>/<id-do-envio>/<arquivo>
   A primeira pasta TEM que ser o uuid de quem está logado — é isso que
   impede um aluno de escrever dentro da pasta de outro. */
drop policy if exists aportes_insert_own on storage.objects;
create policy aportes_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'aportes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists aportes_select_own on storage.objects;
create policy aportes_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'aportes'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

drop policy if exists aportes_admin_delete on storage.objects;
create policy aportes_admin_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'aportes' and is_admin());
