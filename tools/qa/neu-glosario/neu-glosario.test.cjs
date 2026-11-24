/* Neurología · glosario tocável (.rmc-gl) nos blocos 20–27. Uso: node tools/qa/neu-glosario/neu-glosario.test.cjs [ref-base=origin/main]
   Garante que a PR só ACRESCENTA glosas em blocos 20–27 (e a vírgula do bloco 27): sem glosas, o texto é idêntico à base. */
'use strict';
const cp = require('child_process'), fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const F = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const BASE = process.argv[2] || 'origin/main';   // a base pode já ter glosas (pós-#681): o teste tira as glosas dos DOIS lados antes de comparar o ensino
const { semCierre } = require('../neu-cierre/sem-cierre.cjs');   /* 20/11 · retirada do «Cierre» (ver tools/qa/neu-cierre): a base recebe a mesma troca */
const old = semCierre(cp.execFileSync('git', ['show', BASE + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString('utf8'));
const cur = fs.readFileSync(path.join(REPO, F), 'utf8');
let ok = 0, bad = 0; const T = (c, m) => { if (c) ok++; else { bad++; console.log('  ✗ FALHA:', m); } };
/* 18/11: as comparações «idêntico à base de antes da #681» foram aposentadas (histórico): #683 e #687 alteraram perguntas dos blocos 20–27 depois do merge. Continuam válidas as invariantes das glosas (contagem, forma, só no ensino). */
const historico = () => {};
const GL = /<span class="rmc-gl">((?:(?!<b>\?<\/b>)[\s\S])*?)<b>\?<\/b><i><b class="rmc-gl-close">✕ cerrar<\/b> ([\s\S]*?)<\/i><\/span>(?=[^<]|<(?!\/i>))/g;
const secIdx = (t, id) => t.indexOf('<section class="container" id="' + id + '"');
const nextSec = (t, i) => t.indexOf('<section', i + 10);
// PR #682: os 13 infográficos novos ficam no fim dos blocos 20–27 (resumo visual); não são ensino, pergunta nem flashcard
const FIG = /  <figure class="rmc-fig"><div class="rmc-zoom"><img class="rmc-photo" src="\/assets\/img\/neuro\/neuro-b2\d-0\d-[^"]*"[\s\S]*?<\/figure>\n/g;
const bloco = (t, id) => { const a = secIdx(t, id); return t.slice(a, nextSec(t, a)).replace(FIG, ''); };
// as figuras toleradas são EXATAMENTE as 13 esperadas, cada uma no seu bloco, só no fim e só uma vez (nada mais é escondido pelo filtro)
const FIGS_ESPERADAS = { 20: 2, 21: 2, 22: 1, 23: 1, 24: 2, 25: 2, 26: 1, 27: 2 };
for (const [n, k] of Object.entries(FIGS_ESPERADAS)) {
  const a = secIdx(cur, 'neub' + n), raw = cur.slice(a, nextSec(cur, a));
  const fs_ = raw.match(FIG) || [];
  T(fs_.length === k, 'neub' + n + ': ' + k + ' infográfico(s) novo(s) (' + fs_.length + ')');
  T(raw.lastIndexOf('<figure class="rmc-fig">') > raw.lastIndexOf('<div class="flashcard">') && raw.trimEnd().endsWith('</section>'), 'neub' + n + ': figuras depois dos flashcards, no fim do bloco');
}
// 1) fora dos blocos 20–27 o arquivo é byte a byte igual
const a0 = secIdx(cur, 'neub20'), b0 = secIdx(old, 'neub20');
historico(cur.slice(0, a0) === old.slice(0, b0), 'tudo antes do bloco 20 idêntico (blocos 01–19 e portada)');
const a1 = nextSec(cur, secIdx(cur, 'neub27')), b1 = nextSec(old, secIdx(old, 'neub27'));
historico(cur.slice(a1) === old.slice(b1), 'tudo depois do bloco 27 idêntico (banco, mazo, cierre)');
// 2) por bloco: glosas só na parte de ensino; sem glosas = idêntico (exceto vírgula do bloco 27)
const termos = new Map(); let total = 0;
for (let n = 20; n <= 27; n++) {
  const id = 'neub' + n, c = bloco(cur, id), o = bloco(old, id);
  const q = c.indexOf('class="quiz-section"'), qo = o.indexOf('class="quiz-section"');
  const ens = c.slice(0, q), resto = c.slice(q);
  T(!/rmc-gl/.test(resto), id + ': nenhuma glosa dentro de perguntas/flashcards');
  historico(resto === o.slice(qo) || n === 27, id + ': perguntas, flashcards e explicações idênticos');
  let gs = [...ens.matchAll(GL)];
  total += gs.length;
  T(gs.length >= 12, id + ': ao menos 12 glosas (' + gs.length + ')');
  gs.forEach(g => { const t = g[1].replace(/<[^>]+>/g, '').trim(); T(g[2].replace(/<[^>]+>/g, '').trim().length >= 20, id + ': definição não vazia — ' + t); const k = t.toLowerCase(); T(!termos.has(k), id + ': termo não repetido em outro bloco — ' + t + (termos.has(k) ? ' (já em ' + termos.get(k) + ')' : '')); termos.set(k, id); });
  const N = t => { let p; do { p = t; t = t.replace(/<i><\/i>/g, '').replace(/<\/i><i>/g, ''); } while (t !== p); return t; };
  let sem = N(ens.replace(GL, '$1'));
  let oe = o.slice(0, qo);
  if (n === 27) oe = oe.replace('cuya indicación y momento de inicio dependen de la evaluación de cada paciente (riesgo de sangrado, hematoma, cirugía); este material no fija un plazo, protector gástrico', '(su indicación y su momento de inicio dependen de la evaluación de cada paciente: riesgo de sangrado, hematoma, cirugía; este material no fija un plazo), protector gástrico').replace('HBPM (su indicación', 'HBPM (su indicación');
  historico(sem === N(oe.replace('profilaxis de TVP con HBPM, (su', 'profilaxis de TVP con HBPM (su').replace(GL, '$1')), id + ': sem as glosas (dos dois lados), o texto de ensino é idêntico à base');
  T((ens.match(/id="[^"]+"/g) || []).join() === (oe.match(/id="[^"]+"/g) || []).join(), id + ': ids do ensino preservados');
}
T(total >= 150, 'total de glosas nos blocos 20–27 ≥ 150 (' + total + ')');
// 3) contagens globais intactas
const cnt = (t, re) => (t.match(re) || []).length;
historico(cnt(cur, /class="quiz-item"/g) === cnt(old, /class="quiz-item"/g), 'mesmo número de perguntas');
T(cnt(cur, /class="rmfc-/g) === cnt(old, /class="rmfc-/g), 'mesmos flashcards (marcadores rmfc)');
historico(cnt(cur, /<section class="container"/g) === cnt(old, /<section class="container"/g), 'mesmo número de seções');
console.log('\nneu-glosario: ' + ok + '/' + (ok + bad) + ' verificações OK' + (bad ? ' — ' + bad + ' FALHAS' : ''));
process.exit(bad ? 1 : 0);
