/* Capturas da NAVEGAÇÃO POR BLOCO + MODOS ISOLADOS + PLAYER (issue #453) — Semiología II REAL + shell real + caneta V2 + tema + navegação + motor de áudio REAL.
   Uso:  RM_PLAYWRIGHT=... [RM_FONTS_DIR=pasta-com-local.css] node tools/qa/browser-qa/layout/capturas-navegacion.cjs <pasta-de-saída> [--so=nav|ab|mobile]
   «antes»  = a leitura contínua da PR #446 (RMNav.detach(): o mesmo código, sem a navegação — é o que está em produção hoje);
   «depois» = a navegação por bloco ligada.
   `ab` = comparação A × B do player (1440 e 1280) com medidas reais (largura da folha, medida do texto, caracteres por linha) em MEDIDAS-PLAYER.md. */
const fs = require('fs'), path = require('path');
const L = require('./lib-player.cjs');
const OUT = path.resolve(process.argv[2] || 'capturas-navegacion');
const SO = (process.argv.find(a => a.startsWith('--so=')) || '').slice(5);
fs.mkdirSync(OUT, { recursive: true });
const log = [];

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia();
  const br = await chromium.launch();
  const go = async (page, spec, ms = 1500) => { await page.evaluate(s => window.RMNav.go(s), spec); await page.waitForTimeout(ms); };
  const snap = async (page, nome, opts = {}) => { await page.waitForTimeout(opts.espera || 3300); const f = path.join(OUT, nome + '.png'); await page.screenshot(Object.assign({ path: f }, opts.clip ? { clip: opts.clip } : {})); log.push(nome); };
  const lateralFim = (page) => page.evaluate(() => { const s = document.querySelector('.rm-l2-side-scroll'); if (s) s.scrollTop = s.scrollHeight; });
  const lateralTopo = (page) => page.evaluate(() => { const s = document.querySelector('.rm-l2-side-scroll'); if (s) s.scrollTop = 0; });

  /* ================= NAV: desktop 1440×900, antes × depois ================= */
  if (!SO || SO === 'nav') {
    for (const [tag, nav] of [['antes', false], ['depois', true]]) {
      const { ctx, page, errs } = await L.abrir(br, base, midia, { w: 1440, h: 900, nav });
      const P = (n) => `${tag}/desktop-1440_${n}`; fs.mkdirSync(path.join(OUT, tag), { recursive: true });
      await page.evaluate(() => window.scrollTo(0, 0));
      await snap(page, P('01-abertura'));
      await lateralFim(page); await snap(page, P('02-lateral-fim'), { espera: 600, clip: { x: 0, y: 0, width: 300, height: 900 } }); await lateralTopo(page);
      if (nav) {
        await page.evaluate(() => { const g = document.querySelector('.rm-sis-idx'); window.scrollTo(0, g.getBoundingClientRect().top + scrollY - 110); }); await snap(page, P('03-indice-geral-grade'), { espera: 900 });
        await go(page, { view: 'block', block: 's2-b03' }); await snap(page, P('04-bloque-03'));
        await page.evaluate(() => window.RMLayout.irPara(document.getElementById('s2-b03-s3'))); await page.waitForTimeout(1500); await snap(page, P('05-bloque-03-subtitulo'), { espera: 800 });
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await snap(page, P('06-bloque-03-pager'), { espera: 900 });
        for (const [nome, spec] of [
          ['07-infografias-indice', { view: 'modeidx', mode: 'infografias' }], ['08-infografias-bloque', { view: 'modeblk', mode: 'infografias', block: 's2-b03' }],
          ['09-preguntas-indice', { view: 'modeidx', mode: 'preguntas' }], ['10-preguntas-bloque', { view: 'modeblk', mode: 'preguntas', block: 's2-b03' }],
          ['11-flashcards-indice', { view: 'modeidx', mode: 'flashcards' }], ['12-flashcards-bloque', { view: 'modeblk', mode: 'flashcards', block: 's2-b03' }],
          ['13-audiolibros-indice', { view: 'modeidx', mode: 'audiobooks' }], ['14-audiolibros-bloque', { view: 'modeblk', mode: 'audiobooks', block: 's2-b03' }],
          ['15-auscultacion-indice', { view: 'modeidx', mode: 'auscultacion' }], ['16-auscultacion-bloque', { view: 'modeblk', mode: 'auscultacion', block: 's2-b01' }]]) {
          await go(page, spec); await snap(page, P(nome), { espera: 1200 });
        }
        await go(page, { view: 'modeblk', mode: 'preguntas', block: 's2-b03' }); await page.click('.rm-nav-chipf[data-f="exam"]'); await snap(page, P('10b-preguntas-examen'), { espera: 900 });
      } else {
        await page.evaluate(() => window.RMLayout.irPara(document.getElementById('s2-b03'))); await page.waitForTimeout(1600); await snap(page, P('04-bloque-03'));
        await page.evaluate(() => window.RMLayout.irPara(document.getElementById('s2-b03-s3'))); await page.waitForTimeout(1500); await snap(page, P('05-bloque-03-subtitulo'), { espera: 800 });
      }
      console.log(tag, 'erros JS:', JSON.stringify(errs)); await ctx.close();
    }
  }

  /* ================= MOBILE 390 e tablet 768 (depois) ================= */
  if (!SO || SO === 'mobile') {
    { /* ANTES (leitura contínua da #446) no celular 390: abertura, início do bloco 03, fim do bloco com a lateral/«Revisión reunida» na gaveta */
      const { ctx, page } = await L.abrir(br, base, midia, { w: 390, h: 844, nav: false });
      fs.mkdirSync(path.join(OUT, 'antes'), { recursive: true });
      await page.evaluate(() => window.scrollTo(0, 0)); await snap(page, 'antes/celular-390_01-abertura');
      await page.evaluate(() => window.RMLayout.irPara(document.getElementById('s2-b03'))); await page.waitForTimeout(1600); await snap(page, 'antes/celular-390_03-bloque-03', { espera: 800 });
      await ctx.close();
    }
    for (const [w, h, nome] of [[390, 844, 'celular-390'], [768, 1024, 'tablet-768'], [320, 640, 'celular-320']]) {
      const { ctx, page, errs } = await L.abrir(br, base, midia, { w, h, nav: true });
      fs.mkdirSync(path.join(OUT, 'depois'), { recursive: true });
      const P = (n) => `depois/${nome}_${n}`;
      await page.evaluate(() => window.scrollTo(0, 0)); await snap(page, P('01-abertura'));
      await page.evaluate(() => { const g = document.querySelector('.rm-sis-idx'); window.scrollTo(0, g.getBoundingClientRect().top + scrollY - 70); }); await snap(page, P('02-indice-grade'), { espera: 900 });
      await go(page, { view: 'block', block: 's2-b03' }); await snap(page, P('03-bloque-03'));
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await snap(page, P('04-bloque-03-pager'), { espera: 900 });
      await go(page, { view: 'modeidx', mode: 'preguntas' }); await snap(page, P('05-preguntas-indice'), { espera: 1000 });
      await go(page, { view: 'modeblk', mode: 'preguntas', block: 's2-b03' }); await snap(page, P('06-preguntas-bloque'), { espera: 1000 });
      await go(page, { view: 'modeblk', mode: 'flashcards', block: 's2-b03' }); await snap(page, P('07-flashcards-bloque'), { espera: 1000 });
      await go(page, { view: 'modeblk', mode: 'audiobooks', block: 's2-b03' }); await snap(page, P('08-audiolibros-bloque'), { espera: 1000 });
      await go(page, { view: 'modeblk', mode: 'auscultacion', block: 's2-b01' }); await snap(page, P('09-auscultacion-bloque'), { espera: 1000 });
      /* player + caneta: bloco 03 tocando, caneta armada, última linha do bloco (pager) acima da barra */
      await go(page, { view: 'block', block: 's2-b03' }, 1300); await L.tocar(page, 's2-b03-epoc'); await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => window.RMLayout.irPara(document.getElementById('s2-b03-s3'))); await page.waitForTimeout(1500);
      await snap(page, P('10-tocando-bloque-03'), { espera: 800 });
      await (w < 768 ? page.tap('.rm-sis-tools') : page.tap('#rm2-fab')); await page.waitForTimeout(700); await page.tap('.rm2-btn[data-t="pen"]'); await page.waitForTimeout(700);
      await snap(page, P('11-caneta-armada-tocando'), { espera: 3400 });
      await L.irAoFim(page); await snap(page, P('12-ultima-linha-caneta-player'), { espera: 3400 });
      console.log(nome, 'erros JS:', JSON.stringify(errs)); await ctx.close();
    }
  }

  /* ================= AB: player — A (coluna à direita) × B (quadrado) em 1440 e 1280 ================= */
  if (!SO || SO === 'ab') {
    fs.mkdirSync(path.join(OUT, 'player-ab'), { recursive: true });
    const med = [];
    const MEDIR = () => {
      const R = (e) => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; };
      const sec = document.getElementById('s2-b03'), p = [...sec.querySelectorAll('p')].filter(x => !x.closest('[data-rm-ui]') && x.textContent.length > 200)[0];
      const rg = document.createRange(); rg.selectNodeContents(p); const linhas = new Set([...rg.getClientRects()].map(r => Math.round(r.top))).size;
      const aud = document.querySelector('.rm-audio'), x = document.querySelector('.rm-sis-aud-x'), vis = (e) => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
      return { vw: document.documentElement.clientWidth, folha: R(sec), paragrafo: R(p), chars: p.textContent.length, linhas, cpl: Math.round(p.textContent.length / Math.max(1, linhas)), card: vis(aud) ? R(aud) : null, quadrado: vis(x) && !vis(aud) ? R(x) : null, col: document.documentElement.hasAttribute('data-rm-aud-col') };
    };
    for (const [w, h] of [[1440, 900], [1280, 720]]) {
      const { ctx, page, errs } = await L.abrir(br, base, midia, { w, h, nav: true });
      await go(page, { view: 'block', block: 's2-b03' }, 1300);
      const sem = await page.evaluate(MEDIR);
      await page.evaluate(() => window.RMLayout.irPara(document.getElementById('s2-b03-s3'))); await page.waitForTimeout(1500);
      await L.tocar(page, 's2-b03-epoc'); await page.waitForTimeout(900);
      const naturalmente = await page.evaluate(MEDIR);       // o que o desenho híbrido escolhe sozinho: A ≥ 1430 px, B abaixo
      const estadoAtual = naturalmente.card ? 'A' : 'B';
      await snap(page, `player-ab/${w}x${h}_${estadoAtual}-${estadoAtual === 'A' ? 'coluna-direita' : 'quadrado-recolhido'}-automatico`, { espera: 900 });
      const alt = estadoAtual === 'A' ? 'B' : 'A';
      await page.click('.rm-sis-aud-x'); await page.waitForTimeout(900);          // alterna: A→B (recolhe) ou B→A (expande)
      const outra = await page.evaluate(MEDIR);
      await snap(page, `player-ab/${w}x${h}_${alt}-${alt === 'A' ? 'coluna-direita' : 'quadrado-recolhido'}-alternativa`, { espera: 900 });
      med.push({ w, h, semPlayer: sem, [estadoAtual + ' (automático)']: naturalmente, [alt + ' (alternativa)']: outra });
      console.log(w + '×' + h, 'erros JS:', JSON.stringify(errs)); await ctx.close();
    }
    const linhas = ['# Medidas A × B do player (issue #453)', '', 'Semiología II · bloque 03 · primeiro parágrafo longo. «A» = card 204 px expandido numa coluna reservada à direita; «B» = quadrado 56×56 recolhido (nada se move).', '',
      '| Janela | Estado | Folha (px) | Parágrafo (px) | Linhas | Caracteres/linha | Card/quadrado (x–x) |', '|---|---|---|---|---|---|---|'];
    med.forEach(m => Object.entries(m).filter(([k]) => k !== 'w' && k !== 'h').forEach(([k, v]) => {
      linhas.push(`| ${m.w}×${m.h} | ${k === 'semPlayer' ? 'sem player (referência)' : k} | ${v.folha.w} | ${v.paragrafo.w} | ${v.linhas} | ${v.cpl} | ${v.card ? v.card.l + '–' + v.card.r : v.quadrado ? v.quadrado.l + '–' + v.quadrado.r : '—'} |`);
    }));
    fs.writeFileSync(path.join(OUT, 'player-ab', 'MEDIDAS-PLAYER.md'), linhas.join('\n') + '\n');
    fs.writeFileSync(path.join(OUT, 'player-ab', 'medidas.json'), JSON.stringify(med, null, 1));
  }

  await br.close(); srv.close();
  console.log(log.length + ' capturas em ' + OUT);
})();
