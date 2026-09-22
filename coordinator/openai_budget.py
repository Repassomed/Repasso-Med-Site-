"""Ledger e limites de chamada do OpenAI Auditor — SEPARADO do ledger da
Anthropic (Issue #106: "Criar ledger OpenAI SEPARADO do ledger
Anthropic").

Deliberadamente reaproveita a MECÂNICA de persistência já existente
(``coordinator.budget.UsageLedger``/``coordinator.git_state.GitUsageLedger``)
em vez de reescrevê-la: as duas classes só chamam ``record.to_dict()``/leem
``record.event_key``/``record.tier`` no registro que recebem (duck typing),
então ``OpenAIUsageRecord`` (definido aqui, com ``provider="openai"``
sempre) é 100% compatível — o que garante a separação exigida é apontar
essas mesmas classes para um ARQUIVO/BRANCH diferente (nunca o mesmo
caminho do ledger Anthropic), o que ``coordinator/__main__.py`` faz via
``--openai-usage-ledger``/``--openai-usage-git-remote``/
``--openai-usage-git-branch`` — nunca a mesma instância, nunca o mesmo
arquivo.

**Correção B1 da auditoria independente do PR #107.** A tabela de preço
anterior era um PLACEHOLDER declarado (US$1.25/US$10.00 para Terra,
US$5.00/US$20.00 para Sol) e, pior, ``estimate_cost_usd_openai`` caía
silenciosamente no preço de Terra (``.get(tier, _PRICE_PER_MTOK_USD[
TIER_NORMAL])``) para QUALQUER rótulo de tier desconhecido — ou seja, um
``model_id``/tier arbitrário nunca produzia um erro, só um preço errado
sem aviso nenhum. Agora a tabela é indexada por ``model_id`` (não por
"papel lógico" TERRA/SOL) com os preços oficiais atuais, e
``estimate_cost_usd_openai`` LEVANTA ``ValueError`` para qualquer
``model_id`` fora de ``SUPPORTED_MODELS`` — nunca estima o custo de um
modelo que não está explicitamente cadastrado aqui. Isso também é
verificado de novo em ``coordinator/openai_config.py::
OpenAIAuditorConfig.gate()`` (defesa em profundidade: um ``model``/
``high_risk_model`` mal configurado nas Variables do GitHub nunca chega
perto de uma chamada real).

Fontes oficiais dos preços (confirmadas na auditoria independente do PR
#107, 21/09/2026):
    https://developers.openai.com/api/docs/models/gpt-5.6-terra
    https://developers.openai.com/api/docs/models/gpt-5.6-sol
"""

from __future__ import annotations

from dataclasses import dataclass

# Nível lógico -> usado só para roteamento/relatório (qual "papel" a
# chamada exerceu), NUNCA para calcular preço — ver a correção B1 acima.
TIER_NORMAL = "TERRA"
TIER_HIGH_RISK = "SOL"

# US$ por milhão de tokens, por model_id EXATO — únicos modelos que esta
# implementação sabe precificar. Qualquer outro model_id é um erro
# (ValueError), nunca um cálculo aproximado.
SUPPORTED_MODELS: dict[str, dict[str, float]] = {
    "gpt-5.6-terra": {"input": 2.00, "output": 12.00},
    "gpt-5.6-sol": {"input": 4.00, "output": 20.00},
}

MAX_OUTPUT_TOKENS_PER_CALL = 2_000
MAX_INPUT_CHARS_PER_CALL = 8_000

# Correção B12 da auditoria independente do PR #107 (rodada 3, HEAD
# 7b0e28c): overhead estrutural fixo e conservador para o framing da
# Responses API de UMA chamada de auditoria (dois campos: instructions=
# system, input=prompt; sem histórico multi-turno, sem tool schemas) —
# soma-se ao teto de bytes calculado em conservative_input_tokens_ceiling
# para cobrir tokens de formatação/papéis que não aparecem no texto bruto
# de system/prompt. Não deriva de nenhuma medição exata (não existe
# contrato público de "N tokens fixos de overhead" para a Responses API);
# é um acréscimo generoso o bastante para o formato de chamada fixo e
# simples usado aqui (nunca cresce com o payload, então nunca dilui a
# margem de segurança do teto de bytes conforme o texto cresce).
STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE = 64


def conservative_input_tokens_ceiling(system: str, prompt: str) -> int:
    """Teto de tokens de entrada COMPROVADAMENTE não-subestimador para o
    payload inteiro (``system`` + ``prompt``) — nunca menor que a
    contagem real de tokens que a API vai processar.

    Correção B12 da auditoria independente do PR #107 (rodada 3, HEAD
    7b0e28c): a versão anterior usava ``len(str)`` — contagem de
    CARACTERES (code points Unicode) — como teto de tokens, presumindo
    que "1 caractere >= 1 token" sempre. Isso é falso para texto
    multilíngue/Unicode: um único caractere não-ASCII pode virar 2, 3 ou
    até 4 BYTES em UTF-8 (acentuação latina: até 2 bytes; cirílico/grego/
    hebraico/árabe: até 2 bytes; a maioria do CJK: 3 bytes; muitos emoji:
    4 bytes), e um tokenizador BPE byte-level — como o usado pelos
    modelos da OpenAI (tiktoken) — NUNCA produz menos de 1 token por
    BYTE de entrada: o vocabulário de base inclui os 256 valores de byte
    como tokens individuais, e as fusões (merges) do BPE só COMBINAM
    bytes em tokens maiores, nunca dividem um byte em menos de 1 token.
    Ou seja: contagem de CARACTERES podia SUBESTIMAR o número real de
    tokens (o próprio bug que a auditoria apontou), enquanto contagem de
    BYTES (``str.encode('utf-8')``) é uma cota superior MATEMÁTICA sobre
    o número de tokens, válida para qualquer tokenizador BPE byte-level,
    em qualquer idioma/script. Fonte oficial confirmando que
    aproximações por caractere são imprecisas e recomendando contagem
    real de tokens: https://developers.openai.com/api/docs/guides/token-counting

    Ao teto de bytes soma-se ``STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE``
    — um acréscimo fixo para o framing da Responses API (papéis/campos
    ``instructions``/``input``) que não aparece no texto bruto."""
    payload_bytes = len(system.encode("utf-8")) + len(prompt.encode("utf-8"))
    return payload_bytes + STRUCTURAL_OVERHEAD_TOKENS_CONSERVATIVE


def estimate_cost_usd_openai(model_id: str, input_tokens: int, output_tokens: int) -> float:
    """Custo CALCULADO a partir de tokens medidos — nunca uma cobrança
    confirmada pela OpenAI (mesma distinção que B2 da auditoria
    independente do PR #104 exigiu para a Anthropic em
    ``coordinator/costs.py``: só os tokens são "medidos"; o valor em
    dólar é sempre derivado de uma tabela de preço local).

    Levanta ``ValueError`` para qualquer ``model_id`` fora de
    ``SUPPORTED_MODELS`` — correção B1: nunca estimar o preço de um
    modelo arbitrário caindo silenciosamente no preço de outro."""
    precos = SUPPORTED_MODELS.get(model_id)
    if precos is None:
        raise ValueError(
            f"model_id {model_id!r} não está em SUPPORTED_MODELS "
            f"({sorted(SUPPORTED_MODELS)!r}) — nunca calcular custo de um modelo não cadastrado "
            "(achado B1, auditoria independente do PR #107)."
        )
    return (input_tokens / 1_000_000) * precos["input"] + (output_tokens / 1_000_000) * precos["output"]


def conservative_call_cost_usd(model_id: str, *, system: str, prompt: str,
                                max_output_tokens: int = MAX_OUTPUT_TOKENS_PER_CALL) -> float:
    """Teto CONSERVADOR (pior caso) do custo de UMA chamada, calculado
    ANTES de qualquer chamada acontecer — usa o teto de tokens
    comprovadamente não-subestimador de ``conservative_input_tokens_
    ceiling(system, prompt)`` e o limite máximo de tokens de saída
    permitidos por chamada, nunca os tokens reais de resposta (que só a
    API sabe depois).

    Correção B2 da auditoria independente do PR #107: o hard budget
    precisa reservar orçamento suficiente para o PIOR CASO antes de
    enviar qualquer coisa, não só bloquear depois que o gasto real já
    ultrapassou o teto (isso era um "stop-after-crossing", não um hard
    cap).

    Correção B10 (HEAD 98c976e): ``system``/``prompt`` são OBRIGATÓRIOS e
    vêm do payload REAL de ``request.system``/``request.prompt`` no
    ponto de chamada (``openai_client.py::call``) — nunca mais uma
    constante fixa e desconectada do payload real.

    Correção B12 da auditoria independente do PR #107 (rodada 3, HEAD
    7b0e28c): a versão anterior recebia ``input_chars`` (contagem de
    CARACTERES) como teto de tokens — não comprovadamente seguro para
    texto Unicode/multilíngue (ver ``conservative_input_tokens_
    ceiling``). Agora recebe ``system``/``prompt`` diretamente e delega
    o cálculo do teto para essa função, que usa contagem de BYTES
    (UTF-8) — cota superior matemática de tokens para qualquer
    tokenizador BPE byte-level — mais um overhead estrutural fixo."""
    input_tokens_ceiling = conservative_input_tokens_ceiling(system, prompt)
    return estimate_cost_usd_openai(model_id, input_tokens_ceiling, max_output_tokens)


@dataclass
class OpenAIUsageRecord:
    """Mesma superfície pública de ``coordinator.budget.UsageRecord``
    (``to_dict()``, ``event_key``, ``tier``) para reaproveitar
    ``UsageLedger``/``GitUsageLedger`` por duck typing — ver docstring do
    módulo. ``provider`` é sempre ``"openai"``, nunca lido de fora.

    ``kind`` (correção B2/B3, auditoria independente do PR #107) marca o
    PAPEL do registro na reserva atômica de orçamento — nunca muda como
    ``estimated_cost_usd`` entra na soma de ``month_to_date_usd()``
    (continua sendo uma soma simples; um registro de correção pode ter
    valor NEGATIVO de propósito, para acertar uma reserva feita antes da
    chamada terminar):

    - ``"reservation"`` — reserva do teto CONSERVADOR, gravada ANTES da
      chamada (hard cap real, nunca "stop-after-crossing");
    - ``"correction"``  — ajusta a reserva para o custo REAL depois que a
      chamada terminou (ou libera 100% da reserva, se a chamada nunca
      consumiu tokens de verdade);
    - ``"usage"``        — registro histórico do uso real desta chamada,
      só para leitura/relatório (não soma de novo: seu valor já está
      refletido pela reserva + correção acima; ver
      ``coordinator/openai_client.py::call``).

    ``informational_cost_usd`` (correção B9 da auditoria independente do
    PR #107, HEAD 98c976e): só preenchido em registros ``kind="usage"``,
    carrega o custo REAL calculado a partir dos tokens reais devolvidos
    pela API — para leitura/relatório/auditoria, nunca somado de novo em
    ``month_to_date_usd()``. Por isso um registro ``"usage"`` sempre tem
    ``estimated_cost_usd=0.0`` (não participa da soma; o valor real já
    foi contabilizado pela reserva + correção) e o custo real fica só em
    ``informational_cost_usd``. Antes desta correção, o custo/tokens
    reais nunca eram persistidos — só existiam no objeto ``CallResult``
    devolvido ao chamador, então nada no ledger permitia auditar o uso
    real depois do fato."""

    timestamp: str
    event_key: str
    tier: str  # "TERRA" | "SOL"
    model_id: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    provider: str = "openai"
    kind: str = "usage"
    informational_cost_usd: float | None = None

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "kind": self.kind,
            "timestamp": self.timestamp,
            "event_key": self.event_key,
            "tier": self.tier,
            "model_id": self.model_id,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "estimated_cost_usd": round(self.estimated_cost_usd, 6),
            "informational_cost_usd": (
                round(self.informational_cost_usd, 6)
                if self.informational_cost_usd is not None
                else None
            ),
        }


@dataclass
class OpenAICallLimiter:
    """Issue #106: "No máximo: 1 chamada OpenAI principal por checkpoint +
    1 escalada Sol somente quando justificada." Duas contagens
    DISTINTAS e cada uma só pode ser usada uma vez — a escalada exige que
    a chamada principal já tenha acontecido (nunca escalar sem ter
    rodado Terra primeiro)."""

    max_output_tokens: int = MAX_OUTPUT_TOKENS_PER_CALL
    main_used: bool = False
    escalation_used: bool = False

    def can_call_main(self) -> bool:
        return not self.main_used

    def register_main_call(self) -> None:
        self.main_used = True

    def can_escalate(self) -> bool:
        """Só depois da chamada principal, e só uma vez."""
        return self.main_used and not self.escalation_used

    def register_escalation(self) -> None:
        self.escalation_used = True

    def clamp_tokens(self, requested_max_tokens: int) -> int:
        return min(requested_max_tokens, self.max_output_tokens)
