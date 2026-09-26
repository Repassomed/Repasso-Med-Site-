"""Caso real PR #305 — o auditor precisa ver o diff INTEIRO.

A PR #305 (Neurologia, 1 arquivo, 9 hunks, 21.445 caracteres) recebeu
NEEDS-FIX dos dois auditores porque o diff chegava cortado em 8.000
caracteres: Q2, Q4, os espelhos no Banco General e as contagens ficavam
depois do corte. Estes testes cobrem os 10 pontos pedidos:

1. diff pequeno → enviado inteiro;
2. diff maior → partes, 100% dos hunks cobertos;
3. hunks distantes → todos aparecem;
4. fim do arquivo alterado → não some;
5. Banco General + corpo → os dois aparecem;
6. nenhum arquivo fora da PR entra no contexto;
7. parte faltando nunca vira MERGE-READY;
8. mesmo HEAD + política continua deduplicado;
9. zero merge/deploy no mecanismo novo;
10. o empacotamento nunca altera o conteúdo (nenhuma edição médica).
"""

from __future__ import annotations

import os
import re
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator import audit, audit_diff, merge_card, openai_audit
from coordinator.audit_diff import MAX_PARTES_DIFF, empacotar_diff
from coordinator.budget import UsageLedger
from coordinator.config import ACTIVE_SUPERVISED_MODE, Config
from coordinator.context import MinimalContext
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.github_event import (
    DIFF_EVIDENCE_POLICY, LEGACY_AUDIT_DIFF_CHARS, build_event_from_github_context,
)
from coordinator.observe import observe
from coordinator.openai_config import OpenAIAuditorConfig

from .test_coordinator_v3 import (
    REPO, _OPENAI_MERGE_READY, _RespostaFalsa, _TITULO_SEM_AVALIACAO, _evento_pr_materia, _workers,
)

ARQ = "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html"


class _Gravador:
    """Transporte falso que guarda o prompt de cada chamada."""

    def __init__(self, respostas: list[str]) -> None:
        self.respostas = list(respostas)
        self.prompts: list[str] = []

    @property
    def calls(self) -> int:
        return len(self.prompts)

    def send(self, request):
        self.prompts.append(request.prompt)
        texto = self.respostas[min(len(self.prompts) - 1, len(self.respostas) - 1)]
        return _RespostaFalsa(texto)


def _hunk(linha: int, marcador: str, n: int = 3, largura: int = 60) -> str:
    """Um hunk válido que troca uma linha e insere ``n`` linhas."""
    corpo = [f"@@ -{linha},3 +{linha},{3 + n} @@ <section id=\"{marcador}\">\n",
             f" contexto antes {marcador}\n",
             f"-linha antiga {marcador}\n",
             f"+linha nova {marcador}\n"]
    corpo += [f"+{marcador} inserida {i} " + "x" * largura + "\n" for i in range(n - 1)]
    corpo += [f" contexto depois {marcador}\n"]
    return "".join(corpo)


def _diff(*hunks: str, arquivo: str = ARQ, fim_sem_newline: bool = False) -> str:
    cab = (f"diff --git a/{arquivo} b/{arquivo}\nindex 1111111..2222222 100644\n"
           f"--- a/{arquivo}\n+++ b/{arquivo}\n")
    texto = cab + "".join(hunks)
    if fim_sem_newline:
        texto += "\\ No newline at end of file\n"
    return texto


def _linhas_alteradas(diff: str) -> list[str]:
    return [l for l in diff.splitlines()
            if (l.startswith("+") and not l.startswith("+++ ")) or (l.startswith("-") and not l.startswith("--- "))]


def _observar(diff: str, *, anthropic: list[str], openai: list[str] | None = None, head_sha: str = "h305",
              dedup=None, ledger=None, body: str = "ajuste de prosa didática"):
    payload, pr_info = _evento_pr_materia(run_id=1, head_sha=head_sha, body=body, titulo=_TITULO_SEM_AVALIACAO)
    ev = build_event_from_github_context("workflow_run", payload, REPO, pr_info=pr_info, pr_diff=diff)
    tmp = tempfile.mkdtemp()
    t_a = _Gravador(anthropic)
    t_o = _Gravador(openai or [_OPENAI_MERGE_READY])
    r = observe(
        ev, config=Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE),
        dedup=dedup or Deduplicator(InMemoryStore()),
        ledger=ledger or UsageLedger(os.path.join(tmp, "usage.json")),
        workers=_workers(), transport=t_a, audit_mode=True,
        openai_config=OpenAIAuditorConfig(enabled=True),
        openai_ledger=UsageLedger(os.path.join(tmp, "usage-openai.json")), openai_transport=t_o,
    )
    return r, t_a, t_o, ev


def _diff_grande(n_hunks: int = 24, n_linhas: int = 30) -> str:
    return _diff(*[_hunk(100 + i * 400, f"neub{i:02d}", n=n_linhas, largura=90) for i in range(n_hunks)])


# 1 ---------------------------------------------------------------------------
def test_diff_pequeno_vai_inteiro_com_rotulo_completo() -> None:
    d = _diff(_hunk(968, "neub02"), _hunk(9361, "banconeu"))
    p = empacotar_diff(d)
    assert p.auditavel and p.n_partes == 1
    assert p.rotulo.startswith("DIFF COMPLETO: sim")
    assert d in p.partes[0].texto, "o diff inteiro tem que estar na parte única, sem corte"
    r, t_a, t_o, _ = _observar(d, anthropic=["DECISÃO: MERGE-READY\nTudo conferido."])
    assert (t_a.calls, t_o.calls) == (1, 1)
    for prompt in (t_a.prompts[0], t_o.prompts[0]):
        assert d in prompt and "=== FIM DO DIFF COMPLETO (parte 1/1) ===" in prompt
        assert "TRUNCADO" not in prompt and "truncado" not in prompt
    assert r.audit_decision == "MERGE-READY"
    assert "DIFF COMPLETO: sim" in r.merge_card
    assert "truncad" not in r.merge_card.lower()
    print("OK  test_diff_pequeno_vai_inteiro_com_rotulo_completo")


# 2 ---------------------------------------------------------------------------
def test_diff_maior_vai_em_partes_com_100_por_cento_dos_hunks() -> None:
    d = _diff_grande()
    assert len(d) > audit_diff.MAX_DIFF_CHARS_POR_PARTE
    p = empacotar_diff(d)
    assert p.completo and 1 < p.n_partes <= MAX_PARTES_DIFF, p.rotulo
    assert "todas as linhas alteradas cobertas" in p.rotulo
    vistos = sorted(h for parte in p.partes for h in parte.hunks)
    assert sorted(set(vistos)) == list(range(1, p.total_hunks + 1)), "cada hunk em alguma parte"
    juntas = "\n".join(parte.texto for parte in p.partes)
    for linha in _linhas_alteradas(d):
        assert linha in juntas, f"linha alterada sumiu: {linha[:60]}"
    for parte in p.partes:
        assert len(parte.texto) <= audit_diff.MAX_DIFF_CHARS_POR_PARTE
        assert f"PARTE {parte.indice}/{p.n_partes}" in parte.texto and parte.texto.endswith(parte.sentinela)

    r, t_a, t_o, _ = _observar(d, anthropic=["DECISÃO: MERGE-READY\nParte conferida."])
    assert t_a.calls == p.n_partes and t_o.calls == p.n_partes, "uma chamada por parte, por auditor"
    for i, parte in enumerate(p.partes):
        assert parte.texto in t_a.prompts[i] and parte.texto in t_o.prompts[i]
    assert r.audit_decision == "MERGE-READY", "todas as partes MERGE-READY → MERGE-READY"
    assert f"DIFF EM {p.n_partes} PARTES" in r.merge_card
    print("OK  test_diff_maior_vai_em_partes_com_100_por_cento_dos_hunks")


def test_hunk_gigante_e_dividido_sem_perder_linha_nem_numeracao() -> None:
    d = _diff(_hunk(500, "neub05", n=900, largura=90))
    p = empacotar_diff(d)
    assert p.completo and p.n_partes > 1
    juntas = "".join(parte.texto for parte in p.partes)
    for linha in _linhas_alteradas(d):
        assert linha in juntas
    assert re.search(r"@@ -\d+ \+\d+ @@ \[continuação 2/\d+ do hunk 1", juntas)
    print("OK  test_hunk_gigante_e_dividido_sem_perder_linha_nem_numeracao")


# 3 ---------------------------------------------------------------------------
def test_hunks_distantes_aparecem_todos_como_na_305() -> None:
    linhas = [968, 997, 1346, 1372, 2431, 2501, 9267, 9290, 9361]
    d = _diff(*[_hunk(n, f"h{n}", n=6) for n in linhas])
    p = empacotar_diff(d)
    assert p.n_partes == 1 and p.total_hunks == 9
    for n in linhas:
        assert f"@@ -{n},3" in p.partes[0].texto
    print("OK  test_hunks_distantes_aparecem_todos_como_na_305")


# 4 ---------------------------------------------------------------------------
def test_fim_do_arquivo_alterado_nao_some() -> None:
    d = _diff(_hunk(10, "inicio"), _hunk(12000, "ultima-linha-do-arquivo"), fim_sem_newline=True)
    p = empacotar_diff(d)
    texto = p.partes[-1].texto
    assert "+linha nova ultima-linha-do-arquivo" in texto
    assert "\\ No newline at end of file" in texto
    assert texto.index("\\ No newline at end of file") < texto.index(p.partes[-1].sentinela)
    grande = _diff(*[_hunk(100 + i * 400, f"b{i:02d}", n=30, largura=90) for i in range(20)],
                   _hunk(99999, "fim-real"), fim_sem_newline=True)
    pg = empacotar_diff(grande)
    assert "+linha nova fim-real" in pg.partes[-1].texto
    print("OK  test_fim_do_arquivo_alterado_nao_some")


# 5 ---------------------------------------------------------------------------
def test_banco_general_e_corpo_aparecem_para_os_dois_auditores() -> None:
    enchimento = [_hunk(3000 + i * 50, f"meio{i}", n=20, largura=80) for i in range(6)]
    d = _diff(_hunk(997, "neub05-Q2-corpo"), *enchimento, _hunk(9361, "banconeu-Q2-espelho"))
    assert len(d) > LEGACY_AUDIT_DIFF_CHARS, "o espelho fica depois do corte antigo de 8.000"
    r, t_a, t_o, _ = _observar(d, anthropic=["DECISÃO: MERGE-READY\nCorpo e espelho idênticos."])
    for prompt in (t_a.prompts[0], t_o.prompts[0]):
        assert "+linha nova neub05-Q2-corpo" in prompt
        assert "+linha nova banconeu-Q2-espelho" in prompt
    print("OK  test_banco_general_e_corpo_aparecem_para_os_dois_auditores")


# 6 ---------------------------------------------------------------------------
def test_nenhum_arquivo_fora_da_pr_entra_no_contexto() -> None:
    d = _diff(_hunk(10, "a")) + _diff(_hunk(20, "b"), arquivo="Repasso-Med-Site--main/Atual - Copia/x.html")
    p = empacotar_diff(d)
    assert set(p.arquivos) == {ARQ, "Repasso-Med-Site--main/Atual - Copia/x.html"}
    cabecalhos = set(re.findall(r"^diff --git a/(\S.*?) b/", "".join(x.texto for x in p.partes), re.M))
    assert cabecalhos <= set(p.arquivos)
    _, t_a, _, _ = _observar(d, anthropic=["DECISÃO: NEEDS-FIX\nx"])
    assert "styles.css" not in t_a.prompts[0] and "app-core.js" not in t_a.prompts[0]
    print("OK  test_nenhum_arquivo_fora_da_pr_entra_no_contexto")


# 7 ---------------------------------------------------------------------------
def test_parte_sem_auditoria_nunca_vira_merge_ready() -> None:
    d = _diff_grande()
    n = empacotar_diff(d).n_partes
    assert n >= 2
    # Parte 2 com resposta fora do protocolo: falha técnica, nunca MERGE-READY.
    respostas = ["DECISÃO: MERGE-READY\nok"] + ["texto sem protocolo"] + ["DECISÃO: MERGE-READY\nok"] * n
    r, t_a, _, _ = _observar(d, anthropic=respostas)
    assert t_a.calls == n
    assert r.audit_decision == "NEEDS-FIX"
    assert "NÃO AUDITADA" in r.merge_card and "AUDITOR-TECHNICAL-FAILURE" in r.merge_card
    assert r.audit_technical_failure is True
    # Parte com reprovação real de conteúdo: NEEDS-FIX de conteúdo.
    respostas = ["DECISÃO: MERGE-READY\nok", "DECISÃO: NEEDS-FIX\nespelho Q4 divergente"] + ["DECISÃO: MERGE-READY\nok"] * n
    r, _, _, _ = _observar(d, anthropic=respostas, head_sha="h2")
    assert r.audit_decision == "NEEDS-FIX" and "espelho Q4 divergente" in r.merge_card
    assert r.audit_technical_failure is False
    # OpenAI reprovando só uma parte também derruba o resultado.
    r, _, t_o, _ = _observar(d, anthropic=["DECISÃO: MERGE-READY\nok"],
                             openai=[_OPENAI_MERGE_READY, _OPENAI_MERGE_READY.replace("MERGE-READY", "NEEDS-FIX")],
                             head_sha="h3")
    assert t_o.calls == n and r.audit_decision == "NEEDS-FIX"
    # Gate determinístico isolado.
    assert merge_card.aplicar_gate_diff("MERGE-READY", diff_disponivel=True, diff_truncado=False,
                                        partes_nao_auditadas=1)[0] == "NEEDS-FIX"
    print("OK  test_parte_sem_auditoria_nunca_vira_merge_ready")


def test_diff_que_nao_cabe_em_partes_falha_fechado_sem_chamada_paga() -> None:
    d = _diff_grande(n_hunks=80)
    p = empacotar_diff(d)
    assert p.n_partes > MAX_PARTES_DIFF and not p.auditavel
    r, t_a, t_o, _ = _observar(d, anthropic=["DECISÃO: MERGE-READY\nnunca devia chegar aqui"])
    assert (t_a.calls, t_o.calls) == (0, 0), "evidência sabidamente incompleta: zero chamada paga"
    assert r.call_attempted is False and r.audit_decision == "NEEDS-FIX"
    assert r.audit_technical_failure is True and "AUDITOR-TECHNICAL-FAILURE" in r.merge_card
    assert "Nenhuma chamada paga" in r.merge_card
    print("OK  test_diff_que_nao_cabe_em_partes_falha_fechado_sem_chamada_paga")


def test_prompt_nunca_corta_o_diff_so_o_corpo_da_pr() -> None:
    d = _diff(*[_hunk(100 + i * 400, f"q{i:02d}", n=30, largura=90) for i in range(10)])
    assert empacotar_diff(d).n_partes == 1 and len(d) > 30_000
    corpo = "declaração do worker " * 5000
    ctx = MinimalContext(summary="resumo", guard_result=None, guard_hard_fails=[], guard_warnings=[], extra={})
    for build in (audit.build_audit_prompt, openai_audit.build_openai_audit_prompt):
        prompt = build(ctx, pr_body=corpo, envolve_questoes=False, pr_diff=d, source_pack_text="p" * 5900,
                       head_context_text="h" * 9000)
        parte = empacotar_diff(d).partes[0]
        assert audit_diff.prompt_contem_parte(prompt, parte)
        assert "corpo da PR encurtado" in prompt
        assert len(prompt) <= audit.MAX_AUDIT_PROMPT_CHARS
    print("OK  test_prompt_nunca_corta_o_diff_so_o_corpo_da_pr")


# 8 ---------------------------------------------------------------------------
def test_mesmo_head_e_politica_continua_deduplicado() -> None:
    d = _diff_grande()
    dedup = Deduplicator(InMemoryStore())
    ledger = UsageLedger(os.path.join(tempfile.mkdtemp(), "usage.json"))
    _, t1, _, ev1 = _observar(d, anthropic=["DECISÃO: NEEDS-FIX\nx"], dedup=dedup, ledger=ledger)
    _, t2, o2, ev2 = _observar(d, anthropic=["DECISÃO: NEEDS-FIX\nx"], dedup=dedup, ledger=ledger)
    assert t1.calls > 1 and (t2.calls, o2.calls) == (0, 0)
    assert ev1.dedup_key() == ev2.dedup_key()
    # Só diff maior que o corte antigo ganha o campo novo (uma reauditoria);
    # PR pequena, vista inteira antes, mantém a MESMA chave: zero custo novo.
    assert ev1.payload["dedup_fields"]["diff_evidence"] == DIFF_EVIDENCE_POLICY
    _, _, _, ev_pequena = _observar(_diff(_hunk(10, "x")), anthropic=["DECISÃO: NEEDS-FIX\nx"])
    assert "diff_evidence" not in ev_pequena.payload["dedup_fields"]
    print("OK  test_mesmo_head_e_politica_continua_deduplicado")


# 9 ---------------------------------------------------------------------------
def test_mecanismo_novo_nao_faz_merge_deploy_nem_rede() -> None:
    fonte = open(audit_diff.__file__, encoding="utf-8").read()
    for proibido in ("merge(", "pulls.merge", "deploy(", "import requests", "urllib", "subprocess",
                     "open(", "anthropic", "openai"):
        assert proibido not in fonte, proibido
    imports = set(re.findall(r"^(?:from|import) (\S+)", fonte, re.M))
    assert imports <= {"__future__", "re", "dataclasses"}, imports
    print("OK  test_mecanismo_novo_nao_faz_merge_deploy_nem_rede")


# 10 --------------------------------------------------------------------------
def test_empacotamento_nunca_altera_o_conteudo() -> None:
    d = _diff(_hunk(968, "Wernicke — área 22, «comprensión»"), _hunk(9361, "banconeu ñ á é"),
              fim_sem_newline=True)
    for limite in (audit_diff.MAX_DIFF_CHARS_POR_PARTE, 2_000):
        p = empacotar_diff(d, max_chars_por_parte=limite)
        assert p.completo
        juntas = "".join(x.texto for x in p.partes)
        pos = 0
        for linha in d.splitlines():
            achou = juntas.find(linha, pos)
            assert achou >= 0, f"linha alterada/reordenada: {linha[:60]}"
            pos = achou
    print("OK  test_empacotamento_nunca_altera_o_conteudo")


TESTS = [
    test_diff_pequeno_vai_inteiro_com_rotulo_completo,
    test_diff_maior_vai_em_partes_com_100_por_cento_dos_hunks,
    test_hunk_gigante_e_dividido_sem_perder_linha_nem_numeracao,
    test_hunks_distantes_aparecem_todos_como_na_305,
    test_fim_do_arquivo_alterado_nao_some,
    test_banco_general_e_corpo_aparecem_para_os_dois_auditores,
    test_nenhum_arquivo_fora_da_pr_entra_no_contexto,
    test_parte_sem_auditoria_nunca_vira_merge_ready,
    test_diff_que_nao_cabe_em_partes_falha_fechado_sem_chamada_paga,
    test_prompt_nunca_corta_o_diff_so_o_corpo_da_pr,
    test_mesmo_head_e_politica_continua_deduplicado,
    test_mecanismo_novo_nao_faz_merge_deploy_nem_rede,
    test_empacotamento_nunca_altera_o_conteudo,
]


def main() -> int:
    falhas = 0
    for t in TESTS:
        try:
            t()
        except Exception as exc:  # noqa: BLE001
            falhas += 1
            print(f"FALHOU  {t.__name__}: {type(exc).__name__}: {exc}")
    print(f"\n{len(TESTS) - falhas}/{len(TESTS)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
