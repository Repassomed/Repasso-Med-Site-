# Primeros Auxilios · construcción del resumen y rastreabilidad por slide — 25/11/2026

**Entrega:** `primeros-auxilios.html` (15 bloques, 155 preguntas complementarias, 146 flashcards) + `tools/qa/pa-estructura/pa.test.cjs`. **Archivo inerte:** no se registró la materia en `get-materia.js`, `index.html`, `rm-pilot.js` ni `rm-materia-sistema.js` (áreas críticas; decisión de José). Nada se activó, ningún SQL de escritura.
**Fuentes (única base):** slides del 7.º semestre, carpeta `PrimerosAuxilios` del Drive. **Sin fuentes externas**; las referencias que citan los propios slides (AABB 2023/2025, SSC 2026, CDC, IDSA, AHA 2025, ISMP/OMS) se reproducen solo como las presentan los slides. Doses, umbrales y números figuran «según el slide» y el resumen dice que dependen del protocolo local/MSPBS.
**Leyes:** G0 (voz humana, castellano simple, razonamiento), actualización continua, §8-A (resumen enseña → pregunta cobra; rótulo correcto; gabarito sin patrón; sin negrita que entregue la respuesta).
**Corrige el pack #723:** el `2..pdf` **sí se leyó completo** (100 páginas, 1,6 MB: la descarga completa del Drive funcionó y se extrajo el texto localmente con `pdftotext`). Los bloques ahora son 15 (el B04 «inmovilizaciones» ya tiene fuente: pp. 78–87).

## 1 · Inventario de fuentes y qué se pudo leer
| # | Archivo (id Drive) | PDF | Cómo se leyó | Páginas sin texto extraíble |
|---|---|---|---|---|
| 1 | `1. pdf.pdf` (`1T_gpx2…`) · Dr. A. González | 39 p. | texto del PDF | 2–5, 9, 15, 18 (portadas/separadores o imagen) → **no leídas** |
| 2 | `2..pdf` (`1IDBC--…`) · UCP | 100 p. | texto completo | ninguna con contenido perdido (p. 100 «Gracias») |
| 3 | `3..pdf` (`1IOaTdp…`) · Dr. A. González | 85 p. | texto + lectura del conector | **transfusión/fluidos (pp. 5–8, 10–17, 19–24, 26–32) y «Infecciones quirúrgicas» (pp. 34–37) en imagen → no leídas aquí** (el contenido de transfusión/fluidos se tomó de la Clase 4, que repite la unidad con texto) |
| 4 | `Clase 4 .pdf` (`1Uczv…`) · Dra. G. Ordano | 74 p. | texto completo | 6, 8 (tarjetas de actividad) |
| 5 | `Clase 5.pdf` (`188m_…`) · Dra. G. Ordano | 64 p. | texto completo | 7, 14, 22 (figuras) |
| 6 | `Clase 6 RCP …` (`1o_Q6…`) · Dra. G. Ordano | 37 p. | texto completo | 2–3, 26 (portadas/figuras) |
| 7 | `Clase 7 … IOT` (`1Vq8N…`) · sin docente en el slide | 44 p. | texto completo | 2, 4, 15, 28, 42 (**algoritmo de vía aérea en imagen**), 44 |
**Imágenes dentro de los PDF no se examinaron** (solo texto).

## 2 · Rastreo por bloque (PDF página → bloque)
| Bloque | Fuente y páginas del PDF | Qué se tomó |
|---|---|---|
| 01 Escena, PAS, XABCDE, Glasgow | #1 pp. 6–38 | conceptos, urgencia/emergencia, riesgos, PAS, principios, XABCDE, AVDN, Glasgow (E/V/M, NT), mover, llamada (141/132/911), errores |
| 02 Bioseguridad, asepsia, esterilización | #2 pp. 3–28 | objetivos, bioseguridad (3 principios), asepsia/antisepsia, cadena, 5 momentos, lavado, EPP, esterilización (autoclave/horno/frío), desinfección, Spaulding, indicadores, trazabilidad |
| 03 Estéril e instrumental | #2 pp. 29–43 | empaque, almacenamiento, apertura, campo estéril, 4 familias, cuidado (5 pasos) |
| 04 Curación y clasificación | #2 pp. 44–60, 89 | curar, fases, materiales, 6 pasos, simple/avanzada, infección, factores, mecanismo/contaminación/profundidad, heridas especiales, caso 2 |
| 05 Antisépticos | #2 pp. 61–69 | ideal, familias, alcohol, yodopovidona, clorhexidina, mitos, elección |
| 06 Vendajes e inmovilizaciones | #2 pp. 70–87, 88, 90, 91–95 | venda/técnicas/principios/errores, inmovilización (concepto, indicaciones, materiales, reglas, MMSS/MMII, cabestrillo, control neurovascular), casos 1 y 3, síntesis |
| 07 Hemoterapia | #4 pp. 2–19 (≈ #3 mismas láminas) | ABO/RhD, tabla de compatibilidad, hemocomponentes, umbrales GR/plaquetas/plasma, efecto esperado, hemorragia crítica |
| 08 Reacciones y rol sanitario | #4 pp. 20–26, 38–41 | 7 reacciones, algoritmo de 7 pasos, rol antes/durante/después/prehospitalario, caso 1 |
| 09 Fluidoterapia | #4 pp. 28–35, 42–45 | usos, tabla de fluidos, secuencia 5 pasos, SSC 2026, trauma, caso 2 |
| 10 Tétanos y gangrena | #3 pp. 38–49, 60–63 | fisiopatología, clínica, tabla de profilaxis, TIG 250/500, gangrena, conducta, caso 3 |
| 11 Vías y accesos venosos | #5 pp. 4–27 | principios farmacológicos, vías, técnicas, sitio, calibres, 11 pasos, flebóclisis, complicaciones |
| 12 Cálculo y seguridad | #5 pp. 28–37, 43–45 | 5 fórmulas, ejemplos, 10 correctos, 3 controles, alto riesgo/LASA, error, caso integrador |
| 13 RCP y DEA | #6 pp. 4–37 | reconocer, cadena, RCP de calidad, ventilación, DEA, ritmos, pediatría, trauma, cuándo parar, roles |
| 14 Paro respiratorio y vía aérea | #7 pp. 3–24 | paro, causas, signos, ruidos, posición, empuje, Heimlich, niños, ambú, cánulas, LMA, supraglóticos |
| 15 Intubación, quirúrgica, fármacos | #7 pp. 25–41, 43 | evaluación, preparación, tubo, laringoscopia, confirmación, alternativos, nasotraqueal, complicaciones, crico/traqueostomía, fármacos de ISR |

## 3 · Preguntas y flashcards: cómo se trataron
- **Todas las 155 preguntas son «Pregunta complementaria»**, escritas por el redactor del resumen **después** de que el bloque enseña el contenido. **Ninguna es «Basada en preguntas de examen»**: no existe prueba de la cátedra de esta materia en el material recibido.
- Las **«Repaso rápido»** (#2), las **10 MCQ de «Evaluación final»** (#3, #4, #5) y los **casos clínicos de estaciones** son material de aula, **no de examen**. Su *contenido* se enseña en los bloques y las preguntas se **reformularon** (no se copiaron literalmente); las alternativas se rearmaron y las respuestas se razonaron contra el slide. Los casos aparecen como «CASO» complementario.
- **Gabarito:** a 34 · b 32 · c 27 · d 33 (126 MCQ); V/F 16 verdaderas · 13 falsas. Letra correcta asignada por un sorteo balanceado sin tres iguales seguidas; la explicación no cita letras.
- **Flashcards:** 146, una por idea (definición, cifra, comparación o regla), sin duplicar frentes.

## 4 · Divergencias y límites (para la cátedra)
1. **VIH/inmunodeficiencia grave en la profilaxis antitetánica:** #3 («según esquema; TIG no indicada» en herida limpia; vacuna + TIG 250 UI en sucia) × #5 («según esquema» / «considerar/indicar TIG según guía»). El bloque 10 usa #3 y **registra la diferencia**. Las demás filas coinciden.
2. **Números de emergencia:** el slide #1 da 141 SEME · 132 Bomberos · 911 Policía. En el texto extraído de la Clase 6 **no apareció otro número**; el registro anterior (#723) de «112/911» **no se pudo reconfirmar** → solo se usa lo de #1.
3. **Unidad de hemoterapia duplicada** (#3 Dr. González × #4 Dra. Ordano): el contenido textual es el mismo; se fundió. Confirmar cuál versión manda si la cátedra distingue.
4. **Fuera del resumen:** infecciones de sitio quirúrgico (#3 pp. 34–37, imagen), figuras/tablas en imagen, algoritmo de vía aérea (#7 p. 42), estaciones/rúbricas como actividad, sesión práctica de RCP (se resumieron los criterios técnicos).
5. **Dosis y umbrales** son «según el slide» (AABB, SSC, IDSA, AHA, ISMP). No hay literatura-base de Primeros Auxilios en el Drive; **sin verificación externa**.
6. **Redacción:** voseo suave rioplatense como en Neurología («acordate», «mirá»); si José prefiere neutro, es un cambio de tono, no de contenido.

## 5 · Verificaciones del ejecutor (autoauditoría)
`node tools/qa/pa-estructura/pa.test.cjs` → **761 OK · 0 fallas** (etiquetas balanceadas; 15 bloques con ≥ 8 preguntas y ≥ 7 flashcards; ids únicos; anclas; 4 opciones; respuesta = una opción; opciones sin negrita; V/F coherente con `checkTF`; rótulo complementario; gabarito ≤ 35 % por letra; V/F entre 35 y 65 %; 146 flashcards con frente y dorso; sin scripts ni imágenes; **no registrada en `get-materia.js`**). Mutación probada: el test detecta una respuesta cambiada y una tabla sin cerrar. **No se probó en navegador** (la página no es servible: sin registro).
