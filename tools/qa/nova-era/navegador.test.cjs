/* NOVA ERA · NAVEGADOR — a matéria REAL no harness, o rm-pilot.js REAL, a função get-pilot-flags REAL e o rm-tools-v2.js REAL; Supabase e rede simulados (zero rede externa).
   «Banco» = sessionStorage da própria aba (harness ?persist=1): NADA de aluno real é lido ou gravado; qualquer escrita fora das 3 tabelas de anotação reprova.
   Personas: JOSE (administrador, beta da V2 e nas listas do piloto) · TESTER2 (2.º testador do piloto: nas listas, NÃO administrador) · ALUNO (aluno comum com acesso à matéria) · SEM (aluno comum sem acesso).
   Cenas: padrão desligado · prévia (etapa 1) · layout para todos · caneta para todos · as duas · volta ao layout anterior · sem acesso · outra matéria · troca de aba · José em outra matéria · piloto.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/navegador.test.cjs [--rapido] */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
const D = require('../pre-voo/lib-dados.cjs');
const S = require('./lib-servidor.cjs');
S.U.JOSE = D.UID;                                       // o harness usa o UID de tester público do código para o motor da caneta montar (beta)
const RAPIDO = process.argv.includes('--rapido');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 400) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);
const MF = 'medicina-familiar';
/* listas realistas do Netlify: José E o 2.º testador do piloto (que NÃO é administrador e NÃO pode ver a prévia de Medicina Familiar) */
const envJose = () => ({ RM_PILOT_LAYOUT_UIDS: S.U.JOSE + ',' + S.U.TESTER2, RM_PILOT_PEN_UIDS: S.U.JOSE + ',' + S.U.TESTER2, RM_PILOT_VISUAL_UIDS: S.U.JOSE + ',' + S.U.TESTER2 });
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
  if (c.init) await c.page.addInitScript(c.init[0], c.init[1]);
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

(async () => {
  const rec = L.reconciliar(); const M = s => rec.ativas.find(x => x.slug === s);
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  for (const W of (process.env.RM_LARGURAS ? process.env.RM_LARGURAS.split(',').map(Number) : RAPIDO ? [1440] : [1440, 390])) {
    const t = `[${W}px] `;

    sec(t + '0 · começa DESLIGADO: tabela em off ⇒ aluno e José veem a matéria como hoje');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('off', 'off')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c);
      ok(c.pedidos.length === 1 && c.pedidos[0] === MF, 'o aluno só PERGUNTA (1 requisição) e a resposta é «não»', c.pedidos);
      ok(!m.layout && !m.v2 && !m.corpoV2 && !m.flagV1, 'aluno: sem layout novo, sem V2, sem classes da V2', m);
      ok(m.legada, 'aluno: marcador/goma antigos continuam à vista', m.legada);
      ok(mesmosDados(c.ref, m) && m.pintados === c.ref.pintados && m.pintados >= 1, `aluno: ${m.pintados} grifos pintados e ${m.linhas.tracos} traços/${m.linhas.notas} nota gravados, idênticos`, [c.ref.linhas, m.linhas]);
      ok(semEscritaIndevida(m).length === 0 && m.erros.length === 0 && c.errs.length === 0, 'aluno: 0 erro JS e nenhuma escrita indevida', [m.escritas, m.erros, c.errs]);
      await fecha(c); }
    { const c = { persona: 'JOSE', w: W, cena: mkCena(T('off', 'off')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c);
      ok(!m.layout && m.v2 && !m.escopo && m.caixa && !m.piloto, 'José (beta): V2 de sempre, sem layout, sem refinamento do piloto físico em Medicina Familiar', m);
      ok(mesmosDados(c.ref, m) && m.tracosDesenhados === c.ref.tracosDesenhados, 'José: dados idênticos', [c.ref.linhas, m.linhas]);
      await fecha(c); }

    sec(t + '1 · ETAPA 1 (prévia = só administrador): só José vê; o aluno e o 2.º testador continuam sem nada');
    { const c = { persona: 'JOSE', w: W, cena: mkCena(T('preview', 'preview')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c);
      ok(m.layout && m.v2 && !m.escopo && m.piloto === true, 'José: layout novo e caneta física da matéria liberados', m);
      ok(mesmosDados(c.ref, m) && m.pintados === c.ref.pintados && m.tracosDesenhados === c.ref.tracosDesenhados, `José: ${m.pintados} grifos, ${m.tracosDesenhados} traços desenhados e ${m.linhas.notas} nota idênticos`, [c.ref, m]);
      ok(semEscritaIndevida(m).length === 0 && c.errs.length === 0, 'José: 0 erro JS, nenhuma escrita indevida', [m.escritas, c.errs]);
      const r2 = await recarregar(c); ok(r2.layout && mesmosDados(c.ref, r2) && r2.tracosDesenhados === c.ref.tracosDesenhados, 'José: depois de ATUALIZAR a página, tudo igual', r2);
      await fecha(c); }
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('preview', 'preview')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c);
      ok(!m.layout && !m.v2 && m.legada && mesmosDados(c.ref, m), 'aluno COM acesso na prévia: nada muda (layout antigo, ferramentas antigas, dados idênticos)', m);
      await fecha(c); }

    { const c = { persona: 'TESTER2', w: W, cena: mkCena(T('preview', 'preview')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c);
      ok(!m.layout && !m.v2 && m.legada && mesmosDados(c.ref, m), 'prévia: o 2.º testador (nas listas, NÃO administrador) NÃO vê o layout novo nem a caneta nova em Medicina Familiar', m);
      await fecha(c); }

    sec(t + '2 · ETAPA 2 só do LAYOUT: aluno com acesso vê o layout novo, SEM a caneta nova');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('all', 'off')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c);
      ok(m.layout, 'aluno: layout novo montado', m);
      ok(!m.v2 && !m.caixa && m.legada && !m.corpoV2, 'aluno: nenhuma ferramenta nova (sem V2); marcador/goma antigos à vista', m);
      ok(mesmosDados(c.ref, m) && m.pintados === c.ref.pintados, `aluno: ${m.pintados} grifos pintados; ${m.linhas.tracos} traços e ${m.linhas.notas} nota continuam gravados`, [c.ref, m]);
      ok(semEscritaIndevida(m).length === 0 && m.escritas.length === 0 && c.errs.length === 0, 'aluno: abrir não escreve nada no banco; 0 erro JS', [m.escritas, c.errs]);
      const r2 = await recarregar(c); ok(r2.layout && !r2.v2 && mesmosDados(c.ref, r2), 'aluno: depois de ATUALIZAR a página, igual', r2);
      await fecha(c); }

    sec(t + '3 · ETAPA 2 só da CANETA: aluno com acesso ganha a caneta nesta matéria, SEM o layout novo');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('off', 'all')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c);
      ok(!m.layout, 'aluno: layout antigo (a caneta não depende do layout)', m);
      ok(m.v2 && m.escopo && m.caixa && m.corpoV2 && m.flagV1 && !m.legada, 'aluno: V2 montada em modo «por matéria»; caixa de ferramentas à vista; coluna antiga escondida', m);
      ok(m.piloto === true, 'aluno: refinamentos físicos da caneta (palma/toque) valem nesta matéria', m.piloto);
      ok(mesmosDados(c.ref, m) && m.tracosDesenhados === c.ref.linhas.tracos && m.pintados === c.ref.pintados, `aluno: ${m.tracosDesenhados} traços desenhados, ${m.pintados} grifos e ${m.linhas.notas} nota, idênticos`, [c.ref, m]);
      await c.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); const arm = await c.page.evaluate(() => window.RMToolsV2.estado.tool);
      ok(arm === 'pen', 'aluno: consegue armar a caneta', arm);
      const desenhou = await riscar(c); const m2 = await c.page.evaluate(MEDIR2);
      ok(desenhou && m2.escritas.filter(e => e === 'insert:user_ink_strokes').length === 1, 'aluno: 1 traço novo gravado (só user_ink_strokes)', m2.escritas);
      ok(semEscritaIndevida(m2).length === 0 && c.errs.length === 0, 'aluno: nenhuma escrita fora das anotações; 0 erro JS', [m2.escritas, c.errs]);
      const r2 = await recarregar(c);
      ok(r2.escopo && r2.linhas.tracos === c.ref.linhas.tracos + 1 && r2.tracosDesenhados === c.ref.linhas.tracos + 1, 'aluno: depois de ATUALIZAR a página, o traço novo volta e os antigos continuam', [r2.linhas, r2.tracosDesenhados]);
      await fecha(c); }

    sec(t + '4 · layout E caneta liberados para o aluno');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('all', 'all')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c);
      ok(m.layout && m.v2 && m.escopo && m.caixa && !m.legada, 'aluno: layout novo + caneta por matéria', m);
      ok(mesmosDados(c.ref, m) && m.tracosDesenhados === c.ref.linhas.tracos && m.pintados === c.ref.pintados, `aluno: ${m.pintados} grifos, ${m.tracosDesenhados} traços e ${m.linhas.notas} nota idênticos`, [c.ref, m]);
      ok(semEscritaIndevida(m).length === 0 && m.escritas.length === 0 && c.errs.length === 0, 'aluno: abrir não escreve nada; 0 erro JS', [m.escritas, c.errs]);
      sec(t + '5 · VOLTA ao layout anterior (estágios → off): mesmos dados, ferramentas antigas');
      c.cena.tabela = T('off', 'off');
      const v = await recarregar(c);
      ok(!v.layout && !v.v2 && !v.corpoV2 && !v.flagV1 && v.legada, 'depois da volta: layout antigo, sem V2, marcador/goma antigos à vista', v);
      ok(mesmosDados(c.ref, v) && v.pintados === c.ref.pintados, `depois da volta: os ${v.linhas.tracos} traços e a nota continuam GRAVADOS e os ${v.pintados} grifos pintados`, [c.ref, v]);
      ok(semEscritaIndevida(v).length === 0 && v.escritas.length === 0, 'a volta não escreve nada', v.escritas);
      c.cena.tabela = T('all', 'all'); const ida = await recarregar(c);
      ok(ida.layout && ida.escopo && ida.tracosDesenhados === c.ref.linhas.tracos && mesmosDados(c.ref, ida), 'e ligando de novo, tudo volta igual (ida e volta)', ida);
      await fecha(c); }

    sec(t + '6 · usuário SEM acesso à matéria (estágios all)');
    { const c = { persona: 'SEM', w: W, cena: mkCena(T('all', 'all')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c);
      ok(!m.layout && !m.v2 && m.legada && mesmosDados(c.ref, m), 'sem acesso: nada de layout novo nem caneta nova', m);
      await fecha(c); }

    sec(t + '7 · OUTRA matéria com Medicina Familiar em all');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('all', 'all')) }; await preparar(br, base, M('dermatologia'), c);
      const m = await ligar(c);
      ok(c.pedidos.length === 0, 'dermatologia: o site nem pergunta ao servidor', c.pedidos);
      ok(!m.layout && !m.v2 && m.legada && !m.corpoV2 && mesmosDados(c.ref, m) && m.pintados === c.ref.pintados, 'dermatologia: como hoje (layout antigo, ferramentas antigas, dados idênticos)', m);
      await fecha(c); }

    sec(t + '8 · aluno com a caneta SÓ em Medicina Familiar troca de matéria e volta');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('off', 'all')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c); ok(m.escopo && m.caixa, 'começa em Medicina Familiar com a caneta', m);
      await c.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
      const tabDerma = M('dermatologia').tab;
      await c.page.evaluate((tb) => { const t = document.createElement('div'); t.className = 'tab-content'; t.id = 'tab-' + tb; t.innerHTML = '<section id="dd-b01" class="container"><h2>Bloque de otra materia</h2><p>' + 'Texto de prueba de otra materia que no tiene la lapicera nueva. '.repeat(10) + '</p></section>'; document.getElementById('materias-container').appendChild(t); window.switchTab(tb); }, tabDerma);
      await c.page.waitForTimeout(900);
      const f = await c.page.evaluate(MEDIR2);
      ok(!f.v2NaAba && !f.caixa && !f.corpoV2 && !f.flagV1 && f.ferramenta === 'none', 'em OUTRA matéria: V2 invisível e inerte, ferramenta desarmada, sinal da V2 desligado (o marcador/goma antigos voltam a valer)', f);
      await c.page.evaluate(() => { window.__writes.length = 0; window.RMToolsV2.escolherFerramenta('pen'); window.RMToolsV2.escolherFerramenta('highlight'); });
      const f2 = await c.page.evaluate(MEDIR2); ok(f2.ferramenta === 'none', 'em OUTRA matéria: não consegue armar caneta nem marcador V2', f2.ferramenta);
      const riscou = await riscar(c); const f3 = await c.page.evaluate(MEDIR2);
      ok(riscou && f3.escritas.length === 0 && f3.tracosDesenhados === 0, 'em OUTRA matéria: arrastar o mouse/lápis não desenha nem grava nada', f3.escritas);
      await c.page.evaluate((mf) => window.switchTab(mf), M(MF).tab); await c.page.waitForTimeout(900);
      const b = await c.page.evaluate(MEDIR2);
      ok(b.v2NaAba && b.caixa && b.corpoV2 && b.flagV1 && b.tracosDesenhados === c.ref.linhas.tracos, 'de volta a Medicina Familiar: a caneta volta e os traços reaparecem', b);
      ok(c.errs.length === 0, '0 erro JS', c.errs);
      await fecha(c); }

    sec(t + '9 · José (beta de sempre) em outra matéria: NADA mudou para ele');
    { const c = { persona: 'JOSE', w: W, cena: mkCena(T('preview', 'preview')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c); ok(m.v2 && !m.escopo, 'José: V2 global (não é «por matéria»)', m);
      const tabDerma = M('dermatologia').tab;
      await c.page.evaluate((tb) => { const t = document.createElement('div'); t.className = 'tab-content'; t.id = 'tab-' + tb; t.innerHTML = '<section id="dd-b01" class="container"><p>' + 'Texto de prueba de otra materia. '.repeat(10) + '</p></section>'; document.getElementById('materias-container').appendChild(t); window.switchTab(tb); }, tabDerma);
      await c.page.waitForTimeout(700); await c.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
      const f = await c.page.evaluate(MEDIR2); ok(f.v2NaAba && f.ferramenta === 'pen' && f.caixa && f.piloto === false, 'José em outra matéria: continua podendo armar a caneta (como hoje), sem os refinamentos físicos', f);
      await fecha(c); }

    sec(t + '10 · piloto Semiología II: aluno comum continua sem nada, mesmo com a tabela em all');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(Object.assign(T('off', 'off'), { 'semiologia-ii': { layout_stage: 'all', pen_stage: 'all', visual_stage: 'all' } }), { acessos: { [S.U.ALUNO]: ['semiologia-ii'] } }) };
      await preparar(br, base, M('semiologia-ii'), c); const m = await ligar(c);
      ok(!m.layout && !m.v2 && mesmosDados(c.ref, m), 'Semiología II: aluno comum sem layout novo e sem caneta nova', m);
      await fecha(c); }
    { const c = { persona: 'JOSE', w: W, cena: mkCena({}) }; await preparar(br, base, M('semiologia-ii'), c); const m = await ligar(c);
      ok(m.layout && m.v2 && m.piloto === true && mesmosDados(c.ref, m), 'Semiología II: José segue com layout e caneta do piloto, dados idênticos', m);
      await fecha(c); }

    sec(t + '11 · falha da tabela de estágios ⇒ desligado');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(null) }; await preparar(br, base, M(MF), c); const m = await ligar(c);
      ok(!m.layout && !m.v2 && m.legada && mesmosDados(c.ref, m), 'tabela inexistente: tudo como hoje', m); await fecha(c); }

    sec(t + '12 · tema visual PRÓPRIO de Medicina Familiar (visual_stage): o layout fica e o tema entra, dados intactos');
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('all', 'off', 'all')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c, 6500);
      const sis = await c.page.evaluate(() => ({ rmSis: document.documentElement.classList.contains('rm-sis'), tema: document.documentElement.getAttribute('data-rm-tema') }));
      ok(m.layout && sis.rmSis && sis.tema === 'medicina-familiar', 'aluno com acesso (layout=all, tema=all): layout + tema próprio de Medicina Familiar', [m.layout, sis]);
      ok(!m.v2 && m.legada, 'a caneta nova continua desligada (coluna antiga à vista)', m);
      ok(mesmosDados(c.ref, m) && m.pintados === c.ref.pintados && c.errs.length === 0 && semEscritaIndevida(m).length === 0, 'dados idênticos; 0 erro JS', [m.escritas, c.errs]);
      await fecha(c); }
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('off', 'off', 'all')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c, 3000); const sis = await c.page.evaluate(() => document.documentElement.classList.contains('rm-sis'));
      ok(!m.layout && !sis, 'tema=all sem layout: nada (o tema nunca entra sozinho)', [m.layout, sis]); await fecha(c); }

    sec(t + '17 · PRÉVIA COMPLETA (layout + tema + caneta, só o administrador): funciona junto, preserva os dados e volta');
    { const c = { persona: 'JOSE', w: W, cena: mkCena(T('preview', 'preview', 'preview')) }; await preparar(br, base, M(MF), c);
      const refPos = await c.page.evaluate(D.MEDIR);   // posição de cada traço (fração da caixa do parágrafo que o recebe) ANTES do layout e do tema
      const m = await ligar(c, 6500);
      const posDep = await c.page.evaluate(D.MEDIR); const difPos = D.comparar(refPos, posDep, 'tema').filter(x => x.tipo !== 'erro-js');
      ok(difPos.length === 0 && refPos.tracos.length >= 3, `17 · ${refPos.tracos.length} traços e ${refPos.grifos.length} grifos ficam na MESMA caixa e posição (≤ 0,02) depois do layout + tema (UI derivada não desloca âncora)`, difPos.slice(0, 3));
      const sis = await c.page.evaluate(() => ({ rmSis: document.documentElement.classList.contains('rm-sis'), tema: document.documentElement.getAttribute('data-rm-tema'), nav: document.documentElement.hasAttribute('data-rm-nav') }));
      ok(m.layout && sis.rmSis && sis.tema === 'medicina-familiar' && sis.nav, '17 · administrador: layout + tema próprio + navegação montados', [m.layout, sis]);
      /* com o tema, no celular (< 700 px) a caixa de ferramentas vira o botão da faixa + dock embaixo (o MESMO comportamento aprovado em Semiología II): fica fechada até abrir */
      ok(m.v2 && (m.caixa || W < 700) && m.piloto === true && !m.escopo, '17 · caneta V2 viva em Medicina Familiar com os refinamentos físicos (os mesmos do piloto)', m);
      ok(mesmosDados(c.ref, m) && m.pintados === c.ref.pintados, `17 · ${m.pintados} grifos pintados; ${m.linhas.tracos} traços e ${m.linhas.notas} nota gravados, idênticos`, [c.ref, m]);
      await c.page.evaluate(() => window.RMNav.go({ view: 'block', block: 'aps' })); await c.page.waitForTimeout(1800);   // a capa não tem parágrafo: abre o primeiro bloco
      await c.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await c.page.evaluate(() => { window.__writes.length = 0; });
      const desenhou = await riscar(c); const m2 = await c.page.evaluate(MEDIR2);
      ok(desenhou && m2.escritas.filter(e => e === 'insert:user_ink_strokes').length === 1 && semEscritaIndevida(m2).length === 0, '17 · com layout e tema ligados, o lápis desenha e grava 1 traço (só em user_ink_strokes)', m2.escritas);
      const r2 = await recarregar(c); await c.page.waitForTimeout(3500); const m3 = await c.page.evaluate(MEDIR2);
      ok(m3.layout && m3.linhas.tracos === c.ref.linhas.tracos + 1 && mesmosDados({ linhas: { grifos: c.ref.linhas.grifos, tracos: c.ref.linhas.tracos + 1, notas: c.ref.linhas.notas } }, m3), '17 · atualizar a página: tudo volta, inclusive o traço novo', [r2.linhas, m3.linhas]);
      c.cena.tabela = T('off', 'off', 'off'); const v = await recarregar(c); await c.page.waitForTimeout(1500); const v2s = await c.page.evaluate(() => ({ rmSis: document.documentElement.classList.contains('rm-sis'), l: !!document.querySelector('.rm-l2, #rm-l2-side, .rm-l2-band') }));
      ok(!v.layout && !v2s.rmSis && v.pintados === c.ref.pintados && v.linhas.tracos === c.ref.linhas.tracos + 1 && v.linhas.notas === c.ref.linhas.notas, '17 · VOLTA (off|off|off): layout, tema e caneta saem; os grifos, os traços (inclusive o novo) e a nota continuam gravados', [v, v2s]);
      await fecha(c); }
    for (const persona of ['ALUNO', 'TESTER2', 'SEM', 'OUTRO']) {
      const c = { persona, w: W, cena: mkCena(T('preview', 'preview', 'preview')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c, 3500); const sis = await c.page.evaluate(() => document.documentElement.classList.contains('rm-sis'));
      ok(!m.layout && !sis && !m.v2 && m.legada && mesmosDados(c.ref, m), `17 · acesso privado: ${persona} (aluno/testador sem ser administrador) NÃO vê layout, tema nem caneta nova`, [m.layout, sis, m.v2]);
      await fecha(c); }
    { const c = { persona: 'ALUNO', w: W, cena: mkCena(T('all', 'all', 'all')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c, 6500); const sis = await c.page.evaluate(() => document.documentElement.getAttribute('data-rm-tema'));
      ok(m.layout && sis === 'medicina-familiar' && m.v2 && m.escopo && (m.caixa || W < 700), '17 · (só quando José liberar `all`) o aluno com acesso recebe layout + tema + caneta por matéria', [m.layout, sis, m.v2, m.escopo]);
      ok(mesmosDados(c.ref, m) && m.pintados === c.ref.pintados && m.tracosDesenhados === c.ref.linhas.tracos, 'dados do aluno idênticos', [c.ref, m]); await fecha(c); }

    if (W === 1440) { sec('13-estático · a identificação vem da sessão de AGORA, nunca do cache do RMTools');
      const src = require('fs').readFileSync(require('path').join(L.ROOT, 'assets/rm-tools-v2.js'), 'utf8');
      ok(/var uid = uidDaSessao \|\| await uidSessaoAgora\(\) \|\| await t\.userId\(\);/.test(src), 'iniciar(): sessão atual antes do cache do RMTools (userId())');
      ok(/var fresco = await uidSessaoAgora\(\);[\s\S]{0,500}await montarTudo\(t, fresco\)/.test(src), 'montagem por matéria: usa o uid fresco da sessão, não o de quando o escopo foi armado');
      ok(/function sb\(\) \{ if \(bloqueado\) return null;/.test(src), 'sb(): depois do bloqueio nenhum acesso ao banco passa pela V2'); }
    sec(t + '13 · TROCA DE CONTA na mesma aba: a caneta e o layout nunca usam identificação nem dados da conta anterior');
    const emitir = (c, evt, uid) => c.page.evaluate(([e, u]) => { window.__uidAtual = u || null; (window.__authCbs || []).forEach(cb => { try { cb(e, u ? { user: { id: u } } : null); } catch (x) {} }); }, [evt, uid]);
    const contarRecargas = c => c.page.evaluate(() => window.__recargas || 0);
    const armarContador = async c => { await c.page.evaluate(() => { window.__recargas = 0; const f = () => { window.__recargas++; }; if (window.RMToolsV2 && window.RMToolsV2._test.trocarRecarregar) window.RMToolsV2._test.trocarRecarregar(f); if (window.RMPilot && window.RMPilot._trocarRecarregar) window.RMPilot._trocarRecarregar(f); }); };
    { /* 13a · caneta DE JOSE (beta) montada; entra OUTRA conta sem recarregar */
      const c = { persona: 'JOSE', w: W, cena: mkCena(T('preview', 'preview')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c); await armarContador(c);
      ok(m.v2 && m.layout, '13a · antes: José com V2 e layout montados', m);
      await c.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
      await c.page.evaluate(() => { window.__writes.length = 0; });
      c.persona = 'ALUNO'; await emitir(c, 'SIGNED_IN', S.U.ALUNO); await c.page.waitForTimeout(500);
      const m2 = await c.page.evaluate(() => ({ bloq: window.RMToolsV2._test.bloqueado(), ferr: window.RMToolsV2.estado.tool, tracos: document.querySelectorAll('#rm2-ink path[data-ink]').length, caixa: (() => { const b = document.querySelector('.rm2-box'); return !!b && getComputedStyle(b).display !== 'none'; })(), layout: !!document.querySelector('.rm-l2, #rm-l2-side, .rm-l2-band'), cache: Object.keys(window.RMPilot._estado().porSlug).length, esc: (window.__writes || []).slice() }));
      ok(m2.bloq && m2.ferr === 'none' && m2.tracos === 0 && !m2.caixa, '13a · outra conta entrou: caneta BLOQUEADA, ferramenta desarmada, tinta da conta anterior apagada, caixa escondida', m2);
      ok(!m2.layout && m2.cache === 0, '13a · layout da conta anterior retirado e cache de liberações descartado', m2);
      ok(await contarRecargas(c) >= 1, '13a · a página é recarregada (nada da conta anterior sobra)', await contarRecargas(c));
      await c.page.evaluate(() => { window.RMToolsV2.escolherFerramenta('pen'); window.RMToolsV2.escolherFerramenta('highlight'); });
      const riscou = await riscar(c).catch(() => false); const m3 = await c.page.evaluate(MEDIR2);
      ok(m3.ferramenta === 'none' && m3.escritas.length === 0 && m2.esc.length === 0, '13a · depois do bloqueio: não arma, não desenha e NÃO escreve no banco com a conta anterior', [m3.ferramenta, m3.escritas, m2.esc]);
      await fecha(c); }
    { /* 13b · aluno com caneta POR MATÉRIA montada; a sessão é encerrada */
      const c = { persona: 'ALUNO', w: W, cena: mkCena(T('off', 'all')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c); await armarContador(c); ok(m.escopo && m.caixa, '13b · antes: aluno com a caneta da matéria', m);
      await c.page.evaluate(() => { window.__writes.length = 0; });
      await emitir(c, 'SIGNED_OUT', null); await c.page.waitForTimeout(500);
      const m2 = await c.page.evaluate(() => ({ bloq: window.RMToolsV2._test.bloqueado(), ferr: window.RMToolsV2.estado.tool, caixa: (() => { const b = document.querySelector('.rm2-box'); return !!b && getComputedStyle(b).display !== 'none'; })(), flagV1: window.RM_STUDY_V2_ACTIVE === true, esc: (window.__writes || []).slice() }));
      ok(m2.bloq && !m2.caixa && m2.ferr === 'none' && !m2.flagV1 && m2.esc.length === 0, '13b · SIGNED_OUT: caneta bloqueada e escondida, sem escrita', m2);
      ok(await contarRecargas(c) === 0, '13b · SIGNED_OUT NÃO recarrega a página (o site mostra «Sesión cerrada» ou recarrega por conta própria; recarregar aqui esconderia o aviso)', await contarRecargas(c));
      c.persona = 'ALUNO'; await emitir(c, 'SIGNED_IN', S.U.ALUNO); await c.page.waitForTimeout(500);
      ok(await contarRecargas(c) >= 1, '13b · a próxima ENTRADA numa página que ficou bloqueada recarrega (nada da conta anterior sobra)', await contarRecargas(c));
      await fecha(c); }
    { /* 13f · layout ligado, sessão derrubada (SIGNED_OUT): layout sai, cache zera, SEM recarga; a entrada seguinte recarrega */
      const c = { persona: 'JOSE', w: W, cena: mkCena(T('preview', 'preview')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c); await armarContador(c); ok(m.layout, '13f · antes: layout em prévia para José', m.layout);
      await emitir(c, 'SIGNED_OUT', null); await c.page.waitForTimeout(600);
      const o = await c.page.evaluate(() => ({ cache: Object.keys(window.RMPilot._estado().porSlug).length, layout: !!document.querySelector('.rm-l2, #rm-l2-side, .rm-l2-band'), recargas: window.__recargas || 0 }));
      ok(o.cache === 0 && !o.layout && o.recargas === 0, '13f · SIGNED_OUT: layout retirado, liberações descartadas e nenhuma recarga (a tela «Sesión cerrada» do site continua visível)', o);
      c.persona = 'OUTRO'; await emitir(c, 'SIGNED_IN', S.U.OUTRO); await c.page.waitForTimeout(500);
      ok(await contarRecargas(c) >= 1, '13f · a entrada seguinte recarrega (a matéria na tela era da conta anterior)', await contarRecargas(c));
      await fecha(c); }
    { /* 13c · liberações em cache da conta A NÃO valem para a conta B (sem a V2 montada) */
      const c = { persona: 'JOSE', w: W, cena: mkCena(T('preview', 'preview')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c); await armarContador(c);
      ok(m.layout, '13c · José (conta A) com o layout em prévia', m.layout);
      await c.page.evaluate(() => { window.RMToolsV2 = undefined; });   // simula «V2 não montada»: só o carregador de liberações está em jogo
      const pedidosAntes = c.pedidos.length;
      c.persona = 'ALUNO'; await emitir(c, 'SIGNED_IN', S.U.ALUNO); await c.page.waitForTimeout(800);
      const est = await c.page.evaluate(() => ({ cache: Object.keys(window.RMPilot._estado().porSlug).length, layout: !!document.querySelector('.rm-l2, #rm-l2-side, .rm-l2-band'), pen: window.RMPilot.penLiberada('medicina-familiar') }));
      ok(est.cache === 0 && !est.layout && !est.pen, '13c · conta B (aluno): layout da conta A retirado, cache vazio, caneta não liberada', est);
      ok(await contarRecargas(c) >= 1, '13c · como algo já estava ligado, a página recarrega', await contarRecargas(c));
      await fecha(c); }
    { /* 13d · nada estava ligado (cadastro/recuperação): sair e entrar NÃO recarrega nem bloqueia nada */
      const c = { persona: 'ALUNO', w: W, cena: mkCena(T('off', 'off')) }; await abrirPersona(br, base, M(MF), c); await carregar(c);
      await c.page.evaluate(() => { window.__recargas = 0; });
      await c.page.addScriptTag({ url: '/assets/rm-pilot.js?v=teste' }); await c.page.waitForTimeout(300);
      await c.page.evaluate(() => { window.RMPilot._trocarRecarregar(() => { window.__recargas++; }); });
      await emitir(c, 'SIGNED_OUT', null); await c.page.waitForTimeout(400);
      ok(await contarRecargas(c) === 0, '13d · SIGNED_OUT sem nada ligado: nenhuma recarga (não atrapalha cadastro nem recuperação de senha)', await contarRecargas(c));
      await fecha(c); }
    { /* 13e · V2 ainda não montada (aluno comum, caneta off) e entra outra conta: o uid usado é o da sessão de AGORA */
      const c = { persona: 'ALUNO', w: W, cena: mkCena(T('off', 'off')) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c); ok(!m.v2, '13e · aluno: V2 não montada', m.v2);
      c.persona = 'JOSE'; await emitir(c, 'SIGNED_IN', S.U.JOSE); await c.page.waitForTimeout(1500);
      const st2 = await c.page.evaluate(() => window.RMToolsV2 ? { montou: true, uid: window.RMToolsV2.estado.uid, bloq: window.RMToolsV2._test.bloqueado() } : { montou: false });
      ok(!st2.montou || (st2.uid === S.U.JOSE && !st2.bloq), '13e · se a V2 montar para a conta nova, é com a identificação da conta NOVA (nunca a anterior)', st2);
      await fecha(c); }

    sec(t + '14 · troca de conta ENQUANTO a consulta de acesso à V2 (study_tools_beta) ainda voa');
    /* a consulta da conta A fica SEGURA (Promise) até o teste liberar; a conta A está na tabela de beta (se a resposta dela valesse, montaria a V2 com a identificação de A) */
    const SEGURAR = ([rows]) => { window.__betaRows = rows; window.__betaHold = new Promise(r => { window.__liberarBeta = r; }); };
    const iniciarEspera = async (slug, extra) => { const c = Object.assign({ persona: 'ALUNO', w: W, cena: mkCena(T('off', 'off')), init: [SEGURAR, [{ [S.U.ALUNO]: { enabled: true } }]] }, extra || {});
      await abrirPersona(br, base, M(slug), c); await carregar(c); await c.page.waitForTimeout(500);
      c.antes = await c.page.evaluate(() => ({ consultas: (window.__betaPedidos || []).slice(), v2: !!window.RMToolsV2 })); return c; };
    const liberarEspera = async c => { await c.page.evaluate(() => window.__liberarBeta()); await c.page.waitForTimeout(900); };
    const estadoV2 = c => c.page.evaluate(() => ({ v2: !!window.RMToolsV2, uid: window.RMToolsV2 ? window.RMToolsV2.estado.uid : null, bloq: window.RMToolsV2 ? window.RMToolsV2._test.bloqueado() : null, caixas: document.querySelectorAll('.rm2-box').length, corpoV2: document.body.classList.contains('rm-v2'), flagV1: window.RM_STUDY_V2_ACTIVE === true, escopo: !!(window.RMToolsV2 && window.RMToolsV2._test.escopo && window.RMToolsV2._test.escopo()), escritas: (window.__writes || []).slice(), erros: (window.__errs || []).slice(0, 3), recargas: window.__recargas || 0 }));
    { /* 14a · A (na tabela de beta, consulta segura) → entra B (beta pelo código) → a resposta de A chega: NADA de A é montado */
      const c = await iniciarEspera(MF);
      ok(c.antes.consultas.includes(S.U.ALUNO) && !c.antes.v2, '14a · a consulta da conta A está em voo e nada foi montado ainda', c.antes);
      await armarContador(c); c.persona = 'JOSE'; await emitir(c, 'SIGNED_IN', S.U.JOSE); await c.page.waitForTimeout(900);
      const antesDeLiberar = await estadoV2(c);
      ok(antesDeLiberar.v2 && antesDeLiberar.uid === S.U.JOSE && !antesDeLiberar.escopo, '14a · conta B entrou: a V2 monta para B (identificação de B), enquanto a consulta de A segue segurada', antesDeLiberar);
      await liberarEspera(c); const depois = await estadoV2(c);
      ok(depois.uid === S.U.JOSE && depois.caixas === 1 && !depois.bloq && depois.escritas.length === 0 && depois.erros.length === 0, '14a · a resposta tardia de A é descartada: continua só B, 1 caixa, 0 escrita, 0 erro', depois);
      await fecha(c); }
    { /* 14b · A (na tabela) → entra B (aluno comum SEM beta) → a resposta de A chega: a V2 NÃO monta para ninguém */
      const c = await iniciarEspera(MF); await armarContador(c);
      c.persona = 'OUTRO'; await emitir(c, 'SIGNED_IN', S.U.OUTRO); await c.page.waitForTimeout(600);
      await liberarEspera(c); const e = await estadoV2(c); const legada = await c.page.evaluate(() => [...document.querySelectorAll('.rm-tools-r')].some(x => { const r = x.getBoundingClientRect(); return getComputedStyle(x).display !== 'none' && r.width > 0; }));
      ok(!e.v2 && e.caixas === 0 && !e.corpoV2 && !e.flagV1, '14b · conta B sem V2: a resposta «sim» da conta A NÃO monta a ferramenta para B', e);
      ok(legada && e.recargas === 0 && e.escritas.length === 0, '14b · B segue com as ferramentas antigas, sem recarga indevida e sem escrita', [legada, e.recargas, e.escritas]);
      await fecha(c); }
    { /* 14c · SAÍDA da conta durante a espera */
      const c = await iniciarEspera(MF); await armarContador(c);
      await emitir(c, 'SIGNED_OUT', null); await c.page.waitForTimeout(500); await liberarEspera(c); const e = await estadoV2(c);
      ok(!e.v2 && e.caixas === 0 && !e.corpoV2 && e.escritas.length === 0 && e.recargas === 0, '14c · SIGNED_OUT durante a consulta: nada é montado quando a resposta chega (e não há recarga, pois nada estava ligado)', e);
      await fecha(c); }
    { /* 14d · a sessão trocou SEM o evento ter chegado: a tentativa percebe pela sessão de agora e refaz para B */
      const c = await iniciarEspera(MF); await armarContador(c);
      await c.page.evaluate(([u]) => { window.__uidAtual = u; }, [S.U.JOSE]); await liberarEspera(c); const e = await estadoV2(c);
      ok(e.v2 && e.uid === S.U.JOSE && !e.escopo && e.caixas === 1, '14d · sessão trocada sem evento: a V2 que monta é a de B (identificação de B), nunca a de A', e);
      await fecha(c); }
    { /* 14e · Semiología II (piloto) preservada: B = conta do piloto entra durante a espera de A */
      const c = await iniciarEspera('semiologia-ii', { cena: mkCena({}) }); await armarContador(c);
      c.persona = 'JOSE'; await emitir(c, 'SIGNED_IN', S.U.JOSE); await c.page.waitForTimeout(700);
      const m = await ligar(c, 3000); await liberarEspera(c); const e = await estadoV2(c); const p = await c.page.evaluate(() => window.RMToolsV2 ? window.RMToolsV2._test.pilotoPermitido() : null);
      ok(m.layout && e.v2 && e.uid === S.U.JOSE && p === true && !e.bloq, '14e · Semiología II: a conta do piloto entra durante a espera de A e tem layout + caneta do piloto com a identificação DELA', [m.layout, e, p]);
      ok(e.escritas.length === 0 && e.erros.length === 0, '14e · sem escrita e sem erro JS', e);
      await fecha(c); }

    /* ---------- 15 · ORDEM REAL DE ABERTURA (sem aba falsa): Medicina Familiar com a caneta → Dermatología, aberta como o index.html abre (openTab) ---------- */
    sec(t + '15 · aluno com a caneta em Medicina Familiar abre Dermatología (HTML real, pelo caminho do openTab): marcador e borracha antigos funcionam; ao voltar, a caneta de MF funciona');
    for (const [rot15, tab15, esperaV2] of [['CONTROLE · tudo off', T('off', 'off'), false], ['caneta=all em MF', T('off', 'all'), true], ['layout+caneta=all em MF', T('all', 'all'), true]]) {
      const c = { persona: 'ALUNO', w: W, cena: mkCena(tab15) }; await preparar(br, base, M(MF), c);
      const m = await ligar(c); ok(!!m.escopo === esperaV2 && !!m.caixa === esperaV2, `15 [${rot15}] · em MF antes de abrir Dermatología: ${esperaV2 ? 'V2 por matéria à vista' : 'sem V2 (controle)'}`, m);
      const antes = await c.page.evaluate(MEDIR2);
      const abrirComoOSite = (slugTab) => c.page.evaluate(async (dt) => {   // MESMA ordem do openTab: fetch → anexar → enhanceAll → switchTab
        const html = await (await fetch('/m/dermatologia.html')).text(); const doc = new DOMParser().parseFromString(html, 'text/html');
        let el = doc.getElementById('tab-' + dt); if (!el) { el = document.createElement('div'); el.className = 'tab-content'; el.id = 'tab-' + dt; el.innerHTML = doc.body.innerHTML; }
        document.getElementById('materias-container').appendChild(document.importNode(el, true));
        window.RepassoMed.enhanceAll(); window.switchTab(dt); await new Promise(o => setTimeout(o, 1800));
        const tab = document.getElementById('tab-' + dt); const vis = e => { if (!e) return false; const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0; };
        return { coluna: vis(tab.querySelector('.rm-tools-r')), marcador: vis(tab.querySelector('.rm-tools-r .rm-mark')), borracha: vis(tab.querySelector('.rm-tools-r .rm-erase')), caixaV2: vis(document.querySelector('.rm2-box')), flagV2: window.RM_STUDY_V2_ACTIVE === true }; }, slugTab);
      const d = await abrirComoOSite(M('dermatologia').tab);
      ok(d.coluna && d.marcador && d.borracha, `15 [${rot15}] · Dermatología (aberta depois de MF): coluna antiga, marcador e borracha à vista`, d);
      ok(!d.caixaV2 && !d.flagV2, `15 [${rot15}] · Dermatología: caixa V2 escondida e sinal da V2 desligado`, d);
      await c.page.evaluate(() => { window.__writes.length = 0; });
      const g = await c.page.evaluate(async (dt) => { const tab = document.getElementById('tab-' + dt); tab.querySelector('.rm-tools-r .rm-mark').click(); await new Promise(o => setTimeout(o, 300)); const ligado = tab.querySelector('.rm-tools-r .rm-mark').classList.contains('on');
        const p = [...tab.querySelectorAll('section p')].find(p => p.textContent.length > 120 && p.checkVisibility && p.checkVisibility() && !p.closest('table,[data-rm-ui],.quiz-item')); const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let tn; while ((tn = w.nextNode())) { if (tn.textContent.length >= 50) break; }
        const r = document.createRange(); r.setStart(tn, 3); r.setEnd(tn, 33); const feito = await window.RMTools.marcarRange(r, 'yellow'); await new Promise(o => setTimeout(o, 500)); return { ligado, feito, pintados: tab.querySelectorAll('.rm-hl').length }; }, M('dermatologia').tab).catch(er => ({ ligado: false, feito: false, pintados: 0, erro: String(er).slice(0, 90) }));
      const w1 = await c.page.evaluate(() => window.__writes.slice());
      ok(g.ligado && g.feito && g.pintados >= 1 && w1.filter(x => x === 'insert:user_highlights').length === 1, `15 [${rot15}] · marcador: ativa pela interface e CRIA o grifo (1 insert em user_highlights)`, [g, w1]);
      const e15 = await c.page.evaluate(async (dt) => { const tab = document.getElementById('tab-' + dt); tab.querySelector('.rm-tools-r .rm-mark').click(); tab.querySelector('.rm-tools-r .rm-erase').click(); await new Promise(o => setTimeout(o, 300)); const ligada = tab.querySelector('.rm-tools-r .rm-erase').classList.contains('on'); const h = tab.querySelector('.rm-hl'); if (h) h.click(); await new Promise(o => setTimeout(o, 700)); return { ligada, restam: tab.querySelectorAll('.rm-hl').length }; }, M('dermatologia').tab).catch(er => ({ ligada: false, restam: -1, erro: String(er).slice(0, 90) }));
      const w2 = await c.page.evaluate(() => window.__writes.slice());
      ok(e15.ligada && e15.restam === 0 && w2.some(x => x === 'delete:user_highlights'), `15 [${rot15}] · borracha: ativa pela interface e APAGA o grifo (delete em user_highlights)`, [e15, w2]);
      ok(semEscritaIndevida({ escritas: w2 }).length === 0 && !w2.some(x => /user_ink_strokes|user_notes/.test(x)), `15 [${rot15}] · em Dermatología só user_highlights foi tocado: traços e notas de MF intactos`, w2);
      await c.page.evaluate((mf) => window.switchTab(mf), M(MF).tab); await c.page.waitForTimeout(1200);
      const mf = await c.page.evaluate(MEDIR2);
      ok(esperaV2 ? (mf.caixa && mf.flagV1 && mf.tracosDesenhados === antes.tracosDesenhados) : (!mf.caixa && mf.legada), `15 [${rot15}] · de volta a MF: ${esperaV2 ? 'caixa V2 e os ' + antes.tracosDesenhados + ' traços voltam' : 'sem V2, ferramentas antigas'}`, mf);
      if (esperaV2) {
        await c.page.evaluate(() => { window.__writes.length = 0; window.RMToolsV2.escolherFerramenta('pen'); }); const ok15 = await riscar(c); const f15 = await c.page.evaluate(MEDIR2);
        ok(ok15 && f15.escritas.filter(x => x === 'insert:user_ink_strokes').length === 1 && semEscritaIndevida(f15).length === 0, `15 [${rot15}] · de volta a MF: a caneta funciona (1 insert em user_ink_strokes)`, f15.escritas);
        ok(f15.linhas.tracos === antes.linhas.tracos + 1 && f15.linhas.notas === antes.linhas.notas && f15.linhas.grifos === antes.linhas.grifos, `15 [${rot15}] · dados de MF preservados: ${antes.linhas.tracos} traços + 1 novo, ${antes.linhas.notas} nota, ${antes.linhas.grifos} grifos`, [antes.linhas, f15.linhas]); }
      ok(c.errs.length === 0, `15 [${rot15}] · 0 erro JS`, c.errs); await fecha(c); }

    /* ---------- 16 · RESPOSTA ATRASADA de hasStudyToolsV2Access: segura a resposta da conta A, troca de conta, só então libera ---------- */
    if (W === 1440) { sec(t + '16 · a conta A sai enquanto hasStudyToolsV2Access ainda verifica o acesso de A: a resposta atrasada NÃO monta a ferramenta com a identificação de A para B');
      const UA = S.U.ALUNO, UB = S.U.SEM;
      const abrir16 = async (bBeta) => {
        const c = { persona: 'ALUNO', w: W, cena: mkCena(T('off', 'off')) }; await abrirPersona(br, base, M(MF), c);
        await c.page.addInitScript(([UA, UB, bBeta]) => {
          window.__seguras = []; window.__reqBeta = [];
          let _sb; Object.defineProperty(window, 'RM_SB', { configurable: true, get() { return _sb; }, set(v) {
            const from0 = v.from; v.from = function (tb) {
              if (tb !== 'study_tools_beta') return from0.apply(this, arguments);
              let alvo = null; const q = { select() { return q; }, eq(k, val) { alvo = val; return q; }, limit() { return q; }, single() { return q; }, maybeSingle() {
                window.__reqBeta.push(alvo);
                if (alvo === UA) return new Promise(res => window.__seguras.push(() => res({ data: { enabled: true }, error: null })));   // A: a resposta fica RETIDA até o teste liberar
                return Promise.resolve({ data: (bBeta && alvo === UB) ? { enabled: true } : null, error: null }); }, then(res) { return q.maybeSingle().then(res); } }; return q; };
            _sb = v; } });
          Object.defineProperty(window, '_sb', { configurable: true, get() { return window.RM_SB; }, set() {} });
        }, [UA, UB, bBeta]);
        await carregar(c); await c.page.addScriptTag({ url: '/assets/rm-pilot.js?v=teste' }); await c.page.waitForTimeout(1200);
        return c; };
      const estado16 = c => c.page.evaluate(() => ({ montou: !!window.RMToolsV2, uid: window.RMToolsV2 ? window.RMToolsV2.estado.uid : null, bloq: window.RMToolsV2 && window.RMToolsV2._test.bloqueado ? window.RMToolsV2._test.bloqueado() : null, caixa: (() => { const b = document.querySelector('.rm2-box'); return !!b && getComputedStyle(b).display !== 'none'; })(), pedidos: window.__reqBeta.slice(), seguras: window.__seguras.length, escritas: (window.__writes || []).slice() }));
      { const c = await abrir16(false); const a = await estado16(c);
        ok(a.seguras === 1 && !a.montou, '16a · CONTROLE do teste: a verificação de A está retida e nada montou ainda', a);
        await c.page.evaluate(() => window.__seguras.splice(0).forEach(f => f())); await c.page.waitForTimeout(1500); const b = await estado16(c);
        ok(b.montou && b.uid === UA && b.caixa, '16a · CONTROLE: sem troca de conta, liberar a resposta de A monta a V2 com A (o mecanismo do teste funciona)', b); await fecha(c); }
      { const c = await abrir16(false); await armarContador(c); c.persona = 'SEM';
        await emitir(c, 'SIGNED_IN', UB); await c.page.waitForTimeout(500);
        await c.page.evaluate(() => window.__seguras.splice(0).forEach(f => f())); await c.page.waitForTimeout(2000); const r = await estado16(c);
        ok(!r.montou || (r.uid === UB && !r.bloq), '16b · conta B (sem acesso) entrou ANTES de a resposta de A ser liberada: a V2 não monta com a identificação de A', r);
        ok(!r.caixa && r.escritas.length === 0, '16b · nenhuma caixa de ferramentas nem escrita no banco para B', r); await fecha(c); }
      { const c = await abrir16(true); c.persona = 'SEM'; await emitir(c, 'SIGNED_IN', UB); await c.page.waitForTimeout(500);
        await c.page.evaluate(() => window.__seguras.splice(0).forEach(f => f())); await c.page.waitForTimeout(2200); const r = await estado16(c);
        ok(r.montou && r.uid === UB && r.pedidos.includes(UB), '16c · se B tem acesso à V2, a verificação RECOMEÇA com B e a V2 monta com a identificação de B (nunca A)', r); await fecha(c); }
      { const c = await abrir16(false); c.persona = 'SEM'; await emitir(c, 'SIGNED_OUT', null); await c.page.waitForTimeout(500);
        await c.page.evaluate(() => window.__seguras.splice(0).forEach(f => f())); await c.page.waitForTimeout(1800); const r = await estado16(c);
        ok(!r.montou && !r.caixa, '16d · a conta A sai (SIGNED_OUT) com a verificação em voo: a resposta atrasada não monta nada', r); await fecha(c); } }
  }
  await br.close(); srv.close();
  console.log(`\nnova-era/navegador: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
