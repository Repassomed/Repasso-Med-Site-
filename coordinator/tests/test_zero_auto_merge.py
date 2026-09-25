"""Issue #257 — ZERO AUTO-MERGE (regra absoluta da Issue #99).

O Coordinator, o Worker Bridge, o Runner e o AUTO-REPARO podem produzir
MERGE-READY, cartão, comentário e notificação. NENHUM deles executa merge:
José é a única pessoa que decide e executa merge.

Até a correção desta issue existia um caminho ativo: o job
``merge_after_guard`` de ``coordinator-auto-repair.yml`` chamava
``github.rest.pulls.merge`` (squash, GITHUB_TOKEN) depois de um Guard verde,
guiado por ``auto_repair_policy.auto_merge_eligibility``. Estes testes
varrem TODO o código executável da coordenação (workflows, Python, scripts)
por qualquer forma de merge — REST, GraphQL, gh CLI, auto-merge — sem
depender só do nome de funções.
"""

from __future__ import annotations

import glob
import os
import re
import sys

from . import _pathsetup  # noqa: F401
from ._pathsetup import REPO_ROOT

# Qualquer uma destas formas executa (ou arma) um merge de PR.
PADROES_DE_MERGE: tuple[tuple[re.Pattern, str], ...] = (
    (re.compile(r"\bpulls\.merge\b"), "Octokit pulls.merge"),
    (re.compile(r"pulls/[^\s'\"]*/merge\b"), "endpoint REST PUT /pulls/{n}/merge"),
    (re.compile(r"PUT\s+/repos/[^\s'\"]*/merge"), "endpoint REST de merge via github.request"),
    (re.compile(r"/merges\b"), "endpoint REST /merges (merge de branch)"),
    (re.compile(r"\bmergePullRequest\b"), "GraphQL mergePullRequest"),
    (re.compile(r"\benablePullRequestAutoMerge\b"), "GraphQL auto-merge"),
    (re.compile(r"\benable_?auto_?merge\b", re.I), "habilitar auto-merge"),
    (re.compile(r"\bmerge_pull_request\b"), "helper de merge de PR"),
    (re.compile(r"\bgh\s+pr\s+merge\b"), "gh CLI merge"),
    (re.compile(r"\bmerge_method\b"), "parâmetro de merge"),
    (re.compile(r"\bauto_merge_eligibility\b"), "gate de auto-merge"),
    (re.compile(r"\bmerge_after_guard\b"), "job de auto-merge"),
    (re.compile(r"\bmerge-check\b|\bmark-merged\b"), "subcomando de auto-merge"),
)


def _arquivos_executaveis() -> list[str]:
    padroes = (
        ".github/workflows/*.yml",
        ".github/workflows/*.yaml",
        "coordinator/*.py",
        "tools/**/*.py",
        "tools/**/*.cjs",
        "tools/**/*.js",
        "tools/**/*.sh",
    )
    arquivos: list[str] = []
    for p in padroes:
        arquivos.extend(glob.glob(os.path.join(REPO_ROOT, p), recursive=True))
    fora = (os.sep + "tests" + os.sep, os.sep + "fixtures" + os.sep, "node_modules")
    return sorted({a for a in arquivos if not any(x in a for x in fora)})


def _ler(caminho: str) -> str:
    with open(caminho, encoding="utf-8") as fh:
        return fh.read()


def test_nenhum_codigo_da_coordenacao_tem_caminho_de_merge() -> None:
    arquivos = _arquivos_executaveis()
    assert any(a.endswith("coordinator-auto-repair.yml") for a in arquivos), "varredura não viu os workflows"
    assert any(a.endswith("worker_bridge.py") for a in arquivos), "varredura não viu o Python"
    achados = []
    for caminho in arquivos:
        texto = _ler(caminho)
        for padrao, descricao in PADROES_DE_MERGE:
            for m in padrao.finditer(texto):
                linha = texto.count("\n", 0, m.start()) + 1
                achados.append(f"{os.path.relpath(caminho, REPO_ROOT)}:{linha} → {descricao} ({m.group(0)!r})")
    assert not achados, "caminho de merge automático encontrado:\n  " + "\n  ".join(achados)
    print(f"OK  test_nenhum_codigo_da_coordenacao_tem_caminho_de_merge ({len(arquivos)} arquivos)")


def test_clientes_http_python_nunca_usam_put_nem_editam_estado_da_pr() -> None:
    """O merge REST é ``PUT /pulls/{n}/merge``. Os clientes HTTP próprios
    (bridge_pr, error_registry) não usam PUT, e o único PATCH de PR só
    envia o corpo — nunca ``state``, ``base`` ou outro campo."""
    for nome in ("bridge_pr.py", "error_registry.py"):
        texto = _ler(os.path.join(REPO_ROOT, "coordinator", nome))
        assert not re.search(r"""["']PUT["']""", texto), f"{nome}: verbo PUT não é permitido"
        assert "graphql" not in texto.lower(), f"{nome}: GraphQL não é permitido"
    texto = _ler(os.path.join(REPO_ROOT, "coordinator", "bridge_pr.py"))
    patches = re.findall(r'"PATCH",\s*f"/repos/\{self\.owner\}/\{self\.repo\}/pulls/\{pr_number\}",\s*(\{[^}]*\})', texto)
    assert patches == ['{"body": corpo}'], patches
    print("OK  test_clientes_http_python_nunca_usam_put_nem_editam_estado_da_pr")


def _secao_on(texto: str) -> str:
    ini = texto.index("\non:") + 1
    fim = texto.index("\npermissions:", ini)
    return texto[ini:fim]


# ---------------------------------------------------------------------
# Leitor mínimo de workflow, só biblioteca padrão (Issue #267).
#
# O Worker Bridge e o Runner rodam esta suíte como preflight com APENAS
# coordinator/requirements.txt instalado — sem PyYAML. Este leitor extrai o
# que os testes precisam (chaves de mapeamento, permissões do topo e de cada
# job) e deliberadamente:
#   - pula blocos de texto (``run: |``, ``script: |``): um "contents: write"
#     dentro de um script nunca é lido como permissão;
#   - pula itens de lista (``- name: ...``, ``steps``, ``workflows``);
#   - aceita permissão inline (``{contents: write}``, ``read-all``,
#     ``write-all``) e FALHA FECHADO diante de qualquer forma que não
#     reconheça, em vez de devolver "sem permissão".
# ---------------------------------------------------------------------

_RE_CHAVE = re.compile(r"""^(?P<ind> *)(?P<chave>"[^"]+"|'[^']+'|[A-Za-z0-9_.\-]+):(?:\s+(?P<valor>.*))?$""")
_INDICADORES_DE_BLOCO = {"|", ">", "|-", ">-", "|+", ">+"}


def _sem_comentario(valor: str) -> str:
    if valor[:1] in ("'", '"'):
        return valor.strip()
    return re.split(r"\s+#", valor, maxsplit=1)[0].strip()


def _ler_workflow(texto: str) -> dict:
    raiz: dict = {}
    pilha: list[tuple[int, dict]] = [(-1, raiz)]
    pular_ate: int | None = None
    for bruta in texto.splitlines():
        if not bruta.strip() or bruta.lstrip().startswith("#"):
            continue
        if "\t" in bruta[: len(bruta) - len(bruta.lstrip())]:
            raise AssertionError(f"workflow com TAB na indentação — leitor recusa (fail-closed): {bruta!r}")
        indent = len(bruta) - len(bruta.lstrip(" "))
        if pular_ate is not None:
            if indent > pular_ate:
                continue
            pular_ate = None
        conteudo = bruta.strip()
        if conteudo == "-" or conteudo.startswith("- "):
            pular_ate = indent  # item de lista: ele e tudo que estiver mais fundo
            continue
        m = _RE_CHAVE.match(bruta.rstrip())
        if not m:
            continue
        while pilha[-1][0] >= indent:
            pilha.pop()
        pai = pilha[-1][1]
        chave = m.group("chave").strip("'\"")
        valor = _sem_comentario(m.group("valor") or "")
        if valor == "":
            filho: dict = {}
            pai[chave] = filho
            pilha.append((indent, filho))
        elif valor in _INDICADORES_DE_BLOCO:
            pai[chave] = valor
            pular_ate = indent
        else:
            pai[chave] = valor.strip("'\"")
    return raiz


def _permissoes(valor, onde: str) -> dict:
    """Normaliza um bloco ``permissions`` para dict ``escopo -> nível``.
    ``write-all`` vira contents:write (e é proibido pelos testes);
    qualquer forma desconhecida quebra o teste (fail-closed)."""
    if valor is None:
        return {}
    if isinstance(valor, dict):
        return {k: str(v) for k, v in valor.items()}
    texto = str(valor).strip()
    if texto == "read-all":
        return {"contents": "read"}
    if texto == "write-all":
        return {"contents": "write", "*": "write-all"}
    if texto in ("{}", ""):
        return {}
    if texto.startswith("{") and texto.endswith("}"):
        out = {}
        for par in texto[1:-1].split(","):
            if not par.strip():
                continue
            k, sep, v = par.partition(":")
            if not sep:
                raise AssertionError(f"{onde}: permissions inline ilegível: {texto!r}")
            out[k.strip()] = v.strip()
        return out
    raise AssertionError(f"{onde}: forma de permissions não reconhecida: {texto!r}")


def test_leitor_de_workflow_sem_pyyaml_e_robusto() -> None:
    """Prova o leitor contra as armadilhas que um teste por texto teria."""
    amostra = (
        "name: X\n"
        "on:\n"
        "  workflow_run:\n"
        "    workflows:\n"
        "      - \"A\"\n"
        "permissions:\n"
        "  contents: read   # comentário\n"
        "jobs:\n"
        "  primeiro:\n"
        "    permissions:\n"
        "      contents: write\n"
        "      pull-requests: write\n"
        "    steps:\n"
        "      - name: script\n"
        "        run: |\n"
        "          permissions:\n"
        "            contents: write\n"
        "          merge_after_guard:\n"
        "      - uses: x\n"
        "        with:\n"
        "          contents: write\n"
        "  segundo:\n"
        "    permissions: {contents: read, actions: write}\n"
        "    runs-on: ubuntu-latest\n"
        "  'terceiro':\n"
        "    permissions: write-all\n"
    )
    d = _ler_workflow(amostra)
    assert set(d["jobs"]) == {"primeiro", "segundo", "terceiro"}, d["jobs"]
    assert _permissoes(d.get("permissions"), "topo") == {"contents": "read"}
    assert _permissoes(d["jobs"]["primeiro"]["permissions"], "p") == {"contents": "write", "pull-requests": "write"}
    assert "merge_after_guard" not in d["jobs"], "chave dentro de bloco de script não é job"
    assert _permissoes(d["jobs"]["segundo"]["permissions"], "s") == {"contents": "read", "actions": "write"}
    assert _permissoes(d["jobs"]["terceiro"]["permissions"], "t")["contents"] == "write"
    for ruim in ("contents=write", "[contents]"):
        try:
            _permissoes(ruim, "x")
        except AssertionError:
            continue
        raise AssertionError(f"forma desconhecida {ruim!r} devia falhar fechado")
    # Onde PyYAML existir (máquina de desenvolvimento), confere o leitor contra
    # ele em TODOS os workflows reais. No preflight do Bridge ele não existe e
    # esta conferência extra é pulada — a garantia acima não depende dela.
    try:
        import yaml  # type: ignore
    except ImportError:
        yaml = None
    if yaml is not None:
        for caminho in sorted(glob.glob(os.path.join(REPO_ROOT, ".github", "workflows", "*.yml"))):
            texto = _ler(caminho)
            ref = yaml.safe_load(texto)
            meu = _ler_workflow(texto)
            nome = os.path.basename(caminho)
            assert set(meu.get("jobs") or {}) == set(ref.get("jobs") or {}), nome
            assert _permissoes(meu.get("permissions"), nome) == {
                k: str(v) for k, v in (ref.get("permissions") or {}).items()
            }, nome
            for job, cfg in (ref.get("jobs") or {}).items():
                esperado = {k: str(v) for k, v in ((cfg or {}).get("permissions") or {}).items()}
                assert _permissoes((meu["jobs"][job] or {}).get("permissions"), f"{nome}:{job}") == esperado, (nome, job)
    print("OK  test_leitor_de_workflow_sem_pyyaml_e_robusto")


def test_auto_reparo_nao_reage_ao_guard_e_nao_tem_job_de_merge() -> None:
    """O gatilho do Guard existia só para o job de merge; o reparo técnico
    reage apenas a falhas de Bridge/Runner/OBSERVE."""
    caminho = os.path.join(REPO_ROOT, ".github", "workflows", "coordinator-auto-repair.yml")
    texto = _ler(caminho)
    assert '"Repasso Guard"' not in _secao_on(texto)
    jobs = _ler_workflow(texto)["jobs"]
    assert set(jobs) == {"repair"}, sorted(jobs)
    print("OK  test_auto_reparo_nao_reage_ao_guard_e_nao_tem_job_de_merge")


# Jobs que precisam de contents:write, e por quê. Qualquer job novo com
# write de conteúdo precisa ser justificado aqui (o GITHUB_TOKEN com
# contents:write é tecnicamente capaz de mergear; a garantia real é não
# existir código que chame merge — teste acima — mais a proteção de branch
# do repositório, que só o José configura).
CONTENTS_WRITE_PERMITIDO = {
    ("coordinator-observe.yml", "observe"): "branches de estado coordinator-state-*",
    ("coordinator-runner.yml", "run"): "branch runner/* da tarefa + estado",
    ("coordinator-worker-bridge.yml", "bridge"): "branch runner/* da tarefa + estado",
    ("coordinator-auto-repair.yml", "repair"): "branch auto-repair/* + estado",
}


def test_permissoes_de_escrita_sao_so_as_justificadas() -> None:
    encontrados = {}
    caminhos = sorted(glob.glob(os.path.join(REPO_ROOT, ".github", "workflows", "*.yml")))
    assert len(caminhos) >= 6, "a varredura precisa ver os workflows da coordenação"
    for caminho in caminhos:
        nome = os.path.basename(caminho)
        texto = _ler(caminho)
        assert "write-all" not in texto, f"{nome}: write-all proibido"
        d = _ler_workflow(texto)
        assert "jobs" in d and d["jobs"], f"{nome}: leitor não encontrou jobs (fail-closed)"
        topo = _permissoes(d.get("permissions"), f"{nome}:topo")
        assert topo.get("contents") in (None, "read"), f"{nome}: contents no topo precisa ser read"
        for job, cfg in d["jobs"].items():
            if not isinstance(cfg, dict):
                raise AssertionError(f"{nome}:{job}: job ilegível (fail-closed)")
            perms = _permissoes(cfg.get("permissions"), f"{nome}:{job}")
            if perms.get("contents") == "write":
                encontrados[(nome, job)] = True
    assert set(encontrados) == set(CONTENTS_WRITE_PERMITIDO), sorted(encontrados)
    print("OK  test_permissoes_de_escrita_sao_so_as_justificadas")


def main() -> int:
    testes = [
        test_nenhum_codigo_da_coordenacao_tem_caminho_de_merge,
        test_clientes_http_python_nunca_usam_put_nem_editam_estado_da_pr,
        test_leitor_de_workflow_sem_pyyaml_e_robusto,
        test_auto_reparo_nao_reage_ao_guard_e_nao_tem_job_de_merge,
        test_permissoes_de_escrita_sao_so_as_justificadas,
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
