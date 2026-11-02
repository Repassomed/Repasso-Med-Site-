/* Teste independente dos pacotes de tema da Nova Era (AP I Práctica · Histología I). Só leitura, local, sem rede externa, sem Supabase.
   Usa o harness do ensaio (lib.cjs/ativar.js) SEM editá-lo: um initScript registra o descritor DA MATÉRIA (assets/temas/rm-tema-<slug>.js) e injeta o CSS dela
   antes de o ativador gerar um tema de hipótese (registrarTema recusa slug já existente ⇒ vale o nosso).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era-temas/testar.cjs [slug…] [--shots=<dir>] */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('../ensaio-layout/lib.cjs');
const ASSETS = path.join(L.ROOT, 'assets');
const SLUGS = process.argv.slice(2).filter(a => !a.startsWith('--'));
const SHOTS = (process.argv.find(a => a.startsWith('--shots=')) || '').slice(8) || null;
const ALVOS = {
  'anatomia-patologica-practica': { acento: '#A23A60', blocos: 9, vig: 8, repaso: ['b10', 'b11', 'b12'], ids: 'b1 b2 b3 b4 b5 b6 b7 b8 b9 b10 b11 b12'.split(' '), bloco: 'b4' },
  'histologia-i': { acento: '#5B4FA8', blocos: 12, vig: 12, repaso: ['histo13', 'histo14'], ids: ['histo01', 'histo02', 'histo03', 'histo04', 'histo05', 'histo06', 'histo07', 'histo08', 'histo09', 'histo10', 'histo11', 'histo12', 'histo13', 'histo14', 'histo-imgnote'], bloco: 'histo07' }
};
const ESPERADO = { 'anatomia-patologica-practica': { tipo: { b1: 'bloque', b9: 'bloque', b10: 'repaso', b11: 'repaso', b12: 'repaso' } }, 'histologia-i': { tipo: { histo01: 'bloque', histo12: 'bloque', histo13: 'repaso', histo14: 'repaso' } } };
const res = []; const ok = (slug, w, nome, cond, det) => { res.push({ slug, w, nome, ok: !!cond, det }); console.log((cond ? 'PASSA ' : 'FALHA ') + slug + ' @' + w + ' ' + nome + (det !== undefined ? ' → ' + JSON.stringify(det) : '')); };

const FOTO = `(function(){var q=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
 var tab=document.querySelector('#materias-container > .tab-content');
 var txt=function(sec){var c=sec.cloneNode(true);q('[data-rm-ui]',c).forEach(function(n){n.remove()});return c.textContent.replace(/\\s+/g,' ').trim()};
 var ids=q(':scope > section[id]',tab).map(function(s){return s.id});
 var T={};q(':scope > section[id]',tab).forEach(function(s){T[s.id]=txt(s)});
 var imgs=q('img[src]',tab).filter(function(i){return !i.closest('[data-rm-ui]')}).map(function(i){return i.getAttribute('src')});
 var cont={q:q('.quiz-item',tab).length,fc:q('.flashcard',tab).length,fig:q('figure',tab).filter(function(f){return !f.closest('[data-rm-ui]')}).length,tb:q('table',tab).filter(function(f){return !f.closest('[data-rm-ui]')}).length};
 return {ids:ids,T:T,imgs:imgs,cont:cont};})()`;

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const mats = L.reconciliar().ativas.filter(m => ALVOS[m.slug] && (!SLUGS.length || SLUGS.includes(m.slug)));
  const usadas = new Set(), pedidos = []; const srv = await L.servir({ usadas, pedidos }); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  for (const m of mats) {
    const A = ALVOS[m.slug];
    const desc = fs.readFileSync(path.join(ASSETS, 'temas/rm-tema-' + m.slug + '.js'), 'utf8');
    const init = `${desc}
    (function(){var v;var S=${JSON.stringify(m.slug)};Object.defineProperty(window,'RMSistema',{configurable:true,get:function(){return v},set:function(x){v=x;try{x.registrarTema(S,window.RM_TEMAS[S])}catch(e){}}});
      document.addEventListener('DOMContentLoaded',function(){var l=document.createElement('link');l.rel='stylesheet';l.href='assets/temas/rm-tema-'+S+'.css';document.head.appendChild(l)});})();`;
    let ctrl;
    { const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'controle', espera: 600 }); ctrl = await r.page.evaluate(FOTO); await r.ctx.close(); }
    for (const W of [1440, 390]) {
      const r = await L.abrir(br, base, m, { w: W, h: W === 390 ? 844 : 900, modo: 'nav', initScript: init });
      const p = r.page;
      const E = await p.evaluate(() => ({ et: window.__ens.etapas, er: window.__ens.erros, gerado: window.__ens.temaGerado, w: window.__writes }));
      ok(m.slug, W, 'etapas (layout+tema+nav) sem erro', E.et.attach_layout && E.et.attach_tema && E.et.attach_nav && !E.er.length, E.er);
      const T = await p.evaluate(s => { const t = window.RMSistema.TEMAS[s]; return { propria: !!(t && t.grupos), rm: document.documentElement.getAttribute('data-rm-tema'), acc: getComputedStyle(document.documentElement).getPropertyValue('--rm-accent').trim(), surf: getComputedStyle(document.documentElement).getPropertyValue('--rm-surface').trim(), body: getComputedStyle(document.body).backgroundColor }; }, m.slug);
      ok(m.slug, W, 'descritor da matéria em uso (não o gerado)', T.propria && T.rm === m.slug, T);
      ok(m.slug, W, 'CSS da matéria aplicado (acento)', T.acc.toUpperCase() === A.acento, T.acc);
      const S = await p.evaluate(() => [...document.querySelectorAll('#materias-container > .tab-content > section[id]')].map(s => ({ id: s.id, cap: s.getAttribute('data-rm-cap'), tipo: s.getAttribute('data-rm-tipo'), tag: (s.querySelector(':scope > .rm-sis-tag') || {}).textContent || null, vig: !!s.querySelector(':scope > .rm-sis-vig:not(.rm-sis-vig--logo)'), logo: !!s.querySelector(':scope > .rm-sis-vig--logo') })));
      const blocos = S.filter(s => s.tipo === 'bloque');
      ok(m.slug, W, 'blocos classificados = ' + A.blocos, blocos.length === A.blocos, blocos.map(s => s.id + ':' + s.tag.replace(/\s+/g, '')).join(' '));
      ok(m.slug, W, 'tipos esperados', Object.entries(ESPERADO[m.slug].tipo).every(([id, t]) => (S.find(s => s.id === id) || {}).tipo === t), S.map(s => s.id + '=' + s.tipo));
      ok(m.slug, W, 'vinhetas com imagem própria = ' + A.vig, S.filter(s => s.vig).length === A.vig, S.filter(s => s.vig).length);
      const V = await p.evaluate(() => { const a = [...document.querySelectorAll('.rm-sis-vig img')]; return { n: a.length, ruins: a.filter(i => i.complete && !i.naturalWidth).map(i => i.getAttribute('src')) }; });
      await p.evaluate(() => { document.querySelectorAll('.rm-sis-vig img').forEach(i => { i.loading = 'eager'; }); }); await p.waitForTimeout(900);
      const V2 = await p.evaluate(() => [...document.querySelectorAll('.rm-sis-vig:not(.rm-sis-vig--logo) img')].filter(i => !i.naturalWidth).map(i => i.getAttribute('src')));
      ok(m.slug, W, 'vinhetas carregam (naturalWidth>0)', V2.length === 0, V2);
      const F = await p.evaluate(FOTO);
      ok(m.slug, W, 'mesmos ids de seção do controle', JSON.stringify(F.ids) === JSON.stringify(ctrl.ids), { ctrl: ctrl.ids.length, nav: F.ids.length });
      const dif = Object.keys(ctrl.T).filter(k => ctrl.T[k] !== F.T[k]);
      ok(m.slug, W, 'texto didático de cada seção idêntico ao controle', !dif.length, dif);
      ok(m.slug, W, 'mesmas imagens, questões, flashcards, figuras, tabelas', JSON.stringify(F.imgs) === JSON.stringify(ctrl.imgs) && JSON.stringify(F.cont) === JSON.stringify(ctrl.cont), { imgs: F.imgs.length + '/' + ctrl.imgs.length, cont: F.cont, ctrl: ctrl.cont });
      ok(m.slug, W, 'nenhuma escrita (Supabase simulado)', !E.w.length, E.w);
      const O = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
      ok(m.slug, W, 'sem rolagem horizontal', O.sw <= O.vw + 1, O);
      const U = await p.evaluate(() => [...document.querySelectorAll('.rm-sis-ulab b')].map(b => b.textContent));
      ok(m.slug, W, 'rótulos de grupo do índice sem «UNIDAD ·» (depende da base do Claude 4)', !U.some(t => /UNIDAD\s*·/.test(t)), U);
      ok(m.slug, W, 'sem erro de página/console', !r.errs.length && !r.externas.filter(u => !/fonts\.(g|gs)/.test(u)).length, { errs: r.errs, ext: r.externas.length });
      if (SHOTS) {
        fs.mkdirSync(SHOTS, { recursive: true });
        await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(SHOTS, `${m.slug}-${W}-capa.png`) });
        await p.evaluate(b => { location.hash = '#' + b; }, A.bloco); await p.waitForTimeout(900); await p.screenshot({ path: path.join(SHOTS, `${m.slug}-${W}-bloco.png`) });
      }
      await r.ctx.close();
    }
  }
  await br.close(); srv.close();
  const f = res.filter(x => !x.ok); console.log(`\nTOTAL ${res.length} · PASSA ${res.length - f.length} · FALHA ${f.length}`);
  process.exit(f.length ? 1 : 0);
})();
