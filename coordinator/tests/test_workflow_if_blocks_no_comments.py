"""Issue #274 — P0: o Worker Bridge parou de iniciar em QUALQUER gatilho.

REPRODUÇÃO REAL (confirmada, não presumida): depois do merge da #264,
Heartbeat -> Guard -> OBSERVE passou a funcionar (OBSERVE run
36167468111 terminou SUCCESS), mas o passo que tenta despachar o Worker
Bridge recebeu do GitHub:

    Invalid Argument - failed to parse workflow: (Line: 142, Col: 9):
    Unexpected symbol: '#'

CAUSA: ``.github/workflows/coordinator-worker-bridge.yml``,
``jobs.bridge.if: >`` (bloco dobrado — YAML "folded scalar") continha
comentários ``# ...`` NO MEIO do próprio valor multilinha, adicionados
pela PR #264 para explicar o ramo novo do gate. Um `if: >` do GitHub
Actions não é um bloco de comentário/código comum — o texto inteiro do
escalar dobrado vira UMA ÚNICA expressão contígua para o avaliador de
expressões, e ``#`` não é um símbolo válido nessa gramática. O parser do
workflow inteiro falhava, então o Worker Bridge não iniciava em NENHUM
gatilho (nem workflow_dispatch manual, nem schedule, nem push, nem
workflow_run) — não só no ramo novo que a #264 tinha acrescentado.

CORREÇÃO (PR #274): os comentários explicativos foram movidos para ANTES
da chave ``if:`` (como comentário de job normal), preservando byte-a-
byte a mesma expressão booleana e os mesmos 5 ramos/gates
(branch padrão, ator humano ``Repassomed``, ``github-actions[bot]`` +
``active-supervised``, ``schedule``, ``push``, ``workflow_run``).

Este módulo prova DUAS coisas:

1. o bug específico do Worker Bridge está corrigido (nenhum ``#`` dentro
   do ``if:`` daquele job, e os 5 ramos continuam exatamente os mesmos);
2. REGRESSÃO GERAL: nenhum ``if:`` de bloco dobrado/literal
   (``if: >`` ou ``if: |``, com ou sem os modificadores ``+``/``-``) em
   QUALQUER workflow de ``.github/workflows/`` pode voltar a ter um
   comentário embutido — o mesmo scanner que corrigiu este bug
   continua vigiando todo workflow crítico, não só este arquivo.

Mesma filosofia/técnica de ``test_workflow_security.py``: texto/regex
simples, sem parser de YAML (``yaml.safe_load`` aceitaria o arquivo
quebrado sem erro — o parser de EXPRESSÕES do GitHub Actions é quem
rejeita, e esse scanner reproduz a mesma regra: nenhuma linha começando
com ``#`` dentro do corpo de um ``if:`` multilinha).

Standalone:
    python3 -m coordinator.tests.test_workflow_if_blocks_no_comments
"""

from __future__ import annotations

import os
import re
import sys

from . import _pathsetup

_WORKFLOWS_DIR = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows")
_BRIDGE_PATH = os.path.join(_WORKFLOWS_DIR, "coordinator-worker-bridge.yml")

_IF_BLOCK_KEY_RE = re.compile(r"^(?P<indent>[ \t]*)if:\s*[>|][+-]?\s*$")


def _todos_os_workflows() -> list[str]:
    return sorted(
        os.path.join(_WORKFLOWS_DIR, nome)
        for nome in os.listdir(_WORKFLOWS_DIR)
        if nome.endswith((".yml", ".yaml"))
    )


def encontrar_comentarios_dentro_de_if_multilinha(caminho: str) -> list[tuple[int, int, str]]:
    """Varre ``caminho`` procurando ``if: >``/``if: |`` (bloco dobrado ou
    literal) seguido de QUALQUER linha, dentro do mesmo bloco (indentação
    maior que a da própria chave ``if:``), que comece com ``#`` depois de
    remover espaços.

    Devolve uma lista de ``(linha_da_chave_if, linha_do_comentario,
    texto_da_linha)`` — vazia quando o arquivo está limpo. Esta é
    EXATAMENTE a condição que o parser de expressões do GitHub Actions
    rejeita: o bloco dobrado vira uma string contígua e ``#`` não é um
    símbolo válido na expressão resultante.
    """
    with open(caminho, encoding="utf-8") as fh:
        linhas = fh.readlines()

    achados: list[tuple[int, int, str]] = []
    dentro_do_bloco = False
    indent_da_chave = -1
    linha_da_chave = -1

    for numero, linha in enumerate(linhas, start=1):
        casamento = _IF_BLOCK_KEY_RE.match(linha)
        if casamento:
            dentro_do_bloco = True
            indent_da_chave = len(casamento.group("indent"))
            linha_da_chave = numero
            continue

        if not dentro_do_bloco:
            continue

        sem_quebra = linha.rstrip("\n")
        if sem_quebra.strip() == "":
            # Linha em branco: YAML de bloco dobrado permite, não decide
            # o fim do escopo por si só.
            continue

        indent_atual = len(linha) - len(linha.lstrip(" \t"))
        if indent_atual <= indent_da_chave:
            # Voltou para a indentação da própria chave (ou menos) —
            # o valor multilinha terminou.
            dentro_do_bloco = False
            continue

        if sem_quebra.lstrip().startswith("#"):
            achados.append((linha_da_chave, numero, sem_quebra))

    return achados


def test_reproducao_bug_original_no_arquivo_pre_correcao() -> None:
    """Reprodução: aplicando o scanner ao TEXTO exato que causou o erro
    real do GitHub ('Unexpected symbol: #', Line 142), ele precisa achar
    o comentário embutido — prova que o detector reconhece o bug de
    verdade, não só que "não sobrou nada" no arquivo já corrigido."""
    texto_com_bug = (
        "jobs:\n"
        "  bridge:\n"
        "    if: >\n"
        "      vars.REPASSO_WORKER_BRIDGE_ENABLED == 'true' &&\n"
        "      (\n"
        "        (github.event_name == 'workflow_dispatch' && github.actor == 'Repassomed') ||\n"
        "        # Issue #259 — comentário que não devia estar aqui dentro.\n"
        "        (github.event_name == 'schedule')\n"
        "      )\n"
        "    runs-on: ubuntu-latest\n"
    )
    caminho_temp = os.path.join(_pathsetup.REPO_ROOT, "coordinator", "tests", "__tmp_bug_fixture__.yml")
    with open(caminho_temp, "w", encoding="utf-8") as fh:
        fh.write(texto_com_bug)
    try:
        achados = encontrar_comentarios_dentro_de_if_multilinha(caminho_temp)
    finally:
        os.remove(caminho_temp)
    assert len(achados) == 1, f"o detector precisa reproduzir o bug original; achou {achados}"
    linha_if, linha_comentario, texto = achados[0]
    assert linha_if == 3
    assert "Issue #259" in texto
    print("OK  test_reproducao_bug_original_no_arquivo_pre_correcao")


def test_worker_bridge_nao_tem_mais_comentario_dentro_do_if() -> None:
    """O bug real, corrigido: zero comentário embutido no if: do job
    bridge — a causa raiz exata do erro de parser reportado."""
    achados = encontrar_comentarios_dentro_de_if_multilinha(_BRIDGE_PATH)
    assert not achados, (
        f"comentário(s) ainda dentro do if: multilinha de coordinator-worker-bridge.yml: {achados} — "
        "isso é EXATAMENTE o que quebrava o parser do GitHub Actions (Issue #274)"
    )
    print("OK  test_worker_bridge_nao_tem_mais_comentario_dentro_do_if")


def test_nenhum_workflow_critico_tem_comentario_dentro_de_if_multilinha() -> None:
    """Regressão GERAL (pedida pela Issue #274): nenhum workflow em
    .github/workflows/ pode ter um comentário dentro de um if: de bloco
    dobrado/literal — não só o arquivo que quebrou desta vez. Protege
    contra o MESMO erro reaparecer em qualquer workflow crítico futuro
    (Guard, OBSERVE, Heartbeat, Auto-Reparo, Runner, Bridge)."""
    workflows = _todos_os_workflows()
    assert len(workflows) >= 6, f"esperava pelo menos os 6 workflows conhecidos, achou {len(workflows)}"
    todos_os_achados: dict[str, list[tuple[int, int, str]]] = {}
    for caminho in workflows:
        achados = encontrar_comentarios_dentro_de_if_multilinha(caminho)
        if achados:
            todos_os_achados[os.path.basename(caminho)] = achados
    assert not todos_os_achados, (
        "comentário(s) dentro de if: multilinha — o GitHub Actions recusa isso como erro de "
        f"parser (Issue #274): {todos_os_achados}"
    )
    print(f"OK  test_nenhum_workflow_critico_tem_comentario_dentro_de_if_multilinha ({len(workflows)} arquivos verificados)")


def test_os_cinco_ramos_do_gate_do_bridge_continuam_intactos() -> None:
    """Preservação exigida pela Issue #274: mover os comentários para
    fora não pode mudar NENHUM gate. Prova, byte-a-byte, que os 5 ramos
    do if: continuam exatamente os mesmos — branch padrão, ator humano,
    github-actions[bot] + active-supervised, schedule, push, workflow_run
    (com todas as condições de same-repo/branch/conclusão)."""
    with open(_BRIDGE_PATH, encoding="utf-8") as fh:
        texto = fh.read()
    idx_if = texto.index("\n    if: >")
    idx_runs_on = texto.index("\n    runs-on:", idx_if)
    bloco_if = texto[idx_if:idx_runs_on]

    assert "vars.REPASSO_WORKER_BRIDGE_ENABLED == 'true'" in bloco_if
    assert "github.ref == format('refs/heads/{0}', github.event.repository.default_branch)" in bloco_if
    assert "(github.event_name == 'workflow_dispatch' && github.actor == 'Repassomed')" in bloco_if
    assert (
        "(github.event_name == 'workflow_dispatch' && github.actor == 'github-actions[bot]' &&\n"
        "         vars.REPASSO_WORKER_BRIDGE_MODE == 'active-supervised')"
        in bloco_if
    )
    assert "(github.event_name == 'schedule' &&\n         vars.REPASSO_WORKER_BRIDGE_MODE == 'active-supervised')" in bloco_if
    assert "(github.event_name == 'push' &&\n         vars.REPASSO_WORKER_BRIDGE_MODE == 'active-supervised')" in bloco_if
    assert "(github.event_name == 'workflow_run' &&" in bloco_if
    assert "github.event.workflow_run.conclusion == 'success'" in bloco_if
    assert "github.event.workflow_run.head_repository.full_name == github.repository" in bloco_if
    assert "github.event.workflow_run.head_branch == github.event.repository.default_branch" in bloco_if
    # Exatamente 5 ramos top-level (contagem de "||" entre os 5 grupos
    # dentro dos parênteses externos) — nem sobrou, nem faltou nenhum.
    assert bloco_if.count(") ||\n") + bloco_if.count(")\n      )") == 5, (
        "esperava exatamente 5 ramos no if: do job bridge — a contagem mudou"
    )
    print("OK  test_os_cinco_ramos_do_gate_do_bridge_continuam_intactos")


def main() -> int:
    testes = [
        test_reproducao_bug_original_no_arquivo_pre_correcao,
        test_worker_bridge_nao_tem_mais_comentario_dentro_do_if,
        test_nenhum_workflow_critico_tem_comentario_dentro_de_if_multilinha,
        test_os_cinco_ramos_do_gate_do_bridge_continuam_intactos,
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
