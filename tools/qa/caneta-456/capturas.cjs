/* Capturas e vídeo curto da #456 P0 (Chromium, motor REAL; emulação): painel de diagnóstico com números reais depois de escrever e trocar de bloco/modo com a toolbox aberta.
   Saída: docs/caneta-456/capturas/{diagnostico-desktop-1280.png, diagnostico-390.png, fluxo-desktop-1280.webm}. Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-456/capturas.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
const OUT = path.resolve(__dirname, '../../../docs/caneta-456/capturas'); fs.mkdirSync(OUT, { recursive: true });
async function fluxo(br, base, midia, { w, h, touch, nome, video }) {
  const tmp = path.join(OUT, '_v'); if (video) fs.mkdirSync(tmp, { recursive: true });
  const { ctx, page } = await L.abrir(br, base, midia, Object.assign({ w, h, touch, nav: true }, B.CFG.novo, video ? { video: { dir: tmp, size: { width: w, height: h } } } : {}));
  await page.evaluate(B.INSTR);
  const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true); const pts = B.gesto('rapido', r);
  const cdp = await ctx.newCDPSession(page), send = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
  await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(400);
  for (let t = 0; t < 3; t++) {
    const dy = t * 16;
    await send('mouseMoved', pts[0][0], pts[0][1] + dy, { buttons: 0 }); await send('mousePressed', pts[0][0], pts[0][1] + dy, { button: 'left', buttons: 1, clickCount: 1, force: .5 });
    for (let k = 1; k < 140; k++) { await send('mouseMoved', pts[k][0], pts[k][1] + dy, { button: 'left', buttons: 1, force: .5 }); await new Promise(o => setTimeout(o, 8)); }
    await send('mouseReleased', pts[139][0], pts[139][1] + dy, { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(500);
  }
  for (const spec of [{ view: 'modeidx', mode: 'preguntas' }, { view: 'block', block: 's2-b04' }, { view: 'block', block: 's2-b05' }, { view: 'block', block: 's2-b04' }]) { await page.evaluate(s => window.RMNav.go(s), spec); await page.waitForTimeout(1500); }
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `diagnostico-${nome}.png`) });
  const resumo = await page.evaluate(() => window.RMToolsV2._test.perfLinhas());
  await ctx.close();
  if (video) { const f = fs.readdirSync(tmp).find(x => x.endsWith('.webm')); if (f) fs.renameSync(path.join(tmp, f), path.join(OUT, `fluxo-${nome}.webm`)); fs.rmSync(tmp, { recursive: true, force: true }); }
  return resumo;
}
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  const a = await fluxo(br, base, midia, { w: 1280, h: 720, touch: false, nome: 'desktop-1280', video: true }); console.log(a.join('\n'));
  const b = await fluxo(br, base, midia, { w: 390, h: 844, touch: true, nome: '390', video: false }); console.log(b.join('\n'));
  await br.close(); srv.close();
})();
