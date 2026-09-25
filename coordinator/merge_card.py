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

from .github_event import AUDIT_POLICY_VERSION, COORDINATOR_COMMENT_MARKER

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


def aplicar_gate_openai(decisao: str, *, openai_decision: str | None,
                         openai_rationale: str | None) -> tuple[str, str | None]:
    """Gate final obrigatório do OpenAI Auditor (Issue #106).

    Para conteúdo médico-didático em active-supervised, MERGE-READY exige
    CONCORDÂNCIA explícita das duas auditorias independentes: Anthropic e
    OpenAI. O OpenAI nunca promove um NEEDS-FIX da Anthropic. Se a Anthropic
    aprovou, porém o OpenAI não rodou/não produziu decisão utilizável, o
    resultado é NEEDS-FIX por fail-closed — ausência de auditoria nunca é
    aprovação. Só Anthropic=MERGE-READY + OpenAI=MERGE-READY preserva o
    MERGE-READY final."""
    if decisao != "MERGE-READY":
        return decisao, None
    if openai_decision is None:
        return "NEEDS-FIX", (
            "OpenAI Auditor obrigatório não produziu aprovação explícita; "
            "conteúdo didático só pode ser MERGE-READY quando Anthropic e "
            "OpenAI Auditor aprovarem o mesmo checkpoint."
        )
    if openai_decision != "MERGE-READY":
        return "NEEDS-FIX", (
            "O OpenAI Auditor (aval final independente, Issue #106) recomendou "
            f"NEEDS-FIX: {openai_rationale or '-'}"
        )
    return "MERGE-READY", None


def aplicar_gate_diff(decisao: str, *, diff_disponivel: bool, diff_truncado: bool) -> tuple[str, str | None]:
    """Gate determinístico B2 (auditoria independente do PR #104): um
    auditor não pode certificar MERGE-READY sem ter visto o diff real
    inteiro. Só rebaixa MERGE-READY (nunca promove NEEDS-FIX), e só quando
    ele de fato foi a decisão — mesmo padrão de ``aplicar_lei_das_questoes``.
    Devolve (decisão, nota) — nota é ``None`` quando nada mudou."""
    if decisao != "MERGE-READY":
        return decisao, None
    if not diff_disponivel:
        return "NEEDS-FIX", (
            "Nenhum diff real da PR foi fornecido a esta auditoria — o corpo da "
            "PR sozinho não é evidência suficiente para MERGE-READY (Issue #99, "
            "correção B2 da auditoria independente do PR #104)."
        )
    if diff_truncado:
        return "NEEDS-FIX", (
            "O diff real da PR foi truncado antes de chegar à auditoria — não "
            "há garantia de que a mudança inteira foi revisada; tratado como "
            "NEEDS-FIX por segurança."
        )
    return decisao, None


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
    # SHA exato do HEAD da PR que Guard + auditores avaliaram. O Worker
    # Bridge usa este vínculo para nunca aplicar um NEEDS-FIX antigo sobre
    # um commit novo e para reconciliar runtime atrasado sem adivinhar.
    head_sha: str | None = None
    arquivos_alterados: tuple[str, ...] = ()
    protocol_matched: bool = True
    # Correção B3 da auditoria independente do PR #104, rodada 3: custo
    # visível também em NEEDS-FIX/MERGE-READY, não só nos checkpoints
    # zero-custo da Inbox — texto já pronto (``costs.render_cost_block``),
    # nunca recalculado aqui.
    cost_block: str | None = None
    # OpenAI Auditor (Issue #106) — todos ``None``/vazios quando o auditor
    # não rodou (desabilitado, roteado para ZERO, ou bloqueado por
    # portão/orçamento/limite). ``openai_decision`` já é a decisão
    # ESTRUTURADA reportada pelo auditor (nunca a decisão final do
    # cartão — essa é ``audit_decision`` acima, já com
    # ``aplicar_gate_openai`` aplicado).
    openai_decision: str | None = None  # "MERGE-READY" | "NEEDS-FIX" | None
    openai_risk: str | None = None  # "NORMAL" | "HIGH" | None
    openai_rationale: str | None = None
    openai_findings: tuple[str, ...] = ()
    openai_didactic_findings: tuple[str, ...] = ()
    openai_protocol_matched: bool = True
    openai_cost_block: str | None = None
    combined_cost_block: str | None = None


def render_merge_card(dados: MergeCardInput) -> str:
    publicacao, motivo_publicacao = classificar_publicacao(list(dados.arquivos_alterados))
    alvo = _alvo_por_publicacao(publicacao, list(dados.arquivos_alterados))

    L: list[str] = []
    # Anti-self-loop (Issue #99, pedido explícito de José): sempre a
    # primeira linha, para que github_event.py::_from_issue_comment
    # reconheça e ignore qualquer comentário que ecoe este texto, mesmo
    # publicado pela mesma identidade GitHub usada por José/agentes.
    L.append(COORDINATOR_COMMENT_MARKER)
    L.append("## 🟣 CARTÃO DE MERGE — Coordinator V3 (auditoria automática, Issue #99)")
    L.append("")
    L.append(f"**PR:** #{dados.pr_number if dados.pr_number is not None else '-'}  ·  "
              f"**Título:** {dados.titulo or '-'}  ·  **Área:** {dados.area or '-'}")
    L.append(f"**Resultado do Guard:** {dados.guard_result or '-'}")
    L.append(f"**Política de auditoria:** `{AUDIT_POLICY_VERSION}`")
    if dados.head_sha:
        L.append(f"**HEAD auditado:** `{dados.head_sha}`")
    L.append("")
    L.append(f"**Decisão da auditoria semântica (STANDARD, independente do worker):** {dados.audit_decision}")
    if not dados.protocol_matched:
        # Esta frase é o marcador que o Worker Bridge usa para NUNCA mandar
        # um worker corrigir conteúdo por causa de falha técnica
        # (worker_bridge.AUDIT_TECHNICAL_FAILURE_MARKERS) — não reescrever.
        L.append(
            "⚠️ A resposta da auditoria não seguiu o protocolo esperado — "
            "decisão automaticamente rebaixada para NEEDS-FIX por segurança."
        )
        L.append(
            "🛠️ **AUDITOR-TECHNICAL-FAILURE** — falha técnica do Anthropic Auditor, "
            "**não** uma reprovação de conteúdo. Nenhuma alteração de matéria deve ser "
            "feita por causa deste item; a PR continua bloqueada até uma nova auditoria "
            "técnica do mesmo HEAD."
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

    if dados.openai_decision is not None:
        L.append("")
        icone_openai = "✅" if dados.openai_decision == "MERGE-READY" else "❌"
        L.append(
            f"**AVAL FINAL INDEPENDENTE — ChatGPT/OpenAI Auditor (Issue #106):** "
            f"{icone_openai} {dados.openai_decision}"
            + (f"  ·  **Risco:** {dados.openai_risk}" if dados.openai_risk else "")
        )
        if not dados.openai_protocol_matched:
            L.append(
                "⚠️ A resposta do OpenAI Auditor não seguiu o protocolo esperado — "
                "decisão automaticamente tratada como NEEDS-FIX por segurança."
            )
        if dados.openai_rationale:
            L.append(f"**Motivo (OpenAI):** {dados.openai_rationale}")
        if dados.openai_findings:
            L.append("**Achados (OpenAI):** " + "; ".join(dados.openai_findings))
        if dados.openai_didactic_findings:
            L.append("**Achados didáticos (OpenAI):** " + "; ".join(dados.openai_didactic_findings))
    elif dados.audit_decision == "NEEDS-FIX":
        L.append("")
        L.append(
            "**AVAL FINAL INDEPENDENTE — ChatGPT/OpenAI Auditor (Issue #106):** "
            "❌ NÃO OBTIDO — MERGE-READY bloqueado."
        )

    if dados.cost_block:
        L.append("")
        L.append(dados.cost_block)

    if dados.openai_cost_block:
        L.append("")
        L.append(dados.openai_cost_block)

    if dados.combined_cost_block:
        L.append("")
        L.append(dados.combined_cost_block)

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
