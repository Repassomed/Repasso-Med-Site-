/* PLAYER DO AUDIOBOOK no tema do piloto (Semiología II) — card na lateral (desktop) · barra compacta (celular/tablet) · convivência com a toolbox/caneta.
   Semiología II REAL + shell real + caneta V2 real + tema + **motor de áudio REAL** (mp3 gerado com ffmpeg; só o servidor é simulado — lib-player.cjs).
   O que se prova:
     A  tema desligado: nada muda (player original, sem atributos/botões do tema) · estático: o CSS do player não toca na auscultação nem usa seletor genérico;
     B  desktop 1440 e 1545×665 (lateral docked): card DENTRO da lateral, --rm-player-h = 0, nada cobre a folha, lista da lateral acima do card, controles ≥ 44 px,
        seek · ±15 · velocidade · play/pausa · progresso · retomada (Continuar), player único, aria-labels originais, caneta armada não encolhe o card;
     C  celular 320 e 390: barra de 1 linha (≤ 64 px), --rm-player-h = altura medida pelo motor, nenhum controle sobreposto, fim da página legível, tabela e post-it
        sem cobertura (por hit-test), card ampliado (seek/velocidade/±15 por TOQUE), toolbox aberta (dock ENCIMA da barra, sem sobrepor), caneta armada (chip + escrita real
        enquanto o áudio toca), borracha, desarmar volta ao normal;
     D  tablet 768 e desktop com a lateral minimizada (trilho): barra compacta ≤ 640 px, sem tocar a toolbox da direita;
     E  auscultação: os 6 <audio> intactos; tocar um pausa o audiobook;
     F  trocar de matéria e SIGNED_OUT (logout) param o áudio e desfazem tudo (inclusive «Sair» da faixa).
   Uso:  RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/player-sistema.test.cjs                                                                                  */
const fs = require('fs'), path = require('path');
const L = require('./lib-player.cjs');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = (t) => console.log('\n▸ ' + t);
const SITE = path.resolve(__dirname, '../../../../Repasso-Med-Site--main/Atual - Copia/assets');

/* ---------- medidas no navegador ---------- */
const GEO = () => {
  const R = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const vis = (e) => !!e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0;
  const q = (s) => document.querySelector(s), H = document.documentElement;
  const aud = q('.rm-audio'), slot = q('#rm-l2-player'), x = q('.rm-sis-aud-x');
  const dk = q('.rm2-box.open'), dkOn = !!dk && getComputedStyle(dk).display !== 'none';
  const ctl = {};
  [['toggle', '[data-a="toggle"]'], ['back', '[data-a="back"]'], ['fwd', '[data-a="fwd"]'], ['restart', '[data-a="restart"]'], ['close', '.rm-audio__close'], ['rate', '.rm-audio__rate'], ['seek', '.rm-audio__seek'], ['time', '.rm-audio__time'], ['title', '.rm-audio__title']]
    .forEach(([k, s]) => { const e = aud && aud.querySelector(s); ctl[k] = vis(e) ? R(e) : null; });
  const side = q('#rm-l2-side'), sc = q('.rm-l2-side-scroll'), foot = q('.rm-l2-side-foot'), band = q('#rm-l2-band');
  const secs = [...document.querySelectorAll('#tab-semio2 section.container')], last = secs[secs.length - 1];
  const cs = aud ? getComputedStyle(aud, '::before').content : '';
  return {
    vw: H.clientWidth, vh: innerHeight, sw: H.scrollWidth, dock: H.getAttribute('data-rm-dock'), lmode: H.getAttribute('data-rm-lmode'), force: H.getAttribute('data-rm-dock-force'),
    ph: parseFloat(H.style.getPropertyValue('--rm-player-h')), ah: parseFloat(H.style.getPropertyValue('--rm-audio-h')), tema: H.classList.contains('rm-sis'),
    n: document.querySelectorAll('.rm-audio').length, nSlot: document.querySelectorAll('#rm-l2-player').length,
    aud: aud && !aud.hidden ? R(aud) : null, mode: aud && aud.getAttribute('data-mode'), estado: aud && aud.getAttribute('data-state'), rotulo: cs, slotPen: !!slot && slot.hasAttribute('data-rm-pen'), slotX: !!slot && slot.hasAttribute('data-rm-sis-x'),
    xBtn: vis(x) ? R(x) : null, xExiste: !!x, xExp: x && x.getAttribute('aria-expanded'), ctl, side: R(side), scroll: R(sc), foot: R(foot), band: R(band),
    dock_: dkOn ? R(dk) : null, ultima: last ? R(last) : null, prog: slot ? slot.style.getPropertyValue('--rm-sis-prog') : '',
    cardAtr: H.hasAttribute('data-rm-aud-card'), tools: H.getAttribute('data-rm-tools')
  };
};
const geo = (page) => page.evaluate(GEO);
const inter = (a, b) => !!a && !!b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
const motor = L.motor;

/* cobertura por hit-test: a parte do elemento que fica entre a faixa e o topo do que está fixo embaixo (player/dock) NÃO pode ser coberta;
   depois rola até o fim do elemento ficar acima do que é fixo e confere que a ÚLTIMA linha é legível. */
const COBERTURA = ([sel, nth]) => {
  const el = document.querySelectorAll(sel)[nth || 0]; if (!el) return { erro: 'sem elemento ' + sel };
  const band = document.getElementById('rm-l2-band').getBoundingClientRect().bottom;
  const obst = () => ['.rm-audio', '.rm2-box.open'].map(s => document.querySelector(s)).filter(e => e && !e.hidden && getComputedStyle(e).display !== 'none').map(e => e.getBoundingClientRect());
  const topFixo = (er) => Math.min(innerHeight, ...obst().filter(r => r.right > er.left && r.left < er.right).map(r => r.top));
  const dentro = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && el.contains(h); };
  let er = el.getBoundingClientRect(); window.scrollBy(0, er.top - (band + 8)); er = el.getBoundingClientRect();
  let tf = topFixo(er), livre = tf - (band + 8), falhas = [], pts = 0;
  const y0 = Math.max(er.top, band + 6) + 14, y1 = Math.min(er.bottom, tf - 2) - 14;                     // folga das bordas: o post-it é levemente girado (os cantos do retângulo não são o elemento)
  for (let y = y0; y <= y1; y += 14) for (const x of [er.left + 24, (er.left + er.right) / 2, er.right - 24]) { pts++; if (!dentro(x, y)) falhas.push([Math.round(x), Math.round(y)]); }
  /* fim do elemento acima do que é fixo */
  window.scrollBy(0, er.bottom - (tf - 4)); er = el.getBoundingClientRect(); tf = topFixo(er);
  const fim = er.bottom <= tf + 1 && dentro((er.left + er.right) / 2, er.bottom - 12) && dentro(er.left + 24, er.bottom - 12);
  return { livre: Math.round(livre), alto: Math.round(er.height), pts, falhas: falhas.slice(0, 4), nFalhas: falhas.length, fim, bandBottom: Math.round(band) };
};
const cobertura = (page, sel, nth) => page.evaluate(COBERTURA, [sel, nth]);

const ESCREVER = async ({ sel }) => {                                  // traço com «caneta» (pointerType pen) sobre o parágrafo do post-it
  const esp = ms => new Promise(o => setTimeout(o, ms)); const el = document.querySelector(sel), b = el.getBoundingClientRect();
  const x0 = b.left + 14, y0 = b.top + 12;
  const fire = (ty, x, y, bt) => el.dispatchEvent(new PointerEvent(ty, { pointerType: 'pen', pointerId: 31, isPrimary: true, clientX: x, clientY: y, buttons: bt, bubbles: true, cancelable: true, pressure: bt ? .5 : 0 }));
  fire('pointerover', x0, y0, 0); fire('pointerdown', x0, y0, 1);
  for (let i = 1; i <= 18; i++) { fire('pointermove', x0 + i * 8, y0 + Math.sin(i / 2) * 6, 1); await esp(14); }
  fire('pointerup', x0 + 144, y0, 0); await esp(700);
};

async function ir(page, sel, nth, off) {
  await page.evaluate(([s, k]) => window.RMLayout.irPara(document.querySelectorAll(s)[k || 0]), [sel, nth || 0]); await page.waitForTimeout(1700);
  if (off) { await page.evaluate(o => window.scrollBy(0, -o), off); await page.waitForTimeout(350); }
}
const tocarUI = (page, mov, sel) => mov ? page.tap(sel) : page.click(sel);
async function fecharToolbox(page, mov) {
  await page.evaluate(() => { try { window.RMToolsV2.escolherFerramenta('none'); } catch (e) {} }); await page.waitForTimeout(250);
  if (await page.evaluate(() => document.querySelector('.rm2-box').classList.contains('open'))) { await (mov ? page.tap('.rm-sis-tools') : page.click('#rm2-fab')); await page.waitForTimeout(450); }
}
async function abrirToolbox(page, mov) { await fecharToolbox(page, mov); await (mov ? page.tap('.rm-sis-tools') : page.click('#rm2-fab')); await page.waitForTimeout(600); }
async function armar(page, mov, t) { await abrirToolbox(page, mov); await tocarUI(page, mov, `.rm2-btn[data-t="${t}"]`); await page.waitForTimeout(600); }

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia();
  const br = await chromium.launch();
  const abrir = (o) => L.abrir(br, base, midia, o);

  /* =============================== A · tema desligado + estático =============================== */
  sec('A · tema DESLIGADO (visual:false): o player original continua como está');
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page, errs } = await abrir({ w, h, visual: false });
    await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(600);
    const g = await geo(page);
    ok(!g.tema && !g.force && !g.xExiste && g.cardAtr === false, `${w}: sem classe do tema, sem data-rm-dock-force, sem botão ampliar`, { tema: g.tema, force: g.force, x: g.xExiste });
    ok(g.mode === 'bottom' && g.aud && g.aud.h >= 100 && Math.abs(g.ph - g.aud.h) <= 1, `${w}: player ORIGINAL embaixo (${g.aud && g.aud.h} px) e --rm-player-h = altura medida (${g.ph})`, { mode: g.mode, aud: g.aud, ph: g.ph });
    await page.click('.rm-audio__main'); await page.waitForTimeout(400);
    ok((await motor(page)).state === 'paused', `${w}: pausa pelo botão original`);
    ok(errs.length === 0, `${w}: 0 erros JS`, errs);
    await ctx.close();
  }
  sec('A2 · estático: o CSS do player (5-D) só parte de #rm-l2-player / .rm-sis-aud-x / lateral / .rm2-box e não toca a auscultação');
  {
    const css = fs.readFileSync(path.join(SITE, 'rm-materia-sistema.css'), 'utf8');
    const i0 = css.lastIndexOf('/*', css.indexOf('5-D · PLAYER DO AUDIOBOOK')), i1 = css.lastIndexOf('/*', css.indexOf('6 · C-02'));
    ok(i0 > 0 && i1 > i0, 'bloco 5-D encontrado');
    const bloco = css.slice(i0, i1).replace(/\/\*[\s\S]*?\*\//g, '');
    const seletores = []; bloco.replace(/([^{}]+)\{/g, (m, s) => { s = s.trim(); if (!s || /^@/.test(s) || /^\d+%$/.test(s)) return m; s.split(/,(?![^(]*\))/).forEach(x => seletores.push(x.trim())); return m; });
    const permitido = /^html\.rm-sis(\.rm-l2)?(\[[^\]]+\])*\s+(#rm-l2-player|\.rm-sis-aud-x|\.rm-l2-side-scroll|\.rm2-box|\.rm2-panel)/;
    const fora = seletores.filter(s => !permitido.test(s));
    ok(seletores.length > 40 && fora.length === 0, `${seletores.length} seletores, todos sob html.rm-sis e restritos ao player/lateral/toolbox`, fora.slice(0, 4));
    ok(!/audio-player|\baudio\b[^_-]|<audio|\.sound|rmfc|quiz|figure|table/.test(seletores.join(' ').replace(/rm-audio/g, '')), 'nenhum seletor menciona auscultação (audio-player / audio), perguntas, flashcards, figuras ou tabelas');
  }

  /* =============================== B · desktop (lateral docked) =============================== */
  for (const [w, h] of [[1440, 900], [1545, 665]]) {
    sec(`B · desktop ${w}×${h}: card compacto dentro da lateral colorida`);
    const { ctx, page, errs, reqs } = await abrir({ w, h });
    const antes = await geo(page);
    ok(antes.aud === null && antes.nSlot === 1, 'antes de tocar: o slot existe e o player está fechado (nada ocupa a tela)');
    await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(700);
    let g = await geo(page);
    ok(g.lmode === 'docked' && g.force === 'side' && g.dock === 'side' && g.mode === 'lateral', 'lateral docked: o tema pediu «side» e o motor entrou em modo lateral', { lmode: g.lmode, force: g.force, dock: g.dock, mode: g.mode });
    ok(g.ph === 0, '--rm-player-h = 0 (a medição do motor publica 0 no modo lateral: nada é reservado nem empurrado)', g.ph);
    ok(g.n === 1 && g.nSlot === 1, 'player único (1 .rm-audio, 1 #rm-l2-player)');
    ok(g.aud && g.aud.l >= 0 && g.aud.r <= g.side.r && g.aud.w <= 264 && g.aud.h <= 200, `card DENTRO da lateral: ${g.aud.w}×${g.aud.h} em x ${g.aud.l}–${g.aud.r} (lateral ${g.side.r})`, g.aud);
    ok(g.aud.t >= g.band.b && g.aud.b <= g.foot.t - 2, 'card entre a faixa e o rodapé da lateral («Volver arriba»/«Sugerencias» não ficam cobertos)', { aud: g.aud, foot: g.foot });
    ok(g.scroll.b <= g.aud.t + 1, `a lista do índice termina ACIMA do card (nada do índice fica por trás): lista até ${g.scroll.b}, card desde ${g.aud.t}`);
    ok(g.scroll.h >= 120, `a lista da lateral continua utilizável (${g.scroll.h} px de altura)`);
    const folha = await page.evaluate(() => { const c = document.querySelector('#tab-semio2 section.container'); const b = c.getBoundingClientRect(); return { l: b.left }; });
    ok(g.aud.r <= folha.l, 'o card não invade a folha de leitura (a folha começa depois da lateral)', { cardR: g.aud.r, folhaL: folha.l });
    ok(Math.abs(g.ah - g.aud.h) <= 1, `--rm-audio-h = altura do card (${g.ah} ≈ ${g.aud.h})`);
    ok(/Reproduciendo/.test(g.rotulo), `estado visível: ${g.rotulo}`);
    const hit = await page.evaluate(() => { const a = document.querySelector('.rm-audio').getBoundingClientRect(); const e = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2); return !!e && !!e.closest('.rm-audio'); });
    ok(hit, 'o centro do card recebe o toque (nada o cobre)');
    const c = g.ctl;
    ok(['toggle', 'back', 'fwd', 'restart', 'close', 'rate'].every(k => c[k] && c[k].w >= 43.5 && c[k].h >= 43.5), 'play/pausa, −15, +15, reiniciar, velocidade e fechar: alvos ≥ 44×44', Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v && [v.w, v.h]])));
    ok(c.seek && c.seek.h >= 43.5 && c.seek.w > 150, `barra de posição: ${c.seek && c.seek.w}×${c.seek && c.seek.h} (altura ≥ 44)`);
    ok(c.title && c.time, 'título e progresso (m:ss / m:ss) visíveis');
    const rot = await page.evaluate(() => ({
      reg: document.querySelector('.rm-audio').getAttribute('aria-label'), slot: document.getElementById('rm-l2-player').getAttribute('aria-label'),
      l: [...document.querySelectorAll('.rm-audio [aria-label]')].map(e => e.getAttribute('aria-label')), titulo: document.querySelector('.rm-audio__title').textContent
    }));
    ok(rot.reg === 'Audiolibro' && rot.slot === 'Audiobook', 'regiões: «Audiolibro» (player) e «Audiobook» (slot) com os aria-labels originais', rot);
    ok(['Cerrar el audiolibro', 'Posición del audio', 'Reiniciar desde el principio', 'Retroceder 15 segundos', 'Pausar', 'Avanzar 15 segundos', 'Velocidad de reproducción'].every(x => rot.l.includes(x)), 'aria-labels dos controles preservados', rot.l);
    ok(rot.titulo === L.ITENS[0].title, 'título = o do manifesto', rot.titulo);
    /* ----- funções ----- */
    await page.click('[data-a="toggle"]'); await page.waitForTimeout(500);
    let m = await motor(page); const p0 = m.position;
    ok(m.state === 'paused', 'pausa pelo botão do card'); g = await geo(page);
    ok(/En pausa/.test(g.rotulo), `estado visível na pausa: ${g.rotulo}`);
    ok(g.ph === 0 && g.aud, 'em pausa o card continua visível e --rm-player-h continua 0');
    await page.click('[data-a="fwd"]'); await page.waitForTimeout(300); m = await motor(page);
    ok(Math.abs(m.position - (p0 + 15)) < 1.5, `+15 s: ${p0.toFixed(1)} → ${m.position.toFixed(1)}`);
    await page.click('[data-a="back"]'); await page.waitForTimeout(300); m = await motor(page);
    ok(Math.abs(m.position - p0) < 1.5, `−15 s: volta a ${m.position.toFixed(1)}`);
    const sb = (await geo(page)).ctl.seek;
    await page.mouse.click(sb.l + sb.w * 0.5, sb.t + sb.h / 2); await page.waitForTimeout(500); m = await motor(page);
    ok(m.position > 30 && m.position < 60, `seek (clique a 50 %): posição ${m.position.toFixed(1)} de ${m.duration}`);
    g = await geo(page);
    ok(Math.abs(parseFloat(g.prog) - (m.position / m.duration) * 100) < 6, `progresso espelhado para o CSS: ${g.prog} ≈ ${(m.position / m.duration * 100).toFixed(0)} %`);
    await page.selectOption('.rm-audio__rate', '1.5'); await page.waitForTimeout(300);
    ok((await motor(page)).rate === 1.5, 'velocidade 1,5×');
    await page.selectOption('.rm-audio__rate', '1'); await page.waitForTimeout(200);
    await page.click('[data-a="toggle"]'); await page.waitForTimeout(700);
    ok((await motor(page)).state === 'playing', 'play pelo botão do card');
    /* ----- caneta armada: o card desktop NÃO encolhe ----- */
    await page.evaluate(() => window.RMLayout.irPara(document.querySelector('#s2-b04 .rm-postit'))); await page.waitForTimeout(1500);
    await page.click('#rm2-fab'); await page.waitForTimeout(500); await page.click('.rm2-btn[data-t="pen"]'); await page.waitForTimeout(600);
    g = await geo(page);
    ok(g.slotPen, 'caneta armada (slot recebe data-rm-pen do boot)');
    ok(['back', 'fwd', 'rate', 'seek', 'restart', 'toggle', 'close'].every(k => g.ctl[k] && g.ctl[k].h >= 43.5), 'com a caneta armada o card da lateral continua COMPLETO (seek, ±15, velocidade, reiniciar)');
    const tb = await page.evaluate(() => { const r = document.querySelector('.rm2-box').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    ok(!inter({ l: g.aud.l, t: g.aud.t, r: g.aud.r, b: g.aud.b }, tb), 'o card não toca a toolbox da direita');
    m = await motor(page); ok(m.state === 'playing', 'o áudio segue tocando com a caneta armada');
    await fecharToolbox(page, false);
    /* ----- fim da página ----- */
    await L.irAoFim(page); g = await geo(page);
    ok(g.ultima.b <= g.vh + 0.5 && g.ultima.b > g.vh - 160, `fim da página: a última folha termina em ${g.ultima.b} (janela ${g.vh}) — nada por cima (o card está na lateral)`);
    /* ----- pausa → fecha → retoma ----- */
    await page.click('[data-a="toggle"]'); await page.waitForTimeout(400); const pPausa = (await motor(page)).position;
    await page.click('.rm-audio__close'); await page.waitForTimeout(500);
    g = await geo(page); m = await motor(page);
    ok(g.aud === null && m.open === false && g.ph === 0 && !g.cardAtr, 'fechar (×): o card some, --rm-player-h = 0 e a reserva da lateral é desfeita');
    ok(await page.evaluate(() => document.querySelector('.rm-l2-side-scroll').style.marginBottom === '' && getComputedStyle(document.querySelector('.rm-l2-side-scroll')).marginBottom === '0px'), 'a lista da lateral volta a ocupar o espaço todo');
    await page.evaluate(() => document.querySelector('.rm-audio-card[data-audio-id="s2-b01-motivo"]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(400);
    const rotCard = await page.evaluate(() => document.querySelector('.rm-audio-card[data-audio-id="s2-b01-motivo"] button').textContent);
    ok(/^Continuar · \d+:\d\d$/.test(rotCard), `o card do bloco oferece «${rotCard}» (posição guardada)`);
    await page.evaluate(() => document.querySelector('.rm-audio-card[data-audio-id="s2-b01-motivo"] button').click());
    await page.waitForFunction(() => { const s = window.RMAudioBoot._estado(); return s.motor && s.motor.state === 'playing'; }, null, { timeout: 12000 });
    m = await motor(page); ok(Math.abs(m.position - pPausa) < 4, `retoma de onde parou: ${pPausa.toFixed(1)} → ${m.position.toFixed(1)}`);
    ok(reqs.manifest === 1, 'manifesto pedido uma vez; mídia só depois do play', reqs);
    ok(errs.length === 0, `${w}: 0 erros JS`, errs);
    await ctx.close();
  }
  sec('B2 · janelas baixas/estreitas com a lateral docked (1545×665, 1280×720, 1200×700, 1440×560): card inteiro e a lateral ainda mostra o índice');
  for (const [w, h] of [[1545, 665], [1280, 720], [1200, 700], [1440, 560]]) {
    const { ctx, page } = await abrir({ w, h });
    await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(600); const g = await geo(page);
    ok(g.mode === 'lateral' && g.ph === 0 && g.aud.l >= 0 && g.aud.r <= g.side.r, `${w}×${h}: card na lateral (--rm-player-h = ${g.ph}), ${g.aud.w}×${g.aud.h}`, { mode: g.mode, aud: g.aud });
    ok(g.aud.t >= g.band.b + 4 && g.aud.b <= g.foot.t - 2, `${w}×${h}: card inteiro dentro da janela (topo ${g.aud.t}, base ${g.aud.b}, janela ${g.vh}) e acima do rodapé da lateral`);
    ok(g.scroll.h >= 130 && g.scroll.b <= g.aud.t + 1, `${w}×${h}: a lista do índice tem ${g.scroll.h} px (rola) e termina acima do card`);
    ok(h > 760 || g.aud.h <= 125, `${w}×${h}: em janela baixa o card é compacto (${g.aud.h} px)`);
    await ctx.close();
  }

  sec('B3 · janela baixíssima (≤ 539 px de altura): sem card na lateral — barra compacta; ao crescer a janela o card volta');
  {
    const { ctx, page, errs } = await abrir({ w: 1440, h: 500 });
    await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(900);
    let g = await geo(page);
    ok(!g.force && g.dock === 'bottom' && g.mode === 'bottom' && g.aud.h <= 90 && g.aud.w <= 640.5, `1440×500: barra compacta ${g.aud && g.aud.w}×${g.aud && g.aud.h} (a lateral não comporta card + índice)`, { force: g.force, dock: g.dock, mode: g.mode, aud: g.aud });
    ok(Math.abs(g.ph - g.aud.h) <= 1, `--rm-player-h = altura medida (${g.ph})`);
    await page.setViewportSize({ width: 1440, height: 760 }); await page.waitForTimeout(1200); g = await geo(page);
    ok(g.force === 'side' && g.dock === 'side' && g.mode === 'lateral' && g.ph === 0, 'janela cresce para 760: o card volta à lateral e --rm-player-h = 0', { force: g.force, dock: g.dock, mode: g.mode, ph: g.ph });
    ok(g.aud && g.aud.r <= g.side.r && g.aud.b <= g.foot.t - 2, 'card dentro da lateral, acima do rodapé dela');
    await page.setViewportSize({ width: 1440, height: 500 }); await page.waitForTimeout(1200); g = await geo(page);
    ok(!g.force && g.mode === 'bottom' && Math.abs(g.ph - g.aud.h) <= 1, 'janela volta a 500: barra compacta de novo e --rm-player-h acompanha');
    ok((await motor(page)).state === 'playing', 'o áudio não parou nas trocas de forma');
    ok(errs.length === 0, 'B3: 0 erros JS', errs);
    await ctx.close();
  }

  /* =============================== C · celular =============================== */
  for (const [w, h] of [[390, 844], [320, 640]]) {
    sec(`C · celular ${w}×${h}: barra compacta`);
    const { ctx, page, errs } = await abrir({ w, h });
    await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(800);
    let g = await geo(page);
    const barraH = g.aud.h;
    ok(g.mode === 'bottom' && g.dock === 'bottom' && g.force === 'side', 'celular: modo inferior (a lateral docked não existe)', { mode: g.mode, dock: g.dock });
    ok(barraH <= 64, `barra de 1 linha: ${barraH} px (antes: 135 px)`);
    ok(Math.abs(g.ph - barraH) <= 1, `--rm-player-h = altura medida pelo motor (${g.ph} ≈ ${barraH})`);
    ok(g.aud.l === 0 && Math.abs(g.aud.w - g.vw) <= 1 && Math.abs(g.aud.b - g.vh) <= 1, 'largura toda, colada ao rodapé', g.aud);
    ok(g.sw <= g.vw, 'sem rolagem horizontal');
    const cc = g.ctl;
    ok(['toggle', 'back', 'fwd', 'close'].every(k => cc[k] && cc[k].w >= 43.5 && cc[k].h >= 43.5) && g.xBtn && g.xBtn.w >= 43.5 && g.xBtn.h >= 43.5, 'play/pausa, −15, +15, fechar e ampliar: alvos ≥ 44×44', Object.fromEntries(Object.entries(cc).map(([k, v]) => [k, v && [v.w, v.h]])));
    const lista = [['toggle', cc.toggle], ['back', cc.back], ['fwd', cc.fwd], ['close', cc.close], ...(cc.rate ? [['rate', cc.rate]] : []), ['ampliar', g.xBtn]];
    let sobre = []; for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) if (inter(lista[i][1], lista[j][1])) sobre.push(lista[i][0] + '×' + lista[j][0]);
    ok(sobre.length === 0, 'nenhum controle sobreposto a outro', sobre);
    ok(g.ctl.title && g.ctl.title.w >= (w === 320 ? 60 : 120), `título legível (${g.ctl.title && g.ctl.title.w} px de largura útil)`);
    ok(/^\d/.test(await page.evaluate(() => document.querySelector('.rm-audio__time').textContent)), 'progresso (m:ss / m:ss) visível');
    ok(g.band.b <= 60, `faixa fixa no topo (${g.band.b} px) — «Sair» e «Herramientas» continuam lá`);
    const sair = await page.evaluate(() => { const e = document.querySelector('.rm-sis-out'), t = document.querySelector('.rm-sis-tools'); const f = (x) => { if (!x) return null; const b = x.getBoundingClientRect(); return [b.width, b.height, b.top < 60]; }; return { sair: f(e), tools: f(t) }; });
    ok(sair.sair && sair.sair[0] >= 43.5 && sair.sair[2] && sair.tools && sair.tools[0] >= 43.5 && sair.tools[2], '«Sair» e «Herramientas» no topo, alvos ≥ 44', sair);
    /* ----- tabela e post-it com o player tocando ----- */
    await ir(page, '#s2-b01 .rm-sis-tabtag', 1, 0);
    let cv = await cobertura(page, '#s2-b01 table', 1);
    ok(!cv.erro && cv.nFalhas === 0 && cv.pts > 8, `tabela: ${cv.pts} pontos entre a faixa e o player, nenhum coberto (livre ${cv.livre} px, tabela ${cv.alto} px)`, cv);
    ok(cv.fim, 'tabela: a ÚLTIMA linha rola até ficar acima do player e é legível');
    await ir(page, '#s2-b04 .rm-postit', 0, 0);
    cv = await cobertura(page, '#s2-b04 .rm-postit', 0);
    ok(!cv.erro && cv.nFalhas === 0 && cv.pts > 8, `post-it: ${cv.pts} pontos, nenhum coberto (livre ${cv.livre} px, post-it ${cv.alto} px)`, cv);
    ok(cv.fim, 'post-it: a ÚLTIMA linha (fonte) rola até ficar acima do player e é legível');
    /* ----- auscultação (os <audio> da matéria): rola até ela e confere o último player/legenda ----- */
    await ir(page, '#s2-b01 .audio-player', 0, 0);
    cv = await cobertura(page, '#s2-b01 .audio-player', 0);
    ok(!cv.erro && cv.nFalhas === 0, `auscultação: o player de áudio da matéria fica descoberto (${cv.pts} pontos)`, cv);
    /* ----- fim da página ----- */
    await L.irAoFim(page); g = await geo(page);
    ok(g.ultima.b <= g.aud.t + 0.5, `fim da página: a última folha termina em ${g.ultima.b}, acima do player (${g.aud.t})`);
    /* ----- ampliar (seek, ±15, velocidade por TOQUE) ----- */
    await ir(page, '#s2-b04 .rm-postit', 0, 60);
    await page.tap('.rm-sis-aud-x'); await page.waitForTimeout(600); g = await geo(page);
    ok(g.slotX && g.xExp === 'true', 'ampliado: botão com aria-expanded=true');
    ok(g.aud.h > barraH + 60 && g.aud.h <= 190, `card ampliado: ${g.aud.h} px (barra ${barraH})`);
    ok(Math.abs(g.ph - g.aud.h) <= 1, `--rm-player-h re-medido pelo motor: ${g.ph} ≈ ${g.aud.h}`);
    ok(['toggle', 'back', 'fwd', 'restart', 'rate', 'close'].every(k => g.ctl[k] && g.ctl[k].w >= 43.5 && g.ctl[k].h >= 43.5) && g.ctl.seek && g.ctl.seek.h >= 43.5 && g.xBtn && g.xBtn.w >= 43.5, 'ampliado: todos os controles ≥ 44 px (inclui seek e velocidade)');
    ok(g.aud.l >= 0 && g.aud.r <= g.vw + 0.5 && g.sw <= g.vw && Object.values(g.ctl).every(v => !v || (v.l >= -0.5 && v.r <= g.vw + 0.5)), 'ampliado: tudo dentro da largura da tela, sem rolagem horizontal');
    lista.length = 0; ['toggle', 'back', 'fwd', 'restart', 'rate', 'close'].forEach(k => lista.push([k, g.ctl[k]])); lista.push(['ampliar', g.xBtn]);
    sobre = []; for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) if (inter(lista[i][1], lista[j][1])) sobre.push(lista[i][0] + '×' + lista[j][0]);
    ok(sobre.length === 0, 'ampliado: nenhum controle sobreposto', sobre);
    await page.tap('[data-a="toggle"]'); await page.waitForTimeout(500); let m = await motor(page); const p0 = m.position;
    ok(m.state === 'paused', 'toque em play/pausa');
    await page.tap('[data-a="fwd"]'); await page.waitForTimeout(300); m = await motor(page);
    ok(Math.abs(m.position - (p0 + 15)) < 1.5, `+15 s por toque: ${p0.toFixed(1)} → ${m.position.toFixed(1)}`);
    await page.tap('[data-a="back"]'); await page.waitForTimeout(300); m = await motor(page);
    ok(Math.abs(m.position - p0) < 1.5, `−15 s por toque: ${m.position.toFixed(1)}`);
    const sk = (await geo(page)).ctl.seek;
    await page.touchscreen.tap(sk.l + sk.w * 0.75, sk.t + sk.h / 2); await page.waitForTimeout(500); m = await motor(page);
    ok(m.position > 50 && m.position < 85, `seek por toque a 75 %: ${m.position.toFixed(1)} de ${m.duration}`);
    await page.selectOption('.rm-audio__rate', '1.25'); await page.waitForTimeout(300);
    ok((await motor(page)).rate === 1.25, 'velocidade 1,25× no card ampliado');
    await page.selectOption('.rm-audio__rate', '1'); await page.waitForTimeout(200);
    await page.tap('[data-a="toggle"]'); await page.waitForTimeout(700);
    ok((await motor(page)).state === 'playing', 'toque: volta a tocar');
    await page.tap('.rm-sis-aud-x'); await page.waitForTimeout(600); g = await geo(page);
    ok(!g.slotX && Math.abs(g.aud.h - barraH) <= 1 && Math.abs(g.ph - g.aud.h) <= 1, `reduzir: volta à barra (${g.aud.h} px) e --rm-player-h acompanha (${g.ph})`);
    /* ----- toolbox ABERTA: o player fica recolhido e o dock fica ENCIMA dele ----- */
    await ir(page, '#s2-b04 .rm-postit', 0, 60);
    await page.tap('.rm-sis-aud-x'); await page.waitForTimeout(500);              // deixa AMPLIADO e então abre a toolbox: ela tem de recolher o player
    await abrirToolbox(page, true); g = await geo(page);
    ok(!g.slotX && g.xBtn === null, 'toolbox aberta: o player volta à barra e o botão «ampliar» some (não há espaço para os dois cartões)');
    ok(g.dock_ && Math.abs(g.dock_.b - g.aud.t) <= 1.5, `o dock da toolbox assenta ENCIMA da barra (dock até ${g.dock_ && g.dock_.b}, barra desde ${g.aud.t})`);
    ok(!inter(g.dock_, g.aud) && g.dock_.h >= 44, `dock ${g.dock_.h} px, sem sobrepor a barra`);
    ok(g.dock_.t - g.band.b >= (h >= 800 ? 300 : 160), `sobra ${Math.round(g.dock_.t - g.band.b)} px de leitura entre a faixa e o dock`);
    cv = await cobertura(page, '#s2-b04 .rm-postit', 0);
    ok(!cv.erro && cv.nFalhas === 0 && cv.fim, `post-it com toolbox aberta + player: nenhum ponto coberto e a última linha fica legível (livre ${cv.livre} px)`, cv);
    await ir(page, '#s2-b01 .rm-sis-tabtag', 1, 0); cv = await cobertura(page, '#s2-b01 table', 1);
    ok(!cv.erro && cv.nFalhas === 0 && cv.fim, `tabela com toolbox aberta + player: nenhum ponto coberto e a última linha fica legível`, cv);
    await L.irAoFim(page); g = await geo(page);
    ok(g.ultima.b <= Math.min(g.aud.t, g.dock_.t) + 0.5, `fim da página com toolbox + player: última folha em ${g.ultima.b}, acima do dock (${g.dock_.t})`);
    /* ----- caneta ARMADA: chip + escrita enquanto o áudio toca ----- */
    await ir(page, '#s2-b04 .rm-postit', 0, 60);
    await armar(page, true, 'pen'); g = await geo(page);
    ok(g.slotPen, 'caneta armada: o boot marca o slot (data-rm-pen)');
    ok(g.aud.h <= 60 && Math.abs(g.ph - g.aud.h) <= 1, `chip: ${g.aud.h} px e --rm-player-h = ${g.ph}`);
    ok(g.ctl.toggle && g.ctl.close && g.ctl.toggle.w >= 43.5 && g.ctl.close.w >= 43.5 && g.ctl.title && g.xBtn === null, 'chip: título + play/pausa + fechar (≥ 44 px), sem «ampliar»');
    ok(g.dock_ && Math.abs(g.dock_.b - g.aud.t) <= 1.5 && !inter(g.dock_, g.aud), 'caneta + toolbox + chip: o dock assenta encima do chip, sem sobrepor');
    m = await motor(page); const pc0 = m.position; ok(m.state === 'playing', 'o áudio segue tocando com a caneta armada');
    const w0 = await page.evaluate(() => window.__writes.filter(x => /^insert:user_ink_strokes/.test(x)).length);
    await page.evaluate(ESCREVER, { sel: '#s2-b04 .rm-postit p' }); await page.waitForTimeout(900);
    const w1 = await page.evaluate(() => window.__writes.filter(x => /^insert:user_ink_strokes/.test(x)).length);
    ok(w1 === w0 + 1, `ESCRITA com a caneta: 1 traço gravado pelo motor da V2 (${w0} → ${w1}) com o player tocando`);
    ok(await page.evaluate(() => !!document.querySelector('#rm2-ink svg[data-anchor] path')), 'o traço aparece na página (SVG da tinta)');
    m = await motor(page); ok(m.state === 'playing' && m.position > pc0, `o áudio não parou durante a escrita (${pc0.toFixed(1)} → ${m.position.toFixed(1)})`);
    await page.tap('[data-a="toggle"]'); await page.waitForTimeout(500);
    ok((await motor(page)).state === 'paused', 'chip: pausar por toque funciona com a caneta armada');
    await page.tap('[data-a="toggle"]'); await page.waitForTimeout(700);
    /* borracha armada também é chip */
    await tocarUI(page, true, '.rm2-btn[data-t="eraser"]'); await page.waitForTimeout(600); g = await geo(page);
    ok(g.slotPen && g.aud.h <= 60, `borracha armada: também chip (${g.aud.h} px)`);
    /* desarma: volta à barra normal */
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await page.waitForTimeout(700); g = await geo(page);
    ok(!g.slotPen && Math.abs(g.aud.h - barraH) <= 1 && Math.abs(g.ph - g.aud.h) <= 1, `caneta desarmada: volta à barra de ${g.aud.h} px e --rm-player-h = ${g.ph}`);
    await fecharToolbox(page, true); await page.waitForTimeout(500); g = await geo(page);
    ok(g.xBtn && g.xBtn.w >= 43.5, 'toolbox fechada: o botão «ampliar» volta');
    ok(g.sw <= g.vw, 'sem rolagem horizontal ao final');
    ok(errs.length === 0, `${w}: 0 erros JS`, errs);
    await ctx.close();
  }

  /* =============================== D · tablet e trilho =============================== */
  for (const [w, h, o, rotulo] of [[768, 1024, {}, 'tablet 768×1024'], [1440, 900, { railMin: true }, 'desktop com a lateral minimizada (trilho)']]) {
    sec(`D · ${rotulo}: barra compacta`);
    const { ctx, page, errs } = await abrir({ w, h, ...o });
    await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(800);
    let g = await geo(page);
    ok(g.lmode === 'rail' && g.dock === 'bottom' && g.mode === 'bottom', 'trilho: o card da lateral não se aplica; o player é a barra inferior', { lmode: g.lmode, dock: g.dock, mode: g.mode });
    ok(g.aud.h <= 90 && g.aud.w <= 640.5, `barra compacta ${g.aud.w}×${g.aud.h} (antes: ${w === 1440 ? '1109' : '637'}×135)`, g.aud);
    ok(Math.abs(g.ph - g.aud.h) <= 1, `--rm-player-h = altura medida (${g.ph} ≈ ${g.aud.h})`);
    ok(g.aud.l >= 64 && g.aud.r <= g.vw - 66, 'entre o trilho (64) e a toolbox da direita (67): não toca nenhum dos dois', g.aud);
    const cc = g.ctl;
    ok(['toggle', 'back', 'fwd', 'restart', 'rate', 'close'].every(k => cc[k] && cc[k].w >= 43.5 && cc[k].h >= 43.5) && cc.seek && cc.seek.h >= 43.5 && cc.title && cc.time, 'todos os controles visíveis, ≥ 44 px (seek, ±15, velocidade, play/pausa, progresso)', Object.fromEntries(Object.entries(cc).map(([k, v]) => [k, v && [v.w, v.h]])));
    const tb = await page.evaluate(() => { const r = document.querySelector('.rm2-box').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    ok(!inter({ l: g.aud.l, t: g.aud.t, r: g.aud.r, b: g.aud.b }, tb), 'não sobrepõe a toolbox da V2 (fechada)');
    await page.click('#rm2-fab').catch(() => {}); await page.waitForTimeout(500);
    const tb2 = await page.evaluate(() => { const bx = document.querySelector('.rm2-box'), pn = bx.querySelector('.rm2-panel'); const r = (pn && getComputedStyle(pn).display !== 'none' ? pn : bx).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    ok(!inter({ l: g.aud.l, t: g.aud.t, r: g.aud.r, b: g.aud.b }, tb2), 'não sobrepõe a toolbox da V2 (aberta)');
    await fecharToolbox(page, w < 900 ? false : false);
    await L.irAoFim(page); g = await geo(page);
    ok(g.ultima.b <= g.aud.t + 0.5, `fim da página: a última folha termina em ${g.ultima.b}, acima da barra (${g.aud.t})`);
    await ir(page, '#s2-b01 .rm-sis-tabtag', 1, 0); let cv = await cobertura(page, '#s2-b01 table', 1);
    ok(!cv.erro && cv.nFalhas === 0 && cv.fim, 'tabela: nenhum ponto coberto e a última linha é legível', cv);
    await ir(page, '#s2-b04 .rm-postit', 0, 0); cv = await cobertura(page, '#s2-b04 .rm-postit', 0);
    ok(!cv.erro && cv.nFalhas === 0 && cv.fim, 'post-it: nenhum ponto coberto e a última linha é legível', cv);
    await page.click('#rm2-fab'); await page.waitForTimeout(400); await page.click('.rm2-btn[data-t="pen"]'); await page.waitForTimeout(600); g = await geo(page);
    ok(g.slotPen && g.aud.h <= 60, `caneta armada: chip ${g.aud.w}×${g.aud.h}`);
    await fecharToolbox(page, false);
    ok(errs.length === 0, `${rotulo}: 0 erros JS`, errs);
    await ctx.close();
  }

  /* =============================== E · auscultação =============================== */
  sec('E · auscultação: os 6 <audio> originais e a exclusividade com o audiobook');
  {
    const lido = async (o) => { const { ctx, page } = await abrir(o); const r = await page.evaluate(() => [...document.querySelectorAll('#tab-semio2 audio')].map(a => ({ src: a.getAttribute('src'), controls: a.hasAttribute('controls'), preload: a.getAttribute('preload'), cls: a.className }))); return { ctx, page, r }; };
    const off = await lido({ w: 1440, h: 900, visual: false }); const offR = off.r; await off.ctx.close();
    const on = await lido({ w: 1440, h: 900 });
    ok(on.r.length === 6 && JSON.stringify(on.r) === JSON.stringify(offR), '6 <audio> de ausculta, com os mesmos src/atributos com o tema ligado e desligado', { n: on.r.length });
    const page = on.page;
    await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(500);
    await page.evaluate(() => { const a = document.querySelector('#tab-semio2 audio'); a.dispatchEvent(new Event('play')); });     // `play` não borbulha: o boot ouve em captura
    await page.waitForTimeout(500);
    ok((await motor(page)).state === 'paused', 'tocar uma ausculta pausa o audiobook (um áudio por vez)');
    ok(await page.evaluate(() => document.querySelectorAll('.rm-audio').length === 1), 'o player continua único');
    await on.ctx.close();
  }

  /* =============================== F · trocar de matéria e logout =============================== */
  sec('F · trocar de matéria e SIGNED_OUT: param o áudio e desfazem o tema');
  const LIMPO = () => {
    const H = document.documentElement, med = window.__media || [];
    return {
      est: window.RMAudioBoot && window.RMAudioBoot._estado(), aud: document.querySelectorAll('.rm-audio').length, slot: !!document.getElementById('rm-l2-player'), nMed: med.length, tocando: med.filter(m => !m.paused).length,
      cls: H.className, atr: ['data-rm-dock', 'data-rm-dock-force', 'data-rm-aud', 'data-rm-aud-card', 'data-rm-tools', 'data-rm-stuck', 'data-rm-tema'].filter(a => H.hasAttribute(a)),
      vars: ['--rm-player-h', '--rm-audio-h', '--rm-sis-foot-h', '--rm-dock-h'].filter(v => H.style.getPropertyValue(v) !== ''), x: !!document.querySelector('.rm-sis-aud-x'), sair: !!document.querySelector('.rm-sis-out'), cards: document.querySelectorAll('.rm-audio-card').length
    };
  };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    {
      const { ctx, page, errs } = await abrir({ w, h });
      await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(500);
      ok((await page.evaluate(LIMPO)).tocando === 1, `${w}: tocando`);
      await page.evaluate(() => {                                                    // «outra matéria» ativa: o piloto reavalia e desativa (como o switchTab real)
        window.RM_CATALOGO.push({ slug: 'outra', tab: 'outra', title: 'Otra', sub: '' });
        const t = document.createElement('div'); t.className = 'tab-content'; t.id = 'tab-outra'; t.innerHTML = '<section class="container" id="outra-b01"><h2>Otra materia</h2><p>Contenido.</p></section>'; document.getElementById('materias-container').appendChild(t);
        document.querySelectorAll('#materias-container > .tab-content').forEach(x => x.classList.remove('active')); t.classList.add('active'); window.RMPilot.avaliar();
      });
      await page.waitForTimeout(900);
      const s = await page.evaluate(LIMPO);
      ok(s.est === null && s.aud === 0 && !s.slot && s.tocando === 0, `${w}: trocar de matéria PARA o áudio e destrói o player (tocando=${s.tocando})`, s);
      ok(!/rm-sis|rm-l2/.test(s.cls) && s.atr.length === 0 && s.vars.length === 0 && !s.x && !s.sair && s.cards === 0, `${w}: tema, atributos, variáveis, botões «ampliar»/«Sair» e cards desfeitos`, { cls: s.cls, atr: s.atr, vars: s.vars });
      ok(errs.length === 0, `${w}: 0 erros JS`, errs);
      await ctx.close();
    }
    {
      const { ctx, page, errs } = await abrir({ w, h });
      await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(500);
      await page.evaluate(() => { document.getElementById('logout-fab').addEventListener('click', () => (window.__authCbs || []).slice().forEach(cb => cb('SIGNED_OUT'))); });   // o logout real termina em SIGNED_OUT
      if (w < 768) await page.tap('.rm-sis-out'); else await page.click('.rm-sis-out');                                                                                       // «Sair» da faixa fixa (delega ao botão original)
      await page.waitForTimeout(900);
      const s = await page.evaluate(LIMPO);
      ok(s.est === null && s.aud === 0 && s.tocando === 0, `${w}: «Sair» (logout) PARA o áudio (tocando=${s.tocando}) e destrói o player`, s);
      ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 0), `${w}: os cards do audiobook saem`);
      ok(errs.length === 0, `${w}: 0 erros JS`, errs);
      await ctx.close();
    }
    {
      const { ctx, page } = await abrir({ w, h });                                   // SIGNED_OUT direto (sessão expirada em outro aparelho)
      await L.tocar(page, 's2-b01-motivo'); await page.waitForTimeout(500);
      await page.evaluate(() => (window.__authCbs || []).slice().forEach(cb => cb('SIGNED_OUT'))); await page.waitForTimeout(700);
      const s = await page.evaluate(LIMPO);
      ok(s.est === null && s.aud === 0 && s.tocando === 0, `${w}: SIGNED_OUT direto também para o áudio`, s);
      await ctx.close();
    }
  }

  await br.close(); srv.close();
  console.log(`\nplayer-sistema: ${n - ko}/${n} verificações OK` + (ko ? ` — ${ko} FALHAS` : ''));
  process.exit(ko ? 1 : 0);
})();
