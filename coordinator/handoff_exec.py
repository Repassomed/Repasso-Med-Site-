"""Handoff REAL — Issue #105, Fase E (``#105-E · Handoff real``).

Decisão operacional de José (Issue #105, plano de PRs pequenos): #105-A
(``scheduler.py``), #105-B (``heartbeat.py``), #105-C (``runner_contract.py``)
e #105-D (``runner_dispatch.py``) já estão mergeados na ``main``. Esta
rodada conecta a DECISÃO já pronta (``handoff.decidir_handoff``/
``scheduler.avaliar_handoff_de_tarefa``) a um fluxo OPERACIONAL seguro —
sem reimplementar nenhuma das quatro peças anteriores.

Fluxo desejado (Issue #105, comentário da tarefa desta rodada)::

    worker atual -> heartbeat/checkpoint -> LIMIT/NEAR_LIMIT
    -> Coordinator avalia WAIT vs HANDOFF (scheduler.avaliar_handoff_de_tarefa)
    -> se HANDOFF:
         - preservar commit/checkpoint;
         - liberar/atualizar corretamente o worker anterior;
         - selecionar worker compatível e disponível (já decidido);
         - criar/derivar uma RunnerTask segura para continuação
           (api_runner) ou publicar uma instrução completa
           (human_session — NUNCA iniciada automaticamente);
         - preservar branch, allowed_files, contexto mínimo e
           rastreabilidade;
         - impedir dois workers executando a mesma continuação;
         - o novo worker continua do checkpoint correto.

**O QUE ESTE MÓDULO NÃO FAZ (deliberadamente fora de escopo):**

- não decide WAIT/HANDOFF/POOL_PAUSED — isso é ``handoff.py``/
  ``scheduler.py`` (Fase A/#99), consumidos aqui sem duplicação;
- não despacha nem executa nenhum ``api_runner`` de verdade — só deriva
  uma ``RunnerTask`` (``runner_contract.py``, Fase C) pronta para ser
  entregue, mais adiante, ao mecanismo já existente
  (``runner_dispatch.executar_tarefa``, Fase D), que continua atrás dos
  MESMOS portões (``REPASSO_RUNNER_ENABLED``/``MODE``/``CANARY_TASK_ID``/
  ref) — nenhum deles é reimplementado, contornado ou enfraquecido aqui;
- não inicia uma sessão humana — ``human_session`` só recebe uma
  instrução TEXTUAL pronta (``human_instruction``), nunca um estado que
  finja que o trabalho já começou (requisito explícito desta rodada);
- não escreve em ``coordination/tasks.json`` (continua declarativo/
  auditável na ``main``, mesma regra de ``scheduler.py``);
- não faz merge, deploy, publicação, força-push, nem chamada real a
  Anthropic/OpenAI — nenhuma linha deste módulo inicia processo externo
  algum nem importa ``anthropic_client``, ``openai_*`` nem qualquer
  cliente de rede; toda E/S deste módulo passa por
  ``git_state.GitJsonStore`` (mesma peça já usada por dedup/orçamento/
  claim do Runner), nunca uma implementação paralela de compare-and-swap.

**Segurança (dado externo tratado como não confiável):** ``TaskRecord``
(lido de ``coordination/tasks.json`` por ``scheduler.py``),
``WorkerRecord`` (heartbeat) e qualquer texto de issue/comentário nunca
podem alterar política, ampliar ``allowed_files``, ligar merge/deploy,
modificar orçamento ou pular os portões do Runner — por isso
``HandoffSource`` (abaixo) é a ÚNICA fonte dos campos sensíveis
(``branch``/``allowed_files``/``capabilities_required``/``risk_level``/
``policy_level``/``jose_authorized``/``source_issue``/
``publication_required``) da continuação, e ``executar_handoff`` SEMPRE
sobrescreve qualquer ``policy_level``/``jose_authorized``/``risk_level``
que um ``HandoffContext`` externo tente declarar com os valores de
``HandoffSource`` — nunca o contrário. Isto fecha a única forma pela qual
um ``contexto`` de chamada poderia, por engano ou por dado manipulado,
aprovar um handoff com uma política mais permissiva do que a tarefa
original de fato tinha ("worker receptor não pode ganhar permissões
maiores que a tarefa original").

---

**Correções da 1ª auditoria independente do PR #115 (H1-H3) — só isto,
scheduler/heartbeat/runner_contract/runner_dispatch/runner_generate
continuam intocados:**

- **H1 (checkpoint "seguro" só validava FORMATO, não existência real):**
  ``checkpoint_e_seguro()`` (mantida, inalterada) só prova que a string É
  um SHA sintático — nunca que o commit existe de verdade ou pertence à
  branch esperada. ``executar_handoff`` ganhou um parâmetro OBRIGATÓRIO
  ``verificar_checkpoint: Callable[[str, str], bool]`` (recebe
  ``checkpoint_commit``/``branch``, devolve se o commit existe E é
  alcançável naquela branch) — chamado só quando o formato já é válido
  (nunca perde tempo verificando um valor simbólico). Sem parâmetro
  default nenhum: cada chamador precisa decidir explicitamente como
  verificar (em produção, contra o checkout real; em teste, um
  verificador falso) — nunca um "sempre confia no formato" implícito.
  Deliberadamente este módulo não implementa a verificação real em si
  (nenhum ``git``/processo externo aqui, mesma razão de nunca importar
  ``runner_dispatch`` — ver seção acima): a implementação real é uma
  peça de integração de quem for de fato invocar o handoff em produção.
- **H2 (duas tarefas DIFERENTES podiam reservar o mesmo worker novo):**
  o claim antigo protegia só a MESMA tarefa contra si mesma —
  ``registry.upsert_many()`` (removido) escrevia o par
  anterior/novo incondicionalmente, então tarefa A e tarefa B, cada uma
  com sua própria chave de claim, podiam as DUAS vencer e as DUAS
  atribuir o mesmo worker novo, com a última escrita ganhando em
  silêncio. Agora ``OperationalWorkerRegistry.transferir_worker_
  condicional`` (novo, em ``worker_ops.py``) faz um compare-and-set real:
  só escreve quando, numa leitura FRESCA (repetida em cada tentativa de
  conflito), o worker anterior AINDA tem a tarefa esperada como
  ``current_task`` e o worker novo AINDA está ``AVAILABLE``/
  ``can_execute``/sem ``current_task``. Se qualquer uma mudou (por
  exemplo, outra tarefa já reservou o mesmo worker novo), nada é
  escrito e ``executar_handoff`` devolve ``BLOCKED`` — nunca sobrescreve
  uma reserva mais nova.
- **H3 (claim eterno por ``tarefa.id`` impedia uma SEGUNDA transferência
  legítima da mesma tarefa, e colidia com o claim permanente do próprio
  Runner Dispatch):** o claim de idempotência agora é por TRANSIÇÃO —
  ``f"{tarefa.id}:{worker_anterior.worker_id}:{checkpoint_commit}"` —
  nunca só por ``tarefa.id``. Repetir EXATAMENTE a mesma transição (mesmo
  dono anterior, mesmo checkpoint) continua idempotente/bloqueada; um
  checkpoint novo OU um dono anterior diferente (ex.: Claude 2, que
  recebeu a tarefa de Claude 1, chega ao próprio limite depois) produz
  uma chave diferente e libera um handoff seguinte legítimo. Além disso,
  a ``RunnerTask`` de continuação para ``api_runner`` deixou de reusar
  ``tarefa.id`` como o próprio ``RunnerTask.task_id`` — usa
  ``derivar_task_id_de_continuacao(tarefa.id, checkpoint_commit)``, um
  identificador DISTINTO por geração/checkpoint. Isto é necessário porque
  ``runner_dispatch.RunnerClaimStore`` faz o SEU PRÓPRIO claim permanente
  por ``task_id`` (nunca reaproveitável, nem depois de ``FAILED`` —
  documentado no próprio ``runner_dispatch.py``: "retomar exige uma
  RunnerTask NOVA, com outro task_id"); preservar o mesmo ``task_id``
  faria uma tarefa já executada uma vez pelo Runner Dispatch (mesmo que
  interrompida) rejeitar a continuação como "já reivindicada", mesmo
  sendo uma transferência legítima e nova.
- **Observação sobre ``human_session`` (mesma auditoria):** ao corrigir
  H2/H3, a sessão humana receptora não pode ficar "livre" para receber
  OUTRA oferta do scheduler enquanto uma transferência já foi preparada
  para ela — mas também não pode ser marcada ``BUSY`` (isso fingiria que
  ela já começou). A reserva agora é representada só por
  ``current_task = tarefa.id`` (o mesmo campo que já exclui um worker de
  ``scheduler._candidatos_disponiveis``), com ``status`` inalterado
  (continua ``AVAILABLE``, nunca ``BUSY``) — verdadeiro nos dois eixos:
  "reservada" (não pode receber outra oferta) e "ainda não iniciada"
  (ninguém fingiu que o trabalho começou). Um heartbeat real, quando a
  sessão humana de fato começar, é quem marca ``BUSY`` de verdade (fora
  deste módulo, via ``heartbeat.aplicar_heartbeat``, já existente).

---

**Correções da 2ª auditoria independente do PR #115 (H4-H5) — só isto,
scheduler/heartbeat/runner_contract/runner_dispatch/runner_generate
continuam intocados; H1/H2/H3 (acima) continuam válidos e inalterados:**

- **H4 (compare-and-set confirmava dono/disponibilidade, mas não o
  CHECKPOINT fresco):** ``transferir_worker_condicional`` só checava
  ``current_task``/``AVAILABLE``/``can_execute`` — um heartbeat NOVO do
  próprio worker anterior (publicando um checkpoint B mais recente, ainda
  com o mesmo ``current_task``) podia chegar ENTRE a decisão (snapshot em
  checkpoint A) e o CAS, sem ser detectado; a transição baseada em A ainda
  passava e sobrescrevia o checkpoint B mais novo com dados construídos a
  partir do snapshot velho. Corrigido em ``worker_ops.
  transferir_worker_condicional`` (ver correções lá): agora também exige,
  na leitura FRESCA, que ``last_checkpoint`` (e, quando conhecida,
  ``branch``) do worker anterior continuem EXATAMENTE os do snapshot que
  gerou a decisão — qualquer heartbeat mais novo com checkpoint/branch
  diferente bloqueia a transição (``BLOCKED``), sem tocar no registro.
  Além disso, os registros atualizados passaram a ser construídos a
  partir dos DICTS FRESCOS lidos dentro do próprio CAS (``anterior_patch``/
  ``novo_patch``, só os campos que de fato mudam) — nunca a partir de um
  ``WorkerRecord`` (``worker_anterior``/``novo_worker``) capturado antes
  do CAS, que poderia já estar desatualizado.
- **H5 (o claim da transição podia queimar permanentemente ANTES de
  saber se o receptor de fato venceu o CAS, e a chave não incluía o
  receptor):** o fluxo antigo reivindicava ``tarefa + dono anterior +
  checkpoint`` e só DEPOIS tentava o CAS do receptor — se o receptor
  escolhido (ex.: ``runner-1``) deixasse de estar disponível bem nesse
  intervalo (ocupado por outra tarefa), o CAS falhava mas o claim da
  transição já estava consumido para sempre, e como a chave não
  identificava QUAL receptor foi tentado, a MESMA tarefa/checkpoint nunca
  mais podia ser oferecida a um segundo receptor disponível (``runner-2``)
  — uma perda de corrida normal virava um bloqueio permanente
  desnecessário. Corrigido: a chave de idempotência (``chave_transicao``,
  em ``executar_handoff``) agora inclui também o RECEPTOR — ``f"{tarefa.id}
  :{worker_anterior.worker_id}:{checkpoint_commit}:{novo_worker.worker_id}"``.
  Repetir EXATAMENTE a mesma tentativa (mesmo receptor) continua
  idempotente/bloqueada; uma nova avaliação que escolhe um receptor
  DIFERENTE usa uma chave diferente e nunca é bloqueada pela tentativa
  anterior perdida — o CAS fresco do worker anterior (H2/H4) continua
  sendo a única coisa que impede duas transferências DIFERENTES de
  vencerem ao mesmo tempo.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from typing import Callable

from .classify import Priority
from .git_state import GitJsonStore
from .handoff import decidir_pool
from .runner_contract import RunnerTask
from .scheduler import HandoffContext, TaskRecord, avaliar_handoff_de_tarefa
from .worker_ops import OperationalWorkerRegistry, WorkerRecord

DEFAULT_HANDOFF_STATE_BRANCH = "coordinator-state-handoff"

# Mesma faixa de SHA git que runner_contract._COMMIT_SHA_RE usa — repetida
# aqui (não importada, que é privada de outro módulo) só para decidir o
# FORMATO de ``checkpoint_seguro`` antes de tentar construir uma
# RunnerTask; a validação de FORMATO de verdade continua sendo a do
# próprio contrato canônico. A EXISTÊNCIA real do commit (H1) é uma
# checagem separada, injetada por quem chama ``executar_handoff``.
_SHA_RE = re.compile(r"^[0-9a-fA-F]{7,40}$")

# Mesmo vocabulário de handoff.py/scheduler.py — nenhum valor novo aqui.
_STATUS_ELEGIVEIS_PARA_HANDOFF = ("LIMIT", "NEAR_LIMIT")

_INSTRUCOES_PROIBIDAS = frozenset({"continue", "continua", "continuar", "siga", "prossiga"})


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slug(nome: str) -> str:
    return "-".join(nome.strip().lower().split())


def checkpoint_e_seguro(checkpoint_commit: str | None) -> bool:
    """``True`` só para um SHA de commit SINTATICAMENTE válido (7-40 hex)
    — nunca uma string vazia, ``None``, ``"HEAD"``/``"latest"`` ou
    qualquer valor simbólico. Mesma régua de ``runner_contract`` (Issue
    #84 §6: "todo handoff deve partir de commit/checkpoint conhecido").

    Correção H1 (auditoria independente do PR #115): isto prova só o
    FORMATO — nunca que o commit existe de verdade ou pertence à branch
    esperada. ``executar_handoff`` combina isto com ``verificar_checkpoint``
    (injetado, ver docstring do módulo) antes de considerar um checkpoint
    realmente seguro para consumir o handoff."""
    if not checkpoint_commit:
        return False
    return bool(_SHA_RE.match(checkpoint_commit.strip()))


def derivar_task_id_de_continuacao(tarefa_id: str, checkpoint_commit: str) -> str:
    """Correção H3 (auditoria independente do PR #115): o ``RunnerTask.
    task_id`` de uma continuação NUNCA pode ser literalmente ``tarefa_id``
    — ``runner_dispatch.RunnerClaimStore`` já reivindica esse mesmo valor
    permanentemente na PRIMEIRA tentativa (mesmo que ela termine
    ``BLOCKED-LIMIT``), então reusar o mesmo ``task_id`` faria o Runner
    Dispatch rejeitar toda e qualquer continuação legítima como "já
    reivindicada". Este identificador é DISTINTO por geração/checkpoint
    (determinístico — a MESMA transição sempre deriva o MESMO id, uma
    transição NOVA sempre deriva um id diferente), mas continua
    rastreável até a tarefa canônica (prefixo ``tarefa_id``)."""
    return f"{tarefa_id}--continuacao-{checkpoint_commit}"


@dataclass(frozen=True)
class HandoffSource:
    """Os campos SENSÍVEIS de segurança da tarefa original — a
    continuação só pode REPETIR estes valores, nunca escrevê-los de novo
    a partir de outra fonte. Isto é o que torna "worker receptor não pode
    ganhar permissões maiores que a tarefa original" uma propriedade
    estrutural, não uma convenção: ``executar_handoff`` nunca aceita
    ``branch``/``allowed_files``/``risk_level``/``policy_level``/
    ``jose_authorized`` de nenhum outro parâmetro."""

    branch: str
    allowed_files: tuple[str, ...]
    risk_level: str
    policy_level: str
    jose_authorized: bool = False
    capabilities_required: tuple[str, ...] = ()
    source_issue: int | None = None
    publication_required: bool = False

    @classmethod
    def from_runner_task(cls, task: RunnerTask) -> "HandoffSource":
        """Quando a tarefa original já era uma ``RunnerTask`` (Fase D já
        em execução) — preserva EXATAMENTE os mesmos valores, nunca um
        subconjunto "recalculado"."""
        return cls(
            branch=task.branch,
            allowed_files=task.allowed_files,
            risk_level=task.risk_level,
            policy_level=task.policy_level,
            jose_authorized=task.jose_authorized,
            capabilities_required=task.capabilities_required,
            source_issue=task.source_issue,
            publication_required=task.publication_required,
        )

    @classmethod
    def from_task_record(
        cls, tarefa: TaskRecord, *, branch: str, risk_level: str, policy_level: str,
        jose_authorized: bool = False,
    ) -> "HandoffSource":
        """Quando a tarefa original só existia como registro declarativo
        (``coordination/tasks.json``, sem ``RunnerTask`` formal ainda —
        caso comum para ``human_session``). ``allowed_files``/
        ``capabilities_required`` vêm do PRÓPRIO ``TaskRecord`` (nunca
        inventados); ``risk_level``/``policy_level``/``jose_authorized``
        precisam ser informados explicitamente por quem já os conhece
        (o Coordinator, a partir da Issue #83) — nunca um default
        silencioso que poderia understatar risco/política."""
        return cls(
            branch=branch,
            allowed_files=tarefa.arquivos,
            risk_level=risk_level,
            policy_level=policy_level,
            jose_authorized=jose_authorized,
            capabilities_required=tuple(sorted(tarefa.capacidades_necessarias)),
            source_issue=None,
            publication_required=False,
        )


def gerar_instrucao_continuacao(
    tarefa: TaskRecord, *, checkpoint_commit: str, worker_anterior_nome: str, contexto_extra: str = "",
) -> str:
    """Instrução completa (nunca ``"continue"``) — Issue #105, seção 3 do
    design: "instrução completa gerada pelo Coordinator". O próprio
    ``checkpoint_commit`` já diz de onde retomar; a instrução ainda
    precisa descrever O QUE fazer, então esta função sempre produz um
    texto descritivo, nunca só uma palavra vaga."""
    texto = (
        f"Continuação da tarefa {tarefa.id!r} (prioridade {tarefa.priority.value}), transferida de "
        f"{worker_anterior_nome} por limite de sessão (Issue #105 Fase E). Retome EXATAMENTE a partir "
        f"do checkpoint {checkpoint_commit} — nunca de uma working tree não commitada, nunca inventando "
        "um ponto de partida diferente. Preserve a branch e os allowed_files já reservados; não amplie "
        "o escopo além do que a tarefa original já autorizava."
    )
    if contexto_extra.strip():
        texto += " " + contexto_extra.strip()
    return texto


def derivar_runner_task_continuacao(
    *, task_id: str, priority: Priority, source: HandoffSource, checkpoint_commit: str, instructions: str,
) -> RunnerTask:
    """Deriva uma ``RunnerTask`` de continuação — nunca reimplementa a
    validação do contrato canônico (``runner_contract.RunnerTask.
    __post_init__`` decide, por conta própria, se branch/allowed_files/
    checkpoint/política são válidos; uma violação aqui levanta
    ``ValueError`` exatamente como levantaria para qualquer outra
    RunnerTask). Todo campo sensível vem de ``source``, nunca de outro
    lugar — branch/allowed_files/capabilities_required/risk_level/
    policy_level/jose_authorized/source_issue/publication_required.
    ``task_id`` precisa já vir DERIVADO (``derivar_task_id_de_
    continuacao``, correção H3) — nunca a tarefa canônica diretamente."""
    texto = (instructions or "").strip()
    if texto.lower() in _INSTRUCOES_PROIBIDAS:
        raise ValueError(f"instructions={texto!r} é vago demais para uma continuação — gere um texto completo.")
    return RunnerTask(
        task_id=task_id,
        priority=priority,
        source_issue=source.source_issue,
        branch=source.branch,
        allowed_files=source.allowed_files,
        instructions=texto,
        checkpoint_commit=checkpoint_commit,
        capabilities_required=source.capabilities_required,
        risk_level=source.risk_level,
        policy_level=source.policy_level,
        jose_authorized=source.jose_authorized,
        publication_required=source.publication_required,
    )


class HandoffClaimStore:
    """Reserva atômica de uma TRANSIÇÃO de handoff numa branch de estado
    DEDICADA (``coordinator-state-handoff``, nunca ``main``, nunca
    matéria) — reaproveita ``git_state.GitJsonStore.claim_key()``, a
    MESMA peça que ``runner_dispatch.RunnerClaimStore``/``dedup.
    GitDedupStore`` já usam para o mesmo problema (nunca uma segunda
    implementação de compare-and-swap).

    Correção H3 (auditoria independente do PR #115): a chave reivindicada
    é a TRANSIÇÃO (``chave_transicao``, calculada por
    ``executar_handoff`` como ``f"{tarefa.id}:{worker_anterior.worker_id}
    :{checkpoint_commit}"``) — nunca só ``tarefa.id``. Repetir a MESMA
    transição continua idempotente (bloqueada na segunda vez); uma
    transição NOVA (checkpoint ou dono anterior diferente) usa uma chave
    diferente e nunca é bloqueada por uma reivindicação antiga."""

    def __init__(self, git_json: GitJsonStore) -> None:
        self.git_json = git_json

    def claim(self, chave_transicao: str) -> bool:
        return self.git_json.claim_key(f"handoff:{chave_transicao}", message=f"handoff: claim {chave_transicao}")

    def registrar_execucao(self, resultado: "HandoffExecutionResult") -> None:
        def mutate(dados: dict) -> dict:
            registros = dados.get("handoffs", [])
            registros.append({**resultado.to_dict(), "recorded_at": _now_iso()})
            return {**dados, "handoffs": registros}

        self.git_json.update(mutate, message=f"handoff: resultado {resultado.task_id} -> {resultado.action}")


@dataclass(frozen=True)
class HandoffExecutionResult:
    action: str  # "HANDOFF_EXECUTED" | "WAIT" | "POOL_PAUSED" | "BLOCKED"
    reason: str
    task_id: str | None = None
    previous_worker_id: str | None = None
    new_worker_id: str | None = None
    new_worker_type: str | None = None  # "human_session" | "api_runner" | None
    checkpoint_commit: str | None = None
    runner_task: RunnerTask | None = None
    human_instruction: str | None = None

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "reason": self.reason,
            "task_id": self.task_id,
            "previous_worker_id": self.previous_worker_id,
            "new_worker_id": self.new_worker_id,
            "new_worker_type": self.new_worker_type,
            "checkpoint_commit": self.checkpoint_commit,
            "runner_task": self.runner_task.to_dict() if self.runner_task else None,
            "human_instruction": self.human_instruction,
        }


def _worker_e_o_dono_atual(worker: WorkerRecord, tarefa: TaskRecord) -> bool:
    if not tarefa.agente:
        return False
    alvo = tarefa.agente.strip().lower()
    return worker.display_name.strip().lower() == alvo or worker.worker_id == _slug(tarefa.agente)


def executar_handoff(
    tarefa: TaskRecord,
    *,
    worker_anterior: WorkerRecord,
    workers: list[WorkerRecord],
    registry: OperationalWorkerRegistry,
    claim_store: HandoffClaimStore,
    source: HandoffSource,
    checkpoint_commit: str | None,
    verificar_checkpoint: Callable[[str, str], bool],
    contexto: HandoffContext | None = None,
    instructions: str | None = None,
) -> HandoffExecutionResult:
    """A orquestração operacional completa do handoff — decide (delegando
    a ``scheduler.avaliar_handoff_de_tarefa``, nunca duplicando a regra),
    reivindica atomicamente a TRANSIÇÃO (``claim_store``, correção H3 —
    nunca duas execuções da mesma transição, mas uma transição NOVA da
    mesma tarefa permanece possível) e só então atualiza o Worker
    Registry — de forma condicional (``transferir_worker_condicional``,
    correção H2 — nunca sobrescreve uma reserva mais nova) — e deriva a
    continuação (``RunnerTask`` com ``task_id`` DERIVADO, correção H3,
    para ``api_runner``; texto puro para ``human_session`` — NUNCA um
    estado que finja execução iniciada, mas também nunca "livre" para
    receber outra oferta enquanto reservada).

    ``verificar_checkpoint(checkpoint_commit, branch) -> bool`` (correção
    H1, sem default): só chamado quando ``checkpoint_e_seguro()`` já
    aprovou o FORMATO; precisa confirmar que o commit existe de verdade e
    é alcançável naquela branch. Fail-closed em toda borda: qualquer
    violação devolve ``BLOCKED``/``WAIT`` sem tocar no Worker Registry
    nem no claim store."""
    pausa = decidir_pool(workers)
    if pausa is not None:
        return HandoffExecutionResult(
            "POOL_PAUSED", pausa.reason, task_id=tarefa.id, previous_worker_id=worker_anterior.worker_id,
        )

    if not _worker_e_o_dono_atual(worker_anterior, tarefa):
        return HandoffExecutionResult(
            "BLOCKED",
            f"worker_anterior {worker_anterior.worker_id!r} não corresponde ao dono declarado da tarefa "
            f"({tarefa.agente!r}) — fail-closed, nenhum registro alterado.",
            task_id=tarefa.id, previous_worker_id=worker_anterior.worker_id,
        )

    if worker_anterior.status not in _STATUS_ELEGIVEIS_PARA_HANDOFF:
        return HandoffExecutionResult(
            "BLOCKED",
            f"worker_anterior.status={worker_anterior.status!r} não é LIMIT/NEAR_LIMIT — handoff só se "
            "aplica quando o worker atual está perto ou no limite de sessão.",
            task_id=tarefa.id, previous_worker_id=worker_anterior.worker_id,
        )

    # Correção H1: formato válido é só o pré-requisito para gastar a
    # verificação (potencialmente cara/real) de existência — nunca o
    # suficiente por si só para considerar o checkpoint seguro.
    checkpoint_seguro = bool(checkpoint_commit) and checkpoint_e_seguro(checkpoint_commit) and verificar_checkpoint(
        checkpoint_commit, source.branch,
    )

    # Correção estrutural (ver docstring do módulo): policy_level/
    # jose_authorized/risk_level do contexto SEMPRE vêm de `source` —
    # nunca de um HandoffContext externo, que poderia (por engano ou por
    # dado manipulado) tentar aprovar um handoff com política mais
    # permissiva do que a tarefa original de fato autorizava.
    base_contexto = contexto or HandoffContext(worker_status=worker_anterior.status)
    contexto_efetivo = replace(
        base_contexto,
        worker_status=worker_anterior.status,
        policy_level=source.policy_level,
        jose_authorized=source.jose_authorized,
        risk_level=source.risk_level,
    )

    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=checkpoint_seguro, workers=workers, contexto=contexto_efetivo,
    )
    if decisao.action != "HANDOFF":
        return HandoffExecutionResult(
            decisao.action, decisao.reason, task_id=tarefa.id, previous_worker_id=worker_anterior.worker_id,
        )

    novo_worker = next((w for w in workers if w.worker_id == decisao.novo_worker), None)
    if novo_worker is None:
        return HandoffExecutionResult(
            "BLOCKED",
            f"decisão apontou o worker {decisao.novo_worker!r}, que não existe mais no snapshot — "
            "fail-closed, nenhum registro alterado.",
            task_id=tarefa.id, previous_worker_id=worker_anterior.worker_id,
        )

    # Correção H3 + H5 (2ª auditoria independente do PR #115): a chave de
    # idempotência é a TRANSIÇÃO (tarefa + dono anterior + checkpoint +
    # worker NOVO) — nunca só a tarefa, e agora também nunca só até o
    # checkpoint (sem o receptor). H5: antes, se o receptor perdesse a
    # corrida no compare-and-set (ver mais abaixo), o claim já estava
    # consumido SEM incluir qual receptor foi tentado — a mesma tarefa/
    # checkpoint nunca mais podia ser oferecida a OUTRO worker disponível,
    # transformando uma perda de corrida normal num bloqueio permanente.
    # Incluir o receptor na chave resolve isso: repetir EXATAMENTE a mesma
    # tentativa (mesmo receptor) continua idempotente; uma nova avaliação
    # que escolhe um receptor DIFERENTE usa uma chave diferente e nunca é
    # bloqueada pela tentativa anterior perdida.
    chave_transicao = f"{tarefa.id}:{worker_anterior.worker_id}:{checkpoint_commit}:{novo_worker.worker_id}"
    claimed = claim_store.claim(chave_transicao)
    if not claimed:
        return HandoffExecutionResult(
            "BLOCKED",
            f"esta transição de {tarefa.id!r} (de {worker_anterior.worker_id!r} para "
            f"{novo_worker.worker_id!r}, checkpoint {checkpoint_commit!r}) já foi reivindicada/executada "
            "antes — idempotente, nenhuma segunda continuação foi criada. Um checkpoint, dono anterior "
            "ou receptor diferente gera uma transição nova.",
            task_id=tarefa.id, previous_worker_id=worker_anterior.worker_id,
            new_worker_id=novo_worker.worker_id, new_worker_type=novo_worker.type,
        )

    texto_instrucoes = instructions or gerar_instrucao_continuacao(
        tarefa, checkpoint_commit=checkpoint_commit, worker_anterior_nome=worker_anterior.display_name,
    )

    if novo_worker.type == "api_runner":
        try:
            runner_task = derivar_runner_task_continuacao(
                task_id=derivar_task_id_de_continuacao(tarefa.id, checkpoint_commit),
                priority=tarefa.priority, source=source,
                checkpoint_commit=checkpoint_commit, instructions=texto_instrucoes,
            )
        except ValueError as exc:
            # Correção de segurança (fail-closed): a reserva (claim) já
            # foi consumida de propósito — "falha não pode virar retry
            # automático silencioso" (mesma filosofia de
            # RunnerClaimStore); retomar exige decisão humana nova.
            return HandoffExecutionResult(
                "BLOCKED", f"continuação inválida, nenhum registro alterado: {exc}",
                task_id=tarefa.id, previous_worker_id=worker_anterior.worker_id,
                new_worker_id=novo_worker.worker_id, new_worker_type=novo_worker.type,
            )

        # Correção H4 (2ª auditoria): os patches trazem SÓ os campos que
        # mudam — aplicados por cima dos registros FRESCOS dentro do CAS
        # (nunca a partir de `worker_anterior`/`novo_worker`, que podem já
        # estar desatualizados por um heartbeat mais novo).
        anterior_patch = {"current_task": None}
        novo_patch = {
            "status": "BUSY", "current_task": tarefa.id,
            "branch": source.branch, "commit": checkpoint_commit, "last_checkpoint": checkpoint_commit,
        }
        # Correção H2 + H4: compare-and-set — só escreve se, numa leitura
        # FRESCA, o anterior ainda é dono de `tarefa.id`, ainda está no
        # MESMO checkpoint/branch do snapshot (H4 — um heartbeat mais novo
        # com checkpoint diferente bloqueia esta transição, sem apagar o
        # checkpoint novo) e o novo ainda está livre/AVAILABLE/can_execute
        # (H2 — outra tarefa já reservou o mesmo worker novo nesse
        # intervalo).
        transferido = registry.transferir_worker_condicional(
            worker_anterior_id=worker_anterior.worker_id, tarefa_id_esperada=tarefa.id,
            checkpoint_esperado=checkpoint_commit, branch_esperada=worker_anterior.branch,
            worker_novo_id=novo_worker.worker_id,
            anterior_patch=anterior_patch, novo_patch=novo_patch,
            message=f"handoff: {tarefa.id} {worker_anterior.worker_id} -> {novo_worker.worker_id}",
        )
        if not transferido:
            resultado = HandoffExecutionResult(
                "BLOCKED",
                f"o worker {novo_worker.worker_id!r} (ou o próprio {worker_anterior.worker_id!r}) mudou "
                "de estado entre a decisão e a escrita — outra tarefa provavelmente já o reservou; "
                "nenhum registro foi sobrescrito.",
                task_id=tarefa.id, previous_worker_id=worker_anterior.worker_id,
                new_worker_id=novo_worker.worker_id, new_worker_type=novo_worker.type,
            )
            claim_store.registrar_execucao(resultado)
            return resultado

        resultado = HandoffExecutionResult(
            "HANDOFF_EXECUTED", decisao.reason, task_id=tarefa.id,
            previous_worker_id=worker_anterior.worker_id, new_worker_id=novo_worker.worker_id,
            new_worker_type="api_runner", checkpoint_commit=checkpoint_commit, runner_task=runner_task,
        )
    else:
        # human_session (ou qualquer outro tipo futuro que can_execute):
        # NUNCA marcamos BUSY (fingiria que ela já começou), mas também
        # nunca a deixamos "livre" para o scheduler oferecer outra tarefa
        # enquanto esta reserva existe — só `current_task` é preenchido
        # (o mesmo campo que já exclui um worker de
        # `scheduler._candidatos_disponiveis`), `status` continua
        # exatamente o que já era (observação da auditoria do PR #115).
        anterior_patch = {"current_task": None}
        novo_patch = {"current_task": tarefa.id}
        transferido = registry.transferir_worker_condicional(
            worker_anterior_id=worker_anterior.worker_id, tarefa_id_esperada=tarefa.id,
            checkpoint_esperado=checkpoint_commit, branch_esperada=worker_anterior.branch,
            worker_novo_id=novo_worker.worker_id,
            anterior_patch=anterior_patch, novo_patch=novo_patch,
            message=(
                f"handoff: libera {worker_anterior.worker_id} — tarefa {tarefa.id} reservada para "
                f"{novo_worker.worker_id} (início manual, nunca automático)"
            ),
        )
        if not transferido:
            resultado = HandoffExecutionResult(
                "BLOCKED",
                f"o worker {novo_worker.worker_id!r} (ou o próprio {worker_anterior.worker_id!r}) mudou "
                "de estado entre a decisão e a escrita — outra tarefa provavelmente já o reservou; "
                "nenhum registro foi sobrescrito.",
                task_id=tarefa.id, previous_worker_id=worker_anterior.worker_id,
                new_worker_id=novo_worker.worker_id, new_worker_type=novo_worker.type,
            )
            claim_store.registrar_execucao(resultado)
            return resultado

        resultado = HandoffExecutionResult(
            "HANDOFF_EXECUTED", decisao.reason, task_id=tarefa.id,
            previous_worker_id=worker_anterior.worker_id, new_worker_id=novo_worker.worker_id,
            new_worker_type=novo_worker.type, checkpoint_commit=checkpoint_commit,
            human_instruction=texto_instrucoes,
        )

    claim_store.registrar_execucao(resultado)
    return resultado
