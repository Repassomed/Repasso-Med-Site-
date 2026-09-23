"""Geração de ``StructuredPatch`` via Claude/Anthropic — Issue #105 Fase D,
correção B2 da auditoria independente do PR #114.

Antes desta correção, ``runner_dispatch.py`` (o executor determinístico)
só sabia APLICAR um ``StructuredPatch`` já pronto (``.patch.json`` no
disco) — não havia nenhuma conexão real entre uma ``RunnerTask``
autorizada e uma chamada de verdade a um modelo para PRODUZIR esse patch.
Este módulo fecha exatamente essa lacuna, e SÓ ela:

    RunnerTask autorizada -> Claude/Anthropic API -> StructuredPatch validado

nunca mais do que isso. Este módulo NUNCA aplica, comita ou publica nada —
``executar_tarefa`` (``runner_dispatch.py``) continua sendo o único lugar
que toca git/disco de verdade, exatamente como antes desta correção.

**Reaproveitamento deliberado (a Issue #105/#114 exige "NÃO duplicar
cliente/API se já existe"):**

- ``coordinator.anthropic_client.build_request``/``call`` — o MESMO ponto
  único de chamada que ``coordinator/observe.py`` já usa; nenhuma segunda
  implementação de "como chamar a Anthropic" existe neste módulo;
- ``coordinator.anthropic_transport.AnthropicTransport`` — o MESMO
  transporte real (SDK oficial, chave só de ``ANTHROPIC_API_KEY`` no
  ambiente, nunca hardcoded);
- ``coordinator.budget.CallLimiter``/``check_budget``/``priority_allowed``
  — o MESMO mecanismo de custo/token/orçamento mensal que já governa o
  Coordinator OBSERVE; o ledger em si (``usage_ledger``, recebido por
  parâmetro) é ``coordinator.git_state.GitUsageLedger`` em produção —
  correção B2-B, ver abaixo — nunca um ledger paralelo;
- ``coordinator.redact.redact`` — a MESMA sanitização de segredo antes de
  qualquer log/reason;
- ``coordinator.models.resolve``/``ModelTier`` — os MESMOS níveis lógicos
  FAST/STANDARD/DEEP (DEEP continua desabilitado por padrão);
- ``coordinator.runner_dispatch.RunnerDispatchConfig``/``StructuredPatch``/
  ``validar_patch_contra_allowed_files`` — o MESMO portão de 3 camadas e a
  MESMA validação de allowed_files que ``executar_tarefa`` já usa; este
  módulo confirma tudo de novo aqui (defesa em profundidade), mas nunca
  reimplementa a lógica.

**Invariantes desta correção (B2, auditoria independente do PR #114):**

1. só chama a API depois que ``RunnerDispatchConfig.gate()`` E
   ``task_autorizada(task.task_id, canonical_task_id=...)`` já abriram —
   gate fechado ou tarefa fora do canário = zero chamada externa,
   devolvido direto (mesma filosofia de ``executar_tarefa``; o achado G3
   da Fase G só acrescentou o canônico EXPLÍCITO para continuações,
   nunca afrouxou a comparação estrita);
2. orçamento mensal checado ANTES da chamada (``check_budget``/
   ``priority_allowed``, usando ``task.priority`` — já um
   ``coordinator.classify.Priority`` no contrato canônico) — sem
   orçamento, zero chamada;
3. contexto MÍNIMO enviado ao modelo: só ``task.instructions`` e o
   conteúdo ATUAL dos próprios ``task.allowed_files`` (nunca o
   repositório inteiro, nunca outros arquivos);
4. o modelo é instruído a devolver SOMENTE um objeto JSON
   ``{"files": [{"path", "content"}]}`` — nunca shell, nunca comando,
   nunca diff unificado, nunca markdown/texto fora do JSON;
5. a resposta é validada em cadeia — JSON bem formado -> dict com "files"
   -> ``StructuredPatch.from_dict`` (sintaxe de caminho, não-vazio, sem
   duplicado) -> caminhos ⊆ ``task.allowed_files``
   (``validar_patch_contra_allowed_files``) — qualquer elo que falhar
   devolve ``FAILED``/``BLOCKED``, NUNCA um patch parcial/aproximado;
6. uma tentativa só — ``anthropic_client.call`` já garante "sem retry
   automático" (erro de transporte é UMA tentativa); este módulo não
   adiciona nenhum laço de nova tentativa;
7. custo/tokens só entram no MESMO mecanismo de ledger já existente —
   nunca um arquivo/mecanismo paralelo; falha ao PERSISTIR o ledger
   (depois de uma chamada que teve êxito) é uma nota, nunca reverte o
   patch já validado (mesmo tratamento de ``observe.py``);
8. ``REPASSO_RUNNER_ENABLED``/``REPASSO_RUNNER_MODE=canary``/
   ``REPASSO_RUNNER_CANARY_TASK_ID`` continuam sendo os MESMOS 3 portões —
   este módulo nunca define um portão paralelo nem mais permissivo.

**Correções da 2ª auditoria independente do PR #114 (B2-A/B2-B/B2-C) —
só isto, o resto do módulo continua igual:**

- **B2-A** (ligar ao workflow real): este módulo em si não muda para essa
  correção — quem liga é ``.github/workflows/coordinator-runner.yml``, que
  agora chama ``runner_dispatch`` com ``--generate-via-claude`` (nunca
  mais ``--patch-file``) no caminho real do canário, com
  ``ANTHROPIC_API_KEY`` só no passo já gated pelos 3+1 portões (ENABLED +
  MODE + CANARY_TASK_ID + ref). Nenhum input livre de prompt/patch — a
  instrução vem só de ``RunnerTask.instructions``, lida do
  ``.task.json`` no checkout confiável da branch padrão.
- **B2-B** (custo persistente): ``usage_ledger`` deixou de ser
  necessariamente um ``coordinator.budget.UsageLedger`` (arquivo local,
  que não sobrevive entre execuções efêmeras do GitHub Actions) — agora
  aceita qualquer objeto com a MESMA superfície (``_UsageLedgerLike``
  abaixo), e a CLI real (``runner_dispatch.py``, ``--usage-git-remote``/
  ``--usage-git-branch``) sempre passa ``coordinator.git_state.
  GitUsageLedger`` numa branch de estado dedicada do próprio repositório
  — o MESMO mecanismo que já persiste dedup/orçamento do Coordinator
  OBSERVE, nunca um sistema paralelo. Os testes deste módulo continuam
  usando ``UsageLedger`` de arquivo local só porque é mais simples de
  isolar num diretório temporário — a interface é idêntica, então o
  comportamento provado vale para as duas implementações.
- **B2-C** (arquivos grandes): antes desta correção, um ``allowed_file``
  maior que ``MAX_FILE_CHARS_SENT`` era simplesmente CORTADO ao montar o
  prompt (``_clip``, removida) — mas o system prompt pede o conteúdo
  COMPLETO de volta, então o modelo devolveria um "arquivo completo" que
  na verdade só viu uma fatia, e ``FileWrite`` substituiria o arquivo
  inteiro por essa fatia: truncamento silencioso e destrutivo. Agora
  ``_arquivos_grandes_demais`` bloqueia a tarefa inteira ANTES de montar
  o prompt ou chamar o modelo (zero chamada, zero patch, zero escrita)
  quando qualquer ``allowed_file`` existente excede o limite. Edição por
  trecho/âncora para arquivos grandes é uma evolução futura, fora desta
  rodada.

**O que este módulo deliberadamente NÃO faz:** não aplica patch em disco;
não comita/publica nada; não decide merge/publicação; não roda nenhum
comando de shell nem inicia processo externo algum (busca só ``os.path``/
leitura de arquivo local); não faz retry automático; não liga nenhuma flag
(``REPASSO_RUNNER_ENABLED`` continua exigido, exatamente como antes desta
correção); não trunca/corta conteúdo de arquivo para enviar ao modelo
(bloqueia a tarefa inteira em vez disso, correção B2-C).
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from . import anthropic_client
from .anthropic_transport import AnthropicTransport
from .budget import BudgetStatus, CallLimiter, UsageRecord, check_budget, estimate_cost_usd, priority_allowed
from .models import ModelTier, resolve as resolve_model
from .redact import redact
from .runner_contract import RunnerTask
from .runner_dispatch import RunnerDispatchConfig, StructuredPatch, validar_patch_contra_allowed_files

# Contexto mínimo (invariante 3): nunca envia o repositório inteiro, só o
# conteúdo ATUAL dos próprios allowed_files, com o mesmo espírito de corte
# de ``coordinator/context.py`` (MAX_CHARS_PER_FIELD) — aqui um pouco maior
# porque é conteúdo de ARQUIVO completo, não um campo de evento.
#
# Correção B2-C (auditoria independente do PR #114, 2ª rodada): este limite
# NUNCA mais trunca conteúdo enviado ao modelo — ver `_arquivos_grandes_
# demais`/o bloqueio fail-closed em `gerar_patch_via_claude`. O system
# prompt pede o conteúdo COMPLETO do arquivo; enviar uma versão cortada e
# ainda assim aceitar de volta um "conteúdo completo" arriscaria
# truncamento silencioso e destrutivo ao aplicar o patch. Nesta fase
# canário, um allowed_file existente maior que isto BLOQUEIA a tarefa
# inteira (zero chamada, zero patch) — edição por trecho/âncora para
# arquivos grandes é uma evolução futura, fora desta rodada.
MAX_FILE_CHARS_SENT = 20_000

# Achado F8-C (Issue #105, Fase F, 7ª rodada): mesmo princípio de
# ``coordinator.openai_budget.conservative_input_tokens_ceiling`` — contagem
# de BYTES UTF-8 (nunca de caracteres) é uma cota superior MATEMÁTICA sobre
# o número de tokens que QUALQUER tokenizador BPE byte-level produz (nunca
# menos de 1 token por byte). ``STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE``
# cobre a folga de formatação da API (roles, delimitadores) que não aparece
# no texto puro de system/prompt.
_STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE = 64


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _conservative_input_tokens_ceiling(system: str, prompt: str) -> int:
    """Teto de tokens de entrada comprovadamente NÃO-subestimador para
    ``system + prompt`` — nunca menor que a contagem real de tokens que a
    API vai processar (mesma técnica/justificativa de
    ``openai_budget.conservative_input_tokens_ceiling``, aplicada aqui
    para a Anthropic; nenhuma lógica de lá é reimportada/duplicada, só o
    mesmo PRINCÍPIO)."""
    payload_bytes = len((system + prompt).encode("utf-8"))
    return payload_bytes + _STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE


def _conservative_call_cost_usd(*, system: str, prompt: str, max_output_tokens: int) -> float:
    """Teto CONSERVADOR (pior caso) do custo de UMA chamada, calculado
    ANTES de qualquer chamada acontecer — usa o teto de tokens de entrada
    comprovadamente não-subestimador acima e o limite MÁXIMO de tokens de
    saída permitidos por chamada (nunca os tokens reais de resposta, que
    só a API sabe depois). Sempre nível STANDARD — o único usado por este
    módulo (``resolve_model(ModelTier.STANDARD)`` mais abaixo)."""
    tokens_entrada = _conservative_input_tokens_ceiling(system, prompt)
    return estimate_cost_usd(ModelTier.STANDARD, tokens_entrada, max_output_tokens)


class _UsageLedgerLike(Protocol):
    """Correção B2-B (auditoria independente do PR #114, 2ª rodada): o
    ledger de custo real do Runner precisa ser ``coordinator.git_state.
    GitUsageLedger`` (persistente entre execuções efêmeras do GitHub
    Actions), nunca ``coordinator.budget.UsageLedger`` (arquivo local, que
    esta função só recebia antes desta correção). As duas classes já
    compartilham a MESMA superfície pública por design (ver o docstring de
    ``GitUsageLedger``) — este ``Protocol`` só documenta essa superfície
    aqui, sem importar nenhuma das duas implementações, então o mecanismo
    de geração continua funcionando com qualquer uma (produção sempre usa
    ``GitUsageLedger``; os testes usam ``UsageLedger`` de arquivo local só
    porque é mais simples de isolar em `tempfile.TemporaryDirectory`).

    Achado F8-C (7ª rodada): ganhou ``reserve_if_within_budget`` — o MESMO
    método atômico (compare-and-set via lock em processo único;
    compare-and-set via git em produção) que o OpenAI Auditor já usa
    (``coordinator/openai_client.py``) para fechar a corrida de orçamento
    "check_budget → chamada → append" (achado F8-C: duas execuções
    concorrentes liam o mesmo saldo ANTES de qualquer uma publicar, então
    as duas podiam passar juntas)."""

    def append(self, record: UsageRecord) -> None: ...
    def month_to_date_usd(self, *, now=None) -> float: ...
    def reserve_if_within_budget(self, candidate, *, budget_usd: float, now=None) -> bool: ...

_SYSTEM_PROMPT = (
    "Você é um gerador determinístico de patch estruturado para o Repasso Med "
    "(Issue #105, Fase D). Devolva SOMENTE um objeto JSON válido, sem nenhum texto "
    "antes ou depois, sem markdown, no formato EXATO:\n"
    '{"files": [{"path": "<caminho>", "content": "<conteúdo COMPLETO do arquivo>"}]}\n'
    "Cada 'path' precisa ser EXATAMENTE um dos caminhos permitidos informados no "
    "prompt do usuário — nunca um caminho novo, nunca um caminho fora dessa lista. "
    "'content' é sempre o CONTEÚDO COMPLETO do arquivo final, nunca um diff/patch "
    "unificado, nunca um comando de shell. Nunca inclua explicação, comentário ou "
    "qualquer texto fora do JSON. Se não for possível cumprir a instrução com "
    'segurança dentro dos caminhos permitidos, devolva exatamente {"files": []}.'
)


def _ler_conteudo_atual(repo_dir: str, allowed_files: tuple[str, ...]) -> dict[str, str]:
    """Só lê os próprios ``allowed_files`` (invariante 3: nunca o
    repositório inteiro, nunca outro caminho). Lê o arquivo INTEIRO,
    mesmo quando maior que ``MAX_FILE_CHARS_SENT`` — é `gerar_patch_via_
    claude` (via `_arquivos_grandes_demais`) quem decide, ANTES de montar
    qualquer prompt, se algo aqui é grande demais para enviar com
    segurança; esta função nunca corta nada silenciosamente (correção
    B2-C)."""
    conteudos: dict[str, str] = {}
    for caminho in allowed_files:
        alvo = os.path.join(repo_dir, caminho)
        if os.path.isfile(alvo):
            with open(alvo, encoding="utf-8", errors="replace") as fh:
                conteudos[caminho] = fh.read()
    return conteudos


def _arquivos_grandes_demais(current_contents: dict[str, str], *, limite: int = MAX_FILE_CHARS_SENT) -> list[str]:
    """Correção B2-C: quais ``allowed_files`` EXISTENTES excedem o limite
    que pode ser enviado INTEGRALMENTE ao modelo. Não-vazio aqui precisa
    bloquear a tarefa inteira ANTES de qualquer chamada — nunca truncar e
    seguir adiante como se o modelo tivesse visto o arquivo por
    completo."""
    return sorted(c for c, texto in current_contents.items() if len(texto) > limite)


def build_prompt(task: RunnerTask, current_contents: dict[str, str]) -> str:
    """Monta o prompt com o conteúdo COMPLETO de cada allowed_file — nunca
    cortado. Só é seguro chamar isto depois que `_arquivos_grandes_demais`
    já confirmou que nenhum arquivo excede `MAX_FILE_CHARS_SENT` (ver
    `gerar_patch_via_claude`); esta função em si não corta nada."""
    partes = [
        f"Instrução da tarefa (task_id={task.task_id}):",
        task.instructions.strip(),
        "",
        "Caminhos permitidos (allowed_files) — a resposta só pode usar EXATAMENTE estes:",
    ]
    partes.extend(f"- {c}" for c in task.allowed_files)
    partes.append("")
    partes.append("Conteúdo ATUAL de cada caminho ('(arquivo não existe ainda)' se vazio):")
    for caminho in task.allowed_files:
        partes.append(f"--- {caminho} ---")
        conteudo = current_contents.get(caminho, "")
        partes.append(conteudo if conteudo else "(arquivo não existe ainda)")
    return "\n".join(partes)


@dataclass(frozen=True)
class GenerateOutcome:
    status: str  # "ok" | "blocked" | "failed"
    reason: str
    patch: StructuredPatch | None = None
    usage: UsageRecord | None = None
    external_call_made: bool = False
    # Achado F8-C (7ª rodada): True só quando a chamada TEVE êxito mas a
    # correção da reserva conservadora para o custo real e/ou o registro
    # de uso real não puderam ser persistidos no ledger — sinal EXPLÍCITO
    # (nunca um `except Exception: pass` silencioso, mesmo espírito da
    # correção B3/B9 do OpenAI Auditor). Nunca reverte ``status``/
    # ``patch`` — um patch já gerado/validado continua válido mesmo que o
    # ledger fique temporariamente impreciso (a reserva conservadora, na
    # pior das hipóteses, permanece contada — nunca um valor menor/
    # ausente).
    ledger_correction_failed: bool = False

    def to_dict(self) -> dict:
        d = {
            "status": self.status,
            "reason": redact(self.reason),
            "external_call_made": self.external_call_made,
            "patch": self.patch.to_dict() if self.patch else None,
            "ledger_correction_failed": self.ledger_correction_failed,
        }
        if self.usage:
            d["usage"] = self.usage.to_dict()
        return d


def _outcome_bloqueado(motivo: str) -> GenerateOutcome:
    return GenerateOutcome(status="blocked", reason=motivo, external_call_made=False)


def _tentar_gravar(usage_ledger: _UsageLedgerLike, record: UsageRecord) -> tuple[bool, str | None]:
    """Nunca lança — devolve (persistiu, erro_sanitizado). Mesmo helper
    (mesmo nome/contrato) de ``coordinator/openai_client.py::_tentar_
    gravar`` — usado para a correção e para o registro de uso, para que
    uma falha de persistência vire sinal EXPLÍCITO (``GenerateOutcome.
    ledger_correction_failed``) em vez de uma exceção não tratada ou um
    `except Exception: pass` silencioso (achado F8-C)."""
    try:
        usage_ledger.append(record)
        return True, None
    except Exception as exc:  # noqa: BLE001 — ponto de borda deliberado, mesma filosofia do resto do pacote
        return False, redact(f"{type(exc).__name__}: {exc}")


def gerar_patch_via_claude(
    task: RunnerTask,
    *,
    config: RunnerDispatchConfig,
    repo_dir: str,
    usage_ledger: _UsageLedgerLike,
    budget_usd: float,
    transport: object | None = None,
    canonical_task_id: str | None = None,
) -> GenerateOutcome:
    """A camada de GERAÇÃO — nunca aplica nada. Devolve um
    ``StructuredPatch`` já validado contra ``task.allowed_files`` (pronto
    para ``executar_tarefa`` aplicar/validar/comitar), ou ``blocked``/
    ``failed`` com o motivo — nunca um patch parcial/inventado.

    ``canonical_task_id`` (achado G3, Issue #105 Fase G): mesma regra
    de ``RunnerDispatchConfig.task_autorizada`` usada por
    ``runner_dispatch.executar_tarefa`` — numa CONTINUAÇÃO/RETOMADA,
    ``task.task_id`` é um id de EXECUÇÃO derivado e quem autoriza é o id
    CANÔNICO explícito, passado pelo código confiável (nunca inferido de
    prefixo/sufixo, nunca lido do arquivo da tarefa). ``None`` (o padrão)
    mantém exatamente a regra anterior: ``task.task_id`` precisa ser o
    canário exato. Sem isto, o próprio GERADOR bloquearia uma continuação
    legitimamente autorizada, mesmo com o Runner Dispatch já a tendo
    aceitado.
    """
    # Camada 1+2: os MESMOS 3 portões de ``executar_tarefa`` — gate fechado
    # ou task_id fora do canário = zero chamada externa.
    gate = config.gate()
    if not gate.open:
        return _outcome_bloqueado(gate.reason)
    if not config.task_autorizada(task.task_id, canonical_task_id=canonical_task_id):
        return _outcome_bloqueado(
            f"task_id {task.task_id!r} (canonical_task_id {canonical_task_id!r}) não é o único "
            f"autorizado nesta fase canário ({config.canary_task_id!r})."
        )

    # Camada 3 (invariante 2): checagem GRADUADA por prioridade (50/75/90/
    # 100% do teto — Issue #84 §4), avaliada cedo, ANTES de montar prompt/
    # ler arquivos — nunca a checagem definitiva de orçamento (essa é a
    # reserva atômica mais abaixo, achado F8-C); só decide se esta
    # PRIORIDADE específica deve nem tentar, mais barato que montar o
    # prompt à toa quando o teto já está apertado.
    status_orcamento: BudgetStatus = check_budget(usage_ledger, budget_usd=budget_usd)
    if not priority_allowed(status_orcamento, task.priority):
        return _outcome_bloqueado(f"Orçamento: {status_orcamento.message}")

    contexto = _ler_conteudo_atual(repo_dir, task.allowed_files)

    # Camada 4 (correção B2-C): fail-closed ANTES de montar o prompt ou
    # chamar o modelo — um allowed_file existente maior do que o que pode
    # ser enviado integralmente nunca é enviado parcialmente/cortado. O
    # system prompt pede o conteúdo COMPLETO de volta; se o modelo não viu
    # o arquivo inteiro, aceitar uma resposta "completa" arriscaria
    # truncamento silencioso e destrutivo ao aplicar o patch.
    grandes_demais = _arquivos_grandes_demais(contexto)
    if grandes_demais:
        return _outcome_bloqueado(
            f"arquivo(s) existente(s) excede(m) o limite que pode ser enviado integralmente ao "
            f"modelo ({MAX_FILE_CHARS_SENT} caracteres): {grandes_demais}. Fail-closed nesta fase "
            "canário (correção B2-C, auditoria independente do PR #114): nenhuma chamada foi feita, "
            "nenhum patch foi gerado, zero escrita. Edição por trecho/âncora para arquivos grandes "
            "é uma evolução futura, fora desta rodada."
        )

    prompt = build_prompt(task, contexto)

    model_choice = resolve_model(ModelTier.STANDARD)
    limiter = CallLimiter()
    pedido = anthropic_client.build_request(model_choice, system=_SYSTEM_PROMPT, prompt=prompt, limiter=limiter)
    transporte_real = transport if transport is not None else AnthropicTransport()

    # Achado F8-C (Issue #105, Fase F, 7ª rodada, auditoria independente):
    # "check_budget -> chamada paga -> append" (o fluxo de antes desta
    # correção) tinha uma corrida real — duas execuções concorrentes podiam
    # ler o MESMO saldo do ledger ANTES de qualquer uma publicar seu custo,
    # e as duas passavam juntas no teto. Mesmo padrão já auditado do OpenAI
    # Auditor (``coordinator/openai_client.py::call``, achados B2/B7/B8/B9
    # da auditoria independente do PR #107): reserva CONSERVADORA (pior
    # caso de tokens de entrada/saída) ATÔMICA — checada E gravada como UMA
    # operação (``UsageLedger.reserve_if_within_budget``/
    # ``GitUsageLedger.reserve_if_within_budget``, o MESMO ledger GLOBAL
    # ``coordinator-state-usage``, nunca um segundo orçamento) — ANTES de
    # qualquer chamada. Uma segunda execução concorrente que leia o ledger
    # um instante depois já vê o gasto reservado por esta, então as duas
    # juntas nunca ultrapassam o teto.
    custo_reservado = _conservative_call_cost_usd(
        system=_SYSTEM_PROMPT, prompt=prompt, max_output_tokens=pedido.max_output_tokens,
    )
    registro_reserva = UsageRecord(
        timestamp=_now_iso(), event_key=f"runner-task:{task.task_id}", tier=model_choice.tier.value,
        model_id=model_choice.model_id, input_tokens=0, output_tokens=0,
        estimated_cost_usd=custo_reservado, kind="reservation",
    )
    try:
        reservou = usage_ledger.reserve_if_within_budget(registro_reserva, budget_usd=budget_usd)
    except Exception as exc:  # noqa: BLE001 — falha ao reservar = zero chamada, nunca uma exceção solta
        return _outcome_bloqueado(
            "Não foi possível reservar orçamento (falha ao persistir a reserva conservadora no "
            f"ledger Anthropic global) — nenhuma chamada foi tentada: {redact(f'{type(exc).__name__}: {exc}')}"
        )
    if not reservou:
        return _outcome_bloqueado(
            f"Orçamento: reservar US$ {custo_reservado:.6f} (teto conservador desta chamada) "
            f"ultrapassaria o limite de US$ {budget_usd:.2f}. Nenhuma chamada foi tentada — hard cap "
            "real, checado e gravado atomicamente ANTES do envio, sem janela de corrida entre a "
            "checagem e a reserva (achado F8-C)."
        )

    # Ponto único de chamada (invariante 6: uma tentativa só, sem retry
    # automático — já garantido por anthropic_client.call). `config` aqui é
    # RunnerDispatchConfig, compatível por duck typing com o `.gate()` que
    # anthropic_client.call() consulta de novo (defesa em profundidade —
    # mesmo padrão do workflow reconfirmar os portões em código).
    resultado_chamada = anthropic_client.call(
        config, pedido, transport=transporte_real, limiter=limiter,
        event_key=f"runner-task:{task.task_id}",
    )
    sanitizado = resultado_chamada.to_dict()

    if resultado_chamada.status in ("blocked", "limited"):
        # `transport.send()` nunca foi chamado — zero tokens consumidos de
        # verdade — a reserva conservadora pode ser liberada com segurança
        # (delta negativo = libera 100% dela). Na prática este ramo é
        # defensivo (os mesmos portões/limiter já foram checados antes da
        # reserva, poucas linhas acima) — nunca deixa a reserva presa à
        # toa quando se sabe com certeza que nada foi gasto.
        _tentar_gravar(usage_ledger, UsageRecord(
            timestamp=_now_iso(), event_key=f"runner-task:{task.task_id}", tier=model_choice.tier.value,
            model_id=model_choice.model_id, input_tokens=0, output_tokens=0,
            estimated_cost_usd=-custo_reservado, kind="correction",
        ))
        return _outcome_bloqueado(sanitizado["reason"])
    if resultado_chamada.status == "error":
        # Correção B8 do OpenAI Auditor, mesmo princípio aqui: um erro de
        # transporte (timeout, conexão perdida) pode ter acontecido DEPOIS
        # que a Anthropic já processou (e cobrou) a requisição — liberar a
        # reserva aqui poderia SUBESTIMAR o gasto real. A reserva
        # conservadora PERMANECE contada — nunca corrigida/liberada neste
        # ramo (achado F8-C: "erro de transporte mantém a reserva
        # conservadora").
        return GenerateOutcome(status="failed", reason=sanitizado["reason"], external_call_made=True)

    # A partir daqui a chamada teve êxito (status == "ok") — corrige a
    # reserva CONSERVADORA para o custo REAL (delta pode ser negativo — o
    # caso comum, já que o teto conservador quase sempre supera o real) e
    # grava um registro informativo de uso, mesmo que a resposta ainda
    # venha a ser rejeitada por validação abaixo: a chamada aconteceu e
    # custou, isso não pode desaparecer só porque o conteúdo devolvido era
    # inválido (invariante 7, inalterada).
    custo_real = resultado_chamada.usage.estimated_cost_usd if resultado_chamada.usage else 0.0
    tokens_entrada_reais = resultado_chamada.usage.input_tokens if resultado_chamada.usage else 0
    tokens_saida_reais = resultado_chamada.usage.output_tokens if resultado_chamada.usage else 0
    corrigiu, erro_correcao = _tentar_gravar(usage_ledger, UsageRecord(
        timestamp=_now_iso(), event_key=f"runner-task:{task.task_id}", tier=model_choice.tier.value,
        model_id=model_choice.model_id, input_tokens=0, output_tokens=0,
        estimated_cost_usd=(custo_real - custo_reservado), kind="correction",
    ))
    persistiu_uso, erro_uso = _tentar_gravar(usage_ledger, UsageRecord(
        timestamp=_now_iso(), event_key=f"runner-task:{task.task_id}", tier=model_choice.tier.value,
        model_id=model_choice.model_id, input_tokens=tokens_entrada_reais, output_tokens=tokens_saida_reais,
        estimated_cost_usd=0.0, kind="usage", informational_cost_usd=custo_real,
    ))
    # Achado F8-C: falha de correção/persistência depois da chamada precisa
    # aparecer EXPLICITAMENTE para quem chama — nunca um `except Exception:
    # pass` silencioso (a chamada paga já aconteceu; a reserva conservadora,
    # na pior das hipóteses, permanece contada — nunca desaparece nem
    # subestima). Nunca reverte status/patch: um patch já gerado/validado
    # continua válido mesmo com o ledger temporariamente impreciso.
    ledger_correction_failed = not (corrigiu and persistiu_uso)
    nota_ledger = ""
    if ledger_correction_failed:
        erro = erro_correcao or erro_uso
        nota_ledger = (
            " [AVISO: a chamada foi concluída com sucesso, mas o ledger não pôde ser totalmente "
            f"atualizado (correção de custo e/ou registro de uso real): {erro}]"
        )

    texto = resultado_chamada.text or ""
    try:
        dados = json.loads(texto)
    except (json.JSONDecodeError, ValueError):
        return GenerateOutcome(
            status="failed",
            reason="resposta do modelo não é um JSON válido — resposta malformada nunca é aplicada "
                   f"parcialmente.{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    if not isinstance(dados, dict):
        return GenerateOutcome(
            status="failed",
            reason=f"resposta do modelo precisa ser um objeto JSON, recebido {type(dados).__name__}."
                   f"{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    try:
        patch = StructuredPatch.from_dict(dados)
    except ValueError as exc:
        return GenerateOutcome(
            status="failed",
            reason=f"patch estruturado da resposta é inválido (fail-closed, nunca parcial): {exc}{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    ok_patch, fora = validar_patch_contra_allowed_files(patch, task)
    if not ok_patch:
        return GenerateOutcome(
            status="blocked",
            reason=f"patch gerado declara caminho(s) fora de allowed_files: {fora} — rejeitado, nunca "
                   f"aplicado.{nota_ledger}",
            usage=resultado_chamada.usage, external_call_made=True,
            ledger_correction_failed=ledger_correction_failed,
        )

    return GenerateOutcome(
        status="ok",
        reason=f"patch gerado via Claude e validado contra allowed_files.{nota_ledger}",
        patch=patch, usage=resultado_chamada.usage, external_call_made=True,
        ledger_correction_failed=ledger_correction_failed,
    )
