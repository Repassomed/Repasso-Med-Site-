#!/usr/bin/env node
/* Gera as capturas de evidência (PNG → WebP) do card e do player, com mídia real, nas larguras críticas.
   Uso: [RM_B1_DIR=<pasta com rm-layout.js/css e rm-modes.js do B1 real>] node capturas.cjs <pasta-saida> */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { iniciar } = require('./server.cjs');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'capturas'));
fs.mkdirSync(OUT, { recursive: true });
const esperar = ms => new Promise(r => setTimeout(r, ms));
const CASOS = [[320, 568, 1, '320'], [390, 844, 1, '390'], [768, 1024, 1, '768'], [1024, 768, 1, '1024'], [1440, 900, 1, '1440'], [1760, 900, 1, '1760_lateral'], [195, 422, 2, '390_zoom200'], [720, 450, 2, '1440_zoom200']];
(async () => {
  const S = await iniciar();
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h, dsf, nome] of CASOS) {
    const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: w, height: h }, deviceScaleFactor: dsf, hasTouch: w <= 768 });
    const p = await ctx.newPage();
    await p.goto(S.base + '/h'); await p.waitForFunction(() => document.querySelector('#tab-semio2 section[id]'));
    await p.evaluate(() => window.RMLayout.attach(document.getElementById('tab-semio2')));
    await p.addScriptTag({ url: '/assets/rm-audio-boot.js?v=cap' });
    await p.evaluate(() => window.RMAudioBoot.start()); await esperar(500);
    await p.evaluate(() => { const c = document.querySelector('.rm-audio-card'); window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - 140, behavior: 'instant' }); }); await esperar(400);
    await p.screenshot({ path: path.join(OUT, `${nome}_card.png`) });
    await p.locator('.rm-audio-card .rm-audio-card__btn').first().click();
    await p.waitForFunction(() => window.RMAudioBoot._engine().getState().state === 'playing'); await esperar(2500);
    await p.screenshot({ path: path.join(OUT, `${nome}_player.png`) });
    await ctx.close();
  }
  await b.close(); S.fechar();
  /* WebP (menor) quando o Pillow existe */
  const r = cp.spawnSync('python3', ['-c', `import sys,glob,os\nfrom PIL import Image\nfor f in glob.glob(os.path.join(sys.argv[1],'*.png')):\n  Image.open(f).convert('RGB').save(f[:-4]+'.webp','WEBP',quality=70); os.remove(f)`, OUT], { encoding: 'utf8' });
  console.log(r.status === 0 ? 'capturas em ' + OUT + ' (webp)' : 'capturas em ' + OUT + ' (png; Pillow ausente)');
})();
