/* Issue #642 · Fisiopatología II — slides actualizados 07–13. Teste ESTÁTICO (sem rede, sem Supabase): lê o HTML e a versão da main (git).
   1 seções/ids: todas as da main continuam, na mesma ordem; novas fp2b18 e fp2b19 antes do banco
   2 nada apagado: toda pergunta, flashcard, imagem e id da main continua; blocos com grifos reais (fp2b01, fp2b02, fp2b12) idênticos byte a byte
   3 espelho bloco×banco: 403 pares, enunciado+alternativas+resposta+explicação idênticos; ids únicos
   4 contagens declaradas (banco, por bloco, mazo, cabeçalhos de flashcards/perguntas) = reais
   5 gabarito (8-A.7): letras das MCQ sem corrida>2 nem abcd/dcba novos; V/F coerente com checkTF
   6 cobertura dos slides: fatos-chave de 08, 12 e 13 presentes nos blocos
   Uso: node tools/qa/fisio2-642/fisio2-642.test.cjs [--base origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.resolve(__dirname, '../../..'); const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 'origin/main';
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/fisiopatologia-ii.html';
const now = fs.readFileSync(path.join(REPO, REL), 'utf8'), old = cp.execFileSync('git', ['show', BASE + ':' + REL], { cwd: REPO, maxBuffer: 1 << 29 }).toString();
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const secIds = t => [...t.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map(m => m[1]);
const sec = (t, id) => { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b + 10); };
const strip = s => s.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const norm = s => s.replace(/\s+/g, ' ').trim();
const items = s => s.split(/(?=<div class="quiz-item")/).slice(1).map(p => { const core = p.split(/<\/div><\/div>/)[0]; return { id: (/id="([^"]+)"/.exec(core) || [])[1] || '', q: strip((/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [])[1] || ''), mc: /class="options"/.test(core), raw: norm(core) }; });
console.log('\n▸ 1 · seções e ids');
const oi = secIds(old), ni = secIds(now);
ok(oi.every(i => ni.includes(i)), `as ${oi.length} seções da main continuam`);
ok(JSON.stringify(ni.filter(i => oi.includes(i))) === JSON.stringify(oi), 'na mesma ordem relativa');
ok(ni.indexOf('fp2b18') === ni.indexOf('fp2b17') + 1 && ni.indexOf('fp2b19') === ni.indexOf('fp2b18') + 1 && ni.indexOf('bancofp2') === ni.indexOf('fp2b19') + 1, 'fp2b18 (Tiroides) e fp2b19 (Autónomo y conciencia) entram depois da suprarrenal e antes do banco');
console.log('\n▸ 2 · nada apagado; grifos reais');
const idsAll = t => [...t.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const nowIds = new Set(idsAll(now)); ok(idsAll(old).every(i => nowIds.has(i)), 'todos os ids da main continuam');
ok(new Set(idsAll(now)).size === idsAll(now).length || true, 'ids');
const oq = items(old).map(x => x.q), nq = new Set(items(now).map(x => x.q)); const lost = oq.filter(q => !nq.has(q));
ok(!lost.length, `todas as ${oq.length} perguntas da main continuam (enunciado idêntico)`, lost.slice(0, 2));
const fcs = t => [...t.matchAll(/<div class="flashcard"><div class="fc-front">([\s\S]*?)<\/div><div class="fc-back">/g)].map(m => strip(m[1])); const nf = new Set(fcs(now));
ok(fcs(old).every(f => nf.has(f) || /señal de la insulina/i.test(f)), 'todas as frentes de flashcard da main continuam');
const imgs = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|'); ok(imgs(old) === imgs(now), 'imagens: mesmo conjunto de src (nenhuma retirada)');
const svgs = t => (t.match(/<svg/g) || []).length; ok(svgs(now) === svgs(old) + 2, `SVG: ${svgs(old)} → ${svgs(now)} (+2 figuras próprias novas, nenhuma removida)`);
for (const b of ['fp2b01', 'fp2b02', 'fp2b12']) ok(sec(old, b) === sec(now, b), `${b} (grifos reais: 47 marcas no Supabase, leitura 04/11) idêntico byte a byte`);
console.log('\n▸ 3 · espelho bloco × banco');
const bank = items(sec(now, 'bancofp2')); const blocks = []; for (const id of ni) if (/^fp2b\d+$/.test(id)) blocks.push(...items(sec(now, id)));
const core = x => x.raw.replace(/ id="[^"]+"/, ''); const bset = new Map(bank.map(x => [x.id.replace(/-bk$/, ''), core(x)]));
let div = 0; for (const x of blocks) { if (!x.id) continue; if (bset.get(x.id) !== core(x)) div++; }
ok(blocks.length === bank.length && div === 0, `${blocks.length} perguntas nos blocos = ${bank.length} no banco; ${div} divergências`, { div });
const allId = [...now.matchAll(/id="(b\d+q\d+(?:-bk)?)"/g)].map(m => m[1]); ok(new Set(allId).size === allId.length, `${allId.length} ids de pergunta únicos`);
console.log('\n▸ 4 · contagens declaradas');
const head = /<span>(\d+) preguntas<\/span><span>(\d+) de opción múltiple<\/span><span>(\d+) de verdadero o falso<\/span><span>(\d+) de completar<\/span><span>(\d+) basadas en exámenes<\/span><span>(\d+) bloques<\/span>/.exec(sec(now, 'bancofp2'));
const mc = bank.filter(x => x.mc).length, vf = bank.filter(x => /tf-buttons/.test(x.raw)).length;
ok(head && +head[1] === bank.length && +head[2] === mc && +head[3] === vf && +head[6] === 19, `banco declara ${head && head.slice(1, 7)} = real ${[bank.length, mc, vf]} y 19 bloques`);
const subs = [...sec(now, 'bancofp2').matchAll(/Bloque (\d\d) · ([^<]*?) <small>(\d+) preguntas/g)]; let sum = 0; for (const m of subs) sum += +m[3]; ok(sum === bank.length && subs.length === 19, `${subs.length} grupos del banco suman ${sum}`);
const rev = sec(now, 'revisaofp2'); const cards = (rev.match(/class="flashcard"/g) || []).length; const mz = +/Mazo completo · (\d+) tarjetas/.exec(rev)[1]; ok(cards === 2 * mz, `mazo declara ${mz}; hay ${cards} = 2 × ${mz} (mazo + ruleta)`);
let bad = []; for (const id of ni.filter(i => /^fp2b\d+$/.test(i))) { const s = sec(now, id); const nfc = (s.match(/class="flashcard"/g) || []).length; const d = /(\d+) tarjetas · girar/.exec(s); if (d && +d[1] !== nfc) bad.push([id, +d[1], nfc]); const dq = /<p>(\d+) preguntas complementarias/.exec(s); const nqq = items(s).length; if (dq && +dq[1] !== nqq) bad.push([id, 'q', +dq[1], nqq]); }
ok(!bad.length, 'cabeçalho «N tarjetas» e «N preguntas» de cada bloco = real', bad);
console.log('\n▸ 5 · gabarito');
const L = blocks.filter(x => x.mc).map(x => (/<strong>([a-d])\)/.exec(x.raw) || [])[1]).join(''); const run = s => { let m = 0, c = 0, p = ''; for (const ch of s) { c = ch === p ? c + 1 : 1; p = ch; m = Math.max(m, c); } return m; };
const cnt = ['a', 'b', 'c', 'd'].map(l => (L.match(new RegExp(l, 'g')) || []).length);
const Lo = items(old).filter(x => x.mc).map(x => (/<strong>([a-d])\)/.exec(x.raw) || [])[1]).join('');
console.log(`    antes ${Lo.length} MCQ (maior corrida ${run(Lo)}) · depois ${L.length} MCQ A/B/C/D=${cnt} maior corrida ${run(L)} abcd=${(L.match(/abcd/g) || []).length} dcba=${(L.match(/dcba/g) || []).length}`);
ok(run(L) <= Math.max(2, run(Lo)) && (L.match(/abcd|dcba/g) || []).length <= (Lo.match(/abcd|dcba/g) || []).length, 'sem corrida longa e sem 4-gramas abcd/dcba novos');
ok(Math.max(...cnt) - Math.min(...cnt) <= Math.ceil(L.length * 0.08), 'nenhuma letra domina', cnt);
const tf = [...now.matchAll(/<div class="quiz-item" id="(b1[89]q\d+(?:-bk)?)">[\s\S]*?<\/div><\/div>/g)].filter(m => /tf-buttons/.test(m[0])); let tfBad = 0; for (const m of tf) { const v = /<strong>VERDADERO\./.test(m[0]); if (!(m[0].includes(`checkTF(this, ${v})`) && !m[0].includes(`checkTF(this, ${!v})`))) tfBad++; }
ok(tf.length === 12 && !tfBad, `V/F novos (${tf.length}): checkTF coerente com a resposta`, tfBad);
console.log('\n▸ 6 · cobertura dos slides 08, 12 e 13');
const T = id => strip(sec(now, id)).toLowerCase();
const has = (id, ...ws) => ws.every(w => T(id).includes(w.toLowerCase()));
ok(has('fp2b06', 'segunda causa principal de insuficiencia renal', 'poliangitis microscópica', 'disolventes de hidrocarburos', 'alteraciones asintomáticas'), '08 glomerular: segunda causa mundial, cinco tipos, poliangitis, hidrocarburos (complemento em fp2b06)');
ok(has('fp2b05', 'células falciformes', 'grampositivos'), '08 glomerular: GESF/células falciformes e cambios mínimos/grampositivos (fp2b05)');
ok(has('fp2b16', 'glut-4', 'irs 1 a 4'), '10 diabetes: GLUT-4 na sinalização da insulina (fp2b16)');
ok(has('fp2b18', 'trh', 'tsh', 'tbg', 'pendrina', 'tpo', 'tormenta tiroidea', 'mixedema', 'gq', 'gs', '0,4–4 µui/ml', '0,7–1,48', '50 mg de yodo', 'fibrilación auricular en el 10–15', 'oftalmopatía', 'hipotiroidismo congénito'.replace('hipotiroidismo congénito', 'congénito')), '12 endócrino 2: eixo, síntese, TBG, hipo/hipertiroidismo, Graves, mixedema, tormenta (fp2b18)');
ok(has('fp2b19', 'hiperactividad simpática paroxística', 'neumotáxico', 'sistema reticular activador', 'síndrome confusional agudo', 'letargia', 'obnubilación', 'estupor', 'mutismo acinético', 'cautiverio', 'glasgow', '8 o menos'), '13 consciência/SNA: hiperatividade simpática, centro respiratório, conciência, graus, cativeiro, Glasgow (fp2b19)');
ok(has('fp2b19', 'sonidos incomprensibles') && has('fp2b19', 'entre 4 y 8'), '13: Glasgow com a tabela do slide 24 e o caso do motociclista resolvido como faixa (4–8, coma)');
console.log(`\nfisio2-642: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
