/* R14 · TINTA EM TABELA LARGA COM ROLAGEM PRÓPRIA — rm-tools-v2.js REAL, matérias reais, celular (390 px, mobile, escala 2) e computador.
   Defeito (achado do pré-voo): o traço sobre uma <table> mais larga que a tela (rolável em .rmc-scroll/.s2-scroll) era normalizado pela caixa INTEIRA da tabela; o svg da camada de tinta
   passava da viewport, `scrollWidth` ia de 390 a 407 e o navegador móvel afastava a página (ponta e tinta se desencontravam ~31 px).
   Prova: (1) com traços gravados em tabelas largas a página NÃO alarga (scrollWidth = clientWidth = innerWidth); (2) o traço só aparece na parte do contêiner que está à vista (clip-path)
   e ACOMPANHA a rolagem horizontal da tabela; (3) ao rolar de volta o traço volta ao lugar; (4) grifos/traços/notas gravados antes ficam IDÊNTICOS, 0 escrita no banco;
   (5) o traço de um parágrafo comum (fora de contêiner rolável) não ganha clip-path; (6) 0 erros JS.
   Matérias: Semiología II (.s2-scroll) e Farmacología II (.rmc-scroll) — as duas com tabelas largas em 390 px.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/tinta-tabela-larga.test.cjs */
'use strict';
process.env.RM_ENSAIO_SEM = 'A7,C8';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
const D = require('./lib-dados.cjs');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };

(async () => {
  const rec = L.reconciliar();
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const [slug, W, H, mobile] of [['semiologia-ii', 390, 844, true], ['farmacologia-ii', 390, 844, true], ['semiologia-ii', 1440, 900, false]]) {
    const m = rec.ativas.find(x => x.slug === slug);
    console.log(`\n▸ ${slug} · ${W}px${mobile ? ' (celular)' : ' (computador)'}`);
    const ctx = await br.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 160))); await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [slug]);
    const abrir = async () => { await page.goto(`${base}/p.html?slug=${slug}&tab=${m.tab}&modo=controle&wait=1500&persist=1`, { timeout: 120000 }); await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(900); };
    await abrir();
    await page.evaluate(D.SEMEAR, { slug, uid: D.UID, max: 5 });
    /* 1 traço em cada uma das até 3 primeiras tabelas realmente largas (mais largas que o contêiner rolável) + 1 num parágrafo comum */
    const sem = await page.evaluate(([uid, s]) => {
      const tab = document.querySelector('#materias-container > .tab-content'); const tr = JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]'); const feitos = [];
      const tbs = [...tab.querySelectorAll('table')].filter(t => { const sc = t.closest('.rmc-scroll,.s2-scroll'); return sc && sc.scrollWidth > sc.clientWidth + 20 && !t.closest('.quiz-item,.flashcard,[data-rm-ui]'); }).slice(0, 3);
      tbs.forEach((t, i) => { const an = window.RMToolsV2._test.anchorDe(t); if (an && an.id.indexOf('>') > 0) { tr.push({ id: 'ens-ink-tab' + i, user_id: uid, subject_slug: s, anchor_id: an.id, color: 'black', width: 'medium', created_at: new Date(Date.now() - 86400000).toISOString(), points: [[0.05, 0.3], [0.5, 0.5], [0.97, 0.3]] }); feitos.push(an.id); } });
      sessionStorage.setItem('ens.user_ink_strokes', JSON.stringify(tr)); return { largas: tbs.length, feitos };
    }, [D.UID, slug]);
    if (!mobile) {   // computador: as tabelas cabem; controle de que NADA muda (sem clip-path, sem alargar, dados idênticos)
      await abrir(); await page.evaluate(() => window.RMToolsV2.reposicionar()); await page.waitForTimeout(400);
      const ref0 = await page.evaluate(D.MEDIR);
      const l = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, clip: [...document.querySelectorAll('#rm2-ink svg')].filter(v => v.style.clipPath).length, n: document.querySelectorAll('#rm2-ink svg').length }));
      ok(l.sw <= l.cw + 1, `computador: a página não alarga (${l.sw}/${l.cw})`, l); ok(l.clip === 0 && l.n > 0, `computador: nenhum dos ${l.n} traços ganha clip-path (tabelas cabem)`, l);
      ok(ref0.tracos.length >= 5 && ref0.grifos.length > 0, `computador: ${ref0.grifos.length} grifos, ${ref0.tracos.length} traços e ${ref0.notas.length} nota(s) presentes, 0 escrita no banco`, ref0.escritas); ok(errs.length === 0, '0 erros JS', errs);
      await ctx.close(); continue;
    }
    ok(sem.feitos.length > 0, `achou ${sem.largas} tabela(s) mais larga(s) que o contêiner e gravou ${sem.feitos.length} traço(s) nelas`, sem);
    await abrir(); await page.evaluate(() => window.RMToolsV2.reposicionar()); await page.waitForTimeout(400);
    const ref = await page.evaluate(D.MEDIR);
    const larg = () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, iw: innerWidth }));
    const l0 = await larg(); ok(l0.sw <= l0.cw + 1 && l0.iw === l0.cw, `a página NÃO alarga (scrollWidth ${l0.sw}, clientWidth ${l0.cw}, innerWidth ${l0.iw})`, l0);
    /* o traço acompanha a rolagem do contêiner e só aparece na parte à vista */
    const alvo = sem.feitos[0];
    const medir = () => page.evaluate((a) => {
      const sv = document.querySelector(`#rm2-ink svg[data-anchor="${a}"]`); const [sid, ix] = a.split('>'); const el = document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+ix]; const sc = el.closest('.rmc-scroll,.s2-scroll');
      sc.scrollIntoView({ block: 'center' });
      const r = sv.getBoundingClientRect(), t = el.getBoundingClientRect(), s = sc.getBoundingClientRect();
      return { svgEsq: Math.round(r.left), tabEsq: Math.round(t.left), scEsq: Math.round(s.left), scDir: Math.round(s.right), clip: sv.style.clipPath || '', scrollLeft: sc.scrollLeft, max: sc.scrollWidth - sc.clientWidth };
    }, alvo);
    await page.evaluate(a => { const [sid, ix] = a.split('>'); document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+ix].scrollIntoView({ block: 'center' }); }, alvo); await page.waitForTimeout(400);
    await page.evaluate(() => window.RMToolsV2.reposicionar()); await page.waitForTimeout(300);
    const a0 = await medir();
    ok(/inset\(/.test(a0.clip), `o svg recebe clip-path pelo retângulo do contêiner rolável (${a0.clip})`, a0);
    ok(Math.abs(a0.svgEsq - a0.tabEsq) <= 1, 'em repouso o svg está sobre a tabela (esq. igual)', a0);
    const dx = Math.min(120, a0.max);
    await page.evaluate(([a, d]) => { const [sid, ix] = a.split('>'); const sc = document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+ix].closest('.rmc-scroll,.s2-scroll'); sc.scrollLeft = d; }, [alvo, dx]);
    await page.waitForTimeout(400);
    const a1 = await medir();
    ok(a1.scrollLeft >= dx - 1 && Math.abs((a1.svgEsq - a0.svgEsq) + a1.scrollLeft) <= 2, `rolando a tabela ${a1.scrollLeft} px o traço acompanha (svg deslocou ${a1.svgEsq - a0.svgEsq} px)`, { a0, a1 });
    const l1 = await larg(); ok(l1.sw <= l1.cw + 1 && l1.iw === l1.cw, `com a tabela rolada a página continua sem alargar (${l1.sw}/${l1.cw}/${l1.iw})`, l1);
    await page.evaluate(([a]) => { const [sid, ix] = a.split('>'); document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+ix].closest('.rmc-scroll,.s2-scroll').scrollLeft = 0; }, [alvo]);
    await page.waitForTimeout(400);
    const a2 = await medir(); ok(Math.abs(a2.svgEsq - a0.svgEsq) <= 1, 'rolando de volta o traço volta ao lugar', { a0, a2 });
    /* parágrafo comum: sem clip-path */
    const comum = await page.evaluate(() => { const svs = [...document.querySelectorAll('#rm2-ink svg')].filter(v => { const a = v.getAttribute('data-anchor'); if (a.indexOf('>') < 0) return false; const [sid, ix] = a.split('>'); const e = document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+ix]; return e && e.tagName === 'P' && !e.closest('.rmc-scroll,.s2-scroll'); }); return { n: svs.length, comClip: svs.filter(v => v.style.clipPath).length }; });
    ok(comum.n === 0 || comum.comClip === 0, `traços em parágrafo comum não ganham clip-path (${comum.n} conferidos)`, comum);
    const fim = await page.evaluate(D.MEDIR);
    const dif = D.comparar(ref, fim, 'rolagem').filter(x => !/^(traco-deslocado)$/.test(x.tipo));
    ok(dif.length === 0, `${fim.grifos.length} grifos, ${fim.tracos.length} traços e ${fim.notas.length} nota(s) idênticos, 0 escrita no banco`, dif.slice(0, 3));
    ok(errs.length === 0, '0 erros JS', errs);
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`\ntinta-tabela-larga: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
