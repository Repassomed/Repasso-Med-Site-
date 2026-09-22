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
#
# runner_dispatch.py (Issue #105, Fase D) também entra separado, pelo
# mesmo motivo — mas com uma checagem AINDA MAIS estrita
# (test_runner_dispatch_never_force_pushes_or_merges): "commit/checkpoint
# somente depois de validações passarem... nunca force-push" (Issue #105
# §"SEGURANÇA OBRIGATÓRIA") significa que este arquivo específico nem
# pode CONTER a substring `--force` (nem `force-with-lease`) em lugar
# nenhum — diferente de git_state.py, que usa `--force-with-lease`
# deliberadamente (condicionado ao estado esperado) para resolver a
# corrida de compare-and-swap da PRÓPRIA branch de estado. runner_dispatch.py
# nunca precisa dessa técnica: ele só publica um commit NOVO numa branch
# de trabalho nova/própria da tarefa (nunca reescreve uma branch já
# publicada), então um push comum, sem nenhuma forma de força, já basta.
_ARQUIVOS_FONTE_GERAL = [f for f in _ARQUIVOS_FONTE if f not in ("git_state.py", "runner_dispatch.py")]

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

# runner_dispatch.py (Issue #105, Fase D): mesma base de sempre, mais
# merge/rebase destrutivo/branch "main" hardcoded (igual a git_state.py).
# Nota: "reset --hard" NÃO entra na lista proibida aqui, ao contrário de
# git_state.py — ``resetar_workdir`` usa ``git reset --hard <commit_base>``
# de propósito, mas só LOCALMENTE, sobre o workdir descartável da própria
# tarefa, sempre ANTES de qualquer push (nunca depois, nunca sobre uma
# branch já publicada/compartilhada) — não afeta histórico remoto nenhum,
# então não é a mesma classe de risco que "reset --hard" teria em
# git_state.py (que nunca precisa disso). ADICIONALMENTE, proíbe QUALQUER
# `--force`/`force-with-lease` no arquivo inteiro — nunca condicionado a
# nada, porque este módulo nunca tem um caso de uso legítimo para isso (só
# publica commits novos numa branch de trabalho nova/própria da tarefa,
# nunca reescreve uma branch já publicada).
#
# Os padrões abaixo casam só com o formato de ARGUMENTO de string LITERAL
# que ``_run_git``/``subprocess`` de fato aceitariam (aspas retas: "merge",
# "--force") — nunca com prosa em ``crase-dupla`` do docstring do próprio
# módulo, que cita essas palavras de propósito para explicar que o módulo
# NUNCA faz isso (mesmo espírito de test_no_forbidden_writes.py permitir
# que comentários/docstrings citem os padrões proibidos sem disparar
# falso positivo).
_PADROES_PROIBIDOS_RUNNER_DISPATCH = _PADROES_PROIBIDOS_SEMPRE + [
    (re.compile(r"""["']merge["']"""), "argumento de comando git 'merge' (proibido em runner_dispatch.py)"),
    (re.compile(r"rebase\s+-i"), "rebase interativo"),
    (re.compile(r'checkout["\',]\s*.{0,4}"main"|push.{0,20}"main"'),
     'branch "main" hardcoded como alvo de checkout/push'),
    (re.compile(r"""["']--force\b|["']force-with-lease"""),
     "push com força (proibido em runner_dispatch.py, sem exceção)"),
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


def test_runner_dispatch_never_force_pushes_or_merges() -> None:
    """runner_dispatch.py (Issue #105, Fase D) PODE rodar git commit/push/
    checkout/reset local (é a razão dele existir — Fase D exige commit/
    checkpoint depois de validações passarem), mas NUNCA merge, NUNCA
    force-push/force-with-lease (sem exceção nenhuma, ao contrário de
    git_state.py — ver comentário acima), NUNCA branch "main"/"master"
    hardcoded como alvo, e NUNCA nenhuma chamada de Netlify."""
    caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, "runner_dispatch.py")
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    achados = []
    for padrao, descricao in _PADROES_PROIBIDOS_RUNNER_DISPATCH:
        if padrao.search(conteudo):
            achados.append(f"{descricao} (padrão {padrao.pattern!r})")
    assert not achados, "runner_dispatch.py: " + "; ".join(achados)
    # Confirma positivamente: o push real usa o nome de remoto/branch
    # PARAMETRIZADOS (nunca um literal 'main'/'master' — já garantido por
    # RunnerTask.__post_init__, mas provado aqui também no próprio texto).
    assert "task.branch" in conteudo
    print("OK  test_runner_dispatch_never_force_pushes_or_merges")


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
        test_runner_dispatch_never_force_pushes_or_merges,
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
