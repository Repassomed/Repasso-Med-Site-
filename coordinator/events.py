"""Modelo de evento e a lista de eventos permitidos (Issue #95, "PRIMEIRO ALVO").

A #95 é explícita sobre o primeiro piloto: **só reagir a eventos restritos**.
Não é uma sugestão — é um portão. Um evento fora desta lista é rejeitado
antes de qualquer classificação ou chamada.

    1. PR/checkpoint em NEEDS-AUDIT;
    2. checkpoint BLOCKED-LIMIT;
    3. comentário novo na Issue #88 (Inbox do José);
    4. Guard muda de estado (sucesso <-> falha).

Nada de auditoria semanal/global automática nesta rodada (isso é dito
explicitamente como fora de escopo na #95).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from enum import Enum


class EventType(str, Enum):
    PR_NEEDS_AUDIT = "PR_NEEDS_AUDIT"
    CHECKPOINT_BLOCKED_LIMIT = "CHECKPOINT_BLOCKED_LIMIT"
    INBOX_COMMENT = "INBOX_COMMENT"
    GUARD_STATE_CHANGE = "GUARD_STATE_CHANGE"


ALLOWED_EVENT_TYPES: frozenset[EventType] = frozenset(
    {
        EventType.PR_NEEDS_AUDIT,
        EventType.CHECKPOINT_BLOCKED_LIMIT,
        EventType.INBOX_COMMENT,
        EventType.GUARD_STATE_CHANGE,
    }
)

# Issue #88 é a Inbox do José por número fixo — não é config, é a Issue
# oficial descrita na política. Mudar isso é decisão de José, não deploy.
INBOX_ISSUE_NUMBER = 88


@dataclass(frozen=True)
class Event:
    """Um evento cru, como chega do GitHub (ou de um fixture de teste).

    ``raw_type`` é a string que a fonte declarou — pode não bater com
    nenhum ``EventType`` conhecido, e por isso é string livre, não o enum:
    a rejeição de tipo não-permitido é uma decisão do pipeline
    (``is_allowed``), não uma falha de parsing.
    """

    raw_type: str
    source: str  # "github" | "fixture" | ...
    repo: str
    identity: str  # ex.: "pr:94", "issue:88#comment:123", "checkpoint:...#67"
    payload: dict = field(default_factory=dict)

    @property
    def event_type(self) -> EventType | None:
        for et in EventType:
            if et.value == self.raw_type:
                return et
        return None

    @property
    def is_allowed(self) -> bool:
        return self.event_type in ALLOWED_EVENT_TYPES

    def dedup_key(self) -> str:
        """Chave estável para deduplicação.

        Baseada em identidade + um hash curto do payload relevante — assim
        o MESMO evento (mesmo PR, mesmo estado, mesmo comentário) produz a
        MESMA chave em execuções diferentes, mas um evento genuinamente
        novo sobre a mesma entidade (ex.: o Guard virou verde depois de ter
        sido vermelho) produz uma chave diferente.
        """
        conteudo_relevante = repr(sorted(self.payload.get("dedup_fields", {}).items()))
        digest = hashlib.sha256(conteudo_relevante.encode("utf-8")).hexdigest()[:16]
        return f"{self.repo}:{self.raw_type}:{self.identity}:{digest}"
