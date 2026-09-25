"""Issue #275 — o ``head_context`` enviado aos auditores precisa vir da
REGIÃO DO DIFF, não da primeira ocorrência global de uma palavra.

Caso real (PR #266, ``semiologia-ii.html`` ~710 KB): o passo do OBSERVE
extraía palavras das linhas removidas e usava ``indexOf`` no arquivo
inteiro. "verdadero"/"respuesta" aparecem centenas de vezes; o auditor
recebia outro bloco e reprovava por "evidência ausente", embora o resumo
correto do B08 existisse no mesmo HEAD.

A seleção vive em JavaScript puro (``.github/workflows/scripts/
head_context.mjs``), porque é lá que ela roda dentro de
``actions/github-script``. Este módulo não reimplementa a lógica em
Python: roda o teste comportamental real (``head_context.test.mjs``,
``node:test`` embutido) e confere, no workflow, que o passo usa o módulo
ancorado e não voltou ao ``indexOf`` global. Mesmo padrão de
``test_guard_run_resolver_race`` (sem ``node`` no PATH local: avisa e não
reprova; no GitHub Actions o ``node`` sempre existe).

Standalone:
    python3 -m coordinator.tests.test_head_context_anchor
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys

from . import _pathsetup

_SCRIPT_DIR = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "scripts")
_MODULE_PATH = os.path.join(_SCRIPT_DIR, "head_context.mjs")
_TEST_PATH = os.path.join(_SCRIPT_DIR, "head_context.test.mjs")
_OBSERVE = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "coordinator-observe.yml")


def _passo_prctx() -> str:
    with open(_OBSERVE, encoding="utf-8") as fh:
        texto = fh.read()
    idx = texto.index("Buscar dados reais da PR associada")
    fim = texto.index("Rodar o Coordinator sobre o evento real", idx)
    return texto[idx:fim]


def test_modulo_e_teste_js_existem() -> None:
    assert os.path.isfile(_MODULE_PATH), f"faltou {_MODULE_PATH}"
    assert os.path.isfile(_TEST_PATH), f"faltou {_TEST_PATH}"
    print("OK  test_modulo_e_teste_js_existem")


def test_workflow_usa_contexto_ancorado_e_nao_indexof_global() -> None:
    trecho = _passo_prctx()
    assert "head_context.mjs" in trecho, "o passo precisa usar o módulo ancorado"
    assert "montarContextoHead" in trecho
    assert "process.env.GITHUB_WORKSPACE" in trecho, "módulo vem do checkout da branch padrão"
    assert "diffTexto" in trecho, "a âncora é o diff real da PR"
    assert ".indexOf(term)" not in trecho, "regressão da #275: indexOf global voltou"
    assert "content.slice(0, 2200)" not in trecho, "fallback 'começo do arquivo' não pode voltar"
    assert "ref: pr.head.sha" in trecho
    assert ".slice(0, 7000)" in trecho
    with open(_MODULE_PATH, encoding="utf-8") as fh:
        modulo = fh.read()
    for proibido in ("require(", "import(", "fetch(", "child_process", "eval(", "new Function"):
        assert proibido not in modulo, f"módulo puro não pode usar {proibido!r}"
    print("OK  test_workflow_usa_contexto_ancorado_e_nao_indexof_global")


def test_node_test_runner_prova_contexto_do_bloco_do_diff() -> None:
    node = shutil.which("node")
    if node is None:
        print(
            "AVISO  node não encontrado no PATH — pulando a prova comportamental "
            "(GitHub Actions ubuntu-latest sempre tem node)."
        )
        print("OK  test_node_test_runner_prova_contexto_do_bloco_do_diff (pulado)")
        return
    resultado = subprocess.run(
        [node, "--test", _TEST_PATH],
        cwd=_pathsetup.REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=60,
    )
    saida = resultado.stdout + resultado.stderr
    assert resultado.returncode == 0, f"node --test falhou (exit {resultado.returncode}):\n{saida}"
    assert "# fail 0" in saida, f"algum teste JS falhou:\n{saida}"
    assert "# pass 6" in saida, f"esperava 6 testes passando, saída:\n{saida}"
    for nome in (
        "HTML grande com termos repetidos: contexto vem do bloco B, não do primeiro bloco",
        "o ensino ANTES da questão tem prioridade sobre conteúdo depois dela",
        "teto rígido de tamanho é respeitado mesmo com limite pequeno",
        "fail-closed: arquivo sem hunk no diff não recebe trecho inventado",
    ):
        assert nome in saida, f"teste esperado ausente da saída: {nome!r}"
    print("OK  test_node_test_runner_prova_contexto_do_bloco_do_diff")


def main() -> int:
    testes = [
        test_modulo_e_teste_js_existem,
        test_workflow_usa_contexto_ancorado_e_nao_indexof_global,
        test_node_test_runner_prova_contexto_do_bloco_do_diff,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as exc:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {exc}")
    print()
    print(f"{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
