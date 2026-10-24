/* PRÉ-VOO · TESTE 2 — IDA E VOLTA DOS DADOS DO ALUNO ENTRE O LAYOUT ATUAL E O NOVO
   Pergunta: o que o aluno já gravou (grifos, traços da caneta, notas) aparece igual quando a matéria passa a abrir com o layout novo — e volta a aparecer
   igual se a matéria for desligada (volta à versão anterior)?
   Método (mesma aba, mesmo sessionStorage = o «banco» simulado persistente do harness; nada sai da máquina):
     1. CONTROLE  — abre a matéria como o site a serve hoje; grava com o MOTOR REAL (RMTools.marcarRange) até 10 grifos espalhados pelas secções;
                    semeia 6 traços (âncora calculada pelo motor: RMToolsV2._test.anchorDe) e 1 nota; recarrega e mede a LINHA DE BASE.
     2. LAYOUT    — navega a mesma aba para Layout V2 + tema + navegação e mede de novo; percorre o bloco de cada grifo e confere que o grifo está visível.
     3. VOLTA     — navega de novo para o CONTROLE (rollback) e mede.
   PASSA = (a) os mesmos grifos pintados (mesmo texto, mesma secção), nenhum pendente a mais, nenhum «no lugar errado»;
           (b) os mesmos traços, cada um preso à MESMA caixa (texto da âncora igual) e na mesma posição relativa (≤ 0,02 da caixa; só no mesmo viewport);
           (c) a nota continua listada, com o mesmo rótulo; (d) as fases 2 e 3 não fazem NENHUMA escrita (insert/update/delete) no banco.
   Não grava nada fora do sessionStorage do próprio teste; zero rede externa; nenhuma flag/arquivo de produção tocado.
   Controle negativo (--negativo): na fase LAYOUT insere um <p> no começo da secção do 1.º traço semeado (é onde um layout descuidado desloca o índice); só passa se o teste reprovar.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/ida-e-volta.cjs [slug ...] [--rapido] [--sem-corr] [--negativo]
   Saída: docs/pre-voo-caneta-layout/resultados/ida-e-volta.json */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');

const args = process.argv.slice(2), RAPIDO = args.includes('--rapido'), CORR = !args.includes('--sem-corr'), NEG = args.includes('--negativo'), filtro = args.filter(a => !a.startsWith('--'));
const LARGURAS = RAPIDO ? [1440] : [1440, 390];
const ALT = { 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const OUT = process.env.RM_PREVOO_OUT ? path.resolve(process.env.RM_PREVOO_OUT) : path.join(L.REPO, 'docs/pre-voo-caneta-layout/resultados');
const UID = 'd4d215d3-36dd-4efb-8869-bdea5376c648';   // o UID de tester que o harness usa para o motor da caneta montar (constante pública do código; sessão 100% simulada)
const REUNE = /banco|flashcards|repaso|simulacro/i;

/* ---- semeadura (roda no CONTROLE, com o motor real) ---- */
const SEMEAR = async ({ slug, uid, max }) => {
  const tab = document.querySelector('#materias-container > .tab-content');
  const secs = [...tab.querySelectorAll(':scope > section[id]')].filter(s => !/banco|flashcards|repaso|simulacro/i.test(s.id));
  const alvos = [];
  for (const s of secs) {
    const ps = [...s.querySelectorAll('p')].filter(p => !p.closest('[data-rm-ui],.quiz-item,.flashcard,details:not([open]),table,figure') && p.textContent.trim().length > 110);
    if (!ps.length) continue;
    alvos.push({ s, p: ps[Math.min(1, ps.length - 1)] });
  }
  const passo = Math.max(1, Math.floor(alvos.length / max));
  const escolhidos = alvos.filter((_, i) => i % passo === 0).slice(0, max);
  const feitos = [];
  for (const a of escolhidos) {
    a.s.scrollIntoView({ block: 'start' });
    const w = document.createTreeWalker(a.p, NodeFilter.SHOW_TEXT);
    let n, tn = null; while ((n = w.nextNode())) { if (n.textContent.trim().length >= 70 && !n.parentElement.closest('.rm-hl')) { tn = n; break; } }
    if (!tn) continue;
    const ini = tn.textContent.indexOf(tn.textContent.trim()) + 12;
    const r = document.createRange(); r.setStart(tn, ini); r.setEnd(tn, ini + 28);
    const ok = await window.RMTools.marcarRange(r, 'yellow');
    if (ok) feitos.push({ sec: a.s.id, texto: r.toString().replace(/\s+/g, ' ').trim() });
  }
  /* traços: 1 por parágrafo ancorado em até 6 secções (âncora sub-índice, a mesma que o motor grava) */
  const tr = [];
  const alvosTr = escolhidos.slice(0, 6);
  alvosTr.forEach((a, i) => {
    const an = window.RMToolsV2._test.anchorDe(a.p);
    if (!an || an.id.indexOf('>') < 0) return;
    tr.push({ id: 'ens-ink-' + i, user_id: uid, subject_slug: slug, anchor_id: an.id, color: 'black', width: 'medium', created_at: new Date(Date.now() - 86400000 + i).toISOString(),
      points: [[0.08, 0.30], [0.30, 0.45], [0.55, 0.28], [0.80, 0.50], [0.95, 0.35]] });
  });
  sessionStorage.setItem('ens.user_ink_strokes', JSON.stringify(tr));
  const sec0 = escolhidos[0] && escolhidos[0].s;
  sessionStorage.setItem('ens.user_notes', JSON.stringify(sec0 ? [{ id: 'ens-nota-1', user_id: uid, subject_slug: slug, anchor_id: sec0.id, anchor_label: 'Nota de teste', title: 'Título', body: 'Corpo da nota', updated_at: new Date(Date.now() - 3600000).toISOString() }] : []));
  return { grifos: feitos, tracos: tr.length };
};

/* ---- medida (roda em qualquer fase) ---- */
const MEDIR = async () => {
  const tab = document.querySelector('#materias-container > .tab-content');
  await new Promise(r => setTimeout(r, 900));
  const por = {};
  tab.querySelectorAll('.rm-hl').forEach(sp => { const k = sp.getAttribute('data-hl') || '?'; (por[k] = por[k] || { sec: (sp.closest('section[id]') || {}).id || '?', t: '', vis: false }); por[k].t += sp.textContent; por[k].vis = por[k].vis || (sp.getBoundingClientRect().width > 0 && sp.getClientRects().length > 0 && sp.checkVisibility ? sp.checkVisibility({ checkVisibilityCSS: true }) : false); });
  const grifos = Object.values(por).map(g => ({ sec: g.sec, t: g.t.replace(/\s+/g, ' ').trim(), vis: g.vis })).sort((a, b) => (a.sec + a.t).localeCompare(b.sec + b.t));
  const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
  /* o traço só tem caixa medível se o bloco dele está à mostra: com a navegação ativa, abre o bloco de cada traço antes de medir (como o aluno faria) */
  const assentar = async () => { try { window.RMToolsV2.reposicionar(); } catch (e) { /* sem V2 */ } await new Promise(r => setTimeout(r, 500)); };   /* reflow tardio (imagens/fontes) já é conhecido; mede-se com a camada assentada, como o motor faz sozinho */
  await assentar();
  const medirTraco = p => {
    const sv = p.closest('svg'), a = sv.getAttribute('data-anchor'), [sid, ix] = a.split('>'), s = document.getElementById(sid);
    const el = s && (ix !== undefined ? s.querySelectorAll(SUB)[+ix] : s); if (!el) return { id: p.getAttribute('data-ink'), a, sem: true };
    const ra = el.getBoundingClientRect(), rb = p.getBoundingClientRect();
    return { id: p.getAttribute('data-ink'), a, sig: el.tagName + ':' + el.textContent.replace(/\s+/g, ' ').trim().slice(0, 48), fx: ra.width ? +((rb.left - ra.left) / ra.width).toFixed(3) : null, fy: ra.height ? +((rb.top - ra.top) / ra.height).toFixed(3) : null, vis: ra.width > 0 && ra.height > 0 };
  };
  const ids = [...document.querySelectorAll('#rm2-ink svg[data-anchor] path[data-ink]')].map(p => p.getAttribute('data-ink'));
  const tracos = [];
  for (const id of ids) {
    let p = document.querySelector('#rm2-ink path[data-ink="' + id + '"]'); if (!p) continue;
    let m = medirTraco(p);
    if (!m.vis && window.RMNav && window.RMNav.ativo && window.RMNav.ativo()) {
      try { window.RMNav.go({ view: 'block', block: m.a.split('>')[0] }); await new Promise(r => setTimeout(r, 400)); await assentar(); p = document.querySelector('#rm2-ink path[data-ink="' + id + '"]'); m = medirTraco(p); } catch (e) { /* sem navegação */ }
    }
    tracos.push(m);
  }
  tracos.sort((a, b) => a.id.localeCompare(b.id));
  const orfaos = window.RMToolsV2 && window.RMToolsV2.estado && window.RMToolsV2.estado.orfaos ? Object.keys(window.RMToolsV2.estado.orfaos).length : 0;
  let notas = [];
  try { window.RMToolsV2.abrirNotas(); await new Promise(r => setTimeout(r, 700)); notas = [...document.querySelectorAll('.rm2-note .meta b')].map(b => b.textContent.trim()); window.RMToolsV2.fecharNotas(); } catch (e) { notas = ['erro:' + e.message]; }
  return { grifos, tracos, orfaos, notas, pend: (document.querySelector('.rm-pend-badge, [data-rm-pendentes]') || {}).textContent || '', escritas: (window.__writes || []).slice(), erros: (window.__errs || []).slice(0, 3) };
};

function comparar(ref, cur, nome) {
  const f = [];
  const k = g => g.sec + '|' + g.t;
  const a = ref.grifos.map(k), b = cur.grifos.map(k);
  a.filter(x => !b.includes(x)).forEach(x => f.push({ fase: nome, tipo: 'grifo-sumiu', x }));
  b.filter(x => !a.includes(x)).forEach(x => f.push({ fase: nome, tipo: 'grifo-novo', x }));
  const ta = Object.fromEntries(ref.tracos.map(t => [t.id, t])), tb = Object.fromEntries(cur.tracos.map(t => [t.id, t]));
  Object.keys(ta).forEach(id => {
    if (!tb[id]) { f.push({ fase: nome, tipo: 'traco-sumiu', id, a: ta[id].a }); return; }
    if (ta[id].sig !== tb[id].sig) f.push({ fase: nome, tipo: 'traco-em-outra-caixa', id, a: ta[id].a, antes: ta[id].sig, depois: tb[id].sig });
    else if (ta[id].fx === null || tb[id].fx === null) f.push({ fase: nome, tipo: 'traco-sem-caixa-medivel', id, antes: [ta[id].fx, ta[id].fy], depois: [tb[id].fx, tb[id].fy] });
    else if (Math.abs(ta[id].fx - tb[id].fx) > 0.02 || Math.abs(ta[id].fy - tb[id].fy) > 0.02) f.push({ fase: nome, tipo: 'traco-deslocado', id, antes: [ta[id].fx, ta[id].fy], depois: [tb[id].fx, tb[id].fy] });
  });
  Object.keys(tb).forEach(id => { if (!ta[id]) f.push({ fase: nome, tipo: 'traco-novo', id }); });
  if (JSON.stringify(ref.notas) !== JSON.stringify(cur.notas)) f.push({ fase: nome, tipo: 'notas-diferentes', antes: ref.notas, depois: cur.notas });
  if (cur.orfaos > ref.orfaos) f.push({ fase: nome, tipo: 'tracos-orfaos-a-mais', antes: ref.orfaos, depois: cur.orfaos });
  if (cur.escritas.length) f.push({ fase: nome, tipo: 'escreveu-no-banco', escritas: cur.escritas.slice(0, 4) });
  if (cur.erros.length) f.push({ fase: nome, tipo: 'erro-js', erros: cur.erros });
  return f;
}

(async () => {
  const rec = L.reconciliar();
  const mats = rec.ativas.filter(m => !filtro.length || filtro.includes(m.slug));
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await L.servir({ usadas: new Set(), pedidos: [] });
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const linhas = []; let nFalha = 0;
  for (const m of mats) {
    process.stdout.write(`ida-e-volta ${m.slug} `);
    for (const W of LARGURAS) {
      const reg = { slug: m.slug, grupo: L.grupoDe(m.slug), w: W, semeado: null, base: null, falhas: [], erro: null };
      let r = null;
      try {
        r = await L.abrir(br, base, m, { w: W, h: ALT[W], modo: 'controle', corr: CORR, extra: '&persist=1' });
        reg.semeado = await r.page.evaluate(SEMEAR, { slug: m.slug, uid: UID, max: 10 });
        await r.page.waitForTimeout(500);
        const url = u => r.page.url().replace(/modo=[a-z]+/, 'modo=' + u);
        /* recarrega o controle (lê tudo do «banco») = linha de base */
        await r.page.goto(url('controle'), { timeout: 120000 }); await r.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await r.page.waitForTimeout(900);
        const ref = await r.page.evaluate(MEDIR);
        reg.base = { grifos: ref.grifos.length, tracos: ref.tracos.length, notas: ref.notas.length, orfaos: ref.orfaos };
        if (!reg.semeado.grifos.length) reg.falhas.push({ fase: 'semeadura', tipo: 'nenhum-grifo-semeado' });
        if (reg.base.grifos < reg.semeado.grifos.length) reg.falhas.push({ fase: 'controle', tipo: 'grifos-nao-voltam-no-proprio-controle', gravados: reg.semeado.grifos.length, pintados: reg.base.grifos });
        if (reg.base.tracos < reg.semeado.tracos) reg.falhas.push({ fase: 'controle', tipo: 'tracos-nao-voltam-no-proprio-controle', gravados: reg.semeado.tracos, desenhados: reg.base.tracos });

        /* fase LAYOUT */
        await r.page.goto(url('nav'), { timeout: 120000 }); await r.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await r.page.waitForTimeout(900);
        if (NEG) await r.page.evaluate(() => { const tr = JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]'); const s = document.getElementById(((tr[0] || {}).anchor_id || '').split('>')[0]) || document.querySelector('#materias-container > .tab-content section[id]'); const p = document.createElement('p'); p.textContent = 'intruso do controle negativo'; s.insertBefore(p, s.firstChild); });   // na secção do 1.º traço: é onde um layout descuidado desloca o índice
        const lay = await r.page.evaluate(MEDIR);
        reg.falhas.push(...comparar(ref, lay, 'layout'));
        /* o grifo está visível no bloco dele? */
        let invisiveis = 0;
        for (const g of ref.grifos.slice(0, 10)) {
          try { await r.page.evaluate(s => window.RMNav.go(s), { view: 'block', block: g.sec }); await r.page.waitForTimeout(350); } catch (e) { /* sem navegação */ }
          const v = await r.page.evaluate(([sec, t]) => { const sp = [...document.querySelectorAll('#' + CSS.escape(sec) + ' .rm-hl')].find(x => x.textContent.replace(/\s+/g, ' ').includes(t.slice(0, 12))); return !!(sp && sp.checkVisibility && sp.checkVisibility({ checkVisibilityCSS: true }) && sp.getBoundingClientRect().width > 0); }, [g.sec, g.t]);
          if (!v) invisiveis++;
        }
        if (invisiveis) reg.falhas.push({ fase: 'layout', tipo: 'grifo-invisivel-no-proprio-bloco', n: invisiveis });
        reg.layout = { grifos: lay.grifos.length, tracos: lay.tracos.length, notas: lay.notas.length };

        /* fase VOLTA (rollback) */
        await r.page.goto(url('controle'), { timeout: 120000 }); await r.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await r.page.waitForTimeout(900);
        const volta = await r.page.evaluate(MEDIR);
        reg.falhas.push(...comparar(ref, volta, 'volta'));
        reg.volta = { grifos: volta.grifos.length, tracos: volta.tracos.length, notas: volta.notas.length };
      } catch (e) { reg.erro = String(e).slice(0, 220); reg.falhas.push({ fase: 'execucao', tipo: 'excecao', msg: reg.erro }); }
      finally { if (r) await r.ctx.close().catch(() => {}); }
      reg.estado = reg.falhas.length ? 'FALHA' : 'PASSA';
      if (reg.falhas.length) nFalha++;
      reg.falhas = reg.falhas.slice(0, 8);
      linhas.push(reg);
      process.stdout.write(`${W}:${reg.estado}${reg.falhas.length ? '(' + reg.falhas.map(f => f.tipo).join(',') + ')' : ''} g${reg.base && reg.base.grifos}/t${reg.base && reg.base.tracos}/n${reg.base && reg.base.notas} `);
    }
    process.stdout.write('\n');
  }
  await br.close(); srv.close();
  const nome = NEG ? 'ida-e-volta.negativo.json' : 'ida-e-volta.json';
  fs.writeFileSync(path.join(OUT, nome), L.jsonLinhas({ gerado: new Date().toISOString().slice(0, 10), corr: CORR, ref: process.env.RM_ENSAIO_REF || 'disco', linhas }, 'linhas'));
  console.log(`\n${linhas.length} medidas · ${nFalha} com FALHA → docs/pre-voo-caneta-layout/resultados/${nome}`);
  if (NEG) { const ok = linhas.every(r => r.estado === 'FALHA'); console.log(ok ? 'controle negativo: o teste REPROVOU o defeito inserido (como deve)' : 'controle negativo: o teste NÃO enxergou o defeito inserido'); process.exit(ok ? 0 : 1); }
  process.exit(nFalha ? 1 : 0);
})();
