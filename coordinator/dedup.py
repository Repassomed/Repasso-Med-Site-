"""Deduplicação de eventos (Issue #95: "evento repetido não gera nova chamada").

Duas implementações de armazenamento atrás da mesma interface:

- ``InMemoryStore``  — vive só durante o processo. Suficiente para os
  testes e para uma execução única do CLI que já recebe vários eventos de
  uma vez.
- ``FileStore``      — um JSON simples em disco, para persistir "já vi
  este evento" entre execuções separadas do workflow. Fica FORA do
  controle de versão (caminho por padrão em ``.coordinator-state/``,
  ignorado pelo git) — é estado operacional, não conteúdo do projeto.

Nenhuma das duas escreve em matéria, Supabase ou qualquer coisa de
produção — é só um registro de "cheguei a ver a chave X".
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Protocol


class DedupStore(Protocol):
    def seen(self, key: str) -> bool: ...
    def mark(self, key: str) -> None: ...


@dataclass
class InMemoryStore:
    _keys: set[str] | None = None

    def __post_init__(self) -> None:
        if self._keys is None:
            self._keys = set()

    def seen(self, key: str) -> bool:
        return key in self._keys

    def mark(self, key: str) -> None:
        self._keys.add(key)


class FileStore:
    """JSON simples: {"keys": [...]}. Cria o diretório se faltar."""

    def __init__(self, path: str, max_keys: int = 5000) -> None:
        self.path = path
        self.max_keys = max_keys

    def _load(self) -> set[str]:
        if not os.path.exists(self.path):
            return set()
        try:
            with open(self.path, encoding="utf-8") as fh:
                dados = json.load(fh)
            return set(dados.get("keys", []))
        except (json.JSONDecodeError, OSError):
            # Arquivo de estado corrompido não pode derrubar o pipeline —
            # trata como "nunca vi nada" (é o lado seguro: na dúvida,
            # processa de novo em vez de silenciosamente nunca mais rodar).
            return set()

    def _save(self, keys: set[str]) -> None:
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        # Mantém só as N mais recentes por ordem de inserção não é possível
        # com set puro; para um JSON simples, cortar por tamanho basta —
        # esta não é uma fila de auditoria, é só um filtro de duplicata.
        keys_list = list(keys)[-self.max_keys :]
        with open(self.path, "w", encoding="utf-8") as fh:
            json.dump({"keys": keys_list}, fh)

    def seen(self, key: str) -> bool:
        return key in self._load()

    def mark(self, key: str) -> None:
        keys = self._load()
        keys.add(key)
        self._save(keys)


class Deduplicator:
    def __init__(self, store: DedupStore | None = None) -> None:
        self.store = store if store is not None else InMemoryStore()

    def is_duplicate(self, key: str) -> bool:
        return self.store.seen(key)

    def mark_processed(self, key: str) -> None:
        self.store.mark(key)
