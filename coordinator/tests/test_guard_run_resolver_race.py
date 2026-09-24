"""Issue #264 — race condition real encontrada pela auditoria independente
(comentário #5822771107): o passo "Acionar o OBSERVE explicitamente" de
guard.yml dispara o workflow_dispatch de DENTRO do último passo da
própria execução do Guard. Nesse instante o run do Guard, por definição,
ainda não pode estar ``completed`` (só vira ``completed`` depois que
TODOS os passos, incluindo o de dispatch, terminam) — então o OBSERVE
pode legitimamente ver ``status: 'in_progress'`` no primeiro fetch.

A lógica de retry CURTO e LIMITADO (nunca polling infinito) que resolve
isso vive em JavaScript puro — ``.github/workflows/scripts/
resolve_guard_run.mjs`` — porque é aí que ela de fato roda dentro de
``actions/github-script``. Este módulo não reimplementa essa lógica em
Python (reimplementação diverge do código real com o tempo); ele roda o
teste comportamental de verdade (``resolve_guard_run.test.mjs``, Node
``node:test`` embutido — zero dependência nova) via subprocess e prova
que passou, incluindo o caso exato "in_progress no primeiro fetch,
completed no segundo" e o teto do retry nunca sendo ultrapassado (nunca
polling infinito).

GitHub Actions (`ubuntu-latest`) sempre tem Node instalado — é o runtime
de qualquer `actions/github-script`, incluindo o próprio Guard/OBSERVE
desta PR. Localmente, se `node` não existir no PATH, este teste AVISA e
não reprova a suíte por uma lacuna de ambiente alheia ao código (mesmo
espírito de ``continue-on-error`` usado no workflow: uma dependência de
ambiente ausente não pode derrubar veredito de outra coisa) — mas dentro
de CI real (onde o `node --test` roda de verdade) ele é a prova
comportamental que a auditoria pediu.

Standalone:
    python3 -m coordinator.tests.test_guard_run_resolver_race
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys

from . import _pathsetup

_SCRIPT_DIR = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "scripts")
_MODULE_PATH = os.path.join(_SCRIPT_DIR, "resolve_guard_run.mjs")
_TEST_PATH = os.path.join(_SCRIPT_DIR, "resolve_guard_run.test.mjs")


def test_modulo_e_teste_js_existem() -> None:
    assert os.path.isfile(_MODULE_PATH), f"faltou {_MODULE_PATH}"
    assert os.path.isfile(_TEST_PATH), f"faltou {_TEST_PATH}"
    print("OK  test_modulo_e_teste_js_existem")


def test_node_test_runner_reproduz_in_progress_depois_completed_e_prova_teto() -> None:
    """A prova comportamental real pedida pela auditoria: roda
    resolve_guard_run.test.mjs via `node --test` e confere que TODOS os
    casos passaram — incluindo, por nome do teste no TAP, o cenário
    exato "in_progress no primeiro fetch, completed no segundo" e o
    cenário "nunca completa" (prova de que o retry é limitado, não
    polling infinito)."""
    node = shutil.which("node")
    if node is None:
        print(
            "AVISO  node não encontrado no PATH deste ambiente — pulando a prova "
            "comportamental (GitHub Actions ubuntu-latest sempre tem node; ver "
            "docstring do módulo). Não reprova a suíte por uma lacuna de ambiente."
        )
        print("OK  test_node_test_runner_reproduz_in_progress_depois_completed_e_prova_teto (pulado)")
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
    assert "# pass 7" in saida, f"esperava 7 testes passando, saída:\n{saida}"
    for nome_esperado in (
        "primeiro fetch in_progress, segundo fetch completed",
        "retry é CURTO e LIMITADO, nunca polling infinito",
        "nome de workflow errado falha fechado SEM gastar nenhum retry",
        "branch errada falha fechado SEM gastar nenhum retry",
    ):
        assert nome_esperado in saida, f"teste esperado ausente da saída: {nome_esperado!r}"
    print("OK  test_node_test_runner_reproduz_in_progress_depois_completed_e_prova_teto")


def test_modulo_nao_importa_octokit_nem_faz_rede_diretamente() -> None:
    """resolve_guard_run.mjs precisa continuar uma função PURA — toda
    chamada de rede/relógio é injetada (buscarRun/dormir), nunca
    `github.rest`/`setTimeout` direto dentro do módulo. Isso é o que
    permite testar o algoritmo sem mockar a API do GitHub."""
    import re

    with open(_MODULE_PATH, encoding="utf-8") as fh:
        bruto = fh.read()
    sem_bloco = re.sub(r"/\*.*?\*/", "", bruto, flags=re.DOTALL)
    linhas_de_codigo = [linha for linha in sem_bloco.splitlines() if not linha.strip().startswith("//")]
    codigo = "\n".join(linhas_de_codigo)
    assert "github.rest" not in codigo
    assert "setTimeout" not in codigo
    assert "require(" not in codigo and "import " not in codigo, (
        "o módulo puro não deve importar nada — só recebe funções injetadas"
    )
    print("OK  test_modulo_nao_importa_octokit_nem_faz_rede_diretamente")


def main() -> int:
    testes = [
        test_modulo_e_teste_js_existem,
        test_node_test_runner_reproduz_in_progress_depois_completed_e_prova_teto,
        test_modulo_nao_importa_octokit_nem_faz_rede_diretamente,
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
