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

**Endurecimentos de 2026-09-20, depois da auditoria independente do PR #94**
(ver `guard-integridade`/`escopo-ampliado` abaixo — os dois bloqueadores):

1. Um PR não pode se autocertificar. `check_scope` agora trata a reserva já
   registrada em `coordination/tasks.json` **antes** deste PR (lida da BASE,
   nunca do HEAD) como a única autoridade — nem o corpo do PR, nem uma
   edição da própria tarefa dentro do mesmo diff, podem ampliá-la. Ver
   `check_scope` e `check_guard_integrity`.
2. O código do próprio Guard (`tools/qa/guard/**`) precisa rodar a partir da
   BASE, não do HEAD do PR — senão um PR que enfraquece uma verificação
   pode usar essa mesma versão enfraquecida para aprovar a si mesmo. Essa
   extração acontece em `.github/workflows/guard.yml` (fora deste arquivo,
   porque a extração em si não pode depender de código que o PR controla).
   `check_guard_integrity` só relata, de forma transparente, qual foi a
   fonte usada nesta execução (`--trusted-source`) e sinaliza quando o
   próprio código do Guard/workflow foi alterado.
"""

from __future__ import annotations

import json
import os
import re
from collections import Counter
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

# Bloqueador 1 da auditoria do PR #94: um PR não pode auditar a si mesmo.
# Estes são os arquivos cuja alteração afeta a própria lógica/execução do
# verificador — por isso o workflow executa o CÓDIGO deles a partir da base,
# nunca do HEAD do PR (ver .github/workflows/guard.yml). check_guard_integrity
# só relata a fonte usada e sinaliza quando estes arquivos mudaram.
GUARD_CODE_PATTERNS = [
    r"^tools/qa/guard/",
    r"^\.github/workflows/guard\.yml$",
]


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
    tasks: dict | None  # coordination/tasks.json no HEAD deste PR
    file_exists: callable  # (path) -> bool
    # tasks.json como estava ANTES deste PR (na base). É a única fonte
    # confiável de reserva de arquivo — ver check_scope. None quando o
    # arquivo não existia na base (bootstrap: a própria tarefa é nova).
    tasks_base: dict | None = None
    # De onde veio o CÓDIGO do Guard que está rodando esta execução:
    # "base" (extraído da base, confiável), "head-bootstrap" (a base ainda
    # não tem o Guard — só acontece antes desta V1 existir na main) ou
    # "desconhecido" (execução local, sem o wrapper do workflow).
    trusted_source: str = "desconhecido"


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
    """Lei 2 — escopo fechado, endurecida contra autoautorização.

    A reserva de arquivos de uma tarefa **já registrada antes deste PR** é
    lida da BASE (``ctx.tasks_base``), nunca do HEAD. Isso existe porque a
    auditoria independente do PR #94 apontou que a versão anterior deste
    Guard unia o "Arquivos permitidos" do corpo do PR com o que
    ``tasks.json`` dizia NO HEAD do próprio PR — e um PR pode escrever
    qualquer coisa em ambos. Union com uma fonte que o próprio PR controla
    não é uma trava, é um convite.

    Regra agora: se a tarefa já existia na base, a reserva dela na base é a
    única autoridade. O corpo do PR pode repetir ou estreitar essa reserva,
    nunca ampliá-la; e uma edição da própria tarefa em ``tasks.json`` dentro
    do mesmo diff também não amplia nada — só é lida para ser comparada e
    sinalizada. Só quando a tarefa é NOVA nesta PR (não existia na base)
    é que não há reserva anterior para proteger, e o comportamento antigo
    (união) se aplica — não há o que autoautorizar ainda.
    """
    out: list[Finding] = []
    tarefa_id = ctx.scope.get("tarefa")
    corpo_arquivos = list(ctx.scope.get("arquivos") or [])

    tarefa_head = None
    if tarefa_id and ctx.tasks:
        for t in ctx.tasks.get("tarefas", []):
            if t.get("id") == tarefa_id:
                tarefa_head = t
                break
        if tarefa_head is None:
            out.append(Finding("escopo", WARNING,
                               f"o PR declara a tarefa {tarefa_id!r}, que não existe em coordination/tasks.json."))

    tarefa_base = None
    if tarefa_id and ctx.tasks_base:
        for t in ctx.tasks_base.get("tarefas", []):
            if t.get("id") == tarefa_id:
                tarefa_base = t
                break

    if tarefa_base is not None:
        reserva = list(tarefa_base.get("arquivos") or [])

        # 2a. a própria tarefa tentou se ampliar dentro deste diff?
        if tarefa_head is not None:
            ampliada = [g for g in (tarefa_head.get("arquivos") or []) if g not in reserva]
            if ampliada:
                out.append(Finding("escopo-ampliado", HARD_FAIL,
                                   f"a tarefa {tarefa_id!r} tenta ampliar a própria reserva de arquivos "
                                   "dentro deste mesmo PR. A reserva registrada ANTES deste PR é a única "
                                   "autoridade (Lei 2) — um PR não pode reescrever sua própria reserva e "
                                   "se autoautorizar. Ampliar uma reserva exige um PR à parte, revisado "
                                   "por si só.",
                                   "coordination/tasks.json",
                                   {"arquivos_novos": ampliada, "reserva_original": reserva}))

        # 2b. o corpo do PR declarou arquivo além da reserva original?
        extras_no_corpo = [g for g in corpo_arquivos
                           if g not in reserva and not any(_glob_match(g, r) for r in reserva)]
        if extras_no_corpo:
            out.append(Finding("escopo-ampliado", HARD_FAIL,
                               f"o corpo do PR declara arquivo(s) fora da reserva original da tarefa "
                               f"{tarefa_id!r}: {', '.join(extras_no_corpo[:10])}. Um PR não pode "
                               "autoautorizar seu próprio escopo escrevendo mais no «Arquivos "
                               "permitidos» do que a reserva já registrada permite.",
                               detail={"declarados_fora": extras_no_corpo, "reserva_original": reserva}))

        # A reserva da BASE é quem decide o que é permitido — nunca o que o
        # corpo do PR ou o HEAD de tasks.json dizem por conta própria.
        permitidos = reserva
    elif tarefa_head is not None:
        # Tarefa nova, criada neste mesmo PR: não existe reserva anterior
        # para proteger, então o corpo e a própria tarefa somam o escopo —
        # este é o caso de bootstrap (ex.: a primeira tarefa desta V1).
        permitidos = corpo_arquivos + list(tarefa_head.get("arquivos") or [])
    else:
        permitidos = corpo_arquivos

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


def _is_guard_code(path: str) -> bool:
    return any(re.search(rx, path) for rx in GUARD_CODE_PATTERNS)


def check_guard_integrity(ctx: Context) -> list[Finding]:
    """Bloqueador 1 da auditoria do PR #94 — transparência sobre a fonte do código.

    Este check não pode, sozinho, IMPEDIR a autocertificação: quem faz isso é
    a extração do código a partir da base, feita em ``.github/workflows/guard.yml``
    antes de qualquer módulo Python deste pacote ser importado (ver o
    comentário no topo daquele arquivo — a extração precisa estar em passos
    de shell do workflow, não em código deste repositório, senão um PR
    poderia alterar também o próprio mecanismo de proteção).

    O que este check FAZ: relatar, sempre, de onde veio o código que está
    rodando esta execução (``ctx.trusted_source``), e sinalizar quando o PR
    altera o código do Guard ou do workflow — para nunca esconder isso numa
    lista genérica de "arquivo crítico".
    """
    out: list[Finding] = []
    fonte = ctx.trusted_source or "desconhecido"

    if fonte == "base":
        out.append(Finding("guard-integridade", INFO,
                           "esta execução rodou o código do Guard extraído da BASE (confiável), não do "
                           "HEAD deste PR — mesmo que este PR altere tools/qa/guard/**, essa alteração "
                           "não pôde se autocertificar nesta execução."))
    elif fonte == "head-bootstrap":
        out.append(Finding("guard-integridade", WARNING,
                           "a base ainda não tem o Guard (bootstrap): esta execução usou o código do "
                           "PRÓPRIO PR. Isto NÃO é uma autocertificação confiável — precisa de revisão "
                           "humana direta do código do Guard em si, até que a base passe a ter uma versão "
                           "publicada dele."))
    else:
        out.append(Finding("guard-integridade", WARNING,
                           f"fonte do código do Guard não identificada ({fonte!r}) — provavelmente uma "
                           "execução local, fora do wrapper de extração confiável do workflow. Rodar via "
                           ".github/workflows/guard.yml para a garantia de origem; localmente isto é só "
                           "informativo."))

    guard_alterado = [p for p in ctx.changed if _is_guard_code(p)]
    if guard_alterado:
        workflow_alterado = any(p == ".github/workflows/guard.yml" for p in guard_alterado)
        aviso_workflow = (
            " Como .github/workflows/guard.yml está entre eles, a extração confiável por si só pode não "
            "bastar: o próprio mecanismo de proteção pode ter sido tocado — revisar esse diff manualmente "
            "linha por linha antes de aprovar."
            if workflow_alterado else ""
        )
        out.append(Finding("guard-codigo-alterado", WARNING,
                           f"{len(guard_alterado)} arquivo(s) do próprio Guard/workflow foram alterados "
                           "neste PR: risco ALTO (Lei 8), exige auditoria humana independente da lógica "
                           f"do verificador, não só do resultado que ele reporta.{aviso_workflow}",
                           detail={"arquivos": guard_alterado}))
    return out


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
        out.extend(_check_assets(ctx, nome, base, head))
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

    # Comparar pela CHAVE, não só pelo total. Uma questão pode sumir e outra
    # entrar no mesmo PR — o total bate, mas uma questão real foi perdida
    # (Lei 1). Julgar só qh < qb deixaria essa perda passar despercebida.
    chaves = {q.key for q in head.questions}
    perdidas = [q.key for q in base.questions if q.key not in chaves]
    if perdidas:
        out.append(Finding("questoes-removidas", HARD_FAIL,
                           f"{nome}: {qb} → {qh} questões; {len(perdidas)} sumiram por chave "
                           "(id ou enunciado), mesmo que o total não tenha caído.",
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

    # Lei 6 — questões sem id podem compartilhar enunciado (e chave), inclusive
    # entre bloco e banco. Preservar todas as ocorrências em ordem evita falsos
    # positivos do dict que guardava apenas a última resposta. Também detecta
    # uma troca entre duas cópias, mesmo com o mesmo conjunto de letras.
    if base:
        antes: dict[str, list[str]] = {}
        depois: dict[str, list[str]] = {}
        exemplo = {}
        for q in base.questions:
            if q.answer_letter:
                antes.setdefault(q.key, []).append(q.answer_letter)
        for q in head.questions:
            if q.answer_letter:
                depois.setdefault(q.key, []).append(q.answer_letter)
                exemplo.setdefault(q.key, q.qid or q.stem[:60])
        mudou = []
        for key, letras_atuais in depois.items():
            if key not in antes or antes[key] == letras_atuais:
                continue
            # Adições/remoções ou reordenações exigem inspeção, pois não há
            # identificador para parear cópias iguais com segurança.
            mudou.append({"questao": exemplo[key], "de": antes[key], "para": letras_atuais})
        if mudou:
            out.append(Finding("gabarito-alterado", WARNING,
                               f"{nome}: {len(mudou)} grupo(s) de gabaritos de questão já existente mudaram. "
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


def _asset_candidate_paths(asset: str) -> tuple[str, ...]:
    rel = asset.lstrip("/")
    # As matérias referenciam por raiz do site; a raiz fica em "Atual - Copia".
    return (
        "Repasso-Med-Site--main/Atual - Copia/" + rel,
        rel,
    )


def _check_assets(ctx: Context, nome: str, base, head) -> list[Finding]:
    """Lei do delta também para assets.

    Uma matéria antiga pode referenciar imagens que já não existem na base.
    Alterar uma frase desse HTML não pode transformar essa dívida histórica
    em HARD FAIL. Continua sendo HARD FAIL quando a PR:
    - introduz uma referência nova para asset ausente; ou
    - toca/remove o próprio caminho de um asset já referenciado e o HEAD
      termina sem esse arquivo.

    Assets ausentes que já estavam referenciados na base e cujo caminho não
    foi tocado por este PR ficam visíveis como INFO, sem bloquear o delta.

    Achado da auditoria independente da PR #247 (Claude 3): a versão anterior
    decidia "isto já era dívida antiga?" checando só se o CAMINHO aparecia em
    algum lugar de ``base.assets`` (um ``set``). Isso permitia mascarar uma
    regressão nova: bastava reescrever uma tag `<img>`/`url()` que antes
    apontava para um asset que EXISTIA, fazendo-a apontar para o MESMO
    caminho já quebrado usado por OUTRA tag no mesmo arquivo — a contagem de
    ocorrências crescia (1 → 2), mas o `set` só via "o caminho já existia" e
    classificava as duas como dívida antiga, escondendo a quebra nova.
    Agora a comparação é por OCORRÊNCIA (``Counter``), não por presença: um
    caminho ausente só "cabe" como dívida pré-existente até o limite de
    quantas vezes ele já aparecia quebrado na base — qualquer ocorrência
    ALÉM desse orçamento é tratada como nova, mesmo que o texto do caminho já
    existisse em outra referência.
    """
    faltando_head: list[str] = []
    for a in head.assets:
        if not any(ctx.file_exists(p) for p in _asset_candidate_paths(a)):
            faltando_head.append(a)

    if not faltando_head:
        return [Finding("assets", INFO, f"{nome}: os {len(head.assets)} assets referenciados existem.", nome)]

    orcamento_preexistente = Counter(base.assets) if base is not None else Counter()
    novos_ou_quebrados: list[str] = []
    preexistentes: list[str] = []

    for a in faltando_head:
        candidatos = _asset_candidate_paths(a)
        caminho_tocado = any(p in ctx.changed for p in candidatos)
        cabe_como_preexistente = (
            base is not None and not caminho_tocado and orcamento_preexistente[a] > 0
        )
        if cabe_como_preexistente:
            orcamento_preexistente[a] -= 1
            preexistentes.append(a)
        else:
            novos_ou_quebrados.append(a)

    out: list[Finding] = []
    if novos_ou_quebrados:
        out.append(Finding(
            "assets", HARD_FAIL,
            f"{nome}: {len(novos_ou_quebrados)} asset(s) ausente(s) foram introduzidos "
            "ou quebrados por este PR.",
            nome, {"assets": novos_ou_quebrados[:12]},
        ))
    if preexistentes:
        out.append(Finding(
            "assets", INFO,
            f"{nome}: {len(preexistentes)} asset(s) ausente(s) já estavam referenciados "
            "antes deste PR; dívida pré-existente registrada sem bloquear o delta.",
            nome, {"assets": preexistentes[:12]},
        ))
    return out


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
