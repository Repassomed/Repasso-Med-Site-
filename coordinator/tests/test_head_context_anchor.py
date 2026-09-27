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
from coordinator.github_event import (
    HEAD_CONTEXT_8A_POLICY, LEI_8A_MATRIX_HEADER, build_event_from_github_context,
)

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
    assert ".slice(0, 12000)" in trecho
    assert "prBody" in trecho, "Issue #305: o corpo da PR precisa chegar ao módulo (Matriz por fonte 8-A)"
    with open(_MODULE_PATH, encoding="utf-8") as fh:
        modulo = fh.read()
    for proibido in ("require(", "import(", "fetch(", "child_process", "eval(", "new Function"):
        assert proibido not in modulo, f"módulo puro não pode usar {proibido!r}"
    print("OK  test_workflow_usa_contexto_ancorado_e_nao_indexof_global")


def test_workflow_le_arquivo_grande_via_raw_quando_content_api_nao_da_base64() -> None:
    """Achado real (PR #305): a API de Conteúdo do GitHub só devolve base64
    para arquivos até 1 MB; ``neurologia.html`` (~1,3 MB) cruzou esse teto e
    a Camada 0 da Lei 8-A (#311) ficava sem nenhum arquivo para ler,
    SILENCIOSAMENTE — nenhum log, nenhuma nota ao auditor, nenhuma evidência
    didática enviada. O passo precisa cair para o media type ``raw`` (sem
    teto de 1 MB) quando ``encoding`` não vier ``base64``."""
    trecho = _passo_prctx()
    assert "mediaType: { format: 'raw' }" in trecho, "fallback para arquivo grande (> 1 MB) ausente"
    assert "file.encoding === 'base64'" in trecho
    assert "veio sem conteúdo utilizável" in trecho, "falha dos dois caminhos precisa ficar visível no log"
    print("OK  test_workflow_le_arquivo_grande_via_raw_quando_content_api_nao_da_base64")


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
    assert "# pass 10" in saida, f"esperava 10 testes passando, saída:\n{saida}"
    for nome in (
        "HTML grande com termos repetidos: contexto vem do bloco B, não do primeiro bloco",
        "o ensino ANTES da questão tem prioridade sobre conteúdo depois dela",
        "teto rígido de tamanho é respeitado mesmo com limite pequeno",
        "fail-closed: arquivo sem hunk no diff não recebe trecho inventado",
        # Issue #305: evidência didática guiada pelo question_report (Lei 8-A).
        'question_report: evidência vem do bloco citado em "Destino no site", mesmo com > MAX_CLUSTERS_POR_ARQUIVO blocos alterados',
        "question_report: nenhuma questão nova/reformulada → não aciona a camada Lei 8-A",
        'question_report: fail-closed quando "Destino no site" não referencia um bloco real — nunca adivinha',
    ):
        assert nome in saida, f"teste esperado ausente da saída: {nome!r}"
    print("OK  test_node_test_runner_prova_contexto_do_bloco_do_diff")


def _evento_de_pr(*, corpo: str, run_id: int = 1, head_sha: str = "a" * 40):
    payload = {
        "action": "completed",
        "workflow_run": {"name": "Repasso Guard", "conclusion": "success", "id": run_id,
                          "head_sha": head_sha, "pull_requests": [{"number": 305}]},
    }
    pr_info = {"number": 305, "title": "PR de teste", "body": corpo,
               "labels": ["NEEDS-AUDIT"], "updated_at": "2026-09-27T00:00:00Z"}
    return build_event_from_github_context("workflow_run", payload, "Repassomed/Repasso-Med-Site-",
                                            pr_info=pr_info)


def test_dedup_ganha_campo_cirurgico_so_quando_a_pr_tem_a_matriz_8a() -> None:
    """Issue #305: mesmo padrão de ``DIFF_EVIDENCE_POLICY`` (Issue #308) —
    a evidência do head_context só muda para quem TEM a Matriz por fonte
    renderizada; nunca um bump geral de política forçando reauditoria paga
    em toda PR aberta."""
    corpo_com_matriz = (
        "- **Área:** materia\n\n"
        "## Relatório obrigatório — Lei das Questões (8-A.11)\n\n"
        "### Matriz por fonte\n\n"
        f"{LEI_8A_MATRIX_HEADER}\n"
        "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |\n"
        "| Foto | pág | CLARA | 1 | 1 | 1 | 0 | 0 | 0 | 0 | neub02 |\n"
    )
    ev_com = _evento_de_pr(corpo=corpo_com_matriz)
    assert ev_com.payload["dedup_fields"].get("head_context_8a") == HEAD_CONTEXT_8A_POLICY

    ev_sem = _evento_de_pr(corpo="- **Área:** infraestrutura\n\nSem nenhuma matriz aqui.")
    assert "head_context_8a" not in ev_sem.payload["dedup_fields"]
    print("OK  test_dedup_ganha_campo_cirurgico_so_quando_a_pr_tem_a_matriz_8a")


def main() -> int:
    testes = [
        test_modulo_e_teste_js_existem,
        test_workflow_usa_contexto_ancorado_e_nao_indexof_global,
        test_workflow_le_arquivo_grande_via_raw_quando_content_api_nao_da_base64,
        test_node_test_runner_prova_contexto_do_bloco_do_diff,
        test_dedup_ganha_campo_cirurgico_so_quando_a_pr_tem_a_matriz_8a,
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
