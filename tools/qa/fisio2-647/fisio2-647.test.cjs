/* Issue #647/#642 · Fisiopatología II — COBERTURA DOS SLIDES e integridade, sem rede nem Supabase.
   1 cobertura: para cada deck 01–13 da pasta «Slide atualizados» (cobertura-slides.json), cada termo-chave (com variantes `a|b`) existe no texto do(s) bloco(s) que o recebem (sem acento, sem maiúsculas);
   2 integridade contra a base (#643 ou main): nenhuma seção, id, pergunta, flashcard ou imagem foi retirado; nº de perguntas/flashcards/SVG idêntico; só as 3 inserções declaradas mudam o HTML;
   3 blocos com grifos reais (fp2b01, fp2b02, fp2b12) idênticos byte a byte; os blocos editados (fp2b05, fp2b06, fp2b18) não têm grifos;
   4 as 3 inserções (nefrosis lipoide, enfermedad de Berger, hipotiroidismo congénito transitorio) existem uma vez cada.
   Uso: node tools/qa/fisio2-647/fisio2-647.test.cjs [--base origin/claude/charming-maxwell-ah7nxj-fisio2-642] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.resolve(__dirname, '../../..'); const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 'origin/claude/charming-maxwell-ah7nxj-fisio2-642';
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/fisiopatologia-ii.html';
const now = fs.readFileSync(path.join(REPO, REL), 'utf8'), old = cp.execFileSync('git', ['show', BASE + ':' + REL], { cwd: REPO, maxBuffer: 1 << 29 }).toString();
const MAT = JSON.parse(fs.readFileSync(path.join(__dirname, 'cobertura-slides.json'), 'utf8'));
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 300) : '')); } return !!c; };
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&[a-z]+;/g, ' ').replace(/[‑–—]/g, '-').replace(/\s+/g, ' ');
const strip = s => s.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ');
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b + 10); };
const secIds = t => [...t.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map(m => m[1]);
const TXT = {}; for (const id of secIds(now)) TXT[id] = norm(strip(sec(now, id)));
console.log('\n▸ 1 · cobertura dos slides (' + MAT.decks.reduce((a, d) => a + d.termos.length, 0) + ' termos-chave, ' + MAT.decks.length + ' decks)');
for (const d of MAT.decks) {
  const falta = d.termos.filter(t => !t.split('|').some(a => d.bloques.some(b => (TXT[b] || '').includes(norm(a.trim())))));
  ok(!falta.length, `deck ${d.deck} (${d.arquivo}) → ${d.bloques.join(' + ')}: ${d.termos.length} termos presentes`, falta);
}
console.log('\n▸ 2 · integridade contra a base ' + BASE);
const oi = secIds(old), ni = secIds(now); ok(JSON.stringify(oi) === JSON.stringify(ni), `as ${oi.length} seções continuam, mesma ordem`);
const idsAll = t => [...t.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); const nowIds = new Set(idsAll(now)); ok(idsAll(old).every(i => nowIds.has(i)), 'todos os ids da base continuam');
const cnt = (t, re) => (t.match(re) || []).length;
for (const [nome, re] of [['perguntas', /class="quiz-item"/g], ['flashcards', /class="flashcard"/g], ['SVG', /<svg/g], ['imagens <img>', /<img\b/g], ]) ok(cnt(old, re) === cnt(now, re), `${nome}: ${cnt(old, re)} = ${cnt(now, re)}`);
ok(cnt(now, /<table\b/g) - cnt(old, /<table\b/g) === 7, `tabelas: ${cnt(old, /<table\b/g)} + 7 (2+2+1+1+1 nos blocos 15–19) = ${cnt(now, /<table\b/g)}`);
console.log('\n▸ 3 · grifos reais');
for (const b of ['fp2b01', 'fp2b02', 'fp2b12']) ok(sec(old, b) === sec(now, b), `${b} (47 grifos reais, leitura 06/11) idêntico byte a byte`);
const dif = ni.filter(i => sec(old, i) !== sec(now, i)); ok(JSON.stringify(dif) === JSON.stringify(['fp2b05', 'fp2b06', 'fp2b15', 'fp2b16', 'fp2b17', 'fp2b18', 'fp2b19']), 'só fp2b05, 06, 15, 16, 17, 18 e 19 mudaram (nenhum tem grifos reais)', dif);
console.log('\n▸ 3b · camadas didáticas dos blocos 15–19');
for (const b of ['fp2b15', 'fp2b16', 'fp2b17', 'fp2b18', 'fp2b19']) { const a = sec(now, b), o = sec(old, b); ok(a.includes('Apoyo de la página, no del slide') && a.includes('En una frase.'), `${b}: camada nova marcada como apoio e com síntese`); ok(a.indexOf('Apoyo de la página') < a.indexOf('class="rmc-exam"'), `${b}: camada nova antes de «Puntos a dominar»`); ok(!o.includes('Apoyo de la página'), `${b}: base (#643) sem a camada`); }
console.log('\n▸ 4 · as 3 inserções');
ok(cnt(now, /nefrosis lipoide/g) === 1 && sec(now, 'fp2b05').includes('nefrosis lipoide'), '«nefrosis lipoide» (fp2b05), 1 vez');
ok(cnt(now, /enfermedad de Berger/g) === 1 && sec(now, 'fp2b06').includes('enfermedad de Berger'), '«enfermedad de Berger» (fp2b06), 1 vez');
ok(cnt(now, /Hipotiroidismo congénito transitorio/g) === 1 && sec(now, 'fp2b18').includes('Hipotiroidismo congénito transitorio'), '«hipotiroidismo congénito transitorio» (fp2b18), 1 vez');
console.log(`\nfisio2-647: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
