// Issue #264 (achado da auditoria independente ChatGPT, comentário
// #5822771107) — race condition real: o passo "Acionar o OBSERVE
// explicitamente" de guard.yml dispara este dispatch de DENTRO do
// último passo da própria execução do Guard. Nesse instante exato o
// run do Guard, por definição, ainda não pode estar `completed` — um
// workflow run só vira `completed` depois que TODOS os seus passos
// terminam, e o passo de dispatch é um deles. Então o OBSERVE, ao
// consultar esse run pela API quase imediatamente depois, pode
// legitimamente ver `status: 'in_progress'` no primeiro fetch.
//
// Corrigido com retry CURTO e LIMITADO (nunca polling infinito): até
// `maxTentativas` consultas, com `esperaMs` de espera entre elas. Se o
// run não virar `completed` dentro desse orçamento, falha fechado — o
// listener `workflow_run` de coordinator-observe.yml continua como
// rede de segurança para esse caso raro.
//
// Função pura, com TUDO injetado (nunca `octokit`/`setTimeout` direto),
// para poder ser testada de verdade com fetch/relógio falsos — ver
// resolve_guard_run.test.mjs. O passo do workflow que USA isto
// (coordinator-observe.yml) é só um wrapper fino que injeta as
// dependências reais.

export const MAX_TENTATIVAS_PADRAO = 5;
export const ESPERA_MS_PADRAO = 3000;

/**
 * @param {object} opts
 * @param {number} opts.runId
 * @param {string} opts.nomeEsperado
 * @param {string} opts.branchEsperada
 * @param {(runId: number) => Promise<object>} opts.buscarRun - injeta
 *   `github.rest.actions.getWorkflowRun`; devolve o objeto `run` cru.
 * @param {(ms: number) => Promise<void>} opts.dormir - injeta o sleep
 *   real (setTimeout); em teste, um no-op instantâneo.
 * @param {(mensagem: string) => void} [opts.logInfo] - injeta core.info.
 * @param {number} [opts.maxTentativas]
 * @param {number} [opts.esperaMs]
 * @returns {Promise<{ok: true, run: object} | {ok: false, motivo: string}>}
 *   NUNCA lança — erro estrutural (nome/branch errados) e esgotamento
 *   do retry (ainda in_progress) são os DOIS jeitos de falhar fechado,
 *   sempre como retorno, nunca exceção — quem chama decide o
 *   core.setFailed com a mensagem.
 */
export async function resolverExecucaoDoGuard({
  runId,
  nomeEsperado,
  branchEsperada,
  buscarRun,
  dormir,
  logInfo = () => {},
  maxTentativas = MAX_TENTATIVAS_PADRAO,
  esperaMs = ESPERA_MS_PADRAO,
}) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    const run = await buscarRun(runId);

    if (run.name !== nomeEsperado) {
      return {
        ok: false,
        motivo: `run ${runId} não é uma execução de ${JSON.stringify(nomeEsperado)} (nome real: ${run.name}) — recusado fail-closed.`,
      };
    }
    if (run.head_branch !== branchEsperada) {
      return {
        ok: false,
        motivo: `run ${runId} não é da branch padrão (${run.head_branch}) — recusado fail-closed.`,
      };
    }
    if (run.status === 'completed') {
      return { ok: true, run };
    }

    logInfo(
      `Guard run ${runId} ainda '${run.status}' (tentativa ${tentativa}/${maxTentativas}) — ` +
      'o próprio Guard dispara este dispatch de dentro do seu último passo, então o run ainda ' +
      'não pode estar completed no instante exato da chamada; aguardando antes de tentar de novo.'
    );
    if (tentativa < maxTentativas) {
      await dormir(esperaMs);
    }
  }
  return {
    ok: false,
    motivo: `run ${runId} continuou fora de 'completed' depois de ${maxTentativas} tentativas ` +
      `(~${((maxTentativas - 1) * esperaMs) / 1000}s de espera) — recusado fail-closed; o listener ` +
      "workflow_run continua como rede de segurança para este caso.",
  };
}
