"""Classificação (tipo A-D, prioridade P0-P4) e roteamento FAST/STANDARD/DEEP."""

from __future__ import annotations

import json
import os
import sys

from . import _pathsetup
from coordinator.classify import Priority, TaskType, classify
from coordinator.events import Event
from coordinator.models import ModelTier, resolve
from coordinator.routing import decide as route_decide


def _load(nome: str) -> Event:
    with open(os.path.join(_pathsetup.FIXTURES, nome), encoding="utf-8") as fh:
        d = json.load(fh)
    return Event(raw_type=d["raw_type"], source=d["source"], repo=d["repo"],
                 identity=d["identity"], payload=d["payload"])


def test_pr_needs_audit_materia_is_type_a_p1() -> None:
    ev = _load("event_pr_needs_audit.json")
    c = classify(ev)
    assert c.task_type is TaskType.A
    assert c.priority is Priority.P1
    assert not c.needs_input
    print("OK  test_pr_needs_audit_materia_is_type_a_p1")


def test_pr_needs_audit_infra_is_type_d() -> None:
    ev = _load("event_pr_needs_audit_infra.json")
    c = classify(ev)
    assert c.task_type is TaskType.D
    print("OK  test_pr_needs_audit_infra_is_type_d")


def test_checkpoint_blocked_limit_is_handoff_p1() -> None:
    ev = _load("event_checkpoint_blocked_limit.json")
    c = classify(ev)
    assert c.task_type is TaskType.B
    assert c.priority is Priority.P1
    print("OK  test_checkpoint_blocked_limit_is_handoff_p1")


def test_inbox_content_keyword_is_type_a() -> None:
    ev = _load("event_inbox_comment_content.json")
    c = classify(ev)
    assert c.task_type is TaskType.A
    assert c.priority is Priority.P1
    print("OK  test_inbox_content_keyword_is_type_a")


def test_inbox_materia_nova_requires_jose() -> None:
    ev = _load("event_inbox_comment_materia_nova.json")
    c = classify(ev)
    assert c.task_type is TaskType.C
    assert c.requires_jose_authorization is True
    print("OK  test_inbox_materia_nova_requires_jose")


def test_inbox_ambiguous_needs_input() -> None:
    ev = _load("event_inbox_comment_ambiguous.json")
    c = classify(ev)
    assert c.needs_input is True
    assert c.task_type is TaskType.UNKNOWN
    print("OK  test_inbox_ambiguous_needs_input")


def test_guard_failure_is_p0() -> None:
    ev = _load("event_guard_state_failure.json")
    c = classify(ev)
    assert c.priority is Priority.P0
    print("OK  test_guard_failure_is_p0")


def test_disallowed_event_type_is_unknown() -> None:
    ev = _load("event_not_allowed.json")
    assert not ev.is_allowed
    c = classify(ev)
    assert c.task_type is TaskType.UNKNOWN
    print("OK  test_disallowed_event_type_is_unknown")


def test_declared_priority_wins() -> None:
    ev = _load("event_pr_needs_audit.json")
    ev2 = Event(raw_type=ev.raw_type, source=ev.source, repo=ev.repo, identity=ev.identity,
                payload={**ev.payload, "prioridade_declarada": "P0"})
    c = classify(ev2)
    assert c.priority is Priority.P0, "José declarou P0 e isso tem que vencer o padrão (Lei #84 §1)"
    print("OK  test_declared_priority_wins")


def test_routing_guard_failure_uses_standard() -> None:
    ev = _load("event_guard_state_failure.json")
    c = classify(ev)
    r = route_decide(ev, c)
    assert r.model_choice.tier is ModelTier.STANDARD
    print("OK  test_routing_guard_failure_uses_standard")


def test_routing_guard_success_uses_fast() -> None:
    ev = _load("event_guard_state_success.json")
    c = classify(ev)
    r = route_decide(ev, c)
    assert r.model_choice.tier is ModelTier.FAST
    print("OK  test_routing_guard_success_uses_fast")


def test_routing_content_needs_semantic_audit() -> None:
    ev = _load("event_pr_needs_audit.json")
    c = classify(ev)
    r = route_decide(ev, c)
    assert r.needs_semantic_audit is True
    print("OK  test_routing_content_needs_semantic_audit")


def test_deep_disabled_by_default_downgrades_to_standard() -> None:
    escolha = resolve(ModelTier.DEEP)  # deep_enabled=False é o padrão
    assert escolha.tier is ModelTier.STANDARD
    assert escolha.deep_blocked is True
    print("OK  test_deep_disabled_by_default_downgrades_to_standard")


def test_model_ids_match_official_docs() -> None:
    from coordinator.models import MODEL_IDS

    # Confirmado ao vivo em platform.claude.com/docs/en/models/overview
    # (bloqueador 3 da auditoria do PR #97) — Haiku 4.5 usa o snapshot
    # pinado como "Claude API ID"; claude-haiku-4-5 é o alias, não errado,
    # mas não é a forma canônica que a doc lista primeiro.
    assert MODEL_IDS[ModelTier.FAST] == "claude-haiku-4-5-20251001"
    assert MODEL_IDS[ModelTier.STANDARD] == "claude-sonnet-5"
    assert MODEL_IDS[ModelTier.DEEP] == "claude-opus-5"
    print("OK  test_model_ids_match_official_docs (confirmados ao vivo em platform.claude.com)")


def main() -> int:
    testes = [
        test_pr_needs_audit_materia_is_type_a_p1,
        test_pr_needs_audit_infra_is_type_d,
        test_checkpoint_blocked_limit_is_handoff_p1,
        test_inbox_content_keyword_is_type_a,
        test_inbox_materia_nova_requires_jose,
        test_inbox_ambiguous_needs_input,
        test_guard_failure_is_p0,
        test_disallowed_event_type_is_unknown,
        test_declared_priority_wins,
        test_routing_guard_failure_uses_standard,
        test_routing_guard_success_uses_fast,
        test_routing_content_needs_semantic_audit,
        test_deep_disabled_by_default_downgrades_to_standard,
        test_model_ids_match_official_docs,
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
