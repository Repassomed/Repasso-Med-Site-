/* CAPTURAS COMPARÁVEIS · matéria real no harness + rm-pilot.js REAL + função get-pilot-flags REAL (Supabase simulado), conta administradora, layout + tema + navegação + caneta.
   Mesmas cenas e larguras para qualquer matéria (padrão: medicina-familiar e semiologia-ii), para comparar o sistema visual lado a lado.
   Cenas: 01 abertura/capa · 02 índice da matéria · 03 título do bloco · 04 tabela · 05 pergunta · 06 cartões de recursos/flashcards · 07 caneta desenhando.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/capturas.cjs <saida-dir> [slug ...]   (larguras 1440 · 768 · 390) */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
const D = require('../pre-voo/lib-dados.cjs');
const S = require('./lib-servidor.cjs');
S.U.JOSE = D.UID;
const OUT = path.resolve(process.argv[2] || 'capturas'); const SLUGS = process.argv.slice(3).length ? process.argv.slice(3) : ['medicina-familiar', 'semiologia-ii'];
const LARG = [[1440, 900], [768, 1024], [390, 844]];
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const rec = L.reconciliar(); const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const resumo = [];
  for (const slug of SLUGS) {
    const m = rec.ativas.find(x => x.slug === slug);
    const pil = slug === 'semiologia-ii';
    const cena = { env: { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE, RM_PILOT_VISUAL_UIDS: S.U.JOSE }, acessos: {}, tabela: pil ? {} : { [slug]: { layout_stage: 'preview', pen_stage: 'preview', visual_stage: 'preview' } } };
    for (const [w, h] of LARG) {
      const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, deviceScaleFactor: 1 });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      await page.route('**/get-pilot-flags*', async r => { const sl = new URL(r.request().url()).searchParams.get('slug'); const o = await S.chamar(cena, 'JOSE', sl); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
      await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [slug]);
      await page.goto(`${base}/p.html?slug=${slug}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U.JOSE}`, { timeout: 120000 });
      await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(700);
      await page.addScriptTag({ url: '/assets/rm-pilot.js?v=cap' }); await page.waitForTimeout(6000);
      const est = await page.evaluate(() => ({ layout: !!document.querySelector('.rm-l2, #rm-l2-side, .rm-l2-band'), tema: document.documentElement.getAttribute('data-rm-tema'), sis: document.documentElement.classList.contains('rm-sis'), nav: document.documentElement.hasAttribute('data-rm-nav'), v2: !!window.RMToolsV2 }));
      const snap = async n => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, `${slug}-${w}-${n}.png`), fullPage: false }); };
      const ir = async f => { try { await page.evaluate(f); } catch (e) {} await page.waitForTimeout(900); };
      await page.evaluate(() => window.scrollTo(0, 0)); await snap('01-abertura');
      await ir(() => { if (window.RMNav && RMNav.go) RMNav.go({ view: 'index' }); }); await snap('02-indice');
      const blocoId = await page.evaluate(() => { const s = [...document.querySelectorAll('#materias-container > .tab-content > section[id]')].find(x => !/banco|flashcards|portada|cierre|guia|tablas/i.test(x.id) && x.querySelector('table')) || document.querySelector('#materias-container > .tab-content > section[id]'); return s && s.id; });
      await ir(() => { }); await page.evaluate(id => { if (window.RMNav && RMNav.go) RMNav.go({ view: 'block', block: id }); }, blocoId); await page.waitForTimeout(1500); await page.evaluate(() => window.scrollTo(0, 0)); await snap('03-bloque-titulo');
      const tb = await page.evaluate(() => { const t = [...document.querySelectorAll('#materias-container > .tab-content.active table')].find(x => x.checkVisibility && x.checkVisibility() && x.getBoundingClientRect().height > 80); if (!t) return false; t.scrollIntoView({ block: 'center' }); return true; }); await snap('04-tabla' + (tb ? '' : '-sem'));
      const qz = await page.evaluate(() => { const q = [...document.querySelectorAll('#materias-container > .tab-content.active .quiz-item')].find(x => x.checkVisibility && x.checkVisibility()); if (!q) return false; q.scrollIntoView({ block: 'center' }); return true; }); await snap('05-pregunta' + (qz ? '' : '-sem'));
      await ir(() => { if (window.RMNav && RMNav.go) RMNav.go({ view: 'index' }); }); await page.evaluate(() => { const c = document.querySelector('.rm-l2-rescards, .rm-l2-rescard'); if (c) c.scrollIntoView({ block: 'center' }); }); await snap('06-recursos');
      const go = async (spec, nome, rolar) => { await page.evaluate(sp => { if (window.RMNav && RMNav.go) RMNav.go(sp); }, spec); await page.waitForTimeout(1600); if (rolar) await page.evaluate(() => window.scrollTo(0, 0)); await snap(nome); };
      await go({ view: 'modeidx', mode: 'preguntas' }, '08-modo-preguntas-indice', true);
      await go({ view: 'modeblk', mode: 'preguntas', block: blocoId }, '09-modo-preguntas-bloque', true);
      await go({ view: 'modeblk', mode: 'flashcards', block: blocoId }, '10-modo-flashcards-bloque', true);
      const repasos = await page.evaluate(() => [...document.querySelectorAll('#materias-container > .tab-content > section[id][data-rm-tipo="repaso"]')].map(x => x.id));
      for (const [k, id] of repasos.slice(0, 2).entries()) await go({ view: 'block', block: id }, '1' + (1 + k) + '-repaso-' + id.replace(/[^a-z0-9]/gi, ''), true);
      await page.evaluate(id => { if (window.RMNav && RMNav.go) RMNav.go({ view: 'block', block: id }); }, blocoId); await page.waitForTimeout(1200);
      const dib = await page.evaluate(() => { if (!window.RMToolsV2) return false; window.RMToolsV2.escolherFerramenta('pen'); const p = [...document.querySelectorAll('#materias-container > .tab-content.active p')].find(x => x.textContent.trim().length > 120 && x.checkVisibility && x.checkVisibility() && !x.closest('table,[data-rm-ui]')); if (!p) return false; p.scrollIntoView({ block: 'center' }); return true; });
      if (dib) { const b = await page.evaluate(() => { const p = [...document.querySelectorAll('#materias-container > .tab-content.active p')].find(x => x.textContent.trim().length > 120 && x.checkVisibility && x.checkVisibility() && !x.closest('table,[data-rm-ui]')); const r = p.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
        await page.mouse.move(b.x + 10, b.y + Math.min(30, b.h / 2)); await page.mouse.down(); for (let i = 1; i <= 16; i++) await page.mouse.move(b.x + 10 + i * Math.min(20, (b.w - 30) / 16), b.y + Math.min(30, b.h / 2) + (i % 2 ? 7 : -7)); await page.mouse.up(); await page.waitForTimeout(700); }
      await snap('07-caneta' + (dib ? '' : '-sem'));
      resumo.push({ slug, w, ...est, errs: errs.length }); await ctx.close();
    }
  }
  console.table(resumo); await br.close(); srv.close();
})().catch(e => { console.error(e); process.exit(2); });
