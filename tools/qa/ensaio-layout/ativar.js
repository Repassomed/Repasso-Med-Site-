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
  var VER = 'ensaio';
  window.__ens = { slug: SLUG, tab: TAB, modo: MODO, etapas: {}, erros: [], temaGerado: null };
  var E = window.__ens;

  function css(href) { return new Promise(function (ok, ko) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = ok; l.onerror = function () { ko(new Error('css ' + href)); }; document.head.appendChild(l); }); }
  function js(src) { return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = function () { ko(new Error('js ' + src)); }; document.head.appendChild(s); }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function limpo(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  /* ---- tema gerado a partir do DOM real da matéria (o que um derivador por matéria faria) ---- */
  function gerarTema(tab, slug) {
    var base = window.RMSistema.TEMAS['semiologia-ii'];
    var secs = Array.prototype.slice.call(tab.querySelectorAll(':scope > section[id]'));
    var reBloque = /(?:^|[-_])b(?:loque|lo)?(\d+)$|b(\d+)$/i;
    var unidades = {};
    secs.forEach(function (s) {
      var mk = s.querySelector(':scope > .section-marker'), m = mk && /UNIDAD\s+([IVX]+)/i.exec(limpo(mk.textContent));
      if (m) unidades[m[1].toUpperCase()] = { nombre: 'Unidad ' + m[1].toUpperCase(), color: '#4F7FA3' };
    });
    function clasificar(id) {
      var m = reBloque.exec(id);
      if (m) { var n = +(m[1] || m[2]); return { tipo: 'bloque', n: pad(n), num: n, cap: ((n - 1) % 6) + 1, vig: null }; }
      if (/guia|portada|intro|inicio$/i.test(id)) return { tipo: 'guia', n: '00', num: 0, cap: 'g', vig: null };
      if (/tablas?$/i.test(id)) return { tipo: 'repaso', n: 'T', num: -1, cap: 'r', vig: null };
      if (/banco|bank|banc/i.test(id)) return { tipo: 'repaso', n: 'B', num: -1, cap: 'r', vig: null };
      if (/flash|tarjetas/i.test(id)) return { tipo: 'repaso', n: 'F', num: -1, cap: 'r', vig: null };
      return { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null };
    }
    /* o piloto escreve o tipo como 'bloque' (castelhano): confere no módulo real antes de gerar */
    var amostra = base.clasificar('x-b01');
    var tipoBloque = amostra.tipo;
    var clas = function (id) { var c = clasificar(id); if (c.tipo === 'bloque') c.tipo = tipoBloque; return c; };
    var tema = Object.assign({}, base, { unidades: Object.keys(unidades).length ? unidades : base.unidades, medallones: [], clasificar: clas });
    E.temaGerado = { unidades: Object.keys(unidades), secciones: secs.map(function (s) { var c = clas(s.id); return { id: s.id, tipo: c.tipo }; }) };
    return tema;
  }

  async function ativar() {
    var tab = document.getElementById('tab-' + TAB);
    if (!tab) { E.erros.push('sem-aba'); return; }
    if (MODO === 'controle') { E.etapas.controle = true; return; }
    try {
      await css('assets/rm-layout.css?v=' + VER); await js('assets/rm-modes.js?v=' + VER); await js('assets/rm-layout.js?v=' + VER);
      E.etapas.carga_layout = !!(window.RMModes && window.RMLayout);
      window.RMLayout.attach(tab); E.etapas.attach_layout = true;
    } catch (e) { E.erros.push('layout:' + (e && e.message)); try { window.RMLayout.detach(); } catch (e2) {} return; }
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
