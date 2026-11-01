-- =====================================================================
-- ROLLBACK · Nova Era · rm_materia_rollout   (reverte 20261030_01_rm_materia_rollout.sql)
-- Remove só a tabela de estágios. Nenhum dado de aluno é tocado.
-- Sem a tabela, get-pilot-flags nega tudo fora do piloto (falha fechada).
-- Para APENAS desligar uma matéria não rode isto: use
--   update public.rm_materia_rollout set layout_stage='off', pen_stage='off', visual_stage='off' where slug='…';
-- =====================================================================
drop policy if exists rm_materia_rollout_select on public.rm_materia_rollout;
drop table if exists public.rm_materia_rollout;
