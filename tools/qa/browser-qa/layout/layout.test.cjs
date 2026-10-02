#!/usr/bin/env node
/* Geometria do dock do player no Layout V2 B1 — usa o rm-layout.js/css REAIS (sem Supabase, sem rede). */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SITE = path.join(ROOT, 'Repasso-Med-Site--main', 'Atual - Copia', 'assets');
const FILES = {
  '/harness.html': [path.join(__dirname, 'harness.html'), 'text/html; charset=utf-8'],
  '/assets/styles.css': [path.join(SITE, 'styles.css'), 'text/css'],
  '/assets/rm-layout.css': [path.join(SITE, 'rm-layout.css'), 'text/css'],
  '/assets/rm-layout.js': [path.join(SITE, 'rm-layout.js'), 'text/javascript'],
  '/assets/rm-modes.js': [path.join(SITE, 'rm-modes.js'), 'text/javascript']
};
let okN = 0, koN = 0; const falhas = [];
const ok = (c, n, x) => { if (c) okN++; else { koN++; falhas.push(n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);

async function medir(page) {
  return page.evaluate(() => {
    const H = document.documentElement, cw = H.clientWidth;
    const card = document.querySelector('#s2-b01').getBoundingClientRect();
    const tools = document.getElementById('fake-tools').getBoundingClientRect();
    const slot = document.getElementById('rm-l2-player');
    const cs = getComputedStyle(H);
    const pw = parseFloat(cs.getPropertyValue('--rm-player-w')) || 224;
    return {
      cw, lmode: H.getAttribute('data-rm-lmode'), dock: H.getAttribute('data-rm-dock'),
      leftW: parseFloat(cs.getPropertyValue('--rm-left-w')), rightW: parseFloat(cs.getPropertyValue('--rm-right-w')),
      cardL: card.left, cardR: card.right, toolsL: tools.left, pw,
      sw: H.scrollWidth, slotR: cw - parseFloat(cs.getPropertyValue('--rm-right-w'))
    };
  });
}

(async () => {
  const srv = http.createServer((q, r) => { const f = FILES[q.url.split('?')[0]]; if (!f) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f[1], 'cache-control': 'no-store' }); r.end(fs.readFileSync(f[0])); });
  await new Promise(rs => srv.listen(0, '127.0.0.1', rs));
  const port = srv.address().port, base = `http://127.0.0.1:${port}/harness.html`;
  const browser = await chromium.launch();
  const erros = [];
  const nova = async (w, h, rail) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', e => erros.push(String(e)));
    await page.addInitScript(r => { try { if (r) localStorage.setItem('rm.l2.rail', 'min'); } catch (e) {} }, rail);
    await page.route('**/*', rt => new URL(rt.request().url()).hostname === '127.0.0.1' ? rt.continue() : rt.abort());
    await page.goto(base);
    await page.evaluate(() => { window.RMLayout.attach(document.getElementById('tab-semio2')); });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
    /* o site anima a aba ativa (fadeInTab .4s, com deslocamento): medir no meio da animação dá falsos «deslocamentos» de < 1 px */
    await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
    return { ctx, page };
  };
  const PE = 8, GAP = 8;   // mesmas folgas do rm-layout.js

  sec('Decisão do dock pelo espaço efetivamente livre (real rm-layout.js/css)');
  const tab = [];
  for (const rail of [false, true]) {
    for (const w of [1024, 1280, 1366, 1400, 1440, 1480, 1495, 1500, 1560, 1600, 1627, 1650, 1690, 1700, 1760, 1920]) {
      const { ctx, page } = await nova(w, 900, rail);
      const m = await medir(page);
      const playerL = m.slotR - PE - m.pw;
      const folga = playerL - (m.cardR + GAP);        // >0: cabe sem tocar no cartão de texto
      tab.push([rail ? 'rail' : 'docked', w, m.lmode, m.dock, Math.round(folga)]);
      ok(m.lmode === (rail ? (w >= 768 ? 'rail' : 'off') : (w >= 1200 ? 'docked' : 'rail')), `${rail ? 'trilho' : 'lateral'} ${w}: lmode coerente`, m.lmode);
      if (m.dock === 'side') ok(folga >= 0, `${rail ? 'rail' : 'docked'} ${w}: side ⇒ o player NÃO cobre o cartão de texto (folga ${Math.round(folga)}px)`, { folga });
      else ok(folga < 12 + 1, `${rail ? 'rail' : 'docked'} ${w}: bottom ⇒ de facto não cabia (folga ${Math.round(folga)}px < histerese)`, { folga });
      ok(playerL >= m.leftW + 100 || m.dock === 'bottom', `${rail ? 'rail' : 'docked'} ${w}: side nunca sobre a lateral esquerda`);
      ok(m.slotR <= m.toolsL + 0.5, `${rail ? 'rail' : 'docked'} ${w}: o slot termina à esquerda da toolbox`, { slotR: m.slotR, toolsL: m.toolsL });
      ok(m.sw <= m.cw, `${rail ? 'rail' : 'docked'} ${w}: sem overflow horizontal`, { sw: m.sw, cw: m.cw });
      await ctx.close();
    }
  }
  console.log('  tabela (modo, largura, lmode, dock, folga px):'); tab.forEach(r => console.log('   ', r.join('\t')));

  sec('Faixa crítica 1495–1627 px (antes: side com sobreposição)');
  const d = (modo, w) => (tab.find(r => r[0] === modo && r[1] === w) || [])[3];
  ok([1495, 1500, 1560, 1600, 1627].every(w => d('docked', w) === 'bottom'), 'lateral ABERTA (264) em 1495–1627 ⇒ bottom', [1495, 1500, 1560, 1600, 1627].map(w => d('docked', w)));
  ok(d('docked', 1650) === 'bottom' && d('docked', 1760) === 'side' && d('docked', 1920) === 'side', 'lateral aberta só dá side quando há folga real (≈1690+)');
  ok(d('rail', 1440) === 'bottom' && d('rail', 1480) === 'bottom', 'trilho (64) a 1440/1480 ⇒ bottom (não cabia 224 px ao lado do cartão)');
  ok([1500, 1560, 1600, 1627].every(w => d('rail', w) === 'side'), 'trilho (64) ≥ 1500 ⇒ side', [1500, 1560, 1600, 1627].map(w => d('rail', w)));

  sec('Mudar lateral aberta ⇄ minimizada reavalia o dock sem reload');
  {
    const { ctx, page } = await nova(1600, 900, false);
    let m = await medir(page);
    ok(m.lmode === 'docked' && m.dock === 'bottom', '1600 aberta: bottom', m);
    await page.evaluate(() => { document.querySelector('.rm-l2-rail-btn').click(); });
    await page.evaluate(() => new Promise(r => setTimeout(r, 80)));
    m = await medir(page);
    ok(m.lmode === 'rail' && m.dock === 'side', '1600 minimizada: side', m);
    await page.evaluate(() => { document.querySelector('.rm-l2-rail-btn').click(); });
    await page.evaluate(() => new Promise(r => setTimeout(r, 80)));
    m = await medir(page);
    ok(m.lmode === 'docked' && m.dock === 'bottom', 'reabrir a lateral: volta a bottom', m);
    await ctx.close();
  }

  sec('Redimensionar perto do limiar não faz o dock oscilar (histerese)');
  {
    const { ctx, page } = await nova(1520, 900, true);   // trilho: limiar ≈ 1491
    const seq = [];
    for (const w of [1490, 1495, 1492, 1500, 1493, 1497, 1505, 1495, 1490]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.evaluate(() => new Promise(r => setTimeout(r, 60)));
      seq.push((await medir(page)).dock);
    }
    let trocas = 0; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) trocas++;
    ok(trocas <= 2, 'no máximo 2 trocas numa sequência que atravessa o limiar várias vezes', seq.join(','));
    await ctx.close();
  }

  sec('Sem deslocar a escrita: nada muda enquanto a caneta está no papel');
  {
    const { ctx, page } = await nova(1440, 900, false);
    let m = await medir(page);
    ok(m.lmode === 'docked', 'partida: lateral aberta', m.lmode);
    const dock0 = (await medir(page)).dock;
    await page.evaluate(() => { document.body.classList.add('rm2-pen-down'); });
    await page.setViewportSize({ width: 1130, height: 900 });     // atravessaria docked → rail
    await page.evaluate(() => new Promise(r => setTimeout(r, 120)));
    m = await medir(page);
    ok(m.lmode === 'docked' && m.leftW === 264 && m.dock === dock0, 'em pleno traço o shell NÃO mudou de modo nem de reserva lateral (264) nem de dock', { lmode: m.lmode, leftW: m.leftW, dock: m.dock });
    await page.evaluate(() => { document.body.classList.remove('rm2-pen-down'); document.dispatchEvent(new Event('pointerup')); });
    await page.evaluate(() => new Promise(r => setTimeout(r, 250)));
    m = await medir(page);
    ok(m.lmode === 'rail', 'ao levantar a caneta aplica a mudança adiada', m.lmode);
    /* cancel também retoma; e sem listeners pendurados após detach */
    await page.evaluate(() => { document.body.classList.add('rm2-pen-down'); });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => new Promise(r => setTimeout(r, 120)));
    await page.evaluate(() => { window.RMLayout.detach(); document.body.classList.remove('rm2-pen-down'); document.dispatchEvent(new Event('pointerup')); });
    await page.evaluate(() => new Promise(r => setTimeout(r, 250)));
    ok(await page.evaluate(() => !document.documentElement.hasAttribute('data-rm-dock') && !document.documentElement.classList.contains('rm-l2')), 'detach com mudança adiada: nada volta a ser aplicado depois');
    await ctx.close();
  }

  sec('Bottom reserva o fim da página; side não reserva nada');
  {
    const { ctx, page } = await nova(1024, 768, false);
    await page.evaluate(() => { document.documentElement.style.setProperty('--rm-player-h', '120px'); document.getElementById('rm-l2-player').hidden = false; });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
    const r = await page.evaluate(() => { const last = document.querySelector('#s2-b02').getBoundingClientRect(), s = document.getElementById('rm-l2-player').getBoundingClientRect(); return { lastB: last.bottom, slotT: s.top, h: s.height }; });
    ok(r.lastB <= r.slotT + 0.5, 'bottom: o fim do último bloco fica acima do player (padding-bottom = --rm-player-h)', r);
    ok(Math.abs(r.h - 120) < 1, 'o slot tem a altura publicada em --rm-player-h', r);
    await ctx.close();
  }
  {
    const { ctx, page } = await nova(1920, 900, false);
    const m = await medir(page);
    ok(m.dock === 'side', '1920 aberta: side');
    const hs = await page.evaluate(() => { const H = document.documentElement; return { ph: getComputedStyle(H).getPropertyValue('--rm-player-h').trim(), pad: parseFloat(getComputedStyle(document.getElementById('materias-container')).paddingBottom) }; });
    ok(hs.ph === '0px' && hs.pad < 40, 'side: sem reserva inferior (--rm-player-h = 0)', hs);
    const before = await page.evaluate(() => document.querySelector('#s2-b01 p').getBoundingClientRect().toJSON());
    await page.evaluate(() => { const s = document.getElementById('rm-l2-player'); s.hidden = false; const st = document.createElement('div'); st.id = 'stub-player'; s.appendChild(st); });
    const after = await page.evaluate(() => document.querySelector('#s2-b01 p').getBoundingClientRect().toJSON());
    ok(JSON.stringify(before) === JSON.stringify(after), 'abrir o player lateral não desloca nenhum parágrafo (mesmo retângulo)', { before, after });
    const g = await page.evaluate(() => { const p = document.getElementById('stub-player').getBoundingClientRect(), c = document.querySelector('#s2-b01').getBoundingClientRect(), t = document.getElementById('fake-tools').getBoundingClientRect(), sd = document.querySelector('.rm-l2-side').getBoundingClientRect(); return { pl: p.left, pr: p.right, pt: p.top, pb: p.bottom, cr: c.right, tl: t.left, tt: t.top, tb: t.bottom, sr: sd.right }; });
    ok(g.pl >= g.cr, 'player lateral à direita do cartão (não cobre texto)', g);
    ok(g.pr <= g.tl + 0.5, 'player lateral à esquerda da toolbox (não cobre ferramentas)', g);
    ok(g.pl >= g.sr, 'player lateral à direita da lateral esquerda', g);
    await ctx.close();
  }

  sec('Decisão pura (rm-layout.js → RMLayout._dock) — tabela de referência');
  {
    const { ctx, page } = await nova(1440, 900, false);
    const r = await page.evaluate(() => { const D = window.RMLayout._dock, T = window.RMLayout._cartaoTeorico; return { d: [[1495, 264], [1627, 264], [1691, 264], [1700, 264], [1440, 64], [1491, 64], [1505, 64]].map(a => [a[0], a[1], D(a[0], a[1], null, null)]), t: T(1440, 64) }; });
    ok(r.d.map(x => x[2]).join() === 'bottom,bottom,side,side,bottom,side,side', 'fórmula (sem medida) concorda: aberta só a partir de ~1700; trilho só a partir de ~1500', r.d);
    ok(Math.abs(r.t - 1158.5) < 0.5, 'borda teórica do cartão a 1440 com trilho = 1158.5 (centrado)', r.t);
    await ctx.close();
  }

  /* ---------------------------------------------------------------------------------------------------------
     VIEWPORTS EXIGIDOS (22) × lateral aberta e minimizada: lateral (docked/rail/off), dock (side/bottom), 0 overflow,
     side não cobre cartão/toolbox/lateral e não desloca parágrafos, bottom reserva --rm-player-h (o último bloco não fica escondido) */
  const TODOS = [320, 390, 561, 600, 700, 767, 768, 1024, 1280, 1366, 1440, 1480, 1495, 1500, 1560, 1600, 1627, 1650, 1690, 1700, 1760, 1920];
  sec('22 viewports exigidos × lateral aberta/minimizada: lateral, dock, overflow, cobertura, reserva inferior');
  const resumo = [];
  for (const rail of [false, true]) {
    for (const w of TODOS) {
      const { ctx, page } = await nova(w, w < 768 ? 844 : 900, rail);
      const m = await medir(page);
      const esperado = rail ? (w >= 768 ? 'rail' : 'off') : (w >= 1200 ? 'docked' : (w >= 768 ? 'rail' : 'off'));
      const R = `${rail ? 'min' : 'aberta'} ${w}`;
      ok(m.lmode === esperado, `${R}: lateral = ${esperado}`, m.lmode);
      ok(m.dock === 'side' || m.dock === 'bottom', `${R}: data-rm-dock definido (${m.dock})`);
      ok(m.sw <= m.cw, `${R}: 0 overflow horizontal`, { sw: m.sw, cw: m.cw });
      const playerL = m.slotR - PE - m.pw, folga = playerL - (m.cardR + GAP);
      /* a raia direita (--rm-right-w = 67) só é reservada a partir de 768; abaixo disso a toolbox é um controle flutuante e o
         player inferior ocupa a largura toda (a convivência vertical dos dois nesse intervalo é assunto da #425, ver README) */
      if (w >= 768) ok(m.slotR <= m.toolsL + 0.5, `${R}: o slot termina à esquerda da toolbox`, { slotR: m.slotR, toolsL: m.toolsL });
      else ok(m.rightW === 0 && m.dock === 'bottom', `${R}: abaixo de 768 não há raia direita reservada e o dock é bottom (rightW=${m.rightW}, dock=${m.dock})`);
      if (m.dock === 'side') {
        ok(folga >= 0, `${R}: side ⇒ não cobre o cartão (folga ${Math.round(folga)}px)`, { folga });
        ok(playerL >= m.leftW + 100, `${R}: side ⇒ não cobre a lateral esquerda`);
        const antes = await page.evaluate(() => document.querySelector('#s2-b01 p').getBoundingClientRect().toJSON());
        await page.evaluate(() => { const sl = document.getElementById('rm-l2-player'); sl.hidden = false; const st = document.createElement('div'); st.id = 'stub-player'; sl.appendChild(st); });
        const depois = await page.evaluate(() => document.querySelector('#s2-b01 p').getBoundingClientRect().toJSON());
        ok(JSON.stringify(antes) === JSON.stringify(depois), `${R}: side ⇒ abrir o player não desloca parágrafos`, { antes, depois });
        const g = await page.evaluate(() => { const pl = document.getElementById('stub-player').getBoundingClientRect(), t = document.getElementById('fake-tools').getBoundingClientRect(), c = document.querySelector('#s2-b01').getBoundingClientRect(); return { pl: pl.left, pr: pl.right, tl: t.left, cr: c.right }; });
        ok(g.pl >= g.cr && g.pr <= g.tl + 0.5, `${R}: side ⇒ o player fica entre o cartão e a toolbox`, g);
      } else {
        ok(folga < 12 + 1, `${R}: bottom ⇒ de fato não cabia ao lado (folga ${Math.round(folga)}px)`, { folga });
        await page.evaluate(() => { document.documentElement.style.setProperty('--rm-player-h', '120px'); document.getElementById('rm-l2-player').hidden = false; });
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
        await page.evaluate(() => new Promise(r => setTimeout(r, 120)));
        const r = await page.evaluate(() => { const blocos = [...document.querySelectorAll('#tab-semio2 section[id]')]; const last = blocos[blocos.length - 1].getBoundingClientRect(), sl = document.getElementById('rm-l2-player').getBoundingClientRect(); return { lastB: last.bottom, slotT: sl.top, h: sl.height }; });
        ok(r.lastB <= r.slotT + 0.5, `${R}: bottom ⇒ o último bloco não fica escondido atrás do player (reserva --rm-player-h)`, r);
      }
      resumo.push([R, m.lmode, m.dock, Math.round(folga)]);
      await ctx.close();
    }
  }
  console.log('  tabela (viewport, lateral, dock, folga px):'); resumo.forEach(r => console.log('   ', r.join('\t')));

  sec('Rotação (retrato ↔ paisagem) e redimensionamento: lateral e dock coerentes, 0 overflow, sem oscilar');
  for (const [a, b, rotulo] of [[[844, 390], [390, 844], 'celular'], [[1024, 768], [768, 1024], 'tablet'], [[1366, 1024], [1024, 1366], 'tablet grande'], [[900, 600], [600, 900], '600/900']]) {
    const { ctx, page } = await nova(a[0], a[1], false);
    const seq = [];
    for (const [w, h] of [a, b, a, b, a]) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(() => new Promise(r => setTimeout(r, 90)));
      const m = await medir(page);
      const esperado = w >= 1200 ? 'docked' : (w >= 768 ? 'rail' : 'off');
      ok(m.lmode === esperado && m.sw <= m.cw, `${rotulo} ${w}×${h}: lateral ${esperado} e 0 overflow`, { lmode: m.lmode, sw: m.sw, cw: m.cw });
      seq.push(m.lmode + '/' + m.dock);
    }
    ok(seq[0] === seq[2] && seq[2] === seq[4] && seq[1] === seq[3], `${rotulo}: a volta à mesma orientação devolve exatamente o mesmo estado (${seq.join(' → ')})`);
    await ctx.close();
  }

  sec('Caneta no papel: resize pendente aplica ao levantar OU cancelar, uma única vez; detach não deixa listener nem timer');
  for (const fim of ['pointerup', 'pointercancel']) {
    const { ctx, page } = await nova(1520, 900, true);                  // trilho: o limiar do dock fica ≈ 1491
    await page.evaluate(() => {                                         // conta add/remove dos listeners de fim de contato (captura)
      window.__ev = { add: 0, rem: 0 }; const a = document.addEventListener.bind(document), r = document.removeEventListener.bind(document);
      document.addEventListener = (t, f, o) => { if (t === 'pointerup' || t === 'pointercancel') window.__ev.add++; return a(t, f, o); };
      document.removeEventListener = (t, f, o) => { if (t === 'pointerup' || t === 'pointercancel') window.__ev.rem++; return r(t, f, o); };
      window.__apl = 0; new MutationObserver(() => window.__apl++).observe(document.documentElement, { attributes: true, attributeFilter: ['data-rm-dock', 'data-rm-lmode'] });
    });
    const d0 = (await medir(page)).dock;
    await page.evaluate(() => { document.body.classList.add('rm2-pen-down'); });
    await page.setViewportSize({ width: 1480, height: 900 });            // cruza o limiar do dock em pleno traço
    await page.evaluate(() => new Promise(r => setTimeout(r, 150)));
    const meio = await medir(page);
    ok(meio.dock === d0 && meio.cw === 1480, `${fim}: em pleno traço o dock NÃO mudou (${d0} → ${meio.dock}) apesar do resize para 1480`, meio);
    ok(await page.evaluate(() => window.__apl) === 0, `${fim}: nenhuma escrita de data-rm-dock/lmode durante o contato`);
    await page.evaluate((f) => { document.body.classList.remove('rm2-pen-down'); document.dispatchEvent(new Event(f)); }, fim);
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
    const depois = await medir(page);
    ok(depois.dock !== d0, `${fim}: ao ${fim === 'pointerup' ? 'levantar' : 'cancelar'} a mudança pendente é aplicada (${d0} → ${depois.dock})`, depois);
    const ev = await page.evaluate(() => ({ ...window.__ev }));
    ok(ev.add >= 1 && ev.add === ev.rem, `${fim}: listeners de fim de contato removidos depois de aplicar (add=${ev.add}, remove=${ev.rem})`, ev);
    /* detach com pedido pendente: timers e listeners somem, nada é aplicado depois */
    await page.evaluate(() => { window.__ev.add = 0; window.__ev.rem = 0; document.body.classList.add('rm2-pen-down'); });
    await page.setViewportSize({ width: 1530, height: 900 });
    await page.evaluate(() => new Promise(r => setTimeout(r, 120)));
    await page.evaluate(() => window.RMLayout.detach());
    const evd = await page.evaluate(() => ({ ...window.__ev }));
    ok(evd.add >= 1 && evd.add === evd.rem, `${fim}: detach com mudança pendente remove os listeners (add=${evd.add}, remove=${evd.rem})`, evd);
    await page.evaluate(() => { window.__apl = 0; document.body.classList.remove('rm2-pen-down'); });
    await page.evaluate((f) => document.dispatchEvent(new Event(f)), fim);
    await page.evaluate(() => new Promise(r => setTimeout(r, 400)));
    ok(await page.evaluate(() => window.__apl === 0 && !document.documentElement.hasAttribute('data-rm-dock')), `${fim}: depois do detach nenhum timer aplica nada (0 escritas, sem data-rm-dock)`);
    await ctx.close();
  }

  /* ---------------------------------------------------------------------------------------------------------
     CONTRATO PUBLICADO AO AUDIOBOOK (rm-audio.css da main): #rm-l2-player · data-rm-dock="side|bottom" · --rm-player-w/-h/-edge.
     O player lateral do Audiobook se posiciona com `right: var(--rm-player-edge, 8px); width: var(--rm-player-w, 224px)` DENTRO do
     slot fixed (entre --rm-left-w e --rm-right-w): a geometria que ele obtém tem de ser a que o dock assumiu ao decidir `side`. */
  sec('Contrato com o Audiobook: variáveis publicadas e geometria do player lateral idêntica à assumida pelo dock');
  {
    const { ctx, page } = await nova(1920, 900, false);
    const v = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim(); const sl = document.getElementById('rm-l2-player'); return { w: g('--rm-player-w'), h: g('--rm-player-h'), edge: g('--rm-player-edge'), role: sl && sl.getAttribute('role'), hid: sl && sl.hidden, dock: document.documentElement.getAttribute('data-rm-dock') }; });
    ok(v.w === '224px' && v.edge === '8px' && v.h === '0px', 'o shell publica --rm-player-w=224px, --rm-player-edge=8px e --rm-player-h=0px (sem player)', v);
    ok(v.role === 'region' && v.hid === true && (v.dock === 'side' || v.dock === 'bottom'), 'slot #rm-l2-player (role=region, hidden sem player) e data-rm-dock publicado', v);
    await ctx.close();
  }
  for (const [w, rail] of [[1700, false], [1760, false], [1920, false], [1500, true], [1627, true], [1920, true]]) {
    const { ctx, page } = await nova(w, 900, rail);
    const R = `${rail ? 'trilho' : 'aberta'} ${w}`;
    const r = await page.evaluate(() => {
      const H = document.documentElement, cs = getComputedStyle(H), px = x => parseFloat(cs.getPropertyValue(x));
      const sl = document.getElementById('rm-l2-player'); sl.hidden = false;
      const pl = document.createElement('div'); pl.style.cssText = 'position:absolute;bottom:0;right:var(--rm-player-edge, 8px);width:var(--rm-player-w, 224px);height:60px';   // mesma regra do rm-audio.css (modo side)
      sl.appendChild(pl);
      const b = pl.getBoundingClientRect(), c = document.querySelector('#s2-b01').getBoundingClientRect(), t = document.getElementById('fake-tools').getBoundingClientRect(), sd = document.querySelector('.rm-l2-side').getBoundingClientRect();
      return { dock: H.getAttribute('data-rm-dock'), pl: b.left, pr: b.right, cardR: c.right, toolsL: t.left, sideR: sd.right, W: px('--rm-player-w'), E: px('--rm-player-edge'), cw: H.clientWidth, rw: px('--rm-right-w') };
    });
    ok(r.dock === 'side', `${R}: dock side`, r.dock);
    ok(Math.abs(r.pr - (r.cw - r.rw - r.E)) < 0.5 && Math.abs((r.pr - r.pl) - r.W) < 0.5, `${R}: o player do Audiobook ocupa exatamente [cw − --rm-right-w − edge − w, cw − --rm-right-w − edge]`, r);
    ok(r.pl >= r.cardR + 8 - 0.5, `${R}: o player lateral fica ≥ PLAYER_GAP (8px) à direita do cartão de conteúdo (folga ${Math.round(r.pl - r.cardR)}px)`, r);
    ok(r.pr <= r.toolsL + 0.5 && r.pl >= r.sideR, `${R}: e entre a lateral esquerda e a toolbox`, r);
    await ctx.close();
  }

  ok(erros.length === 0, 'sem erros de página', erros);
  await browser.close(); srv.close();
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
})();
