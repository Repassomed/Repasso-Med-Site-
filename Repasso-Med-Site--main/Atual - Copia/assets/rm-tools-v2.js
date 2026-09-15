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
  /* Duas fontes: a classe que o rm-tools põe no body (síncrona, e posta
     também quando o aluno clica na imagem) e a API pública. */
  function lbAberto() {
    if (document.body.classList.contains('rm-lb-open')) return true;
    var t = RT(); return t ? t.lbAberto() : false;
  }

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

/* ---------- modo de escrita -----------------------------------------
   O browser decide se um gesto é pan ANTES de despachar o evento, e essa
   decisão sai do touch-action do alvo — não do preventDefault(), que
   nessa altura ainda não correu. Com touch-action:auto (o que havia),
   um traço vertical era reclamado como scroll, a página rolava e o
   ponteiro era cancelado a meio da letra. O horizontal escapava só
   porque a página não tem para onde rolar na horizontal: era exactamente
   esse o sintoma relatado — riscos deitados sim, escrever não.

   Enquanto a caneta (ou a goma de traços) está ARMADA, a área da matéria
   deixa de oferecer pan. Fora desse estado não há uma única propriedade
   aplicada, por isso o scroll volta no instante em que se desarma: isto
   é só uma classe no body, sem overflow:hidden, sem mexer na posição de
   scroll e sem layout shift. O marcador não entra aqui — continua a
   rolar normalmente, que é o que se espera de quem só está a ler. */
body.rm2-t-pen #materias-container,
body.rm2-t-eraser #materias-container{
  touch-action:none;
  overscroll-behavior:contain;
  -webkit-user-select:none; user-select:none;
}

/* Com o zoom aberto a matéria sai de cena: a toolbox e a gaveta saem também.
   O rm-tools põe .rm-lb-open no body ao abrir o lightbox, e tira-o ao fechar
   — inclusive quando o aluno clica na própria imagem, que é o caminho que um
   wrapper da API pública nunca veria. A camada de tinta já é pointer-events:
   none e vive em z-index 60, muito abaixo do lightbox. */
body.rm-lb-open .rm2-box,
body.rm-lb-open .rm2-notes{ display:none !important; }
body.rm-lb-open #rm2-ink{ visibility:hidden; }

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

/* ---------- toolbox: um trilho vertical estreito ---------------------- */
/* Regra de ouro do desenho: o trilho tem 58 px e NUNCA cresce em largura.
   Cores e grossuras abrem para baixo, dentro do proprio trilho, para nao
   comer faixa de leitura — sobretudo em tablet. */
.rm2-box{
  --rm2-brand:#13314f; --rm2-deep:#081726; --rm2-gold:#d8a32a;
  position:fixed; right:max(9px, env(safe-area-inset-right)); z-index:99991;
  top:50%; transform:translateY(-50%);
  display:flex; flex-direction:column; align-items:center; gap:9px; width:58px;
}
.rm2-fab{
  position:relative; width:52px; height:52px; border-radius:17px; padding:0;
  border:1px solid rgba(16,36,61,.13); cursor:pointer;
  background:linear-gradient(175deg,#ffffff 0%,#f2f6fb 100%);
  display:grid; place-items:center;
  box-shadow:0 8px 20px rgba(8,23,38,.17), inset 0 1px 0 #fff, 0 2px 4px rgba(8,23,38,.08);
  transition:transform .16s ease, box-shadow .16s ease;
}
.rm2-fab:hover{ transform:translateY(-1.5px); box-shadow:0 12px 26px rgba(8,23,38,.22), inset 0 1px 0 #fff; }
.rm2-fab:active{ transform:translateY(0); }
.rm2-fab:focus-visible{ outline:3px solid var(--rm2-brand); outline-offset:3px; }
.rm2-fab svg{ width:30px; height:30px; display:block; }
.rm2-fab.armed{ box-shadow:0 0 0 2.5px var(--rm2-gold), 0 8px 20px rgba(8,23,38,.20), inset 0 1px 0 #fff; }
.rm2-box.open .rm2-fab{ background:linear-gradient(175deg,#f7fafd 0%,#e9f0f7 100%); }

.rm2-panel{
  display:none; flex-direction:column; align-items:center; gap:3px;
  width:58px; padding:7px 4px;
  background:linear-gradient(180deg,rgba(255,255,255,.985) 0%,rgba(246,249,253,.985) 100%);
  border:1px solid rgba(16,36,61,.12); border-radius:20px;
  box-shadow:0 16px 42px rgba(8,23,38,.20), 0 2px 6px rgba(8,23,38,.10), inset 0 1px 0 #fff;
  max-height:min(76vh,660px); overflow-y:auto; overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch; scrollbar-width:none;
}
.rm2-panel::-webkit-scrollbar{ width:0; }
.rm2-box.open .rm2-panel{ display:flex; }

.rm2-btn{
  position:relative; width:44px; height:44px; flex:0 0 44px; padding:0;
  border:1px solid transparent; border-radius:14px; background:transparent;
  cursor:pointer; display:grid; place-items:center;
  transition:background .13s ease, box-shadow .13s ease, transform .13s ease;
}
.rm2-btn svg{ width:27px; height:27px; display:block; }
.rm2-btn:hover{ background:rgba(19,49,79,.055); }
.rm2-btn:focus-visible{ outline:3px solid var(--rm2-brand); outline-offset:1px; }
.rm2-btn[disabled]{ opacity:.32; cursor:default; }
.rm2-btn[disabled]:hover{ background:transparent; }
/* ESTADO ACTIVO: carregado para dentro + barra dourada a esquerda.
   Relevo e marca de posicao, nunca so a cor. */
.rm2-btn.on{
  background:linear-gradient(180deg,#e6edf6 0%,#d7e2ef 100%);
  border-color:rgba(19,49,79,.16);
  box-shadow:inset 0 2px 5px rgba(8,23,38,.17), inset 0 -1px 0 rgba(255,255,255,.7);
  transform:translateY(.5px);
}
.rm2-btn.on::before{
  content:""; position:absolute; left:-4px; top:11px; width:3px; height:22px;
  border-radius:3px; background:var(--rm2-gold); box-shadow:0 0 0 1px rgba(179,133,26,.25);
}
.rm2-sep{ width:26px; height:1px; background:rgba(16,36,61,.12); margin:4px 0; flex:0 0 1px; }

/* ---- subcontrolos: sempre em coluna, sempre dentro dos 58 px -------- */
.rm2-sub{ display:none; flex-direction:column; align-items:center; gap:5px; padding:5px 0 6px; }
.rm2-sub.on{ display:flex; }
.rm2-sw{
  width:26px; height:26px; flex:0 0 26px; padding:0; cursor:pointer; position:relative;
  border-radius:9px; border:1.5px solid rgba(16,36,61,.16);
  box-shadow:0 1px 2px rgba(8,23,38,.12), inset 0 1px 0 rgba(255,255,255,.45);
  transition:transform .12s ease, box-shadow .12s ease;
}
.rm2-sw:hover{ transform:scale(1.07); }
.rm2-sw:focus-visible{ outline:3px solid var(--rm2-brand); outline-offset:2px; }
.rm2-sw[aria-checked="true"]{
  border-color:var(--rm2-brand);
  box-shadow:0 0 0 2px rgba(19,49,79,.18), 0 2px 5px rgba(8,23,38,.20);
  transform:scale(1.07);
}
.rm2-sw[aria-checked="true"]::after{
  content:""; position:absolute; inset:0; margin:auto; width:8px; height:5px;
  border-left:2.2px solid #10243D; border-bottom:2.2px solid #10243D;
  transform:rotate(-45deg) translate(1px,-2px);
}
.rm2-sw[data-pc][aria-checked="true"]::after{ border-color:#fff; }
.rm2-sw-yellow{ background:linear-gradient(160deg,#ffe373,#f5c518); }
.rm2-sw-red{    background:linear-gradient(160deg,#ff9a9a,#f1616a); }
.rm2-sw-blue{   background:linear-gradient(160deg,#93c6ff,#3f8fe0); }
.rm2-sw-green{  background:linear-gradient(160deg,#96e8b8,#35b97a); }
.rm2-sw-pink{   background:linear-gradient(160deg,#ffb0dd,#ef62b4); }
.rm2-sw-black{  background:linear-gradient(160deg,#3a5473,#10243D); }
.rm2-sw-pblue{  background:linear-gradient(160deg,#4f8ee6,#1f5fd0); }
.rm2-sw-pred{   background:linear-gradient(160deg,#e0645a,#c0392b); }

.rm2-w{
  width:30px; height:22px; flex:0 0 22px; padding:0; cursor:pointer;
  border-radius:8px; border:1px solid rgba(16,36,61,.16);
  background:linear-gradient(180deg,#fff,#f3f7fb);
  display:grid; place-items:center; transition:box-shadow .12s ease;
}
.rm2-w:focus-visible{ outline:3px solid var(--rm2-brand); outline-offset:1px; }
.rm2-w[aria-checked="true"]{
  border-color:var(--rm2-brand);
  box-shadow:inset 0 1px 3px rgba(8,23,38,.16), 0 0 0 1.5px rgba(19,49,79,.16);
}
.rm2-w i{ display:block; width:17px; border-radius:99px; background:linear-gradient(90deg,#2d5b86,#10243D); }
.rm2-w-thin i{ height:2px; } .rm2-w-medium i{ height:4px; } .rm2-w-thick i{ height:7px; }

/* ---------- gaveta de anotações -------------------------------------- */
.rm2-notes{
  position:fixed; z-index:99993; right:0; top:0; height:100%;
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
/* Tablet e a prioridade: o trilho fica encostado a direita, centrado na
   vertical, e nunca ultrapassa 58 px de largura em viewport nenhum. */
@media (max-width:1024px){ .rm2-box{ right:max(8px, env(safe-area-inset-right)); } }
@media (max-height:640px){ .rm2-panel{ max-height:64vh; } }
@media (max-width:560px){
  .rm2-box{ top:auto; bottom:max(84px, calc(env(safe-area-inset-bottom) + 74px));
            transform:none; width:52px; }
  .rm2-panel{ width:52px; padding:6px 3px; max-height:min(58vh,420px); }
  .rm2-btn{ width:40px; height:40px; flex:0 0 40px; border-radius:12px; }
  .rm2-btn svg{ width:25px; height:25px; }
  .rm2-fab{ width:48px; height:48px; border-radius:15px; }
  .rm2-fab svg{ width:28px; height:28px; }
  .rm2-sw{ width:24px; height:24px; flex:0 0 24px; }
  .rm2-w{ width:28px; }
}
@media (prefers-reduced-motion: reduce){ .rm2-fab,.rm2-btn,.rm2-sw{ transition:none; } }

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

  /* ------------------------------------------------------------------
     RENDERIZAÇÃO · quadrática por pontos médios, com respeito pelos cantos

     Os pontos GRAVADOS não mudam: isto transforma os mesmos `points` num
     caminho visual menos serrilhado. Os traços antigos continuam a abrir,
     o schema fica igual e não há migração.

     Porquê «com respeito pelos cantos»: medi as duas hipóteses contra
     letras amostradas a ~120 Hz, comparando o desenho final com o traço
     original denso (pior desvio, em píxeis, letra de ~34 px):

                      poligonal   quadrática cega   quadrática c/ cantos
       e                   0.63              0.46                   0.46
       s                   1.46              1.07                   1.07
       espiral             0.89              0.82                   0.71
       m                   1.01              2.88                   0.93
       canto recto         2.83              8.19                   3.06
       t (cruz)            2.83              8.30                   3.19

     A quadrática cega ganha nas curvas e ARREDONDA OS CANTOS — 8,19 px
     de erro num ângulo recto contra 2,83 da poligonal. Por isso o ponto
     onde a direcção vira mais de CANTO_GRAUS fica vértice agudo, e só o
     resto é suavizado: ganha-se nas curvas sem perder os cantos.

     O ângulo é medido no espaço do próprio caminho (0..1000), não em
     píxeis de ecrã: assim o mesmo traço desenha-se igual em qualquer
     viewport, em vez de mudar de forma conforme a largura da janela. */
  var CANTO_COS = Math.cos(50 * Math.PI / 180);   // vira >50°: é canto

  function ehCanto(a, b, c) {
    var ux = b[0] - a[0], uy = b[1] - a[1];
    var vx = c[0] - b[0], vy = c[1] - b[1];
    var lu = Math.sqrt(ux * ux + uy * uy), lv = Math.sqrt(vx * vx + vy * vy);
    if (lu < 1e-9 || lv < 1e-9) return false;
    return ((ux * vx + uy * vy) / (lu * lv)) < CANTO_COS;
  }

  function n1000(v) { return (v * 1000).toFixed(1); }

  function dDe(pts) {
    if (!pts || !pts.length) return '';
    var d = 'M' + n1000(pts[0][0]) + ' ' + n1000(pts[0][1]);
    if (pts.length === 1) return d;
    if (pts.length === 2) return d + 'L' + n1000(pts[1][0]) + ' ' + n1000(pts[1][1]);

    for (var i = 1; i < pts.length - 1; i++) {
      if (ehCanto(pts[i - 1], pts[i], pts[i + 1])) {
        d += 'L' + n1000(pts[i][0]) + ' ' + n1000(pts[i][1]);
      } else {
        var mx = (pts[i][0] + pts[i + 1][0]) / 2;
        var my = (pts[i][1] + pts[i + 1][1]) / 2;
        d += 'Q' + n1000(pts[i][0]) + ' ' + n1000(pts[i][1]) +
             ' '  + n1000(mx)       + ' ' + n1000(my);
      }
    }
    var u = pts[pts.length - 1];
    return d + 'L' + n1000(u[0]) + ' ' + n1000(u[1]);
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

  /* O browser liberta a captura sozinho no pointerup/pointercancel, mas
     libertá-la explicitamente deixa o estado limpo mesmo nos caminhos que
     não vêm de um evento (o blur da janela chama onCancel() sem `e`). */
  function libertar(el, pid) {
    if (!el || pid == null) return;
    try {
      if (el.hasPointerCapture && el.hasPointerCapture(pid) && el.releasePointerCapture) {
        el.releasePointerCapture(pid);
      }
    } catch (err) {}
  }

  function ehPonteiroDeDesenho(e) {
    /* PEN desenha sempre. MOUSE desenha (desktop). TOUCH nunca cria tinta
       — é assim que a palma fica de fora e que o dedo continua a ser
       navegação. O que mudou foi outra coisa: com a caneta armada, a área
       da matéria deixa de oferecer PAN ao browser (ver «modo de escrita»
       no CSS). O dedo continua a não desenhar; apenas também já não rola
       enquanto a ferramenta está armada, porque o aluno pôs a página em
       modo de escrita de propósito. Ao desarmar, rola outra vez. */
    return e.pointerType === 'pen' || e.pointerType === 'mouse';
  }

  function onDown(e) {
    if (st.tool !== 'pen' && st.tool !== 'eraser') return;
    if (lbAberto()) return;                             // zoom aberto: caneta suspensa
    if (e.target && e.target.closest && e.target.closest('.rm2-box,.rm2-notes,.rm-tools,.rm-lb,.rm-menu,.rm-sug-fab,#rm-sug')) return;
    if (gestoMorto()) abortarTraco();                   // traço órfão não bloqueia o seguinte
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
    libertar(t.sec, t.pid);
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
    pushUndo({ tipo: 'ink-add', slug: slug, rec: t.rec, id: t.rec.id });
    filaGravar(slug, t.rec, t.path);
  }

  /* Com o touch-action correcto, o scroll deixa de cancelar o ponteiro a
     meio de uma letra. Mas o cancelamento LEGÍTIMO continua a existir — a
     caneta sai do alcance do digitalizador, o SO interrompe, troca-se de
     aplicação — e nesses casos o traço em curso não deve ser gravado meio
     feito. Continua defensivo, de propósito: o objectivo foi eliminar o
     cancelamento INDEVIDO, não disfarçar o verdadeiro. */
  function onCancel(e) {
    if (apagando) { terminarApagar(); return; }
    if (!traco || (e && e.pointerId !== traco.pid)) return;
    abortarTraco();
  }

  /* Deitar fora o traço em curso. Ponto ÚNICO: tudo o que interrompe um
     gesto passa por aqui, para não haver um caminho que se esqueça de
     limpar uma das três coisas (o registo, a captura e a classe). */
  function abortarTraco() {
    if (!traco) return;
    var t = traco; traco = null;
    libertar(t.sec, t.pid);
    if (t.path && t.path.parentNode) t.path.parentNode.removeChild(t.path);
    document.body.classList.remove('rm2-drawing');
  }

  /* ------------------------------------------------------------------
     RECONCILIAÇÃO · o que fazia a caneta «travar»

     O `traco` sobrevivia a tudo o que não fosse um pointerup ou um
     pointercancel com o id certo. Trocar de matéria, rodar o tablet ou
     mudar de aplicação a meio de uma letra deixava-o aberto para sempre,
     e o onDown tem uma guarda de rejeição de palma — `if (traco) return`
     — que a partir daí recusava TODOS os traços seguintes: a caneta
     ficava morta, e como o modo de escrita continuava ligado a página
     também não rolava. Era esse o travamento.

     Medido na main antes desta correcção, interrompendo a meio do traço:

       mudança de aplicação ....... não voltava a desenhar
       troca de matéria ........... não voltava a desenhar
       resize / rotação ........... não voltava a desenhar
       blur da janela ............. recuperava (já tinha gancho)
       pointercancel .............. recuperava (já era tratado)

     Agora todos desembocam no mesmo sítio. */
  function reconciliarGesto() {
    if (apagando) terminarApagar();
    abortarTraco();
  }

  /* Um traço cuja secção já saiu do documento é lixo: a matéria foi
     trocada ou reinjectada por baixo dele. Serve de rede para qualquer
     caminho futuro que se esqueça de chamar a reconciliação. */
  function gestoMorto() {
    if (!traco) return false;
    return !traco.sec || !document.contains(traco.sec);
  }

  /* ---- persistência: uma gravação por traço, nunca por ponto -------- */
  /* Gravar um traço é assíncrono, e o aluno pode desfazer ou apagar antes de
     o INSERT responder. Se nada segurasse essa corrida, o apagar não teria o
     que apagar —o id ainda era «tmp-»— e o traço voltava no reload seguinte.
     Marca-se o registo como cancelado e, quando a resposta chega, apaga-se
     imediatamente a linha que acabou de nascer. */
  async function filaGravar(slug, rec, pathEl) {
    var s = sb(), uid = st.uid;
    if (!s || !uid) { toast('Dibujado (sin sincronizar)', true); return; }
    if (rec.cancelado) return;                 // cancelado antes sequer de partir
    rec.gravando = true;
    try {
      var r = await s.from('user_ink_strokes').insert({
        user_id: uid, subject_slug: slug, anchor_id: rec.anchor_id,
        color: rec.color, width: rec.width, points: rec.points
      }).select('id').single();
      if (r.error) throw r.error;
      var antigo = rec.id;
      rec.id = r.data.id;

      if (rec.cancelado) {                     // desfeito/apagado enquanto gravava
        rec.gravando = false;
        remover(rec.id);
        try { await s.from('user_ink_strokes').delete().eq('user_id', uid).eq('id', rec.id); }
        catch (e2) { console.warn('[rm2] ink compensating delete', e2 && e2.message); }
        return;
      }

      if (pathEl) pathEl.setAttribute('data-ink', rec.id);
      remapear(antigo, rec.id);
    } catch (e) {
      console.warn('[rm2] ink insert', e && e.message);
      toast('No se pudo guardar el trazo.', true);
    } finally {
      rec.gravando = false;
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
      try { sec.setPointerCapture && sec.setPointerCapture(e.pointerId); apagando.sec = sec; } catch (err) {}
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
      apagarNoBanco(rec);
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
    libertar(a.sec, a.pid);
    var n = a.inks.length + a.hls.length;
    if (!n) return;
    /* um gesto = um undo, mesmo que tenha apanhado vários traços e marcas */
    pushUndo({ tipo: 'del', slug: a.slug, inks: a.inks, hls: a.hls });
    toast(n === 1 ? 'Borrado ✓' : n + ' elementos borrados ✓');
  }

  /* Recebe o REGISTO, não só o id: é a única forma de marcar o cancelamento
     de um INSERT que ainda está no ar. */
  async function apagarNoBanco(rec) {
    if (!rec) return;
    if (typeof rec !== 'object') rec = { id: rec };     // compatibilidade
    rec.cancelado = true;
    var id = rec.id;
    if (String(id).indexOf('tmp-') === 0) return;       // o filaGravar compensa
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
      var alvo = op.rec || null;
      for (var i = lista.length - 1; i >= 0; i--) {
        if (lista[i] === alvo || String(lista[i].id) === String(op.id)) {
          alvo = lista[i]; lista.splice(i, 1); break;
        }
      }
      remover(alvo ? alvo.id : op.id);
      apagarNoBanco(alvo || op.id);
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
      anchor_id: rec.anchor_id, color: rec.color, width: rec.width, points: rec.points,
      cancelado: false
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

  /* ------------------------------------------------------------------
     ÍCONES — SVG inline, próprios, com um pouco de profundidade.
     Nada de biblioteca, nada de PNG: seis gradientes curtos e paths
     simples, ~4 kB no total. Cada um tem os seus ids de gradiente para
     dois ícones nunca se pisarem na mesma página.
     A linguagem é a do caderno do Repasso Med: azul-marinho da marca,
     dourado nos detalhes, e a cor da própria ferramenta no que interessa.
     ------------------------------------------------------------------ */
  function ico(corpo) {
    return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' + corpo + '</svg>';
  }
  function grad(id, a, b, vert) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vert ? '0' : '1') +
      '" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>';
  }

  var I = {
    /* estojo de ferramentas fechado, com uma caneta a espreitar */
    tools:
      '<defs>' + grad('rm2gA', '#2d5b86', '#0b2138') + grad('rm2gB', '#f0c24e', '#cf9b1d') + '</defs>' +
      '<path d="M5 12.5h22a2.5 2.5 0 0 1 2.5 2.5v9A3.5 3.5 0 0 1 26 27.5H6A3.5 3.5 0 0 1 2.5 24v-9A2.5 2.5 0 0 1 5 12.5Z" fill="url(#rm2gA)"/>' +
      '<path d="M11 12.5V10a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2.5" fill="none" stroke="#2d5b86" stroke-width="2.4" stroke-linecap="round"/>' +
      '<rect x="2.5" y="17" width="27" height="4.4" rx="1.4" fill="url(#rm2gB)"/>' +
      '<rect x="13.6" y="15.6" width="4.8" height="7.2" rx="1.6" fill="#f7f9fc"/>' +
      '<path d="M2.5 15.2h27" stroke="#ffffff" stroke-opacity=".18" stroke-width="1.2"/>',

    /* marca-texto: corpo azul-marinho, ponta chanfrada amarela e o risco */
    mark:
      '<defs>' + grad('rm2mA', '#2d5b86', '#10243D') + grad('rm2mB', '#ffe066', '#f0b90b') + '</defs>' +
      '<path d="M20.4 3.6a3.1 3.1 0 0 1 4.4 0l3.6 3.6a3.1 3.1 0 0 1 0 4.4l-8.5 8.5-8-8Z" fill="url(#rm2mA)"/>' +
      '<path d="M11.9 12.1l8 8-3.6 3.6-1.9.5-4.5-4.5.4-2Z" fill="url(#rm2mB)"/>' +
      '<path d="M9.9 19.7l4.5 4.5-2.2 2.2H6.4l-1.2-1.2Z" fill="#fff3bf"/>' +
      '<rect x="4" y="27.3" width="24" height="3" rx="1.5" fill="url(#rm2mB)" opacity=".85"/>' +
      '<path d="M21.6 5.4l5.3 5.3" stroke="#ffffff" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round"/>',

    /* caneta premium: corpo azul, anel dourado, bico escuro */
    pen:
      '<defs>' + grad('rm2pA', '#4f8ee6', '#153f7a') + grad('rm2pB', '#f0c24e', '#cf9b1d') + '</defs>' +
      '<path d="M22.2 2.6a3.2 3.2 0 0 1 4.5 0l2.7 2.7a3.2 3.2 0 0 1 0 4.5L13.6 25.6l-7.2-7.2Z" fill="url(#rm2pA)"/>' +
      '<path d="M18.6 6.2l7.2 7.2-2.3 2.3-7.2-7.2Z" fill="url(#rm2pB)"/>' +
      '<path d="M6.4 18.4l7.2 7.2-4.4 2.3-5.5 1.4 1.4-5.5Z" fill="#e9eff7"/>' +
      '<path d="M3.7 29.3l1.4-5.5 4.1 4.1Z" fill="#10243D"/>' +
      '<path d="M24.1 4.4l3.6 3.6" stroke="#ffffff" stroke-opacity=".35" stroke-width="1.8" stroke-linecap="round"/>',

    /* borracha: bloco rosa com face lateral mais escura e banda branca */
    erase:
      '<defs>' + grad('rm2eA', '#ffa8bf', '#e9607f') + grad('rm2eB', '#d64a6b', '#a92f4c') + '</defs>' +
      '<path d="M13.2 4.1a3.4 3.4 0 0 1 4.8 0l9.9 9.9a3.4 3.4 0 0 1 0 4.8l-6 6H11l-7.9-7.9a3.4 3.4 0 0 1 0-4.8Z" fill="url(#rm2eA)"/>' +
      '<path d="M11 24.8h10.9l-2.1 2.1H12.9Z" fill="url(#rm2eB)"/>' +
      '<path d="M8.6 8.7l12.2 12.2-3.3 3.3H12L5.3 17.5Z" fill="#ffffff" opacity=".42"/>' +
      '<rect x="3.4" y="27.4" width="25.2" height="2.9" rx="1.45" fill="#10243D" opacity=".16"/>',

    /* desfazer: seta azul curva, com ponta cheia */
    undo:
      '<defs>' + grad('rm2uA', '#5a9bea', '#1d5bb5', true) + '</defs>' +
      '<path d="M8.6 13.8h9.8a7.4 7.4 0 0 1 0 14.8h-3.6" fill="none" stroke="url(#rm2uA)" stroke-width="3.6" stroke-linecap="round"/>' +
      '<path d="M11.4 5.8 4.2 13l7.2 7.2Z" fill="url(#rm2uA)"/>' +
      '<path d="M9.6 9.1 6.6 12.1l3 3Z" fill="#ffffff" opacity=".28"/>',

    /* anotações: post-it amarelo com canto dobrado e duas linhas */
    note:
      '<defs>' + grad('rm2nA', '#ffe999', '#f4c534') + grad('rm2nB', '#e0ab1f', '#b5831a') + '</defs>' +
      '<path d="M5.2 3.4h16.2l6.2 6.2v16.4a2.6 2.6 0 0 1-2.6 2.6H5.2a2.6 2.6 0 0 1-2.6-2.6V6a2.6 2.6 0 0 1 2.6-2.6Z" fill="url(#rm2nA)"/>' +
      '<path d="M21.4 3.4 27.6 9.6h-4.5a1.7 1.7 0 0 1-1.7-1.7Z" fill="url(#rm2nB)"/>' +
      '<rect x="7.2" y="13.4" width="14" height="2.5" rx="1.25" fill="#10243D" opacity=".62"/>' +
      '<rect x="7.2" y="19" width="10" height="2.5" rx="1.25" fill="#10243D" opacity=".45"/>' +
      '<rect x="3.6" y="6.6" width="1.8" height="18" rx=".9" fill="#ffffff" opacity=".4"/>'
  };

  /* Trilho vertical. Sem rótulos permanentes: o nome vive no title e no
     aria-label, e a coluna fica com 58 px de ponta a ponta. */
  function montar() {
    if (box && box.isConnected) return;
    box = document.createElement('div');
    box.className = 'rm2-box';

    function botao(attr, icone, titulo, rotulo, pressed) {
      return '<button type="button" class="rm2-btn" ' + attr +
        (pressed ? ' aria-pressed="false"' : '') +
        ' title="' + titulo + '" aria-label="' + rotulo + '">' + ico(icone) + '</button>';
    }

    box.innerHTML =
      '<div class="rm2-panel" id="rm2-panel" role="group" aria-label="Herramientas de estudio">' +
        botao('data-t="highlight"', I.mark, 'Marcador de texto', 'Marcador de texto', true) +
        '<div class="rm2-sub" data-sub="highlight" role="radiogroup" aria-label="Color del marcador">' +
          HL_CORES.map(function (c) {
            return '<button type="button" class="rm2-sw rm2-sw-' + c + '" data-hc="' + c + '" role="radio" ' +
              'aria-checked="false" title="' + nomeCor(c) + '" aria-label="Marcador ' + nomeCor(c) + '"></button>';
          }).join('') +
        '</div>' +

        botao('data-t="pen"', I.pen, 'Lápiz', 'Lápiz para escribir a mano', true) +
        '<div class="rm2-sub" data-sub="pen">' +
          '<div class="rm2-sub on" role="radiogroup" aria-label="Color del lápiz" style="padding:0">' +
            '<button type="button" class="rm2-sw rm2-sw-black" data-pc="black" role="radio" aria-checked="false" title="Negro" aria-label="Lápiz negro"></button>' +
            '<button type="button" class="rm2-sw rm2-sw-pblue" data-pc="blue"  role="radio" aria-checked="false" title="Azul"  aria-label="Lápiz azul"></button>' +
            '<button type="button" class="rm2-sw rm2-sw-pred"  data-pc="red"   role="radio" aria-checked="false" title="Rojo"  aria-label="Lápiz rojo"></button>' +
          '</div>' +
          '<div class="rm2-sub on" role="radiogroup" aria-label="Grosor del lápiz" style="padding:4px 0 0">' +
            '<button type="button" class="rm2-w rm2-w-thin"   data-pw="thin"   role="radio" aria-checked="false" title="Fino"   aria-label="Trazo fino"><i></i></button>' +
            '<button type="button" class="rm2-w rm2-w-medium" data-pw="medium" role="radio" aria-checked="false" title="Medio"  aria-label="Trazo medio"><i></i></button>' +
            '<button type="button" class="rm2-w rm2-w-thick"  data-pw="thick"  role="radio" aria-checked="false" title="Grueso" aria-label="Trazo grueso"><i></i></button>' +
          '</div>' +
        '</div>' +

        botao('data-t="eraser"', I.erase, 'Goma de borrar', 'Goma: borrar marcas y trazos', true) +
        '<div class="rm2-sep"></div>' +
        botao('data-a="undo"', I.undo, 'Deshacer', 'Deshacer la última acción', false) +
        botao('data-a="notes"', I.note, 'Mis apuntes', 'Abrir mis apuntes', false) +
      '</div>' +
      '<button type="button" class="rm2-fab" id="rm2-fab" aria-expanded="false" aria-controls="rm2-panel" ' +
        'title="Herramientas de estudio" aria-label="Herramientas de estudio">' + ico(I.tools) + '</button>';

    document.body.appendChild(box);

    /* ------------------------------------------------------------------
       O FAB é a saída do modo de escrita.

       Com a caneta armada, o modo de escrita tira o pan à área de leitura.
       Se o painel pudesse fechar nesse estado, ficava uma página que não
       rola e cujo botão de sair está escondido — só o FAB à vista, sem
       nada que diga que é ele que desarma. Era a queixa de «não consigo
       desativar para voltar a rolar».

       Por isso, com uma ferramenta armada o FAB DESARMA em vez de fechar;
       sem ferramenta armada, abre e fecha o painel como sempre fez. */
    box.querySelector('#rm2-fab').addEventListener('click', function () {
      if (st.tool !== 'none') { escolherFerramenta('none'); return; }
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
    /* INVARIANTE: nunca há modo de escrita sem saída à vista. Enquanto uma
       ferramenta estiver armada o painel fica aberto, portanto o botão que
       a desarma está sempre no ecrã. Qualquer caminho que tente fechar o
       painel com a ferramenta armada é corrigido aqui, e não só no FAB. */
    if (st.tool !== 'none') st.open = true;
    box.classList.toggle('open', st.open);
    var fab = box.querySelector('#rm2-fab');
    fab.setAttribute('aria-expanded', String(st.open));
    fab.classList.toggle('armed', st.tool !== 'none');
    /* o rótulo diz o que o botão faz AGORA, que é o que um leitor de ecrã
       anuncia e o que aparece no tooltip de quem usa rato */
    var armado = st.tool !== 'none';
    fab.setAttribute('title', armado ? 'Salir del modo escritura' : 'Herramientas de estudio');
    fab.setAttribute('aria-label', armado ? 'Salir del modo escritura' : 'Herramientas de estudio');

    box.querySelectorAll('.rm2-btn[data-t]').forEach(function (b) {
      var on = b.getAttribute('data-t') === st.tool;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    /* só os sub-painéis de topo abrem e fecham; os de dentro (cores e
       grossuras do lápis) ficam sempre abertos dentro do seu pai */
    box.querySelectorAll('.rm2-sub[data-sub]').forEach(function (s) {
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
  var pendentes = {};      // id -> timer do debounce
  var flushers = {};       // id -> gravar já, com o que está no campo

  function cancelarFlush(n) {
    if (pendentes[n.id]) { clearTimeout(pendentes[n.id]); delete pendentes[n.id]; }
  }

  /* Chamado no blur, na troca de matéria e ao sair da página. */
  function flushNotas() {
    Object.keys(flushers).forEach(function (id) {
      if (pendentes[id]) { clearTimeout(pendentes[id]); delete pendentes[id]; }
      try { flushers[id](); } catch (e) {}
    });
  }

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
    flushNotas();
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
    flushNotas();
    flushers = {};
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
      /* Escrever chama o debounce; sair do campo, trocar de matéria ou fechar
         a página chamam o flush imediato. O blur estava a passar pelo mesmo
         debounce de 700 ms, e era aí que se perdiam as últimas letras. */
      var agora = function () {
        cancelarFlush(n);
        salvarNota(n, el.querySelector('input').value, el.querySelector('textarea').value);
      };
      var gravar = function () {
        cancelarFlush(n);
        pendentes[n.id] = setTimeout(function () { delete pendentes[n.id]; agora(); }, 700);
        flushers[n.id] = agora;
      };
      flushers[n.id] = agora;
      el.querySelector('input').addEventListener('input', gravar);
      el.querySelector('textarea').addEventListener('input', gravar);
      el.querySelector('input').addEventListener('blur', agora);
      el.querySelector('textarea').addEventListener('blur', agora);
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
    window.addEventListener('blur', function () { reconciliarGesto(); });

    /* O browser tira a captura quando o elemento sai do documento ou o
       dispositivo desaparece, e nesses casos NÃO há pointerup nenhum. */
    document.addEventListener('lostpointercapture', function (e) {
      if (traco && e.pointerId === traco.pid) abortarTraco();
      else if (apagando && e.pointerId === apagando.pid) terminarApagar();
    }, true);

    /* Mudar de aplicação no tablet: a letra em curso não se fecha sozinha. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) reconciliarGesto();
    });

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

    /* Sair da página é o caso em que mais se perde texto: pagehide dispara
       mesmo quando o separador vai para a bfcache, e visibilitychange apanha
       o mudar de app no telemóvel. */
    window.addEventListener('pagehide', flushNotas);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) flushNotas();
    });

    /* A caixa da âncora é medida no início do traço. Se o viewport muda a
       meio, essa medida deixa de valer: o traço continuaria a ser escrito
       com coordenadas de uma caixa que já não existe. Fecha-se o gesto
       antes de reposicionar — e, sobretudo, deixa de ficar preso. */
    var reflow = debounce(reposicionarTudo, 120);
    window.addEventListener('resize', function () { reconciliarGesto(); reflow(); });
    window.addEventListener('orientationchange', function () {
      reconciliarGesto(); setTimeout(reposicionarTudo, 220);
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) reflow(); });
  }

  /* ================================================================== */
  /* 14 · ARRANQUE                                                       */
  /* ================================================================== */

  var montado = false;      // a V2 já está de pé: nunca montar segunda vez
  var aTentar = false;      // já há uma tentativa em voo: não correr duas em paralelo
  var semAcesso = {};       // uid -> true: já se perguntou e a resposta foi não


  /* `uidDaSessao` vem do evento de auth, quando existe. É preferível ao
     RMTools.userId(), que guarda o valor em cache: depois de um logout
     seguido de login na MESMA página, a cache podia devolver o uid antigo. */
  async function iniciar(uidDaSessao) {
    if (montado || aTentar) return;
    var t = RT();
    if (!t || !t.userId || !t.onAbaPronta) return;       // rm-tools antigo: não faz nada
    aTentar = true;
    try {
      var uid = uidDaSessao || await t.userId();
      if (!uid) return;                                  // ainda sem sessão: espera-se o evento de auth
      if (semAcesso[uid]) return;                        // já se perguntou por este uid: não repetir
      var ok = await hasStudyToolsV2Access(uid);
      if (!ok) { semAcesso[uid] = true; return; }        // ← quem não é tester sai aqui, uma vez só
      if (montado) return;                               // outra tentativa chegou primeiro
      montado = true;
      await montarTudo(t, uid);
    } finally {
      aTentar = false;
    }
  }

  async function montarTudo(t, uid) {
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
        reconciliarGesto();                 // a matéria sai debaixo do traço
        var r = sw.apply(this, arguments);
        flushNotas();                       // antes de trocar, grava o que falta
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
      flushNotas: flushNotas,
      reposicionar: reposicionarTudo,
      simplificar: simplificar,
      dDe: dDe,
      hasAccess: hasStudyToolsV2Access
    };
  }

  /* ------------------------------------------------------------------
     ARRANQUE · porque não basta o DOMContentLoaded

     No index.html o cliente Supabase nasce DEPOIS deste ficheiro, e o
     login acontece DENTRO da página: o `authLogin()` chama `afterLogin()`
     e nunca recarrega. Quem abre o site deslogado — que é o caso de uma
     janela anónima, de uma cache limpa ou de um hard refresh — passava
     por aqui com a sessão ainda por nascer, saía com uid nulo, e não
     havia segunda oportunidade: a toolbox nunca aparecia.

     A correcção é ouvir o estado de autenticação que o site já tem, em
     vez de adivinhar o momento certo. Uma tentativa imediata (cobre quem
     recarrega já com sessão válida) e uma subscrição a onAuthStateChange
     (cobre quem entra depois). `montado` garante que só monta uma vez.
     ------------------------------------------------------------------ */
  var subscrito = false;

  function tentar(uid) {
    iniciar(uid).catch(function (e) { console.warn('[rm2]', e); });
  }

  function ouvirAuth() {
    if (subscrito) return true;
    var s = sb();
    if (!s || !s.auth || typeof s.auth.onAuthStateChange !== 'function') return false;
    try {
      s.auth.onAuthStateChange(function (evt, sessao) {
        var uid = sessao && sessao.user && sessao.user.id;
        if (evt === 'SIGNED_OUT') return;   // o site recarrega no logout; nada a desmontar
        if (uid) tentar(uid);
      });
      subscrito = true;
      return true;
    } catch (e) {
      console.warn('[rm2] auth listener', e && e.message);
      return false;
    }
  }

  /* O cliente Supabase é criado depois deste script. Espera-se por ele um
     tempo limitado — nunca um polling sem fim: ao fim de ~6 s desiste-se e
     fica tudo exactamente como o site era antes da V2. */
  var TENTATIVAS = 40, INTERVALO = 150;

  function arrancar() {
    tentar();                       // já pode haver sessão restaurada
    if (ouvirAuth()) return;
    var n = 0;
    var timer = setInterval(function () {
      n++;
      if (ouvirAuth() || montado || n >= TENTATIVAS) clearInterval(timer);
    }, INTERVALO);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
