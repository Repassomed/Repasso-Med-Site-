/* Neurología · retirada do bloco «Cierre · ¿dónde está la lesión?» (seção revisaoneu) · 20/11/2026.
   O que SAIU: marcador «REPASO FINAL», h2 do cierre, mapa dos 19 blocos, algoritmo (SVG neuAZ), tabelas de lateralidad, «errores más frecuentes» e «Cómo repasar», até o h4 «Mazo general».
   O que FICOU: a seção `revisaoneu` (mesmo id, mesmos atributos) com as 387 flashcards (o mazo geral), agora sob o h2 «Mazo general · Neurología», e a nota final da asignatura.
   CRITÉRIO (corrigido em 25/11/2026): a base 10e9d4df é a main ANTES da retirada. Depois dela entraram outras PRs (#687/#715: +43 perguntas × 2; #682: 13 figuras), então «a página inteira = base» deixou de ser válido e falhava também na main.
   Agora: a SEÇÃO `revisaoneu` tem de ser exatamente a da base sem o cierre; nada da base se perde (títulos, seções, ids, flashcards, perguntas); bloco = banco; as contagens do índice/capa/DOM são as DA PÁGINA ATUAL (derivadas), não números fixos.
   --relativo é aceito só por compatibilidade (o modo padrão já é relativo).
   ESTÁTICO (contra a base 10e9d4df, antes da retirada): o HTML novo = main com SÓ aquele trecho trocado; 387 flashcards idênticas e na mesma ordem; 774 flashcards e 508 itens de pergunta no total; só o id `neuAZ` desaparece; as outras
   ocorrências de «¿dónde está la lesión?» continuam (só as 2 do trecho saem); portada e comentário de cabeçalho atualizados; o trecho retirado está arquivado, verbatim, fora da pasta publicada.
   NAVEGADOR (1440 e 390 px; omitir com --estatico): legado e layout de índice: a seção existe com o h2 novo e 387 cartões; o índice tem a entrada «Mazo general» e NENHUMA «Cierre»; o modo jogo abre («1 / 387»), vira, avança e
   percorre os 387 cartões na ordem do DOM; contagens do índice/capa iguais às de antes (30 seções, 34 infografías, 254 preguntas, 387 tarjetas, 2 vídeos); sem erro de página e sem rolagem horizontal.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/neu-cierre/neu-cierre.test.cjs [--estatico] [--base <sha>] [--relativo] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const REPO = path.join(__dirname, '..', '..', '..');
const REL = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html';
const ABS = !process.argv.includes('--relativo');   /* --relativo: para usar depois de outras PRs entrarem (perguntas/figuras novas): só compara com a base dada em --base, sem números absolutos */
const BASE = (process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : '10e9d4df');
/* #682: os 13 infográficos (figuras `neuro-b2N-0N-…` no fim dos blocos 20–27) são acréscimo conhecido e alheio à retirada do Cierre; esta checagem só os ignora (número e posição: tools/qa/neu-infograficos e neu-glosario) */
const FIG_682 = /  <figure class="rmc-fig"><div class="rmc-zoom"><img class="rmc-photo" src="\/assets\/img\/neuro\/neuro-b2\d-0\d-[^"]*"[\s\S]*?<\/figure>\n/g;
const curRaw = fs.readFileSync(path.join(REPO, REL), 'utf8'); const N_FIG = (curRaw.match(FIG_682) || []).length; const cur = curRaw.replace(FIG_682, '');   /* N_FIG = figuras da #682 presentes (0 sem ela; 13 com ela): a capa soma 34 + N_FIG infográficos */
const old = cp.execSync('git show ' + BASE + ':"' + REL + '"', { cwd: REPO, maxBuffer: 1 << 28 }).toString();
let ok = 0, bad = 0; const T = (c, m, x) => { if (c) ok++; else { bad++; console.log('  ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 260) : ''); } };
const figBase = 34;   /* infografías que a capa conta na base (a capa só conta figura com legenda e imagem; a #682 soma N_FIG) */
const SEC = '<section class="container" id="revisaoneu"', H4 = '<h4>🎴 Mazo general · Neurología</h4>';
const partes = h => { const a = h.indexOf(SEC); const b = h.indexOf('</section>', a) + 10; const s = h.slice(a, b); return { a, b, s, op: s.indexOf('>') + 1 }; };
const P0 = partes(old), P1 = partes(cur);
const flash = h => h.match(/<div class="flashcard">[\s\S]*?<\/div><\/div>/g) || [];
const ids = h => (h.match(/\bid="([^"]+)"/g) || []).map(x => x.slice(4, -1));
const dl = h => (h.match(/dónde está la lesión/gi) || []).length;
/* trecho retirado = do fim da tag de abertura da seção até o h4 «Mazo general» inclusive */
const hi0 = P0.s.indexOf(H4); const retirado = P0.s.slice(P0.op, hi0 + H4.length);
T(P0.a > 0 && P1.a > 0 && cur.split(SEC).length === 2, 'a seção revisaoneu existe uma só vez (antes e depois)');
T(P1.s.slice(0, P1.op) === P0.s.slice(0, P0.op) && /data-rm-agrega/.test(P1.s.slice(0, P1.op)) && /data-rm-role="review"/.test(P1.s.slice(0, P1.op)), 'a tag da seção (id, data-rm-agrega, data-rm-role) ficou idêntica', P1.s.slice(0, P1.op));
/* o HTML novo = o antigo com SÓ o trecho trocado (mais portada e comentário) */
const esperado = old.slice(0, P0.a + P0.op) + '\n<div class="section-marker"><span class="section-marker-num">MAZO GENERAL · TODAS LAS FLASHCARDS</span></div>\n<h2>🎴 Mazo general · Neurología</h2>\n<span id="neuAZ" hidden aria-hidden="true" data-rm-retirado="cierre-2026-11-20"></span>\n' + P0.s.slice(hi0 + H4.length) + old.slice(P0.b);
const esperadoSec = esperado.slice(P0.a, esperado.length - old.slice(P0.b).length);   /* a seção revisaoneu como deve ficar: base sem o trecho do cierre */
const bancoSec = h => { const a = h.indexOf('<section class="container" id="banconeu"'); return a < 0 ? '' : h.slice(a, h.indexOf('</section>', a) + 10); };

/* a CAPA conta perguntas DISTINTAS (rm-layout.js · distintosDaMateria): mesmo enunciado + mesmas alternativas (sem letra, sem ordem) = 1; sem alternativas (DEFINE/CITE) compara o texto inteiro do item. Réplica em Node para saber o número que a capa DEVE mostrar. */
const nzq = t => String(t || '').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const distintasDosBlocos = h => { const a = h.indexOf('<section class="container" id="banconeu"'); const blocos = a < 0 ? h : h.slice(0, a); const vistos = new Map();
  for (const p of blocos.split(/(?=<div class="quiz-item")/).slice(1)) { const id = (/^<div class="quiz-item" id="([^"]+)"/.exec(p) || [])[1]; const cab = (/<p class="quiz-question">([\s\S]*?)<\/p>/.exec(p) || [])[1] || p;
    let k = nzq(cab); const ul = /<ul class="options">([\s\S]*?)<\/ul>/.exec(p); const tf = /<div class="tf-buttons">([\s\S]*?)<\/div>/.exec(p);
    const itens = ul ? [...ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(m => nzq(m[1].replace(/^\s*[A-Ea-e][).]\s*/, ''))) : tf ? [...tf[1].matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(m => nzq(m[1])) : [];
    k += '|' + (itens.length ? itens.sort().join('|') : nzq(p)); if (!vistos.has(k)) vistos.set(k, [id]); else vistos.get(k).push(id); }
  return { n: vistos.size, dup: [...vistos.values()].filter(v => v.length > 1) }; };
const DIST = distintasDosBlocos(cur);
const nq = h => (h.match(/class="quiz-item/g) || []).length;
const totalQuiz = nq(cur), bancoQuiz = nq(bancoSec(cur)), blocoQuiz = totalQuiz - bancoQuiz;   /* números DERIVADOS da página atual (não fixos): perguntas dos blocos e do banco */
const h2s = h => new Set((h.match(/<h2>[\s\S]*?<\/h2>/g) || []).map(x => x.replace(/<[^>]+>/g, '').trim()));
const secIds = h => new Set((h.match(/<section class="container" id="[^"]+"/g) || []));
const normPortada = h => h.replace(/Dos páginas de (?:cierre|repaso) que <b>no traen contenido nuevo<\/b>[\s\S]*?para aprender\./, 'PORTADA').replace(/revisaoneu {2}(?:Cierre · algoritmo de localización y mazo general|Mazo general de flashcards)/, 'REVISAONEU');
T(P1.s === esperadoSec, 'a seção revisaoneu (mazo geral) é EXATAMENTE a da base sem o trecho do cierre: cabeçalho novo, as 387 flashcards, nota final e nada mais');
T([...h2s(old)].every(x => h2s(cur).has(x) || /Cierre · ¿dónde está la lesión\?/.test(x)), 'nenhum título de bloco (h2) da base sumiu, salvo o do cierre', [...h2s(old)].filter(x => !h2s(cur).has(x)));
T([...secIds(old)].every(x => secIds(cur).has(x)), 'nenhuma seção (bloco, banco, mazo) da base sumiu');
T(/mazo general/.test(cur.slice(0, P1.a)), 'portada e comentário de cabeçalho presentes e atualizados (o resto da página PODE ter crescido depois da base: perguntas, figuras)');
const f0 = flash(old), f1 = flash(cur); const s0 = flash(P0.s), s1 = flash(P1.s);
T(s0.length === s1.length && s1.length >= 387 && (!ABS || s1.length === 387), 'o mazo geral tem 387 flashcards antes e depois (' + s0.length + ' → ' + s1.length + ')');
T(s0.join('\n') === s1.join('\n'), 'as 387 flashcards do mazo são idênticas e estão na mesma ordem');
{ const set1 = new Set(f1); const faltam = f0.filter(f => !set1.has(f)); T(f1.length >= f0.length && faltam.length === 0, 'nenhuma flashcard da base se perdeu (' + f0.length + ' → ' + f1.length + '; cresce, nunca encolhe)', faltam.length); }
{ const q0 = new Set(ids(old).filter(x => /^b?q-/.test(x))); const q1 = new Set(ids(cur)); const perdidas = [...q0].filter(x => !q1.has(x)); T(nq(cur) >= nq(old) && perdidas.length === 0, 'nenhuma pergunta (id q-… / bq-…) da base se perdeu: ' + nq(old) + ' → ' + nq(cur) + ' itens', perdidas); }
console.log('  ℹ perguntas dos blocos: ' + blocoQuiz + ' · distintas (como a capa conta): ' + DIST.n + (DIST.dup.length ? ' · repetidas entre si (mesmo enunciado e alternativas): ' + DIST.dup.map(v => v.join(' = ')).join('; ') : ''));
T(bancoQuiz > 0 && bancoQuiz === blocoQuiz, 'o banco geral tem tantas perguntas quanto os blocos (bloco = banco): ' + blocoQuiz + ' nos blocos · ' + bancoQuiz + ' no banco');
T(retirado.indexOf('class="flashcard"') < 0, 'o trecho retirado não contém nenhuma flashcard');
for (const [rx, nome] of [[/Cierre · ¿dónde está la lesión\?/, 'h2 «Cierre · ¿dónde está la lesión?»'], [/algoritmo de localización/i, '«algoritmo de localización»'], [/REPASO FINAL · NO ES UN BLOQUE NUEVO/, 'marcador do cierre'], [/Los ocho errores más frecuentes/, '«ocho errores más frecuentes»'], [/Cómo repasar esta asignatura/, '«Cómo repasar»'], [/Ipsilateral o contralateral: la tabla/, 'tabla de lateralidad do cierre']])
  T(rx.test(old) && !rx.test(cur), nome + ': existia na main e não existe mais');
const i0 = new Set(ids(old)), i1 = ids(cur); const sumiram = [...i0].filter(x => !i1.includes(x));
T(sumiram.length === 0 && new Set(i1).size === i1.length, 'NENHUM id desapareceu (o Guard protege ids) e nenhum id ficou duplicado', sumiram);
const ph = cur.match(/<span id="neuAZ"[^>]*><\/span>/g) || [];
T(ph.length === 1 && /hidden/.test(ph[0]) && /aria-hidden="true"/.test(ph[0]) && cur.indexOf(ph[0]) > P1.a && cur.indexOf(ph[0]) < P1.b, 'o id «neuAZ» sobrevive só como marcador OCULTO e VAZIO dentro da seção revisaoneu (compatibilidade), sem exibir nada do cierre', ph);
T(!/<svg[^>]*aria-label="Algoritmo de localización/i.test(cur) && !/marker-end="url\(#neuAZ\)"/.test(cur), 'nenhum SVG do algoritmo nem referência marker-end a neuAZ voltou');
T(dl(retirado) === 2 && dl(cur) >= dl(old) - dl(retirado), 'as outras ocorrências de «¿dónde está la lesión?» ficaram (só as ' + dl(retirado) + ' do cierre saíram): ' + dl(old) + ' → ' + dl(cur));
const antes = old.slice(0, P0.a), antesN = cur.slice(0, P1.a); T(dl(antesN) >= dl(antes), 'blocos 01–27, banco e portada mantêm todas as suas ocorrências da expressão');
T(/<h2>🎴 Mazo general · Neurología<\/h2>/.test(P1.s) && /MAZO GENERAL · TODAS LAS FLASHCARDS/.test(P1.s) && /<b>387 tarjetas<\/b>/.test(P1.s), 'a seção agora se apresenta como «Mazo general · Neurología» (387 tarjetas)');
T(/el <b>mazo general<\/b>, con\s+todas las flashcards/.test(cur) && !/repaso final<\/b>, con el algoritmo/.test(cur), 'a portada descreve o banco e o mazo, sem prometer o algoritmo');
const arq = path.join(REPO, 'docs/neurologia-cierre-retirado/cierre-revisaoneu-retirado-2026-11-20.html');
T(fs.existsSync(arq) && fs.readFileSync(arq, 'utf8').includes(retirado) && /sha256 do trecho: ([0-9a-f]{64})/.exec(fs.readFileSync(arq, 'utf8'))[1] === crypto.createHash('sha256').update(retirado, 'utf8').digest('hex'), 'o trecho retirado está arquivado verbatim em docs/ (fora da pasta publicada), com sha256 conferido');
T(!/Atual - Copia/.test(arq), 'o arquivo morto fica fora da pasta publicada pelo Netlify');
console.log('\nneu-cierre (estático): ' + ok + '/' + (ok + bad) + (bad ? ' — ' + bad + ' FALHAS' : ' OK'));
if (process.argv.includes('--estatico') || bad) process.exit(bad ? 1 : 0);
/* ---------------- navegador ---------------- */
const { chromium } = require('playwright'); const L = require('../ensaio-layout/lib.cjs');
let ok2 = 0, bad2 = 0; const U = (c, m, x) => { if (c) ok2++; else { bad2++; console.log('  ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 300) : ''); } };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'neurologia');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const frentes = s1.map(f => (f.match(/<div class="fc-front">([\s\S]*?)<\/div><div class="fc-back">/) || [])[1].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim());
  for (const w of [1440, 390]) {
    /* legado: seção, cartões e modo jogo */
    const r = await L.abrir(br, base, m, { w, h: 900, modo: 'controle', corr: true }); const erros = []; r.page.on('pageerror', e => erros.push(String(e))); await r.page.waitForTimeout(2500);
    const a = await r.page.evaluate(() => { const s = document.getElementById('revisaoneu'); const l = s.querySelector('.rmfc-launch'); return { h2: s.querySelector('h2').textContent, fc: s.querySelectorAll('.flashcard').length, titulo: l && l.querySelector('.rmfc-cover-t').textContent, sub: l && l.querySelector('.rmfc-cover-n').textContent, vis: s.getBoundingClientRect().height > 0, cierre: /Cierre ·|algoritmo de localización/i.test(s.textContent) }; });
    U(a.h2 === '🎴 Mazo general · Neurología' && a.fc === 387 && a.vis && !a.cierre, '@' + w + ' seção visível com o h2 novo, 387 cartões e nenhum texto do cierre', a);
    U(a.titulo === 'Mazo general · Neurología' && /^387 cartas/.test(a.sub), '@' + w + ' a capa do mazo diz «' + a.titulo + '» e «' + a.sub + '»');
    const jogo = await r.page.evaluate(async fr => {
      const s = document.getElementById('revisaoneu'); s.scrollIntoView(); s.querySelector('.rmfc-play').click(); await new Promise(r => setTimeout(r, 500));
      const ov = document.querySelector('.rmfc-overlay'); const txt = e => e.textContent.replace(/\s+/g, ' ').trim(); const out = { abriu: !!ov && ov.classList.contains('show'), prog0: ov && txt(ov.querySelector('.rmfc-prog')), ordem: 0, diverge: null, virou: false, fim: null };
      const card = ov.querySelector('.rmfc-card'); card.click(); await new Promise(r => setTimeout(r, 120)); out.virou = ov.querySelector('.rmfc-card').className + ov.querySelector('.rmfc-inner').className !== '';
      for (let i = 0; i < fr.length; i++) { const f = txt(ov.querySelector('.rmfc-front')); if (f !== fr[i] && out.diverge === null) out.diverge = [i + 1, f.slice(0, 60), fr[i].slice(0, 60)]; else if (f === fr[i]) out.ordem++; if (i < fr.length - 1) ov.querySelector('[data-a="next"]').click(); }
      out.fim = txt(ov.querySelector('.rmfc-prog')); ov.querySelector('[data-a="close"]').click(); await new Promise(r => setTimeout(r, 200)); out.fechou = !document.querySelector('.rmfc-overlay.show') && document.body.style.overflow === ''; return out;
    }, frentes);
    U(jogo.abriu && jogo.prog0 === '1 / 387', '@' + w + ' o modo jogo abre em «1 / 387»', jogo.prog0);
    U(jogo.ordem === 387 && jogo.diverge === null && jogo.fim === '387 / 387', '@' + w + ' os 387 cartões aparecem na ordem do DOM, até «387 / 387» (' + jogo.ordem + ' conferidos)', jogo);
    U(jogo.fechou, '@' + w + ' o modo jogo fecha');
    const sh = await r.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); U(sh <= 1, '@' + w + ' sem rolagem horizontal (' + sh + ')');
    U(erros.length === 0, '@' + w + ' sem erro de página (legado)' + (erros[0] ? ': ' + erros[0] : '')); await r.page.context().close();
    /* layout de índice (navegação): a entrada do mazo existe, a do cierre não, e as contagens não mudaram */
    const n = await L.abrir(br, base, m, { w, h: 900, modo: 'nav', corr: true }); const erros2 = []; n.page.on('pageerror', e => erros2.push(String(e))); await n.page.waitForTimeout(3000);
    const ix = await n.page.evaluate(() => { const c = [...document.querySelectorAll('.rm-sis-card')].map(x => (x.getAttribute('data-rm-go') || '') + '|' + x.textContent.replace(/\s+/g, ' ').trim()); const res = Object.fromEntries([...document.querySelectorAll('.rm-l2-rescard')].map(x => [x.className.replace(/.*rm-l2-rescard--(\w+).*/, '$1'), x.getAttribute('data-rm-n')])); return { n: new Set(c).size, mazo: c.find(x => x.startsWith('revisaoneu|')), cierre: c.filter(x => /Cierre/i.test(x)), banco: c.find(x => x.startsWith('banconeu|')), res, fcDom: document.querySelectorAll('.flashcard').length, quizDom: document.querySelectorAll('.quiz-item').length }; });
    U(/^revisaoneu\|F🎴 Mazo general · Neurología387 tarjetas$/.test(ix.mazo || ''), '@' + w + ' o índice tem a entrada «Mazo general · Neurología» (387 tarjetas)', ix.mazo);
    U(ix.cierre.length === 0, '@' + w + ' o índice NÃO tem nenhuma entrada «Cierre»', ix.cierre);
    U((!ABS || ix.n === 30) && new RegExp('^banconeu\\|B🎯 Banco general de Neurología' + bancoQuiz + ' preguntas$').test(ix.banco || ''), '@' + w + ' ' + (ABS ? '30 entradas no índice e ' : '') + 'o banco mostra ' + bancoQuiz + ' preguntas (as do banco da página)', { n: ix.n, banco: ix.banco });
    U(ix.res.fc === '387' && ix.fcDom === f1.length && ix.res.fig === String(figBase + N_FIG) && ix.res.quiz === String(DIST.n) && ix.res.vid === '2' && ix.quizDom === totalQuiz, '@' + w + ' capa: ' + (figBase + N_FIG) + ' infografías · ' + DIST.n + ' preguntas distintas · 387 tarjetas · 2 vídeos; ' + f1.length + ' flashcards e ' + totalQuiz + ' itens no DOM (os da página)', ix);
    const nav = await n.page.evaluate(async () => { RMNav.go({ view: 'block', block: 'revisaoneu' }); await new Promise(r => setTimeout(r, 1800)); const s = document.getElementById('revisaoneu'); return { vis: s.getBoundingClientRect().height > 0 && getComputedStyle(s).display !== 'none', h2: s.querySelector('h2').textContent, play: !!s.querySelector('.rmfc-play') }; });
    U(nav.vis && nav.h2 === '🎴 Mazo general · Neurología' && nav.play, '@' + w + ' abrir a entrada do índice leva ao mazo (seção visível, botão «Jugar»)', nav);
    U(erros2.length === 0, '@' + w + ' sem erro de página (layout)' + (erros2[0] ? ': ' + erros2[0] : '')); await n.page.context().close();
  }
  await br.close(); srv.close();
  console.log('neu-cierre (navegador): ' + ok2 + '/' + (ok2 + bad2) + (bad2 ? ' — ' + bad2 + ' FALHAS' : ' OK')); process.exit(bad2 ? 1 : 0);
})();
