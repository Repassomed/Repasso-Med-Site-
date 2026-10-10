/* TRAVADA na troca de bloco/modo com a toolbox ABERTA, lápis armado e um traço recém-feito (issue #456 · P0). Piloto novo, motor REAL, Chromium.
   Para cada transição mede: tempo até o 2.º quadro depois da chamada (o que o aluno sente como «travada»), tarefas longas (≥ 50 ms, PerformanceObserver) e, no trace, o maior
   UpdateLayoutTree / Layout / FunctionCall (+ nº de elementos atingidos). Com --perfil=1 imprime também as funções JS mais caras (CDP Profiler).
   Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-456/troca.cjs [--toolbox=1|0] [--armado=1|0] [--traco=1|0] [--throttle=4] [--w=1440] [--h=900] [--perfil=1] [--desarmar=1: desarma o lápis depois do traço] [--json=arquivo] */
'use strict';
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const TR = [
  ['bloco 04 → bloco 05', { view: 'block', block: 's2-b05' }],
  ['bloco 05 → bloco 04', { view: 'block', block: 's2-b04' }],
  ['bloco → índice de preguntas (modo)', { view: 'modeidx', mode: 'preguntas' }],
  ['modo → preguntas do bloco 04', { view: 'modeblk', mode: 'preguntas', block: 's2-b04' }],
  ['modo → bloco 04 (completa)', { view: 'block', block: 's2-b04' }],
  ['bloco → índice geral', { view: 'index' }]
];
async function trace(cdp, fn) {
  const ev = []; const f = d => ev.push(...d.value); cdp.on('Tracing.dataCollected', f);
  const fim = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  await fn(); await cdp.send('Tracing.end'); await fim; cdp.off('Tracing.dataCollected', f); return ev;
}
/* atribui o tempo (self) de cada amostra à função de SCRIPT mais próxima na pilha (quem disparou o estilo/layout forçado), não à função nativa */
function agregarPerfil(p, topo) {
  const nos = new Map(); p.nodes.forEach(n => nos.set(n.id, n)); const pai = new Map();
  p.nodes.forEach(n => (n.children || []).forEach(c => pai.set(c, n.id)));
  const nome = n => { const c = n.callFrame; return `${c.functionName || '(anon)'} ${c.url.split('/').pop().split('?')[0] || ''}:${c.lineNumber + 1}`; };
  const por = new Map();
  p.samples.forEach((id, i) => {
    let n = nos.get(id); const nat = n.callFrame.functionName || '(anon)'; if (/^\((idle|garbage)/.test(nat)) return;
    let k = null; for (let x = n, g = 0; x && g < 60; x = nos.get(pai.get(x.id)), g++) { if (x.callFrame.url) { k = nome(x); break; } }
    k = (k || '(sem script)') + '  ← ' + (nat === '(program)' ? 'nativo' : nat);
    por.set(k, (por.get(k) || 0) + (p.timeDeltas[i] || 0) / 1000);
  });
  return [...por.entries()].sort((a, b) => b[1] - a[1]).slice(0, topo).map(([k, v]) => `${v.toFixed(1)} ms · ${k}`);
}
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const tb = arg('toolbox', '1') === '1', armado = arg('armado', '1') === '1', traco = arg('traco', '1') === '1', thr = +arg('throttle', 4), w = +arg('w', 1440), h = +arg('h', 900), perfil = arg('perfil', '0') === '1', json = arg('json', '');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  const { ctx, page, errs } = await L.abrir(br, base, midia, Object.assign({ w, h, touch: false, nav: true }, B.CFG.novo));
  await page.evaluate(B.INSTR);
  const r = await B.prepararAlvo(page, 'novo', 'paragrafo', tb);
  if (!tb && armado) await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
  if (!armado) await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none'));
  if (!tb && !armado) {                                                       // toolbox FECHADA de verdade (a V2 deixa o painel aberto ao desarmar): clica no botão da maleta
    for (let k = 0; k < 3 && await page.evaluate(() => !!document.querySelector('.rm2-box.open')); k++) { await page.evaluate(() => document.querySelector('#rm2-fab').click()); await page.waitForTimeout(400); }
  }
  const cdp = await ctx.newCDPSession(page);
  if (traco && armado) {
    const pts = B.gesto('rapido', r), send = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
    await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 }); await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
    for (let i = 1; i < 90; i++) { await send('mouseMoved', pts[i][0], pts[i][1], { button: 'left', buttons: 1, force: .5 }); await new Promise(o => setTimeout(o, 4)); }
    await send('mouseReleased', pts[89][0], pts[89][1], { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(500);
  }
  if (arg('desarmar', '0') === '1') { await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await page.waitForTimeout(300); }
  const est = await page.evaluate(() => ({ tool: window.RMToolsV2.estado && window.RMToolsV2.estado.tool, boxOpen: !!document.querySelector('.rm2-box.open'), tracos: document.querySelectorAll('#rm2-ink path[data-ink]').length, vis: [...document.querySelectorAll('#materias-container *')].filter(e => e.offsetParent !== null).length }));
  console.log(`cenário: toolbox=${tb} armado=${armado} traço=${traco} throttle=${thr} ${w}×${h} · estado antes: ${JSON.stringify(est)}`);
  await page.evaluate(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(x => window.__lt.push(x.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) {} });
  const out = [];
  for (const [nome, spec] of TR) {
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
    let prof = null, t2f;
    const ev = await trace(cdp, async () => {
      await page.evaluate(() => { window.__lt.length = 0; });
      if (perfil) await cdp.send('Profiler.start');
      t2f = await page.evaluate((spec) => new Promise(ok => { const t0 = performance.now(); const okGo = window.RMNav.go(spec); requestAnimationFrame(() => requestAnimationFrame(() => ok({ ms: performance.now() - t0, okGo }))); }), spec);
      await page.waitForTimeout(900);
      if (perfil) prof = (await cdp.send('Profiler.stop')).profile;
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const lt = await page.evaluate(() => window.__lt.slice());
    const m = {}; ev.filter(e => e.ph === 'X').forEach(e => { if (!/^(UpdateLayoutTree|Layout|FunctionCall|Paint|PrePaint|Layerize|HitTest)$/.test(e.name)) return; const o = m[e.name] = m[e.name] || { n: 0, ms: 0, max: 0, el: 0 }; const d = (e.dur || 0) / 1000; o.n++; o.ms += d; o.max = Math.max(o.max, d); const ec = e.args && (e.args.elementCount != null ? e.args.elementCount : (e.args.beginData && e.args.beginData.dirtyObjects)); if (ec != null) o.el = Math.max(o.el, ec); });
    const est2 = await page.evaluate(() => ({ nav: window.RMNav.estado().view, tool: window.RMToolsV2.estado && window.RMToolsV2.estado.tool, boxOpen: !!document.querySelector('.rm2-box.open'), tracos: document.querySelectorAll('#rm2-ink path[data-ink]').length }));
    const linha = { nome, ate2oQuadroMs: Math.round(t2f.ms), tarefasLongas: lt.map(x => Math.round(x)), UpdateLayoutTree: m.UpdateLayoutTree && { n: m.UpdateLayoutTree.n, somaMs: +m.UpdateLayoutTree.ms.toFixed(1), maxMs: +m.UpdateLayoutTree.max.toFixed(1), elMax: m.UpdateLayoutTree.el }, Layout: m.Layout && { n: m.Layout.n, somaMs: +m.Layout.ms.toFixed(1), maxMs: +m.Layout.max.toFixed(1), elMax: m.Layout.el }, FunctionCallMaxMs: m.FunctionCall && +m.FunctionCall.max.toFixed(1), depois: est2 };
    if (prof) linha.topJs = agregarPerfil(prof, 10);
    out.push(linha);
    console.log(`\n▸ ${nome}: até o 2.º quadro ${linha.ate2oQuadroMs} ms · tarefas longas ${JSON.stringify(linha.tarefasLongas)} · estilo ${JSON.stringify(linha.UpdateLayoutTree)} · layout ${JSON.stringify(linha.Layout)} · FunctionCall máx ${linha.FunctionCallMaxMs} ms · depois ${JSON.stringify(est2)}`);
    if (linha.topJs) linha.topJs.forEach(x => console.log('     ' + x));
  }
  console.log('\nerros:', JSON.stringify(errs.slice(0, 3)));
  if (json) require('fs').writeFileSync(json, JSON.stringify({ cenario: { tb, armado, traco, thr, w, h }, estAntes: est, out }, null, 1));
  await br.close(); srv.close();
})();
