-- =====================================================================
-- REPASSO MED · Caneta — quarta espessura (xthin), 1px
-- Data: 2026-10-01
--
-- ADITIVA, IDEMPOTENTE E ATÔMICA.
-- Não faz DROP de tabela, não faz TRUNCATE, não desabilita nem altera
-- nenhuma RLS policy, não toca em user_id nem em nenhuma FK, não mexe em
-- user_highlights nem em user_notes, não muta nenhum traço já gravado
-- (thin/medium/thick continuam válidos e inalterados).
--
-- ATOMICIDADE: DROP e ADD da constraint correm dentro da MESMA
-- transação explícita (BEGIN..COMMIT). Se qualquer passo falhar — erro
-- de sintaxe, conexão cortada, processo morto a meio — o Postgres
-- desfaz a transação inteira sozinho: nunca existe uma janela em que a
-- tabela fica sem nenhuma constraint de width. Rodar duas vezes é
-- seguro (drop-if-exists + add, sem depender de capturar
-- duplicate_object).
--
-- ORDEM DE PUBLICAÇÃO — OBRIGATÓRIA: esta migration precisa estar
-- aplicada no Supabase de produção ANTES de publicar o `rm-tools-v2.js`
-- que mostra o botão «Extra fino». Se o botão for ao ar primeiro, um
-- aluno que escolher xthin vai receber 400 do PostgREST ao gravar (a
-- constraint de produção ainda só aceita thin/medium/thick) — o traço
-- fica preso em `tmp-` e, dependendo do achado D/§42 da auditoria #420
-- (ainda não corrigido nesta PR), pode nem ser avisado com clareza.
-- Ordem segura: 1) aplicar esta migration; 2) confirmar com uma leitura
-- de catálogo que a constraint já aceita 'xthin'; 3) só então publicar
-- o cache-buster novo de rm-tools-v2.js.
--
-- O que faz: alarga o CHECK de user_ink_strokes.width para aceitar
-- 'xthin', ao lado dos três valores já existentes.
--
-- Rollback: ver 20261001_01_user_ink_strokes_xthin_width_rollback.sql
-- (NUNCA converte nem apaga traços 'xthin' — falha com mensagem clara se
-- algum existir, também dentro de uma transação atômica).
-- =====================================================================

begin;

alter table public.user_ink_strokes
  drop constraint if exists user_ink_strokes_width_valid;

alter table public.user_ink_strokes
  add constraint user_ink_strokes_width_valid
  check (width in ('xthin','thin','medium','thick'));

comment on constraint user_ink_strokes_width_valid on public.user_ink_strokes is
  'Quatro espessuras do traço. «xthin» (1px) entrou em 2026-10-01, ao lado de thin/medium/thick (2026-09-13); nenhum traço antigo foi alterado.';

commit;
