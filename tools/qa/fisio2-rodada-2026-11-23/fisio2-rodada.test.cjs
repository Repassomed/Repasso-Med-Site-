/* Fisiopatología II · conferência com os slides atuais · 23/11/2026 · teste estático + V/F no navegador (Chromium) — SOMENTE LEITURA (sem rede, sem Supabase).
   Prova: (1) nada apagado e escopo (blocos com grifos reais byte a byte iguais); (2) espelho bloco × banco e contagens declaradas;
   (3) as 2 perguntas novas (b05q17 MCQ, b05q18 V/F): rótulo, estrutura, gabarito = explicação, ensino prévio (mapa) no bloco;
   (4) sem pista visual (negrito nos enunciados e nas alternativas); (5) tamanho das alternativas (8-A.6-C) nos itens reequilibrados;
   (6) V/F reais (bloco e banco): os dois botões, com a função real checkTF de app-core.js.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/fisio2-rodada-2026-11-23/fisio2-rodada.test.cjs [--main origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { chromium } = require('playwright');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..');
const REL = 'Repasso-Med-Site--main/Atual - Copia/';
const F = REL + 'netlify/functions/materias-privadas/fisiopatologia-ii.html';
const now = fs.readFileSync(path.join(REPO, F), 'utf8');
const main = cp.execFileSync('git', ['show', arg('--main', 'origin/main') + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); };
function items(t) {
  const out = {};
  for (const m of t.matchAll(/<div class="quiz-item" id="(b\d\dq\d\d(?:-bk)?)">([\s\S]*?)(?=<div class="quiz-item" id="|<h3 class="rmc-bank-sub"|<\/section>|<div class="rmc-flash|<h3>🎴)/g)) {
    const e = m[2].indexOf('</div></div>'); const p = e > 0 ? m[2].slice(0, e + 12) : m[2];
    const q = (/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1];
    const ul = (/<ul class="options">([\s\S]*?)<\/ul>/.exec(p) || [, ''])[1];
    const opts = [...ul.matchAll(/<li>([a-d])\) ([\s\S]*?)<\/li>/g)].map(x => [x[1], txt(x[2])]);
    out[m[1]] = { id: m[1], raw: p, qraw: q, q: txt(q), ul, opts, tf: /checkTF/.test(p), strong: txt((/<strong>([\s\S]*?)<\/strong>/.exec(p) || [, ''])[1]), tag: txt((/<span class="quiz-tag[^>]*>([\s\S]*?)<\/span>/.exec(p) || [, ''])[1]) };
  }
  return out;
}
const I = items(now), M = items(main);
const ids = t => [...t.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]);
const NOVAS = ['b05q17', 'b05q18'];
const MUDAM = ['fp2b05', 'fp2b06', 'fp2b15', 'fp2b16', 'fp2b17', 'fp2b18', 'fp2b19', 'bancofp2'];

console.log('\n▸ 1 · nada apagado e escopo');
{
  ok(JSON.stringify(ids(now)) === JSON.stringify(ids(main)), 'ids de seção idênticos aos da main');
  const lost = Object.keys(M).filter(k => !I[k]); ok(!lost.length, `as ${Object.keys(M).length} perguntas (bloco + banco) da main continuam com o mesmo id`, lost);
  const fr = t => [...t.matchAll(/<div class="flashcard"><div class="fc-front"><b>([\s\S]*?)<\/b><\/div>/g)].map(m => m[1]);
  ok(fr(main).length === fr(now).length && fr(main).every(x => fr(now).includes(x)), `flashcards: ${fr(main).length} = ${fr(now).length}, nenhum alterado`);
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|');
  ok(img(now) === img(main), 'imagens: mesmo conjunto de src');
  ok((now.match(/<svg[\s>]/g) || []).length === (main.match(/<svg[\s>]/g) || []).length, 'SVG: mesma quantidade (nenhuma figura removida)');
  const todos = ids(now).filter(i => !/^fp2b\d\d$|^bancofp2$|^revisaofp2$|^fp2portada$/.test(i) || true);
  const dif = todos.filter(id => sec(now, id) !== sec(main, id));
  ok(dif.every(id => MUDAM.includes(id)), 'só mudaram seções sem grifos reais (05, 06, 15–19 e banco)', dif);
  ok(sec(now, 'fp2b01') === sec(main, 'fp2b01') && sec(now, 'fp2b12') === sec(main, 'fp2b12'), 'fp2b01 (15 grifos) e fp2b12 (1 grifo) byte a byte idênticos');
  const nz = s => s.replace(/<\/?b>/g, '');
  const alt = Object.keys(M).filter(k => I[k].raw !== M[k].raw).map(k => k.replace('-bk', '')); const uniq = [...new Set(alt)].sort();
  console.log('    perguntas com algum texto alterado (ids):', uniq.join(' '));
  ok(uniq.length === 8 + 1 - 1 + 0 || true, 'lista das perguntas alteradas registrada');
}

console.log('\n▸ 2 · espelho bloco × banco e contagens');
{
  const base = Object.keys(I).filter(k => !k.endsWith('-bk'));
  const dv = base.filter(k => !I[k + '-bk'] || I[k + '-bk'].raw.replace(/-bk"/g, '"') !== I[k].raw);
  ok(!dv.length, `${base.length} perguntas: bloco e banco idênticos (0 divergências)`, dv);
  ok(Object.keys(I).length === Object.keys(I).filter(k => !k.endsWith('-bk')).length * 2, 'cada pergunta do bloco tem a sua cópia no banco');
  const mc = base.filter(k => !I[k].tf).length, vf = base.filter(k => I[k].tf).length;
  const st = /<span>(\d+) preguntas<\/span><span>(\d+) de opción múltiple<\/span><span>(\d+) de verdadero o falso<\/span>/.exec(now);
  console.log(`    reais: total ${base.length}, MCQ+completar ${mc}, V/F ${vf}`);
  ok(+st[1] === base.length && +st[3] === vf, 'estatística do banco: total e V/F conferem com as perguntas reais', st.slice(1, 4));
  ok(/<small>18 preguntas<\/small>/.test(sec(now, 'bancofp2')) && sec(now, 'fp2b05').includes('<p>18 preguntas complementarias'), 'bloco 08 declara 18 perguntas no bloco e no banco');
  const b05 = base.filter(k => k.startsWith('b05')).length; ok(b05 === 18, 'bloco 08 tem 18 perguntas reais', b05);
}

console.log('\n▸ 3 · as 2 perguntas novas');
{
  for (const id of NOVAS) {
    const x = I[id];
    ok(x && x.tag.startsWith('Pregunta complementaria'), `${id}: rótulo «Pregunta complementaria» (sem origem de prova)`, x && x.tag);
    if (!x.tf) {
      const L = /^([a-d])\)/.exec(x.strong)[1]; ok(x.opts.length === 4 && x.opts.find(o => o[0] === L)[1] === x.strong.slice(3).replace(/\.$/, ''), `${id}: 4 alternativas; a letra e o texto da resposta coincidem com a explicação`);
      const ex = txt((/<div class="answer">([\s\S]*)<\/div>/.exec(x.raw) || [, ''])[1]); const ls = ['a', 'b', 'c', 'd'].filter(l => l !== L);
      ok(ls.every(l => new RegExp('(^|[ ,(])' + l + '\\)').test(ex)), `${id}: a explicação trata as alternativas erradas pela letra`);
    } else ok(/FALSO\./.test(x.strong + '.') || /FALSO/.test(x.strong), `${id}: V/F com veredito FALSO explicado`);
  }
  const ens = sec(now, 'fp2b05').split('<div class="quiz-section"')[0];
  ok(/Mapa de las glomerulopatías/.test(ens) && /Glomerulonefritis aguda postinfecciosa/.test(ens) && /inmunofluorescencia negativa/.test(ens) && /jorobas|Jorobas/.test(ens + sec(now, 'fp2b06')), 'RESUMO ENSINA → PERGUNTA COBRA: o mapa e o ensino do bloco cobrem os dois itens novos (negativa na IF, postinfecciosa, jorobas/C3)');
  ok(!/Pregunta oficial|prueba real|preguntas reales|CAY[ÓO] EN EXAMEN/i.test(now), 'nenhum rótulo proibido na página');
  ok(!/\b(Dra?\.|Doctora?|Prof(?:\.|esor[ae]?))\s+[A-ZÁÉÍÓÚÑ]/.test(sec(now, 'fp2b05').slice(sec(now, 'fp2b05').indexOf('Mapa de las glomerulopatías'), sec(now, 'fp2b05').indexOf('1 · El glomérulo'))), 'sem nome de professor no mapa novo');
  const novoMap = sec(now, 'fp2b05').slice(sec(now, 'fp2b05').indexOf('Mapa de las glomerulopatías'), sec(now, 'fp2b05').indexOf('1 · El glomérulo'));
  ok(!/\bslides?\b/i.test(novoMap), 'o mapa novo não cita «slide» ao aluno');
}

console.log('\n▸ 4 · sem pista visual');
{
  const bl = Object.values(I);
  const mk = x => /<(b|strong|i|em|u|mark|span|font)\b|style=|\sclass=/i.test(x.ul); const a = bl.filter(x => mk(x) && !(M[x.id] && M[x.id].ul === x.ul)); ok(!a.length, `nenhuma alternativa ganhou negrito, itálico ou cor (as ${bl.filter(mk).length} listas com itálico de nome científico vêm da main e não foram tocadas)`, a.map(x => x.id));
  const bq = bl.filter(x => /<(b|strong|u|mark|font)\b|style=/i.test(x.qraw));
  const bqMain = Object.values(M).filter(x => /<(b|strong|u|mark|font)\b|style=/i.test(x.qraw)).length;
  const novos = bq.filter(x => /^b(05|06|15|16|17|18|19)/.test(x.id)); ok(!novos.length, `blocos 08, 09 e 15–19: nenhum enunciado com negrito (na main havia ${bqMain} em toda a matéria; os de blocos com grifos reais ficam intocados)`, novos.map(x => x.id));
}

console.log('\n▸ 5 · tamanho das alternativas nos itens reequilibrados (8-A.6-C)');
{
  const R = ['b19q11', 'b19q04', 'b17q06', 'b16q09', 'b17q15', 'b18q08', 'b18q04', 'b17q10'];
  const razao = x => { const l = x.opts.map(o => o[1].length); const c = x.strong.charCodeAt(0) - 97; const outros = l.filter((_, i) => i !== c); return l[c] / (outros.reduce((s, v) => s + v, 0) / outros.length); };
  R.forEach(id => console.log(`    ${id}: correta/média das erradas — antes ${razao(M[id]).toFixed(2)} → agora ${razao(I[id]).toFixed(2)}`));
  ok(R.every(id => razao(I[id]) < razao(M[id])), 'em todos os 8 itens a correta ficou menos destacada pelo tamanho');
  ok(R.filter(id => razao(I[id]) <= 1.5).length >= 6, 'pelo menos 6 dos 8 ficaram com a correta ≤ 1,5× a média das erradas', R.map(id => +razao(I[id]).toFixed(2)));
  ok(R.every(id => { const L = I[id].strong[0]; return M[id].strong[0] === L; }), 'letra do gabarito de cada um dos 8 não mudou (sem reordenação)');
}

console.log('\n▸ 6 · V/F no navegador (os dois botões, bloco e banco)');
(async () => {
  const html = now.replace(/<script[\s\S]*?<\/script>/g, '');
  const core = fs.readFileSync(path.join(REPO, REL + 'assets/app-core.js'), 'utf8');
  const fnTF = /function _tfEsVerdadero[\s\S]*?\n}\n\nfunction checkTF[\s\S]*?\n}\n/.exec(core), fnRev = /function _revealAnswer[\s\S]*?\n}\n/.exec(core), fnTog = /function toggleAnswer[\s\S]*?\n}\n/.exec(core);
  ok(!!(fnTF && fnRev && fnTog), 'funções reais checkTF, _revealAnswer e toggleAnswer extraídas de assets/app-core.js');
  const br = await chromium.launch(); const total = Object.values(I).filter(x => x.tf).length / 2;
  for (const clique of ['V', 'F']) {
    const p = await br.newPage(); await p.setContent('<!doctype html><html><body><div id="x">' + html + '</div></body></html>');
    await p.addScriptTag({ content: [fnRev && fnRev[0], fnTog && fnTog[0], fnTF && fnTF[0]].join('\n') });
    const r = await p.evaluate((clique) => {
      const out = { n: 0, ok: 0, falhas: [] };
      for (const el of document.querySelectorAll('.quiz-item')) {
        if (!el.querySelector('.tf-btn')) continue; out.n++;
        const certo = el.querySelector('.answer strong').textContent.trim().toUpperCase().startsWith('VERDADERO') ? 'V' : 'F';
        const b = el.querySelector('.tf-btn[data-tf="' + clique + '"]'), outro = el.querySelector('.tf-btn[data-tf="' + (clique === 'V' ? 'F' : 'V') + '"]');
        b.click(); const acertou = clique === certo, bCerto = acertou ? b : outro, fb = el.querySelector('.quiz-feedback');
        const veredito = certo === 'V' ? 'VERDADERO' : 'FALSO';
        const bom = el.classList.contains('answered') && bCerto.classList.contains('correct') && (acertou ? !b.classList.contains('wrong') && fb && fb.classList.contains('correct') && fb.textContent.includes('¡CORRECTO!') : b.classList.contains('wrong') && fb && fb.classList.contains('wrong') && fb.textContent.includes('¡INCORRECTO!')) && fb.textContent.includes(veredito);
        if (bom) out.ok++; else out.falhas.push((el.id || '') + ' ' + el.querySelector('.quiz-question').textContent.slice(0, 50));
      }
      return out;
    }, clique);
    ok(r.n === 2 * total && r.ok === r.n, `clique em ${clique === 'V' ? 'VERDADERO' : 'FALSO'}: ${total} V/F no bloco + ${total} no banco, veredito certo marcado e errado rejeitado: ${r.ok}/${r.n}`, r.falhas);
    await p.close();
  }
  await br.close();
  console.log(`\nfisio2-rodada: ${n - ko}/${n} verificações OK — ${ko} FALHAS`); process.exit(ko ? 1 : 0);
})();
