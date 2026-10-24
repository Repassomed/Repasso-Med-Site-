/* PRÉ-VOO · DIAGNÓSTICO R14 — traço sobre tabela larga com rolagem própria alarga a página no celular.
   Abre Semiología II em 390 px (mobile, escala 2) com 40 traços espalhados (a mesma carga do caneta-novo-layout), lista os `svg` da camada de tinta que passam da viewport,
   mede scrollWidth/innerWidth e repete a medida com esses `svg` escondidos. Somente leitura.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/diagnosticos/tinta-em-tabela-larga.cjs */
'use strict';
const { chromium } = require('playwright');
const L = require('../../browser-qa/layout/lib-player.cjs'), B = require('../../browser-qa/layout/pen-bench.cjs');
(async () => {
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  const { page } = await L.abrir(br, base, midia, Object.assign({ w: 390, h: 844, touch: true, isMobile: true, scale: 2, seedmany: 40 }, B.CFG.novo));
  await page.evaluate(B.INSTR); await B.prepararAlvo(page, 'novo', 'paragrafo', true);
  const o = await page.evaluate(() => { const vw = document.documentElement.clientWidth;
    const fora = [...document.querySelectorAll('#rm2-ink svg')].map(v => ({ a: v.getAttribute('data-anchor'), right: Math.round(v.getBoundingClientRect().right) })).filter(x => x.right > vw + 1);
    return { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw, innerWidth, svgForaDaViewport: fora }; });
  console.log(JSON.stringify(o));
  const o2 = await page.evaluate(() => { document.querySelectorAll('#rm2-ink svg').forEach(v => { if (v.getBoundingClientRect().right > document.documentElement.clientWidth + 1) v.style.display = 'none'; }); return { scrollWidth: document.documentElement.scrollWidth, innerWidth }; });
  console.log('com esses svg escondidos:', JSON.stringify(o2));
  for (const a of o.svgForaDaViewport) { const [s, i] = a.a.split('>'); console.log('âncora', a.a, '→', await page.evaluate(([s, i]) => { const e = document.getElementById(s).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+i]; const r = e.getBoundingClientRect(); return { tag: e.tagName, larguraPx: Math.round(r.width), contenedorRolavel: !!e.closest('.rmc-scroll,.s2-scroll') }; }, [s, i])); }
  await br.close(); srv.close();
})();
