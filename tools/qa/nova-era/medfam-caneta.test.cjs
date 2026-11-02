/* CANETA V2 EM MEDICINA FAMILIAR (layout + tema + caneta juntos) — o mesmo comportamento aprovado em Semiología II, medido com a MESMA instrumentação da suíte caneta-novo-layout
   (pen-bench: eventos de caneta reais via CDP, pointerType:'pen'): 1 traço por gesto, 0 pontos perdidos, gravado pelo motor (1 insert), âncora = elemento escrito, o traço volta ao atualizar a página;
   dedo com a caneta armada NÃO desenha; goma apaga e «desfazer» restaura. Alvos reais da matéria: parágrafo · tabela · anotação ao margem (post-it) · caixa «cae en examen».
   Critério de fidelidade: o MESMO da suíte aprovada — desvio máximo ≤ 1,6 px, 0 pontos perdidos.
   Conta administradora; Supabase simulado; nada de aluno real. Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/medfam-caneta.test.cjs [--rapido] */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs'); const D = require('../pre-voo/lib-dados.cjs'); const S = require('./lib-servidor.cjs'); const B = require('../browser-qa/layout/pen-bench.cjs'); S.U.JOSE = D.UID;
const RAPIDO = process.argv.includes('--rapido'); const SLUG = 'medicina-familiar';
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 400) : ''); } return !!c; };
const ALVOS = { paragrafo: () => [...document.querySelectorAll('#aps p')].filter(p => !p.closest('[data-rm-ui],table,.rmc-margin,.key-box,.quiz-item') && p.textContent.trim().length > 160 && p.checkVisibility())[0],
  tabela: () => document.querySelector('#aps table tbody tr') || document.querySelector('#aps table'),
  postit: () => [...document.querySelectorAll('#aps .rmc-margin, #aps .rm-postit')].filter(e => e.checkVisibility())[0],
  caja: () => [...document.querySelectorAll('#aps .key-box')].filter(e => e.checkVisibility())[0] };
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === SLUG); const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const cena = { env: { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE, RM_PILOT_VISUAL_UIDS: S.U.JOSE }, acessos: {}, tabela: { [SLUG]: { layout_stage: 'preview', pen_stage: 'preview', visual_stage: 'preview' } } };
  for (const W of (process.env.RM_LARGURAS ? process.env.RM_LARGURAS.split(',').map(Number) : RAPIDO ? [1440] : [1440, 768, 390])) {
    console.log(`\n▸ [${W}px] layout + tema + caneta · Medicina Familiar`);
    const ctx = await br.newContext({ viewport: { width: W, height: W < 500 ? 844 : 900 }, hasTouch: W < 900 }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', async r => { const sl = new URL(r.request().url()).searchParams.get('slug'); const o = await S.chamar(cena, 'JOSE', sl); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
    await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [SLUG]);
    const url = `${base}/p.html?slug=${SLUG}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U.JOSE}`;
    const abrir = async () => { await page.goto(url); await page.waitForFunction('window.__ready===true'); await page.waitForTimeout(500); await page.addScriptTag({ url: '/assets/rm-pilot.js?v=p' }); await page.waitForTimeout(6500); await page.evaluate(() => RMNav.go({ view: 'block', block: 'aps' })); await page.waitForTimeout(2000); };
    await abrir(); await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; }); await page.evaluate(B.INSTR);
    const st = await page.evaluate(() => ({ l: !!document.querySelector('.rm-l2, #rm-l2-side'), t: document.documentElement.getAttribute('data-rm-tema'), v2: !!window.RMToolsV2, piloto: window.RMToolsV2 && RMToolsV2._test.pilotoPermitido() }));
    ok(st.l && st.t === SLUG && st.v2 && st.piloto === true, 'layout + tema + caneta V2 (refinamentos físicos) ligados', st);
    const ins = () => page.evaluate(() => (window.__writes || []).filter(w => w === 'insert:user_ink_strokes').length);
    const tracos = () => page.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
    let total = 0;
    for (const alvo of Object.keys(ALVOS)) for (const gn of (W === 1440 && !RAPIDO ? ['rapido', 'longo'] : ['rapido'])) {
      await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
      const r = await page.evaluate(([nome, fn]) => { const el = (new Function('return (' + fn + ')'))()(); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, [alvo, ALVOS[alvo].toString()]);
      if (!r || r.h < 12) { ok(false, `${alvo}: alvo não encontrado/visível`, r); continue; }
      await page.waitForTimeout(500);
      let r2 = null; for (let k = 0; k < 12; k++) { const q = await page.evaluate(([fn]) => { const el = (new Function('return (' + fn + ')'))()(); const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, sy: scrollY }; }, [ALVOS[alvo].toString()]); if (r2 && Math.abs(q.y - r2.y) < 0.5 && Math.abs(q.sy - r2.sy) < 0.5) { r2 = q; break; } r2 = q; await page.waitForTimeout(250); }   // espera a rolagem assentar (nada de animação durante o gesto)
      const n0 = await tracos(), w0 = await ins(); const pts = B.gesto(gn, r2);
      await B.desenhar(ctx, page, pts, 2, 1); await page.waitForTimeout(1000);
      const per = await B.medirPerdas(page, pts); const n1 = await tracos(), w1 = await ins(); total++;
      const tol = 1.6;
      ok(n1 === n0 + 1 && per.perdidos === 0 && per.maxDist <= tol && w1 === w0 + 1, `${alvo} · ${gn}: 1 traço novo (${n0}→${n1}), ${per.perdidos}/${pts.length} pontos perdidos, desvio máx ${per.maxDist && per.maxDist.toFixed(2)} px (limite ${tol} px; alvo de ${Math.round(r2.h)} px de altura), gravado (${w0}→${w1})`, { per, n0, n1, w0, w1, tol });
    }
    /* dedo com a caneta armada NÃO desenha */
    if (W < 900) {
      await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); const n0 = await tracos();
      const r = await page.evaluate(() => { const p = [...document.querySelectorAll('#aps p')].find(p => !p.closest('[data-rm-ui],table,.rmc-margin') && p.checkVisibility() && p.textContent.trim().length > 160); p.scrollIntoView({ block: 'center' }); const b = p.getBoundingClientRect(); return { x: b.left + 40, y: Math.max(160, Math.min(innerHeight - 100, b.top + 12)) }; }); await page.waitForTimeout(700);
      const cdp = await ctx.newCDPSession(page); const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
      await tp('touchStart', r.x, r.y); for (let i = 1; i <= 8; i++) await tp('touchMove', r.x + i * 14, r.y + (i % 2 ? 4 : -4)); await tp('touchEnd', r.x + 112, r.y); await page.waitForTimeout(700); await cdp.detach().catch(() => {});
      ok((await tracos()) === n0, 'dedo com a caneta armada NÃO desenha (rola)', [n0, await tracos()]);
    }
    /* goma apaga; desfazer restaura */
    const n2 = await tracos(); await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await page.evaluate(() => window.RMToolsV2.desfazer());
    await page.waitForTimeout(900); const n3 = await tracos();
    ok(n3 === n2 - 1, 'desfazer remove o último traço (e só ele)', [n2, n3]);
    await page.evaluate(() => window.RMToolsV2.desfazer()).catch(() => {}); /* mantém o resto para a conferência de recarga */
    /* recarga: os traços voltam, na mesma âncora */
    const antes = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]').map(x => x.anchor_id).sort());
    await page.reload(); await page.waitForFunction('window.__ready===true'); await page.waitForTimeout(500); await page.addScriptTag({ url: '/assets/rm-pilot.js?v=p2' }); await page.waitForTimeout(6500); await page.evaluate(() => RMNav.go({ view: 'block', block: 'aps' })); await page.waitForTimeout(2000);
    const depois = await page.evaluate(() => ({ ancoras: JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]').map(x => x.anchor_id).sort(), desenhados: document.querySelectorAll('#rm2-ink path[data-ink]').length }));
    ok(JSON.stringify(antes) === JSON.stringify(depois.ancoras) && depois.desenhados >= 1, `atualizar a página: ${depois.ancoras.length} traços gravados nas mesmas âncoras, ${depois.desenhados} desenhados no bloco aberto`, [antes.length, depois]);
    ok(errs.length === 0, '0 erro JS', errs);
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`\nmedfam-caneta: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
