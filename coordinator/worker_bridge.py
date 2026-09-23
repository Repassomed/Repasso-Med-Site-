"""Worker Bridge V1 — Issue #128. A camada FINA que fecha a lacuna
``Scheduler -> Claude Worker programático -> Runner -> commit/checkpoint
-> PR -> Guard -> NEEDS-AUDIT``.

**O QUE ESTE MÓDULO NÃO É:** uma segunda arquitetura. Ele não decide
fila, não fala com a Anthropic, não aplica patch, não faz
commit/publicação, não valida contrato de tarefa e não implementa
compare-and-set próprio. Tudo isso JÁ EXISTE e é IMPORTADO:

* fila/decisão: ``scheduler.proxima_tarefa_pronta``/
  ``scheduler.escolher_proxima_atribuicao`` (auditado em 4 rodadas do
  PR #108);
* contrato: ``runner_contract.RunnerTask`` — é ele, na própria
  construção, que rejeita Nível E, Nível D sem autorização, branch
  protegida, ``allowed_files`` vazio/inválido e instrução vaga;
* execução: ``runner_dispatch.executar_tarefa`` (claim atômico, patch
  estruturado, allowlist de validação, diff real contra
  ``allowed_files``, commit/publicação sem força, heartbeat real);
* geração: ``runner_generate.gerar_patch_via_claude``, com o ledger
  Anthropic GLOBAL (``coordinator-state-usage``) e o MESMO teto mensal —
  nunca um segundo orçamento;
* Worker Registry operacional: ``worker_ops.OperationalWorkerRegistry``
  (reserva/liberação por CAS) e ``heartbeat.aplicar_heartbeat``;
* estado operacional da tarefa: ``task_runtime.TaskRuntimeStore``;
* identidade dos workers programáticos: ``bridge_workers``;
* PR/Guard: ``bridge_pr``.

O que ESTE arquivo acrescenta é só o que faltava: as flags próprias do
Bridge, o portão de política por tarefa, a MATERIALIZAÇÃO de uma
``RunnerTask`` a partir da tarefa declarativa, a ordem segura das
operações e o registro do resultado.

---

**FLUXO (na ordem real de execução, todas as bordas fail-closed):**

 1. portão do Bridge (``WorkerBridgeConfig.gate``) — fechado: zero
    escrita, zero chamada paga;
 2. lê ``coordination/tasks.json`` em modo SOMENTE LEITURA
    (``scheduler.load_tasks_from_tasks_json``) e os metadados de
    automação do MESMO arquivo;
 3. lê o estado operacional persistido e projeta a visão combinada
    (``task_runtime.aplicar_runtime_em_tarefas``) — é isso que impede
    uma tarefa já executada de voltar como ``READY``; em modo ``pilot``,
    ``restringir_ao_piloto`` ainda tira as OUTRAS tarefas da lista de
    candidatas, para que o piloto nunca perca a vez (correção B1 do
    PR #129);
3-A. MANUTENÇÃO antes de execução: se alguma tarefa já terminada tem PR
    aberta e Guard não confirmado (``FAILED``/``PENDING``), o ciclo
    despacha SÓ o Guard e termina — zero chamada paga, nenhuma PR nova,
    nenhuma tarefa nova consumida. É o caminho de recuperação que o
    estado da correção B4 exige para não ficar preso;
 4. filtra SÓ workers programáticos (``bridge_workers.
    workers_programaticos``) — uma sessão humana nunca é iniciada por
    código, e os ``api_runner`` do canário não são sequestrados;
 5. ``scheduler.escolher_proxima_atribuicao`` decide a oferta;
 6. portão do PILOTO: comparação ESTRITA de ``task_id`` E ``worker_id``;
 7. portão de POLÍTICA declarativa: ``automation_enabled`` explícito,
    ``risk_level``/``policy_level`` presentes, Nível E nunca, Nível D só
    com ``jose_authorized=true``;
 8. materialização VALIDADA da ``RunnerTask`` (pura — zero escrita, zero
    custo; é aqui que o contrato canônico rejeita o que for inválido);
 9. reserva da TAREFA por compare-and-set (``TaskRuntimeStore.reservar``)
    — perdeu a corrida: zero chamada paga;
10. reserva do WORKER por compare-and-set
    (``reservar_current_task_condicional``) — perdeu: resultado
    ``BLOCKED`` registrado, zero chamada paga, nenhum worker fantasma;
11. ``runner_dispatch.executar_tarefa`` com uma
    ``RunnerDispatchConfig`` em modo ``supervised``, autorizada só para
    ESTA tarefa (o claim do ``task_id`` de execução e a chamada paga
    acontecem lá dentro, nessa ordem);
12. registro do resultado no estado operacional (CAS);
13. liberação segura do worker (CAS) — nunca deixa ``BUSY`` fantasma,
    nunca apaga o checkpoint de um ``BLOCKED-LIMIT``;
14. PR idempotente + disparo confiável do Guard (``bridge_pr``), só em
    caso de sucesso com branch/checkpoint publicados. O disparo segue o
    protocolo RECUPERÁVEL de ``task_runtime`` (reserva ``PENDING`` ->
    chamada -> ``DISPATCHED``/``FAILED``, correção B4 do PR #129): uma
    falha de rede nunca deixa a PR em NEEDS-AUDIT sem Guard para sempre,
    e um ``DISPATCHED`` nunca é redisparado.

**ORIGEM DO CICLO (correção B5 do PR #129):** o mesmo código serve aos
dois caminhos, e o portão sabe a diferença. ``REPASSO_WORKER_BRIDGE_
TRIGGER=manual`` é o disparo explícito (``workflow_dispatch``), o único
que o modo ``pilot`` aceita; ``=event`` é o gatilho automático confiável
(``workflow_run`` da conclusão bem-sucedida do OBSERVE na branch padrão),
aceito só em ``active-supervised``. Em qualquer um dos dois, um ciclo
decide NO MÁXIMO UMA atribuição: automático não significa laço.

**INVARIANTES ABSOLUTOS:**

- **nunca merge, nunca publicação/deploy.** Não há nada aqui que faça
  isso, e o cliente de API do ``bridge_pr`` não tem operação de merge;
- **nunca escreve em ``coordination/tasks.json``/``main``** — todo estado
  operacional vive em branches ``coordinator-state-*``;
- **nunca aumenta teto de API** — usa o ledger Anthropic GLOBAL e o teto
  de ``budget.MONTHLY_BUDGET_USD``, nunca um segundo teto;
- **nunca faz polling nem consome a fila em laço** — uma execução decide
  NO MÁXIMO UMA atribuição e termina. Não existe ``while`` sobre a fila
  em lugar nenhum deste arquivo;
- **nunca aceita instrução livre** — ``instructions`` é montado a partir
  de campos TIPADOS da tarefa declarativa; nenhum input de workflow,
  comentário ou texto de modelo entra;
- **nunca amplia ``allowed_files``** — vem da tarefa declarativa e é
  usado exatamente como está (e um padrão com curinga é REJEITADO, em
  vez de expandido);
- **nunca retry automático** — uma tarefa com qualquer estado
  operacional registrado (inclusive ``FAILED``) não é reservada de novo,
  e um id de execução já reivindicado nunca é reusado.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, replace

from . import bridge_pr, bridge_workers, scheduler, task_runtime
from .bridge_pr import GuardDispatchOutcome, PrOutcome
from .classify import Priority
from .runner_contract import (
    POLICY_LEVEL_PROIBIDO,
    POLICY_LEVEL_REQUER_AUTORIZACAO,
    VALID_POLICY_LEVELS,
    VALID_RISK_LEVELS,
    RunnerTask,
)
from .runner_dispatch import (
    CANARY_VALIDATION_COMMAND_KEYS,
    DEFAULT_RUNNER_USAGE_STATE_BRANCH,
    RUNNER_MODE_SUPERVISED,
    SUPERVISED_AUTHORIZATION_SOURCE,
    DispatchOutcome,
    RunnerDispatchConfig,
    StructuredPatch,
    executar_tarefa,
)
from .scheduler import QueueDecision, TaskRecord
from .task_runtime import TaskRuntimeRecord, TaskRuntimeStore
from .worker_ops import OperationalWorkerRegistry, WorkerRecord

# ---------------------------------------------------------------------
# §6 — Flags do Worker Bridge, SEPARADAS das do canário. Nenhuma delas
# reaproveita REPASSO_RUNNER_*: ligar o canário nunca liga o Bridge, e
# vice-versa. Default de TUDO: desligado.
# ---------------------------------------------------------------------

ENV_BRIDGE_ENABLED = "REPASSO_WORKER_BRIDGE_ENABLED"
ENV_BRIDGE_MODE = "REPASSO_WORKER_BRIDGE_MODE"
ENV_BRIDGE_PILOT_WORKER_ID = "REPASSO_WORKER_BRIDGE_PILOT_WORKER_ID"
ENV_BRIDGE_PILOT_TASK_ID = "REPASSO_WORKER_BRIDGE_PILOT_TASK_ID"
# Mesma defesa em profundidade da correção B1 do Runner: workflow_dispatch
# pode ser disparado de QUALQUER ref, e o arquivo de workflow executado é
# o daquela ref. O workflow preenche os dois lados e o portão fecha
# fail-closed quando não batem — nunca confiar só no `if:` do job.
ENV_BRIDGE_ACTUAL_REF = "REPASSO_WORKER_BRIDGE_ACTUAL_REF"
ENV_BRIDGE_EXPECTED_REF = "REPASSO_WORKER_BRIDGE_EXPECTED_REF"
# Correção B5 da auditoria independente do PR #129: de ONDE veio este
# ciclo. ``manual`` = alguém clicou "Run workflow" (``workflow_dispatch``);
# ``event`` = o workflow foi acionado por um evento confiável
# (``workflow_run`` da conclusão bem-sucedida do OBSERVE na branch padrão).
# Preenchido pelo workflow a partir de ``github.event_name``, nunca por
# input livre, e reconferido em código: o modo ``pilot`` NUNCA inicia por
# evento, e um valor desconhecido fecha o portão.
ENV_BRIDGE_TRIGGER = "REPASSO_WORKER_BRIDGE_TRIGGER"

BRIDGE_MODE_PILOT = bridge_workers.MODO_PILOT
BRIDGE_MODE_ACTIVE_SUPERVISED = bridge_workers.MODO_ACTIVE_SUPERVISED
ALLOWED_BRIDGE_MODES: tuple[str, ...] = (BRIDGE_MODE_PILOT, BRIDGE_MODE_ACTIVE_SUPERVISED)

BRIDGE_TRIGGER_MANUAL = "manual"
BRIDGE_TRIGGER_EVENT = "event"
ALLOWED_BRIDGE_TRIGGERS: tuple[str, ...] = (BRIDGE_TRIGGER_MANUAL, BRIDGE_TRIGGER_EVENT)

# A MESMA chave da allowlist FECHADA de ``runner_dispatch`` que o canário
# usa. Reaproveitada por valor (não redeclarada como texto) exatamente
# para que as duas nunca divirjam: é uma tupla de CHAVES, nunca um comando
# de shell — nem input, nem comentário, nem texto de modelo tem via para
# escolher o que roda.
BRIDGE_VALIDATION_COMMAND_KEYS: tuple[str, ...] = CANARY_VALIDATION_COMMAND_KEYS

# Prefixo da branch de trabalho derivada. Mesma convenção que as tarefas
# do canário já usam (``runner/<task_id>``) — nunca ``main``/``master``,
# nunca uma branch de pessoa/PR.
BRIDGE_BRANCH_PREFIX = "runner/"

# Mesma allowlist de formato de id do workflow do Runner (camada 4) e de
# ``checkpoint_handoff._TASK_ID_RE``: um id fora deste formato nem chega a
# virar nome de branch.
_TASK_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")

# Um ``allowed_file`` com curinga é RECUSADO, nunca expandido: o contrato
# do Runner exige caminho EXATO ("allowed_files precisa ser exato",
# Issue #105), e expandir um glob aqui seria ampliar escopo por conta
# própria — proibido pelo §4 da Issue #128.
_CARACTERES_DE_GLOB = ("*", "?", "[", "]")


@dataclass(frozen=True)
class BridgeGateResult:
    open: bool
    reason: str


@dataclass(frozen=True)
class WorkerBridgeConfig:
    enabled: bool
    mode: str
    pilot_worker_id: str | None = None
    pilot_task_id: str | None = None
    actual_ref: str | None = None
    expected_ref: str | None = None
    # B5: ``manual`` por default — o comportamento mais restrito. Um ciclo
    # só é tratado como automático quando o workflow diz explicitamente
    # que veio de um evento confiável.
    trigger: str = BRIDGE_TRIGGER_MANUAL

    @property
    def mode_allowed(self) -> bool:
        return self.mode in ALLOWED_BRIDGE_MODES

    @property
    def trigger_allowed(self) -> bool:
        return self.trigger in ALLOWED_BRIDGE_TRIGGERS

    @property
    def is_event_driven(self) -> bool:
        return self.trigger == BRIDGE_TRIGGER_EVENT

    @property
    def is_pilot(self) -> bool:
        return self.mode == BRIDGE_MODE_PILOT

    @property
    def ref_allowed(self) -> bool:
        """Fail-closed, igual a ``RunnerDispatchConfig.ref_allowed``: os
        dois ausentes não restringem nada (chamada direta/teste fora do
        workflow); com qualquer um presente, os DOIS precisam estar
        presentes e ser EXATAMENTE iguais."""
        if self.actual_ref is None and self.expected_ref is None:
            return True
        return bool(self.actual_ref) and bool(self.expected_ref) and self.actual_ref == self.expected_ref

    def gate(self) -> BridgeGateResult:
        """A decisão de segurança do Bridge. Chamada ANTES de qualquer
        outra coisa — enquanto fechada, nada depois dela roda (nem
        leitura de estado remoto, nem reserva, nem chamada paga)."""
        if not self.ref_allowed:
            return BridgeGateResult(
                False,
                f"ref do disparo ({self.actual_ref!r}) não corresponde à branch padrão esperada "
                f"({self.expected_ref!r}) — portão fechado fail-closed ANTES de qualquer escrita: "
                "workflow_dispatch pode ser disparado de qualquer ref, e só a branch padrão é "
                "confiável para uma execução com permissão de escrita.",
            )
        if not self.mode_allowed:
            return BridgeGateResult(
                False,
                f"{ENV_BRIDGE_MODE}={self.mode!r} não é um dos modos permitidos "
                f"({list(ALLOWED_BRIDGE_MODES)}) — portão fechado, mesmo com ENABLED=true.",
            )
        if not self.enabled:
            return BridgeGateResult(
                False,
                f"{ENV_BRIDGE_ENABLED}=false (ou ausente) — nenhuma execução do Worker Bridge é "
                "permitida enquanto o portão estiver fechado.",
            )
        if not self.trigger_allowed:
            return BridgeGateResult(
                False,
                f"{ENV_BRIDGE_TRIGGER}={self.trigger!r} não é uma origem conhecida "
                f"({list(ALLOWED_BRIDGE_TRIGGERS)}) — portão fechado fail-closed.",
            )
        if self.is_pilot and self.is_event_driven:
            # B5: o piloto é uma execução OBSERVADA, com José olhando. Um
            # evento nunca o inicia — nem se a Variable do modo estiver em
            # ``pilot`` quando o gatilho automático disparar.
            return BridgeGateResult(
                False,
                f"modo {BRIDGE_MODE_PILOT!r} nunca inicia por evento: este ciclo veio de "
                f"{ENV_BRIDGE_TRIGGER}={BRIDGE_TRIGGER_EVENT!r}, e o piloto só roda por disparo "
                "manual explícito. Portão fechado.",
            )
        if self.is_pilot:
            if not self.pilot_worker_id or not self.pilot_task_id:
                return BridgeGateResult(
                    False,
                    f"modo {BRIDGE_MODE_PILOT!r} exige {ENV_BRIDGE_PILOT_WORKER_ID} E "
                    f"{ENV_BRIDGE_PILOT_TASK_ID} configurados (comparação estrita) — recebido "
                    f"worker={self.pilot_worker_id!r}, task={self.pilot_task_id!r}. Portão fechado.",
                )
            if not bridge_workers.e_worker_elegivel(self.pilot_worker_id, modo=self.mode):
                return BridgeGateResult(
                    False,
                    f"worker do piloto {self.pilot_worker_id!r} não é elegível no modo piloto "
                    f"({list(bridge_workers.ELIGIBLE_WORKER_IDS_PILOT)}) — portão fechado.",
                )
            return BridgeGateResult(
                True,
                f"portão aberto: modo {BRIDGE_MODE_PILOT!r}, somente a tarefa "
                f"{self.pilot_task_id!r} no worker {self.pilot_worker_id!r}.",
            )
        return BridgeGateResult(
            True,
            f"portão aberto: modo {BRIDGE_MODE_ACTIVE_SUPERVISED!r} — a fila confiável decide a "
            "tarefa, e cada tarefa continua passando pelo portão de política declarativa.",
        )

    def permite(self, *, task_id: str, worker_id: str) -> tuple[bool, str]:
        """§6: no modo ``pilot``, SÓ a tarefa piloto exata E SÓ o worker
        piloto exato passam — comparação estrita de string, nunca prefixo,
        nunca lista, nunca "qualquer tarefa Nível C".

        No modo ``active-supervised`` não há restrição de identidade aqui
        (é para isso que ele existe — a fila confiável escolhe), mas o
        worker ainda precisa ser um worker programático ELEGÍVEL, e a
        tarefa ainda precisa passar pelo portão de política declarativa
        (``avaliar_politica``), que é independente deste."""
        if not bridge_workers.e_worker_elegivel(worker_id, modo=self.mode):
            return False, (
                f"worker {worker_id!r} não é elegível no modo {self.mode!r} "
                f"({list(bridge_workers.ids_elegiveis(self.mode))}) — nada é executado."
            )
        if not self.is_pilot:
            return True, f"modo {BRIDGE_MODE_ACTIVE_SUPERVISED!r}: {task_id!r} em {worker_id!r}."
        if task_id != self.pilot_task_id:
            return False, (
                f"tarefa {task_id!r} não é a tarefa piloto autorizada ({self.pilot_task_id!r}) — "
                "comparação estrita, nada é executado."
            )
        if worker_id != self.pilot_worker_id:
            return False, (
                f"worker {worker_id!r} não é o worker piloto autorizado ({self.pilot_worker_id!r}) — "
                "comparação estrita, nada é executado."
            )
        return True, f"piloto autorizado: {task_id!r} em {worker_id!r}."

    @classmethod
    def from_env(cls, env: dict | None = None) -> "WorkerBridgeConfig":
        src = env if env is not None else os.environ
        enabled_raw = src.get(ENV_BRIDGE_ENABLED, "false")
        # Default do MODO é o piloto: se alguém ligar ENABLED sem dizer o
        # modo, o comportamento é o MAIS restrito possível (e, sem as duas
        # variáveis do piloto, o portão fica fechado de todo jeito).
        mode_raw = src.get(ENV_BRIDGE_MODE, BRIDGE_MODE_PILOT)
        return cls(
            enabled=(enabled_raw == "true"),
            mode=mode_raw,
            pilot_worker_id=src.get(ENV_BRIDGE_PILOT_WORKER_ID) or None,
            pilot_task_id=src.get(ENV_BRIDGE_PILOT_TASK_ID) or None,
            actual_ref=src.get(ENV_BRIDGE_ACTUAL_REF) or None,
            expected_ref=src.get(ENV_BRIDGE_EXPECTED_REF) or None,
            # Default do GATILHO é ``manual``: uma variável ausente nunca
            # é lida como "veio de um evento confiável".
            trigger=src.get(ENV_BRIDGE_TRIGGER) or BRIDGE_TRIGGER_MANUAL,
        )


def construir_config_do_runner(
    config: WorkerBridgeConfig, *, canonical_task_id: str
) -> RunnerDispatchConfig:
    """A ÚNICA forma legítima de existir uma ``RunnerDispatchConfig`` em
    modo ``supervised`` autorizada (Issue #128 §5).

    Três coisas importam aqui:

    1. ``enabled=True`` não vem de ``REPASSO_RUNNER_ENABLED``: quem
       autoriza é o portão do PRÓPRIO Bridge, que o chamador já abriu.
       As Variables do canário continuam sem efeito nenhum sobre o Bridge
       (e as do Bridge, sem efeito sobre o canário);
    2. ``supervised_task_id`` é a tarefa CANÔNICA desta atribuição — e só
       ela. O Runner vai comparar isso de novo, em código, contra o
       ``canonical_task_id`` que receber;
    3. ``supervised_authorized_by`` é o marcador que nenhuma variável de
       ambiente consegue produzir — é a prova estrutural de que a
       autorização veio deste caminho confiável.

    O par ``actual_ref``/``expected_ref`` é PROPAGADO para que o Runner
    refaça a mesma checagem de ref por conta própria (defesa em
    profundidade, mesmo padrão dos outros portões)."""
    alvo = (canonical_task_id or "").strip()
    if not alvo:
        raise ValueError("canonical_task_id não pode ser vazio.")
    gate = config.gate()
    if not gate.open:
        raise ValueError(
            f"não construo config de Runner com o portão do Bridge fechado: {gate.reason}"
        )
    return RunnerDispatchConfig(
        enabled=True,
        mode=RUNNER_MODE_SUPERVISED,
        canary_task_id=None,
        actual_ref=config.actual_ref,
        expected_ref=config.expected_ref,
        supervised_task_id=alvo,
        supervised_authorized_by=SUPERVISED_AUTHORIZATION_SOURCE,
    )


# ---------------------------------------------------------------------
# §4 — metadados declarativos de automação/política.
#
# Lidos do MESMO coordination/tasks.json, em modo somente leitura, mas
# num carregador próprio: ``scheduler.TaskRecord`` é, por decisão
# explícita daquele módulo, só os campos de DECISÃO DE FILA ("fonte/
# objetivo/notas ficam de fora de propósito"). Em vez de inflar um
# dataclass já auditado em 4 rodadas, o Bridge lê à parte o que só ele
# precisa — sem duplicar nenhuma regra de fila.
# ---------------------------------------------------------------------

CHAVE_AUTOMATION_ENABLED = "automation_enabled"
CHAVE_BRIDGE_ENABLED = "bridge_enabled"


@dataclass(frozen=True)
class BridgeTaskMetadata:
    task_id: str
    automation_enabled: bool = False
    bridge_enabled: bool | None = None
    risk_level: str | None = None
    policy_level: str | None = None
    jose_authorized: bool = False
    branch: str | None = None
    issue: int | None = None
    titulo: str | None = None
    objetivo: str | None = None
    fonte: str | None = None
    notas: str | None = None

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "automation_enabled": self.automation_enabled,
            "bridge_enabled": self.bridge_enabled,
            "risk_level": self.risk_level,
            "policy_level": self.policy_level,
            "jose_authorized": self.jose_authorized,
            "branch": self.branch,
            "issue": self.issue,
        }


def carregar_metadados_de_automacao(path: str) -> dict[str, BridgeTaskMetadata]:
    """Lê ``coordination/tasks.json`` em modo SOMENTE LEITURA — nunca abre
    o arquivo para escrita. Campos ausentes viram ``None``/``False``,
    nunca um default permissivo: é ``avaliar_politica`` que transforma
    ausência em recusa explícita."""
    with open(path, encoding="utf-8") as fh:
        dados = json.load(fh)
    saida: dict[str, BridgeTaskMetadata] = {}
    for t in dados.get("tarefas", []):
        tid = t.get("id")
        if not tid:
            continue
        bridge_bruto = t.get(CHAVE_BRIDGE_ENABLED)
        issue_bruto = t.get("issue")
        saida[tid] = BridgeTaskMetadata(
            task_id=tid,
            automation_enabled=(t.get(CHAVE_AUTOMATION_ENABLED) is True),
            bridge_enabled=(None if bridge_bruto is None else bridge_bruto is True),
            risk_level=(str(t["risk_level"]).strip().upper() if t.get("risk_level") else None),
            policy_level=(str(t["policy_level"]).strip().upper() if t.get("policy_level") else None),
            jose_authorized=(t.get("jose_authorized") is True),
            branch=t.get("branch"),
            issue=(issue_bruto if isinstance(issue_bruto, int) and issue_bruto > 0 else None),
            titulo=t.get("titulo"),
            objetivo=t.get("objetivo"),
            fonte=t.get("fonte"),
            notas=t.get("notas"),
        )
    return saida


@dataclass(frozen=True)
class PoliticaResult:
    permitido: bool
    reason: str


def avaliar_politica(meta: BridgeTaskMetadata | None, *, task_id: str) -> PoliticaResult:
    """§4 — fail-closed em toda ausência de dado. Uma tarefa ``READY``
    só pode virar ``RunnerTask`` quando ela PRÓPRIA declara,
    explicitamente, que aceita execução automática e em que nível de
    risco/política — nunca por inferência a partir da área, do título ou
    do caminho dos arquivos.

    Ordem das recusas (a mais absoluta primeiro):

    1. metadados ausentes -> recusa;
    2. ``automation_enabled`` não é exatamente ``true`` -> recusa;
    3. ``bridge_enabled`` declarado como ``false`` -> recusa (portão
       extra e opcional: desliga UMA tarefa para o Bridge sem mexer no
       ``automation_enabled``);
    4. ``risk_level``/``policy_level`` ausentes ou fora do vocabulário
       -> recusa (nunca um default "BAIXO"/"A" por omissão);
    5. Nível E -> NUNCA executa, ponto final (Issue #83);
    6. Nível D sem ``jose_authorized=true`` -> recusa.

    Os itens 5 e 6 são repetidos, de propósito, dentro de
    ``RunnerTask.__post_init__`` — que é onde eles são invioláveis. Aqui
    eles existem para que a recusa tenha uma mensagem auditável em vez de
    só uma exceção de construção."""
    if meta is None:
        return PoliticaResult(
            False,
            f"tarefa {task_id!r} não tem metadados em coordination/tasks.json — sem declaração "
            "explícita de automação/política, nada é executado (fail-closed).",
        )
    if not meta.automation_enabled:
        return PoliticaResult(
            False,
            f"tarefa {task_id!r} não declara {CHAVE_AUTOMATION_ENABLED}=true — o Worker Bridge só "
            "executa tarefa que se declara automatizável, nunca por inferência.",
        )
    if meta.bridge_enabled is False:
        return PoliticaResult(
            False,
            f"tarefa {task_id!r} declara {CHAVE_BRIDGE_ENABLED}=false — desligada explicitamente "
            "para o Worker Bridge.",
        )
    if not meta.risk_level or meta.risk_level not in VALID_RISK_LEVELS:
        return PoliticaResult(
            False,
            f"tarefa {task_id!r} não declara risk_level válido (recebido {meta.risk_level!r}, "
            f"esperado um de {VALID_RISK_LEVELS}) — nunca assumido por omissão.",
        )
    if not meta.policy_level or meta.policy_level not in VALID_POLICY_LEVELS:
        return PoliticaResult(
            False,
            f"tarefa {task_id!r} não declara policy_level válido (recebido {meta.policy_level!r}, "
            f"esperado um de {VALID_POLICY_LEVELS}) — nunca assumido por omissão.",
        )
    if meta.policy_level == POLICY_LEVEL_PROIBIDO:
        return PoliticaResult(
            False,
            f"tarefa {task_id!r} é Nível {POLICY_LEVEL_PROIBIDO} (Issue #83 — PROIBIDO): nunca "
            "executa automaticamente, independente de prioridade, worker ou autorização.",
        )
    if meta.policy_level == POLICY_LEVEL_REQUER_AUTORIZACAO and not meta.jose_authorized:
        return PoliticaResult(
            False,
            f"tarefa {task_id!r} é Nível {POLICY_LEVEL_REQUER_AUTORIZACAO} e não declara "
            "jose_authorized=true — Nível D sempre exige autorização explícita de José ANTES de "
            "começar (Issue #83).",
        )
    return PoliticaResult(
        True,
        f"tarefa {task_id!r} autorizada declarativamente: risco {meta.risk_level}, Nível "
        f"{meta.policy_level}, jose_authorized={meta.jose_authorized}.",
    )


# ---------------------------------------------------------------------
# §4 — materialização da RunnerTask.
# ---------------------------------------------------------------------

def branch_de_trabalho(tarefa: TaskRecord, meta: BridgeTaskMetadata) -> str:
    """Branch PRÓPRIA e determinística da tarefa. A branch declarada só é
    aceita quando já segue a convenção do Runner (``runner/...``); em
    qualquer outro caso, é DERIVADA como ``runner/<task_id>``.

    O motivo é concreto: o campo ``branch`` do registro declarativo
    também guarda branches de trabalho HUMANO (``infra/...``,
    ``visual/...``) e, num caso, a branch do próprio PR de
    infraestrutura. Publicar em cima de uma dessas seria escrever numa
    branch compartilhada que alguém está usando. ``main``/``master``
    continuam impossíveis por construção, em duas camadas: aqui e em
    ``RunnerTask.__post_init__``."""
    declarada = (meta.branch or "").strip()
    if declarada.startswith(BRIDGE_BRANCH_PREFIX) and not any(c.isspace() for c in declarada):
        return declarada
    return f"{BRIDGE_BRANCH_PREFIX}{tarefa.id}"


def montar_instrucoes(tarefa: TaskRecord, meta: BridgeTaskMetadata) -> str:
    """A instrução completa gerada pelo Coordinator (Issue #105: "nunca
    'continue'"), montada SÓ a partir de campos tipados/confiáveis da
    própria tarefa declarativa: título, objetivo, fonte, arquivos
    permitidos e notas. Nenhum input de workflow, nenhum texto de
    comentário, nenhum texto de modelo entra aqui.

    O bloco de contexto no fim NUNCA concede permissão nenhuma —
    ``allowed_files``/``policy_level``/``risk_level`` continuam sendo
    campos tipados da ``RunnerTask``, e é lá que eles valem. Mesma
    disciplina de ``checkpoint_handoff.instrucao_de_continuacao``."""
    arquivos = "\n".join(f"- {a}" for a in tarefa.arquivos)
    partes = [
        f"Tarefa: {(meta.titulo or tarefa.id).strip()}",
        "",
        "OBJETIVO",
        (meta.objetivo or "").strip() or "(a tarefa declarativa não registrou objetivo textual)",
        "",
        "ARQUIVOS PERMITIDOS — trabalhe EXCLUSIVAMENTE nestes caminhos. Nenhum outro arquivo do",
        "repositório pode ser criado, alterado ou removido:",
        arquivos,
        "",
        "REGRAS ABSOLUTAS",
        "- Não altere nenhum arquivo fora da lista acima.",
        "- Não toque em autenticação, Supabase, pagamentos, checkout nem em qualquer arquivo crítico.",
        "- Não publique, não faça deploy e não decida nada sobre integração da branch.",
        "- Entregue exatamente o que o objetivo pede, sem ampliar escopo por conta própria.",
        "",
        "--- CONTEXTO DA ATRIBUIÇÃO (Issue #128, Worker Bridge) ---",
        f"Id canônico da tarefa: {tarefa.id}",
        f"Área: {tarefa.area or '(não declarada)'}",
        f"Fonte: {(meta.fonte or '').strip() or '(não declarada)'}",
        f"Risco declarado: {meta.risk_level} · Política (Issue #83): Nível {meta.policy_level}",
    ]
    if (meta.notas or "").strip():
        partes += ["", "NOTAS DO REGISTRO DE TAREFAS", meta.notas.strip()]
    return "\n".join(partes)


@dataclass(frozen=True)
class MaterializacaoResult:
    ok: bool
    reason: str
    task: RunnerTask | None = None

    def to_dict(self) -> dict:
        return {"ok": self.ok, "reason": self.reason, "task": self.task.to_dict() if self.task else None}


def materializar_runner_task(
    tarefa: TaskRecord, meta: BridgeTaskMetadata, *, task_id: str | None = None,
) -> MaterializacaoResult:
    """Transforma a tarefa declarativa numa ``RunnerTask`` VÁLIDA — ou
    recusa com motivo. Função PURA: zero escrita, zero rede, zero custo.

    ``task_id`` é o id que vai para o contrato. Quando ``None`` (o uso na
    VALIDAÇÃO, antes de qualquer reserva), usa o id canônico; depois da
    reserva, quem chama repassa o id de EXECUÇÃO derivado
    (``<canonico>--bridge-<token>``), porque o claim do Runner consome um
    ``task_id`` permanentemente.

    ``checkpoint_commit`` é sempre ``None`` aqui, de propósito: o Bridge
    só atribui tarefa que está na janela ``READY`` (uma tarefa com
    runtime ``BLOCKED-LIMIT`` nunca volta para a fila, §11), e retomada a
    partir de checkpoint continua sendo o caminho já existente de
    ``runner_resume``/``checkpoint_handoff`` — nunca reimplementado aqui.
    """
    alvo = task_id or tarefa.id
    if not _TASK_ID_RE.match(tarefa.id):
        return MaterializacaoResult(
            False,
            f"id de tarefa {tarefa.id!r} fora do formato permitido — nenhum nome de branch é "
            "construído a partir dele (fail-closed).",
        )

    arquivos = tuple(str(a).strip() for a in tarefa.arquivos if str(a).strip())
    if not arquivos:
        return MaterializacaoResult(
            False,
            f"tarefa {tarefa.id!r} não declara arquivos — sem reserva explícita de arquivo, nada "
            "é executado (Lei 3, #82/#85).",
        )
    com_glob = sorted([a for a in arquivos if any(c in a for c in _CARACTERES_DE_GLOB)])
    if com_glob:
        return MaterializacaoResult(
            False,
            (
                f"tarefa {tarefa.id!r} declara arquivo(s) com curinga ({com_glob}) — o contrato do "
                "Runner exige caminho EXATO, e o Bridge nunca expande um padrão (expandir seria "
                "ampliar escopo por conta própria, Issue #128 §4). Declare os caminhos exatos."
            ),
        )

    prioridade = tarefa.priority
    if not isinstance(prioridade, Priority):  # pragma: no cover - defesa em profundidade
        return MaterializacaoResult(False, f"prioridade inválida em {tarefa.id!r}.")

    try:
        construida = RunnerTask(
            task_id=alvo,
            priority=prioridade,
            source_issue=meta.issue,
            branch=branch_de_trabalho(tarefa, meta),
            allowed_files=arquivos,
            instructions=montar_instrucoes(tarefa, meta),
            checkpoint_commit=None,
            capabilities_required=tuple(sorted(tarefa.capacidades_necessarias)),
            risk_level=meta.risk_level or "",
            policy_level=meta.policy_level or "",
            jose_authorized=meta.jose_authorized,
            publication_required=False,
        )
    except ValueError as exc:
        return MaterializacaoResult(
            False,
            f"contrato do Runner recusou a materialização de {tarefa.id!r} (fail-closed): {exc}",
        )
    return MaterializacaoResult(True, f"RunnerTask materializada para {alvo!r}.", task=construida)


# ---------------------------------------------------------------------
# §10 — liberação segura do worker depois do resultado.
# ---------------------------------------------------------------------

@dataclass(frozen=True)
class LiberacaoResult:
    action: str  # "RELEASED" | "ALREADY_FREE" | "PRESERVED" | "SKIPPED" | "FAILED"
    reason: str

    def to_dict(self) -> dict:
        return {"action": self.action, "reason": self.reason}


def liberar_worker_apos_resultado(
    registry: OperationalWorkerRegistry, worker_id: str, *,
    canonical_task_id: str, resultado_status: str,
) -> LiberacaoResult:
    """§10 — "liberar o worker de forma segura por CAS; não deixar BUSY
    fantasma".

    Duas decisões deliberadas:

    1. ``BLOCKED-LIMIT`` NUNCA é liberado aqui. Um worker em limite é dono
       de uma tarefa com checkpoint publicado, e é exatamente desse par
       (``current_task`` + ``last_checkpoint``) que o handoff real da
       Fase E parte. Forçar ``AVAILABLE``/``current_task=None`` apagaria
       a única informação que torna a tarefa retomável;
    2. em todo outro resultado, a liberação é um compare-and-set com o
       snapshot FRESCO (status, ``current_task``, ``last_checkpoint``,
       ``branch``) — se qualquer coisa mudou nesse intervalo, nada é
       escrito. E se o registro fresco aponta para OUTRA tarefa, o worker
       não é tocado: ele já foi assumido por outro trabalho.
    """
    if resultado_status == task_runtime.RUNTIME_BLOCKED_LIMIT:
        return LiberacaoResult(
            "PRESERVED",
            f"resultado {resultado_status} — worker {worker_id!r} é mantido exatamente como está "
            "(tarefa + checkpoint preservados para handoff/retomada); liberar apagaria o ponto de "
            "partida da continuação.",
        )

    fresco = registry.find_by_name_or_id(worker_id)
    if fresco is None:
        return LiberacaoResult("SKIPPED", f"worker {worker_id!r} não está mais no registro.")
    if fresco.current_task not in (None, canonical_task_id):
        return LiberacaoResult(
            "SKIPPED",
            f"worker {worker_id!r} agora aponta para {fresco.current_task!r}, não para "
            f"{canonical_task_id!r} — já foi assumido por outro trabalho; não toco nele.",
        )
    if fresco.status == "AVAILABLE" and fresco.current_task is None:
        return LiberacaoResult("ALREADY_FREE", f"worker {worker_id!r} já está AVAILABLE e livre.")

    aceito = registry.marcar_available_condicional(
        fresco.worker_id,
        esperado_status=fresco.status,
        esperado_current_task=fresco.current_task,
        esperado_checkpoint=fresco.last_checkpoint,
        esperado_branch=fresco.branch,
        message=f"worker-bridge: libera {fresco.worker_id} depois de {canonical_task_id} -> {resultado_status}",
    )
    if not aceito:
        return LiberacaoResult(
            "FAILED",
            f"compare-and-set recusou a liberação de {worker_id!r} — o registro mudou entre a "
            "leitura e a escrita; o estado mais novo nunca é sobrescrito por uma transição velha.",
        )
    return LiberacaoResult(
        "RELEASED",
        f"worker {worker_id!r} liberado por compare-and-set (AVAILABLE, sem tarefa ativa) depois "
        f"de {canonical_task_id} -> {resultado_status}.",
    )


# ---------------------------------------------------------------------
# Mapeamento RunnerResult -> estado operacional.
# ---------------------------------------------------------------------

_RUNNER_STATUS_PARA_RUNTIME: dict[str, str] = {
    "NEEDS-AUDIT": task_runtime.RUNTIME_NEEDS_AUDIT,
    "DONE": task_runtime.RUNTIME_DONE,
    "BLOCKED-LIMIT": task_runtime.RUNTIME_BLOCKED_LIMIT,
    "BLOCKED": task_runtime.RUNTIME_BLOCKED,
    "FAILED": task_runtime.RUNTIME_FAILED,
}

# Só estes dois abrem PR: houve patch aplicado, validações passaram e
# commit publicado numa branch de trabalho. Nunca se abre PR para
# BLOCKED/FAILED (não há nada publicado) nem para BLOCKED-LIMIT (o
# caminho dali é handoff/retomada, decidido pelo mecanismo existente).
STATUS_QUE_ABREM_PR: tuple[str, ...] = (
    task_runtime.RUNTIME_NEEDS_AUDIT, task_runtime.RUNTIME_DONE,
)


@dataclass(frozen=True)
class BridgeOutcome:
    """O que UMA execução do Bridge fez. ``action``:

    - ``BLOCKED``: portão/piloto/política/materialização recusaram —
      zero escrita e zero chamada paga;
    - ``POOL_PAUSED``: todos os workers programáticos em LIMIT/OFFLINE;
    - ``NO_ASSIGNMENT``: a fila não tem atribuição possível agora;
    - ``ALREADY_CLAIMED``: outra execução reservou a tarefa primeiro —
      zero chamada paga;
    - ``DISPATCHED``: a tarefa foi reservada e entregue ao Runner (o
      resultado real está em ``dispatch``/``runtime_record``);
    - ``PR_RETRY``: MANUTENÇÃO, não execução. O ciclo encontrou uma
      tarefa já concluída em NEEDS-AUDIT/DONE com branch/checkpoint
      publicados, mas sem PR registrada, e tenta APENAS abrir/reutilizar
      a PR e despachar o Guard. Zero chamada paga e zero Runner;
    - ``GUARD_RETRY``: MANUTENÇÃO, não execução. O ciclo encontrou uma
      tarefa que já terminou e já tem PR, mas cujo Guard nunca foi
      confirmado, e tentou APENAS o disparo do Guard. Zero chamada paga,
      nenhuma PR nova, nenhuma tarefa nova consumida (achado da 2ª
      auditoria independente do PR #129).
    """

    action: str
    reason: str
    decision: QueueDecision | None = None
    runner_task: RunnerTask | None = None
    runtime_record: TaskRuntimeRecord | None = None
    dispatch: DispatchOutcome | None = None
    liberacao: LiberacaoResult | None = None
    pr: PrOutcome | None = None
    guard: GuardDispatchOutcome | None = None
    notes: tuple[str, ...] = ()

    @property
    def runner_result_status(self) -> str | None:
        if self.dispatch is None or self.dispatch.result is None:
            return None
        return self.dispatch.result.status

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "reason": self.reason,
            "decision": self.decision.to_dict() if self.decision else None,
            "runner_task": self.runner_task.to_dict() if self.runner_task else None,
            "runtime_record": self.runtime_record.to_dict() if self.runtime_record else None,
            "dispatch": self.dispatch.to_dict() if self.dispatch else None,
            "liberacao": self.liberacao.to_dict() if self.liberacao else None,
            "pr": self.pr.to_dict() if self.pr else None,
            "guard": self.guard.to_dict() if self.guard else None,
            "notes": list(self.notes),
        }


def visao_da_fila(
    *, tasks_json_path: str, runtime_store: TaskRuntimeStore,
) -> tuple[list[TaskRecord], dict[str, BridgeTaskMetadata], dict[str, TaskRuntimeRecord]]:
    """A visão combinada do §3: declarativo (somente leitura) + estado
    operacional persistido. Nenhuma escrita, nem em ``tasks.json`` nem na
    branch de estado."""
    declarativas = scheduler.load_tasks_from_tasks_json(tasks_json_path)
    metadados = carregar_metadados_de_automacao(tasks_json_path)
    registros = runtime_store.por_id()
    return task_runtime.aplicar_runtime_em_tarefas(declarativas, registros), metadados, registros


def candidato_a_retomada_da_pr(
    registros: dict[str, TaskRuntimeRecord], config: WorkerBridgeConfig
) -> TaskRuntimeRecord | None:
    """Seleciona uma execução já concluída que publicou branch/checkpoint
    mas ficou sem PR.

    É o caso observado no piloto R2 quando o GitHub recusou a criação da
    PR com 403. A tarefa NÃO volta para READY e o Runner/Claude NÃO são
    executados outra vez: este candidato serve exclusivamente para a
    manutenção administrativa da PR/Guard.

    Fail-closed: exige status terminal utilizável, branch, checkpoint,
    execution_task_id e ausência de pr_number. Em modo piloto, somente a
    tarefa piloto exata pode ser recuperada."""
    candidatos = [
        r for r in registros.values()
        if r.status in (task_runtime.RUNTIME_NEEDS_AUDIT, task_runtime.RUNTIME_DONE)
        and r.pr_number is None
        and bool((r.branch or "").strip())
        and bool((r.checkpoint_commit or "").strip())
        and bool((r.execution_task_id or "").strip())
        and bool((r.worker_id or "").strip())
        and (not config.is_pilot or r.canonical_task_id == (config.pilot_task_id or "").strip())
    ]
    if not candidatos:
        return None
    return sorted(candidatos, key=lambda r: r.canonical_task_id)[0]


def retomar_pr_e_guard(
    registro: TaskRuntimeRecord, *,
    tarefas: list[TaskRecord],
    metadados: dict[str, BridgeTaskMetadata],
    runtime_store: TaskRuntimeStore,
    github_api: bridge_pr.GitHubBridgeApi,
    base_branch: str,
) -> BridgeOutcome:
    """Manutenção de PR pendente, com ZERO Runner/Claude/Anthropic.

    Reconstrói apenas os metadados tipados necessários para o corpo da PR
    a partir da tarefa declarativa confiável e do runtime persistido. Usa
    a mesma função idempotente ``_abrir_pr_e_guard``, portanto uma PR já
    existente para a branch é reutilizada e nunca duplicada."""
    alvo = registro.canonical_task_id
    tarefa = next((t for t in tarefas if t.id == alvo), None)
    meta = metadados.get(alvo)
    if tarefa is None or meta is None:
        return BridgeOutcome(
            "PR_RETRY",
            f"não consigo recuperar PR de {alvo!r}: tarefa/metadados declarativos ausentes — fail-closed.",
            runtime_record=registro,
        )

    materializada = materializar_runner_task(
        tarefa, meta, task_id=registro.execution_task_id
    )
    if not materializada.ok or materializada.task is None:
        return BridgeOutcome(
            "PR_RETRY",
            f"não consigo recuperar PR de {alvo!r}: {materializada.reason}",
            runtime_record=registro,
        )

    try:
        runner_task = replace(
            materializada.task,
            branch=registro.branch,
            checkpoint_commit=registro.checkpoint_commit,
        )
    except ValueError as exc:
        return BridgeOutcome(
            "PR_RETRY",
            f"runtime publicado de {alvo!r} não reconstrói RunnerTask válida: {exc}",
            runtime_record=registro,
        )

    pr_outcome, guard_outcome, notas = _abrir_pr_e_guard(
        github_api,
        task=runner_task,
        tarefa=tarefa,
        meta=meta,
        canonical_task_id=alvo,
        worker_id=registro.worker_id or "",
        checkpoint_commit=registro.checkpoint_commit,
        base_branch=base_branch,
        runtime_store=runtime_store,
        status_runtime=registro.status,
    )
    fresco = runtime_store.get(alvo) or registro
    return BridgeOutcome(
        "PR_RETRY",
        (
            f"manutenção de PR para {alvo!r}: "
            f"{pr_outcome.action if pr_outcome else 'SEM_PR'}; "
            "nenhum Runner/Claude/Anthropic foi executado."
        ),
        runner_task=runner_task,
        runtime_record=fresco,
        pr=pr_outcome,
        guard=guard_outcome,
        notes=tuple(notas),
    )


def candidato_a_retomada_do_guard(
    registros: dict[str, TaskRuntimeRecord], config: WorkerBridgeConfig
) -> TaskRuntimeRecord | None:
    """Achado da 2ª auditoria independente do PR #129.

    A correção B4 tornou o estado do disparo do Guard RECUPERÁVEL
    (``FAILED``/``PENDING`` autorizam uma nova tentativa), mas não existia
    caminho que EXECUTASSE a recuperação: depois de um sucesso a tarefa
    fica ``NEEDS-AUDIT``, e é justamente esse estado que a mantém fora da
    fila ``READY`` — então o scheduler nunca a ofereceria de novo e
    ``_abrir_pr_e_guard`` nunca seria chamado outra vez. Estado
    recuperável sem caminho de recuperação é o mesmo defeito, um passo
    mais tarde.

    Esta função é o predicado de busca, e nada além disso. Escolha
    DETERMINÍSTICA (ordem por ``canonical_task_id``, nunca a ordem de
    iteração de um dict), e em modo ``pilot`` só a própria tarefa piloto é
    candidata — a mesma restrição estrita de identidade que vale para
    execução vale para manutenção."""
    candidatos = [
        r for r in registros.values()
        if r.guard_retomada_pendente
        and (not config.is_pilot or r.canonical_task_id == (config.pilot_task_id or "").strip())
    ]
    if not candidatos:
        return None
    return sorted(candidatos, key=lambda r: r.canonical_task_id)[0]


def retomar_guard(
    registro: TaskRuntimeRecord, *,
    runtime_store: TaskRuntimeStore,
    github_api: bridge_pr.GitHubBridgeApi,
    base_branch: str,
) -> BridgeOutcome:
    """A ação de MANUTENÇÃO: tenta SÓ o disparo do Guard para a PR que já
    existe, e termina o ciclo.

    O que ela deliberadamente NÃO faz, ponto por ponto: não chama o
    Runner nem modelo nenhum (nenhuma chamada paga acontece neste
    caminho — não há closure de geração aqui); não cria nem procura outra
    PR (usa o ``pr_number`` já registrado); não toca ``task_id``,
    ``branch`` nem ``checkpoint``; não reabre a tarefa para ``READY``; e
    não consome nenhuma tarefa nova da fila.

    A proteção contra duplicação concorrente continua sendo a MESMA:
    ``reservar_guard_dispatch`` é um compare-and-set, então duas execuções
    simultâneas não despacham duas vezes, e um Guard já ``DISPATCHED``
    nunca é redisparado."""
    pr_number = registro.pr_number
    assert pr_number is not None  # garantido por ``guard_retomada_pendente``
    alvo = registro.canonical_task_id

    if not runtime_store.reservar_guard_dispatch(alvo, pr_number=pr_number):
        return BridgeOutcome(
            "GUARD_RETRY",
            f"o Guard da PR #{pr_number} ({alvo!r}) já está confirmado — nada a retomar.",
            runtime_record=registro,
            guard=GuardDispatchOutcome(
                "ALREADY_DISPATCHED",
                f"reserva recusada por compare-and-set: o Guard da PR #{pr_number} já foi "
                "despachado com sucesso.",
                pr_number=pr_number,
            ),
        )

    guard_outcome = bridge_pr.disparar_guard(github_api, pr_number=pr_number, ref=base_branch)
    if guard_outcome.action == "FAILED":
        runtime_store.falhar_guard_dispatch(alvo, pr_number=pr_number)
        return BridgeOutcome(
            "GUARD_RETRY",
            (
                f"retomada do Guard da PR #{pr_number} ({alvo!r}) falhou de novo — o estado volta "
                "para FAILED e uma próxima execução pode tentar outra vez. Nenhuma tarefa nova foi "
                "consumida e nenhuma chamada paga aconteceu."
            ),
            runtime_record=runtime_store.get(alvo) or registro,
            guard=guard_outcome,
            notes=(guard_outcome.reason,),
        )

    runtime_store.confirmar_guard_dispatch(alvo, pr_number=pr_number)
    return BridgeOutcome(
        "GUARD_RETRY",
        (
            f"Guard despachado com sucesso na retomada da PR #{pr_number} ({alvo!r}). Ciclo de "
            "MANUTENÇÃO: nenhuma tarefa nova foi consumida e nenhuma chamada paga aconteceu."
        ),
        runtime_record=runtime_store.get(alvo) or registro,
        guard=guard_outcome,
    )


def restringir_ao_piloto(
    tarefas: list[TaskRecord], config: WorkerBridgeConfig
) -> list[TaskRecord]:
    """Correção B1 da auditoria independente do PR #129.

    ``scheduler.escolher_proxima_atribuicao`` oferece o PRIMEIRO da fila.
    Em modo ``pilot``, se qualquer outra tarefa ``READY`` estiver à frente
    da tarefa piloto (prioridade igual e id alfabeticamente menor, por
    exemplo), o Bridge receberia ESSA, o portão do piloto a recusaria e o
    piloto nunca rodaria — verde e inerte, que é o pior resultado
    possível para um piloto.

    A correção é NARROW, nunca WIDEN: em modo piloto, nenhuma tarefa
    além da piloto é candidata. As outras continuam presentes na lista
    (como ``BLOCKED``), então a reserva de arquivo das tarefas ATIVAS e a
    resolução de dependências continuam exatamente as mesmas — só deixam
    de ser oferecíveis. Fora do modo piloto a lista volta intacta: é a
    fila confiável que decide.

    Nada aqui é escrito em lugar nenhum: a lista é a projeção em memória
    do §3, e ``coordination/tasks.json`` continua intocado."""
    if not config.is_pilot:
        return tarefas
    alvo = (config.pilot_task_id or "").strip()
    return [
        t if (t.id == alvo or t.estado != "READY") else replace(t, estado="BLOCKED")
        for t in tarefas
    ]


def executar_ciclo(
    *,
    config: WorkerBridgeConfig,
    tasks_json_path: str,
    repo_dir: str,
    state_git_remote: str,
    worker_registry: OperationalWorkerRegistry,
    runtime_store: TaskRuntimeStore,
    base_branch: str,
    github_api: bridge_pr.GitHubBridgeApi | None = None,
    validation_command_keys: tuple[str, ...] = BRIDGE_VALIDATION_COMMAND_KEYS,
    patch: StructuredPatch | None = None,
    gerar_patch=None,
    transport: object | None = None,
    budget_usd: float | None = None,
    push_remote_name: str = "origin",
) -> BridgeOutcome:
    """UMA atribuição, no máximo — nunca um laço sobre a fila, nunca
    polling. Ver o fluxo numerado no docstring do módulo."""
    notes: list[str] = []

    # 1. portão do Bridge — fechado: zero escrita, zero chamada externa.
    gate = config.gate()
    if not gate.open:
        return BridgeOutcome("BLOCKED", gate.reason, notes=("portão fechado — zero escrita, zero chamada paga.",))

    # 2-3. visão combinada (declarativo somente leitura + runtime), e —
    # em modo piloto — restrita à tarefa piloto, para que o piloto nunca
    # perca a vez para outra tarefa READY que esteja à frente na fila
    # (correção B1).
    tarefas, metadados, registros = visao_da_fila(
        tasks_json_path=tasks_json_path, runtime_store=runtime_store
    )

    # 3-A. MANUTENÇÃO DE PR antes de qualquer execução. Se o Runner já
    # terminou e publicou branch/checkpoint, mas a PR não foi registrada
    # (ex.: 403/rede), recuperamos somente PR + Guard. Zero Anthropic,
    # zero Runner, zero novo claim.
    pr_pendente = candidato_a_retomada_da_pr(registros, config)
    if pr_pendente is not None:
        if github_api is None:
            return BridgeOutcome(
                "PR_RETRY",
                (
                    f"{pr_pendente.canonical_task_id!r} terminou com branch/checkpoint publicados, "
                    "mas ainda não tem PR e nenhum cliente GitHub foi fornecido — nada foi "
                    "reexecutado."
                ),
                runtime_record=pr_pendente,
            )
        return retomar_pr_e_guard(
            pr_pendente,
            tarefas=tarefas,
            metadados=metadados,
            runtime_store=runtime_store,
            github_api=github_api,
            base_branch=base_branch,
        )

    # 3-B. MANUTENÇÃO DO GUARD: tarefa já tem PR, mas o Guard nunca foi
    # confirmado. Tenta somente o Guard e termina.
    pendente = candidato_a_retomada_do_guard(registros, config)
    if pendente is not None:
        if github_api is None:
            return BridgeOutcome(
                "GUARD_RETRY",
                (
                    f"a PR #{pendente.pr_number} de {pendente.canonical_task_id!r} espera retomada "
                    "do Guard, mas nenhum cliente GitHub foi fornecido — nada foi reexecutado."
                ),
                runtime_record=pendente,
            )
        return retomar_guard(
            pendente, runtime_store=runtime_store, github_api=github_api,
            base_branch=base_branch,
        )

    tarefas = restringir_ao_piloto(tarefas, config)

    # 4. só workers programáticos do Bridge.
    todos_workers: list[WorkerRecord] = worker_registry.list_workers()
    workers = bridge_workers.workers_programaticos(todos_workers)
    if not workers:
        return BridgeOutcome(
            "NO_ASSIGNMENT",
            (
                "nenhum worker programático registrado — rode o bootstrap "
                "(coordinator.bridge_workers) com o Bridge ligado antes de qualquer atribuição."
            ),
        )

    # 5. decisão da fila — a MESMA função do scheduler, nunca uma cópia.
    decisao = scheduler.escolher_proxima_atribuicao(tarefas, workers)
    if decisao.action == "POOL_PAUSED":
        return BridgeOutcome("POOL_PAUSED", decisao.reason, decision=decisao)
    if decisao.action != "OFFER" or not decisao.task_id or not decisao.worker_id:
        return BridgeOutcome("NO_ASSIGNMENT", decisao.reason, decision=decisao)

    canonical_task_id = decisao.task_id
    worker_id = decisao.worker_id

    # 6. portão do piloto — comparação estrita, zero escrita se recusar.
    permitido, motivo_piloto = config.permite(task_id=canonical_task_id, worker_id=worker_id)
    if not permitido:
        return BridgeOutcome("BLOCKED", motivo_piloto, decision=decisao)

    # 7. portão de política declarativa.
    meta = metadados.get(canonical_task_id)
    politica = avaliar_politica(meta, task_id=canonical_task_id)
    if not politica.permitido:
        return BridgeOutcome("BLOCKED", politica.reason, decision=decisao)
    assert meta is not None  # avaliar_politica já recusou meta=None

    tarefa = next((t for t in tarefas if t.id == canonical_task_id), None)
    if tarefa is None:  # pragma: no cover - a decisão saiu desta mesma lista
        return BridgeOutcome("BLOCKED", f"tarefa {canonical_task_id!r} desapareceu da visão da fila.")

    # 8. materialização VALIDADA — pura, antes de qualquer reserva: uma
    # tarefa que o contrato recusaria nunca consome a reserva (que é
    # deliberadamente irreversível e bloquearia a tarefa até uma decisão
    # humana). O id definitivo (de EXECUÇÃO) só existe depois do passo 9,
    # então aqui a validação roda com o id canônico e o objeto final é
    # reconstruído com ``replace`` — que reexecuta o ``__post_init__``
    # inteiro do contrato, sem pular nenhuma checagem.
    validacao = materializar_runner_task(tarefa, meta)
    if not validacao.ok or validacao.task is None:
        return BridgeOutcome("BLOCKED", validacao.reason, decision=decisao)

    # 9. reserva da TAREFA (compare-and-set). Perdeu: zero chamada paga.
    reserva = runtime_store.reservar(
        canonical_task_id, worker_id=worker_id, branch=validacao.task.branch,
        reason=f"atribuída pelo Worker Bridge a {worker_id!r} ({politica.reason})",
    )
    if not reserva.reservado or reserva.record is None:
        return BridgeOutcome("ALREADY_CLAIMED", reserva.reason, decision=decisao)
    registro = reserva.record
    execution_task_id = registro.execution_task_id or canonical_task_id

    try:
        runner_task = replace(validacao.task, task_id=execution_task_id)
    except ValueError as exc:  # pragma: no cover - o objeto já passou pelo contrato
        runtime_store.registrar_resultado(
            canonical_task_id, status=task_runtime.RUNTIME_BLOCKED, worker_id=worker_id,
            execution_task_id=execution_task_id,
            reason=f"id de execução recusado pelo contrato: {exc}",
        )
        return BridgeOutcome("BLOCKED", f"id de execução recusado pelo contrato: {exc}", decision=decisao)

    # 10. reserva do WORKER (compare-and-set). Perdeu: resultado BLOCKED
    # registrado, zero chamada paga, nenhum worker fantasma. A tarefa
    # fica fora da fila aguardando decisão explícita — nunca um retry
    # automático silencioso.
    if not worker_registry.reservar_current_task_condicional(
        worker_id, canonical_task_id=canonical_task_id,
        message=f"worker-bridge: reserva {worker_id} para {canonical_task_id}",
    ):
        motivo = (
            f"compare-and-set recusou a reserva do worker {worker_id!r} — ele deixou de estar "
            "AVAILABLE/livre entre a decisão e a escrita (outra execução o assumiu). Nada foi "
            "executado e nenhuma chamada paga aconteceu; a tarefa fica registrada como BLOCKED e "
            "só volta para a fila por decisão explícita."
        )
        runtime_store.registrar_resultado(
            canonical_task_id, status=task_runtime.RUNTIME_BLOCKED, worker_id=worker_id,
            execution_task_id=execution_task_id, reason=motivo,
        )
        return BridgeOutcome(
            "BLOCKED", motivo, decision=decisao, runner_task=runner_task,
            runtime_record=replace(registro, status=task_runtime.RUNTIME_BLOCKED, reason=motivo),
        )

    # 11. execução — infraestrutura EXISTENTE, com autorização supervised
    # construída só em código.
    runner_config = construir_config_do_runner(config, canonical_task_id=canonical_task_id)
    gerar_patch_efetivo = gerar_patch
    if patch is None and gerar_patch is None:
        gerar_patch_efetivo = _closure_de_geracao(
            runner_task, runner_config=runner_config, repo_dir=repo_dir,
            state_git_remote=state_git_remote, canonical_task_id=canonical_task_id,
            transport=transport, budget_usd=budget_usd,
        )

    dispatch = executar_tarefa(
        runner_task, patch,
        config=runner_config,
        repo_dir=repo_dir,
        state_git_remote=state_git_remote,
        validation_command_keys=validation_command_keys,
        push_remote_name=push_remote_name,
        sucesso_status="NEEDS-AUDIT",
        worker_id=worker_id,
        worker_registry=worker_registry,
        gerar_patch=gerar_patch_efetivo,
        canonical_task_id=canonical_task_id,
    )

    # 12. registro do resultado (CAS).
    resultado = dispatch.result
    status_runner = resultado.status if resultado else "FAILED"
    status_runtime = _RUNNER_STATUS_PARA_RUNTIME.get(status_runner, task_runtime.RUNTIME_FAILED)
    checkpoint = resultado.checkpoint_commit if resultado else None
    branch_final = (resultado.branch if resultado and resultado.branch else runner_task.branch)
    motivo_resultado = resultado.reason if resultado else "execução terminou sem RunnerResult."

    if status_runtime == task_runtime.RUNTIME_BLOCKED_LIMIT and not checkpoint:
        # Defesa em profundidade: o contrato já exige checkpoint em
        # BLOCKED-LIMIT, mas um limite SEM checkpoint nunca pode ser
        # registrado como retomável — vira BLOCKED, que exige decisão.
        status_runtime = task_runtime.RUNTIME_BLOCKED
        notes.append(
            "resultado BLOCKED-LIMIT sem checkpoint publicado — registrado como BLOCKED "
            "(uma tarefa interrompida por limite sem checkpoint não é retomável)."
        )

    if not runtime_store.registrar_resultado(
        canonical_task_id, status=status_runtime, worker_id=worker_id,
        execution_task_id=execution_task_id, reason=motivo_resultado,
        checkpoint_commit=checkpoint, branch=branch_final,
    ):
        notes.append(
            "compare-and-set recusou o registro do resultado — outra execução alterou o estado "
            "operacional desta tarefa; o estado mais novo NÃO foi sobrescrito."
        )
    registro_final = runtime_store.get(canonical_task_id) or registro

    # 13. liberação segura do worker.
    liberacao = liberar_worker_apos_resultado(
        worker_registry, worker_id, canonical_task_id=canonical_task_id,
        resultado_status=status_runtime,
    )
    if liberacao.action == "FAILED":
        notes.append(liberacao.reason)

    # 14. PR idempotente + Guard confiável.
    pr_outcome: PrOutcome | None = None
    guard_outcome: GuardDispatchOutcome | None = None
    if status_runtime in STATUS_QUE_ABREM_PR:
        pr_outcome, guard_outcome, notas_pr = _abrir_pr_e_guard(
            github_api, task=runner_task, tarefa=tarefa, meta=meta,
            canonical_task_id=canonical_task_id, worker_id=worker_id,
            checkpoint_commit=checkpoint, base_branch=base_branch,
            runtime_store=runtime_store, status_runtime=status_runtime,
        )
        notes.extend(notas_pr)
    else:
        notes.append(
            f"resultado {status_runner} não publica branch utilizável — nenhuma PR é aberta "
            "(BLOCKED/FAILED não têm nada publicado; BLOCKED-LIMIT segue por handoff/retomada)."
        )

    return BridgeOutcome(
        "DISPATCHED",
        (
            f"{canonical_task_id!r} executada por {worker_id!r} em modo supervisionado; resultado "
            f"do Runner: {status_runner} (estado operacional: {registro_final.status})."
        ),
        decision=decisao, runner_task=runner_task, runtime_record=registro_final,
        dispatch=dispatch, liberacao=liberacao, pr=pr_outcome, guard=guard_outcome,
        notes=tuple(notes),
    )


def _closure_de_geracao(
    runner_task: RunnerTask, *, runner_config: RunnerDispatchConfig, repo_dir: str,
    state_git_remote: str, canonical_task_id: str, transport: object | None,
    budget_usd: float | None,
):
    """A MESMA construção de ``checkpoint_handoff.despachar_continuacao_de_handoff``
    e de ``runner_resume.despachar_retomada``: reusa
    ``runner_generate.gerar_patch_via_claude`` com o ledger Anthropic
    GLOBAL e o MESMO teto mensal — nunca um segundo orçamento, nunca um
    teto próprio do Bridge. Import local (dentro do closure) para nunca
    criar ciclo de import."""
    def _gerar() -> object:
        from . import runner_generate
        from .budget import MONTHLY_BUDGET_USD
        from .git_state import GitJsonStore, GitUsageLedger

        ledger_global = GitUsageLedger(
            GitJsonStore(state_git_remote, branch=DEFAULT_RUNNER_USAGE_STATE_BRANCH)
        )
        return runner_generate.gerar_patch_via_claude(
            runner_task, config=runner_config, repo_dir=repo_dir,
            usage_ledger=ledger_global,
            budget_usd=(MONTHLY_BUDGET_USD if budget_usd is None else budget_usd),
            transport=transport,
            canonical_task_id=canonical_task_id,
        )

    return _gerar


def _abrir_pr_e_guard(
    github_api: bridge_pr.GitHubBridgeApi | None, *, task: RunnerTask, tarefa: TaskRecord,
    meta: BridgeTaskMetadata, canonical_task_id: str, worker_id: str,
    checkpoint_commit: str | None, base_branch: str, runtime_store: TaskRuntimeStore,
    status_runtime: str,
) -> tuple[PrOutcome | None, GuardDispatchOutcome | None, list[str]]:
    """§9 — PR idempotente e, depois dela, disparo EXPLÍCITO do Guard.

    A idempotência de cada um vem de um compare-and-set diferente, nunca
    de uma suposição: a PR é reutilizada quando já existe uma aberta para
    a branch, e o Guard só é despachado quando
    ``reservar_guard_dispatch`` consegue reservar o direito de despachar
    (ver o protocolo recuperável de ``task_runtime``, correção B4)."""
    notas: list[str] = []
    if github_api is None:
        notas.append(
            "nenhum cliente de API do GitHub fornecido — PR/Guard não foram tocados nesta "
            "execução (o resultado do Runner está publicado na branch de trabalho)."
        )
        return None, None, notas

    pr_outcome = bridge_pr.garantir_pr(
        github_api, task=task, canonical_task_id=canonical_task_id,
        worker_id=worker_id,
        worker_display=bridge_workers.BRIDGE_DISPLAY_NAMES.get(worker_id, worker_id),
        checkpoint_commit=checkpoint_commit, base_branch=base_branch,
        titulo_tarefa=meta.titulo, objetivo=meta.objetivo, area=tarefa.area,
        dependencias=tarefa.dependencias,
    )
    if pr_outcome.pr_number is None:
        notas.append(f"PR não disponível ({pr_outcome.action}): {pr_outcome.reason}")
        return pr_outcome, None, notas

    if not runtime_store.registrar_pr(
        canonical_task_id, pr_number=pr_outcome.pr_number, esperado_status=status_runtime
    ):
        notas.append(
            f"PR #{pr_outcome.pr_number} não foi registrada no estado operacional (já havia um "
            "número registrado ou o status mudou) — nenhuma PR duplicada foi criada."
        )

    # Correção B4 (PR #129): protocolo de três passos, porque marcar
    # "despachado" ANTES da chamada transformava uma falha de rede numa
    # PR que ficaria NEEDS-AUDIT sem Guard PARA SEMPRE (toda tentativa
    # seguinte recebia ALREADY_DISPATCHED). Agora: reserva (PENDING) ->
    # chamada -> confirma (DISPATCHED) ou marca falha (FAILED, do qual uma
    # próxima execução autorizada pode tentar de novo). ALREADY_DISPATCHED
    # passa a significar de fato "a chamada voltou com sucesso".
    if not runtime_store.reservar_guard_dispatch(
        canonical_task_id, pr_number=pr_outcome.pr_number
    ):
        return pr_outcome, GuardDispatchOutcome(
            "ALREADY_DISPATCHED",
            f"o Guard já foi despachado COM SUCESSO para a PR #{pr_outcome.pr_number} desta "
            "tarefa — não despacho de novo (idempotente).",
            pr_number=pr_outcome.pr_number,
        ), notas

    guard_outcome = bridge_pr.disparar_guard(
        github_api, pr_number=pr_outcome.pr_number, ref=base_branch
    )
    if guard_outcome.action == "FAILED":
        # A falha fica REGISTRADA como falha: é isso que deixa a próxima
        # execução autorizada tentar de novo em vez de acreditar que o
        # Guard já rodou.
        runtime_store.falhar_guard_dispatch(canonical_task_id, pr_number=pr_outcome.pr_number)
        notas.append(guard_outcome.reason)
        notas.append(
            f"o disparo do Guard para a PR #{pr_outcome.pr_number} ficou registrado como FAILED — "
            "uma próxima execução autorizada do Bridge pode tentar de novo (nada fica preso)."
        )
        return pr_outcome, guard_outcome, notas

    runtime_store.confirmar_guard_dispatch(canonical_task_id, pr_number=pr_outcome.pr_number)
    return pr_outcome, guard_outcome, notas


# ---------------------------------------------------------------------
# CLI — invocado por .github/workflows/coordinator-worker-bridge.yml.
# Nenhum argumento carrega prompt, tarefa ou caminho de arquivo a
# executar: a tarefa vem SEMPRE da fila confiável.
# ---------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description="Worker Bridge V1 (Issue #128) — uma atribuição por execução, nunca um laço."
    )
    ap.add_argument("--tasks-json", default=os.path.join("coordination", "tasks.json"))
    ap.add_argument("--repo-dir", default=".", help="checkout já confiável (branch padrão), nunca HEAD de PR")
    ap.add_argument("--state-git-remote", required=True, help="remoto das branches de estado (claim/resultado/ledger)")
    ap.add_argument("--worker-state-git-remote", required=True, help="remoto do Worker Registry operacional")
    ap.add_argument("--runtime-state-git-remote", required=True, help="remoto do estado operacional das tarefas")
    ap.add_argument("--base-branch", required=True, help="branch padrão: base da PR e ref confiável do Guard")
    ap.add_argument("--repo-owner", default=None, help="dono do repositório, para a API do GitHub")
    ap.add_argument("--repo-name", default=None, help="nome do repositório, para a API do GitHub")
    ap.add_argument(
        "--no-pr", action="store_true",
        help="não abre PR nem despacha o Guard (útil para uma execução de verificação).",
    )
    ap.add_argument(
        "--validation-command-keys", default=",".join(BRIDGE_VALIDATION_COMMAND_KEYS),
        help="chaves separadas por vírgula, só da allowlist FECHADA de runner_dispatch",
    )
    ap.add_argument("--budget-usd", type=float, default=None)
    ap.add_argument("--push-remote-name", default="origin")
    ap.add_argument("--out", default=None, help="onde gravar o BridgeOutcome em JSON (sanitizado)")
    return ap


def main(argv: list[str] | None = None) -> int:
    from .git_state import GitJsonStore
    from .redact import redact, redact_mapping
    from .worker_ops import DEFAULT_STATE_BRANCH as WORKER_STATE_BRANCH

    args = _build_arg_parser().parse_args(argv)
    config = WorkerBridgeConfig.from_env()

    api: bridge_pr.GitHubBridgeApi | None = None
    if not args.no_pr:
        if not args.repo_owner or not args.repo_name:
            print("ERRO fail-closed: --repo-owner e --repo-name são obrigatórios sem --no-pr.")
            return 1
        api = bridge_pr.GitHubRestApi(owner=args.repo_owner, repo=args.repo_name)

    worker_registry = OperationalWorkerRegistry(
        GitJsonStore(args.worker_state_git_remote, branch=WORKER_STATE_BRANCH)
    )
    runtime_store = TaskRuntimeStore(
        GitJsonStore(
            args.runtime_state_git_remote,
            branch=task_runtime.DEFAULT_TASK_RUNTIME_STATE_BRANCH,
        )
    )
    keys = tuple(k.strip() for k in args.validation_command_keys.split(",") if k.strip())

    try:
        outcome = executar_ciclo(
            config=config,
            tasks_json_path=args.tasks_json,
            repo_dir=args.repo_dir,
            state_git_remote=args.state_git_remote,
            worker_registry=worker_registry,
            runtime_store=runtime_store,
            base_branch=args.base_branch,
            github_api=api,
            validation_command_keys=keys,
            budget_usd=args.budget_usd,
            push_remote_name=args.push_remote_name,
        )
    except Exception as exc:  # qualquer erro inesperado -> job vermelho, nunca sucesso silencioso
        print(f"ERRO fail-closed: {redact(str(exc))}")
        return 1

    saida = json.dumps(redact_mapping(outcome.to_dict()), indent=2, ensure_ascii=False)
    print(saida)
    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(saida)

    if outcome.runner_result_status == "FAILED":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
