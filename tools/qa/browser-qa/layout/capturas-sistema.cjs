/* Capturas do SISTEMA VISUAL (piloto Semiología II) — desktop · tablet · celular, com a matéria REAL e o shell real.
   Uso:  RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/capturas-sistema.cjs <pasta-de-saída> [pasta-com-fontes]
   Gate do piloto simulado (get-pilot-flags → layout+visual). Fontes: se <pasta-com-fontes>/local.css existir (Google Fonts baixadas
   fora do repositório), ela é servida no lugar do fonts.googleapis.com; sem ela as fontes caem nas do sistema (declarado na PR). */
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.cjs');
const OUT = path.resolve(process.argv[2] || 'capturas-sistema'), FD = process.argv[3] ? path.resolve(process.argv[3]) + '/' : null;
fs.mkdirSync(OUT, { recursive: true });

/* [nome, seletor-alvo, deslocamento (px, positivo = rola mais), cena] por largura */
const CENAS = {
  desktop: { w: 1440, h: 900, lista: [
    ['01-inicio', null, 0], ['02-indice-materia', '.rm-sis-idx', 0], ['03-bloque-04', '#s2-b04', 0], ['04-tabla', '#s2-b01 .rm-sis-tabtag', 30, 1],
    ['05-tabla-comparativa', '#s2-b01 table[data-rm-cmp]', 40], ['06-notas-p4', '#s2-b01 .key-box', 60], ['07-infografia-alerta', '#s2-b01 figure', 10],
    ['08-preguntas', '#s2-b04 .s2-quiz-card', 0], ['09-auscultacion', '#s2-b01 .audio-player', 30], ['10-flashcards-lanzador', '#s2-b01 .rmfc-launch', 60], ['11-flashcards-juego', 'fc', 0],
    ['12-banco', '#s2-banco', 0] ] },
  tablet: { w: 768, h: 1024, lista: [['01-inicio', null, 0], ['02-bloque-04', '#s2-b04', 0], ['03-tabla', '#s2-b01 .rm-sis-tabtag', 30, 1], ['04-preguntas', '#s2-b04 .s2-quiz-card', 0], ['05-indice-gaveta', 'drawer', 0]] },
  celular: { w: 390, h: 844, lista: [['01-inicio', null, 0], ['02-modos-indice', '.rm-sis-label', 10], ['03-bloque-04', '#s2-b04', 0], ['04-tabla-apilada', '#s2-b01 .rm-sis-tabtag', 30, 1],
    ['05-preguntas', '#s2-b04 .s2-quiz-card', 0], ['06-notas-p4', '#s2-b01 .key-box', 60], ['07-flashcards-juego', 'fc', 0], ['08-indice-gaveta', 'drawer', 0],
    ['09-postit', '#s2-b04 .rm-postit', 60], ['10-caneta', 'pen', 0], ['11-caneta-tabla', 'pentable', 0], ['12-caneta-escrita', 'penwrite', 0]] },
  celular320: { w: 320, h: 640, lista: [['01-inicio', null, 0], ['02-bloque-04', '#s2-b04', 0], ['03-tabla-apilada', '#s2-b01 .rm-sis-tabtag', 30, 1], ['04-notas-p4', '#s2-b01 .key-box', 60], ['05-postit', '#s2-b04 .rm-postit', 60], ['06-caneta', 'pen', 0], ['07-indice-gaveta', 'drawer', 0], ['08-caneta-tabla', 'pentable', 0], ['09-caneta-escrita', 'penwrite', 0]] }
};

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch(); const log = [];
  for (const [dev, cfg] of Object.entries(CENAS)) {
    const ctx = await br.newContext({ viewport: { width: cfg.w, height: cfg.h }, hasTouch: cfg.w < 900 });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
    await p.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slug: 'semiologia-ii', layout: true, visual: true }) }));
    if (FD && fs.existsSync(FD + 'local.css')) {
      await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fs.readFileSync(FD + 'local.css', 'utf8') }));
      await p.route('**/__fonts/**', r => r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(FD + path.basename(new URL(r.request().url()).pathname)) }));
    }
    await p.goto(`${base}/p.html?slug=semiologia-ii&tab=semio2&uid=d4d215d3-36dd-4efb-8869-bdea5376c648&wait=1800`); await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(1800);
    await p.evaluate(() => { if (window.RMNav && window.RMNav.ativo && window.RMNav.ativo()) window.RMNav.detach(); });     // estas cenas são da leitura CONTÍNUA (PR #446); a navegação por bloco tem capturas-navegacion.cjs
    await p.waitForTimeout(300);
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
    for (const [nome, sel, off, nth] of cfg.lista) {
      const f = path.join(OUT, `${dev.replace('celular320', 'celular')}-${cfg.w}_${nome}.png`);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
      if (sel === 'drawer') { await p.click('.rm-l2-hamb'); await p.waitForTimeout(500); await p.screenshot({ path: f }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
      else if (sel === 'pentable' || sel === 'penwrite') {   // caneta ABERTA (toque no controle) sobre a tabela / escrevendo no post-it; antes (HEAD anterior) o controle era a maleta flutuante #rm2-fab
        const alvoSel = sel === 'pentable' ? '#s2-b01 .rm-sis-tabtag' : '#s2-b04 .rm-postit', nth = sel === 'pentable' ? 1 : 0;
        await p.evaluate(([s2, n]) => window.RMLayout.irPara(document.querySelectorAll(s2)[n]), [alvoSel, nth]); await p.waitForTimeout(1800);
        await p.evaluate(() => window.scrollBy(0, -30)); await p.waitForTimeout(400);
        const ferr = (await p.$('.rm-sis-tools')) ? '.rm-sis-tools' : '#rm2-fab';
        await p.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await p.waitForTimeout(300);
        if (await p.evaluate(() => document.querySelector('.rm2-box').classList.contains('open'))) { await p.tap(ferr); await p.waitForTimeout(500); }     // começa sempre FECHADA
        await p.tap(ferr); await p.waitForTimeout(600);                                                                                                 // abre por toque no controle
        if (sel === 'penwrite') {
          await p.tap('.rm2-btn[data-t="pen"]'); await p.waitForTimeout(250); await p.tap('.rm2-sw[data-pc="blue"]'); await p.tap('.rm2-w[data-pw="thick"]'); await p.waitForTimeout(300);
          await p.evaluate(async () => {
            const esp = ms => new Promise(o => setTimeout(o, ms)); const el = document.querySelector('#s2-b04 .rm-postit p'); const b = el.getBoundingClientRect();
            const y0 = Math.max(b.top, document.getElementById('rm-l2-band').getBoundingClientRect().bottom + 20) + 12, x0 = b.left + 14;
            const fire = (ty, x, y, bt) => el.dispatchEvent(new PointerEvent(ty, { pointerType: 'pen', pointerId: 21, isPrimary: true, clientX: x, clientY: y, buttons: bt, bubbles: true, cancelable: true, pressure: bt ? .5 : 0 }));
            fire('pointerover', x0, y0, 0); fire('pointerdown', x0, y0, 1);
            for (let i = 1; i <= 22; i++) { fire('pointermove', x0 + i * 8, y0 + Math.sin(i / 2) * 6, 1); await esp(14); }
            fire('pointerup', x0 + 176, y0, 0); await esp(900);
          });
        }
        await p.waitForTimeout(3000);                      // o aviso passageiro («Lápiz activo…») já sumiu
        await p.screenshot({ path: f });
        await p.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await p.waitForTimeout(300);
        if (await p.evaluate(() => document.querySelector('.rm2-box').classList.contains('open'))) { await p.tap(ferr); await p.waitForTimeout(500); }
      }
      else if (sel === 'pen') {                           // caneta armada sobre o post-it (toolbox da V2 visível), página rolada de verdade
        await p.evaluate(() => window.RMLayout.irPara(document.querySelector('#s2-b04 .rm-postit'))); await p.waitForTimeout(1800);
        await p.evaluate(() => { window.scrollBy(0, -60); window.RMToolsV2.escolherFerramenta('pen'); }); await p.waitForTimeout(900);
        await p.waitForTimeout(2800); await p.screenshot({ path: f }); await p.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await p.waitForTimeout(300);
      }
      else if (sel === 'fc') {
        await p.evaluate(() => window.RMLayout.irPara(document.querySelector('#s2-b01 .rmfc-launch'))); await p.waitForTimeout(1800);
        await p.click('#s2-b01 .rmfc-play'); await p.waitForTimeout(500); await p.click('.rmfc-overlay [data-a="flip"]'); await p.waitForTimeout(700);
        await p.screenshot({ path: f }); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      } else {
        if (sel) { await p.evaluate(([s, n]) => window.RMLayout.irPara(document.querySelectorAll(s)[n || 0]), [sel, nth || 0]); await p.waitForTimeout(1900); if (off) { await p.evaluate(o => window.scrollBy(0, -o), off); await p.waitForTimeout(500); } }
        await p.screenshot({ path: f });
      }
      log.push(path.basename(f));
    }
    console.log(dev, cfg.w + '×' + cfg.h, 'erros JS:', JSON.stringify(errs));
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(log.length + ' capturas em ' + OUT);
})();
