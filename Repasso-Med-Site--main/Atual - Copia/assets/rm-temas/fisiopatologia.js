/* =====================================================================
   REPASSO MED · rm-temas/fisiopatologia.js
   Descritor do tema visual de Fisiopatología I (slug `fisiopatologia`).
   Usa SÓ a interface pública de rm-materia-sistema.js: RMSistema.registrarTema(slug, tema).

   O QUE É (e o que não é)
     · Dados: classificação de cada seção pela sua FUNÇÃO real, unidades, microcopy dos cartões de recursos.
     · Não liga nada: o tema só monta quando o servidor liberar a matéria (rm-pilot.js carrega este arquivo
       depois de rm-materia-sistema.js; essa ligação é do Claude 4). Sem registro ⇒ o módulo lança «sin tema» e o
       layout fica como estava.
     · Não move, não reescreve nem apaga conteúdo; não toca em motor de marcação, caneta, Supabase ou áudio.

   UNIDADES — as que já aparecem no conteúdo (marcadores «UNIDAD I · …» e «UNIDAD II · ANEMIAS»), com o nome
   que o conteúdo dá: «Unidad I» e «Unidad II». Nenhum nome novo é inventado aqui.

   ARTE — esta matéria não tem vinhetas nem medalhões aprovados (não existe assets/img/fisio/vig/). Sem imagem
   decorativa: `vig: null` faz o módulo usar o logotipo existente (assets/repasso-med-logo.png) como vinheta e
   `medallones: []` deixa a capa sem medalhões. NECESSIDADE REGISTRADA: arte decorativa por bloco (12 vinhetas
   de 480 px, recortadas de infografías aprovadas) e 1 a 3 medalhões de capa; quando existirem, basta preencher `vig`
   e `medallones` (e `vigDir`) aqui, sem mexer nos componentes.
   ===================================================================== */
(function () {
  'use strict';
  var SLUG = 'fisiopatologia';
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ordem real dos blocos de conteúdo (a numeração do conteúdo é a ordem das seções) */
  var BLOQUES = ['introduccion-fisio', 'inflamacion', 'hemorragia', 'cicatrizacion', 'edema', 'choque', 'anemias',
                 'globulos-brancos', 'coagulacao', 'asma-epoc', 'infecciones-respiratorias', 'infecciones-pulmonares'];

  function clasificar(id) {
    var i = BLOQUES.indexOf(id);
    if (i >= 0) { var n = i + 1; return { tipo: 'bloque', n: pad(n), num: n, cap: ((n - 1) % 6) + 1, vig: null }; }
    if (id === 'prova-fisio')      return { tipo: 'repaso', n: 'B', num: -1, cap: 'r', vig: null };   // banco general de preguntas
    if (id === 'flashcards-fisio') return { tipo: 'repaso', n: 'F', num: -1, cap: 'r', vig: null };   // flashcards · repaso general
    return { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null };
  }

  var tema = {
    vigDir: 'assets/img/',
    logo: 'assets/repasso-med-logo.png',
    unidades: {
      I:  { nombre: 'Unidad I',  color: '#B5604F' },
      II: { nombre: 'Unidad II', color: '#4F7FA3' }
    },
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
