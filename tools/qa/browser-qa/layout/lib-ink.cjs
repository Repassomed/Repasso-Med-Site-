/* Infraestrutura comum dos testes de tinta × layout (ink-jump.test.cjs, race.test.cjs).
   Semiología II REAL + app-core/rm-tools/rm-tools-v2 REAIS + piloto (rm-pilot → rm-layout/rm-modes REAIS).
   Supabase e o gate do piloto são simulados; 0 rede real, 0 escrita. A tinta é SEMEADA como se viesse do banco.

   REGRA DE VALIDADE (auditoria do #425): «desvio 0 px» só vale se existe tinta REALMENTE VISÍVEL no destino.
   Medida válida = (a) a âncora (bloco de texto) de ≥ 1 traço está na janela, (b) esse traço tem ≥ 1 <path>,
   (c) a bounding box do SVG e a do <path> são finitas e não vazias, (d) o alinhamento foi medido (SVG longe da âncora = desvio
   grande = reprova na tolerância).
   «0 px com 0 paths» (ou com a âncora fora da janela) = TESTE INVÁLIDO, que reprova — nunca passa. */
const { serve } = require('./serve.cjs');
const JOSE = 'd4d215d3-36dd-4efb-8869-bdea5376c648';                    // UID do piloto (público no código da V2: BETA_UIDS)
const FLAGS = { slug: 'semiologia-ii', layout: true, audio: false, pen: false };
const MAX = +(process.env.RM_DRIFT_MAX || 2);                            // tolerância de alinhamento (px)
const SEED = 's2-b10,s2-banco';

const R = { n: 0, fails: 0 };
const ok = (c, m) => { R.n++; if (!c) { R.fails++; console.log('    ✗ FALHA:', m); } else console.log('    ✓', m); return !!c; };
const info = (m) => console.log('    ·', m);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* medida da tinta no navegador (função serializada) */
const MEDIR = () => {
  const out = [];
  document.querySelectorAll('#rm2-ink svg[data-anchor]').forEach(sv => {
    const a = sv.getAttribute('data-anchor').split('>'); const sec = document.getElementById(a[0]); if (!sec) return;
    const el = a[1] !== undefined ? sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+a[1]] : sec; if (!el) return;
    const r = el.getBoundingClientRect(), s = sv.getBoundingClientRect();
    const paths = sv.querySelectorAll('path'); const pb = paths[0] ? paths[0].getBoundingClientRect() : null;
    const fin = (b) => !!b && [b.left, b.top, b.width, b.height].every(Number.isFinite) && b.width > 0 && b.height > 0;
    const ancoraVisivel = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
    const d = Math.max(Math.abs(s.left - r.left), Math.abs(s.top - r.top), Math.abs(s.width - r.width), Math.abs(s.height - r.height));
    const svgVisivel = fin(s) && s.bottom > 0 && s.top < innerHeight && getComputedStyle(sv).display !== 'none';
    out.push({ anchor: sv.getAttribute('data-anchor'), d, ancoraVisivel, svgVisivel, paths: paths.length, bboxOk: fin(s) && fin(pb) });
  });
  const vis = out.filter(o => o.ancoraVisivel);
  return {
    n: out.length, nAncoraVisivel: vis.length,
    pathsVisiveis: vis.reduce((a, o) => a + o.paths, 0),
    bboxOk: vis.length > 0 && vis.every(o => o.bboxOk),             // SVG deslocado para longe da âncora NÃO é «inválido»: é desvio grande (reprova na tolerância)
    desvio: vis.length ? Math.max(...vis.map(o => o.d)) : null,       // null = nada visível medido
    desvioTodos: out.length ? Math.max(...out.map(o => o.d)) : null
  };
};
const medir = (page) => page.evaluate(MEDIR);
/* medida válida: tinta visível de verdade no destino */
const valida = (m) => !!m && m.nAncoraVisivel > 0 && m.pathsVisiveis > 0 && m.bboxOk && m.desvio !== null;
const descr = (m) => m ? `traços visíveis=${m.nAncoraVisivel} · paths=${m.pathsVisiveis} · bbox ${m.bboxOk ? 'ok' : 'INVÁLIDA'} · desvio=${m.desvio === null ? 'n/d' : m.desvio.toFixed(1) + ' px'}` : 'sem medida';
/* asserção de tinta: reprova também quando a medida é inválida (nunca passa com «0 px» vazio) */
function okTinta(m, msg) {
  if (!valida(m)) { R.n++; R.fails++; console.log(`    ✗ TESTE INVÁLIDO (sem tinta visível no destino): ${msg} — ${descr(m)}`); return false; }
  return ok(m.desvio <= MAX, `${msg} — ${descr(m)}`);
}

async function abrir(br, base, w, h, { seed = SEED, imgs = 0, atrasoImg = 0, rotas = null } = {}) {
  const page = await br.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push('c:' + m.text().slice(0, 140)); });
  await page.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FLAGS) }));
  if (rotas) await rotas(page);                                          // gancho de teste: rotas extras ANTES da navegação
  if (atrasoImg) await page.route('**/__img/**', async r => { await sleep(atrasoImg); r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#cfd8e6"/></svg>' }); });
  await page.goto(`${base}/p.html?slug=semiologia-ii&tab=semio2&uid=${JOSE}&seed=${seed}&wait=1800`, { timeout: 120000 });
  await page.waitForFunction('window.__ready===true', { timeout: 120000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  return { page, errs, w, h };
}
const blocosIds = (page) => page.evaluate(() => [...document.querySelectorAll('.rm-l2-block-link[data-target]')].map(a => a.getAttribute('data-target')));
async function abrirIndice(page, w) {
  if (w < 768) { await page.click('.rm-l2-hamb'); await page.waitForTimeout(350); }
  else { await page.evaluate(() => { const t = document.querySelector('.rm-l2-tree-toggle'); if (t && t.getAttribute('aria-expanded') !== 'true') t.click(); }); await page.waitForTimeout(200); }
}
async function clicarBloco(page, w, id) {
  const visivel = await page.evaluate(i => { const a = document.querySelector(`.rm-l2-block-link[data-target="${i}"]`); return !!(a && a.offsetParent); }, id);
  if (!visivel) await abrirIndice(page, w);
  await page.evaluate(i => document.querySelector(`.rm-l2-block-link[data-target="${i}"]`).click(), id);
}
/* leva a âncora do traço da seção `secId` ao meio da janela (o aluno rola até a tinta depois de chegar ao bloco) */
async function trazerTinta(page, secId) {
  await page.evaluate(id => {
    const sv = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].find(s => s.getAttribute('data-anchor').split('>')[0] === id); if (!sv) return;
    const a = sv.getAttribute('data-anchor').split('>'); const sec = document.getElementById(a[0]);
    const el = sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+a[1]]; el.scrollIntoView({ block: 'center' });
  }, secId);
}
/* espera a medida ficar VÁLIDA e dentro da tolerância (ou estoura o prazo) */
async function ate(page, prazo = 3500) {
  const t0 = Date.now(); let m;
  for (;;) { m = await medir(page); if ((valida(m) && m.desvio <= MAX) || Date.now() - t0 > prazo) break; await page.waitForTimeout(100); }
  return { ms: Date.now() - t0, m };
}
/* instrumentos: grava toda chamada a window.scrollTo e a RMToolsV2.reposicionar (com a origem pela pilha e o modo no instante) */
const INSTRUMENTAR = () => {
  window.__sc = []; window.__rp = [];
  const orig = window.scrollTo.bind(window);
  window.scrollTo = function () {
    const rm = /rm-(modes|layout)/.test(new Error().stack || '');
    window.__sc.push({ t: performance.now(), arg: [...arguments], view: window.RMModes && window.RMModes.view, rm, y: window.pageYOffset });
    return orig.apply(window, arguments);
  };
  const V = window.RMToolsV2; const origRp = V.reposicionar;
  V.reposicionar = function () {
    window.__rp.push({ t: performance.now(), view: window.RMModes && window.RMModes.view, penDown: document.body.classList.contains('rm2-pen-down'), full: window.RMModes && window.RMModes.isFull() });
    return origRp.apply(this, arguments);
  };
};
const agora = (page) => page.evaluate(() => performance.now());
const finish = (nome) => { console.log(`\n${nome}: ${R.n - R.fails}/${R.n} verificações OK` + (R.fails ? ` — ${R.fails} FALHAS` : '')); return R.fails; };
module.exports = { serve, JOSE, FLAGS, MAX, SEED, R, ok, info, sleep, MEDIR, medir, valida, descr, okTinta, abrir, blocosIds, abrirIndice, clicarBloco, trazerTinta, ate, INSTRUMENTAR, agora, finish };
