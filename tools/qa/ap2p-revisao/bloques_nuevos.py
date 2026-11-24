# AP II Práctica · bloques 19–23 (después de la lámina 16 / pielonefritis): tiroides, cánceres de tiroides, reproductor femenino, piel y partes blandas, reproductor masculino.
# FUENTES: SOLO los dos documentos nuevos («laminário_261110…» = A, «laminário - 2…» = B) y las 3 fotos de la pasta «Láminas» (Hashimoto, carcinoma papilar, condiloma).
# NO hay diapositivas teóricas de estos temas: no se inventa teoría; cada bloque dice qué falta de los próximos materiales de José.
from lib_html import atlas, fichas_tabla, view, esc

AP1P = 'Esta lámina ya tiene ficha y atlas en <b>Anatomía Patológica I Práctica</b> (misma descripción en el documento del semestre); acá se resume para seguir la secuencia de la materia.'

def lam(l):
    """l = dict(slug, titulo, area, organo, proceso, desc[list], dx, clave, buscar, fuente, nota=None, foto=None, atlas=None, cruz=False)"""
    o = [f'<div class="ap2p-lam" id="lam-{l["slug"]}">\n  <div class="ap2p-lam-h"><b>{l["organo"]} · {l["dx"]}</b><span>{l["proceso"]}</span></div>\n']
    if l.get('foto'):
        s, t, alt = l['foto']
        if l.get('atlas'):
            sa, ab, pts = l['atlas']; o.append(atlas(sa, ab, pts))   # la foto ya se ve en el atlas
        else:
            o.append('  <div class="ap2p-views">\n' + view(s, t, alt) + '  </div>\n')
    o.append('  <div class="ap2p-body">\n')
    desc = '<ul class="lam-find">' + ''.join(f'<li>{x}</li>' for x in l['desc']) + '</ul>'
    o.append(fichas_tabla([('Área', l['area']), ('Órgano', l['organo']), ('Proceso', l['proceso']), ('Descripción oficial', desc), ('Diagnóstico', f'<b>{l["dx"]}</b>'), ('Fuente', l['fuente'])]))
    o.append(f'    <div class="ap2p-look"><b>👁️ Qué buscar:</b> {l["buscar"]}</div>\n')
    o.append(f'    <div class="ap2p-look"><b>⭐ Lo más característico:</b> {l["clave"]}</div>\n')
    if l.get('nota'): o.append(f'    <div class="ap2p-nc"><b>⚠️ Fuente:</b> {l["nota"]}</div>\n')
    if l.get('cruz'): o.append(f'    <div class="ap2p-nc"><b>🔗</b> {AP1P}</div>\n')
    if not l.get('foto'): o.append('    <div class="ap2p-nc"><b>🖼️ Imagen:</b> todavía no hay foto identificada de esta lámina en el material recibido; se agregará cuando lleguen.</div>\n')
    o.append('  </div>\n</div>\n')
    return ''.join(o)

def comparativo(titulo, cab, filas):
    h = ''.join(f'<th>{c}</th>' for c in cab)
    r = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in f) + '</tr>\n' for f in filas)
    return f'<div class="ap2p-tab">\n<div class="ap2p-tab-h">{titulo}</div>\n<div class="rmc-scroll"><table>\n<thead><tr>{h}</tr></thead>\n<tbody>\n{r}</tbody>\n</table></div>\n</div>\n'

def bloque(n, marcador, emoji_h2, h2, cap, resumen, comp, laminas, pendiente):
    o = [f'<section class="container" id="ap2pb{n:02d}">\n<div class="section-marker"><span class="section-marker-num">— BLOQUE {n:02d} · FINAL · {marcador}</span></div>\n<h2>{emoji_h2} {h2}</h2>\n']
    o.append(f'<p class="rmc-cap">{cap}</p>\n')
    o.append(f'<div class="rmc-postit"><h4><span>📌</span>Cómo está armado este bloque</h4>\n{resumen}\n</div>\n')
    o.append(comp)
    o.append('<h3>🗺️ Láminas del bloque</h3>\n')
    for l in laminas: o.append(lam(l))
    o.append(f'<div class="rmc-note"><b>🧭 Qué falta de los próximos materiales:</b> {pendiente}</div>\n')
    o.append('</section>\n')
    return ''.join(o)

ESTADO = ('<p>Este bloque nace <b>de las láminas</b>: el documento del semestre trae, para cada una, <b>órgano, proceso, descripción y diagnóstico</b>. '
          '<b>Todavía no hay diapositivas teóricas</b> de este tema, así que acá <b>no</b> se explican causas, genes, clínica ni tratamiento: eso entra cuando lleguen. '
          'La estructura queda lista para recibirlos.</p>')

# ---------------------------------------------------------------- 19 · tiroides (enfermedades)
L19 = [
 dict(slug='bocio', area='Glándulas endocrinas · tiroides', organo='Glándula tiroides', proceso='Adaptación · hiperplasia e hipertrofia', dx='Bocio coloide multinodular',
      desc=['<b>Hiperplasia</b> y <b>aplanamiento</b> del epitelio folicular', '<b>Coloide abundante</b>', 'Ausencia de cápsula prominente'],
      clave='<b>mucho coloide</b> dentro de folículos con epitelio <b>aplanado</b>, sin cápsula marcada.', buscar='folículos <b>grandes y llenos de coloide rosado</b>, con un epitelio muy fino.',
      fuente='documento «laminário_261110», pág. 1'),
 dict(slug='hashimoto', area='Glándulas endocrinas · tiroides', organo='Glándula tiroides', proceso='Inflamación crónica', dx='Tiroiditis de Hashimoto',
      desc=['Folículos tiroideos <b>atróficos</b>', '<b>Nódulos linfoides con centros germinativos</b>', '<b>Fibrosis</b>', '<b>Células de Hürthle</b>'],
      clave='<b>folículos linfoides con centro claro</b> en medio de un infiltrado de linfocitos que ocupa el lugar del tejido folicular.', buscar='<b>nódulos redondos de linfocitos con el centro más pálido</b> y poco tejido tiroideo entre ellos.',
      fuente='documento «laminário_261110», pág. 4',
      foto=('hashimoto', 'Vista · folículos linfoides', 'Foto de microscopio en campo circular claro: infiltrado denso de linfocitos azul violáceo con varios nódulos redondos de centro pálido, una banda rosada fibrosa en el borde superior y un espacio blanco debajo.'),
      atlas=('hashimoto', 'Foto de microscopio de tiroides con varios folículos linfoides de centro claro dentro de un infiltrado denso de linfocitos.', [
        (31, 37, 'Folículo linfoide con centro claro', 'Nódulo redondo de linfocitos con el centro más pálido: es el <b>centro germinativo</b> de la descripción oficial.'),
        (53, 65, 'Otro folículo linfoide', 'Segundo nódulo con centro claro, en la parte baja: los folículos son <b>varios</b>, no uno solo.'),
        (28, 17, 'Banda fibrosa del borde', 'Banda rosada en el borde superior. A este aumento <b>no</b> se resuelven los folículos tiroideos atróficos ni las células de Hürthle.')])),
 dict(slug='adenoma-folicular', area='Glándulas endocrinas · tiroides', organo='Glándula tiroides', proceso='Neoplasia benigna', dx='Adenoma folicular de tiroides',
      desc=['Proliferación neoplásica <b>benigna</b>', 'Aspecto <b>normofolicular</b> y <b>microfolicular</b>'],
      clave='una <b>neoplasia benigna</b> hecha de folículos bien formados, de tamaño normal o pequeño.', buscar='folículos <b>normales o pequeños</b> agrupados en una proliferación bien delimitada.',
      fuente='documento «laminário - 2», pág. 2'),
]
COMP19 = comparativo('⚖️ Tres láminas de tiroides, lado a lado', ['Lámina', 'Proceso', 'Qué domina', 'Palabra clave'], [
    ['<b>Bocio coloide multinodular</b>', 'Adaptación (hiperplasia/hipertrofia)', 'Folículos con mucho coloide y epitelio aplanado', '<b>Coloide abundante</b>'],
    ['<b>Tiroiditis de Hashimoto</b>', 'Inflamación crónica', 'Linfocitos con centros germinativos, folículos atróficos, fibrosis', '<b>Centros germinativos</b>'],
    ['<b>Adenoma folicular</b>', 'Neoplasia benigna', 'Folículos normo/microfoliculares en una proliferación benigna', '<b>Microfolicular</b>']])
PEND19 = ('causas, genes, clínica y tratamiento de bocio, Hashimoto y adenoma folicular; criterios para separar adenoma de carcinoma; <b>fotos</b> del bocio y del adenoma folicular.')

# ---------------------------------------------------------------- 20 · cánceres de tiroides
L20 = [
 dict(slug='ca-papilar', area='Glándulas endocrinas · tiroides', organo='Glándula tiroides', proceso='Neoplasia maligna', dx='Carcinoma papilar de tiroides',
      desc=['<b>Papilas</b> con eje fibrovascular, cubiertas por células atípicas', '<b>Cuerpos de psamoma</b>', 'Núcleos en <b>vidrio esmerilado</b>', 'Pliegues en la membrana (el documento dice «membrana celular») e <b>hendiduras nucleares</b>', 'Líneas hipercromáticas en el eje nuclear: aspecto de <b>«grano de café»</b>'],
      clave='<b>papilas con eje fibrovascular</b> y, a mayor aumento, <b>núcleos en vidrio esmerilado con hendiduras</b>.', buscar='primero las <b>papilas</b> (dedos con un eje de vasos); los núcleos se miran después, a mayor aumento.',
      fuente='documento «laminário - 2», pág. 5',
      nota='el documento escribe «plegamiento de la <b>membrana celular</b>»; hay que confirmar con el material teórico si se refiere a la membrana nuclear. En la foto los núcleos <b>no</b> se resuelven (ni el vidrio esmerilado ni los psamomas).',
      foto=('tiroides-papilar', 'Vista · papilas y espacios císticos', 'Foto de microscopio en campo circular: proyecciones papilares con eje de tejido conectivo hacia espacios claros, a la derecha un espacio amplio con papilas libres, a la izquierda un estroma rosado con un vaso congestivo y, arriba, un óvalo rosado homogéneo.'),
      atlas=('tiroides-papilar', 'Foto de microscopio de tiroides con proyecciones papilares hacia espacios claros.', [
        (43, 56, 'Papilas con eje fibrovascular', 'Proyecciones en forma de dedo con un eje de tejido conectivo y vasos: es el patrón <b>papilar</b>.'),
        (76, 43, 'Más papilas', 'Frondes papilares del lado derecho: el patrón se repite, no es un hallazgo aislado.'),
        (80, 19, 'Espacio con papilas libres', 'Cavidad clara con papilas que se proyectan hacia su interior.')])),
 dict(slug='ca-medular', area='Glándulas endocrinas · tiroides', organo='Glándula tiroides', proceso='Neoplasia maligna', dx='Carcinoma medular de tiroides',
      desc=['Células <b>pleomórficas</b>', '<b>Depósito de amiloide</b> en el estroma'],
      clave='células <b>pleomórficas</b> con <b>amiloide</b> en el estroma.', buscar='un estroma <b>rosado, amorfo</b> (amiloide) entre células de tamaño variable.',
      fuente='documento «laminário - 2», pág. 5'),
]
COMP20 = comparativo('⚖️ Dos cánceres de tiroides en el documento', ['Lámina', 'Qué se describe', 'Palabra clave'], [
    ['<b>Carcinoma papilar</b>', 'Papilas con eje fibrovascular, psamomas, núcleos en vidrio esmerilado con hendiduras y «grano de café»', '<b>Papilas + vidrio esmerilado</b>'],
    ['<b>Carcinoma medular</b>', 'Células pleomórficas y depósito de amiloide en el estroma', '<b>Amiloide</b>']])
PEND20 = ('origen celular, genes (p. ej. los que asocia el material), clínica, pronóstico y tratamiento; <b>otros</b> cánceres de tiroides si la cátedra los incluye; <b>foto</b> del carcinoma medular; confirmación de la frase sobre la «membrana».')

# ---------------------------------------------------------------- 21 · reproductor femenino
L21 = [
 dict(slug='endometriosis', area='Sistema reproductor femenino · trompa uterina', organo='Trompa uterina', proceso='Inflamación crónica', dx='Endometriosis',
      desc=['<b>Glándulas endometriales benignas</b> con <b>estroma denso</b> dentro de la trompa uterina'], clave='<b>glándulas y estroma de tipo endometrial</b> en un lugar donde no corresponden.', buscar='glándulas benignas rodeadas de un estroma denso y celular.', fuente='documento «laminário_261110», pág. 5'),
 dict(slug='cervicitis', area='Sistema reproductor femenino · cérvix', organo='Cérvix', proceso='Inflamación crónica', dx='Cervicitis crónica',
      desc=['Mucosa endocervical con <b>metaplasia escamosa</b>', '<b>Coilocitos</b>', 'Infiltrado <b>linfocitario</b>', 'Eritrocitos extravasados, vasos dilatados y edema'], clave='<b>metaplasia escamosa + coilocitos + linfocitos</b> en la mucosa del cuello.', buscar='mucosa endocervical con cambio a epitelio escamoso y células con halo claro (coilocitos).', fuente='documento «laminário_261110», pág. 5'),
 dict(slug='ca-escamoso-cervix', area='Sistema reproductor femenino · cérvix', organo='Útero / cérvix', proceso='Neoplasia maligna', dx='Carcinoma escamoso de cuello uterino',
      desc=['Proliferación <b>infiltrativa</b> de <b>nidos y cordones</b> de células escamosas', 'Células <b>pleomórficas</b>, núcleos hipercromáticos', '<b>Mitosis frecuentes</b>'], clave='<b>nidos y cordones</b> de células escamosas que <b>infiltran</b>.', buscar='nidos y cordones de células atípicas dentro del estroma del cuello uterino.', fuente='documento «laminário - 2», pág. 6'),
 dict(slug='leiomioma', area='Sistema reproductor femenino · útero', organo='Útero', proceso='Neoplasia benigna', dx='Leiomioma',
      desc=['Proliferación <b>benigna</b> de músculo liso en el <b>miometrio</b>', 'Células <b>fusiformes</b> sin atipias', 'Patrón <b>arremolinado</b>'], clave='<b>células fusiformes en remolino</b>, sin atipias.', buscar='haces de células alargadas que se cruzan en remolino.', fuente='documento «laminário - 2», pág. 1', cruz=True),
 dict(slug='leiomiosarcoma', area='Sistema reproductor femenino · útero', organo='Útero', proceso='Neoplasia maligna', dx='Leiomiosarcoma',
      desc=['Proliferación de <b>células musculares lisas</b> con atipias y <b>pleomorfismo</b>', '<b>Ausencia de polaridad</b>, anisonucleosis', '<b>Mitosis atípica</b>'], clave='la misma estirpe muscular del leiomioma, pero con <b>atipias, pleomorfismo y mitosis atípica</b>.', buscar='células musculares con núcleos de tamaño muy desigual y mitosis anormales.', fuente='documento «laminário - 2», pág. 6'),
 dict(slug='teratoma-ovarico', area='Sistema reproductor femenino · ovario', organo='Ovario', proceso='Neoplasia benigna', dx='Teratoma ovárico',
      desc=['Proliferación <b>benigna</b> con tejido epitelial', '<b>Glándulas sebáceas, folículos pilosos y glándulas sudoríparas</b>', 'Tejido <b>muscular liso, adiposo y cartilaginoso</b>'], clave='<b>varios tejidos maduros mezclados</b> (piel y anexos, músculo, grasa y cartílago).', buscar='estructuras de piel (folículos, glándulas) junto con grasa, músculo y cartílago.', fuente='documento «laminário - 2», pág. 1', cruz=True),
 dict(slug='cistoadenoma-mucinoso', area='Sistema reproductor femenino · ovario', organo='Ovario', proceso='Neoplasia benigna', dx='Cistoadenoma mucinoso de ovario',
      desc=['<b>Quiste</b> en el estroma ovárico', 'Revestido por epitelio <b>cilíndrico mucosecretor</b>', 'Contenido homogéneo (<b>mucina</b>) en la cavidad, <b>sin atipias</b>'], clave='un <b>quiste</b> revestido por epitelio que <b>secreta mucina</b>.', buscar='una cavidad con pared de epitelio alto y contenido rosado homogéneo.', fuente='documento «laminário - 2», pág. 2'),
 dict(slug='mastitis-granulomatosa', area='Sistema reproductor femenino · mama', organo='Mama', proceso='Inflamación crónica granulomatosa no caseificante', dx='Mastitis granulomatosa',
      desc=['<b>Células epitelioides</b> y <b>células gigantes de Langhans</b>', 'Fibroblastos y <b>halo de linfocitos</b>', 'Áreas de <b>abscesos</b>'], clave='<b>granulomas sin necrosis caseosa</b> (epitelioides + gigantes de Langhans) en la mama.', buscar='nódulos de células rosadas «en empedrado», con gigantes y un borde de linfocitos.', fuente='documento «laminário_261110», pág. 5'),
 dict(slug='cdis', area='Sistema reproductor femenino · mama', organo='Mama', proceso='Neoplasia maligna (in situ)', dx='Carcinoma ductal de mama in situ',
      desc=['Proliferación neoplásica maligna <b>ductal in situ</b>', 'Patrón <b>sólido</b> y <b>cribiforme</b>'], clave='<b>dentro del conducto</b>: células malignas que lo llenan (sólido) o lo perforan en «agujeros» (cribiforme).', buscar='conductos ocupados por células atípicas, sin salir de su pared.', fuente='documento «laminário - 2», pág. 5'),
 dict(slug='ca-ductal-invasivo', area='Sistema reproductor femenino · mama', organo='Mama', proceso='Neoplasia maligna (invasiva)', dx='Carcinoma ductal de mama invasivo',
      desc=['Células atípicas que <b>infiltran el estroma</b> en <b>fila india</b>', '<b>Desmoplasia</b>'], clave='células en <b>fila india</b> que <b>salen del conducto</b> e infiltran un estroma fibroso.', buscar='hileras de una sola célula de ancho dentro de un estroma denso.', fuente='documento «laminário - 2», pág. 5'),
]
COMP21 = comparativo('⚖️ Útero, ovario y mama: pares que se parecen', ['Par', 'Benigno / reactivo', 'Maligno', 'Qué cambia'], [
    ['<b>Útero</b> (músculo liso)', 'Leiomioma: fusiformes en remolino, <b>sin atipias</b>', 'Leiomiosarcoma: <b>atipias, pleomorfismo, mitosis atípica</b>', 'Mismo tejido; cambia la <b>atipia</b>'],
    ['<b>Ovario</b>', 'Teratoma (tejidos maduros mezclados) · cistoadenoma mucinoso (quiste con mucina, sin atipias)', '— (no hay lámina maligna de ovario en el documento)', 'Un tumor es <b>de varios tejidos</b>, el otro <b>de un epitelio que secreta mucina</b>'],
    ['<b>Mama</b> (ductal)', 'Mastitis granulomatosa (inflamación)', 'CDIS (dentro del conducto) → carcinoma ductal invasivo (fila india, desmoplasia)', 'In situ = <b>dentro</b> del conducto; invasivo = <b>infiltra el estroma</b>'],
    ['<b>Cérvix</b>', 'Cervicitis crónica: metaplasia escamosa, coilocitos, linfocitos', 'Carcinoma escamoso: nidos y cordones infiltrantes, mitosis frecuentes', 'Inflamación con cambios vs. <b>infiltración</b> franca']])
PEND21 = ('toda la teoría de útero, cérvix, ovario y mama (causas, VPH y otros genes, clasificación, estadificación, clínica, tratamiento); <b>fotos identificadas</b> de las 10 láminas (ninguna llegó todavía); y el material para <b>endometrio</b> si la cátedra lo agrega.')

# ---------------------------------------------------------------- 22 · piel y partes blandas
L22 = [
 dict(slug='condiloma', area='Piel · tegumentario', organo='Piel', proceso='Neoplasia benigna', dx='Condiloma acuminado',
      desc=['<b>Hiperplasia</b> del epitelio escamoso', '<b>Hiperqueratosis</b> y <b>acantosis</b>', '<b>Papilomatosis</b>', '<b>Coilocitosis</b>, sin atipias'],
      clave='<b>epitelio escamoso en dedos (papilas)</b> con queratina en la punta, y <b>sin atipias</b>.', buscar='proyecciones digitiformes de epitelio grueso con un eje conectivo vascular.',
      fuente='documento «laminário - 2», pág. 2',
      nota='la foto se llama «Codiloma acuminado» (error de ortografía del archivo); la identificación es la del nombre. La <b>coilocitosis</b> no se resuelve a este aumento.',
      foto=('condiloma', 'Vista · papilas con queratina', 'Foto de microscopio en campo circular claro: proyecciones digitiformes de epitelio escamoso grueso y violeta, con material claro ondulado en las puntas y un eje central rosado con capilares dilatados.'),
      atlas=('condiloma', 'Foto de microscopio de piel con proyecciones papilares de epitelio escamoso grueso y un eje conectivo central.', [
        (40, 36, 'Proyección papilar', 'Dedo de epitelio escamoso grueso con un eje de conectivo: es la <b>papilomatosis</b>.'),
        (63, 16, 'Queratina en la punta', 'Material claro y ondulado en el extremo de las papilas: <b>hiperqueratosis</b>.'),
        (63, 71, 'Eje conectivo con vasos', 'Centro rosado con capilares dilatados que sostiene las papilas.'),
        (81, 57, 'Epitelio engrosado', 'Banda violeta gruesa de epitelio escamoso: <b>acantosis</b>.')])),
 dict(slug='ca-escamoso-piel', area='Piel · tegumentario', organo='Piel', proceso='Neoplasia maligna', dx='Carcinoma escamoso de piel',
      desc=['<b>Queratinocitos atípicos</b> en <b>nidos</b>', '<b>Perlas de queratina</b> abundantes'], clave='<b>nidos de queratinocitos atípicos con muchas perlas de queratina</b>.', buscar='nidos con capas concéntricas de queratina (perlas) dentro de la dermis.', fuente='documento «laminário - 2», pág. 3', cruz=True),
 dict(slug='melanoma', area='Piel · tegumentario', organo='Piel', proceso='Documento: «acumulación» (diagnóstico: melanoma)', dx='Melanoma',
      desc=['Acumulación de <b>pigmento marrón oscuro</b> (melanina) en la <b>dermis</b>'], clave='<b>pigmento marrón oscuro</b> en la dermis.', buscar='células cargadas de pigmento marrón dentro de la dermis.', fuente='documento «laminário_261110», pág. 2',
      nota='la ficha rotula el proceso como <b>acumulación</b> y describe solo el depósito de melanina; <b>no describe atipia celular</b> aunque el diagnóstico es melanoma. Hay que confirmarlo con el material teórico antes de enseñarlo más allá de lo escrito.', cruz=True),
 dict(slug='lipoma', area='Piel y partes blandas', organo='Piel / partes blandas', proceso='Neoplasia benigna', dx='Lipoma',
      desc=['Tejido adiposo <b>unilocular maduro</b>', 'Separado por <b>septos fibrosos</b>, <b>sin atipias</b>'], clave='<b>grasa madura</b> dividida por tabiques fibrosos, sin atipias.', buscar='adipocitos grandes y claros separados por finos tabiques rosados.', fuente='documento «laminário - 2», pág. 1', cruz=True),
 dict(slug='hemangioma', area='Piel · tegumentario', organo='Piel', proceso='Neoplasia benigna', dx='Hemangioma cavernoso',
      desc=['Proliferación <b>benigna</b> de <b>canales vasculares</b>', 'Revestidos por una capa simple de células planas (el documento dice «epitelio plano simple»), <b>sin atipias</b>', 'Separados por <b>tabiques fibrosos</b>'], clave='<b>canales vasculares grandes</b> separados por tabiques fibrosos, sin atipias.', buscar='espacios vasculares amplios, a veces con sangre, con paredes finas.', fuente='documento «laminário - 2», pág. 1', nota='el documento llama «epitelio» al revestimiento de los vasos; se dejó la descripción de lo que se ve («capa simple de células planas») y queda como pendiente confirmar el término.', cruz=True),
 dict(slug='liposarcoma', area='Piel y partes blandas', organo='— (en blanco en el documento)', proceso='Neoplasia maligna', dx='Liposarcoma',
      desc=['<b>El documento trae la ficha vacía</b>: órgano y descripción en blanco.'], clave='<b>pendiente</b>: no hay descripción en la fuente.', buscar='no se puede indicar sin la descripción oficial.', fuente='documento «laminário - 2», pág. 6',
      nota='ficha incompleta en el documento: solo figura el diagnóstico. <b>No se inventa descripción.</b> Pendiente de José.'),
]
COMP22 = comparativo('⚖️ Seis láminas de piel y partes blandas', ['Lámina', 'Proceso', 'Palabra clave'], [
    ['<b>Condiloma acuminado</b>', 'Neoplasia benigna', 'Papilomatosis, hiperqueratosis, acantosis, <b>coilocitosis</b>'],
    ['<b>Carcinoma escamoso de piel</b>', 'Neoplasia maligna', '<b>Perlas de queratina</b> en nidos'],
    ['<b>Melanoma</b>', 'Según el documento: acumulación', '<b>Pigmento marrón</b> (melanina) en la dermis'],
    ['<b>Lipoma</b>', 'Neoplasia benigna', '<b>Grasa unilocular madura</b>'],
    ['<b>Hemangioma cavernoso</b>', 'Neoplasia benigna', '<b>Canales vasculares</b> sin atipias'],
    ['<b>Liposarcoma</b>', 'Neoplasia maligna', '<i>pendiente: ficha vacía</i>']])
PEND22 = ('teoría de piel y partes blandas (clasificación de los tumores cutáneos, VPH, factores de riesgo, clínica, tratamiento); <b>fotos</b> de ca. escamoso de piel, melanoma, lipoma, hemangioma y liposarcoma; la <b>descripción del liposarcoma</b>; la confirmación de la ficha del melanoma.')

# ---------------------------------------------------------------- 23 · reproductor masculino
L23 = [
 dict(slug='atrofia-testicular', area='Sistema reproductor masculino · testículo', organo='Testículo', proceso='Adaptación · atrofia', dx='Atrofia testicular',
      desc=['<b>Túbulos seminíferos atróficos</b>', '<b>Disminución</b> de células de Sertoli', '<b>Engrosamiento</b> de la membrana basal', '<b>Aumento</b> de células de Leydig en el intersticio'], clave='túbulos <b>pequeños y «vacíos»</b> con <b>Leydig prominentes</b>.', buscar='túbulos de luz reducida, membrana basal gruesa y células intersticiales visibles.', fuente='documento «laminário_261110», pág. 1', cruz=True),
 dict(slug='hpb', area='Sistema reproductor masculino · próstata', organo='Próstata', proceso='Adaptación · hiperplasia', dx='Hiperplasia prostática benigna',
      desc=['Proliferación <b>glandular benigna</b> con <b>doble capa</b> de células (externa cúbica simple, interna cilíndrica simple)', 'Glándulas <b>dilatadas</b>', 'Aumento del <b>estroma fibromuscular</b>', '<b>Cuerpos amiláceos</b>'], clave='<b>glándulas dilatadas con doble capa</b> y <b>cuerpos amiláceos</b>.', buscar='glándulas grandes con dos capas de células y concreciones rosadas en la luz.', fuente='documento «laminário_261110», pág. 1', cruz=True),
 dict(slug='orquitis', area='Sistema reproductor masculino · testículo', organo='Testículo', proceso='Inflamación (el documento: «aguda»)', dx='Orquitis',
      desc=['Túbulos seminíferos <b>degenerados</b> con pérdida del epitelio germinativo', 'Células de <b>Leydig conservadas</b>', '<b>Edema</b> intersticial', 'Infiltrado inflamatorio mixto con predominio <b>linfoplasmocitario</b>'], clave='<b>túbulos degenerados</b> con <b>edema</b> y un infiltrado de linfocitos y plasmocitos.', buscar='túbulos sin epitelio germinativo, intersticio edematoso y células inflamatorias.', fuente='documento «laminário_261110», pág. 3',
      nota='el documento rotula la inflamación como <b>aguda</b> pero describe predominio <b>linfoplasmocitario</b>; hay que confirmar la clasificación con el material teórico.'),
 dict(slug='teratoma-testicular', area='Sistema reproductor masculino · testículo', organo='Testículo', proceso='Neoplasia (el documento lo lista como «benigna»)', dx='Teratoma testicular',
      desc=['Proliferación <b>desorganizada</b> de tejidos derivados de las <b>capas embrionarias</b>', 'El documento agrega «<b>alta malignidad</b>» y <b>atrofia</b> de los túbulos seminíferos'], clave='<b>tejidos de varias capas embrionarias</b> mezclados de forma desorganizada.', buscar='áreas de tejidos distintos sin un orden, junto a túbulos atróficos.', fuente='documento «laminário - 2», pág. 1',
      nota='el documento lo ubica entre las neoplasias <b>benignas</b> pero escribe «alta malignidad» en la descripción: son datos que se contradicen. <b>Queda pendiente</b> aclararlo; no se enseña ninguna de las dos lecturas como cierta.'),
 dict(slug='seminoma', area='Sistema reproductor masculino · testículo', organo='Testículo', proceso='Neoplasia maligna', dx='Seminoma',
      desc=['Células seminomatosas con <b>núcleos basófilos</b> y <b>citoplasma claro</b>', '<b>Nucléolos prominentes</b>', 'Separadas por <b>tejido fibroso</b> con <b>infiltrado linfocitario</b>', 'Células <b>grandes y poligonales</b>'], clave='<b>células grandes de citoplasma claro</b> separadas por tabiques fibrosos con <b>linfocitos</b>.', buscar='láminas de células claras divididas por finos tabiques con linfocitos.', fuente='documento «laminário - 2», pág. 6'),
 dict(slug='ca-prostata', area='Sistema reproductor masculino · próstata', organo='Próstata', proceso='Neoplasia maligna', dx='Adenocarcinoma de próstata',
      desc=['Proliferación neoplásica maligna de <b>patrón irregular</b>', 'Células <b>cúbicas atípicas</b> con <b>nucléolos evidentes</b>'], clave='<b>glándulas de patrón irregular</b> con células cúbicas de <b>nucléolo evidente</b>.', buscar='glándulas pequeñas y desordenadas, de células con nucléolo visible.', fuente='documento «laminário - 2», pág. 6'),
]
COMP23 = comparativo('⚖️ Testículo y próstata', ['Órgano', 'Adaptación / inflamación', 'Neoplasia'], [
    ['<b>Testículo</b>', 'Atrofia testicular (túbulos pequeños, Leydig prominentes) · orquitis (túbulos degenerados, edema, linfoplasmocitos)', 'Teratoma (varias capas embrionarias; ficha contradictoria) · <b>seminoma</b> (células claras con tabiques fibrosos y linfocitos)'],
    ['<b>Próstata</b>', 'Hiperplasia benigna (glándulas dilatadas con doble capa, cuerpos amiláceos)', 'Adenocarcinoma (patrón irregular, células cúbicas con nucléolos)']])
PEND23 = ('teoría de testículo y próstata (causas, marcadores, clínica, estadificación, tratamiento); <b>fotos</b> de las 6 láminas; la <b>aclaración</b> de las fichas de teratoma (benigno/«alta malignidad») y de orquitis (aguda/linfoplasmocitaria).')

def todos():
    return [
     bloque(19, 'TIROIDES I', '🦋', 'Tiroides · enfermedades', 'Tres láminas de tiroides: <em>adaptación, inflamación y neoplasia benigna</em>.', ESTADO, COMP19, L19, PEND19),
     bloque(20, 'TIROIDES II', '🎗️', 'Tiroides · cánceres', 'Dos cánceres de tiroides: uno de <em>papilas</em> y otro de <em>amiloide</em>.', ESTADO, COMP20, L20, PEND20),
     bloque(21, 'REPRODUCTOR FEMENINO', '🌸', 'Sistema reproductor femenino · útero, ovario y mama', 'Diez láminas: <em>cérvix, trompa, útero, ovario y mama</em>.', ESTADO, COMP21, L21, PEND21),
     bloque(22, 'PIEL Y PARTES BLANDAS', '🧴', 'Piel y partes blandas', 'Seis láminas: <em>piel, grasa y vasos</em>.', ESTADO, COMP22, L22, PEND22),
     bloque(23, 'REPRODUCTOR MASCULINO', '🧬', 'Sistema reproductor masculino · testículo y próstata', 'Seis láminas: <em>testículo y próstata</em>.', ESTADO, COMP23, L23, PEND23),
    ]
