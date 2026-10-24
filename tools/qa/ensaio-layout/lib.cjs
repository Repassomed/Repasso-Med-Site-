/* ENSAIO DO LAYOUT EM TODAS AS MATÉRIAS (issue #457) — infraestrutura comum.
   Tudo aqui é LEITURA + simulação local: nenhum arquivo de produção é editado, nenhum flag é tocado, nenhuma requisição sai da máquina.
   · Fonte das matérias = o CATÁLOGO REAL: `const CATALOGO` do index.html (rota/aba) × `FILES` do get-materia.js (arquivo servido).
   · A página do ensaio compõe o <style> e o cabeçalho REAIS do index.html + app-core/rm-tools/rm-tools-v2 REAIS + o HTML REAL da matéria
     (materias-privadas/<slug>.html) — como o site faz depois do login.
   · Os módulos do layout (rm-layout, rm-modes, rm-materia-sistema, rm-materia-nav) são os REAIS, servidos do disco. Eles ainda estão amarrados
     ao slug do piloto; por isso o servidor do ensaio os entrega com UMA transformação textual em memória (ver `ADAPTACOES`), que é exatamente o
     patch que a integração futura precisará — documentado em docs/layout-ensaio/PATCHES-PARA-INTEGRACAO.md. O disco nunca é alterado.
   · Supabase simulado (tinta/destaques vazios; qualquer escrita é registrada em window.__writes e reprova o ensaio); o gate do piloto NÃO é usado:
     o ativador do ensaio (`ativar.js`, só dentro desta pasta) repete a sequência do rm-pilot.js para o slug ensaiado. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');

const REPO = path.resolve(__dirname, '../../..');
const ROOT = path.join(REPO, 'Repasso-Med-Site--main/Atual - Copia');
const MAT = path.join(ROOT, 'netlify/functions/materias-privadas');
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };

/* ---------------- catálogo real ---------------- */
function lerCatalogo() {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const i = idx.indexOf('const CATALOGO = ['); const j = idx.indexOf('];', i);
  const bloco = idx.slice(i + 'const CATALOGO = '.length, j + 1);
  // o bloco é JS literal (chaves sem aspas): avalia isolado, sem acesso a nada
  const cat = new Function('return ' + bloco)();
  return cat.map(c => ({ slug: c.slug, tab: c.tab, title: c.title, sub: c.sub || '', file: c.file }));
}
function lerFiles() {
  const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/get-materia.js'), 'utf8');
  const i = src.indexOf('const FILES = {'); const j = src.indexOf('};', i);
  return new Function('return ' + src.slice(i + 'const FILES = '.length, j + 1))();
}
function reconciliar() {
  const cat = lerCatalogo(), files = lerFiles();
  const disco = fs.readdirSync(MAT).filter(f => f.endsWith('.html'));
  const slugsCat = cat.map(c => c.slug), slugsFiles = Object.keys(files);
  return {
    catalogo: cat, files,
    ativas: cat.filter(c => files[c.slug]).map(c => Object.assign({ arquivo: files[c.slug] }, c)),
    soNoCatalogo: slugsCat.filter(s => !files[s]),
    soNoGetMateria: slugsFiles.filter(s => !slugsCat.includes(s)),
    arquivosOrfaos: disco.filter(f => !Object.values(files).includes(f)),
    arquivosFaltando: Object.values(files).filter(f => !disco.includes(f))
  };
}

/* ---------------- adaptações em memória (o patch da integração futura) ----------------
   Cada uma tem id, motivo e o trecho exato. O ensaio REPORTA quais foram necessárias para cada módulo. */
const ADAPTACOES = [
  { id: 'A1', marca: "slugAtual = (typeof slug", arquivo: 'assets/rm-layout.js', motivo: 'o Layout V2 guarda o slug do piloto numa constante; o ensaio injeta o slug da matéria ensaiada',
    de: "var SLUG = 'semiologia-ii';", para: "var SLUG = (window.__RM_ENSAIO && window.__RM_ENSAIO.slug) || 'semiologia-ii';" },
  { id: 'A2', marca: "html.rm-sis[data-rm-tema] {", arquivo: 'assets/rm-materia-sistema.css', motivo: 'o tema (paleta, superfície, lateral) existe só para semiologia-ii; o ensaio aplica a MESMA paleta a qualquer slug (testa os componentes, não a identidade de cada matéria)',
    de: 'html.rm-sis[data-rm-tema="semiologia-ii"] {', para: 'html.rm-sis[data-rm-tema] {' },
  /* ---- correções (só com ?corr=1): provam que o patch proposto resolve a falha medida; o disco continua intacto ---- */
  { id: 'C1', marca: "hasAttribute('data-rm-agrega')", grupo: 'correcao', arquivo: 'assets/rm-materia-nav.js', motivo: 'seção agregadora (cópia da revisão/banco) reconhecida pelo ID (/banco|flashcards/) — falha em 16 matérias; passa a valer também o marcador data-rm-agrega',
    de: 'var REUNE = /banco|flashcards/i;', para: "var REUNE = { test: function (id) { var e = document.getElementById(id); return /banco|flashcards/i.test(id) || !!(e && e.hasAttribute('data-rm-agrega')); } };" },
  { id: 'C2', marca: "hasAttribute('data-rm-agrega')", grupo: 'correcao', arquivo: 'assets/rm-layout.js', motivo: 'mesma heurística por ID no Layout V2 (contagem de recursos da capa/lateral)',
    de: 'var RES_REUNE = /banco|flashcards/i;', para: "var RES_REUNE = { test: function (id) { var e = document.getElementById(id); return /banco|flashcards/i.test(id) || !!(e && e.hasAttribute('data-rm-agrega')); } };" },
  /* ---- 2.ª rodada (11/10, main com #479) ---- */
  { id: 'A7', arquivo: 'assets/rm-tools-v2.js', motivo: 'o comportamento físico da caneta (guarda de palma, adaptador de toque, touch-action da goma) só liga para os slugs de PILOT_SLUGS; o ensaio inclui o slug ensaiado para medir a caneta APROVADA no piloto em cada matéria (a liberação real continua sendo do servidor: flag pen por slug, patch A5)',
    de: "var PILOT_SLUGS = ['semiologia-ii'];", para: "var PILOT_SLUGS = ['semiologia-ii'].concat(window.__RM_ENSAIO && window.__RM_ENSAIO.slug ? [window.__RM_ENSAIO.slug] : []);" },
  { id: 'C4', marca: "[class$=\"-h2\"]", grupo: 'correcao', arquivo: 'assets/rm-materia-sistema.js', motivo: 'seção sem <h2> direto (ex.: guia com título em <div class=\"rm-guide-h2\">) fica sem título: o pager esconde o vizinho e quebra a cadeia Anterior/Próximo; título de reserva = 1.º cabeçalho visual da seção, depois o marcador',
    de: 'titulo: limpo(h2 && h2.textContent), h2: h2, mk: mk,', para: "titulo: limpo(h2 && h2.textContent) || limpo((q1(sec, ':scope > [class$=\"-h2\"], :scope > h3, :scope > .analysis-card > h3') || {}).textContent) || marcador, h2: h2, mk: mk," },
  { id: 'C5a', marca: "distintosDaMateria(bl, '.quiz-item'", grupo: 'correcao', arquivo: 'assets/rm-layout.js', motivo: 'capa «Preguntas» soma questões repetidas entre blocos e omite as que só existem no banco: passa a contar questões DISTINTAS em toda a matéria, banco incluído — enunciado + CONJUNTO de alternativas (sem ordem e sem a letra: a cópia do banco com alternativas reordenadas pela 8-A.7 é a mesma questão)',
    de: "sub: qs.length + (qs.length === 1 ? ' pregunta' : ' preguntas')", para: "sub: (function (n) { return n + (n === 1 ? ' pregunta' : ' preguntas'); })(distintosDaMateria(bl, '.quiz-item', '.quiz-question', '.options, .tf-buttons'))" },
  { id: 'C5b', marca: "distintosDaMateria(bl, '.flashcard'", grupo: 'correcao', arquivo: 'assets/rm-layout.js', motivo: 'idem para «Flashcards»: cartões DISTINTOS pela frente, em toda a matéria (revisão geral incluída)',
    de: "sub: fc.length + (fc.length === 1 ? ' tarjeta' : ' tarjetas')", para: "sub: (function (n) { return n + (n === 1 ? ' tarjeta' : ' tarjetas'); })(distintosDaMateria(bl, '.flashcard', '.fc-front', null))" },
  { id: 'C5c', marca: "function distintosDaMateria", grupo: 'correcao', arquivo: 'assets/rm-layout.js', motivo: 'função auxiliar de C5a/C5b (normalização = a do inventário do ensaio)',
    de: '  function recursosDaMateria(tab, bl) {', para: "  function distintosDaMateria(bl, sel, cab, extra) {\n    var vistos = {}, n = 0, nz = function (t) { return String(t || '').replace(/\\s+/g, ' ').trim().toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, ' ').trim(); };\n    bl.forEach(function (b) { Array.prototype.forEach.call(b.sec.querySelectorAll(sel), function (x) { var h = x.querySelector(cab), k = nz((h || x).textContent); if (extra) { var o = x.querySelector(extra), it = o ? Array.prototype.map.call(o.querySelectorAll('li,button'), function (y) { return nz(String(y.textContent).replace(/^\\s*(?:[A-Ea-e]|\\d{1,2})[).]\\s*/, '')); }) : []; k += '|' + (it.length ? it.sort().join('|') : nz((o || x).textContent)); } if (!vistos[k]) { vistos[k] = 1; n++; } }); });\n    return n;\n  }\n  function recursosDaMateria(tab, bl) {" },
  { id: 'C7', marca: "c.tagName === 'SUMMARY'", grupo: 'correcao', arquivo: 'assets/rm-materia-nav.js', motivo: 'recurso dentro de <details> fechado (Anatopatología Práctica: os 9 mazos em details.fc-block): o isolamento esconde o <summary> e o aluno não tem como abrir o mazo no modo Flashcards; o <summary> de um <details> do caminho passa a ficar visível',
    de: '        if (keep.indexOf(c) !== -1) return;', para: "        if (keep.indexOf(c) !== -1 || (c.tagName === 'SUMMARY' && pai.tagName === 'DETAILS' && path.indexOf(pai) !== -1)) return;" },
  { id: 'C8', grupo: 'correcao', arquivo: 'assets/rm-tools-v2.js', motivo: 'cartões com «:hover { transform: translateY(-3px) }» (styles.css: .pattern-card, .recep-card, .v-item…) sobem sob a caneta/dedo; transformação não muda tamanho, então o ResizeObserver não dispara e a tinta fica ~3 px fora quando o cartão desce. Ao terminar uma transição de transform no conteúdo, a camada de tinta se reposiciona (não se mexe em nenhum estilo do conteúdo: a rotação de repouso dos post-its de margem continua)',
    de: "    document.addEventListener('visibilitychange', function () { if (!document.hidden) reflow(); });", para: "    document.addEventListener('visibilitychange', function () { if (!document.hidden) reflow(); });\n    document.addEventListener('transitionend', function (e) { if (/transform|translate/.test(e.propertyName || '') && e.target && e.target.closest && e.target.closest('#materias-container')) reflow(); }, true);" },
  { id: 'C6', marca: "if (e.mode === 'preguntas') qa(s.el, '.quiz-section')", grupo: 'correcao', arquivo: 'assets/rm-materia-nav.js', motivo: 'infografía (e a nota que a explica) colocada no INÍCIO de .quiz-section aparece no modo Preguntas; o isolamento passa a esconder SÓ a figura (e a rmc-note dela) antes do 1.º título/questão do grupo — subtítulos ficam (= PR #488)',
    de: '    N.isolado = { sec: s.el, mode: e.mode };', para: "    if (e.mode === 'preguntas') qa(s.el, '.quiz-section').forEach(function (g) { var antFig = false; for (var c = g.firstElementChild; c && !(c.tagName === 'H3' || c.tagName === 'H4' || /quiz-item/.test(c.className || '') || q1(c, '.quiz-item')); c = c.nextElementSibling) { var ehFig = c.tagName === 'FIGURE' || !!q1(c, 'figure'), ehNota = antFig && /(^|\\s)rmc-note(\\s|$)/.test(c.className || ''); if (ehFig || ehNota) c.setAttribute('data-rm-off', ''); antFig = ehFig; } });\n    N.isolado = { sec: s.el, mode: e.mode };" }
];
/* RM_ENSAIO_SEM=C8 (só para prova de antes/depois): desliga adaptações específicas */
const SEM_ADAPT = (process.env.RM_ENSAIO_SEM || '').split(',').filter(Boolean);
function adaptar(arquivoRel, src, usadas, corr) {
  let out = src;
  ADAPTACOES.filter(a => a.arquivo === arquivoRel && (a.grupo !== 'correcao' || corr) && !SEM_ADAPT.includes(a.id)).forEach(a => {
    if (a.marca && src.includes(a.marca)) { usadas && usadas.add(a.id + ':NO-CODIGO'); }        // a correção JÁ está no código servido (PR de integração): nada a simular
    else if (out.includes(a.de)) { out = out.replace(a.de, a.para); usadas && usadas.add(a.id); }
    else if (usadas) usadas.add(a.id + ':NAO-ENCONTRADA');   // o módulo mudou: o ensaio avisa em vez de rodar com patch falso
  });
  return out;
}

/* ---------------- manifesto simulado de audiobook (só Semiología II, 2 blocos: presença onde há, ausência onde não há) ---------------- */
const MANIFESTO_SIMULADO = [
  { audio_id: 'ens-s2-b01', subject_slug: 'semiologia-ii', block_id: 's2-b01', theme: 'Semiología II', title: 'Ensaio · bloque 01', duration: 300, order: 1, version: 'v1' },
  { audio_id: 'ens-s2-b03', subject_slug: 'semiologia-ii', block_id: 's2-b03', theme: 'Semiología II', title: 'Ensaio · bloque 03', duration: 420, order: 2, version: 'v1' }
];

/* ---------------- servidor local ---------------- */
function compor() {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const style = (idx.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const top = (idx.match(/<div class="rm-topbar[\s\S]*?<span class="rm-user" id="rm-user"><\/span>\s*<\/div>/) || [''])[0].replace('rm-topbar hidden', 'rm-topbar');
  const cat = lerCatalogo().map(c => ({ slug: c.slug, tab: c.tab, title: c.title, sub: c.sub }));
  let h = fs.readFileSync(path.join(__dirname, 'harness.html'), 'utf8');
  return h.replace('<!--INDEX_STYLE-->', style).replace('<!--INDEX_TOP-->', top).replace('/*CATALOGO*/[]', JSON.stringify(cat));
}

/* RM_ENSAIO_REF=<ref git> (só para CONTROLE NEGATIVO): serve os assets/ desse ref em vez do disco — prova que a bateria reprova uma versão sabidamente ruim */
const REF = process.env.RM_ENSAIO_REF || '';
function lerAsset(f) {
  const rel = path.relative(REPO, f).replace(/\\/g, '/');
  if (REF && /\/assets\//.test(rel)) { try { return require('child_process').execFileSync('git', ['show', REF + ':' + rel], { cwd: REPO, maxBuffer: 64 << 20 }); } catch (e) { /* inexistente no ref: usa o disco */ } }
  return fs.readFileSync(f);
}
/* C3 (conteúdo solto fora de section[id], #487): quando o rm-materia-sistema.css servido já traz a regra por classe (data-rm-solto), o ativador não simula a sua */
const C3_NO_CODIGO = (() => { try { return /\[data-rm-solto\]/.test(lerAsset(path.join(ROOT, 'assets/rm-materia-sistema.css')).toString()); } catch (e) { return false; } })();
function servir({ usadas = new Set(), pedidos = [] } = {}) {
  if (C3_NO_CODIGO) usadas.add('C3:NO-CODIGO');
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      pedidos.push(u);
      if (u === '/p.html') { r.setHeader('content-type', MIME['.html']); return r.end(compor()); }
      if (u === '/.netlify/functions/get-audio-manifest') {   // manifesto SIMULADO (só responde ao slug do piloto; o ensaio mede presença/ausência, nunca toca áudio real)
        const slug = new URL(q.url, 'http://x').searchParams.get('slug'); r.setHeader('content-type', MIME['.json']);
        return r.end(JSON.stringify({ items: slug === 'semiologia-ii' ? MANIFESTO_SIMULADO : [] }));
      }
      if (u === '/ativar.js') { r.setHeader('content-type', MIME['.js']); return r.end(fs.readFileSync(path.join(__dirname, 'ativar.js'))); }
      const f = u.startsWith('/m/') ? path.join(MAT, u.slice(3)) : path.join(ROOT, u);
      if (!(f.startsWith(ROOT)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
      r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
      const rel = path.relative(ROOT, f).replace(/\\/g, '/');
      const corr = /(^|&)corr=1(&|$)/.test(q.url.split('?')[1] || '');
      if (ADAPTACOES.some(a => a.arquivo === rel)) return r.end(adaptar(rel, lerAsset(f).toString('utf8'), usadas, corr));
      r.end(lerAsset(f));
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

/* ---------------- abertura de uma matéria no navegador ---------------- */
/* opts: { w, h, modo: 'controle'|'layout'|'tema'|'nav', touch, scale, hash, esperar } */
async function abrir(br, base, mat, { w = 1440, h = 900, modo = 'nav', touch = w < 900, scale = 1, hash = '', espera = 1500, corr = false, ix = false, extra = '', initScript = null, mobile = false } = {}) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: mobile, deviceScaleFactor: scale });
  const page = await ctx.newPage(); const errs = [], falhasRede = [], externas = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('c:' + m.text().slice(0, 160)); });
  page.on('requestfailed', r => falhasRede.push(r.url().slice(0, 140)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => { externas.push(r.request().url().slice(0, 140)); r.abort(); });   // zero rede externa
  await page.addInitScript(([slug, modoX]) => { window.__RM_ENSAIO = { slug, modo: modoX }; }, [mat.slug, modo]);
  if (initScript) await page.addInitScript(initScript);
  /* RM_ENSAIO_INIT=<arquivo.js> (pré-voo 24/10): injeta um script em TODA abertura do ensaio — serve para simular, só em memória, uma correção de módulo ou de matéria ainda não feita
     (ex.: tools/qa/pre-voo/sim-c9.js) e medir se ela fecha os bloqueios. Sem a variável, nada muda. */
  if (process.env.RM_ENSAIO_INIT) await page.addInitScript(fs.readFileSync(path.resolve(process.env.RM_ENSAIO_INIT), 'utf8'));
  await page.goto(`${base}/p.html?slug=${mat.slug}&tab=${mat.tab}&modo=${modo}&wait=${espera}${corr ? '&corr=1' : ''}${C3_NO_CODIGO ? '&c3=0' : ''}${ix ? '&ix=1' : ''}${extra}${hash}`, { timeout: 120000 });
  await page.waitForFunction('window.__ready===true', { timeout: 120000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
  return { ctx, page, errs, falhasRede, externas };
}

/* JSON versionável: o cabeçalho numa linha e UM ITEM DA LISTA POR LINHA (diff e revisão legíveis, sem pretty-print de milhares de linhas). */
function jsonLinhas(obj, chaveLista) {
  const lista = obj[chaveLista]; const resto = Object.assign({}, obj); delete resto[chaveLista];
  const cab = JSON.stringify(resto).slice(0, -1);
  return cab + (Object.keys(resto).length ? ',' : '') + JSON.stringify(chaveLista) + ':[\n' + lista.map(x => JSON.stringify(x)).join(',\n') + '\n]}\n';
}

/* ---------------- elegibilidade para a integração (decisão de José, 12/10) ----------------
   Universo conhecido = 27 matérias do catálogo + 1 arquivo sem rota (bioestadistica.html).
   · piloto: Semiología II — o ÚNICO lugar onde o layout novo, a navegação e a caneta já funcionam no site (contas liberadas);
   · fora: Imagenología (decisão de José) e Bioestadística (sem rota no catálogo; #213 encerrada sem merge — nem é ensaiada);
   · elegíveis: as outras 25. Para elas, PASSA no ensaio = «passou com correções simuladas», NUNCA «já funciona no site». */
const ELEGIBILIDADE = {
  piloto: 'semiologia-ii',
  fora: { imagenologia: 'fora da integração por decisão de José (12/10); continua medida só como referência', bioestadistica: 'arquivo sem rota no catálogo (#213 encerrada sem merge): não é matéria ativa, não é ensaiada' }
};
function grupoDe(slug) { return slug === ELEGIBILIDADE.piloto ? 'piloto' : (ELEGIBILIDADE.fora[slug] ? 'fora' : 'elegivel'); }

module.exports = { ELEGIBILIDADE, grupoDe, MANIFESTO_SIMULADO, jsonLinhas, REPO, ROOT, MAT, lerCatalogo, lerFiles, reconciliar, ADAPTACOES, servir, abrir };
