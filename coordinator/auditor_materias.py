"""Auditor de matérias via API (ChatGPT) — SOMENTE ANOTA, nunca corrige.

Uma rodada passa por todas as matérias do site (a lista vem de
``get-materia.js``), converte cada HTML em texto compacto, roda checagens
automáticas gratuitas e manda o texto, junto com a ``RUBRICA.md`` e a
``LEI-G0-ALMA-REPASSO-MED.md``, para o modelo da OpenAI. O resultado é um
relatório por matéria (o que está bom, erros, violações das leis, densidade,
repetição, se precisa passada editorial) escrito SOMENTE dentro de ``--saida``.

Quem publica o relatório numa branch/PR própria é o workflow
``.github/workflows/repasso-auditor-materias.yml``. Este módulo não fala com
git, Supabase nem GitHub, e nunca escreve em matéria.

Modos:
  rapida          um pedaço de cada matéria por rodada (~120 mil caracteres);
                  o cursor avança a cada rodada até cobrir a matéria inteira.
  completa        a matéria inteira, em pedaços.
  so_verificacao  só as checagens automáticas, sem IA (custo zero).

Uso local:
  python3 -m coordinator.auditor_materias --modo so_verificacao --saida /tmp/aud
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
import threading
import time
import unicodedata
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

SITE = Path("Repasso-Med-Site--main/Atual - Copia")
DIR_MATERIAS = SITE / "netlify/functions/materias-privadas"
GET_MATERIA = SITE / "netlify/functions/get-materia.js"
RUBRICA = Path("coordination/auditoria-api/RUBRICA.md")
LEI_G0 = Path("LEI-G0-ALMA-REPASSO-MED.md")

# Matérias que José mandou deixar de fora (serão refeitas do zero).
ADIADAS = {"imagenologia": "Excluída por decisão do José: será refeita do zero."}

NOMES = {
    "anatomia-patologica": "Anatomía Patológica I",
    "anatomia-patologica-practica": "Anatomía Patológica I Práctica",
    "fisiopatologia": "Fisiopatología I",
    "imagenologia": "Imagenología",
    "semiologia": "Semiología I",
    "farmacologia": "Farmacología I",
    "medicina-familiar": "Medicina Familiar",
    "semiologia-ii": "Semiología II",
    "farmacologia-ii": "Farmacología II",
    "embriologia": "Embriología",
    "histologia-i": "Histología I",
    "histologia-i-practica": "Histología I Práctica",
    "histologia-ii": "Histología II",
    "histologia-ii-practica": "Histología II Práctica",
    "anatomia-i": "Anatomía I",
    "biologia": "Biología",
    "medicina-legal": "Medicina Legal",
    "anatomia-patologica-ii": "Anatomía Patológica II",
    "anatomia-patologica-ii-practica": "Anatomía Patológica II Práctica",
    "fisiopatologia-ii": "Fisiopatología II",
    "toxicologia": "Toxicología",
    "dermatologia": "Dermatología",
    "guarani": "Guaraní",
    "ortopedia": "Ortopedia y Traumatología",
    "oftalmologia": "Oftalmología",
    "neurologia": "Neurología",
    "anestesiologia": "Anestesiología",
}

MODELO_PADRAO = "gpt-5.6-terra"
# US$ por milhão de tokens (mesma tabela de coordinator/openai_budget.py).
PRECOS_PADRAO = {"input": 2.00, "output": 12.00}
CHARS_POR_PEDACO = 120_000
MAX_SAIDA_TOKENS = 8_000
CHARS_POR_TOKEN = 3.2  # conservador para castelhano: superestima o custo
LIMITE_PADRAO = {"rapida": 5.0, "completa": 25.0, "so_verificacao": 0.0}
PARALELO = 4

VEREDITOS = ("ok", "ajustes", "editorial", "grave")
EMOJI = {"ok": "✅", "ajustes": "🟡", "editorial": "🟠", "grave": "🔴",
         "falhou": "⚠️", "adiada": "🚫", "sem_ia": "⚪", "sem_saldo": "⏸️"}
GRAVIDADES = ("P0", "P1", "P2", "P3")
TIPOS = ("ciencia", "didatica", "g0_alma", "voz_de_prova", "metatexto", "questoes",
         "densidade", "repeticao", "idioma", "consistencia", "html", "outro")
NOTAS = {
    "ciencia": ("ok", "duvida", "erro"),
    "g0_alma": ("cumpre", "parcial", "nao_cumpre"),
    "ensina_do_zero": ("sim", "parcial", "nao"),
    "densidade": ("adequada", "densa", "excessiva"),
    "repeticao": ("baixa", "media", "alta"),
    "castelhano": ("bom", "regular", "ruim"),
    "questoes": ("ok", "ajustes", "problemas"),
}

SISTEMA = """Você é o AUDITOR DE MATÉRIAS do Repasso Med (somente leitura).
Siga a RUBRICA e a LEI G0 anexas. Não corrija nada, não escreva patch.

Responda SOMENTE com um objeto JSON válido, sem texto fora dele, neste formato:
{
  "veredito": "ok|ajustes|editorial|grave",
  "resumo": "2 a 3 frases em português simples sobre este trecho",
  "pontos_fortes": ["até 3 itens curtos, em português"],
  "notas": {
    "ciencia": "ok|duvida|erro",
    "g0_alma": "cumpre|parcial|nao_cumpre",
    "ensina_do_zero": "sim|parcial|nao",
    "densidade": "adequada|densa|excessiva",
    "repeticao": "baixa|media|alta",
    "castelhano": "bom|regular|ruim",
    "questoes": "ok|ajustes|problemas|sem_questoes"
  },
  "achados": [
    {
      "gravidade": "P0|P1|P2|P3",
      "tipo": "ciencia|didatica|g0_alma|voz_de_prova|metatexto|questoes|densidade|repeticao|idioma|consistencia|html|outro",
      "onde": "id da seção e/ou título",
      "trecho": "cópia LITERAL do texto, até 250 caracteres",
      "problema": "o que está errado, em português simples",
      "sugestao": "o que fazer, em português simples",
      "certeza": "alta|media"
    }
  ]
}
No máximo 12 achados. Se o trecho estiver bom, devolva achados vazio e veredito ok."""


def agora() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Lista de matérias e conversão HTML -> texto compacto
# ---------------------------------------------------------------------------

def listar_materias(raiz: Path) -> list[tuple[str, Path]]:
    """Lê o mapa slug -> arquivo de get-materia.js: a mesma lista que o site serve."""
    js = (raiz / GET_MATERIA).read_text("utf-8")
    bloco = re.search(r"const FILES\s*=\s*\{(.*?)\};", js, re.S)
    if not bloco:
        raise SystemExit("Não achei o mapa FILES em get-materia.js")
    pares = re.findall(r"'([a-z0-9-]+)'\s*:\s*'([a-z0-9.-]+\.html)'", bloco.group(1))
    if not pares:
        raise SystemExit("Mapa FILES de get-materia.js está vazio")
    return [(slug, raiz / DIR_MATERIAS / arq) for slug, arq in pares]


_IGNORAR = {"script", "style", "svg", "noscript", "template", "button", "head"}
_BLOCO = {"p", "div", "section", "article", "ul", "ol", "table", "tr", "figure",
          "figcaption", "blockquote", "details", "summary", "dl", "dt", "dd", "br", "hr"}


def _rotulo_classe(c: str) -> str | None:
    if c == "answer":
        return "\n[RESPUESTA] "
    if c == "flashcard":
        return "\n[FLASHCARD] "
    if c == "fc-back":
        return " ⇒ "
    if "postit" in c:
        return "\n[POST-IT] "
    if c == "trap" or c.endswith("-trap"):
        return "\n[TRAMPA] "
    if c.endswith("-gl"):
        return "\n[GLOSARIO] "
    if c.startswith("key-box"):
        return "\n[CAJA] "
    return None


class _Extrator(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.partes: list[str] = []
        self.pular = 0

    def handle_starttag(self, tag, attrs):
        if tag in _IGNORAR:
            self.pular += 1
            return
        if self.pular:
            return
        a = dict(attrs)
        classes = (a.get("class") or "").split()
        if tag == "section":
            self.partes.append(f"\n\n=== SECCIÓN {a.get('id') or '?'} ===\n")
        elif tag in ("h1", "h2", "h3", "h4", "h5"):
            self.partes.append("\n" + "#" * int(tag[1]) + " ")
        elif tag == "li":
            self.partes.append("\n- ")
        elif tag in ("td", "th"):
            self.partes.append(" | ")
        elif tag == "img":
            self.partes.append(f" [IMAGEN: {(a.get('alt') or '').strip() or 'sin texto alternativo'}] ")
        elif tag in _BLOCO:
            self.partes.append("\n")
        if "quiz-item" in classes:
            self.partes.append(f"\n[PREGUNTA {a.get('id') or '?'}]\n")
        for c in classes:
            rotulo = _rotulo_classe(c)
            if rotulo:
                self.partes.append(rotulo)
                break

    def handle_endtag(self, tag):
        if tag in _IGNORAR:
            self.pular = max(0, self.pular - 1)
            return
        if not self.pular and (tag in _BLOCO or tag in ("h1", "h2", "h3", "h4", "h5", "li")):
            self.partes.append("\n")

    def handle_data(self, data):
        if not self.pular:
            self.partes.append(data)


def html_para_texto(conteudo: str) -> str:
    conteudo = re.sub(r"<!--[\s\S]*?-->", "", conteudo)
    ex = _Extrator()
    ex.feed(conteudo)
    ex.close()
    linhas = []
    for linha in "".join(ex.partes).split("\n"):
        linha = re.sub(r"[ \t\r\f\v ]+", " ", linha).strip()
        if linha and linha not in ("|", "-", "- |"):
            linhas.append(linha)
    texto = "\n".join(linhas)
    return re.sub(r"\n(=== SECCIÓN)", r"\n\n\1", texto)


def secoes(texto: str) -> list[str]:
    """Divide o texto em seções; seção gigante é quebrada em partes menores."""
    brutas = [s for s in re.split(r"\n(?==== SECCIÓN )", texto) if s.strip()]
    out: list[str] = []
    for s in brutas:
        while len(s) > CHARS_POR_PEDACO:
            corte = s.rfind("\n", 0, CHARS_POR_PEDACO)
            corte = corte if corte > CHARS_POR_PEDACO // 2 else CHARS_POR_PEDACO
            out.append(s[:corte])
            s = s[corte:]
        out.append(s)
    return out


def pedacos(lista: list[str], inicio: int, uma_janela: bool) -> tuple[list[tuple[int, int, str]], int]:
    """Agrupa seções em pedaços de até CHARS_POR_PEDACO.

    uma_janela=True (modo rápido): só um pedaço, a partir do cursor ``inicio``;
    devolve o próximo cursor (volta a 0 ao chegar no fim)."""
    n = len(lista)
    if n == 0:
        return [], 0
    inicio = inicio if 0 <= inicio < n else 0
    out = []
    i = inicio if uma_janela else 0
    while i < n:
        j, tam = i, 0
        while j < n and (j == i or tam + len(lista[j]) <= CHARS_POR_PEDACO):
            tam += len(lista[j])
            j += 1
        out.append((i, j, "\n".join(lista[i:j])))
        i = j
        if uma_janela:
            break
    proximo = out[-1][1] if uma_janela else 0
    return out, (0 if proximo >= n else proximo)


# ---------------------------------------------------------------------------
# Checagens automáticas (grátis, matéria inteira)
# ---------------------------------------------------------------------------

VOZ_DE_PROVA = re.compile(
    r"lo que m[aá]s cae|lo m[aá]s preguntad|m[aá]s preguntad[oa]s?\b|"
    r"\bca(?:e|y[oó]|en) (?:en|siempre en) (?:el |la |los |las )?(?:examen|ex[aá]menes|prueba|parcial|final)|"
    r"tema de examen|cl[aá]sico de examen|pregunta (?:favorita|cl[aá]sica) del? (?:profesor|examen)|"
    r"el profesor (?:cobra|pregunta|suele)|\bse cobr[aó]\b|cobrad[oa] en (?:el )?examen|"
    r"\bque (?:a veces|suele|suelen|puede|pueden|siempre|m[aá]s) ca(?:e|en|er)\b",
    re.I,
)
METATEXTO = re.compile(r"c[oó]mo estudiar|c[oó]mo usar (?:esta|este|la|el) (?:materia|p[aá]gina|banco|gu[ií]a)", re.I)
OFICIAL = re.compile(r"pregunta oficial", re.I)


def _limpo(fragmento: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragmento))).strip()


def checagens(conteudo: str, texto: str) -> dict:
    visivel = re.sub(r"<!--[\s\S]*?-->", "", conteudo)
    visivel = re.sub(r"<(script|style)\b[\s\S]*?</\1>", "", visivel, flags=re.I)

    def exemplos(rx):
        achados = []
        for m in rx.finditer(texto):
            a, b = max(0, m.start() - 60), min(len(texto), m.end() + 60)
            achados.append(texto[a:b].replace("\n", " ").strip())
        return achados

    voz = exemplos(VOZ_DE_PROVA)
    meta = exemplos(METATEXTO)
    oficial = exemplos(OFICIAL)
    ids = re.findall(r"\bid=[\"']([^\"']+)[\"']", visivel)
    duplicados = sorted(x for x, n in Counter(ids).items() if n > 1)
    imgs = re.findall(r"<img\b[^>]*>", visivel, re.I)
    sem_alt = sum(1 for t in imgs if not re.search(r"\balt=[\"'][^\"']+[\"']", t, re.I))

    letras, mais_longa, destaque, total = [], 0, 0, 0
    for bloco in re.split(r"<div class=\"quiz-item\"", visivel)[1:]:
        ops = re.search(r"<ul class=\"options\"[^>]*>(.*?)</ul>", bloco, re.S)
        resp = re.search(r"<div class=\"answer\"[^>]*>\s*<p>\s*<(?:strong|b)>\s*([a-eA-E])\)", bloco)
        if not ops or not resp:
            continue
        itens = re.findall(r"<li\b[^>]*>(.*?)</li>", ops.group(1), re.S)
        if len(itens) < 3:
            continue
        total += 1
        letra = resp.group(1).lower()
        letras.append(letra)
        tamanhos = [len(re.sub(r"^[a-e]\)\s*", "", _limpo(x))) for x in itens]
        idx = ord(letra) - 97
        if 0 <= idx < len(tamanhos) and tamanhos[idx] == max(tamanhos) and tamanhos.count(max(tamanhos)) == 1:
            mais_longa += 1
        marcados = [x for x in itens if re.search(r"<(?:strong|b|mark)\b", x, re.I)]
        if len(marcados) == 1:
            destaque += 1

    maior_seq, seq = 0, 0
    for k, l in enumerate(letras):
        seq = seq + 1 if k and l == letras[k - 1] else 1
        maior_seq = max(maior_seq, seq)
    dist = dict(sorted(Counter(letras).items()))
    return {
        "voz_de_prova": {"total": len(voz), "exemplos": voz[:5]},
        "metatexto": {"total": len(meta), "exemplos": meta[:3]},
        "pregunta_oficial": {"total": len(oficial), "exemplos": oficial[:2]},
        "ids_duplicados": duplicados[:15],
        "imagens": {"total": len(imgs), "sem_texto_alternativo": sem_alt},
        "questoes_multipla": {
            "total": total,
            "letras": dist,
            "maior_sequencia_mesma_letra": maior_seq,
            "correta_e_a_unica_mais_longa": mais_longa,
            "pct_correta_mais_longa": round(100 * mais_longa / total) if total else 0,
            "alternativa_unica_em_destaque": destaque,
        },
        "caracteres_de_texto": len(texto),
    }


def alertas_automaticos(c: dict) -> list[str]:
    al = []
    if c["voz_de_prova"]["total"]:
        al.append(f"{c['voz_de_prova']['total']} frase(s) de «voz de prova» na página do aluno (G0 proíbe)")
    if c["metatexto"]["total"]:
        al.append(f"{c['metatexto']['total']} trecho(s) de metatexto «Cómo estudiar/usar»")
    if c["pregunta_oficial"]["total"]:
        al.append(f"{c['pregunta_oficial']['total']} rótulo(s) «pregunta oficial»: conferir comprovação (8-A.4)")
    if c["ids_duplicados"]:
        al.append(f"IDs HTML duplicados: {', '.join(c['ids_duplicados'][:6])}")
    q = c["questoes_multipla"]
    if q["total"] >= 10 and q["pct_correta_mais_longa"] >= 45:
        al.append(f"pista de tamanho: em {q['pct_correta_mais_longa']}% das {q['total']} questões a correta é a única mais longa (8-A.6-C, sinal para revisar)")
    if q["total"] >= 10 and q["maior_sequencia_mesma_letra"] >= 5:
        al.append(f"gabarito com {q['maior_sequencia_mesma_letra']} letras iguais seguidas (8-A.7)")
    if q["total"] >= 12 and q["letras"] and max(q["letras"].values()) / q["total"] > 0.4:
        al.append(f"letra correta concentrada: {q['letras']} (8-A.7)")
    if q["alternativa_unica_em_destaque"]:
        al.append(f"{q['alternativa_unica_em_destaque']} questão(ões) com uma única alternativa em negrito/destaque (pista visual)")
    if c["imagens"]["sem_texto_alternativo"]:
        al.append(f"{c['imagens']['sem_texto_alternativo']} de {c['imagens']['total']} imagens sem texto alternativo")
    return al


# ---------------------------------------------------------------------------
# Chamada ao modelo, leitura da resposta e controle de gasto
# ---------------------------------------------------------------------------

def precos(modelo: str) -> dict:
    try:
        from coordinator.openai_budget import SUPPORTED_MODELS
        return SUPPORTED_MODELS.get(modelo, PRECOS_PADRAO)
    except Exception:  # pragma: no cover
        return PRECOS_PADRAO


def custo(tin: int, tout: int, p: dict) -> float:
    return tin / 1e6 * p["input"] + tout / 1e6 * p["output"]


class Orcamento:
    """Reserva o pior caso ANTES de cada chamada; troca pelo real depois."""

    def __init__(self, limite: float) -> None:
        self.limite = limite
        self.gasto = 0.0
        self.reservado = 0.0
        self.trava = threading.Lock()

    def reservar(self, valor: float) -> bool:
        with self.trava:
            if self.gasto + self.reservado + valor > self.limite:
                return False
            self.reservado += valor
            return True

    def fechar(self, reservado: float, real: float) -> None:
        with self.trava:
            self.reservado -= reservado
            self.gasto += real


def ler_json(texto: str) -> dict:
    texto = (texto or "").strip()
    texto = re.sub(r"^```(?:json)?\s*|\s*```$", "", texto)
    a, b = texto.find("{"), texto.rfind("}")
    if a < 0 or b <= a:
        raise ValueError("resposta sem JSON")
    d = json.loads(texto[a:b + 1])
    if not isinstance(d, dict):
        raise ValueError("JSON não é objeto")
    return d


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "").lower()
    s = re.sub(r"[«»\"“”'‘’`]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def trecho_confere(trecho: str, texto_norm: str) -> bool:
    t = _norm(trecho).strip(" .…")
    if len(t) < 12:
        return False
    if t in texto_norm:
        return True
    partes = [p.strip() for p in re.split(r"\.\.\.|…", t) if len(p.strip()) >= 20]
    return bool(partes) and all(p in texto_norm for p in partes)


def normalizar(d: dict, texto: str) -> dict:
    tn = _norm(texto)
    ver = str(d.get("veredito", "")).lower()
    notas_in = d.get("notas") if isinstance(d.get("notas"), dict) else {}
    notas = {}
    for k, val in NOTAS.items():
        v = str(notas_in.get(k, "")).lower()
        notas[k] = v if v in val or (k == "questoes" and v == "sem_questoes") else "?"
    achados = []
    for x in (d.get("achados") or [])[:12]:
        if not isinstance(x, dict) or not x.get("problema"):
            continue
        g = str(x.get("gravidade", "P2")).upper()
        t = str(x.get("tipo", "outro")).lower()
        trecho = str(x.get("trecho") or "")[:300]
        achados.append({
            "gravidade": g if g in GRAVIDADES else "P2",
            "tipo": t if t in TIPOS else "outro",
            "onde": str(x.get("onde") or "")[:200],
            "trecho": trecho,
            "trecho_confere": trecho_confere(trecho, tn),
            "problema": str(x.get("problema"))[:700],
            "sugestao": str(x.get("sugestao") or "")[:700],
            "certeza": "alta" if str(x.get("certeza", "")).lower() == "alta" else "media",
        })
    return {
        "veredito": ver if ver in VEREDITOS else "ajustes",
        "resumo": str(d.get("resumo") or "")[:900],
        "pontos_fortes": [str(p)[:240] for p in (d.get("pontos_fortes") or [])[:3]],
        "notas": notas,
        "achados": achados,
    }


def chamar_modelo(modelo: str, sistema: str, prompt: str):
    """Uma chamada via o transporte oficial do projeto (Responses API, store=False)."""
    from coordinator.openai_client import Request
    from coordinator.openai_transport import OpenAIResponsesTransport

    req = Request(model_id=modelo, tier="TERRA", max_output_tokens=MAX_SAIDA_TOKENS,
                  system=sistema, prompt=prompt)
    return OpenAIResponsesTransport(timeout=600, max_retries=0).send(req)


# ---------------------------------------------------------------------------
# Rodada
# ---------------------------------------------------------------------------

_PIOR = {
    "ciencia": ["ok", "duvida", "erro"],
    "g0_alma": ["cumpre", "parcial", "nao_cumpre"],
    "ensina_do_zero": ["sim", "parcial", "nao"],
    "densidade": ["adequada", "densa", "excessiva"],
    "repeticao": ["baixa", "media", "alta"],
    "castelhano": ["bom", "regular", "ruim"],
    "questoes": ["sem_questoes", "ok", "ajustes", "problemas"],
}


def juntar(partes: list[dict]) -> dict:
    """Junta os pedaços de uma matéria: vale sempre o pior caso."""
    if not partes:
        return {}
    ver = max((p["veredito"] for p in partes), key=VEREDITOS.index)
    notas = {}
    for k, ordem in _PIOR.items():
        vals = [p["notas"].get(k) for p in partes if p["notas"].get(k) in ordem]
        notas[k] = max(vals, key=ordem.index) if vals else "?"
    fortes = []
    for p in partes:
        for f in p["pontos_fortes"]:
            if f not in fortes:
                fortes.append(f)
    achados = sorted((a for p in partes for a in p["achados"]),
                     key=lambda a: (GRAVIDADES.index(a["gravidade"]), not a["trecho_confere"]))
    return {"veredito": ver, "resumo": " ".join(p["resumo"] for p in partes if p["resumo"]),
            "pontos_fortes": fortes[:4], "notas": notas, "achados": achados}


def rodar(raiz: Path, modo: str, filtro: list[str], limite: float, estado: dict, modelo: str,
          log=print) -> dict:
    materias = listar_materias(raiz)
    if filtro:
        desconhecidas = sorted(set(filtro) - {s for s, _ in materias})
        if desconhecidas:
            raise SystemExit("Matéria(s) não encontrada(s): " + ", ".join(desconhecidas))
        materias = [(s, p) for s, p in materias if s in filtro]

    sistema = (SISTEMA + "\n\n" + "=" * 20 + " RUBRICA " + "=" * 20 + "\n" + (raiz / RUBRICA).read_text("utf-8")
               + "\n\n" + "=" * 20 + " LEI G0 " + "=" * 20 + "\n" + (raiz / LEI_G0).read_text("utf-8"))
    p = precos(modelo)
    orc = Orcamento(limite)
    cursores = dict(estado.get("cursor") or {})
    resultado = {"materias": {}, "chamadas": []}
    tarefas = []

    for slug, caminho in materias:
        nome = NOMES.get(slug, slug)
        item = {"slug": slug, "nome": nome, "arquivo": caminho.name}
        resultado["materias"][slug] = item
        if slug in ADIADAS and not filtro:
            item.update(status="adiada", motivo=ADIADAS[slug])
            continue
        if not caminho.exists():
            item.update(status="falhou", motivo="arquivo não encontrado")
            continue
        bruto = caminho.read_text("utf-8", errors="replace")
        texto = html_para_texto(bruto)
        chk = checagens(bruto, texto)
        item.update(checagens=chk, alertas=alertas_automaticos(chk))
        lista = secoes(texto)
        if modo == "so_verificacao":
            item.update(status="sem_ia", cobertura={"secoes_total": len(lista)})
            continue
        ps, prox = pedacos(lista, int(cursores.get(slug, 0) or 0), modo == "rapida")
        lidos = sum(len(t) for _, _, t in ps)
        item.update(status="pendente", partes=[None] * len(ps), proximo_cursor=prox,
                    cobertura={"secoes_total": len(lista), "secoes_lidas": [f"{a + 1}–{b}" for a, b, _ in ps],
                               "pct_texto": round(100 * lidos / max(1, len(texto)))})
        contexto = "; ".join(item["alertas"]) or "nenhum alerta automático"
        for k, (a, b, t) in enumerate(ps):
            prompt = (f"MATÉRIA: {nome} (slug {slug})\nPEDAÇO {k + 1} de {len(ps)} · seções {a + 1} a {b} de {len(lista)}\n"
                      f"JÁ CONTADO AUTOMATICAMENTE (não repita): {contexto}\n\nTEXTO DA MATÉRIA:\n{t}")
            tarefas.append((slug, k, prompt, t))

    def executar(tarefa):
        slug, k, prompt, texto = tarefa
        est_in = int((len(sistema) + len(prompt)) / CHARS_POR_TOKEN)
        reserva = custo(est_in, MAX_SAIDA_TOKENS, p)
        if not orc.reservar(reserva):
            return slug, k, {"erro": "sem_saldo"}, None
        tin = tout = 0
        erro = None
        for tentativa in (1, 2):
            try:
                r = chamar_modelo(modelo, sistema, prompt)
                tin += r.input_tokens or 0
                tout += r.output_tokens or 0
                parte = normalizar(ler_json(r.text), texto)
                orc.fechar(reserva, custo(tin, tout, p))
                return slug, k, parte, {"slug": slug, "pedaco": k + 1, "input_tokens": tin, "output_tokens": tout}
            except Exception as exc:  # erro de rede, limite, JSON inválido
                erro = f"{type(exc).__name__}: {str(exc)[:200]}"
                log(f"[{slug} pedaço {k + 1}] tentativa {tentativa} falhou: {erro}")
                if tentativa == 1:
                    time.sleep(20)
        orc.fechar(reserva, custo(tin, tout, p))
        return slug, k, {"erro": erro}, ({"slug": slug, "pedaco": k + 1, "input_tokens": tin, "output_tokens": tout} if tin or tout else None)

    if tarefas:
        if not os.environ.get("OPENAI_API_KEY"):
            raise SystemExit("OPENAI_API_KEY não está definida (deveria vir do Secret do GitHub). Nenhuma chamada foi feita.")
        log(f"{len(tarefas)} chamada(s) ao modelo {modelo}, limite US$ {limite:.2f}")
        with ThreadPoolExecutor(max_workers=PARALELO) as pool:
            for slug, k, parte, uso in pool.map(executar, tarefas):
                resultado["materias"][slug]["partes"][k] = parte
                if uso:
                    resultado["chamadas"].append(uso)
                log(f"[{slug} pedaço {k + 1}] {'ok' if 'veredito' in parte else parte.get('erro')}")

    novos_cursores = dict(cursores)
    for slug, item in resultado["materias"].items():
        if item.get("status") != "pendente":
            continue
        partes = item.pop("partes")
        boas = [x for x in partes if x and "veredito" in x]
        erros = [x["erro"] for x in partes if x and "erro" in x]
        if boas:
            item.update(juntar(boas))
            item["status"] = "auditada" if not erros else "parcial"
            if erros:
                item["motivo"] = f"{len(erros)} de {len(partes)} pedaço(s) sem resposta: {erros[0]}"
            if modo == "rapida" and not erros:
                novos_cursores[slug] = item["proximo_cursor"]
        else:
            item["status"] = "sem_saldo" if erros and all(e == "sem_saldo" for e in erros) else "falhou"
            item["motivo"] = erros[0] if erros else "sem resposta"
        item.pop("proximo_cursor", None)

    tin = sum(c["input_tokens"] for c in resultado["chamadas"])
    tout = sum(c["output_tokens"] for c in resultado["chamadas"])
    resultado["custo"] = {"modelo": modelo, "chamadas": len(resultado["chamadas"]), "input_tokens": tin,
                          "output_tokens": tout, "usd": round(custo(tin, tout, p), 4), "limite_usd": limite,
                          "nota": "valor calculado pelo preço cheio; o cache automático da OpenAI pode deixar a fatura real menor"}
    resultado["cursor"] = novos_cursores
    return resultado


# ---------------------------------------------------------------------------
# Relatórios em Markdown
# ---------------------------------------------------------------------------

def _veredito_final(item: dict) -> str:
    st = item.get("status")
    if st in ("adiada", "falhou", "sem_ia", "sem_saldo"):
        return st
    return item.get("veredito", "ajustes")


def _contagem(item: dict) -> str:
    c = Counter(a["gravidade"] for a in item.get("achados", []))
    return " ".join(f"{g}:{c[g]}" for g in GRAVIDADES if c[g]) or "—"


def md_materia(item: dict, rodada: str) -> str:
    v = _veredito_final(item)
    L = [f"# {EMOJI.get(v, '')} {item['nome']} — rodada {rodada}", "",
         f"Arquivo: `{item['arquivo']}` · situação: **{item.get('status')}**"]
    if item.get("motivo"):
        L.append(f"> ⚠️ {item['motivo']}")
    cob = item.get("cobertura") or {}
    if cob.get("secoes_lidas"):
        L.append(f"Lido nesta rodada: seções {', '.join(cob['secoes_lidas'])} de {cob['secoes_total']} "
                 f"(≈{cob.get('pct_texto', 0)}% do texto).")
    L.append("")
    if item.get("resumo"):
        L += ["## Resumo", "", item["resumo"], ""]
    if item.get("notas"):
        L += ["## Notas", "", "| critério | nota |", "|---|---|"]
        L += [f"| {k.replace('_', ' ')} | {v2} |" for k, v2 in item["notas"].items()]
        L.append("")
    if item.get("pontos_fortes"):
        L += ["## O que está bom (preservar)", ""] + [f"- {f}" for f in item["pontos_fortes"]] + [""]
    if item.get("achados"):
        L += ["## Achados da IA (conferir antes de corrigir)", ""]
        for n, a in enumerate(item["achados"], 1):
            conf = "✅ trecho localizado no texto" if a["trecho_confere"] else "⚠️ trecho NÃO localizado: conferir com cuidado"
            L += [f"### {item['slug']}-{n:02d} · {a['gravidade']} · {a['tipo']} · certeza {a['certeza']}", "",
                  f"- **Onde:** {a['onde'] or '—'}",
                  f"- **Trecho:** «{a['trecho']}» ({conf})",
                  f"- **Problema:** {a['problema']}",
                  f"- **Sugestão:** {a['sugestao'] or '—'}", ""]
    elif item.get("status") in ("auditada", "parcial"):
        L += ["## Achados da IA", "", "Nenhum achado neste trecho.", ""]
    chk = item.get("checagens")
    if chk:
        q = chk["questoes_multipla"]
        L += ["## Checagens automáticas (matéria inteira, sem IA)", ""]
        L += [f"- ⚠️ {a}" for a in item.get("alertas", [])] or ["- Nenhum alerta automático."]
        L += ["", f"Questões de múltipla escolha: {q['total']} · letras {q['letras']} · "
                  f"correta é a única mais longa em {q['pct_correta_mais_longa']}% · "
                  f"imagens {chk['imagens']['total']} (sem texto alternativo: {chk['imagens']['sem_texto_alternativo']})"]
        for titulo, chave in (("Voz de prova", "voz_de_prova"), ("Metatexto", "metatexto"), ("Rótulo «pregunta oficial»", "pregunta_oficial")):
            if chk[chave]["exemplos"]:
                L += ["", f"**{titulo} — exemplos:**"] + [f"- «…{e}…»" for e in chk[chave]["exemplos"]]
        L.append("")
    return "\n".join(L) + "\n"


def _milhar(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def md_relatorio(res: dict, rodada: str, modo: str, prefixo: str = "") -> str:
    c = res["custo"]
    itens = list(res["materias"].values())
    conta = Counter(_veredito_final(i) for i in itens)
    L = [f"# Auditoria das matérias — rodada {rodada}", "",
         "> Relatório **somente leitura** feito pela API do ChatGPT. Nada foi corrigido.",
         "> Cada achado precisa ser **conferido** por um Claude antes de virar correção.", "",
         f"**Modo:** {modo} · **Modelo:** `{c['modelo']}` · **Custo calculado:** US$ {c['usd']:.2f} "
         f"(limite US$ {c['limite_usd']:.2f}) · {c['chamadas']} chamada(s), "
         f"{_milhar(c['input_tokens'])} tokens lidos e {_milhar(c['output_tokens'])} escritos", "",
         "**Placar:** " + " · ".join(f"{EMOJI[k]} {k} {conta[k]}" for k in EMOJI if conta[k]), "",
         "| # | matéria | veredito | achados | voz de prova | G0 | densidade | repetição | precisa editorial? |",
         "|---|---|---|---|---|---|---|---|---|"]
    for n, i in enumerate(itens, 1):
        v = _veredito_final(i)
        notas = i.get("notas") or {}
        voz = (i.get("checagens") or {}).get("voz_de_prova", {}).get("total", "—")
        editorial = "sim" if v in ("editorial", "grave") else ("—" if v in ("adiada", "falhou", "sem_ia", "sem_saldo") else "não")
        L.append(f"| {n} | [{i['nome']}]({prefixo}materias/{i['slug']}.md) | {EMOJI.get(v, '')} {v} | {_contagem(i)} | {voz} | "
                 f"{notas.get('g0_alma', '—')} | {notas.get('densidade', '—')} | {notas.get('repeticao', '—')} | {editorial} |")
    graves = [(i, a) for i in itens for a in i.get("achados", []) if a["gravidade"] in ("P0", "P1")]
    L += ["", "## Achados P0/P1 (olhar primeiro)", ""]
    if graves:
        for i, a in graves[:40]:
            n = i["achados"].index(a) + 1
            marca = "" if a["trecho_confere"] else " ⚠️ trecho não localizado"
            L.append(f"- **{i['slug']}-{n:02d}** ({a['gravidade']}, {a['tipo']}) {i['nome']}: {a['problema']}{marca}")
    else:
        L.append("Nenhum P0/P1 nesta rodada.")
    problemas = [i for i in itens if i.get("status") in ("falhou", "parcial", "sem_saldo")]
    if problemas:
        L += ["", "## Matérias que não foram auditadas por inteiro", ""]
        L += [f"- {i['nome']}: {i.get('status')} — {i.get('motivo', '')}" for i in problemas]
    L += ["", "## Legenda", "",
          "✅ ok · 🟡 ajustes pontuais · 🟠 precisa passada editorial · 🔴 grave (erro científico/gabarito) · "
          "⚠️ falhou · ⏸️ parou no limite de gasto · 🚫 adiada pelo José · ⚪ só checagem automática", "",
          "Como corrigir: ver `coordination/auditoria-api/README.md`, seção «Passar as correções para um Claude».", ""]
    return "\n".join(L)


def escrever(saida: Path, res: dict, rodada: str, modo: str, estado_antigo: dict) -> None:
    base = saida.resolve()

    def alvo(rel: str) -> Path:
        t = (base / rel).resolve()
        if base not in t.parents:
            raise SystemExit("O auditor só escreve dentro de --saida")
        t.parent.mkdir(parents=True, exist_ok=True)
        return t

    for slug, item in res["materias"].items():
        alvo(f"rodada/materias/{slug}.md").write_text(md_materia(item, rodada), "utf-8")
    alvo("rodada/RELATORIO.md").write_text(md_relatorio(res, rodada, modo), "utf-8")
    alvo("ULTIMA-RODADA.md").write_text(md_relatorio(res, rodada, modo, prefixo=f"rodadas/{rodada}/"), "utf-8")
    alvo("rodada/achados.json").write_text(json.dumps({"rodada": rodada, "modo": modo, **res}, ensure_ascii=False, indent=1) + "\n", "utf-8")
    historico = list(estado_antigo.get("historico") or [])
    conta = Counter(_veredito_final(i) for i in res["materias"].values())
    historico.append({"rodada": rodada, "modo": modo, "usd": res["custo"]["usd"], "chamadas": res["custo"]["chamadas"],
                      "placar": dict(conta)})
    novo = {"versao": 1, "atualizado": agora(), "cursor": res["cursor"], "historico": historico[-60:]}
    alvo("estado.json").write_text(json.dumps(novo, ensure_ascii=False, indent=1) + "\n", "utf-8")
    alvo("RODADA").write_text(rodada + "\n", "utf-8")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--raiz", default=".")
    ap.add_argument("--modo", choices=["rapida", "completa", "so_verificacao"], default="rapida")
    ap.add_argument("--materias", default="", help="slugs separados por vírgula (vazio = todas)")
    ap.add_argument("--limite-usd", default="")
    ap.add_argument("--estado", default="", help="estado.json da rodada anterior (cursor do modo rápido)")
    ap.add_argument("--saida", required=True)
    a = ap.parse_args(argv)

    raiz = Path(a.raiz).resolve()
    filtro = [s.strip().lower().removesuffix(".html") for s in re.split(r"[,\s]+", a.materias) if s.strip()]
    try:
        limite = float(a.limite_usd.replace(",", ".")) if a.limite_usd.strip() else LIMITE_PADRAO[a.modo]
    except ValueError:
        raise SystemExit(f"limite_usd inválido: {a.limite_usd!r}")
    if a.modo != "so_verificacao" and not 0 < limite <= 100:
        raise SystemExit("limite_usd precisa estar entre 0 e 100 dólares")
    estado = {}
    if a.estado and Path(a.estado).exists():
        try:
            estado = json.loads(Path(a.estado).read_text("utf-8"))
        except Exception:
            estado = {}
    modelo = os.environ.get("REPASSO_AUDITOR_MODEL") or MODELO_PADRAO
    rodada = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M")
    res = rodar(raiz, a.modo, filtro, limite, estado, modelo)
    escrever(Path(a.saida), res, rodada, a.modo, estado)

    st = Counter(i.get("status") for i in res["materias"].values())
    print(json.dumps({"rodada": rodada, "status": st, "custo": res["custo"]}, ensure_ascii=False))
    if a.modo != "so_verificacao" and not (st.get("auditada", 0) + st.get("parcial", 0)):
        print("NENHUMA matéria foi auditada pela IA: conferir chave/modelo/limite no log acima.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
