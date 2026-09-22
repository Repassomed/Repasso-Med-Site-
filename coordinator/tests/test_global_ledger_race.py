"""Achado F9-A (Issue #105, Fase F, 8ª rodada, auditoria independente):
o Coordinator OBSERVE (``coordinator/observe.py``) e o Worker Runner
(``coordinator/runner_generate.py``, achado F8-C) compartilham o MESMO
ledger Anthropic GLOBAL (branch ``coordinator-state-usage`` do mesmo
remoto, em produção) — antes desta correção, só o Runner reservava
orçamento de forma atômica; o Coordinator ainda fazia
"check_budget -> chamada -> append" (uma corrida real ENTRE OS DOIS
caminhos: uma execução do Coordinator e uma execução do Runner podiam
ler o mesmo saldo antes de qualquer uma publicar seu custo).

Dois testes, cada um provando uma metade da garantia:

1. ``test_reserva_do_coordinator_bloqueia_reserva_do_runner_no_mesmo_ledger``:
   SEQUENCIAL, passando pelos pipelines REAIS
   (``observe()``/``gerar_patch_via_claude()``) — prova que os dois
   caminhos de fato leem/escrevem o MESMO ledger/orçamento: uma reserva
   já feita por um dos dois lados consome o saldo compartilhado o
   suficiente para bloquear o outro. Determinístico, sem depender de
   timing de threads (ver nota no arquivo sobre por que um espelho
   direto na ordem inversa não é matematicamente construtível com os
   tamanhos reais dos dois prompts — a simetria é coberta pelo teste 2).
2. ``test_saldo_perto_do_teto_reservas_concorrentes_estilo_coordinator_e_runner_so_uma_vence``
   — CONCORRENTE de verdade (``threading.Barrier``, duas threads reais),
   provando a atomicidade do MESMO primitivo que os dois caminhos usam
   (``GitUsageLedger.reserve_if_within_budget``) sob candidatos com o
   formato exato que cada lado produziria — mesma técnica já usada e
   comprovadamente estável em
   ``test_git_state.py::test_concurrent_reserve_if_within_budget_exactly_one_winner_on_fresh_branch``,
   isolando a corrida no primitivo compartilhado em si (sem outras
   escritas git concorrentes de dedup/claim dos pipelines completos
   competindo pelo mesmo remoto local não-bare ao mesmo tempo, o que
   introduziria contenção alheia ao que este achado testa).

Deliberadamente NÃO registrado em ``coordinator/tests/run_all.py`` nesta
rodada (mesma decisão operacional já aplicada às Fases B/C/D/F) — roda
standalone via ``python3 -m coordinator.tests.test_global_ledger_race``.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import threading
from datetime import datetime, timezone

from . import _pathsetup  # noqa: F401
from coordinator.anthropic_client import TransportResponse
from coordinator.budget import UsageRecord
from coordinator.classify import Priority
from coordinator.config import Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.events import Event
from coordinator.git_state import GitJsonStore, GitUsageLedger
from coordinator.observe import observe
from coordinator.runner_contract import RunnerTask
from coordinator.runner_dispatch import RunnerDispatchConfig
from coordinator.runner_generate import gerar_patch_via_claude
from coordinator.worker_registry import Worker, WorkerState

_BUDGET_BRANCH = "coordinator-state-usage"  # a MESMA branch global de produção


def _criar_remoto_local(tmp: str) -> str:
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para o teste da corrida do ledger global (F9-A)\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    subprocess.run(["git", "-C", remoto, "checkout", "-q", "-b", "bootstrap"], check=True)
    return remoto


def _load_event(nome: str) -> Event:
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


class _CountingTransportAnthropic:
    def __init__(self, *, input_tokens: int, output_tokens: int, text: str = "resposta simulada") -> None:
        self.calls = 0
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.text = text

    def send(self, request):
        self.calls += 1
        return TransportResponse(self.text, self.input_tokens, self.output_tokens)


def _runner_task() -> RunnerTask:
    return RunnerTask(
        task_id="t-race-f9a--resume-000000000000",
        priority=Priority.P1,
        source_issue=105,
        branch="runner/t-race-f9a",
        allowed_files=("greeting.txt",),
        instructions="Escrever uma saudação de teste em greeting.txt.",
        checkpoint_commit=None,
        capabilities_required=(),
        risk_level="BAIXO",
        policy_level="C",
        jose_authorized=False,
        publication_required=False,
    )


def _runner_config() -> RunnerDispatchConfig:
    return RunnerDispatchConfig(enabled=True, mode="canary", canary_task_id="t-race-f9a--resume-000000000000")


def _runner_transport() -> _CountingTransportAnthropic:
    return _CountingTransportAnthropic(
        input_tokens=100, output_tokens=50,
        text='{"files": [{"path": "greeting.txt", "content": "ola\\n"}]}',
    )


# ---------------------------------------------------------------------------
# 1. Sequencial, pipelines REAIS — prova que os dois caminhos leem/escrevem
#    o MESMO ledger/orçamento compartilhado (determinístico).
# ---------------------------------------------------------------------------

def test_reserva_do_coordinator_bloqueia_reserva_do_runner_no_mesmo_ledger() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)

        # Orçamento MENSAL bem apertado — cabe UMA chamada (qualquer um
        # dos dois lados), nunca as DUAS juntas. Depois que o Coordinator
        # corrige sua reserva CONSERVADORA (~US$0.021) para o custo REAL
        # (bem menor, medido pelos tokens mockados), ainda sobra orçamento
        # suficiente para uma segunda chamada MENOR — mas nunca para a
        # reserva CONSERVADORA do Runner, maior que a do Coordinator
        # (~US$0.022) — por isso o teto é escolhido para caber
        # exatamente a reserva do Coordinator, mas não a soma "custo real
        # do Coordinator + reserva conservadora do Runner".
        import coordinator.observe as observe_mod
        teto_original = observe_mod.MONTHLY_BUDGET_USD
        observe_mod.MONTHLY_BUDGET_USD = 0.0215
        try:
            r = observe(
                _load_event("event_pr_needs_audit.json"), config=Config(enabled=True, mode="observe"),
                dedup=Deduplicator(InMemoryStore()),
                ledger=GitUsageLedger(GitJsonStore(remoto, branch=_BUDGET_BRANCH)), workers=_workers(),
                transport=_CountingTransportAnthropic(input_tokens=100, output_tokens=50),
            )
            assert r.call_status == "ok", r.reason
        finally:
            observe_mod.MONTHLY_BUDGET_USD = teto_original

        # Agora o Runner tenta, contra o MESMO remoto/branch — o
        # Coordinator já reservou/gastou o pouco orçamento que existia.
        outcome = gerar_patch_via_claude(
            _runner_task(), config=_runner_config(), repo_dir=tmp,
            usage_ledger=GitUsageLedger(GitJsonStore(remoto, branch=_BUDGET_BRANCH)), budget_usd=0.0215,
            transport=_runner_transport(),
        )
        assert outcome.status == "blocked", outcome.reason
        assert outcome.external_call_made is False
    print("OK  test_reserva_do_coordinator_bloqueia_reserva_do_runner_no_mesmo_ledger")


# Nota: um espelho direto ("Runner primeiro, Coordinator depois") não é
# matematicamente construtível com os tamanhos REAIS dos dois prompts
# (a reserva conservadora do Runner é MAIOR que a do Coordinator) — depois
# que o Runner corrige sua própria reserva para o custo real (pequeno), o
# orçamento restante sempre cabe a reserva, menor, do Coordinator. A
# simetria "qualquer um dos dois pode vencer, dependendo de quem chega
# primeiro" já é provada — de forma mais rigorosa, sob concorrência real —
# pelo teste 2 abaixo, que usa o MESMO primitivo compartilhado com
# candidatos no formato de cada lado, sem depender de qual prompt é maior.


# ---------------------------------------------------------------------------
# 2. Concorrente de verdade — atomicidade do primitivo COMPARTILHADO
#    (GitUsageLedger.reserve_if_within_budget) sob candidatos no formato
#    exato que cada lado produziria, saldo perto do teto.
# ---------------------------------------------------------------------------

def test_saldo_perto_do_teto_reservas_concorrentes_estilo_coordinator_e_runner_so_uma_vence() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        branch = "coordinator-state-teste-race-f9a-concorrente"  # nunca usada antes neste remoto

        custo_coordinator = 0.02
        custo_runner = 0.021
        # Cabe QUALQUER um dos dois sozinho, nunca os DOIS juntos.
        orcamento = max(custo_coordinator, custo_runner) * 1.1
        assert orcamento < custo_coordinator + custo_runner

        barreira = threading.Barrier(2)
        resultados: dict[str, bool] = {}
        erros: list[BaseException] = []

        def corredor(nome: str, cost: float) -> None:
            try:
                ledger = GitUsageLedger(GitJsonStore(remoto, branch=branch))
                candidato = UsageRecord(
                    timestamp=datetime.now(timezone.utc).isoformat(), event_key=f"evt-{nome}",
                    tier="STANDARD", model_id="claude-sonnet-5", input_tokens=0, output_tokens=0,
                    estimated_cost_usd=cost, kind="reservation",
                )
                barreira.wait(timeout=10)  # força sobreposição real das duas leituras pré-reserva
                resultados[nome] = ledger.reserve_if_within_budget(candidato, budget_usd=orcamento)
            except BaseException as e:  # noqa: BLE001
                erros.append(e)

        t1 = threading.Thread(target=corredor, args=("coordinator", custo_coordinator))
        t2 = threading.Thread(target=corredor, args=("runner", custo_runner))
        t1.start()
        t2.start()
        t1.join(timeout=30)
        t2.join(timeout=30)

        assert not erros, f"corredor(es) lançaram exceção: {erros}"
        assert set(resultados) == {"coordinator", "runner"}, resultados
        vencedores = [k for k, v in resultados.items() if v is True]
        assert len(vencedores) == 1, (
            f"no máximo UMA reserva podia vencer a corrida entre Coordinator e Runner: {resultados}"
        )

        ledger_final = GitUsageLedger(GitJsonStore(remoto, branch=branch))
        registros = ledger_final.all_records()
        assert len(registros) == 1, f"só a reserva vencedora pode ter sido publicada: {registros}"
    print("OK  test_saldo_perto_do_teto_reservas_concorrentes_estilo_coordinator_e_runner_so_uma_vence")


def main() -> int:
    testes = [
        test_reserva_do_coordinator_bloqueia_reserva_do_runner_no_mesmo_ledger,
        test_saldo_perto_do_teto_reservas_concorrentes_estilo_coordinator_e_runner_so_uma_vence,
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
