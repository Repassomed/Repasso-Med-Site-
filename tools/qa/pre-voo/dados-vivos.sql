-- PRÉ-VOO · consulta SOMENTE LEITURA ao banco (rodar no SQL editor ou via MCP em modo leitura). Não devolve texto de aluno: só slug, âncora e contagens.
-- Resultado alimenta: dados-vivos.json (contagens) e ids-vs-banco.py (as âncoras gravadas ainda existem no HTML?).
select 'hl' as k, subject_slug, block_id as ancora, count(*) as n from public.user_highlights group by 2,3
union all select 'ink', subject_slug, anchor_id, count(*) from public.user_ink_strokes group by 2,3
union all select 'note', subject_slug, coalesce(anchor_id,''), count(*) from public.user_notes group by 2,3
order by 2,1,3;
-- quem tem a caneta/V2 hoje (contagem; UID não sai daqui):
select count(*) as linhas, count(*) filter (where enabled) as habilitadas from public.study_tools_beta;
