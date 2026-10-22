/* Áudio POR MATÉRIA no navegador (#457): o rm-audio-boot.js REAL + as funções REAIS (_audio/lib.js) atrás do Supabase falso do harness.
   Prova, sem rede externa e sem banco: (1) start() sem argumentos = piloto, exatamente como antes; (2) outra matéria NÃO autorizada no
   servidor ⇒ nenhum card, nenhum motor carregado; (3) autorizada mas sem arquivo pronto ⇒ nenhum card; (4) autorizada e pronta ⇒ card só no
   bloco do manifesto daquela matéria e o áudio toca; (5) aba ativa ≠ matéria pedida, slug malformado ⇒ nada; (6) item de outra matéria nunca
   vira card aqui. Isto NÃO liga áudio em matéria nenhuma do site: quem chama start({slug}) é o rm-pilot.js, que hoje só conhece o piloto.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/browser-qa/audio-integracao/por-materia.test.cjs */
'use strict';
const { iniciar } = require('./server.cjs');
let okN = 0, koN = 0;
const ok = (c, n, x) => { if (c) { okN++; console.log('  ✓ ' + n); } else { koN++; console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);
const esperar = ms => new Promise(r => setTimeout(r, ms));
const ITEM = (id, bloco, pronto) => ({ audio_id: id, block_id: bloco, theme: 'Otra', title: 'Audiolibro ' + id, duration: 60, order: 1, version: 'v1', path: 'semiologia-ii/motivo.v1.mp3', ready: pronto });

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const S = await iniciar(); const browser = await chromium.launch();
  async function nova() {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1024, height: 768 } });
    const page = await ctx.newPage(); const erros = [];
    page.on('pageerror', e => erros.push(String(e)));
    await page.goto(S.base + '/h'); await page.waitForFunction(() => document.querySelector('#tab-semio2 section[id]'));
    await page.evaluate(() => { window.RM_CATALOGO = window.RM_CATALOGO.concat([{ slug: 'outra-materia', tab: 'outra', title: 'Otra materia', sub: '' }]); });
    return { ctx, page, erros };
  }
  /* abre a OUTRA matéria como o site faria (aba ativa + layout montado nela) e chama o boot com o slug dela */
  const naOutra = (page, opts) => page.evaluate(async o => {
    document.getElementById('tab-semio2').classList.remove('active'); document.getElementById('tab-outra').classList.add('active');
    window.RMLayout.attach(document.getElementById('tab-outra'));
    if (!window.RMAudioBoot) await new Promise((ok2, ko) => { const s = document.createElement('script'); s.src = '/assets/rm-audio-boot.js?v=pm'; s.onload = ok2; s.onerror = ko; document.head.appendChild(s); });
    const r = await window.RMAudioBoot.start(o);
    return { r, cards: [...document.querySelectorAll('.rm-audio-card')].map(c => (c.closest('section[id]') || {}).id + ':' + c.getAttribute('data-audio-id')), motor: !!window.RMAudio, provider: !!window.RMAudioProvider };
  }, opts);
  const noPiloto = page => page.evaluate(async () => {
    window.RMLayout.attach(document.getElementById('tab-semio2'));
    if (!window.RMAudioBoot) await new Promise((ok2, ko) => { const s = document.createElement('script'); s.src = '/assets/rm-audio-boot.js?v=pm'; s.onload = ok2; s.onerror = ko; document.head.appendChild(s); });
    const r = await window.RMAudioBoot.start();
    return { r, cards: [...document.querySelectorAll('.rm-audio-card')].map(c => (c.closest('section[id]') || {}).id + ':' + c.getAttribute('data-audio-id')) };
  });
  const OUTRA = { slug: 'outra-materia' };

  try {
    sec('Piloto: start() sem argumentos continua exatamente como antes');
    { S.outros = { 'outra-materia': [ITEM('otra-b01', 'outra-b01', true)] }; S.slugs = undefined;
      const { ctx, page, erros } = await nova(); const x = await noPiloto(page);
      ok(x.r === true && x.cards.join() === 's2-b01:s2-b01-motivo,s2-b03:s2-b03-epoc', 'Semiología II: os 2 cards de sempre (outra matéria no manifesto não muda nada)', x);
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }

    sec('Outra matéria NÃO autorizada no servidor (RM_AUDIO_SLUGS ausente = só o piloto)');
    { S.zera(); const { ctx, page } = await nova(); const x = await naOutra(page, OUTRA);
      ok(x.r === false && x.cards.length === 0 && !x.motor && !x.provider, 'nenhum card e o motor de áudio nem é carregado', x);
      ok(S.ctr.manifest === 1 && S.ctr.sign === 0 && S.ctr.media === 0, 'um pedido de manifesto (negado pelo servidor), nenhuma assinatura nem mídia', S.ctr);
      ok(await page.evaluate(() => { const s = document.getElementById('rm-l2-player'); return !s || s.hidden; }), 'player continua escondido');
      await ctx.close(); }

    sec('Autorizada, mas o arquivo ainda não está pronto (ready:false)');
    { S.zera(); S.slugs = 'semiologia-ii,outra-materia'; S.outros = { 'outra-materia': [ITEM('otra-b01', 'outra-b01', false)] };
      const { ctx, page } = await nova(); const x = await naOutra(page, OUTRA);
      ok(x.r === false && x.cards.length === 0 && !x.motor, 'nenhum card (matéria sem áudio pronto não mostra o card)', x);
      await ctx.close(); }

    sec('Autorizada e pronta: o card nasce só no bloco do manifesto daquela matéria e toca');
    { S.zera(); S.outros = { 'outra-materia': [ITEM('otra-b01', 'outra-b01', true), ITEM('otra-sem-bloco', 'nao-existe', true)] };
      const { ctx, page, erros } = await nova(); const pedidos = []; page.on('request', q => pedidos.push(q.url())); const x = await naOutra(page, OUTRA);
      ok(x.r === true && x.cards.join() === 'outra-b01:otra-b01', 'um card em outra-b01; item de bloco inexistente não vira card', x);
      ok(await page.evaluate(() => document.querySelectorAll('#tab-semio2 .rm-audio-card').length === 0), 'nada aparece na aba do piloto');
      await page.click('.rm-audio-card[data-audio-id="otra-b01"] .rm-audio-card__btn'); await esperar(2500);
      const e = await page.evaluate(() => { const g = window.RMAudioBoot._engine(); return g ? g.getState() : null; });
      ok(e && e.audio_id === 'otra-b01' && e.state === 'playing' && S.ctr.sign === 1, 'play: 1 assinatura pedida com o slug da matéria, áudio tocando', { e: e && { id: e.audio_id, st: e.state }, ctr: S.ctr });
      ok(pedidos.some(u => /get-audio-url\?slug=outra-materia&audio_id=otra-b01/.test(u)) && !pedidos.some(u => /slug=semiologia-ii/.test(u)), 'manifesto e URL pedidos com o slug da matéria (nunca o do piloto)', pedidos.filter(u => /get-audio/.test(u)));
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }

    sec('Portões: aba errada, slug malformado, item de outra matéria');
    { S.zera(); const { ctx, page } = await nova();
      const x = await page.evaluate(async () => {   // pede a outra matéria com a aba do PILOTO ativa
        window.RMLayout.attach(document.getElementById('tab-semio2'));
        const s = document.createElement('script'); s.src = '/assets/rm-audio-boot.js?v=pm'; document.head.appendChild(s); await new Promise(r => { s.onload = r; });
        return window.RMAudioBoot.start({ slug: 'outra-materia' });
      });
      ok(x === false && S.ctr.manifest === 0, 'aba ativa ≠ matéria pedida ⇒ false, sem nem pedir o manifesto', { x, ctr: S.ctr });
      ok((await page.evaluate(() => window.RMAudioBoot.start({ slug: '../semiologia-ii' }))) === false, 'slug malformado ⇒ false');
      ok((await page.evaluate(() => window.RMAudioBoot.start({ slug: 'sem-catalogo' }))) === false, 'matéria fora do catálogo e sem aba ⇒ false');
      await ctx.close(); }
    { S.zera(); S.outros = { 'outra-materia': [Object.assign(ITEM('otra-b01', 'outra-b01', true))] };
      const { ctx, page } = await nova();
      /* o servidor nunca devolve item de outra matéria, mas o cliente também recusa (defesa em profundidade): manifesto adulterado na rota */
      await page.route('**/get-audio-manifest*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slug: 'outra-materia', items: [{ audio_id: 's2-b01-motivo', subject_slug: 'semiologia-ii', block_id: 'outra-b01', theme: 't', title: 'x', duration: 60, order: 1, version: 'v1' }] }) }));
      const x = await naOutra(page, OUTRA);
      ok(x.r === false && x.cards.length === 0, 'item com subject_slug de outra matéria nunca vira card', x);
      await ctx.close(); }
  } catch (e) { koN++; console.log('  ✗ exceção: ' + (e && e.stack || e)); }
  await browser.close(); S.fechar();
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  process.exit(koN ? 1 : 0);
})();
