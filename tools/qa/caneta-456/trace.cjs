/* TRACE do Chromium (devtools.timeline) durante pointerdown/escrita/pointerup: quantos nós cada recálculo de estilo e cada layout atinge, e quanto dura.
   Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-456/trace.cjs [--cfg=antigo,novo] [--throttle=1] [--toolbox=1] [--w=1440] [--h=900] [--moves=60] */
'use strict';
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
async function trace(cdp, fn) {
  const ev = []; cdp.on('Tracing.dataCollected', d => ev.push(...d.value));
  const fim = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink,cc', transferMode: 'ReportEvents' });
  await fn(); await cdp.send('Tracing.end'); await fim; return ev;
}
function resumo(ev, t0, t1) {
  const por = {}; 
  ev.filter(e => e.ph === 'X' && e.ts >= t0 && e.ts <= t1).forEach(e => {
    const k = e.name; if (!/^(UpdateLayoutTree|Layout|PrePaint|Paint|Layerize|UpdateLayer|RasterTask|HitTest|EventDispatch|FunctionCall|RunTask|UpdateLayoutTreeInvalidation|ScheduleStyleRecalculation|StyleRecalc|CommitLoad|CompositeLayers|UpdateLayerTree|Commit|ImageDecodeTask|GPUTask)$/.test(k)) return;
    const o = por[k] = por[k] || { n: 0, ms: 0, max: 0, el: 0, elMax: 0 }; const d = (e.dur || 0) / 1000; o.n++; o.ms += d; o.max = Math.max(o.max, d);
    const ec = e.args && (e.args.elementCount != null ? e.args.elementCount : (e.args.beginData && e.args.beginData.dirtyObjects)); if (ec != null) { o.el += ec; o.elMax = Math.max(o.elMax, ec); }
  });
  return por;
}
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const cfgs = arg('cfg', 'antigo,novo').split(','), thr = +arg('throttle', 1), tb = arg('toolbox', '1') === '1', w = +arg('w', 1440), h = +arg('h', 900), nm = +arg('moves', 60);
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  for (const c of cfgs) {
    const { ctx, page } = await L.abrir(br, base, midia, Object.assign({ w, h, touch: false, seedmany: 0 }, B.CFG[c]));
    await page.evaluate(B.INSTR);
    const r = await B.prepararAlvo(page, c, 'paragrafo', tb); const pts = B.gesto('rapido', r);
    const cdp = await ctx.newCDPSession(page);
    const send = (type, x, y, extra) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, extra));
    await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 });
    if (thr > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
    const marcas = {};
    const ev = await trace(cdp, async () => {
      marcas.d0 = await page.evaluate(() => performance.now() * 1000);
      await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
      await page.waitForTimeout(400); marcas.d1 = null;
      for (let i = 1; i < Math.min(nm, pts.length); i++) { await send('mouseMoved', pts[i][0], pts[i][1], { button: 'left', buttons: 1, force: .5 }); await new Promise(o => setTimeout(o, 6)); }
      await page.waitForTimeout(200);
      await send('mouseReleased', pts[nm - 1][0], pts[nm - 1][1], { button: 'left', buttons: 0, clickCount: 1 });
      await page.waitForTimeout(700);
    });
    if (thr > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const main = ev.filter(e => e.name === 'EventDispatch' && e.args && e.args.data);
    const tdown = main.find(e => e.args.data.type === 'pointerdown'), tup = main.find(e => e.args.data.type === 'pointerup');
    const fases = [['pointerdown (+400 ms)', tdown.ts - 1000, tdown.ts + 400000], ['escrita (moves)', tdown.ts + 400000, tup.ts - 150000], ['pointerup (+700 ms)', tup.ts - 1000, tup.ts + 700000]];
    console.log(`\n==== ${c} · toolbox=${tb} · throttle=${thr} · ${w}×${h}`);
    fases.forEach(([nome, a, b]) => { const s = resumo(ev, a, b); console.log(`  -- ${nome}`); Object.keys(s).sort((x, y) => s[y].ms - s[x].ms).slice(0, 8).forEach(k => { const o = s[k]; console.log(`     ${k.padEnd(24)} n=${String(o.n).padStart(4)} soma=${o.ms.toFixed(1).padStart(7)} ms máx=${o.max.toFixed(1).padStart(6)} ms` + (o.elMax ? ` · elementos máx=${o.elMax} (soma ${o.el})` : '')); }); });
    await ctx.close();
  }
  await br.close(); srv.close();
})();
