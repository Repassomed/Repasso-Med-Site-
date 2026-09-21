"""Estado persistente entre execuções INDEPENDENTES do GitHub Actions.

Bloqueador 2 da auditoria do PR #97: ``FileStore`` e o ``UsageLedger`` de
arquivo local (``coordinator/dedup.py``, ``coordinator/budget.py``) vivem
no disco do runner — e um runner hospedado pelo GitHub é efêmero: cada
execução do workflow começa numa máquina nova, sem nada do que a execução
anterior gravou. Isso quebrava duas garantias centrais da Issue #95:
"evento repetido não gera nova chamada" e os freios de custo mensal
(#84 §4), porque nada sobrevivia de uma execução para a próxima.

A solução aqui é GitHub-nativa e não usa nenhum serviço novo: uma branch
DEDICADA do MESMO repositório (nunca ``main``, nunca mesclada, nunca toca
matéria) guarda um único arquivo JSON com o estado operacional — só chaves
de deduplicação e metadados de uso/custo, nunca prompt, resposta ou
segredo. Cada execução do Coordinator busca essa branch, lê o arquivo,
aplica a mudança e publica de volta. Como é uma branch comum do Git, o
histórico fica auditável (qualquer commit nela é uma mudança de estado
visível) e não depende de nenhuma infraestrutura além do próprio GitHub
que já hospeda o código.

Isto não reescreve ``dedup.py`` nem ``budget.py`` — ``GitDedupStore``
implementa o mesmo protocolo ``DedupStore`` que ``FileStore``/
``InMemoryStore`` já implementavam, e ``GitUsageLedger`` expõe a mesma
superfície pública que ``UsageLedger`` (``append``, ``month_to_date_usd``,
``all_records``). É uma peça adicional, não uma reescrita.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

from .budget import UsageRecord
from .redact import redact

DEFAULT_BRANCH = "coordinator-state"


def _run(repo_dir: str | None, *args: str) -> subprocess.CompletedProcess:
    cmd = ["git"] + (["-C", repo_dir] if repo_dir else []) + list(args)
    return subprocess.run(cmd, capture_output=True, text=True)


@dataclass
class GitJsonStore:
    """Lê/escreve um único arquivo JSON numa branch dedicada de um remoto git.

    ``remote`` é qualquer coisa que ``git clone``/``git fetch`` aceite — a
    URL real do repositório em produção (com um token de push já
    configurado pelo ambiente do Actions), ou um caminho local, o que é
    exatamente como os testes provam a mecânica sem precisar de rede
    (ver ``coordinator/tests/test_git_state.py`` — o mesmo padrão que
    ``tools/qa/tests/test_trusted_execution.py`` já usa para provar
    mecânica de git sem depender do GitHub de verdade).
    """

    remote: str
    branch: str = DEFAULT_BRANCH
    file_name: str = "state.json"
    author_name: str = "Repasso Coordinator"
    author_email: str = "coordinator@repasso-med.local"

    def _fresh_workdir(self) -> str:
        """Prepara um checkout novo da branch de estado, criando-a (órfã,
        sem histórico de ``main``) se ainda não existir no remoto."""
        workdir = tempfile.mkdtemp(prefix="repasso-coordinator-state-")
        _run(None, "init", "-q", workdir)
        _run(workdir, "config", "user.name", self.author_name)
        _run(workdir, "config", "user.email", self.author_email)
        _run(workdir, "remote", "add", "origin", self.remote)

        busca = _run(workdir, "fetch", "origin", self.branch)
        if busca.returncode == 0:
            r = _run(workdir, "checkout", "-B", self.branch, f"origin/{self.branch}")
            if r.returncode != 0:
                raise RuntimeError(f"não consegui fazer checkout de origin/{self.branch}: {redact(r.stderr)}")
        else:
            # Branch ainda não existe no remoto: primeira execução de sempre.
            # Órfã de propósito — nunca compartilha histórico com main/matéria.
            r = _run(workdir, "checkout", "--orphan", self.branch)
            if r.returncode != 0:
                raise RuntimeError(f"não consegui criar a branch órfã {self.branch}: {redact(r.stderr)}")
            _run(workdir, "rm", "-rf", "--cached", ".")
        return workdir

    def read(self) -> dict:
        workdir = self._fresh_workdir()
        try:
            caminho = os.path.join(workdir, self.file_name)
            if not os.path.exists(caminho):
                return {}
            try:
                with open(caminho, encoding="utf-8") as fh:
                    return json.load(fh)
            except (json.JSONDecodeError, OSError):
                return {}
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    def update(self, mutate: Callable[[dict], dict], *, message: str,
               max_attempts: int = 3) -> dict:
        """Lê o estado atual, aplica ``mutate``, grava e publica.

        Se outra execução publicou entre a leitura e a escrita desta (uma
        corrida real entre dois runners independentes), o push é rejeitado
        e tentamos de novo com um checkout fresco — até ``max_attempts``.
        Isto é concorrência otimista normal de Git, não um retry de
        chamada de API (essa continua sendo uma tentativa só, sem loop,
        em ``anthropic_client.call``); aqui o teto existe só para nunca
        girar para sempre se o remoto estiver genuinamente inacessível.
        """
        ultimo_erro = ""
        for tentativa in range(max_attempts):
            workdir = self._fresh_workdir()
            try:
                caminho = os.path.join(workdir, self.file_name)
                dados_atuais = {}
                if os.path.exists(caminho):
                    try:
                        with open(caminho, encoding="utf-8") as fh:
                            dados_atuais = json.load(fh)
                    except (json.JSONDecodeError, OSError):
                        dados_atuais = {}

                novos_dados = mutate(dados_atuais)

                with open(caminho, "w", encoding="utf-8") as fh:
                    json.dump(novos_dados, fh, indent=2, sort_keys=True)

                _run(workdir, "add", self.file_name)
                commit = _run(workdir, "commit", "-q", "-m", message, "--allow-empty")
                if commit.returncode != 0:
                    ultimo_erro = redact(commit.stderr)
                    continue

                push = _run(workdir, "push", "origin", f"HEAD:{self.branch}")
                if push.returncode == 0:
                    return novos_dados
                ultimo_erro = redact(push.stderr)
                # Corrida com outra execução: descarta e tenta de novo com
                # um fetch fresco, para incorporar a mudança concorrente.
                time.sleep(0.2 * (tentativa + 1))
            finally:
                shutil.rmtree(workdir, ignore_errors=True)
        raise RuntimeError(
            f"não consegui publicar o estado em {max_attempts} tentativa(s); "
            f"último erro: {ultimo_erro}"
        )


class GitDedupStore:
    """Implementa o mesmo protocolo ``DedupStore`` de ``coordinator.dedup``,
    mas compartilhado entre execuções independentes via ``GitJsonStore``."""

    def __init__(self, git_json: GitJsonStore, max_keys: int = 5000) -> None:
        self.git_json = git_json
        self.max_keys = max_keys

    def seen(self, key: str) -> bool:
        dados = self.git_json.read()
        return key in dados.get("keys", [])

    def mark(self, key: str) -> None:
        def mutate(dados: dict) -> dict:
            chaves = list(dict.fromkeys([*dados.get("keys", []), key]))  # preserva ordem, sem duplicar
            return {"keys": chaves[-self.max_keys:]}

        self.git_json.update(mutate, message=f"dedup: marcar {key}")


class GitUsageLedger:
    """Mesma superfície pública de ``coordinator.budget.UsageLedger``
    (``append``, ``month_to_date_usd``, ``all_records``), mas persistida
    numa branch de estado compartilhada entre execuções independentes."""

    def __init__(self, git_json: GitJsonStore) -> None:
        self.git_json = git_json

    def append(self, record: UsageRecord) -> None:
        def mutate(dados: dict) -> dict:
            registros = dados.get("records", [])
            registros.append(record.to_dict())
            return {"records": registros}

        self.git_json.update(mutate, message=f"usage: {record.event_key} ({record.tier})")

    def month_to_date_usd(self, *, now: datetime | None = None) -> float:
        agora = now or datetime.now(timezone.utc)
        prefixo_mes = agora.strftime("%Y-%m")
        total = 0.0
        for r in self.all_records():
            if str(r.get("timestamp", "")).startswith(prefixo_mes):
                total += float(r.get("estimated_cost_usd", 0.0))
        return total

    def all_records(self) -> list[dict]:
        return self.git_json.read().get("records", [])
