/* Anatomía Patológica II (teórica) · 11 ítems de una prueba (reconstrucción) · teste estático + navegador — SOMENTE LEITURA.
   Prova: (1) nada se perdió: tras quitar los trechos marcados (<!-- ap2-exame-1126:begin … :end -->), quitar la pregunta reformulada (q106) y normalizar las cifras declaradas,
   cada sección del archivo es idéntica a la main; las 223 preguntas antiguas restantes siguen idénticas, en bloque y banco; (2) las 9 inserciones (8 nuevas + 1 reformulada):
   idénticas en bloque y banco, rótulo «Basada en preguntas de examen», estructura, respuesta = alternativa, sin negrita en las opciones; (3) cifras declaradas = reales;
   (4) el resumen enseña lo que cada una cobra; (5) navegador: toggleAnswer real funciona en las 18 copias.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ap2-exame-1126/ap2-exame.test.cjs [--main origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..'), REL = 'Repasso-Med-Site--main/Atual - Copia/';
const F = REL + 'netlify/functions/materias-privadas/anatomia-patologica-ii.html';
const raw = fs.readFileSync(path.join(REPO, F), 'utf8');
const mainRaw = cp.execFileSync('git', ['show', arg('--main', 'origin/main') + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 500) : '')); } };
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = s => txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ITEM = /<div class="quiz-item"[^>]*>\n[\s\S]*?\n<\/div>\n<\/div>\n/g;
const Q106 = '¿Cuáles son los dos factores pronósticos más importantes del adenocarcinoma gástrico?';
const strip = h => h.replace(/<!-- ap2-exame-1126:begin preguntas -->\n[\s\S]*?<!-- ap2-exame-1126:end -->\n/g, '').replace(/\n? *<!-- ap2-exame-1126:begin resumen -->[\s\S]*?<!-- ap2-exame-1126:end -->/g, '');
const unc = h => h.replace(/<span>\d+ preguntas<\/span><span>\d+ basadas en preguntas de examen<\/span><span>\d+ variantes<\/span>/, '<span>STATS</span>').replace(/<small>\(\d+ preguntas\)<\/small>/g, '<small>(N)</small>');
const noQ106 = h => h.replace(ITEM, m => (m.includes(Q106) ? '' : m));
const now = unc(strip(raw)), main = unc(noQ106(mainRaw));
const secIds = t => [...t.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]);
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); };
const parse = p => ({ raw: p, tag: txt((/<span class="quiz-tag[^>]*>([\s\S]*?)<\/span>/.exec(p) || [, ''])[1]), tagCls: (/<span class="(quiz-tag[^"]*)"/.exec(p) || [, ''])[1], qraw: (/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1], q: txt((/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1].replace(/<span class="quiz-tag[^>]*>[\s\S]*?<\/span>/, '')), ul: (/<ul class="options">([\s\S]*?)<\/ul>/.exec(p) || [, ''])[1], opts: [...p.matchAll(/<li>([a-e])\) ([\s\S]*?)<\/li>/g)].map(x => [x[1], txt(x[2])]), strong: txt((/<strong>([\s\S]*?)<\/strong>/.exec(p) || [, ''])[1]), reveal: /class="reveal-btn" onclick="toggleAnswer\(this\)"/.test(p), ans: /<div class="answer">/.test(p) });
/* inserciones: items dentro de marcadores 'preguntas' (en orden de aparición: bloques 04,05,06,07 y luego banco) */
const ins = []; for (const m of raw.matchAll(/<!-- ap2-exame-1126:begin preguntas -->\n([\s\S]*?)<!-- ap2-exame-1126:end -->\n/g)) { const its = [...m[1].matchAll(ITEM)].map(x => x[0]); ins.push({ at: m.index, its }); }
const bankAt = raw.indexOf('id="bancoap2"');
const blk = ins.filter(x => x.at < bankAt), bnk = ins.filter(x => x.at > bankAt);
console.log('\n▸ 1 · nada se perdió');
{
  const dif = secIds(mainRaw).filter(id => sec(now, id) !== sec(main, id)); ok(!dif.length, 'cada sección idéntica a la main (byte a byte) tras quitar solo lo marcado, la q106 reformulada y las cifras declaradas', dif);
  ok(secIds(raw).join() === secIds(mainRaw).join(), 'ids de sección iguales y en el mismo orden');
  const qs = h => [...h.matchAll(ITEM)].map(m => m[0]);
  const old = qs(noQ106(mainRaw)), cur = new Set(qs(raw)); const lost = old.filter(x => !cur.has(x)); ok(old.length === 446 && !lost.length, `las ${old.length} copias de las 223 preguntas antiguas (bloque + banco) siguen idénticas, byte a byte`, lost.length);
  const fr = t => [...t.matchAll(/<div class="flashcard">[\s\S]*?<\/div><\/div>/g)].map(m => m[0]); ok(fr(raw).length === fr(mainRaw).length && fr(mainRaw).every(x => fr(raw).includes(x)), `flashcards intactas (${fr(raw).length})`);
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|'); ok(img(raw) === img(mainRaw), 'imágenes: mismo conjunto de src');
  ok((raw.match(/<svg[\s>]/g) || []).length === (mainRaw.match(/<svg[\s>]/g) || []).length, 'SVG: misma cantidad');
  const ids = [...raw.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); ok(new Set(ids).size === ids.length && [...mainRaw.matchAll(/\bid="([^"]+)"/g)].every(m => ids.includes(m[1])), 'ningún id duplicado ni perdido');
  const g = (raw.match(/<!-- ap2-exame-1126:begin/g) || []).length, e = (raw.match(/<!-- ap2-exame-1126:end -->/g) || []).length; ok(g === e && g === 4 + 4 + 5, `marcadores balanceados (${g}/${e}): 4 tramos en bloques + 4 en banco + 5 complementos de resumen`);
}
console.log('\n▸ 2 · las 9 inserciones (8 nuevas + q106 reformulada)');
{
  const B = blk.map(x => x.its), K = bnk.map(x => x.its);
  ok(B.map(a => a.length).join() === '2,1,3,3' && K.map(a => a.length).join() === '2,1,3,3', 'tramos 04/05/06/07: 2, 1, 3 y 3 (bloque y banco)', [B.map(a => a.length).join(), K.map(a => a.length).join()]);
  ok(B.flat().join('') === K.flat().join(''), 'bloque y banco idénticos, byte a byte (espejo, 0 divergencias)');
  const P = B.flat().map(parse);
  ok(P.length === 9 && P.every(x => x.tag === 'Basada en preguntas de examen' && x.tagCls === 'quiz-tag oficial'), 'las 9 rotuladas «Basada en preguntas de examen»');
  ok(!/Pregunta oficial|clave oficial|transcrip/i.test(P.map(x => x.raw).join(' ').replace(/no se transcribi/g, '')), 'ninguna se presenta como «Pregunta oficial» ni como transcripción literal');
  ok(P.every(x => x.reveal && x.ans && x.strong), 'todas con «Ver respuesta» (toggleAnswer), bloque de respuesta y respuesta destacada');
  const mc = P.filter(x => x.opts.length), cz = P.filter(x => !x.opts.length);
  const mal = mc.filter(x => { const L = /^([a-e])\)/.exec(x.strong); const o = L && x.opts.find(o => o[0] === L[1]); return !(o && o[1] === x.strong.slice(3)); }); ok(mc.length === 1 && cz.length === 8 && !mal.length, `1 opción múltiple con respuesta = alternativa, 8 de forma «Citá/Completá»`, mal.length);
  ok(mc.every(x => x.opts.length === 4 && new Set(x.opts.map(o => o[1])).size === 4), 'alternativas a–d sin repetición');
  ok(!P.some(x => /<(b|strong|i|em|u|mark|font)\b|style=/i.test(x.qraw.replace(/<span class="quiz-tag[^>]*>[^<]*<\/span>/g, '')) || /<(b|strong|i|em|u|mark|span|font)\b|style=|\sclass=/i.test(x.ul)), 'sin negrita ni resaltado en enunciados ni opciones (sin pistas visuales)');
  const mcOpt = mc[0]; const lens = mcOpt.opts.map(o => o[1].length), cl = mcOpt.opts.find(o => o[0] === /^([a-e])/.exec(mcOpt.strong)[1])[1].length; ok(cl < Math.max(...lens), 'la alternativa correcta no es la más larga', lens);
  const viejos = new Set([...mainRaw.matchAll(ITEM)].map(m => norm(parse(m[0]).q))); ok(P.every(x => !viejos.has(norm(x.q))) , 'ninguna repite literalmente el enunciado de una pregunta existente');
  ok(P.some(x => /Caso reconstruido de prueba/.test(x.q)) && /se reconstruy/.test(P.find(x => /Caso reconstruido/.test(x.q)).raw) && /no se rotula como adenoma por el cuadro/.test(P.find(x => /Caso reconstruido/.test(x.q)).raw), 'ítem 9: presentado como caso reconstruido y sin diagnóstico automático');
  const t = P.map(x => x.raw).join(' ');
  ok(/presencia de metástasis/.test(t) && /no hay que limitar «metástasis» a los ganglios/.test(t), 'ítem 3: «presencia de metástasis» sin limitar a los ganglios');
  ok(/asociado, no exclusivo y tampoco diagnóstico por sí solo/.test(t) && /p-ANCA/.test(t) && /perinuclear/.test(t), 'ítem 4: p-ANCA asociado, no exclusivo ni diagnóstico');
  ok(/MALT/.test(P[0].raw) && !/anillo de sello infiltrando|Lauren.*MALT/.test(P[0].raw) && !/enunciado/.test(P[0].raw.replace(/<[^>]+>/g, '')), 'ítem 11: linfocitos B de zona marginal, sin vincular a otro enunciado gástrico');
}
console.log('\n▸ 3 · cifras declaradas = reales');
{
  const bk = sec(raw, 'bancoap2'), real = (raw.slice(0, bankAt).match(/class="quiz-item"/g) || []).length, realB = (bk.match(/class="quiz-item"/g) || []).length; ok(real === 232 && realB === 232, 'preguntas reales: 232 en los bloques y 232 en el banco', [real, realB]);
  const ex = (bk.match(/<span class="quiz-tag oficial[^"]*">/g) || []).length, va = (bk.match(/<span class="quiz-tag variante[^"]*">/g) || []).length, vf = (bk.match(/<span class="quiz-tag [a-z ]*vf">/g) || []).length;
  const st = /<span>(\d+) preguntas<\/span><span>(\d+) basadas en preguntas de examen<\/span><span>(\d+) variantes<\/span><span>(\d+) verdadero\/falso<\/span>/.exec(raw); ok(st && +st[1] === 232 && +st[2] === ex && +st[3] === va && +st[4] === vf && ex === 166 && va === 66, `estadísticas declaradas = reales: ${st && st.slice(1).join(' · ')} (examen ${ex}, variantes ${va}, V/F ${vf})`);
  const subs = [...bk.matchAll(/Bloque (\d+) · [^<]*<small>\((\d+) preguntas\)<\/small>/g)].map(m => +m[2]); const reales = bk.split('<h3 class="ap2-bank-sub">').slice(1, 9).map(s => (s.match(/class="quiz-item"/g) || []).length);
  ok(subs.join() === reales.join() && subs.join() === '38,32,25,27,27,26,40,17', 'cada tramo del banco declara su número real', [subs.join(), reales.join()]);
  const por = [1, 2, 3, 4, 5, 6, 7, 8].map(k => (sec(raw, 'ap2b0' + k).match(/class="quiz-item"/g) || []).length); ok(por.join() === subs.join(), 'bloque = banco por tramo', por.join());
}
console.log('\n▸ 4 · el resumen enseña antes lo que cada ítem cobra');
{
  const COB = { ap2b04: ['linfocito b de la zona marginal', 'profundidad de invasion', 'presencia de metastasis', 'm</b>'.slice(0, 0) + 'estadio (tnm)'], ap2b05: ['anticuerpos anticitoplasma de neutrofilos', 'patron perinuclear', 'no exclusivo', 'continua', 'mucosa'], ap2b06: ['11 anos', 'intestino delgado', 'arborizacion de musculo liso', 'lamina propia', 'glandulas', 'glandulas dilatadas y quisticas llenas de mucina', 'inflamada'], ap2b07: ['hialinizacion', 'calcificacion', 'distrofica', 'tgf-β', 'fibrogenesis', 'embarazo', 'dolor', 'subcapsular', 'imagenes'] };
  for (const [b, ts] of Object.entries(COB)) { const s = sec(raw, b); const T = norm(s.slice(0, s.indexOf('<div class="quiz-section"'))); const falta = ts.filter(t => !T.includes(t)); ok(!falta.length, `${b}: ${ts.length} términos clave presentes en la enseñanza (fuera de las preguntas)`, falta); }
}
console.log('\n▸ 5 · navegador: «Ver respuesta» real en las 18 copias');
(async () => {
  const { chromium } = require('playwright');
  const core = fs.readFileSync(path.join(REPO, REL + 'assets/app-core.js'), 'utf8');
  const fn = (nm) => { const i = core.indexOf('function ' + nm); let d = 0, j = core.indexOf('{', i); for (let k = j; k < core.length; k++) { if (core[k] === '{') d++; else if (core[k] === '}') { d--; if (!d) return core.slice(i, k + 1); } } };
  const toggle = fn('toggleAnswer');
  const items = [...ins.flatMap(x => x.its)];
  const br = await chromium.launch(), pg = await br.newPage(); await pg.setContent('<body></body>'); await pg.addScriptTag({ content: toggle + ';window.toggleAnswer=toggleAnswer;' });
  let good = 0; const bad = [];
  for (const it of items) { await pg.evaluate(h => { document.body.innerHTML = h; }, it); const r = await pg.evaluate(() => { const b = document.querySelector('.reveal-btn'), a = document.querySelector('.answer'); const before = getComputedStyle(a).display; b.click(); const mid = a.classList.contains('show') || getComputedStyle(a).display !== before; return { before, mid }; }); if (r.mid) good++; else bad.push(it.slice(0, 80)); }
  ok(good === items.length && items.length === 18, `toggleAnswer abre la respuesta en ${good}/${items.length}`, bad);
  await br.close();
  console.log(`\nap2-exame: ${n - ko}/${n}${ko ? ' — ' + ko + ' FALLAS' : ' OK'}`); process.exit(ko ? 1 : 0);
})();
