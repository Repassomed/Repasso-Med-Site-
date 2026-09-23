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

import contextlib
import hashlib
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
from coordinator.handoff import worker_retomando_deve_assumir
from coordinator.heartbeat import aplicar_heartbeat
from coordinator.observe import observe
from coordinator.runner_contract import RunnerHeartbeat, RunnerTask
from coordinator.runner_dispatch import (
    ALLOWED_VALIDATION_COMMANDS,
    CANARY_VALIDATION_COMMAND_KEYS,
    FileWrite,
    RunnerDispatchConfig,
    StructuredPatch,
    carregar_runner_task_de_arquivo,
    executar_tarefa,
)
from coordinator.runner_generate import gerar_patch_via_claude
from coordinator.scheduler import TaskRecord, load_tasks_from_tasks_json
from coordinator.task_ownership import (
    OperationalWorkerSnapshot,
    visao_operacional_da_tarefa,
)
from coordinator.worker_commands import (
    WorkerCommand,
    _deve_preservar_reserva,
    aplicar_comando,
    parse_worker_command,
    reagir_a_retorno_de_worker,
)
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


def _tasks_json(tmp: str, *, estado: str = "IN-PROGRESS", agente: str | None = CANARY_WORKER_A) -> str:
    """O ÚNICO ``coordination/tasks.json`` do canário inteiro (achado
    G8-A da auditoria do PR #118).

    Os defaults são a PREPARAÇÃO ADMINISTRATIVA que José faz ANTES de
    ligar o canário — declarar a tarefa em execução e quem a começa. A
    partir daí este arquivo é read-only: as Etapas A, B e C usam ESTE
    caminho, byte a byte, sem nenhuma edição, merge ou segundo arquivo no
    meio do fluxo. Depois do handoff A -> B o ownership vivo passa a vir
    do Worker Registry (``task_ownership.visao_operacional_da_tarefa``),
    nunca daqui."""
    caminho = os.path.join(tmp, "tasks.json")
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


def _impressao_digital(caminho: str) -> str:
    """SHA-256 do arquivo inteiro — a prova byte a byte de que
    ``coordination/tasks.json`` não foi tocado durante o canário."""
    with open(caminho, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


# Comandos de teste por trás da chave REAL ``coordinator-suite``. A chave
# nunca muda — é ela que os caminhos confiáveis propagam e é ela que os
# testes verificam em ``validation_commands_run``. O que muda é só o
# comando por trás dela, porque a suíte de verdade não roda dentro de um
# checkout falso de dois arquivos. Nenhum shell livre: continua sendo uma
# entrada de allowlist, com argv fixo em código.
_VALIDACAO_OK: dict[str, tuple[str, ...]] = {
    "coordinator-suite": (sys.executable, "-c", "pass"),
}
_VALIDACAO_FALHA: dict[str, tuple[str, ...]] = {
    "coordinator-suite": (sys.executable, "-c", "raise SystemExit(1)"),
}


# Retrato da allowlist REAL, tirado no import, ANTES de qualquer troca —
# é contra ele que os testes verificam o que ``coordinator-suite`` de fato
# roda em produção.
_ALLOWLIST_REAL: dict[str, tuple[str, ...]] = dict(ALLOWED_VALIDATION_COMMANDS)


@contextlib.contextmanager
def _allowlist(tabela: dict[str, tuple[str, ...]]):
    """Troca o conteúdo de ``ALLOWED_VALIDATION_COMMANDS`` só enquanto o
    bloco roda, e sempre restaura (try/finally).

    Existe porque os caminhos automáticos NÃO têm — de propósito — nenhum
    parâmetro de injeção de allowlist: em produção eles usam a tabela do
    módulo e ponto. Trocar a tabela aqui é o único jeito de exercitar o
    caminho REAL de ponta a ponta sem rodar a suíte inteira dentro de
    cada teste."""
    original = dict(ALLOWED_VALIDATION_COMMANDS)
    ALLOWED_VALIDATION_COMMANDS.clear()
    ALLOWED_VALIDATION_COMMANDS.update(tabela)
    try:
        yield
    finally:
        ALLOWED_VALIDATION_COMMANDS.clear()
        ALLOWED_VALIDATION_COMMANDS.update(original)


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
        # Achado G8-B: a execução inicial é exatamente o que o workflow
        # faz (`--validation-command-keys coordinator-suite`). As Etapas
        # B e C precisam rodar a MESMA chave — é o que os testes abaixo
        # verificam em `validation_commands_run`.
        validation_command_keys=CANARY_VALIDATION_COMMAND_KEYS,
    )
    assert [c["key"] for c in outcome.validation_commands_run] == ["coordinator-suite"], (
        outcome.validation_commands_run
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
    # O ÚNICO tasks.json do canário — preparação administrativa feita
    # ANTES da Etapa A e nunca mais tocada (achado G8-A).
    tasks_path = _tasks_json(tmp)
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
    """Etapas A -> B -> C com UM ÚNICO ``coordination/tasks.json``,
    byte a byte (achado G8-A da auditoria do PR #118).

    O arquivo é escrito UMA vez, como preparação administrativa ANTES do
    canário (``IN-PROGRESS``, agente ``api-runner-canary-a``), e nunca
    mais é tocado: depois do handoff A -> B, quem diz que a tarefa é do
    B é o Worker Registry, não este arquivo. No fim, a impressão digital
    SHA-256 precisa ser exatamente a mesma do começo."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto, branch_padrao, sha_padrao, registry, config, checkpoint, tasks_path, transporte = (
            _montar_etapa_b(tmp)
        )
        digital_inicial = _impressao_digital(tasks_path)
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

        # G8-A: NENHUM segundo arquivo, nenhuma edição. É o MESMO
        # tasks_path das Etapas A e B, ainda dizendo IN-PROGRESS/agente A.
        # A Fase F reconhece o B como dono porque o estado operacional
        # dele imediatamente antes do SET_AVAILABLE (LIMIT + current_task
        # canônico + checkpoint) prova isso — não porque alguém mudou a
        # main no meio do fluxo.
        declarativo = json.load(open(tasks_path, encoding="utf-8"))["tarefas"][0]
        assert declarativo["estado"] == "IN-PROGRESS", declarativo
        assert declarativo["agente"] == CANARY_WORKER_A, declarativo

        transporte_c = _TransporteContado("CANARY_STAGE=3\n")
        workdir_c = _clonar(tmp, remoto, "workdir-c")
        confirmacao = aplicar_comando(
            registry, comando, tasks_json_path=tasks_path, repo_dir=workdir_c,
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
        # G8-A, a prova central: o declarativo atravessou as três etapas
        # sem uma única alteração.
        assert _impressao_digital(tasks_path) == digital_inicial, (
            "coordination/tasks.json precisa ficar byte a byte igual do início ao fim do canário"
        )
    print("OK  test_etapa_c_comando_da_inbox_retoma_pela_fase_f_e_chega_ao_stage_3")


# ---------------------------------------------------------------------------
# G8-A — ownership OPERACIONAL: o dono vem do Worker Registry, nunca do
# `agente` declarativo, e coordination/tasks.json nunca é escrito.
# ---------------------------------------------------------------------------

def _tarefa_declarativa(*, estado: str = "IN-PROGRESS", agente: str | None = CANARY_WORKER_A) -> TaskRecord:
    return TaskRecord(
        id=CANARY_TASK_ID, estado=estado, area="infraestrutura", agente=agente,
        arquivos=(CANARY_ARQUIVO,), dependencias=(), capabilities_required=("codigo",),
    )


def _worker(worker_id: str, status: str, current_task: str | None) -> WorkerRecord:
    return WorkerRecord(
        worker_id=worker_id, display_name=worker_id, type="api_runner", status=status,
        capabilities=("codigo",), current_task=current_task, can_execute=True,
    )


def test_g8a_dono_vem_do_registro_e_vence_o_agente_declarativo() -> None:
    """Depois do handoff A -> B, o declarativo ainda diz A. O registro
    diz B. Quem manda é o registro — e o declarativo sai intacto."""
    declarativa = _tarefa_declarativa(agente=CANARY_WORKER_A, estado="IN-PROGRESS")
    workers = [
        _worker(CANARY_WORKER_A, "AVAILABLE", None),
        _worker(CANARY_WORKER_B, "LIMIT", CANARY_TASK_ID),
    ]
    visao = visao_operacional_da_tarefa(declarativa, workers=workers)
    assert visao.fonte == "registro", visao.reason
    assert visao.dono_worker_id == CANARY_WORKER_B
    assert visao.tarefa.agente == CANARY_WORKER_B
    assert visao.tarefa.estado == "BLOCKED-LIMIT"
    # Só agente/estado mudam — reserva, prioridade e dependências vêm
    # INTEIRAS do declarativo.
    assert visao.tarefa.id == declarativa.id
    assert visao.tarefa.arquivos == declarativa.arquivos
    assert visao.tarefa.dependencias == declarativa.dependencias
    assert visao.tarefa.capabilities_required == declarativa.capabilities_required
    # E o objeto declarativo original continua exatamente como estava.
    assert declarativa.agente == CANARY_WORKER_A and declarativa.estado == "IN-PROGRESS"
    print("OK  test_g8a_dono_vem_do_registro_e_vence_o_agente_declarativo")


def test_g8a_estado_declarativo_terminal_nunca_e_reaberto() -> None:
    """A proteção "não refaz o que já foi feito" continua inteira: um
    worker com registro velho não reabre uma tarefa já auditada."""
    for estado in ("NEEDS-AUDIT", "DONE", "MERGE-READY", "BLOCKED", "NEEDS-FIX"):
        declarativa = _tarefa_declarativa(estado=estado, agente=None)
        workers = [_worker(CANARY_WORKER_B, "LIMIT", CANARY_TASK_ID)]
        visao = visao_operacional_da_tarefa(declarativa, workers=workers)
        assert visao.fonte == "declarativo", (estado, visao.reason)
        assert visao.dono_worker_id is None
        assert visao.tarefa.estado == estado
    print("OK  test_g8a_estado_declarativo_terminal_nunca_e_reaberto")


def test_g8a_dois_donos_no_registro_e_ambiguidade_recusada() -> None:
    declarativa = _tarefa_declarativa()
    workers = [
        _worker(CANARY_WORKER_A, "LIMIT", CANARY_TASK_ID),
        _worker(CANARY_WORKER_B, "BUSY", CANARY_TASK_ID),
    ]
    visao = visao_operacional_da_tarefa(declarativa, workers=workers)
    assert visao.fonte == "declarativo", visao.reason
    assert visao.dono_worker_id is None
    print("OK  test_g8a_dois_donos_no_registro_e_ambiguidade_recusada")


def test_g8a_snapshot_so_vale_quando_bate_com_o_worker_real() -> None:
    """O snapshot é o estado pré-SET_AVAILABLE lido do WorkerRecord real.
    Um snapshot que aponta para outra tarefa, ou cujo status não era
    posse ativa, não cria ownership nenhum."""
    declarativa = _tarefa_declarativa()
    # Caso bom: LIMIT + current_task canônico.
    bom = OperationalWorkerSnapshot(
        worker_id=CANARY_WORKER_B, status="LIMIT", current_task=CANARY_TASK_ID,
        last_checkpoint="a" * 40, branch=f"runner/{CANARY_TASK_ID}",
    )
    visao = visao_operacional_da_tarefa(declarativa, workers=[], snapshot=bom)
    assert visao.fonte == "snapshot" and visao.dono_worker_id == CANARY_WORKER_B
    assert visao.tarefa.estado == "BLOCKED-LIMIT"

    # Tarefa errada.
    errado = replace(bom, current_task="outra-tarefa")
    assert visao_operacional_da_tarefa(declarativa, workers=[], snapshot=errado).dono_worker_id is None
    # Status que não é posse ativa (AVAILABLE/OFFLINE = reserva, não posse).
    for status in ("AVAILABLE", "OFFLINE"):
        parado = replace(bom, status=status)
        assert visao_operacional_da_tarefa(declarativa, workers=[], snapshot=parado).dono_worker_id is None
    print("OK  test_g8a_snapshot_so_vale_quando_bate_com_o_worker_real")


def test_g8a_registro_vivo_vence_o_snapshot_e_impede_trabalho_paralelo() -> None:
    """Se outro worker JÁ assumiu a tarefa, o snapshot de quem volta não
    pode reabri-la — é exatamente a trava contra trabalho paralelo."""
    declarativa = _tarefa_declarativa()
    snapshot_de_b = OperationalWorkerSnapshot(
        worker_id=CANARY_WORKER_B, status="LIMIT", current_task=CANARY_TASK_ID,
    )
    workers = [_worker(CANARY_WORKER_A, "BUSY", CANARY_TASK_ID)]
    visao = visao_operacional_da_tarefa(declarativa, workers=workers, snapshot=snapshot_de_b)
    assert visao.dono_worker_id == CANARY_WORKER_A, visao.reason
    # E a decisão da Fase F, alimentada por essa visão, recusa o B.
    deve, motivo = worker_retomando_deve_assumir(
        tarefa_estado=visao.tarefa.estado, tarefa_agente_atual=visao.tarefa.agente,
        worker_que_volta=CANARY_WORKER_B,
    )
    assert deve is False, motivo
    print("OK  test_g8a_registro_vivo_vence_o_snapshot_e_impede_trabalho_paralelo")


def test_g8a_fluxo_completo_sem_agente_declarado_no_tasks_json() -> None:
    """A prova mais forte de G8-A: nem sequer a preparação administrativa
    precisa nomear um agente. Com ``agente: null`` e ``estado: READY`` no
    declarativo — e sem nenhuma edição no meio — o canário vai do Stage 1
    ao Stage 3 sozinho, porque todo o ownership vem do Worker Registry."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto, branch_padrao, sha_padrao = _criar_remoto_local(tmp)
        registry = _registry_vazio()
        config = _config()
        preparar_workers_do_canario(registry, config=config, canonical_task_id=CANARY_TASK_ID)
        checkpoint = _etapa_a(tmp, remoto, registry, config)

        tasks_path = _tasks_json(tmp, estado="READY", agente=None)
        digital_inicial = _impressao_digital(tasks_path)

        etapa_b = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=_clonar(tmp, remoto, "wb"), tasks_json_path=tasks_path,
            state_git_remote=remoto, transport=_TransporteContado("CANARY_STAGE=2\n"),
        )
        assert etapa_b.action == "DISPATCHED", etapa_b.reason
        assert etapa_b.handoff.new_worker_id == CANARY_WORKER_B
        checkpoint_2 = etapa_b.dispatch.result.checkpoint_commit

        limite_b = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_B, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint_2, config=config,
            repo_dir=_clonar(tmp, remoto, "wb2"), tasks_json_path=tasks_path,
            state_git_remote=remoto, transport=_TransporteContado("x\n"),
        )
        assert limite_b.action == "HEARTBEAT_APPLIED", limite_b.reason

        transporte_c = _TransporteContado("CANARY_STAGE=3\n")
        confirmacao = aplicar_comando(
            registry, parse_worker_command("API Runner Canary B disponível"),
            tasks_json_path=tasks_path, repo_dir=_clonar(tmp, remoto, "wc"),
            config=config, state_git_remote=remoto, transport=transporte_c,
        )
        assert "NEEDS-AUDIT" in confirmacao, confirmacao
        assert _git(remoto, "show", f"runner/{CANARY_TASK_ID}:{CANARY_ARQUIVO}") == "CANARY_STAGE=3"
        assert _impressao_digital(tasks_path) == digital_inicial, "tasks.json nunca pode ser tocado"
        assert _git(remoto, "rev-parse", branch_padrao) == sha_padrao
    print("OK  test_g8a_fluxo_completo_sem_agente_declarado_no_tasks_json")


# ---------------------------------------------------------------------------
# G9 — o resultado fail-closed da visão operacional tem de ser RESPEITADO
# pelos dois pontos de integração, não só detectado.
# ---------------------------------------------------------------------------

def test_g9_ambiguidade_de_dois_donos_bloqueia_o_handoff() -> None:
    """A e B ocupando a MESMA tarefa, declarativo dizendo agente=A. O
    checkpoint de A detecta a ambiguidade e para: zero handoff, zero
    claim, zero despacho, zero chamada paga — mesmo que o `agente`
    declarativo coincidisse com quem mandou o checkpoint."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto, branch_padrao, sha_padrao, registry, config, checkpoint, tasks_path, transporte = (
            _montar_etapa_b(tmp)
        )
        # B passa a ocupar a mesma tarefa (BUSY). Com o heartbeat de A
        # logo abaixo, viram DOIS donos ativos do mesmo id canônico.
        registry.upsert(
            replace(
                registry.find_by_name_or_id(CANARY_WORKER_B),
                status="BUSY", current_task=CANARY_TASK_ID, branch=f"runner/{CANARY_TASK_ID}",
            ),
            message="teste: B tambem ocupa a tarefa",
        )
        antes = _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}")

        outcome = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=_clonar(tmp, remoto, "wb"), tasks_json_path=tasks_path,
            state_git_remote=remoto, transport=transporte,
        )

        assert outcome.action == "HEARTBEAT_APPLIED", outcome.reason
        assert "ownership operacional" in outcome.reason, outcome.reason
        assert outcome.handoff is None, "ambiguidade nunca pode chegar ao handoff"
        assert outcome.dispatch is None, "ambiguidade nunca pode chegar ao Runner Dispatch"
        assert transporte.calls == 0, "zero chamada paga"
        # O heartbeat LIMIT em si continua valendo (o registro tem de
        # refletir o limite reportado) — e nada mais aconteceu.
        assert outcome.heartbeat is not None and outcome.heartbeat.action == "APPLIED"
        assert _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}") == antes
        assert _git(remoto, "rev-parse", branch_padrao) == sha_padrao
        assert registry.find_by_name_or_id(CANARY_WORKER_B).status == "BUSY", (
            "nenhum registro de worker pode ter sido transferido"
        )
    print("OK  test_g9_ambiguidade_de_dois_donos_bloqueia_o_handoff")


def test_g9_estado_declarativo_terminal_bloqueia_o_handoff() -> None:
    """Tarefa declarativa já em NEEDS-AUDIT/DONE, com agente=A, e um
    checkpoint LIMIT de A: zero handoff, zero despacho. A intenção
    "terminal nunca reabre" passa a ser garantida aqui, não por
    coincidência entre o agente declarado e o worker do evento."""
    for estado_terminal in ("NEEDS-AUDIT", "DONE"):
        with tempfile.TemporaryDirectory() as tmp:
            remoto, branch_padrao, sha_padrao = _criar_remoto_local(tmp)
            registry = _registry_vazio()
            config = _config()
            preparar_workers_do_canario(registry, config=config, canonical_task_id=CANARY_TASK_ID)
            checkpoint = _etapa_a(tmp, remoto, registry, config)
            tasks_path = _tasks_json(tmp, estado=estado_terminal, agente=CANARY_WORKER_A)
            transporte = _TransporteContado("CANARY_STAGE=2\n")
            antes = _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}")

            outcome = processar_checkpoint_de_limite(
                registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
                branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
                repo_dir=_clonar(tmp, remoto, "wb"), tasks_json_path=tasks_path,
                state_git_remote=remoto, transport=transporte,
            )

            assert outcome.action == "HEARTBEAT_APPLIED", (estado_terminal, outcome.reason)
            assert outcome.handoff is None, estado_terminal
            assert outcome.dispatch is None, estado_terminal
            assert transporte.calls == 0, estado_terminal
            assert _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}") == antes
            assert _git(remoto, "rev-parse", branch_padrao) == sha_padrao
    print("OK  test_g9_estado_declarativo_terminal_bloqueia_o_handoff")


def test_g9_declarativo_sozinho_nunca_autoriza_retomada() -> None:
    """Declarativo em BLOCKED-LIMIT com agente=B — exatamente a dupla que
    autorizaria uma retomada — mas SEM prova operacional (nenhum snapshot
    válido e nenhum dono vivo). A Fase F recusa e preserva a reserva."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, _tasks_ignorado, _transporte = _montar_etapa_b(tmp)
        tasks_path = _tasks_json(tmp, estado="BLOCKED-LIMIT", agente=CANARY_WORKER_B)

        # B volta como AVAILABLE, mas nada prova que a tarefa era dele:
        # o registro não mostra dono vivo e o status anterior não é posse
        # ativa (AVAILABLE com current_task é RESERVA, nunca posse).
        registry.upsert(
            replace(
                registry.find_by_name_or_id(CANARY_WORKER_B),
                status="AVAILABLE", current_task=CANARY_TASK_ID,
            ),
            message="teste: B com reserva, sem posse ativa",
        )
        transporte_c = _TransporteContado("CANARY_STAGE=3\n")
        antes = _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}")

        retorno = reagir_a_retorno_de_worker(
            registry, registry.find_by_name_or_id(CANARY_WORKER_B),
            canonical_task_id_anterior=CANARY_TASK_ID, checkpoint_anterior=checkpoint,
            branch_anterior=f"runner/{CANARY_TASK_ID}",
            status_anterior="AVAILABLE",  # não é posse ativa
            tasks_json_path=tasks_path, repo_dir=_clonar(tmp, remoto, "wc"), config=config,
            state_git_remote=remoto, transport=transporte_c,
        )

        assert retorno.retomada is None, retorno.retomada
        assert retorno.proxima_oferta is None, retorno.proxima_oferta
        assert "ownership operacional" in retorno.motivo, retorno.motivo
        assert transporte_c.calls == 0, "zero chamada paga"
        assert _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}") == antes
        # Fail-closed preserva a reserva: nada avançou, a tarefa continua
        # pendurada nele até alguém com prova operacional aparecer.
        assert _deve_preservar_reserva(retorno) is True
    print("OK  test_g9_declarativo_sozinho_nunca_autoriza_retomada")


def test_g9_caminho_bom_produz_ownership_vivo_do_worker_certo() -> None:
    """O contrapeso dos três testes acima: no fluxo bom o heartbeat LIMIT
    recém-aplicado produz ``fonte="registro"`` com o worker correto, e no
    retorno da Fase F o snapshot pré-transição produz ``fonte="snapshot"``
    com quem voltou. É por isso que o portão novo não atrapalha nada."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)

        # Checkpoint: o heartbeat de A acabou de gravar current_task=canônico.
        aplicar_heartbeat(registry, RunnerHeartbeat(
            worker_id=CANARY_WORKER_A, status="LIMIT", task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, last_checkpoint=checkpoint,
        ))
        declarativa = next(
            t for t in load_tasks_from_tasks_json(tasks_path) if t.id == CANARY_TASK_ID
        )
        visao = visao_operacional_da_tarefa(declarativa, workers=registry.list_workers())
        assert visao.fonte == "registro", visao.reason
        assert visao.dono_worker_id == CANARY_WORKER_A
        assert visao.usou_ownership_vivo is True

        # Retorno: depois do CAS para AVAILABLE não há dono vivo, e o
        # snapshot pré-transição é quem responde.
        snapshot = OperationalWorkerSnapshot(
            worker_id=CANARY_WORKER_B, status="LIMIT", current_task=CANARY_TASK_ID,
            last_checkpoint=checkpoint, branch=f"runner/{CANARY_TASK_ID}",
        )
        visao_retorno = visao_operacional_da_tarefa(declarativa, workers=[], snapshot=snapshot)
        assert visao_retorno.fonte == "snapshot", visao_retorno.reason
        assert visao_retorno.dono_worker_id == CANARY_WORKER_B
        assert visao_retorno.usou_ownership_vivo is True
        assert transporte.calls == 0
    print("OK  test_g9_caminho_bom_produz_ownership_vivo_do_worker_certo")


# ---------------------------------------------------------------------------
# G8-B — as continuações automáticas rodam a MESMA validação da execução
# inicial (coordinator-suite), e uma validação vermelha não commita nada.
# ---------------------------------------------------------------------------

def test_g8b_chave_de_validacao_do_canario_e_a_real_da_allowlist() -> None:
    assert CANARY_VALIDATION_COMMAND_KEYS == ("coordinator-suite",)
    assert "coordinator-suite" in _ALLOWLIST_REAL
    # Em produção, essa chave roda a suíte do Coordinator — nunca um
    # comando vindo de comentário, Issue ou input livre.
    comando = _ALLOWLIST_REAL["coordinator-suite"]
    assert comando[1:] == ("-m", "coordinator.tests.run_all"), comando
    print("OK  test_g8b_chave_de_validacao_do_canario_e_a_real_da_allowlist")


def test_g8b_etapa_b_roda_coordinator_suite_com_sucesso() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        outcome = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=_clonar(tmp, remoto, "wb"), tasks_json_path=tasks_path,
            state_git_remote=remoto, transport=transporte,
        )
        assert outcome.action == "DISPATCHED", outcome.reason
        rodados = outcome.dispatch.validation_commands_run
        assert [c["key"] for c in rodados] == ["coordinator-suite"], rodados
        assert all(c["ok"] for c in rodados), rodados
    print("OK  test_g8b_etapa_b_roda_coordinator_suite_com_sucesso")


def test_g8b_etapa_c_roda_coordinator_suite_com_sucesso() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        etapa_b = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=_clonar(tmp, remoto, "wb"), tasks_json_path=tasks_path,
            state_git_remote=remoto, transport=transporte,
        )
        checkpoint_2 = etapa_b.dispatch.result.checkpoint_commit
        processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_B, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint_2, config=config,
            repo_dir=_clonar(tmp, remoto, "wb2"), tasks_json_path=tasks_path,
            state_git_remote=remoto, transport=_TransporteContado("x\n"),
        )
        # Mesma sequência que ``aplicar_comando`` faz num SET_AVAILABLE:
        # captura o estado anterior do WorkerRecord REAL, transiciona de
        # verdade (compare-and-set) e só então reage ao retorno. Aqui a
        # chamada é direta porque o teste precisa do ``DispatchOutcome``,
        # que a confirmação em texto de ``aplicar_comando`` não carrega.
        antes_do_retorno = registry.find_by_name_or_id(CANARY_WORKER_B)
        assert antes_do_retorno.status == "LIMIT"
        assert registry.marcar_available_condicional(
            antes_do_retorno.worker_id,
            esperado_status=antes_do_retorno.status,
            esperado_current_task=antes_do_retorno.current_task,
            esperado_checkpoint=antes_do_retorno.last_checkpoint,
            esperado_branch=antes_do_retorno.branch,
            message="teste: B -> AVAILABLE",
        )
        retorno = reagir_a_retorno_de_worker(
            registry, registry.find_by_name_or_id(CANARY_WORKER_B),
            canonical_task_id_anterior=antes_do_retorno.current_task,
            checkpoint_anterior=antes_do_retorno.last_checkpoint,
            branch_anterior=antes_do_retorno.branch,
            status_anterior=antes_do_retorno.status,
            tasks_json_path=tasks_path, repo_dir=_clonar(tmp, remoto, "wc"), config=config,
            state_git_remote=remoto, transport=_TransporteContado("CANARY_STAGE=3\n"),
        )
        assert retorno.retomada is not None, retorno.motivo
        rodados = retorno.retomada.dispatch_outcome.validation_commands_run
        assert [c["key"] for c in rodados] == ["coordinator-suite"], rodados
        assert all(c["ok"] for c in rodados), rodados
    print("OK  test_g8b_etapa_c_roda_coordinator_suite_com_sucesso")


def test_g8b_validacao_vermelha_na_etapa_b_nao_commita_nada() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        antes = _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}")
        with _allowlist(_VALIDACAO_FALHA):
            outcome = processar_checkpoint_de_limite(
                registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
                branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
                repo_dir=_clonar(tmp, remoto, "wb"), tasks_json_path=tasks_path,
                state_git_remote=remoto, transport=transporte,
            )
        assert outcome.dispatch is not None
        assert outcome.dispatch.result.status == "FAILED", outcome.dispatch.result
        assert outcome.dispatch.result.checkpoint_commit is None
        rodados = outcome.dispatch.validation_commands_run
        assert [c["key"] for c in rodados] == ["coordinator-suite"], rodados
        assert not any(c["ok"] for c in rodados), rodados
        assert _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}") == antes, (
            "validação vermelha nunca pode commitar/pushar a alteração daquela execução"
        )
        assert _git(remoto, "show", f"runner/{CANARY_TASK_ID}:{CANARY_ARQUIVO}") == "CANARY_STAGE=1"
    print("OK  test_g8b_validacao_vermelha_na_etapa_b_nao_commita_nada")


def test_g8b_validacao_vermelha_na_etapa_c_nao_commita_nada() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto, _, _, registry, config, checkpoint, tasks_path, transporte = _montar_etapa_b(tmp)
        etapa_b = processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_A, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint, config=config,
            repo_dir=_clonar(tmp, remoto, "wb"), tasks_json_path=tasks_path,
            state_git_remote=remoto, transport=transporte,
        )
        checkpoint_2 = etapa_b.dispatch.result.checkpoint_commit
        processar_checkpoint_de_limite(
            registry=registry, agente=CANARY_WORKER_B, canonical_task_id=CANARY_TASK_ID,
            branch=f"runner/{CANARY_TASK_ID}", commit=checkpoint_2, config=config,
            repo_dir=_clonar(tmp, remoto, "wb2"), tasks_json_path=tasks_path,
            state_git_remote=remoto, transport=_TransporteContado("x\n"),
        )
        antes = _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}")
        assert antes == checkpoint_2
        with _allowlist(_VALIDACAO_FALHA):
            confirmacao = aplicar_comando(
                registry, parse_worker_command("API Runner Canary B disponível"),
                tasks_json_path=tasks_path, repo_dir=_clonar(tmp, remoto, "wc"),
                config=config, state_git_remote=remoto,
                transport=_TransporteContado("CANARY_STAGE=3\n"),
            )
        assert "FAILED" in confirmacao, confirmacao
        assert _git(remoto, "rev-parse", f"runner/{CANARY_TASK_ID}") == antes, (
            "validação vermelha nunca pode commitar/pushar a alteração daquela execução"
        )
        assert _git(remoto, "show", f"runner/{CANARY_TASK_ID}:{CANARY_ARQUIVO}") == "CANARY_STAGE=2"
    print("OK  test_g8b_validacao_vermelha_na_etapa_c_nao_commita_nada")


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
    for nome in ("checkpoint_handoff.py", "canary_bootstrap.py", "task_ownership.py"):
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
        test_g8a_dono_vem_do_registro_e_vence_o_agente_declarativo,
        test_g8a_estado_declarativo_terminal_nunca_e_reaberto,
        test_g8a_dois_donos_no_registro_e_ambiguidade_recusada,
        test_g8a_snapshot_so_vale_quando_bate_com_o_worker_real,
        test_g8a_registro_vivo_vence_o_snapshot_e_impede_trabalho_paralelo,
        test_g8a_fluxo_completo_sem_agente_declarado_no_tasks_json,
        test_g9_ambiguidade_de_dois_donos_bloqueia_o_handoff,
        test_g9_estado_declarativo_terminal_bloqueia_o_handoff,
        test_g9_declarativo_sozinho_nunca_autoriza_retomada,
        test_g9_caminho_bom_produz_ownership_vivo_do_worker_certo,
        test_g8b_chave_de_validacao_do_canario_e_a_real_da_allowlist,
        test_g8b_etapa_b_roda_coordinator_suite_com_sucesso,
        test_g8b_etapa_c_roda_coordinator_suite_com_sucesso,
        test_g8b_validacao_vermelha_na_etapa_b_nao_commita_nada,
        test_g8b_validacao_vermelha_na_etapa_c_nao_commita_nada,
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
            # Achado G8-B: os caminhos automáticos agora rodam
            # ``coordinator-suite`` de verdade por default (é esse o
            # ponto). Rodar a suíte INTEIRA dentro de cada despacho de
            # cada teste levaria minutos e recursaria sobre si mesma, então
            # a tabela da allowlist roda um comando trivial durante os
            # testes — a CHAVE continua sendo a real, e é a chave que os
            # testes verificam. Os testes de FALHA de validação trocam a
            # tabela outra vez, aninhados aqui dentro, e este bloco
            # restaura tudo no fim.
            with _allowlist(_VALIDACAO_OK):
                t()
        except Exception as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
