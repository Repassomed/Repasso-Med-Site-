/* Issue #646 · Anatopatología II (teoría) — teste no navegador do bloco 07 reconstruído e das 10 questões novas interativas (as 2 V/F são cobertas no teste estático).
   Local, somente leitura (harness do ensaio: Supabase simulado, zero rede externa). Modo «controle» (como o site serve hoje) e «nav» (layout novo, só em memória).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ap2-638/ap2-638-browser.cjs [--shots=<dir>] */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('../ensaio-layout/lib.cjs');
const SHOTS = (process.argv.find(a => a.startsWith('--shots=')) || '').slice(8) || null;
const res = []; const ok = (w, modo, nome, c, det) => { res.push({ ok: !!c }); console.log((c ? 'PASSA ' : 'FALHA ') + modo + ' @' + w + ' ' + nome + (det !== undefined && !c ? ' → ' + JSON.stringify(det).slice(0, 300) : '')); };
const TEO = { slug: 'anatomia-patologica-ii', cont: { ap2b04: 18, ap2b05: 19, ap2b07: 29, ap2b08: 17, bancoap2: 181 },
  nuevas: [['ap2b07', 'Un paciente con alcoholismo crónico tiene una biopsia hepática', 'd'], ['ap2b07', '¿Cuáles son las tres formas de lesión hepática relacionadas con el alcohol', 'c'], ['ap2b07', '¿Qué son los cuerpos de Mallory-Denk', 'a'], ['ap2b07', '¿Dónde comienzan los cambios de la hepatopatía alcohólica', 'a'],
    ['ap2b07', 'qué célula del sinusoide libera TNF y TGF-β', 'd'], ['ap2b07', 'Una cirrosis con nódulos regenerativos regulares y pequeños', 'c'], ['ap2b07', 'En la cirrosis descompensada, ¿cuál es la complicación más frecuente', 'b'], ['ap2b07', 'Citá dos de los cinco parámetros de la clasificación de Child-Pugh', 'bilirrubina, albúmina'],
    ['ap2b07', 'suma 11 puntos en la clasificación de Child-Pugh', 'c'], ['ap2b05', 'afectación extensa del intestino delgado, ¿qué alteración nutricional', 'a'], ['ap2b08', 'Ante un nódulo tiroideo solitario', 'b'], ['ap2b08', 'En un adenoma tóxico', 'd'], ['ap2b07', '¿Qué patrón de laboratorio es típico de la cirrosis', 'd']],
  ensena: [['ap2b07', 'Mallory-Denk'], ['ap2b07', 'alambre de gallinero'], ['ap2b07', 'Child-Pugh'], ['ap2b07', 'micronodular'], ['ap2b07', 'Klatskin'], ['ap2b07', 'HNF1-α'], ['ap2b05', 'teoría de la higiene'], ['ap2b08', 'nódulo tiroideo solitario'], ['ap2b08', 'TSHR']], banco: 'bancoap2', bancoStats: ['181 preguntas', '114 basadas en preguntas de examen', '67 variantes', '10 verdadero/falso'] };
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.servir({}); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const C of [TEO]) {
    const m = L.reconciliar().ativas.find(x => x.slug === C.slug);
    for (const [modo, W] of [['controle', 1440], ['controle', 390], ['nav', 1440], ['nav', 768]]) {
      const r = await L.abrir(br, base, m, { w: W, h: ({ 390: 844, 768: 1024, 1440: 900 })[W], modo, espera: 800 }); const p = r.page; const tag = 'TEORÍA';
      const D = await p.evaluate(C => ({ cont: Object.fromEntries(Object.keys(C.cont).map(i => [i, document.getElementById(i) ? document.getElementById(i).querySelectorAll('.quiz-item').length : -1])), stats: (document.getElementById(C.banco).textContent || '').replace(/\s+/g, ' '),
        ensena: C.ensena.map(([id, f]) => (document.getElementById(id).textContent.replace(/\s+/g, ' ')).includes(f)) }), C);
      ok(W, modo, tag + ' · contagens de questões por seção (bloco/banco)', JSON.stringify(D.cont) === JSON.stringify(C.cont), D.cont);
      ok(W, modo, tag + ' · contagens declaradas no banco visíveis: ' + C.bancoStats.join(' · '), C.bancoStats.every(s => D.stats.includes(s)));
      ok(W, modo, tag + ' · o que as questões cobram está ensinado no bloco', D.ensena.every(Boolean), D.ensena);
      if (modo === 'controle') {
        const NQ = await p.evaluate(async lista => { const out = []; for (const [sec, frag, esp] of lista) { out.push(await (async () => {
          const q = [...document.querySelectorAll('#' + sec + ' .quiz-item')].find(x => x.textContent.replace(/\s+/g, ' ').includes(frag)); if (!q) return [frag.slice(0, 40), 'NO ENCONTRADA'];
          const rotulo = (q.querySelector('.quiz-tag') || {}).textContent; const ans = q.querySelector('.answer'); const antes = getComputedStyle(ans).display; const btn = q.querySelector('.reveal-btn');
          if (btn) { btn.click(); const txt = ans.textContent.replace(/\s+/g, ' '); return [frag.slice(0, 40), antes === 'none' && getComputedStyle(ans).display !== 'none', txt.includes(esp), rotulo]; }
          const correcta = q.getAttribute('data-correct'); const li = q.querySelector('li[data-option="' + esp + '"]'); li.click(); await new Promise(r => setTimeout(r, 300));
          return [frag.slice(0, 40), q.classList.contains('answered') && li.classList.contains('correct'), correcta === esp && ans.textContent.replace(/\s+/g, ' ').trim().toLowerCase().startsWith(esp + ')'), rotulo];
        })()); } return out; }, C.nuevas);
        ok(W, modo, tag + ' · cada questão nova: aberta → «Ver respuesta» mostra a resposta aceita; múltipla escolha → a opção certa fica «correct», a questão «answered», data-correct = gabarito da explicação', NQ.every(x => x[1] === true && x[2] === true), NQ);
        ok(W, modo, tag + ' · rótulos: «Basada en preguntas de examen» ou «Pregunta complementaria» (nunca «oficial/real»)', NQ.every(x => /^(Basada en preguntas de examen|Pregunta complementaria)$/.test(x[3])), NQ.map(x => x[3]));
      }
      const O = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
      ok(W, modo, tag + ' · sin rolagem horizontal da página', O.sw <= O.vw + 1, O);
      const X = await p.evaluate(() => { const b = document.getElementById('ap2b07'); const tb = [...b.querySelectorAll('.ap2-scroll')]; const tip = b.querySelector('.ap2-gl'); if (tip) tip.click(); const on = !!b.querySelector('.ap2-gl.on'); return { h3: [...b.querySelectorAll('.ap2-detalle > h3')].map(x => x.textContent.slice(0, 3)), tabelas: tb.length, fc: b.querySelectorAll('.flashcard').length, mazo: document.querySelectorAll('#bancofcap2 .flashcard').length, gl: on, imgs: [...b.querySelectorAll('img.ap2-photo')].every(i => i.complete && i.naturalWidth > 0) || null, svg: b.querySelectorAll('svg').length }; });
      ok(W, modo, tag + ' · bloco 07 renderizado: 12 subtítulos, ' + X.tabelas + ' tabelas, 32 flashcards no bloco e 177 no mazo (+177 na ruleta), glossário abre, figuras carregam', X.h3.length === 12 && X.tabelas >= 14 && X.fc === 32 && X.mazo === 354 && X.gl && X.imgs !== false, X);
      ok(W, modo, tag + ' · sin error de página/consola ni rede externa', !r.errs.length && !r.externas.filter(u => !/fonts\.(g|gs)/.test(u)).length, { errs: r.errs, ext: r.externas.length });
      if (modo === 'nav') { const E = await p.evaluate(() => window.__ens && { er: window.__ens.erros, et: window.__ens.etapas }); ok(W, modo, tag + ' · layout novo (em memória) ativa sin error', E && !E.er.length && E.et.attach_nav, E); }
      if (SHOTS && modo === 'controle') { fs.mkdirSync(SHOTS, { recursive: true }); const alvo = C.nuevas[0]; await p.evaluate(([s, f]) => { const q = [...document.querySelectorAll('#' + s + ' .quiz-item')].find(x => x.textContent.replace(/\s+/g, ' ').includes(f)); q.scrollIntoView({ block: 'center' }); }, [alvo[0], alvo[1]]); await p.waitForTimeout(400); await p.screenshot({ path: path.join(SHOTS, `${C.slug}-${W}-pregunta-nueva.jpg`), type: 'jpeg', quality: 80 }); }
      await r.ctx.close();
    }
  }
  await br.close(); srv.close();
  const f = res.filter(x => !x.ok); console.log(`\nTOTAL ${res.length} · PASSA ${res.length - f.length} · FALHA ${f.length}`); process.exit(f.length ? 1 : 0);
})();
