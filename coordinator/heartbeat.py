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

1. ``RunnerHeartbeat`` — o contrato de dados (Issue #105 §3), com
   validação fail-closed no ``__post_init__``: um payload inválido nunca
   produz um ``RunnerHeartbeat`` "quase certo", ele simplesmente não
   existe (``ValueError``). O MESMO contrato serve para heartbeat de
   sessão humana (comentário estruturado, ``parse_heartbeat_comment``) e
   para o futuro ``api_runner`` (payload dict, ``heartbeat_de_payload``)
   — nada aqui depende de `type` do worker.
2. ``aplicar_heartbeat`` — atualiza o ``OperationalWorkerRegistry``
   (status, tarefa, branch, commit, progresso, ``last_heartbeat``) numa
   única escrita (``upsert``), nunca duas chamadas separadas que
   deixariam uma janela de estado parcial. Worker desconhecido é
   REJEITADO explicitamente (nunca autocadastrado por um heartbeat —
   cadastro continua sendo ato humano explícito via `worker_commands.py`,
   #99).
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

**Limitação conhecida, não escondida:** a Issue #105 Fase 1 pede
``last_checkpoint`` como campo PRÓPRIO do Worker Registry, mas
`worker_ops.WorkerRecord` (já implementado, fora do escopo desta rodada)
só tem `commit`. `RunnerHeartbeat` preserva os dois campos separados
(fidelidade ao contrato pedido), e `aplicar_heartbeat` funde os dois no
único campo `commit` do registro (preferindo `commit`, com
`last_checkpoint` como fallback) — sem expandir o schema de
`worker_ops.py` nesta rodada.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone

from .worker_ops import VALID_STATUSES, OperationalWorkerRegistry, WorkerRecord

# Requisito #105 §3 (Fase B): sem heartbeat explícito, nunca presumir há
# quanto tempo é razoável esperar — este é só um DEFAULT que qualquer
# chamador pode sobrescrever (``avaliar_stale(..., limite=...)``); o
# próprio valor nunca decide status sozinho, só rotula "stale"/"não stale".
DEFAULT_STALE_THRESHOLD = timedelta(minutes=30)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class RunnerHeartbeat:
    """Contrato de heartbeat (Issue #105 §3) — mesmo formato para
    ``human_session`` (via comentário estruturado) e o futuro
    ``api_runner`` (via payload). Fail-closed: qualquer campo obrigatório
    ausente ou fora do domínio válido levanta ``ValueError`` no
    ``__post_init__`` — nunca aceita silenciosamente um heartbeat
    malformado."""

    worker_id: str
    status: str  # AVAILABLE | BUSY | NEAR_LIMIT | LIMIT | OFFLINE
    task_id: str | None = None
    progress_percent: int | None = None  # 0-100
    branch: str | None = None
    commit: str | None = None
    remaining_work_estimate: str | None = None  # texto curto e qualitativo — nunca inventar precisão
    last_checkpoint: str | None = None
    notes: str = ""
    # ISO8601; ``None`` = quem aplica o heartbeat carimba o momento em que
    # recebeu (``aplicar_heartbeat`` usa ``_now_iso()``). Informar
    # explicitamente é o que torna reaplicar o MESMO heartbeat idempotente.
    timestamp: str | None = None

    def __post_init__(self) -> None:
        if not self.worker_id or not self.worker_id.strip():
            raise ValueError("worker_id não pode ser vazio")
        if self.status not in VALID_STATUSES:
            raise ValueError(f"status {self.status!r} inválido — precisa ser um de {sorted(VALID_STATUSES)}")
        if self.progress_percent is not None and not (0 <= self.progress_percent <= 100):
            raise ValueError(f"progress_percent {self.progress_percent!r} precisa estar entre 0 e 100")
        if self.timestamp is not None:
            try:
                datetime.fromisoformat(self.timestamp)
            except ValueError as exc:
                raise ValueError(f"timestamp {self.timestamp!r} não é um ISO8601 válido") from exc

    def to_dict(self) -> dict:
        return {
            "worker_id": self.worker_id,
            "status": self.status,
            "task_id": self.task_id,
            "progress_percent": self.progress_percent,
            "branch": self.branch,
            "commit": self.commit,
            "remaining_work_estimate": self.remaining_work_estimate,
            "last_checkpoint": self.last_checkpoint,
            "notes": self.notes,
            "timestamp": self.timestamp,
        }


def heartbeat_de_payload(payload: dict) -> RunnerHeartbeat:
    """Constrói um ``RunnerHeartbeat`` a partir de um dict — o formato que
    um futuro ``api_runner`` enviaria (JSON). Fail-closed: campo
    obrigatório ausente vira ``ValueError`` explícito (nunca ``KeyError``
    cru vazando do dataclass, nunca um default inventado para
    ``worker_id``/``status``)."""
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
    bloco é inválido, devolve ``HeartbeatParseResult(ok=False, ...)`` com
    o motivo — fail-closed, nunca levanta exceção para quem só está
    tentando reconhecer o comentário.

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
        )
    except ValueError as exc:
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

    def to_dict(self) -> dict:
        return {
            "worker_id": self.worker_id,
            "worker_status": self.worker_status,
            "progress_percent": self.progress_percent,
            "remaining_work_estimate": self.remaining_work_estimate,
        }


def sinal_de_limite(heartbeat: RunnerHeartbeat) -> LimiteSinal | None:
    """``None`` quando o heartbeat não é LIMIT/NEAR_LIMIT — não há sinal
    de handoff nenhum para produzir."""
    if heartbeat.status not in ("LIMIT", "NEAR_LIMIT"):
        return None
    return LimiteSinal(
        worker_id=heartbeat.worker_id,
        worker_status=heartbeat.status,
        progress_percent=heartbeat.progress_percent,
        remaining_work_estimate=heartbeat.remaining_work_estimate,
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
    ``RunnerHeartbeat`` já validado — uma única escrita (``upsert``),
    nunca duas chamadas separadas (não existe uma janela em que o
    registro reflete status novo com tarefa/commit antigos).

    Worker desconhecido é REJEITADO explicitamente (requisito #105 Fase
    B, item 7 — "worker desconhecido tratado explicitamente"): um
    heartbeat nunca autocadastra um worker nunca visto — cadastro
    continua sendo comando explícito de José via `worker_commands.py`
    (Issue #99). Isto é deliberadamente mais restritivo que
    `OperationalWorkerRegistry.set_status`, que autocria por ser um
    comando ADMINISTRATIVO já vindo de um ator confiável (José, na Issue
    #88) — um heartbeat pode vir, no futuro, de um `api_runner` não
    supervisionado linha a linha, então "worker_id desconhecido" é tratado
    como anomalia a rejeitar, não como registro implícito."""
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
    # commit/branch/progresso: um heartbeat leve (ex.: só "ainda BUSY,
    # sem novidade") pode não repetir esses campos — ausência AQUI nunca
    # apaga o último valor conhecido, só current_task é substituído
    # diretamente (None significa "não está em nenhuma tarefa agora",
    # informação real, não ausência de dado). Preferimos sempre o valor
    # mais novo do heartbeat quando ele vem preenchido; commit também
    # aceita last_checkpoint como fallback antes de cair no valor antigo
    # (ver docstring do módulo — WorkerRecord só tem `commit`, não um
    # campo `last_checkpoint` separado).
    commit_efetivo = heartbeat.commit or heartbeat.last_checkpoint or atual.commit
    branch_efetivo = heartbeat.branch or atual.branch
    progresso_efetivo = _formatar_progresso(heartbeat) or atual.progress

    novo = replace(
        atual,
        status=heartbeat.status,
        current_task=heartbeat.task_id,
        branch=branch_efetivo,
        commit=commit_efetivo,
        progress=progresso_efetivo,
        last_heartbeat=timestamp,
    )
    registry.upsert(novo, message=f"heartbeat: {novo.worker_id} -> {novo.status}")

    avisos: list[str] = []
    if heartbeat.status == "LIMIT" and heartbeat.task_id and not commit_efetivo:
        avisos.append(
            "LIMIT sem commit/checkpoint registrado — a tarefa não poderá ser retomada com "
            "segurança até publicar um checkpoint (coordination/STATES.md: "
            "'BLOCKED-LIMIT exige commit')."
        )

    return HeartbeatApplyResult(
        action="APPLIED",
        worker_id=novo.worker_id,
        reason=f"heartbeat aplicado: {novo.worker_id} -> {novo.status}",
        record=novo,
        ficou_disponivel_agora=(not estava_available and novo.status == "AVAILABLE"),
        sinal_limite=sinal_de_limite(heartbeat),
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
