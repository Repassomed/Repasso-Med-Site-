// Testes de coordinator-observe.yml (Issue #264, race condition do
// comentário #5822771107) para resolve_guard_run.mjs. Nenhuma dependência
// externa — só node:test/node:assert, embutidos desde o Node 18. Rodar:
//
//   node --test .github/workflows/scripts/resolve_guard_run.test.mjs
//
// (também exposto via `coordinator.tests.test_guard_run_resolver_race`,
// que roda este arquivo via subprocess e entra na suíte Python padrão.)

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverExecucaoDoGuard, MAX_TENTATIVAS_PADRAO, ESPERA_MS_PADRAO } from './resolve_guard_run.mjs';

const RUN_ID = 36053601451;
const NOME = 'Repasso Guard';
const BRANCH = 'main';

function runCompleted(overrides = {}) {
  return { name: NOME, head_branch: BRANCH, status: 'completed', conclusion: 'success', head_sha: 'abc123', id: RUN_ID, pull_requests: [], ...overrides };
}

function runEmProgresso(overrides = {}) {
  return { name: NOME, head_branch: BRANCH, status: 'in_progress', conclusion: null, head_sha: 'abc123', id: RUN_ID, pull_requests: [], ...overrides };
}

// Espião de sleep: nunca espera de verdade (testes instantâneos), só
// registra quanto foi pedido — prova que o algoritmo realmente chama
// dormir() com esperaMs entre tentativas, sem depender de um timer real.
function espiaoDeSleep() {
  const chamadas = [];
  return { dormir: async (ms) => { chamadas.push(ms); }, chamadas };
}

test('primeiro fetch in_progress, segundo fetch completed — resolve depois de UM retry', async () => {
  // Reprodução EXATA do achado da auditoria: o run aparece in_progress
  // no primeiro fetch (o próprio Guard ainda está no passo que disparou
  // isto) e completed pouco depois.
  const respostas = [runEmProgresso(), runCompleted()];
  let chamadas = 0;
  const buscarRun = async (runId) => {
    assert.equal(runId, RUN_ID);
    return respostas[chamadas++];
  };
  const { dormir, chamadas: sleeps } = espiaoDeSleep();

  const resultado = await resolverExecucaoDoGuard({
    runId: RUN_ID, nomeEsperado: NOME, branchEsperada: BRANCH, buscarRun, dormir,
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.run.status, 'completed');
  assert.equal(chamadas, 2, 'precisa ter buscado exatamente 2 vezes: in_progress, depois completed');
  assert.deepEqual(sleeps, [ESPERA_MS_PADRAO], 'precisa ter dormido exatamente uma vez, entre as duas tentativas');
});

test('in_progress em várias tentativas seguidas, completed só na última janela do orçamento — ainda resolve', async () => {
  const respostas = [runEmProgresso(), runEmProgresso(), runEmProgresso(), runCompleted()];
  let chamadas = 0;
  const buscarRun = async () => respostas[chamadas++];
  const { dormir, chamadas: sleeps } = espiaoDeSleep();

  const resultado = await resolverExecucaoDoGuard({
    runId: RUN_ID, nomeEsperado: NOME, branchEsperada: BRANCH, buscarRun, dormir,
  });

  assert.equal(resultado.ok, true);
  assert.equal(chamadas, 4);
  assert.equal(sleeps.length, 3);
});

test('nunca completa — retry é CURTO e LIMITADO, nunca polling infinito', async () => {
  let chamadas = 0;
  const buscarRun = async () => { chamadas++; return runEmProgresso(); };
  const { dormir, chamadas: sleeps } = espiaoDeSleep();

  const resultado = await resolverExecucaoDoGuard({
    runId: RUN_ID, nomeEsperado: NOME, branchEsperada: BRANCH, buscarRun, dormir,
  });

  assert.equal(resultado.ok, false);
  assert.match(resultado.motivo, /continuou fora de 'completed'/);
  assert.equal(chamadas, MAX_TENTATIVAS_PADRAO, 'nunca pode buscar mais que o teto — prova que não é polling infinito');
  assert.equal(sleeps.length, MAX_TENTATIVAS_PADRAO - 1, 'dorme entre tentativas, nunca depois da última (sem espera desperdiçada)');
});

test('nome de workflow errado falha fechado SEM gastar nenhum retry', async () => {
  let chamadas = 0;
  const buscarRun = async () => { chamadas++; return runCompleted({ name: 'Outro Workflow Qualquer' }); };
  const { dormir, chamadas: sleeps } = espiaoDeSleep();

  const resultado = await resolverExecucaoDoGuard({
    runId: RUN_ID, nomeEsperado: NOME, branchEsperada: BRANCH, buscarRun, dormir,
  });

  assert.equal(resultado.ok, false);
  assert.match(resultado.motivo, /não é uma execução de/);
  assert.equal(chamadas, 1, 'nome errado nunca muda entre tentativas — falha na primeira, sem retry');
  assert.equal(sleeps.length, 0);
});

test('branch errada falha fechado SEM gastar nenhum retry', async () => {
  let chamadas = 0;
  const buscarRun = async () => { chamadas++; return runCompleted({ head_branch: 'alguma-branch-de-pr' }); };
  const { dormir } = espiaoDeSleep();

  const resultado = await resolverExecucaoDoGuard({
    runId: RUN_ID, nomeEsperado: NOME, branchEsperada: BRANCH, buscarRun, dormir,
  });

  assert.equal(resultado.ok, false);
  assert.match(resultado.motivo, /não é da branch padrão/);
  assert.equal(chamadas, 1);
});

test('teto e espera são configuráveis (usados pelos testes de veredito/dedup)', async () => {
  let chamadas = 0;
  const buscarRun = async () => { chamadas++; return runEmProgresso(); };
  const { dormir, chamadas: sleeps } = espiaoDeSleep();

  const resultado = await resolverExecucaoDoGuard({
    runId: RUN_ID, nomeEsperado: NOME, branchEsperada: BRANCH, buscarRun, dormir,
    maxTentativas: 2, esperaMs: 50,
  });

  assert.equal(resultado.ok, false);
  assert.equal(chamadas, 2);
  assert.deepEqual(sleeps, [50]);
});

test('conclusão HARD FAIL passa intacta quando completed — quem decide custo zero é o Python a jusante', async () => {
  // Não é este módulo que decide o atalho de custo zero em HARD FAIL —
  // é coordinator/github_event.py::_from_workflow_run, a jusante, já
  // testado. Este teste só prova que `run.conclusion` chega intacto.
  const buscarRun = async () => runCompleted({ conclusion: 'failure' });
  const { dormir } = espiaoDeSleep();

  const resultado = await resolverExecucaoDoGuard({
    runId: RUN_ID, nomeEsperado: NOME, branchEsperada: BRANCH, buscarRun, dormir,
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.run.conclusion, 'failure');
});
