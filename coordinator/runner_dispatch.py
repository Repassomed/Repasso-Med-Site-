"""Execução controlada de ``RunnerTask`` por ``api_runner`` — Issue #105,
Fase D (``#105-D · Execução controlada``).

Decisão de José (Issue #105, comentário de decisão operacional): esta é
infraestrutura Nível D já autorizada — mas a ATIVAÇÃO real continua
DESLIGADA por flag (`REPASSO_RUNNER_ENABLED`). Esta rodada entrega o
MECANISMO; não liga a flag, não roda canário, não usa API real de LLM
nenhuma (não há chamada de IA em lugar nenhum deste módulo — a GERAÇÃO do
patch estruturado acontece FORA deste mecanismo; este módulo só recebe um
patch JÁ PRONTO, valida e aplica).

Fontes: Issue #105 inteira, CLAUDE.md (Áreas críticas, Regra Final),
``coordinator/runner_contract.py`` (contrato canônico ``RunnerTask``/
``RunnerHeartbeat``/``RunnerResult`` — consumido, nunca redefinido nem
alterado nesta rodada), ``coordinator/scheduler.py`` (mesmo vocabulário
de ``policy_level``/``risk_level``/``jose_authorized``, já auditado em 4
rodadas independentes do PR #108), ``coordinator/heartbeat.py`` (mesmo
``aplicar_heartbeat``, nunca reimplementado), ``coordinator/git_state.py``
(``GitJsonStore``/``claim_key`` — mesmo padrão de dedup/orçamento, agora
para reservar um ``task_id`` de forma atômica entre execuções
independentes do GitHub Actions).

---

**O QUE ESTE MÓDULO FAZ:**

1. ``RunnerDispatchConfig`` — o portão de segurança (Issue #105 §"SEGURANÇA
   OBRIGATÓRIA"): ``REPASSO_RUNNER_ENABLED`` precisa ser exatamente
   ``"true"``; ``REPASSO_RUNNER_MODE`` precisa ser um dos modos permitidos;
   e a tarefa precisa estar EXPLICITAMENTE autorizada. Qualquer outra
   combinação falha fechado, SEM NENHUMA chamada externa (nem git remoto,
   nem subprocess de teste) — provado em teste. Dois modos, separados
   ponta a ponta:

   - ``canary`` (Issue #105, inalterado): autoriza só o ``task_id``
     configurado em ``REPASSO_RUNNER_CANARY_TASK_ID``;
   - ``supervised`` (Issue #128 §5, ADITIVO): a Variable do canário não
     autoriza nada; a autorização vem do Worker Bridge confiável
     (``coordinator/worker_bridge.py``), em campos que NÃO existem como
     variável de ambiente — ver ``RUNNER_MODE_SUPERVISED`` e
     ``SUPERVISED_AUTHORIZATION_SOURCE`` abaixo.

2. ``StructuredPatch``/``FileWrite`` — o "patch estruturado" que a Issue
   #105 exige em vez de shell arbitrário gerado pelo modelo: uma lista de
   caminho+conteúdo completo de arquivo, nunca um diff unificado livre
   nem um comando de shell. Cada caminho é validado sintaticamente na
   própria construção (não-vazio, não-absoluto, sem ``..``) e, antes de
   qualquer aplicação, contra o conjunto EXATO de ``RunnerTask.
   allowed_files`` (nunca glob — "allowed_files precisa ser exato").

3. ``ALLOWED_VALIDATION_COMMANDS`` — allowlist FECHADA de comandos de
   validação (Issue #105: "testes e comandos devem vir de uma allowlist
   declarada, não de texto gerado pelo modelo"). ``executar_tarefa``
   recebe só CHAVES desta tabela, nunca texto de comando; uma chave fora
   da allowlist é rejeitada antes de qualquer subprocesso rodar.

4. ``RunnerClaimStore`` — reserva atômica de ``task_id`` numa branch de
   estado DEDICADA (``coordinator-state-runner``, nunca ``main``, nunca
   matéria), reaproveitando ``git_state.GitJsonStore.claim_key()`` (mesma
   peça que já resolve a mesma classe de problema para dedup de evento e
   orçamento — nunca uma segunda implementação de compare-and-swap).
   Depois de reivindicado, um ``task_id`` NUNCA pode ser reivindicado de
   novo — inclusive depois de ``FAILED``: isto é deliberado (Issue #105:
   "falha não pode virar retry automático silencioso"). Retomar exige uma
   ``RunnerTask`` NOVA (outro ``task_id``), decisão humana/do Coordinator,
   nunca um laço automático deste módulo.

5. ``executar_tarefa`` — a orquestração completa: gate → autorização do
   ``task_id`` → heartbeat inicial (``BUSY``, via ``runner_contract.
   RunnerHeartbeat``/``heartbeat.aplicar_heartbeat`` — nunca um dict solto)
   → claim atômico → validação do patch contra ``allowed_files`` (antes de
   tocar em qualquer arquivo) → preparo da branch (a partir de
   ``checkpoint_commit`` quando presente, nunca inventando um ponto de
   partida) → aplicação do patch → comparação do DIFF INTEIRO contra
   ``allowed_files`` (defesa em profundidade — não só o que o patch
   *declarou* tocar, o que ele *de fato* tocou) → comandos de validação da
   allowlist → commit + push (nunca ``--force``) → ``RunnerResult``
   (``DONE``/``NEEDS-AUDIT``/``BLOCKED``/``FAILED`` — nunca
   ``MERGE-READY``, que nem existe como valor possível) → heartbeat final
   (``OFFLINE`` — o job efêmero termina, não fica "disponível" sozinho) →
   registro auditável do resultado na mesma branch de estado do claim.

**INVARIANTES ABSOLUTOS (herdados de ``runner_contract.py``, nunca
reimplementados nem enfraquecidos aqui):**

- nunca merge — nenhuma linha deste módulo chama uma API de merge nem
  ``git merge``;
- nunca publica/deploya — nenhuma chamada de Netlify, nenhuma escrita em
  Supabase, nenhuma alteração de matéria;
- nunca força push nem rebase destrutivo — ``git push`` sem ``--force``
  em NENHUM lugar deste arquivo (prova estrutural em
  ``test_no_forbidden_writes.py``); um push rejeitado (branch divergida)
  vira ``FAILED``, nunca um retry com força;
- nunca escreve fora de ``allowed_files`` — validado ANTES de aplicar
  (patch declarado) e DEPOIS de aplicar (diff real), com bloqueio sem
  commit/push nos dois casos;
- ``RunnerResult.status == "DONE"`` nunca é ``MERGE-READY`` —
  ``RunnerResult.merge_ready`` é sempre ``False`` (propriedade do
  contrato canônico, nunca lida como permissão aqui);
- Nível E (Issue #83) nunca chega a existir como ``RunnerTask`` válida —
  rejeitado na própria construção do contrato, antes de qualquer código
  deste módulo rodar; Nível D sem ``jose_authorized=True`` idem.

**Correção B2 (auditoria independente do PR #114):** a orquestração
determinística (``executar_tarefa``) continua, ela mesma, SEM NENHUMA
chamada de IA — nenhuma linha deste módulo importa ``anthropic``/
``coordinator.anthropic_client`` no nível do módulo. A conexão "RunnerTask
autorizada → Claude/Anthropic API → StructuredPatch" existe como uma
camada SEPARADA (``coordinator/runner_generate.py``, nunca reimplementando
transporte/orçamento/redação — reaproveita ``anthropic_client.build_request``/
``call``, ``anthropic_transport.AnthropicTransport``, ``budget.CallLimiter``/
``check_budget``/``priority_allowed``, ``redact.redact``, todos JÁ
existentes) que só é importada (``import`` local, dentro da função) e só
é chamada quando o CLI recebe explicitamente ``--generate-via-claude`` em
vez de ``--patch-file``. A GERAÇÃO em si nunca aplica/comita nada — devolve
só um ``StructuredPatch`` já validado (ou ``BLOCKED``/``FAILED``, nunca um
patch parcial) para este módulo aplicar/validar/comitar da MESMA forma
determinística de sempre.

**Correções da 2ª auditoria independente do PR #114 (B2-A/B2-B/B2-C):**

- **B2-A:** o workflow de produção (``.github/workflows/coordinator-runner.yml``)
  agora usa ``--generate-via-claude`` no caminho REAL do canário (nunca
  mais ``--patch-file`` nesse passo) — ``ANTHROPIC_API_KEY`` só existe
  como env do MESMO passo já gated pelos 4 portões (ENABLED + MODE +
  CANARY_TASK_ID + ref). ``--patch-file`` continua existindo NESTE CLI só
  para uso manual/teste (mutuamente exclusivo com ``--generate-via-claude``,
  como antes), nunca é o que o workflow real dispara.
- **B2-B:** ``--usage-ledger`` (arquivo local) foi REMOVIDO — substituído
  por ``--usage-git-remote``/``--usage-git-branch``, que constroem um
  ``coordinator.git_state.GitUsageLedger`` (persistente entre execuções
  efêmeras do GitHub Actions, numa branch de estado dedicada,
  ``DEFAULT_RUNNER_USAGE_STATE_BRANCH``) — o MESMO mecanismo que já
  persiste dedup/orçamento do Coordinator OBSERVE, nunca um ledger
  paralelo/local para o custo mensal real do Runner. (A branch em si — se
  é a MESMA do Coordinator ou uma separada — é decidida pela correção B4,
  abaixo; B2-B só trocou "arquivo local" por "``GitUsageLedger``
  persistente", sem decidir ainda QUAL branch.)
- **B2-C:** ``runner_generate.gerar_patch_via_claude`` nunca corta/trunca
  conteúdo de arquivo silenciosamente. Um ``allowed_file`` maior do que
  pode ser enviado integralmente ao modelo bloqueava fail-closed (zero
  chamada, zero patch); desde a Issue #144 ele segue pelo caminho
  ANCORADO (``AnchoredEdit``) — ver o rodapé deste docstring.

**Correções da 3ª auditoria independente do PR #114 (B3/B4):**

- **B3 (claim ANTES da chamada Anthropic paga):** antes desta correção, o
  CLI (``main()``) chamava ``runner_generate.gerar_patch_via_claude``
  ANTES de ``executar_tarefa`` — ou seja, ANTES do claim atômico do
  ``task_id``. Isso permitia que o MESMO ``task_id``, disparado de novo
  (repetição/retry manual do canário), gastasse uma segunda chamada paga
  antes de descobrir que já havia sido reivindicado. ``executar_tarefa``
  agora aceita ``patch=None`` junto de um novo parâmetro ``gerar_patch``
  (uma função sem argumento, chamada NO LUGAR de receber um patch já
  pronto) — o claim (camada já existente, inalterada) continua sendo a
  PRIMEIRA chamada externa depois do portão/autorização, e só DEPOIS de
  ``claimed is True`` é que ``gerar_patch()`` é invocada. Uma execução que
  perde o claim (``claimed=False``) NUNCA chega a chamar ``gerar_patch``
  — devolve ``BLOCKED`` com **zero chamada Anthropic**, exatamente como já
  acontecia para o caminho ``--patch-file``. Um único ``RunnerClaimStore``
  é usado do início ao fim (claim + ``registrar_resultado`` final,
  inclusive quando a própria geração falha) — nunca dois claims
  divergentes, nunca uma segunda instância de ``GitJsonStore`` para o
  mesmo ``task_id``.
- **B4 (teto Anthropic GLOBAL da Issue #84, não um segundo teto do
  Runner):** antes desta correção, ``--usage-git-branch`` do Runner tinha
  DEFAULT ``coordinator-state-runner-usage`` — uma branch de estado
  SEPARADA da que o Coordinator OBSERVE já usa (``coordinator-state-usage``,
  default de ``coordinator/__main__.py --usage-git-branch``). Isso criava
  DOIS tetos mensais de US$20 implícitos (um por sistema), quando a Issue
  #84 define um teto ÚNICO para o gasto Anthropic total. O default agora é
  ``coordinator-state-usage`` — a MESMA branch/ledger que o Coordinator já
  lê/escreve — então ``check_budget``/``priority_allowed`` em
  ``runner_generate.gerar_patch_via_claude`` decidem sobre o gasto
  Anthropic TOTAL (Coordinator + Runner), nunca um subconjunto. OpenAI
  continua com seu próprio ledger separado (``coordinator-state-usage-openai``,
  inalterado, fora de escopo aqui — a Issue #84 nunca uniu os dois
  provedores).

**O QUE ESTE MÓDULO DELIBERADAMENTE NÃO FAZ (fora de escopo desta
rodada):** não conecta com ``scheduler.py`` (nenhuma chamada a
``escolher_proxima_atribuicao``/``avaliar_handoff_de_tarefa`` — isso é
Fase E, handoff automático); não implementa retomada automática (Fase F);
não toca ``coordination/tasks.json``; não define nenhuma tarefa/patch de
canário real (``coordinator/runner_tasks/`` fica vazio nesta rodada — o
mecanismo existe, o conteúdo autorizado por José vem depois, numa decisão
separada).

**Issue #144 — edição por trecho/âncora em arquivos grandes:** este
módulo NÃO muda para essa capacidade, e é de propósito. ``AnchoredEdit``
é uma operação de GERAÇÃO: ``runner_generate`` extrai trechos do arquivo
grande, valida a unicidade de cada âncora e resolve tudo EM MEMÓRIA,
entregando aqui exatamente o que este módulo já sabia receber — um
``StructuredPatch`` de ``FileWrite`` com o conteúdo final COMPLETO de
cada arquivo. Portanto ``aplicar_patch``, ``validar_patch_contra_
allowed_files``, ``arquivos_alterados`` (o diff REAL conferido contra
``allowed_files``), o claim, o Guard, o ``NEEDS-AUDIT`` e o "nunca
merge/force-push/deploy" continuam sendo exatamente os mesmos, sem uma
linha de exceção para o caminho ancorado.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

from .git_state import GitJsonStore
from .heartbeat import aplicar_heartbeat
from .redact import redact, redact_mapping
from .runner_contract import RunnerHeartbeat, RunnerResult, RunnerTask
from .worker_ops import DEFAULT_STATE_BRANCH as WORKER_STATE_BRANCH
from .worker_ops import OperationalWorkerRegistry

# ---------------------------------------------------------------------
# Config / portão de segurança
# ---------------------------------------------------------------------

ENV_RUNNER_ENABLED = "REPASSO_RUNNER_ENABLED"
ENV_RUNNER_MODE = "REPASSO_RUNNER_MODE"
ENV_RUNNER_CANARY_TASK_ID = "REPASSO_RUNNER_CANARY_TASK_ID"
# Correção B1 (auditoria independente do PR #114): workflow_dispatch pode
# ser disparado manualmente a partir de QUALQUER ref do repositório — o
# arquivo de workflow de fato EXECUTADO é o da ref escolhida no disparo,
# não necessariamente o da branch padrão, mesmo que o passo de checkout
# desta rodada já fixe explicitamente `github.event.repository.default_branch`
# para o CONTEÚDO do repositório. Estas duas variáveis deixam o workflow
# preencher os dois lados da comparação e o portão (`gate()`) fecha
# fail-closed ANTES de qualquer escrita quando eles não batem.
ENV_RUNNER_ACTUAL_REF = "REPASSO_RUNNER_ACTUAL_REF"
ENV_RUNNER_EXPECTED_REF = "REPASSO_RUNNER_EXPECTED_REF"

# Modo do canário — Issue #105: "modo inicial obrigatório: canary".
# Continua EXATAMENTE como era: mesmo nome, mesma semântica, mesma
# autorização por REPASSO_RUNNER_CANARY_TASK_ID.
ALLOWED_RUNNER_MODE = "canary"

# Segundo modo, ADITIVO — Issue #128 (Worker Bridge V1), §5. Mesma
# filosofia de coordinator/config.py (ALLOWED_MODES: observe +
# active-supervised): um valor novo só passa a ser aceito numa rodada que
# o adicione explicitamente, nunca por engano.
#
# A DIFERENÇA que é segurança, não conveniência: no modo ``supervised``,
# REPASSO_RUNNER_CANARY_TASK_ID NÃO autoriza nada. A autorização precisa
# vir do Worker Bridge confiável (``coordinator/worker_bridge.py``),
# executado a partir da branch padrão depois de: tarefa declarativa
# válida, portão do Bridge aberto, reserva/claim de runtime vencido,
# portão de política (Nível E nunca; D só com jose_authorized) e worker
# programático compatível. Por isso os dois campos que carregam essa
# autorização (``supervised_task_id``/``supervised_authorized_by``) NUNCA
# são lidos de variável de ambiente: ``from_env`` não os preenche, e
# nenhum input de workflow tem como escolher um task_id.
RUNNER_MODE_SUPERVISED = "supervised"
ALLOWED_RUNNER_MODES: frozenset[str] = frozenset({ALLOWED_RUNNER_MODE, RUNNER_MODE_SUPERVISED})

# Marcador da única origem de autorização aceita no modo ``supervised``.
# É comparado por igualdade estrita e só pode ser atribuído em CÓDIGO
# (``worker_bridge.construir_config_do_runner``) — nunca vem de env,
# input, arquivo de tarefa ou texto de modelo.
SUPERVISED_AUTHORIZATION_SOURCE = "worker-bridge"

DEFAULT_RUNNER_STATE_BRANCH = "coordinator-state-runner"
# Correção B4 (3ª auditoria independente do PR #114): branch do ledger
# Anthropic GLOBAL — a MESMA que coordinator/__main__.py usa como default
# de --usage-git-branch para o Coordinator OBSERVE. A 2ª rodada (B2-B)
# tinha introduzido uma branch SEPARADA aqui ("coordinator-state-runner-
# usage"), o que criava um segundo teto mensal de US$20 implícito — a
# Issue #84 define um teto ÚNICO para o gasto Anthropic total (Coordinator
# + Runner). Nunca renomear esta constante para sugerir "é só do Runner":
# o valor em si É o ponto — precisa continuar igual ao default real do
# Coordinator, nunca divergir de novo por um refactor futuro que não
# perceba a ligação. OpenAI continua com seu próprio ledger separado
# ("coordinator-state-usage-openai"), fora de escopo aqui.
DEFAULT_RUNNER_USAGE_STATE_BRANCH = "coordinator-state-usage"


@dataclass(frozen=True)
class RunnerGateResult:
    open: bool
    reason: str


@dataclass(frozen=True)
class RunnerDispatchConfig:
    enabled: bool
    mode: str
    canary_task_id: str | None
    # Correção B1 (auditoria independente do PR #114). ``None``/``None``
    # (o padrão) não impõe restrição nenhuma — mesma aditividade de
    # ``Config.pilot_allows`` em coordinator/config.py, para que chamadas
    # diretas/testes fora do workflow real continuem funcionando sem
    # precisar simular um `ref` git. Em produção, o workflow SEMPRE
    # preenche os dois (`REPASSO_RUNNER_ACTUAL_REF`=``github.ref``,
    # `REPASSO_RUNNER_EXPECTED_REF`=``refs/heads/<default_branch>``), então
    # a checagem real fica sempre ativa no único lugar em que isto importa.
    actual_ref: str | None = None
    expected_ref: str | None = None
    # Issue #128 §5 — SÓ preenchidos em código pelo Worker Bridge
    # confiável (ver SUPERVISED_AUTHORIZATION_SOURCE acima).
    # ``from_env`` nunca os preenche: uma config montada só a partir do
    # ambiente, em modo ``supervised``, tem portão FECHADO por definição.
    supervised_task_id: str | None = None
    supervised_authorized_by: str | None = None

    @property
    def mode_allowed(self) -> bool:
        return self.mode in ALLOWED_RUNNER_MODES

    @property
    def is_supervised(self) -> bool:
        return self.mode == RUNNER_MODE_SUPERVISED

    @property
    def supervised_authorization_ok(self) -> bool:
        """Fail-closed: no modo ``supervised``, os DOIS campos precisam
        estar preenchidos E a origem precisa ser exatamente o marcador do
        Worker Bridge. Um estado parcial nunca é tratado como seguro —
        mesma regra de ``ref_allowed``."""
        if not self.is_supervised:
            return False
        return (
            bool(self.supervised_task_id)
            and self.supervised_authorized_by == SUPERVISED_AUTHORIZATION_SOURCE
        )

    @property
    def ref_allowed(self) -> bool:
        """Fail-closed: com os dois campos ausentes, não restringe nada
        (chamada direta fora do workflow real). Com qualquer um dos dois
        presente, os DOIS precisam estar presentes e serem EXATAMENTE
        iguais — um estado parcialmente configurado nunca é tratado como
        seguro."""
        if self.actual_ref is None and self.expected_ref is None:
            return True
        return bool(self.actual_ref) and bool(self.expected_ref) and self.actual_ref == self.expected_ref

    def gate(self) -> RunnerGateResult:
        """A decisão de segurança. Chamada ANTES de qualquer outra coisa
        em ``executar_tarefa`` — enquanto fechado, nenhuma linha depois
        deste ponto roda (nem claim, nem git, nem subprocess)."""
        if not self.ref_allowed:
            return RunnerGateResult(
                False,
                f"ref do disparo ({self.actual_ref!r}) não corresponde à branch padrão "
                f"esperada ({self.expected_ref!r}) — portão fechado fail-closed ANTES de "
                "qualquer escrita (correção B1, auditoria independente do PR #114): "
                "workflow_dispatch pode ser disparado manualmente a partir de qualquer ref "
                "do repositório; só a branch padrão é confiável para uma execução com "
                "contents:write.",
            )
        if not self.mode_allowed:
            return RunnerGateResult(
                False,
                f"{ENV_RUNNER_MODE}={self.mode!r} não é o único modo permitido nesta fase "
                f"({ALLOWED_RUNNER_MODE!r}) — portão fechado, mesmo que ENABLED=true.",
            )
        if not self.enabled:
            return RunnerGateResult(
                False,
                f"{ENV_RUNNER_ENABLED}=false (ou ausente) — nenhuma execução de runner é "
                "permitida enquanto o portão estiver fechado.",
            )
        if self.is_supervised:
            # Issue #128 §5: aqui a Variable do canário não autoriza NADA.
            # Sem a autorização injetada em código pelo Worker Bridge
            # confiável, o portão fica fechado — inclusive (e
            # principalmente) quando alguém configura
            # REPASSO_RUNNER_MODE=supervised na mão e dispara o workflow
            # do Runner direto.
            if not self.supervised_authorization_ok:
                return RunnerGateResult(
                    False,
                    f"{ENV_RUNNER_MODE}={RUNNER_MODE_SUPERVISED!r} exige autorização vinda do Worker "
                    f"Bridge confiável (Issue #128 §5): supervised_task_id preenchido e "
                    f"supervised_authorized_by=={SUPERVISED_AUTHORIZATION_SOURCE!r}, atribuídos só em "
                    f"código. Recebido supervised_task_id={self.supervised_task_id!r}, "
                    f"supervised_authorized_by={self.supervised_authorized_by!r} — portão fechado "
                    f"fail-closed. {ENV_RUNNER_CANARY_TASK_ID} nunca autoriza uma execução supervisionada.",
                )
            return RunnerGateResult(
                True,
                f"portão aberto: modo {self.mode!r}, tarefa autorizada pelo Worker Bridge "
                f"{self.supervised_task_id!r}.",
            )
        if not self.canary_task_id:
            return RunnerGateResult(
                False,
                f"{ENV_RUNNER_CANARY_TASK_ID} não configurado — sem task_id autorizado, "
                "nenhuma execução é permitida (fail-closed, nunca 'qualquer tarefa passa').",
            )
        return RunnerGateResult(
            True, f"portão aberto: modo {self.mode!r}, canário autorizado {self.canary_task_id!r}."
        )

    def task_autorizada(self, task_id: str, *, canonical_task_id: str | None = None) -> bool:
        """Só o canário autorizado passa — nunca um prefixo, nunca uma
        lista, nunca "qualquer tarefa Nível C". Sempre comparação
        ESTRITA de string, das duas formas possíveis:

        1. **execução inicial** (``canonical_task_id is None``): o
           PRÓPRIO ``task_id`` precisa ser EXATAMENTE
           ``REPASSO_RUNNER_CANARY_TASK_ID`` — o comportamento de sempre,
           inalterado para todo chamador existente;
        2. **continuação/retomada** (achado G3, Issue #105 Fase G):
           ``task.task_id`` é um id de EXECUÇÃO derivado
           (``handoff_exec.derivar_task_id_de_continuacao`` ->
           ``...--continuacao-<checkpoint>``; ``runner_resume.
           avaliar_retomada`` -> ``...--resume-<checkpoint>``), porque
           ``RunnerClaimStore`` reivindica o ``task_id`` PERMANENTEMENTE
           na primeira execução. Nesse caso quem autoriza é o
           ``canonical_task_id`` EXPLÍCITO — que precisa ser EXATAMENTE
           igual a ``REPASSO_RUNNER_CANARY_TASK_ID``.

        O que isto deliberadamente NÃO faz (a parte que é segurança, não
        conveniência): nunca ``startswith``/prefixo/sufixo, nunca INFERIR
        o canônico removendo ``--continuacao-``/``--resume-`` de um
        ``task_id``, e nunca aceitar um execution id arbitrário só porque
        "parece" derivado do canário. O ``canonical_task_id`` só chega
        aqui pelo CÓDIGO CONFIÁVEL que já conhece a identidade canônica
        (``scheduler.TaskRecord.id``/``InterruptedTaskSnapshot.
        canonical_task_id``/``handoff_exec`` — ver
        ``executar_tarefa``/``runner_generate.gerar_patch_via_claude``);
        nunca de um arquivo de tarefa, de um input de workflow ou de
        texto de comentário.

        **Modo ``supervised`` (Issue #128 §5):** a mesma regra, com a
        outra fonte de autorização — ``supervised_task_id``, atribuído só
        em código pelo Worker Bridge. ``canary_task_id`` é IGNORADO aqui
        de propósito: uma execução supervisionada nunca é autorizada pela
        Variable do canário, e uma execução de canário nunca é autorizada
        pelo Bridge. Os dois caminhos continuam separados ponta a ponta.
        """
        if self.is_supervised:
            if not self.supervised_authorization_ok:
                return False
            alvo = canonical_task_id if canonical_task_id is not None else task_id
            return alvo == self.supervised_task_id
        if not self.canary_task_id:
            return False
        if canonical_task_id is None:
            return task_id == self.canary_task_id
        return canonical_task_id == self.canary_task_id

    @classmethod
    def from_env(cls, env: dict | None = None) -> "RunnerDispatchConfig":
        src = env if env is not None else os.environ
        enabled_raw = src.get(ENV_RUNNER_ENABLED, "false")
        mode_raw = src.get(ENV_RUNNER_MODE, ALLOWED_RUNNER_MODE)
        canary = src.get(ENV_RUNNER_CANARY_TASK_ID) or None
        actual_ref = src.get(ENV_RUNNER_ACTUAL_REF) or None
        expected_ref = src.get(ENV_RUNNER_EXPECTED_REF) or None
        # Issue #128 §5: ``supervised_task_id``/``supervised_authorized_by``
        # NÃO são lidos do ambiente — nem aqui, nem em lugar nenhum. Não
        # existe nome de variável de ambiente para eles, então nem uma
        # Variable do repositório nem um input de workflow consegue
        # autorizar uma tarefa supervisionada. A única atribuição possível
        # é em código, por ``worker_bridge.construir_config_do_runner``.
        return cls(
            enabled=(enabled_raw == "true"), mode=mode_raw, canary_task_id=canary,
            actual_ref=actual_ref, expected_ref=expected_ref,
        )


# ---------------------------------------------------------------------
# Patch estruturado — nunca shell arbitrário, nunca diff unificado livre.
# ---------------------------------------------------------------------

@dataclass(frozen=True)
class FileWrite:
    """Uma operação: escrever o conteúdo COMPLETO de um arquivo num
    caminho. Deliberadamente não é um diff unificado (``patch``/``git
    apply``) — um diff livre poderia codificar contexto ambíguo ou
    metacaracteres; conteúdo completo é trivial de validar e de aplicar
    sem interpretação nenhuma."""

    path: str
    content: str

    def __post_init__(self) -> None:
        caminho = (self.path or "").strip()
        if not caminho:
            raise ValueError("FileWrite.path não pode ser vazio.")
        if caminho.startswith("/"):
            raise ValueError(f"FileWrite.path {caminho!r} não pode ser absoluto.")
        if ".." in caminho.split("/"):
            raise ValueError(f"FileWrite.path {caminho!r} contém '..' — possível escape de diretório.")
        if not isinstance(self.content, str):
            raise ValueError(
                "FileWrite.content precisa ser texto — patch estruturado nunca carrega shell/binário opaco."
            )


@dataclass(frozen=True)
class StructuredPatch:
    files: tuple[FileWrite, ...]

    def __post_init__(self) -> None:
        if not self.files:
            raise ValueError("StructuredPatch sem nenhum FileWrite — patch vazio não é válido.")
        caminhos = [fw.path for fw in self.files]
        duplicados = sorted({c for c in caminhos if caminhos.count(c) > 1})
        if duplicados:
            raise ValueError(f"StructuredPatch com caminho(s) duplicado(s): {duplicados}")

    @classmethod
    def from_dict(cls, d: dict) -> "StructuredPatch":
        arquivos = d.get("files")
        if not arquivos:
            raise ValueError("patch estruturado sem 'files' (ou vazio).")
        return cls(files=tuple(FileWrite(path=f["path"], content=f["content"]) for f in arquivos))

    def to_dict(self) -> dict:
        return {"files": [{"path": fw.path, "content": fw.content} for fw in self.files]}


def validar_patch_contra_allowed_files(patch: StructuredPatch, task: RunnerTask) -> tuple[bool, list[str]]:
    """Verificação PRÉVIA (antes de tocar em qualquer arquivo): todo
    caminho que o patch declara precisa estar no conjunto EXATO de
    ``task.allowed_files`` — "allowed_files precisa ser exato" (Issue
    #105), nunca um prefixo nem um glob."""
    permitidos = set(task.allowed_files)
    fora = sorted({fw.path for fw in patch.files if fw.path not in permitidos})
    return (not fora, fora)


def carregar_patch_de_arquivo(caminho: str) -> StructuredPatch:
    with open(caminho, encoding="utf-8") as fh:
        dados = json.load(fh)
    return StructuredPatch.from_dict(dados)


def carregar_runner_task_de_arquivo(caminho: str) -> RunnerTask:
    """Fail-closed por construção: qualquer violação do contrato canônico
    (branch protegida, Nível E, Nível D sem autorização, allowed_files
    vazio/inválido, checkpoint que não é SHA, etc.) levanta ``ValueError``
    aqui, vindo do próprio ``RunnerTask.__post_init__`` — este módulo
    nunca reimplementa nem contorna essas checagens."""
    with open(caminho, encoding="utf-8") as fh:
        dados = json.load(fh)
    return RunnerTask.from_dict(dados)


# ---------------------------------------------------------------------
# Allowlist FECHADA de comandos de validação — nunca texto gerado pelo
# modelo. Só a tabela de produção (módulo-level, nunca aceita override em
# produção) é usada pela CLI; testes podem injetar uma tabela própria só
# para isolar o subprocesso do checkout real do repositório completo.
# ---------------------------------------------------------------------

ALLOWED_VALIDATION_COMMANDS: dict[str, tuple[str, ...]] = {
    "coordinator-suite": (sys.executable, "-m", "coordinator.tests.run_all"),
}

# Achado G8-B (auditoria independente do PR #118): a execução INICIAL do
# canário roda a suíte porque o workflow passa
# `--validation-command-keys coordinator-suite`. Os dois caminhos
# AUTOMÁTICOS (continuação de handoff e retomada da Fase F) não têm
# workflow nenhum passando isso — e, com o default vazio, o Stage 2 e o
# Stage 3 poderiam aplicar/commitar/pushar SEM rodar a suíte. Isso
# quebraria a equivalência de segurança entre as três execuções.
#
# Esta constante é a allowlist de validação do canário, literal e fixa em
# código: os caminhos confiáveis (``checkpoint_handoff`` e
# ``worker_commands``/``runner_resume``) a propagam explicitamente. Ela é
# uma tupla de CHAVES da allowlist acima, nunca um comando de shell —
# comentário, input livre e texto de modelo continuam sem qualquer via
# para escolher o que roda.
CANARY_VALIDATION_COMMAND_KEYS: tuple[str, ...] = ("coordinator-suite",)


class RunnerCommandNaoPermitido(ValueError):
    pass


def executar_comandos_validacao(
    repo_dir: str, keys: tuple[str, ...], *, allowlist: dict[str, tuple[str, ...]] | None = None
) -> tuple[bool, list[dict]]:
    """Roda, em sequência, cada comando (por CHAVE, nunca texto livre) da
    allowlist. Uma chave fora da allowlist levanta ``RunnerCommandNaoPermitido``
    ANTES de rodar qualquer subprocesso — fail-closed, nunca "roda os que
    reconhece e ignora o resto"."""
    tabela = allowlist if allowlist is not None else ALLOWED_VALIDATION_COMMANDS
    for chave in keys:
        if chave not in tabela:
            raise RunnerCommandNaoPermitido(
                f"comando de validação {chave!r} não está na allowlist declarada "
                f"({sorted(tabela)!r}) — nada roda, fail-closed."
            )

    resultados: list[dict] = []
    tudo_ok = True
    for chave in keys:
        comando = tabela[chave]
        r = subprocess.run(comando, cwd=repo_dir, capture_output=True, text=True)
        ok = r.returncode == 0
        tudo_ok = tudo_ok and ok
        resultados.append({
            "key": chave,
            "returncode": r.returncode,
            "ok": ok,
            "stdout_tail": redact(r.stdout[-2000:]),
            "stderr_tail": redact(r.stderr[-2000:]),
        })
        if not ok:
            break  # primeira falha já basta para bloquear — nunca continuar acumulando efeito.
    return tudo_ok, resultados


# ---------------------------------------------------------------------
# Transporte git mínimo — trabalha num workdir JÁ CHECKED OUT (o mesmo
# checkout confiável que o workflow já fez a partir da branch padrão;
# este módulo nunca clona nem faz checkout de HEAD de PR nenhum).
# ---------------------------------------------------------------------

class RunnerGitError(RuntimeError):
    pass


def _run_git(repo_dir: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", repo_dir, *args], capture_output=True, text=True)


def preparar_branch_de_trabalho(repo_dir: str, task: RunnerTask) -> str:
    """Cria/faz checkout da branch da tarefa. Se ``task.checkpoint_commit``
    estiver preenchido, retoma EXATAMENTE dali (nunca inventa um ponto de
    partida); senão, parte do HEAD atual do checkout confiável. Devolve o
    SHA do commit-base (usado depois para descartar um patch inválido sem
    deixar sujeira no workdir)."""
    if task.checkpoint_commit:
        r = _run_git(repo_dir, "checkout", "-B", task.branch, task.checkpoint_commit)
    else:
        r = _run_git(repo_dir, "checkout", "-b", task.branch)
    if r.returncode != 0:
        raise RunnerGitError(f"não consegui preparar a branch {task.branch!r}: {redact(r.stderr)}")

    base = _run_git(repo_dir, "rev-parse", "HEAD")
    if base.returncode != 0:
        raise RunnerGitError(f"não consegui identificar o commit-base: {redact(base.stderr)}")
    return base.stdout.strip()


def aplicar_patch(repo_dir: str, patch: StructuredPatch) -> None:
    for fw in patch.files:
        destino = os.path.join(repo_dir, fw.path)
        # Defesa em profundidade: FileWrite.__post_init__ já rejeita '..'
        # e caminho absoluto, mas confirmamos de novo que o destino final
        # continua DENTRO de repo_dir antes de escrever qualquer coisa.
        raiz = os.path.realpath(repo_dir)
        alvo = os.path.realpath(destino)
        if os.path.commonpath([raiz, alvo]) != raiz:
            raise RunnerGitError(f"caminho {fw.path!r} escaparia de {repo_dir!r} — recusado.")
        os.makedirs(os.path.dirname(destino) or repo_dir, exist_ok=True)
        with open(destino, "w", encoding="utf-8") as fh:
            fh.write(fw.content)


def arquivos_alterados(repo_dir: str) -> list[str]:
    """O DIFF REAL depois de aplicar o patch — nunca só o que o patch
    *declarou* tocar. ``git add -A`` inclui arquivos novos (untracked)
    na comparação; ``git diff --cached --name-only`` lista tudo que
    mudaria no próximo commit."""
    _run_git(repo_dir, "add", "-A")
    r = _run_git(repo_dir, "diff", "--cached", "--name-only")
    return [linha for linha in r.stdout.splitlines() if linha.strip()]


def resetar_workdir(repo_dir: str, commit_base: str) -> None:
    """Descarta qualquer mudança local não publicada, voltando ao
    commit-base — só usado ANTES de qualquer push (nunca depois), e só
    na branch de trabalho local desta própria execução, nunca em
    ``main``/``master`` nem em qualquer branch compartilhada já
    publicada. Isto não é um force-push nem afeta histórico remoto
    nenhum: é limpar um workdir descartável."""
    _run_git(repo_dir, "reset", "--hard", commit_base)
    _run_git(repo_dir, "clean", "-fd")


def _primeira_linha(texto: str) -> str:
    return (texto or "").strip().splitlines()[0][:72] if texto and texto.strip() else "(sem instrução)"


RUNNER_GIT_AUTHOR_NAME = "Repasso Coordinator Runner"
RUNNER_GIT_AUTHOR_EMAIL = "repasso-coordinator@users.noreply.github.com"


def commitar_e_publicar(repo_dir: str, task: RunnerTask, push_remote_name: str) -> str:
    """Commit + push SEM ``--force``.

    O Runner usa uma identidade Git fixa e não privilegiada para o commit,
    em vez de depender de ``user.name``/``user.email`` do host efêmero.
    Isso torna GitHub Actions/local equivalentes e nunca usa identidade
    fornecida por modelo, comentário ou Variable.
    """
    _run_git(repo_dir, "add", "-A")
    mensagem = f"runner: {task.task_id}\n\n{_primeira_linha(task.instructions)}"
    commit = _run_git(
        repo_dir,
        "-c", f"user.name={RUNNER_GIT_AUTHOR_NAME}",
        "-c", f"user.email={RUNNER_GIT_AUTHOR_EMAIL}",
        "commit", "-q", "-m", mensagem,
    )
    if commit.returncode != 0:
        detalhe = commit.stderr.strip() or commit.stdout.strip() or "git commit falhou sem saída"
        raise RunnerGitError(f"não consegui commitar: {redact(detalhe)}")

    sha = _run_git(repo_dir, "rev-parse", "HEAD")
    if sha.returncode != 0:
        raise RunnerGitError(f"não consegui ler o SHA do commit publicado: {redact(sha.stderr)}")

    push = _run_git(repo_dir, "push", push_remote_name, task.branch)
    if push.returncode != 0:
        raise RunnerGitError(
            f"push rejeitado para {task.branch!r} (possível branch divergida) — nunca "
            f"force-push automático: {redact(push.stderr)}"
        )
    return sha.stdout.strip()


# ---------------------------------------------------------------------
# Claim atômico + registro auditável — mesma branch de estado dedicada,
# reaproveitando git_state.GitJsonStore (nunca uma segunda implementação
# de compare-and-swap).
# ---------------------------------------------------------------------

class RunnerClaimStore:
    def __init__(self, git_json: GitJsonStore) -> None:
        self.git_json = git_json

    def claim(self, task_id: str) -> bool:
        """``True`` só para a PRIMEIRA execução, entre quaisquer processos
        concorrentes, a reivindicar este ``task_id``. Depois de
        reivindicado (mesmo que a execução termine em ``FAILED``), NUNCA
        mais pode ser reivindicado de novo — "falha não pode virar retry
        automático silencioso" (Issue #105): retomar exige uma
        ``RunnerTask`` NOVA, com outro ``task_id``."""
        return self.git_json.claim_key(f"runner-task:{task_id}", message=f"runner: claim {task_id}")

    def registrar_resultado(self, task_id: str, resultado: RunnerResult) -> None:
        def mutate(dados: dict) -> dict:
            registros = dados.get("results", [])
            registros.append({
                **resultado.to_dict(),
                "recorded_at": datetime.now(timezone.utc).isoformat(),
            })
            return {**dados, "results": registros}

        self.git_json.update(mutate, message=f"runner: resultado {task_id} -> {resultado.status}")


# ---------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------

@dataclass(frozen=True)
class DispatchOutcome:
    result: RunnerResult | None
    claimed: bool
    external_calls_made: bool
    # Relatório 8-A.11 produzido/validado pela geração. Nunca é conteúdo
    # aplicado; acompanha somente a entrega para a PR/auditores.
    question_report: str | None = None
    validation_commands_run: tuple[dict, ...] = ()
    heartbeats: tuple[dict, ...] = ()
    notes: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        return {
            "result": self.result.to_dict() if self.result else None,
            "claimed": self.claimed,
            "external_calls_made": self.external_calls_made,
            "question_report": self.question_report,
            "validation_commands_run": list(self.validation_commands_run),
            "heartbeats": list(self.heartbeats),
            "notes": list(self.notes),
        }


def _emitir_heartbeat(
    worker_id: str | None, worker_registry: OperationalWorkerRegistry | None,
    heartbeat: RunnerHeartbeat, heartbeats: list[dict], notes: list[str],
) -> None:
    if not worker_id or worker_registry is None:
        return
    resultado_hb = aplicar_heartbeat(worker_registry, heartbeat)
    heartbeats.append(resultado_hb.to_dict())
    if resultado_hb.action != "APPLIED":
        notes.append(f"heartbeat {heartbeat.status} não aplicado: {resultado_hb.reason}")


def executar_tarefa(
    task: RunnerTask,
    patch: StructuredPatch | None = None,
    *,
    config: RunnerDispatchConfig,
    repo_dir: str,
    state_git_remote: str,
    validation_command_keys: tuple[str, ...] = (),
    push_remote_name: str = "origin",
    sucesso_status: str = "NEEDS-AUDIT",
    worker_id: str | None = None,
    worker_registry: OperationalWorkerRegistry | None = None,
    validation_allowlist: dict[str, tuple[str, ...]] | None = None,
    gerar_patch: Callable[[], object] | None = None,
    canonical_task_id: str | None = None,
) -> DispatchOutcome:
    """A orquestração completa de uma execução controlada. Nunca decide
    merge/publicação/orçamento — só executa o que ``task``/``patch`` já
    trazem, dentro dos limites que ``runner_contract.RunnerTask`` já
    valida na própria construção.

    Correção B3 (3ª auditoria independente do PR #114): exatamente um de
    ``patch``/``gerar_patch`` precisa ser dado. ``gerar_patch`` (sem
    argumento nenhum — chamada como ``gerar_patch()``) é invocada SÓ
    DEPOIS que o claim atômico do ``task_id`` já teve êxito — nunca antes.
    Isso é o que garante que uma chamada Anthropic paga (dentro de
    ``gerar_patch``, tipicamente ``runner_generate.gerar_patch_via_claude``)
    só possa acontecer para a execução que de fato venceu o claim; uma
    repetição do mesmo ``task_id`` que perde o claim nunca chega a invocar
    ``gerar_patch``, então nunca gasta uma segunda chamada. O valor
    devolvido por ``gerar_patch()`` é tratado por duck typing (nunca um
    import de ``runner_generate`` aqui, que criaria um ciclo): precisa ter
    ``.status`` (``"ok"``/``"blocked"``/``"failed"``), ``.patch``
    (``StructuredPatch | None``) e ``.reason`` (``str``).

    ``canonical_task_id`` (achado F6-D, Issue #105 Fase F, 5ª rodada):
    ``task.task_id`` é sempre um id de EXECUÇÃO (derivado por geração/
    checkpoint — ``handoff_exec.derivar_task_id_de_continuacao``/
    ``runner_resume``'s próprio esquema ``--resume-``) — nunca a
    identidade CANÔNICA e estável que o Worker Registry usa em
    ``current_task`` (``scheduler.TaskRecord.id``). O heartbeat BUSY
    emitido no início desta função precisa usar o id CANÔNICO — nunca o
    de execução — para que ``WorkerRecord.current_task`` continue
    comparável com ``TaskRecord.id``/ownership em qualquer momento,
    inclusive durante a execução. ``claim``/``RunnerResult`` continuam
    usando ``task.task_id`` (execução) sem nenhuma mudança — só o
    heartbeat muda. Parâmetro OPCIONAL, ``None`` por padrão =
    ``task.task_id`` (mesmo comportamento de antes desta rodada, para
    não quebrar nenhum chamador existente que não tem um id canônico
    separado para oferecer)."""
    if sucesso_status not in ("DONE", "NEEDS-AUDIT"):
        raise ValueError(f"sucesso_status precisa ser 'DONE' ou 'NEEDS-AUDIT' — recebido {sucesso_status!r}")
    if (patch is None) == (gerar_patch is None):
        raise ValueError(
            "executar_tarefa exige exatamente um de 'patch' (já pronto) ou 'gerar_patch' "
            "(gerado só depois do claim) — nunca os dois, nunca nenhum."
        )

    # Camada 1: gate. Fechado -> NENHUMA chamada externa (nem git remoto,
    # nem subprocess de teste) — devolve direto, sem tocar em mais nada.
    gate = config.gate()
    if not gate.open:
        return DispatchOutcome(
            result=RunnerResult(task_id=task.task_id, status="BLOCKED", reason=gate.reason),
            claimed=False, external_calls_made=False,
            notes=("portão fechado — zero chamada externa.",),
        )

    # Camada 2: só o canário autorizado passa — idem, zero chamada
    # externa. Achado G3 (Issue #105 Fase G): quando ``canonical_task_id``
    # é informado pelo código confiável (continuação de handoff/retomada),
    # é ELE que precisa ser exatamente o canário — o ``task.task_id``
    # continua sendo o id de EXECUÇÃO distinto (claim/RunnerResult), nunca
    # inferido por prefixo. Sem ``canonical_task_id``, a regra é a de
    # sempre: ``task.task_id`` exato.
    if not config.task_autorizada(task.task_id, canonical_task_id=canonical_task_id):
        return DispatchOutcome(
            result=RunnerResult(
                task_id=task.task_id, status="BLOCKED",
                reason=(
                    f"task_id {task.task_id!r} (canonical_task_id {canonical_task_id!r}) não é o "
                    f"único autorizado nesta fase canário ({config.canary_task_id!r})."
                ),
            ),
            claimed=False, external_calls_made=False,
            notes=("task_id fora do canário autorizado — zero chamada externa.",),
        )

    # A partir daqui, chamadas externas (git remoto) começam a acontecer.
    heartbeats: list[dict] = []
    notes: list[str] = []

    if worker_id:
        _emitir_heartbeat(
            worker_id, worker_registry,
            RunnerHeartbeat(worker_id=worker_id, status="BUSY", task_id=canonical_task_id or task.task_id),
            heartbeats, notes,
        )

    claim_store = RunnerClaimStore(GitJsonStore(state_git_remote, branch=DEFAULT_RUNNER_STATE_BRANCH))
    claimed = claim_store.claim(task.task_id)
    if not claimed:
        resultado = RunnerResult(
            task_id=task.task_id, status="BLOCKED",
            reason=(
                "tarefa já reivindicada por outra execução (claim atômico em branch de estado "
                f"dedicada, {DEFAULT_RUNNER_STATE_BRANCH!r}) — nunca duas execuções processam o "
                "mesmo task_id; retomar exige uma RunnerTask nova."
            ),
        )
        if worker_id:
            _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
        return DispatchOutcome(result=resultado, claimed=False, external_calls_made=True,
                                heartbeats=tuple(heartbeats), notes=tuple(notes))

    # Correção do canário R4 real: uma continuação com checkpoint precisa
    # fazer checkout EXATAMENTE desse checkpoint ANTES de gerar o patch.
    # Caso contrário, o modelo enxerga a main em vez do estado retomado
    # (no R4 viu "arquivo ausente" e gerou Stage 1 de novo).
    #
    # O claim continua acontecendo ANTES deste bloco, portanto a garantia
    # "claim antes de chamada paga" permanece intacta. Além disso, um
    # checkpoint inválido agora falha ANTES da chamada Anthropic.
    commit_base: str | None = None

    question_report: str | None = None

    # Correção B3: só a partir daqui — DEPOIS que ``claimed is True`` —
    # ``gerar_patch()`` pode ser chamada. Uma repetição do mesmo task_id
    # já teria devolvido BLOCKED (bloco acima) SEM nunca chegar até aqui,
    # então nunca chega a gastar uma segunda chamada Anthropic.
    if patch is None:
        try:
            commit_base = preparar_branch_de_trabalho(repo_dir, task)
        except RunnerGitError as exc:
            resultado = RunnerResult(task_id=task.task_id, status="FAILED", reason=str(exc))
            claim_store.registrar_resultado(task.task_id, resultado)
            if worker_id:
                _emitir_heartbeat(
                    worker_id, worker_registry,
                    RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"),
                    heartbeats, notes,
                )
            return DispatchOutcome(
                result=resultado, claimed=True, external_calls_made=True,
                heartbeats=tuple(heartbeats), notes=tuple(notes),
            )

        geracao = gerar_patch()
        status_geracao = getattr(geracao, "status", None)
        patch_gerado = getattr(geracao, "patch", None)
        question_report = getattr(geracao, "question_report", None)
        if status_geracao != "ok" or patch_gerado is None:
            motivo = getattr(geracao, "reason", None) or "geração do patch falhou sem motivo informado."
            resultado = RunnerResult(
                task_id=task.task_id,
                status=("FAILED" if status_geracao == "failed" else "BLOCKED"),
                reason=motivo,
            )
            claim_store.registrar_resultado(task.task_id, resultado)
            if worker_id:
                _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
            return DispatchOutcome(result=resultado, claimed=True, external_calls_made=True,
                                    heartbeats=tuple(heartbeats), notes=tuple(notes))

        # Achado F9-B (Issue #105, Fase F, 8ª rodada, auditoria
        # independente): a chamada Anthropic teve êxito E produziu um
        # patch válido (status_geracao == "ok" acima), mas a correção da
        # reserva conservadora/registro de uso no ledger (achado F8-C,
        # runner_generate.gerar_patch_via_claude) não pôde ser
        # persistida — ``GenerateOutcome.ledger_correction_failed=True``.
        # Antes desta correção, este sinal era simplesmente IGNORADO
        # aqui (só ``.status``/``.patch`` importavam) — um patch gerado
        # com a contabilidade de custo incerta seguia para
        # aplicar/commitar/publicar como se nada tivesse acontecido.
        # Agora: FAIL-CLOSED ANTES de tocar em qualquer arquivo — zero
        # commit/push (nem ``preparar_branch_de_trabalho`` nem
        # ``aplicar_patch`` chegam a rodar), o claim permanece consumido
        # (``claim_store.registrar_resultado`` grava FAILED contra o
        # MESMO task_id — nunca liberado para uma nova tentativa), sem
        # retry (nenhum código aqui invoca ``gerar_patch()`` de novo), e
        # a reserva conservadora já persistida por
        # ``gerar_patch_via_claude`` permanece contabilizada no ledger
        # (este bloco nunca toca o ledger, nunca reverte nada).
        if getattr(geracao, "ledger_correction_failed", False):
            resultado = RunnerResult(
                task_id=task.task_id, status="FAILED",
                reason=(
                    "chamada Anthropic concluída com sucesso e patch válido gerado, mas a correção "
                    "da reserva conservadora/registro de uso não pôde ser persistida no ledger "
                    "Anthropic global — fail-closed antes de aplicar qualquer patch (achado F9-B): "
                    "zero commit/push, claim permanece consumido, sem retry. A reserva conservadora "
                    "já feita por gerar_patch_via_claude permanece contabilizada no ledger."
                ),
            )
            claim_store.registrar_resultado(task.task_id, resultado)
            if worker_id:
                _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
            return DispatchOutcome(result=resultado, claimed=True, external_calls_made=True,
                                    heartbeats=tuple(heartbeats), notes=tuple(notes))

        patch = patch_gerado

    if task.question_report_required and not (question_report or "").strip():
        resultado = RunnerResult(
            task_id=task.task_id, status="FAILED",
            reason=(
                "tarefa exige relatório da Lei das Questões 8-A.11, mas a execução não "
                "entregou relatório validado — fail-closed antes de aplicar qualquer patch."
            ),
        )
        claim_store.registrar_resultado(task.task_id, resultado)
        if worker_id:
            _emitir_heartbeat(
                worker_id, worker_registry,
                RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"),
                heartbeats, notes,
            )
        return DispatchOutcome(
            result=resultado, claimed=True, external_calls_made=True,
            heartbeats=tuple(heartbeats), notes=tuple(notes),
        )

    ok_patch, fora = validar_patch_contra_allowed_files(patch, task)
    if not ok_patch:
        resultado = RunnerResult(
            task_id=task.task_id, status="BLOCKED",
            reason=(
                f"patch declara caminho(s) fora de allowed_files: {fora} — bloqueado antes de "
                "tocar em qualquer arquivo; nada foi commitado/publicado."
            ),
        )
        claim_store.registrar_resultado(task.task_id, resultado)
        if worker_id:
            _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
        return DispatchOutcome(result=resultado, claimed=True, external_calls_made=True,
                                heartbeats=tuple(heartbeats), notes=tuple(notes))

    if commit_base is None:
        try:
            commit_base = preparar_branch_de_trabalho(repo_dir, task)
        except RunnerGitError as exc:
            resultado = RunnerResult(task_id=task.task_id, status="FAILED", reason=str(exc))
            claim_store.registrar_resultado(task.task_id, resultado)
            if worker_id:
                _emitir_heartbeat(
                    worker_id, worker_registry,
                    RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"),
                    heartbeats, notes,
                )
            return DispatchOutcome(
                result=resultado, claimed=True, external_calls_made=True,
                heartbeats=tuple(heartbeats), notes=tuple(notes),
            )

    try:
        aplicar_patch(repo_dir, patch)
    except RunnerGitError as exc:
        resetar_workdir(repo_dir, commit_base)
        resultado = RunnerResult(task_id=task.task_id, status="FAILED", reason=str(exc))
        claim_store.registrar_resultado(task.task_id, resultado)
        if worker_id:
            _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
        return DispatchOutcome(result=resultado, claimed=True, external_calls_made=True,
                                heartbeats=tuple(heartbeats), notes=tuple(notes))

    alterados = arquivos_alterados(repo_dir)
    permitidos = set(task.allowed_files)
    fora_pos = sorted([a for a in alterados if a not in permitidos])
    if fora_pos:
        resetar_workdir(repo_dir, commit_base)
        resultado = RunnerResult(
            task_id=task.task_id, status="BLOCKED",
            reason=(
                f"diff real (não só o patch declarado) toca arquivo(s) fora de allowed_files: "
                f"{fora_pos} — bloqueado, sem commit/push."
            ),
        )
        claim_store.registrar_resultado(task.task_id, resultado)
        if worker_id:
            _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
        return DispatchOutcome(result=resultado, claimed=True, external_calls_made=True,
                                heartbeats=tuple(heartbeats), notes=tuple(notes))

    comandos: list[dict] = []
    try:
        ok_validacao, comandos = executar_comandos_validacao(
            repo_dir, validation_command_keys, allowlist=validation_allowlist
        )
    except RunnerCommandNaoPermitido as exc:
        resetar_workdir(repo_dir, commit_base)
        resultado = RunnerResult(task_id=task.task_id, status="BLOCKED", reason=str(exc))
        claim_store.registrar_resultado(task.task_id, resultado)
        if worker_id:
            _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
        return DispatchOutcome(result=resultado, claimed=True, external_calls_made=True,
                                validation_commands_run=tuple(comandos), heartbeats=tuple(heartbeats), notes=tuple(notes))

    if not ok_validacao:
        resetar_workdir(repo_dir, commit_base)
        resultado = RunnerResult(
            task_id=task.task_id, status="FAILED",
            reason="pelo menos um comando de validação da allowlist falhou — nada foi commitado/publicado.",
        )
        claim_store.registrar_resultado(task.task_id, resultado)
        if worker_id:
            _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
        return DispatchOutcome(result=resultado, claimed=True, external_calls_made=True,
                                validation_commands_run=tuple(comandos), heartbeats=tuple(heartbeats), notes=tuple(notes))

    try:
        novo_commit = commitar_e_publicar(repo_dir, task, push_remote_name)
    except RunnerGitError as exc:
        resetar_workdir(repo_dir, commit_base)
        resultado = RunnerResult(task_id=task.task_id, status="FAILED", reason=str(exc))
        claim_store.registrar_resultado(task.task_id, resultado)
        if worker_id:
            _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
        return DispatchOutcome(result=resultado, claimed=True, external_calls_made=True,
                                validation_commands_run=tuple(comandos), heartbeats=tuple(heartbeats), notes=tuple(notes))

    resultado = RunnerResult(
        task_id=task.task_id, status=sucesso_status,
        reason=(
            f"patch aplicado, validações da allowlist passaram, commit/push concluídos "
            f"(branch {task.branch!r}). DONE/NEEDS-AUDIT nunca significa MERGE-READY — "
            "auditoria semântica independente decide isso depois (Issue #83 Nível C/#99)."
        ),
        checkpoint_commit=novo_commit, branch=task.branch,
    )
    claim_store.registrar_resultado(task.task_id, resultado)
    if worker_id:
        _emitir_heartbeat(worker_id, worker_registry, RunnerHeartbeat(worker_id=worker_id, status="OFFLINE"), heartbeats, notes)
    return DispatchOutcome(
        result=resultado, claimed=True, external_calls_made=True,
        question_report=question_report,
        validation_commands_run=tuple(comandos), heartbeats=tuple(heartbeats), notes=tuple(notes),
    )


# ---------------------------------------------------------------------
# CLI — invocado como `python3 -m coordinator.runner_dispatch` pelo
# workflow .github/workflows/coordinator-runner.yml.
# ---------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description="Runner Dispatch — Issue #105 Fase D (execução controlada por api_runner)."
    )
    ap.add_argument("--task-file", required=True, help="JSON de uma RunnerTask (runner_contract.RunnerTask.from_dict)")
    ap.add_argument(
        "--patch-file", default=None,
        help="JSON de um StructuredPatch ({'files': [{'path','content'}]}) — obrigatório, "
        "a menos que --generate-via-claude seja passado.",
    )
    ap.add_argument(
        "--generate-via-claude", action="store_true",
        help="Correção B2 (PR #114): em vez de ler --patch-file, gera o StructuredPatch "
        "chamando a Anthropic (coordinator.runner_generate) — só a partir de instructions/ "
        "allowed_files da própria RunnerTask, atrás dos mesmos 3 portões de sempre. Mutuamente "
        "exclusivo com --patch-file.",
    )
    ap.add_argument(
        "--usage-git-remote", default=None,
        help="Correção B2-B (PR #114, 2ª auditoria): remoto git para a branch de estado "
        "PERSISTENTE do custo/tokens do Runner (coordinator.git_state.GitUsageLedger — o MESMO "
        "mecanismo já usado pelo Coordinator OBSERVE para dedup/orçamento entre execuções "
        "efêmeras do GitHub Actions). Obrigatório com --generate-via-claude — nunca um arquivo "
        "local, que não sobreviveria entre runs.",
    )
    ap.add_argument(
        "--usage-git-branch", default=DEFAULT_RUNNER_USAGE_STATE_BRANCH,
        help="Correção B4 (PR #114, 3ª auditoria): branch do ledger Anthropic GLOBAL — a MESMA "
        "que o Coordinator OBSERVE usa (nunca 'main', nunca uma branch separada só do Runner, "
        f"que criaria um segundo teto mensal implícito) — default: {DEFAULT_RUNNER_USAGE_STATE_BRANCH!r}.",
    )
    ap.add_argument(
        "--budget-usd", type=float, default=None,
        help="teto mensal em USD para a checagem de orçamento (--generate-via-claude); "
        "default: coordinator.budget.MONTHLY_BUDGET_USD.",
    )
    ap.add_argument("--repo-dir", default=".", help="checkout já confiável (branch padrão), nunca HEAD de PR")
    ap.add_argument("--state-git-remote", required=True, help="remoto para a branch de estado do claim/resultado")
    ap.add_argument("--push-remote-name", default="origin")
    ap.add_argument(
        "--validation-command-keys", default="",
        help="chaves separadas por vírgula, só da allowlist declarada em ALLOWED_VALIDATION_COMMANDS",
    )
    ap.add_argument("--sucesso-status", default="NEEDS-AUDIT", choices=("DONE", "NEEDS-AUDIT"))
    ap.add_argument("--worker-id", default=None, help="worker_id do api_runner para heartbeat (opcional)")
    ap.add_argument("--worker-state-git-remote", default=None, help="remoto do Worker Registry operacional (opcional)")
    ap.add_argument("--out", default=None, help="onde gravar o DispatchOutcome em JSON (sanitizado)")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = _build_arg_parser().parse_args(argv)

    if bool(args.patch_file) == bool(args.generate_via_claude):
        print(
            "ERRO fail-closed: informe EXATAMENTE um de --patch-file ou --generate-via-claude "
            "(nunca os dois, nunca nenhum)."
        )
        return 1

    config = RunnerDispatchConfig.from_env()

    try:
        task = carregar_runner_task_de_arquivo(args.task_file)
    except Exception as exc:  # fail-closed: nunca deixa uma tarefa malformada seguir adiante
        print(f"ERRO fail-closed ao carregar --task-file: {redact(str(exc))}")
        return 1

    patch: StructuredPatch | None = None
    gerar_patch: Callable[[], object] | None = None

    if args.generate_via_claude:
        if not args.usage_git_remote:
            print("ERRO fail-closed: --generate-via-claude exige --usage-git-remote.")
            return 1
        from .budget import MONTHLY_BUDGET_USD
        from .git_state import GitUsageLedger

        budget_usd = args.budget_usd if args.budget_usd is not None else MONTHLY_BUDGET_USD
        # Correção B4 (3ª auditoria independente do PR #114): o mesmo
        # ledger GLOBAL de Anthropic (branch/arquivo) que o Coordinator
        # OBSERVE já usa — nunca um ledger separado do Runner, que criaria
        # um segundo teto mensal implícito. --usage-git-branch tem esse
        # mesmo default agora (DEFAULT_RUNNER_USAGE_STATE_BRANCH ==
        # DEFAULT_GLOBAL_ANTHROPIC_USAGE_BRANCH), mas quem decide de fato é
        # o valor passado aqui, não um nome de constante.
        ledger_global = GitUsageLedger(
            GitJsonStore(args.usage_git_remote, branch=args.usage_git_branch)
        )

        # Correção B3: NÃO chama a geração agora — só monta o closure.
        # `gerar_patch()` só é invocada por `executar_tarefa` DEPOIS que o
        # claim atômico do task_id já teve êxito (import local de
        # runner_generate aqui dentro do closure, não no nível do módulo,
        # para nunca criar import circular — runner_generate.py importa
        # DESTE módulo).
        def gerar_patch() -> object:
            from . import runner_generate

            return runner_generate.gerar_patch_via_claude(
                task, config=config, repo_dir=args.repo_dir,
                usage_ledger=ledger_global,
                budget_usd=budget_usd,
            )
    else:
        try:
            patch = carregar_patch_de_arquivo(args.patch_file)
        except Exception as exc:
            print(f"ERRO fail-closed ao carregar --patch-file: {redact(str(exc))}")
            return 1

    worker_registry = None
    if args.worker_id and args.worker_state_git_remote:
        worker_registry = OperationalWorkerRegistry(
            GitJsonStore(args.worker_state_git_remote, branch=WORKER_STATE_BRANCH)
        )

    keys = tuple(k.strip() for k in args.validation_command_keys.split(",") if k.strip())

    try:
        outcome = executar_tarefa(
            task, patch,
            config=config,
            repo_dir=args.repo_dir,
            state_git_remote=args.state_git_remote,
            validation_command_keys=keys,
            push_remote_name=args.push_remote_name,
            sucesso_status=args.sucesso_status,
            worker_id=args.worker_id,
            worker_registry=worker_registry,
            gerar_patch=gerar_patch,
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

    if outcome.result is not None and outcome.result.status == "FAILED":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
