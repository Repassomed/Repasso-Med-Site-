#!/usr/bin/env python3
"""Toxicología · cruce del PDF P2_260523, lectura visual de las 53 páginas (PR sobre la #733): verificación estática, solo lectura.
Uso: python3 -I tools/qa/toxicologia-p2-pdf/estatico.test.py [ref-base=origin/claude/toxicologia-provas-fotos]
Confere: los 706 ids de la #733 siguen presentes; cambios = (a) rótulo de q-b01q05, q-b05q19 y q-b03q07 (cuerpo y banco), con alternativas/clave/explicación
idénticas; (b) 2 preguntas nuevas q-b08q26 y q-b08q27 (+ espejos); cuerpo = banco; «Basada» 96 / «complementaria» 259 / 355 preguntas; V/F 35; bloque 08 = 27."""
import re, subprocess, sys
P = "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/toxicologia.html"
BASE = sys.argv[1] if len(sys.argv) > 1 else "origin/claude/toxicologia-provas-fotos"
ok = fail = 0
def check(n, c, d=""):
    global ok, fail
    if c: ok += 1
    else: fail += 1; print("FALHA", n, d)
new_txt = open(P, encoding="utf-8").read(); old = subprocess.check_output(["git", "show", f"{BASE}:{P}"]).decode()
def items(t):
    d = {}
    for m in re.finditer(r'<div class="quiz-item" id="([^"]+)">', t):
        a = m.start(); d[m.group(1)] = t[a:t.index('</div></div>', a)]
    return d
o, n = items(old), items(new_txt)
NUEVOS = {"q-b08q26", "q-b08q26-bk", "q-b08q27", "q-b08q27-bk"}
check("los 706 ids anteriores siguen presentes y solo se añaden los 4 nuevos", set(o) <= set(n) and set(n) - set(o) == NUEVOS and len(n) == 710, sorted(set(n) - set(o)))
mud = sorted(k for k in o if o[k] != n[k])
check("solo cambian 6 ítems antiguos (3 preguntas × cuerpo/banco)", mud == ["q-b01q05", "q-b01q05-bk", "q-b03q07", "q-b03q07-bk", "q-b05q19", "q-b05q19-bk"], mud)
OLD = '<span class="quiz-tag variante">Pregunta complementaria</span>'; NEW = '<span class="quiz-tag oficial">Basada en preguntas de examen</span>'
check("el único cambio de los antiguos es el rótulo", all(o[k].replace(OLD, NEW) == n[k] for k in mud))
corpo = [k for k in n if not k.endswith("-bk")]
check("cuerpo = banco", all(n[k] == n[k + "-bk"].replace(k + "-bk", k) for k in corpo))
bas = [k for k in corpo if 'quiz-tag oficial' in n[k][:400]]; com = [k for k in corpo if 'quiz-tag variante' in n[k][:400]]
check("«Basada» 96 y «complementaria» 259, total 355", len(bas) == 96 and len(com) == 259 and len(corpo) == 355, (len(bas), len(com), len(corpo)))
check("V/F 35", len([k for k in corpo if "tf-buttons" in n[k]]) == 35)
b08 = [k for k in corpo if k.startswith("q-b08q")]
check("bloque 08 = 27 y su introducción dice «Veintisiete»", len(b08) == 27 and "<p>Veintisiete preguntas. Las marcadas como" in new_txt[new_txt.index('id="toxb08"'):new_txt.index('</section>', new_txt.index('id="toxb08"'))])
check("subtítulo del banco «(27 preguntas)» y cabecera 355/320/35", "orugas <small>(27 preguntas)" in new_txt and all(x in new_txt for x in ["<span>355 preguntas</span>", "<span>320 de múltiple opción</span>", "<span>35 de verdadero o falso</span>"]))
for k, tag in (("q-b08q26", "oficial"), ("q-b08q27", "variante")):
    check(f"{k}: rótulo correcto ({tag}), 4 alternativas, 1 clave, explicación y trampa", f'quiz-tag {tag}' in n[k][:400] and n[k].count("<li>") == 4 and n[k].count("<strong>") == 1 and 'class="rmc-trap"' in n[k])
from collections import Counter
c = Counter(re.search(r'<strong>([a-d])\)', n[k]).group(1) for k in corpo if "tf-buttons" not in n[k])
check("letras a/b/c/d equilibradas (80 cada una)", dict(c) == {"a": 80, "b": 80, "c": 80, "d": 80}, dict(c))
print(f"toxicologia-p2-pdf estático: {ok} OK · {fail} FALHA"); sys.exit(1 if fail else 0)
