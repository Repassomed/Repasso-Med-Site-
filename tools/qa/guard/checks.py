"""As verificações do Repasso Guard.

**O princípio que organiza tudo aqui: o Guard julga o DELTA, não o estado
absoluto do repositório.**

Isso não é preferência de estilo, é consequência de um levantamento feito
sobre a main em 2026-09-20:

    7 das 30 matérias já têm HTML desbalanceado
    2 já têm id duplicado (anatomia-i, farmacologia-ii)

Um verificador que reprovasse o estado absoluto deixaria essas matérias
permanentemente vermelhas e ensinaria todo mundo a ignorar o Guard. Então a
regra é: **o PR responde pelo que o PR introduz.** O que já estava quebrado
vira INFO, para ficar registrado sem bloquear ninguém.

Severidades:

    HARD FAIL   quebra objetiva, mensurável, introduzida por este PR
    WARNING     precisa de olho humano antes do merge
    INFO        contexto; nunca bloqueia
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field

from . import materia

HARD_FAIL = "HARD FAIL"
WARNING = "WARNING"
INFO = "INFO"

# --------------------------------------------------------------------------
# Constantes de domínio
# --------------------------------------------------------------------------

MATERIA_DIR = "netlify/functions/materias-privadas/"

# Lei 8 — qualquer um destes eleva o risco e exige auditoria ampliada.
CRITICAL_PATTERNS = [
    r"assets/app-core\.js$",
    r"assets/appcore\.js$",
    r"assets/styles\.css$",
    r"(^|/)index\.html$",
    r"(^|/)admin\.html$",
    r"(^|/)netlify\.toml$",
    r"netlify/functions/[^/]+\.(js|ts|mjs)$",
]

# §8.1 do MANUTENCAO-DIDATICA: rótulos proibidos.
FORBIDDEN_LABELS = [
    (r"CAY[ÓO] EN EXAMEN", "«CAYÓ EN EXAMEN»"),
    (r"PRUEBA REAL", "«PRUEBA REAL»"),
    (r"Pregunta oficial", "«Pregunta oficial»"),
    (r"preguntas reales", "«preguntas reales»"),
    # "variante" como rótulo de quiz-tag, não a palavra médica legítima.
    (r'<span class="quiz-tag[^"]*">\s*VARIANTE\s*</span>', "«VARIANTE» como rótulo"),
]

# §8.2: usar «la cátedra», nunca nome de professor.
RE_PROFESSOR = re.compile(r"\b(Dra?\.|Doctora?|Prof(?:\.|esor[ae]?))\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}")

# Segredos. Deliberadamente conservador: prefixos de provedor conhecidos.
SECRET_PATTERNS = [
    (r"sk-ant-[A-Za-z0-9_\-]{20,}", "chave da Anthropic"),
    (r"sk-[A-Za-z0-9]{32,}", "chave no formato sk-…"),
    (r"ghp_[A-Za-z0-9]{30,}", "token do GitHub"),
    (r"github_pat_[A-Za-z0-9_]{30,}", "token do GitHub (novo formato)"),
    (r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.", "JWT"),
    (r"(?i)(service_role|secret[_-]?key|api[_-]?key)\s*[:=]\s*['\"][^'\"]{16,}['\"]",
     "segredo atribuído em código"),
]

# Lei «não usar API paga nesta etapa».
PAID_API_PATTERNS = [
    (r"api\.anthropic\.com", "API da Anthropic"),
    (r"api\.openai\.com", "API da OpenAI"),
    (r"generativelanguage\.googleapis\.com", "API do Google"),
    (r"\banthropic\.(messages|completions)\b", "SDK da Anthropic"),
    (r"\bopenai\.(chat|completions)\b", "SDK da OpenAI"),
]

# Lei 6 — mudança que mexe em conteúdo médico precisa aparecer no pacote.
RE_NUMBER = re.compile(r"\d+(?:[.,]\d+)?\s*(?:%|mg|g|mL|ml|mmHg|cmH|mmol|mEq|seg|s\b|h\b|años|mm|cm)")
RE_ANSWER_LINE = re.compile(r"<strong>\s*([a-eA-E])\s*[\)\.\-:]")


@dataclass
class Finding:
    check: str
    severity: str
    message: str
    where: str = ""
    detail: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "check": self.check,
            "severity": self.severity,
            "message": self.message,
            "where": self.where,
            "detail": self.detail,
        }


@dataclass
class Context:
    repo_root: str
    changed: list[str]
    base_blob: callable  # (path) -> str | None
    head_blob: callable  # (path) -> str | None
    added_lines: dict  # path -> [str]
    scope: dict  # do corpo do PR
    tasks: dict | None
    file_exists: callable  # (path) -> bool


# --------------------------------------------------------------------------
# Auxiliares
# --------------------------------------------------------------------------

def _is_materia(path: str) -> bool:
    return MATERIA_DIR in path and path.endswith(".html")


def _glob_match(path: str, pattern: str) -> bool:
    """Casa caminho contra um glob simples, com suporte a ``**``."""
    pattern = pattern.strip().rstrip("/")
    if not pattern:
        return False
    if pattern.endswith("/**"):
        return path.startswith(pattern[:-3] + "/") or path == pattern[:-3]
    if "**" in pattern:
        rx = re.escape(pattern).replace(r"\*\*", ".*").replace(r"\*", "[^/]*")
        return re.fullmatch(rx, path) is not None
    if "*" in pattern:
        rx = re.escape(pattern).replace(r"\*", "[^/]*")
        return re.fullmatch(rx, path) is not None
    return path == pattern or path.startswith(pattern + "/")


# --------------------------------------------------------------------------
# Verificações · registro de tarefas e escopo
# --------------------------------------------------------------------------

def check_task_registry(ctx: Context) -> list[Finding]:
    out: list[Finding] = []
    if ctx.tasks is None:
        out.append(Finding("registro-tarefas", INFO,
                           "coordination/tasks.json não foi encontrado; a verificação de escopo por tarefa fica desligada."))
        return out

    validos = set(ctx.tasks.get("estados_validos", []))
    areas = set(ctx.tasks.get("areas_validas", []))
    vistos: set[str] = set()
    ativos: dict[str, list[str]] = {}

    for t in ctx.tasks.get("tarefas", []):
        tid = t.get("id", "(sem id)")
        if tid in vistos:
            out.append(Finding("registro-tarefas", HARD_FAIL,
                               f"id de tarefa repetido: {tid}", "coordination/tasks.json"))
        vistos.add(tid)

        if validos and t.get("estado") not in validos:
            out.append(Finding("registro-tarefas", HARD_FAIL,
                               f"tarefa {tid} tem estado inválido: {t.get('estado')!r}",
                               "coordination/tasks.json"))
        if areas and t.get("area") not in areas:
            out.append(Finding("registro-tarefas", HARD_FAIL,
                               f"tarefa {tid} tem área inválida: {t.get('area')!r}",
                               "coordination/tasks.json"))
        if t.get("estado") == "BLOCKED-LIMIT" and not t.get("commit"):
            out.append(Finding("registro-tarefas", HARD_FAIL,
                               f"tarefa {tid} está BLOCKED-LIMIT sem commit; "
                               "quem continuar não teria de onde partir.",
                               "coordination/tasks.json"))
        if not t.get("arquivos"):
            out.append(Finding("registro-tarefas", WARNING,
                               f"tarefa {tid} não declara arquivos; o escopo dela não pode ser verificado.",
                               "coordination/tasks.json"))
        if t.get("estado") in ("IN-PROGRESS", "BLOCKED-LIMIT"):
            for a in t.get("arquivos", []):
                ativos.setdefault(a, []).append(tid)

    for arquivo, donos in ativos.items():
        if len(donos) > 1:
            out.append(Finding("registro-tarefas", HARD_FAIL,
                               f"duas tarefas ativas reservam o mesmo arquivo {arquivo}: {', '.join(donos)}",
                               "coordination/tasks.json"))

    if not out:
        out.append(Finding("registro-tarefas", INFO,
                           f"registro válido: {len(vistos)} tarefas, nenhuma colisão entre as ativas."))
    return out


def check_scope(ctx: Context) -> list[Finding]:
    out: list[Finding] = []
    permitidos = ctx.scope.get("arquivos") or []

    # Se o PR nomeia uma tarefa, a reserva dela entra no escopo permitido.
    tarefa_id = ctx.scope.get("tarefa")
    tarefa = None
    if tarefa_id and ctx.tasks:
        for t in ctx.tasks.get("tarefas", []):
            if t.get("id") == tarefa_id:
                tarefa = t
                permitidos = permitidos + list(t.get("arquivos", []))
                break
        if tarefa is None:
            out.append(Finding("escopo", WARNING,
                               f"o PR declara a tarefa {tarefa_id!r}, que não existe em coordination/tasks.json."))

    if not permitidos:
        out.append(Finding("escopo", WARNING,
                           "o PR não declara «Arquivos permitidos» e não aponta para uma tarefa do registro; "
                           "não dá para verificar se algo saiu do escopo."))
    else:
        fora = [p for p in ctx.changed if not any(_glob_match(p, g) for g in permitidos)]
        if fora:
            out.append(Finding("escopo", HARD_FAIL,
                               f"{len(fora)} arquivo(s) fora do escopo declarado.",
                               detail={"arquivos": fora[:20], "permitidos": permitidos}))
        else:
            out.append(Finding("escopo", INFO,
                               f"todos os {len(ctx.changed)} arquivos alterados estão dentro do escopo declarado."))

    # Lei 3 — colisão com outra tarefa ativa.
    if ctx.tasks:
        for t in ctx.tasks.get("tarefas", []):
            if t.get("id") == tarefa_id:
                continue
            if t.get("estado") not in ("IN-PROGRESS", "BLOCKED-LIMIT"):
                continue
            batem = [p for p in ctx.changed
                     if any(_glob_match(p, g) for g in t.get("arquivos", []))]
            if batem:
                out.append(Finding("colisao", HARD_FAIL,
                                   f"este PR toca arquivo reservado pela tarefa ativa {t['id']} "
                                   f"({t.get('agente')}, estado {t.get('estado')}).",
                                   detail={"arquivos": batem[:20]}))
    return out


def check_critical_files(ctx: Context) -> list[Finding]:
    criticos = [p for p in ctx.changed
                if any(re.search(rx, p) for rx in CRITICAL_PATTERNS)]
    if not criticos:
        return [Finding("arquivos-criticos", INFO, "nenhum arquivo crítico foi alterado.")]
    return [Finding("arquivos-criticos", WARNING,
                    "arquivos críticos alterados: risco ALTO e auditoria de regressão ampliada obrigatória (Lei 8).",
                    detail={"arquivos": criticos})]


# --------------------------------------------------------------------------
# Verificações · segurança
# --------------------------------------------------------------------------

def check_secrets(ctx: Context) -> list[Finding]:
    achados = []
    for path, linhas in ctx.added_lines.items():
        for ln in linhas:
            for rx, nome in SECRET_PATTERNS:
                if re.search(rx, ln):
                    achados.append({"arquivo": path, "tipo": nome})
                    break
    if achados:
        return [Finding("segredos", HARD_FAIL,
                        f"possível segredo em {len(achados)} linha(s) adicionada(s). "
                        "Nenhum token, chave ou credencial pode entrar no repositório.",
                        detail={"ocorrencias": achados[:10]})]
    return [Finding("segredos", INFO, "nenhum segredo detectado nas linhas adicionadas.")]


def check_paid_api(ctx: Context) -> list[Finding]:
    achados = []
    for path, linhas in ctx.added_lines.items():
        # O próprio Guard nomeia essas APIs para poder detectá-las.
        if path.startswith("tools/qa/"):
            continue
        for ln in linhas:
            for rx, nome in PAID_API_PATTERNS:
                if re.search(rx, ln):
                    achados.append({"arquivo": path, "api": nome})
                    break
    if achados:
        return [Finding("api-paga", HARD_FAIL,
                        "chamada a API paga introduzida. A V1 não pode gerar custo de API.",
                        detail={"ocorrencias": achados[:10]})]
    return [Finding("api-paga", INFO, "nenhuma chamada a API paga foi introduzida.")]


# --------------------------------------------------------------------------
# Verificações · matéria
# --------------------------------------------------------------------------

def check_materias(ctx: Context) -> list[Finding]:
    out: list[Finding] = []
    materias = [p for p in ctx.changed if _is_materia(p)]
    if not materias:
        out.append(Finding("materia", INFO, "nenhum arquivo de matéria foi alterado."))
        return out

    for path in materias:
        base_raw = ctx.base_blob(path)
        head_raw = ctx.head_blob(path)
        if head_raw is None:
            out.append(Finding("materia", HARD_FAIL,
                               "arquivo de matéria apagado.", path))
            continue

        head = materia.parse(path, head_raw)
        base = materia.parse(path, base_raw) if base_raw is not None else None
        nome = os.path.basename(path)

        out.extend(_check_html(nome, base_raw, head_raw))
        out.extend(_check_ids(nome, base, head))
        out.extend(_check_counts(nome, base, head))
        out.extend(_check_bank_mirror(nome, head))
        out.extend(_check_answers(nome, base, head))
        out.extend(_check_declared_counts(nome, head))
        out.extend(_check_assets(ctx, nome, head))
        out.extend(_check_anchors(nome, base, head))
    return out


def _check_html(nome: str, base_raw: str | None, head_raw: str) -> list[Finding]:
    depois = materia.unbalanced_tags(head_raw)
    antes = materia.unbalanced_tags(base_raw) if base_raw else []
    if len(depois) > len(antes):
        return [Finding("html", HARD_FAIL,
                        f"{nome}: o PR introduziu HTML desbalanceado "
                        f"({len(antes)} → {len(depois)} problema(s)).",
                        nome, {"novos": depois[:6]})]
    if depois:
        return [Finding("html", INFO,
                        f"{nome}: {len(depois)} desbalanceamento(s) já existiam antes deste PR; "
                        "não foram introduzidos aqui.", nome)]
    return [Finding("html", INFO, f"{nome}: HTML equilibrado.", nome)]


def _check_ids(nome: str, base, head) -> list[Finding]:
    out = []
    dup_depois = set(head.duplicate_ids())
    dup_antes = set(base.duplicate_ids()) if base else set()
    novos = sorted(dup_depois - dup_antes)
    if novos:
        out.append(Finding("ids-duplicados", HARD_FAIL,
                           f"{nome}: o PR criou id duplicado.", nome, {"ids": novos[:10]}))
    elif dup_depois:
        out.append(Finding("ids-duplicados", INFO,
                           f"{nome}: {len(dup_depois)} id duplicado já existia antes deste PR.", nome,
                           {"ids": sorted(dup_depois)[:10]}))

    if base:
        sumidos = sorted(set(base.all_ids) - set(head.all_ids))
        if sumidos:
            out.append(Finding("ids-removidos", HARD_FAIL,
                               f"{nome}: {len(sumidos)} id(s) desapareceram. "
                               "Isso quebra âncoras e marcações de aluno (Lei 1 e Lei 7).",
                               nome, {"ids": sumidos[:15]}))
        sumidas = sorted(set(base.section_ids) - set(head.section_ids))
        if sumidas:
            out.append(Finding("block-ids", HARD_FAIL,
                               f"{nome}: block_id de seção removido: {', '.join(sumidas[:8])}. "
                               "As marcações do aluno são ancoradas por block_id.", nome))
    return out


def _check_counts(nome: str, base, head) -> list[Finding]:
    if not base:
        return []
    out = []
    qb, qh = len(base.questions), len(head.questions)
    if qh < qb:
        chaves = {q.key for q in head.questions}
        perdidas = [q.key for q in base.questions if q.key not in chaves]
        out.append(Finding("questoes-removidas", HARD_FAIL,
                           f"{nome}: {qb} → {qh} questões. {len(perdidas)} sumiram.",
                           nome, {"exemplos": perdidas[:8]}))
    fb, fh = base.flashcards, head.flashcards
    if fh < fb:
        out.append(Finding("flashcards-removidos", HARD_FAIL,
                           f"{nome}: flashcards {fb} → {fh}.", nome))
    return out


def _check_bank_mirror(nome: str, head) -> list[Finding]:
    if not head.has_bank:
        return [Finding("banco-geral", INFO, f"{nome}: não tem seção de banco geral.", nome)]
    corpo, banco = len(head.body_questions), len(head.bank_questions)
    if corpo != banco:
        return [Finding("banco-geral", WARNING,
                        f"{nome}: corpo tem {corpo} questões e o banco tem {banco}. "
                        "Nem toda matéria espelha o banco inteiro — confira se a diferença é intencional.",
                        nome)]
    chaves_corpo = {q.key.replace("id:", "").removesuffix("-bk") for q in head.body_questions}
    chaves_banco = {q.key.replace("id:", "").removesuffix("-bk") for q in head.bank_questions}
    orfas = sorted(chaves_banco - chaves_corpo)
    if head.uses_ids and orfas:
        return [Finding("banco-geral", WARNING,
                        f"{nome}: {len(orfas)} questão(ões) do banco sem correspondente no corpo.",
                        nome, {"exemplos": orfas[:8]})]
    return [Finding("banco-geral", INFO,
                    f"{nome}: corpo e banco espelhados ({corpo} = {banco}).", nome)]


def _check_answers(nome: str, base, head) -> list[Finding]:
    out = []
    invalidas, duplicadas = [], []
    for q in head.questions:
        if q.answer_letter and q.options:
            letras = {materia.RE_LETTER.match(o).group(1).lower()
                      for o in q.options if materia.RE_LETTER.match(o)}
            if q.answer_letter not in letras:
                invalidas.append({"questao": q.qid or q.stem[:60],
                                  "chave": q.answer_letter,
                                  "alternativas": sorted(letras)})
        if len(q.options) > 1:
            corpos = [materia.RE_LETTER.sub("", o).strip().lower().rstrip(".") for o in q.options]
            vistos = {}
            for i, c in enumerate(corpos):
                if c and c in vistos:
                    duplicadas.append({"questao": q.qid or q.stem[:60],
                                       "alternativas": [q.options[vistos[c]][:70], q.options[i][:70]]})
                    break
                vistos[c] = i

    if invalidas:
        out.append(Finding("gabarito-invalido", HARD_FAIL,
                           f"{nome}: {len(invalidas)} questão(ões) com alternativa correta que não existe na lista.",
                           nome, {"ocorrencias": invalidas[:8]}))
    if duplicadas:
        out.append(Finding("alternativas-duplicadas", HARD_FAIL,
                           f"{nome}: {len(duplicadas)} questão(ões) com duas alternativas de texto idêntico. "
                           "Isso cria mais de uma resposta defensável.",
                           nome, {"ocorrencias": duplicadas[:8]}))

    # Lei 6 — gabarito antigo alterado precisa aparecer no pacote de auditoria.
    if base:
        antes = {q.key: q.answer_letter for q in base.questions if q.answer_letter}
        mudou = []
        for q in head.questions:
            if q.answer_letter and q.key in antes and antes[q.key] != q.answer_letter:
                mudou.append({"questao": q.qid or q.stem[:60],
                              "de": antes[q.key], "para": q.answer_letter})
        if mudou:
            out.append(Finding("gabarito-alterado", WARNING,
                               f"{nome}: {len(mudou)} gabarito(s) de questão já existente mudaram. "
                               "Conteúdo médico: precisa de decisão humana explícita (Lei 6).",
                               nome, {"mudancas": mudou[:10]}))
    if not out:
        out.append(Finding("gabaritos", INFO, f"{nome}: gabaritos válidos e sem alternativa duplicada.", nome))
    return out


def _check_declared_counts(nome: str, head) -> list[Finding]:
    """Compara «N preguntas» escrito no texto com o que o arquivo tem."""
    declaradas = [int(m.group(1)) for m in
                  re.finditer(r"(\d{2,4})\s*(?:preguntas|questões|questoes)", head.raw, re.I)]
    if not declaradas:
        return []
    corpo = len(head.body_questions)
    total = len(head.questions)
    if corpo in declaradas or total in declaradas:
        return [Finding("contagens", INFO,
                        f"{nome}: alguma contagem declarada bate com o arquivo ({corpo} no corpo).", nome)]
    return [Finding("contagens", WARNING,
                    f"{nome}: nenhuma das contagens declaradas no texto "
                    f"({sorted(set(declaradas))[:6]}) bate com {corpo} no corpo ou {total} no total.",
                    nome)]


def _check_assets(ctx: Context, nome: str, head) -> list[Finding]:
    faltando = []
    for a in head.assets:
        rel = a.lstrip("/")
        # As matérias referenciam por raiz do site; a raiz fica em "Atual - Copia".
        for prefixo in ("Repasso-Med-Site--main/Atual - Copia/", ""):
            if ctx.file_exists(prefixo + rel):
                break
        else:
            faltando.append(a)
    if faltando:
        return [Finding("assets", HARD_FAIL,
                        f"{nome}: {len(faltando)} asset(s) referenciado(s) que não existem no repositório.",
                        nome, {"assets": faltando[:12]})]
    return [Finding("assets", INFO, f"{nome}: os {len(head.assets)} assets referenciados existem.", nome)]


def _check_anchors(nome: str, base, head) -> list[Finding]:
    ids = set(head.all_ids)
    mortas = [a for a in head.anchors if a and a not in ids]
    antes = set()
    if base:
        base_ids = set(base.all_ids)
        antes = {a for a in base.anchors if a and a not in base_ids}
    novas = sorted(set(mortas) - antes)
    if novas:
        return [Finding("ancoras-mortas", WARNING,
                        f"{nome}: {len(novas)} âncora(s) nova(s) apontam para id que não existe.",
                        nome, {"ancoras": novas[:10]})]
    return []


# --------------------------------------------------------------------------
# Verificações · nomenclatura e identidade
# --------------------------------------------------------------------------

def check_nomenclature(ctx: Context) -> list[Finding]:
    out = []
    proibidos, professores = [], []
    for path, linhas in ctx.added_lines.items():
        if path.startswith("tools/qa/") or path.startswith("coordination/"):
            continue  # o próprio Guard cita os rótulos para poder detectá-los
        for ln in linhas:
            for rx, nome in FORBIDDEN_LABELS:
                if re.search(rx, ln):
                    proibidos.append({"arquivo": path, "rotulo": nome})
                    break
            m = RE_PROFESSOR.search(ln)
            if m:
                professores.append({"arquivo": path, "trecho": m.group(0)})
    if proibidos:
        out.append(Finding("nomenclatura", HARD_FAIL,
                           f"{len(proibidos)} uso(s) de rótulo proibido. "
                           "Use «Basada en preguntas de examen» ou «Pregunta complementaria».",
                           detail={"ocorrencias": proibidos[:10]}))
    if professores:
        out.append(Finding("nome-de-professor", WARNING,
                           f"{len(professores)} possível nome de professor em linha adicionada. "
                           "O padrão é «la cátedra» ou «el material de la cátedra».",
                           detail={"ocorrencias": professores[:10]}))
    if not out:
        out.append(Finding("nomenclatura", INFO, "nenhum rótulo proibido nem nome de professor."))
    return out


def check_orphan_materia(ctx: Context) -> list[Finding]:
    """Arquivo de matéria que o código não referencia (CLAUDE.md §1.2)."""
    materias = [p for p in ctx.changed if _is_materia(p)]
    if not materias:
        return []
    index = None
    for cand in ("Repasso-Med-Site--main/Atual - Copia/index.html", "index.html"):
        index = ctx.head_blob(cand)
        if index:
            break
    if not index:
        return []
    slugs = set(re.findall(r"slug\s*:\s*'([a-z0-9\-]+)'", index))
    orfaos = [p for p in materias
              if os.path.basename(p)[:-5] not in slugs]
    if orfaos:
        return [Finding("materia-orfa", WARNING,
                        f"{len(orfaos)} arquivo(s) de matéria alterado(s) não aparecem na lista de slugs "
                        "do index.html. Pode ser cópia antiga: o arquivo ativo é definido pelo código.",
                        detail={"arquivos": orfaos})]
    return []


# --------------------------------------------------------------------------
# Lei 6 — pacote de conteúdo médico para a auditoria humana
# --------------------------------------------------------------------------

def collect_medical_diff(ctx: Context) -> dict:
    """Junta as mudanças que tocam conteúdo médico, para o pacote de auditoria.

    O Guard **não decide** se estão certas. Ele só garante que apareçam.
    """
    itens = []
    for path, linhas in ctx.added_lines.items():
        if not _is_materia(path):
            continue
        for ln in linhas:
            texto = materia._plain(ln)
            if not texto:
                continue
            motivos = []
            if RE_NUMBER.search(texto):
                motivos.append("número com unidade")
            if RE_ANSWER_LINE.search(ln):
                motivos.append("letra de resposta")
            if re.search(r"(?i)\b(dosis|dose|mg/kg|contraindic|primera línea|tratamiento de elección)\b", texto):
                motivos.append("afirmação terapêutica")
            if motivos:
                itens.append({"arquivo": path, "motivos": motivos, "linha": texto[:220]})
    return {
        "total": len(itens),
        "amostra": itens[:60],
        "nota": ("O Guard não julga correção científica (Lei 6). "
                 "Estas linhas precisam de conferência humana."),
    }
