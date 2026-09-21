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
# Issue #106 (OpenAI Auditor): chaves da OpenAI também começam com "sk-",
# mas frequentemente incluem um prefixo com hífen antes do segredo em si
# (ex.: "sk-proj-...") — o padrão genérico anterior exigia 20+ caracteres
# alfanuméricos IMEDIATAMENTE após "sk-", então um hífen logo no início
# cortava o match bem antes do mínimo de 20, deixando a chave inteira
# vazar sem redação. Agora aceita hífen/underscore no corpo da chave,
# igual ao padrão específico da Anthropic acima — nunca aceitar prefixo
# nenhum como "confiável o bastante" para pular a sanitização.
_RE_GENERIC_LONG_KEY = re.compile(r"\bsk-[A-Za-z0-9_\-]{20,}\b")
# Credencial embutida numa URL (ex.: https://x-access-token:ghp_...@github.com/...),
# o padrão que coordinator/git_state.py usa para dar push na branch de estado
# com o GITHUB_TOKEN do workflow. Um erro de git (repositório não encontrado,
# autenticação, etc.) ecoa a URL inteira na mensagem — sem isto, o token
# vazaria pela primeira exceção de rede que aparecesse.
_RE_URL_CREDENTIAL = re.compile(r"://[^/@\s:]+:[^/@\s]+@")

MARCADOR = "[REDACTED:api-key]"
MARCADOR_URL = "://[REDACTED:credential]@"


def redact(texto: str) -> str:
    """Troca qualquer trecho parecido com chave de API ou credencial de URL
    por um marcador.

    Nunca lança exceção — se ``texto`` não for string, devolve como veio
    (quem chama decide se quer converter antes). Isso porque esta função
    roda em caminho de log: falhar aqui não pode derrubar o pipeline.
    """
    if not isinstance(texto, str):
        return texto
    saida = _RE_ANTHROPIC_KEY.sub(MARCADOR, texto)
    saida = _RE_GENERIC_LONG_KEY.sub(MARCADOR, saida)
    saida = _RE_URL_CREDENTIAL.sub(MARCADOR_URL, saida)
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
