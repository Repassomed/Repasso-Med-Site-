/* ENSAIO DE ATIVAÇÃO DE UMA MATÉRIA (genérico; nasceu da Medicina Familiar) — navegador + função REAL do servidor, rm-pilot.js REAL (sem trocar as CANDIDATAS: vale o que está no código), Supabase simulado, zero rede externa.
   Cenas (matéria real aberta em 390 e 1440 px, dados do aluno semeados com o motor real antes de ligar o piloto):
     A  padrão de produção (nenhuma variável de matéria): o cliente PERGUNTA, o servidor NEGA ⇒ sem layout, sem caneta física, dados idênticos;
     B  só a 1.ª chave (é o que esta PR faz): igual a A;   C  as duas chaves (RM_LAYOUT_SLUGS + RM_PILOT_LAYOUT_UIDS): layout monta, dados ANTES = DEPOIS;
     D  conta errada na lista: sem layout;   E  passo opcional da caneta física (RM_PEN_SLUGS + RM_PILOT_PEN_UIDS);
     F  volta: tirar o slug ⇒ layout antigo e dados idênticos;   G  vizinhas (dermatologia, biologia) ficam sem requisição e sem layout com a variável de Medicina Familiar ligada.
   Diferença para ativacao-materia: a matéria vem do argumento e as CANDIDATAS são simuladas como [piloto, matéria] (= o que a PR da 1.ª fechadura faria), sem tocar no código.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/ativacao-materia.test.cjs <slug> [--rapido] */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
const D = require('./lib-dados.cjs');
const FN = path.join(L.ROOT, 'netlify/functions/get-pilot-flags.js');
const PILOT_JS = fs.readFileSync(path.join(L.ROOT, 'assets/rm-pilot.js'), 'utf8');
const UID = D.UID, OUTRO = 'bbbbbbbb-0000-4000-8000-000000000002';
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);

/* a função real, com o ambiente da cena e o Supabase simulado */
async function servidor(env, uid, slug, token) {
  for (const k of ['RM_PILOT_LAYOUT_UIDS', 'RM_PILOT_AUDIO_UIDS', 'RM_PILOT_PEN_UIDS', 'RM_PILOT_VISUAL_UIDS', 'RM_LAYOUT_SLUGS', 'RM_VISUAL_SLUGS', 'RM_PEN_SLUGS']) delete process.env[k];
  Object.assign(process.env, { SUPABASE_URL: 'https://x.invalid', SUPABASE_ANON_KEY: 'anon' }, env);
  global.fetch = async () => ({ ok: true, json: async () => ({ id: uid }) });
  delete require.cache[FN];
  return require(FN).handler({ queryStringParameters: { slug }, headers: token ? { authorization: 'Bearer ' + token } : {} });
}

/* abre `slug` no harness SEM layout (controle), semeia os dados do aluno, recarrega, mede a linha de base; depois injeta o rm-pilot.js real com as candidatas pedidas */
async function abrirCena(br, base, m, { env, uid = UID, candidatas }) {
  const ctx = await br.newContext({ viewport: { width: LARG, height: LARG < 600 ? 844 : 900 } });
  const page = await ctx.newPage(); const pedidos = [], errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.route('**/get-pilot-flags*', async r => { const slug = new URL(r.request().url()).searchParams.get('slug'); pedidos.push(slug); const resp = await servidor(env.atual(), uid, slug, 'tok'); r.fulfill({ status: resp.statusCode, headers: resp.headers, body: resp.body }); });
  await page.route('**/assets/rm-pilot.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: candidatas ? PILOT_JS.replace(/var CANDIDATAS = \[[^\]]*\];/, 'var CANDIDATAS = ' + JSON.stringify(candidatas) + ';') : PILOT_JS }));
  await page.addInitScript(([slug]) => { window.__RM_ENSAIO = { slug, modo: 'controle' }; }, [m.slug]);
  return { ctx, page, pedidos, errs, m, base };
}
let LARG = 1440;
const url = (c, ex = '') => `${c.base}/p.html?slug=${c.m.slug}&tab=${c.m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1${ex}`;
async function carregar(c) { await c.page.goto(url(c), { timeout: 120000 }); await c.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await c.page.waitForTimeout(700); }
async function ligarPiloto(c) {
  await c.page.addScriptTag({ url: '/assets/rm-pilot.js?v=teste' }); await c.page.waitForTimeout(2500);
  return c.page.evaluate(() => ({ layout: !!document.querySelector('.rm-l2, #rm-l2-side, .rm-l2-band'), attr: document.documentElement.classList.contains('rm-l2'), pen: window.RMPilot ? window.RMPilot.penLiberada(window.__ens && window.__ens.slug) : null, flags: window.RMPilot ? window.RMPilot._estado().porSlug : null }));
}
async function cena(br, base, m, cfg, rotulo, esperaLayout, extra) {
  const env = { _v: cfg.env, atual() { return this._v; } };
  const c = await abrirCena(br, base, m, { env, uid: cfg.uid, candidatas: cfg.candidatas });
  try {
    await carregar(c);
    const sem = await c.page.evaluate(D.SEMEAR, { slug: m.slug, uid: UID, max: 6 });
    await carregar(c);
    const ref = await c.page.evaluate(D.MEDIR);
    const r1 = await ligarPiloto(c);
    ok(r1.layout === esperaLayout, `${rotulo}: layout ${esperaLayout ? 'montado' : 'NÃO montado'} (${r1.layout})`, { r1, pedidos: c.pedidos });
    const dep = await c.page.evaluate(D.MEDIR);
    const dif = D.comparar(ref, dep, 'cena').filter(x => x.tipo !== 'erro-js');
    ok(dif.length === 0 && ref.grifos.length > 0 && ref.tracos.length > 0, `${rotulo}: ${ref.grifos.length} grifos, ${ref.tracos.length} traços e ${ref.notas.length} nota(s) idênticos, sem escrita no banco`, dif.slice(0, 3));
    ok(c.errs.length === 0, `${rotulo}: 0 erros JS`, c.errs);
    const a7 = await c.page.evaluate(async () => { const t = await (await fetch('assets/rm-tools-v2.js')).text(); return { a7: /function penLiberadaPeloServidor\(slug\)/.test(t), perm: window.RMToolsV2 && window.RMToolsV2._test ? window.RMToolsV2._test.pilotoPermitido() : null }; });
    const out = { r1, pedidos: c.pedidos.slice(), ref, a7 };
    if (extra) await extra(c, out, env);
    return out;
  } finally { await c.ctx.close(); }
}

(async () => {
  const RAPIDO = process.argv.includes('--rapido'); const SLUG = process.argv.slice(2).find(a => !a.startsWith('--')); if (!SLUG) { console.error('uso: ativacao-materia.test.cjs <slug> [--rapido]'); process.exit(2); }
  const rec = L.reconciliar(); const M = s => rec.ativas.find(x => x.slug === s);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const MF = SLUG, LAY = { RM_PILOT_LAYOUT_UIDS: UID };
  const REAL = null;   // candidatas = as do código (não substitui)
  const real = async (env, rotulo, esperaLayout, extra) => cena(br, base, M(MF), { env, candidatas: ['semiologia-ii', MF] }, rotulo, esperaLayout, extra);
  ok(!!M(MF), SLUG + ' existe e está ativa no inventário do site');
  for (const W of (RAPIDO ? [1440] : [1440, 390])) {
    LARG = W; const t = `[${W}px] `;
    sec(t + 'A · padrão de produção (variáveis de matéria inexistentes; conta de José na lista do piloto)');
    { const o = await real(Object.assign({}, LAY), t + 'A', false);
      ok(o.pedidos.length === 1 && o.pedidos[0] === MF, 'o cliente perguntou 1 vez e o servidor negou', o.pedidos);
      ok(o.r1.pen === false, 'caneta física negada', o.r1.flags); }
    sec(t + 'B · só a 1.ª chave (CANDIDATAS no código) = A');
    { await real({}, t + 'B (listas de conta vazias)', false); }
    sec(t + 'C · as duas chaves (RM_LAYOUT_SLUGS=<slug> + conta na lista)');
    { await real(Object.assign({}, LAY, { RM_LAYOUT_SLUGS: MF }), t + 'C', true, async (c, o) => {
        ok(o.r1.pen === false, 'layout liberado NÃO libera a caneta física (é outra chave)', o.r1.flags);
        if (o.a7.a7) ok(o.a7.perm === false, 'A7: pilotoPermitido() = false mesmo com layout ligado', o.a7); }); }
    sec(t + 'D · conta errada / slug com erro de digitação');
    { await real({ RM_PILOT_LAYOUT_UIDS: OUTRO, RM_LAYOUT_SLUGS: MF }, t + 'D1 conta fora da lista', false);
      await real(Object.assign({}, LAY, { RM_LAYOUT_SLUGS: MF + '-x,' + MF.slice(0, -1) }), t + 'D2 slug digitado errado', false); }
    sec(t + 'E · passo opcional: caneta física (RM_PEN_SLUGS + RM_PILOT_PEN_UIDS)');
    { await real(Object.assign({}, LAY, { RM_LAYOUT_SLUGS: MF, RM_PEN_SLUGS: MF, RM_PILOT_PEN_UIDS: UID }), t + 'E', true, async (c, o) => {
        ok(o.r1.pen === true, 'RMPilot.penLiberada(' + MF + ') = true', o.r1.flags);
        if (o.a7.a7) ok(o.a7.perm === true, 'A7: caneta física liga (servidor real → rm-pilot real → rm-tools-v2 real)', o.a7);
        const f = await servidor({ RM_PILOT_LAYOUT_UIDS: UID, RM_LAYOUT_SLUGS: MF, RM_PEN_SLUGS: MF, RM_PILOT_PEN_UIDS: UID, RM_PILOT_AUDIO_UIDS: UID }, UID, MF, 'tok');
        ok(JSON.parse(f.body).audio === false, 'áudio continua negado fora do piloto', JSON.parse(f.body)); }); }
    sec(t + 'F · volta: tirar o slug (e, separadamente, esvaziar a lista de contas)');
    for (const [nome, depois] of [['tirar o slug', Object.assign({}, LAY, { RM_LAYOUT_SLUGS: '' })], ['esvaziar contas', { RM_LAYOUT_SLUGS: MF }]]) {
      await real(Object.assign({}, LAY, { RM_LAYOUT_SLUGS: MF }), t + 'F ' + nome + ' (antes)', true, async (c, o, env) => {
        env._v = depois;
        await c.page.evaluate(() => { if (window.RMLayout && window.RMLayout.detach) window.RMLayout.detach(); });
        await c.page.reload(); await c.page.waitForFunction('window.__ready===true'); await c.page.waitForTimeout(700);
        const r2 = await ligarPiloto(c);
        ok(r2.layout === false, 'depois de ' + nome + ' e recarregar: layout NÃO montado (versão anterior)', r2);
        const volta = await c.page.evaluate(D.MEDIR);
        const dif = D.comparar(o.ref, volta, 'volta').filter(x => x.tipo !== 'erro-js');
        ok(dif.length === 0, `na volta: ${volta.grifos.length} grifos, ${volta.tracos.length} traços e ${volta.notas.length} nota(s) idênticos aos do início`, dif.slice(0, 3)); });
    }
    sec(t + 'G · vizinhas com a variável de Medicina Familiar ligada');
    for (const v of ['dermatologia', 'biologia'].filter(x => x !== MF)) {
      const o = await cena(br, base, M(v), { env: Object.assign({}, LAY, { RM_LAYOUT_SLUGS: MF, RM_PEN_SLUGS: MF, RM_PILOT_PEN_UIDS: UID }), candidatas: ['semiologia-ii', MF] }, t + v, false);
      ok(o.pedidos.length === 0, v + ': nenhuma requisição ao servidor (fora das CANDIDATAS)', o.pedidos); }
  }
  await br.close(); srv.close();
  console.log(`\nativacao-materia: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
