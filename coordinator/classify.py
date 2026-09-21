"""Classificação determinística de tipo (Issue #85) e prioridade (Issue #84).

Isto roda ANTES de qualquer chamada à Anthropic e não depende dela — é
trabalho de nível FAST por natureza (Issue #90: "classificar A/B/C/D;
prioridade P0–P4" está explicitamente na lista do que FAST faz). A
interpretação mais profunda de diff/audit-pack, quando necessária, é um
passo posterior (ver ``routing.py``).

Não decide sozinho matéria nova (tipo C): só reconhece a intenção e marca
``requires_jose_authorization`` — a Issue #85 é explícita: tipo C nunca
inicia sozinho.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum

from .events import Event, EventType


class TaskType(str, Enum):
    A = "A"  # conteúdo + questões
    B = "B"  # manutenção / caça a erros
    C = "C"  # matéria nova
    D = "D"  # melhoria de produto / função nova
    UNKNOWN = "UNKNOWN"


class Priority(str, Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


_AREA_TO_TYPE = {
    "materia": TaskType.A,
    "ferramentas": TaskType.D,
    "infraestrutura": TaskType.D,
    "assets": TaskType.B,
    "documentacao": TaskType.B,
}

_KEYWORDS_MATERIA_NOVA = re.compile(r"\b(mat[ée]ria nova|nova mat[ée]ria)\b", re.I)
_KEYWORDS_CONTEUDO = re.compile(r"\b(quest(ã|a)o|quest(õ|o)es|prova|gabarito|banco general)\b", re.I)
_KEYWORDS_ERRO_GRAVE = re.compile(
    r"\b(gabarito errado|quebrad[oa]|n(ã|a)o funciona|regress(ã|a)o|perdeu|sumiu|apagou)\b", re.I
)
_KEYWORDS_ERRO_LEVE = re.compile(r"\b(erro|confus[oa]|duplicad[oa]|inconsist[êe]ncia)\b", re.I)
_KEYWORDS_PRODUTO = re.compile(r"\b(layout|caneta|marca-texto|ferramenta nova|fun[çc][ãa]o nova)\b", re.I)


@dataclass(frozen=True)
class Classification:
    task_type: TaskType
    priority: Priority
    requires_jose_authorization: bool
    needs_input: bool
    rationale: str

    def to_dict(self) -> dict:
        return {
            "task_type": self.task_type.value,
            "priority": self.priority.value,
            "requires_jose_authorization": self.requires_jose_authorization,
            "needs_input": self.needs_input,
            "rationale": self.rationale,
        }


def _prioridade_declarada(payload: dict) -> Priority | None:
    """Se José declarou prioridade explicitamente, ela vence (Lei #84 §1)."""
    valor = payload.get("prioridade_declarada")
    if not valor:
        return None
    valor = str(valor).upper().strip()
    for p in Priority:
        if p.value == valor:
            return p
    return None


def classify(event: Event) -> Classification:
    if not event.is_allowed:
        return Classification(
            task_type=TaskType.UNKNOWN,
            priority=Priority.P4,
            requires_jose_authorization=False,
            needs_input=True,
            rationale="Tipo de evento não permitido; classificação não se aplica.",
        )

    declarada = _prioridade_declarada(event.payload)

    if event.event_type is EventType.GUARD_STATE_CHANGE:
        estado = event.payload.get("guard_state")  # "success" | "failure"
        if estado == "failure":
            return Classification(
                task_type=TaskType.B,
                priority=declarada or Priority.P0,
                requires_jose_authorization=False,
                needs_input=False,
                rationale="Guard virou vermelho: regressão/erro objetivo detectado (P0 por #84 §1).",
            )
        return Classification(
            task_type=TaskType.B,
            priority=declarada or Priority.P3,
            requires_jose_authorization=False,
            needs_input=False,
            rationale="Guard virou verde: informativo, sem ação corretiva pendente.",
        )

    if event.event_type is EventType.CHECKPOINT_BLOCKED_LIMIT:
        return Classification(
            task_type=TaskType.B,
            priority=declarada or Priority.P1,
            requires_jose_authorization=False,
            needs_input=False,
            rationale=(
                "Checkpoint BLOCKED-LIMIT é evento operacional de handoff (#82/#84 §6), "
                "não correção de conteúdo — próxima ação é redistribuição, não edição."
            ),
        )

    if event.event_type is EventType.PR_NEEDS_AUDIT:
        area = event.payload.get("area")
        tipo = _AREA_TO_TYPE.get(area, TaskType.UNKNOWN)
        if tipo is TaskType.UNKNOWN:
            return Classification(
                task_type=TaskType.UNKNOWN,
                priority=declarada or Priority.P2,
                requires_jose_authorization=False,
                needs_input=True,
                rationale=f"Área {area!r} não declarada ou desconhecida — NEEDS-INPUT (Task Router #85).",
            )
        prioridade_padrao = {
            TaskType.A: Priority.P1,
            TaskType.B: Priority.P2,
            TaskType.D: Priority.P3,
        }.get(tipo, Priority.P2)
        return Classification(
            task_type=tipo,
            priority=declarada or prioridade_padrao,
            requires_jose_authorization=False,
            needs_input=False,
            rationale=f"PR em NEEDS-AUDIT, área={area!r} -> tipo {tipo.value} (Issue #85).",
        )

    if event.event_type is EventType.INBOX_COMMENT:
        corpo = str(event.payload.get("body", ""))
        if _KEYWORDS_MATERIA_NOVA.search(corpo):
            return Classification(
                task_type=TaskType.C,
                priority=declarada or Priority.P4,
                requires_jose_authorization=True,
                needs_input=False,
                rationale=(
                    "Pedido de matéria nova detectado na Inbox — tipo C nunca inicia "
                    "sozinho (Issue #85); aguarda 'pode começar' explícito de José."
                ),
            )
        if _KEYWORDS_ERRO_GRAVE.search(corpo):
            return Classification(
                task_type=TaskType.B,
                priority=declarada or Priority.P0,
                requires_jose_authorization=False,
                needs_input=False,
                rationale="Erro grave relatado na Inbox (#84 §1 P0).",
            )
        if _KEYWORDS_CONTEUDO.search(corpo):
            return Classification(
                task_type=TaskType.A,
                priority=declarada or Priority.P1,
                requires_jose_authorization=False,
                needs_input=False,
                rationale="Conteúdo/questões relatado na Inbox (#84 §1 P1).",
            )
        if _KEYWORDS_PRODUTO.search(corpo):
            return Classification(
                task_type=TaskType.D,
                priority=declarada or Priority.P3,
                requires_jose_authorization=False,
                needs_input=False,
                rationale="Melhoria de produto/função nova relatada na Inbox (#84 §1 P3).",
            )
        if _KEYWORDS_ERRO_LEVE.search(corpo):
            return Classification(
                task_type=TaskType.B,
                priority=declarada or Priority.P2,
                requires_jose_authorization=False,
                needs_input=False,
                rationale="Manutenção/qualidade didática relatada na Inbox (#84 §1 P2).",
            )
        return Classification(
            task_type=TaskType.UNKNOWN,
            priority=declarada or Priority.P2,
            requires_jose_authorization=False,
            needs_input=True,
            rationale=(
                "Não foi possível classificar o pedido por palavra-chave — "
                "NEEDS-INPUT (Task Router #85, 'se resposta essencial indefinida, "
                "não começar'). Uma auditoria STANDARD poderia interpretar melhor "
                "o texto livre; nesta V2/OBSERVE isso fica preparado, não executado."
            ),
        )

    return Classification(
        task_type=TaskType.UNKNOWN,
        priority=Priority.P2,
        requires_jose_authorization=False,
        needs_input=True,
        rationale="Combinação de evento não coberta pelas regras desta V2.",
    )
