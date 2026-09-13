-- =====================================================================
-- ROLLBACK · Ferramentas de estudo V2
-- Reverte 20260913_06_study_tools_v2.sql
--
-- ATENÇÃO — ORDEM. O passo 4 repõe o CHECK antigo de user_highlights,
-- que NÃO admite 'yellow'. Se já existirem marcações amarelas gravadas,
-- o ALTER rebenta. Por isso o passo 3 converte primeiro os amarelos em
-- 'red' (a cor padrão do cliente antigo). É a única escrita destrutiva
-- deste ficheiro e está isolada, para se poder saltar o passo se se
-- preferir manter os dados amarelos e simplesmente não reverter o CHECK.
--
-- Se o objectivo for apenas DESLIGAR a V2 sem perder nada, não corra
-- este ficheiro: basta esvaziar a lista da beta —
--   update public.study_tools_beta set enabled = false;
-- — que o cliente volta sozinho à experiência antiga (fail closed).
-- =====================================================================

-- 1) beta
drop policy if exists study_tools_beta_select_self on public.study_tools_beta;
drop table if exists public.study_tools_beta;

-- 2) anotações e traços
drop policy if exists user_notes_select_self on public.user_notes;
drop policy if exists user_notes_insert_self on public.user_notes;
drop policy if exists user_notes_update_self on public.user_notes;
drop policy if exists user_notes_delete_self on public.user_notes;
drop table if exists public.user_notes;

drop policy if exists user_ink_strokes_select_self on public.user_ink_strokes;
drop policy if exists user_ink_strokes_insert_self on public.user_ink_strokes;
drop policy if exists user_ink_strokes_update_self on public.user_ink_strokes;
drop policy if exists user_ink_strokes_delete_self on public.user_ink_strokes;
drop table if exists public.user_ink_strokes;

-- 3) marcações amarelas -> vermelho (necessário antes do passo 4)
update public.user_highlights set color = 'red' where color = 'yellow';

-- 4) CHECK original de quatro cores
alter table public.user_highlights
  drop constraint if exists user_highlights_color_valid;

do $$ begin
  alter table public.user_highlights
    add constraint user_highlights_color_valid
    check (color in ('red','blue','green','pink'));
exception when duplicate_object then null; end $$;
