/* Neurología · V/F que marcavam a resposta certa como errada (19/11). Estático.
   Em TODO V/F (bloco e banco): o argumento de checkTF(this, X) é X=true sse o cabeçalho da explicação é «VERDADERO.»; os dois botões levam o mesmo X;
   a explicação começa por «Es verdadero/falso» de acordo com o cabeçalho; os 10 itens que vinham ao contrário da main estão certos e validados contra o slide. */
'use strict';
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const cur = fs.readFileSync(path.join(REPO, REL), 'utf8');
const cp = require('child_process');
const { semCierre: SEM_CIERRE } = require('../neu-cierre/sem-cierre.cjs');   /* 20/11 · retirada do «Cierre» (ver tools/qa/neu-cierre): a base recebe a mesma troca, para esta checagem medir só o que lhe interessa */
const base = SEM_CIERRE(cp.execSync('git show 104cc2f4:"' + REL + '"', { cwd: REPO, maxBuffer: 1 << 28 }).toString()); /* main logo após a #693 */
let ok = 0, bad = 0; const T = (c, m) => { if (c) ok++; else { bad++; console.log('  ✗ FALHA:', m); } };
const items = {}; { const re = /<div class="quiz-item" id="((?:q|bq)-neu[\d-]+)">/g; let m; while ((m = re.exec(cur))) { const j = cur.indexOf('</div></div>\n', m.index) + 13; items[m[1]] = cur.slice(m.index, j); } }
const txt = x => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const vf = Object.keys(items).filter(k => /tf-buttons/.test(items[k]));
T(vf.length >= 124 && vf.length % 2 === 0, 'V/F no bloco e no banco: ' + vf.length);
for (const k of vf) {
  const h = items[k], args = [...h.matchAll(/checkTF\(this, (true|false)\)/g)].map(m => m[1]);
  const hd = (h.match(/<div class="answer"><p><strong>(VERDADERO|FALSO)\.?<\/strong>/) || [])[1];
  T(args.length === 2 && args[0] === args[1], 'os dois botões levam o mesmo valor esperado ' + k);
  T(!!hd && (args[0] === 'true') === (hd === 'VERDADERO'), 'checkTF × cabeçalho ' + k + ' (' + args[0] + ' × ' + hd + ')');
  const body = txt((h.match(/<div class="answer">([\s\S]*)$/) || [])[1] || '');
  const dizFalso = /\bes falso\b|^FALSO\.\s*(Esa|Es|Según|Eso)/i.test(body.slice(0, 160)), dizVerd = /\bes verdadero\b/i.test(body.slice(0, 160));
  T(!(hd === 'VERDADERO' && dizFalso && !dizVerd) && !(hd === 'FALSO' && dizVerd && !dizFalso), 'explicação concorda com o cabeçalho ' + k);
  T(/data-tf="V"[^>]*>VERDADERO<\/button><button class="tf-btn" data-tf="F"[^>]*>FALSO<\/button>/.test(h), 'botões V e F nos lugares certos ' + k);
}
/* os 10 itens que na main marcavam a certa como errada: verdade validada com o slide da cátedra */
const DEZ = { '235': 'FALSO', '237': 'FALSO', '239': 'FALSO', '186': 'VERDADERO', '196': 'VERDADERO', '201': 'VERDADERO', '208': 'VERDADERO', '215': 'VERDADERO', '222': 'VERDADERO', '228': 'VERDADERO' };
for (const [n, v] of Object.entries(DEZ)) for (const p of ['q', 'bq']) { const h = items[p + '-neu' + n]; T(!!h && (h.match(/<div class="answer"><p><strong>(VERDADERO|FALSO)/) || [])[1] === v && (h.match(/checkTF\(this, (true|false)\)/) || [])[1] === String(v === 'VERDADERO'), 'item corrigido ' + p + '-neu' + n + ' = ' + v); }
console.log('neu-vf (estático): ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK')); process.exit(bad ? 1 : 0);
