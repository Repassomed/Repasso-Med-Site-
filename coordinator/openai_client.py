"""Ponto único de chamada à OpenAI — espelha
``coordinator/anthropic_client.py``, mas com um portão a mais: além do
gate ENABLED (``openai_config.OpenAIAuditorConfig.gate()``) e do limitador
de chamadas por checkpoint (``openai_budget.OpenAICallLimiter``), ``call``
também confere o ORÇAMENTO INTERNO (Issue #106: "Antes de qualquer
chamada: check interno do orçamento OpenAI. Em 100%: zero novas chamadas
OpenAI.") — nunca confia só no hard cap externo configurado no dashboard
da própria OpenAI, porque esta PR não pode assumir que aquele cap por si
só é suficiente/imediato.

Ordem das checagens, sempre a mesma: (1) portão ENABLED, (2) orçamento
interno via ``coordinator.budget.check_budget`` contra o ledger PRÓPRIO da
OpenAI (nunca o da Anthropic), (3) limite de chamadas do checkpoint atual
(principal vs. escalada). Qualquer uma delas bloqueando é ``status=
"blocked"``/``"limited"`` — nunca uma exceção, nunca um retry.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Protocol

from .budget import UsageLedger, check_budget
from .openai_budget import OpenAICallLimiter, OpenAIUsageRecord, estimate_cost_usd_openai
from .openai_config import OpenAIAuditorConfig
from .redact import redact


@dataclass(frozen=True)
class Request:
    model_id: str
    tier: str  # "TERRA" | "SOL"
    max_output_tokens: int
    system: str
    prompt: str  # já deve vir de openai_audit.build_openai_audit_prompt — nunca o repo inteiro

    def to_dict(self) -> dict:
        return {
            "model_id": self.model_id,
            "tier": self.tier,
            "max_output_tokens": self.max_output_tokens,
            "system_chars": len(self.system),
            "prompt_chars": len(self.prompt),
        }


class Transport(Protocol):
    def send(self, request: Request) -> "TransportResponse": ...


@dataclass(frozen=True)
class TransportResponse:
    text: str
    input_tokens: int
    output_tokens: int


class NotConfiguredTransport:
    """Mesma trava de ``anthropic_client.NotConfiguredTransport``: se algo
    tentar chamar isto de verdade, falha alto e claro, em vez de
    silenciosamente fazer uma requisição HTTP."""

    def send(self, request: Request) -> TransportResponse:  # pragma: no cover - por design nunca deve rodar
        raise RuntimeError(
            "Nenhum Transport real do OpenAI Auditor foi configurado. Esta PR (Issue #106) "
            "não ativa a chamada de propósito — ligar isso é decisão futura e explícita de "
            "José, não algo que este código faz sozinho."
        )


def build_request(*, model_id: str, tier: str, system: str, prompt: str,
                   limiter: OpenAICallLimiter) -> Request:
    return Request(
        model_id=model_id,
        tier=tier,
        max_output_tokens=limiter.clamp_tokens(limiter.max_output_tokens),
        system=system,
        prompt=prompt,
    )


@dataclass(frozen=True)
class CallResult:
    status: str  # "blocked" | "ok" | "error" | "limited"
    reason: str
    text: str = ""
    usage: OpenAIUsageRecord | None = None

    def to_dict(self) -> dict:
        d = {"status": self.status, "reason": redact(self.reason), "text": redact(self.text)}
        if self.usage:
            d["usage"] = self.usage.to_dict()
        return d


def call(config: OpenAIAuditorConfig, request: Request, *, transport: Transport,
          limiter: OpenAICallLimiter, ledger: UsageLedger, event_key: str,
          escalation: bool = False) -> CallResult:
    """Ponto único de chamada à OpenAI. SEMPRE checa, nesta ordem: portão
    ENABLED, orçamento interno (hard stop em 100% do teto configurado),
    limite de chamadas do checkpoint (principal ou escalada)."""
    gate = config.gate()
    if not gate.open:
        return CallResult(status="blocked", reason=gate.reason)

    orcamento = check_budget(ledger, budget_usd=config.budget_usd)
    if orcamento.action == "stop":
        return CallResult(
            status="blocked",
            reason=(
                "Orçamento interno do OpenAI Auditor esgotado (hard stop em 100% do teto "
                f"configurado): {orcamento.message} Nenhuma chamada foi tentada — nunca confiar "
                "só no cap externo do dashboard da OpenAI (Issue #106)."
            ),
        )

    if escalation:
        if not limiter.can_escalate():
            return CallResult(
                status="limited",
                reason=(
                    "Escalada para o modelo de alto risco (Sol) não é permitida agora — ou a "
                    "chamada principal ainda não aconteceu neste checkpoint, ou a escalada já "
                    "foi usada (no máximo 1 por checkpoint, Issue #106)."
                ),
            )
    else:
        if not limiter.can_call_main():
            return CallResult(
                status="limited",
                reason="Limite de 1 chamada principal da OpenAI por checkpoint já atingido.",
            )

    if escalation:
        limiter.register_escalation()
    else:
        limiter.register_main_call()

    inicio = time.monotonic()
    try:
        resposta = transport.send(request)
    except Exception as exc:  # uma tentativa só; nunca um loop de retry
        duracao = time.monotonic() - inicio
        return CallResult(
            status="error",
            reason=f"Falha na chamada à OpenAI após {duracao:.2f}s (uma única tentativa, sem retry): {exc}",
        )

    custo = estimate_cost_usd_openai(request.tier, resposta.input_tokens, resposta.output_tokens)
    uso = OpenAIUsageRecord(
        timestamp=_now_iso(),
        event_key=event_key,
        tier=request.tier,
        model_id=request.model_id,
        input_tokens=resposta.input_tokens,
        output_tokens=resposta.output_tokens,
        estimated_cost_usd=custo,
    )
    return CallResult(status="ok", reason="Chamada à OpenAI concluída.", text=resposta.text, usage=uso)


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
