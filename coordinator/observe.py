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
from typing import NamedTuple

from . import anthropic_client
from .anthropic_transport import AnthropicTransport
from .audit import AUDIT_SYSTEM_PROMPT, build_audit_prompt, parse_decision, preparar_diff
from .budget import BudgetStatus, CallLimiter, UsageLedger, check_budget, priority_allowed
from .classify import Classification, TaskType, classify
from .config import Config
from .context import MinimalContext, build_context
from .costs import montar_resumo_custo, render_cost_block
from .dedup import Deduplicator
from .events import INBOX_ISSUE_NUMBER, Event, EventType
from .handoff import decidir_handoff, decidir_pool
from .inbox_card import render_checkpoint, render_recebido
from .merge_card import (
    MergeCardInput,
    aplicar_gate_diff,
    aplicar_lei_das_questoes,
    render_merge_card,
)
from .redact import redact
from .routing import RoutingDecision, decide as route_decide
from .worker_commands import aplicar_comando, parse_worker_command
from .worker_ops import OperationalWorkerRegistry
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
    # V3 (Issue #99) — só preenchidos quando ``audit_mode`` está ativo E o
    # evento passou pela auditoria semântica independente (ver
    # ``executar_auditoria`` em ``observe()``); ``None``/``False`` em
    # qualquer caminho V2/OBSERVE puro, preservando o formato antigo.
    audit_decision: str | None = None  # "MERGE-READY" | "NEEDS-FIX" | None
    merge_card: str | None = None
    should_comment: bool = False
    # Correção B4 da auditoria independente do PR #104, rodada 3: destino
    # EXPLÍCITO do comentário, decidido aqui — nunca inferido pelo
    # workflow. Um POOL-PAUSADO global sempre vai para a Inbox
    # (``events.INBOX_ISSUE_NUMBER``), mesmo quando o checkpoint que o
    # disparou chegou em outra issue; um checkpoint específico volta para
    # a issue de origem; um Cartão de Merge sempre vai para a PR. ``None``
    # quando ``should_comment`` é ``False`` (nada a publicar) ou quando o
    # evento não tem destino conhecido (ex.: workflow_run sem PR
    # associada) — nesse caso o workflow não deve inventar um número.
    comment_target_issue: int | None = None

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
            "audit_decision": self.audit_decision,
            "merge_card": self.merge_card,
            "should_comment": self.should_comment,
            "comment_target_issue": self.comment_target_issue,
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


def _pr_number_from_identity(identity: str) -> int | None:
    if identity.startswith("pr:"):
        try:
            return int(identity.split(":", 1)[1])
        except ValueError:
            return None
    return None


def _arquivos_alterados_do_evento(event: Event) -> tuple[str, ...]:
    audit_pack = event.payload.get("audit_pack")
    if not isinstance(audit_pack, dict):
        return ()
    return tuple(audit_pack.get("arquivos_alterados", []) or [])


def _render_cartao(event: Event, contexto: MinimalContext, decisao: str, motivo: str, *,
                    lei_das_questoes, envolve_questoes: bool, protocol_matched: bool,
                    cost_block: str | None = None) -> str:
    dados = MergeCardInput(
        pr_number=_pr_number_from_identity(event.identity),
        titulo=event.payload.get("titulo"),
        area=event.payload.get("area"),
        guard_result=contexto.guard_result,
        audit_decision=decisao,
        audit_rationale=motivo,
        envolve_questoes=envolve_questoes,
        lei_das_questoes=lei_das_questoes,
        arquivos_alterados=_arquivos_alterados_do_evento(event),
        protocol_matched=protocol_matched,
        cost_block=cost_block,
    )
    return render_merge_card(dados)


def _montar_cartao_hard_fail(event: Event, contexto: MinimalContext, classificacao: Classification,
                              ledger: UsageLedger, config: Config) -> str:
    envolve_questoes = bool(event.payload.get("envolve_questoes"))
    # Um HARD FAIL do Guard já é motivo suficiente por si só — a Lei das
    # Questões nem precisa ser avaliada para SUBIR a decisão (ela só pode
    # rebaixar), mas ainda é reportada no cartão quando relevante, para o
    # José ver o quadro completo de uma vez.
    _, lei_das_questoes = aplicar_lei_das_questoes(
        "NEEDS-FIX", envolve_questoes=envolve_questoes, pr_body=event.payload.get("body"),
    )
    return _render_cartao(
        event, contexto, "NEEDS-FIX",
        "Guard determinístico encontrou HARD FAIL: " + "; ".join(contexto.guard_hard_fails),
        lei_das_questoes=lei_das_questoes,
        envolve_questoes=envolve_questoes,
        protocol_matched=True,
        cost_block=render_cost_block(_resumo_custo_zero(ledger, config)),
    )


class _ResultadoZeroCusto(NamedTuple):
    """Saída comum dos dois caminhos novos da rodada 3 (Inbox/checkpoint):
    nunca envolvem ``anthropic_client.call`` — só leitura/escrita
    determinística no Worker Registry operacional.

    ``target_issue`` (rodada 4, correção B4): destino EXPLÍCITO do
    comentário — nunca deixado para o workflow inferir."""

    reason: str
    texto: str
    target_issue: int


def _resumo_custo_zero(ledger: UsageLedger, config: Config):
    # Nenhuma chamada foi tentada nestes caminhos — ESTIMADO é sempre
    # 0.0 (nunca confundido com REAL, que fica None), mas o gasto
    # acumulado do mês continua visível (Issue #99, "custos visíveis").
    return montar_resumo_custo(
        ledger=ledger, brl_rate=config.brl_rate, brl_rate_date=config.brl_rate_date,
        estimated_usd=0.0, actual_usd=None, tier=None, model_id=None, calls_this_task=0,
    )


def _tratar_inbox_comment(event: Event, classificacao: Classification,
                           worker_registry: OperationalWorkerRegistry, ledger: UsageLedger,
                           config: Config) -> _ResultadoZeroCusto:
    """Issue #88 como interface visível (achado B1 da auditoria
    independente do PR #104): todo comentário válido recebe UMA resposta
    — ou a confirmação de um comando de worker (José não edita JSON à
    mão), ou o checkpoint RECEBIDO com custo visível. dedup.claim() (já
    aplicado antes de chegar aqui) garante que isto acontece uma única
    vez por comentário, nunca em loop.

    Correção B2 da auditoria independente do PR #104, rodada 3: o worker
    sugerido aqui vem SEMPRE de ``worker_registry.escolher_disponivel()``
    (o registro operacional, único que sabe quem está ``AVAILABLE`` de
    verdade agora) — nunca do retrato histórico de
    ``coordination/tasks.json``. Um worker ``LIMIT``/``BUSY``/``OFFLINE``
    no registro operacional nunca aparece aqui como "início da execução
    por X", mesmo que ``tasks.json`` (declarativo, pode estar
    desatualizado) sugerisse esse mesmo nome."""
    corpo = str(event.payload.get("body", ""))

    comando = parse_worker_command(corpo)
    if comando is not None:
        confirmacao = aplicar_comando(worker_registry, comando)
        texto = "\n".join(["<!-- repasso-coordinator -->", f"🛠️ {confirmacao}"])
        return _ResultadoZeroCusto(
            reason=f"Comando de worker aplicado: {confirmacao}", texto=texto, target_issue=INBOX_ISSUE_NUMBER,
        )

    worker_disponivel = worker_registry.escolher_disponivel()
    nome_worker = worker_disponivel.display_name if worker_disponivel else None

    if classificacao.needs_input:
        estado, proximo = "BLOCKED (precisa de mais informação)", "aguardando resposta de José na própria Issue #88."
    elif classificacao.requires_jose_authorization:
        estado, proximo = "BLOCKED (aguardando autorização de José)", "aguardando 'pode começar' explícito de José."
    elif worker_disponivel is not None:
        estado, proximo = "READY", f"início da execução por {nome_worker}."
    else:
        estado, proximo = "EM FILA", "aguardando um worker AVAILABLE no registro operacional."

    primeira_linha = next((l.strip() for l in corpo.splitlines() if l.strip()), "(comentário sem texto)")
    tarefa_resumo = primeira_linha[:160]

    texto = render_recebido(
        tarefa=tarefa_resumo, prioridade=classificacao.priority.value, estado=estado,
        worker=nome_worker, proximo_checkpoint=proximo,
        cost_block=render_cost_block(_resumo_custo_zero(ledger, config)),
    )
    return _ResultadoZeroCusto(
        reason="Comentário válido na Inbox (#88) — RECEBIDO publicado.", texto=texto, target_issue=INBOX_ISSUE_NUMBER,
    )


def _tratar_checkpoint_blocked_limit(event: Event, classificacao: Classification,
                                      worker_registry: OperationalWorkerRegistry, ledger: UsageLedger,
                                      config: Config) -> _ResultadoZeroCusto:
    """Atualiza o Worker Registry operacional a partir de um checkpoint
    BLOCKED-LIMIT real e decide (nunca executa) WAIT/HANDOFF/POOL_PAUSED
    (Issue #99, achado B4 — "contrato/estado operacional", execução real
    fica para a #105).

    Correção B4 da auditoria independente do PR #104, rodada 4: um
    POOL-PAUSADO é um aviso GLOBAL e sempre vai para a Inbox (#88),
    mesmo quando o checkpoint que o disparou chegou em outra issue (ex.:
    #101) — nunca fica preso na issue de origem. Um checkpoint
    BLOCKED-LIMIT específico (sem pool pausado) continua respondendo na
    MESMA issue onde o checkpoint foi postado."""
    agente = event.payload.get("agente")
    tarefa = event.payload.get("tarefa")
    branch = event.payload.get("branch")
    commit = event.payload.get("commit")
    issue_origem = event.payload.get("issue") or INBOX_ISSUE_NUMBER

    if agente:
        worker_registry.set_status(agente, "LIMIT", message=f"checkpoint: {agente} -> LIMIT (BLOCKED-LIMIT)")
        worker_registry.set_task_progress(
            agente, current_task=tarefa, branch=branch, commit=commit, progress="BLOCKED-LIMIT",
            message=f"checkpoint: {agente} progresso",
        )

    todos = worker_registry.list_workers()
    cost_block = render_cost_block(_resumo_custo_zero(ledger, config))

    pool = decidir_pool(todos)
    if pool is not None:
        executores = [w for w in todos if w.type in ("human_session", "api_runner")]
        texto = render_checkpoint(
            "POOL-PAUSADO",
            linhas={
                "Motivo": pool.reason,
                "Workers": ", ".join(f"{w.display_name}={w.status}" for w in executores) or "-",
            },
            cost_block=cost_block,
        )
        return _ResultadoZeroCusto(
            reason="Pool de workers pausado — mensagem única publicada na Inbox (#88).",
            texto=texto, target_issue=INBOX_ISSUE_NUMBER,
        )

    checkpoint_seguro = bool(commit)
    agente_lower = (agente or "").strip().lower()
    candidatos = [w for w in todos if w.display_name.strip().lower() != agente_lower]
    decisao = decidir_handoff(prioridade=classificacao.priority, checkpoint_seguro=checkpoint_seguro,
                               candidatos_disponiveis=candidatos)
    texto = render_checkpoint(
        "BLOCKED-LIMIT",
        linhas={
            "Tarefa": tarefa or "-",
            "Agente": agente or "-",
            "Branch": branch or "-",
            "Commit": commit or "-",
            "Decisão": f"{decisao.action} — {decisao.reason}",
        },
        cost_block=cost_block,
    )
    return _ResultadoZeroCusto(
        reason=f"Checkpoint BLOCKED-LIMIT processado — decisão: {decisao.action}.", texto=texto,
        target_issue=issue_origem,
    )


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
    audit_mode: bool = False,
    worker_registry: OperationalWorkerRegistry | None = None,
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

    # V3 (Issue #99): quando a auditoria ativa-supervisionada substitui a
    # chamada genérica de resumo por uma auditoria semântica independente.
    # Só para PR_NEEDS_AUDIT + tipo A (conteúdo médico, área=="materia") —
    # exatamente o Nível C da Issue #83. classify.py só produz TaskType.A
    # para PR_NEEDS_AUDIT quando ``area == "materia"``, e
    # github_event.py::_from_workflow_run só preenche
    # ``payload["materia"]`` (não-None) nesse mesmo caso — então esta
    # condição já é equivalente a ``roteamento.needs_semantic_audit``
    # (routing.py), só expressa em termos da classificação em vez de
    # reler o payload de novo. Deliberadamente restrito a este único tipo
    # de evento nesta primeira etapa da V3: eventos administrativos
    # (Guard vermelho, checkpoint, Inbox) continuam só no caminho V2, sem
    # comentário automático — evita risco de loop de comentário logo na
    # primeira entrega (ver ``should_comment`` abaixo).
    executar_auditoria = (
        audit_mode
        and event.event_type is EventType.PR_NEEDS_AUDIT
        and classificacao.task_type is TaskType.A
    )

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

    # V3 (Issue #99): "Guard determinístico → Coordinator → auditoria".
    # Quando o próprio Guard já encontrou HARD FAIL (achado objetivo,
    # zero interpretação), a decisão é NEEDS-FIX por definição — pedir uma
    # auditoria STANDARD para "confirmar" isto gastaria uma chamada paga
    # para reafirmar um fato que já é determinístico.
    #
    # Correção B1 da auditoria independente do PR #104: a condição ANTES
    # dependia de ``executar_auditoria`` (só ``True`` para PR_NEEDS_AUDIT +
    # tipo A), então um ``GUARD_STATE_CHANGE`` vermelho de verdade
    # continuava sendo roteado por ``routing.py`` para STANDARD e podia
    # gastar uma chamada real, mesmo com HARD FAIL objetivo já disponível
    # no audit-pack. Agora a condição é só ``audit_mode`` (o modo
    # active-supervised está ligado) + ``contexto.guard_hard_fails`` — vale
    # para QUALQUER evento com HARD FAIL no audit-pack, não só o caminho de
    # auditoria semântica de conteúdo. Em MODE=observe (``audit_mode=False``)
    # esta condição nunca é verdadeira, então o comportamento V2 continua
    # byte a byte o mesmo. Não usa ``anthropic_client.call`` — zero custo,
    # ``call_attempted`` continua ``False``.
    if audit_mode and contexto.guard_hard_fails:
        cartao = _montar_cartao_hard_fail(event, contexto, classificacao, ledger, config)
        return ObserveResult(
            status="OBSERVED",
            reason="Guard determinístico já encontrou HARD FAIL — NEEDS-FIX automático, sem custo de auditoria.",
            next_action=_next_action_text(classificacao, roteamento, worker),
            call_attempted=False,
            audit_decision="NEEDS-FIX",
            merge_card=cartao,
            should_comment=True,
            comment_target_issue=_pr_number_from_identity(event.identity),
            **resultado_base,
        )

    # V3 rodada 3 (Issue #99, achados B1/B3/B4 da auditoria independente
    # do PR #104): a Issue #88 vira uma interface conversacional visível
    # (RECEBIDO/checkpoints) e os comandos naturais de worker/o registro
    # operacional/a decisão de handoff ficam ativos — tudo determinístico,
    # zero chamada paga, só quando há um ``worker_registry`` de verdade
    # para ler/escrever (nunca ``coordination/tasks.json``/matéria).
    if audit_mode and worker_registry is not None:
        if event.event_type is EventType.INBOX_COMMENT:
            zero_custo = _tratar_inbox_comment(event, classificacao, worker_registry, ledger, config)
            return ObserveResult(
                status="OBSERVED",
                reason=zero_custo.reason,
                next_action=_next_action_text(classificacao, roteamento, worker),
                call_attempted=False,
                merge_card=zero_custo.texto,
                should_comment=True,
                comment_target_issue=zero_custo.target_issue,
                **resultado_base,
            )
        if event.event_type is EventType.CHECKPOINT_BLOCKED_LIMIT:
            zero_custo = _tratar_checkpoint_blocked_limit(event, classificacao, worker_registry, ledger, config)
            return ObserveResult(
                status="OBSERVED",
                reason=zero_custo.reason,
                next_action=_next_action_text(classificacao, roteamento, worker),
                call_attempted=False,
                merge_card=zero_custo.texto,
                should_comment=True,
                comment_target_issue=zero_custo.target_issue,
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
    #
    # V3: quando ``executar_auditoria``, a chamada de resumo genérico é
    # SUBSTITUÍDA (não somada) pela auditoria semântica independente —
    # continua sendo, no máximo, uma chamada por evento (mesmo
    # ``CallLimiter``).
    limitador = CallLimiter()
    if executar_auditoria:
        pedido = anthropic_client.build_request(
            roteamento.model_choice,
            system=AUDIT_SYSTEM_PROMPT,
            prompt=build_audit_prompt(
                contexto,
                pr_body=event.payload.get("body"),
                envolve_questoes=bool(event.payload.get("envolve_questoes")),
                pr_diff=event.payload.get("pr_diff"),
            ),
            limiter=limitador,
        )
    else:
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

    # V3: decide o resultado da auditoria (sem renderizar o cartão ainda —
    # correção B3 da auditoria independente do PR #104, rodada 4: o cartão
    # só é montado DEPOIS da tentativa de ledger.append() logo abaixo, para
    # que "gasto acumulado do mês" no bloco de custo reflita esta própria
    # chamada quando a persistência tiver êxito).
    audit_decision_final: str | None = None
    rationale_final: str = ""
    lei_das_questoes = None
    protocol_matched = True
    if executar_auditoria:
        if resultado_chamada.status == "ok":
            decisao_llm = parse_decision(chamada_sanitizada["text"] or "")
            decisao_pos_lei, lei_das_questoes = aplicar_lei_das_questoes(
                decisao_llm.decision,
                envolve_questoes=bool(event.payload.get("envolve_questoes")),
                pr_body=event.payload.get("body"),
            )
            # Correção B2 da auditoria independente do PR #104: mesmo que a
            # Lei das Questões não tenha rebaixado nada, um MERGE-READY só
            # vale se o auditor de fato viu o diff real inteiro. Gate
            # aplicado por último — só pode rebaixar, nunca promover (mesmo
            # padrão de aplicar_lei_das_questoes).
            diff_info = preparar_diff(event.payload.get("pr_diff"))
            decisao_final, nota_diff = aplicar_gate_diff(
                decisao_pos_lei, diff_disponivel=diff_info.disponivel, diff_truncado=diff_info.truncado,
            )
            rationale_final = decisao_llm.rationale
            if nota_diff:
                rationale_final = f"{rationale_final}\n\n{nota_diff}"
            audit_decision_final = decisao_final
            protocol_matched = decisao_llm.protocol_matched
        else:
            # A chamada não teve sucesso (error/limited) — nunca vira
            # MERGE-READY por omissão; mesma filosofia de parse_decision()
            # quando o protocolo não é seguido.
            _, lei_das_questoes = aplicar_lei_das_questoes(
                "NEEDS-FIX",
                envolve_questoes=bool(event.payload.get("envolve_questoes")),
                pr_body=event.payload.get("body"),
            )
            audit_decision_final = "NEEDS-FIX"
            rationale_final = (
                f"Auditoria não pôde ser concluída (call_status={resultado_chamada.status!r}) — "
                "tratado como NEEDS-FIX por segurança."
            )
            protocol_matched = True

    ledger_persistiu = True
    ledger_erro: str | None = None
    if resultado_chamada.status == "ok" and resultado_chamada.usage is not None:
        try:
            ledger.append(resultado_chamada.usage)
        except Exception as exc:
            # Achado da auditoria final do PR #97: a chamada JÁ aconteceu e
            # teve sucesso — isto é uma falha de PERSISTÊNCIA depois do
            # fato (ex.: GitUsageLedger.append() sem conseguir publicar o
            # estado), nunca pode virar "nenhuma chamada foi tentada". O
            # usage retornado pela própria API continua visível mesmo que
            # o ledger compartilhado não tenha conseguido gravá-lo —
            # call_status próprio deixa claro que a chamada teve êxito mas
            # a persistência, não — nunca um retry (nenhum código aqui
            # tenta a chamada de novo).
            ledger_persistiu = False
            ledger_erro = redact(f"{type(exc).__name__}: {exc}")

    # Correção B3 da auditoria independente do PR #104, rodada 4: custo
    # REAL (nunca chamado de "estimado") visível também em NEEDS-FIX/
    # MERGE-READY — antes só os checkpoints zero-custo da Inbox mostravam
    # este bloco. Quando a chamada teve usage real, ele vem sempre daqui
    # (nunca do ledger, que pode ter falhado em persistir); quando a
    # persistência falhou, isso fica sinalizado explicitamente no cartão,
    # sem esconder que a chamada (e o custo) de fato aconteceu.
    cartao_final: str | None = None
    if executar_auditoria:
        if resultado_chamada.status == "ok" and resultado_chamada.usage is not None:
            resumo_custo = montar_resumo_custo(
                ledger=ledger, brl_rate=config.brl_rate, brl_rate_date=config.brl_rate_date,
                actual_usd=resultado_chamada.usage.estimated_cost_usd,
                tier=roteamento.model_choice.tier.value, model_id=roteamento.model_choice.model_id,
                calls_this_task=1,
            )
            cost_block = render_cost_block(resumo_custo)
            if not ledger_persistiu:
                cost_block += (
                    "\n- ⚠️ o \"gasto acumulado do mês\" acima pode estar DESATUALIZADO: "
                    f"o ledger não conseguiu persistir este registro ({ledger_erro}). O custo "
                    "REAL desta chamada, listado acima, já aconteceu e não está escondido."
                )
        else:
            resumo_custo = montar_resumo_custo(
                ledger=ledger, brl_rate=config.brl_rate, brl_rate_date=config.brl_rate_date,
                estimated_usd=0.0, tier=roteamento.model_choice.tier.value,
                model_id=roteamento.model_choice.model_id, calls_this_task=0,
            )
            cost_block = render_cost_block(resumo_custo)
        cartao_final = _render_cartao(
            event, contexto, audit_decision_final, rationale_final,
            lei_das_questoes=lei_das_questoes,
            envolve_questoes=bool(event.payload.get("envolve_questoes")),
            protocol_matched=protocol_matched,
            cost_block=cost_block,
        )

    alvo_comentario = _pr_number_from_identity(event.identity)

    if not ledger_persistiu:
        return ObserveResult(
            status="OBSERVED",
            reason=(
                "Chamada à Anthropic concluída com sucesso, mas o ledger de uso/custo "
                "não conseguiu persistir o registro: " + ledger_erro
            ),
            next_action=_next_action_text(classificacao, roteamento, worker),
            call_attempted=True,
            call_status="ok_ledger_failed",
            response_text=chamada_sanitizada["text"] or None,
            usage=chamada_sanitizada.get("usage"),
            audit_decision=audit_decision_final,
            merge_card=cartao_final,
            should_comment=executar_auditoria,
            comment_target_issue=alvo_comentario if executar_auditoria else None,
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
        audit_decision=audit_decision_final,
        merge_card=cartao_final,
        should_comment=executar_auditoria,
        comment_target_issue=alvo_comentario if executar_auditoria else None,
        **resultado_base,
    )
