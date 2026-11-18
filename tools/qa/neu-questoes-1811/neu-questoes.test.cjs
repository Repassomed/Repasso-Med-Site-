/* Neurología · 16 preguntas «Basada en preguntas de examen» (18/11). Uso: node tools/qa/neu-questoes-1811/neu-questoes.test.cjs [ref-base=origin/main]
   Garante: nada de lo anterior mudou (cada pergunta antiga idêntica, flashcards idênticos, ensino idêntico salvo 2 acréscimos declarados), as 16 novas estão
   bem formadas e espelhadas no banco, e as contagens declaradas batem com as reais. */
'use strict';
const cp = require('child_process'), fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const F = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const BASE = process.argv[2] || 'origin/main';
const old = cp.execFileSync('git', ['show', BASE + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString('utf8');
const cur = fs.readFileSync(path.join(REPO, F), 'utf8');
let ok = 0, bad = 0; const T = (c, m) => { if (c) ok++; else { bad++; console.log('  ✗ FALHA:', m); } };
const ITEM = /<div class="quiz-item" id="(b?q-neu[\d-]+)">\n[\s\S]*?<\/div><\/div>\n/g;
const items = t => { const m = new Map(); for (const x of t.matchAll(ITEM)) m.set(x[1], x[0]); return m; };
const io = items(old), ic = items(cur);
T(io.size === 238 * 2, 'base: 238 perguntas × 2 (bloco + banco) = ' + io.size);
T(ic.size === 254 * 2, 'agora: 254 perguntas × 2 = ' + ic.size);
// 1) toda pergunta antiga idêntica
let alt = 0; for (const [k, v] of io) if (ic.get(k) !== v) alt++;
T(alt === 0, 'nenhuma pergunta antiga foi alterada (' + alt + ' alteradas)');
// 2) as 16 novas
const nuevos = [...ic.keys()].filter(k => !io.has(k));
T(nuevos.length === 32, '32 itens novos (16 + 16 espelhos): ' + nuevos.length);
const ids = nuevos.filter(k => k.startsWith('q-')).sort();
T(ids.length === 16 && ids[0] === 'q-neu233' && ids[15] === 'q-neu248', 'ids q-neu233…q-neu248');
let mcq = 0, vf = 0, def = 0; const letras = {};
for (const id of ids) {
  const a = ic.get(id), b = ic.get('b' + id);
  T(!!b && b.replace('id="b' + id + '"', 'id="' + id + '"') === a, id + ': espelho do banco idêntico');
  T(/quiz-tag oficial/.test(a) && /Basada en preguntas de examen|basada en examen/.test(a), id + ': rótulo «Basada en preguntas de examen»');
  T(!/Pregunta oficial/i.test(a), id + ': não alega «Pregunta oficial»');
  if (/quiz-tag mcq/.test(a)) {
    mcq++; const ops = [...a.matchAll(/<li>([abcd])\) /g)].map(x => x[1]).join('');
    T(ops === 'abcd', id + ': 4 alternativas a–d');
    const r = /<div class="answer"><p><strong>([abcd])\) /.exec(a); T(!!r, id + ': resposta marcada'); if (r) letras[r[1]] = (letras[r[1]] || 0) + 1;
    const body = a.slice(a.indexOf('<div class="answer">')); const outras = [...body.matchAll(/<p>([abcd])\) /g)].map(x => x[1]);
    T(!outras.includes(r && r[1]), id + ': «as outras» não repete a letra correta');
  } else if (/tf-btn/.test(a)) { vf++; T(/<strong>(VERDADERO|FALSO)\.<\/strong>/.test(a), id + ': V/F com veredito'); }
  else if (/define/.test(a)) { def++; T(/reveal-btn/.test(a), id + ': completar com «Ver respuesta»'); }
  else T(false, id + ': tipo reconhecido');
}
T(mcq === 9 && vf === 3 && def === 4, 'tipos: 9 MCQ + 3 V/F + 4 completar (' + [mcq, vf, def] + ')');
const maxL = Math.max(...Object.values(letras)); T(maxL / mcq <= 0.4, 'letras corretas sem padrão: ' + JSON.stringify(letras));
// 3) ensino idêntico salvo acréscimos declarados
const secIdx = (t, id) => t.indexOf('<section class="container" id="' + id + '"');
// PR #682: os 13 infográficos novos (resumo visual no fim dos blocos 20–27) não são ensino, pergunta nem flashcard; a presença exata deles é verificada em neu-glosario.test.cjs
const FIG = /  <figure class="rmc-fig"><div class="rmc-zoom"><img class="rmc-photo" src="\/assets\/img\/neuro\/neuro-b2\d-0\d-[^"]*"[\s\S]*?<\/figure>\n/g;
const bloco = (t, id) => { const a = secIdx(t, id); return t.slice(a, t.indexOf('<section', a + 10)).replace(FIG, ''); };
const strip = h => h.replace(ITEM, '').replace(/\n{2,}/g, '\n'); // sem perguntas (e sem linhas em branco)
const PL_ANCLA = '</p><h3>2 · Cuándo la punción lumbar es peligrosa</h3>';
const PL_NUEVO = '</p><p><b>Cuándo se indica, en la práctica.</b> Ante la sospecha de una <b>infección del sistema nervioso</b> (meningitis, encefalitis); de una <b>hemorragia subaracnoidea</b> cuando la TAC es negativa; de una enfermedad <b>inflamatoria o desmielinizante</b> (Guillain-Barré, esclerosis múltiple); y con fines terapéuticos o de alivio en el pseudotumor cerebral y en la hidrocefalia de presión normal.</p><h3>2 · Cuándo la punción lumbar es peligrosa</h3>';
const EDITS = [
  ['neub20', PL_ANCLA, PL_NUEVO],
  ['neub27', '<td><b>Comunicante</b> (la más frecuente; fibrosis de las vellosidades aracnoideas; tríada de Hakim-Adams) u <b>obstructiva</b> (compresión del acueducto; alto riesgo).</td>', '<td><b>Comunicante</b> (la más frecuente): el LCR circula libremente entre los ventrículos y el espacio subaracnoideo, pero falla su <b>reabsorción</b> por fibrosis de las vellosidades aracnoideas (tras una meningitis o sangre en ese espacio); tríada de Hakim-Adams. <b>Obstructiva:</b> hay un <b>bloqueo dentro del sistema ventricular</b> (por ejemplo, la compresión del acueducto); alto riesgo.</td>']];
const normHead = h => h.replace(/(<h3>(?:🧩|✍️) Preguntas del bloque \d+<\/h3>\n<p>)[^<]*(<\/p>)/, '$1#$2');
const tocados = new Set(['neub03', 'neub09', 'neub17', 'neub18', 'neub20', 'neub21', 'neub27']);
for (let n = 1; n <= 27; n++) {
  const id = 'neub' + String(n).padStart(2, '0'); let c = bloco(cur, id), o = bloco(old, id);
  if (!tocados.has(id)) { T(c === o, id + ': bloco idêntico à base'); continue; }
  let cs = normHead(strip(c)), os = normHead(strip(o));
  for (const [b, x, y] of EDITS) if (b === id) { T(os.includes(x), id + ': trecho base presente'); os = os.replace(x, y); }
  T(cs === os, id + ': sem as perguntas novas, o bloco é idêntico à base (salvo acréscimos declarados e a contagem do cabeçalho)');
  T(c.slice(c.indexOf('<h3>🎴 Flashcards')) === o.slice(o.indexOf('<h3>🎴 Flashcards')), id + ': flashcards idênticos');
}
// 4) fora dos blocos: só o banco/portada (contadores e 1 frase) mudam
const antes = cur.slice(0, secIdx(cur, 'neub01')), antesO = old.slice(0, secIdx(old, 'neub01'));
T(antes.replace('<span>254 preguntas</span>', '<span>238 preguntas</span>') === antesO, 'portada: só o contador 238 → 254');
const bk = t => t.slice(t.indexOf('id="banconeu"'));
const bkc = strip(bk(cur)), bko = strip(bk(old));
const norm = t => t.replace(/<small>\d+ preguntas<\/small>/g, '<small>#</small>').replace(/<b>\d+<\/b><span>(Preguntas|MCQ|Verdadero o falso)<\/span>/g, '<b>#</b><span>$1</span>').replace(/Las \d+ preguntas/, 'Las # preguntas').replace(/En los <b>bloques 20 a 27[\s\S]*?cuando fue necesario\./, 'FRASE').replace(/Desde el <b>bloque 20<\/b>[\s\S]*?basada en preguntas de examen»\./, 'FRASE');
T(norm(bkc) === norm(bko), 'banco: igual à base (menos contadores, rótulos de grupo e 1 frase de apresentação)');
// 5) contagens declaradas × reais
const real = [...cur.matchAll(/<div class="quiz-item" id="q-neu[\d-]+">/g)].length;
T(real === 254, 'perguntas reais nos blocos = 254');
const decl = /<h3>Las (\d+) preguntas/.exec(cur)[1]; T(+decl === real, 'banco declara ' + decl);
T(/<b>254<\/b><span>Preguntas<\/span>/.test(cur) && /<span>254 preguntas<\/span>/.test(cur), 'portada e banco declaram 254');
const mcqReal = [...cur.matchAll(/<div class="quiz-item" id="q-neu[\d-]+">\n<p class="quiz-question">[\s\S]*?quiz-tag mcq/g)].length;
const vfReal = [...cur.matchAll(/<div class="quiz-item" id="q-neu[\d-]+">\n<p class="quiz-question"><span class="quiz-tag [a-z ]*vf"/g)].length;
T(/<b>168<\/b><span>MCQ<\/span>/.test(cur) && /<b>62<\/b><span>Verdadero o falso<\/span>/.test(cur), 'banco declara 168 MCQ e 62 V/F');
const ba = cur.indexOf('id="banconeu"'); let soma = 0;
for (const m of cur.slice(ba).matchAll(/<div class="rmc-bank-sub">Bloque (\d\d) ·[^<]*<small>(\d+) preguntas<\/small><\/div>\n<div class="quiz-section">([\s\S]*?)(?=<div class="rmc-bank-sub">|<\/section>)/g)) {
  const n = (m[3].match(/class="quiz-item"/g) || []).length; soma += n; T(+m[2] === n, 'banco, bloco ' + m[1] + ': declara ' + m[2] + ', tem ' + n);
}
T(soma === 254, 'soma dos grupos do banco = 254 (' + soma + ')');
// 6) ids únicos e sem enunciado repetido entre as 16 novas
const stems = ids.map(i => ic.get(i).match(/<p class="quiz-question">([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
T(new Set(stems).size === 16, '16 enunciados distintos');
T(new Set([...cur.matchAll(/id="(q-neu[\d-]+)"/g)].map(x => x[1])).size === real, 'ids únicos nos blocos');
console.log('\nneu-questoes-1811: ' + ok + '/' + (ok + bad) + ' verificações OK' + (bad ? ' — ' + bad + ' FALHAS' : ''));
process.exit(bad ? 1 : 0);
