/* Nova Era · tema visual de Fisiopatología II (descritor inline em rm-materia-sistema.js/.css) × a matéria REAL. Teste ISOLADO: monta o layout e o sistema visual REAIS e confere classificação de cada seção, numeração do conteúdo, rótulos, vinhetas, conteúdo intacto (texto, ids, contagens, âncoras), ligar/desligar sem resíduo, geometria e blocos pesados. Supabase simulado; 0 rede real, 0 escrita.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/temas-fisio2.test.cjs   (RM_SHOTS=/pasta salva capturas) */
const fs = require('fs'), path = require('path');
const { serve } = require('../browser-qa/layout/serve.cjs');
let falhas = 0, total = 0;
const ok = (c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };
const SHOTS = process.env.RM_SHOTS || '';

const MATERIAS = [{"slug": "fisiopatologia-ii", "tab": "fisio2", "titulo": "Fisiopatología II", "secoes": 19, "secoesDom": 20, "esperado": {"fp2b01": ["bloque", "01", "1"], "fp2b02": ["bloque", "02", "2"], "fp2b12": ["bloque", "03", "3"], "fp2b04": ["bloque", "04", "4"], "fp2b03": ["bloque", "05", "5"], "fp2b13": ["bloque", "06", "6"], "fp2b14": ["bloque", "07", "1"], "fp2b05": ["bloque", "08", "2"], "fp2b06": ["bloque", "09", "3"], "fp2b07": ["bloque", "10", "4"], "fp2b08": ["bloque", "11", "5"], "fp2b09": ["bloque", "12", "6"], "fp2b10": ["bloque", "13", "1"], "fp2b11": ["bloque", "14", "2"], "fp2b15": ["bloque", "15", "3"], "fp2b16": ["bloque", "16", "4"], "fp2b17": ["bloque", "17", "5"], "bancofp2": ["repaso", "B", "r"], "revisaofp2": ["repaso", "F", "r"]}, "otros": [], "nBlocos": 17, "pasta": "assets/img/fisio2/vig/", "semVig": ["fp2b12", "fp2b04", "fp2b13", "fp2b14", "fp2b09", "fp2b15", "fp2b16", "fp2b17"], "pesados": ["fp2b01", "fp2b02", "fp2b04", "fp2b03", "fp2b08", "fp2b10", "bancofp2", "revisaofp2"], "unidades": null}];

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
    let erro = '';
    try { window.RMLayout.attach(tabEl, slug); } catch (e) { erro = 'layout:' + e.message; }
    window.__pre = new WeakSet(tabEl.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote'));   /* nós âncora-like que existem ANTES de o sistema montar */
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

    console.log('\n===== 1–3 · registro · classificação · unidades');
    const f = await abrir(m, 1440, 900); const p = f.p;
    const err = await p.evaluate(MONTAR, { slug: m.slug, tab: m.tab, titulo: m.titulo, comTema: true });
    ok(err === '', 'layout + tema + navegação + índice montam sem erro' + (err ? ' · ' + err : ''));
    const reg = await p.evaluate(slug => ({ rt: typeof window.RMSistema.TEMAS[slug].clasificar === 'function', tem: !!(window.RMSistema.TEMAS[slug]), de2: (function () { try { return window.RMSistema.registrarTema(slug, Object.assign({}, window.RMSistema.TEMAS[slug])); } catch (e) { return 'erro'; } })() }), m.slug);
    ok(reg.rt === true && reg.tem === true, 'o descritor está em RMSistema.TEMAS[slug] (inline, com clasificar)');
    ok(reg.de2 === false, 'um segundo registro é recusado (não sobrescreve)');
    const on = await p.evaluate(() => ({ sis: document.documentElement.classList.contains('rm-sis'), tema: document.documentElement.getAttribute('data-rm-tema'), est: window.RMSistema._estado() }));
    ok(on.sis && on.tema === m.slug && on.est && on.est.secciones === m.secoes, `tema aplicado: ${on.tema} · ${on.est && on.est.secciones} seções (esperado ${m.secoes})`);

    const dup = await p.evaluate(() => [...document.querySelectorAll('.rm-sis-card-t b, .rm-l2-block-link span')].map(e => (e.matches('.rm-l2-block-link span') ? 'menu:' : 'card:') + e.textContent.trim()).map(t => t.replace(/^(menu|card):/, (x) => x)).filter(t => /^\d{1,2}\s*[·.:–-]\s/.test(t)));
    ok(dup.length === 0, 'sem número repetido nos títulos do índice/menu (a insígnia já mostra o número) · ' + m.slug + ' ' + JSON.stringify(dup.slice(0, 4)));
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
    ok(JSON.stringify(cls.filter(c => c.tipo === 'otro').map(c => c.id)) === JSON.stringify(m.otros || []) && cls.length === (m.secoesDom || m.secoes), 'só ficam «otro» as seções esperadas ' + JSON.stringify(m.otros || []) + ' (' + cls.length + ' seções no DOM; o módulo monta ' + m.secoes + ')');

    /* o número mostrado no bloco é o do título do conteúdo */
    const titulos = await p.evaluate(() => [...document.querySelectorAll('#materias-container section[id]')].map(s => ({ id: s.id, h2: ((s.querySelector(':scope > h2') || {}).textContent || '').trim() })));
    if (m.numTitulos) {
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
      ok(rot.tags.filter(t => /UNIDAD/.test(t)).length === 0 && rot.tags.filter(t => t === 'BLOQUE').length === m.nBlocos, 'etiquetas dos ' + m.nBlocos + ' blocos: «BLOQUE» (nenhuma unidade inventada)');
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
    const nov = await p.evaluate(tab => {
      const t = document.getElementById('tab-' + tab); const sel = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
      const novos = [...t.querySelectorAll(sel)].filter(n => !window.__pre.has(n));
      const fora = novos.filter(n => !n.closest('[data-rm-ui]'));
      /* controle negativo: um <p> criado sem [data-rm-ui] TEM de ser pego por este mesmo critério */
      const intruso = document.createElement('p'); intruso.textContent = 'x'; t.querySelector('section[id]').appendChild(intruso);
      const pego = [...t.querySelectorAll(sel)].filter(n => !window.__pre.has(n) && !n.closest('[data-rm-ui]')).length;
      intruso.remove();
      return { novos: novos.length, fora: fora.map(n => n.tagName + '.' + String(n.className).slice(0, 20)), pego };
    }, m.tab);
    ok(nov.fora.length === 0, `todo nó âncora-like criado pelo sistema/navegação/índice está dentro de [data-rm-ui] (${nov.novos} criados, ${nov.fora.length} fora)` + (nov.fora.length ? ' · ' + nov.fora.slice(0, 4).join('|') : ''));
    ok(nov.pego === 1, 'controle negativo: um <p> sem [data-rm-ui] seria apontado pelo mesmo critério');

    console.log('\n===== 6 · imagens');
    await p.evaluate(() => { document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; if (i.dataset && i.dataset.src && !i.src) i.src = i.dataset.src; }); });
    await p.waitForTimeout(3500);
    const imgs = await p.evaluate(() => [...document.querySelectorAll('#materias-container img, .rm-sis-vig img, .rm-l2-cover img')].map(i => ({ s: (i.getAttribute('src') || '').slice(-50), ok: i.complete && i.naturalWidth > 0, ui: !!i.closest('[data-rm-ui]') })));
    const quebradas = imgs.filter(i => !i.ok);
    ok(imgs.length > 0 && quebradas.length === 0, `${imgs.length} imagens, 0 quebradas` + (quebradas.length ? ' · ' + quebradas.slice(0, 5).map(i => i.s).join('|') : ''));
    const vig = await p.evaluate(() => ({
      blocos: [...document.querySelectorAll('#materias-container section[id]')].map(sec => ({ id: sec.id, tipo: sec.getAttribute('data-rm-tipo'), src: ((sec.querySelector('.rm-sis-vig img') || {}).getAttribute || (() => null)).call(sec.querySelector('.rm-sis-vig img') || {}, 'src'), ok: !!(sec.querySelector('.rm-sis-vig img') && sec.querySelector('.rm-sis-vig img').complete && sec.querySelector('.rm-sis-vig img').naturalWidth > 0) })),
      meds: [...document.querySelectorAll('.rm-sis-med img')].map(i => ({ s: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 }))
    }));
    const pasta = m.pasta;
    const dosBlocos = vig.blocos.filter(b => b.tipo === 'bloque'), dosRepasos = vig.blocos.filter(b => b.tipo === 'repaso');
    const semV = dosBlocos.filter(b => (m.semVig || []).includes(b.id)), comV = dosBlocos.filter(b => !(m.semVig || []).includes(b.id));
    ok(comV.every(b => (b.src || '').startsWith(pasta) && /vb-\d\d\.webp$/.test(b.src || '') && b.ok), `${comV.length} blocos com a sua vinheta recortada do conteúdo (${pasta}), todas carregadas`);
    ok(comV.every(b => Number((b.src.match(/vb-(\d\d)/) || [])[1]) === Number(m.esperado[b.id][1])), 'cada vinheta é a do número do seu bloco');
    ok(semV.length === (m.semVig || []).length && semV.every(b => b.src === 'assets/repasso-med-logo.png' && b.ok), `${semV.length} blocos sem arte limpa usam o logotipo existente (registrado): ${JSON.stringify(m.semVig || [])}`);
    ok(dosRepasos.length > 0 && dosRepasos.every(b => b.src === 'assets/repasso-med-logo.png' && b.ok), `${dosRepasos.length} seções de revisão usam o logotipo existente`);
    ok(vig.meds.length === 3 && vig.meds.every(x => x.ok && x.s.startsWith(pasta)), 'capa com 3 medalhões carregados: ' + JSON.stringify(vig.meds.map(x => x.s.split('/').pop())));
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
        if (SHOTS && w === 390 && m.pesados.slice(0, 5).includes(id)) { await g.p.evaluate(id => document.getElementById(id).scrollIntoView(), id); await g.p.waitForTimeout(250); await g.p.screenshot({ path: path.join(SHOTS, m.slug + '-390-' + id + '.png') }); }
      }
      ok(g.errs.length === 0 && g.cons.length === 0, `${w}px: 0 erros ao abrir os blocos pesados` + (g.errs.concat(g.cons).length ? ' · ' + g.errs.concat(g.cons).slice(0, 3).join('|') : ''));
      await g.ctx.close();
    }
  }


  await br.close(); srv.close();
  console.log(`\n${falhas === 0 ? 'TUDO OK' : 'FALHAS'}: ${total - falhas}/${total}`);
  process.exit(falhas ? 1 : 0);
})();
