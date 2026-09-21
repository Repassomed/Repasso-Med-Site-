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
    # Sintético — nunca vem de coordination/tasks.json (não está em
    # estados_validos), só é atribuído por load_workers_from_tasks_json()
    # quando o PRÓPRIO REGISTRO está inconsistente (ver comentário lá).
    # Correção do item 4 do "PACOTE CONSOLIDADO" (PR #97).
    CONFLICT = "CONFLICT"


@dataclass(frozen=True)
class Worker:
    name: str
    state: WorkerState
    specialization: tuple[str, ...] = ()
    # Só preenchido quando state is CONFLICT — texto determinístico (task
    # ids ordenados) explicando por que o estado não pôde ser derivado de
    # uma única tarefa. None em todo o resto (retrocompatível com todo
    # Worker(...) já existente em fixture/teste, que não passa este argumento).
    conflict_detail: str | None = None


@dataclass(frozen=True)
class WorkerSuggestion:
    worker: str | None
    reason: str
    # None quando o registro fornecido não tem nenhum worker em CONFLICT.
    # Quando presente, é um aviso needs-input para José: o registro de
    # coordination/tasks.json tem um agente com mais de uma tarefa ativa
    # (viola "uma tarefa ativa por vez", #82) e por isso o estado real
    # daquele agente é indeterminável — corrigir o arquivo, não o código.
    conflict_warning: str | None = None


def _conflict_warning(workers: list[Worker]) -> str | None:
    conflitantes = sorted(
        (w for w in workers if w.state is WorkerState.CONFLICT), key=lambda w: w.name
    )
    if not conflitantes:
        return None
    nomes = ", ".join(w.name for w in conflitantes)
    return (
        f"NEEDS-INPUT: registro inconsistente em coordination/tasks.json — "
        f"{nomes} com mais de uma tarefa ativa simultânea (viola 'uma tarefa "
        f"ativa por vez', #82); o estado real não pôde ser determinado. "
        f"Corrigir o arquivo antes de confiar neste worker."
    )


def pick_worker(workers: list[Worker], *, area_hint: str | None = None) -> WorkerSuggestion:
    aviso = _conflict_warning(workers)
    livres = [w for w in workers if w.state is WorkerState.FREE]
    if not livres:
        return WorkerSuggestion(
            worker=None,
            reason="Nenhum worker FREE no registro fornecido — aguardar handoff/renovação (#82).",
            conflict_warning=aviso,
        )

    if area_hint:
        especializados = [w for w in livres if area_hint in w.specialization]
        if especializados:
            return WorkerSuggestion(
                worker=especializados[0].name,
                reason=f"{especializados[0].name} está FREE e tem histórico em {area_hint!r} (desempate, #85).",
                conflict_warning=aviso,
            )

    return WorkerSuggestion(
        worker=livres[0].name,
        reason=f"{livres[0].name} está FREE; nenhuma especialização decisiva encontrada.",
        conflict_warning=aviso,
    )


# Agentes que não são workers de verdade — "humano" é o José, nunca
# sugerido/escalonado como worker.
_AGENTES_NAO_WORKER = frozenset({"humano"})


def load_workers_from_tasks_json(path: str) -> list[Worker]:
    """Deriva o registro real de workers a partir de ``coordination/tasks.json``
    (bloqueador 4 da 3ª auditoria do PR #97).

    Regra, em três casos (item 4 do "PACOTE CONSOLIDADO", PR #97 — a
    versão anterior usava ``next(...)`` e pegava a PRIMEIRA tarefa ativa
    na ordem do arquivo, o que tornava o estado dependente da ordem de
    ``tarefas`` em vez do conteúdo):

    - **0 tarefas ATIVAS** (``estado`` != ``"DONE"``) para o agente ->
      ``FREE``;
    - **exatamente 1 tarefa ativa** -> o agente herda o estado dessa
      tarefa como seu ``WorkerState`` — é exatamente o que
      ``coordination/STATES.md`` já significa (um agente em NEEDS-AUDIT
      não está livre para outra frente até resolver aquela). Um
      ``estado`` que não bate com nenhum ``WorkerState`` conhecido (ex.:
      ``READY``, que normalmente nem tem agente atribuído) cai em
      ``IN_PROGRESS`` por segurança — nunca em FREE por engano só porque
      o texto não bateu;
    - **2+ tarefas ativas simultâneas** -> ``CONFLICT``, NUNCA ``FREE`` e
      NUNCA o estado de uma tarefa escolhida arbitrariamente. Isto viola
      a própria política do projeto ("um worker só tem uma tarefa ativa
      por vez", topo deste módulo) — é um problema no REGISTRO
      (``coordination/tasks.json``), não algo que o código deva resolver
      escolhendo em silêncio qual das tarefas "vale". ``conflict_detail``
      carrega os ids das tarefas em conflito, sempre na mesma ordem
      (ordenados por id) — o resultado final independe da ordem em que
      ``tarefas`` aparece no JSON.

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
        # Ordenado por id: o que segue depende só do CONTEÚDO das tarefas
        # ativas, nunca da posição em que apareceram em `tarefas`.
        ativas = sorted(
            (t for t in tarefas_do_agente if t.get("estado") != "DONE"),
            key=lambda t: t.get("id", ""),
        )

        if not ativas:
            workers.append(Worker(name=nome, state=WorkerState.FREE, specialization=especializacao))
            continue

        if len(ativas) > 1:
            ids = ", ".join(t.get("id", "?") for t in ativas)
            detalhe = (
                f"{nome} tem {len(ativas)} tarefas ativas simultâneas ({ids}) — "
                "viola 'uma tarefa ativa por vez' (#82); o registro não pode "
                "assumir qual delas reflete a disponibilidade real."
            )
            workers.append(Worker(
                name=nome, state=WorkerState.CONFLICT,
                specialization=especializacao, conflict_detail=detalhe,
            ))
            continue

        try:
            estado = WorkerState(ativas[0].get("estado", ""))
        except ValueError:
            estado = WorkerState.IN_PROGRESS
        workers.append(Worker(name=nome, state=estado, specialization=especializacao))

    return workers
