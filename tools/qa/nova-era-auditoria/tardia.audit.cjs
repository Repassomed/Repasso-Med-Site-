/* AUDITORIA · Nova Era (#622) · RESPOSTA ATRASADA de hasStudyToolsV2Access depois de TROCA DE CONTA.
   Conta A tem linha enabled em study_tools_beta (consulta demora 2 s). Durante a espera entra a conta B (sem linha, sem acesso). A resposta de A chega depois.
   Esperado seguro: a V2 NÃO monta com o uid de A numa sessão de B (ou monta já com o uid de B). Uso: node tardia.audit.cjs <raiz-PR> */
'use strict';
const path = require('path'); const TREE = path.resolve(process.argv[2]);
const { chromium } = require('playwright'); const L = require(TREE + '/tools/qa/ensaio-layout/lib.cjs'); const D = require(TREE + '/tools/qa/pre-voo/lib-dados.cjs'); const S = require(TREE + '/tools/qa/nova-era/lib-servidor.cjs');
const MF = 'medicina-familiar';
const A = 'bbbbbbbb-0000-4000-8000-0000000000a1', B = 'cccccccc-0000-4000-8000-0000000000b2';
let n = 0, ko = 0; const falhas = []; const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; falhas.push(m); console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 400) : ''); } return !!c; };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === MF);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const [rot, atrasoMs, quandoTroca] of [['A confirmada ANTES da troca (controle)', 0, 600], ['resposta de A ATRASADA: B entra durante a consulta', 2500, 700]]) {
    console.log('\n▸ ' + rot);
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slug: null, layout: false, audio: false, pen: false, visual: false }) }));
    await page.addInitScript(([A, B, atraso]) => {
      window.__sessao = { id: sessionStorage.getItem('__sess') || A }; window.__cbs = [];
      let _sb; Object.defineProperty(window, 'RM_SB', { configurable: true, get() { return _sb; }, set(v) {
        const from0 = v.from; v.from = function (t) {
          if (t === 'study_tools_beta') { let eqv = null; const c = { select() { return c; }, eq(k, val) { eqv = val; return c; }, limit() { return c; }, single() { return c; }, maybeSingle() { return new Promise(res => setTimeout(() => res({ data: eqv === A ? { enabled: true } : null, error: null }), atraso)); }, then(res) { return c.maybeSingle().then(res); } }; return c; }
          return from0.apply(this, arguments); };
        v.auth.getSession = async () => ({ data: { session: { access_token: 'tok-' + window.__sessao.id, user: { id: window.__sessao.id } } } }); v.auth.getUser = async () => ({ data: { user: { id: window.__sessao.id } } });
        v.auth.onAuthStateChange = function (cb) { window.__cbs.push(cb); return { data: { subscription: { unsubscribe() {} } } }; }; _sb = v; } });
      Object.defineProperty(window, '_sb', { configurable: true, get() { return window.RM_SB; }, set() {} });
      window.__RM_ENSAIO = { slug: 'medicina-familiar', modo: 'controle' };
    }, [A, B, atrasoMs]);
    await page.addInitScript(() => { }); const url = `${base}/p.html?slug=${MF}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${A}`;
    const t0 = Date.now(); await page.goto(url, { timeout: 120000 }); await page.evaluate(() => sessionStorage.removeItem('__sess'));
    await page.waitForTimeout(quandoTroca);
    await page.evaluate(([B]) => { window.__sessao.id = B; sessionStorage.setItem('__sess', B); window.__cbs.forEach(cb => { try { cb('SIGNED_IN', { user: { id: B }, access_token: 'tok-' + B }); } catch (e) {} }); }, [B]);
    await page.waitForFunction('window.__ready===true', { timeout: 120000 }).catch(() => {}); await page.waitForTimeout(Math.max(1500, atrasoMs + 2500 - (Date.now() - t0)));
    const r = await page.evaluate(() => ({ v2: !!window.RMToolsV2, caixa: !!document.querySelector('.rm2-box'), flagV2: window.RM_STUDY_V2_ACTIVE === true, bloqueado: window.RMToolsV2 && window.RMToolsV2._test.bloqueado ? window.RMToolsV2._test.bloqueado() : null, sessao: window.__sessao.id }));
    console.log('    · estado depois:', JSON.stringify(r));
    let uidGravado = null;
    if (r.caixa) { await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); const b = await page.evaluate(() => { const p = [...document.querySelectorAll('#materias-container > .tab-content.active p')].filter(p => p.textContent.length > 100 && p.checkVisibility && p.checkVisibility() && !p.closest('table,[data-rm-ui]'))[0]; p.scrollIntoView({ block: 'center' }); const x = p.getBoundingClientRect(); return { x: x.left, y: x.top, h: x.height }; }); await page.waitForTimeout(400);
      const b2 = await page.evaluate(() => { const p = [...document.querySelectorAll('#materias-container > .tab-content.active p')].filter(p => p.textContent.length > 100 && p.checkVisibility && p.checkVisibility() && !p.closest('table,[data-rm-ui]'))[0]; const x = p.getBoundingClientRect(); return { x: x.left, y: x.top, h: x.height }; });
      const y = b2.y + Math.min(b2.h / 2, 30); await page.mouse.move(b2.x + 10, y); await page.mouse.down(); for (let i = 1; i <= 12; i++) await page.mouse.move(b2.x + 10 + i * 14, y + (i % 2 ? 5 : -5)); await page.mouse.up(); await page.waitForTimeout(900);
      uidGravado = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]').map(x => x.user_id)); console.log('    · user_id dos traços gravados:', JSON.stringify(uidGravado)); }
    const seguro = !r.caixa || (uidGravado && uidGravado.every(u => u === B)) || r.bloqueado === true;
    ok(seguro, 'a V2 não fica montada com a conta A numa sessão de B (ou nem monta, ou usa o uid de B, ou está bloqueada)', { r, uidGravado });
    ok(errs.length === 0, '0 erro JS', errs); await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`\ntardia (${TREE}): ${n - ko}/${n} OK${ko ? ' — ' + ko + ' FALHA(S)' : ''}`); if (ko) console.log('Falhas:\n - ' + falhas.join('\n - ')); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
