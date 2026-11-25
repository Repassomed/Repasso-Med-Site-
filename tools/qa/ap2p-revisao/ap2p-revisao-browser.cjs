/* AP II Práctica · revisión integral · pruebas de NAVEGADOR (Chromium; servidor local; Supabase simulado; 0 rede externa, 0 escrita).
   Prueba: carga, imágenes nuevas, atlas interactivos (cada punto: leyenda, explicación, zoom), ampliar vistas, glosario (CADA término de la materia abre y cierra su nota, sin salirse de la pantalla), 3 anchos.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ap2p-revisao/ap2p-revisao-browser.cjs   (RM_SHOTS=/pasta salva capturas) */
const path = require('path');
const { serve } = require('../browser-qa/layout/serve.cjs');
let ok = 0, bad = 0;
const T = (c, m, x) => { if (c) ok++; else { bad++; console.log('  ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 260) : ''); } };
const SHOTS = process.env.RM_SHOTS || '';

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  for (const [w, h] of [[1440, 900], [820, 1100], [390, 844]]) {
    console.log(`\n===== ${w}×${h}`);
    const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 });
    const p = await ctx.newPage(); const errs = [], ruins = [], escritas = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    p.on('response', r => { const u = r.url(); if (r.status() >= 400 && u.startsWith(base)) ruins.push(r.status() + ' ' + u.replace(base, '')); });
    p.on('request', r => { if (r.method() !== 'GET' && r.method() !== 'HEAD' && r.url().startsWith(base)) escritas.push(r.method() + ' ' + r.url()); });
    for (const u of ['https://fonts.googleapis.com/**', 'https://www.youtube.com/**', 'https://www.youtube-nocookie.com/**']) await p.route(u, r => r.fulfill({ status: 200, contentType: 'text/html', body: '' }));
    await p.route('https://i.ytimg.com/**', r => r.fulfill({ status: 204, body: '' }));
    await p.goto(`${base}/p.html?slug=anatomia-patologica-ii-practica&tab=anatoprat2&wait=800`);
    await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(800);
    await p.evaluate(() => { document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }); });
    await p.waitForTimeout(3500);

    // 1 · carga e imágenes nuevas
    const sec = await p.evaluate(() => [...document.querySelectorAll('#materias-container section[id^="ap2pb"]')].map(s => s.id));
    T(sec.length >= 23, 'hay secciones ap2pb01…ap2pb23 en la página (' + sec.length + ')');
    const imgs = await p.evaluate(() => [...document.querySelectorAll('img[src*="lam-fotos-"], img[src*="lam-final-"], img[src*="lam-p2-"], .rmatlas-zoomimg')].filter(i => i.getAttribute('src')).map(i => ({ s: i.getAttribute('src').split('/').pop(), ok: i.complete && i.naturalWidth > 0 })));
    T(imgs.length >= 27 && imgs.every(i => i.ok), `${imgs.length} imágenes de las fotos nuevas, todas cargadas`, imgs.filter(i => !i.ok));
    T(errs.length === 0, 'sin errores de página', errs.slice(0, 3));
    T(ruins.length === 0, 'sin respuestas ≥ 400', ruins.slice(0, 3));
    T(escritas.length === 0, 'cero escrituras (solo GET)', escritas.slice(0, 3));

    // 2 · atlas
    const atlas = await p.$$('.rmatlas');
    T(atlas.length === 21, '21 atlas interactivos en la página', atlas.length);
    let nPts = 0, zoomOk = 0, solapes = 0;
    for (const a of atlas) {
      await a.scrollIntoViewIfNeeded();
      const pts = await a.$$('.rmatlas-pt');
      const cajas = [];
      for (const b of pts) cajas.push(await b.boundingBox());
      for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) if (cajas[i] && cajas[j] && Math.hypot(cajas[i].x - cajas[j].x, cajas[i].y - cajas[j].y) < 26) solapes++;
      for (const b of pts) {
        await b.click(); nPts++;
        const st = await a.evaluate(el => ({ leg: el.querySelector('.rmatlas-legend').textContent, ex: el.querySelector('.rmatlas-expl').textContent, tr: el.querySelector('.rmatlas-zoomimg').style.transform, op: el.classList.contains('opened'), act: el.querySelectorAll('.rmatlas-pt.active').length, zs: !!el.querySelector('.rmatlas-zoomimg').src }));
        if (st.op && st.act === 1 && st.leg.trim().length > 3 && st.ex.length > 40 && /scale\(2\.7\)/.test(st.tr) && st.zs) zoomOk++;
      }
    }
    T(nPts >= 33 && zoomOk === nPts, `${nPts} puntos: cada uno abre leyenda, explicación y zoom (${zoomOk}/${nPts})`);
    T(solapes === 0, 'ningún par de puntos de un mismo atlas se superpone (< 26 px)', solapes);

    // 3 · ampliar vista
    const v = await p.$('figure.ap2p-view img[src*="lam-fotos-"], img[src*="lam-final-"], img[src*="lam-p2-"]'); await v.scrollIntoViewIfNeeded();
    const fig = await v.evaluateHandle(el => el.closest('figure')); await fig.asElement().click();
    T(await fig.asElement().evaluate(el => el.classList.contains('ap2p-big')), 'tocar una vista la amplía');
    await fig.asElement().click(); T(!(await fig.asElement().evaluate(el => el.classList.contains('ap2p-big'))), 'tocar de nuevo la reduce');

    // 4 · glosario: cada término abre y cierra su nota sin salirse de la pantalla
    const gl = await p.$$('.rmc-gl');
    T(gl.length >= 290, `${gl.length} términos con glosario en la materia`);
    let abre = 0, cierra = 0, dentro = 0, igual = 0, total = 0;
    const idxs = []; for (let i = 0; i < gl.length; i++) idxs.push(i);
    for (const i of idxs) {
      total++;
      const r = await p.evaluate(async (i) => {
        const el = document.querySelectorAll('.rmc-gl')[i]; el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 40)));
        const def = (el.querySelector(':scope > i') || {}).innerHTML || '';
        el.click(); await new Promise(r => setTimeout(r, 90));
        const n = document.getElementById('rm-gl-note'); const on = !!n && n.classList.contains('on');
        const rc = n ? n.getBoundingClientRect() : { left: -1, right: 99999, top: -1, bottom: 99999 };
        const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
        const dentro = rc.left >= 0 && rc.right <= vw + 1 && rc.top >= 0 && rc.bottom <= vh + 1;
        const igual = !!n && n.innerHTML === def;
        el.click(); await new Promise(r => setTimeout(r, 90));
        const cerrado = !n.classList.contains('on');
        return { on, dentro, igual, cerrado };
      }, i);
      if (r.on) abre++; if (r.cerrado) cierra++; if (r.dentro) dentro++; if (r.igual) igual++;
    }
    T(abre === total, `los ${total} términos abren su nota (${abre})`);
    T(igual === total, 'la nota muestra exactamente la definición del término', igual);
    T(cierra === total, 'tocar de nuevo cierra la nota', cierra);
    T(dentro === total, 'la nota siempre queda dentro de la pantalla', dentro);
    // Esc cierra
    await p.evaluate(() => document.querySelectorAll('.rmc-gl')[5].click()); await p.waitForTimeout(60);
    await p.keyboard.press('Escape'); await p.waitForTimeout(60);
    T(await p.evaluate(() => !document.getElementById('rm-gl-note').classList.contains('on')), 'Esc cierra la nota');
    // fichas oficiales: sin desborde horizontal propio (no hace falta deslizar para leer una ficha)
    const desb = await p.evaluate(() => [...document.querySelectorAll('.ap2p-ficha .rmc-scroll')].filter(e => e.scrollWidth > e.clientWidth + 1).length);
    T(desb === 0, 'ninguna ficha oficial necesita scroll horizontal propio (' + desb + ' con desborde)', desb);
    // sin scroll horizontal
    T(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'sin scroll horizontal de página');
    if (SHOTS) {
      const a = await p.$('#lam-fotos-crohn'); if (a) { await a.scrollIntoViewIfNeeded(); await (await p.$('#lam-fotos-crohn .rmatlas-pt')).click(); await a.screenshot({ path: path.join(SHOTS, `crohn-${w}.png`) }); }
      const h = await p.$('#lam-hashimoto'); if (h) { await h.scrollIntoViewIfNeeded(); await h.screenshot({ path: path.join(SHOTS, `hashimoto-${w}.png`) }); }
    }
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`\nap2p-revisao (navegador): ${ok}/${ok + bad} OK` + (bad ? ` — ${bad} FALHAS` : ''));
  process.exit(bad ? 1 : 0);
})();
