"""Issue #276 — resposta vazia/fora do protocolo do Anthropic Auditor.

Separa falha TÉCNICA do auditor de NEEDS-FIX de conteúdo:

- resposta válida -> processa normal, uma chamada;
- vazia / fora do protocolo -> UMA tentativa técnica extra (orçamento
  reservado antes), nunca um laço;
- tentativa extra resolve -> decisão normal da 2ª resposta;
- tentativa extra continua inválida -> AUDITOR-TECHNICAL-FAILURE: bloqueado,
  nunca MERGE-READY, e o Worker Bridge nunca recebe isso como instrução de
  conteúdo;
- sem orçamento para a tentativa extra -> nenhuma 2ª chamada;
- dedup mesmo HEAD + mesma política continua valendo.

Nenhum teste chama API paga: todos usam transporte falso, e os ``send`` dos
transportes reais ficam trocados por um sentinela que falha alto.
"""

from __future__ import annotations

import os
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator import anthropic_transport, openai_transport, worker_bridge
from coordinator.audit import AUDIT_RETRY_MAX_OUTPUT_TOKENS, AUDITOR_TECHNICAL_FAILURE
from coordinator.budget import MAX_OUTPUT_TOKENS_PER_CALL, UsageLedger
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.tests.test_coordinator_v3 import (
    _DIFF_REAL_EXEMPLO,
    _TITULO_SEM_AVALIACAO,
    _observar_pr_materia,
)

BRIDGE_MARKER = "A resposta da auditoria não seguiu o protocolo esperado"
BODY = "ajuste de prosa didática, sem nada relacionado a avaliação"


class _Resposta:
    def __init__(self, texto: str, *, stop_reason: str = "end_turn",
                 input_tokens: int = 12_000, output_tokens: int = 300) -> None:
        self.text = texto
        self.stop_reason = stop_reason
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens


class _Sequencia:
    """Devolve as respostas na ordem; guarda cada pedido recebido."""

    def __init__(self, *respostas) -> None:
        self.respostas = list(respostas)
        self.pedidos = []

    @property
    def calls(self) -> int:
        return len(self.pedidos)

    def send(self, request):
        self.pedidos.append(request)
        item = self.respostas[len(self.pedidos) - 1]
        if isinstance(item, Exception):
            raise item
        return item


def _vazia_por_max_tokens() -> _Resposta:
    # Forma exata dos runs reais do #266: 2.000/2.000 tokens de saída, nenhum texto.
    return _Resposta("", stop_reason="max_tokens", output_tokens=MAX_OUTPUT_TOKENS_PER_CALL)


def _observar(transport, *, head_sha: str, ledger=None, dedup=None):
    tmp = tempfile.mkdtemp()
    return _observar_pr_materia(
        head_sha=head_sha, body=BODY, transport=transport,
        dedup=dedup or Deduplicator(InMemoryStore()),
        ledger=ledger or UsageLedger(os.path.join(tmp, "usage.json")),
        pr_diff=_DIFF_REAL_EXEMPLO, titulo=_TITULO_SEM_AVALIACAO,
    )


def _bridge_pediria_correcao(card: str) -> bool:
    comentario = {"id": 1, "user": {"login": worker_bridge.COORDINATOR_BOT_LOGIN}, "body": card}
    return worker_bridge._audit_fix_request_from_comments([comentario], pr_number=200) is not None


def _assert_falha_tecnica(r) -> None:
    assert r.audit_decision == "NEEDS-FIX", r.audit_decision
    assert r.audit_decision != "MERGE-READY"
    assert r.audit_technical_failure is True
    assert AUDITOR_TECHNICAL_FAILURE in r.merge_card
    assert BRIDGE_MARKER in r.merge_card
    assert "não uma reprovação de conteúdo" in r.merge_card or "**não** uma reprovação de conteúdo" in r.merge_card
    assert not _bridge_pediria_correcao(r.merge_card), "falha técnica virou instrução de conteúdo"


def test_resposta_valida_processa_normal_sem_retry() -> None:
    t = _Sequencia(_Resposta("DECISÃO: MERGE-READY\nTudo certo."))
    r = _observar(t, head_sha="v1")
    assert r.audit_decision == "MERGE-READY"
    assert r.audit_technical_failure is False
    assert t.calls == 1
    assert AUDITOR_TECHNICAL_FAILURE not in r.merge_card
    print("OK  test_resposta_valida_processa_normal_sem_retry")


def test_resposta_vazia_e_retry_vazio_vira_falha_tecnica() -> None:
    """Caso real do #266: vazia com max_tokens, e a tentativa extra também."""
    with tempfile.TemporaryDirectory() as tmp:
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _Sequencia(_vazia_por_max_tokens(), _vazia_por_max_tokens())
        r = _observar(t, head_sha="e1", ledger=ledger)
        _assert_falha_tecnica(r)
        assert t.calls == 2, "no máximo UMA tentativa extra"
        assert t.pedidos[0].max_output_tokens == MAX_OUTPUT_TOKENS_PER_CALL
        assert t.pedidos[1].max_output_tokens == AUDIT_RETRY_MAX_OUTPUT_TOKENS
        assert t.pedidos[1].prompt == t.pedidos[0].prompt
        assert "stop_reason=max_tokens" in r.merge_card
        assert "2 tentativa(s)" in r.merge_card
        # As duas chamadas pagas estão no ledger, cada uma com reserva ->
        # correção -> uso, sob chaves distintas e auditáveis.
        kinds = {}
        for rec in ledger.all_records():
            kinds.setdefault(rec["event_key"].endswith("#auditor-retry-1"), []).append(rec["kind"])
        assert kinds[False] == ["reservation", "correction", "usage"], kinds
        assert kinds[True] == ["reservation", "correction", "usage"], kinds
    print("OK  test_resposta_vazia_e_retry_vazio_vira_falha_tecnica")


def test_resposta_fora_do_protocolo_vira_falha_tecnica() -> None:
    t = _Sequencia(_Resposta("Acho que ficou bom, pode seguir."),
                   _Resposta("Continuo achando que está bom."))
    r = _observar(t, head_sha="fp1")
    _assert_falha_tecnica(r)
    assert t.calls == 2
    # Não parou por max_tokens: a tentativa extra não ganha teto maior.
    assert t.pedidos[1].max_output_tokens == MAX_OUTPUT_TOKENS_PER_CALL
    assert "resposta fora do protocolo" in r.merge_card
    print("OK  test_resposta_fora_do_protocolo_vira_falha_tecnica")


def test_retry_resolve_resposta_vazia() -> None:
    t = _Sequencia(_vazia_por_max_tokens(), _Resposta("DECISÃO: MERGE-READY\nRevisão ok."))
    r = _observar(t, head_sha="rr1")
    assert r.audit_decision == "MERGE-READY"
    assert r.audit_technical_failure is False
    assert t.calls == 2
    assert AUDITOR_TECHNICAL_FAILURE not in r.merge_card
    assert BRIDGE_MARKER not in r.merge_card
    assert "tentativa técnica extra" in r.merge_card
    assert "chamadas pagas desta tarefa: 2" in r.merge_card
    print("OK  test_retry_resolve_resposta_vazia")


def test_retry_resolve_com_needs_fix_de_conteudo_continua_instrucao_de_conteudo() -> None:
    """Quando a 2ª resposta é um NEEDS-FIX VÁLIDO, é achado de conteúdo real."""
    t = _Sequencia(_vazia_por_max_tokens(), _Resposta("DECISÃO: NEEDS-FIX\nFalta a fonte X."))
    r = _observar(t, head_sha="rr2")
    assert r.audit_decision == "NEEDS-FIX"
    assert r.audit_technical_failure is False
    assert BRIDGE_MARKER not in r.merge_card
    assert _bridge_pediria_correcao(r.merge_card)
    print("OK  test_retry_resolve_com_needs_fix_de_conteudo_continua_instrucao_de_conteudo")


class _LedgerSemOrcamentoParaSegunda(UsageLedger):
    def __init__(self, path: str) -> None:
        super().__init__(path)
        self.reservas = 0

    def reserve_if_within_budget(self, candidate, *, budget_usd, now=None):
        self.reservas += 1
        if self.reservas > 1:
            return False
        return super().reserve_if_within_budget(candidate, budget_usd=budget_usd, now=now)


def test_sem_orcamento_nao_faz_tentativa_extra() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        ledger = _LedgerSemOrcamentoParaSegunda(os.path.join(tmp, "usage.json"))
        t = _Sequencia(_vazia_por_max_tokens(), _Resposta("DECISÃO: MERGE-READY\nnunca chamado"))
        r = _observar(t, head_sha="nb1", ledger=ledger)
        _assert_falha_tecnica(r)
        assert t.calls == 1, "sem reserva aceita, nenhuma chamada extra"
        assert "tentativa extra não feita" in r.merge_card
        assert "limite mensal" in r.merge_card
    print("OK  test_sem_orcamento_nao_faz_tentativa_extra")


def test_erro_de_transporte_vira_falha_tecnica_sem_retry() -> None:
    t = _Sequencia(TimeoutError("Request timed out"))
    r = _observar(t, head_sha="te1")
    _assert_falha_tecnica(r)
    assert r.call_status == "error"
    assert t.calls == 1, "erro de transporte não ganha retry"
    assert "chamadas pagas desta tarefa: 0" in r.merge_card
    print("OK  test_erro_de_transporte_vira_falha_tecnica_sem_retry")


def test_dedup_mesmo_head_mesma_politica_nao_chama_de_novo() -> None:
    dedup = Deduplicator(InMemoryStore())
    with tempfile.TemporaryDirectory() as tmp:
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t1 = _Sequencia(_vazia_por_max_tokens(), _vazia_por_max_tokens())
        r1 = _observar(t1, head_sha="dd1", ledger=ledger, dedup=dedup)
        _assert_falha_tecnica(r1)
        t2 = _Sequencia(_Resposta("DECISÃO: MERGE-READY\nnunca chamado"))
        r2 = _observar(t2, head_sha="dd1", ledger=ledger, dedup=dedup)
        assert r2.status == "DUPLICATE", r2.status
        assert t2.calls == 0
    print("OK  test_dedup_mesmo_head_mesma_politica_nao_chama_de_novo")


def _sentinela(*_a, **_k):
    raise AssertionError("teste tentou usar um transporte REAL (chamada paga)")


TESTS = [
    test_resposta_valida_processa_normal_sem_retry,
    test_resposta_vazia_e_retry_vazio_vira_falha_tecnica,
    test_resposta_fora_do_protocolo_vira_falha_tecnica,
    test_retry_resolve_resposta_vazia,
    test_retry_resolve_com_needs_fix_de_conteudo_continua_instrucao_de_conteudo,
    test_sem_orcamento_nao_faz_tentativa_extra,
    test_erro_de_transporte_vira_falha_tecnica_sem_retry,
    test_dedup_mesmo_head_mesma_politica_nao_chama_de_novo,
]


def main() -> int:
    originais = (anthropic_transport.AnthropicTransport.send,
                 openai_transport.OpenAIResponsesTransport.send)
    anthropic_transport.AnthropicTransport.send = _sentinela
    openai_transport.OpenAIResponsesTransport.send = _sentinela
    falhas = 0
    try:
        for t in TESTS:
            try:
                t()
            except Exception as exc:  # noqa: BLE001
                falhas += 1
                print(f"FALHOU  {t.__name__}: {type(exc).__name__}: {exc}")
    finally:
        (anthropic_transport.AnthropicTransport.send,
         openai_transport.OpenAIResponsesTransport.send) = originais
    print(f"\n{len(TESTS) - falhas}/{len(TESTS)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
