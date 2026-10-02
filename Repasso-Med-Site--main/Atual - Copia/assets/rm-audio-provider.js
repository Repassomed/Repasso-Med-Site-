/* =====================================================================
   REPASSO MED · rm-audio-provider.js
   «provider» REAL do motor rm-audio.js (contrato: resolve(meta, ctx) →
   { src, expiresAt }) + lista de fontes permitidas. DORMENTE: nenhuma
   página o carrega nesta fase; nada aqui roda sozinho.

   · Não conhece bucket, caminho nem chave: pede URL ao SERVIDOR
     (`get-audio-url`) só no play() e só por `audio_id`.
   · O token de sessão vai no cabeçalho Authorization (nunca na URL).
   · `allowSource(SUPABASE_URL)` devolve o predicado que o motor usa para
     aceitar a fonte: só https do nosso projeto, só
     /storage/v1/object/sign/audiobooks/… — qualquer outra coisa é recusada.
   ===================================================================== */
(function (root) {
  'use strict';
  if (root.RMAudioProvider) return;

  var SLUG = 'semiologia-ii';
  var BASE = '/.netlify/functions';

  function create(cfg) {
    cfg = cfg || {};
    var f = cfg.fetch || (root.fetch ? root.fetch.bind(root) : null);
    var base = cfg.base || BASE, slug = cfg.slug || SLUG;
    var getToken = typeof cfg.getToken === 'function' ? cfg.getToken : function () { return Promise.resolve(''); };

    function pedir(caminho) {
      return Promise.resolve(getToken()).then(function (t) {
        if (!t || typeof t !== 'string') throw new Error('sin sesión');
        if (!f) throw new Error('sin fetch');
        return f(base + caminho, { method: 'GET', headers: { Authorization: 'Bearer ' + t }, cache: 'no-store', credentials: 'omit' });
      }).then(function (r) {
        if (!r || !r.ok) throw new Error('no disponible');
        return r.json();
      });
    }

    return {
      /* Chamado pelo motor só no play() (e na reautorização). */
      resolve: function (meta) {
        if (!meta || typeof meta.audio_id !== 'string') return Promise.reject(new Error('item inválido'));
        return pedir('/get-audio-url?slug=' + encodeURIComponent(slug) + '&audio_id=' + encodeURIComponent(meta.audio_id)).then(function (j) {
          if (!j || typeof j.src !== 'string' || !j.src) throw new Error('sin fuente');
          return { src: j.src, expiresAt: typeof j.expiresAt === 'number' ? j.expiresAt : 0 };
        });
      },
      /* Metadados (sem URL): o que o card/catálogo mostram. Nunca pede mídia. */
      loadManifest: function () {
        return pedir('/get-audio-manifest?slug=' + encodeURIComponent(slug)).then(function (j) {
          var lista = j && Array.isArray(j.items) ? j.items : [];
          if (!root.RMAudio || !root.RMAudio.validateManifest) return [];
          return root.RMAudio.validateManifest(lista).items;       // o motor recusa o que não for só metadado
        });
      }
    };
  }

  /* Predicado para `RMAudio.create({ allowSource })`. */
  function allowSource(supabaseUrl) {
    var prefix = '';
    try {
      var u = new URL(String(supabaseUrl));
      if (u.protocol === 'https:' && !u.username && !u.password) prefix = u.origin + '/storage/v1/object/sign/audiobooks/';
    } catch (e) { prefix = ''; }
    return function (src) {
      return !!prefix && typeof src === 'string' && src.indexOf(prefix) === 0 &&
        src.length > prefix.length && src.indexOf('..') < 0 && !/[\s\\]/.test(src) && src.indexOf('#') < 0;
    };
  }

  root.RMAudioProvider = { create: create, allowSource: allowSource };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RMAudioProvider;
})(typeof window !== 'undefined' ? window : globalThis);
