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

**Correção da V3 (Issue #99, "blocker prioritário").** O item 3 acima
tinha um bug real, achado em produção (PR #77, Guard run #34): um NOVO
commit empurrado para a MESMA PR, com o Guard terminando de novo em
``success`` (o mesmo estado de antes), produzia a MESMA ``dedup_key`` —
porque só ``conclusion`` entrava em ``dedup_fields``, nunca o commit em
si. Ou seja, "PR #77 corrigiu o problema X e o Guard passou de novo" era
tratado como DUPLICATE do "PR #77 passou o Guard pela primeira vez",
perdendo silenciosamente um evento real. A identidade agora é
PR + HEAD_SHA + estado do Guard: ``head_sha`` vem direto do campo
``workflow_run.head_sha`` que o próprio webhook já entrega (nenhuma
chamada de API adicional) e entra em ``dedup_fields`` ao lado de
``conclusion``. Resultado: mesma PR + mesmo HEAD + mesmo estado ainda
colide (rerun do Guard sem nenhum commit novo == DUPLICATE, comportamento
antigo preservado); mesma PR + NOVO HEAD + mesmo estado agora produz uma
chave nova (auditoria de verdade), porque o hash do payload muda mesmo
com ``conclusion`` igual. O mesmo campo foi adicionado a
``PR_NEEDS_AUDIT`` por consistência (um novo commit na mesma PR, ainda
com o rótulo NEEDS-AUDIT, já não dependia só de ``updated_at`` para virar
evento novo).

Cobre os 2 gatilhos que seguram segredo em
``.github/workflows/coordinator-observe.yml``:

    issue_comment (created)     -> INBOX_COMMENT ou CHECKPOINT_BLOCKED_LIMIT
    workflow_run (completed)    -> PR_NEEDS_AUDIT (se o PR tiver o rótulo e
                                    o Guard tiver passado) ou GUARD_STATE_CHANGE

Devolve ``None`` quando o payload não corresponde a nenhum evento que o
Coordinator reconhece — o workflow, nesse caso, não deve nem tentar rodar
o pipeline (ver o passo correspondente no workflow).

**Correção pós-auditoria independente do PR #104 (B2, B3, B4 do comentário
de auditoria + requisito de anti-loop da #99):**

- **B2 — diff real como evidência principal.** O corpo da PR é a
  declaração do worker, nunca prova do que de fato mudou. Um novo
  parâmetro ``pr_diff`` (texto do diff real, buscado por um passo do
  workflow via API somente-leitura da branch confiável — nunca do HEAD do
  PR) passa a acompanhar o evento ``PR_NEEDS_AUDIT`` em
  ``payload["pr_diff"]``. O texto do diff nunca é executado nem
  interpretado como instrução por este módulo — é só uma string que
  atravessa até o prompt da auditoria (ver ``coordinator/audit.py``, que
  trunca e nunca segue instruções dentro dele).
- **Anti-self-loop (Issue #99, pedido explícito de José).** Todo
  comentário automático do Coordinator carrega o marcador
  ``COORDINATOR_COMMENT_MARKER``. Um ``issue_comment`` que contenha esse
  marcador é ignorado ANTES de qualquer outra coisa — inclusive antes de
  checar ``ALLOWED_COMMENT_ACTORS`` — porque José e todos os agentes
  Claude publicam pela MESMA identidade GitHub ("Repassomed"); sem este
  filtro, um comentário do próprio Coordinator passaria no filtro de ator
  confiável e poderia reabrir um ciclo pago sobre si mesmo.
"""

from __future__ import annotations

import re

from .events import INBOX_ISSUE_NUMBER, Event

# O rótulo que marca "chegou a hora de auditar" — mesma convenção que
# coordination/STATES.md usa para o nome do estado.
LABEL_NEEDS_AUDIT = "NEEDS-AUDIT"

RE_AREA = re.compile(r"^\s*[-*]\s*\*\*Área:\*\*\s*(.+)$", re.I | re.M)
RE_ESTADO_CHECKPOINT = re.compile(r"^ESTADO:\s*(\S+)", re.M)
# Rodada 3 (Issue #99, Worker Registry operacional + handoff): os mesmos
# campos que coordination/CHECKPOINT-TEMPLATE.md já define, agora extraídos
# para o payload — nunca só o texto bruto — porque a atualização do
# registro operacional e a decisão de handoff precisam saber QUEM (AGENTE),
# QUAL tarefa (TAREFA) e A PARTIR DE QUE COMMIT/BRANCH retomar.
RE_AGENTE_CHECKPOINT = re.compile(r"^AGENTE:\s*(.+)$", re.M)
RE_TAREFA_CHECKPOINT = re.compile(r"^TAREFA:\s*(.+)$", re.M)
RE_BRANCH_CHECKPOINT = re.compile(r"^BRANCH:\s*(.+)$", re.M)
RE_COMMIT_CHECKPOINT = re.compile(r"^COMMIT:\s*(.+)$", re.M)


def _campo_checkpoint(regex: re.Pattern, corpo: str) -> str | None:
    m = regex.search(corpo)
    if not m:
        return None
    valor = m.group(1).strip()
    return None if valor in ("", "-") else valor

# V3 (Issue #99, "Lei das Questões" para o Coordinator): detecta, por
# palavra-chave em título+corpo da PR, se a tarefa envolve prova/questões —
# mesmo espírito de classify.py::_KEYWORDS_CONTEUDO, mas aqui vira um sinal
# explícito no payload (``envolve_questoes``) para que merge_card.py saiba
# exigir o relatório obrigatório de 8-A.11 antes de MERGE-READY.
RE_ENVOLVE_QUESTOES = re.compile(
    r"\b(quest(ã|a)o|quest(õ|o)es|prova|gabarito|banco general|banco geral)\b", re.I
)

# Bloqueador 2 da 3ª auditoria: só este(s) ator(es) podem gerar um evento
# pago via comentário. Neste projeto, José e todos os agentes Claude
# publicam comentários através da MESMA identidade do GitHub
# ("Repassomed") — não há hoje uma identidade distinta por agente, então
# esta é a lista completa de atores confiáveis para o piloto.
ALLOWED_COMMENT_ACTORS: frozenset[str] = frozenset({"Repassomed"})

# Anti-self-loop (Issue #99, pedido explícito de José + achado B3 da
# pré-auditoria do Claude 3): todo comentário que o Coordinator publicar
# sozinho carrega este marcador — ``merge_card.render_merge_card`` o
# escreve como a primeira linha de qualquer Cartão de Merge/comentário
# gerado. Um comentário que já contenha o marcador nunca pode virar um
# evento novo, porque isso reabriria um ciclo pago sobre a própria saída
# do Coordinator.
COORDINATOR_COMMENT_MARKER = "<!-- repasso-coordinator -->"


def _from_issue_comment(payload: dict, repo: str, *, pr_info: dict | None = None,
                         audit_pack: dict | None = None, pr_diff: str | None = None) -> Event | None:
    if payload.get("action") != "created":
        return None

    comentario = payload.get("comment", {})
    corpo = comentario.get("body") or ""

    # Anti-self-loop: verificado ANTES de qualquer outra coisa — inclusive
    # antes do ator confiável, porque o próprio Coordinator publica pela
    # MESMA identidade GitHub ("Repassomed") que José e os outros agentes.
    # Sem este filtro na frente, um comentário automático do Coordinator
    # passaria no filtro de ator confiável abaixo e poderia gerar um novo
    # INBOX_COMMENT/CHECKPOINT_BLOCKED_LIMIT sobre a própria saída dele.
    if COORDINATOR_COMMENT_MARKER in corpo:
        return None

    autor = (comentario.get("user") or {}).get("login")
    if autor not in ALLOWED_COMMENT_ACTORS:
        # Ator não confiável: zero classificação, zero chamada — a decisão
        # termina aqui, nunca chega perto do portão ENABLED/MODE.
        return None

    issue = payload.get("issue", {})
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
                # Correção B4 da auditoria independente do PR #104, rodada 3:
                # a issue de ORIGEM do checkpoint — nunca a #88 por padrão.
                # ``observe.py`` usa isto para decidir o destino do
                # comentário: um checkpoint específico volta pra cá, mas um
                # POOL-PAUSADO global sempre vai para a Inbox (#88),
                # independentemente de onde o checkpoint chegou.
                "issue": numero_issue,
                "agente": _campo_checkpoint(RE_AGENTE_CHECKPOINT, corpo),
                "tarefa": _campo_checkpoint(RE_TAREFA_CHECKPOINT, corpo),
                "branch": _campo_checkpoint(RE_BRANCH_CHECKPOINT, corpo),
                "commit": _campo_checkpoint(RE_COMMIT_CHECKPOINT, corpo),
                "dedup_fields": {"comment_id": numero_comentario},
            },
        )
    return None


def _from_workflow_run(payload: dict, repo: str, *, pr_info: dict | None = None,
                        audit_pack: dict | None = None, pr_diff: str | None = None) -> Event | None:
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
    precisa_auditoria = bool(
        pr_info
        and (
            LABEL_NEEDS_AUDIT in (pr_info.get("labels") or [])
            or pr_info.get("worker_bridge_needs_audit") is True
        )
    )
    if estado == "success" and precisa_auditoria:
        numero = pr_info.get("number")
        corpo = pr_info.get("body") or ""
        titulo = pr_info.get("title") or ""
        m = RE_AREA.search(corpo)
        area = m.group(1).strip().lower() if m else None
        # ``materia`` aqui é um sinal de PRESENÇA (routing.py só checa
        # "is not None"), não uma tentativa de extrair um slug estruturado
        # — o modelo de PR (.github/pull_request_template.md) não tem hoje
        # um campo "Matéria:" machine-readable separado de "Área:". Quando
        # a área classificada é "materia" (conteúdo médico — Nível C da
        # Issue #83), o próprio título da PR entra aqui como identificador
        # legível para José, e é o suficiente para o roteamento existente
        # (routing.decide) marcar needs_semantic_audit=True. Uma extração
        # mais precisa (slug por matéria) fica para quando o template
        # ganhar um campo dedicado — não é bloqueador desta V3.
        materia = titulo if area == "materia" else None
        return Event(
            raw_type="PR_NEEDS_AUDIT",
            source="github",
            repo=repo,
            identity=f"pr:{numero}",
            payload={
                "area": area,
                "materia": materia,
                "titulo": titulo,
                "body": corpo,
                "envolve_questoes": bool(RE_ENVOLVE_QUESTOES.search(f"{titulo}\n{corpo}")),
                "audit_pack": audit_pack,
                # B2 da auditoria independente do PR #104: o corpo da PR é
                # a DECLARAÇÃO do worker, nunca a prova do que mudou. O
                # diff real (buscado pelo workflow via API somente-leitura
                # da branch confiável — nunca do HEAD do PR) é a evidência
                # principal entregue ao auditor. Nunca executado nem
                # interpretado como instrução por este módulo — só uma
                # string que atravessa até o prompt (ver audit.py).
                "pr_diff": pr_diff,
                "dedup_fields": {
                    "pr": numero,
                    "label": (
                        LABEL_NEEDS_AUDIT
                        if LABEL_NEEDS_AUDIT in (pr_info.get("labels") or [])
                        else "WORKER-BRIDGE-NEEDS-AUDIT"
                    ),
                    # Comentários e outros metadados da PR alteram updated_at sem
                    # mudar o código auditado. A identidade precisa ser PR + HEAD
                    # real auditado; incluir updated_at faria o próprio Cartão de
                    # Merge transformar um rerun idêntico em nova chamada paga.
                    # Para workflow_dispatch do Guard, workflow_run.head_sha é
                    # a main confiável, não o HEAD da PR. O workflow valida
                    # a PR real pela API e entrega o SHA tipado em pr_info.
                    "head_sha": pr_info.get("head_sha") or run.get("head_sha"),
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
            # Issue #130: metadados factuais do Guard para o Error Registry.
            # Vêm do webhook do próprio GitHub, nunca de texto livre.
            "guard_run_id": run.get("id"),
            "head_sha": run.get("head_sha"),
            "guard_conclusion": conclusao,
            # Bloqueador 5 da 3ª auditoria: o pacote de auditoria real do
            # Guard (baixado do artifact do run observado por um passo do
            # workflow — ver o comentário lá) — antes disto sempre era
            # None. ``context.py`` já sabia ler este formato (mesmo schema
            # que tools/qa/guard/__main__.py grava).
            "audit_pack": audit_pack,
            # Bloqueador 6 (PR #97) + correção V3 (Issue #99): dedup por
            # ESTADO + CONTEÚDO. A identidade já fixa o PR; ``conclusion``
            # sozinho faz verde→verde e vermelho→vermelho colidirem (nunca
            # ``run_id``, que muda a cada execução e faria isso parecer
            # sempre novo) — mas um NOVO commit que termina no MESMO estado
            # precisa ser tratado como evento novo, não DUPLICATE (era
            # exatamente isto que estava quebrado: ver o comentário no
            # topo do módulo). ``head_sha`` vem do próprio payload do
            # webhook (``workflow_run.head_sha``), sem chamada extra.
            "dedup_fields": {"conclusion": conclusao, "head_sha": run.get("head_sha")},
        },
    )


_CONSTRUTORES = {
    "issue_comment": _from_issue_comment,
    "workflow_run": _from_workflow_run,
}


def build_event_from_github_context(event_name: str, payload: dict, repo: str, *,
                                     pr_info: dict | None = None,
                                     audit_pack: dict | None = None,
                                     pr_diff: str | None = None) -> Event | None:
    construtor = _CONSTRUTORES.get(event_name)
    if construtor is None:
        return None
    return construtor(payload, repo, pr_info=pr_info, audit_pack=audit_pack, pr_diff=pr_diff)
