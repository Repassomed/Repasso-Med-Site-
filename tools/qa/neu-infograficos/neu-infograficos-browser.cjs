/* Neurología · PR #682 · infográficos novos + grifos + perguntas + negrito, tudo junto no navegador (Chromium, layout atual, 1440 e 390 px).
   Grifos SINTÉTICOS (nenhum dado de aluno): 1 por bloco em neub20–neub25 (onde já existem grifos reais), ancorados por texto + prefixo/sufixo + ocorrência, como o motor real.
   Prova: (1) cada grifo pinta EXATAMENTE o texto pedido (não deslocou); (2) as 13 figuras existem, carregam (inclusive a b25-02 corrigida), o contêiner de ampliação (.rmc-zoom, com rolagem interna no celular) cabe na tela e ficam NO FIM do bloco, depois dos flashcards;
   (3) responder perguntas (MCQ e V/F) nos mesmos blocos não altera nem apaga os grifos; (4) alternativas e enunciados V/F sem negrito/cor/itálico (negrito que revelava a resposta);
   (5) sem rolagem horizontal e sem erro de página.   Uso: NODE_PATH=$(npm root -g) node tools/qa/neu-infograficos/neu-infograficos-browser.cjs */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs'); const D = require('../pre-voo/lib-dados.cjs');
let ok = 0, bad = 0; const T = (c, m, x) => { if (c) { ok++; console.log('  ✓', m); } else { bad++; console.log('  ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 300) : ''); } };
const BLOCOS = ['neub20', 'neub21', 'neub22', 'neub23', 'neub24', 'neub25'];
const FIGS = { neub20: 2, neub21: 2, neub22: 1, neub23: 1, neub24: 2, neub25: 2, neub26: 1, neub27: 2 };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'neurologia');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const w of [1440, 390]) {
    /* 1 · monta os grifos sintéticos a partir do texto real de cada bloco e recarrega a página com eles (mesmo caminho do harness real) */
    const rr = await L.abrir(br, base, m, { w, h: 900, modo: 'controle', corr: true, extra: '&persist=1' }); await rr.page.waitForTimeout(2500);
    const rows = await rr.page.evaluate(([ids, uid]) => ids.map((id, i) => {
      const s = document.getElementById(id); const norm = s.textContent.replace(/\s+/g, ' ');
      const els = [...s.querySelectorAll('p,li')].filter(e => !e.closest('[data-rm-ui],.quiz-item,.flashcard,table,figure,.rmc-gl,.rmc-gl-close') && !e.querySelector('.rmc-gl') && e.textContent.replace(/\s+/g, ' ').trim().length > 90);
      for (const e of els) {
        const w = e.textContent.replace(/\s+/g, ' ').trim().split(' '); if (w.length < 14) continue;
        const ex = w.slice(3, 9).join(' '); const at = norm.indexOf(ex); if (at < 0 || norm.indexOf(ex, at + 1) >= 0) continue;   // só texto único no bloco
        return { id: 'sint-' + i, user_id: uid, subject_slug: 'neurologia', block_id: id, exact_text: ex, prefix: norm.slice(Math.max(0, at - 40), at), suffix: norm.slice(at + ex.length, at + ex.length + 40), occurrence: 0, color: 'yellow' };
      }
      return null;
    }), [BLOCOS, D.UID]);
    T(rows.every(Boolean) && rows.length === 6, '@' + w + ' 6 grifos sintéticos montados (1 por bloco, texto único no bloco)', rows.map(x => !!x));
    await rr.page.evaluate(R => { sessionStorage.setItem('ens.user_highlights', JSON.stringify(R)); window.__writes = []; }, rows);
    await rr.page.goto(rr.page.url(), { timeout: 120000 }); await rr.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await rr.page.waitForTimeout(2500);
    const erros = []; rr.page.on('pageerror', e => erros.push(String(e))); await rr.page.waitForTimeout(3000);
    const pintar = () => rr.page.evaluate(ids => Object.fromEntries(ids.map(id => [id, [...document.getElementById(id).querySelectorAll('span.rm-hl')].map(e => e.textContent).join('')])), BLOCOS);
    const antes = await pintar();
    BLOCOS.forEach((id, i) => T(antes[id] === rows[i].exact_text, '@' + w + ' ' + id + ': o grifo pinta exatamente o texto pedido', { pintou: antes[id], pedido: rows[i].exact_text }));
    /* 2 · figuras: existem, carregam, cabem na tela e ficam no fim do bloco */
    const fig = await rr.page.evaluate(async fm => {
      const out = [];
      for (const [id, n] of Object.entries(fm)) {
        const sec = document.getElementById(id); const figs = [...sec.querySelectorAll('figure.rmc-fig')]; sec.scrollIntoView(); figs.forEach(f => { const i = f.querySelector('img'); i.loading = 'eager'; });
        await new Promise(r => setTimeout(r, 400));
        const kids = [...sec.children]; const ultimo = kids.slice(-figs.length).every(k => k.matches && k.matches('figure.rmc-fig'));
        const fc = sec.querySelector('.flashcard'); const depois = !fc || figs.every(f => !!(fc.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING));
        out.push({ id, n: figs.length, esperado: n, quebradas: figs.filter(f => { const i = f.querySelector('img'); return i.complete && i.naturalWidth === 0; }).length, largas: figs.filter(f => f.querySelector('.rmc-zoom').getBoundingClientRect().right > innerWidth + 2).length, ultimo, depois });
      }
      return out;
    }, FIGS);
    for (const f of fig) T(f.n === f.esperado && f.quebradas === 0 && f.largas === 0 && f.ultimo && f.depois, '@' + w + ' ' + f.id + ': ' + f.n + ' figura(s), 0 quebradas, contêiner de ampliação dentro da tela, no fim do bloco depois dos flashcards', f);
    const carregadas = await rr.page.evaluate(async () => { const imgs = [...document.querySelectorAll('figure.rmc-fig img')].filter(i => /neuro-b2\d-0\d-/.test(i.getAttribute('src'))); imgs.forEach(i => { i.loading = 'eager'; }); await new Promise(r => setTimeout(r, 2500)); return { n: imgs.length, ok: imgs.filter(i => i.complete && i.naturalWidth === 1024 && i.naturalHeight === 1536).length }; });
    T(carregadas.n === 13 && carregadas.ok === 13, '@' + w + ' as 13 imagens carregam em 1024×1536 (' + carregadas.ok + '/' + carregadas.n + ')', carregadas);
    /* 3 · responder perguntas nos blocos com grifo não altera os grifos */
    const resp = await rr.page.evaluate(async ids => {
      let mcq = 0, vf = 0, certas = 0;
      for (const id of ids) {
        const sec = document.getElementById(id); const its = [...sec.querySelectorAll('.quiz-item')].filter(e => /^q-neu/.test(e.id)).slice(0, 4);
        for (const el of its) {
          el.scrollIntoView({ block: 'center' });
          const lis = [...el.querySelectorAll('li[data-option]')];
          if (lis.length) { mcq++; const a = el.querySelector('.answer strong'); const l = a ? a.textContent.trim()[0].toLowerCase() : ''; const li = lis.find(x => (x.dataset.option || '').toLowerCase() === l); if (li) { li.click(); if (li.classList.contains('correct')) certas++; } }
          else if (el.querySelector('.tf-btn')) { vf++; const v = el.querySelector('.answer strong').textContent.startsWith('VERDADERO') ? 'V' : 'F'; const b = el.querySelector('.tf-btn[data-tf="' + v + '"]'); b.click(); if (b.classList.contains('correct')) certas++; }
        }
      }
      await new Promise(r => setTimeout(r, 1200)); return { mcq, vf, certas };
    }, BLOCOS);
    T(resp.mcq + resp.vf >= 20 && resp.certas === resp.mcq + resp.vf, '@' + w + ' perguntas respondidas nos 6 blocos (' + resp.mcq + ' MCQ + ' + resp.vf + ' V/F): todas respondem certo (' + resp.certas + ')', resp);
    const depois = await pintar();
    BLOCOS.forEach((id, i) => T(depois[id] === antes[id] && depois[id] === rows[i].exact_text, '@' + w + ' ' + id + ': o grifo continua igual depois de responder perguntas'));
    /* 4 · negrito: alternativas e enunciados V/F sem ênfase nos mesmos blocos */
    const neg = await rr.page.evaluate(ids => { let enf = 0, tot = 0; for (const id of ids) for (const el of document.getElementById(id).querySelectorAll('.quiz-item')) { tot++; if ([...el.querySelectorAll('ul.options > li, .interactive-options > li')].some(li => li.querySelector('b,strong,i,em,mark,u'))) enf++; const q = el.querySelector('.quiz-question'); if (el.querySelector('.tf-btn') && q && q.querySelector('b,strong,i,em')) enf++; } return { enf, tot }; }, BLOCOS);
    T(neg.tot > 0 && neg.enf === 0, '@' + w + ' ' + neg.tot + ' perguntas dos blocos 20–25 sem negrito/ênfase que revele a resposta (' + neg.enf + ')', neg);
    const sh = await rr.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); T(sh <= 1, '@' + w + ' sem rolagem horizontal (' + sh + ')');
    T(erros.length === 0, '@' + w + ' sem erro de página' + (erros[0] ? ': ' + erros[0] : ''));
    await rr.page.context().close();
  }
  await br.close(); srv.close();
  console.log('\nneu-infograficos-browser: ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);
})();
