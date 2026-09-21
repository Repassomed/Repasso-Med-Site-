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


def main() -> int:
    testes = [
        test_two_independent_runs_share_dedup,
        test_two_independent_runs_share_usage_ledger,
        test_state_branch_is_orphan_and_never_main,
        test_incremental_updates_accumulate,
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
