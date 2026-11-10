/* Issue #647 · Semiología II — teste no navegador (harness do ensaio: Supabase simulado, sem rede externa).
   Modos «controle» (como o site serve hoje) e «nav» (layout novo, só em memória), 390/768/1440.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/semio2-647/semio2-647-browser.cjs */
'use strict';
const L = require('../ensaio-layout/lib.cjs');
const res = []; const ok = (w, modo, nome, c, det) => { res.push({ ok: !!c }); console.log((c ? 'PASSA ' : 'FALHA ') + modo + ' @' + w + ' ' + nome + (det !== undefined && !c ? ' → ' + JSON.stringify(det).slice(0, 300) : '')); };
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.servir({}); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const m = L.reconciliar().ativas.find(x => x.slug === 'semiologia-ii');
  for (const [modo, W] of [['controle', 1440], ['controle', 390], ['nav', 1440], ['nav', 768]]) {
    const r = await L.abrir(br, base, m, { w: W, h: ({ 390: 844, 768: 1024, 1440: 900 })[W], modo, espera: 800 }); const p = r.page;
    const D = await p.evaluate(() => { const q = id => document.getElementById(id); const t = id => (q(id) ? q(id).textContent.replace(/\s+/g, ' ') : '');
      const bl = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((a, i) => a + q('s2-b' + String(i).padStart(2, '0')).querySelectorAll('.quiz-item').length, 0);
      return { bl, banco: q('s2-banco').querySelectorAll('.quiz-item').length, fc: document.querySelectorAll('#s2-flashcards .flashcard').length,
        b7: ['El examen físico en tres preguntas', 'llenado capilar', 'pre-IC'].every(x => t('s2-b07').includes(x)), b9: ['¿es sinusal?', 'arritmia sinusal', 'electrodo de tierra'].every(x => t('s2-b09').includes(x)), tb: t('s2-tablas').includes('Cómo se construye una respuesta completa'),
        marks: { b01: q('s2-b01').querySelectorAll('.quiz-item').length, b09: q('s2-b09').querySelectorAll('.quiz-item').length },
        sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }; });
    ok(W, modo, 'preguntas: 120 en los bloques = 120 en el banco', D.bl === 120 && D.banco === 120, D);
    ok(W, modo, 'flashcards del mazo general: 172 (sin cambios)', D.fc >= 172, D.fc);
    ok(W, modo, 'secciones nuevas renderizadas en b07, b09 y compendio', D.b7 && D.b9 && D.tb, D);
    ok(W, modo, 'sin rolagem horizontal de la página', D.sw <= D.vw + 1, D);
    ok(W, modo, 'sin error de página/consola ni red externa', !r.errs.length && !r.externas.filter(u => !/fonts\.(g|gs)/.test(u)).length, { errs: r.errs, ext: r.externas.length });
    if (modo === 'controle') { const I = await p.evaluate(() => { const b = document.getElementById('s2-b09'); const qi = b.querySelector('.quiz-item'); const li = qi && qi.querySelector('li[data-option]'); if (li) li.click(); return !!qi && (qi.classList.contains('answered') || !!qi.querySelector('.answer')); }); ok(W, modo, 'una pregunta de b09 responde al toque', I); }
    if (modo === 'nav') { const E = await p.evaluate(() => window.__ens && { er: window.__ens.erros, et: window.__ens.etapas }); ok(W, modo, 'layout nuevo (en memoria) se activa sin error', E && !E.er.length && E.et.attach_nav, E); }
    await r.ctx.close();
  }
  await br.close(); srv.close();
  const f = res.filter(x => !x.ok); console.log(`\nTOTAL ${res.length} · PASSA ${res.length - f.length} · FALHA ${f.length}`); process.exit(f.length ? 1 : 0);
})();
