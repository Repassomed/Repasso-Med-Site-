/* Capturas das partes novas (1440 e 390 px), layout antigo. Uso: NODE_PATH=$(npm root -g) node tools/qa/medicina-legal-p2/capturas.cjs <dir> */
'use strict';
const fs = require('fs'), path = require('path'); const L = require('../ensaio-layout/lib.cjs');
const OUT = process.argv[2] || '/tmp/mlcap';
const ALVOS = [['b10-1-anoxias', 'medlegb10', 'h3', '1 · ¿Qué es una asfixia', 1500], ['b10-4-ahorcadura-detalle', 'medlegb10', 'h4', 'La ahorcadura, con más detalle', 1700], ['b10-6-sumersion-fases', 'medlegb10', 'h3', '6 · Sumersión', 1700], ['b10-7-caso', 'medlegb10', 'h3', '7 · Un caso para integrar', 800], ['b03-3-agonia-coagulos', 'medlegb03', 'h3', '3 · Agonía y comprobaciones', 1200], ['b04-5-congelacion', 'medlegb04', 'h3', '4 · Cuando el ambiente conserva', 900]];
(async () => {
  const { chromium } = require('playwright'); const m = L.reconciliar().ativas.find(x => x.slug === 'medicina-legal');
  const srv = await L.servir({}); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch(); fs.mkdirSync(OUT, { recursive: true });
  for (const W of [1440, 390]) {
    const r = await L.abrir(br, base, m, { w: W, h: W === 390 ? 844 : 900, modo: 'controle', espera: 800 }); const p = r.page;
    for (const [nome, sec, tag, texto, alto] of ALVOS) {
      await p.evaluate(([s, t, x]) => { const h = [...document.querySelectorAll('#' + s + ' ' + t)].find(e => e.textContent.includes(x)); h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -20); }, [sec, tag, texto]);
      await p.waitForTimeout(500);
      await p.screenshot({ path: path.join(OUT, `${nome}-${W}.png`), clip: { x: 0, y: 0, width: W, height: Math.min(alto, W === 390 ? 1700 : 1500) } }).catch(async () => { await p.screenshot({ path: path.join(OUT, `${nome}-${W}.png`) }); });
    }
    await r.ctx.close();
  }
  await br.close(); srv.close(); console.log('capturas em', OUT);
})();
