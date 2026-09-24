"""CLI do Repasso Coordinator V2 — modo OBSERVE.

Dois jeitos de dar o evento:

1. formato interno (testes/uso manual):

    python3 -m coordinator --event evento.json \\
        --dedup-store /tmp/coordinator-seen.json \\
        --usage-ledger /tmp/coordinator-usage.json \\
        --workers workers.json \\
        --out /tmp/coordinator-observe.json

   ``evento.json`` é um JSON com os mesmos campos de ``events.Event``:
   ``{"raw_type": "...", "source": "...", "repo": "...", "identity": "...",
   "payload": {...}}``.

2. payload real do GitHub Actions (uso no workflow — bloqueador 1 da
   auditoria do PR #97), passando o arquivo de
   ``$GITHUB_EVENT_PATH`` e o nome do evento:

    python3 -m coordinator --github-event-name workflow_run \\
        --event "$GITHUB_EVENT_PATH" --repo "$GITHUB_REPOSITORY" \\
        --dedup-git-remote "$(git remote get-url origin)" \\
        --usage-git-remote "$(git remote get-url origin)" \\
        --workers-from-tasks-json coordination/tasks.json \\
        --pr-info-file /tmp/pr-info.json \\
        --guard-audit-pack /tmp/guard-audit-pack/guard-audit-pack.json \\
        --pr-diff-file /tmp/pr-diff.patch \\
        --out /tmp/coordinator-observe.json

   ``--pr-info-file``/``--guard-audit-pack``/``--pr-diff-file`` são
   opcionais e vêm de passos do workflow que leem a PR, o diff real e
   baixam o artifact do Guard (bloqueadores 1 e 5 da 3ª auditoria, e B2 da
   auditoria independente do PR #104) — nunca de código do HEAD do PR.

Persistência entre execuções independentes (bloqueador 2): ``--dedup-store``/
``--usage-ledger`` continuam sendo arquivo local (default, preserva o
comportamento já testado); ``--dedup-git-remote``/``--usage-git-remote``
trocam para o backend compartilhado via git (``coordinator/git_state.py``)
— use estes no workflow real, onde cada execução é um runner efêmero
diferente.

Achado F7-A (Issue #105, Fase F, 6ª rodada): este CLI agora liga o
caminho REAL até um comando ``SET_AVAILABLE`` reconhecido na Inbox (#88)
poder disparar uma retomada de verdade (``coordinator.worker_commands.
aplicar_comando`` -> ``coordinator.runner_resume.
processar_retorno_de_worker``) — ``_observar()`` sempre repassa
``--workers-from-tasks-json``/``--worker-state-git-remote`` (já
existentes, reusados, nunca duplicados) e ``--runner-repo-dir`` (novo,
opcional) para ``observe()``. Sem ``--runner-repo-dir``, nenhuma
retomada automática é tentada — comportamento idêntico ao de antes desta
correção.

Este CLI só faz chamada de rede à Anthropic se TUDO isto for verdade ao
mesmo tempo: ``REPASSO_COORDINATOR_ENABLED=true``, ``REPASSO_COORDINATOR_MODE=observe``,
e o evento passar por todos os gates do pipeline — ver
``coordinator/config.py`` e ``coordinator/anthropic_client.py``. O
Transport real (``coordinator/anthropic_transport.py``) é usado por
padrão, mas fica inerte até o portão abrir.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from . import error_registry
from .audit import construir_evidencia_de_preservacao
from .budget import UsageLedger
from .config import Config
from .dedup import Deduplicator, FileStore
from .events import Event
from .git_state import GitDedupStore, GitJsonStore, GitUsageLedger
from .github_event import build_event_from_github_context
from .observe import observe
from .openai_config import OpenAIAuditorConfig
from .redact import redact, redact_mapping
from .runner_dispatch import RunnerDispatchConfig
from .worker_ops import DEFAULT_STATE_BRANCH, LocalJsonWorkerStateStore, OperationalWorkerRegistry
from .worker_registry import Worker, WorkerState, load_workers_from_tasks_json


def _load_event(path: str) -> Event:
    with open(path, encoding="utf-8") as fh:
        dados = json.load(fh)
    return Event(
        raw_type=dados["raw_type"],
        source=dados.get("source", "fixture"),
        repo=dados.get("repo", ""),
        identity=dados.get("identity", ""),
        payload=dados.get("payload", {}),
    )


def _load_json_if_exists(path: str | None) -> dict | None:
    if not path or not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _load_text_if_exists(path: str | None) -> str | None:
    if not path or not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return fh.read()


MAX_PR_HEAD_FILES = 5
MAX_PR_HEAD_FILE_BYTES = 4_000_000


def _load_pr_head_files(manifest_path: str | None) -> dict[str, str]:
    """Conteúdo COMPLETO, no HEAD da PR, dos arquivos de matéria alterados.

    O workflow grava cada arquivo num diretório próprio e um manifesto
    ``{"files": [{"path": <caminho no repo>, "file": <nome local>}]}``. Só
    arquivos DENTRO do diretório do manifesto são lidos; tudo é texto puro,
    nunca executado — serve apenas para a evidência de preservação da
    auditoria (``audit.construir_evidencia_de_preservacao``). Qualquer
    problema devolve menos evidência, nunca um erro."""
    dados = None
    try:
        dados = _load_json_if_exists(manifest_path)
    except (OSError, ValueError):
        return {}
    if not isinstance(dados, dict) or not manifest_path:
        return {}
    base = os.path.realpath(os.path.dirname(manifest_path))
    out: dict[str, str] = {}
    for item in (dados.get("files") or [])[:MAX_PR_HEAD_FILES]:
        if not isinstance(item, dict):
            continue
        caminho, nome = item.get("path"), item.get("file")
        if not isinstance(caminho, str) or not isinstance(nome, str) or not caminho.strip():
            continue
        local = os.path.realpath(os.path.join(base, os.path.basename(nome)))
        if os.path.dirname(local) != base or not os.path.isfile(local):
            continue
        if os.path.getsize(local) > MAX_PR_HEAD_FILE_BYTES:
            continue
        try:
            with open(local, encoding="utf-8", errors="replace") as fh:
                out[caminho.strip()] = fh.read()
        except OSError:
            continue
    return out


def _load_github_event(path: str, event_name: str, repo: str, *,
                        pr_info_file: str | None = None,
                        guard_audit_pack: str | None = None,
                        pr_diff_file: str | None = None,
                        pr_head_files_manifest: str | None = None) -> Event | None:
    with open(path, encoding="utf-8") as fh:
        payload = json.load(fh)
    pr_info = _load_json_if_exists(pr_info_file)
    audit_pack = _load_json_if_exists(guard_audit_pack)
    # B2 da auditoria independente do PR #104: diff real da PR, texto puro
    # (não JSON) — buscado por um passo do workflow via API somente-leitura
    # da branch confiável, nunca do HEAD do PR (ver o comentário em
    # github_event.py). Nunca executado; só atravessa como string até o
    # prompt da auditoria.
    pr_diff = _load_text_if_exists(pr_diff_file)
    event = build_event_from_github_context(event_name, payload, repo,
                                             pr_info=pr_info, audit_pack=audit_pack, pr_diff=pr_diff)
    if event is not None and pr_diff and pr_head_files_manifest:
        # Fora de dedup_fields de propósito: a evidência deriva do mesmo
        # HEAD que já identifica o evento.
        event.payload["pr_preservation_evidence"] = construir_evidencia_de_preservacao(
            pr_diff, _load_pr_head_files(pr_head_files_manifest)
        )
    return event


def _load_workers(path: str | None) -> list[Worker]:
    if not path or not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as fh:
        dados = json.load(fh)
    out = []
    for w in dados.get("workers", []):
        out.append(
            Worker(
                name=w["name"],
                state=WorkerState(w["state"]),
                specialization=tuple(w.get("specialization", [])),
            )
        )
    return out


def _resultado_de_erro(exc: BaseException) -> dict:
    """Resultado mínimo, SEMPRE sanitizado, para quando o pipeline crasha
    antes de ``observe()`` devolver um ``ObserveResult`` normal — item 2
    do "PACOTE CONSOLIDADO" (PR #97).

    Achado original: ``main()`` não tinha nenhum ``try/except`` em volta
    da execução real; uma exceção não tratada (ex.: ``GitJsonStore``
    esgotando tentativas de publicar o estado — RuntimeError já visto de
    verdade neste projeto) derrubava o processo ANTES das linhas que
    escrevem ``--out``. O workflow ficava vermelho corretamente (código
    de saída != 0), mas sem nenhum arquivo em ``--out``, e
    ``actions/upload-artifact@v4`` usa ``if-no-files-found: ignore`` — ou
    seja, o job falhava sem publicar nenhum artifact estruturado, só o
    traceback bruto no log (que expira e nunca foi sanitizado por
    ``redact()``).

    O mesmo formato de chave de ``ObserveResult.to_dict()`` — para que
    quem já lê ``coordinator-observe.json`` não precise de um segundo
    formato só para o caminho de erro. ``status="ERROR"`` é um valor
    novo, fora dos que ``observe()`` produz (REJECTED/DUPLICATE/BLOCKED/
    OBSERVED) — deixa explícito que isto é uma falha do próprio
    Coordinator, não uma decisão normal do pipeline."""
    return {
        "status": "ERROR",
        "reason": redact(f"{type(exc).__name__}: {exc}"),
        "task_type": None,
        "priority": None,
        "worker_suggestion": None,
        "model_suggestion": None,
        "next_action": "Erro interno do Coordinator antes de decidir o evento — ver o log do job. Nenhuma chamada à Anthropic foi tentada por este caminho.",
        "needs_input": False,
        "requires_jose_authorization": False,
        "context_summary": None,
        "call_attempted": False,
        "call_status": None,
        "response_text": None,
        "usage": None,
        "audit_decision": None,
        "merge_card": None,
        "should_comment": False,
        "comment_target_issue": None,
        "openai_ledger_failed": False,
    }


def _gravar_out(caminho: str, dados: dict) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(caminho)) or ".", exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump(dados, fh, ensure_ascii=False, indent=2)


def _gravar_comment_out(caminho: str, dados: dict) -> None:
    """V3 (Issue #99): só grava quando o pipeline sinalizou
    ``should_comment`` E de fato produziu um Cartão de Merge E sabe o
    destino explícito (``comment_target_issue`` — correção B4 da
    auditoria independente do PR #104, rodada 4: sem destino conhecido,
    nunca grava o texto, para que o workflow nunca tenha que adivinhar
    onde postar). Nunca grava um arquivo vazio/parcial. O CLI nunca fala
    com a API do GitHub; só deixa o texto pronto para o passo do workflow
    (que já tem o token) publicar."""
    if not dados.get("should_comment") or not dados.get("merge_card"):
        return
    if dados.get("comment_target_issue") is None:
        return
    os.makedirs(os.path.dirname(os.path.abspath(caminho)) or ".", exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as fh:
        fh.write(dados["merge_card"])


def _gravar_comment_target_out(caminho: str, dados: dict) -> None:
    """Grava só o número da issue/PR de destino — arquivo próprio e
    minúsculo, para o workflow ler sem precisar reabrir/parsear o JSON
    completo de ``--out``. Mesma condição de ``_gravar_comment_out``: só
    escreve quando os três sinais (should_comment, merge_card,
    comment_target_issue) estão presentes juntos."""
    if not dados.get("should_comment") or not dados.get("merge_card"):
        return
    alvo = dados.get("comment_target_issue")
    if alvo is None:
        return
    os.makedirs(os.path.dirname(os.path.abspath(caminho)) or ".", exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as fh:
        fh.write(str(alvo))


def render_human(result_dict: dict) -> str:
    L = ["# Repasso Coordinator · OBSERVE", ""]
    L.append(f"**Status:** {result_dict['status']}")
    L.append(f"**Motivo:** {result_dict['reason']}")
    if result_dict.get("task_type"):
        L.append(f"**Tipo:** {result_dict['task_type']}  ·  **Prioridade:** {result_dict['priority']}")
    if result_dict.get("worker_suggestion"):
        L.append(f"**Worker sugerido:** {result_dict['worker_suggestion']}")
    if result_dict.get("model_suggestion"):
        m = result_dict["model_suggestion"]
        L.append(f"**Modelo sugerido:** {m.get('tier')} ({m.get('model_id')})")
    if result_dict.get("next_action"):
        L.append("")
        L.append(f"**Próxima ação:** {result_dict['next_action']}")
    if result_dict.get("audit_decision"):
        L.append("")
        L.append(f"**Auditoria V3 (active-supervised):** {result_dict['audit_decision']}")
        if result_dict.get("merge_card"):
            L.append("")
            L.append(result_dict["merge_card"])

    # Bloqueador 8 da 3ª auditoria do PR #97: este texto tem que dizer a
    # VERDADE sobre se uma chamada foi tentada — nunca afirmar "nenhuma
    # chamada externa" quando call_attempted=True. Todo o dicionário aqui
    # já passou por redact_mapping() antes de chegar em render_human(),
    # então response_text/usage são seguros para aparecer.
    L.append("")
    if result_dict.get("call_attempted"):
        L.append(f"**Chamada à Anthropic:** SIM — status da chamada: `{result_dict.get('call_status')}`.")
        usage = result_dict.get("usage")
        if usage:
            L.append(
                f"**Uso:** {usage.get('input_tokens')} tokens de entrada + "
                f"{usage.get('output_tokens')} de saída  ·  "
                f"**custo estimado:** US$ {usage.get('estimated_cost_usd')}."
            )
        if result_dict.get("response_text"):
            L.append(f"**Resposta (sanitizada):** {result_dict['response_text']}")
    else:
        L.append("**Chamada à Anthropic:** NÃO — nenhuma chamada externa foi tentada nesta execução.")

    L.append("")
    L.append(
        "O Coordinator nunca decide sozinho correção científica, nunca edita "
        "matéria/Supabase/produção e nunca faz merge."
    )
    return "\n".join(L)


def _repo_parts(repo_full_name: str) -> tuple[str | None, str | None]:
    parts = (repo_full_name or "").strip().split("/", 1)
    if len(parts) != 2 or not all(parts):
        return None, None
    return parts[0], parts[1]


def _identity_pr_number(identity: str) -> int | None:
    if not (identity or "").startswith("pr:"):
        return None
    try:
        value = int(identity.split(":", 1)[1])
        return value if value > 0 else None
    except (ValueError, TypeError):
        return None


def _register_observe_errors_best_effort(
    event: Event, data: dict, args: argparse.Namespace,
) -> list[error_registry.ErrorRegistryOutcome]:
    """Issue #130. Observability only; never changes the pipeline result."""
    if not getattr(args, "error_state_git_remote", None):
        return []
    owner, repo = _repo_parts(args.repo)
    if not owner or not repo:
        return []

    events: list[error_registry.ErrorEvent] = []
    run_id = os.environ.get("GITHUB_RUN_ID")

    if event.raw_type == "GUARD_STATE_CHANGE" and event.payload.get("guard_state") == "failure":
        pr_number = _identity_pr_number(event.identity)
        audit_pack = event.payload.get("audit_pack")
        audit_pack = audit_pack if isinstance(audit_pack, dict) else {}
        scope = audit_pack.get("escopo_declarado")
        scope = scope if isinstance(scope, dict) else {}
        task_from_pack = scope.get("tarefa")
        evidence = json.dumps(audit_pack, ensure_ascii=False, sort_keys=True)
        events.append(error_registry.ErrorEvent(
            component="guard",
            error_type="hard-fail",
            title="Repasso Guard encontrou HARD FAIL",
            message=f"Repasso Guard HARD FAIL em {event.identity}.",
            severity="HIGH",
            category="guard",
            source="repasso-guard",
            # workflow_dispatch do Guard pode nao carregar pull_requests
            # no webhook. O audit-pack confiavel traz a tarefa/HEAD reais.
            task_id=(str(task_from_pack).strip() if task_from_pack else event.identity),
            pr_number=pr_number,
            commit_sha=(audit_pack.get("head") or event.payload.get("head_sha")),
            run_id=event.payload.get("guard_run_id") or run_id,
            evidence=evidence,
        ))

    call_status = data.get("call_status")
    if data.get("call_attempted") and call_status == "error":
        events.append(error_registry.ErrorEvent(
            component="anthropic-api",
            error_type="transport-error",
            title="Chamada Anthropic falhou",
            message=f"Anthropic falhou no evento {event.identity}.",
            severity="HIGH",
            category="anthropic-api",
            source="coordinator",
            task_id=event.identity,
            run_id=run_id,
            evidence=str(data.get("reason") or ""),
        ))
    elif call_status == "ok_ledger_failed":
        events.append(error_registry.ErrorEvent(
            component="coordinator",
            error_type="anthropic-ledger-failed",
            title="Ledger Anthropic nao persistiu custo",
            message=f"Ledger Anthropic falhou apos chamada paga no evento {event.identity}.",
            severity="HIGH",
            category="workflow",
            source="coordinator",
            task_id=event.identity,
            run_id=run_id,
            evidence=str(data.get("reason") or ""),
        ))

    if data.get("openai_ledger_failed"):
        events.append(error_registry.ErrorEvent(
            component="openai-auditor",
            error_type="ledger-failed",
            title="Ledger do OpenAI Auditor nao persistiu custo",
            message=f"Ledger OpenAI falhou no evento {event.identity}.",
            severity="HIGH",
            category="openai-auditor",
            source="coordinator",
            task_id=event.identity,
            run_id=run_id,
            evidence=str(data.get("reason") or ""),
        ))

    if (
        event.raw_type == "PR_NEEDS_AUDIT"
        and data.get("audit_decision") == "NEEDS-FIX"
    ):
        events.append(error_registry.ErrorEvent(
            component="coordinator-audit",
            error_type="semantic-needs-fix",
            title="Auditoria semantica encontrou correcao necessaria",
            message=f"Auditoria independente marcou {event.identity} como NEEDS-FIX.",
            severity="MEDIUM",
            category="content",
            source="coordinator-audit",
            task_id=event.identity,
            pr_number=_identity_pr_number(event.identity),
            run_id=run_id,
            evidence=str(data.get("merge_card") or data.get("reason") or ""),
        ))

    if data.get("status") == "ERROR":
        events.append(error_registry.ErrorEvent(
            component="coordinator",
            error_type="internal-error",
            title="Coordinator terminou em ERROR",
            message=str(data.get("reason") or "Coordinator terminou em ERROR."),
            severity="CRITICAL",
            category="coordinator",
            source="coordinator",
            task_id=event.identity,
            run_id=run_id,
            evidence=str(data.get("reason") or ""),
        ))

    outcomes: list[error_registry.ErrorRegistryOutcome] = []
    for error_event in events:
        outcome = error_registry.register_best_effort(
            error_event,
            state_git_remote=args.error_state_git_remote,
            owner=owner,
            repo=repo,
            state_branch=args.error_state_git_branch,
        )
        outcomes.append(outcome)
        print("ERROR-REGISTRY " + json.dumps(outcome.to_dict(), ensure_ascii=False))
    return outcomes


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="repasso-coordinator", description="Coordinator V2 — modo OBSERVE.")
    ap.add_argument("--event", required=True,
                    help="arquivo JSON do evento (formato interno, ou o payload cru do "
                         "GitHub quando --github-event-name é usado)")
    ap.add_argument("--github-event-name", default=None,
                    help="nome do evento do GitHub Actions (issue_comment, workflow_run — "
                         "'pull_request' foi removido na 3ª auditoria do PR #97 por segurança: "
                         "não pode segurar segredo num evento que roda código do HEAD de um PR) "
                         "— quando presente, --event é lido como o payload cru de "
                         "$GITHUB_EVENT_PATH, não o formato interno")
    ap.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""),
                    help="owner/repo — só usado junto com --github-event-name")
    ap.add_argument("--dedup-store", default=None,
                    help="arquivo LOCAL para persistir eventos já vistos (não sobrevive entre "
                         "runners efêmeros — prefira --dedup-git-remote no workflow real)")
    ap.add_argument("--dedup-git-remote", default=None,
                    help="remoto git para dedup compartilhado entre execuções independentes "
                         "(bloqueador 2 — ver coordinator/git_state.py)")
    ap.add_argument("--dedup-git-branch", default="coordinator-state-dedup",
                    help="branch dedicada para o estado de dedup (nunca 'main')")
    ap.add_argument("--usage-ledger", default=".coordinator-state/usage.json",
                    help="arquivo LOCAL de uso/custo (não sobrevive entre runners efêmeros — "
                         "prefira --usage-git-remote no workflow real)")
    ap.add_argument("--usage-git-remote", default=None,
                    help="remoto git para o ledger de uso/custo compartilhado entre execuções")
    ap.add_argument("--usage-git-branch", default="coordinator-state-usage",
                    help="branch dedicada para o ledger de uso (nunca 'main')")
    ap.add_argument("--workers", default=None, help="arquivo JSON com o registro de workers (#82) — formato fixture")
    ap.add_argument("--workers-from-tasks-json", default=None,
                    help="deriva o registro REAL de workers a partir de coordination/tasks.json "
                         "(bloqueador 4 da 3ª auditoria) — usar no workflow real; tem precedência "
                         "sobre --workers quando os dois são passados")
    ap.add_argument("--pr-info-file", default=None,
                    help="JSON com number/title/body/labels/updated_at da PR associada ao "
                         "workflow_run observado, lido por um passo do workflow via API "
                         "somente-leitura (bloqueador 1 da 3ª auditoria) — nunca do HEAD do PR")
    ap.add_argument("--guard-audit-pack", default=None,
                    help="caminho do audit-pack real do Guard (baixado do artifact do run "
                         "observado — bloqueador 5 da 3ª auditoria); mesmo schema que "
                         "tools/qa/guard/__main__.py grava")
    ap.add_argument("--pr-diff-file", default=None,
                    help="V3 (correção B2 da auditoria independente do PR #104): arquivo de TEXTO "
                         "(não JSON) com o diff/patch real da PR, buscado por um passo do workflow "
                         "via API somente-leitura da branch confiável — nunca do HEAD do PR. É a "
                         "evidência principal da auditoria semântica; sem ele, MERGE-READY é "
                         "bloqueado deterministicamente (ver coordinator/merge_card.py::"
                         "aplicar_gate_diff)")
    ap.add_argument("--pr-head-files-manifest", default=None,
                    help="manifesto JSON dos arquivos de matéria da PR no HEAD (conteúdo completo, "
                         "baixado pelo workflow via API somente-leitura). Usado só para a evidência "
                         "de preservação da auditoria semântica; nunca executado")
    ap.add_argument("--worker-state-store", default=None,
                    help="arquivo LOCAL para o Worker Registry OPERACIONAL (rodada 3, Issue #99, "
                         "achado B3) — separado de coordination/tasks.json; não sobrevive entre "
                         "runners efêmeros (prefira --worker-state-git-remote no workflow real)")
    ap.add_argument("--worker-state-git-remote", default=None,
                    help="remoto git para o Worker Registry operacional compartilhado entre "
                         "execuções independentes — mesmo padrão de --dedup-git-remote/"
                         "--usage-git-remote")
    ap.add_argument("--worker-state-git-branch", default=DEFAULT_STATE_BRANCH,
                    help="branch dedicada para o Worker Registry operacional (nunca 'main')")
    ap.add_argument("--error-state-git-remote", default=None,
                    help="Issue #130: remoto git do Error Registry; usa branch dedicada "
                         "coordinator-state-errors e nunca escreve na main")
    ap.add_argument("--error-state-git-branch", default=error_registry.DEFAULT_ERROR_STATE_BRANCH,
                    help="branch dedicada do Error Registry (nunca main/master)")
    ap.add_argument("--runner-repo-dir", default=None,
                    help="Achado F7-A (Issue #105, Fase F, 6ª rodada): checkout já confiável (branch "
                         "padrão, nunca HEAD de PR) usado quando um comando SET_AVAILABLE reconhecido "
                         "na Inbox (#88) dispara uma retomada real (coordinator.worker_commands."
                         "aplicar_comando -> runner_resume.processar_retorno_de_worker) — mesmo "
                         "checkout que --repo-dir já significa em runner_dispatch.py. Opcional: sem "
                         "ele, nenhuma retomada automática é tentada (comportamento inalterado, "
                         "retrocompatível). runner_tasks_json_path reusa --workers-from-tasks-json (o "
                         "mesmo coordination/tasks.json, nunca um segundo arquivo) e "
                         "runner_state_git_remote reusa --worker-state-git-remote (o mesmo remoto do "
                         "Worker Registry — as branches coordinator-state-handoff/coordinator-state-"
                         "usage vivem nele também, só em branches dedicadas diferentes) — nenhum "
                         "parâmetro novo precisa ser duplicado para isto funcionar.")
    ap.add_argument("--openai-usage-ledger", default=".coordinator-state/usage-openai.json",
                    help="arquivo LOCAL de uso/custo do OpenAI Auditor (Issue #106) — SEPARADO do "
                         "ledger da Anthropic (--usage-ledger); não sobrevive entre runners "
                         "efêmeros (prefira --openai-usage-git-remote no workflow real)")
    ap.add_argument("--openai-usage-git-remote", default=None,
                    help="remoto git para o ledger de uso/custo do OpenAI Auditor, compartilhado "
                         "entre execuções — mesmo padrão de --usage-git-remote, mas numa branch "
                         "própria (nunca a mesma branch/arquivo do ledger Anthropic)")
    ap.add_argument("--openai-usage-git-branch", default="coordinator-state-usage-openai",
                    help="branch dedicada para o ledger de uso do OpenAI Auditor (nunca 'main', "
                         "nunca a mesma branch do ledger Anthropic)")
    ap.add_argument("--out", default=None, help="onde gravar o resultado OBSERVE em JSON")
    ap.add_argument("--comment-out", default=None,
                    help="V3 (Issue #99): quando o Coordinator roda em MODE=active-supervised e a "
                         "auditoria semântica produziu um Cartão de Merge (ObserveResult.merge_card), "
                         "grava o texto aqui para um passo do workflow publicar como comentário no "
                         "PR/Issue via github-script — o CLI nunca chama a API do GitHub sozinho. "
                         "Não grava nada quando não há merge_card (ex.: modo observe, ou evento que "
                         "não passou pela auditoria)")
    ap.add_argument("--comment-target-out", default=None,
                    help="V3 (correção B4 da auditoria independente do PR #104, rodada 4): grava só o "
                         "número da issue/PR de destino do comentário (ObserveResult."
                         "comment_target_issue) — nunca escrito junto com --comment-out se o destino "
                         "for desconhecido. O workflow lê este arquivo em vez de inferir o destino "
                         "sozinho (ex.: um POOL-PAUSADO sempre vai para a Inbox #88, mesmo quando o "
                         "checkpoint que o disparou chegou em outra issue)")
    a = ap.parse_args(argv)

    # Item 2 do "PACOTE CONSOLIDADO" (PR #97): tudo que pode lançar —
    # carregar evento/config, montar dedup/ledger/workers, chamar
    # observe() — fica dentro deste try. Antes, uma exceção não tratada
    # (ex.: GitJsonStore esgotando tentativas de publicar o estado)
    # derrubava o processo ANTES de qualquer coisa ser escrita em --out,
    # e actions/upload-artifact@v4 (if-no-files-found: ignore) publicava
    # nada — o job ficava vermelho (correto), mas sem nenhum artifact
    # estruturado. Agora, qualquer exceção vira um resultado ERROR
    # sanitizado, gravado em --out exatamente como um resultado normal
    # seria, e SÓ DEPOIS o processo sai com código != 0.
    try:
        dados_sanitizados = _observar(a)
    except SystemExit:
        raise
    except BaseException as exc:  # noqa: BLE001 — ponto de borda deliberado: qualquer
        # falha vira artifact sanitizado antes do processo sair, nunca um crash mudo.
        dados_sanitizados = _resultado_de_erro(exc)
        if a.error_state_git_remote:
            owner, repo = _repo_parts(a.repo)
            if owner and repo:
                item = error_registry.register_best_effort(
                    error_registry.ErrorEvent(
                        component="coordinator",
                        error_type="unexpected-exception",
                        title="Excecao inesperada no Coordinator",
                        message=redact(f"{type(exc).__name__}: {exc}"),
                        severity="CRITICAL",
                        category="coordinator",
                        source="coordinator",
                        run_id=os.environ.get("GITHUB_RUN_ID"),
                        evidence=redact(f"{type(exc).__name__}: {exc}"),
                    ),
                    state_git_remote=a.error_state_git_remote,
                    owner=owner,
                    repo=repo,
                    state_branch=a.error_state_git_branch,
                )
                print("ERROR-REGISTRY " + json.dumps(item.to_dict(), ensure_ascii=False))
        print(render_human(dados_sanitizados))
        if a.out:
            _gravar_out(a.out, dados_sanitizados)
        if a.comment_out:
            _gravar_comment_out(a.comment_out, dados_sanitizados)
        if a.comment_target_out:
            _gravar_comment_target_out(a.comment_target_out, dados_sanitizados)
        return 1

    if dados_sanitizados is None:
        # _observar() já imprimiu a mensagem "nada a fazer" e não tem
        # ObserveResult nenhum para gravar (evento do GitHub fora da
        # lista reconhecida) — comportamento inalterado desta rodada.
        return 0

    print(render_human(dados_sanitizados))
    if a.out:
        _gravar_out(a.out, dados_sanitizados)
    if a.comment_out:
        _gravar_comment_out(a.comment_out, dados_sanitizados)
    if a.comment_target_out:
        _gravar_comment_target_out(a.comment_target_out, dados_sanitizados)

    # Auditoria final do PR #97: uma chamada à Anthropic bem-sucedida cujo
    # ledger de uso/custo falhou DEPOIS é um problema operacional real —
    # perde persistência compartilhada de custo entre execuções, mesma
    # classe de risco que uma exceção não tratada (bloqueador 7: erro >
    # job vermelho). observe() já devolveu um ObserveResult honesto
    # (call_attempted=True, usage preservado, nada de exceção) em vez de
    # deixar isto virar um crash mudo — mas o sinal externo (workflow
    # vermelho) continua merecido, então checa aqui, sem reabrir a
    # arquitetura de ObserveResult/render_human.
    #
    # Correção B3 da auditoria independente do PR #107: mesma lógica para
    # o ledger do OpenAI Auditor — uma chamada PAGA cuja correção de custo
    # não persistiu é um problema operacional equivalente, nunca um
    # "ok_ledger_failed" silencioso que só aparece no texto do cartão.
    if dados_sanitizados.get("call_status") == "ok_ledger_failed" or dados_sanitizados.get("openai_ledger_failed"):
        return 1
    return 0


def _observar(a: argparse.Namespace) -> dict | None:
    """A execução real de ponta a ponta — extraída de ``main()`` para que
    o ``try/except`` do item 2 cubra exatamente isto, sem duplicar a
    lógica de parsing de argumentos. Devolve ``None`` só no caso "evento
    do GitHub não reconhecido" (não é erro, não tem ObserveResult)."""
    config = Config.from_env()

    if a.github_event_name:
        event = _load_github_event(a.event, a.github_event_name, a.repo,
                                    pr_info_file=a.pr_info_file,
                                    guard_audit_pack=a.guard_audit_pack,
                                    pr_diff_file=a.pr_diff_file,
                                    pr_head_files_manifest=a.pr_head_files_manifest)
        if event is None:
            print(
                f"# Repasso Coordinator · OBSERVE\n\n"
                f"Evento do GitHub ({a.github_event_name!r}) não corresponde a nenhum tipo "
                "que esta V2 reconhece — nada a fazer. Isto NÃO é um erro."
            )
            return None
    else:
        event = _load_event(a.event)

    if a.dedup_git_remote:
        dedup = Deduplicator(GitDedupStore(GitJsonStore(a.dedup_git_remote, branch=a.dedup_git_branch)))
    else:
        dedup = Deduplicator(FileStore(a.dedup_store) if a.dedup_store else None)

    if a.usage_git_remote:
        ledger = GitUsageLedger(GitJsonStore(a.usage_git_remote, branch=a.usage_git_branch))
    else:
        ledger = UsageLedger(a.usage_ledger)

    if a.workers_from_tasks_json:
        workers = load_workers_from_tasks_json(a.workers_from_tasks_json)
    else:
        workers = _load_workers(a.workers)

    if a.worker_state_git_remote:
        # Worker Registry operacional: usa o MESMO arquivo canônico do
        # bootstrap do canário e do Runner Dispatch. GitJsonStore já usa
        # "state.json" por default; não sobrescrever com outro nome aqui,
        # senão os workflows enxergam registros diferentes na mesma branch.
        worker_registry = OperationalWorkerRegistry(
            GitJsonStore(a.worker_state_git_remote, branch=a.worker_state_git_branch)
        )
    else:
        worker_registry = OperationalWorkerRegistry(LocalJsonWorkerStateStore(a.worker_state_store))

    # OpenAI Auditor (Issue #106): portão/config lidos do ambiente sempre
    # (mesmo padrão de Config.from_env() acima) — ``OpenAIAuditorConfig.
    # enabled`` continua ``False`` enquanto a Variable
    # REPASSO_OPENAI_AUDITOR_ENABLED não for exatamente "true" (produção
    # hoje), então injetar isto aqui é estruturalmente inerte até José
    # decidir ligar. O ledger é SEMPRE um armazenamento SEPARADO do
    # ledger Anthropic — nunca o mesmo arquivo/branch.
    openai_config = OpenAIAuditorConfig.from_env()
    if a.openai_usage_git_remote:
        openai_ledger = GitUsageLedger(
            GitJsonStore(a.openai_usage_git_remote, branch=a.openai_usage_git_branch)
        )
    else:
        openai_ledger = UsageLedger(a.openai_usage_ledger)

    resultado = observe(
        event, config=config, dedup=dedup, ledger=ledger, workers=workers,
        audit_mode=config.is_active_supervised, worker_registry=worker_registry,
        openai_config=openai_config, openai_ledger=openai_ledger,
        # Achado F7-A (6ª rodada): liga o caminho REAL até
        # worker_commands.aplicar_comando — workflow -> CLI -> _observar()
        # -> observe() -> Inbox -> aplicar_comando(). Reusa os mesmos
        # parâmetros já existentes (--workers-from-tasks-json,
        # --worker-state-git-remote) em vez de inventar um segundo
        # mecanismo; RunnerDispatchConfig.from_env() é a MESMA construção
        # que runner_dispatch.py::main() já faz (só lê o ambiente, sem
        # I/O) — inerte até os 3 portões (ENABLED/MODE/CANARY_TASK_ID)
        # abrirem, então é seguro passá-la sempre.
        runner_tasks_json_path=a.workers_from_tasks_json,
        runner_repo_dir=a.runner_repo_dir,
        runner_dispatch_config=RunnerDispatchConfig.from_env(),
        runner_state_git_remote=a.worker_state_git_remote,
    )
    dados = redact_mapping(resultado.to_dict())
    _register_observe_errors_best_effort(event, dados, a)
    return dados


if __name__ == "__main__":
    sys.exit(main())
