/* Capturas ANTES × DEPOIS da issue #93 (post-its laterais encobertos). Matéria REAL, mesma página, mesma rolagem: «antes» = o filho com post-it segue como contexto de apilamiento
   (`.container>:has(.rmc-margin){z-index:1!important}`, o que a main faz); «depois» = a regra da correção. Como a geometria é idêntica nos dois estados (provado em postits-encobertos.test.cjs),
   a única diferença entre as duas capturas é a ordem de pintura. Grava <pasta>/<slug>_<largura>_n<i>_{antes,depois}.png (recorte da janela centrado no post-it, com 40 px de margem).
   Uso:  RM_PLAYWRIGHT=... node capturas-93.cjs <pasta-de-saída> [--casos=dermatologia:4,dermatologia:12,farmacologia:..,oftalmologia:..] [--w=1440,1024] */
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.cjs');
const P = require('./postits-93.probe.cjs');
const out = process.argv[2]; if (!out) { console.error('uso: capturas-93.cjs <pasta>'); process.exit(2); }
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const OLD = '#materias-container .rm-cuaderno .container>:has(.rmc-margin){z-index:1!important}';
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  fs.mkdirSync(out, { recursive: true });
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const ws = arg('w', '1440').split(',').map(Number);
  const slugs = arg('slugs', 'dermatologia,farmacologia,oftalmologia').split(',');
  const manifest = [];
  for (const slug of slugs) for (const w of ws) {
    const c = P.catalogo([slug])[0]; const h = 900;
    const { ctx, page } = await P.abrirMateria(br, base, c.slug, c.tab, w, h, {});
    await page.evaluate(P.NOTAS);
    /* candidatos: notas que cuelgam do pai e que ficam cobertas por pixel no estado «antes» */
    const pende = await page.evaluate(() => window.__notas.map((e, i) => { const a = e.getBoundingClientRect(), b = e.parentElement.getBoundingClientRect(); return a.bottom > b.bottom + 1 ? i : -1; }).filter(i => i >= 0));
    const sty = await page.addStyleTag({ content: OLD }); await page.waitForTimeout(300);
    const achados = [];
    for (const i of pende) {
      let v = null; for (let k = 0; k < 4; k++) { await page.evaluate(P.ROLAR, [i, 'centro']); await page.waitForTimeout(250); v = await P.pixel(page, 'nota', i); }
      if (v > 5) achados.push({ i, antes: v });
    }
    for (const a of achados.slice(0, +arg('max', '2'))) {
      const shot = async (estado) => {
        await page.evaluate(P.ROLAR, [a.i, 'centro']); await page.waitForTimeout(300); await page.evaluate(P.ROLAR, [a.i, 'centro']); await page.waitForTimeout(300);
        const r = await page.evaluate(i => { const e = window.__notas[i], r = e.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = innerHeight; return { x: Math.max(0, r.left - 360), y: Math.max(0, r.top - 40), w: Math.min(vw - Math.max(0, r.left - 360), r.width + 380), h: Math.min(vh - Math.max(0, r.top - 40), r.height + 140) }; }, a.i);
        await page.screenshot({ path: path.join(out, `${slug}_${w}_n${a.i}_${estado}.png`), clip: { x: r.x, y: r.y, width: Math.floor(r.w), height: Math.floor(r.h) } });
      };
      await shot('antes');
      await page.evaluate(() => { const s = [...document.querySelectorAll('style')].find(x => x.textContent.includes('z-index:1!important')); if (s) s.disabled = true; }); await page.waitForTimeout(300);
      const dep = await (async () => { await page.evaluate(P.ROLAR, [a.i, 'centro']); await page.waitForTimeout(300); return P.pixel(page, 'nota', a.i); })();
      await shot('depois');
      await page.evaluate(() => { const s = [...document.querySelectorAll('style')].find(x => x.textContent.includes('z-index:1!important')); if (s) s.disabled = false; }); await page.waitForTimeout(300);
      manifest.push({ slug, w, nota: a.i, coberturaAntesPct: a.antes, coberturaDepoisPct: dep });
      console.log(`${slug} ${w} nota ${a.i}: coberta ${a.antes}% → ${dep}%`);
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'casos.json'), JSON.stringify(manifest, null, 1));
  await br.close(); srv.close();
})();
