/* Issue #638 · Anatopatología II (teoría e práctica) — teste no navegador das 10 questões novas e do que foi ensinado/corrigido.
   Local, somente leitura (harness do ensaio: Supabase simulado, zero rede externa). Modo «controle» (como o site serve hoje) e «nav» (layout novo, só em memória).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ap2-638/ap2-638-browser.cjs [--shots=<dir>] */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('../ensaio-layout/lib.cjs');
const SHOTS = (process.argv.find(a => a.startsWith('--shots=')) || '').slice(8) || null;
const res = []; const ok = (w, modo, nome, c, det) => { res.push({ ok: !!c }); console.log((c ? 'PASSA ' : 'FALHA ') + modo + ' @' + w + ' ' + nome + (det !== undefined && !c ? ' → ' + JSON.stringify(det).slice(0, 300) : '')); };
const TEO = { slug: 'anatomia-patologica-ii', cont: { ap2b04: 18, ap2b05: 18, ap2b07: 16, bancoap2: 165 },
  nuevas: [['ap2b07', 'Citá los dos tipos de mutaciones más frecuentes', 'β-catenina'], ['ap2b07', 'clasificación molecular del adenoma hepático', 'b'], ['ap2b04', 'Citá dos patologías asociadas a los tumores carcinoides', 'Zollinger'], ['ap2b04', 'células fusiformes con inmunohistoquímica positiva para CD117', 'b'],
    ['ap2b04', 'cromatina «en sal y pimienta» y cromogranina A positiva. ¿De qué tipo de célula', 'd'], ['ap2b05', 'Citá dos manifestaciones extraintestinales', 'poliartritis migratoria'], ['ap2b05', 'Citá dos hallazgos macroscópicos de la enfermedad de Crohn', 'pared intestinal engrosada'],
    ['ap2b05', 'Citá dos hallazgos macroscópicos de la colitis ulcerosa', 'seudopólipos'], ['ap2b05', 'Citá dos complicaciones frecuentes de la enfermedad de Crohn', 'anemia megaloblástica']],
  ensena: [['ap2b05', 'poliartritis migratoria'], ['ap2b05', 'anemia megaloblástica'], ['ap2b05', 'dañan la muscular propia'], ['ap2b05', 'no se engrosa'], ['ap2b07', 'tres subtipos moleculares']], banco: 'bancoap2', bancoStats: ['165 preguntas', '112 basadas en preguntas de examen', '53 variantes'] };
const PRA = { slug: 'anatomia-patologica-ii-practica', cont: { ap2pb08: 13, ap2pbanco: 221 }, nuevas: [['ap2pb08', 'se encargan de la fibrosis de la cirrosis', 'a']], ensena: [['ap2pb08', 'tipo I y III']], banco: 'ap2pbanco', bancoStats: ['221 preguntas en el banco completo', '109 preguntas en el Parcial 2'] };
(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.servir({}); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const C of [TEO, PRA]) {
    const m = L.reconciliar().ativas.find(x => x.slug === C.slug);
    for (const [modo, W] of [['controle', 1440], ['controle', 390], ['nav', 1440], ['nav', 768]]) {
      const r = await L.abrir(br, base, m, { w: W, h: ({ 390: 844, 768: 1024, 1440: 900 })[W], modo, espera: 800 }); const p = r.page; const tag = C.slug.endsWith('practica') ? 'PRÁCTICA' : 'TEORÍA';
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
      ok(W, modo, tag + ' · sin error de página/consola ni rede externa', !r.errs.length && !r.externas.filter(u => !/fonts\.(g|gs)/.test(u)).length, { errs: r.errs, ext: r.externas.length });
      if (modo === 'nav') { const E = await p.evaluate(() => window.__ens && { er: window.__ens.erros, et: window.__ens.etapas }); ok(W, modo, tag + ' · layout novo (em memória) ativa sin error', E && !E.er.length && E.et.attach_nav, E); }
      if (SHOTS && modo === 'controle') { fs.mkdirSync(SHOTS, { recursive: true }); const alvo = C.nuevas[0]; await p.evaluate(([s, f]) => { const q = [...document.querySelectorAll('#' + s + ' .quiz-item')].find(x => x.textContent.replace(/\s+/g, ' ').includes(f)); q.scrollIntoView({ block: 'center' }); }, [alvo[0], alvo[1]]); await p.waitForTimeout(400); await p.screenshot({ path: path.join(SHOTS, `${C.slug}-${W}-pregunta-nueva.jpg`), type: 'jpeg', quality: 80 }); }
      await r.ctx.close();
    }
  }
  await br.close(); srv.close();
  const f = res.filter(x => !x.ok); console.log(`\nTOTAL ${res.length} · PASSA ${res.length - f.length} · FALHA ${f.length}`); process.exit(f.length ? 1 : 0);
})();
