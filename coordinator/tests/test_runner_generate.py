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

Registrado em ``coordinator/tests/run_all.py`` a partir da Fase G da
Issue #105 (antes disto rodava só standalone, o que deixava a allowlist
``coordinator-suite`` — a única validação que o próprio canário executa
antes de comitar — cega para o mecanismo do canário). Continua rodando
standalone via ``python3 -m coordinator.tests.test_runner_generate``.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile

import threading

from . import _pathsetup  # noqa: F401
from coordinator.anthropic_client import Request, TransportResponse
from coordinator.budget import UsageLedger
from coordinator.classify import Priority
from coordinator.git_state import GitJsonStore, GitUsageLedger
from coordinator.runner_contract import RunnerTask
from coordinator.runner_dispatch import RunnerDispatchConfig
from coordinator.runner_generate import (
    MAX_FILE_CHARS_SENT,
    _SYSTEM_PROMPT,
    _conservative_call_cost_usd,
    build_prompt,
    gerar_patch_via_claude,
)


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
        # Achado F8-C: 3 registros por chamada bem-sucedida — reserva
        # conservadora (ANTES da chamada), correção (para o custo real) e
        # o registro informativo de uso (mesmo padrão do OpenAI Auditor).
        registros = ledger.all_records()
        assert len(registros) == 3, f"reserva + correção + uso precisam estar todos registrados: {registros}"
        kinds = sorted(r["kind"] for r in registros)
        assert kinds == ["correction", "reservation", "usage"], kinds
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
        # Achado F8-C: reserva + correção + uso, os 3 persistidos no MESMO
        # remoto/branch — visíveis numa instância totalmente nova.
        assert len(ledger_execucao_2.all_records()) == 3
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
        # CONTEÚDO devolvido tenha sido rejeitado depois. Achado F8-C: 3
        # registros (reserva + correção + uso), igual a uma resposta válida
        # — o ledger não sabe/não precisa saber se o CONTEÚDO foi aceito.
        assert len(UsageLedger(ledger_path).all_records()) == 3
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


# ---------------------------------------------------------------------------
# Achado F8-C (Issue #105, Fase F, 7ª rodada): reserva conservadora ATÔMICA
# — hard cap real, checado e gravado ANTES de qualquer chamada, nunca mais
# "check_budget -> chamada -> append" (janela de corrida real).
# ---------------------------------------------------------------------------

def test_reservation_that_does_not_fit_blocks_with_zero_call_even_when_priority_check_would_allow() -> None:
    """Distingue a reserva ATÔMICA (F8-C) da checagem graduada antiga
    (check_budget/priority_allowed, que continua rodando cedo, mas não é
    mais a barreira definitiva): um orçamento positivo, mas menor que o
    teto CONSERVADOR desta chamada específica, precisa bloquear — mesmo
    que check_budget visse isso como 'dentro do orçamento' (razão ~0%,
    já que budget_usd > 0)."""
    with tempfile.TemporaryDirectory() as tmp:
        ledger_path = os.path.join(tmp, "ledger.json")
        transporte = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        # Orçamento positivo (nunca dispara o "stop" de check_budget, que só
        # aciona com budget_usd<=0 -> razão 1.0), mas ínfimo perto do custo
        # conservador real (bytes do prompt inteiro + tokens de saída).
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(ledger_path), budget_usd=0.0000001,
            transport=transporte,
        )
        assert outcome.status == "blocked"
        assert transporte.calls == 0, "reserva não coube — zero chamada, mesmo com o portão de prioridade aberto"
        assert outcome.external_call_made is False
        assert len(UsageLedger(ledger_path).all_records()) == 0, "reserva recusada nunca grava nada"
    print("OK  test_reservation_that_does_not_fit_blocks_with_zero_call_even_when_priority_check_would_allow")


def test_transport_error_keeps_the_conservative_reservation() -> None:
    """Achado F8-C ('erro de transporte mantém a reserva conservadora'):
    depois de uma falha de transporte, o ledger continua com a reserva
    CONSERVADORA contada (nunca liberada/corrigida) — não é possível
    confirmar que zero tokens foram consumidos antes da falha."""
    with tempfile.TemporaryDirectory() as tmp:
        ledger_path = os.path.join(tmp, "ledger.json")
        ledger = UsageLedger(ledger_path)
        transporte = _CountingTransport(raise_error=True)
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp, usage_ledger=ledger, budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "failed"
        assert transporte.calls == 1
        registros = UsageLedger(ledger_path).all_records()
        assert len(registros) == 1, f"só a reserva precisa permanecer — nunca corrigida/liberada: {registros}"
        assert registros[0]["kind"] == "reservation"
        assert registros[0]["estimated_cost_usd"] > 0.0
    print("OK  test_transport_error_keeps_the_conservative_reservation")


def test_ledger_correction_failure_is_surfaced_explicitly_never_silent() -> None:
    """Achado F8-C: falha ao persistir a correção/uso depois de uma
    chamada bem-sucedida precisa aparecer em
    ``GenerateOutcome.ledger_correction_failed`` — nunca um `except
    Exception: pass` silencioso. O patch já gerado/validado continua
    ``status='ok'`` (a falha é só de contabilidade, não desfaz a
    chamada paga nem o patch)."""
    class _LedgerQuebradoDepoisDaReserva:
        """Reserva funciona (delega para um UsageLedger real); qualquer
        append() posterior (correction/usage) falha."""

        def __init__(self, ledger_path: str) -> None:
            self._real = UsageLedger(ledger_path)
            self._reservas_feitas = 0

        def reserve_if_within_budget(self, candidate, *, budget_usd, now=None):
            self._reservas_feitas += 1
            return self._real.reserve_if_within_budget(candidate, budget_usd=budget_usd, now=now)

        def append(self, record):
            raise RuntimeError("simulado: falha ao persistir depois da reserva")

        def month_to_date_usd(self, *, now=None):
            return self._real.month_to_date_usd(now=now)

    with tempfile.TemporaryDirectory() as tmp:
        ledger_quebrado = _LedgerQuebradoDepoisDaReserva(os.path.join(tmp, "ledger.json"))
        transporte = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp, usage_ledger=ledger_quebrado, budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "ok", "falha de contabilidade nunca desfaz um patch já gerado/validado"
        assert outcome.patch is not None
        assert outcome.ledger_correction_failed is True
        assert "ledger" in outcome.reason.lower() or "persist" in outcome.reason.lower()
        assert ledger_quebrado._reservas_feitas == 1
    print("OK  test_ledger_correction_failure_is_surfaced_explicitly_never_silent")


def test_concorrencia_perto_do_teto_so_uma_reserva_vence() -> None:
    """Teste concorrente OBRIGATÓRIO (F8-C, auditoria independente): saldo
    próximo do teto + duas execuções concorrentes -> no máximo UMA
    reserva/chamada paga vence. Mesma técnica de
    ``test_worker_ops.py::test_marcar_available_condicional_concorrente_
    so_uma_vence`` (threading.Barrier real, nunca mockado) — o lock de
    ``UsageLedger`` cobre a concorrência DENTRO do processo; em produção
    o mesmo princípio vale via CAS git em ``GitUsageLedger``."""
    with tempfile.TemporaryDirectory() as tmp:
        ledger_path = os.path.join(tmp, "ledger.json")
        ledger = UsageLedger(ledger_path)

        tarefa = _task()
        prompt_estimado = build_prompt(tarefa, {})
        custo_unitario = _conservative_call_cost_usd(
            system=_SYSTEM_PROMPT, prompt=prompt_estimado, max_output_tokens=2000,
        )
        # "Saldo próximo do teto": orçamento cabe UMA reserva confortavelmente,
        # mas não cabe DUAS — a corrida real que F8-C fecha.
        orcamento = custo_unitario * 1.5

        transportes = [
            _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
            for _ in range(2)
        ]
        resultados: list[str] = []
        barreira = threading.Barrier(2)

        def tentar(indice: int) -> None:
            barreira.wait()
            outcome = gerar_patch_via_claude(
                tarefa, config=_config(), repo_dir=tmp, usage_ledger=ledger, budget_usd=orcamento,
                transport=transportes[indice],
            )
            resultados.append(outcome.status)

        threads = [threading.Thread(target=tentar, args=(i,)) for i in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        chamadas_reais = sum(t.calls for t in transportes)
        assert chamadas_reais == 1, f"no máximo UMA chamada paga pode vencer a corrida: {chamadas_reais}"
        assert sorted(resultados) == ["blocked", "ok"], resultados
    print("OK  test_concorrencia_perto_do_teto_so_uma_reserva_vence")


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
        test_reservation_that_does_not_fit_blocks_with_zero_call_even_when_priority_check_would_allow,
        test_transport_error_keeps_the_conservative_reservation,
        test_ledger_correction_failure_is_surfaced_explicitly_never_silent,
        test_concorrencia_perto_do_teto_so_uma_reserva_vence,
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
