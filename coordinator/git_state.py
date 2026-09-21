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
import uuid
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
        sem histórico de ``main``) se ainda não existir no remoto.

        Achado do "PACOTE CONSOLIDADO" (PR #97): ``git fetch origin
        <branch>`` devolve código != 0 tanto quando (a) o remoto está
        genuinamente inalcançável (rede, autenticação, URL errada) quanto
        quando (b) o remoto RESPONDE mas a branch simplesmente ainda não
        existe nele (1ª execução de sempre — caso legítimo e seguro). A
        versão anterior tratava as duas situações como idênticas e caía
        silenciosamente no caminho "branch órfã nova" — ou seja, uma falha
        de rede intermitente no fetch virava "nunca vi nenhum evento",
        o que autorizaria uma chamada paga sem dedup de verdade nenhum.

        Por isso, antes de decidir "a branch não existe ainda", uma sonda
        separada (``git ls-remote --exit-code``, sem depender de nenhuma
        branch específica) confirma que o remoto está de fato alcançável.
        Só quando a sonda passa é que um fetch sem a branch é lido como
        "1ª execução"; caso contrário, levanta — o lado seguro é falhar
        alto (o CLI já preserva um `--out` sanitizado mesmo nesse crash,
        ver __main__.py), nunca prosseguir como se dedup/orçamento
        estivessem vazios por termos simplesmente perdido a conexão.
        """
        workdir = tempfile.mkdtemp(prefix="repasso-coordinator-state-")
        _run(None, "init", "-q", workdir)
        _run(workdir, "config", "user.name", self.author_name)
        _run(workdir, "config", "user.email", self.author_email)
        _run(workdir, "remote", "add", "origin", self.remote)

        sonda = _run(workdir, "ls-remote", "--exit-code", "origin")
        if sonda.returncode != 0:
            shutil.rmtree(workdir, ignore_errors=True)
            raise RuntimeError(
                f"remoto de estado inalcançável ({self.remote!r}); não é seguro tratar "
                f"isto como 'nenhum evento visto ainda': {redact(sonda.stderr)}"
            )

        busca = _run(workdir, "fetch", "origin", self.branch)
        if busca.returncode == 0:
            r = _run(workdir, "checkout", "-B", self.branch, f"origin/{self.branch}")
            if r.returncode != 0:
                raise RuntimeError(f"não consegui fazer checkout de origin/{self.branch}: {redact(r.stderr)}")
        else:
            # A sonda acima já confirmou que o remoto RESPONDE; então este
            # fetch falhou porque a branch específica não existe nele ainda
            # — 1ª execução de sempre, seguro tratar como estado vazio.
            r = _run(workdir, "checkout", "--orphan", self.branch)
            if r.returncode != 0:
                raise RuntimeError(f"não consegui criar a branch órfã {self.branch}: {redact(r.stderr)}")
            _run(workdir, "rm", "-rf", "--cached", ".")
        return workdir

    def _lease(self, workdir: str) -> str:
        """Valor esperado para ``--force-with-lease=<branch>:<valor>``:
        o SHA que ``origin/<branch>`` tinha quando ESTE workdir foi
        preparado (string vazia se a branch ainda não existia no remoto).

        Achado do PACOTE CONSOLIDADO (PR #97), item 1: ``git push
        origin HEAD:<branch>`` SEM lease só é rejeitado por non-fast-
        -forward quando a branch JÁ EXISTE — a criação da PRIMEIRA vez de
        uma branch nova não tem esse tipo de proteção (dois processos
        podem, cada um do seu lado, "criar" a mesma branch nova com
        conteúdo diferente, e os dois recebem êxito do push; só um dos
        dois conteúdos sobrevive de verdade — reproduzido e confirmado
        manualmente antes desta correção). ``--force-with-lease`` com o
        valor esperado explícito (vazio = "a branch não pode existir
        ainda") faz o git recusar essa segunda criação com o mesmo rigor
        de um non-fast-forward comum, cobrindo a corrida também na
        primeira publicação de uma branch de estado."""
        r = _run(workdir, "rev-parse", "-q", "--verify", f"origin/{self.branch}")
        return r.stdout.strip() if r.returncode == 0 else ""

    def _push(self, workdir: str) -> subprocess.CompletedProcess:
        lease = self._lease(workdir)
        return _run(workdir, "push", f"--force-with-lease={self.branch}:{lease}",
                    "origin", f"HEAD:{self.branch}")

    def _sou_eu_o_tip(self, meu_sha: str) -> bool:
        """Confirma, com uma consulta direta e independente ao remoto (sem
        reaproveitar nenhum estado deste workdir), que ``meu_sha`` é
        REALMENTE o commit que está no tip da branch agora — usada só por
        ``claim_key`` como segunda trava depois do código de saída do
        push. Sob teste de concorrência real (duas threads, mesmo remoto
        git local, ``threading.Barrier`` forçando leituras sobrepostas —
        ver ``test_concurrent_claim_exactly_one_winner``), medimos casos
        em que dois pushes concorrentes para uma branch recém-criada
        reportaram êxito (returncode 0) mesmo com ``--force-with-lease``;
        sem esta confirmação adicional, os dois lados concluiriam "eu
        ganhei" para o mesmo evento. ``git ls-remote`` consulta o remoto
        diretamente, sem depender do estado (possivelmente obsoleto) de
        nenhum checkout local."""
        r = _run(None, "ls-remote", self.remote, self.branch)
        if r.returncode != 0 or not r.stdout.strip():
            return False
        tip_remoto = r.stdout.split()[0]
        return tip_remoto == meu_sha

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
        A publicação (``_push``) usa ``--force-with-lease`` — condicionado
        ao estado esperado, portanto o oposto de um force-push cego — para
        que a rejeição por corrida valha também na criação da PRIMEIRA
        branch de estado, não só em atualizações de uma branch que já existia.
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

                push = self._push(workdir)
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

    def claim_key(self, key: str, *, message: str, max_keys: int | None = None,
                   max_attempts: int = 3) -> bool:
        """Compare-and-swap atômico sobre a lista ``keys`` do JSON: ``True``
        só para a PRIMEIRA execução, entre quaisquer processos
        concorrentes, que conseguir registrar ``key``; qualquer outra
        chamada — antes, durante ou depois — recebe ``False``.

        Item 1 do "PACOTE CONSOLIDADO" (PR #97). Diferente de
        ``update(mutate, ...)``: ali ``mutate`` é idempotente por design
        (``dict.fromkeys`` não duplica a chave), então TODA execução que
        retentasse depois de perder um push acabava devolvendo sucesso —
        o arquivo final ficava correto, mas não havia como o CHAMADOR
        saber se foi ELE quem escreveu a chave pela primeira vez ou se só
        confirmou um estado que outra execução já tinha alcançado. Aqui a
        pergunta "a chave já está lá?" é refeita a partir de uma leitura
        FRESCA em CADA tentativa, antes de qualquer push — inclusive nos
        retries. A publicação em si (``_push``) usa ``--force-with-lease``,
        que rejeita a escrita se o remoto mudou desde a minha leitura —
        INCLUSIVE quando é a primeira vez que a branch é criada (sem essa
        condição, uma publicação incondicional não protege esse caso: dois
        processos podem "criar" a mesma branch nova ao mesmo tempo e os dois
        recebem êxito, com só um dos conteúdos sobrevivendo de verdade). Se
        eu perder a corrida,
        a tentativa seguinte lê o estado fresco publicado pelo vencedor: se
        for a MESMA chave, o teste "já está lá?" agora acerta e devolve
        ``False``; se foi outra coisa (outra chave, outro evento), a
        chave que eu quero continua livre e eu ainda posso tentar de novo.
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

                chaves = dados_atuais.get("keys", [])
                if key in chaves:
                    return False  # leitura fresca: alguém já reivindicou esta chave.

                novas_chaves = list(dict.fromkeys([*chaves, key]))
                if max_keys is not None:
                    novas_chaves = novas_chaves[-max_keys:]
                novos_dados = {**dados_atuais, "keys": novas_chaves}

                with open(caminho, "w", encoding="utf-8") as fh:
                    json.dump(novos_dados, fh, indent=2, sort_keys=True)

                _run(workdir, "add", self.file_name)
                # Nonce por tentativa: dois processos concorrentes, com o
                # mesmo autor/committer/timestamp (resolução de 1s) e o
                # MESMO conteúdo de arquivo (mesma "chaves" resultante, já
                # que os dois partiram do mesmo estado vazio/anterior),
                # produziriam um commit BYTE-IDÊNTICO — e portanto o MESMO
                # sha — sem isto. Confirmado por medição direta (dois
                # commits idênticos, mesmo GIT_AUTHOR_DATE/COMMITTER_DATE,
                # geram o mesmo hash), o que tornava `_sou_eu_o_tip`
                # incapaz de distinguir "eu ganhei" de "nós dois, por
                # coincidência, temos o mesmo commit" — os dois lados
                # concluíam True. O nonce garante SHA único por tentativa,
                # sem mudar o conteúdo do arquivo que os leitores veem.
                mensagem_commit = f"{message} [{uuid.uuid4().hex}]"
                commit = _run(workdir, "commit", "-q", "-m", mensagem_commit)
                if commit.returncode != 0:
                    ultimo_erro = redact(commit.stderr)
                    continue
                meu_sha = _run(workdir, "rev-parse", "HEAD").stdout.strip()

                push = self._push(workdir)
                if push.returncode == 0 and self._sou_eu_o_tip(meu_sha):
                    return True  # meu push foi aceito E uma leitura fresca e
                                 # independente do remoto confirma que o meu
                                 # commit é de verdade o tip da branch agora.
                # Ou o push foi rejeitado (corrida detectada pelo
                # --force-with-lease), ou foi aceito mas a confirmação
                # independente mostrou que outro commit é o tip de verdade —
                # sob concorrência real de duas threads/processos, medi os
                # dois casos acontecerem (ver test_concurrent_claim_exactly_
                # one_winner). De qualquer forma, não posso reivindicar
                # vitória: a tentativa seguinte lê o estado fresco e decide
                # de novo se a chave já está lá.
                if push.returncode == 0:
                    ultimo_erro = "push reportou êxito, mas outra execução venceu a corrida de verdade (confirmado por leitura independente do remoto)"
                else:
                    ultimo_erro = redact(push.stderr)
                time.sleep(0.2 * (tentativa + 1))
            finally:
                shutil.rmtree(workdir, ignore_errors=True)
        raise RuntimeError(
            f"não consegui decidir o claim de {key!r} em {max_attempts} tentativa(s); "
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
        # Mantido por compatibilidade com quem ainda usa a dupla
        # seen()+mark() diretamente (ex.: test_dedup.py, testando a
        # interface DedupStore genérica) — mas observe() não usa mais
        # este par para decidir se processa um evento; ver claim().
        def mutate(dados: dict) -> dict:
            chaves = list(dict.fromkeys([*dados.get("keys", []), key]))  # preserva ordem, sem duplicar
            return {"keys": chaves[-self.max_keys:]}

        self.git_json.update(mutate, message=f"dedup: marcar {key}")

    def claim(self, key: str) -> bool:
        """Ponto único e ATÔMICO de decisão "processo este evento?" —
        corrige o achado do PACOTE CONSOLIDADO (PR #97): seen() (leitura)
        e mark() (escrita) eram operações git independentes, e duas
        execuções concorrentes podiam ambas ver seen()==False antes de
        qualquer uma marcar. Ver GitJsonStore.claim_key()."""
        return self.git_json.claim_key(key, message=f"dedup: claim {key}", max_keys=self.max_keys)


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
