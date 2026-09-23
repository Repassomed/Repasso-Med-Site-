"""Testes do Worker Bridge V1 — Issue #128.

Mesma técnica de ``test_runner_dispatch.py``: git de verdade (não
simulado) contra um repositório "remoto" local, ``threading.Barrier``
para forçar concorrência real, e nenhum mock de subprocess. A única
peça falsa é o cliente de API do GitHub (``_FakeGitHubApi``) — porque a
alternativa seria chamar o GitHub de verdade num teste.

Cobre os cenários EXIGIDOS pelo §12 da Issue #128, na ordem em que a
Issue os lista:

- bridge desligado -> zero chamada paga e zero escrita;
- piloto recusa worker diferente / tarefa diferente;
- tarefa sem ``automation_enabled``;
- tarefa sem ``policy_level``/``risk_level`` explícitos;
- Nível E; Nível D sem ``jose_authorized``;
- dois workers tentando a mesma tarefa; dois runs tentando a mesma tarefa;
- tarefa já IN-PROGRESS / NEEDS-AUDIT / DONE não é redistribuída;
- FAILED não entra em retry automático;
- arquivo fora de ``allowed_files``;
- worker incompatível; nenhum worker disponível;
- compare-and-set falhando por corrida;
- AVAILABLE -> BUSY;
- BLOCKED-LIMIT mantém checkpoint;
- sucesso -> NEEDS-AUDIT;
- PR idempotente; disparo do Guard idempotente;
- nenhum merge; nenhuma escrita em ``coordination/tasks.json``/main;
- o canário existente continua com o comportamento de antes.
"""

from __future__ import annotations

import copy
import json
import os
import subprocess
import sys
import tempfile
import threading

from . import _pathsetup
from coordinator import bridge_pr, bridge_workers, task_runtime, worker_bridge
from coordinator.classify import Priority
from coordinator.runner_contract import RunnerTask
from coordinator.runner_dispatch import (
    ALLOWED_RUNNER_MODE,
    RUNNER_MODE_SUPERVISED,
    SUPERVISED_AUTHORIZATION_SOURCE,
    FileWrite,
    RunnerDispatchConfig,
    StructuredPatch,
)
from coordinator.task_runtime import TaskRuntimeStore
from coordinator.worker_bridge import WorkerBridgeConfig
from coordinator.worker_ops import (
    InMemoryWorkerStateStore,
    OperationalWorkerRegistry,
    WorkerRecord,
)

PILOT_WORKER = bridge_workers.BRIDGE_WORKER_4
ARQUIVO_PILOTO = "coordinator/canary/worker-bridge-pilot.txt"


# ---------------------------------------------------------------------------
# Andaimes
# ---------------------------------------------------------------------------

def _criar_remoto_local(tmp: str) -> str:
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    # ``-b bootstrap`` é deliberado: o remoto de teste NUNCA ganha uma
    # branch chamada ``main`` ou ``master``, para que a prova de "nenhuma
    # escrita em main" não dependa do padrão do git do host.
    subprocess.run(["git", "init", "-q", "-b", "bootstrap", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para os testes do Worker Bridge\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    return remoto


def _clonar_workdir(tmp: str, remoto: str, nome: str) -> str:
    workdir = os.path.join(tmp, nome)
    subprocess.run(["git", "clone", "-q", remoto, workdir], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", workdir, "config", "user.name", "X"], check=True)
    subprocess.run(["git", "-C", workdir, "checkout", "-q", "bootstrap"], check=True)
    return workdir


def _tarefa(**overrides) -> dict:
    tarefa = {
        "id": "infra-bridge-teste",
        "titulo": "Tarefa sintética de teste do Bridge",
        "area": "infraestrutura",
        "materia": None,
        "arquivos": ["alvo.txt"],
        "objetivo": "Escrever exatamente OK no arquivo permitido.",
        "fonte": "teste",
        "agente": None,
        "estado": "READY",
        "prioridade_declarada": "P0",
        "capabilities_required": ["codigo"],
        "dependencias": [],
        "branch": "runner/infra-bridge-teste",
        "pr": None,
        "commit": None,
        "issue": 128,
        "automation_enabled": True,
        "risk_level": "BAIXO",
        "policy_level": "C",
        "jose_authorized": False,
        "notas": "tarefa de teste",
    }
    tarefa.update(overrides)
    return tarefa


def _escrever_tasks_json(tmp: str, tarefas: list[dict], nome: str = "tasks.json") -> str:
    caminho = os.path.join(tmp, nome)
    dados = {
        "versao": 1,
        "atualizado_em": "2026-09-23",
        "agentes_conhecidos": ["Claude 1", "humano"],
        "estados_validos": [
            "READY", "IN-PROGRESS", "BLOCKED", "BLOCKED-LIMIT",
            "NEEDS-AUDIT", "NEEDS-FIX", "MERGE-READY", "DONE",
        ],
        "areas_validas": ["materia", "infraestrutura", "ferramentas", "assets", "documentacao"],
        "tarefas": tarefas,
    }
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump(dados, fh, ensure_ascii=False, indent=2)
    return caminho


def _config(**overrides) -> WorkerBridgeConfig:
    campos = dict(
        enabled=True,
        mode=worker_bridge.BRIDGE_MODE_PILOT,
        pilot_worker_id=PILOT_WORKER,
        pilot_task_id="infra-bridge-teste",
    )
    campos.update(overrides)
    return WorkerBridgeConfig(**campos)


def _registry_com_workers(config: WorkerBridgeConfig | None = None) -> OperationalWorkerRegistry:
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
    resultado = bridge_workers.preparar_workers_do_bridge(registry, config=config or _config())
    assert resultado.action == "PREPARED", resultado.reason
    return registry


def _runtime_store() -> TaskRuntimeStore:
    return TaskRuntimeStore(InMemoryWorkerStateStore())


class _GeracaoProibida:
    """Sentinela: se o Bridge chegar a gerar patch quando não deveria, o
    teste falha de forma óbvia em vez de silenciosamente gastar uma
    chamada paga."""

    def __init__(self) -> None:
        self.chamado = False

    def __call__(self) -> object:
        self.chamado = True
        raise AssertionError("gerar_patch foi chamado — nenhuma chamada paga deveria acontecer aqui.")


class _FakeGitHubApi:
    """Só as três operações do protocolo ``bridge_pr.GitHubBridgeApi``.
    Nenhuma operação de merge existe — nem aqui nem no cliente real."""

    def __init__(self, primeiro_numero: int = 901) -> None:
        self.prs: list[dict] = []
        self.criadas: list[dict] = []
        self.dispatches: list[tuple] = []
        self._proximo = primeiro_numero

    def prs_abertas_por_head(self, branch: str) -> list[dict]:
        return [p for p in self.prs if p["head_branch"] == branch]

    def criar_pr(self, *, titulo: str, head: str, base: str, corpo: str) -> dict:
        pr = {
            "number": self._proximo,
            "html_url": f"https://example.invalid/pr/{self._proximo}",
            "head_branch": head,
            "base": base,
            "title": titulo,
            "body": corpo,
        }
        self._proximo += 1
        self.prs.append(pr)
        self.criadas.append(pr)
        return pr

    def despachar_workflow(self, *, arquivo: str, ref: str, inputs: dict) -> None:
        self.dispatches.append((arquivo, ref, inputs))


def _patch_padrao(caminho: str = "alvo.txt", conteudo: str = "OK\n") -> StructuredPatch:
    return StructuredPatch(files=(FileWrite(path=caminho, content=conteudo),))


def _ciclo(
    tmp: str, tarefas: list[dict], *, config: WorkerBridgeConfig | None = None,
    registry: OperationalWorkerRegistry | None = None,
    runtime_store: TaskRuntimeStore | None = None,
    patch: StructuredPatch | None = None,
    gerar_patch=None, api: _FakeGitHubApi | None = None,
    nome_workdir: str = "work",
) -> tuple[worker_bridge.BridgeOutcome, str, TaskRuntimeStore, OperationalWorkerRegistry]:
    cfg = config or _config()
    remoto = _criar_remoto_local(tmp)
    workdir = _clonar_workdir(tmp, remoto, nome_workdir)
    caminho_tasks = _escrever_tasks_json(tmp, tarefas)
    reg = registry if registry is not None else _registry_com_workers(cfg)
    store = runtime_store if runtime_store is not None else _runtime_store()
    outcome = worker_bridge.executar_ciclo(
        config=cfg,
        tasks_json_path=caminho_tasks,
        repo_dir=workdir,
        state_git_remote=remoto,
        worker_registry=reg,
        runtime_store=store,
        base_branch="bootstrap",
        github_api=api,
        validation_command_keys=(),
        patch=patch if (patch is not None or gerar_patch is not None) else _patch_padrao(),
        gerar_patch=gerar_patch,
    )
    return outcome, caminho_tasks, store, reg


# ---------------------------------------------------------------------------
# §12 — portão desligado
# ---------------------------------------------------------------------------

def test_bridge_desligado_nao_faz_nada() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        proibido = _GeracaoProibida()
        store = _runtime_store()
        outcome, caminho, store, reg = _ciclo(
            tmp, [_tarefa()], config=_config(enabled=False),
            # Registry preparado ANTES (portão aberto): o cenário é "os
            # workers existem, mas a flag está desligada agora".
            registry=_registry_com_workers(),
            runtime_store=store, patch=None, gerar_patch=proibido,
        )
        assert outcome.action == "BLOCKED", outcome
        assert proibido.chamado is False
        assert store.list_records() == []
        assert outcome.dispatch is None
        assert outcome.pr is None
    print("OK  test_bridge_desligado_nao_faz_nada")


def test_modo_invalido_fecha_o_portao() -> None:
    cfg = _config(mode="qualquer-coisa")
    assert cfg.gate().open is False
    assert cfg.mode_allowed is False
    print("OK  test_modo_invalido_fecha_o_portao")


def test_piloto_sem_as_duas_variaveis_fecha_o_portao() -> None:
    assert _config(pilot_task_id=None).gate().open is False
    assert _config(pilot_worker_id=None).gate().open is False
    print("OK  test_piloto_sem_as_duas_variaveis_fecha_o_portao")


def test_ref_diferente_da_branch_padrao_fecha_o_portao() -> None:
    cfg = _config(actual_ref="refs/heads/outra", expected_ref="refs/heads/main")
    assert cfg.ref_allowed is False and cfg.gate().open is False
    # Estado PARCIAL também é recusado — nunca tratado como seguro.
    assert _config(actual_ref="refs/heads/main", expected_ref=None).ref_allowed is False
    assert _config(actual_ref=None, expected_ref="refs/heads/main").ref_allowed is False
    print("OK  test_ref_diferente_da_branch_padrao_fecha_o_portao")


# ---------------------------------------------------------------------------
# §12 — piloto recusa worker/tarefa diferentes
# ---------------------------------------------------------------------------

def test_piloto_recusa_worker_diferente() -> None:
    cfg = _config()
    ok, motivo = cfg.permite(task_id="infra-bridge-teste", worker_id=bridge_workers.BRIDGE_WORKER_1)
    assert ok is False and "elegível" in motivo
    print("OK  test_piloto_recusa_worker_diferente")


def test_piloto_recusa_tarefa_diferente() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        proibido = _GeracaoProibida()
        outcome, _c, store, _r = _ciclo(
            tmp, [_tarefa(id="outra-tarefa", branch="runner/outra-tarefa")],
            config=_config(pilot_task_id="infra-bridge-teste"),
            patch=None, gerar_patch=proibido,
        )
        assert outcome.action == "BLOCKED", outcome
        assert "não é a tarefa piloto autorizada" in outcome.reason
        assert proibido.chamado is False
        assert store.list_records() == []
    print("OK  test_piloto_recusa_tarefa_diferente")


def test_comparacao_do_piloto_e_estrita_nunca_prefixo() -> None:
    cfg = _config(pilot_task_id="infra-bridge-teste")
    ok, _ = cfg.permite(task_id="infra-bridge-teste-2", worker_id=PILOT_WORKER)
    assert ok is False
    ok, _ = cfg.permite(task_id="infra-bridge-test", worker_id=PILOT_WORKER)
    assert ok is False
    ok, _ = cfg.permite(task_id="infra-bridge-teste", worker_id=PILOT_WORKER)
    assert ok is True
    print("OK  test_comparacao_do_piloto_e_estrita_nunca_prefixo")


# ---------------------------------------------------------------------------
# §12 — portão de política declarativa
# ---------------------------------------------------------------------------

def _meta(**overrides) -> worker_bridge.BridgeTaskMetadata:
    campos = dict(
        task_id="t", automation_enabled=True, risk_level="BAIXO",
        policy_level="C", jose_authorized=False,
    )
    campos.update(overrides)
    return worker_bridge.BridgeTaskMetadata(**campos)


def test_tarefa_sem_automation_enabled_e_recusada() -> None:
    r = worker_bridge.avaliar_politica(_meta(automation_enabled=False), task_id="t")
    assert r.permitido is False and "automation_enabled=true" in r.reason
    # E o mesmo pelo caminho completo, com escrita zero.
    with tempfile.TemporaryDirectory() as tmp:
        proibido = _GeracaoProibida()
        outcome, _c, store, _r = _ciclo(
            tmp, [_tarefa(automation_enabled=False)], patch=None, gerar_patch=proibido,
        )
        assert outcome.action == "BLOCKED" and store.list_records() == []
        assert proibido.chamado is False
    print("OK  test_tarefa_sem_automation_enabled_e_recusada")


def test_metadados_ausentes_sao_recusa() -> None:
    r = worker_bridge.avaliar_politica(None, task_id="t")
    assert r.permitido is False and "sem declaração" in r.reason
    print("OK  test_metadados_ausentes_sao_recusa")


def test_tarefa_sem_risco_ou_politica_explicitos_e_recusada() -> None:
    sem_risco = worker_bridge.avaliar_politica(_meta(risk_level=None), task_id="t")
    assert sem_risco.permitido is False and "risk_level" in sem_risco.reason
    sem_politica = worker_bridge.avaliar_politica(_meta(policy_level=None), task_id="t")
    assert sem_politica.permitido is False and "policy_level" in sem_politica.reason
    invalido = worker_bridge.avaliar_politica(_meta(risk_level="TALVEZ"), task_id="t")
    assert invalido.permitido is False
    with tempfile.TemporaryDirectory() as tmp:
        tarefa = _tarefa()
        del tarefa["policy_level"]
        outcome, _c, store, _r = _ciclo(tmp, [tarefa], patch=None, gerar_patch=_GeracaoProibida())
        assert outcome.action == "BLOCKED" and store.list_records() == []
    print("OK  test_tarefa_sem_risco_ou_politica_explicitos_e_recusada")


def test_nivel_e_nunca_executa() -> None:
    r = worker_bridge.avaliar_politica(_meta(policy_level="E"), task_id="t")
    assert r.permitido is False and "PROIBIDO" in r.reason
    with tempfile.TemporaryDirectory() as tmp:
        proibido = _GeracaoProibida()
        outcome, _c, store, _r = _ciclo(
            tmp, [_tarefa(policy_level="E")], patch=None, gerar_patch=proibido,
        )
        assert outcome.action == "BLOCKED" and store.list_records() == []
        assert proibido.chamado is False
    # Segunda camada: o contrato nem constrói uma RunnerTask Nível E.
    resultado = worker_bridge.materializar_runner_task(
        _tarefa_record(_tarefa(policy_level="E")), _meta(policy_level="E"),
    )
    assert resultado.ok is False
    print("OK  test_nivel_e_nunca_executa")


def test_nivel_d_sem_autorizacao_de_jose_e_recusado() -> None:
    r = worker_bridge.avaliar_politica(
        _meta(policy_level="D", jose_authorized=False), task_id="t"
    )
    assert r.permitido is False and "jose_authorized=true" in r.reason
    autorizado = worker_bridge.avaliar_politica(
        _meta(policy_level="D", jose_authorized=True), task_id="t"
    )
    assert autorizado.permitido is True
    with tempfile.TemporaryDirectory() as tmp:
        outcome, _c, store, _r = _ciclo(
            tmp, [_tarefa(policy_level="D", jose_authorized=False)],
            patch=None, gerar_patch=_GeracaoProibida(),
        )
        assert outcome.action == "BLOCKED" and store.list_records() == []
    print("OK  test_nivel_d_sem_autorizacao_de_jose_e_recusado")


def _tarefa_record(bruto: dict):
    """Converte um dict de tarefa no ``scheduler.TaskRecord`` equivalente,
    reusando o carregador REAL (nunca um construtor paralelo)."""
    from coordinator.scheduler import load_tasks_from_tasks_json

    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, [bruto])
        return load_tasks_from_tasks_json(caminho)[0]


# ---------------------------------------------------------------------------
# §12 — materialização / allowed_files
# ---------------------------------------------------------------------------

def test_curinga_em_allowed_files_e_recusado_nunca_expandido() -> None:
    bruto = _tarefa(arquivos=["coordinator/**"])
    resultado = worker_bridge.materializar_runner_task(_tarefa_record(bruto), _meta())
    assert resultado.ok is False and "curinga" in resultado.reason
    print("OK  test_curinga_em_allowed_files_e_recusado_nunca_expandido")


def test_branch_nunca_e_main_e_e_deterministica() -> None:
    # Branch declarada fora da convenção do Runner -> derivada.
    bruto = _tarefa(branch="main")
    tarefa = _tarefa_record(bruto)
    meta = _meta(branch="main")
    assert worker_bridge.branch_de_trabalho(tarefa, meta) == "runner/infra-bridge-teste"
    # Branch humana também é ignorada (nunca publicar em cima dela).
    assert worker_bridge.branch_de_trabalho(tarefa, _meta(branch="infra/algo-humano")) == (
        "runner/infra-bridge-teste"
    )
    # Branch já na convenção é respeitada.
    assert worker_bridge.branch_de_trabalho(tarefa, _meta(branch="runner/x")) == "runner/x"
    print("OK  test_branch_nunca_e_main_e_e_deterministica")


def test_instrucoes_sao_montadas_da_tarefa_e_nunca_sao_vagas() -> None:
    tarefa = _tarefa_record(_tarefa())
    texto = worker_bridge.montar_instrucoes(tarefa, _meta(objetivo="Escrever OK.", titulo="T"))
    assert "Escrever OK." in texto
    assert "alvo.txt" in texto
    assert texto.strip().lower() not in ("continue", "continua", "continuar")
    print("OK  test_instrucoes_sao_montadas_da_tarefa_e_nunca_sao_vagas")


def test_arquivo_fora_de_allowed_files_bloqueia_sem_publicar() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        api = _FakeGitHubApi()
        outcome, _c, store, _r = _ciclo(
            tmp, [_tarefa()], patch=_patch_padrao("outro-arquivo.txt"), api=api,
        )
        assert outcome.action == "DISPATCHED"
        assert outcome.runner_result_status == "BLOCKED", outcome.dispatch
        registro = store.get("infra-bridge-teste")
        assert registro is not None and registro.status == task_runtime.RUNTIME_BLOCKED
        assert api.criadas == [] and api.dispatches == []
    print("OK  test_arquivo_fora_de_allowed_files_bloqueia_sem_publicar")


# ---------------------------------------------------------------------------
# §12 — workers
# ---------------------------------------------------------------------------

def test_worker_incompativel_nao_recebe_atribuicao() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        outcome, _c, store, _r = _ciclo(
            tmp, [_tarefa(capabilities_required=["conteudo"])],
            patch=None, gerar_patch=_GeracaoProibida(),
        )
        assert outcome.action == "NO_ASSIGNMENT", outcome
        assert "capability" in outcome.reason
        assert store.list_records() == []
    print("OK  test_worker_incompativel_nao_recebe_atribuicao")


def test_nenhum_worker_disponivel_nao_executa_nada() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        registry = _registry_com_workers()
        atual = registry.find_by_name_or_id(PILOT_WORKER)
        assert atual is not None
        registry.upsert(
            WorkerRecord(
                worker_id=atual.worker_id, display_name=atual.display_name, type=atual.type,
                status="OFFLINE", capabilities=atual.capabilities, can_execute=True,
            ),
            message="teste: worker fora do ar",
        )
        outcome, _c, store, _r = _ciclo(
            tmp, [_tarefa()], registry=registry, patch=None, gerar_patch=_GeracaoProibida(),
        )
        assert outcome.action in ("NO_ASSIGNMENT", "POOL_PAUSED"), outcome
        assert store.list_records() == []
    print("OK  test_nenhum_worker_disponivel_nao_executa_nada")


def test_somente_o_worker_4_nasce_elegivel() -> None:
    registry = _registry_com_workers()
    por_id = {w.worker_id: w for w in registry.list_workers()}
    for worker_id in (bridge_workers.BRIDGE_WORKER_1, bridge_workers.BRIDGE_WORKER_2,
                      bridge_workers.BRIDGE_WORKER_3):
        assert por_id[worker_id].status == "OFFLINE", worker_id
        assert por_id[worker_id].can_execute is False, worker_id
    assert por_id[PILOT_WORKER].status == "AVAILABLE"
    assert por_id[PILOT_WORKER].can_execute is True
    assert por_id[PILOT_WORKER].type == "api_runner"
    print("OK  test_somente_o_worker_4_nasce_elegivel")


def test_sessoes_humanas_nunca_entram_no_pool_do_bridge() -> None:
    registry = _registry_com_workers()
    # Uma sessão humana explicitamente AVAILABLE (o caso real de um
    # comando de José) nunca pode ser escolhida pelo Bridge.
    registry.set_status("Claude 1", "AVAILABLE", message="teste: sessão humana disponível")
    programaticos = bridge_workers.workers_programaticos(registry.list_workers())
    ids = {w.worker_id for w in programaticos}
    assert ids == set(bridge_workers.BRIDGE_WORKER_IDS), ids
    assert all(w.type == "api_runner" for w in programaticos)
    print("OK  test_sessoes_humanas_nunca_entram_no_pool_do_bridge")


def test_bootstrap_nunca_sobrescreve_worker_em_execucao() -> None:
    registry = _registry_com_workers()
    registry.upsert(
        WorkerRecord(
            worker_id=PILOT_WORKER, display_name="Claude Worker 4", type="api_runner",
            status="BUSY", capabilities=("codigo",), current_task="alguma-tarefa",
            last_checkpoint="abc1234", can_execute=True,
        ),
        message="teste: worker ocupado de verdade",
    )
    resultado = bridge_workers.preparar_workers_do_bridge(registry, config=_config())
    assert resultado.action == "PREPARED"
    assert PILOT_WORKER in resultado.ja_existentes
    fresco = registry.find_by_name_or_id(PILOT_WORKER)
    assert fresco is not None and fresco.status == "BUSY"
    assert fresco.current_task == "alguma-tarefa" and fresco.last_checkpoint == "abc1234"
    print("OK  test_bootstrap_nunca_sobrescreve_worker_em_execucao")


def test_bootstrap_bloqueado_com_portao_fechado_nao_escreve_nada() -> None:
    store = InMemoryWorkerStateStore()
    registry = OperationalWorkerRegistry(store)
    resultado = bridge_workers.preparar_workers_do_bridge(registry, config=_config(enabled=False))
    assert resultado.action == "BLOCKED"
    assert store.read() == {}
    print("OK  test_bootstrap_bloqueado_com_portao_fechado_nao_escreve_nada")


# ---------------------------------------------------------------------------
# §12 — concorrência
# ---------------------------------------------------------------------------

def test_dois_workers_tentando_a_mesma_tarefa_so_um_reserva() -> None:
    store = _runtime_store()
    barreira = threading.Barrier(2)
    resultados: list[bool] = []
    trava = threading.Lock()

    def tentar(worker_id: str) -> None:
        barreira.wait()
        r = store.reservar("t-concorrente", worker_id=worker_id, branch="runner/t-concorrente")
        with trava:
            resultados.append(r.reservado)

    fios = [
        threading.Thread(target=tentar, args=(PILOT_WORKER,)),
        threading.Thread(target=tentar, args=(bridge_workers.BRIDGE_WORKER_3,)),
    ]
    for f in fios:
        f.start()
    for f in fios:
        f.join()

    assert sorted(resultados) == [False, True], resultados
    registros = store.list_records()
    assert len(registros) == 1 and registros[0].status == task_runtime.RUNTIME_IN_PROGRESS
    print("OK  test_dois_workers_tentando_a_mesma_tarefa_so_um_reserva")


def test_dois_runs_da_mesma_tarefa_so_um_executa() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        caminho_tasks = _escrever_tasks_json(tmp, [_tarefa()])
        cfg = _config()
        registry = _registry_com_workers(cfg)
        store = _runtime_store()
        barreira = threading.Barrier(2)
        saidas: list[worker_bridge.BridgeOutcome] = []
        trava = threading.Lock()

        def rodar(nome: str) -> None:
            workdir = _clonar_workdir(tmp, remoto, nome)
            barreira.wait()
            outcome = worker_bridge.executar_ciclo(
                config=cfg, tasks_json_path=caminho_tasks, repo_dir=workdir,
                state_git_remote=remoto, worker_registry=registry, runtime_store=store,
                base_branch="bootstrap", github_api=None, validation_command_keys=(),
                patch=_patch_padrao(),
            )
            with trava:
                saidas.append(outcome)

        fios = [threading.Thread(target=rodar, args=(f"work-{i}",)) for i in (1, 2)]
        for f in fios:
            f.start()
        for f in fios:
            f.join()

        acoes = sorted(o.action for o in saidas)
        # O invariante é "exatamente um executa". O perdedor pode terminar
        # de três formas legítimas, todas inertes: já viu a reserva
        # publicada (NO_ASSIGNMENT, porque a tarefa saiu da fila, ou o
        # worker já está BUSY), perdeu o compare-and-set da reserva
        # (ALREADY_CLAIMED) ou foi recusado depois dela (BLOCKED).
        assert acoes.count("DISPATCHED") == 1, acoes
        perdedor = [a for a in acoes if a != "DISPATCHED"]
        assert perdedor and perdedor[0] in ("NO_ASSIGNMENT", "ALREADY_CLAIMED", "BLOCKED"), acoes
        registros = store.list_records()
        assert len(registros) == 1, registros
    print("OK  test_dois_runs_da_mesma_tarefa_so_um_executa")


def test_cas_do_resultado_recusa_execucao_que_perdeu_a_corrida() -> None:
    store = _runtime_store()
    reserva = store.reservar("t-cas", worker_id=PILOT_WORKER, branch="runner/t-cas")
    assert reserva.reservado and reserva.record is not None
    execution_id = reserva.record.execution_task_id
    assert execution_id is not None

    # Id de execução de OUTRA tentativa -> nada é escrito.
    assert store.registrar_resultado(
        "t-cas", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=PILOT_WORKER,
        execution_task_id="t-cas--bridge-000000000000", reason="execução velha",
    ) is False
    # Worker diferente -> nada é escrito.
    assert store.registrar_resultado(
        "t-cas", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id="claude-worker-1",
        execution_task_id=execution_id, reason="worker errado",
    ) is False
    # A execução legítima escreve.
    assert store.registrar_resultado(
        "t-cas", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=PILOT_WORKER,
        execution_task_id=execution_id, reason="ok", checkpoint_commit="abcdef1",
    ) is True
    # E depois de terminada, nem ela mesma reescreve.
    assert store.registrar_resultado(
        "t-cas", status=task_runtime.RUNTIME_FAILED, worker_id=PILOT_WORKER,
        execution_task_id=execution_id, reason="tarde demais",
    ) is False
    print("OK  test_cas_do_resultado_recusa_execucao_que_perdeu_a_corrida")


def test_id_de_execucao_e_novo_em_cada_reserva() -> None:
    a = task_runtime.novo_token_de_execucao()
    b = task_runtime.novo_token_de_execucao()
    assert a != b
    assert task_runtime.derivar_execution_task_id("t", a) == f"t--bridge-{a}"
    print("OK  test_id_de_execucao_e_novo_em_cada_reserva")


# ---------------------------------------------------------------------------
# §12 — fila: nada já executado volta
# ---------------------------------------------------------------------------

def _fila_com_runtime(status: str, **extras) -> list:
    from coordinator.scheduler import proxima_tarefa_pronta

    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, [_tarefa()])
        store = _runtime_store()
        reserva = store.reservar("infra-bridge-teste", worker_id=PILOT_WORKER, branch="runner/x")
        assert reserva.reservado and reserva.record is not None
        if status != task_runtime.RUNTIME_IN_PROGRESS:
            assert store.registrar_resultado(
                "infra-bridge-teste", status=status, worker_id=PILOT_WORKER,
                execution_task_id=reserva.record.execution_task_id or "",
                reason="teste", **extras,
            )
        tarefas, _meta_map, registros = worker_bridge.visao_da_fila(
            tasks_json_path=caminho, runtime_store=store
        )
        return proxima_tarefa_pronta(tarefas)


def test_tarefa_em_progresso_nao_e_redistribuida() -> None:
    assert _fila_com_runtime(task_runtime.RUNTIME_IN_PROGRESS) == []
    print("OK  test_tarefa_em_progresso_nao_e_redistribuida")


def test_tarefa_needs_audit_nao_e_redistribuida() -> None:
    assert _fila_com_runtime(task_runtime.RUNTIME_NEEDS_AUDIT) == []
    print("OK  test_tarefa_needs_audit_nao_e_redistribuida")


def test_tarefa_done_nao_e_redistribuida() -> None:
    assert _fila_com_runtime(task_runtime.RUNTIME_DONE) == []
    print("OK  test_tarefa_done_nao_e_redistribuida")


def test_tarefa_failed_nao_entra_em_retry_automatico() -> None:
    assert _fila_com_runtime(task_runtime.RUNTIME_FAILED) == []
    # E a reserva também nunca é concedida de novo.
    store = _runtime_store()
    reserva = store.reservar("t-failed", worker_id=PILOT_WORKER, branch="runner/t-failed")
    assert reserva.reservado and reserva.record is not None
    store.registrar_resultado(
        "t-failed", status=task_runtime.RUNTIME_FAILED, worker_id=PILOT_WORKER,
        execution_task_id=reserva.record.execution_task_id or "", reason="falhou",
    )
    segunda = store.reservar("t-failed", worker_id=PILOT_WORKER, branch="runner/t-failed")
    assert segunda.reservado is False and "decisão explícita" in segunda.reason
    print("OK  test_tarefa_failed_nao_entra_em_retry_automatico")


def test_tarefa_blocked_limit_nao_e_redistribuida_e_guarda_checkpoint() -> None:
    assert _fila_com_runtime(
        task_runtime.RUNTIME_BLOCKED_LIMIT, checkpoint_commit="abcdef1234"
    ) == []
    print("OK  test_tarefa_blocked_limit_nao_e_redistribuida_e_guarda_checkpoint")


def test_runtime_nunca_reabre_tarefa_fechada_no_declarativo() -> None:
    """Regra 3: um registro operacional nunca reabre o que o declarativo
    já fechou — o portão do achado G9, preservado."""
    from coordinator.scheduler import load_tasks_from_tasks_json

    with tempfile.TemporaryDirectory() as tmp:
        caminho = _escrever_tasks_json(tmp, [_tarefa(estado="NEEDS-AUDIT")])
        declarativas = load_tasks_from_tasks_json(caminho)
        registros = {
            "infra-bridge-teste": task_runtime.TaskRuntimeRecord(
                canonical_task_id="infra-bridge-teste",
                status=task_runtime.RUNTIME_IN_PROGRESS, worker_id=PILOT_WORKER,
            )
        }
        visao = task_runtime.aplicar_runtime_em_tarefas(declarativas, registros)
        assert visao[0].estado == "NEEDS-AUDIT"
        assert visao[0].agente is None
    print("OK  test_runtime_nunca_reabre_tarefa_fechada_no_declarativo")


def test_dependencia_considera_done_operacional() -> None:
    from coordinator.scheduler import proxima_tarefa_pronta

    with tempfile.TemporaryDirectory() as tmp:
        base = _tarefa(id="dep-base", arquivos=["base.txt"], branch="runner/dep-base")
        dependente = _tarefa(
            id="dep-filha", arquivos=["filha.txt"], branch="runner/dep-filha",
            dependencias=["dep-base"],
        )
        caminho = _escrever_tasks_json(tmp, [base, dependente])
        store = _runtime_store()

        # Sem runtime, a dependente não pode começar (a base está READY).
        tarefas, _m, _r = worker_bridge.visao_da_fila(tasks_json_path=caminho, runtime_store=store)
        prontas = [t.id for t in proxima_tarefa_pronta(tarefas)]
        assert prontas == ["dep-base"], prontas

        reserva = store.reservar("dep-base", worker_id=PILOT_WORKER, branch="runner/dep-base")
        assert reserva.reservado and reserva.record is not None
        assert store.registrar_resultado(
            "dep-base", status=task_runtime.RUNTIME_DONE, worker_id=PILOT_WORKER,
            execution_task_id=reserva.record.execution_task_id or "", reason="pronta",
        )

        tarefas, _m, _r = worker_bridge.visao_da_fila(tasks_json_path=caminho, runtime_store=store)
        prontas = [t.id for t in proxima_tarefa_pronta(tarefas)]
        assert prontas == ["dep-filha"], prontas
    print("OK  test_dependencia_considera_done_operacional")


# ---------------------------------------------------------------------------
# §12 — execução real (sucesso), heartbeat, PR e Guard
# ---------------------------------------------------------------------------

def test_sucesso_termina_em_needs_audit_com_pr_e_guard() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        api = _FakeGitHubApi()
        outcome, caminho_tasks, store, registry = _ciclo(tmp, [_tarefa()], api=api)

        assert outcome.action == "DISPATCHED", outcome.reason
        assert outcome.runner_result_status == "NEEDS-AUDIT", outcome.dispatch
        assert outcome.dispatch is not None and outcome.dispatch.claimed is True

        registro = store.get("infra-bridge-teste")
        assert registro is not None
        assert registro.status == task_runtime.RUNTIME_NEEDS_AUDIT
        assert registro.checkpoint_commit
        assert registro.branch == "runner/infra-bridge-teste"
        assert registro.pr_number == 901
        assert registro.guard_dispatched_pr == 901

        # AVAILABLE -> BUSY observável nos heartbeats reais.
        statuses = [h["record"]["status"] for h in outcome.dispatch.heartbeats if h.get("record")]
        assert "BUSY" in statuses, statuses

        # PR criada uma vez, com escopo e a frase de merge só do José.
        assert len(api.criadas) == 1
        corpo = api.criadas[0]["body"]
        assert "## ESCOPO" in corpo
        assert "infra-bridge-teste" in corpo
        assert "`alvo.txt`" in corpo
        assert "Claude Worker 4" in corpo
        assert bridge_pr.FRASE_MERGE_SO_JOSE in corpo
        assert "NEEDS-AUDIT" in corpo
        assert api.criadas[0]["head_branch"] == "runner/infra-bridge-teste"
        assert api.criadas[0]["base"] == "bootstrap"

        # Guard despachado uma vez, da ref confiável, só com o número.
        assert api.dispatches == [(bridge_pr.GUARD_WORKFLOW_FILE, "bootstrap", {"pr_number": "901"})]

        # Worker liberado por CAS — nunca BUSY fantasma.
        assert outcome.liberacao is not None
        assert outcome.liberacao.action in ("RELEASED", "ALREADY_FREE"), outcome.liberacao
        fresco = registry.find_by_name_or_id(PILOT_WORKER)
        assert fresco is not None and fresco.current_task is None
        assert fresco.status in ("AVAILABLE", "OFFLINE")
    print("OK  test_sucesso_termina_em_needs_audit_com_pr_e_guard")


def test_pr_e_idempotente_nunca_duplica() -> None:
    api = _FakeGitHubApi()
    task = RunnerTask(
        task_id="t--bridge-abc123abc123", priority=Priority.P0, source_issue=128,
        branch="runner/t", allowed_files=("alvo.txt",),
        instructions="Escrever OK em alvo.txt.", checkpoint_commit=None,
        capabilities_required=("codigo",), risk_level="BAIXO", policy_level="C",
    )
    primeira = bridge_pr.garantir_pr(
        api, task=task, canonical_task_id="t", worker_id=PILOT_WORKER,
        worker_display="Claude Worker 4", checkpoint_commit="abcdef1",
        base_branch="main", titulo_tarefa="T", objetivo="Escrever OK.",
    )
    assert primeira.action == "CREATED" and primeira.pr_number == 901
    segunda = bridge_pr.garantir_pr(
        api, task=task, canonical_task_id="t", worker_id=PILOT_WORKER,
        worker_display="Claude Worker 4", checkpoint_commit="abcdef1",
        base_branch="main", titulo_tarefa="T", objetivo="Escrever OK.",
    )
    assert segunda.action == "REUSED" and segunda.pr_number == 901
    assert len(api.criadas) == 1
    print("OK  test_pr_e_idempotente_nunca_duplica")


def test_disparo_do_guard_e_idempotente() -> None:
    store = _runtime_store()
    reserva = store.reservar("t-guard", worker_id=PILOT_WORKER, branch="runner/t-guard")
    assert reserva.reservado and reserva.record is not None
    store.registrar_resultado(
        "t-guard", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=PILOT_WORKER,
        execution_task_id=reserva.record.execution_task_id or "", reason="ok",
        checkpoint_commit="abcdef1",
    )
    assert store.marcar_guard_disparado("t-guard", pr_number=55) is True
    assert store.marcar_guard_disparado("t-guard", pr_number=55) is False
    print("OK  test_disparo_do_guard_e_idempotente")


def test_pr_nao_e_aberta_para_resultado_sem_nada_publicado() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        api = _FakeGitHubApi()
        # Patch fora de allowed_files -> BLOCKED, nada publicado.
        outcome, _c, _s, _r = _ciclo(
            tmp, [_tarefa()], patch=_patch_padrao("fora.txt"), api=api,
        )
        assert outcome.runner_result_status == "BLOCKED"
        assert api.criadas == [] and api.dispatches == []
        assert outcome.pr is None
    print("OK  test_pr_nao_e_aberta_para_resultado_sem_nada_publicado")


def test_blocked_limit_mantem_checkpoint_e_nao_libera_o_worker() -> None:
    registry = _registry_com_workers()
    registry.upsert(
        WorkerRecord(
            worker_id=PILOT_WORKER, display_name="Claude Worker 4", type="api_runner",
            status="LIMIT", capabilities=("codigo",), current_task="t-limite",
            last_checkpoint="abcdef1", branch="runner/t-limite", can_execute=True,
        ),
        message="teste: worker em limite com checkpoint",
    )
    liberacao = worker_bridge.liberar_worker_apos_resultado(
        registry, PILOT_WORKER, canonical_task_id="t-limite",
        resultado_status=task_runtime.RUNTIME_BLOCKED_LIMIT,
    )
    assert liberacao.action == "PRESERVED", liberacao
    fresco = registry.find_by_name_or_id(PILOT_WORKER)
    assert fresco is not None
    assert fresco.current_task == "t-limite" and fresco.last_checkpoint == "abcdef1"

    # E o registro operacional exige checkpoint para representar o limite.
    try:
        task_runtime.TaskRuntimeRecord(
            canonical_task_id="t-limite", status=task_runtime.RUNTIME_BLOCKED_LIMIT,
        )
    except ValueError as exc:
        assert "checkpoint_commit" in str(exc)
    else:
        raise AssertionError("BLOCKED-LIMIT sem checkpoint deveria falhar na construção.")
    print("OK  test_blocked_limit_mantem_checkpoint_e_nao_libera_o_worker")


def test_worker_fantasma_busy_e_liberado_por_cas() -> None:
    registry = _registry_com_workers()
    registry.upsert(
        WorkerRecord(
            worker_id=PILOT_WORKER, display_name="Claude Worker 4", type="api_runner",
            status="BUSY", capabilities=("codigo",), current_task="t-fantasma",
            can_execute=True,
        ),
        message="teste: worker fantasma",
    )
    liberacao = worker_bridge.liberar_worker_apos_resultado(
        registry, PILOT_WORKER, canonical_task_id="t-fantasma",
        resultado_status=task_runtime.RUNTIME_NEEDS_AUDIT,
    )
    assert liberacao.action == "RELEASED", liberacao
    fresco = registry.find_by_name_or_id(PILOT_WORKER)
    assert fresco is not None and fresco.status == "AVAILABLE" and fresco.current_task is None
    print("OK  test_worker_fantasma_busy_e_liberado_por_cas")


def test_liberacao_nao_toca_worker_que_assumiu_outra_tarefa() -> None:
    registry = _registry_com_workers()
    registry.upsert(
        WorkerRecord(
            worker_id=PILOT_WORKER, display_name="Claude Worker 4", type="api_runner",
            status="BUSY", capabilities=("codigo",), current_task="outra-tarefa",
            can_execute=True,
        ),
        message="teste: worker já em outra tarefa",
    )
    liberacao = worker_bridge.liberar_worker_apos_resultado(
        registry, PILOT_WORKER, canonical_task_id="t-antiga",
        resultado_status=task_runtime.RUNTIME_NEEDS_AUDIT,
    )
    assert liberacao.action == "SKIPPED", liberacao
    fresco = registry.find_by_name_or_id(PILOT_WORKER)
    assert fresco is not None and fresco.current_task == "outra-tarefa"
    print("OK  test_liberacao_nao_toca_worker_que_assumiu_outra_tarefa")


# ---------------------------------------------------------------------------
# §12 — nenhum merge, nenhuma escrita em tasks.json/main
# ---------------------------------------------------------------------------

def test_ciclo_nao_altera_tasks_json() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tarefas = [_tarefa()]
        api = _FakeGitHubApi()
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work")
        caminho = _escrever_tasks_json(tmp, tarefas)
        with open(caminho, encoding="utf-8") as fh:
            antes = fh.read()

        outcome = worker_bridge.executar_ciclo(
            config=_config(), tasks_json_path=caminho, repo_dir=workdir,
            state_git_remote=remoto, worker_registry=_registry_com_workers(),
            runtime_store=_runtime_store(), base_branch="bootstrap", github_api=api,
            validation_command_keys=(), patch=_patch_padrao(),
        )
        assert outcome.action == "DISPATCHED"
        with open(caminho, encoding="utf-8") as fh:
            assert fh.read() == antes, "o Bridge nunca escreve em coordination/tasks.json"
    print("OK  test_ciclo_nao_altera_tasks_json")


def test_nenhuma_publicacao_em_main_ou_master() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        workdir = _clonar_workdir(tmp, remoto, "work")
        caminho = _escrever_tasks_json(tmp, [_tarefa()])
        outcome = worker_bridge.executar_ciclo(
            config=_config(), tasks_json_path=caminho, repo_dir=workdir,
            state_git_remote=remoto, worker_registry=_registry_com_workers(),
            runtime_store=_runtime_store(), base_branch="bootstrap", github_api=None,
            validation_command_keys=(), patch=_patch_padrao(),
        )
        assert outcome.runner_task is not None
        assert outcome.runner_task.branch.startswith("runner/")
        branches = subprocess.run(
            ["git", "-C", remoto, "branch", "--format=%(refname:short)"],
            capture_output=True, text=True, check=True,
        ).stdout.split()
        assert "main" not in branches and "master" not in branches, branches
        assert "runner/infra-bridge-teste" in branches, branches
    print("OK  test_nenhuma_publicacao_em_main_ou_master")


def test_cliente_de_api_nao_tem_nenhuma_operacao_de_merge() -> None:
    """Prova estrutural, mesma técnica de ``never_merge``: a capacidade
    não existe. O protocolo tem três operações e nenhuma delas integra
    nada; o cliente real também não expõe outra."""
    publicos = {
        n for n in dir(bridge_pr.GitHubRestApi)
        if not n.startswith("_")
    }
    assert publicos == {"prs_abertas_por_head", "criar_pr", "despachar_workflow"}, publicos
    fonte_path = os.path.join(_pathsetup._COORDINATOR_ROOT, "bridge_pr.py")
    with open(fonte_path, encoding="utf-8") as fh:
        fonte = fh.read().lower()
    # Formas de CHAMADA, não prosa: o módulo fala de merge e de deploy nos
    # comentários justamente para dizer que não os faz, então a prova
    # procura endpoints e métodos, não as palavras.
    for proibido in (
        "/merge",
        "merge_pull_request",
        "netlify.com",
        "api.netlify",
        "/deployments",
        "deploy_hook",
        "/merges",
    ):
        assert proibido not in fonte, proibido
    print("OK  test_cliente_de_api_nao_tem_nenhuma_operacao_de_merge")


def test_guard_e_o_unico_workflow_despachavel() -> None:
    api = bridge_pr.GitHubRestApi(owner="o", repo="r")
    try:
        api.despachar_workflow(arquivo="qualquer-outro.yml", ref="main", inputs={})
    except bridge_pr.GitHubBridgeApiError as exc:
        assert "fail-closed" in str(exc)
    else:
        raise AssertionError("despachar outro workflow deveria falhar fechado.")
    print("OK  test_guard_e_o_unico_workflow_despachavel")


# ---------------------------------------------------------------------------
# §5 — modo supervised do Runner, e o canário intocado
# ---------------------------------------------------------------------------

def test_supervised_sem_autorizacao_do_bridge_fecha_o_portao() -> None:
    # Exatamente o que alguém conseguiria montar só com Variables.
    cfg = RunnerDispatchConfig.from_env({
        "REPASSO_RUNNER_ENABLED": "true",
        "REPASSO_RUNNER_MODE": RUNNER_MODE_SUPERVISED,
        "REPASSO_RUNNER_CANARY_TASK_ID": "qualquer-tarefa",
    })
    assert cfg.supervised_task_id is None and cfg.supervised_authorized_by is None
    gate = cfg.gate()
    assert gate.open is False and "Worker Bridge" in gate.reason
    # E a Variable do canário não autoriza nada em supervised.
    assert cfg.task_autorizada("qualquer-tarefa") is False
    print("OK  test_supervised_sem_autorizacao_do_bridge_fecha_o_portao")


def test_supervised_autoriza_somente_a_tarefa_do_bridge() -> None:
    cfg = worker_bridge.construir_config_do_runner(_config(), canonical_task_id="infra-bridge-teste")
    assert cfg.mode == RUNNER_MODE_SUPERVISED
    assert cfg.supervised_authorized_by == SUPERVISED_AUTHORIZATION_SOURCE
    assert cfg.canary_task_id is None
    assert cfg.gate().open is True
    assert cfg.task_autorizada("qualquer-id", canonical_task_id="infra-bridge-teste") is True
    assert cfg.task_autorizada("qualquer-id", canonical_task_id="outra-tarefa") is False
    assert cfg.task_autorizada("infra-bridge-teste-2", canonical_task_id="infra-bridge-teste-2") is False
    print("OK  test_supervised_autoriza_somente_a_tarefa_do_bridge")


def test_config_do_runner_nao_e_construida_com_portao_fechado() -> None:
    try:
        worker_bridge.construir_config_do_runner(_config(enabled=False), canonical_task_id="t")
    except ValueError as exc:
        assert "portão do Bridge fechado" in str(exc)
    else:
        raise AssertionError("não deveria construir config com o portão fechado.")
    print("OK  test_config_do_runner_nao_e_construida_com_portao_fechado")


def test_canario_continua_se_comportando_como_antes() -> None:
    """O modo ``canary`` não mudou em nada: mesma Variable, mesma
    comparação estrita, mesmo portão."""
    cfg = RunnerDispatchConfig.from_env({
        "REPASSO_RUNNER_ENABLED": "true",
        "REPASSO_RUNNER_MODE": ALLOWED_RUNNER_MODE,
        "REPASSO_RUNNER_CANARY_TASK_ID": "canario-x",
    })
    assert cfg.gate().open is True
    assert cfg.is_supervised is False
    assert cfg.task_autorizada("canario-x") is True
    assert cfg.task_autorizada("canario-y") is False
    assert cfg.task_autorizada("canario-x--continuacao-abc1234", canonical_task_id="canario-x") is True
    # Sem MODE configurado, o default continua sendo o canário.
    padrao = RunnerDispatchConfig.from_env({"REPASSO_RUNNER_ENABLED": "true"})
    assert padrao.mode == ALLOWED_RUNNER_MODE
    assert padrao.gate().open is False  # sem CANARY_TASK_ID
    print("OK  test_canario_continua_se_comportando_como_antes")


def test_flags_do_bridge_sao_separadas_das_do_canario() -> None:
    # Ligar o canário não liga o Bridge...
    do_canario = WorkerBridgeConfig.from_env({
        "REPASSO_RUNNER_ENABLED": "true",
        "REPASSO_RUNNER_MODE": "canary",
        "REPASSO_RUNNER_CANARY_TASK_ID": "canario-x",
    })
    assert do_canario.enabled is False and do_canario.gate().open is False
    # ...e ligar o Bridge não liga o canário.
    do_bridge = RunnerDispatchConfig.from_env({
        worker_bridge.ENV_BRIDGE_ENABLED: "true",
        worker_bridge.ENV_BRIDGE_MODE: worker_bridge.BRIDGE_MODE_PILOT,
        worker_bridge.ENV_BRIDGE_PILOT_TASK_ID: "t",
        worker_bridge.ENV_BRIDGE_PILOT_WORKER_ID: PILOT_WORKER,
    })
    assert do_bridge.enabled is False and do_bridge.gate().open is False
    print("OK  test_flags_do_bridge_sao_separadas_das_do_canario")


# ---------------------------------------------------------------------------
# Integração com o registro REAL: a tarefa piloto desta PR.
# ---------------------------------------------------------------------------

def test_tarefa_piloto_real_materializa_e_e_autorizada() -> None:
    from coordinator.scheduler import load_tasks_from_tasks_json

    caminho = os.path.join(_pathsetup.REPO_ROOT, "coordination", "tasks.json")
    tarefas = {t.id: t for t in load_tasks_from_tasks_json(caminho)}
    metadados = worker_bridge.carregar_metadados_de_automacao(caminho)

    piloto_id = "infra-worker-bridge-pilot"
    assert piloto_id in tarefas, "a tarefa piloto precisa existir no registro declarativo"
    tarefa = tarefas[piloto_id]
    meta = metadados[piloto_id]

    assert tarefa.estado == "READY"
    assert tarefa.arquivos == (ARQUIVO_PILOTO,)
    assert meta.automation_enabled is True
    assert meta.bridge_enabled is True
    assert meta.risk_level == "BAIXO" and meta.policy_level == "C"
    assert meta.issue == 128

    politica = worker_bridge.avaliar_politica(meta, task_id=piloto_id)
    assert politica.permitido is True, politica.reason

    materializada = worker_bridge.materializar_runner_task(tarefa, meta)
    assert materializada.ok is True, materializada.reason
    task = materializada.task
    assert task is not None
    assert task.branch == "runner/infra-worker-bridge-pilot"
    assert task.allowed_files == (ARQUIVO_PILOTO,)
    assert task.policy_level == "C" and task.risk_level == "BAIXO"
    assert task.jose_authorized is False
    assert task.publication_required is False
    assert task.never_merge is True and task.can_publish is False
    assert "WORKER_BRIDGE=OK" in task.instructions
    assert ARQUIVO_PILOTO in task.instructions
    print("OK  test_tarefa_piloto_real_materializa_e_e_autorizada")


def test_infra_do_bridge_nao_e_automatizavel_por_ela_mesma() -> None:
    """A tarefa de INFRAESTRUTURA (esta PR) é executada por um Claude
    humano — ela declara ``automation_enabled=false`` de propósito, então
    o Bridge nunca tenta executar a si mesmo."""
    caminho = os.path.join(_pathsetup.REPO_ROOT, "coordination", "tasks.json")
    metadados = worker_bridge.carregar_metadados_de_automacao(caminho)
    meta = metadados["infra-worker-bridge-v1"]
    assert meta.automation_enabled is False
    assert worker_bridge.avaliar_politica(meta, task_id="infra-worker-bridge-v1").permitido is False
    print("OK  test_infra_do_bridge_nao_e_automatizavel_por_ela_mesma")


def test_piloto_real_nao_foi_executado_nesta_pr() -> None:
    """O arquivo do piloto NÃO pode existir no repositório: o piloto é
    preparado nesta PR, nunca executado (§8)."""
    assert not os.path.exists(os.path.join(_pathsetup.REPO_ROOT, ARQUIVO_PILOTO)), (
        "o arquivo do piloto existe — o piloto não deveria ter sido executado nesta PR."
    )
    print("OK  test_piloto_real_nao_foi_executado_nesta_pr")


def test_nenhum_laco_de_fila_no_bridge() -> None:
    """Prova estrutural do §13 ("não criar polling periódico", "não fazer
    loop infinito consumindo a fila"): o módulo não tem nenhum ``while``,
    nenhum ``sleep`` e nenhuma iteração sobre a fila decidindo mais de uma
    atribuição."""
    caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, "worker_bridge.py")
    with open(caminho, encoding="utf-8") as fh:
        fonte = fh.read()
    assert "while " not in fonte and "while(" not in fonte
    assert "sleep" not in fonte
    assert "schedule" not in fonte.lower().replace("scheduler", "")
    print("OK  test_nenhum_laco_de_fila_no_bridge")


def main() -> int:
    testes = [
        test_bridge_desligado_nao_faz_nada,
        test_modo_invalido_fecha_o_portao,
        test_piloto_sem_as_duas_variaveis_fecha_o_portao,
        test_ref_diferente_da_branch_padrao_fecha_o_portao,
        test_piloto_recusa_worker_diferente,
        test_piloto_recusa_tarefa_diferente,
        test_comparacao_do_piloto_e_estrita_nunca_prefixo,
        test_tarefa_sem_automation_enabled_e_recusada,
        test_metadados_ausentes_sao_recusa,
        test_tarefa_sem_risco_ou_politica_explicitos_e_recusada,
        test_nivel_e_nunca_executa,
        test_nivel_d_sem_autorizacao_de_jose_e_recusado,
        test_curinga_em_allowed_files_e_recusado_nunca_expandido,
        test_branch_nunca_e_main_e_e_deterministica,
        test_instrucoes_sao_montadas_da_tarefa_e_nunca_sao_vagas,
        test_arquivo_fora_de_allowed_files_bloqueia_sem_publicar,
        test_worker_incompativel_nao_recebe_atribuicao,
        test_nenhum_worker_disponivel_nao_executa_nada,
        test_somente_o_worker_4_nasce_elegivel,
        test_sessoes_humanas_nunca_entram_no_pool_do_bridge,
        test_bootstrap_nunca_sobrescreve_worker_em_execucao,
        test_bootstrap_bloqueado_com_portao_fechado_nao_escreve_nada,
        test_dois_workers_tentando_a_mesma_tarefa_so_um_reserva,
        test_dois_runs_da_mesma_tarefa_so_um_executa,
        test_cas_do_resultado_recusa_execucao_que_perdeu_a_corrida,
        test_id_de_execucao_e_novo_em_cada_reserva,
        test_tarefa_em_progresso_nao_e_redistribuida,
        test_tarefa_needs_audit_nao_e_redistribuida,
        test_tarefa_done_nao_e_redistribuida,
        test_tarefa_failed_nao_entra_em_retry_automatico,
        test_tarefa_blocked_limit_nao_e_redistribuida_e_guarda_checkpoint,
        test_runtime_nunca_reabre_tarefa_fechada_no_declarativo,
        test_dependencia_considera_done_operacional,
        test_sucesso_termina_em_needs_audit_com_pr_e_guard,
        test_pr_e_idempotente_nunca_duplica,
        test_disparo_do_guard_e_idempotente,
        test_pr_nao_e_aberta_para_resultado_sem_nada_publicado,
        test_blocked_limit_mantem_checkpoint_e_nao_libera_o_worker,
        test_worker_fantasma_busy_e_liberado_por_cas,
        test_liberacao_nao_toca_worker_que_assumiu_outra_tarefa,
        test_ciclo_nao_altera_tasks_json,
        test_nenhuma_publicacao_em_main_ou_master,
        test_cliente_de_api_nao_tem_nenhuma_operacao_de_merge,
        test_guard_e_o_unico_workflow_despachavel,
        test_supervised_sem_autorizacao_do_bridge_fecha_o_portao,
        test_supervised_autoriza_somente_a_tarefa_do_bridge,
        test_config_do_runner_nao_e_construida_com_portao_fechado,
        test_canario_continua_se_comportando_como_antes,
        test_flags_do_bridge_sao_separadas_das_do_canario,
        test_tarefa_piloto_real_materializa_e_e_autorizada,
        test_infra_do_bridge_nao_e_automatizavel_por_ela_mesma,
        test_piloto_real_nao_foi_executado_nesta_pr,
        test_nenhum_laco_de_fila_no_bridge,
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
