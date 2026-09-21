"""Ponto único de chamada à OpenAI — espelha
``coordinator/anthropic_client.py``, mas com dois portões a mais: além do
gate ENABLED (``openai_config.OpenAIAuditorConfig.gate()``, que também
valida o model_id — achado B1) e do limitador de chamadas por checkpoint
(``openai_budget.OpenAICallLimiter``), ``call`` reserva o ORÇAMENTO
INTERNO de forma ATÔMICA e CONSERVADORA — ANTES de qualquer chamada
acontecer, nunca depois.

**Correção B2 da auditoria independente do PR #107 ("hard budget ainda
pode ser ultrapassado").** A versão anterior só bloqueava quando o gasto
JÁ estava em 100% do teto — um "stop-after-crossing", não um hard cap: com
US$4.99 gastos e uma chamada de US$0.03, o mês terminava em US$5.02. Agora,
ANTES de qualquer chamada, esta função:

1. calcula o TETO CONSERVADOR daquela chamada específica (pior caso de
   tokens de entrada/saída — ``openai_budget.conservative_call_cost_usd``);
2. confere se ``gasto_atual + teto_conservador`` ainda caberia dentro do
   orçamento — se não, ``status="blocked"``, ZERO chamada;
3. só então GRAVA essa reserva no ledger (``kind="reservation"``) — e só
   depois disso tenta a chamada de verdade.

A gravação da reserva usa o MESMO mecanismo atômico (compare-and-swap via
git, em produção) que ``coordinator/dedup.py``/``git_state.py`` já usam
para "duas execuções concorrentes não podem ambas vencer a corrida" — ver
o comentário lá. Como a reserva é gravada ANTES da chamada, uma SEGUNDA
execução concorrente que leia o ledger um instante depois já vê o gasto
reservado pela primeira, então as duas juntas nunca ultrapassam o teto
(cada uma reserva seu próprio pior caso contra o saldo já reduzido pela
outra).

**Correção B3 da auditoria independente do PR #107 ("falha ao persistir o
ledger é engolida silenciosamente").** Como a reserva já foi persistida
ANTES da chamada, o gasto de uma chamada bem-sucedida NUNCA pode
"desaparecer" — na pior das hipóteses (a correção pós-chamada falha em
persistir), o ledger fica com o valor CONSERVADOR (tipicamente maior que o
real) em vez do valor exato — nunca com um valor menor/ausente. Mesmo
assim, uma falha em persistir a correção final é sinalizada explicitamente
como ``status="ok_ledger_failed"`` (mesmo nome que o pipeline Anthropic já
usa em ``observe.py``) — nunca um ``except Exception: pass`` silencioso —
para que quem chama trate a auditoria como fail-closed (NEEDS-FIX, sem
escalada) quando isso acontecer.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Protocol

from .budget import UsageLedger
from .openai_budget import OpenAICallLimiter, OpenAIUsageRecord, conservative_call_cost_usd, estimate_cost_usd_openai
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
    status: str  # "blocked" | "ok" | "ok_ledger_failed" | "error" | "limited"
    reason: str
    text: str = ""
    usage: OpenAIUsageRecord | None = None

    def to_dict(self) -> dict:
        d = {"status": self.status, "reason": redact(self.reason), "text": redact(self.text)}
        if self.usage:
            d["usage"] = self.usage.to_dict()
        return d


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def _tentar_gravar(ledger: UsageLedger, record: OpenAIUsageRecord) -> tuple[bool, str | None]:
    """Nunca lança — devolve (persistiu, erro_sanitizado). Usado tanto
    para a reserva quanto para a correção/liberação, para que uma falha de
    persistência vire sinal explícito em vez de exceção não tratada."""
    try:
        ledger.append(record)
        return True, None
    except Exception as exc:  # noqa: BLE001 — ponto de borda deliberado, mesma filosofia do resto do pacote
        return False, redact(f"{type(exc).__name__}: {exc}")


def call(config: OpenAIAuditorConfig, request: Request, *, transport: Transport,
          limiter: OpenAICallLimiter, ledger: UsageLedger, event_key: str,
          escalation: bool = False) -> CallResult:
    """Ponto único de chamada à OpenAI. Ordem sempre a mesma: (1) portão
    ENABLED + model_id suportado, (2) limite de chamadas do checkpoint
    (principal ou escalada), (3) reserva ATÔMICA e CONSERVADORA do
    orçamento — hard cap real, checado e GRAVADO antes de qualquer
    chamada —, (4) a chamada em si, (5) correção da reserva para o custo
    real (fail-closed e explícito se isso não persistir)."""
    gate = config.gate()
    if not gate.open:
        return CallResult(status="blocked", reason=gate.reason)

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

    # Correção B2: teto CONSERVADOR desta chamada (pior caso de tokens),
    # checado E RESERVADO antes de qualquer chamada — nunca só depois que
    # o gasto real já cruzou o teto.
    try:
        custo_reservado = conservative_call_cost_usd(request.model_id, max_output_tokens=request.max_output_tokens)
    except ValueError as exc:
        # model_id não suportado — já deveria ter sido barrado por
        # config.gate() acima; segunda camada de defesa (achado B1).
        return CallResult(status="blocked", reason=redact(str(exc)))

    gasto_atual = ledger.month_to_date_usd()
    if gasto_atual + custo_reservado > config.budget_usd:
        return CallResult(
            status="blocked",
            reason=(
                f"Orçamento interno do OpenAI Auditor: gasto atual US$ {gasto_atual:.6f} + teto "
                f"conservador desta chamada US$ {custo_reservado:.6f} ultrapassaria o limite de "
                f"US$ {config.budget_usd:.2f}. Nenhuma chamada foi tentada — hard cap real, "
                "checado ANTES do envio, nunca só depois que o gasto já cruzou o teto (achado B2, "
                "auditoria independente do PR #107)."
            ),
        )

    registro_reserva = OpenAIUsageRecord(
        timestamp=_now_iso(), event_key=event_key, tier=request.tier, model_id=request.model_id,
        input_tokens=0, output_tokens=0, estimated_cost_usd=custo_reservado, kind="reservation",
    )
    reservou, erro_reserva = _tentar_gravar(ledger, registro_reserva)
    if not reservou:
        # Fail-closed: se nem a RESERVA consegue ser gravada, não há
        # garantia nenhuma de hard cap — melhor não tentar a chamada do
        # que arriscar gastar sem registro nenhum (achado B2 aplicado
        # também ao próprio passo de reserva).
        return CallResult(
            status="blocked",
            reason=(
                "Não foi possível reservar orçamento (falha ao persistir no ledger do OpenAI "
                f"Auditor) — nenhuma chamada foi tentada: {erro_reserva}"
            ),
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
        # A chamada nunca aconteceu de verdade (nenhum token consumido) —
        # libera 100% da reserva. Se a própria liberação falhar, o ledger
        # fica temporariamente SUPERESTIMADO (nunca subestimado) — direção
        # seguramente conservadora, ao contrário de uma correção que
        # falhasse depois de uma chamada bem-sucedida (ver abaixo).
        _tentar_gravar(ledger, OpenAIUsageRecord(
            timestamp=_now_iso(), event_key=event_key, tier=request.tier, model_id=request.model_id,
            input_tokens=0, output_tokens=0, estimated_cost_usd=-custo_reservado, kind="correction",
        ))
        return CallResult(
            status="error",
            reason=f"Falha na chamada à OpenAI após {duracao:.2f}s (uma única tentativa, sem retry): {exc}",
        )

    custo_real = estimate_cost_usd_openai(request.model_id, resposta.input_tokens, resposta.output_tokens)
    uso = OpenAIUsageRecord(
        timestamp=_now_iso(), event_key=event_key, tier=request.tier, model_id=request.model_id,
        input_tokens=resposta.input_tokens, output_tokens=resposta.output_tokens,
        estimated_cost_usd=custo_real, kind="usage",
    )

    # Correção B3: acerta a reserva (que já vale o teto CONSERVADOR, quase
    # sempre maior que o real) para o custo VERDADEIRO desta chamada — o
    # delta pode ser negativo (o caso comum) ou, em tese, zero.
    corrigiu, erro_correcao = _tentar_gravar(ledger, OpenAIUsageRecord(
        timestamp=_now_iso(), event_key=event_key, tier=request.tier, model_id=request.model_id,
        input_tokens=0, output_tokens=0, estimated_cost_usd=(custo_real - custo_reservado), kind="correction",
    ))
    if not corrigiu:
        # A chamada PAGA já aconteceu — nunca "desaparece" do ledger,
        # porque a reserva (valor conservador) já está persistida. Mas a
        # correção para o valor exato falhou, então o estado compartilhado
        # fica impreciso (superestimado, nunca subestimado) até a próxima
        # execução corrigir. Sinaliza explicitamente para o chamador tratar
        # como fail-closed (NEEDS-FIX, sem escalada) — nunca um
        # `except Exception: pass` silencioso (achado B3).
        return CallResult(
            status="ok_ledger_failed",
            reason=(
                "Chamada à OpenAI concluída com sucesso, mas a correção do ledger de custo não "
                f"pôde ser persistida: {erro_correcao}"
            ),
            text=resposta.text, usage=uso,
        )

    return CallResult(status="ok", reason="Chamada à OpenAI concluída.", text=resposta.text, usage=uso)
