"""O workflow consegue construir o payload de um evento real controlado
(prova exigida pela auditoria do PR #97, bloqueador 1).

Usa payloads no MESMO formato que o GitHub Actions entrega em
``$GITHUB_EVENT_PATH`` para cada um dos 3 gatilhos configurados em
``.github/workflows/coordinator-observe.yml`` — encurtados ao que
``coordinator.github_event`` de fato lê, não o payload completo do GitHub
(que tem centenas de campos irrelevantes aqui).
"""

from __future__ import annotations

import sys

from . import _pathsetup  # noqa: F401
from coordinator.events import EventType
from coordinator.github_event import build_event_from_github_context

REPO = "Repassomed/Repasso-Med-Site-"


def test_pull_request_labeled_needs_audit_builds_pr_event() -> None:
    payload = {
        "action": "labeled",
        "label": {"name": "NEEDS-AUDIT"},
        "pull_request": {
            "number": 97,
            "title": "Repasso Coordinator V2",
            "body": "## ESCOPO\n\n- **Tarefa:** infra-x\n- **Área:** infraestrutura\n",
            "updated_at": "2026-09-21T00:00:00Z",
        },
    }
    ev = build_event_from_github_context("pull_request", payload, REPO)
    assert ev is not None
    assert ev.event_type is EventType.PR_NEEDS_AUDIT
    assert ev.identity == "pr:97"
    assert ev.payload["area"] == "infraestrutura"
    assert ev.is_allowed
    print("OK  test_pull_request_labeled_needs_audit_builds_pr_event")


def test_pull_request_other_label_is_ignored() -> None:
    payload = {"action": "labeled", "label": {"name": "bug"}, "pull_request": {"number": 1, "body": ""}}
    assert build_event_from_github_context("pull_request", payload, REPO) is None
    print("OK  test_pull_request_other_label_is_ignored")


def test_issue_comment_on_inbox_builds_inbox_event() -> None:
    payload = {
        "action": "created",
        "issue": {"number": 88},
        "comment": {"id": 555, "body": "Entraram questões novas de Farmacología II. Prioridade alta."},
    }
    ev = build_event_from_github_context("issue_comment", payload, REPO)
    assert ev is not None
    assert ev.event_type is EventType.INBOX_COMMENT
    assert ev.identity == "issue:88#comment:555"
    assert "Farmacología" in ev.payload["body"]
    print("OK  test_issue_comment_on_inbox_builds_inbox_event")


def test_issue_comment_with_checkpoint_blocked_limit_builds_checkpoint_event() -> None:
    corpo_checkpoint = (
        "MATÉRIA/ÁREA: Ortopedia\n"
        "TAREFA: -\n"
        "ESTADO:            BLOCKED-LIMIT\n"
        "AGENTE: Claude 3\n"
    )
    payload = {
        "action": "created",
        "issue": {"number": 67},
        "comment": {"id": 777, "body": corpo_checkpoint},
    }
    ev = build_event_from_github_context("issue_comment", payload, REPO)
    assert ev is not None
    assert ev.event_type is EventType.CHECKPOINT_BLOCKED_LIMIT
    print("OK  test_issue_comment_with_checkpoint_blocked_limit_builds_checkpoint_event")


def test_issue_comment_unrelated_is_ignored() -> None:
    payload = {
        "action": "created",
        "issue": {"number": 42},
        "comment": {"id": 1, "body": "Comentário qualquer sem checkpoint."},
    }
    assert build_event_from_github_context("issue_comment", payload, REPO) is None
    print("OK  test_issue_comment_unrelated_is_ignored")


def test_workflow_run_guard_completed_builds_guard_event() -> None:
    payload = {
        "action": "completed",
        "workflow_run": {
            "name": "Repasso Guard",
            "conclusion": "failure",
            "id": 12345,
            "pull_requests": [{"number": 97}],
        },
    }
    ev = build_event_from_github_context("workflow_run", payload, REPO)
    assert ev is not None
    assert ev.event_type is EventType.GUARD_STATE_CHANGE
    assert ev.payload["guard_state"] == "failure"
    assert ev.identity == "pr:97"
    print("OK  test_workflow_run_guard_completed_builds_guard_event")


def test_workflow_run_other_workflow_is_ignored() -> None:
    payload = {"action": "completed", "workflow_run": {"name": "Outro Workflow", "conclusion": "success"}}
    assert build_event_from_github_context("workflow_run", payload, REPO) is None
    print("OK  test_workflow_run_other_workflow_is_ignored")


def test_unknown_event_name_returns_none() -> None:
    assert build_event_from_github_context("push", {"anything": True}, REPO) is None
    print("OK  test_unknown_event_name_returns_none")


def main() -> int:
    testes = [
        test_pull_request_labeled_needs_audit_builds_pr_event,
        test_pull_request_other_label_is_ignored,
        test_issue_comment_on_inbox_builds_inbox_event,
        test_issue_comment_with_checkpoint_blocked_limit_builds_checkpoint_event,
        test_issue_comment_unrelated_is_ignored,
        test_workflow_run_guard_completed_builds_guard_event,
        test_workflow_run_other_workflow_is_ignored,
        test_unknown_event_name_returns_none,
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
