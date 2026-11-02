/* =====================================================================
   REPASSO MED · rm-temas/farmacologia.js
   Descritor do tema visual de Farmacología I (slug `farmacologia`).
   Usa SÓ a interface pública de rm-materia-sistema.js: RMSistema.registrarTema(slug, tema).

   O QUE É (e o que não é)
     · Dados: classificação de cada seção pela sua FUNÇÃO real, microcopy dos cartões de recursos.
     · Não liga nada: o tema só monta quando o servidor liberar a matéria (rm-pilot.js carrega este arquivo
       depois de rm-materia-sistema.js; essa ligação é do Claude 4). Sem registro ⇒ «sin tema» e o layout
       fica como estava.
     · Não move, não reescreve nem apaga conteúdo; não toca em motor de marcação, caneta, Supabase ou áudio.

   UNIDADES — o conteúdo desta matéria NÃO tem unidades: os marcadores são «BLOQUE NN» e «BASE». Nenhuma unidade
   é criada. Os 17 blocos formam um único grupo (ver rm-temas/farmacologia.css para os rótulos de unidade).

   NUMERAÇÃO — a do conteúdo: os títulos são «01 · Farmacocinética» … «17 · Aminoglucósidos y Sulfonamidas»; os
   ids não carregam o número, então o mapa abaixo reproduz a numeração dos títulos. As 3 seções «BASE» (SNA,
   receptores adrenérgicos e colinérgicos) são ensino de base com título numerado (03, 05, 06): funcionam como
   bloco. `farmacos-clave` é a tabla única de repaso; `cuestionario1` é o cuestionario de práctica (repaso).

   ARTE — sem vinhetas nem medalhões aprovados (não existe assets/img/farmaco/vig/). `vig: null` ⇒ logotipo
   existente como vinheta; `medallones: []`. NECESSIDADE REGISTRADA: 17 vinhetas de 480 px (recortes de
   infografías aprovadas) e 1 a 3 medalhões de capa.
   ===================================================================== */
(function () {
  'use strict';
  var SLUG = 'farmacologia';
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* número do título de cada bloco */
  var NUM = { 'pk': 1, 'pd': 2, 'sna': 3, 'placa-motora': 4, 'adrenergicos': 5, 'colinergicos': 6, 'adren-agon-antag': 7,
              'beta-adrenergicos': 8, 'aines': 9, 'opioides': 10, 'corticoides': 11, 'antihistaminicos': 12, 'anestesicos': 13,
              'penicilinas': 14, 'cefalosporinas': 15, 'macrolidos': 16, 'aminoglucosidos': 17 };

  function clasificar(id) {
    if (Object.prototype.hasOwnProperty.call(NUM, id)) { var n = NUM[id]; return { tipo: 'bloque', n: pad(n), num: n, cap: ((n - 1) % 6) + 1, vig: null }; }
    if (id === 'farmacos-clave')    return { tipo: 'repaso', n: 'T', num: -1, cap: 'r', vig: null };   // tabla única de repaso
    if (id === 'cuestionario1')     return { tipo: 'repaso', n: 'P', num: -1, cap: 'r', vig: null };   // preguntas de práctica
    if (id === 'prova-farmaco')     return { tipo: 'repaso', n: 'B', num: -1, cap: 'r', vig: null };   // banco de preguntas
    if (id === 'flashcards-grales') return { tipo: 'repaso', n: 'F', num: -1, cap: 'r', vig: null };   // flashcards generales
    return { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null };
  }

  var tema = {
    vigDir: 'assets/img/',
    logo: 'assets/repasso-med-logo.png',
    unidades: {},
    medallones: [],
    recursos: {
      fig:  'Revisión visual por bloques',
      quiz: 'Preguntas de práctica por bloques',
      fc:   'Repaso activo por bloques'
    },
    clasificar: clasificar
  };

  var registrado = false;
  try { registrado = !!(window.RMSistema && typeof window.RMSistema.registrarTema === 'function' && window.RMSistema.registrarTema(SLUG, tema)); } catch (e) { registrado = false; }
  window.RMTemas = window.RMTemas || {};
  window.RMTemas[SLUG] = { tema: tema, registrado: registrado };
})();
