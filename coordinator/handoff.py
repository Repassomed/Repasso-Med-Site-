"""Camada de DECISÃO/ESTADO da estratégia de limites/handoff (Issue #99,
achado B4 da auditoria independente do PR #104, rodada 2).

Deliberadamente só decisão — a execução automática real (um worker
assumindo sozinho, via API/agent runner) é a Issue #105, explicitamente
fora do escopo desta V3 ("A V3 não deve fingir que iniciou um worker
quando apenas publicou uma tarefa"). Tudo aqui é função pura: recebe
prioridade/estado/registro, devolve uma decisão e o motivo em português
simples — sem nenhuma chamada de API, sem nenhum efeito colateral, então
"pool inteiro em LIMIT" nunca custa um centavo para ser detectado (Issue
#99: "não fazer polling pago/repetitivo só para perguntar se alguém
voltou").
"""

from __future__ import annotations

from dataclasses import dataclass

from .classify import Priority
from .worker_ops import WorkerRecord

# P0/P1 são urgentes o bastante para justificar o CUSTO de um handoff
# (perda de contexto, risco de colisão); P2-P4 podem esperar o worker
# original voltar — mesmo espírito de #84 §1 (prioridade decide o que
# "vale a pena" custar).
_PRIORIDADES_URGENTES = frozenset({Priority.P0, Priority.P1})


@dataclass(frozen=True)
class HandoffDecision:
    action: str  # "WAIT" | "HANDOFF" | "POOL_PAUSED"
    reason: str
    novo_worker: str | None = None

    def to_dict(self) -> dict:
        return {"action": self.action, "reason": self.reason, "novo_worker": self.novo_worker}


def decidir_handoff(*, prioridade: Priority, checkpoint_seguro: bool,
                     candidatos_disponiveis: list[WorkerRecord]) -> HandoffDecision:
    """Decide entre ESPERAR o worker original voltar ou recomendar
    TRANSFERIR a tarefa para outro worker — nunca executa a transferência
    (isso é #105); só devolve a recomendação e o motivo."""
    if prioridade not in _PRIORIDADES_URGENTES:
        return HandoffDecision(
            "WAIT",
            f"Prioridade {prioridade.value} não é urgente (P0/P1) — esperar o worker original "
            "voltar é seguro e evita o custo de contexto de um handoff (Issue #99, Caso B).",
        )
    if not checkpoint_seguro:
        return HandoffDecision(
            "WAIT",
            "Prioridade urgente, mas não há checkpoint seguro (commit registrado) para outro "
            "worker assumir sem risco de retrabalho ou colisão.",
        )
    compativeis = [w for w in candidatos_disponiveis if w.status == "AVAILABLE" and w.can_execute]
    if not compativeis:
        return HandoffDecision(
            "WAIT",
            "Prioridade urgente e checkpoint seguro, mas nenhum worker compatível está "
            "AVAILABLE agora — aguardar até que um fique disponível.",
        )
    return HandoffDecision(
        "HANDOFF",
        f"Prioridade {prioridade.value} + checkpoint seguro + worker disponível — "
        f"handoff recomendado para {compativeis[0].display_name} (Issue #99, Caso A).",
        novo_worker=compativeis[0].worker_id,
    )


def decidir_pool(workers: list[WorkerRecord]) -> HandoffDecision | None:
    """``None`` quando o pool não está totalmente pausado (nada a
    anunciar); ``HandoffDecision(action="POOL_PAUSED", ...)`` quando TODO
    worker capaz de executar (``human_session``/``api_runner``) está
    ``LIMIT``/``OFFLINE`` — a única mensagem que a #99 pede nesse caso,
    nunca uma por worker."""
    executores = [w for w in workers if w.type in ("human_session", "api_runner")]
    if not executores:
        return None
    if all(w.status in ("LIMIT", "OFFLINE") for w in executores):
        return HandoffDecision(
            "POOL_PAUSED",
            "Todos os workers executores estão LIMIT/OFFLINE — pool pausado. Tarefas em "
            "andamento ficam BLOCKED-LIMIT com checkpoint; tarefas READY continuam READY. "
            "Retoma por heartbeat/comando explícito, nunca por polling pago.",
        )
    return None


def worker_retomando_deve_assumir(*, tarefa_estado: str, tarefa_agente_atual: str | None,
                                   worker_que_volta: str) -> tuple[bool, str]:
    """(deve_assumir, motivo). Nunca deixa um worker que volta refazer uma
    tarefa já concluída, nem duplicar trabalho já assumido por outro —
    regra de retomada explícita da #99."""
    if tarefa_estado in ("DONE", "MERGE-READY", "NEEDS-AUDIT"):
        return False, (
            "A tarefa original já avançou além de BLOCKED-LIMIT (estado "
            f"{tarefa_estado!r}) — o worker que volta recebe a próxima tarefa "
            "compatível da fila, nunca refaz o que já foi feito."
        )
    if tarefa_agente_atual and tarefa_agente_atual != worker_que_volta:
        return False, (
            f"Outro worker ({tarefa_agente_atual}) já assumiu esta tarefa — não criar "
            "trabalho paralelo; o Coordinator mantém o atual ou devolve só em checkpoint seguro."
        )
    if tarefa_estado == "BLOCKED-LIMIT":
        return True, (
            "A tarefa ainda está BLOCKED-LIMIT e ninguém mais assumiu — o worker original "
            "retoma a partir do commit registrado no checkpoint."
        )
    return False, f"Estado da tarefa ({tarefa_estado!r}) não indica retomada segura — aguardar decisão explícita."
