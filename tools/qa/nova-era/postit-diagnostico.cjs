/* DIAGNÓSTICO das 4 falhas «post-it» da suíte caneta-novo-layout (maxDist > 1,6 px) — somente simulação, nada gravado fora do harness.
   Mede, para o MESMO gesto, o desvio máximo entre os pontos do ponteiro e o traço salvo, no post-it (a) como está, (b) sem a rotação de .6° do tema, (c) sem o clip-path;
   e, como controle, no parágrafo. Mostra também a caixa do post-it e quantos pontos/traços foram gravados (dados íntegros?).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/postit-diagnostico.cjs */
'use strict';
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  const out = [];
  for (const cfg of ['antigo', 'novo']) {
    for (const [nome, alvo, css] of [['paragrafo (controle)', 'paragrafo', ''], ['post-it como está', 'postit', ''], ['post-it SEM rotação', 'postit', '.rm-postit{transform:none!important}'], ['post-it SEM clip-path', 'postit', '.rm-postit{clip-path:none!important}'], ['post-it SEM rotação e SEM clip-path', 'postit', '.rm-postit{transform:none!important;clip-path:none!important}']]) {
      const { ctx, page } = await L.abrir(br, base, midia, Object.assign({ w: 1440, h: 900 }, B.CFG[cfg], { seedmany: 40 }));
      await page.evaluate(B.INSTR);
      if (css) await page.addStyleTag({ content: css });
      const r = await B.prepararAlvo(page, cfg, alvo, true);
      const info = await page.evaluate(() => { const e = window.__alvoEl, cs = getComputedStyle(e), b = e.getBoundingClientRect(); return { largura: +b.width.toFixed(1), altura: +b.height.toFixed(1), rotacao: cs.transform, clip: cs.clipPath !== 'none' }; });
      const pts = B.gesto('rapido', r);
      await B.desenhar(ctx, page, pts, 2, 1); await page.waitForTimeout(1200);
      const per = await B.medirPerdas(page, pts);
      out.push({ cfg, alvo: nome, desvioMaxPx: per.maxDist && +per.maxDist.toFixed(2), pontosPerdidos: per.perdidos, pontosDoGesto: pts.length, caixa: info.largura + '×' + info.altura, transform: info.rotacao.slice(0, 40) });
      await ctx.close();
    }
  }
  console.table(out); await br.close(); srv.close();
})().catch(e => { console.error(e); process.exit(2); });
