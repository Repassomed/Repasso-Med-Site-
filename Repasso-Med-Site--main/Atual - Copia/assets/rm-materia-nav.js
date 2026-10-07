/* =====================================================================
   REPASSO MED · rm-materia-nav.js
   Navegação do piloto por ÍNDICE GERAL · BLOCO · MODOS ISOLADOS (issue #453)

   Só é carregado por rm-pilot.js, e só quando o servidor responde `visual: true` (o mesmo portão do tema). Depende do Layout V2
   (RMLayout/RMModes) e do tema (RMSistema) já anexados na matéria do piloto; para o resto do mundo este arquivo nunca é baixado.

   O QUE FAZ
     · ABERTURA: mostra a capa, os recursos e o índice geral; os blocos NÃO continuam logo abaixo por rolagem.
     · BLOCO: clicar num card do índice, no índice lateral, num subtítulo ou em um chip abre SÓ o bloco escolhido (as outras seções ficam
       `display:none` — fora da árvore de acessibilidade e do foco) com «Bloque anterior · Volver al índice general · Bloque siguiente».
     · MODOS (Infografías · Preguntas · Flashcards · Audiolibros · Auscultación · Videos): 1.º um índice dos blocos que TÊM aquele recurso
       (contagem derivada do DOM); 2.º só o recurso daquele tipo e daquele bloco. Recurso ausente = acesso ausente.
     · Deep links (#s2-b03 · #s2-b03-s2 · #modo/infografias · #modo/infografias/s2-b03), Back/Forward, foco e rolagem por entrada.

   O ESTADO É UM SÓ: RMModes (view + block). Este módulo escreve nele (`requestView(view, {block})`) e DESENHA a partir dele
   (ouvinte onChange); não existe segunda fonte. Quem muda o store por outro caminho também é desenhado.

   O QUE NÃO FAZ
     · Não move, clona, reescreve nem apaga nenhum nó didático. Texto, ids, block_id, âncoras, questões (e o estado delas), flashcards,
       tabelas, post-its, tinta e áudio ficam onde estão. A vista não escolhida é só ESCONDIDA por atributo (`data-rm-nav-cur`,
       `data-rm-off`), desfeito no detach. UI derivada sempre com [data-rm-ui] e nunca cria p/li/h1–h5/table/figure/blockquote
       dentro de section[id] (fora do índice de âncoras da tinta).
     · Não grava no Supabase, não toca no motor de áudio (rm-audio*), na caneta, nem no schema. Trocar de bloco/modo na MESMA matéria não
       para o áudio; sair da matéria/logout continua parando (rm-audio-boot.js).
     · Qualquer erro em attach() ⇒ detach() completo (rm-pilot.js) e o tema/layout seguem como estavam.
   ===================================================================== */
(function () {
  'use strict';
  if (window.RMNav) return;

  var ROOT = document.documentElement;
  var N = null;                                   // instância ativa
  var NODOS = [], ATRS = [], TEXTOS = [], OUV = [];

  /* --------------------------- utilidades DOM --------------------------- */
  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function ui(tag, cls, attrs) {                  // UI derivada: [data-rm-ui] + rastreada para o detach
    var e = el(tag, cls, attrs);
    e.setAttribute('data-rm-ui', ''); e.setAttribute('data-rm-nav-ui', '');
    NODOS.push(e);
    return e;
  }
  function sa(e, k, v) {                          // atributo posto por nós (desfeito no detach)
    if (!e) return;
    if (!e.hasAttribute(k)) ATRS.push({ e: e, k: k });
    e.setAttribute(k, v);
  }
  function ra(e, k) { if (e && e.hasAttribute(k)) e.removeAttribute(k); }
  function st(e, s) {                             // texto de UI do shell trocado por nós (restaurado no detach)
    if (!e || e.textContent === s) return;
    var jaTem = TEXTOS.some(function (x) { return x.e === e; });
    if (!jaTem) TEXTOS.push({ e: e, t: e.textContent });
    e.textContent = s;
  }
  function on(alvo, tipo, fn, cap) { alvo.addEventListener(tipo, fn, !!cap); OUV.push({ a: alvo, t: tipo, f: fn, c: !!cap }); }
  function q1(r, sel) { return r.querySelector(sel); }
  function qa(r, sel) { return Array.prototype.slice.call(r.querySelectorAll(sel)); }
  function limpo(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function curto(t) { return limpo(t).replace(/\s*\(.*\)\s*$/, ''); }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function esc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '\\$&'); }
  function raf2(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }

  var SVGICO = {
    img:    'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M9 9.5h.01',
    q:      'M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01M4 5h16v14H4z',
    cards:  'M6 7h12v12H6zM9 4h12v12',
    phones: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1z',
    play:   'M8 5l11 7-11 7z',
    wave:   'M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2',
    index:  'M4 6h16M4 12h16M4 18h10',
    prev:   'M15 6l-6 6 6 6',
    next:   'M9 6l6 6-6 6'
  };
  function svg(nome) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '18'); s.setAttribute('height', '18'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.9'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', SVGICO[nome] || SVGICO.index); s.appendChild(p);
    return s;
  }

  /* ------------------------------ recursos reais ------------------------------ */
  var REUNE = /banco|flashcards/i;                  // banco geral / todos os flashcards: as MESMAS entidades dos blocos (fora das contagens)
  function ehInfografia(f) {
    return !!(q1(f, 'figcaption') && q1(f, 'img, .s2-photo[role="img"], img.rmc-photo') && !f.closest('.material-slide, .med-image'));
  }
  function tagPregunta(item) {                      // proveniência REAL gravada pelo conteúdo (nunca inventada)
    var t = q1(item, '[class*="tag"]:not([data-rm-ui])');
    return limpo(t && t.textContent);
  }
  function grupoPregunta(item) {
    var t = tagPregunta(item);
    if (/complement/i.test(t)) return 'comp';
    if (/examen|evaluaci/i.test(t)) return 'exam';
    return 'otra';
  }
  /* Definição de cada modo: nós (para o isolamento) e contagem. `nodes(sec)` devolve os elementos ORIGINAIS que ficam visíveis. */
  var RES = {
    infografias: {
      icon: 'img', un: 'infografía', pl: 'infografías', corto: 'Infografías',
      desc: 'Esquemas y mapas para repasar cada bloque con la vista.',
      nodes: function (sec) { return qa(sec, 'figure').filter(ehInfografia); },
      n: function (sec) { return qa(sec, 'figure').filter(ehInfografia).length; }
    },
    preguntas: {
      icon: 'q', un: 'pregunta', pl: 'preguntas', corto: 'Preguntas',
      desc: 'Basadas en examen y complementarias, con resolución.',
      nodes: function (sec) { var c = qa(sec, 'details.s2-quiz-card'); return c.length ? c : qa(sec, '.quiz-section'); },
      n: function (sec) { return qa(sec, '.quiz-item').length; }
    },
    flashcards: {
      icon: 'cards', un: 'tarjeta', pl: 'tarjetas', corto: 'Flashcards',
      desc: 'Repaso activo: un mazo por bloque.',
      nodes: function (sec) {
        var out = [];
        qa(sec, '.rmfc-launch, .fc-grid').forEach(function (n) { out.push(n); });
        qa(sec, '.rmfc-launch').forEach(function (l) {          // o subtítulo «Flashcards del bloque» (irmão anterior) acompanha o lançador
          var p = l.previousElementSibling; while (p && p.tagName !== 'H3' && !/rmfc-launch|fc-grid/.test(p.className || '')) p = p.previousElementSibling;
          if (p && p.tagName === 'H3' && out.indexOf(p) === -1) out.push(p);
        });
        return out;
      },
      n: function (sec) { return qa(sec, '.flashcard').length; }
    },
    audiobooks: {
      icon: 'phones', un: 'audiolibro', pl: 'audiolibros', corto: 'Audiolibros',
      desc: 'Escucha el resumen de cada bloque.',
      nodes: function (sec) { return qa(sec, '.rm-audio-card'); },
      n: function (sec) { return qa(sec, '.rm-audio-card').length; }
    },
    auscultacion: {
      icon: 'wave', un: 'sonido', pl: 'sonidos', corto: 'Auscultación',
      desc: 'Escucha e identifica los sonidos.',
      nodes: function (sec) {
        var out = [];
        qa(sec, '.audio-player').forEach(function (a) {
          out.push(a);
          var n = a.nextElementSibling; if (n && /\bs2-cap\b|\bmed-image-caption\b/.test(n.className || '')) out.push(n);
        });
        if (!out.length) qa(sec, 'audio').forEach(function (a) { out.push(a); });
        return out;
      },
      n: function (sec) { return qa(sec, 'audio').length; }
    },
    videos: {
      icon: 'play', un: 'video', pl: 'videos', corto: 'Videos',
      desc: 'Videos del bloque.',
      nodes: function (sec) { return qa(sec, 'details.video-collapsible'); },
      n: function (sec) { return qa(sec, 'details.video-collapsible').length; }
    }
  };
  /* cartão de recurso da capa (layout) → modo */
  var K2MODO = { fig: 'infografias', quiz: 'preguntas', fc: 'flashcards', aud: 'auscultacion', vid: 'videos', ab: 'audiobooks' };

  /* -------------------------------- seções -------------------------------- */
  function lerSecs() {
    var base = (window.RMSistema && RMSistema.secciones && RMSistema.secciones()) || [];
    return base.map(function (s) {
      return { id: s.id, el: s.el, c: s.c, titulo: s.titulo, unidad: s.unidad || '', n: s.n };
    });
  }
  function secPorId(id) { for (var i = 0; i < N.secs.length; i++) if (N.secs[i].id === id) return N.secs[i]; return null; }
  function indiceDe(id) { for (var i = 0; i < N.secs.length; i++) if (N.secs[i].id === id) return i; return -1; }
  function nomeBloco(s) {
    if (!s) return '';
    var t = curto(s.titulo);
    if (s.c.tipo === 'bloque') return 'Bloque ' + s.c.n + ' · ' + t;
    if (s.c.tipo === 'guia') return 'Punto de partida · ' + t;
    return t;
  }
  function modosDisponiveis() { return window.RMModes.disponiveis().map(function (m) { return m.id; }); }
  function modoOk(m) { return !!RES[m] && modosDisponiveis().indexOf(m) !== -1; }
  /* seções com recurso do modo (a ordem do conteúdo); banco/flashcards gerais ficam de fora (revisão geral à parte) */
  function secsDoModo(m) {
    return N.secs.filter(function (s) { return !REUNE.test(s.id) && RES[m].n(s.el) > 0; });
  }

  /* --------------------------------- estado --------------------------------- */
  function estadoAtual() {
    var v = window.RMModes.view, b = window.RMModes.block;
    if (v === 'full') return b ? { view: 'block', block: b } : { view: 'index' };
    return b ? { view: 'modeblk', mode: v, block: b } : { view: 'modeidx', mode: v };
  }
  function normalizar(spec) {
    if (!spec) return null;
    var v = spec.view, o = { view: v, mode: spec.mode || null, block: spec.block || null, sub: spec.sub || null, alvoEl: spec.alvoEl || null };
    if (v === 'index') { o.mode = null; o.block = null; o.sub = null; return o; }
    if (v === 'block') { if (!o.block || !secPorId(o.block)) return null; return o; }
    if (v === 'modeidx' || v === 'modeblk') {
      if (!o.mode || !modoOk(o.mode)) return null;
      if (v === 'modeblk') {
        var s = o.block && secPorId(o.block);
        if (!s) return { view: 'modeidx', mode: o.mode, block: null, sub: null, alvoEl: null };
        if (!REUNE.test(s.id) && RES[o.mode].n(s.el) === 0) return { view: 'modeidx', mode: o.mode, block: null, sub: null, alvoEl: null };   // sem recurso: acesso ausente
      }
      return o;
    }
    return null;
  }
  function hashDe(e) {
    if (e.view === 'index') return '';
    if (e.view === 'block') return '#' + (e.sub || e.block);
    return '#modo/' + e.mode + (e.view === 'modeblk' ? '/' + e.block : '');
  }
  function estadoDeHash(h) {
    h = String(h || '').replace(/^#/, '');
    if (!h) return { view: 'index' };
    var p = h.split('/');
    if (p[0] === 'modo' && p[1]) {
      if (p[2]) return { view: 'modeblk', mode: p[1], block: p[2] };
      return { view: 'modeidx', mode: p[1] };
    }
    if (h.indexOf('=') !== -1) return null;                       // outro uso do hash (tokens de recuperação etc.): não é nosso
    var s = secPorId(h);
    if (s) return { view: 'block', block: s.id };
    var alvo = null; try { alvo = N.tab.querySelector('#' + esc(h)); } catch (e) {}
    var sec = alvo && alvo.closest('section[id]');
    if (sec && secPorId(sec.id)) return { view: 'block', block: sec.id, sub: h };
    return null;
  }
  function igual(a, b) { return !!a && !!b && a.view === b.view && (a.mode || null) === (b.mode || null) && (a.block || null) === (b.block || null) && (a.sub || null) === (b.sub || null); }

  /* ------------------------------ histórico ------------------------------ */
  function url(e) { return location.pathname + location.search + hashDe(e); }
  function guardarY() {
    try { var s = history.state; if (s && s.rmNav) history.replaceState({ rmNav: 1, st: s.st, y: window.pageYOffset || 0 }, '', location.href); } catch (e) {}
  }
  function empurrar(e) {
    try { history.pushState({ rmNav: 1, st: e, y: 0 }, '', url(e)); } catch (x) {}
  }
  function substituir(e) {
    try { history.replaceState({ rmNav: 1, st: e, y: 0 }, '', url(e)); } catch (x) {}
  }

  /* ------------------------------ ir (porta única) ------------------------------ */
  /* spec: { view, mode?, block?, sub? , alvoEl? } ; o: { push (padrão true), y (restaura rolagem), foco (padrão true) } */
  function go(spec, o) {
    if (!N) return false;
    o = o || {};
    var v = normalizar(spec); if (!v) return false;
    var rmView = (v.view === 'index' || v.view === 'block') ? 'full' : v.mode;
    var rmBlock = (v.view === 'block' || v.view === 'modeblk') ? v.block : null;
    N.pend = { sub: v.sub, alvoEl: v.alvoEl, push: o.push !== false, y: o.y, foco: o.foco !== false, spec: v };
    N.emitido = false;
    if (N.pend.push) guardarY();                                   // a posição da entrada que está saindo
    var ok = window.RMModes.requestView(rmView, { block: rmBlock, restaurar: false });
    if (!ok) { N.pend = null; return false; }
    if (!N.emitido) aoMudar();                                      // mesmo estado (ou só a âncora mudou): redesenha/rola sem troca de store
    return true;
  }

  /* ------------------------------ desenho ------------------------------ */
  function aoMudar() {
    if (!N) return;
    N.emitido = true;
    var e = estadoAtual(), pend = N.pend; N.pend = null;
    if (pend && pend.spec && pend.spec.sub && e.view === 'block') e.sub = pend.spec.sub;
    N.estado = e;
    desenhar(e, pend);
  }

  function desenhar(e, pend) {
    ROOT.setAttribute('data-rm-nav', e.view);
    if (e.mode) ROOT.setAttribute('data-rm-nav-mode', e.mode); else ROOT.removeAttribute('data-rm-nav-mode');
    marcarAtual(e);
    isolar(e);
    atualizarRaiz(e);
    atualizarCrumbPager(e);
    atualizarTinta(e);
    atualizarChrome(e);
    /* rolagem: o bloco certo já está visível (display), só então se foca o subtítulo/recurso */
    var y = pend && typeof pend.y === 'number' ? pend.y : null;
    var cont = function () {
      if (!N) return;
      if (y !== null) { try { window.scrollTo(0, y); } catch (x) {} }
      else if (e.view === 'block' && pend && (pend.alvoEl || pend.sub)) {
        var alvo = pend.alvoEl || (pend.sub && N.tab.querySelector('#' + esc(pend.sub)));
        if (alvo && alvo.isConnected && window.RMLayout) window.RMLayout.irPara(alvo);
      } else if (e.view === 'block') { var s = secPorId(e.block); if (s && window.RMLayout) window.RMLayout.irPara(s.el); }
      else if (e.view === 'modeblk') rolarPara(N.crumb || null);
      else { try { window.scrollTo(0, 0); } catch (x) {} }
      if (pend && pend.foco) focar(e);
      /* a tinta acompanha o conteúdo que assentou (único caminho até a V2: coalescido, nunca durante o contato da caneta) */
      try { if (window.RMLayout && window.RMLayout.pedirReposicao) window.RMLayout.pedirReposicao(); } catch (x) {}
      try { window.dispatchEvent(new Event('scroll')); } catch (x) {}   // o scroll-spy do layout relê o bloco atual
    };
    if (e.view === 'index' || y !== null) cont(); else requestAnimationFrame(cont);
    if (pend && pend.push) {
      var atual = history.state && history.state.rmNav ? history.state.st : null;
      if (!igual(atual, e)) empurrar(e); else substituir(e);
    }
  }

  function rolarPara(n) {
    var h = (window.RMLayout && window.RMLayout.hdrH && window.RMLayout.hdrH()) || 52;
    var t = n ? Math.max(0, n.getBoundingClientRect().top + (window.pageYOffset || 0) - h - 10) : 0;
    try { window.scrollTo(0, t); } catch (e) {}
  }
  function focar(e) {
    var alvo = e.view === 'index' ? q1(N.tab, '.rm-l2-cover-title') : (e.view === 'modeidx' ? q1(N.root, '.rm-nav-mh h2') : (N.here || null));
    if (!alvo) return;
    try { if (!alvo.hasAttribute('tabindex')) { alvo.setAttribute('tabindex', '-1'); ATRS.push({ e: alvo, k: 'tabindex' }); } alvo.focus({ preventScroll: true }); } catch (x) {}
  }

  /* seção atual (única visível nos modos de bloco) */
  function marcarAtual(e) {
    N.secs.forEach(function (s) {
      var cur = (e.view === 'block' || e.view === 'modeblk') && s.id === e.block;
      if (cur) sa(s.el, 'data-rm-nav-cur', ''); else ra(s.el, 'data-rm-nav-cur');
    });
  }

  /* isolamento por tipo: dentro da seção atual esconde tudo o que não é o recurso (nem o caminho até ele). Só atributos. */
  var CAB = ':scope > .rm-sis-vig, :scope > .rm-sis-tag, :scope > h2, :scope > .rm-sis-meta, :scope > .rm-sis-bend, :scope > .section-marker, :scope > .rm-block-head';
  function desisolar() {
    qa(N.tab, '[data-rm-off]').forEach(function (n) { n.removeAttribute('data-rm-off'); });
    N.isolado = null;
  }
  function isolar(e) {
    desisolar();
    if (e.view !== 'modeblk') return;
    var s = secPorId(e.block); if (!s) return;
    var picks = REUNE.test(s.id) ? [] : RES[e.mode].nodes(s.el);
    if (REUNE.test(s.id)) return;                                   // seção geral (banco/flashcards gerais): leitura completa, sem isolar
    var keep = [], path = [];
    picks.forEach(function (n) {
      keep.push(n);
      var a = n.parentElement; while (a && a !== s.el) { if (path.indexOf(a) === -1) path.push(a); a = a.parentElement; }
    });
    qa(s.el, CAB).forEach(function (h) { keep.push(h); });
    (function visitar(pai) {
      Array.prototype.forEach.call(pai.children, function (c) {
        if (keep.indexOf(c) !== -1) return;
        if (path.indexOf(c) !== -1) { visitar(c); return; }
        c.setAttribute('data-rm-off', '');
      });
    })(s.el);
    N.isolado = { sec: s.el, mode: e.mode };
    if (e.mode === 'preguntas') filtrarPreguntas(N.filtro || 'todas');
  }

  /* Preguntas: agrupar «Basadas en preguntas de examen» × «Complementarias» sem mover nada — só esconde/mostra os itens. */
  function gruposDe(sec) {
    var itens = qa(sec, '.quiz-item'), g = { exam: 0, comp: 0, otra: 0 };
    itens.forEach(function (i) { g[grupoPregunta(i)]++; });
    g.total = itens.length;
    g.ok = g.exam > 0 && g.comp > 0 && g.otra === 0;                // só quando a proveniência REAL cobre todos os itens e há os dois grupos
    return g;
  }
  function filtrarPreguntas(f) {
    if (!N.isolado) return;
    N.filtro = f;
    var sec = N.isolado.sec;
    qa(sec, '.quiz-item').forEach(function (i) {
      var g = grupoPregunta(i), esconder = (f === 'exam' && g !== 'exam') || (f === 'comp' && g !== 'comp');
      if (esconder) i.setAttribute('data-rm-off', ''); else i.removeAttribute('data-rm-off');
    });
    qa(sec, '.quiz-section').forEach(function (qs) {                // grupo sem nenhum item visível: esconde também o subtítulo do grupo
      var vis = qa(qs, '.quiz-item').some(function (i) { return !i.hasAttribute('data-rm-off'); });
      if (vis) qs.removeAttribute('data-rm-off'); else if (f !== 'todas') qs.setAttribute('data-rm-off', ''); else qs.removeAttribute('data-rm-off');
    });
    if (N.filtroBar) qa(N.filtroBar, 'button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === f)); });
  }

  /* tinta: só os traços do bloco visível aparecem (a camada é uma só, global; os SVG de blocos ocultos ficariam num canto) */
  function atualizarTinta(e) {
    /* Os SVGs de traço (#rm2-ink) são da V2 e ficam ancorados a nós que a navegação oculta. A regra é por ESTADO, nunca vazia:
       · block   → só os do bloco aberto aparecem (os de qualquer outro bloco: display:none);
       · index · modeidx · modeblk → nenhum aparece (a leitura contínua não está à vista; em modo isolado a V2 já esconde a raiz #rm2-ink, e aqui o SVG também
         fica display:none em vez de depender só dela). Os nós/IDs/paths não são tocados: ao reabrir o bloco o MESMO SVG volta ancorado e a V2 reposiciona (pedirReposicao). */
    var regra;
    if (e.view === 'block') {
      var a = String(e.block).replace(/"/g, '');
      regra = 'html.rm-nav[data-rm-nav="block"] #rm2-ink svg[data-anchor]:not([data-anchor="' + a + '"]):not([data-anchor^="' + a + '>"]) { display: none !important; }';
    } else regra = 'html.rm-nav:not([data-rm-nav="block"]) #rm2-ink svg[data-anchor] { display: none !important; }';
    if (!N.ink) { N.ink = el('style', '', { id: 'rm-nav-ink' }); document.head.appendChild(N.ink); }
    N.ink.textContent = regra;
  }

  /* --------------------- chrome: lateral, faixa, rótulos --------------------- */
  function etiqueta(e) {
    e = e || (N && N.estado); if (!e) return null;
    if (e.view === 'index') return 'Inicio · índice general';
    var s = e.block && secPorId(e.block), m = e.mode && RES[e.mode] ? RES[e.mode].corto : '';
    if (e.view === 'block') return nomeBloco(s);
    if (e.view === 'modeidx') return 'Modo · ' + m;
    return m + ' · ' + nomeBloco(s);
  }
  function atualizarChrome(e) {
    var lat = document.getElementById('rm-l2-side');
    if (lat) {
      var full = q1(lat, '.rm-l2-item[data-view="full"]');
      if (full) { var lb = q1(full, '.lbl'); if (lb) st(lb, 'Índice general'); full.title = 'Índice general'; full.classList.toggle('is-active', e.view === 'index'); if (e.view === 'index') full.setAttribute('aria-current', 'page'); else full.removeAttribute('aria-current'); }
      qa(lat, '.rm-l2-item[data-view]:not([data-view="full"])').forEach(function (b) {
        var on_ = (b.getAttribute('data-view') === e.mode) && (e.view === 'modeidx' || e.view === 'modeblk');
        b.classList.toggle('is-active', on_); if (on_) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      });
      /* bloco atual na árvore */
      qa(lat, '.rm-l2-block').forEach(function (row) {
        var id = row.getAttribute('data-block'), a = q1(row, '.rm-l2-block-link');
        var cur = (e.view === 'block' || e.view === 'modeblk') && id === e.block;
        if (a) { if (cur) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); }
        if (cur) { var o = q1(row, '.rm-l2-block-open'); var body = q1(row, '.rm-l2-block-body'); if (body && body.hidden && o) { body.hidden = false; o.setAttribute('aria-expanded', 'true'); row.classList.add('is-open'); } }
      });
    }
    var chip = q1(document, '#rm-l2-band .rm-l2-chip');
    if (chip) st(chip, e.view === 'index' ? 'Índice general' : (e.mode ? RES[e.mode].corto : 'Bloque'));
    try { if (window.RMSistema && RMSistema.refletir) RMSistema.refletir(); } catch (x) {}
  }

  /* ---------------------------- migalha e pager ---------------------------- */
  function ligacao(txt_, href, cls, ico, dir) {
    var a = ui('a', cls, { href: href });
    if (ico && dir !== 'right') a.appendChild(svg(ico));
    var sp = el('span'); sp.textContent = txt_; a.appendChild(sp);
    if (ico && dir === 'right') a.appendChild(svg(ico));
    return a;
  }
  function montarCrumbPager() {
    N.crumb = ui('div', 'rm-nav-crumb');
    N.crumbBack = ligacao('Índice general', '#', 'rm-nav-back', 'prev'); N.crumb.appendChild(N.crumbBack);
    var mid = el('span', 'rm-nav-here', { role: 'heading', 'aria-level': '1' }); N.here = mid; N.crumb.appendChild(mid);
    N.crumbFull = ligacao('Ver el bloque completo', '#', 'rm-nav-full', 'next', 'right'); N.crumb.appendChild(N.crumbFull);
    N.filtroBar = ui('div', 'rm-nav-filtro', { role: 'group', 'aria-label': 'Agrupar preguntas' });
    N.crumb.appendChild(N.filtroBar);
    N.pager = ui('nav', 'rm-nav-pager', { 'aria-label': 'Navegación entre bloques' });
    N.pPrev = ui('a', 'rm-nav-prev', { href: '#' }); N.pIdx = ui('a', 'rm-nav-idx', { href: '#' }); N.pNext = ui('a', 'rm-nav-next', { href: '#' });
    N.pager.appendChild(N.pPrev); N.pager.appendChild(N.pIdx); N.pager.appendChild(N.pNext);
  }
  function preencherLink(a, kicker, titulo, ico, dir) {
    while (a.firstChild) a.removeChild(a.firstChild);
    if (!titulo) { a.hidden = true; a.removeAttribute('data-go'); return; }
    a.hidden = false;
    if (dir === 'left') a.appendChild(svg(ico));
    var tx = el('span', 'rm-nav-tx'); var k = el('small'); k.textContent = kicker; var b = el('b'); b.textContent = titulo; tx.appendChild(k); tx.appendChild(b); a.appendChild(tx);
    if (dir === 'right') a.appendChild(svg(ico));
  }
  function vizinhos(e) {
    var lista = e.view === 'modeblk' ? secsDoModo(e.mode) : N.secs;
    var i = -1; for (var k = 0; k < lista.length; k++) if (lista[k].id === e.block) i = k;
    return { prev: i > 0 ? lista[i - 1] : null, next: i >= 0 && i < lista.length - 1 ? lista[i + 1] : null };
  }
  function setGo(a, spec) { a.setAttribute('data-go', JSON.stringify({ view: spec.view, mode: spec.mode || null, block: spec.block || null })); a.setAttribute('href', hashDe(spec) || '#'); }
  function atualizarCrumbPager(e) {
    if (!N.crumb) return;
    var comBloco = e.view === 'block' || e.view === 'modeblk';
    var s = comBloco && secPorId(e.block);
    if (!comBloco || !s) { if (N.crumb.parentNode) N.crumb.parentNode.removeChild(N.crumb); if (N.pager.parentNode) N.pager.parentNode.removeChild(N.pager); return; }
    s.el.parentNode.insertBefore(N.crumb, s.el);
    s.el.parentNode.insertBefore(N.pager, s.el.nextSibling);
    var v = vizinhos(e), modo = e.mode && RES[e.mode];
    N.crumb.setAttribute('data-rm-cap', String(s.c.cap));
    N.pager.setAttribute('data-rm-cap', String(s.c.cap));
    var lbl = N.crumbBack.querySelector('span');
    if (e.view === 'block') {
      lbl.textContent = 'Índice general'; setGo(N.crumbBack, { view: 'index' });
      N.here.textContent = (s.unidad ? 'Unidad ' + s.unidad + ' · ' : '') + nomeBloco(s);
      N.crumbFull.hidden = true; N.filtroBar.hidden = true;
    } else {
      lbl.textContent = modo.corto + ' · bloques'; setGo(N.crumbBack, { view: 'modeidx', mode: e.mode });
      N.here.textContent = modo.corto + ' · ' + nomeBloco(s);
      N.crumbFull.hidden = REUNE.test(s.id); setGo(N.crumbFull, { view: 'block', block: s.id });
      montarFiltro(s, e);
    }
    preencherLink(N.pPrev, e.view === 'modeblk' ? 'Anterior · ' + modo.corto : 'Bloque anterior', v.prev ? curto(v.prev.titulo) : '', 'prev', 'left');
    preencherLink(N.pNext, e.view === 'modeblk' ? 'Siguiente · ' + modo.corto : 'Bloque siguiente', v.next ? curto(v.next.titulo) : '', 'next', 'right');
    if (v.prev) setGo(N.pPrev, { view: e.view, mode: e.mode, block: v.prev.id });
    if (v.next) setGo(N.pNext, { view: e.view, mode: e.mode, block: v.next.id });
    while (N.pIdx.firstChild) N.pIdx.removeChild(N.pIdx.firstChild);
    N.pIdx.appendChild(svg('index'));
    var t = el('span'); t.textContent = e.view === 'modeblk' ? 'Volver a ' + modo.corto : 'Volver al índice general'; N.pIdx.appendChild(t);
    setGo(N.pIdx, e.view === 'modeblk' ? { view: 'modeidx', mode: e.mode } : { view: 'index' });
  }
  function montarFiltro(s, e) {
    var bar = N.filtroBar; while (bar.firstChild) bar.removeChild(bar.firstChild);
    var g = (e.mode === 'preguntas' && !REUNE.test(s.id)) ? gruposDe(s.el) : null;
    if (!g || !g.ok) { bar.hidden = true; N.filtro = 'todas'; return; }
    bar.hidden = false;
    [['todas', 'Todas', g.total], ['exam', 'Basadas en preguntas de examen', g.exam], ['comp', 'Complementarias', g.comp]].forEach(function (d) {
      var b = el('button', 'rm-nav-chipf', { type: 'button', 'data-f': d[0], 'aria-pressed': String((N.filtro || 'todas') === d[0]) });
      b.appendChild(document.createTextNode(d[1] + ' '));
      var c = el('b'); c.textContent = String(d[2]); b.appendChild(c); bar.appendChild(b);
    });
  }

  /* ------------------------- índice dos modos (raiz) ------------------------- */
  function cartao(s, sub, hrefSpec, extra) {
    var a = el('a', 'rm-sis-card', { href: hashDe(hrefSpec) || '#', 'data-rm-cap': String(s.c.cap), 'data-go': JSON.stringify({ view: hrefSpec.view, mode: hrefSpec.mode || null, block: hrefSpec.block || null }) });
    var n = el('span', 'rm-sis-card-n'); n.textContent = s.c.n; a.appendChild(n);
    var tx = el('span', 'rm-sis-card-t'); var b = el('b'); b.textContent = curto(s.titulo); tx.appendChild(b);
    if (sub) { var i = el('i'); i.textContent = sub; tx.appendChild(i); }
    if (extra) { var x = el('em', 'rm-nav-card-x'); x.textContent = extra; tx.appendChild(x); }
    a.appendChild(tx);
    return a;
  }
  function atualizarRaiz(e) {
    var r = N.root; if (!r) return;
    while (r.firstChild) r.removeChild(r.firstChild);
    if (e.view !== 'modeidx') return;
    var m = RES[e.mode], lista = secsDoModo(e.mode);
    var box = el('section', 'rm-nav-modeidx', { 'data-mode': e.mode, 'aria-label': m.corto });
    var cab = el('header', 'rm-nav-mh');
    var back = el('a', 'rm-nav-back', { href: '#', 'data-go': JSON.stringify({ view: 'index' }) }); back.appendChild(svg('prev')); var bl = el('span'); bl.textContent = 'Índice general'; back.appendChild(bl); cab.appendChild(back);
    var tot = lista.reduce(function (a, s) { return a + m.n(s.el); }, 0);
    var h = el('h2'); h.textContent = m.corto; cab.appendChild(h);
    var p = el('p'); p.textContent = plural(tot, m.un, m.pl) + ' en ' + plural(lista.length, 'bloque', 'bloques') + ' — elige un bloque. ' + m.desc; cab.appendChild(p);
    box.appendChild(cab);
    var por = {}, orden = [];
    lista.forEach(function (s) { var u = s.c.tipo === 'bloque' ? (s.unidad || '·') : (s.c.tipo === 'guia' ? 'G' : 'R'); if (!por[u]) { por[u] = []; orden.push(u); } por[u].push(s); });
    var tema = (window.RMSistema && RMSistema.TEMAS && RMSistema.TEMAS[N.slug]) || {};
    orden.forEach(function (u) {
      var g = el('div', 'rm-sis-idx-g'); var l = el('div', 'rm-sis-ulab'); var b = el('b');
      var nom = tema.unidades && tema.unidades[u] ? tema.unidades[u].nombre : '';
      b.textContent = u === 'G' ? 'PUNTO DE PARTIDA' : (u === 'R' ? 'REPASO' : 'UNIDAD ' + u); l.appendChild(b);
      if (nom) { var sp = el('span'); sp.textContent = nom; l.appendChild(sp); } l.appendChild(el('i')); g.appendChild(l);
      var grid = el('div', 'rm-sis-idx-grid');
      por[u].forEach(function (s) {
        var n = m.n(s.el), sub = plural(n, m.un, m.pl), extra = '';
        if (e.mode === 'preguntas') { var gr = gruposDe(s.el); if (gr.ok) extra = gr.exam + ' de examen · ' + gr.comp + ' complementarias'; }
        grid.appendChild(cartao(s, sub, { view: 'modeblk', mode: e.mode, block: s.id }, extra));
      });
      g.appendChild(grid); box.appendChild(g);
    });
    /* revisión general (as MESMAS entidades dos blocos: fora da contagem acima, sem segunda cópia) */
    var geral = N.secs.filter(function (s) { return (e.mode === 'preguntas' && /banco/i.test(s.id)) || (e.mode === 'flashcards' && /flashcards/i.test(s.id)); });
    if (geral.length) {
      var gg = el('div', 'rm-sis-idx-g'); var ll = el('div', 'rm-sis-ulab'); var bb = el('b'); bb.textContent = 'REVISIÓN GENERAL'; ll.appendChild(bb);
      var ss = el('span'); ss.textContent = 'repite las de los bloques; no suma a las cuentas'; ll.appendChild(ss); ll.appendChild(el('i')); gg.appendChild(ll);
      var gr2 = el('div', 'rm-sis-idx-grid');
      geral.forEach(function (s) { gr2.appendChild(cartao(s, plural(RES[e.mode].n(s.el), m.un, m.pl) + ' · revisión general', { view: 'block', block: s.id })); });
      gg.appendChild(gr2); box.appendChild(gg);
    }
    r.appendChild(box);
  }

  /* --------------------------------- eventos --------------------------------- */
  function dadosGo(a) { try { return JSON.parse(a.getAttribute('data-go')); } catch (e) { return null; } }
  function fecharGaveta() {
    var lat = document.getElementById('rm-l2-side');
    if (lat && lat.classList.contains('is-open')) { var c = q1(lat, '.rm-l2-close'); if (c) c.click(); }
  }
  function aoClicarGlobal(ev) {                                    // pager, migalha, cartões do índice de modos, filtro de preguntas
    var t = ev.target; if (!t || !t.closest) return;
    var f = t.closest('.rm-nav-chipf');
    if (f && N.crumb && N.crumb.contains(f)) { ev.preventDefault(); filtrarPreguntas(f.getAttribute('data-f')); return; }
    var a = t.closest('a[data-go]'); if (!a) return;
    if (!(N.pager && N.pager.contains(a)) && !(N.crumb && N.crumb.contains(a)) && !(N.root && N.root.contains(a))) return;
    var d = dadosGo(a); if (!d) return;
    ev.preventDefault();
    go(d);
  }
  function aoClicarLateral(ev) {
    var t = ev.target; if (!t || !t.closest) return;
    var lat = document.getElementById('rm-l2-side');
    var modo = t.closest('.rm-l2-item[data-view]');
    if (modo) {
      var v = modo.getAttribute('data-view');
      if (v === 'full') {
        if (ROOT.getAttribute('data-rm-lmode') === 'rail' && N.estado && N.estado.view === 'index' && !lat.classList.contains('is-open')) return;   // trilho: o ícone abre o índice (layout)
        ev.preventDefault(); ev.stopImmediatePropagation(); fecharGaveta(); go({ view: 'index' }); return;
      }
      ev.preventDefault(); ev.stopImmediatePropagation(); fecharGaveta(); go({ view: 'modeidx', mode: v }); return;
    }
    var chip = t.closest('.rm-l2-chip-r');
    if (chip) {
      var row = chip.closest('[data-block]'); if (!row) return;
      ev.preventDefault(); ev.stopImmediatePropagation(); fecharGaveta();
      var alvo = chip._alvoNav || chip._alvo;
      go({ view: 'block', block: row.getAttribute('data-block'), alvoEl: alvo && alvo.isConnected !== false ? alvo : null });
      return;
    }
    var link = t.closest('a[data-target]');
    if (link) {
      ev.preventDefault(); ev.stopImmediatePropagation(); fecharGaveta();
      irParaAlvo(N.tab.querySelector('#' + esc(link.getAttribute('data-target'))));
    }
  }
  function aoClicarCapa(ev) {
    var t = ev.target; if (!t || !t.closest) return;
    var ab = t.closest('[data-rm-ab]');
    if (ab) { ev.preventDefault(); ev.stopImmediatePropagation(); go({ view: 'modeidx', mode: 'audiobooks' }); return; }
    var rc = t.closest('[data-res]');
    if (rc && window.RMLayout) {
      var r = window.RMLayout.recursos()[+rc.getAttribute('data-res')];
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (!r || r.k === 'res') { abrirIndice(true); return; }
      if (K2MODO[r.k]) go({ view: 'modeidx', mode: K2MODO[r.k] });
      return;
    }
    var act = t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'go') { ev.preventDefault(); ev.stopImmediatePropagation(); var primeiro = N.secs[0]; if (primeiro) go({ view: 'block', block: primeiro.id }); }
      else if (a === 'idx') { ev.preventDefault(); ev.stopImmediatePropagation(); var g = q1(N.tab, '.rm-sis-idx'); if (g) { var h = (window.RMLayout && window.RMLayout.hdrH && window.RMLayout.hdrH()) || 52; window.scrollTo(0, Math.max(0, g.getBoundingClientRect().top + (window.pageYOffset || 0) - h - 8)); } }
    }
  }
  function abrirIndice(rolarGrade) {
    go({ view: 'index' });
    if (rolarGrade) requestAnimationFrame(function () { var g = N && q1(N.tab, '.rm-sis-idx'); if (g) { var h = (window.RMLayout && window.RMLayout.hdrH && window.RMLayout.hdrH()) || 52; window.scrollTo(0, Math.max(0, g.getBoundingClientRect().top + (window.pageYOffset || 0) - h - 8)); } });
  }
  /* o índice do app-core (.rm-menu, oculto no piloto) e a V2 («Mis apuntes») ainda mandam o aluno a um bloco por link programático:
     o bloco é aberto ANTES de o app-core medir/rolar, senão ele rolaria até uma seção escondida */
  function aoClicarMenuCore(ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('.rm-menu a[data-target]'); if (!a || !N) return;
    var alvo = N.tab.querySelector('#' + esc(a.getAttribute('data-target')));
    if (alvo) irParaAlvo(alvo, { semRolar: true });
  }
  function irParaAlvo(alvo, o) {
    if (!N || !alvo) return false;
    var sec = alvo.closest ? alvo.closest('section[id]') : null;
    if (!sec || !secPorId(sec.id)) return false;
    var ehSec = alvo === sec;
    if (o && o.semRolar) return go({ view: 'block', block: sec.id, sub: null, alvoEl: null }, { push: true });
    return go({ view: 'block', block: sec.id, sub: !ehSec && alvo.id ? alvo.id : null, alvoEl: ehSec ? null : alvo });
  }
  function aoPopState(ev) {
    if (!N) return;
    var s = ev.state && ev.state.rmNav ? ev.state.st : estadoDeHash(location.hash);
    if (!s) s = { view: 'index' };
    var y = ev.state && ev.state.rmNav && typeof ev.state.y === 'number' ? ev.state.y : undefined;
    if (!go(s, { push: false, y: y })) go({ view: 'index' }, { push: false });
  }

  /* ----------------------- audiolibros: chegam depois do manifesto ----------------------- */
  function sincronizarAudio() {
    if (!N) return;
    var cards = qa(N.tab, 'section[id] .rm-audio-card');
    var chave = cards.map(function (c) { return c.getAttribute('data-audio-id') || ''; }).join('|');
    if (chave === N.audioChave) return;
    N.audioChave = chave;
    try { window.RMLayout.atualizarModos(); } catch (e) {}
    /* chip «Audiolibro» na árvore de cada bloco que ganhou card REAL */
    qa(document, '#rm-l2-side .rm-l2-chip-r.t-ab').forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
    N.secs.forEach(function (s) {
      var card = q1(s.el, '.rm-audio-card'); if (!card) return;
      var row = q1(document, '#rm-l2-side .rm-l2-block[data-block="' + s.id.replace(/"/g, '') + '"]'); if (!row) return;
      var body = q1(row, '.rm-l2-block-body'), chips = body && q1(body, '.rm-l2-chips');
      if (body && !chips) { chips = ui('div', 'rm-l2-chips'); body.insertBefore(chips, body.firstChild); }
      if (!chips) return;
      var b = ui('button', 'rm-l2-chip-r t-ab', { type: 'button', title: 'Audiolibro de este bloque' }); b.textContent = 'Audiolibro'; b._alvoNav = card; chips.appendChild(b);
    });
    /* cartão de recurso da capa + pílula da faixa */
    qa(N.tab, '[data-rm-ab]').forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    qa(document, '#rm-l2-band [data-rm-ab]').forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    var m = secsDoModo('audiobooks'), total = m.reduce(function (a, s) { return a + RES.audiobooks.n(s.el); }, 0);
    if (total) {
      var fila = q1(N.tab, '.rm-l2-res');
      if (fila) {
        var c = ui('button', 'rm-l2-rescard rm-l2-rescard--ab', { type: 'button', 'data-rm-ab': '', 'aria-label': 'Audiolibros: ' + plural(total, 'audiolibro', 'audiolibros') });
        var ic = ui('span', 'rm-l2-rescard-ico'); ic.appendChild(svg('phones')); c.appendChild(ic);
        var tx = ui('span', 'rm-l2-rescard-tx'); var tt = ui('b', 'rm-l2-rescard-t'); tt.textContent = 'Audiolibros'; var ss = ui('span', 'rm-l2-rescard-s'); ss.textContent = 'Escucha el resumen de cada bloque'; tx.appendChild(tt); tx.appendChild(ss); c.appendChild(tx);
        c.setAttribute('data-rm-n', String(total));
        var ar = ui('span', 'rm-l2-rescard-go'); ar.appendChild(svg('next')); c.appendChild(ar);
        var aus = q1(fila, '.rm-l2-rescard--aud');
        fila.insertBefore(c, aus || null);
      }
      var pills = q1(document, '#rm-l2-band .rm-sis-modes');
      if (pills) { var p = ui('button', 'rm-sis-pill', { type: 'button', 'data-rm-ab': '', 'data-rm-k': 'ab' }); p.textContent = 'Audiolibros'; var au2 = q1(pills, '.rm-sis-pill[data-rm-k="aud"]'); pills.insertBefore(p, au2 || null); }
    }
    if (N.hashAudio) {                                                          // deep link de audiolibros que esperava os cards
      var h = N.hashAudio; N.hashAudio = null;
      var ini = location.hash === h && N.estado && N.estado.view === 'index' ? estadoDeHash(h) : null, alvo = ini && normalizar(ini);
      if (alvo && alvo.view !== 'index') { go(alvo, { push: false, foco: false }); substituir(estadoAtual()); return; }
      if (location.hash === h) substituir({ view: 'index' });
    }
    if (N.estado && (N.estado.view === 'modeidx' || N.estado.view === 'modeblk') && N.estado.mode === 'audiobooks') {
      var e2 = normalizar(N.estado); if (!e2 || e2.view !== N.estado.view) go({ view: 'index' }, { push: false }); else atualizarRaiz(N.estado);
    }
    atualizarChrome(N.estado);
  }
  function vigiarAudio() {
    try {
      N.mo = new MutationObserver(function () { if (N.audioPend) return; N.audioPend = true; requestAnimationFrame(function () { if (!N) return; N.audioPend = false; sincronizarAudio(); }); });
      N.mo.observe(N.tab, { childList: true, subtree: true });
    } catch (e) {}
  }

  /* --------------------------------- attach --------------------------------- */
  function attach(tab, slug) {
    if (N && N.tab === tab) return;
    if (N) detach();
    if (!window.RMModes || !window.RMLayout || !window.RMSistema || typeof window.RMLayout.irPara !== 'function') throw new Error('sin base');
    N = { tab: tab, slug: slug || 'semiologia-ii', secs: [], estado: { view: 'index' }, pend: null, emitido: false, filtro: 'todas' };
    N.secs = lerSecs();
    if (!N.secs.length) { N = null; throw new Error('sin secciones'); }
    window.RMModes.setNav(true);
    try { window.RMLayout.atualizarModos(); } catch (e) {}
    N.root = document.getElementById('rm-mode-root');
    montarCrumbPager();
    on(document, 'click', aoClicarGlobal);
    on(document, 'click', aoClicarMenuCore, true);
    var lat = document.getElementById('rm-l2-side'); if (lat) on(lat, 'click', aoClicarLateral, true);
    var capa = q1(tab, '.rm-l2-cover'); if (capa) on(capa, 'click', aoClicarCapa, true);
    on(window, 'popstate', aoPopState);
    window.RMModes.onChange(function () { if (N && N.attached) aoMudar(); });
    N.attached = true;
    try { N.scrollRest = history.scrollRestoration; history.scrollRestoration = 'manual'; } catch (e) {}
    /* os modos de estudio sobem para o ALTO da lateral, logo abaixo de «Índice general» (a seção final «Revisión reunida» já saiu: os modos «fim» não existem com a navegação) */
    var fullB = q1(document, '#rm-l2-side .rm-l2-item[data-view="full"]'), mb = q1(document, '#rm-l2-side .rm-l2-modes:not(.rm-l2-modes-end)');
    if (fullB && mb && fullB.parentNode && mb.parentNode) { N.mb = { e: mb, p: mb.parentNode, n: mb.nextSibling }; fullB.parentNode.insertBefore(mb, fullB.nextSibling); }
    vigiarAudio();
    sincronizarAudio();
    /* estado inicial: link direto (#s2-b03 · #s2-b03-s2 · #modo/…) ou índice geral */
    var ini = estadoDeHash(location.hash), alvo = ini && normalizar(ini);
    if (alvo && alvo.view !== 'index') { go(alvo, { push: false, foco: false }); substituir(estadoAtual()); }
    else if (ini && ini.mode === 'audiobooks' && !N.audioChave) {
      /* link direto a um modo de audiolibros: os cards só existem depois do manifesto autorizado. Abre o índice geral e mantém a URL até os cards chegarem;
         se nunca chegarem (sem autorização), o aluno fica no índice geral — nunca numa página vazia. */
      N.hashAudio = location.hash;
      go({ view: 'index' }, { push: false, foco: false });
    }
    else { go({ view: 'index' }, { push: false, foco: false }); substituir({ view: 'index' }); }
  }

  function detach() {
    if (!N) { try { ROOT.classList.remove('rm-nav'); } catch (e) {} return; }
    var n = N; N = null;
    try { OUV.forEach(function (o) { try { o.a.removeEventListener(o.t, o.f, o.c); } catch (e) {} }); } catch (e) {}
    OUV = [];
    try { if (n.mb && n.mb.p) n.mb.p.insertBefore(n.mb.e, n.mb.n && n.mb.n.parentNode === n.mb.p ? n.mb.n : null); } catch (e) {}
    try { if (n.mo) n.mo.disconnect(); } catch (e) {}
    try { if (n.ink && n.ink.parentNode) n.ink.parentNode.removeChild(n.ink); } catch (e) {}
    try { qa(n.tab, '[data-rm-off]').forEach(function (x) { x.removeAttribute('data-rm-off'); }); } catch (e) {}
    NODOS.forEach(function (x) { if (x && x.parentNode) x.parentNode.removeChild(x); });
    ATRS.forEach(function (a) { try { a.e.removeAttribute(a.k); } catch (e) {} });
    TEXTOS.slice().reverse().forEach(function (x) { try { x.e.textContent = x.t; } catch (e) {} });
    NODOS = []; ATRS = []; TEXTOS = [];
    qa(n.tab, '[data-rm-nav-cur]').forEach(function (x) { x.removeAttribute('data-rm-nav-cur'); });
    ['data-rm-nav', 'data-rm-nav-mode'].forEach(function (a) { ROOT.removeAttribute(a); });
    try { if (n.root) while (n.root.firstChild) n.root.removeChild(n.root.firstChild); } catch (e) {}
    try { if (n.scrollRest) history.scrollRestoration = n.scrollRest; } catch (e) {}
    try { if (window.RMModes) window.RMModes.setNav(false); } catch (e) {}
    try { if (window.RMLayout && window.RMLayout.atualizarModos) window.RMLayout.atualizarModos(); } catch (e) {}
    try { if (window.RMSistema && window.RMSistema.refletir) window.RMSistema.refletir(); } catch (e) {}
    try { if (window.RMLayout && window.RMLayout.pedirReposicao) window.RMLayout.pedirReposicao(); } catch (e) {}
  }

  window.RMNav = {
    attach: attach,
    detach: function () { detach(); },
    ativo: function () { return !!N && !!N.attached; },
    go: go,
    irParaAlvo: irParaAlvo,
    abrirModo: function (k) { return go({ view: 'modeidx', mode: K2MODO[k] || k }); },
    abrirIndice: function () { return go({ view: 'index' }); },
    etiqueta: etiqueta,
    estado: function () { return N ? JSON.parse(JSON.stringify(N.estado)) : null; },
    _RES: RES
  };
})();
