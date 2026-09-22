"""Heartbeat estruturado dos workers — Issue #105, Fase B.

Cobre os 15 testes obrigatórios da auditoria independente do PR #110
(H1-H4): heartbeat.py não define RunnerHeartbeat próprio (usa
exclusivamente runner_contract.RunnerHeartbeat), BUSY/NEAR_LIMIT/LIMIT
exigem task_id (e AVAILABLE/OFFLINE proíbem), branch/commit/checkpoint
inválidos são rejeitados na própria construção do heartbeat, commit e
last_checkpoint nunca se fundem, retrocompatibilidade de registros sem
last_checkpoint, stale detection pura, transição LIMIT->AVAILABLE, e
idempotência.
"""

from __future__ import annotations

import inspect
import sys
from datetime import datetime, timedelta, timezone

from . import _pathsetup  # noqa: F401
import coordinator.heartbeat as heartbeat_mod
from coordinator.heartbeat import (
    DEFAULT_STALE_THRESHOLD,
    LimiteSinal,
    RunnerHeartbeat,
    aplicar_heartbeat,
    avaliar_stale,
    heartbeat_de_payload,
    parse_heartbeat_comment,
)
from coordinator.runner_contract import RunnerHeartbeat as ContratoCanonico
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord


def _registry_com(*records: WorkerRecord) -> OperationalWorkerRegistry:
    store = InMemoryWorkerStateStore({"workers": [r.to_dict() for r in records]})
    return OperationalWorkerRegistry(store)


def _claude(worker_id: str = "claude-3", *, status: str = "OFFLINE", current_task=None,
            branch=None, commit=None, last_checkpoint=None, progress=None,
            last_heartbeat=None) -> WorkerRecord:
    n = worker_id.split("-")[-1]
    return WorkerRecord(
        worker_id=worker_id, display_name=f"Claude {n}", type="human_session", status=status,
        capabilities=("conteudo", "codigo"), current_task=current_task, branch=branch,
        commit=commit, last_checkpoint=last_checkpoint, progress=progress,
        last_heartbeat=last_heartbeat, can_execute=True, can_audit=False,
    )


def _snapshot(registry: OperationalWorkerRegistry) -> list[dict]:
    return [w.to_dict() for w in registry.list_workers()]


def _iso(dt: datetime) -> str:
    return dt.isoformat()


# ---------------------------------------------------------------------
# H1 — contrato canônico único (runner_contract.RunnerHeartbeat)
# ---------------------------------------------------------------------

def test_heartbeat_modulo_nao_define_runner_heartbeat_proprio() -> None:
    """Teste obrigatório 1: heartbeat.py não define uma SEGUNDA classe
    RunnerHeartbeat — só importa a canônica."""
    codigo_fonte = inspect.getsource(heartbeat_mod)
    assert "class RunnerHeartbeat" not in codigo_fonte, (
        "heartbeat.py não pode voltar a definir sua própria RunnerHeartbeat (H1)"
    )
    assert heartbeat_mod.RunnerHeartbeat is ContratoCanonico
    print("OK  test_heartbeat_modulo_nao_define_runner_heartbeat_proprio")


def test_runner_heartbeat_isinstance_do_contrato_canonico() -> None:
    """Teste obrigatório 2: uso real confirma a classe canônica."""
    hb = RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE")
    assert isinstance(hb, ContratoCanonico)
    assert RunnerHeartbeat is ContratoCanonico
    print("OK  test_runner_heartbeat_isinstance_do_contrato_canonico")


def test_heartbeat_de_payload_produz_instancia_canonica() -> None:
    hb = heartbeat_de_payload({"worker_id": "claude-3", "status": "AVAILABLE"})
    assert isinstance(hb, ContratoCanonico)
    print("OK  test_heartbeat_de_payload_produz_instancia_canonica")


def test_parse_heartbeat_comment_produz_instancia_canonica() -> None:
    texto = "HEARTBEAT\nWORKER: Claude 3\nSTATUS: AVAILABLE\n"
    resultado = parse_heartbeat_comment(texto)
    assert resultado.ok is True
    assert isinstance(resultado.heartbeat, ContratoCanonico)
    print("OK  test_parse_heartbeat_comment_produz_instancia_canonica")


# ---------------------------------------------------------------------
# H2 — task_id conforme status (garantido na própria construção)
# ---------------------------------------------------------------------

def test_busy_sem_task_e_rejeitado_e_registry_intocado() -> None:
    """Teste obrigatório 3."""
    registry = _registry_com(_claude(status="AVAILABLE"))
    antes = _snapshot(registry)
    try:
        heartbeat_de_payload({"worker_id": "claude-3", "status": "BUSY"})  # sem task_id
    except ValueError as exc:
        assert "task_id" in str(exc)
    else:
        raise AssertionError("BUSY sem task_id deveria falhar na própria construção do heartbeat")
    assert _snapshot(registry) == antes, "registro nunca deveria ter sido tocado"
    print("OK  test_busy_sem_task_e_rejeitado_e_registry_intocado")


def test_limit_sem_task_e_rejeitado() -> None:
    """Teste obrigatório 4."""
    try:
        RunnerHeartbeat(worker_id="claude-3", status="LIMIT")  # sem task_id
    except ValueError as exc:
        assert "task_id" in str(exc)
        print("OK  test_limit_sem_task_e_rejeitado")
        return
    raise AssertionError("LIMIT sem task_id deveria falhar")


def test_near_limit_sem_task_e_rejeitado() -> None:
    try:
        RunnerHeartbeat(worker_id="claude-3", status="NEAR_LIMIT")
    except ValueError:
        print("OK  test_near_limit_sem_task_e_rejeitado")
        return
    raise AssertionError("NEAR_LIMIT sem task_id deveria falhar")


def test_available_com_task_e_rejeitado() -> None:
    """Teste obrigatório 5."""
    try:
        RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE", task_id="t1")
    except ValueError as exc:
        assert "task_id" in str(exc)
        print("OK  test_available_com_task_e_rejeitado")
        return
    raise AssertionError("AVAILABLE com task_id deveria falhar")


def test_offline_com_task_e_rejeitado() -> None:
    try:
        RunnerHeartbeat(worker_id="claude-3", status="OFFLINE", task_id="t1")
    except ValueError:
        print("OK  test_offline_com_task_e_rejeitado")
        return
    raise AssertionError("OFFLINE com task_id deveria falhar")


def test_parse_heartbeat_comment_busy_sem_task_e_invalido() -> None:
    """H4: o caminho de comentário estruturado obedece à mesma regra."""
    texto = "HEARTBEAT\nWORKER: Claude 3\nSTATUS: BUSY\n"
    resultado = parse_heartbeat_comment(texto)
    assert resultado.ok is False
    assert "task_id" in resultado.error
    print("OK  test_parse_heartbeat_comment_busy_sem_task_e_invalido")


# ---------------------------------------------------------------------
# H4 — branch/commit/checkpoint alinhados ao contrato canônico
# ---------------------------------------------------------------------

def test_branch_main_e_rejeitado() -> None:
    """Teste obrigatório 6."""
    try:
        RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", branch="main")
    except ValueError as exc:
        assert "protegida" in str(exc) or "main" in str(exc).lower()
        print("OK  test_branch_main_e_rejeitado")
        return
    raise AssertionError("branch='main' deveria ser rejeitado")


def test_branch_master_e_rejeitado() -> None:
    try:
        RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", branch="master")
    except ValueError:
        print("OK  test_branch_master_e_rejeitado")
        return
    raise AssertionError("branch='master' deveria ser rejeitado")


def test_commit_head_e_rejeitado() -> None:
    """Teste obrigatório 7 — commit precisa ser SHA explícito, nunca um
    valor simbólico como 'HEAD'."""
    try:
        RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", commit="HEAD")
    except ValueError as exc:
        assert "SHA" in str(exc)
        print("OK  test_commit_head_e_rejeitado")
        return
    raise AssertionError("commit='HEAD' deveria ser rejeitado")


def test_last_checkpoint_head_e_rejeitado() -> None:
    """Teste obrigatório 8."""
    try:
        RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", last_checkpoint="HEAD")
    except ValueError as exc:
        assert "SHA" in str(exc)
        print("OK  test_last_checkpoint_head_e_rejeitado")
        return
    raise AssertionError("last_checkpoint='HEAD' deveria ser rejeitado")


def test_commit_vazio_e_rejeitado() -> None:
    try:
        RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", commit="")
    except ValueError:
        print("OK  test_commit_vazio_e_rejeitado")
        return
    raise AssertionError("commit vazio deveria ser rejeitado (nunca string vazia como SHA)")


def test_timestamp_invalido_e_rejeitado() -> None:
    try:
        RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE", timestamp="não é uma data")
    except ValueError:
        print("OK  test_timestamp_invalido_e_rejeitado")
        return
    raise AssertionError("timestamp mal formado deveria ser rejeitado")


def test_progress_percent_fora_de_faixa_e_rejeitado() -> None:
    for valor in (-1, 101):
        try:
            RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", progress_percent=valor)
        except ValueError:
            continue
        raise AssertionError(f"progress_percent={valor} deveria ser rejeitado")
    print("OK  test_progress_percent_fora_de_faixa_e_rejeitado")


def test_heartbeat_de_payload_e_parse_comment_aplicam_a_mesma_validacao() -> None:
    """H4: 'não pode existir heartbeat humano aceita commit X e heartbeat
    API rejeita o mesmo X' — os dois caminhos falham exatamente igual
    para o mesmo commit inválido."""
    try:
        heartbeat_de_payload({"worker_id": "claude-3", "status": "BUSY", "task_id": "t1", "commit": "HEAD"})
    except ValueError as exc_payload:
        motivo_payload = str(exc_payload)
    else:
        raise AssertionError("payload com commit=HEAD deveria falhar")

    resultado_comentario = parse_heartbeat_comment(
        "HEARTBEAT\nWORKER: Claude 3\nSTATUS: BUSY\nTASK: t1\nCOMMIT: HEAD\n"
    )
    assert resultado_comentario.ok is False
    assert "SHA" in resultado_comentario.error and "SHA" in motivo_payload
    print("OK  test_heartbeat_de_payload_e_parse_comment_aplicam_a_mesma_validacao")


def test_timestamp_invalido_e_rejeitado_igualmente_por_comentario_e_payload() -> None:
    """Correção do blocker H4 restante: parse_heartbeat_comment esquecia
    de repassar TIMESTAMP para RunnerHeartbeat, então um TIMESTAMP
    inválido no comentário era silenciosamente ignorado, enquanto o
    mesmo valor via heartbeat_de_payload (api_runner) já era rejeitado.
    Os dois caminhos agora falham exatamente igual."""
    try:
        heartbeat_de_payload({
            "worker_id": "claude-3", "status": "AVAILABLE", "timestamp": "não é uma data",
        })
    except ValueError as exc_payload:
        motivo_payload = str(exc_payload)
    else:
        raise AssertionError("payload com timestamp inválido deveria falhar")

    resultado_comentario = parse_heartbeat_comment(
        "HEARTBEAT\nWORKER: Claude 3\nSTATUS: AVAILABLE\nTIMESTAMP: não é uma data\n"
    )
    assert resultado_comentario is not None
    assert resultado_comentario.ok is False, (
        "TIMESTAMP inválido no comentário precisa ser rejeitado, nunca ignorado silenciosamente"
    )
    assert "timestamp" in resultado_comentario.error.lower()
    assert "timestamp" in motivo_payload.lower()
    print("OK  test_timestamp_invalido_e_rejeitado_igualmente_por_comentario_e_payload")


def test_timestamp_iso8601_valido_e_preservado_no_comentario() -> None:
    """TIMESTAMP válido no bloco HEARTBEAT precisa chegar de fato ao
    RunnerHeartbeat resultante — não só ser reconhecido e descartado."""
    texto = (
        "HEARTBEAT\nWORKER: Claude 3\nSTATUS: BUSY\nTASK: t1\n"
        "TIMESTAMP: 2026-09-22T02:00:00+00:00\n"
    )
    resultado = parse_heartbeat_comment(texto)
    assert resultado.ok is True
    assert resultado.heartbeat.timestamp == "2026-09-22T02:00:00+00:00"
    print("OK  test_timestamp_iso8601_valido_e_preservado_no_comentario")


def test_timestamp_valido_do_comentario_e_usado_ao_aplicar_heartbeat() -> None:
    """Prova de ponta a ponta: o TIMESTAMP do comentário vira
    last_heartbeat de verdade no registro, não é recarimbado por
    _now_iso() como se estivesse ausente."""
    registry = _registry_com(_claude(status="AVAILABLE"))
    texto = (
        "HEARTBEAT\nWORKER: Claude 3\nSTATUS: BUSY\nTASK: t1\n"
        "TIMESTAMP: 2026-09-22T02:00:00+00:00\n"
    )
    resultado_parse = parse_heartbeat_comment(texto)
    assert resultado_parse.ok is True
    resultado = aplicar_heartbeat(registry, resultado_parse.heartbeat)
    assert resultado.record.last_heartbeat == "2026-09-22T02:00:00+00:00"
    print("OK  test_timestamp_valido_do_comentario_e_usado_ao_aplicar_heartbeat")


# ---------------------------------------------------------------------
# aplicar_heartbeat — status válidos (AVAILABLE/BUSY/NEAR_LIMIT/LIMIT)
# ---------------------------------------------------------------------

def test_heartbeat_available_atualiza_registro_e_limpa_tarefa() -> None:
    registry = _registry_com(_claude(status="BUSY", current_task="t1"))
    resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE"))
    assert resultado.action == "APPLIED"
    assert resultado.record.status == "AVAILABLE"
    assert resultado.record.current_task is None
    assert registry.find_by_name_or_id("claude-3").status == "AVAILABLE"
    print("OK  test_heartbeat_available_atualiza_registro_e_limpa_tarefa")


def test_heartbeat_busy_atualiza_tarefa_branch_commit_progresso() -> None:
    registry = _registry_com(_claude(status="AVAILABLE"))
    hb = RunnerHeartbeat(
        worker_id="claude-3", status="BUSY", task_id="infra-x", branch="infra/x",
        commit="abc1234", progress_percent=30,
    )
    resultado = aplicar_heartbeat(registry, hb)
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
    assert isinstance(resultado.sinal_limite, LimiteSinal)
    assert resultado.sinal_limite.worker_status == "NEAR_LIMIT"
    assert resultado.sinal_limite.progress_percent == 72
    print("OK  test_heartbeat_near_limit_produz_sinal_de_limite_utilizavel_pelo_scheduler")


def test_heartbeat_limit_produz_sinal_de_limite() -> None:
    registry = _registry_com(_claude(status="NEAR_LIMIT", current_task="t1"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="LIMIT", task_id="t1", commit="abc1234")
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.record.status == "LIMIT"
    assert resultado.sinal_limite.worker_status == "LIMIT"
    print("OK  test_heartbeat_limit_produz_sinal_de_limite")


def test_heartbeat_available_ou_offline_nunca_produz_sinal_de_limite() -> None:
    registry = _registry_com(_claude())
    for status in ("AVAILABLE", "OFFLINE"):
        resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-3", status=status))
        assert resultado.sinal_limite is None
    print("OK  test_heartbeat_available_ou_offline_nunca_produz_sinal_de_limite")


def test_worker_inexistente_e_rejeitado_explicitamente() -> None:
    registry = _registry_com(_claude("claude-1"))
    resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-9", status="AVAILABLE"))
    assert resultado.action == "REJECTED"
    assert resultado.record is None
    assert "desconhecido" in resultado.reason
    assert registry.find_by_name_or_id("claude-9") is None
    print("OK  test_worker_inexistente_e_rejeitado_explicitamente")


# ---------------------------------------------------------------------
# H3 — commit e last_checkpoint independentes
# ---------------------------------------------------------------------

def test_commit_novo_sem_checkpoint_nao_altera_last_checkpoint_anterior() -> None:
    """Teste obrigatório 9."""
    registry = _registry_com(_claude(status="BUSY", current_task="t1", last_checkpoint="aaaaaa1"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", commit="5d6e7f8")
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.record.commit == "5d6e7f8"
    assert resultado.record.last_checkpoint == "aaaaaa1", "commit novo nunca vira checkpoint sozinho"
    print("OK  test_commit_novo_sem_checkpoint_nao_altera_last_checkpoint_anterior")


def test_checkpoint_explicito_atualiza_last_checkpoint() -> None:
    """Teste obrigatório 10."""
    registry = _registry_com(_claude(status="BUSY", current_task="t1", last_checkpoint="aaaaaa1"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", last_checkpoint="cccccc3")
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.record.last_checkpoint == "cccccc3"
    print("OK  test_checkpoint_explicito_atualiza_last_checkpoint")


def test_estado_legado_sem_last_checkpoint_carrega_none() -> None:
    """Teste obrigatório 11."""
    legado = {
        "worker_id": "claude-3", "display_name": "Claude 3", "type": "human_session",
        "status": "BUSY", "commit": "dddddd4",  # sem "last_checkpoint" no dict
    }
    registro = WorkerRecord.from_dict(legado)
    assert registro.last_checkpoint is None
    assert registro.commit == "dddddd4", "commit legado preservado; nunca copiado para last_checkpoint"
    print("OK  test_estado_legado_sem_last_checkpoint_carrega_none")


def test_limit_com_commit_mas_sem_checkpoint_nao_finge_checkpoint_seguro() -> None:
    """Teste obrigatório 12."""
    registry = _registry_com(_claude(status="NEAR_LIMIT", current_task="t1"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="LIMIT", task_id="t1", commit="eeeeee5")
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.record.commit == "eeeeee5"
    assert resultado.record.last_checkpoint is None
    assert resultado.sinal_limite.checkpoint_seguro is None, "commit sozinho nunca é checkpoint seguro"
    assert len(resultado.avisos) == 1
    assert "checkpoint" in resultado.avisos[0].lower()
    print("OK  test_limit_com_commit_mas_sem_checkpoint_nao_finge_checkpoint_seguro")


def test_limit_com_checkpoint_explicito_nao_gera_aviso() -> None:
    registry = _registry_com(_claude(status="NEAR_LIMIT", current_task="t1"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="LIMIT", task_id="t1", last_checkpoint="ffffff6")
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.avisos == ()
    assert resultado.sinal_limite.checkpoint_seguro == "ffffff6"
    print("OK  test_limit_com_checkpoint_explicito_nao_gera_aviso")


def test_commit_ausente_preserva_ultimo_commit_conhecido() -> None:
    registry = _registry_com(_claude(status="BUSY", current_task="t1", commit="1a2b3c4"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", progress_percent=50)
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.record.commit == "1a2b3c4"
    print("OK  test_commit_ausente_preserva_ultimo_commit_conhecido")


def test_branch_ausente_preserva_branch_conhecida() -> None:
    registry = _registry_com(_claude(status="BUSY", current_task="t1", branch="infra/velha"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="BUSY", task_id="t1", progress_percent=10)
    resultado = aplicar_heartbeat(registry, hb)
    assert resultado.record.branch == "infra/velha"
    print("OK  test_branch_ausente_preserva_branch_conhecida")


# ---------------------------------------------------------------------
# Retorno LIMIT -> AVAILABLE
# ---------------------------------------------------------------------

def test_retorno_limit_para_available_continua_funcionando() -> None:
    """Teste obrigatório 14."""
    registry = _registry_com(_claude(status="LIMIT", current_task="t1", commit="abc1234"))
    resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE"))
    assert resultado.action == "APPLIED"
    assert resultado.ficou_disponivel_agora is True
    assert resultado.record.current_task is None
    print("OK  test_retorno_limit_para_available_continua_funcionando")


def test_heartbeat_available_repetido_nao_sinaliza_ficou_disponivel_de_novo() -> None:
    registry = _registry_com(_claude(status="AVAILABLE"))
    resultado = aplicar_heartbeat(registry, RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE"))
    assert resultado.ficou_disponivel_agora is False
    print("OK  test_heartbeat_available_repetido_nao_sinaliza_ficou_disponivel_de_novo")


# ---------------------------------------------------------------------
# Idempotência
# ---------------------------------------------------------------------

def test_heartbeat_repetido_com_mesmo_timestamp_e_idempotente() -> None:
    """Teste obrigatório 15."""
    registry = _registry_com(_claude(status="AVAILABLE"))
    hb = RunnerHeartbeat(
        worker_id="claude-3", status="BUSY", task_id="t1", branch="infra/x", commit="abc1234",
        progress_percent=50, timestamp="2026-09-22T02:00:00+00:00",
    )
    r1 = aplicar_heartbeat(registry, hb)
    r2 = aplicar_heartbeat(registry, hb)
    assert r1.record.to_dict() == r2.record.to_dict()
    assert r1.ficou_disponivel_agora is False and r2.ficou_disponivel_agora is False
    print("OK  test_heartbeat_repetido_com_mesmo_timestamp_e_idempotente")


def test_dois_heartbeats_available_idempotentes_nao_reabrem_transicao() -> None:
    registry = _registry_com(_claude(status="LIMIT", current_task="t1"))
    hb = RunnerHeartbeat(worker_id="claude-3", status="AVAILABLE", timestamp="2026-09-22T02:00:00+00:00")
    r1 = aplicar_heartbeat(registry, hb)
    r2 = aplicar_heartbeat(registry, hb)
    assert r1.ficou_disponivel_agora is True
    assert r2.ficou_disponivel_agora is False
    print("OK  test_dois_heartbeats_available_idempotentes_nao_reabrem_transicao")


# ---------------------------------------------------------------------
# Stale detection — pura, nunca muda status (teste obrigatório 13)
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
    print("OK  test_avaliar_stale_heartbeat_velho_e_stale")


def test_avaliar_stale_worker_sem_heartbeat_nenhum_e_stale() -> None:
    worker = _claude(last_heartbeat=None)
    resultado = avaliar_stale(worker)
    assert resultado.stale is True
    print("OK  test_avaliar_stale_worker_sem_heartbeat_nenhum_e_stale")


def test_avaliar_stale_timestamp_malformado_e_stale_por_seguranca() -> None:
    worker = _claude(last_heartbeat="isto-nao-e-uma-data")
    resultado = avaliar_stale(worker)
    assert resultado.stale is True
    print("OK  test_avaliar_stale_timestamp_malformado_e_stale_por_seguranca")


def test_avaliar_stale_nunca_muda_status_do_worker_no_registro() -> None:
    """Teste obrigatório 13: avaliar_stale é PURA — nem recebe o
    registro/store, então não tem caminho para escrever nele."""
    registry = _registry_com(_claude(status="BUSY", last_heartbeat="2020-01-01T00:00:00+00:00"))
    antes = _snapshot(registry)

    worker = registry.find_by_name_or_id("claude-3")
    resultado = avaliar_stale(worker)
    assert resultado.stale is True

    depois = _snapshot(registry)
    assert antes == depois, "avaliar_stale nunca pode alterar o registro"
    assert registry.find_by_name_or_id("claude-3").status == "BUSY"
    print("OK  test_avaliar_stale_nunca_muda_status_do_worker_no_registro")


def main() -> int:
    testes = [
        test_heartbeat_modulo_nao_define_runner_heartbeat_proprio,
        test_runner_heartbeat_isinstance_do_contrato_canonico,
        test_heartbeat_de_payload_produz_instancia_canonica,
        test_parse_heartbeat_comment_produz_instancia_canonica,
        test_busy_sem_task_e_rejeitado_e_registry_intocado,
        test_limit_sem_task_e_rejeitado,
        test_near_limit_sem_task_e_rejeitado,
        test_available_com_task_e_rejeitado,
        test_offline_com_task_e_rejeitado,
        test_parse_heartbeat_comment_busy_sem_task_e_invalido,
        test_branch_main_e_rejeitado,
        test_branch_master_e_rejeitado,
        test_commit_head_e_rejeitado,
        test_last_checkpoint_head_e_rejeitado,
        test_commit_vazio_e_rejeitado,
        test_timestamp_invalido_e_rejeitado,
        test_progress_percent_fora_de_faixa_e_rejeitado,
        test_heartbeat_de_payload_e_parse_comment_aplicam_a_mesma_validacao,
        test_timestamp_invalido_e_rejeitado_igualmente_por_comentario_e_payload,
        test_timestamp_iso8601_valido_e_preservado_no_comentario,
        test_timestamp_valido_do_comentario_e_usado_ao_aplicar_heartbeat,
        test_heartbeat_available_atualiza_registro_e_limpa_tarefa,
        test_heartbeat_busy_atualiza_tarefa_branch_commit_progresso,
        test_heartbeat_near_limit_produz_sinal_de_limite_utilizavel_pelo_scheduler,
        test_heartbeat_limit_produz_sinal_de_limite,
        test_heartbeat_available_ou_offline_nunca_produz_sinal_de_limite,
        test_worker_inexistente_e_rejeitado_explicitamente,
        test_commit_novo_sem_checkpoint_nao_altera_last_checkpoint_anterior,
        test_checkpoint_explicito_atualiza_last_checkpoint,
        test_estado_legado_sem_last_checkpoint_carrega_none,
        test_limit_com_commit_mas_sem_checkpoint_nao_finge_checkpoint_seguro,
        test_limit_com_checkpoint_explicito_nao_gera_aviso,
        test_commit_ausente_preserva_ultimo_commit_conhecido,
        test_branch_ausente_preserva_branch_conhecida,
        test_retorno_limit_para_available_continua_funcionando,
        test_heartbeat_available_repetido_nao_sinaliza_ficou_disponivel_de_novo,
        test_heartbeat_repetido_com_mesmo_timestamp_e_idempotente,
        test_dois_heartbeats_available_idempotentes_nao_reabrem_transicao,
        test_avaliar_stale_heartbeat_recente_nao_e_stale,
        test_avaliar_stale_heartbeat_velho_e_stale,
        test_avaliar_stale_worker_sem_heartbeat_nenhum_e_stale,
        test_avaliar_stale_timestamp_malformado_e_stale_por_seguranca,
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
