"""O único lugar deste pacote que teria permissão de tocar a rede — e que,
nesta V2, nunca toca.

Design deliberado para a Issue #95:

- ``build_request`` monta o corpo da chamada (sempre, mesmo com o portão
  fechado) — "preparar chamada Anthropic, mas bloqueada por ENABLED=false"
  é literal: a requisição é montada, só não é enviada.
- ``Transport`` é um Protocol — a interface de "algo que sabe enviar uma
  requisição e devolver uso/tokens". Esta V2 não importa nem depende do
  SDK oficial da Anthropic (nenhuma dependência nova, e nenhum jeito de
  acidentalmente chamar a API de verdade só por este código existir). Uma
  V3 que ligar ENABLED=true implementaria um ``Transport`` de verdade
  usando o SDK e injetaria aqui — a interface já está pronta para isso.
- ``call`` é o único ponto de entrada, e ele SEMPRE consulta
  ``Config.gate()`` primeiro. Se o portão estiver fechado, devolve
  ``BlockedResult`` sem jamais invocar ``transport``.
- Uma falha do transporte (timeout, erro, o que for) é UMA tentativa,
  nunca um retry automático — "erro de API não entra em loop" (Issue
  #95). Quem decide tentar de novo é uma execução seguinte do pipeline
  (outro evento, ou o mesmo evento reprocessado manualmente), nunca este
  método sozinho.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Protocol

from .budget import CallLimiter, UsageRecord, estimate_cost_usd
from .config import Config
from .models import ModelChoice
from .redact import redact


@dataclass(frozen=True)
class Request:
    model_id: str
    tier: str
    max_output_tokens: int
    system: str
    prompt: str  # já deve vir de context.MinimalContext — nunca o repo inteiro

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
    """Transporte padrão: se algo tentar chamá-lo de verdade, falha alto e
    claro, em vez de silenciosamente fazer uma requisição HTTP. Isto é uma
    segunda trava, além do portão do Config — mesmo que o portão fosse
    burlado por engano em código futuro, não existe SDK real conectado
    aqui para uma chamada de fato acontecer."""

    def send(self, request: Request) -> TransportResponse:  # pragma: no cover - por design nunca deve rodar
        raise RuntimeError(
            "Nenhum Transport real foi configurado. Esta V2 (Issue #95) não integra o "
            "SDK da Anthropic de propósito — ligar isso é decisão de uma rodada futura, "
            "não algo que deveria acontecer sozinho."
        )


def build_request(model_choice: ModelChoice, *, system: str, prompt: str,
                   limiter: CallLimiter) -> Request:
    return Request(
        model_id=model_choice.model_id,
        tier=model_choice.tier.value,
        max_output_tokens=limiter.clamp_tokens(limiter.max_output_tokens),
        system=system,
        prompt=prompt,
    )


@dataclass(frozen=True)
class CallResult:
    status: str  # "blocked" | "ok" | "error" | "limited"
    reason: str
    text: str = ""
    usage: UsageRecord | None = None

    def to_dict(self) -> dict:
        d = {"status": self.status, "reason": redact(self.reason), "text": redact(self.text)}
        if self.usage:
            d["usage"] = self.usage.to_dict()
        return d


def call(config: Config, request: Request, *, transport: Transport,
          limiter: CallLimiter, event_key: str) -> CallResult:
    """Ponto único de chamada. SEMPRE checa o portão primeiro."""
    gate = config.gate()
    if not gate.open:
        return CallResult(status="blocked", reason=gate.reason)

    if not limiter.can_call():
        return CallResult(
            status="limited",
            reason=f"Limite de {limiter.max_calls} chamada(s) por evento já atingido.",
        )

    limiter.register_call()
    inicio = time.monotonic()
    try:
        resposta = transport.send(request)
    except Exception as exc:  # uma tentativa só; nunca um loop de retry
        duracao = time.monotonic() - inicio
        return CallResult(
            status="error",
            reason=f"Falha na chamada após {duracao:.2f}s (uma única tentativa, sem retry): {exc}",
        )

    from .models import MODEL_IDS, ModelTier  # import local evita ciclo

    tier_enum = next((t for t, mid in MODEL_IDS.items() if mid == request.model_id), None)
    custo = (
        estimate_cost_usd(tier_enum, resposta.input_tokens, resposta.output_tokens)
        if tier_enum
        else 0.0
    )
    uso = UsageRecord(
        timestamp=_now_iso(),
        event_key=event_key,
        tier=request.tier,
        model_id=request.model_id,
        input_tokens=resposta.input_tokens,
        output_tokens=resposta.output_tokens,
        estimated_cost_usd=custo,
    )
    return CallResult(status="ok", reason="Chamada concluída.", text=resposta.text, usage=uso)


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
