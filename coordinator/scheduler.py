"""Scheduler determinístico / fila lógica — Issue #105, Fase A.

Esta é deliberadamente só a camada de DECISÃO, mesma filosofia de
``handoff.py`` (Issue #99): função pura, sem chamada de rede, sem escrita
em arquivo, sem efeito colateral. Nenhuma linha aqui inicia um worker,
publica heartbeat, faz commit/push ou decide merge/publicação — isso
continua fora do escopo desta Fase A (Fases B a F da própria Issue #105,
explicitamente adiadas).

O que este módulo FAZ: junta três peças que já existem e já são
auditadas — a prioridade determinística de ``classify.py``, a decisão de
handoff de ``handoff.py`` e o retrato do Worker Registry operacional de
``worker_ops.py`` — numa fila lógica de tarefas ``READY`` (lidas de
``coordination/tasks.json``, sempre em modo SOMENTE LEITURA — este módulo
nunca escreve nesse arquivo) e numa função de topo que decide a PRÓXIMA
oferta tarefa->worker sem executá-la.

Regras aplicadas (Issue #105 §2, Issue #82, Issue #85 "ESCOLHA DO
WORKER"), na mesma ordem em que a Issue #105 as descreve:

1. P0/P1 + checkpoint seguro + worker compatível AVAILABLE -> handoff
   recomendado (já é ``handoff.decidir_handoff`` — ``avaliar_handoff_de_
   tarefa`` só deriva a prioridade da ``TaskRecord`` para quem não tem
   isso à mão, nunca duplica a regra P0/P1).
2. P3/P4 sem urgência -> preferir esperar o worker original voltar (idem,
   já em ``handoff.decidir_handoff``).
3. Sem checkpoint seguro -> nunca transferir (idem).
4. Arquivo já reservado por tarefa ATIVA (IN-PROGRESS/BLOCKED-LIMIT) ->
   nenhuma tarefa ``READY`` que colida entra na fila pronta
   (``proxima_tarefa_pronta``).
5. Tarefa já concluída quando o worker original volta -> o worker recebe
   a PRÓXIMA tarefa compatível da fila, nunca refaz a antiga
   (``reprocessar_retorno``, que reusa ``handoff.worker_retomando_deve_
   assumir`` sem duplicar a regra).
6. Todos os workers executores em LIMIT/OFFLINE -> ``POOL_PAUSED``
   (``handoff.decidir_pool``, já existente — só propagado aqui).
7. Retorno de um worker -> reprocessar a fila sem duplicar trabalho
   (``reprocessar_retorno``).

Nada disso decide autonomamente construir matéria nova, tocar Supabase/
Auth/pagamentos nem alterar `coordination/tasks.json` — o módulo só LÊ
esse arquivo.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from .classify import Priority, TaskType
from .handoff import HandoffDecision, decidir_handoff, decidir_pool, worker_retomando_deve_assumir
from .worker_ops import WorkerRecord

# Mesmo mapeamento área -> tipo -> prioridade padrão que classify.py já usa
# para eventos PR_NEEDS_AUDIT (Issue #84 §1) — reaplicado aqui para
# tarefas DECLARATIVAS de coordination/tasks.json, que não carregam um
# campo de prioridade próprio no schema atual. Isto não inventa uma regra
# nova de prioridade: é a MESMA tabela, só lida a partir de outra fonte.
_AREA_TO_TYPE: dict[str, TaskType] = {
    "materia": TaskType.A,
    "ferramentas": TaskType.D,
    "infraestrutura": TaskType.D,
    "assets": TaskType.B,
    "documentacao": TaskType.B,
}
_TYPE_TO_DEFAULT_PRIORITY: dict[TaskType, Priority] = {
    TaskType.A: Priority.P1,
    TaskType.B: Priority.P2,
    TaskType.D: Priority.P3,
}
_DEFAULT_PRIORITY_AREA_DESCONHECIDA = Priority.P2

# Estados de tarefa (coordination/STATES.md) relevantes para o scheduler:
# uma tarefa ATIVA reserva os arquivos que declarou (Lei 3, #82/#85). Os
# estados terminais/em-auditoria (DONE/MERGE-READY/NEEDS-AUDIT) já são
# tratados por ``handoff.worker_retomando_deve_assumir`` — não duplicados
# aqui.
_ESTADOS_ATIVOS = frozenset({"IN-PROGRESS", "BLOCKED-LIMIT"})

_ORDEM_PRIORIDADE: dict[Priority, int] = {p: i for i, p in enumerate(Priority)}


def _parse_priority(valor: object) -> Priority | None:
    if not valor:
        return None
    texto = str(valor).upper().strip()
    for p in Priority:
        if p.value == texto:
            return p
    return None


@dataclass(frozen=True)
class TaskRecord:
    """Retrato somente-leitura de uma tarefa de ``coordination/tasks.json``
    — só os campos que o scheduler precisa para decidir, nunca todos os
    campos do schema (fonte/objetivo/notas ficam de fora de propósito)."""

    id: str
    estado: str
    area: str | None
    agente: str | None
    arquivos: tuple[str, ...] = ()
    dependencias: tuple[str, ...] = ()
    # Campo OPCIONAL e aditivo: nenhuma tarefa hoje o declara em
    # coordination/tasks.json (o schema atual não tem esse campo), então
    # cai sempre no mapeamento área->tipo->padrão abaixo — mesmo espírito
    # de ``classify._prioridade_declarada`` para eventos, mas aqui para
    # tarefas. Se José um dia declarar prioridade explícita na tarefa,
    # ela vence (Issue #84 §1: "Se José declarar prioridade, ela vence a
    # fila automática"), sem precisar mudar este módulo.
    prioridade_declarada: Priority | None = None

    @property
    def priority(self) -> Priority:
        if self.prioridade_declarada is not None:
            return self.prioridade_declarada
        tipo = _AREA_TO_TYPE.get(self.area or "")
        return _TYPE_TO_DEFAULT_PRIORITY.get(tipo, _DEFAULT_PRIORITY_AREA_DESCONHECIDA)


def load_tasks_from_tasks_json(path: str) -> list[TaskRecord]:
    """Lê ``coordination/tasks.json`` em modo SOMENTE LEITURA. Nunca abre
    o arquivo para escrita — nenhuma função deste módulo grava de volta
    nesse arquivo; ele continua declarativo/auditável na main (Issue #99,
    "coordination/tasks.json na main continua declarativo/auditável")."""
    with open(path, encoding="utf-8") as fh:
        dados = json.load(fh)
    tarefas: list[TaskRecord] = []
    for t in dados.get("tarefas", []):
        tarefas.append(
            TaskRecord(
                id=t["id"],
                estado=t.get("estado", ""),
                area=t.get("area"),
                agente=t.get("agente"),
                arquivos=tuple(t.get("arquivos") or ()),
                dependencias=tuple(t.get("dependencias") or ()),
                prioridade_declarada=_parse_priority(t.get("prioridade_declarada")),
            )
        )
    return tarefas


def _dependencias_satisfeitas(tarefa: TaskRecord, por_id: dict[str, TaskRecord]) -> bool:
    for dep_id in tarefa.dependencias:
        dep = por_id.get(dep_id)
        if dep is None or dep.estado != "DONE":
            return False
    return True


def _arquivos_reservados_por_tarefas_ativas(tarefas: list[TaskRecord]) -> set[str]:
    reservados: set[str] = set()
    for t in tarefas:
        if t.estado in _ESTADOS_ATIVOS:
            reservados.update(t.arquivos)
    return reservados


def _colide_com_reserva_ativa(tarefa: TaskRecord, reservados: set[str]) -> bool:
    return bool(set(tarefa.arquivos) & reservados)


def proxima_tarefa_pronta(tarefas: list[TaskRecord]) -> list[TaskRecord]:
    """Fila ordenada de tarefas ``READY`` que podem começar AGORA:
    dependências concluídas (``DONE``) e nenhuma colisão de arquivo com
    tarefa ativa (Lei 3, #82/#85). Ordenada por prioridade (P0 primeiro)
    e, em empate, por ``id`` — determinística, nunca depende da ordem em
    que ``tarefas`` foi construída ou da ordem de iteração de um dict.
    """
    por_id = {t.id: t for t in tarefas}
    reservados = _arquivos_reservados_por_tarefas_ativas(tarefas)
    prontas = [
        t
        for t in tarefas
        if t.estado == "READY"
        and _dependencias_satisfeitas(t, por_id)
        and not _colide_com_reserva_ativa(t, reservados)
    ]
    return sorted(prontas, key=lambda t: (_ORDEM_PRIORIDADE[t.priority], t.id))


@dataclass(frozen=True)
class QueueDecision:
    action: str  # "OFFER" | "WAIT" | "POOL_PAUSED"
    task_id: str | None
    worker_id: str | None
    reason: str

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "task_id": self.task_id,
            "worker_id": self.worker_id,
            "reason": self.reason,
        }


def _candidatos_disponiveis(workers: list[WorkerRecord]) -> list[WorkerRecord]:
    """Só ``AVAILABLE`` + ``can_execute`` + sem tarefa ativa (defesa em
    profundidade da regra #82.1 "um worker só tem uma tarefa ativa por
    vez" — um ``WorkerRecord`` com ``status=AVAILABLE`` e
    ``current_task`` preenchido seria uma inconsistência do próprio
    registro; este módulo nunca oferece uma segunda tarefa a ele mesmo
    assim)."""
    return [
        w
        for w in workers
        if w.status == "AVAILABLE" and w.can_execute and w.current_task is None
    ]


def escolher_proxima_atribuicao(tarefas: list[TaskRecord], workers: list[WorkerRecord]) -> QueueDecision:
    """Decide a PRÓXIMA oferta tarefa->worker a partir de um snapshot —
    nunca executa, nunca escreve. Chamar de novo com o MESMO snapshot
    sempre devolve a MESMA decisão (determinístico); a resolução de
    concorrência real entre duas chamadas com snapshots diferentes (dois
    workers voltando quase ao mesmo tempo) é responsabilidade de quem
    aplica a decisão com um `claim()` atômico (mesmo padrão de
    ``dedup.py``) — isso é Fase E da Issue #105, fora desta Fase A."""
    pausa = decidir_pool(workers)
    if pausa is not None:
        return QueueDecision("POOL_PAUSED", None, None, pausa.reason)

    fila = proxima_tarefa_pronta(tarefas)
    if not fila:
        return QueueDecision(
            "WAIT", None, None,
            "Nenhuma tarefa READY com dependências satisfeitas e sem colisão de arquivo agora.",
        )

    disponiveis = _candidatos_disponiveis(workers)
    if not disponiveis:
        return QueueDecision(
            "WAIT", fila[0].id, None,
            f"{fila[0].id} está pronta, mas nenhum worker AVAILABLE/can_execute livre agora.",
        )

    tarefa = fila[0]
    especializados = [w for w in disponiveis if tarefa.area and tarefa.area in w.capabilities]
    escolhido = especializados[0] if especializados else disponiveis[0]
    motivo_especializacao = (
        f"especialização declarada em {tarefa.area!r}" if especializados
        else "nenhuma especialização decisiva — primeiro AVAILABLE (#85, desempate)"
    )
    return QueueDecision(
        "OFFER", tarefa.id, escolhido.worker_id,
        f"{tarefa.id} (prioridade {tarefa.priority.value}) oferecida a "
        f"{escolhido.display_name} — {motivo_especializacao}.",
    )


def avaliar_handoff_de_tarefa(
    tarefa: TaskRecord, *, checkpoint_seguro: bool, workers: list[WorkerRecord]
) -> HandoffDecision:
    """Casca fina sobre ``handoff.decidir_handoff``: deriva a prioridade a
    partir da ``TaskRecord`` para quem só tem a tarefa à mão (o caminho
    real de evento) — nunca reimplementa a regra P0/P1 vs P3/P4, que
    continua vivendo só em ``handoff.py``."""
    return decidir_handoff(
        prioridade=tarefa.priority,
        checkpoint_seguro=checkpoint_seguro,
        candidatos_disponiveis=workers,
    )


@dataclass(frozen=True)
class RetornoDecision:
    """Resultado de reprocessar a fila quando um worker sinaliza retorno
    (heartbeat/comando ``AVAILABLE`` — a captura real desse evento é Fase
    B/F da Issue #105; aqui só a decisão, dado o estado já resolvido)."""

    retoma_tarefa_id: str | None
    motivo: str
    proxima_oferta: QueueDecision | None  # só preenchido quando NÃO há retomada seguro


def reprocessar_retorno(
    *,
    worker_que_volta: str,
    tarefa_original: TaskRecord | None,
    tarefas: list[TaskRecord],
    workers: list[WorkerRecord],
) -> RetornoDecision:
    """Regra 5/7 da Issue #105 §2: quando um worker volta, ele NUNCA refaz
    uma tarefa já concluída ou já assumida por outro (reusa
    ``handoff.worker_retomando_deve_assumir`` — não duplica a regra); se
    não há retomada segura, a fila é reprocessada e a próxima tarefa
    compatível é oferecida — nunca deixa o worker ocioso silenciosamente."""
    if tarefa_original is not None:
        deve_assumir, motivo = worker_retomando_deve_assumir(
            tarefa_estado=tarefa_original.estado,
            tarefa_agente_atual=tarefa_original.agente,
            worker_que_volta=worker_que_volta,
        )
        if deve_assumir:
            return RetornoDecision(tarefa_original.id, motivo, None)
    else:
        motivo = "Nenhuma tarefa anterior registrada para este worker — segue para a fila normal."

    return RetornoDecision(None, motivo, escolher_proxima_atribuicao(tarefas, workers))
