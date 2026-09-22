"""Testes de ``coordinator/worker_ops.py`` — achado F7-D (Issue #105,
Fase F, 6ª rodada): a transição ``SET_AVAILABLE`` precisa de um CAS real
(``conditional_update`` sobre estado FRESCO), nunca "read antigo + upsert
incondicional". Cobre os dois métodos novos
(``marcar_available_condicional``/``reservar_current_task_condicional``)
diretamente na camada de baixo nível, sem passar por
``worker_commands.aplicar_comando`` — esse caminho ponta a ponta já é
coberto por ``test_worker_commands.py``.

Achado F8-B (7ª rodada, auditoria independente): a checagem original de
``marcar_available_condicional`` (F7-D) não incluía ``status`` — um
heartbeat concorrente que mudasse SÓ o status (ex.: LIMIT -> BUSY, sem
tocar current_task/checkpoint/branch) passava pelo CAS sem ser
detectado. ``esperado_status`` agora é obrigatório; o cenário obrigatório
(``test_marcar_available_condicional_recusa_quando_so_o_status_mudou``)
prova exatamente essa lacuna fechada.

Registrado em ``coordinator/tests/run_all.py`` a partir da Fase G da
Issue #105 (antes disto rodava só standalone, o que deixava a allowlist
``coordinator-suite`` — a única validação que o próprio canário executa
antes de comitar — cega para o mecanismo do canário). Continua rodando
standalone via ``python3 -m coordinator.tests.test_worker_ops``.
"""

from __future__ import annotations

import sys
import threading

from . import _pathsetup  # noqa: F401
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry, WorkerRecord


def _registry() -> OperationalWorkerRegistry:
    return OperationalWorkerRegistry(InMemoryWorkerStateStore())


# ---------------------------------------------------------------------------
# marcar_available_condicional — CAS da transição SET_AVAILABLE.
# ---------------------------------------------------------------------------

def test_marcar_available_condicional_aceita_quando_estado_bate() -> None:
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
            current_task="t-x", last_checkpoint="abc123", branch="runner/t-x", can_execute=True,
        ),
        message="setup",
    )
    ok = registry.marcar_available_condicional(
        "claude-2", esperado_status="LIMIT", esperado_current_task="t-x", esperado_checkpoint="abc123",
        esperado_branch="runner/t-x", message="teste",
    )
    assert ok is True
    worker = registry.find_by_name_or_id("claude-2")
    assert worker.status == "AVAILABLE"
    assert worker.current_task is None
    print("OK  test_marcar_available_condicional_aceita_quando_estado_bate")


def test_marcar_available_condicional_recusa_quando_current_task_mudou() -> None:
    """F7-D: simula um heartbeat/handoff real acontecendo ENTRE a leitura
    que originou o comando e a escrita — o registro já mudou de
    current_task quando o CAS roda; a transição precisa ser recusada,
    nunca sobrescrever o estado mais novo."""
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
            current_task="t-x", last_checkpoint="abc123", branch="runner/t-x", can_execute=True,
        ),
        message="setup",
    )
    # "Concorrente": um heartbeat real publica um checkpoint NOVO antes do
    # CAS abaixo rodar — o snapshot que o comando capturou (checkpoint
    # "abc123") já está desatualizado.
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
            current_task="t-x", last_checkpoint="def456-mais-novo", branch="runner/t-x", can_execute=True,
        ),
        message="heartbeat concorrente: checkpoint novo",
    )
    ok = registry.marcar_available_condicional(
        "claude-2", esperado_status="LIMIT", esperado_current_task="t-x", esperado_checkpoint="abc123",
        esperado_branch="runner/t-x", message="teste (stale)",
    )
    assert ok is False, "CAS precisa recusar quando o checkpoint mudou desde a leitura"
    worker = registry.find_by_name_or_id("claude-2")
    assert worker.status == "LIMIT", "estado mais novo nunca pode ser sobrescrito pela transição stale"
    assert worker.last_checkpoint == "def456-mais-novo"
    print("OK  test_marcar_available_condicional_recusa_quando_current_task_mudou")


def test_marcar_available_condicional_concorrente_so_uma_vence() -> None:
    """Teste concorrente obrigatório (F7-D): duas threads tentam a MESMA
    transição SET_AVAILABLE (mesmo snapshot esperado) ao mesmo tempo —
    exatamente uma pode vencer o CAS (a segunda encontra o estado já
    mudado pela primeira e é recusada), nunca as duas."""
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
            current_task="t-x", last_checkpoint="abc123", branch="runner/t-x", can_execute=True,
        ),
        message="setup",
    )
    resultados: list[bool] = []
    barreira = threading.Barrier(2)

    def tentar() -> None:
        barreira.wait()
        ok = registry.marcar_available_condicional(
            "claude-2", esperado_status="LIMIT", esperado_current_task="t-x", esperado_checkpoint="abc123",
            esperado_branch="runner/t-x", message="corrida",
        )
        resultados.append(ok)

    threads = [threading.Thread(target=tentar) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert sorted(resultados) == [False, True], f"exatamente uma tentativa deveria vencer: {resultados}"
    worker = registry.find_by_name_or_id("claude-2")
    assert worker.status == "AVAILABLE"
    assert worker.current_task is None
    print("OK  test_marcar_available_condicional_concorrente_so_uma_vence")


def test_marcar_available_condicional_recusa_quando_so_o_status_mudou() -> None:
    """Achado F8-B (7ª rodada, auditoria independente): cenário obrigatório
    — snapshot inicial LIMIT; um heartbeat concorrente muda SÓ o status
    para BUSY (task/checkpoint/branch permanecem EXATAMENTE iguais); um
    SET_AVAILABLE atrasado (que capturou o snapshot ANTES desse
    heartbeat, então ainda espera status=LIMIT) precisa ser recusado pelo
    CAS; o registro BUSY precisa permanecer intacto — nunca sobrescrito
    por uma transição que nem olhava o status antes desta correção (a
    falha exata que F7-D sozinho não cobria)."""
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="LIMIT",
            current_task="t-x", last_checkpoint="abc123", branch="runner/t-x", can_execute=True,
        ),
        message="snapshot inicial: LIMIT",
    )
    # Heartbeat concorrente: SÓ o status muda (BUSY) — current_task,
    # last_checkpoint e branch continuam EXATAMENTE os mesmos, o cenário
    # exato em que a checagem antiga (sem esperado_status) não detectaria
    # nada de diferente.
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="BUSY",
            current_task="t-x", last_checkpoint="abc123", branch="runner/t-x", can_execute=True,
        ),
        message="heartbeat concorrente: só o status mudou (LIMIT -> BUSY)",
    )
    # SET_AVAILABLE atrasado: capturou o snapshot ANTES do heartbeat acima
    # (ainda espera status=LIMIT).
    ok = registry.marcar_available_condicional(
        "claude-2", esperado_status="LIMIT", esperado_current_task="t-x", esperado_checkpoint="abc123",
        esperado_branch="runner/t-x", message="SET_AVAILABLE atrasado (stale)",
    )
    assert ok is False, "CAS precisa recusar quando SÓ o status mudou desde a leitura"
    worker = registry.find_by_name_or_id("claude-2")
    assert worker.status == "BUSY", "o registro BUSY (mais novo) precisa permanecer intacto"
    assert worker.current_task == "t-x"
    assert worker.last_checkpoint == "abc123"
    print("OK  test_marcar_available_condicional_recusa_quando_so_o_status_mudou")


# ---------------------------------------------------------------------------
# reservar_current_task_condicional — CAS da restauração de reserva (F7-C).
# ---------------------------------------------------------------------------

def test_reservar_current_task_condicional_aceita_quando_livre() -> None:
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="AVAILABLE",
            current_task=None, can_execute=True,
        ),
        message="setup",
    )
    ok = registry.reservar_current_task_condicional("claude-2", canonical_task_id="t-original", message="teste")
    assert ok is True
    worker = registry.find_by_name_or_id("claude-2")
    assert worker.status == "AVAILABLE", "reserva nunca finge BUSY"
    assert worker.current_task == "t-original"
    print("OK  test_reservar_current_task_condicional_aceita_quando_livre")


def test_reservar_current_task_condicional_recusa_quando_ja_assumiu_outra_tarefa() -> None:
    """F7-D aplicado à restauração de reserva: se, entre a decisão de
    preservar e a escrita, o worker já foi assumido por uma atribuição
    NOVA (current_task != None), a reserva antiga nunca pode sobrescrever
    esse estado mais novo."""
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="BUSY",
            current_task="t-nova-atribuicao", can_execute=True,
        ),
        message="setup: já assumiu outra tarefa nesse meio-tempo",
    )
    ok = registry.reservar_current_task_condicional("claude-2", canonical_task_id="t-original", message="teste")
    assert ok is False
    worker = registry.find_by_name_or_id("claude-2")
    assert worker.current_task == "t-nova-atribuicao", "a atribuição nova nunca pode ser apagada pela reserva antiga"
    print("OK  test_reservar_current_task_condicional_recusa_quando_ja_assumiu_outra_tarefa")


# ---------------------------------------------------------------------------
# escolher_disponivel — F7-C: exige current_task is None.
# ---------------------------------------------------------------------------

def test_escolher_disponivel_ignora_worker_reservado() -> None:
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="AVAILABLE",
            current_task="t-reservada", can_execute=True,
        ),
        message="setup",
    )
    assert registry.escolher_disponivel() is None
    print("OK  test_escolher_disponivel_ignora_worker_reservado")


def test_escolher_disponivel_devolve_worker_livre_de_verdade() -> None:
    registry = _registry()
    registry.upsert(
        WorkerRecord(
            worker_id="claude-2", display_name="Claude 2", type="api_runner", status="AVAILABLE",
            current_task="t-reservada", can_execute=True,
        ),
        message="reservado",
    )
    registry.upsert(
        WorkerRecord(
            worker_id="claude-3", display_name="Claude 3", type="api_runner", status="AVAILABLE",
            current_task=None, can_execute=True,
        ),
        message="livre",
    )
    escolhido = registry.escolher_disponivel()
    assert escolhido is not None and escolhido.worker_id == "claude-3"
    print("OK  test_escolher_disponivel_devolve_worker_livre_de_verdade")


def main() -> int:
    testes = [
        test_marcar_available_condicional_aceita_quando_estado_bate,
        test_marcar_available_condicional_recusa_quando_current_task_mudou,
        test_marcar_available_condicional_concorrente_so_uma_vence,
        test_marcar_available_condicional_recusa_quando_so_o_status_mudou,
        test_reservar_current_task_condicional_aceita_quando_livre,
        test_reservar_current_task_condicional_recusa_quando_ja_assumiu_outra_tarefa,
        test_escolher_disponivel_ignora_worker_reservado,
        test_escolher_disponivel_devolve_worker_livre_de_verdade,
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
