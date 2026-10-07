/* =====================================================================
   REPASSO MED · rm-modes.js
   Layout V2 · Fase B1 — STORE DE MODO (shell vazio)

   O que é
     O estado único `view` da matéria do piloto:
       full            → Página completa (visão canônica)
       infografias · preguntas · flashcards · audiobooks · videos ·
       auscultacion · banco · todos-flashcards   → modos ISOLADOS

   O que a B1 faz
     · guarda o modo, troca de modo por UMA sequência (requestView),
       detecta quais recursos realmente existem (recurso ausente =
       acesso ausente) e avisa quem escuta;
     · escreve o modo em <html data-rm-view="…"> — o CSS de rm-layout.css
       faz o resto (esconde o conteúdo, a toolbox, os highlights e a
       camada de tinta fora da Página completa);
     · ao sair da Página completa: desarma a ferramenta (API pública da
       V2, `escolherFerramenta('none')`), guarda a posição de rolagem;
     · ao voltar: restaura o layout, ESPERA ele assentar e só então (se a
       transição continua sendo a atual, na mesma aba) pede ao layout que
       reposicione a tinta e devolve a rolagem; senão é NO-OP.

   NAVEGAÇÃO POR BLOCO (piloto com o tema, issue #453) — `RMModes.setNav(true)`
     O MESMO store ganha um segundo eixo, `block` (id da seção ou null), sem outra fonte de verdade:
       view=full  + block=null  → índice geral (abertura)        view=full  + block=id → leitura de UM bloco
       view=<modo> + block=null → índice de blocos do modo        view=<modo> + block=id → só o recurso daquele tipo naquele bloco
     Só vale com `setNav(true)` (feito por rm-materia-nav.js, só no piloto com o tema). Sem ele nada disto existe: block fica null,
     os modos «de fim» (banco / todos-flashcards) e o painel vazio seguem como na B1. Com ele: os modos «de fim» saem da lista
     (o banco geral e os flashcards gerais viram blocos de leitura), Audiobooks passa a existir onde há card real e os rótulos
     seguem o vocabulário da issue (Preguntas, Flashcards, Audiolibros).

   O que a B1 NÃO faz (vem depois)
     · conteúdo dos modos isolados (B3) — hoje é um painel vazio (a navegação por bloco o preenche, só no piloto com o tema);
     · bloquear criação/escrita de anotação (B2: annotationsAllowed +
       gateWrite). Na B1 isso é garantido só por construção: fora da
       Página completa o conteúdo e a toolbox estão ocultos.
     · nada de caneta, touch-action, palma, Supabase.
   ===================================================================== */
(function () {
  'use strict';
  if (window.RMModes) return;

  var ROOT = document.documentElement;

  /* Ordem fixa dos modos isolados na lateral. `detect` decide se o recurso
     existe DE VERDADE na matéria — senão o acesso nem aparece. */
  var MODOS = [
    { id: 'infografias',   label: 'Infografías',            icon: 'img', navLabel: 'Infografías',
      detect: function (t) { return !!t.querySelector('section[id] figure img, section[id] .s2-photo[role="img"], section[id] img.rmc-photo'); } },
    { id: 'preguntas',     label: 'Preguntas por bloque',   icon: 'q', navLabel: 'Preguntas',
      detect: function (t) { return !!t.querySelector('section[id] .quiz-item'); } },
    { id: 'flashcards',    label: 'Flashcards por bloque',  icon: 'cards', navLabel: 'Flashcards',
      detect: function (t) { return !!t.querySelector('section[id] .flashcard'); } },
    { id: 'audiobooks',    label: 'Audiobooks',             icon: 'phones', navLabel: 'Audiolibros',
      /* B1: sem motor nem manifesto ⇒ sem acesso. Com a navegação por bloco: só se o manifesto AUTORIZADO criou um card real
         (`.rm-audio-card`, feito por rm-audio-boot.js) num bloco — recurso ausente = acesso ausente. Nunca lê URL nem manifesto. */
      detect: function (t) { return st.nav && !!t.querySelector('section[id] .rm-audio-card'); } },
    { id: 'videos',        label: 'Videos',                 icon: 'play',
      detect: function (t) { return !!t.querySelector('section[id] details.video-collapsible'); } },
    { id: 'auscultacion',  label: 'Auscultación',           icon: 'wave', navLabel: 'Auscultación',
      detect: function (t) { return !!t.querySelector('section[id] audio'); } },
    { id: 'banco',         label: 'Banco de preguntas',     icon: 'bank',   fim: true,
      detect: function (t) { return !!t.querySelector('section[id*="banco"]'); } },
    { id: 'todos-flashcards', label: 'Todos los flashcards', icon: 'stack', fim: true,
      detect: function (t) { return !!t.querySelector('section[id*="flashcards"]'); } }
  ];

  var FULL = { id: 'full', label: 'Página completa', icon: 'index' };

  /* `gen` = geração da transição. Avança em TODA troca efetiva de modo, attach e detach. Quem espera algo assíncrono
     (a volta à Página completa espera o layout assentar) guarda a geração e a aba em que nasceu e, depois da espera,
     só age se ainda for a transição ATUAL, na MESMA aba, ainda anexado, ainda na Página completa. Senão: NO-OP.
     `volta` = a volta à Página completa que ainda não devolveu a rolagem (guarda a posição de saída original). */
  var st = { view: 'full', block: null, nav: false, tab: null, scrollY: 0, ouvintes: [], disponiveis: [], gen: 0, volta: null };

  function abaViva(t) { return !!t && t.isConnected !== false && (!t.classList || t.classList.contains('active')); }
  function atual(tok, tab) {
    return st.gen === tok && !!tab && st.tab === tab && st.view === 'full' && abaViva(tab);
  }

  function porId(id) {
    if (id === 'full') return FULL;
    for (var i = 0; i < MODOS.length; i++) if (MODOS[i].id === id) return MODOS[i];
    return null;
  }

  /* Só os modos cujos recursos existem na aba. */
  function detectar(tab) {
    st.disponiveis = MODOS.filter(function (m) {
      if (st.nav && m.fim) return false;                     // navegação por bloco: banco geral / todos os flashcards são blocos de leitura, não modos
      try { return !!tab && m.detect(tab); } catch (e) { return false; }
    });
    return st.disponiveis;
  }

  /* `info` (3.º argumento dos ouvintes): { block, prevBlock } — o eixo de bloco da navegação; ouvintes antigos ignoram. */
  function emitir(prev, prevBlock) {
    var info = { block: st.block, prevBlock: prevBlock === undefined ? st.block : prevBlock };
    st.ouvintes.slice().forEach(function (fn) { try { fn(st.view, prev, info); } catch (e) {} });
  }

  function desarmarFerramentas() {
    /* API PÚBLICA da V2 — a B1 não muda nada da caneta: só pede "nenhuma". */
    try {
      if (window.RMToolsV2 && typeof window.RMToolsV2.escolherFerramenta === 'function') {
        window.RMToolsV2.escolherFerramenta('none');
      }
    } catch (e) {}
  }

  /* Dois frames + um respiro: o tempo de o navegador reaplicar o layout
     (as seções usam content-visibility:auto, e a caixa só vale depois). */
  function assentar() {
    return new Promise(function (ok) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { setTimeout(ok, 120); });
      });
    });
  }

  function voltarParaCompleta(tok, tab, y, opts) {
    return assentar().then(function () {
      if (!atual(tok, tab)) return;                       // transição velha (outra troca, detach, outra matéria): NO-OP
      /* a tinta só é reposicionada pelo layout (único caminho até a V2: coalescido, nunca durante o contato da caneta) */
      try { if (window.RMLayout && typeof window.RMLayout.pedirReposicao === 'function') window.RMLayout.pedirReposicao(); } catch (e) {}
      if (!(opts && opts.restaurar === false)) { try { window.scrollTo(0, y); } catch (e) {} }
      if (st.volta && st.volta.tok === tok) st.volta = null;   // rolagem devolvida: a posição de saída cumpriu o papel
      if (opts && typeof opts.depois === 'function' && atual(tok, tab)) { try { opts.depois(); } catch (e) {} }
      /* a rolagem devolvida renderiza seções puladas (content-visibility): a tinta acompanha o conteúdo que assentou */
      if (atual(tok, tab)) { try { if (window.RMLayout && typeof window.RMLayout.assentarTinta === 'function') window.RMLayout.assentarTinta(); } catch (e) {} }
    });
  }

  /* A ÚNICA porta de troca de modo. */
  function requestView(next, opts) {
    var alvo = porId(next);
    if (!alvo) return false;
    if (next !== 'full' && st.disponiveis.indexOf(alvo) === -1) return false;   // recurso ausente
    var nb = (st.nav && opts && opts.block) ? String(opts.block) : null;          // eixo de bloco: só com a navegação por bloco
    if (next === st.view) {
      if (nb === st.block) return true;
      /* mesma vista, outro bloco (ou volta ao índice): troca síncrona do bloco; a geração avança (pedidos pendentes perdem a vez) */
      var pb = st.block; st.block = nb; ++st.gen;
      emitir(st.view, pb);
      return true;
    }
    var prev = st.view, prevBlock = st.block;
    var tok = ++st.gen;                     // toda troca efetiva invalida o que estava pendente
    st.block = nb;

    if (prev === 'full') {                  // saindo da Página completa
      /* se a volta anterior ainda não devolveu a rolagem, a posição atual (≈ topo do modo isolado) NÃO é a do aluno:
         mantém a posição de saída original */
      if (!st.volta) st.scrollY = window.pageYOffset || 0;
      st.volta = null;
      desarmarFerramentas();
    }
    st.view = next;
    ROOT.setAttribute('data-rm-view', next);
    emitir(prev, prevBlock);

    if (next === 'full') {                  // voltando: layout assenta → tinta → rolagem
      st.volta = { tok: tok };
      voltarParaCompleta(tok, st.tab, st.scrollY, opts);
    } else {
      try { window.scrollTo(0, 0); } catch (e) {}
    }
    return true;
  }

  /* Liga/desliga a navegação por bloco (só rm-materia-nav.js chama; só no piloto com o tema). Troca os rótulos dos modos e a lista de
     disponíveis; volta ao estado inicial (índice geral). Desligar devolve TUDO como a B1 (rótulos, modos de fim, painel vazio). */
  function setNav(on) {
    on = !!on;
    if (st.nav === on) return;
    st.nav = on; st.block = null; st.gen++; st.volta = null;
    MODOS.forEach(function (m) {
      if (!m.navLabel) return;
      if (on) { m._label0 = m.label; m.label = m.navLabel; } else if (m._label0 !== undefined) { m.label = m._label0; delete m._label0; }
    });
    if (on) ROOT.classList.add('rm-nav'); else ROOT.classList.remove('rm-nav');
    st.view = 'full'; ROOT.setAttribute('data-rm-view', 'full');
    detectar(st.tab);
  }

  function attach(tab) {
    st.gen++; st.volta = null;
    st.tab = tab;
    st.block = null;
    st.view = 'full';
    ROOT.setAttribute('data-rm-view', 'full');
    detectar(tab);
  }

  function detach() {
    st.gen++; st.volta = null;              // callbacks de transições anteriores viram NO-OP
    if (st.nav) setNav(false);
    st.tab = null;
    st.block = null;
    st.view = 'full';
    ROOT.removeAttribute('data-rm-view');
    st.ouvintes = [];
    st.disponiveis = [];
  }

  window.RMModes = {
    FULL: FULL,
    MODOS: MODOS,
    porId: porId,
    attach: attach,
    detach: detach,
    detectar: detectar,
    disponiveis: function () { return st.disponiveis.slice(); },
    requestView: requestView,
    get view() { return st.view; },
    get block() { return st.block; },       // eixo de bloco (null fora da navegação por bloco)
    get nav() { return st.nav; },
    setNav: setNav,
    get gen() { return st.gen; },           // só leitura (testes/diagnóstico)
    isFull: function () { return st.view === 'full'; },
    onChange: function (fn) { if (typeof fn === 'function') st.ouvintes.push(fn); }
  };
})();
