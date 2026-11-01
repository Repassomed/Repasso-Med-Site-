/* AUDITORIA · Nova Era (#622): fidelidade do traço do ALUNO COMUM em Medicina Familiar (pen=all): distância máxima entre os pontos que a mão deu e o caminho gravado/redesenhado,
   sobre parágrafo, linha de tabela e post-it, a 1440 e 390 px. Mesma métrica da bateria caneta-novo-layout (medirPerdas; tolerância dela: 1,6 px). */
'use strict';
const path = require('path'); const TREE = path.resolve(process.argv[2]);
const { chromium } = require('playwright'); const L = require(TREE + '/tools/qa/ensaio-layout/lib.cjs'); const D = require(TREE + '/tools/qa/pre-voo/lib-dados.cjs'); const S = require(TREE + '/tools/qa/nova-era/lib-servidor.cjs'); S.U.JOSE = D.UID;
const B = require(TREE + '/tools/qa/browser-qa/layout/pen-bench.cjs');
const MF = 'medicina-familiar';
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === MF);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const W of [1440, 390]) {
    const cena = { env: { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE }, tabela: { [MF]: { layout_stage: 'off', pen_stage: 'all', visual_stage: 'off' } }, acessos: { [S.U.ALUNO]: [MF] } };
    const ctx = await br.newContext({ viewport: { width: W, height: W < 600 ? 844 : 900 }, hasTouch: W < 600 }); const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', async r => { const o = await S.chamar(cena, 'ALUNO', new URL(r.request().url()).searchParams.get('slug')); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
    await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [MF]);
    await page.goto(`${base}/p.html?slug=${MF}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U.ALUNO}`, { timeout: 120000 }); await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(700);
    await page.addScriptTag({ url: '/assets/rm-pilot.js?v=teste' }); await page.waitForTimeout(2500);
    const cdp = await ctx.newCDPSession(page);
    for (const alvo of ['paragrafo', 'tabela', 'postit']) {
      await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await page.waitForTimeout(300);
      const info = await page.evaluate((al) => { const tab = document.querySelector('#materias-container > .tab-content.active'); const ok = e => e.checkVisibility && e.checkVisibility() && !e.closest('[data-rm-ui],.quiz-item,.flashcard');
        let el; if (al === 'paragrafo') el = [...tab.querySelectorAll('section p')].filter(p => ok(p) && p.textContent.length > 150 && !p.closest('table,.rmc-postit,.rmc-detalle'))[3]; else if (al === 'tabela') el = [...tab.querySelectorAll('section table tbody tr')].filter(ok)[1]; else el = [...tab.querySelectorAll('.rmc-postit,.rm-postit,.rmc-detalle')].filter(ok)[0];
        if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const sec = el.closest('section[id]'); return { w: r.width, h: r.height, secH: sec ? Math.round(sec.getBoundingClientRect().height) : null, sec: sec && sec.id, cls: el.className }; }, alvo);
      if (!info) { console.log(`[${W}px] ${alvo}: sem alvo visível`); continue; } await page.waitForTimeout(900);
      const r = await page.evaluate((al) => { const tab = document.querySelector('#materias-container > .tab-content.active'); const ok = e => e.checkVisibility && e.checkVisibility() && !e.closest('[data-rm-ui],.quiz-item,.flashcard');
        let el; if (al === 'paragrafo') el = [...tab.querySelectorAll('section p')].filter(p => ok(p) && p.textContent.length > 150 && !p.closest('table,.rmc-postit,.rmc-detalle'))[3]; else if (al === 'tabela') el = [...tab.querySelectorAll('section table tbody tr')].filter(ok)[1]; else el = [...tab.querySelectorAll('.rmc-postit,.rm-postit,.rmc-detalle')].filter(ok)[0];
        const b = el.getBoundingClientRect(); window.__pbOld = new WeakSet(document.querySelectorAll('#rm2-ink path[data-ink]')); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, alvo);
      const pts = []; const n = 60; for (let i = 0; i <= n; i++) pts.push([r.x + 12 + (i / n) * Math.max(10, Math.min(r.w - 24, 420)), r.y + Math.min(r.h / 2, 30) + Math.sin(i / 4) * 5]);
      const send = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
      await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 }); await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
      for (let i = 1; i < pts.length; i++) await send('mouseMoved', pts[i][0], pts[i][1], { button: 'left', buttons: 1, force: .5 });
      await send('mouseReleased', pts[pts.length - 1][0], pts[pts.length - 1][1], { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(900);
      const p = await B.medirPerdas(page, pts); const anc = await page.evaluate(() => { const s = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].map(x => x.getAttribute('data-anchor')); return s[s.length - 1]; });
      console.log(`[${W}px] ${alvo.padEnd(9)} alvo ${Math.round(info.w)}×${Math.round(info.h)} (seção ${info.sec} ${info.secH}px) ⇒ âncora ${anc} · máx ${p.maxDist && p.maxDist.toFixed(2)} px · perdidos ${p.perdidos}/${pts.length}`);
    }
    await ctx.close();
  }
  await br.close(); srv.close();
})().catch(e => { console.error(e); process.exit(2); });
