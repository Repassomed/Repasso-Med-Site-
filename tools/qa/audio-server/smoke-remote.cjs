#!/usr/bin/env node
/* Verificação REAL (contra um deploy) do liga/desliga dos audiobooks. Só LÊ: faz GET nas duas funções e um Range de 2 bytes na
   URL assinada. O token (JWT da sessão) vem por variável de ambiente e NUNCA é impresso. Uso:

     RM_BASE=https://deploy-preview-123--SEUSITE.netlify.app  RM_TOKEN=<jwt>  RM_AUDIO_ID=s2-b01-motivo \
       node tools/qa/audio-server/smoke-remote.cjs on  [--save-src arquivo]      # esperado LIGADO (conta do piloto)
     … node tools/qa/audio-server/smoke-remote.cjs off [--old-src arquivo]       # esperado DESLIGADO (depois do redeploy)
     RM_BASE=… RM_TOKEN=<jwt de OUTRA conta> … node tools/qa/audio-server/smoke-remote.cjs deny   # negação para outra conta
     RM_BASE=… node tools/qa/audio-server/smoke-remote.cjs deny                                   # sem token

   `off --old-src`: tenta a URL assinada ANTES do desligamento. Isto é INFORMATIVO (não reprova): uma URL já emitida continua valendo
   até expirar (≤ 10 min) — é o limite documentado do desligamento; ao passar o prazo deve falhar (400/403). */
'use strict';
const fs = require('fs');
const [, , modo, ...resto] = process.argv;
const BASE = (process.env.RM_BASE || '').replace(/\/+$/, ''), TOKEN = process.env.RM_TOKEN || '', ID = process.env.RM_AUDIO_ID || '';
const arg = n => { const i = resto.indexOf(n); return i >= 0 ? resto[i + 1] : ''; };
if (!['on', 'off', 'deny'].includes(modo) || !BASE) { console.log('uso: RM_BASE=… [RM_TOKEN=…] [RM_AUDIO_ID=…] node smoke-remote.cjs on|off|deny'); process.exit(2); }
if (modo === 'on' && (!TOKEN || !ID)) { console.log('modo on exige RM_TOKEN e RM_AUDIO_ID'); process.exit(2); }

let falhas = 0;
const ok = (c, n, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (extra ? '  → ' + extra : '')); if (!c) falhas++; };
const info = (n, extra) => console.log('  ⓘ ' + n + (extra ? '  → ' + extra : ''));
const H = () => (TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {});
const host = u => { try { return new URL(u).host; } catch (e) { return '(inválida)'; } };

async function get(caminho) {
  const r = await fetch(BASE + '/.netlify/functions' + caminho, { headers: H(), cache: 'no-store' });
  let j = null; try { j = await r.json(); } catch (e) { /* ignore */ }
  return { s: r.status, h: r.headers, j };
}
async function range(url) {
  const r = await fetch(url, { headers: { Range: 'bytes=0-1' }, cache: 'no-store' });
  try { await r.arrayBuffer(); } catch (e) { /* ignore */ }
  return { s: r.status, ct: r.headers.get('content-type') || '', ar: r.headers.get('accept-ranges') || '', cr: r.headers.get('content-range') || '' };
}

(async () => {
  console.log(`smoke-remote · modo=${modo} · base=${host(BASE)} · token=${TOKEN ? 'presente (não impresso)' : 'ausente'}`);
  const man = await get('/get-audio-manifest?slug=semiologia-ii');
  const itens = (man.j && man.j.items) || [];
  const negado = await get('/get-audio-url?slug=semiologia-ii&audio_id=' + encodeURIComponent(ID || 'nao-existe'));

  if (modo === 'on') {
    ok(man.s === 200 && itens.some(i => i.audio_id === ID), 'manifesto lista o áudio para a conta do piloto', `${itens.length} item(ns)`);
    ok(itens.every(i => Object.keys(i).sort().join() === 'audio_id,block_id,duration,order,subject_slug,theme,title,version'), 'itens só com os 8 campos públicos (sem URL/caminho)');
    ok(/no-store/.test(man.h.get('cache-control') || ''), 'manifesto com Cache-Control: no-store');
    ok(negado.s === 200 && negado.j && typeof negado.j.src === 'string', 'get-audio-url devolve a URL assinada', negado.j ? `host ${host(negado.j.src)}` : '');
    if (negado.j && negado.j.src) {
      ok(/\/storage\/v1\/object\/sign\/audiobooks\//.test(negado.j.src), 'a URL é do bucket privado `audiobooks` (rota sign)');
      ok(Math.abs((negado.j.expiresAt - Date.now()) / 1000 - 570) < 60 || (negado.j.expiresAt - Date.now()) / 1000 <= 600, 'expiresAt dentro do TTL de 10 min', `${Math.round((negado.j.expiresAt - Date.now()) / 1000)} s`);
      const r = await range(negado.j.src);
      ok(r.s === 206 || r.s === 200, 'a URL assinada responde ao Range (2 bytes)', `HTTP ${r.s} ${r.ct} ${r.cr}`);
      ok(/audio|mp4|octet/i.test(r.ct), 'Content-Type de áudio', r.ct);
      info('accept-ranges', r.ar || '(ausente)');
      if (arg('--save-src')) { fs.writeFileSync(arg('--save-src'), negado.j.src, { mode: 0o600 }); info('URL guardada para o teste de desligamento (arquivo 0600; contém token de assinatura — apague depois)', arg('--save-src')); }
    }
  } else {
    ok(man.s === 200 && itens.length === 0, 'manifesto VAZIO', `HTTP ${man.s}, ${itens.length} item(ns)`);
    ok(negado.s === 404 && negado.j && negado.j.error === 'unavailable', 'get-audio-url nega com 404 {error:"unavailable"}', `HTTP ${negado.s}`);
    ok(!/src|signed|token/i.test(JSON.stringify(negado.j || {})), 'a negação não traz src/assinatura/token');
    if (modo === 'off' && arg('--old-src')) {
      const old = fs.readFileSync(arg('--old-src'), 'utf8').trim();
      const r = await range(old);
      info('URL emitida ANTES do desligamento', `HTTP ${r.s} — ${r.s === 200 || r.s === 206 ? 'AINDA VÁLIDA (esperado até ≤ 10 min do momento em que foi emitida)' : 'já expirada/recusada'}`);
    }
  }
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\nOK');
  process.exit(falhas ? 1 : 0);
})();
