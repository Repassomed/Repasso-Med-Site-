"""Escolha de worker (Issue #82, Issue #85 "ESCOLHA DO WORKER").

Regras aplicadas, na ordem da política:

1. um worker só tem uma tarefa ativa por vez;
2. preferir worker FREE;
3. não colocar dois workers no mesmo arquivo (colisão já é responsabilidade
   do Guard/tasks.json — aqui só filtramos por disponibilidade);
4. respeitar BLOCKED-LIMIT;
5. especialização histórica só como desempate, nunca acima de segurança.

Este módulo não lê a Issue #82 pelo GitHub (nenhuma chamada de rede nesta
V2) — recebe a lista de workers já resolvida por quem chama (fixture em
teste; no futuro, o passo que monta o evento already teria essa leitura).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class WorkerState(str, Enum):
    FREE = "FREE"
    IN_PROGRESS = "IN-PROGRESS"
    BLOCKED = "BLOCKED"
    BLOCKED_LIMIT = "BLOCKED-LIMIT"
    NEEDS_AUDIT = "NEEDS-AUDIT"
    NEEDS_FIX = "NEEDS-FIX"
    MERGE_READY = "MERGE-READY"
    OFFLINE = "OFFLINE"


@dataclass(frozen=True)
class Worker:
    name: str
    state: WorkerState
    specialization: tuple[str, ...] = ()


@dataclass(frozen=True)
class WorkerSuggestion:
    worker: str | None
    reason: str


def pick_worker(workers: list[Worker], *, area_hint: str | None = None) -> WorkerSuggestion:
    livres = [w for w in workers if w.state is WorkerState.FREE]
    if not livres:
        return WorkerSuggestion(
            worker=None,
            reason="Nenhum worker FREE no registro fornecido — aguardar handoff/renovação (#82).",
        )

    if area_hint:
        especializados = [w for w in livres if area_hint in w.specialization]
        if especializados:
            return WorkerSuggestion(
                worker=especializados[0].name,
                reason=f"{especializados[0].name} está FREE e tem histórico em {area_hint!r} (desempate, #85).",
            )

    return WorkerSuggestion(
        worker=livres[0].name,
        reason=f"{livres[0].name} está FREE; nenhuma especialização decisiva encontrada.",
    )
