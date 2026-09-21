"""Orquestrador do modo OBSERVE (Issue #95).

Ordem de decisão — cada passo pode encerrar o pipeline antes do próximo:

1. o evento é de um tipo permitido? (``events.ALLOWED_EVENT_TYPES``)
2. já foi processado (deduplicação)?
3. classificar tipo/prioridade (determinístico, sem API);
4. montar contexto mínimo (Guard/GitHub, nunca o repo inteiro);
5. escolher worker sugerido (registro, sem chamada);
6. decidir nível de modelo (FAST/STANDARD/DEEP, sem chamada);
7. checar orçamento (ledger, local ou compartilhado — ver git_state.py);
8. SÓ ENTÃO, se o portão (Config.gate) estiver aberto e o orçamento
   permitir, ``anthropic_client.call`` é de fato invocado — com um
   Transport real por padrão (``anthropic_transport.AnthropicTransport``).
   Continua inerte nesta V2 porque ``ENABLED=false`` sempre fecha o
   portão primeiro; a chamada em si só acontece quando isso deixar de
   ser verdade (decisão de José, não deste código).

**Correção pós-auditoria do PR #97 (bloqueador 1):** antes, este módulo
nunca chegava a chamar ``anthropic_client.call`` — o caminho parava em
"portão aberto, mas nenhum Transport injetado". Agora o caminho real
existe de ponta a ponta; o que continua impedindo uma chamada de
acontecer é só o portão (``Config.gate``), exatamente como deveria ser.

O resultado final é sempre um ``ObserveResult`` com tipo, prioridade,
worker/modelo sugeridos e a próxima ação em português simples — mesmo
quando bloqueado, duplicado ou rejeitado.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import anthropic_client
from .anthropic_transport import AnthropicTransport
from .budget import BudgetStatus, CallLimiter, UsageLedger, check_budget, priority_allowed
from .classify import Classification, classify
from .config import Config
from .context import MinimalContext, build_context
from .dedup import Deduplicator
from .events import Event
from .redact import redact
from .routing import RoutingDecision, decide as route_decide
from .worker_registry import Worker, WorkerSuggestion, pick_worker

MAX_PROMPT_CHARS = 6_000


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
    call_status: str | None = None  # "ok" | "error" | "limited" | "ok_ledger_failed" | None (nunca tentada)
    response_text: str | None = None
    usage: dict | None = None

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
            "call_status": self.call_status,
            "response_text": self.response_text,
            "usage": self.usage,
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
    # Item 4 do "PACOTE CONSOLIDADO" (PR #97): quando load_workers_from_
    # tasks_json() encontra um agente com >1 tarefa ativa simultânea, o
    # Worker Registry devolve CONFLICT (nunca FREE, nunca a primeira tarefa
    # escolhida em silêncio) — mas isso só é útil se chegar até o humano.
    # worker.conflict_warning carrega esse aviso; aparece aqui mesmo quando
    # um OUTRO worker foi sugerido normalmente, porque o problema é no
    # registro (coordination/tasks.json), não na escolha feita para este evento.
    if worker.conflict_warning:
        partes.append(worker.conflict_warning)
    partes.append(f"Nível de modelo sugerido: {routing.model_choice.tier.value}.")
    if routing.needs_semantic_audit:
        partes.append("Exige auditoria semântica antes de MERGE-READY (Nível C, Issue #83).")
    if routing.escalate_recommended:
        partes.append(f"Recomenda-se escalar para DEEP: {routing.escalate_reason}")
    return " ".join(partes)


def _build_prompt(contexto: MinimalContext) -> str:
    """Prompt mínimo a partir do contexto — nunca o repositório inteiro."""
    partes = [contexto.summary]
    if contexto.guard_result:
        partes.append(f"Resultado do Guard: {contexto.guard_result}")
    if contexto.guard_hard_fails:
        partes.append("HARD FAILs: " + "; ".join(contexto.guard_hard_fails))
    if contexto.guard_warnings:
        partes.append("Avisos: " + "; ".join(contexto.guard_warnings))
    prompt = "\n".join(partes)
    if len(prompt) > MAX_PROMPT_CHARS:
        prompt = prompt[:MAX_PROMPT_CHARS] + "\n… [cortado]"
    return prompt


_SYSTEM_PROMPT = (
    "Você é o Repasso Coordinator, em modo OBSERVE. Classifique o evento e "
    "resuma o que um humano (José) precisa saber em 3 frases no máximo, em "
    "português simples. Nunca decida correção científica sozinho. Nunca "
    "proponha merge ou edição direta de matéria/Supabase/produção."
)


def observe(
    event: Event,
    *,
    config: Config,
    dedup: Deduplicator,
    ledger: UsageLedger,
    workers: list[Worker] | None = None,
    deep_enabled: bool = False,
    transport: anthropic_client.Transport | None = None,
) -> ObserveResult:
    # 1. Tipo de evento permitido?
    if not event.is_allowed:
        return ObserveResult(
            status="REJECTED",
            reason=f"Tipo de evento {event.raw_type!r} não está na lista permitida desta V2 (Issue #95).",
        )

    # 2. Deduplicação — CLAIM atômico (item 1 do "PACOTE CONSOLIDADO",
    # PR #97). Antes, esta decisão era is_duplicate() (uma leitura) e só
    # muito mais tarde, depois de classify/context/worker/routing/budget,
    # mark_processed() (uma escrita) — duas operações git INDEPENDENTES
    # em GitDedupStore. Duas execuções concorrentes do mesmo evento podiam
    # as duas ler "não visto" antes de qualquer uma escrever, e as duas
    # chegarem à chamada paga. dedup.claim(chave) funde check-and-set num
    # único ponto atômico: só a execução que realmente vence a corrida
    # recebe True (ver GitJsonStore.claim_key para como isso é garantido
    # mesmo entre processos/runners totalmente independentes); qualquer
    # outra — concorrente ou posterior — recebe False aqui, ANTES de
    # tocar classify/context/budget/pilot ou o transporte real.
    chave = event.dedup_key()
    if not dedup.claim(chave):
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
    # Nenhum destes três caminhos BLOCKED chama dedup.mark_processed() de
    # novo — o claim() do passo 2 já registrou este evento como
    # processado, atomicamente, antes de chegarmos aqui.
    gate = config.gate()
    if not gate.open:
        return ObserveResult(
            status="BLOCKED",
            reason=gate.reason,
            next_action=_next_action_text(classificacao, roteamento, worker),
            call_attempted=False,
            **resultado_base,
        )

    if not orcamento_permite:
        return ObserveResult(
            status="BLOCKED",
            reason=f"Orçamento: {status_orcamento.message}",
            next_action=_next_action_text(classificacao, roteamento, worker),
            call_attempted=False,
            **resultado_base,
        )

    # Modo PILOTO (bloqueador 3 da 3ª auditoria do PR #97) — camada adicional,
    # só restringe, nunca afrouxa o portão ENABLED/MODE acima. Enquanto
    # PILOT=true, só a chave exata autorizada pode passar daqui — qualquer
    # outro evento automático (mesmo de tipo permitido, mesmo com orçamento
    # OK) fica bloqueado, garantindo tecnicamente "exatamente um evento
    # controlado" no primeiro teste real.
    if not config.pilot_allows(chave):
        return ObserveResult(
            status="BLOCKED",
            reason=(
                f"PILOT ativo: só o evento autorizado ({config.pilot_event_key!r}) pode "
                f"gerar chamada; este evento é {chave!r}."
            ),
            next_action=_next_action_text(classificacao, roteamento, worker),
            call_attempted=False,
            **resultado_base,
        )

    # Portão aberto, orçamento permite e (se PILOT ativo) é o evento
    # autorizado: agora sim, uma chamada real é tentada. O evento já foi
    # marcado como processado no claim() atômico do passo 2 — antes desta
    # correção, o "marcar como processado" era feito só AQUI (uma escrita
    # separada da leitura de duplicata), o que deixava a janela de corrida
    # do item 1. Marcar cedo (dentro do claim) continua garantindo que uma
    # falha/crash no meio da chamada nunca resulte numa segunda tentativa
    # para o mesmo evento (Issue #95: "evento repetido não gera nova
    # chamada" vale acima de "recuperar de uma falha").
    limitador = CallLimiter()
    pedido = anthropic_client.build_request(
        roteamento.model_choice,
        system=_SYSTEM_PROMPT,
        prompt=_build_prompt(contexto),
        limiter=limitador,
    )
    transporte_real = transport if transport is not None else AnthropicTransport()
    resultado_chamada = anthropic_client.call(
        config, pedido, transport=transporte_real, limiter=limitador, event_key=chave,
    )

    # .to_dict() é quem sanitiza reason/text via redact() — nunca ler os
    # atributos crus de CallResult para fora deste módulo (foi exatamente
    # esse desvio que deixou uma chave falsa vazar num teste antes desta
    # correção).
    chamada_sanitizada = resultado_chamada.to_dict()

    if resultado_chamada.status == "ok" and resultado_chamada.usage is not None:
        try:
            ledger.append(resultado_chamada.usage)
        except Exception as exc:
            # Achado da auditoria final do PR #97: a chamada JÁ aconteceu e
            # teve sucesso — isto é uma falha de PERSISTÊNCIA depois do
            # fato (ex.: GitUsageLedger.append() sem conseguir publicar o
            # estado), nunca pode virar "nenhuma chamada foi tentada".
            # Sem este catch, a exceção subia até __main__.py, onde
            # _resultado_de_erro() grava call_attempted=false/usage=null —
            # mentindo sobre uma chamada paga real. O usage retornado pela
            # própria API (chamada_sanitizada, já sanitizado acima)
            # continua visível mesmo que o ledger compartilhado não tenha
            # conseguido gravá-lo; call_status próprio deixa claro que a
            # chamada teve êxito mas a persistência, não — nunca um retry
            # (nenhum código aqui tenta a chamada de novo).
            return ObserveResult(
                status="OBSERVED",
                reason=(
                    "Chamada à Anthropic concluída com sucesso, mas o ledger de uso/custo "
                    "não conseguiu persistir o registro: "
                    f"{redact(f'{type(exc).__name__}: {exc}')}"
                ),
                next_action=_next_action_text(classificacao, roteamento, worker),
                call_attempted=True,
                call_status="ok_ledger_failed",
                response_text=chamada_sanitizada["text"] or None,
                usage=chamada_sanitizada.get("usage"),
                **resultado_base,
            )

    return ObserveResult(
        status="OBSERVED",
        reason=chamada_sanitizada["reason"],
        next_action=_next_action_text(classificacao, roteamento, worker),
        call_attempted=resultado_chamada.status not in ("blocked",),
        call_status=resultado_chamada.status,
        response_text=chamada_sanitizada["text"] or None,
        usage=chamada_sanitizada.get("usage"),
        **resultado_base,
    )
