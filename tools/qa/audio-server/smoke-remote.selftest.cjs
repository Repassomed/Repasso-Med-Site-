#!/usr/bin/env node
/* Autoteste do smoke-remote.cjs: sobe as funções REAIS (lib.js) atrás de um servidor HTTP local com um «Supabase» falso
   (auth + storage sign + objeto com Range + expiração) e executa os modos on/off/deny, incluindo a URL antiga depois do
   desligamento (válida até expirar, depois 403). Sem rede externa. */
'use strict';
const http = require('http'), cp = require('child_process'), path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..', '..'), SITE = path.join(ROOT, 'Repasso-Med-Site--main', 'Atual - Copia');
const { criar } = require(path.join(SITE, 'netlify', 'functions', '_audio', 'lib.js'));
const RMAudio = require(path.join(SITE, 'assets', 'rm-audio.js'));
let okN = 0, koN = 0; const ok = (c, n, x) => { if (c) okN++; else { koN++; console.log('  ✗ ' + n + (x ? ' → ' + x : '')); } };

const MAN = JSON.stringify({ 'semiologia-ii': [{ audio_id: 's2-b01-motivo', block_id: 's2-b01', theme: 'Motivo', title: 'Motivo de consulta', duration: 100, order: 1, version: 'v1', path: 'semiologia-ii/motivo.v1.m4a', ready: true }] });
let relogio = 1_000_000, ligado = true, semRange = false;
const emitidas = {};          // token de assinatura → expira em
(async () => {
  let base = '';
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const enviar = (s, corpo, h) => { res.writeHead(s, Object.assign({ 'content-type': 'application/json' }, h || {})); res.end(typeof corpo === 'string' ? corpo : JSON.stringify(corpo)); };
    if (u.pathname.startsWith('/.netlify/functions/')) {
      const nome = u.pathname.split('/').pop();
      const env = { SUPABASE_URL: base + '/sb', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'svc', RM_PILOT_AUDIO_UIDS: ligado ? 'uid-jose' : '', RM_AUDIO_MANIFEST: ligado ? MAN : '' };
      const h = criar({ env, fetch: (url, init) => fetch(url, init), validateItem: RMAudio.validateItem, now: () => relogio });
      const ev = { httpMethod: req.method, headers: req.headers, queryStringParameters: Object.fromEntries(u.searchParams) };
      const r = await (nome === 'get-audio-manifest' ? h.manifesto(ev) : h.assinar(ev));
      return enviar(r.statusCode, r.body, r.headers);
    }
    if (u.pathname === '/sb/auth/v1/user') { const t = (req.headers.authorization || '').replace('Bearer ', ''); return t === 'tok-jose' ? enviar(200, { id: 'uid-jose' }) : t === 'tok-outro' ? enviar(200, { id: 'uid-outro' }) : enviar(401, {}); }
    if (req.method === 'POST' && u.pathname.startsWith('/sb/storage/v1/object/sign/audiobooks/')) { const tk = 'T' + Object.keys(emitidas).length; emitidas[tk] = relogio + 600_000; return enviar(200, { signedURL: u.pathname.replace('/sb/storage/v1', '') + '?token=' + tk }); }
    if (u.pathname.startsWith('/sb/storage/v1/object/sign/')) {
      const tk = u.searchParams.get('token'); if (!emitidas[tk] || relogio > emitidas[tk]) return enviar(400, { error: 'expired' });
      const TOTAL = 20000, m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
      if (!m || semRange) { res.writeHead(200, { 'content-type': 'audio/mp4' }); return res.end(Buffer.alloc(TOTAL)); }     // servidor SEM suporte a Range
      const a = +m[1], b = m[2] === '' ? TOTAL - 1 : Math.min(+m[2], TOTAL - 1);
      res.writeHead(206, { 'content-type': 'audio/mp4', 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${TOTAL}` }); return res.end(Buffer.alloc(b - a + 1));
    }
    return enviar(404, {});
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); base = 'http://127.0.0.1:' + srv.address().port;
  const SM = path.join(__dirname, 'smoke-remote.cjs');
  /* assíncrono: o servidor está neste mesmo processo, spawnSync o travaria */
  const run = (modo, env, extra) => new Promise(rs => {
    const p = cp.spawn('node', [SM, modo].concat(extra || []), { env: Object.assign({}, process.env, { RM_BASE: base, RM_TOKEN: '', RM_AUDIO_ID: '' }, env) });
    let o = ''; p.stdout.on('data', d => { o += d; }); p.stderr.on('data', d => { o += d; });
    p.on('close', c => rs({ c, o }));
  });
  const tmp = path.join(require('os').tmpdir(), 'rm-smoke-src.txt');

  let r = await run('on', { RM_TOKEN: 'tok-jose', RM_AUDIO_ID: 's2-b01-motivo' }, ['--save-src', tmp]);
  ok(r.c === 0, 'LIGADO + conta do piloto ⇒ passa', r.o);
  ok(!/tok-jose|token=T/.test(r.o) && !/svc|anon/.test(r.o), 'o relatório não imprime token nem URL assinada');
  ok(fs.existsSync(tmp) && (fs.statSync(tmp).mode & 0o777) === 0o600, 'a URL guardada fica em arquivo 0600');
  r = await run('deny', { RM_TOKEN: 'tok-outro' }); ok(r.c === 0 && /VAZIO/.test(r.o), 'outra conta ⇒ manifesto vazio e 404 uniforme', r.o);
  r = await run('deny', {}); ok(r.c === 0, 'sem token ⇒ negado');
  r = await run('on', { RM_TOKEN: 'tok-outro', RM_AUDIO_ID: 's2-b01-motivo' }); ok(r.c === 1, 'modo on com OUTRA conta reprova (o smoke detecta acesso indevido/ausente)');

  semRange = true;
  r = await run('on', { RM_TOKEN: 'tok-jose', RM_AUDIO_ID: 's2-b01-motivo' }); ok(r.c === 1 && /Range 206 estrito/.test(r.o), 'Storage que devolve 200 em vez de 206 REPROVA (Safari/iOS não buscaria posição)', r.o);
  semRange = false;
  ok((await run('expirada', {}, ['--src', tmp])).c === 1, 'expirada com a URL ainda NOVA (< 10 min) reprova: não prova nada');
  fs.utimesSync(tmp, new Date(Date.now() - 700_000), new Date(Date.now() - 700_000));
  r = await run('expirada', { RM_TOKEN: 'tok-jose', RM_AUDIO_ID: 's2-b01-motivo' }, ['--src', tmp]); ok(r.c === 1, 'URL ainda válida no relógio do servidor ⇒ expirada reprova', r.o);
  relogio += 700_000;                               // o servidor também passou o TTL
  r = await run('expirada', { RM_TOKEN: 'tok-jose', RM_AUDIO_ID: 's2-b01-motivo' }, ['--src', tmp]); ok(r.c === 0 && /reautoriza/.test(r.o), 'URL expirada: recusada pelo Storage e o servidor emite URL nova', r.o);
  relogio -= 700_000;
  ligado = false;                                   // «esvaziou a variável e fez o redeploy»
  relogio += 120_000;                               // 2 min depois da emissão
  r = await run('off', { RM_TOKEN: 'tok-jose' }, ['--old-src', tmp]);
  ok(r.c === 0 && /AINDA VÁLIDA/.test(r.o), 'DESLIGADO: manifesto vazio + 404; a URL emitida antes AINDA vale (limite documentado)', r.o);
  relogio += 600_000;                               // passou o TTL
  r = await run('off', { RM_TOKEN: 'tok-jose' }, ['--old-src', tmp]);
  ok(r.c === 0 && /expirada\/recusada/.test(r.o), 'depois do prazo a URL antiga é recusada', r.o);
  ligado = true;
  r = await run('off', { RM_TOKEN: 'tok-jose' }); ok(r.c === 1, 'modo off com o sistema LIGADO reprova (desligamento não teria funcionado)');
  try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }
  srv.close();
  console.log(`\n${okN} verificações OK · ${koN} falhas`); process.exit(koN ? 1 : 0);
})();
