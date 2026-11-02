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
     · SISTEMA VISUAL (ligação, nada mais): DEPOIS de o Layout V2 anexar com sucesso e SÓ se o servidor também respondeu `visual === true`,
       carrega rm-materia-sistema.css/js e chama RMSistema.attach(); ao desativar, RMSistema.detach(). Falha FECHADA: sem `visual`, ou
       qualquer erro, a matéria fica exatamente como o Layout V2 já a deixava (o sistema nunca derruba o layout). Aqui não há UID nem lista.
   ===================================================================== */
(function () {
  'use strict';
  if (window.RMPilot) return;                         // idempotente

  var SLUG = 'semiologia-ii';                         // piloto (áudio e compatibilidade: sem argumento, tudo se refere a ele)
  /* A5 · matérias que podem PERGUNTAR ao servidor. Fechadura 1 de 2: só entra aqui, por PR, quem já passou a «porta» do pré-voo. Fechadura 2: o servidor
     (get-pilot-flags) só concede se o slug estiver nas listas RM_LAYOUT_SLUGS/RM_VISUAL_SLUGS/RM_PEN_SLUGS E o UID nas listas RM_PILOT_*_UIDS.
     Hoje o piloto e Medicina Familiar (esta só PERGUNTA: com as variáveis de matéria vazias o servidor nega e nada muda para ninguém) ⇒ nenhuma requisição, nenhum módulo extra e nenhuma mudança em qualquer outra matéria. */
  var CANDIDATAS = ['semiologia-ii', 'medicina-familiar'];   // 1.ª fechadura da PRIMEIRA IMPLANTAÇÃO CONTROLADA (Medicina Familiar): só PERGUNTA ao servidor; quem libera é o servidor (2.ª fechadura, variáveis do Netlify, hoje vazias)
  var VER  = '2026110201';                            // cache-buster dos módulos (assets/* cacheia 7 dias: mudou um módulo ⇒ sobe a versão aqui e a tag do rm-pilot.js no index.html)
  var BASE = 'assets/';
  var COOLDOWN_MS = 30000;                            // depois de uma falha, não insistir

  var st = { flags: null, porSlug: {}, asking: {}, lastFail: 0, loading: null, loaded: false, sisLoading: null, slugAtual: null, uidBase: null, epoca: 0 };

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
  function pedir(slug) {
    if (st.porSlug[slug]) return Promise.resolve(st.porSlug[slug]);
    if (st.asking[slug]) return st.asking[slug];
    if (Date.now() - st.lastFail < COOLDOWN_MS) return Promise.resolve({ layout: false });
    var epoca = st.epoca;                              // se a conta mudar enquanto a resposta voa, ela é descartada
    st.asking[slug] = token().then(function (t) {
      if (!t) { st.lastFail = Date.now(); return { layout: false }; }
      var u = uidDoToken(t);                           // defesa extra: o token de AGORA é de outra conta que a das respostas em cache?
      if (u && st.uidBase && u !== st.uidBase) { contaMudou(u); return { layout: false }; }
      if (u && !st.uidBase) st.uidBase = u;
      return fetch('/.netlify/functions/get-pilot-flags?slug=' + encodeURIComponent(slug), {
        headers: { Authorization: 'Bearer ' + t },
        cache: 'no-store',
        credentials: 'omit'
      }).then(function (r) {
        if (!r.ok) throw new Error('http');
        return r.json();
      }).then(function (j) {
        if (epoca !== st.epoca) return { layout: false };   // outra conta entrou no meio: esta resposta não vale para ela
        var ok = !!(j && j.slug === slug && j.layout === true);
        /* `pen` (decidido no servidor por UID autenticado E por matéria) só vale para a caneta FÍSICA da matéria que o servidor nomeou (rm-tools-v2.js: refinamentos do piloto físico).
           Não libera a V2 nem a caneta para ninguém: quem não tem acesso beta continua sem ela. Independente de `layout`. */
        var f = { layout: ok, visual: ok && j.visual === true, pen: !!(j && j.slug === slug && j.pen === true) };
        st.porSlug[slug] = f; st.flags = f;
        try { window.dispatchEvent(new Event('rm-pilot-flags')); } catch (e) {}
        return f;
      });
    }).catch(function () {
      st.lastFail = Date.now();
      return { layout: false };
    }).then(function (f) { if (epoca === st.epoca) st.asking[slug] = null; return f; });
    return st.asking[slug];
  }

  /* Nova Era · TROCA DE CONTA na mesma página. As respostas do servidor ficam em cache POR PÁGINA; se outra conta entrar (ou a atual sair) sem recarregar, o cache da anterior NUNCA pode valer
     para a nova. Tudo é descartado na hora (layout/tema/áudio saem) e, se algo já tinha sido ligado, a página recarrega para não sobrar nada da conta anterior. */
  function uidDoToken(t) {
    try { var b = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); var j = JSON.parse(atob(b + '==='.slice((b.length + 3) % 4))); return typeof j.sub === 'string' ? j.sub : null; }
    catch (e) { return null; }
  }
  var recarregar = function () { try { location.reload(); } catch (e) {} };
  function contaMudou(uidNovo) {
    var tinha = st.loaded || Object.keys(st.porSlug).some(function (k) { var f = st.porSlug[k]; return !!(f && (f.layout || f.pen || f.visual)); });   // só recarrega se algo FOI ligado (resposta «não» em cache não precisa)
    st.epoca++; st.porSlug = {}; st.flags = null; st.asking = {}; st.lastFail = 0; st.uidBase = uidNovo || null; emVoo++;
    desativar();
    /* SAÍDA não recarrega (o site decide: logout recarrega; sessão derrubada mostra «Sesión cerrada» com um botão). A próxima ENTRADA recarrega se algo tinha sido ligado. */
    if (uidNovo && (tinha || st.recarregarAoEntrar)) { st.recarregarAoEntrar = false; setTimeout(recarregar, 0); }
    else if (!uidNovo && tinha) st.recarregarAoEntrar = true;
    else if (uidNovo) setTimeout(avaliar, 0);
  }
  function ouvirConta() {
    var s = window.RM_SB || window._sb;
    if (!s || !s.auth || typeof s.auth.onAuthStateChange !== 'function') return false;
    try {
      s.auth.onAuthStateChange(function (evt, sess) {
        var uid = (sess && sess.user && sess.user.id) || null;
        if (evt === 'SIGNED_OUT') { contaMudou(null); return; }
        if (uid && (st.recarregarAoEntrar || (st.uidBase && uid !== st.uidBase))) { contaMudou(uid); return; }
        if (uid && !st.uidBase) st.uidBase = uid;
      });
      /* a conta de AGORA é a base de comparação (o evento inicial pode não chegar) */
      try { s.auth.getSession().then(function (r) { var u = r && r.data && r.data.session && r.data.session.user && r.data.session.user.id; if (u && !st.uidBase) st.uidBase = u; }, function () {}); } catch (e2) {}
      return true;
    } catch (e) { return false; }
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
      .catch(function () { st.porSlug[st.slugAtual] = { layout: false }; return false; })   // falha fechada
      .then(function (r) { st.loading = null; return r; });
    return st.loading;
  }

  /* Sistema visual: módulo + CSS próprios, carregados uma vez, SÓ depois do layout e SÓ com `visual`. Falha ⇒ nada muda (o layout fica). */
  function carregarSistema() {
    if (window.RMSistema) return Promise.resolve(true);
    if (st.sisLoading) return st.sisLoading;
    st.sisLoading = css(BASE + 'rm-materia-sistema.css?v=' + VER)
      .then(function () { return js(BASE + 'rm-materia-sistema.js?v=' + VER); })
      .then(function () { return js(BASE + 'rm-materia-nav.js?v=' + VER); })                  // navegação por índice geral · bloco · modos (issue #453); mesmo portão do tema
      .then(function () {                                                                       // índice central expansível (issue #460): opcional, nunca derruba o tema/a navegação
        return css(BASE + 'rm-materia-indice.css?v=' + VER).then(function () { return js(BASE + 'rm-materia-indice.js?v=' + VER); }).catch(function () {});
      })
      .then(function () { return !!window.RMSistema; })
      .catch(function () { return false; })
      .then(function (r) { st.sisLoading = null; return r; });
    return st.sisLoading;
  }
  function ligarSistema(n, tab, slug) {
    return carregarSistema().then(function (ok) {
      if (!ok || n !== emVoo || tabAtiva() !== tab || !window.RMLayout || !window.RMSistema) return;
      try { window.RMSistema.attach(tab, slug); }
      catch (e) { try { window.RMSistema.detach(); } catch (e2) {} return; }       // o layout fica; só o tema sai
      if (!window.RMNav) return;
      try { window.RMNav.attach(tab, slug); }
      catch (e3) { try { window.RMNav.detach(); } catch (e4) {} return; }          // falha na navegação: o tema e o layout ficam como estavam (rolagem contínua)
      if (window.RMIndice) { try { window.RMIndice.attach(tab, slug); } catch (e5) { try { window.RMIndice.detach(); } catch (e6) {} } }   // falha no índice expansível: os cards voltam a abrir o bloco direto
    });
  }

  function desativar() {
    try { if (window.RMIndice) window.RMIndice.detach(); } catch (e) {}         // o índice expansível sai antes da navegação por bloco
    try { if (window.RMNav) window.RMNav.detach(); } catch (e) {}              // primeiro a navegação por bloco, depois o tema (só atributos/UI própria), o áudio e por fim o shell
    try { if (window.RMSistema) window.RMSistema.detach(); } catch (e) {}
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
      if (n !== emVoo || tabAtiva() !== tab || !window.RMAudioBoot || !window.RMLayout || !document.getElementById('rm-l2-player')) return;   // outra aba/avaliação, ou o layout já saiu (detach/logout: o slot some)
      try { window.RMAudioBoot.start(); } catch (e) {}
    });
  }

  var emVoo = 0;
  function avaliar() {
    var tab = tabAtiva();
    var slug = slugDe(tab);
    if (!tab || CANDIDATAS.indexOf(slug) === -1) { st.slugAtual = null; desativar(); return; }   // matéria sem a fechadura 1: nada a fazer, nenhuma requisição
    st.slugAtual = slug;
    var n = ++emVoo;
    pedir(slug).then(function (f) {
      if (n !== emVoo || tabAtiva() !== tab || !f.layout) return;
      return carregar().then(function (ok) {
        if (!ok || n !== emVoo || tabAtiva() !== tab) return;
        try { window.RMLayout.attach(tab, slug); }
        catch (e) { try { window.RMLayout.detach(); } catch (e2) {} return; }   // qualquer erro: volta ao normal (e SEM áudio)
        if (f.visual) ligarSistema(n, tab, slug);
        if (slug === SLUG) ligarAudio(n, tab);                                   // áudio: só o piloto (A6 ainda não libera outras matérias)
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
    if (!ouvirConta()) { var n = 0, tm = setInterval(function () { n++; if (ouvirConta() || n >= 40) clearInterval(tm); }, 150); }   // o cliente Supabase nasce depois deste arquivo
  }

  window.RMPilot = {
    slug: SLUG,
    avaliar: avaliar,
    /* `true` só depois de o servidor ter respondido `pen:true` para ESTE usuário em Semiología II (cache da página; falha de transporte/negado = false). Leitura pura: sem UID, sem rede. */
    penLiberada: function (slug) { var f = st.porSlug[slug || SLUG]; return !!(f && f.pen === true); },
    /* matérias que podem perguntar ao servidor (fechadura 1; leitura pura, para teste/diagnóstico) */
    candidatas: function () { return CANDIDATAS.slice(); },
    /* só para teste/diagnóstico: não expõe UID nem lista */
    _estado: function () { return { flags: st.flags, porSlug: st.porSlug, loaded: st.loaded }; },
    /* só para teste: troca a função que recarrega a página */
    _trocarRecarregar: function (fn) { recarregar = fn; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
})();
