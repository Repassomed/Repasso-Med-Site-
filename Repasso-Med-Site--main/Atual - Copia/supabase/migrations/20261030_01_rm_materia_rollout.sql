-- =====================================================================
-- REPASSO MED · Nova Era · liberação POR MATÉRIA em duas etapas
-- Data: 2026-10-30
--
-- ADITIVO E IDEMPOTENTE. Não toca em Auth, profiles, orders, products, pagamentos,
-- my_active_subjects, user_highlights, user_ink_strokes, user_notes nem em nenhum dado de aluno.
--
-- O que faz: cria public.rm_materia_rollout — UMA linha por matéria, três colunas independentes
-- (layout, caneta, tema), cada uma com UM destes valores:
--     off      desligado para TODOS, inclusive administrador   (padrão)
--     preview  SÓ administradores (profiles.is_admin; hoje 1 conta: José) — não usa listas do Netlify
--     all      os alunos que JÁ TÊM acesso à matéria (view my_active_subjects) E o administrador
-- Linha ausente = tudo `off`. Tabela ausente (esta migração não rodou) = tudo `off` (a função
-- get-pilot-flags falha fechada). Não existe «todas as matérias»: é uma linha por matéria.
-- Semiología II (piloto) NÃO usa esta tabela: continua pelas listas RM_PILOT_*_UIDS do Netlify.
--
-- Quem lê: o aluno logado (policy de SELECT; os estágios não são segredo e nenhum UID mora aqui).
-- Quem escreve: SÓ o painel SQL do Supabase (role postgres/service). Não há policy de
-- INSERT/UPDATE/DELETE para `authenticated`/`anon`: o cliente nunca consegue alterar a liberação.
--
-- Rollback: 20261030_01_rm_materia_rollout_rollback.sql
-- =====================================================================

create table if not exists public.rm_materia_rollout (
  slug          text primary key
                check (slug ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  layout_stage  text not null default 'off' check (layout_stage in ('off','preview','all')),
  pen_stage     text not null default 'off' check (pen_stage    in ('off','preview','all')),
  visual_stage  text not null default 'off' check (visual_stage in ('off','preview','all')),
  nota          text,
  atualizado_em timestamptz not null default now()
);

comment on table public.rm_materia_rollout is
  'Nova Era: estágio de liberação por matéria (layout, caneta, tema). off (ninguém) | preview (só administrador) | all (alunos com acesso + administrador). Escrita só pelo painel SQL.';

alter table public.rm_materia_rollout enable row level security;

drop policy if exists rm_materia_rollout_select on public.rm_materia_rollout;
create policy rm_materia_rollout_select on public.rm_materia_rollout
  for select to authenticated using (true);

-- sem policy de escrita para ninguém além do papel dono (postgres/service_role ignoram RLS)
revoke all on public.rm_materia_rollout from anon;
revoke insert, update, delete, truncate on public.rm_materia_rollout from authenticated;
grant select on public.rm_materia_rollout to authenticated;

-- a primeira matéria da implantação nasce TUDO DESLIGADO
insert into public.rm_materia_rollout (slug, nota)
values ('medicina-familiar', 'primeira implantação da Nova Era; tudo off até José aprovar no iPad')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- COMO USAR (copiar e colar no SQL Editor; trocar o slug quando houver outra matéria)
--   ver o estado:         select slug, layout_stage, pen_stage, visual_stage, atualizado_em from public.rm_materia_rollout order by slug;
--   1) só o administrador (José) vê:      update public.rm_materia_rollout set layout_stage='preview', atualizado_em=now() where slug='medicina-familiar';
--   2) todos veem:        update public.rm_materia_rollout set layout_stage='all',     atualizado_em=now() where slug='medicina-familiar';
--   3) caneta, separado:  update public.rm_materia_rollout set pen_stage='preview' ... depois ='all'
--   VOLTAR (imediato):    update public.rm_materia_rollout set layout_stage='off', pen_stage='off', visual_stage='off', atualizado_em=now() where slug='medicina-familiar';
-- ---------------------------------------------------------------------
