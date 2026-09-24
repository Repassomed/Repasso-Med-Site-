"""Coordinator V3 (Issue #99, "coordenação ativa supervisionada").

Cobre, nesta ordem:

1. as 3 provas EXIGIDAS pelo pedido da V3 sobre o bug real de dedup do
   GUARD_STATE_CHANGE (PR + HEAD_SHA + estado do Guard):
   a) mesma PR + mesmo HEAD + mesmo estado -> zero chamada nova;
   b) mesma PR + NOVO HEAD + mesmo estado -> auditoria nova;
   c) rerun do Guard no MESMO HEAD -> zero chamada duplicada;
2. github_event.py: head_sha chega em GUARD_STATE_CHANGE e PR_NEEDS_AUDIT;
   envolve_questoes e materia são detectados corretamente;
3. config.py: MODE=active-supervised é aceito, aditivo, sem afrouxar o
   portão ENABLED, e não muda nada em MODE=observe;
4. audit.py: parse_decision nunca vira MERGE-READY por omissão/protocolo
   não seguido;
5. merge_card.py: classificação de publicação e a Lei das Questões (gate
   determinístico, só rebaixa, nunca promove);
6. observe.py de ponta a ponta: Guard HARD FAIL -> NEEDS-FIX sem custo;
   auditoria real (mock) -> MERGE-READY/NEEDS-FIX; Lei das Questões
   rebaixando um MERGE-READY do LLM; escopo restrito a PR_NEEDS_AUDIT+tipo
   A (GUARD_STATE_CHANGE nunca aciona a auditoria, mesmo com
   audit_mode=True); MODE=observe preserva o comportamento V2 inalterado.
"""

from __future__ import annotations

import os
import sys
import tempfile

from . import _pathsetup
from coordinator import audit, merge_card
from coordinator.budget import UsageLedger
from coordinator.config import ACTIVE_SUPERVISED_MODE, ALLOWED_MODE, Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.events import EventType
from coordinator.github_event import build_event_from_github_context
from coordinator.__main__ import _gravar_comment_out
from coordinator.observe import observe
from coordinator.openai_config import OpenAIAuditorConfig
from coordinator.worker_registry import Worker, WorkerState

REPO = "Repassomed/Repasso-Med-Site-"

_OPENAI_MERGE_READY = (
    "DECISION: MERGE-READY\nRISK: NORMAL\nREQUIRES_ESCALATION: false\n"
    "ESCALATION_REASON: -\nRATIONALE: revisão final aprovada.\n"
    "FINDINGS:\nDIDACTIC_FINDINGS:\n"
)


def _workers() -> list[Worker]:
    return [Worker(name="Claude 9", state=WorkerState.FREE, specialization=("materia",))]


class _RespostaFalsa:
    def __init__(self, texto: str, input_tokens: int = 10, output_tokens: int = 5) -> None:
        self.text = texto
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens


class _TransporteContador:
    def __init__(self, resposta: _RespostaFalsa) -> None:
        self.resposta = resposta
        self.calls = 0

    def send(self, request):
        self.calls += 1
        return self.resposta


# ---------------------------------------------------------------------------
# 1. As 3 provas exigidas sobre o bug de dedup do GUARD_STATE_CHANGE.
# ---------------------------------------------------------------------------

def _evento_guard(conclusao: str, run_id: int, head_sha: str):
    payload = {
        "action": "completed",
        "workflow_run": {
            "name": "Repasso Guard", "conclusion": conclusao, "id": run_id,
            "head_sha": head_sha, "pull_requests": [{"number": 77}],
        },
    }
    return build_event_from_github_context("workflow_run", payload, REPO)


def test_prova_a_mesmo_pr_mesmo_head_mesmo_estado_zero_chamada_nova() -> None:
    dedup = Deduplicator(InMemoryStore())
    cfg = Config(enabled=True, mode=ALLOWED_MODE)
    with tempfile.TemporaryDirectory() as tmp:
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t1 = _TransporteContador(_RespostaFalsa("ok"))
        r1 = observe(_evento_guard("success", 34, "c6605f1"), config=cfg, dedup=dedup,
                     ledger=ledger, workers=_workers(), transport=t1)
        assert r1.status == "OBSERVED" and t1.calls == 1

        # Rerun do Guard no MESMO HEAD, run_id novo (é assim que reruns
        # acontecem de verdade) — tem que ser DUPLICATE, zero chamada.
        t2 = _TransporteContador(_RespostaFalsa("nunca devia chegar aqui"))
        r2 = observe(_evento_guard("success", 35, "c6605f1"), config=cfg, dedup=dedup,
                     ledger=ledger, workers=_workers(), transport=t2)
        assert r2.status == "DUPLICATE", f"esperava DUPLICATE, obtido {r2.status}"
        assert t2.calls == 0
    print("OK  test_prova_a_mesmo_pr_mesmo_head_mesmo_estado_zero_chamada_nova")


def test_prova_b_mesmo_pr_novo_head_mesmo_estado_e_auditoria_nova() -> None:
    """O bug real (Issue #99): PR #77, Guard run #34 em success, depois um
    NOVO commit (novo HEAD) com o Guard terminando em success DE NOVO —
    antes desta correção isso virava DUPLICATE por engano; agora tem que
    gerar uma chamada nova."""
    dedup = Deduplicator(InMemoryStore())
    cfg = Config(enabled=True, mode=ALLOWED_MODE)
    with tempfile.TemporaryDirectory() as tmp:
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t1 = _TransporteContador(_RespostaFalsa("ok"))
        r1 = observe(_evento_guard("success", 34, "c6605f1"), config=cfg, dedup=dedup,
                     ledger=ledger, workers=_workers(), transport=t1)
        assert r1.status == "OBSERVED" and t1.calls == 1

        t2 = _TransporteContador(_RespostaFalsa("ok de novo"))
        r2 = observe(_evento_guard("success", 40, "a1b2c3d"), config=cfg, dedup=dedup,
                     ledger=ledger, workers=_workers(), transport=t2)
        assert r2.status == "OBSERVED", (
            f"HEAD novo com o mesmo estado tinha que ser tratado como evento novo, obtido {r2.status}"
        )
        assert t2.calls == 1
    print("OK  test_prova_b_mesmo_pr_novo_head_mesmo_estado_e_auditoria_nova")


def test_prova_c_rerun_do_guard_no_mesmo_head_zero_chamada_duplicada() -> None:
    """Mesma prova de 'a', isolada como o pedido explícito descreve:
    'rerun do Guard no mesmo HEAD = zero chamada duplicada'."""
    ev1 = _evento_guard("failure", run_id=1, head_sha="deadbeef")
    ev2 = _evento_guard("failure", run_id=2, head_sha="deadbeef")  # rerun: só run_id muda
    assert ev1.dedup_key() == ev2.dedup_key(), "rerun no mesmo HEAD precisa colidir na dedup_key"

    dedup = Deduplicator(InMemoryStore())
    cfg = Config(enabled=True, mode=ALLOWED_MODE)
    with tempfile.TemporaryDirectory() as tmp:
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t1 = _TransporteContador(_RespostaFalsa("ok"))
        assert observe(ev1, config=cfg, dedup=dedup, ledger=ledger, workers=_workers(), transport=t1).status == "OBSERVED"
        assert t1.calls == 1

        t2 = _TransporteContador(_RespostaFalsa("nunca devia chegar aqui"))
        r2 = observe(ev2, config=cfg, dedup=dedup, ledger=ledger, workers=_workers(), transport=t2)
        assert r2.status == "DUPLICATE"
        assert t2.calls == 0
    print("OK  test_prova_c_rerun_do_guard_no_mesmo_head_zero_chamada_duplicada")


def test_dedup_key_ainda_diferencia_mudanca_real_de_estado() -> None:
    """Não regredir o bloqueador 6 original (PR #97): vermelho->verde no
    MESMO head também é evento novo (muda o estado, não só o head)."""
    vermelho = _evento_guard("failure", 1, "aaa")
    verde = _evento_guard("success", 2, "aaa")
    assert vermelho.dedup_key() != verde.dedup_key()
    print("OK  test_dedup_key_ainda_diferencia_mudanca_real_de_estado")


# ---------------------------------------------------------------------------
# 2. github_event.py — head_sha, envolve_questoes, materia.
# ---------------------------------------------------------------------------

def test_pr_needs_audit_carries_head_sha_audit_pack_and_body() -> None:
    payload = {
        "action": "completed",
        "workflow_run": {"name": "Repasso Guard", "conclusion": "success", "id": 1,
                          "head_sha": "f00dcafe", "pull_requests": [{"number": 97}]},
    }
    pr_info = {
        "number": 97, "title": "Farmacología II — questões novas da prova",
        "body": "- **Área:** materia\n\nMATRIZ POR FONTE ...",
        "labels": ["NEEDS-AUDIT"], "updated_at": "2026-09-21T00:00:00Z",
    }
    ap = {"versao": 1, "resultado": "APROVADO", "achados": []}
    ev = build_event_from_github_context("workflow_run", payload, REPO, pr_info=pr_info, audit_pack=ap)
    assert ev.payload["dedup_fields"]["head_sha"] == "f00dcafe"
    assert ev.payload["audit_pack"] == ap
    assert ev.payload["body"].startswith("- **Área:**")
    assert ev.payload["materia"] == pr_info["title"]
    assert ev.payload["envolve_questoes"] is True
    print("OK  test_pr_needs_audit_carries_head_sha_audit_pack_and_body")


def test_pr_needs_audit_without_materia_area_leaves_materia_none() -> None:
    payload = {
        "action": "completed",
        "workflow_run": {"name": "Repasso Guard", "conclusion": "success", "id": 1,
                          "head_sha": "aaa", "pull_requests": [{"number": 5}]},
    }
    pr_info = {"number": 5, "title": "Ajuste no Guard", "body": "- **Área:** infraestrutura\n",
               "labels": ["NEEDS-AUDIT"], "updated_at": "x"}
    ev = build_event_from_github_context("workflow_run", payload, REPO, pr_info=pr_info)
    assert ev.payload["materia"] is None
    assert ev.payload["envolve_questoes"] is False
    print("OK  test_pr_needs_audit_without_materia_area_leaves_materia_none")


def test_guard_state_change_carries_head_sha_in_dedup_fields() -> None:
    ev = _evento_guard("failure", run_id=9, head_sha="beefcafe")
    assert ev.payload["dedup_fields"]["head_sha"] == "beefcafe"
    assert ev.payload["dedup_fields"]["conclusion"] == "failure"
    print("OK  test_guard_state_change_carries_head_sha_in_dedup_fields")


def test_comment_with_coordinator_marker_is_ignored_even_from_trusted_actor() -> None:
    """Anti-self-loop (Issue #99): um comentário que ecoe a própria saída
    do Coordinator (marcador COORDINATOR_COMMENT_MARKER) nunca pode virar
    um evento novo — mesmo publicado pela identidade 'Repassomed', a MESMA
    usada por José e por todos os agentes neste projeto."""
    from coordinator.github_event import COORDINATOR_COMMENT_MARKER

    corpo = COORDINATOR_COMMENT_MARKER + "\n## 🟣 CARTÃO DE MERGE\n\nEntraram questões novas da prova."
    payload = {
        "action": "created",
        "issue": {"number": 88},
        "comment": {"id": 4242, "body": corpo, "user": {"login": "Repassomed"}},
    }
    assert build_event_from_github_context("issue_comment", payload, REPO) is None
    print("OK  test_comment_with_coordinator_marker_is_ignored_even_from_trusted_actor")


def test_rendered_merge_card_always_carries_the_marker() -> None:
    from coordinator.github_event import COORDINATOR_COMMENT_MARKER

    dados = merge_card.MergeCardInput(
        pr_number=1, titulo="x", area="materia", guard_result="APROVADO",
        audit_decision="NEEDS-FIX", audit_rationale="x", envolve_questoes=False,
        lei_das_questoes=None, head_sha="abcdef1234567890",
    )
    texto = merge_card.render_merge_card(dados)
    assert texto.startswith(COORDINATOR_COMMENT_MARKER)
    assert "**HEAD auditado:** `abcdef1234567890`" in texto
    print("OK  test_rendered_merge_card_always_carries_the_marker")


def test_comment_without_marker_from_trusted_actor_still_works() -> None:
    """A correção do marcador não pode quebrar o caminho normal de
    comentário confiável (regressão)."""
    payload = {
        "action": "created",
        "issue": {"number": 88},
        "comment": {"id": 4243, "body": "Entraram questões novas de Farmacología II.",
                    "user": {"login": "Repassomed"}},
    }
    ev = build_event_from_github_context("issue_comment", payload, REPO)
    assert ev is not None
    assert ev.event_type is EventType.INBOX_COMMENT
    print("OK  test_comment_without_marker_from_trusted_actor_still_works")


# ---------------------------------------------------------------------------
# 3. config.py — active-supervised é aditivo.
# ---------------------------------------------------------------------------

def test_active_supervised_mode_opens_gate_and_sets_flag() -> None:
    cfg = Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE)
    assert cfg.gate().open
    assert cfg.is_active_supervised is True
    print("OK  test_active_supervised_mode_opens_gate_and_sets_flag")


def test_observe_mode_is_unaffected_by_the_new_mode() -> None:
    cfg = Config(enabled=True, mode=ALLOWED_MODE)
    assert cfg.gate().open
    assert cfg.is_active_supervised is False
    print("OK  test_observe_mode_is_unaffected_by_the_new_mode")


def test_unknown_mode_still_blocked() -> None:
    cfg = Config(enabled=True, mode="modo-qualquer")
    assert not cfg.gate().open
    assert cfg.is_active_supervised is False
    print("OK  test_unknown_mode_still_blocked")


# ---------------------------------------------------------------------------
# 4. audit.py — parse_decision nunca aprova por omissão.
# ---------------------------------------------------------------------------

def test_parse_decision_merge_ready() -> None:
    d = audit.parse_decision("DECISÃO: MERGE-READY\nTudo certo, Guard passou e o texto ficou claro.")
    assert d.decision == "MERGE-READY" and d.protocol_matched
    print("OK  test_parse_decision_merge_ready")


def test_parse_decision_needs_fix() -> None:
    d = audit.parse_decision("DECISÃO: NEEDS-FIX\nFalta corrigir o gabarito da questão 3.")
    assert d.decision == "NEEDS-FIX" and d.protocol_matched
    print("OK  test_parse_decision_needs_fix")


def test_parse_decision_without_protocol_defaults_to_needs_fix() -> None:
    d = audit.parse_decision("Acho que está tudo bem, pode mergear.")
    assert d.decision == "NEEDS-FIX", "ambiguidade nunca pode virar MERGE-READY"
    assert d.protocol_matched is False
    print("OK  test_parse_decision_without_protocol_defaults_to_needs_fix")


def test_parse_decision_empty_response_defaults_to_needs_fix() -> None:
    d = audit.parse_decision("")
    assert d.decision == "NEEDS-FIX"
    print("OK  test_parse_decision_empty_response_defaults_to_needs_fix")


# ---------------------------------------------------------------------------
# 5. merge_card.py — publicação e Lei das Questões.
# ---------------------------------------------------------------------------

def test_classificar_publicacao_site_file_is_sim() -> None:
    pub, _ = merge_card.classificar_publicacao(["Repasso-Med-Site--main/Atual - Copia/farmacologia-ii.html"])
    assert pub == "SIM"
    print("OK  test_classificar_publicacao_site_file_is_sim")


def test_classificar_publicacao_only_coordination_docs_is_nao() -> None:
    pub, _ = merge_card.classificar_publicacao(["coordinator/observe.py", "coordination/tasks.json", "docs/nota.md"])
    assert pub == "NÃO"
    print("OK  test_classificar_publicacao_only_coordination_docs_is_nao")


def test_classificar_publicacao_ambiguous_defaults_sim() -> None:
    pub, motivo = merge_card.classificar_publicacao(["algum/caminho/sem-extensao-reconhecida"])
    assert pub == "SIM"
    assert "dúvida" in motivo.lower()
    print("OK  test_classificar_publicacao_ambiguous_defaults_sim")


def test_classificar_publicacao_empty_list_defaults_sim() -> None:
    pub, _ = merge_card.classificar_publicacao([])
    assert pub == "SIM"
    print("OK  test_classificar_publicacao_empty_list_defaults_sim")


_CORPO_COMPLETO_LEI_DAS_QUESTOES = """
## RESUMO PARA MERGE

blá blá blá.

## MATRIZ POR FONTE

FONTE / PÁGINA-IMAGEM / LEGIBILIDADE / QUESTÕES DETECTADAS / APROVEITADAS /
NOVAS / REFORMULADAS / DUPLICADAS / RECONSTRUÍDAS / PENDENTES / DESTINO NO SITE

Confirmação: RESUMO ENSINA -> QUESTÃO COBRA -> EXPLICAÇÃO REFORÇA — sim, cobre tudo.
"""


def test_avaliar_lei_das_questoes_relatorio_completo_satisfeita() -> None:
    r = merge_card.avaliar_lei_das_questoes(_CORPO_COMPLETO_LEI_DAS_QUESTOES)
    assert r.satisfeita, r.faltando
    print("OK  test_avaliar_lei_das_questoes_relatorio_completo_satisfeita")


def test_avaliar_lei_das_questoes_relatorio_ausente_nao_satisfeita() -> None:
    r = merge_card.avaliar_lei_das_questoes("Corpo de PR qualquer, sem relatório nenhum.")
    assert not r.satisfeita
    assert "matriz_por_fonte" in r.faltando
    print("OK  test_avaliar_lei_das_questoes_relatorio_ausente_nao_satisfeita")


def test_aplicar_lei_das_questoes_rebaixa_merge_ready_sem_relatorio() -> None:
    decisao, resultado = merge_card.aplicar_lei_das_questoes(
        "MERGE-READY", envolve_questoes=True, pr_body="sem relatório nenhum",
    )
    assert decisao == "NEEDS-FIX"
    assert resultado is not None and not resultado.satisfeita
    print("OK  test_aplicar_lei_das_questoes_rebaixa_merge_ready_sem_relatorio")


def test_aplicar_lei_das_questoes_mantem_merge_ready_com_relatorio() -> None:
    decisao, resultado = merge_card.aplicar_lei_das_questoes(
        "MERGE-READY", envolve_questoes=True, pr_body=_CORPO_COMPLETO_LEI_DAS_QUESTOES,
    )
    assert decisao == "MERGE-READY"
    assert resultado is not None and resultado.satisfeita
    print("OK  test_aplicar_lei_das_questoes_mantem_merge_ready_com_relatorio")


def test_aplicar_lei_das_questoes_nao_se_aplica_fora_de_prova() -> None:
    decisao, resultado = merge_card.aplicar_lei_das_questoes(
        "MERGE-READY", envolve_questoes=False, pr_body="",
    )
    assert decisao == "MERGE-READY"
    assert resultado is None
    print("OK  test_aplicar_lei_das_questoes_nao_se_aplica_fora_de_prova")


def test_render_merge_card_contains_merge_publicacao_alvo_apos_publicar() -> None:
    dados = merge_card.MergeCardInput(
        pr_number=97, titulo="x", area="materia", guard_result="APROVADO",
        audit_decision="MERGE-READY", audit_rationale="ok",
        envolve_questoes=False, lei_das_questoes=None,
        arquivos_alterados=("Repasso-Med-Site--main/Atual - Copia/farmacologia-ii.html",),
    )
    texto = merge_card.render_merge_card(dados)
    for campo in ("**MERGE:**", "**PUBLICAÇÃO:**", "**MOTIVO:**", "**ALVO:**", "**APÓS PUBLICAR:**"):
        assert campo in texto, f"{campo!r} ausente do Cartão de Merge"
    assert "SIM" in texto
    print("OK  test_render_merge_card_contains_merge_publicacao_alvo_apos_publicar")


# ---------------------------------------------------------------------------
# 6. observe.py de ponta a ponta — o fluxo completo da V3.
# ---------------------------------------------------------------------------

_DIFF_REAL_EXEMPLO = (
    "diff --git a/farmacologia-ii.html b/farmacologia-ii.html\n"
    "+<p>Novo parágrafo didático.</p>\n"
)


def _evento_pr_materia(*, run_id: int, head_sha: str, body: str, titulo: str = "Farmacología II — provas"):
    payload = {
        "action": "completed",
        "workflow_run": {"name": "Repasso Guard", "conclusion": "success", "id": run_id,
                          "head_sha": head_sha, "pull_requests": [{"number": 200}]},
    }
    corpo_completo = "- **Área:** materia\n\n" + body
    pr_info = {"number": 200, "title": titulo, "body": corpo_completo,
               "labels": ["NEEDS-AUDIT"], "updated_at": f"2026-09-21T00:0{run_id}:00Z"}
    return payload, pr_info


def _observar_pr_materia(*, head_sha: str, body: str, audit_pack: dict | None = None,
                          transport=None, dedup=None, ledger=None, audit_mode=True, run_id=1,
                          pr_diff: str | None = None):
    payload, pr_info = _evento_pr_materia(run_id=run_id, head_sha=head_sha, body=body)
    ev = build_event_from_github_context("workflow_run", payload, REPO, pr_info=pr_info,
                                          audit_pack=audit_pack, pr_diff=pr_diff)
    cfg = Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE if audit_mode else ALLOWED_MODE)
    # Produção exige Anthropic + OpenAI para MERGE-READY. Estes testes V3
    # focam a primeira auditoria/Lei das Questões, então simulam um OpenAI
    # independente que aprova quando o pipeline chega até ele.
    t_openai = _TransporteContador(_RespostaFalsa(_OPENAI_MERGE_READY))
    openai_ledger = UsageLedger(os.path.join(tempfile.mkdtemp(), "usage-openai.json"))
    return observe(
        ev, config=cfg, dedup=dedup, ledger=ledger, workers=_workers(),
        transport=transport, audit_mode=audit_mode,
        openai_config=OpenAIAuditorConfig(enabled=True),
        openai_ledger=openai_ledger, openai_transport=t_openai,
    )


def test_guard_hard_fail_yields_needs_fix_with_zero_api_cost() -> None:
    audit_pack = {
        "versao": 1, "resultado": "REPROVADO",
        "achados": [{"check": "gabarito", "severity": "HARD FAIL", "message": "resposta científica errada",
                      "where": "farmacologia-ii.html", "detail": {}}],
        "arquivos_alterados": ["Repasso-Med-Site--main/Atual - Copia/farmacologia-ii.html"],
    }
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("nunca devia chegar aqui"))
        r = _observar_pr_materia(head_sha="hf1", body="corpo qualquer", audit_pack=audit_pack,
                                  transport=t, dedup=dedup, ledger=ledger)
        assert r.status == "OBSERVED"
        assert r.audit_decision == "NEEDS-FIX"
        assert r.call_attempted is False
        assert t.calls == 0
        assert r.merge_card and "NEEDS-FIX" in r.merge_card
        assert r.should_comment is True
    print("OK  test_guard_hard_fail_yields_needs_fix_with_zero_api_cost")


def test_audit_merge_ready_without_questoes() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("DECISÃO: MERGE-READY\nTudo certo."))
        r = _observar_pr_materia(head_sha="mr1", body="ajuste de prosa didática, sem nada relacionado a avaliação",
                                  transport=t, dedup=dedup, ledger=ledger, pr_diff=_DIFF_REAL_EXEMPLO)
        assert r.status == "OBSERVED"
        assert r.audit_decision == "MERGE-READY"
        assert t.calls == 1
        assert r.should_comment is True
    print("OK  test_audit_merge_ready_without_questoes")


def test_audit_merge_ready_downgraded_by_lei_das_questoes() -> None:
    """O corpo da PR menciona questão/prova (envolve_questoes=True) mas não
    tem o relatório da Lei das Questões — mesmo o LLM dizendo MERGE-READY,
    a decisão final tem que ser NEEDS-FIX."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("DECISÃO: MERGE-READY\nQuestões novas incorporadas."))
        r = _observar_pr_materia(head_sha="lq1", body="Entraram questões novas da prova — sem matriz nenhuma.",
                                  transport=t, dedup=dedup, ledger=ledger)
        assert r.audit_decision == "NEEDS-FIX", "Lei das Questões tinha que rebaixar o MERGE-READY do LLM"
        assert "Lei das Questões" in r.merge_card
    print("OK  test_audit_merge_ready_downgraded_by_lei_das_questoes")


def test_audit_merge_ready_survives_with_full_report() -> None:
    corpo = "Entraram questões novas da prova.\n\n" + _CORPO_COMPLETO_LEI_DAS_QUESTOES
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("DECISÃO: MERGE-READY\nRelatório completo, tudo correto."))
        r = _observar_pr_materia(head_sha="lq2", body=corpo, transport=t, dedup=dedup, ledger=ledger,
                                  pr_diff=_DIFF_REAL_EXEMPLO)
        assert r.audit_decision == "MERGE-READY"
    print("OK  test_audit_merge_ready_survives_with_full_report")


def test_audit_merge_ready_blocked_without_real_diff() -> None:
    """Correção B2 da auditoria independente do PR #104: o auditor não pode
    certificar MERGE-READY vendo só o corpo da PR — sem diff real, mesmo
    um 'DECISÃO: MERGE-READY' do LLM tem que ser rebaixado."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("DECISÃO: MERGE-READY\nParece tudo certo."))
        r = _observar_pr_materia(head_sha="nd1", body="ajuste de prosa didática", transport=t,
                                  dedup=dedup, ledger=ledger, pr_diff=None)
        assert r.audit_decision == "NEEDS-FIX", "sem diff real, nunca pode ser MERGE-READY"
        assert "diff" in r.merge_card.lower()
    print("OK  test_audit_merge_ready_blocked_without_real_diff")


def test_audit_merge_ready_blocked_with_truncated_diff() -> None:
    diff_enorme = "diff --git a/x b/x\n" + ("+linha nova\n" * 5000)
    assert len(diff_enorme) > audit.MAX_DIFF_CHARS
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("DECISÃO: MERGE-READY\nParece tudo certo."))
        r = _observar_pr_materia(head_sha="td1", body="ajuste de prosa didática", transport=t,
                                  dedup=dedup, ledger=ledger, pr_diff=diff_enorme)
        assert r.audit_decision == "NEEDS-FIX", "diff truncado nunca pode sustentar MERGE-READY"
    print("OK  test_audit_merge_ready_blocked_with_truncated_diff")


def test_guard_state_change_hard_fail_yields_needs_fix_with_zero_api_cost() -> None:
    """B1 da auditoria independente do PR #104: o atalho sem custo tinha
    que valer para QUALQUER evento com HARD FAIL no audit-pack em
    active-supervised, não só PR_NEEDS_AUDIT+tipo A. Um GUARD_STATE_CHANGE
    vermelho de verdade, com HARD FAIL já no audit-pack, não pode gastar
    STANDARD."""
    audit_pack = {
        "versao": 1, "resultado": "REPROVADO",
        "achados": [{"check": "segredos", "severity": "HARD FAIL", "message": "possível segredo commitado",
                      "where": "coordinator/observe.py", "detail": {}}],
        "arquivos_alterados": ["coordinator/observe.py"],
    }
    payload = {
        "action": "completed",
        "workflow_run": {"name": "Repasso Guard", "conclusion": "failure", "id": 1,
                          "head_sha": "gsc1", "pull_requests": [{"number": 201}]},
    }
    ev = build_event_from_github_context("workflow_run", payload, REPO, audit_pack=audit_pack)
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        cfg = Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE)
        t = _TransporteContador(_RespostaFalsa("nunca devia chegar aqui"))
        r = observe(ev, config=cfg, dedup=dedup, ledger=ledger, workers=_workers(),
                     transport=t, audit_mode=True)
        assert r.status == "OBSERVED"
        assert r.audit_decision == "NEEDS-FIX"
        assert r.call_attempted is False
        assert t.calls == 0, "HARD FAIL do Guard tem que cortar a chamada mesmo fora do caminho PR_NEEDS_AUDIT+tipo A"
        assert r.should_comment is True
    print("OK  test_guard_state_change_hard_fail_yields_needs_fix_with_zero_api_cost")


def test_audit_scope_restricted_to_pr_needs_audit_type_a() -> None:
    """audit_mode=True não afeta um GUARD_STATE_CHANGE (tipo B) — mesmo em
    active-supervised, o escopo desta primeira etapa é só PR_NEEDS_AUDIT +
    tipo A. Confirma que não existe risco de loop de comentário em eventos
    administrativos."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        cfg = Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE)
        t = _TransporteContador(_RespostaFalsa("resumo genérico"))
        r = observe(_evento_guard("failure", 1, "x1"), config=cfg, dedup=dedup, ledger=ledger,
                     workers=_workers(), transport=t, audit_mode=True)
        assert r.audit_decision is None
        assert r.should_comment is False
        assert t.calls == 1, "o caminho V2 (resumo genérico) continua fazendo sua chamada normal"
    print("OK  test_audit_scope_restricted_to_pr_needs_audit_type_a")


def test_invalid_protocol_response_never_becomes_merge_ready_end_to_end() -> None:
    """Prova de ponta a ponta (não só a unidade parse_decision): mesmo com
    diff real e Lei das Questões satisfeita, uma resposta do LLM fora do
    protocolo nunca pode resultar em MERGE-READY."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("Acho que ficou bom, pode seguir."))
        r = _observar_pr_materia(head_sha="ip1", body="ajuste de prosa didática", transport=t,
                                  dedup=dedup, ledger=ledger, pr_diff=_DIFF_REAL_EXEMPLO)
        assert r.audit_decision == "NEEDS-FIX"
    print("OK  test_invalid_protocol_response_never_becomes_merge_ready_end_to_end")


def test_observe_mode_never_runs_the_audit_path() -> None:
    """MODE=observe (produção hoje) precisa continuar byte a byte no
    comportamento V2 — mesmo para um evento que, em active-supervised,
    ativaria a auditoria."""
    with tempfile.TemporaryDirectory() as tmp:
        dedup = Deduplicator(InMemoryStore())
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        t = _TransporteContador(_RespostaFalsa("resumo genérico do V2"))
        r = _observar_pr_materia(head_sha="obs1", body="qualquer coisa", transport=t,
                                  dedup=dedup, ledger=ledger, audit_mode=False)
        assert r.audit_decision is None
        assert r.merge_card is None
        assert r.should_comment is False
        assert t.calls == 1
        assert r.response_text == "resumo genérico do V2"
    print("OK  test_observe_mode_never_runs_the_audit_path")


# ---------------------------------------------------------------------------
# 7. __main__.py — --comment-out só grava quando há Cartão de Merge.
# ---------------------------------------------------------------------------

def test_comment_out_writes_only_when_should_comment_and_card_present() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "comentario.md")
        _gravar_comment_out(caminho, {
            "should_comment": True, "merge_card": "## Cartão de Merge\nconteúdo", "comment_target_issue": 97,
        })
        assert os.path.exists(caminho)
        with open(caminho, encoding="utf-8") as fh:
            assert "Cartão de Merge" in fh.read()
    print("OK  test_comment_out_writes_only_when_should_comment_and_card_present")


def test_comment_out_skips_when_should_comment_false() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "comentario.md")
        _gravar_comment_out(caminho, {
            "should_comment": False, "merge_card": "texto que não devia sair", "comment_target_issue": 97,
        })
        assert not os.path.exists(caminho)
    print("OK  test_comment_out_skips_when_should_comment_false")


def test_comment_out_skips_when_card_missing() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "comentario.md")
        _gravar_comment_out(caminho, {"should_comment": True, "merge_card": None, "comment_target_issue": 97})
        assert not os.path.exists(caminho)
    print("OK  test_comment_out_skips_when_card_missing")


def test_comment_out_skips_when_target_issue_missing() -> None:
    """Correção B4 da auditoria independente do PR #104, rodada 4: sem
    destino explícito, o CLI nunca grava o comentário — o workflow nunca
    pode ser deixado para adivinhar onde postar."""
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "comentario.md")
        _gravar_comment_out(caminho, {
            "should_comment": True, "merge_card": "## Cartão de Merge", "comment_target_issue": None,
        })
        assert not os.path.exists(caminho)
    print("OK  test_comment_out_skips_when_target_issue_missing")


def main() -> int:
    testes = [
        test_prova_a_mesmo_pr_mesmo_head_mesmo_estado_zero_chamada_nova,
        test_prova_b_mesmo_pr_novo_head_mesmo_estado_e_auditoria_nova,
        test_prova_c_rerun_do_guard_no_mesmo_head_zero_chamada_duplicada,
        test_dedup_key_ainda_diferencia_mudanca_real_de_estado,
        test_pr_needs_audit_carries_head_sha_audit_pack_and_body,
        test_pr_needs_audit_without_materia_area_leaves_materia_none,
        test_guard_state_change_carries_head_sha_in_dedup_fields,
        test_comment_with_coordinator_marker_is_ignored_even_from_trusted_actor,
        test_rendered_merge_card_always_carries_the_marker,
        test_comment_without_marker_from_trusted_actor_still_works,
        test_active_supervised_mode_opens_gate_and_sets_flag,
        test_observe_mode_is_unaffected_by_the_new_mode,
        test_unknown_mode_still_blocked,
        test_parse_decision_merge_ready,
        test_parse_decision_needs_fix,
        test_parse_decision_without_protocol_defaults_to_needs_fix,
        test_parse_decision_empty_response_defaults_to_needs_fix,
        test_classificar_publicacao_site_file_is_sim,
        test_classificar_publicacao_only_coordination_docs_is_nao,
        test_classificar_publicacao_ambiguous_defaults_sim,
        test_classificar_publicacao_empty_list_defaults_sim,
        test_avaliar_lei_das_questoes_relatorio_completo_satisfeita,
        test_avaliar_lei_das_questoes_relatorio_ausente_nao_satisfeita,
        test_aplicar_lei_das_questoes_rebaixa_merge_ready_sem_relatorio,
        test_aplicar_lei_das_questoes_mantem_merge_ready_com_relatorio,
        test_aplicar_lei_das_questoes_nao_se_aplica_fora_de_prova,
        test_render_merge_card_contains_merge_publicacao_alvo_apos_publicar,
        test_guard_hard_fail_yields_needs_fix_with_zero_api_cost,
        test_guard_state_change_hard_fail_yields_needs_fix_with_zero_api_cost,
        test_audit_merge_ready_without_questoes,
        test_audit_merge_ready_downgraded_by_lei_das_questoes,
        test_audit_merge_ready_survives_with_full_report,
        test_audit_merge_ready_blocked_without_real_diff,
        test_audit_merge_ready_blocked_with_truncated_diff,
        test_invalid_protocol_response_never_becomes_merge_ready_end_to_end,
        test_audit_scope_restricted_to_pr_needs_audit_type_a,
        test_observe_mode_never_runs_the_audit_path,
        test_comment_out_writes_only_when_should_comment_and_card_present,
        test_comment_out_skips_when_should_comment_false,
        test_comment_out_skips_when_card_missing,
        test_comment_out_skips_when_target_issue_missing,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {e}")
    print(f"\n{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
