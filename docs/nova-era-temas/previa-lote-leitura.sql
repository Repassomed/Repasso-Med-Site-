-- =====================================================================
-- NOVA ERA · PRÉVIA EM LOTE — CONFERÊNCIAS SÓ DE LEITURA (SELECT) · NADA EXECUTADO AQUI
-- Para José rodar no Supabase → SQL Editor, ANTES e DEPOIS do lote. Nenhum comando escreve; nenhum mostra dado de aluno (só contagens e estágios).
-- =====================================================================

-- L1) QUANTAS contas são administradoras? («preview» = só administrador). Esperado: 1 (a de José). Se for mais de 1, essas contas também verão a prévia.
select count(*) filter (where is_admin) as administradores, count(*) as perfis from public.profiles;

-- L2) ESTADO ATUAL das matérias do lote: linha ausente = tudo desligado. Mostra estágio por coluna e a nota (marcador «[previa-lote:…]» = o que o lote promoveu).
select slug, layout_stage, pen_stage, visual_stage, nota, atualizado_em
from public.rm_materia_rollout order by slug;

-- L3) Alguma matéria já está LIBERADA PARA ALUNOS (algum estágio = 'all')? Esperado antes do lote: nenhuma. O lote nunca cria nem altera 'all'.
select slug, layout_stage, pen_stage, visual_stage from public.rm_materia_rollout
where 'all' in (layout_stage, pen_stage, visual_stage) order by slug;
