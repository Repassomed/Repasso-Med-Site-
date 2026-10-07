/* =====================================================================
   REPASSO MED · rm-materia-indice.js — índice CENTRAL expansível por bloco e subtítulo (issue #460)
   LIGADO AO PILOTO (PR #462): rm-pilot.js carrega este módulo depois da navegação por bloco (rm-materia-nav.js) e chama attach() só quando o servidor
   liberou layout + visual para Semiología II (mesmo portão do tema). Qualquer falha (módulo ausente, attach que lança) ⇒ detach() e os cards voltam a ser
   os <a> de antes, que abrem o bloco direto. Sem esse attach, o arquivo não faz nada: window.RMIndice só define funções. Rollback: docs/indice-expansivel-460/README.md.

   O que faz (só no índice de abertura da matéria, atrás do mesmo portão do piloto: exige RMSistema + RMNav ativos):
     · o card central de um BLOCO deixa de abrir o bloco na hora: ele EXPANDE ali mesmo, num painel ligado ao card (aba/cor/borda);
     · o painel traz «Empezar por el inicio del bloque» (comando separado e destacado) e minicards com os SUBTÍTULOS reais do bloco, na ordem do conteúdo;
     · um subtítulo abre SÓ aquele bloco e posiciona a leitura no título escolhido (RMNav.irParaAlvo: a mesma navegação existente);
     · um card expandido por vez; guía e repaso (revisão geral) não expandem: navegação direta como hoje (nenhum subtítulo inventado).

   Contratos:
     · LÊ o DOM do conteúdo, nunca o altera: não move, não duplica, não cria id, não toca âncoras de tinta/notas/grifos. Toda UI criada leva data-rm-ui.
     · Subtítulos derivados do HTML real: H3 e H4 filhos DIRETOS da seção (H3 = os mesmos que a árvore lateral do app-core indexa, mais os de «Examen físico…» que o app-core classifica como quiz por engano); ficam de fora
       cabeçalhos de pergunta/flashcard, cabeçalhos repetidos (SUB_FORA, a mesma regra do app-core), e tudo que está dentro de contêineres
       (post-it, cartões, detalhes, quiz, tabelas…). H4 entra como filho do H3 anterior (hierarquia).
     · Só usa APIs públicas já existentes: RMSistema.secciones(), RMNav.ativo()/go()/irParaAlvo(). Não toca RMModes/RMLayout/áudio/caneta.
     · Acessibilidade: o card vira <button> real com aria-expanded e, enquanto o painel existe no DOM, aria-controls (nunca aponta para um id ausente); Enter/Espaço; Esc fecha e devolve o foco; alvos ≥ 44 px;
       prefers-reduced-motion = abertura/fechamento instantâneos.
     · Reversível: detach() devolve os <a> originais e remove tudo o que criou.
   ===================================================================== */
(function () {
  'use strict';
  var ROOT = document.documentElement;
  var RE_EMOJI = /[‼-㊙\uD83C\uD83D\uD83E][\uDC00-\uDFFF]?|[←-⇿⌀-➿️⃣]/g;      // a mesma do app-core
  var SUB_FORA = /organizaci[óo]n\s*[—·\-]\s*c[óo]mo|c[óo]mo lo eval[úu]a la c[áa]tedra|^c[óo]mo estudiar|^resumen explicado|^desde cero$/i;   // idem
  /* cabeçalho OPERACIONAL (bloco de perguntas/flashcards): pelo INÍCIO do texto. Não se usa a regex solta do app-core (tipoSub: /examen/…): ela marca
     como «quiz» H3 de conteúdo real, p.ex. «Examen físico de la bronquitis aguda» (blocos 02, 06, 08 e 10), que o índice central DEVE mostrar. */
  var OPERACIONAL = /^(preguntas?\b|cuestionario\b|banco\b|flashcards?\b|mazo\b|tarjetas\b|ruleta\b)/i;
  var MAX_H3 = 140, MAX_H4 = 140;
  var DUR = 220;                                                // ms (180–240): abertura/fechamento
  var VISIVEIS_H4 = 4;                                          // filhos H4 mostrados antes de «Ver los N temas»
  var T = {
    comenzar: 'Empezar por el inicio del bloque', ir: 'Ir directo a un subtítulo', temas: function (n) { return 'Ver ' + n + (n === 1 ? ' tema más' : ' temas más'); }, menos: 'Ver menos',
    n: function (n) { return n + (n === 1 ? ' subtítulo' : ' subtítulos'); }, region: function (t) { return 'Subtítulos del ' + t; }
  };
  var N = null;                                                 // instância: { tab, cards[], aberto, h{} }
  var SEQ = 0;

  /* ------------------------------ utilidades ------------------------------ */
  function el(tag, cls, attrs) {
    var e = document.createElement(tag); if (cls) e.className = cls;
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function ui(tag, cls, attrs) { var e = el(tag, cls, attrs); e.setAttribute('data-rm-ui', ''); e.setAttribute('data-rm-ix', ''); return e; }
  function limpo(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function movimentoReduzido() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function hdrH() { return (window.RMLayout && window.RMLayout.hdrH && window.RMLayout.hdrH()) || 52; }
  function rolarA(y) { try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); } }
  function svgCaret() {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '18'); s.setAttribute('height', '18'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M6 9l6 6 6-6'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2.4'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    s.appendChild(p); return s;
  }

  /* «1) Tos 💨» → { num:'1', icon:'💨', txt:'Tos' } */
  function titulo(raw) {
    var s = limpo(raw), icon = '';
    var m = s.match(RE_EMOJI); if (m) for (var i = 0; i < m.length; i++) if (!/^[️⃣]$/.test(m[i])) { icon = m[i]; break; }
    s = limpo(s.replace(RE_EMOJI, ''));
    var n = /^(\d{1,2})\s*[)\.\-–—·:]\s*/.exec(s), num = '';
    if (n) { num = n[1]; s = limpo(s.slice(n[0].length)); }
    return { num: num, icon: icon, txt: s };
  }

  /* ----------------- subtítulos reais da seção (só leitura) -----------------
     Entram: H3 e H4 FILHOS DIRETOS da seção (um título dentro de post-it, cartão, detalhe, quiz, tabela… é rótulo operacional, não subtítulo).
     Ficam fora os cabeçalhos de perguntas/flashcards (OPERACIONAL) e os repetidos (SUB_FORA). O H4 pertence ao H3 anterior. */
  function subtitulosDe(sec) {
    var grupos = [], atual = null, viuH3 = false;
    Array.prototype.forEach.call(sec.children, function (h) {
      var tag = h.tagName; if (tag !== 'H3' && tag !== 'H4') return;
      if (h.hasAttribute('data-rm-ui') || h.closest('[data-rm-ui]')) return;
      var t = titulo(h.textContent); if (!t.txt) return;
      var operacional = SUB_FORA.test(t.txt) || OPERACIONAL.test(t.txt) || (tag === 'H3' && / rm-h3-fc /.test(' ' + h.className + ' '));
      if (tag === 'H3') {
        viuH3 = true;
        if (operacional || t.txt.length > MAX_H3) { atual = null; return; }      // H3 operacional ou longo demais não vira item (e seus H4 não são promovidos a H3)
        atual = { el: h, id: h.id || '', txt: t.txt, icon: t.icon, num: t.num, kids: [] };
        grupos.push(atual);
      } else {
        if (operacional || t.txt.length > MAX_H4) return;
        var f = { el: h, id: h.id || '', txt: t.txt, icon: t.icon };
        if (atual) atual.kids.push(f);
        else if (!viuH3) grupos.push({ el: h, id: h.id || '', txt: t.txt, icon: t.icon, num: '', kids: [], h4: true });    // H4 do preâmbulo (antes de qualquer H3): item próprio
      }
    });
    return grupos;
  }

  /* --------------------------------- painel --------------------------------- */
  function irPara(alvo) { if (window.RMNav && window.RMNav.ativo && window.RMNav.ativo()) window.RMNav.irParaAlvo(alvo); }
  function montarPainel(c) {
    var P = ui('div', 'rm-ix-panel', { id: c.painelId, role: 'region', 'aria-label': T.region(c.rotulo), 'data-rm-cap': c.cap });
    var inner = el('div', 'rm-ix-inner'); P.appendChild(inner);     // inner: só recorta (altura 0 → auto); a caixa visual é .rm-ix-box
    var dentro = el('div', 'rm-ix-box'); inner.appendChild(dentro);
    var cab = el('div', 'rm-ix-head');
    var go = el('button', 'rm-ix-start', { type: 'button' });
    go.appendChild(document.createTextNode(T.comenzar));
    var seta = el('span', 'rm-ix-start-go', { 'aria-hidden': 'true' }); seta.textContent = '→'; go.appendChild(seta);
    go.addEventListener('click', function () { if (window.RMNav && window.RMNav.ativo && window.RMNav.ativo()) window.RMNav.go({ view: 'block', block: c.sec.id }); });
    cab.appendChild(go);
    var cnt = el('span', 'rm-ix-count'); cnt.textContent = T.n(c.subs.length); cab.appendChild(cnt);
    dentro.appendChild(cab);
    var lab = el('p', 'rm-ix-lab'); lab.textContent = T.ir; dentro.appendChild(lab);
    var ol = el('ol', 'rm-ix-list');
    c.subs.forEach(function (g, i) {
      var li = el('li', g.kids.length ? 'rm-ix-grp has-kids' : 'rm-ix-grp');
      var b = el('button', 'rm-ix-sub', { type: 'button' });
      var mk = el('span', 'rm-ix-mk', { 'aria-hidden': 'true' }); mk.textContent = g.icon || g.num || String(i + 1); if (g.icon) mk.className += ' is-ico'; b.appendChild(mk);
      var tt = el('span', 'rm-ix-tt'); tt.textContent = g.txt; b.appendChild(tt);
      b.addEventListener('click', function () { irPara(g.el); });
      li.appendChild(b);
      if (g.kids.length) {
        var ul = el('ul', 'rm-ix-kids'), idk = 'rm-ix-k' + (++SEQ); ul.id = idk;
        g.kids.forEach(function (k, j) {
          var lk = el('li'); if (j >= VISIVEIS_H4) lk.hidden = true;
          var bk = el('button', 'rm-ix-kid', { type: 'button' }); var tk = el('span', 'rm-ix-kt'); tk.textContent = k.txt; bk.appendChild(tk);
          bk.addEventListener('click', function () { irPara(k.el); });
          lk.appendChild(bk); ul.appendChild(lk);
        });
        li.appendChild(ul);
        if (g.kids.length > VISIVEIS_H4) {
          var mas = el('button', 'rm-ix-more', { type: 'button', 'aria-expanded': 'false', 'aria-controls': idk });
          mas.textContent = T.temas(g.kids.length - VISIVEIS_H4);
          mas.addEventListener('click', function () {
            var abierto = mas.getAttribute('aria-expanded') === 'true'; mas.setAttribute('aria-expanded', abierto ? 'false' : 'true');
            Array.prototype.forEach.call(ul.children, function (lk, j) { if (j >= VISIVEIS_H4) lk.hidden = abierto; });
            mas.textContent = abierto ? T.temas(g.kids.length - VISIVEIS_H4) : T.menos;
          });
          li.appendChild(mas);
        }
      }
      ol.appendChild(li);
    });
    dentro.appendChild(ol);
    return P;
  }

  /* a grade do tema usa grid-auto-rows:1fr (cards de mesma altura); um painel alto na grade esticaria TODAS as linhas. Enquanto há painel, as linhas passam a
     «auto» e cada card ganha a altura natural máxima (medida aqui), então a grade fica idêntica à de antes, só com o painel no meio. */
  function igualar(grid) {
    var cartas = Array.prototype.filter.call(grid.children, function (n) { return n.classList && n.classList.contains('rm-sis-card'); });
    grid.classList.add('rm-ix-medir');
    var h = 0; cartas.forEach(function (n) { h = Math.max(h, n.offsetHeight); });
    grid.classList.remove('rm-ix-medir');
    grid.style.setProperty('--rm-ix-ch', h + 'px'); grid.setAttribute('data-rm-ix-open', '');
  }
  function soltarGrade(grid) {
    if (!grid || Array.prototype.some.call(grid.children, function (n) { return n.classList && n.classList.contains('rm-ix-panel'); })) return;
    grid.removeAttribute('data-rm-ix-open'); grid.style.removeProperty('--rm-ix-ch');
  }

  /* o painel ocupa a largura da grade, logo depois da ÚLTIMA carta da linha do card acionado (no celular: logo abaixo dele) */
  function colocar(c) {
    var grid = c.btn.parentNode, P = c.painel; if (!grid || !P) return;
    igualar(grid);
    var cartas = Array.prototype.filter.call(grid.children, function (n) { return n !== P && n.classList && n.classList.contains('rm-sis-card'); });
    var topo = c.btn.offsetTop, fila = cartas.filter(function (n) { return Math.abs(n.offsetTop - topo) < 4; });
    var ultimo = fila.length ? fila[fila.length - 1] : c.btn;
    if (P.previousSibling !== ultimo || P.parentNode !== grid) grid.insertBefore(P, ultimo.nextSibling);
    var pr = P.getBoundingClientRect(), br = c.btn.getBoundingClientRect();
    P.style.setProperty('--rm-ix-x', Math.max(18, Math.min(pr.width - 18, br.left + br.width / 2 - pr.left)) + 'px');   // a «aba» liga o painel ao card
  }

  /* mantém o card acionado parado na tela enquanto algo ACIMA dele muda de altura (o painel anterior fechando) */
  function ancorar(btn, ms) {
    var y0 = btn.getBoundingClientRect().top, fim = Date.now() + ms;
    (function passo() {
      if (!btn.isConnected) return;
      var dy = btn.getBoundingClientRect().top - y0;
      if (Math.abs(dy) > 0.5) rolarA((window.pageYOffset || 0) + dy);
      if (Date.now() < fim) requestAnimationFrame(passo);
    })();
  }
  function revelar(c) {
    var P = c.painel; if (!P || !c.btn.isConnected) return;
    var h = hdrH() + 8, r = P.getBoundingClientRect(), faltam = r.bottom - (window.innerHeight - 14);
    if (faltam > 0) {
      var margem = c.btn.getBoundingClientRect().top - h;               // nunca empurra o card acionado para fora da tela
      var d = Math.min(faltam, Math.max(0, margem));
      if (d > 0) { try { window.scrollBy({ top: d, left: 0, behavior: movimentoReduzido() ? 'instant' : 'smooth' }); } catch (e) { window.scrollBy(0, d); } }
    }
  }

  function abrir(c, teclado) {
    if (!c.painel) c.painel = montarPainel(c);
    N.aberto = c;
    c.btn.setAttribute('aria-expanded', 'true'); c.btn.setAttribute('data-rm-open', '');
    colocar(c);
    c.btn.setAttribute('aria-controls', c.painelId);                 // o painel já está no DOM
    var P = c.painel, reduz = movimentoReduzido();
    if (reduz) { P.classList.add('is-open'); P.classList.add('is-sem-anim'); }
    else { void P.offsetHeight; requestAnimationFrame(function () { if (N && N.aberto === c) P.classList.add('is-open'); }); }
    setTimeout(function () { if (N && N.aberto === c) revelar(c); }, reduz ? 0 : DUR + 30);
    if (teclado) { var go = P.querySelector('.rm-ix-start'); if (go) { try { go.focus({ preventScroll: true }); } catch (e) { go.focus(); } } }
  }
  function fechar(c, o) {
    o = o || {};
    if (N && N.aberto === c) N.aberto = null;
    c.btn.setAttribute('aria-expanded', 'false'); c.btn.removeAttribute('data-rm-open');
    var P = c.painel; if (!P) return;
    var reduz = movimentoReduzido();
    if (o.ancora) ancorar(o.ancora, reduz ? 40 : DUR + 60);
    P.classList.remove('is-open');
    var tirar = function () { if (P.parentNode && !(N && N.aberto === c)) { c.btn.removeAttribute('aria-controls'); var g = P.parentNode; g.removeChild(P); soltarGrade(g); } };
    if (reduz) tirar(); else setTimeout(tirar, DUR + 40);
    if (o.foco) { try { c.btn.focus({ preventScroll: true }); } catch (e) { c.btn.focus(); } }
  }
  function achar(btn) { for (var i = 0; i < N.cards.length; i++) if (N.cards[i].btn === btn) return N.cards[i]; return null; }
  function alternar(btn, teclado) {
    var c = achar(btn); if (!c) return;
    if (N.aberto === c) { fechar(c, { foco: false }); return; }
    var anterior = N.aberto;
    if (anterior) fechar(anterior, { ancora: btn });
    abrir(c, teclado);
  }

  /* ------------------------------- eventos ------------------------------- */
  /* em CAPTURA na window: roda antes do handler do tema (document, bolha) e do da navegação, que abririam o bloco imediatamente */
  function aoClicar(ev) {
    if (!N || !ev.target || !ev.target.closest) return;
    var b = ev.target.closest('.rm-ix-card'); if (!b) return;
    if (ev.button || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
    if (!(window.RMNav && window.RMNav.ativo && window.RMNav.ativo())) return;            // sem a navegação por bloco: comportamento original
    ev.preventDefault(); ev.stopImmediatePropagation();
    alternar(b, ev.detail === 0);                                                          // detail 0 = teclado (Enter/Espaço): o foco vai ao comando «Empezar»
  }
  function aoTeclar(ev) {
    if (!N || ev.key !== 'Escape' || !N.aberto) return;
    var c = N.aberto, t = ev.target;
    if (c.painel && (c.painel.contains(t) || t === c.btn)) { ev.preventDefault(); fechar(c, { foco: true }); }
  }
  function aoRedimensionar() {
    if (!N || N.rz) return; N.rz = true;
    requestAnimationFrame(function () { if (!N) return; N.rz = false; if (N.aberto && N.aberto.btn.isConnected) colocar(N.aberto); });
  }

  /* ------------------------------ ciclo de vida ------------------------------ */
  function attach(tab) {
    if (N) detach();
    if (!window.RMSistema || !window.RMNav || !window.RMNav.ativo || !window.RMNav.ativo()) throw new Error('sin navegación');
    var cover = document.querySelector('.rm-sis-idx'); if (!cover) throw new Error('sin índice');
    N = { tab: tab, cards: [], aberto: null, h: {}, rz: false };
    window.RMSistema.secciones().forEach(function (s) {
      if (!s.c || s.c.tipo !== 'bloque') return;                                          // guía e repaso: navegação direta, sem subtítulos inventados
      var orig = cover.querySelector('.rm-sis-card[data-rm-go="' + String(s.id).replace(/"/g, '\\"') + '"]'); if (!orig) return;
      var subs = subtitulosDe(s.el); if (!subs.length) return;                             // bloco sem subtítulos reais: card segue abrindo direto
      var btn = ui('button', 'rm-sis-card rm-ix-card', { type: 'button', 'aria-expanded': 'false', 'data-rm-go': s.id });
      var cap = orig.getAttribute('data-rm-cap') || ''; if (cap) btn.setAttribute('data-rm-cap', cap);
      var painelId = 'rm-ix-p-' + (++SEQ);                    // aria-controls só existe enquanto o painel está no DOM (abrir/fechar)
      while (orig.firstChild) btn.appendChild(orig.firstChild);
      var ch = el('span', 'rm-ix-chev', { 'aria-hidden': 'true' }); ch.appendChild(svgCaret()); btn.appendChild(ch);
      var b = btn.querySelector('.rm-sis-card-t b'), n = btn.querySelector('.rm-sis-card-n');
      var rotulo = (n ? limpo(n.textContent) + ' · ' : '') + (b ? limpo(b.textContent) : limpo(s.titulo));
      orig.parentNode.replaceChild(btn, orig);
      N.cards.push({ btn: btn, orig: orig, sec: s, subs: subs, cap: cap, painelId: painelId, rotulo: rotulo, painel: null });
    });
    N.h.click = aoClicar; N.h.key = aoTeclar; N.h.rz = aoRedimensionar;
    window.addEventListener('click', N.h.click, true);
    document.addEventListener('keydown', N.h.key);
    window.addEventListener('resize', N.h.rz);
    ROOT.setAttribute('data-rm-ix', '');
    return N.cards.length;
  }
  function detach() {
    if (!N) { ROOT.removeAttribute('data-rm-ix'); return; }
    try { window.removeEventListener('click', N.h.click, true); document.removeEventListener('keydown', N.h.key); window.removeEventListener('resize', N.h.rz); } catch (e) {}
    N.cards.forEach(function (c) {
      try { if (c.painel && c.painel.parentNode) { var g = c.painel.parentNode; g.removeChild(c.painel); soltarGrade(g); } } catch (e) {}
      try {
        if (c.btn.parentNode) {                                                            // devolve o <a> original (com os mesmos filhos)
          var ch = c.btn.querySelector('.rm-ix-chev'); if (ch) ch.parentNode.removeChild(ch);
          while (c.btn.firstChild) c.orig.appendChild(c.btn.firstChild);
          c.btn.parentNode.replaceChild(c.orig, c.btn);
        }
      } catch (e) {}
    });
    ROOT.removeAttribute('data-rm-ix');
    N = null;
  }

  window.RMIndice = {
    attach: attach,
    detach: function () { detach(); },
    ativo: function () { return !!N; },
    estado: function () { return N ? { cards: N.cards.length, aberto: N.aberto ? N.aberto.sec.id : null } : null; },
    subtitulos: subtitulosDe                                                              // só leitura (testes)
  };
})();
