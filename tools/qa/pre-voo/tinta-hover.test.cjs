/* C8 · A TINTA REALINHA DEPOIS DE UMA TRANSIÇÃO DE HOVER — rm-tools-v2.js REAL, CSS REAL do site (styles.css: `.pattern-card:hover { transform: translateY(-3px) }`), matéria real (Imagenología tem 8 desses cartões).
   Cenário do achado: o ponteiro pousa no cartão (ele sobe 3 px), o traço é medido/posicionado contra a caixa levantada; o ponteiro sai, o cartão desce e a tinta ficava ~3 px fora.
   Prova: (1) o cartão realmente sobe e desce no navegador; (2) depois do retorno a tinta volta a ≤ 0,5 px da posição de repouso (sem C8: ~3 px); (3) grifos/traços/notas
   gravados antes continuam IDÊNTICOS; (4) nenhum pedido ao banco; (5) com o ponteiro EM TRAÇO (caneta pressionada) a tinta não é reposicionada no meio do gesto.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/tinta-hover.test.cjs */
'use strict';
process.env.RM_ENSAIO_SEM = 'C8';   // a simulação em memória do ensaio sai de cena quando o código real tem a correção
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
const D = require('./lib-dados.cjs');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };

(async () => {
  const m = L.reconciliar().ativas.find(x => x.slug === 'imagenologia');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.addInitScript(([slug]) => { window.__RM_ENSAIO = { slug, modo: 'controle' }; }, [m.slug]);
  const abrir = async () => { await page.goto(`${base}/p.html?slug=${m.slug}&tab=${m.tab}&modo=controle&wait=1500&persist=1`, { timeout: 120000 }); await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(900); };
  await abrir();
  await page.evaluate(D.SEMEAR, { slug: m.slug, uid: D.UID, max: 5 });
  /* + 1 traço dentro de um cartão com hover */
  const alvo = await page.evaluate((uid) => {
    const c = [...document.querySelectorAll('.pattern-card, .recep-card')].find(x => [...x.querySelectorAll('p,li')].some(p => p.textContent.length > 40 && p.getBoundingClientRect().height >= 40) && !x.closest('[data-rm-ui]'));
    if (!c) return null;
    const p = [...c.querySelectorAll('p,li')].find(p => p.textContent.length > 40 && p.getBoundingClientRect().height >= 40);
    const an = window.RMToolsV2._test.anchorDe(p); if (!an || an.id.indexOf('>') < 0) return null;
    const tr = JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]');
    tr.push({ id: 'ens-ink-hover', user_id: uid, subject_slug: window.__ens.slug, anchor_id: an.id, color: 'black', width: 'medium', created_at: new Date(Date.now() - 86400000).toISOString(), points: [[0.1, 0.3], [0.9, 0.3]] });
    sessionStorage.setItem('ens.user_ink_strokes', JSON.stringify(tr));
    return an.id;
  }, D.UID);
  if (!ok(!!alvo, 'achou um cartão .pattern-card/.recep-card com parágrafo ancorável', alvo)) { process.exit(1); }
  await page.reload(); await page.waitForFunction('window.__ready===true'); await page.waitForTimeout(900);
  await page.evaluate(() => window.RMToolsV2.reposicionar()); await page.waitForTimeout(400);
  const ref = await page.evaluate(D.MEDIR);
  const medida = () => page.evaluate((a) => {
    const [sid, ix] = a.split('>'); const el = document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+ix];
    const p = document.querySelector('#rm2-ink path[data-ink="ens-ink-hover"]'); const card = el.closest('.pattern-card,.recep-card');
    const ra = el.getBoundingClientRect(), rb = p.getBoundingClientRect();
    return { desvioPx: +((rb.top - ra.top) - 0.3 * ra.height).toFixed(2), cartaoTop: Math.round(card.getBoundingClientRect().top * 10) / 10, y: Math.round(ra.top) };
  }, alvo);
  await page.evaluate(a => { const [sid, ix] = a.split('>'); document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+ix].scrollIntoView({ block: 'center' }); }, alvo);
  await page.waitForTimeout(500); await page.evaluate(() => window.RMToolsV2.reposicionar()); await page.waitForTimeout(300);
  const repouso = await medida();
  ok(Math.abs(repouso.desvioPx) <= 0.8, `em repouso a tinta está no lugar (desvio ${repouso.desvioPx} px)`, repouso);
  const pos = await page.evaluate(a => { const [sid, ix] = a.split('>'); const r = document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+ix].getBoundingClientRect(); return { x: r.left + 20, y: r.top + 10 }; }, alvo);
  await page.mouse.move(5, 5); await page.mouse.move(pos.x, pos.y); await page.waitForTimeout(450);   // hover: o cartão sobe (transição ~0,2 s)
  const alto = await medida();
  ok(alto.cartaoTop <= repouso.cartaoTop - 2, `o cartão realmente sobe com o hover (${repouso.cartaoTop} → ${alto.cartaoTop})`, { repouso, alto });
  await page.evaluate(() => window.RMToolsV2.reposicionar()); await page.waitForTimeout(200);   // qualquer reflow durante o hover (imagem que carrega, resize, ResizeObserver) mede contra a caixa LEVANTADA
  const medidoAlto = await medida();
  ok(Math.abs(medidoAlto.desvioPx) <= 0.8, `durante o hover a tinta acompanha o cartão levantado (desvio ${medidoAlto.desvioPx} px)`, medidoAlto);
  await page.mouse.move(5, 5); await page.waitForTimeout(900);                                    // sai: o cartão desce; a correção reposiciona ao fim da transição
  const depois = await medida();
  ok(Math.abs(depois.cartaoTop - repouso.cartaoTop) <= 0.5, `o cartão voltou ao lugar (${depois.cartaoTop})`, depois);
  ok(Math.abs(depois.desvioPx) <= 0.8, `depois do hover a tinta REALINHOU sozinha (desvio ${depois.desvioPx} px; sem C8 ficava ≈ 3 px)`, depois);
  const fim = await page.evaluate(D.MEDIR);
  const dif = D.comparar(ref, fim, 'hover');
  ok(dif.length === 0, `${fim.grifos.length} grifos, ${fim.tracos.length} traços e ${fim.notas.length} nota(s) idênticos, 0 escrita no banco`, dif.slice(0, 3));
  /* durante um traço a correção espera: pressiona a caneta, provoca o hover, confere que o gesto não perde pontos */
  const cdp = await ctx.newCDPSession(page); const send = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
  await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await page.waitForTimeout(300);
  const w0 = (await page.evaluate(() => window.__writes.slice())).length;
  await send('mouseMoved', pos.x, pos.y, { buttons: 0 }); await send('mousePressed', pos.x, pos.y, { button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 30; i++) { await send('mouseMoved', pos.x + i * 4, pos.y + Math.sin(i / 3) * 4, { button: 'left', buttons: 1 }); await page.waitForTimeout(15); }
  await send('mouseReleased', pos.x + 120, pos.y, { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(900);
  const w = await page.evaluate(() => window.__writes.slice());
  ok(w.length === w0 + 1 && w[w.length - 1] === 'insert:user_ink_strokes', 'traço feito DENTRO do cartão em hover: 1 gravação, gesto inteiro', w.slice(w0));
  await page.mouse.move(5, 5); await page.waitForTimeout(900);
  const fim2 = await page.evaluate(D.MEDIR);
  const novos = fim2.tracos.filter(t => !fim.tracos.some(r => r.id === t.id));
  ok(novos.length === 1 && Math.abs((await medida()).desvioPx) <= 0.8, 'o traço novo e o antigo ficam alinhados depois que o cartão volta', novos.map(t => t.a));
  ok(errs.length === 0, '0 erros JS', errs);
  await br.close(); srv.close();
  console.log(`\ntinta-hover: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
