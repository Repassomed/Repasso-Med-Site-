"""Regressão — achado da auditoria black-box pós-#245 (Claude 4).

``coordinator.heartbeat.avaliar_stale`` já existia, testada, mas sem
NENHUM chamador em produção: um worker ativo (BUSY/NEAR_LIMIT/LIMIT) cujo
heartbeat parasse ficava invisível para sempre, nenhum caminho agregava o
sinal por worker num relatório. Reproduzido ao vivo em 24/09/2026:
``api-runner-canary-a`` ficou ``LIMIT`` com ``last_heartbeat`` de
2026-09-23T02:47:45Z (>24h) sem que nada sinalizasse isso.

Estes testes provam:
1. ``heartbeat.workers_desatualizados`` sinaliza exatamente os workers
   ATIVOS (BUSY/NEAR_LIMIT/LIMIT) com heartbeat além do limite, e SÓ esses
   — nunca AVAILABLE/OFFLINE, nunca um worker ativo dentro do limite.
2. Não muda nenhum estado (função pura sobre a lista recebida).
3. ``worker_health_report.render_markdown`` é pura e produz um relatório
   legível a partir desse sinal, sem I/O.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from coordinator.heartbeat import DEFAULT_STALE_THRESHOLD, workers_desatualizados
from coordinator.worker_health_report import render_markdown
from coordinator.worker_ops import WorkerRecord

AGORA = datetime(2026, 9, 24, 17, 30, 0, tzinfo=timezone.utc)


def _worker(**over) -> WorkerRecord:
    base = dict(
        worker_id="w1", display_name="Worker 1", type="api_runner", status="AVAILABLE",
    )
    base.update(over)
    return WorkerRecord(**base)


def test_worker_ativo_com_heartbeat_velho_e_sinalizado() -> None:
    canario = _worker(
        worker_id="api-runner-canary-a", display_name="API Runner Canary A",
        status="LIMIT", current_task=None, branch="runner/infra-coordinator-final-canary-r4",
        last_heartbeat="2026-09-23T02:47:45.016426+00:00",
    )
    achados = workers_desatualizados([canario], agora=AGORA)
    assert len(achados) == 1
    worker, checagem = achados[0]
    assert worker.worker_id == "api-runner-canary-a"
    assert checagem.stale is True
    assert checagem.seconds_since is not None and checagem.seconds_since > DEFAULT_STALE_THRESHOLD.total_seconds()
    print("OK  test_worker_ativo_com_heartbeat_velho_e_sinalizado")


def test_worker_ativo_com_heartbeat_recente_nao_e_sinalizado() -> None:
    fresco = _worker(
        worker_id="claude-worker-1", status="BUSY", current_task="alguma-tarefa",
        last_heartbeat=(AGORA - timedelta(minutes=2)).isoformat(),
    )
    achados = workers_desatualizados([fresco], agora=AGORA)
    assert achados == []
    print("OK  test_worker_ativo_com_heartbeat_recente_nao_e_sinalizado")


def test_available_e_offline_nunca_sao_sinalizados_mesmo_sem_heartbeat() -> None:
    ocioso = _worker(worker_id="claude-2", status="AVAILABLE", last_heartbeat=None)
    desligado = _worker(worker_id="claude-3", status="OFFLINE", last_heartbeat=None)
    achados = workers_desatualizados([ocioso, desligado], agora=AGORA)
    assert achados == [], "AVAILABLE/OFFLINE sem heartbeat é normal, não uma lease órfã"
    print("OK  test_available_e_offline_nunca_sao_sinalizados_mesmo_sem_heartbeat")


def test_near_limit_velho_tambem_e_sinalizado() -> None:
    quase_no_limite = _worker(
        worker_id="claude-worker-2", status="NEAR_LIMIT", current_task="t2",
        last_heartbeat=(AGORA - DEFAULT_STALE_THRESHOLD - timedelta(minutes=1)).isoformat(),
    )
    achados = workers_desatualizados([quase_no_limite], agora=AGORA)
    assert len(achados) == 1 and achados[0][0].worker_id == "claude-worker-2"
    print("OK  test_near_limit_velho_tambem_e_sinalizado")


def test_workers_desatualizados_nao_muda_a_lista_recebida() -> None:
    canario = _worker(
        worker_id="api-runner-canary-a", status="LIMIT", current_task=None,
        last_heartbeat="2026-09-23T02:47:45+00:00",
    )
    lista = [canario]
    workers_desatualizados(lista, agora=AGORA)
    assert lista == [canario], "função precisa ser pura — nunca muta a lista/worker recebido"
    print("OK  test_workers_desatualizados_nao_muda_a_lista_recebida")


def test_relatorio_vazio_quando_nenhum_worker_esta_desatualizado() -> None:
    texto = render_markdown([], agora=AGORA, limite_segundos=1800)
    assert "🟢" in texto
    assert "Nenhum worker" in texto
    print("OK  test_relatorio_vazio_quando_nenhum_worker_esta_desatualizado")


def test_relatorio_lista_worker_com_motivo_e_nao_acao_automatica() -> None:
    canario = _worker(
        worker_id="api-runner-canary-a", display_name="API Runner Canary A",
        status="LIMIT", branch="runner/infra-coordinator-final-canary-r4",
        last_heartbeat="2026-09-23T02:47:45+00:00",
    )
    achados = workers_desatualizados([canario], agora=AGORA)
    texto = render_markdown(achados, agora=AGORA, limite_segundos=1800)
    assert "api-runner-canary-a" in texto
    assert "LIMIT" in texto
    assert "runner/infra-coordinator-final-canary-r4" in texto
    assert "não muda status de worker" in texto
    print("OK  test_relatorio_lista_worker_com_motivo_e_nao_acao_automatica")


def main() -> int:
    testes = [
        test_worker_ativo_com_heartbeat_velho_e_sinalizado,
        test_worker_ativo_com_heartbeat_recente_nao_e_sinalizado,
        test_available_e_offline_nunca_sao_sinalizados_mesmo_sem_heartbeat,
        test_near_limit_velho_tambem_e_sinalizado,
        test_workers_desatualizados_nao_muda_a_lista_recebida,
        test_relatorio_vazio_quando_nenhum_worker_esta_desatualizado,
        test_relatorio_lista_worker_com_motivo_e_nao_acao_automatica,
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
