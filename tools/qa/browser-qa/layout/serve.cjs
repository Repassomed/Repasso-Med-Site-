/* Servidor estático do harness do layout. Compõe a página com o <style> e o cabeçalho REAIS do index.html
   (topbar com o logo, abas de matéria), para que o que se mede/captura seja o cabeçalho de verdade.
   Sem rede externa: as fontes do Google não carregam no sandbox (caem nas fontes do sistema — declarado nas capturas). */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../../Repasso-Med-Site--main/Atual - Copia');
const MAT = path.join(ROOT, 'netlify/functions/materias-privadas');
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function compor() {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const style = (idx.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const top = (idx.match(/<div class="rm-topbar[\s\S]*?<span class="rm-user" id="rm-user"><\/span>\s*<\/div>/) || [''])[0].replace('rm-topbar hidden', 'rm-topbar').replace('class="rm-user" id="rm-user">', 'class="rm-user" id="rm-user">José');
  let h = fs.readFileSync(path.join(__dirname, 'harness-ink.html'), 'utf8');
  h = h.replace('<!--INDEX_STYLE-->', style).replace('<!--INDEX_TOP-->', top);
  return h;
}

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if (u === '/p.html') { r.setHeader('content-type', MIME['.html']); return r.end(compor()); }
      const f = u.startsWith('/m/') ? path.join(MAT, u.slice(3)) : path.join(ROOT, u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
      r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
      r.end(fs.readFileSync(f));
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
module.exports = { serve, ROOT };
