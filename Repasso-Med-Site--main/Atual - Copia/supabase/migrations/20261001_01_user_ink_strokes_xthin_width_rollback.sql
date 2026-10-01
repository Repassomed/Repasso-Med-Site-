-- =====================================================================
-- ROLLBACK · Caneta — quarta espessura (xthin)
-- Reverte 20261001_01_user_ink_strokes_xthin_width.sql
--
-- ATENÇÃO — FAIL-CLOSED DE PROPÓSITO. Ao contrário de outros rollbacks
-- deste repositório (ex.: 20260913_09, que converte amarelo→vermelho
-- antes de repor o CHECK antigo), este NUNCA converte nem apaga um
-- traço 'xthin' em silêncio: se existir algum, o rollback ABORTA com uma
-- mensagem clara, e a constraint larga (com 'xthin') fica como estava.
-- A decisão sobre o que fazer com esses traços — mantê-los e não
-- reverter, ou convertê-los à mão para outra espessura — é humana, não
-- deste script.
--
-- ATOMICIDADE: a VALIDAÇÃO (contagem de linhas 'xthin'), o DROP e o ADD
-- da constraint correm dentro da MESMA transação explícita
-- (BEGIN..COMMIT). Se a validação falhar, o `raise exception` aborta a
-- transação inteira — nenhum DROP chega a ter efeito, e a
-- constraint larga permanece exatamente como estava: nunca existe uma
-- janela em que a tabela fica sem nenhuma constraint de width, mesmo se
-- a conexão cair ou o processo for interrompido a meio.
--
-- Não faz DROP de tabela, não toca em RLS, não mexe em user_id, não
-- toca em user_highlights/user_notes, não muta nenhum traço
-- thin/medium/thick.
-- =====================================================================

begin;

do $$
declare
  n int;
begin
  select count(*) into n from public.user_ink_strokes where width = 'xthin';
  if n > 0 then
    raise exception
      'Rollback abortado: existem % traço(s) com width=''xthin''. Este rollback nunca apaga nem converte esses traços — decida manualmente (mantê-los e não reverter a constraint, ou migrar a espessura à mão) antes de rodar isto de novo.',
      n;
  end if;
end $$;

alter table public.user_ink_strokes
  drop constraint if exists user_ink_strokes_width_valid;

alter table public.user_ink_strokes
  add constraint user_ink_strokes_width_valid
  check (width in ('thin','medium','thick'));

commit;
