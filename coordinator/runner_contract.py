"""Contrato ESTÁVEL do futuro Worker Runner — Issue #105, Fase C
(``#105-C · Runner Contract``, decisão operacional de José publicada em
https://github.com/Repassomed/Repasso-Med-Site-/issues/105#issuecomment-5770219587).

Esta rodada cria SOMENTE o contrato de dados — três formas (``RunnerTask``,
``RunnerHeartbeat``, ``RunnerResult``) que a Fase D (``runner_dispatch.py``,
ainda não escrita) vai implementar de verdade. **Nenhuma execução real
acontece aqui**: nenhuma chamada de rede, nenhum processo externo, nenhuma
escrita em arquivo/git, nenhuma leitura de ``coordination/tasks.json``.
Só dataclasses imutáveis com validação determinística forte — o mesmo
espírito de ``coordinator/handoff.py``/``coordinator/scheduler.py``
(função pura / dado puro, sem efeito colateral).

Fontes desta rodada: Issue #105 inteira, o comentário de design
DESIGN-READY (seção 3, "CONTRATO DO RUNNER") e a decisão operacional mais
recente de José (#105-B Heartbeat → Claude 3; #105-C Runner Contract →
este módulo), Issue #83 (Matriz de autonomia — Níveis A-E), Issue #84
(prioridades/custos/handoff), ``coordinator/scheduler.py`` (mesmo
vocabulário de ``risk_level``/``policy_level``/``jose_authorized`` já
validado nas 3 auditorias independentes do PR #108, já mergeado) e
``coordinator/worker_ops.py`` (``VALID_STATUSES``, reaproveitado aqui sem
redefinir, para que ``RunnerHeartbeat`` continue compatível com o que a
Fase B vai de fato ler/escrever).

**NÃO tocados nesta rodada** (decisão explícita de José): ``heartbeat.py``,
``worker_commands.py``, nenhum workflow do GitHub Actions,
``runner_dispatch.py``, ``coordination/tasks.json``,
``coordinator/tests/run_all.py``, matéria, Supabase/Auth/pagamentos.

---

**INVARIANTES ABSOLUTOS** (nunca negociáveis por nenhum código futuro que
consuma este contrato — Issue #83/#84/#99/#105):

1. o runner nunca faz merge — nenhuma dataclass deste módulo tem CAMPO
   nenhum que represente "pode mergear"; ``RunnerTask.never_merge`` e
   ``RunnerResult.never_merge`` são sempre ``True``, calculados, nunca
   lidos de fora (mesma técnica estrutural de
   ``worker_ops.WorkerRecord.never_merge``);
2. o runner nunca publica/deploya — ``RunnerTask.can_publish`` é sempre
   ``False``, calculado, e **nunca lê ``publication_required``** para
   decidir isso: ``publication_required`` é só um sinal INFORMATIVO
   ("depois do merge, esta tarefa vai precisar que José publique"), nunca
   uma permissão (ver ``test_publication_flag_never_grants_publish``);
3. o runner nunca escreve fora de ``allowed_files`` — este módulo não
   pode *impor* isso em runtime (é Fase D), mas ``allowed_files`` vazio
   ou sintaticamente inválido (caminho vazio, escape de diretório via
   ``..``) já falha fechado NA CONSTRUÇÃO do contrato, antes de
   qualquer execução existir. **Correção C2** (2ª auditoria independente
   do PR #111): esta validação é só SINTÁTICA — nunca decide por
   CONTEÚDO do caminho (matéria, Netlify Function, Supabase...). Quem
   decide se um caminho sensível pode entrar numa tarefa é
   ``policy_level``/``jose_authorized`` (invariantes 7/8), nunca uma
   lista negra de substrings; um "blanket ban" por conteúdo tornaria o
   Runner incapaz de representar até tarefas de conteúdo médico Nível C
   com auditoria semântica obrigatória — que a Issue #83 explicitamente
   permite — ou tarefas Nível D já autorizadas por José;
4. o runner nunca faz force-push nem rebase destrutivo — nenhuma linha
   deste arquivo chama git nem inicia processo externo algum (prova estrutural em
   ``test_no_merge_or_deploy_capability_present``, mesma técnica de
   ``test_no_forbidden_writes.py``);
5. o runner nunca amplia orçamento — nenhuma dataclass deste módulo tem
   campo de orçamento/budget; a ausência é a prova;
6. ``RunnerResult`` com ``status == "DONE"`` NUNCA significa MERGE-READY
   — ``RunnerResult.merge_ready`` é sempre ``False``, mesmo quando
   ``status == "DONE"`` (vira candidato a MERGE-READY só depois da
   auditoria semântica independente, Issue #83 Nível C / Issue #99);
7. Nível E (Issue #83) nunca pode executar — ``RunnerTask.__post_init__``
   REJEITA a própria construção de uma tarefa com ``policy_level="E"``;
   não existe ``RunnerTask`` válida nesse nível, ponto final;
8. Nível D exige ``jose_authorized=True`` — sem isso,
   ``RunnerTask.__post_init__`` também rejeita a construção (fail-closed
   na origem, não só na decisão de handoff);
9. tarefa sem ``branch`` válida (não-vazia, nunca ``main``/``master``) ou
   sem ``allowed_files`` (não-vazio, sem caminho proibido) falha fechado
   — ``ValueError`` na construção, nunca um valor default silencioso;
10. checkpoint para retomada precisa ser EXPLÍCITO — ``checkpoint_commit``/
    ``last_checkpoint`` só aceitam ``None`` (sem checkpoint) ou um SHA de
    commit de verdade (7-40 caracteres hexadecimais); nunca uma string
    vazia, ``"HEAD"``, ``"latest"`` ou qualquer valor simbólico
    ambíguo. ``RunnerResult`` com ``status == "BLOCKED-LIMIT"`` exige
    ``checkpoint_commit`` preenchido — sem ele, a própria construção
    falha (uma tarefa interrompida por limite sem checkpoint publicado
    nunca pode ser representada como retomável, #84 §6).

---

**Correções da 2ª auditoria independente do PR #111 (C1-C2) — só isto,
Fase D/runner_dispatch/workflow continuam fora de escopo:**

- C1: o PR #110 (Fase B, em paralelo) já tinha sua PRÓPRIA classe
  ``RunnerHeartbeat`` — dois contratos oficiais incompatíveis (um com
  ``timestamp``, outro sem; semânticas diferentes de
  ``remaining_work_estimate``) bem antes da Fase D existir.
  ``runner_contract.RunnerHeartbeat`` agora é a definição CANÔNICA única:
  ganhou ``timestamp`` (ISO8601 opcional, mesma validação de
  ``datetime.fromisoformat`` que o #110 já usava) e a regra fail-closed
  de que ``BUSY``/``NEAR_LIMIT``/``LIMIT`` exigem ``task_id`` preenchido
  (heartbeat parcial nunca pode apagar silenciosamente a tarefa ativa de
  um worker ocupado) enquanto ``AVAILABLE``/``OFFLINE`` nunca podem
  carregar ``task_id`` (um worker livre/desligado não tem tarefa ativa
  para reportar). A validação de ``branch``/``commit``/``last_checkpoint``
  já existente (item 10 acima) foi mantida — é MAIS estrita que a versão
  do #110, de propósito: o PR #110 será atualizado, numa rodada à parte,
  para IMPORTAR esta classe em vez de redefini-la (ordem de integração
  definida pela auditoria: #111 primeiro, #110 depois).
- C2: ``allowed_files`` tinha uma lista negra de CONTEÚDO (matéria,
  qualquer ``netlify/functions``, ``index.html``/``admin.html``/
  ``app-core.js``/``styles.css``/``netlify.toml``, Supabase) que tornava
  o Runner Contract estruturalmente incapaz de representar tarefas que a
  própria política (Issue #83) permite — ex.: conteúdo médico Nível C
  (com auditoria semântica obrigatória) ou uma mudança Nível D já
  autorizada por José. Removida inteiramente; ``allowed_files`` agora só
  valida SINTAXE de caminho (não-vazio, sem ``..``) — ver invariante 3
  acima. A autonomia/sensibilidade continua sendo decidida só por
  ``policy_level``/``jose_authorized`` (invariantes 7/8, inalterados).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime

from .classify import Priority
from .worker_ops import VALID_STATUSES as VALID_WORKER_STATUSES

# ---------------------------------------------------------------------------
# Vocabulário compartilhado — mesmos valores já auditados em scheduler.py
# (3 rodadas de auditoria independente do PR #108, já mergeado). Redefinidos
# aqui (não importados de scheduler.py) de propósito: scheduler.py consome
# handoff.py/worker_ops.py e é a camada de DECISÃO; runner_contract.py é só
# a camada de DADO, deliberadamente sem depender de scheduler.py, para que
# a Fase D (runner_dispatch.py) possa importar este módulo sozinho, sem
# arrastar toda a lógica de fila/scheduler junto.
# ---------------------------------------------------------------------------

VALID_RISK_LEVELS: tuple[str, ...] = ("BAIXO", "MEDIO", "ALTO")
VALID_POLICY_LEVELS: tuple[str, ...] = ("A", "B", "C", "D", "E")
POLICY_LEVEL_PROIBIDO = "E"
POLICY_LEVEL_REQUER_AUTORIZACAO = "D"

VALID_RUNNER_RESULT_STATUSES: tuple[str, ...] = ("DONE", "BLOCKED", "BLOCKED-LIMIT", "NEEDS-AUDIT", "FAILED")
_STATUS_EXIGE_CHECKPOINT_EXPLICITO = frozenset({"BLOCKED-LIMIT"})

# Correção C1 (2ª auditoria independente do PR #111): um worker BUSY/
# NEAR_LIMIT/LIMIT está, por definição, numa tarefa — task_id é
# obrigatório. AVAILABLE/OFFLINE significam "sem tarefa ativa" — task_id
# tem que ser None. As duas juntas particionam VALID_WORKER_STATUSES por
# completo (nenhum status fica sem regra).
_STATUS_EXIGE_TASK_ID = frozenset({"BUSY", "NEAR_LIMIT", "LIMIT"})
_STATUS_PROIBE_TASK_ID = frozenset({"AVAILABLE", "OFFLINE"})

# Branches que o runner nunca pode declarar como SUA branch de trabalho —
# main/master são sempre da responsabilidade exclusiva de José (merge).
_BRANCHES_PROTEGIDAS = frozenset({"main", "master"})

# SHA de commit git: 7 (short) a 40 (completo) caracteres hexadecimais.
# Nunca um valor simbólico ("HEAD", "latest", branch, string vazia).
_COMMIT_SHA_RE = re.compile(r"^[0-9a-fA-F]{7,40}$")

# Correção C2 (2ª auditoria independente do PR #111): allowed_files NÃO
# tem mais nenhuma lista negra por CONTEÚDO de caminho (matéria, Netlify
# Function, Supabase, index.html/admin.html/app-core.js/styles.css/
# netlify.toml...). Um "blanket ban" ali tornava impossível representar
# tarefas que a própria Issue #83 permite — conteúdo médico Nível C (com
# auditoria semântica obrigatória antes de MERGE-READY) ou uma mudança
# Nível D já autorizada explicitamente por José. A validação de
# allowed_files agora é SÓ sintática (não-vazio, sem escape de diretório
# via ".."); quem decide sensibilidade/autonomia é policy_level +
# jose_authorized (invariantes 7/8), nunca uma lista de substrings de
# caminho.

# Instrução "vaga" que a Issue #105 (seção 3, design DESIGN-READY) proíbe
# explicitamente: "instruction: str — instrução completa gerada pelo
# Coordinator (nunca 'continue')".
_INSTRUCOES_PROIBIDAS = frozenset({"continue", "continua", "continuar", "siga", "prossiga"})


def _validar_branch_de_trabalho(valor: str, *, campo: str = "branch") -> None:
    texto = (valor or "").strip()
    if not texto:
        raise ValueError(f"{campo} não pode ser vazio — toda tarefa do runner precisa de uma branch de trabalho própria.")
    if texto.lower() in _BRANCHES_PROTEGIDAS:
        raise ValueError(
            f"{campo}={texto!r} é uma branch protegida — o runner nunca pode declarar 'main'/'master' "
            "como a própria branch de trabalho (Issue #83 Nível E: nunca merge/force-push/rebase "
            "destrutivo; Issue #84 §6: handoff sempre a partir de checkpoint numa branch dedicada)."
        )
    if any(c.isspace() for c in texto):
        raise ValueError(f"{campo}={texto!r} contém espaço — não é um nome de branch git válido.")


def _validar_allowed_files(valores: object) -> None:
    """Correção C2: só SEGURANÇA SINTÁTICA de caminho — não-vazio, sem
    escape de diretório. Nunca decide por CONTEÚDO do caminho (isso é
    policy_level/jose_authorized, avaliados em RunnerTask.__post_init__,
    não aqui)."""
    if not valores:
        raise ValueError(
            "allowed_files não pode ser vazio — Lei 3 (#82/#85): toda RunnerTask precisa reservar "
            "arquivos explícitos; sem isso, a tarefa falha fechado (nunca 'todo o repositório')."
        )
    achados: list[str] = []
    for bruto in valores:
        caminho = str(bruto).strip()
        if not caminho:
            achados.append("caminho vazio em allowed_files")
            continue
        if ".." in caminho:
            achados.append(f"{caminho!r}: contém '..' (possível escape de diretório)")
    if achados:
        raise ValueError(
            "allowed_files contém caminho(s) sintaticamente inválido(s) (fail-closed): " + "; ".join(achados)
        )


def _validar_commit_sha(valor: str, *, campo: str) -> None:
    texto = valor.strip() if isinstance(valor, str) else ""
    if not texto or not _COMMIT_SHA_RE.match(texto):
        raise ValueError(
            f"{campo} precisa ser um SHA de commit EXPLÍCITO (7 a 40 caracteres hexadecimais) para "
            f"servir de checkpoint de retomada — nunca um valor simbólico/vazio como 'HEAD', 'latest' "
            f"ou '' (Issue #84 §6: 'todo handoff deve partir de commit/checkpoint conhecido'). "
            f"Recebido: {valor!r}."
        )


def _validar_capabilities(valores: object, *, campo: str) -> None:
    if not valores:
        return  # vazio = nenhum requisito conhecido, mesma semântica de scheduler.TaskRecord.
    for bruto in valores:
        if not str(bruto).strip():
            raise ValueError(f"{campo} contém uma capability vazia.")


@dataclass(frozen=True)
class RunnerTask:
    """Uma tarefa completa, pronta para ser despachada a um ``api_runner``
    (``worker_ops.WorkerRecord.type == "api_runner"``) — nunca a um
    ``human_session``, que continua recebendo instrução em texto/Issue
    (ver seção 5 do comentário de design da Issue #105).

    Espelha exatamente os campos propostos na Issue #105 (comentário
    DESIGN-READY, seção 3), sem nenhum campo a mais que sugira execução,
    merge, publicação ou orçamento."""

    task_id: str
    priority: Priority
    source_issue: int | None
    branch: str
    allowed_files: tuple[str, ...]
    instructions: str
    checkpoint_commit: str | None
    capabilities_required: tuple[str, ...]
    risk_level: str
    policy_level: str
    jose_authorized: bool = False
    publication_required: bool = False
    # Lei das Questões 8-A.11: quando True, a geração precisa devolver
    # também um relatório estruturado de proveniência; ausência/invalidade
    # bloqueia antes de qualquer escrita.
    question_report_required: bool = False

    def __post_init__(self) -> None:
        if not self.task_id or not str(self.task_id).strip():
            raise ValueError("task_id não pode ser vazio.")
        if not isinstance(self.priority, Priority):
            raise ValueError(
                f"priority precisa ser um coordinator.classify.Priority — recebido {self.priority!r} "
                f"({type(self.priority).__name__})."
            )
        if self.source_issue is not None and (not isinstance(self.source_issue, int) or self.source_issue <= 0):
            raise ValueError(f"source_issue precisa ser None ou um inteiro positivo — recebido {self.source_issue!r}.")

        _validar_branch_de_trabalho(self.branch)
        _validar_allowed_files(self.allowed_files)

        texto_instrucoes = (self.instructions or "").strip()
        if not texto_instrucoes:
            raise ValueError("instructions não pode ser vazio — o Coordinator precisa gerar a instrução completa.")
        if texto_instrucoes.lower() in _INSTRUCOES_PROIBIDAS:
            raise ValueError(
                f"instructions={texto_instrucoes!r} é vago demais — a Issue #105 exige 'instrução completa "
                "gerada pelo Coordinator (nunca \"continue\")'; o próprio checkpoint_commit já carrega de "
                "onde retomar, então a instrução sempre precisa descrever o trabalho, nunca só dizer para "
                "continuar."
            )

        if self.checkpoint_commit is not None:
            _validar_commit_sha(self.checkpoint_commit, campo="checkpoint_commit")

        _validar_capabilities(self.capabilities_required, campo="capabilities_required")

        risco = (self.risk_level or "").strip().upper()
        if risco not in VALID_RISK_LEVELS:
            raise ValueError(f"risk_level {self.risk_level!r} inválido — precisa ser um de {VALID_RISK_LEVELS}.")

        politica = (self.policy_level or "").strip().upper()
        if politica not in VALID_POLICY_LEVELS:
            raise ValueError(f"policy_level {self.policy_level!r} inválido — precisa ser um de {VALID_POLICY_LEVELS}.")
        # Invariantes 7/8 (Issue #83): gates ABSOLUTOS, avaliados na própria
        # construção do contrato — nunca só numa decisão de handoff
        # posterior. Uma RunnerTask Nível E simplesmente não existe válida;
        # uma RunnerTask Nível D sem autorização explícita também não.
        if politica == POLICY_LEVEL_PROIBIDO:
            raise ValueError(
                "policy_level='E' (Issue #83, Nível E — PROIBIDO) nunca pode virar uma RunnerTask "
                "executável — o runner não tem permissão de sequer receber esta tarefa, independente "
                "de prioridade, checkpoint ou autorização."
            )
        if politica == POLICY_LEVEL_REQUER_AUTORIZACAO and not self.jose_authorized:
            raise ValueError(
                "policy_level='D' (Issue #83, Nível D) sempre exige autorização explícita de José ANTES "
                "de começar — construa esta RunnerTask com jose_authorized=True somente depois que essa "
                "autorização tiver sido de fato dada; sem isso, falha fechado."
            )

    @property
    def never_merge(self) -> bool:
        """Sempre ``True`` — mesma prova estrutural de
        ``worker_ops.WorkerRecord.never_merge``: nenhum dado externo pode
        transformar isto em ``False``, porque nada aqui é lido de fora."""
        return True

    @property
    def can_publish(self) -> bool:
        """Sempre ``False`` — **nunca lê ``self.publication_required``**.
        ``publication_required`` é só um sinal informativo para José/o
        workflow decidirem publicar DEPOIS do merge; nunca uma permissão
        concedida ao runner (invariante 2 do módulo)."""
        return False

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "priority": self.priority.value,
            "source_issue": self.source_issue,
            "branch": self.branch,
            "allowed_files": list(self.allowed_files),
            "instructions": self.instructions,
            "checkpoint_commit": self.checkpoint_commit,
            "capabilities_required": list(self.capabilities_required),
            "risk_level": self.risk_level,
            "policy_level": self.policy_level,
            "jose_authorized": self.jose_authorized,
            "publication_required": self.publication_required,
            "question_report_required": self.question_report_required,
            "never_merge": True,
            "can_publish": False,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "RunnerTask":
        prioridade = _parse_priority(d.get("priority"))
        if prioridade is None:
            raise ValueError(f"priority {d.get('priority')!r} inválida — precisa ser um de {[p.value for p in Priority]}.")
        return cls(
            task_id=d["task_id"],
            priority=prioridade,
            source_issue=d.get("source_issue"),
            branch=d["branch"],
            allowed_files=tuple(d.get("allowed_files") or ()),
            instructions=d["instructions"],
            checkpoint_commit=d.get("checkpoint_commit"),
            capabilities_required=tuple(d.get("capabilities_required") or ()),
            risk_level=d["risk_level"],
            policy_level=d["policy_level"],
            jose_authorized=bool(d.get("jose_authorized", False)),
            publication_required=bool(d.get("publication_required", False)),
            question_report_required=bool(d.get("question_report_required", False)),
        )


def _parse_priority(valor: object) -> Priority | None:
    if not valor:
        return None
    texto = str(valor).upper().strip()
    for p in Priority:
        if p.value == texto:
            return p
    return None


@dataclass(frozen=True)
class RunnerHeartbeat:
    """Definição CANÔNICA única do heartbeat (correção C1, 2ª auditoria
    independente do PR #111): antes desta correção existiam DUAS classes
    ``RunnerHeartbeat`` incompatíveis — esta, e outra em ``heartbeat.py``
    (Fase B, PR #110). Este é agora o único contrato; o PR #110 passa a
    IMPORTAR esta classe (numa rodada própria, ordem de integração da
    auditoria), nunca a redefinir. Serve tanto ``human_session``
    (comentário estruturado) quanto o futuro ``api_runner`` (payload) —
    nada aqui depende de ``type`` do worker.

    ``status`` reaproveita ``worker_ops.VALID_STATUSES`` em vez de
    redefinir o vocabulário — se o Worker Registry um dia ganhar um novo
    status, este contrato acompanha automaticamente, sem precisar de
    outra rodada de edição aqui. Este módulo NÃO implementa nenhum
    parser de comentário nem aplicador ao Worker Registry — isso continua
    sendo ``heartbeat.py`` (Fase B), fora de escopo aqui."""

    worker_id: str
    status: str  # worker_ops.VALID_STATUSES: AVAILABLE|BUSY|NEAR_LIMIT|LIMIT|OFFLINE
    task_id: str | None = None
    progress_percent: int | None = None
    branch: str | None = None
    commit: str | None = None
    remaining_work_estimate: str | None = None
    last_checkpoint: str | None = None
    notes: str = ""
    # Correção C1: ISO8601 opcional — quem aplica o heartbeat carimba o
    # momento de recebimento quando ausente (não é papel deste contrato
    # decidir isso, só validar o formato quando informado).
    timestamp: str | None = None

    def __post_init__(self) -> None:
        if not self.worker_id or not str(self.worker_id).strip():
            raise ValueError("worker_id não pode ser vazio.")
        if self.status not in VALID_WORKER_STATUSES:
            raise ValueError(f"status {self.status!r} inválido — precisa ser um de {sorted(VALID_WORKER_STATUSES)}.")
        if self.task_id is not None and not str(self.task_id).strip():
            raise ValueError("task_id, quando informado, não pode ser uma string vazia — use None para 'sem tarefa'.")
        # Correção C1: regra fail-closed de task_id por status — um
        # heartbeat parcial nunca pode apagar silenciosamente a tarefa
        # ativa de um worker ocupado, nem fingir que um worker livre/
        # desligado ainda está em alguma tarefa.
        if self.status in _STATUS_EXIGE_TASK_ID and self.task_id is None:
            raise ValueError(
                f"status={self.status!r} exige task_id preenchido — um worker "
                f"{'/'.join(sorted(_STATUS_EXIGE_TASK_ID))} sempre está numa tarefa; um heartbeat sem "
                "task_id não pode apagar silenciosamente a tarefa ativa registrada (achado C1)."
            )
        if self.status in _STATUS_PROIBE_TASK_ID and self.task_id is not None:
            raise ValueError(
                f"status={self.status!r} nunca pode carregar task_id — "
                f"{'/'.join(sorted(_STATUS_PROIBE_TASK_ID))} significam 'sem tarefa ativa' por definição "
                "(achado C1)."
            )
        if self.progress_percent is not None and not (0 <= self.progress_percent <= 100):
            raise ValueError(f"progress_percent precisa estar entre 0 e 100 — recebido {self.progress_percent!r}.")
        if self.branch is not None:
            _validar_branch_de_trabalho(self.branch)
        if self.commit is not None:
            _validar_commit_sha(self.commit, campo="commit")
        if self.last_checkpoint is not None:
            _validar_commit_sha(self.last_checkpoint, campo="last_checkpoint")
        if self.timestamp is not None:
            try:
                datetime.fromisoformat(self.timestamp)
            except ValueError as exc:
                raise ValueError(f"timestamp {self.timestamp!r} não é um ISO8601 válido.") from exc

    def to_dict(self) -> dict:
        return {
            "worker_id": self.worker_id,
            "status": self.status,
            "task_id": self.task_id,
            "progress_percent": self.progress_percent,
            "branch": self.branch,
            "commit": self.commit,
            "remaining_work_estimate": self.remaining_work_estimate,
            "last_checkpoint": self.last_checkpoint,
            "notes": self.notes,
            "timestamp": self.timestamp,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "RunnerHeartbeat":
        return cls(
            worker_id=d["worker_id"],
            status=d["status"],
            task_id=d.get("task_id"),
            progress_percent=d.get("progress_percent"),
            branch=d.get("branch"),
            commit=d.get("commit"),
            remaining_work_estimate=d.get("remaining_work_estimate"),
            last_checkpoint=d.get("last_checkpoint"),
            notes=d.get("notes", ""),
            timestamp=d.get("timestamp"),
        )


@dataclass(frozen=True)
class RunnerResult:
    """O que um ``api_runner`` devolve ao terminar de trabalhar numa
    ``RunnerTask`` — nunca uma decisão de merge/publicação, nunca uma
    promoção automática a MERGE-READY (invariante 6 do módulo)."""

    task_id: str
    status: str  # VALID_RUNNER_RESULT_STATUSES: DONE|BLOCKED|BLOCKED-LIMIT|NEEDS-AUDIT|FAILED
    reason: str
    checkpoint_commit: str | None = None
    branch: str | None = None

    def __post_init__(self) -> None:
        if not self.task_id or not str(self.task_id).strip():
            raise ValueError("task_id não pode ser vazio.")
        if self.status not in VALID_RUNNER_RESULT_STATUSES:
            raise ValueError(f"status {self.status!r} inválido — precisa ser um de {VALID_RUNNER_RESULT_STATUSES}.")
        if not self.reason or not str(self.reason).strip():
            raise ValueError("reason não pode ser vazio — todo RunnerResult precisa explicar o motivo do status.")
        if self.status in _STATUS_EXIGE_CHECKPOINT_EXPLICITO and not self.checkpoint_commit:
            raise ValueError(
                "status='BLOCKED-LIMIT' exige checkpoint_commit explícito — uma tarefa interrompida por "
                "limite sem checkpoint publicado não pode ser representada como retomável (Issue #84 §6: "
                "'todo handoff deve partir de commit/checkpoint conhecido')."
            )
        if self.checkpoint_commit is not None:
            _validar_commit_sha(self.checkpoint_commit, campo="checkpoint_commit")
        if self.branch is not None:
            _validar_branch_de_trabalho(self.branch)

    @property
    def never_merge(self) -> bool:
        """Sempre ``True`` — mesma prova estrutural do resto do pacote."""
        return True

    @property
    def merge_ready(self) -> bool:
        """Sempre ``False`` — inclusive quando ``status == "DONE"``.
        ``DONE`` só significa que o runner terminou sua própria parte
        (código pronto, testes locais passaram, checkpoint publicado);
        vira candidato a MERGE-READY somente depois da auditoria
        semântica independente (Issue #83 Nível C, Issue #99), nunca por
        este contrato sozinho e nunca automaticamente (invariante 6)."""
        return False

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "status": self.status,
            "reason": self.reason,
            "checkpoint_commit": self.checkpoint_commit,
            "branch": self.branch,
            "never_merge": True,
            "merge_ready": False,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "RunnerResult":
        return cls(
            task_id=d["task_id"],
            status=d["status"],
            reason=d["reason"],
            checkpoint_commit=d.get("checkpoint_commit"),
            branch=d.get("branch"),
        )
