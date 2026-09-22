"""Achado F7-A (Issue #105, Fase F, 6ª rodada): liga o caminho REAL até o
comando ``SET_AVAILABLE`` da Inbox (#88) poder disparar uma retomada de
verdade — ``coordinator.__main__.main()``/``_observar()`` agora repassam
``--workers-from-tasks-json``/``--worker-state-git-remote`` (já
existentes) e ``--runner-repo-dir`` (novo) para ``observe()``.

A 5ª rodada (``test_observe_runner_wiring.py``) só provou a fiação a
partir de ``observe()`` diretamente — a auditoria pediu explicitamente um
teste que comece pelo CLI/``_observar()``, nunca chamando ``observe()``
diretamente, porque é exatamente essa camada (CLI -> ``_observar()`` ->
``observe()``) que ficou faltando antes desta correção. Este teste chama
``coordinator.__main__.main(argv)`` — o mesmo ponto de entrada que o
workflow real invoca — no MESMO processo (sem subprocess, mesmo padrão de
``test_cli_crash_safety.py``).

Cenário deliberadamente simples (tarefa original já DONE -> próxima
oferta): não precisa de nenhum registro de handoff real nem de checkpoint
git — o objetivo aqui é só provar que os parâmetros chegam até
``worker_commands.aplicar_comando`` através do CLI, não redecidir a
lógica de retomada em si (já exaustivamente coberta por
``test_worker_commands.py``/``test_runner_resume.py``).

Deliberadamente NÃO registrado em ``coordinator/tests/run_all.py`` nesta
rodada (mesma decisão operacional já aplicada às Fases B/C/D/F) — roda
standalone via ``python3 -m coordinator.tests.test_cli_runner_wiring``.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator.__main__ import main as cli_main
from coordinator.worker_ops import WorkerRecord


def _escrever_evento(tmp: str, corpo: str) -> str:
    caminho = os.path.join(tmp, "evento.json")
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump(
            {
                "raw_type": "INBOX_COMMENT",
                "source": "fixture",
                "repo": "Repassomed/Repasso-Med-Site-",
                "identity": "issue:88#comment:1",
                "payload": {"body": corpo, "dedup_fields": {"comment_id": 1}},
            },
            fh,
        )
    return caminho


def _escrever_tasks_json(tmp: str, tarefas: list[dict]) -> str:
    caminho = os.path.join(tmp, "tasks.json")
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump({"tarefas": tarefas}, fh)
    return caminho


def _escrever_worker_state(tmp: str, workers: list[WorkerRecord]) -> str:
    caminho = os.path.join(tmp, "workers.json")
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump({"workers": [w.to_dict() for w in workers]}, fh)
    return caminho


def test_cli_runner_wiring_seta_available_e_oferece_proxima_tarefa() -> None:
    """Ponta a ponta a partir do CLI: main(argv) -> _observar() ->
    observe() -> Inbox reconhece "Claude 2 voltou" -> aplicar_comando()
    (SET_AVAILABLE) realmente reage — tarefa original já DONE, então o
    caminho de "próxima oferta" é disparado (nunca uma retomada
    executada), mas a REAÇÃO em si (achado F7-A) só acontece porque o CLI
    repassou --workers-from-tasks-json/--worker-state-store até
    observe()."""
    with tempfile.TemporaryDirectory() as tmp:
        caminho_evento = _escrever_evento(tmp, "Claude 2 voltou")
        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-original", "estado": "DONE", "area": "infra", "agente": "claude-2"},
            {"id": "t-seguinte", "estado": "READY", "area": "infra", "agente": None},
        ])
        worker_state_path = _escrever_worker_state(tmp, [
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-original", can_execute=True,
            ),
        ])
        caminho_out = os.path.join(tmp, "coordinator-observe.json")

        os.environ["REPASSO_COORDINATOR_ENABLED"] = "true"
        os.environ["REPASSO_COORDINATOR_MODE"] = "active-supervised"
        try:
            codigo = cli_main([
                "--event", caminho_evento,
                "--dedup-store", os.path.join(tmp, "dedup.json"),
                "--usage-ledger", os.path.join(tmp, "usage.json"),
                "--workers-from-tasks-json", tasks_path,
                "--worker-state-store", worker_state_path,
                "--runner-repo-dir", tmp,
                "--out", caminho_out,
            ])
        finally:
            os.environ.pop("REPASSO_COORDINATOR_ENABLED", None)
            os.environ.pop("REPASSO_COORDINATOR_MODE", None)

        assert codigo == 0, "CLI não deveria falhar neste cenário"
        with open(caminho_out, encoding="utf-8") as fh:
            dados = json.load(fh)
        assert dados["status"] == "OBSERVED", dados
        assert "marcado como AVAILABLE" in dados["merge_card"], dados["merge_card"]
        # Achado F7-A: a prova de que a reação REAL aconteceu (não só o
        # reconhecimento do comando) — "Próxima oferta da fila" só
        # aparece quando aplicar_comando() de fato chamou
        # reagir_a_retorno_de_worker, o que só acontece quando o CLI
        # repassou runner_tasks_json_path até observe().
        assert "Próxima oferta da fila" in dados["merge_card"], dados["merge_card"]

        with open(worker_state_path, encoding="utf-8") as fh:
            estado_final = json.load(fh)
        worker_final = next(w for w in estado_final["workers"] if w["worker_id"] == "claude-2")
        assert worker_final["status"] == "AVAILABLE"
        assert worker_final["current_task"] is None
    print("OK  test_cli_runner_wiring_seta_available_e_oferece_proxima_tarefa")


def test_cli_sem_runner_repo_dir_nao_quebra_comportamento_antigo() -> None:
    """Retrocompatibilidade: sem --runner-repo-dir, runner_repo_dir=None
    chega em observe() — mas runner_tasks_json_path ainda vem de
    --workers-from-tasks-json (sempre repassado, achado F7-A). Para um
    cenário de "próxima oferta" isso não importa (nunca precisa de
    repo_dir) — a reação continua acontecendo; só um caminho que
    precisasse despachar um api_runner de verdade exigiria repo_dir."""
    with tempfile.TemporaryDirectory() as tmp:
        caminho_evento = _escrever_evento(tmp, "Claude 2 voltou")
        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-original", "estado": "DONE", "area": "infra", "agente": "claude-2"},
        ])
        worker_state_path = _escrever_worker_state(tmp, [
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-original", can_execute=True,
            ),
        ])
        caminho_out = os.path.join(tmp, "coordinator-observe.json")

        os.environ["REPASSO_COORDINATOR_ENABLED"] = "true"
        os.environ["REPASSO_COORDINATOR_MODE"] = "active-supervised"
        try:
            codigo = cli_main([
                "--event", caminho_evento,
                "--dedup-store", os.path.join(tmp, "dedup.json"),
                "--usage-ledger", os.path.join(tmp, "usage.json"),
                "--workers-from-tasks-json", tasks_path,
                "--worker-state-store", worker_state_path,
                "--out", caminho_out,
            ])
        finally:
            os.environ.pop("REPASSO_COORDINATOR_ENABLED", None)
            os.environ.pop("REPASSO_COORDINATOR_MODE", None)

        assert codigo == 0
        with open(caminho_out, encoding="utf-8") as fh:
            dados = json.load(fh)
        assert "Próxima oferta da fila" in dados["merge_card"], dados["merge_card"]
    print("OK  test_cli_sem_runner_repo_dir_nao_quebra_comportamento_antigo")


def main() -> int:
    testes = [
        test_cli_runner_wiring_seta_available_e_oferece_proxima_tarefa,
        test_cli_sem_runner_repo_dir_nao_quebra_comportamento_antigo,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except Exception as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
