/* Por que o post-it dá ~1,68 px em cfg `layout` (falha preexistente) e passa em `antigo`/`novo`? Mede rect, transform e distância máxima. Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=... node tools/qa/caneta-456/postit-rotacao.cjs  (RM_ASSETS_REF=origin/main para a main) 
   usando (a) o rect atual do elemento (como o teste) e (b) o rect no momento do desenho. */
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
(async () => {
  const { chromium } = require('playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia();
  const br = await chromium.launch();
  for (const cfg of ['antigo', 'layout', 'novo']) {
    const { ctx, page } = await L.abrir(br, base, midia, Object.assign({ w: 1440, h: 900 }, B.CFG[cfg], { seedmany: 40 }));
    await page.evaluate(B.INSTR);
    const r = await B.prepararAlvo(page, cfg, 'postit', true);
    const info0 = await page.evaluate(() => { const e = window.__alvoEl, cs = getComputedStyle(e); return { cls: e.className, tf: cs.transform, rot: cs.rotate, ow: e.offsetWidth, oh: e.offsetHeight, bw: e.getBoundingClientRect().width, bh: e.getBoundingClientRect().height }; });
    const pts = B.gesto('rapido', r);
    await B.desenhar(ctx, page, pts, 2, 1); await page.waitForTimeout(1200);
    const per = await B.medirPerdas(page, pts);
    const info1 = await page.evaluate(() => { const e = window.__alvoEl, b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    const sv = await page.evaluate(() => { const ps = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')]; const s = ps[ps.length - 1]; return s && { anchor: s.getAttribute('data-anchor'), n: s.querySelectorAll('path[data-ink]').length }; });
    console.log(cfg, JSON.stringify({ r: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.w.toFixed(1), h: +r.h.toFixed(1) }, info0, rectDepois: info1, maxDist: per.maxDist, perdidos: per.perdidos, nPts: pts.length, gravados: per.nPontosGravados, sv }));
    await ctx.close();
  }
  await br.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
