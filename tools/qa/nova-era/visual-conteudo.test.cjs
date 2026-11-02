/* O TEMA VISUAL NÃO TIRA NADA DO ALUNO — Medicina Familiar real, layout SEM tema (A) × layout COM tema + navegação (B), conta administradora, Supabase simulado.
   Para cada uma das 12 seções: (1) o texto (fora da UI derivada [data-rm-ui]) é IDÊNTICO; (2) ids, imagens (src), questões e flashcards são os mesmos; (3) todo elemento didático
   (títulos, parágrafos, itens, células, figuras, imagens, questões, cartões, caixas, post-its, tabelas) VISÍVEL em A continua visível em B quando o bloco está aberto —
   a única exceção aceita é o cabeçalho antigo duplicado (.section-marker «TEMA 01 · UNIDAD I…», .rm-block-head, .rm-subject-head), que a etiqueta e o título novos substituem.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/visual-conteudo.test.cjs [slug] */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs'); const D = require('../pre-voo/lib-dados.cjs'); const S = require('./lib-servidor.cjs'); S.U.JOSE = D.UID;
const SLUG = process.argv[2] || 'medicina-familiar';
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 500) : ''); } return !!c; };
const DID = 'h2,h3,h4,p,li,td,th,figure,img,table,.quiz-item,.flashcard,.key-box,.rm-postit,.med-image,.analysis-card,.geno-tile,.fc-grid';
const ANTIGO = '.section-marker, .rm-block-head, .rm-subject-head';
const COLETA = ([sid, did, antigo]) => {
  const sec = document.getElementById(sid); if (!sec) return null;
  const vis = e => { try { if (!e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; } catch (x) { /* sem checkVisibility */ } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const els = [...sec.querySelectorAll(did)].filter(e => !e.closest('[data-rm-ui]'));
  const txt = []; const w = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, { acceptNode: t => t.parentElement && !t.parentElement.closest('[data-rm-ui],script,style') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  let t; while ((t = w.nextNode())) txt.push(t.textContent);
  return { texto: txt.join('').replace(/\s+/g, ' ').trim(), ids: [...sec.querySelectorAll('[id]')].map(e => e.id), imgs: [...sec.querySelectorAll('img')].filter(e => !e.closest('[data-rm-ui]')).map(e => e.getAttribute('src')),
    quiz: sec.querySelectorAll('.quiz-item').length, fc: sec.querySelectorAll('.flashcard').length,
    itens: els.map((e, i) => ({ i, k: e.tagName + ':' + (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 36), v: vis(e), antigo: !!e.closest(antigo) })) };
};
async function abrir(br, base, m, cena) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.route('**/get-pilot-flags*', async r => { const sl = new URL(r.request().url()).searchParams.get('slug'); const o = await S.chamar(cena, 'JOSE', sl); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
  await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [m.slug]);
  await page.goto(`${base}/p.html?slug=${m.slug}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U.JOSE}`); await page.waitForFunction('window.__ready===true'); await page.waitForTimeout(500);
  await page.addScriptTag({ url: '/assets/rm-pilot.js?v=c' }); await page.waitForTimeout(6500);
  return { ctx, page, errs };
}
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === SLUG); const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const env = { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE, RM_PILOT_VISUAL_UIDS: S.U.JOSE };
  const T = v => ({ [SLUG]: { layout_stage: 'preview', pen_stage: 'off', visual_stage: v } });
  const A = await abrir(br, base, m, { env, acessos: {}, tabela: T('off') }); const B = await abrir(br, base, m, { env, acessos: {}, tabela: T('preview') });
  const ids = await A.page.evaluate(() => [...document.querySelectorAll('#materias-container > .tab-content > section[id]')].map(s => s.id));
  const temaA = await A.page.evaluate(() => document.documentElement.classList.contains('rm-sis')), temaB = await B.page.evaluate(() => document.documentElement.getAttribute('data-rm-tema'));
  console.log(`\n▸ ${SLUG}: ${ids.length} seções · A (layout sem tema) rm-sis=${temaA} · B tema=${temaB}`);
  ok(!temaA && temaB === SLUG && ids.length >= 8, 'A sem tema, B com o tema próprio', [temaA, temaB, ids.length]);
  let totalVis = 0, antigosEscondidos = 0;
  for (const sid of ids) {
    const a = await A.page.evaluate(COLETA, [sid, DID, ANTIGO]);
    await B.page.evaluate(id => { if (window.RMNav && RMNav.go) RMNav.go({ view: 'block', block: id }); }, sid); await B.page.waitForTimeout(1300);
    const b = await B.page.evaluate(COLETA, [sid, DID, ANTIGO]);
    const semMudanca = a.texto === b.texto && JSON.stringify(a.ids) === JSON.stringify(b.ids) && JSON.stringify(a.imgs) === JSON.stringify(b.imgs) && a.quiz === b.quiz && a.fc === b.fc && a.itens.length === b.itens.length;
    ok(semMudanca, `${sid}: texto, ${a.ids.length} ids, ${a.imgs.length} imagens, ${a.quiz} questões e ${a.fc} cartões idênticos com o tema`, { dTexto: a.texto === b.texto, ids: a.ids.length + '/' + b.ids.length, imgs: a.imgs.length + '/' + b.imgs.length, q: a.quiz + '/' + b.quiz, fc: a.fc + '/' + b.fc, itens: a.itens.length + '/' + b.itens.length });
    const sumiu = a.itens.filter((x, i) => x.v && !x.antigo && b.itens[i] && !b.itens[i].v);
    totalVis += a.itens.filter(x => x.v).length;
    antigosEscondidos += a.itens.filter((x, i) => x.v && x.antigo && b.itens[i] && !b.itens[i].v).length;
    ok(sumiu.length === 0, `${sid}: nenhum elemento didático visível sem o tema fica escondido com o tema`, sumiu.slice(0, 5));
  }
  console.log(`  (${totalVis} elementos didáticos visíveis conferidos; ${antigosEscondidos} deles são o cabeçalho antigo duplicado — marcador «TEMA NN · UNIDAD …» e rm-block-head —, escondido pelo tema porque a etiqueta e o título novos o substituem)`);
  ok(A.errs.length === 0 && B.errs.length === 0, '0 erro JS', [A.errs, B.errs]);
  await br.close(); srv.close();
  console.log(`\nvisual-conteudo (${SLUG}): ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
