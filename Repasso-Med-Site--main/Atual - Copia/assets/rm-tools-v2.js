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
  /* 2b · DIAGNÓSTICO — SÓ BETA, SÓ EM MEMÓRIA                           */
  /* ================================================================== */

  /* Os testes sintéticos (CDP) não reproduziram a falha física relatada
     no tablet. Isto é a rede que falta: um anel de ~100 eventos, só na
     memória do separador, NUNCA enviado ao servidor. Serve para o tester
     copiar o estado se o bug físico voltar a acontecer — nada mais.

     Deliberadamente NÃO regista: texto da matéria, conteúdo de notas,
     e-mail, tokens ou qualquer dado pessoal. Só metadados do gesto. Os
     `pointermove` de um traço não entram aqui — a um por movimento, o
     anel encheria-se num único traço e perderia-se o antes/depois que
     interessa; só o que muda de estado é que fica registado. */
  var DIAG_MAX = 100;
  var diag = [];

  function diagAlvo(el) {
    if (!el || el.nodeType !== 1) return '';
    var tag = (el.tagName || '').toLowerCase();
    var cls = (typeof el.className === 'string' && el.className) ?
      '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return tag + cls;
  }

  function diagTemCaptura(e) {
    try {
      return !!(e && e.target && e.target.hasPointerCapture && e.pointerId != null &&
        e.target.hasPointerCapture(e.pointerId));
    } catch (err) { return false; }
  }

  /* `extra` traz metadados específicos do roteador de touch/palma (§22 do
     encargo): classificação, motivo resumido, largura/altura do contacto,
     pontos acumulados. Nunca conteúdo da matéria, texto, notas, e-mail ou
     token — só números e palavras-chave curtas sobre o próprio gesto. */
  function diagLog(tipo, e, extra) {
    try {
      var w = e && (e.width != null ? e.width : (e.radiusX != null ? e.radiusX * 2 : null));
      var h = e && (e.height != null ? e.height : (e.radiusY != null ? e.radiusY * 2 : null));
      var entrada = {
        t: Date.now(), tipo: tipo,
        pointerType: e ? e.pointerType : null,
        pointerId: e ? e.pointerId : null,
        buttons: e ? e.buttons : null,
        tool: st.tool,
        traco: !!traco, apagando: !!apagando,
        captura: diagTemCaptura(e),
        alvo: e ? diagAlvo(e.target) : '',
        penActive: penState.active,
        penLastX: Math.round(penState.lastX || 0),
        penLastY: Math.round(penState.lastY || 0),
        rafPending: !!(traco && traco.rafPending),
        touchW: w != null ? Math.round(w) : null,
        touchH: h != null ? Math.round(h) : null
      };
      if (extra) { for (var k in extra) if (extra.hasOwnProperty(k)) entrada[k] = extra[k]; }
      diag.push(entrada);
      if (diag.length > DIAG_MAX) diag.shift();
    } catch (err) { /* diagnóstico nunca pode ser causa de erro novo */ }
  }

  /* window.RMToolsV2.debug() — só isto, nada de painel permanente. Devolve
     a cópia (para o tester copiar/colar) e também imprime uma tabela. */
  function debug() {
    var copia = diag.slice();
    try { if (console.table) console.table(copia); else console.log(copia); }
    catch (err) { console.log(copia); }
    return copia;
  }

  /* ================================================================== */
  /* 2c · PAINEL DE DIAGNÓSTICO VISUAL — SÓ BETA, SÓ EM MEMÓRIA          */
  /* ================================================================== */

  /* O teste físico no tablet contrariou os testes sintéticos: com o lápiz
     armado, o traço vertical rola a página em vez de escrever. Nenhum
     ambiente aqui reproduz esse hardware, por isso a peça que falta não é
     mais uma heurística — é MEDIÇÃO no aparelho real, sem DevTools.

     Este painel mostra, em tempo real, o que o browser diz de cada
     ponteiro. Deliberadamente NÃO regista: texto da matéria, conteúdo de
     notas, e-mail, tokens, identificadores de sessão nem qualquer dado
     pessoal — só metadados do gesto. Nada é enviado para servidor nenhum,
     nada vai para localStorage: vive no separador e morre com ele.

     A pergunta que ele existe para responder é uma só: a stylus chega
     como pointerType "pen" ou como "touch"? Tudo o resto no ecrã serve
     para confirmar a resposta sem ter de acreditar em ninguém. */

  var DIAGV_MAX = 30;                 /* linhas guardadas no anel */
  var diagV = [];
  var diagVSeq = 0;
  var diagVT0 = 0;
  var diagVCaixa = null;
  var diagVRaf = 0;
  var diagVBaseY = {};                /* pointerId -> scrollY no pointerdown */

  function diagAberto() { return !!(diagVCaixa && diagVCaixa.isConnected); }

  function dEsc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function dNum(v, casas) {
    if (v == null || v !== v) return '–';
    var m = Math.pow(10, casas == null ? 0 : casas);
    return String(Math.round(v * m) / m);
  }

  /* O touch-action EFECTIVO da área de leitura, tal como o compositor o vê
     neste instante. É o valor que decide se o gesto pode virar scroll. */
  function diagTouchAction() {
    try {
      var el = document.getElementById('materias-container');
      if (!el) return '(sem #materias-container)';
      var cs = getComputedStyle(el);
      return cs.touchAction || cs.getPropertyValue('touch-action') || '(vazio)';
    } catch (e) { return '(erro)'; }
  }

  function diagClasses() {
    var b = document.body, r = [];
    if (b.classList.contains('rm2-t-pen')) r.push('rm2-t-pen');
    if (b.classList.contains('rm2-pen-down')) r.push('rm2-pen-down');
    if (b.classList.contains('rm2-drawing')) r.push('rm2-drawing');
    return r.length ? r.join(' ') : '(nenhuma)';
  }

  /* defaultPrevented só é verdade DEPOIS de todos os handlers correrem. Um
     listener em captura lê-o sempre a false, o que seria uma mentira no
     painel. Guarda-se a referência do evento e lê-se quando o dispatch já
     acabou: ao chegar o evento seguinte, ou no rAF do render. */
  function diagVResolver() {
    var l = diagV[diagV.length - 1];
    if (!l || !l._e) return;
    try {
      var dp = !!l._e.defaultPrevented;
      l.dpLast = dp;
      if (dp) l.dpN = (l.dpN || 0) + 1;
    } catch (e) {}
    l._e = null;
  }

  /* Uma linha por evento — excepto os pointermove consecutivos do mesmo
     ponteiro, que se juntam numa linha com contador. Sem esse agrupamento
     um único traço enchia as 30 linhas de movimentos e apagava o
     pointerdown, que é precisamente o que interessa ver. Os valores
     mostrados num agregado são os ÚLTIMOS; o contador diz quantos foram. */
  function diagVReg(e) {
    if (!diagAberto()) return;
    try {
      diagVResolver();
      var agora = Date.now();
      if (!diagVT0) diagVT0 = agora;

      if (e.type === 'pointerdown') diagVBaseY[e.pointerId] = window.pageYOffset;

      var topo = diagV[diagV.length - 1];
      var junta = !!(topo && e.type === 'pointermove' && topo.tipo === 'pointermove' &&
                     topo.pid === e.pointerId && topo.ptype === e.pointerType);
      var l = junta ? topo : { n: ++diagVSeq, tipo: e.type, pid: e.pointerId,
                               ptype: e.pointerType, nEv: 0, dpN: 0 };

      l.t = agora - diagVT0;
      l.nEv++;
      l.prim = !!e.isPrimary;
      l.buttons = e.buttons;
      l.button = e.button;
      l.pres = e.pressure;
      l.w = e.width; l.h = e.height;
      l.tiltX = e.tiltX; l.tiltY = e.tiltY;
      l.x = Math.round(e.clientX); l.y = Math.round(e.clientY);
      l.sY = Math.round(window.pageYOffset);
      var base = diagVBaseY[e.pointerId];
      l.dY = (base == null) ? null : Math.round(window.pageYOffset - base);
      l.canc = !!e.cancelable;
      l.tool = st.tool;
      l.traco = !!traco;
      l.open = !!st.open;
      l.ta = diagTouchAction();
      l.cls = diagClasses();
      l._e = e;

      if (!junta) {
        diagV.push(l);
        if (diagV.length > DIAGV_MAX) diagV.shift();
      }
      if (e.type === 'pointerup' || e.type === 'pointercancel') delete diagVBaseY[e.pointerId];
      diagVPedirRender();
    } catch (err) { /* o diagnóstico nunca pode ser causa de erro novo */ }
  }

  function diagVPedirRender() {
    if (diagVRaf || !diagAberto()) return;
    diagVRaf = requestAnimationFrame(function () { diagVRaf = 0; diagVRender(); });
  }

  function diagVLinha(l) {
    var dp = l.dpN ? ('SIM(' + l.dpN + ')') : 'NÃO';
    return '<div class="rm2-diag-r' + (l.ptype === 'pen' ? ' pen' : '') + '">' +
      '<b>#' + l.n + ' +' + l.t + 'ms · ' + dEsc(l.tipo) +
        (l.nEv > 1 ? (' ×' + l.nEv) : '') +
        ' · type=' + dEsc(l.ptype === '' ? '(vazio)' : (l.ptype == null ? '(null)' : l.ptype)) +
        ' id=' + dEsc(l.pid) + ' prim=' + (l.prim ? '1' : '0') + '</b>' +
      '<i>btns=' + dEsc(l.buttons) + ' btn=' + dEsc(l.button) +
        ' pres=' + dNum(l.pres, 3) +
        ' w×h=' + dNum(l.w, 1) + '×' + dNum(l.h, 1) +
        ' tilt=' + dNum(l.tiltX) + '/' + dNum(l.tiltY) +
        ' xy=' + dEsc(l.x) + ',' + dEsc(l.y) + '</i>' +
      '<i>scrollY=' + dEsc(l.sY) + ' Δ=' + (l.dY == null ? '–' : ((l.dY > 0 ? '+' : '') + l.dY)) +
        ' · prevented=' + dp + ' cancelable=' + (l.canc ? 'SIM' : 'NÃO') + '</i>' +
      '<i>tool=' + dEsc(l.tool) + ' traço=' + (l.traco ? 'SIM' : 'NÃO') +
        ' toolbox=' + (l.open ? 'aberta' : 'fechada') +
        ' · ta=' + dEsc(l.ta) + ' · ' + dEsc(l.cls) + '</i>' +
    '</div>';
  }

  function diagVRender() {
    if (!diagAberto()) return;
    diagVResolver();
    var corpo = diagVCaixa.querySelector('.rm2-diag-b');
    var resumo = diagVCaixa.querySelector('.rm2-diag-s');
    if (resumo) {
      resumo.innerHTML =
        '<span>tool=<b>' + dEsc(st.tool) + '</b></span>' +
        '<span>toolbox=<b>' + (st.open ? 'aberta' : 'fechada') + '</b></span>' +
        '<span>traço=<b>' + (traco ? 'SIM' : 'NÃO') + '</b></span>' +
        '<span>touch-action=<b>' + dEsc(diagTouchAction()) + '</b></span>' +
        '<span>body=<b>' + dEsc(diagClasses()) + '</b></span>' +
        '<span>scrollY=<b>' + Math.round(window.pageYOffset) + '</b></span>' +
        '<span>eventos=<b>' + diagVSeq + '</b></span>';
    }
    if (corpo) {
      if (!diagV.length) {
        corpo.innerHTML = '<div class="rm2-diag-v">Sin eventos todavía. Escribí en la materia.</div>';
      } else {
        var h = [];
        for (var i = diagV.length - 1; i >= 0; i--) h.push(diagVLinha(diagV[i]));
        corpo.innerHTML = h.join('');
      }
    }
  }

  function limparDiag() {
    diagV = []; diagVSeq = 0; diagVT0 = 0; diagVBaseY = {};
    diagVRender();
  }

  function abrirDiag() {
    if (diagAberto()) return;
    diagVCaixa = document.createElement('div');
    diagVCaixa.className = 'rm2-diag';
    diagVCaixa.setAttribute('role', 'region');
    diagVCaixa.setAttribute('aria-label', 'Diagnóstico del lápiz');
    diagVCaixa.innerHTML =
      '<div class="rm2-diag-h">' +
        '<b>Diagnóstico del lápiz</b>' +
        '<button type="button" data-d="clear">Limpiar</button>' +
        '<button type="button" data-d="close" aria-label="Cerrar">×</button>' +
      '</div>' +
      '<div class="rm2-diag-s"></div>' +
      '<div class="rm2-diag-b"></div>';
    diagVCaixa.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-d]'); if (!b) return;
      if (b.getAttribute('data-d') === 'clear') limparDiag(); else fecharDiag();
    });
    document.body.appendChild(diagVCaixa);
    diagVRender();
    refletir();
  }

  function fecharDiag() {
    if (diagVCaixa && diagVCaixa.parentNode) diagVCaixa.parentNode.removeChild(diagVCaixa);
    diagVCaixa = null;
    if (diagVRaf) { cancelAnimationFrame(diagVRaf); diagVRaf = 0; }
    refletir();
  }

  function alternarDiag() { if (diagAberto()) fecharDiag(); else abrirDiag(); }

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
   scroll e sem layout shift.

   O marcador ENTRA aqui desde que passou a ter gesto próprio também por
   dedo (arrastar uma vez sobre o texto marca, sem long-press): por um
   dedo, arrastar-para-marcar e arrastar-para-rolar são o MESMO gesto até
   ao primeiro movimento, e não há como o browser adivinhar qual antes de
   o pointerdown acontecer. Suspende-se o pan só enquanto o marcador está
   armado — mouse e trackpad não usam touch-action para rolar, por isso
   continuam a rolar normalmente o tempo todo — e ao desarmar o scroll por
   dedo volta imediatamente, sem página presa (mesmo princípio do FAB da
   caneta: nunca fica bloqueio sem saída — aqui a saída é qualquer troca
   de ferramenta, sempre ao alcance).

   A CANETA é a excepção a tudo isto, de propósito (Goodnotes-like): o
   dedo deve poder rolar a matéria com a caneta armada, sem precisar de a
   desarmar primeiro. 'pan-x pan-y pinch-zoom' (equivalente a
   'manipulation') devolve ao dedo o pan nos dois eixos e o pinch nativo,
   e mantém só a desactivação do double-tap-zoom. O que protege o TRAÇO da
   stylus deixa de ser o touch-action — que agora é o MESMO para dedo e
   caneta, porque touch-action não distingue pointerType — e passa a ser
   inteiramente o roteador de JS (ehPonteiroDeDesenho + a rejeição de
   palma, mais abaixo): pen preventDefault()+setPointerCapture() no
   próprio pointerdown, antes de o browser decidir iniciar um pan. Isto
   funciona porque, ao contrário do dedo, os motores testados não tratam
   'pen' como candidato a scroll rápido (fast-path) que ignora
   preventDefault() — ver §27 do encargo para o que fazer se algum
   browser/hardware não respeitar isto. */
body.rm2-t-pen #materias-container{
  touch-action:pan-x pan-y pinch-zoom;
  overscroll-behavior:contain;
}
/* ENQUANTO A STYLUS ESTÁ EM CONTACTO o pan sai de cena por completo.
   Medido nesta branch, antes disto: com a caneta a escrever, um contacto
   grande (width 68 px) e perto era correctamente classificado como palma
   — defaultPrevented ficava true no pointerdown E nos pointermove —
   e a página rolava 158 px na mesma. A razão não é o classificador: com
   'pan-x pan-y pinch-zoom' quem decide o pan é o compositor, ANTES de o
   JS correr, e um preventDefault() já não lho tira. Enquanto o JS for o
   único guarda, a palma rola a matéria por baixo da letra.
   Só durante o contacto real da caneta, portanto — não enquanto ela está
   apenas armada. Levantando a stylus, o dedo volta a rolar de imediato,
   que é o comportamento Goodnotes-like que esta PR quer. */
body.rm2-t-pen.rm2-pen-down #materias-container{
  touch-action:none;
}
body.rm2-t-eraser #materias-container,
body.rm2-t-highlight #materias-container{
  touch-action:none;
  overscroll-behavior:contain;
}

/* Defesa em profundidade contra selecção nativa durante lápis/goma.
   O user-select:none acima ficava só dentro de #materias-container; isto
   alarga-o à página inteira enquanto o modo de escrita está armado — se
   alguma coisa deixar passar um pointerdown sem anchorDe() reconhecer o
   alvo (fora da matéria, numa borda, num nó ainda não medido), o browser
   continua sem conseguir começar uma selecção em lado nenhum. Notas e
   campos de escrita legítimos ficam de fora de propósito: quem estiver a
   escrever um apunte continua a poder seleccionar o que já escreveu. */
body.rm2-t-pen, body.rm2-t-eraser{
  -webkit-user-select:none; user-select:none;
}
body.rm2-t-pen input, body.rm2-t-pen textarea, body.rm2-t-pen [contenteditable],
body.rm2-t-eraser input, body.rm2-t-eraser textarea, body.rm2-t-eraser [contenteditable],
body.rm2-t-pen .rm2-notes, body.rm2-t-eraser .rm2-notes{
  -webkit-user-select:text; user-select:text;
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

/* ---------- painel de diagnóstico (só beta, só memória) -------------- */
/* Fica no canto oposto ao trilho para não tapar a ferramenta que se está
   a diagnosticar, e com touch-action:auto para o painel poder ser rolado
   com o dedo mesmo quando a área de leitura estiver bloqueada. */
.rm2-diag{
  position:fixed; z-index:99992;
  left:max(8px, env(safe-area-inset-left));
  bottom:max(8px, env(safe-area-inset-bottom));
  width:min(430px, calc(100vw - 80px));
  max-height:min(52vh, 460px);
  display:flex; flex-direction:column;
  background:#0d1a2b; color:#e7f0fa;
  border:1px solid #22405f; border-radius:14px;
  box-shadow:0 14px 34px rgba(4,12,22,.42);
  font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  touch-action:auto; overscroll-behavior:contain;
}
.rm2-diag-h{
  display:flex; align-items:center; gap:8px;
  padding:8px 10px; border-bottom:1px solid #22405f; flex:0 0 auto;
}
.rm2-diag-h b{ font-size:12.5px; letter-spacing:.2px; flex:1 1 auto; }
.rm2-diag-h button{
  border:1px solid #2f5478; background:#16283f; color:#dbe8f6;
  border-radius:8px; padding:4px 9px; font:inherit; cursor:pointer;
}
.rm2-diag-h button:hover{ background:#1e3c5a; }
.rm2-diag-h button[data-d="close"]{ padding:2px 8px; font-size:15px; line-height:1.1; }
.rm2-diag-s{
  display:flex; flex-wrap:wrap; gap:4px 12px;
  padding:7px 10px; border-bottom:1px solid #22405f; flex:0 0 auto;
  color:#9fb8d2;
}
.rm2-diag-s b{ color:#ffd77a; font-weight:700; }
.rm2-diag-b{ overflow:auto; padding:4px 0 8px; flex:1 1 auto; -webkit-overflow-scrolling:touch; }
.rm2-diag-r{ padding:5px 10px; border-bottom:1px solid rgba(34,64,95,.55); }
.rm2-diag-r b{ display:block; color:#8fd3ff; font-weight:700; }
.rm2-diag-r.pen b{ color:#7dffa8; }
.rm2-diag-r i{ display:block; font-style:normal; color:#b9cde2; word-break:break-word; }
.rm2-diag-v{ padding:14px 10px; color:#8ea6bf; text-align:center; }
@media (max-width:560px){
  .rm2-diag{ width:calc(100vw - 70px); max-height:46vh; font-size:11px; }
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

  /* ------------------------------------------------------------------
     RENDERIZAÇÃO AO VIVO · incremental, sem reconstruir o path inteiro

     `dDe(pts)` decide o comando (recto ou curvo) do ponto i olhando para
     i-1, i e i+1 — por isso só o ÚLTIMO ponto do buffer pode mudar de
     comando quando chega um ponto novo (o `dDe` original também trata o
     último ponto à parte, com um `L` simples, porque ainda não conhece o
     seu i+1). Todos os pontos anteriores já estão decididos para sempre.

     Isto permite congelar a string do caminho a cada ponto que deixa de
     poder mudar, e cada frame só recalcula a ponta — em vez de percorrer
     outra vez os pontos todos do traço, custo que cresce com o traço. A
     saída é IDÊNTICA, ponto a ponto, a chamar `dDe(pts)` de raiz: só o
     caminho para lá chegar é que fica O(1) amortizado por ponto, em vez
     de O(n) por frame. No `pointerup` o traço final continua a ser escrito
     pelo `dDe` de sempre, sobre os pontos já simplificados — o incremental
     serve só para o feedback visual durante a escrita (§15 do encargo). */
  function novoPathIncremental(pts) {
    return { d: 'M' + n1000(pts[0][0]) + ' ' + n1000(pts[0][1]), congelado: 0 };
  }

  function pathIncremental(estado, pts) {
    var n = pts.length;
    if (n <= 1) return estado.d;
    while (estado.congelado < n - 2) {
      var i = estado.congelado + 1;
      if (ehCanto(pts[i - 1], pts[i], pts[i + 1])) {
        estado.d += 'L' + n1000(pts[i][0]) + ' ' + n1000(pts[i][1]);
      } else {
        var mx = (pts[i][0] + pts[i + 1][0]) / 2;
        var my = (pts[i][1] + pts[i + 1][1]) / 2;
        estado.d += 'Q' + n1000(pts[i][0]) + ' ' + n1000(pts[i][1]) +
                    ' '  + n1000(mx)       + ' ' + n1000(my);
      }
      estado.congelado = i;
    }
    var u = pts[n - 1];
    return estado.d + 'L' + n1000(u[0]) + ' ' + n1000(u[1]);
  }

  /* ================================================================== */
  /* 6 · CANETA — pointer events, stylus primeiro                        */
  /* ================================================================== */

  var traco = null;                     // { sec, box, pts, path, pid, rec, rafId, rafPending, pathState }

  /* Estado da caneta (§7/§8 do encargo): a única fonte de verdade sobre
     "onde e há quanto tempo é que a stylus esteve activa", usada pela
     rejeição de palma. Actualizado tanto no contacto real (pointerdown/
     pointermove com pointerType 'pen') como no hover, quando o hardware e
     o browser o expõem (pointermove com pointerType 'pen' e buttons=0) —
     a stylus a aproximar-se já é sinal, mesmo antes de tocar. */
  var penState = { active: false, lastX: 0, lastY: 0, lastActiveAt: 0, lastContactEndAt: 0 };

  /* Ponto único: o contacto da stylus é o que decide se a área ainda
     oferece pan ao dedo (ver o CSS .rm2-pen-down). Fica junto do estado
     para não haver um caminho de término que se esqueça de o desligar. */
  function penEmContacto(ligado) {
    penState.active = !!ligado;
    if (!ligado) penState.lastContactEndAt = Date.now();
    try { document.body.classList.toggle('rm2-pen-down', !!ligado); } catch (e) {}
  }

  function registarPen(e) {
    penState.lastX = e.clientX; penState.lastY = e.clientY;
    penState.lastActiveAt = Date.now();
  }

  /* ------------------------------------------------------------------
     REJEIÇÃO DE PALMA · heurística por pontuação (§8 do encargo)

     Nenhum sinal sozinho chega: largura/altura do contacto nem sempre vêm
     preenchidas (varia por browser/hardware), e a distância à ponta não
     chega sozinha porque rolar perto da caneta é legítimo. Por isso
     somam-se pontos — cada sinal disponível soma o que vale, e só se
     classifica PALMA a partir de um total mínimo.

     Os valores abaixo vêm de como os testes automatizados e o diagnóstico
     do tablet físico (§26 do encargo) foram desenhados. SÓ "pen activa"
     basta sozinha (3, contra um LIMIAR de 2): um toque que chega enquanto
     a stylus ainda está a desenhar é, na esmagadora maioria dos casos, a
     palma que apoia a mão. "Pen recente" (a stylus acabou de levantar) É
     DE PROPÓSITO fraca sozinha (1): o item 9 do encargo exige que "stylus
     levanta → dedo imediatamente arrasta → página rola" continue a
     funcionar, e esse é exactamente o gesto de quem escreve e logo a
     seguir rola com a mesma mão — teria de ser tratado como palma se a
     recência sozinha bastasse. Só quando a recência SOMA com proximidade
     e/ou contacto grande é que ultrapassa o LIMIAR — é a combinação, não
     o tempo isolado, que distingue "acabei de escrever e agora rolo de
     propósito" de "a palma ainda está encostada onde eu escrevia". Ajustar
     estes números apenas com base em teste real — nunca a olho. */
  var PALM_LIMIAR = 2;
  var PALM_RECENT_MS = 400;         // pen levantou há menos disto: ainda "quente"
  var PALM_NEAR_PX = 140;           // toque a menos disto do último ponto da pen: "perto"
  var PALM_LARGE_CONTACT = 25;      // largura/altura (px) acima disto: "contacto grande"
  var PALM_RELEASE_GRACE_MS = 250;  // ver reconsiderarNavegacao(): toque parado após soltar a pen
  var PALM_SETTLE_MS = 140;         // toque "provisório" que não se moveu neste tempo é reavaliado

  function distDoUltimoPen(x, y) {
    if (!penState.lastActiveAt) return Infinity;
    var dx = x - penState.lastX, dy = y - penState.lastY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pontuarPalma(e) {
    var pontos = 0, motivos = [];
    if (penState.active) { pontos += 3; motivos.push('pen-ativa'); }
    else if (penState.lastContactEndAt && (Date.now() - penState.lastContactEndAt) < PALM_RECENT_MS) {
      pontos += 1; motivos.push('pen-recente');
    }
    if (distDoUltimoPen(e.clientX, e.clientY) < PALM_NEAR_PX) { pontos += 1; motivos.push('perto'); }
    var w = e.width != null ? e.width : (e.radiusX != null ? e.radiusX * 2 : 0);
    var h = e.height != null ? e.height : (e.radiusY != null ? e.radiusY * 2 : 0);
    if (Math.max(w, h) > PALM_LARGE_CONTACT) { pontos += 1; motivos.push('contato-grande'); }
    return { pontos: pontos, motivos: motivos };
  }

  /* pointerId -> {x0,y0,t0} — toques em avaliação provisória como
     navegação (item 9 do encargo: nem todo toque simultâneo é palma). */
  var touchNav = {};
  /* pointerId -> {motivos} — toques já confirmados como palma; ficam
     assim até ao SEU PRÓPRIO pointerup/cancel, mesmo que a pen já tenha
     levantado entretanto (item 10, "janela pós-caneta"). */
  var touchPalm = {};

  function tratarComoPalma(e, motivos, jaClassificado) {
    touchPalm[e.pointerId] = { motivos: motivos };
    delete touchNav[e.pointerId];
    if (!jaClassificado) diagLog('touch-palm', e, { classificacao: 'palm', razao: motivos.join('+') });
    /* nunca cria traço, nunca apaga, nunca troca ferramenta — o pointerId se
       limita a existir até ao seu up/cancel. Suprime-se o gesto nativo só
       quando o evento é cancelable: nada de preventDefault às cegas. */
    if (e.cancelable) e.preventDefault();
  }

  /* Reavalia, um pouco depois do pointerdown, um toque que tinha ficado
     como navegação provisória: se continua praticamente parado (não é o
     movimento rápido e sustido de quem rola de propósito) e as condições
     de palma ainda se sustentam, passa a palma mesmo sem se ter movido —
     cobre a palma "fria" que assenta devagar sem gerar um score alto logo
     no toque inicial (item 8-F do encargo). Preventar o scroll nesta
     altura pode já chegar tarde nalguns browsers (o gesto pode já ter
     começado) — documentado como limitação, não escondido (§27). */
  function reconsiderarNavegacao(pid) {
    var n = touchNav[pid];
    if (!n) return;
    delete touchNav[pid];
    if (touchPalm[pid]) return;                 // já foi promovido por outro caminho
    var parado = Math.abs(n.xUlt - n.x0) < 6 && Math.abs(n.yUlt - n.y0) < 6;
    if (!parado) return;                         // moveu-se de forma sustida: é mesmo navegação
    var quente = penState.active ||
      (penState.lastContactEndAt && (Date.now() - penState.lastContactEndAt) < PALM_RELEASE_GRACE_MS);
    if (!quente) return;
    touchPalm[pid] = { motivos: ['parado-pos-pen'] };
    diagLog('touch-palm-tardio', null, { pointerId: pid, classificacao: 'palm', razao: 'parado-pos-pen' });
  }

  /* Roteia um toque (dedo) enquanto a ferramenta é a caneta. Chamado do
     pointerdown partilhado — nunca cria stroke, nunca captura o ponteiro:
     um toque legítimo de navegação deve continuar exactamente como se
     esta função nem existisse (sem preventDefault, sem setPointerCapture),
     para o browser tratar o pan/pinch nativamente. */
  function rotearToqueComCanetaArmada(e) {
    if (touchPalm[e.pointerId]) { tratarComoPalma(e, touchPalm[e.pointerId].motivos, true); return; }
    var r = pontuarPalma(e);
    if (r.pontos >= PALM_LIMIAR) { tratarComoPalma(e, r.motivos, false); return; }
    touchNav[e.pointerId] = { x0: e.clientX, y0: e.clientY, xUlt: e.clientX, yUlt: e.clientY, t0: Date.now() };
    diagLog('touch-nav', e, { classificacao: 'navigation', razao: 'score-baixo:' + r.pontos });
    setTimeout(function () { reconsiderarNavegacao(e.pointerId); }, PALM_SETTLE_MS);
  }

  function onTouchMoveComCanetaArmada(e) {
    if (touchPalm[e.pointerId]) {
      if (e.cancelable) e.preventDefault();
      return;
    }
    var n = touchNav[e.pointerId];
    if (n) { n.xUlt = e.clientX; n.yUlt = e.clientY; }
    /* navegação legítima: não se toca no evento, o browser trata o pan. */
  }

  function limparToqueRoteado(pid) {
    delete touchNav[pid];
    delete touchPalm[pid];
  }

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
    diagLog('pointerdown', e);
    if (lbAberto()) return;                             // zoom aberto: caneta suspensa
    if (e.target && e.target.closest && e.target.closest('.rm2-box,.rm2-notes,.rm-tools,.rm-lb,.rm-menu,.rm-sug-fab,#rm-sug')) return;
    if (gestoMorto()) abortarTraco();                   // traço órfão não bloqueia o seguinte

    /* A CANETA, com dedo, nunca chega a criar traço nem a bloquear nada:
       o toque é roteado como navegação (o browser trata o pan/pinch, o
       touch-action já devolveu isso ao dedo) ou como palma (suprimido, mas
       sem tocar em `traco`/`apagando`). Isto acontece ANTES da guarda de
       "2.º ponteiro" de propósito — um toque de palma ou de scroll nunca
       deve competir com essa guarda nem bloquear o próximo traço real. A
       goma mantém-se inalterada: continua a aceitar o dedo mais abaixo. */
    if (st.tool === 'pen' && e.pointerType === 'touch') {
      rotearToqueComCanetaArmada(e);
      return;
    }

    if (traco || apagando) return;                      // rejeição de palma/2.º ponteiro
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    var anc = anchorDe(e.target);
    if (!anc) return;
    var sec = anc.el;

    /* A goma aceita o dedo — um toque apaga e nunca chega a impedir o
       scroll, porque não se faz preventDefault para touch. O lápis, esse,
       só responde a stylus e rato: o dedo já foi tratado acima. */
    if (st.tool === 'eraser') { comecarApagar(e, sec); return; }
    if (!ehPonteiroDeDesenho(e)) return;

    if (e.pointerType === 'pen') { penEmContacto(true); registarPen(e); }

    var b = caixa(sec);
    traco = {
      sec: sec, box: b, pts: [], pid: e.pointerId,
      tipo: e.pointerType,
      rafId: null, rafPending: false, pathState: null,
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

  /* CAPTURA · corre em CADA pointermove, síncrona: nenhum ponto pode
     esperar por um frame para ser guardado (§13 do encargo). */
  function onMove(e) {
    if (!traco || e.pointerId !== traco.pid) return;
    /* Falha a meio de um movimento não pode deixar `traco` pendurado para
       sempre — é o mesmo espírito da reconciliação, só que para uma
       excepção em vez de uma interrupção externa (§5, fail-safe). */
    try {
      /* getCoalescedEvents() pode devolver uma lista VAZIA — acontece no
         primeiro movimento de alguns dispositivos e em eventos sintéticos.
         Um `|| [e]` não chega, porque [] é truthy: era assim que se perdia
         o traço inteiro. */
      var evs = null;
      try { if (e.getCoalescedEvents) evs = e.getCoalescedEvents(); } catch (err) { evs = null; }
      if (!evs || !evs.length) evs = [e];
      for (var i = 0; i < evs.length; i++) addPonto(evs[i]);
      /* RENDERIZAÇÃO · desacoplada da captura (§12-14 do encargo). Só se
         agenda UM requestAnimationFrame por traço-em-curso; se chegarem
         mais pointermoves antes de esse frame correr, os pontos entram
         todos no buffer (linha acima) mas o `d` só é reescrito uma vez. */
      agendarRenderizacao();
    } catch (err) {
      console.warn('[rm2] onMove', err && err.message);
      diagLog('onMove-erro', e);
      abortarTraco();
      return;
    }
    e.preventDefault();
  }

  function agendarRenderizacao() {
    if (!traco || traco.rafPending) return;
    traco.rafPending = true;
    traco.rafId = requestAnimationFrame(renderizarFrame);
  }

  function renderizarFrame() {
    if (!traco) return;                 // abortado/terminado entre o agendamento e o frame
    traco.rafPending = false;
    traco.rafId = null;
    if (!traco.pathState) traco.pathState = novoPathIncremental(traco.pts);
    /* só se reescreve o atributo `d`; nenhum nó é criado ou destruído,
       nenhum reflow do documento (§12/§18) */
    traco.path.setAttribute('d', pathIncremental(traco.pathState, traco.pts));
  }

  /* Cancela um RAF pendente sem tentar desenhar num traço já destruído
     (§17 do encargo). Chamado de todos os pontos de término/cancelamento,
     nunca só de um. */
  function cancelarRenderizacaoPendente(t) {
    if (t && t.rafId != null) { try { cancelAnimationFrame(t.rafId); } catch (err) {} }
  }

  function onUp(e) {
    diagLog('pointerup', e);
    if (apagando) { terminarApagar(); return; }
    if (!traco || (e && e.pointerId !== traco.pid)) return;
    var t = traco; traco = null;
    /* Flush (§16): não há nada para "consumir" do RAF — a captura de
       pontos é síncrona no onMove (§13), por isso `t.pts` já tem tudo.
       Cancela-se o frame pendente só para não desenhar, à toa, num traço
       que está prestes a ser substituído pelo `d` final e definitivo. */
    cancelarRenderizacaoPendente(t);
    if (t.tipo === 'pen') penEmContacto(false);
    libertar(t.sec, t.pid);
    document.body.classList.remove('rm2-drawing');

    try {
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
    } catch (err) {
      console.warn('[rm2] onUp', err && err.message);
      diagLog('onUp-erro', e);
      if (t.path && t.path.parentNode) t.path.parentNode.removeChild(t.path);
    }
  }

  /* Com o touch-action correcto, o scroll deixa de cancelar o ponteiro a
     meio de uma letra. Mas o cancelamento LEGÍTIMO continua a existir — a
     caneta sai do alcance do digitalizador, o SO interrompe, troca-se de
     aplicação — e nesses casos o traço em curso não deve ser gravado meio
     feito. Continua defensivo, de propósito: o objectivo foi eliminar o
     cancelamento INDEVIDO, não disfarçar o verdadeiro. */
  function onCancel(e) {
    diagLog('pointercancel', e);
    if (apagando) { terminarApagar(); return; }
    if (!traco || (e && e.pointerId !== traco.pid)) return;
    abortarTraco();
  }

  /* Deitar fora o traço em curso. Ponto ÚNICO: tudo o que interrompe um
     gesto passa por aqui, para não haver um caminho que se esqueça de
     limpar uma das quatro coisas (o registo, a captura, a classe e
     qualquer selecção nativa que possa ter começado enquanto o gesto
     estava em curso — §4D do diagnóstico de estabilidade). */
  function abortarTraco() {
    if (!traco) return;
    var t = traco; traco = null;
    cancelarRenderizacaoPendente(t);
    if (t.tipo === 'pen') penEmContacto(false);
    libertar(t.sec, t.pid);
    if (t.path && t.path.parentNode) t.path.parentNode.removeChild(t.path);
    document.body.classList.remove('rm2-drawing');
    limparSelecaoResidual();
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
  function reconciliarGesto(motivo) {
    diagLog('reconciliar:' + (motivo || '?'), null);
    if (apagando) terminarApagar();
    abortarTraco();
    abortarGestoMarcador(motivo);   // mesma filosofia fail-safe, agora também para o marcador
    /* nenhum toque roteado (navegação provisória ou palma) deve sobreviver
       a uma interrupção global — troca de matéria, resize, app-switch — a
       mesma rede de segurança da caneta e do marcador, agora também para
       o roteador de toque (§17 do encargo). */
    touchNav = {}; touchPalm = {};
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
    limparSelecaoResidual();
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
     para trocar, nunca como pré-requisito (§5 do encargo).

     Regista no undo comparando o tamanho da lista antes/depois — é o
     mesmo truque nos dois caminhos que acabam por marcar (o de gesto e o
     de selecção nativa), por isso vive numa função só. */
  function registarUndoMarcacao(slug, antes) {
    var lista = RT().estado.porSlug[slug] || [];
    if (lista.length > antes) {
      pushUndo({ tipo: 'hl-add', slug: slug, id: lista[lista.length - 1].id });
    }
  }

  async function aplicarMarcacao() {
    var tab = abaAtiva(); if (!tab) return;
    var slug = slugDoTab(tab);
    var antes = (RT().estado.porSlug[slug] || []).length;
    RT().estado.cor = st.hlColor;
    await RT().marcarSelecao();
    registarUndoMarcacao(slug, antes);
  }

  /* ================================================================== */
  /* 9b · MARCADOR — GESTO REAL (arrastar uma vez, sem depender de o      */
  /*      browser ter produzido sozinho uma selecção nativa)              */
  /* ================================================================== */

  /* O fluxo antigo (mouseup/touchend → window.getSelection()) EXIGIA que
     o browser já tivesse construído sozinho uma selecção nativa quando o
     gesto soltasse — em desktop isso acontece de graça com o arrasto do
     rato, mas em touch normalmente só depois de um long-press. Por isso:
     ARMAR MARCADOR → ARRASTAR UMA VEZ (mouse, pen OU dedo) → SOLTAR →
     TEXTO MARCADO, com uma Range construída por nós a partir do PONTO do
     gesto, não da selecção do browser.

     A ancoragem, o pintar/despintar e o Supabase continuam exactamente os
     mesmos (rm-tools.js, `marcarRange`) — só muda como a Range chega lá.

     Mouse, pen e touch passam pela MESMA máquina (onHlDown/Move/Up/Cancel);
     a única diferença por tipo de ponteiro é como se evita interferência
     nativa: mouse/pen apanham o `dragstart` (arrastar uma selecção já
     existente); touch ganha `touch-action:none` em CSS (o marcador agora
     suspende o pan por dedo enquanto está armado — antes não bloqueava
     scroll nenhum; ver comentário no CSS) e `preventDefault()` já no
     `pointerdown`, que é a forma correcta de vetar o long-press nativo
     (menu de contexto, lupa de selecção) sem tocar no duplo-clique do
     rato — esse preventDefault só corre para `touch`. */
  var hlGesto = null;               // { pid, tipo, tab, sec, el, x0, y0, ini, fim, moveu }
  var HL_LIMIAR_PX = 5;             // abaixo disto é jitter, não arrasto (item 4)

  function pontoDoEvento(x, y) {
    try {
      if (document.caretPositionFromPoint) {
        var p = document.caretPositionFromPoint(x, y);
        if (p && p.offsetNode) return { node: p.offsetNode, offset: p.offset };
      }
    } catch (e) {}
    try {
      if (document.caretRangeFromPoint) {
        var r = document.caretRangeFromPoint(x, y);
        if (r) return { node: r.startContainer, offset: r.startOffset };
      }
    } catch (e) {}
    return null;
  }

  /* Mesma lista de exclusão do resto da V2 (toolbox, notas, menu…) mais o
     que o motor antigo já recusa (controlos, inputs, alternativas de
     quiz…) — reutilizado via `dentroDoSkip`, nunca duplicado aqui. */
  function alvoElegivelParaMarcar(target, tab) {
    if (!target || !tab || !tab.contains(target)) return false;
    if (target.closest && target.closest(
      '.rm2-box,.rm2-notes,.rm-tools,.rm-lb,.rm-menu,.rm-sug-fab,#rm-sug')) return false;
    var t = RT();
    if (t && t.dentroDoSkip && t.dentroDoSkip(target)) return false;
    return true;
  }

  /* Tenta as duas ordens: entre um pointerdown e o ponto actual, qualquer
     um pode vir primeiro ou depois no documento (arrasto de trás para
     a frente é normal). */
  function construirRange(a, b) {
    var tentativas = [[a, b], [b, a]];
    for (var i = 0; i < tentativas.length; i++) {
      try {
        var r = document.createRange();
        r.setStart(tentativas[i][0].node, tentativas[i][0].offset);
        r.setEnd(tentativas[i][1].node, tentativas[i][1].offset);
        if (!r.collapsed) return r;
      } catch (e) {}
    }
    return null;
  }

  function limparSelecaoDoGesto() {
    try { window.getSelection().removeAllRanges(); } catch (e) {}
  }

  /* Ponto ÚNICO de término anormal do gesto do marcador — o mesmo espírito
     do `abortarTraco` da caneta (item 2). Chamado por interrupções globais
     (reconciliarGesto), por pointercancel/lostpointercapture e por troca
     de ferramenta. Depois disto: hlGesto === null, nenhuma captura
     pendurada, nenhuma selecção que o gesto tenha criado sobra. */
  function abortarGestoMarcador(motivo) {
    if (!hlGesto) return;
    var g = hlGesto; hlGesto = null;
    libertar(g.el, g.pid);
    if (g.moveu) limparSelecaoDoGesto();
    diagLog('hl-abort:' + (motivo || '?'), null);
  }

  function onHlDown(e) {
    if (st.tool !== 'highlight') return;
    if (lbAberto()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (hlGesto) return;                                // 2.º ponteiro: ignora, não troca a meio
    var tab = abaAtiva(); if (!tab) return;
    if (!alvoElegivelParaMarcar(e.target, tab)) return;
    var p0 = pontoDoEvento(e.clientX, e.clientY);
    if (!p0) return;
    /* Vetar já aqui o long-press nativo (menu de contexto / lupa de
       selecção) é o que permite ao dedo arrastar-para-marcar em vez de
       accionar a UI de selecção do próprio SO. Só para touch: em mouse
       isto mataria o duplo-clique nativo (seleccionar palavra → tocar
       numa cor, fluxo que continua a existir na paleta). */
    if (e.pointerType === 'touch') e.preventDefault();
    var sec = e.target.closest && e.target.closest('section[id]');
    var el = e.target;
    try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch (err) {}
    hlGesto = {
      pid: e.pointerId, tipo: e.pointerType, tab: tab, sec: sec || null, el: el,
      x0: e.clientX, y0: e.clientY, ini: p0, fim: null, moveu: false
    };
  }

  function onHlMove(e) {
    if (!hlGesto || e.pointerId !== hlGesto.pid) return;
    var g = hlGesto;
    /* item 4 — limiar de movimento: jitter não é arrasto */
    var dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (!g.moveu && (dx * dx + dy * dy) < HL_LIMIAR_PX * HL_LIMIAR_PX) return;

    /* item 5 — a Range não pode fugir da zona elegível nem, de
       preferência, do bloco/secção onde o gesto começou: em vez de
       seguir o ponteiro cegamente, cada movimento verifica o alvo REAL
       antes de o aceitar como novo fim. Fora da zona (ou noutra secção):
       clamp — fica-se pelo último ponto válido, em vez de deixar uma
       selecção atravessar a toolbox, o menu ou a interface inteira.

       DOIS testes de zona, porque `elementFromPoint` e
       `caretRangeFromPoint` nem sempre concordam: no VÃO entre dois
       blocos (a margem entre duas `<section>`, por exemplo) o hit-test
       da caixa devolve o contentor genérico por cima, mas o hit-test do
       caret pode «encaixar» no carácter mais próximo — que pode já
       pertencer ao bloco SEGUINTE. Validar só `elementFromPoint` deixava
       a Range escapar exactamente por essa fresta; o teste de secção usa
       antes o nó em que o caret REALMENTE resolveu, o mesmo que
       `construirRange` vai usar.

       E porque não basta REJEITAR o ponto fora da zona: o rato não teve
       o mousedown prevenido (de propósito, para não matar o duplo-clique
       nativo), por isso o próprio browser continua a alargar a SUA
       selecção sozinho em paralelo, a cada mousemove — e ganhava sempre
       por último se nos limitássemos a ignorar o movimento. Por isso
       esta função REAFIRMA sempre a nossa Range (a nova, se o ponto é
       válido; a última válida, senão) depois do limiar — nunca deixa o
       browser preencher a selecção sozinho por omissão nossa. */
    var alvo = document.elementFromPoint(e.clientX, e.clientY);
    var p1 = pontoDoEvento(e.clientX, e.clientY);
    var aceitavel = !!(p1 && alvoElegivelParaMarcar(alvo, g.tab));
    if (aceitavel && g.sec) {
      var elCaret = (p1.node.nodeType === 1) ? p1.node : p1.node.parentElement;
      var secAtual = elCaret && elCaret.closest && elCaret.closest('section[id]');
      if (secAtual !== g.sec) aceitavel = false;
    }
    if (aceitavel) g.fim = p1;

    var range = g.fim ? construirRange(g.ini, g.fim) : null;
    try {
      var s = window.getSelection(); s.removeAllRanges();
      if (range && !range.collapsed) s.addRange(range);
    } catch (err) {}
    if (range && !range.collapsed) g.moveu = true;
    e.preventDefault();
  }

  async function onHlUp(e) {
    if (!hlGesto || (e && e.pointerId !== hlGesto.pid)) return;
    var g = hlGesto; hlGesto = null;
    libertar(g.el, g.pid);
    /* toque sem arrasto: não cria lixo (M11). E não mexe na selecção —
       um simples clique pode ser o início de um duplo-clique nativo do
       browser (seleccionar uma palavra para depois tocar numa cor, o
       fluxo antigo que continua a existir na paleta); só limpamos a
       selecção quando fomos NÓS a construí-la, isto é, quando houve
       arrasto de facto além do limiar. */
    if (!g.moveu || !g.fim) return;
    var range = construirRange(g.ini, g.fim);
    limparSelecaoDoGesto();
    if (!range || range.collapsed) return;
    var slug = slugDoTab(g.tab);
    var antes = (RT().estado.porSlug[slug] || []).length;
    RT().estado.cor = st.hlColor;
    await RT().marcarRange(range, st.hlColor, g.tab);
    registarUndoMarcacao(slug, antes);
  }

  function onHlCancel(e) {
    if (!hlGesto || (e && e.pointerId !== hlGesto.pid)) return;
    abortarGestoMarcador('pointercancel');
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

    /* diagnóstico: um traçado de monitor com um ponto a marcar o pico */
    diag:
      '<defs>' + grad('rm2dA', '#8fd3ff', '#2f7fd6', true) + '</defs>' +
      '<rect x="2.6" y="5.4" width="26.8" height="19.4" rx="3.2" fill="none" stroke="url(#rm2dA)" stroke-width="2.6"/>' +
      '<path d="M6.6 16.4h4l2.6-5.4 3.4 9.2 2.6-5.2h6.2" fill="none" stroke="url(#rm2dA)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="16.6" cy="20.2" r="1.9" fill="#ffd77a"/>' +
      '<rect x="11.4" y="26.6" width="9.2" height="2.4" rx="1.2" fill="url(#rm2dA)"/>',

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
        /* Diagnóstico do lápiz. Está aqui, e não atrás de uma consola, porque
           quem tem de o ler é o tester com o tablet na mão. Só beta: este
           ficheiro inteiro só corre para quem tem acesso à V2. */
        botao('data-a="diag"', I.diag, 'Diagnóstico del lápiz', 'Abrir el diagnóstico del lápiz', false) +
      '</div>' +
      '<button type="button" class="rm2-fab" id="rm2-fab" aria-expanded="false" aria-controls="rm2-panel" ' +
        'title="Herramientas de estudio" aria-label="Herramientas de estudio">' + ico(I.tools) + '</button>';

    document.body.appendChild(box);

    /* ------------------------------------------------------------------
       O FAB é a saída do modo de escrita BLOQUEANTE — hoje só a GOMA.

       Com a goma armada, o touch-action:none ainda tira o pan à área de
       leitura. Se o painel pudesse fechar nesse estado, ficava uma página
       que não rola e cujo botão de sair está escondido — só o FAB à
       vista, sem nada que diga que é ele que desarma. Era a queixa de
       «não consigo desativar para voltar a rolar».

       A CANETA deixou de bloquear o dedo (§0 do encargo): o FAB com o
       lápis armado agora só abre e fecha o painel, exactamente como já
       acontecia com o marcador — o lápis segue armado depois de fechar, e
       o dedo continua a rolar sem precisar de reabrir nada. */
    box.querySelector('#rm2-fab').addEventListener('click', function () {
      if (modoEscritaBloqueante()) { escolherFerramenta('none'); return; }
      st.open = !st.open; refletir();
    });

    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;

      var t = b.getAttribute('data-t');
      if (t) { escolherFerramenta(st.tool === t ? 'none' : t); return; }

      var a = b.getAttribute('data-a');
      if (a === 'undo') { desfazer(); return; }
      if (a === 'notes') { abrirNotas(); return; }
      if (a === 'diag') { alternarDiag(); return; }

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

  /* «Bloqueante» aqui quer dizer uma coisa só: a ferramenta tirou o pan à
     área de leitura, logo o painel TEM de ficar aberto, porque é lá que
     está o botão que a desarma. Hoje isso só acontece com a GOMA
     (touch-action:none escopado a body.rm2-t-eraser/highlight).

     Isto não é o mesmo que «o painel pode fechar-se sozinho»: com o lápiz
     armado o painel também fica, mas por outra razão — escrever na
     matéria não é clicar fora (ver o listener de pointerdown em
     `ligar()`). O FAB e o ESC continuam a fechá-lo nos dois casos. */
  function modoEscritaBloqueante() {
    return st.tool === 'eraser';
  }

  /* Distinto de `modoEscritaBloqueante()`: esta é "estamos numa ferramenta
     que desenha/apaga", usada para vetar selecção nativa — continua a
     incluir a CANETA mesmo que ela já não bloqueie o painel/scroll. As
     duas perguntas eram a mesma antes desta tarefa; deixaram de o ser no
     momento em que o lápis passou a devolver o pan ao dedo sem deixar de
     precisar de nunca disparar uma selecção nativa por engano. */
  function ferramentaDeDesenho() {
    return st.tool === 'pen' || st.tool === 'eraser';
  }

  /* Limpa qualquer selecção nativa residual. Chamada ao ENTRAR em
     lápiz/goma (§4C do diagnóstico) e em qualquer término anormal do
     traço (§4D) — nunca deve sobrar uma selecção do browser depois de uma
     ferramenta de desenho ter estado ligada. */
  function limparSelecaoResidual() {
    try {
      var s = window.getSelection();
      if (s && s.removeAllRanges) s.removeAllRanges();
    } catch (e) {}
  }

  function escolherFerramenta(t) {
    if (traco) onCancel();
    if (apagando) terminarApagar();
    if (hlGesto) abortarGestoMarcador('troca-ferramenta');
    st.tool = t;
    if (t !== 'none') st.open = true;
    if (t === 'pen' || t === 'eraser') limparSelecaoResidual();
    refletir();
    if (t === 'highlight') toast('Marcador activo · seleccioná el texto');
    if (t === 'pen') toast('Lápiz activo · escribí con el lápiz o el ratón');
    if (t === 'eraser') toast('Goma activa · tocá una marca o un trazo');
  }

  function refletir() {
    if (!box) return;
    /* INVARIANTE: nunca há modo de escrita bloqueante sem saída à vista.
       Enquanto a GOMA estiver armada o painel fica aberto, portanto o
       botão que a desarma está sempre no ecrã. Qualquer caminho que tente
       fechar o painel nesse estado é corrigido aqui, e não só no FAB. Nem
       o marcador nem a caneta bloqueiam o scroll (§0 do encargo), por isso
       os dois podem fechar o painel e continuar activos. */
    if (modoEscritaBloqueante()) st.open = true;
    box.classList.toggle('open', st.open);
    var fab = box.querySelector('#rm2-fab');
    fab.setAttribute('aria-expanded', String(st.open));
    fab.classList.toggle('armed', st.tool !== 'none');
    /* o rótulo diz o que o botão faz AGORA, que é o que um leitor de ecrã
       anuncia e o que aparece no tooltip de quem usa rato. Só a goma faz o
       FAB sair do modo de escrita; com o marcador e com a caneta o FAB
       continua a só abrir/fechar o painel. */
    var bloqueante = modoEscritaBloqueante();
    fab.setAttribute('title', bloqueante ? 'Salir del modo escritura' : 'Herramientas de estudio');
    fab.setAttribute('aria-label', bloqueante ? 'Salir del modo escritura' : 'Herramientas de estudio');

    box.querySelectorAll('.rm2-btn[data-t]').forEach(function (b) {
      var on = b.getAttribute('data-t') === st.tool;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    /* o botão do diagnóstico acende enquanto o painel estiver no ecrã */
    var bd = box.querySelector('.rm2-btn[data-a="diag"]');
    if (bd) {
      bd.classList.toggle('on', diagAberto());
      bd.setAttribute('aria-expanded', String(diagAberto()));
    }
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
    /* marcador — MOUSE, PEN e TOUCH pela MESMA máquina de gesto: um
       arrasto e pronto (ver «9b»). O «seleccionar palavra → tocar numa
       cor» continua a existir à parte, no clique da paleta de cores mais
       abaixo — não depende disto. */
    document.addEventListener('pointerdown', onHlDown, true);
    document.addEventListener('pointermove', onHlMove, { passive: false });
    document.addEventListener('pointerup', onHlUp, true);
    document.addEventListener('pointercancel', onHlCancel, true);

    /* Ao construirmos a Range nós próprios e chamá-la à Selection (para
       o feedback visual do arrasto), o ponteiro passa a estar em cima de
       texto JÁ seleccionado enquanto continua premido — e é exactamente
       essa combinação que o browser lê como «arrastar a selecção» (drag
       nativo de texto), que lhe TIRA o ponteiro a meio (é o `pointercancel`
       que se vê no diagnóstico). Vetar só o `dragstart` do nosso próprio
       gesto resolve isto sem tocar no `pointerdown` — que continuaria a
       deixar o duplo-clique nativo (seleccionar palavra, depois tocar
       numa cor) a funcionar exactamente como antes. */
    document.addEventListener('dragstart', function (e) {
      if (hlGesto) e.preventDefault();
    }, true);

    /* Defesa em profundidade contra selecção nativa em ferramenta de
       desenho (lápis/goma): mesmo que o CSS (user-select:none) não
       chegue a tempo, ou que `onDown` tenha voltado cedo sem chegar a
       `preventDefault()` — anchorDe() falhou, o alvo caiu fora do
       esperado, o ponteiro não foi aceite —, isto veta a selecção na
       origem. Campos de escrita legítimos ficam de fora. Usa
       `ferramentaDeDesenho()`, não `modoEscritaBloqueante()`: a caneta
       continua a precisar disto mesmo já não bloqueando o painel/scroll. */
    document.addEventListener('selectstart', function (e) {
      if (!ferramentaDeDesenho()) return;
      var t = e.target;
      if (t && t.closest && t.closest('input,textarea,[contenteditable="true"],.rm2-notes')) return;
      diagLog('selectstart-bloqueado', null);
      e.preventDefault();
    }, true);

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
      /* Sinal de "pen por perto" para a rejeição de palma — inclui o
         HOVER (pointerType 'pen', buttons 0) quando o hardware/browser o
         expõe, não só o contacto real; ver §7 do encargo. */
      if (e.pointerType === 'pen') registarPen(e);
      if (st.tool === 'pen' && e.pointerType === 'touch') { onTouchMoveComCanetaArmada(e); return; }
      if (traco) onMove(e); else if (apagando) onMoveApagar(e);
    }, { passive: false });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onCancel, { passive: true });
    /* limpeza dos toques roteados (navegação provisória / palma): qualquer
       toque, classificado ou não, deixa de existir no estado ao soltar —
       nunca fica pendurado a "contaminar" um pointerId reaproveitado. */
    document.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'touch') limparToqueRoteado(e.pointerId);
    }, true);
    document.addEventListener('pointercancel', function (e) {
      if (e.pointerType === 'touch') limparToqueRoteado(e.pointerId);
    }, true);
    window.addEventListener('blur', function () { reconciliarGesto('blur'); });

    /* O browser tira a captura quando o elemento sai do documento ou o
       dispositivo desaparece, e nesses casos NÃO há pointerup nenhum. */
    document.addEventListener('lostpointercapture', function (e) {
      diagLog('lostpointercapture', e);
      if (traco && e.pointerId === traco.pid) abortarTraco();
      else if (apagando && e.pointerId === apagando.pid) terminarApagar();
      else if (hlGesto && e.pointerId === hlGesto.pid) abortarGestoMarcador('lostpointercapture');
    }, true);

    /* Mudar de aplicação no tablet: a letra em curso não se fecha sozinha. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) reconciliarGesto('visibilitychange');
    });

    /* ESC: fecha o que estiver aberto, depois volta a «nenhuma» */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (st.notasAbertas) { fecharNotas(); return; }
      if (st.tool !== 'none') { escolherFerramenta('none'); return; }
      if (st.open) { st.open = false; refletir(); }
    });

    /* Clicar fora minimiza — mas «fora» não inclui usar a ferramenta.

       O teste físico no tablet apanhou isto: com o lápiz armado, o
       pointerdown que COMEÇA o traço chegava aqui primeiro (o listener é
       de captura e o traço ainda não existe nesse instante, por isso o
       veto `traco` não cobria o caso) e fechava o painel ao escrever.

       Com uma ferramenta que se usa DENTRO da matéria — lápiz ou goma —
       tocar na matéria é usá-la, não é clicar fora. O painel só fecha
       pelo FAB, pelo ESC, ou ao trocar/desarmar a ferramenta. Sem
       temporizadores: é o estado da ferramenta que decide. */
    document.addEventListener('pointerdown', function (e) {
      if (!st.open || traco || apagando) return;
      if (e.target.closest && e.target.closest('.rm2-box,.rm2-notes,.rm2-diag')) return;
      if (ferramentaDeDesenho()) return;           // lápiz ou goma: mantém aberto
      st.open = false; refletir();
    }, true);

    /* Diagnóstico: captura, para ver o evento mesmo que alguém o pare a
       meio; passivo, para ser impossível esta linha influenciar o scroll
       que ela existe para medir. Não faz nada enquanto o painel estiver
       fechado. */
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(function (ev) {
      document.addEventListener(ev, diagVReg, { capture: true, passive: true });
    });

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
    window.addEventListener('resize', function () { reconciliarGesto('resize'); reflow(); });
    window.addEventListener('orientationchange', function () {
      reconciliarGesto('orientationchange'); setTimeout(reposicionarTudo, 220);
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
        reconciliarGesto('troca-de-materia');  // a matéria sai debaixo do traço
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
      hasAccess: hasStudyToolsV2Access,
      /* diagnóstico de hardware físico (§7 do encargo): só memória, só
         beta, nunca enviado ao servidor — ver «2b · DIAGNÓSTICO» acima */
      debug: debug,
      /* painel visual do diagnóstico (§FASE 1): abre/fecha/limpa. Também
         não sai do separador — nem servidor, nem localStorage. */
      abrirDiag: abrirDiag,
      fecharDiag: fecharDiag,
      limparDiag: limparDiag,
      /* Ganchos SÓ DE LEITURA para os testes automatizados da caneta
         Goodnotes-like (§24 do encargo). Nenhum grava no Supabase, nenhum
         devolve conteúdo da matéria — só o estado interno do roteador de
         toque/palma e do traço em curso, para os testes confirmarem
         classificação, RAF e limpeza sem terem de ler variáveis privadas
         do módulo. */
      _test: {
        penState: penState,
        touchNav: touchNav,
        touchPalm: touchPalm,
        temTraco: function () { return !!traco; },
        diagAberto: diagAberto,
        diagLinhas: function () { return diagV.slice(); },
        diagTouchAction: diagTouchAction,
        tracoInfo: function () {
          return traco ? { pid: traco.pid, tipo: traco.tipo, nPontos: traco.pts.length, rafPending: traco.rafPending } : null;
        },
        pathIncremental: pathIncremental,
        novoPathIncremental: novoPathIncremental,
        pontuarPalma: pontuarPalma,
        constantes: {
          PALM_LIMIAR: PALM_LIMIAR, PALM_RECENT_MS: PALM_RECENT_MS,
          PALM_NEAR_PX: PALM_NEAR_PX, PALM_LARGE_CONTACT: PALM_LARGE_CONTACT,
          PALM_RELEASE_GRACE_MS: PALM_RELEASE_GRACE_MS, PALM_SETTLE_MS: PALM_SETTLE_MS
        }
      }
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
