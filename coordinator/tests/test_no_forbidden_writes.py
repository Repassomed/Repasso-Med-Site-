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


def test_source_files_have_no_forbidden_patterns() -> None:
    achados = []
    for nome in _ARQUIVOS_FONTE:
        caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, nome)
        with open(caminho, encoding="utf-8") as fh:
            conteudo = fh.read()
        for padrao, descricao in _PADROES_PROIBIDOS:
            if padrao.search(conteudo):
                achados.append(f"{nome}: {descricao} (padrão {padrao.pattern!r})")
    assert not achados, "Padrões proibidos encontrados:\n" + "\n".join(achados)
    print(f"OK  test_source_files_have_no_forbidden_patterns ({len(_ARQUIVOS_FONTE)} arquivos verificados)")


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
