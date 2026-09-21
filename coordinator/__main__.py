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

    python3 -m coordinator --github-event-name pull_request \\
        --event "$GITHUB_EVENT_PATH" --repo "$GITHUB_REPOSITORY" \\
        --dedup-git-remote "$(git remote get-url origin)" \\
        --usage-git-remote "$(git remote get-url origin)" \\
        --out /tmp/coordinator-observe.json

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
from .worker_registry import Worker, WorkerState


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


def _load_github_event(path: str, event_name: str, repo: str) -> Event | None:
    with open(path, encoding="utf-8") as fh:
        payload = json.load(fh)
    return build_event_from_github_context(event_name, payload, repo)


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
    L.append("")
    L.append(
        "O Coordinator nunca decide sozinho correção científica, nunca edita "
        "matéria/Supabase/produção e nunca faz merge. Esta execução não fez "
        f"nenhuma chamada externa (call_attempted={result_dict.get('call_attempted')})."
    )
    return "\n".join(L)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="repasso-coordinator", description="Coordinator V2 — modo OBSERVE.")
    ap.add_argument("--event", required=True,
                    help="arquivo JSON do evento (formato interno, ou o payload cru do "
                         "GitHub quando --github-event-name é usado)")
    ap.add_argument("--github-event-name", default=None,
                    help="nome do evento do GitHub Actions (pull_request, issue_comment, "
                         "workflow_run) — quando presente, --event é lido como o payload "
                         "cru de $GITHUB_EVENT_PATH, não o formato interno")
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
    ap.add_argument("--workers", default=None, help="arquivo JSON com o registro de workers (#82)")
    ap.add_argument("--out", default=None, help="onde gravar o resultado OBSERVE em JSON")
    a = ap.parse_args(argv)

    config = Config.from_env()

    if a.github_event_name:
        event = _load_github_event(a.event, a.github_event_name, a.repo)
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
