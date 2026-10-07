/* Derivações sobre inventario.json compartilhadas por inventario-md.cjs e contrato.cjs. */
'use strict';
/* flashcards DISTINTOS (pela frente) e a seção agregadora («revisão geral»/«mazo»/«cierre»: cópia dos itens dos blocos) */
function agregadora(lista, distintos) {
  const m = lista.slice().sort((x, y) => y.itens - x.itens)[0];
  return m && m.itens >= 0.5 * distintos ? m.id : null;
}
function fcUnicos(m) { return { unicos: m.unicos.fc, copiaEm: agregadora(m.unicos.copiasFc, m.unicos.fc) }; }
function qUnicos(m) { return { unicos: m.unicos.quiz, copiaEm: agregadora(m.unicos.copiasQuiz, m.unicos.quiz) }; }
/* `declaradas`/`GLOBAL_SEC` foram REMOVIDAS: comparavam o número da portada com qualquer contagem candidata (inclusive o total do DOM com cópias). A regra correta é R5 em regras.cjs. */
module.exports = { agregadora, fcUnicos, qUnicos };
