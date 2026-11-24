#!/usr/bin/env python3
# AP II Práctica · revisión integral · pruebas ESTÁTICAS (sin red, sin escritura). Uso: python3 tools/qa/ap2p-revisao/ap2p-revisao.test.py [--base origin/main]
import os, re, subprocess, sys, struct
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import construir as C, glosario as GL
from PIL import Image

base = sys.argv[sys.argv.index('--base') + 1] if '--base' in sys.argv else 'origin/main'
rel = os.path.relpath(C.F, C.ROOT)
orig = subprocess.check_output(['git', '-C', C.ROOT, 'show', f'{base}:{rel}']).decode('utf-8')
cur = open(C.F, encoding='utf-8').read()
ok = bad = 0
def T(c, m, x=None):
    global ok, bad
    if c: ok += 1
    else: bad += 1; print('  ✗ FALHA:', m, ('→ ' + str(x)[:300]) if x is not None else '')
SP = re.compile(r'<span class="rmc-gl">(.*?)<b>\?</b><i><b class="rmc-gl-close">[^<]*</b>(.*?)</i></span>', re.S)
strip = lambda h: SP.sub(lambda m: m.group(1), h)

# 1 · el HTML actual es EXACTAMENTE «original + revisión» (idempotente y reproducible)
ref, _ = C.build(orig)
T(ref == cur, 'el archivo actual = original + construir.py (reproducible, sin edición manual fuera del script)', (len(ref), len(cur)))
ref_sin, _ = C.build(orig, glosario=False)
T(strip(cur) == strip(ref_sin), 'quitando los glosarios, el texto es idéntico al de referencia sin glosario (ninguna palabra se perdió, se movió ni se partió)')
T(cur.count(C.MARCA) == 1, 'marcador de la revisión presente 1×')

# 2 · preservación
ids_o = set(re.findall(r'\bid="([^"]+)"', orig)); ids_c = set(re.findall(r'\bid="([^"]+)"', cur))
T(ids_o <= ids_c, 'todos los ids originales siguen existiendo', sorted(ids_o - ids_c)[:5])
dup = [i for i in ids_c if len(re.findall(r'\bid="%s"' % re.escape(i), cur)) > 1]
dup_o = [i for i in ids_o if len(re.findall(r'\bid="%s"' % re.escape(i), orig)) > 1]
T(set(dup) <= set(dup_o), 'no se introdujeron ids duplicados', sorted(set(dup) - set(dup_o))[:5])
cnt = lambda h, p: len(re.findall(p, h))
for nombre, pat in (('quiz-item', r'class="quiz-item"'), ('flashcard', r'class="flashcard"'), ('<img> originales', r'<img ')):
    a, b = cnt(orig, pat), cnt(cur, pat)
    if nombre == '<img> originales': T(b >= a, 'las imágenes originales siguen (antes %d, ahora %d)' % (a, b))
    else: T(a == b, f'{nombre}: mismo número que antes ({a})', (a, b))
# preguntas y tarjetas: bloque por bloque, byte a byte (salvo glosario)
for n in range(1, 19):
    bid = f'ap2pb{n:02d}'
    a0, b0 = C.seccion(orig, bid); a1, b1 = C.seccion(cur, bid)
    q0 = re.findall(r'<div class="quiz-item">.*?</div>\s*</div>', orig[a0:b0], re.S); q1 = re.findall(r'<div class="quiz-item">.*?</div>\s*</div>', cur[a1:b1], re.S)
    T(len(q0) == len(q1) and all(strip(x) == strip(y) for x, y in zip(q0, q1)), f'{bid}: preguntas idénticas ({len(q0)})')
    f0 = re.findall(r'<div class="flashcard">.*?</div></div>', orig[a0:b0], re.S); f1 = re.findall(r'<div class="flashcard">.*?</div></div>', cur[a1:b1], re.S)
    T(len(f0) == len(f1) and all(strip(x) == strip(y) for x, y in zip(f0, f1)), f'{bid}: flashcards idénticas ({len(f0)})')
for sid in ('ap2pbanco', 'ap2pmazo'):
    a0, b0 = C.seccion(orig, sid); a1, b1 = C.seccion(cur, sid)
    T(orig[a0:b0] == cur[a1:b1], f'{sid}: sección idéntica byte a byte')
# los 19 glosarios originales siguen
T(len(SP.findall(orig)) <= len(SP.findall(cur)), 'los glosarios originales siguen (%d → %d)' % (len(SP.findall(orig)), len(SP.findall(cur))))
for m in SP.finditer(orig):
    T(m.group(0) in cur, 'glosario original intacto: ' + re.sub(r'<[^>]+>', '', m.group(1))[:30])

# 2b · las secciones de fotos quedan FUERA del contenedor de preguntas
for bid in ('ap2pb02','ap2pb03','ap2pb05','ap2pb07','ap2pb09','ap2pb10','ap2pb11','ap2pb13','ap2pb15','ap2pb16','ap2pb17','ap2pb18'):
    a, b = C.seccion(cur, bid); s = cur[a:b]; i = s.index('<div class="quiz-section">'); j = s.index('Más vistas de la lámina')
    T(j < i, f'{bid}: la sección de fotos va antes del contenedor de preguntas')

# 3 · glosario: sin anidar, términos coherentes, fuera de preguntas/respuestas/tarjetas/títulos
T(not any('<span class="rmc-gl">' in m.group(1) for m in re.finditer(r'<span class="rmc-gl">(.*?)</i></span>', cur, re.S)), 'ningún glosario anidado')
T(cur.count('<span class="rmc-gl">') == cur.count('<b class="rmc-gl-close">'), 'cada glosario tiene su botón de cierre')
bad_ctx = []
for m in SP.finditer(cur):
    ante = cur[max(0, m.start() - 3000):m.start()]
    # contexto: ¿el span está dentro de un quiz-item / answer / flashcard / título? (el tokenizador del glosario ya lo evita; se verifica de forma independiente)
    for etiqueta in ('<h2', '<h3', '<h4', '<th', '<figcaption', '<button'):
        i = ante.rfind(etiqueta)
        if i >= 0 and ante.rfind('</' + etiqueta[1:]) < i: bad_ctx.append(etiqueta)
    ia = ante.rfind('<div class="answer"');
    if ia >= 0 and ante.find('</div>', ia) < 0 and len(ante) - ia < 2500: bad_ctx.append('answer')
T(not bad_ctx, 'ningún glosario nuevo dentro de títulos, pies de figura, botones o respuestas', bad_ctx[:5])
defs = {}
for m in SP.finditer(cur):
    k = re.sub(r'<[^>]+>', '', m.group(1)).lower().strip(); defs.setdefault(k, set()).add(m.group(2))
incoh = [k for k, v in defs.items() if len(v) > 1]
T(not incoh, 'cada término tiene UNA sola definición en toda la materia', incoh[:5])
largas = [k for k, v in defs.items() if any(len(re.sub(r'<[^>]+>', '', d)) > 330 for d in v)]
T(not largas, 'definiciones cortas (≤ 330 caracteres)', largas[:5])
# términos pedidos por José
for need in ('perla de queratina', 'perlas de queratina', 'mixoide', 'linitis plástica', 'intraepitelial', 'granuloma', 'caseosa', 'granulomas no caseificantes'):
    T(any(need in k or k in need for k in defs) or need in ' '.join(defs), f'término pedido con glosario: «{need}»')
T(len(defs) >= 40, 'al menos 40 términos distintos en el glosario (%d)' % len(defs))

# 4 · fotos y atlas
fotos = sorted(set(re.findall(r'/assets/img/anatoprat2/(lam-fotos-[a-z0-9-]+\.webp)', cur)))
T(len(fotos) == 16, '16 fotos nuevas referenciadas', len(fotos))
d_img = os.path.join(C.ROOT, 'Repasso-Med-Site--main/Atual - Copia/assets/img/anatoprat2/')
for f in fotos:
    p = d_img + f
    T(os.path.exists(p), f'{f} existe')
    if os.path.exists(p):
        w, h = Image.open(p).size; T(w == h and 600 <= w <= 900, f'{f} cuadrada y de tamaño razonable ({w}×{h})')
        T(os.path.getsize(p) <= 200 * 1024, f'{f} ≤ 200 KB ({os.path.getsize(p)//1024} KB)')
for n in (19, 20, 22):
    p = d_img + f'vig/vb-{n}.webp'; T(os.path.exists(p) and Image.open(p).size == (480, 480), f'vinheta vb-{n}.webp 480×480')
T('.ap2p-ficha td{overflow-wrap:anywhere}' in cur, 'CSS de la ficha oficial presente')
T(cur.count('class="ap2p-tab ap2p-ficha"') == 26 + 8 - 0 or cur.count('class="ap2p-tab ap2p-ficha"') >= 30, 'fichas oficiales con la clase ap2p-ficha', cur.count('class="ap2p-tab ap2p-ficha"'))
atl = re.findall(r'<div class="rmatlas">.*?</div></div></div></div>', cur, re.S)
T(len(atl) == 11, '11 atlas interactivos nuevos (8 en bloques existentes + 3 en bloques nuevos)', len(atl))
for a in atl:
    base_src = re.search(r'class="rmatlas-base" src="([^"]+)"', a).group(1)
    pts = re.findall(r'<button class="rmatlas-pt" type="button" style="left:([\d.]+)%;top:([\d.]+)%" data-n="(\d+)" data-x="([\d.]+)" data-y="([\d.]+)" data-name="([^"]+)" data-expl="([^"]+)">(\d+)</button>', a)
    T(len(pts) >= 3, f'{os.path.basename(base_src)}: ≥3 puntos', len(pts))
    T([int(p[2]) for p in pts] == list(range(1, len(pts) + 1)) and all(p[2] == p[7] for p in pts), f'{os.path.basename(base_src)}: puntos numerados 1..n')
    T(all(0 < float(p[0]) < 100 and 0 < float(p[1]) < 100 and p[0] == p[3] and p[1] == p[4] for p in pts), f'{os.path.basename(base_src)}: coordenadas dentro de la imagen y style = data-x/y')
    T(len({p[5] for p in pts}) == len(pts), f'{os.path.basename(base_src)}: nombres de punto distintos')
    T(all(len(p[6]) > 40 for p in pts), f'{os.path.basename(base_src)}: cada punto explica el hallazgo')
    T(all('<' not in p[5] and '<' not in p[6] and '&lt;' not in p[5] + p[6] for p in pts), f'{os.path.basename(base_src)}: nombre y explicación en texto plano (el atlas usa textContent: nada de etiquetas visibles)')
    T(os.path.exists(d_img + os.path.basename(base_src)), f'{os.path.basename(base_src)}: imagen del atlas existe')
alts = re.findall(r'<img src="/assets/img/anatoprat2/lam-fotos-[^"]+" alt="([^"]*)"', cur)
T(alts and all(len(a) > 60 for a in alts), 'todas las fotos nuevas con alt descriptivo', [a for a in alts if len(a) <= 60][:2])

# 5 · bloques 19–23
for n in range(19, 24):
    bid = f'ap2pb{n:02d}'; a, b = C.seccion(cur, bid); s = cur[a:b]
    T(f'— BLOQUE {n:02d} · FINAL ·' in s, f'{bid}: marcador de sección')
    T(s.count('class="ap2p-lam"') >= 2, f'{bid}: ≥2 láminas ({s.count(chr(34)+"ap2p-lam"+chr(34))})' if False else f'{bid}: tiene láminas')
    T('quiz-item' not in s and 'class="flashcard"' not in s, f'{bid}: sin preguntas ni tarjetas inventadas (faltan materiales teóricos)')
    T('Qué falta de los próximos materiales' in s, f'{bid}: registra lo que falta de José')
    T(all(k in s for k in ('<b>Órgano</b>', '<b>Proceso</b>', '<b>Diagnóstico</b>', '<b>Descripción oficial</b>')), f'{bid}: cada lámina con órgano, proceso, descripción y diagnóstico')
order = [m.group(1) for m in re.finditer(r'<section class="container" id="(ap2p[a-z0-9]+)"', cur)]
T(order == [f'ap2pb{n:02d}' for n in range(1, 24)] + ['ap2pbanco', 'ap2pmazo', 'ap2pcierre'], 'orden de las secciones: bloques 01–23, banco, mazo, cierre', order[-6:])
# fidelidad al documento: cada diagnóstico nuevo aparece como lo escribe el documento
for dx in ('Bocio coloide multinodular', 'Tiroiditis de Hashimoto', 'Adenoma folicular de tiroides', 'Carcinoma papilar de tiroides', 'Carcinoma medular de tiroides', 'Endometriosis', 'Cervicitis crónica', 'Carcinoma escamoso de cuello uterino', 'Leiomioma', 'Leiomiosarcoma', 'Teratoma ovárico', 'Cistoadenoma mucinoso de ovario', 'Mastitis granulomatosa', 'Carcinoma ductal de mama in situ', 'Carcinoma ductal de mama invasivo', 'Condiloma acuminado', 'Carcinoma escamoso de piel', 'Melanoma', 'Lipoma', 'Hemangioma cavernoso', 'Liposarcoma', 'Atrofia testicular', 'Hiperplasia prostática benigna', 'Orquitis', 'Teratoma testicular', 'Seminoma', 'Adenocarcinoma de próstata'):
    T(f'<b>{dx}</b>' in cur, f'diagnóstico del documento presente: {dx}')
# pendientes de fuente visibles (no se esconden)
for frag in ('ficha vacía', 'alta malignidad', 'predominio <b>linfoplasmocitario</b>', 'no describe atipia celular'):
    T(frag in strip(cur), f'discrepancia de fuente registrada en la página: «{frag}»')
# páncreas: ya no dice que no hay diapositiva
T('el material no incluye diapositivas, caso clínico ni preguntas de pancreatitis crónica' not in cur and 'solo la ficha</b> y dos imágenes' not in cur, 'bloques 15/16: sin la advertencia desactualizada de «solo ficha»')
T(all(x in cur for x in ('PRSS1', 'KRAS', 'CDKN2A', 'SMAD4', 'PanIN')), 'bloques 15/16: genes y PanIN de las diapositivas 13/14')
print(f'\nap2p-revisao (estático): {ok}/{ok + bad} OK' + (f' — {bad} FALHAS' if bad else ''))
sys.exit(1 if bad else 0)
