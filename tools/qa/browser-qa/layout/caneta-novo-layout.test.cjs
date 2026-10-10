/* CANETA no novo layout (issue #456) — regressão do atraso/perda de traço de Semiología II.
   Semiología II REAL + shell real + caneta V2 REAL (rm-tools-v2.js) + tema + navegação + motor de áudio REAL. Os gestos usam a pipeline REAL do Chromium
   (CDP Input.dispatchMouseEvent com pointerType:'pen' → pointerdown/move/up reais, hit-test, touch-action, coalescing); só o servidor é simulado (0 rede, 0 escrita real).
   CAUSAS medidas na #456 (pen-bench.cjs; números antes/depois em capturas-sistema/caneta-456/):
     1. o espelho da toolbox (rm-materia-sistema.js, `sync`) lia layout (getComputedStyle + getBoundingClientRect) a CADA reescrita de `aria-expanded` do FAB — e a V2 reescreve
        a cada traço (`refletir()`), com o painel aberto (lápis armado o mantém aberto) ⇒ estilo+layout síncronos de ~16 mil nós no pointerup (~80 ms a 4× de CPU);
     2. rm-audio.css: `body:has(.rm-audio[data-mode="bottom"]…)` — com o player em modo lateral (o do piloto) nunca casa e o Chromium varre o documento inteiro a CADA
        mutação do <body> (traço, classes rm2-pen-down/rm2-drawing, tick do player 4×/s): ~3,5 ms por mutação a 4×;
     3. `rm-sis-aud-dot` animava background-size (repinta na thread principal enquanto o áudio toca).
   O que se prova:
     A  estático: nenhum :has() do rm-audio.css varre o documento (só combinadores de filho) e as 2 regras de fallback seguem; a animação do ponto só mexe em opacidade;
     B  durante traços com toolbox aberta + lápis armado + áudio tocando, o tema NÃO faz nenhuma leitura de layout nem escreve --rm-dock-h; o espelho da toolbox segue certo
        (aberta/armada/altura do dock no celular);
     C  fidelidade: parágrafo · tabela · post-it × escrita rápida · traço longo × layout antigo · layout · novo: 1 traço por gesto, 0 pontos perdidos, âncora = elemento escrito,
        gravação (insert) pelo motor; rajada SEM esperar ack (como um digitalizador real): 0 perdidos;
     D  áudio tocando durante a escrita: nenhum pointercancel/blur/resize, o áudio segue, 1 mídia;
     E  troca de bloco com traço: volta ao bloco com o MESMO traço, sem duplicar, sem escrever;
     F  mouse desenha; dedo com a caneta armada NÃO desenha (rola);
     G  390 · 768 · 1024 · 1440: toolbox pela UI, traço, 0 perdidos, sem overflow;
     H  custo do tick do player (timeupdate → render) no novo ≤ 3× o do layout sem tema.
   Uso:  RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/caneta-novo-layout.test.cjs                                                                                       */
const fs = require('fs'), path = require('path');
const L = require('./lib-player.cjs');
const B = require('./pen-bench.cjs');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = (t) => console.log('\n▸ ' + t);
const SITE = path.resolve(__dirname, '../../../../Repasso-Med-Site--main/Atual - Copia/assets');

/* contadores injetados antes de qualquer script da página */
const INIT = () => {
  window.__c = { on: false, layoutSistema: 0, dockWrites: 0, ev: {} };
  const dentro = () => { try { return /rm-materia-sistema/.test(new Error().stack || ''); } catch (e) { return false; } };
  const gbc = Element.prototype.getBoundingClientRect; Element.prototype.getBoundingClientRect = function () { if (window.__c.on && dentro()) window.__c.layoutSistema++; return gbc.apply(this, arguments); };
  const gcs = window.getComputedStyle; window.getComputedStyle = function () { if (window.__c.on && dentro()) window.__c.layoutSistema++; return gcs.apply(this, arguments); };
  const sp = CSSStyleDeclaration.prototype.setProperty; CSSStyleDeclaration.prototype.setProperty = function (k) { if (window.__c.on && k === '--rm-dock-h' && dentro()) window.__c.dockWrites++; return sp.apply(this, arguments); };
  ['pointercancel', 'blur', 'resize', 'visibilitychange'].forEach(t => window.addEventListener(t, () => { if (window.__c.on) window.__c.ev[t] = (window.__c.ev[t] || 0) + 1; }, true));
  /* custo do tick do player: tempo do handler de timeupdate do motor (rm-audio.js) */
  window.__tu = []; const ae = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t, f, c) { if (t === 'timeupdate' && typeof f === 'function') { const w = function (e) { const a = performance.now(); const r = f.call(this, e); window.__tu.push(performance.now() - a); return r; }; return ae.call(this, t, w, c); } return ae.call(this, t, f, c); };
};

const abrir = (br, base, midia, nome, o = {}) => L.abrir(br, base, midia, Object.assign({ w: 1440, h: 900, initScript: INIT }, B.CFG[nome], o));
const ancoraOk = (page) => page.evaluate(() => {
  const ps = [...document.querySelectorAll('#rm2-ink svg[data-anchor] path[data-ink]')]; const p = ps[ps.length - 1]; if (!p) return { n: 0 };
  const sv = p.closest('svg'), a = sv.getAttribute('data-anchor').split('>'), s = document.getElementById(a[0]);
  const el = a[1] !== undefined ? [...s.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(x => !x.closest('[data-rm-ui]'))[+a[1]] : s;
  return { n: ps.length, anchor: sv.getAttribute('data-anchor'), tag: el && el.tagName, d: p.getAttribute('d') };
});
const insertsGravados = (page) => page.evaluate(() => (window.__writes || []).filter(w => /insert:user_ink_strokes/.test(w)).length);
const pontoNoAlvo = (page, x, y) => page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName : null; }, [x, y]);

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia();
  const br = await chromium.launch();

  /* =============================== A · estático =============================== */
  sec('A · estático: nenhum :has() do rm-audio.css varre o documento; a animação do ponto só usa opacidade');
  {
    const css = fs.readFileSync(path.join(SITE, 'rm-audio.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const has = [...css.matchAll(/:has\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g)].map(m => m[1].trim());
    ok(has.length >= 2 && has.every(a => /^>/.test(a) && !/\.rm-audio[^>]*\s+\.rm-audio/.test(a)), `todo :has() do rm-audio.css começa por «>» (só combinadores de filho) — ${has.length} ocorrências`, has);
    ok(has.every(a => /^>\s*(body\s*>\s*)?#rm-l2-player\s*>\s*\.rm-audio/.test(a)), 'e é ancorado no slot #rm-l2-player > .rm-audio (filho direto do <body>/do slot)', has);
    ok(/html:not\(\[data-rm-dock\]\) body:has\(/.test(css) && /scroll-padding-bottom: var\(--rm-audio-h/.test(css) && /padding-bottom: var\(--rm-audio-h/.test(css), 'as 2 regras de reserva do fallback (sem B1) continuam, com a mesma declaração');
    const sis = fs.readFileSync(path.join(SITE, 'rm-materia-sistema.css'), 'utf8');
    const kf = /@keyframes rm-sis-aud-dot\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/.exec(sis);
    ok(kf && /opacity/.test(kf[1]) && !/background-size|width|height|box-shadow/.test(kf[1]), '@keyframes rm-sis-aud-dot só anima opacidade (compositor, não repinta o player na thread principal)', kf && kf[1]);
    ok(!/\.rm-audio-card__ico::before \{ animation: rm-sis-vinyl/.test(sis) || /@keyframes rm-sis-vinyl \{ to \{ transform: rotate/.test(sis), '@keyframes rm-sis-vinyl só gira por transform (compositor)');
  }

  /* =============================== B · o tema não força layout durante a escrita =============================== */
  sec('B · toolbox aberta + lápis armado + áudio tocando: nenhuma leitura de layout nem escrita de --rm-dock-h pelo tema durante 4 traços');
  for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
    const { ctx, page, errs } = await abrir(br, base, midia, 'novo', { w, h, touch: mob, isMobile: mob, scale: mob ? 2 : 1, seedmany: 60 });
    await page.evaluate(B.INSTR);
    await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b01' })); await page.waitForTimeout(1200); await L.tocar(page, 's2-b01-motivo');
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true);
    ok(r.tool === 'pen' && r.toolboxAberta, `${w}×${h}: fluxo real — toolbox aberta pela UI, lápis escolhido, painel segue aberto (tool=${r.tool})`, r);
    const antes = await page.evaluate(() => ({ dock: document.documentElement.style.getPropertyValue('--rm-dock-h'), tools: document.documentElement.getAttribute('data-rm-tools'), exp: document.querySelector('.rm-sis-tools') && document.querySelector('.rm-sis-tools').getAttribute('aria-expanded') }));
    await page.evaluate(() => { window.__c.on = true; window.__c.layoutSistema = 0; window.__c.dockWrites = 0; window.__c.ev = {}; });
    for (let k = 0; k < 4; k++) { const rr = await page.evaluate(() => { const b = window.__alvoEl.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }); await B.desenhar(ctx, page, B.gesto('rapido', rr), 2, 1); await page.waitForTimeout(250); }
    const c = await page.evaluate(() => { window.__c.on = false; return window.__c; });
    const depois = await page.evaluate(() => ({ dock: document.documentElement.style.getPropertyValue('--rm-dock-h'), tools: document.documentElement.getAttribute('data-rm-tools'), exp: document.querySelector('.rm-sis-tools') && document.querySelector('.rm-sis-tools').getAttribute('aria-expanded') }));
    ok(c.layoutSistema === 0, `${w}×${h}: 0 leituras de layout (getComputedStyle/getBoundingClientRect) feitas por rm-materia-sistema.js durante os 4 traços (${c.layoutSistema})`, c);
    ok(c.dockWrites === 0, `${w}×${h}: 0 escritas de --rm-dock-h durante os traços`, c);
    ok(JSON.stringify(antes) === JSON.stringify(depois), `${w}×${h}: o espelho da toolbox não mudou com os traços (data-rm-tools · aria-expanded · --rm-dock-h)`, { antes, depois });
    ok(!c.ev.pointercancel && !c.ev.blur && !c.ev.resize && !c.ev.visibilitychange, `${w}×${h}: nenhum pointercancel/blur/resize/visibilitychange durante a escrita (interrupções abortariam o traço)`, c.ev);
    /* o espelho continua certo: fechar e abrir a toolbox */
    const toggle = mob ? '.rm-sis-tools' : '#rm2-fab';
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await page.waitForTimeout(300);
    const aberto = await page.evaluate(() => document.querySelector('.rm2-box').classList.contains('open'));
    if (aberto) { await page.click(toggle, { force: true }); await page.waitForTimeout(500); }
    let e1 = await page.evaluate(() => ({ tools: document.documentElement.getAttribute('data-rm-tools'), dock: document.documentElement.style.getPropertyValue('--rm-dock-h'), open: document.querySelector('.rm2-box').classList.contains('open') }));
    ok(!e1.open && e1.tools === null && (e1.dock === '0px' || e1.dock === ''), `${w}×${h}: toolbox FECHADA ⇒ data-rm-tools ausente e --rm-dock-h = 0`, e1);
    await page.click(toggle, { force: true }); await page.waitForTimeout(600);
    e1 = await page.evaluate(() => { const b = document.querySelector('.rm2-box'); return { tools: document.documentElement.getAttribute('data-rm-tools'), dock: parseFloat(document.documentElement.style.getPropertyValue('--rm-dock-h')), h: Math.round(b.getBoundingClientRect().height), open: b.classList.contains('open'), exp: document.querySelector('.rm-sis-tools') && document.querySelector('.rm-sis-tools').getAttribute('aria-expanded') }; });
    /* #456 P0: --rm-dock-h só existe < 768 px (o CSS só o usa lá) — acima disso NÃO se escreve na raiz (cada mudança reaplicava o estilo da página inteira a cada ida e volta de modo) */
    const dockEsperado = (dock, h) => mob ? Math.abs(dock - h) <= 1 : (!dock || dock === 0);
    ok(e1.open && e1.tools === 'open' && dockEsperado(e1.dock, e1.h) && (!mob || e1.exp === 'true'), `${w}×${h}: toolbox ABERTA ⇒ data-rm-tools=open, --rm-dock-h ${mob ? '= altura da caixa' : '= 0 (sem dock fora do celular)'} (${e1.dock} · caixa ${e1.h})${mob ? ', botão da faixa aria-expanded=true' : ''}`, e1);
    /* a altura do dock acompanha a caixa quando ela muda de tamanho com o painel aberto (ResizeObserver) — sem depender de mudança de estado */
    const h0 = e1.h; await page.evaluate(() => { const b = document.querySelector('.rm2-box'); b.style.minHeight = (b.getBoundingClientRect().height + 40) + 'px'; }); await page.waitForTimeout(500);
    const e2 = await page.evaluate(() => ({ dock: parseFloat(document.documentElement.style.getPropertyValue('--rm-dock-h')), h: Math.round(document.querySelector('.rm2-box').getBoundingClientRect().height) }));
    ok(e2.h > h0 && dockEsperado(e2.dock, e2.h), `${w}×${h}: a caixa cresceu com o painel aberto ⇒ ${mob ? '--rm-dock-h acompanha' : '--rm-dock-h segue 0 (sem dock)'} (${h0} → ${e2.h}; dock ${e2.dock})`, e2);
    ok(errs.length === 0, `${w}×${h}: 0 erros JS`, errs);
    await ctx.close();
  }

  /* =============================== C · fidelidade do traço =============================== */
  sec('C · fidelidade: 1 traço por gesto, 0 pontos perdidos, âncora = elemento escrito, gravado pelo motor — antigo × layout × novo');
  for (const cfg of ['antigo', 'layout', 'novo']) {
    for (const alvo of ['paragrafo', 'tabela', 'postit']) {
      for (const gn of ['rapido', 'longo']) {
        const { ctx, page, errs } = await abrir(br, base, midia, cfg, { seedmany: 40 });
        await page.evaluate(B.INSTR);
        const r = await B.prepararAlvo(page, cfg, alvo, true);
        const n0 = await page.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length), w0 = await insertsGravados(page);
        const pts = B.gesto(gn, r);
        const alvoTag = await pontoNoAlvo(page, pts[0][0], pts[0][1]);
        await B.desenhar(ctx, page, pts, 2, 1); await page.waitForTimeout(1200);
        const per = await B.medirPerdas(page, pts), an = await ancoraOk(page);
        const n1 = an.n, w1 = await insertsGravados(page);
        ok(r.tool === 'pen' && n1 === n0 + 1 && per.perdidos === 0 && per.maxDist <= 1.6 && w1 === w0 + 1,
          `${cfg} · ${alvo} · ${gn}: 1 traço novo (${n0}→${n1}), ${per.perdidos}/${pts.length} pontos perdidos (máx ${per.maxDist && per.maxDist.toFixed(2)} px), gravado pelo motor (${w0}→${w1})`, { tool: r.tool, per, w0, w1 });
        const esperado = { paragrafo: 'P', tabela: 'TABLE', postit: null }[alvo];
        if (esperado) ok(an.tag === esperado, `${cfg} · ${alvo} · ${gn}: âncora = ${esperado} (${an.anchor})`, an);
        ok(errs.length === 0, `${cfg} · ${alvo} · ${gn}: 0 erros JS`, errs);
        await ctx.close();
      }
    }
  }
  { /* rajada sem esperar ack, como um digitalizador real */
    for (const cfg of ['antigo', 'novo']) {
      const { ctx, page } = await abrir(br, base, midia, cfg, { seedmany: 60 });
      await page.evaluate(B.INSTR);
      const r = await B.prepararAlvo(page, cfg, 'paragrafo', true);
      const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const send = (type, x, y, extra) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, extra));
      let perd = 0, tot = 0, pior = 0;
      for (let k = 0; k < 6; k++) {
        const x0 = r.x + 30 + k * 40, y0 = r.y + 10, pts = []; for (let i = 0; i < 40; i++) pts.push([x0 + Math.sin(i / 4) * 8 + i * 0.9, y0 + i * 2.0]);
        const ps = [send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 }), send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 })];
        for (let i = 1; i < pts.length; i++) ps.push(send('mouseMoved', pts[i][0], pts[i][1], { button: 'left', buttons: 1, force: .5 }));
        ps.push(send('mouseReleased', pts[39][0], pts[39][1], { button: 'left', buttons: 0, clickCount: 1 }));
        await Promise.all(ps); await page.waitForTimeout(350);
        const p = await B.medirPerdas(page, pts); perd += p.perdidos || 0; tot += pts.length; pior = Math.max(pior, p.maxDist || 0);
      }
      ok(perd === 0 && pior <= 1.6, `${cfg}: rajada de 6 traços (240 pontos) enviada SEM esperar o ack, CPU 4× mais lenta — 0 perdidos (pior ${pior.toFixed(2)} px)`, { perd, tot, pior });
      await ctx.close();
    }
  }

  /* =============================== D · áudio tocando durante a escrita =============================== */
  sec('D · áudio tocando durante a escrita: o áudio segue, 1 mídia, o traço sai inteiro');
  {
    const { ctx, page } = await abrir(br, base, midia, 'novo', { seedmany: 40 });
    await page.evaluate(B.INSTR);
    await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b01' })); await page.waitForTimeout(1200); await L.tocar(page, 's2-b01-motivo');
    const p0 = (await L.motor(page)).position;
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true);
    const pts = B.gesto('longo', r);
    await B.desenhar(ctx, page, pts, 3, 1); await page.waitForTimeout(800);
    const per = await B.medirPerdas(page, pts), m = await L.motor(page);
    const so = await page.evaluate(() => ({ tocando: (window.__media || []).filter(x => !x.paused).length, aud: document.querySelectorAll('.rm-audio').length }));
    ok(m && m.state === 'playing' && m.position > p0 && so.tocando === 1 && so.aud === 1, `o áudio seguiu tocando durante o traço (${p0.toFixed(1)}s → ${m && m.position.toFixed(1)}s), 1 mídia, 1 player`, { m, so });
    ok(per.perdidos === 0 && per.tracos >= 1, `…e o traço saiu inteiro (0 pontos perdidos de ${pts.length})`, per);
    await ctx.close();
  }

  /* =============================== E · troca de bloco com traço =============================== */
  sec('E · troca de bloco: o MESMO traço volta, sem duplicar e sem escrever');
  {
    const { ctx, page } = await abrir(br, base, midia, 'novo', { seedmany: 40 });
    await page.evaluate(B.INSTR);
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true);
    await B.desenhar(ctx, page, B.gesto('rapido', r), 2, 1); await page.waitForTimeout(1200);
    const a1 = await ancoraOk(page), w1 = await insertsGravados(page);
    await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b03' })); await page.waitForTimeout(1500);
    await page.evaluate(() => { const s = document.getElementById('s2-b03'); const p = [...s.querySelectorAll('p')].filter(x => !x.closest('[data-rm-ui]') && x.textContent.length > 150)[1]; window.RMLayout.irPara(p); window.__alvoEl = p; }); await page.waitForTimeout(1500);
    const rr = await page.evaluate(() => { const b = window.__alvoEl.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    const tool = await page.evaluate(() => window.RMToolsV2.estado.tool);
    await B.desenhar(ctx, page, B.gesto('rapido', rr), 2, 1); await page.waitForTimeout(1200);
    const w2 = await insertsGravados(page);
    await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b04' })); await page.waitForTimeout(1700);
    const vol = await page.evaluate(() => [...document.querySelectorAll('#rm2-ink path[data-ink]')].filter(p => !/^seed/.test(p.getAttribute('data-ink') || '') && p.closest('svg')).map(p => ({ a: p.closest('svg').getAttribute('data-anchor'), d: p.getAttribute('d'), disp: getComputedStyle(p.closest('svg')).display })));
    ok(tool === 'pen', 'a caneta continua armada ao trocar de bloco', tool);
    ok(w1 === 1 && w2 === 2, `uma gravação por traço (bloco 04: ${w1}, depois bloco 03: ${w2})`);
    ok(vol.filter(x => /^s2-b04>/.test(x.a)).length === 1 && vol.filter(x => /^s2-b03>/.test(x.a)).length === 1, 'cada traço existe UMA vez (0 duplicados)', vol.map(x => x.a));
    ok(vol.find(x => /^s2-b04>/.test(x.a)).d === a1.d && vol.find(x => /^s2-b04>/.test(x.a)).disp !== 'none' && vol.find(x => /^s2-b03>/.test(x.a)).disp === 'none', 'no bloco 04 o traço do 04 é IDÊNTICO ao de antes (mesmo d) e o do 03 fica oculto', vol);
    const w3 = await insertsGravados(page); ok(w3 === w2, 'a navegação não gravou nada (0 escritas)', { w2, w3 });
    await ctx.close();
  }

  /* =============================== F · mouse e dedo =============================== */
  sec('F · mouse desenha; dedo com a caneta armada NÃO desenha (a página rola)');
  {
    const { ctx, page } = await abrir(br, base, midia, 'novo', { w: 768, h: 1024, touch: true, isMobile: true, scale: 2 });
    await page.evaluate(B.INSTR);
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', false);
    const cdp = await ctx.newCDPSession(page);
    const n0 = await page.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length), y0 = await page.evaluate(() => scrollY);
    const x = r.x + 60, y = r.y + 30;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + i * 10 }] }); await new Promise(o => setTimeout(o, 12)); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(500);
    const n1 = await page.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
    ok(n1 === n0, `dedo com o lápis armado: nenhum traço criado (${n0}→${n1})`);
    const send = (type, px, py, extra) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x: px, y: py, pointerType: 'mouse' }, extra));
    const rr = await page.evaluate(() => { const b = window.__alvoEl.getBoundingClientRect(); return { x: b.left, y: b.top }; });
    await send('mouseMoved', rr.x + 40, rr.y + 20, { buttons: 0 }); await send('mousePressed', rr.x + 40, rr.y + 20, { button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 30; i++) await send('mouseMoved', rr.x + 40 + i * 4, rr.y + 20 + Math.sin(i / 3) * 6, { button: 'left', buttons: 1 });
    await send('mouseReleased', rr.x + 160, rr.y + 20, { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(700);
    const n2 = await page.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
    ok(n2 === n0 + 1, `mouse com o lápis armado: 1 traço criado (${n0}→${n2})`);
    await ctx.close();
  }

  /* =============================== G · larguras =============================== */
  sec('G · 390 · 768 · 1024 · 1440 (toolbox pela UI): traço inteiro, gravado, sem overflow');
  for (const [w, h] of [[390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    const mob = w < 900;
    const { ctx, page, errs } = await abrir(br, base, midia, 'novo', { w, h, touch: mob, isMobile: mob, scale: mob ? 2 : 1, seedmany: 40 });
    await page.evaluate(B.INSTR);
    const r = await B.prepararAlvo(page, 'novo', 'paragrafo', true);
    const pts = B.gesto('rapido', r), w0 = await insertsGravados(page);
    await B.desenhar(ctx, page, pts, 2, 1); await page.waitForTimeout(1200);
    const per = await B.medirPerdas(page, pts), w1 = await insertsGravados(page);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    ok(r.tool === 'pen' && per.perdidos === 0 && w1 === w0 + 1 && sw, `${w}×${h}: toolbox aberta, lápis, ${per.perdidos}/${pts.length} perdidos, gravado (${w0}→${w1}), sem overflow horizontal`, { tool: r.tool, per, sw });
    ok(errs.length === 0, `${w}×${h}: 0 erros JS`, errs);
    await ctx.close();
  }

  /* =============================== H · custo do tick do player =============================== */
  sec('H · tick do player (timeupdate → render) no novo ≤ 3× o do layout sem tema (antes da correção: 3,5–5×; depois: ~2×)');
  {
    const med = {};
    for (const cfg of ['layout', 'novo']) {
      const { ctx, page } = await abrir(br, base, midia, cfg, { seedmany: 150 });
      if (cfg === 'novo') await page.evaluate(() => window.RMNav.go({ view: 'block', block: 's2-b01' })); await page.waitForTimeout(1200); await L.tocar(page, 's2-b01-motivo');
      const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => { window.__tu.length = 0; }); await page.waitForTimeout(8000);
      const v = await page.evaluate(() => window.__tu.slice().sort((a, b) => a - b));
      med[cfg] = v[Math.floor(v.length / 2)]; med[cfg + 'N'] = v.length;
      await ctx.close();
    }
    ok(med.layoutN >= 8 && med.novoN >= 8 && med.novo <= med.layout * 3 + 2, `render por tick (4× CPU): layout ${med.layout.toFixed(1)} ms · novo ${med.novo.toFixed(1)} ms (razão ${(med.novo / med.layout).toFixed(1)}×)`, med);
  }

  await br.close(); srv.close();
  console.log(`\ncaneta-novo-layout: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
