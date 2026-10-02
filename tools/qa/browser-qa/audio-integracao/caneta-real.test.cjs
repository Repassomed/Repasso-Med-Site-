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
  await page.addInitScript(() => {
    window.__bootTimers = 0;
    const st0 = window.setTimeout, si0 = window.setInterval, raf0 = window.requestAnimationFrame, deBoot = () => { try { return /rm-audio-boot/.test((new Error().stack || '').split('\n')[3] || ''); } catch (e) { return false; } };   // só quem chama setTimeout/rAF DIRETAMENTE do boot
    window.setTimeout = function () { if (deBoot()) window.__bootTimers++; return st0.apply(this, arguments); };
    window.setInterval = function () { if (deBoot()) window.__bootTimers++; return si0.apply(this, arguments); };
    window.requestAnimationFrame = function () { if (deBoot()) window.__bootTimers++; return raf0.apply(this, arguments); };
  });
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

    sec('Contato da caneta × inserir/remover cards: NUNCA RMToolsV2.reposicionar() durante o contato; só pelo caminho protegido do Layout');
    {
      /* mesma forma de dirigir a caneta que o race.test.cjs da #425 (pointerdown no elemento, pointermove no document) */
      const INSTR_REPOS = () => { window.__repos = []; const r0 = window.RMToolsV2.reposicionar; window.RMToolsV2.reposicionar = function () { window.__repos.push({ t: performance.now(), penDown: document.body.classList.contains('rm2-pen-down'), traco: !!(window.RMToolsV2._test && window.RMToolsV2._test.temTraco && window.RMToolsV2._test.temTraco()) }); return r0.apply(this, arguments); }; };
      const DOWN = () => { const ps = Array.from(document.querySelectorAll('#tab-semio2 #s2-b03 p')).filter(x => x.textContent.length > 150); const e = ps[0]; e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect();
        const mk = (ty, x, y, pr) => new PointerEvent(ty, { pointerType: 'pen', pointerId: 7, isPrimary: true, clientX: x, clientY: y, pressure: pr, buttons: pr ? 1 : 0, bubbles: true, cancelable: true, composed: true });
        window.__penMk = mk; window.__penX = r.left + r.width * 0.2; window.__penY = r.top + r.height / 2; window.__penEl = e;
        e.dispatchEvent(mk('pointerdown', window.__penX, window.__penY, 0.5)); for (let k = 1; k <= 6; k++) document.dispatchEvent(mk('pointermove', window.__penX + k * 9, window.__penY + Math.sin(k / 2) * 8, 0.5));
        return { down: document.body.classList.contains('rm2-pen-down'), traco: !!window.RMToolsV2._test.temTraco() }; };
      const UP = () => { document.dispatchEvent(window.__penMk('pointerup', window.__penX + 60, window.__penY + 4, 0)); };
      const nRepos = (p) => p.evaluate(() => window.__repos.length);
      const posicoes = (p) => p.evaluate(() => Array.from(document.querySelectorAll('path[data-ink]')).map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10]; }));

      /* A) contato ligado: inserir, remover e inserir de novo os cards */
      S.zera();
      { const { ctx, page, erros } = await nova(S, browser);
        await attach(page);
        const temPedir = await page.evaluate(() => typeof window.RMLayout.pedirReposicao === 'function');
        console.log('  Layout: ' + (temPedir ? 'com RMLayout.pedirReposicao (contrato da #425)' : 'SEM RMLayout.pedirReposicao (Layout anterior à #425): o boot não pede nada; a V2 reposiciona pelo próprio observador'));
        await tracar(page, '#tab-semio2 #s2-b03 p', 1);                           // S1 já desenhado, antes de qualquer card
        ok((await tracos(page)).length === 1, 'S1 gravado antes dos cards');
        const R0 = (await relTraco(page, (await tracos(page))[0].anchor)).out;
        await page.evaluate(INSTR_REPOS);
        await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await esp(200);
        await page.addScriptTag({ url: '/assets/rm-audio-boot.js?v=t' });
        const d = await page.evaluate(DOWN);
        ok(d.down && d.traco, 'contato da caneta ligado: body.rm2-pen-down e traço em curso (V2 real)', d);
        const t0 = await page.evaluate(() => performance.now());
        const r1 = await page.evaluate(() => window.RMAudioBoot.start()); await esp(1300);
        ok(r1 === true && await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 2), 'cards INSERIDOS durante o contato');
        ok(await page.evaluate(() => document.body.classList.contains('rm2-pen-down') && window.RMToolsV2._test.temTraco()), 'o contato continua ligado e o traço continua em curso');
        ok(await nRepos(page) === 0, 'inserir card durante o contato: 0 chamadas a RMToolsV2.reposicionar()', await page.evaluate(() => window.__repos));
        await page.evaluate(() => window.RMAudioBoot.stop()); await esp(900);
        ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 0), 'cards REMOVIDOS durante o contato');
        ok(await nRepos(page) === 0, 'remover card durante o contato: 0 chamadas a RMToolsV2.reposicionar()', await page.evaluate(() => window.__repos));
        await page.evaluate(() => window.RMAudioBoot.start()); await esp(1300);
        ok(await nRepos(page) === 0 && await page.evaluate(() => document.body.classList.contains('rm2-pen-down')), 'inserir de novo, ainda em contato: continua 0 chamadas');
        const tUp = await page.evaluate(() => { const t = performance.now(); return t; });
        await page.evaluate(UP); await esp(1500);
        const rp = await page.evaluate(() => window.__repos);
        if (temPedir) {
          ok(rp.length >= 1 && rp.every(x => x.t >= tUp && !x.penDown && !x.traco), 'com o contato terminado, o Layout executa o pedido pendente: só DEPOIS do pointerup, sem rm2-pen-down e sem traço em curso', rp);
          ok(rp.length <= 2, 'pedidos coalescidos (os 3 eventos de cards viram 1–2 execuções, não 3 + rAF próprios)', rp.length);
        } else ok(rp.length === 0, 'sem o contrato da #425 o boot NUNCA chama RMToolsV2.reposicionar() diretamente', rp);
        ok(!(await page.evaluate(() => document.body.classList.contains('rm2-pen-down'))), 'o contato terminou');
        const tr = await tracos(page);
        ok(tr.length === 2, 'o traço feito durante as mudanças foi gravado (2 no banco)', tr);
        /* ALINHAMENTO depois do pointerup: o que está desenhado já é o que um reposicionamento forçado desenharia, e S1 não saiu do lugar */
        const antes = await posicoes(page);
        const Rs1 = await relTraco(page, tr[0].anchor), Rs2 = await relTraco(page, tr[1].anchor);
        await page.evaluate(() => { window.RMToolsV2.reposicionar.__orig; });
        await page.evaluate(() => { const o = window.RMToolsV2; const f = o.reposicionar; f.call(o); }); await esp(500);   // chamada do TESTE (fora do contato): referência
        const depois = await posicoes(page);
        ok(antes.length === 2 && antes.length === depois.length && antes.every((a, i) => near(a[0], depois[i][0], 1.5) && near(a[1], depois[i][1], 1.5)), 'após o pointerup os 2 traços já estão alinhados: um reposicionamento forçado não muda nada (±1,5 px)', { antes, depois });
        ok(Rs1.out.length >= 1 && near(Rs1.out[0].dx, R0[0].dx, 1.5) && near(Rs1.out[0].dy, R0[0].dy, 1.5), 'S1 (desenhado antes dos cards) continua na mesma posição relativa ao parágrafo', { antes: R0[0], depois: Rs1.out[0] });
        ok(Rs2.n === Rs1.n && Rs2.out.length >= 1, 'S2 ancorado e desenhado');
        ok(erros.length === 0, 'nenhum erro de página/console', erros);
        await ctx.close(); }

      /* B) callbacks/pedidos NÃO sobrevivem a trocar de matéria nem a sair da conta (com um espião em RMLayout.pedirReposicao) */
      for (const motivo of ['aba', 'logout', 'stop-do-piloto']) {
        S.zera();
        const { ctx, page } = await nova(S, browser);
        await attach(page);
        await page.evaluate(() => { const L = window.RMLayout; window.__pedidos = 0; const o = L.pedirReposicao || function () {}; L.pedirReposicao = function () { window.__pedidos++; return o.apply(this, arguments); }; });
        await page.evaluate(INSTR_REPOS);
        await boot(page); await esp(1800);                                      // deixa assentar o pedido do attach e o dos cards
        ok(await page.evaluate(() => window.__pedidos) === 1, `${motivo}: inserir os cards pede UMA reposição ao Layout`, await page.evaluate(() => window.__pedidos));
        const n0 = await nRepos(page);
        if (motivo === 'aba') await page.evaluate(() => { document.getElementById('tab-semio2').classList.remove('active'); document.getElementById('tab-outra').classList.add('active'); });
        else if (motivo === 'logout') await page.evaluate(() => { window.__sess = null; window.__authCb('SIGNED_OUT'); });
        else await page.evaluate(() => window.RMAudioBoot.stop());
        await esp(1200);
        ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 0 && window.RMAudioBoot._estado() === null), `${motivo}: cards removidos e boot parado`);
        const esperado = motivo === 'stop-do-piloto' ? 2 : 1;
        ok(await page.evaluate(() => window.__pedidos) === esperado, `${motivo}: ${motivo === 'stop-do-piloto' ? 'o stop() do piloto na mesma matéria pede a reposição da remoção' : 'remover os cards por causa disto NÃO pede reposição (nada novo ao Layout)'}`, await page.evaluate(() => window.__pedidos));
        ok(await page.evaluate(() => window.__bootTimers) === 0, `${motivo}: o boot não agenda NENHUM setTimeout/setInterval/requestAnimationFrame (nada para invalidar depois)`, await page.evaluate(() => window.__bootTimers));
        if (motivo !== 'stop-do-piloto') ok(await nRepos(page) === n0, `${motivo}: nenhum RMToolsV2.reposicionar() novo depois da troca (o pedido da remoção não existe e o do Layout reconfere a matéria)`, await page.evaluate(() => window.__repos));
        await ctx.close();
      }
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

    sec('Toolbox REAL × player: ÁREA VISÍVEL de cada botão (recorte do painel rolável + janela), hit-test e rolagem — 561–767 px, 720×450 (zoom 200 %) e demais');
    {
      /* Por que não getBoundingClientRect() sozinho: o painel da toolbox (`.rm2-panel`) é rolável (`overflow-y:auto`, max-height 76vh): botões fora da faixa visível
         têm retângulo «abaixo/sob o player» mas estão RECORTADOS pelo painel (área visível 0 %), não cobertos. Mede-se: (1) retângulo ∩ recortes dos ancestrais com overflow ∩ janela;
         (2) elementFromPoint no centro da parte visível; (3) depois de ROLAR o painel até o botão, ele fica visível (≥ 95 %) e o hit-test devolve o próprio botão — nunca o player. */
      S.zera();
      const cfg = [[561, 900, 1], [600, 900, 1], [700, 900, 1], [767, 1024, 1], [561, 520, 1], [600, 520, 1], [700, 520, 1], [767, 520, 1], [720, 450, 2], [390, 844, 1], [1024, 768, 1], [1440, 900, 1], [1700, 900, 1], [1920, 1080, 1]];
      const MEDIR = () => {
        const sel = '.rm2-box button', pl = document.querySelector('.rm-audio'), plr = pl ? pl.getBoundingClientRect() : null;
        const visivel = (el) => { const r = el.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom;
          for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(cs.overflowY + cs.overflowX)) { const q = a.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } }
          L = Math.max(L, 0); T = Math.max(T, 0); R = Math.min(R, innerWidth); B = Math.min(B, innerHeight);
          const a = Math.max(0, R - L) * Math.max(0, B - T), full = r.width * r.height; return { frac: full ? a / full : 0, cx: (L + R) / 2, cy: (T + B) / 2 }; };
        const lista = Array.from(document.querySelectorAll(sel)).filter(e => e.offsetParent !== null && !e.disabled);
        return lista.map(e => { const v = visivel(e); const h = v.frac > 0 ? document.elementFromPoint(v.cx, v.cy) : null; return { el: e, n: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 40), frac: v.frac, hitEle: !!h && e.contains(h), hitPlayer: !!h && !!h.closest('.rm-audio') }; });
      };
      /* sentido contrário: algum CONTROLE do player (botões/velocidade) fica sob a toolbox/qualquer outra coisa? hit-test no centro de cada controle visível */
      const CTRL = () => Array.from(document.querySelectorAll('.rm-audio button, .rm-audio select')).filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); const cx = Math.min(Math.max((r.left + r.right) / 2, 0), innerWidth - 1), cy = Math.min(Math.max((r.top + r.bottom) / 2, 0), innerHeight - 1); const hit = document.elementFromPoint(cx, cy); return { n: (e.getAttribute('aria-label') || e.className).toString().slice(0, 30), ok: !!hit && (e.contains(hit) || hit.contains(e)), por: hit ? ((hit.closest('.rm2-box') ? 'toolbox' : hit.className || hit.tagName).toString().slice(0, 24)) : '—', dentro: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth }; }).filter(o => o.dentro);
      for (const [w, h, dsf] of cfg) {
        const { ctx, page } = await nova(S, browser, w, h, { dsf });
        await boot(page); await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing', null, 10000); await esp(300);
        await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await esp(500);          // caneta armada ⇒ chip + toolbox aberta (pior caso)
        await page.exposeFunction('__noop' + w + h, () => 0).catch(() => {});
        const res = await page.evaluate(([MEDIRsrc]) => {
          const MED = (new Function('return ' + MEDIRsrc))();
          const painel = document.querySelector('.rm2-panel'), pl = document.querySelector('.rm-audio').getBoundingClientRect();
          const antes = MED().map(o => ({ n: o.n, frac: o.frac, hitEle: o.hitEle, hitPlayer: o.hitPlayer }));
          const pr = painel && painel.getBoundingClientRect();
          const out = { vh: innerHeight, player: [Math.round(pl.top), Math.round(pl.bottom)], painel: painel ? { top: Math.round(pr.top), bottom: Math.round(pr.bottom), rolavel: painel.scrollHeight > painel.clientHeight + 1, sh: painel.scrollHeight, ch: painel.clientHeight } : null, antes, depois: [], painelSobPlayer: !!pr && pr.bottom > pl.top + 0.5 && pr.top < pl.bottom - 0.5 && pr.right > pl.left && pr.left < pl.right };
          /* rolar o painel até cada botão e medir de novo (cada botão no seu melhor momento) */
          const nomes = Array.from(document.querySelectorAll('.rm2-box button')).filter(e => e.offsetParent !== null && !e.disabled);
          nomes.forEach(e => { try { e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (x) {} const m = MED().find(o => o.el === e); out.depois.push({ n: m.n, frac: m.frac, hitEle: m.hitEle, hitPlayer: m.hitPlayer }); });
          if (painel) painel.scrollTop = 0;
          return out;
        }, [MEDIR.toString()]);
        const recortados = res.antes.filter(b => b.frac < 0.95).map(b => b.n);
        const aposRolar = res.depois.filter(b => !(b.frac >= 0.95 && b.hitEle));
        const cobertoAntes = res.antes.filter(b => b.frac > 0 && b.hitPlayer).map(b => b.n);
        const emFaixa = w > 560 && w < 768;
        ok(cobertoAntes.length === 0, `${w}×${h}${dsf > 1 ? ' zoom' + dsf * 100 : ''}: nenhum botão VISÍVEL tem o player por cima no hit-test`, cobertoAntes);
        const ctrls = await page.evaluate(([src]) => (new Function('return ' + src))()(), [CTRL.toString()]);
        const ctrlCobertos = ctrls.filter(c => !c.ok);
        ok(ctrls.length >= 1 && ctrlCobertos.length === 0, `${w}×${h}: nenhum controle do player (${ctrls.length} medidos) fica sob a toolbox ou outro elemento`, ctrlCobertos);
        ok(!res.painelSobPlayer, `${w}×${h}: o painel da toolbox (parte visível) não entra na faixa do player`, { painel: res.painel, player: res.player });
        ok(aposRolar.length === 0, `${w}×${h}: depois de rolar o painel TODOS os ${res.depois.length} botões ficam visíveis (≥ 95 %) e o hit-test devolve o próprio botão`, aposRolar);
        RELATORIO.push({ w, h, dsf, rolavel: !!(res.painel && res.painel.rolavel), recortados });
        if (recortados.length) console.log(`  ⓘ ${w}×${h}${dsf > 1 ? '@zoom' : ''}: ${recortados.length} botão(ões) recortados pelo painel rolável (acessíveis ao rolar; NÃO cobertos): ${JSON.stringify(recortados)}`);
        await ctx.close();
      }
      console.log('\n  RELATÓRIO toolbox × player: ' + (RELATORIO.some(x => x.recortados.length) ? 'viewports baixos têm botões recortados pelo painel rolável (comportamento normal: rolar o painel) — nenhum coberto pelo player, todos acessíveis ao rolar' : 'todos os botões visíveis sem rolar'));
      ok(RELATORIO.length === cfg.length, 'todas as larguras/alturas medidas');
      /* CONTROLE NEGATIVO: o detector não pode ser vácuo. Forçando a toolbox para baixo, por cima do player, o hit-test TEM de acusar o player. */
      { const { ctx, page } = await nova(S, browser, 700, 900);
        await boot(page); await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing', null, 10000);
        await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await esp(400);
        await page.addStyleTag({ content: '.rm2-box{top:auto !important;bottom:0 !important;transform:none !important}' }); await esp(300);
        const r = await page.evaluate(([src, c]) => { const m = (new Function('return ' + src))()(); const cc = (new Function('return ' + c))()(); return { botoesSobPlayer: m.filter(o => o.frac > 0 && o.hitPlayer).length, controlesSobToolbox: cc.filter(o => !o.ok).length, total: m.length }; }, [MEDIR.toString(), CTRL.toString()]);
        ok(r.botoesSobPlayer + r.controlesSobToolbox >= 1, 'controle negativo: com a toolbox FORÇADA sobre o player o hit-test acusa a sobreposição (o detector funciona nos dois sentidos)', r);
        await ctx.close(); }
    }
  } catch (e) { koN++; falhas.push('EXCEÇÃO: ' + (e && e.stack || e)); console.log('  ✗ EXCEÇÃO', e); }
  await browser.close(); S.fechar();
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
})();
