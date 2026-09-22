"""Bloco de custo visível nos checkpoints (Issue #99, achado B2 da
auditoria independente do PR #104, rodada 2: "custos ainda não aparecem
nos checkpoints").

Regra absoluta desta unidade: ESTIMATIVA-ANTES-DA-CHAMADA e
CALCULADO-A-PARTIR-DO-USAGE nunca se confundem no texto, e nenhum dos
dois é chamado de "REAL" sozinho. ``estimated_usd`` só existe quando o
pipeline sabe o custo ANTES de uma chamada acontecer (ou quando nenhuma
chamada foi tentada, e por isso é sempre ``0.0``/zero); ``actual_usd`` só
existe quando a própria API devolveu ``usage`` de verdade — mas mesmo
nesse caso o valor em dólar continua sendo um CÁLCULO local (tokens
medidos × tabela de preço fixa em ``budget.py::_PRICE_PER_MTOK_USD``),
não um valor que a Anthropic confirma ou cobra de volta (achado B2 da
auditoria independente do PR #104, rodada 4: chamar isso de "REAL"
sugeria uma cobrança confirmada pelo provedor, quando na verdade só os
TOKENS são medidos/reais — o preço em USD é sempre derivado). Este
módulo não inventa nenhum número novo, só formata o que já existe em
``UsageRecord`` (``budget.py``/``anthropic_client.py``). O teto mensal
continua em USD (``budget.MONTHLY_BUDGET_USD``); a conversão para BRL é
só informativa, com taxa e data explícitas — nunca usada para decidir
nada.
"""

from __future__ import annotations

from dataclasses import dataclass

from .budget import MONTHLY_BUDGET_USD, UsageLedger


@dataclass(frozen=True)
class CostSummary:
    estimated_usd: float | None
    actual_usd: float | None
    month_to_date_usd: float
    monthly_budget_usd: float
    tier: str | None
    model_id: str | None
    calls_this_task: int
    brl_rate: float
    brl_rate_date: str

    def to_dict(self) -> dict:
        return {
            "estimated_usd": self.estimated_usd,
            "actual_usd": self.actual_usd,
            "month_to_date_usd": round(self.month_to_date_usd, 6),
            "monthly_budget_usd": self.monthly_budget_usd,
            "tier": self.tier,
            "model_id": self.model_id,
            "calls_this_task": self.calls_this_task,
            "brl_rate": self.brl_rate,
            "brl_rate_date": self.brl_rate_date,
        }


def montar_resumo_custo(*, ledger: UsageLedger, brl_rate: float, brl_rate_date: str,
                         estimated_usd: float | None = None, actual_usd: float | None = None,
                         tier: str | None = None, model_id: str | None = None,
                         calls_this_task: int = 0) -> CostSummary:
    return CostSummary(
        estimated_usd=estimated_usd,
        actual_usd=actual_usd,
        month_to_date_usd=ledger.month_to_date_usd(),
        monthly_budget_usd=MONTHLY_BUDGET_USD,
        tier=tier,
        model_id=model_id,
        calls_this_task=calls_this_task,
        brl_rate=brl_rate,
        brl_rate_date=brl_rate_date,
    )


def _fmt_usd(valor: float) -> str:
    return f"US$ {valor:.6f}"


def _fmt_brl(valor_usd: float, taxa: float) -> str:
    return f"≈ R$ {valor_usd * taxa:.4f}"


def render_cost_block(resumo: CostSummary) -> str:
    L = ["**API**"]
    if resumo.estimated_usd is not None:
        L.append(
            f"- custo ESTIMADO desta tarefa/evento: {_fmt_usd(resumo.estimated_usd)} "
            f"({_fmt_brl(resumo.estimated_usd, resumo.brl_rate)})"
        )
    if resumo.actual_usd is not None:
        L.append(
            f"- custo CALCULADO a partir do usage medido pela API desta chamada: "
            f"{_fmt_usd(resumo.actual_usd)} ({_fmt_brl(resumo.actual_usd, resumo.brl_rate)}) "
            "— tokens medidos × tabela de preço local, não uma cobrança confirmada pelo provedor"
        )
    else:
        L.append("- custo CALCULADO: nenhuma chamada com usage medido nesta execução")
    L.append(
        f"- gasto acumulado do mês: {_fmt_usd(resumo.month_to_date_usd)} / "
        f"US$ {resumo.monthly_budget_usd:.2f} ({_fmt_brl(resumo.month_to_date_usd, resumo.brl_rate)} / "
        f"{_fmt_brl(resumo.monthly_budget_usd, resumo.brl_rate)})"
    )
    if resumo.tier:
        L.append(f"- modelo/tier: {resumo.tier} ({resumo.model_id or '-'})")
    L.append(f"- chamadas pagas desta tarefa: {resumo.calls_this_task}")
    L.append(
        f"- conversão BRL informativa · taxa {resumo.brl_rate} (data {resumo.brl_rate_date}) — "
        "o teto continua sendo em USD"
    )
    return "\n".join(L)


def render_provider_totals(*, anthropic_month_to_date_usd: float, openai_month_to_date_usd: float) -> str:
    """Issue #106: "Mostrar depois: Anthropic: US$X, OpenAI: US$Y, Total:
    US$Z" — os dois ledgers são SEPARADOS (nunca somados na origem, ver
    ``coordinator/openai_budget.py``); esta é a única função que combina os
    dois números, e só para EXIBIÇÃO — nenhuma decisão de orçamento lê este
    total combinado, cada provider continua checando só o próprio teto."""
    total = anthropic_month_to_date_usd + openai_month_to_date_usd
    return "\n".join([
        "**Custo combinado por provider (acumulado do mês):**",
        f"- Anthropic: {_fmt_usd(anthropic_month_to_date_usd)}",
        f"- OpenAI: {_fmt_usd(openai_month_to_date_usd)}",
        f"- Total: {_fmt_usd(total)}",
    ])
