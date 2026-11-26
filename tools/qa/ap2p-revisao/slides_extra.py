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
                ['Clínica', 'Diarrea intermitente con fiebre y dolor abdominal; ~20 % debuta con dolor en fosa ilíaca derecha y fiebre (<b>se confunde con apendicitis</b>); anemia ferropénica; reactivación por estrés, dieta, AINE y tabaquismo']]) +
            '<div class="ap2p-nc"><b>🔎 Fuente:</b> contenido del slide leído en la página manuscrita original; la lista de manifestaciones extraintestinales y la cifra del 20 % son <b>del slide</b>. No hay lámina nueva asociada.</div>\n')
