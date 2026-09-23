"""Tests for Error Registry V1 - Issue #130."""

from __future__ import annotations

from coordinator import error_registry
from coordinator.error_registry import ErrorEvent, ErrorRegistry
from coordinator.worker_ops import InMemoryWorkerStateStore


class FakeApi:
    def __init__(self) -> None:
        self.issues: dict[int, dict] = {}
        self.created: list[int] = []
        self.comments: list[tuple[int, str]] = []
        self.reopened: list[int] = []
        self.next_number = 700
        self.fail_create_once = False

    def find_issue(self, fingerprint: str) -> dict | None:
        marker = "repasso-error-fingerprint:" + fingerprint
        for issue in self.issues.values():
            if marker in str(issue.get("body") or ""):
                return issue
        return None

    def create_issue(self, title: str, body: str) -> dict:
        if self.fail_create_once:
            self.fail_create_once = False
            raise error_registry.GitHubErrorApiError("500 simulado")
        number = self.next_number
        self.next_number += 1
        issue = {"number": number, "title": title, "body": body, "state": "open"}
        self.issues[number] = issue
        self.created.append(number)
        return issue

    def get_issue(self, number: int) -> dict:
        return self.issues[number]

    def comment(self, number: int, body: str) -> None:
        self.comments.append((number, body))

    def reopen(self, number: int) -> None:
        self.issues[number]["state"] = "open"
        self.reopened.append(number)


def event(**overrides) -> ErrorEvent:
    base = dict(
        component="worker-bridge",
        error_type="github-pr-failed",
        title="PR automatica falhou",
        message="GitHub respondeu 403 ao criar PR da tarefa.",
        severity="HIGH",
        category="worker-bridge",
        source="claude-worker-4",
        task_id="tarefa-x",
        worker_id="claude-worker-4",
        pr_number=None,
        commit_sha="abcdef1234567890",
        run_id="123456789",
        evidence="POST /pulls -> 403",
    )
    base.update(overrides)
    return ErrorEvent(**base)


def records(store: InMemoryWorkerStateStore) -> list[dict]:
    return list(store.read().get("errors") or [])


def test_primeiro_erro_cria_uma_issue_e_estado() -> None:
    store = InMemoryWorkerStateStore()
    api = FakeApi()
    out = ErrorRegistry(store, api).register(event())
    assert out.action == "CREATED", out
    assert out.issue_number == 700
    assert api.created == [700]
    recs = records(store)
    assert len(recs) == 1
    assert recs[0]["occurrence_count"] == 1
    assert recs[0]["issue_number"] == 700
    assert recs[0]["status"] == "OPEN"
    assert "repasso-error-fingerprint:" in api.issues[700]["body"]
    print("OK  test_primeiro_erro_cria_uma_issue_e_estado")


def test_mesmo_erro_nao_duplica_issue_e_incrementa_ocorrencia() -> None:
    store = InMemoryWorkerStateStore()
    api = FakeApi()
    registry = ErrorRegistry(store, api)
    first = registry.register(event())
    second = registry.register(event())
    assert first.issue_number == second.issue_number == 700
    assert second.action == "DEDUPED"
    assert api.created == [700]
    assert api.comments == []
    assert records(store)[0]["occurrence_count"] == 2
    print("OK  test_mesmo_erro_nao_duplica_issue_e_incrementa_ocorrencia")


def test_fingerprint_remove_sha_e_ids_volateis() -> None:
    a = event(message="falhou run 123456789 no commit abcdef1234567890")
    b = event(message="falhou run 987654321 no commit fedcba9876543210")
    assert a.fingerprint == b.fingerprint
    print("OK  test_fingerprint_remove_sha_e_ids_volateis")


def test_evidencia_nova_comenta_a_mesma_issue() -> None:
    store = InMemoryWorkerStateStore()
    api = FakeApi()
    registry = ErrorRegistry(store, api)
    registry.register(event(evidence="primeira evidencia"))
    out = registry.register(event(evidence="segunda evidencia"))
    assert out.action == "UPDATED"
    assert api.created == [700]
    assert len(api.comments) == 1
    assert api.comments[0][0] == 700
    assert records(store)[0]["occurrence_count"] == 2
    print("OK  test_evidencia_nova_comenta_a_mesma_issue")


def test_issue_fechada_que_reaparece_vira_recurrent_e_reabre() -> None:
    store = InMemoryWorkerStateStore()
    api = FakeApi()
    registry = ErrorRegistry(store, api)
    registry.register(event())
    api.issues[700]["state"] = "closed"
    out = registry.register(event(evidence="voltou a acontecer"))
    assert out.action == "RECURRENT"
    assert api.reopened == [700]
    assert api.issues[700]["state"] == "open"
    assert records(store)[0]["status"] == "RECURRENT"
    assert len(api.comments) == 1
    print("OK  test_issue_fechada_que_reaparece_vira_recurrent_e_reabre")


def test_falha_ao_criar_issue_e_recuperavel_sem_duplicar() -> None:
    store = InMemoryWorkerStateStore()
    api = FakeApi()
    api.fail_create_once = True
    registry = ErrorRegistry(store, api)

    first = registry.register(event())
    assert first.action == "FAILED"
    rec = records(store)[0]
    assert rec["issue_number"] is None
    assert rec["issue_sync_status"] == "FAILED"

    second = registry.register(event())
    assert second.action == "CREATED"
    assert second.issue_number == 700
    assert api.created == [700]
    assert records(store)[0]["occurrence_count"] == 2
    print("OK  test_falha_ao_criar_issue_e_recuperavel_sem_duplicar")


def test_pending_orfao_fica_recuperavel_sem_duplicar_issue() -> None:
    store = InMemoryWorkerStateStore()
    api = FakeApi()
    registry = ErrorRegistry(store, api)

    # Simula processo que ganhou o CAS e morreu antes de sincronizar a Issue.
    ev = event()
    token = "token-antigo"
    assert registry._insert(ev, token) is True

    def tornar_stale(data: dict) -> dict:
        item = data["errors"][0]
        item["issue_sync_status"] = "PENDING"
        item["issue_sync_token"] = token
        item["issue_sync_updated_at"] = "2020-01-01T00:00:00+00:00"
        return data

    store.update(tornar_stale, message="teste: pending stale")
    out = registry.register(ev)
    assert out.action == "CREATED", out
    assert out.issue_number == 700
    assert api.created == [700]
    assert records(store)[0]["issue_sync_status"] == "SYNCED"
    print("OK  test_pending_orfao_fica_recuperavel_sem_duplicar_issue")


def test_mark_resolved_persiste_root_cause_e_reaparecimento_vira_recurrent() -> None:
    store = InMemoryWorkerStateStore()
    api = FakeApi()
    registry = ErrorRegistry(store, api)
    ev = event()
    first = registry.register(ev)
    assert first.issue_number == 700
    assert registry.mark_resolved(
        ev.fingerprint, resolution="corrigido no hotfix", root_cause="permissao ausente"
    ) is True
    rec = records(store)[0]
    assert rec["status"] == "RESOLVED"
    assert rec["resolution"] == "corrigido no hotfix"
    assert rec["root_cause"] == "permissao ausente"

    out = registry.register(event(evidence="voltou apos resolucao"))
    assert out.action == "RECURRENT"
    assert api.reopened == [700]
    assert records(store)[0]["status"] == "RECURRENT"
    print("OK  test_mark_resolved_persiste_root_cause_e_reaparecimento_vira_recurrent")


def test_segredos_sao_redigidos_antes_da_issue() -> None:
    store = InMemoryWorkerStateStore()
    api = FakeApi()
    registry = ErrorRegistry(store, api)
    secret = "sk-ant-ABCDEFGHIJKLMN123456789"
    out = registry.register(
        event(message="transport falhou com " + secret, evidence="token=" + secret)
    )
    assert out.action == "CREATED"
    body = api.issues[700]["body"]
    assert secret not in body
    assert secret not in str(store.read())
    print("OK  test_segredos_sao_redigidos_antes_da_issue")


def test_cliente_nao_tem_merge_deploy_ou_force_push() -> None:
    names = set(dir(error_registry.GitHubErrorApi))
    forbidden = {"merge", "deploy", "publish", "force_push", "close_pr"}
    assert not (names & forbidden), names & forbidden
    print("OK  test_cliente_nao_tem_merge_deploy_ou_force_push")


def main() -> int:
    tests = [
        test_primeiro_erro_cria_uma_issue_e_estado,
        test_mesmo_erro_nao_duplica_issue_e_incrementa_ocorrencia,
        test_fingerprint_remove_sha_e_ids_volateis,
        test_evidencia_nova_comenta_a_mesma_issue,
        test_issue_fechada_que_reaparece_vira_recurrent_e_reabre,
        test_falha_ao_criar_issue_e_recuperavel_sem_duplicar,
        test_pending_orfao_fica_recuperavel_sem_duplicar_issue,
        test_mark_resolved_persiste_root_cause_e_reaparecimento_vira_recurrent,
        test_segredos_sao_redigidos_antes_da_issue,
        test_cliente_nao_tem_merge_deploy_ou_force_push,
    ]
    failures = 0
    for test in tests:
        try:
            test()
        except AssertionError as exc:
            failures += 1
            print(f"FALHOU  {test.__name__}: {exc}")
    print(f"\n{len(tests) - failures}/{len(tests)} testes passaram.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
