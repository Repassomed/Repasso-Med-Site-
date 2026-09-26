"""Issue #160 — Intake da Inbox #88: pedido em linguagem natural vira uma
PROPOSTA TIPADA de tarefa em ``coordination/tasks.json``.

Antes desta peça, ``observe._tratar_inbox_comment`` só classificava e
publicava ``✅ RECEBIDO``: nenhum pedido virava tarefa persistente, então o
Worker Bridge nunca o executava.

Este módulo é PURO: não faz rede, não roda git, não grava arquivo. Ele só
decide, de forma determinística e auditável, uma de cinco saídas:

- ``PROPOSTA``: tarefa nova e tipada (id canônico, arquivo exato, prioridade,
  fonte/source pack, estado inicial). Quem abre a PR administrativa que
  altera SOMENTE ``coordination/tasks.json`` é o workflow confiável, e
  quem faz merge continua sendo o José;
- ``EXISTENTE``: o pedido já está representado — responde apontando a
  tarefa existente, sem proposta nova;
- ``NEEDS_INPUT``: falta informação essencial (matéria ambígua, nenhuma
  ação pedida, ou conflito com tarefa automatizada ativa da mesma matéria)
  — nada é inventado;
- ``BLOCKED_AUTORIZACAO``: matéria nova sem "pode começar" explícito;
- ``IGNORADO``: não é pedido (ex.: relatório de agente).

O texto do comentário é DADO: vira ``objetivo``/``titulo`` da tarefa (o que
o worker lê como pedido, sempre limitado por ``allowed_files``), nunca
comando, caminho, branch, política ou flag.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field

TASKS_JSON_PATH = "coordination/tasks.json"
INTAKE_BRANCH_PREFIX = "coordinator/intake-"
INTAKE_PR_MARKER = "<!-- repasso-coordinator-intake -->"
SOURCE_PACK_DIR = "coordination/source-packs"
INTAKE_ISSUE = 88
MAX_OBJETIVO_CHARS = 1_500
MAX_TITULO_CHARS = 120

# Estados em que uma tarefa AUTOMATIZADA da mesma matéria ainda está viva:
# um pedido novo para a mesma matéria nunca vira segunda tarefa em silêncio.
_ESTADOS_VIVOS = frozenset({"READY", "IN-PROGRESS", "BLOCKED-LIMIT", "NEEDS-AUDIT", "NEEDS-FIX", "MERGE-READY"})
_TASK_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")

# Prioridade DECLARADA por José vence a classificação automática (#84 §1).
# "P1"/"P2" também é "Parcial 1/2" em nome de prova ("P2 Turma E.pdf"): só
# vale como prioridade no início de linha ou depois de "prioridade".
_RE_P_EXPLICITA = re.compile(r"(?:^|\n)[ \t>*#-]*P([0-4])\b|\bprioridade\s*[:=]?\s*P([0-4])\b", re.I)
_RE_URGENTE = re.compile(r"\burgent[ea]?\b", re.I)
_RE_NIVEL_PALAVRA = re.compile(
    r"\bprioridade\s*[:=]?\s*(alta|m[ée]dia|media|baixa)\b|\b(ALTA|M[ÉE]DIA|MEDIA|BAIXA)\b", re.I
)
_NIVEL_PARA_P = {"alta": "P1", "media": "P2", "baixa": "P3"}

_RE_MATERIA_NOVA = re.compile(r"\b(?:mat[ée]ria nova|nova mat[ée]ria)\b\s*[:—–-]?\s*([^\n.,;:—–]{2,60})?", re.I)
_RE_AUTORIZACAO = re.compile(r"\b(pode come[çc]ar|autorizo|autorizad[oa]|est[áa] autorizad[oa])\b", re.I)
_RE_TAREFA_SEPARADA = re.compile(r"\b(tarefa separada|nova tarefa|outra tarefa)\b", re.I)
_RE_FONTE_EXTERNA = re.compile(
    r"\b(drive|google drive|pasta|novas provas|provas novas|fotos d[ae]s? provas?|pdfs?|arquivos? anexos?)\b", re.I
)
_RE_QUESTOES = re.compile(r"\b(quest(ã|a)o|quest(õ|o)es|prova|provas|gabarito|banco general)\b", re.I)
# Radicais de AÇÃO: um comentário que só comenta/pergunta nunca vira tarefa.
_RE_ACAO = re.compile(
    r"\b(corrig|incorpor|atualiz|fech|remov|adicion|revis|ajust|melhor|complet|cri[ae]|refaz|refa[çc]|"
    r"inclu|organiz|padroniz|arrum|termin|finaliz|implement|reorganiz|reescrev|limp|troc|substitu)\w*",
    re.I,
)
# Relatórios/status dos agentes também passam pela #88 (mesma identidade
# GitHub do José). Não são pedidos.
_RE_RELATORIO = re.compile(
    r"^\W*(claude\s*[1-9]|chatgpt|auditoria|relat[óo]rio|status|checkpoint|resumo|voc[êe] [ée] o claude)\b", re.I
)
_RE_HTML_COMMENT = re.compile(r"<!--.*?-->", re.S)


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def _normalizar(texto: str) -> str:
    base = _sem_acento(_RE_HTML_COMMENT.sub(" ", texto or "")).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", base)).strip()


def _slug(texto: str) -> str:
    return re.sub(r"-{2,}", "-", _normalizar(texto).replace(" ", "-")).strip("-")


def prioridade_declarada_do_texto(corpo: str) -> str | None:
    """``P0``..``P4`` declarada explicitamente, ou ``None``. URGENTE → P0,
    ALTA → P1, MÉDIA → P2, BAIXA → P3."""
    texto = _RE_HTML_COMMENT.sub(" ", corpo or "")
    declaradas = [f"P{m.group(1) or m.group(2)}" for m in _RE_P_EXPLICITA.finditer(texto)]
    if _RE_URGENTE.search(texto):
        declaradas.append("P0")
    for m in _RE_NIVEL_PALAVRA.finditer(texto):
        nivel = _NIVEL_PARA_P.get(_sem_acento((m.group(1) or m.group(2) or "").lower()))
        if nivel:
            declaradas.append(nivel)
    # Mais de uma declaração: vale a mais alta (P0 < P1 < …).
    return min(declaradas) if declaradas else None


def diretorio_de_materias(tarefas: list[dict]) -> str | None:
    """Pasta das matérias, derivada dos ``arquivos`` já declarados em
    tarefas de área ``materia`` (nunca um caminho fixo no código)."""
    pastas = Counter(
        os.path.dirname(a)
        for t in tarefas if t.get("area") == "materia"
        for a in (t.get("arquivos") or []) if isinstance(a, str) and a.endswith(".html")
    )
    return pastas.most_common(1)[0][0] if pastas else None


def materias_existentes(repo_dir: str, pasta: str | None) -> dict[str, str]:
    """``slug -> caminho relativo exato`` dos arquivos ``.html`` existentes."""
    if not pasta:
        return {}
    absoluto = os.path.join(repo_dir, pasta)
    if not os.path.isdir(absoluto):
        return {}
    return {
        nome[:-5]: f"{pasta}/{nome}"
        for nome in sorted(os.listdir(absoluto))
        if nome.endswith(".html") and _TASK_ID_RE.match(nome[:-5])
    }


def _identificar_materias(texto_norm: str, materias: dict[str, str]) -> list[str]:
    """Slugs cujo nome aparece como palavra inteira no texto. Quando um nome
    contém outro (``histologia i`` ⊃ ``histologia``… não existe aqui, mas
    ``anatomia patologica ii`` ⊃ ``anatomia patologica``), só o mais longo
    conta."""
    achados = []
    for slug in materias:
        nome = slug.replace("-", " ")
        if re.search(rf"(?<![a-z0-9]){re.escape(nome)}(?![a-z0-9])", texto_norm):
            achados.append(slug)
    return [s for s in achados
            if not any(o != s and s.replace("-", " ") in o.replace("-", " ") for o in achados)]


@dataclass(frozen=True)
class DecisaoIntake:
    acao: str  # PROPOSTA | EXISTENTE | NEEDS_INPUT | BLOCKED_AUTORIZACAO | IGNORADO
    motivo: str
    prioridade: str | None = None
    tarefa: dict | None = None
    existentes: tuple[dict, ...] = ()
    relacionadas: tuple[dict, ...] = ()

    def resumo_existentes(self) -> list[str]:
        return [f"{t.get('id')} (estado {t.get('estado')}, PR {('#' + str(t['pr'])) if t.get('pr') else '-'})"
                for t in self.existentes]


def interpretar_pedido(corpo: str, *, tarefas: list[dict], repo_dir: str, comment_id: int | None,
                       prioridade_classificada: str | None = None) -> DecisaoIntake:
    texto = _RE_HTML_COMMENT.sub(" ", corpo or "").strip()
    primeira = next((l.strip() for l in texto.splitlines() if l.strip()), "")
    if not primeira:
        return DecisaoIntake("IGNORADO", "comentário vazio.")
    if _RE_RELATORIO.search(primeira):
        return DecisaoIntake("IGNORADO", "relatório/status de agente — não é pedido de tarefa.")

    prioridade = prioridade_declarada_do_texto(texto) or prioridade_classificada or "P2"
    norm = _normalizar(texto)

    if comment_id is not None:
        marca = f"comentário {comment_id} "
        mesmos = tuple(t for t in tarefas if marca in f"{t.get('fonte') or ''} ")
        if mesmos:
            return DecisaoIntake("EXISTENTE", "este comentário já virou tarefa.", prioridade, existentes=mesmos)

    pasta = diretorio_de_materias(tarefas)
    materias = materias_existentes(repo_dir, pasta)

    nova = _RE_MATERIA_NOVA.search(texto)
    if nova:
        nome = re.sub(r"^(de|da|do|das|dos)\s+", "", (nova.group(1) or "").strip(), flags=re.I)
        slug = _slug(nome)
        if not slug or not _TASK_ID_RE.match(slug) or len(slug) > 40:
            return DecisaoIntake("NEEDS_INPUT", "matéria nova sem nome identificável — diga o nome da matéria.",
                                 prioridade)
        if slug not in materias:
            if not _RE_AUTORIZACAO.search(texto):
                return DecisaoIntake(
                    "BLOCKED_AUTORIZACAO",
                    f"matéria nova {nome!r}: tipo C nunca começa sozinho — responda 'pode começar' para "
                    "autorizar a proposta.", prioridade,
                )
            if not pasta:
                return DecisaoIntake("NEEDS_INPUT", "não foi possível determinar a pasta das matérias.", prioridade)
            return _proposta(texto, primeira, norm, prioridade=prioridade, slug=slug,
                             arquivo=f"{pasta}/{slug}.html", materia_nova=True,
                             tarefas=tarefas, comment_id=comment_id)

    candidatas = _identificar_materias(norm, materias)
    if not candidatas:
        return DecisaoIntake("NEEDS_INPUT", "não identifiquei qual matéria existente o pedido afeta — "
                             "diga o nome da matéria.", prioridade)
    if len(candidatas) > 1:
        return DecisaoIntake("NEEDS_INPUT", f"o pedido cita mais de uma matéria ({', '.join(candidatas)}) — "
                             "faça um pedido por matéria.", prioridade)
    if not _RE_ACAO.search(texto) and not prioridade_declarada_do_texto(texto):
        return DecisaoIntake("NEEDS_INPUT", "não identifiquei o que deve ser feito — descreva a ação pedida.",
                             prioridade)
    slug = candidatas[0]
    return _proposta(texto, primeira, norm, prioridade=prioridade, slug=slug, arquivo=materias[slug],
                     materia_nova=False, tarefas=tarefas, comment_id=comment_id)


def _proposta(texto: str, primeira: str, norm: str, *, prioridade: str, slug: str, arquivo: str,
              materia_nova: bool, tarefas: list[dict], comment_id: int | None) -> DecisaoIntake:
    task_id = f"{slug}-intake-{hashlib.sha256(norm.encode('utf-8')).hexdigest()[:6]}"
    mesmo_id = tuple(t for t in tarefas if t.get("id") == task_id)
    if mesmo_id:
        return DecisaoIntake("EXISTENTE", "o mesmo pedido já está na fila.", prioridade, existentes=mesmo_id)

    da_materia = [t for t in tarefas if t.get("materia") == slug and t.get("estado") != "DONE"]
    vivas = tuple(t for t in da_materia if t.get("automation_enabled") is True and t.get("estado") in _ESTADOS_VIVOS)
    if vivas and not _RE_TAREFA_SEPARADA.search(texto):
        return DecisaoIntake(
            "NEEDS_INPUT",
            f"{slug} já tem tarefa automatizada em andamento — confirme se é a mesma coisa ou escreva "
            "'tarefa separada' para propor outra.", prioridade, existentes=vivas,
        )

    fonte_externa = bool(_RE_FONTE_EXTERNA.search(texto))
    bloqueios = []
    if fonte_externa:
        bloqueios.append(
            f"depende de fonte externa (Drive/provas) ainda não materializada: falta o source pack "
            f"`{SOURCE_PACK_DIR}/{task_id}-v1.md`"
        )
    if materia_nova:
        bloqueios.append("matéria nova: José precisa confirmar o escopo de arquivos (registro/index) antes de READY")
    estado = "BLOCKED" if bloqueios else "READY"
    origem = f"Issue #{INTAKE_ISSUE} · comentário {comment_id} · Intake #160" if comment_id is not None \
        else f"Issue #{INTAKE_ISSUE} · Intake #160"
    notas = (
        "Criada pelo Intake da Inbox #88 (Issue #160) a partir do pedido do José. "
        + (("Bloqueios: " + "; ".join(bloqueios) + ". ") if bloqueios else "")
        + "Resultado NEEDS-AUDIT; sem merge/deploy automático."
    )
    tarefa = {
        "id": task_id,
        "titulo": f"{prioridade} — {slug}: {primeira}"[:MAX_TITULO_CHARS + 10],
        "area": "materia",
        "materia": slug,
        "arquivos": [arquivo],
        "objetivo": re.sub(r"\s+", " ", texto)[:MAX_OBJETIVO_CHARS],
        "fonte": origem,
        "agente": None,
        "estado": estado,
        "prioridade_declarada": prioridade,
        "capabilities_required": ["conteudo"],
        "dependencias": [],
        "branch": f"runner/{task_id}",
        "pr": None,
        "commit": None,
        "issue": INTAKE_ISSUE,
        "notas": notas,
        "automation_enabled": not materia_nova,
        "bridge_enabled": True,
        "risk_level": "MEDIO",
        "policy_level": "C",
        "jose_authorized": True,
    }
    if _RE_QUESTOES.search(texto):
        tarefa["question_report_required"] = True
    if fonte_externa:
        tarefa["source_pack_required"] = True
        tarefa["source_pack_path"] = f"{SOURCE_PACK_DIR}/{task_id}-v1.md"
    relacionadas = tuple(t for t in da_materia if t not in vivas)
    return DecisaoIntake("PROPOSTA", "pedido novo transformado em proposta tipada.", prioridade,
                         tarefa=tarefa, relacionadas=relacionadas)


def sha256_texto(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def aplicar_proposta(conteudo_tasks_json: str, tarefa: dict) -> str:
    """Novo conteúdo de ``tasks.json`` = o atual + UMA tarefa no fim. Recusa
    id repetido e qualquer arquivo com curinga."""
    dados = json.loads(conteudo_tasks_json)
    if not _TASK_ID_RE.match(str(tarefa.get("id", ""))):
        raise ValueError("id de tarefa fora do formato canônico.")
    if any(t.get("id") == tarefa["id"] for t in dados.get("tarefas", [])):
        raise ValueError(f"tarefa {tarefa['id']!r} já existe.")
    arquivos = tarefa.get("arquivos") or []
    if len(arquivos) != 1 or any(c in arquivos[0] for c in "*?[]") or ".." in arquivos[0].split("/"):
        raise ValueError("allowed_files do Intake precisa ser exatamente um caminho literal.")
    dados["tarefas"].append(tarefa)
    return json.dumps(dados, ensure_ascii=False, indent=2) + "\n"


def montar_proposta_de_pr(decisao: DecisaoIntake, *, base_sha256: str) -> dict:
    """Metadados da PR administrativa (sem o conteúdo do arquivo)."""
    t = decisao.tarefa
    assert decisao.acao == "PROPOSTA" and t is not None
    relacionadas = "\n".join(f"- `{r.get('id')}` — estado {r.get('estado')}" for r in decisao.relacionadas) or "- nenhuma"
    corpo = "\n".join([
        INTAKE_PR_MARKER,
        "## ESCOPO",
        "",
        "- **Tarefa:** -",
        "- **Área:** infraestrutura",
        f"- **Arquivos permitidos:** `{TASKS_JSON_PATH}`",
        "- **Agente:** Coordinator (Intake #160)",
        "",
        f"**Objetivo (uma frase):** registrar na fila o pedido do José da Inbox #{INTAKE_ISSUE} como a tarefa "
        f"`{t['id']}`.",
        "",
        f"**Fonte:** {t['fonte']}",
        "",
        "## O QUE MUDOU",
        "",
        f"Uma tarefa nova no fim de `{TASKS_JSON_PATH}` — nenhum outro arquivo, nenhuma matéria.",
        "",
        f"| campo | valor |\n|---|---|\n| id | `{t['id']}` |\n| estado inicial | **{t['estado']}** |"
        f"\n| prioridade | {t['prioridade_declarada']} |\n| arquivo exato | `{t['arquivos'][0]}` |"
        f"\n| source pack | {'`' + t['source_pack_path'] + '` (ainda não existe)' if t.get('source_pack_required') else 'não exigido'} |",
        "",
        f"**Notas:** {t['notas']}",
        "",
        "**Tarefas relacionadas da mesma matéria (não duplicadas):**",
        relacionadas,
        "",
        "## 🟣 CARTÃO DE MERGE",
        "",
        "**O que muda:** depois do merge, o Worker Bridge passa a enxergar esta tarefa"
        + (" — como ela nasce BLOCKED, nada é executado até o bloqueio ser resolvido." if t["estado"] == "BLOCKED"
           else " e pode executá-la (resultado sempre NEEDS-AUDIT)."),
        "",
        "**Antes do merge:** nada é executado. Quem faz merge é o José.",
    ])
    return {
        "task_id": t["id"],
        "branch": f"{INTAKE_BRANCH_PREFIX}{t['id']}",
        "path": TASKS_JSON_PATH,
        "base_sha256": base_sha256,
        "title": f"Intake #{INTAKE_ISSUE} — {t['prioridade_declarada']} {t['materia']}: nova tarefa {t['id']}",
        "body": corpo,
        "tarefa": t,
    }
