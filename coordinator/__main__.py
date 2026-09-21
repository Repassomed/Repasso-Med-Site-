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
        --out /tmp/coordinator-observe.json

   ``--pr-info-file``/``--guard-audit-pack`` são opcionais e vêm de passos
   do workflow que leem a PR e baixam o artifact do Guard (bloqueadores 1
   e 5 da 3ª auditoria) — nunca de código do HEAD do PR.

Persistência entre execuções independentes (bloqueador 2): ``--dedup-store``/
``--usage-ledger`` continuam sendo arquivo local (default, preserva o
comportamento já testado); ``--dedup-git-remote``/``--usage-git-remote``
trocam para o backend compartilhado via git (``coordinator/git_state.py``)
— use estes no workflow real, onde cada execução é um runner efêmero
diferente.

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

from .budget import UsageLedger
from .config import Config
from .dedup import Deduplicator, FileStore
from .events import Event
from .git_state import GitDedupStore, GitJsonStore, GitUsageLedger
from .github_event import build_event_from_github_context
from .observe import observe
from .redact import redact_mapping
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


def _load_github_event(path: str, event_name: str, repo: str, *,
                        pr_info_file: str | None = None,
                        guard_audit_pack: str | None = None) -> Event | None:
    with open(path, encoding="utf-8") as fh:
        payload = json.load(fh)
    pr_info = _load_json_if_exists(pr_info_file)
    audit_pack = _load_json_if_exists(guard_audit_pack)
    return build_event_from_github_context(event_name, payload, repo,
                                            pr_info=pr_info, audit_pack=audit_pack)


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
    ap.add_argument("--out", default=None, help="onde gravar o resultado OBSERVE em JSON")
    a = ap.parse_args(argv)

    config = Config.from_env()

    if a.github_event_name:
        event = _load_github_event(a.event, a.github_event_name, a.repo,
                                    pr_info_file=a.pr_info_file,
                                    guard_audit_pack=a.guard_audit_pack)
        if event is None:
            print(
                f"# Repasso Coordinator · OBSERVE\n\n"
                f"Evento do GitHub ({a.github_event_name!r}) não corresponde a nenhum tipo "
                "que esta V2 reconhece — nada a fazer. Isto NÃO é um erro."
            )
            return 0
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

    resultado = observe(event, config=config, dedup=dedup, ledger=ledger, workers=workers)
    dados = resultado.to_dict()
    dados_sanitizados = redact_mapping(dados)

    print(render_human(dados_sanitizados))

    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)) or ".", exist_ok=True)
        with open(a.out, "w", encoding="utf-8") as fh:
            json.dump(dados_sanitizados, fh, ensure_ascii=False, indent=2)

    return 0


if __name__ == "__main__":
    sys.exit(main())
