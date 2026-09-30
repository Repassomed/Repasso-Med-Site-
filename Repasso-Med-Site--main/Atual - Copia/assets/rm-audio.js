/* =====================================================================
   REPASSO MED · rm-audio.js
   MOTOR ÚNICO DE AUDIOBOOK — D1: SINTÉTICO E DORMENTE.

   O QUE É (e o que NÃO é)
     · É um motor de reprodução + um player compacto que se monta num
       «slot» que o chamador fornece (o da Layout V2 será `#rm-l2-player`).
     · NÃO é carregado por nenhuma página. Nenhum HTML do site o inclui.
       Enquanto ninguém o ligar, não existe nem um pedido de rede por causa
       dele.
     · NÃO sabe de URL, bucket, Storage, CDN, token ou Supabase. Quem
       decide de onde vem o áudio é um `provider` injetado (na D1, um
       provider SINTÉTICO nos testes). A decisão de produção é da D2.
     · NÃO anexa listeners globais, não escuta eventos do site, não lê
       localStorage/sessionStorage, não grava nada em lado nenhum.

   REGRAS DE OURO
     1. Carregar metadados NUNCA cria `audio.src`, nunca cria o elemento de
        áudio e nunca chama o provider. A fonte só é pedida em `play()`.
     2. A fonte de um item é pedida UMA vez por item (e de novo só se
        expirar — «reautorização», sem perder o ponto de reprodução).
     3. Um único player: abrir o áudio B com o A a tocar pausa o A. Vale
        também entre instâncias (exclusividade global do runtime).
     4. Sem autoplay. `attach`, `loadMetadata`, `restart`, `close` e
        `destroy` nunca iniciam reprodução.
     5. Falha fechada: slot inexistente ⇒ `attach()` devolve false e a
        página não muda; metadado inválido ⇒ recusado; fonte fora da lista
        de esquemas permitidos ⇒ recusada.

   API (pequena)
     RMAudio.create({ provider, audioFactory, userKey, allowSource, now,
                      headless })  → engine
       (sem `attach()` bem-sucedido, `play()` recusa com erro 'no-slot':
        não há som sem controlos visíveis; `headless:true` é só para testes)
     engine.attach(slot?)         monta a UI no slot (elemento ou seletor;
                                  por omissão '#rm-l2-player'). true/false.
     engine.loadMetadata(item|[]) valida e regista metadados. Sem rede.
     engine.play(ref)             ref = audio_id | item. Promise<boolean>.
     engine.pause()               mantém posição e mantém o player aberto.
     engine.seek(seg)             limitado a [0, duração]. devolve o valor.
     engine.skip(±seg)            por omissão ±15. Limitado a [0, duração].
     engine.setRate(r)            1 · 1.25 · 1.5 · 2 · 2.5
     engine.restart()             pausa e volta a 0. NÃO toca sozinho.
     engine.close()               pausa, guarda posição, recolhe o player.
     engine.destroy()             liberta tudo; o motor deixa de servir.
     engine.refreshLayout()       relê o dock do B1 e reposiciona. Devolve o modo.
     engine.getState()            fotografia (sem URL, sem segredo).
     engine.handle(nome)          ganchos de arbitragem (ver abaixo).
     engine.on(evento, fn)        'state' | 'play' | 'pause' | 'close' | 'error'
     RMAudio.validateItem(item) / validateManifest(lista)
     RMAudio.pauseAll(motivo) / RMAudio.resetSession()

   LAYOUT — QUEM DECIDE ONDE O PLAYER CABE
     Com a Layout V2 (B1) presente, a AUTORIDADE é `html[data-rm-dock]`
     (`side` → lateral · `bottom` → inferior): o B1 já calcula viewport,
     lateral 264/64/0, coluna de texto, toolbox e largura do player. O motor
     só LÊ esse atributo. O breakpoint próprio (BP_LATERAL) é um fallback
     SINTÉTICO, usado apenas quando `data-rm-dock` não existe (harness
     isolado) e nunca prevalece sobre o B1.
     O player vive DENTRO do slot (`#rm-l2-player`, contêiner reservado pelo
     B1: fixed entre `--rm-left-w` e `--rm-right-w`). Em modo inferior o
     motor publica a altura em `--rm-player-h` (o B1 já a usa para reservar
     espaço e afastar toast/FAB/diagnóstico); em modo lateral publica 0.
     Acompanha mudanças de `data-rm-dock` SEM cruzar breakpoint com um
     MutationObserver restrito a esse atributo, criado no attach() e
     desligado no unmount()/destroy(); `engine.refreshLayout()` faz o mesmo
     a pedido da integração futura.

   GANCHOS DE ARBITRAGEM (não ligados a nada nesta fase)
     engine.handle('subject-change')  → pause
     engine.handle('pause-request')   → pause (auscultação/vídeo futuros)
     engine.handle('exclusive')       → pause (outro áudio vai tocar)
     engine.handle('logout')          → pause + destroy

   CONTRATO DO «provider» (injetado; na D1 é sintético)
     provider.resolve(meta, ctx) → Promise<{ src: string, expiresAt?: ms }>
       ctx = { reason: 'first-play' | 'expired' }
     O motor só aceita `src` que passe em `allowSource(src)`. Por omissão
     só o esquema `synthetic://` passa: URL real é recusada até a D2
     decidir, de propósito, o contrário.

   CONTRATO DO «audioFactory» (adapter tipo HTMLMediaElement)
     audioFactory() → objeto com: src (setter), currentTime, duration,
     readyState, playbackRate, paused, error, play() → Promise, pause(),
     load(), addEventListener/removeEventListener para 'loadedmetadata',
     'timeupdate', 'playing', 'waiting', 'ended', 'error'.
     Só é chamado no primeiro `play()`. Nos testes é um fake.
   ===================================================================== */
(function (root) {
  'use strict';

  if (root.RMAudio) return;                                   // idempotente

  var RATES = [1, 1.25, 1.5, 2, 2.5];
  var SKIP_S = 15;
  var SLOT_SELECTOR = '#rm-l2-player';
  var LOAD_TIMEOUT_MS = 15000;
  var BP_LATERAL = 1400;           // SÓ fallback sintético (sem data-rm-dock): ≥ isto lateral; abaixo inferior

  /* ------------------------------------------------------------------ */
  /* 1 · VALIDADOR DE METADADOS                                          */
  /* ------------------------------------------------------------------ */

  var META_KEYS = ['audio_id', 'subject_slug', 'block_id', 'theme', 'title', 'duration', 'order', 'version'];
  var ID_RE = /^[a-z0-9][a-z0-9._-]{0,79}$/i;
  var VER_RE = /^[a-z0-9._-]{1,32}$/i;
  /* Chave que só pode ser de URL/caminho/segredo: recusada pelo nome. */
  var KEY_BAD = /(url|uri|src|href|link|path|token|secret|key|bucket|storage|sign|auth|passw|cred|cdn)/i;
  /* Valor que parece endereço, caminho privado, token ou ficheiro de áudio. */
  var VAL_BAD = new RegExp([
    '\\b(?:https?|file|blob|data|s3|gs|ftp|wss?|synthetic):',
    '\\/\\/',
    '^\\s*\\/',
    '\\.\\.[\\/\\\\]',
    '\\bstorage\\/',
    '\\.supabase\\.',
    '\\bbearer\\b',
    'eyJ[A-Za-z0-9_-]{10,}',
    '\\.(?:m4a|mp3|aac|ogg|opus|wav|flac|webm)\\b',
    '[?&](?:token|sig|signature|key|apikey)='
  ].join('|'), 'i');
  /* eslint-disable-next-line no-control-regex */
  var CTRL = /[\u0000-\u001f\u007f]/;

  function texto(v, nome, max, erros) {
    if (typeof v !== 'string') { erros.push(nome + ': debe ser texto'); return null; }
    var s = v.trim();
    if (!s || s.length > max) { erros.push(nome + ': vacío o más largo de ' + max); return null; }
    if (CTRL.test(s)) { erros.push(nome + ': caracteres de control'); return null; }
    return s;
  }

  /* Devolve { ok, item, errors }. `item` é uma cópia só com os 8 campos. */
  function validateItem(raw) {
    var erros = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, item: null, errors: ['item: debe ser un objeto'] };
    }
    Object.keys(raw).forEach(function (k) {
      if (KEY_BAD.test(k)) erros.push(k + ': campo prohibido (URL, ruta, token o secreto no entran en el manifiesto)');
      else if (META_KEYS.indexOf(k) < 0) erros.push(k + ': campo no permitido');
    });
    Object.keys(raw).forEach(function (k) {
      var v = raw[k];
      if (typeof v === 'string' && VAL_BAD.test(v)) erros.push(k + ': el valor parece una URL, ruta privada, token o archivo');
    });

    var it = {};
    ['audio_id', 'subject_slug', 'block_id'].forEach(function (k) {
      var s = texto(raw[k], k, 80, erros);
      if (s !== null) { if (!ID_RE.test(s)) erros.push(k + ': formato inválido'); else it[k] = s; }
    });
    var th = texto(raw.theme, 'theme', 80, erros); if (th !== null) it.theme = th;
    var ti = texto(raw.title, 'title', 160, erros); if (ti !== null) it.title = ti;

    var d = raw.duration;
    if (typeof d !== 'number' || !isFinite(d) || d <= 0 || d > 21600) erros.push('duration: número de segundos entre 1 y 21600');
    else it.duration = d;

    var o = raw.order;
    if (typeof o !== 'number' || !isFinite(o) || Math.floor(o) !== o || o < 0 || o > 9999) erros.push('order: entero entre 0 y 9999');
    else it.order = o;

    var ver = raw.version;
    if (typeof ver === 'number' && isFinite(ver) && ver >= 0) ver = String(ver);
    if (typeof ver !== 'string' || !VER_RE.test(ver)) erros.push('version: texto simple (letras, números, . _ -)');
    else it.version = ver;

    if (erros.length) return { ok: false, item: null, errors: erros };
    return { ok: true, item: Object.freeze(it), errors: [] };
  }

  /* Lista de itens: cada um válido, audio_id único. Não regista nada. */
  function validateManifest(lista) {
    if (!Array.isArray(lista)) return { ok: false, items: [], errors: ['manifiesto: debe ser una lista'] };
    var itens = [], erros = [], vistos = {};
    lista.forEach(function (raw, i) {
      var r = validateItem(raw);
      if (!r.ok) { r.errors.forEach(function (e) { erros.push('[' + i + '] ' + e); }); return; }
      if (vistos[r.item.audio_id]) { erros.push('[' + i + '] audio_id repetido: ' + r.item.audio_id); return; }
      vistos[r.item.audio_id] = true; itens.push(r.item);
    });
    return { ok: erros.length === 0, items: itens, errors: erros };
  }

  /* ------------------------------------------------------------------ */
  /* 2 · ESTADO DO RUNTIME (só memória)                                  */
  /* ------------------------------------------------------------------ */

  var sessionPrefs = {};         // userKey -> { rate }: dura enquanto a página viver
  var engines = [];              // instâncias vivas (exclusividade global)

  function fmt(t) {
    t = Math.max(0, Math.floor(isFinite(t) ? t : 0));
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function defaultFactory() {                  // só para a D2; os testes da D1 usam um fake
    var a = new root.Audio(); a.preload = 'none'; return a;
  }

  /* ------------------------------------------------------------------ */
  /* 3 · MOTOR                                                           */
  /* ------------------------------------------------------------------ */

  function create(opts) {
    opts = opts || {};
    var provider = opts.provider || null;
    var audioFactory = opts.audioFactory || defaultFactory;
    var allowSource = typeof opts.allowSource === 'function' ? opts.allowSource : function (s) { return /^synthetic:\/\//.test(s); };
    var userKey = String(opts.userKey || 'anon');
    var now = typeof opts.now === 'function' ? opts.now : Date.now;
    var headless = opts.headless === true;      // só para testes de lógica; por omissão play() exige o player montado

    var catalog = {};        // audio_id -> meta
    var positions = {};      // audio_id@version -> segundos
    var sources = {};        // audio_id@version -> { src, expiresAt }
    /* adapterKey/adapterSrc só ficam definidos DEPOIS de a carga terminar:
       enquanto o elemento recarrega, a posição vive em `positions`. */
    var adapter = null, adapterKey = null, adapterSrc = null;
    var state = 'idle', isOpen = false, current = null, err = null;
    var rate = (sessionPrefs[userKey] && sessionPrefs[userKey].rate) || 1;
    var slot = null, ui = null, destroyed = false;
    var token = 0;           // invalida cargas/playes antigos quando o pedido muda
    var reauthTries = 0;
    var counters = { sourceRequests: 0, adapterCreated: 0, reauthorizations: 0 };
    var listeners = {};
    var boundAdapterHandlers = null;
    var mql = null, mo = null, slotWasHidden = false;

    function key(m) { return m.audio_id + '@' + m.version; }
    function emit(ev, data) {
      (listeners[ev] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) { /* ouvinte alheio nunca derruba o motor */ } });
    }
    function setState(s) {
      if (state === s) { render(); return; }
      state = s; render(); emit('state', { state: s });
      if (s === 'playing') emit('play', { audio_id: current && current.audio_id });
      if (s === 'paused') emit('pause', { audio_id: current && current.audio_id });
    }
    function fail(code, message) {
      err = { code: code, message: message || code };
      token++;
      adapterKey = null; adapterSrc = null;          // a próxima tentativa recarrega de raiz
      state = 'error'; render();
      emit('error', { code: code, audio_id: current && current.audio_id });
      return false;
    }

    /* ---------- posição ---------- */
    function pos() {
      if (!current) return 0;
      var k = key(current);
      if (adapter && adapterKey === k && isFinite(adapter.currentTime)) return adapter.currentTime;
      return positions[k] || 0;
    }
    function dur() {
      if (!current) return 0;
      if (adapter && adapterKey === key(current) && isFinite(adapter.duration) && adapter.duration > 0) return adapter.duration;
      return current.duration;
    }
    function savePos() {
      if (!current) return;
      var k = key(current);
      positions[k] = clamp(pos(), 0, dur());
    }

    /* ---------- adapter ---------- */
    function ensureAdapter() {
      if (adapter) return adapter;
      adapter = audioFactory();
      counters.adapterCreated++;
      try { adapter.autoplay = false; } catch (e) { /* alguns fakes são só-leitura */ }
      boundAdapterHandlers = {
        timeupdate: function () { if (current && adapterKey === key(current)) { positions[adapterKey] = adapter.currentTime; render(); } },
        playing: function () { if (state === 'loading' || state === 'paused') { if (current && adapterKey === key(current)) setState('playing'); } },
        waiting: function () { if (state === 'playing') setState('loading'); },
        ended: function () { if (current) { positions[key(current)] = 0; try { adapter.currentTime = 0; } catch (e) { /* ignore */ } } setState('paused'); },
        error: function () { onAdapterError(); }
      };
      Object.keys(boundAdapterHandlers).forEach(function (n) { adapter.addEventListener(n, boundAdapterHandlers[n]); });
      return adapter;
    }
    function dropAdapter() {
      if (!adapter) return;
      try { adapter.pause(); } catch (e) { /* ignore */ }
      if (boundAdapterHandlers) {
        Object.keys(boundAdapterHandlers).forEach(function (n) { try { adapter.removeEventListener(n, boundAdapterHandlers[n]); } catch (e) { /* ignore */ } });
      }
      try { if (adapter.removeAttribute) adapter.removeAttribute('src'); else adapter.src = ''; if (adapter.load) adapter.load(); } catch (e) { /* ignore */ }
      adapter = null; adapterKey = null; adapterSrc = null; boundAdapterHandlers = null;
    }
    function pauseAdapter() { if (adapter) { try { adapter.pause(); } catch (e) { /* ignore */ } } }

    /* Regista o ouvinte ANTES de atribuir a fonte; resolve em loadedmetadata. */
    function loadInto(a, src) {
      return new Promise(function (resolve, reject) {
        var t = setTimeout(function () { limpa(); reject({ code: 'LOAD_TIMEOUT' }); }, LOAD_TIMEOUT_MS);
        function ok() { limpa(); resolve(); }
        function mau() { limpa(); reject(a.error || { code: 'MEDIA_ERROR' }); }
        function limpa() { clearTimeout(t); a.removeEventListener('loadedmetadata', ok); a.removeEventListener('error', mau); }
        a.addEventListener('loadedmetadata', ok);
        a.addEventListener('error', mau);
        a.src = src;                                   // ÚNICO sítio onde a fonte é atribuída
        if (typeof a.load === 'function') a.load();
      });
    }

    /* ---------- fonte (provider) ---------- */
    function ensureSource(meta, reason) {
      var k = key(meta), c = sources[k];
      if (c && reason !== 'expired' && !(c.expiresAt && now() >= c.expiresAt)) return Promise.resolve(c.src);
      if (c && c.expiresAt && now() >= c.expiresAt && reason !== 'expired') reason = 'expired';
      if (!provider || typeof provider.resolve !== 'function') return Promise.reject({ code: 'no-provider' });
      counters.sourceRequests++;
      if (reason === 'expired') counters.reauthorizations++;
      return Promise.resolve(provider.resolve(meta, { reason: reason || 'first-play' })).then(function (r) {
        if (!r || typeof r.src !== 'string' || !r.src) throw { code: 'source-failed' };
        if (!allowSource(r.src)) throw { code: 'source-rejected' };
        sources[k] = { src: r.src, expiresAt: typeof r.expiresAt === 'number' ? r.expiresAt : 0 };
        return r.src;
      });
    }

    function pauseOthers() {
      engines.forEach(function (e) { if (e !== api) e.handle('exclusive'); });
    }

    /* ---------- reprodução ---------- */
    function startAt(meta, startSec, reason) {
      var my = ++token;
      var k = key(meta);
      return ensureSource(meta, reason).then(function (src) {
        if (my !== token) return false;
        var a = ensureAdapter();
        var carga = Promise.resolve();
        if (adapterKey !== k || adapterSrc !== src) {
          /* Fonte nova (primeira vez, outro item ou reautorizada): o elemento
             volta a currentTime 0 ao trocar de src, por isso o ponto fica
             guardado em `positions` e é reposto depois da carga. */
          positions[k] = startSec; adapterKey = null; adapterSrc = null;
          carga = loadInto(a, src).then(function () { if (my === token) { adapterKey = k; adapterSrc = src; } });
        }
        return carga.then(function () {
          if (my !== token) return false;
          try { a.currentTime = clamp(startSec, 0, isFinite(a.duration) && a.duration > 0 ? a.duration : meta.duration); } catch (e) { /* ignore */ }
          a.playbackRate = rate;
          return Promise.resolve(a.play()).then(function () {
            if (my !== token) return false;
            reauthTries = 0;
            setState('playing');
            return true;
          });
        });
      }).catch(function (e) {
        if (my !== token) return false;
        return onPlayFailure(e, meta, startSec);
      });
    }

    function isExpired(e) {
      if (!e) return false;
      if (e.code === 'SRC_EXPIRED') return true;
      /* No elemento real um 403 de fonte expirada chega como MediaError 2 ou 4. Só se tenta UMA vez por falha. */
      return (e.code === 2 || e.code === 4) && !!(provider && typeof provider.resolve === 'function');
    }

    function onPlayFailure(e, meta, startSec) {
      var code = e && e.code;
      if (code === 'no-provider' || code === 'source-rejected' || code === 'source-failed') {
        return fail(code, 'fuente no disponible');
      }
      if (isExpired(e) && reauthTries < 1) {
        reauthTries++;
        return startAt(meta, startSec, 'expired');        // reautoriza e retoma do mesmo ponto
      }
      positions[key(meta)] = startSec;                    // a falha nunca apaga o ponto
      return fail(isExpired(e) ? 'expired' : 'media-error', 'no se pudo reproducir');
    }

    /* 'error' do elemento a meio da reprodução (p.ex. URL expirada). */
    function onAdapterError() {
      if (!current || !adapter || adapterKey !== key(current)) return;
      var e = adapter.error || { code: 'MEDIA_ERROR' };
      var t = isFinite(adapter.currentTime) ? adapter.currentTime : pos();
      var estavaTocando = state === 'playing' || state === 'loading';
      positions[key(current)] = clamp(t, 0, dur());
      if (isExpired(e) && !estavaTocando) {
        /* Expirou com o áudio em pausa: nada a mostrar. A fonte fica marcada
           como vencida; o próximo play() reautoriza e retoma do mesmo ponto. */
        if (sources[key(current)]) sources[key(current)].expiresAt = 1;
        adapterKey = null; adapterSrc = null;
        return;
      }
      if (isExpired(e) && reauthTries < 1) {
        reauthTries++;
        setState('loading');
        startAt(current, t, 'expired');
        return;
      }
      fail(isExpired(e) ? 'expired' : 'media-error', 'no se pudo reproducir');
    }

    /* ---------- UI ---------- */
    /* B1 manda: `html[data-rm-dock]` = side | bottom. Sem ele (harness isolado) cai no breakpoint sintético. */
    function dockB1() {
      try {
        var v = root.document.documentElement.getAttribute('data-rm-dock');
        return v === 'side' || v === 'bottom' ? v : null;
      } catch (e) { return null; }
    }
    function layoutMode() {
      var d = dockB1();
      if (d) return d === 'side' ? 'lateral' : 'bottom';
      try { return root.matchMedia && root.matchMedia('(min-width:' + BP_LATERAL + 'px)').matches ? 'lateral' : 'bottom'; }
      catch (e) { return 'bottom'; }
    }
    function mount() {
      var d = slot.ownerDocument;
      var el = d.createElement('div');
      el.className = 'rm-audio';
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', 'Audiolibro');
      el.hidden = true;
      el.innerHTML =
        '<div class="rm-audio__head">' +
          '<div class="rm-audio__meta"><span class="rm-audio__theme"></span><b class="rm-audio__title"></b></div>' +
          '<button type="button" class="rm-audio__btn rm-audio__close" data-a="close" aria-label="Cerrar el audiolibro">×</button>' +
        '</div>' +
        '<div class="rm-audio__bar">' +
          '<input class="rm-audio__seek" type="range" min="0" max="1" step="1" value="0" aria-label="Posición del audio">' +
          '<span class="rm-audio__time" aria-hidden="true">0:00 / 0:00</span>' +
        '</div>' +
        '<div class="rm-audio__ctl">' +
          '<button type="button" class="rm-audio__btn" data-a="restart" aria-label="Reiniciar desde el principio">⟲</button>' +
          '<button type="button" class="rm-audio__btn" data-a="back" aria-label="Retroceder 15 segundos">−15</button>' +
          '<button type="button" class="rm-audio__btn rm-audio__main" data-a="toggle" aria-label="Reproducir">▶</button>' +
          '<button type="button" class="rm-audio__btn" data-a="fwd" aria-label="Avanzar 15 segundos">+15</button>' +
          '<select class="rm-audio__rate" aria-label="Velocidad de reproducción"></select>' +
        '</div>' +
        '<p class="rm-audio__err" role="alert" hidden></p>';
      var sel = el.querySelector('.rm-audio__rate');
      RATES.forEach(function (r) {
        var o = d.createElement('option'); o.value = String(r); o.textContent = r + '×'; sel.appendChild(o);
      });
      el.addEventListener('click', function (ev) {
        var b = ev.target.closest && ev.target.closest('button[data-a]'); if (!b) return;
        var a = b.getAttribute('data-a');
        if (a === 'close') api.close();
        else if (a === 'restart') api.restart();
        else if (a === 'back') api.skip(-SKIP_S);
        else if (a === 'fwd') api.skip(SKIP_S);
        else if (a === 'toggle') { if (state === 'playing' || state === 'loading') api.pause(); else if (current) api.play(current); }
      });
      var seek = el.querySelector('.rm-audio__seek');
      seek.addEventListener('input', function () { el.querySelector('.rm-audio__time').textContent = fmt(+seek.value) + ' / ' + fmt(dur()); });
      seek.addEventListener('change', function () { api.seek(+seek.value); });
      sel.addEventListener('change', function () { api.setRate(+sel.value); });
      el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); api.close(); } });
      slot.appendChild(el);
      ui = el;
      if (root.matchMedia) {
        mql = root.matchMedia('(min-width:' + BP_LATERAL + 'px)');
        if (mql.addEventListener) mql.addEventListener('change', render);
      }
      /* Só o atributo do dock, só enquanto attached; sai no unmount(). */
      if (root.MutationObserver) {
        mo = new root.MutationObserver(function () { render(); });
        mo.observe(slot.ownerDocument.documentElement, { attributes: true, attributeFilter: ['data-rm-dock'] });
      }
    }
    function unmount() {
      if (mql && mql.removeEventListener) mql.removeEventListener('change', render);
      mql = null;
      if (mo) { mo.disconnect(); mo = null; }
      if (ui && ui.parentNode) ui.parentNode.removeChild(ui);
      if (slot) {
        slot.removeAttribute('data-rm-audio'); slot.style.removeProperty('--rm-audio-h');
        if (slotWasHidden) slot.hidden = true;           // devolve o slot ao estado em que o B1 o deixou
        try {
          var st = slot.ownerDocument.documentElement.style;
          st.removeProperty('--rm-audio-h'); st.removeProperty('--rm-player-h');
        } catch (e) { /* ignore */ }
      }
      slotWasHidden = false;
      ui = null;
    }
    function render() {
      if (!ui) return;
      var d = dur(), p = pos();
      ui.hidden = !isOpen;
      ui.setAttribute('data-state', state);
      var modo = layoutMode();
      ui.setAttribute('data-mode', modo);
      ui.setAttribute('data-layout', dockB1() ? 'b1' : 'fallback');
      slot.setAttribute('data-rm-audio', isOpen ? 'open' : 'closed');
      /* O slot é o contêiner reservado pelo B1 (nasce `hidden`): abre com o player, fecha com ele. */
      if (isOpen && slot.hidden) { slot.hidden = false; slotWasHidden = true; }
      else if (!isOpen && slotWasHidden) { slot.hidden = true; slotWasHidden = false; }
      ui.querySelector('.rm-audio__theme').textContent = current ? current.theme : '';
      ui.querySelector('.rm-audio__title').textContent = current ? current.title : '';
      var tocando = state === 'playing' || state === 'loading';
      var main = ui.querySelector('.rm-audio__main');
      main.textContent = tocando ? '❚❚' : '▶';
      main.setAttribute('aria-label', tocando ? 'Pausar' : 'Reproducir');
      main.setAttribute('aria-busy', String(state === 'loading'));
      var seek = ui.querySelector('.rm-audio__seek');
      seek.max = String(Math.max(1, Math.floor(d)));
      seek.value = String(Math.floor(p));
      seek.setAttribute('aria-valuetext', fmt(p) + ' de ' + fmt(d));
      ui.querySelector('.rm-audio__time').textContent = fmt(p) + ' / ' + fmt(d);
      ui.querySelector('.rm-audio__rate').value = String(rate);
      var e = ui.querySelector('.rm-audio__err');
      e.hidden = state !== 'error';
      e.textContent = state === 'error' ? 'No se pudo cargar el audio. Probá de nuevo.' : '';
      var h = isOpen && ui.offsetHeight ? ui.offsetHeight + 'px' : '0px';   // o conteúdo reserva este espaço (modo inferior)
      slot.style.setProperty('--rm-audio-h', h);
      try {
        var hs = slot.ownerDocument.documentElement.style;
        hs.setProperty('--rm-audio-h', h);
        hs.setProperty('--rm-player-h', modo === 'bottom' ? h : '0px');      // variável do B1: reserva/afasta o que for fixo
      } catch (e) { /* ignore */ }
    }

    /* ---------- API ---------- */
    var api = {
      attach: function (target) {
        if (destroyed) return false;
        var el = target == null ? SLOT_SELECTOR : target;
        var d = root.document;
        if (typeof el === 'string') el = d ? d.querySelector(el) : null;
        if (!el || el.nodeType !== 1) { err = { code: 'no-slot', message: 'slot inexistente' }; return false; }   // falha fechada: nada foi tocado
        if (slot === el && ui) return true;
        if (ui) unmount();
        slot = el; mount(); render();
        return true;
      },

      loadMetadata: function (item) {
        if (destroyed) return { ok: false, accepted: 0, errors: ['destroyed'] };
        var lista = Array.isArray(item) ? item : [item];
        var erros = [], aceites = 0;
        lista.forEach(function (raw, i) {
          var r = validateItem(raw);
          if (!r.ok) { r.errors.forEach(function (e) { erros.push((Array.isArray(item) ? '[' + i + '] ' : '') + e); }); return; }
          catalog[r.item.audio_id] = r.item; aceites++;
        });
        return { ok: erros.length === 0, accepted: aceites, errors: erros };
      },

      play: function (ref) {
        if (destroyed) return Promise.resolve(false);
        var meta = null;
        if (typeof ref === 'string') meta = catalog[ref] || null;
        else if (ref && typeof ref === 'object') {
          var r = validateItem(ref);
          if (!r.ok) { return Promise.resolve(fail('invalid-item', r.errors[0])); }
          catalog[r.item.audio_id] = r.item; meta = r.item;
        }
        if (!meta) return Promise.resolve(fail('unknown-item', 'item desconocido'));
        /* Falha fechada: sem player visível não há áudio (nada de som sem controlos). */
        if (!ui && !headless) return Promise.resolve(fail('no-slot', 'sin reproductor'));
        pauseOthers();
        if (current && key(current) !== key(meta)) { savePos(); pauseAdapter(); }   // A → B: pausa A, guarda onde estava
        current = meta; isOpen = true; err = null; reauthTries = 0;
        state = 'loading'; render(); emit('state', { state: 'loading' });
        return startAt(meta, positions[key(meta)] || 0, 'first-play');
      },

      pause: function () {
        if (destroyed || !current) return false;
        token++;                                     // aborta uma carga/play ainda pendente
        savePos(); pauseAdapter();
        if (state === 'playing' || state === 'loading') setState('paused');
        return true;
      },

      seek: function (seg) {
        if (destroyed || !current) return 0;
        var v = clamp(Number(seg) || 0, 0, dur());
        positions[key(current)] = v;
        if (adapter && adapterKey === key(current)) { try { adapter.currentTime = v; } catch (e) { /* ignore */ } }
        render();
        return v;
      },

      skip: function (delta) {
        if (destroyed || !current) return 0;
        return api.seek(pos() + (typeof delta === 'number' ? delta : SKIP_S));
      },

      setRate: function (r) {
        r = Number(r);
        if (destroyed || RATES.indexOf(r) < 0) return false;
        rate = r;
        sessionPrefs[userKey] = { rate: r };
        if (adapter) { try { adapter.playbackRate = r; adapter.defaultPlaybackRate = r; } catch (e) { /* ignore */ } }
        render();
        return true;
      },

      restart: function () {
        if (destroyed || !current) return false;
        token++;
        pauseAdapter();
        positions[key(current)] = 0;
        if (adapter && adapterKey === key(current)) { try { adapter.currentTime = 0; } catch (e) { /* ignore */ } }
        err = null;
        setState('paused');                          // NÃO toca sozinho
        return true;
      },

      close: function () {
        if (destroyed) return false;
        token++;
        savePos(); pauseAdapter();
        var estava = state === 'playing' || state === 'loading';
        isOpen = false;
        if (estava) { state = 'paused'; }
        render();
        if (estava) emit('state', { state: 'paused' });
        emit('close', { audio_id: current && current.audio_id });
        return true;
      },

      destroy: function () {
        if (destroyed) return false;
        token++;
        savePos();
        dropAdapter();
        unmount();
        var i = engines.indexOf(api); if (i >= 0) engines.splice(i, 1);
        destroyed = true; state = 'idle'; isOpen = false; sources = {}; catalog = {}; current = null;
        listeners = {};
        return true;
      },

      getState: function () {
        var lay = { mode: layoutMode(), source: dockB1() ? 'b1' : 'fallback', height: ui && isOpen ? ui.offsetHeight : 0 };
        return {
          state: state, open: isOpen, destroyed: destroyed, mounted: !!ui,
          audio_id: current ? current.audio_id : null,
          title: current ? current.title : null,
          position: pos(), duration: dur(), rate: rate, rates: RATES.slice(),
          positions: JSON.parse(JSON.stringify(positions)),
          error: err ? { code: err.code } : null,
          counters: { sourceRequests: counters.sourceRequests, adapterCreated: counters.adapterCreated, reauthorizations: counters.reauthorizations },
          hasAdapter: !!adapter, layout: lay
        };
      },

      refreshLayout: function () {
        if (destroyed) return null;
        render();
        return layoutMode();
      },

      handle: function (nome) {
        if (destroyed) return false;
        if (nome === 'logout') { api.pause(); return api.destroy(); }
        if (nome === 'subject-change' || nome === 'pause-request' || nome === 'exclusive') return api.pause();
        return false;
      },

      on: function (ev, fn) {
        (listeners[ev] = listeners[ev] || []).push(fn);
        return function () { listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; }); };
      }
    };

    engines.push(api);
    return api;
  }

  root.RMAudio = {
    create: create,
    validateItem: validateItem,
    validateManifest: validateManifest,
    pauseAll: function (motivo) { engines.slice().forEach(function (e) { e.handle(motivo === 'logout' ? 'logout' : 'pause-request'); }); },
    resetSession: function () { sessionPrefs = {}; },
    RATES: RATES.slice(),
    SKIP_SECONDS: SKIP_S,
    SLOT_SELECTOR: SLOT_SELECTOR
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RMAudio;
})(typeof window !== 'undefined' ? window : globalThis);
