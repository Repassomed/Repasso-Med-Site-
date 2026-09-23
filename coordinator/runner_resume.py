"""Retomada segura do Worker Runner — Issue #105, Fase F
(``#105-F · Retomada e integração``).

Esta rodada implementa SOMENTE a camada que decide "esta tarefa
interrompida pode ser retomada com segurança?" e prepara/despacha a
continuação — reaproveitando, sem reimplementar, tudo que as Fases A-D já
entregaram e já foram auditadas/mergeadas:

- ``coordinator/scheduler.py`` (Fase A) — ``reprocessar_retorno`` já
  decide "este worker que voltou deve retomar a PRÓPRIA tarefa, ou a fila
  deve oferecer a PRÓXIMA?" (critério 4/6 da Issue #105). Este módulo NÃO
  reimplementa essa decisão — consome o resultado dela.
- ``coordinator/handoff.py`` (Issue #99) — ``worker_retomando_deve_assumir``
  é a regra de OWNERSHIP/reserva já auditada (nunca refazer trabalho já
  concluído por outro, nunca duplicar trabalho paralelo). Importada
  diretamente, nunca copiada.
- ``coordinator/runner_contract.py`` (Fase C) — ``RunnerTask`` é reusada
  como o VALIDADOR estrutural da tarefa de retomada: construir uma
  ``RunnerTask`` nova já impõe TODAS as regras do contrato canônico
  (branch nunca main/master, allowed_files não-vazio/sem escape de
  diretório, checkpoint SHA explícito, Nível E impossível, Nível D exige
  ``jose_authorized``) — nunca reimplementadas aqui.
- ``coordinator/heartbeat.py`` (Fase B) — ``RunnerHeartbeat``/
  ``WorkerRecord.last_checkpoint`` são a ÚNICA fonte do
  ``checkpoint_commit`` usado aqui: um checkpoint só existe se alguém já
  reportou um heartbeat/comando com um SHA explícito — nunca inventado
  por este módulo, nunca a working tree não commitada.
- ``coordinator/runner_dispatch.py`` (Fase D) — ``executar_tarefa`` é
  REUSADA por inteiro, sem alteração nenhuma, para o caminho
  ``api_runner``: mesmo portão de segurança (flags), mesmo claim atômico
  (``RunnerClaimStore``/``GitJsonStore.claim_key`` — é isto que garante a
  idempotência/concorrência pedida pela Fase F, SEM um segundo sistema de
  claim), mesmo patch estruturado, mesma allowlist de comandos de
  validação, mesmo ``RunnerResult`` (nunca ``MERGE-READY``).

**O QUE ESTE MÓDULO ACRESCENTA** (a peça que faltava):

1. ``InterruptedTaskSnapshot`` — o contexto MÍNIMO de uma tarefa
   interrompida (Issue #105 Fase F: "não copiar histórico gigantesco de
   conversa"): task_id, instructions/objetivo, checkpoint_commit, branch,
   allowed_files, policy_level, risk_level, prioridade, worker anterior,
   motivo da interrupção, progresso conhecido, checks já realizados,
   pendências conhecidas — nada mais.
2. ``avaliar_retomada`` — decisão PURA (zero I/O): valida checkpoint
   presente, ownership (via ``handoff.worker_retomando_deve_assumir``),
   ``allowed_files`` nunca ampliado, compatibilidade/disponibilidade do
   worker receptor, e constrói uma ``RunnerTask`` NOVA (reaproveitando a
   validação estrutural do contrato canônico) com um ``task_id``
   DETERMINÍSTICO (``"{task_id}--resume-{checkpoint[:12]}"``) — a mesma
   retomada, pedida duas vezes, produz sempre o MESMO ``task_id``, então
   o claim atômico já existente em ``runner_dispatch.RunnerClaimStore``
   garante idempotência/concorrência sem nenhum mecanismo novo.
3. ``verificar_checkpoint_no_repo`` — a ÚNICA parte com I/O de leitura
   deste módulo: confirma que o ``checkpoint_commit`` REALMENTE existe no
   repositório e — 2ª rodada de auditoria, achado F2 — é EXATAMENTE o tip
   ATUAL da branch remota, não apenas um ancestral dele. Se a branch já
   avançou além do checkpoint (mesmo sendo ele um ancestral legítimo), a
   retomada é recusada: ``runner_dispatch.preparar_branch_de_trabalho``
   recria a branch NO checkpoint (``git checkout -B branch checkpoint``),
   e um push depois disso seria non-fast-forward contra o que já está
   publicado — nunca resolvido com force-push, nunca resolvido sozinho.
   Só leitura (``git fetch``/``rev-parse``/``merge-base --is-ancestor``),
   NUNCA ``commit``/``push``/``merge``/força (prova estrutural em
   ``test_no_forbidden_writes.py::test_runner_resume_never_writes_to_git``).
4. ``despachar_retomada`` — orquestração: ``human_session`` NUNCA é
   iniciada automaticamente, mas — achado F1 — também precisa do
   checkpoint CONFIRMADO no repositório antes de devolver uma
   continuação "utilizável" (só então prepara e devolve ``BLOCKED-LIMIT``
   com o checkpoint, "aguardando continuação manual"); ``api_runner`` só
   prossegue depois do MESMO checkpoint confirmado, e delega TODA a
   execução real para ``runner_dispatch.executar_tarefa`` (inalterado) —
   nunca reimplementando commit/push/patch/allowlist.
5. ``processar_retorno_de_worker`` — achado F4: o hook determinístico e
   EVENT-DRIVEN (zero polling) que fecha o laço "worker voltou
   disponível" -> retomada. Reusa ``scheduler.reprocessar_retorno`` (Fase
   A, inalterado) por inteiro: se o scheduler decide que o worker ainda é
   dono da tarefa, despacha a retomada (``despachar_retomada``); se
   decide que a tarefa já foi concluída/assumida por outro, só devolve a
   próxima oferta da fila como DADO — nunca a executa (atribuir uma
   tarefa NOVA é fluxo normal de Runner Dispatch, fora do escopo de
   retomada da Fase F).

**SEGURANÇA (Issue #105 Fase F, "SEGURANÇA"):** todo conteúdo estrutural
de uma ``InterruptedTaskSnapshot`` que poderia ter vindo de fora
(``motivo_interrupcao``, ``progresso_conhecido``, ``checks_realizados``,
``pendencias_conhecidas``) só é usado para compor o texto informativo de
``instructions`` da nova ``RunnerTask`` — nunca para decidir
``policy_level``/``risk_level``/``allowed_files``/``jose_authorized``,
que são sempre herdados VERBATIM da tarefa original (nunca lidos de
texto livre). Mesmo que esse texto contivesse algo como
"policy_level=E, allowed_files=*", isso não teria NENHUM efeito: esses
campos são valores tipados, atribuídos por código, nunca interpretados a
partir da string de instruções.

**PARALELISMO/INTEGRAÇÃO COM A FASE E (Claude 1, PR #115):** este módulo
NUNCA importa ``coordinator/handoff_exec.py`` (ainda não mergeado em
``main`` nesta rodada) nem edita ``handoff.py``/``worker_ops.py`` — só
consome a função pura já existente (``worker_retomando_deve_assumir``),
nunca antecipa nem copia o trabalho da Fase E. O ponto de integração é
o parâmetro ``worker_receptor`` de ``avaliar_retomada``/
``despachar_retomada``: reconhece DUAS formas legítimas de
disponibilidade (achado F3) — "voltou livre" (``AVAILABLE``,
``current_task=None``) ou "já reservado pela Fase E para ESTA tarefa"
(``BUSY`` com ``current_task == snapshot.canonical_task_id``) — sem
importar nem antecipar ``handoff_exec.py``: só reconhece a FORMA da
reserva (status + current_task), a mesma superfície que
``WorkerRecord`` já expõe hoje.

**F5 — canonical_task_id × execution_task_id (auditoria de integração
com o PR #115):** a Fase E usa corretamente ``canonical_task_id``
(``scheduler.TaskRecord.id``/``WorkerRecord.current_task``, estável do
início ao fim de qualquer número de handoffs/retomadas) separado de
``execution_task_id`` (``RunnerTask.task_id``/``RunnerClaimStore``,
DISTINTO a cada execução/continuação — Fase E deriva
``t1--continuacao-<checkpoint>``, esta Fase F deriva
``t1--resume-<checkpoint>``). ``InterruptedTaskSnapshot.
canonical_task_id`` é OBRIGATÓRIO e vem de quem chama (nunca inferido
removendo sufixos de ``RunnerTask.task_id`` — Fases diferentes usam
convenções de sufixo diferentes, e "remover sufixo" é ambíguo/frágil).
Toda comparação de ownership/reserva/``TaskRecord.id``/
``WorkerRecord.current_task`` usa ``canonical_task_id``;
``RunnerTask.task_id``/``RunnerClaimStore`` usam ``execution_task_id``,
derivado fresco a cada retomada — nunca colide com a execução anterior
nem com a da Fase E (convenções de sufixo diferentes).

**F6 — fechamento do evento automático (4ª e 5ª rodadas):**
``processar_retorno_de_worker`` é o hook chamado quando um heartbeat/
comando ``AVAILABLE`` já validado chega. Desde a 4ª rodada, o ponto de
entrada real — ``coordinator/worker_commands.py::aplicar_comando``
(ação ``SET_AVAILABLE``, Issue #88/#90) — já chama esse hook de
verdade. Dedup/"exatamente uma reação por evento" continua garantido
TRANSITIVAMENTE por este módulo sem nenhum estado novo: o caminho de
retomada reusa o claim atômico de ``runner_dispatch.RunnerClaimStore``
(duas chamadas do hook para o MESMO evento nunca executam duas vezes);
o caminho de "próxima oferta" é uma decisão PURA, nunca executada por
este módulo.

**F6-B (5ª rodada) — recuperação de contexto a partir de uma fonte
persistida e confiável:** ``recuperar_runner_task_de_handoff`` (abaixo)
é a ÚNICA forma deste módulo reconstruir automaticamente uma
``InterruptedTaskSnapshot`` sem que quem chama forneça uma
explicitamente — lendo o registro de execuções que
``handoff_exec.HandoffClaimStore.registrar_execucao`` já grava de
verdade (branch dedicada ``coordinator-state-handoff``, Fase E, PR
#115, agora mergeada) toda vez que um handoff real é executado. NUNCA
fabrica ``instructions``/``allowed_files``/``policy_level`` a partir de
``coordination/tasks.json`` ou de texto livre — só reconstrói uma
``RunnerTask`` que já foi validada e persistida de verdade por um
handoff REAL anterior. Sem um registro confiável (ex.: a PRIMEIRA
atribuição de uma tarefa, que nunca passou por handoff nenhum, ou uma
reserva ``human_session``, que nunca carrega uma ``RunnerTask``
completa) devolve ``None`` — fail-closed, nunca inventa.

**F6-D (5ª rodada) — canonical_task_id nos heartbeats:**
``runner_dispatch.executar_tarefa`` ganhou o parâmetro OPCIONAL
``canonical_task_id`` (default ``None`` = ``task.task_id``, mesmo
comportamento de antes) — quando fornecido, o heartbeat ``BUSY``
emitido no início da execução usa o id CANÔNICO, nunca o
``execution_task_id`` derivado, para que ``WorkerRecord.current_task``
continue comparável com ``TaskRecord.id``/ownership durante toda a
execução (não só antes/depois dela). ``despachar_retomada`` (abaixo)
sempre passa ``canonical_task_id=snapshot.canonical_task_id``. O
heartbeat ``OFFLINE`` final já limpava ``current_task`` mesmo antes
desta rodada (``RunnerHeartbeat`` sem ``task_id`` é o único formato
válido para ``OFFLINE`` — ``runner_contract.py``, Fase C — e
``heartbeat.aplicar_heartbeat`` sempre sobrescreve
``current_task=heartbeat.task_id``, nunca preserva por omissão).

**F7-B (6ª rodada) — geração real de patch:** no fluxo REAL (comando
``SET_AVAILABLE`` chegando pela Inbox, sem nenhum ``patch``/``gerar_patch``
manual) ``despachar_retomada`` agora constrói o gerador de verdade
sozinho — ``runner_generate.gerar_patch_via_claude``, importado
localmente (mesma cautela contra ciclo de ``runner_dispatch.py::main()``),
com a MESMA ``RunnerDispatchConfig`` já validada e o MESMO ledger
Anthropic GLOBAL (``coordinator-state-usage``, mesma branch que o
Coordinator OBSERVE e o CLI ``--generate-via-claude`` já usam — nunca um
ledger/orçamento paralelo). ``patch``/``gerar_patch`` explícitos (uso
manual/teste) continuam tendo prioridade absoluta quando fornecidos.

**O QUE ESTE MÓDULO DELIBERADAMENTE NÃO FAZ:** não decide handoff
(Fase E); não toca ``coordination/tasks.json``; não ativa nenhuma flag
nova (reusa ``RunnerDispatchConfig`` da Fase D, inalterada — continua
``REPASSO_RUNNER_ENABLED=false`` em produção); não executa nenhum
canário real; não muda ``scheduler.py``/``handoff.py``/
``runner_contract.py``/``heartbeat.py``/``handoff_exec.py``/
``worker_ops.py`` — todos consumidos, nenhum editado (``runner_dispatch.py``
ganhou só o parâmetro opcional acima, achado F6-D, nunca sua lógica de
gate/claim/patch reimplementada); ``processar_retorno_de_worker`` nunca
despacha a "próxima oferta" da fila — só a devolve como dado;
``recuperar_runner_task_de_handoff`` só LÊ a branch de estado do
handoff — nunca escreve nela, nunca reimplementa
``HandoffClaimStore``/``executar_handoff``.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from typing import Callable

from .classify import Priority
from .git_state import GitJsonStore
from .handoff import worker_retomando_deve_assumir
from .handoff_exec import DEFAULT_HANDOFF_STATE_BRANCH
from .redact import redact
from .runner_contract import RunnerTask, RunnerResult
from .runner_dispatch import RunnerDispatchConfig, StructuredPatch, executar_tarefa
from .scheduler import QueueDecision, TaskRecord, reprocessar_retorno
from .worker_ops import OperationalWorkerRegistry, WorkerRecord

_ACOES_VALIDAS = ("RESUME", "BLOCKED", "WAIT")


# ---------------------------------------------------------------------------
# Contexto mínimo de uma tarefa interrompida.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InterruptedTaskSnapshot:
    """Retrato SOMENTE-LEITURA de uma tarefa interrompida — só os campos
    estruturados que já existem em algum lugar do sistema (nunca
    histórico de conversa). Construir isto não tem efeito colateral
    nenhum.

    Achado F5 (rodada de integração com a Fase E, PR #115): ``RunnerTask.
    task_id`` NÃO é uma identidade estável — cada execução/continuação
    deriva o SEU PRÓPRIO ``task_id`` (Fase E: ``t1--continuacao-
    <checkpoint>``; esta Fase F: ``t1--resume-<checkpoint>``), porque
    ``runner_dispatch.RunnerClaimStore`` reivindica esse valor
    PERMANENTEMENTE na primeira tentativa. ``canonical_task_id`` é a
    identidade ESTÁVEL da tarefa (a mesma que ``scheduler.TaskRecord.id``
    e ``WorkerRecord.current_task`` usam, do início ao fim, através de
    qualquer número de handoffs/retomadas) — é ela que TODA comparação de
    ownership/reserva usa. ``execution_task_id_anterior`` é só
    informativo (rastreabilidade: qual foi a ÚLTIMA execução antes desta
    interrupção) — nunca usado para decidir nada."""

    canonical_task_id: str
    priority: Priority
    source_issue: int | None
    branch: str
    allowed_files: tuple[str, ...]
    instructions: str
    capabilities_required: tuple[str, ...]
    risk_level: str
    policy_level: str
    jose_authorized: bool
    publication_required: bool
    worker_anterior: str
    checkpoint_commit: str | None
    motivo_interrupcao: str
    progresso_conhecido: str | None = None
    checks_realizados: tuple[str, ...] = ()
    pendencias_conhecidas: tuple[str, ...] = ()
    execution_task_id_anterior: str | None = None

    def to_dict(self) -> dict:
        return {
            "canonical_task_id": self.canonical_task_id,
            "priority": self.priority.value,
            "source_issue": self.source_issue,
            "branch": self.branch,
            "allowed_files": list(self.allowed_files),
            "capabilities_required": list(self.capabilities_required),
            "risk_level": self.risk_level,
            "policy_level": self.policy_level,
            "jose_authorized": self.jose_authorized,
            "publication_required": self.publication_required,
            "worker_anterior": self.worker_anterior,
            "checkpoint_commit": self.checkpoint_commit,
            "motivo_interrupcao": self.motivo_interrupcao,
            "progresso_conhecido": self.progresso_conhecido,
            "checks_realizados": list(self.checks_realizados),
            "pendencias_conhecidas": list(self.pendencias_conhecidas),
            "execution_task_id_anterior": self.execution_task_id_anterior,
        }


def snapshot_de_interrupcao(
    *,
    canonical_task_id: str,
    tarefa_original: RunnerTask,
    worker_anterior: WorkerRecord,
    motivo_interrupcao: str,
    progresso_conhecido: str | None = None,
    checks_realizados: tuple[str, ...] = (),
    pendencias_conhecidas: tuple[str, ...] = (),
) -> InterruptedTaskSnapshot:
    """Constrói o snapshot a partir de peças que já existem: a
    ``RunnerTask`` original (contrato canônico, Fase C) e o
    ``WorkerRecord`` de quem trabalhava nela (Worker Registry
    operacional, ``last_checkpoint`` só existe se um heartbeat real já o
    publicou — Fase B). Recusa construir o snapshot se o worker
    informado não é de fato quem o registro diz estar na tarefa —
    checagem de ownership na própria ORIGEM do dado, antes de qualquer
    decisão de retomada.

    ``canonical_task_id`` (achado F5) é OBRIGATÓRIO e vem de quem chama
    (``scheduler.TaskRecord.id``/``WorkerRecord.current_task`` — a fonte
    já canônica) — este módulo NUNCA tenta INFERIR a identidade canônica
    removendo sufixos de ``tarefa_original.task_id`` (que pode já ser um
    id de EXECUÇÃO derivado pela Fase E, ex. ``t1--continuacao-X``, e
    stripping de sufixo por string é ambíguo/frágil quando Fases
    diferentes usam convenções de sufixo diferentes)."""
    if not canonical_task_id or not canonical_task_id.strip():
        raise ValueError("canonical_task_id vazio — retomada precisa de uma identidade canônica estável.")
    if worker_anterior.current_task != canonical_task_id:
        raise ValueError(
            f"worker {worker_anterior.worker_id!r} não está registrado como dono de "
            f"{canonical_task_id!r} (current_task={worker_anterior.current_task!r} no Worker "
            "Registry) — snapshot recusado."
        )
    return InterruptedTaskSnapshot(
        canonical_task_id=canonical_task_id,
        priority=tarefa_original.priority,
        source_issue=tarefa_original.source_issue,
        branch=tarefa_original.branch,
        allowed_files=tarefa_original.allowed_files,
        instructions=tarefa_original.instructions,
        capabilities_required=tarefa_original.capabilities_required,
        risk_level=tarefa_original.risk_level,
        policy_level=tarefa_original.policy_level,
        jose_authorized=tarefa_original.jose_authorized,
        publication_required=tarefa_original.publication_required,
        worker_anterior=worker_anterior.worker_id,
        checkpoint_commit=worker_anterior.last_checkpoint,
        motivo_interrupcao=motivo_interrupcao,
        progresso_conhecido=progresso_conhecido or worker_anterior.progress,
        checks_realizados=checks_realizados,
        pendencias_conhecidas=pendencias_conhecidas,
        execution_task_id_anterior=tarefa_original.task_id,
    )


def recuperar_runner_task_de_handoff(
    *, state_git_remote: str, worker_id: str, canonical_task_id: str,
    handoff_state_branch: str = DEFAULT_HANDOFF_STATE_BRANCH,
) -> RunnerTask | None:
    """Achado F6-B (Issue #105 Fase F, 5ª rodada): recupera o contexto
    mínimo de uma ``RunnerTask`` a partir da ÚNICA fonte persistida e
    CONFIÁVEL que o sistema já tem — o registro de execuções de handoff
    que ``handoff_exec.HandoffClaimStore.registrar_execucao`` já grava
    de verdade (branch dedicada ``coordinator-state-handoff``, Fase E,
    nunca ``main``/matéria) toda vez que um handoff REAL é executado.
    Só LEITURA (``GitJsonStore.read()``) — nunca escreve nessa branch,
    nunca reimplementa ``HandoffClaimStore``/``executar_handoff``.

    NUNCA fabrica ``instructions``/``allowed_files``/``policy_level`` a
    partir de ``coordination/tasks.json`` ou de texto livre — o único
    material aceito aqui é um ``runner_task`` que já foi construído e
    validado de verdade por ``handoff_exec.derivar_runner_task_
    continuacao`` (que por sua vez já passou pela validação estrutural
    completa de ``RunnerTask.__post_init__``) — reconstruído aqui via
    ``RunnerTask.from_dict``, que RE-VALIDA tudo de novo.

    Devolve ``None`` (fail-closed, nunca inventa) quando não há nenhum
    registro ``HANDOFF_EXECUTED`` confiável para
    ``(worker_id, canonical_task_id)`` — por exemplo, a PRIMEIRA
    atribuição de uma tarefa (nunca passou por handoff nenhum) ou uma
    reserva ``human_session`` (que nunca carrega uma ``RunnerTask``
    completa, só uma instrução textual, ``human_instruction``). Quando
    há mais de um registro (handoffs sucessivos da mesma tarefa para o
    mesmo worker — raro, mas possível), usa o mais recente
    (``recorded_at``)."""
    store = GitJsonStore(remote=state_git_remote, branch=handoff_state_branch)
    dados = store.read()
    registros = dados.get("handoffs") or []
    candidatos = [
        r for r in registros
        if isinstance(r, dict)
        and r.get("action") == "HANDOFF_EXECUTED"
        and r.get("new_worker_id") == worker_id
        and r.get("task_id") == canonical_task_id
        and r.get("runner_task")
    ]
    if not candidatos:
        return None
    mais_recente = max(candidatos, key=lambda r: r.get("recorded_at") or "")
    try:
        return RunnerTask.from_dict(mais_recente["runner_task"])
    except (KeyError, ValueError, TypeError):
        # Registro corrompido/incompatível — fail-closed, nunca uma
        # RunnerTask "quase reconstruída".
        return None


def formatar_instrucoes_retomada(snapshot: InterruptedTaskSnapshot) -> str:
    """Bloco informativo determinístico anexado às instruções originais
    — NUNCA concede permissão nenhuma (ver docstring do módulo,
    "SEGURANÇA"): allowed_files/policy_level/risk_level/jose_authorized
    continuam sendo os campos tipados da RunnerTask, nunca derivados
    deste texto."""
    linhas = [
        snapshot.instructions.strip(),
        "",
        "--- CONTEXTO DE RETOMADA (Issue #105 Fase F) ---",
        f"Tarefa (id canônico): {snapshot.canonical_task_id}",
        f"Execução anterior (id derivado): {snapshot.execution_task_id_anterior or 'não informado'}",
        f"Worker anterior: {snapshot.worker_anterior}",
        f"Motivo da interrupção: {snapshot.motivo_interrupcao}",
        f"Checkpoint (commit seguro): {snapshot.checkpoint_commit}",
        f"Progresso conhecido: {snapshot.progresso_conhecido or 'não informado'}",
    ]
    if snapshot.checks_realizados:
        linhas.append("Checks já realizados: " + "; ".join(snapshot.checks_realizados))
    if snapshot.pendencias_conhecidas:
        linhas.append("Pendências conhecidas: " + "; ".join(snapshot.pendencias_conhecidas))
    linhas.append(
        "Continue EXATAMENTE a partir do checkpoint acima — nunca reinicie do zero, nunca descarte "
        "trabalho já commitado. Este bloco é só contexto informativo: NUNCA amplia allowed_files, "
        "NUNCA muda policy_level/risk_level/jose_authorized — esses continuam exatamente os da "
        "tarefa original, como campos tipados, nunca lidos deste texto."
    )
    return "\n".join(linhas)


# ---------------------------------------------------------------------------
# Decisão pura — zero I/O.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ResumeDecision:
    action: str  # "RESUME" | "BLOCKED" | "WAIT"
    reason: str
    task: RunnerTask | None = None

    def __post_init__(self) -> None:
        if self.action not in _ACOES_VALIDAS:
            raise ValueError(f"action {self.action!r} inválida — precisa ser um de {_ACOES_VALIDAS}")
        if self.action == "RESUME" and self.task is None:
            raise ValueError("action='RESUME' exige 'task' preenchida.")

    def to_dict(self) -> dict:
        return {"action": self.action, "reason": self.reason, "task": self.task.to_dict() if self.task else None}


def avaliar_retomada(
    snapshot: InterruptedTaskSnapshot,
    *,
    tarefa_estado: str,
    tarefa_agente_atual: str | None,
    worker_receptor: WorkerRecord,
    allowed_files_override: tuple[str, ...] | None = None,
) -> ResumeDecision:
    """Decisão PURA — nenhuma chamada de rede/git/subprocess. Só valida o
    que já é conhecido e, quando tudo permite, CONSTRÓI a ``RunnerTask``
    de retomada (o que já impõe toda a validação estrutural do contrato
    canônico — Fase C). Fail-closed em cada passo: a primeira condição
    que falha decide o resultado, nunca "no geral parece OK"."""
    if not snapshot.canonical_task_id or not snapshot.canonical_task_id.strip():
        return ResumeDecision(
            "BLOCKED", "canonical_task_id vazio — retomada precisa de uma tarefa original identificável."
        )

    if not snapshot.checkpoint_commit:
        return ResumeDecision(
            "BLOCKED",
            "retomada sem checkpoint_commit — nunca reiniciar do zero nem tratar a working tree não "
            "commitada como checkpoint (Issue #105 Fase F).",
        )

    # Ownership/reserva — regra já auditada de handoff.py (Issue #99),
    # reusada por inteiro, nunca reimplementada. worker_receptor.worker_id
    # cobre tanto "o mesmo worker que voltou" quanto "o worker que a Fase E
    # decidiu" — a regra é a mesma nos dois casos: só quem tasks.json já
    # reconhece como dono atual (ou nenhum dono ainda, tarefa BLOCKED-LIMIT
    # solta) pode assumir.
    deve_assumir, motivo_ownership = worker_retomando_deve_assumir(
        tarefa_estado=tarefa_estado,
        tarefa_agente_atual=tarefa_agente_atual,
        worker_que_volta=worker_receptor.worker_id,
    )
    if not deve_assumir:
        return ResumeDecision("BLOCKED", motivo_ownership)

    # allowed_files: nunca ampliar — só preservar exatamente (default) ou
    # reduzir (subconjunto explícito).
    if allowed_files_override is not None:
        if not allowed_files_override:
            return ResumeDecision(
                "BLOCKED", "allowed_files_override vazio — retomada sempre precisa de arquivos reservados."
            )
        extras = set(allowed_files_override) - set(snapshot.allowed_files)
        if extras:
            return ResumeDecision(
                "BLOCKED",
                f"allowed_files_override amplia a reserva original: {sorted(extras)!r} — retomada nunca "
                "pode ampliar allowed_files (Issue #105 Fase F).",
            )
        allowed_files_finais = allowed_files_override
    else:
        allowed_files_finais = snapshot.allowed_files

    if snapshot.capabilities_required and not (
        set(snapshot.capabilities_required) & set(worker_receptor.capabilities)
    ):
        return ResumeDecision(
            "BLOCKED",
            f"worker receptor {worker_receptor.worker_id!r} não tem nenhuma das capabilities exigidas "
            f"{sorted(snapshot.capabilities_required)!r}.",
        )

    if not worker_receptor.can_execute:
        return ResumeDecision(
            "BLOCKED", f"worker receptor {worker_receptor.worker_id!r} tem can_execute=False."
        )

    # Disponibilidade do worker receptor — achado F3 da 2ª rodada de
    # auditoria: DUAS formas legítimas de estar pronto para retomar, nunca
    # só "AVAILABLE". (1) voltou livre: AVAILABLE e sem nenhuma tarefa em
    # mãos. (2) já foi reservado por uma decisão de handoff REAL da Fase E
    # (coordinator/handoff_exec.py, PR #115, ainda não mergeado) para ESTA
    # MESMA tarefa: aparece como BUSY com current_task ==
    # snapshot.canonical_task_id (F5: SEMPRE o id canônico, nunca um id
    # de execução derivado)
    # — não pode ser tratado como "ainda não disponível" (isso o deixaria
    # em WAIT eterno, já que um worker BUSY numa reserva legítima nunca
    # fica AVAILABLE sozinho), nem este módulo pode EXIGIR AVAILABLE (a
    # Fase E já fez essa transição antes de chamar aqui). Este módulo NÃO
    # importa nem antecipa handoff_exec.py — só reconhece a FORMA da
    # reserva (status + current_task), a mesma superfície que
    # ``WorkerRecord`` já expõe hoje.
    if worker_receptor.status == "AVAILABLE" and worker_receptor.current_task is not None:
        return ResumeDecision(
            "BLOCKED",
            f"worker receptor {worker_receptor.worker_id!r} está AVAILABLE mas com current_task "
            f"{worker_receptor.current_task!r} preenchido — estado inconsistente, nunca assumir sem uma "
            "reserva válida.",
        )

    # F5: current_task do Worker Registry SEMPRE compara contra o id
    # CANÔNICO (nunca contra um id de execução derivado — nem o desta
    # Fase F, nem o "--continuacao-" da Fase E).
    if worker_receptor.status == "BUSY" and worker_receptor.current_task != snapshot.canonical_task_id:
        return ResumeDecision(
            "BLOCKED",
            f"worker receptor {worker_receptor.worker_id!r} está BUSY e current_task "
            f"({worker_receptor.current_task!r}) não corresponde à tarefa (id canônico) sendo retomada "
            f"({snapshot.canonical_task_id!r}) — nunca tomar de uma reserva alheia.",
        )

    receptor_livre = worker_receptor.status == "AVAILABLE" and worker_receptor.current_task is None
    receptor_reservado_para_esta_tarefa = (
        worker_receptor.status == "BUSY" and worker_receptor.current_task == snapshot.canonical_task_id
    )
    if not (receptor_livre or receptor_reservado_para_esta_tarefa):
        return ResumeDecision(
            "WAIT",
            f"worker receptor {worker_receptor.worker_id!r} ainda não está pronto para retomar (status "
            f"atual: {worker_receptor.status!r}, current_task: {worker_receptor.current_task!r}) — "
            "aguardando, nada bloqueado permanentemente.",
        )

    # F5: execution_task_id DETERMINÍSTICO (id canônico + checkpoint) —
    # nunca o id canônico sozinho (RunnerClaimStore reivindicaria a
    # identidade canônica PERMANENTEMENTE, impedindo qualquer execução
    # futura da mesma tarefa). A MESMA retomada, pedida de novo, produz o
    # MESMO execution_task_id — é isto que faz o claim atômico já
    # existente em runner_dispatch.RunnerClaimStore (Fase D,
    # GitJsonStore.claim_key) garantir idempotência/concorrência sem
    # nenhum mecanismo novo; um NOVO checkpoint (nova interrupção depois
    # de progresso real) sempre deriva um execution_task_id DISTINTO,
    # nunca colidindo com a execução anterior nem com a da Fase E
    # (convenção de sufixo diferente: "--resume-" aqui, "--continuacao-"
    # lá — nunca a mesma chave de claim).
    execution_task_id = f"{snapshot.canonical_task_id}--resume-{snapshot.checkpoint_commit[:12]}"
    instructions = formatar_instrucoes_retomada(snapshot)

    try:
        tarefa = RunnerTask(
            task_id=execution_task_id,
            priority=snapshot.priority,
            source_issue=snapshot.source_issue,
            branch=snapshot.branch,
            allowed_files=allowed_files_finais,
            instructions=instructions,
            checkpoint_commit=snapshot.checkpoint_commit,
            capabilities_required=snapshot.capabilities_required,
            risk_level=snapshot.risk_level,
            policy_level=snapshot.policy_level,
            jose_authorized=snapshot.jose_authorized,
            publication_required=snapshot.publication_required,
        )
    except ValueError as exc:
        # Qualquer violação do contrato canônico (branch inválida,
        # checkpoint malformado, Nível E, Nível D sem autorização...)
        # chega aqui como ValueError — fail-closed, nunca uma retomada
        # "quase válida".
        return ResumeDecision("BLOCKED", f"contrato canônico rejeitou a retomada: {exc}")

    return ResumeDecision(
        "RESUME",
        (
            f"retomada permitida: {snapshot.canonical_task_id!r} (worker anterior "
            f"{snapshot.worker_anterior!r}) -> {worker_receptor.worker_id!r}, a partir do checkpoint "
            f"{snapshot.checkpoint_commit!r} (execution_task_id: {execution_task_id!r})."
        ),
        task=tarefa,
    )


# ---------------------------------------------------------------------------
# Verificação REAL do checkpoint — a única parte deste módulo com I/O, e
# SÓ DE LEITURA (fetch/rev-parse/merge-base --is-ancestor). Nunca commit,
# nunca push, nunca merge, nunca força — prova estrutural em
# test_no_forbidden_writes.py::test_runner_resume_never_writes_to_git.
# ---------------------------------------------------------------------------

def _git(repo_dir: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", repo_dir, *args], capture_output=True, text=True)


def _resolver_commit_completo(repo_dir: str, commit: str) -> str | None:
    """Devolve o SHA completo (40 chars) de ``commit`` se ele existe
    LOCALMENTE, ou ``None`` — nunca lança exceção. Usado em vez de
    comparar strings de tamanho variável: ``checkpoint_commit`` pode ser
    um SHA curto (7-40 chars, ``runner_contract._COMMIT_SHA_RE``), então
    comparar contra o tip (sempre 40 chars via ``rev-parse``) exige
    normalizar os dois para o mesmo tamanho primeiro."""
    r = _git(repo_dir, "rev-parse", "--verify", "-q", f"{commit}^{{commit}}")
    if r.returncode != 0:
        return None
    return r.stdout.strip()


def verificar_checkpoint_no_repo(repo_dir: str, remote_name: str, branch: str, commit: str) -> tuple[bool, str]:
    """Confirma, com git de verdade (só leitura), que ``commit``:

    1. existe (busca ``branch`` do remoto primeiro, se ainda não estiver
       localmente — o commit pode ter sido publicado por outra execução);
    2. é EXATAMENTE o tip ATUAL de ``branch`` no remoto — achado F2 da 2ª
       rodada de auditoria: um checkpoint que é só ANCESTRAL do tip
       (branch avançou depois dele) NÃO é aceito nesta fase, porque
       ``runner_dispatch.preparar_branch_de_trabalho`` recria a branch NO
       checkpoint (``git checkout -B branch checkpoint``) e um push
       depois disso seria non-fast-forward contra o que já está
       publicado. Retomar NA MESMA branch, nesta fase, exige o
       checkpoint = tip remoto atual; qualquer avanço detectado é
       ``BLOCKED`` — nunca resolvido com force-push, nunca resolvido
       sozinho. Uma branch REESCRITA (o commit nem é mais ancestral do
       tip) continua igualmente recusada (Issue #105: 'branch divergente
       da main... deve BLOCKED, nunca tentar resolver sozinho'; aqui
       generalizado para qualquer branch de trabalho, não só main).

    Devolve ``(ok, motivo)`` — nunca levanta exceção por conta própria
    (falha de rede/git vira ``(False, motivo)``, fail-closed)."""
    commit_completo = _resolver_commit_completo(repo_dir, commit)
    if commit_completo is None:
        busca = _git(repo_dir, "fetch", remote_name, branch)
        if busca.returncode != 0:
            return False, (
                f"não consegui buscar a branch {branch!r} de {remote_name!r} para confirmar o "
                f"checkpoint {commit!r}: {redact(busca.stderr)}"
            )
        commit_completo = _resolver_commit_completo(repo_dir, commit)
        if commit_completo is None:
            return False, (
                f"checkpoint_commit {commit!r} não existe (nem localmente, nem após buscar {branch!r} "
                f"de {remote_name!r}) — retomada recusada, nunca inventar um checkpoint."
            )

    fetch = _git(repo_dir, "fetch", remote_name, branch)
    if fetch.returncode != 0:
        return False, (
            f"não consegui confirmar o tip atual de {branch!r} em {remote_name!r}: {redact(fetch.stderr)}"
        )
    tip = _git(repo_dir, "rev-parse", "FETCH_HEAD")
    if tip.returncode != 0:
        return False, (
            f"não consegui resolver o tip atual de {branch!r} em {remote_name!r}: {redact(tip.stderr)}"
        )
    tip_completo = tip.stdout.strip()

    if commit_completo == tip_completo:
        return True, f"checkpoint {commit!r} confirmado: é exatamente o tip atual de {branch!r}."

    ancestral = _git(repo_dir, "merge-base", "--is-ancestor", commit_completo, tip_completo)
    if ancestral.returncode != 0:
        return False, (
            f"checkpoint {commit!r} não é ancestral do tip ATUAL de {branch!r} (tip: {tip_completo!r}) — "
            "branch divergente/reescrita desde o checkpoint; retomada recusada, nunca tentar resolver "
            "sozinho (Issue #105)."
        )
    return False, (
        f"branch {branch!r} avançou além do checkpoint {commit!r} (tip atual: {tip_completo!r}) — "
        "retomar nesta fase exige que o checkpoint seja EXATAMENTE o tip remoto atual (nunca recriar a "
        "branch mais atrás do que ela já está; nunca force-push; nunca resolver a divergência sozinho — "
        "Issue #105 Fase F, achado F2)."
    )


# ---------------------------------------------------------------------------
# Orquestração — reusa runner_dispatch.executar_tarefa por inteiro para o
# caminho api_runner; human_session nunca é despachada automaticamente.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ResumeOutcome:
    decision: ResumeDecision
    result: RunnerResult | None = None
    dispatch_outcome: object | None = None  # runner_dispatch.DispatchOutcome, só quando api_runner despachado
    external_calls_made: bool = False
    notes: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        return {
            "decision": self.decision.to_dict(),
            "result": self.result.to_dict() if self.result else None,
            "dispatch_outcome": self.dispatch_outcome.to_dict() if self.dispatch_outcome else None,
            "external_calls_made": self.external_calls_made,
            "notes": list(self.notes),
        }


def despachar_retomada(
    snapshot: InterruptedTaskSnapshot,
    *,
    tarefa_estado: str,
    tarefa_agente_atual: str | None,
    worker_receptor: WorkerRecord,
    repo_dir: str,
    remote_name: str = "origin",
    config: RunnerDispatchConfig | None = None,
    state_git_remote: str | None = None,
    validation_command_keys: tuple[str, ...] = (),
    worker_registry: OperationalWorkerRegistry | None = None,
    patch: StructuredPatch | None = None,
    gerar_patch: Callable[[], object] | None = None,
    allowed_files_override: tuple[str, ...] | None = None,
    transport: object | None = None,
) -> ResumeOutcome:
    """Avalia (puro) e, só se ``RESUME``, prossegue: ``human_session``
    nunca é despachada automaticamente (Issue #105: "não fingir que uma
    human_session pode ser iniciada automaticamente") — só prepara e
    devolve ``BLOCKED-LIMIT`` com o checkpoint, para retomada manual.
    ``api_runner`` só prossegue depois de ``verificar_checkpoint_no_repo``
    confirmar o checkpoint de verdade; a execução em si é 100% delegada a
    ``runner_dispatch.executar_tarefa`` (mesmo portão de segurança, mesmo
    claim atômico — nenhum código deste módulo decide gate/claim/patch
    sozinho).

    Achado F7-B (6ª rodada): no fluxo REAL não existe ``patch``/
    ``gerar_patch`` manual — quando quem chama não fornece NENHUM dos
    dois, este módulo constrói o gerador de verdade sozinho, reusando
    ``runner_generate.gerar_patch_via_claude`` com a MESMA
    ``RunnerDispatchConfig`` já validada acima (o portão já foi checado
    antes deste ponto) e o MESMO ledger Anthropic GLOBAL (branch
    ``coordinator-state-usage`` do ``state_git_remote`` já em uso — o
    mesmo mecanismo que o Coordinator OBSERVE e o CLI
    ``--generate-via-claude`` de ``runner_dispatch.py`` já usam; nunca um
    ledger/orçamento paralelo). ``gerar_patch()`` só é invocada por
    ``executar_tarefa`` DEPOIS que o claim atômico do task_id já teve
    êxito (garantia da própria ``executar_tarefa``, nunca reimplementada
    aqui) — "claim antes de qualquer chamada paga" é herdado
    automaticamente. ``transport`` é só um ponto de injeção para teste
    (nunca usado em produção — lá ``gerar_patch_via_claude`` usa o
    transporte real por padrão); ``patch``/``gerar_patch`` explícitos
    continuam tendo prioridade (uso manual/teste)."""
    decisao = avaliar_retomada(
        snapshot, tarefa_estado=tarefa_estado, tarefa_agente_atual=tarefa_agente_atual,
        worker_receptor=worker_receptor, allowed_files_override=allowed_files_override,
    )
    if decisao.action != "RESUME":
        # BLOCKED é terminal — vira um RunnerResult de verdade (mesmo
        # vocabulário do contrato canônico), para que quem chama
        # despachar_retomada sempre tenha um ``result`` quando algo
        # definitivo aconteceu. WAIT NUNCA é terminal ("tente de novo
        # quando o worker receptor ficar disponível") e RunnerResult não
        # tem status "WAIT" — por isso ``result`` fica None só nesse caso.
        # Antes de RESUME nunca existe um execution_task_id derivado — o
        # BLOCKED reporta o id CANÔNICO (é tudo que se sabe até aqui;
        # RunnerResult.task_id só precisa ser não-vazio e rastreável).
        resultado_bloqueio = (
            RunnerResult(task_id=snapshot.canonical_task_id, status="BLOCKED", reason=decisao.reason)
            if decisao.action == "BLOCKED"
            else None
        )
        return ResumeOutcome(
            decision=decisao, result=resultado_bloqueio, external_calls_made=False,
            notes=("decisão pura (BLOCKED/WAIT) — zero chamada externa, zero chamada paga.",),
        )

    tarefa = decisao.task
    if tarefa is None:  # defensivo — ResumeDecision já garante isto no __post_init__
        raise AssertionError("ResumeDecision.action == 'RESUME' sem 'task' — invariante do próprio módulo quebrada.")

    if worker_receptor.type != "api_runner":
        # Achado F1 da 2ª rodada de auditoria: human_session continua
        # NUNCA sendo iniciada automaticamente, mas também precisa do
        # checkpoint CONFIRMADO de verdade no repositório antes de
        # devolver uma continuação "utilizável" — sem isso, o worker
        # humano receberia um checkpoint que pode nem existir mais.
        ok_checkpoint, motivo_checkpoint = verificar_checkpoint_no_repo(
            repo_dir, remote_name, tarefa.branch, tarefa.checkpoint_commit,
        )
        if not ok_checkpoint:
            resultado = RunnerResult(task_id=tarefa.task_id, status="BLOCKED", reason=motivo_checkpoint)
            return ResumeOutcome(
                decision=decisao, result=resultado, external_calls_made=True,
                notes=("checkpoint/branch não confirmados no repositório — nenhuma continuação preparada.",),
            )
        resultado = RunnerResult(
            task_id=tarefa.task_id, status="BLOCKED-LIMIT",
            reason=(
                f"tarefa preparada para retomada por sessão humana ({worker_receptor.worker_id!r}) — "
                "nunca iniciada automaticamente; checkpoint confirmado no repositório; aguardando "
                f"continuação manual a partir de {snapshot.checkpoint_commit!r} (Issue #105 Fase F)."
            ),
            checkpoint_commit=snapshot.checkpoint_commit, branch=snapshot.branch,
        )
        return ResumeOutcome(
            decision=decisao, result=resultado, external_calls_made=True,
            notes=("worker receptor é human_session — preparado, nunca despachado automaticamente.",),
        )

    # Mesmo portão de segurança da Fase D (RunnerDispatchConfig.gate(),
    # inalterado), checado AQUI primeiro — antes de qualquer leitura git —
    # para que um portão fechado continue custando ZERO chamada externa,
    # mesma garantia que executar_tarefa já dá sozinha (checada de novo lá
    # dentro, em defesa de profundidade, nunca como única barreira).
    if config is None:
        raise ValueError("despachar_retomada para api_runner exige 'config'.")
    gate = config.gate()
    if not gate.open:
        resultado = RunnerResult(task_id=tarefa.task_id, status="BLOCKED", reason=gate.reason)
        return ResumeOutcome(
            decision=decisao, result=resultado, external_calls_made=False,
            notes=("portão fechado — zero chamada externa, mesma garantia de runner_dispatch.py.",),
        )

    ok_checkpoint, motivo_checkpoint = verificar_checkpoint_no_repo(
        repo_dir, remote_name, tarefa.branch, tarefa.checkpoint_commit,
    )
    if not ok_checkpoint:
        resultado = RunnerResult(task_id=tarefa.task_id, status="BLOCKED", reason=motivo_checkpoint)
        return ResumeOutcome(
            decision=decisao, result=resultado, external_calls_made=True,
            notes=("checkpoint/branch não confirmados no repositório — zero claim, zero patch, zero chamada paga.",),
        )

    if state_git_remote is None:
        raise ValueError("despachar_retomada para api_runner exige 'state_git_remote'.")

    gerar_patch_efetivo = gerar_patch
    if patch is None and gerar_patch is None:
        # F7-B: caminho REAL — reusa runner_generate.gerar_patch_via_claude,
        # nunca uma segunda implementação. Import local (aqui dentro do
        # closure, não no topo do módulo): runner_generate importa DESTE
        # módulo? Não — importa de runner_dispatch, já importado acima —
        # mas o mesmo cuidado de runner_dispatch.py::main() é seguido aqui
        # por consistência/segurança contra ciclo futuro.
        from .budget import MONTHLY_BUDGET_USD
        from .git_state import GitUsageLedger
        from .runner_dispatch import DEFAULT_RUNNER_USAGE_STATE_BRANCH

        ledger_global = GitUsageLedger(
            GitJsonStore(state_git_remote, branch=DEFAULT_RUNNER_USAGE_STATE_BRANCH)
        )

        def _gerar_patch_real() -> object:
            from . import runner_generate

            return runner_generate.gerar_patch_via_claude(
                tarefa, config=config, repo_dir=repo_dir,
                usage_ledger=ledger_global, budget_usd=MONTHLY_BUDGET_USD,
                transport=transport,
                # Achado G3 (Fase G): `tarefa.task_id` aqui é SEMPRE um id
                # de EXECUÇÃO (`--resume-<checkpoint>`), nunca o canário
                # exato — sem o canônico EXPLÍCITO, o próprio gerador
                # bloquearia uma retomada legitimamente autorizada. O
                # canônico vem do snapshot (que por sua vez o recebeu de
                # `TaskRecord.id`/`WorkerRecord.current_task`), nunca de
                # um sufixo removido do execution id.
                canonical_task_id=snapshot.canonical_task_id,
            )

        gerar_patch_efetivo = _gerar_patch_real

    outcome = executar_tarefa(
        tarefa, patch,
        config=config, repo_dir=repo_dir, state_git_remote=state_git_remote,
        validation_command_keys=validation_command_keys, worker_id=worker_receptor.worker_id,
        worker_registry=worker_registry, gerar_patch=gerar_patch_efetivo,
        # Achado F6-D: heartbeat BUSY precisa usar o id CANÔNICO, nunca o
        # execution_task_id derivado de `tarefa.task_id` — só assim
        # WorkerRecord.current_task continua comparável com
        # TaskRecord.id/ownership durante a execução, não só antes/depois.
        canonical_task_id=snapshot.canonical_task_id,
    )
    return ResumeOutcome(
        decision=decisao, result=outcome.result, dispatch_outcome=outcome,
        external_calls_made=True, notes=outcome.notes,
    )


# ---------------------------------------------------------------------------
# Hook determinístico e EVENT-DRIVEN — achado F4 da 2ª rodada de auditoria:
# fecha o laço "worker voltou disponível" -> retomada, reusando
# scheduler.reprocessar_retorno (Fase A) por inteiro.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RetornoWorkerOutcome:
    """Resultado de reagir a UM evento já validado ("este worker está
    AVAILABLE agora"). Exatamente uma das duas alternativas é preenchida:
    ``retomada`` (o scheduler decidiu que o worker ainda é dono da tarefa
    original) ou ``proxima_oferta`` (a tarefa original já foi
    concluída/assumida — a fila tem, ou não, uma próxima tarefa
    compatível). Nunca as duas ao mesmo tempo."""

    retomada: ResumeOutcome | None
    proxima_oferta: QueueDecision | None
    motivo: str

    def to_dict(self) -> dict:
        return {
            "retomada": self.retomada.to_dict() if self.retomada else None,
            "proxima_oferta": self.proxima_oferta.to_dict() if self.proxima_oferta else None,
            "motivo": self.motivo,
        }


def processar_retorno_de_worker(
    *,
    worker_que_volta: str,
    tarefa_original: TaskRecord | None,
    tarefas: list[TaskRecord],
    workers: list[WorkerRecord],
    snapshot_da_tarefa_original: InterruptedTaskSnapshot | None = None,
    repo_dir: str | None = None,
    remote_name: str = "origin",
    config: RunnerDispatchConfig | None = None,
    state_git_remote: str | None = None,
    validation_command_keys: tuple[str, ...] = (),
    worker_registry: OperationalWorkerRegistry | None = None,
    patch: StructuredPatch | None = None,
    gerar_patch: Callable[[], object] | None = None,
    allowed_files_override: tuple[str, ...] | None = None,
    transport: object | None = None,
) -> RetornoWorkerOutcome:
    """O hook determinístico e EVENT-DRIVEN pedido pela Fase F (achado
    F4): reage a UM evento já validado por quem chama (heartbeat/comando
    ``AVAILABLE`` — essa validação em si é Fase B, fora daqui) chamando
    ``scheduler.reprocessar_retorno`` (Fase A, reusado por inteiro, nunca
    reimplementado) e só então decide.

    ZERO POLLING: esta função nunca entra em loop por conta própria —
    quem detecta o evento chama isto UMA vez, de forma síncrona, em
    reação a ele. Não há nenhum ``while``/``sleep``/agendamento aqui.

    Duas saídas possíveis de ``reprocessar_retorno`` (que já reusa
    ``handoff.worker_retomando_deve_assumir`` internamente — não
    duplicado aqui):

    1. ``retoma_tarefa_id`` preenchido — o worker ainda é dono real da
       tarefa original. Só despacha de verdade se quem chamou também
       forneceu ``snapshot_da_tarefa_original`` (o contexto mínimo
       estruturado — Fase F nunca inventa instructions/allowed_files/
       policy_level a partir de um ``TaskRecord`` sozinho, que não
       carrega esses campos) E esse snapshot é da MESMA tarefa que o
       scheduler decidiu retomar — qualquer divergência é recusada,
       fail-closed, nunca uma tentativa de adivinhar. O
       ``worker_receptor`` usado é o PRÓPRIO registro do worker que
       voltou (buscado em ``workers`` por ``worker_que_volta``) — o
       evento é sobre ELE, nunca sobre outro worker; a Fase E decidir um
       handoff para um worker DIFERENTE é um evento diferente, fora
       deste hook (consome ``despachar_retomada`` diretamente).
    2. ``proxima_oferta`` preenchida — a tarefa original já foi
       concluída ou assumida por outro. Este módulo NUNCA despacha essa
       próxima oferta (não é uma retomada — é uma atribuição NOVA, fluxo
       normal de Runner Dispatch/handoff, fora do escopo da Fase F) — só
       devolve a decisão como dado para quem orquestra o Coordinator
       agir separadamente."""
    decisao_retorno = reprocessar_retorno(
        worker_que_volta=worker_que_volta, tarefa_original=tarefa_original, tarefas=tarefas, workers=workers,
    )

    if decisao_retorno.retoma_tarefa_id is None:
        return RetornoWorkerOutcome(
            retomada=None, proxima_oferta=decisao_retorno.proxima_oferta, motivo=decisao_retorno.motivo,
        )

    if snapshot_da_tarefa_original is None:
        return RetornoWorkerOutcome(
            retomada=None, proxima_oferta=None,
            motivo=(
                f"scheduler.reprocessar_retorno permitiu retomar {decisao_retorno.retoma_tarefa_id!r}, mas "
                "nenhum InterruptedTaskSnapshot foi fornecido — Fase F nunca fabrica instructions/"
                "allowed_files/policy_level a partir só de coordination/tasks.json; retomada automática "
                "recusada até o contexto mínimo estruturado existir."
            ),
        )

    # F5: os dois lados desta comparação são SEMPRE ids canônicos —
    # decisao_retorno.retoma_tarefa_id vem de TaskRecord.id (via
    # scheduler.reprocessar_retorno), nunca de um execution_task_id.
    if snapshot_da_tarefa_original.canonical_task_id != decisao_retorno.retoma_tarefa_id:
        return RetornoWorkerOutcome(
            retomada=None, proxima_oferta=None,
            motivo=(
                f"snapshot fornecido é de {snapshot_da_tarefa_original.canonical_task_id!r}, mas o "
                f"scheduler decidiu retomar {decisao_retorno.retoma_tarefa_id!r} — divergência, retomada "
                "recusada."
            ),
        )

    receptor = next((w for w in workers if w.worker_id == worker_que_volta), None)
    if receptor is None or repo_dir is None:
        return RetornoWorkerOutcome(
            retomada=None, proxima_oferta=None,
            motivo=(
                f"scheduler.reprocessar_retorno permitiu retomar, mas faltam o registro do worker "
                f"{worker_que_volta!r} em 'workers' ou 'repo_dir' para despachar — retomada automática "
                "recusada."
            ),
        )

    outcome = despachar_retomada(
        snapshot_da_tarefa_original,
        tarefa_estado=tarefa_original.estado if tarefa_original else "BLOCKED-LIMIT",
        tarefa_agente_atual=tarefa_original.agente if tarefa_original else None,
        worker_receptor=receptor,
        repo_dir=repo_dir, remote_name=remote_name, config=config, state_git_remote=state_git_remote,
        validation_command_keys=validation_command_keys, worker_registry=worker_registry,
        patch=patch, gerar_patch=gerar_patch, allowed_files_override=allowed_files_override,
        transport=transport,
    )
    return RetornoWorkerOutcome(retomada=outcome, proxima_oferta=None, motivo=decisao_retorno.motivo)
