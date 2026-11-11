-- =====================================================================
-- NOVA ERA · PRÉVIA EM LOTE (só administrador) — PARA ANÁLISE · NADA EXECUTADO
-- Rodar no Supabase → SQL Editor, SÓ depois do merge e do deploy das PRs das matérias. Rode UM bloco por vez (0, depois 1, depois 2).
-- Regras que o script respeita (e o teste tools/qa/nova-era/previa-lote.test.cjs prova com estados misturados):
--   1. SÓ promove coluna que está 'off' para 'preview'. Coluna em 'preview' ou 'all' NUNCA é alterada (nunca reduz nem desliga o que já foi liberado).
--   2. Linha ausente = tudo off (como no site): a linha é criada só com o que está em 'off' ⇒ 'preview'.
--   3. Anota na própria linha O QUE o lote mudou: «[previa-lote:layout,pen,visual]» (colunas promovidas), preservando a nota que já existia.
--   4. A VOLTA (arquivo previa-lote-volta.sql) devolve a 'off' SOMENTE as colunas que o lote promoveu E que ainda estão em 'preview'. Coluna que José promoveu a 'all' depois, ou que já estava
--      em preview/all antes, não é tocada. Volta e ida são idempotentes (rodar duas vezes não muda nada na segunda).
-- Lista de matérias: acrescente/retire slugs conforme as PRs já mescladas (matéria fora de CANDIDATAS no rm-pilot.js nunca monta nada).
-- =====================================================================

-- 0) VER O QUE O LOTE FARIA (só leitura; rodar antes)
with alvo(slug) as (values ('biologia'), ('embriologia'), ('anatomia-patologica-practica'), ('histologia-i'))
select a.slug,
       coalesce(r.layout_stage, 'off') as layout_hoje, coalesce(r.pen_stage, 'off') as pen_hoje, coalesce(r.visual_stage, 'off') as visual_hoje,
       concat_ws(',', case when coalesce(r.layout_stage, 'off') = 'off' then 'layout' end,
                      case when coalesce(r.pen_stage,    'off') = 'off' then 'pen'    end,
                      case when coalesce(r.visual_stage, 'off') = 'off' then 'visual' end) as o_lote_vai_promover
from alvo a left join public.rm_materia_rollout r on r.slug = a.slug
order by a.slug;

-- 1) LIGAR (prévia só para o administrador; preserva tudo que já estiver em preview/all)
with alvo(slug) as (values ('biologia'), ('embriologia'), ('anatomia-patologica-practica'), ('histologia-i'))
insert into public.rm_materia_rollout as r (slug, layout_stage, pen_stage, visual_stage, nota, atualizado_em)
select slug, 'preview', 'preview', 'preview', '[previa-lote:layout,pen,visual]', now() from alvo
on conflict (slug) do update set
  layout_stage = case when r.layout_stage = 'off' then 'preview' else r.layout_stage end,
  pen_stage    = case when r.pen_stage    = 'off' then 'preview' else r.pen_stage    end,
  visual_stage = case when r.visual_stage = 'off' then 'preview' else r.visual_stage end,
  nota = case when 'off' in (r.layout_stage, r.pen_stage, r.visual_stage)
              then btrim(coalesce(r.nota, '') || ' [previa-lote:' ||
                   concat_ws(',', case when r.layout_stage = 'off' then 'layout' end,
                                  case when r.pen_stage    = 'off' then 'pen'    end,
                                  case when r.visual_stage = 'off' then 'visual' end) || ']')
              else r.nota end,
  atualizado_em = case when 'off' in (r.layout_stage, r.pen_stage, r.visual_stage) then now() else r.atualizado_em end;

-- 2) VER o estado
select slug, layout_stage, pen_stage, visual_stage, nota, atualizado_em from public.rm_materia_rollout order by slug;

-- A VOLTA está em previa-lote-volta.sql (arquivo separado; não rode os dois juntos).
