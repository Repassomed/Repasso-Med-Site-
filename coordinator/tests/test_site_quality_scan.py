"""Regressões do painel global READ-ONLY."""

from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
import sys

from coordinator import anthropic_client, openai_client
from coordinator import site_quality_scan as sqs
from coordinator.site_quality_scan import resolve_deterministic, static

_REPO = Path(__file__).resolve().parents[2]
_MATTER = "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas"


def test_static_ignora_tags_ids_e_metatexto_em_comentario_html() -> None:
    texto = """
<!-- Estrutura: <div id="tab-x"><section> Cómo estudiar esta materia -->
<div id="tab-x"><section id="real"><p>Contenido real</p></section></div>
"""
    achados = static(Path("materia.html"), texto)
    titulos = {x["title"] for x in achados}
    assert "IDs HTML duplicados" not in titulos
    assert "HTML possivelmente desbalanceado: <div>" not in titulos
    assert "HTML possivelmente desbalanceado: <section>" not in titulos
    assert "Metatexto de estudo/interface ainda presente" not in titulos
    print("OK  test_static_ignora_tags_ids_e_metatexto_em_comentario_html")


def test_deterministic_antigo_some_quando_nao_e_reproduzido() -> None:
    report = {"findings": [
        {"id": "old-static", "found_by": "deterministic", "status": "OPEN"},
        {"id": "human-review", "found_by": "claude", "status": "OPEN"},
    ]}
    resolve_deterministic(report, [], "2026-09-29T00:00:00+00:00")
    por_id = {x["id"]: x for x in report["findings"]}
    assert por_id["old-static"]["status"] == "RESOLVED"
    assert por_id["old-static"]["resolved_at"] == "2026-09-29T00:00:00+00:00"
    assert por_id["human-review"]["status"] == "OPEN"
    print("OK  test_deterministic_antigo_some_quando_nao_e_reproduzido")


def test_deterministic_atual_permanece_aberto() -> None:
    atual = {"id": "same", "found_by": "deterministic", "status": "OPEN"}
    report = {"findings": [dict(atual)]}
    resolve_deterministic(report, [atual], "2026-09-29T00:00:00+00:00")
    assert report["findings"][0]["status"] == "OPEN"
    print("OK  test_deterministic_atual_permanece_aberto")


# ── Inversão do custo: OpenAI principal → Claude Haiku só nos incertos ──────

def _finding(n: int, certainty: str | None) -> dict:
    x = {"severity": "P2", "category": "science", "title": f"Achado {n}", "location": f"secao-{n}",
         "evidence": f"Evidência concreta {n}", "why": "porque sim", "confidence": "high",
         "context": f"Trecho literal {n}"}
    if certainty is not None:
        x["certainty"] = certainty
    return x


class _Sim:
    """Transportes simulados: NENHUMA chamada de rede."""

    def __init__(self, openai_reply, claude_reply=None, claude_raises=False):
        self.openai_reply, self.claude_reply, self.claude_raises = openai_reply, claude_reply, claude_raises
        self.openai_calls = self.claude_calls = 0
        self.openai_inits = self.claude_inits = 0
        self.openai_kwargs: list[dict] = []
        self.claude_kwargs: list[dict] = []
        self.claude_prompt = ""
        self.openai_reqs: list = []
        self.claude_reqs: list = []

    def __enter__(self):
        sim = self
        self._orig = (sqs.OpenAIResponsesTransport, sqs.AnthropicTransport)
        self._env = {k: os.environ.pop(k, None) for k in ("REPASSO_QUALITY_OPENAI_MODEL", "REPASSO_QUALITY_CLAUDE_MODEL")}

        class FakeOpenAI:
            def __init__(self, **kw):
                sim.openai_inits += 1
                sim.openai_kwargs.append(kw)

            def send(self, req):
                sim.openai_calls += 1
                sim.openai_reqs.append(req)
                reply = sim.openai_reply
                if isinstance(reply, Exception):
                    raise reply
                return openai_client.TransportResponse(text=reply, input_tokens=1000, output_tokens=200)

        class FakeClaude:
            def __init__(self, **kw):
                sim.claude_inits += 1
                sim.claude_kwargs.append(kw)

            def send(self, req):
                sim.claude_calls += 1
                sim.claude_reqs.append(req)
                sim.claude_prompt = req.prompt
                if sim.claude_raises:
                    raise RuntimeError("boom")
                return anthropic_client.TransportResponse(text=sim.claude_reply, input_tokens=300, output_tokens=50)

        sqs.OpenAIResponsesTransport, sqs.AnthropicTransport = FakeOpenAI, FakeClaude
        return self

    def __exit__(self, *exc):
        sqs.OpenAIResponsesTransport, sqs.AnthropicTransport = self._orig
        for k, v in self._env.items():
            if v is not None:
                os.environ[k] = v
        return False


def _fixture() -> tuple[Path, Path]:
    root = Path(tempfile.mkdtemp())
    d = root / _MATTER
    d.mkdir(parents=True)
    (d / "ejemplo.html").write_text('<section id="a"><p>Contenido real</p></section>', "utf-8")
    # Deferidas: têm ID duplicado (achado estático P0 se fossem varridas) e NÃO podem gerar nada.
    for nome in ("imagenologia.html", "bioestadistica.html"):
        (d / nome).write_text('<section id="x"></section><section id="x"></section>', "utf-8")
    return root, Path(tempfile.mkdtemp())


def _run(sim: _Sim, extra: list[str] | None = None):
    root, work = _fixture()
    argv = ["--root", str(root), "--work", str(work)] + (extra or [])
    rc = 0
    try:
        with sim:
            sqs.main(argv)
    except SystemExit as exc:
        rc = exc.code if isinstance(exc.code, int) else 1
        if isinstance(exc.code, str):
            sim.exit_message = exc.code
    report = root / "coordination/quality/global-findings.json"
    data = json.loads(report.read_text("utf-8")) if report.exists() else None
    return rc, data, root


def test_A_openai_sem_achados_zero_claude() -> None:
    sim = _Sim('{"findings":[]}')
    rc, data, _ = _run(sim)
    assert rc == 0 and sim.openai_calls == 1 and sim.claude_calls == 0 and sim.claude_inits == 0
    cost = data["runs"][-1]["cost"]
    assert cost["claude_calls"] == 0 and cost["claude_spared"] is True and cost["openai_calls"] == 1
    assert cost["openai_input_tokens"] == 1000 and cost["openai_output_tokens"] == 200
    # Deferidas nunca aparecem, nem nos achados estáticos.
    assert not [x for x in data["findings"] if x["subject"] in {"imagenologia", "bioestadistica"}]
    print("OK  test_A_openai_sem_achados_zero_claude")


def test_B_achados_claros_zero_claude() -> None:
    reply = json.dumps({"findings": [_finding(1, "CONFIRMED"), _finding(2, "CONFIRMED")]})
    sim = _Sim(reply)
    rc, data, root = _run(sim)
    assert rc == 0 and sim.claude_calls == 0 and sim.claude_inits == 0
    abertos = [x for x in data["findings"] if x.get("found_by") == "openai"]
    assert len(abertos) == 2 and all(x["second_opinion"] == "not_needed" for x in abertos)
    assert (root / "coordination/quality/global-findings.md").exists()
    print("OK  test_B_achados_claros_zero_claude")


def test_C_dois_incertos_uma_chamada_claude_so_com_eles() -> None:
    reply = json.dumps({"findings": [_finding(1, "CONFIRMED"), _finding(2, "NEEDS_SECOND_OPINION"), _finding(3, "NEEDS_SECOND_OPINION")]})
    ids = {}
    sim = _Sim(reply)
    # decisões dependem dos ids reais: gera-os com o mesmo fid() do scanner
    for n in (2, 3):
        f = _finding(n, None)
        ids[n] = sqs.fid("ejemplo", f["category"], f["title"], f["location"], f["evidence"][:200])
    sim.claude_reply = json.dumps({"decisions": [{"id": ids[2], "decision": "KEEP", "reason": "ok"}, {"id": ids[3], "decision": "DROP", "reason": "gosto"}]})
    rc, data, _ = _run(sim)
    assert rc == 0 and sim.claude_calls == 1 and sim.claude_inits == 1
    enviados = json.loads(sim.claude_prompt)["items"]
    assert {i["id"] for i in enviados} == set(ids.values())  # SÓ os 2 incertos
    assert "Contenido real" not in sim.claude_prompt and "HTML:" not in sim.claude_prompt  # matéria NÃO reenviada
    por_titulo = {x["title"]: x for x in data["findings"] if x.get("found_by") == "openai"}
    assert set(por_titulo) == {"Achado 1", "Achado 2"}  # o DROP do Claude sumiu
    assert por_titulo["Achado 2"]["second_opinion"] == "KEEP" and por_titulo["Achado 1"]["second_opinion"] == "not_needed"
    cost = data["runs"][-1]["cost"]
    assert cost["claude_calls"] == 1 and cost["claude_spared"] is False and data["runs"][-1]["dropped"] == 1
    print("OK  test_C_dois_incertos_uma_chamada_claude_so_com_eles")


def test_D_claude_falha_relatorio_openai_continua_sem_retry() -> None:
    reply = json.dumps({"findings": [_finding(1, "NEEDS_SECOND_OPINION"), _finding(2, "NEEDS_SECOND_OPINION")]})
    sim = _Sim(reply, claude_raises=True)
    rc, data, _ = _run(sim)
    assert rc == 0 and sim.claude_calls == 1  # exatamente 1 tentativa, sem retry
    abertos = [x for x in data["findings"] if x.get("found_by") == "openai"]
    assert len(abertos) == 2 and all(x["second_opinion"] == "UNAVAILABLE" for x in abertos)
    assert data["runs"][-1]["uncertain"] == 2 and "Anthropic" in (data["runs"][-1]["api_error"] or "")
    cost = data["runs"][-1]["cost"]
    assert cost["claude_attempts"] == 1 and cost["claude_spared"] is False
    print("OK  test_D_claude_falha_relatorio_openai_continua_sem_retry")


def test_E_openai_json_invalido_falha_fechada_sem_inventar() -> None:
    for reply in ("isto não é json", RuntimeError("api down"), '{"findings": "nao-lista"}'):
        sim = _Sim(reply)
        rc, data, root = _run(sim)
        assert rc == 1 and data is None and sim.openai_calls == 1 and sim.claude_calls == 0
        assert not (root / "coordination").exists()  # nada escrito
    print("OK  test_E_openai_json_invalido_falha_fechada_sem_inventar")


def test_F_materias_deferidas_recusadas_sem_chamada() -> None:
    for slug in ("imagenologia", "bioestadistica", "Imagenologia.html", "BIOESTADISTICA"):
        sim = _Sim('{"findings":[]}')
        rc, data, root = _run(sim, ["--subject", slug])
        assert rc != 0 and sim.openai_calls == 0 and sim.claude_calls == 0 and data is None
        assert "deferida" in getattr(sim, "exit_message", "").lower()
    print("OK  test_F_materias_deferidas_recusadas_sem_chamada")


def test_G_certainty_ausente_e_teto_de_itens_claude() -> None:
    itens = [_finding(n, None) for n in range(1, 19)]  # 18 sem certainty → NEEDS_SECOND_OPINION
    sim = _Sim(json.dumps({"findings": itens}), claude_reply='{"decisions":[]}')
    rc, data, _ = _run(sim)
    assert rc == 0 and sim.claude_calls == 1
    assert len(json.loads(sim.claude_prompt)["items"]) == sqs.CLAUDE_MAX_ITEMS == 12
    print("OK  test_G_certainty_ausente_e_teto_de_itens_claude")


def test_H_modelos_tiers_e_sem_retry() -> None:
    sim = _Sim(json.dumps({"findings": [_finding(1, "NEEDS_SECOND_OPINION")]}), claude_reply='{"decisions":[]}')
    _run(sim)
    o, c = sim.openai_reqs[0], sim.claude_reqs[0]
    assert (o.model_id, o.tier) == ("gpt-5.6-terra", "TERRA") and o.max_output_tokens == sqs.OPENAI_MAX_OUT
    assert (c.model_id, c.tier) == ("claude-haiku-4-5-20251001", "FAST") and c.max_output_tokens == sqs.CLAUDE_MAX_OUT <= 1000
    assert all(k["max_retries"] == 0 for k in sim.openai_kwargs + sim.claude_kwargs)
    print("OK  test_H_modelos_tiers_e_sem_retry")


def test_I_etapas_isolam_chaves_e_saida_needs_claude() -> None:
    root, work = _fixture()
    out = Path(tempfile.mkdtemp()) / "gh_output"
    out.write_text("", "utf-8")
    os.environ["GITHUB_OUTPUT"] = str(out)
    try:
        sim = _Sim(json.dumps({"findings": [_finding(1, "NEEDS_SECOND_OPINION")]}), claude_reply='{"decisions":[]}')
        with sim:
            sqs.main(["--root", str(root), "--work", str(work), "--stage", "openai"])
            assert sim.openai_inits == 1 and sim.claude_inits == 0  # etapa OpenAI nunca instancia o Claude
            assert "needs_claude=true" in out.read_text("utf-8")
            sqs.main(["--root", str(root), "--work", str(work), "--stage", "claude"])
            assert sim.claude_inits == 1 and sim.openai_inits == 1  # etapa Claude nunca instancia a OpenAI
            sqs.main(["--root", str(root), "--work", str(work), "--stage", "finalize"])
            assert sim.openai_inits == 1 and sim.claude_inits == 1  # consolidação não usa nenhuma API
        assert (root / "coordination/quality/global-findings.json").exists()
        # sem incertos: needs_claude=false e a etapa Claude não chama nada
        root2, work2 = _fixture()
        out.write_text("", "utf-8")
        sim2 = _Sim('{"findings":[]}')
        with sim2:
            sqs.main(["--root", str(root2), "--work", str(work2), "--stage", "openai"])
            sqs.main(["--root", str(root2), "--work", str(work2), "--stage", "claude"])
        assert "needs_claude=false" in out.read_text("utf-8") and sim2.claude_inits == 0
    finally:
        os.environ.pop("GITHUB_OUTPUT", None)
    print("OK  test_I_etapas_isolam_chaves_e_saida_needs_claude")


def test_J_fonte_so_escreve_painel_e_estado_intermediario_confinado() -> None:
    src = (_REPO / "coordinator/site_quality_scan.py").read_text("utf-8")
    assert src.count(".write_text(") == 2  # JSON + Markdown do painel
    assert src.count(".write_bytes(") == 1
    assert src.index("def work_save") < src.index(".write_bytes(") < src.index("def work_load")  # só dentro de work_save
    assert "base not in t.parents" in src  # estado intermediário confinado ao diretório de trabalho
    assert "DEFERRED={'imagenologia','bioestadistica'}" in src
    assert "'imagenologia.html'" in src and "'bioestadistica.html'" in src
    print("OK  test_J_fonte_so_escreve_painel_e_estado_intermediario_confinado")


def _steps(yml: str) -> list[tuple[str, str]]:
    partes = re.split(r"\n      - name: ", yml)
    return [(p.split("\n", 1)[0], p) for p in partes[1:]]


def test_K_workflow_manual_only_e_chaves_por_passo() -> None:
    yml = (_REPO / ".github/workflows/repasso-quality-scan.yml").read_text("utf-8")
    ativo = "\n".join(l for l in yml.splitlines() if not l.strip().startswith("#"))
    assert "workflow_dispatch:" in ativo and "schedule" not in ativo and "cron" not in ativo
    assert "pull_request" not in ativo and "push:" not in ativo
    com_openai = [n for n, b in _steps(ativo) if "OPENAI_API_KEY" in b]
    com_claude = [n for n, b in _steps(ativo) if "ANTHROPIC_API_KEY" in b]
    assert len(com_openai) == 1 and len(com_claude) == 1 and com_openai != com_claude
    passo_claude = next(b for n, b in _steps(ativo) if "ANTHROPIC_API_KEY" in b)
    assert "needs_claude == 'true'" in passo_claude and "continue-on-error: true" in passo_claude
    assert "OPENAI_API_KEY" not in passo_claude
    assert "--stage openai" in yml and "--stage claude" in yml and "--stage finalize" in yml
    assert not re.search(r"gh pr (close|merge|comment|review)", ativo)
    print("OK  test_K_workflow_manual_only_e_chaves_por_passo")


# --------------------------------------------------------------------------
# Limpeza de PRs (repasso-pr-cleanup-prep.yml): proteção das matérias
# deferidas e do painel #368. Executa o bloco REAL de saneamento do workflow.
# --------------------------------------------------------------------------

def _cleanup_sanitize(raw_plan: dict, opened: list, merged: list | None = None) -> dict:
    import textwrap

    wf = (_REPO / ".github/workflows/repasso-pr-cleanup-prep.yml").read_text("utf-8")
    ini = wf.index("# ---------- saneamento determinístico ----------")
    fim = wf.index("          plan = {", ini)
    codigo = textwrap.dedent(" " * 10 + wf[ini:fim])
    ns = {"re": re, "raw_plan": raw_plan, "opened": opened, "merged": merged or []}
    exec(codigo, ns)
    return ns


def _pr(n: int, title: str, head: str = "claude/x") -> dict:
    return {"number": n, "title": title, "headRefName": head}


def test_L_imagenologia_close_stale_vira_keep_deferred() -> None:
    ns = _cleanup_sanitize(
        {"prs": [{"number": 501, "decision": "CLOSE_STALE_NO_MERGE", "reason": "velha",
                  "safe_to_close_without_code_change": True,
                  "closure_comment": "Fechando por obsolescência."}]},
        [_pr(501, "Imagenología — revisión de bloques")],
    )
    e = ns["entries"][501]
    assert e["decision"] == "KEEP_DEFERRED", e
    assert e["replacement_pr"] == 0, e
    assert e["safe_to_close_without_code_change"] is False, e
    assert e["closure_comment"] == "", e
    assert e["forced"] is True and e["forced_by"] == "deferred_subject", e
    assert 501 in ns["forced"]


def test_M_bioestadistica_close_superseded_vira_keep_deferred() -> None:
    ns = _cleanup_sanitize(
        {"prs": [{"number": 502, "decision": "CLOSE_SUPERSEDED", "replacement_pr": 900,
                  "reason": "substituída", "safe_to_close_without_code_change": True,
                  "closure_comment": "Substituída pela #900."}]},
        [_pr(502, "Bioestadística passada fina")],
        merged=[{"number": 900}],
    )
    e = ns["entries"][502]
    assert e["decision"] == "KEEP_DEFERRED", e
    assert e["replacement_pr"] == 0, e            # mesmo com substituta verificável
    assert e["safe_to_close_without_code_change"] is False, e
    assert e["closure_comment"] == "", e
    assert e["forced"] is True, e


def test_N_deferida_por_branch_e_qualquer_decisao_da_api() -> None:
    for d in ("KEEP_ACTIVE", "KEEP_PANEL", "CLOSE_STALE_NO_MERGE", "CLOSE_SUPERSEDED",
              "REVIEW_MANUALLY", "LIXO_INVENTADO"):
        ns = _cleanup_sanitize(
            {"prs": [{"number": 503, "decision": d, "replacement_pr": 900,
                      "safe_to_close_without_code_change": True, "closure_comment": "fechar"}],
             "uncertain_numbers": [503]},
            [_pr(503, "Revisão geral", "claude/imagenologia-fechamento")],
            merged=[{"number": 900}],
        )
        e = ns["entries"][503]
        assert e["decision"] == "KEEP_DEFERRED", (d, e)
        assert e["safe_to_close_without_code_change"] is False and e["closure_comment"] == "", (d, e)
        assert e["replacement_pr"] == 0, (d, e)
        assert 503 not in ns["uncertain"], "deferida forçada não vai ao Claude"


def test_O_painel_368_continua_sempre_keep_panel() -> None:
    for d in ("CLOSE_STALE_NO_MERGE", "CLOSE_SUPERSEDED", "KEEP_ACTIVE", "REVIEW_MANUALLY"):
        ns = _cleanup_sanitize(
            {"prs": [{"number": 368, "decision": d, "replacement_pr": 900,
                      "safe_to_close_without_code_change": True, "closure_comment": "fechar"}]},
            [_pr(368, "Painel contínuo de auditoria — Imagenología e Bioestadística")],
            merged=[{"number": 900}],
        )
        e = ns["entries"][368]
        assert e["decision"] == "KEEP_PANEL", (d, e)       # painel vence a deferida
        assert e["safe_to_close_without_code_change"] is False and e["closure_comment"] == "", e
        assert e["replacement_pr"] == 0, e


def test_P_nao_deferida_close_segue_normal() -> None:
    ns = _cleanup_sanitize(
        {"prs": [{"number": 504, "decision": "CLOSE_SUPERSEDED", "replacement_pr": 900,
                  "safe_to_close_without_code_change": True, "closure_comment": "ok"}]},
        [_pr(504, "Farmacología II — rodada antiga")],
        merged=[{"number": 900}],
    )
    e = ns["entries"][504]
    assert e["decision"] == "CLOSE_SUPERSEDED" and e["replacement_pr"] == 900, e
    assert e["safe_to_close_without_code_change"] is True and e["closure_comment"] == "ok", e
    assert "forced" not in e, e


def main() -> int:
    testes = [
        test_static_ignora_tags_ids_e_metatexto_em_comentario_html,
        test_deterministic_antigo_some_quando_nao_e_reproduzido,
        test_deterministic_atual_permanece_aberto,
        test_A_openai_sem_achados_zero_claude,
        test_B_achados_claros_zero_claude,
        test_C_dois_incertos_uma_chamada_claude_so_com_eles,
        test_D_claude_falha_relatorio_openai_continua_sem_retry,
        test_E_openai_json_invalido_falha_fechada_sem_inventar,
        test_F_materias_deferidas_recusadas_sem_chamada,
        test_G_certainty_ausente_e_teto_de_itens_claude,
        test_H_modelos_tiers_e_sem_retry,
        test_I_etapas_isolam_chaves_e_saida_needs_claude,
        test_J_fonte_so_escreve_painel_e_estado_intermediario_confinado,
        test_K_workflow_manual_only_e_chaves_por_passo,
        test_L_imagenologia_close_stale_vira_keep_deferred,
        test_M_bioestadistica_close_superseded_vira_keep_deferred,
        test_N_deferida_por_branch_e_qualquer_decisao_da_api,
        test_O_painel_368_continua_sempre_keep_panel,
        test_P_nao_deferida_close_segue_normal,
    ]
    falhas = 0
    for teste in testes:
        try:
            teste()
        except AssertionError as exc:
            falhas += 1
            print(f"FALHOU  {teste.__name__}: {exc}")
    print(f"\\n{len(testes)-falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
