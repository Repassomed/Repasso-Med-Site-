#!/usr/bin/env node
/* D1 · testes SINTÉTICOS do motor rm-audio.js — ver README.md.
   Nada vai à rede, nenhuma mídia real existe, nada é gravado em lado nenhum. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SITE = path.join(ROOT, 'Repasso-Med-Site--main', 'Atual - Copia');
const ROUTES = {
  '/harness.html': [path.join(__dirname, 'harness.html'), 'text/html; charset=utf-8'],
  '/fake-audio.js': [path.join(__dirname, 'fake-audio.js'), 'text/javascript; charset=utf-8'],
  '/assets/rm-audio.js': [path.join(SITE, 'assets', 'rm-audio.js'), 'text/javascript; charset=utf-8'],
  '/assets/rm-audio.css': [path.join(SITE, 'assets', 'rm-audio.css'), 'text/css; charset=utf-8']
};

let okN = 0, koN = 0; const falhas = [];
function ok(c, nome, extra) {
  if (c) { okN++; return; }
  koN++; falhas.push(nome + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  console.log('  ✗ ' + nome + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
}
function seccao(t) { console.log('\n▸ ' + t); }
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 0.01 : e);

/* ------------------------------------------------------------------ */
/* A · testes em Node puro: validador + dormência                      */
/* ------------------------------------------------------------------ */
function testesNode() {
  seccao('Validador de manifesto (Node)');
  const R = require(path.join(SITE, 'assets', 'rm-audio.js'));
  const base = { audio_id: 'semio2-b01', subject_slug: 'semiologia-ii', block_id: 'b01', theme: 'Tema', title: 'Título', duration: 300, order: 1, version: 'v1' };
  const v = o => R.validateItem(Object.assign({}, base, o));
  ok(v({}).ok, 'item válido aceite');
  ok(Object.keys(v({}).item).sort().join() === Object.keys(base).sort().join(), 'item guardado só tem os 8 campos');
  ok(Object.isFrozen(v({}).item), 'item é imutável');
  ok(R.validateItem(null).ok === false && R.validateItem([]).ok === false && R.validateItem('x').ok === false, 'não-objeto recusado');
  const bad = {
    'campo url': { url: 'x' }, 'campo src': { src: 'x' }, 'campo path': { path: 'x' }, 'campo token': { token: 'x' },
    'campo secret': { secret: 'x' }, 'campo signed_url': { signed_url: 'x' }, 'campo bucket': { bucket: 'audios' }, 'campo storage_path': { storage_path: 'a/b' },
    'campo desconhecido': { extra: 'x' },
    'título com https://': { title: 'ver https://x.test/a' },
    'título com storage/': { title: 'storage/v1/object/x' },
    'theme com .m4a': { theme: 'aula.m4a' },
    'theme com .mp3': { theme: 'aula.mp3' },
    'theme com supabase': { theme: 'abc.supabase.co' },
    'título com JWT': { title: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' },
    'título com bearer': { title: 'Bearer abcdef' },
    'título com ?token=': { title: 'a?token=zzz' },
    'título com ../': { title: '../segredo' },
    'título com caminho absoluto': { title: '/etc/passwd' },
    'título com blob:': { title: 'blob:http://x' },
    'título com data:': { title: 'data:audio/mp4;base64,AAAA' },
    'audio_id com espaço': { audio_id: 'a b' },
    'título vazio': { title: '  ' },
    'duration 0': { duration: 0 }, 'duration negativa': { duration: -1 }, 'duration NaN': { duration: NaN }, 'duration string': { duration: '300' },
    'duration gigante': { duration: 99999 },
    'order fracionária': { order: 1.5 }, 'order negativa': { order: -1 },
    'version vazia': { version: '' }, 'version com /': { version: 'a/b' },
    'título com controlo': { title: 'a\u0000b' }
  };
  Object.keys(bad).forEach(k => ok(v(bad[k]).ok === false, 'recusa ' + k, v(bad[k]).errors));
  ['audio_id', 'subject_slug', 'block_id', 'theme', 'title', 'duration', 'order', 'version'].forEach(k => {
    const o = Object.assign({}, base); delete o[k];
    ok(R.validateItem(o).ok === false, 'falta ' + k + ' ⇒ recusado');
  });
  ok(v({ version: 3 }).ok && v({ version: 3 }).item.version === '3', 'version numérica normalizada');
  const m = R.validateManifest([base, Object.assign({}, base, { audio_id: 'semio2-b02', order: 2 })]);
  ok(m.ok && m.items.length === 2, 'manifesto válido');
  const m2 = R.validateManifest([base, base]);
  ok(!m2.ok && m2.items.length === 1 && /repetido/.test(m2.errors.join()), 'audio_id repetido recusado');
  ok(!R.validateManifest({}).ok, 'manifesto não-lista recusado');

  seccao('Dormência (Node)');
  const htmls = [];
  (function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
      if (e.name === 'node_modules' || e.name === '.git') return;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (/\.(html?|netlify|toml)$/i.test(e.name) && !p.includes(path.join('tools', 'qa', 'browser-qa', 'audio'))) htmls.push(p);
    });
  })(SITE);
  ok(htmls.length > 0, 'encontrou HTML do site para verificar', htmls.length);
  const refs = htmls.filter(f => /rm-audio/i.test(fs.readFileSync(f, 'utf8')));
  ok(refs.length === 0, 'nenhuma página do site referencia rm-audio.*', refs);
  const scripts = ['rm-tools.js', 'rm-tools-v2.js', 'app-core.js', 'appcore.js'].map(f => path.join(SITE, 'assets', f)).filter(fs.existsSync);
  const refJs = scripts.filter(f => /rm-audio|RMAudio/.test(fs.readFileSync(f, 'utf8')));
  ok(refJs.length === 0, 'nenhum JS do site referencia o motor', refJs);
  const src = fs.readFileSync(path.join(SITE, 'assets', 'rm-audio.js'), 'utf8');
  const semComent = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|createClient|service_role|createSignedUrl|sendBeacon)\b|supabase\s*\.\s*(from|auth|storage|rpc)/i.test(semComent), 'código do motor não usa rede/Storage/Supabase/localStorage');
  ok(!/(window|document)\.addEventListener|root\.addEventListener/.test(semComent), 'motor não anexa listeners globais');
  const srcAssign = semComent.match(/\.src\s*=(?!=)/g) || [];
  ok(srcAssign.length === 2, 'atribuição de .src só em loadInto (+ limpeza em dropAdapter)', srcAssign.length);
}

/* ------------------------------------------------------------------ */
/* B · servidor estático local (só 127.0.0.1, só 4 ficheiros)          */
/* ------------------------------------------------------------------ */
function servidor() {
  const vistos = [];
  const srv = http.createServer((req, res) => {
    const u = req.url.split('?')[0];
    vistos.push(u);
    const r = ROUTES[u];
    if (!r) { res.writeHead(404); res.end('nope'); return; }
    res.writeHead(200, { 'content-type': r[1], 'cache-control': 'no-store' });
    res.end(fs.readFileSync(r[0]));
  });
  return new Promise(rs => srv.listen(0, '127.0.0.1', () => rs({ srv, vistos, port: srv.address().port })));
}

const GUARDS = `
(function () {
  window.__real = { audioCtor: 0, mediaPlay: 0, mediaLoad: 0, mediaSrc: 0 };
  var OrigAudio = window.Audio;
  window.Audio = function () { window.__real.audioCtor++; throw new Error('Audio real proibido na D1'); };
  var P = HTMLMediaElement.prototype;
  var play = P.play, load = P.load;
  P.play = function () { window.__real.mediaPlay++; return Promise.reject(new Error('mídia real proibida')); };
  P.load = function () { window.__real.mediaLoad++; };
  var d = Object.getOwnPropertyDescriptor(P, 'src');
  if (d && d.set) Object.defineProperty(P, 'src', { get: d.get, set: function () { window.__real.mediaSrc++; }, configurable: true });
  window.__mo = { created: 0, live: 0, dockLive: 0, opts: [] };   // dockLive: só os observers do data-rm-dock (o Playwright/página podem ter outros)
  var MO = window.MutationObserver;
  window.MutationObserver = function (cb) {
    var o = new MO(cb), on = false, obs = o.observe.bind(o), dis = o.disconnect.bind(o);
    window.__mo.created++;
    o.observe = function (t, opt) {
      var dock = !!(opt && opt.attributeFilter && opt.attributeFilter.indexOf('data-rm-dock') >= 0);
      if (!on) { on = true; o.__dock = dock; window.__mo.live++; if (dock) window.__mo.dockLive++; }
      window.__mo.opts.push({ root: t === document.documentElement, filter: opt && opt.attributeFilter && opt.attributeFilter.slice(), subtree: !!(opt && opt.subtree), childList: !!(opt && opt.childList), characterData: !!(opt && opt.characterData) });
      return obs(t, opt);
    };
    o.disconnect = function () { if (on) { on = false; window.__mo.live--; if (o.__dock) window.__mo.dockLive--; } return dis(); };
    return o;
  };
  window.MutationObserver.prototype = MO.prototype;
  window.__globalListeners = [];
  var add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t) {
    if (this === window || this === document || this === document.documentElement || this === document.body) window.__globalListeners.push(t + '@' + (new Error().stack || '').split('\\n').slice(2, 6).join(' | '));
    return add.apply(this, arguments);
  };
})();`;

const ITENS = [
  { audio_id: 'a1', subject_slug: 'semiologia-ii', block_id: 'b01', theme: 'Semiología II', title: 'Audio A · semiología cardiovascular', duration: 300, order: 1, version: 'v1' },
  { audio_id: 'b1', subject_slug: 'semiologia-ii', block_id: 'b02', theme: 'Semiología II', title: 'Audio B · semiología respiratoria', duration: 600, order: 2, version: 'v1' },
  { audio_id: 'c1', subject_slug: 'semiologia-ii', block_id: 'b03', theme: 'Semiología II', title: 'Audio C', duration: 90, order: 3, version: 'v1' }
];

async function novaPagina(browser, port, w, h, extra) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }, extra || {}));
  const page = await ctx.newPage();
  const reqs = [], erros = [];
  await page.addInitScript(GUARDS);
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    reqs.push(u.host + u.pathname);
    if (u.hostname !== '127.0.0.1') return route.abort();
    return route.continue();
  });
  page.on('pageerror', e => erros.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/404|ERR_FAILED|Failed to load resource/.test(m.text())) erros.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/harness.html`);
  await page.waitForFunction(() => window.RMAudio && window.__factory);
  return { ctx, page, reqs, erros };
}

const MK = o => window.__mk(o);   // definido em fake-audio.js
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const st = page => page.evaluate(() => window.E.getState());
const tick = (page, s) => page.evaluate(s => { var f = window.__fake.created[window.__fake.created.length - 1]; f.tick(s); return f._t; }, s);
const fakeInfo = page => page.evaluate(() => {
  var f = window.__fake, a = f.created;
  return { n: a.length, paused: a.map(x => x.paused), t: a.map(x => x._t), src: a.map(x => x._src), rate: a.map(x => x.playbackRate), plays: f.playCalls, assigned: f.srcAssignments.slice() };
});
const prov = page => page.evaluate(() => window.__provider.calls.slice());
const PLAY = (page, id) => page.evaluate(id => window.E.play(id), id);
const settle = page => page.evaluate(() => new Promise(r => setTimeout(r, 30)));

/* ------------------------------------------------------------------ */
/* C · testes funcionais no browser (1024)                             */
/* ------------------------------------------------------------------ */
async function funcionais(browser, port) {
  const { ctx, page, reqs, erros } = await novaPagina(browser, port, 1024, 768);
  const baseReqs = reqs.length;

  seccao('Dormência no browser');
  ok(await ev(page, () => typeof RMAudio === 'object' && !window.E), 'carregar rm-audio.js não cria motor nem elemento');
  ok(await ev(page, () => !document.querySelector('.rm-audio') && document.querySelector('#rm-l2-player').children.length === 0), 'nada montado no slot antes de attach');
  ok(await ev(page, () => window.__real.audioCtor === 0 && window.__fake.created.length === 0), 'nenhum Audio criado ao carregar');

  seccao('Metadados: 0 mídia, 0 fonte');
  await ev(page, MK);
  const r1 = await ev(page, it => window.E.loadMetadata(it), ITENS);
  ok(r1.ok && r1.accepted === 3, 'loadMetadata aceita os 3 itens', r1);
  let s = await st(page), fi = await fakeInfo(page);
  ok(s.counters.adapterCreated === 0 && !s.hasAdapter && fi.n === 0, 'metadados não criam elemento de áudio', s.counters);
  ok(fi.assigned.length === 0 && (await ev(page, () => window.__real.mediaSrc)) === 0, 'metadados não atribuem audio.src');
  ok((await prov(page)).length === 0 && s.counters.sourceRequests === 0, 'metadados não chamam o provider');
  ok(s.state === 'idle' && !s.open, 'estado idle e player fechado');
  const rbad = await ev(page, () => window.E.loadMetadata({ audio_id: 'x', subject_slug: 's', block_id: 'b', theme: 't', title: 'https://x.test/a.m4a', duration: 10, order: 1, version: 'v' }));
  ok(!rbad.ok && rbad.accepted === 0, 'metadado com URL recusado em loadMetadata');

  seccao('Slot: montar e falhar fechado');
  const antes = await ev(page, () => ({ body: document.body.innerHTML, style: document.documentElement.getAttribute('style'), slot: document.getElementById('rm-l2-player').outerHTML }));
  await ev(page, () => { var s = document.getElementById('rm-l2-player'); window.__slot = s; s.remove(); });
  ok((await ev(page, () => window.E.attach())) === false, 'attach() sem slot ⇒ false');
  ok((await ev(page, () => window.E.attach('#nao-existe'))) === false, 'attach(seletor inexistente) ⇒ false');
  ok((await ev(page, () => window.E.attach(null))) === false, 'attach(null) ⇒ usa seletor por omissão e falha');
  const depois = await ev(page, () => ({ body: document.body.innerHTML, style: document.documentElement.getAttribute('style') }));
  ok(antes.body.replace(antes.slot, '') === depois.body, 'falha de attach não altera o DOM');
  ok(antes.style === depois.style, 'falha de attach não altera <html style>');
  ok((await ev(page, () => window.E.play('a1'))) === false, 'sem player montado, play() recusa (nada de som sem controlos)');
  s = await st(page); fi = await fakeInfo(page);
  ok(s.state === 'error' && s.error.code === 'no-slot' && fi.n === 0 && (await prov(page)).length === 0, 'recusa sem criar elemento nem pedir fonte', s.error);
  await ev(page, () => document.body.appendChild(window.__slot));
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS);
  ok((await ev(page, () => window.E.attach())) === true, 'attach() com slot ⇒ true (seletor #rm-l2-player)');
  ok((await ev(page, () => window.E.attach())) === true && (await ev(page, () => document.querySelectorAll('.rm-audio').length)) === 1, 'attach repetido é idempotente (1 só player)');
  ok(await ev(page, () => document.querySelector('.rm-audio').hidden === true), 'player montado começa recolhido');
  await ev(page, () => { var d = document.createElement('div'); d.id = 'slot-tmp'; document.body.appendChild(d); });
  ok((await ev(page, () => window.E.attach('#slot-tmp'))) === true && (await ev(page, () => document.querySelectorAll('.rm-audio').length)) === 1 && await ev(page, () => document.querySelectorAll('#slot-tmp .rm-audio').length) === 1 && await ev(page, () => document.querySelectorAll('#rm-l2-player .rm-audio').length) === 0, 'attach a outro elemento move o player (continua 1)');
  await ev(page, () => { window.E.attach('#rm-l2-player'); document.getElementById('slot-tmp').remove(); });

  seccao('Primeiro play: fonte pedida UMA vez');
  ok((await PLAY(page, 'a1')) === true, 'play(a1) resolve true');
  s = await st(page); fi = await fakeInfo(page);
  let pc = await prov(page);
  ok(pc.length === 1 && pc[0].reason === 'first-play' && pc[0].id === 'a1', 'provider chamado 1× (first-play)', pc);
  ok(fi.assigned.length === 1 && /^synthetic:\/\/a1\//.test(fi.assigned[0]), 'audio.src atribuído 1× e só depois do play', fi.assigned);
  ok(s.state === 'playing' && s.open && s.counters.adapterCreated === 1, 'estado playing, player aberto, 1 adapter', s);
  ok(fi.paused[0] === false && near(fi.t[0], 0), 'começa em 0:00');
  ok(!JSON.stringify(s).match(/synthetic:|https?:|token/i), 'getState() nunca expõe a fonte');
  ok(await ev(page, () => !document.querySelector('.rm-audio').hidden && document.querySelector('.rm-audio__title').textContent.indexOf('Audio A') === 0), 'player visível com o título');

  seccao('Pause mantém posição e player aberto');
  await tick(page, 42);
  ok(await ev(page, () => window.E.pause()), 'pause() devolve true');
  s = await st(page); fi = await fakeInfo(page);
  ok(s.state === 'paused' && s.open, 'estado paused com player aberto');
  ok(near(s.position, 42) && near(fi.t[0], 42) && fi.paused[0] === true, 'posição 42 s mantida', s.position);
  ok(await ev(page, () => !document.querySelector('.rm-audio').hidden), 'player continua visível após pause');

  seccao('Continuar (mesmo audio_id)');
  ok((await PLAY(page, 'a1')) === true, 'play(a1) de novo');
  s = await st(page); fi = await fakeInfo(page); pc = await prov(page);
  ok(s.state === 'playing' && near(fi.t[0], 42), 'continua em 42 s', fi.t);
  ok(pc.length === 1 && fi.assigned.length === 1, 'sem novo pedido de fonte nem novo src', { pc: pc.length, src: fi.assigned.length });

  seccao('Close: guarda posição e recolhe');
  await tick(page, 8);
  ok(await ev(page, () => window.E.close()), 'close() devolve true');
  s = await st(page); fi = await fakeInfo(page);
  ok(!s.open && s.state === 'paused' && fi.paused[0] === true, 'close pausa e recolhe');
  ok(near(s.positions['a1@v1'], 50), 'posição 50 s guardada (não zerou)', s.positions);
  ok(await ev(page, () => document.querySelector('.rm-audio').hidden === true && document.getElementById('rm-l2-player').getAttribute('data-rm-audio') === 'closed'), 'UI recolhida e slot marcado closed');
  ok((await ev(page, () => document.getElementById('rm-l2-player').style.getPropertyValue('--rm-audio-h'))) === '0px', 'altura reservada volta a 0');

  seccao('Reabrir: volta ao ponto guardado');
  const playsAntes = (await fakeInfo(page)).plays;
  ok((await PLAY(page, 'a1')) === true, 'reabrir com play(a1)');
  s = await st(page); fi = await fakeInfo(page); pc = await prov(page);
  ok(s.open && s.state === 'playing' && near(fi.t[0], 50), 'retoma em 50 s', fi.t);
  ok(pc.length === 1 && fi.assigned.length === 1, 'fonte continua a mesma (sem novo pedido)');
  ok(fi.plays === playsAntes + 1, 'close nunca tocou sozinho: só o play explícito chamou play()', fi.plays);

  seccao('Restart: zero, pausado, sem autoplay');
  const pl = (await fakeInfo(page)).plays;
  ok(await ev(page, () => window.E.restart()), 'restart() devolve true');
  s = await st(page); fi = await fakeInfo(page);
  ok(s.state === 'paused' && fi.paused[0] === true && near(fi.t[0], 0) && near(s.position, 0), 'pausado em 0');
  ok(fi.plays === pl, 'restart não chama play()');
  ok(s.open, 'restart mantém o player aberto');
  await settle(page);
  ok((await fakeInfo(page)).paused[0] === true, 'continua pausado depois de esperar (sem autoplay)');
  ok((await PLAY(page, 'a1')) && near((await fakeInfo(page)).t[0], 0), 'play depois do restart começa do 0');

  seccao('±15 s com limites');
  await ev(page, () => window.E.seek(100));
  ok(near(await ev(page, () => window.E.skip(15)), 115) && near((await fakeInfo(page)).t[0], 115), '+15 ⇒ 115');
  ok(near(await ev(page, () => window.E.skip(-15)), 100), '−15 ⇒ 100');
  await ev(page, () => window.E.seek(5));
  ok(near(await ev(page, () => window.E.skip(-15)), 0), '−15 perto do início fica em 0 (não negativo)');
  await ev(page, () => window.E.seek(290));
  ok(near(await ev(page, () => window.E.skip(15)), 300), '+15 perto do fim fica na duração (300)');
  ok(near(await ev(page, () => window.E.seek(-50)), 0) && near(await ev(page, () => window.E.seek(9999)), 300), 'seek fora do intervalo é limitado a [0, duração]');
  ok(near(await ev(page, () => window.E.seek(NaN)), 0), 'seek(NaN) ⇒ 0');

  seccao('Cinco velocidades');
  for (const r of [1, 1.25, 1.5, 2, 2.5]) {
    ok(await ev(page, r => window.E.setRate(r), r) === true && (await fakeInfo(page)).rate[0] === r && (await st(page)).rate === r, 'velocidade ' + r + '×');
  }
  ok(await ev(page, () => window.E.setRate(3)) === false && await ev(page, () => window.E.setRate(0.5)) === false && await ev(page, () => window.E.setRate('x')) === false, 'velocidade fora da lista recusada');
  ok((await st(page)).rate === 2.5, 'rate não mudou com valores inválidos');
  ok((await ev(page, () => Array.from(document.querySelectorAll('.rm-audio__rate option')).map(o => o.value).join())) === '1,1.25,1.5,2,2.5', '<select> tem exatamente as 5 velocidades');
  ok(await ev(page, () => window.E.pause()) && (await ev(page, () => window.E.close())), 'pausa/fecha para o bloco seguinte');
  /* persistência na sessão */
  await ev(page, () => window.E.destroy());
  await ev(page, MK);
    await ev(page, () => { window.E.destroy(); window.E = RMAudio.create({ provider: window.__provider, audioFactory: window.__factory, userKey: 'u1' }); });
  ok((await st(page)).rate === 2.5, 'mesma sessão + mesmo utilizador: velocidade 2.5× lembrada');
  await ev(page, () => { window.E.destroy(); window.E = RMAudio.create({ provider: window.__provider, audioFactory: window.__factory, userKey: 'u2' }); });
  ok((await st(page)).rate === 1, 'outro utilizador não herda a velocidade');
  await ev(page, () => { window.E.destroy(); RMAudio.resetSession(); window.E = RMAudio.create({ provider: window.__provider, audioFactory: window.__factory, userKey: 'u1' }); });
  ok((await st(page)).rate === 1, 'resetSession() limpa a preferência');
  ok((await ev(page, () => JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage)]))) === '[[],[]]', 'nada em localStorage/sessionStorage');

  seccao('A → B: um só player');
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await PLAY(page, 'a1'); await tick(page, 77);
  ok(await PLAY(page, 'b1'), 'play(b1) com a1 a tocar');
  s = await st(page); fi = await fakeInfo(page); pc = await prov(page);
  ok(s.audio_id === 'b1' && s.state === 'playing', 'b1 a tocar');
  ok(fi.n === 1, 'um único elemento de áudio (motor único)', fi.n);
  ok(fi.paused.filter(p => !p).length === 1, 'nunca dois a tocar', fi.paused);
  ok(near(s.positions['a1@v1'], 77), 'posição de a1 guardada (77 s)', s.positions);
  ok(pc.length === 2 && pc[1].id === 'b1' && pc[1].reason === 'first-play', 'fonte de b1 pedida só agora');
  ok(/^synthetic:\/\/b1\//.test((await fakeInfo(page)).src[0]), 'elemento aponta para b1');
  ok(near(fi.t[0], 0), 'b1 começa em 0');
  ok(await PLAY(page, 'a1') && near((await fakeInfo(page)).t[0], 77), 'voltar a a1 retoma em 77 s');
  ok((await prov(page)).length === 2 && (await fakeInfo(page)).assigned.length === 3, 'a1 reaproveita a fonte já autorizada (sem novo pedido) mas o elemento único recarrega', { prov: (await prov(page)).length, src: (await fakeInfo(page)).assigned.length });
  ok(await ev(page, () => document.querySelectorAll('.rm-audio').length) === 1, 'UI continua a ser uma só');

  seccao('Exclusividade entre instâncias');
  await ev(page, () => {
    window.E2 = RMAudio.create({ provider: window.__provider, audioFactory: window.__factory, userKey: 'u1', headless: true });
    window.E2.loadMetadata(window.__ITENS2 = [{ audio_id: 'c1', subject_slug: 'semiologia-ii', block_id: 'b03', theme: 't', title: 'C', duration: 90, order: 3, version: 'v1' }]);
  });
  ok(await ev(page, () => window.E2.play('c1')), 'segunda instância toca c1');
  s = await st(page);
  ok(s.state === 'paused', 'a primeira instância foi pausada', s.state);
  const pausados = await ev(page, () => window.__fake.created.filter(x => !x.paused).length);
  ok(pausados === 1, 'só um elemento a tocar no runtime', pausados);
  await ev(page, () => window.E2.destroy());

  seccao('Erros');
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await ev(page, () => { window.__provider.failNext = 1; });
  ok((await PLAY(page, 'a1')) === false, 'provider em baixo ⇒ play() resolve false');
  s = await st(page);
  ok(s.state === 'error' && s.open && !!s.error, 'estado error, player aberto com aviso', s.error);
  ok(await ev(page, () => { var e = document.querySelector('.rm-audio__err'); return !e.hidden && e.getAttribute('role') === 'alert' && e.textContent.length > 5; }), 'aviso role=alert visível');
  ok((await fakeInfo(page)).assigned.length === 0, 'nenhum src atribuído numa falha de provider');
  ok((await PLAY(page, 'a1')) === true && (await st(page)).state === 'playing', 'nova tentativa funciona');
  ok(await ev(page, () => document.querySelector('.rm-audio__err').hidden), 'aviso some depois de recuperar');
  ok((await PLAY(page, 'nao-existe')) === false && (await st(page)).error.code === 'unknown-item', 'item desconhecido ⇒ erro');
  ok((await ev(page, () => window.E.play({ audio_id: 'z', title: 'sem campos' }))) === false && (await st(page)).error.code === 'invalid-item', 'item inválido direto em play() ⇒ erro');
  ok(await ev(page, () => window.E.play({ audio_id: 'z9', subject_slug: 's', block_id: 'b', theme: 't', title: 'x', duration: 10, order: 1, version: 'v', url: 'https://x.test/a.m4a' })) === false, 'item com campo url recusado em play()');

  /* fonte real recusada por omissão */
  await ev(page, () => window.E.destroy());
  await ev(page, MK, { provider: null });
  await ev(page, () => {
    window.E.destroy();
    window.E = RMAudio.create({ provider: { resolve: function () { return Promise.resolve({ src: 'https://cdn.example.test/a1.m4a' }); } }, audioFactory: window.__factory, userKey: 'u1' });
    window.E.loadMetadata(window.__ITEMS_TMP = [{ audio_id: 'a1', subject_slug: 's', block_id: 'b', theme: 't', title: 'A', duration: 300, order: 1, version: 'v1' }]);
    window.E.attach();
  });
  ok((await PLAY(page, 'a1')) === false && (await st(page)).error.code === 'source-rejected', 'URL real recusada por omissão (só synthetic://)');
  ok((await fakeInfo(page)).assigned.length === 0 && (await fakeInfo(page)).n === 0, 'fonte recusada nunca chega ao elemento (nem elemento foi criado)');
  await ev(page, () => window.E.destroy());
  await ev(page, () => { window.E = RMAudio.create({ audioFactory: window.__factory, userKey: 'u1' }); window.E.loadMetadata([{ audio_id: 'a1', subject_slug: 's', block_id: 'b', theme: 't', title: 'A', duration: 300, order: 1, version: 'v1' }]); window.E.attach(); });
  ok((await PLAY(page, 'a1')) === false && (await st(page)).error.code === 'no-provider', 'sem provider ⇒ erro no-provider');

  /* falha de carga persistente ⇒ erro, posição intacta, nova tentativa recarrega de raiz */
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await PLAY(page, 'a1'); await tick(page, 60); await PLAY(page, 'b1'); await ev(page, () => window.E.pause());
  await ev(page, () => { window.__fake.failLoad = 2; });
  ok((await PLAY(page, 'a1')) === false, 'carga de a1 falha duas vezes ⇒ play() resolve false');
  s = await st(page);
  ok(s.state === 'error' && s.open, 'estado error com o player aberto');
  ok((await prov(page)).filter(c => c.reason === 'expired').length === 1, 'tentou reautorizar UMA vez e parou');
  ok(near(s.positions['a1@v1'], 60), 'a falha não apagou a posição de a1 (60 s)', s.positions);
  ok((await PLAY(page, 'a1')) === true && (await st(page)).state === 'playing' && near((await fakeInfo(page)).t[0], 60), 'nova tentativa recarrega de raiz e retoma em 60 s');

  seccao('URL expirada + reautorização sem perder currentTime');
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await PLAY(page, 'a1'); await tick(page, 42);
  const srcAntes = (await fakeInfo(page)).src[0];
  await ev(page, () => window.__fake.created[0].expireNow());
  await settle(page);
  s = await st(page); fi = await fakeInfo(page); pc = await prov(page);
  ok(pc.length === 2 && pc[1].reason === 'expired', 'provider recebeu reason=expired', pc);
  ok(fi.src[0] !== srcAntes && /^synthetic:\/\/a1\/2/.test(fi.src[0]), 'nova fonte reautorizada no mesmo elemento', fi.src);
  ok(near(fi.t[0], 42, 0.5) && near(s.position, 42, 0.5), 'currentTime preservado (42 s) após reautorização', fi.t);
  ok(s.state === 'playing' && fi.paused[0] === false, 'volta a tocar sozinho do ponto certo (estava a tocar)');
  ok(s.counters.reauthorizations === 1 && s.counters.adapterCreated === 1, 'uma reautorização, mesmo elemento');
  ok(s.error === null, 'sem erro visível ao aluno');
  /* expirou em pausa */
  await ev(page, () => window.E.pause());
  await ev(page, () => window.__fake.created[0].expireNow());
  await settle(page);
  s = await st(page);
  ok(s.state === 'paused' && !s.error && near(s.position, 42, 0.5), 'expirar em pausa não incomoda nem perde posição', s);
  const p0 = (await prov(page)).length;
  ok(await PLAY(page, 'a1'), 'play depois de expirar em pausa');
  pc = await prov(page); fi = await fakeInfo(page);
  ok(pc.length === p0 + 1 && pc[pc.length - 1].reason === 'expired' && near(fi.t[0], 42, 0.5), 'reautoriza no play e retoma em 42 s', { n: pc.length, t: fi.t });
  /* expiresAt por relógio */
  await ev(page, () => window.E.destroy());
  await ev(page, () => {
    window.__fake.expired = {};
    var clock = { t: 1000 };
    window.__clock = clock;
    var prov2 = { calls: [], resolve: function (m, c) { prov2.calls.push(c.reason); return Promise.resolve({ src: 'synthetic://a1/clk' + prov2.calls.length, expiresAt: clock.t + 5000 }); } };
    window.__prov2 = prov2;
    window.E = RMAudio.create({ provider: prov2, audioFactory: window.__factory, userKey: 'u1', now: function () { return clock.t; } });
    window.E.loadMetadata([{ audio_id: 'a1', subject_slug: 's', block_id: 'b', theme: 't', title: 'A', duration: 300, order: 1, version: 'v1' }]);
    window.E.attach();
  });
  await PLAY(page, 'a1'); await tick(page, 30); await ev(page, () => window.E.pause());
  await ev(page, () => { window.__clock.t += 6000; });
  ok(await PLAY(page, 'a1') && await ev(page, () => window.__prov2.calls.join()) === 'first-play,expired', 'expiresAt vencido ⇒ reautoriza no play');
  ok(near((await fakeInfo(page)).t[(await fakeInfo(page)).n - 1], 30, 0.5), 'e retoma em 30 s');
  await ev(page, () => { window.__clock.t += 1000; window.E.pause(); });
  ok(await PLAY(page, 'a1') && await ev(page, () => window.__prov2.calls.length) === 2, 'fonte ainda válida ⇒ não pede de novo');

  seccao('Corridas: cancelar carga pendente');
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await ev(page, () => { window.__provider.delay = 120; });
  const pA = ev(page, () => window.E.play('a1'));
  await ev(page, () => window.E.pause());
  ok((await pA) === false, 'play cancelado por pause devolve false');
  await settle(page); await ev(page, () => new Promise(r => setTimeout(r, 200)));
  fi = await fakeInfo(page);
  ok(fi.plays === 0 && (await st(page)).state === 'paused', 'play cancelado nunca chega ao elemento', fi.plays);
  const pA2 = ev(page, () => window.E.play('a1')); const pB2 = ev(page, () => window.E.play('b1'));
  await Promise.all([pA2, pB2]); await ev(page, () => new Promise(r => setTimeout(r, 250)));
  s = await st(page); fi = await fakeInfo(page);
  ok(s.audio_id === 'b1' && s.state === 'playing' && fi.paused.filter(p => !p).length === 1, 'A→B rápido: só B toca', s.audio_id);

  seccao('Ganchos de arbitragem (não ligados a eventos globais)');
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  for (const h of ['subject-change', 'pause-request', 'exclusive']) {
    await PLAY(page, 'a1'); await tick(page, 5);
    await ev(page, h => window.E.handle(h), h);
    s = await st(page);
    ok(s.state === 'paused' && s.open && (await fakeInfo(page)).paused[0] === true, `handle('${h}') pausa e mantém o player`);
  }
  await PLAY(page, 'a1');
  await ev(page, () => window.E.handle('logout'));
  s = await st(page);
  ok(s.destroyed && s.state === 'idle' && !s.mounted && await ev(page, () => document.querySelectorAll('.rm-audio').length) === 0, "handle('logout') pausa e destrói");
  ok((await fakeInfo(page)).paused.every(p => p), 'nada a tocar após logout');
  ok(await ev(page, () => window.E.handle('nao-sei')) === false, 'gancho desconhecido é ignorado');
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await PLAY(page, 'a1');
  await ev(page, () => RMAudio.pauseAll('auscultacao'));
  ok((await st(page)).state === 'paused', 'RMAudio.pauseAll() pausa o que estiver a tocar');
  const gl = await ev(page, () => window.__globalListeners.filter(x => /rm-audio\.js/.test(x)));
  ok(gl.length === 0, 'o motor não anexou listeners globais (window/document)', gl);

  seccao('Destroy');
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await PLAY(page, 'a1'); await tick(page, 20);
  ok(await ev(page, () => window.E.destroy()), 'destroy() devolve true');
  s = await st(page); fi = await fakeInfo(page);
  ok(s.destroyed && !s.mounted && !s.hasAdapter && s.state === 'idle', 'estado limpo');
  ok(fi.paused[0] === true && fi.src[0] === '', 'elemento pausado e sem fonte', fi.src);
  ok(await ev(page, () => document.querySelectorAll('.rm-audio').length === 0 && !document.getElementById('rm-l2-player').hasAttribute('data-rm-audio') && !document.getElementById('rm-l2-player').style.getPropertyValue('--rm-audio-h') && !document.documentElement.style.getPropertyValue('--rm-audio-h')), 'UI e marcas removidas');
  ok(await ev(page, () => window.E.play('a1').then(r => r)) === false && (await ev(page, () => window.E.pause())) === false && (await ev(page, () => window.E.attach())) === false, 'depois de destroy nada funciona');
  ok(await ev(page, () => window.E.destroy()) === false, 'destroy repetido é inofensivo');
  fi = await fakeInfo(page);
  ok(fi.plays === 1, 'nenhum play depois do destroy');
  const ultimo = await ev(page, () => { var a = window.__fake.created[0]; a.tick(5); return a._t; });
  ok(near(ultimo, 20), 'eventos tardios do elemento já não mexem no motor');

  seccao('Fim do áudio');
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await PLAY(page, 'c1'); await tick(page, 100);
  s = await st(page);
  ok(s.state === 'paused' && near(s.position, 0) && s.open, 'terminou: pausado, posição 0, player aberto, sem repetir sozinho', s);

  seccao('Zero mídia real e zero rede');
  const real = await ev(page, () => window.__real);
  ok(real.audioCtor === 0 && real.mediaPlay === 0 && real.mediaLoad === 0 && real.mediaSrc === 0, 'nenhum Audio/HTMLMediaElement real usado', real);
  const permit = new Set(['127.0.0.1:' + port + '/harness.html', '127.0.0.1:' + port + '/fake-audio.js', '127.0.0.1:' + port + '/assets/rm-audio.js', '127.0.0.1:' + port + '/assets/rm-audio.css']);
  const extra = reqs.filter(r => !permit.has(r));
  ok(extra.length === 0, 'só pedidos aos 4 ficheiros locais do harness', extra);
  ok(reqs.length === baseReqs && reqs.length === 4, 'nenhum pedido novo durante todos os testes', reqs.length);
  ok(!reqs.some(r => /\.(m4a|mp3|aac|ogg|wav|webm|mp4)$/i.test(r)), 'nenhum pedido a ficheiro de áudio');
  ok(erros.length === 0, 'sem erros de página/consola', erros);
  ok((await ev(page, () => JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage)]))) === '[[],[]]', 'storage continua vazio no fim');
  await ctx.close();
}

/* ------------------------------------------------------------------ */
/* D · UI: larguras, overflow, teclado, a11y                           */
/* ------------------------------------------------------------------ */
const LARGURAS = [[320, 568], [390, 844], [768, 1024], [1024, 768], [1440, 900]];

async function ui(browser, port) {
  for (const [w, h] of LARGURAS) {
    seccao(`UI @ ${w}×${h}`);
    const { ctx, page, reqs, erros } = await novaPagina(browser, port, w, h, w <= 768 ? { hasTouch: true } : {});
    await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
    await ev(page, () => window.E.loadMetadata({ audio_id: 'longo', subject_slug: 's', block_id: 'b', theme: 'Semiología II · un tema con un nombre bastante largo', title: 'Un título larguísimo '.repeat(8).slice(0, 158), duration: 4000, order: 9, version: 'v1' }));
    const modoEsperado = w >= 1400 ? 'lateral' : 'bottom';
    const R = sel => page.evaluate(sel => { var e = document.querySelector(sel); if (!e) return null; var r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);

    ok((await ev(page, () => document.querySelector('.rm-audio').hidden)), 'recolhido antes de tocar');
    ok(await ev(page, () => document.documentElement.scrollWidth <= innerWidth), 'sem overflow horizontal antes de abrir');
    await PLAY(page, 'longo');
    await ev(page, () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const mode = await ev(page, () => document.querySelector('.rm-audio').getAttribute('data-mode'));
    ok(mode === modoEsperado, `modo ${modoEsperado} a ${w}px`, mode);
    const p = await R('.rm-audio');
    ok(p && p.w > 0 && p.h > 0, 'player visível');
    ok(p.l >= -0.5 && p.r <= w + 0.5 && p.t >= -0.5 && p.b <= h + 0.5, 'player totalmente dentro do viewport', p);
    ok(await ev(page, () => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth), 'sem overflow horizontal com o player aberto');
    ok(await ev(page, () => { var e = document.querySelector('.rm-audio'); return e.scrollWidth <= e.clientWidth + 1; }), 'título longo não transborda o player (ellipsis)');
    ok(await ev(page, () => { var t = document.querySelector('.rm-audio__title'); return getComputedStyle(t).textOverflow === 'ellipsis' && getComputedStyle(t).whiteSpace === 'nowrap'; }), 'título com ellipsis');
    const kids = await ev(page, () => Array.from(document.querySelectorAll('.rm-audio button, .rm-audio select, .rm-audio input')).map(b => { var r = b.getBoundingClientRect(), pr = document.querySelector('.rm-audio').getBoundingClientRect(); return { n: b.getAttribute('aria-label'), w: r.width, h: r.height, inside: r.left >= pr.left - 0.5 && r.right <= pr.right + 0.5 && r.top >= pr.top - 0.5 && r.bottom <= pr.bottom + 0.5 }; }));
    ok(kids.length === 7, '7 controlos (fechar, seek, reiniciar, −15, play, +15, velocidade)', kids.length);
    ok(kids.every(k => k.inside), 'todos os controlos dentro do player', kids.filter(k => !k.inside));
    ok(kids.filter(k => !/Posición/.test(k.n)).every(k => k.w >= 43.5 && k.h >= 43.5), 'alvos de toque ≥ 44 px', kids.filter(k => k.w < 43.5 || k.h < 43.5));
    const ctl = await ev(page, () => { var cs = Array.from(document.querySelectorAll('.rm-audio__ctl > *')).map(e => e.getBoundingClientRect()); for (var i = 1; i < cs.length; i++) if (cs[i].left < cs[i - 1].right - 0.5) return false; return true; });
    ok(ctl, 'controlos não se sobrepõem');

    if (modoEsperado === 'bottom') {
      ok(near(p.b, h, 1) && near(p.w, w, 1) && p.l <= 0.5, 'mini-player colado ao fundo em largura total', p);
      ok(p.h <= h * 0.30, 'mini-player ocupa ≤ 30 % da altura', { h: p.h, vh: h });
      await ev(page, () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      const fim = await R('#fim'), pp = await R('.rm-audio');
      ok(fim.b <= pp.t + 0.5, 'com o fim da página visível, o player não tapa o conteúdo', { fimB: fim.b, playerT: pp.t });
      const rv = await ev(page, () => parseFloat(document.documentElement.style.getPropertyValue('--rm-audio-h')));
      ok(near(rv, p.h, 1.5), '--rm-audio-h publicada = altura real do player', { rv, h: p.h });
      ok(await ev(page, () => parseFloat(getComputedStyle(document.body).paddingBottom) >= parseFloat(document.documentElement.style.getPropertyValue('--rm-audio-h')) - 1), 'body reserva o espaço do mini-player');
    } else {
      const tb = await R('#fake-toolbox'), cont = await R('#conteudo');
      ok(p.r <= tb.l || p.l >= tb.r || p.b <= tb.t || p.t >= tb.b, 'lateral não cobre a caixa de ferramentas da direita', { p, tb });
      ok(p.r <= cont.l + 0.5 || p.l >= cont.r - 0.5, 'lateral não cobre a coluna de conteúdo', { p, cont });
      ok(p.w <= 320 && p.h <= 200, 'lateral compacto (≤ 320×200)', p);
    }
    ok(await ev(page, () => { var r = document.styleSheets, t = ''; for (var i = 0; i < r.length; i++) try { t += Array.from(r[i].cssRules).map(x => x.cssText).join(); } catch (e) { } return /safe-area-inset-bottom/.test(t) && /safe-area-inset-left/.test(t) && /safe-area-inset-right/.test(t); }), 'CSS respeita safe-area (bottom/left/right)');
    ok(await ev(page, () => /viewport-fit=cover/.test(document.querySelector('meta[name=viewport]').content)), '(harness) viewport-fit=cover ativo');

    /* cliques reais na UI */
    await ev(page, () => { window.__fake.created[0].tick(0); });
    const clicar = async (a) => { const b = page.locator(`.rm-audio [data-a="${a}"]`); await b.click(); await page.evaluate(() => new Promise(r => setTimeout(r, 20))); };
    await ev(page, () => window.E.seek(100));
    await clicar('fwd'); ok(near((await st(page)).position, 115), 'botão +15 s');
    await clicar('back'); ok(near((await st(page)).position, 100), 'botão −15 s');
    await clicar('toggle'); ok((await st(page)).state === 'paused', 'botão play/pausa pausa');
    const pos0 = (await st(page)).position;
    await clicar('toggle'); ok((await st(page)).state === 'playing' && near((await st(page)).position, pos0, 0.5), 'botão play/pausa retoma no mesmo ponto');
    await clicar('restart'); const s0 = await st(page); ok(s0.state === 'paused' && near(s0.position, 0), 'botão reiniciar: 0 e pausado');
    await page.selectOption('.rm-audio__rate', '1.5'); ok((await st(page)).rate === 1.5, 'select de velocidade');
    await ev(page, () => window.E.seek(200));
    await clicar('close'); ok(!(await st(page)).open && near((await st(page)).positions['longo@v1'], 200), 'botão fechar guarda posição');
    ok(await ev(page, () => document.querySelector('.rm-audio').hidden), 'player recolhido');
    await PLAY(page, 'longo');

    /* teclado / a11y */
    const a11y = await ev(page, () => {
      var e = document.querySelector('.rm-audio');
      var rot = e.getAttribute('role') === 'region' && !!e.getAttribute('aria-label');
      var btns = Array.from(e.querySelectorAll('button')).every(b => b.getAttribute('aria-label'));
      var sel = !!e.querySelector('select').getAttribute('aria-label');
      var rg = e.querySelector('input[type=range]');
      return { rot: rot, btns: btns, sel: sel, rg: !!rg.getAttribute('aria-label') && /de/.test(rg.getAttribute('aria-valuetext')), time: e.querySelector('.rm-audio__time').getAttribute('aria-hidden') === 'true' };
    });
    ok(a11y.rot && a11y.btns && a11y.sel && a11y.rg, 'região/botões/select/range têm nome acessível e valuetext', a11y);
    if (w >= 768) {
      await ev(page, () => document.activeElement && document.activeElement.blur());
      const ordem = [];
      await page.focus('.rm-audio__close');
      for (let i = 0; i < 7; i++) { ordem.push(await ev(page, () => { var a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.tagName) : null; })); await page.keyboard.press('Tab'); }
      ok(ordem.join('|') === 'Cerrar el audiolibro|Posición del audio|Reiniciar desde el principio|Retroceder 15 segundos|Pausar|Avanzar 15 segundos|Velocidad de reproducción', 'ordem de Tab lógica', ordem);
      await page.focus('.rm-audio__main');
      const pl = (await fakeInfo(page)).plays;
      await page.keyboard.press('Enter'); await settle(page);
      ok((await st(page)).state === 'paused', 'Enter no botão pausa');
      await page.keyboard.press('Space'); await settle(page);
      ok((await st(page)).state === 'playing', 'Espaço no botão retoma');
      await page.focus('.rm-audio__seek');
      const p1 = (await st(page)).position;
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await settle(page);
      ok((await st(page)).position >= p1 && await ev(page, () => document.querySelector('.rm-audio__seek').getAttribute('aria-valuetext').length > 3), 'seek acessível por teclado (setas)');
      const foco = await ev(page, () => { document.querySelector('.rm-audio__main').focus(); var o = getComputedStyle(document.activeElement); return o.outlineStyle; });
      ok(foco !== 'none', 'foco visível nos botões', foco);
      await page.focus('.rm-audio__main');
      await page.keyboard.press('Escape'); await settle(page);
      ok(!(await st(page)).open && (await fakeInfo(page)).paused.every(p => p), 'Escape fecha e pausa');
    }
    ok(await ev(page, () => window.__real.mediaPlay === 0 && window.__real.audioCtor === 0), 'sem mídia real na UI');
    ok(erros.length === 0, 'sem erros de consola', erros);
    await ctx.close();
  }

  seccao('Troca dinâmica 1399 ↔ 1400 px (sem recarregar)');
  const { ctx, page } = await novaPagina(browser, port, 1399, 800);
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await PLAY(page, 'a1');
  const m = () => ev(page, () => document.querySelector('.rm-audio').getAttribute('data-mode'));
  ok(await m() === 'bottom', '1399 ⇒ inferior');
  await page.setViewportSize({ width: 1400, height: 800 }); await settle(page);
  ok(await m() === 'lateral', '1400 ⇒ lateral');
  await page.setViewportSize({ width: 390, height: 800 }); await settle(page);
  ok(await m() === 'bottom', '390 ⇒ inferior');
  ok((await st(page)).state === 'playing', 'reprodução não é interrompida pela mudança de layout');
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  ok(await ev(page, () => { var e = document.querySelector('.rm-audio'); return getComputedStyle(e).backgroundColor !== 'rgb(255, 255, 255)'; }), 'tema escuro aplica-se');
  await ctx.close();
}



/* ------------------------------------------------------------------ */
/* F · REGRESSÕES da auditoria 3a48e962 (motor sintético)               */
/* ------------------------------------------------------------------ */
const settleMs = (page, ms) => page.evaluate(ms => new Promise(r => setTimeout(r, ms)), ms);
const tryPlay = (page, id) => page.evaluate(async id => { try { return { threw: false, v: await window.E.play(id) }; } catch (e) { return { threw: true, msg: String(e && e.message || e) }; } }, id);
const PV = `(function () { window.__pv = { mode: 'ok', calls: 0, reasons: [], resolve: function (m, c) {
  this.calls++; this.reasons.push(c.reason);
  if (this.mode === 'sync') throw new Error('provider sincrono falhou');
  if (this.mode === 'rej4') return Promise.reject({ code: 4 });
  if (this.mode === 'rejExp') return Promise.reject({ code: 'SRC_EXPIRED' });
  if (this.mode === 'null') return null;
  return window.__provider.resolve(m, c);
} }; return true; })()`;
const mkPV = async (page) => { await page.evaluate(PV); await page.evaluate(() => { window.__mk({ provider: window.__pv }); }); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach()); };

async function regressoes(browser, port) {
  const { ctx, page, reqs, erros } = await novaPagina(browser, port, 1024, 768);

  seccao('Regressão 1 · seek()/skip() com o provider ainda pendente vale');
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await ev(page, () => { window.__provider.delay = 150; });
  let pa = ev(page, () => window.E.play('a1'));
  ok(near(await ev(page, () => window.E.seek(60)), 60), 'seek(60) com o provider pendente devolve 60');
  ok((await st(page)).state === 'loading' && near((await st(page)).position, 60), 'a interface já mostra 60 s enquanto carrega');
  ok((await pa) === true, 'play resolve true');
  let fi = await fakeInfo(page), s = await st(page);
  ok(near(fi.t[0], 60) && s.state === 'playing' && near(s.position, 60, 0.5), 'a reprodução começa em 60 s (não em 0)', { t: fi.t, pos: s.position });
  ok(fi.assigned.length === 1 && (await prov(page)).length === 1, 'fonte pedida 1× e src atribuído 1×');
  /* skip no mesmo cenário */
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await ev(page, () => { window.__provider.delay = 120; });
  pa = ev(page, () => window.E.play('a1'));
  await ev(page, () => { window.E.skip(15); window.E.skip(15); });
  await pa; fi = await fakeInfo(page);
  ok(near(fi.t[0], 30), 'skip(+15)×2 durante a espera ⇒ começa em 30 s', fi.t);
  /* seek DURANTE a carga do elemento (fonte já resolvida, loadedmetadata ainda não) */
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await ev(page, () => { window.__fake.autoLoad = false; });
  pa = ev(page, () => window.E.play('a1'));
  await ev(page, () => new Promise(r => { const t = setInterval(() => { if (window.__fake.srcAssignments.length) { clearInterval(t); r(); } }, 5); }));
  await ev(page, () => window.E.seek(45));
  await ev(page, () => window.__fake.created[0]._settle());
  ok((await pa) === true && near((await fakeInfo(page)).t[0], 45), 'seek(45) durante a carga do elemento ⇒ começa em 45 s', (await fakeInfo(page)).t);
  /* seek + pause enquanto pendente: nada toca, ponto guardado, depois retoma nele */
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await ev(page, () => { window.__provider.delay = 120; });
  pa = ev(page, () => window.E.play('a1'));
  await ev(page, () => { window.E.seek(60); window.E.pause(); });
  ok((await pa) === false, 'pause durante a espera cancela o play');
  await settleMs(page, 200);
  s = await st(page); fi = await fakeInfo(page);
  ok(s.state === 'paused' && fi.plays === 0 && near(s.positions['a1@v1'], 60), 'pause preserva o ponto 60 e nada toca', { st: s.state, plays: fi.plays });
  await ev(page, () => { window.__provider.delay = 0; });
  ok((await PLAY(page, 'a1')) === true && near((await fakeInfo(page)).t[0], 60), 'depois, play retoma em 60 s');
  /* restart enquanto pendente: fica em 0, pausado, sem autoplay */
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await ev(page, () => { window.__provider.delay = 120; });
  pa = ev(page, () => window.E.play('a1'));
  await ev(page, () => { window.E.seek(60); window.E.restart(); });
  await pa; await settleMs(page, 200);
  s = await st(page);
  ok(s.state === 'paused' && near(s.position, 0) && (await fakeInfo(page)).plays === 0, 'restart durante a espera ⇒ 0, pausado, sem autoplay');
  /* close enquanto pendente */
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await ev(page, () => { window.__provider.delay = 120; });
  pa = ev(page, () => window.E.play('a1'));
  await ev(page, () => { window.E.seek(60); window.E.close(); });
  await pa; await settleMs(page, 200);
  s = await st(page);
  ok(!s.open && near(s.positions['a1@v1'], 60) && (await fakeInfo(page)).plays === 0, 'close durante a espera: recolhe, guarda 60, nada toca');
  /* exclusividade com seek pendente: B assume, A não toca mais tarde */
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await ev(page, () => { window.__provider.delay = 100; });
  pa = ev(page, () => window.E.play('a1'));
  const pb = ev(page, () => window.E.play('b1'));
  await ev(page, () => window.E.seek(33));
  await Promise.all([pa, pb]); await settleMs(page, 200);
  s = await st(page); fi = await fakeInfo(page);
  ok(s.audio_id === 'b1' && near(fi.t[0], 33, 0.5) && fi.paused.filter(x => !x).length === 1, 'A→B com seek pendente: só B toca e o seek aplica-se ao item atual (B)', { id: s.audio_id, t: fi.t });
  ok(near(s.positions['a1@v1'] || 0, 0), 'o seek não contamina a posição de A');
  /* reautorização com seek enquanto o provider responde */
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await PLAY(page, 'a1'); await tick(page, 42);
  await ev(page, () => { window.__provider.delay = 120; window.__fake.created[0].expireNow(); });
  await ev(page, () => window.E.seek(10));
  await settleMs(page, 300);
  fi = await fakeInfo(page); s = await st(page);
  ok(s.state === 'playing' && near(fi.t[0], 10, 0.5), 'renovação da fonte retoma no ponto mais recente (10 s), não no antigo (42 s)', { t: fi.t, st: s.state });
  ok(s.counters.reauthorizations === 1 && (await prov(page)).some(c => c.reason === 'expired'), 'a renovação continua a funcionar (reason=expired)');

  seccao('Regressão 2 · provider lança ERRO SÍNCRONO');
  await mkPV(page);
  await ev(page, () => { window.__pv.mode = 'sync'; });
  let r = await tryPlay(page, 'a1');
  ok(!r.threw && r.v === false, 'play() não lança: resolve false', r);
  s = await st(page);
  ok(s.state === 'error' && s.error.code === 'source-failed', 'estado error/source-failed (não fica preso em loading)', { st: s.state, e: s.error });
  ok(s.open && s.hasAdapter === false && (await fakeInfo(page)).n === 0, 'player aberto para nova tentativa, sem elemento de áudio criado');
  ok(await ev(page, () => { const e = document.querySelector('.rm-audio__err'); return !e.hidden && e.textContent.length > 5; }), 'aviso visível ao aluno');
  ok(await ev(page, () => !document.querySelector('.rm-audio__main').matches('[aria-busy="true"]')), 'botão principal deixa de estar «ocupado»');
  await ev(page, () => { window.__pv.mode = 'ok'; });
  ok((await tryPlay(page, 'a1')).v === true && (await st(page)).state === 'playing', 'nova tentativa com o provider recuperado toca');
  /* outras formas de falha do provider */
  for (const m of ['rej4', 'rejExp', 'null']) {
    await mkPV(page);
    await ev(page, m => { window.__pv.mode = m; }, m);
    r = await tryPlay(page, 'a1'); s = await st(page);
    ok(!r.threw && r.v === false && s.state === 'error' && s.error.code === 'source-failed', `provider ${m}: error/source-failed`, { r, e: s.error });
    ok(await ev(page, () => window.__pv.calls === 1), `provider ${m}: sem reautorização em laço (1 chamada)`, await ev(page, () => window.__pv.reasons));
  }
  /* erro síncrono na REAUTORIZAÇÃO: mantém a posição */
  await mkPV(page);
  await PLAY(page, 'a1'); await tick(page, 42);
  await ev(page, () => { window.__pv.mode = 'sync'; window.__fake.created[0].expireNow(); });
  await settleMs(page, 100);
  s = await st(page);
  ok(s.state === 'error' && s.error.code === 'source-failed' && near(s.positions['a1@v1'], 42, 0.5), 'erro síncrono na renovação: error, ponto 42 s preservado', { st: s.state, pos: s.positions });
  await ev(page, () => { window.__pv.mode = 'ok'; });
  ok((await tryPlay(page, 'a1')).v === true && near((await fakeInfo(page)).t[0], 42, 0.5), 'recuperado: retoma em 42 s');
  /* factory e play() síncronos */
  await mkPV(page);
  await ev(page, () => { window.__fake.factoryThrows = 1; });
  r = await tryPlay(page, 'a1'); s = await st(page);
  ok(!r.threw && r.v === false && s.state === 'error', 'audioFactory lança: play() resolve false, estado error (não loading)', { r, st: s.state });
  ok((await tryPlay(page, 'a1')).v === true, 'e a tentativa seguinte toca');
  await mkPV(page);
  await ev(page, () => { window.__fake.playThrows = 1; });
  r = await tryPlay(page, 'a1'); s = await st(page);
  ok(!r.threw && r.v === false && s.state === 'error', 'audio.play() lança síncrono: error (não loading)', { r, st: s.state });
  ok((await tryPlay(page, 'a1')).v === true && (await st(page)).state === 'playing', 'e a tentativa seguinte toca');
  ok(erros.length === 0, 'nenhuma exceção escapou para a página (pageerror/console)', erros);
  ok(await ev(page, () => window.__real.mediaPlay === 0 && window.__real.audioCtor === 0), 'sem mídia real');
  ok(!reqs.some(x => /\.(m4a|mp3)$/.test(x)), 'sem pedidos de áudio');
  await ctx.close();
}

/* ------------------------------------------------------------------ */
/* E · INTEGRAÇÃO FUTURA COM A LAYOUT V2 (B1): data-rm-dock manda       */
/* ------------------------------------------------------------------ */
/* Mesma regra do `decidirDock` do rm-layout.js do B1 (coluna de texto CENTRADA: o espaço livre à direita do cartão
   é (R − 880)/2), só para o teste saber o que o B1 DECIDIRIA. O teste com o rm-layout.js REAL está no PR do dock. */
const B1K = { TEXT_COL: 880, RIGHT_RAIL: 67, PLAYER_W: 224, PLAYER_EDGE: 8, PLAYER_GAP: 8 };
const b1Left = lm => lm === 'docked' ? 264 : (lm === 'rail' ? 64 : 0);
const b1Dock = (w, lm) => {
  const left = b1Left(lm), R = w - left - B1K.RIGHT_RAIL, cardR = left + (R + Math.min(B1K.TEXT_COL, R)) / 2;
  return (w - B1K.RIGHT_RAIL - B1K.PLAYER_EDGE - B1K.PLAYER_W) >= cardR + B1K.PLAYER_GAP ? 'side' : 'bottom';
};
const b1Attrs = (page, lm, dock) => page.evaluate(o => {
  var h = document.documentElement; h.classList.add('rm-l2');
  h.setAttribute('data-rm-lmode', o.lm);
  if (o.dock) h.setAttribute('data-rm-dock', o.dock); else h.removeAttribute('data-rm-dock');
}, { lm, dock });
const frame = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const inter = (a, b) => a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5;
async function geom(page) {
  return page.evaluate(() => {
    const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const c = document.getElementById('conteudo'), cs = getComputedStyle(c), cr = c.getBoundingClientRect();
    const text = { l: cr.left + parseFloat(cs.paddingLeft), r: cr.right - parseFloat(cs.paddingRight), t: cr.top + parseFloat(cs.paddingTop), b: cr.bottom - parseFloat(cs.paddingBottom) };
    const hs = getComputedStyle(document.documentElement);
    return {
      p: R(document.querySelector('.rm-audio')), slot: R(document.getElementById('rm-l2-player')), side: R(document.getElementById('b1-side')),
      tools: R(document.getElementById('b1-tools')), diag: R(document.querySelector('.rm2-diag')), cont: R(c), text,
      leftW: hs.getPropertyValue('--rm-left-w').trim(), rightW: hs.getPropertyValue('--rm-right-w').trim(), playerH: hs.getPropertyValue('--rm-player-h').trim(),
      mode: document.querySelector('.rm-audio').getAttribute('data-mode'), layout: document.querySelector('.rm-audio').getAttribute('data-layout'),
      vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth
    };
  });
}
async function abrir(page) {
  await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
  await PLAY(page, 'a1'); await tick(page, 20); await frame(page);
}
/* invariantes comuns: player dentro do slot (horizontal), sem sobrepor sidebar/toolbox/diagnóstico */
function invariantes(g, rot) {
  const p = g.p;
  ok(p && p.w > 0, rot + ': player visível');
  ok(p.l >= g.slot.l - 0.5 && p.r <= g.slot.r + 0.5, rot + ': player dentro do slot #rm-l2-player (não escapa dele)', { p, slot: g.slot });
  ok(!inter(p, g.side) || g.side.w === 0, rot + ': não cobre a lateral esquerda', { p, side: g.side });
  ok(!inter(p, g.tools), rot + ': não cobre a toolbox da direita', { p, tools: g.tools });
  ok(!inter(p, g.diag), rot + ': não cobre o painel de diagnóstico da caneta', { p, diag: g.diag });
  ok(p.l >= -0.5 && p.r <= g.vw + 0.5 && p.b <= g.vh + 0.5 && p.t >= -0.5, rot + ': dentro do viewport', p);
  ok(g.sw <= g.vw, rot + ': sem overflow horizontal', { sw: g.sw, vw: g.vw });
}
function textoLivre(g, rot) { ok(!inter(g.p, { l: g.text.l, r: g.text.r, t: -1e6, b: 1e6 }), rot + ': não cobre a coluna de texto', { p: g.p, text: g.text }); }

async function integracaoB1(browser, port) {
  seccao('B1 · A) 1440 + lateral docked 264 ⇒ B1 diz bottom ⇒ D1 = bottom');
  {
    const { ctx, page, reqs, erros } = await novaPagina(browser, port, 1440, 900);
    const baseReqs = reqs.length;
    ok(b1Dock(1440, 'docked') === 'bottom', '(sanidade) a fórmula do B1 decide bottom a 1440 com lateral 264', b1Dock(1440, 'docked'));
    await b1Attrs(page, 'docked', 'bottom');
    ok((await ev(page, () => window.__real.audioCtor + window.__real.mediaSrc + window.__fake.created.length)) === 0, '0 mídia antes de play (com o B1 presente)');
    await abrir(page);
    let g = await geom(page);
    ok(g.mode === 'bottom' && g.layout === 'b1', 'D1 segue o B1: bottom (e não o breakpoint de 1400 ⇒ lateral)', { mode: g.mode, layout: g.layout });
    ok(g.leftW === '264px' && g.rightW === '67px', 'variáveis do B1 presentes: --rm-left-w 264px, --rm-right-w 67px', { l: g.leftW, r: g.rightW });
    invariantes(g, 'A');
    ok(near(g.p.l, 264, 1) && near(g.p.r, g.vw - 67, 1), 'inferior ocupa exatamente o slot: de --rm-left-w a --rm-right-w', { l: g.p.l, r: g.p.r });
    ok(near(g.p.b, g.vh, 1), 'encostado ao fundo');
    ok(near(parseFloat(g.playerH), g.p.h, 1.5) && near(g.slot.h, g.p.h, 1.5), '--rm-player-h do B1 = altura do player e o slot ganha essa altura', { playerH: g.playerH, p: g.p.h, slot: g.slot.h });
    ok(g.diag.b <= g.p.t + 0.5, 'o diagnóstico da caneta sobe acima do player (via --rm-player-h)', { diagB: g.diag.b, pT: g.p.t });
    await ev(page, () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    const fim = await page.evaluate(() => document.getElementById('fim').getBoundingClientRect().bottom), pt = (await geom(page)).p.t;
    ok(fim <= pt + 0.5, 'com o B1, o fim da página não fica sob o player (o B1 reserva pelo --rm-player-h)', { fim, pt });
    ok(await ev(page, () => parseFloat(getComputedStyle(document.body).paddingBottom) === 0), 'sem reserva duplicada: o rm-audio.css não põe padding no body quando há B1');
    ok(await ev(page, () => window.__mo.dockLive === 1), 'um único observer vivo', await ev(page, () => window.__mo));
    const o = (await ev(page, () => window.__mo.opts)).filter(x => x.filter);
    ok(o.length === 1 && o.every(x => x.root && x.filter && x.filter.join() === 'data-rm-dock' && !x.subtree && !x.childList && !x.characterData), 'observer restrito: só <html>, só o atributo data-rm-dock, sem subtree/childList', o);

    seccao('B1 · B) mesma viewport: docked ⇒ rail (dock bottom ⇒ side) sem reload');
    await ev(page, () => { window.__marker = 'mesma-pagina'; });
    const plays0 = (await fakeInfo(page)).plays, pos0 = (await st(page)).position;
    await page.setViewportSize({ width: 1600, height: 900 });
    ok(b1Dock(1600, 'docked') === 'bottom' && b1Dock(1600, 'rail') === 'side', '(sanidade) a 1600: lateral aberta ⇒ bottom, trilho ⇒ side', [b1Dock(1600, 'docked'), b1Dock(1600, 'rail')]);
    await b1Attrs(page, 'rail', 'side'); await frame(page);
    g = await geom(page);
    ok(g.mode === 'lateral' && g.layout === 'b1', 'D1 passou a lateral sem a viewport cruzar breakpoint', { mode: g.mode });
    ok(await ev(page, () => window.__marker === 'mesma-pagina'), 'sem recarregar a página');
    ok(g.leftW === '64px', 'B1: --rm-left-w 64px');
    invariantes(g, 'B');
    ok(near(g.p.r, g.slot.r - 8, 1), 'lateral encostado à borda direita do slot (= esquerda da toolbox), com a folga de 8 px do B1', { pr: g.p.r, sr: g.slot.r });
    ok(g.p.r <= g.tools.l + 0.5, 'com folga para a toolbox', { pr: g.p.r, tl: g.tools.l });
    ok(g.p.l > g.side.r + 100, 'afastado da lateral/trilho esquerdo');
    textoLivre(g, 'B (rail 1600)');
    ok(g.playerH === '0px' && near(g.slot.h, 0, 40), 'lateral não reserva espaço: --rm-player-h = 0', { playerH: g.playerH, slotH: g.slot.h });
    ok(g.p.w <= 240.5 && g.p.w >= 200, 'largura lateral = --rm-player-w do B1 (224 px; 240 sem variável)', g.p.w);
    const dentro = await ev(page, () => { const p = document.querySelector('.rm-audio').getBoundingClientRect(); return Array.from(document.querySelectorAll('.rm-audio button, .rm-audio select, .rm-audio input')).every(b => { const r = b.getBoundingClientRect(); return r.left >= p.left - 0.5 && r.right <= p.right + 0.5 && r.top >= p.top - 0.5 && r.bottom <= p.bottom + 0.5; }); });
    ok(dentro, 'todos os controlos cabem dentro do player lateral de 240 px');
    const s1 = await st(page);
    ok(s1.state === 'playing' && s1.position >= pos0 && (await fakeInfo(page)).plays === plays0, 'a reprodução não foi tocada pela mudança de layout (sem novo play, sem perder o ponto)', { s: s1.state, pos: s1.position });

    seccao('B1 · C) mesma viewport: side ⇒ bottom');
    await b1Attrs(page, 'docked', 'bottom'); await frame(page);
    g = await geom(page);
    ok(g.mode === 'bottom' && await ev(page, () => window.__marker === 'mesma-pagina'), 'acompanha side → bottom sem reload', g.mode);
    invariantes(g, 'C');
    ok(near(parseFloat(g.playerH), g.p.h, 1.5), '--rm-player-h volta a refletir a altura');
    await ev(page, () => { document.documentElement.setAttribute('data-rm-dock', 'side'); });
    ok((await ev(page, () => window.E.refreshLayout())) === 'lateral' && (await geom(page)).mode === 'lateral', 'refreshLayout() relê o dock na hora (síncrono)');
    await ev(page, () => { document.documentElement.setAttribute('data-rm-dock', 'bottom'); });
    ok((await ev(page, () => window.E.refreshLayout())) === 'bottom', 'refreshLayout() ⇒ bottom');
    ok((await st(page)).layout.source === 'b1', 'getState().layout.source = b1');

    seccao('B1 · D) 264 + 67 com lateral aberta: side só quando há folga real (1760)');
    await page.setViewportSize({ width: 1760, height: 900 });
    ok(b1Dock(1760, 'docked') === 'side', '(sanidade) B1 decide side a 1760 com lateral 264');
    await b1Attrs(page, 'docked', 'side'); await frame(page);
    g = await geom(page);
    ok(g.leftW === '264px' && g.rightW === '67px', 'variáveis 264/67', { l: g.leftW, r: g.rightW });
    ok(g.mode === 'lateral', 'lateral');
    invariantes(g, 'D'); textoLivre(g, 'D (1760 docked)');
    ok(g.p.l >= 264 && g.p.r <= g.vw - 67 + 0.5, 'player entre --rm-left-w e --rm-right-w', { l: g.p.l, r: g.p.r });
    ok(await ev(page, () => window.__real.mediaPlay === 0 && window.__real.audioCtor === 0), 'sem mídia real');
    ok(erros.length === 0, 'sem erros de consola', erros);
    ok(reqs.length === baseReqs && reqs.length === 4, 'sem pedidos além dos 4 ficheiros locais', reqs.length);
    await ctx.close();
  }

  seccao('B1 · E) trilho de 64 px');
  for (const [w, h] of [[1024, 768], [1600, 900], [900, 800]]) {
    const { ctx, page } = await novaPagina(browser, port, w, h);
    const dock = b1Dock(w, 'rail');
    await b1Attrs(page, 'rail', dock); await abrir(page);
    const g = await geom(page);
    ok(g.leftW === '64px', `E ${w}: --rm-left-w 64px`, g.leftW);
    ok(g.mode === (dock === 'side' ? 'lateral' : 'bottom'), `E ${w}: B1 diz ${dock} ⇒ D1 ${g.mode}`, g.mode);
    invariantes(g, `E ${w}`);
    ok(g.p.l >= 64 - 0.5 || g.p.w === 0, `E ${w}: nada por baixo do trilho (x ≥ 64)`, g.p.l);
    if (dock === 'side') textoLivre(g, `E ${w} (rail)`);
    await ctx.close();
  }

  seccao('B1 · F) celular: bottom + safe-area');
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, page } = await novaPagina(browser, port, w, h, { hasTouch: true });
    await b1Attrs(page, 'off', b1Dock(w, 'off')); await abrir(page);
    const g = await geom(page);
    ok(g.mode === 'bottom' && g.layout === 'b1', `F ${w}: bottom`, g.mode);
    ok(g.leftW === '0px' && g.rightW === '0px', `F ${w}: sem reservas laterais (drawer)`, { l: g.leftW, r: g.rightW });
    invariantes(g, `F ${w}`);
    ok(near(g.p.l, 0, 1) && near(g.p.r, g.vw, 1) && near(g.p.b, g.vh, 1), `F ${w}: barra inferior em largura total`, g.p);
    ok(near(parseFloat(g.playerH), g.p.h, 1.5), `F ${w}: --rm-player-h = altura`);
    const css = await ev(page, () => { let t = ''; for (const s of Array.from(document.styleSheets)) { try { t += Array.from(s.cssRules).map(x => x.cssText).join(); } catch (e) { } } return t; });
    ok(/data-layout="b1"\][^}]*data-mode="bottom"\][^}]*safe-area-inset-left/.test(css) && /data-mode="bottom"\][^}]*safe-area-inset-bottom/.test(css), `F ${w}: CSS do modo inferior usa env(safe-area-inset-*)`);
    ok(await ev(page, () => parseFloat(getComputedStyle(document.querySelector('.rm-audio')).paddingBottom) >= 6), `F ${w}: padding inferior ≥ 6 px (+ safe-area onde houver)`);
    const alvos = await ev(page, () => Array.from(document.querySelectorAll('.rm-audio button, .rm-audio select')).every(b => { const r = b.getBoundingClientRect(); return r.width >= 43.5 && r.height >= 43.5; }));
    ok(alvos, `F ${w}: alvos de toque ≥ 44 px`);
    await ctx.close();
  }

  seccao('B1 · G) sem data-rm-dock: fallback sintético continua testável');
  {
    const { ctx, page } = await novaPagina(browser, port, 1440, 900);
    await abrir(page);
    let g = await geom(page);
    ok(await ev(page, () => !document.documentElement.hasAttribute('data-rm-dock')), 'harness sem data-rm-dock');
    ok(g.mode === 'lateral' && g.layout === 'fallback' && (await st(page)).layout.source === 'fallback', 'sem B1 a 1440: fallback ⇒ lateral');
    await page.setViewportSize({ width: 1399, height: 900 }); await frame(page);
    ok((await geom(page)).mode === 'bottom', 'sem B1 a 1399: fallback ⇒ inferior');
    await page.setViewportSize({ width: 1440, height: 900 });
    await ev(page, () => document.documentElement.setAttribute('data-rm-dock', 'bottom')); await frame(page);
    ok((await geom(page)).mode === 'bottom' && (await geom(page)).layout === 'b1', 'com data-rm-dock=bottom o fallback NÃO prevalece (1440 ⇒ bottom)');
    await page.setViewportSize({ width: 390, height: 844 });
    await ev(page, () => document.documentElement.setAttribute('data-rm-dock', 'side')); await frame(page);
    ok((await geom(page)).mode === 'lateral', 'com data-rm-dock=side o fallback NÃO prevalece (390 ⇒ lateral, como o B1 mandar)');
    await ev(page, () => document.documentElement.setAttribute('data-rm-dock', 'lixo')); await frame(page);
    ok((await geom(page)).layout === 'fallback', 'valor inválido em data-rm-dock ⇒ ignorado, volta ao fallback');
    await page.setViewportSize({ width: 1440, height: 900 });
    await ev(page, () => document.documentElement.removeAttribute('data-rm-dock')); await frame(page);
    ok((await geom(page)).mode === 'lateral' && (await geom(page)).layout === 'fallback', 'B1 desmontado (atributo removido) ⇒ volta ao fallback sem recarregar');
    await ctx.close();
  }

  seccao('B1 · H) destroy/unmount: nada fica a observar');
  {
    const { ctx, page } = await novaPagina(browser, port, 1440, 900);
    await b1Attrs(page, 'docked', 'bottom'); await abrir(page);
    ok(await ev(page, () => window.__mo.dockLive === 1 && !document.getElementById('rm-l2-player').hidden), 'attached: 1 observer vivo e slot aberto');
    ok(await ev(page, () => document.documentElement.style.getPropertyValue('--rm-player-h') !== ''), '--rm-player-h publicada enquanto aberto');
    await ev(page, () => window.E.close());
    ok(await ev(page, () => document.getElementById('rm-l2-player').hidden === true), 'close: slot volta a hidden (como o B1 o deixou)');
    ok((await ev(page, () => document.documentElement.style.getPropertyValue('--rm-player-h'))) === '0px', 'close: --rm-player-h = 0 (o B1 devolve o espaço)');
    await PLAY(page, 'a1');
    await ev(page, () => window.E.destroy());
    const r = await ev(page, () => ({ live: window.__mo.dockLive, hidden: document.getElementById('rm-l2-player').hidden, ph: document.documentElement.style.getPropertyValue('--rm-player-h'), ah: document.documentElement.style.getPropertyValue('--rm-audio-h'), ui: document.querySelectorAll('.rm-audio').length }));
    ok(r.live === 0, 'destroy desliga o MutationObserver', r);
    ok(r.hidden === true && r.ph === '' && r.ah === '' && r.ui === 0, 'destroy devolve slot hidden, remove --rm-player-h/--rm-audio-h e a UI', r);
    const antes = await ev(page, () => document.documentElement.getAttribute('style') + '|' + document.getElementById('rm-l2-player').outerHTML);
    await ev(page, () => document.documentElement.setAttribute('data-rm-dock', 'side')); await frame(page);
    await ev(page, () => document.documentElement.setAttribute('data-rm-dock', 'bottom')); await frame(page);
    ok((await ev(page, () => document.documentElement.getAttribute('style') + '|' + document.getElementById('rm-l2-player').outerHTML)) === antes, 'mudar data-rm-dock depois do destroy não mexe em mais nada');
    /* re-attach a outro elemento desliga o observer antigo: nunca mais do que 1 vivo */
    await ev(page, MK); await ev(page, it => window.E.loadMetadata(it), ITENS); await ev(page, () => window.E.attach());
    await ev(page, () => { const d = document.createElement('div'); d.id = 'slot2'; document.body.appendChild(d); window.E.attach('#slot2'); });
    ok(await ev(page, () => window.__mo.dockLive === 1), 'attach a outro slot: continua 1 observer (o anterior saiu)', await ev(page, () => window.__mo));
    await ev(page, () => window.E.handle('logout'));
    ok(await ev(page, () => window.__mo.dockLive === 0), "handle('logout') também desliga o observer");
    const gl = await ev(page, () => window.__globalListeners.filter(x => /rm-audio\.js/.test(x)));
    ok(gl.length === 0, 'sem listeners globais criados pelo motor', gl);
    await ctx.close();
  }
}

(async () => {
  console.log('D1 · motor sintético rm-audio.js');
  testesNode();
  const { srv, vistos, port } = await servidor();
  const browser = await chromium.launch();
  try {
    await funcionais(browser, port);
    await ui(browser, port);
    await regressoes(browser, port);
    await integracaoB1(browser, port);
  } catch (e) { koN++; falhas.push('EXCEÇÃO: ' + (e && e.stack || e)); console.log('  ✗ EXCEÇÃO', e); }
  await browser.close(); srv.close();
  const fora = vistos.filter(u => !ROUTES[u]);
  if (fora.length) { koN++; falhas.push('servidor recebeu pedidos fora da lista: ' + fora.join()); }
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
})();
