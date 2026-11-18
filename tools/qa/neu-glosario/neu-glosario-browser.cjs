/* Neurología · glosario nos blocos 20–27 num navegador real (layout controle 1440 e 390): as glosas existem, tocar abre a definição e fecha, sem erro de console. */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
let ok = 0, bad = 0; const T = (c, m) => { if (c) { ok++; console.log('  ✓', m); } else { bad++; console.log('  ✗ FALHA:', m); } };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'neurologia');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const w of [1440, 390]) {
    const r = await L.abrir(br, base, m, { w, h: 900, modo: 'controle', corr: true });
    const erros = []; r.page.on('pageerror', e => erros.push(String(e)));
    await r.page.waitForTimeout(2500);
    const cont = await r.page.evaluate(() => { const o = {}; for (let n = 20; n <= 27; n++) { const s = document.getElementById('neub' + n); o[n] = s ? s.querySelectorAll('.rmc-gl').length : -1; } return o; });
    for (let n = 20; n <= 27; n++) T(cont[n] >= 12, '@' + w + ' bloco ' + n + ': ' + cont[n] + ' glosas visíveis na página');
    const toque = sel => r.page.evaluate(s => { const g = document.querySelector(s + ' .rmc-gl'); g.scrollIntoView({ block: 'center' }); const d0 = g.classList.contains('on'); g.click(); const d1 = g.classList.contains('on'); g.click(); const d2 = g.classList.contains('on'); return { d0, d1, d2 }; }, sel);
    const nv = await toque('#neub21'), ant = await toque('#neub03');
    T(!nv.d0 && nv.d1 && !nv.d2, '@' + w + ' glosa nova (bloco 21): tocar abre ("on") e tocar de novo fecha');
    T(nv.d0 === ant.d0 && nv.d1 === ant.d1 && nv.d2 === ant.d2, '@' + w + ' mesmo comportamento de uma glosa dos blocos antigos (bloco 03)');
    const sh = await r.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    T(sh <= 1, '@' + w + ' sem rolagem horizontal (' + sh + ')');
    T(erros.length === 0, '@' + w + ' sem erro de página' + (erros[0] ? ': ' + erros[0] : ''));
    await r.page.context().close();
  }
  await br.close(); srv.close();
  console.log('\nneu-glosario-browser: ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
