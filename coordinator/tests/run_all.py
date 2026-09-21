"""Roda toda a suíte de testes do Coordinator V2 numa só chamada.

    python3 -m coordinator.tests.run_all
"""

from __future__ import annotations

import sys

from . import (
    test_anthropic_client,
    test_anthropic_transport,
    test_budget,
    test_classify_routing,
    test_config_gate,
    test_dedup,
    test_git_state,
    test_github_event,
    test_no_forbidden_writes,
    test_observe_pipeline,
    test_observe_real_path,
    test_redact,
)

MODULOS = [
    test_config_gate,
    test_redact,
    test_dedup,
    test_classify_routing,
    test_budget,
    test_anthropic_client,
    test_observe_pipeline,
    test_git_state,
    test_anthropic_transport,
    test_github_event,
    test_observe_real_path,
    test_no_forbidden_writes,
]


def main() -> int:
    falhas_totais = 0
    for mod in MODULOS:
        print(f"\n== {mod.__name__} ==")
        falhas_totais += mod.main()
    print("\n" + "=" * 60)
    if falhas_totais:
        print(f"FALHOU: {falhas_totais} módulo(s) de teste com falha.")
    else:
        print("TODOS OS MÓDULOS PASSARAM.")
    return 1 if falhas_totais else 0


if __name__ == "__main__":
    sys.exit(main())
