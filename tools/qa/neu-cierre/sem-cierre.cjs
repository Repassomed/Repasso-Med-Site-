/* Neurología · 20/11/2026 · retirada do bloco «Cierre · ¿dónde está la lesión?» (seção revisaoneu).
   semCierre(html) devolve o HTML ANTIGO com o trecho do cierre trocado pelo cabeçalho do mazo (marcador + h2 + marcador oculto `neuAZ`) e com as duas frases (portada e comentário) atualizadas,
   isto é, o que o HTML NOVO deve ser. Serve para as guardas «nada mudou» de outras suítes continuarem medindo só o que lhes interessa. Idempotente: se o cierre já não existe, devolve o texto como está. */
'use strict';
const H4 = '<h4>🎴 Mazo general · Neurología</h4>';
const CABECALHO = '\n<div class="section-marker"><span class="section-marker-num">MAZO GENERAL · TODAS LAS FLASHCARDS</span></div>\n<h2>🎴 Mazo general · Neurología</h2>\n<span id="neuAZ" hidden aria-hidden="true" data-rm-retirado="cierre-2026-11-20"></span>\n';
function semCierre(h) {
  const a = h.indexOf('<section class="container" id="revisaoneu"'); if (a < 0) return h;
  const op = a + h.slice(a).indexOf('>') + 1; const hi = h.indexOf(H4, a); if (hi < 0) return h;
  return (h.slice(0, op) + CABECALHO + h.slice(hi + H4.length))
    .replace(/Dos páginas de cierre que <b>no traen contenido nuevo<\/b>: el <b>banco general<\/b>, con\s+todas las preguntas juntas, y el <b>repaso final<\/b>, con el algoritmo de localización, las\s+tablas de lateralidad y el mazo completo\. Son para comprobar, no para aprender\./,
      'Dos páginas de repaso que <b>no traen contenido nuevo</b>: el <b>banco general</b>, con\n        todas las preguntas juntas, y el <b>mazo general</b>, con todas las flashcards. Son para\n        comprobar, no para aprender.')
    .replace('revisaoneu  Cierre · algoritmo de localización y mazo general', 'revisaoneu  Mazo general de flashcards');
}
module.exports = { semCierre, CABECALHO, H4 };
