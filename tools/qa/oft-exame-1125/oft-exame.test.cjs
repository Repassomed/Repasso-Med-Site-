/* Oftalmología · 14 preguntas «Basada en preguntas de examen» (fotos de una prueba, 25/11/2026) · teste estático + navegador (Chromium) — SOMENTE LEITURA.
   Prova: (1) NADA se perdeu em relação à main: toda pergunta antiga (bloco e banco) idêntica byte a byte; flashcards, imagens, SVG e ids de seção iguais; o resto de cada seção idêntico
   depois de tirar só os trechos marcados (<!-- oft-exame-1125:begin … :end -->) e normalizar os textos que DECLARAM contagens; (2) as 14 novas: ids q-oft196…209 e bq-oft196…209 idênticas no
   bloco e no banco, rótulo «Basada en preguntas de examen», estrutura, resposta = alternativa, sem negrito nas opções, V/F coerente com checkTF; (3) contagens declaradas = reais (cabeçalho do
   bloco, subtítulo do banco, estatísticas); (4) nenhuma repete enunciado de pergunta existente; (5) o resumo ensina o que as novas cobram (termos-chave no bloco); (6) navegador: toggleAnswer e
   checkTF reais (extraídos de assets/app-core.js) funcionam nos 28 itens (bloco e banco).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/oft-exame-1125/oft-exame.test.cjs [--main origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..'), REL = 'Repasso-Med-Site--main/Atual - Copia/';
const F = REL + 'netlify/functions/materias-privadas/oftalmologia.html';
const raw = fs.readFileSync(path.join(REPO, F), 'utf8');
const mainRaw = cp.execFileSync('git', ['show', arg('--main', 'origin/main') + ':' + F], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 500) : '')); } };
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();
const norm = s => txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const strip = h => h.replace(/\n*<!-- oft-exame-1125:begin preguntas -->[\s\S]*?<!-- oft-exame-1125:end -->/g, '').replace(/<!-- oft-exame-1125:begin resumen -->[\s\S]*?<!-- oft-exame-1125:end -->\n*/g, '');
/* textos que DECLARAM contagens: normalizados nos dois lados antes de comparar o resto, byte a byte */
const unc = h => h
  .replace(/(<h3>Preguntas del bloque \d+<\/h3>\s*<p>)[^<]*(<\/p>)/g, '$1CONTAGEM$2')
  .replace(/<small>\d+ preguntas<\/small>/g, '<small>N</small>')
  .replace(/<h3>Las \d+ preguntas de la materia, juntas y en orden<\/h3>/, '<h3>BANCO</h3>')
  .replace(/<p>La cátedra no puso a disposición un banco de exámenes[\s\S]*?<\/p>/, '<p>BANCO</p>')
  .replace(/<span>\d+ preguntas<\/span>/, '<span>N</span>').replace(/<span>\d+ de exámenes · \d+ complementarias<\/span>/, '<span>E</span>')
  .replace(/ +(?:TODAS las preguntas van rotuladas como complementarias\.|195 preguntas van rotuladas como complementarias y 14 como «Basada en preguntas de examen»\n +\(fotos de una prueba, 25\/11\/2026; sin clave oficial: respuestas verificadas contra los slides\)\.)/, '     RÓTULOS');
const now = unc(strip(raw)), main = unc(mainRaw);
const secIds = t => [...t.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]);
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); };
function items(t) {
  const out = {};
  for (const m of t.matchAll(/<div class="quiz-item" id="(b?q-oft\d+)">([\s\S]*?)<\/div><\/div>/g)) {
    const p = m[2], q = (/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [, ''])[1], ul = (/<ul class="options">([\s\S]*?)<\/ul>/.exec(p) || [, ''])[1];
    const opts = [...ul.matchAll(/<li>([a-e])\) ([\s\S]*?)<\/li>/g)].map(x => [x[1], txt(x[2])]);
    out[m[1]] = { id: m[1], raw: p, qraw: q, q: txt(q), ul, opts, strong: txt((/<strong>([\s\S]*?)<\/strong>/.exec(p) || [, ''])[1]), tf: /class="tf-buttons"/.test(p), tfCalls: [...p.matchAll(/checkTF\(this, (true|false)\)/g)].map(x => x[1]), tag: txt((/<span class="quiz-tag (?:oficial|variante)[^"]*">([\s\S]*?)<\/span>/.exec(p) || [, ''])[1]) };
  }
  return out;
}
const IR = items(raw), IM = items(mainRaw);
const NEW = []; for (let k = 196; k <= 209; k++) NEW.push('q-oft' + k);
console.log('\n▸ 1 · nada se perdeu');
{
  const lost = Object.keys(IM).filter(k => !IR[k] || IR[k].raw !== IM[k].raw); ok(Object.keys(IM).length === 390 && !lost.length, `as ${Object.keys(IM).length} perguntas da main (bloco + banco) continuam idênticas, byte a byte`, lost);
  const fr = t => [...t.matchAll(/<div class="flashcard"><div class="fc-front"><b>([\s\S]*?)<\/b><\/div>/g)].map(m => m[1]); ok(fr(raw).length === fr(mainRaw).length && fr(mainRaw).every(x => fr(raw).includes(x)), `flashcards intactas (${fr(mainRaw).length})`);
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|'); ok(img(raw) === img(mainRaw), 'imagens: mesmo conjunto de src (nenhuma removida)');
  ok((raw.match(/<svg[\s>]/g) || []).length === (mainRaw.match(/<svg[\s>]/g) || []).length, 'SVG: mesma quantidade');
  ok(secIds(raw).join() === secIds(mainRaw).join(), 'ids de seção iguais e na mesma ordem');
  const dif = secIds(mainRaw).filter(id => sec(now, id) !== sec(main, id)); ok(!dif.length, 'cada seção (blocos, banco, cierre) idêntica à main, byte a byte, depois de tirar só os trechos marcados e normalizar os textos de contagem', dif);
  const ids = [...raw.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); ok(new Set(ids).size === ids.length && [...mainRaw.matchAll(/\bid="([^"]+)"/g)].every(m => ids.includes(m[1])), 'nenhum id apareceu duplicado nem sumiu');
  const g = (raw.match(/<!-- oft-exame-1125:begin/g) || []).length, e = (raw.match(/<!-- oft-exame-1125:end -->/g) || []).length; ok(g === e && g === 8 + 8 + 6, `marcadores balanceados: ${g} começos · ${e} fins (8 blocos com perguntas + 8 do banco + 6 resumos)`, [g, e]);
}
console.log('\n▸ 2 · as 14 perguntas novas');
{
  const N = NEW.map(k => IR[k]), B = NEW.map(k => IR['b' + k]);
  ok(N.every(Boolean) && B.every(Boolean), 'as 14 existem no bloco e no banco (q-oft196…209 e bq-oft196…209)');
  const dv = NEW.filter(k => IR[k] && IR['b' + k] && IR['b' + k].raw !== IR[k].raw); ok(!dv.length, 'bloco e banco idênticos (espelhamento), 0 divergências', dv);
  ok(N.every(x => /^(Basada en preguntas de examen|Verdadero o falso · basada en examen)$/.test(x.tag)), 'todas rotuladas «Basada en preguntas de examen» (V/F: «Verdadero o falso · basada en examen»)', N.map(x => x.tag));
  ok(!/Pregunta oficial|clave oficial de la cátedra/i.test(N.map(x => x.raw).join(' ')), 'nenhuma apresentada como «Pregunta oficial» nem com clave oficial');
  const mc = N.filter(x => !x.tf), vf = N.filter(x => x.tf);
  const mal = mc.filter(x => { const L = /^([a-e])\)/.exec(x.strong); const o = L && x.opts.find(o => o[0] === L[1]); return !(o && o[1] === x.strong.slice(3)); }); ok(mc.length === 11 && vf.length === 3 && !mal.length, `${mc.length} múltipla escolha + ${vf.length} V/F; a letra e o texto da resposta coincidem com a explicação`, mal.map(x => x.id));
  ok(mc.every(x => (x.opts.length === 4 || x.opts.length === 5) && x.opts.map(o => o[0]).join('') === 'abcde'.slice(0, x.opts.length) && new Set(x.opts.map(o => o[1])).size === x.opts.length), 'alternativas a–d (ou a–e) sem repetição');
  ok(vf.every(x => x.tfCalls.length === 2 && x.tfCalls[0] === x.tfCalls[1] && x.tfCalls[0] === (/^VERDADERO\./.test(x.strong) ? 'true' : 'false')), 'V/F: os dois botões chamam checkTF com o valor coerente com a resposta (VERDADERO → true, FALSO → false)', vf.map(x => [x.id, x.tfCalls, x.strong]));
  const bold = N.filter(x => /<(b|strong|i|em|u|mark|font)\b|style=/i.test(x.qraw.replace(/<span class="quiz-tag[^>]*>[^<]*<\/span>/g, '')) || /<(b|strong|i|em|u|mark|span|font)\b|style=|\sclass=/i.test(x.ul)); ok(!bold.length, 'nenhum negrito/itálico/cor nos enunciados nem nas alternativas (sem pista visual)', bold.map(x => x.id));
  const L = mc.map(x => x.strong[0]), c = {}; L.forEach(l => c[l] = (c[l] || 0) + 1); console.log('    letras das respostas (MCQ):', JSON.stringify(c)); ok(Math.max(...Object.values(c)) <= Math.ceil(mc.length * 0.4) && !/(.)\1\1/.test(L.join('')), 'nenhuma letra passa de 40 % e sem 3 iguais seguidas');
  const dup = []; for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) if (norm(N[i].q) === norm(N[j].q)) dup.push([N[i].id, N[j].id]); ok(!dup.length, 'nenhum enunciado repetido entre as novas', dup);
  const velhos = new Set(Object.values(IM).map(x => norm(x.q))); ok(N.every(x => !velhos.has(norm(x.q))), 'nenhuma nova repete literalmente o enunciado de uma pergunta existente');
  const bloco = { 'q-oft196': 'ofb10', 'q-oft197': 'ofb01', 'q-oft198': 'ofb02', 'q-oft199': 'ofb14', 'q-oft200': 'ofb13', 'q-oft201': 'ofb13', 'q-oft202': 'ofb13', 'q-oft203': 'ofb11', 'q-oft204': 'ofb12', 'q-oft205': 'ofb15', 'q-oft206': 'ofb15', 'q-oft207': 'ofb11', 'q-oft208': 'ofb11', 'q-oft209': 'ofb15' };
  ok(Object.entries(bloco).every(([id, b]) => sec(raw, b).includes('id="' + id + '"')), 'cada nova está no bloco do tema (10 refração, 01 anatomia, 02 exame, 11 trauma, 12 trauma infantil, 13 oftalmopediatria, 14 neuro, 15 fármacos)');
}
console.log('\n▸ 3 · contagens declaradas = reais');
{
  const real = Object.keys(IR).filter(k => /^q-oft/.test(k)).length; ok(real === 209 && Object.keys(IR).filter(k => /^bq-oft/.test(k)).length === 209, 'perguntas reais: 209 nos blocos e 209 no banco', real);
  let bad = [];
  for (const m of raw.matchAll(/<section class="container" id="(ofb\d+)">([\s\S]*?)<\/section>/g)) { const t = m[2], q = (t.match(/class="quiz-item"/g) || []).length; if (!q) continue; const d = /<h3>Preguntas del bloque \d+<\/h3>\s*<p>(\d+) preguntas/.exec(t); if (!d || +d[1] !== q) bad.push([m[1], d && d[1], q]); }
  ok(!bad.length, 'o cabeçalho de cada bloco declara o número real de perguntas', bad);
  const bk = sec(raw, 'bancooft'); const subs = [...bk.matchAll(/Bloque (\d+) · [^<]*<small>(\d+) preguntas<\/small>/g)].map(m => +m[2]); const reais = [...bk.split(/<div class="rmc-bank-sub">/).slice(1)].map(s => (s.match(/class="quiz-item"/g) || []).length);
  ok(subs.length === 16 && subs.join() === reais.join(), 'o subtítulo de cada tramo do banco declara o número real', [subs.join(), reais.join()]);
  const st = /<span>(\d+) preguntas<\/span>\s*<span>(\d+) bloques<\/span>\s*<span>(\d+) flashcards<\/span>\s*<span>(\d+) de exámenes · (\d+) complementarias<\/span>/.exec(raw); ok(st && +st[1] === 209 && +st[2] === 16 && +st[3] === 337 && +st[4] === 14 && +st[5] === 195, 'estatística do banco: 209 preguntas · 16 bloques · 337 flashcards · 14 de exámenes · 195 complementarias', st && st.slice(1));
  ok(/Las 209 preguntas/.test(raw) && !/Las 195 preguntas/.test(raw) && !/Preguntas de exámenes disponibles: <b>0<\/b>/.test(raw), 'texto do banco atualizado (209; exames disponíveis 19; aproveitadas 14)');
  ok((raw.match(/<span class="quiz-tag variante[^"]*">/g) || []).length === 390 && (raw.match(/<span class="quiz-tag oficial[^"]*">/g) || []).length === 28, 'rótulos (etiquetas) no corpo: 390 complementarias (195×2) e 28 de exame (14×2)');
}
console.log('\n▸ 4 · o resumo ensina o que as novas cobram (termos-chave)');
{
  const COB = { ofb10: ['miopia', 'eje'], ofb01: ['conos', 'bastones', '120 millones', '6 millones'], ofb02: ['sin dilatar', 'snellen', 'penumbra'], ofb11: ['malla trabecular', 'fijaciones zonulares', 'iridodialisis', 'grado i', 'expande en el ecuador', 'orificio de entrada'], ofb12: ['canalículo inferior'.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'ninos que en ninas', 'mordeduras de perro'], ofb13: ['debajo de la insercion del recto superior', 'desequilibrio sensoriomotor', '1300', 'evitable'], ofb14: ['colículo inferior'.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'contrario', 'moebius'], ofb15: ['reduce el contacto del iris', 'categoria b', '7 a 14 dias', 'mas del 90 %', 'agudas'] };
  for (const [b, ts] of Object.entries(COB)) { const T = norm(sec(raw, b).replace(/<div class="quiz-section">[\s\S]*$/, '')); const falta = ts.filter(t => !T.includes(t)); ok(!falta.length, `${b}: ${ts.length} termos-chave no ensino (fora das perguntas)`, falta); }
}
console.log('\n▸ 5 · navegador: «Ver respuesta» e V/F reais nos 28 itens (bloco e banco)');
(async () => {
  const { chromium } = require('playwright');
  const core = fs.readFileSync(path.join(REPO, REL + 'assets/app-core.js'), 'utf8');
  const fns = ['toggleAnswer', '_tfEsVerdadero', 'checkTF'].map(f => new RegExp('function ' + f + '\\b[\\s\\S]*?\\n}\\n').exec(core)); ok(fns.every(Boolean), 'funções reais toggleAnswer, _tfEsVerdadero e checkTF extraídas de assets/app-core.js');
  const br = await chromium.launch(); const p = await br.newPage();
  await p.setContent('<!doctype html><html><body><div id="x">' + raw.replace(/<script[\s\S]*?<\/script>/g, '') + '</div></body></html>');
  for (const f of fns) await p.addScriptTag({ content: f[0] });
  const r = await p.evaluate((ids) => { const out = { n: 0, mc: 0, vf: 0, falhas: [] };
    for (const id of ids.concat(ids.map(i => 'b' + i))) { const el = document.getElementById(id); if (!el) { out.falhas.push(id + ':ausente'); continue; } out.n++;
      const btn = el.querySelector('.reveal-btn'), ans = el.querySelector('.answer');
      if (btn) { const antes = ans.classList.contains('show'); btn.click(); const dep = ans.classList.contains('show'); btn.click(); if (!antes && dep && !ans.classList.contains('show')) out.mc++; else out.falhas.push(id + ':toggle'); }
      else { const bs = [...el.querySelectorAll('.tf-btn')]; const verdad = /^VERDADERO\./.test(ans.textContent.trim()); const certo = bs.find(b => b.getAttribute('data-tf') === (verdad ? 'V' : 'F')); certo.click(); const fb = el.querySelector('.quiz-feedback'); if (fb && fb.classList.contains('correct') && el.classList.contains('answered') && certo.classList.contains('correct')) out.vf++; else out.falhas.push(id + ':vf-certo'); } }
    return out; }, NEW);
  ok(r.n === 28 && r.mc === 22 && r.vf === 6 && !r.falhas.length, `28 itens: 22 «Ver respuesta» abrem e fecham; 6 V/F dão «¡CORRECTO!» ao clicar a alternativa certa (${r.mc}/${r.vf})`, r.falhas);
  const r2 = await p.evaluate((ids) => { const falhas = []; for (const id of ids.filter(i => document.getElementById(i).querySelector('.tf-btn'))) { const el = document.getElementById(id); const verdad = /^VERDADERO\./.test(el.querySelector('.answer').textContent.trim()); el.classList.remove('answered'); el.querySelectorAll('.tf-btn').forEach(b => { b.disabled = false; b.classList.remove('correct', 'wrong'); }); const fb = el.querySelector('.quiz-feedback'); if (fb) fb.remove(); const errado = [...el.querySelectorAll('.tf-btn')].find(b => b.getAttribute('data-tf') === (verdad ? 'F' : 'V')); errado.click(); const f2 = el.querySelector('.quiz-feedback'); if (!(f2 && f2.classList.contains('wrong') && errado.classList.contains('wrong'))) falhas.push(id); } return falhas; }, NEW);
  ok(!r2.length, 'V/F: clicar a alternativa ERRADA dá o aviso de erro nos 3 V/F', r2);
  await br.close();
  console.log(`\noft-exame-1125: ${n - ko}/${n} verificações OK — ${ko} FALHAS`); process.exit(ko ? 1 : 0);
})();
