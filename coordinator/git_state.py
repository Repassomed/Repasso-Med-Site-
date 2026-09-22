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

    def conditional_update(self, evaluate: Callable[[dict], tuple[bool, dict]], *, message: str,
                            max_attempts: int = 3) -> bool:
        """Achado B11 da auditoria independente do PR #107 (rodada 3, HEAD
        7b0e28c): ``update()`` (acima) considera sucesso assim que ``git
        push`` devolve 0 — mas ``claim_key()`` já precisou de uma proteção
        adicional (``_sou_eu_o_tip``) porque, sob concorrência real, uma
        corrida na CRIAÇÃO da PRIMEIRA branch pode fazer dois pushes
        concorrentes reportarem êxito (returncode 0), mesmo com
        ``--force-with-lease``, enquanto só um dos dois conteúdos
        sobrevive de verdade no remoto (medido diretamente, ver docstring
        de ``_sou_eu_o_tip``). Para uma decisão que só pode ser aceita
        UMA vez — aqui, "esta reserva de orçamento ainda cabe?" — confiar
        cegamente no código de saída do push é inseguro: o lado que
        perdeu a corrida de verdade, mas cujo push local reportou 0,
        concluiria erroneamente que reservou orçamento que nunca chegou
        a ser persistido, e seguiria para a chamada paga sem que o hard
        cap contabilizasse isso — exatamente o cenário que o ledger
        OpenAI (branch de estado nova, nunca usada antes) expõe.

        Este método replica a mesma proteção de ``claim_key()``: depois
        do push reportar êxito, uma consulta independente ao remoto
        (``_sou_eu_o_tip``) confirma que o commit publicado por ESTA
        tentativa é REALMENTE o tip da branch agora. Só nesse caso o
        chamador pode confiar no resultado; caso contrário (push
        rejeitado pelo lease OU aceito mas não confirmado como tip), a
        tentativa seguinte recomeça com uma leitura fresca e
        ``evaluate`` é chamado de novo sobre o estado remoto real —
        nunca sobre a suposição otimista de um push local que pode não
        ter sobrevivido.

        ``evaluate(dados_atuais)`` devolve ``(aceita, novos_dados)``:
        quando ``aceita`` já é ``False`` a partir de uma leitura fresca,
        nada precisa ser publicado — devolve ``False`` direto, sem
        nenhum push (o orçamento não mudou, então não há estado novo
        para registrar)."""
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

                aceita, novos_dados = evaluate(dados_atuais)
                if not aceita:
                    return False  # leitura fresca: já não cabe — nada a publicar.

                with open(caminho, "w", encoding="utf-8") as fh:
                    json.dump(novos_dados, fh, indent=2, sort_keys=True)

                _run(workdir, "add", self.file_name)
                # Nonce por tentativa — mesmo motivo de claim_key(): duas
                # tentativas concorrentes partindo do mesmo estado e
                # produzindo o mesmo "novos_dados" gerariam um commit
                # byte-idêntico (mesmo autor/committer/conteúdo), tornando
                # ``_sou_eu_o_tip`` incapaz de distinguir "eu ganhei" de
                # "por coincidência temos o mesmo commit".
                mensagem_commit = f"{message} [{uuid.uuid4().hex}]"
                commit = _run(workdir, "commit", "-q", "-m", mensagem_commit)
                if commit.returncode != 0:
                    ultimo_erro = redact(commit.stderr)
                    continue
                meu_sha = _run(workdir, "rev-parse", "HEAD").stdout.strip()

                push = self._push(workdir)
                if push.returncode == 0 and self._sou_eu_o_tip(meu_sha):
                    return True  # push aceito E confirmado, por leitura
                                 # independente do remoto, como o tip real.
                if push.returncode == 0:
                    ultimo_erro = (
                        "push reportou êxito, mas outra execução venceu a corrida de verdade "
                        "(confirmado por leitura independente do remoto)"
                    )
                else:
                    ultimo_erro = redact(push.stderr)
                time.sleep(0.2 * (tentativa + 1))
            finally:
                shutil.rmtree(workdir, ignore_errors=True)
        raise RuntimeError(
            f"não consegui decidir a atualização condicional em {max_attempts} tentativa(s); "
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
    (``append``, ``month_to_date_usd``, ``all_records``,
    ``reserve_if_within_budget``), mas persistida numa branch de estado
    compartilhada entre execuções independentes."""

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

    def reserve_if_within_budget(self, candidate, *, budget_usd: float, now: datetime | None = None) -> bool:
        """Achado B7 da auditoria independente do PR #107: "checar
        orçamento" e "gravar a reserva" viram UMA única operação atômica,
        dentro do MESMO ``evaluate``/CAS que ``GitJsonStore.
        conditional_update()`` executa com retry (novo fetch +
        reaplicação a cada tentativa, sob ``--force-with-lease``) — nunca
        duas chamadas git separadas (``month_to_date_usd()`` e depois
        ``append()``), que deixavam uma janela real entre duas execuções
        concorrentes lendo o mesmo saldo antes de qualquer uma publicar.

        O predicado é reavaliado a partir de uma leitura FRESCA em cada
        tentativa (inclusive nos retries) — mesmo princípio que
        ``GitJsonStore.claim_key()`` já usa para o dedup.

        Correção B11 da auditoria independente do PR #107 (rodada 3,
        HEAD 7b0e28c): antes, isto usava ``GitJsonStore.update()``, que
        considera a reserva aceita assim que ``git push`` reporta êxito
        — mas essa confirmação não é suficiente na CRIAÇÃO da primeira
        branch de estado (exatamente o caso do ledger OpenAI, sempre
        novo): duas execuções concorrentes podem ambas receber sucesso
        do push, com só uma sobrevivendo de verdade no remoto (mesma
        corrida que ``claim_key()`` já precisou resolver com
        ``_sou_eu_o_tip``). Agora usa ``conditional_update()``, que exige
        essa mesma confirmação independente do remoto antes de devolver
        ``True`` — nunca confia cegamente no código de saída do push
        local.

        Devolve ``True`` só quando a reserva foi de fato aceita, publicada
        E confirmada como o tip real do remoto; ``False`` quando não coube
        (nada é publicado nesse caso)."""

        def evaluate(dados: dict) -> tuple[bool, dict]:
            registros = dados.get("records", [])
            agora = now or datetime.now(timezone.utc)
            prefixo_mes = agora.strftime("%Y-%m")
            gasto_atual = sum(
                float(r.get("estimated_cost_usd", 0.0))
                for r in registros
                if str(r.get("timestamp", "")).startswith(prefixo_mes)
            )
            if gasto_atual + candidate.estimated_cost_usd > budget_usd:
                return False, dados
            return True, {"records": [*registros, candidate.to_dict()]}

        return self.git_json.conditional_update(
            evaluate, message=f"usage-reserve: {candidate.event_key} ({candidate.tier})",
        )

    def all_records(self) -> list[dict]:
        return self.git_json.read().get("records", [])
