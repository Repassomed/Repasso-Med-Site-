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
     · ao voltar: restaura o layout, ESPERA ele assentar e só então pede
       à V2 que reposicione a tinta (`reposicionar`), devolve a rolagem.

   O que a B1 NÃO faz (vem depois)
     · conteúdo dos modos isolados (B3) — hoje é um painel vazio;
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
    { id: 'infografias',   label: 'Infografías',            icon: 'img',
      detect: function (t) { return !!t.querySelector('section[id] figure img, section[id] .s2-photo[role="img"], section[id] img.rmc-photo'); } },
    { id: 'preguntas',     label: 'Preguntas por bloque',   icon: 'q',
      detect: function (t) { return !!t.querySelector('section[id] .quiz-item'); } },
    { id: 'flashcards',    label: 'Flashcards por bloque',  icon: 'cards',
      detect: function (t) { return !!t.querySelector('section[id] .flashcard'); } },
    { id: 'audiobooks',    label: 'Audiobooks',             icon: 'phones',
      detect: function () { return false; } },                 // B1: sem motor nem manifesto ⇒ sem acesso
    { id: 'videos',        label: 'Videos',                 icon: 'play',
      detect: function (t) { return !!t.querySelector('section[id] details.video-collapsible'); } },
    { id: 'auscultacion',  label: 'Auscultación',           icon: 'wave',
      detect: function (t) { return !!t.querySelector('section[id] audio'); } },
    { id: 'banco',         label: 'Banco de preguntas',     icon: 'bank',   fim: true,
      detect: function (t) { return !!t.querySelector('section[id*="banco"]'); } },
    { id: 'todos-flashcards', label: 'Todos los flashcards', icon: 'stack', fim: true,
      detect: function (t) { return !!t.querySelector('section[id*="flashcards"]'); } }
  ];

  var FULL = { id: 'full', label: 'Página completa', icon: 'index' };

  var st = { view: 'full', tab: null, scrollY: 0, ouvintes: [], disponiveis: [] };

  function porId(id) {
    if (id === 'full') return FULL;
    for (var i = 0; i < MODOS.length; i++) if (MODOS[i].id === id) return MODOS[i];
    return null;
  }

  /* Só os modos cujos recursos existem na aba. */
  function detectar(tab) {
    st.disponiveis = MODOS.filter(function (m) {
      try { return !!tab && m.detect(tab); } catch (e) { return false; }
    });
    return st.disponiveis;
  }

  function emitir(prev) {
    st.ouvintes.slice().forEach(function (fn) { try { fn(st.view, prev); } catch (e) {} });
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

  function voltarParaCompleta(y, opts) {
    return assentar().then(function () {
      try {
        if (window.RMToolsV2 && typeof window.RMToolsV2.reposicionar === 'function') {
          window.RMToolsV2.reposicionar();            // tinta: só agora, com o layout completo
        }
      } catch (e) {}
      if (!(opts && opts.restaurar === false)) { try { window.scrollTo(0, y); } catch (e) {} }
      if (opts && typeof opts.depois === 'function') { try { opts.depois(); } catch (e) {} }
      /* a rolagem devolvida renderiza seções puladas (content-visibility): a tinta acompanha o conteúdo que assentou */
      try { if (window.RMLayout && typeof window.RMLayout.assentarTinta === 'function') window.RMLayout.assentarTinta(); } catch (e) {}
    });
  }

  /* A ÚNICA porta de troca de modo. */
  function requestView(next, opts) {
    var alvo = porId(next);
    if (!alvo) return false;
    if (next !== 'full' && st.disponiveis.indexOf(alvo) === -1) return false;   // recurso ausente
    if (next === st.view) return true;
    var prev = st.view;

    if (prev === 'full') {                  // saindo da Página completa
      st.scrollY = window.pageYOffset || 0;
      desarmarFerramentas();
    }
    st.view = next;
    ROOT.setAttribute('data-rm-view', next);
    emitir(prev);

    if (next === 'full') {                  // voltando: layout assenta → tinta → rolagem
      voltarParaCompleta(st.scrollY, opts);
    } else {
      try { window.scrollTo(0, 0); } catch (e) {}
    }
    return true;
  }

  function attach(tab) {
    st.tab = tab;
    st.view = 'full';
    ROOT.setAttribute('data-rm-view', 'full');
    detectar(tab);
  }

  function detach() {
    st.tab = null;
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
    isFull: function () { return st.view === 'full'; },
    onChange: function (fn) { if (typeof fn === 'function') st.ouvintes.push(fn); }
  };
})();
