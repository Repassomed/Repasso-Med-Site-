/* Ortopedia · Unidades 6 y 7 (PDF en imagen, 209 págs.) · 8 complementos de resumen en otb07/otb08 · teste estático + navegador — SOLO LECTURA.
   Prueba: (1) tras quitar los trechos marcados (<!-- orto-u67-1126:begin resumen --> … :end -->) el archivo es IDÉNTICO a la main, byte a byte; (2) 8 complementos, marcadores balanceados,
   4 en otb07 y 4 en otb08 (ver CFG), todos DENTRO de otb07/otb08; (3) preguntas (457), flashcards, ids, imágenes y SVG idénticos; (4) cada complemento contiene los términos de la diapositiva que lo originó;
   (5) navegador: la página real abre sin error, los complementos son visibles en su bloque (1440 y 390 px), sin scroll horizontal.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/orto-u67-1126/orto-u67.test.cjs [--main origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..'), REL = 'Repasso-Med-Site--main/Atual - Copia/';
const F = REL + 'netlify/functions/materias-privadas/ortopedia.html';
const raw = fs.readFileSync(path.join(REPO, F), 'utf8');
const mainRaw = cp.execFileSync('git', ['show', arg('--main', 'origin/main') + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALLA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = s => txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const RE = /<!-- orto-u67-1126:begin resumen -->\n([\s\S]*?)<!-- orto-u67-1126:end -->\n/g;
const strip = h => h.replace(/\n?<!-- orto-u67-1126:begin resumen -->\n[\s\S]*?<!-- orto-u67-1126:end -->\n/g, '');
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); };
const blocks = [...raw.matchAll(RE)].map(m => ({ at: m.index, html: m[1] }));
const CFG = [ // [bloque, términos que debe contener el complemento (de la diapositiva)]
  ['otb07', ['mecanismo lesional', 'factores de riesgo']], ['otb07', ['tres fases', 'fase vascular con hiperperfusion', 'fase tisular con hiperemia difusa']],
  ['otb07', ['nervio radial', 'caida de la muneca', 'bloqueo de conduccion reversible', 'endoneuro']], ['otb07', ['traccion', 'electromiograma', '3 semanas', 'neuropraxia', 'axonotmesis', 'neurotmesis', '3 y 7 dias', '3 y 6 semanas', 'termino-terminal', 'partes blandas']],
  ['otb08', ['rojo-rojo', 'rojo-blanco', 'blanco-blanco', 'asa de cubo', 'pico de loro', 'flap', 'vertical', 'transversa', 'periferica', 'radiales', 'horizontales', 'oblicuos', 'longitudinales']],
  ['otb08', ['numerosas maniobras', 'mas de una maniobra']], ['otb08', ['espina tibial']], ['otb08', ['cerclaje', 'alambres']]];
console.log('\n▸ 1 · nada se perdió');
{
  ok(strip(raw) === mainRaw, 'el archivo sin los trechos marcados es IDÉNTICO a la main (byte a byte)');
  ok(blocks.length === 8 && (raw.match(/orto-u67-1126:begin/g) || []).length === 8 && (raw.match(/orto-u67-1126:end/g) || []).length === 8, `8 complementos y marcadores balanceados (${blocks.length})`);
  const q = h => (h.match(/class="quiz-item"/g) || []).length, f = h => (h.match(/class="flashcard"/g) || []).length;
  ok(q(raw) === q(mainRaw) && q(raw) === 914 && f(raw) === f(mainRaw), `preguntas (${q(raw)}) y flashcards (${f(raw)}) intactas`);
  const ids = h => [...h.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); const A = ids(mainRaw), B = new Set(ids(raw)); ok(A.every(x => B.has(x)) && ids(raw).length === A.length, 'ningún id perdido ni agregado');
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|'); ok(img(raw) === img(mainRaw) && (raw.match(/<svg[\s>]/g) || []).length === (mainRaw.match(/<svg[\s>]/g) || []).length, 'imágenes y SVG idénticos');
  const dif = ['otb01', 'otb02', 'otb03', 'otb04', 'otb05', 'otb06', 'otb09', 'otb10', 'otb11', 'otb12', 'otb13', 'otb14', 'otb15', 'otb16', 'otb17', 'bancoorto', 'bancofcorto'].filter(i => sec(raw, i) !== sec(mainRaw, i)); ok(!dif.length, 'los demás bloques y el banco no cambiaron', dif);
}
console.log('\n▸ 2 · los 8 complementos');
{
  const s7 = sec(raw, 'otb07'), s8 = sec(raw, 'otb08');
  CFG.forEach(([b, terms], i) => { const bl = blocks[i]; const S = b === 'otb07' ? s7 : s8; const dentro = S.includes(bl.html); const T = norm(bl.html); const falta = terms.filter(t => !T.includes(t)); ok(dentro && !falta.length, `complemento ${i + 1} en ${b}: ${terms.length} términos de la diapositiva presentes`, falta.length ? falta : (dentro ? '' : 'fuera del bloque')); });
  ok(!/clave oficial|pregunta oficial/i.test(blocks.map(b => b.html).join(' ')), 'ningún complemento habla de clave oficial');
  const antes = (h, i) => h.slice(0, i); const q07 = (s7.match(/class="quiz-item"/g) || []).length, q08 = (s8.match(/class="quiz-item"/g) || []).length; ok(q07 === 35 && q08 === 30, 'otb07 35 preguntas y otb08 30 preguntas (sin cambio)');
  const antesQuiz7 = blocks.slice(0, 4).every(b => s7.indexOf(b.html) < s7.indexOf('class="quiz-section"') || s7.indexOf('class="quiz-section"') < 0); ok(antesQuiz7, 'los complementos de otb07 están en el texto de enseñanza, antes de las preguntas');
}
console.log('\n▸ 3 · navegador: página real');
(async () => {
  const { chromium } = require('playwright'); const L = require('../ensaio-layout/lib.cjs');
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'ortopedia'); ok(!!m, 'ortopedia está entre las materias activas del ensayo');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const w of [1440, 390]) {
    const c = await L.abrir(br, base, m, { w, h: 900, modo: 'controle', corr: true }); const errs = []; c.page.on('pageerror', e => errs.push(String(e))); await c.page.waitForTimeout(3000);
    const r = await c.page.evaluate(() => { const L = [...document.querySelectorAll('.rmc-postit')].filter(e => e.previousSibling || true); const t = [...document.querySelectorAll('.rmc-postit h4')].map(h => h.textContent.trim()).filter(x => /Complemento/.test(x)); const vis = t.length; return { vis, quiz: document.querySelectorAll('.quiz-item').length, sh: document.documentElement.scrollWidth - innerWidth, h07: !!document.querySelector('#otb07'), h08: !!document.querySelector('#otb08'), compl07: document.querySelectorAll('#otb07 .rmc-postit').length, compl08: document.querySelectorAll('#otb08 .rmc-postit').length }; });
    ok(r.vis >= 8 && r.quiz === 914 && r.h07 && r.h08, `@${w} la página real abre: ${r.vis} postits «Complemento», ${r.quiz} preguntas`, r);
    ok(r.sh <= 1, `@${w} sin scroll horizontal (${r.sh})`); ok(errs.length === 0, `@${w} sin error de página` + (errs[0] ? ': ' + errs[0] : ''));
    const v = await c.page.evaluate(() => [...document.querySelectorAll('.rmc-postit h4')].filter(h => /Complemento/.test(h.textContent)).every(h => h.offsetHeight > 0 && h.closest('.rmc-postit').offsetWidth > 0)); ok(v, `@${w} los complementos tienen caja visible`);
    await c.page.context().close();
  }
  await br.close(); srv.close(); console.log(`\norto-u67: ${n - ko}/${n}${ko ? ' — ' + ko + ' FALLAS' : ' OK'}`); process.exit(ko ? 1 : 0);
})();
