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

   O que a B1 NÃO faz (vem depois)
     · conteúdo dos modos isolados (B3) — hoje é um painel vazio;
     · bloquear criação/escrita de anotação (B2: annotationsAllowed +
       gateWrite). Na B1 isso é garantido só por construção: fora da
       Página completa o conteúdo e a toolbox estão ocultos.
     · nada de caneta, touch-action, palma, Supabase.

   B3 · Infografías (PREPARADO, DESLIGADO)
     · `infograficosDe(tab)` deriva, SÓ LENDO o DOM, os infográficos que existem
       (figure com legenda + imagem). Radiografias/diapositivas e outras fotos
       NÃO são infográficos. Nada é contado nem inventado.
     · O conteúdo real do modo só é liberado quando as DUAS chaves estão ligadas:
       (1) CFG.conteudoReal (constante deste arquivo; fica false até a PR de
           ativação) e (2) o contrato de anotações da V2 está pronto
           (`contratoAnotacoes()`): a V2 consulta o predicado DENTRO dos caminhos
           de escrita — ocultar ferramenta por CSS não basta.
       Hoje o contrato NÃO existe (activeViewPermitido() é fixo e anotarPermitido()
       não está ligado aos caminhos de escrita): o modo fica no painel vazio.
     · Sem as duas: o modo continua sendo o painel vazio de sempre.
   ===================================================================== */
(function () {
  'use strict';
  if (window.RMModes) return;

  var ROOT = document.documentElement;

  /* ---------------------------------------------------------------------
     Chave de ativação do conteúdo REAL dos modos isolados. Fica `false` até a
     PR de ativação (depois de o Claude 1 entregar o contrato de anotações).
     Os testes ligam esta constante servindo o arquivo com ela trocada — não há
     gancho público que a ligue em produção.
     --------------------------------------------------------------------- */
  var CFG = { conteudoReal: false };
  var REAIS = { infografias: true };         // modos que já sabem mostrar conteúdo real (os demais continuam vazios)

  /* ---------------------------------------------------------------------
     CONTRATO DE ANOTAÇÕES (dono: Claude 1 · rm-tools*.js). O ponto de extensão JÁ existe no rm-tools-v2.js:
     `activeViewPermitido()` (hoje `return true`) dentro de `anotarPermitido()`, a «porta única» de início de traço,
     marcador, goma, cor, desfazer/refazer, atalhos e escrita. Para o contrato valer, ele precisa:
       (1) fazer `activeViewPermitido()` consultar `RMModes.annotationsAllowed()` (true só na Página completa);
       (2) ligar `anotarPermitido()` a TODOS os caminhos de escrita (hoje só é exposta em `_test`);
       (3) declarar isso em `RMToolsV2.contratoModos = 1` (número ≥ 1).
     Aqui a declaração NÃO basta: se a V2 expõe `_test.anotarPermitido`, a sonda abaixo exige que ela devolva
     `false` fora da Página completa — uma declaração falsa não liga o modo.
     --------------------------------------------------------------------- */
  function annotationsAllowed() { return st.view === 'full'; }
  function contratoAnotacoes() {
    var T = window.RMToolsV2;
    if (!T || !(+T.contratoModos >= 1)) return { pronto: false, motivo: 'a V2 ainda não declara contratoModos (activeViewPermitido ainda é fixo)' };
    try {
      var t = T._test;
      if (st.view !== 'full' && t && typeof t.anotarPermitido === 'function' && t.anotarPermitido()) {
        return { pronto: false, motivo: 'a V2 declara o contrato, mas anotarPermitido() ainda libera a escrita fora da Página completa' };
      }
    } catch (e) { return { pronto: false, motivo: 'a sonda do contrato falhou' }; }
    return { pronto: true, motivo: '' };
  }
  /* o modo pode mostrar conteúdo real AGORA? (as duas chaves) */
  function conteudoLiberado(id) {
    return !!(REAIS[id] && CFG.conteudoReal && contratoAnotacoes().pronto);
  }

  /* ---------------------------------------------------------------------
     INFOGRÁFICOS = o que existe, só lendo o DOM.
     É infográfico: <figure> dentro de uma section[id], COM legenda (<figcaption>) e com imagem
     (<img> ou o bloco-imagem `.s2-photo[role=img]` / `img.rmc-photo`).
     NÃO é: radiografia/diapositiva (`.material-slide`, legenda em `.med-image-caption`), foto solta,
     ícone, logo ou imagem sem figure+legenda.
     --------------------------------------------------------------------- */
  var IMG_SEL = 'img, .s2-photo[role="img"], img.rmc-photo';
  function infograficosDe(tab) {
    var out = [];
    if (!tab) return out;
    Array.prototype.forEach.call(tab.querySelectorAll('section[id] figure'), function (f) {
      if (f.closest('.material-slide, .med-image')) return;
      var cap = f.querySelector('figcaption'); var img = f.querySelector(IMG_SEL);
      if (!cap || !img) return;
      out.push({ fig: f, img: img, cap: cap, sec: f.closest('section[id]') });
    });
    return out;
  }

  /* Ordem fixa dos modos isolados na lateral. `detect` decide se o recurso
     existe DE VERDADE na matéria — senão o acesso nem aparece. */
  var MODOS = [
    { id: 'infografias',   label: 'Infografías',            icon: 'img',
      detect: function (t) { return infograficosDe(t).length > 0; } },
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

  /* `gen` = geração da transição. Avança em TODA troca efetiva de modo, attach e detach. Quem espera algo assíncrono
     (a volta à Página completa espera o layout assentar) guarda a geração e a aba em que nasceu e, depois da espera,
     só age se ainda for a transição ATUAL, na MESMA aba, ainda anexado, ainda na Página completa. Senão: NO-OP.
     `volta` = a volta à Página completa que ainda não devolveu a rolagem (guarda a posição de saída original). */
  var st = { view: 'full', tab: null, scrollY: 0, ouvintes: [], disponiveis: [], gen: 0, volta: null };

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
    if (next === st.view) return true;
    var prev = st.view;
    var tok = ++st.gen;                     // toda troca efetiva invalida o que estava pendente

    if (prev === 'full') {                  // saindo da Página completa
      /* se a volta anterior ainda não devolveu a rolagem, a posição atual (≈ topo do modo isolado) NÃO é a do aluno:
         mantém a posição de saída original */
      if (!st.volta) st.scrollY = window.pageYOffset || 0;
      st.volta = null;
      desarmarFerramentas();
    }
    st.view = next;
    ROOT.setAttribute('data-rm-view', next);
    emitir(prev);

    if (next === 'full') {                  // voltando: layout assenta → tinta → rolagem
      st.volta = { tok: tok };
      voltarParaCompleta(tok, st.tab, st.scrollY, opts);
    } else {
      try { window.scrollTo(0, 0); } catch (e) {}
    }
    return true;
  }

  function attach(tab) {
    st.gen++; st.volta = null;
    st.tab = tab;
    st.view = 'full';
    ROOT.setAttribute('data-rm-view', 'full');
    detectar(tab);
  }

  function detach() {
    st.gen++; st.volta = null;              // callbacks de transições anteriores viram NO-OP
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
    get gen() { return st.gen; },           // só leitura (testes/diagnóstico)
    isFull: function () { return st.view === 'full'; },
    annotationsAllowed: annotationsAllowed,  // true só na Página completa (o Claude 1 liga a V2 a isto: activeViewPermitido)
    contratoAnotacoes: contratoAnotacoes,    // {pronto, motivo}: diagnóstico/gate
    conteudoLiberado: conteudoLiberado,      // o modo `id` pode mostrar conteúdo real agora?
    get conteudoRealLigado() { return !!CFG.conteudoReal; },   // só leitura: a chave de ativação (diagnóstico/teste)
    infograficosDe: infograficosDe,          // só leitura do DOM
    onChange: function (fn) { if (typeof fn === 'function') st.ouvintes.push(fn); }
  };
})();
