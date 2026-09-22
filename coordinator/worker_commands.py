"""Comandos em linguagem natural na Issue #88 para o Worker Registry
operacional (Issue #99: "José não deve editar JSON manualmente").

Determinístico por palavra-chave/regex — mesma filosofia de
``classify.py`` — porque isto é operação administrativa (Issue #90: FAST
faz "atualizar registro"), nunca precisa de uma chamada paga para
entender "Claude 2 entrou em limite". ``parse_worker_command`` só
RECONHECE a intenção; ``aplicar_comando`` é quem de fato escreve no
``OperationalWorkerRegistry`` (sempre via ``upsert``/``set_status``,
nunca tocando ``coordination/tasks.json`` nem matéria).

**Achado F6 (Issue #105, Fase F, 4ª rodada — fechamento do evento
automático):** a ação ``SET_AVAILABLE`` (comando "Claude 2 voltou" /
"Claude 2 disponível") é o ponto de entrada REAL de um heartbeat/
comando ``AVAILABLE`` já validado. ``reagir_a_retorno_de_worker`` reage
a ESSE evento chamando ``runner_resume.processar_retorno_de_worker``
(reusado por inteiro, nunca reimplementado) — que por sua vez reusa
``scheduler.reprocessar_retorno`` (Fase A) por inteiro. EVENT-DRIVEN,
zero polling: é uma chamada síncrona dentro do próprio ``aplicar_comando``,
nunca um laço/agendamento.

``tasks_json_path`` é OPCIONAL e por isso continua retrocompatível: sem
ele (comportamento de todo chamador existente, ex. ``observe.py``),
``aplicar_comando`` continua fazendo EXATAMENTE o que já fazia — só
``set_status``, nada de retomada automática. Só quando um chamador
FORNECE ``tasks_json_path`` (e, opcionalmente, o contexto de despacho —
``repo_dir``/``config``/``state_git_remote``/``snapshot_da_tarefa_original``)
é que a reação a SET_AVAILABLE de fato acontece — nenhum caminho
hardcoded/adivinhado para ``coordination/tasks.json``, mesma disciplina
de parametrização explícita do resto do pacote (``scheduler.
load_tasks_from_tasks_json(path)``)."""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import Callable

from .runner_dispatch import RunnerDispatchConfig, StructuredPatch
from .runner_resume import InterruptedTaskSnapshot, RetornoWorkerOutcome, processar_retorno_de_worker
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
    tasks_json_path: str,
    repo_dir: str | None = None,
    remote_name: str = "origin",
    config: RunnerDispatchConfig | None = None,
    state_git_remote: str | None = None,
    snapshot_da_tarefa_original: InterruptedTaskSnapshot | None = None,
    patch: StructuredPatch | None = None,
    gerar_patch: Callable[[], object] | None = None,
) -> RetornoWorkerOutcome:
    """Achado F6: a reação de verdade a "este worker está AVAILABLE
    agora" — EVENT-DRIVEN (chamada síncrona, zero polling), reusando
    ``scheduler.reprocessar_retorno``/``runner_resume.
    processar_retorno_de_worker`` por inteiro (nenhuma fila
    reimplementada aqui).

    ``worker_novo`` é o ``WorkerRecord`` JÁ com ``status="AVAILABLE"``
    (depois de ``registry.set_status``). ``set_status`` nunca limpa
    ``current_task`` sozinho (outros comandos — SET_LIMIT/DEACTIVATE —
    não devem inferir isso) — mas para os FINS desta reação, "voltou
    disponível" É a forma "livre" que ``avaliar_retomada`` já reconhece
    (achado F3: ``AVAILABLE`` + ``current_task=None``), então o registro
    usado para o hook é normalizado aqui, sem persistir isso de volta no
    Worker Registry (a persistência de current_task/BUSY, se a retomada
    for despachada, é responsabilidade de quem chama
    ``executar_tarefa``/Fase D — não deste módulo).

    ``tarefa_original`` (canônica, para ``TaskRecord.id``/ownership) é
    resolvida a partir do ``current_task`` que o worker tinha ANTES
    desta normalização, contra ``tasks_json_path`` — a fonte declarativa
    de tarefas já usada por ``scheduler.load_tasks_from_tasks_json``,
    nunca reimplementada aqui."""
    tarefas = load_tasks_from_tasks_json(tasks_json_path)
    tarefa_original = (
        next((t for t in tarefas if t.id == worker_novo.current_task), None)
        if worker_novo.current_task
        else None
    )
    workers = [
        replace(w, current_task=None) if w.worker_id == worker_novo.worker_id else w
        for w in registry.list_workers()
    ]
    return processar_retorno_de_worker(
        worker_que_volta=worker_novo.worker_id, tarefa_original=tarefa_original, tarefas=tarefas,
        workers=workers, snapshot_da_tarefa_original=snapshot_da_tarefa_original,
        repo_dir=repo_dir, remote_name=remote_name, config=config, state_git_remote=state_git_remote,
        patch=patch, gerar_patch=gerar_patch,
    )


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
        novo = registry.set_status(nome, "AVAILABLE", message=f"worker: {nome} -> AVAILABLE")
        if tasks_json_path is None:
            return f"{nome} marcado como AVAILABLE."
        retorno = reagir_a_retorno_de_worker(
            registry, novo, tasks_json_path=tasks_json_path, repo_dir=repo_dir, remote_name=remote_name,
            config=config, state_git_remote=state_git_remote,
            snapshot_da_tarefa_original=snapshot_da_tarefa_original, patch=patch, gerar_patch=gerar_patch,
        )
        return f"{nome} marcado como AVAILABLE. {_resumo_retorno(retorno)}"

    raise ValueError(f"ação de comando desconhecida: {comando.action!r}")
