/* QUEM invalida estilo/layout numa transição (issue #456): trace com invalidationTracking do Chromium (reason + pilha JS) durante RMNav.go com a toolbox aberta/lápis armado.
   Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-456/invalida.cjs [--de=block:s2-b04 --para=block:s2-b05] */
'use strict';
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const spec = (s) => { const [v, b, c] = s.split(':'); return v === 'block' ? { view: 'block', block: b } : v === 'index' ? { view: 'index' } : v === 'modeidx' ? { view: 'modeidx', mode: b } : { view: 'modeblk', mode: b, block: c }; };
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const de = spec(arg('de', 'block:s2-b04')), para = spec(arg('para', 'block:s2-b05')), tb = arg('toolbox', '1') === '1';
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  const { ctx, page } = await L.abrir(br, base, midia, Object.assign({ w: 1440, h: 900, nav: true }, B.CFG.novo));
  await page.evaluate(B.INSTR); await B.prepararAlvo(page, 'novo', 'paragrafo', tb);
  if (!tb) { await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); for (let k = 0; k < 3 && await page.evaluate(() => !!document.querySelector('.rm2-box.open')); k++) { await page.evaluate(() => document.querySelector('#rm2-fab').click()); await page.waitForTimeout(400); } }
  await page.evaluate(s => window.RMNav.go(s), de); await page.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(page); const ev = []; cdp.on('Tracing.dataCollected', d => ev.push(...d.value)); const fim = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking', transferMode: 'ReportEvents' });
  await page.evaluate(s => window.RMNav.go(s), para); await page.waitForTimeout(1500);
  await cdp.send('Tracing.end'); await fim;
  const total = ev.filter(e => /^(StyleRecalcInvalidationTracking|LayoutInvalidationTracking)$/.test(e.name)).length; console.log('invalidações:', total, 'toolbox aberta =', tb);
  const so = arg('so', ''); const tipo = n => (so === 'estilo' ? /^(StyleRecalcInvalidationTracking|StyleInvalidatorInvalidationTracking|ScheduleStyleInvalidationTracking)$/ : /^(StyleRecalcInvalidationTracking|StyleInvalidatorInvalidationTracking|LayoutInvalidationTracking|ScheduleStyleInvalidationTracking)$/).test(n);
  const por = new Map();
  ev.filter(e => tipo(e.name) && e.args && e.args.data).forEach(e => {
    const d = e.args.data, pilha = (d.stackTrace || []).filter(f => f.url && !/^\s*$/.test(f.url)).slice(0, 3).map(f => `${f.functionName || '(anon)'} ${f.url.split('/').pop().split('?')[0]}:${f.lineNumber}`).join(' < ');
    const k = `${e.name.replace('InvalidationTracking', '')} · ${d.reason || d.invalidatedSelectors && 'selector' || ''} · <${(d.nodeName || '').slice(0, 40)}> · ${d.changedAttribute || d.changedClass || d.changedId || ''} · ${pilha}`;
    por.set(k, (por.get(k) || 0) + 1);
  });
  [...por.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, n]) => console.log(String(n).padStart(4) + '× ' + k.slice(0, 330)));
  await br.close(); srv.close();
})();
