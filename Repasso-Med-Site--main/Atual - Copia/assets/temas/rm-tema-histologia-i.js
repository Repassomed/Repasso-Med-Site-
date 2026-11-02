/* REPASSO MED · rm-tema-histologia-i.js — descritor de tema da Nova Era (Histología I).
   Só dados: classificação das seções reais (histo00…histo14, histo-imgnote), vinhetas, medalhões, microcopy. Não toca DOM, conteúdo, ids nem dados do aluno.
   Registro: RMSistema.registrarTema(slug, descritor) quando o sistema já existe; senão fica em window.RM_TEMAS[slug] para o carregador da base. */
(function () {
  'use strict';
  var SLUG = 'histologia-i';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /* ids reais: histo01…histo12 = BLOQUE 01–12 (Parcial 1: 01–05 · Parcial 2: 06–12), histo13 banco general, histo14 flashcards, histo-imgnote bibliografía */
  function clasificar(id) {
    var m = /^histo(\d+)$/.exec(id);
    if (m) {
      var n = +m[1];
      if (n >= 1 && n <= 12) return { tipo: 'bloque', n: pad(n), num: n, cap: ((n - 1) % 6) + 1, vig: 'vb-' + pad(n) };
      if (n === 13) return { tipo: 'repaso', n: 'B', num: -1, cap: 'r', vig: null };
      if (n === 14) return { tipo: 'repaso', n: 'F', num: -1, cap: 'r', vig: null };
      if (n === 0)  return { tipo: 'otro',   n: '·', num: -1, cap: 'g', vig: null };   // histo00: âncora vazia e oculta (placeholder)
    }
    if (id === 'histo-imgnote') return { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null };
    return { tipo: 'otro', n: '·', num: -1, cap: 'g', vig: null };
  }
  var tema = {
    vigDir: 'assets/img/histo1/vig/',
    logo: 'assets/repasso-med-logo.png',
    /* agrupamento real dos marcadores («BLOQUE 04 · PARCIAL 1 · …»); hoje só informativo: a base lê unidades do marcador «UNIDAD …» */
    grupos: { parcial1: ['histo01', 'histo02', 'histo03', 'histo04', 'histo05'], parcial2: ['histo06', 'histo07', 'histo08', 'histo09', 'histo10', 'histo11', 'histo12'] },
    unidades: {},
    medallones: [
      { vig: 'vb-02', t: 'EPITELIO',  cap: 2, tam: 178, ml: 0,   mt: 0,   rot: -3, z: 3 },
      { vig: 'vb-07', t: 'HUESO',     cap: 1, tam: 150, ml: -26, mt: 60,  rot: 2,  z: 2 },
      { vig: 'vb-12', t: 'NEURONA',   cap: 6, tam: 128, ml: -6,  mt: -40, rot: -2, z: 1 }
    ],
    recursos: {
      fig:  'Infografías por tejido',
      quiz: 'Basadas en examen + complementarias',
      fc:   'Reconocer el tejido y su función',
      aud:  ''
    },
    clasificar: clasificar
  };
  (window.RM_TEMAS = window.RM_TEMAS || {})[SLUG] = tema;
  if (window.RMSistema && typeof window.RMSistema.registrarTema === 'function') window.RMSistema.registrarTema(SLUG, tema);
})();
