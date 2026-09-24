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
from coordinator.merge_card import avaliar_lei_das_questoes
from coordinator.question_report import COVERAGE_CONFIRMATION
from coordinator.runner_contract import RunnerTask
from coordinator.runner_dispatch import RunnerDispatchConfig
from coordinator.runner_generate import (
    MAX_FILE_CHARS_SENT,
    _janelas_de_espelho,
    _secoes_referenciadas,
    extrair_trechos_ancorados,
    RUNNER_PATCH_MAX_OUTPUT_TOKENS,
    NO_CHANGE_REASON_PREFIX,
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
        # Issue #144: o PEDIDO exato que teria ido para a API — é o que
        # prova que um arquivo grande nunca foi enviado por inteiro.
        self.last_request: Request | None = None

    def send(self, request: Request) -> TransportResponse:
        self.calls += 1
        self.last_request = request
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


def _question_report() -> dict:
    return {
        "sources": [{
            "source": "P1 Semiologia 2.pdf",
            "page_or_image": "p. 3",
            "legibility": "integral",
            "detected": 3,
            "used": 2,
            "new": 1,
            "reformulated": 1,
            "duplicates": 0,
            "reconstructed": 0,
            "pending": 1,
            "site_destination": "B08 + Banco General",
        }],
        "coverage_confirmation": COVERAGE_CONFIRMATION,
        "notes": "Uma questão ficou pendente por legibilidade insuficiente.",
    }


def _resposta_ok(files: list[dict], *, question_report: dict | None = None) -> TransportResponse:
    body: dict = {"files": files}
    if question_report is not None:
        body["question_report"] = question_report
    return TransportResponse(text=json.dumps(body), input_tokens=100, output_tokens=50)


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


def test_question_report_required_missing_fails_before_patch() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(
            response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}])
        )
        outcome = gerar_patch_via_claude(
            _task(question_report_required=True), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert transporte.calls == 1
        assert outcome.status == "failed"
        assert outcome.patch is None
        assert "Lei das Questões 8-A.11" in outcome.reason
        assert not os.path.exists(os.path.join(tmp, "greeting.txt")), (
            "geração nunca escreve; relatório ausente não pode chegar ao executor"
        )
    print("OK  test_question_report_required_missing_fails_before_patch")


def test_question_report_valid_is_rendered_and_satisfies_deterministic_gate() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(
            response=_resposta_ok(
                [{"path": "greeting.txt", "content": "ola\n"}],
                question_report=_question_report(),
            )
        )
        outcome = gerar_patch_via_claude(
            _task(question_report_required=True), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "ok", outcome.reason
        assert outcome.patch is not None
        assert outcome.question_report is not None
        gate = avaliar_lei_das_questoes(outcome.question_report)
        assert gate.satisfeita is True, gate
        assert "Matriz por fonte" in outcome.question_report
        assert COVERAGE_CONFIRMATION in outcome.question_report
        assert "question_report" in transporte.last_request.system
    print("OK  test_question_report_valid_is_rendered_and_satisfies_deterministic_gate")


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


def test_runner_patch_request_tem_teto_proprio_maior_que_coordinator() -> None:
    """Regressão do run real #65 / Issue #154: o patch bateu exatamente
    no teto global antigo de 2.000 tokens e o JSON chegou truncado."""
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(
            response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}])
        )
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")),
            budget_usd=20.0, transport=transporte,
        )
        assert outcome.status == "ok"
        assert transporte.last_request is not None
        assert transporte.last_request.max_output_tokens == RUNNER_PATCH_MAX_OUTPUT_TOKENS
        assert RUNNER_PATCH_MAX_OUTPUT_TOKENS > 2_000
    print("OK  test_runner_patch_request_tem_teto_proprio_maior_que_coordinator")


def test_json_invalido_no_teto_reporta_truncamento_explicitamente() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(
            response=TransportResponse(
                text='{"files":[{"path":"greeting.txt","content":"cortado',
                input_tokens=10,
                output_tokens=RUNNER_PATCH_MAX_OUTPUT_TOKENS,
            )
        )
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")),
            budget_usd=20.0, transport=transporte,
        )
        assert outcome.status == "failed"
        assert outcome.patch is None
        assert "truncada" in outcome.reason.lower()
        assert str(RUNNER_PATCH_MAX_OUTPUT_TOKENS) in outcome.reason
    print("OK  test_json_invalido_no_teto_reporta_truncamento_explicitamente")


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

def test_arquivo_grande_sem_contexto_confiavel_bloqueia_sem_chamada() -> None:
    """Issue #144: um arquivo grande deixou de bloquear PELO TAMANHO, mas
    continua bloqueando quando não é possível localizar contexto
    confiável nele para a instrução da tarefa (aqui: um arquivo sem
    nenhuma estrutura e sem nenhum termo da instrução). Fail-closed: o
    Runner nunca adivinha onde editar nem manda o arquivo inteiro."""
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
        assert transporte.calls == 0, "sem contexto confiável — nenhuma chamada podia ter sido feita"
        assert outcome.patch is None
        assert "grande.html" in outcome.reason
    print("OK  test_arquivo_grande_sem_contexto_confiavel_bloqueia_sem_chamada")


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


def test_empty_files_response_is_blocked_with_explicit_no_change_reason() -> None:
    """Resposta vazia não é mais uma falha opaca de "patch vazio": vira
    BLOCKED, zero escrita, com motivo que começa pelo prefixo estável —
    e diz que o modelo não justificou quando ele não justificou."""
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(response=_resposta_ok([]))
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "blocked"
        assert outcome.patch is None
        assert outcome.external_call_made is True
        assert outcome.reason.startswith(NO_CHANGE_REASON_PREFIX)
        assert "não informou motivo" in outcome.reason
    print("OK  test_empty_files_response_is_blocked_with_explicit_no_change_reason")


def test_no_change_reason_do_modelo_chega_ao_motivo() -> None:
    corpo = {"files": [], "edits": [], "no_change_reason": "A regra oral/nasal já está no Bloque 01."}
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(
            response=TransportResponse(text=json.dumps(corpo), input_tokens=10, output_tokens=10)
        )
        outcome = gerar_patch_via_claude(
            _task(), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "blocked"
        assert outcome.patch is None
        assert outcome.reason.startswith(NO_CHANGE_REASON_PREFIX)
        assert "oral/nasal já está no Bloque 01" in outcome.reason
    print("OK  test_no_change_reason_do_modelo_chega_ao_motivo")


def test_json_dentro_de_uma_cerca_markdown_e_aceito_e_nada_mais() -> None:
    corpo = json.dumps({"files": [{"path": "greeting.txt", "content": "olá\n"}]})
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(
            response=TransportResponse(text=f"```json\n{corpo}\n```", input_tokens=10, output_tokens=10)
        )
        outcome = gerar_patch_via_claude(
            _task(allowed_files=("greeting.txt",)), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "ok", outcome.reason
        assert outcome.patch is not None and outcome.patch.files[0].content == "olá\n"
    with tempfile.TemporaryDirectory() as tmp:
        transporte = _CountingTransport(
            response=TransportResponse(text=f"Aqui está:\n```json\n{corpo}\n```", input_tokens=10, output_tokens=10)
        )
        outcome = gerar_patch_via_claude(
            _task(allowed_files=("greeting.txt",)), config=_config(), repo_dir=tmp,
            usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
            transport=transporte,
        )
        assert outcome.status == "failed"
        assert outcome.patch is None
    print("OK  test_json_dentro_de_uma_cerca_markdown_e_aceito_e_nada_mais")


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
    """Saldo próximo do teto + DUAS tentativas simultâneas: enquanto a
    primeira chamada ainda está em voo e sua reserva conservadora continua
    ocupando o orçamento, a segunda precisa ser bloqueada ANTES do transporte.

    A versão anterior era flaky: o transporte falso retornava instantaneamente,
    a primeira execução corrigia a reserva para o custo real e só depois a
    segunda thread às vezes chegava ao ledger — nesse cenário as chamadas eram
    sequenciais e ambas podiam caber legitimamente. Aqui a primeira chamada é
    mantida aberta até a outra tentativa terminar a decisão de reserva.
    """
    with tempfile.TemporaryDirectory() as tmp:
        ledger_path = os.path.join(tmp, "ledger.json")
        ledger = UsageLedger(ledger_path)

        tarefa = _task()
        prompt_estimado = build_prompt(tarefa, {})
        custo_unitario = _conservative_call_cost_usd(
            system=_SYSTEM_PROMPT, prompt=prompt_estimado,
            max_output_tokens=RUNNER_PATCH_MAX_OUTPUT_TOKENS,
        )
        orcamento = custo_unitario * 1.5

        primeira_entrou = threading.Event()
        uma_tentativa_finalizou = threading.Event()
        liberar_primeira = threading.Event()
        lock_primeiro = threading.Lock()
        houve_primeira = {"valor": False}

        class _TransportQueSeguraPrimeira(_CountingTransport):
            def send(self, request: Request) -> TransportResponse:
                self.calls += 1
                self.last_request = request
                with lock_primeiro:
                    sou_primeira = not houve_primeira["valor"]
                    if sou_primeira:
                        houve_primeira["valor"] = True
                if sou_primeira:
                    primeira_entrou.set()
                    assert liberar_primeira.wait(timeout=5), "a primeira chamada não foi liberada pelo teste"
                return self.response

        transportes = [
            _TransportQueSeguraPrimeira(
                response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}])
            )
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
            uma_tentativa_finalizou.set()

        threads = [threading.Thread(target=tentar, args=(i,)) for i in range(2)]
        for t in threads:
            t.start()

        assert primeira_entrou.wait(timeout=5), "nenhuma chamada chegou ao transporte"
        # A primeira está deliberadamente presa dentro do transporte. Logo,
        # quem consegue finalizar agora só pode ser a segunda tentativa:
        # ela deve ter recebido BLOCKED na reserva, sem chamada paga.
        assert uma_tentativa_finalizou.wait(timeout=5), "a segunda tentativa não concluiu a reserva"
        liberar_primeira.set()

        for t in threads:
            t.join(timeout=5)
            assert not t.is_alive(), "thread de teste ficou presa"

        chamadas_reais = sum(t.calls for t in transportes)
        assert chamadas_reais == 1, f"no máximo UMA chamada simultânea pode vencer a corrida: {chamadas_reais}"
        assert sorted(resultados) == ["blocked", "ok"], resultados
    print("OK  test_concorrencia_perto_do_teto_so_uma_reserva_vence")

# ---------------------------------------------------------------------------
# Issue #144 — edição segura por trecho/âncora em arquivo grande.
#
# Mesma técnica do resto do arquivo: transporte FALSO, nunca rede de
# verdade. O que estes testes provam, nesta ordem: arquivo pequeno continua
# no contrato FileWrite de sempre; arquivo grande deixa de bloquear pelo
# tamanho; o arquivo grande NUNCA vai inteiro para o prompt; âncora
# inexistente/duplicada/fora de allowed_files bloqueia; duas edições
# válidas no mesmo arquivo são atômicas; e uma edição inválida entre
# várias produz ZERO escrita.
# ---------------------------------------------------------------------------

_INSTRUCAO_GRANDE = 'Revisar a definição de "cianose central" no bloco de semiologia da matéria.'
_MARCADOR_DISTANTE = "MARCADOR-DISTANTE-NUNCA-NO-PROMPT-9Z"
_ANCORA = "<p>A cianose central aparece quando a saturação cai abaixo do limiar.</p>"
_ANCORA_NOVA = "<p>A cianose central aparece quando a hemoglobina reduzida ultrapassa 5 g/dL.</p>"
_SEGUNDA_ANCORA = '<h3 id="semiologia-cianose-perif">Cianose periférica</h3>'
_SEGUNDA_ANCORA_NOVA = '<h3 id="semiologia-cianose-perif">Cianose periférica (vasoconstrição)</h3>'


def _html_grande(*, ancora_repetida: bool = False) -> str:
    """HTML acima de MAX_FILE_CHARS_SENT, com estrutura real (headings e
    ids) e um marcador no fim que nenhuma janela de contexto deve
    alcançar."""
    enchimento = "<p>Parágrafo de enchimento sem nenhuma relação com esta tarefa.</p>\n" * 200
    bloco = (
        '<section id="semiologia">\n'
        '<h2 id="semiologia-cianose">Cianose central</h2>\n'
        f"{_ANCORA}\n"
        f"{_SEGUNDA_ANCORA}\n"
        "<p>Ocorre por extração periférica aumentada.</p>\n"
        "</section>\n"
    )
    repetida = f"{_ANCORA}\n" if ancora_repetida else ""
    html = (
        "<html><body>\n" + enchimento + bloco + repetida + enchimento
        + f"<!-- {_MARCADOR_DISTANTE} -->\n</body></html>\n"
    )
    assert len(html) > MAX_FILE_CHARS_SENT, len(html)
    return html


def _escrever_html_grande(tmp: str, *, ancora_repetida: bool = False) -> str:
    conteudo = _html_grande(ancora_repetida=ancora_repetida)
    with open(os.path.join(tmp, "materia.html"), "w", encoding="utf-8") as fh:
        fh.write(conteudo)
    return conteudo


def _resposta_edits(edits: list[dict], files: list[dict] | None = None) -> TransportResponse:
    corpo: dict = {"edits": edits}
    if files is not None:
        corpo["files"] = files
    return TransportResponse(text=json.dumps(corpo), input_tokens=100, output_tokens=50)


def _task_grande(**overrides) -> RunnerTask:
    campos = dict(allowed_files=("materia.html",), instructions=_INSTRUCAO_GRANDE)
    campos.update(overrides)
    return _task(**campos)


def _gerar(tmp: str, transporte: _CountingTransport, task: RunnerTask | None = None):
    return gerar_patch_via_claude(
        task if task is not None else _task_grande(), config=_config(), repo_dir=tmp,
        usage_ledger=UsageLedger(os.path.join(tmp, "ledger.json")), budget_usd=20.0,
        transport=transporte,
    )


def test_arquivo_pequeno_continua_no_contrato_filewrite() -> None:
    """Compatibilidade (requisito 8): sem nenhum arquivo grande, o
    contrato enviado ao modelo continua sendo exatamente o de antes —
    FileWrite com conteúdo completo, sem uma palavra sobre AnchoredEdit."""
    with tempfile.TemporaryDirectory() as tmp:
        with open(os.path.join(tmp, "greeting.txt"), "w", encoding="utf-8") as fh:
            fh.write("conteúdo pequeno\n")

        transporte = _CountingTransport(response=_resposta_ok([{"path": "greeting.txt", "content": "ola\n"}]))
        outcome = _gerar(tmp, transporte, _task())
        assert outcome.status == "ok", outcome.reason
        assert transporte.last_request.system == _SYSTEM_PROMPT
        assert "AnchoredEdit" not in transporte.last_request.system
        assert "ARQUIVO GRANDE" not in transporte.last_request.prompt
        assert outcome.patch.files[0].content == "ola\n"
    print("OK  test_arquivo_pequeno_continua_no_contrato_filewrite")


def test_arquivo_grande_nao_e_bloqueado_so_pelo_tamanho_e_aplica_anchored_edit() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        original = _escrever_html_grande(tmp)
        transporte = _CountingTransport(
            response=_resposta_edits([{"path": "materia.html", "old_text": _ANCORA, "new_text": _ANCORA_NOVA}])
        )
        outcome = _gerar(tmp, transporte)

        assert outcome.status == "ok", outcome.reason
        assert transporte.calls == 1, "arquivo grande com contexto confiável precisa chegar à chamada"
        assert len(outcome.patch.files) == 1
        escrita = outcome.patch.files[0]
        assert escrita.path == "materia.html"
        assert escrita.content == original.replace(_ANCORA, _ANCORA_NOVA)
        # O conteúdo final é o arquivo INTEIRO com a troca — nunca uma fatia.
        assert _MARCADOR_DISTANTE in escrita.content
        assert len(escrita.content) > MAX_FILE_CHARS_SENT
    print("OK  test_arquivo_grande_nao_e_bloqueado_so_pelo_tamanho_e_aplica_anchored_edit")


def test_arquivo_grande_nunca_e_enviado_integralmente_ao_prompt() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        original = _escrever_html_grande(tmp)
        transporte = _CountingTransport(
            response=_resposta_edits([{"path": "materia.html", "old_text": _ANCORA, "new_text": _ANCORA_NOVA}])
        )
        outcome = _gerar(tmp, transporte)
        assert outcome.status == "ok", outcome.reason

        prompt = transporte.last_request.prompt
        assert original not in prompt, "o arquivo grande nunca pode ir inteiro no prompt"
        assert _MARCADOR_DISTANTE not in prompt, "trecho distante da tarefa nunca deveria ser enviado"
        assert len(prompt) < len(original), (len(prompt), len(original))
        # O trecho que ANCORA a edição precisa ter sido enviado literalmente.
        assert _ANCORA in prompt
        assert "ARQUIVO GRANDE" in prompt and "AnchoredEdit" in prompt
        assert "AnchoredEdit" in transporte.last_request.system
    print("OK  test_arquivo_grande_nunca_e_enviado_integralmente_ao_prompt")


def test_anchored_edit_com_old_text_inexistente_bloqueia() -> None:
    """Arquivo pequeno de propósito: sem trechos no caminho, isola a
    regra "0 ocorrência bloqueia". Num arquivo GRANDE uma âncora
    inexistente também não está em nenhum trecho enviado, então quem
    dispara primeiro é a checagem de contenção — coberta pelo teste
    ``..._fora_dos_trechos_enviados_bloqueia``."""
    with tempfile.TemporaryDirectory() as tmp:
        original = "<p>conteúdo pequeno de verdade</p>\n"
        with open(os.path.join(tmp, "greeting.txt"), "w", encoding="utf-8") as fh:
            fh.write(original)

        transporte = _CountingTransport(
            response=_resposta_edits([
                {"path": "greeting.txt", "old_text": "<p>âncora que nunca existiu no arquivo</p>",
                 "new_text": "<p>x</p>"},
            ])
        )
        outcome = _gerar(tmp, transporte, _task())
        assert outcome.status == "blocked", outcome.reason
        assert outcome.patch is None
        assert "não existe no conteúdo atual" in outcome.reason
        with open(os.path.join(tmp, "greeting.txt"), encoding="utf-8") as fh:
            assert fh.read() == original
    print("OK  test_anchored_edit_com_old_text_inexistente_bloqueia")


def test_anchored_edit_com_old_text_duplicado_bloqueia() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _escrever_html_grande(tmp, ancora_repetida=True)
        transporte = _CountingTransport(
            response=_resposta_edits([{"path": "materia.html", "old_text": _ANCORA, "new_text": _ANCORA_NOVA}])
        )
        outcome = _gerar(tmp, transporte)
        assert outcome.status == "blocked", outcome.reason
        assert outcome.patch is None
        assert "ambígua" in outcome.reason
    print("OK  test_anchored_edit_com_old_text_duplicado_bloqueia")


def test_anchored_edit_fora_de_allowed_files_bloqueia() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _escrever_html_grande(tmp)
        transporte = _CountingTransport(
            response=_resposta_edits([{"path": "outra.html", "old_text": _ANCORA, "new_text": _ANCORA_NOVA}])
        )
        outcome = _gerar(tmp, transporte)
        assert outcome.status == "blocked", outcome.reason
        assert outcome.patch is None
        assert "outra.html" in outcome.reason
    print("OK  test_anchored_edit_fora_de_allowed_files_bloqueia")


def test_duas_anchored_edits_no_mesmo_arquivo_aplicam_atomicamente() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        original = _escrever_html_grande(tmp)
        transporte = _CountingTransport(
            response=_resposta_edits([
                {"path": "materia.html", "old_text": _ANCORA, "new_text": _ANCORA_NOVA},
                {"path": "materia.html", "old_text": _SEGUNDA_ANCORA, "new_text": _SEGUNDA_ANCORA_NOVA},
            ])
        )
        outcome = _gerar(tmp, transporte)
        assert outcome.status == "ok", outcome.reason
        assert len(outcome.patch.files) == 1, "as duas edições precisam virar UM arquivo final"
        esperado = original.replace(_ANCORA, _ANCORA_NOVA).replace(_SEGUNDA_ANCORA, _SEGUNDA_ANCORA_NOVA)
        assert outcome.patch.files[0].content == esperado
    print("OK  test_duas_anchored_edits_no_mesmo_arquivo_aplicam_atomicamente")


def test_uma_anchored_edit_invalida_entre_varias_produz_zero_escrita() -> None:
    """A edição válida vem PRIMEIRO e a inválida depois: mesmo assim nada
    é produzido — nenhum FileWrite sequer chega a existir, então
    ``aplicar_patch`` nunca tem o que gravar."""
    with tempfile.TemporaryDirectory() as tmp:
        original = _escrever_html_grande(tmp)
        transporte = _CountingTransport(
            response=_resposta_edits([
                {"path": "materia.html", "old_text": _ANCORA, "new_text": _ANCORA_NOVA},
                {"path": "materia.html", "old_text": "<p>âncora inexistente</p>", "new_text": "<p>x</p>"},
            ])
        )
        outcome = _gerar(tmp, transporte)
        assert outcome.status == "blocked", outcome.reason
        assert outcome.patch is None, "uma edição inválida entre várias = ZERO escrita"
        with open(os.path.join(tmp, "materia.html"), encoding="utf-8") as fh:
            assert fh.read() == original, "o arquivo em disco nunca pode ter sido tocado"
    print("OK  test_uma_anchored_edit_invalida_entre_varias_produz_zero_escrita")


def test_filewrite_em_arquivo_grande_e_recusado_para_nunca_truncar() -> None:
    """A garantia anti-truncamento do B2-C, preservada: o modelo só viu
    trechos, então um 'conteúdo completo' vindo dele seria o arquivo
    truncado — recusado sempre."""
    with tempfile.TemporaryDirectory() as tmp:
        original = _escrever_html_grande(tmp)
        transporte = _CountingTransport(
            response=_resposta_ok([{"path": "materia.html", "content": "<html>versão curta</html>"}])
        )
        outcome = _gerar(tmp, transporte)
        assert outcome.status == "blocked", outcome.reason
        assert outcome.patch is None
        assert "materia.html" in outcome.reason
        with open(os.path.join(tmp, "materia.html"), encoding="utf-8") as fh:
            assert fh.read() == original
    print("OK  test_filewrite_em_arquivo_grande_e_recusado_para_nunca_truncar")


# ---------------------------------------------------------------------------
# Auditoria independente do HEAD 6bcce53 — dois gaps de fail-closed.
# ---------------------------------------------------------------------------

def test_anchored_edit_fora_dos_trechos_enviados_bloqueia() -> None:
    """Achado 1: uma âncora ÚNICA no arquivo, mas numa região que nunca
    foi enviada ao modelo, editaria uma parte que ele não leu. A
    unicidade sozinha não basta — a âncora precisa estar contida num dos
    trechos efetivamente enviados."""
    with tempfile.TemporaryDirectory() as tmp:
        original = _escrever_html_grande(tmp)
        ancora_distante = f"<!-- {_MARCADOR_DISTANTE} -->"
        assert original.count(ancora_distante) == 1, "a âncora do teste precisa ser única no arquivo"

        transporte = _CountingTransport(
            response=_resposta_edits([
                {"path": "materia.html", "old_text": ancora_distante, "new_text": "<!-- trocado -->"},
            ])
        )
        outcome = _gerar(tmp, transporte)
        assert ancora_distante not in transporte.last_request.prompt, "premissa: o trecho não foi enviado"
        assert outcome.status == "blocked", outcome.reason
        assert outcome.patch is None
        assert "não está contido em nenhum dos trechos" in outcome.reason
        with open(os.path.join(tmp, "materia.html"), encoding="utf-8") as fh:
            assert fh.read() == original
    print("OK  test_anchored_edit_fora_dos_trechos_enviados_bloqueia")


def test_anchored_edit_com_ocorrencia_sobreposta_bloqueia() -> None:
    """Achado 2: ``str.count`` conta só ocorrências NÃO sobrepostas
    ('aaa'.count('aa') == 1), então uma âncora genuinamente ambígua
    passaria pela regra 'exatamente uma ocorrência'. Arquivo pequeno de
    propósito: isola a contagem, sem a checagem de trechos no caminho."""
    with tempfile.TemporaryDirectory() as tmp:
        original = "<p>zzzz</p>\n"
        with open(os.path.join(tmp, "greeting.txt"), "w", encoding="utf-8") as fh:
            fh.write(original)
        assert original.count("zzz") == 1, "premissa do achado: str.count enxerga só uma"

        transporte = _CountingTransport(
            response=_resposta_edits([{"path": "greeting.txt", "old_text": "zzz", "new_text": "y"}])
        )
        outcome = _gerar(tmp, transporte, _task())
        assert outcome.status == "blocked", outcome.reason
        assert outcome.patch is None
        assert "ambígua" in outcome.reason
        with open(os.path.join(tmp, "greeting.txt"), encoding="utf-8") as fh:
            assert fh.read() == original
    print("OK  test_anchored_edit_com_ocorrencia_sobreposta_bloqueia")


def test_bloco_referenciado_leva_as_copias_espelhadas_do_banco_geral() -> None:
    """Regressão da B08 PA r4/r5: a tarefa pede "alterar o B08 e a cópia
    correspondente no Banco General", mas só o B08 era enviado. As cópias
    literais da mesma V/F e do mesmo flashcard no banco geral/mazo geral
    ficavam fora do contexto, e o modelo devolvia patch vazio. Agora elas
    entram como trechos; itens de blocos NÃO referenciados continuam fora."""
    vf_b08 = ("La relación entre la presión arterial y el riesgo cardiovascular es continua; "
              "la PA elevada en consultorio es de PAS 120–139 mmHg y PAD 70–89 mmHg.")
    vf_b09 = "El eje eléctrico normal del QRS en el plano frontal va de −30° a +90° grados."
    item = lambda enunciado: (
        '<div class="quiz-item">\n<p class="quiz-question"><span class="quiz-tag basada">Basada</span>'
        f'<span class="quiz-tag mcq">V/F</span>{enunciado}</p>\n<div class="answer">V</div>\n</div>\n'
    )
    card = lambda frente, verso: (
        f'<div class="flashcard"><div class="fc-front"><b>{frente}</b></div>'
        f'<div class="fc-back">{verso}</div></div>\n'
    )
    relleno = "<p>" + ("texto de relleno sin relación. " * 400) + "</p>\n"
    conteudo = (
        '<section class="container" id="s2-b08">\n<h2>Bloque 08 · HTA</h2>\n' + relleno
        + item(vf_b08) + card("PA elevada (consultorio)", "PAS 120–139 y PAD 70–89 mmHg.") + "</section>\n"
        + '<section class="container" id="s2-b09">\n<h2>Bloque 09 · ECG</h2>\n' + relleno
        + item(vf_b09) + card("Eje normal del QRS", "−30° a +90°.") + "</section>\n"
        + relleno * 3
        + '<section class="container" id="s2-banco">\n' + item(vf_b08) + item(vf_b09) + "</section>\n"
        + relleno * 3
        + '<section class="container" id="s2-flashcards">\n'
        + card("PA elevada (consultorio)", "PAS 120-139 / PAD 70-89.") + card("Eje normal del QRS", "−30° a +90°.")
        + "</section>\n"
    )
    assert len(conteudo) > MAX_FILE_CHARS_SENT
    instr = ("Alterar SOMENTE a classificação de PA do B08 e sua cópia correspondente no "
             "Banco General, preservando IDs e gabarito.")
    trechos = extrair_trechos_ancorados(conteudo, instr)
    coberto = lambda pos: any(t.inicio <= pos < t.fim for t in trechos)

    banco = conteudo.index('id="s2-banco"')
    mazo = conteudo.index('id="s2-flashcards"')
    copia_vf_b08 = conteudo.index(vf_b08, banco)
    copia_card_b08 = conteudo.index("PA elevada (consultorio)", mazo)
    assert coberto(conteudo.index(vf_b08)), "o próprio B08 precisa estar no contexto"
    assert coberto(copia_vf_b08), "a cópia da V/F no Banco General precisa estar no contexto"
    assert coberto(copia_card_b08), "a cópia do flashcard no mazo geral precisa estar no contexto"
    # Escopo dos ESPELHOS: só cópias de itens do bloco referenciado. (Janelas
    # por palavra-chave, que já existiam, podem ainda cercar vizinhos.)
    espelhos = _janelas_de_espelho(conteudo, _secoes_referenciadas(conteudo, instr))
    dentro = lambda pos: any(a <= pos < b for a, b in espelhos)
    assert dentro(copia_vf_b08) and dentro(copia_card_b08)
    assert not dentro(conteudo.index(vf_b09, banco)), "item do B09 (não referenciado) não é espelho"
    assert not dentro(conteudo.index("Eje normal del QRS", mazo)), "flashcard do B09 não é espelho"
    for t in trechos:
        assert conteudo[t.inicio:t.fim] == t.texto, "todo trecho é cópia literal do arquivo"
    print("OK  test_bloco_referenciado_leva_as_copias_espelhadas_do_banco_geral")


def _conteudo_com_copia_literal() -> tuple[str, tuple]:
    from coordinator.runner_generate import TrechoAncorado

    vf = "<p>La PA elevada en consultorio es de PAS 120–139 mmHg y PAD 70–89 mmHg.</p>"
    conteudo = "<section id='s2-b08'>" + vf + "</section>" + ("x" * 500) + "<section id='s2-banco'>" + vf + "</section>"
    b08 = conteudo.index("<section id='s2-b08'>")
    banco = conteudo.index("<section id='s2-banco'>")
    fim_b08 = conteudo.index("</section>") + len("</section>")
    trechos = (
        TrechoAncorado(inicio=b08, fim=fim_b08, texto=conteudo[b08:fim_b08]),
        TrechoAncorado(inicio=banco, fim=len(conteudo), texto=conteudo[banco:]),
    )
    return conteudo, trechos


def test_copia_literal_sem_trecho_continua_ambigua_e_bloqueia() -> None:
    from coordinator.runner_generate import AnchoredEdit, resolver_anchored_edits

    conteudo, trechos = _conteudo_com_copia_literal()
    velho = "PAS 120–139 mmHg y PAD 70–89 mmHg"
    r = resolver_anchored_edits(
        (AnchoredEdit(path="materia.html", old_text=velho, new_text="X"),),
        task=_task(allowed_files=("materia.html",)), current_contents={"materia.html": conteudo},
        trechos_por_arquivo={"materia.html": trechos},
    )
    assert not r.ok and "mais de uma vez" in r.reason
    print("OK  test_copia_literal_sem_trecho_continua_ambigua_e_bloqueia")


def test_campo_trecho_desambigua_copia_literal_do_banco_geral() -> None:
    """Auditoria de 24/09/2026: a mesma V/F aparece literalmente no bloco e
    no Banco General. Com 'trecho', cada edição vale exatamente onde o
    modelo a leu — as duas cópias são alteradas, nada mais."""
    from coordinator.runner_generate import AnchoredEdit, resolver_anchored_edits

    conteudo, trechos = _conteudo_com_copia_literal()
    velho = "PAS 120–139 mmHg y PAD 70–89 mmHg"
    novo = "PAS 120–139 mmHg y PAD 70–89 mmHg (tabla usada en la prueba)"
    r = resolver_anchored_edits(
        (AnchoredEdit(path="materia.html", old_text=velho, new_text=novo, trecho=1),
         AnchoredEdit(path="materia.html", old_text=velho, new_text=novo, trecho=2)),
        task=_task(allowed_files=("materia.html",)), current_contents={"materia.html": conteudo},
        trechos_por_arquivo={"materia.html": trechos},
    )
    assert r.ok, r.reason
    final = r.files[0].content
    assert final.count(novo) == 2 and final == conteudo.replace(velho, novo)
    print("OK  test_campo_trecho_desambigua_copia_literal_do_banco_geral")


def test_campo_trecho_invalido_ou_ambiguo_bloqueia_sem_escrita() -> None:
    from coordinator.runner_generate import AnchoredEdit, anchored_edits_de_resposta, resolver_anchored_edits

    conteudo, trechos = _conteudo_com_copia_literal()
    ctx = dict(task=_task(allowed_files=("materia.html",)), current_contents={"materia.html": conteudo},
               trechos_por_arquivo={"materia.html": trechos})
    r = resolver_anchored_edits((AnchoredEdit(path="materia.html", old_text="PAS", new_text="Y", trecho=3),), **ctx)
    assert not r.ok and "não corresponde" in r.reason
    r = resolver_anchored_edits((AnchoredEdit(path="materia.html", old_text="0", new_text="Y", trecho=1),), **ctx)
    assert not r.ok and "exatamente 1" in r.reason, "0 aparece várias vezes no trecho 1"
    r = resolver_anchored_edits((AnchoredEdit(path="materia.html", old_text="xxxx", new_text="Y", trecho=1),), **ctx)
    assert not r.ok and "0 vez" in r.reason
    for ruim in (0, -1, "2", True):
        try:
            anchored_edits_de_resposta({"edits": [{"path": "materia.html", "old_text": "a", "new_text": "b", "trecho": ruim}]})
        except ValueError:
            continue
        raise AssertionError(f"trecho={ruim!r} devia ser recusado")
    print("OK  test_campo_trecho_invalido_ou_ambiguo_bloqueia_sem_escrita")


def main() -> int:
    testes = [
        test_question_report_required_missing_fails_before_patch,
        test_question_report_valid_is_rendered_and_satisfies_deterministic_gate,
        test_gate_closed_makes_zero_external_call,
        test_task_id_outside_canary_makes_zero_external_call,
        test_budget_exhausted_makes_zero_external_call,
        test_valid_response_returns_patch_and_records_usage,
        test_runner_patch_request_tem_teto_proprio_maior_que_coordinator,
        test_json_invalido_no_teto_reporta_truncamento_explicitamente,
        test_no_automatic_retry_on_transport_error,
        test_usage_persists_across_independent_git_usage_ledger_instances,
        test_budget_cap_enforced_via_persistent_ledger_across_fresh_instances,
        test_arquivo_grande_sem_contexto_confiavel_bloqueia_sem_chamada,
        test_file_exactly_at_limit_is_not_blocked,
        test_oversized_file_outside_allowed_files_does_not_block,
        test_malformed_json_response_fails_without_patch,
        test_empty_files_response_is_blocked_with_explicit_no_change_reason,
        test_no_change_reason_do_modelo_chega_ao_motivo,
        test_json_dentro_de_uma_cerca_markdown_e_aceito_e_nada_mais,
        test_response_outside_allowed_files_is_blocked_without_patch,
        test_non_dict_json_response_fails_without_patch,
        test_prompt_contains_only_instructions_and_allowed_file_contents,
        test_reservation_that_does_not_fit_blocks_with_zero_call_even_when_priority_check_would_allow,
        test_transport_error_keeps_the_conservative_reservation,
        test_ledger_correction_failure_is_surfaced_explicitly_never_silent,
        test_concorrencia_perto_do_teto_so_uma_reserva_vence,
        # Issue #144 — edição segura por trecho/âncora em arquivo grande.
        test_arquivo_pequeno_continua_no_contrato_filewrite,
        test_arquivo_grande_nao_e_bloqueado_so_pelo_tamanho_e_aplica_anchored_edit,
        test_arquivo_grande_nunca_e_enviado_integralmente_ao_prompt,
        test_anchored_edit_com_old_text_inexistente_bloqueia,
        test_anchored_edit_com_old_text_duplicado_bloqueia,
        test_anchored_edit_fora_de_allowed_files_bloqueia,
        test_duas_anchored_edits_no_mesmo_arquivo_aplicam_atomicamente,
        test_uma_anchored_edit_invalida_entre_varias_produz_zero_escrita,
        test_filewrite_em_arquivo_grande_e_recusado_para_nunca_truncar,
        # Auditoria independente do HEAD 6bcce53.
        test_anchored_edit_fora_dos_trechos_enviados_bloqueia,
        test_anchored_edit_com_ocorrencia_sobreposta_bloqueia,
        # Auditoria de 24/09/2026 — B08 PA r4/r5: cópias do Banco General.
        test_bloco_referenciado_leva_as_copias_espelhadas_do_banco_geral,
        test_copia_literal_sem_trecho_continua_ambigua_e_bloqueia,
        test_campo_trecho_desambigua_copia_literal_do_banco_geral,
        test_campo_trecho_invalido_ou_ambiguo_bloqueia_sem_escrita,
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
