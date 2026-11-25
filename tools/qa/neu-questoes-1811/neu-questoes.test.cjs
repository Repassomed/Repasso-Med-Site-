/* Neurología · 16 preguntas «Basada en preguntas de examen» (#683). Atualizado em 18/11 (#687): as asserções de «idêntico à base de antes da #683» foram aposentadas
   (a #687 reordenou e equilibrou alternativas de todo o banco; o que continua garantido aqui é a forma das 16 e as contagens atuais). Invariantes de viés/ids: tools/qa/neu-8a1b. */
'use strict';
const cp = require('child_process'), fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const F = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const BASE = process.argv[2] || 'origin/main';
const { semCierre } = require('../neu-cierre/sem-cierre.cjs');   /* 20/11 · retirada do «Cierre» (ver tools/qa/neu-cierre): a base recebe a mesma troca */
const old = semCierre(cp.execFileSync('git', ['show', BASE + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString('utf8'));
const cur = fs.readFileSync(path.join(REPO, F), 'utf8');
let ok = 0, bad = 0; const T = (c, m) => { if (c) ok++; else { bad++; console.log('  ✗ FALHA:', m); } };
const ITEM = /<div class="quiz-item" id="(b?q-neu[\d-]+)">\n[\s\S]*?<\/div><\/div>\n/g;
const items = t => { const m = new Map(); for (const x of t.matchAll(ITEM)) m.set(x[1], x[0]); return m; };
const ic = items(cur);
const real0 = [...ic.keys()].filter(k => k.startsWith('q-')).length; T(ic.size === real0 * 2, 'itens atuais: ' + real0 + ' perguntas × 2 (bloco + banco) = ' + ic.size);
const ids = []; for (let n = 233; n <= 248; n++) ids.push('q-neu' + n); T(ids.every(i => ic.has(i) && ic.has('b' + i)), 'ids q-neu233…q-neu248 existem no bloco e no banco');
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
// 5) contagens declaradas × reais
const real = [...cur.matchAll(/<div class="quiz-item" id="q-neu[\d-]+">/g)].length;
const decl = /<h3>Las (\d+) preguntas/.exec(cur)[1]; T(+decl === real, 'banco declara ' + decl);
T(new RegExp('<b>' + real + '</b><span>Preguntas</span>').test(cur) && new RegExp('<span>' + real + ' preguntas</span>').test(cur), 'portada e banco declaram ' + real);
const mcqReal = [...cur.matchAll(/<div class="quiz-item" id="q-neu[\d-]+">\n<p class="quiz-question">[\s\S]*?quiz-tag mcq/g)].length;
const vfReal = [...cur.matchAll(/<div class="quiz-item" id="q-neu[\d-]+">\n<p class="quiz-question"><span class="quiz-tag [a-z ]*vf"/g)].length;
{ const todos = [...cur.matchAll(/<div class="quiz-item" id="q-neu[\d-]+">[\s\S]*?<\/div><\/div>\n/g)].map(m => m[0]); const TM = todos.filter(x => /class="options"/.test(x)).length, TV = todos.filter(x => /tf-btn/.test(x)).length; T(new RegExp('<b>' + TM + '</b><span>MCQ</span>').test(cur) && new RegExp('<b>' + TV + '</b><span>Verdadero o falso</span>').test(cur), 'banco declara ' + TM + ' MCQ e ' + TV + ' V/F'); }
const ba = cur.indexOf('id="banconeu"'); let soma = 0;
for (const m of cur.slice(ba).matchAll(/<div class="rmc-bank-sub">Bloque (\d\d) ·[^<]*<small>(\d+) preguntas<\/small><\/div>\n<div class="quiz-section">([\s\S]*?)(?=<div class="rmc-bank-sub">|<\/section>)/g)) {
  const n = (m[3].match(/class="quiz-item"/g) || []).length; soma += n; T(+m[2] === n, 'banco, bloco ' + m[1] + ': declara ' + m[2] + ', tem ' + n);
}
T(soma === real, 'soma dos grupos do banco = ' + real + ' (' + soma + ')');
// 6) ids únicos e sem enunciado repetido entre as 16 novas
const stems = ids.map(i => ic.get(i).match(/<p class="quiz-question">([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
T(new Set(stems).size === 16, '16 enunciados distintos');
T(new Set([...cur.matchAll(/id="(q-neu[\d-]+)"/g)].map(x => x[1])).size === real, 'ids únicos nos blocos');
console.log('\nneu-questoes-1811: ' + ok + '/' + (ok + bad) + ' verificações OK' + (bad ? ' — ' + bad + ' FALHAS' : ''));
process.exit(bad ? 1 : 0);
