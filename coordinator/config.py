"""Configuração e o portão de segurança do Coordinator.

**Este módulo é a primeira linha de defesa da Issue #95.** Antes de qualquer
classificação, roteamento ou chamada à Anthropic, o pipeline consulta
``Config.gate()``. Se o portão não abrir, nada mais roda — nem a
classificação determinística, e certamente nenhuma chamada de rede.

Duas variáveis, lidas do ambiente (GitHub Actions Variables em produção,
nunca hardcoded):

    REPASSO_COORDINATOR_ENABLED   "true" | "false" (padrão: "false")
    REPASSO_COORDINATOR_MODE      "observe" | qualquer outro (padrão: "observe")

Regra desta V2, absoluta:

    ENABLED != "true"   -> BLOCKED, 0 chamadas, sempre.
    MODE    != "observe"-> BLOCKED, 0 chamadas, sempre — mesmo com ENABLED=true.

A comparação é estrita e sensível a maiúsculas/minúsculas SÓ para "true"
(evita "True"/"TRUE"/"1" ativarem por acidente uma variável do GitHub que
alguém digitou errado — errar para o lado seguro é o objetivo). Qualquer
valor que não seja exatamente a string ``"true"`` conta como desligado.

**Modo PILOTO (bloqueador 3 da terceira auditoria do PR #97).** Antes do
primeiro teste real, é preciso garantir tecnicamente que só UM evento
controlado pode gerar chamada — não os três gatilhos automáticos de uma
vez. Duas variáveis adicionais, opcionais:

    REPASSO_COORDINATOR_PILOT             "true" | "false" (padrão: "false")
    REPASSO_COORDINATOR_PILOT_EVENT_KEY   a dedup_key() exata do ÚNICO
                                           evento autorizado (padrão: nenhum)

Enquanto ``PILOT`` for ``"true"``, ``Config.pilot_allows(chave)`` só devolve
``True`` para a chave exata configurada — qualquer outro evento (mesmo que
o portão ENABLED/MODE esteja aberto e o orçamento permita) fica bloqueado.
``PILOT="false"`` (o padrão) não impõe restrição nenhuma além do portão de
sempre. Isto é aditivo: nunca afrouxa o gate ENABLED/MODE, só pode
restringir mais.

**MODE="active-supervised" (V3, Issue #99).** Além de ``"observe"``, esta
V3 introduz um segundo valor permitido para ``REPASSO_COORDINATOR_MODE``.
É estritamente ADITIVO — a produção de hoje roda com
``MODE=observe`` (comportamento V2, sem nenhuma mudança), e só passa a
usar a nova camada de capacidades (auditoria semântica real, comentário
automático, Cartão de Merge) quando José decidir explicitamente trocar a
Variable para ``active-supervised``. Enquanto isso não acontecer, todo o
código novo desta V3 fica inerte pelo mesmo motivo que ``ENABLED=false``
deixa a V2 inerte: o portão é a primeira coisa checada, sempre. Qualquer
valor fora de ``ALLOWED_MODES`` continua BLOCKED, como antes.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


ENV_ENABLED = "REPASSO_COORDINATOR_ENABLED"
ENV_MODE = "REPASSO_COORDINATOR_MODE"
ENV_PILOT = "REPASSO_COORDINATOR_PILOT"
ENV_PILOT_EVENT_KEY = "REPASSO_COORDINATOR_PILOT_EVENT_KEY"
# Rodada 3 (Issue #99, "custos visíveis"): conversão BRL informativa —
# nunca usada para decidir nada, só para exibir no checkpoint ao lado do
# valor real em USD (o teto mensal continua em USD). Taxa/data com
# default explícito (baseline registrado por José em 21/09/2026, Issue
# #99 comentário 3) para que o texto nunca minta sobre "de quando" é a
# taxa — configurável via Variable quando José quiser atualizar.
ENV_BRL_RATE = "REPASSO_COORDINATOR_BRL_RATE"
ENV_BRL_RATE_DATE = "REPASSO_COORDINATOR_BRL_RATE_DATE"
DEFAULT_BRL_RATE = 5.11
DEFAULT_BRL_RATE_DATE = "2026-09-21"

ALLOWED_MODE = "observe"
# V3 (Issue #99): segundo modo permitido, aditivo — ver o comentário acima.
ACTIVE_SUPERVISED_MODE = "active-supervised"
ALLOWED_MODES = frozenset({ALLOWED_MODE, ACTIVE_SUPERVISED_MODE})


@dataclass(frozen=True)
class Config:
    enabled: bool
    mode: str
    pilot: bool = False
    pilot_event_key: str | None = None
    brl_rate: float = DEFAULT_BRL_RATE
    brl_rate_date: str = DEFAULT_BRL_RATE_DATE

    @property
    def mode_allowed(self) -> bool:
        return self.mode in ALLOWED_MODES

    @property
    def is_active_supervised(self) -> bool:
        """Liga a camada de capacidades da V3 (auditoria semântica real,
        comentário automático, Cartão de Merge) — só quando o portão
        ENABLED/MODE já está aberto E o modo é exatamente
        ``active-supervised``. Em ``observe`` (o modo de produção hoje)
        isto é sempre ``False``, preservando byte a byte o comportamento
        já em produção."""
        return self.mode == ACTIVE_SUPERVISED_MODE

    def pilot_allows(self, event_key: str) -> bool:
        """Segunda camada de restrição, só ativa quando PILOT=true.

        Com PILOT desligado (padrão), devolve sempre True — não restringe
        nada além do portão ENABLED/MODE. Com PILOT ligado, só a chave
        exata configurada em ``pilot_event_key`` passa; qualquer outra
        (mesmo de um tipo de evento permitido, mesmo com o portão aberto)
        fica bloqueada — é assim que "exatamente um evento controlado" se
        torna uma garantia de código, não uma promessa.
        """
        if not self.pilot:
            return True
        return bool(self.pilot_event_key) and event_key == self.pilot_event_key

    def gate(self) -> "GateResult":
        """A decisão de segurança. Chamado antes de qualquer outra coisa."""
        if not self.mode_allowed:
            return GateResult(
                open=False,
                reason=(
                    f"REPASSO_COORDINATOR_MODE={self.mode!r} não é um dos modos "
                    f"permitidos ({sorted(ALLOWED_MODES)!r}). Qualquer outro modo "
                    "fica bloqueado, mesmo que ENABLED=true."
                ),
            )
        if not self.enabled:
            return GateResult(
                open=False,
                reason=(
                    f"{ENV_ENABLED}=false (ou ausente). Nenhuma chamada externa é "
                    "permitida enquanto o portão estiver fechado."
                ),
            )
        return GateResult(open=True, reason=f"ENABLED=true e MODE={self.mode!r}: portão aberto.")

    @classmethod
    def from_env(cls, env: dict | None = None) -> "Config":
        """Lê a config do ambiente. ``env`` é injetável para teste."""
        src = env if env is not None else os.environ
        enabled_raw = src.get(ENV_ENABLED, "false")
        mode_raw = src.get(ENV_MODE, ALLOWED_MODE)
        pilot_raw = src.get(ENV_PILOT, "false")
        pilot_event_key = src.get(ENV_PILOT_EVENT_KEY) or None
        try:
            brl_rate = float(src.get(ENV_BRL_RATE) or DEFAULT_BRL_RATE)
        except ValueError:
            brl_rate = DEFAULT_BRL_RATE
        brl_rate_date = src.get(ENV_BRL_RATE_DATE) or DEFAULT_BRL_RATE_DATE
        return cls(
            enabled=(enabled_raw == "true"),
            mode=mode_raw,
            pilot=(pilot_raw == "true"),
            pilot_event_key=pilot_event_key,
            brl_rate=brl_rate,
            brl_rate_date=brl_rate_date,
        )


@dataclass(frozen=True)
class GateResult:
    open: bool
    reason: str
