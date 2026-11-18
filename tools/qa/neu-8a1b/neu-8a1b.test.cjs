/* Neurología · revisión 8-A.1-B (19/11): duplicados retirados, preguntas reformuladas y nuevas. Estático. Base = main 1ea1021f. */
'use strict';
const fs = require('fs'), cp = require('child_process'), path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const cur = fs.readFileSync(path.join(REPO, REL), 'utf8');
const base = cp.execSync('git show 1ea1021f:"' + REL + '"', { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let ok = 0, bad = 0; const T = (c, m) => { if (c) { ok++; } else { bad++; console.log('  ✗ FALHA:', m); } };
const items = h => { const o = {}; const re = /<div class="quiz-item" id="((?:q|bq)-neu[\d-]+)">/g; let m; while ((m = re.exec(h))) { const j = h.indexOf('</div></div>\n', m.index); o[m[1]] = h.slice(m.index, j + 13); } return o; };
const A = items(base), B = items(cur);
const REPURPOSED = ['233', '234'], NEWID = ['249', '250', '251', '252', '253', '254', '255'];
const CHANGED = ['233', '234', '-2509-03', '090', '091', '134', '135', '181', '224'];
const ids = Object.keys(B); T(ids.length === 522, '522 itens (261 + 261 espelhos): ' + ids.length);
for (const p of ['q', 'bq']) {
  for (const r of REPURPOSED) { T(p + '-neu' + r in B, 'id preservado e funcional ' + p + '-neu' + r); T(/tf-btn/.test(B[p + '-neu' + r]), 'reaproveitado como V/F distinto ' + r); }
  for (const n of NEWID) T(p + '-neu' + n in B, 'nova ' + p + '-neu' + n);
}
const exp = new Set(); for (const p of ['q', 'bq']) { for (const c of CHANGED) exp.add(p + '-neu' + c); }
for (const k of Object.keys(A)) { T(k in B, 'id preservado ' + k); if (k in B && !exp.has(k)) T(A[k] === B[k], 'idêntica ' + k); }
for (const k of Object.keys(B)) if (k.startsWith('q-')) T(B[k].replace('id="q-', 'id="bq-') === B['b' + k], 'espelho bloco = banco ' + k);
const mcqs = [], letters = {};
for (const k of Object.keys(B)) {
  if (!k.startsWith('q-')) continue; const h = B[k];
  T(!/Pregunta oficial/i.test(h), 'sem «Pregunta oficial» ' + k);
  const lis = [...h.matchAll(/<li>([a-d])\) (.*?)<\/li>/g)];
  if (lis.length) {
    T(lis.length === 4, '4 alternativas ' + k);
    const m = h.match(/<div class="answer"><p><strong>([a-d])\) (.*?)<\/strong>/); T(!!m, 'resposta ' + k);
    if (m) { const li = lis.find(x => x[1] === m[1]); if (/neu(090|091|135|181|224|249|25[0-5])$/.test(k)) T(li && li[2] === m[2], 'resposta = alternativa ' + k); letters[m[1]] = (letters[m[1]] || 0) + 1; }
  } else if (h.includes('tf-btn')) T(/<strong>(VERDADERO|FALSO)\.?<\/strong>/.test(h), 'V/F válido ' + k);
}
const tot = Object.values(letters).reduce((a, b) => a + b, 0); for (const l in letters) T(letters[l] / tot < 0.4, 'letra ' + l + ' < 40%: ' + letters[l] + '/' + tot);
for (const n of ['090', '091', '135', '181', '224', ...NEWID]) T(/quiz-tag oficial/.test(B['q-neu' + n].slice(0, 160)), 'rótulo de exame ' + n);
/* contagens declaradas */
const nq = Object.keys(B).filter(k => k.startsWith('q-')).length;
T(cur.includes('<h3>Las ' + nq + ' preguntas de la asignatura, reunidas y en orden</h3>') && cur.includes('<div><b>' + nq + '</b><span>Preguntas</span></div>') && cur.includes('<span>' + nq + ' preguntas</span>'), 'total declarado = ' + nq);
const mcq = Object.keys(B).filter(k => k.startsWith('q-') && /class="options"/.test(B[k])).length, vf = Object.keys(B).filter(k => k.startsWith('q-') && /tf-btn/.test(B[k])).length;
T(cur.includes('<div><b>' + mcq + '</b><span>MCQ</span></div>'), 'MCQ declarado = ' + mcq); T(cur.includes('<div><b>' + vf + '</b><span>Verdadero o falso</span></div>'), 'V/F declarado = ' + vf);
for (let b = 1; b <= 27; b++) {
  const n2 = String(b).padStart(2, '0'); const a = cur.indexOf('<section class="container" id="neub' + n2 + '"'); const e = cur.indexOf('<section', a + 10); const sec = cur.slice(a, e);
  const q = sec.indexOf('<div class="quiz-section">'), fc = sec.indexOf('<h3>🎴 Flashcards'); const part = sec.slice(q, fc);
  const real = (part.match(/<div class="quiz-item" id="q-neu[\d-]+">/g) || []).length;
  const m = sec.match(/Preguntas del bloque \d\d<\/h3>\s*<p>(\d+) preguntas/); if (m) T(+m[1] === real, 'cabeçalho do bloco ' + n2 + ' (' + m[1] + ' × ' + real + ')');
  const bm = cur.match(new RegExp('Bloque ' + n2 + ' · [^<]*<small>(\\d+) preguntas</small>')); if (bm) { const ba = cur.indexOf('id="banconeu"'); const st = cur.indexOf(bm[0], ba); const nx = cur.indexOf('<div class="rmc-bank-sub">Bloque', st + 10); const g = cur.slice(st, nx < 0 ? undefined : nx); T(+bm[1] === (g.match(/id="bq-neu[\d-]+"/g) || []).length, 'subtítulo do banco ' + n2); }
}
/* o resumo ensina antes de cobrar */
T(/predominio del tono <b>parasimpático<\/b> \(fisiología general\)/.test(cur), 'ensina: NREM parasimpático');
T(/humor fuera de lugar \(<b>moria<\/b>\)/.test(cur), 'ensina: moria');
T(/<b>Distonía paroxística<\/b> y otros <b>movimientos anormales<\/b>/.test(cur), 'ensina: distonía paroxística');
T(/buen pronóstico si se drena a tiempo<\/b> —el parénquima/.test(cur), 'ensina: epidural pronóstico');
T(!/con disfunción de la <b>médula espinal<\/b>/.test(B['q-neu-2509-03']), 'tijeras sem obrigatoriedade medular');
T(/no publicó la clave|no publicó clave/.test(B['q-neu135']) && /selección según el tipo de crisis/.test(B['q-neu135']), 'q-neu135: clave não oficial declarada + slide');
/* 233/234: já não duplicam as canônicas (enunciados e conceitos diferentes) */
T(!/marcha «en tijeras»\./.test(B['q-neu233']) && /segador/.test(B['q-neu233']), '233 não repete q-neu-2509-03');
T(!/neuralgia del trigémino/i.test(B['q-neu234']) && /Eaton-Lambert/.test(B['q-neu234']), '234 não repete q-neu-2509-05');
console.log('neu-8a1b (estático): ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);

