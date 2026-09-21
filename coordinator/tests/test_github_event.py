"""O workflow consegue construir o payload de um evento real controlado
(prova exigida pela auditoria do PR #97, bloqueador 1) — reescrito na 3ª
auditoria para cobrir os bloqueadores 1, 2, 5 e 6:

- PR_NEEDS_AUDIT agora vem de workflow_run + pr_info (nunca de um payload
  pull_request bruto — esse gatilho foi removido por segurança);
- issue_comment de ator não confiável não constrói evento nenhum;
- audit_pack real (não None) chega no GUARD_STATE_CHANGE quando fornecido;
- dedup_fields do Guard usa conclusion, nunca run_id.
"""

from __future__ import annotations

import sys

from . import _pathsetup  # noqa: F401
from coordinator.events import EventType
from coordinator.github_event import build_event_from_github_context

REPO = "Repassomed/Repasso-Med-Site-"


def test_workflow_run_success_with_needs_audit_label_builds_pr_event() -> None:
    payload = {
        "action": "completed",
        "workflow_run": {
            "name": "Repasso Guard",
            "conclusion": "success",
            "id": 12345,
            "pull_requests": [{"number": 97}],
        },
    }
    pr_info = {
        "number": 97,
        "title": "Repasso Coordinator V2",
        "body": "## ESCOPO\n\n- **Tarefa:** infra-x\n- **Área:** infraestrutura\n",
        "labels": ["NEEDS-AUDIT"],
        "updated_at": "2026-09-21T00:00:00Z",
    }
    ev = build_event_from_github_context("workflow_run", payload, REPO, pr_info=pr_info)
    assert ev is not None
    assert ev.event_type is EventType.PR_NEEDS_AUDIT
    assert ev.identity == "pr:97"
    assert ev.payload["area"] == "infraestrutura"
    assert ev.is_allowed
    print("OK  test_workflow_run_success_with_needs_audit_label_builds_pr_event")


def test_workflow_run_success_without_label_builds_guard_state_change() -> None:
    """Guard passou, mas a PR ainda não tem o rótulo NEEDS-AUDIT — não é o
    momento de "PR pronta para auditar", só uma mudança de estado do Guard."""
    payload = {
        "action": "completed",
        "workflow_run": {
            "name": "Repasso Guard",
            "conclusion": "success",
            "id": 12345,
            "pull_requests": [{"number": 97}],
        },
    }
    pr_info = {"number": 97, "title": "x", "body": "", "labels": ["bug"], "updated_at": "x"}
    ev = build_event_from_github_context("workflow_run", payload, REPO, pr_info=pr_info)
    assert ev is not None
    assert ev.event_type is EventType.GUARD_STATE_CHANGE
    print("OK  test_workflow_run_success_without_label_builds_guard_state_change")


def test_workflow_run_carries_real_audit_pack_not_none() -> None:
    """Bloqueador 5: o audit_pack real (baixado do artifact do run) chega
    no payload do evento — não mais sempre None."""
    payload = {
        "action": "completed",
        "workflow_run": {
            "name": "Repasso Guard",
            "conclusion": "failure",
            "id": 1,
            "pull_requests": [{"number": 97}],
        },
    }
    audit_pack = {"versao": 1, "resultado": "REPROVADO", "achados": [
        {"check": "segredos", "severity": "HARD FAIL", "message": "x", "where": "", "detail": {}}
    ]}
    ev = build_event_from_github_context("workflow_run", payload, REPO, audit_pack=audit_pack)
    assert ev is not None
    assert ev.payload["audit_pack"] == audit_pack
    assert ev.payload["audit_pack"] is not None
    print("OK  test_workflow_run_carries_real_audit_pack_not_none")


def test_workflow_run_dedup_uses_conclusion_never_run_id() -> None:
    """Bloqueador 6: dois runs consecutivos com a MESMA conclusão têm que
    produzir a MESMA dedup_key, mesmo com run_id diferente — vermelho->
    vermelho e verde->verde são duplicata; só a mudança de conclusão é
    evento novo."""
    base_run = {"name": "Repasso Guard", "pull_requests": [{"number": 97}]}

    verde_1 = build_event_from_github_context(
        "workflow_run", {"action": "completed", "workflow_run": {**base_run, "conclusion": "success", "id": 1}}, REPO,
    )
    verde_2 = build_event_from_github_context(
        "workflow_run", {"action": "completed", "workflow_run": {**base_run, "conclusion": "success", "id": 2}}, REPO,
    )
    vermelho = build_event_from_github_context(
        "workflow_run", {"action": "completed", "workflow_run": {**base_run, "conclusion": "failure", "id": 3}}, REPO,
    )

    assert verde_1.dedup_key() == verde_2.dedup_key(), "verde->verde com run_id diferente tem que colidir (duplicata)"
    assert verde_1.dedup_key() != vermelho.dedup_key(), "vermelho->verde tem que ser um evento novo"
    print("OK  test_workflow_run_dedup_uses_conclusion_never_run_id")


def test_issue_comment_on_inbox_from_trusted_actor_builds_inbox_event() -> None:
    payload = {
        "action": "created",
        "issue": {"number": 88},
        "comment": {"id": 555, "body": "Entraram questões novas de Farmacología II. Prioridade alta.",
                    "user": {"login": "Repassomed"}},
    }
    ev = build_event_from_github_context("issue_comment", payload, REPO)
    assert ev is not None
    assert ev.event_type is EventType.INBOX_COMMENT
    assert ev.identity == "issue:88#comment:555"
    assert "Farmacología" in ev.payload["body"]
    print("OK  test_issue_comment_on_inbox_from_trusted_actor_builds_inbox_event")


def test_issue_comment_from_untrusted_actor_is_rejected() -> None:
    """Bloqueador 2 da 3ª auditoria: ator não confiável => zero evento,
    mesmo que o texto do comentário seja idêntico a um caso válido."""
    payload = {
        "action": "created",
        "issue": {"number": 88},
        "comment": {"id": 999, "body": "Entraram questões novas de Farmacología II.",
                    "user": {"login": "um-estranho-qualquer"}},
    }
    assert build_event_from_github_context("issue_comment", payload, REPO) is None
    print("OK  test_issue_comment_from_untrusted_actor_is_rejected")


def test_issue_comment_with_no_user_field_is_rejected() -> None:
    """Payload malformado/sem autor não pode virar evento por omissão segura."""
    payload = {"action": "created", "issue": {"number": 88}, "comment": {"id": 1, "body": "x"}}
    assert build_event_from_github_context("issue_comment", payload, REPO) is None
    print("OK  test_issue_comment_with_no_user_field_is_rejected")


def test_issue_comment_with_checkpoint_blocked_limit_from_trusted_actor() -> None:
    corpo_checkpoint = (
        "MATÉRIA/ÁREA: Ortopedia\n"
        "TAREFA: -\n"
        "ESTADO:            BLOCKED-LIMIT\n"
        "AGENTE: Claude 3\n"
    )
    payload = {
        "action": "created",
        "issue": {"number": 67},
        "comment": {"id": 777, "body": corpo_checkpoint, "user": {"login": "Repassomed"}},
    }
    ev = build_event_from_github_context("issue_comment", payload, REPO)
    assert ev is not None
    assert ev.event_type is EventType.CHECKPOINT_BLOCKED_LIMIT
    print("OK  test_issue_comment_with_checkpoint_blocked_limit_from_trusted_actor")


def test_issue_comment_unrelated_is_ignored() -> None:
    payload = {
        "action": "created",
        "issue": {"number": 42},
        "comment": {"id": 1, "body": "Comentário qualquer sem checkpoint.", "user": {"login": "Repassomed"}},
    }
    assert build_event_from_github_context("issue_comment", payload, REPO) is None
    print("OK  test_issue_comment_unrelated_is_ignored")


def test_workflow_run_other_workflow_is_ignored() -> None:
    payload = {"action": "completed", "workflow_run": {"name": "Outro Workflow", "conclusion": "success"}}
    assert build_event_from_github_context("workflow_run", payload, REPO) is None
    print("OK  test_workflow_run_other_workflow_is_ignored")


def test_pull_request_event_name_is_no_longer_recognized() -> None:
    """Bloqueador 1: o construtor de pull_request foi removido de propósito
    — este workflow não confia mais em código/gatilho de PR para segredo.
    Mesmo um payload bem formado não produz evento nenhum."""
    payload = {
        "action": "labeled",
        "label": {"name": "NEEDS-AUDIT"},
        "pull_request": {"number": 97, "title": "x", "body": ""},
    }
    assert build_event_from_github_context("pull_request", payload, REPO) is None
    print("OK  test_pull_request_event_name_is_no_longer_recognized")


def test_unknown_event_name_returns_none() -> None:
    assert build_event_from_github_context("push", {"anything": True}, REPO) is None
    print("OK  test_unknown_event_name_returns_none")


def main() -> int:
    testes = [
        test_workflow_run_success_with_needs_audit_label_builds_pr_event,
        test_workflow_run_success_without_label_builds_guard_state_change,
        test_workflow_run_carries_real_audit_pack_not_none,
        test_workflow_run_dedup_uses_conclusion_never_run_id,
        test_issue_comment_on_inbox_from_trusted_actor_builds_inbox_event,
        test_issue_comment_from_untrusted_actor_is_rejected,
        test_issue_comment_with_no_user_field_is_rejected,
        test_issue_comment_with_checkpoint_blocked_limit_from_trusted_actor,
        test_issue_comment_unrelated_is_ignored,
        test_workflow_run_other_workflow_is_ignored,
        test_pull_request_event_name_is_no_longer_recognized,
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
