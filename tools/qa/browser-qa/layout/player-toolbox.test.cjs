/* Player inferior × toolbox da V2 (blocker 561–767 px, #425) — mede a caixa E CADA BOTÃO.

   Causa: a V2 só ergue a toolbox acima do player em `@media (max-width: 560px)`. De 561 a 767 px ela continua centrada na vertical
   (`top:50%; transform:translateY(-50%)`) e o player inferior (largura toda, `--rm-player-h`) podia COBRI-LA.
   Correção (só no Layout, rm-layout.css; o motor do player, a V2 e a caneta não são tocados): em 561–767 px a caixa é centrada na região
   livre ENTRE a faixa do shell e o player, e o painel (que rola por dentro) é limitado ao que sobra; sombras de rolagem avisam quando há mais
   botões. Sem player (`--rm-player-h: 0`) a posição é exatamente a original.

   O QUE MUDOU NA MEDIDA (auditoria do Claude 4 na #425): medir só o retângulo da caixa/painel deixa escapar os botões que SAEM dele — o painel
   é uma lista rolável e os últimos botões («Deshacer», «Mis apuntes», «Diagnóstico») ficam fora do retângulo, abaixo do painel. Agora, para cada
   botão visível (`offsetParent`) de `.rm2-box`:
     · VISÍVEL AGORA = interseção do botão com a área rolável do painel (recortada) e com a janela > 0. Botão recortado não é pintado;
     · se está visível agora: interseção com o player = 0 px² e `elementFromPoint` no centro da parte visível devolve o próprio botão (não o player);
     · ALCANÇÁVEL: depois de rolar o painel até ele (`scrollIntoView`), o botão fica INTEIRO na área do painel, inteiro acima do player,
       dentro da janela, o `elementFromPoint` do centro é ele e o alvo tem ≥ 44 px (≥ 40 px em ≤ 560, como a V2 define);
     · a caixa nunca é menor do que precisa quando há espaço (nada rola à toa);
     · quando o painel rola, há sombra de rolagem (background-attachment: local) para o aluno saber que há mais.
   Estados: toolbox fechada · aberta · aberta com a CANETA ARMADA (chip; é quando o player compacto de 53 px aparece e os sub-painéis de cor/grossura
   deixam o painel mais alto). Players: 0 · 53 (compacto) · 88 · 120 · 135 · 160 · 220 px.

   Aqui: toolbox REAL da V2 (rm-tools-v2.js), Semiología II real, rm-pilot → rm-layout/rm-modes reais; supabase/gate simulados; 0 rede real.
   O player é o slot REAL `#rm-l2-player` com a altura publicada em `--rm-player-h` (o motor de áudio não é carregado: o que importa é o contrato).

   Uso:  export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo
         node tools/qa/browser-qa/layout/player-toolbox.test.cjs                                                             */
const L = require('./lib-ink.cjs');
const { ok, info, abrir } = L;

const CASOS = [[320, 700], [390, 844], [390, 520], [560, 844], [560, 520], [561, 844], [561, 520], [561, 420], [600, 844], [600, 360], [700, 900], [700, 520], [700, 420], [720, 450], [767, 1024], [767, 520], [767, 400], [768, 1024], [1024, 768], [1440, 900]];
const PLAYERS = [0, 53, 88, 120, 135, 160, 220];
const ESTADOS = ['fechada', 'aberta', 'aberta+caneta'];

/* medida completa dentro do navegador (função serializada) */
const MEDIR = ({ ph, estado }) => {
  const H = document.documentElement; H.style.setProperty('--rm-player-h', ph + 'px');
  const sl = document.getElementById('rm-l2-player'); sl.hidden = ph === 0; sl.style.background = 'rgba(255,0,0,.25)';
  const bx = document.querySelector('.rm2-box'), pn = bx.querySelector('.rm2-panel');
  bx.classList.toggle('open', estado !== 'fechada');
  try { window.RMToolsV2.escolherFerramenta(estado === 'aberta+caneta' ? 'pen' : 'none'); } catch (e) {}
  if (estado !== 'fechada') bx.classList.add('open'); else bx.classList.remove('open');
  pn.scrollTop = 0;
  const vw = H.clientWidth, vh = innerHeight, pv = ph > 0 ? sl.getBoundingClientRect() : null;
  const inter = (a, b) => { const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return x > 0 && y > 0 ? x * y : 0; };
  const rects = [bx.getBoundingClientRect()]; const painelVis = getComputedStyle(pn).display !== 'none'; if (painelVis) rects.push(pn.getBoundingClientRect());
  const u = { left: Math.min(...rects.map(r => r.left)), top: Math.min(...rects.map(r => r.top)), right: Math.max(...rects.map(r => r.right)), bottom: Math.max(...rects.map(r => r.bottom)) };
  const pbr = pn.getBoundingClientRect();
  const clip = painelVis ? { left: pbr.left + pn.clientLeft, top: pbr.top + pn.clientTop, right: pbr.left + pn.clientLeft + pn.clientWidth, bottom: pbr.top + pn.clientTop + pn.clientHeight } : null;   // caixa de padding: é o que recorta
  const hdr = document.getElementById('rm-l2-band').offsetHeight;
  const alvoMin = vw <= 560 ? 40 : 44;
  const tocavel = (b) => b.classList.contains('rm2-btn') || b.classList.contains('rm2-fab');
  const hit = (b, r) => { const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === b || b.contains(t)); };
  const clip2 = () => { const q = pn.getBoundingClientRect(); return { left: q.left + pn.clientLeft, top: q.top + pn.clientTop, right: q.left + pn.clientLeft + pn.clientWidth, bottom: q.top + pn.clientTop + pn.clientHeight }; };
  const botoes = [...bx.querySelectorAll('button')].filter(b => b.offsetParent !== null);
  const res = botoes.map(b => {
    const noPainel = !!clip && pn.contains(b), r = b.getBoundingClientRect();
    const vis = { left: Math.max(r.left, noPainel ? clip.left : 0, 0), top: Math.max(r.top, noPainel ? clip.top : 0, 0), right: Math.min(r.right, noPainel ? clip.right : vw, vw), bottom: Math.min(r.bottom, noPainel ? clip.bottom : vh, vh) };
    const areaVis = Math.max(0, vis.right - vis.left) * Math.max(0, vis.bottom - vis.top);
    const agora = (Math.min(vis.bottom - vis.top, vis.right - vis.left) >= 4) && areaVis > 0.5;     // menos de 4 px visíveis não é alvo
    const out = { nome: (b.getAttribute('aria-label') || b.className).slice(0, 40), painel: noPainel, agora, toc: tocavel(b) };
    if (agora) { out.sobPlayer = pv ? inter(vis, pv) : 0; out.hitAgora = hit(b, { left: vis.left, top: vis.top, width: vis.right - vis.left, height: vis.bottom - vis.top }); out.inteiroAgora = areaVis >= r.width * r.height - 1; }
    /* alcançável: rola o painel até o botão e mede o botão INTEIRO */
    if (noPainel) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r2 = b.getBoundingClientRect(), c2 = noPainel ? clip2() : { left: 0, top: 0, right: vw, bottom: vh };
    out.inteiroNaArea = r2.left >= c2.left - 1 && r2.right <= c2.right + 1 && r2.top >= c2.top - 1 && r2.bottom <= c2.bottom + 1;
    out.naJanela = r2.left >= -0.5 && r2.right <= vw + 0.5 && r2.top >= -0.5 && r2.bottom <= vh + 0.5;
    out.sobPlayer2 = pv ? inter(r2, pv) : 0;
    out.hit2 = hit(b, r2);
    out.lado = Math.round(Math.min(r2.width, r2.height));
    if (noPainel) pn.scrollTop = 0;
    return out;
  });
  const rolavel = painelVis && pn.scrollHeight > pn.clientHeight + 1;
  const bgAtt = painelVis ? getComputedStyle(pn).backgroundAttachment : '';
  const total = bx.getBoundingClientRect();
  return {
    u, vw, vh, hdr, alvoMin, ph, playerTop: pv ? Math.round(pv.top) : null, inter: pv ? Math.round(inter(u, pv)) : 0, painelVis,
    painelClient: painelVis ? pn.offsetHeight : 0, painelScroll: painelVis ? pn.scrollHeight : 0, rolavel, bgAtt,
    dispPainel: (vw <= 560 ? vh - ph - hdr - 137 : vh - ph - hdr - 75), tetoOriginal: (vw <= 560 ? Math.min(0.58 * vh, 420) : (vh <= 640 ? 0.64 * vh : Math.min(0.76 * vh, 660))), caixa: { top: Math.round(total.top), bottom: Math.round(total.bottom), h: Math.round(total.height) },
    centro: Math.round((bx.getBoundingClientRect().top + bx.getBoundingClientRect().bottom) / 2), res
  };
};

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const falhas = [];
  const F = (msg) => falhas.push(msg);
  let nBotoes = 0, nRolagem = 0, nCombos = 0, semEspacoN = 0;
  for (const [w, h] of CASOS) {
    const f = await abrir(br, base, w, h, { seed: '' }); const p = f.page;
    let base0 = null; const resumo = [];
    for (const estado of ESTADOS) {
      for (const ph of PLAYERS) {
        const m = await p.evaluate(MEDIR, { ph, estado }); nCombos++;
        if (ph === 0 && estado === 'aberta') base0 = m;
        const R = `${w}×${h} · toolbox ${estado} · player ${ph}px`;
        const faixa = w >= 561 && w <= 767;
        /* 1 · a caixa (união caixa+painel) não toca o player */
        if (m.inter !== 0) F(`${R}: caixa × player ${m.inter}px² (caixa ${m.caixa.top}–${m.caixa.bottom}, player ${m.playerTop})`);
        /* 2 · CADA botão visível agora: não sob o player, e o clique no centro cai nele; todo botão é alcançável (rolando o painel) */
        const ruins = [];
        const semEspaco = m.dispPainel < 60 && ph > 0;          // janela absurda (ex.: 360 px de altura com player de 220): nenhum Layout cria espaço que não existe
        if (semEspaco) semEspacoN++;
        if (!semEspaco) m.res.forEach(b => {
          nBotoes++; if (b.painel && !b.agora) nRolagem++;
          if (b.agora && b.sobPlayer > 0) ruins.push(`«${b.nome}» sob o player (${b.sobPlayer}px²)`);
          if (b.agora && !b.hitAgora) ruins.push(`«${b.nome}» visível mas o clique no centro NÃO cai nele`);
          if (!b.inteiroNaArea) ruins.push(`«${b.nome}» não fica inteiro nem rolando o painel`);
          if (!b.naJanela) ruins.push(`«${b.nome}» fora da janela`);
          if (b.sobPlayer2 > 0) ruins.push(`«${b.nome}» sob o player depois de rolar (${b.sobPlayer2}px²)`);
          if (!b.hit2) ruins.push(`«${b.nome}» depois de rolar: o clique no centro NÃO cai nele`);
          if (b.toc && b.lado < m.alvoMin - 0.5) ruins.push(`«${b.nome}» alvo ${b.lado}px < ${m.alvoMin}px`);
        });
        /* 3 · a caixa não encolhe à toa: se cabe com folga, nada rola */
        if (!semEspaco && m.painelVis && w <= 767 && m.rolavel && m.painelClient < Math.min(m.painelScroll, m.dispPainel, m.tetoOriginal) - 2) ruins.push(`painel rola com espaço sobrando (cliente ${m.painelClient}, conteúdo ${m.painelScroll}, disponível ${m.dispPainel})`);
        /* 4 · quando rola, há sombra de rolagem */
        if (m.rolavel && !/local/.test(m.bgAtt)) ruins.push('painel rola mas sem sombra de rolagem');
        /* 5 · na faixa 561–767 a caixa fica abaixo da faixa do shell quando cabe */
        if (faixa && ph > 0 && m.caixa.h <= m.vh - ph - m.hdr - 14 + 1 && m.caixa.top < m.hdr - 0.5) ruins.push(`caixa sob a faixa do shell (topo ${m.caixa.top}px, faixa ${m.hdr}px)`);
        if (ruins.length) ruins.forEach(x => F(`${R}: ${x}`));
        if (ph === 53 || ph === 135) resumo.push(`${estado}/${ph}: ${m.res.filter(b => b.painel && !b.agora).length} p/ rolar`);
        ok(m.inter === 0 && ruins.length === 0, `${R}: caixa×player=${m.inter}px² · ${m.res.length} botões (${m.res.filter(b => b.agora).length} visíveis agora, ${m.res.filter(b => b.painel && !b.agora).length} só rolando) · painel ${m.painelClient}/${m.painelScroll}px${ruins.length ? ' · ' + ruins[0] : ''}`);
      }
    }
    /* sem player: a posição é exatamente a original (centrada) */
    if (base0) ok(Math.abs(base0.centro - base0.vh / 2) <= 1 || w <= 560, `${w}×${h} · aberta · sem player: toolbox centrada na vertical como antes (centro ${base0.centro} × metade ${base0.vh / 2})`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${w}×${h}: 0 overflow horizontal`);
    ok(f.errs.length === 0, `${w}×${h}: 0 erros JS (${f.errs.length})`);
    await p.close();
  }
  /* ---------- a rolagem interna é PERCEPTÍVEL (medida em pixels) ----------
     Painel rolável com a caneta armada e o player compacto: a faixa de baixo do painel precisa ficar mais ESCURA (sombra) enquanto há mais botões
     abaixo e voltar a clarear quando o painel chega ao fim; o mesmo, espelhado, no topo. Controle negativo: painel que não rola não tem sombra. */
  console.log('\n===== rolagem interna perceptível (pixels) =====');
  const luma = async (page, buf, y0, y1) => page.evaluate(async ([b64, a, c]) => {
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    const x0 = Math.floor(im.width * 0.3), x1 = Math.floor(im.width * 0.7), d = g.getImageData(x0, a, x1 - x0, Math.max(1, c - a)).data; let t = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { t += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; } return t / n;
  }, [buf.toString('base64'), y0, y1]);
  for (const [w, h] of [[561, 520], [700, 520], [767, 520], [720, 450]]) {
    const f = await abrir(br, base, w, h, { seed: '' }); const p = f.page;
    await p.evaluate(() => { document.documentElement.style.setProperty('--rm-player-h', '53px'); const sl = document.getElementById('rm-l2-player'); sl.hidden = false; document.querySelector('.rm2-box').classList.add('open'); window.RMToolsV2.escolherFerramenta('pen'); });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const pn = document.querySelector('.rm2-panel'); const q = pn.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, rola: pn.scrollHeight > pn.clientHeight + 1 }; });
    const clip = { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.w), height: Math.ceil(r.h) };
    await p.evaluate(() => { document.querySelector('.rm2-panel').scrollTop = 0; }); await p.waitForTimeout(150);
    const topo = await p.screenshot({ clip });
    await p.evaluate(() => { const pn = document.querySelector('.rm2-panel'); pn.scrollTop = pn.scrollHeight; }); await p.waitForTimeout(150);
    const fim = await p.screenshot({ clip });
    const baixoT = await luma(p, topo, clip.height - 12, clip.height - 4), baixoF = await luma(p, fim, clip.height - 12, clip.height - 4);
    const cimaT = await luma(p, topo, 4, 12), cimaF = await luma(p, fim, 4, 12);
    ok(r.rola, `${w}×${h}: o painel rola por dentro (caneta armada, player de 53 px)`);
    ok(baixoF - baixoT >= 8, `${w}×${h}: no topo, a borda de BAIXO do painel está mais escura que no fim (luminância ${baixoT.toFixed(0)} → ${baixoF.toFixed(0)}): há mais botões abaixo`);
    ok(cimaT - cimaF >= 8, `${w}×${h}: no fim, a borda de CIMA está mais escura que no topo (${cimaT.toFixed(0)} → ${cimaF.toFixed(0)}): há botões acima`);
    /* controle negativo: sem a caneta armada o painel cabe inteiro e não tem sombra */
    await p.evaluate(() => { window.RMToolsV2.escolherFerramenta('none'); }); await p.waitForTimeout(300);
    const r2 = await p.evaluate(() => { const pn = document.querySelector('.rm2-panel'); const q = pn.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, rola: pn.scrollHeight > pn.clientHeight + 1 }; });
    if (!r2.rola) {
      const c2 = { x: Math.floor(r2.x), y: Math.floor(r2.y), width: Math.ceil(r2.w), height: Math.ceil(r2.h) };
      const sem = await p.screenshot({ clip: c2 }); const e1 = await luma(p, sem, c2.height - 12, c2.height - 4), e3 = await luma(p, sem, 4, 12);
      ok(e1 >= 245 && e3 >= 245, `${w}×${h}: sem rolagem (caneta desarmada) a borda do painel fica clara — sem sombra de aviso (baixo ${e1.toFixed(0)} · cima ${e3.toFixed(0)}; com rolagem: ${baixoT.toFixed(0)})`);
    } else info(`${w}×${h}: o painel continua rolando com a caneta desarmada — controle negativo não se aplica`);
    await p.close();
  }

  await br.close(); srv.close();
  info(`${semEspacoN} combinações sem espaço físico (área livre < 60 px) só conferem a interseção da caixa com o player`);
  info(`${nCombos} combinações · ${nBotoes} medidas de botão · ${nRolagem} botões que só aparecem rolando o painel`);
  if (falhas.length) { console.log('\nPROBLEMAS:'); falhas.slice(0, 30).forEach(x => console.log(' - ' + x)); if (falhas.length > 30) console.log(` … +${falhas.length - 30}`); }
  process.exit(L.finish('player-toolbox') ? 1 : 0);
})();
