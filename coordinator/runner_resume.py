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
   repositório e é ancestral do tip ATUAL da branch remota (nunca uma
   branch divergente/reescrita) — só leitura (``git fetch``/``cat-file
   -e``/``merge-base --is-ancestor``), NUNCA ``commit``/``push``/
   ``merge``/força (prova estrutural em
   ``test_no_forbidden_writes.py::test_runner_resume_never_writes_to_git``).
4. ``despachar_retomada`` — orquestração: ``human_session`` NUNCA é
   iniciada automaticamente (só prepara e devolve ``BLOCKED-LIMIT`` com o
   checkpoint, "aguardando continuação manual"); ``api_runner`` só
   prossegue depois do checkpoint confirmado no repositório, e delega
   TODA a execução real para ``runner_dispatch.executar_tarefa``
   (inalterado) — nunca reimplementando commit/push/patch/allowlist.

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

**PARALELISMO COM A FASE E (Claude 1, em paralelo):** este módulo NUNCA
importa nem edita ``coordinator/handoff.py`` além de consumir a função
pura já existente (``worker_retomando_deve_assumir``) — nenhuma extensão,
nenhuma antecipação do trabalho da Fase E. O ponto de integração
explícito para quando a Fase E mergear é o parâmetro ``worker_receptor``
de ``avaliar_retomada``/``despachar_retomada``: hoje só exercitado com "o
mesmo worker que voltou" (via ``scheduler.reprocessar_retorno``, já
mergeado); quando a Fase E decidir um handoff para um worker DIFERENTE,
ela só precisa chamar as MESMAS funções passando o worker escolhido — ver
seção "HOOKS DE INTEGRAÇÃO PENDENTES" no corpo do PR.

**O QUE ESTE MÓDULO DELIBERADAMENTE NÃO FAZ:** não decide handoff
(Fase E); não toca ``coordination/tasks.json``; não ativa nenhuma flag
nova (reusa ``RunnerDispatchConfig`` da Fase D, inalterada — continua
``REPASSO_RUNNER_ENABLED=false`` em produção); não executa nenhum
canário real; não muda ``scheduler.py``/``handoff.py``/
``runner_contract.py``/``heartbeat.py``/``runner_dispatch.py`` — todos
consumidos, nenhum editado.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from typing import Callable

from .classify import Priority
from .handoff import worker_retomando_deve_assumir
from .redact import redact
from .runner_contract import RunnerTask, RunnerResult
from .runner_dispatch import RunnerDispatchConfig, StructuredPatch, executar_tarefa
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
    nenhum."""

    task_id: str
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

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
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
        }


def snapshot_de_interrupcao(
    *,
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
    decisão de retomada."""
    if worker_anterior.current_task != tarefa_original.task_id:
        raise ValueError(
            f"worker {worker_anterior.worker_id!r} não está registrado como dono de "
            f"{tarefa_original.task_id!r} (current_task={worker_anterior.current_task!r} no Worker "
            "Registry) — snapshot recusado."
        )
    return InterruptedTaskSnapshot(
        task_id=tarefa_original.task_id,
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
    )


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
        f"Tarefa original: {snapshot.task_id}",
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
    if not snapshot.task_id or not snapshot.task_id.strip():
        return ResumeDecision("BLOCKED", "task_id vazio — retomada precisa de uma tarefa original identificável.")

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

    if worker_receptor.status != "AVAILABLE":
        return ResumeDecision(
            "WAIT",
            f"worker receptor {worker_receptor.worker_id!r} ainda não está AVAILABLE (status atual: "
            f"{worker_receptor.status!r}) — aguardando, nada bloqueado permanentemente.",
        )

    # Identidade DETERMINÍSTICA da retomada (task_id original + checkpoint):
    # a MESMA retomada, pedida de novo, produz o MESMO task_id — é isto
    # que faz o claim atômico já existente em runner_dispatch.
    # RunnerClaimStore (Fase D, GitJsonStore.claim_key) garantir
    # idempotência/concorrência sem nenhum mecanismo novo.
    task_id_retomada = f"{snapshot.task_id}--resume-{snapshot.checkpoint_commit[:12]}"
    instructions = formatar_instrucoes_retomada(snapshot)

    try:
        tarefa = RunnerTask(
            task_id=task_id_retomada,
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
            f"retomada permitida: {snapshot.task_id!r} (worker anterior {snapshot.worker_anterior!r}) -> "
            f"{worker_receptor.worker_id!r}, a partir do checkpoint {snapshot.checkpoint_commit!r} "
            f"(task_id de retomada: {task_id_retomada!r})."
        ),
        task=tarefa,
    )


# ---------------------------------------------------------------------------
# Verificação REAL do checkpoint — a única parte deste módulo com I/O, e
# SÓ DE LEITURA (fetch/cat-file/merge-base --is-ancestor). Nunca commit,
# nunca push, nunca merge, nunca força — prova estrutural em
# test_no_forbidden_writes.py::test_runner_resume_never_writes_to_git.
# ---------------------------------------------------------------------------

def _git(repo_dir: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", repo_dir, *args], capture_output=True, text=True)


def _commit_existe_localmente(repo_dir: str, commit: str) -> bool:
    r = _git(repo_dir, "cat-file", "-e", f"{commit}^{{commit}}")
    return r.returncode == 0


def verificar_checkpoint_no_repo(repo_dir: str, remote_name: str, branch: str, commit: str) -> tuple[bool, str]:
    """Confirma, com git de verdade (só leitura), que ``commit``:

    1. existe (busca ``branch`` do remoto primeiro, se ainda não estiver
       localmente — o commit pode ter sido publicado por outra execução);
    2. é ANCESTRAL do tip ATUAL de ``branch`` no remoto — nunca aceita um
       checkpoint de uma branch que foi reescrita/force-pushed por fora
       (Issue #105: 'branch divergente da main... deve BLOCKED, nunca
       tentar resolver sozinho'; aqui generalizado para qualquer branch
       de trabalho, não só main).

    Devolve ``(ok, motivo)`` — nunca levanta exceção por conta própria
    (falha de rede/git vira ``(False, motivo)``, fail-closed)."""
    if not _commit_existe_localmente(repo_dir, commit):
        busca = _git(repo_dir, "fetch", remote_name, branch)
        if busca.returncode != 0:
            return False, (
                f"não consegui buscar a branch {branch!r} de {remote_name!r} para confirmar o "
                f"checkpoint {commit!r}: {redact(busca.stderr)}"
            )
        if not _commit_existe_localmente(repo_dir, commit):
            return False, (
                f"checkpoint_commit {commit!r} não existe (nem localmente, nem após buscar {branch!r} "
                f"de {remote_name!r}) — retomada recusada, nunca inventar um checkpoint."
            )

    fetch = _git(repo_dir, "fetch", remote_name, branch)
    if fetch.returncode != 0:
        return False, (
            f"não consegui confirmar o tip atual de {branch!r} em {remote_name!r}: {redact(fetch.stderr)}"
        )
    ancestral = _git(repo_dir, "merge-base", "--is-ancestor", commit, "FETCH_HEAD")
    if ancestral.returncode != 0:
        return False, (
            f"checkpoint {commit!r} não é ancestral do tip ATUAL de {branch!r} — branch "
            "divergente/reescrita desde o checkpoint; retomada recusada, nunca tentar resolver "
            "sozinho (Issue #105)."
        )
    return True, f"checkpoint {commit!r} confirmado: existe e é ancestral do tip atual de {branch!r}."


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
) -> ResumeOutcome:
    """Avalia (puro) e, só se ``RESUME``, prossegue: ``human_session``
    nunca é despachada automaticamente (Issue #105: "não fingir que uma
    human_session pode ser iniciada automaticamente") — só prepara e
    devolve ``BLOCKED-LIMIT`` com o checkpoint, para retomada manual.
    ``api_runner`` só prossegue depois de ``verificar_checkpoint_no_repo``
    confirmar o checkpoint de verdade; a execução em si é 100% delegada a
    ``runner_dispatch.executar_tarefa`` (mesmo portão de segurança, mesmo
    claim atômico — nenhum código deste módulo decide gate/claim/patch
    sozinho)."""
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
        resultado_bloqueio = (
            RunnerResult(task_id=snapshot.task_id, status="BLOCKED", reason=decisao.reason)
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
        resultado = RunnerResult(
            task_id=tarefa.task_id, status="BLOCKED-LIMIT",
            reason=(
                f"tarefa preparada para retomada por sessão humana ({worker_receptor.worker_id!r}) — "
                "nunca iniciada automaticamente; aguardando continuação manual a partir do checkpoint "
                f"{snapshot.checkpoint_commit!r} (Issue #105 Fase F)."
            ),
            checkpoint_commit=snapshot.checkpoint_commit, branch=snapshot.branch,
        )
        return ResumeOutcome(
            decision=decisao, result=resultado, external_calls_made=False,
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

    outcome = executar_tarefa(
        tarefa, patch,
        config=config, repo_dir=repo_dir, state_git_remote=state_git_remote,
        validation_command_keys=validation_command_keys, worker_id=worker_receptor.worker_id,
        worker_registry=worker_registry, gerar_patch=gerar_patch,
    )
    return ResumeOutcome(
        decision=decisao, result=outcome.result, dispatch_outcome=outcome,
        external_calls_made=True, notes=outcome.notes,
    )
