/* #456 · REPROVAÇÃO NO iPad (build 2026-10-09·456c, depois do merge da #470): sequências completas de convivência entre escrita, palma, goma, rolagem e zoom.
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
const paragrafoDireto = (page) => page.evaluate(async () => {
  const el = [...document.getElementById('s2-b04').querySelectorAll('p')].filter(p => !p.closest('[data-rm-ui]') && p.textContent.length > 150 && p.getClientRects().length)[2];
  el.scrollIntoView({ block: 'center' }); await new Promise(o => setTimeout(o, 700));
  window.RMToolsV2.escolherFerramenta('pen'); await new Promise(o => setTimeout(o, 250)); window.__alvoEl = el;
  const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };
});

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  console.log('código sob teste:', process.env.RM_ASSETS_REF || 'árvore de trabalho');

  /* ===================== A · os achados do auditor ===================== */
  sec('A1 · goma em REPOUSO (piloto): o dedo rola e a pinça vale; a goma não trava a navegação');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    await paragrafo(page); const c = await cdpDe(ctx, page);
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('eraser')); await page.waitForTimeout(300);
    const ta = await taConteiner(page);
    ok(ta !== 'none', `goma armada: touch-action do conteúdo ≠ none (medido «${ta}»)`, ta);
    ok(ta === 'manipulation' || /pan-x/.test(ta) && /pan-y/.test(ta) && /pinch-zoom/.test(ta), `goma armada: pan nos 2 eixos e pinça permitidos ao dedo («${ta}»)`, ta);
    const y0 = await page.evaluate(() => scrollY); await dedoRola(page, c, 520, 600, 260); const y1 = await page.evaluate(() => scrollY);
    ok(y1 - y0 >= 80, `goma armada: o dedo rola a página (Δ=${Math.round(y1 - y0)} px)`, { y0, y1 });
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  sec('A2 · goma armada: o DEDO navega e NÃO apaga por acidente (só a ponta da caneta/rato apaga)');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    const r = await paragrafo(page); const c = await cdpDe(ctx, page);
    const pts = zigue(r.x + 40, r.y + 20); await traco(page, c, pts);
    const n0 = await nTracos(page);
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('eraser')); await page.waitForTimeout(300);
    await dedoToca(page, c, pts[10][0], pts[10][1]);
    const n1 = await nTracos(page);
    ok(n0 >= 1 && n1 === n0, `um toque de dedo em cima do traço com a goma armada não apaga (${n0} → ${n1})`, { n0, n1 });
    await hover(c, pts[10]); await penDown(c, pts[10]); await penMove(c, pts[12]); await penUp(c, pts[12]); await page.waitForTimeout(400);
    const n2 = await nTracos(page);
    ok(n2 === n1 - 1, `a ponta da caneta apaga o mesmo traço (${n1} → ${n2})`, { n1, n2 });
    /* marcação (grifo): com a ponta em contacto a guarda fica por cima do texto — a goma tem de achar a marcação por baixo dela */
    const hl = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y); const p = el && el.closest('p'); if (!p) return null;
      const sp = document.createElement('span'); sp.className = 'rm-hl c-yellow'; sp.setAttribute('data-hl', 'qa-hl-1'); sp.textContent = 'marcação de teste';
      p.insertBefore(sp, p.firstChild); window.__hlApagadas = []; const T = window.RMTools, orig = T.apagarHighlight; T.apagarHighlight = function (s) { window.__hlApagadas.push(s.getAttribute('data-hl')); return orig.apply(this, arguments); };
      const r = sp.getBoundingClientRect(); return { x: r.left + 6, y: r.top + r.height / 2, w: r.width };
    }, [pts[20][0], pts[20][1]]);
    if (hl) {
      await hover(c, [hl.x, hl.y]); await penDown(c, [hl.x, hl.y]); await penMove(c, [hl.x + hl.w / 2, hl.y]); await penMove(c, [hl.x + hl.w - 6, hl.y]); await penUp(c, [hl.x + hl.w - 6, hl.y]); await page.waitForTimeout(300);
      const apagadas = await page.evaluate(() => window.__hlApagadas);
      ok(apagadas.indexOf('qa-hl-1') !== -1, `a ponta da goma apaga uma marcação (grifo) — achada por baixo da guarda (${JSON.stringify(apagadas)})`, apagadas);
    } else ok(false, 'não achei parágrafo para a marcação de teste');
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  sec('A3 · 2.º contato (palma) DURANTE o gesto da goma com a caneta: o gesto continua (pointerId conferido) e vira 1 só desfazer');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    const r = await paragrafo(page); const c = await cdpDe(ctx, page);
    const a = zigue(r.x + 30, r.y + 18, 120), b = zigue(r.x + 260, r.y + 18, 120);
    await traco(page, c, a); await traco(page, c, b);
    const n0 = await nTracos(page);
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('eraser')); await page.waitForTimeout(300);
    const undo0 = await page.evaluate(() => window.RMToolsV2.estado.undo.length);
    await hover(c, a[5]); await penDown(c, a[5]); await penMove(c, a[8]); await page.waitForTimeout(60);
    const n1 = await nTracos(page);
    await c.touch('touchStart', [{ x: r.x + 200, y: r.y + 120, id: 21, radiusX: 30, radiusY: 30 }]); await page.waitForTimeout(80);
    await c.touch('touchEnd', []); await page.waitForTimeout(120);
    const meio = await page.evaluate(() => ({ apagando: !!window.RMToolsV2._test.apagandoInfo && !!window.RMToolsV2._test.apagandoInfo() }));
    for (let k = 0; k <= 12; k++) { await penMove(c, [a[8][0] + ((b[6][0] - a[8][0]) * k) / 12, a[8][1] + ((b[6][1] - a[8][1]) * k) / 12]); await page.waitForTimeout(10); }
    await penUp(c, b[6]); await page.waitForTimeout(400);
    const n2 = await nTracos(page);
    const undo = await page.evaluate(() => { const u = window.RMToolsV2.estado.undo; const x = u[u.length - 1]; return { len: u.length, tipo: x && x.tipo, inks: x && x.inks && x.inks.length }; });
    ok(n1 === n0 - 1, `a caneta-goma apagou o 1.º traço ao encostar (${n0} → ${n1})`, { n0, n1 });
    ok(n2 === n0 - 2, `depois da palma (touch de OUTRO pointerId soltando) o MESMO gesto seguiu e apagou o 2.º traço (${n0} → ${n2})`, { n0, n1, n2, meio });
    ok(undo.len === undo0 + 1 && undo.tipo === 'del' && undo.inks === 2, `um gesto = um desfazer com os 2 traços (${JSON.stringify(undo)})`, undo);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  sec('A4 · diagnóstico: pointercancel separado por caneta / toque (navegação · palma) / gesto ativo');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    const r = await paragrafo(page); const c = await cdpDe(ctx, page);
    await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(200);
    await dedoRola(page, c, 520, 600, 260);                                          // o navegador assume a rolagem ⇒ pointercancel do TOQUE (esperado)
    const pts = zigue(r.x + 40, r.y + 20);
    await traco(page, c, pts);
    const pc = await page.evaluate(() => { const p = window.RMToolsV2._test.perf(); return p && p.pc; });
    const linhas = await page.evaluate(() => window.RMToolsV2._test.perfLinhas().join(' | '));
    ok(pc && typeof pc === 'object' && pc.caneta === 0 && pc.toque >= 1 && pc.gesto === 0, `contagem separada: caneta=0, toque≥1, no meio do gesto=0 (${JSON.stringify(pc)})`, pc);
    ok(/pointercancel: caneta 0/.test(linhas) && /toque [1-9]/.test(linhas), 'o resumo mostra os cancelamentos separados por tipo', linhas.slice(0, 400));
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  sec('A5 · tarefas longas: «indisponível» onde o navegador não informa (Safari) — nunca um zero falso');
  for (const semLongtask of [true, false]) {
    const { ctx, page, errs } = await abrir(br, base, midia, { semLongtask });
    await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(200);
    const l = await page.evaluate(() => window.RMToolsV2._test.perfLinhas().find(x => /tarefas longas/.test(x)) || '');
    if (semLongtask) ok(/indispon/i.test(l) && !/: 0 ·/.test(l), `sem suporte a longtask: «${l}»`, l);
    else ok(/tarefas longas \(≥50 ms\): \d/.test(l), `com suporte (Chromium): número medido «${l}»`, l);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* ===================== B · palma × escrita ===================== */
  sec('B · palma ANTES, DURANTE e DEPOIS da escrita (diagnóstico fechado e aberto)');
  for (const diagAberto of [false, true]) {
    const rot = diagAberto ? 'diag aberto' : 'diag fechado';
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    const r = await paragrafo(page); const c = await cdpDe(ctx, page);
    if (diagAberto) { await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(200); }
    const palma = { x: r.x + 380, y: r.y + 140 };
    /* ANTES: a palma assenta parada, depois a caneta escreve, a palma sai */
    const y0 = await page.evaluate(() => scrollY), n0 = await nTracos(page);
    await c.touch('touchStart', [{ x: palma.x, y: palma.y, id: 31, radiusX: 32, radiusY: 32 }]); await page.waitForTimeout(220);
    const pts1 = zigue(r.x + 30, r.y + 18);
    await hover(c, pts1[0]); await penDown(c, pts1[0]);
    for (let k = 1; k < pts1.length; k++) { await penMove(c, pts1[k]); if (k % 6 === 0) await c.touch('touchMove', [{ x: palma.x + k / 4, y: palma.y - k / 3, id: 31, radiusX: 32, radiusY: 32 }]); await page.waitForTimeout(4); }
    await penUp(c, pts1[pts1.length - 1]); await page.waitForTimeout(150); await c.touch('touchEnd', []); await page.waitForTimeout(400);
    const n1 = await nTracos(page), y1 = await page.evaluate(() => scrollY), al1 = await alinhamento(page);
    ok(n1 === n0 + 1, `${rot} · palma ANTES: o traço nasceu e foi gravado (${n0} → ${n1})`);
    ok(Math.abs(y1 - y0) <= 3, `${rot} · palma ANTES: a página não rolou (Δ=${Math.round(y1 - y0)} px)`);
    ok(al1 && al1.desvio <= 6, `${rot} · palma ANTES: tinta alinhada à ponta (desvio ${al1 && al1.desvio} px)`, al1);
    /* DURANTE: a palma encosta e arrasta no meio do traço */
    const pts2 = zigue(r.x + 30, r.y + 60);
    await traco(page, c, pts2, async () => {
      await c.touch('touchStart', [{ x: palma.x, y: palma.y, id: 32, radiusX: 32, radiusY: 32 }]);
      for (let i = 1; i <= 6; i++) { await c.touch('touchMove', [{ x: palma.x, y: palma.y - 30 * i, id: 32, radiusX: 32, radiusY: 32 }]); await page.waitForTimeout(12); }
      await c.touch('touchEnd', []);
    });
    const n2 = await nTracos(page), y2 = await page.evaluate(() => scrollY), al2 = await alinhamento(page), st2 = await estado(page);
    ok(n2 === n1 + 1, `${rot} · palma DURANTE: 1 só traço, não interrompido (${n1} → ${n2})`);
    ok(Math.abs(y2 - y1) <= 3, `${rot} · palma DURANTE: a página não rolou (Δ=${Math.round(y2 - y1)} px)`);
    ok(al2 && al2.desvio <= 6 && al2.n >= pts2.length - 2, `${rot} · palma DURANTE: o traço tem a 2.ª metade e está alinhado (desvio ${al2 && al2.desvio} px, ${al2 && al2.n} pontos)`, al2);
    ok(!st2.traco && !st2.penContact && st2.guarda === 'none' && !st2.drawing, `${rot} · estado limpo depois (sem traço/contato/guarda/rm2-drawing)`, st2);
    /* DEPOIS: a mão sai e o dedo rola */
    await dedoRola(page, c, 520, 600, 260); const y3 = await page.evaluate(() => scrollY);
    ok(y3 - y2 >= 80, `${rot} · palma DEPOIS: o dedo volta a rolar (Δ=${Math.round(y3 - y2)} px)`);
    ok(errs.length === 0, `${rot} · 0 erros JS`, errs); await ctx.close();
  }

  /* ===================== C · escrever → rolar → zoom → escrever ===================== */
  sec('C · escrever → rolar → zoom (pinça, escala 1,6) → escrever: tinta alinhada à ponta, traço antigo preso ao texto');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    const r = await paragrafo(page); const c = await cdpDe(ctx, page);
    const pts1 = zigue(r.x + 30, r.y + 18); await traco(page, c, pts1);
    const al1 = await alinhamento(page);
    const ancora = () => page.evaluate(() => { const ps = [...document.querySelectorAll('#rm2-ink path[data-ink]')]; const p = ps[0], sv = p.closest('svg'); const a = sv.getAttribute('data-anchor').split('>'); const s = document.getElementById(a[0]); const el = a[1] !== undefined ? s.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+a[1]] : s; const ra = el.getBoundingClientRect(), rs = sv.getBoundingClientRect(); return { dx: +(rs.left - ra.left).toFixed(1), dy: +(rs.top - ra.top).toFixed(1), dw: +(rs.width - ra.width).toFixed(1) }; });
    const anc0 = await ancora();
    await dedoRola(page, c, 520, 600, 200);
    await c.cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.6 }); await page.waitForTimeout(500);
    const r2 = await page.evaluate(() => { const e = window.__alvoEl.getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width, h: e.height }; });
    await page.evaluate(() => window.__alvoEl.scrollIntoView({ block: 'center' })); await page.waitForTimeout(400);
    const r3 = await page.evaluate(() => { const e = window.__alvoEl.getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width, h: e.height, vx: visualViewport.offsetLeft, vy: visualViewport.offsetTop, s: visualViewport.scale }; });
    /* coordenadas do CDP com zoom: em px do viewport VISUAL ⇒ ponto da página = (cliente − offset do visual) × escala */
    const vis = (x, y) => [(x - r3.vx) * r3.s, (y - r3.vy) * r3.s];
    const pts2 = zigue(r3.x + 30, r3.y + 10, 90, 10).map(p => vis(p[0], p[1]));
    await traco(page, c, pts2);
    const al2 = await alinhamento(page), anc1 = await ancora();
    ok(al1 && al1.desvio <= 6, `sem zoom: desvio tinta × ponta ${al1 && al1.desvio} px`, al1);
    ok(al2 && al2.escala === 1.6 && al2.desvio <= 6, `com zoom ${al2 && al2.escala}: desvio tinta × ponta ${al2 && al2.desvio} px (${al2 && al2.n} pontos)`, { al2, r2, r3 });
    ok(Math.abs(anc1.dx - anc0.dx) <= 1 && Math.abs(anc1.dy - anc0.dy) <= 1, `o traço antigo segue preso ao seu parágrafo depois de rolar e dar zoom (Δx ${anc1.dx - anc0.dx}, Δy ${anc1.dy - anc0.dy})`, { anc0, anc1 });
    await c.cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }); await page.waitForTimeout(300);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* ===================== D · trocas ===================== */
  sec('D · troca de ferramenta, de bloco e de modo: nenhum estado sobra e a escrita volta');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, { nav: true });
    const r = await paragrafo(page); const c = await cdpDe(ctx, page);
    await traco(page, c, zigue(r.x + 30, r.y + 18));
    const n0 = await nTracos(page);
    for (const t of ['eraser', 'highlight', 'none', 'pen']) { await page.evaluate(x => window.RMToolsV2.escolherFerramenta(x), t); await page.waitForTimeout(200); }
    const sTool = await estado(page);
    ok(sTool.tool === 'pen' && !sTool.traco && !sTool.penContact && sTool.guarda === 'none', 'goma → marcador → nenhuma → lápis: estado limpo', sTool);
    const temNav = await page.evaluate(() => !!(window.RMNav && window.RMNav.ativo && window.RMNav.ativo()));
    if (temNav) {
      await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b05' })); await page.waitForTimeout(1500);
      await page.evaluate(() => window.RMModes && window.RMModes.set && window.RMModes.set('preguntas')); await page.waitForTimeout(800);
      await page.evaluate(() => window.RMModes && window.RMModes.set && window.RMModes.set('full')); await page.waitForTimeout(800);
      await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b04' })); await page.waitForTimeout(1500);
    }
    const r2 = await paragrafoDireto(page);
    const sNav = await estado(page);
    ok(!sNav.traco && !sNav.penContact && sNav.guarda === 'none' && !sNav.drawing, `${temNav ? 'troca de bloco e de modo' : 'navegação'}: estado limpo`, sNav);
    await traco(page, c, zigue(r2.x + 30, r2.y + 40));
    const n1 = await nTracos(page);
    ok(n1 >= n0 + 1, `depois das trocas a caneta volta a escrever (${n0} → ${n1})`, { n0, n1 });
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* ===================== E · interrupção e retorno ===================== */
  sec('E · interrupção no meio do traço (perda de foco / app em segundo plano) e retorno');
  for (const tipo of ['blur', 'visibilitychange']) {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    const r = await paragrafo(page); const c = await cdpDe(ctx, page);
    const pts = zigue(r.x + 30, r.y + 18);
    await hover(c, pts[0]); await penDown(c, pts[0]); for (let k = 1; k < 12; k++) { await penMove(c, pts[k]); await page.waitForTimeout(4); }
    const a = await estado(page);
    await page.evaluate(t => { if (t === 'blur') window.dispatchEvent(new Event('blur')); else { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; } }, tipo);
    await page.waitForTimeout(200);
    const b = await estado(page);
    await penUp(c, pts[11]); await page.waitForTimeout(300);
    ok(a.traco && a.penContact && a.guarda === 'block', `${tipo}: antes, traço em curso e guarda ativa`, a);
    ok(!b.traco && !b.penContact && b.guarda === 'none', `${tipo}: a interrupção fecha o gesto e solta a guarda (sem página presa)`, b);
    const y0 = await page.evaluate(() => scrollY); await dedoRola(page, c, 520, 600, 220); const y1 = await page.evaluate(() => scrollY);
    ok(y1 - y0 >= 80, `${tipo}: ao voltar, o dedo rola (Δ=${Math.round(y1 - y0)} px)`);
    const n0 = await nTracos(page); const r2 = await paragrafoDireto(page); await traco(page, c, zigue(r2.x + 30, r2.y + 40)); const n1 = await nTracos(page);
    ok(n1 === n0 + 1, `${tipo}: ao voltar, a caneta escreve (${n0} → ${n1})`);
    ok(errs.length === 0, `${tipo}: 0 erros JS`, errs); await ctx.close();
  }

  /* ===================== F · recarregar e recuperar ===================== */
  sec('F · escrever 2, apagar 1, recarregar: volta exatamente o que ficou (mesma âncora, mesmos pontos)');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    const r = await paragrafo(page); const c = await cdpDe(ctx, page);
    const a = zigue(r.x + 30, r.y + 18, 120), b = zigue(r.x + 260, r.y + 18, 120);
    await traco(page, c, a); await traco(page, c, b); await page.waitForTimeout(600);
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('eraser')); await page.waitForTimeout(200);
    await hover(c, a[6]); await penDown(c, a[6]); await penMove(c, a[8]); await penUp(c, a[8]); await page.waitForTimeout(800);
    const antes = await page.evaluate(() => (window.RMToolsV2.estado.strokes['semiologia-ii'] || []).map(x => ({ id: x.id, a: x.anchor_id, p: JSON.stringify(x.points) })));
    await page.reload(); await page.waitForFunction('window.__ready===true', null, { timeout: 120000 }); await page.waitForTimeout(3500);
    await page.evaluate(() => { if (window.RMNav && window.RMNav.ativo && window.RMNav.ativo()) window.RMNav.detach(); });
    await page.waitForTimeout(800);
    const depois = await page.evaluate(() => (window.RMToolsV2.estado.strokes['semiologia-ii'] || []).map(x => ({ id: x.id, a: x.anchor_id, p: JSON.stringify(x.points) })));
    const desenhados = await nTracos(page);
    ok(antes.length === 1 && depois.length === 1 && antes[0].id === depois[0].id && antes[0].a === depois[0].a && antes[0].p === depois[0].p, `1 traço salvo volta igual (id, âncora e pontos) — antes ${antes.length}, depois ${depois.length}`, { antes, depois });
    ok(desenhados === 1, `e é desenhado 1 vez (sem duplicar): ${desenhados}`);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* ===================== G · fora do piloto: nada muda ===================== */
  sec('G · fora do piloto físico (beta legado sem pen do servidor): goma e lápis como antes');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, { uid: BETA2 });
    await paragrafo(page);
    const piloto = await page.evaluate(() => window.RMToolsV2._test.pilotoPermitido());
    const taPen = await taConteiner(page);
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('eraser')); await page.waitForTimeout(250);
    const taGoma = await taConteiner(page);
    ok(piloto === false, 'pilotoPermitido=false para o beta legado sem pen', piloto);
    ok(taPen === 'manipulation' || (/pan-x/.test(taPen) && /pinch-zoom/.test(taPen)), `lápis fora do piloto: regra de sempre «pan-x pan-y pinch-zoom» (o Chromium a serializa como «${taPen}»)`, taPen);
    ok(taGoma === 'none', `goma fora do piloto: regra de sempre («${taGoma}»)`, taGoma);
    const adapt = await page.evaluate(() => window.RMToolsV2._test.adaptadorLigado());
    ok(adapt === false, 'fora do piloto o adaptador de toque não é registrado', adapt);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* ===================== H · ouvintes de toque não-passivos só com a ferramenta armada ===================== */
  sec('H · ouvintes de toque NÃO passivos no documento: só enquanto lápis/goma estão armados (sem ferramenta, a rolagem não espera o JS)');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    await paragrafo(page); const c = await cdpDe(ctx, page);
    const naoPassivos = async () => {
      const { result } = await c.cdp.send('Runtime.evaluate', { expression: 'document' });
      const { listeners } = await c.cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
      return listeners.filter(l => /^touch(start|move)$/.test(l.type) && !l.passive).length;
    };
    const comLapis = await naoPassivos();
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await page.waitForTimeout(200);
    const semFerr = await naoPassivos();
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('eraser')); await page.waitForTimeout(200);
    const comGoma = await naoPassivos();
    ok(comLapis === 2, `lápis armado (piloto): 2 ouvintes não-passivos (touchstart/touchmove) — medido ${comLapis}`);
    ok(semFerr === 0, `sem ferramenta: 0 ouvintes não-passivos de toque no documento — medido ${semFerr}`);
    ok(comGoma === 2, `goma armada (piloto): 2 ouvintes não-passivos — medido ${comGoma}`);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* ===================== I · contato órfão: o pointerup de um traço anterior se perdeu ===================== */
  sec('I · traço/contato ÓRFÃO (o navegador perdeu o pointerup de um contato anterior da caneta): a escrita nova não é recusada e o que já foi escrito é gravado');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    const r = await paragrafo(page); const c = await cdpDe(ctx, page);
    const n0 = await nTracos(page);
    /* contato anterior SEM pointerup (pointerId 77): pointerdown + alguns pointermove sintéticos sobre o parágrafo */
    await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y); const ev = (t, dx) => new PointerEvent(t, { bubbles: true, cancelable: true, pointerType: 'pen', pointerId: 77, isPrimary: true, buttons: 1, clientX: x + dx, clientY: y + (dx % 2 ? 8 : 0), pressure: .5 });
      el.dispatchEvent(ev('pointerdown', 0)); for (let i = 1; i <= 12; i++) el.dispatchEvent(ev('pointermove', i * 6));
    }, [r.x + 40, r.y + 60]);
    const a = await estado(page);
    await traco(page, c, zigue(r.x + 30, r.y + 18));
    const b = await estado(page), n1 = await nTracos(page);
    ok(a.traco && a.penContact, 'antes: há um traço/contato órfão em aberto (pointerId 77)', a);
    ok(n1 === n0 + 2, `a caneta nova escreve (não é recusada) e o traço órfão é gravado, não perdido (${n0} → ${n1})`, { n0, n1 });
    ok(!b.traco && !b.penContact && b.guarda === 'none', 'depois: nenhum contato/traço pendurado, guarda inerte', b);
    const y0 = await page.evaluate(() => scrollY); await dedoRola(page, c, 520, 600, 220); const y1 = await page.evaluate(() => scrollY);
    ok(y1 - y0 >= 80, `e o dedo rola (Δ=${Math.round(y1 - y0)} px)`);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  /* ===================== J · caminho do WebKit (Touch.touchType='stylus'): só testável com TouchEvent sintético no Chromium ===================== */
  sec('J · adaptador de Touch Events (iPad): stylus suprime o próprio pan; com ela em contato a palma também; stylus sem touchend é podada');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, {});
    await paragrafo(page);
    const res = await page.evaluate(async () => {
      const T = window.RMToolsV2._test, out = {};
      const alvo = [...document.getElementById('s2-b04').querySelectorAll('p')].filter(p => p.textContent.length > 150 && p.getClientRects().length)[1];
      const toque = (id, tipo) => { const t = new Touch({ identifier: id, target: alvo, clientX: 300, clientY: 300 }); if (tipo) Object.defineProperty(t, 'touchType', { value: tipo }); return t; };
      const disp = (tipo, changed, todos) => { const ev = new TouchEvent(tipo, { bubbles: true, cancelable: true, touches: todos, targetTouches: todos, changedTouches: changed }); alvo.dispatchEvent(ev); return ev.defaultPrevented; };
      for (const ferr of ['pen', 'eraser']) {
        window.RMToolsV2.escolherFerramenta(ferr); await new Promise(o => setTimeout(o, 80));
        const s = toque(501, 'stylus'), d = toque(502, 'direct');
        const r = { ligado: T.adaptadorLigado() };
        r.stylusStart = disp('touchstart', [s], [s]);
        r.stylusMove = disp('touchmove', [s], [s]);
        r.palmaStart = disp('touchstart', [d], [s, d]);
        r.palmaMove = disp('touchmove', [d], [s, d]);
        disp('touchend', [s], [d]);
        r.dedoDepois = disp('touchmove', [d], [d]);              // stylus saiu: o dedo volta a poder rolar
        disp('touchend', [d], []);
        /* stylus que perdeu o touchend: o próximo toque do dedo (sem ela em e.touches) a poda e rola */
        const s2 = toque(503, 'stylus'), d2 = toque(504, 'direct');
        disp('touchstart', [s2], [s2]);
        r.podada = !disp('touchmove', [d2], [d2]) && T.stylusTouchesN() === 0;
        disp('touchend', [d2], []);
        out[ferr] = r;
      }
      window.RMToolsV2.escolherFerramenta('none'); await new Promise(o => setTimeout(o, 80));
      const s3 = toque(505, 'stylus');
      out.semFerramenta = { ligado: T.adaptadorLigado(), stylusStart: disp('touchstart', [s3], [s3]) };
      disp('touchend', [s3], []);
      return out;
    });
    for (const f of ['pen', 'eraser']) {
      const r = res[f];
      ok(r.ligado && r.stylusStart && r.stylusMove, `${f}: a stylus suprime o próprio pan (touchstart/touchmove com preventDefault)`, r);
      ok(r.palmaStart && r.palmaMove, `${f}: com a stylus em contato, o toque da palma também não faz pan`, r);
      ok(!r.dedoDepois, `${f}: a stylus levantou ⇒ o dedo volta a rolar (sem preventDefault)`, r);
      ok(r.podada, `${f}: stylus sem touchend é podada pela lista do navegador (e.touches) e não segura a rolagem`, r);
    }
    ok(!res.semFerramenta.ligado && !res.semFerramenta.stylusStart, 'sem ferramenta: nenhum ouvinte, nada suprimido', res.semFerramenta);
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }

  await br.close(); srv.close();
  console.log(`\ncaneta-ipad-456: ${n - ko}/${n} verificações OK` + (ko ? ` — ${ko} FALHAS` : ''));
  if (ko) console.log('falhas:\n - ' + FAIL.join('\n - '));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
