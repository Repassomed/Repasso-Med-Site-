/* AUDITORIA · Nova Era (#622): o aluno com a caneta SÓ em Medicina Familiar, ao abrir OUTRA matéria depois, ainda tem o marcador/goma antigos? (coluna .rm-tools-r) */
'use strict';
const path = require('path');
const TREE = path.resolve(process.argv[2]), PR = path.resolve(process.argv[3] || process.argv[2]);
const { chromium } = require('playwright'); const L = require(TREE + '/tools/qa/ensaio-layout/lib.cjs'); const D = require(TREE + '/tools/qa/pre-voo/lib-dados.cjs'); const S = require(PR + '/tools/qa/nova-era/lib-servidor.cjs'); S.U.JOSE = D.UID;
const MF = 'medicina-familiar';
const T = (l, p) => ({ [MF]: { layout_stage: l, pen_stage: p, visual_stage: 'off' } });
(async () => {
  const rec = L.reconciliar(); const M = s => rec.ativas.find(x => x.slug === s);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const [rot, persona, tabela] of [['CONTROLE: aluno, tudo off', 'ALUNO', T('off', 'off')], ['aluno, caneta=all em MF', 'ALUNO', T('off', 'all')], ['aluno, layout+caneta=all', 'ALUNO', T('all', 'all')]]) {
    const cena = { env: { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE }, tabela, acessos: { [S.U.ALUNO]: [MF, 'dermatologia'] } };
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', async r => { const o = await S.chamar(cena, persona, new URL(r.request().url()).searchParams.get('slug')); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
    await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [MF]);
    await page.goto(`${base}/p.html?slug=${MF}&tab=${M(MF).tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U[persona]}`, { timeout: 120000 });
    await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(700);
    await page.addScriptTag({ url: '/assets/rm-pilot.js?v=teste' }); await page.waitForTimeout(2500);
    /* segunda matéria REAL: o HTML privado de dermatologia, montado e «enriquecido» como o site faz (enhanceAll + switchTab) */
    const r = await page.evaluate(async (dt) => {
      const html = await (await fetch('/m/dermatologia.html')).text().catch(() => '');
      const t = document.createElement('div'); t.className = 'tab-content'; t.id = 'tab-' + dt; t.innerHTML = html || '<section id="dd-b01" class="container"><h2>Bloque</h2><p>' + 'Texto de prueba. '.repeat(30) + '</p></section>';
      document.getElementById('materias-container').appendChild(t);
      const antes = { v2: window.RM_STUDY_V2_ACTIVE === true };
      window.RepassoMed.enhanceAll(); window.switchTab(dt); await new Promise(o => setTimeout(o, 1500));
      const tab = document.getElementById('tab-' + dt); const vis = el => { if (!el) return false; const cs = getComputedStyle(el), b = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0; };
      return { antes, usouHtmlReal: !!html, flagV2Agora: window.RM_STUDY_V2_ACTIVE === true, colunaAntigaNoDOM: !!tab.querySelector('.rm-tools-r'), colunaAntigaVisivel: vis(tab.querySelector('.rm-tools-r')), marcadorVisivel: vis(tab.querySelector('.rm-tools-r .rm-mark')), caixaV2: vis(document.querySelector('.rm2-box')) };
    }, M('dermatologia').tab);
    console.log(rot.padEnd(34), JSON.stringify(r), errs.length ? errs : ''); await ctx.close();
  }
  await br.close(); srv.close();
})();
