/* Capturas REAIS do piloto (layout real + Semiología II real + topbar/CSS reais do index.html), com métricas.
   Uso: RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/capturas.cjs <pasta-de-saída> [prefixo]
   Larguras: 320 390 768 1024 1440 · zoom 200% (viewport/2 a escala 2) em 1440 e 1024 · larguras críticas do dock do player: 1495 1627 1700 1920.
   LIMITES (declarados): emulação, não aparelho; fontes do Google não carregam no sandbox (caem nas do sistema); o slot do player
   está vazio nesta fase (só o `data-rm-dock` é decidido). */
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.cjs');
const OUT = path.resolve(process.argv[2] || 'capturas'), PRE = process.argv[3] || 'v';
const JOSE = 'd4d215d3-36dd-4efb-8869-bdea5376c648';
fs.mkdirSync(OUT, { recursive: true });

const CASOS = [
  ...[320, 390, 768, 1024, 1440].map(w => ({ w, z: 1, nome: `${w}` })),
  { w: 1440, z: 2, nome: '1440_zoom200' }, { w: 1024, z: 2, nome: '1024_zoom200' },
  ...[1495, 1627, 1700, 1920].map(w => ({ w, z: 1, nome: `${w}_dock` }))
];
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch(); const linhas = [];
  for (const c of CASOS) {
    const h = c.w <= 420 ? 844 : c.w <= 800 ? 1024 : 900;
    const ctx = await br.newContext({ viewport: { width: Math.round(c.w / c.z), height: Math.round(h / c.z) }, deviceScaleFactor: c.z });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
    await p.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slug: 'semiologia-ii', layout: true }) }));
    await p.goto(`${base}/p.html?slug=semiologia-ii&tab=semio2&uid=${JOSE}&seed=s2-b02&wait=1800`);
    await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(900);
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); }); await p.waitForTimeout(300);
    const f = (s) => path.join(OUT, `${PRE}_${c.nome}_${s}.png`);
    await p.screenshot({ path: f('topo') });
    /* SLOT de arte exercitado com uma imagem SINTÉTICA lisa (não é asset do produto): mostra como o container se comporta; a arte final virá do ChatGPT */
    if ([1440, 390].includes(c.w) && c.z === 1) {
      await p.route('**/__art/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#cfd8e6"/></svg>' }));
      await p.evaluate(() => window.RMLayout.setAsset('hero', { src: '/__art/sintetica.svg', w: 1600, h: 900, alt: 'imagem sintética de teste (não é asset do produto)' })); await p.waitForTimeout(600);
      await p.screenshot({ path: f('slot_arte_SINTETICA') });
      await p.evaluate(() => window.RMLayout.setAsset('hero', null)); await p.waitForTimeout(200);
    }
    /* salto pelo índice a um bloco (como o aluno) */
    const abrir = async () => { if (c.w / c.z < 768) { await p.click('.rm-l2-hamb'); await p.waitForTimeout(400); } };
    await abrir();
    if (c.w / c.z < 768) await p.screenshot({ path: f('drawer') });
    await p.evaluate(() => { const t = document.querySelector('.rm-l2-tree-toggle'); if (t && t.getAttribute('aria-expanded') !== 'true' && t.offsetParent) t.click(); });
    await p.evaluate(() => document.querySelector('.rm-l2-block-link[data-target="s2-b03"]').click()); await p.waitForTimeout(1300);
    await p.screenshot({ path: f('bloque03') });
    const m = await p.evaluate(() => {
      const de = document.documentElement, band = document.getElementById('rm-l2-band'), logo = band.querySelector('.rm-l2-logo');
      const b = band.getBoundingClientRect(), l = logo.getBoundingClientRect();
      return { lmode: de.getAttribute('data-rm-lmode'), dock: de.getAttribute('data-rm-dock'), overflowX: de.scrollWidth - de.clientWidth,
        bandH: Math.round(b.height), logoOk: logo.complete && logo.naturalWidth > 0, logoBox: [Math.round(l.width), Math.round(l.height)], nome: band.querySelector('.rm-l2-name b').textContent,
        nomeVisivel: band.querySelector('.rm-l2-name b').getBoundingClientRect().width > 0 && band.querySelector('.rm-l2-name b').scrollWidth <= band.querySelector('.rm-l2-name b').clientWidth + 1 };
    });
    linhas.push({ caso: c.nome, viewportCSS: `${Math.round(c.w / c.z)}×${Math.round(h / c.z)}`, zoom: c.z, ...m, errosJS: errs.length });
    await ctx.close();
  }
  await br.close(); srv.close();
  fs.writeFileSync(path.join(OUT, `${PRE}_metricas.json`), JSON.stringify(linhas, null, 1));
  console.table(linhas.map(l => ({ caso: l.caso, css: l.viewportCSS, lateral: l.lmode, dock: l.dock, 'overflow-x': l.overflowX, logo: l.logoOk, nome: l.nome, 'nome inteiro': l.nomeVisivel, erros: l.errosJS })));
})();
