/* CICLO COMPLETO do áudio por matéria (#457/#489) numa ÚNICA página, sem recarregar: o rm-audio-boot.js REAL + o motor REAL + as funções
   REAIS (_audio/lib.js) atrás do Supabase falso do harness. A troca de matéria é feita como o site faz (aba ativa muda → o boot observa e
   para; depois start() na matéria nova). Prova, sem rede externa e sem banco:
     1  piloto → toca → parar → OUTRA matéria autorizada e pronta → toca → parar → volta ao piloto → toca;
     2  matéria autorizada SEM áudio pronto: nenhum card, nenhum pedido de URL; matéria NÃO autorizada: idem (o servidor nega);
     3  em toda a sequência: card só na aba da matéria ativa, URL pedida só com o slug da matéria ativa, um áudio por vez;
     4  respostas de rede que chegam DEPOIS da troca de aba (manifesto atrasado; URL assinada atrasada) não criam card, não tocam e não
        pedem mídia na matéria errada — inclusive quando a matéria nova é pedida no mesmo instante da troca (antes de o boot observá-la).
   Isto NÃO liga áudio em matéria nenhuma do site: hoje o rm-pilot.js só chama start() no piloto.
   Uso: NODE_PATH=$(npm root -g) [RM_FFMPEG=...] node tools/qa/browser-qa/audio-integracao/ciclo.test.cjs */
'use strict';
const { iniciar } = require('./server.cjs');
let okN = 0, koN = 0;
const ok = (c, n, x) => { if (c) { okN++; console.log('  ✓ ' + n); } else { koN++; console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);
const esperar = ms => new Promise(r => setTimeout(r, ms));
const ITEM = (id, bloco, pronto) => ({ audio_id: id, block_id: bloco, theme: 'Otra', title: 'Audiolibro ' + id, duration: 60, order: 1, version: 'v1', path: 'outra/motivo.v1.mp3', ready: pronto });

/* matérias de teste: a aba «outra» já existe no harness; «sin-audio» e «no-autorizada» entram aqui (catálogo + aba + um bloco) */
const PREPARA = () => {
  const cont = document.getElementById('materias-container');
  [['sin-audio', 'semaudio', 'sa-b01'], ['no-autorizada', 'naoaut', 'na-b01']].forEach(([slug, tab, b]) => {
    const t = document.createElement('div'); t.className = 'tab-content'; t.id = 'tab-' + tab;
    t.innerHTML = '<section class="container" id="' + b + '"><h2>Materia ' + slug + '</h2><p>Contenido.</p></section>'; cont.appendChild(t);
    window.RM_CATALOGO.push({ slug, tab, title: slug, sub: '' });
  });
  window.RM_CATALOGO.push({ slug: 'outra-materia', tab: 'outra', title: 'Otra materia', sub: '' });
  window.__media = []; const op = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { if (!window.__media.includes(this)) window.__media.push(this); return op.apply(this, arguments); };
};
/* troca de matéria como o site: a aba ativa muda, o layout monta nela; com `junto`, start() é chamado no MESMO instante (sem dar tempo
   de o boot observar a troca) — o pior caso de corrida */
const ir = (page, tab, slug, junto) => page.evaluate(async ([tab, slug, junto]) => {
  document.querySelectorAll('#materias-container > .tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
  window.RMLayout.attach(document.getElementById('tab-' + tab));
  if (!junto) await new Promise(r => setTimeout(r, 50));
  return window.RMAudioBoot.start(slug ? { slug } : undefined);
}, [tab, slug, !!junto]);
const ESTADO = () => {
  const porAba = {}; document.querySelectorAll('.rm-audio-card').forEach(c => { const t = c.closest('.tab-content'); porAba[t ? t.id : '?'] = (porAba[t ? t.id : '?'] || 0) + 1; });
  const g = window.RMAudioBoot && window.RMAudioBoot._engine(), e = g ? g.getState() : null;
  return { ativa: (document.querySelector('#materias-container > .tab-content.active') || {}).id, porAba, motor: e && { id: e.audio_id, st: e.state },
    tocando: (window.__media || []).filter(m => !m.paused && !m.ended).length };
};
const estado = page => page.evaluate(ESTADO);
const tocar = async (page, id) => { await page.click('.rm-audio-card[data-audio-id="' + id + '"] .rm-audio-card__btn'); await esperar(2200); return estado(page); };
const parar = page => page.evaluate(() => window.RMAudioBoot.stop());

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const S = await iniciar(); const browser = await chromium.launch();
  const urls = [];   // { slug, audio_id, fase }
  let fase = '';
  async function nova() {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1024, height: 768 } });
    const page = await ctx.newPage(); const erros = [];
    page.on('pageerror', e => erros.push(String(e)));
    page.on('request', q => { const u = new URL(q.url()); if (/get-audio-url$/.test(u.pathname)) urls.push({ slug: u.searchParams.get('slug'), audio_id: u.searchParams.get('audio_id'), fase }); });
    await page.goto(S.base + '/h'); await page.waitForFunction(() => document.querySelector('#tab-semio2 section[id]'));
    await page.evaluate(PREPARA);
    await page.evaluate(async () => { if (!window.RMAudioBoot) await new Promise((ok2, ko) => { const s = document.createElement('script'); s.src = '/assets/rm-audio-boot.js?v=ciclo'; s.onload = ok2; s.onerror = ko; document.head.appendChild(s); }); });
    return { ctx, page, erros };
  }
  const config = () => {
    S.zera(); S.latManifest = 0; urls.length = 0;
    S.slugs = 'semiologia-ii,outra-materia,sin-audio';                       // no-autorizada tem manifesto pronto, mas NÃO está na lista
    S.outros = { 'outra-materia': [ITEM('otra-b01', 'outra-b01', true)], 'sin-audio': [ITEM('sa-b01-x', 'sa-b01', false)], 'no-autorizada': [ITEM('na-b01-x', 'na-b01', true)] };
  };

  try {
    sec('1 · Ciclo: piloto → parar → outra matéria autorizada e pronta → parar → piloto (mesma página)');
    { config(); const { ctx, page, erros } = await nova();
      fase = 'piloto-1'; let r = await ir(page, 'semio2'); let x = await estado(page);
      ok(r === true && x.porAba['tab-semio2'] === 2 && Object.keys(x.porAba).length === 1, 'piloto: 2 cards, só na aba do piloto', x);
      x = await tocar(page, 's2-b01-motivo');
      ok(x.motor && x.motor.id === 's2-b01-motivo' && x.motor.st === 'playing' && x.tocando === 1, 'piloto: toca (1 mídia)', x);
      ok(await parar(page) === true, 'parar: stop() devolve true');
      x = await estado(page);
      ok(!x.motor && x.tocando === 0 && Object.keys(x.porAba).length === 0, 'parado: nenhum card, nenhum áudio tocando', x);

      fase = 'outra'; r = await ir(page, 'outra', 'outra-materia'); x = await estado(page);
      ok(r === true && x.porAba['tab-outra'] === 1 && !x.porAba['tab-semio2'], 'outra matéria autorizada e pronta: 1 card, só na aba dela', x);
      x = await tocar(page, 'otra-b01');
      ok(x.motor && x.motor.id === 'otra-b01' && x.motor.st === 'playing' && x.tocando === 1, 'outra matéria: toca (1 mídia; nada do piloto)', x);
      ok(await parar(page) === true && (await estado(page)).tocando === 0, 'parar na outra matéria: nada tocando');

      fase = 'piloto-2'; r = await ir(page, 'semio2'); x = await estado(page);
      ok(r === true && x.porAba['tab-semio2'] === 2 && !x.porAba['tab-outra'], 'volta ao piloto: 2 cards do piloto, nenhum na outra aba', x);
      const salvo = await page.evaluate(() => document.querySelector('.rm-audio-card[data-audio-id="s2-b01-motivo"] .rm-audio-card__btn').textContent);
      ok(/^Continuar/.test(salvo), 'a posição do piloto foi guardada e o card oferece «Continuar»', salvo);
      x = await tocar(page, 's2-b03-epoc');
      ok(x.motor && x.motor.id === 's2-b03-epoc' && x.motor.st === 'playing' && x.tocando === 1, 'piloto de novo: toca outro bloco', x);

      const errado = urls.filter(u => (u.fase.startsWith('piloto') && u.slug !== 'semiologia-ii') || (u.fase === 'outra' && u.slug !== 'outra-materia'));
      ok(urls.length === 3 && errado.length === 0, 'URL assinada pedida 3× (1 por play), sempre com o slug da matéria ativa', urls);
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }

    sec('2 · Autorizada sem áudio pronto · não autorizada (mesma página, vindo de um piloto que tocava)');
    { config(); const { ctx, page, erros } = await nova();
      fase = 'piloto'; await ir(page, 'semio2'); await tocar(page, 's2-b01-motivo');
      const sign0 = S.ctr.sign;
      fase = 'sin-audio'; let r = await ir(page, 'semaudio', 'sin-audio'); let x = await estado(page);
      ok(r === false && Object.keys(x.porAba).length === 0 && !x.motor && x.tocando === 0, 'autorizada sem áudio pronto: start → false, nenhum card, piloto parou', x);
      fase = 'no-autorizada'; r = await ir(page, 'naoaut', 'no-autorizada'); x = await estado(page);
      ok(r === false && Object.keys(x.porAba).length === 0 && !x.motor && x.tocando === 0, 'não autorizada (manifesto pronto no servidor, mas fora da lista): nenhum card', x);
      ok(S.ctr.sign === sign0 && urls.every(u => u.fase === 'piloto'), 'nenhuma URL assinada pedida para as duas', { sign: S.ctr.sign, sign0, urls });
      const man = S.log.filter(l => /get-audio-manifest/.test(l.p)).length;
      ok(man === 3, 'um pedido de manifesto por matéria aberta (piloto, sin-audio, no-autorizada)', man);
      fase = 'piloto-volta'; r = await ir(page, 'semio2'); x = await estado(page);
      ok(r === true && x.porAba['tab-semio2'] === 2 && Object.keys(x.porAba).length === 1, 'volta ao piloto: cards de sempre', x);
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }

    sec('3 · Manifesto do piloto chega DEPOIS da troca para a outra matéria');
    { config(); S.latManifest = 1200; const { ctx, page, erros } = await nova();
      fase = 'piloto'; const p1 = page.evaluate(() => { document.querySelectorAll('#materias-container > .tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-semio2')); window.RMLayout.attach(document.getElementById('tab-semio2')); window.__p1 = window.RMAudioBoot.start(); return true; });
      await p1; await esperar(200);
      fase = 'outra'; const r = await ir(page, 'outra', 'outra-materia');          // o manifesto do piloto ainda está em voo
      const r1 = await page.evaluate(() => window.__p1);
      await esperar(1500); const x = await estado(page);
      ok(r1 === false, 'a instância do piloto (cuja resposta chegou depois) termina em false', r1);
      ok(r === true && x.porAba['tab-outra'] === 1 && !x.porAba['tab-semio2'], 'só o card da outra matéria; o manifesto atrasado do piloto não cria card nenhum', x);
      ok(S.ctr.sign === 0 && x.tocando === 0, 'nenhuma URL nem áudio', { sign: S.ctr.sign, x });
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }

    sec('4 · Troca e start() da outra matéria no MESMO instante (antes de o boot observar a troca)');
    { config(); S.latManifest = 600; const { ctx, page, erros } = await nova();
      fase = 'piloto'; await page.evaluate(() => { document.getElementById('tab-semio2').classList.add('active'); window.RMLayout.attach(document.getElementById('tab-semio2')); window.__p1 = window.RMAudioBoot.start(); });
      await esperar(100);
      fase = 'outra'; const r = await ir(page, 'outra', 'outra-materia', true);
      await esperar(1200); const x = await estado(page);
      ok(r === true && x.porAba['tab-outra'] === 1 && !x.porAba['tab-semio2'], 'a outra matéria recebe o SEU card (não a promessa do piloto)', x);
      ok(await page.evaluate(() => window.__p1) === false, 'a instância do piloto encerrou');
      /* pedido inválido não derruba quem está ativo: slug de outra aba enquanto a outra matéria está aberta */
      const r2 = await page.evaluate(() => window.RMAudioBoot.start({ slug: 'semiologia-ii' }));
      const y = await estado(page);
      ok(r2 === false && y.porAba['tab-outra'] === 1, 'start() para uma aba que NÃO é a ativa: false e a matéria aberta segue com o seu card', { r2, y });
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }

    sec('5 · URL assinada do piloto chega DEPOIS da troca de aba');
    { config(); const { ctx, page, erros } = await nova();
      let segura = null; const solta = () => segura && segura();
      await page.route('**/get-audio-url*', async rt => { if (/slug=semiologia-ii/.test(rt.request().url())) { await new Promise(r => { segura = r; setTimeout(r, 4000); }); } await rt.continue(); });
      fase = 'piloto'; await ir(page, 'semio2');
      await page.click('.rm-audio-card[data-audio-id="s2-b01-motivo"] .rm-audio-card__btn'); await esperar(300);   // play → URL em voo
      const media0 = S.ctr.media;
      fase = 'outra'; const r = await ir(page, 'outra', 'outra-materia');
      solta(); await esperar(2000); const x = await estado(page);
      ok(r === true && x.porAba['tab-outra'] === 1 && !x.porAba['tab-semio2'], 'outra matéria com o seu card; nenhum card do piloto', x);
      ok(x.tocando === 0 && (!x.motor || x.motor.st !== 'playing'), 'a URL atrasada do piloto NÃO toca nada na outra matéria', x);
      ok(S.ctr.media === media0, 'e nenhuma mídia do piloto é pedida depois da troca', { media0, media: S.ctr.media });
      const y = await tocar(page, 'otra-b01');
      ok(y.motor && y.motor.id === 'otra-b01' && y.motor.st === 'playing' && y.tocando === 1, 'a outra matéria toca o SEU áudio normalmente (1 mídia)', y);
      ok(urls.filter(u => u.fase === 'outra').every(u => u.slug === 'outra-materia'), 'URL da outra matéria só com o slug dela', urls);
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }

    sec('6 · Manifesto atrasado do piloto + troca para matéria NÃO autorizada');
    { config(); S.latManifest = 1000; const { ctx, page, erros } = await nova();
      fase = 'piloto'; await page.evaluate(() => { document.getElementById('tab-semio2').classList.add('active'); window.RMLayout.attach(document.getElementById('tab-semio2')); window.RMAudioBoot.start(); });
      await esperar(150);
      fase = 'no-autorizada'; const r = await ir(page, 'naoaut', 'no-autorizada');
      await esperar(1600); const x = await estado(page);
      ok(r === false && Object.keys(x.porAba).length === 0 && !x.motor && x.tocando === 0 && S.ctr.sign === 0, 'nenhum card em aba nenhuma, nenhuma URL, nada tocando', { r, x, sign: S.ctr.sign });
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }
  } catch (e) { koN++; console.log('  ✗ exceção: ' + (e && e.stack || e)); }
  await browser.close(); S.fechar();
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  process.exit(koN ? 1 : 0);
})();
