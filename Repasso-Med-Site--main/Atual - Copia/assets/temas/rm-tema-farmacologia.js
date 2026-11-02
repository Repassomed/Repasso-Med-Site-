/* REPASSO MED · rm-tema-farmacologia.js — descritor do tema visual da Nova Era (Farmacología I, slug `farmacologia`).
   Só dados: classificação das seções pela FUNÇÃO real, vinhetas, medalhões, microcopy. Não toca DOM, conteúdo, ids nem dados do aluno.
   Registro (mesmo padrão dos demais temas): window.RM_TEMAS[slug] para o carregador da base e, se o sistema já existe,
   RMSistema.registrarTema(slug, tema). Não liga nada.

   UNIDADES — o conteúdo desta matéria NÃO tem unidades (marcadores «BLOQUE NN» e «BASE»): nenhuma é criada
   (os rótulos «UNIDAD ·» que o módulo geraria para um grupo único são ocultados em rm-tema-farmacologia.css).
   NUMERAÇÃO — a dos títulos do conteúdo (01–17); os ids não a carregam, então o mapa abaixo a reproduz. As 3 seções «BASE»
   (SNA, receptores adrenérgicos e colinérgicos) são ensino de base com título numerado (03, 05, 06): funcionam como bloco.
   ARTE — 17 vinhetas (480 px, webp) recortadas de infografías que já são o conteúdo (assets/img/farmaco/vig/; proveniência em
   docs/nova-era-temas/PROVENIENCIA-IMAGENS-FISIO1-FARMACO1.md). Seções de revisão: logotipo. */
(function () {
  'use strict';
  var SLUG = 'farmacologia';
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var NUM = { 'pk': 1, 'pd': 2, 'sna': 3, 'placa-motora': 4, 'adrenergicos': 5, 'colinergicos': 6, 'adren-agon-antag': 7,
              'beta-adrenergicos': 8, 'aines': 9, 'opioides': 10, 'corticoides': 11, 'antihistaminicos': 12, 'anestesicos': 13,
              'penicilinas': 14, 'cefalosporinas': 15, 'macrolidos': 16, 'aminoglucosidos': 17 };

  function clasificar(id) {
    if (Object.prototype.hasOwnProperty.call(NUM, id)) { var n = NUM[id]; return { tipo: 'bloque', n: pad(n), num: n, cap: ((n - 1) % 6) + 1, vig: 'vb-' + pad(n) }; }
    if (id === 'farmacos-clave')    return { tipo: 'repaso', n: 'T', num: -1, cap: 'r', vig: null };   // tabla única de repaso
    if (id === 'cuestionario1')     return { tipo: 'repaso', n: 'P', num: -1, cap: 'r', vig: null };   // preguntas de práctica
    if (id === 'prova-farmaco')     return { tipo: 'repaso', n: 'B', num: -1, cap: 'r', vig: null };   // banco de preguntas
    if (id === 'flashcards-grales') return { tipo: 'repaso', n: 'F', num: -1, cap: 'r', vig: null };   // flashcards generales
    return { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null };
  }

  var tema = {
    vigDir: 'assets/img/farmaco/vig/',
    logo: 'assets/repasso-med-logo.png',
    unidades: {},
    medallones: [
      { vig: 'vb-01', t: 'FARMACOCINÉTICA', cap: 1, tam: 178, ml: 0,   mt: 0,   rot: -3, z: 3 },
      { vig: 'vb-05', t: 'RECEPTORES',      cap: 5, tam: 150, ml: -26, mt: 60,  rot: 2,  z: 2 },
      { vig: 'vb-13', t: 'ANESTÉSICOS',     cap: 1, tam: 128, ml: -6,  mt: -40, rot: -2, z: 1 }
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
