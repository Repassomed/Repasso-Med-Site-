/* #456 P0 · TESTES DE REGRESSÃO DA CANETA REAL no piloto novo (e no layout antigo) — o que o #461 NÃO cobria:
   o custo POR TRAÇO (pointerdown/pointerup), a TRAVADA ao trocar de bloco/modo com a toolbox aberta, a proteção contra a palma sem o `touch-action` do contêiner,
   o diagnóstico opt-in e o gate do segundo testador. Motor REAL (rm-tools-v2.js), Layout V2/tema/navegação REAIS, Chromium; Supabase/flags simulados; 0 rede externa; só escritas simuladas.
   Limite declarado: emulação (CDP pointerType:'pen', toque emulado); NÃO é aparelho real — o critério de fechamento continua sendo o reteste físico do José.
   Uso: NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-456/caneta-456.test.cjs          (RM_ASSETS_REF=origin/main roda contra a main: as asserções de custo REPROVAM — prova de que detectam o defeito) */
'use strict';
const L = require('../browser-qa/layout/lib-player.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
const LI = require('../browser-qa/layout/lib-ink.cjs');
let n = 0, ko = 0; const FAIL = [];
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; FAIL.push(m); console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);
const BETA2 = '448e4d63-e410-48ed-8c71-8e99af317d3e';                    // 2.º UID beta LEGADO que já existe no código da V2 (público por natureza); nenhum UID novo entra aqui
const ABERTA = (p) => p.evaluate(() => !!document.querySelector('.rm2-box.open'));

async function abrir(br, base, midia, cfg, o = {}) {
  const r = await L.abrir(br, base, midia, Object.assign({ w: 1440, h: 900, touch: !!o.touch, isMobile: !!o.mobile }, B.CFG[cfg], o));
  await r.page.evaluate(B.INSTR);
  return r;
}
const cdpPen = async (ctx, page) => {
  const cdp = await ctx.newCDPSession(page);
  const send = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
  return { cdp, send };
};
async function trace(cdp, fn) {
  const ev = []; const f = d => ev.push(...d.value); cdp.on('Tracing.dataCollected', f);
  const fim = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  await fn(); await cdp.send('Tracing.end'); await fim; cdp.off('Tracing.dataCollected', f); return ev;
}
const janela = (ev, a, b) => { const o = { max: 0, el: 0 }; ev.filter(e => e.ph === 'X' && e.name === 'UpdateLayoutTree' && e.ts >= a && e.ts <= b).forEach(e => { o.max = Math.max(o.max, (e.dur || 0) / 1000); o.el = Math.max(o.el, (e.args && e.args.elementCount) || 0); }); return o; };
/* toque efetivo no ponto: interseção do touch-action de todos os ancestrais (é como o navegador decide se há pan) */
/* dedo arrastando para cima (rolar a página): sequência real de toque pelo pipeline de entrada do Chromium (a Input.synthesizeScrollGesture NÃO rola neste harness — por isso não serve de controle) */
const dedo = async (cdp, page, x, y0, dist, id = 7) => {
  const tp = (yy) => [{ x, y: yy, id }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(y0) });
  for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(y0 - (dist * i) / 12) }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(700);
};
const taEfetivo = (p, x, y) => p.evaluate(([x, y]) => { let e = document.elementFromPoint(x, y); const v = new Set(); const t = e ? e.id || e.tagName : null; for (; e && e.nodeType === 1; e = e.parentElement) { const a = getComputedStyle(e).touchAction; if (a === 'none') v.add('none'); } return { alvo: t, none: v.has('none') }; }, [x, y]);

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia(); const br = await chromium.launch();
  console.log('código sob teste:', process.env.RM_ASSETS_REF || 'árvore de trabalho');

  /* ============ A · custo POR TRAÇO: pointerdown/pointerup não recalculam a árvore inteira ============ */
  sec('A · pointerdown/pointerup: estilo recalculado só localmente (antes: 1 282 – 2 675 elementos, 12–35 ms a 1×)');
  for (const cfg of ['antigo', 'novo']) {
    const { ctx, page, errs } = await abrir(br, base, midia, cfg);
    const r = await B.prepararAlvo(page, cfg, 'paragrafo', true); const pts = B.gesto('rapido', r); const { cdp, send } = await cdpPen(ctx, page);
    await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 });
    const ev = await trace(cdp, async () => {
      await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 }); await page.waitForTimeout(400);
      for (let k = 1; k < 60; k++) { await send('mouseMoved', pts[k][0], pts[k][1], { button: 'left', buttons: 1, force: .5 }); await new Promise(o => setTimeout(o, 6)); }
      await page.waitForTimeout(200); await send('mouseReleased', pts[59][0], pts[59][1], { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(700);
    });
    const disp = ev.filter(e => e.name === 'EventDispatch' && e.args && e.args.data), d = disp.find(e => e.args.data.type === 'pointerdown'), u = disp.find(e => e.args.data.type === 'pointerup');
    const jd = janela(ev, d.ts - 1000, d.ts + 400000), ju = janela(ev, u.ts - 1000, u.ts + 700000);
    ok(jd.el <= 400, `${cfg}: pointerdown reaplica estilo a ≤ 400 elementos (medido ${jd.el})`, jd);
    ok(ju.el <= 400, `${cfg}: pointerup reaplica estilo a ≤ 400 elementos (medido ${ju.el})`, ju);
    ok(jd.max <= 8, `${cfg}: maior recálculo de estilo no pointerdown ≤ 8 ms a 1× (medido ${jd.max.toFixed(1)} ms)`, jd);
    ok(ju.max <= 8, `${cfg}: maior recálculo de estilo no pointerup ≤ 8 ms a 1× (medido ${ju.max.toFixed(1)} ms)`, ju);
    const tracos = await page.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
    ok(tracos >= 1, `${cfg}: o traço foi criado e gravado no DOM (${tracos})`);
    ok(errs.length === 0, `${cfg}: 0 erros JS`, errs);
    await ctx.close();
  }

  /* ============ B · proteção contra a palma: a guarda substitui o touch-action do contêiner ============ */
  sec('B · enquanto a stylus está em contato nenhum toque faz pan (guarda no piloto; regra legada fora dele)');
  for (const [rot, uid, piloto] of [['piloto (José, Semiología II)', L.JOSE, true], ['beta legado (2.º UID da V2, fora do piloto físico)', BETA2, false]]) {
    const { ctx, page, errs } = await abrir(br, base, midia, 'novo', { w: 1024, h: 768, touch: true, uid });
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true); const pts = B.gesto('rapido', r); const { cdp, send } = await cdpPen(ctx, page);
    const est0 = await page.evaluate(() => ({ piloto: window.RMToolsV2._test.pilotoPermitido(), guardaClasse: document.body.classList.contains('rm2-pilot-guard'), guardaEl: !!document.getElementById('rm2-penguard'), tool: window.RMToolsV2.estado.tool }));
    ok(est0.tool === 'pen', `${rot}: lápis armado pela toolbox (tool=${est0.tool})`, est0);
    ok(est0.piloto === piloto && est0.guardaClasse === piloto, `${rot}: pilotoPermitido=${piloto} e classe rm2-pilot-guard=${piloto}`, est0);
    ok(est0.guardaEl, `${rot}: o elemento #rm2-penguard existe (inerte)`, est0);
    const alvo = [pts[0][0] + 40, pts[0][1] + 60];
    const livre = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return { id: e && (e.id || e.tagName) }; }, alvo);
    ok(livre.id !== 'rm2-penguard', `${rot}: sem contato, a guarda NÃO intercepta toques/cliques (alvo = ${livre.id})`, livre);
    const ta0 = await taEfetivo(page, alvo[0], alvo[1]);
    ok(!ta0.none, `${rot}: sem contato o dedo pode fazer pan (touch-action efetivo ≠ none)`, ta0);
    await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 }); await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
    for (let k = 1; k < 8; k++) { await send('mouseMoved', pts[k][0], pts[k][1], { button: 'left', buttons: 1, force: .5 }); await page.waitForTimeout(8); }
    const em = await page.evaluate(() => ({ down: document.body.classList.contains('rm2-pen-down'), traco: window.RMToolsV2._test.temTraco() }));
    ok(em.down && em.traco, `${rot}: contato registrado (rm2-pen-down) e traço em curso`, em);
    const ta1 = await taEfetivo(page, alvo[0], alvo[1]);
    ok(ta1.none, `${rot}: com a stylus em contato o toque efetivo naquele ponto é touch-action:none (alvo = ${ta1.alvo})`, ta1);
    const antesY = await page.evaluate(() => Math.round(scrollY));
    await dedo(cdp, page, 520, 600, 260);
    const depoisY = await page.evaluate(() => Math.round(scrollY));
    ok(Math.abs(depoisY - antesY) <= 3, `${rot}: uma 2.ª mão (dedo/palma) arrastando durante o traço NÃO rola a página (Δ=${depoisY - antesY} px)`, { antesY, depoisY });
    await send('mouseReleased', pts[7][0], pts[7][1], { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(500);
    const ta2 = await taEfetivo(page, alvo[0], alvo[1]);
    ok(!ta2.none, `${rot}: ao levantar, o dedo volta a poder rolar (touch-action efetivo ≠ none)`, ta2);
    const antes2 = await page.evaluate(() => Math.round(scrollY));
    await dedo(cdp, page, 520, 600, 260);
    const depois2 = await page.evaluate(() => Math.round(scrollY));
    ok(depois2 - antes2 >= 80, `${rot}: depois do pointerup o dedo rola a página normalmente (Δ=${depois2 - antes2} px)`, { antes2, depois2 });
    const guardaInerte = await page.evaluate(() => { const g = document.getElementById('rm2-penguard'); return g ? getComputedStyle(g).pointerEvents : 'ausente'; });
    ok(guardaInerte === 'none', `${rot}: guarda volta a pointer-events:none (${guardaInerte})`);
    ok(errs.length === 0, `${rot}: 0 erros JS`, errs);
    await ctx.close();
  }

  /* ============ C · a toolbox aberta não reaplica o estilo da página inteira a cada ida e volta de modo ============ */
  sec('C · --rm-dock-h: nenhuma escrita na raiz em tablet/desktop; no celular a reserva é mantida (sem ir a 0 e voltar)');
  for (const [w, h, rot] of [[1440, 900, 'desktop 1440'], [768, 1024, 'tablet 768'], [390, 844, 'celular 390']]) {
    const { ctx, page, errs } = await abrir(br, base, midia, 'novo', { w, h, touch: w < 900, isMobile: false });
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true);
    ok(r.toolboxAberta === true, `${rot}: toolbox aberta e lápis armado pela UI (aberta=${r.toolboxAberta}, tool=${r.tool})`, r);
    await page.evaluate(() => { window.__dock = []; const ro = document.documentElement; let ult = ro.style.getPropertyValue('--rm-dock-h'); window.__dockIni = ult; new MutationObserver(() => { const v = ro.style.getPropertyValue('--rm-dock-h'); if (v !== ult) { window.__dock.push([ult, v]); ult = v; } }).observe(ro, { attributes: true, attributeFilter: ['style'] }); });
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.RMNav.go({ view: 'modeidx', mode: 'preguntas' })); await page.waitForTimeout(700);
      await page.evaluate(() => window.RMNav.go({ view: 'modeblk', mode: 'preguntas', block: 's2-b04' })); await page.waitForTimeout(700);
      await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b04' })); await page.waitForTimeout(900);
    }
    const dock = await page.evaluate(() => ({ mud: window.__dock, ini: window.__dockIni, fim: document.documentElement.style.getPropertyValue('--rm-dock-h') }));
    ok(dock.mud.length === 0, `${rot}: 0 mudanças de --rm-dock-h em 3 idas e voltas de modo com a toolbox aberta (mudanças: ${JSON.stringify(dock.mud)})`, dock);
    if (w < 768) ok(parseFloat(dock.fim) > 40, `${rot}: a reserva do dock fica (${dock.fim}) para a toolbox aberta`, dock);
    else ok(!dock.fim || parseFloat(dock.fim) === 0, `${rot}: nenhuma reserva de dock fora do celular (${dock.fim || 'sem valor'})`, dock);
    ok(await ABERTA(page), `${rot}: a toolbox continua aberta depois das trocas (o aluno não precisa fechá-la)`);
    ok(errs.length === 0, `${rot}: 0 erros JS`, errs);
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(br, base, midia, 'novo', { w: 390, h: 844, touch: true });
    await B.prepararAlvo(page, 'novo', 'paragrafo', true);
    const aberto = await page.evaluate(() => document.documentElement.style.getPropertyValue('--rm-dock-h'));
    for (let k = 0; k < 3 && await ABERTA(page); k++) { await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await page.evaluate(() => document.querySelector('#rm2-fab').click()); await page.waitForTimeout(500); }
    const fechado = await page.evaluate(() => document.documentElement.style.getPropertyValue('--rm-dock-h'));
    ok(parseFloat(aberto) > 40 && parseFloat(fechado) === 0, `celular 390: aberta reserva ${aberto}; fechada devolve 0 (${fechado})`, { aberto, fechado });
    await ctx.close();
  }

  /* ============ D · trocar de bloco/modo com a toolbox aberta, lápis armado e traço recém-feito ============ */
  sec('D · troca repetida de bloco/modo: tinta preservada (mesmos ids, mesmo d), sem duplicar, sem escrever, toolbox aberta, tinta alinhada na volta');
  for (const [w, h, rot, touch] of [[1440, 900, '1440', false], [768, 1024, '768', true], [390, 844, '390', true]]) {
    const { ctx, page, errs } = await abrir(br, base, midia, 'novo', { w, h, touch });
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true); const pts = B.gesto('rapido', r); const { send } = await cdpPen(ctx, page);
    await page.evaluate(() => { window.__writes = []; });
    await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 }); await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
    for (let k = 1; k < 70; k++) { await send('mouseMoved', pts[k][0], pts[k][1], { button: 'left', buttons: 1, force: .5 }); await new Promise(o => setTimeout(o, 5)); }
    await send('mouseReleased', pts[69][0], pts[69][1], { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(700);
    const snap = () => page.evaluate(() => [...document.querySelectorAll('#rm2-ink path[data-ink]')].map(p => p.getAttribute('data-ink') + '|' + p.getAttribute('d')));
    const antes = await snap(); const w0 = await page.evaluate(() => window.__writes.length);
    ok(antes.length >= 1, `${rot}: 1+ traço criado antes das trocas (${antes.length})`);
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.RMNav.go({ view: 'modeidx', mode: 'preguntas' })); await page.waitForTimeout(500);
      await page.evaluate(() => window.RMNav.go({ view: 'modeblk', mode: 'preguntas', block: 's2-b04' })); await page.waitForTimeout(500);
      await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b05' })); await page.waitForTimeout(500);
      await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b04' })); await page.waitForTimeout(700);
    }
    const depois = await snap(); const w1 = await page.evaluate(() => window.__writes.length);
    ok(JSON.stringify(antes) === JSON.stringify(depois), `${rot}: depois de 16 trocas os traços são os MESMOS (ids e d idênticos, sem duplicar nem perder; ${antes.length} → ${depois.length})`, { antes: antes.length, depois: depois.length });
    ok(w1 === w0, `${rot}: trocar de bloco/modo não grava nada (${w0} → ${w1} escritas)`);
    ok(await ABERTA(page), `${rot}: a toolbox continua aberta (sem fechamento manual)`);
    const st = await page.evaluate(() => window.RMNav.estado());
    ok(st.view === 'block' && st.block === 's2-b04', `${rot}: terminou no bloco certo`, st);
    await LI.trazerTinta(page, 's2-b04').catch(() => {});
    await page.waitForTimeout(500);
    const m = await LI.medir(page); ok(!m || m.n === 0 || m.desvio === null || m.desvio <= 2.5 || !m.nAncoraVisivel, `${rot}: tinta alinhada à âncora na volta (desvio ${m && m.desvio === null ? 'n/d' : m && m.desvio && m.desvio.toFixed(1)} px)`, m);
    ok(errs.length === 0, `${rot}: 0 erros JS`, errs);
    await ctx.close();
  }

  /* ============ E · escrever depois das trocas, em texto/tabela/post-it, sem perder pontos ============ */
  sec('E · escrita rápida e longa em parágrafo · tabela · post-it, toolbox aberta, pós-trocas (mouse/pen emulado; 1440 e celular 390)');
  for (const [w, h, rot, mobile] of [[1440, 900, '1440', false], [390, 844, '390', true]]) for (const alvo of ['paragrafo', 'tabela', 'postit']) for (const gn of ['rapido', 'longo']) {
    const rr = await B.bench(br, base, midia, 'novo', { w, h, gesto: gn, alvo, toolbox: true, throttle: 1, mobile, scale: mobile ? 2 : 1 });
    ok(rr.perdas.perdidos === 0 && rr.perdas.tracos >= 1, `${rot} · ${alvo} · ${gn}: 0 pontos perdidos, traço criado (máx ${rr.perdas.maxDist && rr.perdas.maxDist.toFixed(2)} px, traços ${rr.perdas.tracos})`, rr.perdas);
    ok(rr.erros === 0, `${rot} · ${alvo} · ${gn}: 0 erros JS`);
  }

  /* ============ F · diagnóstico opt-in: só números, só com o painel aberto ============ */
  sec('F · diagnóstico de rendimento (opt-in): desligado = custo zero; aberto = tempos e pointercancel; fechado = apaga; nunca texto/coordenadas/dados pessoais');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, 'novo', { w: 1440, h: 900 });
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true); const pts = B.gesto('rapido', r); const { send } = await cdpPen(ctx, page);
    const off = await page.evaluate(() => ({ perf: window.RMToolsV2._test.perf ? window.RMToolsV2._test.perf() : null, painel: !!document.querySelector('.rm2-diag') }));
    ok(off.perf === null && !off.painel, 'diagnóstico fechado: nenhuma medição ativa (custo zero)', off);
    await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(300);
    const on = await page.evaluate(() => ({ perf: !!(window.RMToolsV2._test.perf && window.RMToolsV2._test.perf()), painel: !!document.querySelector('.rm2-diag'), copiar: !!document.querySelector('.rm2-diag [data-d="copy"]'), p: !!document.querySelector('.rm2-diag-p') }));
    ok(on.perf && on.painel && on.copiar && on.p, 'abrir o painel liga a medição e mostra o botão «Copiar resumen»', on);
    for (let t = 0; t < 2; t++) {
      await send('mouseMoved', pts[0][0], pts[0][1] + t * 10, { buttons: 0 }); await send('mousePressed', pts[0][0], pts[0][1] + t * 10, { button: 'left', buttons: 1, clickCount: 1, force: .5 });
      for (let k = 1; k < 50; k++) { await send('mouseMoved', pts[k][0], pts[k][1] + t * 10, { button: 'left', buttons: 1, force: .5 }); await new Promise(o => setTimeout(o, 5)); }
      await send('mouseReleased', pts[49][0], pts[49][1] + t * 10, { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(400);
    }
    await page.evaluate(() => window.RMNav.go({ view: 'modeidx', mode: 'preguntas' })); await page.waitForTimeout(900);
    await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b04' })); await page.waitForTimeout(1200);
    const lin = await page.evaluate(() => window.RMToolsV2._test.perfLinhas ? window.RMToolsV2._test.perfLinhas() : []);
    const txt = lin.join('\n');
    ok(/traço 1 \[pen\] pointerdown [\d.]+ ms/.test(txt) && /traço 2/.test(txt), 'mostra tempo de pointerdown, 1.º quadro, fila, quadros e pointerup de cada traço', lin.slice(0, 4));
    ok(/pointercancel: caneta \d+/.test(txt) && /captura perdida/.test(txt), 'mostra contagem de pointercancel e de captura perdida', lin);
    ok(/troca 1: .* até o 2\.º quadro \d+ ms/.test(txt), 'mostra o tempo das trocas de modo/bloco até o 2.º quadro', lin.filter(l => /^troca/.test(l)));
    ok(!/<[a-z\/]|https?:|@/i.test(txt), 'o resumo não carrega HTML, URL nem e-mail', txt.slice(0, 200));
    const palavras = await page.evaluate(() => { const sec = document.getElementById('s2-b04'); return [...sec.querySelectorAll('p')].slice(0, 6).map(p => p.textContent.trim().split(/\s+/).slice(0, 4).join(' ')).filter(x => x.length > 12); });
    ok(palavras.length > 0 && palavras.every(f => !txt.includes(f)), 'nenhum trecho do texto da matéria aparece no resumo', palavras.slice(0, 2));
    ok(!/\b(clientX|clientY|\d{3,4}\s*,\s*\d{3,4})\b/.test(txt), 'sem coordenadas no resumo');
    const arm = await page.evaluate(() => { const ks = []; try { for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); } catch (e) {} return ks.filter(k => /diag|perf|rendimiento/i.test(k)); });
    ok(arm.length === 0, 'nada do diagnóstico em localStorage', arm);
    await page.evaluate(() => window.RMToolsV2.fecharDiag()); await page.waitForTimeout(200);
    const fim = await page.evaluate(() => ({ perf: window.RMToolsV2._test.perf ? window.RMToolsV2._test.perf() : null, painel: !!document.querySelector('.rm2-diag') }));
    ok(fim.perf === null && !fim.painel, 'fechar o painel desliga a medição e apaga os números', fim);
    ok(errs.length === 0, '0 erros JS', errs);
    await ctx.close();
  }

  /* ============ G · gate do 2.º testador (pen do servidor), sem UID no código ============ */
  sec('G · pen:true do servidor dá os refinamentos do piloto físico ao 2.º testador (sem UID no código); pen:false/ausente = como hoje');
  for (const [rot, uid, pen, esperado] of [['José (UID da V2, pen ausente)', L.JOSE, false, true], ['2.º testador beta, pen:true do servidor', BETA2, true, true], ['2.º testador beta, pen:false', BETA2, false, false]]) {
    const { ctx, page, errs } = await abrir(br, base, midia, 'novo', { w: 1024, h: 768, touch: true, uid, pen });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await page.waitForTimeout(200);     // #456 iPad: os ouvintes de toque só existem com lápis/goma armados
    const g = await page.evaluate(() => ({ piloto: window.RMToolsV2._test.pilotoPermitido(), adaptador: window.RMToolsV2._test.adaptadorLigado ? window.RMToolsV2._test.adaptadorLigado() : null, flag: window.RMPilot && window.RMPilot.penLiberada && window.RMPilot.penLiberada(), classe: document.body.classList.contains('rm2-pilot-guard'), diagBtn: !!document.querySelector('.rm2-btn[data-a="diag"]:not(.rm2-piloto-off)') }));
    ok(g.piloto === esperado, `${rot}: pilotoPermitido=${esperado} (medido ${g.piloto})`, g);
    ok(g.adaptador === esperado, `${rot}: adaptador de Touch Events (lápis armado) ${esperado ? 'registrado' : 'NÃO registrado'} (medido ${g.adaptador})`, g);
    ok(g.classe === esperado && g.diagBtn === esperado, `${rot}: guarda de toque e botão do diagnóstico ${esperado ? 'ativos' : 'ausentes'}`, g);
    ok(g.flag === pen, `${rot}: RMPilot.penLiberada()=${pen} (só reflete a resposta do servidor)`, g);
    ok(errs.length === 0, `${rot}: 0 erros JS`, errs);
    await ctx.close();
  }
  {
    /* outra matéria: a flag pen NÃO vale fora de Semiología II */
    const { ctx, page } = await abrir(br, base, midia, 'novo', { w: 1024, h: 768, uid: BETA2, pen: true });
    const fora = await page.evaluate(() => { const antes = window.RMToolsV2._test.pilotoPermitido(); const t = window.RMTools; const orig = t.slugDoTab; t.slugDoTab = () => 'biologia'; const depois = window.RMToolsV2._test.pilotoPermitido(); t.slugDoTab = orig; return { antes, depois }; });
    ok(fora.antes === true && fora.depois === false, 'pen:true vale só em Semiología II (em outra matéria pilotoPermitido=false)', fora);
    await ctx.close();
  }

  /* ============ H · build visível, A/B «sin guarda», acesso: aluno comum não vê nada ============ */
  sec('H · build visível só no piloto · A/B «Sin guarda» · diagnóstico mostra o acesso/flags · aluno comum: nada monta');
  {
    const { ctx, page, errs } = await abrir(br, base, midia, 'novo', { w: 1024, h: 768, touch: true });
    await page.waitForTimeout(500);
    const semFixo = await page.evaluate(() => !document.getElementById('rm2-build'));
    const botaoCaixa = await page.evaluate(() => { const t = document.querySelector('.rm-sis-tools'); return t && getComputedStyle(t).display !== 'none' ? '.rm-sis-tools' : '#rm2-fab'; });
    await page.click(botaoCaixa, { force: true }); await page.waitForTimeout(250);
    const toast = await page.evaluate(() => { const t = document.querySelector('.rm-toast'); return t && t.classList.contains('on') ? t.textContent : null; });
    ok(semFixo && toast === 'caneta #456 · build 2026-10-10·456d', 'ao ABRIR a caixa o piloto vê o build num aviso passageiro (.rm-toast) e NENHUM elemento fixo novo fica sobre a leitura: ' + toast, { semFixo, toast });
    await page.click(botaoCaixa, { force: true }); await page.waitForTimeout(250);
    await B.prepararAlvo(page, 'novo', 'paragrafo', true);
    await page.evaluate(() => window.RMToolsV2.abrirDiag()); await page.waitForTimeout(300);
    const d1 = await page.evaluate(() => ({ btn: (document.querySelector('.rm2-diag [data-d="guarda"]') || {}).textContent, linhas: window.RMToolsV2._test.perfLinhas().slice(0, 2).join(' | '), classe: document.body.classList.contains('rm2-pilot-guard') }));
    ok(d1.btn === 'Sin guarda: no' && d1.classe, 'com o painel aberto o botão «Sin guarda» começa desligado e a guarda está ativa', d1);
    ok(/build=2026-10-10·456d/.test(d1.linhas) && /acesso à V2: lista beta no código/.test(d1.linhas) && /piloto físico: sim \(conta do piloto no código\)/.test(d1.linhas) && /flags do servidor: layout=true visual=true pen=false/.test(d1.linhas) && !/d4d215d3|448e4d63/.test(d1.linhas), 'o diagnóstico informa build, via de acesso e flags (sem UID)', d1.linhas);
    const nTr0 = await page.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
    await page.click('.rm2-diag [data-d="guarda"]'); await page.waitForTimeout(250);
    ok(await page.evaluate(n => document.querySelectorAll('#rm2-ink path[data-ink]').length === n && !window.RMToolsV2._test.temTraco(), nTr0), 'com o lápis armado, tocar o botão do painel NÃO começa um traço por baixo dele');
    const d2 = await page.evaluate(() => ({ btn: document.querySelector('.rm2-diag [data-d="guarda"]').textContent, classe: document.body.classList.contains('rm2-pilot-guard'), linhas: window.RMToolsV2._test.perfLinhas().join(' | ') }));
    ok(d2.btn === 'Sin guarda: sí' && !d2.classe && /teste sem guarda: LIGADO/.test(d2.linhas), '«Sin guarda: sí» desliga a guarda (regra legada) e o painel informa', d2);
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', false).catch(() => null);
    const { send } = await cdpPen(ctx, page); const pts = B.gesto('rapido', r || await page.evaluate(() => { const b = window.__alvoEl.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }));
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
    await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 }); await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
    for (let k = 1; k < 6; k++) { await send('mouseMoved', pts[k][0], pts[k][1], { button: 'left', buttons: 1, force: .5 }); await page.waitForTimeout(8); }
    const leg = await page.evaluate(() => ({ down: document.body.classList.contains('rm2-pen-down'), ta: getComputedStyle(document.getElementById('materias-container')).touchAction, guarda: getComputedStyle(document.getElementById('rm2-penguard')).display }));
    ok(leg.down && leg.ta === 'none' && leg.guarda === 'none', 'sem guarda: durante o contato vale a regra LEGADA (touch-action:none no contêiner) e a guarda não aparece', leg);
    await send('mouseReleased', pts[5][0], pts[5][1], { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(300);
    await page.click('.rm2-diag [data-d="guarda"]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.body.classList.contains('rm2-pilot-guard')), 'ligar de novo restaura a guarda');
    await page.evaluate(() => window.RMToolsV2.fecharDiag()); await page.waitForTimeout(200);
    ok(errs.length === 0, '0 erros JS', errs);
    await ctx.close();
  }
  for (const [rot, uid, pen, chipEsp] of [['2.º testador (lista beta do código) SEM pen', BETA2, false, false], ['2.º testador COM pen:true do servidor', BETA2, true, true], ['aluno comum (UID qualquer, fora de qualquer lista)', '11111111-2222-4333-8444-555555555555', true, false]]) {
    const { ctx, page, errs } = await abrir(br, base, midia, 'novo', { w: 1024, h: 768, touch: true, uid, pen });
    await page.waitForTimeout(600);
    const g = await page.evaluate(() => ({ v2: !!window.RMToolsV2, montado: !!document.querySelector('.rm2-box'), guardaEl: !!document.getElementById('rm2-penguard'), build: window.RMToolsV2 && window.RMToolsV2.build, piloto: window.RMToolsV2 ? window.RMToolsV2._test.pilotoPermitido() : false }));
    if (rot.startsWith('aluno comum')) ok(!g.v2 || (!g.montado && !g.guardaEl), `${rot}: a V2 NÃO monta (nenhuma toolbox nem guarda) mesmo que o servidor devolvesse pen:true — o acesso à caneta continua só pela lista beta`, g);
    else {
      const bt = await page.evaluate(() => { const t = document.querySelector('.rm-sis-tools'); return t && getComputedStyle(t).display !== 'none' ? '.rm-sis-tools' : '#rm2-fab'; });
      await page.click(bt, { force: true }); await page.waitForTimeout(250);
      const toast = await page.evaluate(() => { const t = document.querySelector('.rm-toast'); return t && t.classList.contains('on') && /build/.test(t.textContent) ? t.textContent : null; });
      ok(g.montado && !!toast === chipEsp && g.piloto === chipEsp, `${rot}: toolbox ${g.montado ? 'monta' : 'não monta'}; aviso do build ao abrir a caixa ${chipEsp ? 'aparece' : 'ausente'} (medido ${toast}); piloto físico=${chipEsp}`, { g, toast });
    }
    ok(errs.length === 0, `${rot}: 0 erros JS`, errs);
    await ctx.close();
  }

  await br.close(); srv.close();
  console.log(`\ncaneta-456: ${n - ko}/${n} verificações OK` + (ko ? ` — ${ko} FALHAS` : ''));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
