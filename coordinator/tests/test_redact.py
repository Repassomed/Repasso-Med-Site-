"""Segredo nunca aparece em log (Issue #95)."""

from __future__ import annotations

import sys

from . import _pathsetup  # noqa: F401
from coordinator.redact import redact, redact_mapping

FALSA_CHAVE = "sk-ant-" + "A1b2C3d4E5f6G7h8I9j0" * 2


def test_redact_masks_anthropic_key() -> None:
    texto = f"Erro ao chamar a API com a chave {FALSA_CHAVE} — 401 Unauthorized."
    limpo = redact(texto)
    assert FALSA_CHAVE not in limpo, "a chave falsa vazou do redact()"
    assert "[REDACTED:api-key]" in limpo
    print("OK  test_redact_masks_anthropic_key")


def test_redact_mapping_recurses() -> None:
    dados = {
        "erro": f"falha: {FALSA_CHAVE}",
        "detalhe": {"causa": [f"tentativa com {FALSA_CHAVE}", "sem problema aqui"]},
        "numero": 42,
    }
    limpo = redact_mapping(dados)
    texto_completo = str(limpo)
    assert FALSA_CHAVE not in texto_completo, "a chave falsa vazou de um campo aninhado"
    assert limpo["numero"] == 42, "valores não-string não deviam ser alterados"
    print("OK  test_redact_mapping_recurses")


def test_redact_is_noop_on_clean_text() -> None:
    texto = "Guard verde, 24 arquivos, nenhum HARD FAIL."
    assert redact(texto) == texto
    print("OK  test_redact_is_noop_on_clean_text")


def main() -> int:
    testes = [test_redact_masks_anthropic_key, test_redact_mapping_recurses, test_redact_is_noop_on_clean_text]
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
