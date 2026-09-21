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
import threading
from typing import Protocol


class DedupStore(Protocol):
    def seen(self, key: str) -> bool: ...
    def mark(self, key: str) -> None: ...
    def claim(self, key: str) -> bool:
        """Check-and-set: ``True`` só para quem reivindica a chave pela
        primeira vez; qualquer chamada seguinte com a mesma chave recebe
        ``False``. Item 1 do "PACOTE CONSOLIDADO" (PR #97) — substitui o
        par seen()+mark() como forma de decidir "processo este evento?",
        porque esse par são duas operações INDEPENDENTES (uma leitura,
        uma escrita, sem nada entre elas impedindo outra execução de ler
        o mesmo "não visto" primeiro) — exatamente a janela que permitia
        duas execuções concorrentes chamarem a API para o mesmo evento.
        ``seen``/``mark`` continuam existindo para quem só precisa
        consultar ou marcar sem a garantia atômica (ex.: ferramentas de
        inspeção manual do estado)."""
        ...


class InMemoryStore:
    """Não é ``@dataclass`` de propósito: um ``threading.Lock`` não tem
    ``__eq__``/``repr`` úteis, e o gerador automático do dataclass os
    incluiria em ambos sem necessidade nenhuma."""

    def __init__(self, keys: set[str] | None = None) -> None:
        self._keys: set[str] = keys if keys is not None else set()
        self._lock = threading.Lock()

    def seen(self, key: str) -> bool:
        with self._lock:
            return key in self._keys

    def mark(self, key: str) -> None:
        with self._lock:
            self._keys.add(key)

    def claim(self, key: str) -> bool:
        with self._lock:
            if key in self._keys:
                return False
            self._keys.add(key)
            return True


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

    def claim(self, key: str) -> bool:
        # Check-and-set no MESMO disco/processo: não tem a garantia
        # cross-processo que GitDedupStore.claim() tem (não há nada como
        # o push otimista do git aqui), mas fecha a mesma janela
        # seen()-depois-mark() para quem usa FileStore sozinho — e este
        # backend já é documentado como "não sobrevive entre runners
        # efêmeros, prefira --dedup-git-remote no workflow real" (a
        # produção real usa GitDedupStore, não este).
        keys = self._load()
        if key in keys:
            return False
        keys.add(key)
        self._save(keys)
        return True


class Deduplicator:
    def __init__(self, store: DedupStore | None = None) -> None:
        self.store = store if store is not None else InMemoryStore()

    def is_duplicate(self, key: str) -> bool:
        return self.store.seen(key)

    def mark_processed(self, key: str) -> None:
        self.store.mark(key)

    def claim(self, key: str) -> bool:
        """Ponto atômico de decisão: ``True`` só para quem processa de
        verdade este evento; qualquer execução concorrente ou posterior
        com a mesma chave recebe ``False``. Ver ``DedupStore.claim``."""
        return self.store.claim(key)
