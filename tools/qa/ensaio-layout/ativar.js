/* ATIVADOR DO ENSAIO (issue #457) — só existe dentro de tools/qa/ensaio-layout; NUNCA é carregado pelo site.
   Repete, para a matéria ensaiada, a sequência do rm-pilot.js: carrega rm-layout.css/rm-modes.js/rm-layout.js → RMLayout.attach(tab) →
   (tema) rm-materia-sistema.css/js → RMSistema.attach(tab, slug) → (nav) rm-materia-nav.js → RMNav.attach(tab, slug).
   Modos do ensaio (`?modo=`): controle (nada do layout: a matéria como o site a serve hoje) · layout (só Layout V2) · tema (V2 + tema) · nav (V2 + tema + navegação).
   O tema só existe para semiologia-ii: para as outras matérias o ativador GERA a entrada de TEMAS a partir do DOM real (seções, unidades, contagens),
   exatamente o que um descritor/derivador por matéria teria de fazer. O resultado de cada etapa fica em window.__ens (lido pelos testes). */
(function () {
  'use strict';
  var P = new URLSearchParams(location.search);
  var SLUG = P.get('slug'), TAB = P.get('tab'), MODO = P.get('modo') || 'nav';
  var CORR = P.get('corr') === '1';
  var VER = 'ensaio' + (CORR ? '&corr=1' : '');
  window.__ens = { slug: SLUG, tab: TAB, modo: MODO, etapas: {}, erros: [], temaGerado: null };
  var E = window.__ens;

  function css(href) { return new Promise(function (ok, ko) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = ok; l.onerror = function () { ko(new Error('css ' + href)); }; document.head.appendChild(l); }); }
  function js(src) { return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = function () { ko(new Error('js ' + src)); }; document.head.appendChild(s); }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function limpo(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  /* ---- tema gerado a partir do DOM real da matéria (o que um descritor/derivador por matéria faria) ----
     Classificação POR CONTEÚDO, não por convenção de id (os ids das 27 matérias não seguem `<slug>-bNN`):
       · agregadora (revisão/banco/mazo/cierre) = seção cujos itens (questões ou flashcards) já existem em OUTRAS seções e que carrega ≥ 50% do total distinto → repaso (B/F);
       · guia = 1.ª seção sem questões/flashcards/…bNN; tablas = seção só de tabelas sem questões;
       · bloco = o resto, numerado pelo «bNN» do id quando todos têm, senão pela ordem. */
  var CLASSE = null;
  function classificarPorConteudo(tab) {
    if (CLASSE) return CLASSE;
    var secs = Array.prototype.slice.call(tab.querySelectorAll(':scope > section[id]'));
    var unidades = {};
    secs.forEach(function (s) {
      var mk = s.querySelector(':scope > .section-marker'), m = mk && /UNIDAD\s+([IVX]+)/i.exec(limpo(mk.textContent));
      if (m) unidades[m[1].toUpperCase()] = { nombre: 'Unidad ' + m[1].toUpperCase(), color: '#4F7FA3' };
    });
    var dados = secs.map(function (s) {
      return { s: s, id: s.id,
        q: Array.prototype.map.call(s.querySelectorAll('.quiz-item'), function (x) { return limpo((x.querySelector('.quiz-question') || x).textContent).toLowerCase(); }),
        f: Array.prototype.map.call(s.querySelectorAll('.flashcard'), function (x) { return limpo((x.querySelector('.fc-front') || x).textContent).toLowerCase(); }),
        t: s.querySelectorAll('table').length };
    });
    function distintos(k) { var set = {}; dados.forEach(function (d) { d[k].forEach(function (x) { set[x] = 1; }); }); return Object.keys(set).length; }
    var dq = distintos('q'), df = distintos('f');
    function agreg(d, k, dist) {
      if (!d[k].length || d[k].length < 0.5 * dist) return false;
      var outros = {}; dados.forEach(function (o) { if (o !== d) o[k].forEach(function (x) { outros[x] = 1; }); });
      return d[k].filter(function (x) { return outros[x]; }).length / d[k].length >= 0.9;
    }
    var tipo = {}, nBloco = 0, todosNum = true, reNum = /b(\d+)$/i;
    dados.forEach(function (d) {
      var tg = agreg(d, 'q', dq) ? 'B' : (agreg(d, 'f', df) ? 'F' : null);
      if (tg) { tipo[d.id] = { tipo: 'repaso', n: tg, num: -1, cap: 'r', vig: null }; return; }
      if (!d.q.length && !d.f.length && d.t >= 1 && /tabla/i.test(d.id)) { tipo[d.id] = { tipo: 'repaso', n: 'T', num: -1, cap: 'r', vig: null }; return; }
      if (!d.q.length && !d.f.length && !reNum.test(d.id) && !Object.keys(tipo).some(function (k) { return tipo[k].tipo === 'guia'; })) { tipo[d.id] = { tipo: 'guia', n: '00', num: 0, cap: 'g', vig: null }; return; }
      tipo[d.id] = { tipo: 'bloque' };
    });
    var blocos = dados.filter(function (d) { return tipo[d.id].tipo === 'bloque'; });
    blocos.forEach(function (d) { if (!reNum.test(d.id)) todosNum = false; });
    blocos.forEach(function (d, i) { var n = todosNum ? +reNum.exec(d.id)[1] : i + 1; tipo[d.id] = { tipo: 'bloque', n: pad(n), num: n, cap: ((n - 1) % 6) + 1, vig: null }; });
    if (CORR) Object.keys(tipo).forEach(function (id) { if (tipo[id].tipo === 'repaso' && (tipo[id].n === 'B' || tipo[id].n === 'F')) document.getElementById(id).setAttribute('data-rm-agrega', ''); });   /* o marcador que o descritor poria */
    CLASSE = { tipo: tipo, unidades: unidades, todosNum: todosNum, secs: secs };
    return CLASSE;
  }
  function gerarTema(tab, slug) {
    var base = window.RMSistema.TEMAS['semiologia-ii'];
    var C = classificarPorConteudo(tab), tipo = C.tipo, unidades = C.unidades, todosNum = C.todosNum, secs = C.secs;
    var amostra = base.clasificar('x-b01'); var tipoBloque = amostra.tipo;   /* o piloto escreve o tipo como o módulo real espera: confere antes de gerar */
    var clas = function (id) { var c = tipo[id] || { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null }; var o = Object.assign({}, c); if (o.tipo === 'bloque') o.tipo = tipoBloque; return o; };
    var tema = Object.assign({}, base, { unidades: unidades, medallones: [], clasificar: clas });
    E.temaGerado = { unidades: Object.keys(unidades), numeracao: todosNum ? 'id' : 'ordem', secciones: secs.map(function (s) { var c = clas(s.id); return { id: s.id, tipo: c.tipo, n: c.n }; }) };
    return tema;
  }

  async function ativar() {
    var tab = document.getElementById('tab-' + TAB);
    if (!tab) { E.erros.push('sem-aba'); return; }
    if (MODO === 'controle') { E.etapas.controle = true; return; }
    try {
      if (MODO !== 'layout' && SLUG !== 'semiologia-ii') classificarPorConteudo(tab);
      await css('assets/rm-layout.css?v=' + VER); await js('assets/rm-modes.js?v=' + VER); await js('assets/rm-layout.js?v=' + VER);
      E.etapas.carga_layout = !!(window.RMModes && window.RMLayout);
      window.RMLayout.attach(tab); E.etapas.attach_layout = true;
    } catch (e) { E.erros.push('layout:' + (e && e.message)); try { window.RMLayout.detach(); } catch (e2) {} return; }
    if (CORR) {   /* C3 (só na variante «com correção»): o hero/banner do conteúdo original fica fora de section[id] e o módulo só isola section[id] → oculta-os fora da leitura contínua */
      var st = document.createElement('style'); st.setAttribute('data-ensaio-c3', '');
      st.textContent = 'html.rm-nav[data-rm-nav] #' + tab.id + ' > *:not(section[id]):not(footer):not(style):not(script):not(link):not([data-rm-ui]) { display: none !important; }';
      document.head.appendChild(st);
    }
    if (MODO === 'layout') return;
    try {
      await css('assets/rm-materia-sistema.css?v=' + VER); await js('assets/rm-materia-sistema.js?v=' + VER);
      if (MODO === 'nav') await js('assets/rm-materia-nav.js?v=' + VER);
      E.etapas.carga_tema = !!window.RMSistema;
      if (SLUG !== 'semiologia-ii') window.RMSistema.TEMAS[SLUG] = gerarTema(tab, SLUG);
      window.RMSistema.attach(tab, SLUG); E.etapas.attach_tema = true;
    } catch (e) { E.erros.push('tema:' + (e && e.message)); try { window.RMSistema.detach(); } catch (e2) {} return; }
    if (MODO === 'tema') return;
    try { if (window.RMNav) { window.RMNav.attach(tab, SLUG); E.etapas.attach_nav = true; } else E.erros.push('nav:sem-RMNav'); }
    catch (e) { E.erros.push('nav:' + (e && e.message)); try { window.RMNav.detach(); } catch (e2) {} }
  }

  window.openMateria = async function (slug, tab) {
    var t = await (await fetch('m/' + slug + '.html')).text();
    var doc = new DOMParser().parseFromString(t, 'text/html');
    /* igual ao parse do index.html: o contêiner é #tab-<tab>; <style> soltos fora dele vão para dentro (imagenologia tem estilo antes do contêiner) */
    var el = doc.getElementById('tab-' + tab);
    Array.prototype.slice.call(doc.querySelectorAll('style')).filter(function (x) { return !el.contains(x); }).forEach(function (x) { el.insertBefore(x.cloneNode(true), el.firstChild); });
    var node = document.importNode(el, true);
    document.getElementById('materias-container').appendChild(node);
    window.RepassoMed.enhanceAll(); window.switchTab(tab);
  };
  (async function () {
    try { await window.openMateria(SLUG, TAB); E.etapas.carga_materia = true; } catch (e) { E.erros.push('materia:' + (e && e.message)); }
    await new Promise(function (r) { setTimeout(r, 900); });
    await ativar();
    await new Promise(function (r) { setTimeout(r, +(P.get('wait') || 1500)); });
    window.__ready = true;
  })();
})();
