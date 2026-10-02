/* Modo isolado INFOGRAFÍAS (B3) — preparado, DESLIGADO por padrão (#425 → próxima PR).

   Duas chaves precisam estar ligadas para o modo mostrar conteúdo real:
     (1) CFG.conteudoReal em rm-modes.js (constante; false no código entregue);
     (2) contrato de anotações da V2 pronto (RMToolsV2.contratoModos ≥ 1 + sonda comportamental de anotarPermitido()).
   Hoje o contrato NÃO existe na V2 (activeViewPermitido() é fixo; anotarPermitido() só é exposta em _test).

   Parte A — código ENTREGUE, sem alteração: o modo continua sendo o painel vazio (nenhum conteúdo real, 0 escritas).
   Parte B — chave ligada, mas SEM contrato / com declaração FALSA: continua painel vazio.
   Parte C — chave ligada + contrato SIMULADO (a V2 real não o tem): conteúdo real. O arquivo rm-modes.js é servido com
             `conteudoReal: false → true` (é exatamente o diff da PR de ativação); nada disso existe em produção.
   Tudo com Semiología II REAL, rm-pilot → rm-layout/rm-modes REAIS, V2 real; supabase/gate simulados; 0 rede real; 0 escrita.

   Uso:  export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo
         node tools/qa/browser-qa/layout/infografias.test.cjs                                                        */
const fs = require('fs'), path = require('path');
const L = require('./lib-ink.cjs');
const { ROOT } = require('./serve.cjs');
const { ok, info, abrir } = L;

const LARGURAS = [[320, 700], [390, 844], [561, 844], [600, 844], [700, 900], [720, 450], [767, 1024], [768, 1024], [1024, 768], [1440, 900], [1700, 900], [1920, 1080]];

/* serve rm-modes.js com a chave ligada (diff da PR de ativação) — só nos testes das partes B e C */
const LIGAR = (page) => page.route('**/assets/rm-modes.js*', async (r) => {
  const src = fs.readFileSync(path.join(ROOT, 'assets/rm-modes.js'), 'utf8');
  if (!/conteudoReal: false/.test(src)) throw new Error('constante conteudoReal não encontrada (o teste precisa atualizar)');
  r.fulfill({ status: 200, contentType: 'text/javascript', body: src.replace('conteudoReal: false', 'conteudoReal: true') });
});
/* contrato SIMULADO da V2: a V2 consulta RMModes dentro da porta única de anotação e conta tentativas de escrita */
const CONTRATO = () => {
  const T = window.RMToolsV2;
  window.__esc = { tentativas: 0, aceitas: 0, recusadas: 0 };
  T.contratoModos = 1;
  T._test.anotarPermitido = () => window.RMModes.annotationsAllowed();
  window.__escreverSim = () => { window.__esc.tentativas++; const a = T._test.anotarPermitido(); a ? window.__esc.aceitas++ : window.__esc.recusadas++; return a; };
};
const FALSO = () => { window.RMToolsV2.contratoModos = 1; };      // declara, mas a anotarPermitido() REAL (fixa em true) continua liberando

/* instantâneo do que NÃO pode mudar quando o aluno entra e sai de um modo */
const SNAP = () => {
  const hash = (s) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x; };
  const tab = document.querySelector('#materias-container > .tab-content.active');
  const secs = [...tab.querySelectorAll('section[id]')];
  return {
    ids: [...document.querySelectorAll('#materias-container [id]')].map(e => e.id).filter(i => i !== 'rm-mode-root').sort().join('|'),
    secs: secs.length, secHash: secs.map(s => s.id + ':' + hash(s.outerHTML)).join(','),
    hl: document.querySelectorAll('.rm-hl').length, ink: document.querySelectorAll('#rm2-ink svg[data-anchor]').length,
    figs: tab.querySelectorAll('section[id] figure').length, slides: tab.querySelectorAll('.material-slide').length,
    uiEmSec: document.querySelectorAll('section[id] [data-rm-ui]').length, y: Math.round(pageYOffset), view: window.RMModes.view
  };
};
const ESTADO = () => {
  const R = document.getElementById('rm-mode-root'), cs = (e) => e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
  const real = R && R.querySelector('.rm-l2-real'), vazio = R && R.querySelector('.rm-l2-empty');
  return {
    view: window.RMModes.view, realVisivel: !!cs(real), vazioVisivel: !!cs(vazio), cards: R ? R.querySelectorAll('.rm-l2-ig-card').length : 0,
    chips: R ? R.querySelectorAll('.rm-l2-ig-chip').length : 0, grupos: R ? R.querySelectorAll('.rm-l2-ig-group').length : 0,
    idsNaRaiz: R ? R.querySelectorAll('[id]').length : 0, semUi: R ? [...R.querySelectorAll('*')].filter(e => !e.hasAttribute('data-rm-ui') && e.id !== 'rm-mode-root').length : 0,
    libera: window.RMModes.conteudoLiberado('infografias'), contrato: window.RMModes.contratoAnotacoes(), ink: getComputedStyle(document.getElementById('rm2-ink') || document.body).display,
    toolbox: [...document.querySelectorAll('.rm2-box, .rm-tools-r')].every(e => getComputedStyle(e).display === 'none')
  };
};
const entrar = (p, id = 'infografias') => p.evaluate((i) => window.RMModes.requestView(i), id);
const esperaModo = async (p) => { await p.waitForTimeout(350); };

/* verdade do DOM, calculada de forma independente do código sob teste */
const VERDADE = () => {
  const tab = document.querySelector('#materias-container > .tab-content.active');
  const figs = [...tab.querySelectorAll('section[id] figure')].filter(f => f.querySelector('figcaption') && f.querySelector('img, .s2-photo[role="img"], img.rmc-photo') && !f.closest('.material-slide, .med-image'));
  return figs.map(f => ({ sec: f.closest('section[id]').id, titulo: ((f.querySelector('figcaption b, figcaption strong') || f.querySelector('figcaption')).textContent || '').replace(/\s+/g, ' ').trim(), alt: (f.querySelector('[aria-label]') || {}).getAttribute ? f.querySelector('[aria-label]').getAttribute('aria-label') : '' }));
};
const CARTOES = () => [...document.querySelectorAll('#rm-mode-root .rm-l2-ig-card')].map(c => ({
  grupo: c.closest('.rm-l2-ig-group').getAttribute('aria-label'), titulo: c.querySelector('.rm-l2-ig-t').textContent.trim(),
  alt: c.querySelector('.rm-l2-ig-media').getAttribute('aria-label')
}));

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();

  /* ============ A · código ENTREGUE: o modo continua vazio ============ */
  console.log('\n===== A · código entregue (chave desligada) =====');
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const f = await abrir(br, base, w, h); const p = f.page;
    const antes = await p.evaluate(SNAP);
    ok(antes.figs === 34 && antes.slides === 10, `${w}: a matéria tem 34 <figure> com legenda (infográficos) e 10 diapositivas de imagem (não são infográficos) — ${antes.figs} figuras / ${antes.slides} diapositivas`);
    ok(await p.evaluate(() => window.RMModes.conteudoRealLigado === false), `${w}: a chave CFG.conteudoReal está DESLIGADA no código entregue`);
    const modos = await p.evaluate(() => window.RMModes.disponiveis().map(m => m.id));
    ok(modos.includes('infografias'), `${w}: «Infografías» continua disponível na lateral (recurso existe) — [${modos.join(', ')}]`);
    await entrar(p); await esperaModo(p);
    const e = await p.evaluate(ESTADO);
    ok(e.view === 'infografias' && e.vazioVisivel && !e.realVisivel && e.cards === 0, `${w}: com a chave desligada o modo é o painel vazio de sempre (cards=${e.cards}, vazio=${e.vazioVisivel})`);
    ok(e.libera === false && e.contrato.pronto === false, `${w}: conteudoLiberado=false · contrato.pronto=false (${e.contrato.motivo})`);
    ok(e.toolbox && e.ink === 'none', `${w}: toolbox e camada de tinta ocultas (defesa de construção da B1)`);
    ok(await p.evaluate(() => window.__writes.length === 0), `${w}: 0 escritas no banco`);
    await p.evaluate(() => window.RMModes.requestView('full')); await p.waitForTimeout(500);
    const depois = await p.evaluate(SNAP);
    ok(depois.secHash === antes.secHash && depois.ids === antes.ids, `${w}: voltar não altera o conteúdo das seções nem os ids`);
    ok(f.errs.length === 0, `${w}: 0 erros JS (${f.errs.length})`);
    await p.close();
  }

  /* ============ B · chave ligada SEM contrato / contrato FALSO ============ */
  console.log('\n===== B · chave ligada, contrato ausente ou falso: continua vazio =====');
  {
    const f = await abrir(br, base, 1440, 900, { rotas: LIGAR }); const p = f.page;
    ok(await p.evaluate(() => window.RMModes.conteudoRealLigado === true), 'a chave foi de fato ligada neste teste (rota aplicada ao rm-modes.js?v=…)');
    await entrar(p); await esperaModo(p);
    let e = await p.evaluate(ESTADO);
    ok(e.vazioVisivel && !e.realVisivel && e.cards === 0 && !e.libera, `chave ligada + V2 REAL (sem contrato): painel vazio (motivo: ${e.contrato.motivo})`);
    await p.evaluate(() => window.RMModes.requestView('full')); await p.waitForTimeout(400);
    await p.evaluate(FALSO);
    await entrar(p); await esperaModo(p);
    e = await p.evaluate(ESTADO);
    ok(e.vazioVisivel && !e.realVisivel && e.cards === 0 && !e.libera, `declaração FALSA (contratoModos=1 mas anotarPermitido() ainda libera): painel vazio (motivo: ${e.contrato.motivo})`);
    ok(await p.evaluate(() => window.__writes.length === 0), 'nenhuma escrita');
    ok(f.errs.length === 0, `0 erros JS (${f.errs.length})`);
    await p.close();
  }

  /* ============ C · chave ligada + contrato simulado: conteúdo real ============ */
  console.log('\n===== C · chave ligada + contrato simulado =====');
  const verdade = { n: 0 };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    console.log(`\n--- ${w}×${h} ---`);
    const f = await abrir(br, base, w, h, { rotas: LIGAR }); const p = f.page;
    await p.evaluate(CONTRATO);
    const V = await p.evaluate(VERDADE); verdade.n = V.length;
    /* estado do aluno ANTES: resposta de questão, carta virada, rolagem profunda, tinta semeada */
    await p.evaluate(() => { const b = document.querySelector('#s2-b02 .tf-btn'); if (b) b.click(); const c = document.querySelector('#s2-b02 .flashcard'); if (c) c.click(); });
    await p.waitForTimeout(1500);                                         // a resposta da questão e a carta viradas terminam de animar ANTES do instantâneo
    await L.trazerTinta(p, 's2-b10'); const tin0 = await L.ate(p);       // leva a tinta semeada (s2-b10) à janela e espera assentar
    L.okTinta(tin0.m, `${w}: ANTES de entrar no modo a tinta está visível e alinhada`);
    const antes = await p.evaluate(SNAP);
    const paths0 = await p.evaluate(() => document.querySelectorAll('#rm2-ink svg[data-anchor] path').length);
    const pristino = await (async () => { const pg = await abrir(br, base, w, h); const s = await pg.page.evaluate(SNAP); await pg.page.close(); return s; })();
    ok(antes.secHash !== pristino.secHash, `${w}: o estado do aluno (resposta/carta) alterou o DOM — o teste NÃO é vacuoso`);
    ok(antes.ink > 0 && antes.hl >= 0, `${w}: tinta semeada presente antes (${antes.ink} traços; ${antes.hl} highlights)`);

    await entrar(p); await esperaModo(p);
    const e = await p.evaluate(ESTADO);
    ok(e.libera && e.contrato.pronto, `${w}: as duas chaves ligadas ⇒ conteúdo liberado`);
    ok(e.realVisivel && !e.vazioVisivel, `${w}: conteúdo real visível, painel vazio oculto`);
    const C = await p.evaluate(CARTOES);
    ok(e.cards === V.length && V.length === 34, `${w}: ${e.cards} cartões = ${V.length} infográficos reais do DOM (34 figuras com legenda); as 10 diapositivas NÃO entram`);
    ok(JSON.stringify(C.map(c => c.titulo)) === JSON.stringify(V.map(v => v.titulo)), `${w}: títulos dos cartões = legendas das figuras, na ordem do documento`);
    ok(C.every((c, i) => c.alt === V[i].alt && c.alt), `${w}: alt de cada cartão = aria-label da figura original`);
    const porBloco = {}; V.forEach(v => { porBloco[v.sec] = (porBloco[v.sec] || 0) + 1; });
    const nBlocos = Object.keys(porBloco).length;
    ok(e.grupos === nBlocos && e.chips === nBlocos, `${w}: ${e.grupos} grupos/${e.chips} atalhos = ${nBlocos} blocos que realmente têm infográficos (sem blocos vazios)`);
    const gr = await p.evaluate(() => [...document.querySelectorAll('#rm-mode-root .rm-l2-ig-group')].map(g => ({ n: g.querySelectorAll('.rm-l2-ig-card').length, rot: g.querySelector('.rm-l2-ig-gk') && g.querySelector('.rm-l2-ig-gk').textContent, cnt: g.querySelector('.rm-l2-ig-gn').textContent, tema: [...g.querySelectorAll('.rm-l2-ig-th')].map(t => t.textContent) })));
    ok(gr.every(g => g.cnt.startsWith(g.n + ' ')), `${w}: o contador de cada grupo é o número REAL de cartões (${gr.map(g => g.n).join('+')} = ${gr.reduce((a, g) => a + g.n, 0)})`);
    info(`grupos: ${gr.map(g => `${g.rot}·${g.n}${g.tema.length ? ' [' + g.tema.length + ' temas]' : ''}`).join(' | ')}`);
    const sub = await p.evaluate(() => document.querySelector('.rm-l2-ig-sub').textContent);
    ok(sub.startsWith(V.length + ' infografías'), `${w}: o total do cabeçalho é derivado (${sub.slice(0, 22)}…)`);
    ok(e.idsNaRaiz === 0 && e.semUi === 0, `${w}: 0 ids novos e 100% [data-rm-ui] na raiz do modo`);
    ok((await p.evaluate(SNAP)).uiEmSec === 0, `${w}: 0 [data-rm-ui] dentro de section[id]`);
    ok(e.toolbox && e.ink === 'none', `${w}: toolbox e tinta ocultas no modo`);

    /* bloqueio de anotação: o predicado fecha fora da Página completa e a «escrita» simulada é recusada */
    const gate = await p.evaluate(() => ({ perm: window.RMModes.annotationsAllowed(), esc: window.__escreverSim(), c: window.__esc }));
    ok(gate.perm === false && gate.esc === false && gate.c.recusadas === 1 && gate.c.aceitas === 0, `${w}: no modo, annotationsAllowed()=false e a escrita simulada é RECUSADA (aceitas=${gate.c.aceitas}, recusadas=${gate.c.recusadas})`);
    ok(await p.evaluate(() => window.__writes.length === 0), `${w}: 0 escritas no banco no modo`);

    /* tentar escrever à força: arma a caneta e «desenha» sobre o catálogo (pointer events) — nada pode virar traço */
    await p.evaluate(() => { try { window.RMToolsV2.escolherFerramenta('pen'); } catch (er) {} });
    const box = await p.evaluate(() => { const r = document.querySelector('#rm-mode-root .rm-l2-ig-media').getBoundingClientRect(); return { x: r.left + 40, y: Math.max(60, r.top + 40) }; });
    await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x + 80, box.y + 30, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
    const forca = await p.evaluate(() => ({ tr: window.RMToolsV2._test.temTraco(), svg: document.querySelectorAll('#rm2-ink svg[data-anchor]').length, w: window.__writes.length }));
    ok(!forca.tr && forca.w === 0, `${w}: caneta armada à força + arrasto sobre o catálogo: 0 traço em curso, 0 escritas (traços visíveis ${forca.svg}, = antes ${antes.ink})`);
    await p.evaluate(() => { try { window.RMToolsV2.escolherFerramenta('none'); } catch (er) {} });

    /* imagens sob demanda */
    const lazy0 = await p.evaluate(() => ({ pend: document.querySelectorAll('#rm-mode-root [data-bg]').length, com: [...document.querySelectorAll('#rm-mode-root .rm-l2-ig-media')].filter(m => m.style.backgroundImage).length }));
    ok(lazy0.pend > 0 && lazy0.com > 0 && lazy0.com < 34, `${w}: imagens sob demanda — ${lazy0.com} carregadas, ${lazy0.pend} aguardando (de 34)`);
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(700);
    const lazy1 = await p.evaluate(() => document.querySelectorAll('#rm-mode-root [data-bg]').length);
    ok(lazy1 < lazy0.pend, `${w}: ao rolar, mais imagens são carregadas (${lazy0.pend} → ${lazy1} pendentes)`);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);

    /* atalho de bloco */
    const ch = await p.evaluate(() => { const c = document.querySelectorAll('#rm-mode-root .rm-l2-ig-chip')[4]; c.click(); return c.getAttribute('data-ig-chip'); });
    await p.waitForTimeout(500);
    const pos = await p.evaluate((i) => { const g = document.querySelectorAll('#rm-mode-root .rm-l2-ig-group')[+i]; const r = g.getBoundingClientRect(); const bb = document.querySelector('.rm-l2-band').getBoundingClientRect().bottom; return { top: Math.round(r.top), band: Math.round(bb) }; }, ch);
    ok(pos.top >= pos.band - 1 && pos.top < 260, `${w}: o atalho leva o grupo para logo abaixo da faixa (topo ${pos.top}px, faixa ${pos.band}px)`);

    /* voltar: conteúdo, posição, anotações */
    await p.evaluate(() => { document.querySelector('#rm-mode-root .rm-l2-ig-end .rm-l2-empty-back').click(); }); await p.waitForTimeout(1500);
    const depois = await p.evaluate(SNAP);
    ok(depois.view === 'full', `${w}: voltou à Página completa`);
    const difSec = antes.secHash.split(',').filter((x, i) => x !== depois.secHash.split(',')[i]).map(x => x.split(':')[0]);
    ok(depois.secHash === antes.secHash, `${w}: conteúdo das ${antes.secs} seções IDÊNTICO (inclui a resposta da questão e a carta virada, byte a byte)${difSec.length ? ' — diferem: ' + difSec.join(',') : ''}`);
    ok(depois.ids === antes.ids, `${w}: todos os ids e âncoras idênticos`);
    ok(depois.hl === antes.hl && depois.ink === antes.ink, `${w}: highlights (${depois.hl}) e traços de tinta (${depois.ink}) idênticos`);
    ok(Math.abs(depois.y - antes.y) <= 2, `${w}: posição de rolagem restaurada (${antes.y} → ${depois.y})`);
    const gate2 = await p.evaluate(() => ({ perm: window.RMModes.annotationsAllowed(), esc: window.__escreverSim() }));
    ok(gate2.perm === true && gate2.esc === true, `${w}: de volta à Página completa a anotação é permitida de novo`);
    ok(await p.evaluate(() => document.querySelectorAll('#rm-mode-root .rm-l2-ig-card').length === 0 && document.querySelector('#rm-mode-root .rm-l2-real').hidden), `${w}: o catálogo é descartado ao voltar (nada fica no DOM)`);
    const tin1 = await L.ate(p);                                         // a tinta volta alinhada à âncora (medida VÁLIDA: paths > 0, âncora à vista)
    L.okTinta(tin1.m, `${w}: DEPOIS de voltar a tinta está visível e alinhada ao texto (assentou em ${tin1.ms} ms)`);
    ok((await p.evaluate(() => document.querySelectorAll('#rm2-ink svg[data-anchor] path').length)) === paths0, `${w}: os ${paths0} <path> da tinta são os mesmos (nada foi redesenhado nem perdido)`);

    /* «Ver en la página»: volta e salta até a figura */
    await entrar(p); await esperaModo(p);
    const alvo = await p.evaluate(() => { const b = document.querySelectorAll('#rm-mode-root .rm-l2-ig-go')[20]; const t = b.closest('.rm-l2-ig-card').querySelector('.rm-l2-ig-t').textContent.trim(); b.click(); return t; });
    await p.waitForTimeout(2200);
    const salto = await p.evaluate((t) => { const f = [...document.querySelectorAll('section[id] figure')].find(x => x.querySelector('figcaption') && x.querySelector('figcaption').textContent.replace(/\s+/g, ' ').trim().startsWith(t)); const r = f.getBoundingClientRect(); const bb = document.querySelector('.rm-l2-band').getBoundingClientRect().bottom; return { view: window.RMModes.view, top: Math.round(r.top), band: Math.round(bb), vis: r.bottom > bb && r.top < innerHeight }; }, alvo);
    ok(salto.view === 'full' && salto.vis, `${w}: «Ver en la página» volta à Página completa e a figura «${alvo.slice(0, 28)}…» fica à vista (topo ${salto.top}px, faixa ${salto.band}px)`);

    /* corridas: entra/sai rápido, e sair da matéria com o modo aberto */
    for (let i = 0; i < 4; i++) { await entrar(p); await p.evaluate(() => window.RMModes.requestView('full')); }
    await entrar(p); await p.waitForTimeout(500);
    const rap = await p.evaluate(ESTADO);
    ok(rap.view === 'infografias' && rap.cards === 34 && rap.grupos === nBlocos, `${w}: 4× entra/sai rápido: um único catálogo íntegro (cards=${rap.cards}, grupos=${rap.grupos})`);
    await p.evaluate(() => window.RMModes.requestView('full')); await p.waitForTimeout(1200);
    const rap2 = await p.evaluate(SNAP);
    ok(rap2.secHash === antes.secHash && rap2.ids === antes.ids, `${w}: após as corridas o conteúdo e os ids continuam idênticos ao início`);
    await entrar(p); await p.waitForTimeout(300);
    await p.evaluate(() => { const t = document.querySelector('.main-tab:not(.active)'); if (t) t.click(); window.switchTab && window.switchTab('bio'); });
    await p.waitForTimeout(900);
    const fora = await p.evaluate(() => ({ raiz: !!document.getElementById('rm-mode-root'), l2: document.documentElement.classList.contains('rm-l2'), view: document.documentElement.getAttribute('data-rm-view'), cards: document.querySelectorAll('.rm-l2-ig-card').length }));
    ok(!fora.raiz && !fora.l2 && !fora.view && fora.cards === 0, `${w}: sair da matéria com o modo aberto: shell e catálogo removidos (raiz=${fora.raiz}, rm-l2=${fora.l2}, cards=${fora.cards})`);
    ok(f.errs.length === 0, `${w}: 0 erros JS (${f.errs.length}) ${f.errs[0] || ''}`);
    await p.close();
  }

  /* ============ D · responsivo: 12 larguras + zoom 200 % ============ */
  console.log('\n===== D · responsivo =====');
  for (const [w, h] of LARGURAS) {
    const f = await abrir(br, base, w, h, { rotas: LIGAR }); const p = f.page;
    await p.evaluate(CONTRATO); await entrar(p); await p.waitForTimeout(500);
    const m = await p.evaluate(() => {
      const R = document.getElementById('rm-mode-root'), r = R.getBoundingClientRect(), H = document.documentElement;
      const med = document.querySelector('#rm-mode-root .rm-l2-ig-media'), mr = med.getBoundingClientRect(), cr = med.closest('.rm-l2-ig-card').getBoundingClientRect();
      const bb = document.querySelector('.rm-l2-band').getBoundingClientRect().bottom, hd = document.querySelector('.rm-l2-ig-title').getBoundingClientRect();
      const alvos = [...document.querySelectorAll('#rm-mode-root button')].map(b => b.getBoundingClientRect()).filter(b => b.width > 0);
      const lat = document.querySelector('.rm-l2-side'), lr = lat && getComputedStyle(lat).display !== 'none' ? lat.getBoundingClientRect() : null;
      return { vw: H.clientWidth, ov: H.scrollWidth - H.clientWidth, l: Math.round(r.left), rr: Math.round(r.right), cardsOk: cr.left >= -0.5 && cr.right <= H.clientWidth + 0.5, ratio: +(mr.width / mr.height).toFixed(2), minAlvo: Math.min(...alvos.map(b => Math.min(b.width, b.height))), tituloOk: hd.top >= bb - 1, latDir: lr ? Math.round(lr.right) : 0, mediaL: Math.round(mr.left), lm: H.getAttribute('data-rm-lmode') };
    });
    ok(m.ov <= 0, `${w}×${h}: 0 overflow horizontal (lmode=${m.lm})`);
    ok(m.cardsOk, `${w}×${h}: cartões dentro da janela (raiz ${m.l}–${m.rr} de ${m.vw})`);
    ok(m.ratio >= 1.3 && m.ratio <= 1.7, `${w}×${h}: proporção da imagem preservada (${m.ratio}, original 3:2 = 1,5) — sem deformar nem cortar`);
    ok(m.minAlvo >= 43.5, `${w}×${h}: alvos de toque ≥ 44 px (menor ${m.minAlvo.toFixed(1)})`);
    ok(m.tituloOk, `${w}×${h}: o título não fica sob a faixa fixa`);
    ok(m.latDir === 0 || m.mediaL >= m.latDir - 1, `${w}×${h}: conteúdo não passa sob a lateral (lateral até ${m.latDir}, imagem a partir de ${m.mediaL})`);
    ok(f.errs.length === 0, `${w}×${h}: 0 erros JS (${f.errs.length})`);
    await p.close();
  }
  for (const [w, h] of [[1440, 900], [1024, 768]]) {                 // zoom 200 %: viewport CSS = metade
    const p = await br.newPage({ viewport: { width: Math.round(w / 2), height: Math.round(h / 2) }, deviceScaleFactor: 2 });
    await p.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(L.FLAGS) }));
    await LIGAR(p);
    await p.goto(`${base}/p.html?slug=semiologia-ii&tab=semio2&uid=${L.JOSE}&seed=${L.SEED}&wait=1800`, { timeout: 120000 });
    await p.waitForFunction('window.__ready===true', { timeout: 120000 }); await p.waitForTimeout(800);
    await p.evaluate(CONTRATO); await entrar(p); await p.waitForTimeout(500);
    const z = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, cards: document.querySelectorAll('.rm-l2-ig-card').length }));
    ok(z.ov <= 0 && z.cards === 34, `zoom 200% de ${w}px (viewport CSS ${Math.round(w / 2)}): 0 overflow, ${z.cards} cartões`);
    await p.close();
  }
  /* rotação 390×844 → 844×390 com o modo aberto */
  {
    const f = await abrir(br, base, 390, 844, { rotas: LIGAR }); const p = f.page;
    await p.evaluate(CONTRATO); await entrar(p); await p.waitForTimeout(400);
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(700);
    const r = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, cards: document.querySelectorAll('.rm-l2-ig-card').length, view: window.RMModes.view }));
    ok(r.ov <= 0 && r.cards === 34 && r.view === 'infografias', `rotação 390×844 → 844×390 com o modo aberto: 0 overflow, ${r.cards} cartões, modo mantido`);
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'e de volta: 0 overflow');
    await p.close();
  }

  /* ============ E · caminho de UI: lateral/drawer → modo ============ */
  console.log('\n===== E · clique na lateral =====');
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const f = await abrir(br, base, w, h, { rotas: LIGAR }); const p = f.page;
    await p.evaluate(CONTRATO);
    if (w < 768) { await p.click('.rm-l2-hamb'); await p.waitForTimeout(350); }
    await p.click('.rm-l2-item[data-view="infografias"]'); await p.waitForTimeout(700);
    const e = await p.evaluate(ESTADO);
    ok(e.view === 'infografias' && e.realVisivel && e.cards === 34, `${w}: clicar «Infografías» na lateral${w < 768 ? ' (drawer)' : ''} abre o catálogo (${e.cards} cartões)`);
    const ch = await p.evaluate(() => document.querySelector('.rm-l2-chip, .rm-l2-band .rm-l2-chip-r') ? document.querySelector('.rm-l2-chip, .rm-l2-band .rm-l2-chip-r').textContent.trim() : '');
    info(`chip da faixa: «${ch}»`);
    if (w < 768) { await p.click('.rm-l2-hamb'); await p.waitForTimeout(350); }
    await p.click('.rm-l2-item[data-view="full"]'); await p.waitForTimeout(1500);
    ok((await p.evaluate(ESTADO)).view === 'full', `${w}: «Página completa» na lateral volta`);
    ok(f.errs.length === 0, `${w}: 0 erros JS`);
    await p.close();
  }

  await br.close(); srv.close();
  process.exit(L.finish('infografias') ? 1 : 0);
})();
