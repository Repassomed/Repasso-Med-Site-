"""Comandos em linguagem natural na Issue #88 para o Worker Registry
operacional (Issue #99: "José não deve editar JSON manualmente").

Determinístico por palavra-chave/regex — mesma filosofia de
``classify.py`` — porque isto é operação administrativa (Issue #90: FAST
faz "atualizar registro"), nunca precisa de uma chamada paga para
entender "Claude 2 entrou em limite". ``parse_worker_command`` só
RECONHECE a intenção; ``aplicar_comando`` é quem de fato escreve no
``OperationalWorkerRegistry`` (sempre via ``upsert``/``set_status``,
nunca tocando ``coordination/tasks.json`` nem matéria).

**Achado F6 (Issue #105, Fase F, 4ª e 5ª rodadas — fechamento do evento
automático):** a ação ``SET_AVAILABLE`` (comando "Claude 2 voltou" /
"Claude 2 disponível") é o ponto de entrada REAL de um heartbeat/
comando ``AVAILABLE`` já validado. ``reagir_a_retorno_de_worker`` reage
a ESSE evento chamando ``runner_resume.processar_retorno_de_worker``
(reusado por inteiro, nunca reimplementado) — que por sua vez reusa
``scheduler.reprocessar_retorno`` (Fase A) por inteiro. EVENT-DRIVEN,
zero polling: é uma chamada síncrona dentro do próprio ``aplicar_comando``,
nunca um laço/agendamento.

``tasks_json_path`` é OPCIONAL e por isso continua retrocompatível: sem
ele (comportamento de todo chamador existente que não o forneça),
``aplicar_comando`` continua fazendo EXATAMENTE o que já fazia (mais a
correção F6-C abaixo) — nada de retomada automática. Só quando um
chamador FORNECE ``tasks_json_path`` é que a reação a SET_AVAILABLE de
fato acontece — nenhum caminho hardcoded/adivinhado para
``coordination/tasks.json``, mesma disciplina de parametrização
explícita do resto do pacote (``scheduler.load_tasks_from_tasks_json
(path)``). Desde a 5ª rodada, ``coordinator/observe.py::observe``/
``_tratar_inbox_comment`` já FORNECEM esse contexto de verdade no
pipeline real (achado F6-A) — ver docstring de ``observe.py``.

**F6-B (5ª rodada):** quando quem chama não fornece
``snapshot_da_tarefa_original`` explicitamente, ``reagir_a_retorno_de_
worker`` tenta recuperar o contexto mínimo de uma fonte persistida e
CONFIÁVEL — ``runner_resume.recuperar_runner_task_de_handoff``, que lê
o registro real de execuções de handoff (Fase E, PR #115, mergeado).
Sem um registro confiável, a retomada automática fica indisponível
(fail-closed) — nunca fabrica ``instructions``/``allowed_files``/
``policy_level`` a partir de ``coordination/tasks.json`` ou de texto
livre.

**F6-C (5ª rodada):** ``SET_AVAILABLE`` agora persiste ``status=
AVAILABLE`` e ``current_task=None`` numa ÚNICA escrita atômica
(``registry.upsert``) — nunca mais uma janela em que o registro mostra
``AVAILABLE`` com ``current_task`` ainda preenchido (achado F3:
``avaliar_retomada`` já trata isso como estado inconsistente/
``BLOCKED``). A tarefa canônica anterior é capturada ANTES dessa
escrita (nunca perdida) e passada explicitamente para
``reagir_a_retorno_de_worker`` via ``canonical_task_id_anterior``.
``set_status`` sozinho continua preservando ``current_task`` (outros
comandos — SET_LIMIT/DEACTIVATE — não devem inferir essa limpeza); só
``SET_AVAILABLE`` precisa dela, porque "disponível" estruturalmente
significa "sem tarefa em mãos".

**F6-D (5ª rodada):** ``reagir_a_retorno_de_worker`` passa o
``OperationalWorkerRegistry`` REAL para ``processar_retorno_de_worker``
(que já aceitava esse parâmetro desde a 3ª rodada, nunca usado por este
módulo até agora) — só assim ``runner_dispatch.executar_tarefa``
consegue emitir heartbeats de verdade (``BUSY`` com o id CANÔNICO no
início, ``OFFLINE`` com ``current_task`` limpo no fim) para uma
retomada ``api_runner`` despachada a partir deste comando.

**F7-C (6ª rodada) — preservar ownership:** a auditoria apontou que
F6-C era agressiva demais: limpar ``current_task`` incondicionalmente
antes mesmo de saber se a tarefa de fato deixou de ser do worker apaga
ownership de casos onde ela CONTINUA sendo dele (``human_session``
aguardando retomada manual, portão fechado, ou contexto/checkpoint
insuficiente). Agora ``SET_AVAILABLE`` só deixa DEFINITIVAMENTE
``current_task=None`` quando ``_deve_preservar_reserva`` (abaixo),
avaliada sobre o ``RetornoWorkerOutcome`` real devolvido por
``reagir_a_retorno_de_worker``, decide que não há mais nada a preservar
— nos outros casos, restaura ``current_task=<canonical_task_id>``
mantendo ``status=AVAILABLE`` (uma RESERVA, nunca ``BUSY`` — "sem fingir
BUSY"). ``worker_ops.OperationalWorkerRegistry.escolher_disponivel``
também passou a exigir ``current_task is None`` — só assim um worker
reservado nunca é oferecido uma segunda tarefa.

**F7-D (6ª rodada) — SET_AVAILABLE com CAS:** a transição
``status=AVAILABLE``/``current_task=None`` (e a restauração da reserva,
quando aplicável) agora usa
``OperationalWorkerRegistry.marcar_available_condicional``/
``reservar_current_task_condicional`` — compare-and-set real sobre
estado FRESCO (``WorkerStateStore.conditional_update``), nunca mais
"read antigo + upsert incondicional" (a falha de F6-C). Se um
heartbeat/handoff real mudou o worker entre a leitura que abriu este
comando e a escrita, a transição é recusada — o estado mais novo nunca
é sobrescrito.

**F7-B (6ª rodada) — geração real de patch:** este módulo continua sem
importar ``runner_generate`` — quem decide o ``gerar_patch`` efetivo
quando nenhum é fornecido manualmente é ``runner_resume.
despachar_retomada`` (ver seu docstring), reusando
``runner_generate.gerar_patch_via_claude`` com a MESMA
``RunnerDispatchConfig``/ledger Anthropic global de sempre.
``transport`` é só um ponto de injeção para teste, passado adiante sem
uso nenhum aqui."""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import Callable

from .runner_dispatch import RunnerDispatchConfig, StructuredPatch
from .runner_resume import (
    InterruptedTaskSnapshot,
    RetornoWorkerOutcome,
    processar_retorno_de_worker,
    recuperar_runner_task_de_handoff,
    snapshot_de_interrupcao,
)
from .scheduler import load_tasks_from_tasks_json
from .worker_ops import OperationalWorkerRegistry, WorkerRecord

_NOME = r"(Claude\s*\d+|claude-\d+|chatgpt-auditor)"

RE_REGISTRAR = re.compile(rf"\bcadastr[ae]\b.{{0,10}}{_NOME}.{{0,15}}\bcomo\s+worker\s+de\s+([^.\n]+)", re.I)
RE_DESATIVAR = re.compile(rf"\bdesativ[ae]\b\s+{_NOME}", re.I)
RE_EM_LIMITE = re.compile(rf"{_NOME}.{{0,30}}\b(entrou em limite|em limite|no limite|bateu (o )?limite|atingiu o limite)\b", re.I)
RE_DISPONIVEL = re.compile(rf"{_NOME}.{{0,30}}\b(voltou|dispon[íi]vel)\b", re.I)


@dataclass(frozen=True)
class WorkerCommand:
    action: str  # "REGISTER" | "DEACTIVATE" | "SET_LIMIT" | "SET_AVAILABLE"
    worker_name: str
    capabilities: tuple[str, ...] = ()


def _capacidades(texto: str) -> tuple[str, ...]:
    partes = re.split(r",|\be\b", texto, flags=re.I)
    return tuple(p.strip().lower() for p in partes if p.strip())


def parse_worker_command(texto: str) -> WorkerCommand | None:
    """Devolve ``None`` quando o texto não é reconhecido como um comando
    de worker — nesse caso o chamador segue o caminho normal (Inbox de
    tarefa, ``classify.py``). Ordem importa: REGISTRAR/DESATIVAR são mais
    específicos e checados antes de LIMITE/DISPONÍVEL, para que
    'desative Claude 4' nunca seja lido como um comando de status."""
    corpo = texto or ""

    m = RE_REGISTRAR.search(corpo)
    if m:
        return WorkerCommand(action="REGISTER", worker_name=m.group(1).strip(), capabilities=_capacidades(m.group(2)))

    m = RE_DESATIVAR.search(corpo)
    if m:
        return WorkerCommand(action="DEACTIVATE", worker_name=m.group(1).strip())

    m = RE_EM_LIMITE.search(corpo)
    if m:
        return WorkerCommand(action="SET_LIMIT", worker_name=m.group(1).strip())

    m = RE_DISPONIVEL.search(corpo)
    if m:
        return WorkerCommand(action="SET_AVAILABLE", worker_name=m.group(1).strip())

    return None


def reagir_a_retorno_de_worker(
    registry: OperationalWorkerRegistry,
    worker_novo: WorkerRecord,
    *,
    canonical_task_id_anterior: str | None,
    checkpoint_anterior: str | None = None,
    branch_anterior: str | None = None,
    tasks_json_path: str,
    repo_dir: str | None = None,
    remote_name: str = "origin",
    config: RunnerDispatchConfig | None = None,
    state_git_remote: str | None = None,
    snapshot_da_tarefa_original: InterruptedTaskSnapshot | None = None,
    motivo_interrupcao: str = "LIMIT",
    patch: StructuredPatch | None = None,
    gerar_patch: Callable[[], object] | None = None,
    transport: object | None = None,
) -> RetornoWorkerOutcome:
    """Achado F6: a reação de verdade a "este worker está AVAILABLE
    agora" — EVENT-DRIVEN (chamada síncrona, zero polling), reusando
    ``scheduler.reprocessar_retorno``/``runner_resume.
    processar_retorno_de_worker`` por inteiro (nenhuma fila
    reimplementada aqui).

    ``worker_novo`` é o ``WorkerRecord`` JÁ persistido com
    ``status="AVAILABLE"``/``current_task=None`` (achado F6-C — a
    limpeza acontece em ``aplicar_comando``, ANTES desta chamada, numa
    única escrita atômica). ``canonical_task_id_anterior``/
    ``checkpoint_anterior``/``branch_anterior`` são o que o worker tinha
    ANTES dessa limpeza — capturados por quem chama, nunca inferidos
    daqui.

    ``tarefa_original`` (canônica, para ``TaskRecord.id``/ownership) é
    resolvida contra ``tasks_json_path`` — a fonte declarativa de
    tarefas já usada por ``scheduler.load_tasks_from_tasks_json``, nunca
    reimplementada aqui. ``registry.list_workers()`` já reflete o estado
    REAL e coerente do registro (F6-C) — nenhuma normalização manual
    precisa acontecer aqui.

    Achado F6-B: quando ``snapshot_da_tarefa_original`` não é fornecido
    e há uma tarefa canônica anterior conhecida, tenta recuperar o
    contexto mínimo de uma fonte persistida/confiável
    (``runner_resume.recuperar_runner_task_de_handoff`` — nunca fabrica
    nada a partir de ``tasks_json_path``/texto livre; sem registro
    confiável, a retomada automática simplesmente fica indisponível).

    Achado F6-D: passa ``worker_registry=registry`` (o registro REAL)
    para ``processar_retorno_de_worker`` — só assim uma retomada
    ``api_runner`` de fato despachada por este caminho emite heartbeats
    reais (``BUSY``/``OFFLINE``) no Worker Registry."""
    tarefas = load_tasks_from_tasks_json(tasks_json_path)
    tarefa_original = (
        next((t for t in tarefas if t.id == canonical_task_id_anterior), None)
        if canonical_task_id_anterior
        else None
    )
    workers = registry.list_workers()

    snapshot = snapshot_da_tarefa_original
    if snapshot is None and canonical_task_id_anterior and checkpoint_anterior and state_git_remote:
        runner_task_recuperada = recuperar_runner_task_de_handoff(
            state_git_remote=state_git_remote, worker_id=worker_novo.worker_id,
            canonical_task_id=canonical_task_id_anterior,
        )
        if runner_task_recuperada is not None:
            worker_para_snapshot = replace(
                worker_novo, current_task=canonical_task_id_anterior,
                last_checkpoint=checkpoint_anterior, branch=branch_anterior,
            )
            snapshot = snapshot_de_interrupcao(
                canonical_task_id=canonical_task_id_anterior, tarefa_original=runner_task_recuperada,
                worker_anterior=worker_para_snapshot, motivo_interrupcao=motivo_interrupcao,
            )

    return processar_retorno_de_worker(
        worker_que_volta=worker_novo.worker_id, tarefa_original=tarefa_original, tarefas=tarefas,
        workers=workers, snapshot_da_tarefa_original=snapshot,
        repo_dir=repo_dir, remote_name=remote_name, config=config, state_git_remote=state_git_remote,
        worker_registry=registry, patch=patch, gerar_patch=gerar_patch, transport=transport,
    )


def _deve_preservar_reserva(retorno: RetornoWorkerOutcome) -> bool:
    """Achado F7-C (6ª rodada): decide se a tarefa anterior AINDA pertence
    ao worker depois da reação a "este worker está AVAILABLE agora" —
    nunca a partir de suposição, só do que ``processar_retorno_de_worker``
    de fato decidiu:

    - ``proxima_oferta`` preenchida: o scheduler decidiu que a tarefa
      original já foi concluída ou assumida por outro — ela NÃO é mais
      dele. Devolve ``False`` (libera de vez, current_task=None fica
      como está).
    - ``retomada`` ausente e ``proxima_oferta`` ausente: nem uma coisa
      nem outra — snapshot/contexto persistido insuficiente (F6-B
      fail-closed) ou divergência de dados. A tarefa continua dele, só
      que nada avançou. Devolve ``True`` (reserva).
    - ``retomada`` presente com ``dispatch_outcome`` preenchido:
      ``runner_dispatch.executar_tarefa`` de fato rodou — os PRÓPRIOS
      heartbeats (``BUSY`` canônico / ``OFFLINE`` limpo, achado F6-D) já
      deixaram ``current_task`` no estado terminal correto no MESMO
      Worker Registry; sobrescrever por cima aqui seria stale. Devolve
      ``False``.
    - ``retomada`` presente sem ``dispatch_outcome``: decisão pura
      (BLOCKED/WAIT) ou ``human_session`` preparada (``BLOCKED-LIMIT``) —
      nenhum heartbeat foi emitido, a tarefa continua dele: portão
      fechado, checkpoint não confirmado, capabilities/can_execute
      insuficientes, ou aguardando retomada manual. Devolve ``True``
      (reserva — nunca ``BUSY``, só ``AVAILABLE`` com ``current_task``
      preenchido)."""
    if retorno.proxima_oferta is not None:
        return False
    if retorno.retomada is None:
        return True
    if retorno.retomada.dispatch_outcome is not None:
        return False
    return True


def _resumo_retorno(retorno: RetornoWorkerOutcome) -> str:
    """Frase curta e determinística para anexar à confirmação do
    comando — nunca decide nada por conta própria, só relata o que
    ``processar_retorno_de_worker`` já decidiu."""
    if retorno.retomada is not None:
        status = retorno.retomada.result.status if retorno.retomada.result else "sem resultado"
        return f"Retomada automática avaliada: {status}."
    if retorno.proxima_oferta is not None:
        return f"Próxima oferta da fila: {retorno.proxima_oferta.action}."
    return f"Sem retomada nem próxima oferta: {retorno.motivo}"


def aplicar_comando(
    registry: OperationalWorkerRegistry,
    comando: WorkerCommand,
    *,
    tasks_json_path: str | None = None,
    repo_dir: str | None = None,
    remote_name: str = "origin",
    config: RunnerDispatchConfig | None = None,
    state_git_remote: str | None = None,
    snapshot_da_tarefa_original: InterruptedTaskSnapshot | None = None,
    patch: StructuredPatch | None = None,
    gerar_patch: Callable[[], object] | None = None,
    transport: object | None = None,
) -> str:
    """Aplica o comando no registro operacional e devolve uma frase curta
    de confirmação (o que vira o corpo do comentário de resposta na #88).
    Nunca lança por worker desconhecido em SET_LIMIT/SET_AVAILABLE/
    DEACTIVATE — cria o registro na hora, com o status pedido, para que um
    comando válido nunca fique sem efeito só porque ninguém cadastrou o
    worker antes.

    ``tasks_json_path``/``repo_dir``/``config``/``state_git_remote``/
    ``snapshot_da_tarefa_original`` são OPCIONAIS e só usados pela ação
    ``SET_AVAILABLE`` (achado F6) — sem ``tasks_json_path``, o
    comportamento é EXATAMENTE o de antes (retrocompatível com todo
    chamador existente, ex. ``observe.py``): só ``set_status``, nenhuma
    retomada automática."""
    nome = comando.worker_name.strip()

    if comando.action == "REGISTER":
        registro = WorkerRecord(
            worker_id="-".join(nome.lower().split()), display_name=nome, type="human_session",
            status="AVAILABLE", capabilities=comando.capabilities, can_execute=True, can_audit=False,
        )
        registry.upsert(registro, message=f"worker: cadastra {nome}")
        caps = ", ".join(comando.capabilities) or "nenhuma capacidade declarada"
        return f"{nome} cadastrado como worker ({caps})."

    if comando.action == "DEACTIVATE":
        registry.set_status(nome, "OFFLINE", message=f"worker: desativa {nome}")
        return f"{nome} desativado (OFFLINE)."

    if comando.action == "SET_LIMIT":
        registry.set_status(nome, "LIMIT", message=f"worker: {nome} -> LIMIT")
        return f"{nome} marcado como LIMIT."

    if comando.action == "SET_AVAILABLE":
        atual = registry.find_by_name_or_id(nome)
        if atual is None:
            novo = registry.set_status(nome, "AVAILABLE", message=f"worker: {nome} -> AVAILABLE")
            canonical_task_id_anterior = None
            checkpoint_anterior = None
            branch_anterior = None
        else:
            canonical_task_id_anterior = atual.current_task
            checkpoint_anterior = atual.last_checkpoint
            branch_anterior = atual.branch
            # Achado F7-D (6ª rodada): CAS, nunca mais "read antigo +
            # upsert incondicional" (F6-C). Só transiciona para
            # AVAILABLE+current_task=None quando uma leitura FRESCA
            # (dentro do próprio conditional_update) ainda bate com o que
            # acabamos de ler em `atual` — se um heartbeat/handoff real
            # mudou current_task/checkpoint/branch nesse meio-tempo, a
            # transição é recusada (estado mais novo NUNCA sobrescrito).
            transitou = registry.marcar_available_condicional(
                atual.worker_id,
                esperado_status=atual.status,
                esperado_current_task=atual.current_task,
                esperado_checkpoint=atual.last_checkpoint,
                esperado_branch=atual.branch,
                message=f"worker: {nome} -> AVAILABLE (current_task liberado)",
            )
            if not transitou:
                return (
                    f"{nome}: transição para AVAILABLE recusada — o estado do worker mudou "
                    "(heartbeat/handoff concorrente) desde a última leitura; nada foi sobrescrito. "
                    "Tente novamente."
                )
            novo = registry.find_by_name_or_id(nome)
        if tasks_json_path is None:
            return f"{nome} marcado como AVAILABLE."
        retorno = reagir_a_retorno_de_worker(
            registry, novo, canonical_task_id_anterior=canonical_task_id_anterior,
            checkpoint_anterior=checkpoint_anterior, branch_anterior=branch_anterior,
            tasks_json_path=tasks_json_path, repo_dir=repo_dir, remote_name=remote_name,
            config=config, state_git_remote=state_git_remote,
            snapshot_da_tarefa_original=snapshot_da_tarefa_original, patch=patch, gerar_patch=gerar_patch,
            transport=transport,
        )
        # Achado F7-C (6ª rodada): só deixa DEFINITIVAMENTE
        # AVAILABLE+current_task=None quando a tarefa anterior de fato não
        # pertence mais ao worker. Nos outros casos (human_session
        # aguardando retomada manual, portão fechado, contexto/checkpoint
        # insuficiente), restaura a reserva — AVAILABLE com current_task
        # de volta ao id canônico, nunca BUSY. CAS: só escreve se o
        # worker ainda estiver EXATAMENTE como a transição acima o deixou
        # (nenhuma atribuição nova assumiu o worker nesse meio-tempo).
        if canonical_task_id_anterior is not None and _deve_preservar_reserva(retorno):
            registry.reservar_current_task_condicional(
                novo.worker_id, canonical_task_id=canonical_task_id_anterior,
                message=(
                    f"worker: {nome} mantém reserva de {canonical_task_id_anterior} "
                    "(tarefa ainda dele, aguardando retomada)"
                ),
            )
        return f"{nome} marcado como AVAILABLE. {_resumo_retorno(retorno)}"

    raise ValueError(f"ação de comando desconhecida: {comando.action!r}")
