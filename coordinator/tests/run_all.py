"""Roda toda a suíte de testes do Coordinator numa só chamada.

    python3 -m coordinator.tests.run_all
"""

from __future__ import annotations

import sys

from . import (
    test_anthropic_client,
    test_anthropic_transport,
    test_audit_preservation,
    test_auto_repair,
    test_budget,
    test_canary_integration,
    test_classify_routing,
    test_cli_crash_safety,
    test_cli_runner_wiring,
    test_config_gate,
    test_coordinator_v3,
    test_coordinator_v3_round3,
    test_coordinator_v3_round4,
    test_dedup,
    test_error_registry,
    test_git_state,
    test_github_event,
    test_global_ledger_race,
    test_guard_state_integration,
    test_handoff_exec,
    test_heartbeat,
    test_human_output_honesty,
    test_ledger_failure_after_call,
    test_no_forbidden_writes,
    test_observe_pipeline,
    test_observe_real_path,
    test_observe_runner_wiring,
    test_openai_auditor,
    test_openai_transport,
    test_pilot_mode,
    test_redact,
    test_runner_contract,
    test_runner_dispatch,
    test_runner_generate,
    test_runner_resume,
    test_runner_workflow_security,
    test_scheduler,
    test_source_pack,
    test_worker_bridge,
    test_worker_bridge_workflow_security,
    test_worker_commands,
    test_worker_ops,
    test_worker_registry_real,
    test_workflow_security,
)

MODULOS = [
    test_config_gate,
    test_redact,
    test_dedup,
    test_error_registry,
    test_classify_routing,
    test_budget,
    test_anthropic_client,
    test_observe_pipeline,
    test_git_state,
    test_anthropic_transport,
    test_github_event,
    test_observe_real_path,
    test_no_forbidden_writes,
    test_pilot_mode,
    test_worker_registry_real,
    test_human_output_honesty,
    test_workflow_security,
    test_guard_state_integration,
    test_cli_crash_safety,
    test_ledger_failure_after_call,
    test_coordinator_v3,
    # Evidência de preservação da auditoria (PRs #192/#208).
    test_audit_preservation,
    test_coordinator_v3_round3,
    test_coordinator_v3_round4,
    test_openai_transport,
    test_openai_auditor,
    test_scheduler,
    test_source_pack,
    # Auto-reparo técnico OpenAI: política, anti-loop, escopo e identidade
    # de auto-merge também entram na suíte que o próprio reparo roda antes
    # de publicar qualquer branch.
    test_auto_repair,
    # Issue #105 (Fases B-G): registrados a partir da Fase G. Até aqui
    # estes módulos rodavam só standalone, o que deixava a allowlist
    # `coordinator-suite` (o único comando de validação que o próprio
    # canário executa antes de comitar) cega justamente para o
    # mecanismo do canário. Agora a suíte completa cobre contrato,
    # heartbeat, handoff real, dispatch, geração, retomada, comandos de
    # worker, segurança do workflow do Runner e a integração final.
    test_canary_integration,
    test_cli_runner_wiring,
    test_global_ledger_race,
    test_handoff_exec,
    test_heartbeat,
    test_observe_runner_wiring,
    test_runner_contract,
    test_runner_dispatch,
    test_runner_generate,
    test_runner_resume,
    test_runner_workflow_security,
    test_worker_commands,
    test_worker_ops,
    # Issue #128 (Worker Bridge V1): registrados junto com o próprio
    # Bridge. A allowlist `coordinator-suite` é a única validação que o
    # Runner executa antes de comitar — deixar estes dois fora dela
    # deixaria cega exatamente a camada que decide QUEM executa O QUÊ.
    test_worker_bridge,
    test_worker_bridge_workflow_security,
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
