"""Relatório estruturado da Lei das Questões (8-A.11).

O worker nunca escreve este relatório na matéria. Ele devolve dados tipados
junto do patch; o Runner valida e renderiza Markdown determinístico para o
corpo da PR. Assim Guard + Anthropic + OpenAI veem a mesma proveniência sem
confiar em prosa livre para decidir se o relatório obrigatório existe.
"""

from __future__ import annotations

COVERAGE_CONFIRMATION = "RESUMO ENSINA → QUESTÃO COBRA → EXPLICAÇÃO REFORÇA"
MAX_SOURCES = 24
MAX_CELL_CHARS = 500
MAX_NOTES_CHARS = 3000
MAX_DEFERRED_ITEMS = 40
MAX_DEFERRED_ITEM_CHARS = 500
MAX_RENDERED_CHARS = 18000

_COUNTER_FIELDS = (
    "detected",
    "used",
    "new",
    "reformulated",
    "duplicates",
    "reconstructed",
    "complementary",
    "pending",
)

QUESTION_REPORT_JSON_SCHEMA = (
    '"question_report": {'
    '"sources": [{'
    '"source": "<fonte>", '
    '"page_or_image": "<página/imagem/identificador>", '
    '"legibility": "<integral|parcial|visual-confirmada|não aproveitada>", '
    '"detected": 0, "used": 0, "new": 0, "reformulated": 0, '
    '"duplicates": 0, "reconstructed": 0, "complementary": 0, "pending": 0, '
    '"site_destination": "<bloco/seção/banco geral>"'
    '}], '
    '"deferred_items": [{"item": "<Q/item>", "reason": "<motivo objetivo>", '
    '"fallback": "<não publicada|convertida em Pregunta complementaria|outro fallback seguro>"}], '
    f'"coverage_confirmation": "{COVERAGE_CONFIRMATION}", '
    '"notes": "<opcional; limitações/decisões de proveniência>"'
    '}'
)


def _cell(value: object, *, field: str, max_chars: int = MAX_CELL_CHARS) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} precisa ser texto não-vazio.")
    text = " ".join(value.strip().split())
    if len(text) > max_chars:
        raise ValueError(f"{field} excede {max_chars} caracteres.")
    return text.replace("|", "\\|")


def _count(value: object, *, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"{field} precisa ser inteiro >= 0.")
    return value


def render_question_report(raw: object) -> str:
    """Valida o objeto retornado pelo worker e produz Markdown 8-A.11.

    Qualquer ausência/ambiguidade falha fechado. O relatório é evidência
    editorial; nunca amplia allowed_files nem concede permissão ao worker.
    """
    if not isinstance(raw, dict):
        raise ValueError("question_report precisa ser objeto JSON.")

    sources = raw.get("sources")
    if not isinstance(sources, list) or not sources:
        raise ValueError("question_report.sources precisa ter ao menos uma fonte.")
    if len(sources) > MAX_SOURCES:
        raise ValueError(f"question_report.sources excede o máximo de {MAX_SOURCES} fontes.")

    coverage = raw.get("coverage_confirmation")
    if coverage != COVERAGE_CONFIRMATION:
        raise ValueError(
            "coverage_confirmation precisa ser exatamente "
            f"{COVERAGE_CONFIRMATION!r}."
        )

    rows: list[str] = []
    for index, item in enumerate(sources, 1):
        if not isinstance(item, dict):
            raise ValueError(f"sources[{index}] precisa ser objeto.")
        source = _cell(item.get("source"), field=f"sources[{index}].source")
        page_image = _cell(item.get("page_or_image"), field=f"sources[{index}].page_or_image")
        legibility = _cell(item.get("legibility"), field=f"sources[{index}].legibility")
        destination = _cell(item.get("site_destination"), field=f"sources[{index}].site_destination")
        counts = {
            key: _count(item.get(key), field=f"sources[{index}].{key}")
            for key in _COUNTER_FIELDS
        }
        rows.append(
            "| "
            + " | ".join(
                [
                    source,
                    page_image,
                    legibility,
                    str(counts["detected"]),
                    str(counts["used"]),
                    str(counts["new"]),
                    str(counts["reformulated"]),
                    str(counts["duplicates"]),
                    str(counts["reconstructed"]),
                    str(counts["complementary"]),
                    str(counts["pending"]),
                    destination,
                ]
            )
            + " |"
        )

    deferred_raw = raw.get("deferred_items")
    deferred_lines: list[str] = []
    if deferred_raw is not None:
        if not isinstance(deferred_raw, list):
            raise ValueError("question_report.deferred_items precisa ser lista quando informado.")
        if len(deferred_raw) > MAX_DEFERRED_ITEMS:
            raise ValueError(
                f"question_report.deferred_items excede o máximo de {MAX_DEFERRED_ITEMS} itens."
            )
        for index, item in enumerate(deferred_raw, 1):
            if not isinstance(item, dict):
                raise ValueError(f"deferred_items[{index}] precisa ser objeto.")
            nome = _cell(
                item.get("item"), field=f"deferred_items[{index}].item",
                max_chars=MAX_DEFERRED_ITEM_CHARS,
            )
            motivo = _cell(
                item.get("reason"), field=f"deferred_items[{index}].reason",
                max_chars=MAX_DEFERRED_ITEM_CHARS,
            )
            fallback = _cell(
                item.get("fallback"), field=f"deferred_items[{index}].fallback",
                max_chars=MAX_DEFERRED_ITEM_CHARS,
            )
            deferred_lines.append(f"- **{nome}** — {motivo} · **Fallback:** {fallback}")

    notes_raw = raw.get("notes")
    notes = ""
    if notes_raw is not None:
        if not isinstance(notes_raw, str):
            raise ValueError("question_report.notes precisa ser texto quando informado.")
        notes = " ".join(notes_raw.strip().split())
        if len(notes) > MAX_NOTES_CHARS:
            raise ValueError(f"question_report.notes excede {MAX_NOTES_CHARS} caracteres.")

    lines = [
        "## Relatório obrigatório — Lei das Questões (8-A.11)",
        "",
        "### Matriz por fonte",
        "",
        "| Fonte | Página/imagem | Legibilidade | Detectadas | Aproveitadas | Novas | Reformuladas | Duplicadas/canônicas | Reconstruídas | Complementares | Pendentes | Destino no site |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
        *rows,
        "",
        f"**Confirmação de cobertura:** {COVERAGE_CONFIRMATION}",
    ]
    if deferred_lines:
        lines += ["", "### Pendências diferidas", "", *deferred_lines]
    if notes:
        lines += ["", f"**Notas de proveniência:** {notes}"]

    rendered = "\n".join(lines)
    if len(rendered) > MAX_RENDERED_CHARS:
        raise ValueError(f"relatório renderizado excede {MAX_RENDERED_CHARS} caracteres.")
    return rendered
