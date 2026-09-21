"""Deduplicação — evento repetido não gera nova chamada (Issue #95)."""

from __future__ import annotations

import sys
import tempfile
import os

from . import _pathsetup  # noqa: F401
from coordinator.dedup import Deduplicator, FileStore, InMemoryStore


def test_in_memory_store_marks_and_detects() -> None:
    d = Deduplicator(InMemoryStore())
    chave = "repo:EVT:pr:1:abcd"
    assert not d.is_duplicate(chave)
    d.mark_processed(chave)
    assert d.is_duplicate(chave)
    print("OK  test_in_memory_store_marks_and_detects")


def test_file_store_persists_across_instances() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "seen.json")
        chave = "repo:EVT:pr:2:efgh"

        d1 = Deduplicator(FileStore(caminho))
        assert not d1.is_duplicate(chave)
        d1.mark_processed(chave)

        # instância NOVA, mesmo arquivo — simula uma execução separada do
        # workflow que precisa lembrar do que a execução anterior processou.
        d2 = Deduplicator(FileStore(caminho))
        assert d2.is_duplicate(chave), "FileStore devia persistir entre instâncias"
    print("OK  test_file_store_persists_across_instances")


def test_file_store_survives_corrupted_file() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "seen.json")
        with open(caminho, "w", encoding="utf-8") as fh:
            fh.write("{ isto não é json válido")
        d = Deduplicator(FileStore(caminho))
        # não deve lançar exceção; lado seguro é tratar como "nunca vi nada"
        assert not d.is_duplicate("qualquer-chave")
        d.mark_processed("qualquer-chave")
    print("OK  test_file_store_survives_corrupted_file")


def main() -> int:
    testes = [
        test_in_memory_store_marks_and_detects,
        test_file_store_persists_across_instances,
        test_file_store_survives_corrupted_file,
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
