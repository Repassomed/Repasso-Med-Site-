/* =====================================================================
   REPASSO MED · rm-tools.js
   Ferramentas globais de estudo. Aditivo: não altera nada do que já
   existe — envolve RepassoMed.enhanceAll (mesmo padrão do módulo
   interativo) e injeta o próprio CSS.

     (1) Voltar ao topo
     (2) Marca-texto persistente (4 cores) + Borracha
     (3) Continuar de onde paraste
     (4) Zoom global dos infográficos (pinch + pan)

   Regras de ouro deste arquivo:
     · nunca reescreve o HTML da matéria no servidor — as marcações são
       uma camada de apresentação, montada e desmontada no cliente;
     · nunca grava no Supabase durante o scroll;
     · se o Supabase falhar, a matéria continua funcionando.
   ===================================================================== */
(function () {
  'use strict';

  if (window.RMTools) return;            // idempotente

  /* ---------------------------------------------------------------- */
  /* 0 · utilidades                                                     */
  /* ---------------------------------------------------------------- */

  var TABS_SEL = '#materias-container > .tab-content[id^="tab-"]';

  function sb() {
    return (window.RM_SB || window._sb) || null;
  }

  function catalogo() {
    return window.RM_CATALOGO || [];
  }

  function slugDoTab(tabEl) {
    if (!tabEl || !tabEl.id) return '';
    var tab = tabEl.id.replace(/^tab-/, '');
    var cat = catalogo();
    for (var i = 0; i < cat.length; i++) if (cat[i].tab === tab) return cat[i].slug;
    return '';
  }

  function tituloDoSlug(slug) {
    var cat = catalogo();
    for (var i = 0; i < cat.length; i++) if (cat[i].slug === slug) return cat[i].title;
    return slug;
  }

  function tabDoSlug(slug) {
    var cat = catalogo();
    for (var i = 0; i < cat.length; i++) if (cat[i].slug === slug) return cat[i].tab;
    return '';
  }

  function abaAtiva() {
    return document.querySelector('#materias-container > .tab-content.active[id^="tab-"]');
  }

  function debounce(fn, ms) {
    var t = null, ultimo = null;
    function envolto() {
      var a = arguments, self = this;
      ultimo = function () { fn.apply(self, a); };
      clearTimeout(t);
      t = setTimeout(function () { t = null; var f = ultimo; ultimo = null; if (f) f(); }, ms);
    }
    envolto.flush = function () {
      if (!t) return;
      clearTimeout(t); t = null;
      var f = ultimo; ultimo = null; if (f) f();
    };
    return envolto;
  }

  /* aviso discreto, canto inferior — nunca alert() */
  var toastEl = null, toastT = null;
  function toast(msg, erro) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'rm-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle('err', !!erro);
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }

  /* ---------------------------------------------------------------- */
  /* 1 · CSS                                                            */
  /* ---------------------------------------------------------------- */

  function injectCSS() {
    if (document.getElementById('rm-tools-css')) return;
    var st = document.createElement('style');
    st.id = 'rm-tools-css';
    st.textContent = `
/* ---------- barra de ferramentas (coluna esquerda, acima do índice) ---------- */
:root{ --rm-tools-h: 0px; }
#materias-container .rm-tools{
  position:fixed; left:14px; z-index:361;
  top:calc(var(--topbar-h) + var(--tabs-h) + 14px);
  display:flex; flex-direction:column; gap:6px; align-items:flex-start;
  font-family:var(--font-ui, Inter, system-ui, sans-serif);
}
.tab-content:not(.active) .rm-tools{ display:none; }

/* o índice e a caixa de sugestões descem o tamanho da barra */
#materias-container .rm-menu{
  top:calc(var(--topbar-h) + var(--tabs-h) + 14px + var(--rm-tools-h));
}
@media (min-width:681px){
  .rm-sug-fab{ top:calc(var(--topbar-h) + var(--tabs-h) + 14px + 52px + var(--rm-tools-h)); }
}

.rm-tools-btn{
  display:flex; align-items:center; gap:.5rem;
  padding:.5rem .78rem; border:none; border-radius:12px; cursor:pointer;
  background:#fff; color:#10243D;
  font-family:inherit; font-weight:800; font-size:.79rem; letter-spacing:.01em;
  box-shadow:0 4px 14px rgba(8,23,38,.20); border:1px solid rgba(8,23,38,.10);
  transition:transform .14s ease, box-shadow .14s ease, background .14s ease;
}
.rm-tools-btn:hover{ transform:translateY(-1px); box-shadow:0 7px 18px rgba(8,23,38,.26); }
.rm-tools-btn:focus-visible{ outline:3px solid #FFC233; outline-offset:2px; }
.rm-tools-btn svg{ width:15px; height:15px; flex:0 0 auto; }
.rm-tools-btn.on{ background:linear-gradient(120deg,#10243D,#1d3f68); color:#fff; }
.rm-tools-btn.on svg{ stroke:#FFC233; }
.rm-tools-row{ display:flex; gap:6px; align-items:center; }

/* paleta de cores */
.rm-pal{
  display:none; gap:6px; padding:7px 8px; border-radius:12px; background:#fff;
  box-shadow:0 6px 18px rgba(8,23,38,.22); border:1px solid rgba(8,23,38,.10);
}
.rm-pal.on{ display:flex; }
.rm-pal button{
  width:24px; height:24px; border-radius:50%; cursor:pointer;
  border:2px solid rgba(8,23,38,.22); padding:0;
}
.rm-pal button:focus-visible{ outline:3px solid #10243D; outline-offset:2px; }
.rm-pal button[aria-checked="true"]{ border-color:#10243D; transform:scale(1.14); }
.rm-pal .c-red{ background:#ffc9c9; } .rm-pal .c-blue{ background:#c3e0ff; }
.rm-pal .c-green{ background:#c6f0d2; } .rm-pal .c-pink{ background:#ffd0ea; }

/* ---------- as marcações ---------- */
#materias-container .rm-hl{
  border-radius:3px; padding:.04em 0;
  box-decoration-break:clone; -webkit-box-decoration-break:clone;
}
#materias-container .rm-hl.c-red{ background:rgba(255,120,120,.38); }
#materias-container .rm-hl.c-blue{ background:rgba(90,170,255,.34); }
#materias-container .rm-hl.c-green{ background:rgba(80,210,130,.34); }
#materias-container .rm-hl.c-pink{ background:rgba(255,130,205,.32); }
/* modo borracha: as marcações ficam clicáveis e evidentes */
body.rm-erasing #materias-container .rm-hl{
  cursor:pointer; outline:2px dashed rgba(8,23,38,.45); outline-offset:1px;
}
body.rm-marking #materias-container{ cursor:text; }

/* ---------- aviso discreto ---------- */
.rm-toast{
  position:fixed; left:50%; bottom:26px; transform:translate(-50%,14px);
  z-index:99992; pointer-events:none; opacity:0;
  background:#10243D; color:#fff; border-radius:999px;
  padding:.55rem 1rem; font:700 .82rem/1 var(--font-ui, Inter, sans-serif);
  box-shadow:0 10px 30px rgba(8,23,38,.35);
  transition:opacity .18s ease, transform .18s ease;
}
.rm-toast.on{ opacity:1; transform:translate(-50%,0); }
.rm-toast.err{ background:#a3271c; }

/* ---------- card «continuar de onde paraste» ---------- */
.rm-resume{
  position:fixed; right:18px; bottom:18px; z-index:99990;   /* abaixo dos avisos do site (99998/99999) */
  width:min(330px, calc(100vw - 36px));
  background:#fff; border-radius:18px; overflow:hidden;
  box-shadow:0 18px 50px rgba(8,23,38,.30); border:1px solid rgba(8,23,38,.10);
  font-family:var(--font-ui, Inter, sans-serif);
  transform:translateY(16px); opacity:0; transition:.24s ease;
}
.rm-resume.on{ transform:translateY(0); opacity:1; }
.rm-resume-h{ background:linear-gradient(120deg,#10243D,#1d3f68); color:#fff; padding:.7rem .9rem;
  font-weight:800; font-size:.86rem; display:flex; align-items:center; gap:.5rem; }
.rm-resume-b{ padding:.8rem .9rem; }
.rm-resume-b .lbl{ font-size:.68rem; text-transform:uppercase; letter-spacing:.08em; color:#6b7b8c; font-weight:800; }
.rm-resume-b .val{ font-size:.95rem; font-weight:800; color:#10243D; margin:.1rem 0 .6rem; line-height:1.25; }
.rm-resume-f{ display:flex; gap:.5rem; padding:0 .9rem .9rem; }
.rm-resume-f button{ flex:1; border:none; border-radius:11px; cursor:pointer; padding:.6rem .5rem;
  font-family:inherit; font-weight:800; font-size:.82rem; }
.rm-resume-go{ background:linear-gradient(120deg,#0A7D72,#12C2B0); color:#fff; }
.rm-resume-no{ background:#eef2f6; color:#33475b; }
.rm-resume-f button:focus-visible{ outline:3px solid #FFC233; outline-offset:2px; }

/* ---------- visor de imagens (zoom global) ---------- */
.rm-lb{
  position:fixed; inset:0; z-index:100030; display:none;
  background:rgba(6,14,22,.94); touch-action:none; overscroll-behavior:contain;
}
.rm-lb.on{ display:block; }
.rm-lb-stage{ position:absolute; inset:0; overflow:hidden; }
.rm-lb-img{
  position:absolute; top:0; left:0; transform-origin:0 0;
  max-width:none; max-height:none; user-select:none; -webkit-user-drag:none;
  will-change:transform;
}
.rm-lb-bar{
  position:absolute; top:0; left:0; right:0; display:flex; align-items:center; gap:.5rem;
  padding:10px 12px; color:#eaf2f8;
  background:linear-gradient(180deg, rgba(6,14,22,.85), rgba(6,14,22,0));
  font:600 .8rem var(--font-ui, Inter, sans-serif);
}
.rm-lb-cap{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.85; }
.rm-lb-bar button{
  flex:0 0 auto; width:34px; height:34px; border-radius:10px; cursor:pointer;
  border:1px solid rgba(255,255,255,.22); background:rgba(255,255,255,.12); color:#fff;
  font:800 1rem/1 var(--font-ui, Inter, sans-serif);
}
.rm-lb-bar button:focus-visible{ outline:3px solid #FFC233; outline-offset:2px; }
.rm-lb-hint{
  position:absolute; left:50%; bottom:16px; transform:translateX(-50%);
  color:#cfe0ec; font:600 .74rem var(--font-ui, Inter, sans-serif);
  background:rgba(6,14,22,.6); padding:.4rem .8rem; border-radius:999px; pointer-events:none;
}
body.rm-lb-open{ overflow:hidden; }
/* enquanto o visor global está ativo, a lightbox CSS antiga não abre */
body.rm-lb-ready .hp-zoom > input:checked ~ .hp-lb{ display:none !important; }
#materias-container img.rm-zoomable{ cursor:zoom-in; }

/* ---------- telas pequenas ---------- */
@media (max-width:700px){
  #materias-container .rm-tools{ left:10px; top:calc(var(--topbar-h) + var(--tabs-h) + 8px);
    flex-direction:row; gap:5px; align-items:center; }
  #materias-container .rm-menu{
    top:calc(var(--topbar-h) + var(--tabs-h) + 8px + var(--rm-tools-h)); left:10px; }
  .rm-tools-btn{ padding:.5rem; border-radius:50%; }
  .rm-tools-btn .tx{ display:none; }
  .rm-tools-row{ gap:5px; }
  .rm-pal{ position:absolute; top:calc(100% + 6px); left:0; }
}
@media (prefers-reduced-motion: reduce){
  .rm-tools-btn, .rm-resume, .rm-toast{ transition:none; }
}
`;
    document.head.appendChild(st);
    document.body.classList.add('rm-lb-ready');
  }

  /* ---------------------------------------------------------------- */
  /* 2 · marca-texto — índice de texto e ancoragem                      */
  /* ---------------------------------------------------------------- */

  /* Onde NÃO se marca: controles, navegação e widgets interativos.
     A ferramenta é para conteúdo didático (§9). */
  var SKIP = 'button,input,select,textarea,option,svg,canvas,video,audio,iframe,a,label,' +
    '.rm-tools,.rm-pal,.rm-menu,.rm-sug-fab,#rm-sug,.rm-lb,.rm-resume,.rm-toast,' +
    '.rmfc-overlay,.rmfc-launch,.rmatlas,.flashcard,.fc-grid,.rmc-gl,' +
    '.reveal-btn,.tf-buttons,[data-option],[onclick]';

  function podeMarcar(node) {
    var p = node.parentElement;
    if (!p) return false;
    if (p.closest(SKIP)) return false;
    return true;
  }

  /* Índice normalizado do bloco: espaços colapsados, com mapa de volta
     para (nó de texto, offset). É o que permite achar de novo a mesma
     frase mesmo que o HTML ao redor tenha mudado. */
  function indexar(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.length) return NodeFilter.FILTER_REJECT;
        return podeMarcar(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var norm = [], map = [], n, prevSpace = true;
    while ((n = walker.nextNode())) {
      var s = n.nodeValue;
      for (var i = 0; i < s.length; i++) {
        var ch = s.charCodeAt(i), isSp = (ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 160);
        if (isSp) {
          if (prevSpace) continue;
          norm.push(' '); map.push({ node: n, off: i }); prevSpace = true;
        } else {
          norm.push(s[i]); map.push({ node: n, off: i }); prevSpace = false;
        }
      }
    }
    return { norm: norm.join(''), map: map };
  }

  function normalizar(t) {
    return String(t == null ? '' : t).replace(/[\s ]+/g, ' ').trim();
  }

  /* Converte um Range em [início, fim) dentro do texto normalizado.
     Aceita extremos que sejam ELEMENTOS (é o que o navegador devolve
     quando o aluno seleciona um parágrafo inteiro com três cliques ou
     com «seleccionar todo»), não só nós de texto. */
  function faixaNoIndice(idx, range) {
    var sc = range.startContainer, so = range.startOffset;
    var ec = range.endContainer, eo = range.endOffset;
    var cache = new Map(), ini = -1, fim = -1;
    function noRange(n) {
      if (!cache.has(n)) {
        var v = false;
        try { v = range.intersectsNode(n); } catch (e) { v = false; }
        cache.set(n, v);
      }
      return cache.get(n);
    }
    for (var i = 0; i < idx.map.length; i++) {
      var m = idx.map[i], dentro;
      if (m.node === sc && m.node === ec) dentro = (m.off >= so && m.off < eo);
      else if (m.node === sc) dentro = (m.off >= so);
      else if (m.node === ec) dentro = (m.off < eo);
      else dentro = noRange(m.node);
      if (dentro) { if (ini < 0) ini = i; fim = i + 1; }
    }
    return [ini, fim];
  }

  function rangeDe(idx, ini, fim) {
    if (ini < 0 || fim <= ini || fim > idx.map.length) return null;
    var a = idx.map[ini], b = idx.map[fim - 1];
    var r = document.createRange();
    try {
      r.setStart(a.node, a.off);
      r.setEnd(b.node, b.off + 1);
    } catch (e) { return null; }
    return r;
  }

  /* Todas as ocorrências de `exact` no texto normalizado */
  function ocorrencias(norm, exact) {
    var out = [], i = 0;
    if (!exact) return out;
    while ((i = norm.indexOf(exact, i)) !== -1) { out.push(i); i += 1; }
    return out;
  }

  /* Escolhe a ocorrência certa usando o contexto. Na dúvida devolve -1:
     nunca marcar texto errado (§17). */
  function escolher(norm, h) {
    var cands = ocorrencias(norm, h.exact_text);
    if (!cands.length) return -1;
    if (cands.length === 1) return cands[0];

    var melhor = -1, melhorNota = -1, empate = false;
    for (var k = 0; k < cands.length; k++) {
      var i = cands[k];
      var pre = norm.slice(Math.max(0, i - (h.prefix || '').length), i);
      var suf = norm.slice(i + h.exact_text.length, i + h.exact_text.length + (h.suffix || '').length);
      var nota = 0;
      if (h.prefix) nota += (pre === h.prefix) ? 2 : (pre.slice(-12) === h.prefix.slice(-12) ? 1 : 0);
      if (h.suffix) nota += (suf === h.suffix) ? 2 : (suf.slice(0, 12) === h.suffix.slice(0, 12) ? 1 : 0);
      if (nota > melhorNota) { melhorNota = nota; melhor = i; empate = false; }
      else if (nota === melhorNota) { empate = true; }
    }
    if (empate) {
      /* contexto não resolveu: só aceita se o índice gravado existir */
      if (h.occurrence != null && cands[h.occurrence] != null) return cands[h.occurrence];
      return -1;
    }
    if (melhorNota <= 0) return -1;     // contexto não bate com nada: não arrisca
    return melhor;
  }

  /* Envolve um Range em <span class="rm-hl">, atravessando elementos.
     Não move nem reescreve nada: só divide nós de texto. */
  function pintar(range, cor, id) {
    var alvos = [];
    var walker = document.createTreeWalker(
      range.commonAncestorContainer.nodeType === 1
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentNode,
      NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      if (!range.intersectsNode(n)) continue;
      if (!podeMarcar(n)) continue;
      var ini = (n === range.startContainer) ? range.startOffset : 0;
      var fim = (n === range.endContainer) ? range.endOffset : n.nodeValue.length;
      if (fim > ini) alvos.push({ node: n, ini: ini, fim: fim });
    }
    if (!alvos.length) return 0;

    var feitos = 0;
    for (var i = alvos.length - 1; i >= 0; i--) {
      var a = alvos[i], t = a.node;
      try {
        if (a.fim < t.nodeValue.length) t.splitText(a.fim);
        var alvo = (a.ini > 0) ? t.splitText(a.ini) : t;
        var sp = document.createElement('span');
        sp.className = 'rm-hl c-' + cor;
        sp.setAttribute('data-hl', id);
        alvo.parentNode.insertBefore(sp, alvo);
        sp.appendChild(alvo);
        feitos++;
      } catch (e) { /* nó já alterado: ignora em silêncio */ }
    }
    return feitos;
  }

  function despintar(id, scope) {
    var alvo = scope || document;
    alvo.querySelectorAll('.rm-hl[data-hl="' + CSS.escape(String(id)) + '"]').forEach(function (sp) {
      var pai = sp.parentNode;
      while (sp.firstChild) pai.insertBefore(sp.firstChild, sp);
      pai.removeChild(sp);
      pai.normalize();
    });
  }

  /* ---------------------------------------------------------------- */
  /* 3 · estado + Supabase                                              */
  /* ---------------------------------------------------------------- */

  var estado = {
    marcando: false,
    apagando: false,
    cor: 'red',
    userId: null,
    porSlug: {},          // slug -> array de highlights já carregados
    carregado: {}         // slug -> true
  };

  async function userId() {
    if (estado.userId) return estado.userId;
    var s = sb(); if (!s) return null;
    try {
      var r = await s.auth.getUser();
      estado.userId = (r && r.data && r.data.user && r.data.user.id) || null;
    } catch (e) { estado.userId = null; }
    return estado.userId;
  }

  /* Carrega as marcações de UMA matéria. Uma requisição por matéria,
     por sessão (§21). */
  var emVoo = {};                       // evita duas consultas para a mesma matéria

  function carregarHighlights(slug) {
    if (estado.carregado[slug]) return Promise.resolve(estado.porSlug[slug] || []);
    if (emVoo[slug]) return emVoo[slug];
    emVoo[slug] = (async function () {
      try { return await buscarHighlights(slug); }
      finally { delete emVoo[slug]; }
    })();
    return emVoo[slug];
  }

  async function buscarHighlights(slug) {
    var s = sb(), uid = await userId();
    if (!s || !uid) return [];
    try {
      var r = await s.from('user_highlights')
        .select('id,block_id,exact_text,prefix,suffix,occurrence,color')
        .eq('user_id', uid).eq('subject_slug', slug);
      if (r.error) throw r.error;
      estado.porSlug[slug] = r.data || [];
      estado.carregado[slug] = true;
      return estado.porSlug[slug];
    } catch (e) {
      console.warn('[rm-tools] highlights indisponíveis', e && e.message);
      return [];
    }
  }

  /* Desenha no DOM as marcações de uma aba já carregada (§22) */
  function aplicarHighlights(tabEl, lista) {
    if (!tabEl || !lista || !lista.length) return { ok: 0, perdidas: 0 };
    var porBloco = {};
    lista.forEach(function (h) { (porBloco[h.block_id] = porBloco[h.block_id] || []).push(h); });

    var ok = 0, perdidas = 0;
    Object.keys(porBloco).forEach(function (bid) {
      var bloco = tabEl.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(bid) : bid));
      if (!bloco) { perdidas += porBloco[bid].length; return; }
      porBloco[bid].forEach(function (h) {
        if (tabEl.querySelector('.rm-hl[data-hl="' + CSS.escape(String(h.id)) + '"]')) { ok++; return; }
        var idx = indexar(bloco);                       // reindexa a cada marca: o DOM muda ao pintar
        var i = escolher(idx.norm, h);
        if (i < 0) { perdidas++; return; }
        var r = rangeDe(idx, i, i + h.exact_text.length);
        if (!r) { perdidas++; return; }
        if (pintar(r, h.color, h.id)) ok++; else perdidas++;
      });
    });
    return { ok: ok, perdidas: perdidas };
  }

  async function sincronizarAba(tabEl) {
    var slug = slugDoTab(tabEl);
    if (!slug) return;
    var lista = await carregarHighlights(slug);
    if (!lista.length) return;
    var r = aplicarHighlights(tabEl, lista);
    if (r.perdidas) console.info('[rm-tools] ' + r.perdidas + ' marcação(ões) não localizada(s) com segurança em ' + slug + ' — mantidas no banco, não desenhadas.');
  }

  /* ---------------------------------------------------------------- */
  /* 4 · criar / apagar marcação                                        */
  /* ---------------------------------------------------------------- */

  function blocoDe(node) {
    var el = (node && node.nodeType === 1) ? node : (node && node.parentElement);
    if (!el) return null;
    var sec = el.closest('#materias-container > .tab-content > section[id], #materias-container section[id]');
    return (sec && sec.id) ? sec : null;
  }

  var ultimaSel = null;

  function guardarSelecao() {
    var s = window.getSelection();
    if (s && s.rangeCount && !s.isCollapsed) {
      var r = s.getRangeAt(0);
      var tab = abaAtiva();
      if (tab && tab.contains(r.commonAncestorContainer)) ultimaSel = r.cloneRange();
    }
  }

  async function marcarSelecao() {
    var tab = abaAtiva(); if (!tab) return;
    var sel = window.getSelection();
    var range = null;
    if (sel && sel.rangeCount && !sel.isCollapsed &&
        tab.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    } else if (ultimaSel && tab.contains(ultimaSel.commonAncestorContainer)) {
      range = ultimaSel;
    }
    if (!range || range.collapsed) return;

    var texto = normalizar(range.toString());
    if (texto.length < 2) return;
    if (texto.length > 2000) { toast('Selección demasiado larga.', true); return; }

    /* §18 — nunca aninhar spans: se toca uma marcação existente, troca a cor */
    var tocadas = [];
    tab.querySelectorAll('.rm-hl').forEach(function (sp) {
      if (range.intersectsNode(sp)) {
        var id = sp.getAttribute('data-hl');
        if (id && tocadas.indexOf(id) === -1) tocadas.push(id);
      }
    });
    if (tocadas.length) {
      await recolorir(tocadas, estado.cor, tab);
      limparSelecao();
      return;
    }

    var bloco = blocoDe(range.startContainer);
    if (!bloco) { toast('Ese texto no se puede marcar.', true); return; }

    var idx = indexar(bloco);
    var faixa = faixaNoIndice(idx, range);
    var ini = faixa[0], fim = faixa[1];
    if (ini < 0 || fim <= ini) { toast('Ese texto no se puede marcar.', true); return; }

    var exact = idx.norm.slice(ini, fim).trim();
    if (exact.length < 2) return;
    var real = idx.norm.indexOf(exact, Math.max(0, ini - 2));
    if (real < 0) real = ini;

    var prefix = idx.norm.slice(Math.max(0, real - 40), real);
    var suffix = idx.norm.slice(real + exact.length, real + exact.length + 40);
    var occ = ocorrencias(idx.norm, exact).indexOf(real);

    var slug = slugDoTab(tab);
    var tmpId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    var r2 = rangeDe(idx, real, real + exact.length) || range;
    if (!pintar(r2, estado.cor, tmpId)) { toast('No se pudo marcar.', true); return; }
    limparSelecao();

    var s = sb(), uid = await userId();
    if (!s || !uid) { toast('Marcado (sin sincronizar)', true); return; }
    try {
      var ins = await s.from('user_highlights').insert({
        user_id: uid, subject_slug: slug, block_id: bloco.id,
        exact_text: exact, prefix: prefix, suffix: suffix,
        occurrence: occ < 0 ? 0 : occ, color: estado.cor
      }).select('id').single();
      if (ins.error) throw ins.error;
      tab.querySelectorAll('.rm-hl[data-hl="' + tmpId + '"]').forEach(function (sp) {
        sp.setAttribute('data-hl', ins.data.id);
      });
      (estado.porSlug[slug] = estado.porSlug[slug] || []).push({
        id: ins.data.id, block_id: bloco.id, exact_text: exact,
        prefix: prefix, suffix: suffix, occurrence: occ < 0 ? 0 : occ, color: estado.cor
      });
      toast('Marcado ✓');
    } catch (e) {
      despintar(tmpId, tab);
      toast('No se pudo guardar la marca.', true);
      console.warn('[rm-tools] insert', e && e.message);
    }
  }

  async function recolorir(ids, cor, tab) {
    ids.forEach(function (id) {
      tab.querySelectorAll('.rm-hl[data-hl="' + CSS.escape(id) + '"]').forEach(function (sp) {
        sp.className = 'rm-hl c-' + cor;
      });
    });
    var s = sb(), uid = await userId();
    if (!s || !uid) return;
    try {
      var reais = ids.filter(function (i) { return i.indexOf('tmp-') !== 0; });
      if (!reais.length) return;
      var r = await s.from('user_highlights')
        .update({ color: cor, updated_at: new Date().toISOString() })
        .eq('user_id', uid).in('id', reais);
      if (r.error) throw r.error;
      var slug = slugDoTab(tab);
      (estado.porSlug[slug] || []).forEach(function (h) {
        if (reais.indexOf(String(h.id)) !== -1) h.color = cor;
      });
      toast('Color actualizado ✓');
    } catch (e) { toast('No se pudo cambiar el color.', true); }
  }

  async function apagar(sp) {
    var tab = abaAtiva(); if (!tab) return;
    var id = sp.getAttribute('data-hl'); if (!id) return;
    despintar(id, tab);
    var slug = slugDoTab(tab);
    estado.porSlug[slug] = (estado.porSlug[slug] || []).filter(function (h) { return String(h.id) !== String(id); });
    if (String(id).indexOf('tmp-') === 0) { toast('Marca eliminada ✓'); return; }
    var s = sb(), uid = await userId();
    if (!s || !uid) return;
    try {
      var r = await s.from('user_highlights').delete().eq('user_id', uid).eq('id', id);
      if (r.error) throw r.error;
      toast('Marca eliminada ✓');
    } catch (e) { toast('No se pudo eliminar en el servidor.', true); }
  }

  function limparSelecao() {
    ultimaSel = null;
    var s = window.getSelection();
    if (s && s.removeAllRanges) { try { s.removeAllRanges(); } catch (e) {} }
  }

  /* ---------------------------------------------------------------- */
  /* 5 · barra de ferramentas                                           */
  /* ---------------------------------------------------------------- */

  function ico(d, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + (extra || '') + '</svg>';
  }

  function montarBarra(tabEl) {
    if (tabEl.querySelector(':scope > .rm-tools')) return;

    var box = document.createElement('div');
    box.className = 'rm-tools';
    box.innerHTML =
      '<button type="button" class="rm-tools-btn rm-top" title="Volver arriba" aria-label="Volver arriba">' +
        ico('<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>') +
        '<span class="tx">Volver arriba</span></button>' +
      '<div class="rm-tools-row">' +
        '<button type="button" class="rm-tools-btn rm-mark" title="Marcador de texto" ' +
          'aria-label="Marcador de texto" aria-pressed="false">' +
          ico('<path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/>') +
          '<span class="tx">Marcador</span></button>' +
        '<button type="button" class="rm-tools-btn rm-erase" title="Goma de borrar marcas" ' +
          'aria-label="Goma: borrar marcas" aria-pressed="false">' +
          ico('<path d="M8 20H5l-2-2 9-9 6 6-5 5Z"/><path d="M14 6l4 4"/><path d="M9 20h11"/>') +
          '<span class="tx">Goma</span></button>' +
      '</div>' +
      '<div class="rm-pal" role="radiogroup" aria-label="Color del marcador">' +
        '<button type="button" class="c-red"   data-c="red"   role="radio" aria-checked="true"  title="Rojo claro"  aria-label="Rojo claro"></button>' +
        '<button type="button" class="c-blue"  data-c="blue"  role="radio" aria-checked="false" title="Azul claro"  aria-label="Azul claro"></button>' +
        '<button type="button" class="c-green" data-c="green" role="radio" aria-checked="false" title="Verde claro" aria-label="Verde claro"></button>' +
        '<button type="button" class="c-pink"  data-c="pink"  role="radio" aria-checked="false" title="Rosa claro"  aria-label="Rosa claro"></button>' +
      '</div>';
    tabEl.insertBefore(box, tabEl.firstChild);

    var bTop = box.querySelector('.rm-top');
    var bMark = box.querySelector('.rm-mark');
    var bErase = box.querySelector('.rm-erase');
    var pal = box.querySelector('.rm-pal');

    bTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    bMark.addEventListener('click', function () {
      estado.marcando = !estado.marcando;
      if (estado.marcando) estado.apagando = false;
      refletir(box);
      if (estado.marcando) toast('Marcador activo · seleccioná el texto');
    });

    bErase.addEventListener('click', function () {
      estado.apagando = !estado.apagando;
      if (estado.apagando) estado.marcando = false;
      refletir(box);
      if (estado.apagando) toast('Goma activa · tocá una marca');
    });

    pal.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-c]'); if (!b) return;
      estado.cor = b.getAttribute('data-c');
      pal.querySelectorAll('button').forEach(function (x) {
        x.setAttribute('aria-checked', String(x === b));
      });
      /* fluxo «seleccionar y después tocar el color» */
      if (ultimaSel || (window.getSelection() && !window.getSelection().isCollapsed)) marcarSelecao();
    });

    medirBarra();
  }

  function refletir(box) {
    var raiz = box || document.querySelector('.tab-content.active .rm-tools');
    document.body.classList.toggle('rm-marking', estado.marcando);
    document.body.classList.toggle('rm-erasing', estado.apagando);
    document.querySelectorAll('.rm-tools').forEach(function (b) {
      var m = b.querySelector('.rm-mark'), e = b.querySelector('.rm-erase'), p = b.querySelector('.rm-pal');
      m.classList.toggle('on', estado.marcando); m.setAttribute('aria-pressed', String(estado.marcando));
      e.classList.toggle('on', estado.apagando); e.setAttribute('aria-pressed', String(estado.apagando));
      p.classList.toggle('on', estado.marcando);
    });
    medirBarra();
  }

  /* a barra empurra o índice e a caixa de sugestões para baixo */
  function medirBarra() {
    var b = document.querySelector('#materias-container > .tab-content.active > .rm-tools');
    if (!b) { document.documentElement.style.setProperty('--rm-tools-h', '0px'); return; }
    var r = b.getBoundingClientRect(), base = r.bottom;
    /* em telas pequenas a paleta é absoluta: entra na conta só quando
       está aberta, senão taparia o botão do índice */
    var pal = b.querySelector('.rm-pal.on');
    if (pal) {
      var pr = pal.getBoundingClientRect();
      if (pr.height) base = Math.max(base, pr.bottom);
    }
    var h = Math.round(base - r.top);
    document.documentElement.style.setProperty('--rm-tools-h', (h ? h + 8 : 0) + 'px');
  }

  /* ---------------------------------------------------------------- */
  /* 6 · escutas de seleção / borracha                                  */
  /* ---------------------------------------------------------------- */

  function ligarEscutas() {
    document.addEventListener('selectionchange', function () {
      if (estado.marcando) guardarSelecao();
    });

    /* desktop e touch: ao soltar, se o marcador estiver ligado, aplica */
    ['mouseup', 'touchend'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        if (!estado.marcando) return;
        if (e.target && e.target.closest && e.target.closest('.rm-tools,.rm-pal')) return;
        setTimeout(function () {
          var s = window.getSelection();
          if (s && s.rangeCount && !s.isCollapsed) marcarSelecao();
        }, 30);
      }, { passive: true });
    });

    /* borracha */
    document.addEventListener('click', function (e) {
      if (!estado.apagando) return;
      var sp = e.target && e.target.closest && e.target.closest('.rm-hl');
      if (!sp) return;
      e.preventDefault(); e.stopPropagation();
      apagar(sp);
    }, true);

    window.addEventListener('resize', debounce(medirBarra, 150));
  }

  /* ---------------------------------------------------------------- */
  /* 7 · progresso                                                      */
  /* ---------------------------------------------------------------- */

  var prog = { slug: '', blockId: '', label: '', ratio: 0, sujo: false, io: null, mexeu: false };

  /* Só gravamos depois de o aluno realmente se mexer na matéria. Abrir a
     aba e ficar no topo NÃO pode sobrescrever o ponto onde ele parou —
     senão o card de retomada perderia o lugar antes de ser usado. */
  function marcarInteracao() { prog.mexeu = true; }
  ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, marcarInteracao, { passive: true });
  });

  var salvarProgresso = debounce(async function () {
    if (!prog.sujo || !prog.slug || !prog.blockId) return;
    if (!prog.mexeu) return;                       // nada de gravar sem interação real
    var s = sb(), uid = await userId();
    if (!s || !uid) return;
    prog.sujo = false;
    try {
      var r = await s.from('user_study_progress').upsert({
        user_id: uid, subject_slug: prog.slug, block_id: prog.blockId,
        block_label: prog.label ? prog.label.slice(0, 160) : null,
        progress_ratio: Math.max(0, Math.min(1, prog.ratio)),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,subject_slug' });
      if (r.error) throw r.error;
    } catch (e) {
      prog.sujo = true;
      console.warn('[rm-tools] progresso', e && e.message);
    }
  }, 4000);

  function observarProgresso(tabEl) {
    if (prog.io) { prog.io.disconnect(); prog.io = null; }
    var slug = slugDoTab(tabEl); if (!slug) return;
    if (slug !== prog.slug) { prog.mexeu = false; prog.blockId = ''; prog.sujo = false; }
    prog.slug = slug;

    var secs = tabEl.querySelectorAll(':scope > section[id]');
    if (!secs.length) return;
    var total = secs.length, ordem = {};
    Array.prototype.forEach.call(secs, function (s, i) { ordem[s.id] = i; });

    prog.io = new IntersectionObserver(function (entries) {
      var melhor = null;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (!melhor || en.intersectionRatio > melhor.intersectionRatio) melhor = en;
      });
      if (!melhor) return;
      var sec = melhor.target;
      if (sec.id === prog.blockId) return;
      prog.blockId = sec.id;
      var h2 = sec.querySelector('h2');
      prog.label = h2 ? normalizar(h2.textContent).slice(0, 160) : sec.id;
      prog.ratio = total > 1 ? (ordem[sec.id] / (total - 1)) : 0;
      prog.sujo = true;
      salvarProgresso();               // debounce de 4 s: scroll não grava
    }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, .25, .5] });

    Array.prototype.forEach.call(secs, function (s) { prog.io.observe(s); });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && prog.sujo) salvarProgresso.flush();
  });

  /* ---------------------------------------------------------------- */
  /* 8 · card «continuar de onde paraste»                               */
  /* ---------------------------------------------------------------- */

  /* Os recados do site têm prioridade absoluta. São três, todos modais de
     ecrã inteiro criados e removidos do DOM pelo index.html:
       #rm-ad         anúncio/flyer        (showAnnouncement / closeAnnouncement)
       #rm-thanks     obrigado pós-compra  (showThanks / closeThanks)
       #rm-phone-ask  pedido de telefone   (removido ao guardar/saltar)
     Enquanto existir um deles no DOM, o card de retomada não aparece. */
  var AVISOS = '#rm-ad, #rm-thanks, #rm-phone-ask';

  function avisoAberto() { return !!document.querySelector(AVISOS); }

  async function ofrecerRetomar() {
    var s = sb(), uid = await userId();
    if (!s || !uid) return;
    if (avisoAberto()) return;                              // recado primeiro (§27)
    if (document.querySelector('.rm-resume')) return;

    var row = null;
    try {
      var r = await s.from('user_study_progress')
        .select('subject_slug,block_id,block_label,updated_at')
        .eq('user_id', uid).order('updated_at', { ascending: false }).limit(1);
      if (r.error) throw r.error;
      row = (r.data && r.data[0]) || null;
    } catch (e) { return; }
    if (!row || !row.subject_slug || !row.block_id) return;

    /* §29/§30 — o progresso nunca dá acesso: a matéria tem de continuar liberada */
    var tab = tabDoSlug(row.subject_slug);
    if (!tab) return;
    if (!document.querySelector('.main-tab[data-tab="' + tab + '"]')) return;
    try {
      var a = await s.from('my_active_subjects').select('subject_slug').eq('subject_slug', row.subject_slug).limit(1);
      if (a.error || !a.data || !a.data.length) return;
    } catch (e) { return; }

    var card = document.createElement('div');
    card.className = 'rm-resume';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Continuar donde paraste');
    card.innerHTML =
      '<div class="rm-resume-h">📖 ¿Querés continuar donde paraste?</div>' +
      '<div class="rm-resume-b">' +
        '<div class="lbl">Materia</div><div class="val">' + esc(tituloDoSlug(row.subject_slug)) + '</div>' +
        '<div class="lbl">Bloque</div><div class="val">' + esc(row.block_label || row.block_id) + '</div>' +
      '</div>' +
      '<div class="rm-resume-f">' +
        '<button type="button" class="rm-resume-go">Continuar</button>' +
        '<button type="button" class="rm-resume-no">Ahora no</button>' +
      '</div>';
    document.body.appendChild(card);
    requestAnimationFrame(function () { card.classList.add('on'); });

    function fechar() { card.classList.remove('on'); setTimeout(function () { card.remove(); }, 240); }
    card.querySelector('.rm-resume-no').addEventListener('click', fechar);   // não apaga o progresso (§28)
    card.querySelector('.rm-resume-go').addEventListener('click', async function () {
      fechar();
      try {
        if (typeof window.openTab === 'function') await window.openTab(tab);
        await esperar(function () {
          var t = document.getElementById('tab-' + tab);
          return t && t.classList.contains('active') && t.querySelector('#' + CSS.escape(row.block_id));
        }, 8000);
        await irAoBloco(tab, row.block_id);
      } catch (e) { /* silencioso: nunca travar o site */ }
    });
  }

  /* Reaproveita a navegação do índice (app-core), que já sabe lidar com
     `content-visibility`, com a altura estimada dos blocos e com imagem
     que só carrega depois. Só se não houver link é que rolamos à mão,
     convergindo até o bloco parar no lugar. */
  async function irAoBloco(tab, blockId) {
    var link = document.querySelector(
      '#tab-' + tab + ' .rm-menu a[data-target="' + blockId + '"]');
    if (link) { link.click(); return; }

    var alvo = document.querySelector('#tab-' + tab + ' #' + CSS.escape(blockId));
    if (!alvo) return;
    var topo = 0;
    try {
      var cs = getComputedStyle(document.documentElement);
      var tb = parseFloat(cs.getPropertyValue('--topbar-h')) || 0;
      var tt = parseFloat(cs.getPropertyValue('--tabs-h')) || 0;
      topo = tb + tt + 16;
    } catch (e) {}
    for (var i = 0; i < 14; i++) {
      var d = alvo.getBoundingClientRect().top - topo;
      if (Math.abs(d) <= 2) break;
      try { window.scrollTo({ top: Math.max(0, window.pageYOffset + d), behavior: 'instant' }); }
      catch (e) { window.scrollTo(0, Math.max(0, window.pageYOffset + d)); }
      await new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 40); }); });
    }
  }

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  function esperar(cond, ms) {
    return new Promise(function (res, rej) {
      var t0 = Date.now();
      (function tick() {
        try { if (cond()) return res(true); } catch (e) {}
        if (Date.now() - t0 > ms) return rej(new Error('timeout'));
        setTimeout(tick, 120);
      })();
    });
  }

  /* ---------------------------------------------------------------- */
  /* 9 · visor de imagens (zoom global)                                 */
  /* ---------------------------------------------------------------- */

  var lb = null, lbState = null;

  /* §34 — critério: só imagem didática de dentro de uma matéria.
     Fora: ícones, logos, avatares, decoração, atlas (tem interação
     própria) e a imagem que já está dentro de um visor. */
  function ehDidatica(img) {
    if (!img || img.tagName !== 'IMG') return false;
    if (!img.closest(TABS_SEL)) return false;                       // home/loja/topbar fora
    if (img.closest('.rmatlas, .rm-lb, .rmfc-overlay, .rm-menu, .rm-tools')) return false;
    if (img.classList.contains('rmatlas-base') || img.classList.contains('rmatlas-zoomimg')) return false;
    if (img.classList.contains('hp-lb-img')) return false;          // já é a cópia ampliada
    /* nunca roubar o clique de um widget interativo: flashcard vira,
       alternativa de quiz corrige, botão/link navega (§49/§52) */
    if (img.closest('.flashcard, .fc-grid, .fc-front, .fc-back, .rmfc-launch')) return false;
    if (img.closest('[data-option], .quiz-opt, .reveal-btn, .tf-buttons, button, a')) return false;
    var clic = img.closest('[onclick]');
    if (clic && !img.closest('label.hp-zoom, .hp-zoom')) return false;
    var w = img.naturalWidth || img.width || 0;
    var h = img.naturalHeight || img.height || 0;
    if (w && w < 320 && h && h < 320) return false;                 // ícones e selos
    return true;
  }

  function legenda(img) {
    var f = img.closest('figure');
    var cap = f && f.querySelector('figcaption');
    var t = cap ? normalizar(cap.textContent) : (img.getAttribute('alt') || '');
    return t.slice(0, 180);
  }

  function montarLB() {
    if (lb) return lb;
    lb = document.createElement('div');
    lb.className = 'rm-lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Vista ampliada');
    lb.innerHTML =
      '<div class="rm-lb-stage"><img class="rm-lb-img" alt=""></div>' +
      '<div class="rm-lb-bar">' +
        '<button type="button" class="rm-lb-out" aria-label="Alejar">−</button>' +
        '<button type="button" class="rm-lb-in" aria-label="Acercar">+</button>' +
        '<span class="rm-lb-cap"></span>' +
        '<button type="button" class="rm-lb-x" aria-label="Cerrar">✕</button>' +
      '</div>' +
      '<div class="rm-lb-hint"></div>';
    document.body.appendChild(lb);

    lb.querySelector('.rm-lb-x').addEventListener('click', fecharLB);
    lb.querySelector('.rm-lb-in').addEventListener('click', function () { zoomPasso(1.4); });
    lb.querySelector('.rm-lb-out').addEventListener('click', function () { zoomPasso(1 / 1.4); });
    lb.addEventListener('click', function (e) { if (e.target === lb) fecharLB(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') { e.preventDefault(); fecharLB(); }
    });
    ligarGestos();
    return lb;
  }

  function aplicarT() {
    var im = lb.querySelector('.rm-lb-img');
    im.style.transform = 'translate(' + lbState.x + 'px,' + lbState.y + 'px) scale(' + lbState.s + ')';
  }

  function limites() {
    var st = lb.querySelector('.rm-lb-stage').getBoundingClientRect();
    var w = lbState.w * lbState.s, h = lbState.h * lbState.s;
    var maxX = Math.max(0, (w - st.width) / 2), maxY = Math.max(0, (h - st.height) / 2);
    var cx = (st.width - w) / 2, cy = (st.height - h) / 2;
    lbState.x = Math.min(cx + maxX, Math.max(cx - maxX, lbState.x));
    lbState.y = Math.min(cy + maxY, Math.max(cy - maxY, lbState.y));
  }

  function zoomPasso(f, px, py) {
    var st = lb.querySelector('.rm-lb-stage').getBoundingClientRect();
    var cx = px == null ? st.width / 2 : px, cy = py == null ? st.height / 2 : py;
    var novo = Math.max(lbState.base, Math.min(lbState.base * 8, lbState.s * f));
    var k = novo / lbState.s;
    lbState.x = cx - k * (cx - lbState.x);
    lbState.y = cy - k * (cy - lbState.y);
    lbState.s = novo;
    limites(); aplicarT();
  }

  function ligarGestos() {
    var stage = lb.querySelector('.rm-lb-stage');
    var pts = new Map(), d0 = 0, s0 = 1, mid = null, arrastando = false, last = null, tLast = 0;

    stage.addEventListener('pointerdown', function (e) {
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        arrastando = true; last = { x: e.clientX, y: e.clientY };
        var agora = Date.now();
        if (agora - tLast < 300) {                      // duplo toque / duplo clique
          var r = stage.getBoundingClientRect();
          zoomPasso(lbState.s > lbState.base * 1.2 ? lbState.base / lbState.s : 2.2,
                    e.clientX - r.left, e.clientY - r.top);
        }
        tLast = agora;
      } else if (pts.size === 2) {
        arrastando = false;
        var a = Array.from(pts.values());
        d0 = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
        s0 = lbState.s;
        var r2 = stage.getBoundingClientRect();
        mid = { x: (a[0].x + a[1].x) / 2 - r2.left, y: (a[0].y + a[1].y) / 2 - r2.top };
      }
    });

    stage.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        var a = Array.from(pts.values());
        var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
        var novo = Math.max(lbState.base, Math.min(lbState.base * 8, s0 * (d / d0)));
        var k = novo / lbState.s;
        lbState.x = mid.x - k * (mid.x - lbState.x);
        lbState.y = mid.y - k * (mid.y - lbState.y);
        lbState.s = novo;
        limites(); aplicarT();
      } else if (arrastando && last) {
        lbState.x += e.clientX - last.x;
        lbState.y += e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        limites(); aplicarT();
      }
    });

    function up(e) {
      pts.delete(e.pointerId);
      if (pts.size < 2) { d0 = 0; mid = null; }
      if (pts.size === 0) { arrastando = false; last = null; }
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      zoomPasso(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
  }

  var scrollSalvo = 0;

  function abrirLB(img) {
    montarLB();
    var im = lb.querySelector('.rm-lb-img');
    var cap = legenda(img);
    lb.querySelector('.rm-lb-cap').textContent = cap;
    im.alt = img.getAttribute('alt') || '';
    lb.querySelector('.rm-lb-hint').textContent =
      ('ontouchstart' in window) ? 'Pellizcá para acercar · arrastrá para mover' : 'Rueda o + / − para acercar · arrastrá para mover · ESC cierra';

    scrollSalvo = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add('rm-lb-open');
    lb.classList.add('on');

    im.onload = function () {
      var st = lb.querySelector('.rm-lb-stage').getBoundingClientRect();
      var w = im.naturalWidth || img.naturalWidth || st.width;
      var h = im.naturalHeight || img.naturalHeight || st.height;
      var base = Math.min(st.width / w, st.height / h);          // «contain», sem deformar (§35)
      im.style.width = w + 'px'; im.style.height = h + 'px';
      lbState = { s: base, base: base, w: w, h: h,
                  x: (st.width - w * base) / 2, y: (st.height - h * base) / 2 };
      aplicarT();
    };
    /* usa sempre o arquivo original, na melhor resolução existente (§35) */
    im.src = img.currentSrc || img.src;
    if (im.complete && im.naturalWidth) im.onload();
    lb.querySelector('.rm-lb-x').focus();
  }

  function fecharLB() {
    if (!lb) return;
    lb.classList.remove('on');
    document.body.classList.remove('rm-lb-open');
    window.scrollTo({ top: scrollSalvo, behavior: 'auto' });     // volta ao ponto exato (§36)
  }

  function ligarZoom() {
    document.addEventListener('click', function (e) {
      /* a borracha só intercepta o clique numa marcação; tocar numa
         figura continua a ampliar, mesmo com a ferramenta ligada */
      if (e.target && e.target.closest && e.target.closest('.rm-hl')) return;
      var img = e.target && e.target.closest && e.target.closest('img');
      if (!img || !ehDidatica(img)) return;
      /* a lightbox antiga de histología práctica é um <label> com
         checkbox: impedir o toggle evita dois visores concorrentes */
      var lbl = img.closest('label.hp-zoom, .hp-zoom');
      if (lbl) e.preventDefault();
      e.stopPropagation();
      abrirLB(img);
    }, true);
  }

  function marcarZoomaveis(tabEl) {
    tabEl.querySelectorAll('img').forEach(function (img) {
      if (ehDidatica(img)) img.classList.add('rm-zoomable');
    });
  }

  /* ---------------------------------------------------------------- */
  /* 10 · arranque                                                      */
  /* ---------------------------------------------------------------- */

  function prepararAba(tabEl) {
    if (!tabEl || !tabEl.id || tabEl.id.indexOf('tab-') !== 0) return;
    montarBarra(tabEl);
    marcarZoomaveis(tabEl);
    sincronizarAba(tabEl);
    if (tabEl.classList.contains('active')) observarProgresso(tabEl);
  }

  function prepararTodas() {
    document.querySelectorAll(TABS_SEL).forEach(prepararAba);
    medirBarra();
  }

  function iniciar() {
    injectCSS();
    ligarEscutas();
    ligarZoom();

    /* envolve enhanceAll: toda matéria nova passa por aqui (§22) */
    if (window.RepassoMed && RepassoMed.enhanceAll) {
      var orig = RepassoMed.enhanceAll;
      RepassoMed.enhanceAll = function () {
        var r = orig.apply(this, arguments);
        try { prepararTodas(); } catch (e) { console.warn('[rm-tools]', e); }
        return r;
      };
    }

    /* troca de aba: reobserva o progresso e garante a barra */
    if (typeof window.switchTab === 'function') {
      var st = window.switchTab;
      window.switchTab = function (tab) {
        var r = st.apply(this, arguments);
        try {
          var el = document.getElementById('tab-' + tab);
          if (el) { prepararAba(el); observarProgresso(el); }
          medirBarra();
        } catch (e) {}
        return r;
      };
    }

    prepararTodas();

    /* o card de retomada só entra depois de o aluno fechar o recado (§27).
       Espera até 3 min; passado isso desiste em silêncio, para nunca
       ficar um temporizador vivo para sempre. */
    var esperou = 0;
    setTimeout(function tentar() {
      if (avisoAberto()) {
        esperou += 1200;
        if (esperou > 180000) return;
        setTimeout(tentar, 1200);
        return;
      }
      ofrecerRetomar();
    }, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.RMTools = {
    estado: estado,
    prepararTodas: prepararTodas,
    abrirLB: abrirLB,
    ehDidatica: ehDidatica,
    indexar: indexar,
    escolher: escolher
  };
})();
