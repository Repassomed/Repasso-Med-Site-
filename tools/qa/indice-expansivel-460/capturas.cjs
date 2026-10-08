/* Capturas ANTES/DEPOIS do índice central (issue #460). «Antes» = índice atual (cards abrem o bloco); «depois» = com o módulo (?ix=1).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/indice-expansivel-460/capturas.cjs     Saída: docs/indice-expansivel-460/capturas/ */
'use strict';
const path = require('path'), fs = require('fs');
const L = require('../ensaio-layout/lib.cjs');
const OUT = path.join(L.REPO, 'docs/indice-expansivel-460/capturas');
const clica = async (p, id) => { const b = await p.$(`button.rm-ix-card[data-rm-go="${id}"]`); await b.scrollIntoViewIfNeeded(); await b.click(); await p.waitForTimeout(600); };
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.servir(); const base = 'http://127.0.0.1:' + srv.address().port, br = await chromium.launch();
  const m = L.reconciliar().ativas.find(x => x.slug === 'semiologia-ii');
  const abre = (w, h, ix, extra = {}) => L.abrir(br, base, m, Object.assign({ w, h, modo: 'nav', ix }, extra));
  const shot = (p, nome, full) => p.screenshot({ path: path.join(OUT, nome + '.png'), fullPage: !!full });
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const a = await abre(w, h, false); await a.page.evaluate(() => { const g = document.querySelector('.rm-sis-idx'); window.scrollTo(0, g.getBoundingClientRect().top + scrollY - 90); }); await a.page.waitForTimeout(300);
    await shot(a.page, `antes-${w}px-indice`); await a.ctx.close();
    const d = await abre(w, h, true); await d.page.evaluate(() => { const g = document.querySelector('.rm-sis-idx'); window.scrollTo(0, g.getBoundingClientRect().top + scrollY - 90); }); await d.page.waitForTimeout(300);
    await shot(d.page, `depois-${w}px-indice-recolhido`);
    await clica(d.page, w > 800 ? 's2-b03' : 's2-b02'); await shot(d.page, `depois-${w}px-card-expandido`);
    if (w > 800) { await clica(d.page, 's2-b08'); await shot(d.page, `depois-${w}px-outra-fileira-expandida`); }
    await d.ctx.close();
  }
  /* frame no meio da animação (≈100 ms) e movimento reduzido (instantâneo) */
  { const d = await abre(1440, 900, true); const b = await d.page.$('button.rm-ix-card[data-rm-go="s2-b03"]'); await b.scrollIntoViewIfNeeded(); await b.click(); await d.page.waitForTimeout(90); await shot(d.page, 'depois-1440px-meio-da-animacao'); await d.ctx.close(); }
  { const d = await abre(1440, 900, true, { extra: '' }); await d.page.emulateMedia({ reducedMotion: 'reduce' }); const b = await d.page.$('button.rm-ix-card[data-rm-go="s2-b03"]'); await b.scrollIntoViewIfNeeded(); await b.click(); await d.page.waitForTimeout(30); await shot(d.page, 'depois-1440px-movimento-reduzido-30ms'); await d.ctx.close(); }
  /* depois de escolher um subtítulo: leitura posicionada no título */
  { const d = await abre(1440, 900, true); await clica(d.page, 's2-b03'); const s = await d.page.$$('.rm-ix-panel.is-open .rm-ix-sub'); await s[Math.min(2, s.length - 1)].click(); await d.page.waitForTimeout(1600); await shot(d.page, 'depois-1440px-subtitulo-escolhido'); await d.ctx.close(); }
  await br.close(); srv.close(); console.log('ok', fs.readdirSync(OUT).length, 'capturas');
})().catch(e => { console.error(e); process.exit(1); });
