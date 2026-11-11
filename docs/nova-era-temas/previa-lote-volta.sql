-- =====================================================================
-- NOVA ERA · VOLTA SEGURA DA PRÉVIA EM LOTE — PARA ANÁLISE · NADA EXECUTADO
-- Arquivo SEPARADO de propósito: se alguém colar «o arquivo inteiro» do lote no SQL Editor, a volta não roda junto.
-- Devolve a 'off' SÓ as colunas que o lote promoveu (marcador «[previa-lote:…]» na nota) E que ainda estão em 'preview'.
-- Nunca toca em 'all', nem em coluna que já estava em preview/all antes do lote, nem em matéria sem o marcador. Idempotente.
-- =====================================================================

-- 3) VOLTA SEGURA (devolve a 'off' só o que o lote promoveu e que ainda está em 'preview'; nada mais)
update public.rm_materia_rollout r set
  layout_stage = case when r.nota like '%[previa-lote:%layout%]%' and r.layout_stage = 'preview' then 'off' else r.layout_stage end,
  pen_stage    = case when r.nota like '%[previa-lote:%pen%]%'    and r.pen_stage    = 'preview' then 'off' else r.pen_stage    end,
  visual_stage = case when r.nota like '%[previa-lote:%visual%]%' and r.visual_stage = 'preview' then 'off' else r.visual_stage end,
  nota = nullif(btrim(regexp_replace(r.nota, '\s*\[previa-lote:[a-z,]*\]', '', 'g')), ''),
  atualizado_em = now()
where r.nota like '%[previa-lote:%';

-- 4) Voltar UMA matéria só (também seguro: mesma regra, só para o slug indicado)
-- update ... (copie o bloco 3 e acrescente:  and r.slug = 'biologia')
