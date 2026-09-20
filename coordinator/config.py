"""Configuração e o portão de segurança do Coordinator.

**Este módulo é a primeira linha de defesa da Issue #95.** Antes de qualquer
classificação, roteamento ou chamada à Anthropic, o pipeline consulta
``Config.gate()``. Se o portão não abrir, nada mais roda — nem a
classificação determinística, e certamente nenhuma chamada de rede.

Duas variáveis, lidas do ambiente (GitHub Actions Variables em produção,
nunca hardcoded):

    REPASSO_COORDINATOR_ENABLED   "true" | "false" (padrão: "false")
    REPASSO_COORDINATOR_MODE      "observe" | qualquer outro (padrão: "observe")

Regra desta V2, absoluta:

    ENABLED != "true"   -> BLOCKED, 0 chamadas, sempre.
    MODE    != "observe"-> BLOCKED, 0 chamadas, sempre — mesmo com ENABLED=true.

A comparação é estrita e sensível a maiúsculas/minúsculas SÓ para "true"
(evita "True"/"TRUE"/"1" ativarem por acidente uma variável do GitHub que
alguém digitou errado — errar para o lado seguro é o objetivo). Qualquer
valor que não seja exatamente a string ``"true"`` conta como desligado.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


ENV_ENABLED = "REPASSO_COORDINATOR_ENABLED"
ENV_MODE = "REPASSO_COORDINATOR_MODE"

ALLOWED_MODE = "observe"


@dataclass(frozen=True)
class Config:
    enabled: bool
    mode: str

    @property
    def mode_allowed(self) -> bool:
        return self.mode == ALLOWED_MODE

    def gate(self) -> "GateResult":
        """A decisão de segurança. Chamado antes de qualquer outra coisa."""
        if not self.mode_allowed:
            return GateResult(
                open=False,
                reason=(
                    f"REPASSO_COORDINATOR_MODE={self.mode!r} não é {ALLOWED_MODE!r}. "
                    "Esta V2 só sabe operar em modo observe; qualquer outro modo "
                    "fica bloqueado, mesmo que ENABLED=true."
                ),
            )
        if not self.enabled:
            return GateResult(
                open=False,
                reason=(
                    f"{ENV_ENABLED}=false (ou ausente). Nenhuma chamada externa é "
                    "permitida enquanto o portão estiver fechado."
                ),
            )
        return GateResult(open=True, reason="ENABLED=true e MODE=observe: portão aberto.")

    @classmethod
    def from_env(cls, env: dict | None = None) -> "Config":
        """Lê a config do ambiente. ``env`` é injetável para teste."""
        src = env if env is not None else os.environ
        enabled_raw = src.get(ENV_ENABLED, "false")
        mode_raw = src.get(ENV_MODE, ALLOWED_MODE)
        return cls(enabled=(enabled_raw == "true"), mode=mode_raw)


@dataclass(frozen=True)
class GateResult:
    open: bool
    reason: str
