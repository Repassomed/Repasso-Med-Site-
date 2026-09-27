// Issue #275 — prova comportamental de que o contexto do HEAD enviado
// aos auditores vem da REGIÃO DO DIFF, não da primeira ocorrência global.
// Issue #305 — evidência didática guiada pelo question_report (Lei 8-A):
// ver os testes a partir de "question_report" mais abaixo.
// Node `node:test` embutido, zero dependência nova. Rodado pela suíte
// Python via coordinator/tests/test_head_context_anchor.py.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarContextoHead, parseHunks, LIMITE_PADRAO } from './head_context.mjs';

const ARQ = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/sintetica.html';

// Um bloco no formato real das matérias: resumo com h3/h4, depois quiz com
// "VERDADERO"/"Respuesta"/"Por qué" repetidos em todos os blocos.
function bloco(id, titulo, ensinoUnico, extraLinhas = 0) {
  const l = [];
  l.push(`<section class="container" id="${id}">`);
  l.push(`  <h2>${titulo}</h2>`);
  l.push(`  <h3>📚 Resumen explicado</h3>`);
  l.push(`  <p>Texto introductorio del bloque ${titulo}. La respuesta correcta depende del material; verdadero o falso.</p>`);
  for (let i = 0; i < extraLinhas; i++) {
    l.push(`  <p>Relleno ${id}-${i}: la respuesta es verdadero cuando el enunciado coincide con el material del bloque; por qué importa la explicación.</p>`);
  }
  l.push(`  <h4>Clasificación que se evalúa</h4>`);
  l.push(`  <p>${ensinoUnico}</p>`);
  l.push(`  <h3>📝 Preguntas basadas en evaluaciones — ${titulo}</h3>`);
  l.push(`  <div class="quiz-item">`);
  l.push(`    <p class="quiz-question">Enunciado V/F del bloque ${titulo}.</p>`);
  l.push(`    <div class="tf-buttons"><button onclick="checkTF(this, true)">VERDADERO</button><button>FALSO</button></div>`);
  l.push(`    <div class="answer"><p><span class="answer-tag">✓ Respuesta</span> <strong>VERDADERO.</strong></p><p><span class="answer-tag expl">📝 Por qué</span> Coincide con el material del bloque.</p></div>`);
  l.push(`  </div>`);
  l.push(`</section>`);
  return l;
}

function montarArquivo() {
  const linhas = ['<!doctype html>', '<html><body>'];
  const blocos = [
    ['s2-b01', 'Semiología general', 'Bloque A: la inspección general se describe en cuatro tiempos ordenados.'],
    ['s2-b02', 'Hipertensión arterial', 'Bloque B: PA elevada en consultorio corresponde a PAS 120–139 mmHg y PAD 70–89 mmHg según la tabla del material.'],
    ['s2-b03', 'Electrocardiograma', 'Bloque C: el eje eléctrico normal va de -30 a +90 grados.'],
  ];
  const inicioBloco = {};
  for (const [id, titulo, ensino] of blocos) {
    inicioBloco[id] = linhas.length + 1;
    linhas.push(...bloco(id, titulo, ensino, 400));
  }
  linhas.push('</body></html>');
  return { linhas, inicioBloco };
}

// Diff sintético: altera a EXPLICAÇÃO da questão do bloco B (uma linha
// removida, uma adicionada), com as palavras genéricas que o algoritmo
// antigo usava ("respuesta", "verdadero", "coincide", "material").
function diffNoBlocoB(linhas) {
  const alvo = linhas.findIndex((l, i) => l.includes('class="answer"') && linhas.slice(0, i).some((x) => x.includes('id="s2-b02"')) && !linhas.slice(0, i).some((x) => x.includes('id="s2-b03"')));
  const n = alvo + 1; // 1-based, lado novo
  const antigo = linhas[alvo];
  const novo = antigo.replace('Coincide con el material del bloque.', 'Coincide con el material del bloque: verdadero según la tabla utilizada en esta evaluación.');
  linhas[alvo] = novo;
  const ctx = (i) => ' ' + linhas[i - 1];
  const diff = [
    `diff --git a/${ARQ} b/${ARQ}`,
    'index 1111111..2222222 100644',
    `--- a/${ARQ}\t`,
    `+++ b/${ARQ}\t`,
    `@@ -${n - 3},7 +${n - 3},7 @@`,
    ctx(n - 3), ctx(n - 2), ctx(n - 1),
    '-' + antigo,
    '+' + novo,
    ctx(n + 1), ctx(n + 2), ctx(n + 3),
    '',
  ].join('\n');
  return { diff, linhaAlterada: n };
}

test('HTML grande com termos repetidos: contexto vem do bloco B, não do primeiro bloco', () => {
  const { linhas, inicioBloco } = montarArquivo();
  const { diff, linhaAlterada } = diffNoBlocoB(linhas);
  const content = linhas.join('\n');
  assert.ok(content.length > 150_000, `arquivo precisa ser grande (${content.length})`);
  assert.ok(linhaAlterada > inicioBloco['s2-b02'] && linhaAlterada < inicioBloco['s2-b03']);

  // Prova de que o algoritmo antigo erraria: a PRIMEIRA ocorrência global
  // dos termos genéricos do diff está no bloco A.
  const lower = content.toLowerCase();
  for (const termo of ['respuesta', 'verdadero', 'coincide', 'material']) {
    const idx = lower.indexOf(termo);
    const linhaIdx = content.slice(0, idx).split('\n').length;
    assert.ok(linhaIdx < inicioBloco['s2-b02'], `"${termo}" deveria aparecer primeiro no bloco A`);
  }

  const ctx = montarContextoHead({ diffTexto: diff, arquivos: [{ filename: ARQ, content }], sha: 'abc123' });
  assert.match(ctx, /Região do diff · linhas \d+–\d+ · seção id="s2-b02"/);
  assert.ok(ctx.includes('Bloque B: PA elevada en consultorio'), 'o ensino do bloco B precisa estar no contexto');
  assert.ok(ctx.includes('verdadero según la tabla utilizada'), 'a linha alterada precisa estar no contexto');
  assert.ok(!ctx.includes('Bloque A:'), 'o ensino do bloco A não pode entrar');
  assert.ok(!ctx.includes('Bloque C:'), 'o ensino do bloco C não pode entrar');
  assert.ok(!/Relleno s2-b01-/.test(ctx), 'nenhum trecho do bloco A');
  assert.ok(ctx.length <= LIMITE_PADRAO);
});

test('o ensino ANTES da questão tem prioridade sobre conteúdo depois dela', () => {
  const { linhas } = montarArquivo();
  const { diff } = diffNoBlocoB(linhas);
  const ctx = montarContextoHead({ diffTexto: diff, arquivos: [{ filename: ARQ, content: linhas.join('\n') }], sha: 'x' });
  const iEnsino = ctx.indexOf('Clasificación que se evalúa');
  assert.ok(iEnsino > 0, 'subseção de ensino anterior ao hunk escolhida');
});

test('teto rígido de tamanho é respeitado mesmo com limite pequeno', () => {
  const { linhas } = montarArquivo();
  const { diff } = diffNoBlocoB(linhas);
  for (const limite of [300, 1200, LIMITE_PADRAO]) {
    const ctx = montarContextoHead({ diffTexto: diff, arquivos: [{ filename: ARQ, content: linhas.join('\n') }], sha: 'x', limite });
    assert.ok(ctx.length <= limite, `limite ${limite} estourado: ${ctx.length}`);
    assert.ok(ctx.length > 0);
  }
});

test('fail-closed: arquivo sem hunk no diff não recebe trecho inventado', () => {
  const { linhas } = montarArquivo();
  const ctx = montarContextoHead({ diffTexto: '', arquivos: [{ filename: ARQ, content: linhas.join('\n') }], sha: 'x' });
  assert.ok(ctx.includes('fail-closed'));
  assert.ok(!ctx.includes('Bloque A:') && !ctx.includes('<!doctype html>'), 'nunca o começo do arquivo como "contexto"');
});

test('espelho (mesma alteração em outra seção, ex.: Banco General) não duplica a busca', () => {
  const { linhas } = montarArquivo();
  const { diff } = diffNoBlocoB(linhas);
  // Mesmo hunk replicado na seção do bloco C, como a cópia do banco.
  const iC = linhas.findIndex((l) => l.includes('id="s2-b03"'));
  const alvo = linhas.findIndex((l, i) => i > iC && l.includes('class="answer"'));
  const n = alvo + 1;
  const partes = diff.split('\n');
  const removida = partes.find((l) => l.startsWith('-') && !l.startsWith('---'));
  const adicionada = partes.find((l) => l.startsWith('+') && !l.startsWith('+++'));
  const espelho = [`@@ -${n},1 +${n},1 @@`, removida, adicionada, ''].join('\n');
  const ctx = montarContextoHead({ diffTexto: diff + espelho, arquivos: [{ filename: ARQ, content: linhas.join('\n') }], sha: 'x' });
  assert.match(ctx, /seção id="s2-b03".*espelho/);
  assert.ok(!ctx.includes('Bloque C:'), 'espelho não puxa ensino da outra seção');
  assert.ok(ctx.includes('Bloque B:'));
});

test('parseHunks lê o lado novo (HEAD) com caminho contendo espaços e TAB final', () => {
  const diff = [
    `diff --git a/${ARQ} b/${ARQ}`,
    `--- a/${ARQ}\t`,
    `+++ b/${ARQ}\t`,
    '@@ -10,3 +12,4 @@',
    ' a',
    '+b',
    ' c',
    '-d',
    ' e',
  ].join('\n');
  const h = parseHunks(diff).get(ARQ);
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].alteradas, [13, 15]);
});

// ---------------------------------------------------------------------
// Issue #305 — evidência didática guiada pelo question_report (Lei 8-A).
//
// Caso real: PR #305 (Neurología P0) inseriu 4 questões novas em 3 blocos
// (neub02/neub03/neub05, > MAX_CLUSTERS_POR_ARQUIVO). O OpenAI Auditor
// reprovou porque os trechos que ensinam Wernicke/Brodmann 22, V par,
// marcha en tijeras e o signo vestibular nunca chegavam ao pacote —
// alguns blocos nem eram processados pela camada de diff (corte de
// cluster), e quando eram, a janela de contexto cortava a frase certa
// antes de alcançá-la numa subseção longa.
// ---------------------------------------------------------------------

const ARQ_8A = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/sintetica-8a.html';

const CABECALHO_MATRIZ =
  '| Fonte | Página/imagem | Legibilidade | Detectadas | Aproveitadas | Novas | Reformuladas | ' +
  'Duplicadas/canônicas | Reconstruídas | Pendentes | Destino no site |';

function relatorio8A(linhasDaMatriz) {
  return [
    '## Relatório obrigatório — Lei das Questões (8-A.11)',
    '',
    '### Matriz por fonte',
    '',
    CABECALHO_MATRIZ,
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...linhasDaMatriz,
    '',
    '**Confirmação de cobertura:** RESUMO ENSINA → QUESTÃO COBRA → EXPLICAÇÃO REFORÇA',
  ].join('\n');
}

function linhaMatriz(novas, destino) {
  return `| Foto | pág | CLARA | ${novas} | ${novas} | ${novas} | 0 | 0 | 0 | 0 | ${destino} |`;
}

// 3 blocos com preenchimento (post-its/notas com palavras genéricas,
// como no arquivo real) e cada um ensinando um fato ÚNICO e distante da
// questão — igual ao caso real (a tabela/ficha que sustenta a resposta
// não fica logo antes da pergunta, mas em outro ponto da mesma seção).
function montarArquivo8A() {
  const l = ['<!doctype html>', '<html><body>'];

  l.push('<section class="container" id="neuA">');
  l.push('  <h2>Bloque Alfa</h2>');
  l.push('  <h3>Resumen</h3>');
  for (let i = 0; i < 30; i++) l.push(`  <p>Relleno neuA-${i}: la respuesta correcta depende del material del bloque.</p>`);
  l.push('  <h4>Concepto alfazona</h4>');
  l.push('  <p>El concepto ALFAZONA está codificado como alfacodigo42, en la región alfaregión.</p>');
  for (let i = 0; i < 5; i++) l.push(`  <p>Relleno neuA-b-${i}: nada relevante aquí.</p>`);
  l.push('  <h3>Preguntas</h3>');
  l.push('</section>');

  l.push('<section class="container" id="neuB">');
  l.push('  <h2>Bloque Beta</h2>');
  l.push('  <h3>Resumen largo</h3>');
  // Subseção ÚNICA e longa (sem outro heading no meio), com os dois fatos
  // (beta/gamma) separados por ~35 linhas de preenchimento — a mesma
  // distância real que separava "signo patognomónico… nistagmo" do pico
  // de pontuação de "3.3 · Rama vestibular" na PR #305.
  l.push('  <h4>Ficha ampliada</h4>');
  l.push('  <p>El concepto BETAFENOMENO se define por betamarcador77 en el tejido betatejido.</p>');
  for (let i = 0; i < 35; i++) l.push(`  <p>Relleno neuB-${i}: descripción neutra sin relación con la pregunta.</p>`);
  l.push('  <p>El concepto GAMMAEFECTO se reconoce por gammaindicador99, distinto de betafenomeno.</p>');
  l.push('  <h3>Preguntas</h3>');
  l.push('  <div class="quiz-item" id="q-old-beta-gamma-placeholder"></div>');
  l.push('</section>');

  l.push('<section class="container" id="neuC">');
  l.push('  <h2>Bloque Gama</h2>');
  l.push('  <h3>Resumen</h3>');
  for (let i = 0; i < 20; i++) l.push(`  <p>Relleno neuC-${i}: la respuesta correcta depende del material del bloque.</p>`);
  l.push('  <h4>Concepto deltasigno</h4>');
  l.push('  <p>El concepto DELTASIGNO aparece cuando hay deltamarcador55 en el examen físico.</p>');
  l.push('  <h3>Preguntas</h3>');
  l.push('</section>');

  // Um 4º bloco puramente para exceder MAX_CLUSTERS_POR_ARQUIVO junto com
  // os 3 acima — prova que a camada Lei 8-A não depende do corte de
  // cluster da camada de diff.
  l.push('<section class="container" id="neuPortada">');
  l.push('  <span>10 preguntas</span>');
  l.push('</section>');

  l.push('</body></html>');
  return l;
}

/** Insere `novasLinhas` logo após a linha que casa `ancora` (1 hunk só). */
function diffInserindoApos(linhasOriginais, ancora, novasLinhas) {
  const { diff, final } = construirDiffMultiplasInsercoes(linhasOriginais, [{ ancora, linhas: novasLinhas }]);
  return { diff, depois: final };
}

/**
 * Constrói UM diff válido (multi-hunk) que insere, em `base` (array
 * original, nunca mutado), cada grupo de `linhas` logo após a primeira
 * linha que contém `ancora` — em QUALQUER ordem de `insercoes`, em pontos
 * não sobrepostos do arquivo. Cada hunk usa o número de linha NOVO
 * correto (soma dos deltas das inserções anteriores, na ordem real do
 * arquivo), então múltiplas inserções distantes compõem um diff git
 * unificado de verdade — sem precisar recalcular offsets manualmente a
 * cada chamada (achado da 1ª tentativa deste teste: fazer isso à mão
 * gerava cabeçalhos `@@` com o número de linha novo errado).
 */
function construirDiffMultiplasInsercoes(base, insercoes) {
  const comIndice = insercoes
    .map((ins) => ({ ...ins, idxBase: base.findIndex((l) => l.includes(ins.ancora)) }))
    .sort((a, b) => a.idxBase - b.idxBase);
  for (const ins of comIndice) {
    if (ins.idxBase < 0) throw new Error(`âncora não encontrada: ${ins.ancora}`);
  }
  let deltaAcumulado = 0;
  let offsetFinal = 0;
  const hunks = [];
  const final = base.slice();
  for (const ins of comIndice) {
    const oldStart = ins.idxBase + 1;
    const newStart = oldStart + deltaAcumulado;
    hunks.push(
      [
        `@@ -${oldStart},1 +${newStart},${1 + ins.linhas.length} @@`,
        ' ' + base[ins.idxBase],
        ...ins.linhas.map((t) => '+' + t),
      ].join('\n')
    );
    final.splice(ins.idxBase + 1 + offsetFinal, 0, ...ins.linhas);
    offsetFinal += ins.linhas.length;
    deltaAcumulado += ins.linhas.length;
  }
  const diff = [
    `diff --git a/${ARQ_8A} b/${ARQ_8A}`,
    `--- a/${ARQ_8A}\t`,
    `+++ b/${ARQ_8A}\t`,
    ...hunks,
    '',
  ].join('\n');
  return { diff, final };
}

// Duas menções ao conceito+marcador (pergunta e resposta), como uma MCQ
// real (enunciado + alternativas + explicação) — precisa de PELO MENOS 2
// termos raros em comum com a subseção que ensina, senão a subseção nunca
// pontua o `distintos >= 2` exigido por `evidenciaLei8ADoBloco`.
function questaoNova(id, conceito, marcador) {
  return [
    `<div class="quiz-item" id="${id}">`,
    `<p class="quiz-question">¿Qué caracteriza a ${conceito}?</p>`,
    `<ul class="options"><li>a) Se relaciona con ${marcador}.</li><li>b) No tiene relación.</li></ul>`,
    `<div class="answer"><p><strong>${conceito}</strong> se identifica por ${marcador}.</p></div>`,
    '</div>',
  ];
}

test('question_report: evidência vem do bloco citado em "Destino no site", mesmo com > MAX_CLUSTERS_POR_ARQUIVO blocos alterados', () => {
  const base = montarArquivo8A();
  // Q-beta e Q-gama entram no MESMO ponto de neuB — um hunk só com DUAS
  // questões distantes de conceito, como Q2+Q4 da #305 (um único
  // `@@ ... @@` cobrindo as duas inserções adjacentes).
  const { diff: diffCompleto, final: linhasFinal } = construirDiffMultiplasInsercoes(base, [
    { ancora: '<span>10 preguntas</span>', linhas: ['<span>11 preguntas</span>'] }, // trivial, não é questão
    { ancora: 'id="neuA"', linhas: questaoNova('q-neuA-1', 'ALFAZONA', 'alfacodigo42') },
    { ancora: 'id="neuC"', linhas: questaoNova('q-neuC-1', 'DELTASIGNO', 'deltamarcador55') },
    {
      ancora: 'q-old-beta-gamma-placeholder',
      linhas: [
        ...questaoNova('q-neuB-beta', 'BETAFENOMENO', 'betamarcador77'),
        ...questaoNova('q-neuB-gamma', 'GAMMAEFECTO', 'gammaindicador99'),
      ],
    },
  ]);

  const prBody = relatorio8A([
    linhaMatriz(1, 'neuA `q-neuA-1`'),
    linhaMatriz(1, 'neuC `q-neuC-1`'),
    linhaMatriz(2, 'neuB `q-neuB-beta` + `q-neuB-gamma`'),
  ]);

  const content = linhasFinal.join('\n');
  const ctx = montarContextoHead({
    diffTexto: diffCompleto,
    arquivos: [{ filename: ARQ_8A, content }],
    sha: 'deadbeef',
    prBody,
  });

  assert.ok(ctx.includes('Evidência didática (Lei 8-A · question_report)'));
  // Os 4 conceitos ensinados — nos 3 blocos — precisam estar no pacote,
  // mesmo neuB tendo DUAS questões distantes na MESMA subseção longa e o
  // arquivo tendo 4 blocos alterados (> MAX_CLUSTERS_POR_ARQUIVO = 3).
  for (const termo of ['alfacodigo42', 'betamarcador77', 'gammaindicador99', 'deltamarcador55']) {
    assert.ok(ctx.includes(termo), `"${termo}" precisa estar na evidência didática`);
  }
  assert.ok(ctx.length <= LIMITE_PADRAO);
});

test('question_report: nenhuma questão nova/reformulada → não aciona a camada Lei 8-A', () => {
  const linhas = montarArquivo8A();
  const { diff, depois } = diffInserindoApos(linhas, 'id="neuA"', questaoNova('q-neuA-1', 'ALFAZONA', 'alfacodigo42'));
  const prBody = relatorio8A([linhaMatriz(0, 'neuA `q-neuA-1`')]); // 0 novas — reformulação já existente sem gap.
  const ctx = montarContextoHead({ diffTexto: diff, arquivos: [{ filename: ARQ_8A, content: depois.join('\n') }], sha: 'x', prBody });
  assert.ok(!ctx.includes('Evidência didática (Lei 8-A'));
});

test('question_report: fail-closed quando "Destino no site" não referencia um bloco real — nunca adivinha', () => {
  const linhas = montarArquivo8A();
  const { diff, depois } = diffInserindoApos(linhas, 'id="neuA"', questaoNova('q-neuA-1', 'ALFAZONA', 'alfacodigo42'));
  const prBody = relatorio8A([linhaMatriz(1, 'neuInexistente `q-neuA-1`')]);
  const ctx = montarContextoHead({ diffTexto: diff, arquivos: [{ filename: ARQ_8A, content: depois.join('\n') }], sha: 'x', prBody });
  assert.ok(ctx.includes('Evidência didática (Lei 8-A) — relatório 8-A'));
  assert.ok(ctx.includes('não referencia nenhum'));
  // "alfacodigo42" pode aparecer no diff da própria questão nova (camada
  // de #275, mostrando o que mudou) — o que NUNCA pode existir é um
  // trecho de EVIDÊNCIA DIDÁTICA (Lei 8-A) inventado para um bloco que o
  // relatório não resolveu contra nenhum id real.
  assert.ok(!ctx.includes('Evidência didática (Lei 8-A · question_report)'), 'sem bloco resolvido, nenhuma evidência didática pode ser adivinhada');
});

test('question_report: sem tabela 8-A no corpo da PR, comportamento idêntico ao de antes da #305', () => {
  const { linhas, inicioBloco } = montarArquivo();
  const { diff } = diffNoBlocoB(linhas);
  const semReport = montarContextoHead({ diffTexto: diff, arquivos: [{ filename: ARQ, content: linhas.join('\n') }], sha: 'x' });
  const comReportVazio = montarContextoHead({ diffTexto: diff, arquivos: [{ filename: ARQ, content: linhas.join('\n') }], sha: 'x', prBody: 'sem nenhuma tabela 8-A aqui' });
  assert.equal(semReport, comReportVazio);
  assert.ok(!semReport.includes('Lei 8-A'));
});
