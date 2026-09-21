"""Pipeline OBSERVE de ponta a ponta — as provas centrais da Issue #95.

Cobre, com o pipeline real (não só peças isoladas):
    - ENABLED=false => 0 chamadas externas;
    - evento duplicado => 0 chamada nova (status DUPLICATE);
    - evento não permitido => 0 chamada (status REJECTED);
    - MODE != observe => bloqueado mesmo com ENABLED=true;
    - a saída contém tipo, prioridade, worker/modelo sugeridos e próxima ação.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

from . import _pathsetup
from coordinator.budget import UsageLedger
from coordinator.config import Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.events import Event
from coordinator.observe import observe
from coordinator.worker_registry import Worker, WorkerState


def _load(nome: str) -> Event:
    with open(os.path.join(_pathsetup.FIXTURES, nome), encoding="utf-8") as fh:
        d = json.load(fh)
    return Event(raw_type=d["raw_type"], source=d["source"], repo=d["repo"],
                 identity=d["identity"], payload=d["payload"])


def _workers() -> list[Worker]:
    with open(os.path.join(_pathsetup.FIXTURES, "workers.json"), encoding="utf-8") as fh:
        d = json.load(fh)
    return [Worker(name=w["name"], state=WorkerState(w["state"]),
                    specialization=tuple(w.get("specialization", [])))
            for w in d["workers"]]


def _fresh_ledger(tmp: str) -> UsageLedger:
    return UsageLedger(os.path.join(tmp, "usage.json"))


def test_disabled_config_blocks_every_allowed_event() -> None:
    cfg = Config(enabled=False, mode="observe")
    with tempfile.TemporaryDirectory() as tmp:
        for fixture in (
            "event_pr_needs_audit.json",
            "event_checkpoint_blocked_limit.json",
            "event_inbox_comment_content.json",
            "event_guard_state_failure.json",
        ):
            ev = _load(fixture)
            r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                        ledger=_fresh_ledger(tmp), workers=_workers())
            assert r.status == "BLOCKED", f"{fixture}: esperava BLOCKED, obtido {r.status}"
            assert r.call_attempted is False
    print("OK  test_disabled_config_blocks_every_allowed_event")


def test_duplicate_event_yields_zero_new_calls() -> None:
    cfg = Config(enabled=False, mode="observe")  # nesta V2 sempre desligado
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = _fresh_ledger(tmp)
        ev = _load("event_pr_needs_audit.json")

        primeiro = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=_workers())
        assert primeiro.status == "BLOCKED"  # processado (mesmo que bloqueado) e marcado

        segundo = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=_workers())
        assert segundo.status == "DUPLICATE", f"esperava DUPLICATE na segunda vez, obtido {segundo.status}"
        assert segundo.call_attempted is False
    print("OK  test_duplicate_event_yields_zero_new_calls")


def test_disallowed_event_type_rejected() -> None:
    cfg = Config(enabled=True, mode="observe")  # mesmo com o portão "aberto"...
    with tempfile.TemporaryDirectory() as tmp:
        ev = _load("event_not_allowed.json")
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=_fresh_ledger(tmp), workers=_workers())
        assert r.status == "REJECTED", "tipo de evento não permitido tem que ser rejeitado ANTES do portão"
        assert r.call_attempted is False
    print("OK  test_disallowed_event_type_rejected")


def test_wrong_mode_blocks_even_with_enabled_true() -> None:
    cfg = Config(enabled=True, mode="execute")
    with tempfile.TemporaryDirectory() as tmp:
        ev = _load("event_pr_needs_audit.json")
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=_fresh_ledger(tmp), workers=_workers())
        assert r.status == "BLOCKED"
        assert "observe" in r.reason.lower() or "MODE" in r.reason
    print("OK  test_wrong_mode_blocks_even_with_enabled_true")


def test_output_contains_required_fields() -> None:
    cfg = Config(enabled=False, mode="observe")
    with tempfile.TemporaryDirectory() as tmp:
        ev = _load("event_pr_needs_audit.json")
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=_fresh_ledger(tmp), workers=_workers())
        assert r.task_type, "faltou tipo"
        assert r.priority, "faltou prioridade"
        assert r.worker_suggestion, "faltou worker sugerido"
        assert r.model_suggestion and r.model_suggestion.get("model_id"), "faltou modelo sugerido"
        assert r.next_action, "faltou próxima ação"
    print("OK  test_output_contains_required_fields")


def test_worker_suggestion_prefers_free_and_specialization() -> None:
    cfg = Config(enabled=False, mode="observe")
    with tempfile.TemporaryDirectory() as tmp:
        ev = _load("event_pr_needs_audit_infra.json")  # area=infraestrutura
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=_fresh_ledger(tmp), workers=_workers())
        # No fixture workers.json, só "Claude 2" está FREE, e tem
        # especialização em infraestrutura — tem que ser o sugerido.
        assert r.worker_suggestion == "Claude 2"
    print("OK  test_worker_suggestion_prefers_free_and_specialization")


def test_needs_input_never_suggests_silent_execution() -> None:
    cfg = Config(enabled=False, mode="observe")
    with tempfile.TemporaryDirectory() as tmp:
        ev = _load("event_inbox_comment_ambiguous.json")
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=_fresh_ledger(tmp), workers=_workers())
        assert r.needs_input is True
        assert "NEEDS-INPUT" in r.next_action
    print("OK  test_needs_input_never_suggests_silent_execution")


def test_materia_nova_always_requires_jose() -> None:
    cfg = Config(enabled=False, mode="observe")
    with tempfile.TemporaryDirectory() as tmp:
        ev = _load("event_inbox_comment_materia_nova.json")
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=_fresh_ledger(tmp), workers=_workers())
        assert r.requires_jose_authorization is True
        assert "José" in r.next_action
    print("OK  test_materia_nova_always_requires_jose")


def main() -> int:
    testes = [
        test_disabled_config_blocks_every_allowed_event,
        test_duplicate_event_yields_zero_new_calls,
        test_disallowed_event_type_rejected,
        test_wrong_mode_blocks_even_with_enabled_true,
        test_output_contains_required_fields,
        test_worker_suggestion_prefers_free_and_specialization,
        test_needs_input_never_suggests_silent_execution,
        test_materia_nova_always_requires_jose,
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
