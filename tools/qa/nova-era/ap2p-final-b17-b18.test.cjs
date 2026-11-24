/* AP II Práctica · blocos 17 (Nefroblastoma) e 18 (Pielonefritis crónica) · PR #689 · conferência das 24 perguntas (12 por bloco) e da identificação da imagem de pielonefrite.
   ESTÁTICO: (1) sem pistas visuais: a alternativa certa não tem negrito/cor/ênfase/marca e o enunciado V/F não tem ênfase; (2) V/F com OS DOIS botões iguais: data-tf V e F, ambos checkTF(this, X) com o MESMO X,
   e X = «a afirmação é verdadeira» (= o que a resposta diz); (3) MCQ: 4 alternativas a–d e a letra do gabarito existe e o texto da resposta = o da alternativa; (4) cada pergunta do bloco existe IDÊNTICA no banco
   (ap2pbanco) e a contagem 244 do banco confere; (5) letras certas sem corrida de 3; (6) a imagem de pielonefrite NÃO é apresentada como figura do PDF nem como «laminario de la cátedra» (origem não comprovada).
   NAVEGADOR (omitir com --estatico): em duas passadas (alternativa/botão CERTO e depois ERRADO) responde as 20 MCQ e os 4 V/F: marcação correta e explicação aparece.   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/ap2p-final-b17-b18.test.cjs [--estatico] */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..', 'Repasso-Med-Site--main', 'Atual - Copia');
const HTML = fs.readFileSync(path.join(ROOT, 'netlify/functions/materias-privadas/anatomia-patologica-ii-practica.html'), 'utf8');
let ok = 0, bad = 0; const T = (c, m, x) => { if (c) ok++; else { bad++; console.log('  ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 260) : ''); } };
const sec = id => { const a = HTML.indexOf('<section class="container" id="' + id + '"'); return HTML.slice(a, HTML.indexOf('</section>', a)); };
const itens = s => (s.match(/<div class="quiz-item[\s\S]*?<\/div>\n<\/div>/g) || []);   /* item = do <div class="quiz-item"> até o fecha-resposta + fecha-item */
const txt = h => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const EMP = /<\/?(?:b|strong|i|em|u|mark|font|span class="(?:ok|correct|right))\b[^>]*>|style=|color|[✓✔✅❌✗⭐★👉]/i;
const banco = sec('ap2pbanco'); const bancoItens = itens(banco);
let corretas = []; const total = { mcq: 0, vf: 0 };
for (const b of ['ap2pb17', 'ap2pb18']) {
  const its = itens(sec(b)); T(its.length === 12, b + ': 12 perguntas (' + its.length + ')');
  let mcq = 0, vf = 0; const seq = [];
  its.forEach((it, i) => {
    const q = (it.match(/<p class="quiz-question">([\s\S]*?)<\/p>/) || [])[1] || ''; const id = b + '#' + (i + 1);
    const ans = (it.match(/<div class="answer">\s*<p><strong>([\s\S]*?)<\/strong>/) || [])[1] || '';
    T(!!q && !!ans, id + ': enunciado e resposta presentes');
    T(!/class="correct|class="wrong|answered/.test(it), id + ': nenhuma marca de certo/errado no HTML inicial');
    if (/tf-buttons/.test(it)) {
      vf++; const bt = [...it.matchAll(/<button class="tf-btn" data-tf="([VF])" onclick="checkTF\(this, (true|false)\)">(VERDADERO|FALSO)<\/button>/g)];
      T(bt.length === 2 && bt[0][1] === 'V' && bt[1][1] === 'F' && bt[0][3] === 'VERDADERO' && bt[1][3] === 'FALSO', id + ': V/F com os dois botões (VERDADERO e FALSO)', bt.map(x => x[0]));
      T(bt.length === 2 && bt[0][2] === bt[1][2], id + ': os dois botões passam o MESMO valor a checkTF', bt.map(x => x[2]));
      T(bt.length === 2 && (bt[0][2] === 'true') === /^VERDADERO/.test(txt(ans)), id + ': o valor de checkTF = o que a resposta diz (' + txt(ans).slice(0, 12) + ')', { arg: bt[0] && bt[0][2], ans: txt(ans).slice(0, 14) });
      T(!/<\/?(?:b|strong|i|em|u|mark|font)\b/i.test(q.replace(/<span class="quiz-tag[^"]*">[^<]*<\/span>/g, '')), id + ': enunciado V/F sem negrito/ênfase');
    } else {
      mcq++; const ops = [...it.matchAll(/<li>([a-d])\) ([\s\S]*?)<\/li>/g)];
      T(ops.length === 4 && ops.map(x => x[1]).join('') === 'abcd', id + ': 4 alternativas a–d', ops.length);
      T(ops.every(x => !EMP.test(x[0])), id + ': nenhuma alternativa com negrito/cor/marca (sem pista visual)');
      const L = (txt(ans).match(/^([a-d])\)/) || [])[1]; const alvo = ops.find(x => x[1] === L);
      T(!!alvo && txt(ans).replace(/\.$/, '').replace(/^[a-d]\)\s*/, '') === txt(alvo[2]).replace(/\.$/, ''), id + ': a resposta repete o texto da alternativa ' + L, { ans: txt(ans).slice(0, 60) });
      seq.push(L);
    }
    const esp = bancoItens.find(x => x === it); T(!!esp, id + ': existe IDÊNTICA no banco (ap2pbanco)');
    T(!/lam-6d-p2-pielonefritis-01/.test(it) || !/laminario de la cátedra|bajo aumento/i.test(it), id + ': se usa a imagem de pielonefrite, sem «laminario de la cátedra»/«bajo aumento»');
  });
  T(mcq + vf === 12, b + ': ' + mcq + ' MCQ + ' + vf + ' V/F'); total.mcq += mcq; total.vf += vf; corretas.push([b, seq.join('')]);
  T(!/(.)\1\1/.test(seq.join('')), b + ': letras certas sem corrida de 3 (' + seq.join('') + ')');
}
T(total.mcq === 20 && total.vf === 4, 'blocos 17+18: 20 MCQ + 4 V/F (' + total.mcq + '+' + total.vf + ')');
T(bancoItens.length === 244, 'banco: 244 perguntas (' + bancoItens.length + ')');
const b18 = sec('ap2pb18') + banco.slice(0, 0);
for (const trecho of [/laminario de la cátedra/i, /bajo aumento/i]) T(!trecho.test(sec('ap2pb18').replace('ni que provenga del laminario de la cátedra', '')), 'bloco 18: sem ' + trecho + ' (a imagem de pielonefrite tem origem não comprovada)');
T(/no es una figura del PDF/.test(sec('ap2pb18')) && /otro archivo/.test(sec('ap2pb18')) && /misma lámina/.test(sec('ap2pb18')), 'bloco 18: diz que a imagem é de outro arquivo e que não se comprovou ser a lâmina do PDF');
T(/no se pudo comprobar que sea la lámina del PDF/.test(sec('ap2pcierre')), 'cierre: mesma ressalva sobre a imagem de pielonefrite');
const mis = (HTML.match(/lam-6d-p2-pielonefritis-01\.webp/g) || []).length; T(mis >= 4, 'imagem de pielonefrite usada (' + mis + ' referências, todas as mesmas)');
T(fs.existsSync(path.join(ROOT, 'assets/img/anatoprat2/lam-6d-p2-pielonefritis-01.webp')), 'o arquivo da imagem existe');
console.log('\nap2p-final-b17-b18 (estático): ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK'));
if (process.argv.includes('--estatico') || bad) process.exit(bad ? 1 : 0);
/* ---------------- navegador ---------------- */
const { chromium } = require('playwright'); const L = require('../ensaio-layout/lib.cjs');
let ok2 = 0, bad2 = 0; const U = (c, m, x) => { if (c) ok2++; else { bad2++; console.log('  ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 260) : ''); } };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'anatomia-patologica-ii-practica');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const escolha of ['certo', 'errado']) {
    const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'controle', corr: true }); const erros = []; r.page.on('pageerror', e => erros.push(String(e))); await r.page.waitForTimeout(2500);
    const res = await r.page.evaluate(async esc => {
      const out = { vf: 0, ok: 0, falhas: [], mcq: 0, mcqOk: 0 };
      for (const b of ['ap2pb17', 'ap2pb18']) for (const el of document.getElementById(b).querySelectorAll('.quiz-item')) {
        el.scrollIntoView({ block: 'center' });
        if (el.querySelector('.tf-buttons')) {
          out.vf++; const ans = el.querySelector('.answer strong').textContent.trim(); const verd = /^VERDADERO/.test(ans); const quer = esc === 'certo' ? (verd ? 'V' : 'F') : (verd ? 'F' : 'V');
          const btn = el.querySelector('.tf-btn[data-tf="' + quer + '"]'); btn.click(); await new Promise(r => setTimeout(r, 60));
          const marcou = esc === 'certo' ? btn.classList.contains('correct') : btn.classList.contains('wrong') || (!btn.classList.contains('correct') && el.querySelector('.tf-btn.correct, .tf-btn.wrong'));
          if (marcou) out.ok++; else out.falhas.push(b + ' V/F ' + esc + ': ' + el.querySelector('.quiz-question').textContent.slice(-50));
        } else {
          out.mcq++; const letra = el.querySelector('.answer strong').textContent.trim()[0].toLowerCase(); const lis = [...el.querySelectorAll('li[data-option]')];
          const pick = esc === 'certo' ? letra : lis.map(l => l.dataset.option.toLowerCase()).find(x => x !== letra); const li = lis.find(l => l.dataset.option.toLowerCase() === pick); li.click(); await new Promise(r => setTimeout(r, 80));
          const cert = lis.find(l => l.dataset.option.toLowerCase() === letra);
          const bom = el.classList.contains('answered') && (esc === 'certo' ? li.classList.contains('correct') : li.classList.contains('wrong') && cert.classList.contains('correct'));
          if (bom) out.mcqOk++; else out.falhas.push(b + ' MCQ ' + esc + ': ' + el.querySelector('.quiz-question').textContent.slice(-40));
        }
      }
      return out;
    }, escolha);
    await r.page.waitForTimeout(1200);
    const reveladas = await r.page.evaluate(() => [...document.querySelectorAll('#ap2pb17 .quiz-item, #ap2pb18 .quiz-item')].filter(e => e.querySelector('.answer.show')).length);
    U(res.vf === 4 && res.ok === res.vf, 'V/F: clicando o botão ' + escolha.toUpperCase() + ' de cada pergunta, a marcação certa aparece (' + res.ok + '/' + res.vf + ')', res.falhas.slice(0, 3));
    U(res.mcq === 20 && res.mcqOk === res.mcq, 'MCQ: clicando a alternativa ' + escolha.toUpperCase() + ', a marcação certa aparece (' + res.mcqOk + '/' + res.mcq + ')', res.falhas.slice(0, 3));
    U(reveladas === 24, 'depois de responder, a explicação das 24 perguntas aparece (' + reveladas + '/24)');
    U(erros.length === 0, 'sem erro de página (' + escolha + ')' + (erros[0] ? ': ' + erros[0] : ''));
    await r.page.context().close();
  }
  await br.close(); srv.close();
  console.log('ap2p-final-b17-b18 (navegador): ' + ok2 + '/' + (ok2 + bad2) + (bad2 ? ' — ' + bad2 + ' FALHAS' : ' OK')); process.exit(bad2 ? 1 : 0);
})();
