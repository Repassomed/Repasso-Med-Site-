"""Coordinator V3, rodada 4 (Issue #99, auditoria independente rodada 3 do
PR #104, HEAD `772e9dc`): fecha os 4 bloqueadores B1-B4 registrados ali.

    B1 — Worker Registry não pode inventar disponibilidade;
    B2 — active-supervised deve escolher worker pelo registro OPERACIONAL,
         nunca pelo histórico de coordination/tasks.json;
    B3 — custo REAL precisa aparecer em NEEDS-FIX/MERGE-READY, não só nos
         checkpoints zero-custo da Inbox;
    B4 — POOL-PAUSADO é global e sempre vai para a Inbox (#88),
         independentemente de onde o checkpoint chegou; o workflow nunca
         infere o destino, só lê o que o Coordinator decidiu.
"""

from __future__ import annotations

import os
import sys
import tempfile

from . import _pathsetup
from coordinator.budget import UsageLedger
from coordinator.config import ACTIVE_SUPERVISED_MODE, Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.events import INBOX_ISSUE_NUMBER
from coordinator.github_event import build_event_from_github_context
from coordinator.observe import observe
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord
from coordinator.worker_registry import Worker, WorkerState

REPO = "Repassomed/Repasso-Med-Site-"


class _RespostaFalsa:
    def __init__(self, texto: str, input_tokens: int = 0, output_tokens: int = 0) -> None:
        self.text = texto
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens


class _TransporteContador:
    def __init__(self, resposta: _RespostaFalsa) -> None:
        self.resposta = resposta
        self.calls = 0

    def send(self, request):
        self.calls += 1
        return self.resposta


class _LedgerQueSempreFalha:
    """Mesma superfície pública de UsageLedger (``append``/
    ``month_to_date_usd``/``reserve_if_within_budget`` importam aqui) —
    ``append`` sempre lança, sem depender de git/rede (mesmo padrão de
    test_ledger_failure_after_call.py). Achado F9-A: a RESERVA
    conservadora (antes da chamada) precisa ter êxito para o cenário que
    este fixture simula — "a chamada aconteceu, mas a persistência da
    CORREÇÃO/uso depois falhou" — então ``reserve_if_within_budget`` só
    delega para um ``UsageLedger`` real (nunca lança), enquanto
    ``append`` (usado pela correção/uso, depois da chamada) continua
    sempre falhando."""

    def __init__(self, mensagem: str) -> None:
        self.mensagem = mensagem
        self._reserva_real = UsageLedger(tempfile.mktemp(suffix=".json"))

    def append(self, record) -> None:
        raise RuntimeError(self.mensagem)

    def month_to_date_usd(self, *, now=None) -> float:
        return 0.0

    def reserve_if_within_budget(self, candidate, *, budget_usd, now=None) -> bool:
        return self._reserva_real.reserve_if_within_budget(candidate, budget_usd=budget_usd, now=now)


def _cfg() -> Config:
    return Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE)


# ---------------------------------------------------------------------------
# B1 — seed conservador (também coberto em test_coordinator_v3_round3.py;
# aqui a prova fica junto dos outros 3 bloqueadores desta mesma auditoria).
# ---------------------------------------------------------------------------

def test_b1_seed_never_invents_available_workers() -> None:
    from coordinator.worker_ops import default_seed_workers

    for w in default_seed_workers():
        assert w.status == "OFFLINE", f"{w.worker_id} nasceu {w.status!r} — o seed não pode inventar disponibilidade"
    print("OK  test_b1_seed_never_invents_available_workers")


# ---------------------------------------------------------------------------
# B2 — #88 usa o registro OPERACIONAL, nunca o histórico de tasks.json.
# ---------------------------------------------------------------------------

def test_b2_inbox_never_suggests_worker_that_operational_registry_says_is_limit() -> None:
    """Prova exigida pela auditoria: tasks.json sugere Claude 1 (FREE no
    histórico); o registro operacional diz Claude 1 = LIMIT e Claude 3 =
    AVAILABLE. A #88 nunca pode sugerir Claude 1, e pode sugerir Claude 3."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))

        # Histórico (coordination/tasks.json) — Claude 1 aparece FREE aqui.
        workers_historicos = [
            Worker(name="Claude 1", state=WorkerState.FREE, specialization=("materia",)),
        ]

        # Registro operacional — a fonte de verdade ao vivo.
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        registry.upsert(
            WorkerRecord(worker_id="claude-1", display_name="Claude 1", type="human_session", status="LIMIT"),
            message="teste: Claude 1 em LIMIT",
        )
        registry.upsert(
            WorkerRecord(worker_id="claude-3", display_name="Claude 3", type="human_session", status="AVAILABLE"),
            message="teste: Claude 3 disponível",
        )

        payload = {
            "action": "created",
            "issue": {"number": 88},
            "comment": {"id": 1, "body": "Entraram questões novas de Toxicología.",
                        "user": {"login": "Repassomed"}},
        }
        ev = build_event_from_github_context("issue_comment", payload, REPO)
        cfg = _cfg()
        r = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=workers_historicos,
                     audit_mode=True, worker_registry=registry)

        assert "Claude 1" not in r.merge_card, "nunca pode sugerir um worker LIMIT no registro operacional"
        assert "Claude 3" in r.merge_card, "deveria sugerir o worker AVAILABLE no registro operacional"
    print("OK  test_b2_inbox_never_suggests_worker_that_operational_registry_says_is_limit")


def test_b2_escolher_disponivel_never_returns_non_available() -> None:
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
    registry.upsert(
        WorkerRecord(worker_id="claude-1", display_name="Claude 1", type="human_session", status="LIMIT"),
        message="teste",
    )
    assert registry.escolher_disponivel() is None, "só existe um worker LIMIT — não pode devolver nada"
    print("OK  test_b2_escolher_disponivel_never_returns_non_available")


# ---------------------------------------------------------------------------
# B3 — custo REAL em NEEDS-FIX/MERGE-READY.
# ---------------------------------------------------------------------------

def _evento_pr_materia(*, head_sha: str, body: str, run_id: int = 1):
    payload = {
        "action": "completed",
        "workflow_run": {"name": "Repasso Guard", "conclusion": "success", "id": run_id,
                          "head_sha": head_sha, "pull_requests": [{"number": 300}]},
    }
    pr_info = {"number": 300, "title": "Farmacología II — ajuste", "body": "- **Área:** materia\n\n" + body,
               "labels": ["NEEDS-AUDIT"], "updated_at": "2026-09-21T00:00:00Z"}
    diff = "diff --git a/farmacologia-ii.html b/farmacologia-ii.html\n+<p>ajuste</p>\n"
    return build_event_from_github_context("workflow_run", payload, REPO, pr_info=pr_info, pr_diff=diff)


def test_b3_merge_ready_card_shows_real_cost_tier_model_and_calls() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("DECISÃO: MERGE-READY\nTudo certo.", input_tokens=1000, output_tokens=200))
        ev = _evento_pr_materia(head_sha="b3-1", body="ajuste de prosa didática")
        r = observe(ev, config=_cfg(), dedup=dedup, ledger=ledger, workers=[], audit_mode=True, transport=t)

        assert r.audit_decision == "MERGE-READY"
        assert "custo CALCULADO" in r.merge_card
        assert "STANDARD" in r.merge_card
        assert "claude-sonnet-5" in r.merge_card
        assert "chamadas pagas desta tarefa: 1" in r.merge_card
        # gasto acumulado do mês já reflete esta chamada (ledger.append()
        # aconteceu antes do cartão ser montado).
        assert ledger.month_to_date_usd() > 0.0
    print("OK  test_b3_merge_ready_card_shows_real_cost_tier_model_and_calls")


def test_b3_needs_fix_hard_fail_card_shows_zero_cost_block() -> None:
    """HARD FAIL determinístico: zero chamada, mas o bloco de custo
    continua presente (estimado=0, nunca confundido com real)."""
    audit_pack = {
        "versao": 1, "resultado": "REPROVADO",
        "achados": [{"check": "gabarito", "severity": "HARD FAIL", "message": "resposta científica errada",
                      "where": "farmacologia-ii.html", "detail": {}}],
        "arquivos_alterados": ["Repasso-Med-Site--main/Atual - Copia/farmacologia-ii.html"],
    }
    payload = {
        "action": "completed",
        "workflow_run": {"name": "Repasso Guard", "conclusion": "success", "id": 1,
                          "head_sha": "b3-2", "pull_requests": [{"number": 301}]},
    }
    pr_info = {"number": 301, "title": "x", "body": "- **Área:** materia\n\nx",
               "labels": ["NEEDS-AUDIT"], "updated_at": "y"}
    ev = build_event_from_github_context("workflow_run", payload, REPO, pr_info=pr_info, audit_pack=audit_pack)
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("nunca devia chegar aqui"))
        r = observe(ev, config=_cfg(), dedup=dedup, ledger=ledger, workers=[], audit_mode=True, transport=t)
        assert r.audit_decision == "NEEDS-FIX"
        assert t.calls == 0
        assert "**API**" in r.merge_card
        assert "custo ESTIMADO" in r.merge_card
    print("OK  test_b3_needs_fix_hard_fail_card_shows_zero_cost_block")


def test_b3_ledger_failure_still_shows_real_usage_and_flags_persistence() -> None:
    """Se o ledger falhar DEPOIS de uma chamada bem-sucedida, o custo
    CALCULADO a partir do usage medido continua visível (não escondido) e
    a falha de persistência é sinalizada explicitamente — nunca confundida
    com 'nenhuma chamada foi tentada'."""
    ledger_falho = _LedgerQueSempreFalha("remoto de estado inalcançável")
    t = _TransporteContador(_RespostaFalsa("DECISÃO: NEEDS-FIX\nFalta corrigir X.", input_tokens=500, output_tokens=100))
    ev = _evento_pr_materia(head_sha="b3-3", body="ajuste de prosa didática")
    dedup = Deduplicator(InMemoryStore())
    r = observe(ev, config=_cfg(), dedup=dedup, ledger=ledger_falho, workers=[], audit_mode=True, transport=t)

    assert r.call_status == "ok_ledger_failed"
    assert r.call_attempted is True
    assert r.audit_decision == "NEEDS-FIX"
    assert "custo CALCULADO" in r.merge_card, "o custo calculado não pode desaparecer só porque o ledger falhou"
    assert "DESATUALIZADO" in r.merge_card, "a falha de persistência precisa ficar visível"
    print("OK  test_b3_ledger_failure_still_shows_real_usage_and_flags_persistence")


# ---------------------------------------------------------------------------
# B4 — POOL-PAUSADO é sempre global, na Inbox (#88).
# ---------------------------------------------------------------------------

def _evento_checkpoint(*, agente: str, issue: int, commit: str = "abc123", comment_id: int = 1):
    corpo = (
        f"MATÉRIA/ÁREA: Ortopedia\nTAREFA: ortopedia-x\nESTADO: BLOCKED-LIMIT\n"
        f"AGENTE: {agente}\nBRANCH: edit/x\nCOMMIT: {commit}\n"
    )
    payload = {
        "action": "created",
        "issue": {"number": issue},
        "comment": {"id": comment_id, "body": corpo, "user": {"login": "Repassomed"}},
    }
    return build_event_from_github_context("issue_comment", payload, REPO)


def test_b4_pool_paused_from_issue_101_targets_inbox_88() -> None:
    """Prova exigida pela auditoria: checkpoint em #101 + todos os
    executores LIMIT/OFFLINE -> o comentário global vai para a #88, nunca
    para a #101."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        # Todo mundo já LIMIT/OFFLINE antes deste checkpoint chegar.
        for n in (2, 3, 4):
            registry.upsert(
                WorkerRecord(worker_id=f"claude-{n}", display_name=f"Claude {n}", type="human_session",
                              status="LIMIT"),
                message="teste: pré-condição pool pausado",
            )
        ev = _evento_checkpoint(agente="Claude 1", issue=101)
        r = observe(ev, config=_cfg(), dedup=dedup, ledger=ledger, workers=[], audit_mode=True,
                     worker_registry=registry)

        assert "POOL-PAUSADO" in r.merge_card
        assert r.comment_target_issue == INBOX_ISSUE_NUMBER
        assert r.comment_target_issue != 101
    print("OK  test_b4_pool_paused_from_issue_101_targets_inbox_88")


def test_b4_specific_checkpoint_targets_origin_issue_not_inbox() -> None:
    """Sem pool pausado (ainda há worker AVAILABLE), um checkpoint
    específico continua respondendo na issue de origem, não na #88."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        registry.upsert(
            WorkerRecord(worker_id="claude-3", display_name="Claude 3", type="human_session", status="AVAILABLE"),
            message="teste: alguém disponível",
        )
        ev = _evento_checkpoint(agente="Claude 1", issue=101)
        r = observe(ev, config=_cfg(), dedup=dedup, ledger=ledger, workers=[], audit_mode=True,
                     worker_registry=registry)

        assert "POOL-PAUSADO" not in r.merge_card
        assert r.comment_target_issue == 101
    print("OK  test_b4_specific_checkpoint_targets_origin_issue_not_inbox")


def test_b4_inbox_and_command_confirmations_target_inbox_88() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        payload = {
            "action": "created",
            "issue": {"number": 88},
            "comment": {"id": 1, "body": "Claude 2 entrou em limite", "user": {"login": "Repassomed"}},
        }
        ev = build_event_from_github_context("issue_comment", payload, REPO)
        r = observe(ev, config=_cfg(), dedup=dedup, ledger=ledger, workers=[], audit_mode=True,
                     worker_registry=registry)
        assert r.comment_target_issue == INBOX_ISSUE_NUMBER
    print("OK  test_b4_inbox_and_command_confirmations_target_inbox_88")


def test_b4_pr_needs_audit_targets_the_pr() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("DECISÃO: MERGE-READY\nOk.", input_tokens=100, output_tokens=50))
        ev = _evento_pr_materia(head_sha="b4-1", body="ajuste")
        r = observe(ev, config=_cfg(), dedup=dedup, ledger=ledger, workers=[], audit_mode=True, transport=t)
        assert r.comment_target_issue == 300
    print("OK  test_b4_pr_needs_audit_targets_the_pr")


def main() -> int:
    testes = [
        test_b1_seed_never_invents_available_workers,
        test_b2_inbox_never_suggests_worker_that_operational_registry_says_is_limit,
        test_b2_escolher_disponivel_never_returns_non_available,
        test_b3_merge_ready_card_shows_real_cost_tier_model_and_calls,
        test_b3_needs_fix_hard_fail_card_shows_zero_cost_block,
        test_b3_ledger_failure_still_shows_real_usage_and_flags_persistence,
        test_b4_pool_paused_from_issue_101_targets_inbox_88,
        test_b4_specific_checkpoint_targets_origin_issue_not_inbox,
        test_b4_inbox_and_command_confirmations_target_inbox_88,
        test_b4_pr_needs_audit_targets_the_pr,
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
