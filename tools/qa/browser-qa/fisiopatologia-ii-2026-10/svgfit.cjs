/* TEXTO DE SVG QUE MUDOU CABE NA CAIXA? — compara a matéria `orig` (main) com a `new`: para cada <text> de SVG cujo conteúdo mudou,
   mede a caixa real no navegador (getBBox) e confere se o lado direito continua dentro do retângulo menor que o contém (e do viewBox).
   Uso: node svgfit.cjs [--out relatorio.json]   (variáveis do README) */
const fs = require('fs');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { start } = require('./server.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const { s, base } = await start();
  const br = await chromium.launch({ ...(process.env.RM_CHROMIUM ? { executablePath: process.env.RM_CHROMIUM } : {}) });
  const open = async v => { const p = await br.newPage({ viewport: { width: 1280, height: 900 } }); await p.goto(base + '/qa.html?v=' + v, { waitUntil: 'domcontentloaded' }); await p.waitForFunction('window.__ready===true', { timeout: 120000 }); return p; };
  const grab = () => {
    const out = [];
    document.querySelectorAll('svg').forEach((svg, si) => {
      const vb = svg.viewBox && svg.viewBox.baseVal; const W = vb && vb.width;
      const rects = [...svg.querySelectorAll('rect')].map(r => ({ x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') })).filter(r => r.w > 0 && r.h > 0);
      svg.querySelectorAll('text').forEach((t, ti) => {
        let bb; try { bb = t.getBBox(); } catch (e) { return; }
        const x = bb.x, y = bb.y + bb.height / 2;
        const cont = rects.filter(r => x >= r.x - 1 && x <= r.x + r.w && y >= r.y && y <= r.y + r.h).sort((a, b) => a.w * a.h - b.w * b.h)[0];
        out.push({ si, ti, txt: t.textContent, right: bb.x + bb.width, W, box: cont ? cont.x + cont.w : null, sec: (t.closest('section') || {}).id });
      });
    });
    return out;
  };
  const a = await (await open('orig')).evaluate(grab), b = await (await open('new')).evaluate(grab);
  const rep = { svgTexts: b.length, mudaram: 0, estouram: [], cresceram: 0 };
  if (a.length !== b.length) { console.error('nº de <text> difere', a.length, b.length); process.exit(2); }
  b.forEach((n, i) => { const o = a[i]; if (o.txt === n.txt) return; rep.mudaram++;
    const lim = n.box != null ? Math.min(n.box, n.W) : n.W;
    if (n.right > o.right + 0.5) rep.cresceram++;
    if (n.right > lim - 3 && n.right > o.right + 0.5) rep.estouram.push({ sec: n.sec, de: o.txt, para: n.txt, direitaAntes: Math.round(o.right), direitaDepois: Math.round(n.right), limite: Math.round(lim) }); });
  console.log(JSON.stringify(rep, null, 1));
  const out = arg('out'); if (out) fs.writeFileSync(out, JSON.stringify(rep, null, 1));
  await br.close(); s.close(); process.exit(rep.estouram.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
