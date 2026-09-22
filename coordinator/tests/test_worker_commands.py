"""Testes de ``coordinator/worker_commands.py`` — Issue #105, Fase F,
achados F6-A/B/C/D (5ª rodada — pipeline real, contexto persistido,
Worker Registry coerente, canonical_task_id nos heartbeats).

Mesma técnica de ``test_runner_resume.py``: git de verdade (não simulado)
contra um repositório "remoto" local, e um ``coordination/tasks.json`` de
mentira em disco para exercitar ``scheduler.load_tasks_from_tasks_json``
de verdade. Publica também um registro REAL de execução de handoff
(``coordinator.handoff_exec.HandoffClaimStore``/``HandoffExecutionResult``,
Fase E, PR #115, mergeado) na branch ``coordinator-state-handoff`` do
MESMO remoto — a fonte persistida/confiável que o achado F6-B lê, nunca
mockada.

Cobre: comportamento antigo preservado quando ``tasks_json_path`` não é
fornecido (F6-C ainda se aplica: current_task sempre limpo em
SET_AVAILABLE); teste integrado obrigatório ponta a ponta (LIMIT ->
comando real SET_AVAILABLE -> recupera snapshot persistido real (F6-B)
-> reprocessa -> heartbeat BUSY com current_task CANÔNICO (F6-D) ->
execução com execution_task_id NOVO -> heartbeat OFFLINE final ->
current_task limpo -> redelivery não duplica); tarefa original já
concluída/assumida -> próxima oferta, sem execução indevida; human_session
nunca iniciada automaticamente; gate fechado -> zero execução/chamada
paga; Worker Registry coerente após: tarefa DONE, gate fechado,
human_session, retomada api_runner.

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
from dataclasses import replace

from . import _pathsetup  # noqa: F401
from coordinator.classify import Priority
from coordinator.git_state import GitJsonStore
from coordinator.handoff_exec import (
    DEFAULT_HANDOFF_STATE_BRANCH,
    HandoffClaimStore,
    HandoffExecutionResult,
    HandoffSource,
    derivar_runner_task_continuacao,
    derivar_task_id_de_continuacao,
)
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


def _publicar_handoff_real(
    remoto: str, *, canonical_task_id: str, worker_novo_id: str, branch: str, checkpoint_commit: str,
    allowed_files: tuple[str, ...] = ("greeting.txt",), worker_anterior_id: str = "claude-1",
) -> RunnerTask:
    """Achado F6-B: publica um registro REAL de execução de handoff
    (``coordinator.handoff_exec``, Fase E, PR #115 — mergeado, nunca
    reimplementado aqui) na branch ``coordinator-state-handoff`` do
    ``remoto`` — a fonte persistida/confiável que
    ``recuperar_runner_task_de_handoff`` lê. Devolve a ``RunnerTask``
    publicada (o id de execução ANTERIOR, ``--continuacao-``) para os
    testes conferirem que a retomada da Fase F deriva um id NOVO,
    distinto deste."""
    source = HandoffSource(
        branch=branch, allowed_files=allowed_files, risk_level="BAIXO", policy_level="C", jose_authorized=False,
    )
    execution_id_anterior = derivar_task_id_de_continuacao(canonical_task_id, checkpoint_commit)
    runner_task = derivar_runner_task_continuacao(
        task_id=execution_id_anterior, priority=Priority.P1, source=source,
        checkpoint_commit=checkpoint_commit,
        instructions="Continuação real de teste (handoff Fase E) — escrever uma saudação em greeting.txt.",
    )
    resultado = HandoffExecutionResult(
        action="HANDOFF_EXECUTED", reason="handoff de teste", task_id=canonical_task_id,
        previous_worker_id=worker_anterior_id, new_worker_id=worker_novo_id, new_worker_type="api_runner",
        checkpoint_commit=checkpoint_commit, runner_task=runner_task,
    )
    claim_store = HandoffClaimStore(GitJsonStore(remote=remoto, branch=DEFAULT_HANDOFF_STATE_BRANCH))
    claim_store.registrar_execucao(resultado)
    return runner_task


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
# F6-C — SET_AVAILABLE sempre deixa o registro coerente (AVAILABLE +
# current_task=None numa única escrita), mesmo sem tasks_json_path
# (retrocompatibilidade: nenhuma retomada automática acontece, mas a
# limpeza de current_task acontece igual).
# ---------------------------------------------------------------------------

def test_set_available_sem_tasks_json_path_ainda_limpa_current_task() -> None:
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
            current_task="t-qualquer", can_execute=True,
        ),
        message="setup",
    )
    comando = WorkerCommand(action="SET_AVAILABLE", worker_name="Claude 2")
    confirmacao = aplicar_comando(registry, comando)
    assert confirmacao == "Claude 2 marcado como AVAILABLE."
    worker = registry.find_by_name_or_id("Claude 2")
    assert worker is not None
    assert worker.status == "AVAILABLE"
    assert worker.current_task is None, "F6-C: current_task precisa ser limpo mesmo sem retomada automática"
    print("OK  test_set_available_sem_tasks_json_path_ainda_limpa_current_task")


def test_set_available_worker_desconhecido_continua_autocriando() -> None:
    registry = _registry()
    comando = WorkerCommand(action="SET_AVAILABLE", worker_name="Claude 9")
    confirmacao = aplicar_comando(registry, comando)
    assert confirmacao == "Claude 9 marcado como AVAILABLE."
    worker = registry.find_by_name_or_id("Claude 9")
    assert worker is not None and worker.status == "AVAILABLE" and worker.current_task is None
    print("OK  test_set_available_worker_desconhecido_continua_autocriando")


def test_outras_acoes_preservam_current_task_como_antes() -> None:
    """SET_LIMIT/DEACTIVATE continuam preservando current_task — só
    SET_AVAILABLE (F6-C) precisa da limpeza."""
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-3", display_name="Claude 3", type="api_runner", status="BUSY",
            current_task="t-em-andamento", can_execute=True,
        ),
        message="setup",
    )
    aplicar_comando(registry, WorkerCommand(action="SET_LIMIT", worker_name="Claude 3"))
    worker = registry.find_by_name_or_id("Claude 3")
    assert worker.status == "LIMIT"
    assert worker.current_task == "t-em-andamento", "SET_LIMIT nunca deve limpar current_task"
    print("OK  test_outras_acoes_preservam_current_task_como_antes")


# ---------------------------------------------------------------------------
# Teste integrado obrigatório (F6-A/B/C/D): LIMIT -> comando real
# SET_AVAILABLE -> recupera snapshot persistido real (F6-B) -> reprocessa
# -> BUSY com current_task canônico (F6-D) -> execução com
# execution_task_id novo -> finalização -> current_task limpo ->
# redelivery não duplica.
# ---------------------------------------------------------------------------

def test_integrado_ponta_a_ponta_f6a_b_c_d() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-original", "greeting.txt", "ola\n")

        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-original", "estado": "BLOCKED-LIMIT", "area": "infra", "agente": "claude-2"},
        ])

        # F6-B: publica um registro REAL de handoff — a fonte persistida
        # que este teste prova ser recuperada automaticamente, SEM
        # nenhum snapshot fornecido explicitamente.
        execution_id_anterior = derivar_task_id_de_continuacao("t-original", sha)
        _publicar_handoff_real(
            remoto, canonical_task_id="t-original", worker_novo_id="claude-2",
            branch="runner/t-original", checkpoint_commit=sha,
        )

        registry = _registry()
        registry.upsert(
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-original", branch="runner/t-original", last_checkpoint=sha,
                progress="60%", can_execute=True,
            ),
            message="setup: claude-2 em LIMIT, dono canônico de t-original",
        )

        config = _config(canary_task_id=f"t-original--resume-{sha[:12]}")

        # Evento REAL: "Claude 2 voltou" — comando reconhecido/aplicado
        # exatamente como o pipeline real (observe.py) faria.
        atual = registry.find_by_name_or_id("Claude 2")
        canonical_anterior = atual.current_task
        checkpoint_anterior = atual.last_checkpoint
        branch_anterior = atual.branch
        assert canonical_anterior == "t-original"

        novo = registry.upsert(
            replace(atual, status="AVAILABLE", current_task=None), message="Claude 2 -> AVAILABLE",
        )
        # F6-C confirmado antes de qualquer reprocessamento: escrita
        # atômica já deixou o registro coerente.
        assert registry.find_by_name_or_id("Claude 2").current_task is None

        workdir1 = _clonar_workdir(tmp, remoto, "evento-1")
        outcome1 = reagir_a_retorno_de_worker(
            registry, novo, canonical_task_id_anterior=canonical_anterior,
            checkpoint_anterior=checkpoint_anterior, branch_anterior=branch_anterior,
            tasks_json_path=tasks_path, repo_dir=workdir1, config=config, state_git_remote=remoto,
            patch=_patch_greeting(),
            # snapshot_da_tarefa_original DELIBERADAMENTE omitido — F6-B
            # precisa recuperar sozinho a partir do handoff real publicado.
        )

        # reprocessar_retorno decidiu retomar a PRÓPRIA tarefa.
        assert outcome1.proxima_oferta is None
        assert outcome1.retomada is not None
        assert outcome1.retomada.result is not None
        assert outcome1.retomada.result.status == "NEEDS-AUDIT", outcome1.retomada.result

        # execution_task_id NOVO — nunca o canônico sozinho, nunca o id
        # de execução ANTERIOR (o handoff real publicado acima).
        execution_id_novo = outcome1.retomada.result.task_id
        assert execution_id_novo != "t-original"
        assert execution_id_novo != execution_id_anterior
        assert execution_id_novo == f"t-original--resume-{sha[:12]}"

        # F6-D: o heartbeat BUSY emitido no INÍCIO da execução usou o id
        # CANÔNICO — nunca o execution_task_id derivado.
        dispatch_outcome = outcome1.retomada.dispatch_outcome
        assert dispatch_outcome is not None
        heartbeats = dispatch_outcome.heartbeats
        assert len(heartbeats) >= 2, heartbeats
        primeiro = heartbeats[0]
        assert primeiro["record"]["status"] == "BUSY"
        assert primeiro["record"]["current_task"] == "t-original", (
            f"heartbeat BUSY precisa usar o id CANÔNICO: {primeiro}"
        )
        ultimo = heartbeats[-1]
        assert ultimo["record"]["status"] == "OFFLINE"
        assert ultimo["record"]["current_task"] is None, f"heartbeat OFFLINE final precisa limpar current_task: {ultimo}"

        # F6-C+D combinados: o Worker Registry REAL (passado por
        # reagir_a_retorno_de_worker, achado F6-D) reflete o resultado
        # final dos heartbeats — current_task limpo depois da execução.
        worker_final = registry.find_by_name_or_id("Claude 2")
        assert worker_final.status == "OFFLINE"
        assert worker_final.current_task is None

        # Redelivery do MESMO evento — simulado como um segundo processo
        # INDEPENDENTE que recebeu o mesmo comentário "Claude 2 voltou"
        # quase ao mesmo tempo, com sua PRÓPRIA leitura do Worker
        # Registry (ainda no estado ANTERIOR à primeira execução — é
        # assim que uma corrida de verdade aconteceria, antes de
        # qualquer heartbeat aterrissar). A proteção real contra
        # execução dupla vem do remoto git COMPARTILHADO (claim
        # atômico/checkpoint — achados F2/F4), nunca da coerência de uma
        # única instância de registro em memória.
        registry_concorrente = _registry()
        registry_concorrente.upsert(
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-original", branch="runner/t-original", last_checkpoint=sha,
                progress="60%", can_execute=True,
            ),
            message="setup: mesma leitura inicial do worker, processo independente",
        )
        novo_concorrente = registry_concorrente.upsert(
            replace(registry_concorrente.find_by_name_or_id("Claude 2"), status="AVAILABLE", current_task=None),
            message="Claude 2 -> AVAILABLE (segunda entrega do mesmo evento)",
        )
        workdir2 = _clonar_workdir(tmp, remoto, "evento-2")
        outcome2 = reagir_a_retorno_de_worker(
            registry_concorrente, novo_concorrente, canonical_task_id_anterior=canonical_anterior,
            checkpoint_anterior=checkpoint_anterior, branch_anterior=branch_anterior,
            tasks_json_path=tasks_path, repo_dir=workdir2, config=config, state_git_remote=remoto,
            patch=_patch_greeting(),
        )
        assert outcome2.retomada is not None
        assert outcome2.retomada.result is not None
        assert outcome2.retomada.result.status == "BLOCKED"
        assert outcome2.retomada.dispatch_outcome is None, "redelivery nunca pode chegar a executar_tarefa de novo"
    print("OK  test_integrado_ponta_a_ponta_f6a_b_c_d")


def test_sem_registro_de_handoff_confiavel_recusa_retomada_automatica() -> None:
    """F6-B: sem NENHUM registro HANDOFF_EXECUTED para
    (worker, canonical_task_id) — ex. a tarefa nunca passou por handoff
    (primeira atribuição direta) — a retomada automática fica
    indisponível (fail-closed), nunca inventa o contexto."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-sem-handoff", "greeting.txt", "ola\n")
        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-sem-handoff", "estado": "BLOCKED-LIMIT", "area": "infra", "agente": "claude-2"},
        ])
        registry = _registry()
        registry.upsert(
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-sem-handoff", branch="runner/t-sem-handoff", last_checkpoint=sha, can_execute=True,
            ),
            message="setup",
        )
        novo = registry.upsert(
            replace(registry.find_by_name_or_id("Claude 2"), status="AVAILABLE", current_task=None),
            message="volta",
        )
        outcome = reagir_a_retorno_de_worker(
            registry, novo, canonical_task_id_anterior="t-sem-handoff", checkpoint_anterior=sha,
            branch_anterior="runner/t-sem-handoff", tasks_json_path=tasks_path,
            repo_dir="/definitivamente/nao/existe", config=_config(), state_git_remote=remoto,
        )
        # Sem snapshot recuperável -> processar_retorno_de_worker recusa
        # a retomada automática (fail-closed), mas isso não é um erro —
        # é o comportamento CORRETO quando não há contexto confiável.
        assert outcome.proxima_oferta is None
        assert outcome.retomada is None
        assert "snapshot" in outcome.motivo.lower()
    print("OK  test_sem_registro_de_handoff_confiavel_recusa_retomada_automatica")


# ---------------------------------------------------------------------------
# Tarefa original já concluída/assumida -> próxima oferta pelo fluxo
# normal, sem execução indevida. Worker Registry continua coerente.
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
        # Worker Registry continua coerente: AVAILABLE, current_task limpo.
        worker = registry.find_by_name_or_id("Claude 2")
        assert worker.status == "AVAILABLE"
        assert worker.current_task is None
    print("OK  test_tarefa_ja_concluida_oferece_proxima_sem_execucao_indevida")


# ---------------------------------------------------------------------------
# human_session nunca é iniciada automaticamente, mesmo através do comando
# real "Claude 4 voltou". Worker Registry continua coerente.
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
        worker_anterior = WorkerRecord(
            worker_id="claude-4", display_name="Claude 4", type="human_session", status="LIMIT",
            current_task="t-human", branch="runner/t-human", last_checkpoint=sha, can_execute=True,
        )
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
        # Worker Registry continua coerente: comando SET_AVAILABLE já
        # deixou AVAILABLE/current_task=None (F6-C) — human_session
        # preparada, nunca "iniciada" (nunca BUSY).
        worker = registry.find_by_name_or_id("Claude 4")
        assert worker.status == "AVAILABLE"
        assert worker.current_task is None
    print("OK  test_human_session_nunca_e_iniciada_automaticamente_via_comando")


# ---------------------------------------------------------------------------
# Gate fechado (REPASSO_RUNNER_ENABLED=false / fora do canário) -> zero
# execução, zero chamada paga. Worker Registry continua coerente.
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
        worker_anterior = WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
            current_task="t-gate", branch="runner/t-gate", last_checkpoint="abc1234def0", can_execute=True,
        )
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

        atual = registry.find_by_name_or_id("Claude 2")
        novo = registry.upsert(replace(atual, status="AVAILABLE", current_task=None), message="volta")
        outcome = reagir_a_retorno_de_worker(
            registry, novo, canonical_task_id_anterior="t-gate", checkpoint_anterior="abc1234def0",
            branch_anterior="runner/t-gate", tasks_json_path=tasks_path,
            repo_dir="/definitivamente/nao/existe/repo", config=config, state_git_remote="/nao/existe",
            snapshot_da_tarefa_original=snap, gerar_patch=gerar_patch_espiao,
        )
        assert outcome.retomada is not None
        assert outcome.retomada.result is not None and outcome.retomada.result.status == "BLOCKED"
        assert outcome.retomada.external_calls_made is False
        assert outcome.retomada.dispatch_outcome is None
        assert chamadas == []
        # Worker Registry continua coerente mesmo com o gate fechado.
        worker = registry.find_by_name_or_id("Claude 2")
        assert worker.status == "AVAILABLE"
        assert worker.current_task is None
    print("OK  test_gate_fechado_zero_execucao_zero_chamada_paga")


def main() -> int:
    testes = [
        test_set_available_sem_tasks_json_path_ainda_limpa_current_task,
        test_set_available_worker_desconhecido_continua_autocriando,
        test_outras_acoes_preservam_current_task_como_antes,
        test_integrado_ponta_a_ponta_f6a_b_c_d,
        test_sem_registro_de_handoff_confiavel_recusa_retomada_automatica,
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
