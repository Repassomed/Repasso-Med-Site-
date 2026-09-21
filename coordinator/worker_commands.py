"""Comandos em linguagem natural na Issue #88 para o Worker Registry
operacional (Issue #99: "José não deve editar JSON manualmente").

Determinístico por palavra-chave/regex — mesma filosofia de
``classify.py`` — porque isto é operação administrativa (Issue #90: FAST
faz "atualizar registro"), nunca precisa de uma chamada paga para
entender "Claude 2 entrou em limite". ``parse_worker_command`` só
RECONHECE a intenção; ``aplicar_comando`` é quem de fato escreve no
``OperationalWorkerRegistry`` (sempre via ``upsert``/``set_status``,
nunca tocando ``coordination/tasks.json`` nem matéria).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .worker_ops import OperationalWorkerRegistry, WorkerRecord

_NOME = r"(Claude\s*\d+|claude-\d+|chatgpt-auditor)"

RE_REGISTRAR = re.compile(rf"\bcadastr[ae]\b.{{0,10}}{_NOME}.{{0,15}}\bcomo\s+worker\s+de\s+([^.\n]+)", re.I)
RE_DESATIVAR = re.compile(rf"\bdesativ[ae]\b\s+{_NOME}", re.I)
RE_EM_LIMITE = re.compile(rf"{_NOME}.{{0,30}}\b(entrou em limite|em limite|no limite|bateu (o )?limite|atingiu o limite)\b", re.I)
RE_DISPONIVEL = re.compile(rf"{_NOME}.{{0,30}}\b(voltou|dispon[íi]vel)\b", re.I)


@dataclass(frozen=True)
class WorkerCommand:
    action: str  # "REGISTER" | "DEACTIVATE" | "SET_LIMIT" | "SET_AVAILABLE"
    worker_name: str
    capabilities: tuple[str, ...] = ()


def _capacidades(texto: str) -> tuple[str, ...]:
    partes = re.split(r",|\be\b", texto, flags=re.I)
    return tuple(p.strip().lower() for p in partes if p.strip())


def parse_worker_command(texto: str) -> WorkerCommand | None:
    """Devolve ``None`` quando o texto não é reconhecido como um comando
    de worker — nesse caso o chamador segue o caminho normal (Inbox de
    tarefa, ``classify.py``). Ordem importa: REGISTRAR/DESATIVAR são mais
    específicos e checados antes de LIMITE/DISPONÍVEL, para que
    'desative Claude 4' nunca seja lido como um comando de status."""
    corpo = texto or ""

    m = RE_REGISTRAR.search(corpo)
    if m:
        return WorkerCommand(action="REGISTER", worker_name=m.group(1).strip(), capabilities=_capacidades(m.group(2)))

    m = RE_DESATIVAR.search(corpo)
    if m:
        return WorkerCommand(action="DEACTIVATE", worker_name=m.group(1).strip())

    m = RE_EM_LIMITE.search(corpo)
    if m:
        return WorkerCommand(action="SET_LIMIT", worker_name=m.group(1).strip())

    m = RE_DISPONIVEL.search(corpo)
    if m:
        return WorkerCommand(action="SET_AVAILABLE", worker_name=m.group(1).strip())

    return None


def aplicar_comando(registry: OperationalWorkerRegistry, comando: WorkerCommand) -> str:
    """Aplica o comando no registro operacional e devolve uma frase curta
    de confirmação (o que vira o corpo do comentário de resposta na #88).
    Nunca lança por worker desconhecido em SET_LIMIT/SET_AVAILABLE/
    DEACTIVATE — cria o registro na hora, com o status pedido, para que um
    comando válido nunca fique sem efeito só porque ninguém cadastrou o
    worker antes."""
    nome = comando.worker_name.strip()

    if comando.action == "REGISTER":
        registro = WorkerRecord(
            worker_id="-".join(nome.lower().split()), display_name=nome, type="human_session",
            status="AVAILABLE", capabilities=comando.capabilities, can_execute=True, can_audit=False,
        )
        registry.upsert(registro, message=f"worker: cadastra {nome}")
        caps = ", ".join(comando.capabilities) or "nenhuma capacidade declarada"
        return f"{nome} cadastrado como worker ({caps})."

    if comando.action == "DEACTIVATE":
        registry.set_status(nome, "OFFLINE", message=f"worker: desativa {nome}")
        return f"{nome} desativado (OFFLINE)."

    if comando.action == "SET_LIMIT":
        registry.set_status(nome, "LIMIT", message=f"worker: {nome} -> LIMIT")
        return f"{nome} marcado como LIMIT."

    if comando.action == "SET_AVAILABLE":
        registry.set_status(nome, "AVAILABLE", message=f"worker: {nome} -> AVAILABLE")
        return f"{nome} marcado como AVAILABLE."

    raise ValueError(f"ação de comando desconhecida: {comando.action!r}")
