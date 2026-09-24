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


# ---------------------------------------------------------------------
# Correção B4 da auditoria independente do PR #129 — protocolo RECUPERÁVEL
# de disparo do Guard.
#
# O modelo anterior tinha um único campo (``guard_dispatched_pr``) gravado
# ANTES da chamada ao GitHub: se a chamada falhasse (rede, 5xx, permissão),
# o registro já dizia "despachado" e toda tentativa futura recebia
# ALREADY_DISPATCHED — a PR podia ficar NEEDS-AUDIT sem Guard para sempre.
#
# Agora são três estados explícitos:
#
#   PENDING     -> uma execução reservou o direito de despachar e a chamada
#                  ainda não voltou (ou o processo morreu no meio);
#   DISPATCHED  -> a chamada VOLTOU COM SUCESSO. Único estado terminal:
#                  nada redispara depois disto;
#   FAILED      -> a chamada voltou com erro. Recuperável: uma próxima
#                  execução autorizada pode tentar de novo.
#
# Uma retomada de ``PENDING`` também é permitida, de propósito: um processo
# morto entre a reserva e a confirmação deixaria a tarefa presa para
# sempre, e um segundo disparo do Guard é inofensivo (o Guard é uma
# auditoria somente-leitura e o workflow tem ``concurrency`` por PR). O que
# NUNCA acontece é redisparar sobre um ``DISPATCHED`` — a duplicação
# silenciosa que a idempotência original queria evitar. ``guard_dispatch_
# attempts`` guarda quantas tentativas houve, para a auditoria.
# ---------------------------------------------------------------------

GUARD_DISPATCH_PENDING = "PENDING"
GUARD_DISPATCH_DISPATCHED = "DISPATCHED"
GUARD_DISPATCH_FAILED = "FAILED"
VALID_GUARD_DISPATCH_STATUSES: tuple[str, ...] = (
    GUARD_DISPATCH_PENDING, GUARD_DISPATCH_DISPATCHED, GUARD_DISPATCH_FAILED,
)
# Estados a partir dos quais uma nova tentativa é permitida. ``DISPATCHED``
# está deliberadamente FORA: é o único terminal.
GUARD_DISPATCH_RETOMAVEIS: tuple[str, ...] = (GUARD_DISPATCH_PENDING, GUARD_DISPATCH_FAILED)


@dataclass(frozen=True)
class TaskRuntimeRecord:
    """O estado operacional de UMA tarefa canônica. Campos mínimos pedidos
    pela Issue #128 §3 (``canonical_task_id``, ``status``, ``worker_id``,
    ``branch``, checkpoint/commit, ``pr_number``, ``updated_at``), mais o
    ``execution_task_id`` da regra 5 e o trio
    ``guard_dispatched_pr``/``guard_dispatch_status``/
    ``guard_dispatch_attempts``, que torna o disparo do Guard idempotente
    E recuperável (§9; correção B4 do PR #129)."""

    canonical_task_id: str
    status: str
    worker_id: str | None = None
    branch: str | None = None
    checkpoint_commit: str | None = None
    pr_number: int | None = None
    execution_task_id: str | None = None
    guard_dispatched_pr: int | None = None
    # B4 (PR #129): o estado do disparo do Guard, não mais só "houve um".
    guard_dispatch_status: str | None = None
    guard_dispatch_attempts: int = 0
    # Loop de correção pós-auditoria: cada NEEDS-FIX consumido gera uma
    # execution_task_id NOVA sobre o checkpoint da mesma PR. O fingerprint
    # impede o mesmo Cartão de Merge de disparar duas correções; o contador
    # permite um teto explícito no Worker Bridge.
    audit_fix_attempts: int = 0
    last_audit_fix_fingerprint: str | None = None
    last_audit_findings: str = ""
    # Falhas OPERACIONAIS de uma correção sem novo HEAD (patch vazio/JSON
    # malformado etc.) não são uma nova rodada semântica. Contador separado
    # permite retry limitado do MESMO parecer sem reabrir FAILED genérico.
    audit_fix_execution_failures: int = 0
    last_audit_fix_worker_id: str | None = None
    # Preserva os execution ids anteriores quando uma correção substitui o
    # execution_task_id corrente. Histórico auditável, nunca usado como claim.
    execution_history: tuple[str, ...] = ()
    reason: str = ""
    reserved_at: str | None = None
    updated_at: str | None = None
    # Relatório 8-A.11 já validado pelo Runner. Campo novo no FIM para
    # preservar a ordem posicional histórica e sobreviver a falhas de PR.
    question_report: str | None = None

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
        if self.guard_dispatch_status is not None and self.guard_dispatch_status not in VALID_GUARD_DISPATCH_STATUSES:
            raise ValueError(
                f"guard_dispatch_status {self.guard_dispatch_status!r} inválido — precisa ser None "
                f"ou um de {VALID_GUARD_DISPATCH_STATUSES}."
            )
        if not isinstance(self.guard_dispatch_attempts, int) or self.guard_dispatch_attempts < 0:
            raise ValueError(
                f"guard_dispatch_attempts precisa ser inteiro >= 0 — recebido {self.guard_dispatch_attempts!r}."
            )
        if not isinstance(self.audit_fix_attempts, int) or self.audit_fix_attempts < 0:
            raise ValueError(
                f"audit_fix_attempts precisa ser inteiro >= 0 — recebido {self.audit_fix_attempts!r}."
            )
        if self.last_audit_fix_fingerprint is not None and not str(self.last_audit_fix_fingerprint).strip():
            raise ValueError("last_audit_fix_fingerprint precisa ser None ou string não-vazia.")
        if not isinstance(self.audit_fix_execution_failures, int) or self.audit_fix_execution_failures < 0:
            raise ValueError(
                "audit_fix_execution_failures precisa ser inteiro >= 0."
            )
        if self.last_audit_fix_worker_id is not None and not str(self.last_audit_fix_worker_id).strip():
            raise ValueError("last_audit_fix_worker_id precisa ser None ou string não-vazia.")
        if not isinstance(self.execution_history, tuple) or any(
            not isinstance(x, str) or not x.strip() for x in self.execution_history
        ):
            raise ValueError("execution_history precisa ser tuple de ids de execução não-vazios.")
        if self.question_report is not None:
            if not isinstance(self.question_report, str) or not self.question_report.strip():
                raise ValueError("question_report precisa ser None ou texto não-vazio.")
            if len(self.question_report) > 14000:
                raise ValueError("question_report excede o limite persistente de 14000 caracteres.")

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

    @property
    def guard_retomada_pendente(self) -> bool:
        """Achado da 2ª auditoria independente do PR #129: o estado
        ``FAILED``/``PENDING`` só é recuperável se ALGUÉM voltar a
        executar o disparo. Esta propriedade é o predicado que o Worker
        Bridge usa para encontrar, ANTES de pegar uma tarefa nova, uma
        tarefa que já terminou (``NEEDS-AUDIT``/``DONE``), já tem PR
        aberta, e cujo Guard ainda não foi confirmado.

        Calculada, nunca gravável: nenhum dado persistido consegue
        declarar "precisa retomar" por conta própria."""
        if self.status not in (RUNTIME_NEEDS_AUDIT, RUNTIME_DONE):
            return False
        if self.pr_number is None:
            return False
        return self.guard_dispatch_status in GUARD_DISPATCH_RETOMAVEIS

    @property
    def guard_confirmado(self) -> bool:
        """Propriedade CALCULADA (nunca campo gravável): o Guard só conta
        como despachado quando a chamada voltou com sucesso. Um
        ``PENDING``/``FAILED`` — ou um registro antigo sem status — nunca
        é lido como confirmado."""
        return self.guard_dispatch_status == GUARD_DISPATCH_DISPATCHED

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
            "guard_dispatch_status": self.guard_dispatch_status,
            "guard_dispatch_attempts": self.guard_dispatch_attempts,
            "audit_fix_attempts": self.audit_fix_attempts,
            "last_audit_fix_fingerprint": self.last_audit_fix_fingerprint,
            "last_audit_findings": self.last_audit_findings,
            "audit_fix_execution_failures": self.audit_fix_execution_failures,
            "last_audit_fix_worker_id": self.last_audit_fix_worker_id,
            "execution_history": list(self.execution_history),
            "question_report": self.question_report,
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
            # Compatibilidade retroativa conservadora: um registro escrito
            # ANTES da correção B4 tem só ``guard_dispatched_pr``. Ele
            # significava "já despachei", então é lido como DISPATCHED —
            # nunca como PENDING, que autorizaria um redisparo que a
            # versão antiga não previa.
            guard_dispatch_status=(
                d.get("guard_dispatch_status")
                or (GUARD_DISPATCH_DISPATCHED if d.get("guard_dispatched_pr") else None)
            ),
            guard_dispatch_attempts=int(d.get("guard_dispatch_attempts") or 0),
            audit_fix_attempts=int(d.get("audit_fix_attempts") or 0),
            last_audit_fix_fingerprint=d.get("last_audit_fix_fingerprint"),
            last_audit_findings=d.get("last_audit_findings", ""),
            audit_fix_execution_failures=int(d.get("audit_fix_execution_failures") or 0),
            last_audit_fix_worker_id=d.get("last_audit_fix_worker_id"),
            execution_history=tuple(d.get("execution_history") or ()),
            question_report=d.get("question_report"),
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


def status_reconciliavel_apos_merge(registro: dict) -> bool:
    """NEEDS-AUDIT sempre; FAILED só no caso LEGADO em que a correção
    pós-auditoria esgotou sem novo HEAD (antes de 24/09/2026 isso gravava
    FAILED): há parecer consumido, checkpoint e PR registrados, então a PR
    continua sendo o entregável válido. FAILED de execução comum (sem PR)
    nunca é reconciliado."""
    status = registro.get("status")
    if status == RUNTIME_NEEDS_AUDIT:
        return True
    return bool(
        status == RUNTIME_FAILED
        and registro.get("last_audit_fix_fingerprint")
        and registro.get("checkpoint_commit")
        and registro.get("pr_number")
    )


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

    def reservar_correcao_apos_auditoria(
        self, canonical_task_id: str, *, worker_id: str,
        audit_fingerprint: str, audit_findings: str,
        max_attempts: int, checkpoint_commit: str | None = None,
        max_execution_failures: int = 3, token: str | None = None,
    ) -> ReservaResult:
        """Reserva explicitamente uma correção pedida pela auditoria.

        Este caminho só aceita uma tarefa que terminou em NEEDS-AUDIT,
        tem branch/checkpoint/PR publicados e recebeu um Cartão NEEDS-FIX
        novo. Cada reserva gera uma execution id fresca, preserva a anterior
        no histórico e zera somente o estado de dispatch do Guard, porque o
        novo commit precisará ser auditado de novo.

        Um fingerprint já CORRIGIDO não é consumido de novo. Exceção estreita:
        se a execução corretiva falhou operacionalmente antes de criar novo
        HEAD, o MESMO fingerprint pode ser retentado até
        max_execution_failures. Essas falhas não consomem max_attempts.
        """
        alvo = (canonical_task_id or "").strip()
        worker = (worker_id or "").strip()
        fingerprint = (audit_fingerprint or "").strip()
        findings = (audit_findings or "").strip()
        if not alvo or not worker or not fingerprint or not findings:
            return ReservaResult(False, "correção pós-auditoria exige tarefa, worker, fingerprint e achados.")
        if not isinstance(max_attempts, int) or max_attempts < 1:
            raise ValueError("max_attempts precisa ser inteiro >= 1.")
        if not isinstance(max_execution_failures, int) or max_execution_failures < 1:
            raise ValueError("max_execution_failures precisa ser inteiro >= 1.")

        execution_token = token or novo_token_de_execucao()
        novo_execution_id = derivar_execution_task_id(alvo, execution_token)

        def evaluate(dados: dict) -> tuple[bool, dict]:
            base = {t["canonical_task_id"]: t for t in (dados.get("tasks") or []) if t.get("canonical_task_id")}
            fresco = base.get(alvo)
            if fresco is None or fresco.get("status") != RUNTIME_NEEDS_AUDIT:
                return False, dados
            if not fresco.get("branch") or not fresco.get("checkpoint_commit") or not fresco.get("pr_number"):
                return False, dados
            checkpoint_alvo = (checkpoint_commit or fresco.get("checkpoint_commit") or "").strip()
            if not checkpoint_alvo:
                return False, dados
            mesmo_parecer = fresco.get("last_audit_fix_fingerprint") == fingerprint
            falhas_execucao = int(fresco.get("audit_fix_execution_failures") or 0)
            tentativas = int(fresco.get("audit_fix_attempts") or 0)
            if mesmo_parecer:
                if falhas_execucao <= 0 or falhas_execucao >= max_execution_failures:
                    return False, dados
                nova_tentativa_semantica = False
            else:
                if tentativas >= max_attempts:
                    return False, dados
                nova_tentativa_semantica = True
                falhas_execucao = 0

            historico = list(fresco.get("execution_history") or [])
            anterior = (fresco.get("execution_task_id") or "").strip()
            if anterior and anterior not in historico:
                historico.append(anterior)

            agora = _now_iso()
            base[alvo] = {
                **fresco,
                "status": RUNTIME_IN_PROGRESS,
                "worker_id": worker,
                "execution_task_id": novo_execution_id,
                "execution_history": historico,
                "audit_fix_attempts": tentativas + (1 if nova_tentativa_semantica else 0),
                "last_audit_fix_fingerprint": fingerprint,
                "last_audit_findings": findings,
                "audit_fix_execution_failures": falhas_execucao,
                "checkpoint_commit": checkpoint_alvo,
                "guard_dispatched_pr": None,
                "guard_dispatch_status": None,
                "reason": (
                    (
                        f"correção pós-auditoria #{tentativas + 1} reservada para {worker!r}"
                        if nova_tentativa_semantica
                        else f"retry operacional {falhas_execucao + 1}/{max_execution_failures} "
                             f"do mesmo parecer reservado para {worker!r}"
                    )
                    + "; execution id nova, mesma branch/PR e checkpoint vinculado ao HEAD auditado."
                ),
                "reserved_at": agora,
                "updated_at": agora,
            }
            return True, {**dados, "tasks": list(base.values())}

        aceito = self.store.conditional_update(
            evaluate, message=f"task-runtime: audit-fix {alvo} -> {worker}"
        )
        if not aceito:
            atual = self.get(alvo)
            if atual is None:
                motivo = "registro operacional ausente."
            elif atual.status != RUNTIME_NEEDS_AUDIT:
                motivo = f"estado atual {atual.status!r}, não NEEDS-AUDIT."
            elif atual.last_audit_fix_fingerprint == fingerprint:
                if atual.audit_fix_execution_failures >= max_execution_failures:
                    motivo = (
                        f"teto de {max_execution_failures} falhas operacionais para este parecer já atingido."
                    )
                elif atual.audit_fix_execution_failures > 0:
                    motivo = "retry operacional concorrente ou estado mudou durante a reserva."
                else:
                    motivo = "este mesmo parecer NEEDS-FIX já foi corrigido/consumido."
            elif atual.audit_fix_attempts >= max_attempts:
                motivo = f"teto de {max_attempts} correções automáticas já atingido."
            else:
                motivo = "branch/checkpoint/PR incompletos ou corrida concorrente."
            return ReservaResult(False, f"correção pós-auditoria não reservada: {motivo}")

        fresco = self.get(alvo)
        return ReservaResult(
            True,
            f"correção pós-auditoria reservada para {worker!r} com execution id fresca.",
            record=fresco,
        )

    def registrar_resultado(
        self, canonical_task_id: str, *, status: str, worker_id: str,
        execution_task_id: str, reason: str,
        checkpoint_commit: str | None = None, branch: str | None = None,
        question_report: str | None = None,
        reset_audit_execution_failures: bool = False,
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
                "question_report": (
                    question_report if question_report is not None else fresco.get("question_report")
                ),
                "audit_fix_execution_failures": (
                    0 if reset_audit_execution_failures
                    else int(fresco.get("audit_fix_execution_failures") or 0)
                ),
                "last_audit_fix_worker_id": (
                    None if reset_audit_execution_failures
                    else fresco.get("last_audit_fix_worker_id")
                ),
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

    def marcar_done_apos_merge(self, canonical_task_id: str, *, pr_number: int, branch: str) -> bool:
        """Reconcilia SOMENTE uma tarefa NEEDS-AUDIT (ou FAILED legado de
        correção pós-auditoria esgotada, ver ``status_reconciliavel_apos_merge``)
        cuja PR registrada foi
        confirmada externamente como mergeada. O chamador valida os dados da
        PR pela API; aqui o CAS impede evento atrasado, PR trocada ou branch
        divergente de promover estado indevidamente."""
        alvo = (canonical_task_id or "").strip()
        ramo = (branch or "").strip()
        self._validar_pr(pr_number)
        if not alvo or not ramo:
            return False

        def evaluate(dados: dict) -> tuple[bool, dict]:
            base = {x["canonical_task_id"]: x for x in (dados.get("tasks") or []) if x.get("canonical_task_id")}
            fresco = base.get(alvo)
            if fresco is None:
                return False, dados
            if not status_reconciliavel_apos_merge(fresco):
                return False, dados
            if fresco.get("pr_number") != pr_number:
                return False, dados
            if (fresco.get("branch") or "").strip() != ramo:
                return False, dados
            if fresco.get("guard_dispatch_status") != GUARD_DISPATCH_DISPATCHED:
                return False, dados
            base[alvo] = {
                **fresco,
                "status": RUNTIME_DONE,
                "reason": f"PR #{pr_number} mergeada por José; reconciliação automática confirmada.",
                "updated_at": _now_iso(),
            }
            return True, {**dados, "tasks": list(base.values())}

        return self.store.conditional_update(
            evaluate, message=f"task-runtime: merge PR #{pr_number} -> DONE ({alvo})"
        )

    def _validar_pr(self, pr_number: int) -> None:
        if not isinstance(pr_number, int) or pr_number <= 0:
            raise ValueError(f"pr_number precisa ser inteiro positivo — recebido {pr_number!r}.")

    def registrar_falha_operacional_correcao(
        self, canonical_task_id: str, *, worker_id: str, execution_task_id: str,
        reason: str, max_execution_failures: int,
    ) -> ReservaResult:
        """Falha/recusa do audit-fix SEM novo HEAD.

        Só este caminho pode voltar IN-PROGRESS -> NEEDS-AUDIT para repetir
        o MESMO parecer. Tarefa normal FAILED continua terminal. A rodada
        semântica já reservada continua contando UMA vez; retries operacionais
        do mesmo fingerprint não contam rodadas adicionais.

        No teto, o parecer deixa de ser elegível, mas a tarefa CONTINUA em
        NEEDS-AUDIT: a PR registrada ainda é o entregável válido, e só uma
        nova auditoria ou a decisão do José a resolvem. Resposta do worker
        sem novo HEAD — inclusive "nenhuma alteração necessária" — conta
        como uma tentativa operacional e pode ser refeita por outro worker
        até o teto; nunca encerra o parecer na primeira resposta.
        """
        alvo = (canonical_task_id or "").strip()
        worker = (worker_id or "").strip()
        execution_id = (execution_task_id or "").strip()
        motivo = (reason or "").strip() or "falha operacional sem novo HEAD."
        if not alvo or not worker or not execution_id:
            return ReservaResult(False, "falha operacional exige tarefa, worker e execution_task_id.")
        if not isinstance(max_execution_failures, int) or max_execution_failures < 1:
            raise ValueError("max_execution_failures precisa ser inteiro >= 1.")

        def evaluate(dados: dict) -> tuple[bool, dict]:
            base = {t["canonical_task_id"]: t for t in (dados.get("tasks") or []) if t.get("canonical_task_id")}
            fresco = base.get(alvo)
            if (
                fresco is None
                or fresco.get("status") != RUNTIME_IN_PROGRESS
                or (fresco.get("worker_id") or "") != worker
                or (fresco.get("execution_task_id") or "") != execution_id
                or not fresco.get("last_audit_fix_fingerprint")
                or not fresco.get("checkpoint_commit")
                or not fresco.get("pr_number")
            ):
                return False, dados

            falhas_antes = int(fresco.get("audit_fix_execution_failures") or 0)
            falhas_agora = falhas_antes + 1
            tentativas = int(fresco.get("audit_fix_attempts") or 0)
            if falhas_agora < max_execution_failures:
                motivo_final = (
                    f"falha operacional de correção {falhas_agora}/{max_execution_failures} "
                    f"sem novo HEAD: {motivo}"
                )
            else:
                motivo_final = (
                    f"correção automática encerrada para este parecer sem novo HEAD "
                    f"({falhas_agora}/{max_execution_failures}); a PR #{fresco.get('pr_number')} "
                    f"continua aberta aguardando nova auditoria ou decisão do José. Último motivo: {motivo}"
                )
            agora = _now_iso()
            base[alvo] = {
                **fresco,
                "status": RUNTIME_NEEDS_AUDIT,
                "audit_fix_attempts": tentativas,
                "audit_fix_execution_failures": falhas_agora,
                "last_audit_fix_worker_id": worker,
                # O Guard/cartão continuam válidos para o MESMO checkpoint.
                "guard_dispatched_pr": fresco.get("pr_number"),
                "guard_dispatch_status": GUARD_DISPATCH_DISPATCHED,
                "reason": motivo_final,
                "updated_at": agora,
            }
            return True, {**dados, "tasks": list(base.values())}

        aceito = self.store.conditional_update(
            evaluate, message=f"task-runtime: audit-fix operational failure {alvo}"
        )
        atual = self.get(alvo)
        if not aceito:
            return ReservaResult(False, "estado mudou; falha operacional não sobrescreveu registro mais novo.", atual)
        return ReservaResult(True, "falha operacional registrada com retry limitado.", atual)


    def reservar_guard_dispatch(self, canonical_task_id: str, *, pr_number: int) -> bool:
        """Passo 1 do protocolo B4: reserva o DIREITO de despachar o Guard,
        ANTES da chamada. Devolve ``True`` só quando a leitura fresca
        mostra um estado do qual uma tentativa é permitida:

        - nenhum disparo registrado ainda (campo ausente/``None``);
        - ``FAILED`` (a tentativa anterior falhou de verdade);
        - ``PENDING`` (uma tentativa anterior nunca se confirmou — processo
          morto entre a reserva e a confirmação);
        - ``DISPATCHED`` de uma PR DIFERENTE (o caso de uma PR nova para a
          mesma tarefa).

        Devolve ``False`` — e não escreve nada — quando o Guard já está
        ``DISPATCHED`` para ESTA PR. Esse é o único caminho para
        ``ALREADY_DISPATCHED``, e ele agora significa de fato "a chamada
        voltou com sucesso", não "alguém tentou uma vez"."""
        alvo = (canonical_task_id or "").strip()
        self._validar_pr(pr_number)

        def evaluate(dados: dict) -> tuple[bool, dict]:
            base = {t["canonical_task_id"]: t for t in (dados.get("tasks") or []) if t.get("canonical_task_id")}
            fresco = base.get(alvo)
            if fresco is None:
                return False, dados
            status = fresco.get("guard_dispatch_status") or (
                GUARD_DISPATCH_DISPATCHED if fresco.get("guard_dispatched_pr") else None
            )
            if status == GUARD_DISPATCH_DISPATCHED and fresco.get("guard_dispatched_pr") == pr_number:
                return False, dados
            base[alvo] = {
                **fresco,
                "guard_dispatched_pr": pr_number,
                "guard_dispatch_status": GUARD_DISPATCH_PENDING,
                "guard_dispatch_attempts": int(fresco.get("guard_dispatch_attempts") or 0) + 1,
                "updated_at": _now_iso(),
            }
            return True, {**dados, "tasks": list(base.values())}

        return self.store.conditional_update(
            evaluate, message=f"task-runtime: reserva disparo do Guard para PR #{pr_number} ({alvo})"
        )

    def _concluir_guard_dispatch(self, canonical_task_id: str, *, pr_number: int, status: str) -> bool:
        alvo = (canonical_task_id or "").strip()
        self._validar_pr(pr_number)
        if status not in (GUARD_DISPATCH_DISPATCHED, GUARD_DISPATCH_FAILED):
            raise ValueError(f"status de conclusão inválido: {status!r}.")

        def evaluate(dados: dict) -> tuple[bool, dict]:
            base = {t["canonical_task_id"]: t for t in (dados.get("tasks") or []) if t.get("canonical_task_id")}
            fresco = base.get(alvo)
            if fresco is None:
                return False, dados
            # Só quem está PENDING para ESTA PR pode concluir: uma
            # conclusão atrasada de outra tentativa nunca sobrescreve um
            # DISPATCHED já confirmado.
            if fresco.get("guard_dispatch_status") != GUARD_DISPATCH_PENDING:
                return False, dados
            if fresco.get("guard_dispatched_pr") != pr_number:
                return False, dados
            base[alvo] = {**fresco, "guard_dispatch_status": status, "updated_at": _now_iso()}
            return True, {**dados, "tasks": list(base.values())}

        return self.store.conditional_update(
            evaluate, message=f"task-runtime: disparo do Guard {status} para PR #{pr_number} ({alvo})"
        )

    def confirmar_guard_dispatch(self, canonical_task_id: str, *, pr_number: int) -> bool:
        """Passo 2a: a chamada VOLTOU COM SUCESSO -> ``DISPATCHED``, o
        único estado terminal."""
        return self._concluir_guard_dispatch(
            canonical_task_id, pr_number=pr_number, status=GUARD_DISPATCH_DISPATCHED
        )

    def falhar_guard_dispatch(self, canonical_task_id: str, *, pr_number: int) -> bool:
        """Passo 2b: a chamada falhou -> ``FAILED``, recuperável por uma
        próxima execução autorizada. É o que impede a PR de ficar
        NEEDS-AUDIT sem Guard para sempre."""
        return self._concluir_guard_dispatch(
            canonical_task_id, pr_number=pr_number, status=GUARD_DISPATCH_FAILED
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
