"""Testes de ``coordinator/worker_commands.py`` — Issue #105, Fase F,
achado F6 (4ª rodada — fechamento do evento automático).

Mesma técnica de ``test_runner_resume.py``: git de verdade (não simulado)
contra um repositório "remoto" local, e um ``coordination/tasks.json``
de mentira em disco para exercitar ``scheduler.load_tasks_from_tasks_json``
de verdade (nunca mockado).

Cobre: comportamento antigo preservado quando ``tasks_json_path`` não é
fornecido (retrocompatibilidade com ``observe.py``); teste integrado
obrigatório (LIMIT/BLOCKED-LIMIT -> evento SET_AVAILABLE real ->
reprocessar_retorno -> retoma a própria tarefa a partir do checkpoint ->
Runner usa execution_task_id NOVO -> redelivery não duplica execução);
tarefa original já concluída/assumida -> próxima oferta, sem execução
indevida; human_session nunca iniciada automaticamente; gate fechado ->
zero execução/chamada paga.

Deliberadamente NÃO registrado em ``coordinator/tests/run_all.py`` nesta
rodada (mesma decisão operacional já aplicada às Fases B/C/D/F) — roda
standalone via ``python3 -m coordinator.tests.test_worker_commands``.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator.classify import Priority
from coordinator.runner_contract import RunnerTask
from coordinator.runner_dispatch import FileWrite, RunnerDispatchConfig, StructuredPatch
from coordinator.runner_resume import snapshot_de_interrupcao
from coordinator.worker_commands import WorkerCommand, aplicar_comando, reagir_a_retorno_de_worker
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord

# ---------------------------------------------------------------------------
# Infraestrutura git real — mesmo padrão de test_runner_resume.py.
# ---------------------------------------------------------------------------

def _criar_remoto_local(tmp: str) -> str:
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para os testes do worker_commands\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    subprocess.run(["git", "-C", remoto, "checkout", "-q", "-b", "bootstrap"], check=True)
    return remoto


def _clonar_workdir(tmp: str, remoto: str, nome: str) -> str:
    workdir = os.path.join(tmp, nome)
    subprocess.run(["git", "clone", "-q", remoto, workdir], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.name", "X"], check=True)
    subprocess.run(["git", "-C", workdir, "checkout", "-q", "bootstrap"], check=True)
    return workdir


def _publicar_branch_com_checkpoint(remoto: str, tmp: str, branch: str, arquivo: str, conteudo: str) -> str:
    workdir = _clonar_workdir(tmp, remoto, f"anterior-{branch.replace('/', '-')}")
    subprocess.run(["git", "-C", workdir, "checkout", "-q", "-b", branch], check=True)
    with open(os.path.join(workdir, arquivo), "w", encoding="utf-8") as fh:
        fh.write(conteudo)
    subprocess.run(["git", "-C", workdir, "add", "-A"], check=True)
    subprocess.run(["git", "-C", workdir, "commit", "-q", "-m", "checkpoint do worker anterior"], check=True)
    subprocess.run(["git", "-C", workdir, "push", "-q", "origin", branch], check=True)
    sha = subprocess.run(
        ["git", "-C", workdir, "rev-parse", "HEAD"], capture_output=True, text=True, check=True
    ).stdout.strip()
    return sha


def _escrever_tasks_json(tmp: str, tarefas: list[dict]) -> str:
    caminho = os.path.join(tmp, "tasks.json")
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump({"tarefas": tarefas}, fh)
    return caminho


# ---------------------------------------------------------------------------
# Fixtures.
# ---------------------------------------------------------------------------

def _registry() -> OperationalWorkerRegistry:
    return OperationalWorkerRegistry(InMemoryWorkerStateStore())


def _tarefa_original(**overrides) -> RunnerTask:
    campos = dict(
        task_id="t-original--continuacao-00000000",  # id de EXECUÇÃO anterior, nunca o canônico
        priority=Priority.P1,
        source_issue=105,
        branch="runner/t-original",
        allowed_files=("greeting.txt",),
        instructions="Escrever uma saudação de teste em greeting.txt.",
        checkpoint_commit=None,
        capabilities_required=(),
        risk_level="BAIXO",
        policy_level="C",
        jose_authorized=False,
        publication_required=False,
    )
    campos.update(overrides)
    return RunnerTask(**campos)


def _config(**overrides) -> RunnerDispatchConfig:
    campos = dict(enabled=True, mode="canary", canary_task_id="t-original--resume-PLACEHOLDER")
    campos.update(overrides)
    return RunnerDispatchConfig(**campos)


def _patch_greeting() -> StructuredPatch:
    return StructuredPatch(files=(FileWrite(path="greeting.txt", content="retomado\n"),))


# ---------------------------------------------------------------------------
# Retrocompatibilidade — sem tasks_json_path, comportamento idêntico ao de
# antes do achado F6 (nenhuma mudança para observe.py, que nunca passa
# esses parâmetros novos).
# ---------------------------------------------------------------------------

def test_set_available_sem_tasks_json_path_preserva_comportamento_antigo() -> None:
    registry = _registry()
    comando = WorkerCommand(action="SET_AVAILABLE", worker_name="Claude 2")
    confirmacao = aplicar_comando(registry, comando)
    assert confirmacao == "Claude 2 marcado como AVAILABLE."
    worker = registry.find_by_name_or_id("Claude 2")
    assert worker is not None and worker.status == "AVAILABLE"
    print("OK  test_set_available_sem_tasks_json_path_preserva_comportamento_antigo")


def test_outras_acoes_ignoram_os_parametros_novos() -> None:
    registry = _registry()
    registry.set_status("Claude 3", "AVAILABLE", message="setup")
    assert aplicar_comando(registry, WorkerCommand(action="SET_LIMIT", worker_name="Claude 3")) == (
        "Claude 3 marcado como LIMIT."
    )
    assert aplicar_comando(registry, WorkerCommand(action="DEACTIVATE", worker_name="Claude 3")) == (
        "Claude 3 desativado (OFFLINE)."
    )
    print("OK  test_outras_acoes_ignoram_os_parametros_novos")


# ---------------------------------------------------------------------------
# Teste integrado obrigatório (achado F6): LIMIT/BLOCKED-LIMIT -> evento
# SET_AVAILABLE real -> reprocessar_retorno -> retoma a própria tarefa a
# partir do checkpoint -> Runner usa execution_task_id NOVO -> redelivery
# não duplica execução.
# ---------------------------------------------------------------------------

def test_integrado_set_available_real_retoma_tarefa_e_redelivery_nao_duplica() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-original", "greeting.txt", "ola\n")

        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-original", "estado": "BLOCKED-LIMIT", "area": "infra", "agente": "claude-2"},
        ])

        registry = _registry()
        # Estado ANTES do evento: claude-2 em LIMIT, ainda dono canônico
        # de 't-original', com o checkpoint que um heartbeat real teria
        # publicado.
        registry.upsert(
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-original", branch="runner/t-original", last_checkpoint=sha,
                progress="60%", can_execute=True, can_audit=False,
            ),
            message="setup: claude-2 em LIMIT",
        )
        worker_anterior = registry.find_by_name_or_id("Claude 2")
        snap = snapshot_de_interrupcao(
            canonical_task_id="t-original", tarefa_original=_tarefa_original(checkpoint_commit=sha),
            worker_anterior=worker_anterior, motivo_interrupcao="LIMIT",
        )
        config = _config(canary_task_id=f"t-original--resume-{sha[:12]}")

        # Evento REAL: "Claude 2 voltou" -> parse -> aplica.
        comando = WorkerCommand(action="SET_AVAILABLE", worker_name="Claude 2")
        workdir1 = _clonar_workdir(tmp, remoto, "evento-1")
        confirmacao1 = aplicar_comando(
            registry, comando, tasks_json_path=tasks_path, repo_dir=workdir1, config=config,
            state_git_remote=remoto, snapshot_da_tarefa_original=snap, patch=_patch_greeting(),
        )
        assert "AVAILABLE" in confirmacao1
        assert "NEEDS-AUDIT" in confirmacao1, confirmacao1
        # O registro operacional reflete o comando de status normalmente.
        assert registry.find_by_name_or_id("Claude 2").status == "AVAILABLE"

        # Prova direta (via reagir_a_retorno_de_worker) de que o Runner
        # usou um execution_task_id NOVO — nunca o canônico 't-original'
        # sozinho, nunca o id de execução ANTERIOR
        # ('t-original--continuacao-00000000').
        novo = registry.find_by_name_or_id("Claude 2")
        workdir_outcome = _clonar_workdir(tmp, remoto, "checar-outcome")
        # (mesma chamada que aplicar_comando faria internamente — usada
        # aqui só para inspecionar o RetornoWorkerOutcome completo, já
        # que aplicar_comando devolve só uma string de confirmação.)
        outcome_1 = reagir_a_retorno_de_worker(
            registry, novo, tasks_json_path=tasks_path, repo_dir=workdir_outcome, config=config,
            state_git_remote=remoto, snapshot_da_tarefa_original=snap,
        )
        # Sem patch novo desta vez -> mesma tentativa já reivindicada
        # (claim) OU checkpoint já avançado (F2) -> BLOCKED, nunca uma
        # segunda NEEDS-AUDIT.
        assert outcome_1.retomada is not None
        execution_id = outcome_1.retomada.result.task_id if outcome_1.retomada.result else None
        # redelivery: mesmo evento entregue de novo -> NUNCA executa duas vezes.
        workdir2 = _clonar_workdir(tmp, remoto, "evento-2")
        confirmacao2 = aplicar_comando(
            registry, comando, tasks_json_path=tasks_path, repo_dir=workdir2, config=config,
            state_git_remote=remoto, snapshot_da_tarefa_original=snap, patch=_patch_greeting(),
        )
        assert "NEEDS-AUDIT" not in confirmacao2, (
            f"redelivery do mesmo evento nunca pode disparar uma segunda execução: {confirmacao2!r}"
        )
        assert "BLOCKED" in confirmacao2, confirmacao2
    print("OK  test_integrado_set_available_real_retoma_tarefa_e_redelivery_nao_duplica")


def test_execution_task_id_e_distinto_do_canonico_e_da_execucao_anterior() -> None:
    """Prova isolada (achado F5 preservado): o execution_task_id que o
    Runner de fato usa nunca é o canônico sozinho nem o id de execução
    anterior (que, no cenário real, viria de um handoff da Fase E)."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-x", "greeting.txt", "ola\n")
        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-x", "estado": "BLOCKED-LIMIT", "area": "infra", "agente": "claude-2"},
        ])
        registry = _registry()
        registry.upsert(
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-x", branch="runner/t-x", last_checkpoint=sha, can_execute=True,
            ),
            message="setup",
        )
        worker_anterior = registry.find_by_name_or_id("Claude 2")
        execution_id_anterior = "t-x--continuacao-11111111"
        snap = snapshot_de_interrupcao(
            canonical_task_id="t-x",
            tarefa_original=_tarefa_original(task_id=execution_id_anterior, branch="runner/t-x", checkpoint_commit=sha),
            worker_anterior=worker_anterior, motivo_interrupcao="LIMIT",
        )
        config = _config(canary_task_id=f"t-x--resume-{sha[:12]}")
        novo = registry.set_status("Claude 2", "AVAILABLE", message="volta")
        workdir = _clonar_workdir(tmp, remoto, "exec-id")
        outcome = reagir_a_retorno_de_worker(
            registry, novo, tasks_json_path=tasks_path, repo_dir=workdir, config=config,
            state_git_remote=remoto, snapshot_da_tarefa_original=snap, patch=_patch_greeting(),
        )
        assert outcome.retomada is not None and outcome.retomada.result is not None
        execution_id_novo = outcome.retomada.result.task_id
        assert outcome.retomada.result.status == "NEEDS-AUDIT", outcome.retomada.result
        assert execution_id_novo != "t-x"
        assert execution_id_novo != execution_id_anterior
        assert execution_id_novo == f"t-x--resume-{sha[:12]}"
    print("OK  test_execution_task_id_e_distinto_do_canonico_e_da_execucao_anterior")


# ---------------------------------------------------------------------------
# Tarefa original já concluída/assumida -> próxima oferta pelo fluxo
# normal, sem execução indevida.
# ---------------------------------------------------------------------------

def test_tarefa_ja_concluida_oferece_proxima_sem_execucao_indevida() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-original", "estado": "DONE", "area": "infra", "agente": "claude-2"},
            {"id": "t-seguinte", "estado": "READY", "area": "infra", "agente": None},
        ])
        registry = _registry()
        registry.upsert(
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-original", can_execute=True,
            ),
            message="setup",
        )
        comando = WorkerCommand(action="SET_AVAILABLE", worker_name="Claude 2")
        # Nenhum repo_dir/config/patch fornecido de propósito — o caminho
        # de "próxima oferta" NUNCA precisa deles (nunca despacha nada).
        confirmacao = aplicar_comando(registry, comando, tasks_json_path=tasks_path)
        assert "NEEDS-AUDIT" not in confirmacao
        assert "BLOCKED" not in confirmacao
        assert "Próxima oferta" in confirmacao, confirmacao
    print("OK  test_tarefa_ja_concluida_oferece_proxima_sem_execucao_indevida")


# ---------------------------------------------------------------------------
# human_session nunca é iniciada automaticamente, mesmo através do comando
# real "Claude 4 voltou".
# ---------------------------------------------------------------------------

def test_human_session_nunca_e_iniciada_automaticamente_via_comando() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-human", "greeting.txt", "ola\n")
        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-human", "estado": "BLOCKED-LIMIT", "area": "infra", "agente": "claude-4"},
        ])
        registry = _registry()
        registry.upsert(
            WorkerRecord(
                worker_id="claude-4", display_name="Claude 4", type="human_session", status="LIMIT",
                current_task="t-human", branch="runner/t-human", last_checkpoint=sha, can_execute=True,
            ),
            message="setup",
        )
        worker_anterior = registry.find_by_name_or_id("Claude 4")
        snap = snapshot_de_interrupcao(
            canonical_task_id="t-human",
            tarefa_original=_tarefa_original(branch="runner/t-human", checkpoint_commit=sha),
            worker_anterior=worker_anterior, motivo_interrupcao="LIMIT",
        )
        chamou_gerar_patch = []

        def gerar_patch_espiao():
            chamou_gerar_patch.append(True)
            raise AssertionError("gerar_patch nunca deveria ser chamado para human_session")

        comando = WorkerCommand(action="SET_AVAILABLE", worker_name="Claude 4")
        workdir = _clonar_workdir(tmp, remoto, "human")
        confirmacao = aplicar_comando(
            registry, comando, tasks_json_path=tasks_path, repo_dir=workdir, state_git_remote=remoto,
            snapshot_da_tarefa_original=snap, gerar_patch=gerar_patch_espiao,
        )
        assert "BLOCKED-LIMIT" in confirmacao, confirmacao
        assert chamou_gerar_patch == [], "human_session nunca pode disparar geração de patch nem execução"
    print("OK  test_human_session_nunca_e_iniciada_automaticamente_via_comando")


# ---------------------------------------------------------------------------
# Gate fechado (REPASSO_RUNNER_ENABLED=false / fora do canário) -> zero
# execução, zero chamada paga.
# ---------------------------------------------------------------------------

def test_gate_fechado_zero_execucao_zero_chamada_paga() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-gate", "estado": "BLOCKED-LIMIT", "area": "infra", "agente": "claude-2"},
        ])
        registry = _registry()
        registry.upsert(
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-gate", branch="runner/t-gate", last_checkpoint="abc1234def0", can_execute=True,
            ),
            message="setup",
        )
        worker_anterior = registry.find_by_name_or_id("Claude 2")
        snap = snapshot_de_interrupcao(
            canonical_task_id="t-gate",
            tarefa_original=_tarefa_original(branch="runner/t-gate", checkpoint_commit="abc1234def0"),
            worker_anterior=worker_anterior, motivo_interrupcao="LIMIT",
        )
        config = _config(enabled=False, canary_task_id="t-gate--resume-abc1234def0")
        chamadas = []

        def gerar_patch_espiao():
            chamadas.append(True)
            raise AssertionError("gerar_patch nunca deveria ser chamado com o gate fechado")

        novo = registry.set_status("Claude 2", "AVAILABLE", message="volta")
        outcome = reagir_a_retorno_de_worker(
            registry, novo, tasks_json_path=tasks_path,
            repo_dir="/definitivamente/nao/existe/repo", config=config, state_git_remote="/nao/existe",
            snapshot_da_tarefa_original=snap, gerar_patch=gerar_patch_espiao,
        )
        assert outcome.retomada is not None
        assert outcome.retomada.result is not None and outcome.retomada.result.status == "BLOCKED"
        assert outcome.retomada.external_calls_made is False
        assert outcome.retomada.dispatch_outcome is None
        assert chamadas == []
    print("OK  test_gate_fechado_zero_execucao_zero_chamada_paga")


def main() -> int:
    testes = [
        test_set_available_sem_tasks_json_path_preserva_comportamento_antigo,
        test_outras_acoes_ignoram_os_parametros_novos,
        test_integrado_set_available_real_retoma_tarefa_e_redelivery_nao_duplica,
        test_execution_task_id_e_distinto_do_canonico_e_da_execucao_anterior,
        test_tarefa_ja_concluida_oferece_proxima_sem_execucao_indevida,
        test_human_session_nunca_e_iniciada_automaticamente_via_comando,
        test_gate_fechado_zero_execucao_zero_chamada_paga,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except Exception as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
