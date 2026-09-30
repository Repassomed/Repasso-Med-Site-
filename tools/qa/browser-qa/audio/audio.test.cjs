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
  const antes = await ev(page, () => ({ body: document.body.innerHTML, style: document.documentElement.getAttribute('style') }));
  await ev(page, () => { var s = document.getElementById('rm-l2-player'); window.__slot = s; s.remove(); });
  ok((await ev(page, () => window.E.attach())) === false, 'attach() sem slot ⇒ false');
  ok((await ev(page, () => window.E.attach('#nao-existe'))) === false, 'attach(seletor inexistente) ⇒ false');
  ok((await ev(page, () => window.E.attach(null))) === false, 'attach(null) ⇒ usa seletor por omissão e falha');
  const depois = await ev(page, () => ({ body: document.body.innerHTML, style: document.documentElement.getAttribute('style') }));
  ok(antes.body.replace('<div id="rm-l2-player"></div>', '') === depois.body.replace('<div id="rm-l2-player"></div>', ''), 'falha de attach não altera o DOM');
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

(async () => {
  console.log('D1 · motor sintético rm-audio.js');
  testesNode();
  const { srv, vistos, port } = await servidor();
  const browser = await chromium.launch();
  try {
    await funcionais(browser, port);
    await ui(browser, port);
  } catch (e) { koN++; falhas.push('EXCEÇÃO: ' + (e && e.stack || e)); console.log('  ✗ EXCEÇÃO', e); }
  await browser.close(); srv.close();
  const fora = vistos.filter(u => !ROUTES[u]);
  if (fora.length) { koN++; falhas.push('servidor recebeu pedidos fora da lista: ' + fora.join()); }
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
})();
