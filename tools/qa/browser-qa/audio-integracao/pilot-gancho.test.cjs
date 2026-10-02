#!/usr/bin/env node
/* GANCHO do audiobook no rm-pilot.js (RMAudioBoot.start()/stop()) — só o que o gancho faz, com o rm-pilot.js REAL.

   Reaproveita o servidor da integração (server.cjs: funções REAIS `get-audio-manifest`/`get-audio-url` atrás de um «Supabase» falso, áudio
   gerado com ffmpeg, HTTPS local) e a matéria Semiología II REAL. O Layout é o REAL (RM_B1_DIR aponta para assets/). O endpoint
   `get-pilot-flags` é interceptado (o gate do piloto é do servidor: aqui só se devolve `layout` true/false). 0 rede externa, 0 escrita em banco.

   O que se prova:
     1  gate: `layout:false` ⇒ ZERO pedidos de áudio (nem rm-audio-boot.js, nem manifesto, nem rm-audio.*); outra matéria ⇒ idem;
     2  `layout:true` + sem manifesto autorizado (servidor devolve vazio / 403 / 500 / sem sessão) ⇒ o boot carrega, o servidor é consultado UMA vez
        e NADA mais: nenhum rm-audio.js/css/store/provider, nenhum card, nenhum <audio>, nenhuma URL de mídia; o layout continua anexado;
     3  manifesto autorizado ⇒ só então rm-audio.* carrega; cards nos blocos; a mídia NÃO é pedida até o play (0 bytes de áudio);
     4  start() depois do attach (ordem), idempotente (várias avaliações ⇒ 1 manifesto, 1 carga do boot); stop() ao sair da matéria, ANTES do detach;
     5  corridas: sair da matéria antes de o boot terminar de carregar ⇒ nunca start(); attach que falha ⇒ nunca start(); o boot que não carrega (404) não derruba o layout
        e não é repetido a cada troca de aba (cooldown);
     6  rm-pilot.js não contém UID, e-mail, is_admin nem lista; só o slug do piloto.
   Uso:  RM_FFMPEG=... node tools/qa/browser-qa/audio-integracao/pilot-gancho.test.cjs                                                              */
'use strict';
const path = require('path'), fs = require('fs');
process.env.RM_B1_DIR = process.env.RM_B1_DIR || path.resolve(__dirname, '../../../../Repasso-Med-Site--main/Atual - Copia/assets');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { iniciar } = require('./server.cjs');

let okN = 0, koN = 0;
const ok = (c, n, x) => { if (c) { okN++; console.log('  ✓ ' + n); } else { koN++; console.log('  ✗ FALHA: ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);
const esperar = ms => new Promise(r => setTimeout(r, ms));
const SITE = path.resolve(__dirname, '../../../../Repasso-Med-Site--main/Atual - Copia');

/* conta o que o gancho faz: carga do boot, start/stop e ordem em relação a attach/detach */
const INSTR = `(function () {
  window.__g = { ev: [], sc: [] };
  var tick = function (n) { window.__g.ev.push(n + '@' + Math.round(performance.now())); };
  var def = function (k, wrap) { var v; Object.defineProperty(window, k, { configurable: true, get: function () { return v; }, set: function (x) { v = wrap(x); } }); };
  def('RMLayout', function (L) { if (!L || L.__w) return L; var a = L.attach, d = L.detach; L.attach = function () { var r = a.apply(this, arguments); tick('attach'); return r; }; L.detach = function () { tick('detach'); return d.apply(this, arguments); }; L.__w = 1; return L; });
  def('RMAudioBoot', function (B) { if (!B || B.__w) return B; var s = B.start, p = B.stop; B.start = function () { tick('start'); return s.apply(this, arguments); }; B.stop = function () { tick('stop'); return p.apply(this, arguments); }; B.__w = 1; return B; });
  var obs = new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes && m.addedNodes.forEach(function (n) { if (n.tagName === 'SCRIPT' && /rm-audio/.test(n.src || '')) window.__g.sc.push(n.src.split('/').pop().split('?')[0]); if (n.tagName === 'LINK' && /rm-audio/.test(n.href || '')) window.__g.sc.push(n.href.split('/').pop().split('?')[0]); }); }); });
  obs.observe(document, { childList: true, subtree: true });
})();`;

const req = (S, re) => S.log.filter(l => re.test(l.p));
const nomes = (S) => S.log.map(l => l.p);
const audioReq = (S) => S.log.filter(l => /rm-audio|get-audio|\/storage\/v1\/object\/sign\/audiobooks/.test(l.p));

async function pagina(S, browser, { flags, w = 1024, h = 768, semTabAtiva = false, retardoBoot = 0, bootFalha = false, sessao } = {}) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', e => erros.push(String(e)));
  await page.addInitScript(INSTR);
  S.pilotFlags = 0;
  await page.route('**/get-pilot-flags*', r => { S.pilotFlags++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(flags) }); });
  if (retardoBoot) await page.route('**/assets/rm-audio-boot.js*', async r => { await esperar(retardoBoot); r.continue(); });
  if (bootFalha) await page.route('**/assets/rm-audio-boot.js*', r => r.fulfill({ status: 404, body: '' }));
  await page.goto(S.base + '/h');
  await page.waitForFunction(() => document.querySelector('#tab-semio2 section[id]'));
  if (sessao !== undefined) await page.evaluate(s => { window.__sess = s; }, sessao);
  return { ctx, page, erros };
}
const ligarPiloto = (page) => page.addScriptTag({ url: '/assets/rm-pilot.js?v=t' });
const estado = (page) => page.evaluate(() => ({
  ev: window.__g.ev, sc: window.__g.sc, boot: !!window.RMAudioBoot, layout: document.documentElement.classList.contains('rm-l2'), slot: !!document.getElementById('rm-l2-player'),
  cards: document.querySelectorAll('.rm-audio-card').length, audios: document.querySelectorAll('audio').length - document.querySelectorAll('#tab-semio2 audio').length,
  ativo: window.RMAudioBoot && window.RMAudioBoot._estado ? window.RMAudioBoot._estado() : null
}));
const ordem = (ev) => ev.map(x => x.split('@')[0]);

(async () => {
  const S = await iniciar({});
  const browser = await chromium.launch();
  try {
    /* ---------- 6 · o arquivo ---------- */
    sec('6 · rm-pilot.js: sem UID, e-mail, is_admin nem lista');
    const src = fs.readFileSync(path.join(SITE, 'assets/rm-pilot.js'), 'utf8');
    ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(src) && !/@|is_admin|BETA_UIDS|RM_PILOT_/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'o código executável não tem UID, e-mail, is_admin nem nome de lista');
    const codigo = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    ok((codigo.match(/RMAudioBoot\.start\(\)/g) || []).length === 1 && (codigo.match(/RMAudioBoot\.stop\(\)/g) || []).length === 1, 'exatamente 1 start() e 1 stop() no código (fora de comentários)');
    ok((src.match(/'semiologia-ii'/g) || []).length === 1, 'um único slug (o do piloto)');

    /* ---------- 1 · gate ---------- */
    sec('1 · layout:false, sem sessão e outra matéria: ZERO pedidos de áudio');
    { S.zera(); const { ctx, page, erros } = await pagina(S, browser, { flags: { slug: 'semiologia-ii', layout: false } });
      await ligarPiloto(page); await esperar(900);
      const e = await estado(page);
      ok(S.pilotFlags >= 1, 'o gate do servidor foi consultado'); ok(!e.layout && !e.boot && e.sc.length === 0 && e.cards === 0, 'layout:false ⇒ sem layout, sem boot, sem rm-audio.*, sem card', e);
      ok(audioReq(S).length === 0 && !nomes(S).some(p => /rm-audio-boot/.test(p)), 'nenhum pedido de áudio (boot, manifesto, mídia)', audioReq(S).map(l => l.p));
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }
    { S.zera(); const { ctx, page } = await pagina(S, browser, { flags: { slug: 'semiologia-ii', layout: true } });
      await page.evaluate(() => { document.querySelectorAll('#materias-container > .tab-content').forEach(t => t.classList.remove('active')); document.getElementById('tab-outra').classList.add('active'); window.RM_CATALOGO.push({ slug: 'outra', tab: 'outra', title: 'Otra', sub: '' }); });
      await ligarPiloto(page); await esperar(800);
      const e = await estado(page);
      ok(S.pilotFlags === 0, 'outra matéria: o servidor nem é consultado'); ok(!e.layout && !e.boot && audioReq(S).length === 0, 'outra matéria: zero layout, zero áudio', e);
      await ctx.close(); }

    { S.zera(); S.ligado = true;
      const { ctx, page, erros } = await pagina(S, browser, { flags: { slug: 'semiologia-ii', layout: true }, sessao: null });
      await ligarPiloto(page); await esperar(1000);
      const e = await estado(page);
      ok(S.pilotFlags === 0, 'sem sessão: o gate do piloto nem pergunta ao servidor (sem token)');
      ok(!e.layout && !e.boot && e.sc.length === 0 && e.cards === 0 && audioReq(S).length === 0, 'sem sessão: sem layout, sem boot, sem rm-audio.*, zero pedidos de áudio', e);
      ok(erros.length === 0, 'sem sessão: 0 erros JS', erros); await ctx.close(); }

    /* ---------- 2 · sem manifesto autorizado ---------- */
    sec('2 · layout:true mas SEM manifesto autorizado: nada de áudio aparece');
    const casos = [
      ['servidor devolve manifesto vazio (UID não autorizado)', s => { s.ligado = false; }],
      ['servidor responde 500', s => { s.ligado = true; s.falha.manifest = 5; }],
    ];
    for (const [nome, prep, sessao] of casos) {
      S.zera(); S.ligado = true; S.falha.manifest = 0; prep(S);
      const { ctx, page, erros } = await pagina(S, browser, { flags: { slug: 'semiologia-ii', layout: true }, sessao });
      await ligarPiloto(page); await esperar(1500);
      const e = await estado(page);
      ok(e.layout && e.slot, `${nome}: o layout continua anexado`);
      ok(e.boot && ordem(e.ev).indexOf('attach') < ordem(e.ev).indexOf('start'), `${nome}: boot carregado e start() DEPOIS do attach`, e.ev);
      ok(S.ctr.manifest === 1, `${nome}: o servidor foi consultado 1 vez (${S.ctr.manifest})`);
      ok(e.sc.filter(x => x !== 'rm-audio-boot.js').length === 0, `${nome}: NENHUM rm-audio.js/css/store/provider carregado`, e.sc);
      ok(e.cards === 0 && e.ativo === null && e.audios <= 0, `${nome}: 0 cards, boot sem estado ativo (falhou fechado), 0 <audio> novos`, e);
      ok(S.ctr.sign === 0 && S.ctr.media === 0 && req(S, /audiobooks/).length === 0, `${nome}: 0 assinaturas e 0 bytes de mídia`);
      ok(erros.length === 0, `${nome}: 0 erros JS`, erros); await ctx.close();
    }

    /* ---------- 3 · manifesto autorizado ---------- */
    sec('3 · manifesto autorizado: só então o áudio carrega; mídia só no play');
    { S.zera(); S.ligado = true; S.falha.manifest = 0;
      const { ctx, page, erros } = await pagina(S, browser, { flags: { slug: 'semiologia-ii', layout: true } });
      await ligarPiloto(page);
      await page.waitForFunction(() => document.querySelectorAll('.rm-audio-card').length > 0, null, { timeout: 15000 });
      const e = await estado(page);
      ok(e.cards === 2 && e.ativo && e.ativo.ativo, `2 cards nos blocos do manifesto (${e.cards})`);
      ok(['rm-audio-boot.js', 'rm-audio.css', 'rm-audio.js', 'rm-audio-store.js', 'rm-audio-provider.js'].every(x => e.sc.indexOf(x) !== -1), 'só agora carregaram rm-audio.css/js/store/provider', e.sc);
      ok(ordem(e.ev).indexOf('attach') < ordem(e.ev).indexOf('start'), 'start() depois do attach');
      ok(S.ctr.manifest === 1 && S.ctr.sign === 0 && S.ctr.media === 0, `1 manifesto, 0 assinaturas, 0 bytes de mídia antes do play (${S.ctr.manifest}/${S.ctr.sign}/${S.ctr.media})`);
      ok(await page.evaluate(() => document.querySelectorAll('section[id] [data-rm-ui]').length >= 2 && document.querySelectorAll('section[id] .rm-audio-card p, section[id] .rm-audio-card li, section[id] .rm-audio-card h2').length === 0), 'cards são [data-rm-ui] sem p/li/h* (âncoras de tinta/highlight intactas)');
      /* idempotência: várias avaliações não repetem boot nem manifesto */
      const n0 = S.ctr.manifest;
      await page.evaluate(() => { for (let i = 0; i < 5; i++) window.RMPilot.avaliar(); }); await esperar(900);
      const e2 = await estado(page);
      ok(S.ctr.manifest === n0 && e2.cards === 2 && e2.sc.filter(x => x === 'rm-audio-boot.js').length === 1, `5 reavaliações: 1 boot, ${S.ctr.manifest} manifesto, ${e2.cards} cards (idempotente)`);
      /* sair da matéria: stop() ANTES do detach; cards e player somem */
      await page.evaluate(() => { document.querySelectorAll('#materias-container > .tab-content').forEach(t => t.classList.remove('active')); document.getElementById('tab-outra').classList.add('active'); window.RM_CATALOGO.push({ slug: 'outra', tab: 'outra', title: 'Otra', sub: '' }); window.RMPilot.avaliar(); });
      await esperar(700);
      const e3 = await estado(page); const o3 = ordem(e3.ev);
      ok(o3.lastIndexOf('stop') !== -1 && o3.lastIndexOf('stop') < o3.lastIndexOf('detach'), 'ao sair: stop() antes do detach', e3.ev);
      ok(e3.cards === 0 && !e3.layout && !e3.slot && e3.ativo === null, 'sem cards, sem layout, sem slot, boot sem estado', e3);
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }

    /* ---------- 5 · corridas ---------- */
    sec('5 · corridas e falhas: nunca start() fora de hora; o layout nunca cai por causa do áudio');
    { S.zera(); S.ligado = true; S.falha.manifest = 0;
      const { ctx, page } = await pagina(S, browser, { flags: { slug: 'semiologia-ii', layout: true }, retardoBoot: 1200 });
      await ligarPiloto(page);
      await page.waitForFunction(() => document.documentElement.classList.contains('rm-l2'), null, { timeout: 8000 });
      await page.evaluate(() => { document.querySelectorAll('#materias-container > .tab-content').forEach(t => t.classList.remove('active')); document.getElementById('tab-outra').classList.add('active'); window.RM_CATALOGO.push({ slug: 'outra', tab: 'outra', title: 'Otra', sub: '' }); window.RMPilot.avaliar(); });
      await esperar(2200);
      const e = await estado(page);
      ok(!ordem(e.ev).includes('start') && S.ctr.manifest === 0 && e.cards === 0, 'saiu da matéria ANTES de o boot carregar: start() nunca é chamado e o manifesto nunca é pedido', { ev: e.ev, m: S.ctr.manifest });
      await ctx.close(); }
    { S.zera(); S.ligado = true;
      const { ctx, page, erros } = await pagina(S, browser, { flags: { slug: 'semiologia-ii', layout: true }, bootFalha: true });
      await ligarPiloto(page); await esperar(1200);
      const e = await estado(page);
      ok(e.layout && e.slot && !e.boot && e.cards === 0, 'rm-audio-boot.js 404: o layout continua anexado, sem áudio', e);
      const antes = nomes(S).filter(p => /rm-audio-boot/.test(p)).length;
      await page.evaluate(() => { for (let i = 0; i < 4; i++) window.RMPilot.avaliar(); }); await esperar(800);
      const tentativas = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /rm-audio-boot/.test(r.name)).length);
      ok(tentativas <= 1, `o boot que falhou não é pedido de novo a cada avaliação (cooldown; ${tentativas} tentativa)`);
      ok(erros.length === 0, '0 erros JS', erros); await ctx.close(); }
    { S.zera(); S.ligado = true;
      const { ctx, page } = await pagina(S, browser, { flags: { slug: 'semiologia-ii', layout: true } });
      await ligarPiloto(page); await page.waitForFunction(() => document.querySelectorAll('.rm-audio-card').length > 0, null, { timeout: 15000 });
      /* attach que falha: nunca liga o áudio */
      await page.evaluate(() => { window.RMAudioBoot.stop(); window.RMLayout.detach(); window.__g.ev.length = 0; const a = window.RMLayout.attach; window.RMLayout.attach = function () { throw new Error('falha simulada'); }; window.RMPilot.avaliar(); });
      await esperar(900);
      const e = await estado(page);
      ok(!ordem(e.ev).includes('start') && e.cards === 0 && !e.layout, 'attach lançou erro: layout desfeito e start() NÃO chamado', e.ev);
      await ctx.close(); }
  } finally { await browser.close(); S.fechar(); }
  console.log(`\npilot-gancho: ${okN}/${okN + koN} verificações OK` + (koN ? ` — ${koN} FALHAS` : ''));
  process.exit(koN ? 1 : 0);
})();
