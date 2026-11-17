/* #631 · MODO «INFOGRAFÍAS» NO NAVEGADOR (módulos REAIS: rm-modes, rm-layout, rm-materia-nav, rm-materia-sistema, rm-pilot). Conta administradora, Supabase simulado.
   Medicina Familiar (21 infografías .med-image.mf-info em 8 blocos), Semiología II (34 <figure> com legenda) e Farmacología II (64 <div class="material-slide"> em 14 blocos): o cartão da capa e o modo separado existem; a contagem do cartão = soma dos
   cartões por bloco = infografias realmente mostradas; cada bloco isola SÓ as suas infografias (sem duplicata, sem questão/tabela/texto de corpo); ida (Siguiente) e volta (Anterior), «Volver»
   e «Ver el bloque completo» funcionam; o texto e os ids da matéria são os mesmos antes e depois de navegar pelo modo.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/infografias-modo.test.cjs [slug…]   (RM_LARGURAS=390,768,1440) */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs'); const D = require('../pre-voo/lib-dados.cjs'); const S = require('./lib-servidor.cjs'); S.U.JOSE = D.UID;
const SLUGS = process.argv.slice(2).length ? process.argv.slice(2) : ['medicina-familiar', 'semiologia-ii', 'farmacologia-ii'];
const LARG = process.env.RM_LARGURAS ? process.env.RM_LARGURAS.split(',').map(Number) : [1440, 768, 390];
const ESPERADO = { 'medicina-familiar': { total: 21, por: { aps: 4, principios: 2, familiograma: 2, apgar: 3, crisis: 3, crecimiento: 3, desarrollo: 1, educacion: 3 } }, 'semiologia-ii': { total: 34 }, 'farmacologia-ii': { total: 64, por: { f2b01: 4, f2b02: 4, f2b03: 5, f2b04: 4, f2b05: 10, f2b07: 4, f2b06: 4, f2b08: 5, f2b09: 4, f2b10: 5, f2b11: 5, f2b12: 3, f2b13: 2, f2b14: 5 } } };
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (c) { if (process.env.VERBOSO) console.log('    ✓', m); } else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 400) : ''); } return !!c; };
const FOTO = () => {   // texto + ids da matéria fora da UI derivada
  const tab = document.querySelector('#materias-container > .tab-content.active'); const w = document.createTreeWalker(tab, NodeFilter.SHOW_TEXT, { acceptNode: t => t.parentElement && !t.parentElement.closest('[data-rm-ui],script,style') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }); const tx = []; let t; while ((t = w.nextNode())) tx.push(t.textContent);
  return { texto: tx.join('').replace(/\s+/g, ' ').trim(), ids: [...tab.querySelectorAll('[id]')].filter(e => !e.closest('[data-rm-ui]')).map(e => e.id).join('|'), q: tab.querySelectorAll('.quiz-item').length, fc: tab.querySelectorAll('.flashcard').length, img: tab.querySelectorAll('img').length };
};
(async () => {
  const rec = L.reconciliar(); const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const SLUG of SLUGS) for (const W of LARG) {
    const m = rec.ativas.find(x => x.slug === SLUG); console.log(`\n▸ ${SLUG} · ${W}px`);
    const cena = { env: { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE, RM_PILOT_VISUAL_UIDS: S.U.JOSE }, acessos: {}, tabela: SLUG === 'semiologia-ii' ? {} : { [SLUG]: { layout_stage: 'preview', pen_stage: 'preview', visual_stage: 'preview' } } };
    const ctx = await br.newContext({ viewport: { width: W, height: W < 500 ? 844 : 900 }, hasTouch: W < 900 }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', async r => { const sl = new URL(r.request().url()).searchParams.get('slug'); const o = await S.chamar(cena, 'JOSE', sl); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
    await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [SLUG]);
    await page.goto(`${base}/p.html?slug=${SLUG}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U.JOSE}`); await page.waitForFunction('window.__ready===true'); await page.waitForTimeout(500);
    await page.addScriptTag({ url: '/assets/rm-pilot.js?v=p' }); await page.waitForTimeout(6500);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const antes = await page.evaluate(FOTO);
    /* 1 · o modo e o cartão existem */
    const modos = await page.evaluate(() => RMModes.disponiveis().map(x => x.id)); ok(modos.includes('infografias'), 'o modo Infografías existe', modos);
    const capa = await page.evaluate(() => { const c = document.querySelector('.rm-l2-rescard--fig'); return c ? (c.getAttribute('data-rm-n') ? c.getAttribute('data-rm-n') + ' infografías' : c.textContent.replace(/\s+/g, ' ').trim()) : null; });
    const totalCapa = capa ? +(/(\d+)\s+infograf/i.exec(capa) || [])[1] : null; ok(totalCapa === ESPERADO[SLUG].total, `cartão da capa: «${capa}» (esperado ${ESPERADO[SLUG].total})`, capa);
    const itemLateral = await page.evaluate(() => [...document.querySelectorAll('.rm-l2-item.is-mode')].some(e => /infograf/i.test(e.textContent))); ok(itemLateral, 'a lateral lista o modo Infografías');
    /* 2 · índice do modo */
    await page.evaluate(() => RMNav.go({ view: 'modeidx', mode: 'infografias' })); await page.waitForTimeout(1000);
    const cards = await page.evaluate(() => [...document.querySelectorAll('a.rm-sis-card[data-go]')].filter(e => e.checkVisibility()).map(e => { const g = JSON.parse(e.getAttribute('data-go')); return { block: g.block, n: +(/(\d+)\s+infograf/i.exec(e.textContent) || [])[1] }; }));
    const soma = cards.reduce((a, c) => a + (c.n || 0), 0); ok(soma === totalCapa && cards.length > 0, `cartões por bloco somam ${soma} = cartão da capa (${totalCapa})`, cards);
    ok(new Set(cards.map(c => c.block)).size === cards.length, 'nenhum bloco duplicado no índice do modo');
    if (ESPERADO[SLUG].por) ok(JSON.stringify(Object.fromEntries(cards.map(c => [c.block, c.n]))) === JSON.stringify(ESPERADO[SLUG].por), 'contagem por bloco = a do conteúdo', cards);
    /* 3 · cada bloco isola só as suas infografias */
    for (const c of cards) {
      await page.evaluate(sp => RMNav.go(sp), { view: 'modeblk', mode: 'infografias', block: c.block }); await page.waitForTimeout(500);
      const v = await page.evaluate((b) => { const sec = document.getElementById(b); const vis = e => e.checkVisibility && e.checkVisibility({ checkVisibilityCSS: true }); const info = RMModes.infografias(sec); const visInfo = info.filter(vis).length;
        const outros = [...sec.querySelectorAll('.quiz-item, .flashcard, table, p, li')].filter(e => !e.closest('[data-rm-ui]') && !info.some(i => i.contains(e)) && vis(e)).length; const dup = new Set(info).size !== info.length; return { total: info.length, visInfo, outros, dup }; }, c.block);
      ok(v.total === c.n && v.visInfo === c.n && v.outros === 0 && !v.dup, `${c.block}: ${c.n} infografías visíveis, 0 elemento de corpo, 0 duplicata`, v);
    }
    const posicao = async (sel) => {   // rola até o controle e espera a posição ASSENTAR (imagens preguiçosas mudam a altura): só clica quando duas leituras seguidas coincidem
      const ler = () => page.evaluate((s) => { const a = [...document.querySelectorAll(s)].find(x => x.checkVisibility()); if (!a) return null; a.scrollIntoView({ block: 'center' }); const b = a.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; }, sel);
      let a = await ler(); if (!a) return null;
      for (let i = 0; i < 20; i++) { await page.waitForTimeout(150); const b = await ler(); if (b && b.x === a.x && b.y === a.y) return b; a = b || a; }
      return a;
    };
    const esperar = async (fn) => { for (let i = 0; i < 30; i++) { const e = await page.evaluate(() => RMNav.estado()); if (fn(e)) return e; await page.waitForTimeout(150); } return await page.evaluate(() => RMNav.estado()); };
    /* 4 · ida (Siguiente) e volta (Anterior) pelo modo */
    await page.evaluate(sp => RMNav.go(sp), { view: 'modeblk', mode: 'infografias', block: cards[0].block }); await page.waitForTimeout(500);
    const ida = [cards[0].block]; for (let i = 1; i < cards.length; i++) { const p = await posicao('.rm-nav-next'); if (!p) break; const ant = ida[ida.length - 1]; await page.mouse.click(p.x, p.y); ida.push((await esperar(e => e.block !== ant)).block); }
    ok(JSON.stringify(ida) === JSON.stringify(cards.map(c => c.block)), 'ida: «Siguiente» percorre os blocos com infografías, na ordem, sem pular nem repetir', ida);
    const volta = [ida[ida.length - 1]]; for (let i = 1; i < cards.length; i++) { const p = await posicao('.rm-nav-prev'); if (!p) break; const ant = volta[volta.length - 1]; await page.mouse.click(p.x, p.y); volta.push((await esperar(e => e.block !== ant)).block); }
    ok(JSON.stringify(volta) === JSON.stringify(cards.map(c => c.block).reverse()), 'volta: «Anterior» faz o caminho inverso', volta);
    const clicarClasse = async (sel) => { const p = await posicao(sel); if (!p) return false; await page.mouse.click(p.x, p.y); await page.waitForTimeout(900); return true; };
    ok(await clicarClasse('.rm-nav-idx') && (await page.evaluate(() => RMNav.estado())).view === 'modeidx', '«Volver a Infografías» leva ao índice do modo');
    await page.evaluate(sp => RMNav.go(sp), { view: 'modeblk', mode: 'infografias', block: cards[0].block }); await page.waitForTimeout(500);
    ok(await clicarClasse('.rm-nav-full') && (await page.evaluate(() => RMNav.estado())).view === 'block', '«Ver el bloque completo» abre o bloco inteiro');
    /* 5 · nada do conteúdo mudou */
    await page.evaluate(() => RMNav.go({ view: 'index' })); await page.waitForTimeout(700); const depois = await page.evaluate(FOTO);
    ok(JSON.stringify(antes) === JSON.stringify(depois), 'texto, ids, questões, cartões e imagens idênticos depois de navegar pelo modo', { antes: { ...antes, texto: antes.texto.length }, depois: { ...depois, texto: depois.texto.length } });
    ok(errs.length === 0, '0 erro JS', errs);
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`\ninfografias-modo: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
