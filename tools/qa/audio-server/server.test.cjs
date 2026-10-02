#!/usr/bin/env node
/* Autorização e entrega de audiobook no SERVIDOR — sem rede, sem Supabase real, sem áudio.
   `fetch` é um fake que imita /auth/v1/user e /storage/v1/object/sign. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const SITE = path.join(ROOT, 'Repasso-Med-Site--main', 'Atual - Copia');
const { criar, lerManifesto } = require(path.join(SITE, 'netlify', 'functions', '_audio', 'lib.js'));
const RMAudio = require(path.join(SITE, 'assets', 'rm-audio.js'));
const Provider = require(path.join(SITE, 'assets', 'rm-audio-provider.js'));

let okN = 0, koN = 0; const falhas = [];
const ok = (c, n, x) => { if (c) okN++; else { koN++; falhas.push(n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);

const SB = 'https://proj.supabase.co';
const SEGREDOS = ['SERVICE-SECRET', 'ANON-KEY', 'tok-jose', 'tok-other', 'uid-jose', 'UID-JOSE', 'audios/privado'];
const MANIFESTO = {
  'semiologia-ii': [
    { audio_id: 's2-b03-epoc', block_id: 's2-b03', theme: 'EPOC', title: 'EPOC', duration: 1800, order: 3, version: 'v1', path: 'semiologia-ii/audios/privado/epoc.v1.m4a', ready: true },
    { audio_id: 's2-b01-motivo', block_id: 's2-b01', theme: 'Motivo de consulta', title: 'Motivo de consulta', duration: 2400, order: 1, version: 'v1', path: 'semiologia-ii/audios/privado/motivo.v1.m4a', ready: true },
    { audio_id: 's2-b04-parenq', block_id: 's2-b04', theme: 'Parenquimatoso', title: 'Síndrome parenquimatoso', duration: 1500, order: 4, version: 'v1', path: 'semiologia-ii/audios/privado/parenq.v1.m4a', ready: true },
    { audio_id: 's2-b05-pleural', block_id: 's2-b05', theme: 'Pleural', title: 'Síndrome pleural', duration: 1700, order: 5, version: 'v1', path: 'semiologia-ii/audios/privado/pleural.v1.m4a', ready: false },
    /* lixo que NUNCA pode aparecer */
    { audio_id: 'mau-caminho', block_id: 'b', theme: 't', title: 'x', duration: 10, order: 6, version: 'v1', path: '../segredo.m4a', ready: true },
    { audio_id: 'mau-abs', block_id: 'b', theme: 't', title: 'x', duration: 10, order: 7, version: 'v1', path: '/etc/passwd', ready: true },
    { audio_id: 'mau-url', block_id: 'b', theme: 't', title: 'ver https://x.test/a', duration: 10, order: 8, version: 'v1', path: 'a/b.m4a', ready: true },
    { audio_id: 'mau-campo', block_id: 'b', theme: 't', title: 'x', duration: 10, order: 9, version: 'v1', path: 'a/c.m4a', ready: true, url: 'https://x.test/a.m4a' },
    { audio_id: 'mau-ready', block_id: 'b', theme: 't', title: 'x', duration: 10, order: 10, version: 'v1', path: 'a/d.m4a', ready: 'true' },
    { audio_id: 's2-b01-motivo', block_id: 's2-b01', theme: 'dup', title: 'duplicado', duration: 10, order: 11, version: 'v1', path: 'a/e.m4a', ready: true },
    { audio_id: 'mau-dur', block_id: 'b', theme: 't', title: 'x', duration: -5, order: 12, version: 'v1', path: 'a/f.m4a', ready: true }
  ]
};

/* fetch fake do Supabase */
function mkFetch(o) {
  o = o || {};
  const calls = [];
  const f = async function (url, init) {
    init = init || {}; calls.push({ url, init });
    if (o.throws) throw new Error('rede');
    if (url === SB + '/auth/v1/user') {
      const a = (init.headers || {}).Authorization || '';
      const map = { 'Bearer tok-jose': { id: ' UID-JOSE ' }, 'Bearer tok-other': { id: 'uid-outro' } };
      if (o.auth500) return { ok: false, status: 500, json: async () => ({}) };
      const u = map[a];
      return u ? { ok: true, status: 200, json: async () => u } : { ok: false, status: 401, json: async () => ({}) };
    }
    if (url.indexOf(SB + '/storage/v1/object/sign/audiobooks/') === 0) {
      if (o.sign500) return { ok: false, status: 500, json: async () => ({}) };
      const rel = url.slice((SB + '/storage/v1').length);
      if (o.signBody !== undefined) return { ok: true, status: 200, json: async () => o.signBody };
      return { ok: true, status: 200, json: async () => ({ signedURL: rel + '?token=eyJ.assinado.curto' }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  f.calls = calls;
  return f;
}
const ENV = { SUPABASE_URL: SB, SUPABASE_ANON_KEY: 'ANON-KEY', SUPABASE_SERVICE_ROLE_KEY: 'SERVICE-SECRET', RM_PILOT_AUDIO_UIDS: 'uid-jose', RM_AUDIO_MANIFEST: JSON.stringify(MANIFESTO) };
const H = (t, extra) => Object.assign({ httpMethod: 'GET', headers: t ? { authorization: 'Bearer ' + t } : {}, queryStringParameters: { slug: 'semiologia-ii' } }, extra || {});
const mk = (envOver, fo, now) => { const fetch = mkFetch(fo); return { h: criar({ env: Object.assign({}, ENV, envOver || {}), fetch, validateItem: RMAudio.validateItem, now }), fetch }; };
const forma = r => JSON.stringify({ s: r.statusCode, h: r.headers, b: r.body });

(async () => {
  const logs = []; const oe = console.error, ol = console.log;
  console.error = (...a) => logs.push(a.join(' '));

  sec('Manifesto (servidor): só PRONTOS, só metadado');
  {
    const { h } = mk();
    const r = await h.manifesto(H('tok-jose'));
    const j = JSON.parse(r.body);
    ok(r.statusCode === 200 && j.slug === 'semiologia-ii', '200 para o UID autorizado');
    ok(j.items.map(x => x.audio_id).join() === 's2-b01-motivo,s2-b03-epoc,s2-b04-parenq', 'só os 3 prontos, ordenados por `order` (pendente e lixo fora)', j.items.map(x => x.audio_id));
    ok(j.items.every(x => Object.keys(x).sort().join() === ['audio_id', 'block_id', 'duration', 'order', 'subject_slug', 'theme', 'title', 'version'].join()), 'cada item tem só os 8 campos públicos');
    ok(!/path|ready|supabase|storage|\.m4a|privado|SERVICE|https?:/i.test(r.body), 'o corpo não contém caminho, URL, bucket nem segredo', r.body.slice(0, 120));
    ok(r.headers['Cache-Control'] === 'no-store' && /json/.test(r.headers['Content-Type']) && r.headers['X-Content-Type-Options'] === 'nosniff', 'no-store, JSON, nosniff');
    ok(RMAudio.validateManifest(j.items).ok, 'o manifesto entregue passa no validador do motor');
  }
  sec('Manifesto: negações idênticas (sem revelar o motivo)');
  {
    const base = forma(await mk().h.manifesto(H(null)));
    const casos = {
      'sem token': [ENV, H(null)], 'token inválido': [ENV, H('tok-falso')], 'UID fora da lista': [ENV, H('tok-other')],
      'outra matéria': [ENV, Object.assign(H('tok-jose'), { queryStringParameters: { slug: 'biologia' } })], 'sem slug': [ENV, Object.assign(H('tok-jose'), { queryStringParameters: {} })],
      'POST': [ENV, H('tok-jose', { httpMethod: 'POST' })], 'sem lista de UIDs': [{ RM_PILOT_AUDIO_UIDS: '' }, H('tok-jose')], 'sem SUPABASE_URL': [{ SUPABASE_URL: '' }, H('tok-jose')],
      'sem ANON': [{ SUPABASE_ANON_KEY: '' }, H('tok-jose')]
    };
    for (const k of Object.keys(casos)) { const r = await mk(casos[k][0] === ENV ? {} : casos[k][0]).h.manifesto(casos[k][1]); ok(forma(r) === base && JSON.parse(r.body).items.length === 0, `negação idêntica: ${k}`); }
    for (const fo of [{ throws: true }, { auth500: true }]) { const r = await mk({}, fo).h.manifesto(H('tok-jose')); ok(forma(r) === base, `negação idêntica: Supabase ${fo.throws ? 'fora do ar' : '500'}`); }
    const r2 = await mk({ RM_AUDIO_MANIFEST: '' }).h.manifesto(H('tok-jose')); ok(JSON.parse(r2.body).items.length === 0 && r2.statusCode === 200, 'sem manifesto ⇒ vazio (recurso ausente = acesso ausente)');
    const r3 = await mk({ RM_AUDIO_MANIFEST: '{nao-json' }).h.manifesto(H('tok-jose')); ok(JSON.parse(r3.body).items.length === 0, 'manifesto inválido ⇒ vazio');
    const r4 = await mk({ RM_PILOT_AUDIO_UIDS: ' UID-JOSE , outro ' }).h.manifesto(H('tok-jose')); ok(JSON.parse(r4.body).items.length === 3, 'lista de UIDs tolera espaços/maiúsculas');
    const r5 = await mk({ RM_PILOT_AUDIO_UIDS: '' }).h.manifesto(H('tok-jose')); ok(JSON.parse(r5.body).items.length === 0, 'kill switch: esvaziar a variável desliga');
  }

  sec('get-audio-url: URL assinada só para o UID + audio_id do manifesto');
  {
    const T = 1_000_000;
    const { h, fetch } = mk({}, {}, () => T);
    const r = await h.assinar(H('tok-jose', { queryStringParameters: { slug: 'semiologia-ii', audio_id: 's2-b03-epoc' } }));
    const j = JSON.parse(r.body);
    ok(r.statusCode === 200 && Object.keys(j).sort().join() === 'audio_id,expiresAt,src', '200 com exatamente audio_id, src, expiresAt', Object.keys(j));
    ok(j.src.indexOf(SB + '/storage/v1/object/sign/audiobooks/semiologia-ii/audios/privado/epoc.v1.m4a?token=') === 0, 'src aponta para o NOSSO bucket, com token de assinatura', j.src);
    ok(j.expiresAt === T + 570_000, 'expiresAt = agora + (600 − 30) s', j.expiresAt);
    ok(Provider.allowSource(SB)(j.src), 'o predicado do provider aceita esta fonte');
    const sign = fetch.calls.find(c => c.url.indexOf('/object/sign/') > 0);
    ok(sign.init.method === 'POST' && JSON.parse(sign.init.body).expiresIn === 600, 'assinatura POST com expiresIn 600 s');
    ok(sign.init.headers.apikey === 'SERVICE-SECRET' && sign.init.headers.Authorization === 'Bearer SERVICE-SECRET', 'a service_role só vai ao Supabase (servidor → servidor)');
    const auth = fetch.calls.find(c => c.url.indexOf('/auth/v1/user') > 0);
    ok(auth.init.headers.apikey === 'ANON-KEY' && auth.init.headers.Authorization === 'Bearer tok-jose', 'a identidade foi validada pelo Supabase com o token do aluno');
    ok(!/SERVICE-SECRET|ANON-KEY|tok-jose|UID-JOSE/i.test(r.body) && !Object.values(r.headers).join().match(/SERVICE|tok-/), 'nenhum segredo/token/UID na resposta');
    ok(r.headers['Cache-Control'] === 'no-store', 'no-store');
    const { h: h3, fetch: f3 } = mk();
    await h3.assinar(H('tok-jose', { queryStringParameters: { slug: 'semiologia-ii', audio_id: 's2-b01-motivo', path: 'outro/arquivo.m4a', bucket: 'public', url: 'https://x.test/a', token: 'x' } }));
    ok(f3.calls.filter(c => c.url.indexOf('/object/sign/') > 0).length === 1 && f3.calls.find(c => c.url.indexOf('/object/sign/') > 0).url === SB + '/storage/v1/object/sign/audiobooks/semiologia-ii/audios/privado/motivo.v1.m4a', 'path/bucket/url/token vindos do cliente são ignorados: só vale o caminho do manifesto');
  }
  sec('get-audio-url: toda negação é idêntica (404 uniforme)');
  {
    const q = id => ({ slug: 'semiologia-ii', audio_id: id });
    const base = forma(await mk().h.assinar(H('tok-jose', { queryStringParameters: q('nao-existe') })));
    ok(JSON.parse(JSON.parse(base).b).error === 'unavailable' && JSON.parse(base).s === 404, 'forma da negação: 404 {error:"unavailable"}');
    const casos = {
      'sem token': [{}, H(null, { queryStringParameters: q('s2-b01-motivo') }), {}], 'token inválido': [{}, H('tok-falso', { queryStringParameters: q('s2-b01-motivo') }), {}],
      'UID fora da lista': [{}, H('tok-other', { queryStringParameters: q('s2-b01-motivo') }), {}], 'outra matéria': [{}, H('tok-jose', { queryStringParameters: { slug: 'biologia', audio_id: 's2-b01-motivo' } }), {}],
      'audio_id pendente (ready:false)': [{}, H('tok-jose', { queryStringParameters: q('s2-b05-pleural') }), {}], 'audio_id de item inválido': [{}, H('tok-jose', { queryStringParameters: q('mau-url') }), {}],
      'audio_id com ../': [{}, H('tok-jose', { queryStringParameters: q('../x') }), {}], 'audio_id com espaço': [{}, H('tok-jose', { queryStringParameters: q('a b') }), {}],
      'audio_id vazio': [{}, H('tok-jose', { queryStringParameters: q('') }), {}], 'audio_id ausente': [{}, H('tok-jose', { queryStringParameters: { slug: 'semiologia-ii' } }), {}],
      'audio_id gigante': [{}, H('tok-jose', { queryStringParameters: q('a'.repeat(500)) }), {}], 'POST': [{}, H('tok-jose', { httpMethod: 'POST', queryStringParameters: q('s2-b01-motivo') }), {}],
      'sem service_role': [{ SUPABASE_SERVICE_ROLE_KEY: '' }, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), {}],
      'sem lista de UIDs': [{ RM_PILOT_AUDIO_UIDS: '' }, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), {}],
      'sem manifesto': [{ RM_AUDIO_MANIFEST: '' }, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), {}],
      'Supabase auth fora': [{}, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), { throws: true }],
      'Supabase auth 500': [{}, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), { auth500: true }],
      'assinatura 500': [{}, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), { sign500: true }],
      'signedURL fora do bucket': [{}, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), { signBody: { signedURL: '/object/sign/publico/x.m4a?token=a' } }],
      'signedURL absoluta (outro host)': [{}, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), { signBody: { signedURL: 'https://evil.test/object/sign/audiobooks/x?token=a' } }],
      'signedURL com ..': [{}, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), { signBody: { signedURL: '/object/sign/audiobooks/../x?token=a' } }],
      'resposta sem signedURL': [{}, H('tok-jose', { queryStringParameters: q('s2-b01-motivo') }), { signBody: {} }]
    };
    for (const k of Object.keys(casos)) { const [e, ev, fo] = casos[k]; const r = await mk(e, fo).h.assinar(ev); ok(forma(r) === base, `negação idêntica: ${k}`, r.statusCode); }
  }

  sec('Nada sensível vai para o log');
  ok(!logs.join('\n').match(/tok-|UID|uid-|SERVICE|ANON|privado|\.m4a|supabase\.co/i), 'logs de erro sem token/UID/caminho/URL', logs.slice(0, 3));

  sec('Manifesto: leitura defensiva');
  {
    const v = RMAudio.validateItem;
    ok(lerManifesto('{"semiologia-ii": "x"}', v).length === 0 && lerManifesto('null', v).length === 0 && lerManifesto('[]', v).length === 0, 'formatos estranhos ⇒ vazio');
    ok(lerManifesto(JSON.stringify({ 'outra-materia': MANIFESTO['semiologia-ii'] }), v).length === 0, 'só a matéria do piloto é lida');
    ok(lerManifesto(JSON.stringify(MANIFESTO), v).every(x => x.path.indexOf('..') < 0 && x.path.indexOf('//') < 0 && x.path[0] !== '/'), 'caminhos sempre relativos e limpos');
  }

  sec('Handlers reais (sem variáveis de ambiente ⇒ tudo negado)');
  {
    delete process.env.SUPABASE_URL; delete process.env.RM_PILOT_AUDIO_UIDS;
    const a = await require(path.join(SITE, 'netlify', 'functions', 'get-audio-manifest.js')).handler(H('tok-jose'));
    const b = await require(path.join(SITE, 'netlify', 'functions', 'get-audio-url.js')).handler(H('tok-jose', { queryStringParameters: { slug: 'semiologia-ii', audio_id: 's2-b01-motivo' } }));
    ok(a.statusCode === 200 && JSON.parse(a.body).items.length === 0 && b.statusCode === 404, 'sem env: manifesto vazio e URL 404');
  }

  sec('Provider do cliente (rm-audio-provider.js)');
  {
    const ok1 = Provider.allowSource(SB);
    const P = 'https://proj.supabase.co/storage/v1/object/sign/audiobooks/';
    ok(ok1(P + 'semiologia-ii/x.m4a?token=abc'), 'aceita https do projeto, bucket audiobooks, rota sign');
    const nega = { 'outro host': 'https://evil.test/storage/v1/object/sign/audiobooks/x?token=a', 'http': 'http://proj.supabase.co/storage/v1/object/sign/audiobooks/x?token=a', 'outro bucket': 'https://proj.supabase.co/storage/v1/object/sign/publico/x?token=a',
      'rota pública': 'https://proj.supabase.co/storage/v1/object/public/audiobooks/x', 'sem objeto': P, '..': P + '../x', 'backslash': P + 'a\\b', 'espaço': P + 'a b', 'fragmento': P + 'a#b', 'blob': 'blob:https://proj.supabase.co/x', 'data': 'data:audio/mp4;base64,AAAA', 'javascript': 'javascript:alert(1)', 'synthetic': 'synthetic://a1/1', 'vazio': '', 'null': null, 'número': 5,
      'subdomínio colado': 'https://proj.supabase.co.evil.test/storage/v1/object/sign/audiobooks/x', 'credenciais': 'https://u:p@proj.supabase.co/storage/v1/object/sign/audiobooks/x' };
    for (const k of Object.keys(nega)) ok(!ok1(nega[k]), `recusa: ${k}`);
    ok(!Provider.allowSource('http://proj.supabase.co')(P + 'x') && !Provider.allowSource('')(P + 'x') && !Provider.allowSource('lixo')(P + 'x') && !Provider.allowSource('https://u:p@proj.supabase.co')(P + 'x'), 'config inválida/insegura ⇒ recusa tudo');

    const calls = [];
    const fe = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => url.indexOf('manifest') > 0 ? { items: [{ audio_id: 'a1', subject_slug: 'semiologia-ii', block_id: 'b', theme: 't', title: 'A', duration: 10, order: 1, version: 'v1' }, { audio_id: 'x', title: 'https://x.test/a.m4a' }] } : { src: P + 'a.m4a?token=t', expiresAt: 123 } }; };
    const pr = Provider.create({ fetch: fe, getToken: async () => 'tok-jose' });
    const res = await pr.resolve({ audio_id: 'a1' });
    ok(res.src === P + 'a.m4a?token=t' && res.expiresAt === 123, 'resolve devolve {src, expiresAt}');
    ok(calls[0].url === '/.netlify/functions/get-audio-url?slug=semiologia-ii&audio_id=a1' && calls[0].init.method === 'GET', 'pede só slug + audio_id (sem caminho, sem bucket)');
    ok(calls[0].init.headers.Authorization === 'Bearer tok-jose' && calls[0].url.indexOf('tok-jose') < 0, 'token no cabeçalho, nunca na URL');
    ok(calls[0].init.cache === 'no-store' && calls[0].init.credentials === 'omit', 'no-store, sem cookies');
    const man = await pr.loadManifest();
    ok(man.length === 1 && man[0].audio_id === 'a1', 'loadManifest devolve só metadado válido (o item com URL é descartado)', man);
    const semSessao = Provider.create({ fetch: fe, getToken: async () => '' });
    let erro = null; try { await semSessao.resolve({ audio_id: 'a1' }); } catch (e) { erro = e; }
    ok(!!erro, 'sem sessão: rejeita (o motor mostra erro)');
    const f500 = Provider.create({ fetch: async () => ({ ok: false }), getToken: async () => 't' });
    erro = null; try { await f500.resolve({ audio_id: 'a1' }); } catch (e) { erro = e; }
    ok(!!erro, 'HTTP erro: rejeita');
    const fbad = Provider.create({ fetch: async () => ({ ok: true, json: async () => ({}) }), getToken: async () => 't' });
    erro = null; try { await fbad.resolve({ audio_id: 'a1' }); } catch (e) { erro = e; }
    ok(!!erro, 'resposta sem src: rejeita');
  }

  sec('Motor + provider (adapter sintético, sem rede): a fonte só aparece no play e só se for do nosso bucket');
  {
    const P = SB + '/storage/v1/object/sign/audiobooks/';
    function FakeA() { const et = new EventTarget(); this.addEventListener = (n, f) => et.addEventListener(n, f); this.removeEventListener = (n, f) => et.removeEventListener(n, f); this.paused = true; this.duration = NaN; this._t = 0; this.srcLog = [];
      Object.defineProperty(this, 'currentTime', { get: () => this._t, set: v => { this._t = v; } });
      Object.defineProperty(this, 'src', { get: () => this._s, set: v => { this._s = v; this.srcLog.push(v); this.duration = 100; setTimeout(() => et.dispatchEvent(new Event('loadedmetadata')), 0); } });
      this.load = () => { }; this.play = () => { this.paused = false; return Promise.resolve(); }; this.pause = () => { this.paused = true; }; }
    const criados = [];
    const item = { audio_id: 'a1', subject_slug: 'semiologia-ii', block_id: 's2-b01', theme: 't', title: 'A', duration: 100, order: 1, version: 'v1' };
    let hits = 0;
    const prov = Provider.create({ fetch: async () => { hits++; return { ok: true, json: async () => ({ src: P + 'x.m4a?token=t', expiresAt: 0 }) }; }, getToken: async () => 'tok' });
    const E = RMAudio.create({ provider: prov, audioFactory: () => { const a = new FakeA(); criados.push(a); return a; }, allowSource: Provider.allowSource(SB), headless: true, userKey: 'u' });
    E.loadMetadata(item);
    ok(hits === 0 && criados.length === 0, 'antes do play: 0 pedidos ao servidor, 0 elemento de áudio');
    ok(await E.play('a1') === true && hits === 1 && criados[0].srcLog.join() === P + 'x.m4a?token=t', 'play pede 1× e atribui a URL assinada do nosso bucket');
    E.destroy();
    const evil = Provider.create({ fetch: async () => ({ ok: true, json: async () => ({ src: 'https://evil.test/a.m4a' }) }), getToken: async () => 'tok' });
    const c2 = [];
    const E2 = RMAudio.create({ provider: evil, audioFactory: () => { const a = new FakeA(); c2.push(a); return a; }, allowSource: Provider.allowSource(SB), headless: true, userKey: 'u2' });
    E2.loadMetadata(item);
    ok(await E2.play('a1') === false && E2.getState().error.code === 'source-rejected' && c2.length === 0, 'fonte de outro host: recusada pelo motor; o elemento nem é criado');
    E2.destroy();
  }

  sec('Migration do bucket (não aplicada): guarda estática — o teste REAL em PostgreSQL é migration.test.cjs');
  {
    const sql = fs.readFileSync(path.join(SITE, 'supabase', 'migrations', '20260930_01_audiobooks_bucket_privado.sql'), 'utf8').replace(/--.*$/gm, '');
    ok(/insert into storage\.buckets/i.test(sql) && /'audiobooks'/.test(sql) && /public\s*=\s*false/i.test(sql) && !/public\s*=\s*true/i.test(sql), 'cria/corrige o bucket `audiobooks` com public = false');
    ok((sql.match(/create\s+policy/gi) || []).length === 1 && /as\s+restrictive/i.test(sql) && !/as\s+permissive|grant\s/i.test(sql), 'UMA só policy, RESTRICTIVE (só nega, nunca concede) — sem acesso direto por anon/authenticated');
    ok(/file_size_limit/.test(sql) && /audio\/mp4/.test(sql) && /on conflict \(id\) do update/i.test(sql) && !/do\s+nothing/i.test(sql), 'limite de tamanho e só M4A, sempre repostos (DO UPDATE, nunca DO NOTHING)');
    const rb = fs.readFileSync(path.join(SITE, 'supabase', 'migrations', '20260930_01_audiobooks_bucket_privado_rollback.sql'), 'utf8');
    const rbc = rb.replace(/--.*$/gm, '');
    ok(/delete\s+from\s+storage\.buckets\s+where\s+id\s*=\s*'audiobooks'/i.test(rbc) && !/delete\s+from\s+storage\.objects/i.test(rbc), 'rollback REAL: DELETE só do bucket audiobooks, nunca de objetos');
    ok(/drop policy if exists audiobooks_deny_direct_access on storage\.objects/i.test(rbc), 'rollback remove só a barreira própria, pelo nome exato');
  }

  sec('Dormência');
  {
    const refs = [];
    (function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { if (e.name === 'node_modules' || e.name === '.git') return; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(html?|toml)$/i.test(e.name) && !p.includes('materias-privadas') || e.name === 'index.html') { if (/rm-audio|get-audio/i.test(fs.readFileSync(p, 'utf8'))) refs.push(p); } }); })(SITE);
    ok(refs.length === 0, 'nenhum HTML/toml do site referencia rm-audio* nem get-audio*', refs);
    const fn = fs.readFileSync(path.join(SITE, 'netlify', 'functions', '_audio', 'lib.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    ok(!/console\.log|\.m4a/.test(fn) && /console\.error\('get-audio-(manifest|url)', e && e\.name\)/.test(fn), 'o servidor só regista o NOME do erro (nunca mensagem, UID, token ou caminho)');
  }

  console.error = oe; console.log = ol;
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
})();
