/* AUDITORIA INDEPENDENTE · Nova Era (#622) · navegador — cenários que a bateria da própria PR NÃO cobre (troca de conta na mesma aba, legado nas outras matérias,
   sessão aberta quando a etapa muda, Semiología II PR × main) + o ciclo completo da caneta do aluno em 1440 e 390 px.
   Uso: node navegador.audit.cjs <raiz-da-árvore-dos-assets> <raiz-do-PR-para-lib-servidor>  (a função get-pilot-flags usada é sempre a da PR) */
'use strict';
const path = require('path');
const TREE = path.resolve(process.argv[2] || '.'), PR = path.resolve(process.argv[3] || process.argv[2] || '.');
const { chromium } = require('playwright');
const L = require(TREE + '/tools/qa/ensaio-layout/lib.cjs');
const D = require(TREE + '/tools/qa/pre-voo/lib-dados.cjs');
const S = require(PR + '/tools/qa/nova-era/lib-servidor.cjs');
S.U.JOSE = D.UID;
let n = 0, ko = 0; const falhas = [];
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; falhas.push(m); console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 500) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);
const MF = 'medicina-familiar';
const envJose = () => ({ RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE, RM_PILOT_VISUAL_UIDS: S.U.JOSE });
const T = (l, p, v) => ({ [MF]: { layout_stage: l, pen_stage: p, visual_stage: v || 'off' } });
const ACESSOS = () => ({ [S.U.ALUNO]: [MF, 'dermatologia'], [S.U.OUTRO]: ['dermatologia'] });
const mkCena = (tabela, extra) => Object.assign({ env: envJose(), tabela, acessos: ACESSOS() }, extra || {});

/* ---- dentro da página ---- */
const MEDIR2 = () => {
  const lerN = k => { try { return JSON.parse(sessionStorage.getItem('ens.' + k) || '[]'); } catch (e) { return []; } };
  const vis = el => { if (!el) return false; const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const V2 = window.RMToolsV2;
  return {
    linhas: { grifos: lerN('user_highlights').length, tracos: lerN('user_ink_strokes').length, notas: lerN('user_notes').length },
    pintados: new Set([...document.querySelectorAll('#materias-container .rm-hl')].map(x => x.getAttribute('data-hl'))).size,
    tracosDesenhados: document.querySelectorAll('#rm2-ink path[data-ink]').length,
    layout: !!document.querySelector('.rm-l2, #rm-l2-side, .rm-l2-band'),
    v2: !!V2, escopo: !!(V2 && V2._test.escopo && V2._test.escopo()), v2NaAba: V2 && V2._test.v2NaAba ? V2._test.v2NaAba() : null,
    caixa: vis(document.querySelector('.rm2-box')), legada: [...document.querySelectorAll('.rm-tools-r')].some(vis),
    corpoV2: document.body.classList.contains('rm-v2'), flagV1: window.RM_STUDY_V2_ACTIVE === true,
    ferramenta: V2 ? V2.estado.tool : null, piloto: V2 ? V2._test.pilotoPermitido() : null,
    escritas: (window.__writes || []).slice(), erros: (window.__errs || []).slice(0, 3)
  };
};
const SEMEAR2 = ({ slug, uid }) => {
  const tab = document.querySelector('#materias-container > .tab-content');
  const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
  const secs = [...tab.querySelectorAll(':scope > section[id]')].filter(s => !/banco|flashcards|repaso|simulacro/i.test(s.id));
  const alvos = [];
  for (const s of secs) { const ps = [...s.querySelectorAll('p')].filter(p => !p.closest('[data-rm-ui],.quiz-item,.flashcard,details:not([open]),table,figure') && p.textContent.trim().length > 110); if (ps.length) alvos.push({ s, p: ps[Math.min(1, ps.length - 1)] }); }
  const esc = alvos.slice(0, 4);
  const ink = esc.map((a, i) => ({ id: 'nova-ink-' + i, user_id: uid, subject_slug: slug, anchor_id: a.s.id + '>' + [...a.s.querySelectorAll(SUB)].indexOf(a.p), color: 'black', width: 'medium', created_at: new Date(Date.now() - 86400000 + i).toISOString(), points: [[0.08, 0.30], [0.30, 0.45], [0.55, 0.28], [0.80, 0.50], [0.95, 0.35]] }));
  sessionStorage.setItem('ens.user_ink_strokes', JSON.stringify(ink));
  sessionStorage.setItem('ens.user_notes', JSON.stringify([{ id: 'nova-nota-1', user_id: uid, subject_slug: slug, anchor_id: esc[0].s.id, anchor_label: 'Nota de teste', title: 'Título', body: 'Corpo da nota', updated_at: new Date(Date.now() - 3600000).toISOString() }]));
  return { alvos: esc.length };
};
const MARCAR = async () => {
  const tab = document.querySelector('#materias-container > .tab-content'); let feitos = 0;
  const secs = [...tab.querySelectorAll(':scope > section[id]')].filter(s => !/banco|flashcards|repaso|simulacro/i.test(s.id));
  for (const s of secs) { if (feitos >= 3) break;
    const p = [...s.querySelectorAll('p')].find(p => !p.closest('[data-rm-ui],.quiz-item,.flashcard,details:not([open]),table,figure') && p.textContent.trim().length > 110); if (!p) continue;
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let tn, ac = null; while ((tn = w.nextNode())) { if (tn.textContent.trim().length >= 70) { ac = tn; break; } } if (!ac) continue;
    const ini = ac.textContent.indexOf(ac.textContent.trim()) + 12, r = document.createRange(); r.setStart(ac, ini); r.setEnd(ac, ini + 28);
    if (await window.RMTools.marcarRange(r, 'yellow')) feitos++; }
  return feitos;
};

/* ---- fora da página ---- */
async function abrirPersona(br, base, mat, c) {
  c.ctx = await br.newContext({ viewport: { width: c.w, height: c.w < 600 ? 844 : 900 }, hasTouch: c.w < 600 });
  c.page = await c.ctx.newPage(); c.pedidos = []; c.errs = [];
  c.page.on('pageerror', e => c.errs.push(String(e).slice(0, 160)));
  await c.page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await c.page.route('**/get-pilot-flags*', async r => { const slug = new URL(r.request().url()).searchParams.get('slug'); c.pedidos.push(slug); const o = await S.chamar(c.cena, c.persona, slug); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
  await c.page.addInitScript(([slug]) => { window.__RM_ENSAIO = { slug, modo: 'controle' }; }, [mat.slug]);
  c.base = base; c.mat = mat;
}
const url = c => `${c.base}/p.html?slug=${c.mat.slug}&tab=${c.mat.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U[c.persona]}`;
async function carregar(c) { await c.page.goto(url(c), { timeout: 120000 }); await c.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await c.page.waitForTimeout(700); }
async function ligar(c, espera = 2500) { await c.page.addScriptTag({ url: '/assets/rm-pilot.js?v=teste' }); await c.page.waitForTimeout(espera); return c.page.evaluate(MEDIR2); }
async function recarregar(c) { await c.page.reload({ timeout: 120000 }); await c.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await c.page.waitForTimeout(700); return ligar(c); }
/* abre, semeia (grifos pelo motor V1 real + traços/nota nas linhas do «banco»), recarrega no CONTROLE e mede a linha de base */
async function preparar(br, base, mat, c) {
  await abrirPersona(br, base, mat, c); await carregar(c);
  c.semeado = { grifos: await c.page.evaluate(MARCAR), ...(await c.page.evaluate(SEMEAR2, { slug: mat.slug, uid: S.U[c.persona] })) };
  await c.page.waitForTimeout(400); await carregar(c);
  c.ref = await c.page.evaluate(MEDIR2);
}
const semEscritaIndevida = m => m.escritas.filter(e => !/user_(highlights|ink_strokes|notes)$/.test(e));
const mesmosDados = (a, b) => JSON.stringify(a.linhas) === JSON.stringify(b.linhas);
async function riscar(c, seletor = 'p') {   // um traço com o lápis (mouse) sobre o primeiro parágrafo visível
  const box = await c.page.evaluate(() => { const ps = [...document.querySelectorAll('#materias-container > .tab-content.active p')].filter(p => p.textContent.trim().length > 100 && p.checkVisibility && p.checkVisibility() && !p.closest('table,[data-rm-ui]')); const p = ps[0]; if (!p) return null; p.scrollIntoView({ block: 'center' }); const r = p.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  if (!box) return false; await c.page.waitForTimeout(300);
  const b = await c.page.evaluate(() => { const ps = [...document.querySelectorAll('#materias-container > .tab-content.active p')].filter(p => p.textContent.trim().length > 100 && p.checkVisibility && p.checkVisibility() && !p.closest('table,[data-rm-ui]')); const r = ps[0].getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const y = b.y + Math.min(b.h / 2, 40), x0 = b.x + 8;
  await c.page.mouse.move(x0, y); await c.page.mouse.down();
  for (let i = 1; i <= 14; i++) await c.page.mouse.move(x0 + i * Math.min(18, (b.w - 20) / 14), y + (i % 2 ? 6 : -6), { steps: 1 });
  await c.page.mouse.up(); await c.page.waitForTimeout(900); return true;
}
const fecha = c => c.ctx.close().catch(() => {});

const subset = m => ({ layout: m.layout, v2: m.v2, escopo: m.escopo, caixa: m.caixa, legada: m.legada, corpoV2: m.corpoV2, flagV1: m.flagV1, piloto: m.piloto, tracos: m.tracosDesenhados, pintados: m.pintados, linhas: m.linhas });
const addTab = (page, tb) => page.evaluate((tb) => { const t = document.createElement('div'); t.className = 'tab-content'; t.id = 'tab-' + tb; t.innerHTML = '<section id="dd-b01" class="container"><h2>Bloque de otra materia</h2><p>' + 'Texto de prueba de otra materia que no tiene la lapicera nueva. '.repeat(12) + '</p></section>'; document.getElementById('materias-container').appendChild(t); window.switchTab(tb); }, tb);
const inkRows = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]').map(r => ({ id: r.id, user_id: r.user_id, slug: r.subject_slug })));
const quem = () => ({ JOSE: S.U.JOSE, ALUNO: S.U.ALUNO, SEM: S.U.SEM });

(async () => {
  const rec = L.reconciliar(); const M = s => rec.ativas.find(x => x.slug === s);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const ONLY = process.argv[4] || '';
  const PIL = 'semiologia-ii';

  if (!ONLY || ONLY === 'pil') {
    sec('PIL · Semiología II (estado impresso para comparar PR × main)');
    for (const [rot, persona, tab] of [['José, sem tabela', 'JOSE', {}], ['José, MF all/all', 'JOSE', T('all', 'all')], ['aluno, sem tabela', 'ALUNO', {}], ['aluno, MF all/all', 'ALUNO', T('all', 'all')], ['aluno, PIL all', 'ALUNO', { [PIL]: { layout_stage: 'all', pen_stage: 'all', visual_stage: 'all' } }]]) {
      const c = { persona, w: 1440, cena: mkCena(tab, { acessos: { [S.U.ALUNO]: [PIL, MF] } }) }; await preparar(br, base, M(PIL), c); const m = await ligar(c);
      console.log('PIL-ESTADO', rot, JSON.stringify(subset(m))); ok(c.errs.length === 0, rot + ': 0 erro JS', c.errs); await fecha(c); }
  }

  if (!ONLY || ONLY === 'ciclo') for (const W of [1440, 390]) {
    const t = `[${W}px] `;
    sec(t + 'CICLO · aluno COM acesso, caneta=all em MF: ferramenta → traço → salvar → recarregar; grifos, notas e traços antigos no lugar');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('off', 'all')) }; await preparar(br, base, M(MF), c);
      ok(c.semeado.grifos >= 1 && c.ref.linhas.tracos >= 1 && c.ref.linhas.notas === 1, `semeado: ${c.semeado.grifos} grifos, ${c.ref.linhas.tracos} traços, ${c.ref.linhas.notas} nota`, c.semeado);
      const m = await ligar(c); ok(m.escopo && m.caixa, 'ferramenta à vista (V2 por matéria)', m);
      ok(mesmosDados(c.ref, m) && m.pintados === c.ref.pintados && m.tracosDesenhados === c.ref.linhas.tracos, 'antes de desenhar: tudo idêntico', [c.ref.linhas, m.linhas]);
      await c.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); const feito = await riscar(c); const m2 = await c.page.evaluate(MEDIR2);
      ok(feito && m2.escritas.filter(e => e === 'insert:user_ink_strokes').length === 1 && semEscritaIndevida(m2).length === 0, 'desenhou: 1 insert em user_ink_strokes e mais nada', m2.escritas);
      const linhas = await inkRows(c.page); ok(linhas.length === c.ref.linhas.tracos + 1 && linhas.filter(r => r.id === 'nova-ink-0').length === 1, 'os traços antigos continuam e há 1 novo', linhas.length);
      const r2 = await recarregar(c); ok(r2.escopo && r2.linhas.tracos === c.ref.linhas.tracos + 1 && r2.tracosDesenhados === c.ref.linhas.tracos + 1 && r2.pintados === c.ref.pintados && r2.linhas.notas === 1 && r2.linhas.grifos === c.ref.linhas.grifos, 'depois de ATUALIZAR: traço novo + antigos + grifos + nota', [r2.linhas, r2.tracosDesenhados, r2.pintados]);
      ok(c.errs.length === 0, '0 erro JS', c.errs); await fecha(c); }
  }

  if (!ONLY || ONLY === 'troca') {
    sec('TROCA DE MATÉRIA · aluno com caneta só em MF: nas outras o marcador/goma ANTIGOS funcionam e gravam; ao voltar, a V2 e os traços voltam');
    { const c = { persona: 'ALUNO', w: 1440, cena: mkCena(T('off', 'all')) }; await preparar(br, base, M(MF), c); const m = await ligar(c);
      ok(m.escopo && m.caixa, 'em MF: V2', m); await c.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
      await addTab(c.page, M('dermatologia').tab); await c.page.waitForTimeout(900);
      const f = await c.page.evaluate(MEDIR2);
      ok(!f.caixa && f.legada && !f.flagV1 && f.ferramenta === 'none', 'em OUTRA matéria: caixa V2 escondida, coluna ANTIGA visível, sinal da V2 desligado', f);
      const leg = await c.page.evaluate(async () => { const p = document.querySelector('#tab-' + document.querySelector('#materias-container > .tab-content.active').id.replace('tab-', '') + ' p'); const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); const tn = w.nextNode(); const r = document.createRange(); r.setStart(tn, 5); r.setEnd(tn, 40); return { feito: await window.RMTools.marcarRange(r, 'yellow'), pintados: document.querySelectorAll('#materias-container .tab-content.active .rm-hl').length }; });
      ok(leg.feito && leg.pintados >= 1, 'em OUTRA matéria: o marcador ANTIGO ainda marca (não foi quebrado pela V2 por matéria)', leg);
      await c.page.evaluate((mf) => window.switchTab(mf), M(MF).tab); await c.page.waitForTimeout(900);
      const b = await c.page.evaluate(MEDIR2); ok(b.caixa && b.corpoV2 && b.flagV1 && b.tracosDesenhados === c.ref.linhas.tracos, 'de volta a MF: V2 e os traços reaparecem', b);
      ok(c.errs.length === 0, '0 erro JS', c.errs); await fecha(c); }
  }

  if (!ONLY || ONLY === 'conta') {
    sec('TROCA DE CONTA NA MESMA ABA (sem recarregar): A (com acesso, MF all/all) → B (sem acesso)');
    { const c = { persona: 'ALUNO', w: 1440, cena: mkCena(T('all', 'all')) }; await preparar(br, base, M(MF), c); const a = await ligar(c);
      ok(a.layout && a.escopo && a.caixa, 'conta A: layout + V2', a);
      const antesPedidos = c.pedidos.length; c.persona = 'SEM';
      await c.page.evaluate((uid) => { const sb = window.RM_SB; sb.auth.getSession = async () => ({ data: { session: { access_token: 'tok-SEM', user: { id: uid } } } }); sb.auth.getUser = async () => ({ data: { user: { id: uid } } }); }, S.U.SEM);
      await addTab(c.page, M('dermatologia').tab); await c.page.waitForTimeout(500);
      await c.page.evaluate((mf) => window.switchTab(mf), M(MF).tab); await c.page.waitForTimeout(1500);
      const b = await c.page.evaluate(MEDIR2); const reperguntou = c.pedidos.length > antesPedidos;
      console.log('    · conta B sem recarregar: reperguntou ao servidor =', reperguntou, '| estado =', JSON.stringify(subset(b)));
      ok(!b.layout && !b.caixa, 'conta B (SEM acesso) não herda layout novo nem V2 da conta A na mesma aba', { reperguntou, ...subset(b) });
      if (b.caixa) { await c.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await riscar(c); const linhas = await inkRows(c.page); const novos = linhas.filter(r => !r.id.startsWith('nova-ink'));
        console.log('    · traço desenhado pela conta B: user_id gravado =', novos.map(r => r.user_id)); ok(novos.every(r => r.user_id === S.U.SEM), 'o traço da conta B é gravado com o UID de B', novos); }
      await fecha(c); }
  }

  if (!ONLY || ONLY === 'aberta') {
    sec('SESSÃO ABERTA quando a etapa muda (sem recarregar): quanto tempo uma sessão já aberta ainda vê o estado antigo?');
    { const c = { persona: 'ALUNO', w: 1440, cena: mkCena(T('all', 'all')) }; await preparar(br, base, M(MF), c); const a = await ligar(c);
      c.cena.tabela = T('off', 'off');
      await addTab(c.page, M('dermatologia').tab); await c.page.waitForTimeout(400); await c.page.evaluate((mf) => window.switchTab(mf), M(MF).tab); await c.page.waitForTimeout(1200);
      const b = await c.page.evaluate(MEDIR2); console.log('    · tabela virou off com a página aberta; depois de trocar de aba e voltar:', JSON.stringify(subset(b)));
      console.log('    · (informativo) sessão aberta mantém o estado ' + (b.layout ? 'ANTIGO até recarregar' : 'novo')); await fecha(c); }
  }

  await br.close(); srv.close();
  console.log(`\nauditoria nova-era/navegador (${TREE}): ${n - ko}/${n} OK${ko ? ' — ' + ko + ' FALHA(S)' : ''}`);
  if (ko) console.log('Falhas:\n - ' + falhas.join('\n - '));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
