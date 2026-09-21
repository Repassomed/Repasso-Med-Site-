"""Leitura estrutural de um arquivo de matéria.

Este módulo existe por um motivo só: as 30 matérias do Repasso Med **não usam
a mesma convenção**. Um levantamento feito sobre a main em 2026-09-20 mostrou:

    10 620 quiz-item no total, mas só 3 036 com atributo ``id`` (29 %)
    2 matérias usam a convenção de gémea ``-bk`` (fisiopatologia-ii, toxicologia)
    11 matérias não têm seção de banco
    1 matéria (semiologia) não tem nenhum quiz-item

Por isso o parser **não presume** nada. Ele descobre o que o arquivo usa e
reporta só o que dá para medir. Um verificador que exigisse ``id`` em toda
questão reprovaria 21 matérias por uma convenção que elas nunca adotaram — e
um verificador que reprova o que está certo é pior do que nenhum.

Nada aqui interpreta conteúdo médico. São contagens e estruturas.
"""

from __future__ import annotations

import html as _html
import re
from dataclasses import dataclass, field

# --------------------------------------------------------------------------
# Tags que não fecham. Inclui as de SVG, porque as matérias trazem esquemas
# SVG inline e um balanceador ingênuo acusaria erro em todas elas.
# --------------------------------------------------------------------------
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
    # SVG e afins
    "animate", "animatetransform", "circle", "clippath", "defs", "desc",
    "ellipse", "feblend", "fecolormatrix", "fegaussianblur", "femerge",
    "femergenode", "feoffset", "filter", "g", "lineargradient", "line",
    "marker", "mask", "path", "pattern", "polygon", "polyline", "radialgradient",
    "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title",
    "tspan", "use",
}

RE_QUIZ_ITEM = re.compile(r'<div[^>]*class="[^"]*\bquiz-item\b[^"]*"[^>]*>', re.I)
RE_ID_ATTR = re.compile(r'\sid="([^"]+)"')
RE_ANY_ID = re.compile(r'\sid="([^"]+)"')
RE_FLASHCARD = re.compile(r'class="[^"]*\bflashcard\b[^"]*"', re.I)
RE_SECTION_ID = re.compile(r'<section[^>]*\sid="([^"]+)"', re.I)
RE_HREF_ANCHOR = re.compile(r'href="#([^"]+)"')
RE_IMG_SRC = re.compile(r'<img[^>]+src="([^"]+)"', re.I)
RE_CSS_URL = re.compile(r'url\(\s*([^)\s]+?)\s*\)', re.I)
RE_OPTION_LI = re.compile(r"<li[^>]*>(.*?)</li>", re.I | re.S)
RE_STRONG = re.compile(r"<strong[^>]*>(.*?)</strong>", re.I | re.S)
RE_LETTER = re.compile(r"^\s*([a-eA-E])\s*[\)\.\-:]")
RE_TAG = re.compile(r"<[^>]+>")
RE_WS = re.compile(r"\s+")

# Seção que funciona como banco geral. Os slugs variam bastante entre matérias
# (bancofp2, banconeu, s2-banco…), por isso a busca é por substring.
RE_BANK_SECTION = re.compile(r'<section[^>]*\sid="([^"]*banc[^"]*)"', re.I)


def _plain(fragment: str) -> str:
    """Texto visível de um fragmento de HTML, com espaços normalizados."""
    return RE_WS.sub(" ", _html.unescape(RE_TAG.sub(" ", fragment))).strip()


def _div_end(text: str, start: int) -> int:
    """Fim do ``<div>`` que começa em ``start``, por contagem de profundidade."""
    depth = 0
    for m in re.finditer(r"<div\b|</div>", text[start:]):
        if m.group(0) == "</div>":
            depth -= 1
            if depth == 0:
                return start + m.end()
        else:
            depth += 1
    return len(text)


@dataclass
class Question:
    """Uma questão. Os campos opcionais ficam ``None`` quando a matéria não os usa."""

    index: int
    qid: str | None
    section: str | None
    is_bank: bool
    stem: str
    options: list[str] = field(default_factory=list)
    answer_letter: str | None = None
    answer_text: str = ""

    @property
    def key(self) -> str:
        """Chave estável para parear base e head.

        Prefere o ``id``. Quando não há ``id`` — o caso da maioria das matérias —
        cai no enunciado normalizado, que é estável o bastante para detectar
        remoção de questão sem gerar falso positivo por reordenação.
        """
        if self.qid:
            return f"id:{self.qid}"
        return "stem:" + RE_WS.sub("", self.stem.lower())[:160]


@dataclass
class MateriaDoc:
    path: str
    raw: str
    questions: list[Question]
    section_ids: list[str]
    all_ids: list[str]
    flashcards: int
    bank_section: str | None
    assets: list[str]
    anchors: list[str]

    # --- propriedades derivadas ------------------------------------------
    @property
    def body_questions(self) -> list[Question]:
        return [q for q in self.questions if not q.is_bank]

    @property
    def bank_questions(self) -> list[Question]:
        return [q for q in self.questions if q.is_bank]

    @property
    def uses_ids(self) -> bool:
        return any(q.qid for q in self.questions)

    @property
    def uses_bk_convention(self) -> bool:
        return any(q.qid and q.qid.endswith("-bk") for q in self.questions)

    @property
    def has_bank(self) -> bool:
        return self.bank_section is not None

    def duplicate_ids(self) -> list[str]:
        seen: dict[str, int] = {}
        for i in self.all_ids:
            seen[i] = seen.get(i, 0) + 1
        return sorted(k for k, v in seen.items() if v > 1)


def parse(path: str, raw: str) -> MateriaDoc:
    """Lê um arquivo de matéria e devolve a estrutura que dá para medir."""
    section_ids = RE_SECTION_ID.findall(raw)
    bank_match = RE_BANK_SECTION.search(raw)
    bank_section = bank_match.group(1) if bank_match else None

    # Offset em que o banco começa; questões depois disso contam como banco.
    bank_start = bank_match.start() if bank_match else None

    # Mapa offset -> section id, para localizar cada questão.
    section_starts = [(m.start(), m.group(1)) for m in RE_SECTION_ID.finditer(raw)]

    def section_of(pos: int) -> str | None:
        found = None
        for start, sid in section_starts:
            if start <= pos:
                found = sid
            else:
                break
        return found

    questions: list[Question] = []
    for i, m in enumerate(RE_QUIZ_ITEM.finditer(raw)):
        start = m.start()
        end = _div_end(raw, start)
        block = raw[start:end]

        id_match = RE_ID_ATTR.search(m.group(0))
        qid = id_match.group(1) if id_match else None

        # É banco se o id termina em -bk, ou se está fisicamente dentro da
        # seção de banco. As duas convenções coexistem no repositório.
        is_bank = bool(qid and qid.endswith("-bk"))
        if not is_bank and bank_start is not None and start >= bank_start:
            is_bank = True

        stem_match = re.search(r'class="quiz-question"[^>]*>(.*?)</p>', block, re.S)
        stem = _plain(stem_match.group(1)) if stem_match else _plain(block[:300])

        options = [_plain(o) for o in RE_OPTION_LI.findall(block)]
        # Só conta como alternativa o <li> que começa com letra. Algumas
        # matérias usam <li> para listas dentro da explicação.
        options = [o for o in options if RE_LETTER.match(o)]

        answer_letter = None
        answer_text = ""
        ans_pos = block.find('class="answer"')
        if ans_pos >= 0:
            ans_fragment = block[ans_pos:]
            strong = RE_STRONG.search(ans_fragment)
            if strong:
                answer_text = _plain(strong.group(1))
                lm = RE_LETTER.match(answer_text)
                if lm:
                    answer_letter = lm.group(1).lower()

        questions.append(
            Question(
                index=i,
                qid=qid,
                section=section_of(start),
                is_bank=is_bank,
                stem=stem,
                options=options,
                answer_letter=answer_letter,
                answer_text=answer_text,
            )
        )

    assets = sorted(set(RE_IMG_SRC.findall(raw)) | {
        u.strip("'\"") for u in RE_CSS_URL.findall(raw)
    })
    assets = [a for a in assets if a.startswith("/assets/") or a.startswith("assets/")]

    return MateriaDoc(
        path=path,
        raw=raw,
        questions=questions,
        section_ids=section_ids,
        all_ids=RE_ANY_ID.findall(raw),
        flashcards=len(RE_FLASHCARD.findall(raw)),
        bank_section=bank_section,
        assets=assets,
        anchors=sorted(set(RE_HREF_ANCHOR.findall(raw))),
    )


def unbalanced_tags(raw: str) -> list[str]:
    """Tags que não fecham, ignorando as vazias e as auto-fechadas.

    Devolve uma lista curta de descrições. Lista vazia significa HTML
    equilibrado do ponto de vista de aninhamento simples.
    """
    stack: list[str] = []
    problems: list[str] = []
    for m in re.finditer(r"<(/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(/?)>", raw):
        closing, tag, self_closing = m.group(1), m.group(2).lower(), m.group(3)
        if tag in VOID_TAGS or self_closing == "/":
            continue
        if not closing:
            stack.append(tag)
        else:
            if stack and stack[-1] == tag:
                stack.pop()
            elif tag in stack:
                # Fecha saltando níveis: desempilha até encontrar.
                while stack and stack[-1] != tag:
                    problems.append(f"<{stack[-1]}> não foi fechada antes de </{tag}>")
                    stack.pop()
                if stack:
                    stack.pop()
            else:
                problems.append(f"</{tag}> sem abertura correspondente")
            if len(problems) > 12:
                break
    for tag in stack[:12]:
        problems.append(f"<{tag}> ficou aberta")
    return problems
