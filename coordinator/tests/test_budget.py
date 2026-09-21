"""Limites de chamada/token, ledger de uso e freios de orçamento (Issue #84 §4)."""

from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime, timezone

from . import _pathsetup  # noqa: F401
from coordinator.budget import (
    CallLimiter,
    MONTHLY_BUDGET_USD,
    UsageLedger,
    UsageRecord,
    check_budget,
    estimate_cost_usd,
    priority_allowed,
)
from coordinator.classify import Priority
from coordinator.models import ModelTier


def test_call_limiter_enforces_max_calls_per_event() -> None:
    lim = CallLimiter(max_calls=1)
    assert lim.can_call()
    lim.register_call()
    assert not lim.can_call(), "um evento não pode gerar uma segunda chamada nesta V2"
    print("OK  test_call_limiter_enforces_max_calls_per_event")


def test_call_limiter_clamps_tokens() -> None:
    lim = CallLimiter(max_output_tokens=500)
    assert lim.clamp_tokens(10_000) == 500
    assert lim.clamp_tokens(100) == 100
    print("OK  test_call_limiter_clamps_tokens")


def test_estimate_cost_matches_official_pricing() -> None:
    # Haiku 4.5: $1.00 / $5.00 por MTok (tabela oficial confirmada nesta rodada)
    custo = estimate_cost_usd(ModelTier.FAST, 1_000_000, 1_000_000)
    assert abs(custo - 6.00) < 1e-9
    print("OK  test_estimate_cost_matches_official_pricing")


def _ledger_com_gasto(tmp: str, fracao: float) -> UsageLedger:
    caminho = os.path.join(tmp, "usage.json")
    ledger = UsageLedger(caminho)
    alvo_usd = MONTHLY_BUDGET_USD * fracao
    ledger.append(
        UsageRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_key="evt:teste",
            tier=ModelTier.STANDARD.value,
            model_id="claude-sonnet-5",
            input_tokens=0,
            output_tokens=0,
            estimated_cost_usd=alvo_usd,
        )
    )
    return ledger


def test_budget_thresholds() -> None:
    casos = [
        (0.10, "ok"),
        (0.50, "warn"),
        (0.75, "reduce_non_essential"),
        (0.90, "p0_p1_only"),
        (1.00, "stop"),
        (1.50, "stop"),
    ]
    for fracao, esperado in casos:
        with tempfile.TemporaryDirectory() as tmp:
            ledger = _ledger_com_gasto(tmp, fracao)
            status = check_budget(ledger)
            assert status.action == esperado, f"fração {fracao}: esperado {esperado}, obtido {status.action}"
    print("OK  test_budget_thresholds (50/75/90/100%)")


def test_budget_ignores_previous_month() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "usage.json")
        ledger = UsageLedger(caminho)
        ledger.append(
            UsageRecord(
                timestamp="2020-01-15T00:00:00+00:00",  # mês bem antigo
                event_key="evt:antigo",
                tier=ModelTier.DEEP.value,
                model_id="claude-opus-5",
                input_tokens=0,
                output_tokens=0,
                estimated_cost_usd=MONTHLY_BUDGET_USD * 5,  # gastaria tudo, se contasse
            )
        )
        status = check_budget(ledger)
        assert status.action == "ok", "gasto de mês antigo não pode contar no mês corrente"
    print("OK  test_budget_ignores_previous_month")


def test_priority_allowed_gates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        parado = _ledger_com_gasto(tmp, 1.0)
        status_parado = check_budget(parado)
        assert not priority_allowed(status_parado, Priority.P0), "100% para tudo, até P0"

    with tempfile.TemporaryDirectory() as tmp2:
        so_p0_p1 = _ledger_com_gasto(tmp2, 0.90)
        status_90 = check_budget(so_p0_p1)
        assert priority_allowed(status_90, Priority.P0)
        assert priority_allowed(status_90, Priority.P1)
        assert not priority_allowed(status_90, Priority.P2)
    print("OK  test_priority_allowed_gates")


def main() -> int:
    testes = [
        test_call_limiter_enforces_max_calls_per_event,
        test_call_limiter_clamps_tokens,
        test_estimate_cost_matches_official_pricing,
        test_budget_thresholds,
        test_budget_ignores_previous_month,
        test_priority_allowed_gates,
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
