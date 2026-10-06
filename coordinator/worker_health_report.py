"""Relatório READ-ONLY de workers ATIVOS sem heartbeat recente.

Achado da auditoria black-box pós-#245 (Claude 4): ``heartbeat.avaliar_stale``
foi implementada e testada (Issue #105 Fase B, item 4: "não presumir
automaticamente LIMIT/OFFLINE; apenas sinalizar stale") mas nenhum caminho de
produção a chamava — o sinal existia por worker, isolado, sem nenhum lugar
que agregasse "quais workers precisam de atenção humana agora". Um worker
``BUSY``/``NEAR_LIMIT``/``LIMIT`` cujo heartbeat parou (crash, runner morto,
canário nunca desligado) ficava invisível indefinidamente: nada o exclui do
registro nem o sinaliza a ninguém.

Este módulo NÃO resolve isso sozinho — não muda status, não libera worker,
não decide handoff, nunca escreve em ``coordinator-state-workers`` nem em
``coordination/tasks.json``. Ele só LÊ o Worker Registry operacional
(``coordinator.worker_ops.OperationalWorkerRegistry``) e imprime, em
Markdown, quais workers ativos estão com heartbeat velho — para um humano
(ou o próximo comando ``SET_AVAILABLE``/``SET_LIMIT`` de ``worker_commands``)
agir. Zero chamada Anthropic/OpenAI, zero escrita, zero merge/deploy.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone

from .git_state import GitJsonStore
from .heartbeat import DEFAULT_STALE_THRESHOLD, workers_desatualizados
from .worker_ops import DEFAULT_STATE_BRANCH, OperationalWorkerRegistry, WorkerRecord


def render_markdown(achados: list, *, agora: datetime, limite_segundos: int) -> str:
    """``achados`` é a saída de ``heartbeat.workers_desatualizados`` —
    lista de ``(WorkerRecord, StaleCheck)``. Função PURA, sem I/O."""
    linhas = [
        "## Repasso Coordinator — heartbeat de workers ativos",
        "",
        f"Verificado em {agora.isoformat()} · limite de staleness: {limite_segundos}s "
        f"({limite_segundos // 60} min).",
        "",
    ]
    if not achados:
        linhas.append(
            "🟢 Nenhum worker BUSY/NEAR_LIMIT/LIMIT com heartbeat velho encontrado."
        )
        return "\n".join(linhas) + "\n"

    linhas.append(
        f"🟡 {len(achados)} worker(es) ativo(s) sem heartbeat recente — "
        "revisão humana recomendada (nenhuma ação automática foi tomada)."
    )
    linhas.append("")
    linhas.append("| worker | status | tarefa | branch | último heartbeat | motivo |")
    linhas.append("|---|---|---|---|---|---|")
    for worker, checagem in achados:
        linhas.append(
            "| {worker_id} ({display_name}) | {status} | {task} | {branch} | {hb} | {motivo} |".format(
                worker_id=worker.worker_id,
                display_name=worker.display_name,
                status=worker.status,
                task=worker.current_task or "—",
                branch=worker.branch or "—",
                hb=worker.last_heartbeat or "nunca",
                motivo=checagem.reason,
            )
        )
    linhas.append("")
    linhas.append(
        "Este relatório é somente leitura: não muda status de worker, não libera "
        "tarefa/arquivo reservado e não decide handoff — isso continua exigindo "
        "um comando explícito (`SET_AVAILABLE`/`SET_LIMIT`, Issue #99) ou "
        "correção manual do José."
    )
    return "\n".join(linhas) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        prog="repasso-worker-health",
        description="Relatório read-only de workers ativos com heartbeat velho.",
    )
    ap.add_argument(
        "--worker-state-git-remote", required=True,
        help="mesmo remoto git usado por --worker-state-git-remote do Coordinator principal",
    )
    ap.add_argument(
        "--worker-state-git-branch", default=DEFAULT_STATE_BRANCH,
        help="branch dedicada do Worker Registry operacional (default: coordinator-state-workers)",
    )
    ap.add_argument(
        "--stale-minutes", type=int, default=int(DEFAULT_STALE_THRESHOLD.total_seconds() // 60),
        help="minutos sem heartbeat para um worker ativo ser considerado stale",
    )
    ap.add_argument("--out", default=None, help="onde gravar o Markdown (default: stdout)")
    a = ap.parse_args(argv)

    store = GitJsonStore(remote=a.worker_state_git_remote, branch=a.worker_state_git_branch)
    registry = OperationalWorkerRegistry(store)
    workers: list[WorkerRecord] = registry.list_workers()

    agora = datetime.now(timezone.utc)
    limite = DEFAULT_STALE_THRESHOLD.__class__(minutes=a.stale_minutes)
    achados = workers_desatualizados(workers, agora=agora, limite=limite)

    texto = render_markdown(achados, agora=agora, limite_segundos=int(limite.total_seconds()))
    if a.out:
        with open(a.out, "w", encoding="utf-8") as fh:
            fh.write(texto)
    else:
        sys.stdout.write(texto)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
