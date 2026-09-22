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

1. P0/P1 + checkpoint seguro + worker COMPATÍVEL (capability) e que NÃO
   seja o próprio dono atual da tarefa, AVAILABLE -> handoff recomendado
   (``avaliar_handoff_de_tarefa`` filtra owner/compatibilidade e delega a
   regra P0/P1 a ``handoff.decidir_handoff``, nunca a duplica).
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
8. Progresso/trabalho restante/custo de transferência/risco/orçamento
   (Issue #105 §2, "Regra principal") -> ``avaliar_handoff_de_tarefa``
   aceita um ``HandoffContext`` opcional que só pode REBAIXAR um HANDOFF
   para WAIT (nunca promover um WAIT para HANDOFF) quando o custo-
   benefício não compensa — nunca inventa precisão numérica onde só há
   sinal qualitativo.

Nada disso decide autonomamente construir matéria nova, tocar Supabase/
Auth/pagamentos nem alterar `coordination/tasks.json` — o módulo só LÊ
esse arquivo.

---

**Correções da 1ª auditoria independente do PR #108 (HEAD 17eb734,
B1-B5) — só isto, Fases B+/heartbeat/runner continuam fora de escopo:**

- B1 (autoria) não é corrigido neste arquivo — é `coordination/tasks.json`
  e o corpo do PR que registravam o agente errado; corrigido lá.
- B2: ``capacidades_necessarias()``/``_e_compativel()`` — a "especialização"
  antiga comparava ``tarefa.area in w.capabilities``, mas os workers reais
  (``default_seed_workers()``) têm ``("conteudo", "codigo")`` e as áreas
  são ``materia/infraestrutura/ferramentas/assets/documentacao`` — a
  comparação nunca batia de verdade. Agora existe um mapeamento
  área->capability explícito (``_AREA_TO_CAPABILITY``), mais um campo
  opcional ``capabilities_required`` na própria tarefa quando declarado.
  Compatibilidade passou a ser um FILTRO obrigatório (não só desempate)
  tanto em ``escolher_proxima_atribuicao`` quanto em
  ``avaliar_handoff_de_tarefa`` — só workers compatíveis recebem
  OFFER/HANDOFF.
- B3: ``HandoffContext`` — progresso, trabalho restante, custo de
  transferência, status LIMIT vs NEAR_LIMIT, risco e sinal de orçamento
  passam a poder rebaixar um HANDOFF para WAIT quando o custo-benefício
  não compensa (ex.: NEAR_LIMIT + progresso alto + custo de transferência
  alto). Nunca promovem um WAIT para HANDOFF — a Issue #105 pede "nem
  toda tarefa interrompida por limite deve ser transferida", nunca o
  oposto.
- B4: ``_e_owner_atual()`` — o dono atual da tarefa (``tarefa.agente``)
  nunca é candidato a assumir a própria tarefa por handoff, mesmo que o
  registro esteja momentaneamente inconsistente e ele apareça AVAILABLE.
- B5: ``_ordenar_candidatos()`` — desempate agora é uma ordenação
  determinística e estável (especialização extra -> carga -> ``worker_id``
  lexicográfico), nunca ``lista[0]`` sobre uma lista cuja ordem de entrada
  poderia variar.
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

# B2 da auditoria do PR #108: mapeamento área -> capability REAL (as
# mesmas duas capabilities que default_seed_workers() de fato usa,
# "conteudo"/"codigo" — nunca o nome da área, que nenhum worker real
# declara como capability).
_AREA_TO_CAPABILITY: dict[str, str] = {
    "materia": "conteudo",
    "assets": "conteudo",
    "documentacao": "conteudo",
    "infraestrutura": "codigo",
    "ferramentas": "codigo",
}

# Estados de tarefa (coordination/STATES.md) relevantes para o scheduler:
# uma tarefa ATIVA reserva os arquivos que declarou (Lei 3, #82/#85). Os
# estados terminais/em-auditoria (DONE/MERGE-READY/NEEDS-AUDIT) já são
# tratados por ``handoff.worker_retomando_deve_assumir`` — não duplicados
# aqui.
_ESTADOS_ATIVOS = frozenset({"IN-PROGRESS", "BLOCKED-LIMIT"})

_ORDEM_PRIORIDADE: dict[Priority, int] = {p: i for i, p in enumerate(Priority)}

_BUCKETS_PROGRESSO = ("BAIXO", "MEDIO", "ALTO")
_BUCKETS_CUSTO = ("BAIXO", "MEDIO", "ALTO")
_STATUS_HANDOFF_VALIDOS = ("LIMIT", "NEAR_LIMIT")


def _parse_priority(valor: object) -> Priority | None:
    if not valor:
        return None
    texto = str(valor).upper().strip()
    for p in Priority:
        if p.value == texto:
            return p
    return None


def _parse_capabilities(valor: object) -> tuple[str, ...]:
    if not valor:
        return ()
    return tuple(str(c).strip().lower() for c in valor if str(c).strip())


def _slug(nome: str) -> str:
    return "-".join(nome.strip().lower().split())


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
    # Também OPCIONAL e aditivo (B2 da auditoria do PR #108): quando a
    # própria tarefa declara a capability exigida, ela vence o mapeamento
    # área->capability abaixo — é mais específico que um padrão genérico.
    capabilities_required: tuple[str, ...] = ()

    @property
    def priority(self) -> Priority:
        if self.prioridade_declarada is not None:
            return self.prioridade_declarada
        tipo = _AREA_TO_TYPE.get(self.area or "")
        return _TYPE_TO_DEFAULT_PRIORITY.get(tipo, _DEFAULT_PRIORITY_AREA_DESCONHECIDA)

    @property
    def capacidades_necessarias(self) -> frozenset[str]:
        """B2 da auditoria do PR #108: capability(s) que um worker precisa
        ter para ser candidato a OFFER/HANDOFF desta tarefa. Vazio =
        nenhum requisito conhecido (área ausente/desconhecida) — nesse
        caso o filtro de compatibilidade não bloqueia ninguém, para nunca
        travar a fila só porque a área não foi declarada."""
        if self.capabilities_required:
            return frozenset(self.capabilities_required)
        capability = _AREA_TO_CAPABILITY.get(self.area or "")
        return frozenset({capability}) if capability else frozenset()


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
                capabilities_required=_parse_capabilities(t.get("capabilities_required")),
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


def _e_compativel(worker: WorkerRecord, tarefa: TaskRecord) -> bool:
    """B2 da auditoria do PR #108: compatibilidade agora é um requisito,
    não só um desempate. Sem requisito conhecido (área ausente/
    desconhecida) -> qualquer worker é compatível, para não travar a fila
    por falta de dado."""
    necessarias = tarefa.capacidades_necessarias
    if not necessarias:
        return True
    return bool(necessarias & set(worker.capabilities))


def _ordenar_candidatos(candidatos: list[WorkerRecord], tarefa: TaskRecord) -> list[WorkerRecord]:
    """B5 da auditoria do PR #108: desempate determinístico e ESTÁVEL,
    independente da ordem em que ``candidatos`` chegou. Três critérios,
    nesta ordem:

    1. especialização EXTRA — o worker declara a própria área da tarefa
       como capability, além da capability mínima já exigida por
       ``_e_compativel`` (ex.: capabilities=("materia", "conteudo") é
       preferido sobre só ("conteudo") para uma tarefa de área "materia");
    2. menor carga — sem ``current_task`` (sempre verdadeiro aqui, já que
       ``_candidatos_disponiveis`` já filtra por isso; mantido explícito
       para quando uma fase futura permitir carga parcial);
    3. critério final estável: ``worker_id`` em ordem alfabética — nunca
       "o primeiro da lista que chegou".
    """
    def chave(w: WorkerRecord) -> tuple[int, int, str]:
        especializacao_extra = 0 if (tarefa.area and tarefa.area in w.capabilities) else 1
        carga = 0 if w.current_task is None else 1
        return (especializacao_extra, carga, w.worker_id)

    return sorted(candidatos, key=chave)


def escolher_proxima_atribuicao(tarefas: list[TaskRecord], workers: list[WorkerRecord]) -> QueueDecision:
    """Decide a PRÓXIMA oferta tarefa->worker a partir de um snapshot —
    nunca executa, nunca escreve. Chamar de novo com o MESMO snapshot
    sempre devolve a MESMA decisão, mesmo que ``workers`` chegue em outra
    ordem (B5) — a resolução de concorrência real entre duas chamadas com
    snapshots DIFERENTES (dois workers voltando quase ao mesmo tempo) é
    responsabilidade de quem aplica a decisão com um `claim()` atômico
    (mesmo padrão de ``dedup.py``) — isso é Fase E da Issue #105, fora
    desta Fase A."""
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
    compativeis = [w for w in disponiveis if _e_compativel(w, tarefa)]
    if not compativeis:
        return QueueDecision(
            "WAIT", tarefa.id, None,
            f"{tarefa.id} está pronta e há worker(s) disponível(is), mas nenhum tem a "
            f"capability necessária ({sorted(tarefa.capacidades_necessarias)!r}) — (#105 Fase A, B2).",
        )

    escolhido = _ordenar_candidatos(compativeis, tarefa)[0]
    return QueueDecision(
        "OFFER", tarefa.id, escolhido.worker_id,
        f"{tarefa.id} (prioridade {tarefa.priority.value}) oferecida a "
        f"{escolhido.display_name} — compatível e escolhido por desempate determinístico (#85/#105 B5).",
    )


@dataclass(frozen=True)
class HandoffContext:
    """B3 da auditoria do PR #108: sinais qualitativos suficientes para a
    Issue #105 §2 ("progresso, trabalho restante, custo de transferência,
    urgência, risco médico/editorial, custo API") sem inventar precisão
    numérica que a Fase A não tem como medir de verdade (sem heartbeat
    real ainda — isso é Fase B). Todo campo aceita ``None``/default quando
    o sinal simplesmente não está disponível; a ausência de dado nunca
    é tratada como "favorável ao handoff" (ver ``_bucket_progresso``).

    Nada aqui pode PROMOVER um WAIT para HANDOFF — só rebaixar um HANDOFF
    (que já passou pelos gates de prioridade/checkpoint/compatibilidade/
    owner) para WAIT quando o custo-benefício não compensa. Risco alto
    nunca "favorece" handoff por si só — é só mais um motivo para manter
    WAIT quando os gates básicos já não fecham."""

    worker_status: str  # "LIMIT" | "NEAR_LIMIT" — por que a avaliação está acontecendo
    progress_percent: int | None = None
    # Fallback qualitativo quando não há percentual (heartbeat de sessão
    # humana normalmente só dá isto: "BAIXO"/"MEDIO"/"ALTO").
    remaining_work_bucket: str | None = None
    handoff_cost: str = "MEDIO"  # custo qualitativo de transferir contexto AGORA
    risk_level: str | None = None  # Nível A-E (#83) ou texto livre — só informativo aqui
    # Sinal externo (#84 §4, ex.: budget.priority_allowed) — False nunca
    # gera HANDOFF, mesmo com tudo mais favorável.
    budget_allows: bool = True

    def __post_init__(self) -> None:
        if self.worker_status not in _STATUS_HANDOFF_VALIDOS:
            raise ValueError(f"worker_status {self.worker_status!r} inválido — precisa ser um de {_STATUS_HANDOFF_VALIDOS}")
        if self.remaining_work_bucket is not None and self.remaining_work_bucket not in _BUCKETS_PROGRESSO:
            raise ValueError(f"remaining_work_bucket {self.remaining_work_bucket!r} inválido — precisa ser um de {_BUCKETS_PROGRESSO}")
        if self.handoff_cost not in _BUCKETS_CUSTO:
            raise ValueError(f"handoff_cost {self.handoff_cost!r} inválido — precisa ser um de {_BUCKETS_CUSTO}")
        if self.progress_percent is not None and not (0 <= self.progress_percent <= 100):
            raise ValueError("progress_percent precisa estar entre 0 e 100")


def _bucket_progresso(contexto: HandoffContext) -> str | None:
    """``None`` quando não há NENHUM sinal de progresso — tratado como
    desconhecido, nunca como "alto" nem "baixo" por suposição."""
    if contexto.progress_percent is not None:
        if contexto.progress_percent < 40:
            return "BAIXO"
        if contexto.progress_percent < 70:
            return "MEDIO"
        return "ALTO"
    return contexto.remaining_work_bucket


def _e_owner_atual(worker: WorkerRecord, tarefa: TaskRecord) -> bool:
    """B4 da auditoria do PR #108: o dono atual da tarefa nunca é
    candidato a assumi-la por handoff — mesmo que o registro esteja
    momentaneamente inconsistente (ex.: heartbeat atrasado) e ele apareça
    AVAILABLE. Compara por nome (``coordination/tasks.json::agente``,
    ex. "Claude 3") e por ``worker_id`` (slug, ex. "claude-3")."""
    if not tarefa.agente:
        return False
    alvo = tarefa.agente.strip().lower()
    return worker.display_name.strip().lower() == alvo or worker.worker_id == _slug(tarefa.agente)


def avaliar_handoff_de_tarefa(
    tarefa: TaskRecord,
    *,
    checkpoint_seguro: bool,
    workers: list[WorkerRecord],
    contexto: HandoffContext | None = None,
) -> HandoffDecision:
    """Casca sobre ``handoff.decidir_handoff``: deriva a prioridade a
    partir da ``TaskRecord``, exclui o dono atual (B4) e filtra por
    compatibilidade de capability (B2) antes de delegar a regra P0/P1 vs
    P3/P4 — nunca a duplica. Quando ``contexto`` é informado, um HANDOFF
    que os gates básicos já aprovariam ainda pode ser rebaixado para WAIT
    por custo-benefício (B3) — nunca o contrário."""
    # Reusa o mesmo filtro de disponibilidade de escolher_proxima_atribuicao
    # (status/can_execute/sem tarefa ativa — defesa em profundidade de
    # #82.1) antes de excluir o dono atual (B4) e filtrar compatibilidade
    # (B2); decidir_handoff() já reconfere status/can_execute por conta
    # própria, então isto só ACRESCENTA a checagem de current_task que ele
    # não faz.
    candidatos = [w for w in _candidatos_disponiveis(workers) if not _e_owner_atual(w, tarefa)]
    compativeis = [w for w in candidatos if _e_compativel(w, tarefa)]

    decisao = decidir_handoff(
        prioridade=tarefa.priority,
        checkpoint_seguro=checkpoint_seguro,
        candidatos_disponiveis=compativeis,
    )

    if decisao.action != "HANDOFF" or contexto is None:
        return decisao

    if not contexto.budget_allows:
        return HandoffDecision(
            "WAIT",
            "Orçamento não permite abrir um novo handoff agora (#84 §4) — aguardar apesar de "
            "os demais critérios favorecerem transferência.",
        )

    bucket = _bucket_progresso(contexto)
    if contexto.worker_status == "NEAR_LIMIT" and bucket == "ALTO" and contexto.handoff_cost == "ALTO":
        return HandoffDecision(
            "WAIT",
            "Worker está só NEAR_LIMIT (ainda pode concluir), progresso já é alto (~70%+) e o "
            "custo de transferir contexto agora é alto — esperar o worker original terminar é "
            "mais racional que pagar o handoff (Issue #105 §2, custo-benefício).",
        )

    return decisao


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
