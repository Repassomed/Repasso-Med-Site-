"""Checkpoints visíveis na Issue #88 (Issue #99, achado B1 da auditoria
independente do PR #104, rodada 2: "#88 ainda não é interface
conversacional visível").

Anti-spam por design: só os checkpoints explicitamente listados na #99
têm renderização aqui — RECEBIDO, DESPACHADO, BLOCKED, BLOCKED-LIMIT,
NEEDS-AUDIT, NEEDS-FIX, MERGE-READY, DONE e POOL-PAUSADO. Nenhum evento
interno/administrativo (Guard rotineiro, dedup, etc.) passa por este
módulo — quem decide SE comenta é ``observe.py``, sempre uma vez por
evento (a mesma garantia de dedup atômico que já cobre todo o pacote).
Todo texto gerado aqui carrega ``COORDINATOR_COMMENT_MARKER`` como
primeira linha, para o filtro anti-self-loop de ``github_event.py``.
"""

from __future__ import annotations

from .github_event import COORDINATOR_COMMENT_MARKER

_EMOJI = {
    "RECEBIDO": "✅",
    "DESPACHADO": "🚀",
    "BLOCKED": "⛔",
    "BLOCKED-LIMIT": "⏸️",
    "NEEDS-AUDIT": "🔎",
    "NEEDS-FIX": "🔴",
    "MERGE-READY": "🟣",
    "DONE": "✅",
    "POOL-PAUSADO": "⏸️",
}


def render_recebido(*, tarefa: str, prioridade: str, estado: str, worker: str | None,
                     proximo_checkpoint: str, cost_block: str | None = None) -> str:
    L = [
        COORDINATOR_COMMENT_MARKER,
        "✅ RECEBIDO",
        f"Tarefa: {tarefa}",
        f"Prioridade: {prioridade}",
        f"Estado: {estado}",
        f"Worker: {worker or 'será definido automaticamente'}",
        f"Próximo checkpoint: {proximo_checkpoint}",
    ]
    if cost_block:
        L += ["", cost_block]
    return "\n".join(L)


def render_checkpoint(tipo: str, *, linhas: dict[str, str], cost_block: str | None = None) -> str:
    emoji = _EMOJI.get(tipo, "ℹ️")
    L = [COORDINATOR_COMMENT_MARKER, f"{emoji} {tipo}"]
    for chave, valor in linhas.items():
        L.append(f"{chave}: {valor}")
    if cost_block:
        L += ["", cost_block]
    return "\n".join(L)
