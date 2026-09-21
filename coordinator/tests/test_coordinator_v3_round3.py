"""Coordinator V3, rodada 3 (Issue #99, auditoria independente rodada 2 do
PR #104): Issue #88 como interface visível, custos visíveis, Worker
Registry operacional, comandos naturais e a camada de decisão de
handoff/pool.

Cobre a lista de testes exigida:

1. comentário válido em #88 gera RECEBIDO uma única vez;
2. comentário do Coordinator = parser ignorado, zero API;
3. atualização de worker AVAILABLE -> LIMIT -> AVAILABLE;
4. worker que volta não retoma tarefa assumida por outro;
5. P1 favorece handoff quando seguro;
6. P3 pode esperar;
7. pool inteiro LIMIT não gera polling pago (decisão pura, zero chamada);
8. custos estimado e real são diferenciados;
9. checkpoint mostra custo/tier;
10. modo observe não quebra.
"""

from __future__ import annotations

import os
import sys
import tempfile
from dataclasses import replace

from . import _pathsetup
from coordinator import costs, handoff
from coordinator.budget import UsageLedger
from coordinator.classify import Priority
from coordinator.config import ACTIVE_SUPERVISED_MODE, ALLOWED_MODE, Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.github_event import build_event_from_github_context
from coordinator.observe import observe
from coordinator.worker_commands import aplicar_comando, parse_worker_command
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord

REPO = "Repassomed/Repasso-Med-Site-"


class _RespostaFalsa:
    def __init__(self, texto: str) -> None:
        self.text = texto
        self.input_tokens = 0
        self.output_tokens = 0


class _TransporteContador:
    def __init__(self) -> None:
        self.calls = 0

    def send(self, request):
        self.calls += 1
        return _RespostaFalsa("nunca devia chegar aqui")


def _cfg(active: bool = True) -> Config:
    return Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE if active else ALLOWED_MODE)


def _evento_inbox(corpo: str, comment_id: int = 1):
    payload = {
        "action": "created",
        "issue": {"number": 88},
        "comment": {"id": comment_id, "body": corpo, "user": {"login": "Repassomed"}},
    }
    return build_event_from_github_context("issue_comment", payload, REPO)


def _evento_checkpoint(*, agente: str, tarefa: str, branch: str, commit: str, comment_id: int = 1, issue: int = 67):
    corpo = (
        f"MATÉRIA/ÁREA: Ortopedia\nTAREFA: {tarefa}\nESTADO: BLOCKED-LIMIT\n"
        f"AGENTE: {agente}\nBRANCH: {branch}\nCOMMIT: {commit}\n"
    )
    payload = {
        "action": "created",
        "issue": {"number": issue},
        "comment": {"id": comment_id, "body": corpo, "user": {"login": "Repassomed"}},
    }
    return build_event_from_github_context("issue_comment", payload, REPO)


# ---------------------------------------------------------------------------
# 1 + 2. #88 visível + anti-loop.
# ---------------------------------------------------------------------------

def test_valid_inbox_comment_yields_recebido_once() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        cfg = _cfg()
        ev = _evento_inbox("Entraram questões novas de Farmacología II. Prioridade alta.", comment_id=10)

        r1 = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=[], audit_mode=True, worker_registry=registry)
        assert r1.status == "OBSERVED"
        assert r1.should_comment is True
        assert r1.call_attempted is False
        assert "RECEBIDO" in r1.merge_card

        r2 = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=[], audit_mode=True, worker_registry=registry)
        assert r2.status == "DUPLICATE", "o mesmo comentário não pode gerar um segundo RECEBIDO"
    print("OK  test_valid_inbox_comment_yields_recebido_once")


def test_coordinator_marked_comment_is_ignored_zero_api() -> None:
    corpo = "<!-- repasso-coordinator -->\n✅ RECEBIDO\nTarefa: x"
    ev = _evento_inbox(corpo, comment_id=11)
    assert ev is None, "um comentário com o marcador nunca pode virar Event — zero chance de chamar a API"
    print("OK  test_coordinator_marked_comment_is_ignored_zero_api")


# ---------------------------------------------------------------------------
# 3. Worker Registry — transições de status.
# ---------------------------------------------------------------------------

def test_worker_seed_is_conservative_never_invents_available() -> None:
    """Correção B1 da auditoria independente do PR #104, rodada 3: o seed
    nunca pode inventar disponibilidade — Claude 1-4 nascem OFFLINE até
    heartbeat/comando explícito, e chatgpt-auditor continua OFFLINE até a
    Issue #106 conectá-lo de verdade."""
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
    for w in registry.list_workers():
        assert w.status == "OFFLINE", f"{w.worker_id} nasceu {w.status!r}, esperava OFFLINE"
    print("OK  test_worker_seed_is_conservative_never_invents_available")


def test_worker_available_limit_available_transitions() -> None:
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
    assert registry.find_by_name_or_id("Claude 2").status == "OFFLINE"

    aplicar_comando(registry, parse_worker_command("Claude 2 voltou e está disponível"))
    assert registry.find_by_name_or_id("Claude 2").status == "AVAILABLE"

    aplicar_comando(registry, parse_worker_command("Claude 2 entrou em limite"))
    assert registry.find_by_name_or_id("Claude 2").status == "LIMIT"

    aplicar_comando(registry, parse_worker_command("Claude 2 voltou e está disponível"))
    assert registry.find_by_name_or_id("Claude 2").status == "AVAILABLE"
    print("OK  test_worker_available_limit_available_transitions")


def test_never_merge_is_always_true_structurally() -> None:
    w = WorkerRecord(worker_id="x", display_name="X", type="human_session", status="AVAILABLE")
    assert w.never_merge is True
    print("OK  test_never_merge_is_always_true_structurally")


def test_register_command_sets_capabilities() -> None:
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
    aplicar_comando(registry, parse_worker_command("Cadastre Claude 4 como worker de conteúdo e código"))
    w = registry.find_by_name_or_id("Claude 4")
    assert w is not None and w.status == "AVAILABLE"
    assert set(w.capabilities) >= {"conteúdo", "código"} or set(w.capabilities) >= {"conteudo", "codigo"}
    print("OK  test_register_command_sets_capabilities")


def test_deactivate_command_sets_offline() -> None:
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
    aplicar_comando(registry, parse_worker_command("Desative Claude 4"))
    assert registry.find_by_name_or_id("Claude 4").status == "OFFLINE"
    print("OK  test_deactivate_command_sets_offline")


# ---------------------------------------------------------------------------
# 4, 5, 6. Camada de decisão de handoff.
# ---------------------------------------------------------------------------

def test_returning_worker_does_not_resume_task_another_worker_took() -> None:
    deve, motivo = handoff.worker_retomando_deve_assumir(
        tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-3", worker_que_volta="claude-1",
    )
    assert deve is False
    print("OK  test_returning_worker_does_not_resume_task_another_worker_took")


def test_returning_worker_does_not_redo_completed_task() -> None:
    deve, _ = handoff.worker_retomando_deve_assumir(
        tarefa_estado="DONE", tarefa_agente_atual="claude-1", worker_que_volta="claude-1",
    )
    assert deve is False
    print("OK  test_returning_worker_does_not_redo_completed_task")


def test_returning_worker_resumes_its_own_still_blocked_task() -> None:
    deve, _ = handoff.worker_retomando_deve_assumir(
        tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-1", worker_que_volta="claude-1",
    )
    assert deve is True
    print("OK  test_returning_worker_resumes_its_own_still_blocked_task")


def test_p1_favors_handoff_when_safe_and_worker_available() -> None:
    candidato = WorkerRecord(worker_id="claude-2", display_name="Claude 2", type="human_session", status="AVAILABLE")
    d = handoff.decidir_handoff(prioridade=Priority.P1, checkpoint_seguro=True, candidatos_disponiveis=[candidato])
    assert d.action == "HANDOFF"
    assert d.novo_worker == "claude-2"
    print("OK  test_p1_favors_handoff_when_safe_and_worker_available")


def test_p1_waits_without_safe_checkpoint() -> None:
    candidato = WorkerRecord(worker_id="claude-2", display_name="Claude 2", type="human_session", status="AVAILABLE")
    d = handoff.decidir_handoff(prioridade=Priority.P0, checkpoint_seguro=False, candidatos_disponiveis=[candidato])
    assert d.action == "WAIT"
    print("OK  test_p1_waits_without_safe_checkpoint")


def test_p3_can_wait_even_with_worker_available() -> None:
    candidato = WorkerRecord(worker_id="claude-2", display_name="Claude 2", type="human_session", status="AVAILABLE")
    d = handoff.decidir_handoff(prioridade=Priority.P3, checkpoint_seguro=True, candidatos_disponiveis=[candidato])
    assert d.action == "WAIT"
    print("OK  test_p3_can_wait_even_with_worker_available")


# ---------------------------------------------------------------------------
# 7. Pool inteiro em LIMIT — decisão pura, zero chamada paga.
# ---------------------------------------------------------------------------

def test_whole_pool_limit_never_calls_any_api() -> None:
    todos_limit = [
        WorkerRecord(worker_id="claude-1", display_name="Claude 1", type="human_session", status="LIMIT"),
        WorkerRecord(worker_id="claude-2", display_name="Claude 2", type="human_session", status="OFFLINE"),
        WorkerRecord(worker_id="chatgpt-auditor", display_name="ChatGPT Auditor", type="auditor", status="OFFLINE"),
    ]
    # decidir_pool é uma função pura — nenhum objeto de transporte/API
    # sequer existe neste teste; a garantia "zero chamada" é estrutural,
    # não observada por acidente.
    d = handoff.decidir_pool(todos_limit)
    assert d is not None and d.action == "POOL_PAUSED"
    print("OK  test_whole_pool_limit_never_calls_any_api")


def test_pool_not_paused_when_one_worker_available() -> None:
    workers = [
        WorkerRecord(worker_id="claude-1", display_name="Claude 1", type="human_session", status="LIMIT"),
        WorkerRecord(worker_id="claude-2", display_name="Claude 2", type="human_session", status="AVAILABLE"),
    ]
    assert handoff.decidir_pool(workers) is None
    print("OK  test_pool_not_paused_when_one_worker_available")


def test_checkpoint_blocked_limit_pipeline_reports_pool_paused_zero_calls() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        for w in registry.list_workers():
            if w.type == "human_session":
                registry.upsert(replace(w, status="LIMIT"), message="teste: força todos LIMIT")
        cfg = _cfg()
        t = _TransporteContador()
        ev = _evento_checkpoint(agente="Claude 1", tarefa="ortopedia-x", branch="edit/x", commit="abc123")
        r = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=[], audit_mode=True,
                     worker_registry=registry, transport=t)
        assert r.status == "OBSERVED"
        assert "POOL-PAUSADO" in r.merge_card
        assert t.calls == 0
    print("OK  test_checkpoint_blocked_limit_pipeline_reports_pool_paused_zero_calls")


# ---------------------------------------------------------------------------
# 8, 9. Custos.
# ---------------------------------------------------------------------------

def test_estimated_and_actual_cost_are_never_confused() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        resumo = costs.montar_resumo_custo(
            ledger=ledger, brl_rate=5.11, brl_rate_date="2026-09-21", estimated_usd=0.001, actual_usd=None,
        )
        texto = costs.render_cost_block(resumo)
        assert "ESTIMADO" in texto and "nenhuma chamada com usage medido" in texto

        resumo2 = costs.montar_resumo_custo(
            ledger=ledger, brl_rate=5.11, brl_rate_date="2026-09-21", estimated_usd=None, actual_usd=0.002,
        )
        texto2 = costs.render_cost_block(resumo2)
        assert "REAL" in texto2 and "ESTIMADO" not in texto2
    print("OK  test_estimated_and_actual_cost_are_never_confused")


def test_cost_block_shows_tier_and_model() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        resumo = costs.montar_resumo_custo(
            ledger=ledger, brl_rate=5.11, brl_rate_date="2026-09-21", estimated_usd=0.0,
            tier="STANDARD", model_id="claude-sonnet-5", calls_this_task=1,
        )
        texto = costs.render_cost_block(resumo)
        assert "STANDARD" in texto and "claude-sonnet-5" in texto
        assert "chamadas pagas desta tarefa: 1" in texto
    print("OK  test_cost_block_shows_tier_and_model")


def test_recebido_card_includes_cost_block() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        cfg = _cfg()
        ev = _evento_inbox("Entraram questões novas de Toxicología.", comment_id=20)
        r = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=[], audit_mode=True, worker_registry=registry)
        assert "**API**" in r.merge_card
        assert "conversão BRL informativa" in r.merge_card
    print("OK  test_recebido_card_includes_cost_block")


# ---------------------------------------------------------------------------
# 10. Modo observe não quebra.
# ---------------------------------------------------------------------------

def test_observe_mode_ignores_worker_registry_entirely() -> None:
    """MODE=observe (produção hoje): mesmo passando um worker_registry de
    verdade, nada da rodada 3 pode ativar — comportamento V2 preservado."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        cfg = _cfg(active=False)
        t = _TransporteContador()
        ev = _evento_inbox("Entraram questões novas de Farmacología II.", comment_id=30)
        r = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=[], audit_mode=False,
                     worker_registry=registry, transport=t)
        assert r.status == "OBSERVED"
        assert r.merge_card is None
        assert r.should_comment is False
        assert t.calls == 1, "o caminho V2 (resumo genérico) continua chamando normalmente"
        # E o Worker Registry nunca foi tocado — continua no seed
        # conservador (OFFLINE), nunca promovido a AVAILABLE por engano.
        assert registry.find_by_name_or_id("Claude 1").status == "OFFLINE"
    print("OK  test_observe_mode_ignores_worker_registry_entirely")


def test_observe_mode_without_worker_registry_still_works() -> None:
    """worker_registry=None (comportamento default, nenhum CLI novo
    passado) nunca pode quebrar um evento PR_NEEDS_AUDIT comum."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        cfg = _cfg(active=False)
        payload = {
            "action": "completed",
            "workflow_run": {"name": "Repasso Guard", "conclusion": "success", "id": 1,
                              "head_sha": "aaa", "pull_requests": [{"number": 1}]},
        }
        ev = build_event_from_github_context("workflow_run", payload, REPO)
        r = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=[])
        assert r.status in ("OBSERVED", "BLOCKED")
    print("OK  test_observe_mode_without_worker_registry_still_works")


def main() -> int:
    testes = [
        test_valid_inbox_comment_yields_recebido_once,
        test_coordinator_marked_comment_is_ignored_zero_api,
        test_worker_seed_is_conservative_never_invents_available,
        test_worker_available_limit_available_transitions,
        test_never_merge_is_always_true_structurally,
        test_register_command_sets_capabilities,
        test_deactivate_command_sets_offline,
        test_returning_worker_does_not_resume_task_another_worker_took,
        test_returning_worker_does_not_redo_completed_task,
        test_returning_worker_resumes_its_own_still_blocked_task,
        test_p1_favors_handoff_when_safe_and_worker_available,
        test_p1_waits_without_safe_checkpoint,
        test_p3_can_wait_even_with_worker_available,
        test_whole_pool_limit_never_calls_any_api,
        test_pool_not_paused_when_one_worker_available,
        test_checkpoint_blocked_limit_pipeline_reports_pool_paused_zero_calls,
        test_estimated_and_actual_cost_are_never_confused,
        test_cost_block_shows_tier_and_model,
        test_recebido_card_includes_cost_block,
        test_observe_mode_ignores_worker_registry_entirely,
        test_observe_mode_without_worker_registry_still_works,
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
