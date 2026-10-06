/* =====================================================================
   REPASSO MED · rm-materia-sistema.js
   Sistema visual de matérias (1 esqueleto + 8 componentes + 1 tema por matéria)

   Só é carregado por rm-pilot.js, e só quando o servidor responde
   `visual: true` (get-pilot-flags, por UID autenticado) E o Layout V2 já
   anexou na matéria do piloto (hoje: semiologia-ii). Para todo o resto do
   mundo este arquivo nunca chega a ser baixado.

   O QUE FAZ (e só isso)
     · Pinta a matéria com o tema aprovado (piloto de Semiología II):
       classe `rm-sis` no <html>, `data-rm-tema` + `rm-sis-s` na aba.
       TODA a aparência vive em rm-materia-sistema.css, lida a partir de
       variáveis `--rm-*`; este arquivo só decide QUEM recebe QUE classe.
     · Lê os DADOS REAIS do DOM (títulos, unidades, contagens de
       preguntas/tarjetas/infografías/tablas/sonidos): nada é digitado aqui.
     · Monta a UI DERIVADA (sempre com [data-rm-ui], fora do índice de
       marca-texto e das âncoras da tinta): vinheta + etiqueta + meta do bloco
       (C-03), etiqueta «TABLA» (C-05), capa T1 + medalhões, rótulos do índice
       lateral (L1-COLOR) e da faixa, grade «Índice de la materia».

   O QUE NÃO FAZ
     · Não move, clona, reescreve nem apaga nenhum nó didático. Texto,
       ids, âncoras, quiz-item, flashcard, audio, tabelas: intactos.
       Em conteúdo só acrescenta atributos data-rm-* (removidos no detach).
     · Não toca no motor de marcação/caneta, no Supabase, no áudio, nem em
       pagamentos/autenticação. Não grava nada em lugar nenhum.
     · Não inventa progresso, notas nem contagens.
     · Qualquer erro em attach() ⇒ detach() completo e o Layout V2 segue
       como estava (rm-pilot.js).

   COMO ADICIONAR OUTRA MATÉRIA (depois, em PR própria)
     1. tema em rm-materia-sistema.css (bloco [data-rm-tema="slug"]: 6 cores
        de capítulo + tons derivados, superfície, lateral, marcador);
     2. entrada em TEMAS abaixo (slug, unidades, medalhões, vinhetas);
     3. liberar o slug em rm-pilot.js / get-pilot-flags.js.
     Nenhum componente muda: eles só leem as variáveis do tema.
   ===================================================================== */
(function () {
  'use strict';
  if (window.RMSistema) return;

  var ROOT = document.documentElement;
  var FONTES = 'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400..800;1,7..72,400..800&display=swap';

  /* ------------------------------ temas ------------------------------ */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* Classificação padrão dos ids de seção: `<slug>-bNN` (bloque), `-guia`, `-tablas`, `-banco`, `-flashcards`.
     cap = índice (1..6) na paleta de capítulos do tema (cíclico) · 'g' guia · 'r' repaso. */
  function clasificar(id) {
    var m = /-b(\d+)$/.exec(id);
    if (m) { var n = +m[1]; return { tipo: 'bloque', n: pad(n), num: n, cap: ((n - 1) % 6) + 1, vig: 'vb-' + pad(n) }; }
    if (/-guia$/.test(id))       return { tipo: 'guia',   n: '00', num: 0, cap: 'g', vig: 'vb-00' };
    if (/-tablas$/.test(id))     return { tipo: 'repaso', n: 'T',  num: -1, cap: 'r', vig: null };
    if (/-banco$/.test(id))      return { tipo: 'repaso', n: 'B',  num: -1, cap: 'r', vig: null };
    if (/-flashcards$/.test(id)) return { tipo: 'repaso', n: 'F',  num: -1, cap: 'r', vig: null };
    return { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null };
  }

  var TEMAS = {
    'semiologia-ii': {
      vigDir: 'assets/img/semio2/vig/',
      logo: 'assets/repasso-med-logo.png',
      /* agrupamento aprovado: Unidad I · II · III (rótulo vem do marcador real «UNIDAD I»; o nome da unidade, daqui) */
      unidades: {
        I:   { nombre: 'Respiratorio',   color: '#4F7FA3' },
        II:  { nombre: 'Cardiovascular', color: '#B5604F' },
        III: { nombre: 'Digestivo',      color: '#A8842F' }
      },
      /* medalhões da capa (recortes de infografías aprovadas; ver BRIEF-ILUSTRACIONES: HERO pendente) */
      medallones: [
        { vig: 'vb-01', t: 'RESPIRATORIO',   cap: 1, tam: 178, ml: 0,   mt: 0,  rot: -3, z: 3 },
        { vig: 'vb-07', t: 'CARDIOVASCULAR', cap: 6, tam: 150, ml: -26, mt: 60, rot: 2,  z: 2 },
        { vig: 'vb-10', t: 'DIGESTIVO',      cap: 3, tam: 128, ml: -6,  mt: -40, rot: -2, z: 1 }
      ],
      /* microcopy dos cartões de recursos (C3); o NÚMERO vem sempre do DOM */
      recursos: {
        fig:  'Revisión visual por bloques',
        quiz: 'Basadas en examen + complementarias',
        fc:   'Repaso activo por bloques',
        aud:  'Escucha e identifica hallazgos'
      },
      clasificar: clasificar
    }
  };

  var S = null;                    // instância ativa
  var NODOS = [], ATRS = [], TEXTOS = [];

  /* --------------------------- utilidades DOM --------------------------- */
  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function ui(tag, cls, attrs) {                      // UI derivada: [data-rm-ui] + rastreada para o detach
    var e = el(tag, cls, attrs);
    e.setAttribute('data-rm-ui', ''); e.setAttribute('data-rm-sis', '');
    NODOS.push(e);
    return e;
  }
  function txt(e, s) { e.appendChild(document.createTextNode(s)); return e; }
  function sa(e, k, v) {                              // atributo posto por nós (desfeito no detach)
    if (!e) return;
    if (!e.hasAttribute(k)) ATRS.push({ e: e, k: k });
    e.setAttribute(k, v);
  }
  function st(e, s) {                                 // texto de UI do shell trocado por nós (restaurado no detach)
    if (!e || e.textContent === s) return;
    TEXTOS.push({ e: e, t: e.textContent });
    e.textContent = s;
  }
  function q1(r, sel) { return r.querySelector(sel); }
  function qa(r, sel) { return Array.prototype.slice.call(r.querySelectorAll(sel)); }
  function limpo(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function curto(t) { return limpo(t).replace(/\s*\(.*\)\s*$/, ''); }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  function fonte() {
    if (document.querySelector('link[data-rm-sis-font]')) return;
    var l = el('link', '', { rel: 'stylesheet', href: FONTES, 'data-rm-sis-font': '' });
    document.head.appendChild(l);
  }

  /* ------------------------------ dados reais ------------------------------ */
  /* Infografía = <figure> com legenda e imagem; radiografias/diapositivas e fotos soltas NÃO contam (mesma regra do Layout V2,
     para que a capa e o bloco nunca discordem). */
  function figuras(raiz) {
    return qa(raiz, 'figure').filter(function (f) {
      return q1(f, 'figcaption') && q1(f, 'img, .s2-photo[role="img"], img.rmc-photo') && !f.closest('.material-slide, .med-image');
    });
  }

  function lerSecoes(tab, tema) {
    var out = [];
    qa(tab, ':scope > section[id]').forEach(function (sec) {
      var id = sec.id, c = tema.clasificar(id);
      var h2 = q1(sec, ':scope > h2'), mk = q1(sec, ':scope > .section-marker');
      var marcador = limpo(mk && mk.textContent).replace(/^[—\-–\s]+/, '');
      var u = /UNIDAD\s+([IVX]+)/i.exec(marcador);
      out.push({
        id: id, el: sec, c: c, titulo: limpo(h2 && h2.textContent), h2: h2, mk: mk,
        marcador: marcador, unidad: u ? u[1].toUpperCase() : '',
        n: { q: qa(sec, '.quiz-item').length, fc: qa(sec, '.flashcard').length, fig: figuras(sec).length,
             tb: qa(sec, 'table').length, au: qa(sec, 'audio').length }
      });
    });
    return out;
  }

  function metaTexto(n) {
    var a = [];
    if (n.q)   a.push(plural(n.q, 'pregunta', 'preguntas'));
    if (n.fc)  a.push(plural(n.fc, 'tarjeta', 'tarjetas'));
    if (n.fig) a.push(plural(n.fig, 'infografía', 'infografías'));
    if (n.tb)  a.push(plural(n.tb, 'tabla', 'tablas'));
    if (n.au)  a.push(plural(n.au, 'sonido', 'sonidos'));
    return a.join(' · ');
  }
  /* rótulo da etiqueta do bloco (C-03): «UNIDAD I» nos blocos; o resto do marcador real nos demais */
  function rotuloTag(s) {
    if (s.c.tipo === 'bloque') return s.unidad ? 'UNIDAD ' + s.unidad : 'BLOQUE';
    var m = s.marcador.split('·'); return limpo(m[m.length - 1] || s.marcador).toUpperCase();
  }

  /* --------------------------- capítulo × seções --------------------------- */
  function marcarCapitulos(tema) {
    S.secs.forEach(function (s) {
      sa(s.el, 'data-rm-cap', String(s.c.cap));
      sa(s.el, 'data-rm-tipo', s.c.tipo);
    });
  }

  /* ------------------------- C-03 · título do bloco ------------------------- */
  /* vinheta (float à esquerda) + etiqueta (faixa com o número) ANTES do marcador; meta + clear DEPOIS do <h2>.
     O <h2>, o marcador e o .rm-block-head do app-core continuam no DOM (o CSS oculta os dois últimos, que a etiqueta substitui). */
  function tituloBloco(tema) {
    S.secs.forEach(function (s) {
      if (!s.h2) return;
      var antes = s.mk || s.h2;
      if (s.c.vig) {
        var v = ui('div', 'rm-sis-vig');
        var im = el('img', '', { src: tema.vigDir + s.c.vig + '.webp', alt: '', width: '124', height: '124', loading: 'lazy', decoding: 'async' });
        v.appendChild(im);
        s.el.insertBefore(v, antes);
      } else {
        var v2 = ui('div', 'rm-sis-vig rm-sis-vig--logo');
        v2.appendChild(el('img', '', { src: tema.logo, alt: '', width: '60', height: '75', loading: 'lazy', decoding: 'async' }));
        s.el.insertBefore(v2, antes);
      }
      var tag = ui('div', 'rm-sis-tag');
      var b = el('b'); b.textContent = s.c.n; tag.appendChild(b);
      var sp = el('span'); sp.textContent = rotuloTag(s); tag.appendChild(sp);
      s.el.insertBefore(tag, antes);
      var meta = ui('div', 'rm-sis-meta'); meta.textContent = metaTexto(s.n);
      var fim = ui('div', 'rm-sis-bend');
      s.h2.parentNode.insertBefore(meta, s.h2.nextSibling);
      meta.parentNode.insertBefore(fim, meta.nextSibling);
    });
  }

  /* ----------------------------- C-05 · tabelas ----------------------------- */
  function tablas(tema) {
    S.secs.forEach(function (s) {
      qa(s.el, 'table').forEach(function (t) {
        if (t.closest('[data-rm-ui]')) return;
        var heads = qa(t, 'thead th');
        if (!heads.length) heads = qa(t, 'tr:first-child th');
        var rot = heads.map(function (h) { return limpo(h.textContent); });
        /* tabela comparativa: 2–3 colunas, todas com cabeçalho em CAIXA ALTA → um tom por categoria */
        var cmp = rot.length >= 2 && rot.length <= 3 && rot.every(function (h) { return h && (h === h.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(h) || /[A-ZÁÉÍÓÚÑ]{4,}/.test(h)); });
        if (cmp) {
          sa(t, 'data-rm-cmp', '1');
          heads.forEach(function (h, k) { sa(h, 'data-rm-cc', String((((typeof s.c.num === 'number' && s.c.num > 0 ? s.c.num - 1 : 0) + k * 3) % 6) + 1)); });
        }
        /* rótulos para o empilhamento no celular (a primeira coluna vira o título da linha) */
        qa(t, 'tbody tr').forEach(function (tr) {
          Array.prototype.forEach.call(tr.children, function (td, k) { if (k > 0 && rot[k]) sa(td, 'data-rm-label', rot[k]); });
        });
        var tg = ui('div', 'rm-sis-tabtag');
        var b = el('b'); b.textContent = s.c.n; tg.appendChild(b); tg.appendChild(document.createTextNode('TABLA'));
        var alvo = t.closest('.s2-scroll') || t;
        alvo.parentNode.insertBefore(tg, alvo);
      });
    });
  }

  /* ----------------- C-06 · preguntas: contagem real no resumo ----------------- */
  /* O selo da <summary> do cartão de preguntas é texto escrito à mão («tocar para ver», «17 preguntas»): a contagem REAL vai em
     data-rm-n e o CSS a mostra no lugar do selo. O texto do conteúdo não é tocado. */
  function preguntas() {
    qa(S.tab, '.s2-quiz-card').forEach(function (d) {
      var n = qa(d, '.quiz-item').length;
      if (n) sa(d, 'data-rm-n', plural(n, 'pregunta', 'preguntas'));
    });
  }

  /* -------------------------- capa (T1) + medalhões -------------------------- */
  function dadosCapa() {
    var h1 = q1(S.tab, '.s2-hero h1'), ov = q1(S.tab, '.s2-hero .ov');
    var em = h1 && q1(h1, 'em');
    var titulo = h1 ? limpo(Array.prototype.filter.call(h1.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join(' ')) : '';
    return {
      titulo: titulo || (window.RM_CATALOGO && S.cat && S.cat.title) || '',
      sub: em ? limpo(em.textContent).replace(/\.$/, '') : '',
      miga: ov ? limpo(ov.textContent).split('·').map(limpo).filter(Boolean) : []
    };
  }

  function portada(tema) {
    var cp = S.capa; if (!cp) return;
    var d = S.datos;
    var body = q1(cp, '.rm-l2-cover-body');
    var eb = q1(cp, '.rm-l2-eyebrow'), h1 = q1(cp, '.rm-l2-cover-title'), sb = q1(cp, '.rm-l2-cover-sub'), mt = q1(cp, '.rm-l2-cover-meta');
    /* migalhas «Guía de estudio / 6.º semestre / Hospital Universitario» (texto real do hero do conteúdo) */
    if (eb && d.miga.length) {
      TEXTOS.push({ e: eb, t: eb.textContent });
      eb.textContent = '';
      d.miga.forEach(function (m, i) {
        if (i) { var sl = el('i'); sl.textContent = '/'; eb.appendChild(sl); }
        var s = el('span'); s.textContent = m; eb.appendChild(s);
      });
      sa(eb, 'data-rm-miga', '1');
    }
    if (h1 && d.titulo) st(h1, d.titulo);
    if (sb) { if (d.sub) st(sb, d.sub); }
    /* legenda das unidades (cores do tema) no lugar do «14 bloques» */
    if (mt) {
      TEXTOS.push({ e: mt, t: mt.textContent }); mt.textContent = '';
      sa(mt, 'data-rm-leyenda', '1');
      unidadesUsadas().forEach(function (u) {
        var sp = el('span'); var dot = el('i'); dot.style.background = u.color;
        sp.appendChild(dot); sp.appendChild(document.createTextNode(u.nombre)); mt.appendChild(sp);
      });
    }
    /* rótulo «MODOS DE ESTUDIO» antes dos cartões de recursos */
    var res = q1(cp, '.rm-l2-res');
    if (res) {
      var lb = ui('div', 'rm-sis-label'); var b = el('b'); b.textContent = 'Modos de estudio'; lb.appendChild(b); lb.appendChild(el('i'));
      cp.insertBefore(lb, res);
      qa(res, '.rm-l2-rescard').forEach(function (c, i) {
        var r = S.recursos[i]; if (!r) return;
        var m = /^\s*(\d+)/.exec(r.sub || '');
        if (m) sa(c, 'data-rm-n', m[1]);
        var s = q1(c, '.rm-l2-rescard-s'), desc = tema.recursos && tema.recursos[r.k];
        if (s && desc) st(s, desc);
      });
    }
    /* medalhões */
    var me = ui('div', 'rm-sis-meds', { 'aria-hidden': 'true' });
    (tema.medallones || []).forEach(function (m) {
      var w = ui('div', 'rm-sis-med');
      w.style.cssText = '--med:' + m.tam + 'px;margin-left:' + m.ml + 'px;margin-top:' + m.mt + 'px;transform:rotate(' + m.rot + 'deg);z-index:' + m.z;
      sa(w, 'data-rm-cap', String(m.cap));
      w.appendChild(el('img', '', { src: tema.vigDir + m.vig + '.webp', alt: '', width: '178', height: '178', decoding: 'async', fetchpriority: 'high' }));
      var t = el('span'); t.textContent = m.t; w.appendChild(t);
      me.appendChild(w);
    });
    cp.insertBefore(me, body ? body.nextSibling : cp.firstChild);

    indice(tema);
  }

  function unidadesUsadas() {
    var vistas = {}, out = [];
    S.secs.forEach(function (s) {
      if (s.unidad && S.tema.unidades[s.unidad] && !vistas[s.unidad]) { vistas[s.unidad] = 1; out.push(S.tema.unidades[s.unidad]); }
    });
    return out;
  }

  /* «Índice de la materia»: grade de cartões (número + título + meta real), por unidade */
  function indice(tema) {
    var cp = S.capa, bloques = S.secs.filter(function (s) { return s.c.tipo === 'bloque'; });
    var unidades = {}, ordem = [];
    bloques.forEach(function (s) { var u = s.unidad || '·'; if (!unidades[u]) { unidades[u] = []; ordem.push(u); } unidades[u].push(s); });
    var guia = S.secs.filter(function (s) { return s.c.tipo === 'guia'; });
    var repaso = S.secs.filter(function (s) { return s.c.tipo === 'repaso'; });

    var box = ui('section', 'rm-sis-idx', { 'aria-label': 'Índice de la materia' });
    var cab = el('div', 'rm-sis-idx-h');
    var t = el('b'); t.textContent = 'Índice de la materia'; cab.appendChild(t);
    var sub = el('span');
    sub.textContent = plural(bloques.length, 'bloque', 'bloques') + (ordem.length > 1 ? ' · ' + plural(ordem.length, 'unidad', 'unidades') : '') +
      ((guia.length || repaso.length) ? ' · más punto de partida, compendio y banco' : '');
    cab.appendChild(sub); box.appendChild(cab);

    function grupo(rot, nombre, lista) {
      if (!lista.length) return;
      var g = el('div', 'rm-sis-idx-g');
      var l = el('div', 'rm-sis-ulab'); var b = el('b'); b.textContent = rot; l.appendChild(b);
      if (nombre) { var s = el('span'); s.textContent = nombre; l.appendChild(s); }
      l.appendChild(el('i')); g.appendChild(l);
      var grid = el('div', 'rm-sis-idx-grid');
      lista.forEach(function (s) {
        var a = el('a', 'rm-sis-card', { href: '#' + s.id, 'data-rm-go': s.id, 'data-rm-cap': String(s.c.cap) });
        var n = el('span', 'rm-sis-card-n'); n.textContent = s.c.n; a.appendChild(n);
        var tx = el('span', 'rm-sis-card-t'); var tt = el('b'); tt.textContent = curto(s.titulo); tx.appendChild(tt);
        var m = metaTexto(s.n); if (m) { var mm = el('i'); mm.textContent = m; tx.appendChild(mm); }
        a.appendChild(tx); grid.appendChild(a);
      });
      g.appendChild(grid); box.appendChild(g);
    }
    grupo('PUNTO DE PARTIDA', '', guia);
    ordem.forEach(function (u) { var d = tema.unidades[u]; grupo('UNIDAD ' + u, d ? d.nombre : '', unidades[u]); });
    grupo('REPASO', 'Compendio y banco', repaso);
    cp.appendChild(box);
  }

  /* ------------------------------ faixa (header) ------------------------------ */
  function banda() {
    var band = S.band; if (!band) return;
    var logo = q1(band, '.rm-l2-logo'), nome = q1(band, '.rm-l2-name');
    var d = S.datos;
    var marca = ui('b', 'rm-sis-brand'); marca.textContent = 'Repasso Med';
    var sep = ui('span', 'rm-sis-sep');
    if (logo) { logo.parentNode.insertBefore(marca, logo.nextSibling); marca.parentNode.insertBefore(sep, marca.nextSibling); }
    if (nome) {
      var b = q1(nome, 'b'), sm = q1(nome, 'small');
      if (b && d.titulo) st(b, d.titulo);
      S.pos = sm; S.posOrig = sm ? sm.textContent : '';
      etiquetaPosicion();
    }
    /* pílulas de modo: atalhos para a 1.ª ocorrência na Página completa (mesmo caminho dos cartões da capa).
       Os modos isolados (B3) seguem como estão na lateral. */
    var chip = q1(band, '.rm-l2-chip');
    var pills = ui('nav', 'rm-sis-modes', { 'aria-label': 'Ir a' });
    S.recursos.forEach(function (r, i) {
      var p = ui('button', 'rm-sis-pill', { type: 'button', 'data-rm-res': String(i), 'data-rm-k': r.k });
      p.textContent = r.t; pills.appendChild(p);
    });
    band.insertBefore(pills, chip || q1(band, '.rm-l2-mat'));
    S.pills = pills;
    /* «Sair»: o botão flutuante do site (#logout-fab, canto inferior direito) cobria a leitura no celular. No piloto ele fica oculto (CSS) e o MESMO
       controle passa a viver na faixa fixa: este botão só delega o clique ao original (o handler de logout do site não muda). */
    var fab = document.getElementById('logout-fab');
    if (fab) {
      var out = ui('button', 'rm-sis-out', { type: 'button', 'aria-label': 'Salir de la cuenta', title: 'Salir' });
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '18'); svg.setAttribute('height', '18'); svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.9'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
      var pth = document.createElementNS('http://www.w3.org/2000/svg', 'path'); pth.setAttribute('d', 'M10 5H5v14h5M15 8l4 4-4 4M19 12H9'); svg.appendChild(pth);
      var lb = el('span'); lb.textContent = (fab.textContent || 'Sair').trim();
      out.appendChild(svg); out.appendChild(lb);
      band.appendChild(out);
    }
    refletir();
  }

  /* «Inicio · índice de la materia» · «Bloque 04 · Síndrome Parenquimatoso» · «Modo · Preguntas» */
  function etiquetaPosicion() {
    if (!S || !S.pos) return;
    var v = window.RMModes && window.RMModes.view, m = v && v !== 'full' ? window.RMModes.porId(v) : null;
    var s = '';
    if (m) s = 'Modo · ' + m.label;
    else {
      var cur = q1(S.lateral || document, '.rm-l2-block-link[aria-current="location"]');
      var id = cur && cur.getAttribute('data-target'), sec = id && S.secs.filter(function (x) { return x.id === id; })[0];
      s = sec ? ((sec.c.tipo === 'bloque' ? 'Bloque ' + sec.c.n + ' · ' : '') + curto(sec.titulo)) : 'Inicio · índice de la materia';
    }
    S.pos.textContent = s;
  }
  var VISTA_K = { infografias: 'fig', preguntas: 'quiz', flashcards: 'fc', auscultacion: 'aud' };
  function refletir() {
    if (!S || !S.pills) return;
    var v = window.RMModes && window.RMModes.view, k = v === 'full' ? 'res' : VISTA_K[v];
    qa(S.pills, '.rm-sis-pill').forEach(function (p) {
      var on = !!k && p.getAttribute('data-rm-k') === k;
      p.classList.toggle('is-on', on);
      if (on) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current');
    });
    etiquetaPosicion();
  }

  /* ------------------------------- lateral (L1) ------------------------------- */
  function lateral() {
    var side = S.lateral = document.getElementById('rm-l2-side'); if (!side) return;
    var sc = q1(side, '.rm-l2-side-scroll'), tree = q1(side, '.rm-l2-tree');
    if (!sc || !tree) return;
    /* cartão «Mi cuaderno» (identidade da matéria, com marcadores) */
    var card = ui('div', 'rm-sis-nb');
    var k = el('span', 'rm-sis-nb-k'); k.textContent = S.datos.titulo.toUpperCase(); card.appendChild(k);
    var b = el('b'); b.textContent = 'Mi cuaderno'; card.appendChild(b);
    card.appendChild(el('i', 'rm-sis-nb-m'));
    card.appendChild(el('i', 'rm-sis-nb-r1')); card.appendChild(el('i', 'rm-sis-nb-r2'));
    sc.insertBefore(card, sc.firstChild);

    /* número, cor e rótulos de unidade nas linhas do índice (a numeração é a do CONTEÚDO: «BLOQUE 04» = s2-b04, guia = 00) */
    var grupoAtual = null;
    S.secs.forEach(function (s) {
      var row = q1(tree, '.rm-l2-block[data-block="' + s.id + '"]'); if (!row) return;
      sa(row, 'data-rm-cap', String(s.c.cap));
      var i = q1(row, '.rm-l2-block-link i'); if (i) st(i, s.c.n);
      var g = s.c.tipo === 'bloque' ? 'U' + s.unidad : (s.c.tipo === 'repaso' ? 'R' : 'G');
      if (g !== grupoAtual && s.c.tipo !== 'guia') {
        var lab = ui('div', 'rm-sis-ulab rm-sis-ulab--side');
        var bb = el('b'); var ss = el('span');
        if (g === 'R') { bb.textContent = 'REPASO'; ss.textContent = 'Compendio y banco'; }
        else { var u = S.tema.unidades[s.unidad]; bb.textContent = 'UNIDAD ' + s.unidad; ss.textContent = u ? u.nombre : ''; }
        lab.appendChild(bb); lab.appendChild(ss); lab.appendChild(el('i'));
        tree.insertBefore(lab, row);
      }
      grupoAtual = g;
    });
  }

  /* ------------------------------ eventos ------------------------------ */
  function ir(alvo) {
    if (!alvo || !window.RMLayout || typeof window.RMLayout.irPara !== 'function') return;
    if (window.RMModes && window.RMModes.view !== 'full') {
      window.RMModes.requestView('full', { restaurar: false, depois: function () { window.RMLayout.irPara(alvo); } });
    } else window.RMLayout.irPara(alvo);
  }
  function aoClicar(e) {
    var t = e.target; if (!t || !t.closest) return;
    var go = t.closest('[data-rm-go]');
    if (go) {
      e.preventDefault();
      var id = go.getAttribute('data-rm-go'), sec = S.secs.filter(function (x) { return x.id === id; })[0];
      if (sec) ir(sec.el);
      return;
    }
    var so = t.closest('.rm-sis-out');
    if (so) { var f = document.getElementById('logout-fab'); if (f) f.click(); return; }
    var p = t.closest('.rm-sis-pill');
    if (p) {
      var r = S.recursos[+p.getAttribute('data-rm-res')];
      if (r && r.alvo && r.alvo.isConnected !== false) ir(r.alvo);
    }
  }

  /* ------------------------------- attach/detach ------------------------------- */
  function attach(tab, slug) {
    if (S && S.tab === tab) return;
    if (S) detach();
    var tema = TEMAS[slug || 'semiologia-ii'];
    if (!tema) throw new Error('sin tema');
    if (!window.RMLayout || !window.RMModes || typeof window.RMLayout.irPara !== 'function') throw new Error('sin layout');
    var capa = q1(document, '.rm-l2-cover'), band = document.getElementById('rm-l2-band');
    if (!capa || !band) throw new Error('sin shell');

    S = { tab: tab, tema: tema, slug: slug || 'semiologia-ii', capa: capa, band: band, atual: null, h: {} };
    S.cat = (window.RM_CATALOGO || []).filter(function (c) { return c.slug === S.slug; })[0] || {};
    S.secs = lerSecoes(tab, tema);
    if (!S.secs.length) throw new Error('sin secciones');
    S.recursos = (window.RMLayout.recursos && window.RMLayout.recursos()) || [];
    S.datos = dadosCapa();

    fonte();
    ROOT.classList.add('rm-sis');
    ROOT.setAttribute('data-rm-tema', S.slug);
    tab.classList.add('rm-sis-s'); sa(tab, 'data-rm-tema', S.slug);
    marcarCapitulos(tema);
    tituloBloco(tema);
    tablas(tema);
    preguntas();
    portada(tema);
    banda();
    lateral();

    S.h.click = aoClicar;
    document.addEventListener('click', S.h.click);
    /* faixa grudada no topo? (o cabeçalho global já saiu da tela) → só então ela mostra a marca */
    S.h.stuck = function () {
      if (!S || S.stuckPend) return;
      S.stuckPend = true;
      requestAnimationFrame(function () {
        if (!S) return; S.stuckPend = false;
        var g = S.band.getBoundingClientRect().top <= 1;
        if (g) ROOT.setAttribute('data-rm-stuck', ''); else ROOT.removeAttribute('data-rm-stuck');
      });
    };
    window.addEventListener('scroll', S.h.stuck, { passive: true });
    window.addEventListener('resize', S.h.stuck);
    S.h.stuck();
    window.RMModes.onChange(function () { refletir(); });
    /* posição atual (scroll-spy do próprio layout marca aria-current na lateral): só observa */
    try {
      S.mo = new MutationObserver(function () {
        var c = q1(S.lateral || document, '.rm-l2-block-link[aria-current="location"]');
        S.atual = c ? c.getAttribute('data-target') : null;
        var row = c && c.closest('.rm-l2-block');
        if (S.aqui && S.aqui !== row) S.aqui.removeAttribute('data-rm-here');      // linha do bloco em leitura (sem :has(): navegadores antigos)
        if (row) sa(row, 'data-rm-here', '1');
        S.aqui = row || null;
        refletir();
      });
      if (S.lateral) S.mo.observe(S.lateral, { attributes: true, subtree: true, attributeFilter: ['aria-current'] });
    } catch (e) {}
    refletir();
    if (window.RMLayout.pedirReposicao) window.RMLayout.pedirReposicao();    // as alturas mudaram: a tinta acompanha (API pública, coalescida)
    remedir();
  }

  /* as alturas do cabeçalho mudaram (compacto): pede ao layout que meça a faixa de novo (o handler de resize dele só mede) */
  function remedir() {
    requestAnimationFrame(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} });
  }

  function detach() {
    if (!S) { try { ROOT.classList.remove('rm-sis'); ROOT.removeAttribute('data-rm-tema'); } catch (e) {} return; }
    var tab = S.tab;
    try { document.removeEventListener('click', S.h.click); } catch (e) {}
    try { window.removeEventListener('scroll', S.h.stuck); window.removeEventListener('resize', S.h.stuck); } catch (e) {}
    ROOT.removeAttribute('data-rm-stuck');
    try { if (S.mo) S.mo.disconnect(); } catch (e) {}
    NODOS.forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    ATRS.forEach(function (a) { try { a.e.removeAttribute(a.k); } catch (e) {} });
    TEXTOS.slice().reverse().forEach(function (x) { try { x.e.textContent = x.t; } catch (e) {} });
    NODOS = []; ATRS = []; TEXTOS = [];
    try { tab.classList.remove('rm-sis-s'); } catch (e) {}
    ROOT.classList.remove('rm-sis'); ROOT.removeAttribute('data-rm-tema');
    S = null;
    try { if (window.RMLayout && window.RMLayout.pedirReposicao) window.RMLayout.pedirReposicao(); } catch (e) {}
    remedir();
  }

  window.RMSistema = {
    attach: attach,
    detach: function () { detach(); },
    TEMAS: TEMAS,
    _estado: function () { return S ? { slug: S.slug, secciones: S.secs.length, recursos: S.recursos.length } : null; }
  };
})();
