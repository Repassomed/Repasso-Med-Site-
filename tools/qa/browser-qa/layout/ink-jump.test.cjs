/* Achado F (auditoria da caneta, PR #420): a tinta fica deslocada do texto depois de um SALTO (índice do layout, volta da
   Página completa, imagens carregando) em matéria longa, porque as seções usam content-visibility:auto e as alturas
   mudam por baixo; as posições do SVG guardam a geometria de ANTES. A correção está no layout (`rm-layout.js` /
   `rm-modes.js`): reposicionar pela API pública `RMToolsV2.reposicionar()` depois que o conteúdo ASSENTOU.

   Harness: Semiología II REAL + app-core.js + rm-tools.js + rm-tools-v2.js REAIS + piloto (rm-pilot → rm-layout/rm-modes REAIS).
   Supabase e o gate do piloto são simulados (0 rede real, 0 escrita). A tinta é SEMEADA como se viesse do banco
   (1 traço em cada um de 2 blocos fundos). Medida: desvio entre o SVG de cada traço e o bloco âncora, em px.

   Uso:  export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo
         node tools/qa/browser-qa/layout/ink-jump.test.cjs                                                              */
const path = require('path');
const { serve } = require('./serve.cjs');
const JOSE = 'd4d215d3-36dd-4efb-8869-bdea5376c648';                   // UID do piloto (público no código da V2: BETA_UIDS)
const FLAGS = { slug: 'semiologia-ii', layout: true, audio: false, pen: false };
const MAX = +(process.env.RM_DRIFT_MAX || 2);                           // tolerância de alinhamento (px)
/* tinta só em 2 blocos FUNDOS: o ResizeObserver da V2 só observa âncoras/seções COM tinta; seções sem tinta que mudam de altura acima não o disparam (é o caso real do achado F) */
const SEED = 's2-b10,s2-banco';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('    ✗ FALHA:', m); } else console.log('    ✓', m); return !!c; };
const info = (m) => console.log('    ·', m);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* desvio da tinta (px): máximo entre TODOS os traços e, à parte, só os que estão na janela de visualização */
const MEDIR = () => {
  const out = [];
  document.querySelectorAll('#rm2-ink svg[data-anchor]').forEach(sv => {
    const a = sv.getAttribute('data-anchor').split('>'); const sec = document.getElementById(a[0]); if (!sec) return;
    const el = a[1] !== undefined ? sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+a[1]] : sec; if (!el) return;
    const r = el.getBoundingClientRect(), s = sv.getBoundingClientRect();
    if (!r.width && !r.height) return;                                  // oculto (fora da Página completa)
    const d = Math.max(Math.abs(s.left - r.left), Math.abs(s.top - r.top), Math.abs(s.width - r.width), Math.abs(s.height - r.height));
    out.push({ d, vis: r.bottom > 0 && r.top < innerHeight });
  });
  const m = a => a.length ? Math.max(...a.map(o => o.d)) : 0;
  return { n: out.length, todos: m(out), visiveis: m(out.filter(o => o.vis)), nv: out.filter(o => o.vis).length };
};

async function abrir(br, w, h, { imgs = false, atrasoImg = 0 } = {}) {
  const page = await br.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push('c:' + m.text().slice(0, 140)); });
  await page.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FLAGS) }));
  if (atrasoImg) await page.route('**/__img/**', async r => { await sleep(atrasoImg); r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#cfd8e6"/></svg>' }); });
  await page.goto(`${page._base}/p.html?slug=semiologia-ii&tab=semio2&uid=${JOSE}&seed=${SEED}&wait=1800`, { timeout: 120000 });
  await page.waitForFunction('window.__ready===true', { timeout: 120000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  return { page, errs };
}
const blocosIds = (page) => page.evaluate(() => [...document.querySelectorAll('.rm-l2-block-link[data-target]')].map(a => a.getAttribute('data-target')));
async function abrirIndice(page, w) {
  if (w < 768) { await page.click('.rm-l2-hamb'); await page.waitForTimeout(350); }
  else { await page.evaluate(() => { const t = document.querySelector('.rm-l2-tree-toggle'); if (t && t.getAttribute('aria-expanded') !== 'true') t.click(); }); await page.waitForTimeout(200); }
}
async function clicarBloco(page, w, id) {
  const visivel = await page.evaluate(i => { const a = document.querySelector(`.rm-l2-block-link[data-target="${i}"]`); return !!(a && a.offsetParent); }, id);
  if (!visivel) await abrirIndice(page, w);
  await page.evaluate(i => document.querySelector(`.rm-l2-block-link[data-target="${i}"]`).click(), id);
}
/* espera o desvio dos traços VISÍVEIS cair a ≤ MAX (ou estoura o prazo) e devolve {ms, d} */
async function ate(page, prazo = 3500) {
  const t0 = Date.now(); let m;
  for (;;) { m = await page.evaluate(MEDIR); if (m.visiveis <= MAX || Date.now() - t0 > prazo) break; await page.waitForTimeout(100); }
  return { ms: Date.now() - t0, m };
}

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const orig = br.newPage.bind(br);
  br.newPage = async (o) => { const p = await orig(o); p._base = base; return p; };

  for (const [w, h] of [[1440, 900], [390, 844]]) {
    console.log(`\n===== ${w}×${h} =====`);
    const { page, errs } = await abrir(br, w, h);
    const ids = await blocosIds(page);
    const m0 = await page.evaluate(MEDIR);
    ok(m0.n === 2, `tinta semeada carregada e desenhada (${m0.n} traços em s2-b10 e s2-banco)`);
    info(`alinhamento logo após o carregamento (sem salto): máx. ${m0.todos.toFixed(1)} px`);

    console.log('  -- 1 · salto pelo índice até blocos PROFUNDOS (a partir do topo, sem ter rolado até lá)');
    const fundos = ids.slice(-4).concat(ids.slice(Math.floor(ids.length / 2), Math.floor(ids.length / 2) + 1));
    for (const id of fundos) {
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
      await clicarBloco(page, w, id);
      const r = await ate(page);
      const alvoTop = await page.evaluate(i => Math.round(document.getElementById(i).getBoundingClientRect().top), id);
      ok(r.m.visiveis <= MAX, `#${id}: tinta visível alinhada após o salto em ${r.ms} ms (desvio ${r.m.visiveis.toFixed(1)} px; alvo em top=${alvoTop})`);
      await page.waitForTimeout(1500);
      const m2 = await page.evaluate(MEDIR);
      ok(m2.visiveis <= MAX, `#${id}: continua alinhada 1,5 s depois, sem nova ação (${m2.visiveis.toFixed(1)} px)`);
    }

    console.log('  -- 1b · REVISITAR (página nova): bloco FUNDO primeiro → bloco mais ACIMA (renderiza e muda de altura) → FUNDO de novo');
    for (const [rotulo, quais] of [['fundo → início → fundo', [ids.length - 4, 2]], ['fundo → meio → fundo', [ids.length - 2, Math.floor(ids.length / 2)]]]) {
      const f = await abrir(br, w, h); const [fi, ci] = quais; const fundo = ids[fi], acima = ids[ci];
      await clicarBloco(f.page, w, fundo); await f.page.waitForTimeout(900);
      await clicarBloco(f.page, w, acima); await f.page.waitForTimeout(900);
      const antes = await f.page.evaluate(MEDIR);
      await clicarBloco(f.page, w, fundo); const r = await ate(f.page, 4000);
      info(`${rotulo}: desvio visível ao chegar a #${fundo}: ${r.m.visiveis.toFixed(1)} px em ${r.ms} ms (traços fora da janela, antes do 3º salto: ${antes.todos.toFixed(1)} px)`);
      ok(r.m.visiveis <= MAX, `${rotulo}: ao REVISITAR #${fundo} a tinta visível está alinhada`);
      await f.page.waitForTimeout(1200); ok((await f.page.evaluate(MEDIR)).visiveis <= MAX, `${rotulo}: continua alinhada 1,2 s depois`);
      ok(f.errs.length === 0, `${rotulo}: 0 erros JS`);
      await f.page.close();
    }

    console.log('  -- 2 · volta da Página completa (modo isolado → completa) em posição profunda');
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
    await clicarBloco(page, w, ids[ids.length - 2]); await ate(page); await page.waitForTimeout(600);
    const y0 = await page.evaluate(() => Math.round(pageYOffset));
    const dTop = await page.evaluate(id => Math.round(document.getElementById(id).getBoundingClientRect().top), ids[ids.length - 2]);
    ok(await page.evaluate(() => window.RMModes.requestView('preguntas')), 'entra no modo isolado «preguntas»');
    await page.waitForTimeout(600);
    await page.evaluate(() => window.RMModes.requestView('full'));
    await page.waitForTimeout(700);                                      // o layout assenta (2 frames + 120 ms) e SÓ ENTÃO a rolagem é devolvida
    const r2 = await ate(page, 4000);
    const y1 = await page.evaluate(() => Math.round(pageYOffset));
    const dTop1 = await page.evaluate(id => Math.round(document.getElementById(id).getBoundingClientRect().top), ids[ids.length - 2]);
    ok(Math.abs(dTop1 - dTop) <= 60, `o bloco de saída volta ao mesmo ponto da janela (top ${dTop} → ${dTop1}; rolagem ${y0} → ${y1})`);
    ok(r2.m.visiveis <= MAX, `volta da Página completa: tinta visível alinhada em ${r2.ms} ms (${r2.m.visiveis.toFixed(1)} px)`);
    await page.waitForTimeout(1500);
    ok((await page.evaluate(MEDIR)).visiveis <= MAX, 'continua alinhada 1,5 s depois');
    /* vindo de um modo isolado direto para um tema profundo (índice) */
    await page.evaluate(() => window.RMModes.requestView('flashcards')); await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await clicarBloco(page, w, ids[ids.length - 3]);
    const r3 = await ate(page, 4000);
    ok(r3.m.visiveis <= MAX, `de um modo isolado direto a um bloco profundo: tinta alinhada em ${r3.ms} ms (${r3.m.visiveis.toFixed(1)} px)`);
    await page.waitForTimeout(1200);
    ok((await page.evaluate(MEDIR)).visiveis <= MAX, 'continua alinhada 1,2 s depois');

    ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), '0 overflow horizontal');
    ok(errs.length === 0, `0 erros JS (${errs.length})`);
    await page.close();
  }

  console.log('\n===== imagens carregando DEPOIS do salto (1 imagem SINTÉTICA sem width/height no fim de uma seção sem tinta; a Semiología II real não tem <img>) =====');
  { const w = 1440, h = 900;
    const { page, errs } = await abrir(br, w, h, { atrasoImg: 1200 });
    const ids = await blocosIds(page);
    /* uma <img> sem width/height no FIM de s2-tablas (seção SEM tinta, logo acima de s2-banco, onde há tinta). Ao saltar para
       s2-banco o fim de s2-tablas fica a poucos px da janela, portanto é renderizado; a imagem termina de carregar 1,2 s depois
       e a seção cresce 500 px: o traço de s2-banco (já renderizado, sem mudar de tamanho) desce 500 px. (Imagem em seção que o
       navegador pulou por content-visibility não muda o layout — por isso esta posição.) */
    await page.evaluate(() => {
      const sec = document.getElementById('s2-tablas'); const im = document.createElement('img'); im.alt = 'sintética'; im.style.cssText = 'display:block;width:100%;max-width:800px';
      im.src = '/__img/fim.svg?x=' + Date.now(); sec.appendChild(im);
    });
    await page.evaluate(() => window.RMToolsV2.reposicionar()); await page.waitForTimeout(300);
    const alvo = 's2-banco';
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
    await clicarBloco(page, w, alvo);
    const t0 = Date.now(); let pico = 0, fim = 0;
    let ult = Date.now(), fora = 0; while (Date.now() - t0 < 6500) { const m = await page.evaluate(MEDIR); const ag = Date.now(); if (m.visiveis > MAX) fora += ag - ult; ult = ag; pico = Math.max(pico, m.visiveis); fim = m.visiveis; await page.waitForTimeout(100); }
    const nImg = await page.evaluate(() => { const im = [...document.images].filter(i => /__img\//.test(i.src)); return { t: im.length, ok: im.filter(i => i.complete && i.naturalWidth > 0).length }; });
    info(`imagens sintéticas carregadas: ${nImg.ok}/${nImg.t}; desvio visível: pico ${pico.toFixed(1)} px, final ${fim.toFixed(1)} px, tempo desalinhado ${fora} ms`);
    ok(fim <= MAX && pico > 100, `o cenário é discriminante: a imagem deslocou o traço (pico ${pico.toFixed(0)} px) e ele voltou ao lugar`);
    ok(fora <= 900, `a tinta fica desalinhada no máximo ~0,9 s depois que as imagens carregam (${fora} ms)`);
    ok(nImg.ok === nImg.t && nImg.t === 1, `o carregamento das imagens foi exercitado (${nImg.ok}/${nImg.t} carregaram depois do salto)`);
    ok(fim <= MAX, `ao fim do carregamento das imagens a tinta visível está alinhada (${fim.toFixed(1)} px)`);
    ok(errs.length === 0, `0 erros JS (${errs.length})`);
    await page.close();
  }

  await br.close(); srv.close();
  console.log(`\nink-jump: ${n - fails}/${n} verificações OK` + (fails ? ` — ${fails} FALHAS` : ''));
  process.exit(fails ? 1 : 0);
})();
