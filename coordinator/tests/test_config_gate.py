"""Portão de segurança: ENABLED e MODE (Issue #95).

Prova exigida:
    - ENABLED=false => portão fechado, sempre;
    - MODE != observe => portão fechado, mesmo com ENABLED=true;
    - só ENABLED=true + MODE=observe abre o portão.
"""

from __future__ import annotations

import sys

from . import _pathsetup  # noqa: F401
from coordinator.config import Config


def test_disabled_blocks_regardless_of_mode() -> None:
    for mode in ("observe", "execute", "anything", ""):
        cfg = Config(enabled=False, mode=mode)
        gate = cfg.gate()
        assert not gate.open, f"ENABLED=false devia bloquear com MODE={mode!r}"
    print("OK  test_disabled_blocks_regardless_of_mode")


def test_wrong_mode_blocks_even_when_enabled() -> None:
    for mode in ("execute", "auto", "Observe", "OBSERVE", ""):
        cfg = Config(enabled=True, mode=mode)
        gate = cfg.gate()
        assert not gate.open, f"MODE={mode!r} != 'observe' devia bloquear mesmo com ENABLED=true"
        assert "observe" in gate.reason.lower() or "MODE" in gate.reason
    print("OK  test_wrong_mode_blocks_even_when_enabled")


def test_enabled_true_mode_observe_opens_gate() -> None:
    cfg = Config(enabled=True, mode="observe")
    gate = cfg.gate()
    assert gate.open
    print("OK  test_enabled_true_mode_observe_opens_gate")


def test_from_env_defaults_are_safe() -> None:
    cfg = Config.from_env(env={})
    assert cfg.enabled is False
    assert cfg.mode == "observe"
    assert not cfg.gate().open
    print("OK  test_from_env_defaults_are_safe (ambiente vazio = desligado)")


def test_from_env_rejects_truthy_variants() -> None:
    for valor in ("True", "TRUE", "1", "yes", " true"):
        cfg = Config.from_env(env={"REPASSO_COORDINATOR_ENABLED": valor})
        assert cfg.enabled is False, f"{valor!r} não é a string exata 'true' — devia continuar desligado"
    cfg_ok = Config.from_env(env={"REPASSO_COORDINATOR_ENABLED": "true"})
    assert cfg_ok.enabled is True
    print("OK  test_from_env_rejects_truthy_variants")


def main() -> int:
    testes = [
        test_disabled_blocks_regardless_of_mode,
        test_wrong_mode_blocks_even_when_enabled,
        test_enabled_true_mode_observe_opens_gate,
        test_from_env_defaults_are_safe,
        test_from_env_rejects_truthy_variants,
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
