/* Toxicología · V/F no navegador real (1440 e 390): para CADA V/F (bloco e banco) clica em VERDADERO numa carga e em FALSO noutra.
   O veredito certo recebe «correct»; o clique errado recebe «wrong»; o aviso diz «¡CORRECTO!»/«¡INCORRECTO!»; a explicação aparece.
   Confere ainda, para q-b08q07 (bloco e banco), o enunciado novo («cuadro anticoagulante y fibrinolítico») e os dois botões.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/toxicologia-fotos/vf-browser.cjs */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
let ok = 0, bad = 0; const T = (c, m) => { if (c) { ok++; console.log('  ✓', m); } else { bad++; console.log('  ✗ FALHA:', m); } };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'toxicologia');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const w of [1440, 390]) for (const clique of ['V', 'F']) {
    const r = await L.abrir(br, base, m, { w, h: 900, modo: 'controle', corr: true });
    const erros = []; r.page.on('pageerror', e => erros.push(String(e))); await r.page.waitForTimeout(2500);
    const res = await r.page.evaluate((clique) => {
      const out = { n: 0, ok: 0, falhas: [], q07: [] };
      const todos = [...document.querySelectorAll('.quiz-item')].filter(e => /^q-b\d\dq\d\d(-bk)?$/.test(e.id) && e.querySelector('.tf-btn'));
      for (const el of todos) {
        out.n++; el.scrollIntoView({ block: 'center' });
        const certo = el.querySelector('.answer strong').textContent.trim().startsWith('VERDADERO') ? 'V' : 'F';
        const enun = el.querySelector('.quiz-question').textContent;
        const b = el.querySelector('.tf-btn[data-tf="' + clique + '"]'); const outro = el.querySelector('.tf-btn[data-tf="' + (clique === 'V' ? 'F' : 'V') + '"]');
        b.click();
        const acertou = clique === certo, bCerto = acertou ? b : outro;
        const fb = el.querySelector('.quiz-feedback');
        const bom = el.classList.contains('answered') && bCerto.classList.contains('correct') && (acertou ? fb.classList.contains('correct') && !b.classList.contains('wrong') : fb.classList.contains('wrong') && b.classList.contains('wrong')) && new RegExp(certo === 'V' ? 'VERDADERO' : 'FALSO').test(fb.textContent);
        if (bom) out.ok++; else out.falhas.push(el.id + ' (clique ' + clique + ', certo ' + certo + ')');
        if (/^q-b08q07(-bk)?$/.test(el.id)) out.q07.push({ id: el.id, certo, bom, novo: /cuadro anticoagulante y fibrinol/.test(enun) && !/mecanismo de acci/.test(enun) });
      }
      return out;
    }, clique);
    await r.page.waitForTimeout(1200);
    const dep = await r.page.evaluate(() => [...document.querySelectorAll('.quiz-item')].filter(e => /^q-b\d\dq\d\d(-bk)?$/.test(e.id) && e.querySelector('.tf-btn')).filter(el => { const an = el.querySelector('.answer'); return an.classList.contains('show') && getComputedStyle(an).display !== 'none' && an.offsetHeight > 0; }).length);
    const tag = '@' + w + ' clique ' + (clique === 'V' ? 'VERDADERO' : 'FALSO');
    T(res.n === 70 && res.ok === 70, tag + ': 70 V/F (35 no bloco + 35 no banco), veredito certo e clique errado marcados: ' + res.ok + '/' + res.n);
    T(dep === res.n, tag + ': a explicación aparece en todos (' + dep + '/' + res.n + ')');
    T(res.q07.length === 2 && res.q07.every(x => x.certo === 'V' && x.bom && x.novo), tag + ': q-b08q07 (bloco e banco): enunciado novo, gabarito VERDADERO, botão ' + (clique === 'V' ? 'VERDADERO acerta' : 'FALSO erra e mostra VERDADERO'));
    if (res.falhas.length) console.log('   ', res.falhas.slice(0, 6).join(' | '));
    T(erros.length === 0, tag + ': sem erro de página' + (erros[0] ? ': ' + erros[0] : ''));
    await r.page.context().close();
  }
  await br.close(); srv.close();
  console.log('\ntoxicologia-fotos vf-browser: ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
