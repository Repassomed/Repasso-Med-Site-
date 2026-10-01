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
-- Não faz DROP de tabela, não toca em RLS, não mexe em user_id, não
-- toca em user_highlights/user_notes, não muta nenhum traço
-- thin/medium/thick.
-- =====================================================================

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

do $$ begin
  alter table public.user_ink_strokes
    add constraint user_ink_strokes_width_valid
    check (width in ('thin','medium','thick'));
exception when duplicate_object then null; end $$;
