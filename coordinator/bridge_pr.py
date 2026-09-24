"""PR automática + disparo confiável do Guard — Issue #128, §9.

O QUE ESTE MÓDULO FAZ (e só isto):

1. **encontra ou abre** a PR da branch que o Runner acabou de publicar,
   de forma IDEMPOTENTE — se já existe uma PR aberta com aquela branch
   como ``head``, ela é REUTILIZADA; nunca é criada uma segunda;
2. **monta o corpo** da PR com o escopo real e auditável da tarefa (id,
   objetivo, issue de origem, ``allowed_files``, worker, branch,
   checkpoint, risco/política) e a frase que nunca falta: merge
   exclusivamente José;
3. **dispara o Repasso Guard** explicitamente, por
   ``workflow_dispatch``, para aquela PR.

**POR QUE o item 3 existe** (armadilha real, apontada na própria Issue
#128): uma PR criada com o ``GITHUB_TOKEN`` do Actions NÃO dispara
workflows de ``pull_request`` — o GitHub bloqueia isso de propósito, para
evitar recursão de workflow. Ou seja, "abrir a PR" não faz o Guard
rodar. Em vez de trocar o token por um PAT novo (mais poder, mais
superfície), o Bridge dispara o Guard por ``workflow_dispatch``
confiável: a execução sai SEMPRE da branch padrão (código confiável), o
Guard busca os metadados REAIS da PR pela API e audita o HEAD REAL —
sem nunca executar código do PR com segredo nenhum. Ver
``.github/workflows/guard.yml``.

**INVARIANTES:**

- **nunca faz merge.** Não existe método nenhum aqui para isso, e o
  cliente HTTP só conhece três operações: listar PR por ``head``, criar
  PR e despachar um workflow por nome de ARQUIVO vindo de constante em
  código. A ausência é a prova (mesma técnica de
  ``worker_ops.WorkerRecord.never_merge``);
- **nunca publica/deploya.** Nenhuma chamada de Netlify, nenhuma escrita
  em Supabase, nenhuma alteração de matéria;
- **nunca aceita workflow arbitrário.** ``GUARD_WORKFLOW_FILE`` é
  constante em código; ``disparar_guard`` só aceita o nome de arquivo do
  Guard — qualquer outro valor falha fechado, então nem um input de
  workflow nem um texto de modelo consegue fazer o Bridge disparar
  outra automação;
- **credencial só do ambiente.** O token é lido preguiçosamente (dentro
  da chamada, nunca no ``__init__``), só de ``GITHUB_TOKEN`` — nunca
  hardcoded, nunca parâmetro de texto solto, nunca logado (todo texto de
  erro passa por ``redact``);
- **o corpo da PR é dado TIPADO**, montado a partir da ``RunnerTask`` e
  da tarefa declarativa — nunca de texto livre de workflow, comentário
  ou modelo.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Protocol

from .redact import redact
from .runner_contract import RunnerTask

# Arquivo do Guard — constante em CÓDIGO, nunca input/Variable. É o único
# workflow que este módulo consegue despachar.
GUARD_WORKFLOW_FILE = "guard.yml"

GITHUB_TOKEN_ENV = "GITHUB_TOKEN"
GITHUB_API_BASE = "https://api.github.com"

FRASE_MERGE_SO_JOSE = "**Merge/publicação/deploy: exclusivamente José.**"


class GitHubBridgeApiError(RuntimeError):
    pass


class GitHubBridgeApi(Protocol):
    """A superfície MÍNIMA de que o Bridge precisa — deliberadamente sem
    nenhuma operação de merge, de publicação ou de escrita em branch."""

    def prs_abertas_por_head(self, branch: str) -> list[dict]: ...

    def pr_por_numero(self, pr_number: int) -> dict: ...

    def comentarios_da_pr(self, pr_number: int) -> list[dict]: ...

    def criar_pr(self, *, titulo: str, head: str, base: str, corpo: str) -> dict: ...

    def atualizar_pr_corpo(self, pr_number: int, *, corpo: str) -> dict: ...

    def despachar_workflow(self, *, arquivo: str, ref: str, inputs: dict) -> None: ...


class GitHubRestApi:
    """Implementação real, com biblioteca padrão (``urllib``) — mesmo
    isolamento de ``anthropic_transport.py``: só este arquivo fala HTTP
    com o GitHub, então o resto do Bridge continua puro e testável sem
    rede."""

    def __init__(self, *, owner: str, repo: str, timeout: float = 30.0,
                 api_base: str = GITHUB_API_BASE) -> None:
        if not (owner or "").strip() or not (repo or "").strip():
            raise ValueError("owner/repo não podem ser vazios.")
        self.owner = owner.strip()
        self.repo = repo.strip()
        self.timeout = timeout
        self.api_base = api_base.rstrip("/")

    # -- transporte ------------------------------------------------------

    def _token(self) -> str:
        token = os.environ.get(GITHUB_TOKEN_ENV)
        if not token:
            raise GitHubBridgeApiError(
                f"{GITHUB_TOKEN_ENV} não está definida no ambiente — esperado vir só do token do "
                "workflow. Nenhuma chamada foi tentada."
            )
        return token

    def _requisicao(self, metodo: str, caminho: str, payload: dict | None = None) -> object:
        url = f"{self.api_base}{caminho}"
        corpo = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=corpo, method=metodo)
        req.add_header("Authorization", f"Bearer {self._token()}")
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        req.add_header("User-Agent", "repasso-worker-bridge")
        if corpo is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resposta:
                bruto = resposta.read().decode("utf-8") or ""
                if not bruto.strip():
                    return {}
                return json.loads(bruto)
        except urllib.error.HTTPError as exc:
            detalhe = ""
            try:
                detalhe = exc.read().decode("utf-8")[:500]
            except Exception:  # pragma: no cover - corpo de erro ilegível
                detalhe = ""
            raise GitHubBridgeApiError(
                f"GitHub respondeu {exc.code} para {metodo} {caminho}: {redact(detalhe)}"
            ) from exc
        except urllib.error.URLError as exc:
            raise GitHubBridgeApiError(
                f"falha de rede em {metodo} {caminho}: {redact(str(exc.reason))}"
            ) from exc

    # -- operações -------------------------------------------------------

    def prs_abertas_por_head(self, branch: str) -> list[dict]:
        alvo = (branch or "").strip()
        if not alvo:
            raise ValueError("branch não pode ser vazia.")
        head = urllib.request.quote(f"{self.owner}:{alvo}", safe="")
        dados = self._requisicao("GET", f"/repos/{self.owner}/{self.repo}/pulls?state=open&head={head}")
        return list(dados) if isinstance(dados, list) else []

    def pr_por_numero(self, pr_number: int) -> dict:
        if not isinstance(pr_number, int) or pr_number <= 0:
            raise ValueError(f"pr_number precisa ser inteiro positivo — recebido {pr_number!r}.")
        dados = self._requisicao("GET", f"/repos/{self.owner}/{self.repo}/pulls/{pr_number}")
        if not isinstance(dados, dict) or int(dados.get("number") or 0) != pr_number:
            raise GitHubBridgeApiError(f"a consulta da PR #{pr_number} não devolveu uma PR utilizável.")
        return dados

    def comentarios_da_pr(self, pr_number: int) -> list[dict]:
        """Lê comentários da PR pelo endpoint de issue comments.

        É operação somente-leitura. O Worker Bridge usa isto apenas para
        consumir o Cartão de Merge machine-readable publicado pelo
        Coordinator após a auditoria; nunca aceita comentário humano como
        instrução de correção.
        """
        if not isinstance(pr_number, int) or pr_number <= 0:
            raise ValueError(f"pr_number precisa ser inteiro positivo — recebido {pr_number!r}.")
        dados = self._requisicao(
            "GET", f"/repos/{self.owner}/{self.repo}/issues/{pr_number}/comments?per_page=100"
        )
        return list(dados) if isinstance(dados, list) else []

    def criar_pr(self, *, titulo: str, head: str, base: str, corpo: str) -> dict:
        dados = self._requisicao(
            "POST", f"/repos/{self.owner}/{self.repo}/pulls",
            {"title": titulo, "head": head, "base": base, "body": corpo, "draft": False},
        )
        if not isinstance(dados, dict) or not dados.get("number"):
            raise GitHubBridgeApiError("a criação da PR não devolveu um número de PR utilizável.")
        return dados

    def atualizar_pr_corpo(self, pr_number: int, *, corpo: str) -> dict:
        if not isinstance(pr_number, int) or pr_number <= 0:
            raise ValueError(f"pr_number precisa ser inteiro positivo — recebido {pr_number!r}.")
        dados = self._requisicao(
            "PATCH", f"/repos/{self.owner}/{self.repo}/pulls/{pr_number}",
            {"body": corpo},
        )
        if not isinstance(dados, dict) or int(dados.get("number") or 0) != pr_number:
            raise GitHubBridgeApiError(
                f"a atualização do corpo da PR #{pr_number} não devolveu uma PR utilizável."
            )
        return dados

    def despachar_workflow(self, *, arquivo: str, ref: str, inputs: dict) -> None:
        if arquivo != GUARD_WORKFLOW_FILE:
            raise GitHubBridgeApiError(
                f"workflow {arquivo!r} não é o único que o Bridge pode despachar "
                f"({GUARD_WORKFLOW_FILE!r}) — fail-closed."
            )
        self._requisicao(
            "POST", f"/repos/{self.owner}/{self.repo}/actions/workflows/{arquivo}/dispatches",
            {"ref": ref, "inputs": inputs},
        )


# ---------------------------------------------------------------------
# Corpo/título da PR — dado tipado, nunca texto livre externo.
# ---------------------------------------------------------------------

def titulo_da_pr(*, canonical_task_id: str, titulo_tarefa: str | None) -> str:
    base = (titulo_tarefa or canonical_task_id).strip()
    return f"[worker-bridge] {base}"


def corpo_da_pr(
    *, task: RunnerTask, canonical_task_id: str, worker_id: str, worker_display: str,
    checkpoint_commit: str | None, titulo_tarefa: str | None, objetivo: str | None,
    area: str | None = None, dependencias: tuple[str, ...] = (),
    source_pack_path: str | None = None, source_pack_sha256: str | None = None,
    question_report: str | None = None,
) -> str:
    """O bloco ``## ESCOPO`` que o Repasso Guard já sabe ler
    (``tools/qa/guard/__main__.py::parse_scope``) — os rótulos são
    exatamente os que ele espera, para que a PR automática nunca chegue
    ao Guard sem escopo declarado. ``Arquivos permitidos`` vem de
    ``task.allowed_files``, que por sua vez vem da tarefa declarativa e
    nunca é ampliada pelo Bridge."""
    arquivos = ", ".join(f"`{a}`" for a in task.allowed_files)
    linhas = [
        "<!-- repasso-worker-bridge-needs-audit -->",
        "## ESCOPO",
        "",
        f"- **Tarefa:** {canonical_task_id}",
        f"- **Área:** {(area or 'infraestrutura').strip()}",
        f"- **Arquivos permitidos:** {arquivos}",
        f"- **Agente:** {worker_display} (`{worker_id}`, worker programático `api_runner`)",
        f"- **Objetivo:** {(objetivo or titulo_tarefa or canonical_task_id).strip()}",
        (
            f"- **Fonte:** Issue #{task.source_issue}" if task.source_issue
            else "- **Fonte:** Worker Bridge (Issue #128)"
        ),
        f"- **Dependências:** {', '.join(dependencias) if dependencias else '—'}",
        f"- **Lei 8-A obrigatória:** {'SIM' if task.question_report_required else 'NÃO'}",
    ]
    if source_pack_path and source_pack_sha256:
        linhas += [
            f"- **Source pack:** `{source_pack_path}`",
            f"- **Source pack SHA-256:** `{source_pack_sha256}`",
        ]
    if question_report:
        linhas += ["", question_report.strip()]
    linhas += [
        "",
        "## Execução",
        "",
        f"- **Branch de trabalho:** `{task.branch}`",
        f"- **Checkpoint/commit publicado:** `{checkpoint_commit or '—'}`",
        f"- **Id de execução (claim do Runner):** `{task.task_id}`",
        f"- **Risco:** {task.risk_level}  ·  **Política (Issue #83):** Nível {task.policy_level}"
        f"  ·  **Autorizado por José:** {'sim' if task.jose_authorized else 'não requerido neste nível'}",
        f"- **Prioridade:** {task.priority.value}",
        "",
        "## Estado",
        "",
        "Esta PR foi aberta automaticamente pelo Worker Bridge (Issue #128) depois de o Runner",
        "aplicar o patch, passar as validações da allowlist e publicar o commit na branch de",
        "trabalho da tarefa. O resultado é **NEEDS-AUDIT**: nunca MERGE-READY, nunca aprovado",
        "por si só. A auditoria semântica independente acontece antes de qualquer decisão humana.",
        "",
        "Nenhum worker faz merge, publicação ou deploy — nem este.",
        "",
        FRASE_MERGE_SO_JOSE,
    ]
    return "\n".join(linhas)


# ---------------------------------------------------------------------
# Idempotência da PR
# ---------------------------------------------------------------------

@dataclass(frozen=True)
class PrOutcome:
    action: str  # "REUSED" | "CREATED" | "SKIPPED" | "FAILED"
    reason: str
    pr_number: int | None = None
    pr_url: str | None = None

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "reason": self.reason,
            "pr_number": self.pr_number,
            "pr_url": self.pr_url,
        }


def garantir_pr(
    api: GitHubBridgeApi, *, task: RunnerTask, canonical_task_id: str,
    worker_id: str, worker_display: str, checkpoint_commit: str | None,
    base_branch: str, titulo_tarefa: str | None = None, objetivo: str | None = None,
    area: str | None = None, dependencias: tuple[str, ...] = (),
    source_pack_path: str | None = None, source_pack_sha256: str | None = None,
    question_report: str | None = None,
) -> PrOutcome:
    """§9, idempotente: se já existe PR ABERTA cuja ``head`` é
    ``task.branch``, ela é reutilizada — nunca uma duplicata. A busca é
    por ``head`` (não por título/corpo), porque a branch é a identidade
    real do trabalho publicado."""
    if not (task.branch or "").strip():
        return PrOutcome("SKIPPED", "a tarefa não tem branch de trabalho — nada a abrir.")
    if (base_branch or "").strip() == task.branch.strip():
        return PrOutcome(
            "SKIPPED",
            f"base ({base_branch!r}) e head ({task.branch!r}) são a mesma branch — nada a abrir.",
        )

    corpo_atualizado = corpo_da_pr(
        task=task, canonical_task_id=canonical_task_id, worker_id=worker_id,
        worker_display=worker_display, checkpoint_commit=checkpoint_commit,
        titulo_tarefa=titulo_tarefa, objetivo=objetivo,
        area=area, dependencias=dependencias,
        source_pack_path=source_pack_path, source_pack_sha256=source_pack_sha256,
        question_report=question_report,
    )

    try:
        existentes = api.prs_abertas_por_head(task.branch)
    except (GitHubBridgeApiError, ValueError) as exc:
        return PrOutcome("FAILED", f"não consegui consultar PRs abertas: {redact(str(exc))}")

    if existentes:
        pr = existentes[0]
        pr_number = pr.get("number")
        if not isinstance(pr_number, int) or pr_number <= 0:
            return PrOutcome("FAILED", "PR existente não tem número utilizável.")
        if str(pr.get("body") or "") != corpo_atualizado:
            try:
                pr = api.atualizar_pr_corpo(pr_number, corpo=corpo_atualizado)
            except (GitHubBridgeApiError, ValueError) as exc:
                return PrOutcome(
                    "FAILED",
                    f"PR #{pr_number} existe, mas não consegui sincronizar corpo/checkpoint/relatório: "
                    f"{redact(str(exc))}. Guard bloqueado até a sincronização ser recuperada.",
                    pr_number=None,
                    pr_url=pr.get("html_url"),
                )
        return PrOutcome(
            "REUSED",
            f"PR #{pr_number} já está aberta para a branch {task.branch!r} — reutilizada com "
            "corpo/checkpoint/relatório sincronizados, nunca duplicada.",
            pr_number=pr_number,
            pr_url=pr.get("html_url"),
        )

    try:
        pr = api.criar_pr(
            titulo=titulo_da_pr(canonical_task_id=canonical_task_id, titulo_tarefa=titulo_tarefa),
            head=task.branch,
            base=base_branch,
            corpo=corpo_atualizado,
        )
    except (GitHubBridgeApiError, ValueError) as exc:
        return PrOutcome("FAILED", f"não consegui abrir a PR: {redact(str(exc))}")

    return PrOutcome(
        "CREATED",
        f"PR #{pr.get('number')} aberta para {task.branch!r} -> {base_branch!r}.",
        pr_number=pr.get("number"),
        pr_url=pr.get("html_url"),
    )


@dataclass(frozen=True)
class GuardDispatchOutcome:
    action: str  # "DISPATCHED" | "ALREADY_DISPATCHED" | "SKIPPED" | "FAILED"
    reason: str
    pr_number: int | None = None

    def to_dict(self) -> dict:
        return {"action": self.action, "reason": self.reason, "pr_number": self.pr_number}


def disparar_guard(
    api: GitHubBridgeApi, *, pr_number: int, ref: str,
    arquivo: str = GUARD_WORKFLOW_FILE,
) -> GuardDispatchOutcome:
    """Dispara o Guard para uma PR específica. ``ref`` é SEMPRE a branch
    padrão (quem chama passa a branch base confiável) — é isso que
    garante que o Guard despachado rode a versão confiável do workflow, e
    não a de uma ref escolhida por alguém no momento do disparo.

    A IDEMPOTÊNCIA não vive aqui: ela vive no protocolo recuperável de
    ``task_runtime`` (correção B4 da auditoria do PR #129) — quem chama só
    chega a esta função quando ``reservar_guard_dispatch`` devolveu
    ``True``, e registra depois o desfecho com
    ``confirmar_guard_dispatch``/``falhar_guard_dispatch``. Por isso esta
    função pode devolver ``FAILED`` sem deixar nada preso: a falha é
    registrada como falha, e uma próxima execução autorizada tenta de
    novo."""
    if not isinstance(pr_number, int) or pr_number <= 0:
        return GuardDispatchOutcome("SKIPPED", f"pr_number inválido ({pr_number!r}) — nada despachado.")
    try:
        api.despachar_workflow(
            arquivo=arquivo, ref=ref, inputs={"pr_number": str(pr_number)},
        )
    except (GitHubBridgeApiError, ValueError) as exc:
        return GuardDispatchOutcome(
            "FAILED", f"não consegui despachar o Guard: {redact(str(exc))}", pr_number=pr_number
        )
    return GuardDispatchOutcome(
        "DISPATCHED",
        f"Guard despachado (workflow_dispatch, ref confiável {ref!r}) para a PR #{pr_number}.",
        pr_number=pr_number,
    )
