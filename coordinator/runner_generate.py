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
- ``coordinator.budget.CallLimiter``/``UsageLedger``/``check_budget``/
  ``priority_allowed`` — o MESMO mecanismo de custo/token/orçamento
  mensal que já governa o Coordinator OBSERVE; nenhum ledger paralelo;
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
   ``task_autorizada(task.task_id)`` já abriram — gate fechado ou task_id
   fora do canário = zero chamada externa, devolvido direto (mesma
   filosofia de ``executar_tarefa``);
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
7. custo/tokens só entram no MESMO ``UsageLedger`` já existente — nunca
   um arquivo/mecanismo paralelo; falha ao PERSISTIR o ledger (depois de
   uma chamada que teve êxito) é uma nota, nunca reverte o patch já
   validado (mesmo tratamento de ``observe.py``);
8. ``REPASSO_RUNNER_ENABLED``/``REPASSO_RUNNER_MODE=canary``/
   ``REPASSO_RUNNER_CANARY_TASK_ID`` continuam sendo os MESMOS 3 portões —
   este módulo nunca define um portão paralelo nem mais permissivo.

**O que este módulo deliberadamente NÃO faz:** não aplica patch em disco;
não comita/publica nada; não decide merge/publicação; não roda nenhum
comando de shell nem inicia processo externo algum (busca só ``os.path``/
leitura de arquivo local); não faz retry automático; não liga nenhuma flag
(``REPASSO_RUNNER_ENABLED`` continua exigido, exatamente como antes desta
correção).
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass

from . import anthropic_client
from .anthropic_transport import AnthropicTransport
from .budget import BudgetStatus, CallLimiter, UsageLedger, UsageRecord, check_budget, priority_allowed
from .models import ModelTier, resolve as resolve_model
from .redact import redact
from .runner_contract import RunnerTask
from .runner_dispatch import RunnerDispatchConfig, StructuredPatch, validar_patch_contra_allowed_files

# Contexto mínimo (invariante 3): nunca envia o repositório inteiro, só o
# conteúdo ATUAL dos próprios allowed_files, com o mesmo espírito de corte
# de ``coordinator/context.py`` (MAX_CHARS_PER_FIELD) — aqui um pouco maior
# porque é conteúdo de ARQUIVO completo, não um campo de evento.
MAX_FILE_CHARS_SENT = 20_000

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
    repositório inteiro, nunca outro caminho)."""
    conteudos: dict[str, str] = {}
    for caminho in allowed_files:
        alvo = os.path.join(repo_dir, caminho)
        if os.path.isfile(alvo):
            with open(alvo, encoding="utf-8", errors="replace") as fh:
                conteudos[caminho] = fh.read()
    return conteudos


def _clip(texto: str, limite: int = MAX_FILE_CHARS_SENT) -> str:
    if len(texto) <= limite:
        return texto
    return texto[:limite] + f"\n… [cortado em {limite} caracteres]"


def build_prompt(task: RunnerTask, current_contents: dict[str, str]) -> str:
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
        partes.append(_clip(conteudo) if conteudo else "(arquivo não existe ainda)")
    return "\n".join(partes)


@dataclass(frozen=True)
class GenerateOutcome:
    status: str  # "ok" | "blocked" | "failed"
    reason: str
    patch: StructuredPatch | None = None
    usage: UsageRecord | None = None
    external_call_made: bool = False

    def to_dict(self) -> dict:
        d = {
            "status": self.status,
            "reason": redact(self.reason),
            "external_call_made": self.external_call_made,
            "patch": self.patch.to_dict() if self.patch else None,
        }
        if self.usage:
            d["usage"] = self.usage.to_dict()
        return d


def _outcome_bloqueado(motivo: str) -> GenerateOutcome:
    return GenerateOutcome(status="blocked", reason=motivo, external_call_made=False)


def gerar_patch_via_claude(
    task: RunnerTask,
    *,
    config: RunnerDispatchConfig,
    repo_dir: str,
    usage_ledger: UsageLedger,
    budget_usd: float,
    transport: object | None = None,
) -> GenerateOutcome:
    """A camada de GERAÇÃO — nunca aplica nada. Devolve um
    ``StructuredPatch`` já validado contra ``task.allowed_files`` (pronto
    para ``executar_tarefa`` aplicar/validar/comitar), ou ``blocked``/
    ``failed`` com o motivo — nunca um patch parcial/inventado.
    """
    # Camada 1+2: os MESMOS 3 portões de ``executar_tarefa`` — gate fechado
    # ou task_id fora do canário = zero chamada externa.
    gate = config.gate()
    if not gate.open:
        return _outcome_bloqueado(gate.reason)
    if not config.task_autorizada(task.task_id):
        return _outcome_bloqueado(
            f"task_id {task.task_id!r} não é o único autorizado nesta fase canário "
            f"({config.canary_task_id!r})."
        )

    # Camada 3 (invariante 2): orçamento mensal, mesmo mecanismo de sempre.
    status_orcamento: BudgetStatus = check_budget(usage_ledger, budget_usd=budget_usd)
    if not priority_allowed(status_orcamento, task.priority):
        return _outcome_bloqueado(f"Orçamento: {status_orcamento.message}")

    contexto = _ler_conteudo_atual(repo_dir, task.allowed_files)
    prompt = build_prompt(task, contexto)

    model_choice = resolve_model(ModelTier.STANDARD)
    limiter = CallLimiter()
    pedido = anthropic_client.build_request(model_choice, system=_SYSTEM_PROMPT, prompt=prompt, limiter=limiter)
    transporte_real = transport if transport is not None else AnthropicTransport()

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
        return _outcome_bloqueado(sanitizado["reason"])
    if resultado_chamada.status == "error":
        return GenerateOutcome(status="failed", reason=sanitizado["reason"], external_call_made=True)

    # A partir daqui a chamada teve êxito (status == "ok") — registrar
    # custo/tokens no MESMO ledger de sempre (invariante 7), mesmo que a
    # resposta ainda venha a ser rejeitada por validação abaixo: a chamada
    # aconteceu e custou, isso não pode desaparecer só porque o conteúdo
    # devolvido era inválido.
    if resultado_chamada.usage is not None:
        try:
            usage_ledger.append(resultado_chamada.usage)
        except Exception:  # falha de PERSISTÊNCIA depois do fato — nunca reverte a chamada já feita
            pass

    texto = resultado_chamada.text or ""
    try:
        dados = json.loads(texto)
    except (json.JSONDecodeError, ValueError):
        return GenerateOutcome(
            status="failed",
            reason="resposta do modelo não é um JSON válido — resposta malformada nunca é aplicada parcialmente.",
            usage=resultado_chamada.usage, external_call_made=True,
        )

    if not isinstance(dados, dict):
        return GenerateOutcome(
            status="failed",
            reason=f"resposta do modelo precisa ser um objeto JSON, recebido {type(dados).__name__}.",
            usage=resultado_chamada.usage, external_call_made=True,
        )

    try:
        patch = StructuredPatch.from_dict(dados)
    except ValueError as exc:
        return GenerateOutcome(
            status="failed",
            reason=f"patch estruturado da resposta é inválido (fail-closed, nunca parcial): {exc}",
            usage=resultado_chamada.usage, external_call_made=True,
        )

    ok_patch, fora = validar_patch_contra_allowed_files(patch, task)
    if not ok_patch:
        return GenerateOutcome(
            status="blocked",
            reason=f"patch gerado declara caminho(s) fora de allowed_files: {fora} — rejeitado, nunca aplicado.",
            usage=resultado_chamada.usage, external_call_made=True,
        )

    return GenerateOutcome(
        status="ok",
        reason="patch gerado via Claude e validado contra allowed_files.",
        patch=patch, usage=resultado_chamada.usage, external_call_made=True,
    )
