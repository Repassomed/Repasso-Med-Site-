/* PRÉ-VOO · DIAGNÓSTICO R5 — a tinta nasce alinhada? Semeia 1 traço (âncora calculada pelo motor) no controle, recarrega no modo pedido e mede, ao longo de 5 s,
   a posição do traço dentro do parágrafo (fração da altura; o traço semeado tem topo em 0,30). `reposicionar()` no fim. Somente leitura (sessionStorage do teste).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/diagnosticos/tinta-primeira-pintura.cjs <slug> [controle|nav] */
'use strict';
const { chromium } = require('playwright'); const L = require('../../ensaio-layout/lib.cjs');
(async () => {
  const slug = process.argv[2] || 'dermatologia', modo = process.argv[3] || 'controle'; const m = L.reconciliar().ativas.find(x => x.slug === slug);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'controle', corr: true, extra: '&persist=1' });
  const anc = await r.page.evaluate(() => {
    const tab = document.querySelector('#materias-container > .tab-content'); const s = [...tab.querySelectorAll(':scope > section[id]')][2]; s.scrollIntoView();
    const p = [...s.querySelectorAll('p')].filter(x => x.textContent.length > 110)[1]; const an = window.RMToolsV2._test.anchorDe(p);
    sessionStorage.setItem('ens.user_ink_strokes', JSON.stringify([{ id: 'x1', user_id: 'd4d215d3-36dd-4efb-8869-bdea5376c648', subject_slug: window.__ens.slug, anchor_id: an.id, color: 'black', width: 'medium', created_at: new Date(Date.now() - 86400000).toISOString(), points: [[0.1, 0.3], [0.9, 0.3]] }]));
    return an.id; });
  await r.page.goto(r.page.url().replace(/modo=[a-z]+/, 'modo=' + modo)); await r.page.waitForFunction('window.__ready===true');
  if (modo === 'nav') { await r.page.evaluate(a => window.RMNav.go({ view: 'block', block: a.split('>')[0] }), anc); await r.page.waitForTimeout(600); }
  const med = () => r.page.evaluate(a => { const p = document.querySelector('#rm2-ink path[data-ink="x1"]'); if (!p) return 'sem-path'; const [sid, ix] = a.split('>'); const el = document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+ix]; const ra = el.getBoundingClientRect(), rb = p.getBoundingClientRect(); return { fy: +((rb.top - ra.top) / ra.height).toFixed(3), alturaPx: Math.round(ra.height), imgsPendentes: [...document.images].filter(i => !i.complete).length }; }, anc);
  let t0 = 0; for (const t of [300, 900, 2000, 5000]) { await r.page.waitForTimeout(t - t0); t0 = t; console.log(slug, modo, t + ' ms', JSON.stringify(await med())); }
  await r.page.evaluate(() => window.RMToolsV2.reposicionar()); await r.page.waitForTimeout(400); console.log('após reposicionar()', JSON.stringify(await med()));
  await br.close(); srv.close();
})();
