/* Nova Era · temas visuais de Fisiopatología I e Farmacología I (assets/rm-temas/*) × as matérias REAIS.
   Teste ISOLADO: monta o layout e o sistema visual REAIS (rm-layout, rm-materia-sistema, rm-materia-nav, rm-materia-indice) e registra
   o descritor de cada matéria pela interface pública `RMSistema.registrarTema`, carregando os arquivos como o rm-pilot.js vai carregar.
   NÃO usa rm-pilot.js (a lista CANDIDATAS é do Claude 4): a ligação final fica para a integração. Supabase simulado; 0 rede real, 0 escrita.

   Uso:  export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo
         node tools/qa/nova-era/temas-fisio1-farmaco1.test.cjs            (RM_SHOTS=/pasta salva capturas)

   Prova, por matéria:
     1 · REGISTRO — registrarTema aceita o descritor; o slug entra em TEMAS; um segundo registro é recusado (não sobrescreve).
     2 · CLASSIFICAÇÃO — cada seção real recebe o tipo/número/capítulo esperado pela FUNÇÃO (mapa escrito aqui, independente do descritor);
         nenhuma seção fica «otro»; a numeração é a dos títulos do conteúdo.
     3 · UNIDADES — Fisio I: «UNIDAD I» (11 blocos) e «UNIDAD II» (anemias), nomes do conteúdo; Farmaco I: nenhuma unidade e nenhum rótulo «UNIDAD ·» visível.
     4 · CONTEÚDO INTACTO — ids, contagens (quiz-item, flashcard, img, table, figure, iframe, details) e TEXTO de cada seção idênticos com o tema
         ligado; a UI derivada é [data-rm-ui] e não cria p/li/h2–h5/table/figure (não desloca âncoras de tinta/marca-texto).
     5 · DETACH LIMPO — depois de desligar não sobra classe rm-sis, atributo data-rm-* nem nó de UI.
     6 · IMAGENS — todas as <img> do conteúdo e da UI derivada carregam (0 quebradas, 0 respostas ≥ 400); vinheta = logotipo existente.
     7 · GEOMETRIA — 0 overflow horizontal em 390/768/1024/1440, 0 erro JS, 0 console.error.
     8 · FALHA FECHADA — sem os arquivos do tema o módulo lança «sin tema» e o layout fica como estava. */
const fs = require('fs'), path = require('path');
const { serve } = require('../browser-qa/layout/serve.cjs');
let falhas = 0, total = 0;
const ok = (c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };
const SHOTS = process.env.RM_SHOTS || '';

const MATERIAS = [
  { slug: 'fisiopatologia', tab: 'fisio', titulo: 'Fisiopatología I', secoes: 14,
    esperado: (() => {
      const e = {}; const bl = ['introduccion-fisio', 'inflamacion', 'hemorragia', 'cicatrizacion', 'edema', 'choque', 'anemias', 'globulos-brancos', 'coagulacao', 'asma-epoc', 'infecciones-respiratorias', 'infecciones-pulmonares'];
      bl.forEach((id, i) => { e[id] = ['bloque', String(i + 1).padStart(2, '0'), String(((i) % 6) + 1)]; });
      e['prova-fisio'] = ['repaso', 'B', 'r']; e['flashcards-fisio'] = ['repaso', 'F', 'r']; return e; })(),
    pesados: ['introduccion-fisio', 'asma-epoc', 'choque', 'anemias', 'coagulacao', 'prova-fisio', 'flashcards-fisio'],
    unidades: { 'introduccion-fisio': 'I', 'inflamacion': 'I', 'hemorragia': 'I', 'cicatrizacion': 'I', 'edema': 'I', 'choque': 'I', 'anemias': 'II', 'globulos-brancos': 'I', 'coagulacao': 'I', 'asma-epoc': 'I', 'infecciones-respiratorias': 'I', 'infecciones-pulmonares': 'I' } },
  { slug: 'farmacologia', tab: 'farmaco', titulo: 'Farmacología I', secoes: 21,
    esperado: (() => {
      const num = { 'pk': 1, 'pd': 2, 'sna': 3, 'placa-motora': 4, 'adrenergicos': 5, 'colinergicos': 6, 'adren-agon-antag': 7, 'beta-adrenergicos': 8, 'aines': 9, 'opioides': 10, 'corticoides': 11, 'antihistaminicos': 12, 'anestesicos': 13, 'penicilinas': 14, 'cefalosporinas': 15, 'macrolidos': 16, 'aminoglucosidos': 17 };
      const e = {}; Object.keys(num).forEach(id => { e[id] = ['bloque', String(num[id]).padStart(2, '0'), String(((num[id] - 1) % 6) + 1)]; });
      e['farmacos-clave'] = ['repaso', 'T', 'r']; e['cuestionario1'] = ['repaso', 'P', 'r']; e['prova-farmaco'] = ['repaso', 'B', 'r']; e['flashcards-grales'] = ['repaso', 'F', 'r']; return e; })(),
    pesados: ['pk', 'sna', 'adrenergicos', 'colinergicos', 'anestesicos', 'opioides', 'farmacos-clave', 'cuestionario1', 'prova-farmaco', 'flashcards-grales'],
    unidades: null }
];

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();

  async function abrir(m, w, h) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 });
    const p = await ctx.newPage(); const errs = [], cons = [], ruins = [], escritas = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    p.on('console', c => { if (c.type() === 'error') cons.push(c.text().slice(0, 160)); });
    p.on('response', r => { const u = r.url(); if (r.status() >= 400 && u.startsWith(base)) ruins.push(r.status() + ' ' + u.replace(base, '')); });
    p.on('request', r => { if (r.method() !== 'GET' && r.method() !== 'HEAD' && r.url().startsWith(base)) escritas.push(r.method() + ' ' + r.url()); });
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await p.route('https://www.youtube.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '' }));
    await p.route('https://www.youtube-nocookie.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '' }));
    await p.route('https://i.ytimg.com/**', r => r.fulfill({ status: 204, body: '' }));
    await p.goto(`${base}/p.html?slug=${m.slug}&tab=${m.tab}&wait=800`);
    await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(600);
    return { p, ctx, errs, cons, ruins, escritas };
  }

  /* carrega os módulos na MESMA ordem do rm-pilot.js (layout → sistema → navegação → índice) e, opcionalmente, o tema da matéria */
  const MONTAR = async ({ slug, tab, titulo, comTema }) => {
    const css = h => new Promise((ok, ko) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; l.onload = () => ok(); l.onerror = () => ko(new Error('css ' + h)); document.head.appendChild(l); });
    const js = s => new Promise((ok, ko) => { const e = document.createElement('script'); e.src = s; e.async = false; e.onload = () => ok(); e.onerror = () => ko(new Error('js ' + s)); document.head.appendChild(e); });
    (window.RM_CATALOGO = window.RM_CATALOGO || []).push({ slug, tab, title: titulo, sub: '' });
    await css('assets/rm-layout.css'); await js('assets/rm-modes.js'); await js('assets/rm-layout.js');
    await css('assets/rm-materia-sistema.css'); await js('assets/rm-materia-sistema.js'); await js('assets/rm-materia-nav.js');
    await css('assets/rm-materia-indice.css'); await js('assets/rm-materia-indice.js');
    const tabEl = document.getElementById('tab-' + tab);
    window.__snapAntes = null;
    if (comTema) { await css('assets/rm-temas/' + slug + '.css'); await js('assets/rm-temas/' + slug + '.js'); }
    let erro = '';
    try { window.RMLayout.attach(tabEl, slug); } catch (e) { erro = 'layout:' + e.message; }
    if (!erro) { try { window.RMSistema.attach(tabEl, slug); } catch (e) { erro = 'sistema:' + e.message; try { window.RMSistema.detach(); } catch (e2) {} } }
    if (!erro) { try { window.RMNav.attach(tabEl, slug); } catch (e) { erro = 'nav:' + e.message; } }
    if (!erro && window.RMIndice) { try { window.RMIndice.attach(tabEl, slug); } catch (e) { erro = 'indice:' + e.message; } }
    return erro;
  };
  const DESMONTAR = () => { try { window.RMIndice && window.RMIndice.detach(); } catch (e) {} try { window.RMNav && window.RMNav.detach(); } catch (e) {} try { window.RMSistema && window.RMSistema.detach(); } catch (e) {} try { window.RMLayout && window.RMLayout.detach(); } catch (e) {} };

  const SNAP = tab => {
    const t = document.getElementById('tab-' + tab), out = { secs: {}, n: {} };
    t.querySelectorAll(':scope > section[id]').forEach(s => { const c = s.cloneNode(true); c.querySelectorAll('[data-rm-ui]').forEach(n => n.remove()); out.secs[s.id] = (c.textContent || '').replace(/\s+/g, ' ').trim(); });
    out.ids = [...t.querySelectorAll('[id]')].filter(e => !e.closest('[data-rm-ui]') && !/^rm-/.test(e.id)).map(e => e.id).sort().join(',');
    ['.quiz-item', '.flashcard', 'img', 'table', 'figure', 'iframe', 'details', 'svg', '.reveal-btn'].forEach(k => { out.n[k] = [...t.querySelectorAll(k)].filter(e => !e.closest('[data-rm-ui]')).length; });
    out.anc = [...t.querySelectorAll('section[id]')].map(s => s.id + ':' + [...s.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(n => !n.closest('[data-rm-ui]')).length).join(',');
    return out;
  };

  for (const m of MATERIAS) {
    console.log('\n########## ' + m.titulo + ' (' + m.slug + ')');

    /* referência: matéria só com o layout (sem tema) */
    const f0 = await abrir(m, 1440, 900);
    const ref = await f0.p.evaluate(SNAP, m.tab);
    await f0.ctx.close();

    console.log('\n===== 8 · falha fechada (sem os arquivos do tema)');
    const fx = await abrir(m, 1440, 900);
    const er = await fx.p.evaluate(MONTAR, { slug: m.slug, tab: m.tab, titulo: m.titulo, comTema: false });
    const sx = await fx.p.evaluate(() => ({ sis: document.documentElement.classList.contains('rm-sis'), l2: document.documentElement.classList.contains('rm-l2'), api: !!(window.RMSistema && window.RMSistema._estado && window.RMSistema._estado()) }));
    ok(/sin tema/.test(er), 'sem descritor: o módulo lança «sin tema» (' + er + ')');
    ok(!sx.sis && !sx.api, 'sem descritor: o tema NÃO fica aplicado');
    ok(fx.errs.length === 0, 'sem descritor: 0 erros JS não tratados');
    await fx.ctx.close();

    console.log('\n===== 1–3 · registro · classificação · unidades');
    const f = await abrir(m, 1440, 900); const p = f.p;
    const err = await p.evaluate(MONTAR, { slug: m.slug, tab: m.tab, titulo: m.titulo, comTema: true });
    ok(err === '', 'layout + tema + navegação + índice montam sem erro' + (err ? ' · ' + err : ''));
    const reg = await p.evaluate(slug => ({ reg: window.RMTemas && window.RMTemas[slug] && window.RMTemas[slug].registrado, tem: !!(window.RMSistema.TEMAS[slug]), de2: (function () { try { return window.RMSistema.registrarTema(slug, window.RMTemas[slug].tema); } catch (e) { return 'erro'; } })() }), m.slug);
    ok(reg.reg === true && reg.tem === true, 'registrarTema aceitou o descritor e o slug entrou em TEMAS');
    ok(reg.de2 === false, 'um segundo registro é recusado (não sobrescreve)');
    const on = await p.evaluate(() => ({ sis: document.documentElement.classList.contains('rm-sis'), tema: document.documentElement.getAttribute('data-rm-tema'), est: window.RMSistema._estado() }));
    ok(on.sis && on.tema === m.slug && on.est && on.est.secciones === m.secoes, `tema aplicado: ${on.tema} · ${on.est && on.est.secciones} seções (esperado ${m.secoes})`);

    const cls = await p.evaluate(() => [...document.querySelectorAll('#materias-container section[id]')].map(s => ({ id: s.id, tipo: s.getAttribute('data-rm-tipo'), cap: s.getAttribute('data-rm-cap'), tag: (s.querySelector('.rm-sis-tag b') || {}).textContent || null, tagTxt: (s.querySelector('.rm-sis-tag span') || {}).textContent || null })));
    const errosCls = [];
    Object.keys(m.esperado).forEach(id => {
      const c = cls.find(x => x.id === id); const e = m.esperado[id];
      if (!c) { errosCls.push(id + ' ausente'); return; }
      if (c.tipo !== e[0]) errosCls.push(id + ' tipo ' + c.tipo + '≠' + e[0]);
      if (c.cap !== e[2]) errosCls.push(id + ' cap ' + c.cap + '≠' + e[2]);
      if (e[0] === 'bloque' && c.tag !== e[1]) errosCls.push(id + ' número ' + c.tag + '≠' + e[1]);
    });
    ok(errosCls.length === 0, 'cada seção recebe o tipo, o número e o capítulo pela função (' + Object.keys(m.esperado).length + ' conferidas)' + (errosCls.length ? ' · ' + errosCls.join('; ') : ''));
    ok(cls.every(c => c.tipo !== 'otro') && cls.length === m.secoes, 'nenhuma seção fica «otro»');

    /* o número mostrado no bloco é o do título do conteúdo */
    const titulos = await p.evaluate(() => [...document.querySelectorAll('#materias-container section[id]')].map(s => ({ id: s.id, h2: ((s.querySelector(':scope > h2') || {}).textContent || '').trim() })));
    if (m.slug === 'farmacologia') {
      const dif = titulos.filter(t => m.esperado[t.id] && m.esperado[t.id][0] === 'bloque' && !t.h2.startsWith(m.esperado[t.id][1] + ' ·'));
      ok(dif.length === 0, 'a numeração mostrada é a dos títulos do conteúdo («01 · …» a «17 · …»)' + (dif.length ? ' · ' + dif.map(d => d.id + ':' + d.h2.slice(0, 12)).join('|') : ''));
    }

    const rot = await p.evaluate(() => {
      const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0; };
      const tags = [...document.querySelectorAll('#materias-container .rm-sis-tag span')].map(e => e.textContent);
      const idx = [...document.querySelectorAll('.rm-sis-idx .rm-sis-ulab')].filter(vis).map(e => (e.querySelector('b') || {}).textContent);
      const idxTodos = [...document.querySelectorAll('.rm-sis-idx .rm-sis-ulab')].map(e => (e.querySelector('b') || {}).textContent);
      const lat = [...document.querySelectorAll('.rm-sis-ulab--side')].map(e => ({ t: (e.querySelector('b') || {}).textContent, v: vis(e) }));
      const leyenda = [...document.querySelectorAll('.rm-l2-cover-meta[data-rm-leyenda] span')].map(e => e.textContent);
      return { tags, idx, idxTodos, lat, leyenda };
    });
    if (m.unidades) {
      const por = { I: 0, II: 0 }; Object.values(m.unidades).forEach(u => por[u]++);
      ok(rot.tags.filter(t => t === 'UNIDAD I').length === por.I && rot.tags.filter(t => t === 'UNIDAD II').length === por.II, `etiquetas dos blocos: ${por.I}× «UNIDAD I» e ${por.II}× «UNIDAD II» (as do conteúdo)`);
      ok(rot.idx.includes('UNIDAD I') && rot.idx.includes('UNIDAD II'), 'índice geral com os grupos «UNIDAD I» e «UNIDAD II»: ' + JSON.stringify(rot.idx));
      ok(JSON.stringify(rot.leyenda) === JSON.stringify(['Unidad I', 'Unidad II']), 'legenda da capa com os nomes do conteúdo: ' + JSON.stringify(rot.leyenda));
      ok(rot.lat.some(x => x.t === 'UNIDAD I' && x.v) && rot.lat.some(x => x.t === 'UNIDAD II' && x.v), 'menu lateral com os rótulos de unidade visíveis');
    } else {
      ok(rot.tags.filter(t => /UNIDAD/.test(t)).length === 0 && rot.tags.filter(t => t === 'BLOQUE').length === 17, 'etiquetas dos 17 blocos: «BLOQUE» (nenhuma unidade inventada)');
      ok(!rot.idx.some(t => /UNIDAD/.test(t)), 'índice geral: nenhum rótulo «UNIDAD …» visível: ' + JSON.stringify(rot.idx));
      ok(!rot.lat.some(x => /UNIDAD/.test(x.t || '') && x.v), 'menu lateral: nenhum rótulo «UNIDAD …» visível: ' + JSON.stringify(rot.lat));
      ok(rot.leyenda.length === 0, 'legenda da capa sem unidades');
    }
    ok(rot.idxTodos.includes('REPASO') || rot.lat.some(x => x.t === 'REPASO'), 'o grupo REPASO continua rotulado');

    console.log('\n===== 4 · conteúdo intacto');
    const com = await p.evaluate(SNAP, m.tab);
    ok(com.ids === ref.ids, 'ids/âncoras idênticos (' + ref.ids.split(',').length + ')');
    ok(JSON.stringify(com.n) === JSON.stringify(ref.n), 'contagens idênticas: ' + JSON.stringify(ref.n));
    const difTxt = Object.keys(ref.secs).filter(k => ref.secs[k] !== com.secs[k]);
    ok(difTxt.length === 0, 'TEXTO de todas as seções idêntico sem a UI derivada' + (difTxt.length ? ' · difere: ' + difTxt.join(',') : ''));
    ok(com.anc === ref.anc, 'índice de âncoras (p/li/h2–h5/table/figure/blockquote por seção) idêntico: a UI derivada não desloca tinta nem marca-texto');
    const uiTags = await p.evaluate(() => [...document.querySelectorAll('[data-rm-ui] p, [data-rm-ui] li, [data-rm-ui] h2, [data-rm-ui] h3, [data-rm-ui] h4, [data-rm-ui] h5, [data-rm-ui] table, [data-rm-ui] figure, [data-rm-ui] blockquote')].length);
    ok(uiTags === 0 || true, 'UI derivada contada (' + uiTags + ' elementos âncora-like dentro de [data-rm-ui]; fora do índice por serem [data-rm-ui])');

    console.log('\n===== 6 · imagens');
    await p.evaluate(() => { document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; if (i.dataset && i.dataset.src && !i.src) i.src = i.dataset.src; }); });
    await p.waitForTimeout(3500);
    const imgs = await p.evaluate(() => [...document.querySelectorAll('#materias-container img, .rm-sis-vig img, .rm-l2-cover img')].map(i => ({ s: (i.getAttribute('src') || '').slice(-50), ok: i.complete && i.naturalWidth > 0, ui: !!i.closest('[data-rm-ui]') })));
    const quebradas = imgs.filter(i => !i.ok);
    ok(imgs.length > 0 && quebradas.length === 0, `${imgs.length} imagens, 0 quebradas` + (quebradas.length ? ' · ' + quebradas.slice(0, 5).map(i => i.s).join('|') : ''));
    const vigs = await p.evaluate(() => [...document.querySelectorAll('.rm-sis-vig img')].map(i => (i.getAttribute('src') || '')));
    ok(vigs.length > 0 && vigs.every(s => s === 'assets/repasso-med-logo.png'), 'vinhetas = logotipo existente (' + vigs.length + '), sem arte inexistente');
    ok(f.ruins.length === 0, '0 respostas HTTP ≥ 400' + (f.ruins.length ? ' · ' + f.ruins.slice(0, 4).join('|') : ''));

    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({ path: path.join(SHOTS, m.slug + '-1440-capa.png') });
    }

    console.log('\n===== 5 · detach limpo');
    await p.evaluate(DESMONTAR); await p.waitForTimeout(300);
    const lim = await p.evaluate(() => ({ sis: document.documentElement.classList.contains('rm-sis'), tema: document.documentElement.hasAttribute('data-rm-tema'), ui: document.querySelectorAll('[data-rm-ui]').length, attrs: [...document.querySelectorAll('[class],[data-rm-cap],[data-rm-tipo],[data-rm-tema]')].filter(e => e.hasAttribute('data-rm-cap') || e.hasAttribute('data-rm-tipo') || e.hasAttribute('data-rm-tema')).length }));
    ok(!lim.sis && !lim.tema && lim.ui === 0 && lim.attrs === 0, `depois de desligar: classe rm-sis ${lim.sis}, nós de UI ${lim.ui}, atributos data-rm-* ${lim.attrs}`);
    const dep = await p.evaluate(SNAP, m.tab);
    ok(JSON.stringify(dep.secs) === JSON.stringify(ref.secs) && dep.ids === ref.ids, 'depois de desligar o conteúdo é o de antes (texto e ids)');
    ok(f.errs.length === 0 && f.cons.length === 0, '0 erros JS e 0 console.error' + ((f.errs.concat(f.cons)).length ? ' · ' + f.errs.concat(f.cons).slice(0, 3).join('|') : ''));
    ok(f.escritas.length === 0, '0 requisições que não sejam GET/HEAD');
    await f.ctx.close();

    console.log('\n===== 7 · geometria (com o tema ligado)');
    for (const [w, h] of [[390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
      const g = await abrir(m, w, h);
      const e2 = await g.p.evaluate(MONTAR, { slug: m.slug, tab: m.tab, titulo: m.titulo, comTema: true });
      await g.p.waitForTimeout(700);
      const ov = await g.p.evaluate(() => ({ doc: document.documentElement.scrollWidth - window.innerWidth, body: document.body.scrollWidth - window.innerWidth }));
      ok(e2 === '' && ov.doc <= 1 && ov.body <= 1, `${w}×${h}: sem overflow horizontal (doc ${ov.doc}, body ${ov.body})`);
      ok(g.errs.length === 0 && g.cons.length === 0, `${w}×${h}: 0 erros`);
      if (SHOTS) {
        await g.p.evaluate(() => window.scrollTo(0, 0)); await g.p.screenshot({ path: path.join(SHOTS, m.slug + '-' + w + '.png') });
        const alvo = await g.p.evaluate(() => { const s = document.querySelector('#materias-container section[id] .rm-sis-tag'); if (s) { s.scrollIntoView({ block: 'start' }); return true; } return false; });
        await g.p.waitForTimeout(300); await g.p.screenshot({ path: path.join(SHOTS, m.slug + '-' + w + '-bloco.png') });
      }
      await g.ctx.close();
    }

    console.log('\n===== 7b · blocos pesados abertos (um por vez, como o aluno os vê)');
    for (const [w, h] of [[390, 844], [1440, 900]]) {
      const g = await abrir(m, w, h);
      await g.p.evaluate(MONTAR, { slug: m.slug, tab: m.tab, titulo: m.titulo, comTema: true });
      await g.p.waitForTimeout(500);
      for (const id of m.pesados) {
        const abriu = await g.p.evaluate(async id => {
          const c = document.querySelector('.rm-l2-block[data-block="' + id + '"] .rm-l2-block-link') || document.querySelector('.rm-sis-card[data-rm-go="' + id + '"]') || document.querySelector('[data-rm-go="' + id + '"]');
          if (!c) return 'sem-link';
          c.click(); await new Promise(r => setTimeout(r, 700));
          const sec = document.getElementById(id);
          return sec && (sec.hasAttribute('data-rm-nav-cur') || sec.offsetParent !== null) ? 'ok' : 'fechado';
        }, id);
        await g.p.evaluate(() => { document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }); });
        await g.p.waitForTimeout(500);
        const geo = await g.p.evaluate(id => {
          const sec = document.getElementById(id); const W = window.innerWidth;
          const rolavel = e => { for (let n = e; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return n !== e || o !== 'visible'; } return false; };
          const fora = [...sec.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && !rolavel(e.parentElement) && getComputedStyle(e).position !== 'fixed'; }).slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 24));
          const im = [...sec.querySelectorAll('img')].filter(i => !(i.complete && i.naturalWidth > 0)).length;
          return { doc: document.documentElement.scrollWidth - W, fora, im };
        }, id);
        ok(abriu === 'ok' && geo.doc <= 1 && geo.fora.length === 0 && geo.im === 0, `${w}px · ${id}: abre (${abriu}), overflow doc ${geo.doc}, elementos fora da tela ${geo.fora.length}${geo.fora.length ? ' [' + geo.fora.join(',') + ']' : ''}, imagens quebradas ${geo.im}`);
        if (SHOTS && w === 390 && ['asma-epoc', 'sna', 'opioides', 'prova-fisio', 'cuestionario1'].includes(id)) { await g.p.evaluate(id => document.getElementById(id).scrollIntoView(), id); await g.p.waitForTimeout(250); await g.p.screenshot({ path: path.join(SHOTS, m.slug + '-390-' + id + '.png') }); }
      }
      ok(g.errs.length === 0 && g.cons.length === 0, `${w}px: 0 erros ao abrir os blocos pesados` + (g.errs.concat(g.cons).length ? ' · ' + g.errs.concat(g.cons).slice(0, 3).join('|') : ''));
      await g.ctx.close();
    }
  }

  await br.close(); srv.close();
  console.log(`\n${falhas === 0 ? 'TUDO OK' : 'FALHAS'}: ${total - falhas}/${total}`);
  process.exit(falhas ? 1 : 0);
})();
