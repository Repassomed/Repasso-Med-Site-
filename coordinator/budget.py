"""Limites de chamada/token e registro de uso/custo (Issue #84 §4, Issue #95).

Três coisas distintas, deliberadamente separadas:

1. ``CallLimiter``   — quantas chamadas um ÚNICO evento pode gerar (a
   Issue #95 pede "uma chamada por evento quando suficiente" e um teto de
   tokens por chamada).
2. ``UsageLedger``   — um registro append-only de uso reportado pela API
   (modelo, tokens, custo estimado) — "registrar modelo usado e
   tokens/custo quando a resposta da API fornecer usage" (#84 §4). Nesta
   V2 nunca recebe uso de verdade (ENABLED=false), mas a mecânica é
   testável com fixture/mock.
3. ``BudgetGuard``   — lê o total gasto no mês a partir do ledger e devolve
   a ação correspondente aos freios de #84 §4: 50% aviso, 75% reduz
   não-essencial, 90% só P0/P1, 100% para.

Preço por token: tabela oficial da Anthropic (mesma fonte usada em
``models.py``), só para ESTIMAR custo a partir de tokens — nunca para
decidir se uma chamada é permitida (isso é o portão em ``config.py``).
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .models import ModelTier

MAX_CALLS_PER_EVENT = 1
MAX_INPUT_TOKENS_PER_CALL = 8_000
MAX_OUTPUT_TOKENS_PER_CALL = 2_000

MONTHLY_BUDGET_USD = 20.0

# US$ por milhão de tokens — tabela oficial confirmada nesta mesma rodada
# (skill claude-api, tabela "Current Models"). Só usada para estimar
# custo a partir de usage.*_tokens; nunca decide se uma chamada roda.
_PRICE_PER_MTOK_USD: dict[ModelTier, dict[str, float]] = {
    ModelTier.FAST: {"input": 1.00, "output": 5.00},
    ModelTier.STANDARD: {"input": 2.00, "output": 10.00},
    ModelTier.DEEP: {"input": 5.00, "output": 25.00},
}


def estimate_cost_usd(tier: ModelTier, input_tokens: int, output_tokens: int) -> float:
    precos = _PRICE_PER_MTOK_USD[tier]
    return (input_tokens / 1_000_000) * precos["input"] + (output_tokens / 1_000_000) * precos["output"]


@dataclass
class CallLimiter:
    """Quantas chamadas o evento ATUAL já gastou, e o teto de token por chamada."""

    max_calls: int = MAX_CALLS_PER_EVENT
    max_input_tokens: int = MAX_INPUT_TOKENS_PER_CALL
    max_output_tokens: int = MAX_OUTPUT_TOKENS_PER_CALL
    calls_used: int = 0

    def can_call(self) -> bool:
        return self.calls_used < self.max_calls

    def register_call(self) -> None:
        self.calls_used += 1

    def clamp_tokens(self, requested_max_tokens: int) -> int:
        return min(requested_max_tokens, self.max_output_tokens)


@dataclass
class UsageRecord:
    timestamp: str
    event_key: str
    tier: str
    model_id: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "event_key": self.event_key,
            "tier": self.tier,
            "model_id": self.model_id,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "estimated_cost_usd": round(self.estimated_cost_usd, 6),
        }


class UsageLedger:
    """Registro append-only em JSON. Nunca grava texto de prompt/resposta —
    só metadados de uso — então não há segredo nem conteúdo médico aqui."""

    def __init__(self, path: str) -> None:
        self.path = path

    def _load(self) -> list[dict]:
        if not os.path.exists(self.path):
            return []
        try:
            with open(self.path, encoding="utf-8") as fh:
                dados = json.load(fh)
            return dados.get("records", [])
        except (json.JSONDecodeError, OSError):
            return []

    def append(self, record: UsageRecord) -> None:
        registros = self._load()
        registros.append(record.to_dict())
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as fh:
            json.dump({"records": registros}, fh, indent=2)

    def month_to_date_usd(self, *, now: datetime | None = None) -> float:
        agora = now or datetime.now(timezone.utc)
        prefixo_mes = agora.strftime("%Y-%m")
        total = 0.0
        for r in self._load():
            if str(r.get("timestamp", "")).startswith(prefixo_mes):
                total += float(r.get("estimated_cost_usd", 0.0))
        return total

    def all_records(self) -> list[dict]:
        return self._load()


@dataclass(frozen=True)
class BudgetStatus:
    spent_usd: float
    budget_usd: float
    ratio: float
    action: str  # "ok" | "warn" | "reduce_non_essential" | "p0_p1_only" | "stop"
    message: str


def check_budget(ledger: UsageLedger, *, budget_usd: float = MONTHLY_BUDGET_USD,
                  now: datetime | None = None) -> BudgetStatus:
    gasto = ledger.month_to_date_usd(now=now)
    razao = gasto / budget_usd if budget_usd > 0 else 1.0

    if razao >= 1.0:
        return BudgetStatus(gasto, budget_usd, razao, "stop",
                             "100% do teto mensal atingido — nenhuma chamada paga a mais este mês.")
    if razao >= 0.90:
        return BudgetStatus(gasto, budget_usd, razao, "p0_p1_only",
                             "90% do teto: só P0/P1 podem gerar chamada.")
    if razao >= 0.75:
        return BudgetStatus(gasto, budget_usd, razao, "reduce_non_essential",
                             "75% do teto: reduzir chamadas STANDARD não essenciais.")
    if razao >= 0.50:
        return BudgetStatus(gasto, budget_usd, razao, "warn",
                             "50% do teto: aviso registrado, sem restrição ainda.")
    return BudgetStatus(gasto, budget_usd, razao, "ok", "Dentro do orçamento, sem restrição.")


def priority_allowed(status: BudgetStatus, priority) -> bool:
    """``priority`` é um ``classify.Priority``. P0/P1 sempre passam no pior
    caso (freio 90%); só o freio 100% bloqueia tudo."""
    from .classify import Priority  # import local evita ciclo em tempo de import

    if status.action == "stop":
        return False
    if status.action == "p0_p1_only":
        return priority in (Priority.P0, Priority.P1)
    return True
