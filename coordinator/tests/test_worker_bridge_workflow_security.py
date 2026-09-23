"""Prova ESTRUTURAL da fronteira de segurança dos DOIS workflows que a
Issue #128 (Worker Bridge V1) toca:

- ``.github/workflows/coordinator-worker-bridge.yml`` (novo);
- ``.github/workflows/guard.yml`` (que passou a aceitar
  ``workflow_dispatch`` confiável com um número de PR, porque uma PR
  criada com o ``GITHUB_TOKEN`` NÃO dispara workflows de
  ``pull_request``).

Mesma filosofia/técnica de ``test_workflow_security.py`` e de
``test_runner_workflow_security.py``: varre os arquivos como texto/regex
simples, sem parser de YAML. O ponto é que a trava exista no ARQUIVO, e
não apenas na intenção de quem o escreveu.

Standalone:
    python3 -m coordinator.tests.test_worker_bridge_workflow_security
"""

from __future__ import annotations

import os
import re
import sys

from . import _pathsetup

_WORKFLOWS = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows")
_BRIDGE_PATH = os.path.join(_WORKFLOWS, "coordinator-worker-bridge.yml")
_GUARD_PATH = os.path.join(_WORKFLOWS, "guard.yml")
_RUNNER_PATH = os.path.join(_WORKFLOWS, "coordinator-runner.yml")


def _ler(caminho: str) -> str:
    with open(caminho, encoding="utf-8") as fh:
        return fh.read()


def _sem_comentarios(texto: str) -> str:
    """Só as linhas EXECUTÁVEIS. Os comentários destes workflows falam de
    merge, de force-push e de `issues: write` justamente para dizer que
    nada disso existe ali — uma prova que casasse com prosa provaria o
    contrário do que quer provar."""
    linhas = []
    for linha in texto.splitlines():
        sem = linha.split("#", 1)[0]
        if sem.strip():
            linhas.append(sem)
    return "\n".join(linhas)


def _secao_on(texto: str) -> str:
    inicio = texto.index("\non:")
    fim = texto.index("\npermissions:")
    return texto[inicio:fim]


# ---------------------------------------------------------------------------
# coordinator-worker-bridge.yml
# ---------------------------------------------------------------------------

def test_bridge_workflow_existe_e_nao_substitui_o_canario() -> None:
    """§13: 'não apagar a arquitetura de canário'. O Bridge é um arquivo
    NOVO e separado; coordinator-runner.yml continua existindo."""
    assert os.path.exists(_BRIDGE_PATH), "coordinator-worker-bridge.yml precisa existir"
    assert os.path.exists(_RUNNER_PATH), "coordinator-runner.yml (canário) não pode ter sido removido"
    print("OK  test_bridge_workflow_existe_e_nao_substitui_o_canario")


def test_bridge_tem_apenas_os_dois_gatilhos_confiaveis() -> None:
    """§7 + correção B5 (auditoria do PR #129): ``workflow_dispatch`` para
    o piloto e ``workflow_run`` do OBSERVE para a entrega automática do
    modo ``active-supervised``. Nunca ``pull_request``/``issue_comment``/
    ``schedule``/``push``/``repository_dispatch`` — nenhuma superfície em
    que um terceiro possa provocar execução (um comentário é texto de
    terceiro; a conclusão de um workflow do próprio repositório não é)."""
    secao = _secao_on(_ler(_BRIDGE_PATH))
    assert "workflow_dispatch:" in secao
    assert "workflow_run:" in secao
    for proibido in (
        "pull_request", "pull_request_target", "issue_comment",
        "schedule:", "push:", "repository_dispatch",
    ):
        assert proibido not in secao, f"{proibido!r} não pode ser gatilho do Worker Bridge"
    print("OK  test_bridge_tem_apenas_os_dois_gatilhos_confiaveis")


def test_b5_workflow_run_fixa_o_workflow_de_origem_pelo_nome() -> None:
    """A origem do gatilho automático é FIXA no arquivo: só a conclusão do
    OBSERVE encadeia o Bridge. Não é "qualquer workflow que termine"."""
    secao = _secao_on(_ler(_BRIDGE_PATH))
    assert 'workflows: ["Repasso Coordinator (OBSERVE)"]' in secao, secao
    assert "types: [completed]" in secao, secao
    # E o workflow de origem existe de verdade com esse nome exato.
    observe = os.path.join(_WORKFLOWS, "coordinator-observe.yml")
    assert os.path.exists(observe)
    assert "name: Repasso Coordinator (OBSERVE)" in _ler(observe)
    print("OK  test_b5_workflow_run_fixa_o_workflow_de_origem_pelo_nome")


def test_b5_evento_exige_sucesso_branch_padrao_e_modo_active_supervised() -> None:
    """As três condições somadas que tornam a origem confiável, mais a
    trava de que o PILOTO nunca inicia por evento (a Variable do modo
    precisa ser ``active-supervised`` no próprio ``if:``)."""
    texto = _ler(_BRIDGE_PATH)
    idx = texto.index("  bridge:")
    condicao = texto[idx: texto.index("runs-on:", idx)]
    assert "github.event_name == 'workflow_run'" in condicao, condicao
    assert "vars.REPASSO_WORKER_BRIDGE_MODE == 'active-supervised'" in condicao, condicao
    assert "github.event.workflow_run.conclusion == 'success'" in condicao, condicao
    assert "github.event.workflow_run.head_branch == github.event.repository.default_branch" in condicao, condicao
    # E o repositório de origem precisa ser ESTE — nunca um fork.
    assert "github.event.workflow_run.head_repository.full_name == github.repository" in condicao, condicao
    print("OK  test_b5_evento_exige_sucesso_branch_padrao_e_modo_active_supervised")


def test_b5_dispatch_manual_continua_exigindo_o_ator_confiavel() -> None:
    """O caminho manual não foi afrouxado pela chegada do automático."""
    texto = _ler(_BRIDGE_PATH)
    idx = texto.index("  bridge:")
    condicao = texto[idx: texto.index("runs-on:", idx)]
    assert "github.event_name == 'workflow_dispatch' && github.actor == 'Repassomed'" in condicao, condicao
    print("OK  test_b5_dispatch_manual_continua_exigindo_o_ator_confiavel")


def test_b5_origem_do_ciclo_chega_ao_python_derivada_do_event_name() -> None:
    """A origem é DERIVADA de ``github.event_name``, nunca de input, e
    chega a todos os passos que rodam Python do Bridge — incluindo o que
    de fato executa o ciclo."""
    texto = _ler(_BRIDGE_PATH)
    executavel = _sem_comentarios(texto)
    assert "REPASSO_WORKER_BRIDGE_TRIGGER" in executavel
    assert "github.event_name == 'workflow_run' && 'event' || 'manual'" in executavel, (
        "a origem precisa ser derivada de github.event_name"
    )
    idx = texto.index("Rodar o Worker Bridge")
    passo = texto[idx: texto.index("Publicar o resultado", idx)]
    assert "REPASSO_WORKER_BRIDGE_TRIGGER" in passo, (
        "a origem precisa chegar ao passo que executa o ciclo, não só ao que confere o portão"
    )
    print("OK  test_b5_origem_do_ciclo_chega_ao_python_derivada_do_event_name")


def test_bridge_nao_declara_nenhum_input() -> None:
    """§7: 'NENHUM input livre contendo prompt/task/arquivo' e §5:
    'nenhum input de workflow pode simplesmente escolher qualquer
    task_id'. A garantia estrutural é não declarar input NENHUM: a tarefa
    vem só da fila confiável + Variables do repositório."""
    texto = _ler(_BRIDGE_PATH)
    secao = _secao_on(texto)
    idx = secao.index("workflow_dispatch:")
    assert "inputs:" not in secao[idx: idx + 80], "workflow_dispatch do Bridge não pode declarar input"
    for proibido in ("inputs.prompt", "inputs.task", "inputs.task_id", "inputs.arquivo", "inputs.files"):
        assert proibido not in texto, f"{proibido!r} não pode existir neste workflow"
    print("OK  test_bridge_nao_declara_nenhum_input")


def test_bridge_exige_flag_ator_e_ref_no_if_do_job() -> None:
    texto = _ler(_BRIDGE_PATH)
    idx = texto.index("  bridge:")
    condicao = texto[idx: texto.index("runs-on:", idx)]
    assert "vars.REPASSO_WORKER_BRIDGE_ENABLED == 'true'" in condicao, condicao
    assert "github.actor == 'Repassomed'" in condicao, condicao
    assert "default_branch" in condicao and "github.ref ==" in condicao, condicao
    print("OK  test_bridge_exige_flag_ator_e_ref_no_if_do_job")


def test_bridge_confirma_o_portao_de_novo_em_codigo() -> None:
    """Trava 3/4: `workflow_dispatch` pode ser disparado de qualquer ref, e
    o arquivo executado é o daquela ref. Confiar só no `if:` seria confiar
    num arquivo potencialmente editado. O par de refs tem que chegar ao
    Python e ser reconferido lá."""
    texto = _ler(_BRIDGE_PATH)
    assert "WorkerBridgeConfig.from_env()" in texto
    assert "cfg.gate()" in texto and "raise SystemExit(1)" in texto
    # O passo que de fato executa precisa receber TODAS as variáveis do
    # portão — senão o processo real veria os defaults seguros e o portão
    # "confirmado" no passo anterior não valeria nada.
    idx = texto.index("Rodar o Worker Bridge")
    passo = texto[idx: texto.index("Publicar o resultado", idx)]
    for var in (
        "REPASSO_WORKER_BRIDGE_ENABLED",
        "REPASSO_WORKER_BRIDGE_MODE",
        "REPASSO_WORKER_BRIDGE_PILOT_WORKER_ID",
        "REPASSO_WORKER_BRIDGE_PILOT_TASK_ID",
        "REPASSO_WORKER_BRIDGE_ACTUAL_REF",
        "REPASSO_WORKER_BRIDGE_EXPECTED_REF",
    ):
        assert var in passo, f"{var} precisa chegar ao passo que executa o Bridge"
    print("OK  test_bridge_confirma_o_portao_de_novo_em_codigo")


def test_bridge_nao_usa_as_flags_do_canario() -> None:
    """§6: as flags do Bridge são SEPARADAS das do canário. Ligar um nunca
    liga o outro."""
    texto = _ler(_BRIDGE_PATH)
    for do_canario in ("REPASSO_RUNNER_CANARY_TASK_ID", "REPASSO_RUNNER_ENABLED", "REPASSO_RUNNER_MODE"):
        assert do_canario not in texto, f"{do_canario} é do canário e não pode aparecer no Bridge"
    print("OK  test_bridge_nao_usa_as_flags_do_canario")


def test_bridge_checkout_fixa_a_branch_padrao_com_historico_completo() -> None:
    texto = _ler(_BRIDGE_PATH)
    idx = texto.index("uses: actions/checkout@v4")
    trecho = texto[idx: idx + 400]
    assert "ref: ${{ github.event.repository.default_branch }}" in trecho, trecho
    assert "fetch-depth: 0" in trecho, trecho
    print("OK  test_bridge_checkout_fixa_a_branch_padrao_com_historico_completo")


def test_bridge_tem_permissoes_minimas_e_nada_alem() -> None:
    """Issue #130 adiciona somente issues:write para o Error Registry.
    O Bridge continua trusted/default-branch e sem permissao de merge/deploy."""
    texto = _ler(_BRIDGE_PATH)
    cabecalho = texto[texto.index("\npermissions:"): texto.index("\nconcurrency:")]
    assert "contents: read" in cabecalho, cabecalho
    idx = texto.index("    permissions:")
    do_job = texto[idx: texto.index("steps:", idx)]
    assert "contents: write" in do_job
    assert "pull-requests: write" in do_job
    assert "actions: write" in do_job
    assert "issues: write" in do_job
    executavel = _sem_comentarios(texto)
    for proibida in ("packages: write", "deployments: write", "id-token: write", "write-all"):
        assert proibida not in executavel, f"{proibida} nao e necessaria e nao pode estar declarada"
    print("OK  test_bridge_tem_permissoes_minimas_e_nada_alem")


def test_bridge_nao_faz_merge_force_push_nem_deploy() -> None:
    """§13: nenhum merge, nenhum force-push, nenhuma publicação."""
    executavel = _sem_comentarios(_ler(_BRIDGE_PATH)).lower()
    for proibido in (
        "--force", "force-push", "push -f", "gh pr merge", "pulls/merge",
        "netlify", "--prod", "deploy-hook",
    ):
        assert proibido not in executavel, f"{proibido!r} não pode aparecer no workflow do Bridge"
    print("OK  test_bridge_nao_faz_merge_force_push_nem_deploy")


def test_bridge_nao_escreve_na_branch_padrao() -> None:
    """§13: 'não editar main diretamente'. Nenhum push cujo destino seja a
    branch padrão — as escritas vão para a branch de TRABALHO da tarefa
    (o contrato do Runner rejeita main/master na construção) e para as
    branches `coordinator-state-*`."""
    texto = _ler(_BRIDGE_PATH)
    for linha in texto.splitlines():
        if "git push" in linha:
            assert "main" not in linha and "master" not in linha, linha
            assert "default_branch" not in linha, linha
    print("OK  test_bridge_nao_escreve_na_branch_padrao")


def test_bridge_roda_a_suite_antes_de_qualquer_chamada_paga() -> None:
    texto = _sem_comentarios(_ler(_BRIDGE_PATH))
    idx_suite = texto.index("coordinator.tests.run_all")
    idx_api = texto.index("ANTHROPIC_API_KEY")
    assert idx_suite < idx_api, "o preflight da suíte precisa vir ANTES do passo que tem a credencial paga"
    print("OK  test_bridge_roda_a_suite_antes_de_qualquer_chamada_paga")


def test_credencial_paga_so_existe_no_passo_do_bridge() -> None:
    texto = _sem_comentarios(_ler(_BRIDGE_PATH))
    # Uma única LINHA executável menciona a credencial (`ANTHROPIC_API_KEY:
    # ${{ secrets.ANTHROPIC_API_KEY }}` — a chave do env e o segredo).
    linhas = [i for i, l in enumerate(texto.splitlines()) if "ANTHROPIC_API_KEY" in l]
    assert len(linhas) == 1, f"ANTHROPIC_API_KEY aparece em {len(linhas)} linhas — deve existir só no passo gated"
    posicao = texto.index("ANTHROPIC_API_KEY")
    idx = texto.index("Rodar o Worker Bridge")
    fim = texto.index("Publicar o resultado", idx)
    assert idx < posicao < fim, "a credencial paga está fora do passo 'Rodar o Worker Bridge'"
    print("OK  test_credencial_paga_so_existe_no_passo_do_bridge")


def test_bridge_usa_o_ledger_global_e_nao_um_segundo_teto() -> None:
    """§13: 'nunca usar a API sem o ledger global' e 'não aumentar o teto
    de API'. O Bridge aponta o estado para o MESMO remoto do Coordinator,
    então o ledger `coordinator-state-usage` é o mesmo — não existe um
    segundo orçamento."""
    texto = _ler(_BRIDGE_PATH)
    assert "--state-git-remote" in texto
    assert "coordinator-state-usage" in texto, "o comentário precisa declarar o ledger global reutilizado"
    assert "--budget-usd" not in _sem_comentarios(texto), "o teto nunca é redefinido pelo workflow"
    print("OK  test_bridge_usa_o_ledger_global_e_nao_um_segundo_teto")


def test_bridge_nao_tem_laco_nem_polling() -> None:
    """§13: 'não criar polling periódico' e 'não fazer loop infinito
    consumindo a fila'. Uma execução = no máximo UMA atribuição."""
    texto = _ler(_BRIDGE_PATH)
    assert "schedule:" not in texto, "nenhum cron/polling"
    for proibido in ("while true", "for i in $(seq", "sleep "):
        assert proibido not in texto, f"{proibido!r} indicaria laço/polling"
    assert len(re.findall(r"python3 -m coordinator\.worker_bridge", _sem_comentarios(texto))) == 1, (
        "o Bridge é invocado exatamente uma vez por execução"
    )
    print("OK  test_bridge_nao_tem_laco_nem_polling")


def test_bridge_falha_o_job_quando_o_cli_da_erro() -> None:
    texto = _ler(_BRIDGE_PATH)
    assert "steps.bridge.outputs.resultado != '0'" in texto
    assert "exit 1" in texto
    print("OK  test_bridge_falha_o_job_quando_o_cli_da_erro")


# ---------------------------------------------------------------------------
# guard.yml — dispatch confiável (§9)
# ---------------------------------------------------------------------------

def test_guard_aceita_dispatch_com_apenas_um_numero_de_pr() -> None:
    """§9: a preferência declarada na Issue — adaptar o Guard para aceitar
    `workflow_dispatch` confiável com um número de PR. O ÚNICO input é
    esse número; nada de prompt, arquivo ou ref livre."""
    texto = _ler(_GUARD_PATH)
    secao = _secao_on(texto)
    assert "workflow_dispatch:" in secao
    assert "pr_number:" in secao
    for proibido in ("prompt", "task", "arquivo", "files", "ref:", "sha:", "branch:"):
        assert proibido not in secao, f"input {proibido!r} não pode existir no Guard"
    print("OK  test_guard_aceita_dispatch_com_apenas_um_numero_de_pr")


def test_guard_valida_o_formato_do_numero_antes_de_usar() -> None:
    texto = _ler(_GUARD_PATH)
    assert "^[0-9]{1,7}$" in texto, "o número da PR precisa ser validado por regex antes de virar caminho/ref"
    print("OK  test_guard_valida_o_formato_do_numero_antes_de_usar")


def test_guard_dispatch_pega_metadados_pela_api_nunca_do_input() -> None:
    """§9: 'o Guard despachado precisa rodar a versão confiável da
    main/base, obter metadados reais da PR via API e auditar o HEAD
    real'. O corpo da PR (que define o ESCOPO auditado) vem da API, nunca
    de texto do disparo."""
    texto = _ler(_GUARD_PATH)
    assert "github.rest.pulls.get" in texto, "os metadados da PR precisam vir da API"
    assert "/tmp/pr-body.md" in texto, "o corpo auditado é o que a API devolveu"
    assert "refs/pull/" in texto and "/head" in texto, "o HEAD real da PR precisa ser o alvo da auditoria"
    print("OK  test_guard_dispatch_pega_metadados_pela_api_nunca_do_input")


def test_guard_dispatch_so_roda_a_partir_da_branch_padrao() -> None:
    """A versão confiável: em `workflow_dispatch`, o arquivo executado é o
    da ref disparada — então o job só aceita rodar a partir da branch
    padrão. (Em `pull_request`, o GitHub já usa a versão da base.)"""
    texto = _ler(_GUARD_PATH)
    idx = texto.index("    if:")
    condicao = texto[idx: texto.index("\n", texto.index("default_branch", idx))]
    assert "github.event_name == 'pull_request'" in condicao, condicao
    assert "default_branch" in condicao, condicao
    print("OK  test_guard_dispatch_so_roda_a_partir_da_branch_padrao")


def test_guard_nunca_ganhou_permissao_de_merge() -> None:
    texto = _ler(_GUARD_PATH).lower()
    for proibido in ("pulls/merge", "gh pr merge", "merge_pull_request", "contents: write", "write-all"):
        assert proibido not in texto, f"{proibido!r} não pode existir no Guard"
    print("OK  test_guard_nunca_ganhou_permissao_de_merge")


def main() -> int:
    testes = [
        test_bridge_workflow_existe_e_nao_substitui_o_canario,
        test_bridge_tem_apenas_os_dois_gatilhos_confiaveis,
        test_b5_workflow_run_fixa_o_workflow_de_origem_pelo_nome,
        test_b5_evento_exige_sucesso_branch_padrao_e_modo_active_supervised,
        test_b5_dispatch_manual_continua_exigindo_o_ator_confiavel,
        test_b5_origem_do_ciclo_chega_ao_python_derivada_do_event_name,
        test_bridge_nao_declara_nenhum_input,
        test_bridge_exige_flag_ator_e_ref_no_if_do_job,
        test_bridge_confirma_o_portao_de_novo_em_codigo,
        test_bridge_nao_usa_as_flags_do_canario,
        test_bridge_checkout_fixa_a_branch_padrao_com_historico_completo,
        test_bridge_tem_permissoes_minimas_e_nada_alem,
        test_bridge_nao_faz_merge_force_push_nem_deploy,
        test_bridge_nao_escreve_na_branch_padrao,
        test_bridge_roda_a_suite_antes_de_qualquer_chamada_paga,
        test_credencial_paga_so_existe_no_passo_do_bridge,
        test_bridge_usa_o_ledger_global_e_nao_um_segundo_teto,
        test_bridge_nao_tem_laco_nem_polling,
        test_bridge_falha_o_job_quando_o_cli_da_erro,
        test_guard_aceita_dispatch_com_apenas_um_numero_de_pr,
        test_guard_valida_o_formato_do_numero_antes_de_usar,
        test_guard_dispatch_pega_metadados_pela_api_nunca_do_input,
        test_guard_dispatch_so_roda_a_partir_da_branch_padrao,
        test_guard_nunca_ganhou_permissao_de_merge,
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
