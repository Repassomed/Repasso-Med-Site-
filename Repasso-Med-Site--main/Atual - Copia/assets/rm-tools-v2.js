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
  var buildAbertaAntes = false;                          // para avisar o build uma vez por abertura da caixa (refletir)
  var acessoVia = '';                                   // como o acesso à V2 foi concedido a ESTA conta (só o rótulo, nunca o UID): diagnóstico do piloto (#456)
  async function hasStudyToolsV2Access(uid) {
    if (ROLLOUT === 'off') return false;
    if (!uid) return false;
    if (ROLLOUT === 'all') { acessoVia = 'todos'; return true; }
    if (BETA_UIDS.indexOf(uid) !== -1) { acessoVia = 'lista beta no código'; return true; }
    /* A tabela é aditiva: permite juntar testers sem novo deploy.
       Não pode ser escrita pelo cliente (não há policy de INSERT). */
    try {
      var s = RT() && RT().sb && RT().sb();
      if (!s) return false;
      var r = await s.from('study_tools_beta')
        .select('enabled').eq('user_id', uid).maybeSingle();
      if (r.error) return false;
      if (r.data && r.data.enabled) { acessoVia = 'tabela study_tools_beta'; return true; }
      return false;
    } catch (e) { return false; }
  }

  /* ================================================================== */
  /* 0b · PILOTO — retomada da caneta (#64), restrita de propósito       */
  /* ================================================================== */

  /* A retomada da caneta (#64/#66/#67) começa num piloto fechado, à parte
     do rollout geral da V2 acima: só a conta principal do José, só em
     Semiología II. Os dois testers antigos de `BETA_UIDS` continuam a ver
     a V2 exactamente como está hoje — nada nesta secção os afecta; fora
     do piloto, o comportamento actual do site permanece intacto.

     `JOSE_UID` é o mesmo UID que já está em `BETA_UIDS` (conferido contra
     `profiles.is_admin = true` no Supabase) — não é um terceiro tester,
     é a conta que vai testar no tablet físico. */
  var JOSE_UID = 'd4d215d3-36dd-4efb-8869-bdea5376c648';
  var PILOT_SLUGS = ['semiologia-ii'];

  /* Segundo testador (#456): o piloto físico NÃO depende só de um UID fixo no código. Vale também para quem o SERVIDOR liberou (`get-pilot-flags` → `pen:true`, lista
     RM_PILOT_PEN_UIDS do Netlify, lida por rm-pilot.js; nenhum UID no repositório). Só refinamentos do piloto físico, só em Semiología II — não dá acesso à V2 (isso segue sendo
     BETA_UIDS / study_tools_beta) e não liga a caneta para ninguém além de quem já a tem. Falha fechada: sem RMPilot, sem resposta ou negado ⇒ false. */
  function penLiberadaPeloServidor() {
    try { return !!(window.RMPilot && typeof window.RMPilot.penLiberada === 'function' && window.RMPilot.penLiberada()); } catch (e) { return false; }
  }
  function pilotoPermitido() {
    return (st.uid === JOSE_UID || penLiberadaPeloServidor()) && PILOT_SLUGS.indexOf(slugDoTab(abaAtiva())) !== -1;
  }

  /* Ponto de extensão único para a decisão de produto já registada nas
     #64/#66/#67 — caneta, marca-texto livre e highlight textual SOMENTE
     na "Página completa", nunca em modos isolados (infográfico solo,
     questão solo, flashcards solo, audiobook, vídeo, ausculta, Banco de
     preguntas, Todos los flashcards).

     A arquitetura de modos chegou com o Layout V2 (#425, `rm-modes.js`):
     `window.RMModes.isFull()` é o sinal real de "estamos na Página
     completa". A B1 da #425 só escondia os modos isolados por CSS
     (conteúdo/toolbox/tinta ocultos via `data-rm-view`) — construção
     suficiente para a UI, mas não um portão de verdade: qualquer chamada
     directa às funções que escrevem (console, atalho, código futuro)
     continuaria a passar. Esta função fecha esse buraco sem duplicar o
     estado de modo: lê `RMModes` se existir, e noutra matéria qualquer
     (sem Layout V2 anexado) devolve `true` — comportamento idêntico ao de
     sempre para quem não tem a #425. Não inventar aqui nenhum estado
     paralelo de "modo" — a fonte da verdade é sempre `RMModes.view`. */
  function activeViewPermitido() {
    return !window.RMModes || typeof window.RMModes.isFull !== 'function' || window.RMModes.isFull();
  }

  /* Porta única para tudo o que cria, altera ou apaga uma anotação: início
     de traço, marcador, goma, trocar de cor, desfazer/refazer, atalhos de
     teclado e a própria escrita (writes/persistência). Nenhum destes
     caminhos deve decidir a condição por conta própria — é sempre esta
     função, para o dia em que `activeViewPermitido()` deixar de ser
     `true` fixo não sobrar um caminho esquecido.

     DE PROPÓSITO sem `pilotoPermitido()`: aquele portão é mais estreito
     (só José + Semiología II) e só regula os refinamentos físicos da
     stylus dentro de `onDown` e o fecho protegido da toolbox — nunca foi,
     e não deve passar a ser, a condição de "pode desenhar". Quem já
     desenha hoje fora do piloto físico (os dois `BETA_UIDS` antigos e
     quem estiver em `study_tools_beta`) continua a desenhar exactamente
     como antes; a única coisa nova que esta porta acrescenta é a Página
     completa. Compor com `pilotoPermitido()` aqui quebraria o desenho
     para todo mundo que não é o José — por isso NÃO FAZER ISSO. */
  function anotarPermitido() {
    return activeViewPermitido();
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
  var PEN_ESP   = { xthin: 1, thin: 2, medium: 4, thick: 7 };

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

  /* ACHADO C da auditoria independente (#420): o id do traço era gerado
     pelo SERVIDOR (`default gen_random_uuid()`), então o INSERT não era
     idempotente — uma conexão reiniciada logo depois do commit fazia o
     PRÓPRIO NAVEGADOR reenviar o mesmo POST, e o servidor gerava um id
     novo para cada tentativa: 2 linhas para 1 traço. Um 504 depois do
     commit tinha o problema inverso: o cliente nunca chegava a saber o
     id real, ficava com o id provisório para sempre, e «desfazer»
     achava que nada tinha sido gravado (o DELETE nem era tentado).

     Corrigido: o id é gerado NO CLIENTE, uma única vez, ANTES do
     primeiro POST — o mesmo id em qualquer reenvio automático do
     navegador. A tabela aceita id vindo do cliente (RLS continua a
     barrar por `user_id`, nunca por `id`); ver `filaGravar()`.

     AUDITORIA INDEPENDENTE (HEAD 11084b7a, achado 1): o fallback
     antigo, sem `crypto.randomUUID`, devolvia um id «tmp-…» — mas
     `filaGravar()` manda esse valor direto na coluna `id` (tipo
     uuid) do INSERT. Um «tmp-…» não é um UUID válido: o Postgres
     rejeita a linha inteira (erro de tipo, não 23505), o traço nunca
     é gravado, e nenhuma lógica desta função sabia disso — ficava só
     o indicador "não salvo" ligado para sempre. Corrigido: SEMPRE
     devolve um UUID v4 verdadeiro. `crypto.randomUUID()` quando
     existe; senão `crypto.getRandomValues()` (universal há muito
     mais tempo que `randomUUID`) formatado à mão como UUID v4;
     `Math.random()` só como último recurso, para um navegador sem
     NENHUM `crypto` utilizável — nunca mais «tmp-» nem qualquer
     outro valor que não seja um UUID aceito pela coluna. */
  function novoIdTraco() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) {}
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        var buf = new Uint8Array(16);
        window.crypto.getRandomValues(buf);
        buf[6] = (buf[6] & 0x0f) | 0x40;   // versão 4
        buf[8] = (buf[8] & 0x3f) | 0x80;   // variante RFC 4122
        var hex = '';
        for (var i = 0; i < 16; i++) hex += (buf[i] < 16 ? '0' : '') + buf[i].toString(16);
        return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' +
          hex.slice(16, 20) + '-' + hex.slice(20);
      }
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
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

  /* scrollY no pointerdown de cada ponteiro — é o que permite responder,
     objectivamente, à pergunta que motivou o diagnóstico físico: a página
     rolou DURANTE o traço? `diagScrollDelta` compara o scrollY actual com
     esse valor; nunca usa `occurrence` nem nada do #406, é local a este
     ficheiro e só existe em memória. */
  var diagScrollBase = {};

  function diagTouchAction() {
    try {
      /* piloto: a proteção de toque é a guarda (elemento próprio); ler getComputedStyle(contêiner) aqui forçava o estilo da árvore inteira no meio do pointerdown (#456) */
      if (document.body.classList.contains('rm2-pilot-guard')) return penState.active ? 'guarda:ativa' : 'guarda:inativa';
      var el = document.getElementById('materias-container');
      if (!el) return null;
      var cs = getComputedStyle(el);
      return cs.touchAction || cs.getPropertyValue('touch-action') || null;
    } catch (e) { return null; }
  }

  /* `extra` traz metadados específicos do roteador de touch/palma (§22 do
     encargo): classificação, motivo resumido, largura/altura do contacto,
     pontos acumulados. Nunca conteúdo da matéria, texto, notas, e-mail ou
     token — só números e palavras-chave curtas sobre o próprio gesto. */
  function diagLog(tipo, e, extra) {
    try {
      var w = e && (e.width != null ? e.width : (e.radiusX != null ? e.radiusX * 2 : null));
      var h = e && (e.height != null ? e.height : (e.radiusY != null ? e.radiusY * 2 : null));
      var scrollY = Math.round(window.pageYOffset);
      if (e && tipo === 'pointerdown' && e.pointerId != null) diagScrollBase[e.pointerId] = scrollY;
      var base = e && e.pointerId != null ? diagScrollBase[e.pointerId] : null;
      var entrada = {
        t: Date.now(), tipo: tipo,
        pointerType: e ? e.pointerType : null,
        pointerId: e ? e.pointerId : null,
        isPrimary: e ? !!e.isPrimary : null,
        buttons: e ? e.buttons : null,
        pressure: e && e.pressure != null ? e.pressure : null,
        tiltX: e && e.tiltX != null ? e.tiltX : null,
        tiltY: e && e.tiltY != null ? e.tiltY : null,
        cancelable: e ? !!e.cancelable : null,
        tool: st.tool,
        traco: !!traco, apagando: !!apagando,
        captura: diagTemCaptura(e),
        alvo: e ? diagAlvo(e.target) : '',
        penActive: penState.active,
        penLastX: Math.round(penState.lastX || 0),
        penLastY: Math.round(penState.lastY || 0),
        rafPending: !!(traco && traco.rafPending),
        touchW: w != null ? Math.round(w) : null,
        touchH: h != null ? Math.round(h) : null,
        touchAction: diagTouchAction(),
        scrollY: scrollY,
        scrollDelta: base != null ? (scrollY - base) : null,
        bodyClasses: (function () {
          var b = document.body, r = [];
          if (b.classList.contains('rm2-t-pen')) r.push('rm2-t-pen');
          if (b.classList.contains('rm2-pen-down')) r.push('rm2-pen-down');
          if (b.classList.contains('rm2-drawing')) r.push('rm2-drawing');
          if (b.classList.contains('rm2-t-eraser')) r.push('rm2-t-eraser');
          if (b.classList.contains('rm2-t-highlight')) r.push('rm2-t-highlight');
          return r.join(' ');
        })()
      };
      if (extra) { for (var k in extra) if (extra.hasOwnProperty(k)) entrada[k] = extra[k]; }
      diag.push(entrada);
      if (diag.length > DIAG_MAX) diag.shift();
      if (e && e.pointerId != null && (tipo === 'pointerup' || tipo === 'pointercancel')) {
        delete diagScrollBase[e.pointerId];
      }
      if (diagAberto()) diagVPedirRender();
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
  /* 2b-bis · RENDIMIENTO — opt-in (#456 P0), SÓ com o painel aberto      */
  /* ================================================================== */

  /* O defeito da caneta no tablet real escapou ao emulador: os números que importam (quanto demora o pointerdown, quando aparece o primeiro quadro, quantas vezes o
     navegador deixou a thread principal parada durante o traço, quantos pointercancel/lostpointercapture) só o aparelho de verdade sabe. Isto mede isso no próprio
     aparelho — SÓ enquanto o painel de diagnóstico estiver ABERTO (o aluno o abre de propósito, pelo botão do painel de ferramentas; fecha = para e apaga tudo).
     Guarda APENAS NÚMEROS (milissegundos e contagens): nenhum texto da matéria, nenhuma coordenada, nenhuma nota, nenhum UID/e-mail, nada em localStorage, nada para o servidor. */
  var BUILD_456 = '2026-10-09·456c';
  var perf = null;                          // null = desligado (custo zero nos handlers: um `if`)
  var perfOuvinteModos = false;
  var semGuardaTeste = false;               // A/B do reteste físico: ligado = o piloto usa a regra LEGADA (touch-action no contêiner) em vez da guarda; só memória, some ao recarregar

  function perfLigar() {
    if (perf) return;
    perf = { desde: Date.now(), tracos: [], atual: null, trans: [], lt: 0, ltMax: 0, ltSoma: 0, po: null, raf: 0 };
    try {
      if (window.PerformanceObserver) {
        perf.po = new PerformanceObserver(function (l) {
          if (!perf) return;
          l.getEntries().forEach(function (x) { perf.lt++; perf.ltSoma += x.duration; if (x.duration > perf.ltMax) perf.ltMax = x.duration; });
          diagVPedirRender();
        });
        perf.po.observe({ entryTypes: ['longtask'] });
      }
    } catch (e) { perf.po = null; }
    /* troca de bloco/modo: do aviso da troca (RMModes.onChange, mesma tarefa em que o DOM muda) até o 2.º quadro pintado — é o «congelamento» que o aluno sente */
    try {
      if (!perfOuvinteModos && window.RMModes && typeof window.RMModes.onChange === 'function') {
        perfOuvinteModos = true;
        window.RMModes.onChange(function (view, prev, info) {
          if (!perf) return;
          var t0 = performance.now(), rotulo = String(view) + (info && info.block ? '·bloco' : ''), p = perf;
          requestAnimationFrame(function () { requestAnimationFrame(function () {
            if (perf !== p) return;
            p.trans.push({ quando: Date.now(), de: String(prev), para: rotulo, ms: Math.round(performance.now() - t0), toolbox: !!(box && box.classList.contains('open')), tool: st.tool });
            if (p.trans.length > 12) p.trans.shift();
            diagVPedirRender();
          }); });
        });
      }
    } catch (e) {}
  }

  function perfDesligar() {
    if (!perf) return;
    try { if (perf.po) perf.po.disconnect(); } catch (e) {}
    if (perf.raf) { try { cancelAnimationFrame(perf.raf); } catch (e) {} }
    perf = null;
  }

  /* quadro a quadro DURANTE o traço: maior intervalo entre quadros e quantos passaram de 33/50 ms (o «arrasto» da tinta) */
  function perfQuadro(t) {
    var a = perf && perf.atual; if (!a) return;
    if (a.ultQuadro) { var d = t - a.ultQuadro; a.quadros++; if (d > a.quadroMax) a.quadroMax = d; if (d > 33.4) a.q33++; if (d > 50) a.q50++; }
    a.ultQuadro = t;
    perf.raf = requestAnimationFrame(perfQuadro);
  }

  function perfDown(e, t0, lag) {
    if (!perf) return;
    var agora = performance.now();
    var a = perf.atual = {
      tipo: e.pointerType, downMs: agora - t0, lagDown: lag, moves: 0, lagMax: 0, lag50: 0, coalMax: 0, quadros: 0, quadroMax: 0, q33: 0, q50: 0, ultQuadro: 0, primeiraTinta: null,
      upMs: null, fim: 'em curso', pontos: 0, scrollDelta: 0, scrollY0: Math.round(window.pageYOffset)
    };
    var p = perf;
    requestAnimationFrame(function () { if (perf === p && p.atual === a && a.primeiraTinta === null) a.primeiraTinta = performance.now() - e.timeStamp; });   // 1.º quadro depois do toque
    if (perf.raf) { try { cancelAnimationFrame(perf.raf); } catch (x) {} }
    perf.raf = requestAnimationFrame(perfQuadro);
  }

  function perfMove(e) {
    var a = perf && perf.atual; if (!a || !traco || e.pointerId !== traco.pid) return;
    var lag = performance.now() - e.timeStamp;
    a.moves++; if (lag > a.lagMax) a.lagMax = lag; if (lag > 50) a.lag50++;
    try { if (e.getCoalescedEvents) { var n = e.getCoalescedEvents().length; if (n > a.coalMax) a.coalMax = n; } } catch (x) {}
  }

  function perfFimTraco(fim, upMs, pontos) {
    var a = perf && perf.atual; if (!a) return;
    a.fim = fim; a.upMs = upMs; a.pontos = pontos || 0;
    try { a.scrollDelta = Math.abs(Math.round(window.pageYOffset) - a.scrollY0); } catch (x) {}      // uma leitura só, no fim (ler a rolagem a cada move forçaria layout e distorceria a medida)
    perf.tracos.push(a); if (perf.tracos.length > 8) perf.tracos.shift();
    perf.atual = null;
    if (perf.raf) { try { cancelAnimationFrame(perf.raf); } catch (x) {} perf.raf = 0; }
    diagVPedirRender();
  }

  function perfNum(v, c) { return v == null || v !== v ? '–' : String(Math.round(v * (c ? 10 : 1)) / (c ? 10 : 1)); }

  function perfLinhas() {
    var L = [];
    L.push('build=' + BUILD_456 + ' · guarda=' + (document.body.classList.contains('rm2-pilot-guard') ? 'sim' : 'não') + ' · toolbox=' + (box && box.classList.contains('open') ? 'aberta' : 'fechada') + ' · ferramenta=' + st.tool);
    var fl = null; try { fl = window.RMPilot && window.RMPilot._estado && window.RMPilot._estado().flags; } catch (e) {}
    L.push('acesso à V2: ' + (acessoVia || '?') + ' · piloto físico: ' + (pilotoPermitido() ? (st.uid === JOSE_UID ? 'sim (conta do piloto no código)' : 'sim (servidor: pen)') : 'não') + ' · flags do servidor: layout=' + (fl ? String(!!fl.layout) : '?') + ' visual=' + (fl ? String(!!fl.visual) : '?') + ' pen=' + (fl ? String(!!fl.pen) : '?') + ' · teste sem guarda: ' + (semGuardaTeste ? 'LIGADO (regra legada)' : 'desligado'));
    if (!perf) return L;
    L.push('tarefas longas (≥50 ms): ' + perf.lt + ' · máx ' + perfNum(perf.ltMax) + ' ms · soma ' + perfNum(perf.ltSoma) + ' ms · desde ' + Math.round((Date.now() - perf.desde) / 1000) + ' s');
    var t = perf.tracos;
    if (!t.length) L.push('traços: nenhum ainda — escreva com a caneta (algumas letras e palavras)');
    t.forEach(function (a, i) {
      L.push('traço ' + (i + 1) + ' [' + a.tipo + '] pointerdown ' + perfNum(a.downMs, 1) + ' ms (fila ' + perfNum(a.lagDown) + ') · 1.º quadro ' + perfNum(a.primeiraTinta) + ' ms · moves ' + a.moves +
        ' (agrup. máx ' + a.coalMax + ') · fila máx ' + perfNum(a.lagMax) + ' ms (>50: ' + a.lag50 + ') · quadros máx ' + perfNum(a.quadroMax) + ' ms (>33: ' + a.q33 + ', >50: ' + a.q50 + ') · pointerup ' + perfNum(a.upMs, 1) +
        ' ms · pontos ' + a.pontos + ' · rolagem ' + a.scrollDelta + ' px · fim=' + a.fim);
    });
    L.push('pointercancel: ' + (perf.pc || 0) + ' · captura perdida no meio do traço: ' + (perf.lpc || 0));
    if (!perf.trans.length) L.push('trocas de bloco/modo: nenhuma ainda — troque de bloco e de modo com a caixa aberta');
    perf.trans.forEach(function (x, i) { L.push('troca ' + (i + 1) + ': ' + x.de + ' → ' + x.para + ' · até o 2.º quadro ' + x.ms + ' ms · toolbox ' + (x.toolbox ? 'aberta' : 'fechada') + ' · ferramenta ' + x.tool); });
    return L;
  }

  function perfCopiar() {
    var txt = 'REPASSO MED · diagnóstico de rendimiento (#456) — solo números\n' + perfLinhas().join('\n');
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { toast('Resumen copiado'); }, function () { perfCopiarFallback(txt); }); return; } } catch (e) {}
    perfCopiarFallback(txt);
  }
  function perfCopiarFallback(txt) {
    try { var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('Resumen copiado'); }
    catch (e) { toast('No se pudo copiar', true); }
  }

  /* ================================================================== */
  /* 2c · PAINEL DE DIAGNÓSTICO VISUAL — SÓ PILOTO, SÓ EM MEMÓRIA        */
  /* ================================================================== */

  /* `debug()` exige DevTools; no piloto físico (tablet, José, Semiología
     II) DevTools raramente está à mão. Este painel mostra o MESMO anel
     `diag` já preenchido pelos pontos de `diagLog()` espalhados pelo
     ficheiro — não duplica captura nenhuma, só desenha o que já existe.

     Restrito a `pilotoPermitido()`: fora do piloto o botão nem aparece no
     DOM visível e `abrirDiag()` recusa-se a abrir. Continua a não enviar
     nada para servidor nem localStorage — vive no separador e morre com
     ele, exactamente como `diag`. */
  var diagVCaixa = null;
  var diagVRaf = 0;

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

  function diagVLinha(l) {
    if (l.tipo === 'touch-adapter-start' || l.tipo === 'touch-adapter-end') {
      return '<div class="rm2-diag-r pen">' +
        '<b>+' + (l.t - (diag[0] ? diag[0].t : l.t)) + 'ms · ' + dEsc(l.tipo) +
          ' · touchId=' + dEsc(l.identifier) + '</b>' +
        '<i>' + (l.touchType ? 'touchType=' + dEsc(l.touchType) + ' · cancelable=' + (l.cancelableTouch ? 'SIM' : 'NÃO') : 'motivo=' + dEsc(l.motivo)) +
          (l.maxDeltaScroll != null ? ' · scrollMáx=' + dEsc(l.maxDeltaScroll) + 'px' : '') + '</i>' +
      '</div>';
    }
    return '<div class="rm2-diag-r' + (l.pointerType === 'pen' ? ' pen' : '') + '">' +
      '<b>+' + (l.t - (diag[0] ? diag[0].t : l.t)) + 'ms · ' + dEsc(l.tipo) +
        ' · type=' + dEsc(l.pointerType == null ? '(null)' : (l.pointerType === '' ? '(vazio)' : l.pointerType)) +
        ' id=' + dEsc(l.pointerId) + ' prim=' + (l.isPrimary ? '1' : '0') + '</b>' +
      '<i>btns=' + dEsc(l.buttons) + ' pres=' + dNum(l.pressure, 3) +
        ' w×h=' + dEsc(l.touchW) + '×' + dEsc(l.touchH) +
        ' tilt=' + dNum(l.tiltX) + '/' + dNum(l.tiltY) + '</i>' +
      '<i>scrollY=' + dEsc(l.scrollY) + ' Δ=' + (l.scrollDelta == null ? '–' : ((l.scrollDelta > 0 ? '+' : '') + l.scrollDelta)) +
        ' · cancelable=' + (l.cancelable ? 'SIM' : 'NÃO') + '</i>' +
      '<i>tool=' + dEsc(l.tool) + ' penContact=' + (l.penActive ? 'SIM' : 'NÃO') +
        ' traço=' + (l.traco ? 'SIM' : 'NÃO') +
        ' captura=' + (l.captura ? 'SIM' : 'NÃO') +
        ' · ta=' + dEsc(l.touchAction) + ' · ' + dEsc(l.bodyClasses || '(nenhuma)') + '</i>' +
      '<i>alvo=' + dEsc(l.alvo || '(?)') +
        (l.anchorId ? ' · anchor=' + dEsc(l.anchorId) + (l.via ? ' via ' + dEsc(l.via) : '') : '') + '</i>' +
    '</div>';
  }

  function diagVRender() {
    if (!diagAberto()) return;
    var corpo = diagVCaixa.querySelector('.rm2-diag-b');
    var resumo = diagVCaixa.querySelector('.rm2-diag-s');
    if (resumo) {
      resumo.innerHTML =
        '<span>tool=<b>' + dEsc(st.tool) + '</b></span>' +
        '<span>penContact=<b>' + (penState.active ? 'SIM' : 'NÃO') + '</b></span>' +
        '<span>traço=<b>' + (traco ? 'SIM' : 'NÃO') + '</b></span>' +
        '<span>touch-action=<b>' + dEsc(diagTouchAction()) + '</b></span>' +
        '<span>scrollY=<b>' + Math.round(window.pageYOffset) + '</b></span>' +
        '<span>eventos=<b>' + diag.length + '</b></span>';
    }
    var bg = diagVCaixa.querySelector('[data-d="guarda"]'); if (bg) bg.textContent = 'Sin guarda: ' + (semGuardaTeste ? 'sí' : 'no');
    var pf = diagVCaixa.querySelector('.rm2-diag-p');
    if (pf) pf.innerHTML = perfLinhas().map(function (l) { return '<div>' + dEsc(l) + '</div>'; }).join('');
    if (corpo) {
      if (!diag.length) {
        corpo.innerHTML = '<div class="rm2-diag-v">Sin eventos todavía. Escribí en la materia.</div>';
      } else {
        var h = [];
        for (var i = diag.length - 1; i >= 0; i--) h.push(diagVLinha(diag[i]));
        corpo.innerHTML = h.join('');
      }
    }
  }

  function diagVPedirRender() {
    if (diagVRaf || !diagAberto() || traco) return;       // com traço em curso não se redesenha o painel (distorceria a medida do próprio traço); perfFimTraco() pede o render no fim
    diagVRaf = requestAnimationFrame(function () { diagVRaf = 0; diagVRender(); });
  }

  function limparDiag() {
    diag.length = 0;
    if (perf) { perf.tracos = []; perf.atual = null; perf.trans = []; perf.lt = 0; perf.ltMax = 0; perf.ltSoma = 0; perf.pc = 0; perf.lpc = 0; }
    diagVRender();
  }

  function abrirDiag() {
    if (!pilotoPermitido()) return;             // fora do piloto: nunca abre
    if (diagAberto()) return;
    diagVCaixa = document.createElement('div');
    diagVCaixa.className = 'rm2-diag';
    diagVCaixa.setAttribute('role', 'region');
    diagVCaixa.setAttribute('aria-label', 'Diagnóstico del lápiz');
    diagVCaixa.innerHTML =
      '<div class="rm2-diag-h">' +
        '<b>Diagnóstico del lápiz</b>' +
        '<button type="button" data-d="guarda">Sin guarda: no</button>' +
        '<button type="button" data-d="copy">Copiar resumen</button>' +
        '<button type="button" data-d="clear">Limpiar</button>' +
        '<button type="button" data-d="close" aria-label="Cerrar">×</button>' +
      '</div>' +
      '<div class="rm2-diag-s"></div>' +
      '<div class="rm2-diag-p"></div>' +
      '<div class="rm2-diag-b"></div>';
    diagVCaixa.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-d]'); if (!b) return;
      var dd = b.getAttribute('data-d');
      if (dd === 'clear') limparDiag(); else if (dd === 'copy') perfCopiar();
      else if (dd === 'guarda') { semGuardaTeste = !semGuardaTeste; refletir(); }
      else fecharDiag();
    });
    document.body.appendChild(diagVCaixa);
    perfLigar();                                // opt-in: só mede enquanto o painel está aberto
    diagVRender();
    refletir();
  }

  /* Sem chamar `refletir()` — é a versão usada DE DENTRO de `refletir()`
     (quando o piloto deixa de valer a meio, ex.: trocou de matéria com o
     painel aberto), onde chamar `refletir()` outra vez criaria recursão.
     `fecharDiag()`, usada por todo o resto, chama-a e depois reflecte. */
  function fecharDiagSemRefletir() {
    if (diagVCaixa && diagVCaixa.parentNode) diagVCaixa.parentNode.removeChild(diagVCaixa);
    diagVCaixa = null;
    if (diagVRaf) { cancelAnimationFrame(diagVRaf); diagVRaf = 0; }
    perfDesligar();                             // fechar o painel para e apaga as medidas
  }

  function fecharDiag() {
    fecharDiagSemRefletir();
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
   e mantém só a desactivação do double-tap-zoom.

   CORRECÇÃO (auditoria independente sobre o vídeo físico de 30/09/2026,
   José, WhatsApp 17:44:09 — riscos horizontais registavam anchor-ok mas
   a página deslocava-se na vertical): o parágrafo anterior a esta versão
   afirmava que "pen preventDefault()+setPointerCapture() no próprio
   pointerdown, antes de o browser decidir iniciar um pan" bastava porque
   "os motores testados não tratam 'pen' como candidato a scroll rápido
   que ignora preventDefault()". Isto está ERRADO como explicação de
   fundo e o comentário antigo fica corrigido aqui: a nota normativa da
   spec (Pointer Events L2, "declaring candidate regions for default
   touch behaviors" — w3.org/TR/pointerevents2/#declaring-candidate-
   regions-for-default-touch-behaviors) diz explicitamente que, quando o
   touch-action do alvo PERMITE pan num eixo, o user agent tem licença
   para começar a panorâmica optimisticamente e pode IGNORAR
   preventDefault() chamado em qualquer evento — Pointer ou Touch — desse
   gesto. 'pan-x pan-y pinch-zoom' permite pan nos dois eixos de
   propósito (é o que devolve o scroll ao dedo). setPointerCapture()
   só redirecciona onde os eventos SEGUINTES são entregues — não é uma
   API de bloqueio de gesto nativo (não está nessa secção da spec).
   preventDefault() aqui continua a ser chamado (é inofensivo e ajuda
   em alguns motores/casos), mas deixou de ser apresentado como A razão
   de o traço da stylus não rolar a página — ver ligarAdaptadorTouchStylus()
   mais abaixo (Touch Events), que é o mecanismo que esta correcção usa
   para tentar mesmo impedir a panorâmica do PRÓPRIO gesto da stylus, só
   no piloto físico. Fora do piloto, nada deste ficheiro muda: o preventDefault()
   do Pointer Event continua a única tentativa, exactamente como antes. */
body.rm2-t-pen #materias-container{
  touch-action:pan-x pan-y pinch-zoom;
  overscroll-behavior:contain;
}
/* ENQUANTO A STYLUS ESTÁ EM CONTACTO, esta classe tira o pan da área —
   mas só ajuda toques SEGUINTES e SEPARADOS (uma palma que assenta depois
   de a stylus já estar em baixo): para esses, a classe já existe antes
   do início do toque deles, e a spec permite ao browser respeitar
   touch-action:none decidido antes do gesto começar.

   CORRECÇÃO (mesma auditoria da nota acima): esta classe NUNCA pôde
   ajudar o PRÓPRIO gesto da stylus que a activou — penEmContacto(true)
   corre dentro do pointerdown dessa mesma stylus, e o touch-action
   candidato para ESSE toque já tinha sido decidido pelo browser antes de
   qualquer JS correr (era 'pan-x pan-y pinch-zoom', da regra acima,
   armada desde que a ferramenta foi seleccionada). Trocar a classe
   depois não reabre essa decisão — é exactamente a mesma explicação da
   nota grande acima, aplicada aqui. O comentário anterior descrevia um
   teste (palma de 68px a rolar 158px) e concluía correctamente que "quem
   decide o pan é o compositor, ANTES de o JS correr" — mas depois
   generalizava mal, tratando o CASO SEGUINTE (palma depois da stylus) como
   se resolvesse também o caso da PRÓPRIA stylus, que é geometricamente
   diferente (mesmo toque, não um toque seguinte). Mantida por ainda
   ajudar o caso da palma seguinte; NÃO é o mecanismo que protege o traço
   da própria stylus — isso é ligarAdaptadorTouchStylus(). */
body.rm2-t-pen.rm2-pen-down:not(.rm2-pilot-guard) #materias-container{
  touch-action:none;
}
/* PILOTO (#456 P0): a regra acima custa uma RECALCULAÇÃO DE ESTILO DA ÁRVORE INTEIRA a cada contacto da caneta — touch-action efectivo é herdado, então mudá-lo em
   #materias-container reaplica o estilo a todos os descendentes (medido: 12–23 ms a 1× de CPU em CADA pointerdown e em CADA pointerup, ≈ 1 500 a 10 500 elementos; a 6–10× de
   um tablet é 100–200 ms por letra, duas vezes — o «atraso» e o traço que sai tarde). Dentro do piloto físico a mesma proteção (toques SEGUINTES e separados — a palma — não
   fazem pan enquanto a stylus está em baixo) é dada por UM elemento sem filhos: a «guarda» só existe (display) e só intercepta durante o contacto — em repouso é display:none, sem camada nem sobreposição —, com touch-action:none, abaixo de toda a UI
   (faixa 340, lateral 360, toolbox/player/gaveta ≥ 99989) e acima do conteúdo e da tinta (60). Fora do piloto nada muda: segue a regra legada. */
#rm2-penguard{
  display:none; position:fixed; left:0; top:0; right:0; bottom:0; z-index:300;
  pointer-events:none; touch-action:none; background:transparent;
}
body.rm2-pilot-guard.rm2-pen-down #rm2-penguard{ display:block; pointer-events:auto; }
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
/* Indicador PERSISTENTE de "não gravado" (achado D, §2 do relatório de
   auditoria da caneta) — tracejado discreto, ligado desde o início do
   envio até a gravação ser confirmada; não é um efeito passageiro de
   toast. */
#rm2-ink path.rm2-ink-pendiente{ stroke-dasharray:3 3; opacity:.72; }

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
.rm2-w-xthin i{ height:1px; } .rm2-w-thin i{ height:2px; } .rm2-w-medium i{ height:4px; } .rm2-w-thick i{ height:7px; }

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

/* ---------- painel de diagnóstico (só piloto, só memória) ------------
   Canto oposto ao trilho (que fica à direita) e, de propósito, também
   oposto a onde um player de áudio compacto deve ficar (§7 do encargo:
   a caneta não implementa áudio, só não pode colidir com ele). Com
   touch-action:auto para poder ser rolado com o dedo mesmo quando a área
   de leitura estiver bloqueada. Nunca é alvo de anotação (fora de
   #materias-container, no próprio body). */
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
.rm2-diag-p{ padding:6px 10px; border-bottom:1px solid #22405f; flex:0 0 auto; max-height:22vh; overflow:auto; color:#cfe3f7; font-size:11px; }
.rm2-diag-p div{ padding:1px 0; word-break:break-word; }
.rm2-diag-b{ overflow:auto; padding:4px 0 8px; flex:1 1 auto; -webkit-overflow-scrolling:touch; }
.rm2-diag-r{ padding:5px 10px; border-bottom:1px solid rgba(34,64,95,.55); }
.rm2-diag-r b{ display:block; color:#8fd3ff; font-weight:700; }
.rm2-diag-r.pen b{ color:#7dffa8; }
.rm2-diag-r i{ display:block; font-style:normal; color:#b9cde2; word-break:break-word; }
.rm2-diag-v{ padding:14px 10px; color:#8ea6bf; text-align:center; }
@media (max-width:560px){
  .rm2-diag{ width:calc(100vw - 70px); max-height:46vh; font-size:11px; }
}
/* botão do diagnóstico: só existe no DOM para quem está no piloto
   (montado condicionalmente em montar()) — este display:none é uma
   segunda camada, não a única defesa. */
.rm2-btn[data-a="diag"].rm2-piloto-off{ display:none; }

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

  /* Overlays/UI conhecidos que `elementsFromPoint` pode devolver por cima
     do conteúdo — incluindo `[data-rm-ui]` (Layout V2, PR #408: UI
     derivada explicitamente fora das âncoras de highlight). Nunca se
     tenta ancorar dentro de nenhum destes. */
  var OVERLAY_SEL = '.rm2-box,.rm2-notes,.rm2-diag,.rm-tools,.rm-tools-r,.rm-lb,.rm-menu,.rm-sug-fab,#rm-sug,[data-rm-ui]';

  /* Fallback de `anchorDe(e.target)` para um pointerdown de stylus dentro
     da matéria cujo ALVO REAL caiu fora de qualquer `section[id]` antes
     de lá chegar (teste físico do José, tablet real: `anchorDe(e.target)`
     devolvia null e o traço nunca nascia — `traço=NÃO`/`captura=NÃO` no
     diagnóstico, apesar de `tool=pen` e touch-action correctos).

     `elementsFromPoint` devolve a pilha inteira debaixo do ponto; ignoram-
     se os overlays conhecidos e tenta-se `anchorDe()` em cada candidato
     real. Como último recurso seguro, localiza-se a `section[id]` da aba
     activa cuja caixa realmente contém o ponto. NUNCA inventa âncora fora
     da matéria; NUNCA muda `SUB_SEL` nem `anchor_id` — usa exactamente a
     mesma `anchorDe()` e a mesma noção de âncora de sempre, só chegando lá
     por um caminho diferente quando o alvo do evento não chega. */
  function anchorPorPonto(x, y, tab) {
    if (!tab || !document.elementsFromPoint) return null;
    var pilha;
    try { pilha = document.elementsFromPoint(x, y); } catch (e) { return null; }
    for (var i = 0; i < pilha.length; i++) {
      var el = pilha[i];
      if (!tab.contains(el)) continue;
      if (el.closest && el.closest(OVERLAY_SEL)) continue;
      var anc = anchorDe(el);
      if (anc) return anc;
    }
    var secs = tab.querySelectorAll(ANCHOR_SEL);
    for (var j = 0; j < secs.length; j++) {
      var r = secs[j].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return { el: secs[j], id: secs[j].id, sec: secs[j] };
      }
    }
    return null;
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

  /* ------------------------------------------------------------------
     REVISÃO DE CONTEÚDO · «o traço pode mudar de sítio, mas nunca de
     bloco» deixa de valer quando o bloco perdeu tanto conteúdo que o
     sítio novo já não tem nada a ver com o que foi marcado — foi
     exactamente o caso da limpeza #147 em Farmacología II (f2b00): dois
     traços desenhados sobre um diagrama que a própria limpeza remove
     passavam a aparecer sobre outro texto, por coincidência de altura.

     Correcção: qualquer secção pode declarar, no HTML, quando o SEU
     conteúdo mudou de forma estrutural:

       <section id="f2b00" data-rm-content-rev="2026-09-29">

     Um traço cujo `created_at` é ANTERIOR a essa data deixa de ser
     desenhado nessa secção — fica órfão, preservado no banco, nunca
     apagado nem realocado. Um traço criado DEPOIS da revisão (aluno
     desenha de novo, já vendo o conteúdo actual) funciona normalmente.

     Sem o atributo, nada muda: é essa a razão de não ser preciso migrar
     nem tocar nas outras matérias com tinta (Anestesiología, Neurología,
     Ortopedia) — cada uma só passa a filtrar traços quando algum editor
     humano decidir, secção a secção, que houve uma mudança estrutural
     que o justifique. Não lê nem escreve nada no Supabase. */
  function dataRevisaoDaSecao(sec) {
    var rev = sec && sec.getAttribute && sec.getAttribute('data-rm-content-rev');
    if (!rev) return null;
    var t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(rev) ? rev + 'T00:00:00Z' : rev);
    return isNaN(t) ? null : t;
  }

  function tracoOrfaoPorRevisao(rec, alvo) {
    if (!alvo || !rec || !rec.created_at) return false;
    var sec = alvo.matches && alvo.matches(ANCHOR_SEL) ? alvo : (alvo.closest ? alvo.closest(ANCHOR_SEL) : null);
    var revTime = dataRevisaoDaSecao(sec);
    if (revTime === null) return false;
    var criadoEm = Date.parse(rec.created_at);
    if (isNaN(criadoEm)) return false;
    return criadoEm < revTime;
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
    if (tracoOrfaoPorRevisao(rec, alvo)) {
      st.orfaos = st.orfaos || {};
      var lista = (st.orfaos[rec.anchor_id] = st.orfaos[rec.anchor_id] || []);
      if (lista.indexOf(rec.id) === -1) lista.push(rec.id);
      return null;
    }
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

  /* ACHADO E da auditoria independente (#420): um traço muito denso
     (escrita rápida com ruído alto) podia continuar acima de 1200 pontos
     mesmo DEPOIS de uma única decimação — o banco rejeita (constraint
     1..1200), e o traço inteiro se perdia (POST 400). Corrigido: decima
     em LAÇO até caber, não só uma vez. Cada passada no máximo reduz a
     ~metade (índices pares), então o laço termina em poucas iterações
     mesmo para um traço enorme; o tecto de iterações aqui é só rede de
     segurança, nunca deve ser atingido (reduzir de 1200 a menos de 2
     pontos exigiria mais de 600 passadas).

     AUDITORIA INDEPENDENTE (HEAD 11084b7a): o filtro por índice par
     sempre preserva o primeiro ponto, mas só preserva o último se o
     array tiver tamanho ÍMPAR antes da passada — em tamanho par o
     último ponto cai fora, e o fim real do gesto (onde o aluno soltou o
     dedo/caneta) encolhe um pouco a cada passada. Os extremos nunca são
     "mais um ponto qualquer": são onde o traço começou e terminou de
     verdade. Fixados de volta aqui, sempre, independente de quantas
     passadas rodaram. Função pura (sem efeito colateral, sem estado do
     módulo) para o teste poder chamá-la direto com qualquer array
     sintético — ver `_test.decimarPreservandoExtremos`. */
  function decimarPreservandoExtremos(pts, limite) {
    if (!pts.length) return pts;
    var primeiro = pts[0], ultimo = pts[pts.length - 1];
    var ITER_DECIMAR_MAX = 30;
    for (var nDecimar = 0; pts.length > limite && nDecimar < ITER_DECIMAR_MAX; nDecimar++) {
      pts = pts.filter(function (_, i) { return i % 2 === 0; });
    }
    if (pts.length >= 2) { pts[0] = primeiro; pts[pts.length - 1] = ultimo; }
    return pts;
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
  var penState = { active: false, pid: null, lastX: 0, lastY: 0, lastActiveAt: 0, lastContactEndAt: 0 };

  /* Ponto único: o contacto da stylus é o que decide se a área ainda
     oferece pan ao dedo (ver o CSS .rm2-pen-down). Fica junto do estado
     para não haver um caminho de término que se esqueça de o desligar.

     `pid` guarda de QUEM é o contacto em curso — separado de `traco.pid`
     de propósito (teste físico do José, tablet real): o contacto tem de
     poder existir e ser desligado correctamente mesmo quando nenhum
     `traco` chega a nascer para esse pointerId (âncora não resolvida). */
  function penEmContacto(ligado, pid) {
    penState.active = !!ligado;
    penState.pid = ligado ? pid : null;
    if (!ligado) penState.lastContactEndAt = Date.now();
    try { document.body.classList.toggle('rm2-pen-down', !!ligado); } catch (e) {}
  }

  /* Rede de segurança para qualquer interrupção GLOBAL (blur,
     visibilitychange, troca de matéria, resize/rotação — ver
     `reconciliarGesto()`): garante `penContact=false` mesmo quando não há
     nenhum `traco` para basear a limpeza — exactamente o caso que o
     diagnóstico físico expôs (âncora falhou, o contacto tinha ficado
     ligado, e nada que dependesse de `traco` o desligava). */
  function limparContatoPen() {
    if (penState.active) penEmContacto(false, null);
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

  /* Só classifica IMEDIATAMENTE como palma quando há EVIDÊNCIA DIRECTA
     desse toque — contacto concorrente com a stylus (`pen-ativa`) ou um
     contacto fisicamente grande (`contato-grande`). `pen-recente` e
     `perto` são só circunstanciais (quando/onde), nunca sobre o toque em
     si, e SOZINHOS OU SOMADOS ENTRE SI não bastam mais para bloquear de
     imediato.

     Achado do vídeo físico de 30/09/2026 (auditoria independente): logo
     a seguir a levantar a stylus, o gesto deliberado de "escrever e já a
     seguir rolar com o mesmo dedo, do mesmo sítio" pontuava exactamente
     `pen-recente` (1) + `perto` (1) = 2 = PALM_LIMIAR — porque é
     fisicamente impossível o dedo começar a rolar noutro lugar que não
     perto de onde se acabou de escrever. Isso classificava como palma e
     bloqueava um "NOVO gesto deliberado de dedo" que devia navegar
     IMEDIATAMENTE (requisito explícito desta correcção). A combinação
     fraca agora cai em `touchNav` como qualquer outra — se o dedo se MOVE
     de forma sustida (um scroll real), sai de lá sem nunca ter sido
     bloqueado; só se ficar PARADO é que `reconsiderarNavegacao()` (abaixo)
     o promove a palma — cobrindo a palma que assenta e não se mexe, sem
     penalizar o scroll deliberado que a spec/o pedido exigem. */
  function evidenciaDirectaDePalma(motivos) {
    return motivos.indexOf('pen-ativa') !== -1 || motivos.indexOf('contato-grande') !== -1;
  }

  /* Roteia um toque (dedo) enquanto a ferramenta é a caneta. Chamado do
     pointerdown partilhado — nunca cria stroke, nunca captura o ponteiro:
     um toque legítimo de navegação deve continuar exactamente como se
     esta função nem existisse (sem preventDefault, sem setPointerCapture),
     para o browser tratar o pan/pinch nativamente. */
  function rotearToqueComCanetaArmada(e) {
    if (touchPalm[e.pointerId]) { tratarComoPalma(e, touchPalm[e.pointerId].motivos, true); return; }
    var r = pontuarPalma(e);
    if (r.pontos >= PALM_LIMIAR && evidenciaDirectaDePalma(r.motivos)) { tratarComoPalma(e, r.motivos, false); return; }
    touchNav[e.pointerId] = { x0: e.clientX, y0: e.clientY, xUlt: e.clientX, yUlt: e.clientY, t0: Date.now() };
    diagLog('touch-nav', e, { classificacao: 'navigation', razao: 'score-sem-evidencia-directa:' + r.pontos + ':' + r.motivos.join('+') });
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

  /* ------------------------------------------------------------------
     ADAPTADOR DE TOUCH EVENTS · só piloto físico (José + Semiología II)

     Abordagem preferencial da correcção do deslocamento vertical (§2 do
     encargo, achado do vídeo de 30/09/2026): a nota normativa da spec de
     Pointer Events (ver comentário grande no CSS, acima) diz que, quando
     touch-action permite pan, preventDefault() num Pointer Event pode
     ser ignorado pelo browser. O candidato aqui é diferente: TouchEvent,
     listener explicitamente NÃO passivo, preventDefault() no PRÓPRIO
     touchstart (ou no primeiro touchmove seguinte, se o touchstart não
     for cancelable), antes de o browser confirmar a panorâmica — o
     mecanismo clássico e documentado para "a página não rola durante
     este toque específico", independente do valor de touch-action.

     Isto é aditivo, nunca substitui o motor de desenho: NUNCA cria
     `traco`, NUNCA chama `filaGravar`, NUNCA mexe em `apagando` — só
     tenta impedir a navegação nativa para o contacto que identificar como
     stylus. Quem desenha continua a ser inteiramente o caminho de Pointer
     Events (`onDown`/`onMove`/`onUp`), como antes. `Touch.identifier` é
     tratado como um espaço de chaves PRÓPRIO, nunca comparado nem
     cruzado com `pointerId` — a spec não garante equivalência entre os
     dois, mesmo quando na prática certos browsers usam o mesmo número.

     Identificação por `Touch.touchType==='stylus'` (extensão WebKit,
     Touch.touchType 'direct'|'stylus'|'unknown' conforme
     w3c.github.io/touch-events/). Onde essa propriedade não existir ou
     vier 'unknown'/'direct', o toque NÃO é interceptado por este
     adaptador — ausência de identificação confiável é tratada como
     LIMITAÇÃO (o toque segue exactamente como antes desta correcção,
     pelo caminho de Pointer Events + rejeição de palma de sempre), nunca
     como "detectámos que não é stylus, logo é seguro".

     Registo dos listeners (correcção do blocker de auditoria): sem
     `window.TouchEvent`, ou para qualquer conta que não seja a do José
     (`st.uid !== JOSE_UID`), `ligarAdaptadorTouchStylus()` nem chega a
     chamar `addEventListener` — zero listener não-passivo novo para um
     segundo `BETA_UID` ou para quem só tem `study_tools_beta`, mesmo que a
     V2 tenha sido montada para essa conta. Isto é distinto da elegibilidade
     por gesto: com a conta do José montada mas fora de Semiología II (ou
     fora da ferramenta lápis), os listeners existem mas
     `touchAdapterElegivel()` continua a barrar `pilotoPermitido()`/
     `st.tool`/`touchType`/alvo — nenhum `preventDefault()`, nenhuma entrada
     em `stylusTouches`, comportamento da matéria exactamente como antes. */
  var TOUCH_ADAPTER_EXCLUIR = '.rm2-box,.rm2-notes,.rm2-diag,.rm-tools,.rm-tools-r,.rm-lb,.rm-menu,.rm-sug-fab,#rm-sug';
  var stylusTouches = {};   // Touch.identifier -> { x0, y0, scrollY0, scrollX0, maxDeltaScroll }

  function touchAdapterElegivel(touch) {
    if (!pilotoPermitido() || st.tool !== 'pen') return false;
    if (touch.touchType !== 'stylus') return false;
    if (lbAberto()) return false;
    var alvo = touch.target;
    if (alvo && alvo.closest && alvo.closest(TOUCH_ADAPTER_EXCLUIR)) return false;
    if (!alvo || !alvo.closest || !alvo.closest('#materias-container')) return false;
    return true;
  }

  function onTouchStartAdaptador(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (!touchAdapterElegivel(t)) continue;
      stylusTouches[t.identifier] = {
        x0: t.clientX, y0: t.clientY,
        scrollY0: window.pageYOffset, scrollX0: window.pageXOffset,
        maxDeltaScroll: 0
      };
      diagLog('touch-adapter-start', null, {
        identifier: t.identifier, touchType: t.touchType, cancelableTouch: e.cancelable
      });
      if (e.cancelable) e.preventDefault();
    }
  }

  function onTouchMoveAdaptador(e) {
    var algumNosso = false;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      var reg = stylusTouches[t.identifier];
      if (!reg) continue;
      algumNosso = true;
      /* deslocamento REAL do scroll durante o contacto — não se aceita só
         a classe CSS nem defaultPrevented como prova (§6 do encargo). */
      var dScroll = Math.max(
        Math.abs(window.pageYOffset - reg.scrollY0),
        Math.abs(window.pageXOffset - reg.scrollX0)
      );
      if (dScroll > reg.maxDeltaScroll) reg.maxDeltaScroll = dScroll;
    }
    if (algumNosso && e.cancelable) e.preventDefault();
  }

  function limparTouchAdaptador(identifier, motivo) {
    var reg = stylusTouches[identifier];
    if (!reg) return;
    diagLog('touch-adapter-end', null, {
      identifier: identifier, motivo: motivo, maxDeltaScroll: Math.round(reg.maxDeltaScroll)
    });
    delete stylusTouches[identifier];
  }

  function onTouchFimAdaptador(e) {
    var motivo = e.type === 'touchcancel' ? 'touchcancel' : 'touchend';
    for (var i = 0; i < e.changedTouches.length; i++) limparTouchAdaptador(e.changedTouches[i].identifier, motivo);
  }

  /* Rede de segurança para interrupção global (troca de matéria, resize,
     blur, app-switch — os mesmos motivos de `reconciliarGesto()`): nenhum
     identifier deste adaptador pode sobreviver a uma reconciliação. */
  function limparTodosOsTouchesAdaptador(motivo) {
    for (var id in stylusTouches) limparTouchAdaptador(id, motivo || 'reconciliar');
  }

  var adaptadorLigado = false;
  function ligarAdaptadorTouchStylus() {
    if (adaptadorLigado) return;
    if (typeof window.TouchEvent === 'undefined') return;   // sem Touch Events: sem adaptador, sem afirmar sucesso
    if (st.uid !== JOSE_UID && !penLiberadaPeloServidor()) return;   // blocker de auditoria: só a conta física do José — ou quem o servidor liberou com `pen:true` (#456) — chega a registar estes listeners; nunca outro BETA_UID nem study_tools_beta
    adaptadorLigado = true;
    document.addEventListener('touchstart', onTouchStartAdaptador, { passive: false });
    document.addEventListener('touchmove', onTouchMoveAdaptador, { passive: false });
    document.addEventListener('touchend', onTouchFimAdaptador, { passive: true });
    document.addEventListener('touchcancel', onTouchFimAdaptador, { passive: true });
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
    if (!perf) { onDownImpl(e); return; }                          // diagnóstico desligado: custo zero
    var t0 = performance.now(), lag = t0 - e.timeStamp;
    try { onDownImpl(e); } finally { if (traco && traco.pid === e.pointerId) perfDown(e, t0, lag); }
  }

  function onDownImpl(e) {
    if (st.tool !== 'pen' && st.tool !== 'eraser') return;
    diagLog('pointerdown', e);
    if (lbAberto()) { diagLog('reject:lightbox', e); return; }     // zoom aberto: caneta suspensa
    if (e.target && e.target.closest && e.target.closest('.rm2-box,.rm2-notes,.rm2-diag,.rm-tools,.rm-lb,.rm-menu,.rm-sug-fab,#rm-sug')) {   // .rm2-diag: com a caneta armada, tocar nos botões do diagnóstico com a PONTA não pode começar um traço por baixo do painel (#456)
      diagLog('reject:ui', e); return;
    }
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

    /* PILOTO FÍSICO — José + Semiología II (`pilotoPermitido()`, já
       existente). Achado da auditoria independente da PR #412: nenhuma
       das mudanças abaixo tinha este portão, então os dois `BETA_UIDS`
       antigos e qualquer liberado por `study_tools_beta` já recebiam o
       comportamento novo só por terem `st.tool==='pen'`. Daqui em diante,
       `pilotoFisico` decide sozinho: dentro dele corre o código novo
       (contacto antecipado, fallback de âncora, diagnóstico de âncora);
       fora dele, o resto desta função é o código de ANTES desta correcção
       — byte a byte, sem nenhuma mudança para esses utilizadores. A GOMA
       nunca entra em `pilotoFisico` (não fazia parte do bug reportado;
       `anchorDe` dela continua exactamente como sempre, sem fallback). */
    var pilotoFisico = st.tool === 'pen' && pilotoPermitido();

    /* CONTACTO FÍSICO da stylus — marcado AQUI, antes de qualquer
       resolução de âncora ou de qualquer outra guarda, porque tem de
       existir mesmo quando nenhum traço chega a nascer. SÓ no piloto —
       ver acima.

       Achado do teste físico do José (tablet real): o diagnóstico
       mostrava `tool=pen`, `cancelable=SIM` e o touch-action a mudar
       correctamente, mas `traço=NÃO`/`captura=NÃO` — o pointerdown
       morria mais abaixo, em `anchorDe()`, e como `penEmContacto(true)`
       só corria DEPOIS da âncora resolver (ver o `else` mais abaixo,
       que é exactamente esse código antigo, preservado para fora do
       piloto), o contacto nunca chegava a ser registado nem o
       `rm2-pen-down`/touch-action:none entravam a tempo. Três coisas
       conceptualmente distintas, nunca confundidas entre si: ferramenta
       seleccionada (`st.tool`), contacto físico (`penState`) e traço
       activo (`traco`) — nenhuma decide a toolbox ou o scroll sozinha
       por outra.

       `preventDefault()` aqui é só a segunda camada de sempre — NÃO
       prova, sozinho, que o scroll nativo fica bloqueado (ver a correcção
       do bloco de CSS/touch-action mais abaixo e o adaptador de Touch
       Events em `ligarAdaptadorTouchStylus()`, que é quem de facto tenta
       impedir a navegação da PRÓPRIA stylus). Restrito a `pointerType
       ==='pen'` explicitamente — achado da auditoria independente da PR
       #412: `pilotoFisico` sozinho não filtra `pointerType`, então um
       clique de RATO (botão esquerdo OU direito, antes mesmo da rejeição
       de botão mais abaixo) com o lápis seleccionado marcava «contacto
       físico da stylus» para um evento que nunca foi stylus nenhuma. */
    if (pilotoFisico && e.pointerType === 'pen' &&
        e.target && e.target.closest && e.target.closest('#materias-container')) {
      if (!penState.active || penState.pid === e.pointerId) {
        penEmContacto(true, e.pointerId);
        registarPen(e);
      }
      if (e.cancelable) e.preventDefault();
    }

    if (traco || apagando) { diagLog('reject:stroke-active', e); return; }   // rejeição de palma/2.º ponteiro
    if (e.pointerType === 'mouse' && e.button !== 0) { diagLog('reject:mouse-button', e); return; }

    var anc;
    if (pilotoFisico) {
      var tab = abaAtiva();
      if (!tab) { diagLog('reject:no-active-tab', e); return; }
      /* anchorDe(e.target) primeiro, como sempre. Só quando o alvo REAL
         cai fora de qualquer section[id] antes de lá chegar — por
         exemplo um elemento de UI derivada do Layout V2 ([data-rm-ui],
         PR #408, explicitamente fora das âncoras de highlight) — é que
         se tenta anchorPorPonto(), que usa elementsFromPoint ignorando
         overlays/UI e, como último recurso, a section[id] cuja caixa
         contém o ponto. NUNCA inventa âncora fora da matéria; NUNCA muda
         SUB_SEL/anchor_id. Só dentro do piloto — fora dele, a linha
         `else` abaixo é o `anchorDe()` simples de sempre, sem fallback. */
      var ancDireta = anchorDe(e.target);
      anc = ancDireta || anchorPorPonto(e.clientX, e.clientY, tab);
      if (!anc) { diagLog('reject:no-anchor', e); return; }
      diagLog('anchor-ok', e, { anchorId: anc.id, via: ancDireta ? 'target' : 'ponto' });
    } else {
      anc = anchorDe(e.target);
      if (!anc) return;
    }
    var sec = anc.el;

    /* A goma aceita o dedo — um toque apaga e nunca chega a impedir o
       scroll, porque não se faz preventDefault para touch. O lápis, esse,
       só responde a stylus e rato: o dedo já foi tratado acima. */
    if (st.tool === 'eraser') { comecarApagar(e, sec); return; }
    if (!ehPonteiroDeDesenho(e)) { if (pilotoFisico) diagLog('reject:not-drawing-pointer', e); return; }

    /* Fora do piloto físico, o contacto é marcado só AQUI — exactamente
       como era antes desta correcção (depois da âncora resolver). */
    if (e.pointerType === 'pen' && !pilotoFisico) { penEmContacto(true, e.pointerId); registarPen(e); }

    var b = caixa(sec);
    traco = {
      sec: sec, box: b, pts: [], pid: e.pointerId,
      tipo: e.pointerType,
      rafId: null, rafPending: false, pathState: null,
      rec: {
        id: novoIdTraco(),
        anchor_id: anc.id, color: st.penColor, width: st.penWidth, points: []
      }
    };
    var svg = svgDe(sec, anc.id);
    traco.path = novoPath(traco.rec);
    svg.appendChild(traco.path);

    document.body.classList.add('rm2-drawing');
    try { sec.setPointerCapture && sec.setPointerCapture(e.pointerId); } catch (err) {}
    addPonto(e);
    /* Primeira tinta síncrona, só piloto físico — ver `pintarPrimeiraTinta()`
       mais abaixo (§ refinamento de latência de renderização). Fora do
       piloto, o traço só aparece no primeiro pointermove, exactamente como
       antes desta correcção — nenhuma mudança de comportamento para eles. */
    if (pilotoFisico) pintarPrimeiraTinta();
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

  /* PRIMEIRA TINTA SÍNCRONA · medido: sem isto, o `d` do path fica vazio
     ('' — `novoPath()` é chamado com `rec.points` ainda vazio) desde a
     criação do traço até ao primeiro `pointermove` seguido do próximo
     `requestAnimationFrame`, porque `onDown()` nunca chama
     `agendarRenderizacao()` — só `onMove()` chama. Contacto sem nenhum
     movimento a seguir (ou um SO/dispositivo lento a entregar o primeiro
     `pointermove`) fica, até lá, sem nenhuma tinta visível.

     Chamada UMA VEZ, dentro do próprio `onDown()`, na mesma tarefa do
     `pointerdown` — sem esperar por frame nenhum. Único ponto capturado
     ainda: inicializa-se `pathState` com `novoPathIncremental()` de
     sempre (fica exactamente "M x y", `congelado:0`, sem mudança nenhuma
     nessa função partilhada com todos os utilizadores) e pinta-se um `d`
     LOCAL com um "L" extra para o mesmo ponto — comando de comprimento
     zero que o `stroke-linecap:round` já existente em `#rm2-ink path`
     transforma num ponto visível no local exacto do contacto. Não se
     grava esse "L" de volta em `traco.pathState.d`: a próxima chamada a
     `pathIncremental()` (no primeiro `onMove`/RAF real) continua a partir
     do "M x y" original, produzindo exactamente o mesmo resultado de
     sempre — este ponto extra é só um retrato temporário do primeiro
     frame, substituído no seguinte.

     Só piloto físico (José + Semiología II) — ver a chamada em `onDown()`.
     Fora do piloto, nada aqui corre: o traço continua a só aparecer no
     primeiro `pointermove`, byte a byte como antes desta correcção. */
  function pintarPrimeiraTinta() {
    if (!traco || traco.pts.length !== 1) return;
    if (!traco.pathState) traco.pathState = novoPathIncremental(traco.pts);
    var p = traco.pts[0];
    traco.path.setAttribute('d', traco.pathState.d + 'L' + n1000(p[0]) + ' ' + n1000(p[1]));
  }

  /* Cancela um RAF pendente sem tentar desenhar num traço já destruído
     (§17 do encargo). Chamado de todos os pontos de término/cancelamento,
     nunca só de um. */
  function cancelarRenderizacaoPendente(t) {
    if (t && t.rafId != null) { try { cancelAnimationFrame(t.rafId); } catch (err) {} }
  }

  function onUp(e) {
    if (!perf || !perf.atual) { onUpImpl(e); return; }
    var t0 = performance.now(), a = perf.atual, ok = !!(traco && e && e.pointerId === traco.pid), np = traco ? traco.pts.length : 0;
    try { onUpImpl(e); } finally { if (ok) perfFimTraco('up', performance.now() - t0, np); }
  }

  function onUpImpl(e) {
    diagLog('pointerup', e);
    /* Contacto limpo AQUI, por pointerId, independente de existir traço —
       se a âncora tivesse falhado no onDown, `traco` seria null mas o
       contacto ainda estaria ligado; sem isto `rm2-pen-down` ficava preso
       (teste físico do José). SÓ no piloto físico: fora dele o contacto
       nunca é marcado antes da âncora resolver (ver onDown), por isso
       nunca fica ligado sem `traco` — a limpeza de sempre, mais abaixo,
       já basta. `pilotoPermitido()` reavaliado aqui de propósito: é o
       mesmo portão do início do gesto, não um estado novo. */
    if (e && e.pointerType === 'pen' && pilotoPermitido() && penState.active && e.pointerId === penState.pid) penEmContacto(false);
    if (apagando) { terminarApagar(); return; }
    if (!traco || (e && e.pointerId !== traco.pid)) return;
    var t = traco; traco = null;
    /* Flush (§16): não há nada para "consumir" do RAF — a captura de
       pontos é síncrona no onMove (§13), por isso `t.pts` já tem tudo.
       Cancela-se o frame pendente só para não desenhar, à toa, num traço
       que está prestes a ser substituído pelo `d` final e definitivo. */
    cancelarRenderizacaoPendente(t);
    if (t.tipo === 'pen') penEmContacto(false);   // código de antes desta correcção — cobre o caso fora do piloto
    libertar(t.sec, t.pid);
    document.body.classList.remove('rm2-drawing');

    try {
      /* A simplificação corre em PÍXEIS, não em unidades normalizadas: um
         bloco muito alto faz 40 px verticais valerem 0,002 em y, e um RDP
         cego a isso achatava a escrita numa recta. */
      var pts = simplificarEmPixeis(t.pts, t.box, 0.7);
      pts = decimarPreservandoExtremos(pts, 1200);

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
    if (perf) { perf.pc = (perf.pc || 0) + 1; if (perf.atual && traco && e && e.pointerId === traco.pid) perfFimTraco('POINTERCANCEL', null, traco.pts.length); }
    diagLog('pointercancel', e);
    if (e && e.pointerType === 'pen' && pilotoPermitido() && penState.active && e.pointerId === penState.pid) penEmContacto(false);
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
    /* Contacto físico da stylus também não pode sobreviver a nenhuma
       destas interrupções — mesmo quando não havia `traco` nenhum para
       `abortarTraco()` limpar (âncora falhou, contacto ficou ligado). */
    limparContatoPen();
    /* Idem para o adaptador de Touch Events — nenhum identifier seu pode
       ficar a impedir scroll depois de uma interrupção global. */
    limparTodosOsTouchesAdaptador(motivo);
  }

  /* Um traço cuja secção já saiu do documento é lixo: a matéria foi
     trocada ou reinjectada por baixo dele. Serve de rede para qualquer
     caminho futuro que se esqueça de chamar a reconciliação. */
  function gestoMorto() {
    if (!traco) return false;
    return !traco.sec || !document.contains(traco.sec);
  }

  /* ACHADO C: o 23505 só é aceito como "já está gravado" depois de uma
     leitura de confirmação — nunca confiando só no código de erro.
     "Repetição de INSERT só conta como sucesso depois de confirmar o
     registo correspondente." */
  function ehViolacaoDeChaveDuplicada(err) {
    return !!(err && (err.code === '23505' || /duplicate key|unique constraint/i.test(err.message || '')));
  }
  async function confirmarRegistoGravado(s, uid, id) {
    try {
      var r = await s.from('user_ink_strokes').select('id').eq('user_id', uid).eq('id', id).maybeSingle();
      return !r.error && !!(r.data && r.data.id);
    } catch (e) { return false; }
  }

  /* ACHADO D (mínimo): indicador PERSISTENTE de "não gravado" no próprio
     traço — fica ligado desde o início do envio até a gravação ser
     CONFIRMADA (sucesso real ou 23505+leitura de confirmação), nunca
     removido só por "o POST não gerou excepção". Em caso de erro fica
     ligado propositalmente: não existe aqui reenvio automático nem fila
     durável (mudança maior, fora deste mínimo — ver §2 achado D do
     relatório `tools/qa/ink-audit/RELATORIO.md`); o aluno vê que aquele
     traço específico continua sem salvar mesmo que a tela não mude mais
     nada. Não declarar "perda por falta de rede resolvida": só a
     visibilidade do problema foi corrigida aqui. */
  function marcarComoPendente(pathEl) {
    if (pathEl) pathEl.classList.add('rm2-ink-pendiente');
  }
  function desmarcarComoPendente(pathEl) {
    if (pathEl) pathEl.classList.remove('rm2-ink-pendiente');
  }

  /* ---- persistência: uma gravação por traço, nunca por ponto -------- */
  /* Gravar um traço é assíncrono, e o aluno pode desfazer ou apagar antes de
     o INSERT responder. Se nada segurasse essa corrida, o apagar não teria o
     que apagar — e o traço voltava no reload seguinte. Marca-se o registo
     como cancelado e, quando a resposta chega, apaga-se imediatamente a
     linha que acabou de nascer.

     ACHADO C da auditoria independente (#420): o id ERA gerado pelo
     servidor, então o INSERT não era idempotente — uma conexão
     reiniciada logo depois do commit fazia o próprio navegador reenviar
     o mesmo POST, e cada tentativa ganhava um id novo (2 linhas para 1
     traço); um 504 depois do commit tinha o problema inverso (o
     cliente nunca aprendia o id real, «desfazer» nem tentava apagar).
     Corrigido: `rec.id` já é um UUID gerado no CLIENTE desde a criação
     do traço (`novoIdTraco()`, em onDown/restaurarTraco) — o MESMO id
     em qualquer reenvio automático do navegador, e conhecido mesmo se
     a resposta nunca chegar. O id deixa de mudar depois do INSERT, por
     isso não há mais remapeamento de id para esta operação. */
  /* Único ponto que compensa um traço cancelado durante a gravação —
     chamado tanto quando o INSERT TERMINA (com ou sem erro) quanto de
     dentro do catch. Reusa a MESMA infraestrutura segura do achado B
     (`tentarApagarNoBanco()` + fila durável), nunca uma segunda
     implementação: se o DELETE falhar, nunca finge sucesso — guarda o
     id para reenvio. */
  async function compensarCancelamento(s, uid, rec) {
    rec.gravando = false;
    remover(rec.id);
    if (await tentarApagarNoBanco(s, uid, rec.id)) { limparPendenteApagar(uid, rec.id); return; }
    guardarPendenteApagar(uid, rec.id);
    toast('No se pudo borrar el trazo. Se reintentará.', true);
  }

  async function filaGravar(slug, rec, pathEl) {
    var s = sb(), uid = st.uid;
    if (!s || !uid) { toast('Dibujado (sin sincronizar)', true); marcarComoPendente(pathEl); return; }
    if (rec.cancelado) return;                 // cancelado antes sequer de partir
    rec.gravando = true;
    marcarComoPendente(pathEl);
    try {
      var r = await s.from('user_ink_strokes').insert({
        id: rec.id, user_id: uid, subject_slug: slug, anchor_id: rec.anchor_id,
        color: rec.color, width: rec.width, points: rec.points
      }).select('id').single();

      if (r.error) {
        if (!ehViolacaoDeChaveDuplicada(r.error) || !(await confirmarRegistoGravado(s, uid, rec.id))) {
          throw r.error;
        }
        /* chave duplicada CONFIRMADA por leitura: é o reenvio automático
           do navegador para o INSERT que já tinha sido gravado — sucesso,
           não erro. */
      }

      if (rec.cancelado) { await compensarCancelamento(s, uid, rec); return; }   // desfeito/apagado enquanto gravava

      rec.confirmado = true;
      desmarcarComoPendente(pathEl);
    } catch (e) {
      console.warn('[rm2] ink insert', e && e.message);
      /* ACHADO 2 da auditoria independente (HEAD 11084b7a): um erro aqui
         (ex.: 504 depois do commit) NÃO prova que nada foi gravado — o
         INSERT pode ter sido confirmado pelo servidor mesmo que a
         resposta chegue como falha ao cliente. Se o traço já tinha sido
         cancelado enquanto a gravação estava em voo, nunca tratar esse
         erro como "nada para limpar": tenta o DELETE compensatório mesmo
         assim (idempotente — 0 linhas afetadas se de fato não tiver
         gravado) e enfileira se ele próprio falhar, em vez de deixar a
         linha órfã no banco para sempre. */
      if (rec.cancelado) { await compensarCancelamento(s, uid, rec); return; }
      toast('No se pudo guardar el trazo.', true);
      /* o indicador "sin guardar" FICA ligado — ver comentário de
         `marcarComoPendente()` acima. */
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

  /* ACHADO B da auditoria independente (#420): `apagarNoBanco()` só tinha
     um try/catch, mas o supabase-js NÃO lança em erro HTTP — devolve
     `{error}`. Um DELETE 500 ou conexão cortada passava pelo `try` sem
     excepção nenhuma: o traço saía da tela em silêncio, mas a linha
     continuava no banco, e reaparecia ao recarregar; «desfazer» depois
     disso recriava o traço — 2 linhas para 1 desenho.

     Corrigido: confere `r.error` explicitamente. Se falhar, avisa o
     aluno e guarda o id (memória + `localStorage`, por conta) para
     reenviar — nunca finge que apagou. Apagar um id que já não existe
     não é erro (0 linhas afectadas), por isso o reenvio é seguro de
     repetir.

     AUDITORIA INDEPENDENTE (HEAD 11084b7a): estas funções liam `st.uid`
     (uma variável global, mutável) toda vez que precisavam da conta —
     inclusive DEPOIS de um `await`. Numa operação assíncrona em voo
     (DELETE pendurado, fila a reenviar), se o aluno trocasse de conta no
     meio do caminho, a chave de `localStorage` e o filtro `user_id` do
     próximo passo passavam a usar a conta NOVA, nunca a que originou a
     pendência — a operação ficava presa na fila errada (ou nenhuma),
     sem jamais reconciliar a conta antiga. Corrigido: todo chamador
     captura `uid` UMA VEZ, antes do primeiro `await`, e passa esse
     mesmo valor explicitamente por todo o caminho — nenhuma destas
     funções volta a ler `st.uid` sozinha. */
  function chavePendentesApagar(uid) {
    return 'penApagarPendente.' + (uid || 'anon');
  }
  function listaPendentesApagar(uid) {
    try { return JSON.parse(LS.get(chavePendentesApagar(uid), '[]')) || []; }
    catch (e) { return []; }
  }
  function salvarPendentesApagar(uid, lista) {
    try { LS.set(chavePendentesApagar(uid), JSON.stringify(lista)); } catch (e) {}
  }
  function guardarPendenteApagar(uid, id) {
    var lista = listaPendentesApagar(uid);
    if (lista.indexOf(id) === -1) { lista.push(id); salvarPendentesApagar(uid, lista); }
  }
  function limparPendenteApagar(uid, id) {
    var lista = listaPendentesApagar(uid);
    var depois = lista.filter(function (x) { return x !== id; });
    if (depois.length !== lista.length) salvarPendentesApagar(uid, depois);
  }
  async function tentarApagarNoBanco(s, uid, id) {
    try {
      var r = await s.from('user_ink_strokes').delete().eq('user_id', uid).eq('id', id);
      return !r.error;
    } catch (e) {
      console.warn('[rm2] ink delete', e && e.message);
      return false;
    }
  }
  /* Reenvia os DELETEs pendentes desta conta. Chamado ao carregar a
     matéria e ao voltar a conexão (`online`). Não é fila durável
     completa (não sobrevive a fechar o navegador antes do próximo
     carregamento) — só cobre o caso comum de falha/instabilidade
     passageira na própria aba. */
  async function reenviarApagarPendentes() {
    var s = sb(), uid = st.uid; if (!s || !uid) return;   // UID de origem capturado uma vez
    var lista = listaPendentesApagar(uid);
    for (var i = 0; i < lista.length; i++) {
      if (await tentarApagarNoBanco(s, uid, lista[i])) limparPendenteApagar(uid, lista[i]);
    }
  }

  /* Recebe o REGISTO, não só o id: é a única forma de marcar o cancelamento
     de um INSERT que ainda está no ar. */
  async function apagarNoBanco(rec) {
    if (!rec) return;
    if (typeof rec !== 'object') rec = { id: rec };     // compatibilidade
    rec.cancelado = true;
    var id = rec.id;
    if (String(id).indexOf('tmp-') === 0) return;       // o filaGravar compensa
    var s = sb(), uid = st.uid; if (!s || !uid) return;  // UID de origem capturado uma vez
    if (await tentarApagarNoBanco(s, uid, id)) { limparPendenteApagar(uid, id); return; }
    guardarPendenteApagar(uid, id);
    toast('No se pudo borrar el trazo. Se reintentará.', true);
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
    /* `desfazer()` cria, apaga ou restaura uma anotação sem exigir
       nenhuma ferramenta armada — por isso não basta gatear
       `escolherFerramenta()`. Mesmo portão (`anotarPermitido()`): fora da
       Página completa, desfazer não faz nada (a pilha de undo fica
       intacta, pronta para quando o aluno voltar). */
    if (!anotarPermitido()) return;
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
      id: novoIdTraco(),
      anchor_id: rec.anchor_id, color: rec.color, width: rec.width, points: rec.points,
      cancelado: false
    };
    (st.strokes[slug] = st.strokes[slug] || []).push(novo);
    remapear(idVelho, novo.id);           // quem apontava para o traço antigo passa a apontar para este
    var p = desenhar(novo);
    /* ACHADO 3 da auditoria independente (HEAD 11084b7a): `restaurarTraco`
       só é chamado para um traço que FOI apagado — se aquele DELETE tinha
       falhado e ainda estava pendente (fila do achado B), desfazer criava
       uma segunda linha sem nunca reinsistir na primeira: duas linhas para
       um único desenho até o próximo carregamento/evento `online` drenar a
       fila sozinho. Reconciliado agora: desfazer reinsiste o DELETE do id
       antigo AQUI MESMO (idempotente — 0 linhas afetadas se já não
       existir, nunca duplicado), em vez de esperar um gatilho futuro. Se a
       rede já se recuperou a duplicação nunca chega a existir; se ainda
       estiver fora do ar, o id continua na mesma fila durável, sem fingir
       que resolveu. */
    var s = sb(), uid = st.uid;             // UID de origem capturado uma vez (achado do troca-de-conta)
    if (s && uid) {
      if (await tentarApagarNoBanco(s, uid, idVelho)) limparPendenteApagar(uid, idVelho);
      else guardarPendenteApagar(uid, idVelho);
    }
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
    /* Único caminho de criação de marcação que NÃO passa por `st.tool`
       armado: o fluxo antigo "seleccionar texto → tocar numa cor" aplica
       direto sobre a selecção nativa já existente, mesmo que
       `escolherFerramenta('highlight')` tenha sido silenciosamente
       bloqueada (ver o `data-hc` no handler de clique da paleta). Sem
       este portão aqui, seleccionar texto antes de entrar num modo
       isolado e só então tocar na cor criaria uma marcação fora da
       Página completa. */
    if (!anotarPermitido()) return;
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

  /* ACHADO A da auditoria independente (#420): um SELECT sem ORDER BY e
     sem .range() — com o teto `max_rows` do Supabase (1000 por padrão),
     1001+ traços no banco viravam exactamente 1000 carregados, e sem
     ORDER BY o PostgREST devolve pela ordem física da tabela: os traços
     MAIS RECENTES ficavam de fora, sem nenhum aviso.

     Corrigido: pagina por `created_at,id` (ordem estável mesmo quando
     dois traços têm o mesmo timestamp) usando `.range()`. O fim é
     decidido pela página vir VAZIA — nunca por "veio mais curta do que
     pedi": o painel do Supabase pode limitar cada resposta a um
     `max_rows` MENOR do que `PAGINA_TRACOS`, e nesse caso uma página
     "curta" ainda pode ter mais dados depois dela. Por isso o próximo
     pedido avança pelo NÚMERO REAL de linhas devolvidas (nunca por
     `PAGINA_TRACOS`), e só pára quando uma página vem com 0 linhas —
     o único sinal que é verdadeiro para qualquer valor de `max_rows`,
     conhecido ou não. Um tecto de iterações
     (`PAGINA_TRACOS_MAX_PAGINAS`) é só rede de segurança contra um
     laço infinito nunca esperado — nunca deve ser atingido em uso
     real. */
  var PAGINA_TRACOS = 1000;
  var PAGINA_TRACOS_MAX_PAGINAS = 200;   // ao menos 200 000 traços — muito acima de qualquer uso real

  async function carregarTracos(slug) {
    if (st.carregado[slug]) return st.strokes[slug] || [];
    if (emVoo[slug]) return emVoo[slug];
    emVoo[slug] = (async function () {
      var s = sb();
      if (!s || !st.uid) return [];
      try {
        var todos = [];
        var inicio = 0;
        var paginas = 0;
        while (true) {
          var r = await s.from('user_ink_strokes')
            .select('id,anchor_id,color,width,points,created_at')
            .eq('user_id', st.uid).eq('subject_slug', slug)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(inicio, inicio + PAGINA_TRACOS - 1);
          if (r.error) throw r.error;
          var lote = r.data || [];
          if (!lote.length) break;                          // página vazia: fim real dos dados
          todos = todos.concat(lote);
          inicio += lote.length;                             // avança pelo que REALMENTE veio
          paginas++;
          if (paginas >= PAGINA_TRACOS_MAX_PAGINAS) {
            console.warn('[rm2] carregarTracos: limite de páginas atingido, parando por segurança');
            break;
          }
        }
        st.strokes[slug] = todos;
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
    /* achado B: reenvia DELETEs pendentes ANTES de buscar os traços —
       se corresse depois (ou só em paralelo), um traço cujo DELETE
       falhou anteriormente seria lido de volta do banco e desenhado de
       novo NESTE MESMO carregamento, mesmo que o reenvio tivesse êxito
       um instante depois: a tela mostraria "reapareceu" até o próximo
       reload. Rodar antes elimina essa janela — fica lento só quando
       há mesmo pendências (a lista normalmente está vazia). */
    await reenviarApagarPendentes();
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
      '<rect x="3.6" y="6.6" width="1.8" height="18" rx=".9" fill="#ffffff" opacity=".4"/>',

    /* diagnóstico: um traçado de monitor com um ponto a marcar o pico.
       Só piloto: o botão que usa este ícone só entra no DOM se
       `pilotoPermitido()` for verdadeiro no momento do montar(). */
    diag:
      '<defs>' + grad('rm2dA', '#8fd3ff', '#2f7fd6', true) + '</defs>' +
      '<rect x="2.6" y="5.4" width="26.8" height="19.4" rx="3.2" fill="none" stroke="url(#rm2dA)" stroke-width="2.6"/>' +
      '<path d="M6.6 16.4h4l2.6-5.4 3.4 9.2 2.6-5.2h6.2" fill="none" stroke="url(#rm2dA)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="16.6" cy="20.2" r="1.9" fill="#ffd77a"/>' +
      '<rect x="11.4" y="26.6" width="9.2" height="2.4" rx="1.2" fill="url(#rm2dA)"/>'
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
            '<button type="button" class="rm2-w rm2-w-xthin"  data-pw="xthin"  role="radio" aria-checked="false" title="Extra fino" aria-label="Trazo extra fino"><i></i></button>' +
            '<button type="button" class="rm2-w rm2-w-thin"   data-pw="thin"   role="radio" aria-checked="false" title="Fino"   aria-label="Trazo fino"><i></i></button>' +
            '<button type="button" class="rm2-w rm2-w-medium" data-pw="medium" role="radio" aria-checked="false" title="Medio"  aria-label="Trazo medio"><i></i></button>' +
            '<button type="button" class="rm2-w rm2-w-thick"  data-pw="thick"  role="radio" aria-checked="false" title="Grueso" aria-label="Trazo grueso"><i></i></button>' +
          '</div>' +
        '</div>' +

        botao('data-t="eraser"', I.erase, 'Goma de borrar', 'Goma: borrar marcas y trazos', true) +
        '<div class="rm2-sep"></div>' +
        botao('data-a="undo"', I.undo, 'Deshacer', 'Deshacer la última acción', false) +
        botao('data-a="notes"', I.note, 'Mis apuntes', 'Abrir mis apuntes', false) +
        /* Diagnóstico do lápiz: o botão está sempre no DOM (a toolbox só é
           construída uma vez, mas o piloto depende da MATÉRIA activa, que
           pode trocar depois) — quem decide se aparece é `refletir()`,
           chamada a cada troca de aba, via a classe `rm2-piloto-off`. */
        botao('data-a="diag"', I.diag, 'Diagnóstico del lápiz', 'Abrir el diagnóstico del lápiz', false) +
      '</div>' +
      '<button type="button" class="rm2-fab" id="rm2-fab" aria-expanded="false" aria-controls="rm2-panel" ' +
        'title="Herramientas de estudio" aria-label="Herramientas de estudio">' + ico(I.tools) + '</button>';

    document.body.appendChild(box);
    if (!document.getElementById('rm2-penguard')) {                    // guarda de toque do piloto físico (ver CSS #rm2-penguard): sem filhos, inerte fora do contacto
      var guarda = document.createElement('div'); guarda.id = 'rm2-penguard'; guarda.setAttribute('aria-hidden', 'true'); document.body.appendChild(guarda);
    }

    /* ------------------------------------------------------------------
       O FAB é a saída explícita de uma ferramenta de desenho PROTEGIDA
       (`protegidoContraFecho()`) — nunca um jeito de a minimizar
       silenciosamente mantendo-a armada.

       A GOMA sempre foi assim (bloqueia o scroll via touch-action:none;
       esconder a toolbox sem saída à vista era a queixa antiga de «não
       consigo desativar para voltar a rolar»). O LÁPIS ganhou a mesma
       saída explícita por evidência de teste físico (tablet real do
       José) — mas SÓ dentro do piloto físico (José + Semiología II):
       fora dele, o FAB com o lápis armado continua a só abrir/fechar o
       painel, exactamente como na main antes desta correcção (achado da
       auditoria independente — nenhuma destas mudanças tinha portão de
       piloto). Continua a existir a outra saída explícita, tocar de novo
       no ícone da própria ferramenta. */
    box.querySelector('#rm2-fab').addEventListener('click', function () {
      if (protegidoContraFecho()) { escolherFerramenta('none'); return; }
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

  /* Só a GOMA tira o pan à área de leitura INCONDICIONALMENTE
     (touch-action:none no CSS, escopado a body.rm2-t-eraser/highlight,
     ligado directamente a `st.tool` no toggle de classes de `refletir()`
     — nenhuma função intermédia decide isso). A CANETA continua a
     devolver pan-x/pan-y/pinch-zoom ao dedo enquanto a stylus não está em
     contacto (§0 do encargo, "Goodnotes-like") — isso não mudou.

     O que MUDOU (evidência de teste físico, tablet real do José): existia
     uma `modoEscritaBloqueante()` (só GOMA) usada para decidir se a
     TOOLBOX podia fechar — a ideia era «a caneta não bloqueia o scroll,
     logo fechar o painel com ela armada é seguro». Isso continua
     verdadeiro para o scroll, mas o teste no tablet mostrou que esconder
     a toolbox com o lápis armado é, mesmo assim, uma experiência ruim.
     Todas as decisões de toolbox/FAB/clique passaram para
     `ferramentaDeDesenho()` (lápis + goma); a pergunta antiga («isto
     bloqueia o scroll?») deixou de ter nenhum lugar que precisasse dela,
     por isso `modoEscritaBloqueante()` foi removida em vez de deixada sem
     uso. */
  function ferramentaDeDesenho() {
    return st.tool === 'pen' || st.tool === 'eraser';
  }

  /* Portão único das mudanças de toolbox/FAB/clique desta correcção
     física do lápis (achado da auditoria independente da PR #412): a
     GOMA mantém-se protegida sempre, exactamente como antes de qualquer
     destas PRs (não fazia parte do bug reportado, não é tocada por
     `pilotoPermitido()`); o LÁPIS só fica protegido dentro do piloto
     físico (José + Semiología II). Fora do piloto, o lápis volta a poder
     fechar/minimizar a toolbox e a não suprimir clique nativo —
     exactamente o comportamento da main antes desta correcção, para os
     dois `BETA_UIDS` antigos e para qualquer liberado por
     `study_tools_beta`. Único sítio que decide isto; nenhum dos 5 pontos
     que o usam (FAB, invariante de `refletir()`, "clicar fora minimiza",
     supressão de `click`, rótulo do FAB) deveria decidir por conta
     própria. */
  function protegidoContraFecho() {
    return st.tool === 'eraser' || (st.tool === 'pen' && pilotoPermitido());
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
    /* Desarmar ('none') é sempre permitido — é o próprio `RMModes` quem
       chama isto ao sair da Página completa (`desarmarFerramentas()`), e
       isso nunca pode ficar bloqueado. Armar lápis/marcador/goma, porém,
       passa por `anotarPermitido()`: fora da Página completa a
       ferramenta simplesmente não arma — sem toast, mesmo padrão
       silencioso dos outros portões deste arquivo. Como `onDown`/
       `onHlDown` exigem `st.tool` armado para criar qualquer traço ou
       marcação, isto fecha a porta de criação/alteração/remoção num único
       lugar, sem duplicar a checagem em cada caminho de escrita. */
    if (t !== 'none' && !anotarPermitido()) return;
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
    /* INVARIANTE: enquanto a goma estiver armada — sempre — ou o lápis
       estiver armado DENTRO do piloto físico, o painel fica aberto —
       ponto único (`protegidoContraFecho()`), não só no FAB nem no
       listener de "clicar fora" (ver ambos). Qualquer caminho que tente
       fechá-lo nesse estado é corrigido aqui. Fora do piloto físico, o
       lápis não força `st.open`, exactamente como na main antes desta
       correcção — o marcador continua de fora em qualquer caso, como
       sempre. */
    if (protegidoContraFecho()) st.open = true;
    box.classList.toggle('open', st.open);
    var fab = box.querySelector('#rm2-fab');
    fab.setAttribute('aria-expanded', String(st.open));
    fab.classList.toggle('armed', st.tool !== 'none');
    /* o rótulo diz o que o botão faz AGORA, que é o que um leitor de ecrã
       anuncia e o que aparece no tooltip de quem usa rato. Goma sempre, e
       lápis dentro do piloto físico, fazem o FAB sair do modo de escrita
       (ver comentário do FAB); fora do piloto o lápis, como o marcador,
       deixa o FAB a só abrir/fechar o painel. */
    var bloqueante = protegidoContraFecho();
    fab.setAttribute('title', bloqueante ? 'Salir del modo escritura' : 'Herramientas de estudio');
    fab.setAttribute('aria-label', bloqueante ? 'Salir del modo escritura' : 'Herramientas de estudio');

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
    /* botão do diagnóstico: só visível dentro do piloto (José + Semiología
       II), reavaliado aqui a cada troca de aba/estado — nunca fixo no
       momento do mount, porque a matéria activa pode trocar depois. Fora
       do piloto o painel fecha sozinho se por acaso estivesse aberto
       (ex.: o aluno estava em Semiología II com o piloto activo e trocou
       de matéria com o diagnóstico no ecrã). */
    var permitido = pilotoPermitido();
    var bd = box.querySelector('.rm2-btn[data-a="diag"]');
    if (bd) {
      bd.classList.toggle('rm2-piloto-off', !permitido);
      bd.classList.toggle('on', diagAberto());
      bd.setAttribute('aria-expanded', String(diagAberto()));
    }
    if (!permitido && diagAberto()) fecharDiagSemRefletir();
    else if (diagAberto()) diagVPedirRender();
    var u = box.querySelector('[data-a="undo"]');
    if (u) u.disabled = !st.undo.length;

    /* o estado da ferramenta não é só cor: vai também para o body, para
       o cursor e para a goma destacarem as marcações (§31) */
    var b = document.body;
    b.classList.toggle('rm2-pilot-guard', permitido && !semGuardaTeste);
    /* identificação VISÍVEL do build, só para quem está no piloto físico em Semiología II (José / pen:true): prova de qual versão do arquivo o aparelho carregou.
       Um aviso passageiro (.rm-toast, o mesmo do «Trazo deshecho ✓») ao ABRIR a caixa — nada fixo sobre a leitura (regra do tema: nenhum elemento fixo cobre texto, tabela ou post-it). */
    var abertaAgora = box.classList.contains('open');
    if (permitido && abertaAgora && !buildAbertaAntes && !diagAberto()) toast('caneta #456 · build ' + BUILD_456);
    buildAbertaAntes = abertaAgora;
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
    /* achado B: reenvia DELETEs pendentes ao voltar a conexão — além do
       reenvio já feito em `sincronizarAba()` a cada carregamento de
       matéria. */
    window.addEventListener('online', reenviarApagarPendentes);

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
       `preventDefault()` — âncora não resolvida, alvo fora do esperado,
       ponteiro não aceite —, isto veta a selecção na origem. Campos de
       escrita legítimos ficam de fora. `ferramentaDeDesenho()`: a caneta
       precisa disto mesmo sem bloquear o scroll do dedo quando não está
       em contacto. */
    document.addEventListener('selectstart', function (e) {
      if (!ferramentaDeDesenho()) return;
      var t = e.target;
      if (t && t.closest && t.closest('input,textarea,[contenteditable="true"],.rm2-notes')) return;
      diagLog('selectstart-bloqueado', null);
      e.preventDefault();
    }, true);

    /* Com a goma sempre, e com o lápis só dentro do piloto físico
       (`protegidoContraFecho()`), nenhum clique do documento passa para
       baixo: nem abre um link, nem responde a um quiz por engano ao
       escrever/apagar em cima deles (evidência de teste físico — escrever
       com a Pencil sobre um card interactivo não pode acioná-lo). O
       apagar em si é feito no gesto de ponteiro (apagarEm), não aqui; o
       traço, no onUp. Fora do piloto físico, o lápis não suprime clique
       — exactamente como antes desta correcção. */
    document.addEventListener('click', function (e) {
      if (!protegidoContraFecho()) return;
      if (e.target && e.target.closest && e.target.closest('.rm2-box,.rm2-notes')) return;
      if (e.target && e.target.closest && e.target.closest('#materias-container')) {
        e.preventDefault(); e.stopPropagation();
      }
    }, true);

    /* caneta e goma de traços. Bolha, não captura — de propósito: a
       auditoria da PR #412 apontou que passar `onDown` para captura fazia
       `traco` já existir (para quem tivesse âncora válida) antes de o
       listener "clicar fora minimiza" (captura, mais abaixo) correr,
       adiantando sem querer o comportamento novo da toolbox para QUALQUER
       utilizador de lápis, piloto ou não — a decisão de toolbox tem de
       vir só do portão explícito (`protegidoContraFecho()`), nunca da
       ordem de execução entre listeners. Em bolha, a ordem relativa a
       "clicar fora" volta a ser exactamente a de antes desta PR para
       quem está fora do piloto físico. */
    document.addEventListener('pointerdown', onDown, { passive: false });
    /* Adaptador de Touch Events (§2 do encargo) — aditivo, só piloto
       físico, só identifica e tenta suprimir a navegação nativa do
       PRÓPRIO contacto de stylus; não desenha nada. Ver comentário grande
       junto de `ligarAdaptadorTouchStylus()`. */
    ligarAdaptadorTouchStylus();
    /* a flag `pen` do servidor chega DEPOIS do mount (rm-pilot.js só pergunta quando Semiología II está ativa): registra o adaptador e reflete o piloto nesse momento */
    window.addEventListener('rm-pilot-flags', function () { ligarAdaptadorTouchStylus(); refletir(); });
    document.addEventListener('pointermove', function (e) {
      /* Sinal de "pen por perto" para a rejeição de palma — inclui o
         HOVER (pointerType 'pen', buttons 0) quando o hardware/browser o
         expõe, não só o contacto real; ver §7 do encargo. */
      if (e.pointerType === 'pen') registarPen(e);
      if (st.tool === 'pen' && e.pointerType === 'touch') { onTouchMoveComCanetaArmada(e); return; }
      if (traco) { if (perf) perfMove(e); onMove(e); } else if (apagando) onMoveApagar(e);
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
      if (perf && perf.atual && traco && e && e.pointerId === traco.pid) { perf.lpc = (perf.lpc || 0) + 1; perfFimTraco('LOSTCAPTURE', null, traco.pts.length); }   // só conta a captura perdida NO MEIO do traço (a normal, depois do pointerup, não)
      if (e && e.pointerType === 'pen' && pilotoPermitido() && penState.active && e.pointerId === penState.pid) penEmContacto(false);
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

    /* clicar fora minimiza (mas nunca no meio de um traço, nem com a goma
       armada, nem com o lápis armado DENTRO do piloto físico — evidência
       de teste físico: tocar/escrever na matéria com a caneta NÃO pode
       fechar a toolbox, mas só para José + Semiología II; fora do piloto
       físico o lápis continua a poder minimizar a toolbox tocando fora
       dela, exactamente como na main antes desta correcção (achado da
       auditoria independente da PR #412 — o portão de piloto faltava
       aqui). `protegidoContraFecho()` é o mesmo portão usado no FAB e no
       invariante de `refletir()`. */
    document.addEventListener('pointerdown', function (e) {
      if (!st.open || traco || apagando) return;
      if (e.target.closest && e.target.closest('.rm2-box,.rm2-notes')) return;
      if (protegidoContraFecho()) return;
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
       antes de reposicionar — e, sobretudo, deixa de ficar preso.

       Só que no vídeo físico de 30/09/2026 apareceram MUITOS
       `reconciliar:resize` seguidos — no iOS a barra de URL some/aparece
       ao rolar e isso já dispara `resize` (innerHeight muda ~50-100px,
       innerWidth não muda nada nenhuma), sem geometria nenhuma ter
       mudado de verdade. Cada um desses abortava um traço em curso.
       `mudouGeometriaReal()` distingue isto — só dentro do piloto físico
       (§5 do encargo): fora dele o resize continua a reconciliar sempre,
       exactamente como era antes desta correcção. */
    var ultimaLarguraJanela = window.innerWidth, ultimaAlturaJanela = window.innerHeight;
    var RESIZE_ALTURA_LIMIAR_PX = 150;
    function mudouGeometriaReal() {
      var w = window.innerWidth, h = window.innerHeight;
      var mudou = w !== ultimaLarguraJanela || Math.abs(h - ultimaAlturaJanela) > RESIZE_ALTURA_LIMIAR_PX;
      ultimaLarguraJanela = w; ultimaAlturaJanela = h;
      return mudou;
    }
    var reflow = debounce(reposicionarTudo, 120);
    window.addEventListener('resize', function () {
      var real = mudouGeometriaReal();
      if (!pilotoPermitido() || real) reconciliarGesto('resize');
      reflow();
    });
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
      if (tabEl.classList.contains('active')) { sincronizarAba(tabEl); refletir(); }
    });
    var ativa = abaAtiva();
    if (ativa) { sincronizarAba(ativa); refletir(); }

    if (typeof window.switchTab === 'function') {
      var sw = window.switchTab;
      window.switchTab = function () {
        reconciliarGesto('troca-de-materia');  // a matéria sai debaixo do traço
        var r = sw.apply(this, arguments);
        flushNotas();                       // antes de trocar, grava o que falta
        setTimeout(function () {
          fecharNotas();
          var el = abaAtiva(); if (el) sincronizarAba(el);
          /* o piloto (José + Semiología II) depende da matéria activa —
             reavaliar aqui é o que faz o botão do diagnóstico aparecer ou
             sumir ao trocar de aba, e fecha o painel sozinho se a nova
             matéria já não for a do piloto. */
          refletir();
        }, 0);
        return r;
      };
    }

    window.RMToolsV2 = {
      estado: st,
      build: BUILD_456,
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
      /* diagnóstico de hardware físico: só memória, nunca enviado ao
         servidor — ver «2b · DIAGNÓSTICO» acima. O painel visual
         (abrir/fechar/limpar) só abre de facto dentro do piloto. */
      debug: debug,
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
        anchorDe: anchorDe,
        anchorPorPonto: anchorPorPonto,
        pilotoPermitido: pilotoPermitido,
        adaptadorLigado: function () { return adaptadorLigado; },
        perf: function () { return perf; },
        perfLinhas: perfLinhas,
        activeViewPermitido: activeViewPermitido,
        anotarPermitido: anotarPermitido,
        temTraco: function () { return !!traco; },
        tracoInfo: function () {
          return traco ? { pid: traco.pid, tipo: traco.tipo, nPontos: traco.pts.length, rafPending: traco.rafPending } : null;
        },
        pathIncremental: pathIncremental,
        novoPathIncremental: novoPathIncremental,
        novoIdTraco: novoIdTraco,
        decimarPreservandoExtremos: decimarPreservandoExtremos,
        pontuarPalma: pontuarPalma,
        evidenciaDirectaDePalma: evidenciaDirectaDePalma,
        stylusTouches: stylusTouches,
        touchAdapterElegivel: touchAdapterElegivel,
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
