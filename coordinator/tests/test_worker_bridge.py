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
from coordinator import bridge_pr, bridge_workers, scheduler, task_runtime, worker_bridge
from coordinator.classify import Priority
from coordinator.runner_contract import RunnerResult, RunnerTask
from coordinator.runner_dispatch import (
    ALLOWED_RUNNER_MODE,
    RUNNER_MODE_SUPERVISED,
    SUPERVISED_AUTHORIZATION_SOURCE,
    DispatchOutcome,
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
    # Alguns testes de integração executam mais de um ciclo sobre a MESMA
    # branch/checkpoint/PR. Nesses casos o remoto precisa persistir entre
    # ciclos; recriá-lo causaria FileExistsError antes de testar o fluxo real.
    if os.path.isdir(os.path.join(remoto, ".git")):
        return remoto
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
    """Operações mínimas do protocolo ``bridge_pr.GitHubBridgeApi``.
    A leitura de PR por número é read-only; nenhuma operação de merge existe."""

    def __init__(self, primeiro_numero: int = 901) -> None:
        self.prs: list[dict] = []
        self.criadas: list[dict] = []
        self.dispatches: list[tuple] = []
        self.comentarios: dict[int, list[dict]] = {}
        self._proximo = primeiro_numero

    def prs_abertas_por_head(self, branch: str) -> list[dict]:
        return [p for p in self.prs if p["head_branch"] == branch]

    def pr_por_numero(self, pr_number: int) -> dict:
        candidatos = [p for p in (self.prs + self.criadas) if p.get("number") == pr_number]
        if not candidatos:
            raise bridge_pr.GitHubBridgeApiError(f"PR #{pr_number} inexistente no fake")
        p = candidatos[0]
        return {
            "number": pr_number,
            "state": p.get("state", "open"),
            "merged": bool(p.get("merged")),
            "base": {"ref": p.get("base"), "repo": {"full_name": "fake/repo"}},
            "head": {
                "ref": p.get("head_branch"),
                "sha": p.get("head_sha"),
                "repo": {"full_name": "fake/repo"},
            },
        }

    def comentarios_da_pr(self, pr_number: int) -> list[dict]:
        return list(self.comentarios.get(pr_number, []))

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


def test_pilot_filtra_workers_stale_available_antes_do_scheduler() -> None:
    """Regressão do run real #59 / Issue #150.

    O registro pode carregar worker 1..3 como AVAILABLE de uma passagem
    anterior por active-supervised. Em pilot isso NÃO autoriza o Scheduler
    a escolhê-los: somente o worker 4 elegível no modo pode entrar na
    visão de decisão, sem rebaixar/apagar o estado persistido dos demais.
    """
    registry = _registry_com_workers(
        _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
    )
    for worker_id in bridge_workers.BRIDGE_WORKER_IDS:
        fresco = registry.find_by_name_or_id(worker_id)
        assert fresco is not None and fresco.status == "AVAILABLE", (worker_id, fresco)

    with tempfile.TemporaryDirectory() as tmp:
        api = _FakeGitHubApi()
        outcome, _c, _s, _r = _ciclo(
            tmp, [_tarefa()], config=_config(), registry=registry, api=api,
        )

    assert outcome.action == "DISPATCHED", outcome
    assert outcome.decision is not None
    assert outcome.decision.worker_id == PILOT_WORKER, outcome.decision
    assert outcome.runner_result_status == "NEEDS-AUDIT", outcome.dispatch

    # O filtro é só uma visão em memória: os workers 1..3 não são
    # desabilitados/rebaixados como efeito colateral do piloto.
    for worker_id in (
        bridge_workers.BRIDGE_WORKER_1,
        bridge_workers.BRIDGE_WORKER_2,
        bridge_workers.BRIDGE_WORKER_3,
    ):
        fresco = registry.find_by_name_or_id(worker_id)
        assert fresco is not None and fresco.status == "AVAILABLE", (worker_id, fresco)

    print("OK  test_pilot_filtra_workers_stale_available_antes_do_scheduler")


def test_piloto_recusa_tarefa_diferente() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        proibido = _GeracaoProibida()
        outcome, _c, store, _r = _ciclo(
            tmp, [_tarefa(id="outra-tarefa", branch="runner/outra-tarefa")],
            config=_config(pilot_task_id="infra-bridge-teste"),
            patch=None, gerar_patch=proibido,
        )
        # Depois da correção B1 a tarefa alheia já não é CANDIDATA em modo
        # piloto (``restringir_ao_piloto``), então o ciclo termina sem
        # atribuição em vez de chegar ao portão e ser recusado lá. As duas
        # formas são inertes; a recusa estrita do portão continua provada
        # diretamente em test_comparacao_do_piloto_e_estrita_nunca_prefixo.
        assert outcome.action in ("NO_ASSIGNMENT", "BLOCKED"), outcome
        assert proibido.chamado is False
        assert store.list_records() == []
        # E o portão continua recusando explicitamente aquele par.
        ok, motivo = _config(pilot_task_id="infra-bridge-teste").permite(
            task_id="outra-tarefa", worker_id=PILOT_WORKER
        )
        assert ok is False and "não é a tarefa piloto autorizada" in motivo
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
    """A capability continua sendo um REQUISITO, não um desempate. O teste
    constrói a incompatibilidade explicitamente em vez de depender do
    valor de ``BRIDGE_CAPABILITIES`` — que, pela correção B2 da auditoria
    do PR #129, passou a incluir ``conteudo`` justamente para poder
    receber a fila real."""
    with tempfile.TemporaryDirectory() as tmp:
        registry = _registry_com_workers()
        atual = registry.find_by_name_or_id(PILOT_WORKER)
        assert atual is not None
        registry.upsert(
            WorkerRecord(
                worker_id=atual.worker_id, display_name=atual.display_name, type=atual.type,
                status="AVAILABLE", capabilities=("codigo",), can_execute=True,
            ),
            message="teste: worker que só sabe codigo",
        )
        outcome, _c, store, _r = _ciclo(
            tmp, [_tarefa(capabilities_required=["conteudo"])],
            registry=registry, patch=None, gerar_patch=_GeracaoProibida(),
        )
        assert outcome.action == "NO_ASSIGNMENT", outcome
        assert "capability" in outcome.reason
        assert store.list_records() == []
    print("OK  test_worker_incompativel_nao_recebe_atribuicao")


def test_tarefa_de_conteudo_pode_ser_atribuida_a_worker_programatico() -> None:
    """Correção B2 (auditoria do PR #129): a maior parte da fila real do
    Repasso Med é ``area=materia`` -> capability ``conteudo``. Com só
    ``("codigo",)`` o Bridge nunca poderia receber Fisiopatologia II,
    Toxicologia ou Dermatologia."""
    assert "conteudo" in bridge_workers.BRIDGE_CAPABILITIES
    assert "codigo" in bridge_workers.BRIDGE_CAPABILITIES
    with tempfile.TemporaryDirectory() as tmp:
        api = _FakeGitHubApi()
        outcome, _c, store, _r = _ciclo(
            tmp,
            [_tarefa(area="materia", materia="Fisiopatologia II", capabilities_required=["conteudo"])],
            api=api,
        )
        assert outcome.action == "DISPATCHED", outcome
        registro = store.get("infra-bridge-teste")
        assert registro is not None and registro.status == task_runtime.RUNTIME_NEEDS_AUDIT
    print("OK  test_tarefa_de_conteudo_pode_ser_atribuida_a_worker_programatico")


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


def test_merge_confirmado_vira_done_e_libera_dependencia_no_mesmo_ciclo() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        cfg = _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
        registry = _registry_com_workers(cfg)
        store = _runtime_store()
        base = _tarefa(id="dep-base", arquivos=["base.txt"], branch="runner/dep-base")
        filha = _tarefa(
            id="dep-filha", arquivos=["filha.txt"], branch="runner/dep-filha",
            dependencias=["dep-base"], prioridade_declarada="P1",
        )
        reserva = store.reservar("dep-base", worker_id=bridge_workers.BRIDGE_WORKER_1, branch="runner/dep-base")
        assert reserva.reservado and reserva.record is not None
        assert store.registrar_resultado(
            "dep-base", status=task_runtime.RUNTIME_NEEDS_AUDIT,
            worker_id=bridge_workers.BRIDGE_WORKER_1,
            execution_task_id=reserva.record.execution_task_id or "", reason="aguarda auditoria",
            checkpoint_commit="abcdef1", branch="runner/dep-base",
        )
        assert store.registrar_pr("dep-base", pr_number=901, esperado_status=task_runtime.RUNTIME_NEEDS_AUDIT)
        assert store.reservar_guard_dispatch("dep-base", pr_number=901)
        assert store.confirmar_guard_dispatch("dep-base", pr_number=901)
        api = _FakeGitHubApi()
        api.prs.append({"number": 901, "head_branch": "runner/dep-base", "base": "bootstrap", "merged": True})

        outcome, _c, _s, _r = _ciclo(
            tmp, [base, filha], config=cfg, registry=registry, runtime_store=store,
            api=api, patch=_patch_padrao("filha.txt"),
        )
        assert store.get("dep-base").status == task_runtime.RUNTIME_DONE
        assert outcome.decision is not None and outcome.decision.task_id == "dep-filha", outcome
    print("OK  test_merge_confirmado_vira_done_e_libera_dependencia_no_mesmo_ciclo")


def test_pr_fechada_sem_merge_ou_branch_divergente_nao_promove_done() -> None:
    for merged, head in ((False, "runner/dep-base"), (True, "runner/outra")):
        store = _runtime_store()
        reserva = store.reservar("dep-base", worker_id=bridge_workers.BRIDGE_WORKER_1, branch="runner/dep-base")
        assert reserva.reservado and reserva.record is not None
        assert store.registrar_resultado(
            "dep-base", status=task_runtime.RUNTIME_NEEDS_AUDIT,
            worker_id=bridge_workers.BRIDGE_WORKER_1,
            execution_task_id=reserva.record.execution_task_id or "", reason="aguarda auditoria",
            checkpoint_commit="abcdef1", branch="runner/dep-base",
        )
        assert store.registrar_pr("dep-base", pr_number=901, esperado_status=task_runtime.RUNTIME_NEEDS_AUDIT)
        assert store.reservar_guard_dispatch("dep-base", pr_number=901)
        assert store.confirmar_guard_dispatch("dep-base", pr_number=901)
        api = _FakeGitHubApi()
        api.prs.append({"number": 901, "head_branch": head, "base": "bootstrap", "merged": merged})
        notas, mudou = worker_bridge.reconciliar_merges_confirmados(
            {"dep-base": store.get("dep-base")}, runtime_store=store, github_api=api,
            base_branch="bootstrap", config=_config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED),
        )
        assert mudou is False, notas
        assert store.get("dep-base").status == task_runtime.RUNTIME_NEEDS_AUDIT
    print("OK  test_pr_fechada_sem_merge_ou_branch_divergente_nao_promove_done")


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
    # Reservar -> confirmar: depois de CONFIRMADO, nada redispara.
    assert store.reservar_guard_dispatch("t-guard", pr_number=55) is True
    assert store.confirmar_guard_dispatch("t-guard", pr_number=55) is True
    assert store.reservar_guard_dispatch("t-guard", pr_number=55) is False
    registro = store.get("t-guard")
    assert registro is not None and registro.guard_confirmado is True
    assert registro.guard_dispatch_attempts == 1
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
    """Prova estrutural: o cliente pode LER PR por número para reconciliar
    merge humano, mas continua sem qualquer capacidade de integrar/fechar PR."""
    publicos = {
        n for n in dir(bridge_pr.GitHubRestApi)
        if not n.startswith("_")
    }
    assert publicos == {
        "prs_abertas_por_head", "pr_por_numero", "comentarios_da_pr", "criar_pr", "despachar_workflow"
    }, publicos
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

def test_tarefa_piloto_historica_preserva_contrato_e_metadados() -> None:
    from coordinator.scheduler import load_tasks_from_tasks_json

    caminho = os.path.join(_pathsetup.REPO_ROOT, "coordination", "tasks.json")
    tarefas = {t.id: t for t in load_tasks_from_tasks_json(caminho)}
    metadados = worker_bridge.carregar_metadados_de_automacao(caminho)

    piloto_id = "infra-worker-bridge-pilot-r2"
    assert piloto_id in tarefas, "a tarefa piloto precisa existir no registro declarativo"
    tarefa = tarefas[piloto_id]
    meta = metadados[piloto_id]

    assert tarefa.estado == "DONE"
    assert tarefa.arquivos == (ARQUIVO_PILOTO,)
    assert meta.automation_enabled is True
    assert meta.bridge_enabled is True
    assert meta.risk_level == "BAIXO" and meta.policy_level == "C"
    assert meta.issue == 131

    politica = worker_bridge.avaliar_politica(meta, task_id=piloto_id)
    assert politica.permitido is True, politica.reason

    materializada = worker_bridge.materializar_runner_task(tarefa, meta)
    assert materializada.ok is True, materializada.reason
    task = materializada.task
    assert task is not None
    assert task.branch == "runner/infra-worker-bridge-pilot-r2"
    assert task.allowed_files == (ARQUIVO_PILOTO,)
    assert task.policy_level == "C" and task.risk_level == "BAIXO"
    assert task.jose_authorized is False
    assert task.publication_required is False
    assert task.never_merge is True and task.can_publish is False
    assert "WORKER_BRIDGE=OK" in task.instructions
    assert ARQUIVO_PILOTO in task.instructions
    print("OK  test_tarefa_piloto_historica_preserva_contrato_e_metadados")


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


def test_piloto_r2_fechado_preserva_evidencia_do_resultado() -> None:
    """Depois do piloto real, a evidência declarativa precisa permanecer
    fechada e auditável — nunca voltar para READY nem apagar PR/commit."""
    caminho = os.path.join(_pathsetup.REPO_ROOT, "coordination", "tasks.json")
    with open(caminho, encoding="utf-8") as fh:
        dados = json.load(fh)
    bruto = next(t for t in dados.get("tarefas", []) if t.get("id") == "infra-worker-bridge-pilot-r2")
    assert bruto.get("estado") == "DONE"
    assert bruto.get("pr") == 134
    assert bruto.get("commit") == "d62c852a355566374496058bf40f2f9847677a88"
    assert bruto.get("branch") == "runner/infra-worker-bridge-pilot-r2"
    assert bruto.get("automation_enabled") is True and bruto.get("bridge_enabled") is True
    print("OK  test_piloto_r2_fechado_preserva_evidencia_do_resultado")


def test_nenhum_laco_de_fila_no_bridge() -> None:
    """Uma execução continua consumindo no máximo UMA tarefa.

    Desde o loop NEEDS-FIX existem dois CAMINHOS mutuamente exclusivos:
    (a) tarefa nova; (b) correção pós-auditoria. Cada caminho escolhe no
    máximo um worker e chama o Runner uma única vez. O teste antigo contava
    ocorrências estáticas no arquivo inteiro e passou a dar falso positivo.
    """
    import inspect

    caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, "worker_bridge.py")
    with open(caminho, encoding="utf-8") as fh:
        fonte = fh.read()
    assert "while " not in fonte and "while(" not in fonte
    assert "sleep" not in fonte

    ciclo = inspect.getsource(worker_bridge.executar_ciclo)
    fix = inspect.getsource(worker_bridge.executar_correcao_de_auditoria)

    # Caminho normal: uma decisão da fila; se houver NEEDS-FIX, retorna antes
    # da decisão normal e delega para o caminho de correção.
    assert ciclo.count("scheduler.escolher_proxima_atribuicao(") == 1
    assert ciclo.count("executar_correcao_de_auditoria(") == 1

    # Caminho NEEDS-FIX: escolhe um worker e executa exatamente uma correção.
    assert fix.count("scheduler.escolher_proxima_atribuicao(") == 1
    assert fix.count("executar_tarefa(") == 1
    print("OK  test_nenhum_laco_de_fila_no_bridge")


# ---------------------------------------------------------------------------
# Auditoria independente do PR #129 — os cinco bloqueadores (B1..B5)
# ---------------------------------------------------------------------------

def _tasks_json_real() -> str:
    return os.path.join(_pathsetup.REPO_ROOT, "coordination", "tasks.json")


def test_b1_piloto_real_fechado_nao_reabre_a_fila() -> None:
    """Depois de concluído, o piloto real precisa permanecer DONE e fora
    da fila. A dependência da infraestrutura continua registrada e
    satisfeita, mas isso nunca reabre uma tarefa encerrada."""
    tarefas = scheduler.load_tasks_from_tasks_json(_tasks_json_real())
    por_id = {t.id: t for t in tarefas}

    piloto = por_id.get("infra-worker-bridge-pilot-r2")
    assert piloto is not None, "a tarefa piloto precisa existir no registro declarativo"
    assert piloto.estado == "DONE", piloto.estado
    assert piloto.dependencias == ("infra-worker-bridge-v1",), piloto.dependencias

    infra = por_id.get("infra-worker-bridge-v1")
    assert infra is not None and infra.estado == "DONE", (infra.estado if infra else None)

    prontas = [t.id for t in scheduler.proxima_tarefa_pronta(tarefas)]
    assert "infra-worker-bridge-pilot-r2" not in prontas, prontas
    print("OK  test_b1_piloto_real_fechado_nao_reabre_a_fila")


def test_b1_piloto_e_escolhido_mesmo_com_outra_tarefa_na_frente_da_fila() -> None:
    """B1, a outra metade: ``escolher_proxima_atribuicao`` oferece o
    PRIMEIRO da fila. Sem a restrição do modo piloto, uma tarefa READY à
    frente (mesma prioridade, id alfabeticamente menor) seria oferecida, o
    portão a recusaria e o piloto nunca rodaria — verde e inerte."""
    with tempfile.TemporaryDirectory() as tmp:
        api = _FakeGitHubApi()
        outcome, _c, store, _r = _ciclo(
            tmp,
            [
                # "aaa-..." vem antes de "infra-..." no desempate por id.
                _tarefa(id="aaa-outra-tarefa", branch="runner/aaa-outra-tarefa",
                        arquivos=["outro.txt"]),
                _tarefa(),
            ],
            api=api,
        )
        assert outcome.action == "DISPATCHED", outcome
        assert outcome.runtime_record is not None
        assert outcome.runtime_record.canonical_task_id == "infra-bridge-teste", outcome.runtime_record
        # E a tarefa alheia continua intocada no estado operacional.
        assert store.get("aaa-outra-tarefa") is None
    print("OK  test_b1_piloto_e_escolhido_mesmo_com_outra_tarefa_na_frente_da_fila")


def test_b1_restricao_do_piloto_nunca_amplia_nem_escreve() -> None:
    """A restrição é NARROW: fora do modo piloto a lista volta idêntica, e
    ela nunca transforma uma tarefa fechada em candidata."""
    tarefas = [
        _tarefa_record(_tarefa()),
        _tarefa_record(_tarefa(id="outra", estado="DONE")),
    ]
    iguais = worker_bridge.restringir_ao_piloto(
        tarefas, _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
    )
    assert [(t.id, t.estado) for t in iguais] == [(t.id, t.estado) for t in tarefas]

    restritas = worker_bridge.restringir_ao_piloto(tarefas, _config())
    por_id = {t.id: t.estado for t in restritas}
    assert por_id["infra-bridge-teste"] == "READY"
    # A DONE continua DONE — nunca é "reaberta" pela restrição.
    assert por_id["outra"] == "DONE"
    print("OK  test_b1_restricao_do_piloto_nunca_amplia_nem_escreve")


def test_b3_pilot_continua_somente_o_worker_4() -> None:
    assert bridge_workers.ids_elegiveis(worker_bridge.BRIDGE_MODE_PILOT) == (
        bridge_workers.BRIDGE_WORKER_4,
    )
    for outro in (bridge_workers.BRIDGE_WORKER_1, bridge_workers.BRIDGE_WORKER_2,
                  bridge_workers.BRIDGE_WORKER_3):
        assert bridge_workers.e_worker_elegivel(outro, modo=worker_bridge.BRIDGE_MODE_PILOT) is False
        ok, motivo = _config().permite(task_id="infra-bridge-teste", worker_id=outro)
        assert ok is False and "não é elegível" in motivo
    print("OK  test_b3_pilot_continua_somente_o_worker_4")


def test_b3_modo_desconhecido_nao_elege_ninguem() -> None:
    """Fail-closed: um modo que não existe devolve conjunto VAZIO, nunca o
    mais permissivo."""
    assert bridge_workers.ids_elegiveis("qualquer-coisa") == ()
    assert bridge_workers.ids_elegiveis("") == ()
    for worker_id in bridge_workers.BRIDGE_WORKER_IDS:
        assert bridge_workers.e_worker_elegivel(worker_id, modo="qualquer-coisa") is False
    print("OK  test_b3_modo_desconhecido_nao_elege_ninguem")


def test_b3_active_supervised_habilita_os_quatro_por_caminho_explicito() -> None:
    """B3: o bloqueador era que ``claude-worker-1..3``, criados OFFLINE no
    piloto, ficariam OFFLINE para sempre — mudar o modo não ligava nada,
    só uma alteração de código ligaria. Agora o bootstrap no modo
    ``active-supervised`` habilita os quatro por compare-and-set."""
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())

    # 1. o piloto roda primeiro e cria os quatro: só o 4 elegível.
    primeiro = bridge_workers.preparar_workers_do_bridge(registry, config=_config())
    assert primeiro.action == "PREPARED", primeiro.reason
    assert set(primeiro.criados) == set(bridge_workers.BRIDGE_WORKER_IDS)
    for worker_id in (bridge_workers.BRIDGE_WORKER_1, bridge_workers.BRIDGE_WORKER_2,
                      bridge_workers.BRIDGE_WORKER_3):
        registro = registry.find_by_name_or_id(worker_id)
        assert registro is not None and registro.status == "OFFLINE" and registro.can_execute is False

    # 2. José muda a Variable do MODO. Nenhuma linha de código muda.
    segundo = bridge_workers.preparar_workers_do_bridge(
        registry, config=_config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED),
    )
    assert segundo.action == "PREPARED", segundo.reason
    assert set(segundo.habilitados) == {
        bridge_workers.BRIDGE_WORKER_1, bridge_workers.BRIDGE_WORKER_2,
        bridge_workers.BRIDGE_WORKER_3,
    }, segundo.habilitados
    for worker_id in bridge_workers.BRIDGE_WORKER_IDS:
        registro = registry.find_by_name_or_id(worker_id)
        assert registro is not None, worker_id
        assert registro.status == "AVAILABLE" and registro.can_execute is True, registro
        # E continuam sendo o que eram: nunca merge, nunca publicação.
        assert registro.never_merge is True and registro.can_publish is False

    # 3. idempotente: rodar de novo não habilita ninguém (já estão prontos).
    terceiro = bridge_workers.preparar_workers_do_bridge(
        registry, config=_config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED),
    )
    assert terceiro.habilitados == (), terceiro.habilitados
    print("OK  test_b3_active_supervised_habilita_os_quatro_por_caminho_explicito")


def test_b3_habilitacao_nunca_toca_worker_em_execucao_nem_sessao_humana() -> None:
    """A habilitação é CAS com pré-condições fixas: só ``api_runner`` +
    OFFLINE + ``can_execute=False`` + sem tarefa."""
    registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
    bridge_workers.preparar_workers_do_bridge(registry, config=_config())

    # BUSY com tarefa em andamento -> impossível habilitar.
    registry.upsert(
        WorkerRecord(
            worker_id=bridge_workers.BRIDGE_WORKER_1,
            display_name="Claude Worker 1", type="api_runner", status="BUSY",
            capabilities=bridge_workers.BRIDGE_CAPABILITIES,
            current_task="alguma-tarefa", can_execute=False,
        ),
        message="teste: worker em execução",
    )
    assert registry.habilitar_worker_programatico_condicional(
        bridge_workers.BRIDGE_WORKER_1, message="teste"
    ) is False
    inalterado = registry.find_by_name_or_id(bridge_workers.BRIDGE_WORKER_1)
    assert inalterado is not None and inalterado.status == "BUSY"
    assert inalterado.current_task == "alguma-tarefa"

    # LIMIT e NEAR_LIMIT -> idem. Um worker que bateu no teto não é
    # "promovido" a AVAILABLE por um bootstrap: isso apagaria estado real
    # e o faria receber tarefa sem ter contexto para executá-la.
    for status in ("LIMIT", "NEAR_LIMIT"):
        registry.upsert(
            WorkerRecord(
                worker_id=bridge_workers.BRIDGE_WORKER_2,
                display_name="Claude Worker 2", type="api_runner", status=status,
                capabilities=bridge_workers.BRIDGE_CAPABILITIES,
                can_execute=False,
            ),
            message=f"teste: worker em {status}",
        )
        assert registry.habilitar_worker_programatico_condicional(
            bridge_workers.BRIDGE_WORKER_2, message="teste"
        ) is False, status
        preservado = registry.find_by_name_or_id(bridge_workers.BRIDGE_WORKER_2)
        assert preservado is not None and preservado.status == status, preservado

    # E o bootstrap completo no modo active-supervised também não os
    # sobrescreve: ele só reporta quem não pôde ser habilitado.
    resultado = bridge_workers.preparar_workers_do_bridge(
        registry, config=_config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED),
    )
    assert resultado.action == "PREPARED", resultado.reason
    assert bridge_workers.BRIDGE_WORKER_1 in resultado.nao_habilitados, resultado.nao_habilitados
    assert bridge_workers.BRIDGE_WORKER_2 in resultado.nao_habilitados, resultado.nao_habilitados
    ainda_busy = registry.find_by_name_or_id(bridge_workers.BRIDGE_WORKER_1)
    assert ainda_busy is not None and ainda_busy.status == "BUSY", ainda_busy
    assert ainda_busy.current_task == "alguma-tarefa"

    # Sessão humana -> impossível habilitar por este caminho (§13).
    assert registry.habilitar_worker_programatico_condicional(
        "claude-1", message="teste"
    ) is False
    humano = registry.find_by_name_or_id("claude-1")
    assert humano is not None and humano.type == "human_session" and humano.status == "OFFLINE"
    print("OK  test_b3_habilitacao_nunca_toca_worker_em_execucao_nem_sessao_humana")


def test_b3_active_supervised_pode_atribuir_a_qualquer_um_dos_quatro() -> None:
    """Com os quatro habilitados, o scheduler pode oferecer a tarefa a
    qualquer um deles — e o portão do Bridge aceita, porque o modo é
    ``active-supervised``."""
    cfg = _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
    for worker_id in bridge_workers.BRIDGE_WORKER_IDS:
        ok, motivo = cfg.permite(task_id="qualquer-tarefa", worker_id=worker_id)
        assert ok is True, motivo
    print("OK  test_b3_active_supervised_pode_atribuir_a_qualquer_um_dos_quatro")


def test_b4_falha_no_primeiro_dispatch_do_guard_e_recuperavel() -> None:
    """B4: antes, ``marcar_guard_disparado`` gravava "despachado" ANTES da
    chamada — uma falha de rede deixava a PR em NEEDS-AUDIT sem Guard para
    SEMPRE, porque toda tentativa seguinte recebia ALREADY_DISPATCHED."""
    store = _runtime_store()
    reserva = store.reservar("t-guard-falha", worker_id=PILOT_WORKER, branch="runner/t-guard-falha")
    assert reserva.reservado and reserva.record is not None
    store.registrar_resultado(
        "t-guard-falha", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=PILOT_WORKER,
        execution_task_id=reserva.record.execution_task_id or "", reason="ok",
        checkpoint_commit="abcdef1",
    )

    # 1ª tentativa: reserva, a chamada FALHA, a falha fica registrada.
    assert store.reservar_guard_dispatch("t-guard-falha", pr_number=77) is True
    assert store.falhar_guard_dispatch("t-guard-falha", pr_number=77) is True
    registro = store.get("t-guard-falha")
    assert registro is not None
    assert registro.guard_dispatch_status == task_runtime.GUARD_DISPATCH_FAILED
    assert registro.guard_confirmado is False

    # 2ª tentativa: AUTORIZADA — é exatamente isto que o bloqueador pedia.
    assert store.reservar_guard_dispatch("t-guard-falha", pr_number=77) is True
    assert store.confirmar_guard_dispatch("t-guard-falha", pr_number=77) is True
    registro = store.get("t-guard-falha")
    assert registro is not None and registro.guard_confirmado is True
    assert registro.guard_dispatch_attempts == 2, registro.guard_dispatch_attempts

    # 3ª: já confirmado -> nada redispara (a duplicação continua impossível).
    assert store.reservar_guard_dispatch("t-guard-falha", pr_number=77) is False
    print("OK  test_b4_falha_no_primeiro_dispatch_do_guard_e_recuperavel")


def test_b4_pendente_orfao_pode_ser_retomado_mas_confirmado_nunca() -> None:
    """Um processo morto entre a reserva e a confirmação deixa ``PENDING``.
    Retomar dali é permitido (o Guard é auditoria somente-leitura e o
    workflow tem ``concurrency`` por PR); redisparar um ``DISPATCHED``
    nunca é."""
    store = _runtime_store()
    reserva = store.reservar("t-guard-orfao", worker_id=PILOT_WORKER, branch="runner/t-guard-orfao")
    assert reserva.reservado
    assert store.reservar_guard_dispatch("t-guard-orfao", pr_number=88) is True
    registro = store.get("t-guard-orfao")
    assert registro is not None
    assert registro.guard_dispatch_status == task_runtime.GUARD_DISPATCH_PENDING
    assert registro.guard_confirmado is False  # PENDING nunca conta como sucesso

    assert store.reservar_guard_dispatch("t-guard-orfao", pr_number=88) is True
    assert store.confirmar_guard_dispatch("t-guard-orfao", pr_number=88) is True
    assert store.reservar_guard_dispatch("t-guard-orfao", pr_number=88) is False
    print("OK  test_b4_pendente_orfao_pode_ser_retomado_mas_confirmado_nunca")


def test_b4_registro_antigo_sem_status_e_lido_como_despachado() -> None:
    """Compatibilidade retroativa conservadora: um registro gravado ANTES
    da correção tem só ``guard_dispatched_pr``. Ele significava "já
    despachei", então nunca é lido como PENDING (o que autorizaria um
    redisparo que a versão antiga não previa)."""
    antigo = task_runtime.TaskRuntimeRecord.from_dict({
        "canonical_task_id": "t-antiga",
        "status": task_runtime.RUNTIME_NEEDS_AUDIT,
        "guard_dispatched_pr": 12,
    })
    assert antigo.guard_dispatch_status == task_runtime.GUARD_DISPATCH_DISPATCHED
    assert antigo.guard_confirmado is True
    print("OK  test_b4_registro_antigo_sem_status_e_lido_como_despachado")


def test_b4_ciclo_real_registra_a_falha_do_guard_e_permite_retomada() -> None:
    """O caminho de ponta a ponta: o Bridge roda, a PR abre, o disparo do
    Guard falha, e o estado operacional guarda FAILED (não "despachado")."""
    class _ApiComGuardQuebrado(_FakeGitHubApi):
        def despachar_workflow(self, *, arquivo: str, ref: str, inputs: dict) -> None:
            raise bridge_pr.GitHubBridgeApiError("500 simulado do GitHub")

    with tempfile.TemporaryDirectory() as tmp:
        api = _ApiComGuardQuebrado()
        outcome, _c, store, _r = _ciclo(tmp, [_tarefa()], api=api)
        assert outcome.action == "DISPATCHED", outcome
        assert outcome.pr is not None and outcome.pr.pr_number is not None
        assert outcome.guard is not None and outcome.guard.action == "FAILED", outcome.guard
        registro = store.get("infra-bridge-teste")
        assert registro is not None
        assert registro.guard_dispatch_status == task_runtime.GUARD_DISPATCH_FAILED
        assert registro.guard_confirmado is False
        # E uma próxima execução autorizada consegue tentar de novo.
        assert store.reservar_guard_dispatch(
            "infra-bridge-teste", pr_number=registro.guard_dispatched_pr or 0
        ) is True
    print("OK  test_b4_ciclo_real_registra_a_falha_do_guard_e_permite_retomada")


def test_pr_recovery_detecta_needs_audit_sem_pr_e_respeita_piloto() -> None:
    store = _runtime_store()
    reserva = store.reservar(
        "outra-tarefa", worker_id=PILOT_WORKER, branch="runner/outra-tarefa"
    )
    assert reserva.reservado and reserva.record is not None
    assert store.registrar_resultado(
        "outra-tarefa",
        status=task_runtime.RUNTIME_NEEDS_AUDIT,
        worker_id=PILOT_WORKER,
        execution_task_id=reserva.record.execution_task_id or "",
        reason="ok",
        checkpoint_commit="abcdef1",
        branch="runner/outra-tarefa",
    )
    registros = store.por_id()

    # Em active-supervised a execução publicada sem PR é candidata.
    ativo = _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
    candidato = worker_bridge.candidato_a_retomada_da_pr(registros, ativo)
    assert candidato is not None and candidato.canonical_task_id == "outra-tarefa"

    # Em pilot só a task piloto exata pode ser recuperada.
    assert worker_bridge.candidato_a_retomada_da_pr(registros, _config()) is None
    print("OK  test_pr_recovery_detecta_needs_audit_sem_pr_e_respeita_piloto")


def test_pr_recovery_abre_pr_e_guard_sem_runner_nem_anthropic_e_nao_duplica() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        caminho_tasks = _escrever_tasks_json(tmp, [_tarefa()])
        cfg = _config()
        registry = _registry_com_workers(cfg)
        store = _runtime_store()
        reserva = store.reservar(
            "infra-bridge-teste", worker_id=PILOT_WORKER,
            branch="runner/infra-bridge-teste",
        )
        assert reserva.reservado and reserva.record is not None
        assert store.registrar_resultado(
            "infra-bridge-teste",
            status=task_runtime.RUNTIME_NEEDS_AUDIT,
            worker_id=PILOT_WORKER,
            execution_task_id=reserva.record.execution_task_id or "",
            reason="patch já publicado",
            checkpoint_commit="abcdef1",
            branch="runner/infra-bridge-teste",
        )

        api = _FakeGitHubApi()
        proibido = _GeracaoProibida()

        primeiro = worker_bridge.executar_ciclo(
            config=cfg,
            tasks_json_path=caminho_tasks,
            repo_dir=_clonar_workdir(tmp, remoto, "work-pr-retry-1"),
            state_git_remote=remoto,
            worker_registry=registry,
            runtime_store=store,
            base_branch="bootstrap",
            github_api=api,
            validation_command_keys=(),
            patch=None,
            gerar_patch=proibido,
        )
        assert primeiro.action == "PR_RETRY", primeiro
        assert proibido.chamado is False
        assert primeiro.dispatch is None
        assert primeiro.pr is not None and primeiro.pr.action == "CREATED"
        assert primeiro.pr.pr_number == 901
        assert primeiro.guard is not None and primeiro.guard.action == "DISPATCHED"
        assert len(api.criadas) == 1
        assert api.dispatches == [
            (bridge_pr.GUARD_WORKFLOW_FILE, "bootstrap", {"pr_number": "901"})
        ]

        registro = store.get("infra-bridge-teste")
        assert registro is not None
        assert registro.status == task_runtime.RUNTIME_NEEDS_AUDIT
        assert registro.branch == "runner/infra-bridge-teste"
        assert registro.checkpoint_commit == "abcdef1"
        assert registro.execution_task_id == reserva.record.execution_task_id
        assert registro.pr_number == 901
        assert registro.guard_confirmado is True

        # O caminho de manutenção não cria branch/claim/commit novo.
        branches = subprocess.run(
            ["git", "-C", remoto, "branch", "--format=%(refname:short)"],
            capture_output=True, text=True, check=True,
        ).stdout.split()
        assert branches == ["bootstrap"], branches

        # Um ciclo seguinte não duplica PR nem Guard e também não gera patch.
        proibido2 = _GeracaoProibida()
        segundo = worker_bridge.executar_ciclo(
            config=cfg,
            tasks_json_path=caminho_tasks,
            repo_dir=_clonar_workdir(tmp, remoto, "work-pr-retry-2"),
            state_git_remote=remoto,
            worker_registry=registry,
            runtime_store=store,
            base_branch="bootstrap",
            github_api=api,
            validation_command_keys=(),
            patch=None,
            gerar_patch=proibido2,
        )
        assert segundo.action in ("NO_ASSIGNMENT", "POOL_PAUSED", "BLOCKED"), segundo
        assert proibido2.chamado is False
        assert len(api.criadas) == 1
        assert len(api.dispatches) == 1
    print("OK  test_pr_recovery_abre_pr_e_guard_sem_runner_nem_anthropic_e_nao_duplica")


def test_pr_recovery_falha_de_criacao_permanece_recuperavel_no_ciclo_seguinte() -> None:
    class _ApiFalhaUmaPr(_FakeGitHubApi):
        def __init__(self) -> None:
            super().__init__()
            self.tentativas_pr = 0

        def criar_pr(self, *, titulo: str, head: str, base: str, corpo: str) -> dict:
            self.tentativas_pr += 1
            if self.tentativas_pr == 1:
                raise bridge_pr.GitHubBridgeApiError("403 simulado ao criar PR")
            return super().criar_pr(titulo=titulo, head=head, base=base, corpo=corpo)

    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        caminho_tasks = _escrever_tasks_json(tmp, [_tarefa()])
        cfg = _config()
        registry = _registry_com_workers(cfg)
        store = _runtime_store()
        reserva = store.reservar(
            "infra-bridge-teste", worker_id=PILOT_WORKER,
            branch="runner/infra-bridge-teste",
        )
        assert reserva.reservado and reserva.record is not None
        assert store.registrar_resultado(
            "infra-bridge-teste",
            status=task_runtime.RUNTIME_NEEDS_AUDIT,
            worker_id=PILOT_WORKER,
            execution_task_id=reserva.record.execution_task_id or "",
            reason="patch já publicado",
            checkpoint_commit="abcdef1",
            branch="runner/infra-bridge-teste",
        )

        api = _ApiFalhaUmaPr()

        primeira = worker_bridge.executar_ciclo(
            config=cfg,
            tasks_json_path=caminho_tasks,
            repo_dir=_clonar_workdir(tmp, remoto, "work-pr-fail-1"),
            state_git_remote=remoto,
            worker_registry=registry,
            runtime_store=store,
            base_branch="bootstrap",
            github_api=api,
            validation_command_keys=(),
            patch=None,
            gerar_patch=_GeracaoProibida(),
        )
        assert primeira.action == "PR_RETRY"
        assert primeira.pr is not None and primeira.pr.action == "FAILED"
        assert store.get("infra-bridge-teste").pr_number is None
        assert api.dispatches == []

        # Como pr_number continuou ausente, o próximo ciclo tenta somente a PR de novo.
        proibido = _GeracaoProibida()
        segunda = worker_bridge.executar_ciclo(
            config=cfg,
            tasks_json_path=caminho_tasks,
            repo_dir=_clonar_workdir(tmp, remoto, "work-pr-fail-2"),
            state_git_remote=remoto,
            worker_registry=registry,
            runtime_store=store,
            base_branch="bootstrap",
            github_api=api,
            validation_command_keys=(),
            patch=None,
            gerar_patch=proibido,
        )
        assert segunda.action == "PR_RETRY"
        assert proibido.chamado is False
        assert segunda.pr is not None and segunda.pr.action == "CREATED"
        assert segunda.guard is not None and segunda.guard.action == "DISPATCHED"
        assert store.get("infra-bridge-teste").pr_number == 901
        assert api.tentativas_pr == 2
        assert len(api.criadas) == 1
        assert len(api.dispatches) == 1
    print("OK  test_pr_recovery_falha_de_criacao_permanece_recuperavel_no_ciclo_seguinte")


def _cartao_needs_fix(motivo: str = "corrigir conceito X") -> str:
    return "\n".join([
        worker_bridge.COORDINATOR_COMMENT_MARKER,
        worker_bridge.AUDIT_CARD_HEADER,
        "",
        "**PR:** #901",
        worker_bridge.AUDIT_NEEDS_FIX_LINE,
        f"**Motivo:** {motivo}",
    ])


def test_audit_fix_so_aceita_cartao_do_bot_confiavel() -> None:
    body = _cartao_needs_fix()
    humano = [{"id": 1, "user": {"login": "Repassomed"}, "body": body}]
    assert worker_bridge._audit_fix_request_from_comments(humano, pr_number=901) is None
    outro_bot = [{"id": 2, "user": {"login": "netlify[bot]"}, "body": body}]
    assert worker_bridge._audit_fix_request_from_comments(outro_bot, pr_number=901) is None
    confiavel = [{"id": 3, "user": {"login": "github-actions[bot]"}, "body": body}]
    pedido = worker_bridge._audit_fix_request_from_comments(confiavel, pr_number=901)
    assert pedido is not None and pedido.pr_number == 901 and pedido.comment_id == 3
    assert pedido.fingerprint and "corrigir conceito X" in pedido.findings
    print("OK  test_audit_fix_so_aceita_cartao_do_bot_confiavel")


def test_audit_fix_merge_ready_nao_reentra_em_correcao() -> None:
    body = _cartao_needs_fix().replace("NEEDS-FIX", "MERGE-READY")
    comentarios = [{"id": 4, "user": {"login": "github-actions[bot]"}, "body": body}]
    assert worker_bridge._audit_fix_request_from_comments(comentarios, pr_number=901) is None
    print("OK  test_audit_fix_merge_ready_nao_reentra_em_correcao")


def _store_needs_audit_para_fix() -> tuple[TaskRuntimeStore, task_runtime.TaskRuntimeRecord]:
    store = _runtime_store()
    reserva = store.reservar("t-fix", worker_id=bridge_workers.BRIDGE_WORKER_1, branch="runner/t-fix")
    assert reserva.reservado and reserva.record is not None
    assert store.registrar_resultado(
        "t-fix", status=task_runtime.RUNTIME_NEEDS_AUDIT,
        worker_id=bridge_workers.BRIDGE_WORKER_1,
        execution_task_id=reserva.record.execution_task_id or "",
        reason="aguarda auditoria", checkpoint_commit="abc123", branch="runner/t-fix",
    )
    assert store.registrar_pr("t-fix", pr_number=901, esperado_status=task_runtime.RUNTIME_NEEDS_AUDIT)
    assert store.reservar_guard_dispatch("t-fix", pr_number=901)
    assert store.confirmar_guard_dispatch("t-fix", pr_number=901)
    return store, store.get("t-fix")


def test_audit_fix_gera_execution_id_nova_e_mesmo_parecer_nao_roda_duas_vezes() -> None:
    store, anterior = _store_needs_audit_para_fix()
    assert anterior is not None
    primeira = store.reservar_correcao_apos_auditoria(
        "t-fix", worker_id=bridge_workers.BRIDGE_WORKER_2,
        audit_fingerprint="fp-1", audit_findings="corrigir X", max_attempts=2, token="111111111111",
    )
    assert primeira.reservado and primeira.record is not None
    novo = primeira.record
    assert novo.execution_task_id != anterior.execution_task_id
    assert anterior.execution_task_id in novo.execution_history
    assert novo.branch == anterior.branch and novo.checkpoint_commit == anterior.checkpoint_commit
    assert novo.pr_number == anterior.pr_number
    assert novo.guard_dispatch_status is None
    assert store.registrar_resultado(
        "t-fix", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=bridge_workers.BRIDGE_WORKER_2,
        execution_task_id=novo.execution_task_id or "", reason="corrigido",
        checkpoint_commit="def456", branch="runner/t-fix",
    )
    mesma = store.reservar_correcao_apos_auditoria(
        "t-fix", worker_id=bridge_workers.BRIDGE_WORKER_3,
        audit_fingerprint="fp-1", audit_findings="corrigir X", max_attempts=2, token="222222222222",
    )
    assert mesma.reservado is False and "mesmo parecer" in mesma.reason
    print("OK  test_audit_fix_gera_execution_id_nova_e_mesmo_parecer_nao_roda_duas_vezes")


def test_audit_fix_para_depois_de_duas_correcoes() -> None:
    store, _ = _store_needs_audit_para_fix()
    r1 = store.reservar_correcao_apos_auditoria(
        "t-fix", worker_id=bridge_workers.BRIDGE_WORKER_1, audit_fingerprint="fp-a",
        audit_findings="A", max_attempts=2, token="aaaaaaaaaaaa",
    )
    assert r1.reservado and r1.record is not None
    assert store.registrar_resultado(
        "t-fix", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=bridge_workers.BRIDGE_WORKER_1,
        execution_task_id=r1.record.execution_task_id or "", reason="a", checkpoint_commit="c1", branch="runner/t-fix",
    )
    r2 = store.reservar_correcao_apos_auditoria(
        "t-fix", worker_id=bridge_workers.BRIDGE_WORKER_2, audit_fingerprint="fp-b",
        audit_findings="B", max_attempts=2, token="bbbbbbbbbbbb",
    )
    assert r2.reservado and r2.record is not None and r2.record.audit_fix_attempts == 2
    assert store.registrar_resultado(
        "t-fix", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=bridge_workers.BRIDGE_WORKER_2,
        execution_task_id=r2.record.execution_task_id or "", reason="b", checkpoint_commit="c2", branch="runner/t-fix",
    )
    r3 = store.reservar_correcao_apos_auditoria(
        "t-fix", worker_id=bridge_workers.BRIDGE_WORKER_3, audit_fingerprint="fp-c",
        audit_findings="C", max_attempts=2, token="cccccccccccc",
    )
    assert r3.reservado is False and "teto de 2" in r3.reason
    print("OK  test_audit_fix_para_depois_de_duas_correcoes")


def test_audit_fix_integracao_corrige_mesma_pr_e_redespacha_guard() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        cfg = _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
        api = _FakeGitHubApi()
        registry = _registry_com_workers(cfg)
        store = _runtime_store()
        tarefa = _tarefa()

        primeiro, _c, store, registry = _ciclo(
            tmp, [tarefa], config=cfg, registry=registry, runtime_store=store,
            api=api, patch=_patch_padrao("alvo.txt", "versao 1\n"), nome_workdir="work-audit-fix-1",
        )
        assert primeiro.action == "DISPATCHED" and primeiro.pr is not None
        reg1 = store.get("infra-bridge-teste")
        assert reg1 is not None and reg1.status == task_runtime.RUNTIME_NEEDS_AUDIT
        assert reg1.pr_number == 901 and reg1.checkpoint_commit
        api.prs[0]["head_sha"] = reg1.checkpoint_commit
        api.comentarios[901] = [{
            "id": 77, "user": {"login": "github-actions[bot]"},
            "body": _cartao_needs_fix("trocar versao 1 por versao 2"),
        }]
        exec1 = reg1.execution_task_id
        dispatches_antes = len(api.dispatches)

        segundo, _c2, store, registry = _ciclo(
            tmp, [tarefa], config=cfg, registry=registry, runtime_store=store,
            api=api, patch=_patch_padrao("alvo.txt", "versao 2\n"), nome_workdir="work-audit-fix-2",
        )
        assert segundo.action == "AUDIT_FIX", segundo
        reg2 = store.get("infra-bridge-teste")
        assert reg2 is not None and reg2.status == task_runtime.RUNTIME_NEEDS_AUDIT
        assert reg2.pr_number == 901
        assert reg2.execution_task_id != exec1
        assert exec1 in reg2.execution_history
        assert reg2.audit_fix_attempts == 1
        assert len(api.criadas) == 1, "correção precisa reutilizar a mesma PR"
        assert len(api.dispatches) == dispatches_antes + 1, "novo HEAD precisa de novo Guard"
        assert segundo.runner_task is not None and "trocar versao 1 por versao 2" in segundo.runner_task.instructions

        # O mesmo cartão não dispara outra correção.
        api.prs[0]["head_sha"] = reg2.checkpoint_commit
        terceiro, *_ = _ciclo(
            tmp, [tarefa], config=cfg, registry=registry, runtime_store=store,
            api=api, patch=_patch_padrao("alvo.txt", "versao 3\n"), nome_workdir="work-audit-fix-3",
        )
        assert terceiro.action == "NO_ASSIGNMENT", terceiro
    print("OK  test_audit_fix_integracao_corrige_mesma_pr_e_redespacha_guard")

def test_error_registry_bridge_sucesso_normal_nao_gera_erro() -> None:
    record = task_runtime.TaskRuntimeRecord(
        canonical_task_id="t-ok",
        status=task_runtime.RUNTIME_NEEDS_AUDIT,
        worker_id=PILOT_WORKER,
        branch="runner/t-ok",
        checkpoint_commit="abcdef1",
        execution_task_id="t-ok--bridge-123456789abc",
    )
    dispatch = DispatchOutcome(
        result=RunnerResult(
            task_id="t-ok--bridge-123456789abc",
            status="NEEDS-AUDIT",
            reason="ok",
            checkpoint_commit="abcdef1",
            branch="runner/t-ok",
        ),
        claimed=True,
        external_calls_made=True,
    )
    outcome = worker_bridge.BridgeOutcome(
        "DISPATCHED", "ok", runtime_record=record, dispatch=dispatch,
    )
    assert worker_bridge.error_events_from_outcome(outcome) == []
    print("OK  test_error_registry_bridge_sucesso_normal_nao_gera_erro")


def test_error_registry_bridge_captura_runner_pr_guard_e_liberacao() -> None:
    record = task_runtime.TaskRuntimeRecord(
        canonical_task_id="t-falha",
        status=task_runtime.RUNTIME_FAILED,
        worker_id=PILOT_WORKER,
        branch="runner/t-falha",
        execution_task_id="t-falha--bridge-123456789abc",
    )
    dispatch = DispatchOutcome(
        result=RunnerResult(
            task_id="t-falha--bridge-123456789abc",
            status="FAILED",
            reason="validacao falhou",
            branch="runner/t-falha",
        ),
        claimed=True,
        external_calls_made=True,
    )
    outcome = worker_bridge.BridgeOutcome(
        "DISPATCHED",
        "falhou",
        runtime_record=record,
        dispatch=dispatch,
        liberacao=worker_bridge.LiberacaoResult("FAILED", "CAS do worker falhou"),
        pr=bridge_pr.PrOutcome("FAILED", "GitHub 403 ao criar PR"),
        guard=bridge_pr.GuardDispatchOutcome("FAILED", "Guard dispatch 500", pr_number=55),
    )
    events = worker_bridge.error_events_from_outcome(outcome)
    tipos = {(e.component, e.error_type) for e in events}
    assert ("runner", "runner-failed") in tipos
    assert ("worker-bridge", "github-pr-failed") in tipos
    assert ("worker-bridge", "guard-dispatch-failed") in tipos
    assert ("worker-bridge", "worker-release-failed") in tipos
    assert len(events) == 4
    print("OK  test_error_registry_bridge_captura_runner_pr_guard_e_liberacao")


def test_error_registry_bridge_nao_trata_portao_ou_fila_vazia_como_bug() -> None:
    assert worker_bridge.error_events_from_outcome(
        worker_bridge.BridgeOutcome("BLOCKED", "policy recusada")
    ) == []
    assert worker_bridge.error_events_from_outcome(
        worker_bridge.BridgeOutcome("NO_ASSIGNMENT", "fila sem tarefa")
    ) == []
    print("OK  test_error_registry_bridge_nao_trata_portao_ou_fila_vazia_como_bug")


def test_b5_piloto_nunca_inicia_por_evento() -> None:
    """B5: a entrega automática existe, mas o piloto continua sendo uma
    execução OBSERVADA. Um evento nunca o inicia — nem se a Variable do
    modo estiver em ``pilot`` quando o gatilho disparar."""
    cfg = _config(trigger=worker_bridge.BRIDGE_TRIGGER_EVENT)
    gate = cfg.gate()
    assert gate.open is False, gate.reason
    assert "nunca inicia por evento" in gate.reason
    print("OK  test_b5_piloto_nunca_inicia_por_evento")


def test_b5_evento_e_aceito_somente_em_active_supervised() -> None:
    cfg = _config(
        mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED,
        trigger=worker_bridge.BRIDGE_TRIGGER_EVENT,
    )
    assert cfg.gate().open is True, cfg.gate().reason
    assert cfg.is_event_driven is True
    print("OK  test_b5_evento_e_aceito_somente_em_active_supervised")


def test_b5_gatilho_desconhecido_fecha_o_portao() -> None:
    for valor in ("cron", "push", "EVENT", "qualquer-coisa"):
        cfg = _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED, trigger=valor)
        gate = cfg.gate()
        assert gate.open is False, (valor, gate.reason)
        assert "não é uma origem conhecida" in gate.reason
    print("OK  test_b5_gatilho_desconhecido_fecha_o_portao")


def test_b5_default_do_gatilho_e_manual_e_o_manual_continua_valendo() -> None:
    """Variável ausente nunca é lida como "veio de um evento confiável", e
    o disparo manual do piloto continua funcionando exatamente como
    antes."""
    cfg = worker_bridge.WorkerBridgeConfig.from_env({
        worker_bridge.ENV_BRIDGE_ENABLED: "true",
        worker_bridge.ENV_BRIDGE_MODE: worker_bridge.BRIDGE_MODE_PILOT,
        worker_bridge.ENV_BRIDGE_PILOT_WORKER_ID: PILOT_WORKER,
        worker_bridge.ENV_BRIDGE_PILOT_TASK_ID: "infra-worker-bridge-pilot-r2",
    })
    assert cfg.trigger == worker_bridge.BRIDGE_TRIGGER_MANUAL
    assert cfg.is_event_driven is False
    assert cfg.gate().open is True, cfg.gate().reason

    with tempfile.TemporaryDirectory() as tmp:
        api = _FakeGitHubApi()
        outcome, _c, _s, _r = _ciclo(tmp, [_tarefa()], api=api)
        assert outcome.action == "DISPATCHED", outcome
    print("OK  test_b5_default_do_gatilho_e_manual_e_o_manual_continua_valendo")


def test_modos_do_bridge_sao_os_mesmos_valores_em_todo_lugar() -> None:
    """Prova estrutural contra divergência: ``worker_bridge.BRIDGE_MODE_*``
    e ``bridge_workers.MODO_*`` são a MESMA constante, não dois textos
    iguais por coincidência."""
    assert worker_bridge.BRIDGE_MODE_PILOT is bridge_workers.MODO_PILOT
    assert worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED is bridge_workers.MODO_ACTIVE_SUPERVISED
    assert set(worker_bridge.ALLOWED_BRIDGE_MODES) == set(bridge_workers.ELEGIVEIS_POR_MODO)
    print("OK  test_modos_do_bridge_sao_os_mesmos_valores_em_todo_lugar")


def test_b4_retomada_do_guard_e_executada_por_um_ciclo_de_manutencao() -> None:
    """Achado da 2ª auditoria independente do PR #129: o estado ``FAILED``
    era recuperável, mas nada executava a recuperação — a tarefa fica
    ``NEEDS-AUDIT``, que é justamente o estado que a mantém fora da fila
    READY, então o scheduler nunca a ofereceria de novo.

    O cenário completo, na ordem que a auditoria exigiu:
    execução normal -> NEEDS-AUDIT -> PR criada -> 1º dispatch do Guard
    falha -> novo ciclo faz ZERO chamadas Anthropic e tenta SÓ o Guard ->
    2º dispatch passa -> 3º ciclo não duplica."""
    class _ApiComGuardQuebrado(_FakeGitHubApi):
        quebrado = True

        def despachar_workflow(self, *, arquivo: str, ref: str, inputs: dict) -> None:
            if self.quebrado:
                raise bridge_pr.GitHubBridgeApiError("500 simulado do GitHub")
            super().despachar_workflow(arquivo=arquivo, ref=ref, inputs=inputs)

    with tempfile.TemporaryDirectory() as tmp:
        api = _ApiComGuardQuebrado()
        remoto = _criar_remoto_local(tmp)
        caminho_tasks = _escrever_tasks_json(tmp, [_tarefa()])
        cfg = _config()
        registry = _registry_com_workers(cfg)
        store = _runtime_store()

        def rodar(nome_workdir: str, **extra):
            return worker_bridge.executar_ciclo(
                config=cfg, tasks_json_path=caminho_tasks,
                repo_dir=_clonar_workdir(tmp, remoto, nome_workdir),
                state_git_remote=remoto, worker_registry=registry, runtime_store=store,
                base_branch="bootstrap", github_api=api, validation_command_keys=(),
                **extra,
            )

        # 1. execução normal -> NEEDS-AUDIT, PR criada, Guard FALHA.
        primeiro = rodar("work-1", patch=_patch_padrao())
        assert primeiro.action == "DISPATCHED", primeiro
        assert primeiro.pr is not None and primeiro.pr.pr_number is not None
        pr_number = primeiro.pr.pr_number
        assert primeiro.guard is not None and primeiro.guard.action == "FAILED", primeiro.guard
        registro = store.get("infra-bridge-teste")
        assert registro is not None
        assert registro.status == task_runtime.RUNTIME_NEEDS_AUDIT
        assert registro.guard_dispatch_status == task_runtime.GUARD_DISPATCH_FAILED
        assert registro.guard_retomada_pendente is True
        assert len(api.criadas) == 1

        # 2. novo ciclo: ZERO chamada paga e SÓ o Guard é tentado. A
        #    sentinela falha o teste se qualquer geração acontecer.
        api.quebrado = False
        segundo = rodar("work-2", patch=None, gerar_patch=_GeracaoProibida())
        assert segundo.action == "GUARD_RETRY", segundo
        assert segundo.guard is not None and segundo.guard.action == "DISPATCHED", segundo.guard
        assert segundo.dispatch is None, "nenhum Runner pode ter sido executado na manutenção"
        assert segundo.runner_task is None
        # Nenhuma PR nova.
        assert len(api.criadas) == 1, api.criadas
        # O Guard foi despachado para a PR que JÁ existia.
        assert api.dispatches[-1][2] == {"pr_number": str(pr_number)}, api.dispatches
        registro = store.get("infra-bridge-teste")
        assert registro is not None
        assert registro.guard_confirmado is True
        assert registro.guard_dispatch_attempts == 2, registro.guard_dispatch_attempts
        # A tarefa NÃO foi reaberta nem teve branch/checkpoint mexidos.
        assert registro.status == task_runtime.RUNTIME_NEEDS_AUDIT
        assert registro.branch == "runner/infra-bridge-teste"
        assert registro.pr_number == pr_number
        assert registro.execution_task_id == primeiro.runtime_record.execution_task_id
        # Nenhuma tarefa/claim NOVA: o estado operacional continua com um
        # único registro, o da execução original.
        assert [r.canonical_task_id for r in store.list_records()] == ["infra-bridge-teste"], (
            store.list_records()
        )
        # E nenhuma branch nova foi publicada no remoto pela manutenção.
        branches = subprocess.run(
            ["git", "-C", remoto, "branch", "--format=%(refname:short)"],
            capture_output=True, text=True, check=True,
        ).stdout.split()
        assert sorted(branches) == sorted([
            "bootstrap", "coordinator-state-runner", "runner/infra-bridge-teste",
        ]), branches

        # 3. terceiro ciclo: nada a retomar, nenhum Guard duplicado.
        antes = len(api.dispatches)
        terceiro = rodar("work-3", patch=None, gerar_patch=_GeracaoProibida())
        assert terceiro.action in ("NO_ASSIGNMENT", "POOL_PAUSED", "BLOCKED"), terceiro
        assert len(api.dispatches) == antes, api.dispatches
        assert len(api.criadas) == 1, api.criadas
    print("OK  test_b4_retomada_do_guard_e_executada_por_um_ciclo_de_manutencao")


def test_b4_retomada_do_guard_respeita_o_portao_do_piloto() -> None:
    """A manutenção obedece à mesma restrição estrita de identidade que a
    execução: em modo piloto, uma tarefa que não é a piloto nunca é
    candidata — nem para retomar o Guard."""
    store = _runtime_store()
    reserva = store.reservar("outra-tarefa", worker_id=PILOT_WORKER, branch="runner/outra-tarefa")
    assert reserva.reservado and reserva.record is not None
    store.registrar_resultado(
        "outra-tarefa", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=PILOT_WORKER,
        execution_task_id=reserva.record.execution_task_id or "", reason="ok",
        checkpoint_commit="abcdef1",
    )
    store.registrar_pr("outra-tarefa", pr_number=404, esperado_status=task_runtime.RUNTIME_NEEDS_AUDIT)
    store.reservar_guard_dispatch("outra-tarefa", pr_number=404)
    store.falhar_guard_dispatch("outra-tarefa", pr_number=404)

    registros = store.por_id()
    assert registros["outra-tarefa"].guard_retomada_pendente is True

    # Em modo piloto (tarefa piloto = infra-bridge-teste): não é candidata.
    assert worker_bridge.candidato_a_retomada_do_guard(registros, _config()) is None
    # Em active-supervised: é candidata, porque ali a fila confiável decide.
    escolhida = worker_bridge.candidato_a_retomada_do_guard(
        registros, _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
    )
    assert escolhida is not None and escolhida.canonical_task_id == "outra-tarefa"
    print("OK  test_b4_retomada_do_guard_respeita_o_portao_do_piloto")


def test_b4_retomada_nao_pega_tarefa_sem_pr_nem_guard_ja_confirmado() -> None:
    """O predicado é estreito de propósito: sem PR registrada não há o que
    despachar, e um Guard já confirmado nunca volta a ser candidato."""
    store = _runtime_store()

    # (a) NEEDS-AUDIT sem PR -> não é candidata.
    r1 = store.reservar("sem-pr", worker_id=PILOT_WORKER, branch="runner/sem-pr")
    store.registrar_resultado(
        "sem-pr", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=PILOT_WORKER,
        execution_task_id=(r1.record.execution_task_id if r1.record else "") or "", reason="ok",
        checkpoint_commit="abcdef1",
    )
    # (b) IN-PROGRESS com PR -> não é candidata (ainda executando).
    store.reservar("em-progresso", worker_id=PILOT_WORKER, branch="runner/em-progresso")
    store.registrar_pr("em-progresso", pr_number=11, esperado_status=task_runtime.RUNTIME_IN_PROGRESS)
    # (c) NEEDS-AUDIT com PR e Guard CONFIRMADO -> não é candidata.
    r3 = store.reservar("confirmada", worker_id=PILOT_WORKER, branch="runner/confirmada")
    store.registrar_resultado(
        "confirmada", status=task_runtime.RUNTIME_NEEDS_AUDIT, worker_id=PILOT_WORKER,
        execution_task_id=(r3.record.execution_task_id if r3.record else "") or "", reason="ok",
        checkpoint_commit="abcdef1",
    )
    store.registrar_pr("confirmada", pr_number=22, esperado_status=task_runtime.RUNTIME_NEEDS_AUDIT)
    store.reservar_guard_dispatch("confirmada", pr_number=22)
    store.confirmar_guard_dispatch("confirmada", pr_number=22)

    registros = store.por_id()
    for task_id in ("sem-pr", "em-progresso", "confirmada"):
        assert registros[task_id].guard_retomada_pendente is False, task_id
    assert worker_bridge.candidato_a_retomada_do_guard(
        registros, _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
    ) is None
    print("OK  test_b4_retomada_nao_pega_tarefa_sem_pr_nem_guard_ja_confirmado")


def main() -> int:
    testes = [
        test_bridge_desligado_nao_faz_nada,
        test_modo_invalido_fecha_o_portao,
        test_piloto_sem_as_duas_variaveis_fecha_o_portao,
        test_ref_diferente_da_branch_padrao_fecha_o_portao,
        test_piloto_recusa_worker_diferente,
        test_pilot_filtra_workers_stale_available_antes_do_scheduler,
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
        test_tarefa_de_conteudo_pode_ser_atribuida_a_worker_programatico,
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
        test_merge_confirmado_vira_done_e_libera_dependencia_no_mesmo_ciclo,
        test_pr_fechada_sem_merge_ou_branch_divergente_nao_promove_done,
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
        test_tarefa_piloto_historica_preserva_contrato_e_metadados,
        test_infra_do_bridge_nao_e_automatizavel_por_ela_mesma,
        test_piloto_r2_fechado_preserva_evidencia_do_resultado,
        test_nenhum_laco_de_fila_no_bridge,
        # Auditoria independente do PR #129 — B1..B5.
        test_b1_piloto_real_fechado_nao_reabre_a_fila,
        test_b1_piloto_e_escolhido_mesmo_com_outra_tarefa_na_frente_da_fila,
        test_b1_restricao_do_piloto_nunca_amplia_nem_escreve,
        test_b3_pilot_continua_somente_o_worker_4,
        test_b3_modo_desconhecido_nao_elege_ninguem,
        test_b3_active_supervised_habilita_os_quatro_por_caminho_explicito,
        test_b3_habilitacao_nunca_toca_worker_em_execucao_nem_sessao_humana,
        test_b3_active_supervised_pode_atribuir_a_qualquer_um_dos_quatro,
        test_b4_falha_no_primeiro_dispatch_do_guard_e_recuperavel,
        test_b4_pendente_orfao_pode_ser_retomado_mas_confirmado_nunca,
        test_b4_registro_antigo_sem_status_e_lido_como_despachado,
        test_b4_retomada_do_guard_e_executada_por_um_ciclo_de_manutencao,
        test_b4_retomada_do_guard_respeita_o_portao_do_piloto,
        test_b4_retomada_nao_pega_tarefa_sem_pr_nem_guard_ja_confirmado,
        test_b4_ciclo_real_registra_a_falha_do_guard_e_permite_retomada,
        # Issue #135 — recuperação de PR pendente, zero Claude/Runner.
        test_pr_recovery_detecta_needs_audit_sem_pr_e_respeita_piloto,
        test_pr_recovery_abre_pr_e_guard_sem_runner_nem_anthropic_e_nao_duplica,
        test_pr_recovery_falha_de_criacao_permanece_recuperavel_no_ciclo_seguinte,
        # Feedback automático NEEDS-FIX -> correção -> nova auditoria.
        test_audit_fix_so_aceita_cartao_do_bot_confiavel,
        test_audit_fix_merge_ready_nao_reentra_em_correcao,
        test_audit_fix_gera_execution_id_nova_e_mesmo_parecer_nao_roda_duas_vezes,
        test_audit_fix_para_depois_de_duas_correcoes,
        test_audit_fix_integracao_corrige_mesma_pr_e_redespacha_guard,
        # Issue #130 — Error Registry do Worker Bridge/Runner.
        test_error_registry_bridge_sucesso_normal_nao_gera_erro,
        test_error_registry_bridge_captura_runner_pr_guard_e_liberacao,
        test_error_registry_bridge_nao_trata_portao_ou_fila_vazia_como_bug,
        test_b5_piloto_nunca_inicia_por_evento,
        test_b5_evento_e_aceito_somente_em_active_supervised,
        test_b5_gatilho_desconhecido_fecha_o_portao,
        test_b5_default_do_gatilho_e_manual_e_o_manual_continua_valendo,
        test_modos_do_bridge_sao_os_mesmos_valores_em_todo_lugar,
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
