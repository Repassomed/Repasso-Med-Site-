# AP II Práctica · vistas y fichas del laminario «Final» (Anatopato II pratica - Final.pdf, 15 págs., 39 fotos), del laminario P2 (adenoma tubular) y de la diapositiva 14.
# Origen de cada imagen: el propio PDF de la cátedra (página indicada); la identificación es la de la ficha de esa página. Todas son fotos de microscopio sin escala.
# Fondo: el exterior negro del campo circular se volvió transparente SOLO cuando el contorno era un círculo limpio (22 de 36 + 16 de 16 del teléfono); en el resto se conserva el original.
import re

def fv(n, k):            # vista del laminario Final
    return f'lam-final-{n}-{k}'

# ficha del laminario Final por lámina nueva (slug de bloques_nuevos): (página, [bullets])
FICHA = {
 'bocio': (1, ['Folículos <b>dilatados</b> y de tamaño variable', 'Epitelio <b>aplanado</b> e hiperplásico por sectores', 'Áreas de <b>hemorragia</b> y <b>fibrosis</b>']),
 'hashimoto': (2, ['Folículos <b>atróficos</b> y folículos residuales', 'Infiltrado <b>linfocitario</b> crónico con <b>centros germinales bien desarrollados</b>', 'Áreas de fibrosis y hemorragia; <b>células de Hürthle</b>']),
 'adenoma-folicular': (3, ['Proliferación benigna de patrón <b>microfolicular</b> y <b>normofolicular</b>', 'Revestida por <b>células cúbicas sin atipia</b>, separada por tejido fibroso', 'Áreas de hemorragia']),
 'ca-papilar': (4, ['Proliferación maligna con <b>tallo fibrovascular</b> y <b>papilas ramificadas</b>', 'Núcleos «<b>ojos de la huérfana Annie</b>» (vidrio esmerilado), en <b>superposición</b>', '<b>Pseudoinclusión nuclear</b> y <b>cuerpos de psamoma</b>']),
 'endometriosis': (5, ['<b>Glándulas endometriales</b> y <b>estroma</b>', '<b>Hemosiderina</b> en la trompa uterina (compatible con endometriosis)']),
 'leiomioma': (6, ['Proliferación benigna de <b>células musculares lisas maduras</b>', 'Núcleos de <b>bordes romos</b>, <b>sin atipia</b>']),
 'condiloma': (7, ['Tejido epitelial de aspecto <b>verrugoso</b>', '<b>Hiperqueratosis</b>, <b>coilocitosis</b>, <b>acantosis</b> y <b>papilomatosis</b>', '<b>Órgano en el laminario Final: vulva</b> (el documento del semestre dice «piel»); proceso: infección / neoplasia benigna']),
 'ca-escamoso-cervix': (9, ['Proliferación maligna en <b>nidos</b> de células escamosas, con <b>escasos puentes intercelulares</b>', '<b>Pleomorfismo</b> marcado; <b>sin queratinización</b>', 'Se identifica <b>invasión linfovascular</b>']),
 'cdis': (10, ['Proliferación ductal maligna <b>in situ</b>', 'Patrones <b>sólido</b>, <b>cribiforme</b> y <b>comedón</b>']),
 'ca-ductal-invasivo': (11, ['Células atípicas en patrón de <b>fila india</b> y bastante <b>desmoplasia</b>', '<b>El laminario Final lo titula «carcinoma infiltrante de mama»</b> (el documento del semestre dice «ductal invasivo»)']),
}

# vistas (stem, título, alt) y atlas por lámina nueva
VISTAS = {
 'bocio': [(fv('bocio', 1), 'Vista Final 1 · folículos con coloide', 'Campo circular de tiroides a bajo aumento: folículos grandes de tamaño variable llenos de coloide rosado homogéneo, con zonas oscuras de color violeta pardo a la izquierda.'),
           (fv('bocio', 2), 'Vista Final 2 · folículos muy grandes', 'Otro campo del mismo corte a mayor aumento: folículos muy grandes de coloide rosado separados por tabiques finos.')],
 'hashimoto': [(fv('hashimoto', 1), 'Vista Final 1 · infiltrado y folículos con coloide', 'Campo circular de tiroides con zonas de infiltrado linfocitario azul violáceo, folículos con coloide rosado y focos de hemorragia roja.'),
               (fv('hashimoto', 2), 'Vista Final 2 · coloide rodeado de linfocitos', 'Campo de tiroides con folículos de coloide rosado rodeados de un infiltrado linfocitario denso.')],
 'adenoma-folicular': [(fv('adenoma-folicular', 1), 'Vista Final 1 · nódulo y banda fibrosa', 'Campo circular: a la izquierda un nódulo celular de folículos pequeños y, a la derecha, una banda de tejido fibroso pálido con vasos.'),
                       (fv('adenoma-folicular', 2), 'Vista Final 2 · borde del nódulo', 'Otro campo del borde del nódulo con folículos pequeños y una banda fibrosa con vasos al lado.'),
                       (fv('adenoma-folicular', 3), 'Vista Final 3 · nódulo muy celular', 'Campo con un nódulo muy celular de folículos diminutos junto a una banda fibrosa en la parte superior.')],
 'ca-papilar': [(fv('ca-papilar', 1), 'Vista Final 1 · papilas y estroma fibroso', 'Campo circular con papilas ramificadas de luces claras y una banda diagonal de estroma fibroso.'),
                (fv('ca-papilar', 2), 'Vista Final 2 · papilas ramificadas', 'Otro campo con papilas ramificadas de luces claras sobre estroma fibroso.'),
                (fv('ca-papilar', 3), 'Vista Final 3 · arquitectura papilar densa', 'Campo con una arquitectura papilar densa de ejes finos.')],
 'endometriosis': [(fv('endometriosis', 1), 'Vista Final 1 · luz y tejido de la pared', 'Campo circular con una luz amplia de contorno irregular a la derecha y estructuras papilares a la izquierda, separadas por una banda de tejido fibroso.'),
                   (fv('endometriosis', 3), 'Vista Final 3 · luz irregular', 'Campo con una luz irregular rodeada de tejido celular en la pared.')],
 'leiomioma': [(fv('leiomioma', 1), 'Vista Final 1 · tejido muscular liso', 'Campo circular de bajo aumento, rosado y homogéneo, de tejido muscular liso.'),
               (fv('leiomioma', 2), 'Vista Final 2 · haces alargados', 'Campo con haces alargados de células musculares y fisuras claras entre ellos.')],
 'condiloma': [(fv('condiloma', 1), 'Vista Final 1 · superficie papilar', 'Campo circular con epitelio escamoso de superficie papilar irregular sobre un estroma con vasos.'),
               (fv('condiloma', 2), 'Vista Final 2 · acantosis y queratina', 'Campo con papilas de epitelio grueso, violeta y acantósico, con queratina en la superficie.'),
               (fv('condiloma', 3), 'Vista Final 3 · borde y vasos', 'Campo con borde de epitelio engrosado con papilas y vasos congestivos en el estroma.')],
 'ca-escamoso-cervix': [(fv('ca-escamoso-cervix', 1), 'Vista Final · campo de mayor aumento', 'Campo de mayor aumento con estroma rosado, células alargadas y un grupo celular en el centro; a este aumento no se resuelven el pleomorfismo ni la queratinización.')],
 'cdis': [(fv('cdis', 1), 'Vista Final 1 · estructuras ductales en grasa', 'Campo con un grupo de estructuras glandulares o ductales rodeado de tejido adiposo y fibroso, con vasos congestivos.'),
          (fv('cdis', 2), 'Vista Final 2 · otro campo', 'Otro campo con un lobulillo de estructuras ductales, tejido adiposo y vasos.')],
 'ca-ductal-invasivo': [(fv('ca-infiltrante', 1), 'Vista Final 1 · tejido graso y fibroso', 'Campo de contraste bajo con tejido adiposo y fibroso y cordones finos de células dispersas.'),
                        (fv('ca-infiltrante', 2), 'Vista Final 2 · otro campo', 'Otro campo de contraste bajo con tejido adiposo y fibroso y cordones finos de células.')],
}
ATLAS = {
 'bocio': (fv('bocio', 1), 'Foto de microscopio de tiroides con folículos grandes llenos de coloide rosado y zonas oscuras de hemorragia a la izquierda.', [
    (45, 45, 'Folículos grandes con coloide', 'Espacios redondeados llenos de material rosado homogéneo: es el coloide, abundante en este bocio.'),
    (16, 28, 'Zona oscura de hemorragia', 'Áreas violeta pardas a la izquierda: son los focos de hemorragia que menciona la ficha del laminario Final.'),
    (50, 70, 'Tabiques finos entre folículos', 'Líneas finas que separan los folículos; el epitelio aplanado de la ficha no se resuelve a este aumento.')]),
 'adenoma-folicular': (fv('adenoma-folicular', 4), 'Foto de microscopio de un nódulo tiroideo de folículos pequeños apretados con varios folículos mayores llenos de coloide.', [
    (35, 43, 'Folículo con coloide', 'Folículo más grande lleno de material rosado homogéneo (coloide).'),
    (64, 57, 'Otro folículo con coloide', 'Segundo folículo grande: el nódulo mezcla folículos de tamaños distintos.'),
    (38, 82, 'Fondo microfolicular', 'Folículos pequeños muy apretados: es el patrón microfolicular de la ficha.')]),
 'ca-papilar': (fv('ca-papilar', 4), 'Foto de microscopio de tiroides con papilas ramificadas que se proyectan hacia luces claras.', [
    (48, 52, 'Papilas centrales con eje fibrovascular', 'Proyecciones en forma de dedo con un eje de tejido conectivo y vasos: es el patrón papilar.'),
    (22, 36, 'Papilas ramificadas del lado izquierdo', 'Frondes que se ramifican hacia el espacio claro; el patrón se repite en todo el campo.'),
    (68, 60, 'Papilas rodeadas de estroma', 'Más papilas con su eje de tejido conectivo, a la derecha del centro.')]),
 'endometriosis': (fv('endometriosis', 2), 'Foto de microscopio con una luz amplia de contorno irregular rodeada de tejido celular denso y luces redondeadas.', [
    (52, 30, 'Luz amplia', 'Cavidad grande de contorno irregular en el centro-izquierda del campo.'),
    (23, 70, 'Luz glandular redondeada', 'Espacio redondeado rodeado de tejido celular: compatible con una glándula.'),
    (78, 40, 'Estroma celular denso', 'Tejido muy celular alrededor de las luces; la hemosiderina de la ficha no se ve con seguridad a este aumento.')]),
 'condiloma': None,   # conserva el atlas de la foto del teléfono (bloque 22)
 'hashimoto': None,
}
# mola hidatiforme: lámina SOLO del laminario Final (no está en los documentos A y B)
MOLA = dict(slug='mola-hidatiforme', area='Sistema reproductor femenino · placenta', organo='Placenta', proceso='Pseudoneoplasia', dx='Mola hidatiforme completa',
    desc=['<b>Vellosidades hidrópicas</b> (hinchadas por líquido)', 'Marcada <b>proliferación trofoblástica circunferencial</b>', 'Formación de <b>cisternas</b>', 'Atipia notable y mitosis aisladas'],
    clave='<b>vellosidades edematosas con cisternas</b> y un borde de trofoblasto que prolifera.', buscar='vellosidades grandes con espacios centrales claros (cisternas) rodeadas de un borde celular violeta.',
    fuente='laminario «Final» (Anatopato II pratica - Final.pdf), pág. 8',
    nota='esta lámina <b>no figura en los dos documentos del semestre</b>; viene solo del laminario Final. El material no trae teoría (cromosomas, clínica, seguimiento): queda pendiente.',
    vistas=[(fv('mola', 1), 'Vista Final · vellosidades con cisternas', 'Campo circular de bajo aumento con vellosidades grandes de centro pálido (cisternas) rodeadas por un borde fino violeta y grupos celulares oscuros entre ellas.')],
    atlas=(fv('mola', 1), 'Foto de microscopio de placenta con vellosidades de centro pálido rodeadas por un borde violeta.', [
        (38, 42, 'Vellosidad edematosa con cisterna', 'Vellosidad grande de centro pálido: el líquido acumulado forma la cisterna.'),
        (70, 72, 'Otra vellosidad edematosa', 'Segunda vellosidad hinchada, abajo a la derecha: el patrón se repite.'),
        (12, 40, 'Borde violeta de la vellosidad', 'Línea violeta que rodea la vellosidad: es el borde de trofoblasto; la ficha habla de proliferación circunferencial.')]))

# lámina nueva dentro del bloque 10: enfermedad celíaca (Final pág. 14 y Laminas P1)
CELIACA = dict(slug='celiaca', area='Sistema digestivo · duodeno', organo='Duodeno', proceso='Inflamación crónica', dx='Enfermedad celíaca · clasificación de Marsh tipo 2',
    desc=['Mucosa duodenal <b>conservada</b>', 'Numerosos <b>linfocitos intraepiteliales</b>', 'Proceso <b>inflamatorio crónico</b> en la lámina propia'],
    clave='<b>vellosidades conservadas</b> con <b>linfocitos dentro del epitelio</b> (Marsh 2).', buscar='vellosidades largas y bien formadas; los linfocitos intraepiteliales se ven a mayor aumento.',
    fuente='laminario «Final», pág. 14; «Lâminas Anatopato P1», pág. 1 (misma descripción)',
    nota='el material trae solo la ficha: <b>no hay teoría</b> de la enfermedad celíaca (causa, serología, tratamiento); queda pendiente. En estas fotos los linfocitos intraepiteliales no se resuelven.',
    vistas=[(fv('celiaca', 1), 'Vista Final 1 · vellosidades', 'Campo circular claro con vellosidades largas y finas, de epitelio violeta, que salen de un eje central.'),
            (fv('celiaca', 2), 'Vista Final 2 · otro campo', 'Otro campo con vellosidades largas cortadas en distintos planos y glándulas en la base.')],
    atlas=(fv('celiaca', 1), 'Foto de microscopio de duodeno con vellosidades largas y finas sobre un fondo claro.', [
        (52, 25, 'Vellosidades largas y finas', 'Dedos de mucosa con epitelio violeta, bien formados: la mucosa está conservada, como dice la ficha.'),
        (44, 52, 'Zona de criptas', 'Zona violeta más densa en la base de las vellosidades, con las glándulas (criptas).'),
        (80, 38, 'Vellosidad ancha de la derecha', 'Vellosidad más ancha, con el centro pálido, del lado derecho: sirve para comparar con las largas y finas del centro.')]))

# lámina nueva dentro del bloque 13: adenoma tubular (P2 pág. 4 y documento B pág. 2)
ADENOMA_TUBULAR = dict(slug='adenoma-tubular', area='Sistema digestivo · colon', organo='Colon', proceso='Neoplasia benigna', dx='Adenoma tubular de colon (bajo grado)',
    desc=['Mucosa colónica <b>polipoide</b> revestida por <b>epitelio displásico</b>', 'Núcleos <b>alargados</b> e <b>hipercromáticos</b>', 'Documento del semestre: <b>pérdida de polaridad</b> y nucléolos prominentes'],
    clave='un <b>pólipo benigno</b> de glándulas con epitelio displásico: lo que puede preceder al adenocarcinoma.', buscar='glándulas tubulares con núcleos alargados y oscuros dentro de un pólipo.',
    fuente='laminario P2 («Anatopato II pratica - P2.pdf»), pág. 4; documento «laminário - 2», pág. 2',
    nota='lámina <b>registrada para el colon</b> (bloques 13 y 14): el material no trae teoría de pólipos ni de la secuencia adenoma-carcinoma. Las vistas del P2 son recortes rectangulares; el fondo no se modificó.',
    vistas=[('lam-p2-adenoma-tubular-1', 'Vista P2 1 · el pólipo', 'Campo circular de bajo aumento con un pólipo de mucosa colónica formado por glándulas tubulares apretadas, sobre fondo claro.'),
            ('lam-p2-adenoma-tubular-2', 'Vista P2 2 · glándulas', 'Campo con glándulas tubulares de colon cortadas en distintos planos, con epitelio violeta, junto a una zona de vellosidades.'),
            ('lam-p2-adenoma-tubular-3', 'Vista P2 3 · epitelio', 'Campo con glándulas alargadas de epitelio violeta y núcleos oscuros alineados.')])

# bloques existentes: vistas adicionales y atlas
EXISTENTES = {
 'ap2pb11': dict(vistas=[(fv('crohn-ileon', 1), 'Vista Final 1 · íleon', 'Campo circular de íleon con mucosa de vellosidades y criptas cortadas en distintos planos, y una luz ramificada.'),
                         (fv('crohn-ileon', 2), 'Vista Final 2 · luz y pared', 'Campo de íleon con una luz clara en el centro, mucosa con criptas regulares a la izquierda y una zona engrosada y muy celular arriba.'),
                         (fv('crohn-ileon', 3), 'Vista Final 3 · agregado linfoide', 'Campo de íleon con una luz clara, mucosa con criptas arriba a la derecha y un agregado linfoide azul oscuro abajo a la izquierda.')],
                 final=('laminario «Final», pág. 15', ['<b>Afectación transmural</b> con células inflamatorias linfocitarias de la mucosa a la serosa', '<b>Distorsión de criptas</b>', '<b>Hiperplasia de células de Paneth</b>', 'Proceso: inflamación crónica <b>granulomatosa</b>'])),
 'ap2pb15': dict(vistas=[(fv('pancreatitis', 1), 'Vista Final 1 · lobulillos y fibrosis', 'Campo circular con lobulillos de acinos violetas entre tejido fibroso rosado y un vaso grande arriba a la izquierda.'),
                         (fv('pancreatitis', 2), 'Vista Final 2 · lobulillo residual', 'Campo con fibrosis rosada, un lobulillo residual abajo a la derecha y un vaso arriba.'),
                         (fv('pancreatitis', 3), 'Vista Final 3 · lobulillos en grupos', 'Campo con grupos de lobulillos residuales sobre un fondo fibroso.'),
                         (fv('pancreatitis-s14', 1), 'Vista diapositiva 14 · lobulillos y conductos', 'Campo circular con lobulillos pancreáticos y conductos dentro de tejido fibroso (diapositiva 14).'),
                         (fv('pancreatitis-s14', 2), 'Vista diapositiva 14 · lobulillos junto a un vaso', 'Campo circular con lobulillos de parénquima y un vaso grande de pared rosada (diapositiva 14).')],
                 atlas=(fv('pancreatitis', 1), 'Foto de microscopio de páncreas con lobulillos violetas entre tejido fibroso rosado y un vaso arriba a la izquierda.', [
                     (80, 28, 'Lobulillo residual de parénquima', 'Grupo de acinos violetas que sobrevive: es el parénquima exocrino que todavía queda.'),
                     (45, 60, 'Fibrosis', 'Tejido rosado pálido que ocupa el lugar del parénquima perdido.'),
                     (13, 22, 'Vaso', 'Vaso de pared rosada gruesa, arriba a la izquierda, rodeado de fibrosis.')]),
                 final=('laminario «Final», pág. 12', ['<b>Atrofia de los acinos serosos</b>', '<b>Hiperplasia de los ductos</b>', '<b>Hipertrofia de los islotes de Langerhans «por fusión»</b>'])),
 'ap2pb16': dict(vistas=[(fv('pancreas-adenoca', 1), 'Vista Final 1 · glándulas con pliegues', 'Campo circular con glándulas de luces irregulares y bordes plegados dentro de un estroma pálido.'),
                         (fv('pancreas-adenoca', 2), 'Vista Final 2 · otro campo', 'Otro campo con glándulas de luces irregulares sobre estroma pálido.')],
                 atlas=(fv('pancreas-adenoca', 1), 'Foto de microscopio de páncreas con glándulas de luces irregulares y plegadas en un estroma pálido.', [
                     (70, 42, 'Luz glandular irregular', 'Espacio claro de contorno anguloso rodeado por epitelio: una glándula tumoral.'),
                     (63, 72, 'Glándulas con pliegues', 'Grupo de glándulas con bordes plegados, abajo a la derecha.'),
                     (30, 30, 'Estroma pálido', 'Tejido laxo y claro entre las glándulas; la desmoplasia no se puede juzgar a este aumento.')]),
                 final=('laminario «Final», pág. 13', ['Proliferación maligna constituida por <b>glándulas con atipia</b>', '<b>Desmoplasia</b> del páncreas exocrino', 'Diagnóstico del Final: adenocarcinoma <b>moderadamente diferenciado</b>'])),
}
