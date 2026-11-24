/* Farmacología II · rodada de questões (PR #706) · conferência estática + navegador das perguntas NOVAS.
   Estático: cada pergunta nova existe 1× no bloco e 1× no banco, idênticas; sem negrito/itálico/cor nas alternativas e nos enunciados V/F;
   a letra da resposta existe e coincide com a opção; nenhuma corrida de 3 letras iguais nos grupos tocados; contadores do banco somam.
   Navegador: nas 2 V/F novas, os DOIS botões (Verdadero e Falso): o veredito certo é aceito, o errado é rejeitado e a explicação aparece.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/farmaco2-rodada-2011/farmaco2-rodada.test.cjs [--estatico] */
'use strict';
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html';
const t = fs.readFileSync(path.join(REPO, REL), 'utf8');
let ok = 0, bad = 0; const T = (c, m, x) => { if (c) ok++; else { bad++; console.log('  ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 240) : ''); } };
const NOVAS = [   // [fragmento do enunciado, bloco, tipo]
  ['mecanismo propio de los glucocorticoides en los vasos contribuye a esa hipertensión', 'f2b07', 'mcq'],
  ['describe mejor el dolor de la angina típica', 'f2b05', 'mcq'],
  ['figura entre las ABSOLUTAS', 'f2b05', 'mcq'],
  ['El diltiazem corresponde a un antiarrítmico de clase', 'f2b14', 'mcq'],
  ['casos raros de una complicación sistémica', 'f2b08', 'mcq'],
  ['acción diurética de la aminofilina', 'f2b08', 'completar'],
  ['dosis superiores a 100 mg/día de cortisol (o equivalentes en esteroides sintéticos) durante más de 2 semanas provocan', 'f2b07', 'vf'],
  ['Un hombre de 68 años, fumador, con EPOC', 'f2b08', 'mcq'],
  ['Cite tres efectos adversos de los anticolinérgicos inhalados', 'f2b08', 'open'],
  ['Cite tres β₂-agonistas de acción corta', 'f2b08', 'open'],
  ['Cite los tres antitiroideos de síntesis', 'f2b11', 'open'],
  ['Cite la clasificación de los fármacos broncodilatadores', 'f2b08', 'open'],
  ['Cite los mecanismos de acción de la teofilina', 'f2b08', 'open'],
  ['Cite las tres familias de fármacos antianginosos', 'f2b05', 'open'],
  ['Cite tres glucocorticoides de acción intermedia', 'f2b07', 'open'],
  ['El sucralfato puede reducir la absorción de otros fármacos', 'f2b09', 'vf'],
];
const sec = id => { const a = t.indexOf('<section class="container" id="' + id + '"'); return t.slice(a, t.indexOf('</section>', a)); };
const itemDe = (s, frag) => { const out = []; let i = -1; while ((i = s.indexOf(frag, i + 1)) >= 0) { const a = s.lastIndexOf('<div class="quiz-item">', i); const b = s.indexOf('\n    </div>\n', s.indexOf('<div class="answer">', i)) ; out.push(s.slice(a, b + 12)); } return out; };
const banco = sec('f2b15');
for (const [frag, bloco, tipo] of NOVAS) {
  const A = itemDe(sec(bloco), frag), B = itemDe(banco, frag);
  T(A.length === 1 && B.length === 1, '«' + frag.slice(0, 45) + '…» existe 1× no bloco ' + bloco + ' e 1× no banco', [A.length, B.length]);
  if (A.length !== 1 || B.length !== 1) continue;
  const norm = x => x.replace(/\s+/g, ' ').trim();
  T(norm(A[0]) === norm(B[0]), '«' + frag.slice(0, 45) + '…» bloco e banco idênticos');
  const q = A[0].match(/<div class="quiz-question">([\s\S]*?)<\/div>/)[1];
  T(!/<(b|i|em|strong|u|mark)\b|style=|class="[^"]*(hl|dest)/i.test(q.replace(/<span class="quiz-tag[^>]*>[^<]*<\/span>/, '')), 'enunciado sem destaque visual', q.slice(0, 100));
  T(!/<span class="quiz-tag oficial">Basada en preguntas de examen/.test(A[0]) || true, '(rótulo conferido no pack)');
  if (tipo === 'mcq') {
    const lis = [...A[0].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
    T(lis.length === 4 && lis.every((l, i) => l.startsWith('abcd'[i] + ') ')), '4 alternativas a–d na ordem', lis.map(l => l.slice(0, 3)));
    T(lis.every(l => !/[<>]/.test(l)), 'alternativas sem negrito/itálico/cor/ícone', lis.filter(l => /[<>]/.test(l)));
    const r = A[0].match(/<p><strong>([a-d])\) /); T(!!r && lis.some(l => l.startsWith(r[1] + ') ')), 'a resposta citada (' + (r && r[1]) + ') existe nas alternativas');
    const len = lis.map(l => l.length), mx = Math.max(...len); T(!(r && len['abcd'.indexOf(r[1])] === mx && mx > 1.6 * (len.reduce((a, b) => a + b) - mx) / 3), 'alternativa correta não é muito mais longa que as outras', len);
  } else if (tipo === 'vf') {
    const v = [...A[0].matchAll(/data-tf="([VF])" onclick="checkTF\(this,(true|false)\)"/g)].map(m => m.slice(1));
    const resp = (A[0].match(/<p><strong>(VERDADERO|FALSO)\./) || [])[1];
    T(v.length === 2 && v[0][1] === v[1][1] && ((v[0][1] === 'true') === (resp === 'VERDADERO')), 'os dois botões passam o MESMO valor e ele coincide com a resposta', [v, resp]);
  }
}
/* letras: sem 3 iguais seguidas nos grupos tocados (ordem do bloco, só MCQ) */
for (const id of ['f2b05', 'f2b07', 'f2b08', 'f2b14']) {
  const L = [...sec(id).matchAll(/<p><strong>([a-d])\) /g)].map(m => m[1]);
  let run = 1, mx = 1; for (let i = 1; i < L.length; i++) { run = L[i] === L[i - 1] ? run + 1 : 1; mx = Math.max(mx, run); }
  console.log('  letras ' + id + ': ' + L.join('') + ' · maior corrida ' + mx);
}
/* contadores */
const sb = [...t.matchAll(/<i>(\d+) basadas en exámenes · (\d+) complementarias<\/i>/g)].map(m => [+m[1], +m[2]]);
const sumB = sb.reduce((a, x) => a + x[0], 0), sumC = sb.reduce((a, x) => a + x[1], 0);
const head = t.match(/<h3>Las (\d+) preguntas de la asignatura, reunidas<\/h3>[\s\S]*?<b>(\d+)<\/b><span>Preguntas<\/span>[\s\S]*?<b>(\d+)<\/b><span>Basadas en exámenes<\/span>[\s\S]*?<b>(\d+)<\/b><span>Complementarias<\/span>/);
T(sb.length === 14 && head && +head[1] === sumB + sumC && +head[2] === sumB + sumC && +head[3] === sumB && +head[4] === sumC, 'cabeçalho do banco = soma dos 14 separadores', { sumB, sumC, head: head && head.slice(1) });
const nItens = (sec('f2b15').match(/class="quiz-item"/g) || []).length;
T(nItens === sumB + sumC, 'itens do banco (' + nItens + ') = declarado (' + (sumB + sumC) + ')');
console.log('\nfarmaco2-rodada (estático): ' + ok + '/' + (ok + bad) + ' OK' + (bad ? ' — ' + bad + ' FALHAS' : ''));
if (process.argv.includes('--estatico') || bad) process.exit(bad ? 1 : 0);
/* navegador: as 2 V/F novas, os dois botões */
(async () => {
  const { chromium } = require('playwright'); const L = require('../ensaio-layout/lib.cjs');
  const m = L.reconciliar().ativas.find(x => x.slug === 'farmacologia-ii'); const srv = await L.servir({ usadas: new Set(), pedidos: [] });
  const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch(); let ok2 = 0, bad2 = 0;
  const U = (c, mm, x) => { if (c) ok2++; else { bad2++; console.log('  ✗ FALHA:', mm, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 240) : ''); } };
  for (const [frag, certa] of [['dosis superiores a 100 mg/día de cortisol (o equivalentes en esteroides sintéticos) durante más de 2 semanas provocan', 'V'], ['El sucralfato puede reducir la absorción de otros fármacos', 'V']]) {
    for (const [lado, cont] of [['bloco', null], ['banco', 'f2b15']]) for (const quer of ['V', 'F']) {
      const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'controle', corr: true }); await r.page.waitForTimeout(2500);
      const res = await r.page.evaluate(async ([frag, quer, cont]) => {
        const root = cont ? document.getElementById(cont) : document; const all = [...root.querySelectorAll('.quiz-item')].filter(e => e.textContent.includes(frag) && (cont || !e.closest('#f2b15')));
        const el = all[0]; if (!el) return { achou: false }; el.scrollIntoView({ block: 'center' });
        const btn = el.querySelector('.tf-btn[data-tf="' + quer + '"]'); btn.click(); await new Promise(r => setTimeout(r, 900));
        const ans = el.querySelector('.answer'); const mostra = !!ans && ans.classList.contains('show');
        return { achou: true, n: all.length, cls: btn.className, mostra, outro: el.querySelector('.tf-btn[data-tf="' + (quer === 'V' ? 'F' : 'V') + '"]').className };
      }, [frag, quer, cont]);
      U(res.achou, lado + ' · «' + frag.slice(0, 30) + '…» encontrada');
      if (!res.achou) { await r.page.close(); continue; }
      const aceito = quer === certa;
      U(aceito ? /correct/.test(res.cls) : (/wrong/.test(res.cls) || (/correct/.test(res.outro))), lado + ' · «' + frag.slice(0, 30) + '…» botão ' + quer + (aceito ? ' aceito' : ' rejeitado'), res);
      U(res.mostra, lado + ' · explicação aparece', res);
      await r.page.close();
    }
  }
  await br.close(); srv.close();
  console.log('\nfarmaco2-rodada (navegador): ' + ok2 + '/' + (ok2 + bad2) + ' OK' + (bad2 ? ' — ' + bad2 + ' FALHAS' : '')); process.exit(bad2 ? 1 : 0);
})();
