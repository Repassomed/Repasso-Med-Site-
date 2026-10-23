"""Auditor de matérias via API (ChatGPT): extração, checagens, junção dos
pedaços, controle de gasto e relatório — tudo sem chamada real."""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

from . import _pathsetup  # noqa: F401
from coordinator import auditor_materias as A

HTML = """<html><head><style>.x{}</style></head><body>
<section class="container" id="b01"><h2>Bloque 1</h2>
<p>La epidermis es <b>avascular</b> y se nutre por difusión.</p>
<p>Esto es lo que más cae en el examen.</p>
<div class="rmc-postit">Recordá la dermis.</div>
<script>var a = "no debe aparecer";</script>
<div class="quiz-item" id="q1"><p class="quiz-question">¿Por qué?</p>
<ul class="options"><li>a) Corta</li><li>b) Una alternativa correcta mucho más larga</li><li>c) Otra</li></ul>
<button class="reveal-btn">Ver respuesta</button>
<div class="answer"><p><strong>b) Una alternativa correcta mucho más larga</strong></p><p>Porque sí.</p></div></div>
<div class="flashcard"><div class="fc-front">Frente</div><div class="fc-back">Verso</div></div>
<img src="x.png"><img src="y.png" alt="Corte histológico">
</section>
<section id="b02"><h2>Bloque 2</h2><p>Cómo estudiar esta materia.</p></section>
</body></html>"""


def test_extracao_mantem_estrutura_e_tira_codigo() -> None:
    t = A.html_para_texto(HTML)
    assert "=== SECCIÓN b01 ===" in t and "=== SECCIÓN b02 ===" in t
    assert "## Bloque 1" in t
    assert "[PREGUNTA q1]" in t and "[RESPUESTA]" in t and "[FLASHCARD]" in t and "⇒ Verso" in t
    assert "[POST-IT]" in t
    assert "no debe aparecer" not in t and "Ver respuesta" not in t
    assert "[IMAGEN: sin texto alternativo]" in t and "[IMAGEN: Corte histológico]" in t
    print("OK  test_extracao_mantem_estrutura_e_tira_codigo")


def test_checagens_automaticas() -> None:
    t = A.html_para_texto(HTML)
    c = A.checagens(HTML, t)
    assert c["voz_de_prova"]["total"] == 1
    assert c["metatexto"]["total"] == 1
    assert c["imagens"] == {"total": 2, "sem_texto_alternativo": 1}
    q = c["questoes_multipla"]
    assert q["total"] == 1 and q["letras"] == {"b": 1} and q["correta_e_a_unica_mais_longa"] == 1
    al = A.alertas_automaticos(c)
    assert any("voz de prova" in x for x in al) and any("Cómo estudiar" in x for x in al)
    print("OK  test_checagens_automaticas")


def test_pedacos_modo_rapido_avanca_e_volta_ao_inicio() -> None:
    lista = ["a" * 50_000, "b" * 50_000, "c" * 50_000]
    ps, prox = A.pedacos(lista, 0, True)
    assert len(ps) == 1 and (ps[0][0], ps[0][1]) == (0, 2) and prox == 2
    ps, prox = A.pedacos(lista, 2, True)
    assert (ps[0][0], ps[0][1]) == (2, 3) and prox == 0
    todos, _ = A.pedacos(lista, 2, False)
    assert [(a, b) for a, b, _ in todos] == [(0, 2), (2, 3)]
    print("OK  test_pedacos_modo_rapido_avanca_e_volta_ao_inicio")


def test_resposta_do_modelo_e_normalizada_e_trecho_conferido() -> None:
    texto = "La epidermis es avascular y se nutre por difusión desde la dermis."
    bruto = "```json\n" + json.dumps({
        "veredito": "inventado", "resumo": "ok",
        "notas": {"ciencia": "ok", "densidade": "xx"},
        "achados": [
            {"gravidade": "P1", "tipo": "ciencia", "trecho": "La epidermis es avascular y se nutre", "problema": "p"},
            {"gravidade": "P9", "tipo": "zzz", "trecho": "frase que não existe no texto", "problema": "q"},
            {"gravidade": "P2"},
        ],
    }) + "\n```"
    n = A.normalizar(A.ler_json(bruto), texto)
    assert n["veredito"] == "ajustes"
    assert n["notas"]["ciencia"] == "ok" and n["notas"]["densidade"] == "?"
    assert len(n["achados"]) == 2
    assert n["achados"][0]["trecho_confere"] is True
    assert n["achados"][1]["trecho_confere"] is False
    assert n["achados"][1]["gravidade"] == "P2" and n["achados"][1]["tipo"] == "outro"
    print("OK  test_resposta_do_modelo_e_normalizada_e_trecho_conferido")


def test_juntar_vale_o_pior_caso() -> None:
    p1 = {"veredito": "ok", "resumo": "a", "pontos_fortes": ["x"], "achados": [],
          "notas": {"ciencia": "ok", "densidade": "adequada", "questoes": "sem_questoes"}}
    p2 = {"veredito": "editorial", "resumo": "b", "pontos_fortes": ["x", "y"],
          "achados": [{"gravidade": "P2", "trecho_confere": True}, {"gravidade": "P0", "trecho_confere": False}],
          "notas": {"ciencia": "duvida", "densidade": "densa", "questoes": "ok"}}
    j = A.juntar([p1, p2])
    assert j["veredito"] == "editorial"
    assert j["notas"]["ciencia"] == "duvida" and j["notas"]["densidade"] == "densa" and j["notas"]["questoes"] == "ok"
    assert j["pontos_fortes"] == ["x", "y"]
    assert j["achados"][0]["gravidade"] == "P0"
    print("OK  test_juntar_vale_o_pior_caso")


def test_orcamento_reserva_antes_e_bloqueia_no_limite() -> None:
    o = A.Orcamento(1.0)
    assert o.reservar(0.6)
    assert not o.reservar(0.6), "duas reservas não podem passar do limite"
    o.fechar(0.6, 0.2)
    assert o.reservar(0.6)
    print("OK  test_orcamento_reserva_antes_e_bloqueia_no_limite")


def _raiz_falsa(tmp: Path) -> Path:
    js = tmp / A.GET_MATERIA
    js.parent.mkdir(parents=True)
    js.write_text("const FILES = {\n  'dermatologia': 'dermatologia.html',\n  'imagenologia': 'imagenologia.html',\n};\n", "utf-8")
    d = tmp / A.DIR_MATERIAS
    d.mkdir(parents=True)
    (d / "dermatologia.html").write_text(HTML, "utf-8")
    (d / "imagenologia.html").write_text(HTML, "utf-8")
    (tmp / A.RUBRICA).parent.mkdir(parents=True)
    (tmp / A.RUBRICA).write_text("rubrica", "utf-8")
    (tmp / A.LEI_G0).write_text("g0", "utf-8")
    return tmp


class _Resp:
    def __init__(self, text):
        self.text, self.input_tokens, self.output_tokens = text, 1000, 200


def test_rodada_completa_com_modelo_falso_e_relatorio() -> None:
    with tempfile.TemporaryDirectory() as d:
        raiz = _raiz_falsa(Path(d))
        original = A.chamar_modelo
        A.chamar_modelo = lambda m, s, p: _Resp(json.dumps({
            "veredito": "ajustes", "resumo": "Bom, mas denso.", "pontos_fortes": ["boa metáfora"],
            "notas": {"ciencia": "ok", "g0_alma": "parcial", "densidade": "densa"},
            "achados": [{"gravidade": "P2", "tipo": "voz_de_prova", "onde": "b01",
                         "trecho": "Esto es lo que más cae en el examen.", "problema": "voz de prova",
                         "sugestao": "tirar", "certeza": "alta"}]}))
        chave = os.environ.get("OPENAI_API_KEY")
        os.environ["OPENAI_API_KEY"] = chave or "teste"
        try:
            res = A.rodar(raiz, "rapida", [], 5.0, {}, "gpt-5.6-terra", log=lambda *_: None)
        finally:
            A.chamar_modelo = original
            if chave is None:
                os.environ.pop("OPENAI_API_KEY", None)
        assert res["materias"]["imagenologia"]["status"] == "adiada"
        derma = res["materias"]["dermatologia"]
        assert derma["status"] == "auditada" and derma["veredito"] == "ajustes"
        assert derma["achados"][0]["trecho_confere"] is True
        assert res["custo"]["chamadas"] == 1 and res["custo"]["usd"] > 0
        saida = Path(d) / "saida"
        A.escrever(saida, res, "2026-10-16-0300", "rapida", {})
        rel = (saida / "rodada/RELATORIO.md").read_text("utf-8")
        assert "Dermatología" in rel and "🟡 ajustes" in rel and "🚫 adiada" in rel
        assert "(materias/dermatologia.md)" in rel
        ult = (saida / "ULTIMA-RODADA.md").read_text("utf-8")
        assert "(rodadas/2026-10-16-0300/materias/dermatologia.md)" in ult
        det = (saida / "rodada/materias/dermatologia.md").read_text("utf-8")
        assert "dermatologia-01" in det and "trecho localizado" in det
        est = json.loads((saida / "estado.json").read_text("utf-8"))
        assert est["historico"][-1]["rodada"] == "2026-10-16-0300"
        assert (saida / "RODADA").read_text("utf-8").strip() == "2026-10-16-0300"
    print("OK  test_rodada_completa_com_modelo_falso_e_relatorio")


def test_sem_saldo_nao_chama_o_modelo() -> None:
    with tempfile.TemporaryDirectory() as d:
        raiz = _raiz_falsa(Path(d))
        chamadas = []
        original = A.chamar_modelo
        A.chamar_modelo = lambda *a: chamadas.append(a)
        chave = os.environ.get("OPENAI_API_KEY")
        os.environ["OPENAI_API_KEY"] = chave or "teste"
        try:
            res = A.rodar(raiz, "rapida", ["dermatologia"], 0.0001, {}, "gpt-5.6-terra", log=lambda *_: None)
        finally:
            A.chamar_modelo = original
            if chave is None:
                os.environ.pop("OPENAI_API_KEY", None)
        assert not chamadas
        assert res["materias"]["dermatologia"]["status"] == "sem_saldo"
    print("OK  test_sem_saldo_nao_chama_o_modelo")


def main() -> int:
    testes = [
        test_extracao_mantem_estrutura_e_tira_codigo,
        test_checagens_automaticas,
        test_pedacos_modo_rapido_avanca_e_volta_ao_inicio,
        test_resposta_do_modelo_e_normalizada_e_trecho_conferido,
        test_juntar_vale_o_pior_caso,
        test_orcamento_reserva_antes_e_bloqueia_no_limite,
        test_rodada_completa_com_modelo_falso_e_relatorio,
        test_sem_saldo_nao_chama_o_modelo,
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
