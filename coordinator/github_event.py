"""Constrói um ``Event`` a partir do contexto real de um GitHub Actions run.

Parte do bloqueador 1 da auditoria do PR #97: antes desta correção, o
workflow parava num placeholder e nunca traduzia o payload de verdade do
GitHub (o conteúdo de ``$GITHUB_EVENT_PATH``) para o formato interno que
``coordinator.observe`` entende.

Cobre exatamente os 3 gatilhos configurados em
``.github/workflows/coordinator-observe.yml`` (o quarto evento permitido,
PR/checkpoint em NEEDS-AUDIT, é construído a partir de ``pull_request``
com o label correspondente — ver ``_from_pull_request``):

    pull_request (labeled)      -> PR_NEEDS_AUDIT
    issue_comment (created)     -> INBOX_COMMENT ou CHECKPOINT_BLOCKED_LIMIT
    workflow_run (completed)    -> GUARD_STATE_CHANGE

Devolve ``None`` quando o payload não corresponde a nenhum evento que o
Coordinator reconhece — o workflow, nesse caso, não deve nem tentar rodar
o pipeline (ver o passo correspondente no workflow).
"""

from __future__ import annotations

import re

from .events import INBOX_ISSUE_NUMBER, Event

# O rótulo que marca "chegou a hora de auditar" — mesma convenção que
# coordination/STATES.md usa para o nome do estado.
LABEL_NEEDS_AUDIT = "NEEDS-AUDIT"

RE_AREA = re.compile(r"^\s*[-*]\s*\*\*Área:\*\*\s*(.+)$", re.I | re.M)
RE_ESTADO_CHECKPOINT = re.compile(r"^ESTADO:\s*(\S+)", re.M)


def _from_pull_request(payload: dict, repo: str) -> Event | None:
    if payload.get("action") != "labeled":
        return None
    label = (payload.get("label") or {}).get("name", "")
    if label != LABEL_NEEDS_AUDIT:
        return None
    pr = payload.get("pull_request", {})
    numero = pr.get("number")
    corpo = pr.get("body") or ""
    m = RE_AREA.search(corpo)
    area = m.group(1).strip().lower() if m else None
    return Event(
        raw_type="PR_NEEDS_AUDIT",
        source="github",
        repo=repo,
        identity=f"pr:{numero}",
        payload={
            "area": area,
            "titulo": pr.get("title"),
            "dedup_fields": {"pr": numero, "label": label, "updated_at": pr.get("updated_at")},
        },
    )


def _from_issue_comment(payload: dict, repo: str) -> Event | None:
    if payload.get("action") != "created":
        return None
    issue = payload.get("issue", {})
    comentario = payload.get("comment", {})
    corpo = comentario.get("body") or ""
    numero_issue = issue.get("number")
    numero_comentario = comentario.get("id")

    if numero_issue == INBOX_ISSUE_NUMBER:
        return Event(
            raw_type="INBOX_COMMENT",
            source="github",
            repo=repo,
            identity=f"issue:{numero_issue}#comment:{numero_comentario}",
            payload={
                "body": corpo,
                "dedup_fields": {"comment_id": numero_comentario},
            },
        )

    m = RE_ESTADO_CHECKPOINT.search(corpo)
    if m and m.group(1).strip().upper() == "BLOCKED-LIMIT":
        return Event(
            raw_type="CHECKPOINT_BLOCKED_LIMIT",
            source="github",
            repo=repo,
            identity=f"issue:{numero_issue}#comment:{numero_comentario}",
            payload={
                "titulo": f"Checkpoint BLOCKED-LIMIT na issue #{numero_issue}",
                "dedup_fields": {"comment_id": numero_comentario},
            },
        )
    return None


def _from_workflow_run(payload: dict, repo: str) -> Event | None:
    if payload.get("action") != "completed":
        return None
    run = payload.get("workflow_run", {})
    if run.get("name") != "Repasso Guard":
        return None
    conclusao = run.get("conclusion")  # "success" | "failure" | ...
    estado = "success" if conclusao == "success" else "failure"
    prs = run.get("pull_requests") or []
    identidade = f"pr:{prs[0]['number']}" if prs else f"run:{run.get('id')}"
    return Event(
        raw_type="GUARD_STATE_CHANGE",
        source="github",
        repo=repo,
        identity=identidade,
        payload={
            "guard_state": estado,
            # O pacote de auditoria em si (tools/qa/guard) fica como
            # artifact do run — baixar e anexar aqui é uma melhoria futura,
            # não parte dos 3 bloqueadores desta rodada; documentado como
            # limitação conhecida no Cartão de Merge.
            "audit_pack": None,
            "dedup_fields": {"run_id": run.get("id"), "conclusion": conclusao},
        },
    )


_CONSTRUTORES = {
    "pull_request": _from_pull_request,
    "issue_comment": _from_issue_comment,
    "workflow_run": _from_workflow_run,
}


def build_event_from_github_context(event_name: str, payload: dict, repo: str) -> Event | None:
    construtor = _CONSTRUTORES.get(event_name)
    if construtor is None:
        return None
    return construtor(payload, repo)
