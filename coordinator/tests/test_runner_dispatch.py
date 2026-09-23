"""Testes de ``coordinator/runner_dispatch.py`` — Issue #105, Fase D
(``#105-D · Execução controlada``).

Mesma técnica de ``test_git_state.py``: git de verdade (não simulado em
memória) contra um repositório "remoto" local (``git init`` comum, sem
``--bare``), e ``threading.Barrier`` para forçar concorrência real no
teste de claim atômico — nunca um mock de subprocess.

Cobre, no mínimo, os cenários exigidos pela Issue #105 Fase D: gate
desligado (zero chamada externa), task_id fora do canário (zero chamada
externa), branch main/master rejeitada, Níveis E/D sem jose_authorized
rejeitados, arquivo fora de allowed_files (bloqueio sem commit/push),
patch inválido (bloqueio), dois dispatches simultâneos da mesma tarefa
(só um vence), resultado DONE nunca é MERGE-READY, heartbeat/checkpoint
válido e inválido.

Registrado em ``coordinator/tests/run_all.py`` a partir da Fase G da
Issue #105 (antes disto rodava só standalone, o que deixava a allowlist
``coordinator-suite`` — a única validação que o próprio canário executa
antes de comitar — cega para o mecanismo do canário). Continua rodando
standalone via ``python3 -m coordinator.tests.test_runner_dispatch``.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import threading

from . import _pathsetup  # noqa: F401
from coordinator import runner_generate
from coordinator.anthropic_client import TransportResponse
from coordinator.budget import UsageLedger
from coordinator.classify import Priority
from coordinator.git_state import GitJsonStore, GitUsageLedger
from coordinator.runner_dispatch import (
    DEFAULT_RUNNER_USAGE_STATE_BRANCH,
    FileWrite,
    RunnerDispatchConfig,
    StructuredPatch,
    RUNNER_GIT_AUTHOR_EMAIL,
    RUNNER_GIT_AUTHOR_NAME,
    executar_tarefa,
)
from coordinator.runner_dispatch import main as runner_dispatch_main
from coordinator.runner_contract import RunnerTask
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord


def _criar_remoto_local(tmp: str) -> str:
    """Mesmo padrão de ``test_git_state._criar_remoto_local``: um
    repositório git comum (não-bare) que funciona como 'o GitHub' — cada
    checkout é feito num diretório separado, nunca no próprio remoto."""
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para os testes do Runner Dispatch\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    subprocess.run(["git", "-C", remoto, "checkout", "-q", "-b", "bootstrap"], check=True)
    return remoto


def _clonar_workdir(tmp: str, remoto: str, nome: str) -> str:
    """Um checkout local que simula o workspace já confiável de um
    runner do GitHub Actions — clonado do remoto de mentira, na branch
    'bootstrap' (nunca 'main'/'master', de propósito, para nunca colidir
    com a checagem de branch protegida do próprio contrato)."""
    workdir = os.path.join(tmp, nome)
    subprocess.run(["git", "clone", "-q", remoto, workdir], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.name", "X"], check=True)
    subprocess.run(["git", "-C", workdir, "checkout", "-q", "bootstrap"], check=True)
    return workdir


def _task(**overrides) -> RunnerTask:
    campos = dict(
        task_id="canario-1",
        priority=Priority.P2,
        source_issue=105,
        branch="runner/canario-1",
        allowed_files=("greeting.txt",),
        instructions="Escrever uma saudação de teste em greeting.txt.",
        checkpoint_commit=None,
        capabilities_required=(),
        risk_level="BAIXO",
        policy_level="C",
        jose_authorized=False,
        publication_required=False,
    )
    campos.update(overrides)
    return RunnerTask(**campos)


def _patch(files=(FileWrite(path="greeting.txt", content="ola\n"),)) -> StructuredPatch:
    return StructuredPatch(files=tuple(files))


def _config(**overrides) -> RunnerDispatchConfig:
    campos = dict(enabled=True, mode="canary", canary_task_id="canario-1")
    campos.update(overrides)
    return RunnerDispatchConfig(**campos)


# ---------------------------------------------------------------------------
# Portão de segurança — zero chamada externa quando fechado.
# ---------------------------------------------------------------------------

def test_gate_closed_makes_zero_external_call() -> None:
    config = _config(enabled=False)
    outcome = executar_tarefa(
        _task(), _patch(),
        config=config,
        repo_dir="/definitivamente/nao/existe/repo",
        state_git_remote="/definitivamente/nao/existe/remoto.git",
    )
    assert outcome.result is not None and outcome.result.status == "BLOCKED"
    assert outcome.claimed is False
    assert outcome.external_calls_made is False
    assert outcome.heartbeats == ()
    print("OK  test_gate_closed_makes_zero_external_call")


def test_task_id_outside_canary_makes_zero_external_call() -> None:
    config = _config(canary_task_id="outro-task-id")
    outcome = executar_tarefa(
        _task(task_id="canario-1"), _patch(),
        config=config,
        repo_dir="/definitivamente/nao/existe/repo",
        state_git_remote="/definitivamente/nao/existe/remoto.git",
    )
    assert outcome.result is not None and outcome.result.status == "BLOCKED"
    assert outcome.claimed is False
    assert outcome.external_calls_made is False
    print("OK  test_task_id_outside_canary_makes_zero_external_call")


# ---------------------------------------------------------------------------
# Correção B1 (auditoria independente do PR #114): ref diferente da branch
# padrão -> zero chamada externa, mesmo com ENABLED/MODE/task_id corretos.
# ---------------------------------------------------------------------------

def test_ref_mismatch_makes_zero_external_call() -> None:
    config = _config(actual_ref="refs/heads/alguma-outra-branch", expected_ref="refs/heads/main")
    assert config.ref_allowed is False
    outcome = executar_tarefa(
        _task(), _patch(),
        config=config,
        repo_dir="/definitivamente/nao/existe/repo",
        state_git_remote="/definitivamente/nao/existe/remoto.git",
    )
    assert outcome.result is not None and outcome.result.status == "BLOCKED"
    assert outcome.claimed is False
    assert outcome.external_calls_made is False
    assert "ref" in outcome.result.reason.lower()
    print("OK  test_ref_mismatch_makes_zero_external_call")


def test_ref_partially_configured_is_treated_as_mismatch() -> None:
    """Um estado PARCIAL (só um dos dois lados configurado) nunca pode ser
    tratado como seguro — fail-closed, igual a um mismatch completo."""
    only_actual = _config(actual_ref="refs/heads/main", expected_ref=None)
    assert only_actual.ref_allowed is False

    only_expected = _config(actual_ref=None, expected_ref="refs/heads/main")
    assert only_expected.ref_allowed is False
    print("OK  test_ref_partially_configured_is_treated_as_mismatch")


def test_ref_absent_on_both_sides_does_not_restrict() -> None:
    """Chamada direta/teste fora do workflow real (nenhum dos dois
    configurado) não impõe restrição adicional — mesma aditividade do
    resto do portão (Config.pilot_allows)."""
    config = _config()
    assert config.actual_ref is None and config.expected_ref is None
    assert config.ref_allowed is True
    print("OK  test_ref_absent_on_both_sides_does_not_restrict")


def test_commit_nao_depende_de_identidade_git_do_host() -> None:
    """Regressão do primeiro canário R2 real: GitHub Actions não garante
    user.name/user.email. O Runner precisa commitar com identidade fixa,
    sem depender de config local/global do host."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work-sem-identidade")
        subprocess.run(["git", "-C", workdir, "config", "--unset-all", "user.name"], check=False)
        subprocess.run(["git", "-C", workdir, "config", "--unset-all", "user.email"], check=False)

        home_vazio = os.path.join(tmp, "home-vazio")
        os.makedirs(home_vazio)
        home_antigo = os.environ.get("HOME")
        os.environ["HOME"] = home_vazio
        try:
            task = _task(
                task_id="canario-sem-identidade",
                branch="runner/canario-sem-identidade",
                allowed_files=("greeting.txt",),
            )
            outcome = executar_tarefa(
                task, _patch(),
                config=_config(canary_task_id="canario-sem-identidade"),
                repo_dir=workdir, state_git_remote=remoto,
            )
        finally:
            if home_antigo is None:
                os.environ.pop("HOME", None)
            else:
                os.environ["HOME"] = home_antigo

        assert outcome.result is not None and outcome.result.status == "NEEDS-AUDIT", outcome.result
        autor = subprocess.run(
            ["git", "-C", workdir, "show", "-s", "--format=%an|%ae", "HEAD"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        assert autor == f"{RUNNER_GIT_AUTHOR_NAME}|{RUNNER_GIT_AUTHOR_EMAIL}", autor
    print("OK  test_commit_nao_depende_de_identidade_git_do_host")


def test_ref_match_allows_normal_execution() -> None:
    """Prova positiva: quando os dois lados batem, a execução prossegue
    normalmente — a correção B1 nunca bloqueia um disparo legítimo da
    branch padrão."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work-ref-ok")

        task = _task(task_id="canario-ref-ok", branch="runner/canario-ref-ok", allowed_files=("greeting.txt",))
        patch = _patch()
        config = _config(
            canary_task_id="canario-ref-ok",
            actual_ref="refs/heads/main", expected_ref="refs/heads/main",
        )

        outcome = executar_tarefa(task, patch, config=config, repo_dir=workdir, state_git_remote=remoto)
        assert outcome.result is not None and outcome.result.status == "NEEDS-AUDIT"
    print("OK  test_ref_match_allows_normal_execution")


# ---------------------------------------------------------------------------
# Invariantes herdados de runner_contract.py — branch protegida, Níveis E/D.
# ---------------------------------------------------------------------------

def test_branch_main_or_master_rejected_at_construction() -> None:
    for proibida in ("main", "master", "MAIN", "Master"):
        try:
            _task(branch=proibida)
        except ValueError:
            continue
        raise AssertionError(f"branch={proibida!r} devia ter sido rejeitada na construção da RunnerTask")
    print("OK  test_branch_main_or_master_rejected_at_construction")


def test_policy_e_and_d_without_authorization_rejected() -> None:
    try:
        _task(policy_level="E")
        raise AssertionError("policy_level='E' devia ser rejeitado na construção")
    except ValueError:
        pass

    try:
        _task(policy_level="D", jose_authorized=False)
        raise AssertionError("policy_level='D' sem jose_authorized devia ser rejeitado")
    except ValueError:
        pass

    tarefa_d_autorizada = _task(policy_level="D", jose_authorized=True)
    assert tarefa_d_autorizada.policy_level == "D"
    print("OK  test_policy_e_and_d_without_authorization_rejected")


# ---------------------------------------------------------------------------
# allowed_files — bloqueio sem commit/push, nos dois lados (pré e patch
# estruturalmente inválido).
# ---------------------------------------------------------------------------

def test_file_outside_allowed_files_blocks_without_commit_or_push() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work-fora-allowed")

        task = _task(task_id="canario-fora", branch="runner/canario-fora", allowed_files=("greeting.txt",))
        patch = _patch(files=(FileWrite(path="outro.txt", content="não devia entrar"),))
        config = _config(canary_task_id="canario-fora")

        outcome = executar_tarefa(task, patch, config=config, repo_dir=workdir, state_git_remote=remoto)

        assert outcome.result is not None and outcome.result.status == "BLOCKED"
        assert outcome.claimed is True
        assert "outro.txt" in outcome.result.reason

        r = subprocess.run(["git", "ls-remote", remoto, task.branch], capture_output=True, text=True)
        assert r.stdout.strip() == "", "nenhum commit podia ter sido publicado para a branch da tarefa"
    print("OK  test_file_outside_allowed_files_blocks_without_commit_or_push")


def test_invalid_patch_rejected_before_any_execution() -> None:
    try:
        StructuredPatch.from_dict({})
        raise AssertionError("patch sem 'files' devia ser rejeitado")
    except ValueError:
        pass

    try:
        StructuredPatch(files=())
        raise AssertionError("patch com files=() devia ser rejeitado")
    except ValueError:
        pass

    try:
        StructuredPatch(files=(FileWrite(path="a.txt", content="1"), FileWrite(path="a.txt", content="2")))
        raise AssertionError("patch com caminho duplicado devia ser rejeitado")
    except ValueError:
        pass
    print("OK  test_invalid_patch_rejected_before_any_execution")


def test_invalid_patch_file_blocks_cli_before_any_execution() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        task_path = os.path.join(tmp, "task.json")
        patch_path = os.path.join(tmp, "patch.json")
        with open(task_path, "w", encoding="utf-8") as fh:
            json.dump(_task().to_dict(), fh)
        with open(patch_path, "w", encoding="utf-8") as fh:
            json.dump({"files": []}, fh)  # patch vazio -> inválido

        codigo = runner_dispatch_main([
            "--task-file", task_path,
            "--patch-file", patch_path,
            "--repo-dir", ".",
            "--state-git-remote", "/definitivamente/nao/existe/remoto.git",
        ])
        assert codigo == 1, "um --patch-file inválido precisa falhar fechado, sem tentar executar nada"
    print("OK  test_invalid_patch_file_blocks_cli_before_any_execution")


def test_validation_command_outside_allowlist_blocks() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work-allowlist")

        task = _task(task_id="canario-allowlist", branch="runner/canario-allowlist", allowed_files=("greeting.txt",))
        patch = _patch()
        config = _config(canary_task_id="canario-allowlist")

        outcome = executar_tarefa(
            task, patch, config=config, repo_dir=workdir, state_git_remote=remoto,
            validation_command_keys=("comando-nao-declarado",),
        )
        assert outcome.result is not None and outcome.result.status == "BLOCKED"

        r = subprocess.run(["git", "ls-remote", remoto, task.branch], capture_output=True, text=True)
        assert r.stdout.strip() == "", "comando fora da allowlist não pode deixar nada publicado"
    print("OK  test_validation_command_outside_allowlist_blocks")


# ---------------------------------------------------------------------------
# Claim atômico sob concorrência real.
# ---------------------------------------------------------------------------

def test_concurrent_dispatch_same_task_id_only_one_wins() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir_a = _clonar_workdir(tmp, remoto, "work-a")
        workdir_b = _clonar_workdir(tmp, remoto, "work-b")

        task_id = "canario-concorrente"
        task = _task(task_id=task_id, branch=f"runner/{task_id}", allowed_files=("greeting.txt",))
        patch = _patch()
        config = _config(canary_task_id=task_id)

        barreira = threading.Barrier(2)
        resultados: dict[str, object] = {}
        erros: list[BaseException] = []

        def corredor(nome: str, workdir: str) -> None:
            try:
                barreira.wait(timeout=10)  # força sobreposição real dos dois claims
                resultados[nome] = executar_tarefa(
                    task, patch, config=config, repo_dir=workdir, state_git_remote=remoto,
                )
            except BaseException as e:
                erros.append(e)

        t1 = threading.Thread(target=corredor, args=("A", workdir_a))
        t2 = threading.Thread(target=corredor, args=("B", workdir_b))
        t1.start()
        t2.start()
        t1.join(timeout=60)
        t2.join(timeout=60)

        assert not erros, f"corredor(es) lançaram exceção: {erros}"
        assert set(resultados) == {"A", "B"}, f"as duas execuções precisavam terminar: {resultados}"

        vencedores = [n for n, o in resultados.items() if o.claimed]
        assert len(vencedores) == 1, f"exatamente 1 execução devia reivindicar o task_id, obtive {vencedores}"
        perdedor = next(n for n in resultados if n not in vencedores)
        assert resultados[perdedor].result.status == "BLOCKED"
        assert resultados[perdedor].claimed is False

        vencedor = resultados[vencedores[0]]
        assert vencedor.result.status in ("DONE", "NEEDS-AUDIT")
    print("OK  test_concurrent_dispatch_same_task_id_only_one_wins")


# ---------------------------------------------------------------------------
# Correção B3 (3ª auditoria independente do PR #114): o claim atômico
# precisa acontecer ANTES de qualquer chamada Anthropic paga — uma
# repetição/perdedor do mesmo task_id nunca pode chegar a chamar o
# transporte.
# ---------------------------------------------------------------------------

class _CountingTransport:
    """Espião: conta quantas vezes send() foi chamado; nunca faz rede de
    verdade (mesma técnica de test_anthropic_client.py/test_runner_generate.py)."""

    def __init__(self) -> None:
        self.calls = 0

    def send(self, request) -> TransportResponse:
        self.calls += 1
        return TransportResponse(
            text=json.dumps({"files": [{"path": "greeting.txt", "content": "ola\n"}]}),
            input_tokens=10, output_tokens=10,
        )


def test_claim_happens_before_anthropic_call_loser_makes_zero_calls() -> None:
    """Correção B3: duas execuções concorrentes do MESMO task_id, cada uma
    com seu PRÓPRIO 'gerar_patch' ligado a um transporte Anthropic falso
    separado — só a que vence o claim pode chegar a chamar o transporte;
    a perdedora precisa devolver BLOCKED com ZERO chamadas."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir_a = _clonar_workdir(tmp, remoto, "work-b3-a")
        workdir_b = _clonar_workdir(tmp, remoto, "work-b3-b")

        task_id = "canario-b3"
        task = _task(task_id=task_id, branch=f"runner/{task_id}", allowed_files=("greeting.txt",))
        config = _config(canary_task_id=task_id)

        transporte_a = _CountingTransport()
        transporte_b = _CountingTransport()

        barreira = threading.Barrier(2)
        resultados: dict[str, object] = {}
        erros: list[BaseException] = []

        def corredor(nome: str, workdir: str, transporte: _CountingTransport) -> None:
            try:
                usage_ledger = UsageLedger(os.path.join(tmp, f"ledger-{nome}.json"))

                def gerar():
                    return runner_generate.gerar_patch_via_claude(
                        task, config=config, repo_dir=workdir,
                        usage_ledger=usage_ledger, budget_usd=20.0,
                        transport=transporte,
                    )

                barreira.wait(timeout=10)  # força sobreposição real dos dois claims
                resultados[nome] = executar_tarefa(
                    task, None, config=config, repo_dir=workdir, state_git_remote=remoto,
                    gerar_patch=gerar,
                )
            except BaseException as e:
                erros.append(e)

        t1 = threading.Thread(target=corredor, args=("A", workdir_a, transporte_a))
        t2 = threading.Thread(target=corredor, args=("B", workdir_b, transporte_b))
        t1.start()
        t2.start()
        t1.join(timeout=60)
        t2.join(timeout=60)

        assert not erros, f"corredor(es) lançaram exceção: {erros}"
        assert set(resultados) == {"A", "B"}

        total_chamadas_anthropic = transporte_a.calls + transporte_b.calls
        assert total_chamadas_anthropic == 1, (
            f"só a execução vencedora do claim pode chamar o transporte Anthropic, "
            f"total de chamadas={total_chamadas_anthropic} (A={transporte_a.calls}, B={transporte_b.calls})"
        )

        vencedores = [n for n, o in resultados.items() if o.claimed]
        assert len(vencedores) == 1
        perdedor = next(n for n in resultados if n not in vencedores)
        assert resultados[perdedor].result.status == "BLOCKED"
        assert resultados[perdedor].claimed is False

        vencedor = resultados[vencedores[0]]
        assert vencedor.result.status in ("DONE", "NEEDS-AUDIT")
    print("OK  test_claim_happens_before_anthropic_call_loser_makes_zero_calls")


def test_generator_reads_checkpoint_before_generating_continuation_patch() -> None:
    """Regressão do canário R4 real: a geração da continuação precisa ver
    o conteúdo do checkpoint, nunca a main/checkout anterior."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        branch = "runner/canario-checkpoint-context"

        seed = _clonar_workdir(tmp, remoto, "seed-checkpoint-context")
        subprocess.run(["git", "-C", seed, "checkout", "-q", "-b", branch], check=True)
        with open(os.path.join(seed, "greeting.txt"), "w", encoding="utf-8") as fh:
            fh.write("stage-1\n")
        subprocess.run(["git", "-C", seed, "add", "-A"], check=True)
        subprocess.run(["git", "-C", seed, "commit", "-q", "-m", "checkpoint stage 1"], check=True)
        subprocess.run(["git", "-C", seed, "push", "-q", "origin", branch], check=True)
        checkpoint = subprocess.run(
            ["git", "-C", seed, "rev-parse", "HEAD"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()

        workdir = _clonar_workdir(tmp, remoto, "work-checkpoint-context")
        task_id = "canario-checkpoint-context"
        task = _task(
            task_id=task_id, branch=branch, allowed_files=("greeting.txt",),
            checkpoint_commit=checkpoint,
        )
        config = _config(canary_task_id=task_id)
        conteudo_visto: list[str] = []

        class _GeracaoOk:
            status = "ok"
            reason = "ok"
            ledger_correction_failed = False

            def __init__(self) -> None:
                self.patch = StructuredPatch(
                    files=(FileWrite(path="greeting.txt", content="stage-2\n"),)
                )

        def gerar() -> object:
            with open(os.path.join(workdir, "greeting.txt"), encoding="utf-8") as fh:
                conteudo_visto.append(fh.read())
            return _GeracaoOk()

        outcome = executar_tarefa(
            task, None, config=config, repo_dir=workdir, state_git_remote=remoto,
            gerar_patch=gerar,
        )

        assert conteudo_visto == ["stage-1\n"], (
            "gerar_patch precisa enxergar o checkpoint antes de decidir a próxima transição"
        )
        assert outcome.result is not None and outcome.result.status == "NEEDS-AUDIT", outcome.result
        publicado = subprocess.run(
            ["git", "-C", remoto, "show", f"refs/heads/{branch}:greeting.txt"],
            capture_output=True, text=True, check=True,
        ).stdout
        assert publicado == "stage-2\n", publicado
    print("OK  test_generator_reads_checkpoint_before_generating_continuation_patch")


def test_executar_tarefa_requires_exactly_one_of_patch_or_gerar_patch() -> None:
    task = _task()
    config = _config()
    try:
        executar_tarefa(task, None, config=config, repo_dir="/nao/existe", state_git_remote="/nao/existe.git")
        raise AssertionError("nem patch nem gerar_patch devia ser rejeitado")
    except ValueError:
        pass

    try:
        executar_tarefa(
            task, _patch(), config=config, repo_dir="/nao/existe", state_git_remote="/nao/existe.git",
            gerar_patch=lambda: None,
        )
        raise AssertionError("patch E gerar_patch juntos devia ser rejeitado")
    except ValueError:
        pass
    print("OK  test_executar_tarefa_requires_exactly_one_of_patch_or_gerar_patch")


# ---------------------------------------------------------------------------
# Achado F9-B (Issue #105, Fase F, 8ª rodada, auditoria independente):
# GenerateOutcome.ledger_correction_failed=True (a chamada Anthropic teve
# êxito e produziu um patch válido, mas a correção da reserva/registro de
# uso não pôde ser persistida — achado F8-C) nunca pode ser silenciosamente
# ignorado: fail-closed ANTES de aplicar qualquer patch, zero commit/push.
# ---------------------------------------------------------------------------

class _GeracaoComFalhaDeLedger:
    """Duck-typed, mesmo contrato de ``runner_generate.GenerateOutcome``
    (``.status``/``.patch``/``.reason``/``.ledger_correction_failed``) —
    simula exatamente o achado F9-B: a chamada teve êxito
    (``status="ok"``) e o patch é VÁLIDO, mas a correção do ledger
    falhou."""

    status = "ok"
    reason = "patch gerado via Claude e validado contra allowed_files."
    ledger_correction_failed = True

    def __init__(self, patch: StructuredPatch) -> None:
        self.patch = patch


def test_ledger_correction_failure_is_fail_closed_before_applying_patch() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work-ledger-correction-failed")

        task = _task(task_id="canario-ledger-fail", branch="runner/canario-ledger-fail")
        config = _config(canary_task_id="canario-ledger-fail")
        chamadas: list[int] = []

        def gerar_patch_com_ledger_quebrado() -> object:
            chamadas.append(1)
            return _GeracaoComFalhaDeLedger(_patch())

        outcome = executar_tarefa(
            task, None, config=config, repo_dir=workdir, state_git_remote=remoto,
            gerar_patch=gerar_patch_com_ledger_quebrado,
        )

        # RunnerResult FAILED explícito — nunca DONE/NEEDS-AUDIT, mesmo
        # com um patch VÁLIDO em mãos.
        assert outcome.result is not None and outcome.result.status == "FAILED", outcome.result
        assert "ledger" in outcome.result.reason.lower()
        assert outcome.claimed is True, "o claim precisa continuar consumido, nunca liberado"

        # Zero commit/push: a branch da tarefa nunca chegou a existir no
        # remoto (nem preparar_branch_de_trabalho nem aplicar_patch podem
        # ter rodado).
        r = subprocess.run(["git", "ls-remote", remoto, task.branch], capture_output=True, text=True)
        assert r.stdout.strip() == "", "nenhum commit podia ter sido publicado para a branch da tarefa"

        # Sem retry: gerar_patch() foi chamada exatamente 1 vez.
        assert len(chamadas) == 1, "gerar_patch() nunca pode ser chamada de novo (sem retry)"

        # O claim permanece consumido: uma segunda tentativa com o MESMO
        # task_id encontra a chave já reivindicada — nunca uma nova
        # chamada paga para o mesmo task_id.
        chamadas_repeticao: list[int] = []

        def gerar_patch_repeticao() -> object:
            chamadas_repeticao.append(1)
            return _GeracaoComFalhaDeLedger(_patch())

        outcome2 = executar_tarefa(
            task, None, config=config, repo_dir=workdir, state_git_remote=remoto,
            gerar_patch=gerar_patch_repeticao,
        )
        assert outcome2.claimed is False
        assert outcome2.result is not None and outcome2.result.status == "BLOCKED"
        assert chamadas_repeticao == [], "claim já consumido — gerar_patch() nunca deveria ser chamada de novo"
    print("OK  test_ledger_correction_failure_is_fail_closed_before_applying_patch")


# ---------------------------------------------------------------------------
# Correção B4 (3ª auditoria independente do PR #114): o Runner precisa
# consultar/gravar no MESMO ledger Anthropic GLOBAL que o Coordinator
# OBSERVE já usa — nunca um teto mensal separado.
# ---------------------------------------------------------------------------

def test_default_usage_branch_matches_the_global_coordinator_ledger() -> None:
    """Prova simples mas direta: a constante que o CLI usa como default de
    --usage-git-branch precisa ser literalmente a mesma branch que
    coordinator/__main__.py usa como default para o Coordinator OBSERVE —
    nunca uma branch 'só do Runner'."""
    assert DEFAULT_RUNNER_USAGE_STATE_BRANCH == "coordinator-state-usage"
    print("OK  test_default_usage_branch_matches_the_global_coordinator_ledger")


def test_runner_sees_spend_already_recorded_by_coordinator_and_respects_shared_cap() -> None:
    """Simula o Coordinator OBSERVE gravando gasto Anthropic direto no
    ledger global (mesma branch que o Runner vai usar) — o Runner, numa
    instância de GitUsageLedger totalmente nova, precisa (a) VER esse
    gasto e (b) respeitar o teto compartilhado mesmo sem nunca ter
    chamado a API ele mesmo."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        branch_global = DEFAULT_RUNNER_USAGE_STATE_BRANCH

        # "O Coordinator" grava um gasto Anthropic alto direto no ledger
        # global — nenhuma chamada de API de verdade, só a mecânica de
        # persistência (mesma classe que o Coordinator OBSERVE usa).
        ledger_coordinator = GitUsageLedger(GitJsonStore(remoto, branch=branch_global))
        from coordinator.budget import UsageRecord
        from datetime import datetime, timezone
        ledger_coordinator.append(UsageRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_key="coordinator-observe:evt-1", tier="STANDARD", model_id="claude-sonnet-5",
            input_tokens=1_000_000, output_tokens=1_000_000, estimated_cost_usd=19.99,
        ))

        # "O Runner" nunca viu essa gravação em memória — só reconstrói a
        # partir do MESMO remoto/branch.
        task = _task(task_id="canario-b4", branch="runner/canario-b4", allowed_files=("greeting.txt",))
        config = _config(canary_task_id="canario-b4")
        transporte = _CountingTransport()

        ledger_runner = GitUsageLedger(GitJsonStore(remoto, branch=branch_global))
        outcome = runner_generate.gerar_patch_via_claude(
            task, config=config, repo_dir=tmp,
            usage_ledger=ledger_runner, budget_usd=20.0,  # teto de US$20, igual ao real
            transport=transporte,
        )

        assert outcome.status == "blocked"
        assert transporte.calls == 0, "o gasto já registrado pelo Coordinator precisa bastar para bloquear o Runner"
        assert "orçamento" in outcome.reason.lower() or "orcamento" in outcome.reason.lower()

        # Prova positiva de visibilidade (independente do bloqueio acima):
        # o gasto gravado pelo "Coordinator" é lido de fato por uma
        # instância nova do ledger, do lado do Runner.
        assert ledger_runner.month_to_date_usd() >= 19.99
    print("OK  test_runner_sees_spend_already_recorded_by_coordinator_and_respects_shared_cap")


# ---------------------------------------------------------------------------
# DONE nunca é MERGE-READY; checkpoint válido/inválido.
# ---------------------------------------------------------------------------

def test_done_result_never_merge_ready() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work-done")

        task = _task(task_id="canario-done", branch="runner/canario-done", allowed_files=("greeting.txt",))
        patch = _patch()
        config = _config(canary_task_id="canario-done")

        outcome = executar_tarefa(
            task, patch, config=config, repo_dir=workdir, state_git_remote=remoto,
            sucesso_status="DONE",
        )
        assert outcome.result is not None and outcome.result.status == "DONE"
        assert outcome.result.merge_ready is False
        assert outcome.result.never_merge is True
        assert outcome.result.checkpoint_commit is not None
        assert outcome.result.branch == task.branch

        r = subprocess.run(["git", "ls-remote", remoto, task.branch], capture_output=True, text=True)
        assert r.stdout.strip() != "", "o commit devia ter sido publicado na branch da tarefa"
    print("OK  test_done_result_never_merge_ready")


def test_invalid_checkpoint_commit_causes_failed_result() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work-checkpoint-invalido")

        task = _task(
            task_id="canario-checkpoint-ruim", branch="runner/canario-checkpoint-ruim",
            allowed_files=("greeting.txt",), checkpoint_commit="abc1234",  # SHA plausível, mas inexistente
        )
        patch = _patch()
        config = _config(canary_task_id="canario-checkpoint-ruim")

        outcome = executar_tarefa(task, patch, config=config, repo_dir=workdir, state_git_remote=remoto)
        assert outcome.result is not None and outcome.result.status == "FAILED"
        assert outcome.claimed is True

        r = subprocess.run(["git", "ls-remote", remoto, task.branch], capture_output=True, text=True)
        assert r.stdout.strip() == "", "nada podia ter sido publicado quando o checkpoint não existe"
    print("OK  test_invalid_checkpoint_commit_causes_failed_result")


def test_worker_heartbeat_busy_then_offline_recorded_on_success() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work-heartbeat")

        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore({
            "workers": [
                WorkerRecord(
                    worker_id="api-runner", display_name="api-runner", type="api_runner",
                    status="AVAILABLE", capabilities=("codigo",),
                ).to_dict()
            ]
        }))

        task = _task(task_id="canario-heartbeat", branch="runner/canario-heartbeat", allowed_files=("greeting.txt",))
        patch = _patch()
        config = _config(canary_task_id="canario-heartbeat")

        outcome = executar_tarefa(
            task, patch, config=config, repo_dir=workdir, state_git_remote=remoto,
            worker_id="api-runner", worker_registry=registry,
        )
        assert outcome.result is not None and outcome.result.status == "NEEDS-AUDIT"
        assert len(outcome.heartbeats) == 2, "esperava um heartbeat BUSY inicial e um OFFLINE final"
        assert outcome.heartbeats[0]["action"] == "APPLIED"
        assert outcome.heartbeats[0]["record"]["status"] == "BUSY"
        assert outcome.heartbeats[0]["record"]["current_task"] == task.task_id
        assert outcome.heartbeats[-1]["record"]["status"] == "OFFLINE"
        assert outcome.heartbeats[-1]["record"]["current_task"] is None

        final = registry.find_by_name_or_id("api-runner")
        assert final is not None
        assert final.status == "OFFLINE"
        assert final.current_task is None
    print("OK  test_worker_heartbeat_busy_then_offline_recorded_on_success")


def main() -> int:
    testes = [
        test_gate_closed_makes_zero_external_call,
        test_task_id_outside_canary_makes_zero_external_call,
        test_ref_mismatch_makes_zero_external_call,
        test_ref_partially_configured_is_treated_as_mismatch,
        test_ref_absent_on_both_sides_does_not_restrict,
        test_commit_nao_depende_de_identidade_git_do_host,
        test_ref_match_allows_normal_execution,
        test_branch_main_or_master_rejected_at_construction,
        test_policy_e_and_d_without_authorization_rejected,
        test_file_outside_allowed_files_blocks_without_commit_or_push,
        test_invalid_patch_rejected_before_any_execution,
        test_invalid_patch_file_blocks_cli_before_any_execution,
        test_validation_command_outside_allowlist_blocks,
        test_concurrent_dispatch_same_task_id_only_one_wins,
        test_claim_happens_before_anthropic_call_loser_makes_zero_calls,
        test_generator_reads_checkpoint_before_generating_continuation_patch,
        test_executar_tarefa_requires_exactly_one_of_patch_or_gerar_patch,
        test_ledger_correction_failure_is_fail_closed_before_applying_patch,
        test_default_usage_branch_matches_the_global_coordinator_ledger,
        test_runner_sees_spend_already_recorded_by_coordinator_and_respects_shared_cap,
        test_done_result_never_merge_ready,
        test_invalid_checkpoint_commit_causes_failed_result,
        test_worker_heartbeat_busy_then_offline_recorded_on_success,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {e}")
    print(f"\n{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
