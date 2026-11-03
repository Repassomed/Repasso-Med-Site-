/* #631 · capturas do cartão e do modo Infografías (capa, índice do modo, um bloco) em 1440/768/390 para Medicina Familiar e Semiología II. Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/infografias-capturas.cjs <pasta> */
'use strict';
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const L = require('../ensaio-layout/lib.cjs'); const D = require('../pre-voo/lib-dados.cjs'); const S = require('./lib-servidor.cjs'); S.U.JOSE = D.UID;
const OUT = path.resolve(process.argv[2] || 'capturas-infografias'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const rec = L.reconciliar(); const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const SLUG of ['medicina-familiar', 'semiologia-ii']) for (const [W, H] of [[1440, 900], [768, 1024], [390, 844]]) {
    const m = rec.ativas.find(x => x.slug === SLUG); const cena = { env: { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE, RM_PILOT_VISUAL_UIDS: S.U.JOSE }, acessos: {}, tabela: SLUG === 'semiologia-ii' ? {} : { [SLUG]: { layout_stage: 'preview', pen_stage: 'preview', visual_stage: 'preview' } } };
    const ctx = await br.newContext({ viewport: { width: W, height: H }, hasTouch: W < 900 }); const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', async r => { const sl = new URL(r.request().url()).searchParams.get('slug'); const o = await S.chamar(cena, 'JOSE', sl); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
    await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [SLUG]);
    await page.goto(`${base}/p.html?slug=${SLUG}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U.JOSE}`); await page.waitForFunction('window.__ready===true'); await page.waitForTimeout(500);
    await page.addScriptTag({ url: '/assets/rm-pilot.js?v=cap' }); await page.waitForTimeout(6000); await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const snap = async n => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, `${SLUG}-${W}-${n}.png`) }); };
    await page.evaluate(() => { const c = document.querySelector('.rm-l2-rescard--fig'); if (c) c.scrollIntoView({ block: 'center' }); }); await snap('1-cartao-infografias');
    await page.evaluate(() => RMNav.go({ view: 'modeidx', mode: 'infografias' })); await page.waitForTimeout(900); await page.evaluate(() => window.scrollTo(0, 0)); await snap('2-modo-indice');
    const b = await page.evaluate(() => [...document.querySelectorAll('a.rm-sis-card[data-go]')].map(e => JSON.parse(e.getAttribute('data-go')).block)[0]);
    await page.evaluate(id => RMNav.go({ view: 'modeblk', mode: 'infografias', block: id }), b); await page.waitForTimeout(1200); await page.evaluate(() => window.scrollTo(0, 0)); await snap('3-modo-bloco');
    await ctx.close();
  }
  await br.close(); srv.close();
})().catch(e => { console.error(e); process.exit(2); });
