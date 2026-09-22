"""Testes de ``coordinator/handoff_exec.py`` — Issue #105, Fase E
(``#105-E · Handoff real``).

Mesma técnica de ``test_runner_dispatch.py``/``test_git_state.py``: git de
verdade (não simulado) contra um repositório "remoto" local para o
``HandoffClaimStore``/``runner_dispatch.RunnerClaimStore`` (idempotência/
concorrência), e ``worker_ops.InMemoryWorkerStateStore`` para o Worker
Registry (rápido, sem I/O de rede).

Mesma decisão operacional de José já registrada em
``test_runner_contract.py``/``test_heartbeat.py``/``test_runner_dispatch.py``:
deliberadamente NÃO registrado em ``coordinator/tests/run_all.py`` nesta
rodada — roda standalone via ``python3 -m coordinator.tests.test_handoff_exec``.

Inclui as correções da 1ª auditoria independente do PR #115 (H1-H3):
H1 (checkpoint sintaticamente válido mas inexistente -> bloqueado), H2
(duas tarefas DIFERENTES disputando o mesmo worker -> só uma reserva
vence) e H3 (transição/checkpoint novo permite um handoff seguinte
legítimo da mesma tarefa; a RunnerTask de continuação nunca colide com o
claim permanente de uma execução anterior do Runner Dispatch).

Inclui também as correções da 2ª auditoria independente do PR #115
(H4-H5): H4 (o compare-and-set agora também exige checkpoint/branch
FRESCOS do worker anterior — um heartbeat mais novo bloqueia a
transição, sem sobrescrever o checkpoint novo) e H5 (a chave de
idempotência do claim agora inclui o RECEPTOR — perder a corrida do CAS
para um receptor não impede mais tentar outro receptor disponível).

Por isso, a partir desta rodada, todo ``worker_anterior`` construído nos
testes precisa ter ``last_checkpoint`` já IGUAL ao ``checkpoint_commit``
passado para ``executar_handoff`` — representa "o checkpoint que a
decisão já capturou no snapshot", que o CAS revalida contra o estado
FRESCO antes de consumir a transição.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import threading
from dataclasses import replace

from . import _pathsetup  # noqa: F401
from coordinator.classify import Priority
from coordinator.git_state import GitJsonStore
from coordinator.handoff_exec import (
    DEFAULT_HANDOFF_STATE_BRANCH,
    HandoffClaimStore,
    HandoffSource,
    checkpoint_e_seguro,
    derivar_task_id_de_continuacao,
    executar_handoff,
)
from coordinator.runner_dispatch import DEFAULT_RUNNER_STATE_BRANCH, RunnerClaimStore, RunnerDispatchConfig
from coordinator.runner_dispatch import executar_tarefa as runner_executar_tarefa
from coordinator.scheduler import TaskRecord
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord

_ACEITA_TUDO = lambda commit, branch: True  # noqa: E731 - fake de teste, "checkpoint sempre existe"


def _criar_remoto_local(tmp: str) -> str:
    """Mesmo padrão de ``test_git_state._criar_remoto_local``/
    ``test_runner_dispatch._criar_remoto_local``."""
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para os testes de handoff_exec\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    return remoto


def _claim_store(remoto: str) -> HandoffClaimStore:
    return HandoffClaimStore(GitJsonStore(remoto, branch=DEFAULT_HANDOFF_STATE_BRANCH))


def _worker(worker_id: str, display_name: str, tipo: str, status: str, **overrides) -> WorkerRecord:
    campos = dict(
        worker_id=worker_id, display_name=display_name, type=tipo, status=status,
        capabilities=(), current_task=None, branch=None, commit=None, last_checkpoint=None,
        progress=None, last_heartbeat=None, can_execute=True, can_audit=False,
    )
    campos.update(overrides)
    return WorkerRecord(**campos)


def _tarefa(**overrides) -> TaskRecord:
    campos = dict(
        id="t1", estado="BLOCKED-LIMIT", area="infraestrutura", agente="Claude 1",
        arquivos=("coordinator/x.py",), dependencias=(),
        prioridade_declarada=Priority.P1, capabilities_required=(),
    )
    campos.update(overrides)
    return TaskRecord(**campos)


def _source(**overrides) -> HandoffSource:
    campos = dict(
        branch="infra/t1", allowed_files=("coordinator/x.py",),
        risk_level="BAIXO", policy_level="C", jose_authorized=False,
        capabilities_required=("codigo",),
    )
    campos.update(overrides)
    return HandoffSource(**campos)


def _registry(workers: list[WorkerRecord]) -> OperationalWorkerRegistry:
    return OperationalWorkerRegistry(InMemoryWorkerStateStore({"workers": [w.to_dict() for w in workers]}))


# ---------------------------------------------------------------------------
# 1. P1 + LIMIT + checkpoint válido + worker compatível disponível -> HANDOFF.
# ---------------------------------------------------------------------------

def test_p1_limit_checkpoint_valid_worker_available_produces_handoff() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )

        assert resultado.action == "HANDOFF_EXECUTED", resultado.reason
        assert resultado.new_worker_type == "api_runner"
        assert resultado.runner_task is not None
        # H3: o task_id da RunnerTask de continuação é DERIVADO, nunca a
        # tarefa canônica diretamente (evita colisão com o claim
        # permanente do Runner Dispatch — ver testes de H3 abaixo).
        assert resultado.runner_task.task_id == derivar_task_id_de_continuacao("t1", "abc1234")

        final_anterior = registry.find_by_name_or_id("claude-1")
        final_novo = registry.find_by_name_or_id("runner-1")
        assert final_anterior is not None and final_anterior.current_task is None
        assert final_novo is not None and final_novo.current_task == "t1"
        assert final_novo.status == "BUSY"
    print("OK  test_p1_limit_checkpoint_valid_worker_available_produces_handoff")


# ---------------------------------------------------------------------------
# 2. P3 equivalente -> WAIT quando política determinar.
# ---------------------------------------------------------------------------

def test_p3_prefers_wait() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t3", last_checkpoint="abc1234",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa(id="t3", prioridade_declarada=Priority.P3)

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )

        assert resultado.action == "WAIT", resultado.reason
        assert registry.find_by_name_or_id("claude-1").current_task == "t3"
        assert registry.find_by_name_or_id("runner-1").current_task is None
    print("OK  test_p3_prefers_wait")


# ---------------------------------------------------------------------------
# 3. Nenhum worker disponível -> POOL_PAUSED.
# ---------------------------------------------------------------------------

def test_no_worker_available_returns_pool_paused() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        outro = _worker("claude-2", "Claude 2", "human_session", "OFFLINE")
        workers = [anterior, outro]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )

        assert resultado.action == "POOL_PAUSED", resultado.reason
        assert registry.find_by_name_or_id("claude-1").current_task == "t1"
    print("OK  test_no_worker_available_returns_pool_paused")


# ---------------------------------------------------------------------------
# 4. Worker incompatível não recebe a tarefa.
# ---------------------------------------------------------------------------

def test_incompatible_worker_not_selected() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("conteudo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        # área "infraestrutura" exige capability "codigo" (scheduler._AREA_TO_CAPABILITY)
        tarefa = _tarefa(area="infraestrutura")

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )

        assert resultado.action == "WAIT", resultado.reason
        assert registry.find_by_name_or_id("runner-1").current_task is None
    print("OK  test_incompatible_worker_not_selected")


# ---------------------------------------------------------------------------
# 5. Dois workers tentando assumir a MESMA continuação -> somente um vence.
# ---------------------------------------------------------------------------

def test_concurrent_handoff_same_task_only_one_wins() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        barreira = threading.Barrier(2)
        resultados: dict[str, object] = {}
        erros: list[BaseException] = []

        def corredor(nome: str) -> None:
            try:
                barreira.wait(timeout=10)
                resultados[nome] = executar_handoff(
                    tarefa, worker_anterior=anterior, workers=workers, registry=registry,
                    claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
                    verificar_checkpoint=_ACEITA_TUDO,
                )
            except BaseException as e:
                erros.append(e)

        t1 = threading.Thread(target=corredor, args=("A",))
        t2 = threading.Thread(target=corredor, args=("B",))
        t1.start()
        t2.start()
        t1.join(timeout=60)
        t2.join(timeout=60)

        assert not erros, f"corredor(es) lançaram exceção: {erros}"
        assert set(resultados) == {"A", "B"}
        vencedores = [n for n, r in resultados.items() if r.action == "HANDOFF_EXECUTED"]
        assert len(vencedores) == 1, f"exatamente 1 execução devia vencer, obtive {vencedores}"
        perdedor = next(n for n in resultados if n not in vencedores)
        assert resultados[perdedor].action == "BLOCKED"

        assert registry.find_by_name_or_id("runner-1").current_task == "t1"
    print("OK  test_concurrent_handoff_same_task_only_one_wins")


# ---------------------------------------------------------------------------
# 6. Handoff repetido/idempotente (MESMA transição) não cria segunda execução.
# ---------------------------------------------------------------------------

def test_repeated_handoff_is_idempotent() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        primeiro = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert primeiro.action == "HANDOFF_EXECUTED"

        # MESMA tarefa, MESMO worker_anterior, MESMO checkpoint -> mesma
        # transição -> segunda chamada é bloqueada (H3: idempotência é por
        # transição, não por tarefa eterna).
        segundo = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert segundo.action == "BLOCKED"
        assert "já foi reivindicada" in segundo.reason

        # nenhuma segunda continuação: o registro do novo worker continua
        # exatamente como a PRIMEIRA execução deixou, nunca duplicado/reset.
        assert registry.find_by_name_or_id("runner-1").current_task == "t1"
    print("OK  test_repeated_handoff_is_idempotent")


# ---------------------------------------------------------------------------
# 7. checkpoint_commit preservado.
# ---------------------------------------------------------------------------

def test_checkpoint_commit_preserved() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="deadbee",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="deadbee",
            verificar_checkpoint=_ACEITA_TUDO,
        )

        assert resultado.checkpoint_commit == "deadbee"
        assert resultado.runner_task.checkpoint_commit == "deadbee"
        assert registry.find_by_name_or_id("runner-1").last_checkpoint == "deadbee"
    print("OK  test_checkpoint_commit_preserved")


# ---------------------------------------------------------------------------
# 8. allowed_files não aumenta.
# ---------------------------------------------------------------------------

def test_allowed_files_never_widened() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        # a tarefa DECLARATIVA lista mais arquivos do que a fonte segura
        # explicitamente autoriza — a continuação nunca pode herdar o extra.
        tarefa = _tarefa(arquivos=("coordinator/x.py", "coordinator/outro.py"))
        source = _source(allowed_files=("coordinator/x.py",))

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=source, checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )

        assert resultado.action == "HANDOFF_EXECUTED"
        assert resultado.runner_task.allowed_files == ("coordinator/x.py",)
        assert "coordinator/outro.py" not in resultado.runner_task.allowed_files
    print("OK  test_allowed_files_never_widened")


# ---------------------------------------------------------------------------
# 9. Tentativa de handoff sem checkpoint SINTATICAMENTE seguro -> bloqueada.
# ---------------------------------------------------------------------------

def test_handoff_without_safe_checkpoint_is_blocked() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        assert checkpoint_e_seguro(None) is False
        assert checkpoint_e_seguro("") is False
        assert checkpoint_e_seguro("HEAD") is False
        assert checkpoint_e_seguro("latest") is False
        assert checkpoint_e_seguro("abc1234") is True

        for invalido in (None, "", "HEAD", "latest"):
            resultado = executar_handoff(
                tarefa, worker_anterior=anterior, workers=workers, registry=registry,
                claim_store=_claim_store(remoto), source=_source(), checkpoint_commit=invalido,
                verificar_checkpoint=_ACEITA_TUDO,
            )
            assert resultado.action == "WAIT", (invalido, resultado.reason)

        # a claim NUNCA foi consumida pelas tentativas inseguras — uma
        # tentativa com checkpoint válido depois ainda funciona normalmente.
        resultado_valido = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert resultado_valido.action == "HANDOFF_EXECUTED"
    print("OK  test_handoff_without_safe_checkpoint_is_blocked")


# ---------------------------------------------------------------------------
# 9-H1. Checkpoint SINTATICAMENTE válido mas INEXISTENTE -> bloqueada
# (achado H1 da auditoria independente do PR #115).
# ---------------------------------------------------------------------------

def test_checkpoint_syntactically_valid_but_nonexistent_is_blocked() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="deadbee",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        chamadas: list[tuple[str, str]] = []

        def verificador_sempre_nega(commit: str, branch: str) -> bool:
            chamadas.append((commit, branch))
            return False

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="deadbee",
            verificar_checkpoint=verificador_sempre_nega,
        )

        assert resultado.action == "WAIT", resultado.reason
        assert chamadas == [("deadbee", "infra/t1")], "verificar_checkpoint precisa receber commit+branch"
        assert registry.find_by_name_or_id("claude-1").current_task == "t1", "zero mutação — claim nunca consumida"
        assert registry.find_by_name_or_id("runner-1").current_task is None

        # a claim NUNCA foi consumida pela tentativa com checkpoint
        # inexistente — uma tentativa depois, com o MESMO checkpoint mas
        # um verificador que confirma existência, ainda funciona normalmente.
        resultado_valido = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="deadbee",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert resultado_valido.action == "HANDOFF_EXECUTED"
    print("OK  test_checkpoint_syntactically_valid_but_nonexistent_is_blocked")


# ---------------------------------------------------------------------------
# H2. Duas tarefas DIFERENTES disputando o mesmo worker novo -> só uma
# reserva vence (achado H2 da auditoria independente do PR #115).
#
# Determinístico por construção (nunca dependente de timing de thread):
# as duas decisões partem do MESMO snapshot ANTIGO de `workers` (exatamente
# o cenário descrito pela auditoria — "tarefa A e tarefa B leem Runner 1 =
# AVAILABLE"); a segunda chamada só descobre, na leitura FRESCA do
# compare-and-set, que o worker já foi reservado pela primeira.
# ---------------------------------------------------------------------------

def test_two_different_tasks_racing_for_same_worker_only_one_wins() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior_a = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="task-a", last_checkpoint="aaaaaaa",
        )
        anterior_b = _worker(
            "claude-2", "Claude 2", "human_session", "LIMIT", current_task="task-b", last_checkpoint="bbbbbbb",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers_snapshot_antigo = [anterior_a, anterior_b, novo]
        registry = _registry(workers_snapshot_antigo)

        tarefa_a = _tarefa(id="task-a", agente="Claude 1")
        tarefa_b = _tarefa(id="task-b", agente="Claude 2")

        resultado_a = executar_handoff(
            tarefa_a, worker_anterior=anterior_a, workers=workers_snapshot_antigo, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="aaaaaaa",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        resultado_b = executar_handoff(
            tarefa_b, worker_anterior=anterior_b, workers=workers_snapshot_antigo, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="bbbbbbb",
            verificar_checkpoint=_ACEITA_TUDO,
        )

        vencedores = [r for r in (resultado_a, resultado_b) if r.action == "HANDOFF_EXECUTED"]
        perdedores = [r for r in (resultado_a, resultado_b) if r.action == "BLOCKED"]
        assert len(vencedores) == 1, (resultado_a, resultado_b)
        assert len(perdedores) == 1, (resultado_a, resultado_b)
        assert "mudou de estado" in perdedores[0].reason

        final_novo = registry.find_by_name_or_id("runner-1")
        # exatamente uma das duas tarefas terminou dona do worker — nunca
        # as duas, nunca nenhuma, nunca a última escrita "ganhando" às ciegas.
        assert final_novo.current_task in ("task-a", "task-b")
        assert final_novo.status == "BUSY"
    print("OK  test_two_different_tasks_racing_for_same_worker_only_one_wins")


# ---------------------------------------------------------------------------
# H2 (concorrência REAL). Mesmo cenário acima, mas com as duas chamadas
# disparadas em threads simultâneas (threading.Barrier) — prova que o
# lock adicionado a InMemoryWorkerStateStore.conditional_update (achado
# H2 da 2ª auditoria independente do PR #115) realmente serializa
# leitura+avaliação+escrita sob concorrência de verdade, não só sob a
# ordem determinística de chamada do teste anterior.
# ---------------------------------------------------------------------------

def test_two_different_tasks_racing_for_same_worker_concurrently_only_one_wins() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior_a = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="task-a", last_checkpoint="aaaaaaa",
        )
        anterior_b = _worker(
            "claude-2", "Claude 2", "human_session", "LIMIT", current_task="task-b", last_checkpoint="bbbbbbb",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers_snapshot_antigo = [anterior_a, anterior_b, novo]
        registry = _registry(workers_snapshot_antigo)

        tarefa_a = _tarefa(id="task-a", agente="Claude 1")
        tarefa_b = _tarefa(id="task-b", agente="Claude 2")

        barreira = threading.Barrier(2)
        resultados: dict[str, object] = {}
        erros: list[BaseException] = []

        def corredor(nome: str, tarefa, worker_anterior, checkpoint: str) -> None:
            try:
                barreira.wait(timeout=10)  # força as duas decisões/escritas a competir de verdade
                resultados[nome] = executar_handoff(
                    tarefa, worker_anterior=worker_anterior, workers=workers_snapshot_antigo, registry=registry,
                    claim_store=_claim_store(remoto), source=_source(), checkpoint_commit=checkpoint,
                    verificar_checkpoint=_ACEITA_TUDO,
                )
            except BaseException as e:
                erros.append(e)

        t1 = threading.Thread(target=corredor, args=("A", tarefa_a, anterior_a, "aaaaaaa"))
        t2 = threading.Thread(target=corredor, args=("B", tarefa_b, anterior_b, "bbbbbbb"))
        t1.start()
        t2.start()
        t1.join(timeout=60)
        t2.join(timeout=60)

        assert not erros, f"corredor(es) lançaram exceção: {erros}"
        assert set(resultados) == {"A", "B"}
        vencedores = [n for n, r in resultados.items() if r.action == "HANDOFF_EXECUTED"]
        perdedores = [n for n, r in resultados.items() if r.action == "BLOCKED"]
        assert len(vencedores) == 1, f"exatamente 1 execução devia vencer, obtive: {resultados}"
        assert len(perdedores) == 1, f"exatamente 1 execução devia ser bloqueada, obtive: {resultados}"

        final_novo = registry.find_by_name_or_id("runner-1")
        # nunca as duas tarefas donas do worker ao mesmo tempo, nunca
        # nenhuma, mesmo sob concorrência real de threads.
        assert final_novo.current_task in ("task-a", "task-b")
        assert final_novo.status == "BUSY"
    print("OK  test_two_different_tasks_racing_for_same_worker_concurrently_only_one_wins")


# ---------------------------------------------------------------------------
# H3 (1/2). Novo checkpoint/novo dono da MESMA tarefa -> handoff seguinte
# permitido (transição nova, chave diferente).
# ---------------------------------------------------------------------------

def test_new_checkpoint_and_new_owner_allows_a_new_handoff_of_the_same_task() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        claude1 = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="aaaaaaa",
        )
        claude2 = _worker("claude-2", "Claude 2", "human_session", "AVAILABLE", capabilities=("codigo",))
        # claude-3 já precisa existir no registro operacional desde o início
        # (todo worker real já está cadastrado via default_seed_workers()/
        # worker_commands.py) — só ainda não é candidato disponível na
        # primeira decisão porque não está no snapshot `workers` passado a
        # ela, não porque o REGISTRO em si não o conhece.
        claude3 = _worker("claude-3", "Claude 3", "human_session", "AVAILABLE", capabilities=("codigo",))
        registry = _registry([claude1, claude2, claude3])
        tarefa = _tarefa(agente="Claude 1")

        primeiro = executar_handoff(
            tarefa, worker_anterior=claude1, workers=[claude1, claude2], registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="aaaaaaa",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert primeiro.action == "HANDOFF_EXECUTED", primeiro.reason
        assert primeiro.new_worker_id == "claude-2"

        # Claude 2 (agora dono, reserva registrada pelo handoff acima)
        # continua trabalhando, publica um checkpoint novo via heartbeat
        # e só depois chega no próprio limite — heartbeat externo simulado.
        claude2_no_limite = replace(
            registry.find_by_name_or_id("claude-2"), status="LIMIT", last_checkpoint="bbbbbbb",
        )
        registry.upsert(claude2_no_limite, message="heartbeat simulado: claude-2 -> LIMIT, checkpoint bbbbbbb")
        tarefa_mesma_id_novo_dono = _tarefa(agente="Claude 2")  # mesma tarefa (id="t1"), dono agora é Claude 2

        segundo = executar_handoff(
            tarefa_mesma_id_novo_dono, worker_anterior=claude2_no_limite,
            workers=[claude2_no_limite, claude3], registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="bbbbbbb",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        # H3: checkpoint/dono anterior diferentes -> chave de transição
        # diferente -> NUNCA bloqueado pela transição antiga (claude-1 ->
        # claude-2 em "aaaaaaa"), mesmo sendo literalmente a mesma tarefa.
        assert segundo.action == "HANDOFF_EXECUTED", segundo.reason
        assert segundo.new_worker_id == "claude-3"
    print("OK  test_new_checkpoint_and_new_owner_allows_a_new_handoff_of_the_same_task")


# ---------------------------------------------------------------------------
# H3 (2/2). A RunnerTask de continuação NUNCA colide com o claim
# permanente de uma execução ANTERIOR do Runner Dispatch (Fase D) para a
# mesma tarefa canônica.
# ---------------------------------------------------------------------------

def test_continuation_runner_task_id_never_collides_with_previous_runner_dispatch_claim() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="aaaaaaa",
        )
        runner1 = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        # runner-2 já precisa existir no registro operacional desde o início
        # (mesma razão do teste anterior) — só entra no snapshot de decisão
        # da segunda chamada, não é criado "do nada" na hora do compare-
        # and-set.
        runner2 = _worker("runner-2", "Runner 2", "api_runner", "AVAILABLE", capabilities=("codigo",))
        registry = _registry([anterior, runner1, runner2])
        tarefa = _tarefa()

        primeiro = executar_handoff(
            tarefa, worker_anterior=anterior, workers=[anterior, runner1], registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="aaaaaaa",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert primeiro.action == "HANDOFF_EXECUTED"
        primeira_runner_task = primeiro.runner_task
        assert primeira_runner_task is not None

        # Simula o Runner Dispatch (Fase D) já tendo reivindicado a
        # PRIMEIRA RunnerTask de continuação (mesmo remoto/branch de
        # estado que o CLI real usaria) — mesmo que a execução real
        # tenha terminado BLOCKED-LIMIT de novo.
        claim_store_runner = RunnerClaimStore(GitJsonStore(remoto, branch=DEFAULT_RUNNER_STATE_BRANCH))
        assert claim_store_runner.claim(primeira_runner_task.task_id) is True

        # Runner 1 continua trabalhando, publica um checkpoint novo via
        # heartbeat e só depois chega no limite outra vez -> handoff
        # seguinte para Runner 2, checkpoint NOVO.
        runner1_no_limite = replace(
            registry.find_by_name_or_id("runner-1"), status="LIMIT", last_checkpoint="bbbbbbb",
        )
        registry.upsert(runner1_no_limite, message="heartbeat simulado: runner-1 -> LIMIT, checkpoint bbbbbbb")
        tarefa_novo_dono = _tarefa(agente="Runner 1")

        segundo = executar_handoff(
            tarefa_novo_dono, worker_anterior=runner1_no_limite, workers=[runner1_no_limite, runner2],
            registry=registry, claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="bbbbbbb",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert segundo.action == "HANDOFF_EXECUTED", segundo.reason
        segunda_runner_task = segundo.runner_task
        assert segunda_runner_task is not None
        # H3: task_id DISTINTO da primeira continuação -> o Runner
        # Dispatch consegue reivindicá-la sem ser rejeitada como "já
        # reivindicada" pelo claim permanente da tentativa anterior.
        assert segunda_runner_task.task_id != primeira_runner_task.task_id
        assert claim_store_runner.claim(segunda_runner_task.task_id) is True
    print("OK  test_continuation_runner_task_id_never_collides_with_previous_runner_dispatch_claim")


# ---------------------------------------------------------------------------
# H4. Heartbeat FRESCO com checkpoint mais novo, chegando entre o
# snapshot da decisão e o CAS, bloqueia a transição stale e preserva o
# checkpoint novo (achado H4 da 2ª auditoria independente do PR #115).
# ---------------------------------------------------------------------------

def test_stale_snapshot_checkpoint_blocked_by_fresh_heartbeat() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior_snapshot_a = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT",
            current_task="t1", last_checkpoint="aaaaaaa",
        )
        novo = _worker("claude-2", "Claude 2", "human_session", "AVAILABLE", capabilities=("codigo",))
        registry = _registry([anterior_snapshot_a, novo])
        tarefa = _tarefa()

        # Heartbeat FRESCO chega DEPOIS do snapshot que gerou a decisão
        # mas ANTES do CAS — publica um checkpoint mais novo (B) para o
        # MESMO worker/tarefa (current_task não mudou).
        heartbeat_fresco = replace(anterior_snapshot_a, last_checkpoint="bbbbbbb")
        registry.upsert(heartbeat_fresco, message="heartbeat fresco: bbbbbbb")

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior_snapshot_a, workers=[anterior_snapshot_a, novo], registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="aaaaaaa",
            verificar_checkpoint=_ACEITA_TUDO,
        )

        assert resultado.action == "BLOCKED", resultado.reason
        final_anterior = registry.find_by_name_or_id("claude-1")
        # o bbbbbbb mais novo continua intacto — NUNCA sobrescrito
        # por uma transição stale baseada em aaaaaaa.
        assert final_anterior.last_checkpoint == "bbbbbbb"
        assert final_anterior.current_task == "t1", "nunca liberado por uma transição que não venceu o CAS"
        final_novo = registry.find_by_name_or_id("claude-2")
        assert final_novo.current_task is None
    print("OK  test_stale_snapshot_checkpoint_blocked_by_fresh_heartbeat")


# ---------------------------------------------------------------------------
# H5. Receptor perde a corrida do CAS (ficou ocupado nesse meio-tempo) ->
# a mesma tarefa/checkpoint ainda pode ser tentada com outro receptor
# disponível, sem colidir com o claim antigo (achado H5 da 2ª auditoria
# independente do PR #115).
# ---------------------------------------------------------------------------

def test_losing_receiver_can_be_retried_with_a_different_worker() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT",
            current_task="t1", last_checkpoint="aaaaaaa",
        )
        runner1 = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        runner2 = _worker("runner-2", "Runner 2", "api_runner", "AVAILABLE", capabilities=("codigo",))
        registry = _registry([anterior, runner1, runner2])
        tarefa = _tarefa()

        # runner-1 é ocupado por OUTRA tarefa entre a decisão (snapshot,
        # onde ele ainda aparece AVAILABLE) e a escrita — força o CAS do
        # primeiro handoff a perder.
        runner1_ocupado = replace(runner1, status="BUSY", current_task="outra-tarefa")
        registry.upsert(runner1_ocupado, message="runner-1 ocupado por outra tarefa")

        primeira_tentativa = executar_handoff(
            tarefa, worker_anterior=anterior, workers=[anterior, runner1], registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="aaaaaaa",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert primeira_tentativa.action == "BLOCKED", primeira_tentativa.reason
        assert registry.find_by_name_or_id("claude-1").current_task == "t1", "claude-1 continua dono, nada mudou"

        # nova avaliação (o scheduler reprocessaria a fila) escolhe
        # runner-2, ainda disponível — a MESMA tarefa/checkpoint precisa
        # poder ser transferida a ele, nunca bloqueada pelo claim antigo
        # de runner-1 (H5 — chave de transição agora inclui o receptor).
        segunda_tentativa = executar_handoff(
            tarefa, worker_anterior=anterior, workers=[anterior, runner2], registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="aaaaaaa",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert segunda_tentativa.action == "HANDOFF_EXECUTED", segunda_tentativa.reason
        assert segunda_tentativa.new_worker_id == "runner-2"

        # repetir EXATAMENTE tarefa/checkpoint/receptor (runner-2) continua
        # idempotente — mesma garantia de H3, agora também por receptor.
        terceira_tentativa = executar_handoff(
            tarefa, worker_anterior=anterior, workers=[anterior, runner2], registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="aaaaaaa",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert terceira_tentativa.action == "BLOCKED"
        assert "já foi reivindicada" in terceira_tentativa.reason
    print("OK  test_losing_receiver_can_be_retried_with_a_different_worker")


# ---------------------------------------------------------------------------
# 10. Worker anterior não permanece simultaneamente como executor ativo.
# ---------------------------------------------------------------------------

def test_previous_worker_released_not_left_active() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert resultado.action == "HANDOFF_EXECUTED"

        final_anterior = registry.find_by_name_or_id("claude-1")
        assert final_anterior.current_task is None, "worker anterior não pode continuar 'dono' da tarefa"
        # status nunca é inventado/forçado por este módulo — continua LIMIT,
        # exatamente o que o heartbeat mais recente já tinha reportado.
        assert final_anterior.status == "LIMIT"
    print("OK  test_previous_worker_released_not_left_active")


# ---------------------------------------------------------------------------
# 11. human_session não é iniciada automaticamente — mas também não fica
# "livre" para receber outra oferta enquanto já existe uma reserva
# (observação da auditoria independente do PR #115, junto de H2/H3).
# ---------------------------------------------------------------------------

def test_human_session_never_started_automatically() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        novo = _worker("claude-2", "Claude 2", "human_session", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )

        assert resultado.action == "HANDOFF_EXECUTED"
        assert resultado.new_worker_type == "human_session"
        assert resultado.runner_task is None
        assert resultado.human_instruction is not None and resultado.human_instruction.strip()
        assert resultado.human_instruction.strip().lower() not in ("continue", "continua", "continuar")

        final_novo = registry.find_by_name_or_id("claude-2")
        # nunca marcar BUSY sozinho — só um heartbeat/comando real inicia.
        assert final_novo.status == "AVAILABLE", "nunca inventar BUSY — a sessão humana não foi iniciada"
        # mas TAMBÉM não pode ficar "livre": a tarefa já foi reservada
        # para ela, então current_task precisa refletir isso (mesmo campo
        # que já exclui um worker de scheduler._candidatos_disponiveis) —
        # sem isso, o scheduler poderia oferecer OUTRA tarefa a ela
        # enquanto esta transferência ainda está pendente de início manual.
        assert final_novo.current_task == "t1", "a reserva precisa aparecer, sem fingir que ela já começou"
    print("OK  test_human_session_never_started_automatically")


# ---------------------------------------------------------------------------
# 12. api_runner só é despachado se todos os gates existentes permitirem.
# ---------------------------------------------------------------------------

def test_derived_runner_task_still_respects_runner_dispatch_gates() -> None:
    """handoff_exec.py NUNCA importa/chama runner_dispatch — a RunnerTask
    derivada precisa passar pelos MESMOS portões de sempre quando (e se)
    for de fato despachada, mais adiante, pelo mecanismo já existente."""
    caminho = os.path.join(os.path.dirname(os.path.dirname(__file__)), "handoff_exec.py")
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    # Checa a AUSÊNCIA de um import real (nunca a prosa do docstring, que
    # cita "runner_dispatch.py"/"runner_dispatch.executar_tarefa" de
    # propósito para explicar a que mecanismo já existente a RunnerTask
    # derivada será entregue mais adiante — mesma distinção que
    # test_no_forbidden_writes.py já aplica entre padrão proibido e prosa).
    for padrao in ("import runner_dispatch", "from .runner_dispatch", "from coordinator.runner_dispatch"):
        assert padrao not in conteudo, f"handoff_exec.py não deve importar runner_dispatch ({padrao!r} encontrado)"

    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker(
            "claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1", last_checkpoint="abc1234",
        )
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
            verificar_checkpoint=_ACEITA_TUDO,
        )
        assert resultado.action == "HANDOFF_EXECUTED"
        runner_task = resultado.runner_task
        assert runner_task is not None

        # portão desligado (REPASSO_RUNNER_ENABLED=false, o default de
        # produção) -> a RunnerTask derivada ainda é bloqueada, zero chamada
        # externa — a Fase E não abre nenhum atalho pelos gates da Fase D.
        config_fechado = RunnerDispatchConfig(enabled=False, mode="canary", canary_task_id=runner_task.task_id)
        outcome = runner_executar_tarefa(
            runner_task, None, config=config_fechado, repo_dir="/definitivamente/nao/existe/repo",
            state_git_remote="/definitivamente/nao/existe/remoto.git",
            gerar_patch=lambda: (_ for _ in ()).throw(AssertionError("nunca devia ser chamado")),
        )
        assert outcome.result is not None and outcome.result.status == "BLOCKED"
        assert outcome.external_calls_made is False
    print("OK  test_derived_runner_task_still_respects_runner_dispatch_gates")


# ---------------------------------------------------------------------------
# 13. Nenhuma chamada paga real nos testes / módulo (estrutural).
# ---------------------------------------------------------------------------

def test_module_makes_no_paid_api_calls() -> None:
    caminho = os.path.join(os.path.dirname(os.path.dirname(__file__)), "handoff_exec.py")
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    # Mesma distinção de import-real-vs-prosa do teste anterior — o
    # docstring cita ``anthropic_client``/``openai_*`` de propósito, ao
    # explicar que este módulo especificamente NUNCA os importa.
    for modulo in ("anthropic_client", "anthropic_transport", "openai_client", "openai_transport"):
        for padrao in (f"import {modulo}", f"from .{modulo}", f"from coordinator.{modulo}"):
            assert padrao not in conteudo, f"handoff_exec.py não deve importar {modulo!r}"
    assert "import requests" not in conteudo
    assert "urllib" not in conteudo
    print("OK  test_module_makes_no_paid_api_calls")


# ---------------------------------------------------------------------------
# 14. Nenhuma possibilidade de merge/deploy/force-push introduzida.
# ---------------------------------------------------------------------------

def test_module_has_no_merge_deploy_or_force_push_capability() -> None:
    """Mesma filosofia de ``test_no_forbidden_writes.py``: o próprio
    ``handoff_exec.py`` já está automaticamente coberto por
    ``test_source_files_have_no_forbidden_patterns`` (varre todo
    ``coordinator/*.py``, incluindo arquivos novos) — este teste apenas
    confirma, de forma redundante e específica deste módulo, que ele não
    inicia processo externo algum nem referencia force-push/merge como
    ARGUMENTO literal (nunca em prosa de docstring, que é permitida)."""
    caminho = os.path.join(os.path.dirname(os.path.dirname(__file__)), "handoff_exec.py")
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    for proibido in ("subprocess", '"--force"', "force-with-lease", "merge_pull_request", "netlify", "Netlify", "SUPABASE"):
        assert proibido not in conteudo, f"handoff_exec.py não deve conter {proibido!r}"
    print("OK  test_module_has_no_merge_deploy_or_force_push_capability")


def main() -> int:
    testes = [
        test_p1_limit_checkpoint_valid_worker_available_produces_handoff,
        test_p3_prefers_wait,
        test_no_worker_available_returns_pool_paused,
        test_incompatible_worker_not_selected,
        test_concurrent_handoff_same_task_only_one_wins,
        test_repeated_handoff_is_idempotent,
        test_checkpoint_commit_preserved,
        test_allowed_files_never_widened,
        test_handoff_without_safe_checkpoint_is_blocked,
        test_checkpoint_syntactically_valid_but_nonexistent_is_blocked,
        test_two_different_tasks_racing_for_same_worker_only_one_wins,
        test_two_different_tasks_racing_for_same_worker_concurrently_only_one_wins,
        test_new_checkpoint_and_new_owner_allows_a_new_handoff_of_the_same_task,
        test_continuation_runner_task_id_never_collides_with_previous_runner_dispatch_claim,
        test_stale_snapshot_checkpoint_blocked_by_fresh_heartbeat,
        test_losing_receiver_can_be_retried_with_a_different_worker,
        test_previous_worker_released_not_left_active,
        test_human_session_never_started_automatically,
        test_derived_runner_task_still_respects_runner_dispatch_gates,
        test_module_makes_no_paid_api_calls,
        test_module_has_no_merge_deploy_or_force_push_capability,
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
