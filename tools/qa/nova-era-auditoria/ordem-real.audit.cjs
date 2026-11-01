/* AUDITORIA · Nova Era (#622) · ORDEM REAL DE ABERTURA (sem aba falsa): Medicina Familiar (caneta liberada ao aluno) → Dermatología (HTML real, aberta como o site abre: fetch → appendChild → enhanceAll → switchTab).
   Confere em Dermatología: coluna antiga, marcador (UI + gravação), borracha (UI + apagar), V2 ausente; de volta a MF: caixa V2, caneta (1 insert), traços/grifos/notas antigos. Uso: node ordem-real.audit.cjs <raiz-PR> */
'use strict';
const path = require('path'); const TREE = path.resolve(process.argv[2]);
const { chromium } = require('playwright'); const L = require(TREE + '/tools/qa/ensaio-layout/lib.cjs'); const D = require(TREE + '/tools/qa/pre-voo/lib-dados.cjs'); const S = require(TREE + '/tools/qa/nova-era/lib-servidor.cjs'); S.U.JOSE = D.UID;
const MF = 'medicina-familiar', DERMA = 'dermatologia';
let n = 0, ko = 0; const falhas = []; const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; falhas.push(m); console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 400) : ''); } return !!c; };
const lerN = page => page.evaluate(() => { const g = k => { try { return JSON.parse(sessionStorage.getItem('ens.' + k) || '[]'); } catch (e) { return []; } }; return { grifos: g('user_highlights').length, tracos: g('user_ink_strokes').length, notas: g('user_notes').length, writes: (window.__writes || []).slice() }; });
(async () => {
  const rec = L.reconciliar(); const M = s => rec.ativas.find(x => x.slug === s);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const [rot, tabela, persona, esperaFerr] of [['CONTROLE · tudo off (aluno)', { [MF]: { layout_stage: 'off', pen_stage: 'off', visual_stage: 'off' } }, 'ALUNO', true], ['caneta=all em MF (aluno com acesso)', { [MF]: { layout_stage: 'off', pen_stage: 'all', visual_stage: 'off' } }, 'ALUNO', true], ['layout+caneta=all em MF', { [MF]: { layout_stage: 'all', pen_stage: 'all', visual_stage: 'off' } }, 'ALUNO', true]]) {
    console.log('\n▸ ' + rot);
    const cena = { env: { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE }, tabela, acessos: { [S.U.ALUNO]: [MF, DERMA] } };
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', async r => { const o = await S.chamar(cena, persona, new URL(r.request().url()).searchParams.get('slug')); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
    await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [MF]);
    await page.goto(`${base}/p.html?slug=${MF}&tab=${M(MF).tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U[persona]}`, { timeout: 120000 }); await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(700);
    /* dados do aluno em MF (traços/nota semeados no «banco» da aba) */
    await page.evaluate(({ uid }) => { const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote'; const s = [...document.querySelectorAll('#materias-container > .tab-content > section[id]')].find(x => /^aps|b01/.test(x.id)) || document.querySelector('#materias-container section[id]'); const p = [...s.querySelectorAll('p')].find(p => p.textContent.length > 110);
      sessionStorage.setItem('ens.user_ink_strokes', JSON.stringify([{ id: 'ord-ink-0', user_id: uid, subject_slug: 'medicina-familiar', anchor_id: s.id + '>' + [...s.querySelectorAll(SUB)].indexOf(p), color: 'black', width: 'medium', created_at: new Date(Date.now() - 86400000).toISOString(), points: [[0.1, 0.3], [0.3, 0.5], [0.6, 0.4], [0.8, 0.6]] }]));
      sessionStorage.setItem('ens.user_notes', JSON.stringify([{ id: 'ord-nota', user_id: uid, subject_slug: 'medicina-familiar', anchor_id: s.id, anchor_label: 'x', title: 't', body: 'b', updated_at: new Date().toISOString() }])); }, { uid: S.U[persona] });
    await page.reload(); await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(700);
    await page.addScriptTag({ url: '/assets/rm-pilot.js?v=teste' }); await page.waitForTimeout(2500);
    const mfV2 = await page.evaluate(() => ({ v2: window.RM_STUDY_V2_ACTIVE === true, caixa: !!document.querySelector('.rm2-box') }));
    console.log('    · em MF antes de abrir Dermatología:', JSON.stringify(mfV2));
    const antes = await lerN(page);
    /* ABRE Dermatología como o index.html (openTab): baixa o HTML, anexa, enhanceAll, DEPOIS switchTab */
    const d = await page.evaluate(async (dt) => {
      const html = await (await fetch('/m/dermatologia.html')).text(); const doc = new DOMParser().parseFromString(html, 'text/html'); const el = doc.getElementById('tab-' + dt) || (() => { const t = document.createElement('div'); t.className = 'tab-content'; t.id = 'tab-' + dt; t.innerHTML = doc.body.innerHTML; return t; })();
      document.getElementById('materias-container').appendChild(document.importNode(el, true));
      window.RepassoMed.enhanceAll(); window.switchTab(dt); await new Promise(o => setTimeout(o, 1800));
      const tab = document.getElementById('tab-' + dt); const vis = e => { if (!e) return false; const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0; };
      return { colunaNoDOM: !!tab.querySelector('.rm-tools-r'), colunaVisivel: vis(tab.querySelector('.rm-tools-r')), marcador: vis(tab.querySelector('.rm-tools-r .rm-mark')), borracha: vis(tab.querySelector('.rm-tools-r .rm-erase')), caixaV2: vis(document.querySelector('.rm2-box')), flagV2: window.RM_STUDY_V2_ACTIVE === true }; }, M(DERMA).tab);
    ok(d.colunaVisivel && d.marcador && d.borracha, 'Dermatología (aberta depois de MF): coluna antiga, marcador e borracha À VISTA', d);
    ok(!d.caixaV2 && !d.flagV2, 'Dermatología: a caixa V2 NÃO aparece e o sinal da V2 está desligado', d);
    if (d.marcador) {
      const m = await page.evaluate(async (dt) => { const tab = document.getElementById('tab-' + dt); tab.querySelector('.rm-tools-r .rm-mark').click(); await new Promise(o => setTimeout(o, 300)); const ligado = tab.querySelector('.rm-tools-r .rm-mark').classList.contains('on');
        const p = [...tab.querySelectorAll('section p')].find(p => p.textContent.length > 120 && p.checkVisibility && p.checkVisibility() && !p.closest('table,[data-rm-ui],.quiz-item')); const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let tn; while ((tn = w.nextNode())) { if (tn.textContent.length >= 50) break; } const r = document.createRange(); r.setStart(tn, 3); r.setEnd(tn, 33);
        const feito = await window.RMTools.marcarRange(r, 'yellow'); await new Promise(o => setTimeout(o, 500)); return { ligado, feito, pintados: tab.querySelectorAll('.rm-hl').length }; }, M(DERMA).tab);
      const dep = await lerN(page);
      ok(m.ligado && m.feito && m.pintados >= 1 && dep.writes.filter(w => w === 'insert:user_highlights').length === 1, 'marcador: ativa pela UI, marca e grava 1 grifo (insert em user_highlights)', { m, w: dep.writes });
      const e = await page.evaluate(async (dt) => { const tab = document.getElementById('tab-' + dt); tab.querySelector('.rm-tools-r .rm-mark').click(); tab.querySelector('.rm-tools-r .rm-erase').click(); await new Promise(o => setTimeout(o, 300)); const ligada = tab.querySelector('.rm-tools-r .rm-erase').classList.contains('on'); const h = tab.querySelector('.rm-hl'); if (h) h.click(); await new Promise(o => setTimeout(o, 700)); return { ligada, restam: tab.querySelectorAll('.rm-hl').length }; }, M(DERMA).tab);
      const dep2 = await lerN(page);
      ok(e.ligada && e.restam === 0 && dep2.writes.some(w => w === 'delete:user_highlights'), 'borracha: ativa pela UI e apaga o grifo (delete em user_highlights)', { e, w: dep2.writes });
    }
    /* de volta a MF */
    await page.evaluate((mf) => window.switchTab(mf), M(MF).tab); await page.waitForTimeout(1200);
    const penAll = tabela[MF].pen_stage === 'all';
    const mf = await page.evaluate(() => ({ caixa: !!document.querySelector('.rm2-box') && getComputedStyle(document.querySelector('.rm2-box')).display !== 'none', tracosVisiveis: document.querySelectorAll('#rm2-ink path[data-ink]').length }));
    ok(penAll ? (mf.caixa && mf.tracosVisiveis >= 1) : !mf.caixa, penAll ? 'de volta a MF: caixa V2 e o traço antigo voltam' : 'de volta a MF: sem V2 (como esperado)', mf);
    if (penAll && mf.caixa) {
      await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
      const box = await page.evaluate(() => { const p = [...document.querySelectorAll('#materias-container > .tab-content.active p')].filter(p => p.textContent.length > 100 && p.checkVisibility && p.checkVisibility() && !p.closest('table,[data-rm-ui]'))[0]; p.scrollIntoView({ block: 'center' }); const b = p.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }); await page.waitForTimeout(500);
      const b2 = await page.evaluate(() => { const p = [...document.querySelectorAll('#materias-container > .tab-content.active p')].filter(p => p.textContent.length > 100 && p.checkVisibility && p.checkVisibility() && !p.closest('table,[data-rm-ui]'))[0]; const b = p.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
      const y = b2.y + Math.min(b2.h / 2, 30); await page.mouse.move(b2.x + 10, y); await page.mouse.down(); for (let i = 1; i <= 14; i++) await page.mouse.move(b2.x + 10 + i * 14, y + (i % 2 ? 5 : -5)); await page.mouse.up(); await page.waitForTimeout(900);
      const fim = await lerN(page);
      ok(fim.writes.filter(w => w === 'insert:user_ink_strokes').length === 1, 'caneta em MF: 1 insert em user_ink_strokes', fim.writes);
      ok(fim.tracos === antes.tracos + 1 && fim.notas === antes.notas, 'dados de MF preservados: traço antigo + 1 novo, nota igual', { antes, fim: { tracos: fim.tracos, notas: fim.notas } });
    } else { const fim = await lerN(page); ok(fim.tracos === antes.tracos && fim.notas === antes.notas, 'dados de MF preservados', { antes, fim }); }
    ok(errs.length === 0, '0 erro JS', errs); await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`\nordem-real (${TREE}): ${n - ko}/${n} OK${ko ? ' — ' + ko + ' FALHA(S)' : ''}`); if (ko) console.log('Falhas:\n - ' + falhas.join('\n - ')); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
