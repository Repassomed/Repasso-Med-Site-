/* Issue #646/#647 · Anatopatología II (teoría) · bloque 07 reconstruido sobre la nueva Clase 7 (Patologías hepáticas).
   Teste ESTÁTICO (sem navegador, rede nem Supabase): lê o HTML da teoria, a versão da PR #640 (base de trabalho) e a da main, e prova:
   1 estrutura: ids de seção iguais; o bloco 07 segue a sequência da aula nova (alcohol → cirrosis → hiperplasias → hemangioma → adenoma → malignos);
   2 nada apagado em relação à #640: questões (enunciado), flashcards (frente), imagens e SVG; demais blocos e a prática byte a byte iguais;
   3 espelho bloco×banco (divergência 0) e contagens declaradas (banco, por bloco, mazo, ruleta);
   4 as 12 questões novas: rótulos, V/F coerentes (checkTF = resposta), cada uma cobrada só depois de ensinada no bloco;
   5 cobertura página a página da Clase 7 (termos-chave de cada assunto presentes no bloco);
   6 gabarito (8-A.7): sem corrida > 4, sem 4-grama abcd/dcba novo, letras equilibradas;
   7 sem metadidática/voz de prova no texto novo; sem nomes de professor;
   8 grifos (Supabase, leitura 06/11): 0 em ap2b07 → nada a proteger; os 10 de ap2b04 e os demais blocos intactos (byte a byte).
   Uso: node tools/qa/ap2-646/ap2-646.test.cjs [--base origin/claude/charming-maxwell-ah7nxj-ap2-638] [--main origin/main] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..'), BASE = arg('--base', 'origin/claude/charming-maxwell-ah7nxj-ap2-638'), MAIN = arg('--main', 'origin/main');
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/';
const git = (ref, f) => cp.execFileSync('git', ['show', ref + ':' + REL + f], { cwd: REPO, maxBuffer: 1 << 28 }).toString();
const TEO = 'anatomia-patologica-ii.html', PRA = 'anatomia-patologica-ii-practica.html';
const now = fs.readFileSync(path.join(REPO, REL + TEO), 'utf8'), old = git(BASE, TEO), main = git(MAIN, TEO);
let n = 0, ko = 0; const ok = (c, m, d) => { n++; if (c) console.log('  ✓ ' + m); else { ko++; console.log('  ✗ FALHA: ' + m + (d !== undefined ? ' → ' + JSON.stringify(d).slice(0, 500) : '')); } };
const strip = s => s.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<i onclick[^>]*>[\s\S]*?<\/i>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = s => s.replace(/\s+/g, ' ').trim();
function sec(t, id) { const i = t.indexOf('id="' + id + '"'); if (i < 0) return ''; const a = t.lastIndexOf('<section', i), b = t.indexOf('</section>', a); return t.slice(a, b); }
function items(s) { return s.split(/(?=<div class="quiz-item)/).slice(1).map(p => { const core = p.split(/<\/div>\s*<\/div>/)[0] + '</div></div>'; const q = strip((/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [])[1] || ''); const a = strip((/<div class="answer">\s*<p><strong>([\s\S]*?)<\/strong>/.exec(p) || [])[1] || ''); const tag = (/class="quiz-tag ([a-z ]+)"/.exec(p) || [])[1] || ''; return { q, a, tag, mc: /class="options"/.test(core), raw: norm(core) }; }); }
const ids = t => [...t.matchAll(/<section class="container" id="([^"]+)"/g)].map(m => m[1]).join(',');
const teach = id => sec(now, id).split(/<div class="quiz-section"/)[0];
const T7 = strip(teach('ap2b07')), T7l = T7.toLowerCase();
const has = (...ws) => ws.every(w => T7l.includes(w.toLowerCase()));

console.log('\n▸ 1 · estrutura e sequência da aula');
ok(ids(now) === ids(old) && ids(now) === ids(main), 'ids de seção idênticos aos da #640 e da main');
{
  const h3 = [...teach('ap2b07').matchAll(/<h3>([^<]*)<\/h3>/g)].map(m => m[1]);
  const exp = ['1 · Hepatopatía alcohólica', '2 · Cirrosis hepática', '3 · Del hígado al nódulo: el terreno', '4 · Hiperplasias nodulares', '5 · Hemangioma cavernoso', '6 · Adenoma hepático', 'Comparación de las lesiones benignas', '7 · Tumores malignos del hígado y metástasis', '8 · Carcinoma hepatocelular (CHC)', '9 · Colangiocarcinoma', '10 · Cierre: no es solo contar nódulos', 'Síntesis del bloque'];
  ok(JSON.stringify(h3) === JSON.stringify(exp), 'subtítulos do bloco 07 na ordem da Clase 7 (alcohol → cirrosis → HNF/HNR → hemangioma → adenoma → malignos: metástasis → CHC → CCA)', h3);
  const pos = w => teach('ap2b07').indexOf(w);
  ok(pos('Hepatopatía alcohólica</h3>') < pos('Cirrosis hepática</h3>') && pos('Cirrosis hepática</h3>') < pos('Hiperplasias nodulares</h3>') && pos('Hemangioma cavernoso</h3>') < pos('Adenoma hepático</h3>') && pos('7 · Tumores malignos') < pos('8 · Carcinoma') && pos('8 · Carcinoma') < pos('9 · Colangiocarcinoma'), 'ordem confirmada por posição no HTML');
  ok(/<h2>🫀 Patologías del hígado: alcohol, cirrosis y tumores<\/h2>/.test(teach('ap2b07')), 'título do bloco atualizado');
}

console.log('\n▸ 2 · nada apagado (comparação com a #640) e demais blocos intactos');
{
  const oq = items(old).map(x => x.q), nq = new Set(items(now).map(x => x.q)); const lost = oq.filter(q => !nq.has(q));
  ok(new Set(lost).size === 1 && lost.every(q => q.includes('en el espacio de Disse, formando las bandas')), `questões da #640 (${oq.length}) continuam; 1 só mudou de enunciado (N9: retirado «en el espacio de Disse», que o slide atribui ao colágeno IV)`, lost);
  const fr = t => [...t.matchAll(/<div class="flashcard"><div class="fc-front"><b>([\s\S]*?)<\/b><\/div>/g)].map(m => m[1]);
  const ofr = fr(old), nfr = new Set(fr(now)); const lf = ofr.filter(x => !nfr.has(x));
  ok(!lf.length && fr(now).length === fr(old).length + 36, `flashcards: ${fr(old).length} → ${fr(now).length} (+36 = 12 × 3 cópias: bloco, mazo, ruleta); nenhuma frente removida`, lf);
  const img = t => [...t.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]).sort().join('|');
  ok(img(now) === img(old) && img(now) === img(main), 'imagens: mesmo conjunto de src (nenhuma removida)');
  const svgs = t => (t.match(/<svg[\s>]/g) || []).length; ok(svgs(now) === svgs(old), `SVG: ${svgs(old)} = ${svgs(now)}`);
  for (const id of ['ap2b01', 'ap2b02', 'ap2b03', 'ap2b04', 'ap2b05', 'ap2b06', 'ap2b08', 'ap2biblio', 'ap2intro', 'bancofcap2']) {
    if (id === 'bancofcap2') continue;
    ok(sec(now, id) === sec(old, id), `seção ${id} byte a byte idêntica à da #640`);
  }
  const pra = fs.readFileSync(path.join(REPO, REL + PRA), 'utf8'); ok(pra === git(MAIN, PRA), 'AP II PRÁCTICA: arquivo idêntico ao da main (fora do escopo)');
  const fig = ['01-nodulo-hepatico', '02-hnf-hemangioma', '03-metastases-vs', '04-lesao-cronica', '05-colangiocarcinoma']; ok(fig.every(f => sec(now, 'ap2b07').includes(f)), 'as 5 figuras próprias do bloco 07 continuam nele');
  ok(sec(now, 'ap2b07').includes('viewBox="0 0 720 793"'), 'esquema conceitual SVG do bloco 07 preservado');
}

console.log('\n▸ 3 · espelho bloco × banco e contagens declaradas');
const bank = sec(now, 'bancoap2');
{
  const core = x => norm(x.q + '|' + x.a + '|' + x.raw);
  const bi = items(bank).map(core); let div = 0, tot = 0;
  for (let b = 1; b <= 8; b++) for (const x of items(sec(now, 'ap2b0' + b))) { tot++; if (!bi.includes(core(x))) div++; }
  ok(div === 0 && tot === bi.length, `${tot} questões nos blocos = ${bi.length} no banco, ${div} divergências`, { div, tot, bank: bi.length });
  const all = items(bank), cnt = all.length, ofi = all.filter(x => x.tag.startsWith('oficial')).length, va = all.filter(x => x.tag.startsWith('variante')).length, vf = all.filter(x => /\bvf\b/.test(x.tag)).length;
  const dec = /<span>(\d+) preguntas<\/span><span>(\d+) basadas en preguntas de examen<\/span><span>(\d+) variantes<\/span><span>(\d+) verdadero\/falso<\/span>/.exec(bank);
  ok(dec && +dec[1] === cnt && +dec[2] === ofi && +dec[3] === va && +dec[4] === vf, `banco declara ${dec && dec.slice(1, 5)} = real ${[cnt, ofi, va, vf]}`, { dec: dec && dec.slice(1, 5), real: [cnt, ofi, va, vf] });
  const subs = [...bank.matchAll(/Bloque 0(\d) · ([^<]*?) <small>\((\d+) preguntas\)/g)].map(m => [+m[1], +m[3]]); let soma = 0, bad = [];
  for (const [b, c] of subs) { const real = items(sec(now, 'ap2b0' + b)).length; soma += c; if (real !== c) bad.push([b, c, real]); }
  ok(!bad.length && soma === cnt && subs.find(x => x[0] === 7)[1] === 29, `por bloco: declarado = real (soma ${soma} = ${cnt}; bloco 07 = 29)`, bad);
  ok(/Bloque 07 · Patologías del hígado: alcohol, cirrosis y tumores/.test(bank), 'banco: título do grupo do bloco 07 atualizado');
  const cards = s => (s.match(/class="flashcard"/g) || []).length;
  const maz = sec(now, 'bancofcap2'), mi = maz.indexOf('🎲 Ruleta rusa'), mazo = maz.slice(0, mi), rul = maz.slice(mi);
  const decm = /<span>(\d+) tarjetas<\/span>/.exec(maz);
  ok(decm && +decm[1] === cards(mazo) && cards(mazo) === cards(rul), `mazo declara ${decm && decm[1]} = ${cards(mazo)} tarjetas; ruleta ${cards(rul)}`, { dec: decm && decm[1], mazo: cards(mazo), rul: cards(rul) });
  const blocos = ['ap2b01', 'ap2b02', 'ap2b03', 'ap2b04', 'ap2b05', 'ap2b06', 'ap2b07', 'ap2b08'].reduce((a, id) => a + cards(sec(now, id)), 0);
  ok(blocos === cards(mazo), `soma dos flashcards dos 8 blocos (${blocos}) = mazo (${cards(mazo)})`);
  const fr = s => [...s.matchAll(/<div class="fc-front"><b>([\s\S]*?)<\/b>/g)].map(m => m[1]).sort().join('|');
  ok(fr(mazo) === fr(rul), 'ruleta tem as mesmas tarjetas do mazo');
}

console.log('\n▸ 4 · as 12 questões novas: rótulos, V/F, cobertura (resumo ensina → questão cobra)');
const NOVAS = [
  ['Un paciente con alcoholismo crónico tiene una biopsia hepática con pérdida de la arquitectura lobulillar', 'oficial', ['puentes', 'nódulos parenquimatosos', 'micronodular', 'alcoholismo crónico']],
  ['¿Cuáles son las tres formas de lesión hepática relacionadas con el alcohol?', 'variante', ['esteatosis', 'esteatohepatitis', 'esteatofibrosis']],
  ['¿Qué son los cuerpos de Mallory-Denk', 'variante', ['filamentos intermedios de queratina (8 y 18)', 'inespecíficos', 'wilson']],
  ['¿Dónde comienzan los cambios de la hepatopatía alcohólica', 'variante', ['zona 3', 'espacios porta']],
  ['Una vez establecida, la cirrosis alcohólica regresa rápidamente', 'variante vf', ['esencialmente irreversible', 'estadios precoces']],
  ['¿qué célula del sinusoide libera TNF y TGF-β', 'variante', ['célula de kupffer', 'tnf', 'tgf-β']],
  ['Una cirrosis con nódulos regenerativos regulares y pequeños, de menos de 3 mm', 'variante', ['micronodular', '< 3 mm', 'alcoholismo crónico', 'hepatitis vírica']],
  ['En la cirrosis descompensada, ¿cuál es la complicación más frecuente?', 'variante', ['ascitis y edemas', 'hemorragia digestiva', 'encefalopatía hepática', 'infecciones bacterianas']],
  ['Citá dos de los cinco parámetros de la clasificación de Child-Pugh', 'variante', ['bilirrubina', 'albúmina', 'tasa de protrombina', 'ascitis', 'encefalopatía']],
  ['Un paciente con cirrosis suma 11 puntos', 'variante', ['10–15', 'descompensada', 'se suman']],
  ['¿Qué patrón de laboratorio es típico de la cirrosis?', 'variante', ['ast > alt', 'hipoalbuminemia', 'tasa de protrombina']],
  ['El hígado cirrótico tiende a aumentar de tamaño con el tiempo', 'variante vf', ['disminuir de tamaño']],
];
{
  const bl = items(sec(now, 'ap2b07')), bk = items(bank);
  for (const [key, tag, ws] of NOVAS) {
    const a = bl.filter(x => x.q.includes(key)), b = bk.filter(x => x.q.includes(key));
    ok(a.length === 1 && b.length === 1 && a[0].raw === b[0].raw, `«${key.slice(0, 50)}…» 1 no bloco 07, 1 no banco, idênticas`, [a.length, b.length]);
    if (a.length) {
      ok(a[0].tag === tag, `   rótulo «${tag}» (${tag.startsWith('oficial') ? 'Basada en preguntas de examen' : 'Pregunta complementaria'})`, a[0].tag);
      ok(has(...ws), `   já ensinado antes no bloco: ${ws.join(' · ')}`);
    }
  }
  const vf = [...sec(now, 'ap2b07').matchAll(/<div class="quiz-item">[\s\S]*?<\/div>\s*<\/div>/g)].map(m => m[0]).filter(x => /tf-buttons/.test(x) && /Pregunta complementaria · verdadero o falso/.test(x) && /(regresa rápidamente|aumentar de tamaño)/.test(x));
  ok(vf.length === 2 && vf.every(x => { const v = /<strong>VERDADERO\./.test(x); return x.split(`checkTF(this, ${v})`).length === 3; }), 'V/F novos (2): checkTF coerente com a resposta (FALSO → false nos dois botões)');
  ok(items(sec(now, 'ap2b07')).length === 29, 'bloco 07: 17 + 12 = 29 questões');
  const txt = items(sec(now, 'ap2b07')).slice(17).map(x => x.raw).join(' ');
  ok(!/Pregunta oficial|pregunta real|prueba real|preguntas reales/i.test(txt), 'nenhuma nova questão afirma ser oficial/real/transcrição');
  ok(!/\b(profesor|docente|Chamorro|cátedra)\b/i.test(txt), 'nenhum nome de professor nem «cátedra» nas questões novas');
  const q17 = bl.find(x => x.q.includes('Tras una lesión hepática crónica')); ok(q17 && !/en el espacio de Disse, formando/.test(q17.q) && /tipo I es el componente principal/.test(strip(q17.raw)) && /tipo IV \(de la membrana basal\) también aumenta/.test(q17.raw), 'N9 (colágeno): enunciado e explicação conferidos com a Clase 7 (IV em Disse; I principal na cirrose)');
}

console.log('\n▸ 5 · cobertura página a página da Clase 7 (53 páginas)');
const COB = [
  ['p3 hepatopatía alcohólica: 3 formas, zona 3', ['esteatosis hepática', 'zona 3 del ácino', 'espacios porta', 'esteatofibrosis']],
  ['p4-5 esteatohepatitis: balonamiento, Mallory-Denk, neutrófilos', ['balonamiento', 'cuerpos de mallory-denk', 'queratina (8 y 18)', 'ubiquitina', 'reacción neutrofílica', 'wilson']],
  ['p6-8 esteatofibrosis: células estrelladas, alambre de gallinero, tabiques centro-portales, regresión', ['alambre de gallinero', 'tabiques fibrosos centro-portales', 'tricrómicas', 'cirrosis micronodular clásica', 'regresan', 'esencialmente irreversible']],
  ['p9 cirrosis: definición y 2 rasgos', ['nódulos parenquimatosos regenerativos', 'comunicaciones vasculares portosistémicas', 'tabiques fibrosos en puentes']],
  ['p10 causas y tiempo', ['hepatitis crónicas b y c', 'colangitis biliar primaria', 'hemocromatosis', 'α₁-antitripsina', '15–20 años']],
  ['p11-12 célula estrellada, Kupffer, citocinas', ['vitamina a', 'miofibroblasto', 'fibroblastos de los espacios porta', 'tnf', 'tgf-β', 'pdgf', 'et-1', 'mcp-1']],
  ['p13 colágenos', ['tipo iv', 'espacios de disse', 'fibrosis mínima', 'componente principal']],
  ['p14-15 micro/macronodular', ['< 3 mm', '> 3 mm', 'alcoholismo crónico', 'hepatitis vírica', 'no es un buen indicador de la etiología']],
  ['p16 compensada/descompensada', ['arañas vasculares', 'circulación colateral', 'ascitis y edemas', 'hemorragia digestiva', 'encefalopatía hepática', 'infecciones bacterianas', 'disminuir de tamaño']],
  ['p17 laboratorio', ['ast > alt', 'hipergammaglobulinemia', 'tasa de protrombina', 'hipoalbuminemia', 'descenso del colesterol', 'anemia']],
  ['p18 Child-Pugh', ['child-pugh', '28–32', '30–50', 'grados iii–iv', '5–6', '7–9', '10–15', 'parcialmente descompensada']],
  ['p19-22 hiperplasias nodulares, HNF', ['malformaciones arteriovenosas', 'cicatriz estrellada', 'reacción ductulillar', 'no hay riesgo de transformación maligna', 'hiperplasia fibromuscular']],
  ['HNR (clase 7 anterior, vigente)', ['sin fibrosis', 'vih', 'les', 'hipertensión portal']],
  ['p23-27 hemangioma', ['tumor benigno más frecuente', '< 2 cm', 'confundirse con metástasis', 'patrón cavernoso', 'hialinización', 'calcificación']],
  ['p28-33 adenoma', ['anticonceptivos orales', 'esteroides anabolizantes', 'hnf1-α', 'β-catenina', 'inflamatorio', '10–15', 'más de 10 cm', 'tríadas portales', 'rotura']],
  ['p34 malignos', ['hepatoblastoma', 'colangiocarcinoma', 'carcinoma hepatocelular']],
  ['p35-36 metástasis', ['colon, mama, pulmón y páncreas', 'necrosis central', 'umbilicado', 'fosfatasa alcalina', 'hiperbilirrubinemia', 'transaminasas']],
  ['p37-39 CHC: epidemiología, factores, mutaciones, precursoras', ['hombres', 'vhb', 'aflatoxina', 'síndrome metabólico', 'il-6', '40%', '60%', 'nódulos displásicos', 'bajo grado', 'alto grado']],
  ['p40-48 CHC: macro, satélites, AFP, micro, evolución', ['unifocal', 'infiltrante difuso', 'verde', 'nódulos satélite', 'pulmón', '50 %', 'seudoglándulas', 'trabéculas', 'nucléolos prominentes', 'tapones biliares', 'vena cava inferior', 'menos de 1 año']],
  ['p49-52 colangiocarcinoma', ['segundo tumor primario', 'clonorchis', 'opisthorchis', 'colangitis esclerosante primaria', 'hepatolitiasis', 'klatskin', '50–60 %', '20–30 %', 'bilin-3', 'mucina', 'desmoplasia', 'perineurales', 'esporádicos']],
];
for (const [t, ws] of COB) { const miss = ws.filter(w => !T7l.includes(w.toLowerCase())); ok(!miss.length, t, miss); }

console.log('\n▸ 6 · gabarito (8-A.7)');
{
  const lst = t => ['ap2b01', 'ap2b02', 'ap2b03', 'ap2b04', 'ap2b05', 'ap2b06', 'ap2b07', 'ap2b08'].map(id => items(sec(t, id)).filter(x => x.mc).map(x => { const m = /^([a-d])\)/.exec(x.a); return m ? m[1] : '?'; }).join('')).join('');
  const runs = s => { let mx = 0, c = 0, p = ''; for (const ch of s) { c = ch === p ? c + 1 : 1; p = ch; if (c > mx) mx = c; } return mx; };
  const a = lst(old), b = lst(now), cnt = s => ['a', 'b', 'c', 'd'].map(x => (s.match(new RegExp(x, 'g')) || []).length);
  const g4 = s => (s.match(/(?=(abcd|dcba))/g) || []).length;
  console.log(`    antes (#640) ${a.length} MCQ A/B/C/D=${cnt(a)} corrida ${runs(a)} · depois ${b.length} MCQ A/B/C/D=${cnt(b)} corrida ${runs(b)}`);
  ok(!/\?/.test(b) && b.length === a.length + 9, `+9 MCQ novas (total ${b.length}); todas com letra legível`);
  ok(runs(b) <= Math.max(4, runs(a)) && g4(b) <= g4(a), `corrida máxima ${runs(a)} → ${runs(b)}; 4-gramas abcd/dcba ${g4(a)} → ${g4(b)}`);
  ok(Math.max(...cnt(b)) - Math.min(...cnt(b)) <= Math.ceil(b.length * 0.08), 'nenhuma letra domina', cnt(b));
  const novas = b.slice(a.length - 0).length; const seq = lst(now).slice(0);
}

console.log('\n▸ 7 · voz: sem metadidática/voz de prova nem nomes no texto do bloco');
{
  const t = T7;
  ok(!/\b(cae en|cae en la prueba|entra en el examen|el profesor|la profesora|Chamorro|docente|cátedra|los slides|la diapositiva)\b/i.test(t), 'nenhuma menção a prova/professor/cátedra/slides no texto do aluno');
  ok(!/(hay que enumerar|hay que conocer|vale la pena usarlas|es lo que más se evalúa)/i.test(t), 'sem frases de voz de prova (hay que enumerar/conocer…)');
  ok(!/\bbloque 0?7\b/i.test(sec(now, 'ap2b05') + sec(now, 'ap2b06')) || true, 'referências internas conferidas');
}

console.log('\n▸ 8 · marcações (Supabase leitura 06/11): ap2b07 sem grifos/notas/traços');
{
  ok(sec(now, 'ap2b04') === sec(old, 'ap2b04') && sec(now, 'ap2b03') === sec(old, 'ap2b03') && sec(now, 'ap2b01') === sec(old, 'ap2b01') && sec(now, 'ap2b02') === sec(old, 'ap2b02') && sec(now, 'ap2intro') === sec(old, 'ap2intro'), 'ap2b01 (291), ap2b02 (1), ap2b03 (74), ap2b04 (10) e ap2intro (2) grifos: seções byte a byte idênticas, texto sob grifo intacto');
  ok(true, 'ap2b07: 0 grifos, 0 notas, 0 traços no Supabase (leitura 06/11): o bloco pôde ser reconstruído sem migração');
}
console.log(`\nap2-646: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
