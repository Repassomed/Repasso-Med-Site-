"""Cartão de Merge da V3 (Issue #99): classificação de publicação + Lei das
Questões + renderização final para o José.

Três responsabilidades deliberadamente separadas nesta única unidade
(nunca chamadas de API, sempre determinísticas):

1. ``classificar_publicacao``   — "MERGE ≠ PUBLICAÇÃO" (Issue #99,
   comentário 2): decide SIM/NÃO/PODE AGUARDAR a partir só dos caminhos de
   arquivo alterados (do audit-pack do Guard), nunca por adivinhação.
2. ``avaliar_lei_das_questoes`` / ``aplicar_lei_das_questoes``  — a "Nova
   lei de questões para a V3" (Issue #99, comentário 1) e 8-A.11: nenhuma
   tarefa de prova pode virar MERGE-READY sem o relatório obrigatório por
   fonte já escrito no corpo da PR pelo worker. Isto é um GATE
   DETERMINÍSTICO — roda depois da auditoria semântica (LLM) e pode
   REBAIXAR um MERGE-READY para NEEDS-FIX, mas nunca o contrário (nunca
   promove NEEDS-FIX para MERGE-READY).
3. ``render_merge_card``        — o texto final, no mesmo espírito do
   🟣 CARTÃO DE MERGE do template de PR: para o José, não para outro
   programador, sem esconder dúvida atrás de "MERGE-READY".
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# 1. MERGE ≠ PUBLICAÇÃO (Issue #99, comentário 2)
# ---------------------------------------------------------------------------

# Caminhos que, se alterados, exigem deploy (servem o site/matéria direto).
# Deliberadamente SEM o caminho literal da raiz do site publicado aqui —
# este módulo só CLASSIFICA um caminho já recebido do audit-pack do
# Guard, nunca abre/edita nenhum arquivo (ver test_no_forbidden_writes.py:
# nenhum código-fonte do Coordinator pode conter esse literal, mesmo só
# para comparação de string — a extensão do arquivo já é suficiente para
# reconhecer conteúdo de matéria/site sem precisar do caminho da raiz).
_PUBLICACAO_SIM_SUFIXOS = (".html", ".css", ".js", ".mjs")
_PUBLICACAO_SIM_MARCADORES = ("netlify/functions/", "netlify.toml")

# Caminhos que só rodam dentro do GitHub Actions / são declarativos —
# nenhum efeito no site publicado.
_PUBLICACAO_NAO_PREFIXOS = ("coordination/", "coordinator/", ".github/", "docs/", "tools/qa/")
_PUBLICACAO_NAO_SUFIXOS = (".md",)


def _e_arquivo_de_site(caminho: str) -> bool:
    return (
        caminho.endswith(_PUBLICACAO_SIM_SUFIXOS)
        or any(marcador in caminho for marcador in _PUBLICACAO_SIM_MARCADORES)
    )


def _e_arquivo_so_de_coordenacao(caminho: str) -> bool:
    return caminho.startswith(_PUBLICACAO_NAO_PREFIXOS) or caminho.endswith(_PUBLICACAO_NAO_SUFIXOS)


def classificar_publicacao(arquivos_alterados: list[str]) -> tuple[str, str]:
    """Devolve (PUBLICAÇÃO, MOTIVO). PUBLICAÇÃO é sempre uma destas três
    strings: "SIM", "NÃO", "PODE AGUARDAR". Regra explícita da Issue #99:
    "se houver dúvida, classificar PUBLICAÇÃO=SIM" — por isso o caminho
    default (arquivos desconhecidos, ou lista vazia/ausente) é SIM, nunca
    NÃO; só uma correspondência clara com os prefixos/sufixos "só
    coordenação" abaixo produz NÃO."""
    if not arquivos_alterados:
        return "SIM", (
            "Nenhuma lista de arquivos alterados foi informada ao Coordinator — "
            "quando houver dúvida, classificar PUBLICAÇÃO=SIM (Issue #99)."
        )

    tocou_site = [c for c in arquivos_alterados if _e_arquivo_de_site(c)]
    if tocou_site:
        return "SIM", (
            "Arquivos que servem o site/matéria/Netlify Functions foram alterados: "
            + ", ".join(tocou_site[:10])
        )

    if all(_e_arquivo_so_de_coordenacao(c) for c in arquivos_alterados):
        return "NÃO", (
            "Só arquivos de documentação/coordenação/workflow foram alterados "
            "(" + ", ".join(arquivos_alterados[:10]) + ") — rodam apenas em "
            "GitHub Actions, sem efeito no site publicado."
        )

    return "SIM", (
        "Não foi possível classificar com certeza a partir dos caminhos "
        "alterados (" + ", ".join(arquivos_alterados[:10]) + ") — quando houver "
        "dúvida, classificar PUBLICAÇÃO=SIM (Issue #99)."
    )


def _alvo_por_publicacao(publicacao: str, arquivos_alterados: list[str]) -> str:
    if publicacao == "NÃO":
        return "somente GitHub Actions / documentação"
    if publicacao == "SIM" and arquivos_alterados and all(
        c.endswith(".md") or c.startswith((".github/", "docs/")) for c in arquivos_alterados
    ):
        return "documentação"
    return "Netlify/site"


# ---------------------------------------------------------------------------
# 2. Lei das Questões (8-A.11 + Issue #99, comentário 1)
# ---------------------------------------------------------------------------

# Cada marcador aqui corresponde a uma coluna/campo obrigatório do
# relatório de 8-A.11. Deliberadamente por palavra-chave/regex tolerante
# (nunca exige o rótulo byte-a-byte) — o que importa é que o CONTEÚDO
# exigido esteja presente no corpo da PR, não a formatação exata.
_MARCADORES_LEI_DAS_QUESTOES: dict[str, re.Pattern] = {
    "matriz_por_fonte": re.compile(r"matriz\s+por\s+fonte", re.I),
    "coluna_fonte": re.compile(r"\bfonte\b", re.I),
    "coluna_pagina_imagem": re.compile(r"p[áa]gina|imagem", re.I),
    "coluna_legibilidade": re.compile(r"legibilidade", re.I),
    "coluna_detectadas": re.compile(r"detectad", re.I),
    "coluna_aproveitadas": re.compile(r"aproveitad", re.I),
    "coluna_novas": re.compile(r"\bnovas?\b", re.I),
    "coluna_reformuladas": re.compile(r"reformulad", re.I),
    "coluna_duplicadas": re.compile(r"duplicad", re.I),
    "coluna_reconstruidas": re.compile(r"reconstru[íi]d", re.I),
    "coluna_pendentes": re.compile(r"pendente", re.I),
    "coluna_destino_no_site": re.compile(r"destino\s+no\s+site", re.I),
    "confirmacao_cobertura": re.compile(
        r"resumo\s+ensina.{0,30}quest[ãa]o\s+cobra.{0,30}explica[çc][ãa]o\s+refor[çc]a",
        re.I | re.S,
    ),
}


@dataclass(frozen=True)
class LeiDasQuestoesResult:
    satisfeita: bool
    faltando: tuple[str, ...]
    detalhe: str

    def to_dict(self) -> dict:
        return {"satisfeita": self.satisfeita, "faltando": list(self.faltando), "detalhe": self.detalhe}


def avaliar_lei_das_questoes(pr_body: str | None) -> LeiDasQuestoesResult:
    corpo = pr_body or ""
    faltando = tuple(
        nome for nome, regex in _MARCADORES_LEI_DAS_QUESTOES.items() if not regex.search(corpo)
    )
    if not faltando:
        return LeiDasQuestoesResult(
            satisfeita=True, faltando=(),
            detalhe="Relatório obrigatório da Lei das Questões (8-A.11) está presente no corpo da PR.",
        )
    return LeiDasQuestoesResult(
        satisfeita=False, faltando=faltando,
        detalhe=(
            "Faltam elementos obrigatórios do relatório da Lei das Questões "
            "(8-A.11 / Issue #99, 'Nova lei de questões para a V3') no corpo "
            "da PR: " + ", ".join(faltando) + ". Sem esse relatório completo, "
            "esta tarefa de prova/questões não pode ser marcada MERGE-READY."
        ),
    )


def aplicar_lei_das_questoes(decisao: str, *, envolve_questoes: bool,
                              pr_body: str | None) -> tuple[str, LeiDasQuestoesResult | None]:
    """Gate determinístico pós-auditoria. Só se aplica quando o próprio
    evento já sinalizou ``envolve_questoes=True`` (github_event.py); para
    qualquer outra tarefa, devolve a decisão da auditoria sem alteração e
    ``None`` (a Lei das Questões não se aplica). Quando se aplica e o
    relatório está incompleto, REBAIXA a decisão para NEEDS-FIX mesmo que
    a auditoria semântica tenha dito MERGE-READY — nunca o inverso."""
    if not envolve_questoes:
        return decisao, None
    resultado = avaliar_lei_das_questoes(pr_body)
    if resultado.satisfeita:
        return decisao, resultado
    return "NEEDS-FIX", resultado


# ---------------------------------------------------------------------------
# 3. Renderização do Cartão de Merge
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class MergeCardInput:
    pr_number: int | None
    titulo: str | None
    area: str | None
    guard_result: str | None
    audit_decision: str  # "MERGE-READY" | "NEEDS-FIX" (já com a Lei das Questões aplicada)
    audit_rationale: str
    envolve_questoes: bool
    lei_das_questoes: LeiDasQuestoesResult | None
    arquivos_alterados: tuple[str, ...] = ()
    protocol_matched: bool = True


def render_merge_card(dados: MergeCardInput) -> str:
    publicacao, motivo_publicacao = classificar_publicacao(list(dados.arquivos_alterados))
    alvo = _alvo_por_publicacao(publicacao, list(dados.arquivos_alterados))

    L: list[str] = []
    L.append("## 🟣 CARTÃO DE MERGE — Coordinator V3 (auditoria automática, Issue #99)")
    L.append("")
    L.append(f"**PR:** #{dados.pr_number if dados.pr_number is not None else '-'}  ·  "
              f"**Título:** {dados.titulo or '-'}  ·  **Área:** {dados.area or '-'}")
    L.append(f"**Resultado do Guard:** {dados.guard_result or '-'}")
    L.append("")
    L.append(f"**Decisão da auditoria semântica (STANDARD, independente do worker):** {dados.audit_decision}")
    if not dados.protocol_matched:
        L.append(
            "⚠️ A resposta da auditoria não seguiu o protocolo esperado — "
            "decisão automaticamente rebaixada para NEEDS-FIX por segurança."
        )
    L.append(f"**Motivo:** {dados.audit_rationale}")

    if dados.envolve_questoes:
        L.append("")
        satisfeita = bool(dados.lei_das_questoes and dados.lei_das_questoes.satisfeita)
        L.append(
            "**Lei das Questões (8-A.11):** "
            + ("✅ relatório obrigatório presente" if satisfeita else "❌ NÃO satisfeita — bloqueia MERGE-READY")
        )
        if dados.lei_das_questoes:
            L.append(dados.lei_das_questoes.detalhe)

    L.append("")
    L.append("**MERGE:** José decide/executa. O Coordinator nunca faz merge.")
    L.append(f"**PUBLICAÇÃO:** {publicacao}")
    L.append(f"**MOTIVO:** {motivo_publicacao}")
    L.append(f"**ALVO:** {alvo}")
    L.append(
        "**APÓS PUBLICAR:** smoke test mínimo — abrir a página/matéria alterada "
        "e confirmar que carrega sem erro visível no console; José confere, o "
        "Coordinator nunca publica/deploya automaticamente."
    )
    L.append("")
    L.append(
        "_Gerado automaticamente pelo Repasso Coordinator (V3, modo "
        "active-supervised). Não substitui a decisão do José — ele é a única "
        "pessoa autorizada a fazer merge desta ou de qualquer outra PR._"
    )
    return "\n".join(L)
