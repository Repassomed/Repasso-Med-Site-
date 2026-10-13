/* Conteúdo FORA de section[id] (#487): por matéria, cada filho direto da aba que não é section[id] → classe posta pelo código servido
   (data-rm-solto, se existir), tamanho do texto, questões, e se fica VISÍVEL no índice geral («Página completa» da navegação), num bloco
   que não é o dele, no bloco do anexo e sem a navegação (só tema). Mede o código servido: sem RM_ENSAIO_REF = disco (main);
   com RM_ENSAIO_REF=<commit> = assets daquele commit (p.ex. a #487). Comparar os dois com soltos-md.cjs.
   Uso: NODE_PATH=$(npm root -g) [RM_ENSAIO_REF=<commit>] node tools/qa/ensaio-layout/soltos.cjs <saida.json> */
'use strict';
const L = require('./lib.cjs'); const fs = require('fs');
(async () => {
  const saida = process.argv[2]; if (!saida) { console.error('uso: soltos.cjs <saida.json>'); process.exit(2); }
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.servir(); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const EST = () => { const t = document.querySelector('#materias-container > .tab-content');
    return [...t.children].filter(e => !(e.tagName === 'SECTION' && e.id) && !/^(FOOTER|STYLE|SCRIPT|LINK|TEMPLATE)$/.test(e.tagName) && !e.hasAttribute('data-rm-ui'))
      .map(e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        return { k: (e.tagName + '.' + String(e.className).split(' ')[0] + (e.id ? '#' + e.id : '')).slice(0, 48), solto: e.getAttribute('data-rm-solto'), de: e.getAttribute('data-rm-anexo-de'),
                 vis: cs.display !== 'none' && r.height > 0, txt: e.textContent.replace(/\s+/g, ' ').trim().length, quiz: e.querySelectorAll('.quiz-item').length }; }); };
  const out = { ref: process.env.RM_ENSAIO_REF || 'disco', gerado_em: new Date().toISOString(), materias: {} };
  for (const m of L.reconciliar().ativas) {
    const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'nav', espera: 900 }); const p = r.page;
    const idx = await p.evaluate(EST);
    /* «outro bloco»: um bloco que não recebe anexo (o 1.º sem anexo logo antes) */
    await p.evaluate(() => { const s = [...document.querySelectorAll('#materias-container > .tab-content > section[id]')].find(x => !x.previousElementSibling || x.previousElementSibling.getAttribute('data-rm-solto') !== 'anexo'); window.RMNav.go({ view: 'block', block: s.id }); });
    await p.waitForTimeout(600); const blk = await p.evaluate(EST);
    const seu = {};
    for (const de of [...new Set(idx.filter(e => e.de).map(e => e.de))]) { await p.evaluate(id => window.RMNav.go({ view: 'block', block: id }), de); await p.waitForTimeout(600); seu[de] = await p.evaluate(EST); }
    await r.ctx.close();
    const r2 = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'tema', espera: 600 }); const semNav = await r2.page.evaluate(EST); await r2.ctx.close();
    out.materias[m.slug] = idx.map((e, i) => Object.assign(e, { visOutroBloco: !!(blk[i] && blk[i].vis), visNoSeuBloco: e.de ? !!(seu[e.de][i] || {}).vis : null, visSemNav: !!(semNav.find(x => x.k === e.k) || {}).vis }));
    process.stdout.write('.');
  }
  fs.writeFileSync(saida, JSON.stringify(out, null, 1) + '\n'); await br.close(); srv.close(); console.log(' ' + saida);
})().catch(e => { console.error(e); process.exit(1); });
