"""O Transport real (bloqueador 1) — testado SÓ com mock, nunca com rede.

Este ambiente nem tem o pacote ``anthropic`` instalado (de propósito — ver
``coordinator/requirements.txt``: só é instalado dentro do job condicionado
do workflow real). Isso já prova, sem precisar de nenhum teste adicional,
que nada aqui pode fazer uma chamada de verdade neste processo — é
exatamente o que ``test_send_without_sdk_installed_fails_safely`` exercita
de verdade, sem nenhum truque.

Para o resto (mapeamento de request/response, leitura da chave), injetamos
um SDK FALSO em ``sys.modules`` — a técnica padrão para testar um
``import`` opcional sem instalar o pacote de verdade nem tocar a rede.
"""

from __future__ import annotations

import os
import sys
import types

from . import _pathsetup  # noqa: F401
from coordinator import anthropic_client
from coordinator.anthropic_transport import ANTHROPIC_API_KEY_ENV, AnthropicTransport
from coordinator.budget import CallLimiter
from coordinator.config import Config
from coordinator.models import ModelTier, resolve


def _request_de_teste():
    escolha = resolve(ModelTier.FAST)
    lim = CallLimiter()
    return anthropic_client.build_request(escolha, system="sistema-teste", prompt="prompt-teste", limiter=lim)


def _sem_variavel(nome: str):
    """Contexto simples: remove ``nome`` do ambiente e restaura ao sair —
    sem depender de ``unittest.mock``, mesmo estilo do resto da suíte."""
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


def test_send_without_api_key_fails_safely_no_network() -> None:
    # Instala um SDK falso só para isolar o caminho "chave ausente" do
    # caminho "SDK ausente" (este ambiente de teste não tem o pacote
    # `anthropic` de verdade instalado — sem o SDK falso, o import falharia
    # primeiro e testaríamos o branch errado).
    _instalar_sdk_falso(resposta=_RespostaFalsa("nunca devia chegar aqui", 0, 0))
    try:
        with _sem_variavel(ANTHROPIC_API_KEY_ENV):
            try:
                AnthropicTransport().send(_request_de_teste())
                raise AssertionError("devia ter levantado RuntimeError sem a chave")
            except RuntimeError as e:
                assert ANTHROPIC_API_KEY_ENV in str(e)
    finally:
        _remover_sdk_falso()
    print("OK  test_send_without_api_key_fails_safely_no_network")


def test_send_without_sdk_installed_fails_safely() -> None:
    """Este ambiente de teste não tem o pacote `anthropic` instalado —
    prova real (não simulada) de que, sem o SDK, nada tenta rede."""
    assert "anthropic" not in sys.modules or not hasattr(sys.modules.get("anthropic"), "_FALSO"), (
        "esperava rodar contra o ambiente real sem o SDK instalado"
    )
    with _com_variavel(ANTHROPIC_API_KEY_ENV, "sk-ant-" + "chave-de-teste-nao-real"):
        try:
            import anthropic  # noqa: F401
        except ImportError:
            try:
                AnthropicTransport().send(_request_de_teste())
                raise AssertionError("devia ter falhado sem o pacote anthropic instalado")
            except RuntimeError as e:
                assert "pip install" in str(e)
            print("OK  test_send_without_sdk_installed_fails_safely (SDK de fato ausente)")
        else:
            print("PULADO  test_send_without_sdk_installed_fails_safely (SDK está instalado neste ambiente)")


class _RespostaFalsa:
    def __init__(self, texto: str, input_tokens: int, output_tokens: int) -> None:
        self.content = [types.SimpleNamespace(type="text", text=texto)]
        self.usage = types.SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens)


def _instalar_sdk_falso(*, resposta: _RespostaFalsa | None = None, excecao: Exception | None = None):
    """Injeta um módulo `anthropic` falso em sys.modules, capturando os
    argumentos com que o cliente foi construído e chamado — sem precisar
    instalar o pacote real nem tocar rede."""
    chamadas = {"init_kwargs": None, "create_kwargs": None}

    class _ClienteFalso:
        def __init__(self, **kwargs):
            chamadas["init_kwargs"] = kwargs
            self.messages = self

        def create(self, **kwargs):
            chamadas["create_kwargs"] = kwargs
            if excecao is not None:
                raise excecao
            return resposta

    modulo_falso = types.ModuleType("anthropic")
    modulo_falso._FALSO = True
    modulo_falso.Anthropic = _ClienteFalso
    sys.modules["anthropic"] = modulo_falso
    return chamadas


def _remover_sdk_falso() -> None:
    sys.modules.pop("anthropic", None)


def test_mock_sdk_maps_request_and_reads_key_only_from_env() -> None:
    chave_falsa = "sk-ant-" + "CHAVE-FALSA-DE-TESTE"
    chamadas = _instalar_sdk_falso(resposta=_RespostaFalsa("resposta simulada", 123, 45))
    try:
        with _com_variavel(ANTHROPIC_API_KEY_ENV, chave_falsa):
            pedido = _request_de_teste()
            resp = AnthropicTransport().send(pedido)
        assert resp.text == "resposta simulada"
        assert resp.input_tokens == 123
        assert resp.output_tokens == 45
        assert chamadas["init_kwargs"]["api_key"] == chave_falsa
        assert chamadas["create_kwargs"]["model"] == pedido.model_id
        assert chamadas["create_kwargs"]["messages"] == [{"role": "user", "content": pedido.prompt}]
    finally:
        _remover_sdk_falso()
    print("OK  test_mock_sdk_maps_request_and_reads_key_only_from_env")


def test_end_to_end_call_with_mock_sdk_registers_usage() -> None:
    """Prova de ponta a ponta pedida pela auditoria: ENABLED=true + mock
    -> exatamente 1 chamada, com usage registrado."""
    _instalar_sdk_falso(resposta=_RespostaFalsa("ok", 10, 5))
    try:
        with _com_variavel(ANTHROPIC_API_KEY_ENV, "sk-ant-CHAVE-FALSA"):
            cfg = Config(enabled=True, mode="observe")
            pedido = _request_de_teste()
            lim = CallLimiter()
            resultado = anthropic_client.call(
                cfg, pedido, transport=AnthropicTransport(), limiter=lim, event_key="evt:mock-e2e",
            )
        assert resultado.status == "ok"
        assert resultado.usage is not None
        assert resultado.usage.input_tokens == 10
        assert resultado.usage.output_tokens == 5
        assert lim.calls_used == 1, "exatamente 1 chamada, nem mais nem menos"
    finally:
        _remover_sdk_falso()
    print("OK  test_end_to_end_call_with_mock_sdk_registers_usage")


def test_exception_from_fake_sdk_never_leaks_key_in_result() -> None:
    chave_falsa = "sk-ant-" + "Z" * 40
    _instalar_sdk_falso(excecao=RuntimeError(f"invalid_request_error for key {chave_falsa}"))
    try:
        with _com_variavel(ANTHROPIC_API_KEY_ENV, chave_falsa):
            cfg = Config(enabled=True, mode="observe")
            resultado = anthropic_client.call(
                cfg, _request_de_teste(), transport=AnthropicTransport(),
                limiter=CallLimiter(), event_key="evt:vaza-chave",
            )
        assert resultado.status == "error"
        dados = resultado.to_dict()
        assert chave_falsa not in dados["reason"], "a chave falsa vazou do resultado da chamada"
        assert "[REDACTED:api-key]" in dados["reason"]
    finally:
        _remover_sdk_falso()
    print("OK  test_exception_from_fake_sdk_never_leaks_key_in_result")


def main() -> int:
    testes = [
        test_send_without_api_key_fails_safely_no_network,
        test_send_without_sdk_installed_fails_safely,
        test_mock_sdk_maps_request_and_reads_key_only_from_env,
        test_end_to_end_call_with_mock_sdk_registers_usage,
        test_exception_from_fake_sdk_never_leaks_key_in_result,
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
