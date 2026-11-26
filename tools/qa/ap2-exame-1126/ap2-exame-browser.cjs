/* Anatomía Patológica II · 9 inserciones de examen · NAVEGADOR en la página REAL (índice «nav» y página completa «controle»), 1440 y 390 px — SOLO LECTURA (servidor local).
   Prueba: la página abre sin error; DOM = 464 ítems (232 + 232); el índice muestra el banco con 232 preguntas y los bloques 04–07 con 27/27/26/40; en cada bloque y en el banco están las 9 inserciones
   y «Ver respuesta» (toggleAnswer real) muestra la respuesta; la MCQ (adenoma hepático) funciona como opción interactiva con data-correct = letra; sin scroll horizontal.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ap2-exame-1126/ap2-exame-browser.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright'); const L = require('../ensaio-layout/lib.cjs');
let ok = 0, bad = 0; const T = (c, m, x) => { if (c) { ok++; console.log('  ✓ ' + m); } else { bad++; console.log('  ✗ FALLA: ' + m + (x !== undefined ? ' → ' + JSON.stringify(x).slice(0, 400) : '')); } };
const STEMS = { ap2b04: ['Completá: el linfoma MALT gástrico nace', 'Citá dos indicadores pronósticos del adenocarcinoma gástrico'], ap2b05: ['Completá: el anticuerpo que se asocia con más frecuencia'], ap2b06: ['Citá la edad media de presentación', 'Citá los hallazgos microscópicos característicos de un pólipo de Peutz-Jeghers', 'Citá dos hallazgos microscópicos del pólipo juvenil'], ap2b07: ['Citá dos alteraciones secundarias', 'Completá: la citocina que impulsa la fibrogénesis', 'Caso reconstruido de prueba'] };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'anatomia-patologica-ii'); T(!!m, 'la materia anatomia-patologica-ii está entre las activas del ensayo de layout');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const w of [1440, 390]) {
    const n = await L.abrir(br, base, m, { w, h: 900, modo: 'nav', corr: true }); const errores = []; n.page.on('pageerror', e => errores.push(String(e))); await n.page.waitForTimeout(3500);
    const ix = await n.page.evaluate(() => ({ c: [...document.querySelectorAll('.rm-sis-card')].map(x => (x.getAttribute('data-rm-go') || '') + '|' + x.textContent.replace(/\s+/g, ' ').trim()), quizDom: document.querySelectorAll('.quiz-item').length, sh: document.documentElement.scrollWidth - innerWidth }));
    T(ix.quizDom === 464, `@${w} DOM: 464 ítems de pregunta (232 + 232)`, ix.quizDom);
    const banco = ix.c.find(x => x.startsWith('bancoap2|')) || ''; T(/232 preguntas/.test(banco), `@${w} el índice muestra el banco con 232 preguntas`, banco.slice(0, 120));
    const esp = { ap2b04: 27, ap2b05: 27, ap2b06: 26, ap2b07: 40 }; const falla = [];
    for (const [b, q] of Object.entries(esp)) { const c = ix.c.find(x => x.startsWith(b + '|')) || ''; if (!new RegExp('(^|\\D)' + q + ' preguntas').test(c)) falla.push([b, q, c.slice(0, 90)]); }
    T(!falla.length, `@${w} el índice muestra el conteo nuevo de los bloques 04–07`, falla);
    T(ix.sh <= 1, `@${w} sin scroll horizontal (${ix.sh})`);
    const r = await n.page.evaluate(async ({ STEMS }) => {
      const out = { ok: 0, mc: 0, falla: [] };
      const check = async (scope, stems, label) => {
        for (const st of stems) {
          const el = [...scope.querySelectorAll('.quiz-item')].find(q => q.querySelector('.quiz-question') && q.querySelector('.quiz-question').textContent.includes(st));
          if (!el) { out.falla.push(label + ':ausente:' + st.slice(0, 30)); continue; }
          const ans = el.querySelector('.answer'); const lis = [...el.querySelectorAll('.interactive-options li[data-option]')];
          if (lis.length) {
            const letra = /^([a-e])\)/i.exec(ans.querySelector('strong').textContent.trim())[1].toLowerCase();
            if (el.dataset.correct !== letra || lis.length !== 4) { out.falla.push(label + ':mc-data-correct:' + el.dataset.correct + '/' + letra); continue; }
            lis.find(l => l.dataset.option === letra).click(); const fb = el.querySelector('.quiz-feedback'); if (fb && fb.classList.contains('correct')) out.mc++; else out.falla.push(label + ':mc-correcta');
            el.classList.remove('answered'); el.querySelectorAll('li').forEach(l => l.classList.remove('correct', 'wrong')); if (fb) fb.remove();
            const mal = lis.find(l => l.dataset.option !== letra); mal.click(); const f2 = el.querySelector('.quiz-feedback'); if (!(f2 && f2.classList.contains('wrong'))) out.falla.push(label + ':mc-incorrecta');
          } else { const b = el.querySelector('.reveal-btn'); if (!b) { out.falla.push(label + ':sin-boton'); continue; } b.click(); await new Promise(r => setTimeout(r, 150)); if (ans.offsetHeight > 0) out.ok++; else out.falla.push(label + ':respuesta-invisible:' + st.slice(0, 30)); }
        }
      };
      for (const [b, stems] of Object.entries(STEMS)) { RMNav.go({ view: 'block', block: b }); await new Promise(r => setTimeout(r, 900)); const s = document.getElementById(b); if (!s || s.getBoundingClientRect().height <= 0) { out.falla.push(b + ':bloque-invisible'); continue; } await check(s, stems, b); }
      RMNav.go({ view: 'block', block: 'bancoap2' }); await new Promise(r => setTimeout(r, 1500)); await check(document.getElementById('bancoap2'), Object.values(STEMS).flat(), 'banco');
      return out; }, { STEMS });
    T(r.ok === 16 && r.mc === 2 && !r.falla.length, `@${w} bloques y banco: las 8 de forma «Citá/Completá» revelan la respuesta (16 copias) y la MCQ (2 copias) responde bien/mal con data-correct = letra`, r);
    T(errores.length === 0, `@${w} sin error de página (índice)` + (errores[0] ? ': ' + errores[0] : '')); await n.page.context().close();
    const c = await L.abrir(br, base, m, { w, h: 900, modo: 'controle', corr: true }); const e2 = []; c.page.on('pageerror', e => e2.push(String(e))); await c.page.waitForTimeout(2500);
    const q = await c.page.evaluate(() => document.querySelectorAll('.quiz-item').length); T(q === 464 && e2.length === 0, `@${w} página completa (modo control): 464 ítems y sin error`, [q, e2[0]]);
  }
  await br.close(); srv.close(); console.log(`\nap2-exame (navegador): ${ok}/${ok + bad}${bad ? ' — ' + bad + ' FALLAS' : ' OK'}`); process.exit(bad ? 1 : 0);
})();
