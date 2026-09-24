"""Issue #258 — sessão humana/manual não pode consumir slot api_runner.

## Reprodução (bug real, observado após o merge da #245)

O Worker Bridge (``coordinator/bridge_workers.py``) só enxerga os quatro
``WorkerRecord`` com ``type="api_runner"`` cujo ``worker_id`` está em
``BRIDGE_WORKER_IDS`` (``claude-worker-1..4`` — ver
``bridge_workers.workers_programaticos``). Essa separação já existia e
está correta. O bug real é que um checkpoint BLOCKED-LIMIT (Issue #88,
``AGENTE: <texto livre>`` — ``coordinator.github_event.
RE_AGENTE_CHECKPOINT`` não valida contra nenhuma lista de nomes) que
nomeia por engano um desses quatro ids faz
``coordinator.observe._tratar_checkpoint_blocked_limit`` chamar
``OperationalWorkerRegistry.set_status``/``set_task_progress`` — que
resolvem por nome/id SEM checar ``type`` — e sobrescrevem o worker
programático real com ``status=LIMIT``/``current_task=<texto do
checkpoint>``. Quatro checkpoints assim (um por sessão humana Claude 1-4,
citando por engano ``claude-worker-1..4`` em vez de ``Claude 1..4``)
esgotam sozinhos os quatro únicos slots que o Worker Bridge tem para
despachar tarefas automaticamente — reproduzindo o NO_ASSIGNMENT relatado
no run 36048348531 mesmo com trabalho humano genuíno em andamento, nunca
trabalho do Bridge.

## Correção

``_tratar_checkpoint_blocked_limit`` agora recusa (fail-closed, zero
escrita) qualquer checkpoint cujo ``AGENTE`` resolva para um dos quatro
ids do Worker Bridge (``bridge_workers.e_worker_do_bridge``), publicando
um aviso explícito em vez de escrever silenciosamente. Sessão
humana/manual (``human_session``) e worker programático (``api_runner``
dos quatro ids fixos) continuam sendo o MESMO tipo de registro
(``WorkerRecord``) — a separação é por ``type``/``worker_id``, decidida
na escrita, nunca inventando disponibilidade nem ignorando BUSY/LIMIT/
NEAR_LIMIT/OFFLINE/heartbeat real.
"""

from __future__ import annotations

import os
import tempfile

from . import _pathsetup
from coordinator import bridge_workers, scheduler
from coordinator.budget import UsageLedger
from coordinator.config import ACTIVE_SUPERVISED_MODE, Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.github_event import build_event_from_github_context
from coordinator.observe import observe
from coordinator.scheduler import TaskRecord
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord

REPO = "Repassomed/Repasso-Med-Site-"


def _cfg() -> Config:
    return Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE)


def _evento_checkpoint(*, agente: str, tarefa: str = "ortopedia-x", issue: int = 101,
                        commit: str = "abc123def", comment_id: int = 1):
    corpo = (
        f"MATÉRIA/ÁREA: Ortopedia\nTAREFA: {tarefa}\nESTADO: BLOCKED-LIMIT\n"
        f"AGENTE: {agente}\nBRANCH: edit/x\nCOMMIT: {commit}\n"
    )
    payload = {
        "action": "created",
        "issue": {"number": issue},
        "comment": {"id": comment_id, "body": corpo, "user": {"login": "Repassomed"}},
    }
    return build_event_from_github_context("issue_comment", payload, REPO)


def _registro_bridge_worker(worker_id: str, *, status: str = "AVAILABLE",
                             current_task: str | None = None) -> WorkerRecord:
    return WorkerRecord(
        worker_id=worker_id, display_name=bridge_workers.BRIDGE_DISPLAY_NAMES[worker_id],
        type="api_runner", status=status, capabilities=bridge_workers.BRIDGE_CAPABILITIES,
        current_task=current_task, can_execute=(status not in ("OFFLINE",)), can_audit=False,
    )


def _registro_humano(n: int, *, status: str = "OFFLINE", current_task: str | None = None) -> WorkerRecord:
    return WorkerRecord(
        worker_id=f"claude-{n}", display_name=f"Claude {n}", type="human_session",
        status=status, capabilities=("conteudo", "codigo"), current_task=current_task,
    )


def _tarefa_real(task_id: str = "cleanup-como-estudar-guarani", area: str = "materia") -> TaskRecord:
    return TaskRecord(id=task_id, estado="READY", area=area, agente=None)


# ---------------------------------------------------------------------------
# 1) REPRODUÇÃO — o sintoma relatado (NO_ASSIGNMENT) é real e determinístico
#    quando os quatro ids do Bridge estão ocupados, mesmo que só por engano.
# ---------------------------------------------------------------------------

def test_reproducao_quatro_slots_do_bridge_ocupados_produz_no_assignment() -> None:
    """Estado real observado: claude-worker-1..4 (api_runner) todos BUSY
    com um texto de rastreamento manual (não um canonical_task_id de
    verdade) — o Bridge não tem NENHUM candidato, mesmo havendo uma tarefa
    READY compatível esperando."""
    workers_todos = [
        _registro_bridge_worker(wid, status="BUSY", current_task=f"manual-infra-pr{240 + i}")
        for i, wid in enumerate(bridge_workers.BRIDGE_WORKER_IDS)
    ]
    workers_do_bridge = bridge_workers.workers_programaticos(workers_todos)
    assert len(workers_do_bridge) == 4

    decisao = scheduler.escolher_proxima_atribuicao([_tarefa_real()], workers_do_bridge)
    assert decisao.action != "OFFER", "reproduz o NO_ASSIGNMENT do run 36048348531"
    print("OK  test_reproducao_quatro_slots_do_bridge_ocupados_produz_no_assignment")


# ---------------------------------------------------------------------------
# 2) CORREÇÃO — checkpoint manual citando um id do Bridge não escreve nada.
# ---------------------------------------------------------------------------

def test_checkpoint_manual_com_agente_worker_bridge_nao_escreve_no_registro() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        antes = _registro_bridge_worker("claude-worker-1")
        registry.upsert(antes, message="teste: estado inicial do worker do Bridge")

        ev = _evento_checkpoint(agente="claude-worker-1", tarefa="manual-infra-pr246-post245")
        r = observe(ev, config=_cfg(), dedup=dedup, ledger=ledger, workers=[], audit_mode=True,
                    worker_registry=registry)

        depois = registry.find_by_name_or_id("claude-worker-1")
        assert depois is not None
        assert depois.status == "AVAILABLE", "checkpoint manual não pode mudar o status do worker do Bridge"
        assert depois.current_task is None, "checkpoint manual não pode reservar current_task do worker do Bridge"
        assert depois.branch == antes.branch and depois.commit == antes.commit, (
            "recusa precisa ser atômica — nenhum campo do registro pode mudar, nem parcialmente"
        )
        assert "reservado ao Worker Bridge" in r.merge_card
        assert "claude-worker-1" in r.merge_card
    print("OK  test_checkpoint_manual_com_agente_worker_bridge_nao_escreve_no_registro")


def test_checkpoint_manual_legitimo_continua_funcionando() -> None:
    """Nenhuma regressão: um checkpoint que de fato nomeia uma sessão
    humana (``Claude 1``) continua escrevendo normalmente."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        registry.upsert(_registro_humano(1, status="AVAILABLE"), message="teste: Claude 1 disponível")
        registry.upsert(_registro_humano(2, status="AVAILABLE"), message="teste: Claude 2 disponível")

        ev = _evento_checkpoint(agente="Claude 1", tarefa="ortopedia-x")
        observe(ev, config=_cfg(), dedup=dedup, ledger=ledger, workers=[], audit_mode=True,
                worker_registry=registry)

        depois = registry.find_by_name_or_id("Claude 1")
        assert depois is not None
        assert depois.status == "LIMIT"
        assert depois.current_task == "ortopedia-x"
    print("OK  test_checkpoint_manual_legitimo_continua_funcionando")


def test_checkpoint_manual_worker_bridge_case_insensitive_e_por_nome_tambem_recusado() -> None:
    """``e_worker_do_bridge`` aceita id OU display_name exato — o
    checkpoint pode citar 'Claude Worker 3' (o display_name) e ainda
    assim precisa ser recusado."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        registry = OperationalWorkerRegistry(InMemoryWorkerStateStore())
        registry.upsert(_registro_bridge_worker("claude-worker-3"), message="teste")

        ev = _evento_checkpoint(agente="Claude Worker 3", tarefa="manual-x")
        observe(ev, config=_cfg(), dedup=dedup, ledger=ledger, workers=[], audit_mode=True,
                worker_registry=registry)

        depois = registry.find_by_name_or_id("claude-worker-3")
        assert depois.status == "AVAILABLE" and depois.current_task is None
    print("OK  test_checkpoint_manual_worker_bridge_case_insensitive_e_por_nome_tambem_recusado")


# ---------------------------------------------------------------------------
# 3) Testes explicitamente pedidos pela Issue #258.
# ---------------------------------------------------------------------------

def test_sessao_humana_busy_api_worker_available_bridge_pode_usar() -> None:
    humano_ocupado = _registro_humano(1, status="BUSY", current_task="algo-manual")
    bridge_disponivel = [_registro_bridge_worker(wid) for wid in bridge_workers.BRIDGE_WORKER_IDS]

    todos = [humano_ocupado, *bridge_disponivel]
    candidatos = bridge_workers.workers_programaticos(todos)
    assert len(candidatos) == 4, "sessão humana BUSY não pode aparecer no pool do Bridge"

    decisao = scheduler.escolher_proxima_atribuicao([_tarefa_real()], candidatos)
    assert decisao.action == "OFFER"
    assert decisao.worker_id in bridge_workers.BRIDGE_WORKER_IDS
    print("OK  test_sessao_humana_busy_api_worker_available_bridge_pode_usar")


def test_mesma_tarefa_reservada_por_humano_nao_e_oferecida_de_novo() -> None:
    """Colisão automática continua impedida: uma tarefa que o declarativo
    já marca IN-PROGRESS (porque um humano a assumiu) nunca é oferecida
    de novo ao Bridge, mesmo com workers programáticos livres."""
    tarefa_com_humano = TaskRecord(
        id="cleanup-como-estudar-guarani", estado="IN-PROGRESS", area="materia", agente="Claude 1",
    )
    bridge_disponivel = [_registro_bridge_worker(wid) for wid in bridge_workers.BRIDGE_WORKER_IDS]

    fila_pronta = scheduler.proxima_tarefa_pronta([tarefa_com_humano])
    assert fila_pronta == [], "Lei 3: tarefa IN-PROGRESS nunca volta para a fila READY"

    decisao = scheduler.escolher_proxima_atribuicao([tarefa_com_humano], bridge_disponivel)
    assert decisao.action != "OFFER", "escolher_proxima_atribuicao só oferece tarefa READY"
    print("OK  test_mesma_tarefa_reservada_por_humano_nao_e_oferecida_de_novo")


def test_api_worker_busy_nao_e_reutilizado() -> None:
    ocupado = _registro_bridge_worker("claude-worker-1", status="BUSY", current_task="outra-tarefa")
    livre = _registro_bridge_worker("claude-worker-2")
    decisao = scheduler.escolher_proxima_atribuicao([_tarefa_real()], [ocupado, livre])
    assert decisao.action == "OFFER"
    assert decisao.worker_id == "claude-worker-2"
    print("OK  test_api_worker_busy_nao_e_reutilizado")


def test_worker_limit_e_offline_nao_sao_selecionados() -> None:
    em_limite = _registro_bridge_worker("claude-worker-1", status="LIMIT")
    offline = _registro_bridge_worker("claude-worker-2", status="OFFLINE")
    assert offline.can_execute is False, "OFFLINE precisa nascer can_execute=False no fixture do teste"
    decisao = scheduler.escolher_proxima_atribuicao([_tarefa_real()], [em_limite, offline])
    assert decisao.action != "OFFER"
    print("OK  test_worker_limit_e_offline_nao_sao_selecionados")


def test_quatro_humanos_ocupados_worker_bridge_continua_disponivel() -> None:
    """O caso central da Issue #258: quatro sessões humanas BUSY (uso
    LEGÍTIMO — reservadas nos ids ``claude-1..4``, human_session) não
    significam zero capacidade programática, porque o Bridge nunca olha
    para esses registros."""
    humanos_ocupados = [
        _registro_humano(n, status="BUSY", current_task=f"trabalho-manual-{n}") for n in range(1, 5)
    ]
    bridge_disponivel = [_registro_bridge_worker(wid) for wid in bridge_workers.BRIDGE_WORKER_IDS]

    todos = [*humanos_ocupados, *bridge_disponivel]
    candidatos = bridge_workers.workers_programaticos(todos)
    assert len(candidatos) == 4

    decisao = scheduler.escolher_proxima_atribuicao([_tarefa_real()], candidatos)
    assert decisao.action == "OFFER", "4 humanos ocupados não podem zerar a capacidade do Bridge"
    print("OK  test_quatro_humanos_ocupados_worker_bridge_continua_disponivel")


def main() -> int:
    testes = [
        test_reproducao_quatro_slots_do_bridge_ocupados_produz_no_assignment,
        test_checkpoint_manual_com_agente_worker_bridge_nao_escreve_no_registro,
        test_checkpoint_manual_legitimo_continua_funcionando,
        test_checkpoint_manual_worker_bridge_case_insensitive_e_por_nome_tambem_recusado,
        test_sessao_humana_busy_api_worker_available_bridge_pode_usar,
        test_mesma_tarefa_reservada_por_humano_nao_e_oferecida_de_novo,
        test_api_worker_busy_nao_e_reutilizado,
        test_worker_limit_e_offline_nao_sao_selecionados,
        test_quatro_humanos_ocupados_worker_bridge_continua_disponivel,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as exc:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {exc}")
    print(f"\n{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
