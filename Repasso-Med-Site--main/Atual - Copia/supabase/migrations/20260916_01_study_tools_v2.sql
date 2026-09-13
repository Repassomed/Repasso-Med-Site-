-- =====================================================================
-- REPASSO MED · Ferramentas de estudo V2 (toolbox · caneta · anotações)
-- Data: 2026-09-16
--
-- ADITIVO E IDEMPOTENTE.
-- Não faz DROP de tabela, não faz TRUNCATE, não desabilita RLS, não
-- relaxa nenhuma policy existente, não toca em Auth, profiles, orders,
-- products, devices nem em nada do fluxo de pagamento.
--
-- O que faz:
--   1) alarga o CHECK de user_highlights.color para aceitar 'yellow'
--      (as quatro cores antigas continuam válidas — nada é migrado);
--   2) cria public.user_ink_strokes  — traços da caneta;
--   3) cria public.user_notes        — «Minhas anotações»;
--   4) cria public.study_tools_beta  — quem recebe a V2 (fail closed).
--
-- Rollback: ver 20260916_01_study_tools_v2_rollback.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) MARCA-TEXTO · quinta cor
--
--    A V2 usa AMARELO como cor padrão. O CHECK da 20260913_01 só admitia
--    quatro cores, por isso é preciso alargá-lo ANTES de a V2 gravar.
--    Trocamos a constraint por uma equivalente com 'yellow' incluído: as
--    linhas já existentes (red/blue/green/pink) continuam todas válidas,
--    nenhuma é reescrita.
-- ---------------------------------------------------------------------
alter table public.user_highlights
  drop constraint if exists user_highlights_color_valid;

do $$ begin
  alter table public.user_highlights
    add constraint user_highlights_color_valid
    check (color in ('red','blue','green','pink','yellow'));
exception when duplicate_object then null; end $$;

comment on constraint user_highlights_color_valid on public.user_highlights is
  'Cinco cores do marcador. «yellow» entrou na V2 (2026-09-16) e é o padrão do cliente novo; as quatro antigas continuam em uso.';


-- ---------------------------------------------------------------------
-- 2) CANETA · traços
--
--    Um traço = uma linha. Deliberadamente NÃO é um JSON agregado por
--    bloco: com linhas independentes, tablet e desktop abertos ao mesmo
--    tempo nunca se sobrescrevem — cada um insere e apaga os seus traços
--    e o pior caso é um traço a mais, nunca todos os desenhos perdidos.
--
--    `points` é um array de pares [x,y] NORMALIZADOS (0..1) dentro da
--    caixa da âncora, nunca coordenadas absolutas da página. Por isso o
--    desenho acompanha o bloco quando o viewport muda.
-- ---------------------------------------------------------------------
create table if not exists public.user_ink_strokes (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  subject_slug text        not null,
  anchor_id    text        not null,
  color        text        not null default 'black',
  width        text        not null default 'medium',
  points       jsonb       not null,
  created_at   timestamptz not null default now()
);

do $$ begin
  alter table public.user_ink_strokes
    add constraint user_ink_strokes_color_valid check (color in ('black','blue','red'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.user_ink_strokes
    add constraint user_ink_strokes_width_valid check (width in ('thin','medium','thick'));
exception when duplicate_object then null; end $$;

-- Teto de tamanho: o cliente já simplifica o traço no pointerup; isto é a
-- rede de segurança contra um payload absurdo.
do $$ begin
  alter table public.user_ink_strokes
    add constraint user_ink_strokes_points_shape
    check (jsonb_typeof(points) = 'array'
           and jsonb_array_length(points) between 1 and 1200);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.user_ink_strokes
    add constraint user_ink_strokes_anchor_len check (char_length(anchor_id) between 1 and 200);
exception when duplicate_object then null; end $$;

create index if not exists user_ink_strokes_user_subject_idx
  on public.user_ink_strokes (user_id, subject_slug);

alter table public.user_ink_strokes enable row level security;

drop policy if exists user_ink_strokes_select_self on public.user_ink_strokes;
create policy user_ink_strokes_select_self on public.user_ink_strokes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_ink_strokes_insert_self on public.user_ink_strokes;
create policy user_ink_strokes_insert_self on public.user_ink_strokes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists user_ink_strokes_update_self on public.user_ink_strokes;
create policy user_ink_strokes_update_self on public.user_ink_strokes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_ink_strokes_delete_self on public.user_ink_strokes;
create policy user_ink_strokes_delete_self on public.user_ink_strokes
  for delete to authenticated using (user_id = auth.uid());

comment on table public.user_ink_strokes is
  'Traços da caneta. Uma linha por traço (nunca um JSON agregado por bloco, para que dois dispositivos não se sobrescrevam). points = pares [x,y] normalizados 0..1 dentro da âncora.';


-- ---------------------------------------------------------------------
-- 3) MINHAS ANOTAÇÕES
--
--    Texto simples. Sem HTML, sem editor rico, sem e-mail, sem token.
-- ---------------------------------------------------------------------
create table if not exists public.user_notes (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  subject_slug text        not null,
  anchor_id    text,
  anchor_label text,
  title        text        not null default '',
  body         text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

do $$ begin
  alter table public.user_notes
    add constraint user_notes_title_len check (char_length(title) <= 160);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.user_notes
    add constraint user_notes_body_len check (char_length(body) <= 20000);
exception when duplicate_object then null; end $$;

create index if not exists user_notes_user_subject_idx
  on public.user_notes (user_id, subject_slug, updated_at desc);

alter table public.user_notes enable row level security;

drop policy if exists user_notes_select_self on public.user_notes;
create policy user_notes_select_self on public.user_notes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_notes_insert_self on public.user_notes;
create policy user_notes_insert_self on public.user_notes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists user_notes_update_self on public.user_notes;
create policy user_notes_update_self on public.user_notes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_notes_delete_self on public.user_notes;
create policy user_notes_delete_self on public.user_notes
  for delete to authenticated using (user_id = auth.uid());

comment on table public.user_notes is
  'Anotações escritas pelo aluno, ligadas a uma matéria e opcionalmente a um bloco. Texto simples; nunca e-mail, token ou sessão.';


-- ---------------------------------------------------------------------
-- 4) ACESSO À BETA
--
--    Só decide QUEM recebe a V2. Não guarda e-mail, não guarda nada além
--    do UID e de um carimbo. O aluno pode LER a sua própria linha (é como
--    o cliente descobre se tem acesso) e mais nada: sem policy de INSERT,
--    UPDATE ou DELETE, ninguém se auto-habilita pelo frontend — só o
--    painel do Supabase, com service_role, que nunca vai ao navegador.
--
--    O cliente falha FECHADO: erro ou tabela vazia => experiência antiga.
-- ---------------------------------------------------------------------
create table if not exists public.study_tools_beta (
  user_id    uuid        primary key references public.profiles(id) on delete cascade,
  enabled    boolean     not null default true,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.study_tools_beta enable row level security;

drop policy if exists study_tools_beta_select_self on public.study_tools_beta;
create policy study_tools_beta_select_self on public.study_tools_beta
  for select to authenticated using (user_id = auth.uid());

-- Sem policies de escrita: propositado (ver comentário acima).

comment on table public.study_tools_beta is
  'Lista de quem recebe as Ferramentas de estudo V2. Somente leitura da própria linha; a escrita é feita no painel, nunca pelo cliente.';

-- Os dois testers desta fase. Só UID — nunca e-mail.
insert into public.study_tools_beta (user_id, note)
values
  ('d4d215d3-36dd-4efb-8869-bdea5376c648', 'beta tester 1 · ferramentas de estudo v2'),
  ('448e4d63-e410-48ed-8c71-8e99af317d3e', 'beta tester 2 · ferramentas de estudo v2')
on conflict (user_id) do update set enabled = true;
