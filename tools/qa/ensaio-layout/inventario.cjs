/* CHECKPOINT A — INVENTÁRIO REAL das matérias ativas (issue #457). Somente leitura.
   Fonte: CATÁLOGO real (index.html) × FILES (get-materia.js) × arquivos em materias-privadas/.
   Medido NO NAVEGADOR, com o app-core real (enhanceAll), em modo «controle» (a matéria como o site a serve hoje, sem nada do layout novo).
   Saída: docs/layout-ensaio/inventario.json (máquina) e docs/layout-ensaio/INVENTARIO.md (humano), com estado SIM/NÃO/INDETERMINADO + evidência.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/inventario.cjs            (todas)    ·    ... inventario.cjs neurologia biologia   (algumas) */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const OUT = path.join(L.REPO, 'docs/layout-ensaio');

/* função serializada: roda DENTRO da página */
const INV = () => {
  const tab = document.querySelector('#materias-container > .tab-content');
  const limpo = s => String(s || '').replace(/\s+/g, ' ').trim();
  const ui = e => !!e.closest('[data-rm-ui]');
  const figs = r => [...r.querySelectorAll('figure')].filter(f => f.querySelector('figcaption') && f.querySelector('img, .s2-photo[role="img"], img.rmc-photo') && !f.closest('.material-slide, .med-image'));
  const secs = [...tab.querySelectorAll(':scope > section[id]')];
  const bankRe = /banco|bank|banc|compendio|compêndio/i;
  const porSec = secs.map(s => {
    const h2 = s.querySelector(':scope > h2'), mk = s.querySelector(':scope > .section-marker');
    const qs = [...s.querySelectorAll('.quiz-item')];
    return {
      id: s.id, h2: limpo(h2 && h2.textContent).slice(0, 90), marcador: limpo(mk && mk.textContent).slice(0, 60),
      papel: s.getAttribute('data-rm-role') || '',
      quiz: qs.length, quizIds: qs.map(q => q.id || ''), fc: s.querySelectorAll('.flashcard').length, fig: figs(s).length,
      tb: s.querySelectorAll('table').length, aud: s.querySelectorAll('audio').length,
      vid: s.querySelectorAll('details.video-collapsible, iframe, video').length, img: s.querySelectorAll('img').length,
      ancoras: s.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote').length,
      banco: bankRe.test(s.id) || bankRe.test(limpo(h2 && h2.textContent))
    };
  });
  const todosIds = [...tab.querySelectorAll('[id]')].map(e => e.id);
  const dup = Object.entries(todosIds.reduce((a, i) => (a[i] = (a[i] || 0) + 1, a), {})).filter(([, n]) => n > 1).map(([i]) => i);
  /* questões: corpo × banco (por id com prefixo bq-, senão por início do enunciado) */
  const todas = [...tab.querySelectorAll('.quiz-item')];
  const doBanco = todas.filter(q => q.closest('section') && bankRe.test(q.closest('section').id));
  const doCorpo = todas.filter(q => !(q.closest('section') && bankRe.test(q.closest('section').id)));
  const stem = q => limpo((q.querySelector('.quiz-question') || q).textContent).slice(0, 140);
  const idsCorpo = new Set(doCorpo.map(q => q.id).filter(Boolean)), stemsCorpo = new Set(doCorpo.map(stem));
  let casaId = 0, casaStem = 0, orfaos = 0;
  doBanco.forEach(q => { const id = (q.id || '').replace(/^bq-/, 'q-'); if (q.id && idsCorpo.has(id)) casaId++; else if (stemsCorpo.has(stem(q))) casaStem++; else orfaos++; });
  const semId = todas.filter(q => !q.id).length;
  const tags = { basada: tab.querySelectorAll('.quiz-tag.oficial, .quiz-tag.basada').length, variante: tab.querySelectorAll('.quiz-tag.variante').length };
  const tipos = { mc: tab.querySelectorAll('.quiz-item .options').length, vf: tab.querySelectorAll('.quiz-item .tf-buttons').length, define: tab.querySelectorAll('.quiz-item .quiz-tag.define').length };
  /* contagens DECLARADAS à mão no texto (candidatas a deriva) */
  const decl = [];
  const re = /(\d{1,4})\s*(preguntas|cuestiones|cuestionario|flashcards|tarjetas|infograf[ií]as|bloques|esquemas|videos|sonidos)\b/i;
  const w = document.createTreeWalker(tab, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const t = n.nodeValue; if (!t || t.length > 400) continue;
    const m = re.exec(t); if (!m) continue;
    const pe = n.parentElement; if (!pe || ui(pe) || pe.closest('.quiz-item, .flashcard, script, style')) continue;
    decl.push({ n: +m[1], rec: m[2].toLowerCase(), ctx: limpo(t).slice(0, 80), sec: (pe.closest('section') || {}).id || '' });
  }
  /* blocos: «<b>150</b><span>Preguntas</span>» (estatística do banco) */
  tab.querySelectorAll('.rmc-bank-stats div, .rmc-bank-stats span, .stats div').forEach(d => {
    const b = d.querySelector('b'), sp = d.querySelector('span');
    if (b && sp && /^\d+$/.test(limpo(b.textContent))) decl.push({ n: +limpo(b.textContent), rec: limpo(sp.textContent).toLowerCase(), ctx: 'stat:' + limpo(d.textContent).slice(0, 40), sec: (d.closest('section') || {}).id || '' });
  });
  /* mídia local e referências quebradas (só verifica o que é relativo; a checagem de existência é feita no Node) */
  const midia = { audio: [], img: [], video: [] };
  tab.querySelectorAll('audio').forEach(a => { const s = a.getAttribute('src') || (a.querySelector('source') || {}).getAttribute && a.querySelector('source').getAttribute('src'); midia.audio.push(s || ''); });
  tab.querySelectorAll('img[src]').forEach(i => midia.img.push(i.getAttribute('src')));
  tab.querySelectorAll('video source[src], video[src]').forEach(v => midia.video.push(v.getAttribute('src') || ''));
  const yt = [...tab.querySelectorAll('iframe[src], iframe[data-src]')].map(f => f.getAttribute('src') || f.getAttribute('data-src'));
  const menuAlvos = [...tab.querySelectorAll('.rm-menu .rm-menu-item > a[data-target]')].map(a => a.getAttribute('data-target'));
  const semMenu = secs.map(s => s.id).filter(i => !menuAlvos.includes(i)), menuSemSecao = menuAlvos.filter(i => i && !secs.some(s => s.id === i));
  /* itens DISTINTOS e cópias: questão por enunciado, flashcard pela frente. Uma seção é «cópia» quando ≥90% dos seus itens existem em OUTRA seção. */
  const normq = q => limpo((q.querySelector('.quiz-question') || q).textContent).toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, ' ').trim();
  const normf = f => limpo((f.querySelector('.fc-front') || f).textContent).toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, ' ').trim();
  const qPorSec = secs.map(s => [...s.querySelectorAll('.quiz-item')].map(normq)), fPorSec = secs.map(s => [...s.querySelectorAll('.flashcard')].map(normf));
  const dist = arr => new Set(arr.flat()).size;
  function copias(porSec) {
    const out = [];
    porSec.forEach((it, i) => {
      if (!it.length) return;
      const outros = new Set(porSec.flatMap((x, j) => j === i ? [] : x));
      const n = it.filter(x => outros.has(x)).length;
      if (n / it.length >= 0.9) out.push({ id: secs[i].id, itens: it.length, emOutras: n });
    });
    return out;
  }
  const normqo = q => normq(q) + '|' + limpo((q.querySelector('.options, .tf-buttons') || q).textContent).toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, ' ');
  const quizComOpc = new Set(secs.flatMap(s => [...s.querySelectorAll('.quiz-item')].map(normqo))).size;
  const unicos = { quizComOpc, quiz: dist(qPorSec), fc: dist(fPorSec), copiasQuiz: copias(qPorSec), copiasFc: copias(fPorSec) };
  const flashLaunch = tab.querySelectorAll('.rmfc-launch').length;
  return {
    tabId: tab.id, tabClass: tab.className, secoes: porSec, nSecoes: secs.length, idsDuplicados: dup, nIds: todosIds.length,
    questoes: { total: todas.length, corpo: doCorpo.length, banco: doBanco.length, bancoCasaId: casaId, bancoCasaEnunciado: casaStem, bancoOrfaos: orfaos, semId, tags, tipos },
    unicos,
    flashcards: { total: tab.querySelectorAll('.flashcard').length, lancadores: flashLaunch, secoesComFc: porSec.filter(s => s.fc).length },
    figuras: porSec.reduce((a, s) => a + s.fig, 0), imagens: tab.querySelectorAll('img').length, tabelas: tab.querySelectorAll('table').length,
    videos: { cards: tab.querySelectorAll('details.video-collapsible').length, iframes: yt.length, nativos: tab.querySelectorAll('video').length, urls: yt.slice(0, 6) },
    ausculta: { audios: tab.querySelectorAll('audio').length, players: tab.querySelectorAll('.audio-player').length },
    declaradas: decl.slice(0, 40), midia,
    particularidades: {
      semMenu, menuSemSecao, menuComAlvo: menuAlvos.filter(Boolean).length,
      rmMenu: tab.querySelectorAll('.rm-menu .rm-menu-item').length, hero: !!tab.querySelector('.s2-hero'), quizCards: tab.querySelectorAll('.s2-quiz-card').length,
      detailsQuiz: tab.querySelectorAll('details').length, postits: tab.querySelectorAll('.rmc-note, .postit, .rm-note, .nota-p4').length,
      ancorasTotal: porSec.reduce((a, s) => a + s.ancoras, 0), contentVisibility: [...tab.querySelectorAll(':scope > section[id]')].filter(s => getComputedStyle(s).contentVisibility === 'auto').length
    }
  };
};

function existe(rel) {
  if (!rel || /^(https?:|data:|\/\/|#)/.test(rel)) return null;
  const f = path.join(L.ROOT, rel.split('?')[0].replace(/^\.\//, '').replace(/^\//, ''));
  return fs.existsSync(f);
}

(async () => {
  const filtro = process.argv.slice(2);
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const rec = L.reconciliar();
  const lista = rec.ativas.filter(m => !filtro.length || filtro.includes(m.slug));
  const srv = await L.servir(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const out = { gerado_em: new Date().toISOString(), fonte: { catalogo: 'index.html (const CATALOGO)', servidas: 'netlify/functions/get-materia.js (FILES)', disco: 'netlify/functions/materias-privadas/*.html' }, reconciliacao: { ativas: rec.ativas.length, soNoCatalogo: rec.soNoCatalogo, soNoGetMateria: rec.soNoGetMateria, arquivosOrfaos: rec.arquivosOrfaos, arquivosFaltando: rec.arquivosFaltando }, materias: [] };
  for (const m of lista) {
    process.stdout.write(`inventário ${m.slug} … `);
    const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'controle', espera: 800 });
    const d = await r.page.evaluate(INV);
    d.erros = r.errs; d.externas = [...new Set(r.externas.map(u => new URL(u).hostname))];
    d.escritas = await r.page.evaluate(() => window.__writes);
    const f = path.join(L.MAT, m.arquivo); d.arquivo = { nome: m.arquivo, bytes: fs.statSync(f).size };
    d.midiaQuebrada = { audio: d.midia.audio.filter(s => existe(s) === false), img: d.midia.img.filter(s => existe(s) === false), video: d.midia.video.filter(s => existe(s) === false) };
    delete d.midia;
    out.materias.push(Object.assign({ slug: m.slug, tab: m.tab, title: m.title }, d));
    await r.ctx.close(); console.log(`${d.nSecoes} seções · ${d.questoes.total} q · ${d.flashcards.total} fc`);
  }
  await br.close(); srv.close();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, filtro.length ? 'inventario.parcial.json' : 'inventario.json'), L.jsonLinhas(out, 'materias'));
  console.log('ok →', path.join(OUT, filtro.length ? 'inventario.parcial.json' : 'inventario.json'));
})();
