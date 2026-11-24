/* Neurología · V/F no navegador real (1440 e 390): para CADA V/F (bloco e banco) clica em VERDADERO numa carga e em FALSO noutra.
   O veredito certo recebe «correct»; o clique errado recebe «wrong»; o aviso diz «¡CORRECTO!»/«¡INCORRECTO!» conforme o clique; a explicação aparece e começa pelo veredito certo. */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
let ok = 0, bad = 0; const T = (c, m) => { if (c) { ok++; console.log('  ✓', m); } else { bad++; console.log('  ✗ FALHA:', m); } };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'neurologia');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const w of [1440, 390]) for (const clique of ['V', 'F']) {
    const r = await L.abrir(br, base, m, { w, h: 900, modo: 'controle', corr: true });
    const erros = []; r.page.on('pageerror', e => erros.push(String(e))); await r.page.waitForTimeout(2500);
    const res = await r.page.evaluate((clique) => {
      const out = { n: 0, ok: 0, falhas: [] };
      const todos = [...document.querySelectorAll('.quiz-item')].filter(e => /^(q|bq)-neu/.test(e.id) && e.querySelector('.tf-btn'));
      for (const el of todos) {
        out.n++; el.scrollIntoView({ block: 'center' });
        const certo = el.querySelector('.answer strong').textContent.trim().startsWith('VERDADERO') ? 'V' : 'F';
        const b = el.querySelector('.tf-btn[data-tf="' + clique + '"]'); const outro = el.querySelector('.tf-btn[data-tf="' + (clique === 'V' ? 'F' : 'V') + '"]');
        b.click();
        const acertou = clique === certo, bCerto = acertou ? b : outro;
        const fb = el.querySelector('.quiz-feedback');
        if (el.classList.contains('answered') && bCerto.classList.contains('correct') && (acertou ? fb.classList.contains('correct') && !b.classList.contains('wrong') : fb.classList.contains('wrong') && b.classList.contains('wrong')) && new RegExp((certo === 'V' ? 'VERDADERO' : 'FALSO')).test(fb.textContent)) out.ok++; else out.falhas.push(el.id + ' (clique ' + clique + ', certo ' + certo + ')');
      }
      return out;
    }, clique);
    await r.page.waitForTimeout(1200);
    const dep = await r.page.evaluate(() => [...document.querySelectorAll('.quiz-item')].filter(e => /^(q|bq)-neu/.test(e.id) && e.querySelector('.tf-btn')).filter(el => { const an = el.querySelector('.answer'); return an.classList.contains('show') && getComputedStyle(an).display !== 'none' && an.offsetHeight > 0; }).length);
    const tag = '@' + w + ' clique ' + (clique === 'V' ? 'VERDADERO' : 'FALSO');
    T(res.n === 138 && res.ok === 138, tag + ': 138 V/F (bloco + banco), veredito certo marcado e clique errado marcado «wrong»: ' + res.ok + '/' + res.n);
    T(dep === res.n, tag + ': a explicação aparece em todos (' + dep + '/' + res.n + ')');
    if (res.falhas.length) console.log('   ', res.falhas.slice(0, 6).join(' | '));
    T(erros.length === 0, tag + ': sem erro de página' + (erros[0] ? ': ' + erros[0] : ''));
    await r.page.context().close();
  }
  await br.close(); srv.close();
  console.log('\nneu-vf-browser: ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
