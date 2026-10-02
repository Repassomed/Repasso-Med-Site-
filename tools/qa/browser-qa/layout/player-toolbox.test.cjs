/* Player inferior × toolbox da V2 (blocker 561–767 px, #425).

   Causa: a V2 só ergue a toolbox acima do player em `@media (max-width: 560px)`. De 561 a 767 px ela continua centrada na vertical
   (`top:50%; transform:translateY(-50%)`) e o player inferior (largura toda, `--rm-player-h`) podia COBRI-LA — sobretudo em janelas
   baixas (celular/tablet pequeno em paisagem) e com o painel aberto.
   Correção (só no Layout, rm-layout.css; o motor do player e a V2 não são tocados): em 561–767 px a toolbox é centrada na área LIVRE
   acima do player e o painel não passa dela. Sem player (`--rm-player-h: 0`) a posição é exatamente a original.

   Aqui: toolbox REAL da V2 (rm-tools-v2.js), Semiología II real, rm-pilot → rm-layout/rm-modes reais; supabase/gate simulados; 0 rede real.
   O player é o slot REAL `#rm-l2-player` aberto com a altura publicada em `--rm-player-h` (o motor de áudio não é carregado: o que importa
   é o contrato de altura). Medida: interseção (px²) entre o player e a união toolbox + painel, FECHADA e ABERTA.

   Uso:  export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo
         node tools/qa/browser-qa/layout/player-toolbox.test.cjs                                                             */
const L = require('./lib-ink.cjs');
const { ok, info, abrir } = L;

const CASOS = [[320, 700], [390, 844], [560, 844], [561, 844], [561, 420], [600, 844], [600, 360], [700, 900], [700, 420], [720, 450], [767, 1024], [767, 400], [768, 1024], [1024, 768], [1440, 900]];
const PLAYERS = [0, 88, 120, 135, 160, 220];

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const falhas = [], linhas = [];
  for (const [w, h] of CASOS) {
    const f = await abrir(br, base, w, h, { seed: '' }); const p = f.page;
    for (const aberta of [false, true]) {
      await p.evaluate((ab) => { const bx = document.querySelector('.rm2-box'); if (bx) bx.classList.toggle('open', ab); }, aberta);
      let base0 = null;
      for (const ph of PLAYERS) {
        const m = await p.evaluate((ph) => {
          const H = document.documentElement; H.style.setProperty('--rm-player-h', ph + 'px');
          const sl = document.getElementById('rm-l2-player'); sl.hidden = ph === 0; sl.style.background = 'rgba(255,0,0,.25)';
          const bx = document.querySelector('.rm2-box'), pn = bx.querySelector('.rm2-panel');
          const rects = [bx.getBoundingClientRect()]; if (getComputedStyle(pn).display !== 'none') rects.push(pn.getBoundingClientRect());
          const u = { l: Math.min(...rects.map(r => r.left)), t: Math.min(...rects.map(r => r.top)), r: Math.max(...rects.map(r => r.right)), b: Math.max(...rects.map(r => r.bottom)) };
          const q = sl.getBoundingClientRect(); const pv = ph > 0 ? q : null;
          const ox = pv ? Math.min(u.r, pv.right) - Math.max(u.l, pv.left) : 0, oy = pv ? Math.min(u.b, pv.bottom) - Math.max(u.t, pv.top) : 0;
          return { u, ph, vw: H.clientWidth, vh: innerHeight, dock: H.getAttribute('data-rm-dock'), inter: ox > 0 && oy > 0 ? Math.round(ox * oy) : 0, playerTop: pv ? Math.round(pv.top) : null, panelCS: getComputedStyle(pn).maxHeight, top: Math.round(bx.getBoundingClientRect().top), centro: Math.round((bx.getBoundingClientRect().top + bx.getBoundingClientRect().bottom) / 2) };
        }, ph);
        if (ph === 0) base0 = m;
        const R = `${w}×${h} · toolbox ${aberta ? 'ABERTA' : 'fechada'} · player ${ph}px`;
        const cabe = m.u.t >= -0.5 && m.u.b <= (ph === 0 ? m.vh : m.playerTop) + 0.5;
        const livre = m.vh - ph;                                         // altura da área livre acima do player
        const boxH = m.u.b - m.u.t;
        const possivel = boxH <= livre + 0.5;                            // se a própria toolbox é mais alta que a área livre, nada no Layout resolve
        const faixa = w >= 561 && w <= 767;                              // a correção do Layout vale aqui; ≥ 768 o slot termina antes da raia da toolbox
        const bom = m.inter === 0 && (!faixa || ph === 0 || cabe || !possivel);
        linhas.push([w + '×' + h, aberta ? 'aberta' : 'fechada', ph, m.inter, Math.round(boxH), livre]);
        if (!bom) falhas.push(`${R}: interseção ${m.inter}px² (toolbox ${Math.round(m.u.t)}–${Math.round(m.u.b)}, player top=${m.playerTop})`);
        ok(bom, `${R}: ZERO interseção player × toolbox (${m.inter}px²; toolbox y ${Math.round(m.u.t)}–${Math.round(m.u.b)} · player top ${m.playerTop})`);
        if (ph > 0 && w >= 561 && w <= 767) {
          const hdr = await p.evaluate(() => document.getElementById('rm-l2-band').offsetHeight);
          const cabeEntre = boxH <= livre - 2 * hdr + 0.5 || m.u.t >= hdr - 0.5;     // caixa MÍNIMA (fab + 1 botão) pode não caber em janelas absurdas
          ok(m.u.t >= -0.5 && (m.u.t >= hdr - 0.5 || !cabeEntre || boxH <= 70), `${R}: a toolbox fica inteira na janela e abaixo da faixa do shell (topo ${Math.round(m.u.t)}px, faixa ${hdr}px)`);
        }
      }
      /* sem player: a toolbox fica exatamente onde sempre ficou (centrada) */
      ok(Math.abs(base0.centro - base0.vh / 2) <= 1 || w <= 560, `${w}×${h} · ${aberta ? 'aberta' : 'fechada'} · sem player: toolbox centrada na vertical como antes (centro ${base0.centro} × metade ${base0.vh / 2})`);
    }
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${w}×${h}: 0 overflow horizontal`);
    ok(f.errs.length === 0, `${w}×${h}: 0 erros JS (${f.errs.length})`);
    await p.close();
  }
  await br.close(); srv.close();
  if (falhas.length) { console.log('\nINTERSEÇÕES:'); falhas.slice(0, 12).forEach(x => console.log(' - ' + x)); if (falhas.length > 12) console.log(` … +${falhas.length - 12}`); }
  process.exit(L.finish('player-toolbox') ? 1 : 0);
})();
