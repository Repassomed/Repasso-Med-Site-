// Issue #275 — prova comportamental de que o contexto do HEAD enviado
// aos auditores vem da REGIÃO DO DIFF, não da primeira ocorrência global.
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
