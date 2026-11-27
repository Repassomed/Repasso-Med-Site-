#!/usr/bin/env python3
"""Toxicología · PR das fotos de prova: verificação estática (somente leitura).
Uso (raiz do repo): python3 -I tools/qa/toxicologia-fotos/estatico.test.py [ref-base=origin/main]
Confere: ids antigos preservados (só q-b08q07 pode mudar de explicação, nunca enunciado/alternativas/chave),
corpo = banco, contagens declaradas × reais por bloco e no banco, alternativas/letras, rótulos."""
import re, subprocess, sys
from collections import Counter
P = "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/toxicologia.html"
BASE = sys.argv[1] if len(sys.argv) > 1 else "origin/main"
ok = fail = 0
def check(nome, cond, det=""):
    global ok, fail
    if cond: ok += 1
    else: fail += 1; print("FALHA", nome, det)
new = open(P, encoding="utf-8").read()
old = subprocess.check_output(["git", "show", f"{BASE}:{P}"]).decode()
def items(t):
    d = {}
    for m in re.finditer(r'<div class="quiz-item" id="([^"]+)">', t):
        a = m.start(); b = t.index('</div></div>', a); d[m.group(1)] = t[a:b]
    return d
o, n = items(old), items(new)
corpo = [k for k in n if not k.endswith("-bk")]; banco = [k for k in n if k.endswith("-bk")]
check("ids antigos presentes", all(k in n for k in o))
def cab(x):
    return re.sub(r'<div class="answer">.*', '', x, flags=re.S) + re.search(r'<strong>.*?</strong>', x, re.S).group(0)
mud = [k for k in o if o[k] != n[k]]
check("só q-b08q07(+bk) muda de texto (ids antigos)", set(mud) <= {"q-b08q07", "q-b08q07-bk"}, mud)
check("enunciado/alternativas/chave antigos intactos (exceto o enunciado de q-b08q07, ver abaixo)", all(cab(o[k]) == cab(n[k]) for k in mud if not k.startswith("q-b08q07")))
for k in ("q-b08q07", "q-b08q07-bk"):
    check(f"{k}: enunciado novo (efecto, não «mecanismo de acción»), gabarito VERDADERO, 2 botões = true",
          "produce un cuadro anticoagulante y fibrinolítico" in n[k] and "mecanismo de acción" not in re.search(r'<p class="quiz-question">.*?</p>', n[k], re.S).group(0)
          and "<strong>VERDADERO.</strong>" in n[k] and n[k].count("checkTF(this, true)") == 2 and "checkTF(this, false)" not in n[k])
check("corpo = banco (texto idêntico)", all(n[k] == n[k + "-bk"].replace(k + "-bk", k) for k in corpo))
check("1 espelho por pergunta", len(corpo) == len(banco) == len(set(corpo)))
novos = sorted(set(n) - set(o)); check("novas = 2 + espelhos", novos == ["q-b05q27", "q-b05q27-bk", "q-b08q25", "q-b08q25-bk"], novos)
# contagens declaradas por bloco (corpo, banco, introdução do bloco)
palavras = {19:"Diecinueve",20:"Veinte",22:"Veintidós",23:"Veintitrés",24:"Veinticuatro",25:"Veinticinco",26:"Veintiséis",27:"Veintisiete",28:"Veintiocho"}
for b in range(1, 17):
    bb = f"{b:02d}"; c = [k for k in corpo if k.startswith(f"q-b{bb}")]; cb = [k for k in banco if k.startswith(f"q-b{bb}")]
    check(f"bloco {bb} corpo=banco", len(c) == len(cb), (len(c), len(cb)))
    s = new.index(f'id="toxb{bb}"'); e = new.index('</section>', s); seg = new[s:e]
    m = re.search(r'<h3>Preguntas del bloque \d+</h3>\s*<p>(\w+) preguntas', seg)
    if m and len(c) in palavras: check(f"bloco {bb} introdução '{m.group(1)}' = {len(c)}", m.group(1) == palavras[len(c)], m.group(1))
    sub = re.search(rf'<h3 class="rmc-bank-sub">Bloque {bb} ·[^<]*<small>\((\d+) preguntas\)', new)
    check(f"bloco {bb} subtítulo do banco = {len(c)}", sub and int(sub.group(1)) == len(c), sub and sub.group(1))
vf = [k for k in corpo if "tf-buttons" in n[k]]; mc = [k for k in corpo if k not in vf]
check("cabeçalho do banco 353/318/35", all(x in new for x in ["<span>353 preguntas</span>", "<span>318 de múltiple opción</span>", "<span>35 de verdadero o falso</span>"]) and len(corpo) == 353 and len(mc) == 318 and len(vf) == 35, (len(corpo), len(mc), len(vf)))
check("706 quiz-item", len(n) == 706)
c = Counter(re.search(r'<strong>([a-d])\)', n[k]).group(1) for k in mc)
check("distribuição das letras sem viés (≤ 2 de diferença)", max(c.values()) - min(c.values()) <= 2, dict(c))
for k in ("q-b05q27", "q-b08q25"):
    check(f"{k}: rótulo 'Basada…' e nunca 'oficial' como texto", "Basada en preguntas de examen" in n[k] and "Pregunta oficial" not in n[k])
    check(f"{k}: 4 alternativas, 1 chave, explicação e armadilha", n[k].count("<li>") == 4 and n[k].count("<strong>") == 1 and 'class="rmc-trap"' in n[k])
check("taturana: nenhum «anticoagulante y fibrinolítico» solto como mecanismo", new.count("Taturana: <b>anticoagulante y fibrinolítico</b>") == 0)
print(f"toxicologia-fotos estático: {ok} OK · {fail} FALHA"); sys.exit(1 if fail else 0)
