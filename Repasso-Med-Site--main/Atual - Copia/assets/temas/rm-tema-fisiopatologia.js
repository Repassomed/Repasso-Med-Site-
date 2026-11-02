/* REPASSO MED · rm-tema-fisiopatologia.js — descritor do tema visual da Nova Era (Fisiopatología I, slug `fisiopatologia`).
   Só dados: classificação das seções pela FUNÇÃO real, unidades do conteúdo, vinhetas, medalhões, microcopy. Não toca DOM, conteúdo, ids nem dados do aluno.
   Registro (mesmo padrão dos demais temas): fica em window.RM_TEMAS[slug] para o carregador da base e, se o sistema já existe, é registrado
   por RMSistema.registrarTema(slug, tema). Não liga nada: o tema só monta quando o servidor liberar a matéria.

   UNIDADES — as que já aparecem no conteúdo: 11 blocos «UNIDAD I» e `anemias` «UNIDAD II»; nomes «Unidad I» e «Unidad II».
   ARTE — vinhetas (480 px, webp) recortadas de infografías que já são o conteúdo da matéria (assets/img/fisio/vig/; proveniência em
   docs/nova-era-temas/PROVENIENCIA-IMAGENS-FISIO1-FARMACO1.md). Nenhum original foi tocado. Revisão (blocos de revisão): logotipo. */
(function () {
  'use strict';
  var SLUG = 'fisiopatologia';
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ordem real dos blocos de conteúdo (a numeração do conteúdo é a ordem das seções) */
  var BLOQUES = ['introduccion-fisio', 'inflamacion', 'hemorragia', 'cicatrizacion', 'edema', 'choque', 'anemias',
                 'globulos-brancos', 'coagulacao', 'asma-epoc', 'infecciones-respiratorias', 'infecciones-pulmonares'];

  function clasificar(id) {
    var i = BLOQUES.indexOf(id);
    if (i >= 0) { var n = i + 1; return { tipo: 'bloque', n: pad(n), num: n, cap: ((n - 1) % 6) + 1, vig: 'vb-' + pad(n) }; }
    if (id === 'prova-fisio')      return { tipo: 'repaso', n: 'B', num: -1, cap: 'r', vig: null };   // banco general de preguntas
    if (id === 'flashcards-fisio') return { tipo: 'repaso', n: 'F', num: -1, cap: 'r', vig: null };   // flashcards · repaso general
    return { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null };
  }

  var tema = {
    vigDir: 'assets/img/fisio/vig/',
    logo: 'assets/repasso-med-logo.png',
    unidades: {
      I:  { nombre: 'Unidad I',  color: '#B5604F' },
      II: { nombre: 'Unidad II', color: '#4F7FA3' }
    },
    medallones: [
      { vig: 'vb-01', t: 'LESIÓN CELULAR', cap: 1, tam: 178, ml: 0,   mt: 0,   rot: -3, z: 3 },
      { vig: 'vb-07', t: 'ANEMIAS',        cap: 6, tam: 150, ml: -26, mt: 60,  rot: 2,  z: 2 },
      { vig: 'vb-12', t: 'PULMÓN',         cap: 3, tam: 128, ml: -6,  mt: -40, rot: -2, z: 1 }
    ],
    recursos: {
      fig:  'Revisión visual por bloques',
      quiz: 'Preguntas de práctica por bloques',
      fc:   'Repaso activo por bloques'
    },
    clasificar: clasificar
  };
  (window.RM_TEMAS = window.RM_TEMAS || {})[SLUG] = tema;
  if (window.RMSistema && typeof window.RMSistema.registrarTema === 'function') window.RMSistema.registrarTema(SLUG, tema);
})();
