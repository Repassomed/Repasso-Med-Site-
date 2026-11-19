/* Neurología · revisão 8-A.1-B (18/11): todas as perguntas, antes e depois de responder num navegador real (controle 1440 e 390): existem no bloco e no banco, respondem, sem erro de console. */
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
      const out = { itens: 0, mcq: 0, vf: 0, vis: 0, enf: 0, cor: 0, marc: 0, mcqOk: 0, vfOk: 0, falhas: [] };
      const todos = [...document.querySelectorAll('.quiz-item')].filter(e => /^(q|bq)-neu/.test(e.id));
      out.itens = todos.length;
      /* ANTES de qualquer interação: resposta oculta, nenhuma marca e nenhuma ênfase nas alternativas */
      for (const el of todos) {
        const an = el.querySelector('.answer'); const cs = an && getComputedStyle(an);
        if (an && cs.display !== 'none' && cs.visibility !== 'hidden' && an.offsetHeight > 0) { out.vis++; out.falhas.push('resposta visível antes de responder: ' + el.id); }
        if (el.classList.contains('answered') || el.querySelector('.correct,.wrong')) { out.marc++; out.falhas.push('marca antes de responder: ' + el.id); }
        const lis = [...el.querySelectorAll('ul.options > li, .interactive-options > li')];
        if (lis.some(li => li.querySelector('b,strong,i,em,mark,u'))) { out.enf++; out.falhas.push('ênfase nas alternativas: ' + el.id); }
        if (lis.length > 1) { const w = new Set(lis.map(li => getComputedStyle(li).fontWeight + '|' + getComputedStyle(li).color + '|' + getComputedStyle(li).backgroundColor)); if (w.size > 1) { out.cor++; out.falhas.push('estilo diferente entre alternativas: ' + el.id); } }
        const st = el.querySelector('.quiz-question'); if (el.querySelector('.tf-btn') && st && st.querySelector('b,strong,i,em')) { out.enf++; out.falhas.push('ênfase no V/F: ' + el.id); }
      }
      /* interação real: responder com a alternativa correta e conferir o retorno */
      for (const el of todos) {
        el.scrollIntoView({ block: 'center' });
        const lis = [...el.querySelectorAll('li[data-option]')];
        if (lis.length) {
          out.mcq++; const ans = el.querySelector('.answer strong'); const letra = ans ? ans.textContent.trim()[0].toLowerCase() : '';
          const li = lis.find(x => (x.dataset.option || '').toLowerCase() === letra); if (li) li.click();
          if (el.classList.contains('answered') && li && li.classList.contains('correct')) out.mcqOk++; else out.falhas.push('MCQ não respondeu: ' + el.id);
        } else if (el.querySelector('.tf-btn')) {
          out.vf++; const resp = el.querySelector('.answer strong').textContent.startsWith('VERDADERO') ? 'V' : 'F';
          const b = el.querySelector('.tf-btn[data-tf="' + resp + '"]'); b.click();
          if (el.classList.contains('answered') && b.classList.contains('correct')) out.vfOk++; else out.falhas.push('V/F não respondeu: ' + el.id);
        }
      }
      return out;
    });
    T(res.itens === 562, '@' + w + ' 562 itens (281 no bloco + 281 no banco): ' + res.itens);
    T(res.vis === 0, '@' + w + ' nenhuma resposta visível antes de responder (' + res.vis + ')');
    T(res.marc === 0, '@' + w + ' nenhuma marca de correta/errada antes de responder (' + res.marc + ')');
    T(res.enf === 0 && res.cor === 0, '@' + w + ' nenhuma ênfase/cor diferente nas alternativas nem no enunciado V/F (' + res.enf + '/' + res.cor + ')');
    T(res.mcqOk === res.mcq && res.vfOk === res.vf && res.mcq === 374 && res.vf === 140, '@' + w + ' todas respondem: MCQ ' + res.mcqOk + '/' + res.mcq + ' · V/F ' + res.vfOk + '/' + res.vf);
    if (res.falhas.length) console.log('   ', res.falhas.slice(0, 6).join(' | '));
    const sh = await r.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); T(sh <= 1, '@' + w + ' sem rolagem horizontal (' + sh + ')');
    T(erros.length === 0, '@' + w + ' sem erro de página' + (erros[0] ? ': ' + erros[0] : ''));
    await r.page.context().close();
  }
  await br.close(); srv.close();
  console.log('\nneu-8a1b-browser: ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
