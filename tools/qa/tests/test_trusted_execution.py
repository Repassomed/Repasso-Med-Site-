"""Teste adversarial do bloqueador 1 (auditoria independente do PR #94).

«PR que altera o código do Guard não consegue usar a versão alterada para
se autocertificar.»

Este é o único teste da suíte que usa um repositório git de verdade —
precisa, porque o que está sendo provado é justamente um mecanismo de
extração via ``git archive``, que não dá para simular só com objetos
``Context`` em memória (isso já é feito em ``test_guard.py`` para o
bloqueador 2, o de ESCOPO).

Roteiro:

    1. cria um repositório git temporário com DUAS versões do pacote
       ``tools/qa/guard``: a BASE (a versão real e boa deste repositório,
       hoje) e o HEAD (a mesma versão, mas com ``check_secrets`` adulterado
       para nunca acusar nada — a exata forma de ataque que a auditoria
       descreveu);
    2. o HEAD também introduz um segredo de verdade num arquivo novo;
    3. roda o Guard de duas formas:
       a. "ingênua" — PYTHONPATH apontando para o próprio HEAD (o jeito
          como uma versão SEM a correção rodaria) → prova que o ataque
          FUNCIONA se nada o impedir (o segredo passa despercebido);
       b. "confiável" — exatamente o mecanismo que ``.github/workflows/
          guard.yml`` usa: extrai ``tools/`` da BASE via ``git archive``
          para um diretório à parte e roda de lá → prova que o mesmo
          ataque NÃO funciona mais (o segredo é detectado).

Executar com:

    python3 -m tools.qa.tests.test_trusted_execution
"""

from __future__ import annotations

import io
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile

_HERE = os.path.dirname(os.path.abspath(__file__))
_QA_ROOT = os.path.dirname(_HERE)          # .../tools/qa
_TOOLS_ROOT = os.path.dirname(_QA_ROOT)    # .../tools
_REPO_ROOT = os.path.dirname(_TOOLS_ROOT)  # raiz do repositório real
sys.path.insert(0, _REPO_ROOT)

# Só os arquivos que formam o pacote Python de verdade — sem fixtures, sem
# testes, sem browser-qa. É exatamente o que .github/workflows/guard.yml
# extrai (a diferença é que o workflow pega "tools" inteiro; aqui restringe
# pra deixar o teste rápido e o commit pequeno).
ARQUIVOS_DO_PACOTE = [
    "tools/__init__.py",
    "tools/qa/__init__.py",
    "tools/qa/guard/__init__.py",
    "tools/qa/guard/materia.py",
    "tools/qa/guard/checks.py",
    "tools/qa/guard/__main__.py",
]

SEGREDO_DE_TESTE = "sk-ant-" + ("A1b2C3d4E5f6G7h8I9j0" * 2)  # >20 chars, bate no padrão


def _run(*args: str, cwd: str, env: dict | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, env=env)


def _git(repo: str, *args: str) -> subprocess.CompletedProcess:
    r = _run("git", "-C", repo, *args, cwd=repo)
    assert r.returncode == 0, f"git {' '.join(args)} falhou: {r.stderr}"
    return r


def _montar_repo_temporario(tmp: str) -> tuple[str, str, str]:
    """Cria o repo de mentira com o commit BASE (código bom) e devolve
    (caminho_do_repo, sha_base, sha_head_ainda_por_criar=='')."""
    repo = os.path.join(tmp, "repo-de-mentira")
    os.makedirs(repo)
    _git(repo, "init", "-q")
    _run("git", "-C", repo, "config", "user.email", "guard-test@example.com", cwd=repo)
    _run("git", "-C", repo, "config", "user.name", "Guard Test", cwd=repo)

    for rel in ARQUIVOS_DO_PACOTE:
        origem = os.path.join(_REPO_ROOT, rel)
        destino = os.path.join(repo, rel)
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        shutil.copyfile(origem, destino)

    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "base: pacote tools/qa/guard bom")
    sha_base = _git(repo, "rev-parse", "HEAD").stdout.strip()
    return repo, sha_base


def _adulterar_checks(repo: str) -> None:
    """Neutraliza check_secrets no HEAD, exatamente o ataque descrito na
    auditoria: um PR enfraquece uma verificação do próprio Guard."""
    caminho = os.path.join(repo, "tools/qa/guard/checks.py")
    src = open(caminho, encoding="utf-8").read()
    marcador = "def check_secrets(ctx: Context) -> list[Finding]:"
    assert marcador in src, "checks.py real mudou de assinatura; ajustar o teste"
    adulterado = src.replace(
        marcador,
        marcador + "\n    return [Finding(\"segredos\", INFO, "
                    "\"nada encontrado (função adulterada pelo teste adversarial)\")]"
                    "  # ORIGINAL abaixo, agora inalcançável:",
        1,
    )
    assert adulterado != src, "a substituição não fez efeito"
    with open(caminho, "w", encoding="utf-8") as fh:
        fh.write(adulterado)


def _criar_head_malicioso(repo: str) -> str:
    _adulterar_checks(repo)
    with open(os.path.join(repo, "algum-arquivo-novo.txt"), "w", encoding="utf-8") as fh:
        fh.write(f"linha qualquer\nchave vazada por acidente: {SEGREDO_DE_TESTE}\n")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m",
         "head malicioso: neutraliza check_secrets E introduz um segredo de verdade")
    return _git(repo, "rev-parse", "HEAD").stdout.strip()


def _extrair_tools(repo: str, ref: str, destino: str) -> None:
    """Réplica exata do que .github/workflows/guard.yml faz: ``git archive
    <ref> tools`` e extrai para um diretório à parte. ``git archive``
    produz um tar binário — por isso ``capture_output`` sem ``text=True``."""
    r = subprocess.run(["git", "-C", repo, "archive", ref, "tools"],
                       cwd=repo, capture_output=True)
    assert r.returncode == 0, r.stderr
    os.makedirs(destino, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(r.stdout), mode="r|") as tar:
        tar.extractall(destino, filter="data")


def _rodar_guard(repo_alvo: str, base_sha: str, head_sha: str, pythonpath: str, cwd_neutro: str) -> str:
    """Invoca o CLI de verdade (python3 -m tools.qa.guard) exatamente como o
    workflow faz — só muda o PYTHONPATH e o cwd, para provar qual código
    de fato executa."""
    env = dict(os.environ)
    env["PYTHONPATH"] = pythonpath
    r = subprocess.run(
        [sys.executable, "-m", "tools.qa.guard",
         "--repo", repo_alvo,
         "--base", base_sha,
         "--head", head_sha,
         "--allow-fail"],
        cwd=cwd_neutro, capture_output=True, text=True, env=env,
    )
    assert r.returncode == 0, (
        f"o próprio CLI quebrou (não é isso que este teste mede): {r.stderr}"
    )
    return r.stdout


def test_naive_head_execution_hides_the_secret() -> None:
    """Contraprova: SEM extração confiável, o ataque funciona de verdade —
    prova que o problema que a auditoria apontou era real, não hipotético."""
    with tempfile.TemporaryDirectory(prefix="repasso-guard-trust-") as tmp:
        repo, sha_base = _montar_repo_temporario(tmp)
        sha_head = _criar_head_malicioso(repo)

        ingenuo = os.path.join(tmp, "ingenuo")
        _extrair_tools(repo, sha_head, ingenuo)  # extrai do HEAD, não da base — o jeito ingênuo

        cwd_neutro = os.path.join(tmp, "cwd-neutro")
        os.makedirs(cwd_neutro)
        saida = _rodar_guard(repo, sha_base, sha_head, ingenuo, cwd_neutro)

        assert "segredos" not in saida or "HARD FAIL" not in saida.split("## ")[1].split("\n")[0], (
            "esperava que a execução INGÊNUA escondesse o segredo (prova do problema), "
            f"mas o resultado já veio limpo. Saída:\n{saida}"
        )
        assert "REPROVADO" not in saida, (
            "a execução ingênua devia passar (segredo escondido pelo checks.py adulterado), "
            f"mas reprovou mesmo assim — o teste não está montado como esperado.\n{saida}"
        )
    print("OK  test_naive_head_execution_hides_the_secret — confirma que o ataque funciona sem a extração confiável.")


def test_trusted_base_execution_still_catches_the_secret() -> None:
    """A prova principal do bloqueador 1: com a extração confiável (o
    mecanismo que guard.yml usa), o mesmo ataque NÃO funciona."""
    with tempfile.TemporaryDirectory(prefix="repasso-guard-trust-") as tmp:
        repo, sha_base = _montar_repo_temporario(tmp)
        sha_head = _criar_head_malicioso(repo)

        confiavel = os.path.join(tmp, "confiavel")
        _extrair_tools(repo, sha_base, confiavel)  # extrai da BASE — o mecanismo real

        cwd_neutro = os.path.join(tmp, "cwd-neutro")
        os.makedirs(cwd_neutro)
        saida = _rodar_guard(repo, sha_base, sha_head, confiavel, cwd_neutro)

        assert "REPROVADO" in saida, (
            "esperava que a execução CONFIÁVEL (código extraído da base) ainda pegasse o "
            f"segredo introduzido no HEAD, mesmo com check_secrets adulterado lá. Saída:\n{saida}"
        )
        assert "segredos" in saida, f"a verificação de segredos nem aparece na saída:\n{saida}"
    print("OK  test_trusted_base_execution_still_catches_the_secret — "
          "a extração confiável (guard.yml) derrota o ataque de verdade.")


def main() -> int:
    testes = [
        test_naive_head_execution_hides_the_secret,
        test_trusted_base_execution_still_catches_the_secret,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {e}")
    if falhas:
        print(f"\n{falhas}/{len(testes)} teste(s) falharam.")
        return 1
    print(f"\n{len(testes)}/{len(testes)} testes passaram.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
