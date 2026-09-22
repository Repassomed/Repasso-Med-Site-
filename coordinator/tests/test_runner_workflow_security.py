"""Prova ESTRUTURAL da fronteira de segurança do workflow do Runner
(``.github/workflows/coordinator-runner.yml``) — Issue #105, Fase D
(``#105-D · Execução controlada``).

Mesma filosofia/técnica de ``test_workflow_security.py`` (que cobre
``coordinator-observe.yml``, NÃO tocado nesta rodada): varre o arquivo
como texto/regex simples, sem parser de YAML — igual ao Repasso Guard faz
com código-fonte.

Deliberadamente NÃO registrado em ``coordinator/tests/run_all.py`` nesta
rodada, mesma decisão operacional já aplicada a ``test_runner_
contract.py``/``test_heartbeat.py`` — roda standalone via
``python3 -m coordinator.tests.test_runner_workflow_security``.
"""

from __future__ import annotations

import os
import re
import sys

from . import _pathsetup

_WORKFLOW_PATH = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "coordinator-runner.yml")


def _ler() -> str:
    with open(_WORKFLOW_PATH, encoding="utf-8") as fh:
        return fh.read()


def _secao_on(texto: str) -> str:
    inicio = texto.index("\non:")
    fim = texto.index("\npermissions:")
    return texto[inicio:fim]


def test_workflow_file_exists_and_is_separate_from_observe() -> None:
    assert os.path.exists(_WORKFLOW_PATH), "coordinator-runner.yml precisa existir"
    caminho_observe = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "coordinator-observe.yml")
    assert os.path.exists(caminho_observe), "coordinator-observe.yml não pode ter sido removido/renomeado"
    assert _WORKFLOW_PATH != caminho_observe
    print("OK  test_workflow_file_exists_and_is_separate_from_observe")


def test_workflow_dispatch_is_the_only_trigger() -> None:
    """Issue #105: 'somente workflow_dispatch nesta fase; jamais
    pull_request, issue_comment, schedule ou execução automática'."""
    secao = _secao_on(_ler())
    assert "workflow_dispatch:" in secao
    for proibido in ("pull_request", "issue_comment", "schedule:", "push:", "workflow_run", "pull_request_target"):
        assert proibido not in secao, f"{proibido!r} não pode ser gatilho deste workflow"
    print("OK  test_workflow_dispatch_is_the_only_trigger")


def test_workflow_dispatch_has_no_inputs() -> None:
    """Issue #105: 'não aceitar instruções livres como input do workflow;
    receber somente referência a uma RunnerTask estruturada e validada.'
    A única forma de garantir isto estruturalmente é não declarar NENHUM
    input em workflow_dispatch — o task_id vem só de uma Variable do
    repositório (REPASSO_RUNNER_CANARY_TASK_ID), nunca de texto digitado
    no disparo manual."""
    secao = _secao_on(_ler())
    idx = secao.index("workflow_dispatch:")
    trecho = secao[idx: idx + 60]
    assert "inputs:" not in trecho, "workflow_dispatch não pode declarar nenhum input nesta fase"
    print("OK  test_workflow_dispatch_has_no_inputs")


def test_checkout_pins_explicit_default_branch_ref() -> None:
    texto = _ler()
    idx = texto.index("uses: actions/checkout@v4")
    trecho = texto[idx: idx + 300]
    assert "ref:" in trecho and "default_branch" in trecho, (
        "o checkout precisa fixar github.event.repository.default_branch explicitamente"
    )
    print("OK  test_checkout_pins_explicit_default_branch_ref")


def test_checkout_uses_full_history_for_checkpoint_support() -> None:
    """Uma RunnerTask com checkpoint_commit precisa conseguir dar checkout
    num commit específico — fetch raso (padrão do actions/checkout) pode
    não ter esse commit disponível localmente."""
    texto = _ler()
    idx = texto.index("uses: actions/checkout@v4")
    trecho = texto[idx: idx + 500]
    assert "fetch-depth: 0" in trecho
    print("OK  test_checkout_uses_full_history_for_checkpoint_support")


def _bloco_do_job(texto: str) -> str:
    idx_jobs = texto.index("\njobs:\n")
    idx_run = texto.index("\n  run:", idx_jobs)
    idx_runs_on = texto.index("runs-on:", idx_run)
    return texto[idx_run:idx_runs_on]


def test_job_gate_checks_enabled_and_trusted_actor() -> None:
    """O `if:` do job precisa recusar (a) ENABLED != 'true' e (b) um
    ator não confiável — ANTES de qualquer segredo ser exposto."""
    bloco = _bloco_do_job(_ler())
    assert "REPASSO_RUNNER_ENABLED" in bloco
    assert "github.actor" in bloco
    assert "Repassomed" in bloco
    print("OK  test_job_gate_checks_enabled_and_trusted_actor")


def _secao_if_do_job(texto: str) -> str:
    idx_run = texto.index("\n  run:")
    idx_if = texto.index("if:", idx_run)
    idx_runs_on = texto.index("runs-on:", idx_if)
    return texto[idx_if:idx_runs_on]


def test_job_if_requires_ref_to_be_default_branch() -> None:
    """Correção B1 (auditoria independente do PR #114): workflow_dispatch
    pode ser disparado manualmente a partir de QUALQUER ref — o `if:` do
    job precisa exigir explicitamente que a execução venha da branch
    padrão, ANTES de qualquer passo com contents:write rodar."""
    secao_if = _secao_if_do_job(_ler())
    assert "github.ref" in secao_if
    assert "default_branch" in secao_if
    assert "refs/heads/" in secao_if
    print("OK  test_job_if_requires_ref_to_be_default_branch")


def test_ref_check_confirmed_again_in_code_before_any_write() -> None:
    """Defesa em profundidade: o `if:` do workflow não é a única camada —
    os mesmos dois valores (ref atual / ref esperado) precisam chegar,
    como env explícito, ao passo que confirma o gate em CÓDIGO (que roda
    ANTES do passo que de fato executa o Runner Dispatch, o único com
    capacidade real de escrita)."""
    texto = _ler()
    idx_confirmar = texto.index("Confirmar os portões em código")
    idx_rodar = texto.index("Rodar o Runner Dispatch sobre a RunnerTask do canário")
    assert idx_confirmar < idx_rodar, "a confirmação do gate precisa vir ANTES do passo que escreve"

    trecho_confirmar = texto[idx_confirmar:idx_rodar]
    assert "REPASSO_RUNNER_ACTUAL_REF" in trecho_confirmar
    assert "REPASSO_RUNNER_EXPECTED_REF" in trecho_confirmar
    assert "github.ref" in trecho_confirmar
    assert "default_branch" in trecho_confirmar
    print("OK  test_ref_check_confirmed_again_in_code_before_any_write")


def test_full_gate_mode_and_canary_confirmed_in_code() -> None:
    """Camada 2 (defesa em profundidade): o `if:` do job só checa ENABLED
    (barato/rápido) — MODE=='canary' e CANARY_TASK_ID configurado
    precisam ser confirmados de novo em CÓDIGO (RunnerDispatchConfig.
    gate()), nunca só no `if:` do workflow."""
    texto = _ler()
    idx = texto.index("Confirmar os portões em código")
    fim = texto.index("Rodar o Runner Dispatch sobre a RunnerTask do canário", idx)
    trecho = texto[idx:fim]
    assert "RunnerDispatchConfig" in trecho
    assert "REPASSO_RUNNER_MODE" in trecho
    assert "REPASSO_RUNNER_CANARY_TASK_ID" in trecho
    assert ".gate()" in trecho
    assert "SystemExit(1)" in trecho
    print("OK  test_full_gate_mode_and_canary_confirmed_in_code")


def test_task_id_format_validated_before_any_path_is_built() -> None:
    """Issue #105: 'aceitar somente task_id explicitamente permitido...
    qualquer outra situação falha fechado, sem chamada externa.' Defesa em
    profundidade: mesmo a Variable do repositório (só um admin altera)
    precisa bater com um formato de path seguro ANTES de qualquer caminho
    (--task-file/--patch-file) ser construído a partir dela."""
    texto = _ler()
    idx = texto.index("Validar o formato do task_id")
    trecho = texto[idx: texto.index("Instalar dependências", idx)]
    assert "REPASSO_RUNNER_CANARY_TASK_ID" in trecho
    assert re.search(r"\^\[a-z0-9\]", trecho), "precisa validar o task_id com uma allowlist de formato explícita"
    assert "exit 1" in trecho
    idx_run_step = texto.index("Rodar o Runner Dispatch")
    idx_run_step_fim = texto.index("Publicar o resultado do Runner Dispatch", idx_run_step)
    trecho_run = texto[idx_run_step:idx_run_step_fim]
    assert "steps.taskid.outputs.task_id" in trecho_run, (
        "o passo que roda o dispatch precisa usar o task_id JÁ VALIDADO pelo passo anterior"
    )
    print("OK  test_task_id_format_validated_before_any_path_is_built")


def test_secret_only_exists_inside_the_single_gated_job() -> None:
    texto = _ler()
    assert texto.count("secrets.GITHUB_TOKEN") >= 1

    idx_jobs = texto.index("\njobs:\n")
    trecho_jobs = texto[idx_jobs:]
    nomes_jobs = re.findall(r"^  ([A-Za-z0-9_-]+):\s*$", trecho_jobs, re.M)
    assert nomes_jobs == ["run"], f"esperava só o job 'run', achei {nomes_jobs}"
    print("OK  test_secret_only_exists_inside_the_single_gated_job")


def test_anthropic_api_key_only_in_the_gated_runner_step() -> None:
    """Correção B2-A (2ª auditoria independente do PR #114): a Fase D
    passou a chamar a Anthropic de verdade no caminho real do canário, mas
    a credencial só pode existir como env do ÚNICO passo gated que roda
    `--generate-via-claude` — nunca em outro passo/job, nunca como secret
    de nível de job/workflow, nunca como input. OPENAI_API_KEY continua
    proibida em qualquer lugar (este mecanismo nunca usa OpenAI)."""
    texto = _ler()
    assert "OPENAI_API_KEY" not in texto

    # A referência REAL ao secret (`secrets.ANTHROPIC_API_KEY`) só pode
    # aparecer uma vez — a prosa dos comentários pode citar o NOME da
    # variável (sem o prefixo `secrets.`) para explicar a regra, mas nunca
    # a referência de fato usável.
    assert texto.count("secrets.ANTHROPIC_API_KEY") == 1, (
        "a referência real ao secret só pode existir uma vez, no passo gated"
    )

    idx_step = texto.index("Rodar o Runner Dispatch sobre a RunnerTask do canário")
    idx_run = texto.index("run: |", idx_step)
    bloco_env = texto[idx_step:idx_run]
    assert "secrets.ANTHROPIC_API_KEY" in bloco_env, "o secret precisa estar no env DESTE passo especificamente"

    # nenhum passo/job ANTERIOR a este (checkout, setup, validação de
    # task_id, confirmação de portão) pode conhecer a referência real ao
    # secret.
    texto_antes = texto[:idx_step]
    assert "secrets.ANTHROPIC_API_KEY" not in texto_antes
    print("OK  test_anthropic_api_key_only_in_the_gated_runner_step")


def test_no_force_push_or_merge_anywhere_in_this_workflow() -> None:
    texto = _ler()
    assert "--force" not in texto
    assert "force-with-lease" not in texto
    assert re.search(r"git\s+merge\b", texto) is None
    assert "merge_pull_request" not in texto
    print("OK  test_no_force_push_or_merge_anywhere_in_this_workflow")


def _secao_job_permissions(texto: str) -> str:
    idx = texto.index("\n    permissions:")
    fim = texto.index("\n    steps:", idx)
    return texto[idx:fim]


def test_permissions_are_contents_write_only_scoped_to_the_job() -> None:
    """Sem actions:write/issues:write/pull-requests:write — este workflow
    nunca comenta em PR/Issue, nunca cria/apaga artifact de outra
    execução."""
    texto = _ler()
    idx_top = texto.index("\npermissions:")
    idx_on = texto.index("\non:")
    # permissions de nível de workflow (antes de `jobs:`) precisa ser só
    # leitura — a elevação para write só acontece DENTRO do job.
    trecho_topo = texto[idx_top: texto.index("\nconcurrency:")]
    assert "contents: read" in trecho_topo

    secao_job = _secao_job_permissions(texto)
    assert "contents: write" in secao_job
    for proibido in ("actions: write", "issues: write", "pull-requests: write", "id-token: write"):
        assert proibido not in secao_job, f"{proibido!r} não devia estar nas permissões deste job"
    print("OK  test_permissions_are_contents_write_only_scoped_to_the_job")


def test_job_fails_when_runner_dispatch_cli_errors() -> None:
    texto = _ler()

    idx_upload = texto.index("uses: actions/upload-artifact@v4")
    trecho_upload = texto[idx_upload: idx_upload + 300]
    assert "if: always()" in trecho_upload, "o artifact precisa ser publicado mesmo se o CLI falhar"

    idx_fail = texto.index("Falhar o job se o Runner Dispatch terminou com erro")
    assert idx_fail > idx_upload, "o passo que falha o job precisa vir DEPOIS de publicar o artifact"
    trecho_fail = texto[idx_fail: idx_fail + 400]
    assert "resultado != '0'" in trecho_fail
    assert "exit 1" in trecho_fail
    print("OK  test_job_fails_when_runner_dispatch_cli_errors")


def test_run_step_forwards_all_three_gate_env_vars_to_the_real_invocation() -> None:
    """Mesmo achado de coordinator-observe.yml: o passo de confirmação só
    IMPRIME os portões — é o passo que de fato chama
    `python3 -m coordinator.runner_dispatch` que precisa repassar as
    MESMAS variáveis como env (as 3 originais + as 2 de ref da correção
    B1), senão o processo real veria sempre os defaults seguros mesmo com
    José tendo ligado de verdade."""
    texto = _ler()
    idx_step = texto.index("Rodar o Runner Dispatch sobre a RunnerTask do canário")
    idx_run = texto.index("run: |", idx_step)
    bloco_env = texto[idx_step:idx_run]
    for nome in (
        "REPASSO_RUNNER_ENABLED", "REPASSO_RUNNER_MODE", "REPASSO_RUNNER_CANARY_TASK_ID",
        "REPASSO_RUNNER_ACTUAL_REF", "REPASSO_RUNNER_EXPECTED_REF",
    ):
        assert nome in bloco_env, f"{nome} precisa estar no env do passo que roda o CLI de verdade"
    print("OK  test_run_step_forwards_all_three_gate_env_vars_to_the_real_invocation")


def test_real_runner_step_uses_generate_via_claude_not_patch_file() -> None:
    """Correção B2-A (2ª auditoria independente do PR #114): o caminho REAL
    do canário usa --generate-via-claude (RunnerTask autorizada -> Claude/
    Anthropic -> StructuredPatch validado), nunca --patch-file (que
    exigiria um patch já pronto no disco, sem nenhuma conexão real ao
    modelo) — e passa o ledger PERSISTENTE (correção B2-B), nunca um
    caminho de arquivo local."""
    texto = _ler()
    idx_step = texto.index("Rodar o Runner Dispatch sobre a RunnerTask do canário")
    # Escopo estrito na LINHA DE COMANDO de fato executada — nunca nos
    # comentários ao redor (que legitimamente citam "--patch-file" em
    # prosa, para explicar que ele continua existindo na CLI só para uso
    # manual/teste, fora deste workflow).
    # Ancorado na invocação de fato (com a continuação de linha `\`) —
    # nunca na PROSA do comentário acima, que também cita
    # "python3 -m coordinator.runner_dispatch" sem essa continuação.
    idx_cmd = texto.index("python3 -m coordinator.runner_dispatch \\\n", idx_step)
    idx_cmd_fim = texto.index('--out /tmp/runner-dispatch-outcome.json', idx_cmd) + len(
        "--out /tmp/runner-dispatch-outcome.json"
    )
    bloco_cmd = texto[idx_cmd:idx_cmd_fim]
    assert "--generate-via-claude" in bloco_cmd
    assert "--patch-file" not in bloco_cmd
    assert "--usage-git-remote" in bloco_cmd
    # Correção B4 (3ª auditoria independente do PR #114): --usage-git-branch
    # NUNCA é passado como literal aqui — o Runner precisa usar o DEFAULT
    # do próprio CLI (coordinator-state-usage, a mesma branch/ledger
    # Anthropic GLOBAL do Coordinator OBSERVE), nunca uma branch separada
    # hardcoded neste workflow que divergiria do default por um refactor
    # futuro sem ninguém notar.
    assert "--usage-git-branch" not in bloco_cmd
    print("OK  test_real_runner_step_uses_generate_via_claude_not_patch_file")


def test_validation_command_keys_come_from_a_fixed_declared_set() -> None:
    """Issue #105: 'testes e comandos devem vir de uma allowlist
    declarada, não de texto gerado pelo modelo.' O workflow nunca lê
    --validation-command-keys de um input/Variable — é um literal fixo no
    próprio arquivo."""
    texto = _ler()
    assert "--validation-command-keys coordinator-suite" in texto
    print("OK  test_validation_command_keys_come_from_a_fixed_declared_set")


def test_sucesso_status_is_needs_audit_never_done_by_default() -> None:
    """Nesta fase de mecanismo (sem canário real rodando ainda), o
    resultado de sucesso default é sempre NEEDS-AUDIT — nunca DONE — como
    prudência adicional enquanto não há uma RunnerTask/patch de canário
    real configurada."""
    texto = _ler()
    assert "--sucesso-status NEEDS-AUDIT" in texto
    print("OK  test_sucesso_status_is_needs_audit_never_done_by_default")


def main() -> int:
    testes = [
        test_workflow_file_exists_and_is_separate_from_observe,
        test_workflow_dispatch_is_the_only_trigger,
        test_workflow_dispatch_has_no_inputs,
        test_checkout_pins_explicit_default_branch_ref,
        test_checkout_uses_full_history_for_checkpoint_support,
        test_job_gate_checks_enabled_and_trusted_actor,
        test_job_if_requires_ref_to_be_default_branch,
        test_ref_check_confirmed_again_in_code_before_any_write,
        test_full_gate_mode_and_canary_confirmed_in_code,
        test_task_id_format_validated_before_any_path_is_built,
        test_secret_only_exists_inside_the_single_gated_job,
        test_anthropic_api_key_only_in_the_gated_runner_step,
        test_no_force_push_or_merge_anywhere_in_this_workflow,
        test_permissions_are_contents_write_only_scoped_to_the_job,
        test_job_fails_when_runner_dispatch_cli_errors,
        test_run_step_forwards_all_three_gate_env_vars_to_the_real_invocation,
        test_real_runner_step_uses_generate_via_claude_not_patch_file,
        test_validation_command_keys_come_from_a_fixed_declared_set,
        test_sucesso_status_is_needs_audit_never_done_by_default,
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
