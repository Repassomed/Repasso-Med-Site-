/* Neurología · revisión 8-A.1-B + auditoría de viés (18/11). Estático. Base = main 1ea1021f.
   Comprueba: ids preservados, espelho bloco = banco, nenhuma pista visual (negrito/ênfase) nas alternativas e nos V/F,
   letra correta equilibrada e sem padrão, correta não sistematicamente a mais longa, notas de reconstrução, contagens declaradas. */
'use strict';
const fs = require('fs'), cp = require('child_process'), path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const cur = fs.readFileSync(path.join(REPO, REL), 'utf8');
const base = cp.execSync('git show 1ea1021f:"' + REL + '"', { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let ok = 0, bad = 0; const T = (c, m) => { if (c) { ok++; } else { bad++; console.log('  ✗ FALHA:', m); } };
const items = h => { const o = {}; const re = /<div class="quiz-item" id="((?:q|bq)-neu[\d-]+)">/g; let m; while ((m = re.exec(h))) { const j = h.indexOf('</div></div>\n', m.index); o[m[1]] = h.slice(m.index, j + 13); } return o; };
const txt = x => x.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const stemOf = h => txt((h.match(/<p class="quiz-question">([\s\S]*?)<\/p>/) || [])[1] || '').replace(/^(Basada en preguntas de examen|Pregunta complementaria|Verdadero o falso · basada en examen|Verdadero o falso)\s*(MCQ|DEFINE)?\s*/, '');
const optsOf = h => [...((h.match(/<ul class="options">([\s\S]*?)<\/ul>/) || [])[1] || '').matchAll(/<li>([a-d])\) ([\s\S]*?)<\/li>/g)].map(m => m[2]);
const corrOf = h => { const m = h.match(/<div class="answer"><p><strong>([a-d])\) /); return m ? m[1] : null; };
const A = items(base), B = items(cur);
const KEEP = ['233', '234'], NEWID = ['249', '250', '251', '252', '253', '254', '255', '256', '257', '258', '259', '260', '261', '262', '263', '264', '265', '266', '267', '268', '269', '270', '271', '272', '273', '274', '275', '276', '277', '278', '279', '280', '281', '282', '283', '284'];
const REWORDED = new Set(["-2509-01", "-2509-05", "002", "005", "007", "011", "014", "015", "016", "025", "026", "032", "043", "044", "046", "048", "051", "057", "058", "060", "061", "064", "066", "067", "068", "071", "073", "075", "078", "081", "082", "086", "087", "090", "091", "093", "099", "101", "102", "109", "111", "114", "115", "120", "121", "123", "124", "130", "132", "135", "138", "144", "145", "146", "173", "175", "179", "180", "182", "183", "184", "187", "188", "190", "191", "192", "193", "197", "199", "203", "205", "207", "210", "212", "213", "214", "217", "219", "224", "225", "232", "234", "238", "242", "243", "244", "247", "248", "249", "250"]); /* alternativas reescritas na revisão de viés: mesmo conceito e mesma resposta */
const STEM_CHANGED = new Set(['135', '090', '181', '224', '249']); /* enunciado reformulado (8-A.1-B) */
const nq = Object.keys(B).filter(k => k.startsWith('q-')).length;
T(nq === 290 && Object.keys(B).length === 580, '290 perguntas e 290 espelhos: ' + nq);
/* ids */
for (const k of Object.keys(A)) T(k in B, 'id preservado ' + k);
for (const n of NEWID) for (const p of ['q', 'bq']) T(p + '-neu' + n in B, 'nova ' + p + '-neu' + n);
/* espelho */
for (const k of Object.keys(B)) if (k.startsWith('q-')) T(B[k].replace('id="q-', 'id="bq-') === B['b' + k], 'espelho bloco = banco ' + k);
/* 233/234: mesma pergunta e mesma resposta que na main (só mudam a ordem e a extensão das alternativas) */
for (const n of KEEP) { const a = A['q-neu' + n], b = B['q-neu' + n]; T(stemOf(a) === stemOf(b), 'enunciado idêntico ' + n); T(txt(optsOf(a)['abcd'.indexOf(corrOf(a))]).slice(0, 30) === txt(optsOf(b)['abcd'.indexOf(corrOf(b))]).slice(0, 30), 'mesma resposta (início idêntico; alternativas reordenadas/equilibradas) ' + n); }
/* perguntas antigas: enunciado e (salvo reescritas declaradas) alternativas iguais; resposta correta = mesmo texto */
for (const k of Object.keys(A)) {
  if (!k.startsWith('q-')) continue; const n = k.slice(5), a = A[k], b = B[k];
  if (!STEM_CHANGED.has(n)) T(stemOf(a).replace(/\s+/g, '') === stemOf(b).replace(/\s+/g, '') || /^q-neu-2509-0[35]$|neu(091|134|-2509-03)/.test(k), 'enunciado preservado ' + k);
  if (/class="options"/.test(a) && !REWORDED.has(n) && !STEM_CHANGED.has(n) && !/^(091|134|-2509-03)$/.test(n)) {
    const oa = optsOf(a).map(txt).sort(), ob = optsOf(b).map(txt).sort(); T(JSON.stringify(oa) === JSON.stringify(ob), 'alternativas preservadas (só reordenadas) ' + k);
    T(txt(optsOf(a)['abcd'.indexOf(corrOf(a))]) === txt(optsOf(b)['abcd'.indexOf(corrOf(b))]), 'a mesma alternativa continua correta ' + k);
  }
}
/* 1) nenhuma pista visual antes de responder */
for (const k of Object.keys(B)) {
  const h = B[k]; const ul = (h.match(/<ul class="options">([\s\S]*?)<\/ul>/) || [])[1];
  if (ul) T(!/<(b|i|em|strong|u|mark|span|font)[ >]/.test(ul) && !/style=|class=|[✓✔✅❌⭐★]/.test(ul), 'sem ênfase/cor/símbolo nas alternativas ' + k);
  if (/tf-btn/.test(h)) { const st = (h.match(/<p class="quiz-question">([\s\S]*?)<\/p>/) || [])[1] || ''; T(!/<(b|i|em|strong)>/.test(st), 'V/F sem ênfase no enunciado ' + k); T(!/data-correct|class="[^"]*correct/.test(h.split('<div class="answer">')[0]), 'V/F sem marca de resposta ' + k); }
  if (ul) T(!/data-correct|class="[^"]*(correct|right)/.test(h.split('<div class="answer">')[0]), 'sem marca de resposta no enunciado/alternativas ' + k);
}
/* V/F: o argumento de checkTF deve coincidir com a resposta (VERDADERO → true, FALSO → false) */
for (const k of Object.keys(B)) if (/tf-btn/.test(B[k])) { const ans = (B[k].match(/<strong>(VERDADERO|FALSO)/) || [])[1]; const args = [...B[k].matchAll(/checkTF\(this, (true|false)\)/g)].map(m => m[1]); T(args.length === 2 && args.every(a => a === (ans === 'VERDADERO' ? 'true' : 'false')), 'V/F calificado corretamente (checkTF) ' + k + ' · ' + ans + ' · ' + args.join(',')); }
/* 2) letra correta equilibrada e sem padrão; comprimento; consistência da explicação */
const seq = [], lens = []; let longest = 0, mcq = 0;
const secs = [...cur.matchAll(/<section class="container" id="neub\d\d"/g)].map(m => m.index);
for (const k of Object.keys(B)) {
  if (!k.startsWith('q-') || !/class="options"/.test(B[k])) continue; const h = B[k], c = corrOf(h), o = optsOf(h);
  T(o.length === 4 && c, '4 alternativas e resposta ' + k); if (o.length !== 4) continue; mcq++;
  const ci = 'abcd'.indexOf(c); if (k !== 'q-neu166') T(txt(o[ci]) === txt((h.match(/<div class="answer"><p><strong>[a-d]\) ([\s\S]*?)<\/strong>/) || [])[1]), 'texto da resposta = alternativa ' + k);
  const rest = h.split('<div class="answer">')[1].replace(/^<p><strong>[\s\S]*?<\/strong><\/p>/, '');
  const starts = [...rest.matchAll(/<p>((?:[a-d]\))(?:(?:, | y | e )[a-d]\))*)/g)].map(m => m[1]).join(' ');
  T(!new RegExp(c + '\\)').test(starts), 'a letra correta não aparece nas notas das erradas ' + k);
  seq.push([k, c]); const L = o.map(x => txt(x).length); const oth = L.filter((_, i) => i !== ci);
  if (L[ci] >= Math.max(...oth) + 5) longest++; lens.push(L[ci] / (oth.reduce((a, b) => a + b, 0) / 3));
}
const cnt = { a: 0, b: 0, c: 0, d: 0 }; seq.forEach(([, c]) => cnt[c]++);
for (const l of 'abcd') T(cnt[l] / mcq > 0.22 && cnt[l] / mcq < 0.28, 'letra ' + l + ' entre 22% e 28%: ' + cnt[l] + '/' + mcq);
let runs = 0; for (let i = 2; i < seq.length; i++) if (seq[i][1] === seq[i - 1][1] && seq[i][1] === seq[i - 2][1]) runs++; T(runs === 0, 'sem 3 iguais seguidas: ' + runs);
T(longest / mcq <= 0.35, 'a correta é a mais longa (≥5 caracteres) em no máximo 35%: ' + longest + '/' + mcq);
lens.sort((x, y) => x - y); T(lens[Math.floor(lens.length / 2)] <= 1.2, 'razão mediana correta/média das erradas ≤ 1,2: ' + lens[Math.floor(lens.length / 2)].toFixed(2));
/* rótulos e reconstruções */
for (const k of Object.keys(B)) if (k.startsWith('q-')) T(!/Pregunta oficial/i.test(B[k]), 'sem «Pregunta oficial» ' + k);
for (const n of ['090', '091', '135', '181', '224', ...NEWID]) T(/quiz-tag oficial/.test(B['q-neu' + n].slice(0, 160)), 'rótulo de exame ' + n);
for (const n of ['251', '252', '255']) T(/Pregunta reconstruida/.test(B['q-neu' + n].slice(0, 1600)), 'nota de reconstrução no enunciado ' + n);
for (const n of ['090', '181', '224', '253', '254', '261']) T(/<i>Reconstruida:/.test(B['q-neu' + n]), 'nota de reconstrução na explicação ' + n);
for (const n of ['249', '250', '256', '257', '258', '259', '260']) T(/<i>(Clave no publicada|Enunciado|Caso copiado)/.test(B['q-neu' + n]), 'nota de proveniência/clave ' + n);
/* contagens declaradas */
const mcqN = Object.keys(B).filter(k => k.startsWith('q-') && /class="options"/.test(B[k])).length, vfN = Object.keys(B).filter(k => k.startsWith('q-') && /tf-btn/.test(B[k])).length;
T(cur.includes('<h3>Las ' + nq + ' preguntas de la asignatura, reunidas y en orden</h3>') && cur.includes('<div><b>' + nq + '</b><span>Preguntas</span></div>') && cur.includes('<span>' + nq + ' preguntas</span>'), 'total declarado = ' + nq);
T(cur.includes('<div><b>' + mcqN + '</b><span>MCQ</span></div>'), 'MCQ declarado = ' + mcqN); T(cur.includes('<div><b>' + vfN + '</b><span>Verdadero o falso</span></div>'), 'V/F declarado = ' + vfN);
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
T(/El propranolol es un betabloqueante no selectivo: se evita en pacientes con <b>asma<\/b>/.test(cur), 'ensina: propranolol y asma');
T(!/con disfunción de la <b>médula espinal<\/b>/.test(B['q-neu-2509-03']), 'tijeras sem obrigatoriedade medular');
T(/no publicó la clave|no publicó clave/.test(B['q-neu135']) && /selección según el tipo de crisis/.test(B['q-neu135']), 'q-neu135: clave não oficial declarada + slide');
/* triagem do compilado: 186 linhas, um só código por linha, soma = 186 (corrige a soma 193) */
{ const tri = fs.readFileSync(path.join(REPO, 'coordination/source-packs/neurologia-revisar-triagem-v1.md'), 'utf8');
  const rows = [...tri.matchAll(/^\| (\d+) \| .*? \| \*\*(COB-P|COB|ACR|ENS|FNT|DESC)\*\* \|/gm)];
  T(rows.length === 186, 'triagem: 186 linhas com código (' + rows.length + ')');
  T(new Set(rows.map(r => r[1])).size === 186 && rows.every((r, i) => +r[1] === i + 1), 'triagem: linhas 1..186 sem repetir');
  const cnt = {}; rows.forEach(r => cnt[r[2]] = (cnt[r[2]] || 0) + 1);
  T(Object.values(cnt).reduce((a, b) => a + b, 0) === 186, 'triagem: soma das categorias = 186 ' + JSON.stringify(cnt)); }
/* V/F: o cabeçalho VERDADERO/FALSO concorda com o argumento de checkTF em TODAS (bloco e banco) */
for (const k of Object.keys(B)) { const h = B[k]; if (!/tf-buttons/.test(h)) continue; const a = (h.match(/checkTF\(this, (true|false)\)/) || [])[1]; const hd = (h.match(/<div class="answer"><p><strong>(VERDADERO|FALSO)/) || [])[1]; T((a === 'true') === (hd === 'VERDADERO'), 'V/F checkTF × cabeçalho ' + k); }
/* perguntas novas apoiadas em slide ou no compilado levam a nota de origem */
for (const n of ['262', '263', '264', '265', '266', '267', '268', '269', '270', '271', '272', '273', '274', '275', '276', '277', '278', '279', '280', '281', '282', '283', '284']) for (const p of ['q', 'bq']) T(/Reconstruida a partir del compilado|Reconstruida a partir de preguntas del compilado/.test(B[p + '-neu' + n]) && /Basada en preguntas de examen|Verdadero o falso · basada en examen/.test(B[p + '-neu' + n]) && !/Pregunta oficial/.test(B[p + '-neu' + n]), 'rótulo de examen e nota de reconstrução ' + p + '-neu' + n);
for (const n of ['270', '271', '272', '273', '274', '275']) T(/se apoya en el slide de la cátedra/.test(B['q-neu' + n]), 'apoio em slide declarado q-neu' + n);
for (const n of ['276', '277', '278', '279', '280', '281', '282', '284']) T(/slide de la cátedra/.test(B['q-neu' + n]), 'apoio em slide declarado q-neu' + n);
for (const n of ['263', '265', '266', '267', '268']) T(/no figura en los slides actuales/.test(B['q-neu' + n]), 'tema fora dos slides declarado q-neu' + n);
T(/pérdida parcial del contacto<\/b> durante 1 a 2 minutos/.test(B['q-neu115']) && /pérdida parcial del contacto<\/b> durante 1 a 2 minutos/.test(B['bq-neu115']), 'q-neu115 melhorada (consciência) no bloco e no banco');
T(/Hipertensión endocraneana sin masa/.test(cur), 'ensina: HTE sem massa');
T(/marcha jacksoniana<\/b> empieza en una parte pequeña/.test(cur), 'ensina: marcha jacksoniana');
T(/3 Hz<\/b> \(tres por segundo\)/.test(cur) && /síndrome de West<\/b>/.test(cur), 'ensina: 3 Hz e West');
console.log('neu-8a1b (estático): ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);
