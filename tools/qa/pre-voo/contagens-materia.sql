-- CONTAGENS DE UMA MATÉRIA (somente leitura). Trocar o slug. Rodar ANTES de ligar e 24 h DEPOIS de cada passo (layout; depois caneta).
-- Regra de parada: qualquer contagem MENOR que a de antes (grifos, traços, notas) = parar e voltar.
select 'grifos' as tabela, count(*) as linhas, count(distinct user_id) as alunos from user_highlights  where subject_slug = 'medicina-familiar'
union all select 'tracos', count(*), count(distinct user_id) from user_ink_strokes where subject_slug = 'medicina-familiar'
union all select 'notas',  count(*), count(distinct user_id) from user_notes       where subject_slug = 'medicina-familiar'
union all select 'progresso', count(*), count(distinct user_id) from user_study_progress where subject_slug = 'medicina-familiar';
