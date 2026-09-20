"""Sanitização de segredo antes de qualquer log/saída.

Regra da Issue #95: **secret nunca aparece em log**. Isto não é só "não
imprimir a env var" — é ativamente varrer qualquer texto que vá para
stdout, para o resumo humano ou para o audit-pack, e trocar qualquer coisa
que pareça uma chave da Anthropic por um marcador.

Padrão de chave da Anthropic: ``sk-ant-...`` (a mesma família de padrão que
o Repasso Guard já usa em ``tools/qa/guard/checks.py``, SECRET_PATTERNS —
mantido deliberadamente conservador e independente daquele módulo: o
Coordinator não deve importar Guard nem vice-versa).
"""

from __future__ import annotations

import re

_RE_ANTHROPIC_KEY = re.compile(r"sk-ant-[A-Za-z0-9_\-]{10,}")
_RE_GENERIC_LONG_KEY = re.compile(r"\bsk-[A-Za-z0-9]{20,}\b")

MARCADOR = "[REDACTED:api-key]"


def redact(texto: str) -> str:
    """Troca qualquer trecho parecido com chave de API por um marcador.

    Nunca lança exceção — se ``texto`` não for string, devolve como veio
    (quem chama decide se quer converter antes). Isso porque esta função
    roda em caminho de log: falhar aqui não pode derrubar o pipeline.
    """
    if not isinstance(texto, str):
        return texto
    saida = _RE_ANTHROPIC_KEY.sub(MARCADOR, texto)
    saida = _RE_GENERIC_LONG_KEY.sub(MARCADOR, saida)
    return saida


def redact_mapping(dados: dict) -> dict:
    """Aplica ``redact`` recursivamente em qualquer valor string de um dict/list.

    Usado antes de gravar o audit-pack ou o resumo humano — garante que
    nenhum campo aninhado (ex.: uma mensagem de erro que ecoou a chave)
    escape sanitização.
    """
    def _limpar(v):
        if isinstance(v, str):
            return redact(v)
        if isinstance(v, dict):
            return {k: _limpar(vv) for k, vv in v.items()}
        if isinstance(v, list):
            return [_limpar(vv) for vv in v]
        return v

    return _limpar(dados)
