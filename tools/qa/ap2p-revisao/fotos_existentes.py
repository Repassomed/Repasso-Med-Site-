# AP II Práctica · bloques existentes: fotos nuevas de la pasta «Láminas» (24/11/2026) con atlas donde se pudo verificar cada punto a ojo.
from lib_html import view, atlas, fichas_tabla

INTRO = ('<p>Estas fotos vienen de la pasta <b>«Láminas»</b> del Drive de la cátedra. Cada archivo se identifica <b>solo por su nombre</b>; no trae aumento ni escala, '
         'y no se puede asegurar que sea el mismo corte que las vistas de arriba. Tocá una vista para ampliarla.</p>\n')

# bloque -> dict(titulo, area, doc (organo, proceso, desc, dx, pagina), vistas[(slug, titulo, alt)], atlas (slug, alt_base, puntos) | None, leer, buscar, nc, limite)
B = {}

B['ap2pb02'] = dict(
 id='lam-fotos-parotida', titulo='Glándula parótida · adenoma pleomorfo', area='Glándulas salivales',
 doc=('Glándula parótida', 'Neoplasia benigna', 'proliferación benigna <b>mixta</b> de patrón <b>bifásico</b>: componente <b>epitelial</b> (células ductales y mioepiteliales) y <b>estroma mixoide</b>', 'Adenoma pleomorfo de parótida', 'documento «laminário - 2», pág. 2'),
 vistas=[('parotida', 'Vista 4 · cápsula, glándula sana y tumor', 'Foto de microscopio en campo circular: arriba a la derecha, glándula salival normal muy violeta con acinos apretados y espacios de grasa; una banda rosada diagonal (cápsula) la separa del tejido tumoral pálido y laxo de abajo a la izquierda, con luces alargadas de conductos.')],
 atlas=('parotida', 'Foto de microscopio de glándula salival con tumor: glándula normal violeta arriba a la derecha, banda fibrosa rosada diagonal y tejido tumoral pálido abajo a la izquierda.', [
   (65, 25, 'Parótida normal, comprimida', 'Acinos serosos muy basófilos y espacios claros de grasa. Es la referencia sana, pegada a la cápsula: el tumor la empuja, no la invade.'),
   (54, 40, 'Cápsula fibrosa', 'Banda rosada que separa la glándula sana del tumor. La ficha dice «cápsula fibrosa de espesor variable»: en algunos sectores es fina.'),
   (29, 48, 'Estroma mixoide', 'Fondo pálido y laxo donde las células parecen «flotar»: es el componente mixoide del tumor.'),
   (45, 68, 'Luces ductales', 'Conductos del componente epitelial, vistos como luces alargadas y redondeadas dentro del estroma pálido.')]),
 leer='<p><b>Primero la banda rosada diagonal</b>: es la cápsula. A un lado, tejido muy violeta y apretado (<b>glándula sana</b>); al otro, tejido pálido y laxo (<b>tumor</b>). Dentro del tumor buscá el <b>fondo mixoide</b> y las <b>luces de los conductos</b>.</p>',
 buscar='una <b>frontera</b> entre glándula violeta y tejido pálido, con una <b>cápsula</b> en el medio y <b>luces ductales</b> dentro del tumor.',
 nc='<b>Qué muestra y qué no:</b> se ven la cápsula, el estroma pálido y las luces; <b>no</b> se resuelven a este aumento las células mioepiteliales, la hialinización ni los «hialos» de la ficha del Bloque 02.',
 frase='Adenoma pleomorfo = <b>glándula sana + cápsula + tumor pálido mixoide con conductos</b>; el tumor empuja, no infiltra.')

B['ap2pb03'] = dict(
 id='lam-fotos-esofago', titulo='Esófago · adenocarcinoma', area='Sistema digestivo · esófago',
 doc=('Esófago', 'Neoplasia maligna', '<b>metaplasia intestinal</b> con proliferación <b>glandular irregular infiltrativa</b>, que invade <b>submucosa y muscular</b>; células <b>pleomórficas</b>, mitosis y atipias', 'Adenocarcinoma esofágico', 'documento «laminário - 2», pág. 3'),
 vistas=[('esofago-adenoca-2', 'Vista · epitelio escamoso y glándulas irregulares', 'Foto de microscopio en campo circular: arriba, haces rosados de músculo y un epitelio plano estratificado grueso y rosado que bordea una luz blanca; debajo de la luz, glándulas irregulares de contornos angulosos sobre un fondo violeta.'),
         ('esofago-adenoca-1', 'Vista · segunda foto (sin puntos)', 'Foto de microscopio en campo circular de baja definición: tejido inflamado y glandular con epitelio escamoso en el borde inferior y espacios claros; no permite señalar estructuras con seguridad.')],
 atlas=('esofago-adenoca-2', 'Foto de microscopio de esófago: pared muscular arriba, epitelio escamoso grueso, luz y glándulas irregulares debajo.', [
   (46, 29, 'Epitelio escamoso esofágico', 'Epitelio plano estratificado grueso y rosado, a un lado de la luz. Es el revestimiento normal del esófago.'),
   (62, 68, 'Glándulas irregulares', 'Proliferación glandular de contornos angulosos al otro lado de la luz: son las «glándulas irregulares» de la descripción oficial.'),
   (47, 13, 'Capas musculares', 'Haces rosados de músculo en la pared, arriba. La ficha dice que el tumor invade submucosa y muscular propia; <b>en este campo no se demuestra</b> esa invasión.')]),
 leer='<p><b>La luz blanca divide el campo</b>: arriba, el epitelio escamoso (esófago «normal»); abajo, glándulas irregulares. En la <b>segunda foto</b> la definición es baja: se deja como vista, <b>sin puntos</b>, para no señalar lo que no se ve con seguridad.</p>',
 buscar='<b>glándulas</b> donde el esófago normal tendría <b>epitelio plano</b>, con contornos <b>irregulares</b> y células más oscuras.',
 nc='<b>Qué muestra y qué no:</b> se reconocen epitelio escamoso, luz y glándulas irregulares; <b>no</b> se resuelven la metaplasia intestinal, las mitosis ni el pleomorfismo (necesitan mayor aumento).',
 frase='Adenocarcinoma esofágico = <b>glándulas irregulares en un esófago</b>; en el Bloque 03 el antecedente es el esófago de Barrett.')

B['ap2pb05'] = dict(
 id='lam-fotos-gastritis', titulo='Estómago · gastritis crónica', area='Sistema digestivo · estómago',
 doc=('Estómago', 'Inflamación crónica', '<b>atrofia</b> de la mucosa y de las glándulas gástricas, <b>folículos linfoides</b>, ulceración, <b>infiltrado linfocitario</b>, fibrosis y angiogénesis', 'Gastritis crónica', 'documento «laminário_261110», pág. 4'),
 vistas=[('gastritis', 'Vista · mucosa con folículo linfoide', 'Foto de microscopio en campo circular claro: dos porciones de mucosa gástrica violeta, con glándulas en cortes longitudinales, separadas por una zona pálida y laxa con vasos; en la porción derecha, un nódulo azul oscuro de linfocitos.')],
 atlas=('gastritis', 'Foto de microscopio de mucosa gástrica con un nódulo linfoide azul oscuro a la derecha y una zona pálida central.', [
   (69, 44, 'Folículo linfoide', 'Nódulo azul oscuro de linfocitos dentro de la mucosa: es el «folículo linfoide» de la descripción oficial.'),
   (29, 61, 'Glándulas gástricas', 'Mucosa glandular en cortes longitudinales. La <b>atrofia</b> (pérdida de glándulas) no se puede medir en este campo.'),
   (47, 70, 'Zona pálida y laxa', 'Región clara con vasos pequeños entre las dos porciones de mucosa; sirve de contraste con la mucosa celular y violeta.')]),
 leer='<p>Buscá primero el <b>nódulo azul oscuro</b>: es el folículo linfoide, la marca visual de la <b>inflamación crónica</b>. Alrededor, la mucosa con sus glándulas.</p>',
 buscar='un <b>nódulo de linfocitos</b> dentro de la mucosa gástrica, con <b>menos glándulas</b> de lo normal (atrofia).',
 nc='<b>Qué muestra y qué no:</b> se ven el folículo linfoide y la mucosa glandular; <b>no</b> se confirman a este aumento la atrofia, la ulceración, la fibrosis ni la angiogénesis de la ficha.',
 frase='Gastritis crónica = <b>mucosa gástrica con folículos linfoides</b> y glándulas que se pierden.')

B['ap2pb07'] = dict(
 id='lam-fotos-gastrico-intestinal', titulo='Estómago · adenocarcinoma de tipo intestinal', area='Sistema digestivo · estómago',
 doc=('Estómago', 'Neoplasia maligna', 'proliferación neoplásica maligna de <b>patrón glandular</b> que <b>infiltra la capa muscular</b>, con atipias', 'Adenocarcinoma gástrico de tipo intestinal', 'documento «laminário - 2», pág. 4'),
 vistas=[('gastrico-intestinal', 'Vista · glándulas entre haces de músculo', 'Foto de microscopio en campo circular: tejido violeta celular con luces glandulares irregulares y claras, atravesado por haces rosados alargados de músculo liso.')],
 atlas=('gastrico-intestinal', 'Foto de microscopio de pared gástrica con glándulas tumorales irregulares y haces rosados de músculo.', [
   (39, 17, 'Luces glandulares irregulares', 'Espacios claros de contorno angulosos, rodeados por células: son glándulas formadas por el tumor (patrón glandular).'),
   (74, 51, 'Haz de músculo liso', 'Banda rosada alargada de la capa muscular. El tumor se ve <b>rodeándola</b>: así se reconoce que la infiltra.'),
   (45, 45, 'Estroma celular denso', 'Zona violeta, muy celular, entre las glándulas. A este aumento no se pueden juzgar las atipias nucleares.')]),
 leer='<p>Buscá los <b>haces rosados de músculo</b> y fijate en lo que hay <b>entre ellos</b>: glándulas irregulares y células. Si el tumor está entre los haces, <b>infiltra la capa muscular</b>.</p>',
 buscar='<b>glándulas irregulares</b> mezcladas con <b>haces de músculo</b>: el patrón glandular que infiltra la muscular.',
 nc='<b>Qué muestra y qué no:</b> se reconocen glándulas irregulares y músculo; <b>no</b> se resuelven atipias nucleares ni mitosis.',
 frase='Tipo intestinal = <b>glándulas</b> que infiltran la muscular; el tipo difuso (Bloque 06) en cambio da <b>células en anillo de sello</b> sin glándulas.')

B['ap2pb09'] = dict(
 id='lam-fotos-chc', titulo='Hígado · carcinoma hepatocelular', area='Sistema digestivo · hígado',
 doc=('Hígado', 'Neoplasia maligna', 'arquitectura hepática tumoral: <b>hepatocitos neoplásicos en cordones</b>, que forman <b>trabéculas, nidos y pseudoglándulas</b> con contenido proteico, e <b>invasión vascular</b>', 'Carcinoma hepatocelular', 'documento «laminário - 2», pág. 4'),
 vistas=[('chc', 'Vista · campo celular denso', 'Foto de microscopio en campo circular muy violeta: tejido hepático denso y celular, con trabéculas finas y una fenda vascular central; sin estructuras que se puedan señalar con seguridad a este aumento.')],
 atlas=None,
 leer='<p>Esta foto es de <b>bajo detalle</b>: se ve un campo muy celular y trabéculas finas, pero <b>no se resuelven</b> ni el grosor trabecular, ni los nidos ni la invasión vascular. Por eso va <b>sin puntos</b>.</p>',
 buscar='un parénquima <b>muy celular</b> donde los hepatocitos forman <b>cordones</b> más gruesos de lo normal (patrón trabecular).',
 nc='<b>Qué muestra y qué no:</b> solo el aspecto general; el diagnóstico se apoya en las vistas del Bloque 09.',
 frase='Carcinoma hepatocelular = <b>cordones de hepatocitos neoplásicos</b> (trabéculas, nidos, pseudoglándulas) con <b>invasión vascular</b>.')

B['ap2pb10'] = dict(
 id='lam-fotos-duodenitis', titulo='Duodeno · duodenitis crónica', area='Sistema digestivo · intestino delgado',
 doc=('Duodeno', 'Inflamación crónica', '<b>erosión</b> epitelial, <b>atrofia</b> de la mucosa, infiltrado <b>linfoplasmocitario</b> en la lámina propia e <b>hiperplasia de las glándulas de Brunner</b>', 'Duodenitis crónica', 'documento «laminário_261110», pág. 4'),
 vistas=[('duodenitis', 'Vista · luz y glándulas de Brunner', 'Foto de microscopio en campo circular de bajo aumento: en el centro una luz blanca con pliegues y criptas cortadas; alrededor, lóbulos pálidos de aspecto espumoso.')],
 atlas=('duodenitis', 'Foto de microscopio de duodeno a bajo aumento con luz central y lóbulos pálidos alrededor.', [
   (49, 49, 'Luz con pliegues y criptas', 'Centro blanco con el borde plegado de la mucosa: vellosidades y criptas cortadas en distintos planos.'),
   (51, 16, 'Glándulas de Brunner', 'Lóbulos pálidos y espumosos de glándulas mucosas bajo la mucosa: son típicas del duodeno. La ficha describe su <b>hiperplasia</b>.'),
   (64, 35, 'Pliegues con epitelio', 'Borde de la mucosa donde se reconoce el epitelio de superficie; la erosión no se puede confirmar a este aumento.')]),
 leer='<p>Mirá desde el centro hacia afuera: <b>luz</b> con la mucosa plegada y, alrededor, los <b>lóbulos pálidos de Brunner</b>. Si ocupan mucho espacio, hablan de hiperplasia.</p>',
 buscar='<b>glándulas de Brunner</b> prominentes (lóbulos pálidos) alrededor de una mucosa duodenal con signos de inflamación crónica.',
 nc='<b>Qué muestra y qué no:</b> se reconocen luz, pliegues y lóbulos de Brunner; <b>no</b> se resuelven la erosión, la atrofia ni las células plasmáticas de la ficha.',
 frase='Duodenitis crónica = <b>mucosa duodenal inflamada con glándulas de Brunner hiperplásicas</b>.')

B['ap2pb11'] = dict(
 id='lam-fotos-crohn', titulo='Intestino · enfermedad de Crohn', area='Sistema digestivo · intestino delgado',
 doc=('Íleon (intestino delgado)', 'Inflamación crónica', '<b>vellosidades irregulares</b>, <b>criptas distorsionadas</b>, hiperplasia de <b>células de Paneth</b>, <b>granulomas no caseificantes</b> y <b>fisuras transmurales</b>', 'Enfermedad de Crohn', 'documento «laminário_261110», pág. 5'),
 vistas=[('crohn', 'Vista · hendiduras e infiltrado en la pared', 'Foto de microscopio en campo circular: a la izquierda, pared engrosada con infiltrado linfoide denso y dos hendiduras blancas que la penetran; a la derecha, mucosa con criptas bien formadas y, abajo, un agregado linfoide azul oscuro.')],
 atlas=('crohn', 'Foto de microscopio de intestino con hendiduras que penetran la pared, infiltrado linfoide denso y un agregado linfoide abajo.', [
   (30, 44, 'Hendidura que penetra la pared', 'Grieta blanca que se hunde en el espesor de la pared: es compatible con las <b>fisuras</b> de la ficha.'),
   (35, 22, 'Infiltrado linfoide denso', 'Pared engrosada y muy celular, con linfocitos en todo su espesor (aspecto transmural).'),
   (64, 86, 'Agregado linfoide', 'Nódulo azul oscuro de linfocitos, en la base de la mucosa.'),
   (64, 62, 'Mucosa con criptas', 'Criptas alineadas y relativamente conservadas, para comparar con la zona de la izquierda.')]),
 leer='<p>Seguí las <b>hendiduras blancas</b>: entran en la pared y están rodeadas de <b>infiltrado denso</b>. A la derecha tenés mucosa casi normal para comparar: el daño es <b>parcheado</b>.</p>',
 buscar='<b>hendiduras</b> que se hunden en una pared <b>engrosada por linfocitos</b>, junto a zonas de mucosa conservada.',
 nc='<b>Qué muestra y qué no:</b> se ven las hendiduras, el infiltrado y los agregados; <b>no</b> se resuelven granulomas ni células de Paneth (necesitan mayor aumento).',
 frase='Crohn = <b>inflamación que atraviesa la pared</b> con fisuras y agregados linfoides, de forma <b>parcheada</b>.')

B['ap2pb13'] = dict(
 id='lam-fotos-colon', titulo='Colon · adenocarcinoma', area='Sistema digestivo · colon',
 doc=('Colon', 'Neoplasia maligna', 'proliferación glandular maligna que <b>infiltra la capa muscular</b>, con células atípicas, zonas de <b>hemorragia y necrosis</b> (<b>no mucosecretante</b>)', 'Adenocarcinoma de colon no mucosecretante', 'documento «laminário - 2», pág. 4'),
 vistas=[('colon', 'Vista · mucosa normal y zona tumoral', 'Foto de microscopio en campo circular: una pared de colon con mucosa de criptas alineadas y regulares arriba y a la derecha, y una zona violeta más oscura con glándulas irregulares abajo a la izquierda.')],
 atlas=('colon', 'Foto de microscopio de pared de colon con mucosa normal de criptas alineadas y una zona tumoral violeta de glándulas irregulares abajo.', [
   (76, 33, 'Mucosa colónica normal', 'Criptas alineadas, regulares y paralelas, en cortes longitudinales y transversales. Es la referencia sana.'),
   (51, 83, 'Zona tumoral', 'Glándulas de contorno irregular y fondo más oscuro y celular: es el tejido neoplásico.'),
   (36, 79, 'Luz glandular tumoral', 'Espacio claro de forma irregular dentro del tumor: una glándula neoplásica.'),
   (36, 10, 'Pared del colon', 'Bandas rosadas de las capas externas de la pared (muscular y serosa), arriba.')]),
 leer='<p>Compará las dos mitades: <b>criptas ordenadas</b> (sana) contra <b>glándulas irregulares y oscuras</b> (tumor). La frontera entre ambas es lo que el campo enseña.</p>',
 buscar='<b>pérdida del orden</b>: criptas paralelas de un lado y glándulas irregulares, más celulares, del otro.',
 nc='<b>⚠️ Subtipo:</b> el archivo se llama «Adenocarcinoma de colon» y <b>no dice si es mucosecretante o no</b>. Se coloca aquí como vista general y <b>no se usa para enseñar mucina ni necrosis</b>; <b>no</b> se resuelven la hemorragia ni la necrosis de la ficha.',
 frase='Adenocarcinoma de colon = <b>glándulas irregulares</b> que reemplazan las criptas ordenadas; el subtipo (con o sin mucina) lo da el resto de la lámina.')

B['ap2pb15'] = dict(
 id='lam-fotos-pancreatitis', titulo='Páncreas · pancreatitis crónica', area='Sistema digestivo · páncreas',
 doc=('Páncreas', 'Inflamación crónica', '<b>pérdida y atrofia</b> de la porción exocrina (acinos serosos), <b>islotes de Langerhans aumentados</b>, <b>dilatación de los conductos</b>, <b>fibrosis extensa</b>, angiogénesis e infiltrado linfocitario', 'Pancreatitis crónica', 'documento «laminário_261110», pág. 5'),
 vistas=[('pancreatitis', 'Vista · fibrosis y lobulillos residuales', 'Foto de microscopio en campo circular con bordes de artefacto óptico: tejido fibroso rosado pálido con estrías, un vaso o conducto de pared rosada en el centro y lobulillos violetas pequeños de parénquima residual a la derecha.')],
 atlas=None,
 leer='<p>Mirá la <b>proporción</b>: mucho tejido rosado pálido (fibrosis) y pocos <b>lobulillos violetas</b> que quedan. Los bordes de la foto tienen artefacto óptico; no los tomes por tejido.</p>',
 buscar='<b>fibrosis</b> que reemplaza el parénquima y <b>lobulillos pequeños</b> que sobreviven alrededor de conductos.',
 nc='<b>Qué muestra y qué no:</b> solo la proporción fibrosis/parénquima; <b>no</b> se confirman la atrofia de acinos, el tamaño de los islotes, el infiltrado ni la dilatación ductal. Va sin puntos.',
 frase='Pancreatitis crónica = <b>fibrosis extensa y pérdida de acinos</b>; sobreviven pocos lobulillos.')

B['ap2pb16'] = dict(
 id='lam-fotos-pancreas-adenoca', titulo='Páncreas · adenocarcinoma', area='Sistema digestivo · páncreas',
 doc=('Páncreas', 'Neoplasia maligna', 'proliferación neoplásica maligna <b>glandular</b>, <b>atipia marcada</b>, glándulas <b>irregulares</b>, <b>necrosis intraglandular</b> y <b>desmoplasia</b>', 'Adenocarcinoma de páncreas', 'documento «laminário - 2», pág. 4'),
 vistas=[('pancreas-adenoca', 'Vista · glándulas irregulares (contraste bajo)', 'Foto de microscopio en campo circular claro y de bajo contraste: glándulas de luces irregulares y bordes plegados dentro de un estroma pálido.')],
 atlas=None,
 leer='<p>El contraste es bajo: se alcanza a ver <b>glándulas de luz irregular</b> sobre un fondo pálido. No se señalan puntos porque <b>no se distingue</b> con seguridad el estroma desmoplásico ni la necrosis.</p>',
 buscar='<b>luces glandulares irregulares</b> y plegadas, en lugar de los tubos redondos de un páncreas normal.',
 nc='<b>Qué muestra y qué no:</b> solo la forma de las glándulas; <b>no</b> se juzgan atipia, necrosis intraglandular ni desmoplasia.',
 frase='Adenocarcinoma de páncreas = <b>glándulas irregulares rodeadas de estroma fibroso</b> (desmoplasia).')

B['ap2pb17'] = dict(
 id='lam-fotos-wilms', titulo='Riñón · tumor de Wilms (nefroblastoma)', area='Sistema urinario · riñón',
 doc=('Riñón', 'Neoplasia maligna', 'proliferación neoplásica maligna con componentes <b>epiteliales, estromales y blastemales</b>', 'Tumor de Wilms · nefroblastoma', 'documento «laminário - 2», pág. 5'),
 vistas=[('wilms', 'Vista · blastema y estroma', 'Foto de microscopio en campo circular pálido: arriba, zonas densas y muy celulares con estructuras tubulares y glomeruloides pequeñas; abajo, tejido de células fusiformes laxas con espacios.')],
 atlas=None,
 leer='<p>Se distinguen <b>zonas muy celulares</b> (arriba) y <b>tejido fusiforme laxo</b> (abajo). Los tres componentes de la ficha (epitelial, estromal y blastemal) no se pueden delimitar con certeza en esta foto, por eso va <b>sin puntos</b>.</p>',
 buscar='<b>tres tejidos juntos</b>: células pequeñas apretadas (blastema), estructuras tubulares (epitelio) y células fusiformes (estroma).',
 nc='<b>Qué muestra y qué no:</b> solo el aspecto general; la identificación de los tres componentes se apoya en las vistas anotadas del Bloque 17.',
 frase='Tumor de Wilms = <b>blastema + epitelio + estroma</b> en la misma lámina (patrón trifásico).')

B['ap2pb18'] = dict(
 id='lam-fotos-pielonefritis', titulo='Riñón · pielonefritis crónica', area='Sistema urinario · riñón',
 doc=('Riñón', 'Inflamación crónica', '<b>glomérulos esclerosados</b>, <b>tiroidización</b>, atrofia de los túbulos, <b>esclerosis vascular</b>, infiltrado linfocitario, fibrosis y angiogénesis', 'Pielonefritis crónica', 'documento «laminário_261110», pág. 4'),
 vistas=[('pielonefritis', 'Vista · túbulos con material rosado e infiltrado', 'Foto de microscopio en campo circular muy violeta: túbulos redondeados con cilindros rosados en su luz (arriba), áreas azul oscuro de infiltrado linfoide, y a la derecha un vaso de pared gruesa con la luz blanca alargada.')],
 atlas=('pielonefritis', 'Foto de microscopio de riñón con túbulos dilatados llenos de material rosado, infiltrado linfoide denso y un vaso de pared gruesa a la derecha.', [
   (45, 29, 'Túbulos con material rosado', 'Túbulos dilatados con cilindros rosados en la luz: es la <b>tiroidización</b> (se parecen a folículos tiroideos con coloide).'),
   (61, 54, 'Infiltrado linfoide denso', 'Zona azul oscuro de linfocitos entre los túbulos: la inflamación crónica de la ficha.'),
   (82, 63, 'Vaso de pared gruesa', 'Arteria de pared engrosada, compatible con la <b>esclerosis vascular</b> descrita en la ficha.')]),
 leer='<p>Primero los <b>túbulos con material rosado</b> (la tiroidización), después el <b>azul oscuro</b> del infiltrado y por último el <b>vaso de pared gruesa</b>. Tres hallazgos de la ficha en un solo campo.</p>',
 buscar='<b>túbulos que parecen tiroides</b>, <b>linfocitos</b> entre ellos y <b>vasos de pared gruesa</b>.',
 nc='<b>Qué muestra y qué no:</b> se ven la tiroidización, el infiltrado y un vaso engrosado; en este campo <b>no</b> se identifican con seguridad los glomérulos esclerosados. Para el contraste con la glomerulonefritis crónica, el cuadro del Bloque 18 sigue valiendo.',
 frase='Pielonefritis crónica = <b>tiroidización + infiltrado linfocitario + vasos gruesos</b> sobre un riñón con fibrosis.')

def seccion(bid):
    d = B[bid]
    org, proc, desc, dx, pag = d['doc']
    out = ['\n<h3>📷 Más vistas de la lámina · fotos nuevas de la pasta «Láminas»</h3>\n', INTRO]
    out.append(f'<div class="ap2p-lam" id="{d["id"]}">\n  <div class="ap2p-lam-h"><b>{d["titulo"]}</b><span>H&amp;E · foto de microscopio · pasta «Láminas»</span></div>\n  <div class="ap2p-views">\n')
    for slug, t, alt in d['vistas']: out.append(view(slug, t, alt))
    out.append('  </div>\n')
    if d['atlas']:
        s, ab, pts = d['atlas']; out.append(atlas(s, ab, pts))
    out.append(f'  <div class="ap2p-read"><b>👁️ Cómo leer estas vistas</b>\n{d["leer"]}\n  </div>\n')
    out.append('  <div class="ap2p-body">\n')
    out.append(fichas_tabla([('Área', d['area']), ('Órgano', org), ('Proceso', proc), ('Descripción oficial', desc[0].upper() + desc[1:] + '.'), ('Diagnóstico', f'<b>{dx}</b>'), ('Fuente', pag)]))
    out.append(f'    <div class="ap2p-look"><b>👁️ Qué buscar:</b> {d["buscar"]}</div>\n')
    out.append(f'    <div class="ap2p-nc"><b>🔎</b> {d["nc"]}</div>\n')
    out.append(f'    <div class="ap2p-look"><b>⭐ Lo más característico:</b> {d["frase"]}</div>\n')
    out.append('  </div>\n</div>\n')
    return ''.join(out)
