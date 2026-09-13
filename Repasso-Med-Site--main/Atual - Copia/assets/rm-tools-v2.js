/* =====================================================================
   REPASSO MED · rm-tools-v2.js
   FERRAMENTAS DE ESTUDO V2 — Toolbox · Marcador · Caneta · Goma ·
   Desfazer · Minhas anotações.

   REGRAS DE OURO DESTE FICHEIRO
     · Evolui o rm-tools.js — não o substitui. A ancoragem do marcador,
       o pintar/despintar e o acesso ao Supabase continuam a viver lá,
       num sítio só; aqui só se chama.
     · Se o utilizador não estiver na beta, este ficheiro sai pela porta
       nos primeiros milissegundos e NADA muda para ele.
     · Nunca grava em pointermove. Nunca guarda coordenada absoluta da
       página. Nunca bloqueia o scroll global. Nunca usa canvas raster.
     · Se o Supabase falhar, a matéria continua a funcionar.

   COMO LIBERAR PARA TODA A GENTE
     Uma linha, a seguir: ROLLOUT = 'all'.
   ===================================================================== */
(function () {
  'use strict';

  if (window.RMToolsV2) return;                         // idempotente

  /* ================================================================== */
  /* 0 · ACESSO — O ÚNICO SÍTIO DO CÓDIGO QUE SABE QUEM É TESTER        */
  /* ================================================================== */

  /* 'beta' → só os UID abaixo (e quem estiver em public.study_tools_beta)
     'all'  → toda a gente autenticada
     'off'  → ninguém (desliga a V2 sem remover o ficheiro)             */
  var ROLLOUT = 'beta';

  /* Só UID. Nunca e-mail — o e-mail não autoriza nada e não entra no
     frontend. Estes valores são públicos por natureza (qualquer JS o é);
     a proteção real dos dados é a RLS, que exige auth.uid(). */
  var BETA_UIDS = [
    'd4d215d3-36dd-4efb-8869-bdea5376c648',
    '448e4d63-e410-48ed-8c71-8e99af317d3e'
  ];

  /* Falha FECHADA: qualquer erro devolve false, e o aluno fica com a
     experiência antiga. Nunca o contrário. */
  async function hasStudyToolsV2Access(uid) {
    if (ROLLOUT === 'off') return false;
    if (!uid) return false;
    if (ROLLOUT === 'all') return true;
    if (BETA_UIDS.indexOf(uid) !== -1) return true;
    /* A tabela é aditiva: permite juntar testers sem novo deploy.
       Não pode ser escrita pelo cliente (não há policy de INSERT). */
    try {
      var s = RT() && RT().sb && RT().sb();
      if (!s) return false;
      var r = await s.from('study_tools_beta')
        .select('enabled').eq('user_id', uid).maybeSingle();
      if (r.error) return false;
      return !!(r.data && r.data.enabled);
    } catch (e) { return false; }
  }

  /* ================================================================== */
  /* 1 · ATALHOS PARA O MOTOR EXISTENTE                                  */
  /* ================================================================== */

  function RT() { return window.RMTools || null; }
  function sb() { var t = RT(); return t ? t.sb() : null; }
  function abaAtiva() { var t = RT(); return t ? t.abaAtiva() : null; }
  function slugDoTab(el) { var t = RT(); return t ? t.slugDoTab(el) : ''; }
  function toast(m, err) { var t = RT(); if (t) t.toast(m, err); }
  function lbAberto() { var t = RT(); return t ? t.lbAberto() : false; }

  var LS = {
    get: function (k, d) { try { return localStorage.getItem('rm2.' + k) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('rm2.' + k, v); } catch (e) {} }
  };

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  }

  /* ================================================================== */
  /* 2 · ESTADO                                                          */
  /* ================================================================== */

  var HL_CORES  = ['yellow', 'red', 'blue', 'green', 'pink'];
  var PEN_CORES = ['black', 'blue', 'red'];
  var PEN_ESP   = { thin: 2, medium: 4, thick: 7 };

  var st = {
    uid: null,
    tool: 'none',                       // none | highlight | pen | eraser
    open: false,
    hlColor: LS.get('hlColor', 'yellow'),
    penColor: LS.get('penColor', 'black'),
    penWidth: LS.get('penWidth', 'medium'),
    strokes: {},                        // slug -> [rec]
    carregado: {},                      // slug -> true
    undo: [],                           // pilha de operações inversas
    notasAbertas: false
  };
  if (HL_CORES.indexOf(st.hlColor) === -1) st.hlColor = 'yellow';
  if (PEN_CORES.indexOf(st.penColor) === -1) st.penColor = 'black';
  if (!PEN_ESP[st.penWidth]) st.penWidth = 'medium';

  var UNDO_MAX = 60;

  /* Quando um item é restaurado, o banco dá-lhe um id NOVO. As operações
     que já estavam na pilha continuavam a apontar para o id velho e, ao
     serem desfeitas, não encontravam nada — o «desfazer» parecia saltar
     passos. Sempre que uma identidade muda, ela é reescrita na pilha
     inteira. É a peça que faz a sequência marcar→desenhar→apagar→desfazer
     comportar-se como o utilizador espera. */
  function remapear(antigo, novo) {
    if (!antigo || String(antigo) === String(novo)) return;
    st.undo.forEach(function (op) {
      if (op.id != null && String(op.id) === String(antigo)) op.id = novo;
      ['inks', 'hls'].forEach(function (k) {
        (op[k] || []).forEach(function (r) {
          if (r && String(r.id) === String(antigo)) r.id = novo;
        });
      });
      if (op.rec && String(op.rec.id) === String(antigo)) op.rec.id = novo;
    });
  }

  function pushUndo(op) {
    st.undo.push(op);
    if (st.undo.length > UNDO_MAX) st.undo.shift();
    refletir();
  }

  /* ================================================================== */
  /* 3 · CSS                                                             */
  /* ================================================================== */

  function injectCSS() {
    if (document.getElementById('rm2-css')) return;
    var css = document.createElement('style');
    css.id = 'rm2-css';
    css.textContent = `
/* ---------- marcador V2: as cinco cores, um pouco mais presentes ----- */
/* Escopadas em body.rm-v2 de propósito: quem não está na beta continua a
   ver exactamente as cores actuais do site. */
body.rm-v2 #materias-container .rm-hl.c-yellow{ background:rgba(255,214,  0,.42); }
body.rm-v2 #materias-container .rm-hl.c-red   { background:rgba(255, 86, 86,.40); }
body.rm-v2 #materias-container .rm-hl.c-blue  { background:rgba( 64,150,255,.38); }
body.rm-v2 #materias-container .rm-hl.c-green { background:rgba( 46,196,110,.38); }
body.rm-v2 #materias-container .rm-hl.c-pink  { background:rgba(255, 99,190,.36); }
/* fora da beta o amarelo ainda assim rende, caso alguém já o tenha */
#materias-container .rm-hl.c-yellow{ background:rgba(255,220,60,.38); }

body.rm2-t-highlight #materias-container{ cursor:text; }
body.rm2-t-eraser #materias-container .rm-hl{
  cursor:pointer; outline:2px dashed rgba(8,23,38,.45); outline-offset:1px;
}
body.rm2-drawing{ -webkit-user-select:none; user-select:none; }

/* ---------- camada de tinta ----------------------------------------- */
#rm2-ink{
  position:absolute; left:0; top:0; width:100%; height:0;
  pointer-events:none; z-index:60;
}
#rm2-ink svg{ position:absolute; overflow:visible; pointer-events:none; }
#rm2-ink path{ fill:none; stroke-linecap:round; stroke-linejoin:round; }
#rm2-ink path.ink-black{ stroke:#10243D; }
#rm2-ink path.ink-blue { stroke:#1f5fd0; }
#rm2-ink path.ink-red  { stroke:#c0392b; }
body.rm2-t-eraser #rm2-ink path{ opacity:.72; }

/* ---------- toolbox -------------------------------------------------- */
.rm2-box{
  position:fixed; right:max(10px, env(safe-area-inset-right)); z-index:2147483000;
  top:50%; transform:translateY(-50%);
  display:flex; flex-direction:column; align-items:flex-end; gap:8px;
  font-family:inherit;
}
.rm2-fab{
  width:46px; height:46px; border-radius:14px; border:1px solid rgba(16,36,61,.14);
  background:#fff; color:#10243D; cursor:pointer;
  display:grid; place-items:center;
  box-shadow:0 6px 22px rgba(8,23,38,.16), 0 1px 2px rgba(8,23,38,.10);
  transition:transform .16s ease, box-shadow .16s ease;
}
.rm2-fab:hover{ transform:translateY(-1px); box-shadow:0 10px 26px rgba(8,23,38,.20); }
.rm2-fab:focus-visible{ outline:3px solid #10243D; outline-offset:2px; }
.rm2-fab svg{ width:22px; height:22px; }
.rm2-fab.armed{ background:#10243D; color:#fff; border-color:#10243D; }
.rm2-fab .dot{
  position:absolute; margin:22px 0 0 22px; width:9px; height:9px; border-radius:50%;
  border:2px solid #fff; box-shadow:0 0 0 1px rgba(8,23,38,.2);
}

.rm2-panel{
  display:none; flex-direction:column; gap:6px;
  background:rgba(255,255,255,.97); backdrop-filter:saturate(1.3) blur(6px);
  border:1px solid rgba(16,36,61,.13); border-radius:16px; padding:7px;
  box-shadow:0 14px 40px rgba(8,23,38,.20), 0 2px 6px rgba(8,23,38,.10);
  max-height:min(78vh, 620px); overflow:auto; -webkit-overflow-scrolling:touch;
}
.rm2-box.open .rm2-panel{ display:flex; }
.rm2-box.open .rm2-fab{ background:#10243D; color:#fff; border-color:#10243D; }

.rm2-btn{
  display:flex; align-items:center; gap:9px; width:100%;
  padding:8px 11px 8px 9px; border-radius:11px; border:1px solid transparent;
  background:transparent; color:#10243D; cursor:pointer;
  font-size:13.5px; font-weight:600; line-height:1.1; white-space:nowrap; text-align:left;
}
.rm2-btn svg{ width:19px; height:19px; flex:0 0 19px; }
.rm2-btn:hover{ background:rgba(16,36,61,.06); }
.rm2-btn:focus-visible{ outline:3px solid #10243D; outline-offset:1px; }
.rm2-btn.on{ background:#10243D; color:#fff; }
.rm2-btn[disabled]{ opacity:.38; cursor:default; }
.rm2-btn[disabled]:hover{ background:transparent; }
.rm2-sep{ height:1px; background:rgba(16,36,61,.10); margin:2px 4px; }

.rm2-sub{ display:none; padding:2px 4px 6px; }
.rm2-sub.on{ display:block; }
.rm2-swatches{ display:flex; gap:6px; flex-wrap:wrap; }
.rm2-swatches button{
  width:26px; height:26px; border-radius:9px; cursor:pointer;
  border:2px solid rgba(16,36,61,.18);
}
.rm2-swatches button:focus-visible{ outline:3px solid #10243D; outline-offset:2px; }
.rm2-swatches button[aria-checked="true"]{ border-color:#10243D; transform:scale(1.1); }
.rm2-swatches button[aria-checked="true"]::after{
  content:"✓"; display:block; font-size:13px; line-height:22px; text-align:center;
  color:#10243D; font-weight:800;
}
.rm2-sw-yellow{ background:rgba(255,214,0,.62); } .rm2-sw-red{ background:rgba(255,86,86,.62); }
.rm2-sw-blue{ background:rgba(64,150,255,.60); }  .rm2-sw-green{ background:rgba(46,196,110,.60); }
.rm2-sw-pink{ background:rgba(255,99,190,.58); }
.rm2-sw-black{ background:#10243D; } .rm2-sw-pblue{ background:#1f5fd0; } .rm2-sw-pred{ background:#c0392b; }
.rm2-swatches button[data-pc][aria-checked="true"]::after{ color:#fff; }

.rm2-widths{ display:flex; gap:6px; margin-top:6px; }
.rm2-widths button{
  flex:1; height:28px; border-radius:9px; cursor:pointer; background:#fff;
  border:1px solid rgba(16,36,61,.18); display:grid; place-items:center;
}
.rm2-widths button[aria-checked="true"]{ border-color:#10243D; background:rgba(16,36,61,.07); }
.rm2-widths button:focus-visible{ outline:3px solid #10243D; outline-offset:1px; }
.rm2-widths i{ display:block; background:#10243D; border-radius:99px; width:17px; }
.rm2-w-thin i{ height:2px; } .rm2-w-medium i{ height:4px; } .rm2-w-thick i{ height:7px; }

/* ---------- gaveta de anotações -------------------------------------- */
.rm2-notes{
  position:fixed; z-index:2147483001; right:0; top:0; height:100%;
  width:min(400px, 92vw); background:#fff; display:none; flex-direction:column;
  box-shadow:-18px 0 48px rgba(8,23,38,.24); border-left:1px solid rgba(16,36,61,.12);
}
.rm2-notes.on{ display:flex; }
.rm2-notes header{
  display:flex; align-items:center; gap:10px; padding:14px 14px 12px;
  border-bottom:1px solid rgba(16,36,61,.10);
}
.rm2-notes h3{ margin:0; font-size:15px; color:#10243D; flex:1; }
.rm2-notes .sub{ font-size:11.5px; color:#5a6b7d; font-weight:600; }
.rm2-notes .body{ flex:1; overflow:auto; padding:10px 12px 16px; }
.rm2-note{
  border:1px solid rgba(16,36,61,.12); border-radius:12px; padding:9px 10px; margin-bottom:9px;
  background:#fcfdff;
}
.rm2-note input{
  width:100%; border:0; border-bottom:1px dashed rgba(16,36,61,.18); background:transparent;
  font:700 13.5px/1.3 inherit; color:#10243D; padding:2px 0 5px; margin-bottom:6px;
}
.rm2-note textarea{
  width:100%; min-height:86px; resize:vertical; border:0; background:transparent;
  font:400 13px/1.5 inherit; color:#22333f;
}
.rm2-note input:focus, .rm2-note textarea:focus{ outline:2px solid rgba(16,36,61,.30); outline-offset:2px; border-radius:4px; }
.rm2-note .meta{ display:flex; align-items:center; gap:8px; font-size:11px; color:#5a6b7d; }
.rm2-note .meta b{ color:#10243D; font-weight:700; }
.rm2-note .del{
  margin-left:auto; border:0; background:transparent; color:#b0392b; cursor:pointer;
  font:600 11.5px inherit; padding:3px 6px; border-radius:7px;
}
.rm2-note .del:hover{ background:rgba(192,57,43,.10); }
.rm2-notes .empty{ color:#5a6b7d; font-size:13px; padding:18px 4px; text-align:center; }
.rm2-x{ border:0; background:transparent; cursor:pointer; color:#10243D; font-size:20px; line-height:1; padding:4px 6px; border-radius:8px; }
.rm2-x:hover{ background:rgba(16,36,61,.08); }
.rm2-new{
  border:1px solid #10243D; background:#10243D; color:#fff; border-radius:10px;
  padding:7px 12px; font:700 12.5px inherit; cursor:pointer;
}

/* ---------- responsivo ----------------------------------------------- */
@media (max-width:820px){
  .rm2-box{ top:auto; bottom:max(88px, calc(env(safe-area-inset-bottom) + 78px)); transform:none; }
  .rm2-panel{ max-height:min(66vh, 460px); }
  .rm2-btn{ font-size:13px; padding:9px 11px; }
}
/* No telemóvel a barra fica só com ícones: o rótulo custava metade da
   largura da coluna de leitura. O nome continua no title e no aria-label,
   por isso nem o leitor de ecrã nem o rato perdem nada. */
@media (max-width:560px){
  .rm2-btn .tx{ display:none; }
  .rm2-btn{ justify-content:center; padding:9px; gap:0; }
  .rm2-panel{ padding:6px; gap:4px; }
  .rm2-swatches{ justify-content:center; gap:5px; }
  .rm2-swatches button{ width:24px; height:24px; border-radius:8px; }
  .rm2-swatches button[aria-checked="true"]::after{ font-size:11px; line-height:20px; }
  .rm2-widths button{ height:26px; }
  .rm2-sub{ padding:2px 0 5px; }
}
@media (max-width:430px){
  .rm2-fab{ width:42px; height:42px; border-radius:12px; }
}
@media (prefers-reduced-motion: reduce){
  .rm2-fab{ transition:none; }
}
`;
    document.head.appendChild(css);
  }

  /* ================================================================== */
  /* 4 · ÂNCORAS E CAMADA DE TINTA                                       */
  /* ================================================================== */

  /* Âncora = a <section id="..."> do bloco. Os ids já existem em todas as
     matérias (padrão visual v4), são estáveis e não dependem da ordem do
     DOM. Nenhuma matéria é editada para isto.

     Só que uma secção pode ter 18 000 px de altura. Normalizar por uma
     caixa dessas guarda bem a POSIÇÃO — o traço nunca sai do bloco — mas
     esmaga a FORMA quando o viewport muda: um círculo à volta de uma
     palavra vira uma risca achatada no telemóvel.

     Por isso ancoramos ao parágrafo (ou tabela, figura, item de lista) que
     está debaixo do ponteiro, identificado como «idDaSeccao>índice». O
     índice é calculado no cliente, de forma determinística, e NUNCA se
     escreve nada na matéria. Se o elemento não for encontrado —matéria
     editada, por exemplo— cai-se para a secção, que continua a existir:
     o traço pode mudar de sítio dentro do bloco, mas nunca de bloco. */
  var ANCHOR_SEL = 'section[id]';
  var SUB_SEL = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
  var SUB_MIN_H = 36;                   // caixas menores não valem a pena

  function anchorDe(node) {
    var el = (node && node.nodeType === 1) ? node : (node && node.parentElement);
    if (!el) return null;
    var tab = abaAtiva(); if (!tab || !tab.contains(el)) return null;
    var sec = el.closest(ANCHOR_SEL);
    if (!sec || !sec.id || !tab.contains(sec)) return null;

    var sub = el.closest(SUB_SEL);
    if (sub && sec.contains(sub) && sub.getBoundingClientRect().height >= SUB_MIN_H) {
      var lista = sec.querySelectorAll(SUB_SEL);
      for (var i = 0; i < lista.length; i++) {
        if (lista[i] === sub) return { el: sub, id: sec.id + '>' + i, sec: sec };
      }
    }
    return { el: sec, id: sec.id, sec: sec };
  }

  /* «ofb02>14» → o 15.º parágrafo da secção ofb02. «ofb02» → a secção. */
  function elDeAnchor(anchorId) {
    var tab = abaAtiva(); if (!tab) return null;
    var parte = String(anchorId).split('>');
    var sec = tab.querySelector('#' + cssEsc(parte[0]));
    if (!sec) return null;
    if (parte.length < 2) return sec;
    var lista = sec.querySelectorAll(SUB_SEL);
    var i = parseInt(parte[1], 10);
    return (lista[i] || sec);
  }

  function rotuloDe(sec) {
    if (!sec) return '';
    var h = sec.querySelector('h2, h3');
    return h ? (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) : sec.id;
  }

  var inkLayer = null;
  var svgPorAnchor = {};                // anchorId -> <svg>

  function camada() {
    if (inkLayer && inkLayer.isConnected) return inkLayer;
    inkLayer = document.getElementById('rm2-ink');
    if (!inkLayer) {
      inkLayer = document.createElement('div');
      inkLayer.id = 'rm2-ink';
      inkLayer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(inkLayer);
    }
    return inkLayer;
  }

  /* Caixa da âncora em coordenadas de PÁGINA (não de viewport): assim o
     overlay rola com o documento sem um único listener de scroll. */
  function caixa(sec) {
    var r = sec.getBoundingClientRect();
    return {
      x: r.left + window.pageXOffset,
      y: r.top + window.pageYOffset,
      w: Math.max(1, r.width),
      h: Math.max(1, r.height)
    };
  }

  function svgDe(alvo, id) {
    var el = svgPorAnchor[id];
    if (el && el.isConnected) { posicionar(el, alvo); return el; }
    el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 1000 1000');
    /* 'none' é deliberado: os pontos são fracções da caixa nos DOIS eixos,
       por isso o traço tem de esticar com ela em x e em y. A espessura não
       acompanha esse esticão — disso trata o vector-effect (§16). */
    el.setAttribute('preserveAspectRatio', 'none');
    el.setAttribute('data-anchor', id);
    camada().appendChild(el);
    svgPorAnchor[id] = el;
    posicionar(el, alvo);
    observarTamanho(id, alvo);
    return el;
  }

  function posicionar(el, sec) {
    var b = caixa(sec);
    el.style.left = b.x + 'px';
    el.style.top = b.y + 'px';
    el.style.width = b.w + 'px';
    el.style.height = b.h + 'px';
  }

  /* Só as âncoras que REALMENTE têm traços são observadas — nunca a
     página inteira, nunca centenas de overlays vazios (§32). */
  var ro = null, observadas = {};
  function observarTamanho(id, alvo) {
    if (observadas[id]) return;
    observadas[id] = true;
    if (!ro && window.ResizeObserver) {
      ro = new ResizeObserver(debounce(reposicionarTudo, 60));
    }
    /* observa-se o elemento da âncora e a secção que o contém: o bloco
       pode crescer por causa de uma imagem que carregou mais acima */
    if (ro) {
      try { ro.observe(alvo); } catch (e) {}
      var sec = alvo.closest(ANCHOR_SEL);
      if (sec && sec !== alvo) { try { ro.observe(sec); } catch (e) {} }
    }
  }

  function reposicionarTudo() {
    var tab = abaAtiva(); if (!tab) return;
    Object.keys(svgPorAnchor).forEach(function (id) {
      var el = svgPorAnchor[id];
      if (!el) return;
      var alvo = elDeAnchor(id);
      if (!alvo) { el.style.display = 'none'; return; }
      el.style.display = '';
      posicionar(el, alvo);
    });
  }

  function cssEsc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '\\$&'); }

  function limparCamada() {
    Object.keys(svgPorAnchor).forEach(function (id) {
      var el = svgPorAnchor[id];
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    svgPorAnchor = {};
    if (ro) { try { ro.disconnect(); } catch (e) {} }
    observadas = {};
  }

  /* ================================================================== */
  /* 5 · TRAÇOS — geometria, desenho e simplificação                     */
  /* ================================================================== */

  function dDe(pts) {
    if (!pts || !pts.length) return '';
    var d = 'M' + (pts[0][0] * 1000).toFixed(1) + ' ' + (pts[0][1] * 1000).toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      d += 'L' + (pts[i][0] * 1000).toFixed(1) + ' ' + (pts[i][1] * 1000).toFixed(1);
    }
    return d;
  }

  function novoPath(rec) {
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', 'ink-' + rec.color);
    p.setAttribute('stroke-width', String(PEN_ESP[rec.width] || 4));
    /* a espessura NÃO cresce quando o bloco cresce (§16) */
    p.setAttribute('vector-effect', 'non-scaling-stroke');
    p.setAttribute('d', dDe(rec.points));
    p.setAttribute('data-ink', rec.id);
    return p;
  }

  function desenhar(rec) {
    var alvo = elDeAnchor(rec.anchor_id);
    if (!alvo) return null;
    var svg = svgDe(alvo, rec.anchor_id);
    var j = svg.querySelector('path[data-ink="' + cssEsc(String(rec.id)) + '"]');
    if (j) return j;
    var p = novoPath(rec);
    svg.appendChild(p);
    return p;
  }

  function remover(id) {
    var el = camada().querySelector('path[data-ink="' + cssEsc(String(id)) + '"]');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  /* Ramer–Douglas–Peucker. Corre UMA vez, no pointerup: durante o traço
     não se simplifica nada, para a escrita não ficar com atraso. */
  function simplificar(pts, tol) {
    if (pts.length < 3) return pts;
    var keep = new Array(pts.length); keep[0] = keep[pts.length - 1] = true;
    var pilha = [[0, pts.length - 1]];
    while (pilha.length) {
      var seg = pilha.pop(), a = seg[0], b = seg[1];
      var ax = pts[a][0], ay = pts[a][1], bx = pts[b][0], by = pts[b][1];
      var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      var pior = -1, dmax = 0;
      for (var i = a + 1; i < b; i++) {
        var px = pts[i][0] - ax, py = pts[i][1] - ay, d;
        if (len2 === 0) { d = px * px + py * py; }
        else {
          var t = (px * dx + py * dy) / len2;
          t = t < 0 ? 0 : (t > 1 ? 1 : t);
          var ox = px - t * dx, oy = py - t * dy;
          d = ox * ox + oy * oy;
        }
        if (d > dmax) { dmax = d; pior = i; }
      }
      if (pior > 0 && dmax > tol * tol) {
        keep[pior] = true;
        pilha.push([a, pior], [pior, b]);
      }
    }
    var out = [];
    for (var k = 0; k < pts.length; k++) if (keep[k]) out.push(pts[k]);
    return out;
  }

  /* Normalizado → píxeis → RDP → normalizado outra vez. */
  function simplificarEmPixeis(pts, box, tolPx) {
    if (pts.length < 3) return pts;
    var px = pts.map(function (p) { return [p[0] * box.w, p[1] * box.h]; });
    var out = simplificar(px, tolPx);
    return out.map(function (p) { return [p[0] / box.w, p[1] / box.h]; });
  }

  /* ================================================================== */
  /* 6 · CANETA — pointer events, stylus primeiro                        */
  /* ================================================================== */

  var traco = null;                     // { sec, box, pts, path, pid, rec }

  function ehPonteiroDeDesenho(e) {
    /* PEN desenha sempre. MOUSE desenha (desktop). TOUCH nunca: o dedo
       continua a servir para rolar e tocar, que é o que o aluno espera
       num tablet. Não há touch-action global mexido em lado nenhum. */
    return e.pointerType === 'pen' || e.pointerType === 'mouse';
  }

  function onDown(e) {
    if (st.tool !== 'pen' && st.tool !== 'eraser') return;
    if (lbAberto()) return;                             // zoom aberto: caneta suspensa
    if (e.target && e.target.closest && e.target.closest('.rm2-box,.rm2-notes,.rm-tools,.rm-lb,.rm-menu,.rm-sug-fab,#rm-sug')) return;
    if (traco || apagando) return;                      // rejeição de palma/2.º ponteiro
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    var anc = anchorDe(e.target);
    if (!anc) return;
    var sec = anc.el;

    /* A goma aceita o dedo — um toque apaga e nunca chega a impedir o
       scroll, porque não se faz preventDefault para touch. O lápis, esse,
       só responde a stylus e rato: o dedo continua a ser navegação. */
    if (st.tool === 'eraser') { comecarApagar(e, sec); return; }
    if (!ehPonteiroDeDesenho(e)) return;

    var b = caixa(sec);
    traco = {
      sec: sec, box: b, pts: [], pid: e.pointerId,
      tipo: e.pointerType,
      rec: {
        id: 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        anchor_id: anc.id, color: st.penColor, width: st.penWidth, points: []
      }
    };
    var svg = svgDe(sec, anc.id);
    traco.path = novoPath(traco.rec);
    svg.appendChild(traco.path);

    document.body.classList.add('rm2-drawing');
    try { sec.setPointerCapture && sec.setPointerCapture(e.pointerId); } catch (err) {}
    addPonto(e);
    e.preventDefault();
  }

  var MIN_DIST_PX = 1.1;                // píxeis de ecrã, não unidades normalizadas

  function addPonto(e) {
    var b = traco.box;
    var x = (e.clientX + window.pageXOffset - b.x) / b.w;
    var y = (e.clientY + window.pageYOffset - b.y) / b.h;
    /* deixa sair um pouco da caixa sem explodir o valor guardado */
    x = Math.max(-1.5, Math.min(2.5, x));
    y = Math.max(-1.5, Math.min(2.5, y));
    var n = traco.pts.length;
    if (n) {
      var dx = (x - traco.pts[n - 1][0]) * b.w, dy = (y - traco.pts[n - 1][1]) * b.h;
      if (dx * dx + dy * dy < MIN_DIST_PX * MIN_DIST_PX) return;
    }
    traco.pts.push([x, y]);
  }

  function onMove(e) {
    if (!traco || e.pointerId !== traco.pid) return;
    /* getCoalescedEvents() pode devolver uma lista VAZIA — acontece no
       primeiro movimento de alguns dispositivos e em eventos sintéticos.
       Um `|| [e]` não chega, porque [] é truthy: era assim que se perdia
       o traço inteiro. */
    var evs = null;
    try { if (e.getCoalescedEvents) evs = e.getCoalescedEvents(); } catch (err) { evs = null; }
    if (!evs || !evs.length) evs = [e];
    for (var i = 0; i < evs.length; i++) addPonto(evs[i]);
    /* só se reescreve o atributo `d`; nenhum nó é criado ou destruído,
       nenhum reflow do documento (§12) */
    traco.path.setAttribute('d', dDe(traco.pts));
    e.preventDefault();
  }

  function onUp(e) {
    if (apagando) { terminarApagar(); return; }
    if (!traco || (e && e.pointerId !== traco.pid)) return;
    var t = traco; traco = null;
    document.body.classList.remove('rm2-drawing');

    /* A simplificação corre em PÍXEIS, não em unidades normalizadas: um
       bloco muito alto faz 40 px verticais valerem 0,002 em y, e um RDP
       cego a isso achatava a escrita numa recta. */
    var pts = simplificarEmPixeis(t.pts, t.box, 0.7);
    if (pts.length > 1200) pts = pts.filter(function (_, i) { return i % 2 === 0; });

    if (pts.length < 2) { if (t.path.parentNode) t.path.parentNode.removeChild(t.path); return; }

    /* 5 casas: num bloco de 18 000 px isto dá ~0,2 px de quantização. */
    t.rec.points = pts.map(function (p) { return [ +p[0].toFixed(5), +p[1].toFixed(5) ]; });
    t.path.setAttribute('d', dDe(t.rec.points));
    t.path.setAttribute('data-ink', t.rec.id);

    var slug = slugDoTab(abaAtiva());
    (st.strokes[slug] = st.strokes[slug] || []).push(t.rec);
    pushUndo({ tipo: 'ink-add', slug: slug, id: t.rec.id });
    filaGravar(slug, t.rec, t.path);
  }

  function onCancel(e) {
    if (apagando) { terminarApagar(); return; }
    if (!traco || (e && e.pointerId !== traco.pid)) return;
    if (traco.path && traco.path.parentNode) traco.path.parentNode.removeChild(traco.path);
    traco = null;
    document.body.classList.remove('rm2-drawing');
  }

  /* ---- persistência: uma gravação por traço, nunca por ponto -------- */
  async function filaGravar(slug, rec, pathEl) {
    var s = sb(), uid = st.uid;
    if (!s || !uid) { toast('Dibujado (sin sincronizar)', true); return; }
    try {
      var r = await s.from('user_ink_strokes').insert({
        user_id: uid, subject_slug: slug, anchor_id: rec.anchor_id,
        color: rec.color, width: rec.width, points: rec.points
      }).select('id').single();
      if (r.error) throw r.error;
      var antigo = rec.id;
      rec.id = r.data.id;
      if (pathEl) pathEl.setAttribute('data-ink', rec.id);
      remapear(antigo, rec.id);
    } catch (e) {
      console.warn('[rm2] ink insert', e && e.message);
      toast('No se pudo guardar el trazo.', true);
    }
  }

  /* ================================================================== */
  /* 7 · GOMA — marcações e traços, ambos reversíveis                    */
  /* ================================================================== */

  /* Uma goma só. O `preventDefault()` que o traço precisa mata o evento
     `click`, por isso a marcação NÃO pode ser apagada por um listener de
     click à parte: seria apagada só quando não houvesse traço por perto.
     Aqui o mesmo gesto trata das duas coisas — e um gesto é um undo. */
  var apagando = null;                  // { inks:[], hls:[], slug, pid, tipo }

  function comecarApagar(e, sec) {
    apagando = { inks: [], hls: [], slug: slugDoTab(abaAtiva()), pid: e.pointerId, tipo: e.pointerType };
    apagarEm(e);
    /* com o dedo não se trava nada: o toque apaga e a página continua a
       poder rolar. Só stylus e rato arrastam para apagar em série. */
    if (ehPonteiroDeDesenho(e)) {
      document.body.classList.add('rm2-drawing');
      try { sec.setPointerCapture && sec.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    }
  }

  function onMoveApagar(e) {
    if (!apagando || e.pointerId !== apagando.pid) return;
    if (!ehPonteiroDeDesenho(e)) return;
    apagarEm(e);
  }

  var TOL_APAGAR = 10;                  // px

  function apagarEm(e) {
    var tab = abaAtiva(); if (!tab) return;
    var px = e.clientX + window.pageXOffset, py = e.clientY + window.pageYOffset;
    var slug = apagando.slug;

    /* 1 · traços */
    var lista = st.strokes[slug] || [];
    for (var i = lista.length - 1; i >= 0; i--) {
      var rec = lista[i];
      var alvo = elDeAnchor(rec.anchor_id);
      if (!alvo) continue;
      var b = caixa(alvo);
      if (px < b.x - 20 || px > b.x + b.w + 20 || py < b.y - 20 || py > b.y + b.h + 20) continue;
      if (!tocaTraco(rec.points, b, px, py)) continue;
      lista.splice(i, 1);
      remover(rec.id);
      apagando.inks.push(rec);
      apagarNoBanco(rec.id);
    }

    /* 2 · marcações — a camada de tinta é pointer-events:none, por isso o
       elementFromPoint devolve mesmo o texto que está por baixo */
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var sp = el && el.closest && el.closest('.rm-hl');
    if (sp && tab.contains(sp)) apagarMarcaNoGesto(sp, slug);
  }

  function apagarMarcaNoGesto(sp, slug) {
    var id = sp.getAttribute('data-hl'); if (!id) return;
    for (var i = 0; i < apagando.hls.length; i++) {
      if (String(apagando.hls[i].id) === String(id)) return;   // já apagada neste gesto
    }
    var lista = (RT().estado.porSlug[slug] || []);
    var rec = null;
    for (var k = 0; k < lista.length; k++) if (String(lista[k].id) === String(id)) { rec = lista[k]; break; }
    if (rec) apagando.hls.push(rec);
    RT().apagarHighlight(sp);
  }

  function tocaTraco(pts, b, px, py) {
    for (var i = 0; i < pts.length; i++) {
      var x = b.x + pts[i][0] * b.w, y = b.y + pts[i][1] * b.h;
      var dx = x - px, dy = y - py;
      if (dx * dx + dy * dy <= TOL_APAGAR * TOL_APAGAR) return true;
      if (i) {  /* também o segmento, para traços rápidos com poucos pontos */
        var ax = b.x + pts[i - 1][0] * b.w, ay = b.y + pts[i - 1][1] * b.h;
        if (distSeg(px, py, ax, ay, x, y) <= TOL_APAGAR) return true;
      }
    }
    return false;
  }

  function distSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    if (!l2) return Math.hypot(px - ax, py - ay);
    var t = ((px - ax) * dx + (py - ay) * dy) / l2;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function terminarApagar() {
    var a = apagando; apagando = null;
    document.body.classList.remove('rm2-drawing');
    if (!a) return;
    var n = a.inks.length + a.hls.length;
    if (!n) return;
    /* um gesto = um undo, mesmo que tenha apanhado vários traços e marcas */
    pushUndo({ tipo: 'del', slug: a.slug, inks: a.inks, hls: a.hls });
    toast(n === 1 ? 'Borrado ✓' : n + ' elementos borrados ✓');
  }

  async function apagarNoBanco(id) {
    if (String(id).indexOf('tmp-') === 0) return;
    var s = sb(); if (!s || !st.uid) return;
    try { await s.from('user_ink_strokes').delete().eq('user_id', st.uid).eq('id', id); }
    catch (e) { console.warn('[rm2] ink delete', e && e.message); }
  }

  /* ---- apagar uma marcação isolada (usado pela API pública) --------- */
  async function apagarHighlight(sp) {
    var tab = abaAtiva(); if (!tab) return;
    var id = sp.getAttribute('data-hl'); if (!id) return;
    var slug = slugDoTab(tab);
    var lista = (RT().estado.porSlug[slug] || []);
    var rec = null;
    for (var i = 0; i < lista.length; i++) if (String(lista[i].id) === String(id)) { rec = lista[i]; break; }
    await RT().apagarHighlight(sp);                    // motor antigo: despinta + apaga no banco
    if (rec) pushUndo({ tipo: 'hl-del', slug: slug, rec: rec });
  }

  /* ================================================================== */
  /* 8 · DESFAZER — pilha única, operações inversas                      */
  /* ================================================================== */

  async function desfazer() {
    var op = st.undo.pop();
    refletir();
    if (!op) return;

    if (op.tipo === 'ink-add') {
      var lista = st.strokes[op.slug] || [];
      for (var i = lista.length - 1; i >= 0; i--) {
        if (String(lista[i].id) === String(op.id)) { lista.splice(i, 1); break; }
      }
      remover(op.id);
      apagarNoBanco(op.id);
      toast('Trazo deshecho ✓');
      return;
    }

    if (op.tipo === 'del') {
      for (var k = 0; k < op.inks.length; k++) await restaurarTraco(op.slug, op.inks[k]);
      for (var j = 0; j < op.hls.length; j++) await restaurarHighlight(op.slug, op.hls[j], true);
      var n = op.inks.length + op.hls.length;
      toast(n === 1 ? 'Restaurado ✓' : n + ' elementos restaurados ✓');
      return;
    }

    if (op.tipo === 'hl-add') {
      var tab = abaAtiva();
      var sp = tab && tab.querySelector('.rm-hl[data-hl="' + cssEsc(String(op.id)) + '"]');
      if (sp) await apagarHighlightSemUndo(sp, op.slug, op.id);
      toast('Marca deshecha ✓');
      return;
    }

    if (op.tipo === 'hl-del') { await restaurarHighlight(op.slug, op.rec); return; }
    if (op.tipo === 'ink-del') {   /* forma antiga, mantida por compatibilidade */
      for (var q = 0; q < op.recs.length; q++) await restaurarTraco(op.slug, op.recs[q]);
      return;
    }
  }

  async function apagarHighlightSemUndo(sp, slug, id) {
    RT().despintar(id, abaAtiva());
    RT().estado.porSlug[slug] = (RT().estado.porSlug[slug] || [])
      .filter(function (h) { return String(h.id) !== String(id); });
    if (String(id).indexOf('tmp-') === 0) return;
    var s = sb(); if (!s || !st.uid) return;
    try { await s.from('user_highlights').delete().eq('user_id', st.uid).eq('id', id); }
    catch (e) { console.warn('[rm2] hl delete', e && e.message); }
  }

  async function restaurarTraco(slug, rec) {
    var idVelho = rec.id;
    var novo = {
      id: 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      anchor_id: rec.anchor_id, color: rec.color, width: rec.width, points: rec.points
    };
    (st.strokes[slug] = st.strokes[slug] || []).push(novo);
    remapear(idVelho, novo.id);           // quem apontava para o traço antigo passa a apontar para este
    var p = desenhar(novo);
    await filaGravar(slug, novo, p);
  }

  async function restaurarHighlight(slug, rec, silencioso) {
    var tab = abaAtiva(); if (!tab) return;
    var s = sb();
    var novoId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    if (s && st.uid) {
      try {
        var r = await s.from('user_highlights').insert({
          user_id: st.uid, subject_slug: slug, block_id: rec.block_id,
          exact_text: rec.exact_text, prefix: rec.prefix, suffix: rec.suffix,
          occurrence: rec.occurrence, color: rec.color
        }).select('id').single();
        if (r.error) throw r.error;
        novoId = r.data.id;
      } catch (e) { console.warn('[rm2] hl restore', e && e.message); }
    }
    var copia = {
      id: novoId, block_id: rec.block_id, exact_text: rec.exact_text,
      prefix: rec.prefix, suffix: rec.suffix, occurrence: rec.occurrence, color: rec.color
    };
    remapear(rec.id, novoId);
    (RT().estado.porSlug[slug] = RT().estado.porSlug[slug] || []).push(copia);
    repintar(tab, copia);
    if (!silencioso) toast('Marca restaurada ✓');
  }

  /* Repinta UMA marcação usando as primitivas do motor antigo. */
  function repintar(tab, h) {
    var bloco = tab.querySelector('#' + cssEsc(h.block_id));
    if (!bloco) return false;
    var idx = RT().indexar(bloco);
    var i = RT().escolher(idx.norm, h);
    if (i < 0) return false;
    var r = RT().rangeDe(idx, i, i + h.exact_text.length);
    if (!r) return false;
    return !!RT().pintar(r, h.color, h.id);
  }

  /* ================================================================== */
  /* 9 · MARCADOR — um clique e pronto                                   */
  /* ================================================================== */

  /* O botão do marcador ACTIVA o modo. Não é preciso escolher cor: usa a
     última, e amarelo se nunca houve nenhuma. A paleta abre por baixo só
     para trocar, nunca como pré-requisito (§5 do encargo). */
  async function aplicarMarcacao() {
    var tab = abaAtiva(); if (!tab) return;
    var slug = slugDoTab(tab);
    var antes = (RT().estado.porSlug[slug] || []).length;
    RT().estado.cor = st.hlColor;
    await RT().marcarSelecao();
    var lista = RT().estado.porSlug[slug] || [];
    if (lista.length > antes) {
      pushUndo({ tipo: 'hl-add', slug: slug, id: lista[lista.length - 1].id });
    }
  }

  /* ================================================================== */
  /* 10 · CARREGAR TRAÇOS DA MATÉRIA                                     */
  /* ================================================================== */

  var emVoo = {};

  async function carregarTracos(slug) {
    if (st.carregado[slug]) return st.strokes[slug] || [];
    if (emVoo[slug]) return emVoo[slug];
    emVoo[slug] = (async function () {
      var s = sb();
      if (!s || !st.uid) return [];
      try {
        var r = await s.from('user_ink_strokes')
          .select('id,anchor_id,color,width,points')
          .eq('user_id', st.uid).eq('subject_slug', slug);
        if (r.error) throw r.error;
        st.strokes[slug] = r.data || [];
        st.carregado[slug] = true;
        return st.strokes[slug];
      } catch (e) {
        console.warn('[rm2] strokes indisponíveis', e && e.message);
        return [];
      } finally { delete emVoo[slug]; }
    })();
    return emVoo[slug];
  }

  async function sincronizarAba(tabEl) {
    if (!tabEl) return;
    var slug = slugDoTab(tabEl);
    if (!slug) return;
    limparCamada();
    var lista = await carregarTracos(slug);
    if (abaAtiva() !== tabEl) return;
    lista.forEach(desenhar);
    reposicionarTudo();
  }

  /* ================================================================== */
  /* 11 · TOOLBOX                                                        */
  /* ================================================================== */

  var box = null;

  function ico(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  var I = {
    tools: '<path d="M14.7 6.3a4 4 0 0 1 5 5L9 22l-5 1 1-5Z"/><path d="M12.5 8.5 15.5 11.5"/>',
    mark:  '<path d="M4 20h4L18 10a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/>',
    pen:   '<path d="M3 21l3.2-.8L20 6.4a2.3 2.3 0 0 0-3.3-3.3L3 16.9Z"/><path d="M15.2 4.8 19.2 8.8"/>',
    erase: '<path d="M8 20H5l-2-2 9-9 6 6-5 5Z"/><path d="M14 6l4 4"/><path d="M9 20h11"/>',
    undo:  '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    note:  '<path d="M5 4h11l3 3v13H5Z"/><path d="M8 10h8"/><path d="M8 14h6"/>'
  };

  function montar() {
    if (box && box.isConnected) return;
    box = document.createElement('div');
    box.className = 'rm2-box';
    box.innerHTML =
      '<div class="rm2-panel" id="rm2-panel" role="group" aria-label="Herramientas de estudio">' +
        '<button type="button" class="rm2-btn" data-t="highlight" aria-pressed="false" ' +
          'title="Marcador de texto" aria-label="Marcador de texto">' + ico(I.mark) + '<span class="tx">Marcador</span></button>' +
        '<div class="rm2-sub" data-sub="highlight">' +
          '<div class="rm2-swatches" role="radiogroup" aria-label="Color del marcador">' +
            HL_CORES.map(function (c) {
              return '<button type="button" class="rm2-sw-' + c + '" data-hc="' + c + '" role="radio" ' +
                'aria-checked="false" title="' + nomeCor(c) + '" aria-label="Marcador ' + nomeCor(c) + '"></button>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<button type="button" class="rm2-btn" data-t="pen" aria-pressed="false" ' +
          'title="Lápiz" aria-label="Lápiz para escribir a mano">' + ico(I.pen) + '<span class="tx">Lápiz</span></button>' +
        '<div class="rm2-sub" data-sub="pen">' +
          '<div class="rm2-swatches" role="radiogroup" aria-label="Color del lápiz">' +
            '<button type="button" class="rm2-sw-black" data-pc="black" role="radio" aria-checked="false" title="Negro" aria-label="Lápiz negro"></button>' +
            '<button type="button" class="rm2-sw-pblue" data-pc="blue"  role="radio" aria-checked="false" title="Azul"  aria-label="Lápiz azul"></button>' +
            '<button type="button" class="rm2-sw-pred"  data-pc="red"   role="radio" aria-checked="false" title="Rojo"  aria-label="Lápiz rojo"></button>' +
          '</div>' +
          '<div class="rm2-widths" role="radiogroup" aria-label="Grosor del lápiz">' +
            '<button type="button" class="rm2-w-thin"   data-pw="thin"   role="radio" aria-checked="false" title="Fino"   aria-label="Trazo fino"><i></i></button>' +
            '<button type="button" class="rm2-w-medium" data-pw="medium" role="radio" aria-checked="false" title="Medio"  aria-label="Trazo medio"><i></i></button>' +
            '<button type="button" class="rm2-w-thick"  data-pw="thick"  role="radio" aria-checked="false" title="Grueso" aria-label="Trazo grueso"><i></i></button>' +
          '</div>' +
        '</div>' +

        '<button type="button" class="rm2-btn" data-t="eraser" aria-pressed="false" ' +
          'title="Goma de borrar" aria-label="Goma: borrar marcas y trazos">' + ico(I.erase) + '<span class="tx">Goma</span></button>' +
        '<div class="rm2-sep"></div>' +
        '<button type="button" class="rm2-btn" data-a="undo" title="Deshacer" aria-label="Deshacer la última acción">' +
          ico(I.undo) + '<span class="tx">Deshacer</span></button>' +
        '<button type="button" class="rm2-btn" data-a="notes" title="Mis apuntes" aria-label="Abrir mis apuntes">' +
          ico(I.note) + '<span class="tx">Mis apuntes</span></button>' +
      '</div>' +
      '<button type="button" class="rm2-fab" id="rm2-fab" aria-expanded="false" aria-controls="rm2-panel" ' +
        'title="Herramientas de estudio" aria-label="Herramientas de estudio">' + ico(I.tools) + '</button>';

    document.body.appendChild(box);

    box.querySelector('#rm2-fab').addEventListener('click', function () {
      st.open = !st.open; refletir();
    });

    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;

      var t = b.getAttribute('data-t');
      if (t) { escolherFerramenta(st.tool === t ? 'none' : t); return; }

      var a = b.getAttribute('data-a');
      if (a === 'undo') { desfazer(); return; }
      if (a === 'notes') { abrirNotas(); return; }

      var hc = b.getAttribute('data-hc');
      if (hc) {
        st.hlColor = hc; LS.set('hlColor', hc);
        if (st.tool !== 'highlight') escolherFerramenta('highlight'); else refletir();
        /* fluxo antigo «seleccionar e depois tocar a cor» continua a valer */
        var s = window.getSelection();
        if (s && s.rangeCount && !s.isCollapsed) aplicarMarcacao();
        return;
      }

      var pc = b.getAttribute('data-pc');
      if (pc) { st.penColor = pc; LS.set('penColor', pc); if (st.tool !== 'pen') escolherFerramenta('pen'); else refletir(); return; }

      var pw = b.getAttribute('data-pw');
      if (pw) { st.penWidth = pw; LS.set('penWidth', pw); if (st.tool !== 'pen') escolherFerramenta('pen'); else refletir(); return; }
    });

    refletir();
  }

  function nomeCor(c) {
    return { yellow: 'Amarillo', red: 'Rojo', blue: 'Azul', green: 'Verde', pink: 'Rosa' }[c] || c;
  }

  function escolherFerramenta(t) {
    if (traco) onCancel();
    if (apagando) terminarApagar();
    st.tool = t;
    if (t !== 'none') st.open = true;
    refletir();
    if (t === 'highlight') toast('Marcador activo · seleccioná el texto');
    if (t === 'pen') toast('Lápiz activo · escribí con el lápiz o el ratón');
    if (t === 'eraser') toast('Goma activa · tocá una marca o un trazo');
  }

  function refletir() {
    if (!box) return;
    box.classList.toggle('open', st.open);
    var fab = box.querySelector('#rm2-fab');
    fab.setAttribute('aria-expanded', String(st.open));
    fab.classList.toggle('armed', st.tool !== 'none');

    box.querySelectorAll('.rm2-btn[data-t]').forEach(function (b) {
      var on = b.getAttribute('data-t') === st.tool;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    box.querySelectorAll('.rm2-sub').forEach(function (s) {
      s.classList.toggle('on', s.getAttribute('data-sub') === st.tool);
    });
    box.querySelectorAll('[data-hc]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-hc') === st.hlColor));
    });
    box.querySelectorAll('[data-pc]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-pc') === st.penColor));
    });
    box.querySelectorAll('[data-pw]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-pw') === st.penWidth));
    });
    var u = box.querySelector('[data-a="undo"]');
    if (u) u.disabled = !st.undo.length;

    /* o estado da ferramenta não é só cor: vai também para o body, para
       o cursor e para a goma destacarem as marcações (§31) */
    var b = document.body;
    b.classList.toggle('rm2-t-highlight', st.tool === 'highlight');
    b.classList.toggle('rm2-t-pen', st.tool === 'pen');
    b.classList.toggle('rm2-t-eraser', st.tool === 'eraser');
    /* mantém o motor antigo coerente, sem lhe devolver a UI */
    RT().estado.marcando = false;
    RT().estado.apagando = false;
    RT().estado.cor = st.hlColor;
  }

  /* ================================================================== */
  /* 12 · MINHAS ANOTAÇÕES                                               */
  /* ================================================================== */

  var drawer = null;

  function montarDrawer() {
    if (drawer && drawer.isConnected) return drawer;
    drawer = document.createElement('aside');
    drawer.className = 'rm2-notes';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Mis apuntes');
    drawer.innerHTML =
      '<header><div><h3>Mis apuntes</h3><div class="sub" data-sub></div></div>' +
      '<button type="button" class="rm2-new" data-new>Nuevo</button>' +
      '<button type="button" class="rm2-x" data-close aria-label="Cerrar">✕</button></header>' +
      '<div class="body" data-body></div>';
    document.body.appendChild(drawer);
    drawer.querySelector('[data-close]').addEventListener('click', fecharNotas);
    drawer.querySelector('[data-new]').addEventListener('click', novaNota);
    return drawer;
  }

  var notas = [];

  async function abrirNotas() {
    montarDrawer();
    st.notasAbertas = true;
    drawer.classList.add('on');
    drawer.querySelector('[data-sub]').textContent = nomeDaMateria();
    await listarNotas();
  }

  function nomeDaMateria() {
    var tab = abaAtiva(); if (!tab) return '';
    var h = tab.querySelector('.rm-subject-head h1, .rm-subject-head h2, h1');
    var t = h && (h.textContent || '').replace(/\s+/g, ' ').trim();
    return t || slugDoTab(tab);
  }

  function fecharNotas() {
    st.notasAbertas = false;
    if (drawer) drawer.classList.remove('on');
  }

  async function listarNotas() {
    var corpo = drawer.querySelector('[data-body]');
    var slug = slugDoTab(abaAtiva());
    var s = sb();
    if (!s || !st.uid) { corpo.innerHTML = '<div class="empty">Iniciá sesión para guardar apuntes.</div>'; return; }
    corpo.innerHTML = '<div class="empty">Cargando…</div>';
    try {
      var r = await s.from('user_notes')
        .select('id,anchor_id,anchor_label,title,body,updated_at')
        .eq('user_id', st.uid).eq('subject_slug', slug)
        .order('updated_at', { ascending: false });
      if (r.error) throw r.error;
      notas = r.data || [];
    } catch (e) {
      corpo.innerHTML = '<div class="empty">No se pudieron cargar los apuntes.</div>';
      console.warn('[rm2] notes', e && e.message);
      return;
    }
    render();
  }

  function render() {
    var corpo = drawer.querySelector('[data-body]');
    if (!notas.length) { corpo.innerHTML = '<div class="empty">Todavía no hay apuntes en esta materia.<br>Tocá «Nuevo» para empezar.</div>'; return; }
    corpo.innerHTML = '';
    notas.forEach(function (n) {
      var el = document.createElement('div');
      el.className = 'rm2-note';
      el.innerHTML =
        '<input type="text" value="" placeholder="Título (opcional)" aria-label="Título del apunte">' +
        '<textarea placeholder="Escribí acá…" aria-label="Texto del apunte"></textarea>' +
        '<div class="meta"><b></b><span></span>' +
        '<button type="button" class="del" aria-label="Eliminar apunte">Eliminar</button></div>';
      el.querySelector('input').value = n.title || '';
      el.querySelector('textarea').value = n.body || '';
      el.querySelector('.meta b').textContent = n.anchor_label || '';
      el.querySelector('.meta span').textContent = n.updated_at ? new Date(n.updated_at).toLocaleDateString() : '';
      var gravar = debounce(function () {
        salvarNota(n, el.querySelector('input').value, el.querySelector('textarea').value);
      }, 700);
      el.querySelector('input').addEventListener('input', gravar);
      el.querySelector('textarea').addEventListener('input', gravar);
      el.querySelector('input').addEventListener('blur', gravar);
      el.querySelector('textarea').addEventListener('blur', gravar);
      el.querySelector('.del').addEventListener('click', function () { apagarNota(n, el); });
      corpo.appendChild(el);
    });
  }

  async function novaNota() {
    var s = sb(); if (!s || !st.uid) { toast('Iniciá sesión para guardar apuntes.', true); return; }
    var tab = abaAtiva(); var slug = slugDoTab(tab);
    var sec = blocoVisivel(tab);
    try {
      var r = await s.from('user_notes').insert({
        user_id: st.uid, subject_slug: slug,
        anchor_id: sec ? sec.id : null,
        anchor_label: sec ? rotuloDe(sec) : null,
        title: '', body: ''
      }).select('id,anchor_id,anchor_label,title,body,updated_at').single();
      if (r.error) throw r.error;
      notas.unshift(r.data);
      render();
      var ta = drawer.querySelector('.rm2-note textarea'); if (ta) ta.focus();
    } catch (e) { toast('No se pudo crear el apunte.', true); console.warn('[rm2] note insert', e && e.message); }
  }

  async function salvarNota(n, titulo, corpo) {
    if (n.title === titulo && n.body === corpo) return;
    n.title = titulo; n.body = corpo;
    var s = sb(); if (!s || !st.uid) return;
    try {
      var r = await s.from('user_notes')
        .update({ title: titulo, body: corpo, updated_at: new Date().toISOString() })
        .eq('user_id', st.uid).eq('id', n.id);
      if (r.error) throw r.error;
    } catch (e) { toast('No se pudo guardar el apunte.', true); }
  }

  async function apagarNota(n, el) {
    if (!window.confirm('¿Eliminar este apunte? No se puede deshacer.')) return;
    var s = sb(); if (!s || !st.uid) return;
    try {
      var r = await s.from('user_notes').delete().eq('user_id', st.uid).eq('id', n.id);
      if (r.error) throw r.error;
      notas = notas.filter(function (x) { return x.id !== n.id; });
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (!notas.length) render();
      toast('Apunte eliminado ✓');
    } catch (e) { toast('No se pudo eliminar.', true); }
  }

  function blocoVisivel(tab) {
    if (!tab) return null;
    var secs = tab.querySelectorAll(ANCHOR_SEL), meio = window.innerHeight / 2, melhor = null, dist = 1e9;
    for (var i = 0; i < secs.length; i++) {
      var r = secs[i].getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      var d = Math.abs(r.top - meio);
      if (d < dist) { dist = d; melhor = secs[i]; }
    }
    return melhor || secs[0] || null;
  }

  /* ================================================================== */
  /* 13 · ESCUTAS                                                        */
  /* ================================================================== */

  function ligar() {
    /* marcador: um clique activa, soltar a selecção aplica */
    ['mouseup', 'touchend'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        if (st.tool !== 'highlight') return;
        if (e.target && e.target.closest && e.target.closest('.rm2-box,.rm2-notes')) return;
        setTimeout(function () {
          var s = window.getSelection();
          if (s && s.rangeCount && !s.isCollapsed) aplicarMarcacao();
        }, 30);
      }, { passive: true });
    });

    /* Com a goma armada, nenhum clique do documento passa para baixo: nem
       abre um link, nem responde a um quiz por engano. O apagar em si é
       feito no gesto de ponteiro (apagarEm), não aqui. */
    document.addEventListener('click', function (e) {
      if (st.tool !== 'eraser') return;
      if (e.target && e.target.closest && e.target.closest('.rm2-box,.rm2-notes')) return;
      if (e.target && e.target.closest && e.target.closest('#materias-container')) {
        e.preventDefault(); e.stopPropagation();
      }
    }, true);

    /* caneta e goma de traços */
    document.addEventListener('pointerdown', onDown, { passive: false });
    document.addEventListener('pointermove', function (e) {
      if (traco) onMove(e); else if (apagando) onMoveApagar(e);
    }, { passive: false });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onCancel, { passive: true });
    window.addEventListener('blur', function () { onCancel(); });

    /* ESC: fecha o que estiver aberto, depois volta a «nenhuma» */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (st.notasAbertas) { fecharNotas(); return; }
      if (st.tool !== 'none') { escolherFerramenta('none'); return; }
      if (st.open) { st.open = false; refletir(); }
    });

    /* clicar fora minimiza (mas nunca no meio de um traço) */
    document.addEventListener('pointerdown', function (e) {
      if (!st.open || traco || apagando) return;
      if (e.target.closest && e.target.closest('.rm2-box,.rm2-notes')) return;
      if (st.tool !== 'none') return;             // ferramenta armada: mantém aberto
      st.open = false; refletir();
    }, true);

    var reflow = debounce(reposicionarTudo, 120);
    window.addEventListener('resize', reflow);
    window.addEventListener('orientationchange', function () { setTimeout(reposicionarTudo, 220); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) reflow(); });
  }

  /* ================================================================== */
  /* 14 · ARRANQUE                                                       */
  /* ================================================================== */

  async function iniciar() {
    var t = RT();
    if (!t || !t.userId || !t.onAbaPronta) return;       // rm-tools antigo: não faz nada
    var uid = await t.userId();
    var ok = await hasStudyToolsV2Access(uid);
    if (!ok) return;                                     // ← toda a gente que não é tester sai aqui

    st.uid = uid;
    window.RM_STUDY_V2_ACTIVE = true;
    document.body.classList.add('rm-v2');

    injectCSS();
    montar();
    ligar();

    /* a coluna direita legada pode já ter sido montada antes de sabermos
       que este utilizador é tester: remove-se, e só dela */
    document.querySelectorAll('#materias-container .rm-tools-r').forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    if (t.medirBarra) t.medirBarra();

    t.onAbaPronta(function (tabEl) {
      if (tabEl.classList.contains('active')) sincronizarAba(tabEl);
    });
    var ativa = abaAtiva();
    if (ativa) sincronizarAba(ativa);

    if (typeof window.switchTab === 'function') {
      var sw = window.switchTab;
      window.switchTab = function () {
        var r = sw.apply(this, arguments);
        setTimeout(function () {
          fecharNotas();
          var el = abaAtiva(); if (el) sincronizarAba(el);
        }, 0);
        return r;
      };
    }

    window.RMToolsV2 = {
      estado: st,
      rollout: ROLLOUT,
      escolherFerramenta: escolherFerramenta,
      desfazer: desfazer,
      abrirNotas: abrirNotas,
      fecharNotas: fecharNotas,
      sincronizarAba: sincronizarAba,
      reposicionar: reposicionarTudo,
      simplificar: simplificar,
      dDe: dDe,
      hasAccess: hasStudyToolsV2Access
    };
  }

  /* rm-tools.js corre no DOMContentLoaded; entramos logo a seguir. */
  function arrancar() { setTimeout(function () { iniciar().catch(function (e) { console.warn('[rm2]', e); }); }, 0); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
