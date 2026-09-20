"""CLI do Repasso Coordinator V2 — modo OBSERVE.

Uso:

    python3 -m coordinator --event evento.json \\
        --dedup-store /tmp/coordinator-seen.json \\
        --usage-ledger /tmp/coordinator-usage.json \\
        --workers workers.json \\
        --out /tmp/coordinator-observe.json

``evento.json`` é um JSON com os mesmos campos de ``events.Event``:
``{"raw_type": "...", "source": "...", "repo": "...", "identity": "...",
"payload": {...}}``.

Este CLI nunca faz chamada de rede. Toda a segurança de "não chamar API
paga" está em ``coordinator/config.py`` (o portão) e em
``coordinator/anthropic_client.py`` (nenhum Transport real é injetado
aqui) — não neste arquivo. Ele só monta o evento, roda o pipeline e
imprime/grava o resultado.
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
    ap.add_argument("--event", required=True, help="arquivo JSON do evento")
    ap.add_argument("--dedup-store", default=None, help="arquivo JSON para persistir eventos já vistos")
    ap.add_argument("--usage-ledger", default=".coordinator-state/usage.json",
                    help="arquivo JSON de uso/custo (append-only)")
    ap.add_argument("--workers", default=None, help="arquivo JSON com o registro de workers (#82)")
    ap.add_argument("--out", default=None, help="onde gravar o resultado OBSERVE em JSON")
    a = ap.parse_args(argv)

    config = Config.from_env()
    event = _load_event(a.event)
    dedup = Deduplicator(FileStore(a.dedup_store) if a.dedup_store else None)
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
