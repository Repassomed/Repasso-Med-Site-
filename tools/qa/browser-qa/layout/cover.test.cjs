/* Acabamento do piloto (B1): CAPA da matéria + SLOT de arte + lateral, tudo em CÓDIGO (HTML/CSS/JS).
   Semiología II REAL + rm-pilot → rm-layout/rm-modes REAIS; supabase/gate simulados; 0 rede real, 0 escrita.

   TESTADO AUTOMATICAMENTE aqui (emulação Chromium): estrutura/isolamento da capa ([data-rm-ui], fora de section[id], sem ids), texto real e
   selecionável (não é imagem), 0 overflow em 320/390/768/1024/1440/1600/1920 + zoom 200% + rotação, alvos ≥ 44 px, contraste do texto,
   ações por mouse e teclado, slot de arte (vazio/cargando/listo/erro, 0 deslocamento de layout, proporção preservada, srcset), modos
   isolados ocultam a capa, detach restaura o header, nenhum progresso/gamificação.
   NÃO coberto (precisa de aparelho real): safe-area, teclado virtual, nitidez em retina real, orientação em hardware.
   A arte final NÃO existe aqui: o slot é exercitado com uma imagem SINTÉTICA lisa (não é asset do produto).

   Uso:  export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo
         node tools/qa/browser-qa/layout/cover.test.cjs                                                                    */
const L = require('./lib-ink.cjs');
const { ok, info, abrir, sleep } = L;

const LARGURAS = [[320, 700], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1600, 900], [1920, 1080]];
const ART = (w, h, cor) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${cor || '#cfd8e6'}"/></svg>`;

/* contraste WCAG */
const lum = (rgb) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
const cr = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

async function abrirCapa(br, base, w, h, o = {}) {
  const f = await abrir(br, base, w, h, { seed: '', ...o });
  await f.page.evaluate(() => window.scrollTo(0, 0)); await f.page.waitForTimeout(300);
  return f;
}

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();

  console.log('===== estrutura e isolamento (1440×900) =====');
  { const f = await abrirCapa(br, base, 1440, 900); const p = f.page;
    const e = await p.evaluate(() => {
      const c = document.querySelector('.rm-l2-cover'); const tab = document.querySelector('#materias-container .tab-content.active');
      const sec = [...tab.querySelectorAll('section[id]')];
      const txt = c ? c.innerText : '';
      return { existe: !!c, ui: c && c.hasAttribute('data-rm-ui'), dentroSec: !!(c && c.closest('section[id]')), filhoDaAba: !!(c && c.parentNode === tab),
        ids: c ? c.querySelectorAll('[id]').length : -1, filhosUi: c ? [...c.querySelectorAll('*')].filter(n => !n.closest('[data-rm-ui]')).length : -1,
        h1Capa: c ? c.querySelectorAll('h1').length : -1,
        h1: [...document.querySelectorAll('h1')].filter(h => h.offsetParent !== null).map(h => h.textContent),
        headerOculto: (() => { const h = tab.querySelector(':scope > .rm-subject-head'); return !!h && getComputedStyle(h).display === 'none'; })(),
        headerTexto: (() => { const h = tab.querySelector(':scope > .rm-subject-head'); return h ? h.textContent.replace(/\s+/g, ' ').trim() : null; })(),
        textoCapa: txt.replace(/\s+/g, ' ').trim(),
        selecionavel: c ? getComputedStyle(c.querySelector('.rm-l2-cover-title')).userSelect !== 'none' : false,
        imgs: c ? c.querySelectorAll('img,canvas').length : -1, svgTexto: c ? [...c.querySelectorAll('svg')].filter(s => s.querySelector('text')).length : -1,
        botoes: c ? [...c.querySelectorAll('button')].map(b => ({ n: b.textContent.trim(), tipo: b.type, h: Math.round(b.getBoundingClientRect().height), vis: b.offsetParent !== null })) : [],
        secoes: sec.length };
    });
    ok(e.existe && e.ui, 'a capa existe e leva [data-rm-ui]');
    ok(!e.dentroSec && e.filhoDaAba, 'a capa NÃO está dentro de nenhuma section[id] (irmã do conteúdo, filha da aba)');
    ok(e.ids === 0, `sem nenhum id na capa (0 ids novos para colidir com âncoras): ${e.ids}`);
    ok(e.filhosUi === 0, 'todo nó derivado da capa está sob [data-rm-ui] (o contrato vale por ancestral: o SKIP da V2/RMTools usa closest)');
    ok(e.h1Capa === 1 && e.h1[0] === 'Semiología II', `a capa tem 1 único h1 e ele é o primeiro h1 visível da página («${e.h1[0]}»; o h1 do hero de CONTEÚDO da matéria, «${(e.h1[1] || '').slice(0, 30)}…», é anterior ao piloto e não foi tocado)`);
    ok(e.headerOculto && /Semiolog/.test(e.headerTexto || ''), `o header gerado pelo app-core («${e.headerTexto}») fica oculto no piloto — a capa mostra o mesmo título e subtítulo`);
    ok(e.selecionavel && e.imgs === 0 && e.svgTexto === 0, 'texto real: selecionável, sem <img>/<canvas> e sem texto desenhado em SVG (só ícones decorativos)');
    ok(/Repasso Med/i.test(e.textoCapa) && /Semiología II/.test(e.textoCapa) && /Respiratorio/.test(e.textoCapa), `identificação: «${e.textoCapa}»`);
    ok(!/progres|%|racha|streak|meta diaria|plan de estudio|calendario|recomend|puntos|nivel|logro/i.test(e.textoCapa), 'sem progresso, percentual, streak, plano, calendário, gamificação ou recomendação automática');
    ok(e.botoes.length >= 1 && e.botoes.every(b => b.tipo === 'button'), `ações são <button type="button"> (${e.botoes.map(b => b.n).join(' · ')})`);
    ok(e.botoes.filter(b => b.vis).every(b => b.h >= 44), `alvos de toque visíveis ≥ 44 px (${e.botoes.filter(b => b.vis).map(b => b.h).join(', ')})`);
    ok(f.errs.length === 0, `0 erros JS (${f.errs.length})`);
    await p.close(); }

  console.log('\n===== 0 overflow, hierarquia e contraste em 320 · 390 · 768 · 1024 · 1440 · 1600 · 1920 =====');
  for (const [w, h] of LARGURAS) {
    const f = await abrirCapa(br, base, w, h); const p = f.page;
    const m = await p.evaluate(() => {
      const de = document.documentElement, c = document.querySelector('.rm-l2-cover'), r = c.getBoundingClientRect();
      const b = document.getElementById('rm-l2-band').getBoundingClientRect();
      const efetivo = (el) => { for (let n = el; n; n = n.parentElement) { const bg = getComputedStyle(n).backgroundColor; const m = bg.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(',').map(Number); if (p.length === 3 || p[3] === 1) return p.slice(0, 3); } } return [255, 255, 255]; };
      const cor = (el) => getComputedStyle(el).color.match(/\d+/g).slice(0, 3).map(Number);
      const q = (s) => c.querySelector(s);
      const par = (s) => { const el = q(s); return { fg: cor(el), bg: efetivo(el), fs: parseFloat(getComputedStyle(el).fontSize), fw: +getComputedStyle(el).fontWeight }; };
      return { overflow: de.scrollWidth - de.clientWidth, larg: Math.round(r.width), esq: Math.round(r.left), dir: Math.round(r.right), vw: de.clientWidth, topo: Math.round(r.top), bandaFundo: Math.round(b.bottom), lmode: de.getAttribute('data-rm-lmode'),
        titulo: par('.rm-l2-cover-title'), olho: par('.rm-l2-eyebrow'), sub: par('.rm-l2-cover-sub'), meta: par('.rm-l2-cover-meta'), btn: par('.rm-l2-btn-primary'), btnG: par('.rm-l2-btn-ghost'),
        tFont: parseFloat(getComputedStyle(q('.rm-l2-cover-title')).fontSize), sFont: parseFloat(getComputedStyle(q('.rm-l2-cover-sub')).fontSize),
        titulo_serif: /serif|Fraunces|Georgia/i.test(getComputedStyle(q('.rm-l2-cover-title')).fontFamily) };
    });
    ok(m.overflow <= 0, `${w}px: 0 overflow horizontal`);
    ok(m.esq >= 0 && m.dir <= m.vw, `${w}px: a capa cabe na janela (${m.esq}→${m.dir} de ${m.vw}; lateral=${m.lmode})`);
    ok(m.tFont > m.sFont * 1.8 && m.titulo_serif, `${w}px: hierarquia — título serifado ${m.tFont.toFixed(0)} px ≫ subtítulo ${m.sFont.toFixed(0)} px`);
    const grande = (x) => x.fs >= 24 || (x.fs >= 18.66 && x.fw >= 700);
    const falhas = [['título', m.titulo], ['eyebrow', m.olho], ['subtítulo', m.sub], ['meta', m.meta], ['botão primário', m.btn], ['botão secundário', m.btnG]].filter(([, x]) => cr(x.fg, x.bg) < (grande(x) ? 3 : 4.5)).map(([n, x]) => `${n}=${cr(x.fg, x.bg).toFixed(2)}`);
    ok(falhas.length === 0, `${w}px: contraste WCAG AA do texto (${falhas.length ? falhas.join(', ') : 'título ' + cr(m.titulo.fg, m.titulo.bg).toFixed(1) + ' · eyebrow ' + cr(m.olho.fg, m.olho.bg).toFixed(1) + ' · sub ' + cr(m.sub.fg, m.sub.bg).toFixed(1) + ' · botão ' + cr(m.btn.fg, m.btn.bg).toFixed(1)})`);
    ok(f.errs.length === 0, `${w}px: 0 erros JS`);
    await p.close();
  }

  console.log('\n===== zoom 200% (viewport CSS = metade, escala 2) e rotação =====');
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
    const ctx = await br.newContext({ viewport: { width: Math.round(w / 2), height: Math.round(h / 2) }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(L.FLAGS) }));
    await p.goto(`${base}/p.html?slug=semiologia-ii&tab=semio2&uid=${L.JOSE}&seed=&wait=1500`); await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(900);
    const m = await p.evaluate(() => { const de = document.documentElement, c = document.querySelector('.rm-l2-cover'); return { ov: de.scrollWidth - de.clientWidth, dir: Math.round(c.getBoundingClientRect().right), vw: de.clientWidth, lm: de.getAttribute('data-rm-lmode'), btns: [...c.querySelectorAll('button')].filter(b => b.offsetParent).every(b => b.getBoundingClientRect().height >= 44) }; });
    ok(m.ov <= 0 && m.dir <= m.vw && m.btns, `zoom 200% de ${w}px (viewport CSS ${Math.round(w / 2)}): 0 overflow, capa dentro da janela, alvos ≥ 44 px (lateral=${m.lm})`);
    await ctx.close();
  }
  { const f = await abrirCapa(br, base, 390, 844); const p = f.page;
    for (const [w, h, n] of [[844, 390, 'paisagem 844×390'], [390, 844, 'retrato 390×844'], [1024, 768, 'tablet paisagem 1024×768'], [768, 1024, 'tablet retrato 768×1024']]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(700);
      const m = await p.evaluate(() => { const de = document.documentElement, c = document.querySelector('.rm-l2-cover'), r = c.getBoundingClientRect(); return { ov: de.scrollWidth - de.clientWidth, dir: Math.round(r.right), vw: de.clientWidth, lm: de.getAttribute('data-rm-lmode') }; });
      ok(m.ov <= 0 && m.dir <= m.vw, `rotação → ${n}: 0 overflow, capa dentro da janela (lateral=${m.lm})`);
    }
    await p.close(); }

  console.log('\n===== ações da capa: mouse, teclado e índice =====');
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
    const f = await abrirCapa(br, base, w, h); const p = f.page;
    const idxVis = await p.evaluate(() => { const b = document.querySelector('.rm-l2-btn-idx'); return !!(b && b.offsetParent); });
    ok(idxVis === (w < 1200), `${w}px: «Ver el índice» ${idxVis ? 'aparece' : 'some'} (${w < 1200 ? 'a lateral não está docked' : 'o índice já está à vista'})`);
    /* teclado: foca o botão primário, Enter → 1º bloco sob a faixa */
    await p.focus('.rm-l2-btn-primary'); ok(await p.evaluate(() => document.activeElement.matches('.rm-l2-btn-primary')), `${w}px: o botão primário recebe foco por teclado`);
    const foco = await p.evaluate(() => { const o = getComputedStyle(document.activeElement); return { s: o.outlineStyle, w: parseFloat(o.outlineWidth) }; });
    ok(foco.s !== 'none' && foco.w >= 2, `${w}px: foco visível (outline ${foco.w}px ${foco.s})`);
    await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
    const nav = await p.evaluate(() => { const sec = document.querySelector('.rm-menu .rm-menu-item a[data-target]'); const alvo = document.getElementById(sec.getAttribute('data-target')); const hdr = document.getElementById('rm-l2-band').offsetHeight; return { top: Math.round(alvo.getBoundingClientRect().top), esperado: hdr + 16 }; });
    ok(Math.abs(nav.top - nav.esperado) <= 6, `${w}px: Enter em «Ir al contenido» leva ao 1º bloco sob a faixa (top=${nav.top}, esperado ≈ ${nav.esperado})`);
    if (w < 1200) {
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
      await p.click('.rm-l2-btn-idx'); await p.waitForTimeout(500);
      ok(await p.evaluate(() => document.getElementById('rm-l2-side').classList.contains('is-open') && getComputedStyle(document.getElementById('rm-l2-side')).visibility === 'visible'), `${w}px: «Ver el índice» abre a lateral (drawer)`);
    }
    ok(f.errs.length === 0, `${w}px: 0 erros JS`);
    await p.close();
  }

  console.log('\n===== modos isolados e detach =====');
  { const f = await abrirCapa(br, base, 1440, 900); const p = f.page;
    await p.evaluate(() => window.RMModes.requestView('preguntas')); await p.waitForTimeout(500);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.rm-l2-cover')).display === 'none'), 'em modo isolado a capa fica oculta (o painel do modo ocupa a área)');
    await p.evaluate(() => window.RMModes.requestView('full')); await p.waitForTimeout(900);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.rm-l2-cover')).display !== 'none'), 'ao voltar à Página completa a capa reaparece');
    await p.evaluate(() => window.RMLayout.detach()); await p.waitForTimeout(400);
    ok(await p.evaluate(() => !document.querySelector('.rm-l2-cover') && !document.documentElement.hasAttribute('data-rm-cover')), 'detach remove a capa e o atributo data-rm-cover');
    ok(await p.evaluate(() => { const h = document.querySelector('#materias-container .tab-content > .rm-subject-head'); return !!h && getComputedStyle(h).display !== 'none'; }), 'detach devolve o header original do app-core');
    ok(f.errs.length === 0, '0 erros JS');
    await p.close(); }

  console.log('\n===== SLOT de arte (imagem SINTÉTICA lisa; a arte final virá do ChatGPT via José) =====');
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const f = await abrirCapa(br, base, w, h, { atrasoImg: 0 }); const p = f.page;
    await p.route('**/__art/**', async r => { await sleep(900); r.fulfill({ status: 200, contentType: 'image/svg+xml', body: ART(1600, 900) }); });
    const vazio = await p.evaluate(() => { const a = document.querySelector('.rm-l2-art'), c = document.querySelector('.rm-l2-cover'); return { hidden: a.hidden, estado: a.getAttribute('data-state'), h: Math.round(a.getBoundingClientRect().height), temArt: c.classList.contains('has-art'), slot: a.getAttribute('data-slot') }; });
    ok(vazio.hidden && vazio.estado === 'vacio' && vazio.h === 0 && !vazio.temArt && vazio.slot === 'hero', `${w}px: sem arte o slot «hero» fica vazio e oculto (0 px, sem desenho improvisado, sem caixa vazia)`);
    const antes = await p.evaluate(() => ({ cover: Math.round(document.querySelector('.rm-l2-cover').getBoundingClientRect().height), hero: Math.round(document.querySelector('.s2-hero').getBoundingClientRect().top + pageYOffset) }));
    await p.evaluate(() => window.RMLayout.setAsset('hero', { src: '/__art/hero-1x.svg?x=1', srcset: '/__art/hero-1x.svg?x=1 1x, /__art/hero-2x.svg?x=1 2x', sizes: '(min-width:1000px) 420px, 100vw', w: 1600, h: 900, alt: 'Arte de prueba sintética (no es un asset del producto)', pos: '50% 40%' }));
    await p.waitForTimeout(250);
    const carg = await p.evaluate(() => { const a = document.querySelector('.rm-l2-art'), im = a.querySelector('img'), c = document.querySelector('.rm-l2-cover'), body = c.querySelector('.rm-l2-cover-body'); const ra = a.getBoundingClientRect(), rb = body.getBoundingClientRect();
      return { estado: a.getAttribute('data-state'), hidden: a.hidden, cover: Math.round(c.getBoundingClientRect().height), hero: Math.round(document.querySelector('.s2-hero').getBoundingClientRect().top + pageYOffset), fw: Math.round(ra.width), fh: Math.round(ra.height), temArt: c.classList.contains('has-art'), ladoALado: ra.left >= rb.right - 1, emCima: ra.bottom <= rb.top + 1, srcset: !!im.getAttribute('srcset'), alt: im.alt }; });
    ok(carg.estado === 'cargando' && !carg.hidden && carg.temArt, `${w}px: estado «cargando» (esqueleto neutro) enquanto a imagem não chegou`);
    ok(carg.fw > 0 && Math.abs(carg.fw / carg.fh - 16 / 9) < 0.02, `${w}px: o espaço é RESERVADO na proporção declarada 16:9 antes do carregamento (${carg.fw}×${carg.fh})`);
    await p.waitForFunction(() => document.querySelector('.rm-l2-art').getAttribute('data-state') === 'listo', null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
    const pos = await p.evaluate(() => { const a = document.querySelector('.rm-l2-art'), im = a.querySelector('img'), c = document.querySelector('.rm-l2-cover'); const cs = getComputedStyle(im); const ra = a.getBoundingClientRect();
      return { estado: a.getAttribute('data-state'), cover: Math.round(c.getBoundingClientRect().height), hero: Math.round(document.querySelector('.s2-hero').getBoundingClientRect().top + pageYOffset), nat: [im.naturalWidth, im.naturalHeight], fit: cs.objectFit, opac: cs.opacity, fh: Math.round(ra.height), fw: Math.round(ra.width), maxH: Math.round(a.querySelector('.rm-l2-art-frame').getBoundingClientRect().height) }; });
    ok(pos.estado === 'listo' && pos.nat[0] === 1600, `${w}px: estado «listo» e a imagem carregou (${pos.nat[0]}×${pos.nat[1]})`);
    ok(Math.abs(pos.cover - carg.cover) <= 1 && Math.abs(pos.hero - carg.hero) <= 1, `${w}px: 0 DESLOCAMENTO de layout ao carregar (capa ${carg.cover}→${pos.cover} px; hero da matéria em y=${carg.hero}→${pos.hero})`);
    ok(pos.fit === 'cover' && pos.opac === '1', `${w}px: object-fit: cover (sem deformar) e imagem visível`);
    ok(pos.maxH <= 340, `${w}px: a arte respeita a altura máxima do slot (${pos.maxH} ≤ 340 px)`);
    ok(carg.srcset && /Arte de prueba/.test(carg.alt), `${w}px: srcset (1x/2x) e texto alternativo presentes`);
    ok(w >= 1000 ? carg.ladoALado : carg.emCima, w >= 1000 ? `${w}px: duas colunas — a arte fica ao lado do texto` : `${w}px: coluna única — a arte fica acima do texto`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${w}px: 0 overflow com a arte`);
    /* erro: a imagem some, o slot colapsa */
    await p.route('**/__art/quebrada**', r => r.fulfill({ status: 404, body: '' }));
    await p.evaluate(() => window.RMLayout.setAsset('hero', { src: '/__art/quebrada.svg', w: 1600, h: 900, alt: 'x' })); await p.waitForTimeout(800);
    const err = await p.evaluate(() => { const a = document.querySelector('.rm-l2-art'); return { hidden: a.hidden, estado: a.getAttribute('data-state'), h: Math.round(a.getBoundingClientRect().height), temArt: document.querySelector('.rm-l2-cover').classList.contains('has-art') }; });
    ok(err.hidden && err.estado === 'error' && err.h === 0 && !err.temArt, `${w}px: arquivo ausente (404) ⇒ o slot colapsa (0 px, sem imagem quebrada)`);
    await p.evaluate(() => window.RMLayout.setAsset('hero', null)); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.querySelector('.rm-l2-art').getAttribute('data-state') === 'vacio'), `${w}px: setAsset('hero', null) devolve o estado vazio`);
    ok(f.errs.filter(e => !/404|Failed to load resource/.test(e)).length === 0, `${w}px: 0 erros JS (o 404 proposital do arquivo ausente é esperado)`);
    await p.close();
  }

  await br.close(); srv.close();
  process.exit(L.finish('cover') ? 1 : 0);
})();
