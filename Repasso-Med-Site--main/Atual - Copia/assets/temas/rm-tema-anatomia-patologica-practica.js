/* REPASSO MED · rm-tema-anatomia-patologica-practica.js — descritor de tema da Nova Era (AP I Práctica).
   Só dados: classificação das seções reais (b1…b12), vinhetas, medalhões, microcopy. Não toca DOM, conteúdo, ids nem dados do aluno.
   Registro: RMSistema.registrarTema(slug, descritor) quando o sistema já existe; senão fica em window.RM_TEMAS[slug] para o carregador da base. */
(function () {
  'use strict';
  var SLUG = 'anatomia-patologica-practica';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /* ids reais: b1…b9 = temas 01–09 (vinheta de b2…b9: recorte circular do corte histológico da própria lámina), b10 laminario, b11 flashcards, b12 ruleta */
  function clasificar(id) {
    var m = /^b(\d+)$/.exec(id);
    if (m) {
      var n = +m[1];
      if (n >= 1 && n <= 9) return { tipo: 'bloque', n: pad(n), num: n, cap: ((n - 1) % 6) + 1, vig: n >= 2 ? 'vb-' + pad(n) : null };
      if (n === 10) return { tipo: 'repaso', n: 'L', num: -1, cap: 'r', vig: null };
      if (n === 11) return { tipo: 'repaso', n: 'F', num: -1, cap: 'r', vig: null };
      if (n === 12) return { tipo: 'repaso', n: 'R', num: -1, cap: 'r', vig: null };
    }
    return { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null };
  }
  var tema = {
    vigDir: 'assets/img/anatoprat/vig/',
    logo: 'assets/repasso-med-logo.png',
    /* agrupamento didático real dos marcadores («TEMA 02 · ADAPTACIÓN CELULAR · …»); hoje só informativo: a base lê unidades do marcador «UNIDAD …» */
    grupos: {
      b1: 'Introducción', b2: 'Adaptación celular', b3: 'Adaptación celular', b4: 'Lesión celular', b5: 'Acumulaciones',
      b6: 'Inflamación', b7: 'Neoplasia', b8: 'Neoplasia', b9: 'Patología vascular'
    },
    unidades: {},
    medallones: [
      { vig: 'vb-04', t: 'NECROSIS',     cap: 3, tam: 178, ml: 0,   mt: 0,   rot: -3, z: 3 },
      { vig: 'vb-06', t: 'INFLAMACIÓN',  cap: 5, tam: 150, ml: -26, mt: 60,  rot: 2,  z: 2 },
      { vig: 'vb-08', t: 'NEOPLASIA',    cap: 1, tam: 128, ml: -6,  mt: -40, rot: -2, z: 1 }
    ],
    recursos: {
      fig:  'Cortes y láminas por tema',
      quiz: 'Basadas en examen + complementarias',
      fc:   'Reconocer la lámina de un vistazo',
      aud:  ''
    },
    clasificar: clasificar
  };
  (window.RM_TEMAS = window.RM_TEMAS || {})[SLUG] = tema;
  if (window.RMSistema && typeof window.RMSistema.registrarTema === 'function') window.RMSistema.registrarTema(SLUG, tema);
})();
