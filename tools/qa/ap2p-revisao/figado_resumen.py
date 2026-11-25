# AP II Práctica · bloque 09 (CHC): integración del apunte manuscrito «Anatopato II · Resumen final · Patologías del hígado» (26 págs.; partes resumo_final_pag_001…026).
# Método (Ley de actualización continua): transcripción fiel página a página (scratchpad/notas), contraste con los bloques 08–09, con el slide 08 (consigna del CHC + caso clínico) y con la bibliografía habitual
# de patología hepática; se integra lo pertinente y lo que difiere o no se pudo confirmar queda SEÑALADO como tal. El apunte es complemento: no sustituye la fuente de la cátedra.
from bloques_nuevos import comparativo

FUENTE = ('<b>Fuente:</b> apunte manuscrito «Resumen final · Patologías del hígado» (págs. 3–26), leído página por página, contrastado con los bloques 08–09, el slide 08 y la bibliografía habitual de patología hepática. '
          'Lo que el apunte dice distinto de la bibliografía, o que no se pudo confirmar, está señalado.')

def seccion():
    o = ['\n<h3>🧩 Nódulos y tumores del hígado · el mapa completo</h3>\n',
         '<p>Los bloques 08 y 09 enseñan <b>cirrosis</b> y <b>carcinoma hepatocelular</b>. Acá se completa el mapa con las demás lesiones nodulares del hígado, para poder <b>separarlas</b> en la lámina y en el caso clínico.</p>\n',
         f'<div class="ap2p-nc">{FUENTE}</div>\n']
    o.append(comparativo('🗺️ Seis lesiones, una pregunta: ¿de qué célula viene y puede volverse cáncer?', ['Grupo', 'Lesión', 'Origen', '¿Riesgo de cáncer?', 'Rasgo que la define'], [
        ['Hiperplasia nodular', '<b>Hiperplasia nodular focal</b>', 'Respuesta del hígado a una <b>anomalía vascular local</b>', '<b>No</b>', '<b>Cicatriz central estrellada</b> con arterias anómalas'],
        ['Hiperplasia nodular', '<b>Hiperplasia nodular regenerativa</b>', 'Respuesta a una alteración del flujo sanguíneo, en <b>todo</b> el hígado', '<b>No</b> (puede dar hipertensión portal)', 'Hígado nodular <b>sin fibrosis</b>'],
        ['Neoplasia benigna', '<b>Hemangioma cavernoso</b>', '<b>Vasos sanguíneos</b>', 'No', 'Tumor benigno <b>más frecuente</b> del hígado; canales vasculares'],
        ['Neoplasia benigna', '<b>Adenoma hepático</b>', '<b>Hepatocitos</b>', '<b>Según el subtipo</b> (el de β-catenina, alto)', 'Anticonceptivos o anabolizantes; <b>sin tríadas portales</b>'],
        ['Neoplasia maligna', '<b>Carcinoma hepatocelular</b>', '<b>Hepatocitos</b>', '—', 'Sobre cirrosis o hepatopatía crónica; produce <b>bilis</b>'],
        ['Neoplasia maligna', '<b>Colangiocarcinoma</b>', '<b>Colangiocitos</b> (vías biliares)', '—', 'Adenocarcinoma con <b>desmoplasia</b>; no produce bilis']]))
    o.append(comparativo('🔆 Las dos hiperplasias nodulares', ['Dato', 'Hiperplasia nodular focal', 'Hiperplasia nodular regenerativa'], [
        ['Quién', 'Adultos jóvenes y de mediana edad; más en <b>mujeres de 30–50 años</b> (según el apunte)', 'Asociada a VIH y a enfermedades reumatológicas (LES, artritis reumatoide); la mayoría sin síntomas'],
        ['Qué se ve', 'Lesión <b>localizada, delimitada, mal encapsulada</b>, más clara que el hígado; <b>cicatriz central estrellada</b>, deprimida, blanco-grisácea', 'El hígado entero transformado en nódulos; recuerda la cirrosis micronodular <b>pero sin fibrosis</b>'],
        ['Microscopía', 'En la cicatriz, <b>arterias grandes anómalas</b> con hiperplasia fibromuscular y estrechamiento de la luz; infiltrado linfocítico alrededor de los conductillos biliares', '<b>Hepatocitos tumefactos</b> rodeados de hepatocitos atróficos'],
        ['Por qué', 'Probable lesión vascular congénita o adquirida: el parénquima mal perfundido se colapsa (tabiques) y el hiperperfundido prolifera', 'Alteraciones del flujo: malformaciones arteriovenosas, obliteración inflamatoria o postraumática de ramas de la porta, aumento compensatorio del flujo arterial'],
        ['Riesgo', '<b>No</b> se vuelve cáncer: actividad mitótica muy rara', '<b>No</b>; puede causar <b>hipertensión portal</b> (várices esofágicas)']]))
    o.append(comparativo('🩸 Hemangioma cavernoso', ['Aspecto', 'Qué hay que saber'], [
        ['Macroscopía', 'Nódulo <b>rojo-azulado</b>, blando, <b>bien delimitado</b> y no encapsulado; solitario, a veces múltiple, de superficie esponjosa; suele ser subcapsular'],
        ['Microscopía', '<b>Canales vasculares</b> grandes y dilatados, revestidos por <b>células endoteliales aplanadas</b>, separados por <b>tabiques fibrosos</b> finos'],
        ['Con el tiempo', 'Trombos organizados, esclerosis, <b>hialinización</b> y <b>calcificación</b> (área blanquecina de colágeno denso que indica cronicidad)'],
        ['Clínica', 'La mayoría sin síntomas, hallazgo casual; no se trata (se opera si da síntomas). Importa porque se puede <b>confundir con una metástasis</b>']]))
    o.append(comparativo('🧪 Calcificación patológica: distrófica o metastásica', ['Característica', 'Distrófica', 'Metastásica'], [
        ['Calcio sérico', 'Normal', '<b>Alto</b> (hipercalcemia)'], ['Tejido', '<b>Lesionado</b> (necrosis, tumor, inflamación crónica)', 'Normal'], ['Ejemplo en este bloque', 'Calcificación en un hemangioma antiguo', '—']]))
    o.append(comparativo('💊 Adenoma hepático · tres subtipos', ['Subtipo', 'Alteración', 'Quién / factor', 'Riesgo de malignizar'], [
        ['Con <b>inactivación de HNF1α</b>', 'Mutación inactivadora', '<b>Mujeres</b>, anticonceptivos orales', 'Bajo'],
        ['Con <b>activación de β-catenina</b>', 'Mutación activadora (estimula la proliferación)', 'Hombres y mujeres; <b>esteroides anabolizantes</b> y anticonceptivos', '<b>Alto</b>: es lesión precursora del carcinoma hepatocelular'],
        ['<b>Inflamatorio</b>', '—', 'Hombres y mujeres; asociado a <b>esteatosis no alcohólica</b> (síndrome metabólico: obesidad, dislipidemia, hipertensión, diabetes)', 'Bajo']]))
    o.append('<ul>\n<li><b>Macroscopía:</b> bien delimitado, de borde liso, <b>no encapsulado</b> (subcapsular), más claro que el hígado normal; las masas grandes tienen necrosis y hemorragia; <b>no hay cicatriz central estrellada</b> (esa es la hiperplasia nodular focal).</li>\n'
             '<li><b>Microscopía:</b> sábanas y cordones de células parecidas a hepatocitos normales <b>sin patrón lobulillar</b>: no se reconocen las <b>tríadas portales</b> ni las venas centrales. Puede haber pleomorfismo, binucleación, nucléolos prominentes y pigmento de lipofuscina; mitosis muy raras; produce bilis normal. En el subtipo de β-catenina pueden verse falsas glándulas (patrón seudoglandular).</li>\n'
             '<li><b>Clínica:</b> puede crecer rápido y doler (por presión sobre la cápsula o por necrosis hemorrágica); puede <b>romperse</b> y sangrar dentro del abdomen. Puede <b>regresar</b> si se suspenden las hormonas.</li></ul>\n')
    o.append(comparativo('🎗️ Carcinoma hepatocelular · lo que completa el bloque', ['Tema', 'Qué dice la fuente'], [
        ['Quién y sobre qué', 'Hombres mayores de 60 años; casi siempre sobre <b>hepatopatía crónica</b> (cirrosis → displasia → carcinoma)'],
        ['Factores más frecuentes', '<b>Virus de la hepatitis B y C</b> (el principal), <b>aflatoxina</b> (toxina de <i>Aspergillus</i>) y alcohol; también hemocromatosis hereditaria, déficit de α1-antitripsina, enfermedad de Wilson y síndrome metabólico (obesidad, diabetes, esteatosis no alcohólica)'],
        ['Lesiones precursoras', '① adenoma hepatocelular con β-catenina activada, ② displasia celular en hepatopatías crónicas, ③ nódulos displásicos de la cirrosis. <b>Bajo grado:</b> casi normal, sin atipia pero clonal; pueden o no evolucionar. <b>Alto grado:</b> se pierden la tríada portal y la vena central, hay seudoglándulas y predomina la sangre <b>arterial</b>'],
        ['Diferenciación', 'Si hay <b>bilis</b> (tapones biliares, color verdoso) = bien diferenciado. La <b>binucleación no es atipia</b>; las atipias son anisonucleosis, pleomorfismo, relación núcleo/citoplasma alta, hipercromasia, nucléolos prominentes y mitosis atípicas. Cordones más anchos que los del hígado normal y <b>ausencia de tríadas</b>'],
        ['Macroscopía', 'Masa única grande, nódulos múltiples o forma difusa; aspecto abigarrado: <b>blanco</b> = estroma abundante, <b>amarillo</b> = cambio graso, <b>verde</b> = bilis; a veces nódulos satélites pequeños (metástasis intrahepática)'],
        ['Clínica', '<b>Alfafetoproteína</b> elevada en hasta ~50 % de los avanzados (también marca tumores de testículo y saco vitelino); si destruye vías biliares sube la <b>fosfatasa alcalina</b>'],
        ['Diseminación', 'Invade la <b>vena porta</b> (hipertensión portal) y la <b>cava inferior</b> (compromiso del lado derecho del corazón); la vía vascular también es la de la metástasis a distancia: el <b>pulmón</b> es el sitio más común'],
        ['Mutaciones', 'Activación de β-catenina y inactivación de p53 (el apunte da ~40 % y ~60 %; <b>cifras sin confirmar</b>); la inflamación crónica libera IL-6 y aumenta las mutaciones en hepatocitos en regeneración']]))
    o.append(comparativo('🧭 Colangiocarcinoma', ['Aspecto', 'Qué hay que saber'], [
        ['Origen', '<b>Colangiocitos</b> de las vías biliares intra o extrahepáticas; segundo tumor primario más frecuente del hígado'],
        ['Factores de riesgo', 'Parásitos (<i>Clonorchis</i>, <i>Opisthorchis</i>), <b>colangitis esclerosante primaria</b> (ligada a enfermedad inflamatoria intestinal), hepatolitiasis; riesgo aumentado con hepatitis B y C y esteatosis no alcohólica. Se diagnostica tarde y suele no tener un trastorno previo: <b>mal pronóstico</b>'],
        ['Dónde', '<b>50–60 % perihiliares</b> (tumor de Klatskin, unión de los conductos hepáticos derecho e izquierdo), 20–30 % distales (colédoco), ~10 % intrahepáticos'],
        ['Lesión precursora', '<b>Neoplasia intraepitelial biliar</b> (grados 1 a 3; el 3 es el más maligno)'],
        ['Extrahepático', 'Da <b>obstrucción</b> (ictericia); nódulos infiltrantes difusos o papilares y polipoideos'],
        ['Intrahepático', 'Crece a lo largo del sistema porta; <b>adenocarcinoma</b> bien o moderadamente diferenciado con glándulas o túbulos definidos y <b>desmoplasia</b>; metástasis linfovasculares y perineurales']]))
    o.append('<div class="rmc-note"><b>🫀 Otras dos ideas del apunte:</b> <b>metástasis hepática</b> = varias masas de tamaño variable repartidas por el hígado, sin masa dominante; las grandes tienen necrosis central y aspecto <b>umbilicado</b>; suele subir la fosfatasa alcalina pero no la bilirrubina ni las transaminasas. '
             'Y el <b>hepatoblastoma</b> es el tumor hepático más frecuente de la primera infancia.</div>\n')
    o.append('<div class="ap2p-nc"><b>⚠️ Divergencias y puntos sin confirmar:</b> (1) el apunte dice que la rotura del adenoma «genera una peritonitis»; lo habitual en la bibliografía es <b>hemorragia intraperitoneal (hemoperitoneo)</b>: se enseña así y queda <b>pendiente</b> confirmarlo con la cátedra. '
             '(2) El apunte da tamaño «&gt; 10 cm» para la mayoría de los adenomas: <b>sin confirmar</b>, no se usa como cifra. (3) Los porcentajes de mutación (40 % y 60 %) son del apunte: <b>sin confirmar</b>. '
             '(4) Donde el apunte escribe «VCJ» se leyó <b>vena cava inferior</b>. (5) Estas lesiones <b>no tienen lámina</b> en los documentos del semestre: no hay foto identificada y no se inventó ninguna.</div>\n')
    return ''.join(o)
