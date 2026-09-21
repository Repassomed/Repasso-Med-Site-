"""Roteamento de modelo — papéis lógicos FAST / STANDARD / DEEP (Issue #90).

A política #90 é explícita: o Coordinator usa NÍVEIS LÓGICOS, não nomes
comerciais amarrados no código. O mapeamento muda; a lógica FAST/STANDARD/
DEEP não.

**Correção pós-auditoria do PR #97 (bloqueador 3).** A primeira versão
deste arquivo usava ``claude-haiku-4-5`` para FAST, citando só a tabela em
cache da skill `claude-api`. A auditoria independente pediu confirmação
com a documentação oficial ATUAL — busquei
https://platform.claude.com/docs/en/models/overview ao vivo em
2026-09-21 e a linha "Claude API ID" da tabela "Compare models" traz:

    Claude Sonnet 5    -> claude-sonnet-5
    Claude Opus 5      -> claude-opus-5
    Claude Haiku 4.5   -> claude-haiku-4-5-20251001

A mesma tabela também lista ``claude-haiku-4-5`` como "Claude API alias"
— um apontador de conveniência válido que resolve para o snapshot datado
— então o alias curto NÃO estava errado tecnicamente. Mas a doc chama o
snapshot datado de "Claude API ID" (a coluna primária/canônica), então é
esse que este arquivo usa agora: elimina qualquer ambiguidade e não
depende do alias continuar apontando para este snapshot específico no
futuro.

    FAST     = claude-haiku-4-5-20251001   (snapshot pinado; alias: claude-haiku-4-5)
    STANDARD = claude-sonnet-5              (sem sufixo de data — é a forma canônica)
    DEEP     = claude-opus-5                (sem sufixo de data — é a forma canônica)
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class ModelTier(str, Enum):
    FAST = "FAST"
    STANDARD = "STANDARD"
    DEEP = "DEEP"


# Mapeamento nível lógico -> model id. Revisar periodicamente (Issue #90 §9),
# sem mudar a lógica de roteamento.
MODEL_IDS: dict[ModelTier, str] = {
    ModelTier.FAST: "claude-haiku-4-5-20251001",
    ModelTier.STANDARD: "claude-sonnet-5",
    ModelTier.DEEP: "claude-opus-5",
}

# Nesta V2 (OBSERVE), DEEP fica desabilitado por padrão — Issue #95:
# "DEEP desabilitado por padrão nesta V2." Ligar exige decisão futura, não
# uma flag que este código vira sozinho.
DEEP_ENABLED_DEFAULT = False


@dataclass(frozen=True)
class ModelChoice:
    tier: ModelTier
    model_id: str
    reason: str
    deep_blocked: bool = False

    def to_dict(self) -> dict:
        return {
            "tier": self.tier.value,
            "model_id": self.model_id,
            "reason": self.reason,
            "deep_blocked": self.deep_blocked,
        }


def resolve(tier: ModelTier, *, deep_enabled: bool = DEEP_ENABLED_DEFAULT) -> ModelChoice:
    """Resolve um nível lógico para o model id atual.

    Se ``tier`` for DEEP e ``deep_enabled`` for False (o padrão desta V2),
    a escolha REBAIXA para STANDARD e sinaliza ``deep_blocked=True`` — o
    chamador nunca perde a informação de que DEEP foi pedido, mas o
    pipeline não dispara o modelo mais caro sem decisão explícita.
    """
    if tier is ModelTier.DEEP and not deep_enabled:
        return ModelChoice(
            tier=ModelTier.STANDARD,
            model_id=MODEL_IDS[ModelTier.STANDARD],
            reason=(
                "DEEP foi indicado pela classificação, mas está desabilitado por "
                "padrão nesta V2 (Issue #95). Rebaixado para STANDARD."
            ),
            deep_blocked=True,
        )
    return ModelChoice(
        tier=tier,
        model_id=MODEL_IDS[tier],
        reason=f"Nível {tier.value} resolvido para {MODEL_IDS[tier]}.",
    )
