"""O caminho real de ponta a ponta (bloqueador 1) através de ``observe()``.

Este arquivo é NOVO — ``test_observe_pipeline.py`` já aprovado na primeira
auditoria fica intocado. Aqui provamos, com o pipeline inteiro (não só as
peças isoladas), exatamente o que a segunda auditoria do PR #97 pediu:

    1. ENABLED=false + Transport REAL (não mock) por padrão -> 0 HTTP;
    2. ENABLED=true + mock -> exatamente 1 chamada, usage registrado;
    3. duas execuções independentes (dedup e ledger via git_state.py)
       compartilham estado — a segunda vê o que a primeira gravou;
    4. evento duplicado na "segunda execução" -> 0 chamada nova;
    5. timeout/erro do transporte -> observe() não entra em loop;
    6. segredo nunca aparece na saída de observe(), mesmo em erro.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

from . import _pathsetup
from coordinator.anthropic_transport import AnthropicTransport
from coordinator.budget import UsageLedger
from coordinator.config import Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.events import Event
from coordinator.git_state import GitDedupStore, GitJsonStore, GitUsageLedger
from coordinator.observe import observe
from coordinator.worker_registry import Worker, WorkerState

import subprocess


def _load(nome: str) -> Event:
    with open(os.path.join(_pathsetup.FIXTURES, nome), encoding="utf-8") as fh:
        d = json.load(fh)
    return Event(raw_type=d["raw_type"], source=d["source"], repo=d["repo"],
                 identity=d["identity"], payload=d["payload"])


def _workers() -> list[Worker]:
    with open(os.path.join(_pathsetup.FIXTURES, "workers.json"), encoding="utf-8") as fh:
        d = json.load(fh)
    return [Worker(name=w["name"], state=WorkerState(w["state"]),
                    specialization=tuple(w.get("specialization", [])))
            for w in d["workers"]]


class _TransporteContador:
    def __init__(self, *, resposta=None, excecao: Exception | None = None) -> None:
        self.calls = 0
        self.resposta = resposta
        self.excecao = excecao

    def send(self, request):
        self.calls += 1
        if self.excecao is not None:
            raise self.excecao
        return self.resposta


def test_disabled_with_real_default_transport_makes_zero_http() -> None:
    """A prova central do bloqueador 1: mesmo usando o Transport REAL de
    verdade (não um mock) como padrão de observe(), ENABLED=false continua
    fechando o portão antes de qualquer tentativa de rede.

    Prova indireta, mas rigorosa: se `transport.send()` tivesse sido
    alcançado de verdade neste sandbox (sem chave, provavelmente sem rede
    de saída para api.anthropic.com), o resultado seria status="error"
    (uma falha de conexão/autenticação capturada por anthropic_client.call),
    nunca "BLOCKED". Como o portão fecha ANTES de chamar transport.send(),
    o status observado tem que ser exatamente "BLOCKED".
    """
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config(enabled=False, mode="observe")
        ev = _load("event_pr_needs_audit.json")
        r = observe(
            ev, config=cfg,
            dedup=Deduplicator(InMemoryStore()),
            ledger=UsageLedger(os.path.join(tmp, "usage.json")),
            workers=_workers(),
            # transport OMITIDO -> observe() usa AnthropicTransport() real por padrão
        )
        assert r.status == "BLOCKED", f"esperava BLOCKED (portão fechado antes da rede), obtido {r.status}"
        assert r.call_attempted is False
        assert r.call_status is None
    print("OK  test_disabled_with_real_default_transport_makes_zero_http")


def test_enabled_with_mock_makes_exactly_one_call_and_registers_usage() -> None:
    from coordinator.anthropic_client import TransportResponse

    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config(enabled=True, mode="observe")
        caminho_ledger = os.path.join(tmp, "usage.json")
        ledger = UsageLedger(caminho_ledger)
        transporte = _TransporteContador(resposta=TransportResponse("resumo simulado", 200, 80))

        ev = _load("event_pr_needs_audit.json")
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()), ledger=ledger,
                    workers=_workers(), transport=transporte)

        assert transporte.calls == 1, f"esperava exatamente 1 chamada, houve {transporte.calls}"
        assert r.status == "OBSERVED"
        assert r.call_status == "ok"
        assert r.usage is not None and r.usage["input_tokens"] == 200
        assert len(ledger.all_records()) == 1
    print("OK  test_enabled_with_mock_makes_exactly_one_call_and_registers_usage")


def _remoto_local(tmp: str) -> str:
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("mentira\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    subprocess.run(["git", "-C", remoto, "checkout", "-q", "-b", "bootstrap"], check=True)
    return remoto


def test_two_independent_pipeline_runs_share_state_and_second_duplicate_makes_zero_calls() -> None:
    """A prova mais completa: duas chamadas a `observe()`, cada uma com
    SEU PRÓPRIO Deduplicator/UsageLedger git-backed (simulando dois
    runners efêmeros do GitHub Actions que só compartilham o remoto), para
    o MESMO evento. A primeira roda de verdade (mock); a segunda tem que
    ser detectada como duplicata e não tentar nada."""
    from coordinator.anthropic_client import TransportResponse

    with tempfile.TemporaryDirectory() as tmp:
        remoto = _remoto_local(tmp)
        branch_dedup = "coordinator-state-teste-pipeline-dedup"
        branch_ledger = "coordinator-state-teste-pipeline-ledger"
        ev = _load("event_pr_needs_audit.json")
        cfg = Config(enabled=True, mode="observe")

        # "Execução 1" — runner efêmero A.
        dedup_a = Deduplicator(GitDedupStore(GitJsonStore(remoto, branch=branch_dedup)))
        ledger_a = GitUsageLedger(GitJsonStore(remoto, branch=branch_ledger))
        transporte_a = _TransporteContador(resposta=TransportResponse("ok", 50, 20))
        r1 = observe(ev, config=cfg, dedup=dedup_a, ledger=ledger_a, workers=_workers(), transport=transporte_a)
        assert r1.status == "OBSERVED"
        assert transporte_a.calls == 1

        # "Execução 2" — runner efêmero B, SEM NADA em memória compartilhado
        # com A — só o mesmo remoto git.
        dedup_b = Deduplicator(GitDedupStore(GitJsonStore(remoto, branch=branch_dedup)))
        ledger_b = GitUsageLedger(GitJsonStore(remoto, branch=branch_ledger))
        transporte_b = _TransporteContador(resposta=TransportResponse("não devia rodar", 999, 999))
        r2 = observe(ev, config=cfg, dedup=dedup_b, ledger=ledger_b, workers=_workers(), transport=transporte_b)

        assert r2.status == "DUPLICATE", f"execução 2 devia ver o evento como duplicata, obtido {r2.status}"
        assert transporte_b.calls == 0, "execução 2 não podia ter chamado o transporte nenhuma vez"

        # A execução 2 também enxerga o gasto que a execução 1 registrou.
        assert ledger_b.month_to_date_usd() > 0
        assert len(ledger_b.all_records()) == 1
    print("OK  test_two_independent_pipeline_runs_share_state_and_second_duplicate_makes_zero_calls")


def test_transport_timeout_through_observe_is_single_attempt() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config(enabled=True, mode="observe")
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        transporte = _TransporteContador(excecao=TimeoutError("simulado"))
        ev = _load("event_guard_state_failure.json")
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()), ledger=ledger,
                    workers=_workers(), transport=transporte)
        assert transporte.calls == 1, "erro de transporte não pode virar retry loop dentro de observe()"
        assert r.call_status == "error"
        assert len(ledger.all_records()) == 0, "chamada com erro não registra usage nenhum"
    print("OK  test_transport_timeout_through_observe_is_single_attempt")


def test_secret_never_appears_in_observe_output_even_on_error() -> None:
    chave_falsa = "sk-ant-" + "Q" * 40
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config(enabled=True, mode="observe")
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        transporte = _TransporteContador(excecao=RuntimeError(f"auth failed: {chave_falsa}"))
        ev = _load("event_pr_needs_audit.json")
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()), ledger=ledger,
                    workers=_workers(), transport=transporte)
        texto_completo = json.dumps(r.to_dict(), ensure_ascii=False)
        assert chave_falsa not in texto_completo
    print("OK  test_secret_never_appears_in_observe_output_even_on_error")


def main() -> int:
    testes = [
        test_disabled_with_real_default_transport_makes_zero_http,
        test_enabled_with_mock_makes_exactly_one_call_and_registers_usage,
        test_two_independent_pipeline_runs_share_state_and_second_duplicate_makes_zero_calls,
        test_transport_timeout_through_observe_is_single_attempt,
        test_secret_never_appears_in_observe_output_even_on_error,
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
