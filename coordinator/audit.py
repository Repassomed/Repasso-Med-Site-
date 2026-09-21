"""Auditoria semântica STANDARD para conteúdo Nível C (Issue #83 + Issue #99 V3).

Só entra em jogo quando três coisas são verdadeiras ao mesmo tempo (ver
``observe.py::executar_auditoria``): o modo é ``active-supervised``
(``Config.is_active_supervised``), o evento é ``PR_NEEDS_AUDIT`` e a
classificação determinística (``classify.py``) já marcou o tipo A
(conteúdo/questões, área=="materia"). Nesse caso a "chamada genérica de
resumo" que o V2/OBSERVE sempre fazia (``observe._SYSTEM_PROMPT``) é
SUBSTITUÍDA por esta auditoria — nunca somada; o pipeline continua
fazendo no máximo uma chamada por evento (mesmo ``CallLimiter``,
Issue #95).

**Independência do worker (Issue #83).** Este prompt nunca é o mesmo
agente que fez a mudança se auto-certificando — é sempre uma leitura nova
do Coordinator, a partir só do audit-pack do Guard e do corpo da PR
(nunca o repositório inteiro), pedindo uma decisão OBJETIVA e um
protocolo de resposta fixo, para que ``parse_decision`` nunca precise
adivinhar o que o modelo quis dizer.
"""

from __future__ import annotations

from dataclasses import dataclass

from .context import MinimalContext

MAX_AUDIT_PROMPT_CHARS = 8_000

AUDIT_SYSTEM_PROMPT = (
    "Você é o auditor semântico independente do Repasso Coordinator (V3, modo "
    "active-supervised, Issue #99). Você NUNCA é o mesmo agente que fez a "
    "mudança — sua função é revisar de forma independente, nunca redigir ou "
    "se auto-aprovar. "
    "Responda SEMPRE começando a primeira linha exatamente com "
    "'DECISÃO: MERGE-READY' ou 'DECISÃO: NEEDS-FIX' (maiúsculas, sem mais "
    "nada nessa linha), seguida de até 5 frases em português simples "
    "explicando o motivo para José, que não é programador. "
    "Nunca decida sozinho uma questão de correção científica: se houver "
    "qualquer dúvida real sobre ciência, cátedra ou fonte, responda "
    "NEEDS-FIX e explique a dúvida em vez de arriscar. "
    "Nunca recomende MERGE-READY se perceber qualquer sinal de: segredo/chave "
    "exposta, alteração de autenticação/pagamentos/Supabase/produção, "
    "force-push, início de matéria nova sem autorização explícita de José, "
    "ou aumento de orçamento/permissão — qualquer um desses sinais é "
    "NEEDS-FIX por si só. Você nunca faz merge; apenas recomenda uma "
    "decisão para o José revisar."
)


def build_audit_prompt(contexto: MinimalContext, *, pr_body: str | None,
                        envolve_questoes: bool) -> str:
    """Prompt mínimo da auditoria — contexto do Guard + corpo da PR (onde o
    worker que fez a mudança já deveria ter escrito o Cartão de Merge e,
    se for tarefa de prova, o relatório da Lei das Questões), nunca o
    repositório inteiro."""
    partes = [contexto.summary]
    if contexto.guard_result:
        partes.append(f"Resultado do Guard: {contexto.guard_result}")
    if contexto.guard_hard_fails:
        partes.append("HARD FAILs do Guard: " + "; ".join(contexto.guard_hard_fails))
    if contexto.guard_warnings:
        partes.append("Avisos do Guard: " + "; ".join(contexto.guard_warnings))
    if envolve_questoes:
        partes.append(
            "ATENÇÃO: esta tarefa envolve questões/prova. A Lei das Questões "
            "(MANUTENCAO-DIDATICA-REPASSO-MED.md 8-A.11) exige que o corpo da "
            "PR abaixo já contenha o relatório de aproveitamento por fonte "
            "(arquivo/página ou imagem, legibilidade, questões detectadas, "
            "aproveitadas, novas, reformuladas, duplicadas, reconstruídas, "
            "pendentes e destino no site) e a confirmação explícita "
            "RESUMO ENSINA → QUESTÃO COBRA → EXPLICAÇÃO REFORÇA. Verifique se "
            "esse relatório está presente e completo no corpo da PR; se "
            "faltar qualquer parte dele, a decisão tem que ser NEEDS-FIX só "
            "por causa disso, mesmo que o resto da mudança pareça correto "
            "(este ponto específico também é reforçado por um gate "
            "determinístico separado, que não depende desta sua leitura)."
        )
    if pr_body:
        partes.append("Corpo da PR (fonte da verdade do que o worker declarou ter feito):\n" + pr_body)
    prompt = "\n\n".join(partes)
    if len(prompt) > MAX_AUDIT_PROMPT_CHARS:
        prompt = prompt[:MAX_AUDIT_PROMPT_CHARS] + "\n… [cortado]"
    return prompt


@dataclass(frozen=True)
class AuditDecision:
    decision: str  # "MERGE-READY" | "NEEDS-FIX"
    rationale: str
    protocol_matched: bool

    def to_dict(self) -> dict:
        return {
            "decision": self.decision,
            "rationale": self.rationale,
            "protocol_matched": self.protocol_matched,
        }


def parse_decision(response_text: str) -> AuditDecision:
    """Extrai a decisão da primeira linha da resposta, sempre com um
    default seguro: qualquer resposta que não siga o protocolo EXATO vira
    NEEDS-FIX, nunca MERGE-READY por omissão/ambiguidade de parsing — a
    mesma filosofia de 'erro de API não entra em loop, nunca vira sucesso
    silencioso' que o resto do pacote já segue (Issue #95)."""
    texto = (response_text or "").strip()
    linhas = texto.splitlines()
    primeira = linhas[0].strip().upper() if linhas else ""
    resto = "\n".join(linhas[1:]).strip()

    if primeira.startswith("DECISÃO: MERGE-READY") or primeira.startswith("DECISAO: MERGE-READY"):
        return AuditDecision(decision="MERGE-READY", rationale=resto or texto, protocol_matched=True)
    if primeira.startswith("DECISÃO: NEEDS-FIX") or primeira.startswith("DECISAO: NEEDS-FIX"):
        return AuditDecision(decision="NEEDS-FIX", rationale=resto or texto, protocol_matched=True)

    return AuditDecision(
        decision="NEEDS-FIX",
        rationale=(
            "A resposta da auditoria não seguiu o protocolo esperado "
            "('DECISÃO: MERGE-READY' ou 'DECISÃO: NEEDS-FIX' na primeira "
            "linha) — tratado como NEEDS-FIX por segurança, nunca como "
            "aprovação por omissão. Resposta recebida: "
            f"{texto[:2000] or '(vazia)'}"
        ),
        protocol_matched=False,
    )
