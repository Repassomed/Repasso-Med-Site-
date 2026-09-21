"""Configuração e portão de segurança do OpenAI Auditor (Issue #106).

Espelha deliberadamente ``coordinator/config.py`` (mesmo padrão de portão
"lido do ambiente, fecha por padrão, comparação estrita só para a string
'true'"), mas é um portão **INDEPENDENTE** do Coordinator/Anthropic: o
OpenAI Auditor é uma segunda API, com seu próprio Secret
(``OPENAI_API_KEY``) e suas próprias Variables — nunca reaproveita
``REPASSO_COORDINATOR_ENABLED``/``MODE``.

Variables (já existentes no repositório, ver Issue #106):

    REPASSO_OPENAI_AUDITOR_ENABLED        "true" | "false" (padrão: "false")
    REPASSO_OPENAI_AUDITOR_MODEL          modelo NORMAL (Terra)
    REPASSO_OPENAI_AUDITOR_HIGH_RISK_MODEL modelo HIGH RISK (Sol)
    REPASSO_OPENAI_AUDITOR_BUDGET_USD     teto mensal interno em USD

Regra desta implementação, absoluta: ``ENABLED != "true"`` -> portão
fechado, ZERO chamadas à OpenAI, sempre — mesmo que
``REPASSO_COORDINATOR_MODE=active-supervised`` já esteja ligado para a
Anthropic. Esta PR mantém ``REPASSO_OPENAI_AUDITOR_ENABLED=false`` como
valor de produção; ligar isso é decisão futura e explícita de José, nunca
algo que este código faz sozinho.

Importante: o portão do OpenAI Auditor é adicional, nunca substitui o
portão do Coordinator (``coordinator/config.py::Config.gate()``) — os
dois precisam estar abertos para qualquer chamada à OpenAI acontecer (ver
``coordinator/observe.py``): o Coordinator continua controlando
ENABLED/MODE/PILOT/orçamento Anthropic normalmente, e o OpenAI Auditor só
entra em jogo DENTRO do caminho de auditoria semântica já existente
(active-supervised, Nível C), nunca como um gatilho novo e independente.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

ENV_ENABLED = "REPASSO_OPENAI_AUDITOR_ENABLED"
ENV_MODEL = "REPASSO_OPENAI_AUDITOR_MODEL"
ENV_HIGH_RISK_MODEL = "REPASSO_OPENAI_AUDITOR_HIGH_RISK_MODEL"
ENV_BUDGET_USD = "REPASSO_OPENAI_AUDITOR_BUDGET_USD"

# Defaults exatamente iguais aos valores já configurados em produção
# (Issue #106) — usados só quando a Variable correspondente não existir
# no ambiente (ex.: execução local/teste).
DEFAULT_MODEL = "gpt-5.6-terra"
DEFAULT_HIGH_RISK_MODEL = "gpt-5.6-sol"
DEFAULT_BUDGET_USD = 5.0


@dataclass(frozen=True)
class OpenAIAuditorConfig:
    enabled: bool
    model: str = DEFAULT_MODEL
    high_risk_model: str = DEFAULT_HIGH_RISK_MODEL
    budget_usd: float = DEFAULT_BUDGET_USD

    def gate(self) -> "OpenAIGateResult":
        """A decisão de segurança do OpenAI Auditor — sempre consultada
        antes de qualquer chamada (ver ``coordinator/openai_client.py::
        call``). Não repete o gate do Coordinator (ENABLED/MODE da
        Anthropic) — quem orquestra os dois portões é ``observe.py``."""
        if not self.enabled:
            return OpenAIGateResult(
                open=False,
                reason=(
                    f"{ENV_ENABLED}=false (ou ausente). Nenhuma chamada à OpenAI é "
                    "permitida enquanto este portão estiver fechado (Issue #106)."
                ),
            )
        return OpenAIGateResult(open=True, reason="ENABLED=true: portão do OpenAI Auditor aberto.")

    @classmethod
    def from_env(cls, env: dict | None = None) -> "OpenAIAuditorConfig":
        """Lê a config do ambiente. ``env`` é injetável para teste."""
        src = env if env is not None else os.environ
        enabled_raw = src.get(ENV_ENABLED, "false")
        model = src.get(ENV_MODEL) or DEFAULT_MODEL
        high_risk_model = src.get(ENV_HIGH_RISK_MODEL) or DEFAULT_HIGH_RISK_MODEL
        try:
            budget_usd = float(src.get(ENV_BUDGET_USD) or DEFAULT_BUDGET_USD)
        except ValueError:
            budget_usd = DEFAULT_BUDGET_USD
        return cls(
            enabled=(enabled_raw == "true"),
            model=model,
            high_risk_model=high_risk_model,
            budget_usd=budget_usd,
        )


@dataclass(frozen=True)
class OpenAIGateResult:
    open: bool
    reason: str
