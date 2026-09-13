-- =====================================================================
-- REPASSO MED · Ferramentas de estudo (marca-texto + progresso)
-- Data: 2026-09-13
--
-- ADITIVO. Não altera nenhuma tabela, policy, RPC ou dado existente.
-- Cria duas tabelas novas e isoladas, cada uma com RLS própria:
--   · public.user_highlights       — marcações do marca-texto
--   · public.user_study_progress   — «continuar de onde paraste»
--
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- Rollback: ver 20260913_01_study_tools_rollback.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) MARCA-TEXTO
--    Ancoragem resiliente (modelo TextQuoteSelector): não guardamos
--    offset de HTML, e sim o texto exato + o contexto ao redor. Assim a
--    marcação sobrevive à edição da matéria; se não for possível
--    localizar com segurança, o cliente simplesmente não a desenha.
-- ---------------------------------------------------------------------
create table if not exists public.user_highlights (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  subject_slug text        not null,
  block_id     text        not null,
  exact_text   text        not null,
  prefix       text        not null default '',
  suffix       text        not null default '',
  occurrence   smallint    not null default 0,
  color        text        not null default 'red',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Registros pequenos: nunca HTML, nunca a matéria inteira.
do $$ begin
  alter table public.user_highlights
    add constraint user_highlights_exact_len   check (char_length(exact_text) between 1 and 2000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.user_highlights
    add constraint user_highlights_ctx_len     check (char_length(prefix) <= 120 and char_length(suffix) <= 120);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.user_highlights
    add constraint user_highlights_color_valid check (color in ('red','blue','green','pink'));
  -- o default acima TEM de pertencer a esta lista (ver 20260913_02)
exception when duplicate_object then null; end $$;

create index if not exists user_highlights_user_subject_idx
  on public.user_highlights (user_id, subject_slug);

alter table public.user_highlights enable row level security;

drop policy if exists user_highlights_select_self on public.user_highlights;
create policy user_highlights_select_self on public.user_highlights
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_highlights_insert_self on public.user_highlights;
create policy user_highlights_insert_self on public.user_highlights
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists user_highlights_update_self on public.user_highlights;
create policy user_highlights_update_self on public.user_highlights
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_highlights_delete_self on public.user_highlights;
create policy user_highlights_delete_self on public.user_highlights
  for delete to authenticated using (user_id = auth.uid());

comment on table public.user_highlights is
  'Marcações do marca-texto. Uma linha por marcação. Ancoragem por texto + contexto (TextQuoteSelector), nunca por offset de HTML.';

-- ---------------------------------------------------------------------
-- 2) PROGRESSO DE ESTUDO
--    UMA linha por usuário + matéria (chave primária composta), para que
--    o scroll nunca crie linhas novas — só atualiza a existente.
-- ---------------------------------------------------------------------
create table if not exists public.user_study_progress (
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  subject_slug   text        not null,
  block_id       text,
  block_label    text,
  progress_ratio real        not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (user_id, subject_slug)
);

do $$ begin
  alter table public.user_study_progress
    add constraint user_study_progress_ratio_range check (progress_ratio >= 0 and progress_ratio <= 1);
exception when duplicate_object then null; end $$;

-- «Onde o aluno parou por último»: ordena pelo mais recente do usuário.
create index if not exists user_study_progress_user_recent_idx
  on public.user_study_progress (user_id, updated_at desc);

alter table public.user_study_progress enable row level security;

drop policy if exists user_study_progress_select_self on public.user_study_progress;
create policy user_study_progress_select_self on public.user_study_progress
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_study_progress_insert_self on public.user_study_progress;
create policy user_study_progress_insert_self on public.user_study_progress
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists user_study_progress_update_self on public.user_study_progress;
create policy user_study_progress_update_self on public.user_study_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_study_progress_delete_self on public.user_study_progress;
create policy user_study_progress_delete_self on public.user_study_progress
  for delete to authenticated using (user_id = auth.uid());

comment on table public.user_study_progress is
  'Ponto onde cada aluno parou em cada matéria. Uma linha por usuário+matéria; o scroll faz UPDATE, nunca INSERT novo.';
