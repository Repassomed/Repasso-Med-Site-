/* Anatomía Patológica II (teórica) · «Retroalimentación» (119 preguntas de 7 turmas) cruzada con el banco · SOMENTE LEITURA.
   Prueba: (1) nada se perdió: quitados los trechos marcados (<!-- ap2-retro-1127:begin … :end -->), las 4 preguntas SUSTITUIDAS (lista explícita, con puente de renombre del Guard) y los 2 rótulos reclasificados,
   y normalizadas las cifras declaradas, cada sección es idéntica a la main; las demás preguntas antiguas siguen idénticas (bloque + banco);
   (2) las 15 inserciones + 4 sustituciones: espejo bloque=banco, rótulo «Basada en preguntas de examen», estructura, respuesta = alternativa, sin pistas visuales, puente = sha1 del enunciado anterior y misma letra;
   (3) cifras declaradas = reales (249 / 189 / 60; tramos 38,32,26,32,29,29,46,17); (4) el resumen ya enseña lo que cada pregunta cobra (8-A.2); (5) navegador: «Ver respuesta» real.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ap2-retro-1127/ap2-retro.test.cjs [--main origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..'), REL = 'Repasso-Med-Site--main/Atual - Copia/';
const F = REL + 'netlify/functions/materias-privadas/anatomia-patologica-ii.html';
const raw = fs.readFileSync(path.join(REPO, F), 'utf8');
const BRIDGE = / data-guard-previous-stem-sha1="[0-9a-f]{40}"/g; /* los 2 puentes de la #728 ya cumplieron su función; se quitan de la main para comparar */
const mainRaw0 = cp.execFileSync('git', ['show', arg('--main', 'origin/main') + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
const mainRaw = mainRaw0.replace(BRIDGE, '');
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALLA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 500) : '')); } };
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = s => txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ITEM = /<div class="quiz-item"[^>]*>\n[\s\S]*?\n<\/div>\n<\/div>\n/g;
const OLDT = '<span class="quiz-tag variante">Pregunta complementaria</span>', NEWT = '<span class="quiz-tag oficial">Basada en preguntas de examen</span>';
/* reclasificadas (mismo rótulo→examen; misma respuesta y mismo razonamiento que un ítem del PDF) */
const RELAB = ['Un tumor gástrico está formado por islotes y trabéculas', 'Citá dos de los cinco parámetros de la clasificación de Child-Pugh'];
const relabel = h => RELAB.reduce((a, st) => a.split(OLDT + ' ' + st).join(NEWT + ' ' + st), h);
const unrelabel = h => RELAB.reduce((a, st) => a.split(NEWT + ' ' + st).join(OLDT + ' ' + st), h);
/* SUSTITUIDAS: pregunta complementaria → versión fiel al PDF en el mismo lugar; sha1 = impresión digital del enunciado anterior (Guard: pregunta anterior sin id, misma sección, misma letra) */
const SUBST = [
  { old: '¿Cuál es la localización más característica de la enfermedad de Crohn?', sha: '16e71a65f3bc47d08d99d32aa739f46c7f6b28b3', letter: 'c', pdf: 'C1' },
  { old: '¿Qué hallazgo macroscópico es la clave diagnóstica de la hiperplasia nodular focal (HNF)?', sha: '7505e6d576f017a4179ef0da3dbcf4ff506251cb', letter: 'd', pdf: 'I17/F14' },
  { old: '¿Qué son los cuerpos de Mallory-Denk de la esteatohepatitis alcohólica?', sha: 'b1528ffa8d419ea724a027f7837255fb7a993ede', letter: 'a', pdf: 'G16/C9' },
  { old: '¿Cuál es el marcador sérico más útil en el carcinoma hepatocelular y cómo debe interpretarse?', sha: '8834c71c67a1b7c2c48e5c70a1c0c254156eec32', letter: 'c', pdf: 'G9' }];
const stemSha = q => crypto.createHash('sha1').update(q.replace(/\s+/g, '').toLowerCase()).digest('hex');
const isOldSubst = it => SUBST.some(s => it.includes(s.old));
const hasBridge = it => /data-guard-previous-stem-sha1="/.test(it.split('\n')[0]);
const strip = h => unrelabel(h.replace(/<!-- ap2-retro-1127:begin preguntas -->\n[\s\S]*?<!-- ap2-retro-1127:end -->\n/g, '').replace(/ *<!-- ap2-retro-1127:begin resumen -->[\s\S]*?<!-- ap2-retro-1127:end -->\n/g, '').replace(ITEM, m => (hasBridge(m) ? '' : m)));
const unc = h => h.replace(/<span>\d+ preguntas<\/span><span>\d+ basadas en preguntas de examen<\/span><span>\d+ variantes<\/span>/, '<span>STATS</span>').replace(/<small>\(\d+ preguntas\)<\/small>/g, '<small>(N)</small>');
const noOld = h => h.replace(ITEM, m => (isOldSubst(m) ? '' : m));
const FRASE_VIEJA = 'Dentro de cada bloque aparecen primero las preguntas <b>basadas en preguntas de examen</b> —reconstruidas a partir de materiales y recordaciones de la cátedra, no transcritas de una prueba—, con su respuesta comentada, y después las <b>variantes</b> escritas para reforzar el mismo concepto.';
const FRASE_NUEVA = 'Dentro de cada bloque las preguntas siguen el orden del propio bloque. Las <b>basadas en preguntas de examen</b> —reconstruidas a partir de materiales y recordaciones de la cátedra, no transcritas de una prueba— llevan ese rótulo y su respuesta comentada; las <b>variantes</b> y las complementarias están escritas para reforzar el mismo concepto.';
const now = unc(strip(raw).split(FRASE_NUEVA).join(FRASE_VIEJA)), main = unc(noOld(mainRaw));
const secIds = t => [...t.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]);
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); };
const parse = p => ({ raw: p, tag: txt((/<span class="quiz-tag[^>]*>([\s\S]*?)<\/span>/.exec(p) || [, ''])[1]), tagCls: (/<span class="(quiz-tag[^"]*)"/.exec(p) || [, ''])[1], qraw: (/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1], q: txt((/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1].replace(/<span class="quiz-tag[^>]*>[\s\S]*?<\/span>/, '')), strong: txt((/<strong>([\s\S]*?)<\/strong>/.exec(p) || [, ''])[1]), reveal: /class="reveal-btn" onclick="toggleAnswer\(this\)"/.test(p), ans: /<div class="answer">/.test(p), opts: [...p.matchAll(/<li>([a-d])\) ([\s\S]*?)<\/li>/g)].map(x => [x[1], txt(x[2])]), ul: (/<ul class="options">([\s\S]*?)<\/ul>/.exec(p) || [, ''])[1] });
const ins = []; for (const m of raw.matchAll(/<!-- ap2-retro-1127:begin preguntas -->\n([\s\S]*?)<!-- ap2-retro-1127:end -->\n/g)) ins.push({ at: m.index, its: [...m[1].matchAll(ITEM)].map(x => x[0]) });
const bankAt = raw.indexOf('id="bancoap2"');
const blk = ins.filter(x => x.at < bankAt), bnk = ins.filter(x => x.at > bankAt);
const subItems = h => [...h.matchAll(ITEM)].map(m => m[0]).filter(hasBridge);
console.log('\n▸ 1 · nada se perdió');
{
  const dif = secIds(mainRaw).filter(id => sec(now, id) !== sec(main, id)); ok(!dif.length, 'cada sección idéntica a la main (byte a byte) tras quitar solo lo marcado, las 4 sustituidas y los 2 rótulos reclasificados, y normalizar las cifras declaradas', dif);
  ok(secIds(raw).join() === secIds(mainRaw).join(), 'ids de sección iguales y en el mismo orden');
  const qs = h => [...h.matchAll(ITEM)].map(m => m[0]);
  const old = qs(relabel(noOld(mainRaw))), cur = new Set(qs(raw)); const lost = old.filter(x => !cur.has(x)); ok(old.length === 460 && !lost.length, `las ${old.length} copias de las 230 preguntas antiguas no sustituidas (bloque + banco) siguen idénticas, byte a byte (salvo el rótulo de las 2 reclasificadas)`, lost.length);
  const fr = t => [...t.matchAll(/<div class="flashcard">[\s\S]*?<\/div><\/div>/g)].map(m => m[0]); ok(fr(raw).length === fr(mainRaw).length && fr(mainRaw).every(x => fr(raw).includes(x)), `flashcards intactas (${fr(raw).length})`);
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|'); ok(img(raw) === img(mainRaw), 'imágenes: mismo conjunto de src');
  ok((raw.match(/<svg[\s>]/g) || []).length === (mainRaw.match(/<svg[\s>]/g) || []).length, 'SVG: misma cantidad');
  const ids = [...raw.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); ok(new Set(ids).size === ids.length && [...mainRaw.matchAll(/\bid="([^"]+)"/g)].every(m => ids.includes(m[1])), 'ningún id duplicado ni perdido');
  const g = (raw.match(/<!-- ap2-retro-1127:begin/g) || []).length, e = (raw.match(/<!-- ap2-retro-1127:end -->/g) || []).length; ok(g === e && g === 11, `marcadores balanceados (${g}/${e}): 5 tramos de preguntas en bloques + 5 en banco + 1 complemento de resumen (b06 velloso)`, [g, e]);
  ok(RELAB.every(st => raw.split(NEWT + ' ' + st).length === 3 && raw.split(OLDT + ' ' + st).length === 1), '2 preguntas reclasificadas: rótulo «Basada en preguntas de examen» en bloque y banco (2 copias cada una), ninguna quedó con el rótulo anterior');
  ok(raw.includes(FRASE_NUEVA) && mainRaw.includes(FRASE_VIEJA) && !raw.includes('aparecen primero las preguntas'), 'encabezado del banco: ya no promete un orden que no existe');
}
console.log('\n▸ 2 · sustituidas (lista explícita; puente de renombre = sha1 del enunciado anterior; misma letra; mismo lugar)');
{
  const S = subItems(raw);
  ok(S.length === 8, '8 copias sustituidas (4 preguntas × bloque y banco), cada una con su puente', S.length);
  for (const s of SUBST) {
    const viejas = [...mainRaw.matchAll(ITEM)].map(m => m[0]).filter(x => x.includes(s.old)), nuevas = S.filter(x => x.includes('data-guard-previous-stem-sha1="' + s.sha + '"'));
    const mv = viejas.map(v => parse(v)); const q0 = mv[0] && mv[0].q;
    const L = mv[0] && /^([a-d])\)/.exec(mv[0].strong); const nl = nuevas.map(x => { const p = parse(x); const m = /^([a-d])\)/.exec(p.strong); return m ? m[1] : null; });
    ok(viejas.length === 2 && nuevas.length === 2 && !raw.includes(s.old) && stemSha(q0) === s.sha && nuevas[0] === nuevas[1] && nuevas.every(x => hasBridge(x) && !x.includes(s.old)), `${s.pdf}: «${s.old.slice(0, 52)}…» → versión fiel al PDF; puente = sha1 del enunciado viejo; bloque = banco`, [viejas.length, nuevas.length, q0 && stemSha(q0)]);
    ok(s.pdf === 'C1' ? nl.every(l => l === null) : (L && nl.every(l => l === L[1])), s.pdf === 'C1' ? 'C1: pasa de opción múltiple a «Citá» (sin letra: el puente del Guard lo admite)' : `${s.pdf}: la letra correcta se conserva (${L && L[1]})`, [L && L[1], nl]);
  }
  const P = S.map(parse); ok(P.every(x => x.tag === 'Basada en preguntas de examen' && x.reveal && x.ans && x.strong), 'las sustituidas: rótulo examen, «Ver respuesta», respuesta destacada');
  const mc = P.filter(x => x.opts.length); ok(mc.length === 6 && mc.every(x => x.opts.length === 4 && new Set(x.opts.map(o => o[1])).size === 4 && x.opts.find(o => o[0] === /^([a-d])\)/.exec(x.strong)[1])[1] === x.strong.slice(3)), 'MC sustituidas: 4 alternativas distintas y respuesta = alternativa', mc.length);
  ok(!P.some(x => /<(b|strong|i|em|u|mark|font)\b|style=/i.test(x.qraw.replace(/<span class="quiz-tag[^>]*>[^<]*<\/span>/g, '')) || /<(b|strong|i|em|u|mark|span|font)\b|style=|\sclass=/i.test(x.ul)), 'sin negrita ni resaltado en enunciados ni opciones (sin pistas visuales)');
  for (const x of P.filter(y => y.opts.length && !/biomarcador sérico/.test(y.q))) { const L = /^([a-d])\)/.exec(x.strong)[1]; const cl = x.opts.find(o => o[0] === L)[1].length; ok(cl < Math.max(...x.opts.map(o => o[1].length)), 'la correcta no es la más larga en: ' + x.q.slice(0, 40)); }
}
console.log('\n▸ 3 · las 17 inserciones nuevas');
{
  const B = blk.map(x => x.its), K = bnk.map(x => x.its);
  ok(B.map(a => a.length).join() === '1,5,2,3,6' && K.map(a => a.length).join() === '1,5,2,3,6', 'tramos b03/b04/b05/b06/b07: 1, 5, 2, 3 y 6 (bloque y banco)', [B.map(a => a.length).join(), K.map(a => a.length).join()]);
  ok(B.flat().join('') === K.flat().join(''), 'bloque y banco idénticos, byte a byte (espejo, 0 divergencias)');
  const P = B.flat().map(parse);
  ok(P.length === 17 && P.every(x => x.tag === 'Basada en preguntas de examen' && x.tagCls === 'quiz-tag oficial'), 'las 17 rotuladas «Basada en preguntas de examen»');
  ok(!/Pregunta oficial|clave oficial|transcrip/i.test(P.map(x => x.raw).join(' ')), 'ninguna se presenta como «Pregunta oficial» ni como transcripción literal');
  ok(P.every(x => x.reveal && x.ans && x.strong), 'todas con «Ver respuesta» (toggleAnswer), bloque de respuesta y respuesta destacada');
  const mc = P.filter(x => x.opts.length); ok(mc.length === 2 && mc.every(x => x.opts.find(o => o[0] === /^([a-d])\)/.exec(x.strong)[1])[1] === x.strong.slice(3) && x.opts.find(o => o[0] === /^([a-d])\)/.exec(x.strong)[1])[1].length < Math.max(...x.opts.map(o => o[1].length))), '2 opciones múltiples (pólipo de mayor riesgo; factor de la esteatohepatitis) con respuesta = alternativa y la correcta no es la más larga; 15 de forma Citá/Completá/caso abierto', mc.length);
  ok(!P.some(x => /<(b|strong|i|em|u|mark|font)\b|style=/i.test(x.qraw.replace(/<span class="quiz-tag[^>]*>[^<]*<\/span>/g, '')) || /<(b|strong|i|em|u|mark|span|font)\b|style=|\sclass=/i.test(x.ul)), 'sin negrita ni resaltado en enunciados ni opciones (sin pistas visuales)');
  const viejos = new Set([...mainRaw.matchAll(ITEM)].map(m => norm(parse(m[0]).q))); ok(P.every(x => !viejos.has(norm(x.q))), 'ninguna repite literalmente el enunciado de una pregunta existente');
  ok(P.every(x => !/profesor|docente|la cátedra cobra|cobra en el examen/i.test(x.raw)), 'sin referencia a profesor ni a estrategia de examen');
  const t = P.map(x => norm(x.raw)).join(' ');
  ok(/anticonceptivos orales/.test(t) && /esteroides anabolizantes/.test(t), 'adenoma hepático: anticonceptivos orales y esteroides anabolizantes');
  ok(/inflamatorio/.test(t) && /esteatosis hepatica no alcoholica/.test(t) && /mayor riesgo de malignizacion/.test(t), 'subtipo inflamatorio ↔ esteatosis no alcohólica; β-catenina como mayor riesgo');
  ok(/fibroblastos de los espacios porta/.test(t) && /celulas estrelladas hepaticas/.test(t), 'cicatriz de la cirrosis: célula estrellada + fibroblastos portales');
  ok(/atrofia difusa/.test(t) && /metaplasia intestinal/.test(t), 'gastritis autoinmunitaria: atrofia difusa y metaplasia intestinal');
  ok(/tipo i de borrmann/.test(t) && /tipo ii de borrmann/.test(t) && /tipo iii/.test(t), 'Borrmann I, II y III (una pregunta cada tipo)');
  ok(/mas del 75% de componente velloso/.test(t) && /genes de reparacion|genes de ________ del adn|reparacion/.test(t) && /sesil serrado/.test(t), 'adenoma velloso (>75%) y adenoma sésil serrado → genes de reparación (MSI)');
  ok(/linfoma malt gastrico/.test(t) && /linfocito b de la zona marginal/.test(t) && /helicobacter pylori|h\. pylori/.test(t), 'caso MALT: diagnóstico + célula de origen + factor de riesgo en una sola pregunta (D9/E11/I16)');
  ok(/colitis ulcerosa/.test(t) && /megacolon toxico/.test(t) && /colangitis esclerosante primaria/.test(t), 'caso de colitis ulcerosa: diagnóstico + complicación intestinal grave + manifestación hepatobiliar (H11/G11)');
  ok(/celulas fusiformes|fusiformes/.test(t) && /celula intersticial de cajal/.test(t) && /granulomas no caseificantes/.test(t) && /enfermedad de crohn/.test(t), 'caso GIST: morfología + origen juntos (G10); caso Crohn: diagnóstico + granulomas + complicación (C17/F9/I11)');
  ok(/consumo de alcohol/.test(t) && /esteatohepatitis alcoholica/.test(t), 'caso de esteatohepatitis alcohólica → factor causal (H15)');
  ok(/nodulos displasicos/.test(t) && /miofibroblastos/.test(t) && !/vidrio esmerilado/.test(t), 'hígado: precursor displásico (E9/H10) y miofibroblastos (G6); F11 (vidrio esmerilado) NO se incorpora: sin fuente abierta leída');
  ok(/adenoma sesil serrado/.test(t) && /pólipo|polipo/.test(t), 'pólipo de mayor riesgo = adenoma sésil serrado (D12)');
}
console.log('\n▸ 4 · cifras declaradas = reales');
{
  const bk = sec(raw, 'bancoap2'), real = (raw.slice(0, bankAt).match(/class="quiz-item"/g) || []).length, realB = (bk.match(/class="quiz-item"/g) || []).length; ok(real === 251 && realB === 251, 'preguntas reales: 251 en los bloques y 251 en el banco (234 + 17; 4 sustituidas, ninguna retirada)', [real, realB]);
  const ex = (bk.match(/<span class="quiz-tag oficial[^"]*">/g) || []).length, va = (bk.match(/<span class="quiz-tag variante[^"]*">/g) || []).length;
  const st = /<span>(\d+) preguntas<\/span><span>(\d+) basadas en preguntas de examen<\/span><span>(\d+) variantes<\/span>/.exec(raw); ok(st && +st[1] === 251 && +st[2] === ex && +st[3] === va && ex === 191 && va === 60, `estadísticas declaradas = reales: ${st && st.slice(1).join(' · ')} (examen ${ex}, variantes ${va})`);
  const subs = [...bk.matchAll(/Bloque (\d+) · [^<]*<small>\((\d+) preguntas\)<\/small>/g)].map(m => +m[2]); const reales = bk.split('<h3 class="ap2-bank-sub">').slice(1, 9).map(s => (s.match(/class="quiz-item"/g) || []).length);
  ok(subs.join() === reales.join() && subs.join() === '38,32,26,33,30,29,46,17', 'cada tramo del banco declara su número real', [subs.join(), reales.join()]);
  const por = [1, 2, 3, 4, 5, 6, 7, 8].map(k => (sec(raw, 'ap2b0' + k).match(/class="quiz-item"/g) || []).length); ok(por.join() === subs.join(), 'bloque = banco por tramo', por.join());
  const exb = [1, 2, 3, 4, 5, 6, 7, 8].map(k => (sec(raw, 'ap2b0' + k).match(/<span class="quiz-tag oficial/g) || []).length); ok(exb.join() === '35,24,23,30,26,26,27,0' && exb.reduce((a, b) => a + b, 0) === 191, `basadas en examen por bloque: ${exb.join(', ')} (suma ${exb.reduce((a, b) => a + b, 0)})`);
}
console.log('\n▸ 5 · el resumen ya enseña lo que cada pregunta cobra (Lei 8-A.2: el resumen enseña → la pregunta cobra)');
{
  const COB = { ap2b03: ['atrofia', 'metaplasia intestinal', 'multifocal'], ap2b04: ['borrmann i ', 'borrmann ii ', 'borrmann iii', 'bordes sobresalientes', 'polipoide o fungoide', 'tumor ulcerado infiltrante', 'linfocito b de la zona marginal', 'lesiones linfoepiteliales', 'h. pylori', 'fusiformes', 'celula intersticial de cajal'], ap2b05: ['megacolon toxico', 'ileon terminal', 'ulcera', 'aftosa', 'abscesos cripticos', 'granuloma', 'colangitis esclerosante primaria', 'estenosis fibrosante'], ap2b06: ['75% velloso', 'sesil', 'adenoma sesil serrado', 'genes mmr', 'braf', 'invasion'], ap2b07: ['anticonceptivos orales', 'esteroides anabolizantes', 'inflamatorio', 'esteatosis hepatica no alcoholica', 'miofibroblasto', 'fibroblastos de los espacios porta', 'hnf1', 'catenina', 'nodulos displasicos', 'esteatosis macrovesicular', 'reaccion neutrofilica'] };
  for (const [b, ts] of Object.entries(COB)) { const s = sec(raw, b); const T = norm(s.slice(0, s.indexOf('<div class="quiz-section"'))); const falta = ts.filter(t => !T.includes(t)); ok(!falta.length, `${b}: ${ts.length} términos clave presentes en la enseñanza (fuera de las preguntas)`, falta); }
}
console.log('\n▸ 6 · navegador: «Ver respuesta» real en las copias nuevas y sustituidas');
(async () => {
  const { chromium } = require('playwright');
  const core = fs.readFileSync(path.join(REPO, REL + 'assets/app-core.js'), 'utf8');
  const fn = (nm) => { const i = core.indexOf('function ' + nm); let d = 0, j = core.indexOf('{', i); for (let k = j; k < core.length; k++) { if (core[k] === '{') d++; else if (core[k] === '}') { d--; if (!d) return core.slice(i, k + 1); } } };
  const toggle = fn('toggleAnswer');
  const items = ins.flatMap(x => x.its).concat(subItems(raw));
  const br = await chromium.launch(), pg = await br.newPage(); await pg.setContent('<body></body>'); await pg.addScriptTag({ content: toggle + ';window.toggleAnswer=toggleAnswer;' });
  let good = 0; const bad = [];
  for (const it of items) { await pg.evaluate(h => { document.body.innerHTML = h; }, it); const r = await pg.evaluate(() => { const b = document.querySelector('.reveal-btn'), a = document.querySelector('.answer'); const before = getComputedStyle(a).display; b.click(); return a.classList.contains('show') || getComputedStyle(a).display !== before; }); if (r) good++; else bad.push(it.slice(0, 80)); }
  ok(good === items.length && items.length === 42, `toggleAnswer abre la respuesta en ${good}/${items.length}`, bad);
  await br.close();
  console.log(`\nap2-retro-1127: ${n - ko}/${n}${ko ? ' — ' + ko + ' FALLAS' : ' OK'}`); process.exit(ko ? 1 : 0);
})();
