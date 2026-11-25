#!/usr/bin/env python3
# AP II Práctica · revisión integral (24–25/11/2026). Aplica, de forma idempotente, sobre anatomia-patologica-ii-practica.html:
#   1) fotos nuevas (pasta «Láminas») con atlas verificado en 12 bloques existentes;
#   2) bloques 15 y 16: diapositivas actualizadas 14 y 13;
#   3) bloques 19–23 (tiroides, cánceres de tiroides, reproductor femenino, piel, reproductor masculino) a partir de los dos documentos nuevos y 3 fotos;
#   4) glosario clicable en toda la materia (bloques 01–23).
# Uso: python3 tools/qa/ap2p-revisao/construir.py   (desde la raíz del repositorio)
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import fotos_existentes as FE, bloques_nuevos as BN, ampliacion_pancreas as AP, glosario as GL, enmirada as EM, reordenar as RO, docs_vistas as DV, bloque24 as B24

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..', '..'))
F = os.path.join(ROOT, 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/anatomia-patologica-ii-practica.html')
MARCA = '<!-- ap2p-rev:24-11 -->'

def seccion(t, sid):
    a = t.index(f'<section class="container" id="{sid}"'); b = t.index('</section>', a) + len('</section>')
    return a, b

def build(t, glosario=True):
    """t = HTML ORIGINAL (antes de la revisión). Con glosario=False omite el paso 4: es la referencia de la prueba de integridad del texto."""
    assert MARCA not in t, 'ya aplicado'
    # 1) fotos nuevas
    for bid in FE.B:
        n = int(bid[-2:]); marca = f'<div class="quiz-section">\n<h3>❓ Preguntas · Bloque {n:02d}</h3>'   # la sección nueva va ANTES del contenedor de preguntas (dentro de él el modo «preguntas» la mostraría)
        a, b = seccion(t, bid); s = t[a:b]
        assert s.count(marca) == 1, (bid, s.count(marca))
        t = t[:a] + s.replace(marca, FE.seccion(bid) + '\n' + marca) + t[b:]
    # 2) páncreas
    for bid, nuevo, old, new in (('ap2pb15', AP.B15, AP.TXT15_OLD, AP.TXT15_NEW), ('ap2pb16', AP.B16, AP.TXT16_OLD, AP.TXT16_NEW)):
        a, b = seccion(t, bid); s = t[a:b]
        assert s.count(old) == 1, bid
        s = s.replace(old, new)
        anc = '<div class="ap2p-acto a1">'
        i = s.index(anc); s = s[:i] + nuevo + '\n' + s[i:]
        t = t[:a] + s + t[b:]
    assert t.count(AP.CIERRE_OLD) == 1
    t = t.replace(AP.CIERRE_OLD, AP.CIERRE_NEW)
    bib = '<li><b>Contenido de la cátedra de Anatomía Patológica II · Final.</b>'
    assert t.count(bib) == 1
    t = t.replace(bib, '<li><b>Documentos «laminário» del semestre y fotos de la pasta «Láminas» (nov. 2026).</b> Fichas oficiales (órgano, proceso, descripción y diagnóstico) de las láminas del semestre, y fotos de microscopio identificadas por el nombre del archivo.</li>\n' + bib)
    # 3) bloques nuevos, antes del banco general
    i = t.index('<section class="container" id="ap2pbanco"')
    t = t[:i] + ''.join(BN.todos()) + B24.todos() + t[i:]
    # 3b) CSS de la ficha oficial (palabras largas no ensanchan la tabla en el celular)
    css_anc = '#tab-anatoprat2 .ap2p-tab tr:last-child td{border-bottom:0}'
    assert t.count(css_anc) == 1
    t = t.replace(css_anc, css_anc + '\n#tab-anatoprat2 .ap2p-ficha td{overflow-wrap:anywhere}\n#tab-anatoprat2 .ap2p-ficha td:first-child{width:7.6rem}\n#tab-anatoprat2 .ap2p-ficha ul{margin:.1rem 0;padding-left:1.1rem}\n#materias-container #tab-anatoprat2 .ap2p-ficha .rmc-scroll table{min-width:0}')
    for bid in DV.POR_BLOQUE:
        a, b = seccion(t, bid); sec = t[a:b]; n = int(bid[-2:]); extra = DV.seccion(bid)
        ancla = f'<div class="quiz-section">\n<h3>❓ Preguntas · Bloque {n:02d}</h3>' if n <= 18 else '<div class="rmc-note"><b>🧭 Qué falta de los próximos materiales:</b>'
        assert sec.count(ancla) == 1, (bid, sec.count(ancla))
        t = t[:a] + sec.replace(ancla, extra + '\n' + ancla) + t[b:]
    # 3c) cuadro «En una mirada» (bloques 01–14, 17, 18)
    t, n_mirada = EM.aplicar(t)
    # 4) glosario
    total = 0
    if glosario:
        mapa = GL.construir_mapa(t)
        for m in list(re.finditer(r'<section class="container" id="(ap2pb\d\d)"', t))[::-1]:
            a, b = seccion(t, m.group(1))
            s, n = GL.aplicar(t[a:b], mapa, {}); total += n
            t = t[:a] + s + t[b:]
    t = RO.aplicar(t)   # orden de los slides (13 antes de 14), ids intactos
    t = t.replace('<section id="ap2pportada" hidden aria-hidden="true"></section>', '<section id="ap2pportada" hidden aria-hidden="true"></section>\n' + MARCA, 1)
    return t, total

if __name__ == '__main__':
    t = open(F, encoding='utf-8').read()
    if MARCA in t: sys.exit('ya aplicado (marcador ap2p-rev:24-11)')
    t2, n = build(t)
    open(F, 'w', encoding='utf-8').write(t2)
    print('ok · bytes', len(t2), '· glosarios nuevos', n)
