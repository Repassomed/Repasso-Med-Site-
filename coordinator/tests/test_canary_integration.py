"""Testes da integração operacional final do canário — Issue #105, Fase G
(``#105-G · integração operacional final para canário ponta a ponta``),
achados G1 a G7.

Mesma técnica de ``test_handoff_exec.py``/``test_runner_resume.py``/
``test_worker_commands.py``: git de VERDADE (não simulado) contra um
repositório "remoto" local, ``worker_ops.InMemoryWorkerStateStore`` para o
Worker Registry e um transporte falso contado para a Anthropic — ZERO
chamada paga, zero rede, nenhum canário real executado.

O fluxo integrado provado aqui é o mesmo pedido por José:

    Etapa A: RunnerTask inicial -> api-runner-canary-a -> BUSY -> patch
             controlado -> checkpoint/commit -> OFFLINE.
    Etapa B: evento CHECKPOINT BLOCKED-LIMIT real -> RunnerHeartbeat LIMIT
             real -> last_checkpoint persistido -> Scheduler ->
             executar_handoff -> api-runner-canary-b reservado ->
             HandoffClaimStore persistido -> RunnerTask --continuacao-* ->
             Runner Dispatch.
    Etapa C: api-runner-canary-b em LIMIT com checkpoint novo -> comando
             real SET_AVAILABLE da Inbox -> Fase F -> contexto recuperado
             do handoff -> RunnerTask --resume-* -> nova execução
             (CANARY_STAGE=3).

Mais os testes de segurança obrigatórios: portão fechado = zero execução;
orçamento bloqueado = zero chamada; worker desconhecido = heartbeat
rejeitado; ``human_session`` nunca auto-iniciada; ``allowed_files`` nunca
ampliados; nenhuma escrita na branch padrão; nenhum merge/deploy/
publicação/force-push; replay de evento/claim = zero duplicação.

Registrado em ``coordinator/tests/run_all.py`` — roda também standalone
via ``python3 -m coordinator.tests.test_canary_integration``.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
from dataclasses import replace

from . import _pathsetup
from coordinator.anthropic_client import TransportResponse
from coordinator.canary_bootstrap import (
    CANARY_WORKER_A,
    CANARY_WORKER_B,
    e_worker_de_canario,
    preparar_workers_do_canario,
)
from coordinator.budget import UsageLedger
from coordinator.checkpoint_handoff import (
    despachar_continuacao_de_handoff,
    processar_checkpoint_de_limite,
)
from coordinator.classify import Priority
from coordinator.config import ACTIVE_SUPERVISED_MODE, Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.github_event import build_event_from_github_context
from coordinator.handoff_exec import HandoffExecutionResult, derivar_task_id_de_continuacao
from coordinator.heartbeat import aplicar_heartbeat
from coordinator.observe import observe
from coordinator.runner_contract import RunnerHeartbeat, RunnerTask
from coordinator.runner_dispatch import (
    FileWrite,
    RunnerDispatchConfig,
    StructuredPatch,
    carregar_runner_task_de_arquivo,
    executar_tarefa,
)
from coordinator.runner_generate import gerar_patch_via_claude
from coordinator.worker_commands import WorkerCommand, aplicar_comando, parse_worker_command
from coordinator.worker_ops import (
    InMemoryWorkerStateStore,
    OperationalWorkerRegistry,
    WorkerRecord,
    default_seed_workers,
)

CANARY_TASK_ID = "infra-coordinator-final-canary"
CANARY_TASK_FILE = os.path.join(
    "coordinator", "runner_tasks", f"{CANARY_TASK_ID}.task.json"
)
CANARY_ARQUIVO = os.path.join("coordinator", "canary", "runner-canary.txt")


# ---------------------------------------------------------------------------
# Infraestrutura: git real + transporte falso.
# ---------------------------------------------------------------------------

def _git(repo: str, *args: str) -> str:
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, check=True)
    return r.stdout.strip()


def _criar_remoto_local(tmp: str) -> tuple[str, str, str]:
    """Remoto local com a RunnerTask REAL do canário já versionada (é o
    mesmo arquivo de ``coordinator/runner_tasks/`` deste repositório, nunca
    uma cópia inventada para o teste). Devolve
    ``(remoto, branch_padrao, sha_da_branch_padrao)``."""
    remoto = os.path.join(tmp, "remoto")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    _git(remoto, "config", "user.email", "x@example.com")
    _git(remoto, "config", "user.name", "X")
    destino = os.path.join(remoto, os.path.dirname(CANARY_TASK_FILE))
    os.makedirs(destino, exist_ok=True)
    shutil.copy(os.path.join(_pathsetup.REPO_ROOT, CANARY_TASK_FILE), os.path.join(remoto, CANARY_TASK_FILE))
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para os testes da integração do canário\n")
    _git(remoto, "add", "-A")
    _git(remoto, "commit", "-q", "-m", "bootstrap")
    branch_padrao = _git(remoto, "rev-parse", "--abbrev-ref", "HEAD")
    sha_padrao = _git(remoto, "rev-parse", "HEAD")
    # Sai da branch padrão para que os pushes de branch de trabalho do
    # Runner sejam aceitos por este repositório não-bare.
    _git(remoto, "checkout", "-q", "-b", "trabalho-de-teste")
    return remoto, branch_padrao, sha_padrao


def _clonar(tmp: str, remoto: str, nome: str) -> str:
    workdir = os.path.join(tmp, nome)
    subprocess.run(["git", "clone", "-q", remoto, workdir], check=True)
    _git(workdir, "config", "user.email", "x@example.com")
    _git(workdir, "config", "user.name", "X")
    return workdir


def _tasks_json(tmp: str, *, estado: str, agente: str | None, nome: str = "tasks.json") -> str:
    caminho = os.path.join(tmp, nome)
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump({"tarefas": [{
            "id": CANARY_TASK_ID,
            "estado": estado,
            "area": "infraestrutura",
            "agente": agente,
            "arquivos": [CANARY_ARQUIVO],
            "dependencias": [],
            "prioridade_declarada": "P0",
            "capabilities_required": ["codigo"],
        }]}, fh)
    return caminho


class _TransporteContado:
    """Espião: nunca fala com a Anthropic de verdade, só conta chamadas e
    devolve o JSON de um ``StructuredPatch`` já pronto."""

    def __init__(self, conteudo: str) -> None:
        self.calls = 0
        self.conteudo = conteudo

    def send(self, request):
        self.calls += 1
        return TransportResponse(
            text=json.dumps({"files": [{"path": CANARY_ARQUIVO, "content": self.conteudo}]}),
            input_tokens=120, output_tokens=60,
        )


def _config(**overrides) -> RunnerDispatchConfig:
    campos = dict(enabled=True, mode="canary", canary_task_id=CANARY_TASK_ID)
    campos.update(overrides)
    return RunnerDispatchConfig(**campos)


def _registry_vazio() -> OperationalWorkerRegistry:
    return OperationalWorkerRegistry(InMemoryWorkerStateStore())


def _tarefa_do_canario() -> RunnerTask:
    return carregar_runner_task_de_arquivo(os.path.join(_pathsetup.REPO_ROOT, CANARY_TASK_FILE))


def _patch(conteudo: str) -> StructuredPatch:
    return StructuredPatch(files=(FileWrite(path=CANARY_ARQUIVO, content=conteudo),))


def _etapa_a(tmp: str, remoto: str, registry: OperationalWorkerRegistry, config: RunnerDispatchConfig) -> str:
    """Execução INICIAL: api-runner-canary-a, patch controlado
    (CANARY_STAGE=1), commit publicado. Devolve o checkpoint (SHA)."""
    tarefa = _tarefa_do_canario()
    workdir = _clonar(tmp, remoto, "workdir-a")
    outcome = executar_tarefa(
        tarefa, _patch("CANARY_STAGE=1\n"),
        config=config, repo_dir=workdir, state_git_remote=remoto,
        worker_id=CANARY_WORKER_A, worker_registry=registry,
    )
    assert outcome.result is not None and outcome.result.status == "NEEDS-AUDIT", outcome.result
    assert outcome.result.checkpoint_commit
    return outcome.result.checkpoint_commit


# ---------------------------------------------------------------------------
# G4 — bootstrap CANARY-ONLY dos dois api_runner.
# ---------------------------------------------------------------------------

def test_g4_workers_de_canario_nao_existem_por_default() -> None:
    ids = {w.worker_id for w in default_seed_workers()}
    assert CANARY_WORKER_A not in ids and CANARY_WORKER_B not in ids, (
        "os workers de canário nunca podem nascer do seed global — só do bootstrap gated"
    )
    registry = _registry_vazio()
    assert registry.find_by_name_or_id(CANARY_WORKER_A) is None
    print("OK  test_g4_workers_de_canario_nao_existem_por_default")


def test_g4_bootstrap_com_portao_fechado_nao_escreve_nada() -> None:
    registry = _registry_vazio()
    resultado = preparar_workers_do_canario(
        registry, config=_config(enabled=False), canonical_task_id=CANARY_TASK_ID
    )
    assert resultado.action == "BLOCKED"
    assert registry.find_by_name_or_id(CANARY_WORKER_A) is None
    assert registry.find_by_name_or_id(CANARY_WORKER_B) is None
    print("OK  test_g4_bootstrap_com_portao_fechado_nao_escreve_nada")


def test_g4_bootstrap_recusa_tarefa_diferente_do_canario_autorizado() -> None:
    registry = _registry_vazio()
    resultado = preparar_workers_do_canario(
        registry, config=_config(), canonical_task_id="outra-tarefa-qualquer"
    )
    assert resultado.action == "BLOCKED"
    assert registry.find_by_name_or_id(CANARY_WORKER_A) is None
    print("OK  test_g4_bootstrap_recusa_tarefa_diferente_do_canario_autorizado")


def test_g4_bootstrap_cria_exatamente_dois_workers_e_e_idempotente() -> None:
    registry = _registry_vazio()
    primeiro = preparar_workers_do_canario(registry, config=_config(), canonical_task_id=CANARY_TASK_ID)
    assert primeiro.action == "PREPARED"
    assert set(primeiro.criados) == {CANARY_WORKER_A, CANARY_WORKER_B}

    a = registry.find_by_name_or_id(CANARY_WORKER_A)
    assert a is not None and a.type == "api_runner" and a.status == "AVAILABLE"
    assert a.capabilities == ("codigo",) and a.can_execute and not a.can_audit
    assert a.never_merge is True and a.can_publish is False

    # Segunda passada NUNCA sobrescreve estado real mais novo.
    registry.upsert(replace(a, status="BUSY", current_task=CANARY_TASK_ID), message="teste")
    segundo = preparar_workers_do_canario(registry, config=_config(), canonical_task_id=CANARY_TASK_ID)
    assert segundo.action == "PREPARED" and segundo.criados == ()
    depois = registry.find_by_name_or_id(CANARY_WORKER_A)
    assert depois.status == "BUSY" and depois.current_task == CANARY_TASK_ID, (
        "um bootstrap repetido nunca pode rebaixar um worker em execução"
    )

    extras = [w for w in registry.list_workers() if w.type == "api_runner"]
    assert {w.worker_id for w in extras} == {CANARY_WORKER_A, CANARY_WORKER_B}
    print("OK  test_g4_bootstrap_cria_exatamente_dois_workers_e_e_idempotente")


def test_g4_heartbeat_de_worker_desconhecido_continua_rejeitado() -> None:
    registry = _registry_vazio()
    hb = RunnerHeartbeat(worker_id="api-runner-invasor", status="BUSY", task_id=CANARY_TASK_ID)
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.action == "REJECTED"
    assert registry.find_by_name_or_id("api-runner-invasor") is None
    print("OK  test_g4_heartbeat_de_worker_desconhecido_continua_rejeitado")


# ---------------------------------------------------------------------------
# G3 — canonical task vs execution task no portão.
# ---------------------------------------------------------------------------

def test_g3_execution_id_arbitrario_com_canonical_errado_e_bloqueado() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _ = _criar_remoto_local(tmp)
        workdir = _clonar(tmp, remoto, "w")
        tarefa = replace(_tarefa_do_canario(), task_id="qualquer-coisa--continuacao-deadbeef")
        outcome = executar_tarefa(
            tarefa, _patch("CANARY_STAGE=9\n"), config=_config(), repo_dir=workdir,
            state_git_remote=remoto, canonical_task_id="tarefa-que-nao-e-o-canario",
        )
        assert outcome.result.status == "BLOCKED"
        assert outcome.claimed is False and outcome.external_calls_made is False
    print("OK  test_g3_execution_id_arbitrario_com_canonical_errado_e_bloqueado")


def test_g3_execution_id_derivado_sem_canonical_explicito_e_bloqueado() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _ = _criar_remoto_local(tmp)
        workdir = _clonar(tmp, remoto, "w")
        derivado = derivar_task_id_de_continuacao(CANARY_TASK_ID, "abc1234def56")
        tarefa = replace(_tarefa_do_canario(), task_id=derivado)
        outcome = executar_tarefa(
            tarefa, _patch("CANARY_STAGE=9\n"), config=_config(), repo_dir=workdir,
            state_git_remote=remoto,  # canonical_task_id DELIBERADAMENTE ausente
        )
        assert outcome.result.status == "BLOCKED", (
            "um id derivado nunca pode passar só por 'parecer' com o canário — sem canônico "
            "explícito do código confiável, é BLOCKED"
        )
        assert outcome.claimed is False and outcome.external_calls_made is False
    print("OK  test_g3_execution_id_derivado_sem_canonical_explicito_e_bloqueado")


def test_g3_prefixo_nunca_autoriza_sozinho() -> None:
    config = _config()
    assert config.task_autorizada(CANARY_TASK_ID) is True
    assert config.task_autorizada(f"{CANARY_TASK_ID}--continuacao-abc1234") is False
    assert config.task_autorizada(f"{CANARY_TASK_ID}-extra") is False
    assert config.task_autorizada("x", canonical_task_id=CANARY_TASK_ID) is True
    assert config.task_autorizada("x", canonical_task_id=f"{CANARY_TASK_ID}--resume-abc1234") is False
    print("OK  test_g3_prefixo_nunca_autoriza_sozinho")


def test_g3_gerador_tambem_respeita_o_canonical_explicito() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _ = _criar_remoto_local(tmp)
        workdir = _clonar(tmp, remoto, "w")
        derivado = derivar_task_id_de_continuacao(CANARY_TASK_ID, "abc1234def56")
        tarefa = replace(_tarefa_do_canario(), task_id=derivado)
        transporte = _TransporteContado("CANARY_STAGE=2\n")

        class _LedgerFalso:
            def month_to_date_usd(self, **_kwargs) -> float:
                return 0.0

            def reserve_if_within_budget(self, candidate, **_kwargs) -> bool:
                return True

            def append(self, record) -> None:
                pass

        sem_canonical = gerar_patch_via_claude(
            tarefa, config=_config(), repo_dir=workdir, usage_ledger=_LedgerFalso(), budget_usd=20.0,
            transport=transporte,
        )
        assert sem_canonical.status == "blocked"
        assert transporte.calls == 0, "gerador bloqueado nunca pode ter chamado a Anthropic"

        com_canonical = gerar_patch_via_claude(
            tarefa, config=_config(), repo_dir=workdir, usage_ledger=_LedgerFalso(), budget_usd=20.0,
            transport=transporte, canonical_task_id=CANARY_TASK_ID,
        )
        assert com_canonical.status == "ok", com_canonical.reason
        assert transporte.calls == 1
    print("OK  test_g3_gerador_tambem_respeita_o_canonical_explicito")


# ---------------------------------------------------------------------------
# Etapas A + B — execução inicial, checkpoint real, handoff real, despacho.
# ---------------------------------------------------------------------------

def test_etapa_a_execucao_inicial_publica_heartbeats_e_checkpoint() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _ = _criar_remoto_local(tmp)
        registry = _registry_vazio()
        config = _config()
        preparar_workers_do_canario(registry, config=config, canonical_task_id=CANARY_TASK_ID)

        checkpoint = _etapa_a(tmp, remoto, registry, config)

        conteudo = _git(remoto, "show", f"runner/{CANARY_TASK_ID}:{CANARY_ARQUIVO}")
        assert conteudo == "CANARY_STAGE=1", conteudo
        worker = registry.find_by_name_or_id(CANARY_WORKER_A)
        assert worker.status == "OFFLINE", "o heartbeat final da execução deixa o worker OFFLINE"
        assert worker.current_task is None
        assert len(checkpoint) == 40
    print("OK  test_etapa_a_execucao_inicial_publica_heartbeats_e_checkpoint")


def _montar_etapa_b(tmp: str, *, conteudo_gerado: str = "CANARY_STAGE=2\n"):
    """Deixa tudo pronto no estado pós-Etapa A e devolve o material da
    Etapa B (sem ainda processar o checkpoint)."""
    remoto, branch_padrao, sha_padrao = _criar_remoto_local(tmp)
    registry = _registry_vazio()
    config = _config()
    preparar_workers_do_canario(registry, config=config, canonical_task_id=CANARY_TASK_ID)
    checkpoint = _etapa_a(tmp, remoto, registry, config)
    tasks_path = _tasks_json(tmp, estado="IN-PROGRESS", agente=CANARY_WORKER_A)
    transporte = _TransporteContado(conteudo_gerado)
    return remoto, branch_padrao, sha_padrao, registry, config, checkpoint, tasks_path, transporte


def test_etapa_b_checkpoint_real_executa_handoff_e_despacha_continuacao() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, branch_padrao, sha_padrao, registry, config, checkpoint, tasks_path, transporte = (
            _montar_etapa_b(tmp)
        )
        workdir = _clonar(tmp, remoto, "workdir-b")

        outcome = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint,
            config=config, repo_dir=workdir, tasks_json_path=tasks_path,
            state_git_remote=remoto, transport=transporte,
        )

        assert outcome.action == "DISPATCHED", outcome.reason
        # G1 — heartbeat REAL de LIMIT, com last_checkpoint de verdade.
        assert outcome.heartbeat is not None and outcome.heartbeat.action == "APPLIED"
        assert outcome.heartbeat.record.last_checkpoint == checkpoint
        assert outcome.heartbeat.sinal_limite is not None
        assert outcome.heartbeat.sinal_limite.checkpoint_seguro == checkpoint

        # Fase E de verdade: B reservado, claim persistido.
        assert outcome.handoff.action == "HANDOFF_EXECUTED"
        assert outcome.handoff.new_worker_id == CANARY_WORKER_B
        assert outcome.handoff.task_id == CANARY_TASK_ID, "o canônico nunca muda"

        # G2 — a continuação foi de fato despachada, com execution id NOVO
        # e canônico estável.
        esperado = derivar_task_id_de_continuacao(CANARY_TASK_ID, checkpoint)
        assert outcome.handoff.runner_task.task_id == esperado
        assert esperado != CANARY_TASK_ID
        assert outcome.dispatch is not None and outcome.dispatch.result.status == "NEEDS-AUDIT", (
            outcome.dispatch.result
        )
        assert outcome.dispatch.result.task_id == esperado
        assert transporte.calls == 1, "exatamente uma chamada (falsa) de geração para a continuação"

        # allowed_files nunca ampliados.
        assert outcome.handoff.runner_task.allowed_files == _tarefa_do_canario().allowed_files
        # A instrução ORIGINAL viaja junto (G6) — o novo runner sabe qual
        # transição fazer.
        assert "CANARY_STAGE=2" in outcome.handoff.runner_task.instructions

        # Estado final do arquivo do canário e da branch padrão.
        conteudo = _git(remoto, "show", f"runner/{CANARY_TASK_ID}:{CANARY_ARQUIVO}")
        assert conteudo == "CANARY_STAGE=2", conteudo
        assert _git(remoto, "rev-parse", branch_padrao) == sha_padrao, (
            "nada pode ter sido escrito na branch padrão"
        )
    print("OK  test_etapa_b_checkpoint_real_executa_handoff_e_despacha_continuacao")


def test_etapa_b_replay_do_mesmo_checkpoint_nao_duplica_execucao() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        workdir = _clonar(tmp, remoto, "workdir-b")
        comum = dict(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=workdir, tasks_json_path=tasks_path, state_git_remote=remoto,
            transport=transporte,
        )
        primeiro = processar_checkpoint_de_limite(**comum)
        assert primeiro.action == "DISPATCHED"
        assert transporte.calls == 1

        segundo = processar_checkpoint_de_limite(**comum)
        assert segundo.action != "DISPATCHED", segundo.reason
        assert segundo.dispatch is None
        assert transporte.calls == 1, "redelivery do mesmo evento nunca gera uma segunda chamada paga"
    print("OK  test_etapa_b_replay_do_mesmo_checkpoint_nao_duplica_execucao")


def test_etapa_b_dois_processamentos_concorrentes_so_um_despacha() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        workdirs = [_clonar(tmp, remoto, f"workdir-conc-{i}") for i in range(2)]
        barreira = threading.Barrier(2)
        resultados: list = []
        trava = threading.Lock()

        def rodar(workdir: str) -> None:
            barreira.wait()
            saida = processar_checkpoint_de_limite(
                registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
                branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
                repo_dir=workdir, tasks_json_path=tasks_path, state_git_remote=remoto,
                transport=transporte,
            )
            with trava:
                resultados.append(saida)

        threads = [threading.Thread(target=rodar, args=(w,)) for w in workdirs]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        despachados = [r for r in resultados if r.action == "DISPATCHED"]
        assert len(despachados) == 1, [r.action for r in resultados]
        assert transporte.calls == 1, "a mesma continuação nunca pode ser gerada/paga duas vezes"
    print("OK  test_etapa_b_dois_processamentos_concorrentes_so_um_despacha")


# ---------------------------------------------------------------------------
# Etapa C — retorno do worker pela Inbox (#88) e retomada da Fase F.
# ---------------------------------------------------------------------------

def test_etapa_c_comando_da_inbox_retoma_pela_fase_f_e_chega_ao_stage_3() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, branch_padrao, sha_padrao, registry, config, checkpoint, tasks_path, transporte = (
            _montar_etapa_b(tmp)
        )
        workdir_b = _clonar(tmp, remoto, "workdir-b")
        etapa_b = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=workdir_b, tasks_json_path=tasks_path, state_git_remote=remoto,
            transport=transporte,
        )
        assert etapa_b.action == "DISPATCHED"
        checkpoint_2 = etapa_b.dispatch.result.checkpoint_commit
        assert checkpoint_2 and checkpoint_2 != checkpoint

        # B bate no limite com o checkpoint NOVO — mesmo caminho real de
        # evento de checkpoint (aqui o pool já está pausado/sem candidato,
        # então nada é executado; o que importa é o last_checkpoint).
        limite_b = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_B, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint_2, config=config,
            repo_dir=workdir_b, tasks_json_path=tasks_path, state_git_remote=remoto,
            transport=transporte,
        )
        assert limite_b.action == "HEARTBEAT_APPLIED", limite_b.reason
        assert limite_b.dispatch is None
        worker_b = registry.find_by_name_or_id(CANARY_WORKER_B)
        assert worker_b.status == "LIMIT" and worker_b.last_checkpoint == checkpoint_2

        # Comando REAL da Inbox #88 — o texto que José escreveria.
        comando = parse_worker_command("API Runner Canary B disponível")
        assert comando == WorkerCommand(action="SET_AVAILABLE", worker_name="API Runner Canary B")

        tasks_retomada = _tasks_json(
            tmp, estado="BLOCKED-LIMIT", agente=CANARY_WORKER_B, nome="tasks-retomada.json"
        )
        transporte_c = _TransporteContado("CANARY_STAGE=3\n")
        workdir_c = _clonar(tmp, remoto, "workdir-c")
        confirmacao = aplicar_comando(
            registry, comando, tasks_json_path=tasks_retomada, repo_dir=workdir_c,
            config=config, state_git_remote=remoto, transport=transporte_c,
        )

        assert "NEEDS-AUDIT" in confirmacao, confirmacao
        assert transporte_c.calls == 1, "a retomada nunca pode gerar uma segunda chamada paga"
        conteudo = _git(remoto, "show", f"runner/{CANARY_TASK_ID}:{CANARY_ARQUIVO}")
        assert conteudo == "CANARY_STAGE=3", conteudo

        # Terceiro execution id, distinto dos dois anteriores, canônico estável.
        execution_2 = derivar_task_id_de_continuacao(CANARY_TASK_ID, checkpoint)
        execution_3 = f"{CANARY_TASK_ID}--resume-{checkpoint_2[:12]}"
        assert len({CANARY_TASK_ID, execution_2, execution_3}) == 3
        estado_runner = json.loads(
            subprocess.run(
                ["git", "-C", remoto, "show", "coordinator-state-runner:state.json"],
                capture_output=True, text=True, check=True,
            ).stdout
        )
        reivindicados = set(estado_runner.get("claims", {}) or estado_runner.get("keys", []) or [])
        texto_estado = json.dumps(estado_runner)
        assert execution_3 in texto_estado, (
            f"o claim da retomada precisa existir na branch de estado ({reivindicados!r})"
        )
        assert _git(remoto, "rev-parse", branch_padrao) == sha_padrao, (
            "nenhuma etapa pode ter escrito na branch padrão"
        )
    print("OK  test_etapa_c_comando_da_inbox_retoma_pela_fase_f_e_chega_ao_stage_3")


def test_pipeline_real_do_observe_executa_a_fase_e_no_checkpoint() -> None:
    """G1 pelo caminho REAL do Coordinator: um comentário de checkpoint
    numa Issue -> ``github_event`` -> ``observe`` (audit_mode, com o
    mesmo wiring de Runner que o CLI já passa) -> heartbeat/handoff/
    despacho de verdade. Nenhuma chamada paga: o transporte é falso."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto, branch_padrao, sha_padrao, registry, config, checkpoint, tasks_path, transporte = (
            _montar_etapa_b(tmp)
        )
        workdir = _clonar(tmp, remoto, "workdir-observe")
        corpo = "\n".join([
            "MATÉRIA/ÁREA: Infraestrutura",
            f"TAREFA: {CANARY_TASK_ID}",
            "ESTADO: BLOCKED-LIMIT",
            f"AGENTE: {CANARY_WORKER_A}",
            f"BRANCH: runner/{CANARY_TASK_ID}",
            f"COMMIT: {checkpoint}",
            "",
        ])
        evento = build_event_from_github_context(
            "issue_comment",
            {
                "action": "created",
                "issue": {"number": 105},
                "comment": {"id": 4242, "body": corpo, "user": {"login": "Repassomed"}},
            },
            "Repassomed/Repasso-Med-Site-",
        )
        resultado = observe(
            evento,
            config=Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE),
            dedup=Deduplicator(InMemoryStore()),
            ledger=UsageLedger(os.path.join(tmp, "usage.json")),
            workers=[], audit_mode=True, worker_registry=registry, transport=transporte,
            runner_tasks_json_path=tasks_path, runner_repo_dir=workdir,
            runner_dispatch_config=config, runner_state_git_remote=remoto,
        )

        assert resultado.status == "OBSERVED"
        assert resultado.call_attempted is False, "o caminho do checkpoint nunca chama a Anthropic"
        assert "DISPATCHED" in resultado.merge_card, resultado.merge_card
        assert transporte.calls == 1, "só a geração da continuação — e com transporte falso"
        conteudo = _git(remoto, "show", f"runner/{CANARY_TASK_ID}:{CANARY_ARQUIVO}")
        assert conteudo == "CANARY_STAGE=2", conteudo
        assert _git(remoto, "rev-parse", branch_padrao) == sha_padrao
    print("OK  test_pipeline_real_do_observe_executa_a_fase_e_no_checkpoint")


# ---------------------------------------------------------------------------
# G5 — comando de retorno estritamente controlado.
# ---------------------------------------------------------------------------

def test_g5_parser_aceita_so_os_dois_nomes_de_canario() -> None:
    assert parse_worker_command("API Runner Canary A voltou").action == "SET_AVAILABLE"
    assert parse_worker_command("api-runner-canary-b disponível").action == "SET_AVAILABLE"
    assert parse_worker_command("API Runner Canary C disponível") is None
    assert parse_worker_command("api-runner-qualquer-um voltou") is None
    assert parse_worker_command("Runner disponível") is None
    # A regra dos Claude 1-4 continua EXATAMENTE a mesma.
    assert parse_worker_command("Claude 2 voltou").action == "SET_AVAILABLE"
    assert parse_worker_command("Claude 3 entrou em limite").action == "SET_LIMIT"
    assert e_worker_de_canario("API Runner Canary B") and not e_worker_de_canario("Claude 2")
    print("OK  test_g5_parser_aceita_so_os_dois_nomes_de_canario")


def test_g5_comando_nunca_cadastra_um_worker_de_canario() -> None:
    registry = _registry_vazio()
    confirmacao = aplicar_comando(
        registry, WorkerCommand(action="SET_AVAILABLE", worker_name="API Runner Canary B")
    )
    assert "recusado" in confirmacao.lower(), confirmacao
    assert registry.find_by_name_or_id(CANARY_WORKER_B) is None, (
        "um comando nunca pode criar um worker de canário — só o bootstrap gated"
    )

    registro = aplicar_comando(
        registry,
        WorkerCommand(action="REGISTER", worker_name="API Runner Canary A", capabilities=("codigo",)),
    )
    assert "recusado" in registro.lower(), registro
    assert registry.find_by_name_or_id(CANARY_WORKER_A) is None

    # Um worker humano desconhecido continua sendo autocriado como antes.
    aplicar_comando(registry, WorkerCommand(action="SET_AVAILABLE", worker_name="Claude 4"))
    assert registry.find_by_name_or_id("Claude 4").status == "AVAILABLE"
    print("OK  test_g5_comando_nunca_cadastra_um_worker_de_canario")


def test_g5_comando_move_estado_de_worker_de_canario_ja_existente() -> None:
    registry = _registry_vazio()
    preparar_workers_do_canario(registry, config=_config(), canonical_task_id=CANARY_TASK_ID)
    confirmacao = aplicar_comando(
        registry, WorkerCommand(action="SET_LIMIT", worker_name="API Runner Canary A")
    )
    assert "recusado" not in confirmacao.lower(), confirmacao
    assert registry.find_by_name_or_id(CANARY_WORKER_A).status == "LIMIT"
    print("OK  test_g5_comando_move_estado_de_worker_de_canario_ja_existente")


# ---------------------------------------------------------------------------
# Segurança.
# ---------------------------------------------------------------------------

def test_seguranca_portao_fechado_zero_execucao() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, _, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        workdir = _clonar(tmp, remoto, "workdir-gate")
        antes = [w.to_dict() for w in registry.list_workers()]
        outcome = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=_config(enabled=False),
            repo_dir=workdir, tasks_json_path=tasks_path, state_git_remote=remoto,
            transport=transporte,
        )
        assert outcome.action == "SKIPPED"
        assert outcome.heartbeat is None and outcome.handoff is None and outcome.dispatch is None
        assert [w.to_dict() for w in registry.list_workers()] == antes, (
            "portão fechado não pode alterar nem o Worker Registry"
        )
        assert transporte.calls == 0
    print("OK  test_seguranca_portao_fechado_zero_execucao")


def test_seguranca_tarefa_fora_do_canario_nao_ativa_o_caminho_operacional() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        workdir = _clonar(tmp, remoto, "workdir-outra")
        outcome = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id="dermatologia-revisao",
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=workdir, tasks_json_path=tasks_path, state_git_remote=remoto,
            transport=transporte,
        )
        assert outcome.action == "SKIPPED"
        assert transporte.calls == 0
    print("OK  test_seguranca_tarefa_fora_do_canario_nao_ativa_o_caminho_operacional")


def test_seguranca_worker_desconhecido_bloqueia_antes_do_handoff() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        workdir = _clonar(tmp, remoto, "workdir-fantasma")
        outcome = processar_checkpoint_de_limite(
            registry=registry, agente="Worker Fantasma", canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=workdir, tasks_json_path=tasks_path, state_git_remote=remoto,
            transport=transporte,
        )
        assert outcome.action == "BLOCKED"
        assert outcome.heartbeat is not None and outcome.heartbeat.action == "REJECTED"
        assert outcome.handoff is None and outcome.dispatch is None
        assert registry.find_by_name_or_id("Worker Fantasma") is None
        assert transporte.calls == 0
    print("OK  test_seguranca_worker_desconhecido_bloqueia_antes_do_handoff")


def test_seguranca_checkpoint_inexistente_nunca_vira_checkpoint_seguro() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        workdir = _clonar(tmp, remoto, "workdir-fake")
        falso = ("f" if checkpoint[0] != "f" else "e") + checkpoint[1:]
        outcome = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=falso, config=config,
            repo_dir=workdir, tasks_json_path=tasks_path, state_git_remote=remoto,
            transport=transporte,
        )
        assert outcome.action == "HEARTBEAT_APPLIED"
        assert outcome.handoff is None and outcome.dispatch is None
        assert registry.find_by_name_or_id(CANARY_WORKER_A).last_checkpoint is None
        assert transporte.calls == 0
    print("OK  test_seguranca_checkpoint_inexistente_nunca_vira_checkpoint_seguro")


def test_seguranca_orcamento_bloqueado_zero_chamada() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        workdir = _clonar(tmp, remoto, "workdir-orcamento")
        tarefa_continuacao = replace(
            _tarefa_do_canario(),
            task_id=derivar_task_id_de_continuacao(CANARY_TASK_ID, checkpoint),
            checkpoint_commit=checkpoint,
        )
        resultado_handoff = HandoffExecutionResult(
            action="HANDOFF_EXECUTED", reason="handoff de teste", task_id=CANARY_TASK_ID,
            previous_worker_id=CANARY_WORKER_A, new_worker_id=CANARY_WORKER_B,
            new_worker_type="api_runner", checkpoint_commit=checkpoint, runner_task=tarefa_continuacao,
        )
        outcome = despachar_continuacao_de_handoff(
            resultado_handoff, config=config, repo_dir=workdir, state_git_remote=remoto,
            worker_registry=registry, canonical_task_id=CANARY_TASK_ID,
            transport=transporte, budget_usd=0.0,
        )
        assert outcome is not None and outcome.result.status in ("BLOCKED", "FAILED"), outcome.result
        assert transporte.calls == 0, "orçamento bloqueado nunca pode chegar a uma chamada paga"
    print("OK  test_seguranca_orcamento_bloqueado_zero_chamada")


def test_seguranca_human_session_nunca_e_iniciada_automaticamente() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _ = _criar_remoto_local(tmp)
        registry = _registry_vazio()
        config = _config()
        preparar_workers_do_canario(registry, config=config, canonical_task_id=CANARY_TASK_ID)
        # Só um humano disponível: o handoff acontece, o despacho não.
        registry.upsert(
            replace(registry.find_by_name_or_id(CANARY_WORKER_B), status="OFFLINE"),
            message="teste: B indisponível",
        )
        registry.upsert(
            WorkerRecord(
                worker_id="claude-2", display_name="Claude 2", type="human_session",
                status="AVAILABLE", capabilities=("codigo",), can_execute=True,
            ),
            message="teste: humano disponível",
        )
        checkpoint = _etapa_a(tmp, remoto, registry, config)
        tasks_path = _tasks_json(tmp, estado="IN-PROGRESS", agente=CANARY_WORKER_A)
        transporte = _TransporteContado("CANARY_STAGE=2\n")
        workdir = _clonar(tmp, remoto, "workdir-humano")

        outcome = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=workdir, tasks_json_path=tasks_path, state_git_remote=remoto,
            transport=transporte,
        )
        assert outcome.action == "HANDOFF_EXECUTED", outcome.reason
        assert outcome.handoff.new_worker_type == "human_session"
        assert outcome.dispatch is None, "human_session nunca é despachada automaticamente"
        assert transporte.calls == 0
        humano = registry.find_by_name_or_id("claude-2")
        assert humano.status == "AVAILABLE" and humano.current_task == CANARY_TASK_ID, (
            "a reserva existe, mas nunca fingindo execução iniciada (nunca BUSY)"
        )
    print("OK  test_seguranca_human_session_nunca_e_iniciada_automaticamente")


def test_seguranca_despacho_so_acontece_para_handoff_executado_em_api_runner() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _ = _criar_remoto_local(tmp)
        workdir = _clonar(tmp, remoto, "w")
        registry = _registry_vazio()
        for acao, tipo in (("WAIT", "api_runner"), ("BLOCKED", "api_runner"), ("POOL_PAUSED", "api_runner")):
            resultado = HandoffExecutionResult(action=acao, reason="teste", task_id=CANARY_TASK_ID,
                                                new_worker_type=tipo)
            assert despachar_continuacao_de_handoff(
                resultado, config=_config(), repo_dir=workdir, state_git_remote=remoto,
                worker_registry=registry, canonical_task_id=CANARY_TASK_ID,
            ) is None, f"{acao} nunca pode despachar nada"
    print("OK  test_seguranca_despacho_so_acontece_para_handoff_executado_em_api_runner")


def test_seguranca_modulos_novos_sem_merge_deploy_ou_force_push() -> None:
    for nome in ("checkpoint_handoff.py", "canary_bootstrap.py"):
        caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, nome)
        with open(caminho, encoding="utf-8") as fh:
            fonte = fh.read()
        for proibido in ('"--force"', "'--force'", "force-with-lease", '"merge"', "merge_pull_request",
                         "netlify", "supabase", "deploy("):
            assert proibido not in fonte, f"{nome} nunca pode conter {proibido!r}"
        assert "subprocess" not in fonte, (
            f"{nome} não executa processo externo por conta própria — quem faz git é git_state/"
            "runner_dispatch/runner_resume, já auditados"
        )
    print("OK  test_seguranca_modulos_novos_sem_merge_deploy_ou_force_push")


def test_seguranca_runner_task_do_canario_e_minima_e_sem_publicacao() -> None:
    tarefa = _tarefa_do_canario()
    assert tarefa.task_id == CANARY_TASK_ID
    assert tarefa.priority is Priority.P0
    assert tarefa.source_issue == 105
    assert tarefa.branch == f"runner/{CANARY_TASK_ID}"
    assert tarefa.allowed_files == (CANARY_ARQUIVO,)
    assert tarefa.capabilities_required == ("codigo",)
    assert tarefa.risk_level == "BAIXO" and tarefa.policy_level == "C"
    assert tarefa.jose_authorized is False and tarefa.publication_required is False
    assert tarefa.checkpoint_commit is None
    assert tarefa.never_merge is True and tarefa.can_publish is False
    for estagio in ("CANARY_STAGE=1", "CANARY_STAGE=2", "CANARY_STAGE=3"):
        assert estagio in tarefa.instructions
    print("OK  test_seguranca_runner_task_do_canario_e_minima_e_sem_publicacao")


def test_seguranca_workflow_prepara_worker_antes_do_dispatch() -> None:
    caminho = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "coordinator-runner.yml")
    with open(caminho, encoding="utf-8") as fh:
        texto = fh.read()
    # Os PASSOS de verdade (linhas `- name:`), nunca a prosa do cabeçalho.
    idx_gate = texto.index("- name: Confirmar os portões em código")
    idx_bootstrap = texto.index("- name: Preparar os workers do canário")
    idx_dispatch = texto.index("- name: Rodar o Runner Dispatch sobre a RunnerTask do canário")
    assert idx_gate < idx_bootstrap < idx_dispatch, (
        "o bootstrap precisa rodar DEPOIS da confirmação dos portões e ANTES do Runner Dispatch"
    )
    bloco = texto[idx_dispatch:]
    assert f"--worker-id {CANARY_WORKER_A}" in bloco
    assert "--worker-state-git-remote" in bloco
    assert "inputs:" not in texto, "o gatilho continua sem nenhum input livre"
    for proibido in ("create_pull_request", "gh pr create", "--force", "netlify deploy"):
        assert proibido not in texto
    print("OK  test_seguranca_workflow_prepara_worker_antes_do_dispatch")


def main() -> int:
    testes = [
        test_g4_workers_de_canario_nao_existem_por_default,
        test_g4_bootstrap_com_portao_fechado_nao_escreve_nada,
        test_g4_bootstrap_recusa_tarefa_diferente_do_canario_autorizado,
        test_g4_bootstrap_cria_exatamente_dois_workers_e_e_idempotente,
        test_g4_heartbeat_de_worker_desconhecido_continua_rejeitado,
        test_g3_execution_id_arbitrario_com_canonical_errado_e_bloqueado,
        test_g3_execution_id_derivado_sem_canonical_explicito_e_bloqueado,
        test_g3_prefixo_nunca_autoriza_sozinho,
        test_g3_gerador_tambem_respeita_o_canonical_explicito,
        test_etapa_a_execucao_inicial_publica_heartbeats_e_checkpoint,
        test_etapa_b_checkpoint_real_executa_handoff_e_despacha_continuacao,
        test_etapa_b_replay_do_mesmo_checkpoint_nao_duplica_execucao,
        test_etapa_b_dois_processamentos_concorrentes_so_um_despacha,
        test_etapa_c_comando_da_inbox_retoma_pela_fase_f_e_chega_ao_stage_3,
        test_pipeline_real_do_observe_executa_a_fase_e_no_checkpoint,
        test_g5_parser_aceita_so_os_dois_nomes_de_canario,
        test_g5_comando_nunca_cadastra_um_worker_de_canario,
        test_g5_comando_move_estado_de_worker_de_canario_ja_existente,
        test_seguranca_portao_fechado_zero_execucao,
        test_seguranca_tarefa_fora_do_canario_nao_ativa_o_caminho_operacional,
        test_seguranca_worker_desconhecido_bloqueia_antes_do_handoff,
        test_seguranca_checkpoint_inexistente_nunca_vira_checkpoint_seguro,
        test_seguranca_orcamento_bloqueado_zero_chamada,
        test_seguranca_human_session_nunca_e_iniciada_automaticamente,
        test_seguranca_despacho_so_acontece_para_handoff_executado_em_api_runner,
        test_seguranca_modulos_novos_sem_merge_deploy_ou_force_push,
        test_seguranca_runner_task_do_canario_e_minima_e_sem_publicacao,
        test_seguranca_workflow_prepara_worker_antes_do_dispatch,
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
