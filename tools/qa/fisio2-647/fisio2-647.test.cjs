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
ok(cnt(now, /<table\b/g) - cnt(old, /<table\b/g) === 10, `tabelas: ${cnt(old, /<table\b/g)} + 10 (2+2+1+1+1 nos blocos 15–19, +3 do bloco 19 vindas dos slides 4, 24 e 26) = ${cnt(now, /<table\b/g)}`);
console.log('\n▸ 3 · grifos reais');
for (const b of ['fp2b01', 'fp2b02', 'fp2b12']) ok(sec(old, b) === sec(now, b), `${b} (47 grifos reais, leitura 06/11) idêntico byte a byte`);
const dif = ni.filter(i => sec(old, i) !== sec(now, i)); ok(JSON.stringify(dif) === JSON.stringify(['fp2b05', 'fp2b06', 'fp2b15', 'fp2b16', 'fp2b17', 'fp2b18', 'fp2b19']), 'só fp2b05, 06, 15, 16, 17, 18 e 19 mudaram (nenhum tem grifos reais)', dif);
console.log('\n▸ 3b · camadas didáticas dos blocos 15–19');
for (const b of ['fp2b15', 'fp2b16', 'fp2b17', 'fp2b18', 'fp2b19']) { const a = sec(now, b), o = sec(old, b); ok(a.includes('En una frase.') && !o.includes('En una frase.'), `${b}: camada nova com síntese (e a base #643 sem ela)`); ok(a.indexOf('En una frase.') < a.indexOf('class="rmc-exam"'), `${b}: camada nova antes de «Puntos a dominar»`); ok(!/Apoyo de la página|no del slide|no está en el slide/.test(a.slice(a.indexOf('En una frase.') - 6000, a.indexOf('class="rmc-exam"'))), `${b}: sem avisos de bastidor na camada nova`); }
for (const b of ['fp2b15', 'fp2b16', 'fp2b17', 'fp2b18', 'fp2b19']) { let t = sec(now, b); const q = t.indexOf('quiz-section'); if (q > 0) t = t.slice(0, q); t = t.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '¦'); const m = t.match(/[^¦]{0,30}\b(slides?|cátedra|lámina|Farreras|Porth)\b[^¦]{0,30}/gi); ok(!m, `${b}: texto do aluno sem notas de bastidor (slide/cátedra/lámina/livro)`, m); }
ok(!/Reforzarla empeoraría|Hipotiroidismo secundario o terciario<\/b><\/td><td>Baja o normal/.test(now) && !sec(now, 'fp2b19').includes('hilo común'), 'afirmações não verificadas (conduta Somogyi, TSH secundário, hilo do trauma) retiradas');
console.log('\n▸ 4 · as 3 inserções');
ok(cnt(now, /nefrosis lipoide/g) === 1 && sec(now, 'fp2b05').includes('nefrosis lipoide'), '«nefrosis lipoide» (fp2b05), 1 vez');
ok(cnt(now, /enfermedad de Berger/g) === 1 && sec(now, 'fp2b06').includes('enfermedad de Berger'), '«enfermedad de Berger» (fp2b06), 1 vez');
ok(cnt(now, /Hipotiroidismo congénito transitorio/g) === 1 && sec(now, 'fp2b18').includes('Hipotiroidismo congénito transitorio'), '«hipotiroidismo congénito transitorio» (fp2b18), 1 vez');
console.log('\n▸ 5 · extratos do slide 13 (10/11): figuras 4, 7, 12, 24 e 26 incorporadas ao bloco 19');
const b19 = sec(now, 'fp2b19');
ok(/Pupilas<\/b><\/td><td>Las <b>dilata<\/b>/.test(b19) && /Corazón<\/b><\/td><td><b>Aumenta<\/b> los latidos/.test(b19) && /Intestino<\/b><\/td><td><b>Disminuye<\/b> las contracciones/.test(b19), 'slide 4: efeitos do simpático órgão por órgão (pupilas, coração, bronquios, estômago, suprarrenais, intestino)');
ok(/cuerpos carotídeos<\/b>[^]*?glosofaríngeo/.test(b19) && /cuerpos aórticos<\/b>[^]*?nervio vago/.test(b19), 'slide 7: quimiorreceptores carotídeos (glosofaríngeo) e aórticos (vago)');
ok(/formación reticular/.test(b19) && /toda la corteza/.test(b19), 'slide 12: sistema reticular ativador na formação reticular, com projeções à corteza');
ok(/Heroína<\/b> \(opiáceo\)<\/td><td><b>Pequeña<\/b> \(miosis\)/.test(b19) && /Atropina<\/b><\/td><td><b>Grande<\/b> \(midriasis\)/.test(b19), 'slide 26: heroína → miosis, atropina → midriasis (só as duas rotuladas)');
ok(/<b>4<\/b> espontáneamente[^]*<b>1<\/b> no responde/.test(b19) && /<b>6<\/b> cumple órdenes · <b>5<\/b> localiza el dolor · <b>4<\/b> sólo retira · <b>3<\/b> flexión anormal · <b>2<\/b> extensión anormal · <b>1<\/b> no responde/.test(b19) && /<b>5<\/b> orientado · <b>4<\/b> confuso · <b>3<\/b> palabras inapropiadas · <b>2<\/b> sonidos incomprensibles · <b>1<\/b> no responde/.test(b19) && /máxima<\/b> es de <b>15<\/b>[^]*mínima<\/b> de <b>3<\/b>/.test(b19), 'slide 24: tabela de Glasgow completa (ojos 4–1, motora 6–1, verbal 5–1; máx. 15, mín. 3)');
ok(/decorticada<\/b> \(flexión anormal\)[^]*hemisferios cerebrales[^]*descerebrada<\/b> \(extensión anormal\)[^]*mesencéfalo/.test(b19), 'slide 24: posturas decorticada × descerebrada e suas lesões');
ok(/entre 4 y 8/.test(b19) && /8 o menos: coma/.test(b19), 'caso do motociclista: faixa 4–8 (coma), sem inventar o motor exato');
console.log('\n▸ 6 · coma vigil / estado apálico não são conscientes (correção da #643 mantida na #650)');
{ const all = now.slice(now.indexOf('id="fp2b19"'), now.indexOf('id="bancofp2"')); const txt = all.replace(/<[^>]+>/g, '¦');
  ok(!/coma vigil[^¦]{0,40}se describe como despierto y consciente|despierto y consciente pero[^¦]{0,12}¦?totalmente incapaz/i.test(txt), 'bloco 19: nenhuma frase diz que o coma vigil está «despierto y consciente»');
  ok(/Coma vigil<\/b> \/ <b>estado apálico<\/b><\/td><td>Son cuadros de <b>vigilia sin conciencia<\/b>/.test(all), 'seção 5: coma vigil / estado apálico = vigilia sin conciencia');
  ok(/No confundir con el coma vigil/.test(all) && /la conciencia está intacta/.test(all), 'seção 5: nota que o distingue do cautiverio (consciência intacta)');
  ok(/<b>Coma<\/b><\/td><td>No se despierta con ningún estímulo: <b>no hay despertar ni respuesta consciente<\/b><\/td><td>Pueden existir <b>respuestas motoras o reflejas<\/b>/.test(all), 'seção 7: coma = sem despertar nem resposta consciente, com possíveis respostas motoras/reflexas');
  ok(/Coma vigil<\/b> \/ estado apálico<\/td><td>Puede tener los <b>ojos abiertos<\/b>, pero <b>sin conciencia<\/b>/.test(all), 'seção 7: linha do coma vigil sem conciência');
  const quiz = now.slice(now.indexOf('id="b19q01"'), now.indexOf('id="bancofp2"')).replace(/<[^>]+>/g, ' ');
  ok(!/coma vigil[^.]{0,60}consciente|ap[aá]lico[^.]{0,60}consciente/i.test(quiz), 'perguntas e flashcards do bloco 19 não atribuem consciência ao coma vigil/apálico'); }
console.log(`\nfisio2-647: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
