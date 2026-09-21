"""O wrapper de chamada: portão sempre primeiro, erro nunca vira loop.

Prova exigida pela Issue #95:
    - ENABLED=false => zero chamadas externas (transporte nunca invocado);
    - erro do transporte => uma tentativa só, sem retry;
    - custo/usage registrado corretamente quando a resposta tem usage.
"""

from __future__ import annotations

import sys

from . import _pathsetup  # noqa: F401
from coordinator.anthropic_client import (
    Request,
    TransportResponse,
    build_request,
    call,
)
from coordinator.budget import CallLimiter
from coordinator.config import Config
from coordinator.models import ModelTier, resolve


class _CountingTransport:
    """Espião: conta quantas vezes send() foi chamado; nunca faz rede de verdade."""

    def __init__(self, *, raise_error: bool = False, response: TransportResponse | None = None) -> None:
        self.calls = 0
        self.raise_error = raise_error
        self.response = response

    def send(self, request: Request) -> TransportResponse:
        self.calls += 1
        if self.raise_error:
            raise TimeoutError("simulado: a API não respondeu a tempo")
        return self.response


def _request_de_teste() -> Request:
    escolha = resolve(ModelTier.FAST)
    lim = CallLimiter()
    return build_request(escolha, system="s", prompt="p", limiter=lim)


def test_disabled_never_invokes_transport() -> None:
    cfg = Config(enabled=False, mode="observe")
    transporte = _CountingTransport(response=TransportResponse("ok", 10, 10))
    resultado = call(cfg, _request_de_teste(), transport=transporte, limiter=CallLimiter(), event_key="evt:1")
    assert resultado.status == "blocked"
    assert transporte.calls == 0, "ENABLED=false e o transporte foi chamado mesmo assim!"
    print("OK  test_disabled_never_invokes_transport")


def test_wrong_mode_never_invokes_transport() -> None:
    cfg = Config(enabled=True, mode="execute")
    transporte = _CountingTransport(response=TransportResponse("ok", 10, 10))
    resultado = call(cfg, _request_de_teste(), transport=transporte, limiter=CallLimiter(), event_key="evt:2")
    assert resultado.status == "blocked"
    assert transporte.calls == 0
    print("OK  test_wrong_mode_never_invokes_transport")


def test_call_limit_blocks_before_transport() -> None:
    cfg = Config(enabled=True, mode="observe")
    lim = CallLimiter(max_calls=1)
    lim.register_call()  # já "gastou" a única chamada permitida
    transporte = _CountingTransport(response=TransportResponse("ok", 10, 10))
    resultado = call(cfg, _request_de_teste(), transport=transporte, limiter=lim, event_key="evt:3")
    assert resultado.status == "limited"
    assert transporte.calls == 0
    print("OK  test_call_limit_blocks_before_transport")


def test_transport_error_is_single_attempt_no_retry() -> None:
    cfg = Config(enabled=True, mode="observe")
    transporte = _CountingTransport(raise_error=True)
    resultado = call(cfg, _request_de_teste(), transport=transporte, limiter=CallLimiter(), event_key="evt:4")
    assert resultado.status == "error"
    assert transporte.calls == 1, f"esperava exatamente 1 tentativa, houve {transporte.calls} — isso é um retry loop"
    assert "sem retry" in resultado.reason
    print("OK  test_transport_error_is_single_attempt_no_retry")


def test_successful_call_registers_usage() -> None:
    cfg = Config(enabled=True, mode="observe")
    transporte = _CountingTransport(response=TransportResponse("resposta", 100, 50))
    resultado = call(cfg, _request_de_teste(), transport=transporte, limiter=CallLimiter(), event_key="evt:5")
    assert resultado.status == "ok"
    assert transporte.calls == 1
    assert resultado.usage is not None
    assert resultado.usage.input_tokens == 100
    assert resultado.usage.output_tokens == 50
    assert resultado.usage.estimated_cost_usd > 0
    print("OK  test_successful_call_registers_usage")


def test_error_reason_never_leaks_a_key_like_string() -> None:
    class _TransporteQueVazaChave:
        calls = 0

        def send(self, request: Request) -> TransportResponse:
            self.calls += 1
            raise RuntimeError("auth failed for sk-ant-" + "X" * 40)

    cfg = Config(enabled=True, mode="observe")
    transporte = _TransporteQueVazaChave()
    resultado = call(cfg, _request_de_teste(), transport=transporte, limiter=CallLimiter(), event_key="evt:6")
    assert resultado.status == "error"
    # to_dict() passa reason por redact() — é isso que garante que o
    # segredo nunca chega ao log/relatório humano.
    dados = resultado.to_dict()
    assert "sk-ant-" not in dados["reason"]
    assert "[REDACTED:api-key]" in dados["reason"]
    print("OK  test_error_reason_never_leaks_a_key_like_string")


def main() -> int:
    testes = [
        test_disabled_never_invokes_transport,
        test_wrong_mode_never_invokes_transport,
        test_call_limit_blocks_before_transport,
        test_transport_error_is_single_attempt_no_retry,
        test_successful_call_registers_usage,
        test_error_reason_never_leaks_a_key_like_string,
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
