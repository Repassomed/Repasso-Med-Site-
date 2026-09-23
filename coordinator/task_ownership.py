"""Dono OPERACIONAL de uma tarefa — Issue #105, Fase G, achado G8-A da
auditoria independente do PR #118.

O PROBLEMA que este módulo resolve (e só ele):

``coordination/tasks.json`` é **declarativo** e, durante uma execução, é
somente-leitura para o Coordinator (nenhum módulo deste pacote escreve
nele, e isso não muda aqui). Mas duas decisões operacionais liam o dono
da tarefa exatamente dali:

* ``handoff_exec._worker_e_o_dono_atual`` compara ``worker_anterior``
  com ``TaskRecord.agente``;
* ``scheduler.reprocessar_retorno`` → ``handoff.
  worker_retomando_deve_assumir`` compara ``TaskRecord.estado``/
  ``TaskRecord.agente`` com o worker que volta.

Depois de um handoff real A → B, a Fase E move o ownership no **Worker
Registry** (com compare-and-set) e, corretamente, NÃO escreve na
``main``. O resultado é que o dono operacional passa a ser B enquanto o
declarativo continua dizendo A — e a Fase F só voltaria a funcionar se
alguém editasse e mergeasse ``tasks.json`` NO MEIO do canário. Isso
quebraria o requisito central de handoff/retomada automática: multi-
handoff real passaria a depender de um merge humano por transferência.

A saída NÃO é escrever em ``tasks.json``. É ler o ownership vivo de onde
ele realmente mora: o Worker Registry, que já é protegido por CAS e por
heartbeat validado.

**REGRAS (todas fail-closed):**

1. **A visão operacional só troca ``agente``/``estado``.** ``id``,
   ``area``, ``arquivos``, ``dependencias``, ``prioridade_declarada`` e
   ``capabilities_required`` continuam vindo INTEIROS do declarativo —
   reserva de arquivos, prioridade e dependências nunca são derivadas de
   estado operacional.
2. **Nunca amplia.** Se o declarativo já saiu da janela executável
   (``DONE``/``MERGE-READY``/``NEEDS-AUDIT``/``NEEDS-FIX``/``BLOCKED``),
   a visão operacional é o próprio declarativo, sem troca alguma: um
   worker que volta com um registro velho nunca refaz uma tarefa que já
   avançou. A proteção do ``worker_retomando_deve_assumir`` continua
   valendo inteira.
3. **O registro vivo vence.** Se algum worker AINDA ocupa a tarefa
   (``current_task`` igual ao id canônico e status ``BUSY``/
   ``NEAR_LIMIT``/``LIMIT``), é ele o dono — mesmo que outro worker
   apresente um snapshot anterior. É essa regra que impede trabalho
   paralelo depois de um handoff.
4. **Ambiguidade é recusa.** Dois workers ocupando a mesma tarefa =
   nenhum dono operacional reconhecido (devolve o declarativo). O
   Coordinator prefere não decidir a decidir errado.
5. **O snapshot só entra quando o registro já não mostra ownership.**
   É exatamente o caso do ``SET_AVAILABLE``: ``aplicar_comando`` acabou
   de liberar ``current_task`` numa escrita atômica, então o dono vivo
   sumiu de propósito. O snapshot é o que aquele worker tinha ANTES
   dessa transição, lido do ``WorkerRecord`` REAL por quem chama —
   nunca do texto do comentário administrativo.
6. **Zero escrita.** Este módulo não escreve em ``tasks.json``, não
   escreve no Worker Registry e não executa nada. Só devolve uma visão.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

from .scheduler import TaskRecord
from .worker_ops import WorkerRecord

# Status em que um worker de fato OCUPA a tarefa apontada por
# ``current_task``. ``AVAILABLE``/``OFFLINE`` ficam de fora de propósito:
# um ``current_task`` preservado num worker AVAILABLE é uma RESERVA
# (``reservar_current_task_condicional``), não posse ativa.
STATUS_QUE_OCUPAM: tuple[str, ...] = ("BUSY", "NEAR_LIMIT", "LIMIT")

# Tradução status operacional -> estado declarativo equivalente. Só estes
# três; qualquer outro status não produz visão operacional.
ESTADO_POR_STATUS: dict[str, str] = {
    "BUSY": "IN-PROGRESS",
    "NEAR_LIMIT": "IN-PROGRESS",
    "LIMIT": "BLOCKED-LIMIT",
}

# Estados declarativos em que a tarefa ainda está na janela executável e,
# portanto, aceita que o ownership vivo mande. Fora desta lista o
# declarativo vence sempre (regra 2).
ESTADOS_ABERTOS: tuple[str, ...] = ("READY", "IN-PROGRESS", "BLOCKED-LIMIT")


@dataclass(frozen=True)
class OperationalWorkerSnapshot:
    """O que um worker tinha ANTES de uma transição que limpou o seu
    ``current_task`` (hoje: ``SET_AVAILABLE``). Montado por quem chama a
    partir do ``WorkerRecord`` REAL lido do registro, nunca de texto
    livre — ver ``worker_commands.aplicar_comando``."""

    worker_id: str
    status: str
    current_task: str | None
    last_checkpoint: str | None = None
    branch: str | None = None

    @classmethod
    def from_record(cls, registro: WorkerRecord) -> "OperationalWorkerSnapshot":
        return cls(
            worker_id=registro.worker_id,
            status=registro.status,
            current_task=registro.current_task,
            last_checkpoint=registro.last_checkpoint,
            branch=registro.branch,
        )


@dataclass(frozen=True)
class VisaoOperacional:
    """A tarefa como as decisões operacionais devem enxergá-la, mais o
    motivo (auditável) de ela ser o que é."""

    tarefa: TaskRecord
    dono_worker_id: str | None
    fonte: str  # "registro" | "snapshot" | "declarativo"
    reason: str

    @property
    def usou_ownership_vivo(self) -> bool:
        return self.fonte in ("registro", "snapshot")


def donos_no_registro(canonical_task_id: str, workers: list[WorkerRecord]) -> list[WorkerRecord]:
    """Todos os workers que OCUPAM a tarefa agora. Normalmente zero ou
    um; dois é a anomalia que a regra 4 recusa."""
    alvo = (canonical_task_id or "").strip()
    if not alvo:
        return []
    return [
        w for w in workers
        if w.current_task == alvo and w.status in STATUS_QUE_OCUPAM
    ]


def visao_operacional_da_tarefa(
    tarefa: TaskRecord,
    *,
    workers: list[WorkerRecord],
    snapshot: OperationalWorkerSnapshot | None = None,
) -> VisaoOperacional:
    """A visão operacional de ``tarefa`` (regras no docstring do módulo).

    ``workers`` é a lista FRESCA do Worker Registry. ``snapshot``, quando
    fornecido, é o estado pré-transição de UM worker — só consultado
    quando o registro vivo não aponta dono nenhum."""
    if tarefa.estado not in ESTADOS_ABERTOS:
        return VisaoOperacional(
            tarefa, None, "declarativo",
            (
                f"tarefa {tarefa.id!r} está {tarefa.estado!r} no registro declarativo — fora da janela "
                "executável; nenhum estado operacional pode reabri-la."
            ),
        )

    vivos = donos_no_registro(tarefa.id, workers)
    if len(vivos) > 1:
        return VisaoOperacional(
            tarefa, None, "declarativo",
            (
                f"{len(vivos)} workers ocupam {tarefa.id!r} ao mesmo tempo "
                f"({', '.join(sorted(w.worker_id for w in vivos))}) — ambiguidade, o Coordinator não "
                "escolhe dono; vale o registro declarativo."
            ),
        )

    if len(vivos) == 1:
        dono = vivos[0]
        return VisaoOperacional(
            replace(tarefa, agente=dono.worker_id, estado=ESTADO_POR_STATUS[dono.status]),
            dono.worker_id, "registro",
            (
                f"dono operacional de {tarefa.id!r} é {dono.worker_id!r} (status {dono.status!r} no "
                f"Worker Registry) — declarativo dizia agente={tarefa.agente!r}, estado="
                f"{tarefa.estado!r}, e continua intocado."
            ),
        )

    if snapshot is None:
        return VisaoOperacional(
            tarefa, None, "declarativo",
            f"nenhum worker ocupa {tarefa.id!r} no Worker Registry e nenhum snapshot foi fornecido.",
        )

    if snapshot.current_task != tarefa.id:
        return VisaoOperacional(
            tarefa, None, "declarativo",
            (
                f"snapshot de {snapshot.worker_id!r} aponta para {snapshot.current_task!r}, não para "
                f"{tarefa.id!r} — divergência, nenhum ownership operacional assumido."
            ),
        )

    if snapshot.status not in ESTADO_POR_STATUS:
        return VisaoOperacional(
            tarefa, None, "declarativo",
            (
                f"snapshot de {snapshot.worker_id!r} tem status {snapshot.status!r}, que não é posse "
                f"ativa ({', '.join(STATUS_QUE_OCUPAM)}) — nenhum ownership operacional assumido."
            ),
        )

    return VisaoOperacional(
        replace(tarefa, agente=snapshot.worker_id, estado=ESTADO_POR_STATUS[snapshot.status]),
        snapshot.worker_id, "snapshot",
        (
            f"nenhum worker ocupa {tarefa.id!r} agora (o próprio {snapshot.worker_id!r} acabou de ser "
            f"liberado); o estado imediatamente anterior dele, lido do Worker Registry real, era "
            f"{snapshot.status!r} com current_task={snapshot.current_task!r} — é ele o dono operacional."
        ),
    )
