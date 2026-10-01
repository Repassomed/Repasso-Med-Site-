/* =====================================================================
   REPASSO MED · rm-audio-store.js
   Armazenamento da POSIÇÃO do audiobook (retomada após recarregar).
   DORMENTE: nenhuma página o carrega nesta fase.

   · Um número por chave — nunca título, tema, URL, token ou texto do aluno.
   · Por utilizador (`userKey`, o UID autenticado): outro utilizador no mesmo
     navegador não lê nem apaga a posição de José.
   · Só localStorage; sem rede, sem cookies, sem Supabase. Se o navegador
     recusar (modo privado, quota), `get` devolve null e `set` é ignorado:
     o motor degrada para memória sem quebrar.
   · A chave do motor é `audio_id@version`: nova versão do áudio ⇒ outra chave.

   Uso (futura integração):
     RMAudio.create({ ..., positionStore: RMAudioStore.local(uid) })
     // no logout: RMAudioStore.local(uid).clear()
   ===================================================================== */
(function (root) {
  'use strict';
  if (root.RMAudioStore) return;

  var PREFIX = 'rm.audio.pos.';

  function storage() { try { return root.localStorage || null; } catch (e) { return null; } }

  function local(userKey) {
    var p = PREFIX + String(userKey || 'anon').replace(/[^a-z0-9_-]/gi, '_') + '.';
    return {
      get: function (k) {
        var s = storage(); if (!s) return null;
        try {
          var v = s.getItem(p + k);
          if (v === null || v === '') return null;
          var n = Number(v);
          return isFinite(n) ? n : null;
        } catch (e) { return null; }
      },
      set: function (k, seg) {
        var s = storage(); if (!s || typeof seg !== 'number' || !isFinite(seg)) return;
        try { s.setItem(p + k, String(seg)); } catch (e) { /* quota / modo privado */ }
      },
      remove: function (k) {
        var s = storage(); if (!s) return;
        try { s.removeItem(p + k); } catch (e) { /* ignore */ }
      },
      /* só as chaves DESTE utilizador */
      clear: function () {
        var s = storage(); if (!s) return;
        try {
          var apagar = [];
          for (var i = 0; i < s.length; i++) { var n = s.key(i); if (n && n.indexOf(p) === 0) apagar.push(n); }
          apagar.forEach(function (n) { s.removeItem(n); });
        } catch (e) { /* ignore */ }
      }
    };
  }

  root.RMAudioStore = { local: local, PREFIX: PREFIX };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RMAudioStore;
})(typeof window !== 'undefined' ? window : globalThis);
