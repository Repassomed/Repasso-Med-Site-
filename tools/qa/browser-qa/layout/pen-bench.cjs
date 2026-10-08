/* BANCADA DA CANETA (issue #456) — mede latência, quadros e pontos perdidos do traço com o motor REAL da caneta (rm-tools-v2.js) em três configurações:
     antigo  = layout antigo (flags layout:false — a matéria sem Layout V2, sem tema, sem navegação)
     layout  = Layout V2 sem tema (layout:true, visual:false)
     novo    = Layout V2 + tema + navegação por bloco (o piloto aprovado na #454)
   Os gestos usam a PIPELINE REAL do Chromium (CDP Input.dispatchMouseEvent com pointerType:'pen' → pointerdown/move/up reais, hit-test, touch-action, coalescing,
   alinhamento com o frame), não eventos sintéticos. Mede NO NAVEGADOR (PerformanceObserver 'longtask', rAF, relógio dos eventos):
     · atraso de entrega de cada pointermove (agora − e.timeStamp): p50/p95/máx — mostra a thread principal ocupada;
     · quadros durante o traço (intervalo rAF): média, p95, máx, nº > 33 ms e > 50 ms; tarefas longas (≥ 50 ms): nº e soma;
     · latência da tinta: tempo do pointermove k até o 1.º quadro em que o `d` do traço já contém o ponto k (p50/p95/máx), e quantos pontos ficam atrasados por quadro;
     · pontos perdidos: cada ponto ENVIADO → distância à polilinha FINAL gravada (`d` do traço, desnormalizado pela caixa da âncora): máx e nº > 2 px; nº de traços criados.
   Uso:  RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/pen-bench.cjs [--cfg=antigo,layout,novo] [--gesto=rapido,longo,tabela,postit,player,toolbox] [--n=3] [--json=arquivo] [--w=1440] [--h=900] [--throttle=1|4|6] [--mobile=1 --scale=2] [--seedmany=N (traços já gravados)] [--tracos=N (traços em sequência: o 1.º é «frio», os demais «quentes»)]
   Também exporta `bench()` para os testes (caneta-novo-layout.test.cjs). Emulação do Chromium; não é aparelho real. */
const L = require('./lib-player.cjs');

const CFG = {
  antigo: { layout: false, visual: false, nav: false },
  layout: { layout: true, visual: false, nav: false },
  novo: { layout: true, visual: true, nav: true }
};
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r1 = (x) => x === null || x === undefined ? null : Math.round(x * 10) / 10;

/* instrumentação injetada na página (uma vez por página) */
const INSTR = () => {
  const W = window; if (W.__pb) return; const pb = W.__pb = { ev: [], frames: [], lt: [], rodando: false, sent: 0 };
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(t => window.addEventListener(t, e => {
    if (!pb.rodando) return;
    pb.ev.push({ t: performance.now(), q: performance.now() - e.timeStamp, ty: t, x: e.clientX, y: e.clientY, co: e.getCoalescedEvents ? e.getCoalescedEvents().length : 1 });
  }, true));
  try { new PerformanceObserver(l => { if (pb.rodando) l.getEntries().forEach(x => pb.lt.push(x.duration)); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  /* Event Timing API: por evento, atraso de entrada (startTime→processingStart), processamento e duração TOTAL até o próximo quadro pintado = a latência que o aluno sente */
  pb.et = [];
  try { new PerformanceObserver(l => { if (pb.rodando) l.getEntries().forEach(x => { if (/^pointer(down|move|up)$/.test(x.name)) pb.et.push({ n: x.name, ent: x.processingStart - x.startTime, proc: x.processingEnd - x.processingStart, dur: x.duration }); }); }).observe({ type: 'event', durationThreshold: 16, buffered: false }); } catch (e) {}
  const nPares = (d) => { d = d || ''; if (!d) return 0; const m = d.match(/[LQ]/g); return 1 + (m ? m.length : 0); };      // pontos já «congelados» no d: M + cada L/Q
  const loop = (t) => {
    if (pb.rodando) {
      const ps = [...document.querySelectorAll('#rm2-ink svg path')]; const p = ps[ps.length - 1];
      pb.frames.push({ t, ink: p ? nPares(p.getAttribute('d')) : 0, ev: pb.ev.filter(e => e.ty === 'pointermove').length + 1 });
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

/* pontos do gesto (em coordenadas de cliente) para uma caixa alvo */
function gesto(nome, r) {
  /* passo FIXO de ~2 px entre pontos (como uma stylus a ~240 Hz escrevendo a ~500 px/s), independente da largura do alvo: o motor descarta pontos a < 1,1 px
     (MIN_DIST_PX), e um passo que dependa da largura contaminaria a comparação entre configurações. O traço vai e volta (zigue-zague) dentro do alvo. */
  const pts = [], N = nome === 'longo' ? 200 : 360, step = 2, x0 = r.x + Math.min(30, r.w * .05), larg = Math.min(r.w * .8, 560), amp = Math.max(3, Math.min(9, r.h / 4));
  let x = x0, dir = 1, yb = r.y + Math.min(r.h / 4, 14);
  for (let i = 0; i < N; i++) {
    pts.push([x, yb + Math.sin(i / 5) * amp * (0.6 + 0.4 * Math.sin(i / 37))]);
    x += dir * step;
    if (x > x0 + larg || x < x0) { dir = -dir; x = Math.max(x0, Math.min(x0 + larg, x)); yb = Math.min(r.y + r.h - amp - 2, yb + 6); }
  }
  return pts;
}

/* alvo do gesto */
async function prepararAlvo(page, cfgNome, alvo, viaToolbox) {
  if (viaToolbox) await page.evaluate(() => { window.__viaToolbox = true; });
  const r = await prepararAlvoBase(page, cfgNome, alvo);
  if (viaToolbox) {                                         // fluxo REAL do aluno: abre a toolbox (maleta) e toca no lápis com o painel ABERTO, depois escreve
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await page.waitForTimeout(200);
    const botao = (await page.$('.rm-sis-tools')) && await page.evaluate(() => getComputedStyle(document.querySelector('.rm-sis-tools')).display !== 'none') ? '.rm-sis-tools' : '#rm2-fab';      // celular < 768 no tema: o botão «Herramientas» da faixa (delega ao FAB)
    await page.click(botao, { force: true }); await page.waitForTimeout(500);
    await page.click('.rm2-btn[data-t="pen"]', { force: true }); await page.waitForTimeout(600);
    r.toolboxAberta = await page.evaluate(() => document.querySelector('.rm2-box').classList.contains('open'));
    r.tool = await page.evaluate(() => window.RMToolsV2.estado && window.RMToolsV2.estado.tool);
  }
  return r;
}
async function prepararAlvoBase(page, cfgNome, alvo) {
  return page.evaluate(async ([cfg, al]) => {
    const esp = ms => new Promise(o => setTimeout(o, ms));
    let el, sec;
    if (al === 'tabela') { sec = 's2-b01'; el = document.querySelector('#s2-b01 table tbody tr') || document.querySelector('#s2-b01 table'); }
    else if (al === 'postit') { sec = 's2-b04'; el = document.querySelector('#s2-b04 .rm-postit'); }
    else { sec = 's2-b04'; el = [...document.getElementById('s2-b04').querySelectorAll('p')].filter(p => !p.closest('[data-rm-ui]') && p.textContent.length > 150)[2]; }
    if (cfg === 'novo' && window.RMNav) { window.RMNav.go({ view: 'block', block: sec }); await esp(1500); }
    if (window.RMLayout && window.RMLayout.irPara) window.RMLayout.irPara(el); else el.scrollIntoView({ block: 'center' });
    await esp(1700);
    if (!window.__viaToolbox && window.RMToolsV2) window.RMToolsV2.escolherFerramenta('pen'); await esp(300);
    const r = el.getBoundingClientRect(); window.__alvoEl = el;
    return { x: r.left, y: r.top, w: r.width, h: r.height, tool: window.RMToolsV2 && window.RMToolsV2.estado && window.RMToolsV2.estado.tool };
  }, [cfgNome, alvo]);
}

const M_CHAVES = ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount'];
async function metricas(cdp) { const { metrics } = await cdp.send('Performance.getMetrics'); const o = {}; metrics.forEach(m => { if (M_CHAVES.includes(m.name)) o[m.name] = m.value; }); return o; }

async function desenhar(ctx, page, pts, intervaloMs, throttle) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable'); if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const m0 = await metricas(cdp);
  const send = (type, x, y, extra) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, extra));
  await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 });
  await page.evaluate(() => { window.__pbOld = new WeakSet(document.querySelectorAll('#rm2-ink path[data-ink]')); });   // traços que já existiam: medirPerdas só olha o NOVO (a ordem no DOM não é a ordem de criação)
  await page.evaluate(() => { const pb = window.__pb; pb.ev = []; pb.frames = []; pb.lt = []; pb.et = []; pb.rodando = true; });
  await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
  for (let i = 1; i < pts.length; i++) {
    await send('mouseMoved', pts[i][0], pts[i][1], { button: 'left', buttons: 1, force: .5 });
    if (intervaloMs) await new Promise(o => setTimeout(o, intervaloMs));
  }
  await send('mouseReleased', pts[pts.length - 1][0], pts[pts.length - 1][1], { button: 'left', buttons: 0, clickCount: 1 });
  await page.waitForTimeout(700);
  const dados = await page.evaluate(() => { const pb = window.__pb; pb.rodando = false; return { ev: pb.ev, frames: pb.frames, lt: pb.lt, et: pb.et }; });
  const m1 = await metricas(cdp); dados.cpu = {}; M_CHAVES.forEach(k => { dados.cpu[k] = (m1[k] || 0) - (m0[k] || 0); });
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.detach().catch(() => {});
  return dados;
}

/* pontos perdidos: distância de cada ponto enviado à polilinha FINAL gravada */
async function medirPerdas(page, pts) {
  return page.evaluate((pts) => {
    const svgs = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')];
    const ps = []; svgs.forEach(sv => sv.querySelectorAll('path[data-ink]').forEach(p => ps.push({ sv, p })));
    if (!ps.length) return { tracos: 0 };
    const novos = window.__pbOld ? ps.filter(x => !window.__pbOld.has(x.p)) : ps, alvo = novos.length ? novos : ps;
    const { sv, p } = alvo[alvo.length - 1];
    const a = sv.getAttribute('data-anchor').split('>'); const sec = document.getElementById(a[0]);
    const el = a[1] !== undefined ? [...sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(n => !n.closest('[data-rm-ui]'))[+a[1]] : sec;
    const r = el.getBoundingClientRect();
    const nums = (p.getAttribute('d').match(/-?\d*\.?\d+/g) || []).map(Number); const poly = [];
    for (let i = 0; i + 1 < nums.length; i += 2) poly.push([r.left + (nums[i] / 1000) * r.width, r.top + (nums[i + 1] / 1000) * r.height]);   // d em 0–1000 (viewBox) · inclui pontos de controle Q
    const dseg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)); };
    let max = 0, ruins = 0;
    pts.forEach(q => { let m = Infinity; for (let i = 0; i + 1 < poly.length; i++) m = Math.min(m, dseg(q[0], q[1], poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1])); if (poly.length === 1) m = Math.hypot(q[0] - poly[0][0], q[1] - poly[0][1]); if (m > max) max = m; if (m > 2) ruins++; });
    return { tracos: ps.length, nPontosGravados: poly.length, maxDist: max, perdidos: ruins };
  }, pts);
}

function resumir(dados, pts, perdas) {
  const mv = dados.ev.filter(e => e.ty === 'pointermove'), q = mv.map(e => e.q);
  const fr = dados.frames, dt = []; for (let i = 1; i < fr.length; i++) dt.push(fr[i].t - fr[i - 1].t);
  /* latência da tinta: ponto k (k-ésimo pointermove) → 1.º quadro com ink ≥ k+1 (o pointerdown já deu o ponto 0) */
  const lat = []; mv.forEach((e, k) => { const f = fr.find(x => x.t >= e.t && x.ink >= k + 2); if (f) lat.push(f.t - e.t); else lat.push(null); });
  const lv = lat.filter(x => x !== null), semTinta = lat.length - lv.length;
  const atras = fr.map(f => Math.max(0, (f.ev - 1) - (f.ink - 1)));
  return {
    pointermoves: mv.length, enviados: pts.length - 1, coalescidosMax: Math.max(0, ...mv.map(e => e.co)),
    entregaMs: { p50: r1(pct(q, .5)), p95: r1(pct(q, .95)), max: r1(Math.max(...q)) },
    quadros: { n: fr.length, mediaMs: r1(dt.reduce((a, b) => a + b, 0) / Math.max(1, dt.length)), p95: r1(pct(dt, .95)), max: r1(Math.max(0, ...dt)), mais33: dt.filter(x => x > 33.4).length, mais50: dt.filter(x => x > 50).length },
    tarefasLongas: { n: dados.lt.length, somaMs: r1(dados.lt.reduce((a, b) => a + b, 0)), maxMs: r1(Math.max(0, ...dados.lt)) },
    tintaMs: { p50: r1(pct(lv, .5)), p95: r1(pct(lv, .95)), max: r1(Math.max(0, ...lv)), semTinta },
    pontosAtrasados: { mediaPorQuadro: r1(atras.reduce((a, b) => a + b, 0) / Math.max(1, atras.length)), max: Math.max(0, ...atras) },
    eventTiming: (() => { const e = dados.et || [], mv = e.filter(x => x.n === 'pointermove').map(x => x.dur), d = e.find(x => x.n === 'pointerdown'), u = e.find(x => x.n === 'pointerup'); return { moves: mv.length, durP50: r1(pct(mv, .5)), durP95: r1(pct(mv, .95)), durMax: r1(Math.max(0, ...mv)), down: d ? { ent: r1(d.ent), proc: r1(d.proc), dur: r1(d.dur) } : null, up: u ? { ent: r1(u.ent), proc: r1(u.proc), dur: r1(u.dur) } : null }; })(),
    cpuPorQuadro: (() => { const n = Math.max(1, fr.length), c = dados.cpu || {}; return { tarefaMs: r1((c.TaskDuration || 0) * 1000 / n), scriptMs: r1((c.ScriptDuration || 0) * 1000 / n), layoutMs: r1((c.LayoutDuration || 0) * 1000 / n), estiloMs: r1((c.RecalcStyleDuration || 0) * 1000 / n), layouts: c.LayoutCount || 0, recalculosEstilo: c.RecalcStyleCount || 0 }; })(),
    perdas
  };
}

/* uma medição completa: abre a matéria na configuração, prepara o alvo, desenha e resume. opts: { w,h,gesto,alvo,intervaloMs,player,throttle } */
async function bench(br, base, midia, cfgNome, opts = {}) {
  const c = CFG[cfgNome]; const w = opts.w || 1440, h = opts.h || 900;
  const { ctx, page, errs } = await L.abrir(br, base, midia, Object.assign({ w, h, touch: !!opts.mobile, isMobile: !!opts.mobile, scale: opts.scale || 1, seedmany: opts.seedmany || 0 }, c));
  try {
    await page.evaluate(INSTR);
    const alvo = opts.alvo || 'paragrafo';
    if (opts.player) { if (cfgNome === 'novo') await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b01' })); await page.waitForTimeout(1200); await L.tocar(page, 's2-b01-motivo'); }
    const r = await prepararAlvo(page, cfgNome, opts.player ? 'paragrafo' : alvo, opts.toolbox);
    const nTracos = opts.tracos || 1, outros = [];
    let primeiro = null;
    for (let k = 0; k < nTracos; k++) {
      /* cada traço seguinte começa 120 ms depois do anterior, uma linha mais abaixo (aluno escrevendo letras/palavras em sequência) */
      const rr = k === 0 ? r : await page.evaluate(() => { const b = window.__alvoEl.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
      const pts = gesto(opts.gesto || 'rapido', rr);
      const dados = await desenhar(ctx, page, pts, opts.intervaloMs === undefined ? 3 : opts.intervaloMs, opts.throttle || 1);
      const perdas = await medirPerdas(page, pts);
      const res = resumir(dados, pts, perdas);
      if (k === 0) primeiro = res; else outros.push(res);
      await page.waitForTimeout(120);
    }
    const media = opts.player ? await L.motor(page) : null;
    const med = (f) => { const v = outros.map(f).filter(x => x !== null && x !== undefined).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
    const quente = outros.length ? { tracos: outros.length, downProcMs: med(x => x.eventTiming.down && x.eventTiming.down.proc), upProcMs: med(x => x.eventTiming.up && x.eventTiming.up.proc), downDurMs: med(x => x.eventTiming.down && x.eventTiming.down.dur), upDurMs: med(x => x.eventTiming.up && x.eventTiming.up.dur), moveDurP95: med(x => x.eventTiming.durP95), tintaP95: med(x => x.tintaMs.p95), tarefasLongas: med(x => x.tarefasLongas.n), maxQuadroMs: med(x => x.quadros.max), perdidos: outros.reduce((a, x) => a + (x.perdas.perdidos || 0), 0) } : null;
    return { cfg: cfgNome, w, h, throttle: opts.throttle || 1, seedmany: opts.seedmany || 0, gesto: opts.gesto || 'rapido', alvo: opts.player ? 'paragrafo+player' : alvo, tool: r.tool, erros: errs.length, player: media && media.state, ...primeiro, quente };
  } finally { await ctx.close(); }
}

module.exports = { bench, CFG, INSTR, gesto, desenhar, medirPerdas, resumir, prepararAlvo };

if (require.main === module) {
  const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
  const cfgs = arg('cfg', 'antigo,layout,novo').split(','), gestos = arg('gesto', 'rapido').split(','), n = +arg('n', 3), w = +arg('w', 1440), h = +arg('h', 900), json = arg('json', ''), thr = +arg('throttle', 1), mob = arg('mobile', '') === '1';
  (async () => {
    const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
    const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch(); const out = [];
    for (const g of gestos) for (const c of cfgs) for (let i = 0; i < n; i++) {
      if (g === 'player' && c === 'antigo') continue;                 // sem Layout V2 não há audiobook
      const [gn, al] = g === 'tabela' || g === 'postit' ? ['rapido', g] : (g === 'player' || g === 'toolbox') ? ['rapido', 'paragrafo'] : [g, 'paragrafo'];
      const r = await bench(br, base, midia, c, { w, h, gesto: gn, alvo: al, player: g === 'player', toolbox: g === 'toolbox', tracos: +arg('tracos', 1), throttle: thr, seedmany: +arg('seedmany', 0), mobile: mob, scale: +arg('scale', 1) }); r.rep = i + 1; r.nome = g; out.push(r);
      console.log(`${g.padEnd(8)} ${c.padEnd(6)} #${i + 1} · entrega p95 ${r.entregaMs.p95} máx ${r.entregaMs.max} ms · quadros média ${r.quadros.mediaMs} máx ${r.quadros.max} ms (>50: ${r.quadros.mais50}) · tarefas longas ${r.tarefasLongas.n}/${r.tarefasLongas.somaMs} ms · ET move p50/p95/máx ${r.eventTiming.durP50}/${r.eventTiming.durP95}/${r.eventTiming.durMax} ms · ET down ${JSON.stringify(r.eventTiming.down)} up ${JSON.stringify(r.eventTiming.up)} · tinta p50 ${r.tintaMs.p50} p95 ${r.tintaMs.p95} máx ${r.tintaMs.max} ms (sem tinta ${r.tintaMs.semTinta}) · atrasados méd ${r.pontosAtrasados.mediaPorQuadro} máx ${r.pontosAtrasados.max} · CPU/quadro ${r.cpuPorQuadro.tarefaMs} ms (script ${r.cpuPorQuadro.scriptMs} · estilo ${r.cpuPorQuadro.estiloMs} · layout ${r.cpuPorQuadro.layoutMs}; ${r.cpuPorQuadro.recalculosEstilo} recálculos/${r.cpuPorQuadro.layouts} layouts) · perdidos ${r.perdas.perdidos}/${r.enviados} (máx ${r.perdas.maxDist && r.perdas.maxDist.toFixed(1)} px, ${r.perdas.tracos} traço(s)) · erros ${r.erros}${r.quente ? `\n         QUENTE (${r.quente.tracos} traços seguintes, mediana): down proc ${r.quente.downProcMs} dur ${r.quente.downDurMs} · up proc ${r.quente.upProcMs} dur ${r.quente.upDurMs} · move dur p95 ${r.quente.moveDurP95} ms · tinta p95 ${r.quente.tintaP95} ms · quadro máx ${r.quente.maxQuadroMs} ms · tarefas longas ${r.quente.tarefasLongas} · perdidos ${r.quente.perdidos}` : ''}`);
    }
    if (json) require('fs').writeFileSync(json, JSON.stringify(out, null, 1));
    await br.close(); srv.close();
  })();
}
