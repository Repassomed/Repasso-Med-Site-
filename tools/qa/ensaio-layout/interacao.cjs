/* ENSAIO DE INTERAÇÃO nas 27 matérias (#457/#459, 2.ª rodada, main com a caneta aprovada no piloto — #479).
   O que esta bateria acrescenta ao `ensaio.cjs` (que mede layout/índice/modos): o USO — caneta, palma, goma, rolagem, pinça, grifo, troca de bloco/modo,
   recuperação dos traços depois de recarregar, questões, flashcards e presença/ausência de audiobook — em 390 · 768 · 1024 · 1440.
   Estado ensaiado = o da INTEGRAÇÃO PROPOSTA: A1/A2/A7 + correções C1–C8 em memória (`?corr=1`), como em resultados-corr. O disco nunca é alterado.
   Entrada: caneta = CDP Input.dispatchMouseEvent pointerType 'pen' (eventos confiáveis, a mesma via do hardware no Chromium); dedo/palma = CDP
   Input.dispatchTouchEvent (palma = raio grande); pinça = dois toques CDP; zoom de escrita = Emulation.setPageScaleFactor; grifo = mouse real.
   Supabase simulado com persistência em sessionStorage (`?persist=1`); audiobook = rm-audio-boot.js REAL + manifesto SIMULADO só da Semiología II.
   LIMITE: isto é Chromium/Linux. Não é Safari/iPadOS nem Apple Pencil — ver docs/layout-ensaio/INTERACAO.md («o que só o aparelho prova»).
   Saída: docs/layout-ensaio/interacao/<slug>.json
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/interacao.cjs [slug ...] [--rapido] [--so-tabela]   (--rapido: só 1024 e 390; --so-tabela: só a tabela larga, mesclada no resultado já gravado)
   Ambiente: RM_LARGURAS=768,1440 · RM_ENSAIO_SEM=C8 (desliga adaptações) · RM_ENSAIO_REF=<commit> (assets de outro commit: controle negativo) */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const args = process.argv.slice(2), RAPIDO = args.includes('--rapido'), SO_TABELA = args.includes('--so-tabela'), filtro = args.filter(a => !a.startsWith('--'));
const LARGURAS = process.env.RM_LARGURAS ? process.env.RM_LARGURAS.split(',').map(Number) : (RAPIDO ? [1024, 390] : [390, 768, 1024, 1440]);
const ALT = { 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const OUT = process.env.RM_ENSAIO_OUT ? path.resolve(process.env.RM_ENSAIO_OUT) : path.join(L.REPO, 'docs/layout-ensaio/interacao');   // RM_ENSAIO_OUT: validação de PR sem sobrescrever o resultado
const inv = JSON.parse(fs.readFileSync(path.join(L.REPO, 'docs/layout-ensaio/inventario.json'), 'utf8'));
const INV = Object.fromEntries(inv.materias.map(m => [m.slug, m]));
const REUNE = /banco|flashcards/i;
const TABELAS_OK = /^(insert|delete|update):(user_ink_strokes|user_highlights|user_notes)$/;

/* registra as coordenadas que a PÁGINA recebe da caneta (px de página): é contra isso que se mede o alinhamento da tinta */
const REGISTRO = `(() => { window.__penPts = [];
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'pen') window.__penPts = [[e.clientX + scrollX, e.clientY + scrollY]]; }, true);
  document.addEventListener('pointermove', e => { if (e.pointerType === 'pen' && e.buttons) window.__penPts.push([e.clientX + scrollX, e.clientY + scrollY]); }, true);
  window.__alvoP = null; })();`;

async function cdpDe(ctx, page) {
  const cdp = await ctx.newCDPSession(page);
  return { cdp, pen: (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e)), touch: (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts }) };
}
const penDown = (c, p) => c.pen('mousePressed', p[0], p[1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
const penMove = (c, p) => c.pen('mouseMoved', p[0], p[1], { button: 'left', buttons: 1, force: .5 });
const penUp = (c, p) => c.pen('mouseReleased', p[0], p[1], { button: 'left', buttons: 0, clickCount: 1 });
const hover = (c, p) => c.pen('mouseMoved', p[0], p[1], { buttons: 0 });
async function traco(page, c, pts, meio) {
  await hover(c, pts[0]); await penDown(c, pts[0]);
  for (let k = 1; k < pts.length; k++) { if (meio && k === Math.floor(pts.length / 2)) await meio(); await penMove(c, pts[k]); await page.waitForTimeout(4); }
  await penUp(c, pts[pts.length - 1]); await page.waitForTimeout(500);
}
/* calibra CDP → clientX/Y com dois hovers de caneta (o mapeamento do CDP sob zoom muda com a largura no Chromium): devolve f(clientX, clientY) → [x, y] do CDP */
async function calibrar(page, c) {
  await page.evaluate(() => { window.__cal = []; window.__calF = e => { if (e.pointerType === 'pen') window.__cal.push([e.clientX, e.clientY]); }; document.addEventListener('pointermove', window.__calF, true); });
  await hover(c, [100, 100]); await page.waitForTimeout(60); await hover(c, [300, 260]); await page.waitForTimeout(60);
  const cal = await page.evaluate(() => { document.removeEventListener('pointermove', window.__calF, true); return window.__cal.slice(-2); });
  if (cal.length < 2) return null;
  const ax = (cal[1][0] - cal[0][0]) / 200, bx = cal[0][0] - ax * 100, ay = (cal[1][1] - cal[0][1]) / 160, by = cal[0][1] - ay * 100;
  return { f: (x, y) => [(x - bx) / ax, (y - by) / ay], ax: +ax.toFixed(3), ay: +ay.toFixed(3), bx: +bx.toFixed(1), by: +by.toFixed(1) };
}
const zigue = (x, y, w = 140, h = 14, n = 30) => Array.from({ length: n }, (_, i) => [x + (w * i) / (n - 1), y + (i % 2 ? h : 0)]);
const dedoRola = async (page, c, x, y0, dist, id = 9, raio) => {
  const pt = y => Object.assign({ x, y, id }, raio ? { radiusX: raio, radiusY: raio, force: 1 } : {});
  await c.touch('touchStart', [pt(y0)]);
  for (let i = 1; i <= 12; i++) { await c.touch('touchMove', [pt(y0 - (dist * i) / 12)]); await page.waitForTimeout(16); }
  await c.touch('touchEnd', []); await page.waitForTimeout(650);
};
const dedoToca = async (page, c, x, y, id = 11) => { await c.touch('touchStart', [{ x, y, id }]); await page.waitForTimeout(60); await c.touch('touchEnd', []); await page.waitForTimeout(400); };
async function pinca(page, c, cx, cy) {
  const s0 = await page.evaluate(() => visualViewport.scale);
  await c.touch('touchStart', [{ x: cx - 45, y: cy, id: 61 }, { x: cx + 45, y: cy, id: 62 }]);
  for (let i = 1; i <= 8; i++) { await c.touch('touchMove', [{ x: cx - 45 - 10 * i, y: cy, id: 61 }, { x: cx + 45 + 10 * i, y: cy, id: 62 }]); await page.waitForTimeout(16); }
  await c.touch('touchEnd', []); await page.waitForTimeout(500);
  const s1 = await page.evaluate(() => visualViewport.scale);
  await c.cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }); await page.waitForTimeout(300);
  return { s0: +s0.toFixed(2), s1: +s1.toFixed(2) };
}
const paths = page => page.evaluate(() => [...document.querySelectorAll('#rm2-ink path[data-ink]')].map(p => ({ id: p.getAttribute('data-ink'), a: p.closest('svg').getAttribute('data-anchor'), d: p.getAttribute('d'), vis: getComputedStyle(p.closest('svg')).display !== 'none' && p.closest('svg').getBoundingClientRect().width > 0 })));
/* o traço NOVO é o id que não existia antes (a ordem do DOM segue a âncora, não a criação) */
const novoId = (antes, depois) => { const a = new Set(antes.map(x => x.id)); const n = depois.filter(x => !a.has(x.id)); return n.length === 1 ? n[0] : null; };
const alinhamento = (page, id) => page.evaluate(id2 => {
  const p = document.querySelector(`#rm2-ink path[data-ink="${id2}"]`); if (!p) return null;
  const r = p.getBoundingClientRect(), pts = window.__penPts || []; if (!pts.length) return null;
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const pe = { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) }, tin = { l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY, b: r.bottom + scrollY };
  return { desvio: +Math.max(Math.abs(pe.l - tin.l), Math.abs(pe.r - tin.r), Math.abs(pe.t - tin.t), Math.abs(pe.b - tin.b)).toFixed(1), n: pts.length, escala: +visualViewport.scale.toFixed(2) };
}, id);
/* desvio do SVG do traço em relação ao nó âncora (o traço «preso» ao parágrafo) */
const ancoraDe = (page, a) => page.evaluate(a2 => {
  const sv = document.querySelector(`#rm2-ink svg[data-anchor="${a2}"]`); if (!sv) return null;
  const [sid, ix] = a2.split('>'); const s = document.getElementById(sid); if (!s) return null;
  const el = ix !== undefined ? [...s.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(n => !n.closest('[data-rm-ui]'))[+ix] : s; if (!el) return null;
  const ra = el.getBoundingClientRect(), rs = sv.getBoundingClientRect();
  return { dx: +(rs.left - ra.left).toFixed(1), dy: +(rs.top - ra.top).toFixed(1), dw: +(rs.width - ra.width).toFixed(1), disp: getComputedStyle(sv).display };
}, a);
const ferramenta = (page, t) => page.evaluate(x => window.RMToolsV2.escolherFerramenta(x), t).then(() => page.waitForTimeout(250));
const sy = page => page.evaluate(() => Math.round(scrollY));
const escritas = page => page.evaluate(() => (window.__writes || []).slice());
/* como o aluno: se o alvo está dentro de <details> fechado, toca o <summary> (de fora para dentro). Devolve false se algum summary não está alcançável. */
async function abrirDetalhes(page, sel) {
  for (let k = 0; k < 4; k++) {
    const s = await page.evaluate(sel2 => { const x = document.querySelector(sel2); const d = x && x.parentElement && x.parentElement.closest('details:not([open])'); if (!d) return 'ok'; let top = d; for (let p = d.parentElement && d.parentElement.closest('details:not([open])'); p; p = p.parentElement && p.parentElement.closest('details:not([open])')) top = p; const sm = top.querySelector(':scope > summary'); if (!sm || sm.closest('[data-rm-off]') || !(sm.checkVisibility ? sm.checkVisibility({ checkVisibilityCSS: true }) : sm.offsetParent)) return 'summary-oculto'; document.querySelectorAll('[data-ens-sm]').forEach(e => e.removeAttribute('data-ens-sm')); sm.setAttribute('data-ens-sm', ''); sm.scrollIntoView({ block: 'center' }); return 'abrir'; }, sel);
    if (s === 'ok') return true; if (s !== 'abrir') return false;
    await page.click('[data-ens-sm]', { timeout: 5000 }); await page.waitForTimeout(350);
  }
  return false;
}

/* parágrafo-alvo: o 1.º <p> longo do bloco (fora de questão/flashcard/tabela/UI), centrado na tela */
const PREP = (bid, ord) => {
  const ps = [...document.getElementById(bid).querySelectorAll('p')].filter(x => !x.closest('[data-rm-ui],.quiz-item,.flashcard,table,.rmfc-launch,details:not([open])') && x.textContent.trim().length > 140 && x.getBoundingClientRect().width > 200 && x.getBoundingClientRect().height >= 40);   // ≥ 36 px (SUB_MIN_H do motor): abaixo disso o traço ancora na seção, por desenho
  const p = ps[ord || 0]; if (!p) return null; window.__alvoP = p;
  p.scrollIntoView({ block: 'center' });
  const r = p.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, n: ps.length };
};

/* TABELA COM ROLAGEM PRÓPRIA (risco real em 390 px): com a caneta armada o DEDO ainda rola a tabela na horizontal. Percorre os blocos até achar uma
   tabela mais larga que o seu contêiner rolável (na largura medida); se a matéria não tem nenhuma, não há verificação (n/a). */
async function checarTabela(p, c, W, chk, go, secs) {
  let tb = null;
  for (const s of secs.filter(x => !REUNE.test(x.id) && x.tb > 0)) {
    await go({ view: 'block', block: s.id }, 380);
    tb = await p.evaluate(id => {
      const sec = document.getElementById(id); document.querySelectorAll('[data-ens-tb]').forEach(e => e.removeAttribute('data-ens-tb'));
      const cx = [...sec.querySelectorAll('*')].find(e => { if (e.closest('[data-rm-ui],.quiz-item,.flashcard,.rmfc-launch,details:not([open])')) return false; const o = getComputedStyle(e).overflowX; return (o === 'auto' || o === 'scroll') && e.scrollWidth > e.clientWidth + 30 && e.querySelector('table') && e.getBoundingClientRect().height > 0; });
      if (!cx) return null; cx.setAttribute('data-ens-tb', ''); return { sec: id };
    }, s.id);
    if (tb) break;
  }
  if (!tb) return;
  await ferramenta(p, 'pen');
  const g = await p.evaluate(() => { const e = document.querySelector('[data-ens-tb]'); e.scrollIntoView({ block: 'center' }); e.scrollLeft = 0; const r = e.getBoundingClientRect(); const y = Math.min(Math.max(r.top + 40, 140), Math.min(r.bottom - 20, innerHeight - 40)); return { x: r.left + Math.min(r.width, innerWidth) / 2, y, vis: r.height > 0 && y > r.top && y < r.bottom }; });
  await p.waitForTimeout(350);
  if (g.vis) {
    const n0 = (await paths(p)).length;
    await c.touch('touchStart', [{ x: g.x + 60, y: g.y, id: 21 }]);
    for (let i = 1; i <= 12; i++) { await c.touch('touchMove', [{ x: g.x + 60 - i * 14, y: g.y, id: 21 }]); await p.waitForTimeout(16); }
    await c.touch('touchEnd', []); await p.waitForTimeout(500);
    const rt = await p.evaluate(() => ({ sl: document.querySelector('[data-ens-tb]').scrollLeft, px: Math.round(scrollX) }));
    const n1 = (await paths(p)).length;
    chk('rolagem', W, 'tabela-rola-com-lapis', rt.sl > 20 && rt.px === 0 && n1 === n0, `lápis armado: o dedo rola a tabela larga na horizontal (scrollLeft ${rt.sl}), a página não desliza e nada é desenhado (bloco ${tb.sec})`, 'cdp', { rt, n0, n1, sec: tb.sec });
  }
  await ferramenta(p, 'none');
}

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const rec = L.reconciliar();
  const lista = rec.ativas.filter(m => !filtro.length || filtro.includes(m.slug));
  const usadas = new Set(), pedidos = [], srv = await L.servir({ usadas, pedidos }); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  for (const m of lista) {
    const t0 = Date.now(), I = INV[m.slug];
    const R = { variante: 'interacao-com-correcao', ref: process.env.RM_ENSAIO_REF || null, slug: m.slug, title: m.title, larguras: LARGURAS, checks: [], gerado_em: new Date().toISOString() };
    /* prova: 'cdp' = evento de entrada confiável do Chromium · 'dom' = estado/DOM · 'simulado' = depende de serviço simulado (Supabase/manifesto) */
    const chk = (area, w, id, cond, msg, prova, dados) => { const e = { area, w, id, estado: cond ? 'PASSA' : 'FALHA', prova, msg }; if (!cond && dados !== undefined) e.dados = dados; R.checks.push(e); return !!cond; };
    const bloq = (area, w, id, msg) => R.checks.push({ area, w, id, estado: 'BLOQUEADO', msg });
    process.stdout.write(`interação ${m.slug} `);
    const secs = I.secoes.filter(s => !(s.ancoras === 0 && !s.quiz && !s.fc && !s.fig && !s.tb && !s.img && !s.aud && !s.vid)), ids = secs.map(s => s.id);   // C9: placeholder de âncora não é bloco
    const cand = secs.filter(s => !REUNE.test(s.id) && s.ancoras > 12 && s.quiz < s.ancoras);
    const alvo = (cand[0] || secs[1] || secs[0]).id, outro = ids.find(x => x !== alvo && !REUNE.test(x)) || ids[0];
    const blocoQuiz = secs.find(s => s.quiz > 0 && !REUNE.test(s.id)), blocoFc = secs.find(s => s.fc > 0 && !REUNE.test(s.id));
    for (const W of LARGURAS) {
      let r = null;
      try {
        r = await L.abrir(br, base, m, { w: W, h: ALT[W], modo: 'nav', corr: true, touch: true, extra: '&persist=1&audio=1', initScript: REGISTRO });   // contexto novo = sessionStorage vazio
        const { page: p, ctx } = r; const c = await cdpDe(ctx, p);
        const go = async (spec, ms = 700) => { await p.evaluate(s => window.RMNav.go(s), spec); await p.waitForTimeout(ms); };
        if (SO_TABELA) { await checarTabela(p, c, W, chk, go, secs); await r.ctx.close(); process.stdout.write(W + ' '); continue; }   // só a tabela (mescla no JSON existente)
        const E = await p.evaluate(() => window.__ens);
        chk('boot', W, 'etapas', E.etapas.attach_layout && E.etapas.attach_tema && E.etapas.attach_nav && !E.erros.length, 'Layout V2 + tema + navegação (+ boot do áudio) ativaram sem erro', 'dom', E);

        /* ---------- AUDIOBOOK: presença só onde o manifesto (simulado) tem item; ausência em todo o resto ---------- */
        const au = await p.evaluate(() => ({ cards: [...document.querySelectorAll('.rm-audio-card')].map(c => (c.closest('section[id]') || {}).id || '?'), capa: document.querySelectorAll('.rm-l2-rescard--ab').length, lat: /audiolibro/i.test((document.getElementById('rm-l2-side') || {}).textContent || ''), req: performance.getEntriesByType('resource').filter(e => /get-audio-manifest/.test(e.name)).length, start: window.__ens.etapas.audio_start }));
        if (m.slug === 'semiologia-ii') {
          const esp = L.MANIFESTO_SIMULADO.map(x => x.block_id).sort().join();
          chk('audio', W, 'presenca-no-piloto', au.start === true && au.cards.slice().sort().join() === esp && au.capa === 1 && au.req >= 1, `piloto: 1 card de audiolibro em cada bloco do manifesto (${esp}) e em nenhum outro; capa e lateral mostram «Audiolibros» (manifesto SIMULADO)`, 'simulado', au);
        } else {
          chk('audio', W, 'ausencia-fora-do-piloto', au.start === false && au.cards.length === 0 && au.capa === 0 && !au.lat && au.req === 0, 'fora do piloto o rm-audio-boot.js REAL fecha no portão da aba: nenhum card, capa, lateral nem pedido de manifesto', 'dom', au);
        }

        /* ---------- CANETA (pilot físico ligado pelo A7) ---------- */
        await go({ view: 'block', block: alvo }, 1300);
        let A = await p.evaluate(PREP, alvo); await p.waitForTimeout(500);
        if (!A) { bloq('caneta', W, 'sem-alvo', `nenhum parágrafo longo em ${alvo} para ancorar o traço`); }
        else {
          A = await p.evaluate(PREP, alvo); await p.waitForTimeout(300);
          await ferramenta(p, 'pen');
          const pil = await p.evaluate(() => ({ pilot: document.body.classList.contains('rm2-pilot-guard'), guard: !!document.getElementById('rm2-penguard'), adapt: window.RMToolsV2._test.adaptadorLigado && window.RMToolsV2._test.adaptadorLigado() }));
          chk('caneta', W, 'piloto-fisico-ligado', pil.pilot && pil.guard, 'o comportamento aprovado no piloto (guarda de palma, adaptador de toque) liga nesta matéria', 'dom', pil);
          const P0 = await paths(p), n0 = P0.length;
          const w0 = (await escritas(p)).length;
          const pts1 = zigue(A.x + 20, A.y + Math.min(14, A.h / 3), Math.min(160, A.w - 40));
          await traco(p, c, pts1);
          const P1 = await paths(p), novo = novoId(P0, P1), al1 = novo && await alinhamento(p, novo.id);
          chk('caneta', W, 'escreve', P1.length === n0 + 1 && novo && novo.a.startsWith(alvo + '>') && al1 && al1.desvio <= 6, `caneta (CDP «pen»): 1 traço novo, ancorado em ${alvo}, tinta sob a ponta (desvio ${al1 && al1.desvio} px)`, 'cdp', { n0, n: P1.length, novo: novo && novo.a, al1 });
          const w1 = await escritas(p);
          chk('caneta', W, 'grava', w1.slice(w0).filter(x => x === 'insert:user_ink_strokes').length === 1, 'o traço é gravado uma vez (Supabase simulado)', 'simulado', w1.slice(w0));

          /* palma apoiada DURANTE o traço: não corta, não rola */
          const y0 = await sy(p); const P1b = await paths(p), n1 = P1b.length;
          const pts2 = zigue(A.x + 20, A.y + Math.min(14, A.h / 3) + 4, Math.min(160, A.w - 40));
          await traco(p, c, pts2, async () => { await c.touch('touchStart', [{ x: Math.min(W - 30, A.x + A.w * 0.7), y: Math.min(ALT[W] - 30, A.y + 160), radiusX: 38, radiusY: 38, force: 1, id: 31 }]); for (let i = 1; i <= 4; i++) { await c.touch('touchMove', [{ x: Math.min(W - 30, A.x + A.w * 0.7), y: Math.min(ALT[W] - 30, A.y + 160) - i * 12, radiusX: 38, radiusY: 38, force: 1, id: 31 }]); await p.waitForTimeout(10); } });
          await c.touch('touchEnd', []); await p.waitForTimeout(300);
          const P2 = await paths(p), nv2 = novoId(P1b, P2), al2 = nv2 && await alinhamento(p, nv2.id), y1 = await sy(p);
          chk('palma', W, 'palma-durante-traco', P2.length === n1 + 1 && Math.abs(y1 - y0) <= 2 && al2 && al2.desvio <= 6 && al2.n >= pts2.length - 1, `palma apoiada e arrastada no meio do traço: 1 traço inteiro (${al2 && al2.n} pontos), página parada (Δy ${y1 - y0}), tinta sob a ponta`, 'cdp', { n1, n: P2.length, y0, y1, al2 });

          /* dedo com o lápis armado e a caneta fora da tela: rola, não desenha */
          const y2 = await sy(p); const n2 = (await paths(p)).length;
          await dedoToca(p, c, A.x + A.w / 2, A.y + A.h / 2);
          await dedoRola(p, c, Math.round(W / 2), Math.round(ALT[W] * 0.7), Math.round(ALT[W] * 0.35));
          const y3 = await sy(p), n3 = (await paths(p)).length;
          chk('rolagem', W, 'dedo-rola-com-lapis', y3 - y2 > 40 && n3 === n2, `lápis armado em repouso: o dedo rola (Δy ${y3 - y2}) e não desenha`, 'cdp', { y2, y3, n2, n3 });

          /* pinça com o lápis armado */
          const pz = await pinca(p, c, Math.round(W / 2), Math.round(ALT[W] / 2));
          if (pz.s0 === pz.s1 && pz.s0 === 1) bloq('pinca', W, 'pinca-com-lapis', `o Chromium deste ensaio não aplicou zoom à pinça CDP (escala ${pz.s0}→${pz.s1}); só o aparelho prova`);
          else chk('pinca', W, 'pinca-com-lapis', pz.s1 > pz.s0 + 0.05, `lápis armado: pinça de dois dedos dá zoom (escala ${pz.s0} → ${pz.s1})`, 'cdp', pz);

          /* escrever com zoom: a tinta sai sob a ponta e o traço antigo continua preso ao parágrafo */
          await p.waitForTimeout(450); const anc0 = await ancoraDe(p, novo.a);   // assenta: transição de hover (0,2 s) + reflow debounced
          await c.cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.6 }); await p.waitForTimeout(450);
          await p.evaluate(() => window.__alvoP.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
          const rz = await p.evaluate(() => { const e = window.__alvoP.getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width, h: e.height, vx: visualViewport.offsetLeft, vy: visualViewport.offsetTop, s: visualViewport.scale, vw: visualViewport.width, vh: visualViewport.height }; });
          const cal = await calibrar(p, c); const vis = cal ? cal.f : (x, y) => [(x - rz.vx) * rz.s, (y - rz.vy) * rz.s];
          const x0z = Math.max(rz.x + 10, rz.vx + 10), y0z = Math.min(Math.max(rz.y + 6, rz.vy + 10), rz.vy + rz.vh - 30);
          const Pz0 = await paths(p);
          await traco(p, c, zigue(x0z, y0z, Math.min(80, rz.vw - 30), 8, 20).map(q => vis(q[0], q[1])));
          const Pz1 = await paths(p), nvz = novoId(Pz0, Pz1), alz = nvz && await alinhamento(p, nvz.id);
          const dgz = alz ? null : await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return { alvo: e && (e.tagName + '.' + String(e.className).slice(0, 40) + '#' + e.id), pen: (window.__penPts || []).length, pt0: (window.__penPts || [])[0], fim: (window.__penPts || []).slice(-1)[0] }; }, [x0z, y0z]);
          const novosZ = Pz1.filter(x => !Pz0.some(y => y.id === x.id)).map(x => x.a);
          let anc1 = await ancoraDe(p, novo.a); const precisa = a => !(anc0 && a && Math.abs(a.dx - anc0.dx) <= 1 && Math.abs(a.dy - anc0.dy) <= 1);
          let reconv = null; if (precisa(anc1)) { await p.waitForTimeout(1200); const a2 = await ancoraDe(p, novo.a); reconv = { antes: anc1, depois1200ms: a2 }; anc1 = a2;
            if (precisa(a2)) { await p.evaluate(() => window.RMToolsV2.reposicionar && window.RMToolsV2.reposicionar()); await p.waitForTimeout(400); reconv.depoisReposicionar = await ancoraDe(p, novo.a); reconv.escala = await p.evaluate(() => visualViewport.scale); } }   // reflow (imagem carregando): a V2 reposiciona por observador; registra se só convergiu depois
          chk('pinca', W, 'escreve-com-zoom', alz && alz.escala === 1.6 && alz.desvio <= 6, `com zoom ${alz && alz.escala}: tinta sob a ponta (desvio ${alz && alz.desvio} px)`, 'cdp', { alz, rz, cal: cal && { ax: cal.ax, ay: cal.ay, bx: cal.bx, by: cal.by }, novosZ, dgz });
          chk('pinca', W, 'traco-antigo-preso', !precisa(anc1), 'depois de rolar e dar zoom o traço anterior continua preso ao parágrafo (Δ ≤ 1 px' + (reconv ? '; só depois do reposicionamento por reflow, ver dados' : '') + ')', 'cdp', { anc0, anc1, reconv });
          if (reconv && !precisa(anc1)) R.notas = (R.notas || []).concat([{ w: W, nota: 'traço antigo deslocado ' + JSON.stringify(reconv.antes) + ' logo após o zoom; reposicionado em ≤ 1,2 s (reflow do conteúdo)' }]);
          await c.cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }); await p.waitForTimeout(350);

          /* GOMA: dedo não apaga, dedo rola, ponta apaga; Deshacer devolve */
          await p.evaluate(() => window.__alvoP.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
          await ferramenta(p, 'eraser');
          const alvoG = await p.evaluate(id => { const ps = [...document.querySelectorAll('#rm2-ink path[data-ink]')].filter(x => x.closest('svg').getAttribute('data-anchor').startsWith(id + '>')); const q = ps[0]; if (!q) return null; const b = q.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, id: q.getAttribute('data-ink') }; }, alvo);
          const nG0 = (await paths(p)).length;
          await dedoToca(p, c, alvoG.x + alvoG.w / 2, alvoG.y + alvoG.h / 2);
          const nG1 = (await paths(p)).length;
          chk('borracha', W, 'dedo-nao-apaga', nG1 === nG0, 'goma armada: tocar o traço com o DEDO não apaga', 'cdp', { nG0, nG1 });
          const y4 = await sy(p);
          await dedoRola(p, c, Math.round(W / 2), Math.round(ALT[W] * 0.7), Math.round(ALT[W] * 0.3));
          const y5 = await sy(p);
          chk('rolagem', W, 'dedo-rola-com-goma', y5 - y4 > 40, `goma armada em repouso: o dedo rola (Δy ${y5 - y4})`, 'cdp', { y4, y5 });
          await p.evaluate(() => window.__alvoP.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
          const g2 = await p.evaluate(id => { const q = document.querySelector(`#rm2-ink path[data-ink="${id}"]`); if (!q) return null; const b = q.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, alvoG.id);
          const wG = (await escritas(p)).length;
          if (!g2) { chk('borracha', W, 'ponta-apaga', false, 'goma: o traço-alvo já não existia antes da ponta (apagado pelo dedo?)', 'cdp', { alvoG }); throw new Error('sequência da goma interrompida: o dedo apagou o traço'); }
          await traco(p, c, Array.from({ length: 16 }, (_, i) => [g2.x - 10 + (g2.w + 20) * i / 15, g2.y + g2.h / 2]));
          const nG2 = (await paths(p)).length, wG2 = (await escritas(p)).slice(wG);
          chk('borracha', W, 'ponta-apaga', nG2 < nG0 && wG2.includes('delete:user_ink_strokes'), `goma: a ponta da caneta apaga o traço (${nG0} → ${nG2}) e o apagamento é gravado`, 'cdp', { nG0, nG2, wG2 });
          await p.evaluate(() => window.RMToolsV2.desfazer()); await p.waitForTimeout(700);
          const nG3 = (await paths(p)).length;
          chk('borracha', W, 'desfazer-devolve', nG3 === nG0, `Deshacer devolve o que a goma apagou (${nG2} → ${nG3})`, 'dom', { nG0, nG2, nG3 });

          /* GRIFO (marcador) com mouse real num 2.º parágrafo */
          await ferramenta(p, 'highlight');
          const B2 = await p.evaluate(PREP, alvo); await p.waitForTimeout(350);
          const hl0 = await p.evaluate(id => document.querySelectorAll(`#${id} .rm-hl`).length, alvo), wH = (await escritas(p)).length;
          const B3 = await p.evaluate(() => { const e = window.__alvoP.getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width }; });
          const yl = B3.y + 10 + 28;  // 2.ª linha do parágrafo (o 1.º traço fica na 1.ª)
          await p.mouse.move(B3.x + 8, yl); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(B3.x + 8 + (Math.min(220, B3.w - 20)) * i / 10, yl); await p.waitForTimeout(12); } await p.mouse.up(); await p.waitForTimeout(900);
          const hl1 = await p.evaluate(id => document.querySelectorAll(`#${id} .rm-hl`).length, alvo), wH2 = (await escritas(p)).slice(wH);
          chk('grifo', W, 'marca-texto', hl1 > hl0 && wH2.includes('insert:user_highlights'), `marcador: arrastar sobre o texto grifa (${hl0} → ${hl1} trechos) e grava`, 'cdp', { hl0, hl1, wH2 });
          await ferramenta(p, 'none');

          /* troca de bloco e de modo: o traço some fora do bloco e volta no lugar, sem duplicar */
          const antes = (await paths(p)).filter(x => x.a.startsWith(alvo + '>'));
          const vaz = [];
          const specs = [{ view: 'block', block: outro }, { view: 'index' }];
          if (blocoQuiz) specs.push({ view: 'modeblk', mode: 'preguntas', block: blocoQuiz.id });
          for (const s of specs) { await go(s, 800); const v = (await paths(p)).filter(x => x.a.startsWith(alvo + '>') && x.vis); if (v.length) vaz.push({ s: s.view, n: v.length }); }
          await go({ view: 'block', block: alvo }, 1300);
          const depois = (await paths(p)).filter(x => x.a.startsWith(alvo + '>'));
          const ancV = await ancoraDe(p, antes[0].a);
          chk('troca', W, 'troca-bloco-modo', vaz.length === 0 && depois.length === antes.length && depois.every(x => x.vis) && new Set(depois.map(x => x.id)).size === depois.length && ancV && Math.abs(ancV.dx) <= 4 && ancV.disp !== 'none', `bloco → outro bloco → índice → Preguntas → bloco: o traço some fora do bloco e volta no lugar (${depois.length}/${antes.length}, sem duplicar)`, 'dom', { vaz, antes: antes.length, depois: depois.length, ancV });

          /* recarregar: os traços e os grifos voltam (persistência simulada), uma vez cada */
          const dAntes = antes.map(x => x.d).sort(), hlAntes = await p.evaluate(id => [...document.querySelectorAll(`#${id} .rm-hl`)].map(x => x.getAttribute('data-hl')).filter((v, i, a) => a.indexOf(v) === i).length, alvo);
          await p.reload(); await p.waitForFunction('window.__ready===true', { timeout: 120000 }); await p.waitForTimeout(800);
          await go({ view: 'block', block: alvo }, 2200);
          const pr = (await paths(p)).filter(x => x.a.startsWith(alvo + '>'));
          const hlDepois = await p.evaluate(id => [...document.querySelectorAll(`#${id} .rm-hl`)].map(x => x.getAttribute('data-hl')).filter((v, i, a) => a.indexOf(v) === i).length, alvo);
          const ancR = pr[0] ? await ancoraDe(p, pr[0].a) : null;
          chk('persistencia', W, 'recarregar-tracos', pr.length === antes.length && JSON.stringify(pr.map(x => x.d).sort()) === JSON.stringify(dAntes) && pr.every(x => x.vis) && ancR && Math.abs(ancR.dx) <= 4, `recarregar: os ${antes.length} traços voltam iguais, visíveis e presos ao parágrafo (sem duplicar)`, 'simulado', { antes: antes.length, depois: pr.length, ancR });
          chk('persistencia', W, 'recarregar-grifos', hlDepois === hlAntes && hlAntes > 0, `recarregar: os ${hlAntes} grifos voltam`, 'simulado', { hlAntes, hlDepois });
        }

        await checarTabela(p, c, W, chk, go, secs);

        /* ---------- QUESTÕES ---------- */
        if (blocoQuiz) {
          await go({ view: 'modeblk', mode: 'preguntas', block: blocoQuiz.id }, 900);
          const q = await p.evaluate(id => { const it = [...document.getElementById(id).querySelectorAll('.quiz-item')].find(x => !x.closest('[data-rm-off]') && x.getBoundingClientRect().height > 0); if (!it) return null; it.scrollIntoView({ block: 'center' }); it.setAttribute('data-ens-q', ''); const o = it.querySelector('.options li, li[data-option], .tf-buttons button'); if (o) { o.setAttribute('data-ens-o', ''); return { ok: true }; } const rv = it.querySelector('.reveal-btn'); if (rv) { rv.setAttribute('data-ens-o', ''); return { aberta: true }; } return { semOpcao: true }; }, blocoQuiz.id);
          if (!q || q.semOpcao) bloq('questoes', W, 'responder', 'a 1.ª questão visível não tem alternativa nem «Ver respuesta»');
          else if (!(await abrirDetalhes(p, '[data-ens-o]'))) chk('questoes', W, 'responder', false, 'modo Preguntas: a questão está dentro de um <details> fechado cujo <summary> o modo escondeu', 'cdp', { bloco: blocoQuiz.id });
          else if (q.aberta) {   /* questão aberta (CITAR/MARCAR): «Ver respuesta» mostra a resposta */
            await p.waitForTimeout(300); await p.click('[data-ens-o]'); await p.waitForTimeout(900);
            const ra = await p.evaluate(() => { const a = document.querySelector('[data-ens-q] .answer'); return { vis: !!a && getComputedStyle(a).display !== 'none' && a.getBoundingClientRect().height > 0 }; });
            chk('questoes', W, 'responder', ra.vis, 'modo Preguntas: questão aberta — «Ver respuesta» mostra a resposta', 'cdp', ra);
          } else {
            await p.waitForTimeout(300); await p.click('[data-ens-o]'); await p.waitForTimeout(900);
            const rq = await p.evaluate(() => { const it = document.querySelector('[data-ens-q]'); return { answered: it.classList.contains('answered'), correta: !!it.querySelector('.correct'), expl: !!it.querySelector('.quiz-answer.show, .answer.show, .show') }; });
            chk('questoes', W, 'responder', rq.answered && rq.correta, 'modo Preguntas: tocar uma alternativa responde e marca a correta', 'cdp', rq);
          }
        }
        /* ---------- FLASHCARDS ---------- */
        if (blocoFc) {
          await go({ view: 'modeblk', mode: 'flashcards', block: blocoFc.id }, 900);
          const okL = await p.evaluate(id => { const b = [...document.getElementById(id).querySelectorAll('.rmfc-launch .rmfc-play')].find(x => x.getBoundingClientRect().height > 0); if (!b) return false; b.scrollIntoView({ block: 'center' }); b.setAttribute('data-ens-fc', ''); return true; }, blocoFc.id);
          if (!okL) chk('flashcards', W, 'abre-gira-fecha', false, 'modo Flashcards: há botão «Jugar» visível no bloco', 'dom', { bloco: blocoFc.id });
          else {
            await p.waitForTimeout(250);
            const alcanca = await abrirDetalhes(p, '[data-ens-fc]');
            if (!alcanca) chk('flashcards', W, 'mazo-alcancavel', false, 'modo Flashcards: o «Jugar» está dentro de um <details> fechado cujo <summary> o modo escondeu — o aluno não consegue abrir o mazo', 'cdp', { bloco: blocoFc.id });
            else try { await p.evaluate(() => document.querySelector('[data-ens-fc]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); await p.click('[data-ens-fc]', { timeout: 6000 }); } catch (e) {
              const dg = await p.evaluate(() => { const x = document.querySelector('[data-ens-fc]'); const r = x.getBoundingClientRect(); const anc = []; for (let e2 = x; e2 && e2 !== document.body; e2 = e2.parentElement) { const cs = getComputedStyle(e2); if (cs.display === 'none' || cs.visibility !== 'visible' || +cs.opacity === 0 || e2.hasAttribute('data-rm-off')) anc.push((e2.tagName + '.' + e2.className).slice(0, 60) + ' d=' + cs.display + ' v=' + cs.visibility + ' o=' + cs.opacity); } const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { r: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], anc, topo: top && (top.tagName + '.' + top.className + '#' + top.id).slice(0, 80), body: document.body.className }; });
              throw new Error('«Jugar» não clicável: ' + JSON.stringify(dg));
            }
            if (alcanca) {
            await p.waitForTimeout(500);
            const o1 = await p.evaluate(() => { const o = document.querySelector('.rmfc-overlay'); return !!o && o.classList.contains('show'); });
            if (o1) { await p.click('.rmfc-overlay .rmfc-card'); await p.waitForTimeout(500); }
            const g1 = await p.evaluate(() => !!document.querySelector('.rmfc-overlay .rmfc-inner.flipped'));
            await p.keyboard.press('Escape'); await p.waitForTimeout(400);
            const o2 = await p.evaluate(() => { const o = document.querySelector('.rmfc-overlay'); return !!o && o.classList.contains('show'); });
            if (o2) { await p.click('.rmfc-overlay [data-a="close"]'); await p.waitForTimeout(300); }
            chk('flashcards', W, 'abre-gira-fecha', o1 && g1, 'modo Flashcards: «Jugar» abre o mazo, tocar a carta gira e Esc/✕ fecha', 'cdp', { o1, g1, o2 });
            }
          }
        }
        /* ---------- fecho: erros e escritas ---------- */
        const wf = (await escritas(p)).filter(x => !TABELAS_OK.test(x));
        chk('boot', W, 'escritas-so-anotacoes', wf.length === 0, 'só tinta/grifos/notas escrevem (simulado); nada mais', 'simulado', wf);
        chk('boot', W, 'erros-js', r.errs.length === 0, '0 erros de JavaScript durante toda a sequência', 'dom', r.errs.slice(0, 5));
        const ext = r.externas.filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u));
        chk('boot', W, 'zero-rede-externa', ext.length === 0, 'nenhuma requisição externa (fora a fonte do tema)', 'dom', ext);
        await r.ctx.close();
        process.stdout.write(W + ' ');
      } catch (e) {
        R.checks.push({ area: 'ensaio', w: W, id: 'interrompido', estado: 'FALHA', msg: 'a sequência desta largura foi interrompida por exceção (ver dados)', dados: String(e && e.stack || e).slice(0, 400) });
        process.stdout.write(W + '! ');
        try { r && await r.ctx.close(); } catch (e2) {}
      }
    }
    R.adaptacoes = [...usadas].sort(); R.segundos = Math.round((Date.now() - t0) / 1000);
    const f = R.checks.filter(c => c.estado === 'FALHA').length, b = R.checks.filter(c => c.estado === 'BLOQUEADO').length;
    console.log(`→ ${R.checks.length} verificações · ${f} FALHA · ${b} BLOQUEADO · ${R.segundos}s`);
    if (SO_TABELA) {   // mescla: troca só as verificações da tabela no resultado completo já gravado
      const f0 = path.join(OUT, m.slug + '.json'); if (!fs.existsSync(f0)) { console.log('  (sem resultado completo para mesclar)'); continue; }
      const R0 = JSON.parse(fs.readFileSync(f0, 'utf8')); R0.checks = R0.checks.filter(c => c.id !== 'tabela-rola-com-lapis' && c.de !== 'so-tabela').concat(R.checks.filter(c => c.id === 'tabela-rola-com-lapis' || c.area === 'ensaio').map(c => c.area === 'ensaio' ? Object.assign({ de: 'so-tabela' }, c) : c));   // exceção de uma mescla anterior sai na próxima
      R0.tabela_mesclada_em = new Date().toISOString(); fs.writeFileSync(f0, L.jsonLinhas(R0, 'checks')); continue;
    }
    fs.writeFileSync(path.join(OUT, m.slug + '.json'), L.jsonLinhas(R, 'checks'));
  }
  await br.close(); srv.close();
})();
