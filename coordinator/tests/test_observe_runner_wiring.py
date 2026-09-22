"""Achado F6-A (Issue #105, Fase F, 5ª rodada): ``coordinator/observe.py``
de fato liga o pipeline REAL até ``runner_resume.processar_retorno_de_
worker`` quando um comando ``SET_AVAILABLE`` chega pela Inbox (#88).

Prova só a FIAÇÃO (os parâmetros novos e opcionais chegam até
``worker_commands.aplicar_comando``) — a lógica de decisão em si já é
testada exaustivamente em ``test_worker_commands.py``/
``test_runner_resume.py``, nunca duplicada aqui.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

from . import _pathsetup
from coordinator.budget import UsageLedger
from coordinator.config import ACTIVE_SUPERVISED_MODE, Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.events import Event
from coordinator.observe import observe
from coordinator.runner_dispatch import RunnerDispatchConfig
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord
from coordinator.worker_registry import Worker, WorkerState


def _workers() -> list[Worker]:
    return [Worker(name="Claude 9", state=WorkerState.FREE, specialization=("materia",))]


def _evento_comando(corpo: str, comment_id: int = 1) -> Event:
    return Event(
        raw_type="INBOX_COMMENT", source="fixture", repo="Repassomed/Repasso-Med-Site-",
        identity=f"issue:88#comment:{comment_id}",
        payload={"body": corpo, "dedup_fields": {"comment_id": comment_id}},
    )


def _escrever_tasks_json(tmp: str, tarefas: list[dict]) -> str:
    caminho = os.path.join(tmp, "tasks.json")
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump({"tarefas": tarefas}, fh)
    return caminho


def test_observe_sem_parametros_runner_preserva_comportamento_antigo() -> None:
    """Retrocompatibilidade: nenhum parâmetro runner_* fornecido ->
    aplicar_comando não recebe tasks_json_path -> comportamento idêntico
    ao de antes do achado F6-A (só o comando de status é aplicado)."""
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
            current_task="t-x", can_execute=True,
        ),
        message="setup",
    )
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE)
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        r = observe(
            _evento_comando("Claude 2 voltou"), config=cfg, dedup=Deduplicator(InMemoryStore()),
            ledger=ledger, workers=_workers(), audit_mode=True, worker_registry=registry,
        )
        assert r.status == "OBSERVED"
        assert "marcado como AVAILABLE" in r.merge_card
        # F6-C continua se aplicando (independente de F6-A): current_task
        # sempre limpo em SET_AVAILABLE.
        worker = registry.find_by_name_or_id("Claude 2")
        assert worker.status == "AVAILABLE"
        assert worker.current_task is None
        # Sem tasks_json_path, nenhuma tentativa de retomada automática
        # acontece — a confirmação não menciona retomada/próxima oferta.
        assert "Retomada automática" not in r.merge_card
        assert "Próxima oferta" not in r.merge_card
    print("OK  test_observe_sem_parametros_runner_preserva_comportamento_antigo")


def test_observe_com_parametros_runner_aciona_reacao_real() -> None:
    """Achado F6-A: com runner_tasks_json_path fornecido a observe(), o
    comando real "Claude 2 voltou" pela Inbox chega até
    processar_retorno_de_worker — aqui provado com uma tarefa canônica
    já concluída (caminho que não precisa de repo_dir/config/handoff
    persistido, mais simples de montar nesta prova de fiação)."""
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
            current_task="t-original", can_execute=True,
        ),
        message="setup",
    )
    with tempfile.TemporaryDirectory() as tmp:
        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-original", "estado": "DONE", "area": "infra", "agente": "claude-2"},
            {"id": "t-seguinte", "estado": "READY", "area": "infra", "agente": None},
        ])
        cfg = Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE)
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        r = observe(
            _evento_comando("Claude 2 voltou"), config=cfg, dedup=Deduplicator(InMemoryStore()),
            ledger=ledger, workers=_workers(), audit_mode=True, worker_registry=registry,
            runner_tasks_json_path=tasks_path,
        )
        assert r.status == "OBSERVED"
        assert "Próxima oferta da fila" in r.merge_card, r.merge_card
    print("OK  test_observe_com_parametros_runner_aciona_reacao_real")


def main() -> int:
    testes = [
        test_observe_sem_parametros_runner_preserva_comportamento_antigo,
        test_observe_com_parametros_runner_aciona_reacao_real,
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
