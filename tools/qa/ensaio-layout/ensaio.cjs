/* CHECKPOINT B — ENSAIO VISUAL ISOLADO do novo layout em cada matéria ativa (issue #457).
   Para cada matéria: abre a matéria REAL (harness: index.html real + app-core real + HTML real), ativa o Layout V2 + tema + navegação POR ATIVADOR LOCAL
   (nunca pelo rm-pilot; flags, UID e slug do piloto intactos) e roda a bateria abaixo em 390 · 768 · 1024 · 1440.
   Nada é simulado em áudio: sem manifesto autorizado o ensaio só prova que NADA de audiolibro aparece.
   Saída: docs/layout-ensaio/resultados/<slug>.json  (cada verificação: área, largura, estado PASSA/FALHA/BLOQUEADO, mensagem e dados).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/ensaio.cjs [slug ...] [--rapido]    (--rapido: só 1440 e 390, menos blocos) */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const args0 = process.argv.slice(2);
const OUT = path.join(L.REPO, 'docs/layout-ensaio/' + (args0.includes('--corr') ? 'resultados-corr' : 'resultados'));
const SHOTS = process.env.RM_EVID_DIR ? path.resolve(process.env.RM_EVID_DIR) : null;
const args = process.argv.slice(2), RAPIDO = args.includes('--rapido'), CORR = args.includes('--corr'), filtro = args.filter(a => !a.startsWith('--'));
const LARGURAS = RAPIDO ? [1440, 390] : [390, 768, 1024, 1440];
const ALT = { 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const inv = JSON.parse(fs.readFileSync(path.join(L.REPO, 'docs/layout-ensaio/inventario.json'), 'utf8'));
const INV = Object.fromEntries(inv.materias.map(m => [m.slug, m]));

/* ---------------- medidas no navegador ---------------- */
const INFO = () => {
  const H = document.documentElement, tab = document.querySelector('#materias-container > .tab-content');
  const vis = e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0; };
  const secs = [...tab.querySelectorAll(':scope > section[id]')].filter(vis).map(s => s.id);
  const a = document.activeElement;
  const ehInfo = f => !!(f.querySelector('figcaption') && f.querySelector('img, .s2-photo[role="img"], img.rmc-photo') && !f.closest('.material-slide, .med-image'));   // a MESMA definição do módulo
  const sel = { figuras: 'figure', pregs: '.quiz-item', fc: '.rmfc-launch', ab: '.rm-audio-card', aus: '.audio-player', tablas: 'table' };
  const cont = {}; Object.keys(sel).forEach(k => { cont[k] = [...tab.querySelectorAll(sel[k])].filter(e => (k === 'ab' || k === 'fc' || !e.closest('[data-rm-ui]')) && !(k === 'tablas' && e.closest('.quiz-item, .flashcard')) && (k !== 'figuras' || ehInfo(e)) && vis(e)).length; });
  const cards = [...document.querySelectorAll('.rm-nav-modeidx .rm-sis-card, .rm-sis-idx .rm-sis-card')].filter(vis).map(c => ({ go: c.getAttribute('data-go') || null, rm: c.dataset.rmGo || null, t: c.textContent.replace(/\s+/g, ' ').trim() }));
  cont.figFora = [...tab.querySelectorAll('figure')].filter(e => !e.closest('[data-rm-ui],.quiz-item,.flashcard') && ehInfo(e) && vis(e)).length;
  return {
    nav: H.getAttribute('data-rm-nav'), mode: H.getAttribute('data-rm-nav-mode'), hash: location.hash, secs, cont, cards,
    st: window.RMNav && window.RMNav.ativo() ? window.RMNav.estado() : null,
    pager: [...document.querySelectorAll('.rm-nav-pager a')].map(x => ({ t: x.textContent.replace(/\s+/g, ' ').trim(), hid: x.hidden || !vis(x) })),
    chips: [...document.querySelectorAll('.rm-nav-chipf')].map(c => c.textContent.replace(/\s+/g, ' ').trim()),
    foco: a && a !== document.body ? { tag: a.tagName, oculto: !!a.closest('[data-rm-off]') || (a.offsetParent === null && getComputedStyle(a).position !== 'fixed') } : null,
    residuo: [...tab.children].filter(e => !e.hasAttribute('data-rm-ui') && !/^(STYLE|SCRIPT|LINK|FOOTER)$/.test(e.tagName) && !(e.tagName === 'SECTION' && e.id) && vis(e) && e.getBoundingClientRect().height > 40).map(e => e.tagName + '.' + String(e.className).slice(0, 30) + '#' + e.id + ' h=' + Math.round(e.getBoundingClientRect().height)),
    sw: H.scrollWidth, vw: H.clientWidth, sy: Math.round(scrollY), sh: H.scrollHeight
  };
};
/* elementos visíveis que passam da viewport e NÃO estão dentro de um contêiner com rolagem própria */
const EXTRAPOLA = () => {
  const vw = document.documentElement.clientWidth, out = [];
  const rolavel = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; };
  document.querySelectorAll('#materias-container *').forEach(e => {
    if (out.length >= 5) return; const r = e.getBoundingClientRect(); if (r.width < 2 || r.right <= vw + 2) return;
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
    if (rolavel(e)) return; out.push((e.tagName + '.' + String(e.className).slice(0, 40) + '#' + e.id).slice(0, 80) + ' r=' + Math.round(r.right) + '/' + vw);
  });
  return out;
};
const MODOS = {
  infografias: { k: 'fig', prop: 'figuras', re: /infograf/ },
  preguntas: { k: 'quiz', prop: 'pregs', re: /pregunta/ },
  flashcards: { k: 'fc', prop: 'fc', re: /tarjeta/ },
  auscultacion: { k: 'aud', prop: 'aus', re: /sonido/ },
  audiobooks: { k: 'ab', prop: 'ab', re: /audiolibro/ }
};
const REUNE = /banco|flashcards/i;   // a MESMA heurística do rm-materia-nav.js (linha 90): ids que contêm «banco» ou «flashcards» ficam fora das contagens

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const rec = L.reconciliar();
  const lista = rec.ativas.filter(m => !filtro.length || filtro.includes(m.slug));
  const usadas = new Set(), srv = await L.servir({ usadas }); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  for (const m of lista) {
    const t0 = Date.now(); const I = INV[m.slug]; const R = { variante: CORR ? 'com-correcao' : 'como-esta', slug: m.slug, title: m.title, tab: m.tab, larguras: LARGURAS, checks: [], notas: [], gerado_em: new Date().toISOString() };
    const chk = (area, w, id, cond, msg, dados) => { const e = { area, w, id, estado: cond ? 'PASSA' : 'FALHA', msg }; if (!cond && dados !== undefined) e.dados = dados; R.checks.push(e); return !!cond; };
    const bloq = (area, w, id, msg) => R.checks.push({ area, w, id, estado: 'BLOQUEADO', msg });
    const info = p => p.evaluate(INFO);
    const go = async (p, spec, ms = 600) => { await p.evaluate(s => window.RMNav.go(s), spec); await p.waitForTimeout(ms); };
    process.stdout.write(`ensaio ${m.slug} `);
    /* oráculo por seção: o inventário (controle) */
    const secs = I.secoes, ids = secs.map(s => s.id);
    const ehAgreg = id => REUNE.test(id) || [...I.unicos.copiasQuiz, ...I.unicos.copiasFc].some(c => c.id === id && c.itens >= 0.5 * Math.max(I.unicos.quiz, I.unicos.fc));
    const agregInv = new Set([...I.unicos.copiasQuiz, ...I.unicos.copiasFc].filter(c => c.itens >= 0.5 * Math.min(I.unicos.quiz || 1e9, I.unicos.fc || 1e9) && /./.test(c.id)).map(c => c.id));
    const temRec = { fig: s => s.fig, quiz: s => s.quiz, fc: s => s.fc, aud: s => s.aud, ab: () => 0 };
    const esperados = {};
    Object.entries(MODOS).forEach(([modo, d]) => { esperados[modo] = secs.filter(s => temRec[d.k](s) > 0 && !REUNE.test(s.id) && !agregInv.has(s.id)).map(s => s.id); });

    /* ---------- controle (uma vez, 1440): IDs e nós originais ---------- */
    let ctl;
    { const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'controle', espera: 600 });
      ctl = await r.page.evaluate(() => { const t = document.querySelector('#materias-container > .tab-content'); const ids = [...t.querySelectorAll('[id]')].filter(e => !e.closest('[data-rm-ui]') && !/^rm/.test(e.id)).map(e => e.id).sort();
        return { ids: ids.join(','), nIds: ids.length, quiz: t.querySelectorAll('.quiz-item').length, fc: t.querySelectorAll('.flashcard').length, tab: t.querySelectorAll('table').length, aud: t.querySelectorAll('audio').length, secs: t.querySelectorAll(':scope > section[id]').length, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }; });
      await r.ctx.close(); }

    for (const W of LARGURAS) {
      let r = null;
      try {
      r = await L.abrir(br, base, m, { w: W, h: ALT[W], modo: 'nav', corr: CORR });
      const p = r.page; const E = await p.evaluate(() => window.__ens);
      const nBlocos = secs.length;
      /* ---------- BOOT ---------- */
      chk('boot', W, 'etapas', E.etapas.attach_layout && E.etapas.attach_tema && E.etapas.attach_nav, 'Layout V2 + tema + navegação ativaram', E);
      chk('boot', W, 'erros-js', r.errs.length === 0 && E.erros.length === 0, '0 erros de JavaScript', { errs: r.errs, ens: E.erros });
      const esc0 = await p.evaluate(() => (window.__writes || []).slice());
      chk('boot', W, 'zero-escritas', esc0.length === 0, 'zero escritas no Supabase na abertura', esc0);
      const ext = r.externas.filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u)); if (r.externas.length !== ext.length && !R.notas.includes('fonte-externa')) R.notas.push('fonte-externa');
      chk('boot', W, 'zero-rede-externa', ext.length === 0, 'nenhuma requisição externa (a fonte Literata do tema, Google Fonts, é a mesma do piloto e fica registrada à parte)', ext);

      /* ---------- ÍNDICE ---------- */
      let i = await info(p);
      chk('indice', W, 'estado-inicial', i.nav === 'index' && i.st && i.st.view === 'index' && i.hash === '', 'abre no índice geral, URL limpa', { nav: i.nav, st: i.st, hash: i.hash });
      chk('indice', W, 'sem-bloco-abaixo', i.secs.length === 0, 'nenhum bloco aparece abaixo do índice', i.secs);
      const alvosCards = i.cards.map(c => c.rm).filter(Boolean);
      const semCard = ids.filter(id => !alvosCards.includes(id));
      chk('indice', W, 'toda-secao-tem-card', semCard.length === 0, 'toda seção do conteúdo tem card no índice (nenhuma fica inalcançável)', { semCard });
      const cardsFora = alvosCards.filter(id => !ids.includes(id));
      chk('indice', W, 'card-sem-secao', cardsFora.length === 0, 'nenhum card aponta para seção inexistente', cardsFora);
      const geo = await p.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0; };
        const cards = [...document.querySelectorAll('.rm-sis-card')], last = cards[cards.length - 1], gr = last && last.getBoundingClientRect();
        return { grid: !!document.querySelector('.rm-sis-idx') && vis(document.querySelector('.rm-sis-idx')), fim: gr ? Math.round(gr.bottom + scrollY) : 0, sh: document.documentElement.scrollHeight,
          cover: [...document.querySelectorAll('.rm-l2-rescard')].filter(vis).map(c => ({ k: (/rm-l2-rescard--(\w+)/.exec(c.className) || [])[1], n: c.dataset.rmN === undefined ? null : +c.dataset.rmN })),
          unid: [...document.querySelectorAll('.rm-sis-idx [class*=ulab], .rm-sis-idx .rm-sis-un')].length };
      });
      chk('indice', W, 'sem-residuo', i.residuo.length === 0, 'nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral', i.residuo);
      chk('indice', W, 'indice-e-o-fim', geo.grid && geo.sh - geo.fim < Math.max(520, ALT[W] * 0.7), `o índice geral é o fim da página (sobram ${geo.sh - geo.fim}px)`, geo);
      /* capa: totais = itens DISTINTOS (nunca somar a cópia da revisão/banco) */
      const cv = Object.fromEntries(geo.cover.map(c => [c.k, c.n]));
      const distFig = secs.filter(x => !REUNE.test(x.id) && !agregInv.has(x.id)).reduce((a, x) => a + x.fig, 0),  qMin = I.unicos.quiz, qMax = I.unicos.quizComOpc, fMin = I.unicos.fc;
      if (cv.fig != null) chk('contagens', W, 'capa-infografias', cv.fig === distFig, `capa «Infografías» = ${distFig} figuras com legenda fora das agregadoras (capa mostra ${cv.fig})`, { capa: cv.fig, esperado: distFig });
      if (cv.quiz != null) {
        const agQ = I.unicos.copiasQuiz.filter(c => c.itens >= 0.5 * qMin).map(c => c.id);
        chk('contagens', W, 'capa-preguntas', cv.quiz <= Math.max(qMax, qMin) * 1.02 + 1, `capa «Preguntas» não soma cópias: distintas ${qMin}–${qMax}; capa mostra ${cv.quiz}; DOM tem ${I.questoes.total}`, { capa: cv.quiz, distintas: [qMin, qMax], dom: I.questoes.total, agregadoras: agQ });
        chk('contagens', W, 'capa-preguntas-omitidas', cv.quiz >= qMin * 0.99 - 1, `capa «Preguntas» não omite questões que o aluno encontra só no banco: distintas ${qMin}; capa mostra ${cv.quiz}`, { capa: cv.quiz, distintas: qMin, soNaAgregadora: qMin - cv.quiz });
      }
      if (cv.fc != null) {
        const agF = I.unicos.copiasFc.filter(c => c.itens >= 0.5 * fMin).map(c => c.id);
        chk('contagens', W, 'capa-flashcards', cv.fc <= fMin * 1.02 + 2, `capa «Flashcards» não soma cópias: distintos ${fMin}; capa mostra ${cv.fc}; DOM tem ${I.flashcards.total}`, { capa: cv.fc, distintos: fMin, dom: I.flashcards.total, agregadoras: agF });
        chk('contagens', W, 'capa-flashcards-omitidos', cv.fc >= fMin * 0.99 - 1, `capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos ${fMin}; capa mostra ${cv.fc}`, { capa: cv.fc, distintos: fMin, soNaAgregadora: fMin - cv.fc });
      }
      /* recurso ausente = sem cartão na capa */
      chk('ausentes', W, 'capa-sem-recurso-ausente', ((I.figuras > 0) === (cv.fig != null)) && ((I.questoes.total > 0) === (cv.quiz != null)) && ((I.flashcards.total > 0) === (cv.fc != null)) && ((I.ausculta.audios > 0) === (cv.aud != null)), 'a capa mostra cartão só dos recursos que existem (figuras/preguntas/flashcards/ausculta)', { cover: geo.cover, inv: { fig: I.figuras, q: I.questoes.total, fc: I.flashcards.total, aud: I.ausculta.audios } });
      /* contagens de cada card do índice = DOM da seção */
      const cnt = await p.evaluate(() => [...document.querySelectorAll('.rm-sis-card[data-rm-go]')].map(c => { const id = c.dataset.rmGo, s = document.getElementById(id), txt = c.textContent.replace(/\s+/g, ' ');
        const num = re => { const x = re.exec(txt); return x ? +x[1] : 0; }; const exc = e => !e.closest('[data-rm-ui],.material-slide,.med-image');
        return { id, p: num(/(\d+) preguntas?/), pd: s.querySelectorAll('.quiz-item').length, t: num(/(\d+) tarjetas?/), td: s.querySelectorAll('.flashcard').length, f: num(/(\d+) infografías?/), fd: [...s.querySelectorAll('figure')].filter(f => f.querySelector('figcaption') && f.querySelector('img, .s2-photo[role="img"], img.rmc-photo') && exc(f)).length, a: num(/(\d+) sonidos?/), ad: s.querySelectorAll('audio').length }; }));
      const dif = cnt.filter(c => c.p !== c.pd || c.t !== c.td || c.f !== c.fd || c.a !== c.ad);
      chk('contagens', W, 'cards-igual-DOM', dif.length === 0, 'contagens de cada card = contagem do DOM da seção', dif.slice(0, 5));
      chk('indice', W, 'sem-overflow', i.sw <= i.vw + 1, `sem rolagem horizontal no índice (${i.sw}/${i.vw})`, { sw: i.sw, vw: i.vw, extrapola: await p.evaluate(EXTRAPOLA) });
      if (SHOTS && (W === 390 || W === 1440)) await p.screenshot({ path: path.join(SHOTS, `${m.slug}-${W}-indice.png`) });

      /* ---------- LATERAL / MODOS PRESENTES-AUSENTES ---------- */
      const lat = await p.evaluate(() => [...document.querySelectorAll('#rm-l2-side .rm-l2-item')].map(x => (x.dataset.view || '') + '|' + x.textContent.replace(/\s+/g, ' ').trim()));
      const modosLat = lat.map(x => x.split('|')[0]).filter(v => MODOS[v]);
      for (const modo of Object.keys(MODOS)) {
        const deve = esperados[modo].length > 0;
        chk('ausentes', W, `lateral-${modo}`, modo === 'audiobooks' ? !modosLat.includes(modo) : (modosLat.includes(modo) === deve), modo === 'audiobooks' ? 'sem manifesto: «Audiolibros» NÃO aparece na lateral' : `lateral: modo «${modo}» ${deve ? 'presente' : 'ausente'} conforme o conteúdo (${esperados[modo].length} blocos)`, { modosLat, esperados: esperados[modo].length });
      }
      /* ---------- ÁUDIO: nada aparece sem manifesto ---------- */
      const aud = await p.evaluate(() => ({ cards: document.querySelectorAll('.rm-audio-card').length, player: (() => { const e = document.getElementById('rm-l2-player'); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.height > 0; })(), chip: document.querySelectorAll('.t-ab').length, capa: document.querySelectorAll('.rm-l2-rescard--ab').length, pill: document.querySelectorAll('[data-rm-k="ab"]').length, txt: /audiolibro/i.test(document.getElementById('rm-l2-side') ? document.getElementById('rm-l2-side').textContent : '') }));
      chk('audio', W, 'sem-manifesto-sem-audiolibro', !aud.cards && !aud.player && !aud.chip && !aud.capa && !aud.pill && !aud.txt, 'sem manifesto autorizado nada de audiolibro aparece (card, player, chip, capa, pílula, lateral)', aud);
      const reqAud = await p.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /get-audio-manifest|audiobooks|storage\/v1/.test(n)));
      chk('audio', W, 'sem-requisicao-audio', reqAud.length === 0, 'nenhuma requisição de manifesto/áudio', reqAud);

      /* ---------- BLOCOS ---------- */
      const alvos = ids.slice();   // todas as seções
      const amostra = (W === 1440 && !RAPIDO) ? alvos : [alvos[0], alvos[Math.floor(alvos.length / 2)], alvos[alvos.length - 1], ...secs.filter(s => s.tb >= 3).slice(0, 1).map(s => s.id)].filter((x, k, a) => x && a.indexOf(x) === k);
      let residuoBloco = [], falhaBloco = [], semFoco = [], pagerErr = [], vazios = [], ovfBloco = [];
      for (const id of amostra) {
        await go(p, { view: 'block', block: id }, 420); const b = await info(p);
        const k = ids.indexOf(id);
        const okSec = b.secs.length === 1 && b.secs[0] === id && b.hash === '#' + id && b.nav === 'block';
        if (!okSec) falhaBloco.push({ id, secs: b.secs, hash: b.hash, nav: b.nav });
        if (b.foco && b.foco.oculto) semFoco.push(id);
        if (b.residuo.length && !residuoBloco.length) residuoBloco = b.residuo;
        const prevHid = b.pager[0] ? b.pager[0].hid : null, nextHid = b.pager[2] ? b.pager[2].hid : null;
        const tit = j => !!(secs[j] && secs[j].h2);
        const pr = (k > 0 && tit(k - 1)) === (prevHid === false), nx = (k < ids.length - 1 && tit(k + 1)) === (nextHid === false);
        if (b.pager.length !== 3 || !pr || !nx) pagerErr.push({ id, k, pager: b.pager });
        const alt = await p.evaluate(i2 => { const s = document.getElementById(i2); const r = s.getBoundingClientRect(); return Math.round(r.height); }, id);
        if (!(alt > 40)) vazios.push({ id, alt });
        if (b.sw > b.vw + 1) ovfBloco.push({ id, sw: b.sw, vw: b.vw, ext: await p.evaluate(EXTRAPOLA) });
      }
      chk('blocos', W, 'abre-so-o-bloco', falhaBloco.length === 0, `${amostra.length} bloco(s) testados: cada um abre SÓ ele (visível, hash, estado)`, falhaBloco.slice(0, 6));
      chk('blocos', W, 'pager', pagerErr.length === 0, 'Anterior/Índice/Próximo corretos (sem anterior no 1.º, sem próximo no último)', pagerErr.slice(0, 4));
      const interioresSemTitulo = secs.map((x, j) => ({ id: x.id, j })).filter(x => x.j > 0 && x.j < secs.length - 1 && !secs[x.j].h2).map(x => x.id);
      chk('blocos', W, 'pager-cadeia', interioresSemTitulo.length === 0, 'nenhuma seção interior sem <h2>: ela quebra a cadeia Anterior/Próximo (o módulo esconde o link do vizinho sem título e o aluno fica sem saída)', interioresSemTitulo);
      chk('blocos', W, 'foco-visivel', semFoco.length === 0, 'foco nunca fica em conteúdo oculto', semFoco);
      chk('blocos', W, 'sem-residuo-bloco', residuoBloco.length === 0, 'na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele', residuoBloco.slice(0, 3));
      chk('blocos', W, 'nao-vazio', vazios.length === 0, 'nenhum bloco abre vazio', vazios);
      chk('responsivo', W, 'blocos-sem-overflow', ovfBloco.length === 0, `blocos sem rolagem horizontal (${amostra.length} testados)`, ovfBloco.slice(0, 4));
      /* sequência Próximo/Anterior/Índice com cliques reais */
      const mid = Math.max(1, Math.min(ids.length - 2, Math.floor(ids.length / 2)));
      if (ids.length >= 3) {
        const a = ids[mid];
        await go(p, { view: 'block', block: a }, 500);
        const vis2 = await p.evaluate(() => ['.rm-nav-prev', '.rm-nav-next', '.rm-nav-idx'].map(sel => { const e = document.querySelector(sel); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }));
        if (!vis2.every(Boolean)) chk('teclado', W, 'proximo-anterior-indice', false, `no meio do conteúdo (${a}) Anterior/Índice/Próximo precisam estar visíveis`, { visiveis: vis2, vizinhos: [ids[mid - 1], ids[mid + 1]], titulosVazios: secs.filter(x => [ids[mid - 1], ids[mid + 1]].includes(x.id) && !x.h2).map(x => x.id) });
        else {
          await p.click('.rm-nav-next'); await p.waitForTimeout(700); let x = await info(p);
          const okN = x.secs.join() === ids[mid + 1]; await p.click('.rm-nav-prev'); await p.waitForTimeout(700); let y = await info(p);
          const okP = y.secs.join() === a; await p.click('.rm-nav-idx'); await p.waitForTimeout(700); let z = await info(p);
          chk('teclado', W, 'proximo-anterior-indice', okN && okP && z.nav === 'index' && z.secs.length === 0 && z.sy < 60, 'cliques reais: Próximo → Anterior → Índice (volta ao topo do índice)', { okN, okP, nav: z.nav, sy: z.sy });
        }
      }
      /* Back/Forward e hash */
      await go(p, { view: 'index' }, 400); await go(p, { view: 'block', block: ids[mid] }, 500); await go(p, { view: 'block', block: ids[mid + 1] || ids[mid] }, 500);
      await p.goBack(); await p.waitForTimeout(800); i = await info(p);
      const backOk = i.secs.join() === ids[mid] && i.hash === '#' + ids[mid]; await p.goBack(); await p.waitForTimeout(800); const i2 = await info(p);
      chk('teclado', W, 'back-forward', backOk && i2.nav === 'index' && i2.secs.length === 0, 'Back volta ao bloco anterior e depois ao índice geral', { backOk, nav: i2.nav, secs: i2.secs });
      await p.evaluate(h => { location.hash = h; }, '#' + ids[ids.length > 3 ? 3 : 1]); await p.waitForTimeout(900); i = await info(p);
      chk('teclado', W, 'hash-direto', i.secs.join() === ids[ids.length > 3 ? 3 : 1], 'trocar o hash (link direto) abre o bloco certo', { secs: i.secs, hash: i.hash });
      /* teclado: Enter em «Próximo» e em «Índice general» (lateral) */
      await go(p, { view: 'block', block: ids[mid] }, 500);
      const nextVis = await p.evaluate(() => { const e = document.querySelector('.rm-nav-next'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0; });
      if (nextVis) { await p.focus('.rm-nav-next'); await p.keyboard.press('Enter'); await p.waitForTimeout(800); }
      i = await info(p);
      chk('teclado', W, 'enter-proximo', nextVis && i.secs.join() === ids[mid + 1] && !(i.foco && i.foco.oculto), 'teclado: Enter em «Bloque siguiente» avança e o foco segue visível', { secs: i.secs, foco: i.foco });
      const ocul = await p.evaluate(id => { const s = document.getElementById(id); const f = [...s.querySelectorAll('a[href],button,input,summary,[tabindex]')]; return { display: getComputedStyle(s).display, alc: f.filter(e => e.offsetParent !== null).length }; }, ids[mid]);
      chk('teclado', W, 'oculto-nao-focavel', ocul.display === 'none' && ocul.alc === 0, 'bloco oculto = display:none, sem focáveis alcançáveis', ocul);
      /* scroll */
      await go(p, { view: 'index' }, 400); await p.evaluate(() => window.scrollTo(0, 300)); await p.waitForTimeout(200);
      await p.evaluate(id => { const c = document.querySelector(`.rm-sis-card[data-rm-go="${id}"]`); c && c.click(); }, ids[Math.min(2, ids.length - 1)]); await p.waitForTimeout(1300);
      const sc = await p.evaluate(id => ({ top: Math.round(document.getElementById(id).getBoundingClientRect().top), sy: Math.round(scrollY), ids: window.history.scrollRestoration }), ids[Math.min(2, ids.length - 1)]);
      chk('scroll', W, 'bloco-abre-no-topo', sc.top >= -4 && sc.top < Math.max(300, ALT[W] * 0.45), `o bloco abre no topo da leitura, não no meio da rolagem do índice (top=${sc.top}px)`, sc);
      chk('scroll', W, 'restauracao-manual', sc.ids === 'manual', 'restauração de rolagem do navegador em modo manual', sc);

      /* ---------- MODOS (índice do modo + páginas modo/bloco) ---------- */
      for (const [modo, d] of Object.entries(MODOS)) {
        if (modo === 'audiobooks') continue;
        const exp = esperados[modo];
        if (!exp.length) {   // recurso ausente: sem acesso, sem página vazia
          await go(p, { view: 'modeidx', mode: modo }, 500); const q = await info(p);
          chk('ausentes', W, `sem-pagina-vazia-${modo}`, q.nav === 'index' || (q.cards.length === 0 && q.nav !== 'modeidx'), `recurso ausente («${modo}»): ir ao modo não abre página vazia`, { nav: q.nav, mode: q.mode, cards: q.cards.length });
          continue;
        }
        await go(p, { view: 'modeidx', mode: modo }, 600); const q = await info(p);
        const listados = q.cards.map(c => c.rm || (c.go && (() => { try { return JSON.parse(c.go).block; } catch (e) { return null; } })())).filter(Boolean);
        const gerais = listados.filter(id => !secs.find(s => s.id === id) || ehAgreg(id));
        const nosBlocos = listados.filter(id => !REUNE.test(id) && !agregInv.has(id));
        const faltam = exp.filter(id => !listados.includes(id)), sobram = listados.filter(id => !exp.includes(id) && !REUNE.test(id));
        chk('modos', W, `indice-${modo}`, q.nav === 'modeidx' && q.mode === modo && q.secs.length === 0 && faltam.length === 0 && sobram.length === 0, `«${modo}»: o índice lista exatamente os blocos que têm o recurso (${exp.length})`, { nav: q.nav, mode: q.mode, faltam, sobram, listados: listados.length });
        /* contagem de cada card do modo = recurso real da seção */
        const rexp = d.re; const secPor = Object.fromEntries(secs.map(s => [s.id, s]));
        const badCount = q.cards.filter(c => { const id = c.rm || null; if (!id || !secPor[id]) return false; const mm = new RegExp('(\\d+) ' + rexp.source.replace('/', ''), 'i').exec(c.t); const real = temRec[d.k](secPor[id]); return !(mm && +mm[1] === real); }).map(c => ({ id: c.rm, t: c.t.slice(0, 60), real: temRec[d.k](secPor[c.rm]) }));
        chk('contagens', W, `cards-${modo}`, badCount.length === 0, `«${modo}»: contagem de cada card = recurso real da seção`, badCount.slice(0, 4));
        const lim = (W === 1440 && !RAPIDO) ? exp.length : 2;
        let pg = [];
        for (const id of exp.slice(0, lim)) {
          await go(p, { view: 'modeblk', mode: modo, block: id }, 450); const v = await info(p);
          const real = temRec[d.k](secPor[id]);
          const OUTROS = { infografias: ['fc', 'ab', 'aus'], preguntas: ['figFora', 'fc', 'ab', 'aus'], flashcards: ['figFora', 'pregs', 'ab', 'aus'], auscultacion: ['figFora', 'pregs', 'fc', 'ab'] }[modo];
          const outros = OUTROS.filter(kk => v.cont[kk] > 0).map(kk => [kk, v.cont[kk]]);
          const mostra = d.k === 'fc' ? v.cont.fc > 0 : v.cont[d.prop] === real;
          if (!(v.secs.join() === id && mostra && real > 0 && outros.length === 0)) pg.push({ id, secs: v.secs, vis: v.cont, real, outros });
          if (v.sw > v.vw + 1) pg.push({ id, overflow: v.sw + '/' + v.vw });
        }
        chk('modos', W, `paginas-${modo}`, pg.length === 0, `«${modo}»: ${Math.min(lim, exp.length)} página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia`, pg.slice(0, 4));
      }
      /* Preguntas: chips de grupo só com metadado real; filtrar não perde o estado */
      if (esperados.preguntas.length) {
        const id = esperados.preguntas[0]; await go(p, { view: 'modeblk', mode: 'preguntas', block: id }, 600); const q = await info(p);
        const tags = await p.evaluate(i3 => { const t = [...document.getElementById(i3).querySelectorAll('.quiz-item .quiz-tag')].map(x => x.textContent.trim()); return { exam: t.filter(x => /examen/i.test(x)).length, comp: t.filter(x => /complement/i.test(x)).length, tot: document.getElementById(i3).querySelectorAll('.quiz-item').length }; }, id);
        const temGrupos = tags.exam > 0 && tags.comp > 0 && tags.exam + tags.comp === tags.tot;
        chk('modos', W, 'chips-grupo-reais', temGrupos ? q.chips.length === 3 : q.chips.length === 0, 'grupos de Preguntas só aparecem com metadado real completo (sem chips inventados)', { chips: q.chips, tags });
        if (temGrupos) {
          await p.evaluate(i3 => { const li = document.querySelector(`#${i3} .quiz-item li[data-option], #${i3} .quiz-item .tf-buttons button, #${i3} .quiz-item .options li`); li && li.click(); }, id); await p.waitForTimeout(1200);
          const e0 = await p.evaluate(i3 => { const q = document.querySelector(`#${i3} .quiz-item`); return q.className + '|' + [...q.querySelectorAll('li,button')].map(l => l.className).join('|'); }, id);
          await p.click('.rm-nav-chipf[data-f="exam"]'); await p.waitForTimeout(350); await p.click('.rm-nav-chipf[data-f="todas"]'); await p.waitForTimeout(350);
          const e1 = await p.evaluate(i3 => { const q = document.querySelector(`#${i3} .quiz-item`); return q.className + '|' + [...q.querySelectorAll('li,button')].map(l => l.className).join('|'); }, id);
          chk('modos', W, 'filtro-preserva-estado', e0 === e1, 'filtrar por grupo não perde o estado respondido da questão', { e0, e1 });
        }
      }
      /* cartões da capa abrem o índice do modo certo */
      for (const [cls, modo] of [['fig', 'infografias'], ['quiz', 'preguntas'], ['fc', 'flashcards'], ['aud', 'auscultacion']]) {
        if (!esperados[modo].length) continue;
        await go(p, { view: 'index' }, 350);
        const tem = await p.evaluate(c => !!document.querySelector('.rm-l2-rescard--' + c), cls);
        if (!tem) { chk('modos', W, `capa-abre-${modo}`, false, `cartão «${cls}» da capa existe quando o modo existe`, { modo }); continue; }
        await p.evaluate(c => document.querySelector('.rm-l2-rescard--' + c).click(), cls); await p.waitForTimeout(650); const q = await info(p);
        chk('modos', W, `capa-abre-${modo}`, q.nav === 'modeidx' && q.mode === modo, `cartão da capa «${cls}» abre o índice do modo ${modo}`, { nav: q.nav, mode: q.mode });
      }

      /* ---------- CANETA / ANOTAÇÕES (1440 e 390) ---------- */
      if (W === 1440 || W === 390) {
        const alvoBloco = secs.find(s => s.ancoras > 12 && !REUNE.test(s.id) && s.quiz < s.ancoras) || secs[1];
        await go(p, { view: 'block', block: alvoBloco.id }, 1200);
        const w1 = await p.evaluate(async (bid) => {
          const esp = ms => new Promise(o => setTimeout(o, ms)); const r = {};
          const alvo = [...document.getElementById(bid).querySelectorAll('p')].filter(x => !x.closest('[data-rm-ui],.quiz-item,.flashcard,table') && x.textContent.length > 120)[0];
          if (!alvo) return { semAlvo: true };
          window.RMLayout.irPara(alvo); await esp(1300);
          if (!window.RMToolsV2 || !window.RMToolsV2.escolherFerramenta) return { semFerramenta: true };
          window.RMToolsV2.escolherFerramenta('pen'); await esp(300); r.tool = window.RMToolsV2.estado && window.RMToolsV2.estado.tool;
          const b = alvo.getBoundingClientRect();
          const fire = (ty, x, y, bt) => alvo.dispatchEvent(new PointerEvent(ty, { pointerType: 'pen', pointerId: 9, isPrimary: true, clientX: x, clientY: y, buttons: bt, bubbles: true, cancelable: true, pressure: bt ? 0.5 : 0 }));
          fire('pointerover', b.left + 30, b.top + 14, 0); fire('pointerdown', b.left + 30, b.top + 14, 1);
          for (let k = 1; k <= 16; k++) { fire('pointermove', b.left + 30 + k * 7, b.top + 14 + (k % 4) * 3, 1); await esp(14); }
          fire('pointerup', b.left + 150, b.top + 20, 0); await esp(900);
          const sv = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')];
          r.n = sv.length; r.paths = sv.reduce((a, s) => a + s.querySelectorAll('path').length, 0); r.anchor = sv[0] && sv[0].getAttribute('data-anchor'); r.d = sv.map(s => [...s.querySelectorAll('path')].map(x => x.getAttribute('d')).join('|')).join('#');
          return r;
        }, alvoBloco.id);
        if (w1.semAlvo || w1.semFerramenta) bloq('caneta', W, 'traco', w1.semAlvo ? 'nenhum parágrafo longo no bloco para ancorar o traço' : 'RMToolsV2 sem ferramenta no harness');
        else {
          chk('caneta', W, 'traco-ancorado', w1.tool === 'pen' && w1.paths >= 1 && new RegExp('^' + alvoBloco.id + '>').test(w1.anchor || ''), `traço desenhado e ancorado em ${alvoBloco.id} (${w1.anchor})`, w1);
          const escA = await p.evaluate(() => (window.__writes || []).length);
          const vis = () => p.evaluate(() => [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].map(s => { const c = getComputedStyle(s), r = s.getBoundingClientRect(); return { a: s.getAttribute('data-anchor'), disp: c.display, w: Math.round(r.width) * Math.round(r.height) }; }));
          const outro = ids.find(x => x !== alvoBloco.id && !REUNE.test(x));
          let leaks = [];
          for (const spec of [{ view: 'block', block: outro }, { view: 'index' }, { view: 'modeidx', mode: 'preguntas' }, { view: 'modeblk', mode: 'preguntas', block: esperados.preguntas.find(x => x !== alvoBloco.id) || outro }]) {
            if (spec.mode === 'preguntas' && !esperados.preguntas.length) continue;
            await go(p, spec, 1100); const v = await vis(); leaks.push(...v.filter(s => s.disp !== 'none' || s.w > 0).map(s => ({ spec: spec.view, ...s })));
          }
          chk('caneta', W, 'traco-nao-vaza', leaks.length === 0, 'em outro bloco, índice e modos o traço fica oculto (display:none, sem caixa)', leaks.slice(0, 4));
          await go(p, { view: 'block', block: alvoBloco.id }, 1500);
          const volta = await p.evaluate(async (a) => { const [sid, ix] = a.split('>'); const lista = [...document.getElementById(sid).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(n => !n.closest('[data-rm-ui]')); const par = lista[+ix]; window.RMLayout.irPara(par); await new Promise(o => setTimeout(o, 1400));
            const sv = document.querySelector(`#rm2-ink svg[data-anchor="${a}"]`); if (!sv) return { sem: true }; const c = getComputedStyle(sv), r = sv.getBoundingClientRect(), pr = par.getBoundingClientRect();
            return { disp: c.display, dx: Math.abs(r.left - pr.left), dy: Math.abs(r.top - pr.top), dw: Math.abs(r.width - pr.width), d: [...sv.querySelectorAll('path')].map(x => x.getAttribute('d')).join('|') }; }, w1.anchor);
          chk('caneta', W, 'traco-volta', !volta.sem && volta.disp !== 'none' && volta.dx <= 4 && volta.dy <= 4 && volta.dw <= 4 && volta.d === w1.d, 'de volta ao bloco o MESMO traço reaparece sobre o parágrafo âncora (Δ ≤ 4 px)', volta);
          const escB = await p.evaluate(() => (window.__writes || []).length);
          chk('caneta', W, 'navegar-nao-grava', escA === escB, 'trocar de bloco/modo/índice não faz nenhuma escrita (só o motor da V2 grava o traço)', { antes: escA, depois: escB });
          await p.evaluate(() => window.RMToolsV2.escolherFerramenta('none'));
        }
        /* integridade dos nós originais (IDs e contagens) frente ao controle */
        const pos = await p.evaluate(() => { const t = document.querySelector('#materias-container > .tab-content'); const ids = [...t.querySelectorAll('[id]')].filter(e => !e.closest('[data-rm-ui]') && !/^rm/.test(e.id)).map(e => e.id).sort();
          const dup = Object.entries(ids.reduce((a, i) => (a[i] = (a[i] || 0) + 1, a), {})).filter(([, n]) => n > 1).map(([i]) => i);
          return { ids: ids.join(','), nIds: ids.length, quiz: t.querySelectorAll('.quiz-item').length, fc: t.querySelectorAll('.flashcard').length, tab: t.querySelectorAll('table').length, aud: t.querySelectorAll('audio').length, secs: t.querySelectorAll(':scope > section[id]').length, dup }; });
        chk('integridade', W, 'nos-originais', pos.ids === ctl.ids && pos.quiz === ctl.quiz && pos.fc === ctl.fc && pos.tab === ctl.tab && pos.aud === ctl.aud && pos.secs === ctl.secs, 'IDs e contagens de questões/flashcards/tabelas/áudios/seções idênticos ao controle (nada criado nem removido no conteúdo)', { ctl: { nIds: ctl.nIds, quiz: ctl.quiz, fc: ctl.fc, tab: ctl.tab, aud: ctl.aud, secs: ctl.secs }, pos: { nIds: pos.nIds, quiz: pos.quiz, fc: pos.fc, tab: pos.tab, aud: pos.aud, secs: pos.secs } });
        chk('integridade', W, 'sem-id-duplicado', pos.dup.length === 0, 'nenhum ID duplicado depois do layout', pos.dup);
        const esc9 = await p.evaluate(() => (window.__writes || []).filter(x => !/user_ink_strokes/.test(x))); chk('boot', W, 'sem-escrita-alem-da-caneta', esc9.length === 0, 'nenhuma escrita além da caneta simulada', esc9);
      }
      /* ---------- detach limpo (1440) ---------- */
      if (W === 1440) {
        const det = await p.evaluate(() => { try { window.RMNav.detach(); window.RMSistema.detach(); window.RMLayout.detach(); } catch (e) { return { err: String(e) }; }
          const H = document.documentElement, t = document.querySelector('#materias-container > .tab-content');
          return { attr: H.hasAttribute('data-rm-nav'), cls: /rm-sis|rm-nav/.test(H.className), ui: document.querySelectorAll('[data-rm-ui]').length, off: document.querySelectorAll('[data-rm-off]').length, secs: [...t.querySelectorAll(':scope > section[id]')].filter(s => getComputedStyle(s).display !== 'none').length, tot: t.querySelectorAll(':scope > section[id]').length }; });
        chk('integridade', W, 'detach-limpo', !det.err && !det.attr && !det.cls && det.off === 0 && det.secs === det.tot, 'detach: tudo volta ao estado original (todas as seções visíveis, sem atributos/UI do layout)', det);
      }
      await r.ctx.close();
      process.stdout.write(W + ' ');
      } catch (e) {
        R.checks.push({ area: 'ensaio', w: W, id: 'interrompido', estado: 'FALHA', msg: 'o ensaio desta largura foi interrompido por exceção (ver dados)', dados: String(e && e.message).slice(0, 300) });
        process.stdout.write(W + '! ');
        try { r && await r.ctx.close(); } catch (e2) {}
      }
    }
    if (!R.checks.some(c => c.area === 'audio' && c.id === 'audiolibro-real')) bloq('audio', 'todas', 'audiolibro-real', m.slug === 'semiologia-ii' ? 'audiolibro real do piloto: coberto pelo teste do piloto (#453, motor + manifesto autorizado); aqui não é simulado' : 'sem manifesto autorizado para esta matéria: audiolibro não é ensaiado nem simulado');
    R.adaptacoes = [...usadas]; R.segundos = Math.round((Date.now() - t0) / 1000);
    const f = R.checks.filter(c => c.estado === 'FALHA').length;
    console.log(`→ ${R.checks.length} verificações · ${f} FALHA · ${R.segundos}s`);
    fs.writeFileSync(path.join(OUT, m.slug + '.json'), JSON.stringify(R, null, 1));
  }
  await br.close(); srv.close();
})();
