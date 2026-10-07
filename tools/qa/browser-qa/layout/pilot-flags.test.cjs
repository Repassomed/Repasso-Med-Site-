/* get-pilot-flags.js · gate do tema visual: NEGADO POR PADRÃO.
   `visual` só é true com `layout` E o UID em RM_PILOT_VISUAL_UIDS (lista própria e obrigatória).
   Sem rede: o fetch do Supabase é simulado. Uso: node tools/qa/browser-qa/layout/pilot-flags.test.cjs */
const path = require('path');
const FN = path.resolve(__dirname, '../../../../Repasso-Med-Site--main/Atual - Copia/netlify/functions/get-pilot-flags.js');
let falhas = 0, total = 0;
const ok = (c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };
const JOSE = 'aaaaaaaa-0000-4000-8000-000000000001', OUTRO = 'bbbbbbbb-0000-4000-8000-000000000002';

async function chamar(env, uid, { slug = 'semiologia-ii', token = 'tok' } = {}) {
  for (const k of ['RM_PILOT_LAYOUT_UIDS', 'RM_PILOT_AUDIO_UIDS', 'RM_PILOT_PEN_UIDS', 'RM_PILOT_VISUAL_UIDS']) delete process.env[k];
  Object.assign(process.env, { SUPABASE_URL: 'https://x.invalid', SUPABASE_ANON_KEY: 'anon' }, env);
  global.fetch = async () => ({ ok: !!uid, json: async () => ({ id: uid }) });
  delete require.cache[FN];
  const r = await require(FN).handler({ queryStringParameters: { slug }, headers: token ? { authorization: 'Bearer ' + token } : {} });
  return JSON.parse(r.body);
}

(async () => {
  let r;
  r = await chamar({ RM_PILOT_LAYOUT_UIDS: JOSE }, JOSE);
  ok(r.layout === true && r.visual === false, 'layout=José, SEM RM_PILOT_VISUAL_UIDS ⇒ visual:false (não herda do layout)');
  r = await chamar({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_VISUAL_UIDS: '' }, JOSE);
  ok(r.layout === true && r.visual === false, 'RM_PILOT_VISUAL_UIDS vazia ⇒ visual:false');
  r = await chamar({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_VISUAL_UIDS: JOSE }, JOSE);
  ok(r.layout === true && r.visual === true, 'layout=José, visual=José ⇒ visual:true');
  r = await chamar({ RM_PILOT_LAYOUT_UIDS: JOSE + ',' + OUTRO, RM_PILOT_VISUAL_UIDS: JOSE }, OUTRO);
  ok(r.layout === true && r.visual === false, 'outro UID no layout, só José no visual ⇒ o outro NÃO vê o tema');
  r = await chamar({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_VISUAL_UIDS: JOSE + ',' + OUTRO }, OUTRO);
  ok(r.layout === false && r.visual === false, 'UID só no visual, fora do layout ⇒ visual:false (camada sobre o layout)');
  r = await chamar({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_VISUAL_UIDS: '-' }, JOSE);
  ok(r.layout === true && r.visual === false, 'RM_PILOT_VISUAL_UIDS="-" (kill switch do tema) ⇒ visual:false, layout segue');
  r = await chamar({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_VISUAL_UIDS: JOSE }, JOSE, { slug: 'biologia' });
  ok(!r.layout && !r.visual, 'outra matéria ⇒ tudo false');
  r = await chamar({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_VISUAL_UIDS: JOSE }, JOSE, { token: '' });
  ok(!r.layout && !r.visual, 'sem token ⇒ tudo false');
  r = await chamar({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_VISUAL_UIDS: JOSE }, null);
  ok(!r.layout && !r.visual, 'token inválido (Supabase recusa) ⇒ tudo false');
  r = await chamar({ RM_PILOT_VISUAL_UIDS: JOSE }, JOSE);
  ok(!r.layout && !r.visual, 'só RM_PILOT_VISUAL_UIDS definida (sem lista de layout) ⇒ tudo false');
  console.log(`\n${total - falhas}/${total} verificações OK` + (falhas ? ` · ${falhas} FALHAS` : ''));
  process.exit(falhas ? 1 : 0);
})();
