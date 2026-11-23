/* Anestesiología · clases 5–8 (23/11/2026) → bloques 16–20 · teste estático + navegador (Chromium) — SOMENTE LEITURA (sem rede, sem Supabase).
   Prova: (1) nada apagado em relação à main; (2) os 5 blocos novos existem, na ordem dos slides, antes do banco; (3) espelho bloco × banco e contagens declaradas;
   (4) 60 perguntas novas: rótulo, estrutura, letra da resposta = letra da explicação, sem negrito/itálico em enunciado e alternativas, sem a resposta única mais longa em excesso;
   (5) cobertura por slide: termos-chave de cada slide presentes no bloco; (6) distribuição das letras; (7) navegador: «Ver respuesta» (toggleAnswer real) mostra a resposta nos itens novos, bloco e banco.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ane-slides-2026-11-23/ane-slides.test.cjs [--main origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { chromium } = require('playwright');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..'), REL = 'Repasso-Med-Site--main/Atual - Copia/';
const F = REL + 'netlify/functions/materias-privadas/anestesiologia.html';
const now = fs.readFileSync(path.join(REPO, F), 'utf8');
const main = cp.execFileSync('git', ['show', arg('--main', 'origin/main') + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();
const norm = s => txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/₂/g, '2');
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); };
function items(t) {
  const out = {};
  for (const m of t.matchAll(/<div class="quiz-item" id="(b?q-ane\d+)">([\s\S]*?)<\/div><\/div>/g)) {
    const p = m[2], q = (/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1], ul = (/<ul class="options">([\s\S]*?)<\/ul>/.exec(p) || [, ''])[1];
    const opts = [...ul.matchAll(/<li>([a-d])\) ([\s\S]*?)<\/li>/g)].map(x => [x[1], txt(x[2])]);
    out[m[1]] = { id: m[1], raw: p, qraw: q, q: txt(q), ul, opts, strong: txt((/<strong>([\s\S]*?)<\/strong>/.exec(p) || [, ''])[1]), tag: txt((/<span class="quiz-tag variante">([\s\S]*?)<\/span>/.exec(p) || [, ''])[1]) };
  }
  return out;
}
const I = items(now), M = items(main);
const NOVOS = [16, 17, 18, 19, 20], IDS = []; for (let k = 178; k <= 237; k++) IDS.push('q-ane' + String(k).padStart(3, '0'));
const secIds = t => [...t.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]);

console.log('\n▸ 1 · nada apagado');
{
  const lost = Object.keys(M).filter(k => !I[k] || I[k].raw !== M[k].raw); ok(Object.keys(M).length === 354 && !lost.length, `as ${Object.keys(M).length} perguntas da main (bloco + banco) continuam idênticas, byte a byte`, lost);
  const fr = t => [...t.matchAll(/<div class="flashcard"><div class="fc-front"><b>([\s\S]*?)<\/b><\/div>/g)].map(m => m[1]);
  const lf = fr(main).filter(x => !fr(now).includes(x)); ok(!lf.length && fr(now).length === fr(main).length + 140, `flashcards: ${fr(main).length} → ${fr(now).length} (+140 = 70 no bloco + 70 no mazo geral), nenhum antigo alterado`, lf);
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|'); ok(img(now) === img(main), 'imagens: mesmo conjunto de src (nenhuma removida)');
  ok((now.match(/<svg[\s>]/g) || []).length === (main.match(/<svg[\s>]/g) || []).length, 'SVG: mesma quantidade');
  const ant = secIds(main); ok(secIds(now).filter(x => ant.includes(x)).join() === ant.join(), 'ids de seção antigos na mesma ordem');
  const velhas = ant.filter(id => !['bancoane', 'anecierre'].includes(id)); ok(velhas.every(id => sec(now, id) === sec(main, id)), 'blocos 01–15, portada: byte a byte idênticos aos da main (grifos/âncoras intactos)');
}
console.log('\n▸ 2 · blocos 16–20 na ordem dos slides');
{
  const ids = secIds(now); const pos = NOVOS.map(k => ids.indexOf('aneb' + k));
  ok(pos.every((p, i) => p > 0 && (i === 0 || p === pos[i - 1] + 1)) && ids.indexOf('bancoane') === pos[4] + 1, 'aneb16…aneb20 seguidos, logo antes do banco geral', pos);
  const tema = { 16: /Complicaciones de la anestesia \(1\)/, 17: /Complicaciones de la anestesia \(2\)/, 18: /Dolor agudo posoperatorio/, 19: /Desaturación durante la anestesia/, 20: /Fármacos de la anestesiología/ };
  NOVOS.forEach(k => { const s = sec(now, 'aneb' + k); ok(new RegExp('BLOQUE ' + k + ' ·').test(s) && tema[k].test(s), `bloco ${k}: marcador e título`); const q = (s.match(/class="quiz-item"/g) || []).length, f = (s.match(/class="flashcard"/g) || []).length; ok(q === 12 && f >= 13, `bloco ${k}: ${q} perguntas e ${f} flashcards`, [q, f]); ok(/<table>/.test(s) && /rmc-postit/.test(s) && /rmc-exam/.test(s), `bloco ${k}: explicação desde cero (postit), tabela(s) e «puntos a dominar»`); });
  const html = sec(now, 'aneb16') + sec(now, 'aneb17') + sec(now, 'aneb18') + sec(now, 'aneb19') + sec(now, 'aneb20');
  ok(!/Pregunta oficial|prueba real|preguntas reales|CAY[ÓO] EN EXAMEN|basada en examen/i.test(html), 'nenhum rótulo proibido; nenhuma pergunta apresentada como de prova');
  ok(!/\b(Dra?\.|Doctora?|Prof(?:\.|esor[ae]?))\s+[A-ZÁÉÍÓÚÑ]/.test(html + sec(now, 'bancoane').slice(-120000)), 'sem nome de professor nos blocos novos');
  const open = (html.match(/<div/g) || []).length, close = (html.match(/<\/div>/g) || []).length; ok(open === close, 'div equilibrados nos 5 blocos', [open, close]);
}
console.log('\n▸ 3 · espelho bloco × banco e contagens');
{
  const dv = IDS.filter(k => !I[k] || !I['b' + k] || I['b' + k].raw !== I[k].raw); ok(IDS.length === 60 && !dv.length, '60 perguntas novas: bloco e banco idênticos (0 divergências)', dv);
  const st = /<span>(\d+) preguntas<\/span>\s*<span>(\d+) bloques<\/span>\s*<span>(\d+) flashcards<\/span>/.exec(now);
  ok(st && +st[1] === 237 && +st[2] === 20 && +st[3] === 302, 'estatística do banco: 237 preguntas · 20 bloques · 302 flashcards', st && st.slice(1, 4));
  const real = Object.keys(I).filter(k => /^q-ane/.test(k)).length; ok(real === 237, 'perguntas reais no corpo = 237', real);
  const fcAll = (now.match(/class="flashcard"/g) || []).length; ok(fcAll === 604, 'flashcards (bloco + mazo geral) = 604 = 2 × 302', fcAll);
  const subs = [...sec(now, 'bancoane').matchAll(/Bloque (\d+) · [^<]*<small>(\d+) preguntas<\/small>/g)].map(m => +m[1] + ':' + m[2]); ok(subs.length === 20 && subs.slice(15).join() === '16:12,17:12,18:12,19:12,20:12', 'subtítulos do banco: 20 blocos; 16–20 com 12 perguntas cada', subs.slice(14));
  ok(/Las 237 preguntas/.test(now) && !/\b177 preguntas|las <b>177/.test(now), 'textos que declaram o total atualizados (237) e nenhum «177» restante');
}
console.log('\n▸ 4 · as 60 perguntas novas');
{
  const N = IDS.map(k => I[k]); const mc = N.filter(x => x.opts.length === 4);
  ok(N.every(x => x.tag === 'Pregunta complementaria'), 'rótulo «Pregunta complementaria» em todas');
  ok(mc.length === 42 && mc.every(x => { const L = /^([a-d])\)/.exec(x.strong); return L && x.opts.find(o => o[0] === L[1]) && x.opts.find(o => o[0] === L[1])[1] === x.strong.slice(3); }), `${mc.length} múltipla escolha: a letra e o texto da resposta coincidem com a explicação`);
  ok(N.filter(x => !x.opts.length).every(x => x.strong.length > 3), 'as demais (CITA, DEFINE, COMPLETÁ) têm resposta escrita');
  const bold = N.filter(x => /<(b|strong|i|em|u|mark|font)\b|style=/i.test(x.qraw.replace(/<span class="quiz-tag[^>]*>[^<]*<\/span>/g, '')) || /<(b|strong|i|em|u|mark|span|font)\b|style=|\sclass=/i.test(x.ul));
  ok(!bold.length, 'nenhum negrito/itálico/cor nos enunciados nem nas alternativas (sem pista visual)', bold.map(x => x.id));
  const len = x => { const l = x.opts.map(o => o[1].length), c = x.strong.charCodeAt(0) - 97, mx = Math.max(...l); return l[c] === mx && l.filter(v => v === mx).length === 1; };
  const uni = mc.filter(len); console.log(`    resposta = única mais longa: ${uni.length}/${mc.length} (${(100 * uni.length / mc.length).toFixed(0)}%)`);
  ok(uni.length / mc.length <= 0.35, 'a resposta certa é a única mais longa em no máximo 35 % (viés de tamanho controlado)', uni.map(x => x.id));
  const L = mc.map(x => x.strong[0]), c = { a: 0, b: 0, c: 0, d: 0 }; L.forEach(l => c[l]++); const seq = L.join('');
  ok(Math.max(...Object.values(c)) - Math.min(...Object.values(c)) <= 2 && !seq.includes('abcd') && !seq.includes('dcba') && !/(.)\1\1/.test(seq), 'letras das novas equilibradas, sem abcd/dcba e sem 3 iguais seguidas', c);
  const dup = []; for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) if (N[i].q === N[j].q) dup.push([N[i].id, N[j].id]); ok(!dup.length, 'nenhum enunciado repetido entre as novas', dup);
  const velhos = new Set(Object.values(M).map(x => x.q)); ok(N.every(x => !velhos.has(x.q)), 'nenhuma nova repete o enunciado de uma pergunta antiga');
}
console.log('\n▸ 5 · cobertura dos slides (termos-chave presentes nos blocos)');
{
  const COB = {
    'slide 5 · complicaciones': ['aneb16,aneb17', ['hipertermia maligna', 'halogenad', 'succinilcolina', 'dantroleno', 'etco2', 'rigidez de maseteros', 'hiperpotasemia', 'enfriamiento activo', 'contractura con halotano', 'anestesia total intravenosa', 'anafilact', 'ige', 'adrenalina', 'broncoespasmo', 'ondansetron', 'dexametasona', 'droperidol', 'aprepitant', 'nk1', '5-ht3', 'propofol', 'despertar intraoperatorio', 'bis', 'hipotermia', 'aire forzado', 't4/t1', 'sugammadex', 'neostigmina', 'mendelson', 'atelectasia', 'asa > 3', 'trendelenburg', 'litotomia', 'genupectoral', 'ulceras por presion']],
    'slide 6 · dolor posoperatorio': ['aneb18', ['sensibilizacion periferica', 'sensibilizacion central', 'escala numerica', 'paracetamol', '4 g', 'ibuprofeno', '2.400', 'diclofenac', '75 mg', 'coadyuvantes', 'opioides', 'pca', 'intervalo de bloqueo', 'infusion basal', 'epidural', 'pcea', 'bupivacaina', 'ropivacaina', 'bloqueo periferico', 'toracotomia', 'paravertebral', 'prospect', 'evaluar', 'reevaluar']],
    'slide 7 · complicaciones respiratorias': ['aneb19', ['fio2 1,0', 'aspiracion', 'neumonia quimica', 'shunt', '2 horas', '6 horas', 'secuencia rapida', 'broncoscopia', 'aleta de tiburon', 'salbutamol', 'ipratropio', 'laringoespasmo', 'estridor', 'traccion mandibular', 'succinilcolina', 'presion negativa', 'cardiogenico', 'sdra', 'tep', 'espacio muerto', 'angio-tc', 'ecocardiografia', 'anticoagulacion', 'reperfusion']],
    'slide 8 · fármacos': ['aneb20', ['morfina', 'dexametasona', 'manitol', 'amiodarona', 'fentanilo', 'propofol', 'paracetamol', 'atropina', 'adrenalina', 'midazolam', 'naloxona', 'flumazenil', 'n-acetilcisteina', 'napqi', 'fisostigmina', 'huevo', 'soya', 'cyp3a4', 'amnesia anterograda', '300 mg', '150 mg', '0,3 mg', '1 mg', 'glaucoma de angulo estrecho', 'miastenia gravis', 'hipertrofia prostatica', 'anuria', 'diuretico osmotico']]
  };
  for (const [nome, [blocos, termos]] of Object.entries(COB)) { const T = norm(blocos.split(',').map(b => sec(now, b)).join(' ')); const falta = termos.filter(t => !T.includes(t)); ok(!falta.length, `${nome}: ${termos.length} termos-chave no(s) bloco(s) ${blocos}`, falta); }
}
console.log('\n▸ 6 · navegador: «Ver respuesta» real nos itens novos (bloco e banco)');
(async () => {
  const core = fs.readFileSync(path.join(REPO, REL + 'assets/app-core.js'), 'utf8');
  const fnTog = /function toggleAnswer[\s\S]*?\n}\n/.exec(core); ok(!!fnTog, 'função real toggleAnswer extraída de assets/app-core.js');
  const br = await chromium.launch(); const p = await br.newPage();
  await p.setContent('<!doctype html><html><body><div id="x">' + now.replace(/<script[\s\S]*?<\/script>/g, '') + '</div></body></html>');
  await p.addScriptTag({ content: fnTog[0] });
  const r = await p.evaluate((ids) => { const out = { n: 0, ok: 0, falhas: [] }; for (const id of ids.concat(ids.map(i => 'b' + i))) { const el = document.getElementById(id); if (!el) { out.falhas.push(id); continue; } out.n++; const btn = el.querySelector('.reveal-btn'); const ans = el.querySelector('.answer'); const antes = getComputedStyle(ans).display; btn.click(); const dep = getComputedStyle(ans).display; if (antes === 'none' && dep !== 'none') out.ok++; else out.falhas.push(id + ':' + antes + '>' + dep); } return out; }, IDS);
  ok(r.n === 120 && r.ok === 120, `120 itens novos (60 no bloco + 60 no banco): a resposta aparece ao clicar: ${r.ok}/${r.n}`, r.falhas);
  await br.close();
  console.log(`\nane-slides: ${n - ko}/${n} verificações OK — ${ko} FALHAS`); process.exit(ko ? 1 : 0);
})();
