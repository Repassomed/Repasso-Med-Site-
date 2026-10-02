/* Servidor HTTPS local (certificado autoassinado, só 127.0.0.1) para os testes de integração do audiobook.
   Serve: o harness (com a matéria REAL Semiología II e os 6 sons de ausculta REAIS), os assets do site que o audiobook usa,
   as funções REAIS (`_audio/lib.js`) atrás de um «Supabase» falso em memória, e o ÁUDIO (gerado com ffmpeg, mp3/ogg: o
   Chromium do Playwright não decodifica AAC) com Range, limite de banda, latência, expiração de token e falhas injetáveis. */
'use strict';
const fs = require('fs'), path = require('path'), https = require('https'), cp = require('child_process'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SITE = path.join(ROOT, 'Repasso-Med-Site--main', 'Atual - Copia');
const A = f => path.join(SITE, 'assets', f);
const { criar } = require(path.join(SITE, 'netlify', 'functions', '_audio', 'lib.js'));
const RMAudio = require(A('rm-audio.js'));

function ffmpeg() {
  if (process.env.RM_FFMPEG) return process.env.RM_FFMPEG;
  for (const c of ['ffmpeg']) { const r = cp.spawnSync('which', [c], { encoding: 'utf8' }); if (r.status === 0) return r.stdout.trim(); }
  const r = cp.spawnSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' });
  if (r.status === 0) return r.stdout.trim();
  throw new Error('ffmpeg não encontrado (instale ffmpeg, `pip install imageio-ffmpeg` ou defina RM_FFMPEG)');
}

/* áudio de teste: varrimento de frequência (a posição é audível/mensurável), mono */
function gera(tmp) {
  const F = ffmpeg(), out = {};
  const mk = (nome, dur, codec, ext, extra) => {
    const f = path.join(tmp, nome + '.' + ext);
    const r = cp.spawnSync(F, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `aevalsrc=0.3*sin(2*PI*(200+8*t)*t):s=22050:d=${dur}`, '-ac', '1'].concat(codec, extra || [], [f]), { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
    out[nome] = { file: f, size: fs.statSync(f).size, ext, dur };
  };
  mk('motivo', 60, ['-c:a', 'libmp3lame', '-b:a', '64k'], 'mp3');
  mk('epoc', 45, ['-c:a', 'libopus', '-b:a', '32k'], 'ogg');
  return out;
}

function certificado(tmp) {
  const k = path.join(tmp, 'k.pem'), c = path.join(tmp, 'c.pem');
  const r = cp.spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', k, '-out', c, '-days', '2', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('openssl: ' + r.stderr);
  return { key: fs.readFileSync(k), cert: fs.readFileSync(c) };
}

async function iniciar(opts) {
  opts = opts || {};
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rm-audio-int-'));
  const midia = gera(tmp), tls = certificado(tmp);
  const B1 = process.env.RM_B1_DIR || '';                       // diretório com rm-layout.js/css + rm-modes.js do B1 REAL (opcional)
  const S = {
    log: [],                       // {m, p, range}
    ctr: { sign: 0, manifest: 0, media: 0, mediaRange: [] },
    tokens: {},                    // token → expira (ms de relógio do servidor)
    ttl: 600000,                   // validade do token de assinatura (ms)
    banda: 0,                      // bytes/s (0 = sem limite)
    latencia: 0,                   // ms antes do 1.º byte
    latManifest: 0,                // ms antes de responder ao manifesto (corridas: trocar de matéria/logout durante o carregamento)
    falha: { url: 0, manifest: 0, midia: 0 },   // próximas N respostas com erro
    lixo: false,                   // devolve bytes inválidos como se fosse áudio
    ligado: true, uids: 'uid-jose,d4d215d3-36dd-4efb-8869-bdea5376c648',
    manifesto: [
      { audio_id: 's2-b01-motivo', block_id: 's2-b01', theme: 'Motivo de consulta', title: 'Motivo de consulta', duration: 60, order: 1, version: 'v1', path: 'semiologia-ii/motivo.v1.mp3', ready: true },
      { audio_id: 's2-b03-epoc', block_id: 's2-b03', theme: 'EPOC', title: 'Síndrome EPOC', duration: 45, order: 2, version: 'v1', path: 'semiologia-ii/epoc.v1.ogg', ready: true }
    ],
    midia, tmp, porta: 0, base: ''
  };
  const arqDe = p => p.indexOf('motivo') >= 0 ? midia.motivo : midia.epoc;
  /* «Supabase» falso, em memória, entregue às funções REAIS */
  const supaFetch = async (url, init) => {
    init = init || {};
    const u = new URL(url);
    if (u.pathname === '/auth/v1/user') {
      const t = ((init.headers || {}).Authorization || '').replace('Bearer ', '');
      return t === 'tok-jose' ? { ok: true, status: 200, json: async () => ({ id: 'uid-jose' }) } : t === 'tok-jose-real' ? { ok: true, status: 200, json: async () => ({ id: 'd4d215d3-36dd-4efb-8869-bdea5376c648' }) } : t === 'tok-outro' ? { ok: true, status: 200, json: async () => ({ id: 'uid-outro' }) } : { ok: false, status: 401, json: async () => ({}) };
    }
    if (u.pathname.startsWith('/storage/v1/object/sign/audiobooks/') && init.method === 'POST') {
      const tk = 'tk' + (++S.ctr.sign) + '_' + Math.random().toString(36).slice(2, 8);
      S.tokens[tk] = Date.now() + S.ttl;
      return { ok: true, status: 200, json: async () => ({ signedURL: u.pathname.replace('/storage/v1', '') + '?token=' + tk }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const handlers = () => criar({
    env: { SUPABASE_URL: S.base, SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'svc', RM_PILOT_AUDIO_UIDS: S.ligado ? S.uids : '', RM_AUDIO_MANIFEST: S.ligado ? JSON.stringify({ 'semiologia-ii': S.manifesto }) : '' },
    fetch: supaFetch, validateItem: RMAudio.validateItem
  });

  const tipo = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
  const srv = https.createServer(tls, async (req, res) => {
    const u = new URL(req.url, S.base || 'https://127.0.0.1');
    const rng = req.headers.range || '';
    S.log.push({ m: req.method, p: u.pathname, range: rng });
    const send = (st, body, h) => { res.writeHead(st, Object.assign({ 'cache-control': 'no-store' }, h || {})); res.end(body); };
    try {
      if (u.pathname === '/h') {
        let html = fs.readFileSync(path.join(__dirname, 'harness.html'), 'utf8');
        const materia = fs.readFileSync(path.join(SITE, 'netlify', 'functions', 'materias-privadas', 'semiologia-ii.html'), 'utf8');
        html = html.replace('{{MATERIA}}', () => materia).replace('{{SUPABASE_URL}}', S.base)
          .replace('{{B1_CSS}}', B1 ? '<link rel="stylesheet" href="/b1/rm-layout.css">' : '')
          .replace('{{TOOLS}}', u.searchParams.get('pen') ? '<script src="/assets/rm-tools.js"></script><script src="/assets/rm-tools-v2.js"></script>' : '')
          .replace('{{B1_JS}}', B1 ? '<script src="/b1/rm-modes.js"></script><script src="/b1/rm-layout.js"></script>' : '');
        return send(200, html, { 'content-type': tipo['.html'] });
      }
      if (u.pathname.startsWith('/b1/') && B1) { const f = path.join(B1, path.basename(u.pathname)); return fs.existsSync(f) ? send(200, fs.readFileSync(f), { 'content-type': tipo[path.extname(f)] || 'text/plain' }) : send(404, ''); }
      if (u.pathname.startsWith('/assets/')) {
        const rel = u.pathname.slice('/assets/'.length);
        if (rel.indexOf('..') >= 0) return send(400, '');
        const f = path.join(SITE, 'assets', rel);
        if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return send(404, '');
        return send(200, fs.readFileSync(f), { 'content-type': tipo[path.extname(f)] || 'application/octet-stream', 'accept-ranges': 'bytes' });
      }
      if (u.pathname.startsWith('/.netlify/functions/')) {
        const nome = u.pathname.split('/').pop();
        const ev = { httpMethod: req.method, headers: req.headers, queryStringParameters: Object.fromEntries(u.searchParams) };
        if (nome === 'get-audio-manifest') { S.ctr.manifest++; if (S.latManifest) await new Promise(r => setTimeout(r, S.latManifest)); if (S.falha.manifest > 0) { S.falha.manifest--; return send(500, '{}'); } const r = await handlers().manifesto(ev); return send(r.statusCode, r.body, r.headers); }
        if (nome === 'get-audio-url') { if (S.falha.url > 0) { S.falha.url--; return send(404, '{"error":"unavailable"}', { 'content-type': 'application/json' }); } const r = await handlers().assinar(ev); return send(r.statusCode, r.body, r.headers); }
        return send(404, '');
      }
      if (u.pathname.startsWith('/storage/v1/object/sign/audiobooks/') && (req.method === 'GET' || req.method === 'HEAD')) {
        const tk = u.searchParams.get('token');
        if (!S.tokens[tk] || Date.now() > S.tokens[tk]) return send(403, '{"error":"expired"}', { 'content-type': 'application/json' });
        if (S.falha.midia > 0) { S.falha.midia--; return send(500, ''); }
        const m = arqDe(u.pathname);
        S.ctr.media++; S.ctr.mediaRange.push(rng);
        let buf = fs.readFileSync(m.file);
        if (S.lixo) buf = Buffer.alloc(buf.length, 7);
        let ini = 0, fim = buf.length - 1, st = 200;
        const mm = /bytes=(\d*)-(\d*)/.exec(rng);
        if (mm) { ini = mm[1] === '' ? Math.max(0, buf.length - Number(mm[2])) : Number(mm[1]); fim = mm[1] !== '' && mm[2] !== '' ? Math.min(Number(mm[2]), buf.length - 1) : buf.length - 1; st = 206; }
        if (ini >= buf.length) return send(416, '', { 'content-range': `bytes */${buf.length}` });
        const h = { 'content-type': tipo['.' + m.ext], 'accept-ranges': 'bytes', 'content-length': fim - ini + 1 };
        if (st === 206) h['content-range'] = `bytes ${ini}-${fim}/${buf.length}`;
        if (S.latencia) await new Promise(r => setTimeout(r, S.latencia));
        res.writeHead(st, Object.assign({ 'cache-control': 'no-store' }, h));
        if (req.method === 'HEAD') return res.end();
        const parte = buf.subarray(ini, fim + 1);
        if (!S.banda) return res.end(parte);
        let o = 0; const passo = Math.max(256, Math.floor(S.banda / 10));      // 10 fatias por segundo
        await new Promise(rs => { const t = setInterval(() => { if (res.destroyed || o >= parte.length) { clearInterval(t); res.end(); return rs(); } res.write(parte.subarray(o, o + Math.max(1, Math.floor(S.banda / 10)))); o += Math.max(1, Math.floor(S.banda / 10)); }, 100); res.on('close', () => { clearInterval(t); rs(); }); void passo; });
        return;
      }
      send(404, '');
    } catch (e) { try { send(500, String(e && e.message || e)); } catch (x) { /* ignore */ } }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  S.porta = srv.address().port; S.base = 'https://127.0.0.1:' + S.porta;
  S.fechar = () => { try { srv.closeAllConnections && srv.closeAllConnections(); } catch (e) { /* ignore */ } srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); };
  S.zera = () => { S.log.length = 0; S.ctr = { sign: 0, manifest: 0, media: 0, mediaRange: [] }; };
  return S;
}
module.exports = { iniciar };
