/* Derivações sobre inventario.json compartilhadas por inventario-md.cjs e contrato.cjs. */
'use strict';
/* flashcards DISTINTOS (pela frente) e a seção agregadora («revisão geral»/«mazo»/«cierre»: cópia dos itens dos blocos) */
function agregadora(lista, distintos) {
  const m = lista.slice().sort((x, y) => y.itens - x.itens)[0];
  return m && m.itens >= 0.5 * distintos ? m.id : null;
}
function fcUnicos(m) { return { unicos: m.unicos.fc, copiaEm: agregadora(m.unicos.copiasFc, m.unicos.fc) }; }
function qUnicos(m) { return { unicos: m.unicos.quiz, copiaEm: agregadora(m.unicos.copiasQuiz, m.unicos.quiz) }; }
const GLOBAL_SEC = m => { const g = new Set(); m.secoes.forEach((x, i) => { if (!x.quiz && !x.fc && (i === 0 || /portada|intro|guia|inicio|00$|^h2p|^hp0/i.test(x.id))) g.add(x.id); }); return g; };
function declaradas(m) {
  const fu = fcUnicos(m), qu = qUnicos(m), glob = GLOBAL_SEC(m); const out = []; const vistos = new Set();
  const secPor = Object.fromEntries(m.secoes.map(x => [x.id, x]));
  m.declaradas.forEach(d => {
    const rec = d.rec.replace('í', 'i'); const sec = secPor[d.sec];
    if (/^stat:/.test(d.ctx) || !d.sec) return;      // estatísticas do próprio banco: tratadas à parte
    const k = d.sec + '|' + d.n + rec; if (vistos.has(k)) return; vistos.add(k);
    if (glob.has(d.sec)) {   // declaração global (portada) × totais distintos
      const ops = ({
        preguntas: { 'distintas(enun.)': qu.unicos, 'distintas(enun.+opc.)': m.unicos.quizComOpc, 'corpo': m.questoes.corpo, 'DOM total': m.questoes.total },
        flashcards: { 'distintos': fu.unicos, 'DOM total': m.flashcards.total },
        infografias: { 'figuras c/ legenda': m.figuras }, bloques: { 'blocos numerados (id …bNN)': m.secoes.filter(x => /b\d+$/i.test(x.id)).length, 'blocos do índice': m.particularidades.menuComAlvo, 'seções': m.nSecoes }
      })[rec]; if (!ops) return;
      out.push({ n: d.n, rec, esc: 'global', sec: d.sec, ops, casa: Object.entries(ops).filter(([, v]) => v === d.n).map(([n]) => n) });
    } else if (sec) {        // declaração do próprio bloco × o que o bloco tem
      const ops = ({ preguntas: { 'q. do bloco': sec.quiz }, flashcards: { 'fc do bloco': sec.fc }, infografias: { 'figuras do bloco': sec.fig }, videos: { 'vídeos do bloco': sec.vid } })[rec];
      if (!ops) return;
      out.push({ n: d.n, rec, esc: 'bloco', sec: d.sec, ops, casa: Object.entries(ops).filter(([, v]) => v === d.n).map(([n]) => n) });
    }
  });
  return out;
}

module.exports = { agregadora, fcUnicos, qUnicos, declaradas, GLOBAL_SEC };
