"""Testes de ``coordinator/handoff_exec.py`` — Issue #105, Fase E
(``#105-E · Handoff real``).

Mesma técnica de ``test_runner_dispatch.py``/``test_git_state.py``: git de
verdade (não simulado) contra um repositório "remoto" local para o
``HandoffClaimStore`` (idempotência/concorrência), e
``worker_ops.InMemoryWorkerStateStore`` para o Worker Registry (rápido,
sem I/O de rede — a concorrência que importa aqui é a do claim, não a do
registry).

Mesma decisão operacional de José já registrada em
``test_runner_contract.py``/``test_heartbeat.py``/``test_runner_dispatch.py``:
deliberadamente NÃO registrado em ``coordinator/tests/run_all.py`` nesta
rodada — roda standalone via ``python3 -m coordinator.tests.test_handoff_exec``.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import threading

from . import _pathsetup  # noqa: F401
from coordinator.classify import Priority
from coordinator.git_state import GitJsonStore
from coordinator.handoff_exec import (
    DEFAULT_HANDOFF_STATE_BRANCH,
    HandoffClaimStore,
    HandoffSource,
    checkpoint_e_seguro,
    executar_handoff,
)
from coordinator.runner_dispatch import RunnerDispatchConfig
from coordinator.runner_dispatch import executar_tarefa as runner_executar_tarefa
from coordinator.scheduler import TaskRecord
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord


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
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
        )

        assert resultado.action == "HANDOFF_EXECUTED", resultado.reason
        assert resultado.new_worker_type == "api_runner"
        assert resultado.runner_task is not None
        assert resultado.runner_task.task_id == "t1"

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
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t3")
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa(id="t3", prioridade_declarada=Priority.P3)

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
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
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
        outro = _worker("claude-2", "Claude 2", "human_session", "OFFLINE")
        workers = [anterior, outro]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
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
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("conteudo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        # área "infraestrutura" exige capability "codigo" (scheduler._AREA_TO_CAPABILITY)
        tarefa = _tarefa(area="infraestrutura")

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
        )

        assert resultado.action == "WAIT", resultado.reason
        assert registry.find_by_name_or_id("runner-1").current_task is None
    print("OK  test_incompatible_worker_not_selected")


# ---------------------------------------------------------------------------
# 5. Dois workers tentando assumir a mesma continuação -> somente um vence.
# ---------------------------------------------------------------------------

def test_concurrent_handoff_same_task_only_one_wins() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
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
# 6. Handoff repetido/idempotente não cria segunda execução.
# ---------------------------------------------------------------------------

def test_repeated_handoff_is_idempotent() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        primeiro = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
        )
        assert primeiro.action == "HANDOFF_EXECUTED"

        segundo = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
        )
        assert segundo.action == "BLOCKED"
        assert "já foi reivindicado" in segundo.reason

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
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="deadbee",
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
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
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
        )

        assert resultado.action == "HANDOFF_EXECUTED"
        assert resultado.runner_task.allowed_files == ("coordinator/x.py",)
        assert "coordinator/outro.py" not in resultado.runner_task.allowed_files
    print("OK  test_allowed_files_never_widened")


# ---------------------------------------------------------------------------
# 9. Tentativa de handoff sem checkpoint seguro -> bloqueada.
# ---------------------------------------------------------------------------

def test_handoff_without_safe_checkpoint_is_blocked() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
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
            )
            assert resultado.action == "WAIT", (invalido, resultado.reason)

        # a claim NUNCA foi consumida pelas tentativas inseguras — uma
        # tentativa com checkpoint válido depois ainda funciona normalmente.
        resultado_valido = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
        )
        assert resultado_valido.action == "HANDOFF_EXECUTED"
    print("OK  test_handoff_without_safe_checkpoint_is_blocked")


# ---------------------------------------------------------------------------
# 10. Worker anterior não permanece simultaneamente como executor ativo.
# ---------------------------------------------------------------------------

def test_previous_worker_released_not_left_active() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
        )
        assert resultado.action == "HANDOFF_EXECUTED"

        final_anterior = registry.find_by_name_or_id("claude-1")
        assert final_anterior.current_task is None, "worker anterior não pode continuar 'dono' da tarefa"
        # status nunca é inventado/forçado por este módulo — continua LIMIT,
        # exatamente o que o heartbeat mais recente já tinha reportado.
        assert final_anterior.status == "LIMIT"
    print("OK  test_previous_worker_released_not_left_active")


# ---------------------------------------------------------------------------
# 11. human_session não é iniciada automaticamente.
# ---------------------------------------------------------------------------

def test_human_session_never_started_automatically() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
        novo = _worker("claude-2", "Claude 2", "human_session", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
        )

        assert resultado.action == "HANDOFF_EXECUTED"
        assert resultado.new_worker_type == "human_session"
        assert resultado.runner_task is None
        assert resultado.human_instruction is not None and resultado.human_instruction.strip()
        assert resultado.human_instruction.strip().lower() not in ("continue", "continua", "continuar")

        final_novo = registry.find_by_name_or_id("claude-2")
        assert final_novo.status == "AVAILABLE", "nunca marcar BUSY sozinho — só um heartbeat/comando real inicia"
        assert final_novo.current_task is None, "nunca fingir que a sessão humana já começou a trabalhar"
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
        anterior = _worker("claude-1", "Claude 1", "human_session", "LIMIT", current_task="t1")
        novo = _worker("runner-1", "Runner 1", "api_runner", "AVAILABLE", capabilities=("codigo",))
        workers = [anterior, novo]
        registry = _registry(workers)
        tarefa = _tarefa()

        resultado = executar_handoff(
            tarefa, worker_anterior=anterior, workers=workers, registry=registry,
            claim_store=_claim_store(remoto), source=_source(), checkpoint_commit="abc1234",
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
