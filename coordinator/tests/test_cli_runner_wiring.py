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

Achado F8-A (7ª rodada): ``.github/workflows/coordinator-observe.yml``
agora também disponibiliza ``--runner-repo-dir .`` e as MESMAS 5
Variables/expressões que ``coordinator-runner.yml`` já usa
(``REPASSO_RUNNER_ENABLED``/``MODE``/``CANARY_TASK_ID``/``ACTUAL_REF``/
``EXPECTED_REF``) para o passo que roda o CLI de verdade — a prova
ESTRUTURAL disso (o texto do workflow) está em
``test_workflow_security.py``. ``test_cli_runner_wiring_com_env_do_
workflow_abre_portao_e_despacha_retomada`` (abaixo) é o complemento
FUNCIONAL: reproduz exatamente os mesmos nomes de variável de ambiente e
o mesmo ``--runner-repo-dir`` que o workflow define, chamando
``main(argv)`` — prova que a cadeia workflow -> CLI ->
``RunnerDispatchConfig`` -> retomada de verdade abre o portão do Runner e
dispara uma execução real (``executar_tarefa``: claim atômico, heartbeat
BUSY, tentativa real de geração via ``runner_generate.gerar_patch_via_
claude``). Sem ``ANTHROPIC_API_KEY`` no ambiente de teste (nunca real
rede é alcançada — ``anthropic_transport.AnthropicTransport.send()``
lança ANTES de qualquer chamada quando a chave está ausente), a geração
falha de forma limpa e determinística (``FAILED``) — o que já basta para
provar que a cadeia INTEIRA foi percorrida até o ponto exato onde uma
chamada paga aconteceria.

Deliberadamente NÃO registrado em ``coordinator/tests/run_all.py`` nesta
rodada (mesma decisão operacional já aplicada às Fases B/C/D/F) — roda
standalone via ``python3 -m coordinator.tests.test_cli_runner_wiring``.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator.__main__ import main as cli_main
from coordinator.classify import Priority
from coordinator.git_state import GitJsonStore
from coordinator.handoff_exec import (
    DEFAULT_HANDOFF_STATE_BRANCH,
    HandoffClaimStore,
    HandoffExecutionResult,
    HandoffSource,
    derivar_runner_task_continuacao,
    derivar_task_id_de_continuacao,
)
from coordinator.worker_ops import DEFAULT_STATE_BRANCH, OperationalWorkerRegistry, WorkerRecord


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


# ---------------------------------------------------------------------------
# F8-A: infraestrutura git real (mesmo padrão de test_worker_commands.py) —
# para o cenário funcional workflow -> CLI -> RunnerDispatchConfig ->
# retomada, que precisa de um checkpoint/handoff real de verdade.
# ---------------------------------------------------------------------------

def _criar_remoto_local(tmp: str) -> str:
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para os testes de fiação do workflow/CLI\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    subprocess.run(["git", "-C", remoto, "checkout", "-q", "-b", "bootstrap"], check=True)
    return remoto


def _publicar_branch_com_checkpoint(remoto: str, tmp: str, branch: str, arquivo: str, conteudo: str) -> str:
    workdir = os.path.join(tmp, f"anterior-{branch.replace('/', '-')}")
    subprocess.run(["git", "clone", "-q", remoto, workdir], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.name", "X"], check=True)
    subprocess.run(["git", "-C", workdir, "checkout", "-q", "-b", branch], check=True)
    with open(os.path.join(workdir, arquivo), "w", encoding="utf-8") as fh:
        fh.write(conteudo)
    subprocess.run(["git", "-C", workdir, "add", "-A"], check=True)
    subprocess.run(["git", "-C", workdir, "commit", "-q", "-m", "checkpoint do worker anterior"], check=True)
    subprocess.run(["git", "-C", workdir, "push", "-q", "origin", branch], check=True)
    sha = subprocess.run(
        ["git", "-C", workdir, "rev-parse", "HEAD"], capture_output=True, text=True, check=True
    ).stdout.strip()
    return sha


def _clonar_workdir(tmp: str, remoto: str, nome: str) -> str:
    workdir = os.path.join(tmp, nome)
    subprocess.run(["git", "clone", "-q", remoto, workdir], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.name", "X"], check=True)
    subprocess.run(["git", "-C", workdir, "checkout", "-q", "bootstrap"], check=True)
    return workdir


def _publicar_handoff_real(remoto: str, *, canonical_task_id: str, worker_novo_id: str, branch: str,
                            checkpoint_commit: str) -> None:
    source = HandoffSource(
        branch=branch, allowed_files=("greeting.txt",), risk_level="BAIXO", policy_level="C",
        jose_authorized=False,
    )
    execution_id_anterior = derivar_task_id_de_continuacao(canonical_task_id, checkpoint_commit)
    runner_task = derivar_runner_task_continuacao(
        task_id=execution_id_anterior, priority=Priority.P1, source=source,
        checkpoint_commit=checkpoint_commit,
        instructions="Continuação real de teste (F8-A, fiação workflow/CLI) — escrever em greeting.txt.",
    )
    resultado = HandoffExecutionResult(
        action="HANDOFF_EXECUTED", reason="handoff de teste", task_id=canonical_task_id,
        previous_worker_id="claude-1", new_worker_id=worker_novo_id, new_worker_type="api_runner",
        checkpoint_commit=checkpoint_commit, runner_task=runner_task,
    )
    HandoffClaimStore(GitJsonStore(remote=remoto, branch=DEFAULT_HANDOFF_STATE_BRANCH)).registrar_execucao(resultado)


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


def test_cli_runner_wiring_com_env_do_workflow_abre_portao_e_despacha_retomada() -> None:
    """F8-A: reproduz EXATAMENTE as mesmas 5 variáveis de ambiente e o
    mesmo --runner-repo-dir que coordinator-observe.yml agora define no
    passo real — prova FUNCIONAL de que workflow -> CLI ->
    RunnerDispatchConfig -> retomada abre o portão do Runner e dispara
    uma execução real (claim atômico, heartbeat BUSY, tentativa real de
    geração via runner_generate.gerar_patch_via_claude). Sem
    ANTHROPIC_API_KEY no ambiente de teste, a geração falha de forma
    limpa e determinística (FAILED, zero rede) — o suficiente para provar
    que a cadeia inteira foi percorrida até o ponto onde uma chamada paga
    aconteceria."""
    assert "ANTHROPIC_API_KEY" not in os.environ, (
        "este teste depende de ANTHROPIC_API_KEY ausente para um caminho determinístico, sem rede"
    )
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-f8a", "greeting.txt", "ola\n")
        execution_id = derivar_task_id_de_continuacao("t-f8a", sha)
        _ = execution_id  # id de execução ANTERIOR (handoff) — só para publicar o registro
        _publicar_handoff_real(
            remoto, canonical_task_id="t-f8a", worker_novo_id="claude-2",
            branch="runner/t-f8a", checkpoint_commit=sha,
        )

        tasks_path = _escrever_tasks_json(tmp, [
            {"id": "t-f8a", "estado": "BLOCKED-LIMIT", "area": "infra", "agente": "claude-2"},
        ])

        # file_name="workers.json" precisa bater com o que _observar() usa
        # de verdade (coordinator/__main__.py) — o default de GitJsonStore
        # é "state.json"; sem repetir aqui, este seed iria para um arquivo
        # diferente do que o CLI lê, e o worker "sumiria" (voltaria ao seed
        # default OFFLINE/human_session).
        OperationalWorkerRegistry(
            GitJsonStore(remoto, branch=DEFAULT_STATE_BRANCH, file_name="workers.json")
        ).upsert(
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
                current_task="t-f8a", branch="runner/t-f8a", last_checkpoint=sha, can_execute=True,
            ),
            message="setup",
        )

        caminho_evento = _escrever_evento(tmp, "Claude 2 voltou")
        caminho_out = os.path.join(tmp, "coordinator-observe.json")
        workdir = _clonar_workdir(tmp, remoto, "f8a")
        execution_task_id_esperado = f"t-f8a--resume-{sha[:12]}"

        env_originais = {
            k: os.environ.get(k) for k in (
                "REPASSO_COORDINATOR_ENABLED", "REPASSO_COORDINATOR_MODE",
                "REPASSO_RUNNER_ENABLED", "REPASSO_RUNNER_MODE", "REPASSO_RUNNER_CANARY_TASK_ID",
                "REPASSO_RUNNER_ACTUAL_REF", "REPASSO_RUNNER_EXPECTED_REF",
            )
        }
        # Os MESMOS nomes/expressões que coordinator-observe.yml define no
        # passo "Rodar o Coordinator" (achado F8-A) — REPASSO_RUNNER_
        # ACTUAL_REF/EXPECTED_REF reproduzem github.ref / refs/heads/
        # <default_branch> quando os dois batem (ref_allowed=True).
        os.environ["REPASSO_COORDINATOR_ENABLED"] = "true"
        os.environ["REPASSO_COORDINATOR_MODE"] = "active-supervised"
        os.environ["REPASSO_RUNNER_ENABLED"] = "true"
        os.environ["REPASSO_RUNNER_MODE"] = "canary"
        os.environ["REPASSO_RUNNER_CANARY_TASK_ID"] = execution_task_id_esperado
        os.environ["REPASSO_RUNNER_ACTUAL_REF"] = "refs/heads/main"
        os.environ["REPASSO_RUNNER_EXPECTED_REF"] = "refs/heads/main"
        try:
            codigo = cli_main([
                "--event", caminho_evento,
                "--dedup-store", os.path.join(tmp, "dedup.json"),
                "--usage-ledger", os.path.join(tmp, "usage.json"),
                "--workers-from-tasks-json", tasks_path,
                "--worker-state-git-remote", remoto,
                "--runner-repo-dir", workdir,
                "--out", caminho_out,
            ])
        finally:
            for chave, valor in env_originais.items():
                if valor is None:
                    os.environ.pop(chave, None)
                else:
                    os.environ[chave] = valor

        assert codigo == 0, "CLI não deveria falhar neste cenário (dispatch FAILED não é erro do CLI)"
        with open(caminho_out, encoding="utf-8") as fh:
            dados = json.load(fh)
        assert dados["status"] == "OBSERVED", dados
        # Prova de que a cadeia chegou até RunnerDispatchConfig/
        # executar_tarefa de verdade — não ficou presa num BLOCKED por
        # portão fechado nem numa "próxima oferta" (que nunca despacha).
        assert "Retomada automática avaliada: FAILED" in dados["merge_card"], dados["merge_card"]

        worker_final = OperationalWorkerRegistry(
            GitJsonStore(remoto, branch=DEFAULT_STATE_BRANCH, file_name="workers.json")
        ).find_by_name_or_id("claude-2")
        assert worker_final.status == "OFFLINE", (
            "o heartbeat OFFLINE final de executar_tarefa precisa ter rodado de verdade"
        )
        assert worker_final.current_task is None
    print("OK  test_cli_runner_wiring_com_env_do_workflow_abre_portao_e_despacha_retomada")


def main() -> int:
    testes = [
        test_cli_runner_wiring_seta_available_e_oferece_proxima_tarefa,
        test_cli_sem_runner_repo_dir_nao_quebra_comportamento_antigo,
        test_cli_runner_wiring_com_env_do_workflow_abre_portao_e_despacha_retomada,
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
