/* #456 (iPad, build 456c): o que a página faz DURANTE uma rolagem com o dedo, SEM escrever. Mede no Chromium, por configuração (antigo · layout · novo)
   e por ferramenta (nenhuma · lápis · goma): recálculos de estilo da árvore (UpdateLayoutTree com elementCount), layouts forçados e quanto a página rolou.
   Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-ipad-456/rolagem.cjs [--json=saida.json]   (RM_ASSETS_REF=origin/main para a main) */
'use strict';
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
const fs = require('fs');
async function trace(cdp, fn) {
  const ev = []; const f = d => ev.push(...d.value); cdp.on('Tracing.dataCollected', f);
  const fim = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  await fn(); await cdp.send('Tracing.end'); await fim; cdp.off('Tracing.dataCollected', f); return ev;
}
const dedo = async (cdp, page, x, y0, dist, passos = 24) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0, id: 7 }] });
  for (let i = 1; i <= passos; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 - (dist * i) / passos, id: 7 }] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(600);
};
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  const out = [];
  for (const cfg of ['antigo', 'layout', 'novo']) for (const tool of ['none', 'pen', 'eraser']) {
    const { ctx, page } = await L.abrir(br, base, midia, Object.assign({ w: 1024, h: 768, touch: true }, B.CFG[cfg]));
    await page.evaluate(B.INSTR);
    await page.evaluate(() => window.scrollTo(0, Math.min(2400, Math.max(0, (document.documentElement.scrollHeight - innerHeight) / 3)))); await page.waitForTimeout(800);
    if (tool !== 'none') { await page.evaluate(t => window.RMToolsV2.escolherFerramenta(t), tool); await page.waitForTimeout(400); }
    const cdp = await ctx.newCDPSession(page);
    const y0 = await page.evaluate(() => scrollY);
    const ev = await trace(cdp, () => dedo(cdp, page, 560, 600, 300));
    const y1 = await page.evaluate(() => scrollY);
    const ult = ev.filter(e => e.ph === 'X' && e.name === 'UpdateLayoutTree');
    const grandes = ult.filter(e => ((e.args && e.args.elementCount) || 0) >= 500);
    const lay = ev.filter(e => e.ph === 'X' && e.name === 'Layout');
    const r = { cfg, tool, y0: Math.round(y0), max: await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), rolou: Math.round(y1 - y0), recalculos: ult.length, recalculosArvore: grandes.length, maiorElementos: Math.max(0, ...ult.map(e => (e.args && e.args.elementCount) || 0)), msEstiloArvore: +(grandes.reduce((a, e) => a + (e.dur || 0), 0) / 1000).toFixed(1), layouts: lay.length };
    out.push(r); console.log(JSON.stringify(r));
    await ctx.close();
  }
  await br.close(); srv.close();
  const j = (process.argv.find(a => a.startsWith('--json=')) || '').slice(7); if (j) fs.writeFileSync(j, JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
