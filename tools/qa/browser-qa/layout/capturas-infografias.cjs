/* Capturas REAIS do modo Infografías (layout real + Semiología II real + topbar/CSS reais), com métricas.
   Uso: RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/capturas-infografias.cjs <pasta-de-saída>
   LIMITES (declarados): (1) emulação, não aparelho; fontes do Google não carregam no sandbox (caem nas do sistema);
   (2) o modo só mostra conteúdo real com a chave `conteudoReal` ligada E o contrato de anotações da V2 — que AINDA NÃO EXISTE:
       as capturas «modo» servem o rm-modes.js com a chave trocada e um contrato SIMULADO (marcado SIMULADO no nome do arquivo);
       as capturas «vazio_codigo_entregue» são o código entregue, sem alteração (o modo continua vazio). */
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./serve.cjs');
const OUT = path.resolve(process.argv[2] || 'capturas-ig');
const JOSE = 'd4d215d3-36dd-4efb-8869-bdea5376c648';
fs.mkdirSync(OUT, { recursive: true });
const CASOS = [
  ...[320, 390, 561, 600, 700, 767, 768, 1024, 1440, 1700, 1920].map(w => ({ w, z: 1, nome: `${w}` })),
  { w: 720, z: 1, h: 450, nome: '720x450' }, { w: 1440, z: 2, nome: '1440_zoom200' }
];
const LIGAR = (page) => page.route('**/assets/rm-modes.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'assets/rm-modes.js'), 'utf8').replace('conteudoReal: false', 'conteudoReal: true') }));
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch(); const linhas = [];
  for (const c of CASOS) {
    const h = c.h || (c.w <= 420 ? 844 : c.w <= 800 ? 1024 : 900);
    for (const ativo of [true, false]) {
      if (!ativo && ![1440, 390].includes(c.w)) continue;               // o painel vazio (código entregue) só em 2 larguras
      const ctx = await br.newContext({ viewport: { width: Math.round(c.w / c.z), height: Math.round(h / c.z) }, deviceScaleFactor: c.z });
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
      await p.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slug: 'semiologia-ii', layout: true }) }));
      if (ativo) await LIGAR(p);
      await p.goto(`${base}/p.html?slug=semiologia-ii&tab=semio2&uid=${JOSE}&seed=s2-b02&wait=1800`);
      await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(900);
      await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
      if (ativo) await p.evaluate(() => { const T = window.RMToolsV2; T.contratoModos = 1; T._test.anotarPermitido = () => window.RMModes.annotationsAllowed(); });
      await p.evaluate(() => window.RMModes.requestView('infografias')); await p.waitForTimeout(1200);
      const f = (s) => path.join(OUT, `ig_${c.nome}_${s}.png`);
      if (!ativo) { await p.screenshot({ path: f('vazio_codigo_entregue') }); await ctx.close(); continue; }
      await p.screenshot({ path: f('modo_SIMULADO_topo') });
      await p.evaluate(() => document.querySelectorAll('#rm-mode-root .rm-l2-ig-chip')[3].click()); await p.waitForTimeout(1500);
      await p.screenshot({ path: f('modo_SIMULADO_bloque05') });
      const m = await p.evaluate(() => {
        const H = document.documentElement, R = document.getElementById('rm-mode-root');
        const imgs = [...R.querySelectorAll('.rm-l2-ig-media')], carregadas = imgs.filter(i => i.style.backgroundImage).length;
        return { lmode: H.getAttribute('data-rm-lmode'), overflowX: H.scrollWidth - H.clientWidth, cartoes: R.querySelectorAll('.rm-l2-ig-card').length, grupos: R.querySelectorAll('.rm-l2-ig-group').length, imagensCarregadasNaJanela: carregadas, imagensTotal: imgs.length };
      });
      linhas.push({ caso: c.nome, viewportCSS: `${Math.round(c.w / c.z)}×${Math.round(h / c.z)}`, zoom: c.z, ...m, errosJS: errs.length });
      await ctx.close();
    }
  }
  await br.close(); srv.close();
  fs.writeFileSync(path.join(OUT, 'ig_metricas.json'), JSON.stringify({ nota: 'modo_SIMULADO = chave e contrato de anotações simulados; vazio_codigo_entregue = código entregue sem alteração', casos: linhas }, null, 1));
  console.table(linhas.map(l => ({ caso: l.caso, css: l.viewportCSS, lateral: l.lmode, 'overflow-x': l.overflowX, cartoes: l.cartoes, grupos: l.grupos, 'img carregadas': `${l.imagensCarregadasNaJanela}/${l.imagensTotal}`, erros: l.errosJS })));
})();
