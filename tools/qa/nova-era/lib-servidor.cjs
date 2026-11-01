/* NOVA ERA · utilitário de teste: a função REAL get-pilot-flags.js com o Supabase SIMULADO (zero rede, nenhuma escrita).
   Personas (UIDs sintéticos; nenhum UID real entra aqui):
     JOSE      administrador (profiles.is_admin) e dono das listas RM_PILOT_*_UIDS do piloto; é quem vê a prévia
     ALUNO     aluno comum COM acesso à matéria em teste
     SEM       aluno comum SEM acesso à matéria
   cena = { admins: [uids administradores; padrão só JOSE], erroProfiles: bool, tabela: { slug: { layout_stage, pen_stage, visual_stage } } | null (tabela inexistente), acessos: { uid: [slugs] }, env: {...}, erroTabela: bool }
   Registra toda chamada (método + caminho) em `chamadas`: o teste confere que só há GET. */
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..', 'Repasso-Med-Site--main/Atual - Copia');
const FN = path.join(ROOT, 'netlify/functions/get-pilot-flags.js');
const U = { JOSE: 'aaaaaaaa-0000-4000-8000-000000000001', ALUNO: 'bbbbbbbb-0000-4000-8000-000000000002', SEM: 'cccccccc-0000-4000-8000-000000000003', OUTRO: 'dddddddd-0000-4000-8000-000000000004', TESTER2: 'eeeeeeee-0000-4000-8000-000000000005' };   // TESTER2 = outro testador do piloto: está nas listas RM_PILOT_*_UIDS, mas NÃO é administrador
const ENVS = ['RM_PILOT_LAYOUT_UIDS', 'RM_PILOT_AUDIO_UIDS', 'RM_PILOT_PEN_UIDS', 'RM_PILOT_VISUAL_UIDS', 'RM_LAYOUT_SLUGS', 'RM_VISUAL_SLUGS', 'RM_PEN_SLUGS'];
const ENV_JOSE = { RM_PILOT_LAYOUT_UIDS: U.JOSE, RM_PILOT_PEN_UIDS: U.JOSE, RM_PILOT_VISUAL_UIDS: U.JOSE };   // listas do PILOTO (Semiología II): só José; a prévia das outras matérias não usa listas, usa administrador

async function chamar(cena, persona, slug, { semToken = false, tokenRuim = false } = {}) {
  for (const k of ENVS) delete process.env[k];
  Object.assign(process.env, { SUPABASE_URL: 'https://x.invalid', SUPABASE_ANON_KEY: 'anon' }, cena.env || {});
  const chamadas = cena.chamadas = cena.chamadas || [];
  global.fetch = async (url, opts) => {
    const u = String(url), metodo = ((opts && opts.method) || 'GET').toUpperCase(), tok = String(((opts && opts.headers && opts.headers.Authorization) || '')).replace(/^Bearer\s+/i, '');
    chamadas.push(metodo + ' ' + u.replace('https://x.invalid', '').split('?')[0]);
    const ok = j => ({ ok: true, status: 200, json: async () => j });
    const no = s => ({ ok: false, status: s, json: async () => ({}) });
    if (u.includes('/auth/v1/user')) return tok === 'tok-' + persona && !tokenRuim ? ok({ id: U[persona] }) : no(401);
    const q = new URL(u).searchParams;
    if (u.includes('/rest/v1/rm_materia_rollout')) {
      if (cena.tabela === null || cena.erroTabela) return no(cena.erroTabela ? 500 : 404);
      const s = (q.get('slug') || '').replace(/^eq\./, ''); const r = (cena.tabela || {})[s];
      return ok(cena.linhasExtra ? [r, r] : (r ? [Object.assign({ slug: s }, r)] : []));
    }
    if (u.includes('/rest/v1/profiles')) {                       // is_admin da PRÓPRIA linha (profiles_self_select); administradores: cena.admins (padrão: só a conta de José)
      const id = (q.get('id') || '').replace(/^eq\./, ''); const adm = (cena.admins || [U.JOSE]).includes(id);
      return cena.erroProfiles ? no(500) : ok(id === U[persona] ? [{ is_admin: adm }] : []);
    }
    if (u.includes('/rest/v1/my_active_subjects')) {
      const s = (q.get('subject_slug') || '').replace(/^eq\./, ''); const a = (cena.acessos || {})[U[persona]] || [];
      return ok(a.includes(s) ? [{ subject_slug: s }] : []);
    }
    return no(404);
  };
  delete require.cache[FN];
  const r = await require(FN).handler({ queryStringParameters: { slug }, headers: semToken ? {} : { authorization: 'Bearer tok-' + persona } });
  return Object.assign(JSON.parse(r.body), { _status: r.statusCode, _corpo: r.body, _motivo: r.headers['X-RM-Reason'] });
}
module.exports = { U, ENV_JOSE, chamar, ROOT, FN };
