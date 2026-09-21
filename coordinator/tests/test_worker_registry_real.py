"""Worker Registry real, derivado de coordination/tasks.json (bloqueador 4
da 3ª auditoria do PR #97) — não mais fixture/[] no workflow real."""

from __future__ import annotations

import json
import os
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator.worker_registry import WorkerState, load_workers_from_tasks_json

_TASKS_JSON_MINIMO = {
    "agentes_conhecidos": ["Claude 1", "Claude 2", "Claude 3", "humano"],
    "tarefas": [
        {"id": "t1", "agente": "Claude 1", "estado": "NEEDS-AUDIT", "area": "materia"},
        {"id": "t2", "agente": "Claude 2", "estado": "DONE", "area": "infraestrutura"},
        {"id": "t3", "agente": "Claude 3", "estado": "BLOCKED-LIMIT", "area": "ferramentas"},
    ],
}


def _escrever_tasks_json(tmp: str, dados: dict) -> str:
    caminho = os.path.join(tmp, "tasks.json")
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump(dados, fh)
    return caminho


def test_agent_with_active_task_inherits_its_state() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, _TASKS_JSON_MINIMO)
        workers = load_workers_from_tasks_json(caminho)
    c1 = next(w for w in workers if w.name == "Claude 1")
    assert c1.state is WorkerState.NEEDS_AUDIT
    print("OK  test_agent_with_active_task_inherits_its_state")


def test_agent_with_only_done_tasks_is_free() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, _TASKS_JSON_MINIMO)
        workers = load_workers_from_tasks_json(caminho)
    c2 = next(w for w in workers if w.name == "Claude 2")
    assert c2.state is WorkerState.FREE, "só tarefas DONE => nenhuma ativa => FREE"
    print("OK  test_agent_with_only_done_tasks_is_free")


def test_agent_with_no_tasks_at_all_is_free() -> None:
    dados = {
        "agentes_conhecidos": ["Claude 1", "Claude 4"],
        "tarefas": [{"id": "t1", "agente": "Claude 1", "estado": "IN-PROGRESS", "area": None}],
    }
    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, dados)
        workers = load_workers_from_tasks_json(caminho)
    c4 = next(w for w in workers if w.name == "Claude 4")
    assert c4.state is WorkerState.FREE
    print("OK  test_agent_with_no_tasks_at_all_is_free")


def test_humano_is_never_a_worker() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, _TASKS_JSON_MINIMO)
        workers = load_workers_from_tasks_json(caminho)
    assert all(w.name != "humano" for w in workers)
    print("OK  test_humano_is_never_a_worker")


def test_blocked_limit_agent_is_never_reported_as_free() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, _TASKS_JSON_MINIMO)
        workers = load_workers_from_tasks_json(caminho)
    c3 = next(w for w in workers if w.name == "Claude 3")
    assert c3.state is WorkerState.BLOCKED_LIMIT
    assert c3.state is not WorkerState.FREE
    print("OK  test_blocked_limit_agent_is_never_reported_as_free")


def test_unknown_state_string_defaults_to_in_progress_not_free() -> None:
    """Um estado que não bate com nenhum WorkerState (ex.: READY, que
    normalmente não tem agente atribuído) nunca pode virar FREE por
    engano — o padrão seguro é tratar como ocupado."""
    dados = {
        "agentes_conhecidos": ["Claude 1"],
        "tarefas": [{"id": "t1", "agente": "Claude 1", "estado": "READY", "area": None}],
    }
    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, dados)
        workers = load_workers_from_tasks_json(caminho)
    c1 = workers[0]
    assert c1.state is WorkerState.IN_PROGRESS
    print("OK  test_unknown_state_string_defaults_to_in_progress_not_free")


def test_specialization_derived_from_agent_history() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, _TASKS_JSON_MINIMO)
        workers = load_workers_from_tasks_json(caminho)
    c2 = next(w for w in workers if w.name == "Claude 2")
    assert "infraestrutura" in c2.specialization
    print("OK  test_specialization_derived_from_agent_history")


def test_real_repo_tasks_json_loads_without_crashing() -> None:
    """Prova de integração: o coordination/tasks.json de VERDADE deste
    repositório carrega sem erro e produz pelo menos um worker por agente
    conhecido (menos 'humano')."""
    caminho_real = os.path.join(_pathsetup.REPO_ROOT, "coordination", "tasks.json")
    workers = load_workers_from_tasks_json(caminho_real)
    with open(caminho_real, encoding="utf-8") as fh:
        dados = json.load(fh)
    esperados = {a for a in dados["agentes_conhecidos"] if a != "humano"}
    assert {w.name for w in workers} == esperados
    print("OK  test_real_repo_tasks_json_loads_without_crashing")


def main() -> int:
    testes = [
        test_agent_with_active_task_inherits_its_state,
        test_agent_with_only_done_tasks_is_free,
        test_agent_with_no_tasks_at_all_is_free,
        test_humano_is_never_a_worker,
        test_blocked_limit_agent_is_never_reported_as_free,
        test_unknown_state_string_defaults_to_in_progress_not_free,
        test_specialization_derived_from_agent_history,
        test_real_repo_tasks_json_loads_without_crashing,
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
