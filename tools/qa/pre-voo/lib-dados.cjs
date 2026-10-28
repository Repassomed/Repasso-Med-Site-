/* PRÉ-VOO · biblioteca compartilhada: semear, medir e comparar os DADOS DO ALUNO (grifos, traços, notas) de uma matéria aberta no harness do ensaio.
   Usada por ida-e-volta.cjs e pelos testes de A5/A7/C8/C9. Ficheiro idêntico em todas as PRs do pré-voo (merge limpo). Somente leitura do site: o «banco» é o sessionStorage
   do próprio teste (?persist=1 no harness); nada sai da máquina.
   SEMEAR (roda no CONTROLE, com o motor real) · MEDIR (qualquer fase; devolve grifos/traços/notas/escritas/erros) · comparar(ref, cur, fase) ⇒ lista de diferenças. */
'use strict';
const UID = 'd4d215d3-36dd-4efb-8869-bdea5376c648';   // UID de tester que o harness usa para o motor da caneta montar (constante pública do código; sessão 100% simulada)

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
    else if ((ta[id].fx === null) !== (tb[id].fx === null)) f.push({ fase: nome, tipo: 'traco-sem-caixa-medivel', id, antes: [ta[id].fx, ta[id].fy], depois: [tb[id].fx, tb[id].fy] });
    else if (Math.abs(ta[id].fx - tb[id].fx) > 0.02 || Math.abs(ta[id].fy - tb[id].fy) > 0.02) f.push({ fase: nome, tipo: 'traco-deslocado', id, antes: [ta[id].fx, ta[id].fy], depois: [tb[id].fx, tb[id].fy] });
  });
  Object.keys(tb).forEach(id => { if (!ta[id]) f.push({ fase: nome, tipo: 'traco-novo', id }); });
  if (JSON.stringify(ref.notas) !== JSON.stringify(cur.notas)) f.push({ fase: nome, tipo: 'notas-diferentes', antes: ref.notas, depois: cur.notas });
  if (cur.orfaos > ref.orfaos) f.push({ fase: nome, tipo: 'tracos-orfaos-a-mais', antes: ref.orfaos, depois: cur.orfaos });
  if (cur.escritas.length) f.push({ fase: nome, tipo: 'escreveu-no-banco', escritas: cur.escritas.slice(0, 4) });
  if (cur.erros.length) f.push({ fase: nome, tipo: 'erro-js', erros: cur.erros });
  return f;
}


module.exports = { UID, SEMEAR, MEDIR, comparar };
