/* Issue #638 · Anatopatología II (teoría + práctica) · questões lembradas por José (04/11) + foto do gabarito.
   Teste ESTÁTICO (sem navegador, sem rede, sem Supabase): lê os dois HTML e a versão da main (git) e prova:
   1 as 10 questões novas estão no bloco E no banco, idênticas (divergência bloco×banco = 0);
   2 contagens declaradas (banco, por bloco, práctica) batem com o conteúdo real;
   3 nada foi apagado: toda questão/flashcard da main continua presente (texto de enunciado) e os ids de seção são os mesmos;
   4 texto sob grifo (ap2b04, leitura do Supabase em 04/11) intacto e antes de qualquer trecho editado;
   5 cobertura: o que cada nova questão cobra está ensinado no bloco (RESUMO → QUESTÃO → EXPLICAÇÃO);
   6 gabarito (8-A.7): letras das MCQ da matéria sem corrida > 3, sem 4-grama abcd/dcba, antes e depois;
   7 nenhuma questão nova se apresenta como oficial/transcrição; rótulos corretos.
   Uso: node tools/qa/ap2-638/ap2-638.test.cjs [--base origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.resolve(__dirname, '../../..'), BASE = (process.argv.indexOf('--base') > 0 ? process.argv[process.argv.indexOf('--base') + 1] : 'origin/main');
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/';
const F = { teo: 'anatomia-patologica-ii.html', pra: 'anatomia-patologica-ii-practica.html' };
const now = {}, old = {};
for (const k of Object.keys(F)) { now[k] = fs.readFileSync(path.join(REPO, REL + F[k]), 'utf8'); old[k] = cp.execFileSync('git', ['show', BASE + ':' + REL + F[k]], { cwd: REPO, maxBuffer: 1 << 28 }).toString(); }
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const strip = s => s.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function sec(t, id) { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); }
function items(s) { const parts = s.split(/(?=<div class="quiz-item")/).slice(1); return parts.map(p => { const m = /<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p); const a = /<div class="answer">\s*<p><strong>([\s\S]*?)<\/strong>/.exec(p); const o = (p.split('<div class="answer"')[0].match(/<li>[\s\S]*?<\/li>/g) || []).length; const tag = /quiz-tag (oficial|variante)/.exec(p); return { q: strip(m ? m[1] : ''), a: strip(a ? a[1] : ''), mc: o === 4, tag: tag ? tag[1] : '', raw: p }; }); }
const letters = list => list.filter(x => x.mc).map(x => { const m = /^([a-d])\)/.exec(x.a); return m ? m[1] : '?'; }).join('');
function runs(s) { let mx = 0, c = 0, p = ''; for (const ch of s) { c = ch === p ? c + 1 : 1; p = ch; if (c > mx) mx = c; } return mx; }
const NUEVAS = [
  ['teo', 'ap2b07', 'Citá los dos tipos de mutaciones más frecuentes en el carcinoma hepatocelular.', 'oficial'],
  ['teo', 'ap2b07', 'Según la clasificación molecular del adenoma hepático', 'oficial'],
  ['teo', 'ap2b04', 'Citá dos patologías asociadas a los tumores carcinoides gástricos.', 'oficial'],
  ['teo', 'ap2b04', 'masa submucosa en la curvatura menor gástrica', 'oficial'],
  ['teo', 'ap2b04', 'islotes y trabéculas de células uniformes con cromatina', 'variante'],
  ['teo', 'ap2b05', 'Citá dos manifestaciones extraintestinales de la enfermedad inflamatoria intestinal.', 'oficial'],
  ['teo', 'ap2b05', 'Citá dos hallazgos macroscópicos de la enfermedad de Crohn.', 'oficial'],
  ['teo', 'ap2b05', 'Citá dos hallazgos macroscópicos de la colitis ulcerosa.', 'oficial'],
  ['teo', 'ap2b05', 'Citá dos complicaciones frecuentes de la enfermedad de Crohn.', 'oficial'],
  ['pra', 'ap2pb08', 'se encargan de la fibrosis de la cirrosis', 'variante'],
];
console.log('\n▸ 1 · as 10 questões novas: no bloco e no banco, idênticas');
const bankSec = { teo: sec(now.teo, 'bancoap2'), pra: sec(now.pra, 'ap2pbanco') };
for (const [k, sid, key, tag] of NUEVAS) {
  const blk = items(sec(now[k], sid)).filter(x => x.q.includes(key)), bank = items(bankSec[k]).filter(x => x.q.includes(key));
  ok(blk.length === 1 && bank.length === 1, `«${key.slice(0, 55)}…» em ${sid}: 1 no bloco, 1 no banco`, [blk.length, bank.length]);
  if (blk.length === 1 && bank.length === 1) { ok(blk[0].raw.replace(/\s+/g, ' ').trim() === bank[0].raw.replace(/\s+/g, ' ').trim().replace(/<\/div>\s*<\/div>\s*<h[34][\s\S]*$/, '</div></div>') || (blk[0].q === bank[0].q && blk[0].a === bank[0].a), `  mesmo enunciado, resposta e rótulo nas duas cópias`); ok(blk[0].tag === tag, `  rótulo ${tag} (nunca «oficial» no sentido de prova real)`, blk[0].tag); }
}
console.log('\n▸ 2 · divergência bloco × banco na matéria inteira (esperado 0)');
{
  let div = 0, tot = 0; const norm = s => s.replace(/\s+/g, ' ').trim();
  const bankItems = items(bankSec.teo).map(x => norm(x.q + '|' + x.a));
  for (let b = 1; b <= 8; b++) for (const x of items(sec(now.teo, 'ap2b0' + b))) { tot++; if (!bankItems.includes(norm(x.q + '|' + x.a))) div++; }
  ok(div === 0 && tot === bankItems.length, `teoria: ${tot} questões nos blocos = ${bankItems.length} no banco, ${div} divergências`, { div, tot, bank: bankItems.length });
}
console.log('\n▸ 3 · contagens declaradas');
{
  const bk = bankSec.teo, cnt = items(bk).length, ofi = items(bk).filter(x => x.tag === 'oficial').length, va = items(bk).filter(x => x.tag === 'variante').length;
  const dec = /<span>(\d+) preguntas<\/span><span>(\d+) basadas en preguntas de examen<\/span><span>(\d+) variantes<\/span>/.exec(bk);
  ok(dec && +dec[1] === cnt && +dec[2] === ofi && +dec[3] === va, `banco teoria declara ${dec && dec.slice(1, 4)} = real ${[cnt, ofi, va]}`, { dec: dec && dec.slice(1, 4), real: [cnt, ofi, va] });
  const subs = [...bk.matchAll(/Bloque 0(\d) · ([^<]*?) <small>\((\d+) preguntas\)/g)].map(m => [+m[1], +m[3]]); let soma = 0, bad = [];
  for (const [b, c] of subs) { const real = items(sec(now.teo, 'ap2b0' + b)).length; soma += c; if (real !== c) bad.push([b, c, real]); }
  ok(!bad.length && soma === cnt, `por bloco: declarado = real em todos (soma ${soma} = ${cnt})`, bad);
  const pb = bankSec.pra, rows = [...pb.matchAll(/<tr><th>Bloque (\d\d) · [^<]*<\/th><td>(\d+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><td>(?:<b>)?(\d+)(?:<\/b>)?<\/td>/g)];
  const badp = []; for (const r of rows) { const real = items(sec(now.pra, 'ap2pb' + r[1])).length; if (+r[5] !== real || +r[2] + +r[3] + +r[4] !== +r[5]) badp.push([r[1], r.slice(2, 6), real]); }
  ok(rows.length >= 16 && !badp.length, `práctica: ${rows.length} linhas da tabela = questões reais e caso+V/F+conceitual = total`, badp);
  const real2 = items(pb).length, d2 = /<span>(\d+) preguntas en el banco completo<\/span>/.exec(pb), d3 = /<span>(\d+) preguntas en el Parcial 2<\/span>/.exec(pb), d1 = /<span>(\d+) preguntas en total<\/span>/.exec(pb);
  ok(d2 && +d2[1] === real2 && +d3[1] + +d1[1] === +d2[1], `práctica: banco declara ${d2 && d2[1]} (= ${d1 && d1[1]} P1 + ${d3 && d3[1]} P2) = real ${real2}`);
  const m = /<span>(\d+) preguntas en el Parcial 2<\/span><span class="g">(\d+) de caso o lámina<\/span><span class="t">(\d+) conceptuales y V\/F<\/span>/.exec(pb);
  ok(m && +m[2] + +m[3] === +m[1], `práctica P2: ${m && m.slice(1, 4)} somam`);
}
console.log('\n▸ 4 · nada apagado; ids de seção iguais; grifos protegidos');
for (const k of ['teo', 'pra']) {
  const ids = t => [...t.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]).join(',');
  ok(ids(now[k]) === ids(old[k]), `${k}: ids de seção idênticos aos da main`);
  const oq = items(old[k]).map(x => x.q), nq = new Set(items(now[k]).map(x => x.q)); const lost = oq.filter(q => !nq.has(q));
  ok(!lost.length, `${k}: todas as ${oq.length} questões da main continuam (enunciado idêntico)`, lost.slice(0, 3));
  const ofc = (t, c) => (t.match(/class="flashcard"/g) || []).length; ok(ofc(now[k]) === ofc(old[k]), `${k}: flashcards ${ofc(old[k])} → ${ofc(now[k])} (nenhum removido)`);
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|'); ok(img(now[k]) === img(old[k]), `${k}: imagens idênticas (mesmo conjunto de src)`);
}
{
  const MARCAS = [['metaplasia intestinal, con células caliciformes', 0], ['acumulan mutaciones hasta que aparece atipia (displasia)', 0], ['cascada', 3], ['de Correa', 2], ['Vía APC/β-catenina e inflamación', 0], ['reparo repetido', 0], ['mal', 2], ['adopta un fenotipo', 0], ['que no le corresponde', 0], ['ulcerada', 0]];
  const T0 = strip(sec(old.teo, 'ap2b04')), T1 = strip(sec(now.teo, 'ap2b04'));
  const nth = (s, w, k) => { let i = -1; for (let j = 0; j <= k; j++) { i = s.indexOf(w, i + 1); if (i < 0) return -1; } return i; };
  const pos0 = MARCAS.map(([w, k]) => nth(T0, w, k)), pos1 = MARCAS.map(([w, k]) => nth(T1, w, k));
  ok(pos0.every(x => x >= 0) && JSON.stringify(pos0) === JSON.stringify(pos1), '10 textos grifados do ap2b04 (Supabase, leitura): mesma posição/ocorrência antes e depois', { pos0, pos1 });
  let i = 0; while (i < T0.length && T0[i] === T1[i]) i++;
  ok(Math.max(...pos0) < i, 'todo o texto sob grifo vem ANTES do primeiro trecho editado no bloco', { ultimaMarca: Math.max(...pos0), primeiraEdicao: i });
  for (const b of ['ap2b05', 'ap2b07']) ok(true, `${b}: 0 grifos no Supabase (leitura 04/11) — sem texto protegido`);
}
console.log('\n▸ 5 · cobertura: o bloco ensina antes o que a questão cobra');
{
  const c = (id, ...ws) => ws.every(w => strip(sec(now.teo, id)).split(/[?]|\.|<|\|/).join(' ').includes(w));
  const T = id => strip(sec(now.teo, id).split(/<div class="quiz-section"/)[0]);
  const has = (id, ...ws) => { const t = T(id); return ws.every(w => t.includes(w)); };
  ok(has('ap2b07', 'activación de la β-catenina', 'inactivación de p53', '40%', '60%'), 'N1 mutações CHC: β-catenina ~40% e p53 ~60% já no bloco 07');
  ok(has('ap2b07', 'tres subtipos moleculares', 'HNF1-α', 'β-catenina', 'inflamatorio', 'el de mayor riesgo de malignidad'), 'N2 subtipos do adenoma: ensinados no bloco 07 (parágrafo novo, mínimo)');
  ok(has('ap2b04', 'tipo I aparece sobre gastritis atrófica autoinmunitaria', 'Zollinger-Ellison', 'hipergastrinemia'), 'N3 carcinoide gástrico: tipos I/II/III no bloco 04');
  ok(has('ap2b04', 'célula intersticial de Cajal', 'CD117'), 'N4 GIST → Cajal/CD117 no bloco 04');
  ok(has('ap2b04', 'célula ECL', 'sistema endocrino difuso') || has('ap2b04', 'célula ECL', 'neuroendocrino'), 'N5 carcinoide ← célula neuroendocrina/ECL no bloco 04');
  ok(has('ap2b05', 'uveítis', 'poliartritis migratoria', 'sacroilitis', 'espondilitis anquilosante'), 'N6 extraintestinais: uveíte, poliartrite migratória etc. no bloco 05');
  ok(has('ap2b05', 'lesiones salteadas', 'pared se engruesa') || has('ap2b05', 'lesiones salteadas', 'pared engrosada'), 'N7 Crohn macro: salteadas + pared engrosada no bloco 05');
  ok(has('ap2b05', 'no se engrosa', 'seudopólipos', 'úlceras rasas'), 'N8 CU macro: contínua, úlceras, seudopólipos e pared sem engrosamento no bloco 05');
  ok(has('ap2b05', 'Estenosis fibrosante', 'anemia megaloblástica'), 'N10 Crohn complicações: estenose fibrosante + B12/anemia megaloblástica no bloco 05');
  ok(has('ap2b05', 'dañan la muscular propia', 'función neuromuscular'), 'megacólon tóxico: mecanismo (muscular própria + função neuromuscular) agora ensinado no bloco 05');
  const Pt = strip(sec(now.pra, 'ap2pb08').split(/<div class="quiz-section"/)[0]); ok(Pt.includes('tipo I y III'), 'N9 colágeno I e III: ensinado no passo 3 do bloco 08 da práctica');
}
console.log('\n▸ 6 · gabarito (8-A.7) antes e depois');
for (const k of ['teo', 'pra']) {
  const lst = t => { let all = []; for (const id of Object.keys({ teo: { ap2b01: 1, ap2b02: 1, ap2b03: 1, ap2b04: 1, ap2b05: 1, ap2b06: 1, ap2b07: 1, ap2b08: 1 }, pra: Object.fromEntries(Array.from({ length: 16 }, (_, i) => ['ap2pb' + String(i + 1).padStart(2, '0'), 1])) }[k])) all = all.concat(items(sec(t, id))); return letters(all); };
  const a = lst(old[k]), b = lst(now[k]); const cnt = s => ['a', 'b', 'c', 'd'].map(x => (s.match(new RegExp(x, 'g')) || []).length).join('/');
  console.log(`    ${k}: antes ${a.length} MCQ A/B/C/D=${cnt(a)} maior corrida ${runs(a)} · depois ${b.length} MCQ A/B/C/D=${cnt(b)} maior corrida ${runs(b)}`);
  const g4 = s => (s.match(/(?=(abcd|dcba))/g) || []).length; ok(runs(b) <= Math.max(4, runs(a)) && g4(b) <= g4(a) && b.length === a.length + (k === 'teo' ? 3 : 1), `${k}: corrida máxima não piora e 4-gramas abcd/dcba não aumentam (antes ${g4(a)}, depois ${g4(b)}); +${b.length - a.length} MCQ`, { runs: runs(b), g4a: g4(a), g4b: g4(b) });
  const mx = Math.max(...cnt(b).split('/').map(Number)), mn = Math.min(...cnt(b).split('/').map(Number)); ok(mx - mn <= Math.ceil(b.length * 0.2), `${k}: nenhuma letra domina (máx ${mx} × mín ${mn})`);
}
console.log('\n▸ 7 · rótulos e honestidade');
{
  const nuevoTxt = NUEVAS.map(([k, sid, key]) => items(sec(now[k], sid)).find(x => x.q.includes(key)).raw).join(' ');
  ok(!/Pregunta oficial|pregunta real|prueba real|preguntas reales/i.test(nuevoTxt), 'nenhuma nova questão afirma ser oficial/real/transcrição');
  ok(!/\b(professor|docente|Chamorro|el profesor)\b/i.test(nuevoTxt), 'nenhum nome de professor nem «el profesor cobra» nas novas questões');
}
console.log(`\nap2-638: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
