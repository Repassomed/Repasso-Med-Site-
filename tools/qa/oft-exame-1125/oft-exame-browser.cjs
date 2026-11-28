/* Oftalmología · 14 preguntas de examen · NAVEGADOR na página REAL (layout de índice «nav» e página completa «controle»), 1440 e 390 px — SOMENTE LEITURA (servidor local; nenhuma escrita).
   Prova: a página abre sem erro; a capa e o banco mostram as contagens da página (209 no banco; as perguntas DISTINTAS dos blocos na capa); o índice tem os 8 blocos que ganharam perguntas com a contagem nova;
   navegar até cada bloco mostra as novas; «Ver respuesta» (toggleAnswer real) e V/F (checkTF real) funcionam NA página real, no bloco e no banco; sem rolagem horizontal.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/oft-exame-1125/oft-exame-browser.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright'); const L = require('../ensaio-layout/lib.cjs');
const REPO = path.resolve(__dirname, '../../..'); const F = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/oftalmologia.html';
const html = fs.readFileSync(path.join(REPO, F), 'utf8');
let ok = 0, bad = 0; const T = (c, m, x) => { if (c) { ok++; console.log('  ✓ ' + m); } else { bad++; console.log('  ✗ FALHA: ' + m + (x !== undefined ? ' → ' + JSON.stringify(x).slice(0, 400) : '')); } };
const NEW = []; for (let k = 196; k <= 209; k++) NEW.push('q-oft' + k);
const BLOCO = { ofb01: ['q-oft197'], ofb02: ['q-oft198'], ofb10: ['q-oft196'], ofb11: ['q-oft203', 'q-oft207', 'q-oft208'], ofb12: ['q-oft204'], ofb13: ['q-oft200', 'q-oft201', 'q-oft202'], ofb14: ['q-oft199'], ofb15: ['q-oft205', 'q-oft206', 'q-oft209'] };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'oftalmologia'); T(!!m, 'a matéria oftalmologia está entre as ativas do ensaio de layout');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const w of [1440, 390]) {
    const n = await L.abrir(br, base, m, { w, h: 900, modo: 'nav', corr: true }); const erros = []; n.page.on('pageerror', e => erros.push(String(e))); await n.page.waitForTimeout(3500);
    const ix = await n.page.evaluate(() => { const c = [...document.querySelectorAll('.rm-sis-card')].map(x => (x.getAttribute('data-rm-go') || '') + '|' + x.textContent.replace(/\s+/g, ' ').trim()); const res = Object.fromEntries([...document.querySelectorAll('.rm-l2-rescard')].map(x => [x.className.replace(/.*rm-l2-rescard--(\w+).*/, '$1'), x.getAttribute('data-rm-n')])); return { c, res, quizDom: document.querySelectorAll('.quiz-item').length, sh: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    const banco = ix.c.find(x => x.startsWith('bancooft|')) || ''; T(/209 preguntas/.test(banco), `@${w} o índice mostra o banco com 209 preguntas`, banco);
    T(ix.quizDom === 418, `@${w} DOM: 418 itens de pergunta (209 nos blocos + 209 no banco)`, ix.quizDom);
    const esperado = { ofb01: 20, ofb02: 16, ofb10: 9, ofb11: 11, ofb12: 9, ofb13: 11, ofb14: 9, ofb15: 11 }; const falhas = [];
    for (const [b, q] of Object.entries(esperado)) { const c = ix.c.find(x => x.startsWith(b + '|')) || ''; if (!new RegExp('(^|\\D)' + q + ' preguntas').test(c)) falhas.push([b, q, c.slice(0, 80)]); }
    T(!falhas.length, `@${w} o índice mostra a contagem nova dos 8 blocos que ganharam perguntas`, falhas);
    T(Number(ix.res.quiz) >= 200 && Number(ix.res.quiz) <= 209, `@${w} a capa conta as perguntas distintas dos blocos (${ix.res.quiz}; ≤ 209 porque a capa não conta repetidas)`, ix.res);
    T(ix.sh <= 1, `@${w} sem rolagem horizontal (${ix.sh})`);
    /* navegar até cada bloco e usar as perguntas novas NA página real */
    const r = await n.page.evaluate(async (blocos) => {
      const out = { mc: 0, vf: 0, falhas: [] };
      for (const [b, ids] of Object.entries(blocos)) {
        RMNav.go({ view: 'block', block: b }); await new Promise(r => setTimeout(r, 900)); const s = document.getElementById(b); if (!s || s.getBoundingClientRect().height <= 0) { out.falhas.push(b + ':bloco invisível'); continue; }
        for (const id of ids) { const el = document.getElementById(id); if (!el) { out.falhas.push(id + ':ausente'); continue; }
          const ans = el.querySelector('.answer'); const lis = [...el.querySelectorAll('.interactive-options li[data-option]')];
          if (lis.length) { /* MCQ: o app-core a converte em opções clicáveis com data-correct */
            const letra = /^([a-e])\)/i.exec(ans.querySelector('strong').textContent.trim())[1].toLowerCase(); const esperadas = /^q-oft(196|197)$/.test(id) ? 5 : 4;
            if (el.dataset.correct !== letra || lis.length !== esperadas) { out.falhas.push(id + ':data-correct=' + el.dataset.correct + ' letra=' + letra + ' opções=' + lis.length); continue; }
            lis.find(l => l.dataset.option === letra).click(); const fb = el.querySelector('.quiz-feedback'); if (fb && fb.classList.contains('correct') && el.classList.contains('answered')) out.mc++; else out.falhas.push(id + ':mc-certo');
            el.classList.remove('answered'); el.querySelectorAll('li').forEach(l => l.classList.remove('correct', 'wrong')); if (fb) fb.remove();
            const errada = lis.find(l => l.dataset.option !== letra); errada.click(); const f2 = el.querySelector('.quiz-feedback'); if (!(f2 && f2.classList.contains('wrong') && errada.classList.contains('wrong'))) out.falhas.push(id + ':mc-errada'); }
          else { const verdad = /^VERDADERO\./.test(ans.textContent.trim()); const certo = [...el.querySelectorAll('.tf-btn')].find(x => x.textContent.trim().toUpperCase() === (verdad ? 'VERDADERO' : 'FALSO')); if (!certo) { out.falhas.push(id + ':sem botões'); continue; } certo.click(); const fb = el.querySelector('.quiz-feedback'); if (fb && fb.classList.contains('correct')) out.vf++; else out.falhas.push(id + ':vf'); } }
      }
      return out; }, BLOCO);
    T(r.mc === 11 && r.vf === 3 && !r.falhas.length, `@${w} navegando até cada bloco: 11 MCQ (opção certa → «¡CORRECTO!», errada → «¡INCORRECTO!»; data-correct = letra da explicação; 5 alternativas nas de 5) e 3 V/F das novas funcionam na página real`, r);
    const rb = await n.page.evaluate(async () => { RMNav.go({ view: 'block', block: 'bancooft' }); await new Promise(r => setTimeout(r, 1500)); const out = { n: 0, falhas: [] };
      for (let k = 196; k <= 209; k++) { const el = document.getElementById('bq-oft' + k); if (!el) { out.falhas.push('bq-oft' + k); continue; } out.n++; const lis = el.querySelectorAll('.interactive-options li[data-option]'); if (!lis.length && !el.querySelectorAll('.tf-btn').length) out.falhas.push('bq-oft' + k + ':sem interação'); else if (lis.length) { const letra = /^([a-e])\)/i.exec(el.querySelector('.answer strong').textContent.trim())[1].toLowerCase(); if (el.dataset.correct !== letra) out.falhas.push('bq-oft' + k + ':data-correct'); } }
      return out; });
    T(rb.n === 14 && !rb.falhas.length, `@${w} no banco geral as 14 estão presentes, interativas, e o data-correct das MCQ coincide com a letra da explicação`, rb);
    T(erros.length === 0, `@${w} sem erro de página (layout de índice)` + (erros[0] ? ': ' + erros[0] : '')); await n.page.context().close();
    const c = await L.abrir(br, base, m, { w, h: 900, modo: 'controle', corr: true }); const e2 = []; c.page.on('pageerror', e => e2.push(String(e))); await c.page.waitForTimeout(2500);
    const v = await c.page.evaluate((ids) => ids.every(id => document.getElementById(id) && document.getElementById('b' + id)), NEW); T(v && e2.length === 0, `@${w} página completa (modo controle): as 14 existem no bloco e no banco e não há erro de página`, e2); await c.page.context().close();
  }
  await br.close(); srv.close(); console.log(`\noft-exame-1125 (navegador): ${ok}/${ok + bad}${bad ? ' — ' + bad + ' FALHAS' : ' OK'}`); process.exit(bad ? 1 : 0);
})();
