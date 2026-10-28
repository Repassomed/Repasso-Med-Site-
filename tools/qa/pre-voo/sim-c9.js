/* PRÉ-VOO · simulação EM MEMÓRIA de C9 + B2 (nada é gravado em arquivo de matéria nem de módulo). Uso: RM_ENSAIO_INIT=tools/qa/pre-voo/sim-c9.js node tools/qa/ensaio-layout/ensaio.cjs --corr --rapido <slug …>
   C9 (B1): o módulo passaria a ignorar `section[hidden]:empty` ao enumerar blocos. Aqui o efeito é obtido tirando o placeholder do DOM ANTES de o layout montar (o módulo real o ignoraria mantendo-o no DOM; a diferença só importa para a âncora dos grifos, medida no teste 2).
   B2: dá um <h2> à seção que só tem um <h4> de bibliografia (ap2biblio). */
(function () {
  function limpar() {
    document.querySelectorAll('#materias-container .tab-content > section[hidden]:empty').forEach(function (s) { s.remove(); });
    var b = document.querySelector('#ap2biblio:not([data-sim-b2])');
    if (b && !b.querySelector('h2')) { var h = document.createElement('h2'); h.textContent = 'Bibliografía'; b.insertBefore(h, b.firstChild); b.setAttribute('data-sim-b2', ''); }
  }
  new MutationObserver(limpar).observe(document, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', limpar);
})();
