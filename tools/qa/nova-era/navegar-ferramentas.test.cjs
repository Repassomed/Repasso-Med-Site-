/* #631 · CAIXA DE FERRAMENTAS × NAVEGAÇÃO. Com a caixa aberta e uma ferramenta armada (lápis, goma, marcador) — ou só com a caixa aberta —, UM toque em Próximo/Anterior/Índice,
   cartão ou modo FECHA a caixa, DESARMA a ferramenta e EXECUTA a navegação no mesmo toque; sem segundo toque, sem traço/grifo/escrita por engano, sem perder o que já existe.
   Entradas reais: mouse, toque (dedo, < 900 px) e caneta (CDP pointerType:'pen'). Matérias: Medicina Familiar (layout + tema + caneta, prévia do administrador) e Semiología II (piloto).
   Também prova o que NÃO muda: tocar no CONTEÚDO com a caneta/goma armada continua suprimindo clique e mantendo a caixa (comportamento aprovado).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/navegar-ferramentas.test.cjs [slug…]   (RM_LARGURAS=390,768,1440) */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs'); const D = require('../pre-voo/lib-dados.cjs'); const S = require('./lib-servidor.cjs'); S.U.JOSE = D.UID;
const SLUGS = process.argv.slice(2).length ? process.argv.slice(2) : ['medicina-familiar', 'semiologia-ii'];
const LARG = process.env.RM_LARGURAS ? process.env.RM_LARGURAS.split(',').map(Number) : [1440, 768, 390];
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (c) { if (process.env.VERBOSO) console.log('    ✓', m); } else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 300) : ''); } return !!c; };
const FERRAMENTAS = ['pen', 'eraser', 'highlight', 'caixa'];   // 'caixa' = nenhuma ferramenta, só a caixa aberta
(async () => {
  const rec = L.reconciliar(); const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const SLUG of SLUGS) for (const W of LARG) {
    const m = rec.ativas.find(x => x.slug === SLUG); const pil = SLUG === 'semiologia-ii';
    console.log(`\n▸ ${SLUG} · ${W}px`);
    const cena = { env: { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE, RM_PILOT_VISUAL_UIDS: S.U.JOSE }, acessos: {}, tabela: pil ? {} : { [SLUG]: { layout_stage: 'preview', pen_stage: 'preview', visual_stage: 'preview' } } };
    const ctx = await br.newContext({ viewport: { width: W, height: W < 500 ? 844 : 900 }, hasTouch: W < 900 }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', async r => { const sl = new URL(r.request().url()).searchParams.get('slug'); const o = await S.chamar(cena, 'JOSE', sl); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
    await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [SLUG]);
    await page.goto(`${base}/p.html?slug=${SLUG}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U.JOSE}`); await page.waitForFunction('window.__ready===true'); await page.waitForTimeout(500);
    await page.addScriptTag({ url: '/assets/rm-pilot.js?v=p' }); await page.waitForTimeout(6500);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const blocos = await page.evaluate(() => RMSistema.secciones().filter(s => s.c && s.c.tipo === 'bloque').map(s => s.id)); const [B1, B2] = blocos;
    const cdp = await ctx.newCDPSession(page);
    const estado = () => page.evaluate(() => { const e = RMNav.estado() || {}; const t = RMToolsV2.estado; return { view: e.view, block: e.block, mode: e.mode, tool: t.tool, open: t.open, tracos: document.querySelectorAll('#rm2-ink path[data-ink]').length, grifos: document.querySelectorAll('#materias-container .rm-hl').length, escritas: (window.__writes || []).filter(w => /^(insert|update|delete):user_(ink_strokes|highlights|notes)/.test(w)).length }; });
    const preparar = async (view, tool) => {
      await page.evaluate(() => { RMToolsV2.escolherFerramenta('none'); const t = RMToolsV2.estado; t.open = false; });
      await page.evaluate(sp => RMNav.go(sp), view); await page.waitForTimeout(900);
      if (tool === 'caixa') await page.evaluate(() => { RMToolsV2.estado.open = true; RMToolsV2.escolherFerramenta('none'); RMToolsV2.estado.open = true; document.querySelector('.rm2-box').classList.add('open'); });
      else await page.evaluate(t => RMToolsV2.escolherFerramenta(t), tool);
      await page.waitForTimeout(300); await page.evaluate(() => { window.__writes && (window.__writes.length = 0); });
    };
    const alvoPos = async (sel) => {   // rola até o controle e só devolve a posição quando ela ASSENTOU (duas leituras iguais): imagens preguiçosas mudam a altura da página
      const ler = () => page.evaluate((s) => { const els = [...document.querySelectorAll(s)].filter(e => e.checkVisibility && e.checkVisibility() && e.getBoundingClientRect().width > 4); const e = els[0]; if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'center' }); const b = e.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; }, sel);
      let a = await ler(); if (!a) return null;
      for (let i = 0; i < 20; i++) { await page.waitForTimeout(150); const b = await ler(); if (b && b.x === a.x && b.y === a.y) return b; a = b || a; }
      return a;
    };
    const tocar = async (entrada, p) => {
      if (entrada === 'mouse') { await page.mouse.click(p.x, p.y); return; }
      if (entrada === 'toque') { await page.touchscreen.tap(p.x, p.y); return; }
      const send = (type, extra) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x: p.x, y: p.y, pointerType: 'pen' }, extra));
      await send('mouseMoved', { buttons: 0 }); await send('mousePressed', { button: 'left', buttons: 1, clickCount: 1, force: .5 }); await new Promise(o => setTimeout(o, 60)); await send('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 });
    };
    /* controle → { seletor, view de partida, espera(estadoDepois, antes) } */
    const CONTROLES = {
      'próximo bloco': { sel: '.rm-nav-next', v: { view: 'block', block: B1 }, esp: e => e.view === 'block' && e.block === B2 },
      'bloco anterior': { sel: '.rm-nav-prev', v: { view: 'block', block: B2 }, esp: e => e.view === 'block' && e.block === B1 },
      'índice geral': { sel: '.rm-nav-idx', v: { view: 'block', block: B1 }, esp: e => e.view === 'index' },
      'cartão do índice': { sel: 'a.rm-sis-card[href], button.rm-ix-card', v: { view: 'index' }, esp: () => true },   // o cartão pode abrir o bloco OU expandir o índice: o que vale é o 1.º toque agir (sem tinta/grifo) e fechar/desarmar
      'modo (Preguntas)': { sel: '.rm-sis-pill[data-rm-k="quiz"], .rm-l2-rescard--quiz', v: { view: 'index' }, esp: e => /^mode/.test(e.view || '') },
    };
    const entradas = W < 900 ? ['toque', 'pen', 'mouse'] : ['mouse', 'pen'];
    let feitos = 0, ausentes = [];
    for (const [nome, c] of Object.entries(CONTROLES)) for (const tool of FERRAMENTAS) for (const ent of entradas) {
      await preparar(c.v, tool); const antes = await estado();
      const p = await alvoPos(c.sel); if (!p) { if (tool === FERRAMENTAS[0] && ent === entradas[0]) ausentes.push(nome); continue; }
      await tocar(ent, p); await page.waitForTimeout(900); const dep = await estado(); feitos++;
      const r = ok(c.esp(dep, antes) && dep.tool === 'none' && dep.open === false && dep.tracos === antes.tracos && dep.grifos === antes.grifos && dep.escritas === 0, `${nome} · ${ent} · ${tool}: 1 toque ⇒ navega, caixa fechada, ferramenta desarmada, 0 escrita`, { antes, dep });
    }
    /* o que não muda: caneta/goma armada, toque no CONTEÚDO ⇒ caixa e ferramenta continuam (comportamento aprovado) e nenhuma navegação acontece */
    for (const tool of ['pen', 'eraser']) {
      await preparar({ view: 'block', block: B1 }, tool); const antes = await estado();
      const p = await page.evaluate(() => { const e = [...document.querySelectorAll('#materias-container .tab-content.active p')].filter(x => !x.closest('[data-rm-ui],.quiz-item,.flashcard,table') && x.checkVisibility() && x.textContent.trim().length > 120)[0]; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left + 14, y: b.top + 8 }; });
      await tocar('mouse', p); await page.waitForTimeout(500); const dep = await estado();
      ok(dep.tool === tool && dep.open === true && dep.view === antes.view && dep.block === antes.block, `conteúdo · ${tool} armada: o toque no texto não fecha a caixa nem navega (comportamento aprovado)`, { antes, dep });
    }
    /* traço RECÉM-ESCRITO + navegação com o lápis ainda armado: o traço é gravado (1 insert), sobrevive à navegação e volta quando o bloco reabre */
    {
      await preparar({ view: 'block', block: B1 }, 'pen'); await page.evaluate(() => { window.__writes && (window.__writes.length = 0); });
      const alvo = async () => { let a = null; for (let i = 0; i < 20; i++) { const r = await page.evaluate(() => { const e = [...document.querySelectorAll('#materias-container .tab-content.active p')].filter(x => !x.closest('[data-rm-ui],.quiz-item,.flashcard,table') && x.checkVisibility() && x.textContent.trim().length > 160)[0]; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: Math.round(b.left + 12), y: Math.round(b.top + Math.min(b.height / 2, 30)), w: Math.round(b.width) }; }); if (a && a.x === r.x && a.y === r.y) return r; a = r; await page.waitForTimeout(150); } return a; };
      const a = await alvo(); const send = (type, x, y, extra) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, extra));
      await send('mouseMoved', a.x, a.y, { buttons: 0 }); await send('mousePressed', a.x, a.y, { button: 'left', buttons: 1, clickCount: 1, force: .5 });
      for (let i = 1; i <= 14; i++) await send('mouseMoved', a.x + i * Math.min(18, (a.w - 30) / 14), a.y + (i % 2 ? 5 : -5), { button: 'left', buttons: 1, force: .5 });
      await send('mouseReleased', a.x + 14 * Math.min(18, (a.w - 30) / 14), a.y, { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(1200);
      const e1 = await estado(); const ins = await page.evaluate(() => (window.__writes || []).filter(w => w === 'insert:user_ink_strokes').length);
      ok(e1.tracos === 1 && ins === 1 && e1.tool === 'pen', 'traço recém-escrito: desenhado (1) e gravado (1 insert) com o lápis armado', { e1, ins });
      const p = await alvoPos('.rm-nav-next'); await tocar('pen', p); await page.waitForTimeout(1000); const e2 = await estado();
      const guardado = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]').length);
      ok(e2.block === B2 && e2.tool === 'none' && e2.open === false && guardado === 1, 'um toque em «Próximo» com o traço recém-escrito: navega, fecha, desarma e o traço continua gravado', { e2, guardado });
      await page.evaluate(sp => RMNav.go(sp), { view: 'block', block: B1 }); await page.waitForTimeout(1200); const e3 = await estado();
      ok(e3.tracos === 1, 'ao voltar ao bloco, o traço reaparece', e3);
      await page.evaluate(() => { try { sessionStorage.setItem('ens.user_ink_strokes', '[]'); } catch (e) {} });
    }
    console.log(`  ${feitos} toques executados${ausentes.length ? ' · controles ausentes neste tamanho: ' + ausentes.join(', ') : ''}`);
    ok(errs.length === 0, '0 erro JS', errs);
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`\nnavegar-ferramentas: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
