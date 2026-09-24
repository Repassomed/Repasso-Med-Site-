"""Heartbeat estruturado dos workers — Issue #105, Fase B.

Decisão operacional de José (comentário na Issue #105, "IMPLEMENTAR ANTES
DO PILOTO"): Claude 3 implementa #105-B nesta rodada, em paralelo com
Claude 2 em #105-C (`runner_contract.py`), sem colisão de arquivo. Escopo
declarado: só `coordinator/heartbeat.py` e
`coordinator/tests/test_heartbeat.py` — `worker_commands.py` só seria
tocado se REALMENTE necessário (não foi: o heartbeat estruturado tem
formato e parser próprios, independentes dos comandos em linguagem
natural que `worker_commands.py` já resolve para REGISTER/DEACTIVATE/
SET_LIMIT/SET_AVAILABLE).

Mesma filosofia determinística de `worker_commands.py`/`scheduler.py`:
zero chamada de API, zero I/O de rede. Este módulo faz três coisas:

1. Consome ``runner_contract.RunnerHeartbeat`` — o contrato CANÔNICO
   único (ver correções abaixo). Fail-closed: um payload inválido nunca
   produz um heartbeat "quase certo", ele simplesmente não existe
   (``ValueError``). O MESMO contrato serve heartbeat de sessão humana
   (comentário estruturado, ``parse_heartbeat_comment``) e o futuro
   ``api_runner`` (payload dict, ``heartbeat_de_payload``) — nada aqui
   depende de `type` do worker.
2. ``aplicar_heartbeat`` — atualiza o ``OperationalWorkerRegistry``
   (status, tarefa, branch, commit, ``last_checkpoint``, progresso,
   ``last_heartbeat``) numa única escrita (``upsert``), nunca duas
   chamadas separadas que deixariam uma janela de estado parcial. Worker
   desconhecido é REJEITADO explicitamente (nunca autocadastrado por um
   heartbeat — cadastro continua sendo ato humano explícito via
   `worker_commands.py`, #99).
3. ``avaliar_stale`` — função PURA (recebe um ``WorkerRecord`` já lido,
   nunca o registro/store) que só sinaliza heartbeat velho; nunca muda
   status sozinha. "Worker sumiu" e "worker mudou de estado" são coisas
   diferentes: só o segundo caso tem um sinal explícito (o próprio
   heartbeat) — o primeiro é sempre incerteza, nunca uma inferência de
   LIMIT/OFFLINE.

Nada aqui executa handoff, dispara runner, escreve em
`coordination/tasks.json` ou faz merge/deploy — ``sinal_de_limite`` e
``HeartbeatApplyResult.ficou_disponivel_agora`` só preparam o terreno
para a Fase E (handoff automático) e Fase F (retomada automática)
reagirem, mais adiante.

---

**Correções da auditoria independente do PR #110 (H1-H4) — só isto, Fase
D/runner_dispatch/workflow continuam fora de escopo:**

- H1: este módulo definia sua PRÓPRIA ``RunnerHeartbeat``, incompatível
  com a que o PR #111 (``#105-C Runner Contract``, já auditado e
  mergeado) define em ``runner_contract.py`` — dois contratos oficiais
  divergentes antes mesmo de existir um consumidor real (Fase D). A
  classe local foi REMOVIDA por completo; este módulo agora só importa
  ``from .runner_contract import RunnerHeartbeat`` e usa exclusivamente
  essa definição — parser, payload, aplicador e testes.
- H2: ``runner_contract.RunnerHeartbeat.__post_init__`` (correção C1 do
  PR #111) já garante, na própria CONSTRUÇÃO do objeto, que
  ``BUSY``/``NEAR_LIMIT``/``LIMIT`` exigem ``task_id`` preenchido e que
  ``AVAILABLE``/``OFFLINE`` nunca podem carregar ``task_id``. Um
  heartbeat "BUSY sem TASK" simplesmente não é um ``RunnerHeartbeat``
  válido — a construção falha (``ValueError``) antes de chegar perto de
  ``aplicar_heartbeat``, então não existe mais o caminho em que um
  heartbeat parcial apagaria ``current_task`` por acidente.
- H3: ``worker_ops.WorkerRecord`` ganhou um campo aditivo
  ``last_checkpoint`` (ver ``worker_ops.py``), separado de ``commit``.
  ``commit`` = último commit conhecido; ``last_checkpoint`` = último
  commit EXPLICITAMENTE considerado seguro para handoff. Os dois são
  atualizados de forma independente em ``aplicar_heartbeat``: um
  ``heartbeat.commit`` novo NUNCA vira ``last_checkpoint``
  automaticamente — só um ``heartbeat.last_checkpoint`` explícito
  atualiza ``last_checkpoint``. Ausência de qualquer um dos dois num
  heartbeat preserva o último valor conhecido no registro (nunca apaga
  por omissão); registros antigos sem ``last_checkpoint`` carregam
  ``None`` (nunca inferido do ``commit``).
- H4: com H1 resolvido, heartbeat de sessão humana (via comentário) e o
  futuro payload de ``api_runner`` passam pela MESMA validação —
  ``branch`` nunca ``main``/``master``, ``commit``/``last_checkpoint``
  precisam ser SHA explícito (7-40 hex), ``timestamp`` ISO8601,
  ``task_id`` conforme o status, ``progress_percent`` 0-100 — porque os
  dois caminhos constroem exatamente o mesmo
  ``runner_contract.RunnerHeartbeat``. ``parse_heartbeat_comment``
  continua fail-closed: qualquer violação dessas regras vira
  ``HeartbeatParseResult(ok=False, ...)``, nunca uma exceção não tratada.

**Correção do blocker H4 restante (mesma auditoria, HEAD 3097dfa):**
``parse_heartbeat_comment`` reconhecia a linha ``TIMESTAMP:`` no bloco
(a chave entrava em ``campos``), mas nunca a repassava para
``RunnerHeartbeat(...)`` — um ``TIMESTAMP`` inválido no comentário era
simplesmente IGNORADO (o campo ficava ``None`` por padrão), enquanto o
mesmo valor, vindo de ``heartbeat_de_payload`` (``api_runner``), já era
rejeitado pela validação ISO8601 do contrato canônico. Agora
``timestamp=campos.get("TIMESTAMP") or None`` é passado explicitamente —
os dois caminhos validam ``TIMESTAMP``/``timestamp`` de forma idêntica.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone

from .runner_contract import RunnerHeartbeat
from .worker_ops import OperationalWorkerRegistry, WorkerRecord

# Requisito #105 §3 (Fase B): sem heartbeat explícito, nunca presumir há
# quanto tempo é razoável esperar — este é só um DEFAULT que qualquer
# chamador pode sobrescrever (``avaliar_stale(..., limite=...)``); o
# próprio valor nunca decide status sozinho, só rotula "stale"/"não stale".
DEFAULT_STALE_THRESHOLD = timedelta(minutes=30)

__all__ = [
    "RunnerHeartbeat",
    "heartbeat_de_payload",
    "HeartbeatParseResult",
    "parse_heartbeat_comment",
    "LimiteSinal",
    "sinal_de_limite",
    "HeartbeatApplyResult",
    "aplicar_heartbeat",
    "StaleCheck",
    "avaliar_stale",
    "STATUS_COM_HEARTBEAT_ESPERADO",
    "workers_desatualizados",
    "DEFAULT_STALE_THRESHOLD",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def heartbeat_de_payload(payload: dict) -> RunnerHeartbeat:
    """Constrói um ``runner_contract.RunnerHeartbeat`` a partir de um dict
    — o formato que um futuro ``api_runner`` enviaria (JSON). Fail-closed:
    campo obrigatório ausente vira ``ValueError`` explícito (nunca
    ``KeyError`` cru vazando do dataclass, nunca um default inventado
    para ``worker_id``/``status``); qualquer outra violação do contrato
    canônico (H4) também levanta ``ValueError``, vindo do próprio
    ``__post_init__`` de ``RunnerHeartbeat``."""
    if "worker_id" not in payload:
        raise ValueError("payload de heartbeat sem 'worker_id'")
    if "status" not in payload:
        raise ValueError("payload de heartbeat sem 'status'")
    return RunnerHeartbeat(
        worker_id=str(payload["worker_id"]),
        status=str(payload["status"]),
        task_id=payload.get("task_id"),
        progress_percent=payload.get("progress_percent"),
        branch=payload.get("branch"),
        commit=payload.get("commit"),
        remaining_work_estimate=payload.get("remaining_work_estimate"),
        last_checkpoint=payload.get("last_checkpoint"),
        notes=payload.get("notes") or "",
        timestamp=payload.get("timestamp"),
    )


# ---------------------------------------------------------------------
# Comentário estruturado (Issue #105 §3: "Enquanto sessões humanas forem
# usadas, aceitar heartbeat via comentário estruturado").
# ---------------------------------------------------------------------

_MARCADOR_HEARTBEAT = re.compile(r"(?im)^[ \t]*HEARTBEAT[ \t]*$")
_LINHA_CAMPO = re.compile(r"(?m)^[ \t]*([A-Za-zÀ-ÿ_]+)[ \t]*:[ \t]*(.*?)[ \t]*$")


@dataclass(frozen=True)
class HeartbeatParseResult:
    ok: bool
    heartbeat: RunnerHeartbeat | None
    error: str | None

    def to_dict(self) -> dict:
        return {"ok": self.ok, "heartbeat": self.heartbeat.to_dict() if self.heartbeat else None, "error": self.error}


def parse_heartbeat_comment(texto: str) -> HeartbeatParseResult | None:
    """``None`` quando o texto não contém um bloco ``HEARTBEAT`` — nesse
    caso o comentário segue o caminho normal (Inbox #88 /
    `worker_commands.py`), não é um erro. Quando o marcador existe mas o
    bloco viola o contrato CANÔNICO (``runner_contract.RunnerHeartbeat`` —
    H4: mesma validação para heartbeat humano e ``api_runner``), devolve
    ``HeartbeatParseResult(ok=False, ...)`` com o motivo — fail-closed,
    nunca levanta exceção para quem só está tentando reconhecer o
    comentário.

    Formato esperado (chave: valor, uma por linha, uma linha ``HEARTBEAT``
    em qualquer lugar do comentário)::

        HEARTBEAT
        WORKER: Claude 3
        STATUS: NEAR_LIMIT
        TASK: infra-heartbeat-issue105b
        PROGRESS: 42
        BRANCH: infra/heartbeat-issue105b
        COMMIT: abc1234
        CHECKPOINT: abc1234
        REMAINING: bloco 3 de 5
        NOTES: parando por precaução
        TIMESTAMP: 2026-09-22T02:00:00+00:00
    """
    corpo = texto or ""
    if not _MARCADOR_HEARTBEAT.search(corpo):
        return None

    campos: dict[str, str] = {}
    for chave, valor in _LINHA_CAMPO.findall(corpo):
        chave_norm = chave.strip().upper()
        if chave_norm == "HEARTBEAT":
            continue
        campos[chave_norm] = valor.strip()

    worker_id = campos.get("WORKER")
    status = campos.get("STATUS")
    if not worker_id or not status:
        return HeartbeatParseResult(
            ok=False, heartbeat=None,
            error="bloco HEARTBEAT precisa declarar WORKER e STATUS",
        )

    progress_percent: int | None = None
    if campos.get("PROGRESS"):
        bruto = campos["PROGRESS"].rstrip("%").strip()
        try:
            progress_percent = int(bruto)
        except ValueError:
            return HeartbeatParseResult(
                ok=False, heartbeat=None,
                error=f"PROGRESS {campos['PROGRESS']!r} não é um número inteiro",
            )

    try:
        heartbeat = RunnerHeartbeat(
            worker_id=worker_id,
            status=status.upper(),
            task_id=campos.get("TASK") or None,
            progress_percent=progress_percent,
            branch=campos.get("BRANCH") or None,
            commit=campos.get("COMMIT") or None,
            remaining_work_estimate=campos.get("REMAINING") or None,
            last_checkpoint=campos.get("CHECKPOINT") or None,
            notes=campos.get("NOTES") or "",
            timestamp=campos.get("TIMESTAMP") or None,
        )
    except ValueError as exc:
        # H4: qualquer violação do contrato canônico (branch protegida,
        # commit/checkpoint que não é SHA explícito, task_id incompatível
        # com o status etc.) chega aqui como ValueError vindo do
        # __post_init__ de RunnerHeartbeat — nunca uma exceção não tratada.
        return HeartbeatParseResult(ok=False, heartbeat=None, error=str(exc))

    return HeartbeatParseResult(ok=True, heartbeat=heartbeat, error=None)


# ---------------------------------------------------------------------
# Sinal para o scheduler (Issue #105 §2/§5) — NUNCA decide handoff, só
# traduz o heartbeat cru no formato que scheduler.HandoffContext já
# entende. Ligar isto de fato a avaliar_handoff_de_tarefa é Fase E.
# ---------------------------------------------------------------------

@dataclass(frozen=True)
class LimiteSinal:
    worker_id: str
    worker_status: str  # "LIMIT" | "NEAR_LIMIT"
    progress_percent: int | None
    remaining_work_estimate: str | None
    # H3: o checkpoint SEGURO (SHA explícito), nunca um commit qualquer —
    # None aqui significa "nenhum checkpoint seguro conhecido ainda"; um
    # futuro consumidor (Fase E) só deve tratar isto como
    # ``checkpoint_seguro=True`` para ``scheduler.avaliar_handoff_de_tarefa``
    # quando este campo não for None.
    checkpoint_seguro: str | None = None

    def to_dict(self) -> dict:
        return {
            "worker_id": self.worker_id,
            "worker_status": self.worker_status,
            "progress_percent": self.progress_percent,
            "remaining_work_estimate": self.remaining_work_estimate,
            "checkpoint_seguro": self.checkpoint_seguro,
        }


def sinal_de_limite(heartbeat: RunnerHeartbeat, *, checkpoint_seguro: str | None = None) -> LimiteSinal | None:
    """``None`` quando o heartbeat não é LIMIT/NEAR_LIMIT — não há sinal
    de handoff nenhum para produzir.

    ``checkpoint_seguro``: quando informado (``aplicar_heartbeat`` passa o
    valor EFETIVO já mesclado com o registro — H3), vence; senão cai no
    próprio ``heartbeat.last_checkpoint`` (útil para quem chama esta
    função isoladamente, sem passar por ``aplicar_heartbeat``)."""
    if heartbeat.status not in ("LIMIT", "NEAR_LIMIT"):
        return None
    return LimiteSinal(
        worker_id=heartbeat.worker_id,
        worker_status=heartbeat.status,
        progress_percent=heartbeat.progress_percent,
        remaining_work_estimate=heartbeat.remaining_work_estimate,
        checkpoint_seguro=checkpoint_seguro if checkpoint_seguro is not None else heartbeat.last_checkpoint,
    )


def _formatar_progresso(heartbeat: RunnerHeartbeat) -> str | None:
    partes = []
    if heartbeat.progress_percent is not None:
        partes.append(f"{heartbeat.progress_percent}%")
    if heartbeat.remaining_work_estimate:
        partes.append(heartbeat.remaining_work_estimate)
    return " — ".join(partes) if partes else None


@dataclass(frozen=True)
class HeartbeatApplyResult:
    action: str  # "APPLIED" | "REJECTED"
    worker_id: str
    reason: str
    record: WorkerRecord | None = None
    # Requisito #105 Fase B, item 6: sinaliza a transição para AVAILABLE
    # nesta chamada — quem for religar a Fase F usa isto para saber que
    # DEVE reprocessar a fila (scheduler.reprocessar_retorno). Esta
    # função nunca chama isso sozinha.
    ficou_disponivel_agora: bool = False
    # Requisito #105 Fase B, item 5: sinal pronto para
    # scheduler.HandoffContext quando LIMIT/NEAR_LIMIT — nunca decide
    # handoff sozinho.
    sinal_limite: LimiteSinal | None = None
    avisos: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "worker_id": self.worker_id,
            "reason": self.reason,
            "record": self.record.to_dict() if self.record else None,
            "ficou_disponivel_agora": self.ficou_disponivel_agora,
            "sinal_limite": self.sinal_limite.to_dict() if self.sinal_limite else None,
            "avisos": list(self.avisos),
        }


def aplicar_heartbeat(registry: OperationalWorkerRegistry, heartbeat: RunnerHeartbeat) -> HeartbeatApplyResult:
    """Atualiza o Worker Registry operacional a partir de um
    ``runner_contract.RunnerHeartbeat`` já validado (H1) — uma única
    escrita (``upsert``), nunca duas chamadas separadas (não existe uma
    janela em que o registro reflete status novo com tarefa/commit
    antigos).

    Worker desconhecido é REJEITADO explicitamente (requisito #105 Fase
    B, item 7 — "worker desconhecido tratado explicitamente"): um
    heartbeat nunca autocadastra um worker nunca visto — cadastro
    continua sendo comando explícito de José via `worker_commands.py`
    (Issue #99). Isto é deliberadamente mais restritivo que
    `OperationalWorkerRegistry.set_status`, que autocria por ser um
    comando ADMINISTRATIVO já vindo de um ator confiável (José, na Issue
    #88) — um heartbeat pode vir, no futuro, de um `api_runner` não
    supervisionado linha a linha, então "worker_id desconhecido" é tratado
    como anomalia a rejeitar, não como registro implícito.

    H2: como ``RunnerHeartbeat`` já garante na própria construção que
    BUSY/NEAR_LIMIT/LIMIT têm ``task_id`` e AVAILABLE/OFFLINE não têm,
    ``current_task=heartbeat.task_id`` nunca apaga uma tarefa ativa por
    acidente — um heartbeat que tentasse isso simplesmente não existiria
    como objeto válido.

    H3: ``commit`` e ``last_checkpoint`` são mesclados de forma
    INDEPENDENTE com o que já está no registro — nenhum dos dois infere
    o outro, e a ausência de qualquer um deles num heartbeat preserva o
    último valor conhecido (nunca apaga por omissão)."""
    atual = registry.find_by_name_or_id(heartbeat.worker_id)
    if atual is None:
        return HeartbeatApplyResult(
            action="REJECTED",
            worker_id=heartbeat.worker_id,
            reason=(
                f"worker {heartbeat.worker_id!r} desconhecido — heartbeat só atualiza um worker já "
                "registrado; cadastro é ato explícito de José (comando natural na Issue #88, "
                "worker_commands.py), nunca inferido de um heartbeat."
            ),
        )

    estava_available = atual.status == "AVAILABLE"
    timestamp = heartbeat.timestamp or _now_iso()

    # H3: commit e last_checkpoint nunca se fundem — cada um preserva o
    # último valor conhecido quando o heartbeat não o repete, e um commit
    # novo NUNCA vira checkpoint seguro sozinho.
    commit_efetivo = heartbeat.commit if heartbeat.commit is not None else atual.commit
    checkpoint_efetivo = heartbeat.last_checkpoint if heartbeat.last_checkpoint is not None else atual.last_checkpoint
    branch_efetivo = heartbeat.branch if heartbeat.branch is not None else atual.branch
    progresso_efetivo = _formatar_progresso(heartbeat) or atual.progress

    novo = replace(
        atual,
        status=heartbeat.status,
        current_task=heartbeat.task_id,
        branch=branch_efetivo,
        commit=commit_efetivo,
        last_checkpoint=checkpoint_efetivo,
        progress=progresso_efetivo,
        last_heartbeat=timestamp,
    )
    registry.upsert(novo, message=f"heartbeat: {novo.worker_id} -> {novo.status}")

    avisos: list[str] = []
    if heartbeat.status == "LIMIT" and heartbeat.task_id and not checkpoint_efetivo:
        avisos.append(
            "LIMIT sem checkpoint SEGURO registrado (last_checkpoint) — mesmo havendo um commit "
            "conhecido, ele não vira automaticamente um checkpoint seguro para handoff; a tarefa não "
            "poderá ser retomada com confiança até alguém publicar um CHECKPOINT explícito "
            "(coordination/STATES.md: 'BLOCKED-LIMIT exige commit'; Issue #84 §6)."
        )

    return HeartbeatApplyResult(
        action="APPLIED",
        worker_id=novo.worker_id,
        reason=f"heartbeat aplicado: {novo.worker_id} -> {novo.status}",
        record=novo,
        ficou_disponivel_agora=(not estava_available and novo.status == "AVAILABLE"),
        sinal_limite=sinal_de_limite(heartbeat, checkpoint_seguro=checkpoint_efetivo),
        avisos=tuple(avisos),
    )


# ---------------------------------------------------------------------
# Stale detection — PURA. Recebe um WorkerRecord já lido, nunca o
# registro/store: não tem NENHUM caminho para escrever nada, mesmo que
# alguém tentasse. Requisito #105 Fase B, item 4: "não presumir
# automaticamente LIMIT/OFFLINE; apenas sinalizar stale; nunca inventar
# disponibilidade."
# ---------------------------------------------------------------------

@dataclass(frozen=True)
class StaleCheck:
    stale: bool
    reason: str
    last_heartbeat: str | None
    seconds_since: float | None

    def to_dict(self) -> dict:
        return {
            "stale": self.stale,
            "reason": self.reason,
            "last_heartbeat": self.last_heartbeat,
            "seconds_since": self.seconds_since,
        }


def avaliar_stale(
    worker: WorkerRecord, *, agora: datetime | None = None, limite: timedelta = DEFAULT_STALE_THRESHOLD
) -> StaleCheck:
    momento = agora or datetime.now(timezone.utc)

    if not worker.last_heartbeat:
        return StaleCheck(
            stale=True,
            reason=f"{worker.display_name} nunca reportou heartbeat — última atividade desconhecida.",
            last_heartbeat=None,
            seconds_since=None,
        )

    try:
        quando = datetime.fromisoformat(worker.last_heartbeat)
    except ValueError:
        return StaleCheck(
            stale=True,
            reason=f"last_heartbeat {worker.last_heartbeat!r} não é um timestamp ISO8601 válido.",
            last_heartbeat=worker.last_heartbeat,
            seconds_since=None,
        )

    if quando.tzinfo is None:
        quando = quando.replace(tzinfo=timezone.utc)

    delta_segundos = (momento - quando).total_seconds()

    if delta_segundos < 0:
        return StaleCheck(
            stale=True,
            reason=f"last_heartbeat de {worker.display_name} está no futuro — timestamp suspeito.",
            last_heartbeat=worker.last_heartbeat,
            seconds_since=delta_segundos,
        )

    if delta_segundos > limite.total_seconds():
        return StaleCheck(
            stale=True,
            reason=(
                f"{worker.display_name} sem heartbeat há {int(delta_segundos)}s "
                f"(limite: {int(limite.total_seconds())}s)."
            ),
            last_heartbeat=worker.last_heartbeat,
            seconds_since=delta_segundos,
        )

    return StaleCheck(
        stale=False,
        reason=f"{worker.display_name} reportou heartbeat há {int(delta_segundos)}s — dentro do limite.",
        last_heartbeat=worker.last_heartbeat,
        seconds_since=delta_segundos,
    )


# Só os status em que um heartbeat continuado é esperado. AVAILABLE/OFFLINE
# não têm task_id (runner_contract já garante isso na construção) e não
# "envelhecem" da mesma forma — um worker AVAILABLE há dias não é uma lease
# órfã, é só um worker ocioso. Auditores/humanos ficam fora deste filtro:
# ``never_merge``/``can_execute=False`` já os torna irrelevantes para
# reserva de tarefa.
STATUS_COM_HEARTBEAT_ESPERADO: frozenset[str] = frozenset({"BUSY", "NEAR_LIMIT", "LIMIT"})


def workers_desatualizados(
    workers: list[WorkerRecord], *, agora: datetime | None = None, limite: timedelta = DEFAULT_STALE_THRESHOLD,
) -> list[tuple[WorkerRecord, StaleCheck]]:
    """Aplica ``avaliar_stale`` a cada worker ATIVO (BUSY/NEAR_LIMIT/LIMIT)
    e devolve só os que estão ``stale`` — PURA, mesma garantia de
    ``avaliar_stale``: recebe a lista já lida, nunca o registro/store, e
    não tem nenhum caminho para escrever nada.

    Existe porque ``avaliar_stale`` (Issue #105 Fase B, item 4) foi
    implementada e testada para "sinalizar heartbeat velho; nunca mudar
    status sozinha", mas nenhum caminho de produção agregava esse sinal
    para MÚLTIPLOS workers de uma vez — o sinal existia por worker, mas
    nada listava quais precisavam de atenção humana. Isto não decide
    LIMIT/OFFLINE por conta própria (seria exatamente o "inventar
    disponibilidade" que a Fase B recusa); só reúne o sinal que já existia
    disperso, para um relatório read-only poder mostrá-lo.
    """
    momento = agora or datetime.now(timezone.utc)
    resultado: list[tuple[WorkerRecord, StaleCheck]] = []
    for worker in workers:
        if worker.status not in STATUS_COM_HEARTBEAT_ESPERADO:
            continue
        checagem = avaliar_stale(worker, agora=momento, limite=limite)
        if checagem.stale:
            resultado.append((worker, checagem))
    return resultado
