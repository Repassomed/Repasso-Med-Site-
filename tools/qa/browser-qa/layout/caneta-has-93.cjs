/* CUSTO DA REGRA DA #93 NA ESCRITA COM A CANETA — mede, com e sem a regra `.container>:has(>.rmc-margin){z-index:auto}` (e, de contraste, com a versão por DESCENDENTE `:has(.rmc-margin)` que a auditoria da PR #464 questionou).
   Estados da regra, trocados NA MESMA PÁGINA (mesmo DOM, mesmo layout, mesma CPU) pelo CSSOM:
     sem     = regra removida (a main)
     filho   = `.container>:has(>.rmc-margin)`  (esta PR)
     desc    = `.container>:has(.rmc-margin)`   (1.ª versão da PR; descendente)
   Gestos pela pipeline REAL do Chromium (CDP Input.dispatchMouseEvent pointerType:'pen' → pointerdown/move/up), motor REAL da caneta (rm-tools-v2.js), 150 traços já salvos, CPU 1× e 4× mais lenta. Mede (Event Timing API, longtask,
   rAF, Performance.getMetrics): processamento do pointerup, p95 do pointermove, latência da tinta, tarefas longas, tempo de ESTILO por quadro, pontos perdidos. Também um micro-benchmark do custo de recálculo de estilo por mutação do DOM
   (classe no <body> como rm2-pen-down, e nó inserido num parágrafo como um grifo) — onde o `:has()` por descendente cobra.
   Alvos: Dermatología e Fisiopatología II (muitos blocos com post-it: a regra casa em 5 e 66 elementos) no layout legado, e Semiología II no layout NOVO (V2 + tema + navegação).
   Uso:  RM_PLAYWRIGHT=... node caneta-has-93.cjs [--n=3] [--tracos=4] [--throttle=4] [--json=saida.json] [--alvos=dermatologia,fisiopatologia-ii,semiologia-ii-novo] */
const fs = require('fs');
const { serve } = require('./serve.cjs');
const P = require('./postits-93.probe.cjs');
const B = require('./pen-bench.cjs');
const L = require('./lib-player.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const med = (a) => { a = a.filter(x => x !== null && x !== undefined && !isNaN(x)).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const r1 = (x) => x === null || x === undefined ? null : Math.round(x * 100) / 100;

const SEL_FILHO = '#materias-container .rm-cuaderno .container>:has(>.rmc-margin)';
const SEL_DESC = '#materias-container .rm-cuaderno .container>:has(.rmc-margin)';

/* troca o estado da regra no CSSOM (window.__setEstado, injetado na página): remove a regra existente e, conforme o estado, insere a versão por filho ou por descendente; devolve quantos elementos ela casa */
async function injetarEstado(page) {
  await page.evaluate(([fn, SF, SD]) => {
    window.__setEstado = (nome) => {
      const achar = () => { for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } for (const r of rs) if (r.cssRules) for (let i = 0; i < r.cssRules.length; i++) { const t = r.cssRules[i].selectorText || ''; if (/:has\(/.test(t) && /rmc-margin/.test(t) && /\.container/.test(t)) return { media: r, i }; } } return null; };
      const mediaMin = () => { for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } for (const r of rs) if (r.conditionText && /min-width:\s*920px/.test(r.conditionText) && /rmc-margin/.test(r.cssText)) return r; } return null; };
      const f = achar(), media = f ? f.media : mediaMin();
      if (f) f.media.deleteRule(f.i);
      if (nome === 'filho') media.insertRule(SF + '{z-index:auto;}', media.cssRules.length);
      if (nome === 'desc') media.insertRule(SD + '{z-index:auto;}', media.cssRules.length);
      return document.querySelectorAll(nome === 'desc' ? '#materias-container .rm-cuaderno .container>:has(.rmc-margin)' : '#materias-container .rm-cuaderno .container>:has(>.rmc-margin)').length;
    };
  }, [null, SEL_FILHO, SEL_DESC]);
}

/* micro-benchmark: custo de recálculo de estilo por mutação (ms por mutação, mediana de 5 rodadas de 200) */
const MICRO = async () => {
  const forcar = () => getComputedStyle(document.body).display;           // força o recálculo de estilo (sem layout)
  const alvo = [...document.querySelectorAll('#materias-container p')].filter(p => p.textContent.length > 150)[3];
  const rod = (fn) => { const v = []; for (let k = 0; k < 5; k++) { const a = performance.now(); for (let i = 0; i < 200; i++) { fn(i); forcar(); } v.push((performance.now() - a) / 200); } v.sort((x, y) => x - y); return v[2]; };
  const classe = rod(i => document.body.classList.toggle('rm2-pen-down', i % 2 === 0));
  document.body.classList.remove('rm2-pen-down');
  const no = rod(i => { if (i % 2 === 0) { const s = document.createElement('span'); s.className = '__mut'; alvo.appendChild(s); } else { const s = alvo.querySelector('.__mut'); if (s) s.remove(); } });
  alvo.querySelectorAll('.__mut').forEach(e => e.remove());
  return { classeBodyMs: classe, noNoParagrafoMs: no };
};

async function abrirAlvo(br, base, alvo, o) {
  if (alvo === 'semiologia-ii-novo') {
    const midia = L.gerarMidia();
    const r = await L.abrir(br, base, midia, Object.assign({ w: 1440, h: 900, seedmany: o.seedmany }, B.CFG.novo));
    return r;
  }
  const c = P.catalogo([alvo])[0];
  const r = await P.abrirMateria(br, base, c.slug, c.tab, 1440, 900, { seedmany: o.seedmany, uid: L.JOSE });
  return r;
}

async function medirAlvo(br, base, alvo, o) {
  const { ctx, page, errs } = await abrirAlvo(br, base, alvo, o);
  const out = { alvo, estados: {}, elementosCasados: {}, micro: {}, erros: errs.length };
  try {
    await injetarEstado(page); await page.evaluate(B.INSTR);
    const novo = alvo === 'semiologia-ii-novo';
    let r;
    if (novo) { r = await B.prepararAlvo(page, 'novo', 'paragrafo', false); }
    else {
      r = await page.evaluate(async () => {
        const esp = ms => new Promise(o => setTimeout(o, ms)); const p = [...document.querySelectorAll('#materias-container section p')].filter(e => e.textContent.length > 220 && !e.closest('[data-rm-ui]'))[8];
        p.scrollIntoView({ block: 'center' }); await esp(900); window.RMToolsV2.escolherFerramenta('pen'); await esp(300); window.__alvoEl = p; const b = p.getBoundingClientRect();
        return { x: b.left, y: b.top, w: b.width, h: b.height, tool: window.RMToolsV2.estado && window.RMToolsV2.estado.tool };
      });
    }
    out.tool = r.tool;
    const ordem = []; for (let k = 0; k < o.n; k++) ordem.push(...(k % 2 ? ['desc', 'filho', 'sem'] : ['sem', 'filho', 'desc']));
    const acum = { sem: [], filho: [], desc: [] };
    /* aquecimento (1 traço, descartado) */
    { const rr = await page.evaluate(() => { const b = window.__alvoEl.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }); const pts = B.gesto('rapido', rr); await B.desenhar(ctx, page, pts, 2, o.throttle); }
    for (const est of ordem) {
      out.elementosCasados[est] = await page.evaluate(n => window.__setEstado(n), est); await page.waitForTimeout(300);
      const lista = [];
      for (let k = 0; k < o.tracos; k++) {
        const rr = await page.evaluate(() => { window.__alvoEl.scrollIntoView({ block: 'center' }); const b = window.__alvoEl.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
        const pts = B.gesto('rapido', rr); const dados = await B.desenhar(ctx, page, pts, 2, o.throttle); const perdas = await B.medirPerdas(page, pts); const res = B.resumir(dados, pts, perdas);
        lista.push({ upProc: res.eventTiming.up && res.eventTiming.up.proc, upDur: res.eventTiming.up && res.eventTiming.up.dur, moveP95: res.eventTiming.durP95, tinta: res.tintaMs.p95, lt: res.tarefasLongas.n, quadroMax: res.quadros.max, estilo: res.cpuPorQuadro.estiloMs, tarefa: res.cpuPorQuadro.tarefaMs, recalc: res.cpuPorQuadro.recalculosEstilo, perdidos: perdas.perdidos || 0, enviados: pts.length - 1, tracos: perdas.tracos });
      }
      acum[est].push(...lista);
      out.micro[est] = (out.micro[est] || []); out.micro[est].push(await page.evaluate(MICRO));
    }
    for (const est of ['sem', 'filho', 'desc']) {
      const v = acum[est]; const f = (k) => r1(med(v.map(x => x[k])));
      out.estados[est] = { tracos: v.length, upProcMs: f('upProc'), upDurMs: f('upDur'), moveP95Ms: f('moveP95'), tintaP95Ms: f('tinta'), tarefasLongas: f('lt'), quadroMaxMs: f('quadroMax'), estiloPorQuadroMs: f('estilo'), tarefaPorQuadroMs: f('tarefa'), recalculosEstilo: f('recalc'), pontosPerdidos: v.reduce((a, x) => a + x.perdidos, 0), pontosEnviados: v.reduce((a, x) => a + x.enviados, 0) };
      out.micro[est] = { classeBodyMs: r1(med(out.micro[est].map(m => m.classeBodyMs))), noNoParagrafoMs: r1(med(out.micro[est].map(m => m.noNoParagrafoMs))) };
    }
  } finally { await ctx.close(); }
  return out;
}

module.exports = { medirAlvo };

if (require.main === module) (async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const o = { n: +arg('n', 3), tracos: +arg('tracos', 4), throttle: +arg('throttle', 4), seedmany: +arg('seedmany', 150) };
  const alvos = arg('alvos', 'dermatologia,fisiopatologia-ii,semiologia-ii-novo').split(',');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch(); const todos = [];
  for (const a of alvos) {
    const r = await medirAlvo(br, base, a, o); todos.push(r);
    console.log(`\n${a} · CPU ${o.throttle}× · ${o.seedmany} traços salvos · ${o.n} rodadas × ${o.tracos} traços por estado · ferramenta=${r.tool} · elementos que a regra casa: filho=${r.elementosCasados.filho} desc=${r.elementosCasados.desc}`);
    for (const est of ['sem', 'filho', 'desc']) { const e = r.estados[est], m = r.micro[est]; console.log(`  ${est.padEnd(5)} pointerup proc ${e.upProcMs} ms · dur ${e.upDurMs} · move p95 ${e.moveP95Ms} · tinta p95 ${e.tintaP95Ms} · tarefas longas ${e.tarefasLongas} · pior quadro ${e.quadroMaxMs} · estilo/quadro ${e.estiloPorQuadroMs} ms · recálculos ${e.recalculosEstilo} · perdidos ${e.pontosPerdidos}/${e.pontosEnviados} · micro: classe-body ${m.classeBodyMs} ms/mut · nó-parágrafo ${m.noNoParagrafoMs} ms/mut`); }
  }
  if (arg('json', '')) fs.writeFileSync(arg('json', ''), JSON.stringify({ o, todos }, null, 1));
  await br.close(); srv.close();
})();
