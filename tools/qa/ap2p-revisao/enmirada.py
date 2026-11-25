# AP II Práctica · cuadro «⚡ En una mirada» al inicio de los bloques 01–14, 17 y 18.
# NO agrega contenido médico nuevo: condensa en una tabla los cuatro renglones OFICIALES que cada bloque ya trae en «La consigna resuelta»
# (órgano · proceso · diagnóstico · descripción), para que el alumno tenga el resumen antes de entrar al texto largo.
import re

BLOQUES = [f'ap2pb{n:02d}' for n in list(range(1, 15)) + [17, 18]]

def _dx(s):
    out = []
    for d in re.findall(r'<div class="ap2p-dx">(.*?)</div>\s*(?:<div class="ap2p-dx-note">.*?</div>\s*)?</div>', s, re.S):
        r = dict(re.findall(r'<b>([^<]+)</b><span[^>]*>(.*?)</span>', d, re.S))
        if all(k in r for k in ('Órgano', 'Proceso', 'Descripción', 'Diagnóstico')): out.append(r)
    return out

def tabla(filas):
    f = ''.join(f'<tr><td><b>{r["Órgano"]}</b></td><td>{r["Proceso"]}</td><td>{r["Diagnóstico"]}</td><td>{r["Descripción"]}</td></tr>\n' for r in filas)
    return ('<div class="ap2p-tab ap2p-ficha ap2p-mirada">\n<div class="ap2p-tab-h">⚡ En una mirada · lo que dice la ficha oficial</div>\n<div class="rmc-scroll"><table>\n'
            '<thead><tr><th>Órgano</th><th>Proceso</th><th>Diagnóstico</th><th>Descripción oficial</th></tr></thead>\n<tbody>\n' + f + '</tbody>\n</table></div>\n'
            '<p class="rmc-cap">Es el mismo texto de «La consigna resuelta» de más abajo, puesto al principio para verlo de un vistazo. Después viene la explicación desde cero.</p>\n</div>\n')

def aplicar(t):
    n_total = 0
    for bid in BLOQUES:
        a = t.index(f'<section class="container" id="{bid}"'); b = t.index('</section>', a); s = t[a:b]
        filas = _dx(s)
        assert filas, bid
        ancla = '<div class="rmc-postit">'
        assert s.count(ancla) >= 1 and 'En una mirada' not in s, bid
        i = s.index(ancla)
        t = t[:a] + s[:i] + tabla(filas) + s[i:] + t[b:]
        n_total += len(filas)
    return t, n_total
