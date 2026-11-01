/* Supabase SIMULADO para as suítes ANTIGAS do piloto (A5/A7), que ativavam uma matéria por «slug na variável + UID na lista».
   Desde a Nova Era o servidor NÃO lê mais RM_LAYOUT_SLUGS / RM_VISUAL_SLUGS / RM_PEN_SLUGS (a linha da matéria em rm_materia_rollout é a única fonte). Para essas suítes continuarem
   exercitando a MESMA lógica de duas chaves (matéria liberada + conta de teste), este simulador traduz, SÓ NO TESTE, «slug listado em RM_*_SLUGS» para uma linha `preview` da tabela.
   Matéria não listada ⇒ linha `off`. Ninguém tem acesso comprado (my_active_subjects vazio), então `all` nunca é exercitado aqui (isso é do nova-era/servidor.test.cjs). */
'use strict';
exports.fetchLegado = function (uid, { authOk = true } = {}) {
  return async function (url) {
    const u = String(url);
    if (u.includes('/auth/v1/user')) return { ok: !!uid && authOk, status: uid ? 200 : 401, json: async () => ({ id: uid }) };
    if (u.includes('/rest/v1/rm_materia_rollout')) {
      const slug = (new URL(u).searchParams.get('slug') || '').replace(/^eq\./, '');
      const em = k => String(process.env[k] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).indexOf(slug) !== -1;
      return { ok: true, status: 200, json: async () => [{ slug, layout_stage: em('RM_LAYOUT_SLUGS') ? 'preview' : 'off', pen_stage: em('RM_PEN_SLUGS') ? 'preview' : 'off', visual_stage: em('RM_VISUAL_SLUGS') ? 'preview' : 'off' }] };
    }
    return { ok: true, status: 200, json: async () => [] };
  };
};
