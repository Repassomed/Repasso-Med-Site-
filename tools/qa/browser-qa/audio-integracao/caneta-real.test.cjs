#!/usr/bin/env node
/* Audiobook × CANETA REAL × LAYOUT V2 REAL.
   Carrega os arquivos reais do repositório — rm-tools.js, rm-tools-v2.js (toolbox, caneta, âncoras), rm-layout.js/css, rm-modes.js,
   rm-audio-boot.js e o motor — numa página com a matéria Semiología II real. Só o «Supabase» é um fake em memória (subconjunto do PostgREST
   que a caneta usa) e o áudio é mp3/ogg sintético (o Chromium do Playwright não decodifica AAC): isto prova a CONVIVÊNCIA do código real,
   NÃO o áudio real, NÃO o tablet e NÃO o banco real. Variáveis: RM_B1_DIR (outra versão do Layout, p.ex. a #425), RM_PLAYWRIGHT. */
'use strict';
const path = require('path');
process.env.RM_B1_DIR = process.env.RM_B1_DIR || path.resolve(__dirname, '..', '..', '..', '..', 'Repasso-Med-Site--main', 'Atual - Copia', 'assets');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { iniciar } = require('./server.cjs');

let okN = 0, koN = 0; const falhas = [];
const ok = (c, n, x) => { if (c) okN++; else { koN++; falhas.push(n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);
const esp = ms => new Promise(r => setTimeout(r, ms));
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1 : e);
const AID = 's2-b01-motivo';
const RELATORIO = [];

async function nova(S, browser, w, h, o) {
  o = o || {};
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: w || 1440, height: h || 900 }, deviceScaleFactor: o.dsf || 1 });
  const page = await ctx.newPage(); const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|403|404|net::/.test(m.text())) erros.push(m.text().slice(0, 200)); });
  await page.addInitScript(() => { window.__m = { audioCtor: 0, srcSets: [] }; const A0 = window.Audio; window.Audio = function () { window.__m.audioCtor++; return new (Function.prototype.bind.apply(A0, [null].concat([].slice.call(arguments))))(); }; window.Audio.prototype = A0.prototype; });
  await page.goto(S.base + '/h?pen=1&real=1');
  await page.waitForFunction(() => window.RMToolsV2 && window.RM_STUDY_V2_ACTIVE && document.querySelector('#tab-semio2 section[id]'));
  await esp(300);
  return { ctx, page, erros };
}
const attach = p => p.evaluate(() => window.RMLayout.attach(document.getElementById('tab-semio2')));
async function boot(p) { await attach(p); if (!(await p.evaluate(() => !!window.RMAudioBoot))) await p.addScriptTag({ url: '/assets/rm-audio-boot.js?v=t' }); return p.evaluate(() => window.RMAudioBoot.start()); }
const E = p => p.evaluate(() => { const e = window.RMAudioBoot._engine(); return e ? e.getState() : null; });
const audio = p => p.evaluate(() => { const a = Array.from(document.querySelectorAll('audio')).concat(window.__m.audios || [])[0]; return null; });
const card = (p, id) => p.locator(`.rm-audio-card[data-audio-id="${id}"] .rm-audio-card__btn`);
const ate = async (p, fn, arg, t) => { try { await p.waitForFunction(fn, arg, { timeout: t || 8000 }); return true; } catch (e) { return false; } };
/* o elemento <audio> do motor não está no DOM: lê-se pelo estado do motor (currentTime) */
const tocando = p => p.evaluate(() => { const s = window.RMAudioBoot._engine().getState(); return { state: s.state, t: s.position }; });

/* traço de caneta REAL (PointerEvents pointerType 'pen' sobre o conteúdo; o rm-tools-v2.js real faz o resto) */
async function tracar(p, sel, n) {
  return p.evaluate(async ([sel, n]) => {
    const el = document.querySelector(sel); el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise(r => setTimeout(r, 250));
    const r = el.getBoundingClientRect(), out = { n: 0, prevented: 0 };
    if (window.RMToolsV2.estado && window.RMToolsV2.estado.tool !== 'pen') window.RMToolsV2.escolherFerramenta('pen');
    const fire = (type, x, y, b) => { const e = new PointerEvent(type, { pointerType: 'pen', pointerId: 77, isPrimary: true, clientX: x, clientY: y, buttons: b, bubbles: true, cancelable: true, pressure: b ? 0.5 : 0 }); el.dispatchEvent(e); out.n++; if (e.defaultPrevented) out.prevented++; };
    for (let k = 0; k < (n || 1); k++) {
      const oy = 10 + k * 18;
      fire('pointerover', r.left + 40, r.top + oy, 0); fire('pointerdown', r.left + 40, r.top + oy, 1);
      for (let i = 1; i <= 16; i++) { fire('pointermove', r.left + 40 + i * 6, r.top + oy + i * 2, 1); await new Promise(rs => setTimeout(rs, 15)); }
      fire('pointerup', r.left + 140, r.top + oy + 34, 0);
      await new Promise(rs => setTimeout(rs, 120));
    }
    await new Promise(rs => setTimeout(rs, 500));
    return out;
  }, [sel, n]);
}
const tracos = p => p.evaluate(() => window.__db.user_ink_strokes.map(s => ({ id: s.id, anchor: s.anchor_id })));
/* retângulo do traço (grupo/paths de tinta) relativo ao elemento âncora */
const relTraco = (p, anchor) => p.evaluate(a => {
  const m = /^(.+?)>(\d+)$/.exec(a), secEl = document.getElementById(m ? m[1] : a);
  const lista = secEl.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote'), el = m ? lista[+m[2]] : secEl, er = el.getBoundingClientRect();
  const ps = Array.from(document.querySelectorAll('path[data-ink]')).filter(x => true);
  const out = ps.map(x => { const r = x.getBoundingClientRect(); return { id: x.getAttribute('data-ink'), dx: Math.round((r.left - er.left) * 10) / 10, dy: Math.round((r.top - er.top) * 10) / 10, w: Math.round(r.width), h: Math.round(r.height) }; });
  return { anchorTxt: el.textContent.trim().slice(0, 30), n: lista.length, out };
}, anchor);

(async () => {
  const S = await iniciar();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    sec('Arquivos REAIS: toolbox/caneta v2 + Layout V2 + áudio montam juntos (José × Semiología II)');
    {
      const { ctx, page, erros } = await nova(S, browser);
      const real = await page.evaluate(() => !!document.querySelector('script[src*="/b1/rm-layout"]') && !!window.RMLayout);
      ok(real, 'o Layout V2 é o rm-layout.js REAL do repositório (RM_B1_DIR)');
      ok(await page.evaluate(() => !!document.querySelector('.rm2-box') && document.body.classList.contains('rm-v2')), 'a toolbox REAL da caneta v2 montou (conta do José)');
      ok(await boot(page) === true, 'áudio: start() ⇒ true com Layout real + caneta real');
      ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 2 && !!document.querySelector('#rm-l2-player')), '2 cards e o slot #rm-l2-player do Layout real');
      ok(erros.length === 0, 'nenhum erro de página/console', erros);
      await ctx.close();
    }

    sec('Reprodução DURANTE a escrita (caneta real armada)');
    let BASE_PREV = -1;
    { /* referência: a própria caneta real chama preventDefault nos eventos dela; mede-se SEM áudio para comparar */
      const { ctx, page } = await nova(S, browser); await attach(page);
      BASE_PREV = (await tracar(page, '#tab-semio2 #s2-b03 p', 2)).prevented; await ctx.close();
      ok(BASE_PREV > 0, 'referência sem áudio: a caneta real previne os próprios eventos (n=' + BASE_PREV + ')');
    }
    {
      S.zera();
      const { ctx, page, erros } = await nova(S, browser);
      await boot(page);
      await card(page, AID).click(); ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'), 'tocando');
      await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await esp(300);
      ok(await page.evaluate(() => document.body.classList.contains('rm2-t-pen') && document.getElementById('rm-l2-player').hasAttribute('data-rm-pen')), 'caneta real armada ⇒ body.rm2-t-pen e slot data-rm-pen');
      const a0 = await tocando(page), y0 = await page.evaluate(() => window.scrollY);
      const r = await tracar(page, '#tab-semio2 #s2-b03 p', 2);
      ok(r.prevented === BASE_PREV, 'o áudio não muda nenhum evento da caneta (mesmos preventDefault que sem áudio)', [r.prevented, BASE_PREV]);
      const tr = await tracos(page);
      ok(tr.length === 2 && tr.every(t => /^s2-b03/.test(t.anchor)), 'a caneta REAL gravou 2 traços ancorados em s2-b03', tr);
      const a1 = await tocando(page);
      ok(a1.state === 'playing' && a1.t > a0.t + 0.2, 'durante e depois dos traços o áudio continua a tocar e a avançar', [a0, a1]);
      ok(await page.evaluate(() => window.__db.user_ink_strokes.length === 2 && !window.__dbOps.some(o => /storage|audio/.test(o))), 'a gravação dos traços não toca no áudio nem pede mídia');
      ok(await page.evaluate(() => window.__m.audioCtor === 1), 'continua a existir UM só elemento de áudio', await page.evaluate(() => window.__m.audioCtor));
      ok(erros.length === 0, 'nenhum erro', erros);
      await ctx.close();
    }

    sec('Alinhamento dos traços ao INSERIR/REMOVER cards (âncora = seção>índice de p,li,h2…,figure)');
    {
      S.zera();
      const { ctx, page } = await nova(S, browser);
      await attach(page);
      await tracar(page, '#tab-semio2 #s2-b03 p', 1);                        // 1 traço ANTES de existir qualquer card
      const t0 = await tracos(page); ok(t0.length === 1, 'traço gravado antes dos cards', t0);
      const anchor = t0[0].anchor, antes = await relTraco(page, anchor);
      ok(antes.out.length >= 1, 'o traço está desenhado (path[data-ink])', antes);
      const nAntes = antes.n;
      await page.addScriptTag({ url: '/assets/rm-audio-boot.js?v=t' }); await page.evaluate(() => window.RMAudioBoot.start()); await esp(900);
      ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 2), 'cards inseridos (2)');
      const comCards = await relTraco(page, anchor);
      ok(comCards.n === nAntes && comCards.anchorTxt === antes.anchorTxt, 'a contagem de âncoras e o elemento-âncora NÃO mudam com os cards (id continua a apontar o mesmo parágrafo)', { antes: [nAntes, antes.anchorTxt], dep: [comCards.n, comCards.anchorTxt] });
      const d1 = comCards.out[0], d0 = antes.out[0];
      ok(d1 && near(d1.dx, d0.dx, 1.5) && near(d1.dy, d0.dy, 1.5), 'com os cards o traço continua na MESMA posição relativa ao parágrafo (sem reposicionar à mão)', { antes: d0, comCards: d1 });
      /* traço feito COM cards, depois remover os cards */
      await tracar(page, '#tab-semio2 #s2-b03 p', 1);
      const t1 = await tracos(page); ok(t1.length === 2 && t1[1].anchor === t1[0].anchor, 'segundo traço, mesmo parágrafo, mesmo anchor_id com cards presentes', t1);
      const comCards2 = await relTraco(page, anchor);
      await page.evaluate(() => window.RMAudioBoot.stop()); await esp(600);
      ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 0), 'cards removidos');
      const semCards = await relTraco(page, anchor);
      ok(semCards.n === nAntes && semCards.anchorTxt === antes.anchorTxt, 'sem os cards a âncora continua a ser o mesmo parágrafo');
      ok(comCards2.out.length === semCards.out.length && comCards2.out.every((o, i) => near(o.dx, semCards.out[i].dx, 1.5) && near(o.dy, semCards.out[i].dy, 1.5)), 'remover os cards NÃO desloca os 2 traços (posição relativa idêntica)', { com: comCards2.out, sem: semCards.out });
      await page.evaluate(() => window.RMAudioBoot.start()); await esp(900);
      const de_novo = await relTraco(page, anchor);
      ok(de_novo.out.length === semCards.out.length && de_novo.out.every((o, i) => near(o.dx, semCards.out[i].dx, 1.5) && near(o.dy, semCards.out[i].dy, 1.5)), 'reinserir os cards (start de novo) também não desloca os traços', { sem: semCards.out, de_novo: de_novo.out });
      /* o que a caneta guardou continua válido (nenhuma âncora aponta fora) */
      ok(await page.evaluate(() => window.__db.user_ink_strokes.every(s => { const m = /^(.+?)>(\d+)$/.exec(s.anchor_id); const e = document.getElementById(m[1]); return e && e.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+m[2]]; })), 'todas as âncoras gravadas resolvem para um elemento real');
      await ctx.close();
    }

    sec('Recarregar a página: marca-texto REAL + traço REAL continuam alinhados com os cards (antes ou depois da caneta)');
    {
      S.zera();
      const { ctx, page } = await nova(S, browser);
      await attach(page);
      const hl = await page.evaluate(async () => {            // marca-texto real (rm-tools.js marcarRange) numa frase de s2-b03
        const p = document.querySelectorAll('#tab-semio2 #s2-b03 p')[1]; p.scrollIntoView({ block: 'center' });
        const n = document.createTreeWalker(p, NodeFilter.SHOW_TEXT).nextNode(), txt = n.nodeValue, a = txt.search(/\S/), b = Math.min(txt.length, a + 28);
        const r = document.createRange(); r.setStart(n, a); r.setEnd(n, b);
        const okm = await window.RMTools.marcarRange(r, 'red'); await new Promise(rs => setTimeout(rs, 500));
        return { okm, n: document.querySelectorAll('.rm-hl').length, rows: window.__db.user_highlights.length };
      });
      ok(hl.rows === 1 && hl.n >= 1, 'marca-texto real gravado (1 linha) e pintado', hl);
      await tracar(page, '#tab-semio2 #s2-b03 p', 1);
      const tr0 = await tracos(page); ok(tr0.length === 1, 'traço real gravado', tr0);
      const anchor = tr0[0].anchor;
      const hlTxt = () => page.evaluate(() => Array.from(document.querySelectorAll('.rm-hl')).map(e => e.textContent).join('|'));
      const HL0 = await hlTxt(), R0 = await relTraco(page, anchor);
      const igual = (a, b) => a.out.length === b.out.length && a.out.length >= 1 && a.out.every((o, i) => near(o.dx, b.out[i].dx, 1.5) && near(o.dy, b.out[i].dy, 1.5));
      const recarregar = async () => { await page.reload(); await page.waitForFunction(() => window.RMToolsV2 && window.RM_STUDY_V2_ACTIVE && document.querySelector('#tab-semio2 section[id]')); await esp(1200); };
      /* A) recarregar, SEM áudio: referência */
      await recarregar(); await attach(page); await page.evaluate(() => window.RMToolsV2.sincronizarAba(document.getElementById('tab-semio2'))); await esp(900);
      const HLa = await hlTxt(), Ra = await relTraco(page, anchor);
      ok(HLa === HL0 && HLa.length > 0, 'após recarregar (sem áudio) o marca-texto volta no mesmo texto', [HL0, HLa]);
      ok(igual(R0, Ra), 'após recarregar (sem áudio) o traço volta na mesma posição relativa', [R0.out, Ra.out]);
      /* B) recarregar e subir o áudio ANTES da caneta sincronizar (cards inseridos primeiro) */
      await recarregar(); await boot(page); await esp(900);
      await page.evaluate(() => window.RMToolsV2.sincronizarAba(document.getElementById('tab-semio2'))); await esp(900);
      const HLb = await hlTxt(), Rb = await relTraco(page, anchor);
      ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 2), 'cards presentes');
      ok(HLb === HL0, 'com os cards inseridos ANTES: o marca-texto volta no mesmo texto', [HL0, HLb]);
      ok(Rb.n === Ra.n && igual(R0, Rb), 'com os cards inseridos ANTES: o traço volta na mesma posição relativa', [R0.out, Rb.out]);
      /* C) tirar os cards com tudo já desenhado */
      await page.evaluate(() => window.RMAudioBoot.stop()); await esp(600);
      const HLc = await hlTxt(), Rc = await relTraco(page, anchor);
      ok(HLc === HL0 && igual(R0, Rc), 'tirar os cards não move nem apaga marca-texto/traço', [HL0, HLc, R0.out, Rc.out]);
      /* o banco continua com UMA marca e UM traço (nenhuma duplicação por causa dos cards) */
      ok(await page.evaluate(() => window.__db.user_highlights.length === 1 && window.__db.user_ink_strokes.length === 1), 'o banco continua com 1 marca-texto e 1 traço (sem duplicar)');
      await ctx.close();
    }

    sec('Pausar / fechar com a caneta armada; escrita continua possível');
    {
      S.zera();
      const { ctx, page } = await nova(S, browser);
      await boot(page); await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
      await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await esp(250);
      await page.evaluate(() => window.RMAudioBoot._engine().pause()); await esp(200);
      ok((await E(page)).state === 'paused' && await page.evaluate(() => document.querySelector('.rm-audio') && !document.getElementById('rm-l2-player').hidden), 'pausa com caneta armada: pausado e player aberto (chip)');
      const r1 = await tracar(page, '#tab-semio2 #s2-b03 p', 1);
      ok((await tracos(page)).length === 1 && (await E(page)).state === 'paused', 'escrever com o áudio pausado: traço gravado e o áudio NÃO retoma sozinho', [r1, await tracos(page), await E(page)]);
      await page.evaluate(() => window.RMAudioBoot._engine().close()); await esp(300);
      ok(await page.evaluate(() => document.getElementById('rm-l2-player').hidden === true), 'fechar recolhe o slot');
      ok(await page.evaluate(() => document.body.classList.contains('rm2-t-pen')), 'fechar o player NÃO desarma a caneta');
      const r2 = await tracar(page, '#tab-semio2 #s2-b03 p', 1);
      ok((await tracos(page)).length === 2, 'depois de fechar o player a caneta continua a escrever', await tracos(page));
      ok((await E(page)).state === 'paused', 'sem retomada automática');
      await ctx.close();
    }

    sec('Troca de matéria e logout DURANTE o carregamento do manifesto');
    {
      /* 1) trocar de matéria com o manifesto ainda a caminho */
      S.zera(); S.latManifest = 900;
      { const { ctx, page } = await nova(S, browser);
        await attach(page);
        const p = page.evaluate(() => window.RMAudioBoot ? 0 : 0);
        await page.addScriptTag({ url: '/assets/rm-audio-boot.js?v=t' });
        const r = page.evaluate(() => window.RMAudioBoot.start());
        await esp(250);
        await page.evaluate(() => { document.getElementById('tab-semio2').classList.remove('active'); document.getElementById('tab-outra').classList.add('active'); window.RMLayout.detach(); });
        const res = await r; await esp(600);
        ok(res === false, 'trocar de matéria durante o carregamento: start() resolve false');
        ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card, .rm-audio').length === 0 && window.RMAudioBoot._estado() === null), 'nenhum card nem player aparece depois da troca', await page.evaluate(() => ({ cards: document.querySelectorAll('.rm-audio-card').length, estado: window.RMAudioBoot._estado() && 1 })));
        ok(await page.evaluate(() => window.__m.audioCtor === 0) && !S.log.some(x => x.p.indexOf('/storage/v1/object/sign/') === 0), 'nenhum elemento de áudio nem mídia');
        await ctx.close(); }
      /* 1b) trocar de matéria SEM o Layout se desfazer (só a aba muda): o próprio boot tem de cancelar */
      S.zera(); S.latManifest = 900;
      { const { ctx, page } = await nova(S, browser);
        await attach(page); await page.addScriptTag({ url: '/assets/rm-audio-boot.js?v=t' });
        const r = page.evaluate(() => window.RMAudioBoot.start());
        await esp(250);
        await page.evaluate(() => { document.getElementById('tab-semio2').classList.remove('active'); document.getElementById('tab-outra').classList.add('active'); });
        const res = await r; await esp(600);
        ok(res === false, 'só a aba mudou durante o carregamento: start() resolve false');
        ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card, .rm-audio').length === 0 && window.RMAudioBoot._estado() === null), 'nenhum card nem player (nem na aba escondida)', await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length));
        await ctx.close(); }
      /* 2) logout com o manifesto a caminho */
      S.zera(); S.latManifest = 900;
      { const { ctx, page } = await nova(S, browser);
        await attach(page); await page.addScriptTag({ url: '/assets/rm-audio-boot.js?v=t' });
        const r = page.evaluate(() => window.RMAudioBoot.start());
        await esp(250);
        await page.evaluate(() => { window.__sess = null; window.__authCb('SIGNED_OUT'); });
        const res = await r; await esp(600);
        ok(res === false, 'logout durante o carregamento: start() resolve false');
        ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card, .rm-audio').length === 0 && window.RMAudioBoot._estado() === null), 'nenhum card nem player aparece depois do logout', await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length));
        ok(await page.evaluate(() => window.__m.audioCtor === 0), 'nenhum elemento de áudio');
        await ctx.close(); }
      /* 3) o mesmo, mas com o Layout removido durante o carregamento */
      S.zera(); S.latManifest = 900;
      { const { ctx, page } = await nova(S, browser);
        await attach(page); await page.addScriptTag({ url: '/assets/rm-audio-boot.js?v=t' });
        const r = page.evaluate(() => window.RMAudioBoot.start());
        await esp(250);
        await page.evaluate(() => window.RMLayout.detach());
        const res = await r; await esp(600);
        ok(res === false && await page.evaluate(() => document.querySelectorAll('.rm-audio-card, .rm-audio').length === 0), 'Layout desfeito durante o carregamento: nenhum card/player (slot some ⇒ nada de áudio sem controlos)');
        await ctx.close(); }
      S.latManifest = 0;
    }

    sec('Toolbox REAL × player: 561–767 px e 720×450 (zoom 200 %) — DETECTAR e REPORTAR (o Layout é do Claude 2)');
    {
      S.zera();
      const cfg = [[561, 900, 1], [600, 900, 1], [700, 900, 1], [767, 1024, 1], [561, 520, 1], [700, 520, 1], [767, 520, 1], [720, 450, 2], [390, 844, 1], [1024, 768, 1], [1440, 900, 1], [1700, 900, 1], [1920, 1080, 1]];
      for (const [w, h, dsf] of cfg) {
        const { ctx, page } = await nova(S, browser, w, h, { dsf });
        await boot(page); await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing', null, 10000); await esp(300);
        const medir = () => page.evaluate(() => {
          const inter = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
          const pl = document.querySelector('.rm-audio').getBoundingClientRect(), bx = document.querySelector('.rm2-box'), br = bx.getBoundingClientRect();
          const parts = Array.from(bx.querySelectorAll('button, .rm2-fab, .rm2-panel')).filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect());
          const alvo = Array.from(bx.querySelectorAll('button')).filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect());
          const nomes = Array.from(bx.querySelectorAll('button')).filter(e => e.offsetParent !== null && inter(pl, e.getBoundingClientRect())).map(e => (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 40));
          return { dock: document.documentElement.getAttribute('data-rm-dock'), cobreBox: inter(pl, br), cobreBtn: alvo.some(r => inter(pl, r)), nomes, ph: Math.round(pl.height), boxBottom: Math.round(br.bottom), playerTop: Math.round(pl.top), vh: innerHeight };
        });
        const fechada = await medir();
        await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await esp(350);
        const aberta = await medir();
        const cobre = fechada.cobreBtn || aberta.cobreBtn;
        RELATORIO.push({ w, h, dsf, dock: aberta.dock, playerH: aberta.ph, fechada: fechada.cobreBtn, aberta: aberta.cobreBtn, nomes: fechada.nomes.concat(aberta.nomes) });
        if (w > 560 && w < 768) console.log(`  ${cobre ? '⚠ B1-BLOCKER (Claude 2)' : '✔'} ${w}×${h}${dsf > 1 ? ' zoom' + dsf * 100 : ''}: player ${aberta.ph}px ${cobre ? 'COBRE' : 'não cobre'} os botões da toolbox real (fechada: ${fechada.cobreBtn}, aberta: ${aberta.cobreBtn})${cobre ? ' · botões: ' + JSON.stringify(Array.from(new Set(fechada.nomes.concat(aberta.nomes)))) : ''}`);
        else ok(!cobre, `${w}×${h}: o player não cobre botões da toolbox real`, { fechada, aberta });
        await ctx.close();
      }
      const bl = RELATORIO.filter(x => x.w > 560 && x.w < 768 && (x.fechada || x.aberta));
      console.log('\n  RELATÓRIO B1-BLOCKER (toolbox REAL × player): ' + (bl.length ? 'ATIVO em ' + bl.map(x => `${x.w}×${x.h}${x.dsf > 1 ? '@zoom' : ''}`).join(', ') + ' — correção é do Claude 2 (#425, rm-layout.css/rm-tools-v2.js); NÃO feita aqui' : 'não reproduzido nas larguras 561–767 com este Layout'));
      ok(RELATORIO.length === cfg.length, 'todas as larguras/alturas medidas');
    }
  } catch (e) { koN++; falhas.push('EXCEÇÃO: ' + (e && e.stack || e)); console.log('  ✗ EXCEÇÃO', e); }
  await browser.close(); S.fechar();
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
})();
