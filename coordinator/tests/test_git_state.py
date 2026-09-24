"""Persistência entre execuções INDEPENDENTES do GitHub Actions.

Bloqueador 2 da auditoria do PR #97. Prova, com git de verdade (não
simulado em memória), que:

    - duas execuções independentes (cada uma com seu próprio checkout
      fresco, como dois runners efêmeros diferentes do GitHub Actions)
      compartilham a mesma chave de deduplicação;
    - duas execuções independentes compartilham o mesmo ledger de uso;
    - a branch de estado nunca é 'main' e nunca toca matéria (ver também
      test_no_forbidden_writes.test_git_state_never_targets_main_or_materia,
      que prova isso estruturalmente no código-fonte).

Usa um repositório "remoto" local (um `git init` comum, sem
`--bare` — `git push` funciona em um repositório não-bare desde que não
se esteja enviando para a branch atualmente com checkout ali, o que nunca
é o caso aqui porque o remoto nunca fica em HEAD numa branch de trabalho)
para não depender de rede nem do GitHub de verdade — mesmo padrão que
``tools/qa/tests/test_trusted_execution.py`` já usa para provar mecânica
de git sem precisar do GitHub.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import threading
from datetime import datetime, timezone

from . import _pathsetup  # noqa: F401
from coordinator.budget import UsageRecord
from coordinator.git_state import GitDedupStore, GitJsonStore, GitUsageLedger
from coordinator.models import ModelTier


def _criar_remoto_local(tmp: str) -> str:
    """Um repositório git comum (não-bare) que funciona como 'o GitHub' —
    cada 'execução' faz seu próprio checkout fresco dele, como runners
    efêmeros diferentes fariam contra o repositório real."""
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    # git recusa push para a branch que está com checkout ali (non-bare);
    # como nossas execuções sempre criam suas PRÓPRIAS branches de estado
    # órfãs num diretório separado e dão push para elas (nunca para o que
    # estiver em HEAD no remoto), isso nunca colide. Ainda assim, deixamos
    # o remoto numa branch qualquer ("bootstrap") para nunca coincidir com
    # o nome da branch de estado usada nos testes.
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para os testes do Coordinator\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    subprocess.run(["git", "-C", remoto, "checkout", "-q", "-b", "bootstrap"], check=True)
    return remoto


def test_two_independent_runs_share_dedup() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)

        # "Execução 1": um runner efêmero, checkout do zero.
        loja_execucao_1 = GitDedupStore(GitJsonStore(remoto, branch="coordinator-state-teste-dedup"))
        assert not loja_execucao_1.seen("evt:xyz")
        loja_execucao_1.mark("evt:xyz")

        # "Execução 2": OUTRO runner efêmero — instância nova, sem nada em
        # memória compartilhado com a execução 1, só o mesmo remoto.
        loja_execucao_2 = GitDedupStore(GitJsonStore(remoto, branch="coordinator-state-teste-dedup"))
        assert loja_execucao_2.seen("evt:xyz"), (
            "a execução 2 devia enxergar a chave marcada pela execução 1 — "
            "isso é exatamente o que persistir entre runners efêmeros significa"
        )
    print("OK  test_two_independent_runs_share_dedup")


def test_two_independent_runs_share_usage_ledger() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)

        ledger_execucao_1 = GitUsageLedger(GitJsonStore(remoto, branch="coordinator-state-teste-ledger"))
        ledger_execucao_1.append(
            UsageRecord(
                timestamp=datetime.now(timezone.utc).isoformat(),
                event_key="evt:1",
                tier=ModelTier.STANDARD.value,
                model_id="claude-sonnet-5",
                input_tokens=100,
                output_tokens=50,
                estimated_cost_usd=0.001,
            )
        )

        ledger_execucao_2 = GitUsageLedger(GitJsonStore(remoto, branch="coordinator-state-teste-ledger"))
        gasto_visto_pela_execucao_2 = ledger_execucao_2.month_to_date_usd()
        assert gasto_visto_pela_execucao_2 >= 0.001, (
            "a execução 2 devia ver o gasto registrado pela execução 1 — "
            f"viu {gasto_visto_pela_execucao_2}"
        )
        assert len(ledger_execucao_2.all_records()) == 1
    print("OK  test_two_independent_runs_share_usage_ledger")


def test_state_branch_is_orphan_and_never_main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        loja = GitDedupStore(GitJsonStore(remoto, branch="coordinator-state-teste-orfa"))
        loja.mark("evt:qualquer")

        # Confirma no remoto de verdade: a branch de estado existe, é
        # órfã (não descende de "bootstrap"/main), e main nunca foi tocada.
        log_estado = subprocess.run(
            ["git", "-C", remoto, "log", "--oneline", "coordinator-state-teste-orfa"],
            capture_output=True, text=True,
        )
        assert log_estado.returncode == 0
        log_bootstrap = subprocess.run(
            ["git", "-C", remoto, "log", "--oneline", "bootstrap"],
            capture_output=True, text=True,
        )
        commits_bootstrap = log_bootstrap.stdout.strip().splitlines()
        assert len(commits_bootstrap) == 1, "a branch principal do repo não podia ganhar nenhum commit novo"
    print("OK  test_state_branch_is_orphan_and_never_main")


def test_incremental_updates_accumulate() -> None:
    """Duas marcações em duas execuções diferentes não se sobrescrevem —
    prova que 'update' lê o estado atual antes de escrever, não sobrescreve
    o arquivo do zero a cada chamada."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        branch = "coordinator-state-teste-acumula"

        GitDedupStore(GitJsonStore(remoto, branch=branch)).mark("evt:a")
        GitDedupStore(GitJsonStore(remoto, branch=branch)).mark("evt:b")

        loja_final = GitDedupStore(GitJsonStore(remoto, branch=branch))
        assert loja_final.seen("evt:a")
        assert loja_final.seen("evt:b")
    print("OK  test_incremental_updates_accumulate")


def test_concurrent_claim_exactly_one_winner() -> None:
    """Item 1 do PACOTE CONSOLIDADO (PR #97) — o teste que a versão
    anterior (seen()+mark() separados) não podia passar.

    Duas THREADS reais, cada uma com sua PRÓPRIA GitDedupStore/GitJsonStore
    (nada em memória compartilhado entre elas — só o mesmo remoto git, como
    dois runners efêmeros do GitHub Actions reagindo ao MESMO webhook), e
    uma threading.Barrier sincronizando o início de cada .claim(): as duas
    entram em claim() só depois que AMBAS chegaram na barreira, garantindo
    que as duas leituras fiquem genuinamente sobrepostas no tempo — a
    janela exata que a versão antiga (is_duplicate() cedo, mark_processed()
    tarde) deixava aberta.

    Resultado obrigatório: exatamente 1 vencedor (True), o outro False —
    nunca os dois True, nunca os dois False."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        branch = "coordinator-state-teste-claim-concorrente"
        chave = "evt:corrida"

        barreira = threading.Barrier(2)
        resultados: dict[str, bool] = {}
        erros: list[BaseException] = []

        def corredor(nome: str) -> None:
            try:
                loja = GitDedupStore(GitJsonStore(remoto, branch=branch))
                barreira.wait(timeout=10)  # força sobreposição real das leituras
                resultados[nome] = loja.claim(chave)
            except BaseException as e:  # captura para reportar fora da thread
                erros.append(e)

        t1 = threading.Thread(target=corredor, args=("A",))
        t2 = threading.Thread(target=corredor, args=("B",))
        t1.start()
        t2.start()
        t1.join(timeout=30)
        t2.join(timeout=30)

        assert not erros, f"corredor(es) lançaram exceção: {erros}"
        assert set(resultados) == {"A", "B"}, f"as duas threads precisavam terminar: {resultados}"
        vencedores = sum(1 for v in resultados.values() if v)
        assert vencedores == 1, (
            f"esperava exatamente 1 claim vencedor entre execuções concorrentes, "
            f"obtive {vencedores}: {resultados}"
        )

        # E o estado final no remoto reflete só 1 registro da chave —
        # não dois, não zero.
        loja_final = GitDedupStore(GitJsonStore(remoto, branch=branch))
        assert loja_final.seen(chave)
        dados = loja_final.git_json.read()
        assert dados.get("keys", []).count(chave) == 1, "a chave não pode aparecer duplicada no estado"
    print("OK  test_concurrent_claim_exactly_one_winner")


def test_concurrent_pipeline_exactly_one_mock_call_and_one_usage_record() -> None:
    """A mesma corrida, mas passando pelo pipeline `observe()` inteiro —
    não só o dedup isolado. Duas threads, cada uma com seu PRÓPRIO
    Deduplicator/UsageLedger git-backed e seu PRÓPRIO transporte mock
    contador, processando o MESMO evento ao mesmo tempo de verdade.

    Resultado obrigatório: exatamente 1 chamada mock no total, e
    exatamente 1 usage record no ledger compartilhado — nunca duas
    chamadas para o mesmo evento, mesmo com as duas threads decidindo
    "vou chamar a API" quase ao mesmo tempo."""
    import json as _json

    from coordinator.anthropic_client import TransportResponse
    from coordinator.config import Config
    from coordinator.dedup import Deduplicator
    from coordinator.events import Event
    from coordinator.observe import observe
    from coordinator.worker_registry import Worker, WorkerState

    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        branch_dedup = "coordinator-state-teste-pipeline-concorrente-dedup"
        branch_ledger = "coordinator-state-teste-pipeline-concorrente-ledger"

        caminho_evento = os.path.join(_pathsetup.FIXTURES, "event_pr_needs_audit.json")
        with open(caminho_evento, encoding="utf-8") as fh:
            d = _json.load(fh)
        evento = Event(raw_type=d["raw_type"], source=d["source"], repo=d["repo"],
                        identity=d["identity"], payload=d["payload"])
        cfg = Config(enabled=True, mode="observe")
        workers = [Worker(name="Claude 2", state=WorkerState.FREE)]

        barreira = threading.Barrier(2)
        resultados: dict[str, object] = {}
        chamadas_totais: list[int] = []
        erros: list[BaseException] = []

        class _TransporteContador:
            def __init__(self) -> None:
                self.calls = 0

            def send(self, request):
                self.calls += 1
                return TransportResponse("resposta simulada", 30, 10)

        def corredor(nome: str) -> None:
            try:
                dedup = Deduplicator(GitDedupStore(GitJsonStore(remoto, branch=branch_dedup)))
                ledger = GitUsageLedger(GitJsonStore(remoto, branch=branch_ledger))
                transporte = _TransporteContador()
                barreira.wait(timeout=10)  # força as duas a chegarem no claim() juntas
                r = observe(evento, config=cfg, dedup=dedup, ledger=ledger,
                            workers=workers, transport=transporte)
                resultados[nome] = r.status
                chamadas_totais.append(transporte.calls)
            except BaseException as e:
                erros.append(e)

        t1 = threading.Thread(target=corredor, args=("A",))
        t2 = threading.Thread(target=corredor, args=("B",))
        t1.start()
        t2.start()
        t1.join(timeout=30)
        t2.join(timeout=30)

        assert not erros, f"corredor(es) lançaram exceção: {erros}"
        assert set(resultados) == {"A", "B"}
        status_vistos = sorted(resultados.values())
        assert status_vistos == ["DUPLICATE", "OBSERVED"], (
            f"exatamente uma execução tinha que OBSERVAR e a outra ver DUPLICATE, obtido {resultados}"
        )
        assert sum(chamadas_totais) == 1, (
            f"exatamente 1 chamada mock no total para o mesmo evento, obtido {sum(chamadas_totais)}"
        )

        ledger_final = GitUsageLedger(GitJsonStore(remoto, branch=branch_ledger))
        # Achado F9-A: 3 registros para a ÚNICA chamada que de fato
        # aconteceu (reserva conservadora + correção para o custo real +
        # registro informativo de uso) — nunca mais 1; a execução
        # DUPLICATE nunca chega perto da reserva/chamada (barrada pelo
        # dedup, bem antes).
        registros = ledger_final.all_records()
        assert len(registros) == 3, f"reserva + correção + uso da ÚNICA chamada real: {registros}"
        assert sorted(r["kind"] for r in registros) == ["correction", "reservation", "usage"]
    print("OK  test_concurrent_pipeline_exactly_one_mock_call_and_one_usage_record")


def test_concurrent_reserve_if_within_budget_exactly_one_winner_on_fresh_branch() -> None:
    """Achado B11 da auditoria independente do PR #107 (rodada 3, HEAD
    7b0e28c): o teste de concorrência de ``UsageLedger.reserve_if_
    within_budget`` em ``test_openai_auditor.py`` só prova o caminho
    LOCAL (lock de processo único). Este teste prova o caminho de
    PRODUÇÃO: ``GitUsageLedger`` + ``GitJsonStore`` contra um remoto git
    real, com a branch do ledger AINDA NÃO EXISTENTE — exatamente a
    corrida na criação da PRIMEIRA branch que a auditoria apontou como
    desprotegida (``GitJsonStore.update()`` aceitava o resultado do push
    sem confirmar, por uma leitura independente do remoto, que aquele
    commit era de fato o vencedor).

    Duas THREADS reais, cada uma com sua PRÓPRIA GitUsageLedger/
    GitJsonStore (nada compartilhado em memória — só o mesmo remoto, como
    dois runners efêmeros reagindo ao mesmo checkpoint), sincronizadas por
    ``threading.Barrier`` para forçar leituras genuinamente sobrepostas
    (a janela exata em que as duas poderiam ler o MESMO saldo
    pré-reserva), contra um orçamento pequeno o bastante para caber
    EXATAMENTE UMA reserva.

    Resultado obrigatório: exatamente 1 ``True`` (reserva aceita), o
    outro ``False`` — e o estado FINAL no remoto, relido por uma
    TERCEIRA instância independente, contém exatamente 1 registro de
    reserva. Nunca 2 (o que aconteceria se um push "vencedor" local não
    fosse de fato confirmado como o tip real do remoto) nem 0 (a reserva
    vencedora perdida numa corrida silenciosa)."""
    from coordinator.openai_budget import OpenAIUsageRecord, conservative_call_cost_usd

    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        branch = "coordinator-state-teste-reserva-openai-concorrente"  # nunca usada antes neste remoto

        teto_uma_chamada = conservative_call_cost_usd("gpt-5.6-terra", system="s", prompt="p")
        orcamento = teto_uma_chamada * 1.5  # cabe 1 reserva, não cabem 2 juntas

        barreira = threading.Barrier(2)
        resultados: dict[str, bool] = {}
        erros: list[BaseException] = []

        def corredor(nome: str) -> None:
            try:
                ledger = GitUsageLedger(GitJsonStore(remoto, branch=branch))
                candidato = OpenAIUsageRecord(
                    timestamp=datetime.now(timezone.utc).isoformat(), event_key=f"evt-{nome}",
                    tier="TERRA", model_id="gpt-5.6-terra", input_tokens=0, output_tokens=0,
                    estimated_cost_usd=teto_uma_chamada, kind="reservation",
                )
                barreira.wait(timeout=10)  # força sobreposição real das duas leituras pré-reserva
                resultados[nome] = ledger.reserve_if_within_budget(candidato, budget_usd=orcamento)
            except BaseException as e:  # captura para reportar fora da thread
                erros.append(e)

        t1 = threading.Thread(target=corredor, args=("A",))
        t2 = threading.Thread(target=corredor, args=("B",))
        t1.start()
        t2.start()
        t1.join(timeout=60)
        t2.join(timeout=60)

        assert not erros, f"corredor(es) lançaram exceção: {erros}"
        assert set(resultados) == {"A", "B"}, f"as duas threads precisavam terminar: {resultados}"
        vencedores = sum(1 for v in resultados.values() if v)
        assert vencedores == 1, (
            f"orçamento cabia exatamente 1 reserva de US$ {teto_uma_chamada:.6f}, mas obtive "
            f"{vencedores} vencedora(s) entre execuções concorrentes contra uma branch nova: {resultados}"
        )

        # Confirma no remoto de verdade, com uma TERCEIRA instância
        # independente (nada em memória compartilhado com A/B): exatamente
        # 1 registro de reserva sobreviveu.
        ledger_final = GitUsageLedger(GitJsonStore(remoto, branch=branch))
        registros_finais = ledger_final.all_records()
        assert len(registros_finais) == 1, (
            f"o estado remoto final devia conter exatamente 1 reserva, obtive {len(registros_finais)}: "
            f"{registros_finais}"
        )
        assert abs(ledger_final.month_to_date_usd() - teto_uma_chamada) < 1e-9
    print("OK  test_concurrent_reserve_if_within_budget_exactly_one_winner_on_fresh_branch")


def test_erro_5xx_do_remoto_espera_com_recuo_exponencial_limitado() -> None:
    """Issue #230: 500 transitório do GitHub no push espera mais que uma
    corrida comum, com recuo exponencial e teto — nunca sem limite."""
    from coordinator import git_state

    esperas: list[float] = []
    original = git_state.time.sleep
    git_state.time.sleep = esperas.append
    try:
        erro_500 = "remote: Internal Server Error\n ! [remote rejected] HEAD -> coordinator-state-dedup"
        for tentativa in range(6):
            git_state._esperar_antes_de_nova_tentativa(tentativa, erro_500)
        git_state._esperar_antes_de_nova_tentativa(0, "! [rejected] (stale info)")
    finally:
        git_state.time.sleep = original
    assert esperas[:6] == [1.0, 2.0, 4.0, 8.0, 8.0, 8.0], esperas
    assert esperas[6] == 0.2, "corrida comum continua com espera curta"
    print("OK  test_erro_5xx_do_remoto_espera_com_recuo_exponencial_limitado")


def main() -> int:
    testes = [
        test_two_independent_runs_share_dedup,
        test_two_independent_runs_share_usage_ledger,
        test_state_branch_is_orphan_and_never_main,
        test_incremental_updates_accumulate,
        test_concurrent_claim_exactly_one_winner,
        test_concurrent_pipeline_exactly_one_mock_call_and_one_usage_record,
        test_concurrent_reserve_if_within_budget_exactly_one_winner_on_fresh_branch,
        test_erro_5xx_do_remoto_espera_com_recuo_exponencial_limitado,
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
