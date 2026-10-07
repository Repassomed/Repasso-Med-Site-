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
  { id: 'A1', arquivo: 'assets/rm-layout.js', motivo: 'o Layout V2 guarda o slug do piloto numa constante; o ensaio injeta o slug da matéria ensaiada',
    de: "var SLUG = 'semiologia-ii';", para: "var SLUG = (window.__RM_ENSAIO && window.__RM_ENSAIO.slug) || 'semiologia-ii';" },
  { id: 'A2', arquivo: 'assets/rm-materia-sistema.css', motivo: 'o tema (paleta, superfície, lateral) existe só para semiologia-ii; o ensaio aplica a MESMA paleta a qualquer slug (testa os componentes, não a identidade de cada matéria)',
    de: 'html.rm-sis[data-rm-tema="semiologia-ii"] {', para: 'html.rm-sis[data-rm-tema] {' },
  /* ---- correções (só com ?corr=1): provam que o patch proposto resolve a falha medida; o disco continua intacto ---- */
  { id: 'C1', grupo: 'correcao', arquivo: 'assets/rm-materia-nav.js', motivo: 'seção agregadora (cópia da revisão/banco) reconhecida pelo ID (/banco|flashcards/) — falha em 16 matérias; passa a valer também o marcador data-rm-agrega',
    de: 'var REUNE = /banco|flashcards/i;', para: "var REUNE = { test: function (id) { var e = document.getElementById(id); return /banco|flashcards/i.test(id) || !!(e && e.hasAttribute('data-rm-agrega')); } };" },
  { id: 'C2', grupo: 'correcao', arquivo: 'assets/rm-layout.js', motivo: 'mesma heurística por ID no Layout V2 (contagem de recursos da capa/lateral)',
    de: 'var RES_REUNE = /banco|flashcards/i;', para: "var RES_REUNE = { test: function (id) { var e = document.getElementById(id); return /banco|flashcards/i.test(id) || !!(e && e.hasAttribute('data-rm-agrega')); } };" }
];
function adaptar(arquivoRel, src, usadas, corr) {
  let out = src;
  ADAPTACOES.filter(a => a.arquivo === arquivoRel && (a.grupo !== 'correcao' || corr)).forEach(a => {
    if (out.includes(a.de)) { out = out.replace(a.de, a.para); usadas && usadas.add(a.id); }
    else if (usadas) usadas.add(a.id + ':NAO-ENCONTRADA');   // o módulo mudou: o ensaio avisa em vez de rodar com patch falso
  });
  return out;
}

/* ---------------- servidor local ---------------- */
function compor() {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const style = (idx.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const top = (idx.match(/<div class="rm-topbar[\s\S]*?<span class="rm-user" id="rm-user"><\/span>\s*<\/div>/) || [''])[0].replace('rm-topbar hidden', 'rm-topbar');
  const cat = lerCatalogo().map(c => ({ slug: c.slug, tab: c.tab, title: c.title, sub: c.sub }));
  let h = fs.readFileSync(path.join(__dirname, 'harness.html'), 'utf8');
  return h.replace('<!--INDEX_STYLE-->', style).replace('<!--INDEX_TOP-->', top).replace('/*CATALOGO*/[]', JSON.stringify(cat));
}

function servir({ usadas = new Set(), pedidos = [] } = {}) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      pedidos.push(u);
      if (u === '/p.html') { r.setHeader('content-type', MIME['.html']); return r.end(compor()); }
      if (u === '/ativar.js') { r.setHeader('content-type', MIME['.js']); return r.end(fs.readFileSync(path.join(__dirname, 'ativar.js'))); }
      const f = u.startsWith('/m/') ? path.join(MAT, u.slice(3)) : path.join(ROOT, u);
      if (!(f.startsWith(ROOT)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
      r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
      const rel = path.relative(ROOT, f).replace(/\\/g, '/');
      const corr = /(^|&)corr=1(&|$)/.test(q.url.split('?')[1] || '');
      if (ADAPTACOES.some(a => a.arquivo === rel)) return r.end(adaptar(rel, fs.readFileSync(f, 'utf8'), usadas, corr));
      r.end(fs.readFileSync(f));
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

/* ---------------- abertura de uma matéria no navegador ---------------- */
/* opts: { w, h, modo: 'controle'|'layout'|'tema'|'nav', touch, scale, hash, esperar } */
async function abrir(br, base, mat, { w = 1440, h = 900, modo = 'nav', touch = w < 900, scale = 1, hash = '', espera = 1500, corr = false } = {}) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: false, deviceScaleFactor: scale });
  const page = await ctx.newPage(); const errs = [], falhasRede = [], externas = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('c:' + m.text().slice(0, 160)); });
  page.on('requestfailed', r => falhasRede.push(r.url().slice(0, 140)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => { externas.push(r.request().url().slice(0, 140)); r.abort(); });   // zero rede externa
  await page.addInitScript(([slug, modoX]) => { window.__RM_ENSAIO = { slug, modo: modoX }; }, [mat.slug, modo]);
  await page.goto(`${base}/p.html?slug=${mat.slug}&tab=${mat.tab}&modo=${modo}&wait=${espera}${corr ? '&corr=1' : ''}${hash}`, { timeout: 120000 });
  await page.waitForFunction('window.__ready===true', { timeout: 120000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
  return { ctx, page, errs, falhasRede, externas };
}

module.exports = { REPO, ROOT, MAT, lerCatalogo, lerFiles, reconciliar, ADAPTACOES, servir, abrir };
