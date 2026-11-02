/* Medicina Legal · P2 (issue #628) — teste no navegador da ordem 08 Tanatología I · 09 Tanatología II · 10 Asfixiología · 11 Autopsia · 12 Documentos.
   Local, somente leitura (harness do ensaio: Supabase simulado, zero rede externa). Matéria no modo «controle» (layout antigo, como o site serve hoje) e no modo «nav» (layout novo, só em memória).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/medicina-legal-p2/teste-ordem-e-conteudo.cjs [--shots=<dir>] */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('../ensaio-layout/lib.cjs');
const SHOTS = (process.argv.find(a => a.startsWith('--shots=')) || '').slice(8) || null;
const ESPERADO = ['medlegb00', 'medlegb01', 'medlegb02', 'medlegdocu', 'medlegninez', 'medlegb07', 'medlegb08', 'medlegb09', 'medlegb03', 'medlegb04', 'medlegb10', 'medlegb05', 'medlegb06', 'medlegb11', 'medlegb12', 'medlegb13', 'medlegb14', 'medlegb15', 'bancomedleg', 'bancofcmedleg', 'bibliomedleg'];
const MARC = [['medlegb03', 'BLOQUE 08 · PARCIAL 2 · TANATOLOGÍA I'], ['medlegb04', 'BLOQUE 09 · PARCIAL 2 · TANATOLOGÍA II'], ['medlegb10', 'BLOQUE 10 · PARCIAL 2 · ASFIXIOLOGÍA'], ['medlegb05', 'BLOQUE 11 · PARCIAL 1 · AUTOPSIA'], ['medlegb06', 'BLOQUE 12 · PARCIAL 1 · DOCUMENTOS']];
const QF = { medlegb03: [18, 27], medlegb04: [16, 24], medlegb10: [15, 25], medlegb05: [13, 19], medlegb06: [18, 19] };
const res = []; const ok = (w, modo, nome, c, det) => { res.push({ ok: !!c }); console.log((c ? 'PASSA ' : 'FALHA ') + modo + ' @' + w + ' ' + nome + (det !== undefined ? ' → ' + JSON.stringify(det).slice(0, 260) : '')); };
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const m = L.reconciliar().ativas.find(x => x.slug === 'medicina-legal');
  const srv = await L.servir({}); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const [modo, W] of [['controle', 1440], ['controle', 768], ['controle', 390], ['nav', 1440], ['nav', 768]]) {
    const r = await L.abrir(br, base, m, { w: W, h: ({ 390: 844, 768: 1024, 1440: 900 })[W], modo, espera: 800 }); const p = r.page;
    const D = await p.evaluate(() => {
      const tab = document.querySelector('#materias-container > .tab-content');
      const secs = [...tab.querySelectorAll(':scope > section[id]')];
      const marc = Object.fromEntries(secs.map(s => [s.id, ((s.querySelector(':scope > .section-marker') || {}).textContent || '').replace(/\s+/g, ' ').trim()]));
      const h3 = Object.fromEntries(['medlegb03', 'medlegb04', 'medlegb10', 'medlegb06'].map(i => [i, [...document.getElementById(i).querySelectorAll(':scope > .ml-detalle > h3')].map(h => h.textContent.trim().slice(0, 4))]));
      const cont = Object.fromEntries(['medlegb03', 'medlegb04', 'medlegb10', 'medlegb05', 'medlegb06'].map(i => { const s = document.getElementById(i); return [i, [s.querySelectorAll('.quiz-item').length, s.querySelectorAll('.flashcard').length]]; }));
      const banco = [...document.querySelectorAll('#bancomedleg h3.ml-bank-sub')].map(h => h.textContent.replace(/\s+/g, ' ').trim().slice(0, 28));
      const stats = [...document.querySelectorAll('#bancomedleg .ml-bank-stats span, #bancofcmedleg .ml-bank-stats span')].map(s => s.textContent);
      return { ids: secs.map(s => s.id), marc, h3, cont, banco, stats, nq: document.querySelectorAll('#bancomedleg .quiz-item').length, nfm: document.querySelectorAll('#bancofcmedleg .fc-grid:not([data-shuffle]) .flashcard').length };
    });
    ok(W, modo, 'ordem das 21 seções', JSON.stringify(D.ids) === JSON.stringify(ESPERADO), D.ids.join(' '));
    ok(W, modo, 'marcadores BLOQUE 08→12', MARC.every(([i, t]) => (D.marc[i] || '').startsWith('— ' + t)), D.marc);
    ok(W, modo, 'contagens por bloco (preguntas, flashcards)', Object.entries(QF).every(([i, c]) => JSON.stringify(D.cont[i]) === JSON.stringify(c)), D.cont);
    ok(W, modo, 'banco: 244 preguntas, grupos em ordem 01→17; mazo 389', D.nq === 244 && D.nfm === 389 && D.banco.map(x => x.slice(0, 9)).join() === Array.from({ length: 17 }, (_, i) => 'Bloque ' + String(i + 1).padStart(2, '0')).join(), { nq: D.nq, nfm: D.nfm, stats: D.stats });
    ok(W, modo, 'numeração dos subtítulos h3 contínua (bloque 10 e 12)', D.h3.medlegb10.join() === '1 · ,2 · ,3 · ,4 · ,5 · ,6 · ,7 · ' && D.h3.medlegb06.join() === '1 · ,2 · ,3 · ,4 · ', D.h3);
    if (modo === 'controle') {
      // imagens dos blocos 08–12 carregam
      for (const i of ['medlegb03', 'medlegb04', 'medlegb10', 'medlegb05', 'medlegb06']) await p.evaluate(id => { document.getElementById(id).scrollIntoView(); document.getElementById(id).querySelectorAll('img').forEach(im => { im.loading = 'eager'; }); }, i);
      await p.waitForTimeout(1200);
      const IM = await p.evaluate(() => Object.fromEntries(['medlegb03', 'medlegb04', 'medlegb10', 'medlegb05', 'medlegb06'].map(i => [i, [...document.getElementById(i).querySelectorAll('img')].map(im => im.complete && im.naturalWidth > 0)])));
      ok(W, modo, 'imagens dos blocos 08–12 carregam (5·3·5·2·2)', Object.values(IM).flat().every(Boolean) && Object.values(IM).map(a => a.length).join() === '4,3,5,2,2', Object.fromEntries(Object.entries(IM).map(([k, v]) => [k, v.length])));
      // preguntas nuevas: el gabarito del DOM (data-correct) coincide con la letra esperada y al elegirla se muestra la explicación
      const NUEVAS = [['medlegb03', 'coágulos amarillentos', 'a'], ['medlegb03', 'docimasia hepática se encuentra', 'b'], ['medlegb03', 'girado a boca abajo', 'b'], ['medlegb04', 'Un cuerpo recuperado de la nieve', 'a'], ['medlegb04', 'recién nacido que no llegó a respirar', 'b'],
        ['medlegb10', 'monóxido de carbono. ¿A qué tipo de anoxia', 'b'], ['medlegb10', 'nudo en la nuca (posición típica)', 'a'], ['medlegb10', 'fractura-luxación cervical con lesión bulbomedular', 'a'], ['medlegb10', 'Un cuerpo permanece varios días', 'b'], ['medlegb03', 'Respecto de la muerte súbita', 'a']];
      const NQ = await p.evaluate(lista => lista.map(([sec, frag, letra]) => { const q = [...document.querySelectorAll('#' + sec + ' .quiz-item')].find(x => x.textContent.includes(frag)); if (!q) return [frag, 'NO ENCONTRADA']; const li = q.querySelector('li[data-option="' + letra + '"]'); if (li) li.click(); const ans = q.querySelector('.answer'); return [frag.slice(0, 22), q.getAttribute('data-correct') === letra, !!li && li.classList.contains('correct') && q.classList.contains('answered') && !!ans && ans.textContent.length > 60]; }), NUEVAS);
      ok(W, modo, 'preguntas nuevas/reformuladas: gabarito en el DOM, la opción correcta se marca y hay explicación', NQ.every(x => x[1] === true && x[2] === true), NQ);
      const G = await p.evaluate(() => { const g = document.querySelector('#medlegb03 .ml-gl'); g.click(); return g.classList.contains('on'); });
      ok(W, modo, 'glosario «?» abre', G);
    }
    const O = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    ok(W, modo, 'sin rolagem horizontal da página', O.sw <= O.vw + 1, O);
    ok(W, modo, 'sin error de página/consola ni rede externa', !r.errs.length && !r.externas.filter(u => !/fonts\.(g|gs)/.test(u)).length, { errs: r.errs, ext: r.externas.length });
    if (modo === 'nav') { const E = await p.evaluate(() => window.__ens && { er: window.__ens.erros, et: window.__ens.etapas }); ok(W, modo, 'layout novo (em memória) ativa sin error', E && !E.er.length && E.et.attach_nav, E); }
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); for (const i of ['medlegb03', 'medlegb10']) { await p.evaluate(id => { document.getElementById(id).scrollIntoView(); }, i); await p.waitForTimeout(500); await p.screenshot({ path: path.join(SHOTS, `${modo}-${W}-${i}.png`) }); } }
    await r.ctx.close();
  }
  await br.close(); srv.close();
  const f = res.filter(x => !x.ok); console.log(`\nTOTAL ${res.length} · PASSA ${res.length - f.length} · FALHA ${f.length}`); process.exit(f.length ? 1 : 0);
})();
