"""Testes de ``coordinator/runner_generate.py`` — correção B2 da auditoria
independente do PR #114 (Issue #105, Fase D).

Mesma técnica de ``test_anthropic_client.py``: um transporte FALSO
(``_CountingTransport``), nunca uma chamada de rede de verdade — conta
quantas vezes ``send()`` foi invocado e devolve uma resposta/erro
programado. Cobre, no mínimo, os cenários exigidos pela correção B2: gate
fechado (zero chamada), task_id fora do canário (zero chamada), orçamento
esgotado (zero chamada), resposta válida (patch aplicável + usage
registrado no ledger), resposta malformada/JSON inválido (FAILED, sem
patch), resposta com caminho fora de allowed_files (BLOCKED, sem patch),
patch vazio (FAILED — nunca aplicado parcialmente), erro de transporte
(FAILED, uma tentativa só), e o contexto mínimo enviado (só
instructions + conteúdo dos próprios allowed_files).

Mesma decisão operacional já aplicada a ``test_runner_contract.py``/
``test_heartbeat.py``/``test_runner_dispatch.py``/``test_runner_workflow_
security.py``: deliberadamente NÃO registrado em
``coordinator/tests/run_all.py`` nesta rodada — roda standalone via
``python3 -m coordinator.tests.test_runner_generate``.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator.anthropic_client import Request, TransportResponse
from coordinator.budget import UsageLedger
from coordinator.classify import Priority
from coordinator.git_state import GitJsonStore, GitUsageLedger
from coordinator.runner_contract import RunnerTask
from coordinator.runner_dispatch import RunnerDispatchConfig
from coordinator.runner_generate import MAX_FILE_CHARS_SENT, build_prompt, gerar_patch_via_claude


class _CountingTransport:
    """Espião: conta quantas vezes send() foi chamado; nunca faz rede de
    verdade (mesma técnica de test_anthropic_client.py)."""

    def __init__(self, *, raise_error: bool = False, response: TransportResponse | None = None) -> None:
        self.calls = 0
        self.raise_error = raise_error
        self.response = response

    def send(self, request: Request) -> TransportResponse:
        self.calls += 1
        if self.raise_error:
            raise TimeoutError("simulado: a API não respondeu a tempo")
        return self.response


def _task(**overrides) -> RunnerTask:
    campos = dict(
        task_id="canario-gen-1",
        priority=Priority.P2,
        source_issue=105,
        branch="runner/canario-gen-1",
        allowed_files=("greeting.txt",),
        instructions="Escrever uma saudação de teste em greeting.txt.",
        checkpoint_commit=None,
        capabilities_required=(),
        risk_level="BAIXO",
        policy_level="C",
        jose_authorized=False,
        publication_required=False,
    )
    campos.update(overrides)
    return RunnerTask(**campos)


def _config(**overrides) -> RunnerDispatchConfig:
    campos = dict(enabled=True, mode="canary", canary_task_id="canario-gen-1")
    campos.update(overrides)
    return RunnerDispatchConfig(**campos)


def _resposta_ok(files: list[dict]) -> TransportResponse:
    return TransportResponse(text=json.dumps({"files": files}), input_tokens=100, output_tokens=50)


def _criar_remoto_local(tmp: str) -> str:
    """Mesmo padrão de test_git_state.py/test_runner_dispatch.py: um
    repositório git comum (não-bare) que funciona como 'o GitHub' — cada
    'execução' faz seu próprio GitUsageLedger/GitJsonStore, como runners
    efêmeros diferentes fariam contra o remoto real."""
    remoto = os.path.join(tmp, "remoto.git")
    os.makedirs(remoto)
    subprocess.run(["git", "init", "-q", remoto], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", remoto, "config", "user.name", "X"], check=True)
    with open(os.path.join(remoto, "README"), "w", encoding="utf-8") as fh:
        fh.write("repo de mentira só para os testes do Runner Generate\n")
    subprocess.run(["git", "-C", remoto, "add", "-A"], check=True)
    subprocess.run(["git", "-C", remoto, "commit", "-q", "-m", "bootstrap"], check=True)
    subprocess.run(["git", "-C", remoto, "checkout", "-q", "-b", "bootstrap"], check=True)
    return remoto


# ---------------------------------------------------------------------------
# Portão de segurança — zero chamada externa quando fechado, igual a
# executar_tarefa (defesa em profundidade: os mesmos 3 portões).
# ---------------------------------------------------------------------------

def test_gate_closed_makes_zero_external_call() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome = gerar_patch_via_claude(
            _task(), config=_config(enabled=False), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "blocked"
        assert transporte.calls == 0
        assert outcome.external_call_made is False
        assert outcome.patch is None
    print("OK  test_gate_closed_makes_zero_external_call")


def test_task_id_outside_canary_makes_zero_external_call() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome = gerar_patch_via_claude(
            _task(task_id="canario-gen-1"), config=_config(canary_task_id="outro-task-id"), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "blocked"
        assert transporte.calls == 0
        assert outcome.external_call_made is False
    print("OK  test_task_id_outside_canary_makes_zero_external_call")


def test_budget_exhausted_makes_zero_external_call() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=0.0,
            transport=transporte,
        )
        assert outcome.status == "blocked"
        assert transporte.calls == 0
        assert "orçamento" in outcome.reason.lower() or "orcamento" in outcome.reason.lower()
    print("OK  test_budget_exhausted_makes_zero_external_call")


# ---------------------------------------------------------------------------
# Resposta válida — patch aplicável + usage registrado no ledger existente.
# ---------------------------------------------------------------------------

def test_valid_response_returns_patch_and_records_usage() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        ledger_path = os.path.join(tmp, "ledger.json")
        transporte = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(ledger_path), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "ok"
        assert transporte.calls == 1
        assert outcome.patch is not None
        assert [fw.path for fw in outcome.patch.files] == ["greeting.txt"]
        assert outcome.usage is not None

        ledger = UsageLedger(ledger_path)
        assert len(ledger.all_records()) == 1, "a chamada real precisa ter sido registrada no ledger existente"
    print("OK  test_valid_response_returns_patch_and_records_usage")


def test_no_automatic_retry_on_transport_error() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(raise_error=True)
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "failed"
        assert transporte.calls == 1, "uma tentativa só — nenhum retry automático"
        assert outcome.patch is None
    print("OK  test_no_automatic_retry_on_transport_error")


# ---------------------------------------------------------------------------
# Correção B2-B (2ª auditoria independente do PR #114): custo persiste
# entre INSTÂNCIAS INDEPENDENTES de GitUsageLedger sobre o mesmo remoto —
# nunca em memória/arquivo local (que não sobreviveria entre execuções
# efêmeras do GitHub Actions).
# ---------------------------------------------------------------------------

def test_usage_persists_across_independent_git_usage_ledger_instances() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        branch_ledger = "coordinator-state-teste-runner-usage"

        # "Execução 1" (um job do GitHub Actions): instância FRESCA do
        # ledger, orçamento generoso — a chamada tem êxito e o custo é
        # publicado no remoto.
        ledger_execucao_1 = GitUsageLedger(GitJsonStore(remoto, branch=branch_ledger))
        transporte_1 = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome_1 = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=ledger_execucao_1, budget_usd=20.0,
            transport=transporte_1,
        )
        assert outcome_1.status == "ok"
        assert outcome_1.usage is not None

        # "Execução 2" (um job NOVO, workdir novo, processo novo): uma
        # instância TOTALMENTE NOVA de GitUsageLedger/GitJsonStore, que
        # nunca viu a execução 1 em memória — só reconstruída a partir do
        # MESMO remoto/branch. Precisa ver o gasto já registrado.
        ledger_execucao_2 = GitUsageLedger(GitJsonStore(remoto, branch=branch_ledger))
        gasto_visivel = ledger_execucao_2.month_to_date_usd()
        assert gasto_visivel > 0.0, "o custo da execução 1 precisa ser visível numa instância nova do ledger"
        assert len(ledger_execucao_2.all_records()) == 1
    print("OK  test_usage_persists_across_independent_git_usage_ledger_instances")


def test_budget_cap_enforced_via_persistent_ledger_across_fresh_instances() -> None:
    """O hard cap mensal precisa funcionar ENTRE execuções, não só dentro
    de uma — uma segunda 'execução' (ledger novo, mesmo remoto) precisa
    ver o gasto da primeira e bloquear se isso já esgotou o orçamento."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _criar_remoto_local(tmp)
        branch_ledger = "coordinator-state-teste-runner-usage-cap"

        ledger_execucao_1 = GitUsageLedger(GitJsonStore(remoto, branch=branch_ledger))
        transporte_1 = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome_1 = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=ledger_execucao_1, budget_usd=20.0,
            transport=transporte_1,
        )
        assert outcome_1.status == "ok"

        # Execução 2: ledger novo, mesmo remoto/branch, mas com um teto
        # mensal ínfimo — o gasto já registrado pela execução 1 precisa
        # bastar para o portão de orçamento fechar ANTES de qualquer
        # chamada nova, mesmo que esta segunda instância nunca tenha
        # chamado a API ela mesma.
        ledger_execucao_2 = GitUsageLedger(GitJsonStore(remoto, branch=branch_ledger))
        transporte_2 = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome_2 = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=ledger_execucao_2, budget_usd=0.0000001,
            transport=transporte_2,
        )
        assert outcome_2.status == "blocked"
        assert transporte_2.calls == 0, "orçamento esgotado (visto via ledger persistente) — zero chamada nova"
    print("OK  test_budget_cap_enforced_via_persistent_ledger_across_fresh_instances")


# ---------------------------------------------------------------------------
# Correção B2-C (2ª auditoria independente do PR #114): allowed_file
# existente maior do que pode ser enviado INTEGRALMENTE ao modelo ->
# fail-closed (zero chamada, zero patch) — nunca corta/trunca.
# ---------------------------------------------------------------------------

def test_oversized_allowed_file_blocks_before_any_call() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho_grande = os.path.join(tmp, "grande.html")
        with open(caminho_grande, "w", encoding="utf-8") as fh:
            fh.write("x" * (MAX_FILE_CHARS_SENT + 1))

        transporte = _CountingTransport(response=_resposta_ok([{"path": "grande.html", "content": "y"}]))
        outcome = gerar_patch_via_claude(
            _task(allowed_files=("grande.html",)), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "blocked"
        assert transporte.calls == 0, "arquivo grande demais — nenhuma chamada podia ter sido feita"
        assert outcome.patch is None
        assert "grande.html" in outcome.reason
    print("OK  test_oversized_allowed_file_blocks_before_any_call")


def test_file_exactly_at_limit_is_not_blocked() -> None:
    """Prova positiva: um arquivo cujo tamanho é EXATAMENTE o limite (não
    maior) não é bloqueado pela correção B2-C — só quem excede o limite."""
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "greeting.txt")
        with open(caminho, "w", encoding="utf-8") as fh:
            fh.write("x" * MAX_FILE_CHARS_SENT)

        transporte = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "ok"
        assert transporte.calls == 1
    print("OK  test_file_exactly_at_limit_is_not_blocked")


def test_oversized_file_outside_allowed_files_does_not_block() -> None:
    """Contexto mínimo (invariante 3, inalterada): um arquivo grande que
    NÃO está em allowed_files nunca é lido/considerado — só os próprios
    allowed_files entram na checagem de tamanho."""
    with tempfile.TemporaryDirectory() as tmp:
        with open(os.path.join(tmp, "grande_mas_nao_permitido.html"), "w", encoding="utf-8") as fh:
            fh.write("x" * (MAX_FILE_CHARS_SENT + 1))

        transporte = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome = gerar_patch_via_claude(
            _task(allowed_files=("greeting.txt",)), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "ok"
        assert transporte.calls == 1
    print("OK  test_oversized_file_outside_allowed_files_does_not_block")


# ---------------------------------------------------------------------------
# Resposta parcial/malformada = FAILED/BLOCKED, nunca um patch parcial.
# ---------------------------------------------------------------------------

def test_malformed_json_response_fails_without_patch() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        ledger_path = os.path.join(tmp, "ledger.json")
        transporte = _CountingTransport(response=TransportResponse(text="isto não é JSON", input_tokens=5, output_tokens=5))
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(ledger_path), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "failed"
        assert outcome.patch is None
        # a chamada aconteceu e custou — isso é registrado mesmo que o
        # CONTEÚDO devolvido tenha sido rejeitado depois.
        assert len(UsageLedger(ledger_path).all_records()) == 1
    print("OK  test_malformed_json_response_fails_without_patch")


def test_empty_files_response_fails_without_patch() -> None:
    """O prompt instrui o modelo a devolver {"files": []} quando não for
    seguro cumprir a instrução — StructuredPatch rejeita patch vazio na
    própria construção, então isto precisa terminar em FAILED, nunca
    aplicado como 'nada para fazer'."""
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(response=_resposta_ok([]))
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "failed"
        assert outcome.patch is None
    print("OK  test_empty_files_response_fails_without_patch")


def test_response_outside_allowed_files_is_blocked_without_patch() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(response=_resposta_ok([{"path": "outro.txt", "content": "não devia entrar"}]))
        outcome = gerar_patch_via_claude(
            _task(allowed_files=("greeting.txt",)), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "blocked"
        assert outcome.patch is None
        assert "outro.txt" in outcome.reason
    print("OK  test_response_outside_allowed_files_is_blocked_without_patch")


def test_non_dict_json_response_fails_without_patch() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(response=TransportResponse(text="[1, 2, 3]", input_tokens=5, output_tokens=5))
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "failed"
        assert outcome.patch is None
    print("OK  test_non_dict_json_response_fails_without_patch")


# ---------------------------------------------------------------------------
# Contexto mínimo — só instructions + conteúdo dos próprios allowed_files.
# ---------------------------------------------------------------------------

def test_prompt_contains_only_instructions_and_allowed_file_contents() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        with open(os.path.join(tmp, "greeting.txt"), "w", encoding="utf-8") as fh:
            fh.write("conteúdo atual de greeting.txt\n")
        # Um arquivo FORA de allowed_files, no mesmo repo_dir — nunca pode
        # aparecer no prompt (contexto mínimo, nunca o repositório inteiro).
        with open(os.path.join(tmp, "segredo.txt"), "w", encoding="utf-8") as fh:
            fh.write("isto nunca deveria ir para o prompt\n")

        task = _task(instructions="Instrução bem específica de teste XYZ123.")
        prompt = build_prompt(task, {"greeting.txt": "conteúdo atual de greeting.txt\n"})
        assert "Instrução bem específica de teste XYZ123." in prompt
        assert "greeting.txt" in prompt
        assert "conteúdo atual de greeting.txt" in prompt
        assert "segredo.txt" not in prompt
        assert "isto nunca deveria ir para o prompt" not in prompt
    print("OK  test_prompt_contains_only_instructions_and_allowed_file_contents")


def main() -> int:
    testes = [
        test_gate_closed_makes_zero_external_call,
        test_task_id_outside_canary_makes_zero_external_call,
        test_budget_exhausted_makes_zero_external_call,
        test_valid_response_returns_patch_and_records_usage,
        test_no_automatic_retry_on_transport_error,
        test_usage_persists_across_independent_git_usage_ledger_instances,
        test_budget_cap_enforced_via_persistent_ledger_across_fresh_instances,
        test_oversized_allowed_file_blocks_before_any_call,
        test_file_exactly_at_limit_is_not_blocked,
        test_oversized_file_outside_allowed_files_does_not_block,
        test_malformed_json_response_fails_without_patch,
        test_empty_files_response_fails_without_patch,
        test_response_outside_allowed_files_is_blocked_without_patch,
        test_non_dict_json_response_fails_without_patch,
        test_prompt_contains_only_instructions_and_allowed_file_contents,
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
