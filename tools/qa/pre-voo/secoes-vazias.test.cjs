/* C9 · SEÇÃO VAZIA E OCULTA (placeholder de âncora) NÃO É BLOCO — módulos REAIS (rm-layout, rm-materia-sistema, rm-materia-nav), 10 matérias reais que têm o placeholder + 1 sem.
   Achado do pré-voo: `<section id="bio00" hidden></section>` (a revisão removeu a abertura e deixou o id para os grifos/traços já gravados) virava o cartão «00» em branco do índice e
   abria um bloco vazio. Prova, por matéria:
     1  o placeholder CONTINUA no DOM (vazio, `hidden`) — a âncora é o motivo de existir;
     2  nenhum cartão do índice, item da lateral nem passo do Anterior/Próximo aponta para ele; o 1.º cartão é o do 1.º bloco real; nº de cartões = nº de seções que são bloco;
     3  grifos, traços (inclusive um gravado NO placeholder) e nota gravados no layout antigo aparecem IGUAIS com o layout novo e na VOLTA (retorno), sem escrever no banco;
     4  depois do detach, o placeholder segue exatamente como era (sem atributo do layout);
     5  matéria sem placeholder: o número de cartões não muda (controle).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/secoes-vazias.test.cjs [slug …]   (requer docs/layout-ensaio/inventario.json em dia: node tools/qa/pre-voo/inventario-fresco.py) */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
const D = require('./lib-dados.cjs');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const filtro = process.argv.slice(2);
const PH = { 'anatomia-i': 'a1b00', 'biologia': 'bio00', 'dermatologia': 'dermportada', 'embriologia': 'emb00', 'farmacologia-ii': 'f2b00', 'fisiopatologia-ii': 'fp2portada', 'histologia-i': 'histo00', 'histologia-i-practica': 'hp00', 'histologia-ii-practica': 'h2pportada', 'anatomia-patologica-ii-practica': 'ap2pportada' };
const CTRL = 'medicina-familiar';

const LER = () => {
  const tab = document.querySelector('#materias-container > .tab-content'); const secs = [...tab.querySelectorAll(':scope > section[id]')];
  const ph = secs.filter(s => s.hasAttribute('hidden') && !s.textContent.trim());
  const cards = [...document.querySelectorAll('.rm-sis-idx .rm-sis-card, .rm-nav-modeidx .rm-sis-card')];
  const lat = [...document.querySelectorAll('#rm-l2-side .rm-l2-item[data-view="block"], #rm-l2-side [data-go]')].map(a => (a.getAttribute('data-go') || a.getAttribute('data-block') || '') + '|' + a.textContent.replace(/\s+/g, ' ').trim().slice(0, 30));
  return { nSecs: secs.length, ph: ph.map(s => s.id), phAttrs: ph.map(s => [...s.attributes].map(a => a.name).filter(a => /^data-rm/.test(a) && a !== "data-rm-content-rev")), cards: cards.length, go: cards.map(c => c.getAttribute('data-go') || '').join(' '), primeiro: cards[0] ? cards[0].textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : null, lat };
};

(async () => {
  const rec = L.reconciliar(); const M = s => rec.ativas.find(x => x.slug === s);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const slug of (filtro.length ? filtro : [...Object.keys(PH), CTRL])) {
    const m = M(slug), id = PH[slug];
    console.log(`\n▸ ${slug}${id ? ' · placeholder «' + id + '»' : ' · controle (sem placeholder)'}`);
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 160))); await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.addInitScript(([s, t]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [slug]);
    const ir = async modo => { await page.addInitScript(([s, md]) => { window.__RM_ENSAIO = { slug: s, modo: md }; }, [slug, modo]); await page.goto(`${base}/p.html?slug=${slug}&tab=${m.tab}&modo=${modo}&wait=1500&persist=1&corr=1`, { timeout: 120000 }); await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(1200); };
    try {
      await ir('controle');
      await page.evaluate(D.SEMEAR, { slug, uid: D.UID, max: 5 });
      if (id) await page.evaluate(([i, uid, s]) => { const tr = JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]'); tr.push({ id: 'ens-ink-ph', user_id: uid, subject_slug: s, anchor_id: i, color: 'black', width: 'medium', created_at: new Date(Date.now() - 86400000).toISOString(), points: [[0.1, 0.3], [0.9, 0.4]] }); sessionStorage.setItem('ens.user_ink_strokes', JSON.stringify(tr)); }, [id, D.UID, slug]);
      await ir('controle'); const ref = await page.evaluate(D.MEDIR);
      await ir('nav'); const a = await page.evaluate(LER);
      const blocos = a.nSecs - a.ph.length;
      if (id) {
        ok(a.ph.includes(id), 'o placeholder continua no DOM, vazio e oculto', a.ph);
        ok(a.cards === blocos, `cartões do índice = seções que são bloco (${a.cards} de ${a.nSecs} seções)`, { cards: a.cards, nSecs: a.nSecs, ph: a.ph });
        ok(!new RegExp('"block":"' + id + '"').test(a.go) && !a.lat.some(x => x.indexOf(id) >= 0), 'nenhum cartão do índice nem item da lateral aponta para o placeholder', { go: a.go.slice(0, 120) });
        ok(a.primeiro && !/^0+$/.test(a.primeiro.replace(/\s/g, '')), `o 1.º cartão é de bloco real («${a.primeiro}»), não «00»`);
        const pg = await page.evaluate(i => { const ids = [...document.querySelectorAll('#materias-container > .tab-content > section[id]')].filter(s => !s.hasAttribute('hidden')).map(s => s.id); window.RMNav.go({ view: 'block', block: ids[0] }); return ids[0]; }, id);
        await page.waitForTimeout(600);
        const pager = await page.evaluate(() => [...document.querySelectorAll('.rm-nav-pager a')].map(x => (x.getAttribute('data-go') || '') + (x.hidden ? ' [oculto]' : '')));
        ok(!pager.some(x => x.indexOf(id) >= 0), 'o Anterior/Próximo do 1.º bloco real não passa pelo placeholder', pager);
      } else ok(a.cards === a.nSecs, `controle: ${a.cards} cartões = ${a.nSecs} seções (nada mudou)`, a);
      await page.evaluate(() => window.RMNav.go({ view: 'index' })); await page.waitForTimeout(400);
      const lay = await page.evaluate(D.MEDIR);
      const d1 = D.comparar(ref, lay, 'layout');
      ok(d1.length === 0, `layout novo: ${lay.grifos.length} grifos, ${lay.tracos.length} traços e ${lay.notas.length} nota(s) idênticos`, d1.slice(0, 3));
      /* detach: placeholder segue como era */
      const det = await page.evaluate(i => { try { window.RMNav.detach(); window.RMSistema.detach(); window.RMLayout.detach(); } catch (e) { return { err: String(e) }; } const e = i && document.getElementById(i); return { err: null, existe: i ? !!e : true, hidden: i ? e.hasAttribute('hidden') : true, vazio: i ? !e.textContent.trim() : true, attrs: i ? [...e.attributes].map(a => a.name).filter(a => /^data-rm/.test(a) && a !== "data-rm-content-rev") : [] }; }, id);
      ok(!det.err && det.existe && det.hidden && det.vazio && det.attrs.length === 0, 'depois do detach o placeholder está como era (sem atributo do layout)', det);
      /* volta (retorno à versão anterior) */
      await ir('controle'); const volta = await page.evaluate(D.MEDIR);
      const d2 = D.comparar(ref, volta, 'volta');
      ok(d2.length === 0, `volta ao layout antigo: ${volta.grifos.length} grifos, ${volta.tracos.length} traços e ${volta.notas.length} nota(s) idênticos`, d2.slice(0, 3));
      ok(errs.length === 0, '0 erros JS', errs);
    } catch (e) { ok(false, 'exceção: ' + String(e).slice(0, 200)); }
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`\nsecoes-vazias: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
