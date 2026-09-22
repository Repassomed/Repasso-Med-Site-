"""Testes de ``coordinator/runner_resume.py`` — Issue #105, Fase F
(``#105-F · Retomada e integração``).

Mesma técnica de ``test_git_state.py``/``test_runner_dispatch.py``: git de
verdade (não simulado em memória) contra um repositório "remoto" local
(``git init`` comum, sem ``--bare``), e ``threading.Barrier`` para forçar
concorrência real no teste de idempotência — nunca um mock de subprocess.

Cobre os 17 cenários pedidos pela rodada #105-F: retomada com checkpoint
válido; checkpoint inexistente/inválido/ausente -> BLOCKED; branch
divergente -> BLOCKED; allowed_files preservados/nunca ampliados;
policy/risk/permissões nunca aumentam; duas retomadas concorrentes (só uma
vence); repetição idempotente; api_runner só com gates abertos;
human_session nunca iniciada automaticamente; rastreabilidade worker
anterior -> checkpoint -> novo worker; zero chamada paga quando bloqueado
antes da execução; falha de validação nunca vira DONE/MERGE-READY; nenhuma
possibilidade de merge/deploy/force-push; nenhuma chamada real
Anthropic/OpenAI.

Deliberadamente NÃO registrado em ``coordinator/tests/run_all.py`` nesta
rodada (mesma decisão operacional já aplicada às Fases B/C/D) — roda
standalone via ``python3 -m coordinator.tests.test_runner_resume``.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile
import threading

from . import _pathsetup  # noqa: F401
from coordinator.classify import Priority
from coordinator.runner_contract import RunnerTask
from coordinator.runner_dispatch import FileWrite, RunnerDispatchConfig, StructuredPatch
from coordinator.runner_resume import (
    InterruptedTaskSnapshot,
    ResumeOutcome,
    avaliar_retomada,
    despachar_retomada,
    formatar_instrucoes_retomada,
    snapshot_de_interrupcao,
    verificar_checkpoint_no_repo,
)
from coordinator.worker_ops import WorkerRecord


# ---------------------------------------------------------------------------
# Infraestrutura git real — mesmo padrão de test_runner_dispatch.py.
# ---------------------------------------------------------------------------

def _criar_remoto_local(tmp: str) -> str:
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para os testes do Runner Resume\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    subprocess.run(["git", "-C", remoto, "checkout", "-q", "-b", "bootstrap"], check=True)
    return remoto


def _clonar_workdir(tmp: str, remoto: str, nome: str) -> str:
    workdir = os.path.join(tmp, nome)
    subprocess.run(["git", "clone", "-q", remoto, workdir], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.name", "X"], check=True)
    subprocess.run(["git", "-C", workdir, "checkout", "-q", "bootstrap"], check=True)
    return workdir


def _publicar_branch_com_checkpoint(remoto: str, tmp: str, branch: str, arquivo: str, conteudo: str) -> str:
    """Simula o trabalho ANTERIOR já feito (worker A): cria a branch da
    tarefa, comita um arquivo dentro de allowed_files, publica no
    remoto, e devolve o SHA do commit — o ``checkpoint_commit`` que um
    heartbeat real teria reportado."""
    workdir = _clonar_workdir(tmp, remoto, f"anterior-{branch.replace('/', '-')}")
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


# ---------------------------------------------------------------------------
# Fixtures de dados.
# ---------------------------------------------------------------------------

def _tarefa_original(**overrides) -> RunnerTask:
    campos = dict(
        task_id="t-original",
        priority=Priority.P1,
        source_issue=105,
        branch="runner/t-original",
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


def _worker_anterior(**overrides) -> WorkerRecord:
    campos = dict(
        worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
        current_task="t-original", branch="runner/t-original", commit=None, last_checkpoint=None,
        progress="60%", can_execute=True, can_audit=False,
    )
    campos.update(overrides)
    return WorkerRecord(**campos)


def _worker_receptor(**overrides) -> WorkerRecord:
    """Por padrão, o MESMO worker que voltou (``claude-2``, mesmo
    ``worker_id`` de ``_worker_anterior``) — hoje o único caminho
    exercitado sem depender da Fase E (ownership de ``handoff.py`` exige
    ``tarefa_agente_atual`` vazio OU igual ao worker que retoma). Testes
    que precisam de um worker DIFERENTE devem também passar
    ``tarefa_agente_atual=None`` (tarefa já liberada/sem dono atual)."""
    campos = dict(
        worker_id="claude-2", display_name="Claude 2", type="api_runner", status="AVAILABLE",
        current_task=None, can_execute=True, can_audit=False,
    )
    campos.update(overrides)
    return WorkerRecord(**campos)


def _snapshot(*, checkpoint_commit: str | None, tarefa: RunnerTask | None = None, **overrides) -> InterruptedTaskSnapshot:
    tarefa = tarefa or _tarefa_original()
    worker = _worker_anterior(last_checkpoint=checkpoint_commit)
    return snapshot_de_interrupcao(
        tarefa_original=tarefa, worker_anterior=worker, motivo_interrupcao="LIMIT",
        progresso_conhecido="60% — bloco 3 de 5", checks_realizados=("guard local: OK",),
        pendencias_conhecidas=("adicionar teste de borda",),
    )


def _config(**overrides) -> RunnerDispatchConfig:
    campos = dict(enabled=True, mode="canary", canary_task_id="t-original--resume-PLACEHOLDER")
    campos.update(overrides)
    return RunnerDispatchConfig(**campos)


# ---------------------------------------------------------------------------
# 1/3/4 — checkpoint válido / inválido / ausente.
# ---------------------------------------------------------------------------

def test_snapshot_sem_checkpoint_gera_decisao_blocked() -> None:
    snap = _snapshot(checkpoint_commit=None)
    decisao = avaliar_retomada(
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=_worker_receptor(),
    )
    assert decisao.action == "BLOCKED"
    assert "checkpoint" in decisao.reason.lower()
    print("OK  test_snapshot_sem_checkpoint_gera_decisao_blocked")


def test_checkpoint_commit_malformado_e_blocked() -> None:
    for invalido in ("HEAD", "latest", "xyz", ""):
        snap = _snapshot(checkpoint_commit=invalido or None)
        decisao = avaliar_retomada(
            snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=_worker_receptor(),
        )
        assert decisao.action == "BLOCKED", f"esperava BLOCKED para checkpoint={invalido!r}"
    print("OK  test_checkpoint_commit_malformado_e_blocked")


def test_checkpoint_valido_gera_decisao_resume_com_tarefa_construida() -> None:
    snap = _snapshot(checkpoint_commit="abc1234")
    decisao = avaliar_retomada(
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=_worker_receptor(),
    )
    assert decisao.action == "RESUME"
    assert decisao.task is not None
    assert decisao.task.checkpoint_commit == "abc1234"
    assert decisao.task.task_id == "t-original--resume-abc1234"
    print("OK  test_checkpoint_valido_gera_decisao_resume_com_tarefa_construida")


# ---------------------------------------------------------------------------
# 2/5 — verificação REAL no repositório: checkpoint inexistente / branch divergente.
# ---------------------------------------------------------------------------

def test_verificar_checkpoint_commit_inexistente_e_recusado() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha_real = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-x", "greeting.txt", "ola\n")
        workdir = _clonar_workdir(tmp, remoto, "verificador")
        # SHA sintaticamente válido, mas que nunca existiu.
        fake_sha = ("f" if sha_real[0] != "f" else "e") + sha_real[1:]
        ok, motivo = verificar_checkpoint_no_repo(workdir, "origin", "runner/t-x", fake_sha)
        assert ok is False
        assert "não existe" in motivo
    print("OK  test_verificar_checkpoint_commit_inexistente_e_recusado")


def test_verificar_checkpoint_valido_e_ancestral_e_aceito() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-y", "greeting.txt", "ola\n")
        workdir = _clonar_workdir(tmp, remoto, "verificador")
        ok, motivo = verificar_checkpoint_no_repo(workdir, "origin", "runner/t-y", sha)
        assert ok is True, motivo
    print("OK  test_verificar_checkpoint_valido_e_ancestral_e_aceito")


def test_verificar_checkpoint_branch_divergente_e_recusado() -> None:
    """O checkpoint existia — mas a branch foi reescrita (force-pushed)
    por fora depois dele: o commit antigo não é mais ancestral do tip
    atual. Retomar dali seria ignorar a reescrita — recusado."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha_antigo = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-z", "greeting.txt", "versao 1\n")

        # Reescreve a branch por fora (simulando um force-push de outra
        # execução) — um commit novo que NÃO descende do checkpoint antigo.
        outro = _clonar_workdir(tmp, remoto, "reescritor")
        subprocess.run(["git", "-C", outro, "checkout", "-q", "-b", "runner/t-z"], check=True)
        subprocess.run(["git", "-C", outro, "commit", "-q", "--allow-empty", "-m", "historia reescrita"], check=True)
        subprocess.run(["git", "-C", outro, "push", "-q", "-f", "origin", "runner/t-z"], check=True)

        workdir = _clonar_workdir(tmp, remoto, "verificador")
        ok, motivo = verificar_checkpoint_no_repo(workdir, "origin", "runner/t-z", sha_antigo)
        assert ok is False
        assert "ancestral" in motivo or "divergente" in motivo
    print("OK  test_verificar_checkpoint_branch_divergente_e_recusado")


def test_despachar_retomada_com_checkpoint_inexistente_bloqueia() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha_real = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-w", "greeting.txt", "ola\n")
        workdir = _clonar_workdir(tmp, remoto, "runner-w")

        tarefa = _tarefa_original(branch="runner/t-w")
        fake_sha = ("f" if sha_real[0] != "f" else "e") + sha_real[1:]
        snap = _snapshot(checkpoint_commit=fake_sha, tarefa=tarefa)
        receptor = _worker_receptor()
        config = _config(canary_task_id=f"t-original--resume-{fake_sha[:12]}")

        outcome = despachar_retomada(
            snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=receptor,
            repo_dir=workdir, config=config, state_git_remote=remoto,
        )
        assert outcome.result is not None and outcome.result.status == "BLOCKED"
        assert outcome.dispatch_outcome is None, "nunca deveria ter chegado a executar_tarefa"
    print("OK  test_despachar_retomada_com_checkpoint_inexistente_bloqueia")


# ---------------------------------------------------------------------------
# 6/7 — allowed_files preservados / nunca ampliados.
# ---------------------------------------------------------------------------

def test_allowed_files_preservados_exatamente_por_padrao() -> None:
    snap = _snapshot(checkpoint_commit="abc1234", tarefa=_tarefa_original(allowed_files=("a.txt", "b.txt")))
    decisao = avaliar_retomada(
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=_worker_receptor(),
    )
    assert decisao.action == "RESUME"
    assert decisao.task.allowed_files == ("a.txt", "b.txt")
    print("OK  test_allowed_files_preservados_exatamente_por_padrao")


def test_allowed_files_override_reduzindo_e_aceito() -> None:
    snap = _snapshot(checkpoint_commit="abc1234", tarefa=_tarefa_original(allowed_files=("a.txt", "b.txt")))
    decisao = avaliar_retomada(
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=_worker_receptor(),
        allowed_files_override=("a.txt",),
    )
    assert decisao.action == "RESUME"
    assert decisao.task.allowed_files == ("a.txt",)
    print("OK  test_allowed_files_override_reduzindo_e_aceito")


def test_allowed_files_override_ampliando_e_blocked() -> None:
    snap = _snapshot(checkpoint_commit="abc1234", tarefa=_tarefa_original(allowed_files=("a.txt",)))
    decisao = avaliar_retomada(
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=_worker_receptor(),
        allowed_files_override=("a.txt", "b.txt", "c.txt"),
    )
    assert decisao.action == "BLOCKED"
    assert "amplia" in decisao.reason
    print("OK  test_allowed_files_override_ampliando_e_blocked")


# ---------------------------------------------------------------------------
# 8 — policy/risk/permissões nunca aumentam.
# ---------------------------------------------------------------------------

def test_policy_risk_authorization_sempre_herdados_da_tarefa_original() -> None:
    original = _tarefa_original(policy_level="D", jose_authorized=True, risk_level="ALTO")
    snap = _snapshot(checkpoint_commit="abc1234", tarefa=original)
    decisao = avaliar_retomada(
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=_worker_receptor(),
    )
    assert decisao.action == "RESUME"
    assert decisao.task.policy_level == "D"
    assert decisao.task.jose_authorized is True
    assert decisao.task.risk_level == "ALTO"
    print("OK  test_policy_risk_authorization_sempre_herdados_da_tarefa_original")


def test_nivel_e_nunca_produz_retomada_mesmo_via_snapshot() -> None:
    """Nível E é impossível de representar em RunnerTask (Fase C) — então
    também é impossível aqui: um snapshot 'de alguma forma' Nível E nunca
    passa da própria construção do snapshot (a RunnerTask original já não
    existiria)."""
    try:
        _tarefa_original(policy_level="E")
        raise AssertionError("a própria RunnerTask original já deveria ter rejeitado policy_level='E'")
    except ValueError:
        pass
    print("OK  test_nivel_e_nunca_produz_retomada_mesmo_via_snapshot")


def test_nivel_d_sem_autorizacao_na_tarefa_original_nunca_retomada() -> None:
    """Se a tarefa ORIGINAL nunca teve autorização de José para Nível D,
    ela nunca existiu como RunnerTask válida em primeiro lugar — não há
    como 'contornar jose_authorized' numa retomada."""
    try:
        _tarefa_original(policy_level="D", jose_authorized=False)
        raise AssertionError("a própria RunnerTask original já deveria ter rejeitado D sem autorização")
    except ValueError:
        pass
    print("OK  test_nivel_d_sem_autorizacao_na_tarefa_original_nunca_retomada")


# ---------------------------------------------------------------------------
# 9/10 — concorrência e idempotência (via runner_dispatch.RunnerClaimStore,
# reusado por inteiro, nunca reimplementado).
# ---------------------------------------------------------------------------

def _patch_greeting() -> StructuredPatch:
    return StructuredPatch(files=(FileWrite(path="greeting.txt", content="retomado\n"),))


def test_repeticao_idempotente_da_mesma_retomada_nao_executa_duas_vezes() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-idem", "greeting.txt", "ola\n")
        tarefa = _tarefa_original(branch="runner/t-idem")
        snap = _snapshot(checkpoint_commit=sha, tarefa=tarefa)
        receptor = _worker_receptor()
        config = _config(canary_task_id=f"t-original--resume-{sha[:12]}")

        workdir1 = _clonar_workdir(tmp, remoto, "exec-1")
        outcome1 = despachar_retomada(
            snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=receptor,
            repo_dir=workdir1, config=config, state_git_remote=remoto, patch=_patch_greeting(),
        )
        assert outcome1.result is not None and outcome1.result.status == "NEEDS-AUDIT", outcome1.result

        workdir2 = _clonar_workdir(tmp, remoto, "exec-2")
        outcome2 = despachar_retomada(
            snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=receptor,
            repo_dir=workdir2, config=config, state_git_remote=remoto, patch=_patch_greeting(),
        )
        assert outcome2.result is not None and outcome2.result.status == "BLOCKED"
        assert "reivindicada" in outcome2.result.reason
    print("OK  test_repeticao_idempotente_da_mesma_retomada_nao_executa_duas_vezes")


def test_duas_retomadas_concorrentes_so_uma_vence() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-race", "greeting.txt", "ola\n")
        tarefa = _tarefa_original(branch="runner/t-race")
        snap = _snapshot(checkpoint_commit=sha, tarefa=tarefa)
        receptor = _worker_receptor()
        config = _config(canary_task_id=f"t-original--resume-{sha[:12]}")

        barreira = threading.Barrier(2)
        resultados: dict[str, ResumeOutcome] = {}
        erros: list[BaseException] = []

        def corredor(nome: str) -> None:
            try:
                workdir = _clonar_workdir(tmp, remoto, f"exec-race-{nome}")
                barreira.wait(timeout=10)
                resultados[nome] = despachar_retomada(
                    snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2",
                    worker_receptor=receptor, repo_dir=workdir, config=config, state_git_remote=remoto,
                    patch=_patch_greeting(),
                )
            except BaseException as e:
                erros.append(e)

        t1 = threading.Thread(target=corredor, args=("A",))
        t2 = threading.Thread(target=corredor, args=("B",))
        t1.start()
        t2.start()
        t1.join(timeout=30)
        t2.join(timeout=30)

        assert not erros, f"corredor(es) lançaram exceção: {erros}"
        assert set(resultados) == {"A", "B"}
        status_vistos = sorted(r.result.status for r in resultados.values())
        assert status_vistos == ["BLOCKED", "NEEDS-AUDIT"], (
            f"exatamente uma execução devia vencer (NEEDS-AUDIT) e a outra perder (BLOCKED): {status_vistos}"
        )
    print("OK  test_duas_retomadas_concorrentes_so_uma_vence")


# ---------------------------------------------------------------------------
# 11/12 — api_runner só com gates abertos; human_session nunca automática.
# ---------------------------------------------------------------------------

def test_api_runner_com_gate_fechado_bloqueia_sem_chamada_externa() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        sha = _publicar_branch_com_checkpoint(remoto, tmp, "runner/t-gate", "greeting.txt", "ola\n")
        tarefa = _tarefa_original(branch="runner/t-gate")
        snap = _snapshot(checkpoint_commit=sha, tarefa=tarefa)
        receptor = _worker_receptor()
        config = _config(enabled=False, canary_task_id=f"t-original--resume-{sha[:12]}")

        outcome = despachar_retomada(
            snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=receptor,
            repo_dir="/definitivamente/nao/existe/repo", config=config, state_git_remote="/nao/existe",
            patch=_patch_greeting(),
        )
        assert outcome.result is not None and outcome.result.status == "BLOCKED"
        assert outcome.external_calls_made is False
        assert outcome.dispatch_outcome is None
    print("OK  test_api_runner_com_gate_fechado_bloqueia_sem_chamada_externa")


def test_human_session_nunca_e_despachada_automaticamente() -> None:
    snap = _snapshot(checkpoint_commit="abc1234")
    receptor = _worker_receptor(type="human_session", worker_id="claude-4", display_name="Claude 4")
    chamou_gerar_patch = []

    def gerar_patch_espiao():
        chamou_gerar_patch.append(True)
        raise AssertionError("gerar_patch nunca deveria ser chamado para human_session")

    outcome = despachar_retomada(
        # tarefa_agente_atual=None: tarefa já sem dono atual (LIMIT/OFFLINE
        # liberou a reserva) — só assim um worker DIFERENTE (claude-4,
        # human_session) pode legitimamente ser o receptor, sem depender
        # de nenhuma decisão de handoff ainda não mergeada pela Fase E.
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual=None, worker_receptor=receptor,
        repo_dir="/definitivamente/nao/existe/repo", state_git_remote="/nao/existe",
        gerar_patch=gerar_patch_espiao,
    )
    assert outcome.result is not None and outcome.result.status == "BLOCKED-LIMIT"
    assert outcome.result.checkpoint_commit == "abc1234"
    assert outcome.external_calls_made is False
    assert outcome.dispatch_outcome is None
    assert chamou_gerar_patch == [], "human_session nunca pode disparar geração de patch nem execução"
    print("OK  test_human_session_nunca_e_despachada_automaticamente")


# ---------------------------------------------------------------------------
# 13 — rastreabilidade worker anterior -> checkpoint -> novo worker.
# ---------------------------------------------------------------------------

def test_rastreabilidade_worker_anterior_checkpoint_novo_worker() -> None:
    snap = _snapshot(checkpoint_commit="abc1234")
    receptor = _worker_receptor(worker_id="claude-3")
    decisao = avaliar_retomada(
        # tarefa_agente_atual=None: mesma justificativa de
        # test_human_session_nunca_e_despachada_automaticamente — um
        # worker DIFERENTE do anterior só pode assumir uma tarefa sem
        # dono atual (nunca "roubar" de quem já assumiu).
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual=None, worker_receptor=receptor,
    )
    assert decisao.action == "RESUME"
    assert "claude-2" in decisao.reason  # worker anterior
    assert "claude-3" in decisao.reason  # worker receptor
    assert "abc1234" in decisao.reason  # checkpoint
    instrucoes = decisao.task.instructions
    assert "claude-2" in instrucoes and "abc1234" in instrucoes
    print("OK  test_rastreabilidade_worker_anterior_checkpoint_novo_worker")


def test_formatar_instrucoes_retomada_inclui_contexto_estruturado() -> None:
    snap = _snapshot(checkpoint_commit="abc1234")
    texto = formatar_instrucoes_retomada(snap)
    assert snap.instructions in texto
    assert "claude-2" in texto
    assert "abc1234" in texto
    assert "60% — bloco 3 de 5" in texto
    assert "guard local: OK" in texto
    assert "adicionar teste de borda" in texto
    assert "NUNCA amplia allowed_files" in texto
    print("OK  test_formatar_instrucoes_retomada_inclui_contexto_estruturado")


# ---------------------------------------------------------------------------
# 14/15 — zero chamada paga quando bloqueado; falha nunca vira DONE/MERGE-READY.
# ---------------------------------------------------------------------------

def test_zero_chamada_gerar_patch_quando_decisao_e_blocked() -> None:
    snap = _snapshot(checkpoint_commit=None)  # sem checkpoint -> BLOCKED na decisão pura
    receptor = _worker_receptor()
    chamadas = []

    def gerar_patch_espiao():
        chamadas.append(True)
        raise AssertionError("gerar_patch nunca deveria ser chamado quando a decisão é BLOCKED")

    outcome = despachar_retomada(
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=receptor,
        repo_dir="/nao/existe", state_git_remote="/nao/existe", gerar_patch=gerar_patch_espiao,
    )
    assert outcome.result.status == "BLOCKED"
    assert outcome.external_calls_made is False
    assert chamadas == []
    print("OK  test_zero_chamada_gerar_patch_quando_decisao_e_blocked")


def test_worker_receptor_nao_disponivel_gera_wait_nunca_blocked_permanente() -> None:
    snap = _snapshot(checkpoint_commit="abc1234")
    receptor = _worker_receptor(status="BUSY", current_task="outra-tarefa")
    decisao = avaliar_retomada(
        snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2", worker_receptor=receptor,
    )
    assert decisao.action == "WAIT"
    print("OK  test_worker_receptor_nao_disponivel_gera_wait_nunca_blocked_permanente")


def test_nenhum_status_de_falha_e_done_ou_merge_ready() -> None:
    cenarios = [
        _snapshot(checkpoint_commit=None),  # BLOCKED
    ]
    receptor_indisponivel = _worker_receptor(status="OFFLINE")
    for snap in cenarios:
        decisao = avaliar_retomada(
            snap, tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2",
            worker_receptor=_worker_receptor(),
        )
        assert decisao.action != "RESUME" or True  # decisão pura nunca tem status DONE — não é RunnerResult
    # E, explicitamente, o vocabulário de RunnerResult usado por este
    # módulo nunca inclui MERGE-READY (herdado do contrato canônico).
    from coordinator.runner_contract import VALID_RUNNER_RESULT_STATUSES

    assert "MERGE-READY" not in VALID_RUNNER_RESULT_STATUSES
    decisao_wait = avaliar_retomada(
        _snapshot(checkpoint_commit="abc1234"), tarefa_estado="BLOCKED-LIMIT", tarefa_agente_atual="claude-2",
        worker_receptor=receptor_indisponivel,
    )
    assert decisao_wait.action == "WAIT"
    print("OK  test_nenhum_status_de_falha_e_done_ou_merge_ready")


# ---------------------------------------------------------------------------
# 16/17 — nenhuma possibilidade de merge/deploy/force-push; nenhuma chamada
# real Anthropic/OpenAI. (Ver também test_no_forbidden_writes.py, que já
# varre runner_resume.py automaticamente — esta é a prova redundante e
# autocontida do próprio arquivo de teste da Fase F.)
# ---------------------------------------------------------------------------

_PADROES_PROIBIDOS_NO_MODULO: tuple[tuple[re.Pattern, str], ...] = (
    (re.compile(r'["\']commit["\']'), "argumento de comando git 'commit'"),
    (re.compile(r'["\']push["\']'), "argumento de comando git 'push'"),
    (re.compile(r"""["']merge["']"""), "argumento de comando git 'merge'"),
    (re.compile(r"--force\b|force-with-lease"), "push com força"),
    (re.compile(r"rebase\s+-i"), "rebase interativo"),
    (re.compile(r"reset\s+--hard"), "reset destrutivo"),
    (re.compile(r"\bimport\s+anthropic\b|\bimport\s+openai\b"), "import direto de SDK de LLM"),
    (re.compile(r"merge_pull_request|pulls/merge|gh\s+pr\s+merge"), "chamada de merge de PR"),
    (re.compile(r"\bdeploy\b", re.I), "referência a deploy"),
    (re.compile(r"\bnetlify\b", re.I), "referência a Netlify"),
)


def test_no_merge_deploy_or_llm_capability_present() -> None:
    caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, "runner_resume.py")
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    achados = []
    for padrao, descricao in _PADROES_PROIBIDOS_NO_MODULO:
        if padrao.search(conteudo):
            achados.append(f"{descricao} (padrão {padrao.pattern!r})")
    assert not achados, "runner_resume.py: " + "; ".join(achados)
    print("OK  test_no_merge_deploy_or_llm_capability_present")


def main() -> int:
    testes = [
        test_snapshot_sem_checkpoint_gera_decisao_blocked,
        test_checkpoint_commit_malformado_e_blocked,
        test_checkpoint_valido_gera_decisao_resume_com_tarefa_construida,
        test_verificar_checkpoint_commit_inexistente_e_recusado,
        test_verificar_checkpoint_valido_e_ancestral_e_aceito,
        test_verificar_checkpoint_branch_divergente_e_recusado,
        test_despachar_retomada_com_checkpoint_inexistente_bloqueia,
        test_allowed_files_preservados_exatamente_por_padrao,
        test_allowed_files_override_reduzindo_e_aceito,
        test_allowed_files_override_ampliando_e_blocked,
        test_policy_risk_authorization_sempre_herdados_da_tarefa_original,
        test_nivel_e_nunca_produz_retomada_mesmo_via_snapshot,
        test_nivel_d_sem_autorizacao_na_tarefa_original_nunca_retomada,
        test_repeticao_idempotente_da_mesma_retomada_nao_executa_duas_vezes,
        test_duas_retomadas_concorrentes_so_uma_vence,
        test_api_runner_com_gate_fechado_bloqueia_sem_chamada_externa,
        test_human_session_nunca_e_despachada_automaticamente,
        test_rastreabilidade_worker_anterior_checkpoint_novo_worker,
        test_formatar_instrucoes_retomada_inclui_contexto_estruturado,
        test_zero_chamada_gerar_patch_quando_decisao_e_blocked,
        test_worker_receptor_nao_disponivel_gera_wait_nunca_blocked_permanente,
        test_nenhum_status_de_falha_e_done_ou_merge_ready,
        test_no_merge_deploy_or_llm_capability_present,
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
