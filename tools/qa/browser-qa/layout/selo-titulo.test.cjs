/* SELO DO BLOCO × ÍNDICE × «BLOQUE NN» e TÍTULO DA MATÉRIA × «Arriba»/«Índice».
   Roda o index.html REAL (login real com supabase-js real contra o GoTrue simulado de recovery/harness.cjs; 0 rede externa; nada gravado)
   e serve cada matéria pelo get-materia a partir do HTML privado da árvore (netlify/functions/materias-privadas/).
   O que se prova:
     A · nas 27 matérias do catálogo (1440 px), o selo de cada bloco é IGUAL ao chip do índice, e, quando o próprio marcador do bloco declara
         «BLOQUE NN»/«TEMA NN», os dois mostram NN. Antes: o selo contava pela posição (a portada empurrava: «02» ao lado de «BLOQUE 01») e o
         índice pela posição sem as especiais (Histología II Práctica «01» no Bloque 02; Semiología II, Anatopatología I, Imagenología).
     B · em 6 matérias × 390/768/1024/1440, nenhum retângulo do TEXTO do título/subtítulo cruza «Arriba», «Índice» ou o trilho da direita; sem
         overflow horizontal; 0 erros JS.
   Controle: com a árvore da `main` anterior (RM_SITE_DIR=<export da main>) A e B falham.
   Uso:  export NODE_PATH=$(npm root -g) RM_SUPABASE_UMD=<supabase.js UMD, ver recovery/harness.cjs>
         node tools/qa/browser-qa/layout/selo-titulo.test.cjs                                                                              */
'use strict';
const path = require('path'), fs = require('fs');
const H = require('../recovery/harness.cjs');
const SITE = process.env.RM_SITE_DIR || path.resolve(__dirname, '../../../../Repasso-Med-Site--main/Atual - Copia');
const PRIV = path.join(SITE, 'netlify/functions/materias-privadas');
const IDX = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const CAT = [...IDX.matchAll(/slug:\s*'([a-z0-9-]+)',\s*tab:\s*'([a-z0-9-]+)'/g)].map(m => [m[1], m[2]]).filter(([s]) => fs.existsSync(path.join(PRIV, s + '.html')));
const LARG = ['dermatologia', 'oftalmologia', 'neurologia', 'guarani', 'anatomia-patologica-ii-practica', 'ortopedia'];
const HS = { 390: 844, 768: 1024, 1024: 768, 1440: 900 };
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 400) : ''); } return !!c; };

async function entrar(br, w, mats) {
  const s = await H.newSession(br, 'x', { viewport: { width: w, height: HS[w] } });
  s.be.addUser({ email: 'aluno@ex.com', password: 'senha12345', active: true });
  await s.context.route(H.SB + '/rest/v1/my_active_subjects*', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(mats.map(m => ({ subject_slug: m[0] }))) }));
  await s.context.route(u => /\/\.netlify\/functions\//.test(u.pathname), r => {
    const u = new URL(r.request().url());
    if (u.pathname.endsWith('/get-materia')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(PRIV, u.searchParams.get('slug') + '.html'), 'utf8') });
    return r.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  await s.page.goto(s.base); await s.page.waitForTimeout(800);
  await s.page.fill('#au-email', 'aluno@ex.com'); await s.page.fill('#au-pass', 'senha12345'); await s.page.click('button[onclick="authLogin()"]');
  await s.page.waitForFunction(() => !document.getElementById('main-tabs').classList.contains('hidden'), { timeout: 20000 });
  await s.page.waitForTimeout(500);
  return s;
}
async function abrir(p, tab) {
  await p.evaluate(t => openTab(t), tab);
  await p.waitForFunction(t => { const e = document.querySelector('#tab-' + t); return e && e.classList.contains('active') && e.querySelector('.rm-menu'); }, tab, { timeout: 30000 });
  await p.waitForTimeout(700);
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); }); await p.waitForTimeout(250);
}
const medir = (p, tab) => p.evaluate(t => {
  const el = document.querySelector('#tab-' + t);
  const R = q => ({ x: q.left, y: q.top, r: q.right, b: q.bottom });
  const vis = e => { if (!e) return null; const q = e.getBoundingClientRect(); return q.width && q.height ? R(q) : null; };
  const cruza = (a, b) => !!(a && b) && Math.min(a.r, b.r) - Math.max(a.x, b.x) > 0.5 && Math.min(a.b, b.b) - Math.max(a.y, b.y) > 0.5;
  const txt = e => { const o = []; if (!e) return o; const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let x;
    while ((x = tw.nextNode())) { if (!x.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(x); for (const q of rg.getClientRects()) if (q.width > 1) o.push(R(q)); } return o; };
  const chip = e => e.querySelector('svg') ? 'ícone' : e.textContent.trim();
  const toc = {}; el.querySelectorAll('.rm-menu-list > .rm-menu-item > a').forEach(a => { toc[a.dataset.target] = chip(a.querySelector('.rm-menu-num')); });
  const selos = [...el.querySelectorAll('section[id] .rm-block-head')].map(h => { const sec = h.closest('section[id]'); const m = /\b(?:BLOQUE|TEMA)\s*0*(\d+)/i.exec(h.querySelector('.rm-block-kicker').textContent);
    return { id: sec.id, selo: chip(h.querySelector('.rm-block-num')), toc: toc[sec.id], decl: m ? String(Number(m[1])).padStart(2, '0') : null }; });
  const head = el.querySelector(':scope > .rm-subject-head');
  const ctl = [vis(el.querySelector('.rm-tools .rm-top')), vis(el.querySelector('.rm-menu-btn')), ...[...el.querySelectorAll('.rm-tools-r .rm-tools-btn')].map(vis)].filter(Boolean);
  const textos = txt(head);
  return { selos, nCtl: ctl.length, nTxt: textos.length, cruzes: textos.filter(q => ctl.some(c => cruza(q, c))).length, overflow: document.documentElement.scrollWidth > innerWidth };
}, tab);

(async () => {
  const br = await H.chromium.launch();
  try {
    console.log(`\n▸ A · selo = índice = número declarado — ${CAT.length} matérias do catálogo, 1440 px`);
    ok(CAT.length >= 27, `catálogo lido do index.html (${CAT.length} matérias com HTML privado)`);
    let s = await entrar(br, 1440, CAT);
    for (const [slug, tab] of CAT) {
      await abrir(s.page, tab); const m = await medir(s.page, tab);
      const dif = m.selos.filter(x => x.selo !== x.toc), decl = m.selos.filter(x => x.decl !== null && x.selo !== x.decl);
      ok(m.selos.length > 0 && !dif.length && !decl.length, `${slug}: ${m.selos.length} selos iguais ao índice; ${m.selos.filter(x => x.decl).length} com número declarado e batendo`, { dif: dif.slice(0, 3), decl: decl.slice(0, 3) });
    }
    ok(s.errs.length === 0, '0 erros JS (27 matérias)', s.errs.slice(0, 3)); await s.context.close();

    for (const w of [390, 768, 1024, 1440]) {
      console.log(`\n▸ B · título × «Arriba»/«Índice»/trilho direito — ${w} px`);
      s = await entrar(br, w, CAT.filter(([sl]) => LARG.includes(sl)));
      for (const [slug, tab] of CAT.filter(([sl]) => LARG.includes(sl))) {
        await abrir(s.page, tab); const m = await medir(s.page, tab);
        ok(m.nCtl >= 3 && m.nTxt > 0 && m.cruzes === 0 && !m.overflow, `${slug}: ${m.nTxt} linhas do título/subtítulo × ${m.nCtl} botões fixos → ${m.cruzes} cruzamentos (esperado 0)${m.overflow ? ', COM overflow' : ', sem overflow'}`, m);
      }
      ok(s.errs.length === 0, `0 erros JS (${w} px)`, s.errs.slice(0, 3)); await s.context.close();
    }
  } catch (e) { ko++; console.log('  ✗ exceção:', e && e.stack || e); }
  await br.close(); H.stopServer();
  console.log(`\nselo-titulo: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})();
