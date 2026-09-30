/* Adapter SINTÉTICO do D1: imita o essencial de um HTMLMediaElement sem tocar
   em nenhuma mídia e sem rede. Só vive dentro do harness. A duração sai do
   registo `window.__DUR[audio_id]`; o esquema da fonte é synthetic://<id>/<n>. */
(function (w) {
  'use strict';
  w.__DUR = w.__DUR || {};
  w.__fake = { created: [], srcAssignments: [], playCalls: 0, failLoad: 0, failPlay: 0, expired: {}, autoLoad: true };

  function FakeAudio() {
    var et = document.createDocumentFragment();   // EventTarget sem rede
    var self = this;
    this.addEventListener = function (n, f) { et.addEventListener(n, f); };
    this.removeEventListener = function (n, f) { et.removeEventListener(n, f); };
    function fire(n) { et.dispatchEvent(new Event(n)); }
    this._fire = fire;
    this.paused = true; this.error = null; this.readyState = 0;
    this.duration = NaN; this.playbackRate = 1; this.defaultPlaybackRate = 1; this.autoplay = false;
    this._t = 0; this._src = '';
    Object.defineProperty(this, 'currentTime', {
      get: function () { return self._t; },
      set: function (v) { self._t = Math.max(0, Math.min(v, isFinite(self.duration) ? self.duration : v)); fire('timeupdate'); }
    });
    Object.defineProperty(this, 'src', {
      get: function () { return self._src; },
      set: function (v) {
        self._src = v; w.__fake.srcAssignments.push(v);
        self._t = 0; self.duration = NaN; self.readyState = 0; self.error = null;   // como o elemento real
        if (!w.__fake.autoLoad) return;
        setTimeout(function () { self._settle(); }, 0);
      }
    });
    this._settle = function () {
      if (w.__fake.failLoad > 0) { w.__fake.failLoad--; self.error = { code: 4 }; fire('error'); return; }
      if (w.__fake.expired[self._src]) { self.error = { code: 'SRC_EXPIRED' }; fire('error'); return; }
      var id = (self._src.match(/^synthetic:\/\/([^/]+)\//) || [])[1];
      self.duration = w.__DUR[id] || 600; self.readyState = 4; fire('loadedmetadata');
    };
    this.load = function () { };
    this.removeAttribute = function () { self._src = ''; };
    this.play = function () {
      w.__fake.playCalls++;
      if (w.__fake.failPlay > 0) { w.__fake.failPlay--; self.error = { code: 4 }; return Promise.reject(new Error('NotSupportedError')); }
      if (w.__fake.expired[self._src]) { self.error = { code: 'SRC_EXPIRED' }; return Promise.reject(Object.assign(new Error('expired'), { code: 'SRC_EXPIRED' })); }
      self.paused = false; setTimeout(function () { fire('playing'); }, 0); return Promise.resolve();
    };
    this.pause = function () { self.paused = true; };
    /* Só para os testes: avança o relógio como se estivesse a tocar. */
    this.tick = function (s) {
      if (self.paused) return;
      self._t = Math.min(self._t + s * self.playbackRate, self.duration);
      fire('timeupdate');
      if (self._t >= self.duration) { self.paused = true; fire('ended'); }
    };
    /* Só para os testes: a fonte expira a meio da reprodução. */
    this.expireNow = function () { w.__fake.expired[self._src] = true; self.error = { code: 'SRC_EXPIRED' }; fire('error'); };
    w.__fake.created.push(this);
  }

  /* Provider SINTÉTICO: nunca devolve URL real. */
  w.__provider = {
    calls: [], failNext: 0, delay: 0, n: 0,
    resolve: function (meta, ctx) {
      var p = w.__provider;
      p.calls.push({ id: meta.audio_id, reason: ctx.reason });
      if (p.failNext > 0) { p.failNext--; return Promise.reject(new Error('provider down')); }
      var out = { src: 'synthetic://' + meta.audio_id + '/' + (++p.n) };
      return new Promise(function (r) { setTimeout(function () { r(out); }, p.delay); });
    }
  };
  w.__factory = function () { return new FakeAudio(); };
  w.FakeAudio = FakeAudio;

  /* Cria um motor novo para cada teste (destrói o anterior e zera contadores). */
  w.__mk = function (o) {
    o = o || {};
    if (w.E) { try { w.E.destroy(); } catch (e) { /* ignore */ } }
    w.__provider.calls.length = 0; w.__provider.n = 0; w.__provider.delay = 0; w.__provider.failNext = 0;
    var f = w.__fake; f.created.length = 0; f.srcAssignments.length = 0; f.playCalls = 0; f.failLoad = 0; f.failPlay = 0; f.expired = {}; f.autoLoad = true;
    w.__DUR = { a1: 300, b1: 600, c1: 90 };
    w.E = w.RMAudio.create({ provider: o.provider === null ? null : w.__provider, audioFactory: w.__factory, userKey: o.userKey || 'u1' });
    return true;
  };
})(window);
