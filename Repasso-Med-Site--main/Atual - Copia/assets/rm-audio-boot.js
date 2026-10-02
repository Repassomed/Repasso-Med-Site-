/* =====================================================================
   REPASSO MED · rm-audio-boot.js
   INTEGRAÇÃO do audiobook no piloto (card no bloco + player único no slot).

   QUEM CARREGA: só o rm-pilot.js, e só depois de o Layout V2 estar ativo para a
   conta do piloto (ver «Contrato de carga» abaixo). Nenhum <script> estático.
   Sem isto nada de áudio existe no site: nem JS, nem CSS, nem pedido de rede.

   PORTÕES (todos falham FECHADOS; qualquer erro ⇒ stop() e a página fica como antes)
     1. aba ativa = semiologia-ii (`#tab-semio2`);
     2. Layout V2 ativo: existem `window.RMLayout` e o slot `#rm-l2-player`;
     3. sessão válida (token) e **manifesto do SERVIDOR** não vazio — o servidor decide por
        UID autenticado (RM_PILOT_AUDIO_UIDS); aqui não existe UID, e-mail nem lista;
     4. cada URL de áudio só é assinada pelo servidor no play().

   O QUE FAZ
     · só depois do portão 3 carrega rm-audio.css/js, rm-audio-store.js, rm-audio-provider.js;
     · cria UM card `[data-rm-ui]` (div/span/b/button/svg — nunca p, li, h1–h6, table, figure) logo
       depois do título do bloco; o card NUNCA pede mídia: «Escuchar» / «Continuar · m:ss»;
     · um único motor + um único player no slot; velocidades 1/1,25/1,5/2/2,5; pausa mantém
       aberto; fechar pausa, guarda a posição e devolve o foco ao card SEM rolar;
     · posição guardada no navegador (localStorage por UID) — NÃO acompanha o aluno entre aparelhos;
     · um áudio por vez: tocar um <audio>/<video> da matéria (ausculta) pausa o audiobook e
       vice-versa, sem retomar; (embeds do YouTube não são controláveis: o piloto não tem vídeos);
     · caneta/borracha armada ⇒ o player encolhe (`data-rm-pen`), NUNCA pausa;
     · sair da matéria, o slot sumir ou SIGNED_OUT ⇒ pausa, guarda a posição, remove cards e destrói.

   CONTRATO DE CARGA (a única edição pedida ao rm-pilot.js; 1 chamada):
       // depois de window.RMLayout.attach(tab) funcionar:
       js('assets/rm-audio-boot.js?v=…').then(function () { window.RMAudioBoot.start(); });
       // e em desativar():  if (window.RMAudioBoot) window.RMAudioBoot.stop();
   `start()` é idempotente e pode ser chamada de novo sem efeito.
   ===================================================================== */
(function (root) {
  'use strict';
  if (root.RMAudioBoot) return;

  var SLUG = 'semiologia-ii';
  var TAB_ID = 'tab-semio2';
  var SLOT = '#rm-l2-player';
  var BASE = 'assets/';
  var FN = '/.netlify/functions';
  var PEN_RE = /\brm2-t-(pen|eraser)\b/;
  var st = null;                       // estado da instância ativa
  var meuVer = (function () {
    try { var s = root.document.currentScript && root.document.currentScript.src; var m = s && s.match(/[?&]v=([\w.-]+)/); return m ? m[1] : ''; }
    catch (e) { return ''; }
  })();

  function d() { return root.document; }
  function tabAtiva() { return d().querySelector('#materias-container > .tab-content.active[id^="tab-"]'); }

  function sessao() {
    var s = root.RM_SB || root._sb;
    if (!s || !s.auth || typeof s.auth.getSession !== 'function') return Promise.resolve(null);
    return s.auth.getSession().then(function (r) {
      var se = r && r.data && r.data.session;
      return se && se.access_token && se.user && se.user.id ? { token: se.access_token, uid: String(se.user.id) } : null;
    }, function () { return null; });
  }

  function css(href) {
    return new Promise(function (ok, ko) {
      var l = d().createElement('link');
      l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-rm-audio', 'css');
      l.onload = function () { ok(); }; l.onerror = function () { ko(new Error('css')); };
      d().head.appendChild(l);
    });
  }
  function js(src) {
    return new Promise(function (ok, ko) {
      var s = d().createElement('script');
      s.src = src; s.async = false; s.setAttribute('data-rm-audio', 'js');
      s.onload = function () { ok(); }; s.onerror = function () { ko(new Error('js')); };
      d().head.appendChild(s);
    });
  }

  /* Pedido mínimo do manifesto, ANTES de carregar qualquer arquivo de áudio. Só o servidor decide. */
  function manifestoCru(token) {
    return root.fetch(FN + '/get-audio-manifest?slug=' + encodeURIComponent(SLUG), {
      method: 'GET', headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', credentials: 'omit'
    }).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (j) { return j && Array.isArray(j.items) ? j.items : []; });
  }

  function fmt(t) {
    t = Math.max(0, Math.floor(isFinite(t) ? t : 0));
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function minutos(t) { return Math.max(1, Math.round(t / 60)) + ' min'; }

  /* ------------------------------ cards ------------------------------ */
  var ICO = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1z"/></svg>';

  function criarCard(item) {
    var c = d().createElement('div');
    c.className = 'rm-audio-card';
    c.setAttribute('data-rm-ui', '');
    c.setAttribute('data-audio-id', item.audio_id);
    c.setAttribute('role', 'group');
    c.setAttribute('aria-label', 'Audiolibro: ' + item.title);
    c.innerHTML =
      '<span class="rm-audio-card__ico" aria-hidden="true">' + ICO + '</span>' +
      '<span class="rm-audio-card__txt"><span class="rm-audio-card__kicker"></span><b class="rm-audio-card__title"></b></span>' +
      '<button type="button" class="rm-audio-card__btn"></button>';
    c.querySelector('.rm-audio-card__title').textContent = item.title;
    var btn = c.querySelector('.rm-audio-card__btn');
    btn.setAttribute('data-rm-ui', '');
    btn.addEventListener('click', function () { alternar(item.audio_id); });
    return c;
  }

  function atualizarCards() {
    if (!st || !st.engine) return;
    var s = st.engine.getState();
    st.cards.forEach(function (c) {
      var id = c.getAttribute('data-audio-id'), item = st.itens[id];
      var meu = s.audio_id === id, btn = c.querySelector('.rm-audio-card__btn'), k = c.querySelector('.rm-audio-card__kicker');
      var salvo = st.engine.savedPosition(id);
      var rot, aria;
      if (meu && (s.state === 'playing' || s.state === 'loading')) { rot = s.state === 'loading' ? 'Cargando…' : 'Pausar'; aria = rot === 'Pausar' ? 'Pausar el audiolibro' : 'Cargando el audiolibro'; }
      else if (meu && s.state === 'error') { rot = 'Reintentar'; aria = 'Reintentar el audiolibro'; }
      else if (meu && s.open && s.position > 1) { rot = 'Continuar'; aria = 'Continuar el audiolibro'; }
      else if (salvo > 1) { rot = 'Continuar · ' + fmt(salvo); aria = 'Continuar el audiolibro desde ' + fmt(salvo); }
      else { rot = 'Escuchar'; aria = 'Escuchar el audiolibro'; }
      btn.textContent = rot; btn.setAttribute('aria-label', aria + ': ' + item.title);
      btn.setAttribute('aria-busy', String(meu && s.state === 'loading'));
      c.setAttribute('data-state', meu ? s.state : 'idle');
      k.textContent = 'Audiolibro · ' + minutos(item.duration);
    });
  }

  function alternar(id) {
    var s = st.engine.getState();
    st.ultimoCard = id;
    if (s.audio_id === id && (s.state === 'playing' || s.state === 'loading')) st.engine.pause();
    else st.engine.play(id);
  }

  function inserirCards() {
    var tab = d().getElementById(TAB_ID);
    Object.keys(st.itens).forEach(function (id) {
      var item = st.itens[id], sec = tab && tab.querySelector('section#' + (root.CSS && root.CSS.escape ? root.CSS.escape(item.block_id) : item.block_id));
      if (!sec) return;                                           // sem bloco = sem card (recurso ausente = acesso ausente)
      var card = criarCard(item), h2 = sec.querySelector(':scope > h2');
      if (h2 && h2.parentNode === sec) sec.insertBefore(card, h2.nextSibling); else sec.insertBefore(card, sec.firstChild);
      st.cards.push(card);
    });
  }

  /* ----------------------- arbitragem e ciclo de vida ----------------------- */
  /* Inserir/remover os cards muda a altura da matéria. A tinta (V2) é reposicionada SÓ pelo caminho protegido do Layout
     (`RMLayout.pedirReposicao`, #425): o pedido é coalescido, espera 2 frames + respiro, NUNCA roda enquanto a caneta está em
     contato (`body.rm2-pen-down`/traço em curso: fica pendente até o pointerup/pointercancel) e, ao executar, reconfere matéria,
     geração do shell e Página completa. O boot NÃO chama `RMToolsV2.reposicionar()` diretamente nem agenda timers/rAF próprios:
     assim não há segundo mecanismo concorrente e nenhum callback do áudio sobrevive a trocar de matéria ou sair da conta.
     Sem `pedirReposicao` (Layout anterior à #425) o boot não faz nada: a V2 reposiciona pelo próprio observador. */
  function reposicionarTinta() {
    try {
      var tab = tabAtiva();
      if (!tab || tab.id !== TAB_ID) return;                     // outra matéria: nada a reposicionar
      var L = root.RMLayout;
      if (L && typeof L.pedirReposicao === 'function') L.pedirReposicao();
    } catch (e) { /* ignore */ }
  }

  function pausarNativos() {
    var tab = d().getElementById(TAB_ID);
    if (!tab) return;
    Array.prototype.forEach.call(tab.querySelectorAll('audio, video'), function (m) { try { if (!m.paused) m.pause(); } catch (e) { /* ignore */ } });
  }
  function aoTocarNativo(ev) {                                    // `play` não borbulha: só em captura
    var t = ev.target;
    if (st && st.engine && t && (t.tagName === 'AUDIO' || t.tagName === 'VIDEO')) st.engine.handle('pause-request');
  }
  function aoPersistir() { try { if (st && st.engine) st.engine.flush(); } catch (e) { /* ignore */ } }
  function aoEsconder() { if (d().visibilityState === 'hidden') aoPersistir(); }

  function sincronizarCaneta() {
    if (!st) return;
    var slot = d().querySelector(SLOT);
    if (!slot) return;
    var arm = PEN_RE.test(d().body.className || '');
    if (arm === st.caneta) return;
    st.caneta = arm;
    if (arm) slot.setAttribute('data-rm-pen', ''); else slot.removeAttribute('data-rm-pen');
    try { st.engine.refreshLayout(); } catch (e) { /* ignore */ }  // reaplica --rm-player-h com a altura nova (nunca pausa)
  }

  function verificarVida() {
    if (!st) return;
    var tab = tabAtiva();
    if (!tab || tab.id !== TAB_ID || !d().querySelector(SLOT) || !root.RMLayout) { st.encerrando = true; try { st.engine && st.engine.handle('subject-change'); } catch (e) { /* ignore */ } stop(); }
  }

  /* Vigia a VIDA do boot desde o primeiro instante (antes de o manifesto chegar): trocar de matéria, o slot sumir ou SIGNED_OUT
     enquanto o manifesto/arquivos ainda carregam cancelam tudo — senão cards e player nasceriam numa matéria errada ou para uma
     sessão que já saiu. O stop() desfaz estes observadores e a subscrição. */
  function vigiar() {
    var tabs = d().querySelectorAll('#materias-container > .tab-content');
    st.mo = [];
    var mo = new root.MutationObserver(verificarVida);
    Array.prototype.forEach.call(tabs, function (t) { mo.observe(t, { attributes: true, attributeFilter: ['class'] }); });
    mo.observe(d().body, { childList: true });                    // o slot sai do <body> quando o shell se desfaz
    st.mo.push(mo);
    try {
      var sb = root.RM_SB || root._sb;
      if (sb && sb.auth && typeof sb.auth.onAuthStateChange === 'function') {
        var r = sb.auth.onAuthStateChange(function (evt) { if (evt === 'SIGNED_OUT') { if (st) st.encerrando = true; try { st && st.engine && st.engine.handle('logout'); } catch (e) { /* ignore */ } stop(); } });
        st.sub = r && r.data && r.data.subscription;
      }
    } catch (e) { /* ignore */ }
  }

  function ligarVida() {
    var mp = new root.MutationObserver(sincronizarCaneta);
    mp.observe(d().body, { attributes: true, attributeFilter: ['class'] });
    st.mo.push(mp);
    d().addEventListener('play', aoTocarNativo, true);
    root.addEventListener('pagehide', aoPersistir);
    d().addEventListener('visibilitychange', aoEsconder);
  }

  function stop() {
    var s = st; if (!s) return false;
    st = null;
    try { if (s.engine) s.engine.destroy(); } catch (e) { /* ignore */ }     // pausa + guarda a posição + remove o player
    (s.mo || []).forEach(function (m) { try { m.disconnect(); } catch (e) { /* ignore */ } });
    try { d().removeEventListener('play', aoTocarNativo, true); root.removeEventListener('pagehide', aoPersistir); d().removeEventListener('visibilitychange', aoEsconder); } catch (e) { /* ignore */ }
    try { if (s.sub && s.sub.unsubscribe) s.sub.unsubscribe(); } catch (e) { /* ignore */ }
    var tinham = (s.cards || []).length;
    (s.cards || []).forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
    if (tinham && !s.encerrando) reposicionarTinta();             // trocar de matéria/sair da conta (`encerrando`) não pede nada
    var slot = d().querySelector(SLOT); if (slot) slot.removeAttribute('data-rm-pen');
    return true;
  }

  /* ------------------------------- start ------------------------------- */
  function start(opts) {
    opts = opts || {};
    if (st) return st.promise;
    var tab = tabAtiva();
    if (!tab || tab.id !== TAB_ID || !root.RMLayout || !d().querySelector(SLOT) || !root.fetch || !root.MutationObserver) return Promise.resolve(false);
    var base = opts.base || BASE, ver = opts.ver || meuVer, q = ver ? '?v=' + ver : '';
    var mine = { engine: null, cards: [], itens: {}, mo: [], sub: null, caneta: false, ultimoCard: null };
    st = mine;
    vigiar();
    mine.promise = sessao().then(function (se) {
      if (!se || st !== mine) throw new Error('sin sesión');
      mine.uid = se.uid;
      return manifestoCru(se.token);
    }).then(function (crus) {
      if (st !== mine || !crus.length) throw new Error('sin audiolibros');          // recurso ausente = acesso ausente
      return css(base + 'rm-audio.css' + q)
        .then(function () { return js(base + 'rm-audio.js' + q); })
        .then(function () { return js(base + 'rm-audio-store.js' + q); })
        .then(function () { return js(base + 'rm-audio-provider.js' + q); })
        .then(function () { return crus; });
    }).then(function (crus) {
      if (st !== mine) throw new Error('cancelado');
      var man = root.RMAudio.validateManifest(crus);                              // o motor recusa tudo o que não for só metadado
      if (!man.items.length) throw new Error('manifiesto vacío');
      var supa = typeof root.SUPABASE_URL === 'string' ? root.SUPABASE_URL : (typeof SUPABASE_URL === 'string' ? SUPABASE_URL : '');   // eslint-disable-line no-undef
      var provider = root.RMAudioProvider.create({ getToken: function () { return sessao().then(function (x) { return x && x.token; }); } });
      mine.engine = root.RMAudio.create({
        provider: provider, userKey: mine.uid,
        allowSource: root.RMAudioProvider.allowSource(supa),
        positionStore: root.RMAudioStore.local(mine.uid)
      });
      man.items.forEach(function (it) { mine.itens[it.audio_id] = it; });
      if (!mine.engine.loadMetadata(man.items).ok) throw new Error('metadatos inválidos');
      if (!mine.engine.attach(SLOT)) throw new Error('sin slot');                  // falha fechada: slot ausente ⇒ nada
      inserirCards();
      if (!mine.cards.length) throw new Error('sin bloques');
      reposicionarTinta();
      mine.engine.on('state', function (e) {
        if (e.state === 'playing') pausarNativos();                               // audiobook toca ⇒ ausculta/vídeo param
        atualizarCards();
      });
      mine.engine.on('error', atualizarCards);                                     // `fail()` emite 'error', não 'state'
      mine.engine.on('close', function () {
        atualizarCards();
        var c = mine.cards.filter(function (x) { return x.getAttribute('data-audio-id') === mine.ultimoCard; })[0];
        var b = c && c.querySelector('button');
        try { if (b) b.focus({ preventScroll: true }); } catch (e) { /* ignore */ }   // devolve o foco SEM rolar
      });
      ligarVida();
      sincronizarCaneta();
      atualizarCards();
      return true;
    }).catch(function () { if (st === mine) stop(); return false; });                // qualquer erro ⇒ página como antes
    return mine.promise;
  }

  root.RMAudioBoot = {
    start: start, stop: stop,
    /* só leitura, para teste/diagnóstico: sem UID, token nem URL */
    _estado: function () { return st ? { ativo: !!st.engine, cards: st.cards.length, motor: st.engine ? st.engine.getState() : null } : null; },
    _engine: function () { return st && st.engine; }
  };
})(window);
