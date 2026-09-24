"""Repasso Guard — verificador automático de PR.

Uso:

    python3 -m tools.qa.guard --base origin/main --head HEAD
    python3 -m tools.qa.guard --base origin/main --head HEAD --pr-body corpo.md

O que ele faz, em ordem:

    1. descobre o que o PR mudou (nomes, blobs antes/depois, linhas adicionadas);
    2. lê o «## ESCOPO» do corpo do PR e o registro coordination/tasks.json;
    3. roda as verificações de tools/qa/guard/checks.py;
    4. imprime um resumo legível por gente;
    5. grava o pacote de auditoria em JSON, para a futura IA coordenadora.

O que ele **não** faz, por lei da Issue #81: não julga conteúdo médico, não
escreve no Supabase, não chama nenhuma API, não faz merge, não altera nada no
repositório além dos dois arquivos de saída.

Só biblioteca padrão. Nenhuma dependência, nenhum custo.

**Sobre o parâmetro ``--trusted-source``:** este módulo NÃO decide sozinho se
está rodando a partir de código confiável — isso é decidido por quem o
invoca (o workflow), extraindo o pacote ``tools/qa/guard`` da base do PR
*antes* de chamar este CLI (ver ``.github/workflows/guard.yml``). O flag só
existe para que o relatório diga a verdade sobre a própria execução, em vez
de fingir uma certeza que o módulo não tem. Sem o flag, o valor é
"desconhecido" — correto para quem roda localmente.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys

from . import checks
from .checks import HARD_FAIL, INFO, WARNING, Context, Finding


# --------------------------------------------------------------------------
# git
# --------------------------------------------------------------------------

def _git(repo: str, *args: str) -> str:
    r = subprocess.run(["git", "-C", repo, *args],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return ""
    return r.stdout


def _merge_base(repo: str, base: str, head: str) -> str:
    out = _git(repo, "merge-base", base, head).strip()
    return out or base


def changed_files(repo: str, base: str, head: str) -> list[str]:
    raw = _git(repo, "diff", "--name-only", f"{base}..{head}")
    return [l for l in raw.splitlines() if l.strip()]


def added_lines(repo: str, base: str, head: str, paths: list[str]) -> dict:
    """Linhas que o PR ACRESCENTOU, por arquivo.

    Usa ``-U0`` porque só interessa o que entrou; contexto inflaria a busca por
    segredo e por rótulo proibido com texto que já estava lá.
    """
    out: dict[str, list[str]] = {}
    for p in paths:
        raw = _git(repo, "diff", "-U0", f"{base}..{head}", "--", p)
        linhas = [l[1:] for l in raw.splitlines()
                  if l.startswith("+") and not l.startswith("+++")]
        if linhas:
            out[p] = linhas
    return out


def _blob(repo: str, ref: str, path: str) -> str | None:
    r = subprocess.run(["git", "-C", repo, "show", f"{ref}:{path}"],
                       capture_output=True, text=True, errors="replace")
    return r.stdout if r.returncode == 0 else None


def _all_materia_paths(repo: str, ref: str) -> tuple[str, ...]:
    """Todos os caminhos de matéria que existem em ``ref`` — não só os que o
    PR mudou. Usado por ``checks.check_assets_removed_outside_materia``
    (Issue #256) para conseguir avaliar uma matéria cujo HTML não está em
    ``ctx.changed``. ``git ls-tree`` lê a árvore de ``ref`` direto, sem
    precisar de checkout.

    Lista a árvore INTEIRA e filtra com ``checks._is_materia`` (o mesmo
    predicado que ``check_materias`` já usa) em vez de passar
    ``checks.MATERIA_DIR`` como pathspec do ``git ls-tree``: a versão real do
    site fica em ``Repasso-Med-Site--main/Atual - Copia/netlify/…`` — um
    prefixo mais longo do que ``MATERIA_DIR`` — e ``git ls-tree -- <path>``
    trata o argumento como pathspec (prefixo), não substring, então nunca
    encontraria nada nesse layout. ``_is_materia`` já resolve isso em todo o
    resto do código com ``MATERIA_DIR in path`` (substring), então a mesma
    regra precisa valer aqui."""
    raw = _git(repo, "ls-tree", "-r", "--name-only", ref)
    return tuple(l for l in raw.splitlines() if checks._is_materia(l))


def _exists_at(repo: str, ref: str, path: str) -> bool:
    r = subprocess.run(["git", "-C", repo, "cat-file", "-e", f"{ref}:{path}"],
                       capture_output=True, text=True)
    if r.returncode == 0:
        return True
    return os.path.exists(os.path.join(repo, path))


# --------------------------------------------------------------------------
# corpo do PR
# --------------------------------------------------------------------------

RE_CAMPO = re.compile(r"^\s*[-*]\s*\*\*(.+?):\*\*\s*(.*)$")

# Nomes de campo -> chave interna. O template está em português; aceitar as
# duas grafias evita reprovar um PR por acento.
CAMPOS = {
    "tarefa": "tarefa",
    "área": "area", "area": "area",
    "arquivos permitidos": "arquivos",
    "agente": "agente",
    "objetivo": "objetivo",
    "fonte": "fonte",
    "dependências": "dependencias", "dependencias": "dependencias",
}


def parse_scope(corpo: str) -> dict:
    """Lê o bloco «## ESCOPO» do corpo do PR.

    Tolerante de propósito: um PR mal formatado vira WARNING na verificação de
    escopo, não um HARD FAIL aqui. O Guard não existe para punir formatação.
    """
    if not corpo:
        return {}
    linhas = corpo.splitlines()
    dentro = False
    dados: dict = {}
    for ln in linhas:
        if re.match(r"^\s*#{1,6}\s", ln):
            dentro = bool(re.search(r"(?i)^\s*#{1,6}\s*ESCOPO\b", ln))
            continue
        if not dentro:
            continue
        m = RE_CAMPO.match(ln)
        if not m:
            continue
        rotulo = m.group(1).strip().lower()
        valor = m.group(2).strip()
        chave = CAMPOS.get(rotulo)
        if not chave:
            continue
        if valor in ("", "-", "—", "<...>"):
            continue
        if chave in ("arquivos", "dependencias"):
            dados[chave] = [v.strip().strip("`") for v in valor.split(",") if v.strip()]
        else:
            dados[chave] = valor.strip("`")
    return dados


# --------------------------------------------------------------------------
# relatório
# --------------------------------------------------------------------------

ORDEM = {HARD_FAIL: 0, WARNING: 1, INFO: 2}
ICONE = {HARD_FAIL: "🔴", WARNING: "🟡", INFO: "⚪"}


def render(findings: list[Finding], ctx: Context, pack: dict) -> str:
    duros = [f for f in findings if f.severity == HARD_FAIL]
    avisos = [f for f in findings if f.severity == WARNING]
    infos = [f for f in findings if f.severity == INFO]

    L: list[str] = []
    L.append("# Repasso Guard")
    L.append("")
    if duros:
        L.append(f"## 🔴 REPROVADO — {len(duros)} problema(s) objetivo(s)")
    elif avisos:
        L.append(f"## 🟡 PASSOU COM AVISOS — {len(avisos)} ponto(s) para olho humano")
    else:
        L.append("## 🟢 PASSOU — nada objetivo a corrigir")
    L.append("")
    L.append(f"Arquivos alterados: **{len(ctx.changed)}**  ·  "
             f"tarefa declarada: **{ctx.scope.get('tarefa') or '—'}**  ·  "
             f"agente: **{ctx.scope.get('agente') or '—'}**")
    L.append(f"Código do Guard nesta execução: **{ctx.trusted_source}**"
             + (" (extraído da base — confiável)" if ctx.trusted_source == "base"
                else " (⚠️ bootstrap: base ainda não tem o Guard, esta execução usou o próprio PR)"
                if ctx.trusted_source == "head-bootstrap"
                else " (execução local, fora do workflow)"))
    L.append("")

    for titulo, grupo in (("Erros", duros), ("Avisos", avisos)):
        if not grupo:
            continue
        L.append(f"### {titulo}")
        L.append("")
        for f in grupo:
            onde = f" — `{f.where}`" if f.where else ""
            L.append(f"- {ICONE[f.severity]} **{f.check}**{onde}: {f.message}")
            for chave, valor in f.detail.items():
                if isinstance(valor, list) and valor:
                    amostra = ", ".join(str(v) for v in valor[:6]) if not isinstance(valor[0], dict) \
                        else json.dumps(valor[:3], ensure_ascii=False)
                    L.append(f"    - {chave}: {amostra}")
        L.append("")

    if pack["total"]:
        L.append("### Conteúdo médico a conferir (Lei 6)")
        L.append("")
        L.append(f"{pack['total']} linha(s) adicionada(s) mexem em número, gabarito ou "
                 "afirmação terapêutica. O Guard **não julga** se estão certas — "
                 "estão listadas no pacote de auditoria para conferência humana.")
        L.append("")

    L.append("<details><summary>Verificações que passaram</summary>")
    L.append("")
    for f in infos:
        L.append(f"- ⚪ **{f.check}**: {f.message}")
    L.append("")
    L.append("</details>")
    L.append("")
    L.append("---")
    L.append("")
    L.append("O Guard verifica o que é **objetivo e mensurável**. Ele não substitui "
             "a auditoria humana nem decide correção científica. "
             "**Verde não é permissão de merge** — quem dá merge é o José.")
    return "\n".join(L)


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def _load_tasks_json(repo: str, ref: str) -> tuple[dict | None, Finding | None]:
    """Lê e valida coordination/tasks.json numa ref. Devolve (dados, erro)."""
    bruto = _blob(repo, ref, "coordination/tasks.json")
    if not bruto:
        return None, None
    try:
        return json.loads(bruto), None
    except json.JSONDecodeError as e:
        erro = Finding("registro-tarefas", HARD_FAIL,
                       f"coordination/tasks.json não é JSON válido em {ref}: {e}",
                       "coordination/tasks.json")
        return None, erro


def run(repo: str, base: str, head: str, corpo: str,
        trusted_source: str = "desconhecido") -> tuple[list[Finding], Context, dict]:
    mb = _merge_base(repo, base, head)
    mudados = changed_files(repo, mb, head)

    tasks_head, erro_head = _load_tasks_json(repo, head)
    # A reserva de arquivo de uma tarefa já existente só vale a partir da
    # BASE — nunca do HEAD deste PR (bloqueador 2 da auditoria do #94).
    # Ver o docstring de checks.check_scope.
    tasks_base, erro_base = _load_tasks_json(repo, mb)

    ctx = Context(
        repo_root=repo,
        changed=mudados,
        base_blob=lambda p: _blob(repo, mb, p),
        head_blob=lambda p: _blob(repo, head, p),
        added_lines=added_lines(repo, mb, head, mudados),
        scope=parse_scope(corpo),
        tasks=tasks_head,
        file_exists=lambda p: _exists_at(repo, head, p),
        tasks_base=tasks_base,
        trusted_source=trusted_source,
        all_materias=_all_materia_paths(repo, head),
    )

    findings: list[Finding] = []
    for erro in (erro_head, erro_base):
        if erro:
            findings.append(erro)
    if not erro_head:
        findings.extend(checks.check_task_registry(ctx))
    findings.extend(checks.check_scope(ctx))
    findings.extend(checks.check_critical_files(ctx))
    findings.extend(checks.check_guard_integrity(ctx))
    findings.extend(checks.check_secrets(ctx))
    findings.extend(checks.check_paid_api(ctx))
    findings.extend(checks.check_materias(ctx))
    findings.extend(checks.check_assets_removed_outside_materia(ctx))
    findings.extend(checks.check_nomenclature(ctx))
    findings.extend(checks.check_orphan_materia(ctx))

    findings.sort(key=lambda f: (ORDEM[f.severity], f.check))
    pack = checks.collect_medical_diff(ctx)
    return findings, ctx, pack


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="repasso-guard", description="Verificador automático de PR.")
    ap.add_argument("--repo", default=".", help="raiz do repositório")
    ap.add_argument("--base", default="origin/main", help="ref de base")
    ap.add_argument("--head", default="HEAD", help="ref do PR")
    ap.add_argument("--pr-body", default=None, help="arquivo com o corpo do PR")
    ap.add_argument("--summary", default=None, help="arquivo onde gravar o resumo humano")
    ap.add_argument("--audit-pack", default=None, help="arquivo onde gravar o pacote JSON")
    ap.add_argument("--allow-fail", action="store_true",
                    help="sempre sair com 0; útil para inspecionar sem reprovar")
    ap.add_argument("--trusted-source", default="desconhecido",
                    help="de onde veio o CÓDIGO deste Guard nesta execução: 'base' quando o "
                         "workflow extraiu tools/qa/guard da base do PR (o caso confiável), "
                         "'head-bootstrap' quando a base ainda não tinha o Guard. Só descreve "
                         "a execução no relatório — não afeta nenhuma verificação.")
    a = ap.parse_args(argv)

    repo = os.path.abspath(a.repo)
    corpo = ""
    if a.pr_body and os.path.exists(a.pr_body):
        with open(a.pr_body, encoding="utf-8", errors="replace") as fh:
            corpo = fh.read()

    findings, ctx, pack = run(repo, a.base, a.head, corpo, a.trusted_source)
    resumo = render(findings, ctx, pack)
    print(resumo)

    if a.summary:
        os.makedirs(os.path.dirname(os.path.abspath(a.summary)) or ".", exist_ok=True)
        with open(a.summary, "w", encoding="utf-8") as fh:
            fh.write(resumo + "\n")

    if a.audit_pack:
        os.makedirs(os.path.dirname(os.path.abspath(a.audit_pack)) or ".", exist_ok=True)
        pacote = {
            "versao": 1,
            "base": a.base,
            "head": a.head,
            "trusted_source": ctx.trusted_source,
            "escopo_declarado": ctx.scope,
            "arquivos_alterados": ctx.changed,
            "resultado": ("REPROVADO" if any(f.severity == HARD_FAIL for f in findings)
                          else "APROVADO COM AVISOS" if any(f.severity == WARNING for f in findings)
                          else "APROVADO"),
            "contagem": {
                HARD_FAIL: sum(1 for f in findings if f.severity == HARD_FAIL),
                WARNING: sum(1 for f in findings if f.severity == WARNING),
                INFO: sum(1 for f in findings if f.severity == INFO),
            },
            "achados": [f.to_dict() for f in findings],
            "conteudo_medico": pack,
            "aviso": ("Este pacote descreve o que é objetivo. Não contém julgamento "
                      "de correção científica e não autoriza merge."),
        }
        with open(a.audit_pack, "w", encoding="utf-8") as fh:
            json.dump(pacote, fh, ensure_ascii=False, indent=2)

    if a.allow_fail:
        return 0
    return 1 if any(f.severity == HARD_FAIL for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())
