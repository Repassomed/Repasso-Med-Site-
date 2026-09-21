"""Roteamento custo-benefício do OpenAI Auditor (Issue #106, seção
"Roteamento custo-benefício") — determinístico, zero custo, sempre roda
ANTES de qualquer chamada real.

Este módulo só decide o TIER da chamada PRINCIPAL (ZERO/TERRA/SOL) — a
ESCALADA (uma segunda chamada, só para Sol, só depois de Terra já ter
rodado) é uma decisão separada, tomada em ``observe.py`` a partir do
próprio resultado estruturado de Terra (``openai_audit.OpenAIAuditDecision
.requires_escalation``), nunca aqui.

**Por que as condições "ZERO" da Issue #106 (duplicata, Guard HARD FAIL,
docs triviais, evento administrativo) não aparecem explicitamente neste
módulo:** o ponto de chamada em ``observe.py`` só alcança este roteamento
DEPOIS de passar pelos mesmos portões que já protegem a auditoria semântica
da Anthropic — dedup.claim() (zero chamada em duplicata), o atalho de
HARD FAIL determinístico do Guard (zero chamada quando o Guard já reprovou
objetivamente) e a própria condição de ``executar_auditoria`` (só
PR_NEEDS_AUDIT + tipo A + área=="materia", nunca evento administrativo ou
doc trivial). Este módulo, portanto, só precisa decidir o que sobra depois
desses filtros: se há EVIDÊNCIA suficiente (diff real disponível) e, se
houver, se algum sinal de alto risco justifica Sol em vez de Terra.
"""

from __future__ import annotations

from dataclasses import dataclass

from .classify import Classification
from .events import Event

TIER_ZERO = "ZERO"
TIER_TERRA = "TERRA"
TIER_SOL = "SOL"

# Cada chave corresponde a um sinal explícito no payload do evento — mesmo
# padrão que coordinator/routing.py já usa para "conflito_catedra_literatura"/
# "alto_risco" (reaproveitados aqui de propósito, para as duas auditorias
# lerem o MESMO sinal do mesmo jeito). As chaves novas cobrem o restante da
# lista "Auditor alto risco — Sol" da Issue #106.
_SINAIS_ALTO_RISCO: dict[str, str] = {
    "conflito_catedra_literatura": "conflito cátedra × literatura",
    "mudanca_gabarito": "mudança de gabarito",
    "incerteza_cientifica": "incerteza científica real",
    "seguranca_critica": "alteração estrutural crítica do Coordinator",
    "alto_risco": "alto risco sinalizado no evento",
    "auth_pagamento_analise": "Auth/pagamento/segurança (somente leitura/análise)",
    "desacordo_auditorias": "desacordo relevante entre worker e primeira auditoria",
}


@dataclass(frozen=True)
class OpenAIRoutingDecision:
    tier: str  # "ZERO" | "TERRA" | "SOL"
    reason: str
    high_risk_signals: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        return {"tier": self.tier, "reason": self.reason, "high_risk_signals": list(self.high_risk_signals)}


def decide(event: Event, classificacao: Classification, *, diff_disponivel: bool) -> OpenAIRoutingDecision:
    """``diff_disponivel`` vem de ``audit.preparar_diff(...).disponivel`` —
    a MESMA verificação que já bloqueia MERGE-READY da Anthropic sem diff
    real (``merge_card.aplicar_gate_diff``). Sem diff real, não há
    material suficiente para pagar por uma segunda auditoria também — Issue
    #106: "tarefa sem material suficiente" é uma das condições ZERO.

    Todos os sinais de alto risco (inclusive "desacordo relevante entre
    worker e primeira auditoria") vêm do PAYLOAD do evento
    (``_SINAIS_ALTO_RISCO``) — nunca inferidos heuristicamente aqui (ex.:
    nunca "Anthropic disse NEEDS-FIX, logo é desacordo": isso escalaria
    para Sol em todo NEEDS-FIX comum, o oposto de custo-benefício)."""
    if not diff_disponivel:
        return OpenAIRoutingDecision(
            tier=TIER_ZERO,
            reason=(
                "Nenhum diff real da PR está disponível — evidência insuficiente para "
                "justificar uma segunda auditoria paga (Issue #106, 'tarefa sem material "
                "suficiente')."
            ),
        )

    payload = event.payload
    sinais = [
        rotulo for chave, rotulo in _SINAIS_ALTO_RISCO.items() if payload.get(chave)
    ]

    if sinais:
        return OpenAIRoutingDecision(
            tier=TIER_SOL,
            reason="Sinal(is) de alto risco presente(s): " + "; ".join(sinais) + " (Issue #106).",
            high_risk_signals=tuple(sinais),
        )

    return OpenAIRoutingDecision(
        tier=TIER_TERRA,
        reason=(
            "Conteúdo médico/didático Nível C (Issue #83), diff real disponível, sem sinal "
            "de alto risco — auditor padrão (Terra)."
        ),
    )
