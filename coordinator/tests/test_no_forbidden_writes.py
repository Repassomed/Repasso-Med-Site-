"""Prova estrutural: o Coordinator não pode editar matéria/Supabase/produção
nem fazer merge — porque o código simplesmente não contém os meios de fazer
isso, não porque "decidiu não fazer" em tempo de execução.

Isto varre o CÓDIGO-FONTE do pacote ``coordinator/`` (não os testes, não os
fixtures) por padrões que indicariam essas capacidades, e falha se
encontrar qualquer um. Mesma filosofia do Repasso Guard: verificar o que é
objetivo e mensurável.
"""

from __future__ import annotations

import os
import re
import sys

from . import _pathsetup

# Só o código de produção do pacote — não os próprios testes (que citam
# esses padrões nos comentários/docstrings para explicar o que NÃO fazem).
_ARQUIVOS_FONTE = [
    f for f in os.listdir(_pathsetup._COORDINATOR_ROOT)
    if f.endswith(".py") and f not in ("__main__.py",)
]
# __main__.py entra separado porque é o único ponto que grava arquivo em
# disco (o resultado OBSERVE) — precisa de uma checagem mais específica,
# não uma proibição total de `open(..., "w")`.

# git_state.py entra separado desde o bloqueador 2 da auditoria do PR #97:
# ele PRECISA rodar `git` (commit/push) para persistir dedup/ledger entre
# execuções independentes do GitHub Actions numa branch dedicada. Isso é
# uma capacidade nova e legítima, não uma brecha — por isso tem sua própria
# checagem (test_git_state_never_targets_main_or_materia), mais estreita:
# proíbe supabase/matéria/merge/force-push/branch "main" hardcoded, mas
# permite `subprocess`/`git commit`/`git push` porque é exatamente para
# isso que o arquivo existe.
_ARQUIVOS_FONTE_GERAL = [f for f in _ARQUIVOS_FONTE if f != "git_state.py"]

_PADROES_PROIBIDOS = [
    (re.compile(r"\bimport\s+supabase\b"), "import direto do cliente Supabase"),
    (re.compile(r"\bfrom\s+supabase\b"), "import direto do cliente Supabase"),
    (re.compile(r"\bpostgrest\b", re.I), "cliente postgrest (camada do Supabase)"),
    (re.compile(r"\bpsycopg\b"), "driver Postgres direto"),
    (re.compile(r"SUPABASE_(URL|KEY|SERVICE_ROLE)"), "credencial do Supabase"),
    (re.compile(r"materias-privadas"), "caminho de arquivo de matéria"),
    (re.compile(r"Atual - Copia"), "caminho da raiz do site publicado"),
    (re.compile(r"merge_pull_request|pulls/merge|gh\s+pr\s+merge"), "chamada de merge"),
    (re.compile(r"git\s+push\b"), "push de git (o Coordinator não versiona nada sozinho)"),
    (re.compile(r"git\s+commit\b"), "commit de git"),
    (re.compile(r"subprocess"), "execução de processo externo (não deveria precisar)"),
]

# O subconjunto que continua valendo mesmo para git_state.py — o que
# nenhum código deste pacote pode fazer, ponto final.
_PADROES_PROIBIDOS_SEMPRE = [
    p for p in _PADROES_PROIBIDOS
    if p[1] not in (
        "push de git (o Coordinator não versiona nada sozinho)",
        "commit de git",
        "execução de processo externo (não deveria precisar)",
    )
]

_PADROES_PROIBIDOS_GIT_STATE = _PADROES_PROIBIDOS_SEMPRE + [
    (re.compile(r"merge|rebase\s+-i|push\s+.*--force|reset\s+--hard"),
     "operação destrutiva/de merge de git"),
    (re.compile(r'checkout["\',]\s*.{0,4}"main"|push.{0,20}"main"'),
     'branch "main" hardcoded como alvo de checkout/push'),
]


def test_source_files_have_no_forbidden_patterns() -> None:
    achados = []
    for nome in _ARQUIVOS_FONTE_GERAL:
        caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, nome)
        with open(caminho, encoding="utf-8") as fh:
            conteudo = fh.read()
        for padrao, descricao in _PADROES_PROIBIDOS:
            if padrao.search(conteudo):
                achados.append(f"{nome}: {descricao} (padrão {padrao.pattern!r})")
    assert not achados, "Padrões proibidos encontrados:\n" + "\n".join(achados)
    print(f"OK  test_source_files_have_no_forbidden_patterns ({len(_ARQUIVOS_FONTE_GERAL)} arquivos verificados)")


def test_git_state_never_targets_main_or_materia() -> None:
    """git_state.py PODE rodar git commit/push (é a razão dele existir),
    mas NUNCA para 'main', matéria, merge ou operação destrutiva — só para
    a branch parametrizada de estado (self.branch, nunca um literal
    'main')."""
    caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, "git_state.py")
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    achados = []
    for padrao, descricao in _PADROES_PROIBIDOS_GIT_STATE:
        if padrao.search(conteudo):
            achados.append(f"{descricao} (padrão {padrao.pattern!r})")
    assert not achados, "git_state.py: " + "; ".join(achados)
    # Confirma positivamente que o branch é sempre o atributo parametrizado,
    # nunca uma string solta.
    assert "self.branch" in conteudo
    assert 'DEFAULT_BRANCH = "coordinator-state"' in conteudo, (
        "a branch padrão de estado precisa continuar sendo dedicada, nunca 'main'"
    )
    print("OK  test_git_state_never_targets_main_or_materia")


def test_main_only_writes_its_own_output_and_state_files() -> None:
    """__main__.py pode escrever arquivo (o resultado OBSERVE e o estado de
    dedup/ledger) — mas só isso. Confirma que os únicos `open(..., "w")` no
    arquivo escrevem para os caminhos vindos de --out/--dedup-store/
    --usage-ledger (argumentos do próprio CLI), nunca um caminho fixo de
    matéria/produção."""
    caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, "__main__.py")
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    for padrao, descricao in _PADROES_PROIBIDOS:
        if padrao.search(conteudo):
            raise AssertionError(f"__main__.py: {descricao} (padrão {padrao.pattern!r})")
    # dedup.py e budget.py também escrevem arquivo — mesma checagem lá,
    # já coberta por test_source_files_have_no_forbidden_patterns já que
    # ambos estão em _ARQUIVOS_FONTE.
    print("OK  test_main_only_writes_its_own_output_and_state_files")


def main() -> int:
    testes = [
        test_source_files_have_no_forbidden_patterns,
        test_git_state_never_targets_main_or_materia,
        test_main_only_writes_its_own_output_and_state_files,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {e}")
    print(f"\n{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
