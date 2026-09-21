"""Escolha de worker (Issue #82, Issue #85 "ESCOLHA DO WORKER").

Regras aplicadas, na ordem da política:

1. um worker só tem uma tarefa ativa por vez;
2. preferir worker FREE;
3. não colocar dois workers no mesmo arquivo (colisão já é responsabilidade
   do Guard/tasks.json — aqui só filtramos por disponibilidade);
4. respeitar BLOCKED-LIMIT;
5. especialização histórica só como desempate, nunca acima de segurança.

Este módulo não lê a Issue #82 pelo GitHub (nenhuma chamada de rede nesta
V2) — recebe a lista de workers já resolvida por quem chama: em teste, de
um fixture; no workflow real (bloqueador 4 da 3ª auditoria do PR #97), de
``load_workers_from_tasks_json``, que deriva o registro a partir de
``coordination/tasks.json`` — o mesmo arquivo que o Repasso Guard já lê
como fonte de verdade das tarefas/agentes, sem nenhuma chamada de API
paga nem nova.
"""

from __future__ import annotations

import json
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


# Agentes que não são workers de verdade — "humano" é o José, nunca
# sugerido/escalonado como worker.
_AGENTES_NAO_WORKER = frozenset({"humano"})


def load_workers_from_tasks_json(path: str) -> list[Worker]:
    """Deriva o registro real de workers a partir de ``coordination/tasks.json``
    (bloqueador 4 da 3ª auditoria do PR #97).

    Regra: um agente conhecido (``agentes_conhecidos``) que tem uma tarefa
    ATIVA (``estado`` != ``"DONE"``) atribuída a ele (``agente`` == nome)
    herda o estado dessa tarefa como seu ``WorkerState`` — é exatamente o
    que ``coordination/STATES.md`` já significa (um agente em NEEDS-AUDIT
    não está livre para outra frente até resolver aquela). Sem tarefa
    ativa, o agente está ``FREE``. Um ``estado`` que não bate com nenhum
    ``WorkerState`` conhecido (ex.: ``READY``, que normalmente nem tem
    agente atribuído) cai em ``IN_PROGRESS`` por segurança — nunca em
    FREE por engano só porque o texto não bateu.

    A especialização (usada só como desempate em ``pick_worker``) é a
    lista de áreas (``area``) que aparecem em qualquer tarefa do agente,
    ativa ou não — um histórico melhor que nada, sem exigir uma tabela
    separada.
    """
    with open(path, encoding="utf-8") as fh:
        dados = json.load(fh)

    agentes = [a for a in dados.get("agentes_conhecidos", []) if a not in _AGENTES_NAO_WORKER]
    tarefas = dados.get("tarefas", [])

    workers: list[Worker] = []
    for nome in agentes:
        tarefas_do_agente = [t for t in tarefas if t.get("agente") == nome]
        especializacao = tuple(sorted({t["area"] for t in tarefas_do_agente if t.get("area")}))
        ativa = next((t for t in tarefas_do_agente if t.get("estado") != "DONE"), None)

        if ativa is None:
            workers.append(Worker(name=nome, state=WorkerState.FREE, specialization=especializacao))
            continue

        try:
            estado = WorkerState(ativa.get("estado", ""))
        except ValueError:
            estado = WorkerState.IN_PROGRESS
        workers.append(Worker(name=nome, state=estado, specialization=especializacao))

    return workers
