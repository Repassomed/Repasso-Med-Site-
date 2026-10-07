/* CASOS NEGATIVOS do validador do contrato (issue #457). Pequenos HTMLs sintéticos que PRECISAM falhar em R4, R5 e R9 (e controles que precisam passar).
   Para cada caso mostra também o que a REGRA ANTIGA (réplica fiel da versão anterior de contrato.cjs, criticada na auditoria da PR #459) responderia:
   nos casos marcados «bug» ela PASSAVA indevidamente; a regra nova tem de FALHAR.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/contrato.teste.cjs        (código de saída 1 se algum caso não se comportar como esperado) */
'use strict';
const M_ = require('./modelo.cjs');
const R = require('./regras.cjs');

/* ---------------- construtores de fixture ---------------- */
const q = (id, txt, attrs = '') => `<div class="quiz-item" ${id ? `id="${id}"` : ''} ${attrs}><div class="quiz-question">${txt}</div><ul class="options"><li>a) um</li><li>b) dois</li></ul></div>`;
const fc = (front, attrs = '') => `<div class="flashcard" ${attrs}><div class="fc-front"><b>${front}</b></div><div class="fc-back">resposta de ${front}</div></div>`;
const fig = (src, cap) => `<figure><img src="${src}" alt=""><figcaption>${cap}</figcaption></figure>`;
const sec = (id, attrs, inner, h2 = 'Título') => `<section id="${id}" ${attrs}>${h2 ? `<h2>${h2}</h2>` : ''}${inner}</section>`;
const pagina = (...secs) => `<!doctype html><html><body><div class="tab-content" id="tab-t">${secs.join('\n')}</div></body></html>`;
const portada = (texto, attrs = 'data-rm-role="guia"') => sec('tportada', attrs, `<p>${texto}</p>`);
const hero = (texto) => `<section class="hero"><p>${texto}</p></section>`;   // capa sem id (como em Farmacología I / Semiología I)

/* marcadores completos (controle positivo): 2 blocos, banco com 2 cópias ligadas, revisão de flashcards ligada */
const completo = (over = {}) => pagina(
  portada(over.capa || '2 preguntas · 2 flashcards'),
  sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um', 'data-rm-q="q-t001"') + fc('Frente um', 'data-rm-fc="fc-1"')),
  sec('tb02', 'data-rm-role="bloque" data-rm-n="02"', q('q-t002', 'Pergunta dois', 'data-rm-q="q-t002"') + fc('Frente dois', 'data-rm-fc="fc-2"')),
  sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"') + q('bq-t002', 'Pergunta dois', 'data-rm-copia-de="q-t002"')),
  sec('trevisao', 'data-rm-role="repaso" data-rm-agrega="fc"', fc('Frente um', 'data-rm-copia-de="fc-1"') + fc('Frente dois', 'data-rm-copia-de="fc-2"'))
);

/* ---------------- RÉPLICAS DA REGRA ANTIGA (versão criticada) ---------------- */
function antiga(M, html) {
  const ag = R.agregadoras(M);
  const todas = M.secs.flatMap(s => s.quiz.map(x => ({ ...x, sec: s.id, banco: ag.eh(s.id) })));
  const corpo = todas.filter(x => !x.banco), banco = todas.filter(x => x.banco);
  const stemsCorpo = new Set(corpo.map(x => x.stem)), idsCorpo = new Set(corpo.map(x => x.id).filter(Boolean));
  const orfaos = banco.filter(x => !(x.id && idsCorpo.has(x.id.replace(/^bq-/, 'q-'))) && !stemsCorpo.has(x.stem)).length;
  const casaId = banco.filter(x => x.id && idsCorpo.has(x.id.replace(/^bq-/, 'q-'))).length;
  const r4 = banco.length === 0 || (orfaos === 0 && (casaId === banco.length || /data-rm-copia-de=/.test(html)));      // «qualquer data-rm-copia-de no arquivo»
  const temAgreg = M.secs.some(s => ag.eh(s.id));
  const r9 = /data-rm-role=/.test(html) && (!temAgreg || /data-rm-agrega/.test(html)) && (banco.length === 0 || /data-rm-copia-de=/.test(html));   // «presença global»
  const dom = { quiz: todas.length, fc: M.secs.reduce((a, s) => a + s.fc.length, 0) };
  const dist = { quiz: new Set(todas.map(x => x.stem)).size, fc: new Set(M.secs.flatMap(s => s.fc.map(f => f.front))).size };
  const corpoN = { quiz: corpo.length, fc: M.secs.filter(s => !ag.eh(s.id)).reduce((a, s) => a + s.fc.length, 0) };
  const portadas = M.secs.filter((s, i) => !s.quiz.length && !s.fc.length && i === 0);
  const decl = M.decl.filter(d => d.sec === '(capa)' || portadas.some(p => p.id === d.sec));
  const r5 = decl.every(d => { const k = /preguntas/.test(d.rec) ? 'quiz' : /flashcards|tarjetas/.test(d.rec) ? 'fc' : null; if (!k) return true; return [dom[k], dist[k], corpoN[k]].includes(d.n); });   // «qualquer candidata, inclusive o DOM total»
  return { R4: r4, R9: r9, R5: r5 };
}

/* ---------------- casos ---------------- */
const CASOS = [
  /* ===== R4 ===== */
  { id: 'R4-controle', regra: 'R4', esperado: true, html: completo() },
  { id: 'R4-N1 · 3 cópias, só 1 com data-rm-copia-de (as outras sem vínculo)', regra: 'R4', esperado: false, bug: true, html: pagina(portada('3 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um') + q('q-t002', 'Pergunta dois') + q('q-t003', 'Pergunta tres')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('cp-1', 'Pergunta um', 'data-rm-copia-de="q-t001"') + q('cp-2', 'Pergunta dois') + q('cp-3', 'Pergunta tres'))) },
  { id: 'R4-N2 · cópia aponta para questão inexistente', regra: 'R4', esperado: false, bug: true, html: pagina(portada('1 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('cp-1', 'Pergunta um', 'data-rm-copia-de="q-nao-existe"'))) },
  { id: 'R4-N3 · cópia com texto diferente da canônica', regra: 'R4', esperado: false, bug: true, html: pagina(portada('1 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Outro enunciado completamente diferente', 'data-rm-copia-de="q-t001"'))) },
  { id: 'R4-N4 · duas cópias da MESMA canônica', regra: 'R4', esperado: false, bug: true, html: pagina(portada('2 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um') + q('q-t002', 'Pergunta dois')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('cp-1', 'Pergunta um', 'data-rm-copia-de="q-t001"') + q('cp-2', 'Pergunta um', 'data-rm-copia-de="q-t001"'))) },
  { id: 'R4-N5 · canônica sem cópia no Banco (espelho quebrado)', regra: 'R4', esperado: false, bug: true, html: pagina(portada('2 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um') + q('q-t002', 'Pergunta dois')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"'))) },
  { id: 'R4-N6 · cópia que casa só por enunciado (sem id nem marcador)', regra: 'R4', esperado: false, bug: false, html: pagina(portada('1 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('', 'Pergunta um')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('', 'Pergunta um'))) },

  /* ===== R9 ===== */
  { id: 'R9-controle', regra: 'R9', esperado: true, html: completo() },
  { id: 'R9-N1 · UMA seção sem data-rm-role (as outras têm)', regra: 'R9', esperado: false, bug: true, html: pagina(portada('1 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um', 'data-rm-q="q-t001"')),
    sec('tb02', '', q('q-t002', 'Pergunta dois', 'data-rm-q="q-t002"')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"') + q('bq-t002', 'Pergunta dois', 'data-rm-copia-de="q-t002"'))) },
  { id: 'R9-N2 · bloco sem data-rm-n', regra: 'R9', esperado: false, bug: true, html: pagina(portada('1 preguntas'),
    sec('tb01', 'data-rm-role="bloque"', q('q-t001', 'Pergunta um', 'data-rm-q="q-t001"')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"'))) },
  { id: 'R9-N3 · agregadora sem data-rm-agrega (há marcador em outra seção)', regra: 'R9', esperado: false, bug: true, html: pagina(portada('1 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um', 'data-rm-q="q-t001"') + fc('Frente um', 'data-rm-fc="fc-1"')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"')),
    sec('trevisao', 'data-rm-role="repaso"', fc('Frente um', 'data-rm-copia-de="fc-1"'))) },
  { id: 'R9-N4 · UMA pergunta canônica sem data-rm-q (as outras têm)', regra: 'R9', esperado: false, bug: true, html: pagina(portada('2 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um', 'data-rm-q="q-t001"') + q('q-t002', 'Pergunta dois')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"') + q('bq-t002', 'Pergunta dois', 'data-rm-copia-de="q-t002"'))) },
  { id: 'R9-N5 · UMA cópia do Banco sem data-rm-copia-de (as outras têm)', regra: 'R9', esperado: false, bug: true, html: pagina(portada('2 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um', 'data-rm-q="q-t001"') + q('q-t002', 'Pergunta dois', 'data-rm-q="q-t002"')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"') + q('bq-t002', 'Pergunta dois'))) },
  { id: 'R9-N6 · vídeo sem data-rm-video', regra: 'R9', esperado: false, bug: false, html: pagina(portada('0 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', '<details class="video-collapsible"><summary>v</summary><iframe src="https://www.youtube.com/embed/abc"></iframe></details>')) },

  /* ===== R5 ===== */
  { id: 'R5-controle (2 preguntas · 2 flashcards)', regra: 'R5', esperado: true, html: completo({ capa: '2 preguntas · 2 flashcards' }) },
  { id: 'R5-N1 · capa diz 4 preguntas = TOTAL DO DOM duplicado (2 canônicas + 2 cópias)', regra: 'R5', esperado: false, bug: true, html: completo({ capa: '4 preguntas · 2 flashcards' }) },
  { id: 'R5-N2 · capa diz 4 flashcards = TOTAL DO DOM duplicado (2 canônicos + 2 cópias)', regra: 'R5', esperado: false, bug: true, html: completo({ capa: '2 preguntas · 4 flashcards' }) },
  { id: 'R5-N3 · capa diz 1 pregunta (nem canônico nem DOM)', regra: 'R5', esperado: false, bug: false, html: completo({ capa: '1 preguntas · 2 flashcards' }) },
  { id: 'R5-N4 · capa diz 4 infografías = figuras do bloco + as repetidas na agregadora', regra: 'R5', esperado: false, bug: false, html: pagina(portada('4 infografías'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', fig('a.webp', 'Fig a') + fig('b.webp', 'Fig b')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"') + fig('a.webp', 'Fig a') + fig('b.webp', 'Fig b'))) },
  { id: 'R5-N6 · número declarado no HERO (section.hero sem id) = total do DOM duplicado', regra: 'R5', esperado: false, bug: true, html: pagina(hero('4 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um', 'data-rm-q="q-t001"') + q('q-t002', 'Pergunta dois', 'data-rm-q="q-t002"')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"') + q('bq-t002', 'Pergunta dois', 'data-rm-copia-de="q-t002"'))) },
  { id: 'R5-controle-hero (2 preguntas no hero)', regra: 'R5', esperado: true, html: pagina(hero('2 preguntas'),
    sec('tb01', 'data-rm-role="bloque" data-rm-n="01"', q('q-t001', 'Pergunta um', 'data-rm-q="q-t001"') + q('q-t002', 'Pergunta dois', 'data-rm-q="q-t002"')),
    sec('tbanco', 'data-rm-role="repaso" data-rm-agrega="quiz"', q('bq-t001', 'Pergunta um', 'data-rm-copia-de="q-t001"') + q('bq-t002', 'Pergunta dois', 'data-rm-copia-de="q-t002"'))) },
  { id: 'R5-N5 · capa diz 2 bloques e a matéria não tem marcador nem convenção …bNN (indeterminado)', regra: 'R5', esperado: false, bug: false, html: pagina(portada('2 bloques', ''),
    sec('introduccion', '', q('', 'Pergunta um')), sec('tema-dois', '', q('', 'Pergunta dois'))) }
];

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const pg = await M_.abrirPagina(chromium);
  let falhas = 0; const linhas = [];
  for (const c of CASOS) {
    const M = await pg.modelar(c.html);
    const A = R.avaliar(M, { html: c.html });
    const novo = A[c.regra].ok, velho = antiga(M, c.html)[c.regra];
    const okNovo = novo === c.esperado;
    const okBug = !c.bug || velho === true;       // nos casos «bug» a regra antiga PRECISA ter passado (senão a réplica não demonstra nada)
    if (!okNovo || !okBug) falhas++;
    linhas.push({ id: c.id, regra: c.regra, esperado: c.esperado ? 'PASSA' : 'FALHA', novo: novo ? 'PASSA' : 'FALHA', antiga: velho ? 'PASSA' : 'FALHA', ok: okNovo && okBug, motivo: A[c.regra].resumo.slice(0, 120) });
  }
  await pg.fechar();
  console.log('caso'.padEnd(92), 'regra', 'esperado', 'nova  ', 'antiga', 'resultado');
  linhas.forEach(l => console.log(l.id.padEnd(92), l.regra.padEnd(5), l.esperado.padEnd(8), l.novo.padEnd(6), l.antiga.padEnd(6), l.ok ? '✔' : '✖ FALHOU NO TESTE', l.motivo ? '\n    ↳ ' + l.motivo : ''));
  const neg = linhas.filter(l => l.esperado === 'FALHA'), pos = linhas.filter(l => l.esperado === 'PASSA');
  const bugs = CASOS.filter(c => c.bug).length;
  console.log(`\n${neg.length} casos negativos (todos precisam FALHAR na regra nova): ${neg.filter(l => l.novo === 'FALHA').length} falharam ✔ · ${pos.length} controles positivos: ${pos.filter(l => l.novo === 'PASSA').length} passaram ✔ · ${bugs} casos em que a regra ANTIGA passava indevidamente`);
  process.exit(falhas ? 1 : 0);
})();
