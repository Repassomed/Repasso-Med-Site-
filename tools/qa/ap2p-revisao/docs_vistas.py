# AP II Práctica · vistas de los documentos del semestre A («laminário_261110_132914.pdf») y B («laminário - 2_260728_225030.pdf»), descargados por partes (25/11/2026).
# Cada foto está identificada por la FICHA de su página (órgano · proceso · descripción · diagnóstico). Origen: recorte del campo circular desde la página del PDF
# (render 300 dpi en las páginas con imagen incrustada; en las páginas «_imagem» —A pág. 3–5 y B pág. 1–2, convertidas para caber en el límite— la nitidez es menor).
# El fondo exterior viene transparente de la propia máscara del círculo; el tejido no se retocó.
import json, os
from lib_html import view, esc
MAPA = json.load(open(os.path.join(os.path.dirname(__file__), 'docmap.json'), encoding='utf-8'))
NOMBRE = {'A': 'laminário_261110', 'B': 'laminário - 2'}
BAJA = {('A', 3), ('A', 4), ('A', 5), ('B', 1), ('B', 2)}   # páginas convertidas a imagen (menor nitidez)
TITULO = {
 'carcinoma-escamoso-de-lengua': 'Lengua · carcinoma escamoso', 'adenoma-pleomorfo-de-parotida': 'Parótida · adenoma pleomorfo', 'adenocarcinoma-esofagico': 'Esófago · adenocarcinoma',
 'esofago-de-barrett': 'Esófago · esófago de Barrett', 'carcinoma-escamoso-de-esofago': 'Esófago · carcinoma escamoso', 'gastritis-cronica': 'Estómago · gastritis crónica',
 'adenocarcinoma-gastrico-difuso': 'Estómago · adenocarcinoma difuso', 'adenocarcinoma-gastrico-intestinal': 'Estómago · adenocarcinoma intestinal', 'cirrosis-hepatica': 'Hígado · cirrosis',
 'carcinoma-hepatocelular': 'Hígado · carcinoma hepatocelular', 'duodenitis-cronica': 'Duodeno · duodenitis crónica', 'enfermedad-de-crohn': 'Íleon · enfermedad de Crohn',
 'apendicitis-aguda': 'Apéndice · apendicitis aguda', 'adenocarcinoma-de-colon-no-mucosecretante': 'Colon · adenocarcinoma no mucosecretante', 'adenocarcinoma-de-colon-mucosecretante': 'Colon · adenocarcinoma mucosecretante',
 'adenoma-tubular-de-colon': 'Colon · adenoma tubular', 'pancreatitis-cronica': 'Páncreas · pancreatitis crónica', 'adenocarcinoma-de-pancreas': 'Páncreas · adenocarcinoma', 'tumor-de-wilms-nefroblastoma': 'Riñón · tumor de Wilms',
 'pielonefritis-cronica': 'Riñón · pielonefritis crónica', 'bocio-coloide-multinodular': 'Tiroides · bocio coloide multinodular', 'tiroiditis-de-hashimoto': 'Tiroides · tiroiditis de Hashimoto',
 'adenoma-folicular-de-tiroides': 'Tiroides · adenoma folicular', 'carcinoma-papilar-de-tiroides': 'Tiroides · carcinoma papilar', 'carcinoma-medular-de-tiroides': 'Tiroides · carcinoma medular',
 'endometriosis': 'Trompa uterina · endometriosis', 'cervicitis-cronica': 'Cérvix · cervicitis crónica', 'carcinoma-escamoso-de-cuello-uterino': 'Cuello uterino · carcinoma escamoso', 'leiomioma': 'Útero · leiomioma',
 'teratoma-ovarico': 'Ovario · teratoma', 'cistoadenoma-mucinoso-de-ovario': 'Ovario · cistoadenoma mucinoso', 'mastitis-granulomatosa': 'Mama · mastitis granulomatosa',
 'carcinoma-ductal-de-mama-in-situ': 'Mama · carcinoma ductal in situ', 'carcinoma-ductal-de-mama-invasivo': 'Mama · carcinoma ductal invasivo', 'condiloma-acuminado': 'Piel · condiloma acuminado',
 'carcinoma-escamoso-de-piel': 'Piel · carcinoma escamoso', 'melanoma': 'Piel · melanoma', 'lipoma': 'Piel / partes blandas · lipoma', 'hemangioma-cavernoso': 'Piel · hemangioma cavernoso',
 'atrofia-testicular': 'Testículo · atrofia', 'hiperplasia-prostatica-benigna': 'Próstata · hiperplasia benigna', 'orquitis': 'Testículo · orquitis', 'teratoma-testicular': 'Testículo · teratoma',
 'seminoma': 'Testículo · seminoma', 'adenocarcinoma-de-prostata': 'Próstata · adenocarcinoma',
 'hipertrofia-cardiaca': 'Corazón · hipertrofia', 'infarto-agudo-del-miocardio': 'Corazón · infarto agudo', 'tuberculosis': 'Pulmón · tuberculosis', 'neumonia-en-fase-de-resolucion': 'Pulmón · neumonía en resolución',
 'carcinoma-epidermoide-de-celulas-pequenas': 'Pulmón · carcinoma de células pequeñas', 'aterosclerosis': 'Vaso sanguíneo · aterosclerosis', 'esteatosis-hepatica': 'Hígado · esteatosis',
 'colesterolosis': 'Vesícula biliar · colesterolosis', 'pancreatitis-aguda': 'Páncreas · pancreatitis aguda'}
# bloque antiguo / lámina nueva -> slugs de los documentos que le corresponden
POR_BLOQUE = {'ap2pb01': ['carcinoma-escamoso-de-lengua'], 'ap2pb02': ['adenoma-pleomorfo-de-parotida'], 'ap2pb03': ['adenocarcinoma-esofagico', 'esofago-de-barrett'], 'ap2pb04': ['carcinoma-escamoso-de-esofago'],
 'ap2pb05': ['gastritis-cronica'], 'ap2pb06': ['adenocarcinoma-gastrico-difuso'], 'ap2pb07': ['adenocarcinoma-gastrico-intestinal'], 'ap2pb08': ['cirrosis-hepatica'], 'ap2pb09': ['carcinoma-hepatocelular'],
 'ap2pb10': ['duodenitis-cronica'], 'ap2pb11': ['enfermedad-de-crohn'], 'ap2pb12': ['apendicitis-aguda'], 'ap2pb13': ['adenocarcinoma-de-colon-no-mucosecretante', 'adenoma-tubular-de-colon'],
 'ap2pb14': ['adenocarcinoma-de-colon-mucosecretante'], 'ap2pb15': ['pancreatitis-cronica'], 'ap2pb16': ['adenocarcinoma-de-pancreas'], 'ap2pb17': ['tumor-de-wilms-nefroblastoma'], 'ap2pb18': ['pielonefritis-cronica'],
 'ap2pb19': ['bocio-coloide-multinodular', 'tiroiditis-de-hashimoto', 'adenoma-folicular-de-tiroides'], 'ap2pb20': ['carcinoma-papilar-de-tiroides', 'carcinoma-medular-de-tiroides'],
 'ap2pb21': ['endometriosis', 'cervicitis-cronica', 'carcinoma-escamoso-de-cuello-uterino', 'leiomioma', 'teratoma-ovarico', 'cistoadenoma-mucinoso-de-ovario', 'mastitis-granulomatosa', 'carcinoma-ductal-de-mama-in-situ', 'carcinoma-ductal-de-mama-invasivo'],
 'ap2pb22': ['condiloma-acuminado', 'carcinoma-escamoso-de-piel', 'melanoma', 'lipoma', 'hemangioma-cavernoso'],
 'ap2pb23': ['atrofia-testicular', 'hiperplasia-prostatica-benigna', 'orquitis', 'teratoma-testicular', 'seminoma', 'adenocarcinoma-de-prostata']}
# atlas a partir de imágenes de los SLIDES de la cátedra, con las estructuras rotuladas por el propio slide (solo esas)
SLIDE_ATLAS = {'ap2pb02': [
  dict(origen='slide 02 · pág. 3', stem='lam-s02-adenoma-pleomorfo-1', alt='Foto de microscopio de glándula parótida con adenoma pleomorfo: parénquima glandular violeta a la izquierda, banda fibrosa rosada en el medio y tumor pálido a la derecha.', pts=[
    (17, 35, 'Parénquima de la parótida', 'Glándula sana, muy violeta, con acinos y huecos de grasa. Así la rotula el slide.'),
    (42, 42, 'Cápsula fibrosa', 'Banda rosada que separa la glándula del tumor: es la cápsula, de espesor variable. Así la rotula el slide.'),
    (75, 55, 'Adenoma', 'Tejido tumoral pálido y celular, del otro lado de la cápsula. Así lo rotula el slide.')]),
  dict(origen='slide 02 · pág. 3', stem='lam-s02-adenoma-pleomorfo-2', alt='Foto de microscopio de adenoma pleomorfo de parótida: tejido tumoral pálido y laxo a la izquierda, cápsula fibrosa rosada en el medio y parénquima violeta a la derecha.', pts=[
    (20, 35, 'Tejido mixoide laxo', 'Fondo pálido y laxo del tumor, con conductos y cordones epiteliales dentro. Así lo rotula el slide («tej. mixoide laxo + conductos, acinos, túbulos irregulares, hileras o incluso sábanas»).'),
    (66, 45, 'Cápsula fibrosa', 'Banda rosada entre el tumor y la glándula normal.'),
    (80, 40, 'Parénquima de la parótida', 'Glándula normal comprimida, violeta, a un lado de la cápsula.')])]}
def atlas_slides(bid):
    from lib_html import atlas
    o = ''
    for d in SLIDE_ATLAS.get(bid, []):
        o += (f'<div class="ap2p-lam" id="lam-{d["stem"]}">\n  <div class="ap2p-lam-h"><b>Imagen anotada del slide</b><span>{d["origen"]}</span></div>\n' + atlas(d['stem'], d['alt'], d['pts']) +
              '  <div class="ap2p-nc"><b>🔎</b> Imagen tomada de un slide de la cátedra; los puntos marcan <b>solo</b> las estructuras que el propio slide rotula. Sin escala ni aumento.</div>\n</div>\n')
    return o
def vistas(slug):
    """lista [(stem, título, alt)] de las fotos de un diagnóstico"""
    m = MAPA[slug]; doc, pg = m['doc'], m['pg']; t = TITULO[slug]; out = []
    for i, stem in enumerate(m['files'], 1):
        out.append((stem, f'Vista {i} · {t}',
                    f'Foto de microscopio en campo circular, identificada por la ficha del documento «{NOMBRE[doc]}», pág. {pg}, como {t.split(" · ")[1]} ({t.split(" · ")[0].lower()}). Sin escala ni aumento.'))
    return out
def seccion(bid):
    slugs = [s for s in POR_BLOQUE[bid] if s in MAPA]
    if not slugs: return ''
    sl = atlas_slides(bid)
    baja = any((MAPA[s]['doc'], MAPA[s]['pg']) in BAJA for s in slugs)
    o = ['\n<h3>📎 Más vistas · documentos del semestre</h3>\n',
         '<p>Fotos de las fichas de los <b>documentos del semestre</b> (A: «laminário_261110»; B: «laminário - 2»). Cada foto se identifica por <b>la ficha de su página</b> (diagnóstico escrito junto a ella); '
         'no traen escala ni aumento. Tocá una vista para ampliarla.</p>\n']
    if baja: o.append('<div class="ap2p-nc"><b>🔎 Nitidez:</b> las páginas A 3–5 y B 1–2 llegaron <b>convertidas a imagen</b> para caber en el límite de tamaño: sirven para el aspecto general, <b>no</b> para juzgar detalles microscópicos finos.</div>\n')
    o.append(sl)
    for s in slugs:
        m = MAPA[s]
        o.append(f'<div class="ap2p-lam" id="lam-doc-{s}">\n  <div class="ap2p-lam-h"><b>{TITULO[s]}</b><span>documento {m["doc"]} · pág. {m["pg"]}</span></div>\n  <div class="ap2p-views">\n')
        for stem, t, alt in vistas(s): o.append(view(stem, t, alt))
        o.append('  </div>\n</div>\n')
    return ''.join(o)
