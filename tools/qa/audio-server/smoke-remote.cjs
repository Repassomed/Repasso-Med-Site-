#!/usr/bin/env node
/* Verificação REAL (contra um deploy) do liga/desliga dos audiobooks. Só LÊ: faz GET nas duas funções e um Range de 2 bytes na
   URL assinada. O token (JWT da sessão) vem por variável de ambiente e NUNCA é impresso. Uso:

     RM_BASE=https://deploy-preview-123--SEUSITE.netlify.app  RM_TOKEN=<jwt>  RM_AUDIO_ID=s2-b01-motivo \
       node tools/qa/audio-server/smoke-remote.cjs on  [--save-src arquivo]      # esperado LIGADO (conta do piloto)
     … node tools/qa/audio-server/smoke-remote.cjs off [--old-src arquivo]       # esperado DESLIGADO (depois do redeploy)
     RM_BASE=… RM_TOKEN=<jwt de OUTRA conta> … node tools/qa/audio-server/smoke-remote.cjs deny   # negação para outra conta
     RM_BASE=… node tools/qa/audio-server/smoke-remote.cjs deny                                   # sem token
     RM_BASE=… node tools/qa/audio-server/smoke-remote.cjs expirada --src arquivo                 # ≥ 10 min depois do `on --save-src`: a URL TEM de ser recusada

   `off --old-src`: tenta a URL assinada ANTES do desligamento. Isto é INFORMATIVO (não reprova): uma URL já emitida continua valendo
   até expirar (≤ 10 min) — é o limite documentado do desligamento; ao passar o prazo deve falhar (400/403). */
'use strict';
const fs = require('fs');
const [, , modo, ...resto] = process.argv;
const BASE = (process.env.RM_BASE || '').replace(/\/+$/, ''), TOKEN = process.env.RM_TOKEN || '', ID = process.env.RM_AUDIO_ID || '';
const arg = n => { const i = resto.indexOf(n); return i >= 0 ? resto[i + 1] : ''; };
if (!['on', 'off', 'deny', 'expirada'].includes(modo) || !BASE) { console.log('uso: RM_BASE=… [RM_TOKEN=…] [RM_AUDIO_ID=…] node smoke-remote.cjs on|off|deny|expirada'); process.exit(2); }
if (modo === 'expirada' && !(resto.indexOf('--src') >= 0 && resto[resto.indexOf('--src') + 1])) { console.log('modo expirada exige --src <arquivo guardado por `on --save-src`>'); process.exit(2); }
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
async function range(url, faixa) {
  const r = await fetch(url, { headers: { Range: faixa || 'bytes=0-1' }, cache: 'no-store' });
  let n = 0; try { n = (await r.arrayBuffer()).byteLength; } catch (e) { /* ignore */ }
  return { s: r.status, ct: r.headers.get('content-type') || '', ar: r.headers.get('accept-ranges') || '', cr: r.headers.get('content-range') || '', n };
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
      ok(r.s === 206 && /^bytes 0-1\/\d+$/.test(r.cr) && r.n === 2, 'Range 206 estrito: `bytes=0-1` ⇒ HTTP 206, Content-Range `bytes 0-1/N` e exatamente 2 bytes (200 = o Safari/iOS NÃO consegue buscar posição)', `HTTP ${r.s} ${r.cr} ${r.n} B`);
      const total = Number((/\/(\d+)$/.exec(r.cr) || [])[1] || 0);
      ok(total > 0 && total <= 31457280, 'tamanho do objeto conhecido e ≤ 30 MB (limite do bucket)', total + ' B');
      if (total > 6000) {
        const m = await range(negado.j.src, 'bytes=2000-2999');
        ok(m.s === 206 && m.cr === `bytes 2000-2999/${total}` && m.n === 1000, 'Range no MEIO do arquivo (busca de posição): 206, Content-Range correto e 1000 bytes', `HTTP ${m.s} ${m.cr} ${m.n} B`);
        const f = await range(negado.j.src, `bytes=${total - 10}-`);
        ok(f.s === 206 && f.n === 10, 'Range aberto até o fim (`bytes=N-`): 206 com os últimos 10 bytes', `HTTP ${f.s} ${f.n} B`);
      }
      ok(/audio|mp4|octet/i.test(r.ct), 'Content-Type de áudio', r.ct);
      info('accept-ranges', r.ar || '(ausente)');
      if (arg('--save-src')) { fs.writeFileSync(arg('--save-src'), negado.j.src, { mode: 0o600 }); info('URL guardada para o teste de desligamento (arquivo 0600; contém token de assinatura — apague depois)', arg('--save-src')); }
    }
  } else if (modo === 'expirada') {
    const src = fs.readFileSync(arg('--src'), 'utf8').trim();
    const idade = Math.round((Date.now() - fs.statSync(arg('--src')).mtimeMs) / 1000);
    info('idade da URL guardada', `${idade} s (a assinatura vale 600 s)`);
    ok(idade >= 600, 'passaram ≥ 10 min desde a emissão (senão o resultado não prova nada)', idade + ' s');
    const r = await range(src);
    ok(r.s === 400 || r.s === 401 || r.s === 403 || r.s === 404, 'a URL assinada EXPIRADA é recusada pelo Storage', `HTTP ${r.s}`);
    const novo = ID && TOKEN ? await get('/get-audio-url?slug=semiologia-ii&audio_id=' + encodeURIComponent(ID)) : null;
    if (novo) ok(novo.s === 200 && novo.j && novo.j.src && novo.j.src !== src, 'o servidor reautoriza: emite uma URL NOVA para a conta do piloto', `HTTP ${novo.s}`);
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
