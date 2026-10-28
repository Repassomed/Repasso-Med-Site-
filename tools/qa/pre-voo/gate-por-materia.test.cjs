/* A5 · GATE POR MATÉRIA — navegador + função REAL do servidor (get-pilot-flags.js), Supabase simulado, zero rede externa, nada gravado fora do sessionStorage do teste.
   O que se prova (cada linha é uma matéria real do site aberta no harness do ensaio, com o rm-pilot.js REAL injetado e a função REAL respondendo):
     1  padrão (listas de matéria vazias): nenhuma matéria além do piloto recebe layout — nem a que está nas candidatas;
     2  matéria liberada (slug na lista + UID na lista): layout montado, e grifos/traços/notas gravados antes aparecem IGUAIS;
     3  matéria vizinha NÃO liberada: continua sem layout, com a lista ligada para outra;
     4  matéria fora das candidatas do cliente: ZERO requisições ao servidor;
     5  UID fora da lista: sem layout mesmo com o slug liberado;
     6  curinga («*», «todas», «all») não libera nada;
     7  retorno: tirar o slug da lista ⇒ a matéria volta ao layout antigo, com os dados do aluno idênticos aos do começo;
     8  caneta física (pen) é por matéria: liberada numa, negada na outra; áudio continua só no piloto;
     9  piloto (Semiología II) segue exatamente como antes: UID na lista basta, sem variável de matéria.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/gate-por-materia.test.cjs [--rapido] */
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
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); const pedidos = [], errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.route('**/get-pilot-flags*', async r => { const slug = new URL(r.request().url()).searchParams.get('slug'); pedidos.push(slug); const resp = await servidor(env.atual(), uid, slug, 'tok'); r.fulfill({ status: resp.statusCode, headers: resp.headers, body: resp.body }); });
  await page.route('**/assets/rm-pilot.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: PILOT_JS.replace("var CANDIDATAS = ['semiologia-ii'];", 'var CANDIDATAS = ' + JSON.stringify(candidatas) + ';') }));
  await page.addInitScript(([slug]) => { window.__RM_ENSAIO = { slug, modo: 'controle' }; }, [m.slug]);
  return { ctx, page, pedidos, errs, m, base };
}
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
  const rec = L.reconciliar(); const M = s => rec.ativas.find(x => x.slug === s);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const PIL = 'semiologia-ii', A = 'dermatologia', B = 'biologia';
  const LAY = { RM_PILOT_LAYOUT_UIDS: UID };

  sec('1 · padrão: listas de matéria vazias ⇒ nenhuma outra matéria recebe layout (mesmo candidata e com UID na lista)');
  { const o = await cena(br, base, M(A), { env: Object.assign({}, LAY), candidatas: [PIL, A] }, 'dermatologia', false);
    ok(o.pedidos.length === 1 && o.pedidos[0] === A, 'o cliente perguntou uma vez e o servidor negou', o.pedidos); }

  sec('2 · matéria liberada (slug na lista + UID na lista) ⇒ layout, dados idênticos');
  { const o = await cena(br, base, M(A), { env: Object.assign({}, LAY, { RM_LAYOUT_SLUGS: A }), candidatas: [PIL, A] }, 'dermatologia', true); }

  sec('3 · a matéria vizinha NÃO liberada continua como era (lista ligada só para outra)');
  { await cena(br, base, M(B), { env: Object.assign({}, LAY, { RM_LAYOUT_SLUGS: A }), candidatas: [PIL, A, B] }, 'biologia', false); }

  sec('4 · fora das candidatas do cliente ⇒ ZERO requisições ao servidor');
  { const o = await cena(br, base, M(B), { env: Object.assign({}, LAY, { RM_LAYOUT_SLUGS: B }), candidatas: [PIL] }, 'biologia', false);
    ok(o.pedidos.length === 0, 'nenhuma chamada a get-pilot-flags', o.pedidos); }

  sec('5 · UID fora da lista ⇒ sem layout mesmo com o slug liberado');
  { await cena(br, base, M(A), { env: { RM_PILOT_LAYOUT_UIDS: OUTRO, RM_LAYOUT_SLUGS: A }, candidatas: [PIL, A] }, 'dermatologia', false); }

  sec('6 · curinga não existe');
  for (const w of ['*', 'todas', 'all']) await cena(br, base, M(A), { env: Object.assign({}, LAY, { RM_LAYOUT_SLUGS: w }), candidatas: [PIL, A] }, `curinga «${w}»`, false);

  sec('7 · retorno: tirar o slug da lista ⇒ layout antigo, dados do aluno idênticos ao começo');
  { await cena(br, base, M(A), { env: Object.assign({}, LAY, { RM_LAYOUT_SLUGS: A }), candidatas: [PIL, A] }, 'com o slug', true, async (c, o, env) => {
      env._v = Object.assign({}, LAY, { RM_LAYOUT_SLUGS: '' });               // «kill switch» da matéria: só a variável muda, nenhum deploy
      const lay = await c.page.evaluate(D.MEDIR);                              // ainda com layout montado
      await c.page.evaluate(() => { if (window.RMLayout && window.RMLayout.detach) window.RMLayout.detach(); });
      await c.page.reload(); await c.page.waitForFunction('window.__ready===true'); await c.page.waitForTimeout(700);
      const r2 = await ligarPiloto(c);
      ok(r2.layout === false, 'depois de tirar o slug e recarregar: layout NÃO montado (volta à versão anterior)', r2);
      const p2 = await c.page.evaluate(() => window.RMToolsV2 && window.RMToolsV2._test ? window.RMToolsV2._test.pilotoPermitido() : null);
      if (o.a7.a7) ok(p2 === false, 'A7 presente: depois de tirar o slug a caneta física também desliga', p2);
      const volta = await c.page.evaluate(D.MEDIR);
      const dif = D.comparar(o.ref, volta, 'volta').filter(x => x.tipo !== 'erro-js');
      ok(dif.length === 0, `na volta: ${volta.grifos.length} grifos, ${volta.tracos.length} traços e ${volta.notas.length} nota(s) idênticos aos do início`, dif.slice(0, 3));
    }); }

  sec('8 · caneta física por matéria; áudio só no piloto');
  { await cena(br, base, M(A), { env: Object.assign({}, LAY, { RM_LAYOUT_SLUGS: A, RM_PEN_SLUGS: A, RM_PILOT_PEN_UIDS: UID, RM_PILOT_AUDIO_UIDS: UID }), candidatas: [PIL, A] }, 'dermatologia (pen liberada)', true, async (c, o) => {
      ok(o.r1.pen === true, 'RMPilot.penLiberada(dermatologia) = true', o.r1.flags);
      if (o.a7.a7) ok(o.a7.perm === true, 'A7 presente: a caneta física liga em dermatologia (servidor real → rm-pilot real → rm-tools-v2 real)', o.a7); else console.log('    · A7 ausente neste código: elo servidor→caneta física não exercitado (testado na rodada conjunta)');
      const f = await servidor({ RM_PILOT_LAYOUT_UIDS: UID, RM_LAYOUT_SLUGS: A, RM_PEN_SLUGS: A, RM_PILOT_PEN_UIDS: UID, RM_PILOT_AUDIO_UIDS: UID }, UID, A, 'tok');
      ok(JSON.parse(f.body).audio === false, 'áudio negado fora do piloto mesmo com UID na lista de áudio', JSON.parse(f.body));
    });
    await cena(br, base, M(B), { env: Object.assign({}, LAY, { RM_LAYOUT_SLUGS: A + ',' + B, RM_PEN_SLUGS: A, RM_PILOT_PEN_UIDS: UID }), candidatas: [PIL, A, B] }, 'biologia (layout sim, pen não)', true, async (c, o) => {
      ok(o.r1.pen === false, 'RMPilot.penLiberada(biologia) = false (slug fora de RM_PEN_SLUGS)', o.r1.flags);
      if (o.a7.a7) ok(o.a7.perm === false, 'A7 presente: a caneta física NÃO liga em biologia, mesmo com a conta fixa do código (JOSE_UID)', o.a7);
    }); }

  sec('9 · o piloto segue como antes: UID na lista basta, sem variável de matéria');
  { await cena(br, base, M(PIL), { env: Object.assign({}, LAY), candidatas: [PIL] }, 'semiologia-ii', true); }

  sec('10 · corpo idêntico em qualquer negação (não revela se a matéria existe)');
  { const a = await servidor(Object.assign({}, LAY, { RM_LAYOUT_SLUGS: A }), UID, 'biologia', 'tok'), b = await servidor(Object.assign({}, LAY), UID, 'matéria-que-não-existe', 'tok'), c0 = await servidor({}, UID, A, 'tok');
    ok(a.body === b.body && b.body === c0.body, 'slug fora da lista, slug inventado e servidor sem listas respondem o MESMO corpo', [a.body, b.body, c0.body]);
    const sem = await servidor(Object.assign({}, LAY, { RM_LAYOUT_SLUGS: A }), UID, A, ''); ok(JSON.parse(sem.body).layout === false, 'sem token ⇒ tudo false'); }

  await br.close(); srv.close();
  console.log(`\ngate-por-materia: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
