"""O Transport real do OpenAI Auditor (Issue #106) — espelha
``coordinator/anthropic_transport.py`` byte a byte na filosofia:

Isolamento deliberado: SÓ este arquivo importa o pacote ``openai``. O
resto do pacote (``openai_config``, ``openai_budget``, ``openai_client``,
``openai_audit``, ``openai_routing``) roda com biblioteca padrão pura, e
um ambiente sem o SDK instalado ainda consegue rodar tudo — menos,
precisamente, uma chamada real, que é exatamente o que deveria ficar
impossível enquanto ``REPASSO_OPENAI_AUDITOR_ENABLED`` não estiver
``"true"``.

Chave: **somente** de ``OPENAI_API_KEY`` no ambiente (o GitHub Secret, em
produção). Nunca hardcoded, nunca aceita como parâmetro de texto solto,
nunca logada — qualquer falha passa por ``openai_client.CallResult.
to_dict()``, que já sanitiza via ``redact()`` antes de qualquer log.

**Responses API com ``store=False`` (Issue #106, seção "Privacidade /
API"): obrigatório, sempre — nunca reaproveita threads/estado do lado do
provedor, nunca guarda o conteúdo enviado além da resposta imediata desta
chamada.**
"""

from __future__ import annotations

import os

from .openai_client import Request, Transport, TransportResponse

OPENAI_API_KEY_ENV = "OPENAI_API_KEY"


class OpenAIResponsesTransport:
    """Implementação real de ``Transport`` usando o SDK oficial da OpenAI
    e a Responses API (``client.responses.create(...)``).

    A leitura da chave é preguiçosa (só em ``send()``, não em
    ``__init__``) para que só instanciar esta classe — o que
    ``coordinator/__main__.py`` pode fazer mesmo com o portão fechado —
    nunca dependa de a variável de ambiente existir. Isso é seguro porque
    ``send()`` só é alcançado depois que ``openai_client.call()``
    confirma o portão do OpenAI Auditor aberto.
    """

    def __init__(self, *, timeout: float = 60.0, max_retries: int = 0) -> None:
        # max_retries=0 de propósito, mesma razão do AnthropicTransport:
        # "uma tentativa só, sem loop" é responsabilidade de
        # openai_client.call, não do SDK.
        self._timeout = timeout
        self._max_retries = max_retries

    def send(self, request: Request) -> TransportResponse:
        try:
            import openai
        except ImportError as exc:  # pragma: no cover - só se o SDK não estiver instalado
            raise RuntimeError(
                "o pacote 'openai' não está instalado (pip install -r "
                "coordinator/requirements.txt). Nenhuma chamada foi tentada."
            ) from exc

        chave = os.environ.get(OPENAI_API_KEY_ENV)
        if not chave:
            raise RuntimeError(
                f"{OPENAI_API_KEY_ENV} não está definida no ambiente — "
                "esperado vir só do GitHub Secret. Nenhuma chamada foi tentada."
            )

        cliente = openai.OpenAI(api_key=chave, timeout=self._timeout, max_retries=self._max_retries)
        resposta = cliente.responses.create(
            model=request.model_id,
            instructions=request.system,
            input=request.prompt,
            max_output_tokens=request.max_output_tokens,
            # Issue #106, "Privacidade / API": OBRIGATÓRIO, sempre False —
            # nunca deixar a OpenAI reter o conteúdo desta chamada.
            store=False,
        )

        texto = getattr(resposta, "output_text", None)
        if not texto:
            texto = _extrair_texto(resposta)

        uso = getattr(resposta, "usage", None)
        input_tokens = getattr(uso, "input_tokens", 0) if uso is not None else 0
        output_tokens = getattr(uso, "output_tokens", 0) if uso is not None else 0

        return TransportResponse(text=texto or "", input_tokens=input_tokens, output_tokens=output_tokens)


def _extrair_texto(resposta) -> str:
    """Fallback caso o SDK instalado não exponha ``output_text`` (atalho
    de conveniência de versões recentes do SDK) — percorre
    ``resposta.output`` (lista de itens) procurando blocos de texto,
    mesma tolerância que ``anthropic_transport.py`` já aplica ao percorrer
    ``resposta.content``. Nunca lança: uma resposta em formato inesperado
    vira string vazia, que ``openai_audit.parse_openai_decision`` já trata
    como protocolo inválido -> NEEDS-FIX, nunca MERGE-READY por omissão."""
    partes: list[str] = []
    for item in getattr(resposta, "output", None) or []:
        for bloco in getattr(item, "content", None) or []:
            texto_bloco = getattr(bloco, "text", None)
            if texto_bloco:
                partes.append(texto_bloco)
    return "".join(partes)
