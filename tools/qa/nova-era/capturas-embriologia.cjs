/* Nova Era · capturas de Embriología (capa/índice, bloco, tabela, modo Preguntas) em 1440 · 768 · 390 px, layout novo + tema da matéria (TEMAS do repositório) — só leitura.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/capturas-embriologia.cjs <pasta> */
'use strict';
const fs = require('fs'), path = require('path'); const L = require('../ensaio-layout/lib.cjs');
const OUT = process.argv[2] || '/tmp/cap-embriologia'; const SLUG = 'embriologia', BLOCO = 'emb02', BLOCO_TAB = 'emb03';
(async () => {
  const { chromium } = require('playwright'); const m = L.reconciliar().ativas.find(x => x.slug === SLUG);
  const srv = await L.servir({}); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch(); fs.mkdirSync(OUT, { recursive: true });
  for (const W of [1440, 768, 390]) {
    const r = await L.abrir(br, base, m, { w: W, h: W === 390 ? 844 : W === 768 ? 1024 : 900, modo: 'nav', espera: 1200 }); const p = r.page;
    const tema = await p.evaluate(() => document.documentElement.getAttribute('data-rm-tema')); console.log(W, 'tema', tema, 'erros', r.errs.length);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400); await p.screenshot({ path: path.join(OUT, `${SLUG}-${W}-1-capa.jpg`), type: 'jpeg', quality: 82 });
    await p.evaluate(() => { const i = document.querySelector('.rm-sis-idx'); if (i) i.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, `${SLUG}-${W}-2-indice.jpg`), type: 'jpeg', quality: 82 });
    await p.evaluate(async b => { RMNav.go({ view: 'block', block: b }); await new Promise(r => setTimeout(r, 1700)); }, BLOCO); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, `${SLUG}-${W}-3-bloque.jpg`), type: 'jpeg', quality: 82 });
    await p.evaluate(async b => { RMNav.go({ view: 'block', block: b }); await new Promise(r => setTimeout(r, 1700)); const t = document.querySelector('#' + b + ' table'); if (t) t.scrollIntoView({ block: 'center' }); }, BLOCO_TAB); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, `${SLUG}-${W}-4-tabla.jpg`), type: 'jpeg', quality: 82 });
    await p.evaluate(async () => { RMNav.go({ view: 'index' }); await new Promise(r => setTimeout(r, 600)); const it = document.querySelector('.rm-l2-item[data-view="preguntas"]'); if (it) it.click(); await new Promise(r => setTimeout(r, 1500)); window.scrollTo(0, 0); }); await p.waitForTimeout(400); await p.screenshot({ path: path.join(OUT, `${SLUG}-${W}-5-modo-preguntas.jpg`), type: 'jpeg', quality: 82 });
    await r.ctx.close();
  }
  await br.close(); srv.close(); console.log('capturas em', OUT);
})();
