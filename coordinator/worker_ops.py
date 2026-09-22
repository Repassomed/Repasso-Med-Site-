"""Worker Registry OPERACIONAL (Issue #99, achado B3 da auditoria
independente do PR #104, rodada 2).

Isto NÃO substitui ``coordinator/worker_registry.py`` — aquele módulo
continua derivando um retrato de disponibilidade a partir do histórico
declarativo em ``coordination/tasks.json`` (fonte auditável na ``main``),
usado só para sugerir um worker em ``next_action``. Este módulo é a
CAMADA OPERACIONAL separada que a #99 pede explicitamente: "estado
efêmero/operacional em branch dedicada coordinator-state-*... nenhuma
escrita silenciosa em matéria" — persistida como mais um ``GitJsonStore``
(mesma peça de ``git_state.py`` já usada para dedup/usage), nunca em
``coordination/tasks.json``/``main``.

Cada ``WorkerRecord`` é o contrato mínimo pedido: ``worker_id`` estável,
``display_name``, ``type`` (human_session | api_runner | auditor),
``status`` (AVAILABLE | BUSY | NEAR_LIMIT | LIMIT | OFFLINE),
``capabilities``, tarefa/branch/commit/progresso atuais, último
heartbeat, e ``can_execute``/``can_audit``. ``never_merge`` é
deliberadamente uma PROPRIEDADE, nunca um campo gravável — a mesma prova
estrutural que o resto do pacote já usa (ver
``test_no_forbidden_writes.py``): nenhum dado vindo de fora (comando de
José, JSON persistido, o que for) consegue fazer um worker "poder
mergear", porque o valor nunca é lido de lugar nenhum, é sempre ``True``.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Callable, Protocol

VALID_TYPES: frozenset[str] = frozenset({"human_session", "api_runner", "auditor"})
VALID_STATUSES: frozenset[str] = frozenset({"AVAILABLE", "BUSY", "NEAR_LIMIT", "LIMIT", "OFFLINE"})

DEFAULT_STATE_BRANCH = "coordinator-state-workers"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class WorkerRecord:
    worker_id: str
    display_name: str
    type: str
    status: str
    capabilities: tuple[str, ...] = ()
    current_task: str | None = None
    branch: str | None = None
    commit: str | None = None
    # Campo ADITIVO (Issue #105 Fase 1; achado H3 da auditoria independente
    # do PR #110): separado de ``commit`` de propósito. ``commit`` é só o
    # último commit CONHECIDO (pode ser trabalho em andamento, nunca
    # revisado); ``last_checkpoint`` é o último commit EXPLICITAMENTE
    # considerado seguro para handoff/retomada (Issue #84 §6: "todo
    # handoff deve partir de commit/checkpoint conhecido"). Um `commit`
    # novo nunca vira `last_checkpoint` sozinho — só quem aplica um
    # heartbeat/checkpoint explícito (`coordinator/heartbeat.py`) decide
    # isso. Registros antigos sem este campo carregam ``None`` via
    # ``from_dict`` (nunca inferido do `commit` já existente ali).
    last_checkpoint: str | None = None
    progress: str | None = None
    last_heartbeat: str | None = None
    can_execute: bool = True
    can_audit: bool = False

    def __post_init__(self) -> None:
        if self.type not in VALID_TYPES:
            raise ValueError(f"type {self.type!r} inválido — precisa ser um de {sorted(VALID_TYPES)}")
        if self.status not in VALID_STATUSES:
            raise ValueError(f"status {self.status!r} inválido — precisa ser um de {sorted(VALID_STATUSES)}")

    @property
    def never_merge(self) -> bool:
        """Invariante estrutural, nunca um campo gravável: nenhum worker —
        humano, api_runner ou auditor — pode mergear. Sempre ``True``,
        sempre calculado, nunca lido de um comando/JSON externo."""
        return True

    @property
    def can_publish(self) -> bool:
        """Mesma prova estrutural de ``never_merge`` — Issue #106 pede
        explicitamente ``can_publish=false`` para ``chatgpt-auditor`` (e,
        pela mesma lógica, para qualquer worker): sempre ``False``, sempre
        calculado, nunca lido de comando/JSON externo. Nenhum worker
        publica/deploya — só José, fora deste pacote."""
        return False

    def to_dict(self) -> dict:
        return {
            "worker_id": self.worker_id,
            "display_name": self.display_name,
            "type": self.type,
            "status": self.status,
            "capabilities": list(self.capabilities),
            "current_task": self.current_task,
            "branch": self.branch,
            "commit": self.commit,
            "last_checkpoint": self.last_checkpoint,
            "progress": self.progress,
            "last_heartbeat": self.last_heartbeat,
            "can_execute": self.can_execute,
            "can_audit": self.can_audit,
            "never_merge": True,  # sempre True no JSON também — nunca lido de volta como campo.
            "can_publish": False,  # idem — sempre False no JSON também, nunca lido de volta.
        }

    @classmethod
    def from_dict(cls, d: dict) -> "WorkerRecord":
        return cls(
            worker_id=d["worker_id"],
            display_name=d.get("display_name", d["worker_id"]),
            type=d.get("type", "human_session"),
            status=d.get("status", "OFFLINE"),
            capabilities=tuple(d.get("capabilities", [])),
            current_task=d.get("current_task"),
            branch=d.get("branch"),
            commit=d.get("commit"),
            # H3: ausente em registros antigos -> None, NUNCA inferido de
            # `commit` — compatibilidade retroativa explícita.
            last_checkpoint=d.get("last_checkpoint"),
            progress=d.get("progress"),
            last_heartbeat=d.get("last_heartbeat"),
            can_execute=bool(d.get("can_execute", True)),
            can_audit=bool(d.get("can_audit", False)),
        )


def _slugify(nome: str) -> str:
    return "-".join(nome.strip().lower().split())


def default_seed_workers() -> list[WorkerRecord]:
    """Ponto de partida quando a branch de estado ainda não tem nenhum
    registro operacional.

    Correção B1 da auditoria independente do PR #104, rodada 3: a versão
    anterior criava Claude 1-4 já como ``AVAILABLE`` — isso INVENTAVA
    disponibilidade de sessão humana sem nenhum sinal real (nenhum
    heartbeat, nenhum comando explícito de José). Um worker só pode ser
    ``AVAILABLE`` quando alguém de fato disse isso (comando natural na
    #88, ex.: "Claude 1 disponível") — nunca por suposição do seed.

    Os 4 Claudes humanos conhecidos do projeto
    (``coordination/tasks.json::agentes_conhecidos``) nascem ``OFFLINE``
    — inclusive Claude 4, que era só um EXEMPLO de comando de cadastro na
    Issue #99, não uma instrução para pré-cadastrá-lo como disponível.
    ``chatgpt-auditor`` (Issue #106) continua ``OFFLINE``/``can_execute
    =False`` até a integração real existir — sem mudança aqui."""
    humanos = [
        WorkerRecord(
            worker_id=f"claude-{n}", display_name=f"Claude {n}", type="human_session",
            status="OFFLINE", capabilities=("conteudo", "codigo"), can_execute=True, can_audit=False,
        )
        for n in (1, 2, 3, 4)
    ]
    auditor_externo = WorkerRecord(
        worker_id="chatgpt-auditor", display_name="ChatGPT Auditor", type="auditor",
        status="OFFLINE", capabilities=("auditoria",), can_execute=False, can_audit=True,
    )
    return humanos + [auditor_externo]


class WorkerStateStore(Protocol):
    """Mesmo protocolo mínimo de ``git_state.GitJsonStore``
    (``read``/``update``) — ``GitJsonStore`` já implementa isto de
    verdade; ``LocalJsonWorkerStateStore`` abaixo é o equivalente para
    execução local/teste, do mesmo jeito que ``dedup.FileStore`` existe
    ao lado de ``git_state.GitDedupStore``."""

    def read(self) -> dict: ...

    def update(self, mutate: Callable[[dict], dict], *, message: str) -> dict: ...


class LocalJsonWorkerStateStore:
    """Backend em arquivo local — só para uso manual/teste (não sobrevive
    entre runners efêmeros do GitHub Actions; no workflow real, use
    ``git_state.GitJsonStore`` com ``branch=DEFAULT_STATE_BRANCH``, mesmo
    padrão de dedup/usage)."""

    def __init__(self, path: str | None) -> None:
        self.path = path

    def read(self) -> dict:
        if not self.path or not os.path.exists(self.path):
            return {}
        try:
            with open(self.path, encoding="utf-8") as fh:
                return json.load(fh)
        except (json.JSONDecodeError, OSError):
            return {}

    def update(self, mutate: Callable[[dict], dict], *, message: str = "") -> dict:
        novo = mutate(self.read())
        if self.path:
            os.makedirs(os.path.dirname(os.path.abspath(self.path)) or ".", exist_ok=True)
            with open(self.path, "w", encoding="utf-8") as fh:
                json.dump(novo, fh, indent=2, sort_keys=True)
        return novo


class InMemoryWorkerStateStore:
    """Backend em memória, para teste — mesma superfície de
    ``WorkerStateStore``, sem tocar disco nem git."""

    def __init__(self, initial: dict | None = None) -> None:
        self._dados: dict = json.loads(json.dumps(initial)) if initial else {}

    def read(self) -> dict:
        return json.loads(json.dumps(self._dados))

    def update(self, mutate: Callable[[dict], dict], *, message: str = "") -> dict:
        self._dados = mutate(self.read())
        return json.loads(json.dumps(self._dados))


class OperationalWorkerRegistry:
    """Fachada de alto nível sobre um ``WorkerStateStore`` — lista,
    busca por nome/id, e faz upsert de um ``WorkerRecord`` de cada vez.
    Nunca lê nem escreve ``coordination/tasks.json``."""

    def __init__(self, store: WorkerStateStore) -> None:
        self.store = store

    def list_workers(self) -> list[WorkerRecord]:
        dados = self.store.read()
        brutos = dados.get("workers")
        if not brutos:
            return default_seed_workers()
        return [WorkerRecord.from_dict(r) for r in brutos]

    def find_by_name_or_id(self, nome_ou_id: str) -> WorkerRecord | None:
        alvo_id = _slugify(nome_ou_id)
        alvo_nome = nome_ou_id.strip().lower()
        for w in self.list_workers():
            if w.worker_id == alvo_id or w.display_name.strip().lower() == alvo_nome:
                return w
        return None

    def escolher_disponivel(self, *, capability_hint: str | None = None) -> WorkerRecord | None:
        """Correção B2 da auditoria independente do PR #104, rodada 3: a
        ÚNICA fonte de "quem está disponível agora" — nunca
        ``coordination/tasks.json`` (histórico/declarativo, pode estar
        desatualizado ao vivo). Só considera ``status == "AVAILABLE"`` e
        ``can_execute`` — ``LIMIT``/``BUSY``/``NEAR_LIMIT``/``OFFLINE``
        nunca são devolvidos aqui, mesmo que sejam o único worker
        conhecido. Prioriza quem tem a capacidade pedida, mas não exige
        (nem toda tarefa tem um ``capability_hint`` óbvio)."""
        disponiveis = [w for w in self.list_workers() if w.status == "AVAILABLE" and w.can_execute]
        if not disponiveis:
            return None
        if capability_hint:
            com_capacidade = [w for w in disponiveis if capability_hint in w.capabilities]
            if com_capacidade:
                return com_capacidade[0]
        return disponiveis[0]

    def upsert(self, record: WorkerRecord, *, message: str) -> WorkerRecord:
        def mutate(dados: dict) -> dict:
            existentes = dados.get("workers")
            base = {w["worker_id"]: w for w in existentes} if existentes else {
                w.worker_id: w.to_dict() for w in default_seed_workers()
            }
            base[record.worker_id] = record.to_dict()
            return {"workers": list(base.values())}

        self.store.update(mutate, message=message)
        return record

    def upsert_many(self, records: list[WorkerRecord], *, message: str) -> list[WorkerRecord]:
        """Como ``upsert()``, mas grava vários registros em UMA única
        escrita/commit — Issue #105 Fase E (``coordinator/handoff_exec.py``):
        handoff precisa atualizar o worker anterior e o novo worker sem
        nenhuma janela em que os dois aparecem como dono ativo da mesma
        tarefa, nem uma janela em que só um dos dois lados foi persistido."""
        def mutate(dados: dict) -> dict:
            existentes = dados.get("workers")
            base = {w["worker_id"]: w for w in existentes} if existentes else {
                w.worker_id: w.to_dict() for w in default_seed_workers()
            }
            for record in records:
                base[record.worker_id] = record.to_dict()
            return {"workers": list(base.values())}

        self.store.update(mutate, message=message)
        return records

    def set_status(self, nome_ou_id: str, novo_status: str, *, message: str,
                    heartbeat: str | None = None, default_type: str = "human_session") -> WorkerRecord:
        if novo_status not in VALID_STATUSES:
            raise ValueError(f"status {novo_status!r} inválido")
        atual = self.find_by_name_or_id(nome_ou_id)
        if atual is None:
            atual = WorkerRecord(
                worker_id=_slugify(nome_ou_id), display_name=nome_ou_id.strip(),
                type=default_type, status=novo_status, last_heartbeat=heartbeat or _now_iso(),
            )
        else:
            atual = replace(atual, status=novo_status, last_heartbeat=heartbeat or _now_iso())
        return self.upsert(atual, message=message)

    def set_task_progress(self, worker_id: str, *, current_task: str | None, branch: str | None,
                           commit: str | None, progress: str | None, message: str) -> WorkerRecord | None:
        atual = self.find_by_name_or_id(worker_id)
        if atual is None:
            return None
        novo = replace(atual, current_task=current_task, branch=branch, commit=commit,
                        progress=progress, last_heartbeat=_now_iso())
        return self.upsert(novo, message=message)
