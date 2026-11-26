# AP II Práctica · bloque 24 «Otras láminas del semestre»: láminas de los documentos A y B que no tienen bloque en la secuencia de slides (corazón, pulmón, vaso, hígado, vesícula, páncreas agudo).
# FUENTES: solo documento A (págs. 1–3) y documento B (pág. 7). No hay diapositivas teóricas de estos temas: no se inventa teoría.
from bloques_nuevos import lam, comparativo, bloque, ESTADO
import docs_vistas as DV

A_ = 'documento A «laminário_261110», pág. '
def L(clave_doc, **kw):
    kw['vistas'] = DV.vistas(clave_doc); return kw
L24 = [
 L('hipertrofia-cardiaca', slug='hipertrofia-cardiaca', area='Sistema cardiovascular · corazón', organo='Corazón', proceso='Adaptación · hipertrofia', dx='Hipertrofia cardíaca',
   desc=['<b>Miocardiocitos y núcleos aumentados de tamaño</b>', '<b>Fibroblastos</b> en el intersticio', '<b>Lipofuscina perinuclear</b>'],
   clave='<b>células y núcleos más grandes</b>, con lipofuscina alrededor del núcleo.', buscar='miocardiocitos grandes con núcleos grandes y un pigmento pardo junto al núcleo.', fuente=A_ + '1'),
 L('infarto-agudo-del-miocardio', slug='infarto-miocardio', area='Sistema cardiovascular · corazón', organo='Corazón', proceso='Necrosis coagulativa isquémica', dx='Infarto agudo del miocardio',
   desc=['<b>Miocardiocitos sin núcleo</b> (cariolisis)', '<b>Necrosis</b>', '<b>Infiltrado inflamatorio</b> y zonas de <b>hemorragia</b>'],
   clave='<b>células musculares sin núcleo</b> rodeadas de inflamación y hemorragia.', buscar='fibras musculares rosadas que ya no tienen núcleo, con células inflamatorias entre ellas.', fuente=A_ + '2'),
 L('tuberculosis', slug='tuberculosis', area='Sistema respiratorio · pulmón', organo='Pulmón', proceso='Necrosis caseosa', dx='Tuberculosis',
   desc=['<b>Granuloma caseoso</b> con <b>centro necrótico</b>', '<b>Células epitelioides</b> y <b>células gigantes de Langhans</b>', '<b>Halo de linfocitos</b> y <b>fibroblastos</b>'],
   clave='un <b>granuloma con centro necrótico</b> (caseoso) rodeado de epitelioides, gigantes y linfocitos.', buscar='un nódulo con el centro pálido y necrótico, un borde de células grandes y claras y, afuera, linfocitos.', fuente=A_ + '2 (descripción manuscrita bajo la ficha)',
   nota='la descripción <b>impresa</b> de esta ficha en el documento es la del miocardio (hipertrofia): es un error de la fuente. La descripción de arriba es la <b>manuscrita</b> que figura bajo la ficha, transcrita tal cual. Falta la confirmación de la cátedra.'),
 L('neumonia-en-fase-de-resolucion', slug='neumonia-resolucion', area='Sistema respiratorio · pulmón', organo='Pulmón', proceso='Inflamación aguda', dx='Neumonía en fase de resolución',
   desc=['<b>Alvéolos con arquitectura recuperada</b>', '<b>Pocas células mononucleares y plasmáticas</b> en su interior'],
   clave='los <b>alvéolos ya se ven normales</b> y quedan pocas células inflamatorias.', buscar='alvéolos de pared fina casi vacíos, con unas pocas células mononucleares.', fuente=A_ + '3 (texto leído del documento; la página llegó convertida a imagen)'),
 L('carcinoma-epidermoide-de-celulas-pequenas', slug='ca-celulas-pequenas', area='Sistema respiratorio · pulmón', organo='Pulmón', proceso='Neoplasia maligna', dx='Carcinoma epidermoide de células pequeñas (como lo escribe el documento)',
   desc=['Proliferación neoplásica maligna en el <b>parénquima pulmonar</b>', 'Células atípicas con aspecto de «<b>sal y pimienta</b>»', 'Zonas de <b>necrosis</b>'],
   clave='células atípicas «<b>en sal y pimienta</b>» y necrosis.', buscar='un tumor de células pequeñas y oscuras, con focos de necrosis.', fuente='documento B «laminário - 2», pág. 7',
   nota='el documento escribe «epidermoide de células pequeñas»; no se corrige ni se enseña como término: <b>pendiente</b> de confirmar con la cátedra cómo se nombra esta entidad.'),
 L('aterosclerosis', slug='aterosclerosis', area='Sistema cardiovascular · vaso sanguíneo', organo='Vaso sanguíneo', proceso='Acumulación', dx='Aterosclerosis',
   desc=['<b>Placa de ateroma</b> con <b>cristales de colesterol</b>', '<b>Cápsula fibrosa</b> entre la túnica íntima y la túnica media'],
   clave='una <b>placa con colesterol y cápsula fibrosa</b> en la pared del vaso.', buscar='en la pared, una placa con espacios en forma de aguja (colesterol) cubierta por una cápsula fibrosa.', fuente=A_ + '3 (texto leído del documento; la página llegó convertida a imagen)'),
 L('esteatosis-hepatica', slug='esteatosis', area='Sistema digestivo · hígado', organo='Hígado', proceso='Acumulación · cambio graso', dx='Esteatosis hepática',
   desc=['<b>Parénquima desorganizado</b>', '<b>Hepatocitos cargados de gotitas de grasa</b>', '<b>Núcleos desplazados a la periferia</b>'],
   clave='hepatocitos <b>llenos de grasa</b> con el núcleo empujado a un costado.', buscar='células con espacios redondos y claros en el citoplasma y el núcleo en el borde.', fuente=A_ + '3 (texto leído del documento; la página llegó convertida a imagen)'),
 L('colesterolosis', slug='colesterolosis', area='Sistema digestivo · vesícula biliar', organo='Vesícula biliar', proceso='Acumulación', dx='Colesterolosis',
   desc=['<b>Macrófagos espumosos</b> cargados de colesterol', 'En la <b>lámina propia</b> de la vesícula'],
   clave='<b>macrófagos espumosos</b> con colesterol en la lámina propia.', buscar='bajo el epitelio, células de citoplasma espumoso.', fuente=A_ + '2'),
 L('pancreatitis-aguda', slug='pancreatitis-aguda', area='Sistema digestivo · páncreas', organo='Páncreas', proceso='Necrosis grasa', dx='Pancreatitis aguda',
   desc=['<b>Adipocitos sin núcleo</b>', '<b>Saponificación</b>', '<b>Hemorragia</b> e <b>infiltrado neutrofílico</b>'],
   clave='<b>grasa necrótica saponificada</b> con hemorragia y neutrófilos.', buscar='adipocitos sin núcleo, depósitos y neutrófilos.', fuente=A_ + '2'),
]
COMP24 = comparativo('⚖️ Seis órganos, tres ideas', ['Órgano', 'Lámina', 'Proceso', 'Palabra clave'], [
    ['<b>Corazón</b>', 'Hipertrofia · infarto agudo', 'Adaptación · necrosis coagulativa', 'Células grandes · células sin núcleo'],
    ['<b>Pulmón</b>', 'Tuberculosis · neumonía en resolución · células pequeñas', 'Necrosis caseosa · inflamación aguda · neoplasia', 'Granuloma caseoso · alvéolos recuperados · «sal y pimienta»'],
    ['<b>Vaso</b>', 'Aterosclerosis', 'Acumulación', 'Placa con colesterol y cápsula fibrosa'],
    ['<b>Hígado</b>', 'Esteatosis', 'Acumulación · cambio graso', 'Gotitas de grasa, núcleo periférico'],
    ['<b>Vesícula</b>', 'Colesterolosis', 'Acumulación', 'Macrófagos espumosos'],
    ['<b>Páncreas</b>', 'Pancreatitis aguda', 'Necrosis grasa', 'Saponificación']])
PEND24 = ('el <b>lugar</b> de estas láminas en la secuencia (el semestre las trae fuera de los slides 1–16); teoría de cada tema; <b>confirmación</b> de la descripción manuscrita de la tuberculosis y del nombre «epidermoide de células pequeñas»; foto de la neumonía en resolución y de la aterosclerosis en mejor nitidez.')
def todos():
    return bloque(24, 'OTRAS LÁMINAS', '🧩', 'Otras láminas del semestre · corazón, pulmón, vaso, hígado, vesícula y páncreas agudo', 'Nueve láminas de los documentos A y B que no pertenecen a los bloques anteriores.', ESTADO, COMP24, L24, PEND24)
