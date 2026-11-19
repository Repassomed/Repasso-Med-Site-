/* Neurología · issue #667 · blocos 20 a 27 — teste no navegador (Chromium), local, somente leitura (harness do ensaio: Supabase simulado, zero rede externa).
   Modo «controle» (como o site serve hoje: 1440 e 390 px) e «nav» (layout novo, só em memória: 1440 e 768 px).
   Verifica: os 8 blocos existem e abrem; contagem de perguntas e flashcards; cada MCQ revela a resposta e cada V/F corrige ao toque; tabelas sem estourar a tela; sem rolagem horizontal; imagens sem quebra;
   sem erro de console/página; contagens declaradas visíveis no banco. Uso: NODE_PATH=$(npm root -g) node tools/qa/neuro-667/neuro-667-browser.cjs */
'use strict';
const L = require('../ensaio-layout/lib.cjs');
const res = []; const ok = (w, modo, nome, c, det) => { res.push({ ok: !!c }); console.log((c ? 'PASSA ' : 'FALHA ') + modo + ' @' + w + ' ' + nome + (det !== undefined && !c ? ' → ' + JSON.stringify(det).slice(0, 300) : '')); };
const BLOCOS = {neub20: 10, neub21: 13, neub22: 7, neub23: 6, neub24: 7, neub25: 7, neub26: 7, neub27: 15}; /* atualizado em 18/11: #683 e #687 acrescentaram perguntas aos blocos 20–27 */
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.servir({}); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const m = L.reconciliar().ativas.find(x => x.slug === 'neurologia');
  for (const [modo, W] of [['controle', 1440], ['controle', 390], ['nav', 1440], ['nav', 768]]) {
    const r = await L.abrir(br, base, m, { w: W, h: ({ 390: 844, 768: 1024, 1440: 900 })[W], modo, espera: 800 }); const p = r.page; const erros = [];
    p.on('pageerror', e => erros.push(String(e).slice(0, 160))); p.on('console', c => { if (c.type() === 'error' && !/favicon|ERR_FAILED|net::/.test(c.text())) erros.push(c.text().slice(0, 160)); });
    const D = await p.evaluate(B => Object.fromEntries(Object.keys(B).map(id => { const s = document.getElementById(id); return [id, s ? { q: s.querySelectorAll('.quiz-item').length, fc: s.querySelectorAll('.flashcard').length, h2: (s.querySelector('h2') || {}).textContent, tab: s.querySelectorAll('table').length, imgs: [...s.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).length } : null]; })), BLOCOS);
    ok(W, modo, 'os 8 blocos novos existem com título', Object.values(D).every(x => x && x.h2), D);
    ok(W, modo, 'perguntas por bloco = ' + JSON.stringify(BLOCOS), Object.keys(BLOCOS).every(id => D[id] && D[id].q === BLOCOS[id]), Object.fromEntries(Object.keys(D).map(i => [i, D[i] && D[i].q])));
    ok(W, modo, 'cada bloco novo tem tabelas e ≥ 5 flashcards; nenhuma imagem quebrada', Object.values(D).every(x => x && x.tab >= 1 && x.fc >= 5 && x.imgs === 0), D);
    const B = await p.evaluate(() => { const t = (document.getElementById('banconeu').textContent || '').replace(/\s+/g, ' '); const N = (t.match(/Las (\d+) preguntas/) || [])[1]; return { stats: ['Las ' + N + ' preguntas', '27Bloques', '387Flashcards', N + 'Preguntas'].map(s => t.replace(/\s+/g, ' ').includes(s) || t.replace(/\s+/g, '').includes(s.replace(/\s+/g, ''))), bq: document.querySelectorAll('#banconeu .quiz-item').length }; });
    ok(W, modo, 'banco declara o total atual de perguntas · 27 blocos · 387 flashcards e lista todas', B.stats.every(Boolean) && B.bq >= 232, B);
    /* interação (só no controle): cada MCQ revela a resposta; cada V/F corrige ao toque */
    if (modo === 'controle') {
      const I = await p.evaluate(async () => { const out = { mcq: 0, mcqOk: 0, vf: 0, vfOk: 0, ruins: [] };
        for (const id of ['neub20', 'neub21', 'neub22', 'neub23', 'neub24', 'neub25', 'neub26', 'neub27']) {
          for (const q of document.getElementById(id).querySelectorAll('.quiz-item')) {
            const ans = q.querySelector('.answer'); const tf = q.querySelectorAll('.tf-btn');
            if (tf.length === 0 && q.querySelector('li[data-option]')) { out.mcq++; const forte = (ans.querySelector('strong') || {}).textContent || ''; const letra = (forte.match(/^([a-d])\)/) || [])[1];
              const opt = q.querySelector('li[data-option="' + letra + '"]'); const txt = opt ? opt.textContent.replace(/^[a-dA-D]\)\s*/, '').trim() : '';
              if (!opt) { out.ruins.push(q.id); continue; } opt.click(); await new Promise(r => setTimeout(r, 200));
              if (q.classList.contains('answered') && opt.classList.contains('correct') && q.getAttribute('data-correct') === letra && forte.replace(/^[a-d]\)\s*/, '').trim() === txt) out.mcqOk++; else out.ruins.push(q.id); }
            else if (tf.length) { out.vf++; const veredito = (ans.querySelector('strong') || {}).textContent || ''; const certo = /^VERDADERO/.test(veredito) ? 'V' : 'F';
              const bt = [...tf].find(b => b.getAttribute('data-tf') === certo); if (!bt) { out.ruins.push(q.id); continue; } bt.click(); await new Promise(r => setTimeout(r, 200));
              if (tf.length === 2 && q.classList.contains('answered') && /^(VERDADERO|FALSO)\./.test(veredito)) out.vfOk++; else out.ruins.push(q.id); } } } return out; });
      ok(W, modo, 'MCQ: tocar na alternativa certa marca «correct», a pergunta fica «answered», data-correct = letra da explicação e o texto da resposta = a alternativa (' + I.mcqOk + '/' + I.mcq + ')', I.mcq > 0 && I.mcqOk === I.mcq, I.ruins);
      ok(W, modo, 'V/F: tocar no veredito correto deixa a pergunta «answered» e o veredito da explicação coincide (' + I.vfOk + '/' + I.vf + ')', I.vf > 0 && I.vfOk === I.vf, I.ruins);
      const F = await p.evaluate(() => { const r = { n: 0, c: 0, mazo: null, det: [] }; for (const id of ['neub20', 'neub21', 'neub22', 'neub23', 'neub24', 'neub25', 'neub26', 'neub27']) { const sec = document.getElementById(id); const cap = sec.querySelector('.rmfc-launch'); const nF = sec.querySelectorAll('.flashcard').length; r.n++; const meta = cap ? (cap.querySelector('.rmfc-cover-meta') || {}).textContent || '' : ''; if (cap && cap.getBoundingClientRect().height > 40 && meta.replace(/\D+/g, ' ').trim().split(' ').pop() === String(nF) || (cap && new RegExp('Bloque \\d+' + nF + ' cartas').test(meta))) r.c++; else r.det.push([id, meta, nF]); }
        const mz = document.getElementById('revisaoneu').querySelector('.rmfc-launch'); r.mazo = mz ? mz.textContent.replace(/\s+/g, ' ') : null; return r; });
      ok(W, modo, 'cada bloco novo mostra a capa do mazo («Flashcards · Bloque NN» com a contagem certa de cartas) e o botão Jugar: ' + F.c + '/' + F.n, F.n === 8 && F.c === 8, F.det);
      ok(W, modo, 'mazo general do cierre mostra 387 cartas', F.mazo && /387 cartas/.test(F.mazo), F.mazo);
    }
    const O = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    ok(W, modo, 'sem rolagem horizontal da página', O.sw <= O.vw + 1, O);
    const T = await p.evaluate(() => { const bad = []; for (const id of ['neub20', 'neub21', 'neub22', 'neub23', 'neub24', 'neub25', 'neub26', 'neub27']) for (const t of document.getElementById(id).querySelectorAll('table')) { const sc = t.closest('.rmc-scroll'); const w = (sc || t).getBoundingClientRect().width; if (!sc || w > document.documentElement.clientWidth + 1) bad.push(id); } return bad; });
    ok(W, modo, 'toda tabela nova está dentro de um contêiner rolável (rmc-scroll) que cabe na tela', T.length === 0, T);
    ok(W, modo, 'sem erro de página/console', erros.length === 0, erros);
    await p.context().close().catch(() => {});
  }
  await br.close(); srv.close();
  const n = res.length, ko = res.filter(x => !x.ok).length; console.log('\nTOTAL ' + n + ' · PASSA ' + (n - ko) + ' · FALHA ' + ko); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
