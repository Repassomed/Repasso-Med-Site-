"""O Transport real do OpenAI Auditor (Issue #106) — testado SÓ com mock,
nunca com rede. Mesma técnica de ``test_anthropic_transport.py``: este
ambiente nem tem o pacote ``openai`` instalado de propósito (só é
instalado dentro do job condicionado do workflow real — ver
``coordinator/requirements.txt``), o que já prova, sem nenhum teste
adicional, que nada aqui pode fazer uma chamada de verdade neste processo.
"""

from __future__ import annotations

import os
import sys
import types

from . import _pathsetup  # noqa: F401
from coordinator import openai_client
from coordinator.openai_budget import OpenAICallLimiter
from coordinator.openai_transport import OPENAI_API_KEY_ENV, OpenAIResponsesTransport


def _request_de_teste():
    lim = OpenAICallLimiter()
    return openai_client.build_request(
        model_id="gpt-5.6-terra", tier="TERRA", system="sistema-teste", prompt="prompt-teste", limiter=lim,
    )


def _sem_variavel(nome: str):
    class _Ctx:
        def __enter__(self):
            self._tinha = nome in os.environ
            self._valor_antigo = os.environ.pop(nome, None)
            return self

        def __exit__(self, *exc):
            if self._tinha:
                os.environ[nome] = self._valor_antigo

    return _Ctx()


def _com_variavel(nome: str, valor: str):
    class _Ctx:
        def __enter__(self):
            self._tinha = nome in os.environ
            self._valor_antigo = os.environ.get(nome)
            os.environ[nome] = valor
            return self

        def __exit__(self, *exc):
            if self._tinha:
                os.environ[nome] = self._valor_antigo
            else:
                os.environ.pop(nome, None)

    return _Ctx()


class _RespostaFalsa:
    def __init__(self, texto: str, input_tokens: int, output_tokens: int) -> None:
        self.output_text = texto
        self.output = []
        self.usage = types.SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens)


def _instalar_sdk_falso(*, resposta: _RespostaFalsa | None = None, excecao: Exception | None = None):
    chamadas = {"init_kwargs": None, "create_kwargs": None}

    class _ClienteFalso:
        def __init__(self, **kwargs):
            chamadas["init_kwargs"] = kwargs
            self.responses = self

        def create(self, **kwargs):
            chamadas["create_kwargs"] = kwargs
            if excecao is not None:
                raise excecao
            return resposta

    modulo_falso = types.ModuleType("openai")
    modulo_falso._FALSO = True
    modulo_falso.OpenAI = _ClienteFalso
    sys.modules["openai"] = modulo_falso
    return chamadas


def _remover_sdk_falso() -> None:
    sys.modules.pop("openai", None)


def test_send_without_api_key_fails_safely_no_network() -> None:
    _instalar_sdk_falso(resposta=_RespostaFalsa("nunca devia chegar aqui", 0, 0))
    try:
        with _sem_variavel(OPENAI_API_KEY_ENV):
            try:
                OpenAIResponsesTransport().send(_request_de_teste())
                raise AssertionError("devia ter levantado RuntimeError sem a chave")
            except RuntimeError as e:
                assert OPENAI_API_KEY_ENV in str(e)
    finally:
        _remover_sdk_falso()
    print("OK  test_send_without_api_key_fails_safely_no_network")


def test_send_without_sdk_installed_fails_safely() -> None:
    """Este ambiente de teste não tem o pacote `openai` instalado — prova
    real (não simulada) de que, sem o SDK, nada tenta rede."""
    assert "openai" not in sys.modules or not hasattr(sys.modules.get("openai"), "_FALSO"), (
        "esperava rodar contra o ambiente real sem o SDK instalado"
    )
    with _com_variavel(OPENAI_API_KEY_ENV, "sk-" + "chave-de-teste-nao-real"):
        try:
            import openai  # noqa: F401
        except ImportError:
            try:
                OpenAIResponsesTransport().send(_request_de_teste())
                raise AssertionError("devia ter falhado sem o pacote openai instalado")
            except RuntimeError as e:
                assert "pip install" in str(e)
            print("OK  test_send_without_sdk_installed_fails_safely (SDK de fato ausente)")
        else:
            print("PULADO  test_send_without_sdk_installed_fails_safely (SDK está instalado neste ambiente)")


def test_mock_sdk_maps_request_reads_key_only_from_env_and_always_sets_store_false() -> None:
    """Issue #106, 'Privacidade / API': store=False é OBRIGATÓRIO, sempre —
    esta é a prova direta de que o parâmetro chega até a chamada real do
    SDK, não só na intenção documentada."""
    chave_falsa = "sk-" + "CHAVE-FALSA-DE-TESTE-1234567890"
    chamadas = _instalar_sdk_falso(resposta=_RespostaFalsa("resposta simulada", 123, 45))
    try:
        with _com_variavel(OPENAI_API_KEY_ENV, chave_falsa):
            pedido = _request_de_teste()
            resp = OpenAIResponsesTransport().send(pedido)
        assert resp.text == "resposta simulada"
        assert resp.input_tokens == 123
        assert resp.output_tokens == 45
        assert chamadas["init_kwargs"]["api_key"] == chave_falsa
        assert chamadas["create_kwargs"]["model"] == pedido.model_id
        assert chamadas["create_kwargs"]["input"] == pedido.prompt
        assert chamadas["create_kwargs"]["instructions"] == pedido.system
        assert chamadas["create_kwargs"]["store"] is False, "store=False precisa estar SEMPRE presente (Issue #106)"
    finally:
        _remover_sdk_falso()
    print("OK  test_mock_sdk_maps_request_reads_key_only_from_env_and_always_sets_store_false")


def test_end_to_end_call_with_mock_sdk_registers_usage() -> None:
    from coordinator.openai_config import OpenAIAuditorConfig

    _instalar_sdk_falso(resposta=_RespostaFalsa("DECISION: MERGE-READY\nRISK: NORMAL\nREQUIRES_ESCALATION: "
                                                  "false\nESCALATION_REASON: -\nRATIONALE: ok\nFINDINGS:\n"
                                                  "DIDACTIC_FINDINGS:\n", 10, 5))
    try:
        with _com_variavel(OPENAI_API_KEY_ENV, "sk-CHAVE-FALSA-DE-TESTE-1234567890"):
            cfg = OpenAIAuditorConfig(enabled=True)
            pedido = _request_de_teste()
            lim = OpenAICallLimiter()

            class _LedgerFake:
                def month_to_date_usd(self, *, now=None):
                    return 0.0

                def append(self, record):
                    pass

            resultado = openai_client.call(
                cfg, pedido, transport=OpenAIResponsesTransport(), limiter=lim,
                ledger=_LedgerFake(), event_key="evt:mock-e2e",
            )
        assert resultado.status == "ok"
        assert resultado.usage is not None
        assert resultado.usage.input_tokens == 10
        assert resultado.usage.output_tokens == 5
        assert lim.main_used is True and lim.escalation_used is False
    finally:
        _remover_sdk_falso()
    print("OK  test_end_to_end_call_with_mock_sdk_registers_usage")


def test_exception_from_fake_sdk_never_leaks_key_in_result() -> None:
    from coordinator.openai_config import OpenAIAuditorConfig

    chave_falsa = "sk-proj-" + "Z" * 40
    _instalar_sdk_falso(excecao=RuntimeError(f"invalid_request_error for key {chave_falsa}"))
    try:
        with _com_variavel(OPENAI_API_KEY_ENV, chave_falsa):
            cfg = OpenAIAuditorConfig(enabled=True)

            class _LedgerFake:
                def month_to_date_usd(self, *, now=None):
                    return 0.0

            resultado = openai_client.call(
                cfg, _request_de_teste(), transport=OpenAIResponsesTransport(),
                limiter=OpenAICallLimiter(), ledger=_LedgerFake(), event_key="evt:vaza-chave",
            )
        assert resultado.status == "error"
        dados = resultado.to_dict()
        assert chave_falsa not in dados["reason"], "a chave falsa vazou do resultado da chamada"
        assert "[REDACTED:api-key]" in dados["reason"]
    finally:
        _remover_sdk_falso()
    print("OK  test_exception_from_fake_sdk_never_leaks_key_in_result")


def test_transport_source_hardcodes_store_false() -> None:
    """Prova estrutural adicional (fora do mock): o literal `store=False`
    tem que existir no próprio arquivo-fonte, ligado à chamada
    `responses.create(...)` — não só em teste com SDK falso."""
    caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, "openai_transport.py")
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    idx = conteudo.index("cliente.responses.create(")
    trecho = conteudo[idx: idx + 400]
    assert "store=False" in trecho
    print("OK  test_transport_source_hardcodes_store_false")


def main() -> int:
    testes = [
        test_send_without_api_key_fails_safely_no_network,
        test_send_without_sdk_installed_fails_safely,
        test_mock_sdk_maps_request_reads_key_only_from_env_and_always_sets_store_false,
        test_end_to_end_call_with_mock_sdk_registers_usage,
        test_exception_from_fake_sdk_never_leaks_key_in_result,
        test_transport_source_hardcodes_store_false,
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
