"""Prova ESTRUTURAL da fronteira de segurança do workflow que segura
ANTHROPIC_API_KEY/GITHUB_TOKEN(write) — bloqueadores 1, 2, 4, 5 e 7 da 3ª
auditoria do PR #97.

Mesma filosofia de ``test_no_forbidden_writes.py``: verificar o que é
objetivo e mensurável no próprio arquivo (texto/regex simples, igual ao
Repasso Guard faz com código-fonte), sem precisar de nenhuma dependência
nova (nada de parser de YAML) — este pacote continua só biblioteca
padrão fora do único Transport isolado em anthropic_transport.py. Isto
varre ``.github/workflows/coordinator-observe.yml``, não código Python.
"""

from __future__ import annotations

import os
import re
import sys

from . import _pathsetup

_WORKFLOW_PATH = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "coordinator-observe.yml")


def _ler() -> str:
    with open(_WORKFLOW_PATH, encoding="utf-8") as fh:
        return fh.read()


def _secao_on(texto: str) -> str:
    inicio = texto.index("\non:")
    fim = texto.index("\npermissions:")
    return texto[inicio:fim]


def test_pull_request_trigger_is_absent() -> None:
    """Bloqueador 1: um evento pull_request de branch do mesmo repositório
    roda o ARQUIVO do workflow na versão do PR — nunca pode ser gatilho
    deste workflow enquanto ele segurar segredo real."""
    secao = _secao_on(_ler())
    assert "pull_request" not in secao, (
        "pull_request não pode ser gatilho deste workflow — ele segura ANTHROPIC_API_KEY"
    )
    print("OK  test_pull_request_trigger_is_absent")


def test_only_safe_triggers_are_present() -> None:
    """issue_comment e workflow_run são estruturalmente seguros para um
    workflow com segredo: nenhum dos dois roda o ARQUIVO do workflow a
    partir do HEAD de um PR de terceiros."""
    secao = _secao_on(_ler())
    assert "issue_comment:" in secao
    assert "workflow_run:" in secao
    for proibido in ("push:", "schedule:", "workflow_dispatch:", "pull_request_target:"):
        assert proibido not in secao, f"{proibido!r} não devia estar nos gatilhos deste workflow"
    print("OK  test_only_safe_triggers_are_present")


def test_checkout_pins_explicit_default_branch_ref() -> None:
    """Defesa em profundidade: mesmo que o comportamento padrão do
    actions/checkout já fosse seguro para estes 2 gatilhos, o `ref:` é
    fixado explicitamente na branch padrão — nunca herdado implicitamente
    de github.sha/github.ref do evento."""
    texto = _ler()
    idx = texto.index("uses: actions/checkout@v4")
    trecho = texto[idx: idx + 200]
    assert "ref:" in trecho and "default_branch" in trecho, (
        "o checkout precisa fixar github.event.repository.default_branch explicitamente"
    )
    print("OK  test_checkout_pins_explicit_default_branch_ref")


def test_secret_only_exists_inside_a_single_gated_job() -> None:
    """ANTHROPIC_API_KEY só pode existir dentro do job cujo `if:` já checa
    REPASSO_COORDINATOR_ENABLED — e este workflow só pode ter UM job,
    para não existir um segundo job destravado por engano."""
    texto = _ler()
    assert texto.count("ANTHROPIC_API_KEY") >= 1

    idx_jobs = texto.index("\njobs:\n")
    trecho_jobs = texto[idx_jobs:]
    nomes_jobs = re.findall(r"^  ([A-Za-z0-9_-]+):\s*$", trecho_jobs, re.M)
    assert nomes_jobs == ["observe"], f"esperava só o job 'observe', achei {nomes_jobs}"
    print("OK  test_secret_only_exists_inside_a_single_gated_job")


def _bloco_do_job(texto: str) -> str:
    idx_jobs = texto.index("\njobs:\n")
    idx_observe = texto.index("  observe:", idx_jobs)
    idx_runs_on = texto.index("runs-on:", idx_observe)
    return texto[idx_observe:idx_runs_on]


def test_job_gate_checks_enabled_and_trusted_comment_actor() -> None:
    """O `if:` do job precisa recusar (a) ENABLED != 'true' e (b) um
    issue_comment de autor não confiável — ANTES de qualquer segredo ser
    exposto. Não é suficiente confiar só na checagem em
    coordinator/github_event.py (camada 2)."""
    bloco = _bloco_do_job(_ler())
    assert "REPASSO_COORDINATOR_ENABLED" in bloco
    assert "issue_comment" in bloco
    assert "comment.user.login" in bloco
    assert "Repassomed" in bloco
    print("OK  test_job_gate_checks_enabled_and_trusted_comment_actor")


def test_job_gate_also_filters_coordinator_marker_second_layer() -> None:
    """Achado B5 da auditoria independente do PR #104, rodada 2:
    anti-self-loop em duas camadas — o `if:` do job (camada rápida/barata)
    nem deixa o job começar para um comentário que já carrega o marcador
    do Coordinator, além do filtro em Python (camada 2, defesa em
    profundidade, nunca removida)."""
    bloco = _bloco_do_job(_ler())
    assert "contains(github.event.comment.body, '<!-- repasso-coordinator -->')" in bloco
    print("OK  test_job_gate_also_filters_coordinator_marker_second_layer")


def test_worker_state_git_remote_is_wired_into_the_real_invocation() -> None:
    assert "--worker-state-git-remote" in _ler()
    print("OK  test_worker_state_git_remote_is_wired_into_the_real_invocation")


def test_comment_step_reads_explicit_target_never_infers_it() -> None:
    """Correção B4 da auditoria independente do PR #104, rodada 4: o
    workflow nunca reconstrói a lógica de destino (PR vs. Issue #88 vs.
    issue de origem) — só lê o número que o Coordinator já decidiu e
    gravou em /tmp/coordinator-comment-target.txt."""
    texto = _ler()
    idx = texto.index("- name: Comentar o Cartão de Merge")
    trecho = texto[idx: idx + 2000]
    assert "coordinator-comment-target.txt" in trecho
    assert "context.eventName === 'issue_comment'" not in trecho, (
        "o workflow não pode mais reconstruir a lógica de destino sozinho"
    )
    assert "steps.coordinator.outputs.comment_ready" in trecho
    print("OK  test_comment_step_reads_explicit_target_never_infers_it")


def test_hashfiles_against_tmp_is_never_used() -> None:
    """Correção B1 da auditoria independente do PR #104, rodada 4:
    hashFiles() é uma função da linguagem de expressão do GitHub Actions
    e só enxerga arquivos dentro de GITHUB_WORKSPACE — chamá-la contra
    /tmp/... (como o `if:` do passo de comentário fazia antes desta
    correção) avalia sempre como string vazia em produção, deixando o
    passo permanentemente pulado apesar de todos os testes locais
    passarem (nenhum deles roda um runner real do Actions). Trava
    estrutural: este padrão nunca pode voltar a aparecer no arquivo."""
    texto = _ler()
    assert "hashFiles('/tmp/" not in texto and 'hashFiles("/tmp/' not in texto, (
        "hashFiles() não pode ser usado contra caminhos em /tmp — "
        "GITHUB_WORKSPACE é a única árvore que ele enxerga; use um "
        "output explícito (ex.: comment_ready) gravado em bash"
    )
    print("OK  test_hashfiles_against_tmp_is_never_used")


def test_comment_target_out_flag_is_wired_into_the_real_invocation() -> None:
    assert "--comment-target-out /tmp/coordinator-comment-target.txt" in _ler()
    print("OK  test_comment_target_out_flag_is_wired_into_the_real_invocation")


def test_job_fails_when_coordinator_cli_errors() -> None:
    """Bloqueador 7: um passo final precisa fazer o job falhar quando o
    CLI termina com código != 0 — DEPOIS de publicar o artifact (upload
    com if: always(), e o passo de falhar vem depois dele na ordem)."""
    texto = _ler()

    idx_upload = texto.index("uses: actions/upload-artifact@v4")
    trecho_upload = texto[idx_upload: idx_upload + 300]
    assert "if: always()" in trecho_upload, "o artifact precisa ser publicado mesmo se o CLI falhar"

    idx_fail = texto.index("Falhar o job se o Coordinator terminou com erro")
    assert idx_fail > idx_upload, "o passo que falha o job precisa vir DEPOIS de publicar o artifact"
    trecho_fail = texto[idx_fail: idx_fail + 400]
    assert "resultado != '0'" in trecho_fail
    assert "exit 1" in trecho_fail
    print("OK  test_job_fails_when_coordinator_cli_errors")


def test_workers_from_tasks_json_is_wired_into_the_real_invocation() -> None:
    """Bloqueador 4: o workflow real precisa passar --workers-from-tasks-json,
    não deixar o Coordinator rodar com workers=[] silenciosamente."""
    assert "--workers-from-tasks-json coordination/tasks.json" in _ler()
    print("OK  test_workers_from_tasks_json_is_wired_into_the_real_invocation")


def _secao_job_permissions(texto: str) -> str:
    """O bloco `permissions:` DENTRO do job `observe` — não o de nível de
    workflow (`on:` .. primeiro `permissions:`, já coberto por
    ``_secao_on``). Delimitado por `steps:`, que sempre vem logo depois."""
    idx = texto.index("\n    permissions:")
    fim = texto.index("\n    steps:", idx)
    return texto[idx:fim]


def test_actions_read_present_actions_write_absent() -> None:
    """Achado do "ACHADO ADICIONAL"/"PACOTE CONSOLIDADO" (PR #97): o job
    baixa artifact de OUTRA execução (actions/download-artifact@v4 com
    run-id do workflow_run observado) — isso exige `actions: read`
    (permissão omitida vira 'none' no GitHub Actions). O job nunca cria
    nem apaga artifact, então `actions: write` tem que continuar ausente
    — mais permissão do que o necessário, ainda mais rodando ao lado de
    ANTHROPIC_API_KEY/GITHUB_TOKEN, é exatamente o que a auditoria de
    segurança (Claude 1) já cobrou para os outros escopos."""
    secao = _secao_job_permissions(_ler())
    assert "actions: read" in secao, "download-artifact@v4 cross-run precisa de actions:read"
    assert "actions: write" not in secao, "este job só consome artifact, nunca cria/apaga — sem actions:write"
    print("OK  test_actions_read_present_actions_write_absent")


def test_download_artifact_step_is_inside_the_permissioned_job() -> None:
    """Não basta a permissão existir em algum lugar do arquivo — ela
    precisa estar no MESMO job que de fato chama download-artifact@v4
    (hoje há um único job, 'observe', mas isto trava a suposição em
    código em vez de deixá-la implícita)."""
    texto = _ler()
    idx_perm = texto.index("\n    permissions:")
    idx_download = texto.index("uses: actions/download-artifact@v4")
    assert idx_download > idx_perm, "o passo de download precisa vir depois do bloco permissions: do job"
    print("OK  test_download_artifact_step_is_inside_the_permissioned_job")


def test_guard_audit_pack_download_step_exists() -> None:
    """Bloqueador 5: precisa existir um passo que baixe o artifact do
    Guard do run OBSERVADO (run-id do workflow_run, não do próprio job)."""
    texto = _ler()
    idx = texto.index("uses: actions/download-artifact@v4")
    trecho = texto[idx: idx + 400]
    assert "run-id: ${{ github.event.workflow_run.id }}" in trecho
    assert "name: repasso-guard-audit-pack" in trecho
    print("OK  test_guard_audit_pack_download_step_exists")


def test_malicious_pr_editing_coordinator_cannot_run_with_secret() -> None:
    """Prova direta pedida pela 3ª auditoria, amarrando as 3 checagens
    acima numa única afirmação: um PR malicioso que altere
    coordinator/**, requirements.txt ou este próprio workflow NÃO tem
    como fazer esse código rodar com ANTHROPIC_API_KEY exposto — porque
    (a) nenhum gatilho deste workflow é acionado pelo evento pull_request
    (o único que roda o ARQUIVO do workflow na versão do PR), e (b) o
    checkout, nos dois gatilhos que sobraram, é fixado explicitamente na
    branch padrão, nunca em qualquer ref que um PR controle."""
    texto = _ler()
    secao = _secao_on(texto)
    assert "pull_request" not in secao
    idx_checkout = texto.index("uses: actions/checkout@v4")
    assert "default_branch" in texto[idx_checkout: idx_checkout + 200]
    print("OK  test_malicious_pr_editing_coordinator_cannot_run_with_secret")


def test_issues_write_present_only_for_commenting_actions_write_still_absent() -> None:
    """V3 (Issue #99): a única permissão nova é issues:write, e só para o
    passo que posta o Cartão de Merge — actions:write continua ausente
    (achado do PR #97, nunca revertido por esta V3)."""
    secao = _secao_job_permissions(_ler())
    assert "issues: write" in secao
    assert "actions: write" not in secao
    print("OK  test_issues_write_present_only_for_commenting_actions_write_still_absent")


def test_merge_card_comment_step_only_runs_when_comment_file_exists() -> None:
    """O passo que comenta o Cartão de Merge só pode rodar quando o CLI
    gravou --comment-out (MODE=active-supervised com auditoria concluída)
    — nunca incondicionalmente, senão comentaria um arquivo vazio/antigo
    em MODE=observe. Correção B1 (rodada 4): a condição usa o output
    explícito comment_ready (gravado em bash), não hashFiles() contra
    /tmp — e o script mantém fs.existsSync como segunda camada."""
    texto = _ler()
    idx = texto.index("- name: Comentar o Cartão de Merge")
    trecho = texto[idx: idx + 2800]
    assert "steps.coordinator.outputs.comment_ready == 'true'" in trecho
    assert "fs.existsSync" in trecho
    assert "createComment" in trecho
    print("OK  test_merge_card_comment_step_only_runs_when_comment_file_exists")


def test_comment_out_flag_is_wired_into_the_real_invocation() -> None:
    assert "--comment-out /tmp/coordinator-comment.md" in _ler()
    print("OK  test_comment_out_flag_is_wired_into_the_real_invocation")


def test_pr_diff_fetch_step_exists_and_is_wired_into_the_cli() -> None:
    """Correção B2 da auditoria independente do PR #104: o diff real da PR
    precisa ser buscado pelo passo confiável (mesmo passo que já lê
    número/rótulos da PR) e passado ao CLI via --pr-diff-file."""
    texto = _ler()
    idx = texto.index("Buscar dados reais da PR associada")
    trecho = texto[idx: idx + 2200]
    assert "mediaType: { format: 'diff' }" in trecho
    assert "/tmp/pr-diff.patch" in trecho
    assert "--pr-diff-file /tmp/pr-diff.patch" in texto
    print("OK  test_pr_diff_fetch_step_exists_and_is_wired_into_the_cli")


def test_codeowners_covers_coordinator_and_workflows() -> None:
    """Issue #99, 'SEGURANÇA ANTES DE AUMENTAR PERMISSÕES': antes de dar
    ao Coordinator qualquer nova capacidade de escrita, o código
    crítico/workflows precisa de uma camada de revisão declarada."""
    caminho = os.path.join(_pathsetup.REPO_ROOT, ".github", "CODEOWNERS")
    assert os.path.exists(caminho), ".github/CODEOWNERS precisa existir (Issue #99)"
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    assert "/coordinator/" in conteudo
    assert "/.github/workflows/" in conteudo
    print("OK  test_codeowners_covers_coordinator_and_workflows")


def test_run_step_forwards_enabled_mode_and_pilot_env_to_the_cli() -> None:
    """Bug encontrado nesta rodada: o passo que de fato chama
    `python3 -m coordinator` não repassava REPASSO_COORDINATOR_ENABLED/
    MODE/PILOT/PILOT_EVENT_KEY como env — Config.from_env() só lê o
    ambiente DESTE passo (env de um passo não é herdado de outro passo),
    então mesmo José ligando a Variable no repositório, o processo real
    veria sempre os defaults seguros (false/observe) e o primeiro teste
    jamais poderia acontecer de verdade. Prova que os nomes de variável
    chegam ao passo certo."""
    texto = _ler()
    idx_step = texto.index("Rodar o Coordinator sobre o evento real")
    idx_run = texto.index("run: |", idx_step)
    bloco_env = texto[idx_step:idx_run]
    for nome in (
        "REPASSO_COORDINATOR_ENABLED",
        "REPASSO_COORDINATOR_MODE",
        "REPASSO_COORDINATOR_PILOT",
        "REPASSO_COORDINATOR_PILOT_EVENT_KEY",
        "ANTHROPIC_API_KEY",
    ):
        assert nome in bloco_env, f"{nome} precisa estar no env do passo que roda o CLI de verdade"
    print("OK  test_run_step_forwards_enabled_mode_and_pilot_env_to_the_cli")


def test_runner_repo_dir_flag_is_wired_into_the_real_invocation() -> None:
    """Achado F8-A (Issue #105, Fase F, 7ª rodada): o passo real precisa
    passar --runner-repo-dir . para que uma retomada api_runner disparada
    por um SET_AVAILABLE reconhecido na Inbox (#88) tenha onde ler/
    escrever a branch de trabalho — sem isto, runner_repo_dir chega
    sempre None em observe() (retrocompatível, mas nenhuma retomada
    api_runner de verdade consegue prosseguir)."""
    texto = _ler()
    idx_step = texto.index("Rodar o Coordinator sobre o evento real")
    idx_run = texto.index("run: |", idx_step)
    bloco_run = texto[idx_run:]
    assert "--runner-repo-dir ." in bloco_run
    print("OK  test_runner_repo_dir_flag_is_wired_into_the_real_invocation")


def test_run_step_forwards_runner_gate_env_to_the_cli() -> None:
    """Achado F8-A: os MESMOS 5 nomes de Variable/expressão que
    coordinator-runner.yml já usa para o Runner precisam chegar até o
    passo que de fato chama `python3 -m coordinator` — sem isto,
    `RunnerDispatchConfig.from_env()` (dentro de `_observar()`) sempre
    veria os defaults seguros (ENABLED=false), mesmo com as Variables do
    repositório configuradas de verdade."""
    texto = _ler()
    idx_step = texto.index("Rodar o Coordinator sobre o evento real")
    idx_run = texto.index("run: |", idx_step)
    bloco_env = texto[idx_step:idx_run]
    for nome in (
        "REPASSO_RUNNER_ENABLED",
        "REPASSO_RUNNER_MODE",
        "REPASSO_RUNNER_CANARY_TASK_ID",
        "REPASSO_RUNNER_ACTUAL_REF",
        "REPASSO_RUNNER_EXPECTED_REF",
    ):
        assert nome in bloco_env, f"{nome} precisa estar no env do passo que roda o CLI de verdade"
    print("OK  test_run_step_forwards_runner_gate_env_to_the_cli")


def test_runner_gate_env_uses_the_same_variables_and_expressions_as_the_runner_workflow() -> None:
    """Achado F8-A: 'use as mesmas Variables e mesmas regras de segurança
    do workflow Runner' — nunca um valor inventado/hardcoded aqui. As
    3 Variables (ENABLED/MODE/CANARY_TASK_ID) precisam vir de `vars.*`
    (nunca de um literal fixo), e ACTUAL_REF/EXPECTED_REF precisam usar
    EXATAMENTE a mesma expressão que coordinator-runner.yml usa
    (`github.ref` / `refs/heads/<default_branch>`), para que a mesma
    checagem de ref segura se aplique aqui também."""
    texto = _ler()
    idx_step = texto.index("Rodar o Coordinator sobre o evento real")
    idx_run = texto.index("run: |", idx_step)
    bloco_env = texto[idx_step:idx_run]
    assert "REPASSO_RUNNER_ENABLED: ${{ vars.REPASSO_RUNNER_ENABLED }}" in bloco_env
    assert "REPASSO_RUNNER_MODE: ${{ vars.REPASSO_RUNNER_MODE }}" in bloco_env
    assert "REPASSO_RUNNER_CANARY_TASK_ID: ${{ vars.REPASSO_RUNNER_CANARY_TASK_ID }}" in bloco_env
    assert "REPASSO_RUNNER_ACTUAL_REF: ${{ github.ref }}" in bloco_env
    assert (
        "REPASSO_RUNNER_EXPECTED_REF: refs/heads/${{ github.event.repository.default_branch }}"
        in bloco_env
    )
    # Nenhuma flag é "ligada por conta própria" — nenhum destes valores
    # pode ser um literal 'true'/task_id fixo neste arquivo.
    assert 'REPASSO_RUNNER_ENABLED: "true"' not in texto
    assert "REPASSO_RUNNER_ENABLED: true" not in texto
    print("OK  test_runner_gate_env_uses_the_same_variables_and_expressions_as_the_runner_workflow")


def main() -> int:
    testes = [
        test_pull_request_trigger_is_absent,
        test_only_safe_triggers_are_present,
        test_checkout_pins_explicit_default_branch_ref,
        test_secret_only_exists_inside_a_single_gated_job,
        test_job_gate_checks_enabled_and_trusted_comment_actor,
        test_job_fails_when_coordinator_cli_errors,
        test_actions_read_present_actions_write_absent,
        test_download_artifact_step_is_inside_the_permissioned_job,
        test_malicious_pr_editing_coordinator_cannot_run_with_secret,
        test_workers_from_tasks_json_is_wired_into_the_real_invocation,
        test_guard_audit_pack_download_step_exists,
        test_run_step_forwards_enabled_mode_and_pilot_env_to_the_cli,
        test_issues_write_present_only_for_commenting_actions_write_still_absent,
        test_merge_card_comment_step_only_runs_when_comment_file_exists,
        test_comment_out_flag_is_wired_into_the_real_invocation,
        test_pr_diff_fetch_step_exists_and_is_wired_into_the_cli,
        test_codeowners_covers_coordinator_and_workflows,
        test_job_gate_also_filters_coordinator_marker_second_layer,
        test_worker_state_git_remote_is_wired_into_the_real_invocation,
        test_comment_step_reads_explicit_target_never_infers_it,
        test_comment_target_out_flag_is_wired_into_the_real_invocation,
        test_hashfiles_against_tmp_is_never_used,
        test_runner_repo_dir_flag_is_wired_into_the_real_invocation,
        test_run_step_forwards_runner_gate_env_to_the_cli,
        test_runner_gate_env_uses_the_same_variables_and_expressions_as_the_runner_workflow,
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
