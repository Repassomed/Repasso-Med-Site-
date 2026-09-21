"""Decide o nível de modelo (FAST/STANDARD/DEEP) para um evento já classificado.

Regras da Issue #90 aplicadas a esta V2 (seção "Em OBSERVE"):

    FAST para eventos administrativos;
    STANDARD somente quando precisar interpretar diff/audit-pack;
    DEEP desabilitado por padrão.

A decisão aqui é sobre QUAL NÍVEL seria usado SE uma chamada acontecesse —
nesta V2, com ENABLED=false, a chamada nunca ocorre; esta função só
alimenta o campo "modelo sugerido" da saída OBSERVE.
"""

from __future__ import annotations

from dataclasses import dataclass

from .classify import Classification, TaskType
from .events import Event, EventType
from .models import ModelChoice, ModelTier, resolve


@dataclass(frozen=True)
class RoutingDecision:
    model_choice: ModelChoice
    needs_semantic_audit: bool  # Nível C da #83 — conteúdo médico
    escalate_recommended: bool
    escalate_reason: str = ""

    def to_dict(self) -> dict:
        d = self.model_choice.to_dict()
        d["needs_semantic_audit"] = self.needs_semantic_audit
        d["escalate_recommended"] = self.escalate_recommended
        d["escalate_reason"] = self.escalate_reason
        return d


def decide(event: Event, classification: Classification, *, deep_enabled: bool = False) -> RoutingDecision:
    # Guard virou vermelho: precisa interpretar QUAL check falhou a partir
    # do audit-pack — isso é leitura de diff/resultado estruturado, então
    # STANDARD (Issue #90: "STANDARD somente quando precisar interpretar
    # diff/audit-pack").
    if event.event_type is EventType.GUARD_STATE_CHANGE and event.payload.get("guard_state") == "failure":
        return RoutingDecision(
            model_choice=resolve(ModelTier.STANDARD, deep_enabled=deep_enabled),
            needs_semantic_audit=False,
            escalate_recommended=False,
        )

    # Conteúdo médico (tipo A em matéria) é Nível C da política #83:
    # precisa de auditoria semântica antes de MERGE-READY. Isso é trabalho
    # STANDARD por padrão; escala para DEEP só em conflito cátedra x
    # literatura difícil ou incerteza relevante — sinalizado aqui, mas
    # nunca executado automaticamente (DEEP fica desabilitado por padrão).
    if classification.task_type is TaskType.A and event.payload.get("materia") is not None:
        alto_risco = bool(event.payload.get("conflito_catedra_literatura")) or bool(
            event.payload.get("alto_risco")
        )
        return RoutingDecision(
            model_choice=resolve(ModelTier.STANDARD, deep_enabled=deep_enabled),
            needs_semantic_audit=True,
            escalate_recommended=alto_risco,
            escalate_reason=(
                "Conflito cátedra × literatura ou alto risco sinalizado no evento — "
                "recomenda-se DEEP para segunda opinião (Issue #90 §3), mas "
                "desabilitado por padrão nesta V2."
                if alto_risco
                else ""
            ),
        )

    # Pedido em texto livre (Inbox) que não foi possível classificar por
    # palavra-chave: uma leitura STANDARD do texto ajudaria — mas isso é
    # exatamente o tipo de chamada que não deve disparar sozinha e sem
    # necessidade (Issue #84 §3: "não criar trabalho por criar"). Sinaliza
    # a recomendação sem forçar o nível.
    if classification.needs_input and event.event_type is EventType.INBOX_COMMENT:
        return RoutingDecision(
            model_choice=resolve(ModelTier.STANDARD, deep_enabled=deep_enabled),
            needs_semantic_audit=False,
            escalate_recommended=False,
            escalate_reason="Texto livre ambíguo — STANDARD ajudaria a interpretar, mas não é obrigatório.",
        )

    # Tudo o mais é administrativo: classificação, roteamento, resumo,
    # atualização de registro — trabalho de FAST por definição (Issue #90).
    return RoutingDecision(
        model_choice=resolve(ModelTier.FAST, deep_enabled=deep_enabled),
        needs_semantic_audit=False,
        escalate_recommended=False,
    )
