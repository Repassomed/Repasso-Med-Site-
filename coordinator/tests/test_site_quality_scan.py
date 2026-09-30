"""Regressões do painel global READ-ONLY."""

from __future__ import annotations

from pathlib import Path
import sys

from coordinator.site_quality_scan import resolve_deterministic, static


def test_static_ignora_tags_ids_e_metatexto_em_comentario_html() -> None:
    texto = """
<!-- Estrutura: <div id="tab-x"><section> Cómo estudiar esta materia -->
<div id="tab-x"><section id="real"><p>Contenido real</p></section></div>
"""
    achados = static(Path("materia.html"), texto)
    titulos = {x["title"] for x in achados}
    assert "IDs HTML duplicados" not in titulos
    assert "HTML possivelmente desbalanceado: <div>" not in titulos
    assert "HTML possivelmente desbalanceado: <section>" not in titulos
    assert "Metatexto de estudo/interface ainda presente" not in titulos
    print("OK  test_static_ignora_tags_ids_e_metatexto_em_comentario_html")


def test_deterministic_antigo_some_quando_nao_e_reproduzido() -> None:
    report = {"findings": [
        {"id": "old-static", "found_by": "deterministic", "status": "OPEN"},
        {"id": "human-review", "found_by": "claude", "status": "OPEN"},
    ]}
    resolve_deterministic(report, [], "2026-09-29T00:00:00+00:00")
    por_id = {x["id"]: x for x in report["findings"]}
    assert por_id["old-static"]["status"] == "RESOLVED"
    assert por_id["old-static"]["resolved_at"] == "2026-09-29T00:00:00+00:00"
    assert por_id["human-review"]["status"] == "OPEN"
    print("OK  test_deterministic_antigo_some_quando_nao_e_reproduzido")


def test_deterministic_atual_permanece_aberto() -> None:
    atual = {"id": "same", "found_by": "deterministic", "status": "OPEN"}
    report = {"findings": [dict(atual)]}
    resolve_deterministic(report, [atual], "2026-09-29T00:00:00+00:00")
    assert report["findings"][0]["status"] == "OPEN"
    print("OK  test_deterministic_atual_permanece_aberto")


def main() -> int:
    testes = [
        test_static_ignora_tags_ids_e_metatexto_em_comentario_html,
        test_deterministic_antigo_some_quando_nao_e_reproduzido,
        test_deterministic_atual_permanece_aberto,
    ]
    falhas = 0
    for teste in testes:
        try:
            teste()
        except AssertionError as exc:
            falhas += 1
            print(f"FALHOU  {teste.__name__}: {exc}")
    print(f"\\n{len(testes)-falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
