-- =====================================================================
-- REPASSO MED · Caneta — quarta espessura (xthin), 1px
-- Data: 2026-10-01
--
-- ADITIVA E IDEMPOTENTE.
-- Não faz DROP de tabela, não faz TRUNCATE, não desabilita nem altera
-- nenhuma RLS policy, não toca em user_id nem em nenhuma FK, não mexe em
-- user_highlights nem em user_notes, não muta nenhum traço já gravado
-- (thin/medium/thick continuam válidos e inalterados).
--
-- O que faz: alarga o CHECK de user_ink_strokes.width para aceitar
-- 'xthin', ao lado dos três valores já existentes.
--
-- Rollback: ver 20261001_01_user_ink_strokes_xthin_width_rollback.sql
-- (NUNCA converte nem apaga traços 'xthin' — falha com mensagem clara se
-- algum existir).
-- =====================================================================

alter table public.user_ink_strokes
  drop constraint if exists user_ink_strokes_width_valid;

do $$ begin
  alter table public.user_ink_strokes
    add constraint user_ink_strokes_width_valid
    check (width in ('xthin','thin','medium','thick'));
exception when duplicate_object then null; end $$;

comment on constraint user_ink_strokes_width_valid on public.user_ink_strokes is
  'Quatro espessuras do traço. «xthin» (1px) entrou em 2026-10-01, ao lado de thin/medium/thick (2026-09-13); nenhum traço antigo foi alterado.';
