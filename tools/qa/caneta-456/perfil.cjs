/* PERFIL DE CPU da caneta (issue #456 · P0): onde o tempo vai no pointerdown e durante a escrita, layout antigo × piloto novo (motor REAL, Chromium).
   Usa CDP Profiler (amostragem 150 µs) + Performance.getMetrics com CPU em 4× (aproxima um tablet). Não é aparelho real.
   Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-456/perfil.cjs [--cfg=antigo,novo] [--fase=down|escrita] [--throttle=4] [--w=1440] [--h=900] [--toolbox=1] */
'use strict';
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };

function agregar(perfil, topo) {
  const nos = new Map(); perfil.nodes.forEach(n => nos.set(n.id, n));
  const self = new Map();
  for (let i = 0; i < perfil.samples.length; i++) { const id = perfil.samples[i], dt = (perfil.timeDeltas[i] || 0) / 1000; self.set(id, (self.get(id) || 0) + dt); }
  const por = new Map();
  self.forEach((ms, id) => { const c = nos.get(id).callFrame; const k = `${c.functionName || '(anon)'} ${c.url.split('/').pop() || ''}:${c.lineNumber + 1}`; por.set(k, (por.get(k) || 0) + ms); });
  const tot = [...por.values()].reduce((a, b) => a + b, 0);
  return { totalMs: Math.round(tot), top: [...por.entries()].sort((a, b) => b[1] - a[1]).slice(0, topo).map(([k, v]) => `${Math.round(v * 10) / 10} ms · ${k}`) };
}

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const cfgs = arg('cfg', 'antigo,novo').split(','), fase = arg('fase', 'down'), thr = +arg('throttle', 4), w = +arg('w', 1440), h = +arg('h', 900), tb = arg('toolbox', '1') === '1';
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  for (const c of cfgs) {
    const { ctx, page } = await L.abrir(br, base, midia, Object.assign({ w, h, touch: false, seedmany: 0 }, B.CFG[c]));
    await page.evaluate(B.INSTR);
    const r = await B.prepararAlvo(page, c, 'paragrafo', tb);
    const pts = B.gesto('rapido', r);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable'); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 150 });
    const send = (type, x, y, extra) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, extra));
    await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
    await page.evaluate(() => { const pb = window.__pb; pb.ev = []; pb.frames = []; pb.lt = []; pb.et = []; pb.rodando = true; });
    await cdp.send('Profiler.start');
    await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
    const n = fase === 'down' ? 6 : pts.length;
    for (let i = 1; i < n; i++) { await send('mouseMoved', pts[i][0], pts[i][1], { button: 'left', buttons: 1, force: .5 }); await new Promise(o => setTimeout(o, 3)); }
    await page.waitForTimeout(fase === 'down' ? 700 : 300);
    const { profile } = await cdp.send('Profiler.stop');
    await send('mouseReleased', pts[n - 1][0], pts[n - 1][1], { button: 'left', buttons: 0, clickCount: 1 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const a = agregar(profile, 12);
    console.log(`\n== ${c} · fase=${fase} · throttle=${thr} · toolbox=${tb} · amostrado ${a.totalMs} ms`); a.top.forEach(x => console.log('   ' + x));
    await ctx.close();
  }
  await br.close(); srv.close();
})();
