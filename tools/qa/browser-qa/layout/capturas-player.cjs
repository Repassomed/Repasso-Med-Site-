/* Capturas do PLAYER DO AUDIOBOOK no tema (piloto Semiología II) — 320 · 390 · 768 · 1440 · 1545×665.
   Matéria REAL + shell real + caneta V2 real + tema + motor de áudio REAL (mp3 gerado com ffmpeg; servidor simulado — ver lib-player.cjs).
   Uso:  RM_PLAYWRIGHT=... [RM_FONTS_DIR=pasta-com-local.css] node tools/qa/browser-qa/layout/capturas-player.cjs <pasta-de-saída> [--sem-tema] [--so=1440,390]
   `--sem-tema` captura com o tema DESLIGADO (visual:false: o player original da V2, como está em produção para quem não está no tema).
   O «antes» do PR é este mesmo script rodado no HEAD anterior (tema ligado, player antigo) — ver capturas-sistema/player/README.md. */
const fs = require('fs'), path = require('path');
const L = require('./lib-player.cjs');
const OUT = path.resolve(process.argv[2] || 'capturas-player');
const SEM = process.argv.includes('--sem-tema');
const SO = (process.argv.find(a => a.startsWith('--so=')) || '').slice(5).split(',').filter(Boolean).map(Number);
fs.mkdirSync(OUT, { recursive: true });

const VIEWS = [[320, 640, 'celular'], [390, 844, 'celular'], [768, 1024, 'tablet'], [1440, 900, 'desktop'], [1545, 665, 'desktop-baixo']];
const MOVEL = (w) => w < 768;

async function ir(page, sel, nth, off) {
  await page.evaluate(([s, n]) => window.RMLayout.irPara(document.querySelectorAll(s)[n || 0]), [sel, nth || 0]); await page.waitForTimeout(1700);
  if (off) { await page.evaluate(o => window.scrollBy(0, -o), off); await page.waitForTimeout(400); }
}
async function fecharToolbox(page, w) {
  await page.evaluate(() => { try { window.RMToolsV2.escolherFerramenta('none'); } catch (e) {} });
  await page.waitForTimeout(250);
  if (await page.evaluate(() => document.querySelector('.rm2-box').classList.contains('open'))) { await (MOVEL(w) ? page.tap('.rm-sis-tools') : page.click('#rm2-fab')); await page.waitForTimeout(450); }
}
async function abrirToolbox(page, w) {
  await fecharToolbox(page, w);
  const mobile = MOVEL(w) && !SEM;
  if (MOVEL(w) && SEM) await page.tap('#rm2-fab'); else if (mobile) await page.tap('.rm-sis-tools'); else await page.click('#rm2-fab');
  await page.waitForTimeout(600);
}
async function armarCaneta(page, w) {
  await abrirToolbox(page, w);
  await (MOVEL(w) ? page.tap : page.click).call(page, '.rm2-btn[data-t="pen"]'); await page.waitForTimeout(500);
}
async function ampliar(page) { await page.tap('.rm-sis-aud-x'); await page.waitForTimeout(500); }
async function recolher(page) { if (await page.evaluate(() => !!document.querySelector('#rm-l2-player[data-rm-sis-x]'))) { await page.tap('.rm-sis-aud-x'); await page.waitForTimeout(400); } }

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia();
  const br = await chromium.launch(); const log = [];
  for (const [w, h, nome] of VIEWS) {
    if (SO.length && !SO.includes(w)) continue;
    const { ctx, page, errs } = await L.abrir(br, base, midia, { w, h, visual: !SEM });
    const f = (cena) => { const n = `${nome}-${w}x${h}_${cena}.png`; log.push(n); return path.join(OUT, n); };
    const snap = async (cena) => { await page.waitForTimeout(3200); await page.screenshot({ path: f(cena) }); };   // o aviso passageiro («Lápiz activo…») já sumiu
    const mov = MOVEL(w);
    await L.tocar(page, 's2-b01-motivo');
    /* 1 · tocando (cabeçalho do bloco 01) */
    await page.evaluate(() => window.scrollTo(0, 0)); await ir(page, '#s2-b01 .rm-audio-card', 0, 220); await snap('01-tocando');
    /* 2 · em pausa */
    await page.click('.rm-audio__main'); await page.waitForTimeout(500); await snap('02-pausa');
    await page.click('.rm-audio__main'); await page.waitForTimeout(900);
    /* 3 · tabela empilhada / tabela com player tocando */
    await ir(page, '#s2-b01 .rm-sis-tabtag', 1, 30); await snap('03-tabla');
    /* 4 · post-it */
    await ir(page, '#s2-b04 .rm-postit', 0, 60); await snap('04-postit');
    /* 5 · caneta (toolbox) ABERTA, sem ferramenta armada */
    await ir(page, '#s2-b04 .rm-postit', 0, 60); await abrirToolbox(page, w); await snap('05-toolbox-aberta'); await fecharToolbox(page, w);
    /* 6 · caneta ARMADA sobre o post-it e sobre a tabela */
    await ir(page, '#s2-b04 .rm-postit', 0, 60); await armarCaneta(page, w); await snap('06-caneta-armada-postit');
    await ir(page, '#s2-b01 .rm-sis-tabtag', 1, 30); await snap('07-caneta-armada-tabla'); await fecharToolbox(page, w);
    /* 8 · auscultação (os <audio> da matéria) com o player aberto */
    await ir(page, '#s2-b01 .audio-player', 0, 60); await snap('08-auscultacion');
    /* 9 · fim da página: a última linha lê-se acima do player */
    await L.irAoFim(page); await snap('09-fim-da-pagina');
    /* 10 · celular: card ampliado (posição + velocidade) */
    if (mov && !SEM && await page.$('.rm-sis-aud-x')) { await ir(page, '#s2-b04 .rm-postit', 0, 60); await ampliar(page); await snap('10-ampliado'); await recolher(page); }   // só existe no tema novo
    console.log(w + '×' + h, 'erros JS:', JSON.stringify(errs));
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(log.length + ' capturas em ' + OUT);
})();
