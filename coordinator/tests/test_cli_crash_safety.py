"""Item 2 do "PACOTE CONSOLIDADO" (PR #97): o CLI sempre grava um JSON
sanitizado em ``--out``, mesmo quando o pipeline crasha antes de
``observe()`` devolver um ``ObserveResult`` normal.

Achado original: ``coordinator.__main__.main()`` não tinha nenhum
``try/except`` em volta da execução real. Uma exceção não tratada (ex.:
``GitJsonStore`` esgotando tentativas de publicar o estado — reproduzido
de verdade contra o código deste PR) derrubava o processo ANTES das
linhas que escrevem ``--out``. O workflow ficava vermelho corretamente
(bloqueador 7, já coberto por ``test_workflow_security.py``), mas SEM
nenhum artifact estruturado publicado — ``actions/upload-artifact@v4``
usa ``if-no-files-found: ignore``.

Teste E2E exigido pelo PACOTE CONSOLIDADO:
    - backend git indisponível;
    - CLI retorna != 0;
    - arquivo --out existe;
    - JSON contém status ERROR sanitizado;
    - artifact teria conteúdo (arquivo não-vazio, JSON válido);
    - nenhuma chamada Anthropic aconteceu.

Chama ``coordinator.__main__.main(argv)`` diretamente no MESMO processo
(sem subprocess) — mesmo padrão que os outros testes deste pacote usam
para o resto do CLI; a garantia que importa é que ``main()`` NUNCA deixa
uma exceção escapar sem primeiro gravar ``--out``, não como o processo é
invocado.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator.__main__ import main as cli_main


def _escrever_evento(tmp: str) -> str:
    caminho = os.path.join(tmp, "evento.json")
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump(
            {
                "raw_type": "INBOX_COMMENT",
                "source": "fixture",
                "repo": "Repassomed/Repasso-Med-Site-",
                "identity": "issue:88#comment:1",
                "payload": {"body": "teste", "dedup_fields": {"comment_id": 1}},
            },
            fh,
        )
    return caminho


def test_crash_on_unreachable_git_backend_writes_sanitized_out_and_returns_nonzero() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho_evento = _escrever_evento(tmp)
        caminho_out = os.path.join(tmp, "coordinator-observe.json")
        remoto_inexistente = os.path.join(tmp, "remoto-que-nao-existe-nem-vai-existir")

        codigo = cli_main([
            "--event", caminho_evento,
            "--dedup-git-remote", remoto_inexistente,
            "--dedup-git-branch", "coordinator-state-teste-crash-cli",
            "--usage-ledger", os.path.join(tmp, "usage.json"),
            "--out", caminho_out,
        ])

        assert codigo != 0, "backend git indisponível tem que fazer o CLI retornar != 0"
        assert os.path.exists(caminho_out), "o artifact --out precisa existir mesmo com o pipeline tendo crashado"

        with open(caminho_out, encoding="utf-8") as fh:
            conteudo_bruto = fh.read()
        assert conteudo_bruto.strip(), "o artifact não pode ficar vazio"

        dados = json.loads(conteudo_bruto)  # também prova que é JSON válido
        assert dados["status"] == "ERROR"
        assert dados["call_attempted"] is False
        assert dados["call_status"] is None
        assert "RuntimeError" in dados["reason"] or "remoto" in dados["reason"].lower()
    print("OK  test_crash_on_unreachable_git_backend_writes_sanitized_out_and_returns_nonzero")


def test_crash_reason_never_leaks_a_credential_embedded_in_the_remote_url() -> None:
    """Mesmo cenário, mas com uma credencial embutida na URL do remoto —
    exatamente o padrão que o workflow real usa
    (https://x-access-token:$GITHUB_TOKEN@github.com/...). O erro do git
    ecoa a URL inteira; redact() precisa sanitizá-la antes de qualquer
    coisa chegar no --out ou no que main() imprime."""
    chave_falsa = "ghp_" + "Q" * 36
    with tempfile.TemporaryDirectory() as tmp:
        caminho_evento = _escrever_evento(tmp)
        caminho_out = os.path.join(tmp, "coordinator-observe.json")
        remoto_com_credencial = f"https://x-access-token:{chave_falsa}@github.com/Repassomed/nao-existe-de-verdade.git"

        import contextlib
        import io

        stdout_capturado = io.StringIO()
        with contextlib.redirect_stdout(stdout_capturado):
            codigo = cli_main([
                "--event", caminho_evento,
                "--dedup-git-remote", remoto_com_credencial,
                "--dedup-git-branch", "coordinator-state-teste-crash-credencial",
                "--usage-ledger", os.path.join(tmp, "usage.json"),
                "--out", caminho_out,
            ])

        assert codigo != 0
        with open(caminho_out, encoding="utf-8") as fh:
            conteudo_out = fh.read()
        assert chave_falsa not in conteudo_out, "credencial vazou para o artifact --out"
        assert chave_falsa not in stdout_capturado.getvalue(), "credencial vazou para a saída padrão"
        assert "[REDACTED" in conteudo_out, "esperava o marcador de redact() no motivo do erro"
    print("OK  test_crash_reason_never_leaks_a_credential_embedded_in_the_remote_url")


def test_crash_makes_zero_anthropic_calls() -> None:
    """O crash acontece na camada de estado (git), antes de qualquer
    portão/transporte ser consultado — mas a prova tem que ser direta:
    nada neste teste configurou ENABLED=true nem um transporte, e o
    resultado ERROR sempre tem call_attempted=False, então não há como
    este caminho ter tentado uma chamada real."""
    with tempfile.TemporaryDirectory() as tmp:
        caminho_evento = _escrever_evento(tmp)
        caminho_out = os.path.join(tmp, "coordinator-observe.json")
        remoto_inexistente = os.path.join(tmp, "outro-remoto-que-nao-existe")

        os.environ["REPASSO_COORDINATOR_ENABLED"] = "true"  # mesmo assim: 0 chamadas
        os.environ["REPASSO_COORDINATOR_MODE"] = "observe"
        try:
            codigo = cli_main([
                "--event", caminho_evento,
                "--dedup-git-remote", remoto_inexistente,
                "--dedup-git-branch", "coordinator-state-teste-crash-zero-chamadas",
                "--usage-ledger", os.path.join(tmp, "usage.json"),
                "--out", caminho_out,
            ])
        finally:
            os.environ.pop("REPASSO_COORDINATOR_ENABLED", None)
            os.environ.pop("REPASSO_COORDINATOR_MODE", None)

        assert codigo != 0
        with open(caminho_out, encoding="utf-8") as fh:
            dados = json.load(fh)
        assert dados["call_attempted"] is False
        assert dados["usage"] is None
    print("OK  test_crash_makes_zero_anthropic_calls")


def test_happy_path_still_writes_out_normally() -> None:
    """Regressão: o caminho sem erro nenhum continua escrevendo --out do
    jeito que sempre escreveu (ENABLED=false fecha o portão, sem tocar
    git nenhum — dedup local em memória via --dedup-store omitido)."""
    with tempfile.TemporaryDirectory() as tmp:
        caminho_evento = _escrever_evento(tmp)
        caminho_out = os.path.join(tmp, "coordinator-observe.json")

        codigo = cli_main([
            "--event", caminho_evento,
            "--usage-ledger", os.path.join(tmp, "usage.json"),
            "--out", caminho_out,
        ])

        assert codigo == 0
        with open(caminho_out, encoding="utf-8") as fh:
            dados = json.load(fh)
        assert dados["status"] in ("BLOCKED", "OBSERVED", "DUPLICATE", "REJECTED")
        assert dados["status"] != "ERROR"
    print("OK  test_happy_path_still_writes_out_normally")


def main() -> int:
    testes = [
        test_crash_on_unreachable_git_backend_writes_sanitized_out_and_returns_nonzero,
        test_crash_reason_never_leaks_a_credential_embedded_in_the_remote_url,
        test_crash_makes_zero_anthropic_calls,
        test_happy_path_still_writes_out_normally,
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
