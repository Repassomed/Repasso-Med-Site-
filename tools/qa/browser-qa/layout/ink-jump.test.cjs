/* Achado F (auditoria da caneta, PR #420): a tinta fica deslocada do texto depois de um SALTO (índice do layout, volta da
   Página completa, imagens carregando) em matéria longa, porque as seções usam content-visibility:auto e as alturas
   mudam por baixo; as posições do SVG guardam a geometria de ANTES. A correção está no layout (`rm-layout.js` /
   `rm-modes.js`): reposicionar pela API pública `RMToolsV2.reposicionar()` depois que o conteúdo ASSENTOU.

   Medida VÁLIDA só com tinta REALMENTE VISÍVEL no destino (lib-ink.cjs): âncora na janela, paths > 0, bounding box
   finita e não vazia, alinhamento medido. «0 px com 0 paths» reprova como TESTE INVÁLIDO.

   Uso:  export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo
         node tools/qa/browser-qa/layout/ink-jump.test.cjs                                                              */
const L = require('./lib-ink.cjs');
const { ok, info, okTinta, medir, ate, abrir, blocosIds, clicarBloco, trazerTinta } = L;

/* Com RM_VISUAL=1 a navegação por bloco (rm-materia-nav.js, #453) fica LIGADA nos cenários 1 e 1b (saltos e revisitas de bloco: a tinta semeada tem de se alinhar com
   um bloco por vez). Os cenários 2 (modo isolado → Página completa) e das imagens medem a leitura CONTÍNUA do V2 e rodam sem a navegação (RMNav.detach()). */
const semNav = (page) => page.evaluate(() => { if (window.RMNav && window.RMNav.ativo && window.RMNav.ativo()) window.RMNav.detach(); }).then(() => page.waitForTimeout(300));
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const COM_TINTA = ['s2-b10', 's2-banco'];                              // seções com tinta semeada (só nelas o ResizeObserver da V2 observa)

  for (const [w, h] of [[1440, 900], [390, 844]]) {
    console.log(`\n===== ${w}×${h} =====`);
    { const { page, errs } = await abrir(br, base, w, h);
      const m0 = await medir(page);
      ok(m0.n === 2, `tinta semeada carregada e desenhada (${m0.n} traços em s2-b10 e s2-banco)`);

      console.log('  -- 1 · salto pelo índice a blocos COM tinta, a partir do topo (sem ter rolado até lá)');
      for (const id of COM_TINTA) {
        await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
        await clicarBloco(page, w, id); await page.waitForTimeout(600);
        await trazerTinta(page, id);
        const r = await ate(page);
        okTinta(r.m, `#${id}: tinta visível alinhada ${r.ms} ms depois de trazê-la à janela`);
        await page.waitForTimeout(1500);
        okTinta(await medir(page), `#${id}: continua alinhada 1,5 s depois, sem nova ação`);
      }
      ok(errs.length === 0, `0 erros JS (${errs.length})`);
      await page.close(); }

    console.log('  -- 1b · REVISITAR (página nova): bloco com tinta → bloco mais ACIMA (renderiza e muda de altura) → o mesmo bloco de novo');
    for (const [tinta, acima] of [['s2-b10', 's2-b02'], ['s2-b10', 's2-b06'], ['s2-banco', 's2-b05']]) {
      const f = await abrir(br, base, w, h);
      await clicarBloco(f.page, w, tinta); await f.page.waitForTimeout(900);
      await clicarBloco(f.page, w, acima); await f.page.waitForTimeout(900);
      await clicarBloco(f.page, w, tinta); await f.page.waitForTimeout(500);
      await trazerTinta(f.page, tinta);
      const r = await ate(f.page, 4000);
      okTinta(r.m, `${tinta} → ${acima} → ${tinta}: ao REVISITAR a tinta visível está alinhada (${r.ms} ms)`);
      await f.page.waitForTimeout(1200); okTinta(await medir(f.page), `${tinta} → ${acima} → ${tinta}: continua alinhada 1,2 s depois`);
      ok(f.errs.length === 0, `0 erros JS (${f.errs.length})`);
      await f.page.close();
    }

    console.log('  -- 2 · volta da Página completa (modo isolado → completa) em posição profunda');
    { const { page, errs } = await abrir(br, base, w, h);
      await semNav(page);
      const ids = await blocosIds(page);
      await clicarBloco(page, w, 's2-b10'); await page.waitForTimeout(700); await trazerTinta(page, 's2-b10'); await page.waitForTimeout(500);
      okTinta((await ate(page)).m, 'antes de sair: tinta visível e alinhada na posição profunda');
      const ancTop = () => page.evaluate(() => { const sv = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].find(s => s.getAttribute('data-anchor').startsWith('s2-b10>')); const a = sv.getAttribute('data-anchor').split('>'); return Math.round(document.getElementById(a[0]).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+a[1]].getBoundingClientRect().top); });
      const t0 = await ancTop();
      ok(await page.evaluate(() => window.RMModes.requestView('preguntas')), 'entra no modo isolado «preguntas»');
      await page.waitForTimeout(600);
      await page.evaluate(() => window.RMModes.requestView('full'));
      await page.waitForTimeout(800);                                     // layout assenta (2 frames + 120 ms) e SÓ ENTÃO a rolagem é devolvida
      const t1 = await ancTop();
      ok(Math.abs(t1 - t0) <= 60, `a âncora do traço volta ao mesmo ponto da janela (top ${t0} → ${t1})`);
      const r2 = await ate(page, 4000);
      okTinta(r2.m, `volta da Página completa: tinta visível alinhada (${r2.ms} ms)`);
      await page.waitForTimeout(1500); okTinta(await medir(page), 'continua alinhada 1,5 s depois');
      /* vindo de um modo isolado direto a um tema profundo (índice) */
      await page.evaluate(() => window.RMModes.requestView('flashcards')); await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await clicarBloco(page, w, 's2-banco'); await page.waitForTimeout(1500); await trazerTinta(page, 's2-banco');
      const r3 = await ate(page, 4000);
      okTinta(r3.m, `de um modo isolado direto a um bloco profundo: tinta alinhada (${r3.ms} ms)`);
      await page.waitForTimeout(1200); okTinta(await medir(page), 'continua alinhada 1,2 s depois');
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), '0 overflow horizontal');
      ok(errs.length === 0, `0 erros JS (${errs.length})`);
      await page.close(); }
  }

  console.log('\n===== imagens carregando DEPOIS do salto (imagem SINTÉTICA sem width/height; a Semiología II real não tem <img>) =====');
  { const w = 1440, h = 900;
    const { page, errs } = await abrir(br, base, w, h, { atrasoImg: 1200 });
    await semNav(page);
    /* 1 <img> sem width/height no FIM de s2-tablas (seção SEM tinta, logo acima de s2-banco, onde há tinta). Ao saltar para
       s2-banco o fim de s2-tablas fica a poucos px da janela, portanto é renderizado; a imagem termina de carregar 1,2 s depois
       e a seção cresce 500 px: o traço de s2-banco (já renderizado, sem mudar de tamanho) desce 500 px. (Imagem em seção que o
       navegador pulou por content-visibility não muda o layout — por isso esta posição.) */
    await page.evaluate(() => { const sec = document.getElementById('s2-tablas'); const im = document.createElement('img'); im.alt = 'sintética'; im.style.cssText = 'display:block;width:100%;max-width:800px'; im.src = '/__img/fim.svg?x=' + Date.now(); sec.appendChild(im); });
    await page.evaluate(() => window.RMToolsV2.reposicionar()); await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
    await clicarBloco(page, w, 's2-banco'); await page.waitForTimeout(300); await trazerTinta(page, 's2-banco');
    const t0 = Date.now(); let pico = 0, fim = null, ult = Date.now(), fora = 0, validas = 0, amostras = 0;
    while (Date.now() - t0 < 6500) { const m = await medir(page); const ag = Date.now(); amostras++; if (L.valida(m)) { validas++; if (m.desvio > L.MAX) fora += ag - ult; pico = Math.max(pico, m.desvio); fim = m; } ult = ag; await page.waitForTimeout(100); }
    const nImg = await page.evaluate(() => { const im = [...document.images].filter(i => /__img\//.test(i.src)); return { t: im.length, ok: im.filter(i => i.complete && i.naturalWidth > 0).length }; });
    info(`imagem sintética carregada: ${nImg.ok}/${nImg.t}; amostras com tinta visível válida: ${validas}/${amostras}; pico ${pico.toFixed(1)} px; tempo desalinhado ${fora} ms`);
    ok(validas >= amostras * 0.8, `o teste mediu tinta visível válida em ≥ 80% das amostras (${validas}/${amostras})`);
    ok(pico > 100, `o cenário é discriminante: a imagem deslocou o traço (pico ${pico.toFixed(0)} px)`);
    okTinta(fim, 'ao fim do carregamento da imagem a tinta visível está alinhada');
    ok(fora <= 900, `a tinta fica desalinhada no máximo ~0,9 s depois que a imagem carrega (${fora} ms)`);
    ok(nImg.ok === nImg.t && nImg.t === 1, `o carregamento da imagem foi exercitado (${nImg.ok}/${nImg.t} carregaram depois do salto)`);
    ok(errs.length === 0, `0 erros JS (${errs.length})`);
    await page.close(); }

  await br.close(); srv.close();
  process.exit(L.finish('ink-jump') ? 1 : 0);
})();
