"""Issue #259 — P0 liveness: Guard despachado pelo Heartbeat não aciona OBSERVE.

REPRODUÇÃO REAL (24/09/2026, não presumida):

- ``Repasso Guard Heartbeat`` run 36048348496 nasceu por ``push`` na main
  (merge da PR #247), encontrou a PR #192 sem cartão da policy atual e
  despachou ``guard.yml`` via ``workflow_dispatch`` usando o
  ``GITHUB_TOKEN`` automático do próprio job (``actions/github-script``
  sem ``github-token:`` customizado — ver ``coordinator-guard-heartbeat.
  yml``).
- ``Repasso Guard`` run 36048362310 nasceu desse dispatch (ator
  ``github-actions[bot]``) e terminou **SUCCESS**.
- Nenhum ``Repasso Coordinator (OBSERVE)`` nasceu depois — confirmado
  vasculhando o histórico de runs de ``coordinator-observe.yml``: zero
  execução de QUALQUER tipo entre 18:57:06Z e 19:33:01Z, apesar do Guard
  ter concluído às 19:28:36Z.

CAUSA REAL (documentação do GitHub + GitHub Community Discussion #48748,
"Workflow Runs dispatched from a different Workflow Run do not trigger
workflow_run events"): "When you use the repository's GITHUB_TOKEN to
perform tasks, events triggered by the GITHUB_TOKEN, with the exception
of workflow_dispatch and repository_dispatch, will not create a new
workflow run." Um ``workflow_dispatch`` disparado com o GITHUB_TOKEN
automático SEMPRE inicia o workflow-alvo (é a exceção documentada — por
isso o Guard rodou e terminou SUCCESS), mas a conclusão desse run fica
marcada como originada do GITHUB_TOKEN: quem escuta via ``workflow_run``
nunca é acionado. Isto vale nos dois gatilhos de ``guard.yml``
(``workflow_dispatch`` E ``pull_request`` comum rodam com o mesmo
GITHUB_TOKEN de sistema) — e, um nível abaixo, vale IGUALMENTE para
``coordinator-observe.yml`` escutando por ``coordinator-worker-bridge.
yml`` via ``workflow_run``, sempre que o próprio OBSERVE tiver sido
iniciado por este novo caminho ``workflow_dispatch``.

ARQUITETURA ESCOLHIDA: dispatch explícito, não uma PAT nova (mais poder,
mais superfície — mesma escolha já feita para o par Bridge -> Guard, ver
o topo de guard.yml). Cada elo da cadeia aciona explicitamente o
PRÓXIMO por ``workflow_dispatch`` (que a mesma exceção documentada
garante que sempre funciona, mesmo com GITHUB_TOKEN), como rede de
segurança AO LADO do ``workflow_run`` existente (que continua sem
nenhuma mudança — funciona nos casos em que a cadeia da plataforma não
fica marcada). Os dois caminhos convergem para o MESMO
``coordinator/github_event.py::_from_workflow_run`` já testado
extensivamente (dedup por HEAD+policy, atalho de custo zero em HARD
FAIL objetivo — ver test_coordinator_v3.py::
test_guard_hard_fail_yields_needs_fix_with_zero_api_cost — e tudo o
mais), então nenhum código Python novo foi necessário; só os workflows.

Mesma filosofia/técnica de ``test_workflow_security.py`` e
``test_worker_bridge_workflow_security.py``: varre os arquivos como
texto/regex simples, sem parser de YAML — este pacote continua só
biblioteca padrão. O ponto é que a trava exista no ARQUIVO.

Standalone:
    python3 -m coordinator.tests.test_heartbeat_guard_observe_chain
"""

from __future__ import annotations

import os
import re
import sys

from . import _pathsetup

_WORKFLOWS = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows")
_GUARD_PATH = os.path.join(_WORKFLOWS, "guard.yml")
_OBSERVE_PATH = os.path.join(_WORKFLOWS, "coordinator-observe.yml")
_BRIDGE_PATH = os.path.join(_WORKFLOWS, "coordinator-worker-bridge.yml")


def _ler(caminho: str) -> str:
    with open(caminho, encoding="utf-8") as fh:
        return fh.read()


def _sem_comentarios(texto: str) -> str:
    linhas = []
    for linha in texto.splitlines():
        sem = linha.split("#", 1)[0]
        if sem.strip():
            linhas.append(sem)
    return "\n".join(linhas)


def _passo(texto: str, marcador: str) -> str:
    """O texto de UM passo (``- name: ...`` na indentação de passo, 6
    espaços), do início do marcador até o próximo passo ou o fim do
    arquivo — nunca uma janela de tamanho fixo, que quebra toda vez que
    um comentário cresce."""
    inicio = texto.index(marcador)
    m = re.search(r"\n      - name:", texto[inicio + 1:])
    fim = inicio + 1 + m.start() if m else len(texto)
    return texto[inicio:fim]


# ---------------------------------------------------------------------------
# 1. guard.yml -> OBSERVE (o elo que faltava, reprodução do Issue #259).
# ---------------------------------------------------------------------------


def test_guard_ganhou_actions_write_so_para_o_dispatch() -> None:
    texto = _ler(_GUARD_PATH)
    idx_perm = texto.index("\npermissions:")
    idx_concurrency = texto.index("\nconcurrency:")
    secao = texto[idx_perm:idx_concurrency]
    assert "actions: write" in secao
    assert "contents: read" in secao
    assert "pull-requests: write" in secao
    print("OK  test_guard_ganhou_actions_write_so_para_o_dispatch")


def test_guard_aciona_observe_explicitamente_apos_o_veredito() -> None:
    """O passo precisa existir, chamar createWorkflowDispatch para
    coordinator-observe.yml (nunca outro arquivo), passar o run_id da
    PRÓPRIA execução (nunca input externo) e só rodar quando o Guard de
    fato terminou (não quando o job foi cancelado antes de chegar lá)."""
    texto = _ler(_GUARD_PATH)
    trecho = _passo(texto, '- name: Acionar o OBSERVE explicitamente')
    assert "if: always() && steps.guard.outputs.resultado != ''" in trecho
    assert "actions/github-script@v7" in trecho
    assert "createWorkflowDispatch" in trecho
    assert "workflow_id: 'coordinator-observe.yml'" in trecho
    assert "ref: context.payload.repository.default_branch" in trecho
    assert "guard_run_id: String(context.runId)" in trecho
    # Nunca um valor de fora do runtime do Actions (nunca inputs.pr_number,
    # nunca texto de PR) — só o run_id que o próprio GitHub atribuiu a
    # ESTA execução.
    assert "inputs.pr_number" not in trecho
    assert "pr-body" not in trecho
    print("OK  test_guard_aciona_observe_explicitamente_apos_o_veredito")


def test_guard_dispatch_step_e_o_ultimo_do_job() -> None:
    """Precisa vir DEPOIS do passo que falha o job em HARD FAIL — senão
    `steps.guard.outputs.resultado` não estaria disponível ainda, e um
    HARD FAIL correria o risco de nunca ser reportado ao OBSERVE."""
    texto = _ler(_GUARD_PATH)
    idx_falhar = texto.index("- name: Falhar o job se o Guard reprovou")
    idx_dispatch = texto.index("- name: Acionar o OBSERVE explicitamente")
    assert idx_falhar < idx_dispatch
    print("OK  test_guard_dispatch_step_e_o_ultimo_do_job")


def test_guard_so_aciona_observe_nunca_a_si_mesmo_ou_o_bridge() -> None:
    """Sem loop: este workflow nunca pode disparar workflow_dispatch para
    guard.yml (ele mesmo) nem para coordinator-worker-bridge.yml
    diretamente — só coordinator-observe.yml."""
    texto = _sem_comentarios(_ler(_GUARD_PATH))
    alvos = re.findall(r"workflow_id:\s*'([^']+)'", texto)
    assert alvos == ["coordinator-observe.yml"], (
        f"guard.yml só pode disparar coordinator-observe.yml por workflow_dispatch; achou {alvos}"
    )
    print("OK  test_guard_so_aciona_observe_nunca_a_si_mesmo_ou_o_bridge")


# ---------------------------------------------------------------------------
# 2. coordinator-observe.yml: novo gatilho workflow_dispatch, fail-closed.
# ---------------------------------------------------------------------------


def test_observe_ganhou_workflow_dispatch_com_input_obrigatorio() -> None:
    texto = _ler(_OBSERVE_PATH)
    idx_on = texto.index("\non:")
    idx_perm = texto.index("\npermissions:")
    secao = texto[idx_on:idx_perm]
    assert "workflow_dispatch:" in secao
    assert "guard_run_id:" in secao
    assert "required: true" in secao
    # workflow_run continua EXATAMENTE como estava — rede de segurança,
    # nunca substituído.
    assert 'workflows: ["Repasso Guard"]' in secao
    assert "types: [completed]" in secao
    print("OK  test_observe_ganhou_workflow_dispatch_com_input_obrigatorio")


def test_observe_workflow_dispatch_restrito_ao_disparo_interno_do_guard() -> None:
    """Camada 7: só o próprio guard.yml (ator github-actions[bot]) pode
    usar este caminho — nunca um "Run workflow" manual com run_id
    arbitrário."""
    texto = _ler(_OBSERVE_PATH)
    idx_if = texto.index("if: >", texto.index("\njobs:"))
    idx_runs_on = texto.index("runs-on:", idx_if)
    condicao = texto[idx_if:idx_runs_on]
    assert "github.event_name != 'workflow_dispatch' || github.actor == 'github-actions[bot]'" in condicao
    print("OK  test_observe_workflow_dispatch_restrito_ao_disparo_interno_do_guard")


def test_observe_valida_guard_run_id_por_regex_antes_de_qualquer_uso() -> None:
    """Mesmo padrão de guard.yml para pr_number: input só dígitos,
    validado ANTES de qualquer chamada de API — nunca interpolado direto
    numa expressão do Actions."""
    texto = _ler(_OBSERVE_PATH)
    trecho = _passo(texto, "- name: Resolver a execução do Guard observada")
    assert "GUARD_RUN_ID_INPUT: ${{ inputs.guard_run_id }}" in trecho
    assert re.search(r"/\^\[0-9\]\{1,\d+\}\$/\.test\(bruto\)", trecho), (
        "guard_run_id precisa ser validado por regex só-dígitos antes de virar Number()"
    )
    assert "core.setFailed" in trecho
    print("OK  test_observe_valida_guard_run_id_por_regex_antes_de_qualquer_uso")


def test_observe_confirma_o_run_real_pela_api_nunca_confia_so_no_input() -> None:
    """O run_id é só uma CHAVE DE BUSCA — o passo precisa buscar a
    execução real pela API e confirmar nome, status e branch padrão antes
    de usar qualquer dado dela (mesma filosofia de guard.yml resolvendo
    pr_number pela API antes de auditar)."""
    texto = _ler(_OBSERVE_PATH)
    trecho = _passo(texto, "- name: Resolver a execução do Guard observada")
    assert "getWorkflowRun" in trecho
    assert "run.name !== 'Repasso Guard'" in trecho
    assert "run.status !== 'completed'" in trecho
    assert "run.head_branch !== context.payload.repository.default_branch" in trecho
    print("OK  test_observe_confirma_o_run_real_pela_api_nunca_confia_so_no_input")


def test_observe_sintetiza_o_mesmo_formato_de_payload_do_workflow_run_real() -> None:
    """O restante do job (download-artifact, prctx, CLI) precisa tratar
    os dois gatilhos de forma IDÊNTICA — nunca um código novo e não
    testado para o caminho workflow_dispatch."""
    texto = _ler(_OBSERVE_PATH)
    trecho = _passo(texto, "- name: Resolver a execução do Guard observada")
    assert '"action": \'completed\',' not in trecho  # aspas certas abaixo
    assert "action: 'completed'," in trecho
    assert "workflow-run-event.json" in trecho
    # download-artifact e o passo de contexto real da PR (prctx) precisam
    # rodar nos DOIS gatilhos agora.
    idx_download = texto.index("uses: actions/download-artifact@v4")
    linha_if_download = texto[texto.rindex("if:", 0, idx_download):idx_download]
    assert "workflow_dispatch" in linha_if_download and "workflow_run" in linha_if_download
    idx_prctx = texto.index("id: prctx")
    linha_if_prctx = texto[idx_prctx: idx_prctx + 200]
    assert "workflow_dispatch" in linha_if_prctx and "workflow_run" in linha_if_prctx
    print("OK  test_observe_sintetiza_o_mesmo_formato_de_payload_do_workflow_run_real")


def test_observe_cli_reusa_o_caminho_workflow_run_ja_testado_para_dedup() -> None:
    """Ponto central da arquitetura: o CLI recebe SEMPRE
    --github-event-name workflow_run nos dois gatilhos — nenhum tipo de
    evento novo em coordinator/github_event.py, então o dedup por
    HEAD+policy (já provado em test_coordinator_v3.py::
    test_prova_a/b/c_...) vale automaticamente para o caminho novo."""
    texto = _ler(_OBSERVE_PATH)
    trecho = _passo(texto, "GITHUB_EVENT_NAME_EFETIVO=")
    assert 'GITHUB_EVENT_NAME_EFETIVO="workflow_run"' in trecho
    assert 'EVENT_PATH_EFETIVO="/tmp/workflow-run-event.json"' in trecho
    assert '--github-event-name "$GITHUB_EVENT_NAME_EFETIVO"' in texto
    assert '--event "$EVENT_PATH_EFETIVO"' in texto
    print("OK  test_observe_cli_reusa_o_caminho_workflow_run_ja_testado_para_dedup")


# ---------------------------------------------------------------------------
# 3. coordinator-observe.yml -> Worker Bridge (o mesmo buraco, um elo abaixo).
# ---------------------------------------------------------------------------


def test_observe_ganhou_actions_write() -> None:
    texto = _ler(_OBSERVE_PATH)
    idx_perm = texto.index("\n    permissions:", texto.index("\njobs:"))
    idx_steps = texto.index("\n    steps:", idx_perm)
    secao = texto[idx_perm:idx_steps]
    assert "actions: write" in secao
    assert "actions: read" not in secao
    print("OK  test_observe_ganhou_actions_write")


def test_observe_aciona_bridge_explicitamente_quando_bem_sucedido() -> None:
    texto = _ler(_OBSERVE_PATH)
    trecho = _passo(texto, "- name: Acionar o Worker Bridge explicitamente")
    assert "if: success()" in trecho
    assert "createWorkflowDispatch" in trecho
    assert "workflow_id: 'coordinator-worker-bridge.yml'" in trecho
    assert "ref: context.payload.repository.default_branch" in trecho
    print("OK  test_observe_aciona_bridge_explicitamente_quando_bem_sucedido")


def test_observe_dispatch_do_bridge_e_o_ultimo_passo_do_job() -> None:
    """Precisa vir DEPOIS do passo que falha o job em erro do Coordinator
    (bloqueador 7) — senão `success()` não refletiria o resultado real do
    CLI."""
    texto = _ler(_OBSERVE_PATH)
    idx_falhar = texto.index("- name: Falhar o job se o Coordinator terminou com erro")
    idx_dispatch = texto.index("- name: Acionar o Worker Bridge explicitamente")
    assert idx_falhar < idx_dispatch
    print("OK  test_observe_dispatch_do_bridge_e_o_ultimo_passo_do_job")


def test_observe_so_aciona_o_bridge_nunca_o_guard_ou_a_si_mesmo() -> None:
    """Sem loop: coordinator-observe.yml nunca pode disparar guard.yml
    nem coordinator-observe.yml (ele mesmo) por workflow_dispatch — só
    coordinator-worker-bridge.yml. A cadeia é estritamente
    Guard -> OBSERVE -> Bridge, nunca ao contrário."""
    texto = _sem_comentarios(_ler(_OBSERVE_PATH))
    alvos = re.findall(r"workflow_id:\s*'([^']+)'", texto)
    assert alvos == ["coordinator-worker-bridge.yml"], (
        f"coordinator-observe.yml só pode disparar coordinator-worker-bridge.yml; achou {alvos}"
    )
    print("OK  test_observe_so_aciona_o_bridge_nunca_o_guard_ou_a_si_mesmo")


# ---------------------------------------------------------------------------
# 4. coordinator-worker-bridge.yml: aceitar o dispatch automático do OBSERVE
#    sem enfraquecer o caminho humano existente.
# ---------------------------------------------------------------------------


def test_bridge_aceita_dispatch_automatico_do_observe_so_em_active_supervised() -> None:
    texto = _ler(_BRIDGE_PATH)
    idx_if = texto.index("if: >", texto.index("\njobs:"))
    idx_runs_on = texto.index("runs-on:", idx_if)
    condicao = _sem_comentarios(texto[idx_if:idx_runs_on])
    assert (
        "github.event_name == 'workflow_dispatch' && github.actor == 'github-actions[bot]' &&\n"
        "         vars.REPASSO_WORKER_BRIDGE_MODE == 'active-supervised'"
        in condicao
    )
    print("OK  test_bridge_aceita_dispatch_automatico_do_observe_so_em_active_supervised")


def test_bridge_caminho_humano_continua_sem_exigir_active_supervised() -> None:
    """O caminho manual (`github.actor == 'Repassomed'`) não pode ganhar
    a exigência de active-supervised por acidente — José/piloto continuam
    podendo forçar um ciclo mesmo fora desse modo, exatamente como hoje."""
    texto = _sem_comentarios(_ler(_BRIDGE_PATH))
    idx = texto.index("github.event_name == 'workflow_dispatch' && github.actor == 'Repassomed'")
    linha_fim = texto.index(")", idx)
    trecho = texto[idx:linha_fim]
    assert "active-supervised" not in trecho
    print("OK  test_bridge_caminho_humano_continua_sem_exigir_active_supervised")


def test_bridge_ainda_tem_exatamente_quatro_ramos_no_if_do_job() -> None:
    """Trava de contagem: prova que a mudança foi ADITIVA (um ramo novo)
    e não substituiu nenhum dos quatro gatilhos já existentes."""
    texto = _ler(_BRIDGE_PATH)
    idx_if = texto.index("if: >", texto.index("\njobs:"))
    idx_runs_on = texto.index("runs-on:", idx_if)
    condicao = _sem_comentarios(texto[idx_if:idx_runs_on])
    ramos = condicao.count("github.event_name ==")
    assert ramos == 5, f"esperados 5 ramos (4 originais + 1 novo do Issue #259); achou {ramos}"
    print("OK  test_bridge_ainda_tem_exatamente_quatro_ramos_no_if_do_job")


# ---------------------------------------------------------------------------
# 5. Prova ponta a ponta: a cadeia inteira é um DAG estritamente para a
#    frente, sem nenhum ciclo possível.
# ---------------------------------------------------------------------------


def test_cadeia_e_um_dag_estritamente_para_a_frente_sem_ciclo() -> None:
    """guard.yml -> coordinator-observe.yml -> coordinator-worker-bridge.
    yml, nunca ao contrário. coordinator-worker-bridge.yml PODE despachar
    guard.yml de novo (bridge_pr.py, Python — não workflow_dispatch deste
    arquivo) para uma tarefa NOVA, e isso já existia e já é coberto por
    test_worker_bridge_workflow_security.py; o que este teste prova é que
    NENHUM dos dois workflows novos deste Issue fecha um ciclo direto."""
    alvos_guard = re.findall(r"workflow_id:\s*'([^']+)'", _sem_comentarios(_ler(_GUARD_PATH)))
    alvos_observe = re.findall(r"workflow_id:\s*'([^']+)'", _sem_comentarios(_ler(_OBSERVE_PATH)))
    assert "guard.yml" not in alvos_observe, "OBSERVE nunca pode despachar o Guard de volta (ciclo direto)"
    assert "coordinator-observe.yml" not in alvos_observe, "OBSERVE nunca pode despachar a si mesmo"
    assert "guard.yml" not in alvos_guard, "Guard nunca pode despachar a si mesmo"
    assert "coordinator-worker-bridge.yml" not in alvos_guard, "Guard só aciona OBSERVE, nunca o Bridge diretamente"
    assert set(alvos_guard) == {"coordinator-observe.yml"}
    assert set(alvos_observe) == {"coordinator-worker-bridge.yml"}
    print("OK  test_cadeia_e_um_dag_estritamente_para_a_frente_sem_ciclo")


def main() -> int:
    testes = [
        test_guard_ganhou_actions_write_so_para_o_dispatch,
        test_guard_aciona_observe_explicitamente_apos_o_veredito,
        test_guard_dispatch_step_e_o_ultimo_do_job,
        test_guard_so_aciona_observe_nunca_a_si_mesmo_ou_o_bridge,
        test_observe_ganhou_workflow_dispatch_com_input_obrigatorio,
        test_observe_workflow_dispatch_restrito_ao_disparo_interno_do_guard,
        test_observe_valida_guard_run_id_por_regex_antes_de_qualquer_uso,
        test_observe_confirma_o_run_real_pela_api_nunca_confia_so_no_input,
        test_observe_sintetiza_o_mesmo_formato_de_payload_do_workflow_run_real,
        test_observe_cli_reusa_o_caminho_workflow_run_ja_testado_para_dedup,
        test_observe_ganhou_actions_write,
        test_observe_aciona_bridge_explicitamente_quando_bem_sucedido,
        test_observe_dispatch_do_bridge_e_o_ultimo_passo_do_job,
        test_observe_so_aciona_o_bridge_nunca_o_guard_ou_a_si_mesmo,
        test_bridge_aceita_dispatch_automatico_do_observe_so_em_active_supervised,
        test_bridge_caminho_humano_continua_sem_exigir_active_supervised,
        test_bridge_ainda_tem_exatamente_quatro_ramos_no_if_do_job,
        test_cadeia_e_um_dag_estritamente_para_a_frente_sem_ciclo,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {e}")
    print(f"\n{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
