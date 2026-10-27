/* A7 · CANETA FÍSICA POR MATÉRIA — rm-tools-v2.js REAL no harness do ensaio (matéria real, Supabase simulado no sessionStorage, zero rede externa).
   O servidor/rm-pilot.js é substituído por um RMPilot de teste que cumpre o contrato da A5 (`penLiberada(slug)` + `candidatas()`); a integração com a A5 REAL é testada em
   gate-por-materia.test.cjs (PR A5) e na rodada conjunta registrada no cartão da PR.
   Prova:
     1  fora do piloto, sem liberação do servidor PARA A MATÉRIA ⇒ pilotoPermitido()=false: nada do piloto físico liga (classe rm2-pilot, adaptador de toque);
     2  com a liberação para a matéria ⇒ liga; liberação para OUTRA matéria não vale; a conta fixa do código (JOSE_UID) NÃO basta fora do piloto;
     3  RMPilot antigo (sem `candidatas`, isto é, sem A5) nunca libera outra matéria — falha fechada;
     4  o piloto (Semiología II) segue como antes: JOSE_UID basta, sem RMPilot;
     5  a caneta funciona nas duas situações (desenha 1 traço ancorado, grava 1 insert) e os grifos/traços/notas anteriores continuam IDÊNTICOS;
     6  retorno: servidor tira a liberação (evento rm-pilot-flags) ⇒ o piloto físico desliga na hora, os traços ficam, nada é apagado.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/caneta-por-materia.test.cjs */
'use strict';
process.env.RM_ENSAIO_SEM = 'A7';   // o código real da A7 substitui a simulação do ensaio (PILOT_SLUGS ampliado em memória)
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
const D = require('./lib-dados.cjs');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);

const STUB = (cfg) => `(() => { window.__penMap = ${JSON.stringify(cfg.mapa)}; ${cfg.antigo ? '' : "window.RMPilot = { slug: 'semiologia-ii', candidatas: function () { return []; }, penLiberada: function (s) { return !!window.__penMap[s || 'semiologia-ii']; } };"}
  ${cfg.antigo ? "window.RMPilot = { slug: 'semiologia-ii', penLiberada: function () { return !!window.__penMap['semiologia-ii'] || !!window.__penMap.__qualquer; } };" : ''} })();`;

async function abrir(br, base, m, cfg) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.addInitScript(([slug]) => { window.__RM_ENSAIO = { slug, modo: 'controle' }; }, [m.slug]);
  await page.addInitScript(STUB(cfg));
  await page.goto(`${base}/p.html?slug=${m.slug}&tab=${m.tab}&modo=controle&wait=1500&persist=1`, { timeout: 120000 });
  await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(900);
  return { ctx, page, errs };
}
const estado = (p) => p.evaluate(() => ({ perm: window.RMToolsV2 && window.RMToolsV2._test.pilotoPermitido(), cls: document.body.classList.contains('rm2-pilot'), ad: !!(window.RMToolsV2 && window.RMToolsV2._test.adaptadorLigado()), tool: window.RMToolsV2 && window.RMToolsV2.estado.tool }));
async function armar(p) { await p.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await p.waitForTimeout(500); }
async function tracoPen(ctx, page) {                 // 1 traço real com a caneta (CDP, pointerType pen) sobre o 1.º parágrafo longo
  const r = await page.evaluate(() => { const p = [...document.querySelectorAll('#materias-container .tab-content section[id] p')].filter(x => !x.closest('[data-rm-ui],.quiz-item,.flashcard,details:not([open]),table') && x.textContent.length > 140 && x.getBoundingClientRect().width > 300)[3]; p.scrollIntoView({ block: 'center' }); const b = p.getBoundingClientRect(); return { x: b.left, y: b.top }; });
  await page.waitForTimeout(400);
  const r2 = await page.evaluate(() => { const p = [...document.querySelectorAll('#materias-container .tab-content section[id] p')].filter(x => !x.closest('[data-rm-ui],.quiz-item,.flashcard,details:not([open]),table') && x.textContent.length > 140 && x.getBoundingClientRect().width > 300)[3]; const b = p.getBoundingClientRect(); return { x: b.left, y: b.top }; });
  const cdp = await ctx.newCDPSession(page); const send = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
  await send('mouseMoved', r2.x + 30, r2.y + 14, { buttons: 0 }); await send('mousePressed', r2.x + 30, r2.y + 14, { button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 24; i++) await send('mouseMoved', r2.x + 30 + i * 6, r2.y + 14 + Math.sin(i / 3) * 5, { button: 'left', buttons: 1 });
  await send('mouseReleased', r2.x + 174, r2.y + 14, { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(800);
}

(async () => {
  const rec = L.reconciliar(); const M = s => rec.ativas.find(x => x.slug === s);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const PIL = 'semiologia-ii', A = 'dermatologia', B = 'biologia';

  async function cena(slug, cfg, rotulo, esperaPerm, comTraco) {
    const c = await abrir(br, base, M(slug), cfg);
    try {
      await c.page.evaluate(D.SEMEAR, { slug, uid: D.UID, max: 5 });
      await c.page.reload(); await c.page.waitForFunction('window.__ready===true'); await c.page.waitForTimeout(900);
      const ref = await c.page.evaluate(D.MEDIR);
      await armar(c.page); const e = await estado(c.page);
      ok(e.perm === esperaPerm, `${rotulo}: pilotoPermitido() = ${esperaPerm}`, e);
      ok(e.cls === esperaPerm && (!esperaPerm || e.ad === true || typeof window === 'undefined'), `${rotulo}: classe rm2-pilot ${esperaPerm ? 'ligada' : 'desligada'}${esperaPerm ? ' e adaptador de toque registrado' : ''}`, e);
      let dep = ref;
      if (comTraco) {
        const w0 = (await c.page.evaluate(() => window.__writes.slice())).length;
        await tracoPen(c.ctx, c.page);
        const w = await c.page.evaluate(() => window.__writes.slice());
        ok(w.length === w0 + 1 && w[w.length - 1] === 'insert:user_ink_strokes', `${rotulo}: a caneta desenhou e gravou 1 traço (insert)`, w.slice(w0));
        dep = await c.page.evaluate(D.MEDIR);
        const novos = dep.tracos.filter(t => !ref.tracos.some(r => r.id === t.id));
        ok(novos.length === 1 && novos[0].vis, `${rotulo}: 1 traço novo preso a ${novos[0] && novos[0].a}`, novos);
      }
      const dif = D.comparar(ref, dep, 'a').filter(x => !/^(traco-novo|escreveu-no-banco|erro-js)$/.test(x.tipo));
      ok(dif.length === 0 && ref.grifos.length > 0, `${rotulo}: ${ref.grifos.length} grifos, ${ref.tracos.length} traços e ${ref.notas.length} nota(s) anteriores IDÊNTICOS`, dif.slice(0, 3));
      ok(c.errs.length === 0, `${rotulo}: 0 erros JS`, c.errs);
      return c;
    } catch (e) { await c.ctx.close(); throw e; }
  }

  sec('1 · fora do piloto, sem liberação para a matéria ⇒ nada do piloto físico liga');
  { const c = await cena(A, { mapa: {} }, 'dermatologia sem liberação', false, true); await c.ctx.close(); }
  sec('2 · liberação POR MATÉRIA: vale para ela, não para outra; a conta fixa do código não basta');
  { const c = await cena(A, { mapa: { [A]: true } }, 'dermatologia liberada', true, true); await c.ctx.close(); }
  { const c = await cena(B, { mapa: { [A]: true } }, 'biologia (liberada só dermatologia)', false, false); await c.ctx.close(); }
  sec('3 · RMPilot antigo (sem A5) nunca libera outra matéria');
  { const c = await cena(A, { mapa: { __qualquer: true, [PIL]: true }, antigo: true }, 'RMPilot antigo', false, false); await c.ctx.close(); }
  sec('4 · o piloto segue como antes (JOSE_UID basta)');
  { const c = await cena(PIL, { mapa: {} }, 'semiologia-ii com a conta do código', true, true); await c.ctx.close(); }
  sec('6 · retorno: o servidor tira a liberação ⇒ desliga na hora, os traços ficam');
  { const c = await cena(A, { mapa: { [A]: true } }, 'antes de tirar', true, true);
    const antes = await c.page.evaluate(D.MEDIR);
    await c.page.evaluate(() => { window.__penMap.dermatologia = false; window.dispatchEvent(new Event('rm-pilot-flags')); }); await c.page.waitForTimeout(600);
    const e = await estado(c.page);
    ok(e.perm === false && e.cls === false, 'depois de tirar: pilotoPermitido()=false e classe rm2-pilot desligada', e);
    const dep = await c.page.evaluate(D.MEDIR);
    ok(dep.tracos.length === antes.tracos.length && dep.grifos.length === antes.grifos.length && dep.escritas.length === antes.escritas.length, `traços (${dep.tracos.length}) e grifos (${dep.grifos.length}) intactos, nenhuma escrita nova`, { a: antes.tracos.length, d: dep.tracos.length });
    await c.ctx.close(); }

  await br.close(); srv.close();
  console.log(`\ncaneta-por-materia: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
