"""Constrói um ``Event`` a partir do contexto real de um GitHub Actions run.

Parte do bloqueador 1 da auditoria do PR #97: antes desta correção, o
workflow parava num placeholder e nunca traduzia o payload de verdade do
GitHub (o conteúdo de ``$GITHUB_EVENT_PATH``) para o formato interno que
``coordinator.observe`` entende.

**Reescrito na 3ª auditoria do PR #97 (bloqueadores 1, 2 e 6):**

1. **Trusted execution.** Não existe mais um construtor para o evento
   ``pull_request`` — esse gatilho foi REMOVIDO do workflow que segura
   ``ANTHROPIC_API_KEY`` (ver ``.github/workflows/coordinator-observe.yml``),
   porque um evento ``pull_request`` de branch do mesmo repositório roda o
   ARQUIVO do workflow (não só o checkout) na versão do PR — um PR que
   alterasse o próprio workflow ou ``coordinator/**`` poderia, em tese,
   executar código próprio com o segredo real exposto. ``workflow_run``
   (disparado quando o Guard termina) não tem esse problema: o GitHub
   SEMPRE usa o arquivo de workflow e o código da branch padrão para esse
   gatilho, nunca o do PR que originou a execução observada — é uma
   propriedade da própria plataforma, não uma convenção deste código.
   Por isso o evento ``PR_NEEDS_AUDIT`` (Issue #95, "primeiro alvo" #1)
   passou a ser sintetizado a partir de ``workflow_run`` + uma leitura
   somente-leitura da PR via API (``pr_info``, buscada por um passo do
   workflow que roda com o mesmo código confiável — ver o comentário no
   workflow), nunca a partir do payload ``pull_request`` bruto.

2. **Atores confiáveis em ``issue_comment``.** Antes de considerar
   qualquer comentário como Inbox (#88) ou checkpoint BLOCKED-LIMIT, o
   autor precisa estar em ``ALLOWED_COMMENT_ACTORS``. O workflow já filtra
   isso na camada 1 (o ``if:`` do job, antes de receber qualquer segredo);
   esta é a camada 2, em código — nunca confiar só no portão do workflow.

3. **Dedup do Guard por ESTADO, não por ``run_id``.** Cada execução do
   Guard tem um ``run_id`` novo — usá-lo faria dois runs verdes seguidos
   parecerem eventos diferentes. Agora ``dedup_fields`` carrega só
   ``conclusion``; a identidade (``pr:N``) já é estável entre runs do
   mesmo PR, então verde→verde e vermelho→vermelho colidem na mesma chave,
   e só uma mudança real de estado (vermelho→verde ou verde→vermelho)
   produz uma chave nova.

Cobre os 2 gatilhos que seguram segredo em
``.github/workflows/coordinator-observe.yml``:

    issue_comment (created)     -> INBOX_COMMENT ou CHECKPOINT_BLOCKED_LIMIT
    workflow_run (completed)    -> PR_NEEDS_AUDIT (se o PR tiver o rótulo e
                                    o Guard tiver passado) ou GUARD_STATE_CHANGE

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

# Bloqueador 2 da 3ª auditoria: só este(s) ator(es) podem gerar um evento
# pago via comentário. Neste projeto, José e todos os agentes Claude
# publicam comentários através da MESMA identidade do GitHub
# ("Repassomed") — não há hoje uma identidade distinta por agente, então
# esta é a lista completa de atores confiáveis para o piloto.
ALLOWED_COMMENT_ACTORS: frozenset[str] = frozenset({"Repassomed"})


def _from_issue_comment(payload: dict, repo: str, *, pr_info: dict | None = None,
                         audit_pack: dict | None = None) -> Event | None:
    if payload.get("action") != "created":
        return None

    autor = ((payload.get("comment") or {}).get("user") or {}).get("login")
    if autor not in ALLOWED_COMMENT_ACTORS:
        # Ator não confiável: zero classificação, zero chamada — a decisão
        # termina aqui, nunca chega perto do portão ENABLED/MODE.
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


def _from_workflow_run(payload: dict, repo: str, *, pr_info: dict | None = None,
                        audit_pack: dict | None = None) -> Event | None:
    if payload.get("action") != "completed":
        return None
    run = payload.get("workflow_run", {})
    if run.get("name") != "Repasso Guard":
        return None
    conclusao = run.get("conclusion")  # "success" | "failure" | ...
    estado = "success" if conclusao == "success" else "failure"

    # ``pr_info`` vem de uma leitura somente-leitura da PR, feita por um
    # passo do workflow que roda com o código confiável da branch padrão
    # (nunca do HEAD do PR) — ver o comentário no topo deste módulo. Só
    # existe quando o workflow_run está associado a uma PR (mesmo
    # repositório) e essa leitura teve sucesso.
    if estado == "success" and pr_info and LABEL_NEEDS_AUDIT in (pr_info.get("labels") or []):
        numero = pr_info.get("number")
        corpo = pr_info.get("body") or ""
        m = RE_AREA.search(corpo)
        area = m.group(1).strip().lower() if m else None
        return Event(
            raw_type="PR_NEEDS_AUDIT",
            source="github",
            repo=repo,
            identity=f"pr:{numero}",
            payload={
                "area": area,
                "titulo": pr_info.get("title"),
                "dedup_fields": {
                    "pr": numero,
                    "label": LABEL_NEEDS_AUDIT,
                    "updated_at": pr_info.get("updated_at"),
                },
            },
        )

    prs = run.get("pull_requests") or []
    identidade = f"pr:{prs[0]['number']}" if prs else f"run:{run.get('id')}"
    return Event(
        raw_type="GUARD_STATE_CHANGE",
        source="github",
        repo=repo,
        identity=identidade,
        payload={
            "guard_state": estado,
            # Bloqueador 5 da 3ª auditoria: o pacote de auditoria real do
            # Guard (baixado do artifact do run observado por um passo do
            # workflow — ver o comentário lá) — antes disto sempre era
            # None. ``context.py`` já sabia ler este formato (mesmo schema
            # que tools/qa/guard/__main__.py grava).
            "audit_pack": audit_pack,
            # Bloqueador 6: dedup por ESTADO (a identidade já fixa o PR;
            # só a conclusão entra na chave — NUNCA run_id, que muda a
            # cada execução e faria verde→verde parecer sempre novo).
            "dedup_fields": {"conclusion": conclusao},
        },
    )


_CONSTRUTORES = {
    "issue_comment": _from_issue_comment,
    "workflow_run": _from_workflow_run,
}


def build_event_from_github_context(event_name: str, payload: dict, repo: str, *,
                                     pr_info: dict | None = None,
                                     audit_pack: dict | None = None) -> Event | None:
    construtor = _CONSTRUTORES.get(event_name)
    if construtor is None:
        return None
    return construtor(payload, repo, pr_info=pr_info, audit_pack=audit_pack)
