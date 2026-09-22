"""Integração operacional do checkpoint REAL — Issue #105, Fase G
(``#105-G · integração operacional final para canário ponta a ponta``),
achados G1 e G2.

**O buraco que esta rodada fecha.** Até aqui, um evento REAL
``CHECKPOINT_BLOCKED_LIMIT`` (comentário de checkpoint numa Issue) só
produzia uma DECISÃO informativa: ``observe.py`` atualizava o Worker
Registry com ``set_status``/``set_task_progress`` e chamava
``handoff.decidir_handoff`` para imprimir "WAIT/HANDOFF" num cartão.
Ninguém chamava ``handoff_exec.executar_handoff`` (Fase E, já mergeada),
então o handoff REAL nunca acontecia; e mesmo quando ``executar_handoff``
derivava uma ``RunnerTask`` de continuação, ninguém a entregava ao
``runner_dispatch.executar_tarefa`` (Fase D), então a continuação nunca
começava. Este módulo é EXATAMENTE essa costura — e nada além dela.

**O que este módulo NÃO faz (de propósito):** não decide WAIT/HANDOFF/
POOL_PAUSED (isso é ``handoff.py``/``scheduler.py``), não implementa
handoff (``handoff_exec.py``), não implementa heartbeat
(``heartbeat.py``/``runner_contract.RunnerHeartbeat``), não implementa
execução/claim/orçamento (``runner_dispatch.py``/``runner_generate.py``),
não verifica checkpoint por conta própria (``runner_resume.
verificar_checkpoint_no_repo``, a verificação que já existe e é só de
leitura) e não escreve em ``coordination/tasks.json`` (que continua
declarativo). Cada peça A-F é CONSUMIDA aqui, nunca reimplementada.

**Fluxo (achado G1 — checkpoint real executa a Fase E):**

1. portão do Runner ABERTO e tarefa canônica EXATAMENTE igual a
   ``REPASSO_RUNNER_CANARY_TASK_ID`` — senão ``SKIPPED``, zero escrita,
   zero chamada externa (quem chama continua com a decisão informativa de
   sempre);
2. ``RunnerHeartbeat`` REAL com ``status="LIMIT"``, ``task_id`` CANÔNICO,
   branch, commit e ``last_checkpoint`` — aplicado por
   ``heartbeat.aplicar_heartbeat`` (nunca ``set_status`` +
   ``set_task_progress``, que nem preenchem ``last_checkpoint``). Worker
   desconhecido continua REJEITADO pelo próprio ``aplicar_heartbeat`` —
   esta rodada não abre nenhuma exceção a isso (o cadastro dos dois
   ``api_runner`` do canário é ``canary_bootstrap.py``, atrás dos mesmos
   portões);
3. ``last_checkpoint`` só é preenchido depois que o commit foi
   VERIFICADO no repositório real (``verificar_checkpoint_no_repo``) —
   um commit que não existe/não é o tip da branch nunca vira checkpoint
   seguro, e o próprio ``aplicar_heartbeat`` já avisa "LIMIT sem
   checkpoint SEGURO";
4. ``handoff_exec.executar_handoff`` com o Worker Registry real, o
   ``HandoffClaimStore`` real (branch de estado dedicada) e a MESMA
   verificação de checkpoint;
5. achado G2: quando o resultado é ``HANDOFF_EXECUTED`` para um
   ``api_runner`` com ``runner_task`` derivada, a continuação é
   ENTREGUE a ``runner_dispatch.executar_tarefa`` — mesma
   ``RunnerDispatchConfig``, mesmo Worker Registry, mesmo ledger
   Anthropic GLOBAL, mesmo teto mensal, claim ANTES de qualquer chamada
   paga (garantia da própria ``executar_tarefa``), ``worker_id`` do
   receptor, ``canonical_task_id`` da tarefa original e branch/
   checkpoint/allowed_files preservados pela própria Fase E.

``human_session`` NUNCA é iniciada automaticamente (continua só
reservada, com instrução completa). ``WAIT``/``BLOCKED``/``POOL_PAUSED``
= zero chamada paga: nada além do heartbeat e da leitura do checkpoint
acontece.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Callable

from .handoff_exec import (
    DEFAULT_HANDOFF_STATE_BRANCH,
    HandoffClaimStore,
    HandoffExecutionResult,
    HandoffSource,
    checkpoint_e_seguro,
    executar_handoff,
    gerar_instrucao_continuacao,
)
from .heartbeat import HeartbeatApplyResult, aplicar_heartbeat
from .git_state import GitJsonStore
from .runner_contract import RunnerHeartbeat, RunnerTask
from .runner_dispatch import (
    CANARY_VALIDATION_COMMAND_KEYS,
    DEFAULT_RUNNER_USAGE_STATE_BRANCH,
    DispatchOutcome,
    RunnerDispatchConfig,
    StructuredPatch,
    carregar_runner_task_de_arquivo,
    executar_tarefa,
)
from .runner_resume import verificar_checkpoint_no_repo
from .scheduler import TaskRecord, load_tasks_from_tasks_json
from .task_ownership import visao_operacional_da_tarefa
from .worker_ops import OperationalWorkerRegistry

# Diretório (relativo ao checkout confiável) das RunnerTask materializadas
# — a MESMA convenção que o workflow do Runner já usa para montar
# ``--task-file`` (achado G6).
RUNNER_TASKS_DIR = os.path.join("coordinator", "runner_tasks")

# Mesma allowlist de formato do workflow (camada 4 de
# .github/workflows/coordinator-runner.yml): um id fora deste formato nem
# chega a virar caminho de arquivo. Defesa em profundidade — o id que
# chega aqui vem do corpo de um comentário, então é dado EXTERNO até
# provar o contrário (e a prova é a comparação estrita contra
# ``REPASSO_RUNNER_CANARY_TASK_ID``, logo abaixo).
_TASK_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")

VerificadorDeCheckpoint = Callable[[str, str], bool]


def caminho_da_runner_task(repo_dir: str, canonical_task_id: str) -> str | None:
    """Caminho da RunnerTask materializada, ou ``None`` quando o id não
    passa na allowlist de formato — nenhum caminho é construído a partir
    de um id fora do formato."""
    alvo = (canonical_task_id or "").strip()
    if not _TASK_ID_RE.match(alvo):
        return None
    return os.path.join(repo_dir, RUNNER_TASKS_DIR, f"{alvo}.task.json")


def instrucao_de_continuacao(
    tarefa: TaskRecord, *, runner_task_original: RunnerTask, checkpoint_commit: str,
    worker_anterior_nome: str,
) -> str:
    """Achado G6: a continuação precisa carregar a instrução ORIGINAL da
    tarefa (é ela que diz QUAL transição determinística o novo
    ``api_runner`` deve executar), mais o contexto de transferência já
    padronizado pela Fase E (``handoff_exec.gerar_instrucao_continuacao``,
    reusada por inteiro — nunca um segundo texto concorrente). Mesma
    forma de ``runner_resume.formatar_instrucoes_retomada``: instrução
    original primeiro, contexto depois, e o contexto NUNCA concede
    permissão nenhuma (allowed_files/policy_level/risk_level continuam
    campos tipados da RunnerTask)."""
    contexto = gerar_instrucao_continuacao(
        tarefa, checkpoint_commit=checkpoint_commit, worker_anterior_nome=worker_anterior_nome,
    )
    return "\n".join([
        runner_task_original.instructions.strip(),
        "",
        "--- CONTEXTO DE CONTINUAÇÃO (Issue #105 Fase E/G) ---",
        contexto,
    ])


@dataclass(frozen=True)
class CheckpointIntegrationOutcome:
    """O que de fato aconteceu com UM evento de checkpoint BLOCKED-LIMIT.

    ``action``:

    - ``SKIPPED``: o caminho operacional não está ativado (portão fechado
      ou tarefa fora do canário autorizado) — NADA foi escrito; quem
      chama segue com a decisão informativa de sempre;
    - ``BLOCKED``: o caminho estava ativado mas alguma pré-condição real
      falhou (worker desconhecido, tarefa/RunnerTask ausente, checkpoint
      não confirmado, ownership divergente) — fail-closed;
    - ``HEARTBEAT_APPLIED``: heartbeat REAL aplicado, e a decisão de
      handoff foi ``WAIT``/``POOL_PAUSED`` (nada executado, zero chamada
      paga);
    - ``HANDOFF_EXECUTED``: handoff real executado, sem despacho
      automático (receptor ``human_session`` — nunca iniciada sozinha);
    - ``DISPATCHED``: handoff real executado E a continuação entregue ao
      Runner Dispatch (achado G2).
    """

    action: str
    reason: str
    heartbeat: HeartbeatApplyResult | None = None
    handoff: HandoffExecutionResult | None = None
    dispatch: DispatchOutcome | None = None

    @property
    def checkpoint_confirmado(self) -> str | None:
        return self.heartbeat.record.last_checkpoint if (self.heartbeat and self.heartbeat.record) else None

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "reason": self.reason,
            "heartbeat": self.heartbeat.to_dict() if self.heartbeat else None,
            "handoff": self.handoff.to_dict() if self.handoff else None,
            "dispatch": self.dispatch.to_dict() if self.dispatch else None,
        }


def _verificador_padrao(repo_dir: str, remote_name: str) -> VerificadorDeCheckpoint:
    """Reusa a verificação de checkpoint que JÁ existe (``runner_resume.
    verificar_checkpoint_no_repo`` — só leitura: busca a branch, resolve o
    SHA e compara com o tip remoto atual). Nunca um verificador novo."""
    def verificar(commit: str, branch: str) -> bool:
        ok, _motivo = verificar_checkpoint_no_repo(repo_dir, remote_name, branch, commit)
        return ok

    return verificar


def despachar_continuacao_de_handoff(
    resultado: HandoffExecutionResult,
    *,
    config: RunnerDispatchConfig,
    repo_dir: str,
    state_git_remote: str,
    worker_registry: OperationalWorkerRegistry,
    canonical_task_id: str,
    # Achado G8-B: default NÃO vazio. A continuação automática roda a
    # MESMA allowlist de validação da execução inicial do canário. Só
    # chaves da allowlist fechada de ``runner_dispatch``, nunca comando
    # livre; quem chama pode estreitar, e é isso que os testes fazem.
    validation_command_keys: tuple[str, ...] = CANARY_VALIDATION_COMMAND_KEYS,
    patch: StructuredPatch | None = None,
    gerar_patch: Callable[[], object] | None = None,
    transport: object | None = None,
    budget_usd: float | None = None,
) -> DispatchOutcome | None:
    """Achado G2: entrega ao Runner Dispatch a ``RunnerTask`` de
    continuação que a Fase E já derivou — e SÓ ela.

    Devolve ``None`` (zero chamada paga, zero escrita) quando não há nada
    legítimo a despachar: a decisão não foi ``HANDOFF_EXECUTED``
    (``WAIT``/``BLOCKED``/``POOL_PAUSED``), o receptor não é
    ``api_runner`` (``human_session`` NUNCA é iniciada automaticamente),
    ou a Fase E não derivou ``runner_task``.

    Tudo o que vai para ``executar_tarefa`` é o MESMO objeto já em uso
    pelo caminho operacional — mesma ``RunnerDispatchConfig`` (mesmos
    portões), mesmo Worker Registry (mesmos heartbeats reais), mesmo
    ledger Anthropic GLOBAL (``coordinator-state-usage``, nunca um
    segundo orçamento), mesmo teto mensal. O claim atômico do
    ``task_id`` de EXECUÇÃO acontece DENTRO de ``executar_tarefa``, antes
    de ``gerar_patch()`` — "claim antes de qualquer chamada paga" é
    herdado, nunca reimplementado aqui."""
    if resultado.action != "HANDOFF_EXECUTED":
        return None
    if resultado.new_worker_type != "api_runner":
        return None
    if resultado.runner_task is None or resultado.new_worker_id is None:
        return None

    gerar_patch_efetivo = gerar_patch
    if patch is None and gerar_patch is None:
        # Caminho REAL: reusa runner_generate.gerar_patch_via_claude com o
        # MESMO ledger global/teto — mesma construção de
        # runner_resume.despachar_retomada (achado F7-B), nunca uma
        # segunda implementação. Import local (dentro do closure) para
        # nunca criar ciclo de import.
        from .budget import MONTHLY_BUDGET_USD
        from .git_state import GitUsageLedger

        ledger_global = GitUsageLedger(
            GitJsonStore(state_git_remote, branch=DEFAULT_RUNNER_USAGE_STATE_BRANCH)
        )
        teto = MONTHLY_BUDGET_USD if budget_usd is None else budget_usd
        tarefa_para_gerar = resultado.runner_task

        def _gerar_patch_real() -> object:
            from . import runner_generate

            return runner_generate.gerar_patch_via_claude(
                tarefa_para_gerar, config=config, repo_dir=repo_dir,
                usage_ledger=ledger_global, budget_usd=teto, transport=transport,
                # Achado G3: o gerador também precisa do canônico
                # EXPLÍCITO — o task_id da continuação é um id de
                # EXECUÇÃO derivado, nunca o canário exato.
                canonical_task_id=canonical_task_id,
            )

        gerar_patch_efetivo = _gerar_patch_real

    return executar_tarefa(
        resultado.runner_task, patch,
        config=config,
        repo_dir=repo_dir,
        state_git_remote=state_git_remote,
        validation_command_keys=validation_command_keys,
        worker_id=resultado.new_worker_id,
        worker_registry=worker_registry,
        gerar_patch=gerar_patch_efetivo,
        canonical_task_id=canonical_task_id,
    )


def processar_checkpoint_de_limite(
    *,
    registry: OperationalWorkerRegistry,
    agente: str,
    canonical_task_id: str,
    branch: str | None,
    commit: str | None,
    config: RunnerDispatchConfig,
    repo_dir: str,
    tasks_json_path: str,
    state_git_remote: str,
    remote_name: str = "origin",
    progresso_percent: int | None = None,
    progresso: str | None = None,
    # Achado G8-B: ver ``despachar_continuacao_de_handoff``.
    validation_command_keys: tuple[str, ...] = CANARY_VALIDATION_COMMAND_KEYS,
    patch: StructuredPatch | None = None,
    gerar_patch: Callable[[], object] | None = None,
    transport: object | None = None,
    verificar_checkpoint: VerificadorDeCheckpoint | None = None,
    despachar: bool = True,
) -> CheckpointIntegrationOutcome:
    """A costura completa (achados G1 + G2). Fail-closed em cada passo: a
    primeira condição que falha decide o resultado."""
    alvo = (canonical_task_id or "").strip()

    # Camada 1: portão do Runner. Fechado -> zero escrita, zero leitura
    # remota. Quem chama continua com a decisão informativa de sempre.
    gate = config.gate()
    if not gate.open:
        return CheckpointIntegrationOutcome(
            "SKIPPED",
            f"portão do Runner fechado — caminho operacional não ativado, nada executado: {gate.reason}",
        )

    # Camada 2: só a tarefa CANÔNICA autorizada ativa este caminho.
    # Comparação estrita (nunca prefixo) e allowlist de formato antes de
    # qualquer caminho de arquivo ser construído.
    if not _TASK_ID_RE.match(alvo) or not config.task_autorizada(alvo):
        return CheckpointIntegrationOutcome(
            "SKIPPED",
            f"tarefa {alvo!r} não é o canário autorizado ({config.canary_task_id!r}) — "
            "caminho operacional não ativado; nenhuma escrita, nenhuma execução.",
        )

    if not agente or not agente.strip():
        return CheckpointIntegrationOutcome(
            "BLOCKED", "checkpoint sem AGENTE — impossível saber de quem é o limite; nada foi alterado."
        )

    # Camada 3: o commit precisa existir DE VERDADE (e ser o tip da
    # branch) antes de virar checkpoint seguro — só depois disso o
    # heartbeat publica `last_checkpoint`. Formato primeiro (barato),
    # verificação real depois.
    verificar = verificar_checkpoint or _verificador_padrao(repo_dir, remote_name)
    commit_formatado = commit.strip() if isinstance(commit, str) and checkpoint_e_seguro(commit) else None
    checkpoint_confirmado: str | None = None
    if commit_formatado and branch:
        if verificar(commit_formatado, branch):
            checkpoint_confirmado = commit_formatado

    registro_atual = registry.find_by_name_or_id(agente)
    worker_id = registro_atual.worker_id if registro_atual else "-".join(agente.strip().lower().split())

    heartbeat = RunnerHeartbeat(
        worker_id=worker_id,
        status="LIMIT",
        task_id=alvo,
        branch=branch or None,
        commit=commit_formatado,
        last_checkpoint=checkpoint_confirmado,
        progress_percent=progresso_percent,
        remaining_work_estimate=progresso,
    )
    resultado_hb = aplicar_heartbeat(registry, heartbeat)
    if resultado_hb.action != "APPLIED":
        # Worker desconhecido (ou qualquer outra recusa do próprio
        # heartbeat): nada mais acontece. A regra "heartbeat nunca
        # autocadastra worker" continua intacta.
        return CheckpointIntegrationOutcome(
            "BLOCKED",
            f"heartbeat não aplicado — nenhum handoff foi tentado: {resultado_hb.reason}",
            heartbeat=resultado_hb,
        )

    if checkpoint_confirmado is None:
        return CheckpointIntegrationOutcome(
            "HEARTBEAT_APPLIED",
            (
                f"LIMIT registrado para {worker_id!r}, mas o commit {commit!r} não foi confirmado como "
                f"checkpoint seguro na branch {branch!r} (formato inválido, commit inexistente ou branch "
                "já avançada) — handoff não tentado, fail-closed."
            ),
            heartbeat=resultado_hb,
        )

    # Camada 4: a tarefa canônica (declarativa) e a RunnerTask
    # materializada (contrato) — as duas precisam existir de verdade.
    try:
        tarefas = load_tasks_from_tasks_json(tasks_json_path)
    except (OSError, ValueError) as exc:
        return CheckpointIntegrationOutcome(
            "BLOCKED", f"não consegui ler as tarefas declaradas: {exc}", heartbeat=resultado_hb,
        )
    tarefa = next((t for t in tarefas if t.id == alvo), None)
    if tarefa is None:
        return CheckpointIntegrationOutcome(
            "BLOCKED",
            f"tarefa {alvo!r} não existe em {os.path.basename(tasks_json_path)!r} — handoff recusado.",
            heartbeat=resultado_hb,
        )

    caminho = caminho_da_runner_task(repo_dir, alvo)
    if caminho is None or not os.path.exists(caminho):
        return CheckpointIntegrationOutcome(
            "BLOCKED",
            f"RunnerTask materializada de {alvo!r} não encontrada — a continuação nunca é inventada a "
            "partir de texto livre; sem o contrato original não há branch/allowed_files/política "
            "confiáveis para preservar.",
            heartbeat=resultado_hb,
        )
    try:
        runner_task_original = carregar_runner_task_de_arquivo(caminho)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        return CheckpointIntegrationOutcome(
            "BLOCKED", f"RunnerTask materializada inválida: {exc}", heartbeat=resultado_hb,
        )

    # Estado FRESCO do registro (já com o heartbeat aplicado — é ele que
    # deixou `last_checkpoint` preenchido, pré-condição do compare-and-set
    # do handoff).
    workers = registry.list_workers()
    worker_anterior = next((w for w in workers if w.worker_id == worker_id), None)
    if worker_anterior is None:  # defensivo: o heartbeat acabou de gravá-lo
        return CheckpointIntegrationOutcome(
            "BLOCKED", f"worker {worker_id!r} sumiu do registro depois do heartbeat.", heartbeat=resultado_hb,
        )

    # Achado G8-A (auditoria do PR #118): o dono da tarefa para a DECISÃO
    # de handoff vem do Worker Registry (ownership vivo, protegido por
    # CAS e por heartbeat validado), nunca do `agente` declarativo de
    # coordination/tasks.json — que é read-only durante a execução e, num
    # multi-handoff, ficaria uma transferência atrás. A visão preserva
    # id/área/arquivos/dependências/prioridade do declarativo e só troca
    # `agente`/`estado`; se a tarefa já saiu da janela executável, ou se
    # dois workers a ocupam, ela devolve o declarativo intacto
    # (fail-closed). Nada é escrito em tasks.json aqui nem em lugar
    # nenhum.
    visao = visao_operacional_da_tarefa(tarefa, workers=workers)

    claim_store = HandoffClaimStore(
        GitJsonStore(state_git_remote, branch=DEFAULT_HANDOFF_STATE_BRANCH)
    )
    resultado_handoff = executar_handoff(
        visao.tarefa,
        worker_anterior=worker_anterior,
        workers=workers,
        registry=registry,
        claim_store=claim_store,
        source=HandoffSource.from_runner_task(runner_task_original),
        checkpoint_commit=checkpoint_confirmado,
        verificar_checkpoint=verificar,
        instructions=instrucao_de_continuacao(
            tarefa, runner_task_original=runner_task_original,
            checkpoint_commit=checkpoint_confirmado,
            worker_anterior_nome=worker_anterior.display_name,
        ),
    )

    if resultado_handoff.action != "HANDOFF_EXECUTED":
        return CheckpointIntegrationOutcome(
            "HEARTBEAT_APPLIED",
            (
                f"heartbeat LIMIT aplicado; handoff decidiu {resultado_handoff.action}: "
                f"{resultado_handoff.reason} (ownership: {visao.reason})"
            ),
            heartbeat=resultado_hb, handoff=resultado_handoff,
        )

    if not despachar:
        return CheckpointIntegrationOutcome(
            "HANDOFF_EXECUTED",
            f"handoff executado para {resultado_handoff.new_worker_id!r}; despacho desligado por quem chamou.",
            heartbeat=resultado_hb, handoff=resultado_handoff,
        )

    outcome_dispatch = despachar_continuacao_de_handoff(
        resultado_handoff,
        config=config, repo_dir=repo_dir, state_git_remote=state_git_remote,
        worker_registry=registry, canonical_task_id=alvo,
        validation_command_keys=validation_command_keys,
        patch=patch, gerar_patch=gerar_patch, transport=transport,
    )
    if outcome_dispatch is None:
        return CheckpointIntegrationOutcome(
            "HANDOFF_EXECUTED",
            (
                f"handoff executado: {resultado_handoff.previous_worker_id!r} -> "
                f"{resultado_handoff.new_worker_id!r} ({resultado_handoff.new_worker_type}). "
                "Nenhum despacho automático — sessão humana nunca é iniciada sozinha."
            ),
            heartbeat=resultado_hb, handoff=resultado_handoff,
        )

    status = outcome_dispatch.result.status if outcome_dispatch.result else "sem resultado"
    return CheckpointIntegrationOutcome(
        "DISPATCHED",
        (
            f"handoff executado: {resultado_handoff.previous_worker_id!r} -> "
            f"{resultado_handoff.new_worker_id!r}; continuação despachada ao Runner Dispatch "
            f"(status: {status})."
        ),
        heartbeat=resultado_hb, handoff=resultado_handoff, dispatch=outcome_dispatch,
    )
