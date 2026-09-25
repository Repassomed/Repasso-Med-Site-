"""O Transport real — bloqueador 1 da auditoria do PR #97.

Antes desta correção, ``anthropic_client.py`` só definia a interface
``Transport`` e nenhuma implementação real existia — ``observe()`` nunca
chegava a tentar uma chamada de verdade mesmo com o portão aberto. Isto
fecha essa lacuna: ``AnthropicTransport`` usa o SDK oficial da Anthropic
(``pip install anthropic`` — ver ``coordinator/requirements.txt``) para
fazer a chamada de verdade, **mas continua inerte** enquanto
``coordinator.config.Config.gate()`` não abrir, porque é
``anthropic_client.call()`` quem decide invocar ``.send()`` ou não — este
arquivo só implementa o "como", nunca o "quando".

Isolamento deliberado: SÓ este arquivo importa o pacote ``anthropic``.
``anthropic_client.py`` continua sem essa dependência, então o resto do
pacote (config, classify, routing, dedup, budget, observe) roda com
biblioteca padrão pura, e um ambiente sem o SDK instalado ainda consegue
rodar tudo — menos, precisamente, uma chamada real, que é exatamente o
que deveria ficar impossível enquanto ninguém decidiu ligá-la.

Chave: **somente** de ``ANTHROPIC_API_KEY`` no ambiente (o GitHub Secret,
em produção). Nunca hardcoded, nunca aceita como parâmetro de texto solto,
nunca logada — se a chamada falhar, o erro passa por
``anthropic_client.CallResult.to_dict()``, que já sanitiza via
``redact()`` antes de qualquer log/relatório.
"""

from __future__ import annotations

import os

from .anthropic_client import Request, Transport, TransportResponse

ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY"
DEFAULT_TIMEOUT_SECONDS = 180.0
# Acima disto a chamada usa streaming (Issue #235 — patch do Runner de até 32k tokens).
STREAMING_THRESHOLD_TOKENS = 8_192


class AnthropicTransport:
    """Implementação real de ``Transport`` usando o SDK oficial.

    A leitura da chave é preguiçosa (só em ``send()``, não em
    ``__init__``) para que só instanciar esta classe — o que
    ``coordinator/__main__.py`` faz sempre, mesmo com o portão fechado —
    nunca dependa de a variável de ambiente existir. Isso é seguro porque
    ``send()`` só é alcançado depois que ``anthropic_client.call()``
    confirma o portão aberto.
    """

    def __init__(self, *, timeout: float = DEFAULT_TIMEOUT_SECONDS, max_retries: int = 0) -> None:
        # Issue #168: 60 s interrompeu uma tarefa real de código (run 35936352652).
        # O teto de 180 s continua finito e cobre respostas estruturadas maiores.
        # max_retries=0 de propósito: o retry de rede é responsabilidade
        # do SDK por padrão (2 tentativas), mas a Issue #95 pede "uma
        # tentativa só, sem loop" no nível do Coordinator — desligar o
        # retry do SDK aqui e deixar `anthropic_client.call` decidir tudo
        # evita uma segunda camada de retry escondida dentro do SDK.
        self._timeout = timeout
        self._max_retries = max_retries

    def send(self, request: Request) -> TransportResponse:
        try:
            import anthropic
        except ImportError as exc:  # pragma: no cover - só se o SDK não estiver instalado
            raise RuntimeError(
                "o pacote 'anthropic' não está instalado (pip install -r "
                "coordinator/requirements.txt). Nenhuma chamada foi tentada."
            ) from exc

        chave = os.environ.get(ANTHROPIC_API_KEY_ENV)
        if not chave:
            raise RuntimeError(
                f"{ANTHROPIC_API_KEY_ENV} não está definida no ambiente — "
                "esperado vir só do GitHub Secret. Nenhuma chamada foi tentada."
            )

        cliente = anthropic.Anthropic(
            api_key=chave, timeout=self._timeout, max_retries=self._max_retries
        )
        parametros = dict(
            model=request.model_id,
            max_tokens=request.max_output_tokens,
            system=request.system,
            messages=[{"role": "user", "content": request.prompt}],
        )
        if request.max_output_tokens > STREAMING_THRESHOLD_TOKENS and hasattr(cliente.messages, "stream"):
            # Issue #235: resposta longa (patch do Runner) sem streaming
            # estoura o timeout HTTP antes de o modelo terminar. Com
            # streaming o timeout vale por leitura, não pela resposta toda.
            # Continua UMA chamada só, sem retry.
            with cliente.messages.stream(**parametros) as fluxo:
                resposta = fluxo.get_final_message()
        else:
            resposta = cliente.messages.create(**parametros)
        texto = next((b.text for b in resposta.content if b.type == "text"), "")
        return TransportResponse(
            text=texto,
            input_tokens=resposta.usage.input_tokens,
            output_tokens=resposta.usage.output_tokens,
            stop_reason=str(getattr(resposta, "stop_reason", "") or ""),
        )
