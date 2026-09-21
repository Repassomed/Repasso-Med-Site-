"""Ledger e limites de chamada do OpenAI Auditor — SEPARADO do ledger da
Anthropic (Issue #106: "Criar ledger OpenAI SEPARADO do ledger
Anthropic").

Deliberadamente reaproveita a MECÂNICA de persistência já existente
(``coordinator.budget.UsageLedger``/``coordinator.git_state.GitUsageLedger``
e ``coordinator.budget.check_budget``) em vez de reescrevê-la: as duas
classes só chamam ``record.to_dict()``/leem ``record.event_key``/
``record.tier`` no registro que recebem (duck typing), então
``OpenAIUsageRecord`` (definido aqui, com ``provider="openai"`` sempre) é
100% compatível — o que garante a separação exigida é apontar essas
mesmas classes para um ARQUIVO/BRANCH diferente (nunca o mesmo caminho do
ledger Anthropic), o que ``coordinator/__main__.py`` faz via
``--openai-usage-ledger``/``--openai-usage-git-remote``/
``--openai-usage-git-branch`` — nunca a mesma instância, nunca o mesmo
arquivo.

Preço por token: tabela PLACEHOLDER (não confirmada com a OpenAI ainda),
só para ESTIMAR/CALCULAR custo a partir de tokens medidos — nunca para
decidir se uma chamada é permitida (isso é o portão em
``openai_config.py`` + o hard stop de ``check_budget`` abaixo). Revisar
quando José confirmar o pricing real do projeto OpenAI.
"""

from __future__ import annotations

from dataclasses import dataclass

# Nível lógico -> model id, resolvido a partir de OpenAIAuditorConfig
# (nunca hardcoded aqui) — mesma filosofia de coordinator/routing.py:
# "papel lógico" (NORMAL/HIGH RISK) separado do nome comercial do modelo.
TIER_NORMAL = "TERRA"
TIER_HIGH_RISK = "SOL"

# US$ por milhão de tokens — PLACEHOLDER, ver docstring do módulo.
_PRICE_PER_MTOK_USD: dict[str, dict[str, float]] = {
    TIER_NORMAL: {"input": 1.25, "output": 10.00},
    TIER_HIGH_RISK: {"input": 5.00, "output": 20.00},
}

MAX_OUTPUT_TOKENS_PER_CALL = 2_000
MAX_INPUT_CHARS_PER_CALL = 8_000


def estimate_cost_usd_openai(tier: str, input_tokens: int, output_tokens: int) -> float:
    """Custo CALCULADO a partir de tokens medidos — nunca uma cobrança
    confirmada pela OpenAI (mesma distinção que B2 da auditoria
    independente do PR #104 exigiu para a Anthropic em
    ``coordinator/costs.py``: só os tokens são "medidos"; o valor em
    dólar é sempre derivado de uma tabela de preço local)."""
    precos = _PRICE_PER_MTOK_USD.get(tier, _PRICE_PER_MTOK_USD[TIER_NORMAL])
    return (input_tokens / 1_000_000) * precos["input"] + (output_tokens / 1_000_000) * precos["output"]


@dataclass
class OpenAIUsageRecord:
    """Mesma superfície pública de ``coordinator.budget.UsageRecord``
    (``to_dict()``, ``event_key``, ``tier``) para reaproveitar
    ``UsageLedger``/``GitUsageLedger`` por duck typing — ver docstring do
    módulo. ``provider`` é sempre ``"openai"``, nunca lido de fora."""

    timestamp: str
    event_key: str
    tier: str  # "TERRA" | "SOL"
    model_id: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    provider: str = "openai"

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "timestamp": self.timestamp,
            "event_key": self.event_key,
            "tier": self.tier,
            "model_id": self.model_id,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "estimated_cost_usd": round(self.estimated_cost_usd, 6),
        }


@dataclass
class OpenAICallLimiter:
    """Issue #106: "No máximo: 1 chamada OpenAI principal por checkpoint +
    1 escalada Sol somente quando justificada." Duas contagens
    DISTINTAS e cada uma só pode ser usada uma vez — a escalada exige que
    a chamada principal já tenha acontecido (nunca escalar sem ter
    rodado Terra primeiro)."""

    max_output_tokens: int = MAX_OUTPUT_TOKENS_PER_CALL
    main_used: bool = False
    escalation_used: bool = False

    def can_call_main(self) -> bool:
        return not self.main_used

    def register_main_call(self) -> None:
        self.main_used = True

    def can_escalate(self) -> bool:
        """Só depois da chamada principal, e só uma vez."""
        return self.main_used and not self.escalation_used

    def register_escalation(self) -> None:
        self.escalation_used = True

    def clamp_tokens(self, requested_max_tokens: int) -> int:
        return min(requested_max_tokens, self.max_output_tokens)
