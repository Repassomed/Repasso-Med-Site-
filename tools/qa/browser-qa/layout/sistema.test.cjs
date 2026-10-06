/* Sistema visual de matérias (rm-materia-sistema.js/.css) × Semiología II REAL (+ app-core/rm-tools/rm-pilot/rm-layout reais).
   Supabase e o gate do piloto são simulados (page.route em get-pilot-flags); 0 rede real, 0 escrita.

   Uso:  export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo
         node tools/qa/browser-qa/layout/sistema.test.cjs

   Prova:
     1 · FALHA FECHADA — sem `visual` (ou só `layout`) o sistema NUNCA é pedido nem aplicado; o Layout V2 fica como estava.
     2 · CONTEÚDO INTACTO — ids/âncoras, contagens (quiz-item, flashcard, audio, table, figure) e o TEXTO de cada seção
         (sem a UI derivada) são idênticos com o sistema ligado; a UI derivada tem [data-rm-ui] e não cria p/li/h2–h5/table/figure
         (o que alteraria o índice de âncoras da tinta/marca-texto).
     3 · DADOS REAIS — contagens da capa, do índice e das metas dos blocos = o que o DOM tem (120 · 172 · 34 · 6; nada digitado).
     4 · DETACH LIMPO — depois de RMSistema.detach() não sobra classe, atributo data-rm-*, nó nem texto trocado.
     5 · FUNÇÕES — revelar resposta, V/F, giro/abertura do baralho, glossário, áudio presente, salto do índice, pílulas da faixa.
     6 · GEOMETRIA — 0 overflow horizontal em 320/390/768/1024/1440, sem erro JS. */
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.cjs');
let falhas = 0, total = 0;
const ok = (c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();

  async function abrir(w, h, flags) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 });
    const p = await ctx.newPage(); const errs = [], pedidos = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
    p.on('request', r => { if (/rm-materia-sistema/.test(r.url())) pedidos.push(r.url()); });
    await p.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign({ slug: 'semiologia-ii' }, flags)) }));
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await p.goto(`${base}/p.html?slug=semiologia-ii&tab=semio2&uid=d4d215d3-36dd-4efb-8869-bdea5376c648&wait=1500`);
    await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(1200);
    return { p, ctx, errs, pedidos };
  }

  /* instantâneo do conteúdo (sem a UI derivada): ids, contagens e texto por seção */
  const SNAP = () => {
    const tab = document.getElementById('tab-semio2'), out = { secs: {}, n: {} };
    tab.querySelectorAll(':scope > section[id]').forEach(s => {
      const c = s.cloneNode(true);
      c.querySelectorAll('[data-rm-ui]').forEach(n => n.remove());
      c.removeAttribute('style');
      out.secs[s.id] = (c.textContent || '').replace(/\s+/g, ' ').trim();
    });
    out.ids = [...tab.querySelectorAll('[id]')].map(e => e.id).filter(i => !/^rm-/.test(i)).sort().join(',');
    ['.quiz-item', '.flashcard', 'audio', 'table', 'figure.s2-fig', '.reveal-btn', '.tf-btn', '.s2-gl'].forEach(k => { out.n[k] = tab.querySelectorAll(k).length; });
    return out;
  };

  console.log('\n===== 1 · falha fechada');
  for (const [nome, flags] of [['sem visual (só layout)', { layout: true }], ['visual sem layout', { layout: false, visual: true }], ['tudo falso', { layout: false, visual: false }]]) {
    const f = await abrir(1440, 900, flags);
    const r = await f.p.evaluate(() => ({ sis: document.documentElement.classList.contains('rm-sis'), l2: document.documentElement.classList.contains('rm-l2'), api: !!window.RMSistema, ui: document.querySelectorAll('[data-rm-sis]').length }));
    ok(!r.sis && !r.api && r.ui === 0, `${nome}: sistema NÃO aplicado, API não carregada, 0 nós`);
    ok(f.pedidos.length === 0, `${nome}: 0 requisições a rm-materia-sistema.*`);
    ok(r.l2 === !!flags.layout, `${nome}: Layout V2 ${flags.layout ? 'segue ligado' : 'segue desligado'}`);
    ok(f.errs.length === 0, `${nome}: 0 erros JS`);
    await f.ctx.close();
  }

  console.log('\n===== 2–4 · com `visual`: conteúdo intacto · dados reais · detach limpo');
  const base0 = await abrir(1440, 900, { layout: true });          // referência: layout sem o sistema
  const ref = await base0.p.evaluate(SNAP);
  const tipos = await base0.p.evaluate(() => [...document.querySelectorAll('#tab-semio2 section[id]')].map(s => s.id + ':' + s.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote').length).join(','));
  await base0.ctx.close();

  const f = await abrir(1440, 900, { layout: true, visual: true }); const p = f.p;
  const on = await p.evaluate(() => ({ sis: document.documentElement.classList.contains('rm-sis'), tema: document.documentElement.getAttribute('data-rm-tema'), est: window.RMSistema && window.RMSistema._estado() }));
  ok(on.sis && on.tema === 'semiologia-ii' && on.est && on.est.secciones === 14, `sistema aplicado (tema ${on.tema}, ${on.est && on.est.secciones} secciones)`);
  const com = await p.evaluate(SNAP);
  ok(com.ids === ref.ids, 'ids/âncoras do conteúdo idênticos (' + ref.ids.split(',').length + ')');
  ok(JSON.stringify(com.n) === JSON.stringify(ref.n), 'contagens idênticas: ' + JSON.stringify(ref.n));
  const difTxt = Object.keys(ref.secs).filter(k => ref.secs[k] !== com.secs[k]);
  ok(difTxt.length === 0, 'TEXTO de todas as seções idêntico sem a UI derivada' + (difTxt.length ? ' · difere: ' + difTxt.join(',') : ''));
  const tiposCom = await p.evaluate(() => [...document.querySelectorAll('#tab-semio2 section[id]')].map(s => s.id + ':' + [...s.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(n => !n.closest('[data-rm-ui]')).length).join(','));
  ok(tiposCom === tipos, 'índice de âncoras (p,li,h2–h5,table,figure,blockquote fora da UI derivada) igual por seção');
  const ruim = await p.evaluate(() => [...document.querySelectorAll('[data-rm-sis]')].filter(n => !n.hasAttribute('data-rm-ui') || n.querySelector('p,li,h1,h2,h3,h4,h5,table,figure,blockquote')).length);
  ok(ruim === 0, 'toda UI derivada leva [data-rm-ui] e não cria p/li/h*/table/figure/blockquote');

  const dados = await p.evaluate(() => {
    const tab = document.getElementById('tab-semio2'), g = s => document.querySelectorAll(s);
    const cartao = {}; g('.rm-l2-rescard').forEach(c => { cartao[c.getAttribute('aria-label').split(':')[0]] = c.getAttribute('data-rm-n'); });
    const soBlocos = [...tab.querySelectorAll(':scope > section[id]')].filter(s => !/banco|flashcards/.test(s.id));
    const q = soBlocos.reduce((a, s) => a + s.querySelectorAll('.quiz-item').length, 0), fc = soBlocos.reduce((a, s) => a + s.querySelectorAll('.flashcard').length, 0);
    const metas = [...g('.rm-sis-meta')].map(m => m.textContent);
    const b4 = tab.querySelector('#s2-b04'), m4 = b4.querySelector('.rm-sis-meta').textContent;
    const esperado4 = [b4.querySelectorAll('.quiz-item').length + ' preguntas', b4.querySelectorAll('.flashcard').length + ' tarjetas'];
    const cards = [...g('.rm-sis-card')].length, tags = [...g('.rm-sis-tag')].map(t => t.textContent.replace(/\s+/g, ' '));
    const badges = [...g('.s2-quiz-card[data-rm-n]')].map(d => d.getAttribute('data-rm-n') + '=' + d.querySelectorAll('.quiz-item').length);
    return { cartao, q, fc, metas: metas.length, m4, esperado4, cards, tags, badgesOk: [...g('.s2-quiz-card[data-rm-n]')].every(d => d.getAttribute('data-rm-n').startsWith(d.querySelectorAll('.quiz-item').length + ' ')), nb: badges.length };
  });
  ok(dados.cartao['Preguntas'] === '120' && +dados.q === 120, `cartão Preguntas = ${dados.cartao['Preguntas']} = ${dados.q} quiz-item dos blocos (o banco geral repete as mesmas: não soma)`);
  ok(dados.cartao['Flashcards'] === '172' && +dados.fc === 172, `cartão Flashcards = ${dados.cartao['Flashcards']} = ${dados.fc}`);
  ok(dados.cartao['Infografías'] === '34' && dados.cartao['Auscultación'] === '6', `cartões Infografías = ${dados.cartao['Infografías']} · Auscultación = ${dados.cartao['Auscultación']}`);
  ok(dados.metas === 14 && dados.esperado4.every(e => dados.m4.indexOf(e) !== -1), `meta dos 14 títulos lida do DOM (bloque 04: «${dados.m4}»)`);
  ok(dados.cards === 14 && dados.tags.length === 14, '14 cartões no índice da matéria · 14 etiquetas de bloco · numeração do conteúdo: ' + dados.tags.slice(0, 3).join(' | '));
  ok(dados.nb > 0 && dados.badgesOk, `selo do resumo de preguntas = contagem real em ${dados.nb} cartões`);

  console.log('\n===== 5 · funções preservadas (com o sistema ligado)');
  const fn = await p.evaluate(async () => {
    const r = {}, tab = document.getElementById('tab-semio2'), esp = ms => new Promise(o => setTimeout(o, ms));
    const gl = tab.querySelector('#s2-b04 .s2-gl'); window.RMLayout.irPara(gl); await esp(1800); gl.click(); await esp(250);
    const nota = document.getElementById('rm-gl-note'); r.gl = !!nota && nota.classList.contains('on') && getComputedStyle(nota).backgroundColor === 'rgb(255, 226, 122)'; r.glDbg = nota && [nota.className, getComputedStyle(nota).backgroundColor, gl.className, Math.round(gl.getBoundingClientRect().top)].join('|'); gl.click(); await esp(100);
    const item = tab.querySelector('#s2-b01 .quiz-item .reveal-btn'); const ans = item.parentElement.querySelector('.answer') || item.nextElementSibling;
    item.click(); await esp(100); r.revela = /show/.test(ans.className); item.click(); await esp(50); r.oculta = !/show/.test(ans.className);
    const tf = tab.querySelector('#s2-b01 .tf-btn'); tf.click(); await esp(100); r.tf = !!tab.querySelector('#s2-b01 .tf-btn.correct, #s2-b01 .tf-btn.wrong');
    const op = tab.querySelector('#s2-b04 .options li[data-option]'); op.click(); await esp(100); r.opcion = !!tab.querySelector('#s2-b04 .options li.correct');
    r.audio = tab.querySelectorAll('audio').length; r.src = tab.querySelector('audio source').getAttribute('src');
    const play = tab.querySelector('#s2-b01 .rmfc-play'); play.click(); await esp(200);
    const ov = document.querySelector('.rmfc-overlay'); r.fcAbre = !!ov && ov.classList.contains('show');
    const inner = ov.querySelector('.rmfc-inner'); ov.querySelector('[data-a="flip"]').click(); await esp(60); r.fcGira = inner.classList.contains('flipped');
    ov.querySelector('[data-a="next"]').click(); await esp(60); r.fcNext = /^2 \//.test(ov.querySelector('.rmfc-prog').textContent);
    ov.querySelector('[data-a="close"]').click(); await esp(60); r.fcCierra = !ov.classList.contains('show');
    r.back = getComputedStyle(ov.querySelector('.rmfc-back')).backgroundColor;
    return r;
  });
  ok(fn.revela && fn.oculta, 'reveal-btn mostra e esconde a resposta (toggleAnswer original)');
  ok(fn.tf, 'V/F: checkTF original marca correta/errada');
  ok(fn.opcion, 'múltipla escolha: opção correta marcada');
  ok(fn.audio === 6 && /\/assets\/audio\/semio2\//.test(fn.src), `auscultação: ${fn.audio} <audio> originais (${fn.src})`);
  ok(fn.gl, 'glossário: termo abre o post-it (#rm-gl-note) no amarelo de «mi nota» ' + (fn.gl ? '' : fn.glDbg));
  ok(fn.fcAbre && fn.fcGira && fn.fcNext && fn.fcCierra, 'flashcards: abre baralho, gira, avança, fecha');
  ok(fn.back === 'rgb(51, 38, 111)', 'verso do flashcard #33266F');
  const nav = await p.evaluate(async () => {
    const esp = ms => new Promise(o => setTimeout(o, ms)); const r = {};
    window.scrollTo(0, 0); await esp(400); document.querySelector('.rm-sis-card[data-rm-go="s2-b05"]').click(); await esp(2500);
    r.card = Math.abs(document.getElementById('s2-b05').getBoundingClientRect().top - (document.getElementById('rm-l2-band').offsetHeight + 16)) < 60;
    const pill = [...document.querySelectorAll('.rm-sis-pill')].find(x => x.textContent === 'Preguntas'); window.scrollTo(0, 0); await esp(400); pill.click(); await esp(2500);
    const q = document.querySelector('#s2-b01 .quiz-item'); const t = q.getBoundingClientRect().top; r.pill = t > 0 && t < innerHeight;
    r.pos = document.querySelector('.rm-l2-name small').textContent;
    window.scrollTo(0, 0); await esp(400);
    const ln = document.querySelector('.rm-l2-block-link[data-target="s2-b07"]'); if (ln.offsetParent === null) { const tg = document.querySelector('.rm-l2-tree-toggle'); if (tg) tg.click(); }
    ln.click(); await esp(2500);
    r.lateral = Math.abs(document.getElementById('s2-b07').getBoundingClientRect().top - (document.getElementById('rm-l2-band').offsetHeight + 16)) < 60;
    r.numLat = ln.querySelector('i').textContent;
    return r;
  });
  ok(nav.card, 'cartão do índice da matéria salta ao bloco (mesmo irPara do layout)');
  ok(nav.lateral && nav.numLat === '07', `índice lateral: «07» salta ao bloque 07 (numeração do conteúdo: ${nav.numLat})`);
  ok(nav.pill, `pílula «Preguntas» da faixa salta à 1.ª pergunta (posição: «${nav.pos}»)`);

  ok(f.errs.length === 0, '0 erros JS (' + f.errs.length + ')');
  await f.ctx.close();

  console.log('\n===== 4 · detach limpo (página nova, sem interações)');
  const d = await abrir(1440, 900, { layout: true, visual: true });
  await d.p.evaluate(() => window.RMSistema.detach());
  const det = await d.p.evaluate(SNAP);
  const resto = await d.p.evaluate(() => ({ cls: document.documentElement.classList.contains('rm-sis'), tema: document.documentElement.hasAttribute('data-rm-tema'), nodos: document.querySelectorAll('[data-rm-sis]').length,
    attrs: [...document.querySelectorAll('#tab-semio2 *')].filter(e => [...e.attributes].some(a => /^data-rm-(cap|tipo|cmp|cc|label|n|tema|miga|leyenda|here)$/.test(a.name))).length + (document.getElementById('tab-semio2').className.indexOf('rm-sis-s') !== -1 ? 1 : 0),
    h1: document.querySelector('.rm-l2-cover-title').textContent, nome: document.querySelector('.rm-l2-name b').textContent }));
  ok(!resto.cls && !resto.tema && resto.nodos === 0 && resto.attrs === 0, 'sem classe, sem data-rm-*, sem nós derivados');
  ok(resto.h1 === 'Semiología II' && resto.nome === 'Semiología II', 'textos do shell restaurados («' + resto.nome + '»)');
  ok(JSON.stringify(det.secs) === JSON.stringify(ref.secs) && det.ids === ref.ids && JSON.stringify(det.n) === JSON.stringify(ref.n), 'conteúdo igual ao do layout puro');
  ok(d.errs.length === 0, '0 erros JS (' + d.errs.length + ')');
  await d.ctx.close();


  console.log('\n===== 7 · entrada compacta (cabeçalho global + abas + faixa) e controles globais');
  for (const [w, h, maxTotal] of [[1440, 900, 150], [390, 844, 140]]) {
    const g = await abrir(w, h, { layout: true, visual: true });
    const m = await g.p.evaluate(async () => {
      const esp = ms => new Promise(o => setTimeout(o, ms)); const R = s => { const e = document.querySelector(s); return e && e.getBoundingClientRect(); };
      const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
      const r = {};
      const band = document.getElementById('rm-l2-band').getBoundingClientRect();
      r.alturaTopo = Math.round(band.bottom);                                   // cabeçalho global + abas + faixa, antes de rolar
      r.logosVisiveisNoTopo = [...document.querySelectorAll('.rm-topbar img, .rm-l2-band .rm-l2-logo, #materias-container .rm-l2-cover img.logo')].filter(vis).length;
      r.marcaFaixaOculta = !vis(document.querySelector('.rm-l2-band .rm-sis-brand'));
      r.globais = { sug: vis(document.getElementById('rm-sug-top')), tabs: [...document.querySelectorAll('.main-tab')].filter(vis).length, user: !!document.getElementById('rm-user'), topbar: vis(document.getElementById('rm-topbar')) };
      window.scrollTo(0, 1200); await esp(500);
      const b2 = document.getElementById('rm-l2-band').getBoundingClientRect();
      r.faixaGruda = Math.round(b2.top) === 0;                                   // sticky: a faixa fica no topo ao rolar
      r.stuck = document.documentElement.hasAttribute('data-rm-stuck');
      r.logoGrudada = vis(document.querySelector('.rm-l2-band .rm-l2-logo'));
      r.logosGrudado = [...document.querySelectorAll('.rm-topbar img, .rm-l2-band .rm-l2-logo')].filter(e => { const b = e.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && vis(e); }).length;
      window.scrollTo(0, 0); await esp(500);
      r.voltou = !document.documentElement.hasAttribute('data-rm-stuck');
      document.getElementById('rm-sug-top').click(); await esp(400);
      r.sugAbre = !!document.getElementById('rm-sug') && getComputedStyle(document.getElementById('rm-sug')).display !== 'none';
      return r;
    });
    ok(m.alturaTopo <= maxTotal, `${w}×${h}: entrada compacta — faixa termina em ${m.alturaTopo}px (≤ ${maxTotal}; antes ≈ 176)`);
    ok(m.logosVisiveisNoTopo === 1 && m.marcaFaixaOculta, `${w}×${h}: UMA logo no topo (cabeçalho global); marca da faixa oculta enquanto o global está à vista`);
    ok(m.globais.topbar && m.globais.sug && m.globais.tabs >= 1 && m.globais.user, `${w}×${h}: controles globais preservados (marca, Caja de sugerencias, usuário, ${m.globais.tabs} abas)`);
    ok(m.faixaGruda && m.stuck && m.logoGrudada && m.logosGrudado === 1, `${w}×${h}: ao rolar a faixa gruda no topo (sticky) e passa a mostrar a logo — 1 logo à vista`);
    ok(m.voltou, `${w}×${h}: ao voltar ao topo a marca da faixa some de novo`);
    ok(m.sugAbre, `${w}×${h}: «Caja de sugerencias» global continua abrindo a gaveta`);
    ok(g.errs.length === 0, `${w}×${h}: 0 erros JS`);
    await g.ctx.close();
  }

  console.log('\n===== 8 · caneta com o sistema ligado (traço de stylus real, âncora e persistência)');
  { const g = await abrir(1440, 900, { layout: true, visual: true });
    const t = await g.p.evaluate(async () => {
      const esp = ms => new Promise(o => setTimeout(o, ms)); const r = { pen: false };
      const sec = document.getElementById('s2-b04');
      const alvo = [...sec.querySelectorAll('p')].filter(p => !p.closest('[data-rm-ui]') && p.textContent.length > 150)[2];
      window.RMLayout.irPara(alvo); await esp(1800);
      if (window.RMToolsV2.estado && window.RMToolsV2.estado.tool !== 'pen') window.RMToolsV2.escolherFerramenta('pen'); await esp(300);
      r.tool = window.RMToolsV2.estado && window.RMToolsV2.estado.tool;
      const b = alvo.getBoundingClientRect();
      const fire = (ty, x, y, bt) => alvo.dispatchEvent(new PointerEvent(ty, { pointerType: 'pen', pointerId: 9, isPrimary: true, clientX: x, clientY: y, buttons: bt, bubbles: true, cancelable: true, pressure: bt ? .5 : 0 }));
      fire('pointerover', b.left + 40, b.top + 14, 0); fire('pointerdown', b.left + 40, b.top + 14, 1);
      for (let i = 1; i <= 18; i++) { fire('pointermove', b.left + 40 + i * 8, b.top + 14 + (i % 4) * 3, 1); await esp(14); }
      fire('pointerup', b.left + 190, b.top + 20, 0); await esp(900);
      const svgs = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')];
      r.svgs = svgs.length; r.paths = svgs.reduce((a, s) => a + s.querySelectorAll('path').length, 0);
      const an = svgs[0] && svgs[0].getAttribute('data-anchor'); r.anchor = an;
      if (an) { const [sid, i] = an.split('>'); const lista = [...document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(n => !n.closest('[data-rm-ui]'));
        r.ancora = lista[+i] === alvo; }
      r.writes = (window.__writes || []).filter(w => /user_ink_strokes/.test(w)).join(',');
      window.RMToolsV2.escolherFerramenta('none');
      return r;
    });
    ok(t.tool === 'pen', 'caneta armada (ferramenta = ' + t.tool + ')');
    ok(t.svgs >= 1 && t.paths >= 1, `traço desenhado (${t.svgs} grupo, ${t.paths} path)`);
    ok(t.ancora === true, `âncora ${t.anchor} aponta exatamente para o parágrafo escrito (índice igual ao do layout puro)`);
    ok(/insert:user_ink_strokes/.test(t.writes), 'traço persistido pelo motor da V2 (insert user_ink_strokes — a escrita é do motor original, o sistema não grava nada)');
    ok(g.errs.length === 0, '0 erros JS');
    await g.ctx.close(); }

  console.log('\n===== 9 · «Sair» não cobre a leitura (celular 320/390 e desktop), rolando a página real');
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1440, 900]]) {
    const g = await abrir(w, h, { layout: true, visual: true });
    const m = await g.p.evaluate(async () => {
      const esp = ms => new Promise(o => setTimeout(o, ms)); const r = { cobre: [], paradas: 0, saiu: 0 };
      let chamou = 0; const fab = document.getElementById('logout-fab'); fab.onclick = () => { chamou++; };
      const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
      r.fabOculto = !vis(fab);
      const out = document.querySelector('.rm-sis-out'), band = document.getElementById('rm-l2-band');
      const ro = out.getBoundingClientRect(), rb = band.getBoundingClientRect();
      r.noBand = vis(out) && ro.left >= rb.left && ro.right <= rb.right + 0.5 && ro.top >= rb.top && ro.bottom <= rb.bottom + 0.5 && ro.width >= 44 && ro.height >= 44;
      r.cabe = ro.right <= innerWidth + 0.5 && ro.left >= 0;
      /* alvos de leitura em várias paradas: nenhum elemento FIXO visível (fora a faixa, a gaveta fechada, a toolbox/caneta e o toast) cobre texto, célula, post-it ou nota */
      const alvos = ['#s2-b01 .rm-sis-tabtag', '#s2-b01 .key-box', '#s2-b04 .rm-postit', '#s2-b04 .s2-quiz-card', '#s2-b05 table', '#s2-b01 .s2-margin'];
      const PERMITE = '#rm-l2-band,.rm-l2-side,.rm-l2-backdrop,.rm2-box,.rm2-notes,.rm2-diag,.rm-tools,.rm-tools-r,.rm-toast,#rm-l2-player,.rm-l2-player,#rm2-ink,#rm-gl-note';
      for (const sel of alvos) {
        const el = document.querySelector(sel); if (!el) continue;
        window.RMLayout.irPara(el); await esp(1700); r.paradas++;
        const fixos = [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && cs.display !== 'none' && cs.visibility !== 'hidden' && e.getBoundingClientRect().width > 0 && !e.matches(PERMITE) && !e.closest(PERMITE); });
        for (const f of fixos) {
          const b = f.getBoundingClientRect();
          if (b.bottom > 0 && b.top < innerHeight) r.cobre.push(sel + ' ← ' + (f.id || f.className || f.tagName) + ' @' + Math.round(b.left) + ',' + Math.round(b.top) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
        }
      }
      out.click(); await esp(100); r.chamou = chamou;
      return r;
    });
    ok(m.fabOculto, `${w}×${h}: o botão flutuante verde (#logout-fab) não aparece mais sobre a leitura`);
    ok(m.noBand && m.cabe, `${w}×${h}: «Sair» está dentro da faixa fixa, inteiro na tela, alvo ≥ 44×44 px`);
    ok(m.chamou === 1, `${w}×${h}: «Sair» delega o clique ao controle original (logout do site, 1 chamada)`);
    ok(m.cobre.length === 0, `${w}×${h}: nenhum elemento fixo cobre tabela/nota/post-it/pergunta em ${m.paradas} paradas de rolagem` + (m.cobre.length ? ' · ' + m.cobre.slice(0, 3).join(' | ') : ''));
    ok(g.errs.length === 0, `${w}×${h}: 0 erros JS`);
    await g.ctx.close();
  }

  console.log('\n===== 10 · «Sair» com a gaveta do índice e a caneta armada (celular 390)');
  { const g = await abrir(390, 844, { layout: true, visual: true });
    const r = await g.p.evaluate(async () => {
      const esp = ms => new Promise(o => setTimeout(o, ms)); const o = {};
      document.querySelector('.rm-l2-hamb').click(); await esp(500);
      const side = document.getElementById('rm-l2-side'), out = document.querySelector('.rm-sis-out');
      const ro = out.getBoundingClientRect(), rs = side.getBoundingClientRect();
      o.gavetaAberta = side.classList.contains('is-open'); o.semSobrepor = ro.left >= rs.right - 1 || ro.right <= rs.left + 1 || ro.top >= rs.bottom || ro.bottom <= rs.top;
      o.sairVisivelComGaveta = !!document.elementFromPoint(ro.left + ro.width / 2, ro.top + ro.height / 2) && document.elementFromPoint(ro.left + ro.width / 2, ro.top + ro.height / 2).closest('.rm-sis-out') !== null;
      document.querySelector('.rm-l2-close').click(); await esp(400);
      window.RMLayout.irPara(document.querySelector('#s2-b04 .rm-postit') || document.querySelector('#s2-b04 table')); await esp(1700);
      window.RMToolsV2.escolherFerramenta('pen'); await esp(700);
      const box = document.querySelector('.rm2-box'); const bb = box && box.getBoundingClientRect();
      o.toolbox = !!box && getComputedStyle(box).display !== 'none';
      o.toolboxFora = !bb || bb.right <= ro.left + 1 || bb.left >= ro.right - 1 || bb.top >= ro.bottom + 1 || bb.bottom <= ro.top - 1;   // a toolbox da caneta não colide com «Sair»
      o.toolboxNaTela = !bb || (bb.left >= 0 && bb.right <= innerWidth + 1 && bb.top >= 0 && bb.bottom <= innerHeight + 1);
      window.RMToolsV2.escolherFerramenta('none');
      return o;
    });
    ok(r.gavetaAberta && r.semSobrepor, 'gaveta do índice abre e não se sobrepõe a «Sair»' + (r.sairVisivelComGaveta ? '' : ' (a gaveta passa por cima do botão enquanto aberta: esperado, o backdrop fecha ao tocar)'));
    ok(r.toolbox && r.toolboxFora && r.toolboxNaTela, 'caneta armada: toolbox visível, inteira na tela e sem colidir com «Sair»');
    ok(g.errs.length === 0, '0 erros JS');
    await g.ctx.close(); }

  console.log('\n===== 6 · geometria');
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    const g = await abrir(w, h, { layout: true, visual: true });
    const m = await g.p.evaluate(async () => {
      const esp = ms => new Promise(o => setTimeout(o, ms)); const r = { max: 0 };
      for (const id of ['s2-b01', 's2-b04', 's2-tablas', 's2-banco']) { window.RMLayout.irPara(document.getElementById(id)); await esp(1300); r.max = Math.max(r.max, document.documentElement.scrollWidth - document.documentElement.clientWidth); }
      r.sis = document.documentElement.classList.contains('rm-sis');
      return r;
    });
    ok(m.sis && m.max <= 1, `${w}×${h}: 0 overflow horizontal (max ${m.max}px) · sistema ativo`);
    ok(g.errs.length === 0, `${w}×${h}: 0 erros JS`);
    await g.ctx.close();
  }

  await br.close(); srv.close();
  console.log(`\n${total - falhas}/${total} verificações OK` + (falhas ? ` · ${falhas} FALHAS` : ''));
  process.exit(falhas ? 1 : 0);
})();
