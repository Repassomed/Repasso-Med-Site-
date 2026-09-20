"""Orquestrador do modo OBSERVE (Issue #95).

Ordem de decisão — cada passo pode encerrar o pipeline antes do próximo:

1. o evento é de um tipo permitido? (``events.ALLOWED_EVENT_TYPES``)
2. já foi processado (deduplicação)?
3. classificar tipo/prioridade (determinístico, sem API);
4. montar contexto mínimo (Guard/GitHub, nunca o repo inteiro);
5. escolher worker sugerido (registro, sem chamada);
6. decidir nível de modelo (FAST/STANDARD/DEEP, sem chamada);
7. checar orçamento (ledger local);
8. SÓ ENTÃO, se o portão (Config.gate) estiver aberto e o orçamento
   permitir, tentar uma chamada — que nesta V2 nunca acontece, porque
   ENABLED=false sempre fecha o portão primeiro.

O resultado final é sempre um ``ObserveResult`` com tipo, prioridade,
worker/modelo sugeridos e a próxima ação em português simples — mesmo
quando bloqueado, duplicado ou rejeitado.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .budget import BudgetStatus, CallLimiter, UsageLedger, check_budget, priority_allowed
from .classify import Classification, classify
from .config import Config
from .context import MinimalContext, build_context
from .dedup import Deduplicator
from .events import Event
from .routing import RoutingDecision, decide as route_decide
from .worker_registry import Worker, WorkerSuggestion, pick_worker


@dataclass(frozen=True)
class ObserveResult:
    status: str  # "REJECTED" | "DUPLICATE" | "BLOCKED" | "OBSERVED"
    reason: str
    task_type: str | None = None
    priority: str | None = None
    worker_suggestion: str | None = None
    model_suggestion: dict | None = None
    next_action: str = ""
    needs_input: bool = False
    requires_jose_authorization: bool = False
    context_summary: str | None = None
    call_attempted: bool = False

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "reason": self.reason,
            "task_type": self.task_type,
            "priority": self.priority,
            "worker_suggestion": self.worker_suggestion,
            "model_suggestion": self.model_suggestion,
            "next_action": self.next_action,
            "needs_input": self.needs_input,
            "requires_jose_authorization": self.requires_jose_authorization,
            "context_summary": self.context_summary,
            "call_attempted": self.call_attempted,
        }


def _next_action_text(classification: Classification, routing: RoutingDecision,
                       worker: WorkerSuggestion) -> str:
    if classification.needs_input:
        return "NEEDS-INPUT: registrar a limitação e aguardar decisão de José (Task Router #85)."
    if classification.requires_jose_authorization:
        return "Aguardar 'pode começar' explícito de José antes de qualquer execução (tipo C, Issue #85)."
    partes = [f"Classificar como tipo {classification.task_type.value}, prioridade {classification.priority.value}."]
    if worker.worker:
        partes.append(f"Sugerir {worker.worker} como worker.")
    else:
        partes.append("Nenhum worker FREE disponível agora — aguardar.")
    partes.append(f"Nível de modelo sugerido: {routing.model_choice.tier.value}.")
    if routing.needs_semantic_audit:
        partes.append("Exige auditoria semântica antes de MERGE-READY (Nível C, Issue #83).")
    if routing.escalate_recommended:
        partes.append(f"Recomenda-se escalar para DEEP: {routing.escalate_reason}")
    return " ".join(partes)


def observe(
    event: Event,
    *,
    config: Config,
    dedup: Deduplicator,
    ledger: UsageLedger,
    workers: list[Worker] | None = None,
    deep_enabled: bool = False,
) -> ObserveResult:
    # 1. Tipo de evento permitido?
    if not event.is_allowed:
        return ObserveResult(
            status="REJECTED",
            reason=f"Tipo de evento {event.raw_type!r} não está na lista permitida desta V2 (Issue #95).",
        )

    # 2. Deduplicação.
    chave = event.dedup_key()
    if dedup.is_duplicate(chave):
        return ObserveResult(
            status="DUPLICATE",
            reason=f"Evento já processado (chave {chave}) — nenhuma chamada nova.",
        )

    # 3. Classificação determinística (nunca precisa de API).
    classificacao = classify(event)

    # 4. Contexto mínimo.
    contexto = build_context(event)

    # 5. Worker sugerido.
    worker = pick_worker(workers or [], area_hint=event.payload.get("area"))

    # 6. Roteamento de modelo.
    roteamento = route_decide(event, classificacao, deep_enabled=deep_enabled)

    # 7. Orçamento.
    status_orcamento: BudgetStatus = check_budget(ledger)
    orcamento_permite = priority_allowed(status_orcamento, classificacao.priority)

    resultado_base = dict(
        task_type=classificacao.task_type.value,
        priority=classificacao.priority.value,
        worker_suggestion=worker.worker,
        model_suggestion=roteamento.to_dict(),
        needs_input=classificacao.needs_input,
        requires_jose_authorization=classificacao.requires_jose_authorization,
        context_summary=contexto.summary,
    )

    # 8. Portão de segurança — SEMPRE a última palavra sobre chamar ou não.
    gate = config.gate()
    if not gate.open:
        dedup.mark_processed(chave)
        return ObserveResult(
            status="BLOCKED",
            reason=gate.reason,
            next_action=_next_action_text(classificacao, roteamento, worker),
            call_attempted=False,
            **resultado_base,
        )

    if not orcamento_permite:
        dedup.mark_processed(chave)
        return ObserveResult(
            status="BLOCKED",
            reason=f"Orçamento: {status_orcamento.message}",
            next_action=_next_action_text(classificacao, roteamento, worker),
            call_attempted=False,
            **resultado_base,
        )

    # Portão aberto e orçamento permite: aqui, e só aqui, uma V3 chamaria
    # anthropic_client.call(...). Esta V2 marca o evento como processado
    # (para não reprocessar) e devolve OBSERVED sem chamada real — nenhum
    # Transport é injetado neste caminho, de propósito (ver anthropic_client.py).
    dedup.mark_processed(chave)
    return ObserveResult(
        status="OBSERVED",
        reason="Portão aberto e orçamento permite — mas esta V2 não injeta um Transport real.",
        next_action=_next_action_text(classificacao, roteamento, worker),
        call_attempted=False,
        **resultado_base,
    )
