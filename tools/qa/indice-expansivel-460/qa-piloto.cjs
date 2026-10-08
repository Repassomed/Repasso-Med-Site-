/* QA do ÍNDICE EXPANSÍVEL (issue #460) · PILOTO REAL.
   Mesmo harness do piloto (tools/qa/browser-qa/layout): rm-pilot REAL (com o patch de integração aplicado EM MEMÓRIA — o arquivo em disco não muda),
   Layout V2, tema, navegação, caneta V2 e motor de áudio REAIS. Só o servidor é simulado (get-pilot-flags, manifesto, URL assinada, mídia WAV gerada em memória; 0 rede externa, 0 escrita).
   Cobre: portão das flags (liga só com layout+visual do servidor), outra matéria, falhas (flags 500, módulo 404, attach que lança), player de áudio tocando, caneta.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/indice-expansivel-460/qa-piloto.cjs       Saída: docs/indice-expansivel-460/qa-piloto-resultados.json */
'use strict';
const fs = require('fs'), path = require('path');
const { serve } = require('./serve-piloto.cjs');
const LI = require('../browser-qa/layout/lib-ink.cjs');
const JOSE = LI.JOSE, SUPA = 'https://supa.test';
const OUT = path.resolve(__dirname, '../../../docs/indice-expansivel-460');
const R = []; let secao = '';
const chk = (id, cond, msg, dados) => { R.push({ secao, id, ok: !!cond, msg, dados: cond ? undefined : dados }); if (!cond) console.log('    ✗', secao, '·', id, '·', msg, dados !== undefined ? JSON.stringify(dados).slice(0, 300) : ''); return !!cond; };
const S = (n) => { secao = n; console.log('\n▸ ' + n); };

/* WAV mono 8 kHz 8 bit (sem ffmpeg): senoide de `s` segundos */
function wav(s, f) {
  const sr = 8000, n = sr * s, b = Buffer.alloc(44 + n);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  for (let i = 0; i < n; i++) b[44 + i] = 128 + Math.round(40 * Math.sin(2 * Math.PI * f * i / sr));
  return b;
}
const ITENS = [{ audio_id: 's2-b01-motivo', block_id: 's2-b01', theme: 'Semiología II · Bloque 01', title: 'Motivo de consulta y anamnesis respiratoria', duration: 60, order: 1, version: 'v1', subject_slug: 'semiologia-ii' }];

/* opts: flags (objeto | 'http500'), slug, tab, w, h, touch, audio, seed, bloquear (regex de URL → abort), substituir {regex: corpo} */
async function abrir(br, base, o = {}) {
  const { w = 1440, h = 900, slug = 'semiologia-ii', tab = 'semio2', audio = false, seed = '', flags = { slug: 'semiologia-ii', layout: true, visual: true, audio: false }, bloquear = null, substituir = null } = o;
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: !!o.touch });
  const page = await ctx.newPage(); const errs = [], req = { flags: 0, indice: [], manifest: 0, media: 0 };
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('c:' + m.text().slice(0, 140)); });
  page.on('request', r => { if (/rm-materia-indice\.(js|css)/.test(r.url())) req.indice.push(r.url().split('/').pop().split('?')[0]); });
  await page.addInitScript(([u, id]) => {
    window.SUPABASE_URL = u;
    let v; Object.defineProperty(window, 'RM_SB', { configurable: true, get() { return v; }, set(x) {
      if (x && x.auth) { x.auth.getSession = async () => ({ data: { session: { access_token: 'tok-test', user: { id } } } }); x.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } }); }
      v = x; } });
  }, [SUPA, JOSE]);
  await page.route('**/get-pilot-flags*', r => { req.flags++; if (flags === 'http500') return r.fulfill({ status: 500, body: 'x' }); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(flags) }); });
  if (bloquear) await page.route(bloquear, r => r.abort());
  if (substituir) for (const [re, corpo] of Object.entries(substituir)) await page.route(new RegExp(re), r => r.fulfill({ status: 200, contentType: /css/.test(re) ? 'text/css' : 'text/javascript', body: corpo }));
  if (audio) {
    const midia = wav(60, 330);
    await page.route('**/get-audio-manifest*', r => { req.manifest++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: ITENS }) }); });
    await page.route('**/get-audio-url*', r => { const id = new URL(r.request().url()).searchParams.get('audio_id'); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ src: `${SUPA}/storage/v1/object/sign/audiobooks/semiologia-ii/${id}.wav?token=t`, expiresAt: Date.now() + 600000 }) }); });
    await page.route(SUPA + '/**', r => {
      req.media++;
      const rg = /bytes=(\d*)-(\d*)/.exec(r.request().headers().range || '');
      if (!rg) return r.fulfill({ status: 200, headers: { 'accept-ranges': 'bytes', 'content-type': 'audio/wav', 'content-length': String(midia.length) }, body: midia });
      const ini = rg[1] === '' ? 0 : +rg[1], fim = rg[2] === '' ? midia.length - 1 : Math.min(+rg[2], midia.length - 1);
      r.fulfill({ status: 206, headers: { 'accept-ranges': 'bytes', 'content-type': 'audio/wav', 'content-range': `bytes ${ini}-${fim}/${midia.length}`, 'content-length': String(fim - ini + 1) }, body: midia.subarray(ini, fim + 1) });
    });
  }
  await page.goto(`${base}/p.html?slug=${slug}&tab=${tab}&uid=${JOSE}&wait=1800${seed ? '&seed=' + seed : ''}`, { timeout: 120000 });
  await page.waitForFunction('window.__ready===true', { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  return { ctx, page, errs, req };
}
const estado = p => p.evaluate(() => ({
  ix: !!window.RMIndice, ixCards: window.RMIndice && window.RMIndice.estado ? window.RMIndice.estado().cards : null,
  sis: !!window.RMSistema, nav: !!(window.RMNav && window.RMNav.ativo && window.RMNav.ativo()),
  layout: document.documentElement.classList.contains('rm-l2'), htmlNav: document.documentElement.getAttribute('data-rm-nav'),
  botoes: document.querySelectorAll('button.rm-ix-card').length, ancoras: document.querySelectorAll('a.rm-sis-card').length, paineis: document.querySelectorAll('.rm-ix-panel').length,
  ui: document.querySelectorAll('[data-rm-ui].rm-ix-panel, .rm-ix-panel').length
}));

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();

  /* ============ A · portão das flags ============ */
  S('A · portão: só liga com layout + visual vindos do servidor, só em Semiología II');
  {
    const a = await abrir(br, base);
    const e = await estado(a.page);
    chk('liga', e.ix && e.ixCards === 10 && e.botoes === 10 && e.ancoras === 4 && e.nav, 'flags layout+visual → 10 botões expansíveis, 4 links diretos (guía/tablas/banco/flashcards)', e);
    chk('pede-modulo', a.req.indice.includes('rm-materia-indice.js') && a.req.indice.includes('rm-materia-indice.css'), 'só então baixa o CSS e o JS do módulo', a.req);
    chk('sem-erro-A', a.errs.length === 0, 'sem erros de página/console', a.errs);
    await a.ctx.close();
    for (const [nome, fl] of [['visual-off', { slug: 'semiologia-ii', layout: true, visual: false, audio: false }], ['layout-off', { slug: 'semiologia-ii', layout: false, visual: true, audio: false }], ['slug-errado', { slug: 'biologia', layout: true, visual: true }], ['http500', 'http500'], ['vazio', {}]]) {
      const b = await abrir(br, base, { flags: fl }); const s = await estado(b.page);
      chk('off-' + nome, !s.ix && s.botoes === 0 && s.paineis === 0 && b.req.indice.length === 0, `${nome}: o módulo nem é baixado (0 requisições), 0 botões, 0 painéis`, { s, req: b.req });
      if (nome !== 'visual-off') chk('off-' + nome + '-sem-tema', !s.sis || nome === 'visual-off', `${nome}: sem tema/índice`, s);
      chk('off-' + nome + '-erros', b.errs.length === 0, `${nome}: sem erros`, b.errs);
      await b.ctx.close();
    }
    const o = await abrir(br, base, { slug: 'biologia', tab: 'bio', flags: { slug: 'semiologia-ii', layout: true, visual: true, audio: true } });
    const so = await estado(o.page);
    chk('outra-materia', !so.ix && so.botoes === 0 && o.req.indice.length === 0 && o.req.flags === 0, 'Biología (flags “ligadas” pelo mock): nenhum pedido de flags, nenhum módulo, nenhum botão', { so, req: o.req });
    chk('outra-materia-erros', o.errs.length === 0, 'Biología sem erros', o.errs);
    await o.ctx.close();
  }

  /* rollback: com o rm-pilot.js ORIGINAL (diff revertido em memória) o índice é exatamente o de antes */
  S('A2 · rollback: rm-pilot.js original ⇒ nenhum módulo, cards abrem o bloco direto');
  {
    const srv0 = await serve({ semPatch: true }); const base0 = 'http://127.0.0.1:' + srv0.address().port;
    const a = await abrir(br, base0); const e = await estado(a.page);
    chk('rollback-sem-modulo', !e.ix && e.botoes === 0 && e.ancoras === 14 && e.nav && a.req.indice.length === 0, 'pilot original: tema+navegação intactos, 14 <a>, 0 requisições ao módulo', { e, req: a.req });
    await a.page.evaluate(() => document.querySelector('a.rm-sis-card[data-rm-go="s2-b04"]').click()); await a.page.waitForTimeout(900);
    const st = await a.page.evaluate(() => window.RMNav.estado());
    chk('rollback-abre-direto', st.view === 'block' && st.block === 's2-b04', 'card abre o bloco direto', st);
    await a.ctx.close(); srv0.close();
  }

  /* ============ B · falhas ============ */
  S('B · falhas: módulo 404, attach que lança — o aluno continua abrindo o bloco direto');
  {
    const casos = [
      ['js-404', { bloquear: /rm-materia-indice\.js/ }],
      ['css-404', { bloquear: /rm-materia-indice\.css/ }],
      ['attach-lanca', { substituir: { 'rm-materia-indice\\.js': 'window.RMIndice={attach:function(){throw new Error("boom")},detach:function(){window.__detach=(window.__detach||0)+1}};' } }]
    ];
    for (const [nome, op] of casos) {
      const a = await abrir(br, base, op);
      const e = await estado(a.page);
      chk(nome + '-cards-links', e.botoes === 0 && e.ancoras === 14 && e.nav && e.sis, `${nome}: tema e navegação ficam, 14 cards seguem como <a> (sem botões)`, e);
      const antes = await a.page.evaluate(() => window.RMNav.estado());
      await a.page.evaluate(() => document.querySelector('a.rm-sis-card[data-rm-go="s2-b03"]').click()); await a.page.waitForTimeout(900);
      const dep = await a.page.evaluate(() => window.RMNav.estado());
      chk(nome + '-abre-direto', antes.view === 'index' && dep.view === 'block' && dep.block === 's2-b03', `${nome}: clicar no card abre o bloco direto (comportamento atual)`, { antes, dep });
      if (nome === 'attach-lanca') chk('attach-lanca-detach', (await a.page.evaluate(() => window.__detach)) >= 1, 'o pilot chama RMIndice.detach() quando o attach lança', null);
      chk(nome + '-erros', a.errs.filter(x => !/boom|js|css/i.test(x)).length === 0, `${nome}: sem erros inesperados`, a.errs);
      await a.ctx.close();
    }
  }

  /* ============ C · player de áudio tocando ============ */
  S('C · player de áudio: o painel e a última fileira não ficam sob o player; o áudio continua');
  for (const [W, H, touch] of [[390, 844, true], [1440, 900, false]]) {
    const a = await abrir(br, base, { w: W, h: H, touch, audio: true, flags: { slug: 'semiologia-ii', layout: true, visual: true, audio: true } });
    await a.page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b01' })); await a.page.waitForTimeout(1200);
    const tem = await a.page.evaluate(() => !!document.querySelector('.rm-audio-card[data-audio-id="s2-b01-motivo"] button'));
    chk(`card-audio-${W}`, tem, 'o card de áudio do bloco 01 existe (manifesto simulado)', a.req);
    if (!tem) { await a.ctx.close(); continue; }
    await a.page.evaluate(() => document.querySelector('.rm-audio-card[data-audio-id="s2-b01-motivo"] button').click());
    let toca = true; try { await a.page.waitForFunction(() => { const s = window.RMAudioBoot && window.RMAudioBoot._estado(); return s && s.motor && s.motor.state === 'playing' && s.motor.position > 1; }, null, { timeout: 15000 }); } catch (e) { toca = false; }
    chk(`tocando-${W}`, toca, 'áudio em reprodução (WAV simulado)', null);
    await a.page.evaluate(() => window.RMNav.go({ view: 'index' })); await a.page.waitForTimeout(600);
    const ids = await a.page.evaluate(() => [...document.querySelectorAll('button.rm-ix-card')].map(b => b.getAttribute('data-rm-go')));
    const ultimo = ids[ids.length - 1];
    const b = await a.page.$(`button.rm-ix-card[data-rm-go="${ultimo}"]`); await b.scrollIntoViewIfNeeded(); await b.click(); await a.page.waitForTimeout(500);
    await a.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await a.page.waitForTimeout(500);
    const m = await a.page.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0 ? r : null; };
      const slot = document.getElementById('rm-l2-player'); const pr = slot && !slot.hidden ? slot.getBoundingClientRect() : null;
      /* celular: barra fixa embaixo (slot com altura). desktop: card/botão fixo à direita (slot sem altura) */
      const barra = pr && pr.height > 30 ? pr : null;
      const flut = slot ? [...slot.querySelectorAll('.rm-audio, .rm-sis-aud-x')].map(vis).filter(Boolean) : [];
      const panel = document.querySelector('.rm-ix-panel.is-open'), subs = panel ? [...panel.querySelectorAll('.rm-ix-sub')] : [];
      const alvos = [panel, ...subs, ...document.querySelectorAll('button.rm-ix-card')].filter(Boolean).map(e => e.getBoundingClientRect()).filter(r => r.width > 0);
      const cruza = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const ult = subs[subs.length - 1], ur = ult && ult.getBoundingClientRect();
      return { barra: barra && { top: Math.round(barra.top), h: Math.round(barra.height) }, flutuantes: flut.length, cobre: flut.some(f => alvos.some(a => cruza(f, a))), ultimaSub: ur && { bottom: Math.round(ur.bottom) }, nSubs: subs.length, ih: innerHeight, ph: getComputedStyle(document.documentElement).getPropertyValue('--rm-player-h') };
    });
    if (W < 768) chk(`player-visivel-${W}`, m.barra && m.barra.h > 30, 'barra do player visível durante o índice', m);
    else chk(`player-visivel-${W}`, m.flutuantes >= 1, 'card/botão do player visível à direita durante o índice', m);
    chk(`ultima-sub-livre-${W}`, m.ultimaSub && (!m.barra || m.ultimaSub.bottom <= m.barra.top + 1), `última minicard do painel (bloco ${ultimo}) fica acima da barra do player ao rolar até o fim`, m);
    chk(`nao-cobre-${W}`, !m.cobre, 'nenhum elemento flutuante do player cobre painel, minicards ou cards do índice', m);
    const sub = await a.page.$('.rm-ix-panel.is-open .rm-ix-sub'); await sub.click(); await a.page.waitForTimeout(1500);
    const dep = await a.page.evaluate(() => ({ nav: window.RMNav.estado(), motor: (window.RMAudioBoot._estado() || {}).motor }));
    chk(`audio-segue-${W}`, dep.nav.view === 'block' && dep.motor && dep.motor.state === 'playing', 'escolher subtítulo abre o bloco e o áudio segue tocando', dep);
    chk(`erros-${W}`, a.errs.length === 0, 'sem erros', a.errs);
    await a.ctx.close();
  }

  /* ============ D · caneta real ============ */
  S('D · caneta V2 real: tinta semeada do «banco» continua alinhada depois de entrar pelo subtítulo');
  {
    const a = await abrir(br, base, { seed: 's2-b10,s2-banco' });
    await a.page.evaluate(() => { window.__writes.length = 0; });
    await a.page.evaluate(() => window.RMNav.go({ view: 'index' })); await a.page.waitForTimeout(500);
    const oculta = await a.page.evaluate(() => [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].every(s => getComputedStyle(s).display === 'none' || s.getBoundingClientRect().width === 0));
    chk('tinta-oculta-indice', oculta, 'no índice a tinta fica oculta', null);
    const b = await a.page.$('button.rm-ix-card[data-rm-go="s2-b10"]'); await b.scrollIntoViewIfNeeded(); await b.click(); await a.page.waitForTimeout(500);
    const subs = await a.page.$$('.rm-ix-panel.is-open .rm-ix-sub');
    chk('b10-tem-subs', subs.length >= 2, 'bloco 10 tem subtítulos no painel', subs.length);
    await subs[Math.min(1, subs.length - 1)].click(); await a.page.waitForTimeout(1500);
    const est = await a.page.evaluate(() => window.RMNav.estado());
    chk('abriu-b10', est.view === 'block' && est.block === 's2-b10', 'abre só o bloco 10', est);
    await LI.trazerTinta(a.page, 's2-b10');
    const r = await LI.ate(a.page, 4000);
    LI.okTinta(r.m, 'tinta do bloco 10 alinhada à âncora');
    const rr = LI.R; chk('tinta-alinhada', LI.valida(r.m) && r.m.desvio <= LI.MAX, `desvio ${r.m && r.m.desvio} px (≤ ${LI.MAX})`, r.m);
    chk('sem-escrita', (await a.page.evaluate(() => window.__writes)).length === 0, 'navegar/expandir/abrir não grava nada (0 escritas)', await a.page.evaluate(() => window.__writes));
    chk('erros-D', a.errs.length === 0, 'sem erros', a.errs);
    await a.ctx.close();
  }

  await br.close(); srv.close();
  const falhas = R.filter(x => !x.ok);
  fs.writeFileSync(path.join(OUT, 'qa-piloto-resultados.json'), JSON.stringify({ quando: new Date().toISOString().slice(0, 10), total: R.length, ok: R.length - falhas.length, falhas, checks: R.map(x => ({ secao: x.secao, id: x.id, ok: x.ok, msg: x.msg })) }, null, 1));
  console.log(`\nPILOTO REAL: ${R.length - falhas.length}/${R.length} verificações OK` + (falhas.length ? ` — ${falhas.length} FALHAS` : ''));
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
