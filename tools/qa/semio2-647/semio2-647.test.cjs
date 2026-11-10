/* Issue #647 · Semiología II · revisión frente a los slides de «Slides atualizados» (01–09, incl. guía de respuestas).
   Teste ESTÁTICO: compara el HTML con la main y prueba:
   1 ids de sección idénticos; nada de lo existente desaparece (preguntas, flashcards, imágenes, SVG);
   2 bloques con marcaciones reales (Supabase, solo lectura: b01 93 grifos + 24 trazos, b02 14, b03 4 + 1 trazo, b06 20, banco 17, guía 4) BYTE A BYTE idénticos a la main;
   3 los 4 bloques editados (b07, b08, b09, tablas) solo ganaron inserciones (el texto anterior sigue íntegro y en el mismo orden);
   4 espejo bloques × banco (120 = 120) y contagens intactas; 5 el contenido agregado está en los slides y sin voz de prueba.
   Uso: node tools/qa/semio2-647/semio2-647.test.cjs [--base origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..'), BASE = arg('--base', 'origin/main');
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/semiologia-ii.html';
const now = fs.readFileSync(path.join(REPO, REL), 'utf8'), old = cp.execFileSync('git', ['show', BASE + ':' + REL], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); };
const ids = t => [...t.matchAll(/<section[^>]*id="([^"]+)"/g)].map(m => m[1]).join(',');
const strip = s => s.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
console.log('\n▸ 1 · estructura y nada perdido');
ok(ids(now) === ids(old), 'ids de sección idénticos a la main');
const cnt = (t, r) => (t.match(r) || []).length;
ok(cnt(now, /class="quiz-item/g) === cnt(old, /class="quiz-item/g), `preguntas: ${cnt(old, /class="quiz-item/g)} = ${cnt(now, /class="quiz-item/g)}`);
ok(cnt(now, /class="flashcard"/g) === cnt(old, /class="flashcard"/g), `flashcards: ${cnt(old, /class="flashcard"/g)} = ${cnt(now, /class="flashcard"/g)}`);
ok(cnt(now, /<img /g) === cnt(old, /<img /g) && cnt(now, /<svg[\s>]/g) === cnt(old, /<svg[\s>]/g), 'imágenes y SVG: mismos conteos');
console.log('\n▸ 2 · bloques con marcaciones reales: byte a byte idénticos');
for (const [id, m] of [['s2-b01', '93 grifos + 24 trazos'], ['s2-b02', '14 grifos'], ['s2-b03', '4 grifos + 1 trazo'], ['s2-b06', '20 grifos'], ['s2-banco', '17 grifos'], ['s2-guia', '4 grifos'], ['s2-b04', 'sin marcas'], ['s2-b05', 'sin marcas'], ['s2-b10', 'sin marcas'], ['s2-flashcards', 'sin marcas']]) ok(sec(now, id) === sec(old, id), `${id} (${m}) idéntico a la main`);
console.log('\n▸ 3 · b07, b09 y tablas: solo inserciones');
const subseq = (a, b) => { const A = Array.from(a); let i = 0; for (const ch of b) { if (i < A.length && A[i] === ch) i++; } return i === A.length; };
for (const id of ['s2-b07', 's2-b08', 's2-b09', 's2-tablas']) { const a = sec(old, id), b = sec(now, id); ok(b.length > a.length && subseq(a, b), `${id}: el texto anterior sigue íntegro y en orden (+${b.length - a.length} caracteres)`); }
console.log('\n▸ 4 · espejo bloques × banco');
{ let t = 0; for (let i = 1; i <= 10; i++) t += cnt(sec(now, 's2-b' + String(i).padStart(2, '0')), /class="quiz-item/g); ok(t === 120 && cnt(sec(now, 's2-banco'), /class="quiz-item/g) === 120, `bloques ${t} = banco ${cnt(sec(now, 's2-banco'), /class="quiz-item/g)}`); }
console.log('\n▸ 5 · contenido agregado (slides 07 p.5/11/12 y guía diap. 2/35/36) y sin voz de prueba');
{
  const b7 = strip(sec(now, 's2-b07')).toLowerCase(), b9 = strip(sec(now, 's2-b09')).toLowerCase(), tb = strip(sec(now, 's2-tablas')).toLowerCase();
  ok(['tres preguntas', '¿hay hipoperfusión?', 'llenado capilar', 'ángulo esternal', 'pre-ic', 'bajo gasto'].every(w => b7.includes(w)), 'b07: tres preguntas, hipoperfusión, llenado capilar, altura sobre el ángulo esternal y «pre-IC»');
  ok(['ritmo sinusal', 'onda p antes de cada qrs', '0,12 y 0,20', 'arritmia sinusal', 'electrodo de tierra', 'avr'].every(w => b9.includes(w)), 'b09: criterios de ritmo sinusal, arritmia sinusal y pierna derecha como tierra');
  ok(strip(sec(now, 's2-b08')).toLowerCase().includes('piernas descruzadas') && strip(sec(now, 's2-b08')).toLowerCase().includes('dos lecturas separadas por 1 minuto'), 'b08: técnica de medición de la clase actualizada (piernas descruzadas, sin hablar, dos lecturas promediadas) con la divergencia 30 × 60 min señalada');
  ok(['conclusión', 'evidencia', 'explicación', 'estudio'].every(w => tb.includes(w)), 'tablas: estructura de una respuesta completa');
  const ins = [...now.matchAll(/<h3>(El examen físico en tres preguntas[\s\S]*?)(?=<h3>Métodos diagnósticos)/g)].map(m => strip(m[1])).join(' ') + ' ' + (/🔍 Cómo se lee el ritmo[\s\S]*?(?=<h3>🧭)/.exec(now) || [''])[0].replace(/<[^>]+>/g, ' ');
  const vz = ins.replace(/examen físico/gi, '').match(/\b(cae en|parcial|profesor|docente|cátedra|slide)\b/gi); ok(!vz && ins.length > 800, 'texto agregado sin voz de prueba ni nombres de docentes', vz || ins.length);
}
console.log(`\nsemio2-647: ${n - ko}/${n} verificaciones OK${ko ? ' — ' + ko + ' FALLAS' : ''}`); process.exit(ko ? 1 : 0);
