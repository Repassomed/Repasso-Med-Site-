/* POST-IT LATERAL QUE APARECE MAS NÃO RECEBE TOQUE (#464 · caso funcional achado na QA da #366).
   O `.rmc-margin` aninhado num filho de `.container` (`.rmc-detalle`…) cuelga abaixo do pai; o IRMÃO SEGUINTE (z:1, depois no DOM) fica por cima do contexto inteiro.
   Quando esse irmão é TRANSPARENTE a nota continua à vista — a captura por pixel de `postits-encobertos.test.cjs` não vê nada — mas o toque/mouse cai no irmão:
   o texto da nota não seleciona e o marcador não grifa. Matérias com o caso medido na `main`: Dermatología (`dermb01–03`) e Oftalmología (`ofb09`).
   O que se prova, em Dermatología e Oftalmología, 1024 e 1440 px (onde a nota flutua), na MESMA página e em dois estados:
     COM a correção (o CSS servido):  A · o centro de CADA linha real de texto (Range.getClientRects) de TODA `.rmc-margin` devolve a própria nota em elementFromPoint;
                                     B · em CADA nota aninhada, um arrasto real de mouse seleciona texto DENTRO da nota;
                                     C · em CADA nota aninhada, o marcador real (RMToolsV2 'highlight') + arrasto cria `.rm-hl` na nota e grava insert:user_highlights (simulado);
     SEM a correção (regra neutralizada pelo mesmo override de `postits-encobertos.test.cjs`, = a `main`): as notas aninhadas conhecidas (`ofb09`, `dermb02`)
                                     falham A, B e C — prova de que o teste enxerga o defeito e de que é a regra que o resolve.
   Imagens carregadas antes de medir (imagem preguiçosa que carrega no meio desloca o layout e gera falso negativo). Matéria real via harness do ensaio
   (`tools/qa/ensaio-layout/lib.cjs`: styles.css + <style>/topo do index + app-core + rm-tools/V2 reais; sessão simulada, 0 rede externa; escritas só registradas).
   Uso:  NODE_PATH=$(npm root -g) node tools/qa/browser-qa/layout/postit-toque.test.cjs                                                                       */
'use strict';
const L = require('../../ensaio-layout/lib.cjs');
const NOTAS = '#materias-container .tab-content .rmc-margin';
const OLD = '#materias-container .rm-cuaderno .container>:has(>.rmc-margin){z-index:1!important}';   // = a main sem a correção (mesmo override de postits-encobertos.test.cjs)
const CONHECIDAS = { dermatologia: ['dermb02'], oftalmologia: ['ofb09'] };                                // notas aninhadas que a main deixa sem toque (medido)
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 300) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);

/* mede uma nota: linhas no topo, seleção por arrasto e grifo pelo marcador */
async function medir(p, i, comGrifo) {
  const A = await p.evaluate(([s, i]) => {
    const n = document.querySelectorAll(s)[i]; n.scrollIntoView({ block: 'center' });
    const tw = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, { acceptNode: t => t.textContent.trim().length > 2 ? 1 : 2 }); let t, tot = 0, topo = 0; const quem = new Set(), meio = [];
    while ((t = tw.nextNode())) { const rg = document.createRange(); rg.selectNodeContents(t);
      for (const q of rg.getClientRects()) { if (q.width < 8 || q.top < 0 || q.bottom > innerHeight) continue; tot++;
        const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); if (e && n.contains(e)) topo++; else if (e) quem.add(e.tagName + '.' + String(e.className).split(' ')[0]);
        if (q.width > 70 && !t.parentElement.closest('.rm-hl')) meio.push({ x0: q.left + 4, x1: q.right - 4, y: q.top + q.height / 2 }); } }
    return { sec: n.closest('section[id]').id, aninhada: !n.parentElement.matches('section[id]'), tot, topo, quem: [...quem], linha: meio[Math.floor(meio.length / 2)] || null };
  }, [NOTAS, i]);
  if (!A.aninhada || !A.linha || !comGrifo) return A;
  const arrasta = async ln => { await p.mouse.move(ln.x0, ln.y); await p.mouse.down(); for (let k = 1; k <= 10; k++) { await p.mouse.move(ln.x0 + (ln.x1 - ln.x0) * k / 10, ln.y); await p.waitForTimeout(12); } await p.mouse.up(); };
  /* B · seleção: a maior seleção DENTRO da nota durante o arrasto (o motor pode recolhê-la ao soltar) */
  await p.evaluate(([s, i]) => { window.__selAlvo = document.querySelectorAll(s)[i]; window.__selMax = 0; }, [NOTAS, i]);
  await arrasta(A.linha); await p.waitForTimeout(150);
  A.selecao = await p.evaluate(() => { const v = window.__selMax; window.__selAlvo = null; getSelection().removeAllRanges(); return v; });
  /* C · grifo com o marcador real */
  await p.evaluate(() => window.RMToolsV2.escolherFerramenta('highlight')); await p.waitForTimeout(200);
  const h0 = await p.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelectorAll('.rm-hl').length, [NOTAS, i]), w0 = await p.evaluate(() => (window.__writes || []).length);
  await arrasta(A.linha); await p.waitForTimeout(900);
  const h1 = await p.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelectorAll('.rm-hl').length, [NOTAS, i]);
  const wr = await p.evaluate(w0 => (window.__writes || []).slice(w0), w0);
  await p.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await p.waitForTimeout(150);
  A.grifo = { h0, h1, gravou: wr.includes('insert:user_highlights') };
  return A;
}

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.servir(); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  try {
    for (const slug of ['dermatologia', 'oftalmologia']) for (const [w, h] of [[1024, 768], [1440, 900]]) {
      const mat = L.reconciliar().ativas.find(a => a.slug === slug);
      const r = await L.abrir(br, base, mat, { w, h, modo: 'controle', touch: false, espera: 900 }); const p = r.page;
      await p.evaluate(async () => { for (const im of document.querySelectorAll('#materias-container img')) { im.loading = 'eager'; im.scrollIntoView(); await new Promise(z => setTimeout(z, 10)); } });
      await p.waitForFunction(() => [...document.querySelectorAll('#materias-container img')].every(i => i.complete), { timeout: 90000 }); await p.waitForTimeout(500);
      await p.evaluate(() => { document.addEventListener('selectionchange', () => { const a = window.__selAlvo; if (!a) return; const g = getSelection(); if (!g.rangeCount) return; const rg = g.getRangeAt(0);
        if (a.contains(rg.startContainer) && a.contains(rg.endContainer)) window.__selMax = Math.max(window.__selMax || 0, g.toString().trim().length); }); });
      const nn = await p.evaluate(s => document.querySelectorAll(s).length, NOTAS);

      sec(`${slug} · ${w} px · COM a correção (CSS servido) — ${nn} notas`);
      let linhas = 0, linhasTopo = 0; const enc = [], aninh = [];
      for (let i = 0; i < nn; i++) { const A = await medir(p, i, true); linhas += A.tot; linhasTopo += A.topo; if (A.topo < A.tot) enc.push({ i, sec: A.sec, quem: A.quem }); if (A.aninhada) aninh.push(A); }
      ok(enc.length === 0 && linhas > 0, `A · toda linha de texto das ${nn} notas recebe o toque (${linhasTopo}/${linhas})`, enc);
      ok(aninh.length > 0, `há notas aninhadas para medir (${aninh.length}: ${[...new Set(aninh.map(a => a.sec))].join(', ')})`);
      ok(aninh.every(a => a.selecao > 3), `B · as ${aninh.length} notas aninhadas selecionam por arrasto`, aninh.filter(a => !(a.selecao > 3)).map(a => a.sec));
      ok(aninh.every(a => a.grifo && a.grifo.h1 > a.grifo.h0 && a.grifo.gravou), `C · o marcador grifa as ${aninh.length} notas aninhadas e grava`, aninh.filter(a => !(a.grifo && a.grifo.h1 > a.grifo.h0 && a.grifo.gravou)).map(a => ({ sec: a.sec, g: a.grifo })));

      sec(`${slug} · ${w} px · SEM a correção (regra neutralizada = main) — o teste tem de enxergar o defeito`);
      await p.addStyleTag({ content: '@media (min-width:920px){' + OLD + '}' }); await p.waitForTimeout(300);
      const alvo = [];
      for (let i = 0; i < nn; i++) { const s = await p.evaluate(([s, i]) => { const n = document.querySelectorAll(s)[i]; return { sec: n.closest('section[id]').id, aninhada: !n.parentElement.matches('section[id]') }; }, [NOTAS, i]);
        if (s.aninhada && CONHECIDAS[slug].includes(s.sec)) alvo.push(Object.assign({ i }, await medir(p, i, true))); }
      ok(alvo.length > 0, `notas conhecidas presentes (${CONHECIDAS[slug].join(', ')}: ${alvo.length})`);
      ok(alvo.some(a => a.topo < a.tot), `A falha: notas aninhadas de ${CONHECIDAS[slug].join(', ')} ficam com linhas sem toque (${alvo.map(a => a.topo + '/' + a.tot).join(' · ')})`);
      ok(alvo.some(a => !(a.selecao > 3)), `B falha: ao menos uma delas não seleciona (${alvo.map(a => a.selecao).join(' · ')} caracteres)`);
      ok(alvo.some(a => !(a.grifo && a.grifo.h1 > a.grifo.h0)), `C falha: o marcador não grifa ao menos uma delas`);
      ok(r.errs.length === 0, '0 erros JS', r.errs);
      await r.ctx.close();
    }
  } catch (e) { ko++; console.log('  ✗ exceção:', e && e.stack || e); }
  await br.close(); srv.close();
  console.log(`\npostit-toque: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})();
