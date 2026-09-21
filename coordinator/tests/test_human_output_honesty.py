"""Saída humana honesta sobre chamada/usage/custo (bloqueador 8 da 3ª
auditoria do PR #97).

Antes: render_human() escrevia sempre "esta execução não fez nenhuma
chamada externa", mesmo quando call_attempted=True. Prova exigida: o texto
tem que corresponder à VERDADE de call_attempted/call_status, e mostrar
modelo/usage/custo (sanitizados) quando houve chamada.
"""

from __future__ import annotations

import sys

from . import _pathsetup  # noqa: F401
from coordinator.__main__ import render_human


def test_render_human_never_lies_when_call_was_attempted() -> None:
    resultado = {
        "status": "OBSERVED",
        "reason": "Chamada concluída.",
        "task_type": "A",
        "priority": "P2",
        "worker_suggestion": "Claude 2",
        "model_suggestion": {"tier": "STANDARD", "model_id": "claude-sonnet-5"},
        "next_action": "Seguir com a auditoria.",
        "call_attempted": True,
        "call_status": "ok",
        "response_text": "Resumo sanitizado da resposta.",
        "usage": {"input_tokens": 123, "output_tokens": 45, "estimated_cost_usd": 0.000696},
    }
    texto = render_human(resultado)
    assert "nenhuma chamada externa foi tentada" not in texto, (
        "call_attempted=True nunca pode sair como 'nenhuma chamada externa'"
    )
    assert "Chamada à Anthropic:** SIM" in texto
    assert "ok" in texto
    assert "123" in texto and "45" in texto
    assert "0.000696" in texto
    assert "Resumo sanitizado" in texto
    print("OK  test_render_human_never_lies_when_call_was_attempted")


def test_render_human_says_no_call_when_none_was_attempted() -> None:
    resultado = {
        "status": "BLOCKED",
        "reason": "REPASSO_COORDINATOR_ENABLED=false.",
        "task_type": "A",
        "priority": "P2",
        "worker_suggestion": None,
        "model_suggestion": None,
        "next_action": "Aguardar.",
        "call_attempted": False,
        "call_status": None,
        "response_text": None,
        "usage": None,
    }
    texto = render_human(resultado)
    assert "Chamada à Anthropic:** NÃO" in texto
    assert "nenhuma chamada externa foi tentada" in texto
    print("OK  test_render_human_says_no_call_when_none_was_attempted")


def test_render_human_reports_error_status_honestly() -> None:
    """call_attempted=True com status='error' (falha do transporte) não
    pode virar silenciosamente 'nenhuma chamada' nem esconder o erro."""
    resultado = {
        "status": "OBSERVED",
        "reason": "Falha na chamada após 1.23s (uma única tentativa, sem retry): timeout",
        "task_type": "B",
        "priority": "P1",
        "worker_suggestion": "Claude 1",
        "model_suggestion": {"tier": "FAST", "model_id": "claude-haiku-4-5-20251001"},
        "next_action": "x",
        "call_attempted": True,
        "call_status": "error",
        "response_text": None,
        "usage": None,
    }
    texto = render_human(resultado)
    assert "Chamada à Anthropic:** SIM" in texto
    assert "error" in texto
    print("OK  test_render_human_reports_error_status_honestly")


def main() -> int:
    testes = [
        test_render_human_never_lies_when_call_was_attempted,
        test_render_human_says_no_call_when_none_was_attempted,
        test_render_human_reports_error_status_honestly,
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
