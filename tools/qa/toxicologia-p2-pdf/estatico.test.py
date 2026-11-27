#!/usr/bin/env python3
"""Toxicología · cruce del PDF P2_260523 (PR sobre la #733): verificación estática, solo lectura.
Uso: python3 -I tools/qa/toxicologia-p2-pdf/estatico.test.py [ref-base=origin/claude/toxicologia-provas-fotos]
Confere: mismos 706 ids; ÚNICO cambio = rótulo de q-b01q05 y q-b05q19 (cuerpo y banco); alternativas/clave/explicación idénticas;
cuerpo = banco; «Basada» 94 / «complementaria» 259 en el cuerpo; 353 preguntas; V/F 35."""
import re, subprocess, sys
P = "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/toxicologia.html"
BASE = sys.argv[1] if len(sys.argv) > 1 else "origin/claude/toxicologia-provas-fotos"
ok = fail = 0
def check(n, c, d=""):
    global ok, fail
    if c: ok += 1
    else: fail += 1; print("FALHA", n, d)
new = open(P, encoding="utf-8").read(); old = subprocess.check_output(["git", "show", f"{BASE}:{P}"]).decode()
def items(t):
    d = {}
    for m in re.finditer(r'<div class="quiz-item" id="([^"]+)">', t):
        a = m.start(); d[m.group(1)] = t[a:t.index('</div></div>', a)]
    return d
o, n = items(old), items(new)
check("mismos ids (706)", set(o) == set(n) and len(n) == 706)
mud = sorted(k for k in o if o[k] != n[k])
check("solo cambian 4 ítems (2 preguntas × cuerpo/banco)", mud == ["q-b01q05", "q-b01q05-bk", "q-b05q19", "q-b05q19-bk"], mud)
OLD = '<span class="quiz-tag variante">Pregunta complementaria</span>'; NEW = '<span class="quiz-tag oficial">Basada en preguntas de examen</span>'
check("el único cambio es el rótulo", all(o[k].replace(OLD, NEW) == n[k] for k in mud))
corpo = [k for k in n if not k.endswith("-bk")]
check("cuerpo = banco", all(n[k] == n[k + "-bk"].replace(k + "-bk", k) for k in corpo))
bas = [k for k in corpo if 'quiz-tag oficial' in n[k][:400]]; com = [k for k in corpo if 'quiz-tag variante' in n[k][:400]]
check("«Basada» 94 y «complementaria» 259", len(bas) == 94 and len(com) == 259 and len(corpo) == 353, (len(bas), len(com), len(corpo)))
check("V/F 35", len([k for k in corpo if "tf-buttons" in n[k]]) == 35)
print(f"toxicologia-p2-pdf estático: {ok} OK · {fail} FALHA"); sys.exit(1 if fail else 0)
