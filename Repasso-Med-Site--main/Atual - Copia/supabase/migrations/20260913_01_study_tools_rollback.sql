-- Rollback de 20260913_01_study_tools.sql
-- Remove APENAS as duas tabelas criadas por aquela migração (e, por
-- cascata, as suas policies e índices). Nenhuma tabela pré-existente é
-- tocada. Atenção: apaga as marcações e o progresso já gravados.
drop table if exists public.user_highlights;
drop table if exists public.user_study_progress;
