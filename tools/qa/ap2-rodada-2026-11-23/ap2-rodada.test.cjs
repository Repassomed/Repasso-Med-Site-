/* AP II (teoria) · rodada de questões de 23/11/2026 · teste estático + V/F no navegador (Chromium) — SOMENTE LEITURA (sem rede, sem Supabase).
   Prova: (1) nada apagado em relação à main (questões, flashcards, imagens, SVG, ids de seção); (2) espelho bloco × banco = 0 divergências e contagens declaradas;
   (3) as 19 perguntas novas: rótulo correto, estrutura, letra do gabarito = letra da explicação, cobertas pelo ensino do bloco; (4) nenhuma pista visual
   (negrito/itálico/cor) em alternativas nem negrito nos enunciados; (5) distribuição das letras (8-A.7) e tamanho das alternativas (8-A.6-C, só medição);
   (6) os 10 V/F (bloco e banco): botão certo aceito e botão errado recusado nos dois botões, com a função real checkTF de app-core.js.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ap2-rodada-2026-11-23/ap2-rodada.test.cjs [--main origin/main]
   Os grifos reais são provados à parte, com grifos-motor.cjs (precisa do arquivo de grifos lido em modo leitura). */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { chromium } = require('playwright');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..');
const REL = 'Repasso-Med-Site--main/Atual - Copia/';
const F = REL + 'netlify/functions/materias-privadas/anatomia-patologica-ii.html';
const now = fs.readFileSync(path.join(REPO, F), 'utf8');
const main = cp.execFileSync('git', ['show', arg('--main', 'origin/main') + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); };
const BL = ['ap2b01', 'ap2b02', 'ap2b03', 'ap2b04', 'ap2b05', 'ap2b06', 'ap2b07', 'ap2b08'];
function items(s) {
  return s.split(/(?=<div class="quiz-item">)/).slice(1).map(p => {
    const q = (/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1];
    const ul = (/<ul class="options">([\s\S]*?)<\/ul>/.exec(p) || [, ''])[1];
    const opts = [...ul.matchAll(/<li>([a-d])\) ([\s\S]*?)<\/li>/g)].map(m => [m[1], txt(m[2]), m[2]]);
    const ans = (/<div class="answer">([\s\S]*?)<\/div>\s*<\/div>/.exec(p) || [, ''])[1];
    const strong = txt((/<strong>([\s\S]*?)<\/strong>/.exec(ans) || [, ''])[1]);
    return { q: txt(q), qraw: q, ul, opts, ans, strong, tf: /checkTF/.test(p), tag: (/quiz-tag ([a-z ]+)"/.exec(p) || [, ''])[1], tagtxt: txt((/<span class="quiz-tag[^>]*>([\s\S]*?)<\/span>/.exec(p) || [, ''])[1]) };
  });
}
const teach = (t, id) => sec(t, id).split(/<div class="quiz-section"/)[0];
const blk = {}, blkMain = {};
for (const id of BL) { const s = sec(now, id), m = sec(main, id); blk[id] = items(s.slice(s.indexOf('<div class="quiz-section"'))); blkMain[id] = items(m.slice(m.indexOf('<div class="quiz-section"'))); }
const bank = items(sec(now, 'bancoap2')), bankMain = items(sec(main, 'bancoap2'));
const allB = BL.flatMap(id => blk[id]), allMain = BL.flatMap(id => blkMain[id]);

console.log('\n▸ 1 · nada apagado e escopo');
{
  const ids = t => [...t.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]).join(',');
  ok(ids(now) === ids(main), 'ids de seção idênticos aos da main');
  const nz = q => q.replace(/\s+/g, '');
  const stems = new Set(allB.map(x => nz(x.q)));
  const lost = allMain.filter(x => !stems.has(nz(x.q)));
  ok(!lost.length, `as ${allMain.length} perguntas da main continuam (enunciado, sem as marcas de tag/negrito)`, lost.map(x => x.q));
  const fr = t => [...t.matchAll(/<div class="flashcard"><div class="fc-front"><b>([\s\S]*?)<\/b><\/div>/g)].map(m => m[1]);
  const lf = fr(main).filter(x => !fr(now).includes(x)); ok(!lf.length && fr(now).length === fr(main).length, `flashcards: ${fr(main).length} = ${fr(now).length}, nenhum alterado`, lf);
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|');
  ok(img(now) === img(main), 'imagens: mesmo conjunto de src (nenhuma removida)');
  ok((now.match(/<svg[\s>]/g) || []).length === (main.match(/<svg[\s>]/g) || []).length, 'SVG: mesma quantidade');
  ok(sec(now, 'ap2b07') === sec(main, 'ap2b07') && sec(now, 'ap2b08') === sec(main, 'ap2b08'), 'b07 e b08 (ensino, perguntas, flashcards) byte a byte idênticos aos da main');
  ok(sec(now, 'ap2intro') === sec(main, 'ap2intro') && sec(now, 'ap2biblio') === sec(main, 'ap2biblio') && sec(now, 'bancofcap2') === sec(main, 'bancofcap2'), 'intro, bibliografia e banco de flashcards idênticos');
  const dif = BL.filter(id => teach(now, id) !== teach(main, id));
  ok(JSON.stringify(dif) === JSON.stringify(['ap2b02', 'ap2b04', 'ap2b06']), 'o ensino só mudou em b02, b04 e b06 (1 parágrafo novo em cada)', dif);
  const INI = { ap2b02: '<p>Sobre el <b>pronóstico</b>', ap2b04: '<p>Una precisión sobre el origen:', ap2b06: '<p>Un dato de epidemiología que ayuda a entender el origen' };
  for (const id of dif) {
    const b = teach(now, id), i = b.indexOf(INI[id]); const e = b.indexOf('</p>', i) + 4;
    const sem = b.slice(0, i - 1) + b.slice(e);
    ok(i > 0 && b[i - 1] === '\n' && sem === teach(main, id) && (b.slice(i, e).match(/<p>/g) || []).length === 1, `${id}: removido o 1 parágrafo novo (${e - i} caracteres), o ensino volta a ser idêntico ao da main — nenhuma frase existente foi alterada`);
  }
}

console.log('\n▸ 2 · espelho bloco × banco e contagens declaradas');
{
  const key = x => JSON.stringify([x.q, x.opts.map(o => o[1]), x.strong, txt(x.ans), x.tagtxt]);
  const A = new Map(); allB.forEach(x => A.set(key(x), (A.get(key(x)) || 0) + 1));
  const B = new Map(); bank.forEach(x => B.set(key(x), (B.get(key(x)) || 0) + 1));
  let dif = 0; for (const [k, v] of A) dif += Math.abs(v - (B.get(k) || 0)); for (const [k, v] of B) if (!A.has(k)) dif += v;
  ok(allB.length === 224 && bank.length === 224 && dif === 0, `blocos 224 = banco 224; divergências bloco×banco: ${dif} (esperado 0)`);
  const per = BL.map(id => blk[id].length).join('/'); ok(per === '38/32/25/26/26/23/37/17', 'por bloco 38/32/25/26/26/23/37/17 (' + per + ')');
  const head = [...sec(now, 'bancoap2').matchAll(/Bloque 0(\d) ·[^<]*<small>\((\d+) preguntas\)/g)].map(m => +m[2]).join('/');
  ok(head === per, 'cabeçalhos do banco declaram as mesmas contagens por bloco (' + head + ')');
  const st = /<span>(\d+) preguntas<\/span><span>(\d+) basadas en preguntas de examen<\/span><span>(\d+) variantes<\/span><span>(\d+) verdadero\/falso<\/span><span>(\d+) bloques publicados<\/span>/.exec(now);
  const ex = allB.filter(x => /^Basada en preguntas de examen|basada en examen$/.test(x.tagtxt)).length, vf = allB.filter(x => x.tf).length, va = allB.length - ex;
  ok(st && +st[1] === 224 && +st[2] === ex && +st[3] === va && +st[4] === vf, `estatísticas declaradas = reais: ${st && st.slice(1).join(' · ')} ↔ ${allB.length} · ${ex} · ${va} · ${vf}`);
  ok(ex === 157 && va === 67, 'baseadas em exame 157 (138 + 19 novas), 67 complementares/variantes (inalteradas)');
}

console.log('\n▸ 3 · as 19 perguntas novas');
const NOVAS = [
  ['ap2b01', 'Una joven de 17 años nota una lesión dolorosa blanco-grisácea', ['afta', 'cura sola']],
  ['ap2b01', 'Una paciente de 23 años, primigesta', ['tumor del embarazo', 'tejido de granulación']],
  ['ap2b01', 'Un hombre de 54 años, no fumador, consulta por una úlcera que no cicatriza en la base de la lengua', ['VPH-16', 'base de lengua', 'orofaringe']],
  ['ap2b01', 'Completá: el principal factor de riesgo adquirido de la leucoplasia', ['tabaquismo']],
  ['ap2b02', 'Un hombre de 50 años, con cirrosis por consumo crónico de alcohol, presenta hematemesis masiva', ['hipertensión portal', 'submucosa']],
  ['ap2b02', 'Un hombre de 30 años presenta una hematemesis súbita tras un fin de semana', ['intoxicación alcohólica aguda', 'Mallory-Weiss']],
  ['ap2b02', 'Citá dos manifestaciones clínicas frecuentes de la enfermedad por reflujo', ['pirosis', 'regurgitación']],
  ['ap2b02', '¿Qué hallazgo microscópico caracteriza al esófago de Barrett?', ['células caliciformes', 'metaplasia']],
  ['ap2b02', '¿Cuál de los siguientes hallazgos se asocia a mal pronóstico en el carcinoma epidermoide de esófago?', ['metástasis ganglionar', 'pronóstico']],
  ['ap2b02', 'Un tumor esofágico está tan poco diferenciado', ['inmunohistoquímica', 'queratina']],
  ['ap2b03', 'Completá: la úlcera péptica es una complicación de la gastritis crónica', ['duodeno proximal', 'pared duodenal anterior']],
  ['ap2b03', 'Citá dos hallazgos microscópicos característicos de la gastritis crónica atrófica autoinmunitaria', ['linfoplasmocitario', 'atrofia']],
  ['ap2b03', 'Citá dos neoplasias asociadas a la gastritis crónica por Helicobacter pylori', ['linfoma', 'metaplasia intestinal']],
  ['ap2b04', 'Citá dos lesiones precursoras del adenocarcinoma gástrico', ['adenomas gástricos', 'displasia']],
  ['ap2b05', 'Citá dos manifestaciones extraintestinales hepatobiliares frecuentes de la colitis ulcerosa', ['pericolangitis', 'colangitis esclerosante primaria']],
  ['ap2b05', 'Citá dos manifestaciones clínicas frecuentes de la enfermedad de Crohn', ['diarrea', 'dolor abdominal']],
  ['ap2b06', 'Un paciente tiene un adenocarcinoma de colon sigmoideo', ['fibras vegetales no absorbibles', 'grasas']],
  ['ap2b06', 'Citá dos tipos de pólipos no neoplásicos del intestino', ['hamartomatosos', 'hiperplásico']],
  ['ap2b06', 'Citá dos hallazgos microscópicos característicos de un adenoma colorrectal', ['hipercromasia', 'células caliciformes']],
];
{
  ok(NOVAS.length === 19, '19 perguntas novas definidas no teste');
  let noBloco = 0, noBanco = 0, rot = 0, estr = 0, letra = 0, expl = 0, ens = [], dup = 0;
  for (const [id, ini, chaves] of NOVAS) {
    const b = blk[id].filter(x => x.q.includes(ini)), k = bank.filter(x => x.q.includes(ini));
    if (b.length === 1) noBloco++; if (k.length === 1) noBanco++; if (b.length > 1 || k.length > 1) dup++;
    const x = b[0]; if (!x) continue;
    if (x.tagtxt === 'Basada en preguntas de examen') rot++;
    if (x.opts.length) {
      const m = /^([a-d])\) /.exec(x.strong); const l = m && m[1]; const o = x.opts.find(o => o[0] === l);
      if (x.opts.length === 4 && o && x.strong === l + ') ' + o[1]) estr++;
      const resto = x.opts.map(o => o[0]).filter(c => c !== l); if (resto.every(c => new RegExp('(^|\\s)' + c + '\\) ').test(txt(x.ans.split('</strong>')[1] || '')))) expl++;
      letra++;
    } else { estr++; expl++; letra++; }
    const T = txt(teach(now, id)).toLowerCase(); const falta = chaves.filter(c => !T.includes(c.toLowerCase()));
    if (falta.length) ens.push([id, ini.slice(0, 40), falta]);
  }
  ok(noBloco === 19 && noBanco === 19 && !dup, `as 19 aparecem uma vez no bloco e uma vez no banco: ${noBloco}/${noBanco}`);
  ok(rot === 19, 'as 19 levam exatamente o rótulo «Basada en preguntas de examen» (nenhuma «oficial» nem «prova real»)');
  ok(estr === 19 && letra === 19, 'estrutura: MCQ com 4 alternativas e gabarito = letra e texto da alternativa; abertas com resposta');
  ok(expl === 19, 'a explicação trata cada uma das 3 alternativas erradas pela letra (MCQ)');
  ok(!ens.length, 'cobertura RESUMO → PERGUNTA: os termos-chave de cada pergunta já estão no ensino do bloco (antes das perguntas)', ens);
  ok(!/\b(Dra?\.|Doctora?|Prof(?:\.|esor[ae]?))\s+[A-ZÁÉÍÓÚÑ]/.test(NOVAS.map(a => a[1]).join(' ') + now.slice(now.indexOf('Sobre el <b>pronóstico</b>'), now.indexOf('Sobre el <b>pronóstico</b>') + 700)), 'sem nome de professor nos textos novos');
  ok(!/Pregunta oficial|prueba real|preguntas reales|CAY[ÓO] EN EXAMEN/i.test(now), 'nenhum rótulo proibido (oficial/prueba real/preguntas reales/CAYÓ EN EXAMEN) na página');
}

console.log('\n▸ 4 · sem pista visual (8-A.6-D)');
{
  const alts = allB.concat(bank).filter(x => x.opts.length);
  const emOpt = alts.filter(x => /<(b|strong|i|em|u|mark|span|font)\b|style=|\sclass=|color:/i.test(x.ul));
  ok(!emOpt.length, `nenhuma das ${alts.length} listas de alternativas (bloco + banco) tem negrito, itálico, cor ou classe`, emOpt.map(x => x.q));
  const emQ = allB.concat(bank).filter(x => /<(b|strong|u|mark|font)\b|style=/i.test(x.qraw));
  ok(!emQ.length, `nenhum dos ${allB.length + bank.length} enunciados (inclui os V/F) tem negrito/destaque antes de responder`, emQ.map(x => x.q));
  const antes = allMain.concat(bankMain).filter(x => /<(b|strong|i|em|u|mark)\b/.test(x.ul) || /<(b|strong|u|mark)\b/.test(x.qraw)).length;
  console.log(`    (referência: na main havia ${antes} itens com itálico nas alternativas ou negrito no enunciado)`);
}

console.log('\n▸ 5 · gabarito (8-A.7) e tamanho das alternativas (8-A.6-C)');
{
  const mc = allB.filter(x => x.opts.length === 4); const L = mc.map(x => /^([a-d])\)/.exec(x.strong)[1]);
  const c = { a: 0, b: 0, c: 0, d: 0 }; L.forEach(l => c[l]++); const N = L.length; const chi = Object.values(c).reduce((s, v) => s + (v - N / 4) ** 2 / (N / 4), 0);
  let run = 1, maxrun = 1; for (let i = 1; i < N; i++) { run = L[i] === L[i - 1] ? run + 1 : 1; maxrun = Math.max(maxrun, run); }
  const seq = L.join('');
  console.log(`    letras (${N} MCQ únicas): ${JSON.stringify(c)} · χ²=${chi.toFixed(2)} · maior corrida ${maxrun} · abcd ${seq.split('abcd').length - 1} · dcba ${seq.split('dcba').length - 1}`);
  ok(chi < 7.81 && maxrun <= 4 && !seq.includes('abcd') && !seq.includes('dcba'), 'letras equilibradas (χ² < 7,81, gl=3), corrida ≤ 4 (a mesma da main), sem abcd/dcba');
  const med = x => { const l = x.opts.map(o => o[1].length); const c = +/^([a-d])\)/.exec(x.strong)[1].charCodeAt(0) - 97; const mx = Math.max(...l); return { uni: l[c] === mx && l.filter(v => v === mx).length === 1, emp: l[c] === mx && l.filter(v => v === mx).length > 1 }; };
  const u = mc.filter(x => med(x).uni).length, e = mc.filter(x => med(x).emp).length;
  const mm = allMain.filter(x => x.opts.length === 4); const um = mm.filter(x => med(x).uni).length;
  console.log(`    correta = única mais longa: antes ${um}/${mm.length} (${(100 * um / mm.length).toFixed(1)}%) → agora ${u}/${mc.length} (${(100 * u / mc.length).toFixed(1)}%); empates ${e}`);
  const nov = mc.filter(x => NOVAS.some(a => x.q.includes(a[1])));
  ok(nov.filter(x => med(x).uni).length <= 2, `entre as ${nov.length} MCQ novas, no máximo 2 têm a correta como única mais longa (${nov.filter(x => med(x).uni).length})`);
}

console.log('\n▸ 6 · V/F no navegador (os dois botões, bloco e banco)');
(async () => {
  const html = now.replace(/<script[\s\S]*?<\/script>/g, '');
  const core = fs.readFileSync(path.join(REPO, REL + 'assets/app-core.js'), 'utf8');
  const fnTF = /function _tfEsVerdadero[\s\S]*?\n}\n\nfunction checkTF[\s\S]*?\n}\n/.exec(core), fnRev = /function _revealAnswer[\s\S]*?\n}\n/.exec(core), fnTog = /function toggleAnswer[\s\S]*?\n}\n/.exec(core);
  ok(!!(fnTF && fnRev && fnTog), 'funções reais checkTF, _revealAnswer e toggleAnswer extraídas de assets/app-core.js');
  const br = await chromium.launch(); let totalVF = 0, certos = 0;
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
        const bom = el.classList.contains('answered') && bCerto.classList.contains('correct') && (acertou ? !b.classList.contains('wrong') && fb && fb.classList.contains('correct') && fb.textContent.includes('¡CORRECTO!') : b.classList.contains('wrong') && fb && fb.classList.contains('wrong') && fb.textContent.includes('¡INCORRECTO!')) && fb.textContent.includes(veredito) && !!el.querySelector('.answer') && getComputedStyle(el.querySelector('.answer')).display !== 'none' !== false;
        if (bom) out.ok++; else out.falhas.push(el.querySelector('.quiz-question').textContent.slice(0, 60));
      }
      return out;
    }, clique);
    totalVF += r.n; certos += r.ok;
    ok(r.n === 20 && r.ok === 20, `clique em ${clique === 'V' ? 'VERDADERO' : 'FALSO'}: 20 V/F (10 no bloco + 10 no banco), veredito certo marcado, errado rejeitado, mensagem e explicação corretas: ${r.ok}/${r.n}`, r.falhas);
    await p.close();
  }
  await br.close();
  console.log(`\nap2-rodada: ${n - ko}/${n} verificações OK — ${ko} FALHAS`); process.exit(ko ? 1 : 0);
})();
