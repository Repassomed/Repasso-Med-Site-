/* Anatomía Patológica II (teórica) · «Retroalimentación» (119 preguntas de 7 turmas) cruzada con el banco · SOMENTE LEITURA.
   Prova: (1) nada se perdió: quitados los trechos marcados (<!-- ap2-retro-1127:begin … :end -->) y normalizadas las cifras declaradas, cada sección es idéntica a la main
   y las 234 preguntas antiguas (bloque + banco = 468 copias) siguen idénticas; (2) las 7 inserciones: espejo bloque=banco, rótulo «Basada en preguntas de examen», estructura, sin pistas visuales,
   no repiten enunciado existente; (3) cifras declaradas = reales (241 / 175 / 66; 26, 31 y 43 por tramo); (4) el resumen ya enseña lo que cada una cobra (Lei 8-A.2); (5) navegador: «Ver respuesta» real.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ap2-retro-1127/ap2-retro.test.cjs [--main origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..'), REL = 'Repasso-Med-Site--main/Atual - Copia/';
const F = REL + 'netlify/functions/materias-privadas/anatomia-patologica-ii.html';
const raw = fs.readFileSync(path.join(REPO, F), 'utf8');
const mainRaw = cp.execFileSync('git', ['show', arg('--main', 'origin/main') + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALLA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 500) : '')); } };
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = s => txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ITEM = /<div class="quiz-item"[^>]*>\n[\s\S]*?\n<\/div>\n<\/div>\n/g;
const strip = h => h.replace(/<!-- ap2-retro-1127:begin preguntas -->\n[\s\S]*?<!-- ap2-retro-1127:end -->\n/g, '');
const unc = h => h.replace(/<span>\d+ preguntas<\/span><span>\d+ basadas en preguntas de examen<\/span><span>\d+ variantes<\/span>/, '<span>STATS</span>').replace(/<small>\(\d+ preguntas\)<\/small>/g, '<small>(N)</small>');
const now = unc(strip(raw)), main = unc(mainRaw);
const secIds = t => [...t.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]);
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); };
const parse = p => ({ raw: p, tag: txt((/<span class="quiz-tag[^>]*>([\s\S]*?)<\/span>/.exec(p) || [, ''])[1]), tagCls: (/<span class="(quiz-tag[^"]*)"/.exec(p) || [, ''])[1], qraw: (/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1], q: txt((/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1].replace(/<span class="quiz-tag[^>]*>[\s\S]*?<\/span>/, '')), strong: txt((/<strong>([\s\S]*?)<\/strong>/.exec(p) || [, ''])[1]), reveal: /class="reveal-btn" onclick="toggleAnswer\(this\)"/.test(p), ans: /<div class="answer">/.test(p), opts: /<ul class="options">/.test(p) });
const ins = []; for (const m of raw.matchAll(/<!-- ap2-retro-1127:begin preguntas -->\n([\s\S]*?)<!-- ap2-retro-1127:end -->\n/g)) ins.push({ at: m.index, its: [...m[1].matchAll(ITEM)].map(x => x[0]) });
const bankAt = raw.indexOf('id="bancoap2"');
const blk = ins.filter(x => x.at < bankAt), bnk = ins.filter(x => x.at > bankAt);
console.log('\n▸ 1 · nada se perdió');
{
  const dif = secIds(mainRaw).filter(id => sec(now, id) !== sec(main, id)); ok(!dif.length, 'cada sección idéntica a la main (byte a byte) tras quitar solo lo marcado y las cifras declaradas', dif);
  ok(secIds(raw).join() === secIds(mainRaw).join(), 'ids de sección iguales y en el mismo orden');
  const qs = h => [...h.matchAll(ITEM)].map(m => m[0]);
  const old = qs(mainRaw), cur = new Set(qs(raw)); const lost = old.filter(x => !cur.has(x)); ok(old.length === 468 && !lost.length, `las ${old.length} copias de las 234 preguntas antiguas (bloque + banco) siguen idénticas, byte a byte`, lost.length);
  const fr = t => [...t.matchAll(/<div class="flashcard">[\s\S]*?<\/div><\/div>/g)].map(m => m[0]); ok(fr(raw).length === fr(mainRaw).length && fr(mainRaw).every(x => fr(raw).includes(x)), `flashcards intactas (${fr(raw).length})`);
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|'); ok(img(raw) === img(mainRaw), 'imágenes: mismo conjunto de src');
  ok((raw.match(/<svg[\s>]/g) || []).length === (mainRaw.match(/<svg[\s>]/g) || []).length, 'SVG: misma cantidad');
  const ids = [...raw.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); ok(new Set(ids).size === ids.length && [...mainRaw.matchAll(/\bid="([^"]+)"/g)].every(m => ids.includes(m[1])), 'ningún id duplicado ni perdido');
  const g = (raw.match(/<!-- ap2-retro-1127:begin/g) || []).length, e = (raw.match(/<!-- ap2-retro-1127:end -->/g) || []).length; ok(g === e && g === 6, `marcadores balanceados (${g}/${e}): 3 tramos en bloques + 3 en banco`);
  ok((raw.match(/data-guard-previous-stem-sha1/g) || []).length === (mainRaw.match(/data-guard-previous-stem-sha1/g) || []).length, 'ningún puente de renombre nuevo: ninguna pregunta antigua fue reformulada ni retirada (los de la main se conservan)');
}
console.log('\n▸ 2 · las 7 inserciones');
{
  const B = blk.map(x => x.its), K = bnk.map(x => x.its);
  ok(B.map(a => a.length).join() === '1,3,3' && K.map(a => a.length).join() === '1,3,3', 'tramos b03/b04/b07: 1, 3 y 3 (bloque y banco)', [B.map(a => a.length).join(), K.map(a => a.length).join()]);
  ok(B.flat().join('') === K.flat().join(''), 'bloque y banco idénticos, byte a byte (espejo, 0 divergencias)');
  const P = B.flat().map(parse);
  ok(P.length === 7 && P.every(x => x.tag === 'Basada en preguntas de examen' && x.tagCls === 'quiz-tag oficial'), 'las 7 rotuladas «Basada en preguntas de examen»');
  ok(!/Pregunta oficial|clave oficial|transcrip/i.test(P.map(x => x.raw).join(' ')), 'ninguna se presenta como «Pregunta oficial» ni como transcripción literal');
  ok(P.every(x => x.reveal && x.ans && x.strong && !x.opts), 'todas de forma «Citá/Completá» con «Ver respuesta» (toggleAnswer) y respuesta destacada');
  ok(!P.some(x => /<(b|strong|i|em|u|mark|font)\b|style=/i.test(x.qraw.replace(/<span class="quiz-tag[^>]*>[^<]*<\/span>/g, ''))), 'sin negrita ni resaltado en los enunciados (sin pistas visuales)');
  const viejos = new Set([...mainRaw.matchAll(ITEM)].map(m => norm(parse(m[0]).q))); ok(P.every(x => !viejos.has(norm(x.q))), 'ninguna repite literalmente el enunciado de una pregunta existente');
  ok(P.every(x => !/profesor|docente|la cátedra cobra|cobra en el examen/i.test(x.raw)), 'sin referencia a profesor ni a estrategia de examen');
  const t = P.map(x => norm(x.raw)).join(' ');
  ok(/anticonceptivos orales/.test(t) && /esteroides anabolizantes/.test(t), 'adenoma hepático: anticonceptivos orales y esteroides anabolizantes');
  ok(/inflamatorio/.test(t) && /esteatosis hepatica no alcoholica/.test(t) && /mayor riesgo de malignizacion/.test(t), 'subtipo inflamatorio ↔ esteatosis no alcohólica; β-catenina como mayor riesgo');
  ok(/fibroblastos de los espacios porta/.test(t) && /celulas estrelladas hepaticas/.test(t), 'cicatriz de la cirrosis: célula estrellada + fibroblastos portales');
  ok(/atrofia difusa/.test(t) && /metaplasia intestinal/.test(t), 'gastritis autoinmunitaria: atrofia difusa y metaplasia intestinal');
  ok(/tipo i de borrmann/.test(t) && /tipo ii de borrmann/.test(t) && /tipo iii/.test(t), 'Borrmann I, II y III (una pregunta cada tipo)');
}
console.log('\n▸ 3 · cifras declaradas = reales');
{
  const bk = sec(raw, 'bancoap2'), real = (raw.slice(0, bankAt).match(/class="quiz-item"/g) || []).length, realB = (bk.match(/class="quiz-item"/g) || []).length; ok(real === 241 && realB === 241, 'preguntas reales: 241 en los bloques y 241 en el banco (234 + 7; ninguna retirada)', [real, realB]);
  const ex = (bk.match(/<span class="quiz-tag oficial[^"]*">/g) || []).length, va = (bk.match(/<span class="quiz-tag variante[^"]*">/g) || []).length;
  const st = /<span>(\d+) preguntas<\/span><span>(\d+) basadas en preguntas de examen<\/span><span>(\d+) variantes<\/span>/.exec(raw); ok(st && +st[1] === 241 && +st[2] === ex && +st[3] === va && ex === 175 && va === 66, `estadísticas declaradas = reales: ${st && st.slice(1).join(' · ')} (examen ${ex}, variantes ${va})`);
  const subs = [...bk.matchAll(/Bloque (\d+) · [^<]*<small>\((\d+) preguntas\)<\/small>/g)].map(m => +m[2]); const reales = bk.split('<h3 class="ap2-bank-sub">').slice(1, 9).map(s => (s.match(/class="quiz-item"/g) || []).length);
  ok(subs.join() === reales.join() && subs.join() === '38,32,26,31,28,26,43,17', 'cada tramo del banco declara su número real', [subs.join(), reales.join()]);
  const por = [1, 2, 3, 4, 5, 6, 7, 8].map(k => (sec(raw, 'ap2b0' + k).match(/class="quiz-item"/g) || []).length); ok(por.join() === subs.join(), 'bloque = banco por tramo', por.join());
  const exb = [1, 2, 3, 4, 5, 6, 7, 8].map(k => (sec(raw, 'ap2b0' + k).match(/<span class="quiz-tag oficial/g) || []).length); ok(exb.join() === '35,24,23,27,23,23,20,0' && exb.reduce((a, b) => a + b, 0) === 175, `basadas en examen por bloque: ${exb.join(', ')} (suma ${exb.reduce((a, b) => a + b, 0)})`);
}
console.log('\n▸ 4 · el resumen ya enseña lo que cada pregunta cobra (Lei 8-A.2: el resumen enseña → la pregunta cobra)');
{
  const COB = { ap2b03: ['atrofia', 'metaplasia intestinal', 'multifocal'], ap2b04: ['borrmann i ', 'borrmann ii ', 'borrmann iii', 'bordes sobresalientes', 'polipoide o fungoide', 'tumor ulcerado infiltrante'], ap2b07: ['anticonceptivos orales', 'esteroides anabolizantes', 'inflamatorio', 'esteatosis hepatica no alcoholica', 'miofibroblasto', 'fibroblastos de los espacios porta', 'hnf1', 'betacatenina'.replace('betacatenina', 'catenina')] };
  for (const [b, ts] of Object.entries(COB)) { const s = sec(raw, b); const T = norm(s.slice(0, s.indexOf('<div class="quiz-section"'))); const falta = ts.filter(t => !T.includes(t)); ok(!falta.length, `${b}: ${ts.length} términos clave presentes en la enseñanza (fuera de las preguntas)`, falta); }
}
console.log('\n▸ 5 · navegador: «Ver respuesta» real en las 14 copias');
(async () => {
  const { chromium } = require('playwright');
  const core = fs.readFileSync(path.join(REPO, REL + 'assets/app-core.js'), 'utf8');
  const fn = (nm) => { const i = core.indexOf('function ' + nm); let d = 0, j = core.indexOf('{', i); for (let k = j; k < core.length; k++) { if (core[k] === '{') d++; else if (core[k] === '}') { d--; if (!d) return core.slice(i, k + 1); } } };
  const toggle = fn('toggleAnswer');
  const items = ins.flatMap(x => x.its);
  const br = await chromium.launch(), pg = await br.newPage(); await pg.setContent('<body></body>'); await pg.addScriptTag({ content: toggle + ';window.toggleAnswer=toggleAnswer;' });
  let good = 0; const bad = [];
  for (const it of items) { await pg.evaluate(h => { document.body.innerHTML = h; }, it); const r = await pg.evaluate(() => { const b = document.querySelector('.reveal-btn'), a = document.querySelector('.answer'); const before = getComputedStyle(a).display; b.click(); return a.classList.contains('show') || getComputedStyle(a).display !== before; }); if (r) good++; else bad.push(it.slice(0, 80)); }
  ok(good === items.length && items.length === 14, `toggleAnswer abre la respuesta en ${good}/${items.length}`, bad);
  await br.close();
  console.log(`\nap2-retro-1127: ${n - ko}/${n}${ko ? ' — ' + ko + ' FALLAS' : ' OK'}`); process.exit(ko ? 1 : 0);
})();
