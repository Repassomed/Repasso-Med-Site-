# AP II Práctica · orden de los slides 13 → 14: el adenocarcinoma de páncreas (diapositiva 13) pasa ANTES de la pancreatitis crónica (diapositiva 14).
# Los IDENTIFICADORES no cambian (ap2pb15 sigue siendo pancreatitis y ap2pb16 adenocarcinoma; preguntas, tarjetas, anclas, imágenes y marcas de los alumnos
# viven bajo esos ids). Cambian SOLO: la posición de las dos secciones, las porciones equivalentes del banco/mazo, y los rótulos visibles «Bloque 15/16» y «PÁNCREAS I/II».
import re

def aplicar(t):
    # 1) secciones contiguas: ap2pb16 antes de ap2pb15
    a = t.index('<section class="container" id="ap2pb15"'); b = t.index('<section class="container" id="ap2pb16"'); c = t.index('</section>', b) + len('</section>')
    assert t[a:b].rstrip().endswith('</section>')
    t = t[:a] + t[b:c] + '\n' + t[a:b].rstrip() + t[c:]
    # 2) fila de la tabla del banco
    t, n = re.subn(r'(<tr><th>Bloque 15 ·.*?</tr>)(\s*)(<tr><th>Bloque 16 ·.*?</tr>)', r'\3\2\1', t, count=1, flags=re.S); assert n == 1
    # 3) porciones h4 del banco (preguntas) y del mazo (tarjetas): [h4 15, h4 16) + [h4 16, siguiente h2-h4)
    pos = 0; k = 0
    while True:
        i = t.find('<h4>Bloque 15 ·', pos)
        if i < 0: break
        j = t.index('<h4>Bloque 16 ·', i); m = re.compile(r'<h[2-4]|</section>').search(t, j + 10); assert m
        t = t[:i] + t[j:m.start()] + t[i:j] + t[m.start():]; pos = m.start(); k += 1
    assert k == 2, k
    # 4) rótulos visibles 15 ↔ 16 (solo texto: «Bloque NN», «BLOQUE NN» y el marcador PÁNCREAS I/II)
    t = re.sub(r'(?i)\b(bloque) (15|16)\b', lambda m: f'{m.group(1)} {"16" if m.group(2) == "15" else "15"}', t)
    t = t.replace('PÁNCREAS II</span>', 'PÁNCREAS @@</span>').replace('PÁNCREAS I</span>', 'PÁNCREAS II</span>').replace('PÁNCREAS @@</span>', 'PÁNCREAS I</span>')
    return t
