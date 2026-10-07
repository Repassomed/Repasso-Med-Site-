/* QA do ÍNDICE CENTRAL EXPANSÍVEL (issue #460) · protótipo isolado.
   Semiología II REAL (HTML, app-core, rm-tools-v2, Layout V2, tema, navegação por bloco) no harness do ensaio (tools/qa/ensaio-layout) + o módulo novo
   (?ix=1). Supabase simulado, 0 rede externa, 0 escrita (a caneta é exercitada com traço sintético; as únicas escritas aceitas são user_ink_strokes simuladas).
   Cobre: derivação dos subtítulos, mouse, teclado, toque, 320/390/768/1024/1440, zoom 200% (viewport/2), muitos subtítulos, movimento reduzido,
   volta ao índice, links diretos, Back/Forward, lateral, modos isolados, integridade do conteúdo/âncoras, caneta, detach.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/indice-expansivel-460/qa.cjs [--rapido]       Saída: docs/indice-expansivel-460/qa-resultados.json */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('../ensaio-layout/lib.cjs');
const OUT = path.join(L.REPO, 'docs/indice-expansivel-460');
const RAPIDO = process.argv.includes('--rapido');
const LARG = [[320, 800], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
const ZOOM = [[720, 450, '200% de 1440'], [640, 400, '200% de 1280']];
const R = []; let secao = '';
const chk = (id, cond, msg, dados) => { R.push({ secao, id, ok: !!cond, msg, dados: cond ? undefined : dados }); if (!cond) console.log('    ✗', secao, '·', id, '·', msg, dados !== undefined ? JSON.stringify(dados).slice(0, 300) : ''); return !!cond; };
const S = (nome) => { secao = nome; console.log('\n▸ ' + nome); };

/* ---------- medidas no navegador ---------- */
const ESTADO = () => {
  const vis = e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0; };
  const tab = document.querySelector('#materias-container > .tab-content');
  const abertos = [...document.querySelectorAll('button.rm-ix-card[aria-expanded="true"]')].map(b => b.getAttribute('data-rm-go'));
  const P = document.querySelector('.rm-ix-panel'); const pr = P && P.getBoundingClientRect();
  return {
    nav: document.documentElement.getAttribute('data-rm-nav'), hash: location.hash, abertos, nPaineis: document.querySelectorAll('.rm-ix-panel').length,
    secs: [...tab.querySelectorAll(':scope > section[id]')].filter(vis).map(s => s.id),
    painel: P ? { h: Math.round(pr.height), w: Math.round(pr.width), top: Math.round(pr.top), left: Math.round(pr.left), right: Math.round(pr.right), aberto: P.classList.contains('is-open'), notch: P.style.getPropertyValue('--rm-ix-x') } : null,
    sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth, sy: Math.round(scrollY), hdr: (window.RMLayout && window.RMLayout.hdrH && window.RMLayout.hdrH()) || 52,
    foco: document.activeElement && document.activeElement !== document.body ? (document.activeElement.className || document.activeElement.tagName) : null
  };
};
const est = p => p.evaluate(ESTADO);
const cartaTop = (p, id) => p.evaluate(i => { const b = document.querySelector(`button.rm-ix-card[data-rm-go="${i}"]`); return b ? Math.round(b.getBoundingClientRect().top) : null; }, id);
const irIndice = async (p) => { await p.evaluate(() => window.RMNav.go({ view: 'index' })); await p.waitForTimeout(500); };
const fechaTudo = async (p) => { await p.evaluate(() => { const b = document.querySelector('button.rm-ix-card[aria-expanded="true"]'); if (b) b.click(); }); await p.waitForTimeout(350); };
const clicaCarta = async (p, id, toque) => { const b = await p.$(`button.rm-ix-card[data-rm-go="${id}"]`); await b.scrollIntoViewIfNeeded(); if (toque) await b.tap(); else await b.click(); await p.waitForTimeout(450); };
const abre = async (W, H, opts = {}) => {
  const br = abre.br; const r = await L.abrir(br, abre.base, abre.m, Object.assign({ w: W, h: H, modo: 'nav', ix: true }, opts));
  return r;
};

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.servir(); abre.base = 'http://127.0.0.1:' + srv.address().port; abre.br = await chromium.launch();
  abre.m = L.reconciliar().ativas.find(x => x.slug === 'semiologia-ii');

  /* ================= 1 · estrutura e derivação dos subtítulos (1440) ================= */
  S('1 · derivação dos subtítulos a partir do HTML real');
  {
    const { ctx, page: p, errs } = await abre(1440, 900);
    const e0 = await p.evaluate(() => ({ ens: window.__ens, st: window.RMIndice && window.RMIndice.estado(), erros: window.__ens.erros }));
    chk('attach', e0.ens.etapas.attach_indice && e0.st && e0.st.cards === 10, '10 cards de bloco viram botões expansíveis (guía e revisão não)', e0);
    const nb = await p.evaluate(() => ({ anc: [...document.querySelectorAll('.rm-sis-idx a.rm-sis-card')].map(a => a.getAttribute('data-rm-go')), btn: [...document.querySelectorAll('.rm-sis-idx button.rm-ix-card')].map(a => a.getAttribute('data-rm-go')) }));
    chk('guia-repaso-diretos', nb.anc.sort().join() === 's2-banco,s2-flashcards,s2-guia,s2-tablas' && nb.btn.length === 10, 'guía, tablas, banco e flashcards seguem como links diretos (nenhum subtítulo inventado)', nb);
    const der = await p.evaluate(() => {
      const tab = document.querySelector('#materias-container > .tab-content'); const out = [];
      const SUB_FORA = /organizaci[óo]n\s*[—·\-]\s*c[óo]mo|c[óo]mo lo eval[úu]a la c[áa]tedra|^c[óo]mo estudiar|^resumen explicado|^desde cero$/i;
      document.querySelectorAll('button.rm-ix-card').forEach(b => {
        const id = b.getAttribute('data-rm-go'), sec = document.getElementById(id), g = window.RMIndice.subtitulos(sec);
        const els = [];
        g.forEach(x => { els.push(x.el); x.kids.forEach(k => els.push(k.el)); });
        const ordem = els.every((e, i) => i === 0 || (els[i - 1].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING));
        const ruins = els.filter(e => e.parentElement !== sec || e.closest('[data-rm-ui],.quiz-item,.quiz-section,.flashcard,.rm-postit,.rmc-postit,details,table,figure,.rm-audio-card,.rm-detalle,.rmc-detalle')).length;
        const ruidos = g.flatMap(x => [x.txt, ...x.kids.map(k => k.txt)]).filter(t => /^(preguntas?\b|cuestionario\b|banco\b|flashcards?\b|mazo\b|tarjetas\b|ruleta\b)/i.test(t) || SUB_FORA.test(t) || /organizaci[óo]n/i.test(t));
        const OPER = /^(preguntas?\b|cuestionario\b|banco\b|flashcards?\b|mazo\b|tarjetas\b|ruleta\b)/i; const lim = x => x.replace(/\s+/g, ' ').replace(/[\u203C-\u3299\uD83C\uD83D\uD83E][\uDC00-\uDFFF]?|[\u2190-\u21FF\u2300-\u27BF\uFE0F\u20E3]/g, '').trim();
        const h3Esperados = [...sec.children].filter(h => h.tagName === 'H3' && /(^| )rm-h3( |$)/.test(h.className) && !/rm-h3-fc/.test(h.className) && !OPER.test(lim(h.textContent)) && !SUB_FORA.test(lim(h.textContent))).map(h => h.id).filter(Boolean);
        const lateral = [...document.querySelectorAll(`#rm-l2-side .rm-l2-block[data-block="${id}"] a[data-target]`)].map(a => a.getAttribute('data-target')).filter(t => t !== id && !/-s\d+$/.test('') && document.getElementById(t) && document.getElementById(t).tagName === 'H3' && !/rm-h3-fc/.test(document.getElementById(t).className) && !OPER.test(lim(document.getElementById(t).textContent)));
        const h3Mod = g.filter(x => !x.h4).map(x => x.id).filter(Boolean);
        out.push({ id, h3: g.length, h4: g.reduce((a, x) => a + x.kids.length, 0), ordem, ruins, ruidos, completo: JSON.stringify(h3Mod) === JSON.stringify(h3Esperados), paridadeLateral: JSON.stringify(h3Mod) === JSON.stringify(lateral), titulos: g.map(x => (x.icon || x.num) + ' ' + x.txt) });
      });
      return out;
    });
    chk('ordem', der.every(d => d.ordem), 'subtítulos na ordem do conteúdo, em todos os blocos', der.filter(d => !d.ordem).map(d => d.id));
    chk('so-estrutura', der.every(d => d.ruins === 0), 'só H3/H4 filhos diretos da seção (nada dentro de post-it, cartão, detalhe, quiz, tabela, figura, UI)', der.filter(d => d.ruins));
    chk('sem-ruido', der.every(d => d.ruidos.length === 0), 'nenhum cabeçalho de pergunta/flashcard/«Organización»/«Resumen explicado»', der.filter(d => d.ruidos.length));
    chk('completo', der.every(d => d.completo), 'todos os H3 de conteúdo que o app-core indexa aparecem (nenhum a menos, nenhum a mais)', der.filter(d => !d.completo));
    chk('paridade-lateral', der.every(d => d.paridadeLateral), 'os H3 do índice central = os H3 de conteúdo da árvore lateral (mesma fonte, sem lista manual)', der.filter(d => !d.paridadeLateral).map(d => ({ id: d.id })));
    chk('h4-hierarquia', der.some(d => d.h4 > 0), 'H4 de conteúdo entram como filhos do H3 anterior', der.map(d => d.id + ':' + d.h4));
    fs.writeFileSync(path.join(OUT, 'subtitulos-derivados.json'), JSON.stringify(der.map(d => ({ bloco: d.id, h3: d.h3, h4: d.h4, titulos: d.titulos })), null, 1));
    chk('sem-erros-js', errs.length === 0 && e0.erros.length === 0, '0 erros de JavaScript', { errs, erros: e0.erros });
    await ctx.close();
  }

  /* ================= 2 · fluxo completo com mouse (1440) ================= */
  S('2 · mouse: expandir, trocar, recolher, escolher subtítulo, Back/Forward');
  {
    const { ctx, page: p, errs } = await abre(1440, 900);
    await p.evaluate(() => document.querySelector('button.rm-ix-card[data-rm-go="s2-b03"]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
    const t0 = await cartaTop(p, 's2-b03');
    let e = await est(p);
    chk('inicio-indice', e.nav === 'index' && e.abertos.length === 0 && e.secs.length === 0, 'abre no índice geral, nada expandido, nenhum bloco visível', e);
    await p.click('button.rm-ix-card[data-rm-go="s2-b03"]'); await p.waitForTimeout(450); e = await est(p);
    chk('expande-sem-navegar', e.abertos.join() === 's2-b03' && e.nav === 'index' && e.secs.length === 0 && e.hash === '' && e.painel && e.painel.aberto && e.painel.h > 80, 'clicar no card EXPANDE ali mesmo: não abre o bloco, não troca a URL', e);
    const aria = await p.evaluate(() => { const b = document.querySelector('button.rm-ix-card[aria-expanded="true"]'); const P = document.getElementById(b.getAttribute('aria-controls')); return { ctrl: !!P, region: P && P.getAttribute('role'), ui: P && P.hasAttribute('data-rm-ui') }; });
    chk('aria', aria.ctrl && aria.region === 'region' && aria.ui, 'aria-expanded + aria-controls apontam para o painel (role=region, data-rm-ui)', aria);
    const comando = await p.evaluate(() => { const g = document.querySelector('.rm-ix-start'), s = [...document.querySelectorAll('.rm-ix-sub')]; return { txt: g.textContent.trim(), n: s.length, tit: s.map(x => x.querySelector('.rm-ix-tt').textContent) }; });
    chk('comando-e-minicards', /Empezar por el inicio del bloque/.test(comando.txt) && comando.n === 2, '«Empezar por el inicio del bloque» + minicards dos 2 subtítulos reais (Asma · EPOC)', comando);
    const t1 = await cartaTop(p, 's2-b03');
    const rev = await p.evaluate(() => { const P = document.querySelector('.rm-ix-panel').getBoundingClientRect(); return { pb: Math.round(P.bottom), vh: innerHeight }; });
    chk('card-visivel-e-painel-revelado', t1 >= e.hdr - 2 && (t1 - t0 <= 2) && (rev.pb <= rev.vh + 2 || t1 <= e.hdr + 30), `ao expandir, a página só rola o necessário (suave) para revelar o painel e o card acionado segue na tela (Δ=${t1 - t0}px, card top=${t1}, painel até ${rev.pb}/${rev.vh})`, { t0, t1, rev, hdr: e.hdr });
    await clicaCarta(p, 's2-b04'); e = await est(p);
    chk('um-por-vez', e.abertos.join() === 's2-b04' && e.nPaineis === 1, 'abrir outro card fecha o anterior (um expandido por vez, um painel no DOM)', e);
    await clicaCarta(p, 's2-b04'); await p.waitForTimeout(250); e = await est(p);
    chk('recolhe', e.abertos.length === 0 && e.nPaineis === 0, 'clicar de novo recolhe e remove o painel', e);
    /* escolher um subtítulo */
    await clicaCarta(p, 's2-b03');
    const sub = await p.$('.rm-ix-sub'); const alvoId = await p.evaluate(() => window.RMIndice.subtitulos(document.getElementById('s2-b03'))[0].id);
    await sub.click(); await p.waitForTimeout(1400); e = await est(p);
    const alvo = await p.evaluate(id => { const h = document.getElementById(id), r = h.getBoundingClientRect(); return { top: Math.round(r.top), vh: innerHeight, vis: getComputedStyle(h).display !== 'none' }; }, alvoId);
    chk('subtitulo-abre-so-o-bloco', e.nav === 'block' && e.secs.join() === 's2-b03' && e.hash === '#' + alvoId, 'subtítulo abre SÓ o bloco 03 e a URL é a âncora do subtítulo', { nav: e.nav, secs: e.secs, hash: e.hash });
    chk('subtitulo-posiciona', alvo.vis && alvo.top > e.hdr - 4 && alvo.top < alvo.vh * 0.6, `a leitura chega ao título escolhido (top=${alvo.top}px)`, alvo);
    await p.goBack(); await p.waitForTimeout(900); e = await est(p);
    chk('back-volta-ao-indice-aberto', e.nav === 'index' && e.secs.length === 0 && e.abertos.join() === 's2-b03', 'Back volta ao índice geral com o mesmo card ainda expandido', e);
    await p.goForward(); await p.waitForTimeout(900); e = await est(p);
    chk('forward', e.nav === 'block' && e.secs.join() === 's2-b03', 'Forward reabre o bloco', e);
    /* começar pelo início */
    await irIndice(p); await p.waitForTimeout(300);
    e = await est(p);
    await p.click('.rm-ix-start'); await p.waitForTimeout(1200); e = await est(p);
    const topo = await p.evaluate(() => Math.round(document.getElementById('s2-b03').getBoundingClientRect().top));
    chk('comecar-pelo-inicio', e.nav === 'block' && e.secs.join() === 's2-b03' && e.hash === '#s2-b03' && topo > e.hdr - 4 && topo < 260, 'o comando abre o bloco 03 pelo início (topo da seção na leitura)', { nav: e.nav, secs: e.secs, hash: e.hash, topo });
    /* filhos H4 */
    await irIndice(p); await p.waitForTimeout(300);
    const mais = await p.$('.rm-ix-more'); await mais.scrollIntoViewIfNeeded(); await mais.click();
    const kidTxt = await p.evaluate(() => { const ks = [...document.querySelectorAll('.rm-ix-kids > li:not([hidden]) .rm-ix-kid')]; return { n: ks.length, exp: document.querySelector('.rm-ix-more').getAttribute('aria-expanded'), ultimo: ks[ks.length - 1].textContent }; });
    chk('h4-ver-mais', kidTxt.exp === 'true' && kidTxt.n > 4, '«Ver los N temas» expande os H4 restantes (aria-expanded)', kidTxt);
    await p.evaluate(() => [...document.querySelectorAll('.rm-ix-kids > li:not([hidden]) .rm-ix-kid')].pop().click()); await p.waitForTimeout(1400);
    e = await est(p);
    chk('h4-abre-so-o-bloco', e.nav === 'block' && e.secs.join() === 's2-b03', 'um H4 (sem id) também abre só o bloco e leva à posição do título', e);
    chk('sem-erros-js', errs.length === 0, '0 erros de JavaScript', errs);
    await ctx.close();
  }

  /* ================= 3 · teclado ================= */
  S('3 · teclado: Enter, Espaço, Tab, Esc, foco');
  {
    const { ctx, page: p, errs } = await abre(1440, 900);
    await p.evaluate(() => document.querySelector('.rm-sis-idx').scrollIntoView());
    await p.focus('button.rm-ix-card[data-rm-go="s2-b02"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    let e = await est(p);
    chk('enter-expande', e.abertos.join() === 's2-b02' && /rm-ix-start/.test(e.foco || ''), 'Enter expande e leva o foco ao comando «Empezar…»', e);
    await p.keyboard.press('Tab'); await p.waitForTimeout(100);
    const f2 = await p.evaluate(() => document.activeElement.className);
    chk('tab-vai-ao-primeiro-subtitulo', /rm-ix-sub/.test(f2), 'Tab segue para o primeiro minicard (ordem do painel)', f2);
    await p.keyboard.press('Escape'); await p.waitForTimeout(350); e = await est(p);
    chk('esc-fecha-e-devolve-foco', e.abertos.length === 0 && /rm-ix-card/.test(e.foco || ''), 'Esc recolhe e devolve o foco ao card', e);
    await p.keyboard.press('Space'); await p.waitForTimeout(500); e = await est(p);
    chk('espaco-expande', e.abertos.join() === 's2-b02', 'Espaço também expande', e);
    await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(1300); e = await est(p);
    chk('enter-no-subtitulo', e.nav === 'block' && e.secs.join() === 's2-b02', 'Enter num minicard abre só o bloco do subtítulo', e);
    chk('foco-visivel', !(await p.evaluate(() => { const a = document.activeElement; return !!(a && (a.closest('[data-rm-off]') || (a.offsetParent === null && getComputedStyle(a).position !== 'fixed'))); })), 'o foco depois de navegar não fica em conteúdo oculto');
    await irIndice(p); await p.evaluate(() => document.querySelector('.rm-sis-idx').scrollIntoView());
    await p.focus('button.rm-ix-card[data-rm-go="s2-b01"]'); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
    const ring = await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { cls: a.className.slice(0, 40), fv: a.matches(':focus-visible'), style: cs.outlineStyle, w: parseFloat(cs.outlineWidth) }; });
    chk('foco-com-contorno', ring.fv && ring.style !== 'none' && ring.w >= 2, 'foco por teclado com contorno visível (≥ 2 px)', ring);
    chk('sem-erros-js', errs.length === 0, '0 erros de JavaScript', errs);
    await ctx.close();
  }

  /* ================= 4 · larguras, toque, geometria ================= */
  S('4 · 320/390/768/1024/1440 (+ toque em 1024) e zoom 200%: sem overflow, alvos ≥ 44 px, card visível, minicards alcançáveis');
  const larguras = LARG.map(([w, h]) => ({ w, h, rot: w + 'px', toque: w < 900 })).concat([{ w: 1024, h: 768, rot: '1024px (toque)', toque: true }]).concat(ZOOM.map(([w, h, r]) => ({ w, h, rot: 'zoom ' + r + ' (' + w + 'px)', toque: false })));
  for (const cfg of larguras) {
    const { ctx, page: p, errs } = await abre(cfg.w, cfg.h, { touch: cfg.toque });
    const tag = cfg.rot;
    await clicaCarta(p, 's2-b03', cfg.toque);
    let e = await est(p);
    chk(`${tag}·expande`, e.abertos.join() === 's2-b03' && e.nav === 'index' && e.painel && e.painel.aberto, `${tag}: ${cfg.toque ? 'toque' : 'clique'} expande sem abrir o bloco`, e);
    chk(`${tag}·sem-overflow`, e.sw <= e.vw + 1, `${tag}: sem rolagem horizontal com o painel aberto (${e.sw}/${e.vw})`, e);
    const g = await p.evaluate(() => {
      const P = document.querySelector('.rm-ix-panel'), grid = P.parentElement, gr = grid.getBoundingClientRect(), pr = P.getBoundingClientRect(), b = document.querySelector('button.rm-ix-card[aria-expanded="true"]'), br = b.getBoundingClientRect();
      const alvos = [...document.querySelectorAll('.rm-ix-start, .rm-ix-sub, .rm-ix-kid, .rm-ix-more')].filter(x => x.offsetParent !== null).map(x => { const r = x.getBoundingClientRect(); return { c: x.className, h: Math.round(r.height), w: Math.round(r.width) }; });
      const notch = parseFloat(P.style.getPropertyValue('--rm-ix-x'));
      const cols = getComputedStyle(P.querySelector('.rm-ix-list')).gridTemplateColumns.split(' ').length;
      return { dentro: pr.left >= gr.left - 1 && pr.right <= gr.right + 1, notchOk: notch >= 18 && notch <= pr.width - 18, cardTop: Math.round(br.top), cardBottom: Math.round(br.bottom), vh: innerHeight, hdr: (window.RMLayout.hdrH && window.RMLayout.hdrH()) || 52, minAlvo: Math.min(...alvos.map(a => a.h)), alvosPequenos: alvos.filter(a => a.h < 44), cols, cardH: Math.round(br.height) };
    });
    chk(`${tag}·painel-dentro-da-grade`, g.dentro && g.notchOk, `${tag}: o painel cabe na largura da grade e a aba (${g.notchOk}) fica sobre o card`, g);
    chk(`${tag}·alvos-44`, g.alvosPequenos.length === 0 && g.cardH >= 44, `${tag}: card e todos os comandos/minicards ≥ 44 px (mín. ${g.minAlvo}px)`, g.alvosPequenos);
    chk(`${tag}·card-visivel`, g.cardTop >= g.hdr - 2 && g.cardBottom <= g.vh + 2, `${tag}: o card acionado continua inteiro na tela (top=${g.cardTop}, header=${g.hdr})`, g);
    chk(`${tag}·colunas`, cfg.w <= 640 ? g.cols === 1 : g.cols >= 1, `${tag}: minicards em ${g.cols} coluna(s)`, g);
    const hit = await p.evaluate(async () => {
      const bs = [...document.querySelectorAll('.rm-ix-start, .rm-ix-sub')]; const falhas = [];
      for (const b of bs) { b.scrollIntoView({ block: 'center' }); await new Promise(r => requestAnimationFrame(r)); const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!(el && b.contains(el))) falhas.push((b.textContent || '').trim().slice(0, 30) + ' ← ' + (el ? (el.id || el.className || el.tagName) : 'null')); }
      return falhas;
    });
    chk(`${tag}·alcancaveis`, hit.length === 0, `${tag}: nenhum comando/minicard coberto por barra, toolbox ou player`, hit);
    /* escolher subtítulo por toque/clique e voltar */
    const b2 = await p.$('.rm-ix-sub'); await b2.scrollIntoViewIfNeeded(); if (cfg.toque) await b2.tap(); else await b2.click(); await p.waitForTimeout(1400);
    e = await est(p);
    chk(`${tag}·subtitulo`, e.nav === 'block' && e.secs.join() === 's2-b03' && e.sw <= e.vw + 1, `${tag}: o subtítulo abre só o bloco 03, sem overflow`, e);
    await p.click('.rm-nav-idx'); await p.waitForTimeout(900); e = await est(p);
    chk(`${tag}·volta-ao-indice`, e.nav === 'index' && e.abertos.join() === 's2-b03' && e.sw <= e.vw + 1, `${tag}: «Volver al índice general» devolve ao índice com o card ainda expandido, sem overflow`, e);
    if (!RAPIDO || cfg.w === 390) {
      const ph = `${tag.replace(/[^a-z0-9]+/gi, '-')}`;
      await clicaCarta(p, 's2-b03', cfg.toque); /* fecha */ await p.waitForTimeout(300); await clicaCarta(p, 's2-b03', cfg.toque);
      await p.screenshot({ path: path.join(OUT, 'capturas', `depois-${ph}-expandido.png`) });
    }
    chk(`${tag}·sem-erros-js`, errs.length === 0, `${tag}: 0 erros de JavaScript`, errs);
    await ctx.close();
  }

  /* ================= 5 · movimento reduzido e animação normal ================= */
  S('5 · animação curta (~220 ms) e prefers-reduced-motion');
  for (const reduzido of [false, true]) {
    const br = abre.br; const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduzido ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await p.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'nav' }; }, ['semiologia-ii']);
    await p.goto(`${abre.base}/p.html?slug=semiologia-ii&tab=semio2&modo=nav&wait=1500&ix=1`, { timeout: 120000 }); await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(600);
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('.rm-sis-idx').scrollIntoView(); });
    const rot = reduzido ? 'movimento reduzido' : 'movimento normal';
    const dur = await p.evaluate(() => { document.querySelector('button.rm-ix-card[data-rm-go="s2-b02"]').click(); const P = document.querySelector('.rm-ix-panel'); return new Promise(r => setTimeout(() => { const cs = getComputedStyle(P); r({ open: P.classList.contains('is-open'), td: cs.transitionDuration, rows: cs.gridTemplateRows, op: cs.opacity }); }, 40)); });
    if (reduzido) chk('reduzido-instantaneo', dur.open && /^0s/.test(dur.td) && dur.op === '1', 'abertura instantânea: painel aberto em 40 ms, transição 0s', dur);
    else { chk('normal-curta', /0\.2[0-4]?s|0\.22s/.test(dur.td) || /0\.22s/.test(dur.td), 'transição de altura/opacidade ≈ 220 ms (180–240)', dur); await p.waitForTimeout(350); const fim = await p.evaluate(() => { const P = document.querySelector('.rm-ix-panel'); return { open: P.classList.contains('is-open'), op: getComputedStyle(P).opacity, h: Math.round(P.getBoundingClientRect().height) }; }); chk('normal-abre', fim.open && fim.op === '1' && fim.h > 80, 'termina aberta e opaca', fim); }
    /* trocar de card (fecha o de cima) sem salto: o card acionado fica parado */
    await p.evaluate(() => { document.querySelector('button.rm-ix-card[data-rm-go="s2-b01"]').click(); }); await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('button.rm-ix-card[data-rm-go="s2-b04"]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(150);
    const antes = await cartaTop(p, 's2-b04');
    await p.evaluate(() => document.querySelector('button.rm-ix-card[data-rm-go="s2-b04"]').click()); await p.waitForTimeout(reduzido ? 150 : 520);
    const depois = await cartaTop(p, 's2-b04'); const e = await est(p);
    chk(rot + '·sem-salto', Math.abs(depois - antes) <= 3 && e.abertos.join() === 's2-b04', `${rot}: trocar de card não move o card acionado (Δ=${depois - antes}px)`, { antes, depois, e });
    chk(rot + '·sem-erros', errs.length === 0, `${rot}: 0 erros de JavaScript`, errs);
    await ctx.close();
  }

  /* ================= 6 · muitos subtítulos ================= */
  S('6 · lista longa (30 H3 sintéticos + H4) no bloco 05: rolagem, desempenho, sem overflow');
  {
    const { ctx, page: p, errs } = await abre(390, 844, { touch: true });
    const prep = await p.evaluate(() => {
      const sec = document.getElementById('s2-b05'); const ref = sec.querySelector(':scope > h3.rm-h3:not(.rm-h3-quiz):not(.rm-h3-fc)');
      const ancora = [...sec.children].find(x => x.tagName === 'H3' && /rm-h3-quiz/.test(x.className)) || sec.lastElementChild;
      for (let i = 1; i <= 30; i++) {            // ENSAIO: só no DOM desta página de teste (o repositório não muda)
        const h = document.createElement('h3'); h.className = 'rm-h3'; h.id = 'teste-sintetico-' + i; h.textContent = i + ') Subtítulo sintético número ' + i + ' com título um pouco longo';
        sec.insertBefore(h, ancora);
        for (let j = 1; j <= 6; j++) { const h4 = document.createElement('h4'); h4.textContent = 'Tema ' + j + ' do subtítulo ' + i; sec.insertBefore(h4, ancora); }
      }
      window.RMIndice.detach(); const n = window.RMIndice.attach(document.querySelector('#materias-container > .tab-content'), 'semiologia-ii');
      return { n, total: window.RMIndice.subtitulos(sec).length };
    });
    chk('lista-longa-deriva', prep.total >= 32, 'derivou os 30 H3 sintéticos + os reais', prep);
    const t0 = Date.now(); await clicaCarta(p, 's2-b05', true); const dt = Date.now() - t0;
    const e = await est(p);
    chk('lista-longa-abre', e.abertos.join() === 's2-b05' && e.sw <= e.vw + 1, 'abre com 30+ minicards, sem overflow horizontal', e);
    chk('lista-longa-rapida', dt < 2500, `abre em ${dt} ms (inclui o toque e a espera de 450 ms)`, dt);
    const m = await p.evaluate(() => ({ mais: document.querySelectorAll('.rm-ix-more').length, ocultos: document.querySelectorAll('.rm-ix-kids > li[hidden]').length, subs: document.querySelectorAll('.rm-ix-sub').length, h: Math.round(document.querySelector('.rm-ix-panel').getBoundingClientRect().height) }));
    chk('lista-longa-h4-recolhidos', m.mais >= 30 && m.ocultos >= 60, 'cada H3 com > 4 H4 mostra só 4 e um «Ver los N temas» (sem poluir)', m);
    await p.screenshot({ path: path.join(OUT, 'capturas', 'depois-390px-lista-longa.png') });
    chk('sem-erros-js', errs.length === 0, '0 erros de JavaScript', errs);
    await ctx.close();
  }

  /* ================= 7 · lateral, modos isolados, links diretos, Back/Forward ================= */
  S('7 · preservação: lateral, modos isolados, links diretos, Back/Forward');
  {
    const { ctx, page: p, errs } = await abre(1440, 900);
    await clicaCarta(p, 's2-b03');
    await p.evaluate(() => [...document.querySelectorAll('#rm-l2-side a[data-target]')].find(a => a.dataset.target === 's2-b05').click()); await p.waitForTimeout(1400);
    let e = await est(p);
    chk('lateral-abre-bloco', e.nav === 'block' && e.secs.join() === 's2-b05', 'a lateral continua abrindo só o bloco', e);
    await p.evaluate(() => document.querySelector('#rm-l2-side .rm-l2-item[data-view="full"]').click()); await p.waitForTimeout(900); e = await est(p);
    chk('lateral-indice-geral', e.nav === 'index' && e.abertos.join() === 's2-b03', '«Índice general» da lateral volta ao índice (o painel segue aberto)', e);
    await p.evaluate(() => document.querySelector('#rm-l2-side .rm-l2-item[data-view="preguntas"]').click()); await p.waitForTimeout(900); e = await est(p);
    chk('modo-indice', e.nav === 'modeidx', 'o modo Preguntas abre o índice de blocos do modo', e);
    await p.evaluate(() => { const c = document.querySelector('.rm-nav-modeidx .rm-sis-card'); c.click(); }); await p.waitForTimeout(1000); e = await est(p);
    chk('modo-bloco', e.nav === 'modeblk' && e.secs.length === 1, 'o card do índice de modo abre modo+bloco (a navegação dos modos não foi afetada)', e);
    await irIndice(p);
    await p.evaluate(() => { location.hash = '#s2-b04'; }); await p.waitForTimeout(1200); e = await est(p);
    chk('hash-direto', e.secs.join() === 's2-b04', 'trocar o hash abre o bloco certo', e);
    await p.goBack(); await p.waitForTimeout(900); e = await est(p);
    chk('back-do-hash', e.nav === 'index', 'Back volta ao índice', e);
    await ctx.close();
    const r2 = await abre(1440, 900, { hash: '#s2-b03-s2' }); e = await est(r2.page);
    const subSt = await r2.page.evaluate(() => window.RMNav.estado());
    chk('link-direto-na-carga', e.secs.join() === 's2-b03' && subSt.sub === 's2-b03-s2', 'link direto de subtítulo na carga abre o bloco e registra o subtítulo (idêntico ao comportamento sem o módulo)', { e, subSt });
    await r2.ctx.close();
  }

  /* ================= 8 · integridade do conteúdo, âncoras e detach ================= */
  S('8 · conteúdo intacto: nenhum nó didático movido/duplicado/renomeado; detach devolve tudo');
  {
    const resumo = () => {
      const tab = document.querySelector('#materias-container > .tab-content'); const c = tab.cloneNode(true);
      c.querySelectorAll('[data-rm-ui]').forEach(n => n.remove());
      const ids = [...c.querySelectorAll('[id]')].map(e => e.id).sort();
      const ancoras = [...tab.querySelectorAll(':scope > section[id]')].map(s => s.id + ':' + [...s.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(n => !n.closest('[data-rm-ui]')).length);
      const h = (s) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x; };
      return { hash: h(c.innerHTML), ids: ids.length, idsHash: h(ids.join(',')), ancoras: ancoras.join('|'), quiz: tab.querySelectorAll('.quiz-item').length, fc: tab.querySelectorAll('.flashcard').length, anchorsCard: document.querySelectorAll('.rm-sis-idx a.rm-sis-card[data-rm-go]').length, uiCriada: document.querySelectorAll('[data-rm-ix]').length };
    };
    const base = await abre(1440, 900, { ix: false }); const b0 = await base.page.evaluate(resumo); await base.ctx.close();
    const { ctx, page: p } = await abre(1440, 900);
    const a0 = await p.evaluate(resumo);
    await clicaCarta(p, 's2-b03'); await clicaCarta(p, 's2-b04');
    const a1 = await p.evaluate(resumo);
    chk('conteudo-identico', a0.hash === b0.hash && a1.hash === b0.hash, 'HTML do conteúdo (sem os nós data-rm-ui) idêntico ao da página sem o módulo, fechado e aberto', { base: b0.hash, ix: a0.hash, aberto: a1.hash });
    chk('ids-e-ancoras', a1.idsHash === b0.idsHash && a1.ancoras === b0.ancoras, 'IDs e a contagem de âncoras de tinta (seção>índice) por bloco idênticos', { base: b0.ids, ix: a1.ids });
    chk('toda-ui-marcada', await p.evaluate(() => [...document.querySelectorAll('.rm-ix-panel, .rm-ix-panel *, button.rm-ix-card, .rm-ix-chev')].every(n => n.closest('[data-rm-ui]'))), 'toda UI criada está sob data-rm-ui');
    chk('quiz-fc-intactos', a1.quiz === b0.quiz && a1.fc === b0.fc, 'perguntas e flashcards: mesma contagem', { a1, b0 });
    await p.evaluate(() => window.RMIndice.detach()); await p.waitForTimeout(200);
    const a2 = await p.evaluate(resumo);
    chk('detach-devolve-tudo', a2.anchorsCard === 14 && a2.uiCriada === 0 && a2.hash === b0.hash, 'detach(): os 14 <a> originais voltam, 0 nós do módulo, conteúdo idêntico', a2);
    const re = await p.evaluate(() => { const n = window.RMIndice.attach(document.querySelector('#materias-container > .tab-content'), 'semiologia-ii'); return n; });
    chk('reattach', re === 10, 're-attach idempotente (10 cards)', re);
    await ctx.close();
  }

  /* ================= 9 · caneta (traço sintético) ================= */
  S('9 · caneta: traço sintético ancorado persiste ao usar o índice expansível; navegar não grava');
  {
    const { ctx, page: p, errs } = await abre(1440, 900);
    await p.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b04' })); await p.waitForTimeout(1500);
    const w1 = await p.evaluate(async () => {
      const esp = ms => new Promise(o => setTimeout(o, ms));
      const alvo = [...document.getElementById('s2-b04').querySelectorAll('p')].filter(x => !x.closest('[data-rm-ui],.quiz-item,.flashcard,table') && x.textContent.length > 120)[0];
      window.RMLayout.irPara(alvo); await esp(1300); window.RMToolsV2.escolherFerramenta('pen'); await esp(300);
      const b = alvo.getBoundingClientRect();
      const fire = (ty, x, y, bt) => alvo.dispatchEvent(new PointerEvent(ty, { pointerType: 'pen', pointerId: 9, isPrimary: true, clientX: x, clientY: y, buttons: bt, bubbles: true, cancelable: true, pressure: bt ? 0.5 : 0 }));
      fire('pointerover', b.left + 30, b.top + 14, 0); fire('pointerdown', b.left + 30, b.top + 14, 1);
      for (let k = 1; k <= 16; k++) { fire('pointermove', b.left + 30 + k * 7, b.top + 14 + (k % 4) * 3, 1); await esp(14); }
      fire('pointerup', b.left + 150, b.top + 20, 0); await esp(900);
      const sv = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')];
      window.RMToolsV2.escolherFerramenta('none');
      return { n: sv.length, anchor: sv[0] && sv[0].getAttribute('data-anchor'), d: sv.map(s => [...s.querySelectorAll('path')].map(x => x.getAttribute('d')).join('|')).join('#'), esc: (window.__writes || []).length };
    });
    chk('traco-criado', w1.n >= 1 && /^s2-b04>/.test(w1.anchor || ''), 'traço sintético ancorado no bloco 04', w1);
    await irIndice(p);
    const oculto = await p.evaluate(() => [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].every(s => getComputedStyle(s).display === 'none' || s.getBoundingClientRect().width === 0));
    chk('traco-oculto-no-indice', oculto, 'no índice (com o painel abrindo) o traço fica oculto, sem flutuar');
    await clicaCarta(p, 's2-b04');
    const emAberto = await p.evaluate(() => [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].every(s => getComputedStyle(s).display === 'none' || s.getBoundingClientRect().width === 0));
    chk('traco-oculto-com-painel', emAberto, 'com o painel expandido o traço continua oculto (a expansão não desloca tinta)');
    await p.click('.rm-ix-start'); await p.waitForTimeout(1600);
    const volta = await p.evaluate(async (anc) => {
      const [sid, ix] = anc.a.split('>'); const lista = [...document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(n => !n.closest('[data-rm-ui]')); const par = lista[+ix];
      window.RMLayout.irPara(par); await new Promise(o => setTimeout(o, 1400));
      const sv = document.querySelector(`#rm2-ink svg[data-anchor="${anc.a}"]`); if (!sv) return { sem: true };
      const r = sv.getBoundingClientRect(), pr = par.getBoundingClientRect();
      return { disp: getComputedStyle(sv).display, dx: Math.abs(r.left - pr.left), dy: Math.abs(r.top - pr.top), dw: Math.abs(r.width - pr.width), d: [...sv.querySelectorAll('path')].map(x => x.getAttribute('d')).join('|'), esc: (window.__writes || []).length };
    }, { a: w1.anchor });
    chk('traco-volta-igual', !volta.sem && volta.disp !== 'none' && volta.dx <= 4 && volta.dy <= 4 && volta.dw <= 4 && volta.d === w1.d, 'ao voltar ao bloco pelo índice expansível o MESMO traço reaparece sobre a âncora (Δ ≤ 4 px)', volta);
    chk('navegar-nao-grava', volta.esc === w1.esc, 'expandir, escolher e voltar não fizeram nenhuma escrita nova', { antes: w1.esc, depois: volta.esc });
    await ctx.close();
  }

  await abre.br.close(); srv.close();
  const falhas = R.filter(r => !r.ok);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'qa-resultados.json'), JSON.stringify({ gerado_em: new Date().toISOString(), total: R.length, falhas: falhas.length, resultados: R }, null, 0).replace(/\},\{/g, '},\n{'));
  console.log(`\nQA #460: ${R.length - falhas.length}/${R.length} verificações OK` + (falhas.length ? ` — ${falhas.length} FALHAS` : ''));
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
