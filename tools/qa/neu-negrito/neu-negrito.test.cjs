/* Neurología · correção urgente do negrito (19/11). Estático. Base = main d9ef1072.
   Comprova: nenhuma ênfase/cor/símbolo nas alternativas e no enunciado dos V/F (bloco e banco), e que NADA mais mudou:
   mesmos ids, mesmos enunciados das MCQ, mesmas alternativas (texto), mesmo gabarito e a explicação (div.answer) idêntica byte a byte. */
'use strict';
const fs = require('fs'), cp = require('child_process'), path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
/* #682: os 13 infográficos de resumo (figuras `neuro-b2N-0N-…` no fim dos blocos 20–27) são acréscimo conhecido; esta checagem só os ignora (o número exato e a posição são verificados em neu-glosario.test.cjs). */
const FIG_682 = /  <figure class="rmc-fig"><div class="rmc-zoom"><img class="rmc-photo" src="\/assets\/img\/neuro\/neuro-b2\d-0\d-[^"]*"[\s\S]*?<\/figure>\n/g;
const cur = fs.readFileSync(path.join(REPO, REL), 'utf8').replace(FIG_682, '');
const base = cp.execSync('git show d9ef1072:"' + REL + '"', { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let ok = 0, bad = 0; const T = (c, m) => { if (c) ok++; else { bad++; console.log('  ✗ FALHA:', m); } };
const items = h => { const o = {}; const re = /<div class="quiz-item" id="((?:q|bq)-neu[\d-]+)">/g; let m; while ((m = re.exec(h))) { const j = h.indexOf('</div></div>\n', m.index) + 13; o[m[1]] = h.slice(m.index, j); } return o; };
const A = items(base), B = items(cur);
const EMP = /<\/?(?:b|i|strong|em|u|mark|font)\b[^>]*>/i, STY = /style=|color|class="(?!quiz-tag)|[✓✔✅❌✗⭐★👉]/;
const optsZone = h => (h.match(/<ul class="options">([\s\S]*?)<\/ul>/) || [])[1];
const vfStem = h => /tf-buttons/.test(h) ? (h.match(/<p class="quiz-question">((?:<span class="quiz-tag[^"]*">[^<]*<\/span>)+)([\s\S]*?)<\/p>/) || [])[2] : null;
const answerOf = h => (h.match(/<div class="answer">[\s\S]*$/) || [''])[0];
const strip = x => x.replace(/<\/?(?:b|i|strong|em|u|mark)>/g, '').replace(/checkTF\(this, (?:true|false)\)/g, 'checkTF(this, X)');
T(Object.keys(A).join() === Object.keys(B).join() && Object.keys(B).length === 508, 'mesmos 508 ids (254 no bloco + 254 no banco), mesma ordem: ' + Object.keys(B).length);
let nOpt = 0, nVf = 0, nMcq = 0, nVfAll = 0;
for (const k of Object.keys(B)) {
  const a = A[k], b = B[k]; if (!a) continue;
  const oz = optsZone(b), vs = vfStem(b);
  if (oz != null) { nMcq++; T(!EMP.test(oz), 'sem ênfase nas alternativas ' + k); T(!STY.test(oz.replace(/<li>/g, '')), 'sem cor/símbolo nas alternativas ' + k); T(/^(<li>[a-d]\) [^<]*<\/li>)+$/.test(oz), 'alternativas só com texto ' + k); if (EMP.test(optsZone(a))) nOpt++; }
  if (vs != null) { nVfAll++; T(!EMP.test(vs), 'sem ênfase no enunciado V/F ' + k); T(!STY.test(vs), 'sem cor/símbolo no enunciado V/F ' + k); if (EMP.test(vfStem(a))) nVf++; }
  T(answerOf(a) === answerOf(b), 'explicação/gabarito idênticos à main ' + k);
  /* a única diferença permitida: tirar b/i/strong/em/u/mark das alternativas e do enunciado V/F */
  const norm = h => oz != null || vs != null ? strip(h.replace(/<div class="answer">[\s\S]*$/, '')) : h.replace(/<div class="answer">[\s\S]*$/, '');
  T(norm(a) === norm(b), 'nada mais mudou fora da ênfase ' + k);
  /* o argumento de checkTF só pode mudar nos 10 V/F corrigidos (ver tools/qa/neu-vf) */
  if (!/^(?:b?q)-neu(?:235|237|239|186|196|201|208|215|222|228)$/.test(k)) T((a.match(/checkTF\(this, (true|false)\)/g) || []).join() === (b.match(/checkTF\(this, (true|false)\)/g) || []).join(), 'checkTF inalterado ' + k);
}
T(nOpt === 114 && nVf === 120, 'alterados: ' + nOpt + ' MCQ (alternativas) e ' + nVf + ' V/F (enunciado), bloco + banco');
/* o resto do arquivo é idêntico à main */
const outside = t => t.replace(/<div class="quiz-item" id="(?:q|bq)-neu[\d-]+">[\s\S]*?<\/div><\/div>\n/g, '');
T(outside(base) === outside(cur), 'tudo fora das perguntas é idêntico à main (grifos/âncoras/imagens/ensino)');
console.log('neu-negrito (estático): ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);
