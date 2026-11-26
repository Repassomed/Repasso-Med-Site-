# AP II Práctica · lo que los slides leídos en la página original agregan a bloques ya escritos (revisión 26/11/2026; sin reescribir el ensino existente).
from bloques_nuevos import comparativo
def b11():
    return ('\n<h3>📌 Lo que agrega el slide 10 de la cátedra</h3>\n'
            '<p>Cuatro ideas del slide (páginas 1–6, leídas en el original) que el bloque no destacaba. Fuente: <code>slide_10_pag_001-004</code> y <code>slide_10_pag_005-006</code>.</p>\n' +
            comparativo('🧭 Crohn · lo que suma el slide', ['Tema', 'Qué dice el slide'], [
                ['Metaplasias de la mucosa', 'Puede aparecer <b>metaplasia seudopilórica</b> (glándulas de tipo gástrico antral) y <b>metaplasia de células de Paneth</b> en el colon izquierdo; estos cambios <b>persisten</b> aunque se resuelva la inflamación activa'],
                ['Granuloma ausente', '<b>La ausencia de granuloma no descarta Crohn</b>; el granuloma puede verse también en regiones no afectadas y en ganglios mesentéricos'],
                ['«Crohn metastásico»', 'Granulomas en <b>ganglios mesentéricos</b> y en la <b>piel</b> (nódulos)'],
                ['Presentaciones extraintestinales', 'Uveítis, poliartritis, <b>sacroilitis</b>, espondilitis anquilosante, eritema nodoso, colangitis y pericolangitis esclerosante; <b>alto riesgo de adenocarcinoma de colon</b>'],
                ['Serología', '<b>ASCA (+)</b> y <b>ANCA (−)</b> en Crohn (regla mnemotécnica del slide)'],
                ['Caso del slide', 'Mujer de 26 años, fumadora, con diarrea intermitente sin sangre, dolor en fosa ilíaca derecha, pérdida de peso, masa palpable y fístula perianal; íleon terminal afectado con <b>lesiones salteadas</b> y aspecto en «empedrado»; en la pieza: <b>engrosamiento fibroso con estenosis</b>, «grasa trepadora», inflamación transmural, fisuras profundas, distorsión de criptas y granulomas no caseificantes en submucosa y ganglios mesentéricos'],
                ['Clínica', 'Diarrea intermitente con fiebre y dolor abdominal; ~20 % debuta con dolor en fosa ilíaca derecha y fiebre (<b>se confunde con apendicitis</b>); anemia ferropénica; reactivación por estrés, dieta, AINE y tabaquismo']]) +
            '<div class="ap2p-nc"><b>🔎 Fuente:</b> contenido del slide leído en la página manuscrita original; la lista de manifestaciones extraintestinales y la cifra del 20 % son <b>del slide</b>. No hay lámina nueva asociada.</div>\n')

def b18():
    return ('\n<h3>📌 Lo que agrega el slide 16 de la cátedra</h3>\n'
            '<p>Fuente: <code>slide_16_pag_001-002</code> a <code>slide_16_pag_004-009</code>, leídas en el original.</p>\n' +
            comparativo('⚖️ Dos riñones crónicos que no hay que mezclar', ['Dato', 'Pielonefritis crónica (la lámina)', 'Glomerulonefritis crónica (el caso del slide)'], [
                ['Qué es', 'Inflamación intersticial y <b>cicatrización</b> del parénquima; puede ser obstructiva o asociada a reflujo vesicoureteral', 'Vía final de varias glomerulopatías: <b>glomeruloesclerosis global difusa</b>'],
                ['Riñones', 'Cicatrices <b>desiguales</b> (heterogéneas), más marcadas en <b>pelvis y cálices deformados</b>; pueden ser uno o los dos', '<b>Simétricos</b>, pequeños, de consistencia firme y <b>superficie finamente granular</b> («grano de cuero»)'],
                ['Microscopía', 'Fibrosis intersticial con infiltrado linfocitario, atrofia tubular con cilindros hialinos («<b>tiroidización</b>»), glomeruloesclerosis y esclerosis vascular', 'Glomérulos hialinizados («fantasmas»), atrofia tubular, fibrosis intersticial, infiltrado mononuclear y esclerosis arteriolar'],
                ['Clínica del slide', '—', 'Hombre de 52 años con hipertensión mal controlada, edema, oliguria, creatinina 5,8 mg/dL, BUN 68, TFGe 11 mL/min, proteinuria no nefrótica, cilindros granulosos y céreos: <b>enfermedad renal terminal</b> (hemodiálisis)']]) +
            '<div class="ap2p-nc"><b>🔎 Fuente:</b> el caso clínico y las preguntas del slide 16 tratan de la <b>glomerulonefritis crónica</b> y no de la pielonefritis de la ficha; la clave de respuestas aclara que la opción de riñones asimétricos con cicatrices en U sobre cálices corresponde a la <b>pielonefritis crónica</b>. Se usa el caso solo como contraste.</div>\n')
