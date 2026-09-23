"""Estado OPERACIONAL de tarefa — Issue #128 (Worker Bridge V1), §3.

O PROBLEMA que este módulo resolve (e só ele):

``coordination/tasks.json`` é **declarativo** e, durante uma execução, é
somente-leitura para o Coordinator — nenhum módulo deste pacote escreve
nele, e isso NÃO muda aqui. Mas a fila do ``scheduler.py`` decide a
partir de ``estado``: uma tarefa ``READY`` executada pelo Worker Bridge
que termina em ``NEEDS-AUDIT`` continuaria aparecendo como ``READY`` no
arquivo declarativo até José editar e mergear a ``main`` — e seria
redistribuída a cada execução do Bridge, gastando chamada paga de novo
sobre um trabalho que já existe.

A saída NÃO é escrever em ``tasks.json``. É registrar o estado
operacional onde ele já mora para todo o resto do Coordinator: numa
branch de estado dedicada (``coordinator-state-task-runtime``), com o
MESMO ``GitJsonStore``/compare-and-set de ``git_state.py`` que já
persiste dedup, orçamento e Worker Registry entre execuções efêmeras do
GitHub Actions — nunca uma segunda implementação de CAS.

Este módulo é irmão de ``task_ownership.py``, não um substituto:

* ``task_ownership.visao_operacional_da_tarefa`` responde "QUEM é o dono
  vivo desta tarefa AGORA?" a partir do Worker Registry (``current_task``
  + status do worker) — um retrato instantâneo, que desaparece quando o
  job efêmero termina e o worker volta a ``OFFLINE``;
* este módulo responde "esta tarefa JÁ FOI executada, e em que terminou?"
  — um registro DURÁVEL por ``task_id``, que sobrevive ao fim do job e é
  o que impede redistribuição.

**REGRAS (todas fail-closed):**

1. **Zero escrita em ``coordination/tasks.json``/``main``.** Só na branch
   de estado dedicada. A "visão combinada" (``aplicar_runtime_em_tarefas``)
   é um objeto em memória, nunca um arquivo republicado.
2. **A visão operacional só troca ``estado``/``agente``** — mesma regra 1
   de ``task_ownership.py``. ``id``, ``area``, ``arquivos``,
   ``dependencias``, ``prioridade_declarada`` e ``capabilities_required``
   continuam vindo INTEIROS do declarativo: reserva de arquivo,
   prioridade e dependência nunca são derivadas de estado operacional.
3. **Nunca amplia.** Se o declarativo já saiu da janela executável
   (``ESTADOS_ABERTOS`` de ``task_ownership.py`` — ``READY``/
   ``IN-PROGRESS``/``BLOCKED-LIMIT``), o runtime é IGNORADO para efeito
   de visão: um registro operacional nunca reabre uma tarefa que o
   declarativo já fechou (``DONE``/``MERGE-READY``/``NEEDS-AUDIT``/
   ``NEEDS-FIX``/``BLOCKED``). É o mesmo portão do achado G9.
4. **Reserva é compare-and-set, e só existe uma.** ``reservar`` só tem
   êxito quando NÃO EXISTE registro nenhum para aquele ``task_id`` numa
   leitura FRESCA — então duas execuções concorrentes nunca reservam a
   mesma tarefa, e uma tarefa que já foi executada (qualquer status,
   inclusive ``FAILED``) nunca é reservada de novo automaticamente.
   Retomar/repetir exige decisão explícita (§11 da Issue #128: "FAILED/
   BLOCKED também NÃO deve entrar em retry automático silencioso").
5. **O id de EXECUÇÃO nasce na reserva e é gravado com ela.** O claim do
   Runner (``runner_dispatch.RunnerClaimStore``) consome um ``task_id``
   PERMANENTEMENTE; por isso o Runner recebe sempre um id de execução
   derivado (``<canonico>--bridge-<token>``), gerado UMA vez, aqui,
   junto da reserva. Uma nova tentativa só pode existir com uma reserva
   nova (decisão explícita), que gera um token novo — nunca reaproveita
   um execution id já reivindicado.
6. **Resultado também é compare-and-set.** ``registrar_resultado`` só
   escreve quando a leitura fresca ainda mostra ``IN-PROGRESS`` com o
   MESMO ``worker_id`` e o MESMO ``execution_task_id`` da reserva — uma
   execução que perdeu a corrida nunca sobrescreve o resultado de quem
   ganhou.
7. **Não executa nada.** Nenhuma chamada de modelo, nenhum
   commit/publicação, nenhum merge, nenhuma decisão de fila — só
   persistência e uma projeção de leitura.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from dataclasses import dataclass, replace
from datetime import datetime, timezone

from .scheduler import TaskRecord
from .task_ownership import ESTADOS_ABERTOS
from .worker_ops import WorkerStateStore

# Branch de estado DEDICADA — nunca a branch padrão, nunca matéria. Mesmo
# padrão de ``worker_ops.DEFAULT_STATE_BRANCH`` e das branches de dedup/
# orçamento do Coordinator.
DEFAULT_TASK_RUNTIME_STATE_BRANCH = "coordinator-state-task-runtime"

RUNTIME_IN_PROGRESS = "IN-PROGRESS"
RUNTIME_BLOCKED_LIMIT = "BLOCKED-LIMIT"
RUNTIME_NEEDS_AUDIT = "NEEDS-AUDIT"
RUNTIME_BLOCKED = "BLOCKED"
RUNTIME_FAILED = "FAILED"
RUNTIME_DONE = "DONE"

VALID_RUNTIME_STATUSES: tuple[str, ...] = (
    RUNTIME_IN_PROGRESS,
    RUNTIME_BLOCKED_LIMIT,
    RUNTIME_NEEDS_AUDIT,
    RUNTIME_BLOCKED,
    RUNTIME_FAILED,
    RUNTIME_DONE,
)

# §11 da Issue #128: NENHUM destes volta para a fila como tarefa READY
# nova. Os quatro primeiros são óbvios (em execução, interrompida com
# checkpoint, aguardando auditoria, concluída); ``FAILED``/``BLOCKED``
# entram na MESMA lista de propósito — "falha não pode virar retry
# automático silencioso" (Issue #105, herdado). Reentrar exige evento/
# decisão explícita, nunca uma segunda execução do Bridge.
STATUS_NAO_REDISTRIBUIVEIS: frozenset[str] = frozenset(VALID_RUNTIME_STATUSES)

# Status operacional -> estado DECLARATIVO equivalente, para a projeção de
# leitura consumida pelo ``scheduler.py`` (que só conhece o vocabulário de
# ``coordination/STATES.md``). ``FAILED`` não existe naquele vocabulário e
# é projetado como ``BLOCKED`` — o análogo honesto: fora da janela
# executável, à espera de uma decisão explícita. O registro operacional
# continua guardando ``FAILED`` de verdade, sem perda de informação.
ESTADO_DECLARATIVO_POR_RUNTIME: dict[str, str] = {
    RUNTIME_IN_PROGRESS: "IN-PROGRESS",
    RUNTIME_BLOCKED_LIMIT: "BLOCKED-LIMIT",
    RUNTIME_NEEDS_AUDIT: "NEEDS-AUDIT",
    RUNTIME_BLOCKED: "BLOCKED",
    RUNTIME_FAILED: "BLOCKED",
    RUNTIME_DONE: "DONE",
}

# Sufixo do id de EXECUÇÃO derivado (regra 5). Mesma família de
# ``handoff_exec.derivar_task_id_de_continuacao`` (``--continuacao-<sha>``)
# e de ``runner_resume`` (``--resume-<sha>``) — nunca um id canônico.
SUFIXO_EXECUCAO = "--bridge-"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def derivar_execution_task_id(canonical_task_id: str, token: str) -> str:
    """``<canonico>--bridge-<token>``. O token NUNCA é derivado do id
    canônico (senão duas reservas gerariam o mesmo execution id e a
    segunda perderia o claim do Runner por engano): ele vem de
    ``uuid.uuid4()`` no momento da reserva e é persistido com ela."""
    alvo = (canonical_task_id or "").strip()
    limpo = (token or "").strip().lower()
    if not alvo:
        raise ValueError("canonical_task_id não pode ser vazio.")
    if not limpo or not all(c in "0123456789abcdef" for c in limpo):
        raise ValueError(f"token de execução {token!r} precisa ser hexadecimal não-vazio.")
    return f"{alvo}{SUFIXO_EXECUCAO}{limpo}"


def novo_token_de_execucao() -> str:
    return uuid.uuid4().hex[:12]


@dataclass(frozen=True)
class TaskRuntimeRecord:
    """O estado operacional de UMA tarefa canônica. Campos mínimos pedidos
    pela Issue #128 §3 (``canonical_task_id``, ``status``, ``worker_id``,
    ``branch``, checkpoint/commit, ``pr_number``, ``updated_at``), mais o
    ``execution_task_id`` da regra 5 e o ``guard_dispatched_pr`` que torna
    o disparo do Guard idempotente (§9)."""

    canonical_task_id: str
    status: str
    worker_id: str | None = None
    branch: str | None = None
    checkpoint_commit: str | None = None
    pr_number: int | None = None
    execution_task_id: str | None = None
    guard_dispatched_pr: int | None = None
    reason: str = ""
    reserved_at: str | None = None
    updated_at: str | None = None

    def __post_init__(self) -> None:
        if not self.canonical_task_id or not str(self.canonical_task_id).strip():
            raise ValueError("canonical_task_id não pode ser vazio.")
        if self.status not in VALID_RUNTIME_STATUSES:
            raise ValueError(
                f"status {self.status!r} inválido — precisa ser um de {VALID_RUNTIME_STATUSES}."
            )
        if self.status == RUNTIME_BLOCKED_LIMIT and not self.checkpoint_commit:
            raise ValueError(
                "status='BLOCKED-LIMIT' exige checkpoint_commit explícito — uma tarefa "
                "interrompida por limite sem checkpoint não pode ser representada como "
                "retomável (Issue #84 §6; Issue #128 §10)."
            )
        if self.pr_number is not None and (not isinstance(self.pr_number, int) or self.pr_number <= 0):
            raise ValueError(f"pr_number precisa ser None ou inteiro positivo — recebido {self.pr_number!r}.")
        if self.guard_dispatched_pr is not None and (
            not isinstance(self.guard_dispatched_pr, int) or self.guard_dispatched_pr <= 0
        ):
            raise ValueError(
                f"guard_dispatched_pr precisa ser None ou inteiro positivo — recebido {self.guard_dispatched_pr!r}."
            )

    @property
    def redistribuivel(self) -> bool:
        """Sempre ``False`` para todo status válido (regra 4/§11) — é uma
        propriedade CALCULADA, nunca um campo gravável: nenhum dado
        persistido consegue marcar uma tarefa já executada como "pode
        voltar para a fila"."""
        return self.status not in STATUS_NAO_REDISTRIBUIVEIS

    @property
    def estado_declarativo_equivalente(self) -> str:
        return ESTADO_DECLARATIVO_POR_RUNTIME[self.status]

    def to_dict(self) -> dict:
        return {
            "canonical_task_id": self.canonical_task_id,
            "status": self.status,
            "worker_id": self.worker_id,
            "branch": self.branch,
            "checkpoint_commit": self.checkpoint_commit,
            "pr_number": self.pr_number,
            "execution_task_id": self.execution_task_id,
            "guard_dispatched_pr": self.guard_dispatched_pr,
            "reason": self.reason,
            "reserved_at": self.reserved_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "TaskRuntimeRecord":
        return cls(
            canonical_task_id=d["canonical_task_id"],
            status=d["status"],
            worker_id=d.get("worker_id"),
            branch=d.get("branch"),
            checkpoint_commit=d.get("checkpoint_commit"),
            pr_number=d.get("pr_number"),
            execution_task_id=d.get("execution_task_id"),
            guard_dispatched_pr=d.get("guard_dispatched_pr"),
            reason=d.get("reason", ""),
            reserved_at=d.get("reserved_at"),
            updated_at=d.get("updated_at"),
        )


@dataclass(frozen=True)
class ReservaResult:
    """O que aconteceu numa tentativa de reserva. ``record`` só vem
    preenchido quando ``reservado is True`` — e é o ÚNICO lugar de onde o
    ``execution_task_id`` legítimo pode sair."""

    reservado: bool
    reason: str
    record: TaskRuntimeRecord | None = None

    def to_dict(self) -> dict:
        return {
            "reservado": self.reservado,
            "reason": self.reason,
            "record": self.record.to_dict() if self.record else None,
        }


class TaskRuntimeStore:
    """Fachada sobre um ``worker_ops.WorkerStateStore`` (``GitJsonStore``
    em produção; ``InMemoryWorkerStateStore``/``LocalJsonWorkerStateStore``
    em teste) — o MESMO protocolo ``read``/``update``/
    ``conditional_update`` que o Worker Registry operacional já usa, nunca
    um backend próprio."""

    def __init__(self, store: WorkerStateStore) -> None:
        self.store = store

    # -- leitura ---------------------------------------------------------

    def list_records(self) -> list[TaskRuntimeRecord]:
        dados = self.store.read()
        brutos = dados.get("tasks") or []
        registros: list[TaskRuntimeRecord] = []
        for bruto in brutos:
            try:
                registros.append(TaskRuntimeRecord.from_dict(bruto))
            except (KeyError, ValueError):
                # Um registro corrompido nunca é tratado como "tarefa
                # livre": ele é ignorado na projeção, mas a reserva abaixo
                # continua vendo a CHAVE ocupada (ela olha o dict cru), o
                # que mantém o fail-closed.
                continue
        return sorted(registros, key=lambda r: r.canonical_task_id)

    def get(self, canonical_task_id: str) -> TaskRuntimeRecord | None:
        alvo = (canonical_task_id or "").strip()
        for r in self.list_records():
            if r.canonical_task_id == alvo:
                return r
        return None

    def por_id(self) -> dict[str, TaskRuntimeRecord]:
        return {r.canonical_task_id: r for r in self.list_records()}

    # -- escrita (sempre compare-and-set) --------------------------------

    def reservar(
        self, canonical_task_id: str, *, worker_id: str, branch: str,
        token: str | None = None, reason: str = "",
    ) -> ReservaResult:
        """Regra 4: só a PRIMEIRA execução, entre quaisquer processos
        concorrentes, reserva a tarefa. Qualquer registro já existente
        (mesmo ``FAILED``) faz a reserva falhar sem escrever nada."""
        alvo = (canonical_task_id or "").strip()
        if not alvo:
            return ReservaResult(False, "canonical_task_id vazio — nada reservado.")
        if not (worker_id or "").strip():
            return ReservaResult(False, "worker_id vazio — nada reservado.")

        execution_token = token or novo_token_de_execucao()
        novo = TaskRuntimeRecord(
            canonical_task_id=alvo,
            status=RUNTIME_IN_PROGRESS,
            worker_id=worker_id,
            branch=branch,
            execution_task_id=derivar_execution_task_id(alvo, execution_token),
            reason=reason or f"reservada pelo Worker Bridge para {worker_id!r}.",
            reserved_at=_now_iso(),
            updated_at=_now_iso(),
        )

        def evaluate(dados: dict) -> tuple[bool, dict]:
            base = {t["canonical_task_id"]: t for t in (dados.get("tasks") or []) if t.get("canonical_task_id")}
            if alvo in base:
                return False, dados
            base[alvo] = novo.to_dict()
            return True, {**dados, "tasks": list(base.values())}

        aceito = self.store.conditional_update(
            evaluate, message=f"task-runtime: reserva {alvo} -> {worker_id}"
        )
        if not aceito:
            existente = self.get(alvo)
            atual = existente.status if existente else "(registro presente, ilegível)"
            return ReservaResult(
                False,
                (
                    f"tarefa {alvo!r} já tem estado operacional registrado ({atual}) — "
                    "não é reservada de novo automaticamente; reentrar exige decisão explícita "
                    "(Issue #128 §11)."
                ),
            )
        return ReservaResult(True, f"tarefa {alvo!r} reservada para {worker_id!r}.", record=novo)

    def registrar_resultado(
        self, canonical_task_id: str, *, status: str, worker_id: str,
        execution_task_id: str, reason: str,
        checkpoint_commit: str | None = None, branch: str | None = None,
    ) -> bool:
        """Regra 6: só escreve quando a leitura FRESCA ainda mostra a
        reserva desta MESMA execução (``IN-PROGRESS`` + mesmo
        ``worker_id`` + mesmo ``execution_task_id``)."""
        alvo = (canonical_task_id or "").strip()
        if status not in VALID_RUNTIME_STATUSES or status == RUNTIME_IN_PROGRESS:
            raise ValueError(
                f"status {status!r} não é um resultado final válido — precisa ser um de "
                f"{tuple(s for s in VALID_RUNTIME_STATUSES if s != RUNTIME_IN_PROGRESS)}."
            )

        def evaluate(dados: dict) -> tuple[bool, dict]:
            base = {t["canonical_task_id"]: t for t in (dados.get("tasks") or []) if t.get("canonical_task_id")}
            fresco = base.get(alvo)
            if fresco is None:
                return False, dados
            if fresco.get("status") != RUNTIME_IN_PROGRESS:
                return False, dados
            if fresco.get("worker_id") != worker_id:
                return False, dados
            if fresco.get("execution_task_id") != execution_task_id:
                return False, dados
            base[alvo] = {
                **fresco,
                "status": status,
                "reason": reason,
                "checkpoint_commit": checkpoint_commit if checkpoint_commit is not None else fresco.get("checkpoint_commit"),
                "branch": branch if branch is not None else fresco.get("branch"),
                "updated_at": _now_iso(),
            }
            return True, {**dados, "tasks": list(base.values())}

        return self.store.conditional_update(
            evaluate, message=f"task-runtime: resultado {alvo} -> {status}"
        )

    def registrar_pr(self, canonical_task_id: str, *, pr_number: int, esperado_status: str) -> bool:
        """Grava o número da PR aberta para a tarefa. CAS sobre o status
        esperado e sobre ``pr_number`` ainda ausente — chamar duas vezes
        com o MESMO número devolve ``False`` na segunda (idempotência do
        §9: a PR é reutilizada, nunca duplicada)."""
        alvo = (canonical_task_id or "").strip()
        if not isinstance(pr_number, int) or pr_number <= 0:
            raise ValueError(f"pr_number precisa ser inteiro positivo — recebido {pr_number!r}.")

        def evaluate(dados: dict) -> tuple[bool, dict]:
            base = {t["canonical_task_id"]: t for t in (dados.get("tasks") or []) if t.get("canonical_task_id")}
            fresco = base.get(alvo)
            if fresco is None or fresco.get("status") != esperado_status:
                return False, dados
            if fresco.get("pr_number") is not None:
                return False, dados
            base[alvo] = {**fresco, "pr_number": pr_number, "updated_at": _now_iso()}
            return True, {**dados, "tasks": list(base.values())}

        return self.store.conditional_update(
            evaluate, message=f"task-runtime: PR #{pr_number} para {alvo}"
        )

    def marcar_guard_disparado(self, canonical_task_id: str, *, pr_number: int) -> bool:
        """CAS que torna o disparo do Guard idempotente: devolve ``True``
        só na PRIMEIRA vez para aquele par (tarefa, PR). Quem chama só
        dispara o Guard quando isto devolve ``True``."""
        alvo = (canonical_task_id or "").strip()
        if not isinstance(pr_number, int) or pr_number <= 0:
            raise ValueError(f"pr_number precisa ser inteiro positivo — recebido {pr_number!r}.")

        def evaluate(dados: dict) -> tuple[bool, dict]:
            base = {t["canonical_task_id"]: t for t in (dados.get("tasks") or []) if t.get("canonical_task_id")}
            fresco = base.get(alvo)
            if fresco is None:
                return False, dados
            if fresco.get("guard_dispatched_pr") == pr_number:
                return False, dados
            base[alvo] = {**fresco, "guard_dispatched_pr": pr_number, "updated_at": _now_iso()}
            return True, {**dados, "tasks": list(base.values())}

        return self.store.conditional_update(
            evaluate, message=f"task-runtime: Guard despachado para PR #{pr_number} ({alvo})"
        )


# ---------------------------------------------------------------------
# Projeção de leitura: declarativo + runtime, sem NENHUMA escrita.
# ---------------------------------------------------------------------

def aplicar_runtime_em_tarefas(
    tarefas: list[TaskRecord], registros: dict[str, TaskRuntimeRecord]
) -> list[TaskRecord]:
    """A visão que o Worker Bridge entrega ao ``scheduler.py``.

    Regras 2 e 3: só ``estado``/``agente`` mudam, e só quando o
    declarativo AINDA está na janela executável (``ESTADOS_ABERTOS``) —
    um registro operacional nunca reabre nem reclassifica uma tarefa que
    o declarativo já fechou. ``arquivos``/``dependencias``/prioridade/
    capabilities continuam exatamente como estão em
    ``coordination/tasks.json``.

    Efeito colateral desejado (§3, "Dependências também precisam
    considerar DONE operacional"): como a projeção troca ``estado`` no
    próprio ``TaskRecord``, o ``_dependencias_satisfeitas`` que já existe
    no scheduler passa a ver ``DONE`` operacional sem precisar de nenhuma
    regra nova — e a reserva de arquivo de uma tarefa operacionalmente
    ``IN-PROGRESS``/``BLOCKED-LIMIT`` passa a valer pela mesma
    ``_arquivos_reservados_por_tarefas_ativas`` de sempre.
    """
    saida: list[TaskRecord] = []
    for tarefa in tarefas:
        registro = registros.get(tarefa.id)
        if registro is None or tarefa.estado not in ESTADOS_ABERTOS:
            saida.append(tarefa)
            continue
        saida.append(
            replace(
                tarefa,
                estado=registro.estado_declarativo_equivalente,
                agente=registro.worker_id or tarefa.agente,
            )
        )
    return saida


# ---------------------------------------------------------------------
# CLI de LEITURA — só imprime o estado operacional persistido. Nenhuma
# escrita, nenhum disparo, nenhuma decisão de fila (isso é worker_bridge).
# ---------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description="Estado operacional de tarefa (Issue #128 §3) — somente LEITURA."
    )
    ap.add_argument("--runtime-state-git-remote", required=True)
    ap.add_argument("--runtime-state-git-branch", default=DEFAULT_TASK_RUNTIME_STATE_BRANCH)
    ap.add_argument("--out", default=None)
    return ap


def main(argv: list[str] | None = None) -> int:
    from .git_state import GitJsonStore
    from .redact import redact, redact_mapping

    args = _build_arg_parser().parse_args(argv)
    store = TaskRuntimeStore(
        GitJsonStore(args.runtime_state_git_remote, branch=args.runtime_state_git_branch)
    )
    try:
        registros = [r.to_dict() for r in store.list_records()]
    except Exception as exc:  # fail-closed: nunca "nenhuma tarefa executada" por erro de rede
        print(f"ERRO fail-closed ao ler o estado operacional: {redact(str(exc))}")
        return 1

    saida = json.dumps(redact_mapping({"tasks": registros}), indent=2, ensure_ascii=False)
    print(saida)
    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(saida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
