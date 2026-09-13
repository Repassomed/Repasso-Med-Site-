/* =====================================================================
   REPASSO MED · ADMIN V2 — ETAPA B · MENSAGENS
   20260913_07_admin_v2_mensajes.sql

   Migration ADITIVA. Cria UMA tabela nova e quatro funções. Não altera
   nenhuma tabela existente, não apaga nada, não desativa RLS nenhuma.
   `feedback` continua exatamente como está — inclusive as policies.

   O QUE ESTA MIGRATION RESOLVE
   -----------------------------------------------------------------
   Hoje a caixa de sugestões é um mão-única: o aluno escreve, a linha
   cai em `feedback`, o painel lê e marca como lida. Se a resposta
   exige uma pergunta de volta — «em qual bloco?», «qual navegador?» —
   não há por onde. Esta tabela é a volta.

   POR QUE UMA TABELA NOVA E NÃO UMA COLUNA `respuesta` EM `feedback`
   -----------------------------------------------------------------
   Uma coluna só guarda UMA resposta. Conversa tem ida e volta, e a
   segunda mensagem sobrescreveria a primeira. Além disso uma coluna
   não tem `read_at` por mensagem, que é o que faz o contador do aluno
   funcionar. `feedback` guarda a sugestão; esta tabela guarda o que
   veio depois dela.

   POR QUE `user_id` ESTÁ DUPLICADO AQUI
   -----------------------------------------------------------------
   O dono da conversa já está em `feedback.user_id`. Repetir a coluna
   permite que a policy de leitura seja `user_id = auth.uid()` — uma
   comparação direta — em vez de uma subconsulta em `feedback` a cada
   linha lida. Para a cópia não poder divergir do original, ela NÃO é
   preenchida por quem insere: um trigger `before insert` a sobrescreve
   com o dono real da sugestão, sempre. Quem tentar forjar o campo vê o
   valor ser trocado e depois barrado pelo `with check` da policy.

   REGRAS DE ACESSO — o que cada lado pode
   -----------------------------------------------------------------
     admin   lê, escreve, marca e apaga tudo         (policy `for all`)
     aluno   LÊ  só as mensagens das próprias sugestões
             ESCREVE só na própria conversa, e só como 'alumno'
             NÃO tem policy de UPDATE  → não altera mensagem nenhuma,
                                         muito menos a do admin
             NÃO tem policy de DELETE  → não apaga histórico

   Marcar como lida é a única escrita que o aluno precisa fazer numa
   linha que não é dele, e por isso ela NÃO passa por policy: passa
   pela função `mark_suggestion_read`, que toca só `read_at`, só das
   mensagens do admin, e só na conversa de quem chamou. Dar UPDATE ao
   aluno para ele mexer num timestamp abriria a porta para ele mexer no
   texto — o RLS do Postgres não sabe restringir coluna.

   TEXTO SIMPLES, NUNCA HTML
   -----------------------------------------------------------------
   `message` guarda texto puro. Nada aqui interpreta marcação, e as
   duas pontas (painel e matéria) escapam o conteúdo antes de exibir.

   IDEMPOTENTE. Rollback: 20260913_07_..._rollback.sql
   ===================================================================== */


/* ---------------------------------------------------------------------
   1 · TABELA
   --------------------------------------------------------------------- */
create table if not exists public.suggestion_messages (
  id            uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.feedback(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  sender_type   text not null,
  message       text not null,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);

comment on table public.suggestion_messages is
  'ADMIN V2. Conversa que vem DEPOIS de uma sugestao de feedback. Texto simples, nunca HTML. user_id e o dono da sugestao, preenchido por trigger.';
comment on column public.suggestion_messages.sender_type is
  'Quem escreveu: admin | alumno. O aluno so consegue inserir como alumno (policy).';
comment on column public.suggestion_messages.read_at is
  'Quando o DESTINATARIO abriu a conversa. Mensagem do admin e marcada pelo aluno via mark_suggestion_read(); mensagem do aluno e marcada pelo painel.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'suggestion_messages_sender_valid') then
    alter table public.suggestion_messages
      add constraint suggestion_messages_sender_valid
      check (sender_type in ('admin', 'alumno'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suggestion_messages_len_valid') then
    alter table public.suggestion_messages
      add constraint suggestion_messages_len_valid
      check (length(message) between 1 and 4000);
  end if;
end $$;

create index if not exists suggestion_messages_hilo_idx
  on public.suggestion_messages (suggestion_id, created_at);

/* contador do aluno: «quantas respostas do admin eu ainda não li?» */
create index if not exists suggestion_messages_alumno_pend_idx
  on public.suggestion_messages (user_id)
  where sender_type = 'admin' and read_at is null;

/* contador do painel: «quantas respostas de aluno ainda não vi?» */
create index if not exists suggestion_messages_admin_pend_idx
  on public.suggestion_messages (suggestion_id)
  where sender_type = 'alumno' and read_at is null;


/* ---------------------------------------------------------------------
   2 · TRIGGER: o dono da conversa não é escolhido por quem escreve
   O `before insert` roda ANTES do `with check` da policy, então forjar
   `user_id` não adianta: o valor é substituído e a policy barra depois.
   --------------------------------------------------------------------- */
create or replace function public.suggestion_messages_normalize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_dono uuid;
begin
  select f.user_id into v_dono from public.feedback f where f.id = new.suggestion_id;
  if v_dono is null then
    raise exception 'sugerencia inexistente o sin dueño' using errcode = '23503';
  end if;
  new.user_id := v_dono;

  new.message := btrim(coalesce(new.message, ''));
  if length(new.message) = 0 then
    raise exception 'mensaje vacío' using errcode = '23514';
  end if;
  if length(new.message) > 4000 then
    new.message := left(new.message, 4000);
  end if;

  return new;
end;
$$;

drop trigger if exists suggestion_messages_normalize_trg on public.suggestion_messages;
create trigger suggestion_messages_normalize_trg
  before insert on public.suggestion_messages
  for each row execute function public.suggestion_messages_normalize();


/* ---------------------------------------------------------------------
   3 · RLS — espelha a forma que `feedback` já usa
   --------------------------------------------------------------------- */
alter table public.suggestion_messages enable row level security;

drop policy if exists suggestion_messages_admin_all   on public.suggestion_messages;
drop policy if exists suggestion_messages_select_self on public.suggestion_messages;
drop policy if exists suggestion_messages_insert_self on public.suggestion_messages;

create policy suggestion_messages_admin_all on public.suggestion_messages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy suggestion_messages_select_self on public.suggestion_messages
  for select to authenticated
  using (user_id = auth.uid());

create policy suggestion_messages_insert_self on public.suggestion_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and sender_type = 'alumno'
    and exists (select 1 from public.feedback f
                 where f.id = suggestion_id and f.user_id = auth.uid())
  );

/* Nenhuma policy de UPDATE nem de DELETE para o aluno. É deliberado. */


/* ---------------------------------------------------------------------
   4 · O aluno marca a conversa como lida
   Única escrita do aluno fora do `insert`. Toca só `read_at`, só das
   mensagens do ADMIN, e só dentro da conversa de quem chamou.
   --------------------------------------------------------------------- */
create or replace function public.mark_suggestion_read(p_suggestion_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if auth.uid() is null then
    raise exception 'no autenticado' using errcode = '42501';
  end if;

  update public.suggestion_messages m
     set read_at = now()
   where m.suggestion_id = p_suggestion_id
     and m.user_id       = auth.uid()
     and m.sender_type   = 'admin'
     and m.read_at is null;

  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public.mark_suggestion_read(uuid) is
  'ADMIN V2. O aluno marca como lidas as respostas do admin na PROPRIA conversa. Nao toca no texto e nao alcanca conversa de outro.';


/* ---------------------------------------------------------------------
   5 · Lista de conversas do painel — uma chamada, não N+1
   O painel precisa de: a sugestão, quantas respostas tem, quantas
   mensagens de aluno ainda não foram vistas e quem falou por último.
   Buscar isso conversa por conversa seriam 50 requisições por tela.
   --------------------------------------------------------------------- */
create or replace function public.admin_suggestion_threads(p_limit int default 50)
returns table(
  suggestion_id    uuid,
  user_id          uuid,
  nombre           text,
  email            text,
  subject_slug     text,
  mensaje          text,
  leido_en         timestamptz,
  created_at       timestamptz,
  respuestas       int,
  sin_leer_admin   int,
  ultima_respuesta timestamptz,
  ultimo_autor     text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  return query
    select f.id, f.user_id, f.nombre, f.email, f.subject_slug, f.mensaje,
           f.leido_en, f.created_at,
           coalesce(m.n, 0)::int,
           coalesce(m.pend, 0)::int,
           m.ultima,
           m.autor
      from public.feedback f
      left join lateral (
        select count(*)::int as n,
               count(*) filter (where s.sender_type = 'alumno'
                                  and s.read_at is null)::int as pend,
               max(s.created_at) as ultima,
               (select s2.sender_type from public.suggestion_messages s2
                 where s2.suggestion_id = f.id
                 order by s2.created_at desc limit 1) as autor
          from public.suggestion_messages s
         where s.suggestion_id = f.id
      ) m on true
     order by coalesce(m.ultima, f.created_at) desc
     limit greatest(1, least(coalesce(p_limit, 50), 500));
end;
$$;

comment on function public.admin_suggestion_threads(int) is
  'ADMIN V2. Sugestoes com o resumo da conversa de cada uma, em UMA chamada. Exige is_admin().';


/* ---------------------------------------------------------------------
   6 · «Mis mensajes» do aluno
   `security invoker` de propósito: quem manda aqui é o RLS. A função
   não vê nada que o próprio aluno já não pudesse ler sozinho — ela só
   evita que a matéria faça três consultas para montar uma listinha.
   --------------------------------------------------------------------- */
create or replace function public.my_suggestion_threads()
returns table(
  suggestion_id uuid,
  subject_slug  text,
  mensaje       text,
  created_at    timestamptz,
  respuestas    int,
  sin_leer      int,
  ultima        timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select f.id, f.subject_slug, f.mensaje, f.created_at,
         coalesce(m.n, 0)::int,
         coalesce(m.pend, 0)::int,
         m.ultima
    from public.feedback f
    left join lateral (
      select count(*)::int as n,
             count(*) filter (where s.sender_type = 'admin'
                               and s.read_at is null)::int as pend,
             max(s.created_at) as ultima
        from public.suggestion_messages s
       where s.suggestion_id = f.id
    ) m on true
   where f.user_id = auth.uid()
   order by coalesce(m.ultima, f.created_at) desc
   limit 50;
$$;

comment on function public.my_suggestion_threads() is
  'ADMIN V2. Conversas do proprio aluno. security invoker: o RLS de feedback e de suggestion_messages e quem filtra.';


/* ---------------------------------------------------------------------
   PERMISSÕES
   --------------------------------------------------------------------- */
revoke all on function public.mark_suggestion_read(uuid)      from public, anon;
revoke all on function public.admin_suggestion_threads(int)   from public, anon;
revoke all on function public.my_suggestion_threads()         from public, anon;

grant execute on function public.mark_suggestion_read(uuid)    to authenticated;
grant execute on function public.admin_suggestion_threads(int) to authenticated;
grant execute on function public.my_suggestion_threads()       to authenticated;

/* `suggestion_messages_normalize` é função de TRIGGER. Chamada direto
   pela API ela já falharia («trigger functions can only be called as
   triggers»), mas o Postgres concede EXECUTE a PUBLIC em toda função
   nova e o linter do Supabase aponta isso com razão. Segunda tranca
   fechada: ninguém a alcança pela API, nem para receber o erro. */
revoke all on function public.suggestion_messages_normalize()
  from public, anon, authenticated;

grant select, insert on public.suggestion_messages to authenticated;
grant update, delete on public.suggestion_messages to authenticated;
/* Os grants acima são só o primeiro portão, o do Postgres. Quem decide
   linha a linha é o RLS logo acima: sem policy de UPDATE/DELETE para o
   aluno, esses dois grants não lhe servem para nada — existem para o
   admin, que passa pela policy `for all`. */
