"""Privacy preflight determinístico do OpenAI Auditor — achado B6 da
auditoria independente do PR #107.

A Issue #106 exige explicitamente: "não enviar segredo, token, banco de
alunos ou dado pessoal" e "usar contexto mínimo necessário". Antes desta
correção, ``redact.py`` só sanitizava o que já tinha VOLTADO da API (texto
de resposta/erro) — o PROMPT que seria enviado nunca passava por nenhuma
checagem antes do envio; a única rede de segurança contra conteúdo
sensível no prompt era o Guard (HARD FAIL de segredo), que não cobre PII
em geral.

Este módulo roda ANTES de qualquer chamada, sobre o texto EXATO que seria
enviado (o prompt completo — resumo do Guard + diff + corpo da PR), com
ZERO custo e ZERO chamada de rede. Não é uma auditoria de PII completa
(isso exigiria NLP/outro modelo) — é uma rede de segurança determinística
e objetiva, no mesmo espírito do Repasso Guard: varrer por padrões
OBJETIVOS e, na dúvida (qualquer sinal encontrado), bloquear — nunca
mandar o conteúdo para a própria OpenAI decidir se é sensível.

Reaproveita os MESMOS padrões de segredo que ``redact.py`` já usa (nunca
duplica a lista), e soma um pequeno conjunto de padrões de dado pessoal
objetivo e de baixo ruído (e-mail, CPF com pontuação, atribuição de
segredo/senha por nome de variável). Deliberadamente NÃO inclui padrões
frouxos o bastante para travar qualquer PR normal (ex.: "qualquer sequência
de 11 dígitos" pegaria hashes, contagens de token, datas — isso tornaria o
auditor inútil na prática); os padrões aqui são específicos o bastante
para ter baixo falso-positivo, mas o resultado, quando aciona, é sempre
bloqueio total — nunca um "envia mesmo assim"."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .redact import _RE_ANTHROPIC_KEY, _RE_GENERIC_LONG_KEY, _RE_URL_CREDENTIAL

_RE_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_RE_CPF = re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")
_RE_PHONE_BR = re.compile(r"\(\d{2}\)\s?9?\d{4}-\d{4}\b")
# Atribuição de segredo/token/senha por nome de variável (ex.: "API_KEY=",
# "password: ...", "SECRET_TOKEN = '...'") — objetivo e de baixo ruído:
# exige tanto o NOME sugestivo quanto um valor de tamanho mínimo depois.
_RE_SECRET_ASSIGNMENT = re.compile(
    r"\b[A-Za-z0-9_]*(SECRET|TOKEN|PASSWORD|SENHA|API_KEY|PRIVATE_KEY)[A-Za-z0-9_]*\s*[:=]\s*"
    r"['\"]?[A-Za-z0-9._\-]{8,}",
    re.I,
)

_PADROES: tuple[tuple[re.Pattern, str], ...] = (
    (_RE_ANTHROPIC_KEY, "chave de API no formato Anthropic (sk-ant-...)"),
    (_RE_GENERIC_LONG_KEY, "chave de API no formato sk-... (Anthropic/OpenAI/genérico)"),
    (_RE_URL_CREDENTIAL, "credencial embutida em URL"),
    (_RE_SECRET_ASSIGNMENT, "atribuição de segredo/token/senha por nome de variável"),
    (_RE_CPF, "padrão de CPF (documento pessoal brasileiro)"),
    (_RE_PHONE_BR, "padrão de telefone brasileiro"),
    (_RE_EMAIL, "endereço de e-mail"),
)


@dataclass(frozen=True)
class PrivacyPreflightResult:
    safe: bool
    reasons: tuple[str, ...]

    def to_dict(self) -> dict:
        return {"safe": self.safe, "reasons": list(self.reasons)}


_PII_REDACTIONS: tuple[tuple[re.Pattern, str], ...] = (
    (_RE_EMAIL, "[EMAIL_REDACTED]"),
    (_RE_CPF, "[CPF_REDACTED]"),
    (_RE_PHONE_BR, "[PHONE_REDACTED]"),
)


def redact_pii_for_audit(texto: str) -> str:
    """Remove PII objetiva do prompt antes da auditoria externa.

    E-mail/CPF/telefone não são necessários para julgar o diff e portanto
    são substituídos localmente. Segredos, tokens e credenciais NÃO são
    redigidos aqui de propósito: permanecem visíveis ao preflight e
    continuam bloqueando a chamada de forma fail-closed.
    """
    if not isinstance(texto, str) or not texto:
        return texto if isinstance(texto, str) else ""
    sanitizado = texto
    for padrao, substituto in _PII_REDACTIONS:
        sanitizado = padrao.sub(substituto, sanitizado)
    return sanitizado


def preflight(texto: str) -> PrivacyPreflightResult:
    """Varre ``texto`` (o prompt EXATO que seria enviado à OpenAI) pelos
    padrões acima. ``safe=False`` com qualquer achado — o chamador
    (``coordinator/observe.py::_avaliar_com_openai``) NUNCA envia o
    conteúdo nesse caso: zero chamada, decisão tratada como NEEDS-FIX/
    BLOCKED. Nunca lança — texto que não seja string vira "seguro" só
    porque não há o que varrer (o mesmo texto, adiante, ainda passaria
    pelas checagens normais de tipo antes de virar um prompt de verdade)."""
    if not isinstance(texto, str) or not texto:
        return PrivacyPreflightResult(safe=True, reasons=())
    achados = tuple(descricao for padrao, descricao in _PADROES if padrao.search(texto))
    return PrivacyPreflightResult(safe=not achados, reasons=achados)
