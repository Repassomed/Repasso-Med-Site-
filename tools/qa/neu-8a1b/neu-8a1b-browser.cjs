/* Neurología · revisão 8-A.1-B (18/11): 7 novas + 7 reformuladas num navegador real (controle 1440 e 390): existem no bloco e no banco, respondem, sem erro de console. */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
let ok = 0, bad = 0; const T = (c, m) => { if (c) { ok++; console.log('  ✓', m); } else { bad++; console.log('  ✗ FALHA:', m); } };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'neurologia');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const w of [1440, 390]) {
    const r = await L.abrir(br, base, m, { w, h: 900, modo: 'controle', corr: true });
    const erros = []; r.page.on('pageerror', e => erros.push(String(e))); await r.page.waitForTimeout(2500);
    const res = await r.page.evaluate(() => {
      const out = { blocos: 0, banco: 0, mcq: 0, mcqOk: 0, vf: 0, vfOk: 0, def: 0, defOk: 0 };
      for (const n of ['233','234','249','250','251','252','253','254','255','256','257','090','091','135','181','224']) {
        const id = 'q-neu' + n; const el = document.getElementById(id), eb = document.getElementById('b' + id);
        if (el) out.blocos++; if (eb) out.banco++;
        if (!el) continue; el.scrollIntoView({ block: 'center' });
        const lis = [...el.querySelectorAll('li[data-option]')];
        if (lis.length) {
          out.mcq++; const ans = el.querySelector('.answer strong'); const letra = ans ? ans.textContent.trim()[0] : '';
          const li = lis.find(x => (x.textContent.trim()[0] || '').toLowerCase() === letra); if (li) li.click();
          const marcado = el.classList.contains('answered') || (li && (li.classList.contains('correct') || li.classList.contains('answered')));
          if (marcado) out.mcqOk++;
        } else if (el.querySelector('.tf-btn')) {
          out.vf++; const resp = el.querySelector('.answer strong').textContent.startsWith('VERDADERO') ? 'V' : 'F';
          const b = el.querySelector('.tf-btn[data-tf="' + resp + '"]'); b.click();
          if (el.classList.contains('answered') || b.classList.contains('correct') || [...el.querySelectorAll('.tf-btn')].some(x => x.disabled || x.classList.contains('correct') || x.classList.contains('answered'))) out.vfOk++;
        } else { out.def++; const bt = el.querySelector('.reveal-btn'); if (bt) { bt.click(); const an = el.querySelector('.answer'); if (an && (an.classList.contains('show') || an.classList.contains('open') || getComputedStyle(an).display !== 'none')) out.defOk++; } }
      }
      return out;
    });
    T(res.blocos === 16 && res.banco === 16, '@' + w + ' as 16 existem no bloco e no banco (' + res.blocos + '/' + res.banco + ')');
    T(res.mcq === 13 && res.mcqOk === 13, '@' + w + ' 13 MCQ respondem (marcam correta/respondida): ' + res.mcqOk + '/' + res.mcq);
    T(res.vf === 3 && res.vfOk === 3, '@' + w + ' 3 V/F respondem: ' + res.vfOk + '/' + res.vf);
    const sh = await r.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); T(sh <= 1, '@' + w + ' sem rolagem horizontal (' + sh + ')');
    T(erros.length === 0, '@' + w + ' sem erro de página' + (erros[0] ? ': ' + erros[0] : ''));
    await r.page.context().close();
  }
  await br.close(); srv.close();
  console.log('\nneu-8a1b-browser: ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
