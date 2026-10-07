/* NAVEGAÇÃO POR BLOCO + MODOS ISOLADOS do piloto Semiología II (rm-materia-nav.js + RMModes com eixo de bloco) — issue #453.
   Semiología II REAL + shell real (rm-pilot → rm-layout/rm-modes) + caneta V2 real + tema + navegação + **motor de áudio REAL** (lib-player.cjs: só o servidor é simulado).
   O que se prova:
     A  tema desligado / outra conta: nada muda (leitura contínua, sem RMNav, sem atributo data-rm-nav, lateral original);
     B  ABERTURA: capa + recursos + índice geral em cards; nenhum bloco abaixo; lateral com «Índice general» e os modos (sem «Revisión reunida»); contagens = DOM;
        nós originais, IDs e Banco General / Flashcards-de-todos intactos;
     C  LEITURA POR BLOCO: card/lateral/árvore abrem SÓ o bloco; Anterior · Índice · Próximo; deep link de bloco e de subtítulo; Back/Forward; teclado; foco nunca em conteúdo oculto;
     D  MODOS: índice de blocos com contagens reais → só o recurso daquele tipo naquele bloco; Preguntas por grupo (só com metadado real) sem perder o estado;
        Flashcards (+ «todos», sem duplicar); Audiolibros só com card real (manifesto, inclusive tardio); Ausculta; troca de modo e volta; nenhuma página vazia;
     E  CANETA: traço persiste (e volta) ao trocar de bloco; blocos ocultos escondem os traços; ferramenta segue armada;
        REGRESSÃO atualizarTinta: bloco 04 → índice geral → índice de Preguntas → Preguntas do bloco 03 → bloco 04 — nenhum SVG com display ≠ none/caixa/pixel nas telas intermediárias, mesmo traço na âncora, 0 escritas;
     F  ÁUDIO: continua tocando ao navegar; um áudio por vez; sair da matéria/logout para;
     G  GEOMETRIA 320 · 390 · 768 · 1024 · 1440 · zoom 200%: sem overflow, sem sobreposição, última linha acima do player;
     H  detach limpo.
   Uso:  RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/nav-sistema.test.cjs                                                                                                     */
const L = require('./lib-player.cjs');
const path = require('path'), fs = require('fs');
const OUT_EVID = process.env.RM_EVID_DIR ? path.resolve(process.env.RM_EVID_DIR) : require('os').tmpdir(); try { fs.mkdirSync(OUT_EVID, { recursive: true }); } catch (e) {}
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = (t) => console.log('\n▸ ' + t);
const BLOCOS = ['s2-b01', 's2-b02', 's2-b03', 's2-b04', 's2-b05', 's2-b06', 's2-b07', 's2-b08', 's2-b09', 's2-b10'];

/* ---------- medidas no navegador ---------- */
const INFO = () => {
  const H = document.documentElement, tab = document.getElementById('tab-semio2');
  const vis = (e) => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0; };
  const secs = [...tab.querySelectorAll(':scope > section[id]')].filter(vis).map(s => s.id);
  const a = document.activeElement;
  const sel = {
    figuras: 'figure', pregs: '.quiz-item', fc: '.rmfc-launch', ab: '.rm-audio-card', aus: '.audio-player', tablas: 'table'
  };
  const cont = {}; Object.keys(sel).forEach(k => { cont[k] = [...tab.querySelectorAll(sel[k])].filter(e => (k === 'ab' || k === 'fc' || !e.closest('[data-rm-ui]')) && vis(e)).length; });
  return {
    nav: H.getAttribute('data-rm-nav'), mode: H.getAttribute('data-rm-nav-mode'), hash: location.hash, secs, cont,
    st: window.RMNav && window.RMNav.ativo() ? window.RMNav.estado() : null, modes: window.RMModes ? { view: window.RMModes.view, block: window.RMModes.block, nav: window.RMModes.nav } : null,
    pager: [...document.querySelectorAll('.rm-nav-pager a')].filter(x => !x.hidden).map(x => x.textContent.replace(/\s+/g, ' ').trim()),
    chips: [...document.querySelectorAll('.rm-nav-chipf')].map(c => c.textContent.replace(/\s+/g, ' ').trim()),
    cards: [...document.querySelectorAll('.rm-nav-modeidx .rm-sis-card, .rm-sis-idx .rm-sis-card')].filter(vis).map(c => ({ go: c.getAttribute('data-go') || (c.dataset.rmGo ? JSON.stringify({ view: 'block', block: c.dataset.rmGo }) : null), t: c.textContent.replace(/\s+/g, ' ').trim() })),
    lateral: [...document.querySelectorAll('#rm-l2-side .rm-l2-item')].slice(0, 6).map(x => x.textContent.replace(/\s+/g, ' ').trim()),
    foco: a && a !== document.body ? { tag: a.tagName, oculto: !!a.closest('[data-rm-off]') || (a.offsetParent === null && getComputedStyle(a).position !== 'fixed') } : null,
    sw: H.scrollWidth, vw: H.clientWidth, sy: Math.round(scrollY), sh: H.scrollHeight
  };
};
const info = (page) => page.evaluate(INFO);
const go = async (page, spec, ms = 1100) => { await page.evaluate(s => window.RMNav.go(s), spec); await page.waitForTimeout(ms); };
const jsonGo = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia();
  const br = await chromium.launch();
  const A = (o) => L.abrir(br, base, midia, Object.assign({ w: 1440, h: 900, nav: true }, o));
  const ids = (page) => page.evaluate(() => [...document.querySelectorAll('#tab-semio2 [id]')].filter(e => !e.closest('[data-rm-ui]') && !/^rm/.test(e.id)).map(e => e.id).sort().join(','));
  const nos = (page) => page.evaluate(() => { const t = document.getElementById('tab-semio2'); return { ids: [...t.querySelectorAll('[id]')].filter(e => !e.closest('[data-rm-ui]') && !/^rm/.test(e.id)).length, quiz: t.querySelectorAll('.quiz-item').length, fc: t.querySelectorAll('.flashcard').length, tab: t.querySelectorAll('table').length, aud: t.querySelectorAll('audio').length, secs: t.querySelectorAll(':scope > section[id]').length }; });

  /* =============================== A · tema desligado =============================== */
  sec('A · tema desligado (visual:false) e conta sem o tema: leitura contínua, nada da navegação');
  let base0;
  {
    const { ctx, page, errs } = await L.abrir(br, base, midia, { w: 1440, h: 900, visual: false });
    const r = await page.evaluate(() => { const H = document.documentElement, vis = e => getComputedStyle(e).display !== 'none'; return {
      nav: !!window.RMNav, attr: H.hasAttribute('data-rm-nav'), cls: H.className, off: document.querySelectorAll('[data-rm-off]').length, ui: document.querySelectorAll('.rm-nav-crumb,.rm-nav-pager,.rm-sis-idx').length,
      secs: [...document.querySelectorAll('#tab-semio2 > section[id]')].filter(vis).length, side: (document.getElementById('rm-l2-side') || {}).textContent || '', modesNav: window.RMModes && window.RMModes.nav };
    });
    ok(!r.nav && !r.attr && !/rm-nav|rm-sis/.test(r.cls) && r.off === 0 && r.ui === 0, 'RMNav nem carregado, sem atributo/classe/nós da navegação', r);
    ok(r.secs === 14, `as 14 seções seguem em leitura contínua (${r.secs})`);
    ok(r.modesNav === false, 'RMModes sem eixo de bloco (nav=false): modos do V2 como antes');
    ok(/Revisión reunida/.test(r.side), 'lateral ORIGINAL do V2 intacta (a «Revisión reunida» só some no piloto com o tema)');
    base0 = await nos(page); base0.idl = await ids(page);
    ok(errs.length === 0, '0 erros JS', errs);
    await ctx.close();
  }

  /* =============================== B · abertura =============================== */
  sec('B · abertura 1440×900: capa + recursos + índice geral; nenhum bloco abaixo');
  {
    const { ctx, page, errs, reqs } = await A();
    const i = await info(page);
    ok(i.nav === 'index' && i.st && i.st.view === 'index' && i.hash === '', 'estado inicial = índice geral, URL limpa', { nav: i.nav, st: i.st, hash: i.hash });
    ok(i.secs.length === 0, 'nenhum bloco (section[id]) aparece: o 1.º bloco NÃO começa logo abaixo por rolagem', i.secs);
    const g = await page.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0; };
      const grid = document.querySelector('.rm-sis-idx'), last = [...document.querySelectorAll('.rm-sis-card')].pop(); const gr = last && last.getBoundingClientRect();
      return { cover: !![...document.querySelectorAll('.rm-l2-rescard')].filter(vis).length, nCover: [...document.querySelectorAll('.rm-l2-rescard')].filter(vis).length, grid: !!grid && vis(grid),
        fim: gr ? Math.round(gr.bottom + scrollY) : 0, sh: document.documentElement.scrollHeight, nUn: document.querySelectorAll('.rm-sis-idx .rm-sis-ulab, .rm-sis-idx [class*=ulab]').length }; });
    ok(g.cover && g.nCover === 5, `capa com os 5 recursos (Infografías · Preguntas · Flashcards · Audiolibros · Auscultación; o cartão «Resumen» é o próprio índice geral e segue oculto pelo tema) (${g.nCover})`);
    ok(g.grid && g.sh - g.fim < 420, `o índice geral é o fim da página (sobram ${g.sh - g.fim}px abaixo do último card)`, g);
    ok(g.nUn >= 3, `unidades separadas no índice (${g.nUn} rótulos de unidade)`);
    ok(i.cards.length === 14 && i.cards.every(c => jsonGo(c.go) && jsonGo(c.go).view === 'block'), `14 cards (10 blocos + guía + tablas + banco + flashcards), todos abrem um bloco (${i.cards.length})`);
    ok(i.lateral[0] === 'Índice general' && i.lateral.join('|') === 'Índice general|Infografías|Preguntas|Flashcards|Audiolibros|Auscultación', 'lateral: Índice general + Infografías · Preguntas · Flashcards · Audiolibros · Auscultación', i.lateral);
    const topo = await page.evaluate(() => { const f = document.querySelector('#rm-l2-side .rm-l2-item[data-view="full"]').getBoundingClientRect(), t = document.querySelector('#rm-l2-side a.rm-l2-block-link').getBoundingClientRect(), side = document.getElementById('rm-l2-side').getBoundingClientRect(), mods = [...document.querySelectorAll('#rm-l2-side .rm-l2-modes:not(.rm-l2-modes-end) .rm-l2-item')].map(e => e.getBoundingClientRect());
      return { fTop: Math.round(f.top), mTop: Math.round(Math.min(...mods.map(r => r.top))), mBot: Math.round(Math.max(...mods.map(r => r.bottom))), tTop: Math.round(t.top), n: mods.length, h: Math.round(Math.min(...mods.map(r => r.height))), l: Math.min(...mods.map(r => r.left)), r: Math.max(...mods.map(r => r.right)), sr: side.right }; });
    ok(topo.fTop < topo.mTop && topo.mBot <= topo.tTop && topo.n === 5 && topo.h >= 43.5 && topo.l >= 0 && topo.r <= topo.sr, `os 5 modos ficam no ALTO da lateral: «Índice general» (${topo.fTop}) → modos (${topo.mTop}–${topo.mBot}) → árvore (${topo.tTop}); alvos ≥ 44 px, dentro da lateral`, topo);
    const rev = await page.evaluate(() => ({ txt: /Revisión reunida/.test(document.getElementById('rm-l2-side').textContent) || /Revisión reunida/.test(document.body.innerText), banco: !!document.getElementById('s2-banco'), fcs: !!document.getElementById('s2-flashcards'), nBanco: document.querySelectorAll('#s2-banco .quiz-item').length, nFc: document.querySelectorAll('#s2-flashcards .flashcard').length, fim: !!document.querySelector('#rm-l2-side .rm-l2-fim, #rm-l2-side [data-view="banco"], #rm-l2-side [data-view="todos-flashcards"]') }));
    ok(!rev.txt && !rev.fim, 'seção lateral «Revisión reunida» (atalhos Banco/Todos) removida');
    ok(rev.banco && rev.fcs && rev.nBanco === 120 && rev.nFc === 172, `Banco General (120) e Flashcards de todos (172) seguem no conteúdo, só ocultos (${rev.nBanco} · ${rev.nFc})`, rev);
    /* contagens do card = DOM */
    const cnt = await page.evaluate(() => [...document.querySelectorAll('.rm-sis-card[data-rm-go]')].map(c => {
      const id = c.dataset.rmGo, s = document.getElementById(id), txt = c.textContent.replace(/\s+/g, ' ');
      const num = (re) => { const m = re.exec(txt); return m ? +m[1] : 0; };
      const exc = (e) => !e.closest('[data-rm-ui],.material-slide,.med-image');
      return { id, p: num(/(\d+) preguntas?/), pd: [...s.querySelectorAll('.quiz-item')].length, t: num(/(\d+) tarjetas?/), td: s.querySelectorAll('.flashcard').length, f: num(/(\d+) infografías?/), fd: [...s.querySelectorAll('figure')].filter(f => f.querySelector('figcaption') && f.querySelector('img, .s2-photo[role="img"], img.rmc-photo') && exc(f)).length, a: num(/(\d+) sonidos?/), ad: s.querySelectorAll('.audio-player').length };
    }));
    const dif = cnt.filter(c => c.p !== c.pd || c.t !== c.td || c.f !== c.fd || c.a !== c.ad);
    ok(dif.length === 0, 'contagens dos cards (preguntas · tarjetas · infografías · sonidos) = contagem do DOM, bloco a bloco', dif);
    ok(i.lateral.indexOf('Audiolibros') > 0 && reqs.manifest >= 1, 'Audiolibros na lateral porque o manifesto autorizado criou card real');
    const dupl = await page.evaluate(() => { const m = {}; [...document.querySelectorAll('[id]')].forEach(e => { m[e.id] = (m[e.id] || 0) + 1; }); return Object.keys(m).filter(k => m[k] > 1); });
    ok(dupl.length === 0, 'nenhum ID duplicado no documento', dupl);
    const bn = await nos(page); bn.idl = await ids(page);
    ok(JSON.stringify(bn) === JSON.stringify(base0), 'nós originais e IDs idênticos aos da página sem o tema (nada criado/removido no conteúdo)', { a: bn, b: base0 });
    const leak = await page.evaluate(() => /storage\/v1|signed|token=|audiobooks\/semiologia/.test(document.documentElement.outerHTML));
    ok(!leak, 'nenhum bucket/URL assinada/caminho de áudio exposto no DOM');
    /* cápsulas da capa abrem o índice do modo / geral */
    for (const [cls, modo] of [['fig', 'infografias'], ['quiz', 'preguntas'], ['fc', 'flashcards'], ['ab', 'audiobooks'], ['aud', 'auscultacion']]) {
      await go(page, { view: 'index' }, 500);
      await page.evaluate(c => document.querySelector('.rm-l2-rescard--' + c).click(), cls); await page.waitForTimeout(700);
      const m = await info(page); ok(m.nav === 'modeidx' && m.mode === modo, `cartão da capa «${cls}» abre o índice de blocos do modo ${modo}`, { nav: m.nav, mode: m.mode });
    }
    await go(page, { view: 'index' }, 500);
    await go(page, { view: 'modeidx', mode: 'preguntas' }, 500);
    await page.evaluate(() => document.querySelector('[data-rm-k="res"]').click()); await page.waitForTimeout(700);
    ok((await info(page)).nav === 'index', 'pílula «Resumen» da faixa = índice geral');
    await page.evaluate(() => document.querySelector('[data-rm-k="quiz"],[data-rm-k="preg"]') && document.querySelector('[data-rm-k="quiz"],[data-rm-k="preg"]').click()); await page.waitForTimeout(700);
    ok((await info(page)).nav === 'modeidx', 'pílula de recurso da faixa abre o índice de blocos do modo');
    ok(errs.length === 0, '0 erros JS', errs);
    await ctx.close();
  }

  /* =============================== C · leitura por bloco =============================== */
  sec('C · um bloco por vez: card · lateral · árvore · Anterior/Próximo/Índice · deep links · Back/Forward · teclado · foco');
  {
    const { ctx, page, errs } = await A();
    await page.evaluate(() => document.querySelector('.rm-sis-card[data-rm-go="s2-b03"]').click()); await page.waitForTimeout(1500);
    let i = await info(page);
    ok(i.nav === 'block' && i.secs.join() === 's2-b03' && i.hash === '#s2-b03', 'clique no card abre SÓ o bloco 03 (#s2-b03)', { nav: i.nav, secs: i.secs, hash: i.hash });
    ok(i.pager.length === 3 && /^Bloque anterior/.test(i.pager[0]) && /^Volver al índice general$/.test(i.pager[1]) && /^Bloque siguiente/.test(i.pager[2]), 'Bloque anterior · Volver al índice general · Bloque siguiente', i.pager);
    const top = await page.evaluate(() => { const s = document.getElementById('s2-b03'), r = s.getBoundingClientRect(), h = window.RMLayout && window.RMLayout.hdrH ? window.RMLayout.hdrH() : 0; return { top: Math.round(r.top), h, sy: Math.round(scrollY) }; });
    ok(top.top >= -2 && top.top < 260, `o bloco abre no topo da leitura (top=${top.top}px)`, top);
    ok(i.foco === null || !i.foco.oculto, 'foco não está em conteúdo oculto', i.foco);
    const idsAntes = await ids(page);
    /* Próximo / Anterior / Índice */
    await page.click('.rm-nav-next'); await page.waitForTimeout(1300);
    i = await info(page); ok(i.secs.join() === 's2-b04' && i.hash === '#s2-b04', 'Próximo bloque → só o 04', i.secs);
    await page.click('.rm-nav-prev'); await page.waitForTimeout(1300);
    i = await info(page); ok(i.secs.join() === 's2-b03', 'Bloque anterior → volta ao 03', i.secs);
    ok(i.pager.length === 3, 'Anterior/Próximo/Índice presentes de novo');
    await page.click('.rm-nav-idx'); await page.waitForTimeout(1000);
    i = await info(page); ok(i.nav === 'index' && i.secs.length === 0 && i.sy < 40, 'Volver al índice general → índice, topo, sem blocos', { nav: i.nav, secs: i.secs, sy: i.sy });
    /* extremos: 1.º e último */
    await go(page, { view: 'block', block: 's2-guia' }); i = await info(page);
    const hid = await page.evaluate(() => [...document.querySelectorAll('.rm-nav-pager a')].map(a => a.hidden));
    ok(hid[0] === true && hid[2] === false, 'no 1.º bloco não há «anterior» (sem link vazio)', hid);
    await go(page, { view: 'block', block: 's2-flashcards' });
    const hid2 = await page.evaluate(() => [...document.querySelectorAll('.rm-nav-pager a')].map(a => a.hidden));
    ok(hid2[0] === false && hid2[2] === true, 'no último não há «siguiente»', hid2);
    /* lateral */
    await go(page, { view: 'index' }, 500);
    await page.evaluate(() => { const a = [...document.querySelectorAll('#rm-l2-side a[data-target]')].find(x => x.dataset.target === 's2-b05'); a.click(); }); await page.waitForTimeout(1500);
    i = await info(page); ok(i.secs.join() === 's2-b05', 'link do bloco 05 na lateral abre SÓ o bloco 05', i.secs);
    const t3 = await page.evaluate(() => [...document.querySelectorAll('#rm-l2-side a[data-target]')].map(a => a.dataset.target).filter(t => /^s2-b03-/.test(t)));
    ok(t3.length >= 2, `a árvore do bloco 03 tem subtítulos (${t3.length})`);
    await page.evaluate(t => document.querySelector(`#rm-l2-side a[data-target="${t}"]`).click(), t3[1]); await page.waitForTimeout(1600);
    i = await info(page);
    const alvo = await page.evaluate(t => { const e = document.getElementById(t); const r = e && e.getBoundingClientRect(); return r && { top: Math.round(r.top), vh: innerHeight, vis: getComputedStyle(e).display !== 'none' }; }, t3[1]);
    ok(i.secs.join() === 's2-b03' && alvo && alvo.vis && alvo.top > 40 && alvo.top < alvo.vh * 0.6, `subtítulo da árvore (${t3[1]}) abre o bloco 03 e rola ao subtítulo (top=${alvo && alvo.top})`, { secs: i.secs, alvo });
    ok(i.hash === '#' + t3[1], 'URL = âncora do subtítulo', i.hash);
    /* Índice general na lateral */
    await page.evaluate(() => document.querySelector('#rm-l2-side .rm-l2-item[data-view="full"]').click()); await page.waitForTimeout(900);
    i = await info(page); ok(i.nav === 'index' && i.secs.length === 0, '«Índice general» da lateral volta à abertura de qualquer lugar', { nav: i.nav, secs: i.secs });
    /* Back / Forward */
    await go(page, { view: 'block', block: 's2-b03' }); await go(page, { view: 'block', block: 's2-b04' });
    await page.goBack(); await page.waitForTimeout(1100); i = await info(page);
    ok(i.secs.join() === 's2-b03' && i.hash === '#s2-b03', 'Back (navegador) volta ao bloco 03', { secs: i.secs, hash: i.hash });
    await page.goBack(); await page.waitForTimeout(1000); i = await info(page);
    ok(i.nav === 'index' && i.secs.length === 0, 'Back de novo volta ao índice geral', { nav: i.nav, secs: i.secs });
    await page.goForward(); await page.waitForTimeout(1000); i = await info(page);
    ok(i.secs.join() === 's2-b03', 'Forward reabre o bloco 03', i.secs);
    /* hash digitado */
    await page.evaluate(() => { location.hash = '#s2-b05'; }); await page.waitForTimeout(1200); i = await info(page);
    ok(i.secs.join() === 's2-b05', 'trocar o hash (link direto) abre o bloco certo', i.secs);
    /* teclado */
    await page.focus('.rm-nav-next'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200); i = await info(page);
    ok(i.secs.join() === 's2-b06', 'teclado: Enter em «Bloque siguiente» avança', i.secs);
    ok(i.foco && !i.foco.oculto, 'foco permanece em elemento visível depois de navegar', i.foco);
    await page.focus('#rm-l2-side .rm-l2-item[data-view="full"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(900); i = await info(page);
    ok(i.nav === 'index', 'teclado: Enter em «Índice general» (lateral) volta à abertura');
    /* conteúdo oculto não é focável nem lido */
    await go(page, { view: 'block', block: 's2-b03' });
    const ocul = await page.evaluate(() => { const s = document.getElementById('s2-b04'); const f = [...s.querySelectorAll('a[href],button,input,summary,[tabindex]')]; return { display: getComputedStyle(s).display, focaveis: f.filter(e => e.offsetParent !== null).length, total: f.length }; });
    ok(ocul.display === 'none' && ocul.focaveis === 0, `bloco oculto = display:none (fora do foco e da leitura de tela); ${ocul.total} focáveis, 0 alcançáveis`, ocul);
    const m2 = await ids(page); ok(m2 === idsAntes, 'IDs idênticos depois de toda a navegação');
    const hs = await page.evaluate(() => history.scrollRestoration);
    ok(hs === 'manual', 'restauração de rolagem do navegador em modo manual (a navegação guarda/restaura a rolagem de cada entrada)');
    ok(errs.length === 0, '0 erros JS', errs);
    await ctx.close();
  }
  { /* deep link na carga */
    for (const [hash, esp] of [['#s2-b03', 's2-b03'], ['#s2-b03-s2', 's2-b03'], ['#modo/preguntas', null], ['#modo/audiobooks/s2-b04', 's2-b04']]) {
      const { ctx, page, errs } = await A({ hash }); const i = await info(page);
      const alvo = esp ? i.secs.join() === esp : (i.nav === 'modeidx' && i.mode === 'preguntas');
      ok(alvo, `link direto ${hash} abre o destino certo logo na carga`, { nav: i.nav, secs: i.secs, mode: i.mode });
      if (hash === '#s2-b03-s2') { const t = await page.evaluate(() => { const e = document.getElementById('s2-b03-s2'); const r = e.getBoundingClientRect(); return { top: Math.round(r.top), vh: innerHeight }; }); ok(t.top > 40 && t.top < t.vh * 0.7, `subtítulo do deep link fica visível (top=${t.top})`, t); }
      ok(errs.length === 0, '0 erros JS (' + hash + ')', errs);
      await ctx.close();
    }
  }

  /* =============================== D · modos isolados =============================== */
  sec('D · modos isolados: primeiro o índice de blocos, depois só o recurso daquele tipo');
  {
    const { ctx, page, errs } = await A();
    const dom = await page.evaluate(() => { const o = {}; document.querySelectorAll('#tab-semio2 > section[id]').forEach(s => { o[s.id] = {
      fig: [...s.querySelectorAll('figure')].filter(f => f.querySelector('figcaption') && f.querySelector('img, .s2-photo[role="img"], img.rmc-photo') && !f.closest('[data-rm-ui],.material-slide,.med-image')).length,
      q: s.querySelectorAll('.quiz-item').length, fc: s.querySelectorAll('.rmfc-launch').length, tar: s.querySelectorAll('.flashcard').length, ab: s.querySelectorAll('.rm-audio-card').length, au: s.querySelectorAll('.audio-player').length }; }); return o; });
    const MODOS = { infografias: ['fig', /infograf/], preguntas: ['q', /pregunta/], flashcards: ['fc', /tarjeta/], audiobooks: ['ab', /audiolibro/], auscultacion: ['au', /sonido/] };
    const esperados = {};
    for (const [modo, [k]] of Object.entries(MODOS)) esperados[modo] = BLOCOS.filter(b => dom[b][k] > 0);
    ok(esperados.audiobooks.join() === 's2-b01,s2-b03,s2-b04,s2-b05' && esperados.auscultacion.join() === 's2-b01', `blocos com audiolibro real = 01·03·04·05; com ausculta = 01 (${esperados.audiobooks} | ${esperados.auscultacion})`);
    for (const [modo, [k, re]] of Object.entries(MODOS)) {
      await page.evaluate(m => document.querySelector(`#rm-l2-side .rm-l2-item[data-view="${m}"]`).click(), modo); await page.waitForTimeout(900);
      let i = await info(page);
      ok(i.nav === 'modeidx' && i.mode === modo && i.hash === '#modo/' + modo && i.secs.length === 0, `lateral «${modo}» abre o índice de blocos do modo (nenhum bloco aparece)`, { nav: i.nav, mode: i.mode, hash: i.hash, secs: i.secs });
      const blocos = i.cards.map(c => (jsonGo(c.go) || {}).block).filter(b => /^s2-b\d\d$/.test(b));
      ok(blocos.join() === esperados[modo].join(), `${modo}: índice lista só blocos que TÊM o recurso (${blocos.length}: ${blocos.map(b => b.slice(-2))})`, { blocos, esperados: esperados[modo] });
      const contagem = i.cards.filter(c => /^s2-b\d\d$/.test((jsonGo(c.go) || {}).block)).every(c => { const b = jsonGo(c.go).block, m = new RegExp('(\\d+) ' + re.source.replace('/', '')).exec(c.t.toLowerCase()); return m && +m[1] === dom[b][k === 'fc' ? 'tar' : k]; });
      ok(contagem, `${modo}: contagem de cada card = recursos reais do bloco`, i.cards.map(c => c.t));
      /* abre cada bloco do índice: só o recurso, nada vazio */
      for (const b of esperados[modo]) {
        await go(page, { view: 'modeblk', mode: modo, block: b }, 500);
        const v = await info(page);
        const outros = Object.entries(v.cont).filter(([kk]) => kk !== { infografias: 'figuras', preguntas: 'pregs', flashcards: 'fc', audiobooks: 'ab', auscultacion: 'aus' }[modo]).filter(([kk, vv]) => vv > 0 && !(modo === 'preguntas' && kk === 'tablas') && !(modo === 'infografias' && kk === 'tablas'));
        const prop = { infografias: 'figuras', preguntas: 'pregs', flashcards: 'fc', audiobooks: 'ab', auscultacion: 'aus' }[modo];
        if (!(v.secs.join() === b && v.cont[prop] === dom[b][k] && v.cont[prop] > 0 && outros.filter(([kk]) => kk !== 'tablas').length === 0)) ok(false, `${modo} · ${b}: só o recurso do tipo (visíveis ${JSON.stringify(v.cont)}, esperado ${prop}=${dom[b][k]})`, { secs: v.secs, outros });
      }
      ok(true, `${modo}: ${esperados[modo].length} páginas «modo+bloco» verificadas (só o recurso, contagem real, nenhuma vazia)`);
    }
    /* modo+bloco: Anterior/Próximo/Volver */
    await go(page, { view: 'modeblk', mode: 'audiobooks', block: 's2-b01' });
    let i = await info(page);
    ok(i.pager.length === 2 && /Siguiente · Audiolibros|Siguiente · Audiolibro/.test(i.pager[1]) && /Volver a Audiolibros|Volver a Audiolibro/.test(i.pager[0]), 'audiolibros 01: sem «anterior»; «Volver a …» + «Siguiente · …»', i.pager);
    await page.click('.rm-nav-next'); await page.waitForTimeout(1100); i = await info(page);
    ok(i.mode === 'audiobooks' && i.secs.join() === 's2-b03', 'próximo audiolibro pula o bloco 02 (sem recurso) → bloco 03', { mode: i.mode, secs: i.secs });
    await page.click('.rm-nav-idx'); await page.waitForTimeout(900); i = await info(page);
    ok(i.nav === 'modeidx' && i.mode === 'audiobooks', '«Volver a Audiolibros» → índice do modo');
    ok(i.hash === '#modo/audiobooks', 'URL do modo', i.hash);
    /* troca de modo e volta */
    await go(page, { view: 'modeblk', mode: 'preguntas', block: 's2-b03' });
    await page.evaluate(() => document.querySelector('#rm-l2-side .rm-l2-item[data-view="flashcards"]').click()); await page.waitForTimeout(900); i = await info(page);
    ok(i.nav === 'modeidx' && i.mode === 'flashcards', 'trocar de modo (Preguntas → Flashcards) abre o índice do novo modo');
    await page.goBack(); await page.waitForTimeout(1000); i = await info(page);
    ok(i.nav === 'modeblk' && i.mode === 'preguntas' && i.secs.join() === 's2-b03', 'Back volta ao modo/bloco anterior', { nav: i.nav, mode: i.mode, secs: i.secs });
    /* Preguntas: grupos reais */
    const grp = await page.evaluate(() => ({ exam: document.querySelectorAll('#s2-b03 .quiz-item .quiz-tag.basada').length, tot: document.querySelectorAll('#s2-b03 .quiz-item').length }));
    i = await info(page);
    ok(i.chips.length === 3 && /^Todas 28$/.test(i.chips[0]) && /examen 17$/.test(i.chips[1]) && /Complementarias 11$/.test(i.chips[2]) && grp.exam === 17, 'Preguntas b03: Todas 28 · Basadas en preguntas de examen 17 · Complementarias 11 (metadado real do DOM)', { chips: i.chips, grp });
    /* estado da questão preservado ao filtrar */
    await page.evaluate(() => { const q = document.querySelector('#s2-b03 .quiz-item'); q.querySelector('li[data-option]').click(); });
    await page.waitForTimeout(1500);
    const est0 = await page.evaluate(() => { const q = document.querySelector('#s2-b03 .quiz-item'); return { cls: q.className, htmlAns: q.querySelector('.answer') && getComputedStyle(q.querySelector('.answer')).display, sel: [...q.querySelectorAll('li')].map(l => l.className).join('|') }; });
    await page.click('.rm-nav-chipf[data-f="exam"]'); await page.waitForTimeout(500); i = await info(page);
    ok(i.cont.pregs === 17, `filtro «Basadas en preguntas de examen» mostra 17 (${i.cont.pregs})`);
    await page.click('.rm-nav-chipf[data-f="comp"]'); await page.waitForTimeout(500); i = await info(page);
    ok(i.cont.pregs === 11, `filtro «Complementarias» mostra 11 (${i.cont.pregs})`);
    await page.click('.rm-nav-chipf[data-f="todas"]'); await page.waitForTimeout(500); i = await info(page);
    const est1 = await page.evaluate(() => { const q = document.querySelector('#s2-b03 .quiz-item'); return { cls: q.className, htmlAns: q.querySelector('.answer') && getComputedStyle(q.querySelector('.answer')).display, sel: [...q.querySelectorAll('li')].map(l => l.className).join('|') }; });
    ok(i.cont.pregs === 28 && JSON.stringify(est0) === JSON.stringify(est1) && /correct|wrong|answered|selected/i.test(est0.sel + est0.cls), 'filtrar não perde o estado respondido da questão; «Todas» volta às 28', { est0, est1 });
    const tags = await page.evaluate(() => ({ nTag: document.querySelectorAll('.quiz-tag.basada').length }));
    /* só agrupa onde a classificação existe: bloco/banco sem metadado completo não ganha chips */
    await go(page, { view: 'modeblk', mode: 'preguntas', block: 's2-b02' }); i = await info(page);
    ok(i.chips.length === 0 || (i.chips.length === 3 && /examen 4$/.test(i.chips[1])), 'sem metadado completo não há grupos inventados (b02: ' + (i.chips.length ? '4 · 5' : 'sem chips') + ')', i.chips);
    /* Banco General: não entra duas vezes */
    await go(page, { view: 'modeidx', mode: 'preguntas' }); i = await info(page);
    const bancoCards = i.cards.filter(c => /banco/i.test(c.t));
    ok(bancoCards.length <= 1, `Banco General só como revisão geral, fora da soma por bloco (${bancoCards.length} card)`, bancoCards.map(c => c.t));
    const soma = i.cards.filter(c => /^s2-b\d\d$/.test((jsonGo(c.go) || {}).block)).reduce((a, c) => a + (+(/^\D*(\d+)\s*preguntas/i.exec(c.t.replace(/^\d+/, '')) || [0, 0])[1] || 0), 0);
    ok(soma > 0 && soma < 120 + 200, `soma por bloco (${soma}) não conta o banco (${120})`);
    /* Flashcards: launcher do bloco + todos */
    await go(page, { view: 'modeidx', mode: 'flashcards' }); i = await info(page);
    const todos = i.cards.find(c => (jsonGo(c.go) || {}).block === 's2-flashcards');
    ok(!!todos && /172/.test(todos.t), 'Flashcards: acesso a «Todos los flashcards» (172) no índice do modo', todos);
    const antes = await nos(page);
    await go(page, { view: 'modeblk', mode: 'flashcards', block: 's2-flashcards' }); i = await info(page);
    ok(i.secs.join() === 's2-flashcards' && i.cont.fc > 0 && i.cont.pregs === 0, `«Todos los flashcards» abre só os lançadores de flashcards gerais (${i.cont.fc} visíveis, 0 perguntas)`, i.cont);
    await go(page, { view: 'modeblk', mode: 'flashcards', block: 's2-b03' }); i = await info(page);
    ok(i.secs.join() === 's2-b03' && i.cont.fc === 1 && i.cont.pregs === 0 && i.cont.figuras === 0 && i.cont.tablas === 0, 'Flashcards b03: só o lançador do bloco (19 tarjetas), sem perguntas/infografias/tablas', i.cont);
    const lau = await page.evaluate(() => ({ launch: !!document.querySelector('#s2-b03 .rmfc-launch') && getComputedStyle(document.querySelector('#s2-b03 .rmfc-launch')).display !== 'none' }));
    ok(lau.launch, 'launcher de flashcards do bloco acessível no modo');
    const depois = await nos(page);
    ok(JSON.stringify(depois) === JSON.stringify(antes), 'nenhum flashcard/ID duplicado ou criado pelo modo', { antes, depois });
    /* sem recurso = sem acesso */
    ok((await page.evaluate(() => [...document.querySelectorAll('#rm-l2-side a.rm-l2-block-link')].length)) > 0, 'árvore da lateral presente');
    const chips = await page.evaluate(() => [...document.querySelectorAll('#rm-l2-side .t-ab')].map(c => (c.closest('.rm-l2-block') || {}).dataset && c.closest('.rm-l2-block').dataset.block));
    ok(chips.join() === 's2-b01,s2-b03,s2-b04,s2-b05', `chip «Audiolibro» na árvore só nos 4 blocos com card real (${chips})`, chips);
    ok(errs.length === 0, '0 erros JS', errs);
    await ctx.close();
  }
  { /* sem manifesto: nenhum modo/atalho/chip de audiolibro */
    const { ctx, page, errs } = await A({ manifesto: false }); const i = await info(page);
    const r = await page.evaluate(() => ({ cards: document.querySelectorAll('.rm-audio-card').length, chip: document.querySelectorAll('.t-ab').length, capa: document.querySelectorAll('.rm-l2-rescard--ab').length, pill: document.querySelectorAll('[data-rm-k="ab"]').length }));
    ok(!i.lateral.includes('Audiolibros') && r.cards === 0 && r.chip === 0 && r.capa === 0 && r.pill === 0, 'sem card real (manifesto vazio/negado): nenhum «Audiolibros» (lateral, capa, pílula, chip)', { lat: i.lateral, r });
    await go(page, { view: 'modeidx', mode: 'audiobooks' }); const j = await info(page);
    ok(j.nav === 'index' || !j.mode, 'link direto a #modo/audiobooks sem card cai no índice geral (sem página vazia)', { nav: j.nav, mode: j.mode });
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }
  { /* manifesto tardio: modo e chips aparecem quando os cards chegam */
    const { ctx, page, errs } = await A({ atrasoManifesto: 6000, manifesto: true });
    const a = await page.evaluate(() => ({ lat: [...document.querySelectorAll('#rm-l2-side .rm-l2-item')].map(x => x.textContent.trim()), cards: document.querySelectorAll('.rm-audio-card').length }));
    ok(a.cards === 0 && !a.lat.includes('Audiolibros'), 'antes do manifesto chegar: sem card, sem modo Audiolibros', a);
    await page.waitForFunction(() => document.querySelectorAll('.rm-audio-card').length > 0, null, { timeout: 20000 }); await page.waitForTimeout(900);
    const b = await page.evaluate(() => ({ lat: [...document.querySelectorAll('#rm-l2-side .rm-l2-item')].map(x => x.textContent.trim()), chips: document.querySelectorAll('#rm-l2-side .t-ab').length, capa: document.querySelectorAll('.rm-l2-rescard--ab').length, pill: document.querySelectorAll('[data-rm-k="ab"]').length }));
    ok(b.lat.includes('Audiolibros') && b.chips === 4 && b.capa === 1 && b.pill === 1, 'quando os cards chegam (assíncrono) o modo, a capa, a pílula e os 4 chips aparecem', b);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* =============================== E · caneta =============================== */
  sec('E · caneta: traço persiste ao trocar de bloco/modo; ferramenta segue armada; nada vaza para blocos ocultos');
  {
    const { ctx, page, errs } = await A();
    await go(page, { view: 'block', block: 's2-b04' }, 1700);
    const w1 = await page.evaluate(async () => {
      const esp = ms => new Promise(o => setTimeout(o, ms)); const r = {};
      const alvo = [...document.getElementById('s2-b04').querySelectorAll('p')].filter(p => !p.closest('[data-rm-ui]') && p.textContent.length > 150)[2];
      window.RMLayout.irPara(alvo); await esp(1500);
      window.RMToolsV2.escolherFerramenta('pen'); await esp(300); r.tool = window.RMToolsV2.estado && window.RMToolsV2.estado.tool;
      const b = alvo.getBoundingClientRect();
      const fire = (ty, x, y, bt) => alvo.dispatchEvent(new PointerEvent(ty, { pointerType: 'pen', pointerId: 9, isPrimary: true, clientX: x, clientY: y, buttons: bt, bubbles: true, cancelable: true, pressure: bt ? 0.5 : 0 }));
      fire('pointerover', b.left + 40, b.top + 14, 0); fire('pointerdown', b.left + 40, b.top + 14, 1);
      for (let i = 1; i <= 18; i++) { fire('pointermove', b.left + 40 + i * 8, b.top + 14 + (i % 4) * 3, 1); await esp(14); }
      fire('pointerup', b.left + 190, b.top + 20, 0); await esp(900);
      const svgs = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')];
      r.n = svgs.length; r.paths = svgs.reduce((a, s) => a + s.querySelectorAll('path').length, 0); r.anchor = svgs[0] && svgs[0].getAttribute('data-anchor');
      r.writes = (window.__writes || []).filter(w => /user_ink_strokes/.test(w)).join(',');
      return r;
    });
    ok(w1.tool === 'pen' && w1.paths >= 1 && /^s2-b04>/.test(w1.anchor || ''), `traço desenhado no bloco 04 (âncora ${w1.anchor}, ${w1.paths} path)`, w1);
    ok(/insert:user_ink_strokes/.test(w1.writes), 'persistência feita pelo motor da V2 (insert user_ink_strokes) — a navegação não grava nada', w1.writes);
    const wr0 = w1.writes;
    const vis = () => page.evaluate(() => [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].map(s => ({ a: s.getAttribute('data-anchor'), d: getComputedStyle(s).display, w: s.getBoundingClientRect().width > 0, p: s.querySelectorAll('path').length })));
    await go(page, { view: 'block', block: 's2-b03' }, 1400);
    let v = await vis(); let tool = await page.evaluate(() => window.RMToolsV2.estado && window.RMToolsV2.estado.tool);
    ok(v.filter(s => /^s2-b04/.test(s.a)).every(s => s.d === 'none' || !s.w), 'bloco 03 aberto: o traço do bloco 04 oculto fica escondido (nada flutuando)', v);
    ok(tool === 'pen', 'a caneta continua armada depois de trocar de bloco', tool);
    await go(page, { view: 'block', block: 's2-b04' }, 1600); v = await vis();
    ok(v.filter(s => /^s2-b04/.test(s.a)).length >= 1 && v.filter(s => /^s2-b04/.test(s.a)).every(s => s.d !== 'none' && s.w && s.p >= 1), 'volta ao bloco 04: o MESMO traço reaparece ancorado (sem novo insert)', v);
    const wr1 = await page.evaluate(() => (window.__writes || []).filter(w => /user_ink_strokes/.test(w)).join(','));
    ok(wr1 === wr0, 'trocar de bloco não gravou nada (0 escritas novas)', { wr0, wr1 });
    /* ---- REGRESSÃO (atualizarTinta): índice geral → índice de Preguntas → Preguntas do bloco 03 → volta ao bloco 04, com o MESMO traço feito pela caneta real.
       Estrito: em CADA tela intermediária nenhum SVG de traço pode estar com display ≠ none (computado), nem ter caixa, nem pintar um único pixel; na volta o traço
       reaparece na âncora certa (retângulo do parágrafo âncora) com os mesmos paths; e a navegação não faz NENHUMA escrita nem requisição de escrita. ---- */
    {
      const reqsEsc = []; const onReq = (r) => { if (!/^(GET|HEAD|OPTIONS)$/.test(r.method())) reqsEsc.push(r.method() + ' ' + r.url().slice(0, 80)); }; page.on('request', onReq);
      const escritas = () => page.evaluate(() => (window.__writes || []).slice());
      const todasAntes = await escritas();
      const ancora = await page.evaluate(() => { const sv = document.querySelector('#rm2-ink svg[data-anchor^="s2-b04>"]'); return { a: sv.getAttribute('data-anchor'), d: [...sv.querySelectorAll('path')].map(x => x.getAttribute('d')).join('|') }; });
      const estado = () => page.evaluate(() => {
        const root = document.getElementById('rm2-ink');
        return { nav: document.documentElement.getAttribute('data-rm-nav'), rootDisp: root ? getComputedStyle(root).display : null,
          svgs: [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].map(sv => { const c = getComputedStyle(sv), r = sv.getBoundingClientRect(); return { a: sv.getAttribute('data-anchor'), disp: c.display, vis: c.visibility, caixa: Math.round(r.width) * Math.round(r.height) }; }) };
      });
      /* o traço NÃO pinta nada: captura normal × captura com #rm2-ink escondido têm os mesmos pixels */
      const semPintura = async () => {
        const a = await page.screenshot(); await page.evaluate(() => { document.getElementById('rm2-ink').style.setProperty('display', 'none', 'important'); });
        const b = await page.screenshot(); await page.evaluate(() => { document.getElementById('rm2-ink').style.removeProperty('display'); });
        const a2 = await page.screenshot(); return Buffer.compare(a, b) === 0 || Buffer.compare(a2, b) === 0;
      };
      const etapas = [['índice geral', { view: 'index' }], ['índice de Preguntas', { view: 'modeidx', mode: 'preguntas' }], ['Preguntas do bloco 03', { view: 'modeblk', mode: 'preguntas', block: 's2-b03' }]];
      for (const [nome, spec] of etapas) {
        await go(page, spec, 1500); const e = await estado();
        const vazamento = e.svgs.filter(x => x.disp !== 'none' || x.caixa > 0);
        ok(e.svgs.length >= 1 && vazamento.length === 0, `${nome}: nenhum traço flutua (getComputedStyle: todos display:none e sem caixa)`, { nav: e.nav, rootDisp: e.rootDisp, vazamento });
        ok(await semPintura(), `${nome}: visualmente nada de traço (a captura é idêntica com #rm2-ink escondido)`);
        await page.screenshot({ path: path.join(OUT_EVID, 'tinta-' + (etapas.findIndex(x => x[0] === nome) + 1) + '-' + nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png') });
      }
      await go(page, { view: 'block', block: 's2-b04' }, 1700);
      const volta = await page.evaluate(async (anc) => {
        const [sid, ix] = anc.a.split('>'); const lista = [...document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(n => !n.closest('[data-rm-ui]')); const par = lista[+ix];
        window.RMLayout.irPara(par); await new Promise(o => setTimeout(o, 1600));
        const sv = document.querySelector(`#rm2-ink svg[data-anchor="${anc.a}"]`), c = getComputedStyle(sv), r = sv.getBoundingClientRect(), pr = par.getBoundingClientRect();
        return { n: document.querySelectorAll('#rm2-ink svg[data-anchor]').length, disp: c.display, vis: c.visibility, dx: Math.abs(r.left - pr.left), dy: Math.abs(r.top - pr.top), dw: Math.abs(r.width - pr.width), dh: Math.abs(r.height - pr.height),
          d: [...sv.querySelectorAll('path')].map(x => x.getAttribute('d')).join('|') };
      }, ancora);
      ok(volta.n === 1 && volta.disp !== 'none' && volta.vis === 'visible', 'volta ao bloco 04: o traço reaparece (1 SVG, visível)', volta);
      ok(volta.dx <= 4 && volta.dy <= 4 && volta.dw <= 4 && volta.dh <= 4, `…na âncora correta ${ancora.a}: o SVG coincide com o parágrafo âncora (Δx ${volta.dx.toFixed(1)} · Δy ${volta.dy.toFixed(1)} · Δw ${volta.dw.toFixed(1)} · Δh ${volta.dh.toFixed(1)} px)`, volta);
      ok(volta.d === ancora.d && volta.d.length > 10, '…e é o MESMO traço (mesmos paths, não um novo)');
      const todasDepois = await escritas(); page.off('request', onReq);
      ok(JSON.stringify(todasDepois) === JSON.stringify(todasAntes), `a navegação não grava nada no banco (${todasAntes.length} escritas antes = ${todasDepois.length} depois)`, { todasAntes, todasDepois });
      ok(reqsEsc.length === 0, 'nenhuma requisição de escrita (POST/PATCH/PUT/DELETE) durante a navegação', reqsEsc);
      await page.screenshot({ path: path.join(OUT_EVID, 'tinta-bloque-04-volta.png') });
    }
    /* modo (preguntas) e volta */
    await go(page, { view: 'modeblk', mode: 'preguntas', block: 's2-b03' }, 1300);
    ok((await vis()).every(s => s.d === 'none' || !s.w), 'em modo isolado (blocos 03/preguntas) o traço do 04 não aparece');
    await go(page, { view: 'block', block: 's2-b04' }, 1600);
    ok((await vis()).filter(s => s.w && s.d !== 'none').length >= 1, 'de volta ao bloco 04 o traço está lá');
    /* escrever DEPOIS de trocar de bloco: âncora certa */
    await go(page, { view: 'block', block: 's2-b03' }, 1500);
    const tm = await page.evaluate(() => window.RMToolsV2.estado && window.RMToolsV2.estado.tool);
    ok(tm === 'none', 'entrar num modo isolado desarma a ferramenta (comportamento já existente do V2: modos são para estudar/responder); os traços ficam guardados', tm);
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await page.waitForTimeout(300);
    const w2 = await page.evaluate(async () => {
      const esp = ms => new Promise(o => setTimeout(o, ms)); const r = {};
      const alvo = [...document.getElementById('s2-b03').querySelectorAll('p')].filter(p => !p.closest('[data-rm-ui]') && p.textContent.length > 150)[1];
      window.RMLayout.irPara(alvo); await esp(1500);
      const b = alvo.getBoundingClientRect();
      const fire = (ty, x, y, bt) => alvo.dispatchEvent(new PointerEvent(ty, { pointerType: 'pen', pointerId: 9, isPrimary: true, clientX: x, clientY: y, buttons: bt, bubbles: true, cancelable: true, pressure: bt ? 0.5 : 0 }));
      fire('pointerover', b.left + 40, b.top + 14, 0); fire('pointerdown', b.left + 40, b.top + 14, 1);
      for (let i = 1; i <= 14; i++) { fire('pointermove', b.left + 40 + i * 8, b.top + 14 + (i % 3) * 3, 1); await esp(14); }
      fire('pointerup', b.left + 160, b.top + 20, 0); await esp(900);
      const svg = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].filter(s => /^s2-b03>/.test(s.getAttribute('data-anchor')));
      r.n = svg.length; r.p = svg.reduce((a, s) => a + s.querySelectorAll('path').length, 0); r.anchor = svg[0] && svg[0].getAttribute('data-anchor');
      const [sid, ix] = (r.anchor || '>').split('>'); const lista = [...document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(x => !x.closest('[data-rm-ui]')); r.ancora = lista[+ix] === alvo;
      window.RMToolsV2.escolherFerramenta('none'); return r;
    });
    ok(w2.p >= 1 && w2.ancora === true, `escrever no bloco 03 depois da troca: traço ancorado ao parágrafo escrito (${w2.anchor})`, w2);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* =============================== F · áudio =============================== */
  sec('F · áudio: o mesmo motor segue tocando ao navegar; um por vez; sair da matéria/logout para');
  {
    const { ctx, page, errs } = await A();
    await go(page, { view: 'block', block: 's2-b01' }, 1300);
    await L.tocar(page, 's2-b01-motivo');
    const p0 = (await L.motor(page)).position;
    const seq = [{ view: 'block', block: 's2-b03' }, { view: 'index' }, { view: 'modeidx', mode: 'preguntas' }, { view: 'modeblk', mode: 'preguntas', block: 's2-b03' }, { view: 'modeblk', mode: 'audiobooks', block: 's2-b04' }, { view: 'block', block: 's2-b05' }];
    let tudo = true, ult = p0;
    for (const s of seq) {
      await go(page, s, 900); const m = await L.motor(page);
      const so = await page.evaluate(() => ({ tocando: (window.__media || []).filter(x => !x.paused).length, aud: document.querySelectorAll('.rm-audio').length, slot: document.querySelectorAll('#rm-l2-player').length }));
      if (!(m && m.state === 'playing' && m.position > ult - 0.2 && so.tocando === 1 && so.aud === 1 && so.slot === 1)) { tudo = false; ok(false, 'áudio ao ir para ' + JSON.stringify(s), { m, so, ult }); }
      ult = m ? m.position : ult;
    }
    ok(tudo && ult > p0 + 3, `o audiolibro segue tocando (posição ${p0.toFixed(1)}s → ${ult.toFixed(1)}s) em 6 trocas de bloco/modo/índice, 1 player, 1 mídia ativa`);
    /* um áudio por vez: tocar a ausculta pausa o audiobook */
    await go(page, { view: 'modeblk', mode: 'auscultacion', block: 's2-b01' }, 1200);
    const aus = await page.evaluate(() => { const a = document.querySelector('#s2-b01 .audio-player audio') || document.querySelector('#s2-b01 audio'); return !!a; });
    if (aus) { await page.evaluate(() => { const a = document.querySelector('#s2-b01 .audio-player audio') || document.querySelector('#s2-b01 audio'); a.play().catch(() => {}); }); await page.waitForTimeout(900); }
    const arb = await page.evaluate(() => ({ tocando: (window.__media || []).filter(x => !x.paused).length, st: window.RMAudioBoot._estado().motor && window.RMAudioBoot._estado().motor.state }));
    ok(arb.tocando <= 1, `ausculta × audiobook: um áudio por vez (${arb.tocando} tocando; motor «${arb.st}»)`, arb);
    /* retomada */
    const cont = await page.evaluate(() => { const a = document.querySelector('.rm-audio'); return !!a; });
    ok(cont, 'player único segue montado');
    /* sair da matéria para (a auscultação é um <audio> da própria matéria, fora do motor — pausamos o teste dela antes, como o aluno faria) */
    await page.evaluate(() => document.querySelectorAll('#tab-semio2 audio').forEach(a => a.pause()));
    await page.evaluate(() => {
      window.RM_CATALOGO.push({ slug: 'outra', tab: 'outra', title: 'Otra', sub: '' });
      const t = document.createElement('div'); t.className = 'tab-content'; t.id = 'tab-outra'; t.innerHTML = '<section class="container" id="outra-b01"><h2>Otra materia</h2><p>Contenido.</p></section>'; document.getElementById('materias-container').appendChild(t);
      document.querySelectorAll('#materias-container > .tab-content').forEach(x => x.classList.remove('active')); t.classList.add('active'); window.RMPilot.avaliar();
    }); await page.waitForTimeout(1000);
    const out = await page.evaluate(() => { const H = document.documentElement; return { tocando: (window.__media || []).filter(x => !x.paused).length, aud: document.querySelectorAll('.rm-audio').length, nav: H.hasAttribute('data-rm-nav'), cls: H.className, off: document.querySelectorAll('[data-rm-off]').length, ui: document.querySelectorAll('.rm-nav-crumb,.rm-nav-pager').length, hid: [...document.querySelectorAll('#tab-semio2 > section[id]')].filter(s => getComputedStyle(s).display === 'none').length, ra: !!window.RMNav && window.RMNav.ativo(), sr: history.scrollRestoration, outra: getComputedStyle(document.getElementById('outra-b01')).display }; });
    ok(out.tocando === 0 && out.aud === 0, 'trocar de matéria PARA o áudio do audiolibro e destrói o player', out);
    ok(!out.nav && !/rm-nav|rm-sis/.test(out.cls) && out.off === 0 && out.ui === 0 && !out.ra && out.outra !== 'none', 'e desfaz a navegação: sem atributos, sem nós, a outra matéria aparece normal', out);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }
  {
    const { ctx, page, errs } = await A();
    await go(page, { view: 'block', block: 's2-b03' }, 1200); await L.tocar(page, 's2-b03-epoc');
    await page.evaluate(() => (window.__authCbs || []).slice().forEach(cb => cb('SIGNED_OUT'))); await page.waitForTimeout(900);
    const s = await page.evaluate(() => ({ tocando: (window.__media || []).filter(x => !x.paused).length, aud: document.querySelectorAll('.rm-audio').length, cards: document.querySelectorAll('.rm-audio-card').length, nav: document.documentElement.hasAttribute('data-rm-nav') }));
    ok(s.tocando === 0 && s.aud === 0 && s.cards === 0, 'logout (SIGNED_OUT) PARA o áudio, tira os cards do audiolibro', s);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* =============================== G · geometria =============================== */
  sec('G · geometria em 320 · 390 · 768 · 1024 · 1440 e zoom 200%: sem overflow, sem sobreposição, fim da página acima do player');
  const VIEWS = [[320, 640, 1, ''], [390, 844, 1, ''], [768, 1024, 1, ''], [1024, 768, 1, ''], [1440, 900, 1, ''], [720, 450, 2, 'zoom 200% (1440)'], [640, 360, 2, 'zoom 200% (1280)']];
  for (const [w, h, sc, rot] of VIEWS) {
    const tag = `${w}×${h}${rot ? ' ' + rot : ''}`;
    const { ctx, page, errs } = await A({ w, h, scale: sc, touch: w < 900 });
    const checa = async (nome) => { const i = await info(page); ok(i.sw <= i.vw + 1, `${tag} · ${nome}: sem overflow horizontal (${i.sw} ≤ ${i.vw})`, { sw: i.sw, vw: i.vw }); return i; };
    await checa('abertura');
    const ov = await page.evaluate(() => { const cs = [...document.querySelectorAll('.rm-sis-idx .rm-sis-card')].map(c => c.getBoundingClientRect()); let k = 0; for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) { const x = cs[a], y = cs[b]; if (x.left < y.right - 1 && y.left < x.right - 1 && x.top < y.bottom - 1 && y.top < x.bottom - 1) k++; } const hs = cs.map(r => Math.round(r.height)); return { k, n: cs.length, outH: Math.max.apply(null, hs) - Math.min.apply(null, hs), saida: cs.some(r => r.left < -1 || r.right > innerWidth + 1) }; });
    ok(ov.k === 0 && !ov.saida && ov.n === 14, `${tag} · grade: 14 cards sem sobreposição e dentro da tela`, ov);
    await go(page, { view: 'block', block: 's2-b03' }, 1300); await checa('bloco 03');
    await go(page, { view: 'modeblk', mode: 'preguntas', block: 's2-b03' }, 1000); await checa('preguntas b03');
    await go(page, { view: 'modeidx', mode: 'infografias' }, 800); await checa('índice de infografías');
    await go(page, { view: 'modeblk', mode: 'auscultacion', block: 's2-b01' }, 1000); await checa('ausculta b01');
    /* fim da página com o player aberto: pager e última linha acima do player */
    await go(page, { view: 'block', block: 's2-b03' }, 1300);
    await L.tocar(page, 's2-b03-epoc'); await page.waitForTimeout(600);
    await L.irAoFim(page); await page.waitForTimeout(500);
    const fim = await page.evaluate(() => {
      const pg = document.querySelector('.rm-nav-pager'), r = pg.getBoundingClientRect(), a = document.querySelector('#rm-l2-player .rm-audio'), ar = a && !a.hidden ? a.getBoundingClientRect() : null;
      const bar = ar && ar.top > innerHeight * 0.5 ? ar : null;     // só a barra INFERIOR cobre a leitura; o card do alto à direita ocupa outra região
      const sec = document.getElementById('s2-b03').getBoundingClientRect();
      const tl = ar && !bar ? { cobre: ar.left < sec.right - 1 && ar.right > sec.left + 1 && ar.top < r.bottom && ar.bottom > r.top } : null;
      return { pgBottom: Math.round(r.bottom), vh: innerHeight, barTop: bar ? Math.round(bar.top) : null, ph: parseFloat(document.documentElement.style.getPropertyValue('--rm-player-h')) || 0, tl, modo: a && a.getAttribute('data-mode') };
    });
    ok(fim.barTop === null || fim.pgBottom <= fim.barTop + 1, `${tag} · fim da página: o pager (última linha) fica acima da barra do player (pager ${fim.pgBottom} ≤ barra ${fim.barTop})`, fim);
    ok(fim.pgBottom <= fim.vh + 1, `${tag} · pager inteiro na tela no fim da página`, fim);
    ok(!fim.tl || !fim.tl.cobre, `${tag} · card do player (alto à direita) não cobre o pager`, fim);
    ok(errs.length === 0, `${tag} · 0 erros JS`, errs);
    await ctx.close();
  }

  /* =============================== H · detach limpo =============================== */
  sec('H · detach: sem classe, atributo, nó, estilo ou listener da navegação');
  {
    const { ctx, page, errs } = await A();
    await go(page, { view: 'block', block: 's2-b03' }, 1000);
    await page.evaluate(() => window.RMSistema.detach()); await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const H = document.documentElement; return { cls: H.className, atr: [...H.attributes].map(a => a.name).filter(a => /^data-rm-(nav|off)/.test(a)), off: document.querySelectorAll('[data-rm-off],[data-rm-nav-cur]').length, ui: document.querySelectorAll('.rm-nav-crumb,.rm-nav-pager,.rm-nav-modeidx,.rm-sis-idx,[data-rm-nav-ui]').length, estilo: !!document.getElementById('rm-nav-ink'), secs: [...document.querySelectorAll('#tab-semio2 > section[id]')].filter(s => getComputedStyle(s).display !== 'none').length, ativo: !!window.RMNav.ativo(), modes: window.RMModes.nav, sr: history.scrollRestoration }; });
    ok(!/rm-nav|rm-sis/.test(r.cls) && r.atr.length === 0 && r.off === 0 && r.ui === 0 && !r.estilo && !r.ativo && r.modes === false, 'sem classe/atributo/nó/estilo; RMModes volta ao V2 puro', r);
    ok(r.secs === 14, `as 14 seções visíveis de novo (leitura contínua) (${r.secs})`);
    ok(r.sr === 'auto', 'restauração de rolagem do navegador devolvida (auto)', r.sr);
    const n2 = await nos(page); n2.idl = await ids(page);
    ok(JSON.stringify(n2) === JSON.stringify(base0), 'conteúdo e IDs idênticos aos de origem');
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  await br.close(); srv.close();
  console.log(`\n${n - ko} verificações OK · ${ko} falhas`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
