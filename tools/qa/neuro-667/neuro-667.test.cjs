/* Neurología · issue #667 · bloques 20 a 27 (slides 9–16 de la cátedra)
   Prueba ESTÁTICA (sin navegador, sin red, sin Supabase): estructura, espejo bloque = banco, contrato de las preguntas,
   conteos declarados y preservación byte a byte de lo que no debía cambiar (bloques con grifos, portada salvo adición, etc.).
   Uso: node tools/qa/neuro-667/neuro-667.test.cjs [ref-base=origin/main] */
const fs = require('fs'), cp = require('child_process'), path = require('path');
const REPO = path.resolve(__dirname, '..', '..', '..');
const F = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const BASE = process.argv[2] || 'origin/main';
const now = fs.readFileSync(path.join(REPO, F), 'utf8');
const old = cp.execFileSync('git', ['show', BASE + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString('utf8');
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (!c) { ko++; console.log('  ✗ FALHA:', m, x === undefined ? '' : JSON.stringify(x).slice(0, 300)); } else console.log('  ✓', m); };

const sec = (h, id) => { const a = h.indexOf('<section class="container" id="' + id + '"'); if (a < 0) return null; const b = h.indexOf('</section>', a); return h.slice(a, b + 10); };
const items = (h) => [...h.matchAll(/<div class="quiz-item" id="([^"]+)">([\s\S]*?)\n<\/div><\/div>|<div class="quiz-item" id="([^"]+)">([\s\S]*?)<\/div><\/div>\n/g)];
/* 18/11: asserções de «idêntico à main de antes da #667» foram aposentadas (histórico: #681, #683 e #687 alteraram esses trechos depois do merge); as invariantes atuais estão em tools/qa/neu-8a1b. */
const historico = () => {};
const NEW = [20, 21, 22, 23, 24, 25, 26, 27].map(x => 'neub' + x);

/* 1 · estructura y orden */
const order = [...now.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]);
ok(NEW.every(id => order.includes(id)), 'os 8 blocos novos existem (neub20–neub27)');
ok(order.indexOf('neub19') < order.indexOf('neub20') && order.indexOf('neub27') < order.indexOf('banconeu') && order.indexOf('banconeu') < order.indexOf('revisaoneu'), 'ordem: … neub19 → neub20…27 → banconeu → revisaoneu');
const ids = [...now.matchAll(/ id="([^"]+)"/g)].map(m => m[1]); ok(new Set(ids).size === ids.length, 'ids únicos no arquivo todo');

/* 2 · preservação: tudo o que existia continua */
const oldIds = [...old.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
ok(oldIds.every(i => now.includes(' id="' + i + '"')), 'nenhum id existente foi removido (' + oldIds.length + ')');
for (const id of ['neub01', 'neub02', 'neub03', 'neub04', 'neub09', 'neub10', 'neub11', 'neub12', 'neub13', 'neub14', 'neub15', 'neub16', 'neub17', 'neub18'])
  historico(sec(now, id) === sec(old, id), id + ' idêntico à main' + (['neub02', 'neub03', 'neub09'].includes(id) ? ' (tem grifos reais)' : ''));
historico(sec(now, 'neub19').replace(/\n  <div class="rmc-note"><p><b>Actualización\.[\s\S]*?<\/p><\/div>/, '') === sec(old, 'neub19'), 'neub19: só o aviso inicial foi acrescentado');
const portN = sec(now, 'neuportada'), portO = sec(old, 'neuportada');
historico(portN.replace(/<div class="rmc-note"><p><b>Bloques 20 a 27[\s\S]*?<\/p><\/div>\n/, '').replace(/<span>27 bloques<\/span>(\s*)<span>4 unidades \+ P2 \+ complemento<\/span>/, '<span>19 bloques</span>$1<span>4 unidades + 1 complemento</span>').replace(/<span>238 preguntas<\/span>(\s*)<span>387 flashcards<\/span>/, '<span>179 preguntas</span>$1<span>335 flashcards</span>') === portO, 'neuportada: só adição final + 3 contadores declarados');

/* 3 · espelho bloco = banco e contrato das perguntas */
let total = 0, mcq = 0, vf = 0, letras = {};
for (const id of NEW) {
  const s = sec(now, id); const qs = [...s.matchAll(/<div class="quiz-item" id="(q-neu\d+)">([\s\S]*?)<\/div><\/div>/g)];
  const num = id.slice(4); ok(qs.length >= 5 && qs.length <= 16, id + ': ' + qs.length + ' perguntas (5–16; cresceu com #683 e #687)');
  total += qs.length;
  for (const q of qs) {
    const b = q[2]; const bq = now.match(new RegExp('<div class="quiz-item" id="b' + q[1] + '">([\\s\\S]*?)<\\/div><\\/div>'));
    if (!bq || bq[1] !== b) { ok(false, 'espelho banco ≠ bloco em ' + q[1]); continue; }
    ok(!/Pregunta oficial/i.test(b), q[1] + ': rótulo sem «Pregunta oficial» (complementaria ou «Basada en preguntas de examen», conforme o registro da #683/#687)');
    if (/quiz-tag mcq/.test(b)) {
      mcq++; const opts = [...b.matchAll(/<li>([a-d])\) ([\s\S]*?)<\/li>/g)];
      const ans = b.match(/<div class="answer"><p><strong>([a-d])\) ([\s\S]*?)<\/strong>/);
      ok(opts.length === 4 && ans && opts.find(o => o[1] === ans[1]) && opts.find(o => o[1] === ans[1])[2] === ans[2], q[1] + ': 4 alternativas e resposta = alternativa ' + (ans && ans[1]));
      if (ans) letras[ans[1]] = (letras[ans[1]] || 0) + 1;
    } else if (/quiz-tag (variante|oficial) vf/.test(b)) {
      vf++; ok(/data-tf="V"/.test(b) && /data-tf="F"/.test(b) && /<strong>(VERDADERO|FALSO)\./.test(b), q[1] + ': V/F com botões e veredito');
    } else if (/quiz-tag define/.test(b)) { ok(/class="reveal-btn"/.test(b) && /class="answer"/.test(b), q[1] + ': completar com botão e resposta'); } else ok(false, q[1] + ': tipo reconhecido');
    ok(!/cae en (el )?examen|lo más preguntado|lo que más cae|tema de examen|pregunta segura/i.test(b), q[1] + ': sem voz de prova');
  }
  ok((s.match(/class="flashcard"/g) || []).length >= 5, id + ': ≥ 5 flashcards');
  ok(/<div class="rmc-exam">/.test(s) && /<div class="key-box exam">/.test(s), id + ': síntese e caixa de essencial');
}
ok(total >= 59, 'perguntas dos blocos 20–27: ' + total + ' (59 originais + acréscimos de #683/#687)');
ok(Object.keys(letras).length === 4, 'letras corretas das MCQ cobrem a, b, c e d', letras);
const maxL = Math.max(...Object.values(letras)); ok(maxL <= Math.ceil(mcq * 0.4), 'nenhuma letra concentra mais de 40% das MCQ', letras);
{ const nq = (now.match(/id="q-neu[\d-]+"/g) || []).length, nb = (now.match(/id="bq-neu[\d-]+"/g) || []).length; ok(nq === nb && nq >= 232, 'q-neu e bq-neu iguais em número (' + nq + ' cada)'); }

/* 4 · mazo geral e contagens declaradas */
const fcNew = NEW.reduce((a, id) => a + (sec(now, id).match(/class="flashcard"/g) || []).length, 0);
ok(fcNew === 52, '52 flashcards novos nos blocos (' + fcNew + ')');
const rev = sec(now, 'revisaoneu'); ok((rev.match(/class="flashcard"/g) || []).length === 335 + 52, 'mazo geral do cierre: 387 tarjetas (as 52 novas repetidas)');
{ const NQ = (now.match(/id="q-neu[\d-]+"/g) || []).length; ok(new RegExp('<h3>Las ' + NQ + ' preguntas de la asignatura').test(now) && new RegExp('<div><b>' + NQ + '<\\/b><span>Preguntas<\\/span><\\/div>').test(now) && /<div><b>27<\/b><span>Bloques<\/span><\/div>/.test(now) && /<div><b>387<\/b><span>Flashcards<\/span><\/div>/.test(now), 'banco declara ' + NQ + ' preguntas · 27 blocos · 387 flashcards'); }
{ const todos = [...now.matchAll(/<div class="quiz-item" id="q-neu[\d-]+">[\s\S]*?<\/div><\/div>\n/g)].map(m => m[0]); const TM = todos.filter(x => /class="options"/.test(x)).length, TV = todos.filter(x => /tf-btn/.test(x)).length; ok(new RegExp('<div><b>' + TM + '</b><span>MCQ</span></div>').test(now) && new RegExp('<div><b>' + TV + '</b><span>Verdadero o falso</span></div>').test(now), 'MCQ ' + TM + ' · V/F ' + TV + ' (todas as perguntas dos blocos)'); }
for (const id of NEW) { const num = id.slice(4); const g = now.match(new RegExp('Bloque ' + num + ' · [^<]+ <small>(\\d+) preguntas</small>')); ok(g && +g[1] === (sec(now, id).match(/class="quiz-item"/g) || []).length, 'banco: grupo do bloque ' + num + ' declara ' + (g && g[1])); }
ok(!/Nueva Era|Nova Era|PR #|issue #/i.test(NEW.map(i => sec(now, i)).join('')), 'sem metadidática de projeto nos blocos novos');

console.log('\nneuro-667: ' + (n - ko) + '/' + n + ' verificações OK' + (ko ? ' — ' + ko + ' FALHAS' : '')); process.exit(ko ? 1 : 0);
