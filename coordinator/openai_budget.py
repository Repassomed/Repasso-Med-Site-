"""Ledger e limites de chamada do OpenAI Auditor — SEPARADO do ledger da
Anthropic (Issue #106: "Criar ledger OpenAI SEPARADO do ledger
Anthropic").

Deliberadamente reaproveita a MECÂNICA de persistência já existente
(``coordinator.budget.UsageLedger``/``coordinator.git_state.GitUsageLedger``)
em vez de reescrevê-la: as duas classes só chamam ``record.to_dict()``/leem
``record.event_key``/``record.tier`` no registro que recebem (duck typing),
então ``OpenAIUsageRecord`` (definido aqui, com ``provider="openai"``
sempre) é 100% compatível — o que garante a separação exigida é apontar
essas mesmas classes para um ARQUIVO/BRANCH diferente (nunca o mesmo
caminho do ledger Anthropic), o que ``coordinator/__main__.py`` faz via
``--openai-usage-ledger``/``--openai-usage-git-remote``/
``--openai-usage-git-branch`` — nunca a mesma instância, nunca o mesmo
arquivo.

**Correção B1 da auditoria independente do PR #107.** A tabela de preço
anterior era um PLACEHOLDER declarado (US$1.25/US$10.00 para Terra,
US$5.00/US$20.00 para Sol) e, pior, ``estimate_cost_usd_openai`` caía
silenciosamente no preço de Terra (``.get(tier, _PRICE_PER_MTOK_USD[
TIER_NORMAL])``) para QUALQUER rótulo de tier desconhecido — ou seja, um
``model_id``/tier arbitrário nunca produzia um erro, só um preço errado
sem aviso nenhum. Agora a tabela é indexada por ``model_id`` (não por
"papel lógico" TERRA/SOL) com os preços oficiais atuais, e
``estimate_cost_usd_openai`` LEVANTA ``ValueError`` para qualquer
``model_id`` fora de ``SUPPORTED_MODELS`` — nunca estima o custo de um
modelo que não está explicitamente cadastrado aqui. Isso também é
verificado de novo em ``coordinator/openai_config.py::
OpenAIAuditorConfig.gate()`` (defesa em profundidade: um ``model``/
``high_risk_model`` mal configurado nas Variables do GitHub nunca chega
perto de uma chamada real).

Fontes oficiais dos preços (confirmadas na auditoria independente do PR
#107, 21/09/2026):
    https://developers.openai.com/api/docs/models/gpt-5.6-terra
    https://developers.openai.com/api/docs/models/gpt-5.6-sol
"""

from __future__ import annotations

from dataclasses import dataclass

# Nível lógico -> usado só para roteamento/relatório (qual "papel" a
# chamada exerceu), NUNCA para calcular preço — ver a correção B1 acima.
TIER_NORMAL = "TERRA"
TIER_HIGH_RISK = "SOL"

# US$ por milhão de tokens, por model_id EXATO — únicos modelos que esta
# implementação sabe precificar. Qualquer outro model_id é um erro
# (ValueError), nunca um cálculo aproximado.
SUPPORTED_MODELS: dict[str, dict[str, float]] = {
    "gpt-5.6-terra": {"input": 2.00, "output": 12.00},
    "gpt-5.6-sol": {"input": 4.00, "output": 20.00},
}

MAX_OUTPUT_TOKENS_PER_CALL = 2_000
MAX_INPUT_CHARS_PER_CALL = 8_000

# Correção B2 da auditoria independente do PR #107 ("hard budget"
# precisa reservar ANTES da chamada, usando um teto CONSERVADOR de
# tokens de entrada — nunca os tokens reais, que só a API sabe depois).
# Espelha ``coordinator.openai_audit.MAX_AUDIT_PROMPT_CHARS`` (o prompt
# nunca passa desse tamanho em caracteres) tratando cada caractere como
# >= 1 token — um superestimador deliberado e seguro: a proporção real
# de caracteres por token de qualquer tokenizador atual é sempre >= 1,
# então isto nunca SUBESTIMA o custo máximo possível de uma chamada.
MAX_INPUT_TOKENS_CONSERVATIVE = 16_000


def estimate_cost_usd_openai(model_id: str, input_tokens: int, output_tokens: int) -> float:
    """Custo CALCULADO a partir de tokens medidos — nunca uma cobrança
    confirmada pela OpenAI (mesma distinção que B2 da auditoria
    independente do PR #104 exigiu para a Anthropic em
    ``coordinator/costs.py``: só os tokens são "medidos"; o valor em
    dólar é sempre derivado de uma tabela de preço local).

    Levanta ``ValueError`` para qualquer ``model_id`` fora de
    ``SUPPORTED_MODELS`` — correção B1: nunca estimar o preço de um
    modelo arbitrário caindo silenciosamente no preço de outro."""
    precos = SUPPORTED_MODELS.get(model_id)
    if precos is None:
        raise ValueError(
            f"model_id {model_id!r} não está em SUPPORTED_MODELS "
            f"({sorted(SUPPORTED_MODELS)!r}) — nunca calcular custo de um modelo não cadastrado "
            "(achado B1, auditoria independente do PR #107)."
        )
    return (input_tokens / 1_000_000) * precos["input"] + (output_tokens / 1_000_000) * precos["output"]


def conservative_call_cost_usd(model_id: str, *, max_output_tokens: int = MAX_OUTPUT_TOKENS_PER_CALL) -> float:
    """Teto CONSERVADOR (pior caso) do custo de UMA chamada, calculado
    ANTES de qualquer chamada acontecer — usa o limite máximo de tokens
    de entrada/saída permitidos por chamada, nunca os tokens reais.

    Correção B2 da auditoria independente do PR #107: o hard budget
    precisa reservar orçamento suficiente para o PIOR CASO antes de
    enviar qualquer coisa, não só bloquear depois que o gasto real já
    ultrapassou o teto (isso era um "stop-after-crossing", não um hard
    cap)."""
    return estimate_cost_usd_openai(model_id, MAX_INPUT_TOKENS_CONSERVATIVE, max_output_tokens)


@dataclass
class OpenAIUsageRecord:
    """Mesma superfície pública de ``coordinator.budget.UsageRecord``
    (``to_dict()``, ``event_key``, ``tier``) para reaproveitar
    ``UsageLedger``/``GitUsageLedger`` por duck typing — ver docstring do
    módulo. ``provider`` é sempre ``"openai"``, nunca lido de fora.

    ``kind`` (correção B2/B3, auditoria independente do PR #107) marca o
    PAPEL do registro na reserva atômica de orçamento — nunca muda como
    ``estimated_cost_usd`` entra na soma de ``month_to_date_usd()``
    (continua sendo uma soma simples; um registro de correção pode ter
    valor NEGATIVO de propósito, para acertar uma reserva feita antes da
    chamada terminar):

    - ``"reservation"`` — reserva do teto CONSERVADOR, gravada ANTES da
      chamada (hard cap real, nunca "stop-after-crossing");
    - ``"correction"``  — ajusta a reserva para o custo REAL depois que a
      chamada terminou (ou libera 100% da reserva, se a chamada nunca
      consumiu tokens de verdade);
    - ``"usage"``        — registro histórico do uso real desta chamada,
      só para leitura/relatório (não soma de novo: seu valor já está
      refletido pela reserva + correção acima; ver
      ``coordinator/openai_client.py::call``)."""

    timestamp: str
    event_key: str
    tier: str  # "TERRA" | "SOL"
    model_id: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    provider: str = "openai"
    kind: str = "usage"

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "kind": self.kind,
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
