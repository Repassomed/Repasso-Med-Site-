/* (helpers copiados de ipad.test.cjs) #456 · REPROVAÇÃO NO iPad (build 2026-10-09·456c, depois do merge da #470): sequências completas de convivência entre escrita, palma, goma, rolagem e zoom.
   Motor REAL (rm-tools-v2.js) + Layout V2/tema/navegação REAIS, Chromium; Supabase simulado (com persistência em sessionStorage para o teste de recarregar); 0 rede externa.
   Caneta = CDP Input.dispatchMouseEvent pointerType:'pen'; dedo/palma = CDP Input.dispatchTouchEvent (a palma com raio grande); zoom = Emulation.setPageScaleFactor.
   LIMITE declarado: NÃO é Safari/iPadOS nem Apple Pencil. Prova a máquina de estados e a geometria no Chromium; o critério de fechamento continua sendo o reteste físico do José.
   Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-ipad-456/ipad.test.cjs      (RM_ASSETS_REF=origin/main: roda contra a main — os achados do auditor REPROVAM) */
'use strict';
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
let n = 0, ko = 0; const FAIL = [];
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; FAIL.push(m); console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);
const BETA2 = '448e4d63-e410-48ed-8c71-8e99af317d3e';                    // 2.º UID beta LEGADO que já está no código da V2 (público por natureza)
const SLUG = 'semiologia-ii';

/* Supabase simulado COM persistência dos traços (sessionStorage: sobrevive ao reload da mesma aba) — só para user_ink_strokes; o resto segue o harness */
const PERSIST = () => {
  const K = 'qa.ink';
  const ler = () => { try { return JSON.parse(sessionStorage.getItem(K) || '[]'); } catch (e) { return []; } };
  const gravar = (v) => sessionStorage.setItem(K, JSON.stringify(v));
  function chain() {
    const o = { _op: null, _eq: {}, _from: 0, _single: false, _row: null };
    o.select = () => { if (!o._op) o._op = 'select'; return o; };
    o.insert = (row) => { o._op = 'insert'; o._row = row; return o; };
    o.delete = () => { o._op = 'delete'; return o; };
    o.update = () => { o._op = 'update'; return o; };
    o.upsert = (row) => { o._op = 'insert'; o._row = row; return o; };
    o.eq = (k, v) => { o._eq[k] = v; return o; };
    o.order = () => o; o.limit = () => o; o.in = () => o;
    o.range = (a) => { o._from = a; return o; };
    o.single = () => { o._single = true; return o; }; o.maybeSingle = o.single;
    o.then = (res, rej) => {
      let out;
      const rows = ler();
      if (o._op === 'insert') {
        const r = Object.assign({ created_at: new Date().toISOString() }, o._row);
        if (rows.some(x => x.id === r.id)) out = { data: null, error: { code: '23505', message: 'duplicate key' } };
        else { rows.push(r); gravar(rows); out = { data: { id: r.id }, error: null }; }
        (window.__writes = window.__writes || []).push('insert:user_ink_strokes');
      } else if (o._op === 'delete') {
        gravar(rows.filter(x => !(o._eq.id && x.id === o._eq.id))); out = { data: null, error: null };
        (window.__writes = window.__writes || []).push('delete:user_ink_strokes');
      } else {
        let f = rows.filter(x => (!o._eq.subject_slug || x.subject_slug === o._eq.subject_slug) && (!o._eq.id || x.id === o._eq.id));
        if (o._single) out = { data: f[0] || null, error: null };
        else out = { data: o._from > 0 ? [] : f.map(x => ({ id: x.id, anchor_id: x.anchor_id, color: x.color, width: x.width, points: x.points, created_at: x.created_at })), error: null };
      }
      return Promise.resolve(out).then(res, rej);
    };
    return o;
  }
  const d = Object.getOwnPropertyDescriptor(window, 'RM_SB');
  Object.defineProperty(window, 'RM_SB', { configurable: true, get: d && d.get, set(x) {
    if (x && x.from && !x.__qaInk) { const of = x.from; x.from = (t) => t === 'user_ink_strokes' ? chain() : of(t); x.__qaInk = true; }
    if (d && d.set) d.set(x);
  } });
};
/* registra as coordenadas que a PÁGINA recebe da caneta (clientX/Y + rolagem): é contra isso que se mede o alinhamento da tinta, sem depender da conversão do CDP */
const REGISTRO = () => {
  window.__penPts = [];
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'pen') window.__penPts = [[e.clientX + scrollX, e.clientY + scrollY]]; }, true);
  document.addEventListener('pointermove', e => { if (e.pointerType === 'pen' && e.buttons) window.__penPts.push([e.clientX + scrollX, e.clientY + scrollY]); }, true);
};
const SEM_LONGTASK = () => { try { Object.defineProperty(PerformanceObserver, 'supportedEntryTypes', { configurable: true, get: () => ['mark', 'measure', 'navigation', 'resource', 'paint'] }); } catch (e) {} };
const INIT = (o) => `(${PERSIST})();(${REGISTRO})();` + (o && o.semLongtask ? `(${SEM_LONGTASK})();` : '');

async function abrir(br, base, midia, o = {}) {
  const r = await L.abrir(br, base, midia, Object.assign({ w: 1024, h: 768, touch: true }, B.CFG[o.cfg || 'novo'], o, { initScript: INIT(o) }));
  await r.page.evaluate(B.INSTR);
  return r;
}
async function cdpDe(ctx, page) {
  const cdp = await ctx.newCDPSession(page);
  const pen = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  return { cdp, pen, touch };
}
const penDown = (c, p) => c.pen('mousePressed', p[0], p[1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
const penMove = (c, p) => c.pen('mouseMoved', p[0], p[1], { button: 'left', buttons: 1, force: .5 });
const penUp = (c, p) => c.pen('mouseReleased', p[0], p[1], { button: 'left', buttons: 0, clickCount: 1 });
const hover = (c, p) => c.pen('mouseMoved', p[0], p[1], { buttons: 0 });
async function traco(page, c, pts, meio) {
  await hover(c, pts[0]); await penDown(c, pts[0]);
  for (let k = 1; k < pts.length; k++) { if (meio && k === Math.floor(pts.length / 2)) await meio(); await penMove(c, pts[k]); await page.waitForTimeout(4); }
  await penUp(c, pts[pts.length - 1]); await page.waitForTimeout(450);
}
const dedoRola = async (page, c, x, y0, dist, id = 9) => {
  await c.touch('touchStart', [{ x, y: y0, id }]);
  for (let i = 1; i <= 12; i++) { await c.touch('touchMove', [{ x, y: y0 - (dist * i) / 12, id }]); await page.waitForTimeout(16); }
  await c.touch('touchEnd', []); await page.waitForTimeout(600);
};
const dedoToca = async (page, c, x, y, id = 11) => { await c.touch('touchStart', [{ x, y, id }]); await page.waitForTimeout(60); await c.touch('touchEnd', []); await page.waitForTimeout(350); };
const nTracos = (page) => page.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
const estado = (page) => page.evaluate(() => { const T = window.RMToolsV2, g = document.getElementById('rm2-penguard'); return { tool: T.estado.tool, traco: T._test.temTraco(), penContact: T._test.penState.active, guarda: g ? getComputedStyle(g).display : 'ausente', drawing: document.body.classList.contains('rm2-drawing'), strokes: (T.estado.strokes['semiologia-ii'] || []).length }; });
const taConteiner = (page) => page.evaluate(() => getComputedStyle(document.getElementById('materias-container')).touchAction);
/* bbox do último traço DESENHADO (o que o aluno vê) × bbox das coordenadas que a página recebeu da caneta — em px de página */
const alinhamento = (page) => page.evaluate(() => {
  const ps = [...document.querySelectorAll('#rm2-ink path[data-ink]')]; const p = ps[ps.length - 1]; if (!p) return null;
  const r = p.getBoundingClientRect(); const pts = window.__penPts || [];
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const pe = { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
  const tin = { l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY, b: r.bottom + scrollY };
  return { desvio: +Math.max(Math.abs(pe.l - tin.l), Math.abs(pe.r - tin.r), Math.abs(pe.t - tin.t), Math.abs(pe.b - tin.b)).toFixed(1), n: pts.length, escala: window.visualViewport ? +visualViewport.scale.toFixed(2) : null };
});
/* traço curto em zigue-zague, em coordenadas de VIEWPORT, num retângulo */
const zigue = (x, y, w = 160, h = 18, nPts = 40) => Array.from({ length: nPts }, (_, i) => [x + (w * i) / (nPts - 1), y + (i % 2 ? h : 0)]);
async function paragrafo(page, cfg = 'novo') { const r = await B.prepararAlvo(page, cfg, 'paragrafo', true); return r; }
/* alvo de novo sem passar pela toolbox (ela já está aberta): parágrafo longo visível do bloco s2-b04, lápis armado pela API */
const paragrafoDireto = (page) => page.evaluate
/* #456 · DESFAZER × PERSISTÊNCIA no piloto (verificação contra a main publicada). Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-ipad-456/desfazer.test.cjs */
const salvos = (page) => page.evaluate(() => { try { return JSON.parse(sessionStorage.getItem('qa.ink') || '[]').map(x => ({ id: x.id, a: x.anchor_id, p: JSON.stringify(x.points) })); } catch (e) { return []; } });
const naTela = (page) => page.evaluate(() => (window.RMToolsV2.estado.strokes['semiologia-ii'] || []).map(x => ({ id: x.id, a: x.anchor_id, p: JSON.stringify(x.points) })));
const assinatura = (l) => l.map(x => x.a + '|' + x.p).sort().join('\n');
const desfazerAgora = (page) => page.evaluate(async () => { await window.RMToolsV2.desfazer(); await new Promise(o => setTimeout(o, 600)); });
async function recarregar(page) {
  await page.reload(); await page.waitForFunction('window.__ready===true', null, { timeout: 120000 }); await page.waitForTimeout(3500);
  await page.evaluate(() => { if (window.RMNav && window.RMNav.ativo && window.RMNav.ativo()) window.RMNav.detach(); }); await page.waitForTimeout(800);
}
const semDuplicata = (l) => new Set(l.map(x => x.id)).size === l.length && new Set(l.map(x => x.a + '|' + x.p)).size === l.length;
const iniciarSemUp = (page, x, y, comp) => page.evaluate(([x, y, comp]) => {
  const el = document.elementFromPoint(x, y);
  const s = new Touch({ identifier: 88, target: el, clientX: x, clientY: y }); Object.defineProperty(s, 'touchType', { value: 'stylus' });
  el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [s], targetTouches: [s], changedTouches: [s] }));
  const ev = (t, dx) => new PointerEvent(t, { bubbles: true, cancelable: true, pointerType: 'pen', pointerId: 88, isPrimary: true, buttons: 1, clientX: x + dx, clientY: y + (dx % 2 ? 6 : 0), pressure: .5 });
  el.dispatchEvent(ev('pointerdown', 0)); for (let i = 1; i <= comp; i++) el.dispatchEvent(ev('pointermove', i * 6));
  window.__qaStylus = s; window.__qaStylusEl = el;
}, [x, y, comp]);

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  console.log('código sob teste:', process.env.RM_ASSETS_REF || 'árvore de trabalho');
  for (const diagAberto of [false, true]) {
    const rd = diagAberto ? 'diag aberto' : 'diag fechado';
    sec(`U1 · lápis: escrever 2 → Deshacer → recarregar (${rd})`);
    {
      const { ctx, page, errs } = await abrir(br, base, midia, {}); const r = await paragrafo(page); const c = await cdpDe(ctx, page);
      if (diagAberto) { await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(200); }
      await traco(page, c, zigue(r.x + 30, r.y + 18, 120)); await traco(page, c, zigue(r.x + 260, r.y + 18, 120)); await page.waitForTimeout(600);
      const a = await naTela(page);
      await desfazerAgora(page);
      const b = await naTela(page), bd = await salvos(page), n = await nTracos(page);
      ok(a.length === 2 && b.length === 1 && b[0].id === a[0].id && n === 1, `Deshacer remove só o último traço (${a.length} → ${b.length}; ${n} desenhado)`, { a, b });
      ok(bd.length === 1 && bd[0].id === a[0].id, `o banco (simulado) fica só com o 1.º traço (${bd.length})`, bd);
      await recarregar(page);
      const c2 = await naTela(page), n2 = await nTracos(page);
      ok(c2.length === 1 && c2[0].id === a[0].id && n2 === 1 && semDuplicata(c2), `recarregar: volta só o 1.º, 1 vez`, c2);
      ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
    }
    sec(`U2 · goma: apagar 1 → Deshacer → recarregar (${rd})`);
    {
      const { ctx, page, errs } = await abrir(br, base, midia, {}); const r = await paragrafo(page); const c = await cdpDe(ctx, page);
      if (diagAberto) { await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(200); }
      const z1 = zigue(r.x + 30, r.y + 18, 120); await traco(page, c, z1); await traco(page, c, zigue(r.x + 260, r.y + 18, 120)); await page.waitForTimeout(600);
      const a = await naTela(page);
      await page.evaluate(() => window.RMToolsV2.escolherFerramenta('eraser')); await page.waitForTimeout(250);
      await hover(c, z1[6]); await penDown(c, z1[6]); await penMove(c, z1[9]); await penUp(c, z1[9]); await page.waitForTimeout(600);
      const b = await naTela(page);
      await desfazerAgora(page);
      const d = await naTela(page), n = await nTracos(page);
      ok(b.length === 1 && d.length === 2 && assinatura(d) === assinatura(a) && n === 2, `apagou 1 e o Deshacer restaurou o mesmo desenho (âncora e pontos iguais; ${n} desenhados)`, { a, b, d });
      await recarregar(page);
      const e = await naTela(page), bd = await salvos(page);
      ok(e.length === 2 && assinatura(e) === assinatura(a) && semDuplicata(e) && bd.length === 2, `recarregar: os 2 voltam, sem duplicar (banco ${bd.length})`, { e, bd });
      ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
    }
    sec(`U3 · goma com a PALMA no meio do gesto: 2 apagados → 1 Deshacer restaura os 2 → recarregar (${rd})`);
    {
      const { ctx, page, errs } = await abrir(br, base, midia, {}); const r = await paragrafo(page); const c = await cdpDe(ctx, page);
      if (diagAberto) { await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(200); }
      const a1 = zigue(r.x + 30, r.y + 18, 120), b1 = zigue(r.x + 260, r.y + 18, 120);
      await traco(page, c, a1); await traco(page, c, b1); await page.waitForTimeout(600);
      const a = await naTela(page);
      await page.evaluate(() => window.RMToolsV2.escolherFerramenta('eraser')); await page.waitForTimeout(250);
      await hover(c, a1[5]); await penDown(c, a1[5]); await penMove(c, a1[8]);
      await c.touch('touchStart', [{ x: r.x + 200, y: r.y + 140, id: 41, radiusX: 30, radiusY: 30 }]); await page.waitForTimeout(80); await c.touch('touchEnd', []); await page.waitForTimeout(100);
      for (let k = 0; k <= 12; k++) { await penMove(c, [a1[8][0] + ((b1[6][0] - a1[8][0]) * k) / 12, a1[8][1] + ((b1[6][1] - a1[8][1]) * k) / 12]); await page.waitForTimeout(10); }
      await penUp(c, b1[6]); await page.waitForTimeout(600);
      const b = await naTela(page);
      await desfazerAgora(page);
      const d = await naTela(page);
      ok(b.length === 0 && d.length === 2 && assinatura(d) === assinatura(a), `palma não cortou o gesto (2 apagados) e 1 Deshacer restaurou os 2`, { b: b.length, d: d.length });
      await recarregar(page);
      const e = await naTela(page);
      ok(e.length === 2 && assinatura(e) === assinatura(a) && semDuplicata(e), `recarregar: os 2 voltam, sem duplicar`, e.length);
      ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
    }
    sec(`U4 · pointerup perdido → caneta levantada (touchend da stylus) → Deshacer → recarregar (${rd})`);
    {
      const { ctx, page, errs } = await abrir(br, base, midia, {}); const r = await paragrafo(page); const c = await cdpDe(ctx, page);
      if (diagAberto) { await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(200); }
      await traco(page, c, zigue(r.x + 30, r.y + 18, 120)); await page.waitForTimeout(400);
      await iniciarSemUp(page, r.x + 260, r.y + 30, 14);
      await page.evaluate(() => { const s = window.__qaStylus; window.__qaStylusEl.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [s] })); });
      await page.waitForTimeout(700);
      const a = await naTela(page), est = await estado(page);
      ok(a.length === 2 && !est.penContact && est.guarda === 'none', `o traço interrompido foi gravado e a guarda saiu (${a.length} traços)`, est);
      await desfazerAgora(page);
      const b = await naTela(page);
      ok(b.length === 1 && b[0].id === a[0].id, `Deshacer remove o traço recuperado (o último), não o anterior`, { a, b });
      await recarregar(page);
      const e = await naTela(page);
      ok(e.length === 1 && e[0].id === a[0].id && semDuplicata(e), `recarregar: fica só o 1.º`, e);
      ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
    }
  }
  await br.close(); srv.close();
  console.log(`\ncaneta-desfazer-456: ${n - ko}/${n} verificações OK` + (ko ? ` — ${ko} FALHAS` : ''));
  if (ko) console.log('falhas:\n - ' + FAIL.join('\n - '));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
