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
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator.anthropic_client import Request, TransportResponse
from coordinator.budget import UsageLedger
from coordinator.classify import Priority
from coordinator.runner_contract import RunnerTask
from coordinator.runner_dispatch import RunnerDispatchConfig
from coordinator.runner_generate import build_prompt, gerar_patch_via_claude


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
