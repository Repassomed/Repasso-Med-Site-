/* =====================================================================
   REPASSO MED · rm-pilot.js
   Layout V2 · Fase B1 — GATE DO PILOTO (cliente) + carregador

   REGRAS DE OURO
     · Este é o ÚNICO arquivo do Layout V2 que todo mundo baixa, e é
       pequeno de propósito: só decide SE o resto carrega.
     · Só pergunta ao servidor quando a matéria ativa é a do piloto
       (semiologia-ii). Em qualquer outra matéria: zero requisições,
       zero JS extra, zero CSS extra.
     · Falha FECHADA: sem sessão, erro de rede, resposta estranha ou
       `layout !== true` ⇒ nada é carregado e a experiência atual fica
       exatamente como é.
     · A decisão real é do servidor (netlify/functions/get-pilot-flags.js,
       por UID autenticado). Aqui não existe UID, e-mail nem lista.
     · Não toca no motor de marcação nem na caneta: só chama, quando o
       piloto está ativo, rm-modes.js / rm-layout.js.
     · AUDIOBOOK (ligação, nada mais): DEPOIS de o Layout V2 anexar com
       sucesso, carrega rm-audio-boot.js e chama RMAudioBoot.start(); ao
       desativar, chama RMAudioBoot.stop(). Aqui não há manifesto, UID nem
       lista: quem decide se existe áudio é o servidor (get-audio-manifest,
       por UID autenticado) dentro do boot, que falha FECHADO — sem manifesto
       autorizado nada aparece, nada é baixado e nenhum rm-audio.js/css carrega.
       Mesmo gate do Layout: só semiologia-ii e só com `layout === true`.
   ===================================================================== */
(function () {
  'use strict';
  if (window.RMPilot) return;                         // idempotente

  var SLUG = 'semiologia-ii';                         // piloto: uma matéria só
  var VER  = '2026100201';                            // cache-buster dos módulos (assets/* cacheia 7 dias: mudou um módulo ⇒ sobe a versão aqui e a tag do rm-pilot.js no index.html)
  var BASE = 'assets/';
  var COOLDOWN_MS = 30000;                            // depois de uma falha, não insistir

  var st = { flags: null, asking: null, lastFail: 0, loading: null, loaded: false };

  function tabAtiva() {
    return document.querySelector('#materias-container > .tab-content.active[id^="tab-"]');
  }

  function slugDe(tab) {
    if (!tab || !tab.id) return '';
    var t = tab.id.replace(/^tab-/, '');
    var cat = window.RM_CATALOGO || [];
    for (var i = 0; i < cat.length; i++) if (cat[i].tab === t) return cat[i].slug;
    return '';
  }

  function token() {
    var s = window.RM_SB || window._sb;
    if (!s || !s.auth || typeof s.auth.getSession !== 'function') return Promise.resolve(null);
    return s.auth.getSession().then(function (r) {
      return (r && r.data && r.data.session && r.data.session.access_token) || null;
    }, function () { return null; });
  }

  /* Resposta definitiva (true OU false vinda do servidor) fica em cache na
     página; falha de transporte NÃO vira cache (tenta de novo depois do
     cooldown). Logout recarrega a página (site já faz isso). */
  function pedir() {
    if (st.flags) return Promise.resolve(st.flags);
    if (st.asking) return st.asking;
    if (Date.now() - st.lastFail < COOLDOWN_MS) return Promise.resolve({ layout: false });
    st.asking = token().then(function (t) {
      if (!t) { st.lastFail = Date.now(); return { layout: false }; }
      return fetch('/.netlify/functions/get-pilot-flags?slug=' + encodeURIComponent(SLUG), {
        headers: { Authorization: 'Bearer ' + t },
        cache: 'no-store',
        credentials: 'omit'
      }).then(function (r) {
        if (!r.ok) throw new Error('http');
        return r.json();
      }).then(function (j) {
        var ok = !!(j && j.slug === SLUG && j.layout === true);
        st.flags = { layout: ok };
        return st.flags;
      });
    }).catch(function () {
      st.lastFail = Date.now();
      return { layout: false };
    }).then(function (f) { st.asking = null; return f; });
    return st.asking;
  }

  function css(href) {
    return new Promise(function (ok, ko) {
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-rm-l2', 'css');
      l.onload = function () { ok(); };
      l.onerror = function () { ko(new Error('css')); };
      document.head.appendChild(l);
    });
  }
  function js(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = src; s.async = false; s.setAttribute('data-rm-l2', 'js');
      s.onload = function () { ok(); };
      s.onerror = function () { ko(new Error('js')); };
      document.head.appendChild(s);
    });
  }

  function carregar() {
    if (st.loaded) return Promise.resolve(true);
    if (st.loading) return st.loading;
    st.loading = css(BASE + 'rm-layout.css?v=' + VER)
      .then(function () { return js(BASE + 'rm-modes.js?v=' + VER); })
      .then(function () { return js(BASE + 'rm-layout.js?v=' + VER); })
      .then(function () { st.loaded = !!(window.RMModes && window.RMLayout); return st.loaded; })
      .catch(function () { st.flags = { layout: false }; return false; })   // falha fechada
      .then(function (r) { st.loading = null; return r; });
    return st.loading;
  }

  function desativar() {
    try { if (window.RMAudioBoot) window.RMAudioBoot.stop(); } catch (e) {}      // primeiro o áudio (pausa, guarda a posição, destrói), depois o shell
    try { if (st.loaded && window.RMLayout) window.RMLayout.detach(); } catch (e) {}
  }

  /* Áudio: só DEPOIS de o Layout V2 ter anexado nesta aba. O módulo é carregado uma vez; `start()` é idempotente e fail-closed
     (sem sessão, sem manifesto autorizado do servidor ou sem slot: não faz nada). Qualquer falha aqui NUNCA afeta o layout. */
  var audioLoading = null, audioFalha = 0;
  function ligarAudio(n, tab) {
    if (!(window.RMAudioBoot) && !audioLoading && Date.now() - audioFalha >= COOLDOWN_MS) {       // falhou ao carregar: não insiste a cada troca de aba
      audioLoading = js(BASE + 'rm-audio-boot.js?v=' + VER).then(function () { audioLoading = null; }, function () { audioLoading = null; audioFalha = Date.now(); });
    }
    return (audioLoading || Promise.resolve()).then(function () {
      if (n !== emVoo || tabAtiva() !== tab || !window.RMAudioBoot || !window.RMLayout) return;   // outra aba/avaliação, ou o layout já saiu
      try { window.RMAudioBoot.start(); } catch (e) {}
    });
  }

  var emVoo = 0;
  function avaliar() {
    var tab = tabAtiva();
    if (!tab || slugDe(tab) !== SLUG) { desativar(); return; }   // outra matéria: nada a fazer
    var n = ++emVoo;
    pedir().then(function (f) {
      if (n !== emVoo || tabAtiva() !== tab || !f.layout) return;
      return carregar().then(function (ok) {
        if (!ok || n !== emVoo || tabAtiva() !== tab) return;
        try { window.RMLayout.attach(tab); }
        catch (e) { try { window.RMLayout.detach(); } catch (e2) {} return; }   // qualquer erro: volta ao normal (e SEM áudio)
        ligarAudio(n, tab);
      });
    });
  }

  function ligar() {
    if (typeof window.switchTab === 'function') {
      var sw = window.switchTab;
      window.switchTab = function () {
        var r = sw.apply(this, arguments);
        setTimeout(avaliar, 0);
        return r;
      };
    }
    if (window.RMTools && typeof window.RMTools.onAbaPronta === 'function') {
      window.RMTools.onAbaPronta(function () { setTimeout(avaliar, 0); });
    }
    setTimeout(avaliar, 0);
  }

  window.RMPilot = {
    slug: SLUG,
    avaliar: avaliar,
    /* só para teste/diagnóstico: não expõe UID nem lista */
    _estado: function () { return { flags: st.flags, loaded: st.loaded }; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
})();
