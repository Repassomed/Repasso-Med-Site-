"""Heartbeat estruturado dos workers — Issue #105, Fase B.

Cobre os 11 cenários pedidos pela rodada #105-B: heartbeat
AVAILABLE/BUSY/NEAR_LIMIT/LIMIT, retorno LIMIT->AVAILABLE, heartbeat
stale, worker inexistente, progresso inválido, commit/checkpoint
ausente, payload repetido/idempotente, e a prova de que
``avaliar_stale`` nunca muda status por inferência (é uma função pura,
nem recebe o registro/store).
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone

from . import _pathsetup  # noqa: F401
from coordinator.heartbeat import (
    DEFAULT_STALE_THRESHOLD,
    HeartbeatParseResult,
    LimiteSinal,
    RunnerHeartbeat,
    aplicar_heartbeat,
    avaliar_stale,
    heartbeat_de_payload,
    parse_heartbeat_comment,
    sinal_de_limite,
)
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord


def _registry_com(*records: WorkerRecord) -> OperationalWorkerRegistry:
    store = InMemoryWorkerStateStore({"workers": [r.to_dict() for r in records]})
    return OperationalWorkerRegistry(store)


def _claude(worker_id: str = "claude-3", *, status: str = "OFFLINE", current_task=None,
            branch=None, commit=None, progress=None, last_heartbeat=None) -> WorkerRecord:
    n = worker_id.split("-")[-1]
    return WorkerRecord(
        worker_id=worker_id, display_name=f"Claude {n}", type="human_session", status=status,
        capabilities=("conteudo", "codigo"), current_task=current_task, branch=branch,
        commit=commit, progress=progress, last_heartbeat=last_heartbeat,
        can_execute=True, can_audit=False,
    )


def _iso(dt: datetime) -> str:
    return dt.isoformat()


# ---------------------------------------------------------------------
# RunnerHeartbeat — contrato e validação fail-closed
# ---------------------------------------------------------------------

def test_runner_heartbeat_aceita_todos_os_campos_do_contrato() -> None:
    hb = RunnerHeartbeat(
        worker_id="claude-3", status="NEAR_LIMIT", task_id="t1", progress_percent=42,
        branch="infra/x", commit="abc1234", remaining_work_estimate="bloco 3 de 5",
        last_checkpoint="abc1234", notes="parando por precaução",
        timestamp="2026-09-22T02:00:00+00:00",
    )
    assert hb.worker_id == "claude-3"
    assert hb.status == "NEAR_LIMIT"
    assert hb.progress_percent == 42
    print("OK  test_runner_heartbeat_aceita_todos_os_campos_do_contrato")


def test_runner_heartbeat_rejeita_status_invalido() -> None:
    try:
        RunnerHeartbeat(worker_id="claude-3", status="ALMOST_DONE")
    except ValueError:
        print("OK  test_runner_heartbeat_rejeita_status_invalido")
        return
    raise AssertionError("deveria rejeitar status fora de VALID_STATUSES")


def test_runner_heartbeat_rejeita_worker_id_vazio() -> None:
    try:
        RunnerHeartbeat(worker_id="   ", status="AVAILABLE")
    except ValueError:
        print("OK  test_runner_heartbeat_rejeita_worker_id_vazio")
        return
    raise AssertionError("deveria rejeitar worker_id vazio")


def test_progress_percent_invalido_levanta_valueerror() -> None:
    for valor in (-1, 101, 1000):
        try:
            RunnerHeartbeat(worker_id="claude-3", status="BUSY", progress_percent=valor)
        except ValueError:
            continue
        raise AssertionError(f"deveria rejeitar progress_percent={valor}")
    print("OK  test_progress_percent_invalido_levanta_valueerror")


def test_progress_percent_zero_e_cem_sao_validos() -> None:
    RunnerHeartbeat(worker_id="claude-3", status="BUSY", progress_percent=0)
    RunnerHeartbeat(worker_id="claude-3", status="BUSY", progress_percent=100)
    print("OK  test_progress_percent_zero_e_cem_sao_validos")


def test_timestamp_invalido_levanta_valueerror() -> None:
    try:
        RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE", timestamp="não é uma data")
    except ValueError:
        print("OK  test_timestamp_invalido_levanta_valueerror")
        return
    raise AssertionError("deveria rejeitar timestamp mal formado")


def test_heartbeat_de_payload_fail_closed_sem_campo_obrigatorio() -> None:
    try:
        heartbeat_de_payload({"status": "AVAILABLE"})  # falta worker_id
    except ValueError:
        pass
    else:
        raise AssertionError("deveria rejeitar payload sem worker_id")
    try:
        heartbeat_de_payload({"worker_id": "claude-3"})  # falta status
    except ValueError:
        print("OK  test_heartbeat_de_payload_fail_closed_sem_campo_obrigatorio")
        return
    raise AssertionError("deveria rejeitar payload sem status")


def test_heartbeat_de_payload_valido() -> None:
    hb = heartbeat_de_payload({
        "worker_id": "claude-3", "status": "BUSY", "task_id": "t1", "progress_percent": 10,
    })
    assert hb.worker_id == "claude-3"
    assert hb.status == "BUSY"
    assert hb.task_id == "t1"
    print("OK  test_heartbeat_de_payload_valido")


# ---------------------------------------------------------------------
# Comentário estruturado
# ---------------------------------------------------------------------

def test_parse_heartbeat_comment_bloco_valido() -> None:
    texto = """
    Algum texto antes.

    HEARTBEAT
    WORKER: Claude 3
    STATUS: NEAR_LIMIT
    TASK: infra-heartbeat-issue105b
    PROGRESS: 42%
    BRANCH: infra/heartbeat-issue105b
    COMMIT: abc1234
    CHECKPOINT: abc1234
    REMAINING: bloco 3 de 5
    NOTES: parando por precaução
    """
    resultado = parse_heartbeat_comment(texto)
    assert resultado is not None
    assert resultado.ok is True
    assert resultado.heartbeat.worker_id == "Claude 3"
    assert resultado.heartbeat.status == "NEAR_LIMIT"
    assert resultado.heartbeat.progress_percent == 42
    assert resultado.heartbeat.commit == "abc1234"
    print("OK  test_parse_heartbeat_comment_bloco_valido")


def test_parse_heartbeat_comment_sem_marcador_devolve_none() -> None:
    assert parse_heartbeat_comment("Claude 2 entrou em limite.") is None
    print("OK  test_parse_heartbeat_comment_sem_marcador_devolve_none")


def test_parse_heartbeat_comment_sem_worker_ou_status_e_invalido() -> None:
    texto = "HEARTBEAT\nTASK: t1\n"
    resultado = parse_heartbeat_comment(texto)
    assert resultado is not None
    assert resultado.ok is False
    assert "WORKER" in resultado.error and "STATUS" in resultado.error
    print("OK  test_parse_heartbeat_comment_sem_worker_ou_status_e_invalido")


def test_parse_heartbeat_comment_progress_nao_numerico_e_invalido() -> None:
    texto = "HEARTBEAT\nWORKER: Claude 3\nSTATUS: BUSY\nPROGRESS: quase lá\n"
    resultado = parse_heartbeat_comment(texto)
    assert resultado.ok is False
    assert "PROGRESS" in resultado.error
    print("OK  test_parse_heartbeat_comment_progress_nao_numerico_e_invalido")


def test_parse_heartbeat_comment_status_invalido_e_invalido() -> None:
    texto = "HEARTBEAT\nWORKER: Claude 3\nSTATUS: QUASE_LIMITE\n"
    resultado = parse_heartbeat_comment(texto)
    assert resultado.ok is False
    print("OK  test_parse_heartbeat_comment_status_invalido_e_invalido")


# ---------------------------------------------------------------------
# aplicar_heartbeat — os status pedidos (AVAILABLE/BUSY/NEAR_LIMIT/LIMIT)
# ---------------------------------------------------------------------

def test_heartbeat_available_atualiza_registro() -> None:
    registry = _registry_com(_claude(status="OFFLINE"))
    resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE"))
    assert resultado.action == "APPLIED"
    assert resultado.record.status == "AVAILABLE"
    assert resultado.record.current_task is None
    # confirma persistência real no registro, não só no resultado devolvido.
    assert registry.find_by_name_or_id("claude-3").status == "AVAILABLE"
    print("OK  test_heartbeat_available_atualiza_registro")


def test_heartbeat_busy_atualiza_tarefa_branch_commit_progresso() -> None:
    registry = _registry_com(_claude(status="AVAILABLE"))
    hb = RunnerHeartbeat(
        worker_id="claude-3", status="BUSY", task_id="infra-x", branch="infra/x",
        commit="abc1234", progress_percent=30,
    )
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.action == "APPLIED"
    r = resultado.record
    assert r.status == "BUSY"
    assert r.current_task == "infra-x"
    assert r.branch == "infra/x"
    assert r.commit == "abc1234"
    assert r.progress == "30%"
    assert r.last_heartbeat is not None
    print("OK  test_heartbeat_busy_atualiza_tarefa_branch_commit_progresso")


def test_heartbeat_near_limit_produz_sinal_de_limite_utilizavel_pelo_scheduler() -> None:
    registry = _registry_com(_claude(status="BUSY", current_task="t1"))
    hb = RunnerHeartbeat(
        worker_id="claude-3", status="NEAR_LIMIT", task_id="t1",
        progress_percent=72, remaining_work_estimate="bloco 8 de 10",
    )
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.action == "APPLIED"
    assert resultado.record.status == "NEAR_LIMIT"
    assert isinstance(resultado.sinal_limite, LimiteSinal)
    assert resultado.sinal_limite.worker_status == "NEAR_LIMIT"
    assert resultado.sinal_limite.progress_percent == 72
    print("OK  test_heartbeat_near_limit_produz_sinal_de_limite_utilizavel_pelo_scheduler")


def test_heartbeat_limit_produz_sinal_de_limite() -> None:
    registry = _registry_com(_claude(status="NEAR_LIMIT", current_task="t1"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="LIMIT", task_id="t1", commit="abc1234")
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.action == "APPLIED"
    assert resultado.record.status == "LIMIT"
    assert resultado.sinal_limite is not None
    assert resultado.sinal_limite.worker_status == "LIMIT"
    print("OK  test_heartbeat_limit_produz_sinal_de_limite")


def test_heartbeat_available_ou_busy_nunca_produz_sinal_de_limite() -> None:
    registry = _registry_com(_claude())
    for status in ("AVAILABLE", "BUSY", "OFFLINE"):
        resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-3", status=status))
        assert resultado.sinal_limite is None, f"{status} nunca deveria produzir sinal_limite"
    print("OK  test_heartbeat_available_ou_busy_nunca_produz_sinal_de_limite")


# ---------------------------------------------------------------------
# Retorno LIMIT -> AVAILABLE
# ---------------------------------------------------------------------

def test_retorno_limit_para_available_sinaliza_ficou_disponivel_agora() -> None:
    registry = _registry_com(_claude(status="LIMIT", current_task="t1"))
    resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE"))
    assert resultado.action == "APPLIED"
    assert resultado.ficou_disponivel_agora is True
    print("OK  test_retorno_limit_para_available_sinaliza_ficou_disponivel_agora")


def test_heartbeat_available_repetido_nao_sinaliza_ficou_disponivel_de_novo() -> None:
    registry = _registry_com(_claude(status="AVAILABLE"))
    resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE"))
    assert resultado.ficou_disponivel_agora is False, "já estava AVAILABLE — não é uma transição nova"
    print("OK  test_heartbeat_available_repetido_nao_sinaliza_ficou_disponivel_de_novo")


def test_transicao_para_status_diferente_de_available_nunca_sinaliza() -> None:
    registry = _registry_com(_claude(status="LIMIT"))
    resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-3", status="NEAR_LIMIT"))
    assert resultado.ficou_disponivel_agora is False
    print("OK  test_transicao_para_status_diferente_de_available_nunca_sinaliza")


# ---------------------------------------------------------------------
# Worker inexistente
# ---------------------------------------------------------------------

def test_heartbeat_worker_inexistente_e_rejeitado_explicitamente() -> None:
    registry = _registry_com(_claude("claude-1"))
    resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-9", status="AVAILABLE"))
    assert resultado.action == "REJECTED"
    assert resultado.record is None
    assert "desconhecido" in resultado.reason
    # nunca autocadastra — registro continua só com claude-1.
    assert registry.find_by_name_or_id("claude-9") is None
    print("OK  test_heartbeat_worker_inexistente_e_rejeitado_explicitamente")


# ---------------------------------------------------------------------
# Commit/checkpoint ausente
# ---------------------------------------------------------------------

def test_limit_sem_commit_nem_checkpoint_gera_aviso_mas_aplica() -> None:
    registry = _registry_com(_claude(status="BUSY", current_task="t1"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="LIMIT", task_id="t1")  # sem commit/checkpoint
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.action == "APPLIED", "aviso não bloqueia a aplicação — só sinaliza"
    assert len(resultado.avisos) == 1
    assert "commit" in resultado.avisos[0].lower()
    print("OK  test_limit_sem_commit_nem_checkpoint_gera_aviso_mas_aplica")


def test_limit_com_checkpoint_mas_sem_commit_nao_gera_aviso() -> None:
    registry = _registry_com(_claude(status="BUSY", current_task="t1"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="LIMIT", task_id="t1", last_checkpoint="abc1234")
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.avisos == ()
    assert resultado.record.commit == "abc1234", "last_checkpoint vira o commit efetivo quando commit está ausente"
    print("OK  test_limit_com_checkpoint_mas_sem_commit_nao_gera_aviso")


def test_commit_ausente_preserva_ultimo_commit_conhecido() -> None:
    """Um heartbeat leve (sem novidade de commit) nunca apaga o último
    commit conhecido do registro."""
    registry = _registry_com(_claude(status="BUSY", current_task="t1", commit="velho123"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", progress_percent=50)
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.record.commit == "velho123"
    print("OK  test_commit_ausente_preserva_ultimo_commit_conhecido")


def test_limit_sem_commit_mas_com_commit_antigo_no_registro_nao_gera_aviso() -> None:
    """O aviso é sobre o commit EFETIVO (pós-fallback) nunca ter existido
    — se o registro já conhece um commit de uma rodada anterior, isso
    ainda é um checkpoint válido para retomar."""
    registry = _registry_com(_claude(status="NEAR_LIMIT", current_task="t1", commit="anterior123"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="LIMIT", task_id="t1")
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.avisos == ()
    assert resultado.record.commit == "anterior123"
    print("OK  test_limit_sem_commit_mas_com_commit_antigo_no_registro_nao_gera_aviso")


# ---------------------------------------------------------------------
# Idempotência
# ---------------------------------------------------------------------

def test_heartbeat_repetido_com_mesmo_timestamp_e_idempotente() -> None:
    registry = _registry_com(_claude(status="AVAILABLE"))
    hb = RunnerHeartbeat(
        worker_id="claude-3", status="BUSY", task_id="t1", branch="infra/x", commit="abc1234",
        progress_percent=50, timestamp="2026-09-22T02:00:00+00:00",
    )
    r1 = aplicar_heartbeat(registry, hb)
    r2 = aplicar_heartbeat(registry, hb)
    assert r1.record.to_dict() == r2.record.to_dict()
    assert r1.action == r2.action == "APPLIED"
    # a transição para "ficou disponível" só faz sentido na primeira vez
    # que sai de AVAILABLE — reaplicar o mesmo heartbeat BUSY não é uma
    # transição para AVAILABLE em nenhuma das duas chamadas.
    assert r1.ficou_disponivel_agora is False
    assert r2.ficou_disponivel_agora is False
    print("OK  test_heartbeat_repetido_com_mesmo_timestamp_e_idempotente")


def test_dois_heartbeats_available_idempotentes_nao_reabrem_transicao() -> None:
    registry = _registry_com(_claude(status="LIMIT"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE", timestamp="2026-09-22T02:00:00+00:00")
    r1 = aplicar_heartbeat(registry, hb)
    r2 = aplicar_heartbeat(registry, hb)
    assert r1.ficou_disponivel_agora is True, "primeira vez: LIMIT -> AVAILABLE é uma transição real"
    assert r2.ficou_disponivel_agora is False, "segunda vez: já estava AVAILABLE, não é mais transição"
    print("OK  test_dois_heartbeats_available_idempotentes_nao_reabrem_transicao")


# ---------------------------------------------------------------------
# Stale detection — pura, nunca muda status
# ---------------------------------------------------------------------

def test_avaliar_stale_heartbeat_recente_nao_e_stale() -> None:
    agora = datetime(2026, 9, 22, 12, 0, 0, tzinfo=timezone.utc)
    worker = _claude(last_heartbeat=_iso(agora - timedelta(minutes=5)))
    resultado = avaliar_stale(worker, agora=agora)
    assert resultado.stale is False
    print("OK  test_avaliar_stale_heartbeat_recente_nao_e_stale")


def test_avaliar_stale_heartbeat_velho_e_stale() -> None:
    agora = datetime(2026, 9, 22, 12, 0, 0, tzinfo=timezone.utc)
    worker = _claude(status="BUSY", last_heartbeat=_iso(agora - timedelta(hours=2)))
    resultado = avaliar_stale(worker, agora=agora, limite=DEFAULT_STALE_THRESHOLD)
    assert resultado.stale is True
    assert "sem heartbeat" in resultado.reason
    print("OK  test_avaliar_stale_heartbeat_velho_e_stale")


def test_avaliar_stale_worker_sem_heartbeat_nenhum_e_stale() -> None:
    worker = _claude(last_heartbeat=None)
    resultado = avaliar_stale(worker)
    assert resultado.stale is True
    assert "nunca reportou" in resultado.reason
    print("OK  test_avaliar_stale_worker_sem_heartbeat_nenhum_e_stale")


def test_avaliar_stale_timestamp_malformado_e_stale_por_seguranca() -> None:
    worker = _claude(last_heartbeat="isto-nao-e-uma-data")
    resultado = avaliar_stale(worker)
    assert resultado.stale is True
    print("OK  test_avaliar_stale_timestamp_malformado_e_stale_por_seguranca")


def test_avaliar_stale_no_limite_exato_nao_e_stale() -> None:
    agora = datetime(2026, 9, 22, 12, 0, 0, tzinfo=timezone.utc)
    limite = timedelta(minutes=10)
    worker = _claude(last_heartbeat=_iso(agora - timedelta(minutes=9, seconds=59)))
    resultado = avaliar_stale(worker, agora=agora, limite=limite)
    assert resultado.stale is False
    print("OK  test_avaliar_stale_no_limite_exato_nao_e_stale")


def test_avaliar_stale_nunca_muda_status_do_worker_no_registro() -> None:
    """Requisito #105 Fase B, item 4: 'nunca inventar disponibilidade' —
    avaliar_stale é uma função PURA, nem recebe o registro/store, então
    não tem NENHUM caminho para escrever nele. Prova por construção: o
    registro antes e depois de chamar avaliar_stale é byte a byte igual."""
    registry = _registry_com(_claude(status="BUSY", last_heartbeat="2020-01-01T00:00:00+00:00"))
    antes = [w.to_dict() for w in registry.list_workers()]

    worker = registry.find_by_name_or_id("claude-3")
    resultado = avaliar_stale(worker)
    assert resultado.stale is True  # heartbeat de 2020 é claramente velho

    depois = [w.to_dict() for w in registry.list_workers()]
    assert antes == depois, "avaliar_stale nunca pode alterar o registro"
    assert registry.find_by_name_or_id("claude-3").status == "BUSY", "status não pode ter mudado sozinho"
    print("OK  test_avaliar_stale_nunca_muda_status_do_worker_no_registro")


def main() -> int:
    testes = [
        test_runner_heartbeat_aceita_todos_os_campos_do_contrato,
        test_runner_heartbeat_rejeita_status_invalido,
        test_runner_heartbeat_rejeita_worker_id_vazio,
        test_progress_percent_invalido_levanta_valueerror,
        test_progress_percent_zero_e_cem_sao_validos,
        test_timestamp_invalido_levanta_valueerror,
        test_heartbeat_de_payload_fail_closed_sem_campo_obrigatorio,
        test_heartbeat_de_payload_valido,
        test_parse_heartbeat_comment_bloco_valido,
        test_parse_heartbeat_comment_sem_marcador_devolve_none,
        test_parse_heartbeat_comment_sem_worker_ou_status_e_invalido,
        test_parse_heartbeat_comment_progress_nao_numerico_e_invalido,
        test_parse_heartbeat_comment_status_invalido_e_invalido,
        test_heartbeat_available_atualiza_registro,
        test_heartbeat_busy_atualiza_tarefa_branch_commit_progresso,
        test_heartbeat_near_limit_produz_sinal_de_limite_utilizavel_pelo_scheduler,
        test_heartbeat_limit_produz_sinal_de_limite,
        test_heartbeat_available_ou_busy_nunca_produz_sinal_de_limite,
        test_retorno_limit_para_available_sinaliza_ficou_disponivel_agora,
        test_heartbeat_available_repetido_nao_sinaliza_ficou_disponivel_de_novo,
        test_transicao_para_status_diferente_de_available_nunca_sinaliza,
        test_heartbeat_worker_inexistente_e_rejeitado_explicitamente,
        test_limit_sem_commit_nem_checkpoint_gera_aviso_mas_aplica,
        test_limit_com_checkpoint_mas_sem_commit_nao_gera_aviso,
        test_commit_ausente_preserva_ultimo_commit_conhecido,
        test_limit_sem_commit_mas_com_commit_antigo_no_registro_nao_gera_aviso,
        test_heartbeat_repetido_com_mesmo_timestamp_e_idempotente,
        test_dois_heartbeats_available_idempotentes_nao_reabrem_transicao,
        test_avaliar_stale_heartbeat_recente_nao_e_stale,
        test_avaliar_stale_heartbeat_velho_e_stale,
        test_avaliar_stale_worker_sem_heartbeat_nenhum_e_stale,
        test_avaliar_stale_timestamp_malformado_e_stale_por_seguranca,
        test_avaliar_stale_no_limite_exato_nao_e_stale,
        test_avaliar_stale_nunca_muda_status_do_worker_no_registro,
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
