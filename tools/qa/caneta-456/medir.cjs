/* BANCADA ANTES/DEPOIS da #456 P0 (Chromium, motor REAL, CPU 1× e 4×; não é aparelho real). Uma execução = UM código (o do disco, ou o de `RM_ASSETS_REF=<ref git>` para o «antes»).
   Mede, nos dois layouts (antigo × piloto novo): (A) custo POR TRAÇO — recálculo de estilo/layout no pointerdown e no pointerup (trace, 1×) e tempo de processamento dos eventos (Event Timing, 4×);
   (B) escrita DURANTE o traço — intervalo entre quadros, tarefas longas, atraso de entrega e da tinta (4×); (C) troca de bloco e de modo com a toolbox aberta/lápis armado/traço recém-feito (4×).
   Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… [RM_ASSETS_REF=origin/main] node tools/qa/caneta-456/medir.cjs --json=arquivo.json [--n=3] [--rapido=1] */
'use strict';
const fs = require('fs');
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const N = +arg('n', 3), RAPIDO = arg('rapido', '0') === '1', JSON_OUT = arg('json', '');
const med = a => { const v = a.filter(x => x != null && x === x).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : null; };
const r1 = x => x == null ? null : Math.round(x * 10) / 10;

async function trace(cdp, fn) {
  const ev = []; const f = d => ev.push(...d.value); cdp.on('Tracing.dataCollected', f);
  const fim = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  await fn(); await cdp.send('Tracing.end'); await fim; cdp.off('Tracing.dataCollected', f); return ev;
}
function janela(ev, a, b) {
  const o = { estiloMs: 0, estiloMax: 0, estiloEl: 0, layoutMs: 0, layoutMax: 0 };
  ev.filter(e => e.ph === 'X' && e.ts >= a && e.ts <= b).forEach(e => {
    const d = (e.dur || 0) / 1000;
    if (e.name === 'UpdateLayoutTree') { o.estiloMs += d; o.estiloMax = Math.max(o.estiloMax, d); o.estiloEl = Math.max(o.estiloEl, (e.args && e.args.elementCount) || 0); }
    if (e.name === 'Layout') { o.layoutMs += d; o.layoutMax = Math.max(o.layoutMax, d); }
  });
  return o;
}

/* (A) custo por traço: trace a 1× */
async function porTraco(br, base, midia, cfg) {
  const rs = [];
  for (let i = 0; i < N; i++) {
    const { ctx, page } = await L.abrir(br, base, midia, Object.assign({ w: 1440, h: 900, touch: false }, B.CFG[cfg]));
    await page.evaluate(B.INSTR);
    const r = await B.prepararAlvo(page, cfg, 'paragrafo', true); const pts = B.gesto('rapido', r);
    const cdp = await ctx.newCDPSession(page);
    const send = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
    await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 });
    const ev = await trace(cdp, async () => {
      await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 }); await page.waitForTimeout(400);
      for (let k = 1; k < 60; k++) { await send('mouseMoved', pts[k][0], pts[k][1], { button: 'left', buttons: 1, force: .5 }); await new Promise(o => setTimeout(o, 6)); }
      await page.waitForTimeout(200); await send('mouseReleased', pts[59][0], pts[59][1], { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(700);
    });
    const disp = ev.filter(e => e.name === 'EventDispatch' && e.args && e.args.data);
    const d = disp.find(e => e.args.data.type === 'pointerdown'), u = disp.find(e => e.args.data.type === 'pointerup');
    rs.push({ down: janela(ev, d.ts - 1000, d.ts + 400000), up: janela(ev, u.ts - 1000, u.ts + 700000) });
    await ctx.close();
  }
  const pick = (fase, k) => r1(med(rs.map(x => x[fase][k])));
  return { n: N, down: { estiloMs: pick('down', 'estiloMs'), estiloMax: pick('down', 'estiloMax'), elementos: med(rs.map(x => x.down.estiloEl)), layoutMs: pick('down', 'layoutMs') }, up: { estiloMs: pick('up', 'estiloMs'), estiloMax: pick('up', 'estiloMax'), elementos: med(rs.map(x => x.up.estiloEl)), layoutMs: pick('up', 'layoutMs') } };
}

/* (B) escrita durante o traço (bench do #461, 4×, toolbox aberta) */
async function escrita(br, base, midia, cfg, gesto, cel) {
  const rs = [];
  for (let i = 0; i < N; i++) rs.push(await B.bench(br, base, midia, cfg, cel ? { w: 390, h: 844, gesto, alvo: 'paragrafo', toolbox: true, throttle: 6, mobile: true, scale: 2 } : { w: 1440, h: 900, gesto, alvo: 'paragrafo', toolbox: true, throttle: 4 }));
  const g = f => r1(med(rs.map(f)));
  return { n: N, entregaP95: g(x => x.entregaMs.p95), quadroMed: g(x => x.quadros.mediaMs), quadroP95: g(x => x.quadros.p95), quadroMax: g(x => x.quadros.max), mais50: g(x => x.quadros.mais50), tarefasLongas: g(x => x.tarefasLongas.n), tarefasLongasMax: g(x => x.tarefasLongas.maxMs), tintaP95: g(x => x.tintaMs.p95), perdidos: Math.max(...rs.map(x => x.perdas.perdidos || 0)), maxDistPx: r1(Math.max(...rs.map(x => x.perdas.maxDist || 0))), tracos: med(rs.map(x => x.perdas.tracos)) };
}

/* (C) trocas com a toolbox aberta/armada/traço (4×): ida e volta de modo, bloco ↔ bloco */
async function trocas(br, base, midia, estado) {
  const { ctx, page } = await L.abrir(br, base, midia, Object.assign({ w: 1440, h: 900, nav: true }, B.CFG.novo));
  await page.evaluate(B.INSTR); const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true);
  const cdp = await ctx.newCDPSession(page);
  await page.exposeFunction('__cpu', async () => { const { metrics } = await cdp.send('Performance.getMetrics'); const m = metrics.find(x => x.name === 'TaskDuration'); return m ? m.value : 0; });
  const pts = B.gesto('rapido', r), send = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
  await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 }); await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
  for (let i = 1; i < 80; i++) { await send('mouseMoved', pts[i][0], pts[i][1], { button: 'left', buttons: 1, force: .5 }); await new Promise(o => setTimeout(o, 4)); }
  await send('mouseReleased', pts[79][0], pts[79][1], { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(500);
  if (estado === 'fechada') { await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); for (let k = 0; k < 3 && await page.evaluate(() => !!document.querySelector('.rm2-box.open')); k++) { await page.evaluate(() => document.querySelector('#rm2-fab').click()); await page.waitForTimeout(400); } }
  const reps = RAPIDO ? 4 : 10;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
  const out = await page.evaluate(async (reps) => {
    const esp = ms => new Promise(o => setTimeout(o, ms)), res = { modoIda: [], modoVolta: [], blocoBloco: [] };
    const lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(x => lt.push(x.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
    const passo = async (spec) => { lt.length = 0; const c0 = await window.__cpu(); const t0 = performance.now(); window.RMNav.go(spec); await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok))); const t = performance.now() - t0; await esp(1300); const c1 = await window.__cpu(); return { t, cpu: (c1 - c0) * 1000, longas: lt.length, longaMax: lt.length ? Math.max(...lt) : 0, longaSoma: lt.reduce((a, b) => a + b, 0) }; };
    for (let i = 0; i < reps; i++) { res.modoIda.push(await passo({ view: 'modeidx', mode: 'preguntas' })); res.modoVolta.push(await passo({ view: 'block', block: 's2-b04' })); }
    for (let i = 0; i < reps; i++) res.blocoBloco.push(await passo({ view: 'block', block: i % 2 ? 's2-b04' : 's2-b05' }));
    return res;
  }, reps);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  /* medida DETERMINÍSTICA (não depende do tempo): quantas recalculações de estilo de ≥ 800 elementos (árvore quase inteira) e quantos elementos no total uma ida e volta de modo provoca */
  const evT = await trace(cdp, async () => { for (let i = 0; i < 3; i++) { await page.evaluate(() => window.RMNav.go({ view: 'modeidx', mode: 'preguntas' })); await page.waitForTimeout(1400); await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b04' })); await page.waitForTimeout(1600); } });
  const ult = evT.filter(e => e.ph === 'X' && e.name === 'UpdateLayoutTree');
  const grandes = ult.filter(e => ((e.args && e.args.elementCount) || 0) >= 800);
  const estiloGrandes = { passesPorIdaVolta: r1(grandes.length / 3), elementosPorIdaVolta: Math.round(ult.reduce((a, e) => a + ((e.args && e.args.elementCount) || 0), 0) / 3), msPorIdaVolta: r1(ult.reduce((a, e) => a + (e.dur || 0) / 1000, 0) / 3) };
  const tracos = await page.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length), aberta = await page.evaluate(() => !!document.querySelector('.rm2-box.open'));
  await ctx.close();
  const f = a => ({ mediana: Math.round(med(a.map(x => x.t))), min: Math.round(Math.min(...a.map(x => x.t))), max: Math.round(Math.max(...a.map(x => x.t))), tarefasLongasSoma: Math.round(med(a.map(x => x.longaSoma))), tarefasLongasMax: Math.round(Math.max(...a.map(x => x.longaMax))), cpuMs: Math.round(med(a.map(x => x.cpu))) });
  return { estado, reps, modoIda: f(out.modoIda), modoVolta: f(out.modoVolta), blocoBloco: f(out.blocoBloco), estiloGrandes, tracosDepois: tracos, toolboxAbertaDepois: aberta };
}

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  const res = { ref: process.env.RM_ASSETS_REF || '(árvore de trabalho)', quando: new Date().toISOString().slice(0, 10) };
  const so = arg('so', '');
  if (so === 'celular') { res.celular = {}; for (const c of ['antigo', 'novo']) { res.celular[c] = await escrita(br, base, midia, c, 'rapido', true); console.log('celular 390 (DPR2, CPU 6×)', c, JSON.stringify(res.celular[c])); } if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(res, null, 1)); await br.close(); srv.close(); return; }
  res.porTraco = {}; if (!so || so === 'porTraco') for (const c of ['antigo', 'novo']) { res.porTraco[c] = await porTraco(br, base, midia, c); console.log('porTraco', c, JSON.stringify(res.porTraco[c])); }
  res.escrita = {}; if (!so || so === 'escrita') for (const c of ['antigo', 'novo']) for (const g of RAPIDO ? ['rapido'] : ['rapido', 'longo']) { res.escrita[c + '/' + g] = await escrita(br, base, midia, c, g); console.log('escrita', c, g, JSON.stringify(res.escrita[c + '/' + g])); }
  res.trocas = {}; if (!so || so === 'trocas') for (const e of ['aberta+armado+traco', 'fechada']) { res.trocas[e] = await trocas(br, base, midia, e === 'fechada' ? 'fechada' : 'aberta'); console.log('trocas', e, JSON.stringify(res.trocas[e])); }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(res, null, 1));
  await br.close(); srv.close();
})();
