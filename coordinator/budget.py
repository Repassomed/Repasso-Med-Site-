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
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol

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


# Achado F9-A (Issue #105, Fase F, 8ª rodada): mesmo princípio de
# ``coordinator.openai_budget.conservative_input_tokens_ceiling`` e do teto
# que ``runner_generate.py`` já usa para o Worker Runner (achado F8-C) —
# contagem de BYTES UTF-8 (nunca de caracteres) é uma cota superior
# MATEMÁTICA sobre o número de tokens que QUALQUER tokenizador BPE
# byte-level produz (nunca menos de 1 token por byte). Público AQUI (não
# mais privado a um único módulo) porque TODO caminho Anthropic pago
# precisa do MESMO princípio de reserva conservadora contra o MESMO
# ledger global ``coordinator-state-usage`` — o Coordinator OBSERVE
# (``observe.py``, achado F9-A) e o Worker Runner (``runner_generate.py``,
# achado F8-C, que mantém sua própria cópia privada equivalente — nunca
# reimportada daqui nesta rodada para não reabrir um arquivo já auditado
# sem necessidade).
STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE = 64


def conservative_input_tokens_ceiling(system: str, prompt: str) -> int:
    """Teto de tokens de entrada comprovadamente NÃO-subestimador para
    ``system + prompt`` — nunca menor que a contagem real de tokens que a
    API vai processar, para QUALQUER idioma/script (mesma justificativa
    de ``openai_budget.conservative_input_tokens_ceiling``)."""
    payload_bytes = len((system + prompt).encode("utf-8"))
    return payload_bytes + STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE


def conservative_call_cost_usd(tier: ModelTier, *, system: str, prompt: str, max_output_tokens: int) -> float:
    """Teto CONSERVADOR (pior caso) do custo de UMA chamada, calculado
    ANTES de qualquer chamada acontecer — usa o teto de tokens de entrada
    acima e o limite MÁXIMO de tokens de saída permitidos por chamada
    (nunca os tokens reais de resposta, que só a API sabe depois)."""
    tokens_entrada = conservative_input_tokens_ceiling(system, prompt)
    return estimate_cost_usd(tier, tokens_entrada, max_output_tokens)


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
    # Achado F8-C (Issue #105, Fase F, 7ª rodada): campo ADITIVO, opcional,
    # default "usage" — preserva o formato de todo registro já existente
    # (Coordinator OBSERVE via ``anthropic_client.call``, que nunca
    # preenche isto explicitamente). ``coordinator/runner_generate.py``
    # passou a usar o MESMO ``UsageRecord``/``UsageLedger``/
    # ``GitUsageLedger`` — nunca um tipo/mecanismo paralelo — para o
    # padrão "reserva conservadora atômica -> chamada -> correção ->
    # registro informativo" (mesmo espírito de
    # ``coordinator.openai_budget.OpenAIUsageRecord.kind``, sem duplicar
    # nenhuma lógica de lá): "reservation" (reserva do teto conservador,
    # gravada ANTES da chamada), "correction" (ajusta a reserva para o
    # custo real depois, delta pode ser negativo) ou "usage" (registro
    # histórico informativo, não soma de novo — ver
    # ``informational_cost_usd``). ``month_to_date_usd()``/
    # ``reserve_if_within_budget()`` continuam somando só
    # ``estimated_cost_usd``, sempre — ``kind`` nunca muda essa soma,
    # só rotula o PAPEL de cada registro para quem lê/audita depois.
    kind: str = "usage"
    informational_cost_usd: float | None = None

    def to_dict(self) -> dict:
        d = {
            "timestamp": self.timestamp,
            "event_key": self.event_key,
            "tier": self.tier,
            "model_id": self.model_id,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "estimated_cost_usd": round(self.estimated_cost_usd, 6),
            "kind": self.kind,
        }
        if self.informational_cost_usd is not None:
            d["informational_cost_usd"] = round(self.informational_cost_usd, 6)
        return d


class _CostRecordLike(Protocol):
    """Forma mínima que ``reserve_if_within_budget`` precisa de um
    registro candidato — tanto ``UsageRecord`` (Anthropic) quanto
    ``coordinator.openai_budget.OpenAIUsageRecord`` já satisfazem isto
    por duck typing, sem nenhum import cruzado."""

    estimated_cost_usd: float

    def to_dict(self) -> dict: ...


class UsageLedger:
    """Registro append-only em JSON. Nunca grava texto de prompt/resposta —
    só metadados de uso — então não há segredo nem conteúdo médico aqui."""

    def __init__(self, path: str) -> None:
        self.path = path
        # Achado B7 da auditoria independente do PR #107 (rodada 2, sobre
        # o OpenAI Auditor): "checar orçamento" e "gravar a reserva"
        # precisam ser UMA operação atômica, nunca duas chamadas
        # separadas com uma janela de corrida entre elas. Este lock cobre
        # a concorrência DENTRO do mesmo processo (múltiplas threads
        # compartilhando a mesma instância); concorrência ENTRE processos
        #/runners independentes é responsabilidade de
        # ``git_state.GitUsageLedger`` (CAS via git), que implementa o
        # mesmo método com a mesma semântica.
        self._lock = threading.Lock()

    def _load(self) -> list[dict]:
        if not os.path.exists(self.path):
            return []
        try:
            with open(self.path, encoding="utf-8") as fh:
                dados = json.load(fh)
            return dados.get("records", [])
        except (json.JSONDecodeError, OSError):
            return []

    def _save(self, registros: list[dict]) -> None:
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as fh:
            json.dump({"records": registros}, fh, indent=2)

    def append(self, record: UsageRecord) -> None:
        with self._lock:
            registros = self._load()
            registros.append(record.to_dict())
            self._save(registros)

    def month_to_date_usd(self, *, now: datetime | None = None) -> float:
        agora = now or datetime.now(timezone.utc)
        prefixo_mes = agora.strftime("%Y-%m")
        total = 0.0
        for r in self._load():
            if str(r.get("timestamp", "")).startswith(prefixo_mes):
                total += float(r.get("estimated_cost_usd", 0.0))
        return total

    def reserve_if_within_budget(self, candidate: _CostRecordLike, *, budget_usd: float,
                                  now: datetime | None = None) -> bool:
        """Achado B7 da auditoria independente do PR #107: checa
        "``month_to_date_usd() + candidate.estimated_cost_usd`` ainda cabe
        no orçamento?" e, se sim, JÁ GRAVA ``candidate`` — tudo sob o
        MESMO lock, sem nenhuma leitura de orçamento exposta ao chamador
        entre o check e o append (a janela que ``openai_client.call()``
        deixava aberta antes desta correção). Devolve ``True`` só quando
        a reserva foi de fato aceita e persistida; ``False`` quando não
        coube — nesse caso nada é gravado."""
        with self._lock:
            registros = self._load()
            agora = now or datetime.now(timezone.utc)
            prefixo_mes = agora.strftime("%Y-%m")
            gasto_atual = sum(
                float(r.get("estimated_cost_usd", 0.0))
                for r in registros
                if str(r.get("timestamp", "")).startswith(prefixo_mes)
            )
            if gasto_atual + candidate.estimated_cost_usd > budget_usd:
                return False
            registros.append(candidate.to_dict())
            self._save(registros)
            return True

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
