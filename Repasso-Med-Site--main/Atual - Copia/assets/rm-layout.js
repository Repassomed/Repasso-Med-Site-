/* =====================================================================
   REPASSO MED · rm-layout.js
   Layout V2 · Fase B1 — SHELL VISUAL DO PILOTO

   Só é carregado por rm-pilot.js, e só para a conta piloto na matéria
   piloto (semiologia-ii). Para todo o resto do mundo este arquivo nunca
   chega a ser baixado.

   O que monta
     · FAIXA compacta no topo (sticky): nome da matéria sempre visível,
       botão «Índice» (drawer), modo atual, atalho «Materias».
     · LATERAL esquerda: «Página completa — Índice» (árvore matéria →
       bloco → temas → recursos reais), modos de estudo que EXISTEM
       (vazios por enquanto), «Banco de preguntas» e «Todos los
       flashcards» ao final, «Volver arriba» e «Sugerencias». Três formas:
       docked (264) · trilho de ícones (64) · drawer (celular/tablet).
     · RAIA reservada para a toolbox da V2 (à direita) — a toolbox em si
       continua sendo a que já existe; aqui só se reserva o espaço.
     · SLOT do futuro player de audiobook (vazio, 0 px, `hidden`).
     · #rm-mode-root: onde os modos isolados vão aparecer (B3). Hoje só
       um painel vazio.

   REGRAS QUE ESTE ARQUIVO RESPEITA
     · NÃO move, clona nem reescreve nenhum nó didático. O conteúdo da
       matéria fica onde está; o shell é irmão dele (fora de section[id]).
     · Tudo o que é UI derivada leva [data-rm-ui] (fora do índice de
       marca-texto, desde a B0) e nada dentro de section[id] é criado.
     · Nenhum ID/âncora do conteúdo é criado, alterado ou removido.
     · Não toca no motor de marcação, na caneta, em touch-action, em
       palma, nem no Supabase. Nenhuma escrita em lugar nenhum.
     · Qualquer erro em attach() ⇒ detach() completo (rm-pilot.js) e a
       matéria volta a ser a de sempre.
   ===================================================================== */
(function () {
  'use strict';
  if (window.RMLayout) return;

  var ROOT = document.documentElement;
  var SLUG = 'semiologia-ii';
  var W_DOCK = 1200;              // ≥ → lateral docked (264)
  var W_RAIL = 768;               // ≥ → trilho de ícones (64); < → só drawer
  var TEXT_COL = 880;             // .container do site
  var RIGHT_RAIL = 67;            // toolbox 58 + margem 9
  /* Dock do player (ver decidirDock): largura do player lateral, folga até a toolbox e até o cartão de texto. */
  var PLAYER_W = 224, PLAYER_EDGE = 8, PLAYER_GAP = 8, DOCK_HYST = 12;

  var S = null;                   // estado da instância ativa

  /* ---------------------------- utilidades ---------------------------- */
  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function ui(tag, cls, attrs) {            // toda UI derivada leva [data-rm-ui]
    var e = el(tag, cls, attrs);
    e.setAttribute('data-rm-ui', '');
    return e;
  }
  function txt(s) { return document.createTextNode(s); }
  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function raf2(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }

  /* Ícones: traços finos, currentColor (o acento por tipo vem do CSS). */
  var ICO = {
    index:  'M4 6h16M4 12h16M4 18h10',
    img:    'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M9 9.5h.01',
    q:      'M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01M4 5h16v14H4z',
    cards:  'M6 7h12v12H6zM9 4h12v12',
    stack:  'M4 8l8-4 8 4-8 4zM4 12l8 4 8-4M4 16l8 4 8-4',
    phones: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1z',
    play:   'M8 5l11 7-11 7z',
    wave:   'M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2',
    bank:   'M4 9l8-5 8 5M6 9v9M10 9v9M14 9v9M18 9v9M4 20h16',
    top:    'M12 19V5M6 11l6-6 6 6',
    mail:   'M4 6h16v12H4zM4 7l8 6 8-6',
    min:    'M15 6l-6 6 6 6',
    max:    'M9 6l6 6-6 6',
    menu:   'M4 7h16M4 12h16M4 17h16',
    home:   'M4 11l8-7 8 7M6 10v9h12v-9',
    caret:  'M7 10l5 5 5-5',
    close:  'M6 6l12 12M18 6L6 18'
  };
  function svg(name, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '20'); s.setAttribute('height', '20');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', ICO[name] || ICO.index); s.appendChild(p);
    return s;
  }

  function catalogo() {
    var c = window.RM_CATALOGO || [];
    for (var i = 0; i < c.length; i++) if (c[i].slug === SLUG) return c[i];
    return { title: 'Semiología II', sub: '' };
  }

  /* ------------------- leitura (só leitura) do índice ------------------ */
  /* O app-core já monta o índice do bloco (`.rm-menu`). Aqui só se LÊ
     esse índice; nada dele é movido nem alterado. */
  function blocos(tab) {
    var out = [], itens = tab.querySelectorAll('.rm-menu .rm-menu-item');
    Array.prototype.forEach.call(itens, function (it, i) {
      var a = it.querySelector(':scope > a[data-target]');
      if (!a) return;
      var id = a.getAttribute('data-target');
      var sec = tab.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id));
      if (!sec) return;
      var b = a.querySelector('.rm-menu-tx b'), sm = a.querySelector('.rm-menu-tx small');
      var subs = [];
      Array.prototype.forEach.call(it.querySelectorAll('.rm-menu-subs a.rm-idx-sub:not(.is-top)'), function (s) {
        var sid = s.getAttribute('data-target');
        if (sid) subs.push({ id: sid, txt: (s.textContent || '').replace(/\s+/g, ' ').trim() });
      });
      out.push({ id: id, n: i + 1, label: b ? b.textContent.trim() : id, small: sm ? sm.textContent.trim() : '',
                 subs: subs, sec: sec, recursos: recursosDe(sec) });
    });
    if (out.length) return out;
    /* plano B: sem `.rm-menu` (nunca deveria), usa os <h2> dos blocos */
    Array.prototype.forEach.call(tab.querySelectorAll(':scope > section[id]'), function (sec, i) {
      var h = sec.querySelector('h2'); if (!h) return;
      out.push({ id: sec.id, n: i + 1, label: h.textContent.replace(/\s+/g, ' ').trim(), small: '', subs: [], sec: sec, recursos: recursosDe(sec) });
    });
    return out;
  }

  /* O grid de flashcards do site fica recolhido (display:none); o que o aluno vê é o LANÇADOR (`.rmfc-launch`), irmão anterior do grid.
     É ele o alvo de um salto — o grid não tem caixa de layout. */
  function lancadorFc(fcEl) {
    var g = fcEl && fcEl.closest && fcEl.closest('.fc-grid'), l = g && g.previousElementSibling;
    return (l && l.classList && l.classList.contains('rmfc-launch')) ? l : (g || fcEl);
  }
  /* Recursos REAIS do bloco (só o que existe) + o primeiro alvo de cada tipo. */
  var TIPOS = [
    { k: 'fig',  label: 'Figuras',    sel: 'figure img, .s2-photo[role="img"], img.rmc-photo', up: 'figure, .s2-photo' },
    { k: 'quiz', label: 'Preguntas',  sel: '.quiz-item', up: '.quiz-section, .quiz-item' },
    { k: 'fc',   label: 'Flashcards', sel: '.flashcard', up: '.fc-grid, .flashcard' },
    { k: 'aud',  label: 'Ausculta',   sel: 'audio', up: '.audio-player, audio' },
    { k: 'vid',  label: 'Videos',     sel: 'details.video-collapsible', up: 'details.video-collapsible' }
  ];
  function recursosDe(sec) {
    var r = [];
    TIPOS.forEach(function (t) {
      var n = sec.querySelector(t.sel);
      if (n) r.push({ k: t.k, label: t.label, alvo: t.k === 'fc' ? lancadorFc(n) : ((n.closest && n.closest(t.up)) || n) });
    });
    return r;
  }

  /* ------------------------------ rolagem ------------------------------ */
  /* GERAÇÃO DE NAVEGAÇÃO. Todo callback assíncrono do shell (salto, acompanhamento da altura, reposicionamento da tinta)
     nasce com a geração em que foi pedido e, DEPOIS de cada espera, confere de novo se ainda é o dono: a geração
     avança em todo salto novo, troca de modo, attach e detach. Callback velho vira NO-OP — não é um timeout a mais. */
  var GER = 0;
  function abaViva(t) { return !!t && t.isConnected !== false && (!t.classList || t.classList.contains('active')); }
  function vivo(g, tab) {
    return g === GER && !!S && S.tab === tab && abaViva(tab) && !!window.RMModes && window.RMModes.isFull();
  }
  function novaGeracao() { GER++; clearTimeout(ALT.poll); ALT.poll = 0; }

  function hdrH() { return (S && S.band ? S.band.offsetHeight : 44) || 44; }
  /* alvo sem caixa de layout (display:none: grid de flashcards recolhido, conteúdo de <details> fechado…) nunca é visível: mira o ancestral
     visível mais próximo — senão o salto «chega» a top = 0 e a rolagem anda para o lado errado */
  function comCaixa(n) {
    while (n && n.nodeType === 1 && n.getClientRects && !n.getClientRects().length && n.parentElement) n = n.parentElement;
    return n;
  }
  function irPara(alvo) {
    if (!alvo || !S) return;
    alvo = comCaixa(alvo);
    var g = (novaGeracao(), GER), tab = S.tab;                      // um salto novo invalida o anterior (e o seu acompanhamento)
    var topo = hdrH() + 16, n = 0;
    (function passo() {
      if (!vivo(g, tab) || alvo.isConnected === false) return;      // outro salto, outro modo, outra matéria ou detach: NO-OP
      var d = alvo.getBoundingClientRect().top - topo;
      if (n++ > 10 || Math.abs(d) <= 2) { assentarTinta(g); return; }   // chegou: a tinta acompanha o conteúdo que assentou
      try { window.scrollTo({ top: Math.max(0, window.pageYOffset + d), behavior: 'instant' }); }
      catch (e) { window.scrollTo(0, Math.max(0, window.pageYOffset + d)); }
      requestAnimationFrame(function () { setTimeout(passo, 40); });   // content-visibility muda alturas por baixo (passo confere de novo)
    })();
  }

  /* ---------------------- reposicionar a tinta (única) -------------------- */
  /* O shell desloca o conteúdo NO EIXO X sem mudar o tamanho da section
     (coluna com largura constante): o ResizeObserver da tinta não dispara e o
     SVG ficaria deslocado. Esta é a ÚNICA rotina que pede à V2, pela API
     pública, que reposicione — sempre DEPOIS de o layout assentar (2 frames +
     respiro, as seções usam content-visibility:auto) e agrupando pedidos
     seguidos em um só. Não mexe em âncoras, algoritmo nem persistência.

     Contexto do pedido {geração, aba, anexo}: ao executar, TUDO é conferido de novo (matéria/aba ainda ativa, shell ainda
     anexado na mesma geração, ainda na Página completa). Pedido velho = NO-OP.
     NUNCA durante contato da caneta: se `rm2-pen-down` está ligado (ou há traço em curso), o pedido é coalescido e espera
     o `pointerup`/`pointercancel` (e o fim do contato); só então reconfere o contexto e executa UMA vez.
     Fora da Página completa não roda: a tinta está oculta e a volta ao modo completo já pede (rm-modes.js). */
  var REPOS = { timer: 0, raf: 0, espera: false, ctx: null, pCtx: null, pFn: null, pT: 0, pLoop: 0 };
  function ctxAtual() { return S ? { g: GER, tab: S.tab, anexo: true } : null; }
  /* contato da stylus (classe do rm-tools-v2) ou traço em curso (gancho SÓ DE LEITURA da V2): só observa, não decide nada da caneta */
  function escreveuAgora() {
    if (escrevendo()) return true;
    try { var t = window.RMToolsV2 && window.RMToolsV2._test; return !!(t && typeof t.temTraco === 'function' && t.temTraco()); } catch (e) { return false; }
  }
  function reposicionarTinta(ctx) {
    ctx = ctx || ctxAtual();
    if (!ctx) return;
    REPOS.ctx = ctx;                                         // o pedido mais novo substitui o anterior (coalesce)
    if (REPOS.espera) return;
    REPOS.espera = true;
    REPOS.raf = requestAnimationFrame(function () {
      REPOS.raf = requestAnimationFrame(function () {
        REPOS.timer = setTimeout(function () {
          var c = REPOS.ctx; REPOS.espera = false; REPOS.timer = 0; REPOS.raf = 0; REPOS.ctx = null;
          executarReposicao(c);
        }, 120);
      });
    });
  }
  function executarReposicao(c) {
    try {
      if (!c || !abaViva(c.tab)) return;                     // a matéria saiu (ou a aba deixou de ser a ativa)
      if (c.anexo) { if (!S || S.tab !== c.tab || c.g !== GER || !window.RMModes || !window.RMModes.isFull()) return; }
      else if (S) return;                                    // pedido de «depois do detach»: só vale se continua desanexado
      if (escreveuAgora()) { aguardarCaneta(c); return; }
      if (window.RMToolsV2 && typeof window.RMToolsV2.reposicionar === 'function') window.RMToolsV2.reposicionar();
      ALT.h = alturaDoc();
    } catch (e) {}
  }
  /* espera o contato acabar: pointerup/pointercancel (captura, só leitura) + touchend/touchcancel (adaptador de Touch Events)
     + conferência periódica de segurança (uma classe presa não pode travar o pedido para sempre) */
  function aguardarCaneta(c) {
    REPOS.pCtx = c;                                          // vários pedidos durante o contato viram UM
    if (REPOS.pFn) return;
    var tentar = function () {
      clearTimeout(REPOS.pT);
      REPOS.pT = setTimeout(function () {
        REPOS.pT = 0;
        if (escreveuAgora()) return;                         // ainda em contato: espera o próximo fim de contato
        var c2 = REPOS.pCtx; desarmarCaneta();
        if (c2) reposicionarTinta(c2);                       // reconfere tudo ao executar
      }, 80);                                                // a classe sai no handler da V2, que pode correr depois do nosso
    };
    REPOS.pFn = tentar;
    ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(function (t) { document.addEventListener(t, tentar, { capture: true, passive: true }); });
    REPOS.pLoop = setInterval(tentar, 400);
  }
  function desarmarCaneta() {
    if (REPOS.pFn) ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(function (t) { document.removeEventListener(t, REPOS.pFn, { capture: true }); });
    clearTimeout(REPOS.pT); clearInterval(REPOS.pLoop);
    REPOS.pFn = null; REPOS.pCtx = null; REPOS.pT = 0; REPOS.pLoop = 0;
  }

  /* --------- tinta × alturas que mudam por baixo (achado F da auditoria #420) ---------
     As seções usam content-visibility:auto: ao saltar (índice, volta da Página completa) ou ao rolar, as seções puladas
     são renderizadas e MUDAM DE ALTURA. Os SVG da tinta guardam a geometria de antes, e o ResizeObserver da V2 só observa
     as âncoras/seções COM tinta: uma seção sem tinta que cresce acima de um traço já renderizado não dispara nada, e o
     traço fica a milhares de px do texto (medido: 4 000–21 000 px, sem se corrigir sozinho). A altura TOTAL do documento
     é o sinal barato de que algo acima mudou: se mudou desde o último reposicionamento, pede-se à V2 (API pública) que
     reposicione — sempre depois de o conteúdo assentar. Não toca âncoras, algoritmo nem persistência. */
  var ALT = { h: 0, scroll: 0, poll: 0, img: 0 };
  function alturaDoc() { return Math.round(Math.max(ROOT.scrollHeight, document.body ? document.body.scrollHeight : 0)); }
  /* fim da rolagem (200 ms sem evento): se a altura do documento mudou, reposiciona */
  function vigiarAltura() {
    clearTimeout(ALT.scroll);
    ALT.scroll = setTimeout(function () { ALT.scroll = 0; if (S && alturaDoc() !== ALT.h) reposicionarTinta(); }, 200);
  }
  /* depois de um salto: reposiciona já (o alvo está no lugar) e acompanha até a altura ficar estável por 3 leituras
     seguidas (≈ 300 ms) — ou 4 s, o que vier primeiro. Só enquanto a geração que o pediu continua sendo a atual. */
  function assentarTinta(g) {
    if (!S) return;
    if (g === undefined) g = GER;
    var tab = S.tab;
    clearTimeout(ALT.poll);
    var t0 = Date.now(), ult = -1, iguais = 0;
    if (!vivo(g, tab)) return;
    reposicionarTinta({ g: g, tab: tab, anexo: true });
    (function amostra() {
      if (!vivo(g, tab)) { ALT.poll = 0; return; }           // outro salto/modo/matéria/detach: o acompanhamento morre
      var h = alturaDoc();
      if (h === ult) iguais++; else { if (ult !== -1) reposicionarTinta({ g: g, tab: tab, anexo: true }); iguais = 0; ult = h; }
      if (iguais >= 3 || Date.now() - t0 > 4000) { ALT.poll = 0; return; }
      ALT.poll = setTimeout(amostra, 100);
    })();
  }
  /* imagem que termina de carregar muda a altura da seção (sem width/height) */
  function aoCarregarImagem(e) {
    var t = e && e.target; if (!S || !t || t.tagName !== 'IMG') return;
    clearTimeout(ALT.img); ALT.img = setTimeout(function () { ALT.img = 0; if (S) reposicionarTinta(); }, 150);
  }

  /* ---------------------------- modo da lateral ------------------------- */
  function lmode() {
    var w = window.innerWidth || ROOT.clientWidth;
    if (w >= W_DOCK && ls('rm.l2.rail') !== 'min') return 'docked';
    if (w >= W_RAIL) return 'rail';
    return 'off';
  }
  /* ---------------------------- dock do player ---------------------------
     Lateral (side) ou inferior (bottom) decide-se pelo ESPAÇO EFETIVAMENTE LIVRE à direita do
     cartão de texto, não por uma soma de larguras. O `.container` (880) é CENTRADO entre a
     lateral e a toolbox: o espaço livre divide-se pelos dois lados, logo
        borda direita do cartão = left + (R + min(880, R)) / 2,   R = largura − left − toolbox
     e o player lateral (PLAYER_W, encostado à toolbox com PLAYER_EDGE) só cabe se a sua borda
     esquerda ficar a PLAYER_GAP ou mais dessa borda. Preferimos a borda REAL medida no DOM (o
     cartão é a folha do caderno, com sombra: não se cobre); sem medida, usamos a fórmula.
     clientWidth (sem a barra de rolagem) é o mesmo referencial do `position:fixed`.
     Histerese: para PASSAR de bottom a side exige-se DOCK_HYST px extra (na 1.ª decisão não), para a barra de rolagem
     (que aparece/desaparece com a altura) não fazer o dock oscilar. */
  function cartaoTeorico(cw, left) {
    var R = cw - left - RIGHT_RAIL, col = Math.min(TEXT_COL, R);
    return left + (R + col) / 2;
  }
  function cartaoMedido() {
    try {
      var c = document.querySelector('#materias-container .tab-content.active section.container') ||
              document.querySelector('#materias-container section.container');
      if (!c) return null;
      var r = c.getBoundingClientRect();
      return r.width > 0 ? r.right : null;
    } catch (e) { return null; }
  }
  function decidirDock(cw, left, cartaoR, atual) {
    var playerL = (cw - RIGHT_RAIL) - PLAYER_EDGE - PLAYER_W;
    var cr = cartaoR == null ? cartaoTeorico(cw, left) : cartaoR;
    var folga = playerL - (cr + PLAYER_GAP);
    return folga >= (atual === 'bottom' ? DOCK_HYST : 0) ? 'side' : 'bottom';
  }

  /* Mudar lateral/dock no meio de um traço deslocaria a escrita: adia até a caneta levantar. A classe
     `rm2-pen-down` sai no handler do rm-tools-v2 (que pode correr depois do nosso, em captura): por isso
     reavalia-se um instante depois do pointerup/cancel, e só então se aplica. */
  function escrevendo() { try { return !!(document.body && document.body.classList.contains('rm2-pen-down')); } catch (e) { return false; } }
  function adiarModo() {
    if (!S || S.adia) return;
    var retoma = function () {
      if (!S || !S.adia) return;
      S.adiaT = setTimeout(function () {
        S.adiaT = 0;
        if (!S || escrevendo()) return;              // ainda há contacto: espera o próximo up/cancel
        desarmarAdia(); aplicarModo();
      }, 80);
    };
    S.adia = retoma;
    document.addEventListener('pointerup', retoma, true);
    document.addEventListener('pointercancel', retoma, true);
  }
  function desarmarAdia() {
    if (!S || !S.adia) return;
    document.removeEventListener('pointerup', S.adia, true);
    document.removeEventListener('pointercancel', S.adia, true);
    if (S.adiaT) clearTimeout(S.adiaT);
    S.adia = null; S.adiaT = 0;
  }

  function aplicarModo() {
    if (!S) return;
    if (escrevendo()) { adiarModo(); return; }
    var w = window.innerWidth || ROOT.clientWidth, m = lmode();
    var mudou = S.lm !== undefined && S.lm !== m;           // docked ↔ rail ↔ off: muda a reserva lateral
    S.lm = m;
    ROOT.setAttribute('data-rm-lmode', m);
    var left =m === 'docked' ? 264 : (m === 'rail' ? 64 : 0);
    /* dock do futuro player: pelo espaço efetivamente livre à direita do cartão de texto
       (as variáveis de lateral já estão aplicadas; a leitura abaixo força o layout). */
    ROOT.setAttribute('data-rm-dock', decidirDock(ROOT.clientWidth || w, left, cartaoMedido(), ROOT.getAttribute('data-rm-dock')));
    if (m === 'docked' && S.drawer) fecharDrawer(true);          // não faz sentido drawer com a lateral aberta
    if (S.railBtn) {
      var min = ls('rm.l2.rail') === 'min';
      S.railBtn.setAttribute('aria-label', min ? 'Expandir la barra lateral' : 'Minimizar la barra lateral');
      S.railBtn.setAttribute('aria-expanded', String(!min));
      S.railBtn.replaceChild(svg(min ? 'max' : 'min'), S.railBtn.firstChild);
      S.railBtn.style.display = (w >= W_RAIL) ? '' : 'none';
    }
    medirBanda();
    if (mudou) reposicionarTinta();
  }

  /* A faixa é fixed (o sticky do site não gruda: html/body têm overflow-x:hidden).
     Ela acompanha o espaçador enquanto o cabeçalho ainda está à vista e
     gruda no topo (0) quando ele sai. */
  function medirBanda() {
    if (!S || !S.band || !S.ph) return;
    var t = Math.max(0, Math.round(S.ph.getBoundingClientRect().top));
    ROOT.style.setProperty('--rm-band-top', t + 'px');
    ROOT.style.setProperty('--rm-band-bottom', (t + S.band.offsetHeight) + 'px');
  }

  /* ------------------------------- drawer ------------------------------- */
  function abrirDrawer() {
    if (!S || S.drawer) return;
    S.drawer = true;
    S.side.classList.add('is-open'); S.backdrop.classList.add('is-on');
    ROOT.setAttribute('data-rm-drawer', 'open');
    S.hamb.setAttribute('aria-expanded', 'true');
    var f = S.side.querySelector('button, a'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }
  function fecharDrawer(semFoco) {
    if (!S || !S.drawer) return;
    S.drawer = false;
    S.side.classList.remove('is-open'); S.backdrop.classList.remove('is-on');
    ROOT.removeAttribute('data-rm-drawer');
    S.hamb.setAttribute('aria-expanded', 'false');
    if (!semFoco) { try { S.hamb.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ------------------------------- faixa -------------------------------- */
  function montarBanda(cat) {
    var band = ui('div', 'rm-l2-band', { id: 'rm-l2-band', role: 'banner', 'aria-label': 'Materia' });
    var hamb = ui('button', 'rm-l2-hamb', { type: 'button', 'aria-label': 'Abrir el índice', 'aria-expanded': 'false', 'aria-controls': 'rm-l2-side' });
    hamb.appendChild(svg('menu'));
    var logo = ui('img', 'rm-l2-logo', { src: 'assets/repasso-med-logo.png', alt: 'Repasso Med', width: '27', height: '34', decoding: 'async' });   // marca original, o mesmo arquivo do cabeçalho do site
    var nome = ui('div', 'rm-l2-name');
    var b = el('b'); b.textContent = cat.title || 'Semiología II';
    var sm = el('small'); sm.textContent = cat.sub || '';
    nome.appendChild(b); nome.appendChild(sm);
    var chip = ui('span', 'rm-l2-chip', { 'aria-live': 'polite' }); chip.textContent = 'Página completa';
    var mat = ui('button', 'rm-l2-mat', { type: 'button', 'aria-label': 'Volver a las materias', title: 'Materias' });
    mat.appendChild(svg('home')); var ml = el('span'); ml.textContent = 'Materias'; mat.appendChild(ml);
    band.appendChild(hamb); band.appendChild(logo); band.appendChild(nome); band.appendChild(ui('span', 'rm-l2-sp')); band.appendChild(chip); band.appendChild(mat);
    return { band: band, hamb: hamb, chip: chip, mat: mat };
  }

  /* ------------------- capa da matéria + SLOTS de arte -------------------
     A capa é CÓDIGO (HTML/CSS/JS): título, subtítulo, ações e o container da arte. Nada aqui é imagem de texto, e a ARTE FINAL
     (banner/ilustração autoral da Semiología II) é produzida à parte e integrada depois: o slot só reserva o espaço.
     SLOT `hero`: enquanto ASSETS.hero for null o container fica `hidden` (estado «vacío», 0 px, sem desenho improvisado);
     quando houver arquivo, basta preencher o objeto — não é preciso reconstruir o layout:
       ASSETS.hero = { src: 'assets/semio2/hero-1x.webp', srcset: 'assets/semio2/hero-1x.webp 1x, assets/semio2/hero-2x.webp 2x',
                       w: 1600, h: 900, alt: 'texto alternativo', pos: '50% 40%' }
     `w`/`h` reservam o espaço (aspect-ratio ⇒ 0 deslocamento ao carregar); `object-fit: cover` preserva a proporção (sem
     deformar) e `pos` escolhe o recorte; `srcset` entrega nitidez em retina/tablet. Estados: cargando (esqueleto neutro) →
     listo; error ⇒ o slot colapsa (sem ícone de imagem quebrada). Também dá para chamar RMLayout.setAsset('hero', spec). */
  var ASSETS = { hero: null };

  function renderArte(slot) {
    if (!S || !S.arte) return;
    var fig = S.arte, spec = ASSETS[slot];
    while (fig.firstChild) fig.removeChild(fig.firstChild);
    S.capa.classList.remove('has-art');
    if (!spec || !spec.src) { fig.hidden = true; fig.setAttribute('data-state', 'vacio'); return; }
    var w = +spec.w || 16, h = +spec.h || 9;
    var frame = ui('div', 'rm-l2-art-frame'); frame.style.aspectRatio = w + ' / ' + h;
    var im = ui('img', 'rm-l2-art-img', { alt: spec.deco ? '' : (spec.alt || ''), width: String(w), height: String(h), decoding: 'async', fetchpriority: 'high' });
    if (spec.deco) im.setAttribute('role', 'presentation');
    if (spec.pos) im.style.objectPosition = spec.pos;
    if (spec.srcset) im.setAttribute('srcset', spec.srcset);
    if (spec.sizes) im.setAttribute('sizes', spec.sizes);
    fig.hidden = false; fig.setAttribute('data-state', 'cargando'); S.capa.classList.add('has-art');
    var tok = S, listo = function () { if (S === tok && S.arte === fig) fig.setAttribute('data-state', 'listo'); };
    im.addEventListener('load', listo);
    im.addEventListener('error', function () { if (S === tok && S.arte === fig) { fig.hidden = true; fig.setAttribute('data-state', 'error'); S.capa.classList.remove('has-art'); } });
    im.src = spec.src;
    frame.appendChild(im); fig.appendChild(frame);
    if (im.complete && im.naturalWidth > 0) listo();
  }

  /* Recursos da matéria para a capa: SÓ o que existe, com contagem derivada do DOM (nada inventado).
     Banco geral e «Todos los flashcards» reúnem as MESMAS entidades dos blocos: ficam fora da contagem (senão contaria duas vezes).
     Infografía = <figure> com legenda e imagem; radiografias/diapositivas (.material-slide) e fotos soltas NÃO são infográficos.
     Cada cartão salta, na Página completa, para a primeira ocorrência (irPara: geração/cancelamento já existentes). */
  var RES_REUNE = /banco|flashcards/i;
  function recursosDaMateria(tab, bl) {
    var secs = bl.filter(function (b) { return !RES_REUNE.test(b.id); }).map(function (b) { return b.sec; });
    var todos = function (sel) { var o = []; secs.forEach(function (sc) { Array.prototype.forEach.call(sc.querySelectorAll(sel), function (n) { o.push(n); }); }); return o; };
    var out = [];
    if (bl[0]) out.push({ k: 'res', icon: 'index', t: 'Resumen', sub: 'Contenido completo', alvo: bl[0].sec });
    var figs = todos('figure').filter(function (f) {
      return f.querySelector('figcaption') && f.querySelector('img, .s2-photo[role="img"], img.rmc-photo') && !f.closest('.material-slide, .med-image');
    });
    if (figs.length) out.push({ k: 'fig', icon: 'img', t: 'Infografías', sub: figs.length + (figs.length === 1 ? ' infografía' : ' infografías'), alvo: figs[0] });
    var qs = todos('.quiz-item');
    if (qs.length) out.push({ k: 'quiz', icon: 'q', t: 'Preguntas', sub: qs.length + (qs.length === 1 ? ' pregunta' : ' preguntas'), alvo: qs[0].closest('.quiz-section') || qs[0] });
    var fc = todos('.flashcard');
    if (fc.length) out.push({ k: 'fc', icon: 'cards', t: 'Flashcards', sub: fc.length + (fc.length === 1 ? ' tarjeta' : ' tarjetas'), alvo: lancadorFc(fc[0]) });
    var au = todos('audio');
    if (au.length) out.push({ k: 'aud', icon: 'wave', t: 'Auscultación', sub: au.length + (au.length === 1 ? ' sonido' : ' sonidos'), alvo: au[0].closest('.audio-player') || au[0] });
    var vd = todos('details.video-collapsible');
    if (vd.length) out.push({ k: 'vid', icon: 'play', t: 'Videos', sub: vd.length + (vd.length === 1 ? ' video' : ' videos'), alvo: vd[0] });
    return out;
  }

  function montarCapa(cat, bl, tab) {
    var capa = ui('div', 'rm-l2-cover', { role: 'region', 'aria-label': 'Presentación de la materia' });
    var cuerpo = ui('div', 'rm-l2-cover-body');
    var eb = ui('p', 'rm-l2-eyebrow'); eb.textContent = 'Repasso Med · Guía de estudio';
    var h1 = ui('h1', 'rm-l2-cover-title'); h1.textContent = cat.title || 'Semiología II';
    cuerpo.appendChild(eb); cuerpo.appendChild(h1);
    if (cat.sub) { var sb = ui('p', 'rm-l2-cover-sub'); sb.textContent = cat.sub; cuerpo.appendChild(sb); }
    var meta = ui('p', 'rm-l2-cover-meta'); meta.textContent = bl.length + ' bloques'; cuerpo.appendChild(meta);
    var acc = ui('div', 'rm-l2-cover-actions');
    var go = ui('button', 'rm-l2-btn rm-l2-btn-primary', { type: 'button', 'data-act': 'go' }); go.textContent = 'Ir al contenido';
    var ix = ui('button', 'rm-l2-btn rm-l2-btn-ghost rm-l2-btn-idx', { type: 'button', 'data-act': 'idx' });
    ix.appendChild(svg('index')); var il = el('span'); il.textContent = 'Ver el índice'; ix.appendChild(il);
    acc.appendChild(go); acc.appendChild(ix); cuerpo.appendChild(acc);
    var arte = ui('figure', 'rm-l2-art', { 'data-slot': 'hero', 'data-state': 'vacio' }); arte.hidden = true;
    capa.appendChild(cuerpo); capa.appendChild(arte);
    var recs = recursosDaMateria(tab, bl), fila = null;
    if (recs.length > 1) {                                        // só o Resumen não é uma fileira: recurso ausente = cartão ausente
      fila = ui('div', 'rm-l2-res', { role: 'group', 'aria-label': 'Recursos de la materia' });
      recs.forEach(function (r, i) {
        var c = ui('button', 'rm-l2-rescard rm-l2-rescard--' + r.k, { type: 'button', 'data-res': String(i) });
        var ic = ui('span', 'rm-l2-rescard-ico'); ic.appendChild(svg(r.icon)); c.appendChild(ic);
        var tx = ui('span', 'rm-l2-rescard-tx');
        var tt = ui('b', 'rm-l2-rescard-t'); tt.textContent = r.t; var ss = ui('span', 'rm-l2-rescard-s'); ss.textContent = r.sub;
        tx.appendChild(tt); tx.appendChild(ss); c.appendChild(tx);
        var ar = ui('span', 'rm-l2-rescard-go'); ar.appendChild(svg('max')); c.appendChild(ar);
        c.setAttribute('aria-label', r.t + ': ' + r.sub);
        fila.appendChild(c);
      });
      capa.appendChild(fila);
    }
    return { capa: capa, arte: arte, res: recs };
  }

  /* ------------------------------ lateral ------------------------------- */
  function item(icon, label, cls, attrs) {
    var b = ui('button', 'rm-l2-item ' + (cls || ''), Object.assign({ type: 'button', title: label }, attrs || {}));
    b.appendChild(svg(icon));
    var s = el('span', 'lbl'); s.textContent = label; b.appendChild(s);
    return b;
  }

  function montarLateral(tab, bl) {
    var side = ui('aside', 'rm-l2-side', { id: 'rm-l2-side', 'aria-label': 'Navegación de la materia' });
    var head = ui('div', 'rm-l2-side-head');
    var railBtn = ui('button', 'rm-l2-rail-btn', { type: 'button' });
    railBtn.appendChild(svg('min'));
    head.appendChild(railBtn);
    var close = ui('button', 'rm-l2-close', { type: 'button', 'aria-label': 'Cerrar el índice' });
    close.appendChild(svg('close')); head.appendChild(close);
    side.appendChild(head);

    var sc = ui('div', 'rm-l2-side-scroll'); side.appendChild(sc);

    var full = item('index', 'Página completa — Índice', 'is-mode is-active', { 'data-view': 'full' });
    sc.appendChild(full);

    /* árvore (só na Página completa) */
    var tree = ui('div', 'rm-l2-tree');
    var tools = ui('div', 'rm-l2-tree-tools');
    var tog = ui('button', 'rm-l2-tree-toggle', { type: 'button', 'aria-expanded': 'false' });
    tog.appendChild(svg('caret')); var tl = el('span'); tl.textContent = 'Expandir índice'; tog.appendChild(tl);
    tools.appendChild(tog); tree.appendChild(tools);

    var linhas = {};
    bl.forEach(function (b) {
      var row = ui('div', 'rm-l2-block', { 'data-block': b.id });
      var head2 = ui('div', 'rm-l2-block-head');
      var open = ui('button', 'rm-l2-block-open', { type: 'button', 'aria-expanded': 'false', 'aria-label': 'Mostrar temas de ' + b.label });
      open.appendChild(svg('caret'));
      var go = ui('a', 'rm-l2-block-link', { href: '#' + b.id, 'data-target': b.id });
      var num = el('i'); num.textContent = (b.n < 10 ? '0' : '') + b.n;
      var lab = el('span'); lab.textContent = b.label;
      go.appendChild(num); go.appendChild(lab);
      head2.appendChild(open); head2.appendChild(go);
      row.appendChild(head2);
      var body = ui('div', 'rm-l2-block-body', { hidden: '' });
      if (b.recursos.length) {
        var chips = ui('div', 'rm-l2-chips');
        b.recursos.forEach(function (r) {
          var c = ui('button', 'rm-l2-chip-r t-' + r.k, { type: 'button', title: r.label + ' de este bloque' });
          c.textContent = r.label; c._alvo = r.alvo; chips.appendChild(c);
        });
        body.appendChild(chips);
      }
      b.subs.forEach(function (s) {
        var a = ui('a', 'rm-l2-sub', { href: '#' + s.id, 'data-target': s.id });
        a.textContent = s.txt; body.appendChild(a);
      });
      row.appendChild(body);
      tree.appendChild(row);
      linhas[b.id] = { row: row, open: open, body: body, go: go };
    });
    sc.appendChild(tree);

    /* modos de estudo — só os que existem; vazios na B1 */
    var disp = window.RMModes.disponiveis();
    var modosBox = ui('div', 'rm-l2-modes');
    var fimBox = ui('div', 'rm-l2-modes rm-l2-modes-end');
    var btnsModo = {};
    if (disp.some(function (m) { return !m.fim; })) {
      var sep = ui('div', 'rm-l2-sep'); sep.textContent = 'Modos de estudio'; modosBox.appendChild(sep);
    }
    disp.forEach(function (m) {
      var b = item(m.icon, m.label, 'is-mode', { 'data-view': m.id });
      btnsModo[m.id] = b; (m.fim ? fimBox : modosBox).appendChild(b);
    });
    if (fimBox.firstChild) { var sep2 = ui('div', 'rm-l2-sep'); sep2.textContent = 'Revisión reunida'; fimBox.insertBefore(sep2, fimBox.firstChild); }
    sc.appendChild(modosBox); sc.appendChild(fimBox);

    /* rodapé: voltar ao topo + sugerencias (os flutuantes antigos ficam ocultos no piloto) */
    var foot = ui('div', 'rm-l2-side-foot');
    var top = item('top', 'Volver arriba', '', { 'data-act': 'top' });
    var sug = item('mail', 'Sugerencias', '', { 'data-act': 'sug' });
    foot.appendChild(top); foot.appendChild(sug); side.appendChild(foot);

    btnsModo.full = full;
    return { side: side, railBtn: railBtn, close: close, tree: tree, tog: tog, tl: tl, linhas: linhas, btns: btnsModo, full: full, top: top, sug: sug };
  }

  /* ------------------------- painel vazio dos modos --------------------- */
  function montarRaiz() {
    var r = ui('div', 'rm-l2-mode-root', { id: 'rm-mode-root', role: 'region', 'aria-label': 'Modo de estudio' });
    var box = ui('div', 'rm-l2-empty');
    var h = ui('div', 'rm-l2-empty-t'); box.appendChild(h);
    var p = ui('div', 'rm-l2-empty-p');
    p.textContent = 'Este modo de estudio todavía está vacío: se activa en una próxima etapa del piloto. Tu contenido y tus anotaciones están a salvo en la Página completa.';
    box.appendChild(p);
    var back = ui('button', 'rm-l2-empty-back', { type: 'button', 'data-view': 'full' });
    back.textContent = 'Volver a la Página completa'; box.appendChild(back);
    r.appendChild(box);
    return { root: r, titulo: h, back: back };
  }

  /* --------------------------- estado visual ---------------------------- */
  function refletirModo() {
    if (!S) return;
    var v = window.RMModes.view, m = window.RMModes.porId(v);
    S.chip.textContent = m ? m.label : 'Página completa';
    S.titulo.textContent = m ? m.label : '';
    Object.keys(S.lat.btns).forEach(function (k) {
      var b = S.lat.btns[k]; var on = (k === v);
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  function abrirBloco(id, abrir) {
    var l = S.lat.linhas[id]; if (!l) return;
    l.body.hidden = !abrir; l.open.setAttribute('aria-expanded', String(abrir));
    l.row.classList.toggle('is-open', abrir);
  }
  function atualizarToggleArvore() {
    var todos = S.blocos.every(function (b) { return !S.lat.linhas[b.id].body.hidden; });
    S.lat.tog.setAttribute('aria-expanded', String(todos));
    S.lat.tl.textContent = todos ? 'Recoger índice' : 'Expandir índice';
  }

  /* bloco visível agora (scroll-spy): barato — ~15 seções */
  function espiar() {
    if (!S) return;
    S.spyPend = false;
    if (window.RMModes.view !== 'full') return;
    var lim = hdrH() + 80, atual = null;
    for (var i = 0; i < S.blocos.length; i++) {
      var r = S.blocos[i].sec.getBoundingClientRect();
      if (r.top <= lim) atual = S.blocos[i]; else break;
    }
    var id = atual ? atual.id : null;
    if (id === S.atual) return;
    S.atual = id;
    S.blocos.forEach(function (b) {
      var go = S.lat.linhas[b.id].go;
      if (b.id === id) go.setAttribute('aria-current', 'location'); else go.removeAttribute('aria-current');
    });
    if (id) abrirBloco(id, true);                    // por padrão expande o bloco atual
    atualizarToggleArvore();
  }
  function agendarEspia() {
    if (!S || S.spyPend) return;
    S.spyPend = true; requestAnimationFrame(espiar);
  }

  /* ------------------------------ eventos -------------------------------- */
  function aoClicarLateral(e) {
    var t = e.target; if (!t || !t.closest) return;
    var modo = t.closest('[data-view]');
    if (modo) {
      var v = modo.getAttribute('data-view');
      if (v === 'full' && lmode() === 'rail' && window.RMModes.view === 'full' && !S.drawer) { abrirDrawer(); return; }   // trilho: o ícone abre o índice
      window.RMModes.requestView(v);
      if (S.drawer) fecharDrawer(true);
      return;
    }
    var chip = t.closest('.rm-l2-chip-r');
    if (chip) { if (S.drawer) fecharDrawer(true); irPara(chip._alvo); return; }
    var open = t.closest('.rm-l2-block-open');
    if (open) { var bid = open.closest('[data-block]').getAttribute('data-block'); abrirBloco(bid, S.lat.linhas[bid].body.hidden); atualizarToggleArvore(); return; }
    var link = t.closest('a[data-target]');
    if (link) {
      e.preventDefault();
      var alvo = S.tab.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(link.getAttribute('data-target')) : link.getAttribute('data-target')));
      if (S.drawer) fecharDrawer(true);
      if (window.RMModes.view !== 'full') {
        /* vindo de um modo isolado: o layout completo assenta PRIMEIRO, só depois se rola
           até o tema (sem devolver a rolagem antiga por cima) */
        window.RMModes.requestView('full', { restaurar: false, depois: function () { irPara(alvo); } });
      } else {
        irPara(alvo);
      }
      return;
    }
    if (t.closest('.rm-l2-tree-toggle')) {
      var abrirTodos = S.lat.tog.getAttribute('aria-expanded') !== 'true';
      S.blocos.forEach(function (b) { abrirBloco(b.id, abrirTodos); });
      atualizarToggleArvore(); return;
    }
    if (t.closest('.rm-l2-rail-btn')) {
      ls('rm.l2.rail', ls('rm.l2.rail') === 'min' ? 'max' : 'min'); aplicarModo(); return;
    }
    if (t.closest('.rm-l2-close')) { fecharDrawer(); return; }
    var act = t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (S.drawer) fecharDrawer(true);
      if (a === 'top') { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (x) { window.scrollTo(0, 0); } }
      if (a === 'sug') { try { if (window.RepassoMed && RepassoMed.abrirSugestoes) RepassoMed.abrirSugestoes(S.tab); } catch (x) {} }
    }
  }

  function ligar() {
    S.h = {
      lat: aoClicarLateral,
      resize: function () { aplicarModo(); agendarEspia(); },
      scroll: function () { medirBanda(); agendarEspia(); vigiarAltura(); },
      img: aoCarregarImagem,
      key: function (e) { if (e.key === 'Escape' && S && S.drawer) { e.preventDefault(); fecharDrawer(); } },
      hamb: function () { if (S.drawer) fecharDrawer(); else abrirDrawer(); },
      back: function () { fecharDrawer(true); },
      mat: function () { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (x) { window.scrollTo(0, 0); } },
      capa: function (e) {
        var rc = e.target && e.target.closest && e.target.closest('[data-res]');
        if (rc && S && S.capaRes) {                                  // cartão de recurso: salta para a primeira ocorrência, na Página completa
          var r = S.capaRes[+rc.getAttribute('data-res')]; if (r && r.alvo && r.alvo.isConnected !== false) irPara(r.alvo);
          return;
        }
        var b = e.target && e.target.closest && e.target.closest('[data-act]'); if (!b || !S) return;
        if (b.getAttribute('data-act') === 'go') { if (S.blocos[0]) irPara(S.blocos[0].sec); }
        else if (b.getAttribute('data-act') === 'idx') { if (lmode() === 'docked') { S.lat.tog && S.lat.tog.focus(); } else abrirDrawer(); }
      },
      raiz: function (e) { if (e.target.closest && e.target.closest('[data-view]')) window.RMModes.requestView('full'); }
    };
    S.side.addEventListener('click', S.h.lat);
    S.hamb.addEventListener('click', S.h.hamb);
    S.backdrop.addEventListener('click', S.h.back);
    S.mat.addEventListener('click', S.h.mat);
    S.rootEl.addEventListener('click', S.h.raiz);
    S.capa.addEventListener('click', S.h.capa);
    window.addEventListener('resize', S.h.resize);
    window.addEventListener('orientationchange', S.h.resize);
    window.addEventListener('scroll', S.h.scroll, { passive: true });
    S.tab.addEventListener('load', S.h.img, true);             // 'load' não borbulha: captura
    document.addEventListener('keydown', S.h.key);
    window.RMModes.onChange(function () { novaGeracao(); refletirModo(); });   // troca de modo: salto/acompanhamento/pedidos anteriores perdem a vez
  }

  /* Logout que NÃO recarrega a página (o «kick» por sessão duplicada, forceLogout, só mostra um aviso por cima): o shell não pode seguir
     vivo com saltos/reposicionamentos pendentes. SIGNED_OUT ⇒ detach; sem pedir reposicionamento depois (a sessão acabou). */
  function ouvirSessao() {
    try {
      var sb = window.RM_SB || window._sb;
      if (!sb || !sb.auth || typeof sb.auth.onAuthStateChange !== 'function') return;
      var r = sb.auth.onAuthStateChange(function (evt) { if (evt === 'SIGNED_OUT' && S) detach({ sessao: true }); });
      S.sub = r && r.data && r.data.subscription;
    } catch (e) {}
  }
  function desligar() {
    try { if (S && S.sub && S.sub.unsubscribe) S.sub.unsubscribe(); } catch (e) {}
    var h = S.h; if (!h) return;
    S.side.removeEventListener('click', h.lat);
    S.hamb.removeEventListener('click', h.hamb);
    S.backdrop.removeEventListener('click', h.back);
    S.mat.removeEventListener('click', h.mat);
    S.rootEl.removeEventListener('click', h.raiz);
    if (S.capa) S.capa.removeEventListener('click', h.capa);
    window.removeEventListener('resize', h.resize);
    window.removeEventListener('orientationchange', h.resize);
    window.removeEventListener('scroll', h.scroll);
    try { S.tab.removeEventListener('load', h.img, true); } catch (e) {}
    document.removeEventListener('keydown', h.key);
    clearTimeout(ALT.scroll); clearTimeout(ALT.poll); clearTimeout(ALT.img); ALT.scroll = ALT.poll = ALT.img = 0;
    desarmarAdia();
  }

  /* ------------------------------- attach -------------------------------- */
  function attach(tab) {
    if (S && S.tab === tab) return;
    if (S) detach();
    novaGeracao();
    var cat = catalogo();
    var bl = blocos(tab);
    if (!bl.length) throw new Error('sem blocos');           // nada para navegar: não vira piloto

    ROOT.classList.add('rm-l2');
    window.RMModes.attach(tab);

    S = { tab: tab, blocos: bl, drawer: false, atual: null, spyPend: false };
    var b = montarBanda(cat); S.band = b.band; S.hamb = b.hamb; S.chip = b.chip; S.mat = b.mat;
    var lat = montarLateral(tab, bl); S.lat = lat; S.side = lat.side; S.railBtn = lat.railBtn;
    S.backdrop = ui('div', 'rm-l2-backdrop');
    var raiz = montarRaiz(); S.rootEl = raiz.root; S.titulo = raiz.titulo;
    var cp = montarCapa(cat, bl, tab); S.capa = cp.capa; S.arte = cp.arte; S.capaRes = cp.res;
    var cab = tab.querySelector(':scope > .rm-subject-head');       // header gerado pelo app-core (não é conteúdo): a capa o substitui no piloto
    if (cab && cab.parentNode) cab.parentNode.insertBefore(S.capa, cab.nextSibling);
    else { var s1 = tab.querySelector('section'); (s1 ? s1.parentNode : tab).insertBefore(S.capa, s1 || tab.firstChild); }
    ROOT.setAttribute('data-rm-cover', '');
    renderArte('hero');
    S.player = ui('div', 'rm-l2-player', { id: 'rm-l2-player', role: 'region', 'aria-label': 'Audiobook', hidden: '' });   // slot futuro, 0 px

    var cont = document.getElementById('materias-container');
    S.ph = ui('div', 'rm-l2-band-ph');                       // espaçador: guarda o lugar da faixa no fluxo
    cont.parentNode.insertBefore(S.ph, cont);
    cont.parentNode.insertBefore(S.band, cont);              // faixa: irmã do contêiner (fixed)
    cont.appendChild(S.rootEl);                              // raiz dos modos: fora de qualquer section[id]
    /* lateral logo depois da faixa no DOM: a ordem do Tab é faixa → lateral → conteúdo
       (ambas são fixed, então a posição no DOM não muda o desenho) */
    cont.parentNode.insertBefore(S.side, S.ph);
    cont.parentNode.insertBefore(S.backdrop, S.ph);
    document.body.appendChild(S.player);

    ligar();
    ouvirSessao();
    aplicarModo();
    refletirModo();
    atualizarToggleArvore();
    raf2(function () { medirBanda(); espiar(); });
    reposicionarTinta();                                     // o shell acabou de reservar as laterais
  }

  function detach(opts) {
    if (!S) { try { ROOT.classList.remove('rm-l2'); } catch (e) {} return; }
    var abaSaiu = S.tab;
    novaGeracao(); desarmarCaneta();                         // nada pedido antes do detach pode agir depois dele
    /* sem requestView aqui: voltar à Página completa devolveria a rolagem antiga
       por cima da matéria que o aluno está abrindo. O RMModes.detach() abaixo
       só zera o estado; a classe rm-l2 sai e o conteúdo reaparece sozinho. */
    desligar();
    [S.band, S.ph, S.side, S.backdrop, S.rootEl, S.player, S.capa].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    ['data-rm-lmode', 'data-rm-dock', 'data-rm-drawer', 'data-rm-cover'].forEach(function (a) { ROOT.removeAttribute(a); });
    ROOT.style.removeProperty('--rm-band-bottom'); ROOT.style.removeProperty('--rm-band-top');
    ROOT.classList.remove('rm-l2');
    try { window.RMModes.detach(); } catch (e) {}
    S = null;
    /* as reservas saíram: o conteúdo voltou ao X original — só importa se a matéria CONTINUA na tela; se o aluno
       saiu dela, a aba está inativa e o pedido vira NO-OP (0 reposicionamento tardio) */
    if (!(opts && opts.sessao)) reposicionarTinta({ g: GER, tab: abaSaiu, anexo: false });      // logout: nada de pedir à V2 depois
  }

  window.RMLayout = {
    attach: attach,
    detach: function () { detach(); },                        // API pública sem argumentos (o rm-pilot chama assim)
    ASSETS: ASSETS,                                          // slots de arte (hoje vazios): ver «capa da matéria + SLOTS de arte»
    setAsset: function (slot, spec) { ASSETS[slot] = spec || null; renderArte(slot); },
    assentarTinta: assentarTinta,                            // usado por rm-modes.js ao voltar à Página completa
    pedirReposicao: function () { reposicionarTinta(); },    // idem: único caminho até RMToolsV2.reposicionar (coalescido, nunca durante o contato da caneta)
    /* Para o sistema visual de matérias (rm-materia-sistema.js): reaproveita o MESMO salto (geração/cancelamento) e os recursos reais da capa.
       Só leitura/salto; nada de tinta, caneta, âncora ou geometria. */
    irPara: function (alvo) { irPara(alvo); },
    recursos: function () { return S && S.capaRes ? S.capaRes.slice() : []; },
    /* só leitura, para teste/diagnóstico */
    _dock: decidirDock, _cartaoTeorico: cartaoTeorico,
    _estado: function () { return S ? { tab: S.tab && S.tab.id, blocos: S.blocos.length, drawer: S.drawer, lmode: ROOT.getAttribute('data-rm-lmode'), dock: ROOT.getAttribute('data-rm-dock') } : null; }
  };
})();
