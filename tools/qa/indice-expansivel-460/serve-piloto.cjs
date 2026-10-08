/* Servidor do QA «piloto real» (issue #460): o MESMO harness do piloto (tools/qa/browser-qa/layout: rm-pilot REAL, caneta V2 real, motor de áudio REAL).
   O rm-pilot.js do disco JÁ traz a integração do índice expansível (docs/indice-expansivel-460/PATCH-INTEGRACAO-rm-pilot.diff, aplicado nesta PR depois da #461).
   `serve({ semPatch: true })` entrega o rm-pilot.js ORIGINAL (o diff revertido EM MEMÓRIA com `patch -R`) para o «antes»; o arquivo em disco nunca é alterado por este servidor.
   Também valida que o diff continua batendo com o arquivo (reversível = rollback comprovado). */
'use strict';
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const base = require('../browser-qa/layout/serve.cjs');
const ROOT = base.ROOT, MAT = path.join(ROOT, 'netlify/functions/materias-privadas');
const REPO = path.resolve(__dirname, '../../..');
const PATCH = path.join(REPO, 'docs/indice-expansivel-460/PATCH-INTEGRACAO-rm-pilot.diff');
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function pilotoOriginal() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rm-pilot-orig-'));
  const rel = 'Repasso-Med-Site--main/Atual - Copia/assets/rm-pilot.js', dst = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'assets/rm-pilot.js'), dst);
  const r = cp.spawnSync('patch', ['-R', '-p1', '-d', tmp, '--no-backup-if-mismatch', '-i', PATCH], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('o diff de integração NÃO reverte limpo no rm-pilot.js atual (só o VER difere do diff): ' + r.stdout + r.stderr);
  const out = fs.readFileSync(dst, 'utf8'); fs.rmSync(tmp, { recursive: true, force: true });
  return out;
}

function compor() { return base.compor ? base.compor() : null; }
function serve({ semPatch = false } = {}) {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const style = (idx.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const top = (idx.match(/<div class="rm-topbar[\s\S]*?<span class="rm-user" id="rm-user"><\/span>\s*<\/div>/) || [''])[0].replace('rm-topbar hidden', 'rm-topbar').replace('class="rm-user" id="rm-user">', 'class="rm-user" id="rm-user">José');
  const harness = fs.readFileSync(path.join(__dirname, '../browser-qa/layout/harness-ink.html'), 'utf8').replace('<!--INDEX_STYLE-->', style).replace('<!--INDEX_TOP-->', top);
  const piloto = semPatch ? pilotoOriginal() : null;
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if (u === '/p.html') { r.setHeader('content-type', MIME['.html']); return r.end(harness); }
      if (u === '/assets/rm-pilot.js' && piloto) { r.setHeader('content-type', MIME['.js']); return r.end(piloto); }
      const f = u.startsWith('/m/') ? path.join(MAT, u.slice(3)) : path.join(ROOT, u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
      r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f));
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
module.exports = { serve, pilotoOriginal, PATCH, ROOT };
