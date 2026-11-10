# Anatomía Patológica II (teoría) · #646/#647 · bloque 07 reconstruido (Clase 7) + revisión de los demás bloques

Fecha: 2026-11-06 · Base de trabajo: **PR #640** (`f896d072`, abierta, mismo archivo y mismo bloque) + `main` `7f329241` (merge sin conflicto) · Rama `claude/charming-maxwell-ah7nxj-ap2-646`.
Esta PR **contiene** el trabajo de la #640 (no lo sobrescribe): sus 10 preguntas, sus correcciones de carcinoides y su ensino mínimo siguen intactos; solo se reemplaza la parte de enseñanza del bloque 07 y se **precisa 1 pregunta** (N9, ver §6). **Dependencia:** la #640 debe mergearse antes o junto con esta; si la #640 se cierra sin merge, esta PR la reemplaza por completo.

## 1. Fuentes y versiones

| Fuente | Id Drive | Fecha | Estado |
|---|---|---|---|
| `Clase 7 - Patologías hepáticas.pptx.pdf` en **Slides atualizados** (la que pidió José) | `1SZAjNlvuC_cQp25bc05z00G9QEe4bAaH` | 05/11/2026 22:11 | **fuente principal**, 53 páginas, leída entera (texto + figuras por hoja de contacto; p. 12 y p. 18 a mayor resolución) |
| Mismo archivo, copia en carpeta *Slides* (el link de la issue #646) | `1K8ommCnq5wftMOjsoavO28PKThRX9Xl7` | 05/11/2026 13:21 | **duplicada** de la anterior: texto idéntico en las 53 páginas (solo difiere el orden de lectura del texto de 2 páginas: 4 y 51) → no se releyó figura por figura |
| `Clase 7 - Patologías hepáticas - Nódulos y tumores.pptx.PDF` (versión anterior, 41 p.) | `1392I-s2Bs8g0INrOBVlZnS3M0WqeO0sN` | 04/08/2026 | **sigue vigente** (José: «los slides anteriores continúan válidos»). Aporta lo que la clase nueva no repite: **HNR** (hepatocitos tumefactos, hipertensión portal, VIH y LES, asintomática), metástasis («múltiples», «umbilicado bajo la cápsula»), tomografía de metástasis de colon |
| Material oficial `07 - Cirrosis hepatica.pdf` (P2 práctica) | `1xuTk6tnOoWywuO3gRZoEVgVVVICWoiXh` | — | complemento: tinción tricrómica de Masson, definición de ascitis, «flapping tremor (asterixis)»; parcialmente manuscrito/OCR |
| Robbins / Farreras / Harsh Mohan (bibliografía citada en la p. 2) | — | — | **no consultados** (PDF sin capa de texto, igual que en rondas anteriores); ninguna afirmación se apoya solo en ellos |
| Apuntes de alumnos del Drive | — | — | **no usados** (no son material de cátedra) |

## 2. Matriz página → contenido → decisión → destino (Clase 7 nueva)

| Págs. | Contenido | Decisión | Destino en el bloque 07 |
|---|---|---|---|
| 1–2 | Portada, bibliografía | sin contenido didáctico | — |
| 3 | Hepatopatía alcohólica: 3 formas; cambios desde la zona 3 | **INCLUIR (nuevo)** | §1 (tabla de 3 formas + zona 3) |
| 4–5 | Esteatohepatitis: balonamiento/necrosis, Mallory-Denk (queratina 8 y 18, ubiquitina, inespecífico), reacción neutrofílica; figura histológica | **INCLUIR** | §1 lista de hallazgos; figura no reutilizada (ver §3) |
| 6–8 | Esteatofibrosis: células estrelladas, «alambre de gallinero», tabiques centro-portales, tricrómica, cirrosis micronodular, regresión | **INCLUIR** | §1 «De la inflamación a la cicatriz» + cuadro «¿Se puede volver atrás?» |
| 9 | Cirrosis: definición, 2 rasgos morfológicos | **INCLUIR** | §2.1 |
| 10 | Causas; ≥ 10 años (15–20) | **INCLUIR** | §2.2 (tabla por grupos) |
| 11–12 | Célula estrellada, Kupffer, TNF/TGF-β; figura de fibrogénesis (PDGF, ET-1, MCP-1, TGF-β) | **INCLUIR** | §2.3 + tabla de señales (solo lo legible en la figura) |
| 13 | Colágenos I/III/IV | **INCLUIR** | §2.3 tabla de colágenos |
| 14–15 | Micronodular/macronodular; el patrón no indica etiología | **INCLUIR** | §2.4 |
| 16 | Compensada/descompensada; hígado cirrótico disminuye de tamaño | **INCLUIR** | §2.5 |
| 17 | Laboratorio | **INCLUIR** | §2.6 (con nexo causal didáctico: lo que el hígado fabrica, baja) |
| 18 | Child-Pugh (tabla) | **INCLUIR** (transcrita de la imagen y leída a 110 dpi) | §2.7 |
| 19 | Hiperplasias nodulares: mecanismo (flujo) | MANTENER/MEJORAR | §4 (intro) |
| 20–22 | HNF macro/micro/patogenia/sin riesgo | MANTENER/MEJORAR (desarrollado) | §4.1 |
| 23–27 | Hemangioma cavernoso | MANTENER/MEJORAR (desarrollado) | §5 |
| 28–33 | Adenoma: clínica, 3 subtipos, macro, micro, β-catenina 10–15 % | MANTENER/MEJORAR | §6 |
| 34 | Malignos: primarios/metastásicos, CHC, CCA, hepatoblastoma | MANTENER | §7 |
| 35–36 | Metástasis (orden de la clase: **antes** del CHC) | **REORDENAR** (estaban al final) + completar (FA sin hiperbilirrubinemia, transaminasas) | §7.1 |
| 37–39 | CHC: epidemiología, factores, mutaciones, precursoras | MANTENER/COMPLETAR | §8.1–8.2 |
| 40–48 | CHC: macro, satélites, AFP 50 %, micro, citología, porta/VCI, < 1 año | MANTENER/COMPLETAR (tabla única) | §8.3 |
| 49–52 | Colangiocarcinoma: factores, 50–60/20–30/10 %, Klatskin, macro/micro, desmoplasia, BilIN | MANTENER/COMPLETAR | §9 |
| 53 | Cierre | — | — |

## 3. Figuras de la clase (inventario)
Fotografías macroscópicas y microfotografías de la cátedra (p. 5, 7, 15, 20, 22, 24–27, 30–33, 36, 42–43, 45–48, 52), TC (p. 24), esquema de fibrogénesis (p. 12), tabla de Child-Pugh (p. 18, **transcrita como tabla**) y cuadro de compensada/descompensada (p. 16, transcrito). **No se reutilizaron imágenes de los slides** (misma práctica de las PR anteriores: el contenido se enseña en texto/tabla); las **5 ilustraciones propias del bloque y su esquema SVG se conservaron**, con su caption. Sin errores de la clase que corregir, salvo: la clase atribuye «colágeno IV en los espacios de Disse» mientras que la versión previa del sitio decía «colágeno I y III en el espacio de Disse» → se siguió la clase (ver §6).

## 4. Mapa del contenido anterior (versión de la #640, recuperable en Git) → nuevo
| Antes (bloque 07) | Ahora | Motivo |
|---|---|---|
| Título «Nódulos y tumores hepáticos» | «Patologías del hígado: alcohol, cirrosis y tumores» (bloque, banco, mazo) | la clase nueva abre con alcohol y cirrosis |
| «Desde cero» + §1 «El razonamiento ante un nódulo» | «Desde cero» reescrito (función del hígado + lógica del daño crónico) y §3 «Del hígado al nódulo: el terreno» con las 4 preguntas | la pregunta del terreno exige entender antes la cirrosis; figura 01 y margen conservados |
| §2 benignas (tabla + subtipos de adenoma) | §4 HNF/HNR, §5 hemangioma, §6 adenoma (subtipos en tabla) + «Comparación de las lesiones benignas» (**tabla anterior conservada**) + figura 02 | desarrollo del orden de la clase; la tabla comparativa se mantiene como resumen |
| §3 CHC (tabla, fibrolamelar, figura 04) | §8 CHC: tabla ampliada (todas las filas anteriores + nódulos displásicos, citología, diseminación, AFP 50 %, evolución), fibrolamelar, figura 04 | completar con las p. 37–48 |
| §4 CCA (tabla, BilIN, figura 05) | §9 CCA: tabla con 50–60/20–30/10 %, macro/micro, desmoplasia, BilIN, figura 05 | completar con las p. 49–52 |
| §5 metástasis + 3 confusiones + figura 03 | §7.1 metástasis (antes del CHC, como en la clase); §10 «Cierre: no es solo contar nódulos» con las 3 confusiones + figura 03 | orden de la clase |
| Esquema SVG, cuadro de confusiones, «puntos a dominar» | conservados; cuadro de confusiones 4 → 6 ítems; puntos a dominar 6 → 7; **nueva «Síntesis del bloque»** (tabla de 9 entidades) | síntesis al cierre |
| Frases de voz de examen («hay que enumerar», «hay que conocer», «vale la pena usarlas como método», «Acá va el dato que más sorprende») | **retiradas** | G0 / #646 (sin metadidáctica ni voz de prueba) |
| Línea «Qué es esa cirrosis, en una línea» dentro del CHC | **movida y ampliada** al §2 (cirrosis completa) | duplicaba y ahora se enseña antes |
| «Hipertensión portal sin fibrosis» / VIH / LES (HNR) | **conservado** (confirmado en la clase anterior, p. 9) | — |
| **Fibrolamelar** (jóvenes, sin cirrosis, cicatriz central, mejor pronóstico) | **conservado**; **no figura en ninguna de las dos clases** y el Robbins es ilegible → queda como contenido previo sin confirmación en los slides; ver «revisión humana» | no se borra conocimiento útil por acidente |
| **Exclusiones** | Ningún contenido útil excluido: de 157 términos en negrita del texto anterior, los 23 que ya no aparecen literalmente solo cambiaron de redacción (p. ej. «reacción desmoplásica» → «desmoplasia», «producir bilis» → «fabrican bilis»); verificado | — |

Tamaño del texto de enseñanza (sin figuras): 13,8 → 32,8 mil caracteres (la clase nueva suma 16 páginas de contenido nuevo: alcohol + cirrosis).

## 5. Preguntas y flashcards (8-A)
- **Conservadas las 17 existentes** (5 «Basada en preguntas de examen» + 12 complementarias/variantes/V-F, incl. las 3 de la #640), en bloque y banco.
- **12 preguntas nuevas** (en bloque **y** banco, idénticas): 9 MCQ, 2 V/F, 1 abierta. **Una** («Un paciente con alcoholismo crónico… puentes fibrosos… nódulos… ¿diagnóstico?») se rotula «Basada en preguntas de examen» porque reconstruye el **relato 15 de José** (alcoholismo, puentes fibrosos, nódulos regenerativos; en la #640 había quedado sin pregunta propia por falta de enseñanza); las otras 11 son «Pregunta complementaria». Ninguna se presenta como oficial ni como transcripción.
- **Pendientes de la #640 que cambian de estado:** *foto ítem 3* («Bilirrubina / ascitis» ↔ «Encefalopatía / tasa de protrombina») y *relato 14* («cirrosis descompensada, algo con protrombina»): los dos pares de la foto son parámetros de Child-Pugh y el bloque ahora **enseña** Child-Pugh y descompensación; se agregaron preguntas **complementarias** (Child-Pugh: parámetros y clase C; complicación más frecuente de la descompensada). El **enunciado original sigue sin confirmarse**, por eso no se rotulan como de examen y no se afirma que respondan al ítem de la foto. *Relatos 9 y 11* siguen pendientes.
- **Duplicados evitados** (8-A.1): HNR/hemangioma/adenoma/CHC/CCA/metástasis ya tenían preguntas (b07 #1–#17); no se agregaron variantes de esos temas.
- **Flashcards:** +12 (alcohol, esteatohepatitis, Mallory-Denk, progresión, cirrosis definición/causas/célula estrellada/colágenos/micro-macro/compensada-descompensada/laboratorio/Child-Pugh); bloque 20 → 32, mazo 160 → 172, ruleta igual.
- **Contagens declaradas:** banco 166 → **178** (113 → **114** exame · 53 → **64** variantes · V/F 8 → **10**); bloque 07: 17 → **29**; mazo 160 → **172**.
- **Gabarito (8-A.7):** MCQ 142 → 151, A/B/C/D 36/37/35/34 → **38/38/38/37**; mayor corrida 4 → 4 (preexistente); abcd/dcba 0 → 0. Las 9 MCQ nuevas: d c a a d c b c d.

## 6. Cambio en una pregunta existente (8-A.1-B, con justificativa)
N9 («células estrelladas → colágeno»): el enunciado decía «depositan **en el espacio de Disse**» y la explicación «colágeno I y III en el espacio de Disse» (material de la práctica). La Clase 7 dice **colágeno IV en los espacios de Disse** y **tipo I principal en la fibrosis intensa y en la cirrosis**. Se retiró «en el espacio de Disse» del enunciado y se precisó la explicación (con aclaración de la alternativa a, colágeno IV). Respuesta (c) y posición **sin cambios**; mismo lugar, bloque y banco idénticos. Es la única pregunta modificada.

## 7. Supabase (solo lectura, 06/11/2026)
`anatomia-patologica-ii`: grifos `ap2b01` ×291, `ap2b02` ×1, `ap2b03` ×74, `ap2b04` ×10, `ap2intro` ×2; **`ap2b07`: 0 grifos, 0 notas, 0 trazos** (ningún `anchor_id` del bloque en `user_ink_strokes`/`user_notes`). Como no hay marcaciones en el bloque 07 no hubo bloqueo ni migración. Las seis secciones con grifos quedaron **byte a byte idénticas** (prueba automática). Nada escrito.

## 8. Registro por archivo
| Archivo | Cambio |
|---|---|
| `…/materias-privadas/anatomia-patologica-ii.html` | bloque 07 reconstruido (título, marcador, encabezado, 12 subtítulos incl. «Comparación de las lesiones benignas» y «Síntesis del bloque»), 12 preguntas nuevas, 1 pregunta precisada, 12 flashcards (bloque, mazo, ruleta), banco (grupo 07 y estadísticas), mazo; **resto del archivo intacto** |
| `tools/qa/ap2-646/ap2-646.test.cjs` | prueba estática (96 verificaciones) |
| `tools/qa/ap2-646/ap2-646-browser.cjs` | prueba en navegador (30 verificaciones; escritorio y celular, control y layout nuevo en memoria) |
| `tools/qa/ap2-638/*.cjs` | solo actualizadas las expectativas numéricas (17→29, 166→178, flashcards «≥», redacción de la cobertura) para que sigan siendo pruebas de regresión válidas tras esta PR |
| `docs/layout-ensaio/inventario.json` | solo la línea de la teoría (12 secciones · 356 q · 516 fc) |
| `coordination/source-packs/anatomia-patologica-ii-646-clase7-hepaticas-v1.md` | este registro |

## 9. Límites y pendientes de revisión humana
1. Robbins/Farreras/Harsh Mohan ilegibles: las afirmaciones del bloque se apoyan en los slides de la cátedra (clase nueva + clase anterior) y, para ascitis/Masson/asterixis, en `07 - Cirrosis hepatica`. Dos pasos son **explicación didáctica de fisiología básica no escrita en los slides** (en el cuadro de laboratorio: «lo que el hígado fabrica, baja» para albúmina, protrombina y colesterol; definición de zona 3 como región centrolobulillar): revisar si José quiere mantenerlas.
2. La **variante fibrolamelar del CHC** (jóvenes, sin cirrosis, cicatriz central, mejor pronóstico; pregunta existente b07 #7) no figura en los slides: contenido previo conservado, sin confirmación en fuente permitida.
3. La clase tiene figuras de microscopía que no se copiaron al sitio; si José las quiere como imágenes, es una tarea aparte (derechos/peso).
4. #640 sigue abierta: si José decide **no** mergearla, esta PR ya contiene todo; si la mergea primero, esta PR se actualiza sobre la main sin conflicto esperado (los cambios sobre el mismo bloque ya están integrados).
5. PRs de layout #644/#645 abiertas: esta PR no toca layout, motor, caneta ni scripts globales (solo contenido + `inventario.json`).


---

# PARTE B · Revisión de los demás bloques (b01–b06 y b08) — pedido de continuación (#647)

Método: (1) texto de los slides de cada bloque (los de la pasta Slides/Clases, ya leídos en la revisión #499 y releídos ahora), (2) comparación de secuencia, de hechos y de «voz de prueba» con el HTML real, (3) lectura de Supabase solo lectura **antes** de decidir qué se toca, (4) regla de protección: **todo bloque con grifos reales queda byte a byte intacto**, (5) no rehacer lo que ya estaba bien (los bloques ya traían «Desde cero», tablas, ilustraciones, «puntos a dominar» y flashcards).

**Supabase (SELECT, 06/11/2026, `anatomia-patologica-ii`):** grifos `ap2b01` ×291 · `ap2b02` ×1 · `ap2b03` ×74 · `ap2b04` ×10 · `ap2intro` ×2; **`ap2b05`, `ap2b06`, `ap2b07`, `ap2b08`: 0 grifos**; notas y trazos de toda la materia: 0. Nada escrito.

## Literatura base: intento de lectura y qué sigue sin confirmación
Intentos realizados (todos fallaron por límites técnicos, no por falta de archivo):
1. `read_file_content` sobre Robbins Cotran 9.ª (440 MB, `1usY4aHJ…`) → texto **vacío** (PDF sin capa de texto).
2. `download_file_content` / lectura de recurso del Drive → **rechazado por tamaño** (límite de 10 MB) tanto en Robbins (440 MB) como en Harsh Mohan 6.ª (147 MB, `1V54jb4A…`).
3. Descarga directa de Drive desde la máquina → **403 del proxy** (host no permitido).
4. Búsqueda de texto completo en el Drive por frases de los capítulos → solo aparecen los slides (los libros no están indexados).
5. **Farreras Rozman 19.ª** y **Harrison** (citados en los slides): no están en el Drive. El OCR local (RapidOCR) existe en la máquina, pero no hay forma de traer las páginas.

**Para desbloquear (acción exacta de José):** subir al Drive, como PDF o fotos **de menos de 10 MB cada uno**, los capítulos citados en los slides: Robbins 9.ª — cap. 16 p. 728 (boca) · cap. 17 pp. 753 (esófago), 760 (estómago), 771 (tumores gástricos), 796 (EII), 804 (pólipos y CCR) · cap. 18 pp. 842–867 (hígado) · cap. 24 p. 1082 (tiroides); Harsh Mohan 6.ª cap. 21 p. 619 (hígado); Farreras 19.ª cap. 31 p. 263. Con eso se leen por OCR y se cierran las afirmaciones de abajo. Alternativa: habilitar a esta sesión una credencial de la API de Drive (descarga por rangos).

**Afirmaciones que siguen SIN confirmación en fuente permitida (mantenidas; no se inventó nada):**
- **b01:** afta en mucosa no queratinizada; latencia en ganglio trigémino; Tzanck (células multinucleadas, no distingue VHS-1/2); candidiasis hiperplásica «única con indicación de biopsia»; hifas/levaduras/fibrina/neutrófilos; condutas del adenoma pleomorfo; «menores ≈ 50 %».
- **b02:** Boerhaave; divertículo de Zenker; tipos de hernia hiatal; atresia tipo C 84 %; «pico de pájaro»; protocolo de Seattle; esofagitis eosinofílica; «red wale markings»; «perlas de queratina/puentes intercelulares».
- **b03:** mecanismo somatostatina/gastrina; terapia triple; test del aliento/ureasa; mecanismo vagal de Cushing; Curling; MEN1/diarrea en Zollinger-Ellison; hipoalbuminemia de Ménétrier; carcinoide tipo I. **Divergencia a decidir:** el slide dice que la erosión «no pasa la membrana basal»; el sitio (y 3 preguntas/flashcards) usa «no atraviesa la muscular de la mucosa». Texto y preguntas **protegidos por grifos**; alternativa segura: nota aclaratoria al final del bloque (sin tocar texto con tinta) cuando se confirme en Robbins.
- **b04:** cascada de Correa como nombre y factores (sal/nitrosaminas); Virchow izquierdo; Krukenberg bilateral/anillo de sello; vías de diseminación; CD20, t(11;18), remisión ≈ 80 %; tipos I/II/III del carcinoide; DOG1, PDGFRA, imatinib; cáncer gástrico precoz.
- **b05:** NOD2; p-ANCA/ASCA; tabaco como agravante/protector; vigilancia colonoscópica. (Granuloma: el deck «Clase 5» dice 40–60 %, el deck de la pasta Slides ≈ 35 %; el bloque evita el número: «una parte de los casos».)
- **b06:** SMAD4/BMPR1A; intususcepción; «adenoma avanzado ≥ 10 mm»; BRAF → CIMP; Lynch/MLH1; asociación MSI-derecho/APC-izquierdo; «carcinoma = cruzar la muscular de la mucosa».
- **b07/b08:** fibrolamelar; criterios nucleares del papilar distintos del «vidrio esmerilado» (superposición, surcos, pseudoinclusiones); «la PAAF estudia células, no la cápsula»; bocio coloide/multinodular como «ciclos de hiperplasia e involución».

## Resumen por bloque
| Bloque | Ya estaba adecuado | Qué cambió en esta PR | Pendiente / bloqueo | Fuentes | Pruebas |
|---|---|---|---|---|---|
| **01 · Boca y glándulas salivales** (`ap2b01`, 291 grifos) | Estructura «Desde cero» + 6 secciones en el orden del deck, tablas, 11 imágenes, síntesis y flashcards; ya revisado frente a los 42 slides en la #499 | **Nada** (byte a byte idéntico) | Restos de voz de prueba **bajo grifo** (10 menciones: «examen», «se pregunta», «cátedra», «parcial»): **bloqueado**: tocarlos destruye marcas de alumnos. Alternativa: migrar grifos con script de reubicación (propuesta; requiere escritura en producción, que no se ejecuta) y luego reescribir esas frases | `1 - Patologías de la cavidad oral.pdf`, `Clase 1` | prueba estática: sección idéntica a la #640 |
| **02 · Esófago** (`ap2b02`, 1 grifo) | Orden del deck (acalasia → várices/desgarros → esofagitis → Barrett → cáncer), figuras, puntos a dominar, flashcards con mnemotecnias | **Nada** | Dejé fuera una frase de síntomas respiratorios por broncoaspiración en acalasia: aporte menor frente al riesgo de reanclar el grifo («con disfagia progresiva»). No confirmadas: ver lista | `2 - Patologías del esófago.pdf`, `Clase 2` | idéntico |
| **03 · Estómago I** (`ap2b03`, 74 grifos) | Orden del deck, tabla gastropatía/gastritis, flashcards | **Nada** | 2 frases de voz de prueba bajo grifo («La regla de examen…», «Ése es el sello…»); divergencia erosión (ver arriba): **bloqueado por grifos** | `3 - Patologías del estómago.pdf` | idéntico |
| **04 · Tumores gástricos** (`ap2b04`, 10 grifos) | Lauren/Borrmann/diseminación/no epiteliales, ya depurado en la #640 (carcinoides) | **Nada** | Ver lista de no confirmadas | `Clase 4 – Tumores` | idéntico |
| **05 · EII** (sin grifos) | Mecanismo común, Crohn, CU, tabla comparativa final (ya cumple la función de síntesis), 4 ilustraciones | **+ epidemiología y teoría de la higiene; distribución 40/30/30 %; fisuras/trayectos y grasa serpiginosa; microscopía (neutrófilos, absceso críptico, metaplasias seudopilórica y de Paneth, persistencia y atrofia); colon → anemia ferropénica, delgado extenso → hipoalbuminemia y malabsorción, fisura anal; dedos en palillo de tambor, pericolangitis, riesgo de cáncer; CU: transición brusca, úlceras de base ancha, mucosa atrófica, microscopía, curso y desencadenantes. +1 pregunta y +2 flashcards.** Todo el texto anterior se conserva | Granuloma: dos versiones del deck discrepan (40–60 % vs ≈ 35 %); no se escribió el número | `Clase 5 – Patologías del intestino`, deck de Slides | estático 111/111 (b05: nada del texto anterior se perdió) |
| **06 · Pólipos y CCR** (sin grifos) | Ya recorre todo el deck (clasificación, hiperplásico, inflamatorio, juvenil, Peutz-Jeghers, adenomas, PAF, vías moleculares, derecho vs izquierdo, desmoplasia), con 5 ilustraciones y confusiones | **Nada**: comparación con el deck sin lagunas materiales | Ver lista de no confirmadas | `6 - Patologias del Intestino - Pólipos.pdf` | idéntico |
| **07 · Hígado** | — | **Reconstruido** (Parte A) | fibrolamelar | Clase 7 (2 versiones) + Clase 7 anterior + `07 - Cirrosis` | estático + navegador |
| **08 · Tiroides** (sin grifos) | Anatomía previa, 4 tiroiditis, folicular/papilar/medular/anaplásico, figuras, confusiones | **Orden de la Clase 8** (tiroiditis → Graves → neoplasias → adenoma/folicular → papilar → anaplásico → medular); **nueva sección «Neoplasias tiroideas: el nódulo solitario»** (criterios clínicos, < 10 %, 10:1, PAAF, tabla de los 4 carcinomas con frecuencia, origen y genética); patogenia/clínica de Hashimoto, De Quervain, indolora y Riedel; cuadro completo de Graves; adenoma tóxico (TSHR/GNAS), adenoma y carcinoma folicular (yodo, 3:1, 40–60 años, fríos); papilar (edad, radiación, «vidrio esmerilado», ½ con ganglios); anaplásico (¼ con carcinoma previo, tipos de células) y medular (serotonina, ACTH, VIP, MEN-2A/2B y familiar). Retiradas 2 frases de voz de prueba («dato que hay que subrayar», «pregunta segura»). **+2 preguntas, +3 flashcards.** | Criterios nucleares extra del papilar sin confirmación | `Clase 8 – Patologías tiroideas` | estático 111/111; navegador 30/30; 40 términos de cobertura |

**Exclusiones justificadas (b05/b08):** ninguna de contenido útil. Solo se cambió la redacción de 2 frases de voz de prueba en b08 y se reordenaron secciones (el texto se conserva: probado frase por frase).

## Recuento final declarado (teoría)
Banco **181** (114 examen · 67 variantes · 10 V/F): b05 = 19 · b07 = 29 · b08 = 17; mazo **177** tarjetas (bloques = mazo = ruleta). MCQ 154: A/B/C/D 39/39/38/38, corrida máxima 4 (preexistente), abcd/dcba 0. Imágenes y SVG: **idénticos**; ningún id de sección cambia; ninguna pregunta ni flashcard retirada.


---

# PARTE C · #651 · P2 Chamorro: gabaritos 6E (filas 1–3) y fila 1 sin rótulo — matriz y decisiones (09/11/2026)

## C.1 Fuentes y lectura de las imágenes
| Imagen | Id Drive | Qué es (leído a 2× y confirmado) |
|---|---|---|
| **Imagen 1** | `1qBuVnYkS48fPHHGZ9VhMXg1DyJlisEuG` | **6.º E · Fila 1, Fila 2 y Fila 3** (tres hojas; 11 respuestas escritas + letras de los ítems 12–17 por fila) |
| **Imagen 2** | `1r6SwQguU0F9SUVAYNa4_dXNpUaMLPbFp` | **«Fila 1» sin rótulo de turno** (otra versión del examen; la issue habla de 6E/6G: **no se puede afirmar que sea 6G**; es distinta de la foto «6H filas 1 y 2» de la #638). 11 respuestas escritas + letras 12–17 |
Relatos: issue **#651** (sin comentarios) y **#638**. Supabase: ver C.5. Fuentes de contenido: slides de la cátedra (Clase 4 tumores gástricos, 5 intestino, 6 pólipos, 7 hígado ×2); libros: **ilegibles** (ver Parte B).

**Transcripción 6E.** Fila 1: 1 infiltrado de neutrófilos + cuerpo de Mallory-Denk · 2 atrofia difusa + metaplasia intestinal · 3 seudopólipos + úlceras de base ancha · 4 localización · 5 células estrelladas · 6 granuloma no caseificante · 7 pared rígida y engrosada + pérdida de pliegues · 8 célula en anillo de sello + desmoplasia · 9 displasia · 10 linfocitos T · 11 infección por *Helicobacter pylori* · letras 12 B · 13 C · 14 B · 15 A · 16 d · 17 d (18–20 tachados). **Fila 2:** 1 = células estrelladas · 2 = granuloma · 3 = localización · 4 = «ver 1 (fila 1)» · 5 = «ver 3 (fila 1)» · 6 = «ver 2 (fila 1)» · 7 = linfocitos T · 8 = *H. pylori* · 9 = displasia · 10 = «ver 7» · 11 = «ver 8» · letras 12 C · 13 B · 14 d · 15 A · 16 B · 17 C. **Fila 3:** 1 = «ver 7» · 2 = «ver 8» · 3 = «ver 3» · 4 = «ver 1» · 5 = «ver 2» · 6 = granuloma · 7 = localización · 8 = células estrelladas · 9 = *H. pylori* · 10 = displasia · 11 = linfocitos T · letras 12 d · 13 b · 14 c · 15 c · 16 A · 17 B. Las remisiones «ver N» **coinciden** con el contenido de la fila 1: son las mismas 11 preguntas reordenadas (verificado fila por fila).
**Transcripción imagen 2 (fila 1).** 1 cromatina moteada + citoplasma escaso · 2 pólipos hamartomatosos en intestino delgado + hiperpigmentación mucocutánea · 3 metaplasia seudopilórica + de células de Paneth · 4 úlceras aftosas · 5 vellosa · 6 miofibroblasto · 7 nula/carece (riesgo) + colon izquierdo (localización) · 8 acumulación de células absortivas y caliciformes que dan aspecto serrado · 9 alfafetoproteína · 10 fusiformes + epitelioides · 11 pericolangitis + colangitis esclerosante primaria · letras 12 A · 13 d · 14 C · 15 B · 16 B · 17 A. (El «7» está tapado por la escritura; se lee por el contenido: riesgo y localización del hiperplásico.)
**Regla de letras (8-A.5-A):** las letras 12–17 de las **cuatro** filas de estas dos imágenes se registran como dato estructural y **no se asocian a ninguna pregunta**: faltan enunciados y alternativas, y las filas barajan las opciones.

## C.2 Matriz de las respuestas escritas (estado por ítem)
**Leyenda del estado:** **main** = ya estaba en `main` (`7f329241`) · **#640** = vino con la #640 (base de la #648; no está en main) · **#648** = acrescentada en la #648 (rondas #646/#647/#651) · **PENDIENTE** = sin enunciado reconstruible. Las preguntas no tienen id: se identifican por bloque + posición dentro del bloque (`ap2b05 #17`). «NUEVA #651» = rótulo «Basada en preguntas de examen», enunciado **reconstruido** del relato + respuesta escrita (**no** es transcripción ni oficial).
**Regla de asociación:** solo se usó (a) el **contenido** de la respuesta escrita y (b) las remisiones «ver N» **que la propia foto 6E escribe** (fila 2 y 3 → fila 1). **No** se asoció ninguna letra, ni ningún número entre fotos o entre filas de fotos distintas (6E ↔ imagen 2 ↔ 6H de la #638); los vínculos entre fotos que aparecen abajo son por contenido y están marcados como hipótesis cuando corresponde.
| Ítem (imagen) | Pregunta | Estado | Bloque y nº | Respuesta específica esperada | ¿La respuesta pide esos puntos? / Pendiente |
|---|---|---|---|---|---|
| 6E f1·1 (f2·4, f3·4) | Alteraciones histológicas de la hepatitis alcohólica | **#648 (NUEVA #651)** | `ap2b07` #30 | infiltrado de neutrófilos + cuerpos de Mallory-Denk | Sí (los dos en negrita; balonamiento/necrosis aceptados). Antes: solo la MCQ #20 (Mallory-Denk), que no pedía «dos hallazgos» |
| 6E f1·2 | Alteraciones epiteliales de la gastritis crónica | contenido en **main** (b03 #22, #9) | `ap2b03` | atrofia difusa + metaplasia intestinal | **PENDIENTE**: el enunciado no es reconstruible (relato: «alterações epiteliais, atrofia, metaplasia intestinal, células inflamatórias, anemia»; «difusa» sugiere la autoinmune). b03 tiene 74 grifos: no se tocó. Propuesta lista para cuando José confirme: «Citá dos alteraciones epiteliales de la gastritis crónica» → atrofia (difusa en la autoinmune, multifocal en *H. pylori*) + metaplasia intestinal (ya enseñado) |
| 6E f1·3 (f2·5, f3·3) | 2 hallazgos macroscópicos de la CU | **#640** (`ap2b05` #17); respuesta **ajustada en la #648** | `ap2b05` #17 | seudopólipos + úlceras de base ancha | Ahora la respuesta **abre** con esos dos puntos; acepta además continuidad desde el recto, mucosa atrófica y pared sin engrosamiento |
| 6E f1·4 (f2·3, f3·7) «localización» | Factor pronóstico del carcinoide | **#648 (NUEVA #651)** | `ap2b04` #19 | la localización (sin decidir cada caso) | Sí. **Hipótesis fuerte, no certeza** (relato #638 nº 12 y #651); Clase 4: «el factor pronóstico más importante es su localización» |
| 6E f1·5 (f2·1, f3·8) · img2·6 | Célula del depósito de cicatriz / en qué se transforma | **#648 (NUEVA #651)** | `ap2b07` #31 | células estrelladas → miofibroblasto | Sí. Cubiertos además: colágeno (#17, **#640**), TGF-β/Kupffer (#23, #648), puentes y nódulos (#18, #648) |
| 6E f1·6 (f2·2, f3·6) | Hallazgo microscópico de Crohn | contenido en **main** (`ap2b05` #5, #2, #14) | `ap2b05` | granuloma no caseificante | Enunciado original desconocido; contenido cubierto, no se duplica |
| 6E f1·7 (f2·10, f3·1) | Macroscopía del carcinoma gástrico difuso | **#648 (NUEVA #651)** | `ap2b04` #21 | pared rígida y engrosada + pérdida de pliegues | Sí (Clase 4: «aplanamiento difuso de las rugosidades y pared rígida y engrosada»; figura «pérdida de pliegues»). Antes la viñeta #2 (main) no exigía los dos puntos |
| 6E f1·8 (f2·11, f3·2) | Microscopía del difuso | **#648 (NUEVA #651)** | `ap2b04` #22 | células en anillo de sello + desmoplasia | Sí |
| 6E f1·9 (f2·9, f3·10) «displasia» | Lesión premaligna | **main** (`ap2b07` #10 BilIN; `ap2b03` #9, #22) | — | displasia | **Ambiguo** (colangiocarcinoma o gastritis): ambos cubiertos; no se creó pregunta nueva |
| 6E f1·10 (f2·7, f3·11) «linfocitos T» | Célula efectora de la gastritis autoinmune | contenido en **main** (`ap2b03` #6, #7) | — | linfocitos T (CD4+) | **PENDIENTE** (enunciado no reconstruible; b03 protegido) |
| 6E f1·11 (f2·8, f3·9) | Causa de la gastritis crónica | contenido en **main** (`ap2b03` #5, #16, #22) | — | infección por *H. pylori* | **PENDIENTE** (enunciado no reconstruible; b03 protegido) |
| Img2·1 | Microscopía del carcinoide | **#648 (NUEVA #651)** | `ap2b04` #20 | cromatina moteada («sal y pimienta») + citoplasma escaso | Sí (Clase 4: «citoplasma granular rosa escaso … cromatina moteada»); acepta además cromogranina A/sinaptofisina |
| Img2·2 | Criterios del Peutz-Jeghers | **#648 (NUEVA #651)** | `ap2b06` #17 | pólipos hamartomatosos en delgado + hiperpigmentación mucocutánea | Sí; el slide agrega «antecedentes familiares» (aceptado). La viñeta #2 ya estaba en **main** |
| Img2·3 | Metaplasias de Crohn | **#648 (NUEVA #651)** | `ap2b05` #20 | seudopilórica + células de Paneth | Sí (Clase 5; colon izquierdo) |
| Img2·4 | Lesiones iniciales de Crohn | **main** (`ap2b05` #6) | — | úlceras aftosas | No se duplica (la secuencia aftosa → serpiginosa → empedrado ya lo exige) |
| Img2·5 «vellosa» | Pólipo velloso (relato) | **PENDIENTE** | contenido: `ap2b06` #8, #16 (**main**) | velloso | Enunciado desconocido. El bloque enseña que el factor que más se correlaciona con el riesgo es el **tamaño** y que el velloso lo acompaña: una pregunta «¿cuál tiene más riesgo?» chocaría con eso; no se inventó |
| Img2·7 | Hiperplásico: riesgo y localización | **#648 (NUEVA #651)**, **revisada** | `ap2b06` #18 | **carece de potencial maligno** (formulación de la cátedra) + colon izquierdo | Sí. Ver C.6 |
| Img2·8 | Microscopía serrada del hiperplásico | **#648 (NUEVA #651)** | `ap2b06` #19 | acumulación de células absortivas y caliciformes | Sí (Clase 6) |
| Img2·9 | Marcador del CHC | **main** (`ap2b07` #6); mutaciones **#640** (#15) | — | alfafetoproteína | Sí |
| Img2·10 | Patrones celulares del GIST | **#648 (NUEVA #651)** | `ap2b04` #23 | fusiformes + epitelioides | Sí (Clase 4); célula de origen: #17 (**#640**) |
| Img2·11 | Extraintestinales de la CU | **#640** (`ap2b05` #15) + **#648** (acepta pericolangitis) y #9 (**main**, CEP) | `ap2b05` | pericolangitis + colangitis esclerosante primaria | Sí: #15 acepta ambas listas (uveítis/poliartritis y pericolangitis/CEP) |

## C.3 Relatos de la #651 (estado)
| Relato | Estado | Dónde |
|---|---|---|
| CHC: 2 mutaciones; marcador | mutaciones **#640** (`ap2b07` #15) · marcador **main** (#6) | existe |
| Crohn: distribución y grosor | **#640** (`ap2b05` #16) | existe |
| Crohn: inflamación transmural, granulomas | **main** (#1, #5, #14, #2) | existe |
| Crohn: manifestaciones, fístula perianal | extraintestinales **#640** (#15); fístulas **main** (#14 V/F, #18 respuesta acepta «fístulas, fisura anal») | existe; sin ítem propio en las fotos |
| Crohn: metaplasias seudopilórica y de Paneth | **#648** (`ap2b05` #20) | acrescentada |
| Crohn: úlceras aftosas | **main** (#6) | existe |
| CU: 2 macro | **#640** (#17), ajustada en #648 | existe |
| CU: extraintestinales, pericolangitis/CEP | **#640** (#15) + **main** (#9) | existe, ampliada |
| CU: megacolon tóxico | **main** (#4) | existe |
| Carcinoide: 2 enfermedades | **#640** (`ap2b04` #16) | existe |
| Carcinoide: factor pronóstico, microscopía | **#648** (`ap2b04` #19, #20) | acrescentadas |
| Colangiocarcinoma: lesión precursora y grado | **main** (`ap2b07` #10) | existe |
| Linfoma gástrico DD / riesgo MALT | **main** (`ap2b04` #5, #13, #14) | existe |
| GIST CD117: célula de origen | **#640** (#17) | existe |
| GIST: fusiformes/epitelioides; agravantes | **#648** (#23); agravantes (tamaño, índice mitótico) enseñados en el bloque | acrescentada |
| Mujer de 22 años con SOP, masa sólida | **PENDIENTE** (órgano y opciones no determinables; el adenoma/ACO ya está en `ap2b07` #2, **main**) | — |
| Dolor cólico, úlceras y zonas normales, abscesos crípticos | **PENDIENTE** (la manifestación no es determinable: los abscesos crípticos existen en CU y Crohn) | — |
| Cirrosis y hepatitis alcohólica: estrelladas/miofibroblastos, TGF-β, colágeno, puentes/nódulos, parámetros de gravedad, neutrófilos y Mallory-Denk | colágeno **#640**; el resto **#648** (`ap2b07` #18, #20, #23, #26–#28, #30, #31) | acrescentadas |
| Gastritis crónica (epitelio, atrofia, metaplasia, inflamatorias, anemia); *H. pylori* | **main** (`ap2b03`); ver pendientes de C.2 | parcial |
| Cáncer difuso/linitis: macro y micro; Lauren | linitis viñeta y Lauren **main** (`ap2b04` #1, #2); macro y micro **#648** (#21, #22) | acrescentadas |
| Masa hepática con cicatriz central; anticonceptivo → adenoma | **main** (`ap2b07` #3, #2) | existe |
| Pólipos hiperplásicos: riesgo, localización, serrado; Peutz-Jeghers; velloso | hiperplásico y PJ criterios **#648** (`ap2b06` #17–#19); viñetas **main**; **velloso PENDIENTE** | parcial |

## C.4 Cambios y decisiones
- **+11 preguntas** (todas abiertas, rótulo «Basada en preguntas de examen», en bloque **y** banco, idénticas): `ap2b07` +2 (29 → 31), `ap2b04` +5 (18 → 23), `ap2b05` +1 (19 → 20), `ap2b06` +3 (16 → 19). Banco **181 → 192** (exame 114 → **125**, variantes 67, V/F 10). Sin MCQ nuevas: la serie de letras (8-A.7) no cambia.
- **Enseñanza previa mínima en b04 (protegido por grifos):** dos inserciones, ambas **respaldadas por la Clase 4**: «pérdida de los pliegues» (linitis) y «citoplasma escaso / cromatina moteada» (carcinoide). Se verificó por posición que los 10 grifos conservan **la misma ocurrencia y el mismo contexto**; las inserciones no contienen «ulcerada» (único grifo posterior a ellas).
- **Mejoras de preguntas existentes (8-A.1-B, mismo lugar, bloque y banco idénticos):** `ap2b05` #15 acepta «pericolangitis»; `ap2b05` #17 (CU macro) ahora **abre** con los dos puntos de la foto (seudopólipos + úlceras de base ancha) y conserva los demás como aceptados.
- **No duplicadas:** E3, E6, Img2·4, Img2·9 y Img2·11 ya estaban cubiertas.
- **Divergencias con fuentes:** ninguna entre el gabarito de la profesora y los slides en los ítems agregados; las que quedan sin cotejo con libro son las de la Parte B. **Duda registrada:** identidad del ítem «localización» y de «displasia»/«linfocitos T»/*H. pylori* (enunciados no recuperables).
- Sin flashcards nuevas (los 11 puntos ya están en flashcards o en el texto del bloque).

## C.5 Supabase (solo lectura, 09/11 y 10/11/2026)
Antes de modificar b04 (09/11) y de la ronda de b05/b06 (10/11) se releyó la materia: grifos `ap2b01` 291 · `ap2b02` 1 · `ap2b03` 74 · `ap2b04` 10 (mismos textos que el 06/11) · `ap2intro` 2; `ap2b05`–`ap2b08`: 0; notas y trazos: 0. Esta ronda (10/11) solo tocó b05 y b06, **sin grifos**. Nada escrito.

## C.6 Pólipo hiperplásico: «riesgo nulo» (revisión pedida el 10/11/2026)
- **Lo que dice la cátedra (Clase 6, texto):** «**CARECEN DE POTENCIAL MALIGNO.** Diferenciar de los adenomas serrados sésiles (potencial maligno)»; morfología «colon izquierdo (+++), sigmoides y recto; múltiples (+++), generalmente < 5 mm»; microscopía «células caliciformes y absortivas maduras … acumulación de células que crea la superficie serrada … limitada típicamente al 1/3 superior (o menos) de la cripta». El gabarito escrito de la foto dice «nula / carece».
- **Lectura prudente:** es una **formulación simplificada de la cátedra**, válida para el **hiperplásico típico** (pequeño, distal, serración solo en el tercio superior, sin displasia). **No** se extiende a la lesión serrada de aspecto parecido (el propio slide manda diferenciarla del adenoma sésil serrado, que sí tiene potencial maligno y predomina en el colon derecho), ni se presenta como garantía para cualquier lesión.
- **Literatura base:** Robbins 9.ª (cap. 17 p. 804, citado en el slide) y Harsh Mohan **no son legibles** con las herramientas disponibles (ver Parte B): la afirmación **no pudo confirmarse ni matizarse con el libro**; queda sin confirmación en fuente permitida más allá del slide. No se agregaron cifras ni contextos tomados de memoria.
- **Cambios:** la respuesta de `ap2b06` #18 pasó de «riesgo insignificante» a «**carece de potencial maligno** (riesgo nulo o insignificante en el hiperplásico típico)»; la explicación atribuye la frase a la cátedra y dice que es una regla práctica, no una garantía; el texto de b06 (celda del cuadro) dice «carece de potencial maligno (formulación de la cátedra, válida para el hiperplásico típico; no para … el sésil serrado)»; la flashcard «Hiperplásico vs. sésil serrado» (bloque, mazo y ruleta) pasó de «sin riesgo» a «sin potencial maligno (el típico)». El texto dentro de la ilustración SVG («distal, sin riesgo») y el pie de figura «riesgo muy bajo» no se tocaron (ya están acotados al caso típico). Sin grifos en b06: nada que migrar.


---

# PARTE D · Simulacro «P2 – 2/2026 (NO OFICIAL)» (PDF de la issue #651, 5 págs.) — matriz ítem por ítem

**Fuente:** `1IpbVkmkQBBS4JS6IKW0M5zvJNEWkMf5m` (UCP, Anatomía Patológica II, Dra. Chamorro, secciones H/I). El propio documento se identifica como **«SIMULACRO DE ESTUDIO … (NO OFICIAL)»** con «reconstrucción de preguntas y respuestas + 20 preguntas inéditas de práctica». **Registro interno:** la fuente es un simulacro no oficial (no una prueba); **no se presenta como prueba oficial**. Por decisión de José, las preguntas del PDF que **aún no estaban** en el sitio reciben el rótulo «Basada en preguntas de examen»; ninguna pregunta del sitio menciona el simulacro ni se declara «oficial».
**Numeración:** el PDF numera **1–38 y 40–51**: **no existe la pregunta 39** (se pasa de la 38 a la 40, sin hueco de contenido visible); **no se inventó** ninguna. Total: **50 ítems** (Sección I: 1–22 abiertas; II: 23–25 casos; III: 26–31 MCQ A–D; IV: 32–51 completar/citar).
**Respuestas del simulacro:** no se tomaron como correctas por sí mismas; cada una se confrontó con los slides (Clase 4, 5 y 7 y la Clase 7 nueva). Resultado: **49 de 50 coinciden con los slides**; una sin respaldo en slides (ítem 41, p-ANCA, ver abajo) y un matiz (ítem 18). Errata del PDF: ítem 26, opción A dice «a localización de la masa».
**Leyenda:** main = ya estaba en `main`; #640 = vino con la #640; #648 = acrescentada en la #648 en rondas anteriores; **NUEVA** = acrescentada en esta ronda. Las preguntas no tienen id: bloque + nº dentro del bloque.
| Ítem PDF | Tema (respuesta del simulacro) | Estado | Bloque · nº | Motivo / nota |
|---|---|---|---|---|
| 1 | CHC: β-catenina + p53 | existe (#640) | b07 #15 | ya pedía las dos |
| 2 | Crohn macro: segmentaria + pared engrosada | existe (#640) | b05 #16 | idem |
| 3 | Carcinoide: gastritis atrófica autoinmune + ZES | existe (#640) | b04 #16 | idem |
| 4 | BilIN-3 | existe (main) | b07 #10 | idem |
| 5 | Megacolon tóxico | existe (main) | b05 #4 | idem |
| 6 | MALT: lesiones linfoepiteliales | existe (main) | b04 #5 (c), #13 | la respuesta correcta nombra la lesión |
| 7 | CU macro: úlceras de base ancha + seudopólipos | existe (#640), ajustada (#648) | b05 #17 | responde con esos dos puntos |
| 8 | CU hepatobiliar: pericolangitis + CEP | existe (#640/#648) | b05 #15 (acepta pericolangitis/CEP), #9 (main, CEP) | enunciado «hepatobiliares» distinto, contenido cubierto: no duplicado |
| 9 | Adenoma: anticonceptivos orales | existe (main) | b07 #2 | — |
| 10 | GIST: células de Cajal | existe (#640) | b04 #17 | — |
| 11 | Crohn: fístulas + fisuras (trayectos penetrantes/perianales) | **NUEVA** | b05 #21 | la #18 pedía otras complicaciones (íleon); stem distinto, sin duplicado |
| 12 | Borrmann II | existe (main) | b04 #3 | formulada como «INCORRECTA» |
| 13 | EII/Crohn: uveítis + poliartritis | existe (#640) | b05 #15 | — |
| 14 | Child-Pugh: bilirrubina + ascitis | existe (#648) | b07 #26 | pide 2 de 5 parámetros |
| 15 | Otros 2 parámetros: encefalopatía + protrombina | existe (#648) | b07 #26, #28 | misma pregunta (5 parámetros): duplicado semántico |
| 16 | Colágeno tipo I | existe (#640) | b07 #17 | — |
| 17 | E-cadherina (CDH1) | existe (main) | b04 #2 | la respuesta correcta incluye CDH1/E-cadherina |
| 18 | Crohn: 3 hallazgos histopatológicos (transmural, granulomas, fisuras) | **NUEVA** | b05 #22 | **matiz:** el slide describe las fisuras en la morfología macroscópica; la respuesta acepta además abscesos crípticos y agregados linfoides |
| 19 | Crohn ileal: B12/anemia megaloblástica + estenosis | existe (#640) | b05 #18 | — |
| 20 | Carcinoide: célula neuroendocrina | existe (#640) | b04 #18 | — |
| 21 | Gástrico intestinal: displasia | existe (main) | b03 #9, #22; b04 #8 | — |
| 22 | Seudopólipos | existe (main) | b05 #12 | — |
| 23 | Lauren intestinal (caso) | existe (main) | b04 #1 | — |
| 24 | Adenoma β-catenina | existe (#640) | b07 #16 | — |
| 25 | Difuso/linitis (caso) | existe (main) | b04 #2 | — |
| 26 | Carcinoide: factor pronóstico = localización | existe (#648) | b04 #19 | — |
| 27 | CU continua / Crohn segmentaria | existe (main) | b05 #1, #3 | duplicado semántico |
| 28 | Cirrosis: ↓ protrombina = ↓ función sintética | existe (#648) | b07 #28, #25 | — |
| 29 | Cirrosis establecida: puentes + nódulos | existe (#648) | b07 #18 | — |
| 30 | Difuso (caso con H. pylori) | existe (main) | b04 #2 | — |
| 31 | HNF (9 cm, cicatriz estrellada) | existe (main) | b07 #3 (+ #7 fibrolamelar) | — |
| 32 | H. pylori: neutrófilos intraepiteliales + plasmáticas | existe (main) | b03 #16 | — |
| 33 | Autoinmune: cuerpo y fondo / preserva antro | existe (main) | b03 #6 | — |
| 34 | Carcinoide: sal y pimienta + cromogranina A | existe (#648) | b04 #20 | — |
| 35 | GIST: KIT | existe (main) | b04 #6 | — |
| 36 | GIST: tamaño + índice mitótico | **NUEVA** | b04 #24 | slide: «tamaño, índice mitótico y localización» |
| 37 | Lauren intestinal: glándulas + crecimiento expansivo | **NUEVA** | b04 #25 | slide Clase 4 ✔ |
| 38 | Crohn: íleon terminal | existe (main) | b05 #10 | — |
| **39** | **no existe en el PDF** | — | — | no se inventó |
| 40 | Crohn: absceso críptico | **NUEVA** | b05 #23 | slide Clase 5 ✔ |
| 41 | CU: p-ANCA | **NUEVA** | b05 #24 | **sin respaldo en slides**; consistente con el texto previo del bloque y con la asociación clínica habitual, pero **no pudo confirmarse en literatura accesible** (Robbins ilegible): marcada «no confirma el diagnóstico»; a confirmar por José |
| 42 | Crohn: tabaquismo | **NUEVA** | b05 #25 | slide Clase 5 ✔ («tabaquismo» entre los estímulos de reactivación) |
| 43 | Estrelladas quiescentes: vitamina A | **NUEVA** | b07 #32 | Clase 7 nueva ✔ |
| 44 | Alambre de gallinero | **NUEVA** | b07 #33 | Clase 7 nueva ✔ |
| 45 | Esteatohepatitis: Mallory-Denk + balonamiento | existe (#648) | b07 #30 | — |
| 46 | Micronodular | existe (#648) | b07 #24 | — |
| 47 | HNR | existe (main) | b07 #4 | — |
| 48 | Hemangioma: nódulo rojo-azulado esponjoso + canales con endotelio aplanado | **NUEVA** | b07 #34 | Clase 7 ✔ |
| 49 | Adenoma: ausencia de tríadas portales | existe (main) | b07 #13 | — |
| 50 | CHC: nódulos displásicos de alto grado | **NUEVA** | b07 #35 | Clase 7 nueva ✔ |
| 51 | Klatskin | existe (main) | b07 #9 | — |

**Totales:** 50 ítems → **11 NUEVAS**, 39 ya existían (de ellas 5 con ajuste previo), **0 pendientes** de contenido; 1 numeración ausente (39). **Cambios en el HTML:** +11 preguntas abiertas en bloque **y** banco (idénticas): b05 +5 (20 → 25), b04 +2 (23 → 25), b07 +4 (31 → 35); banco **192 → 203** (exame 125 → **136**); sin cambios en el texto de enseñanza (todo lo cobrado ya estaba enseñado) ni en flashcards. **Supabase (solo lectura, 12/11):** grifos `ap2b01` 291 · `ap2b02` 1 · `ap2b03` 74 · `ap2b04` 10 · `ap2intro` 2; blocos 05–08, notas y trazos: 0; los 10 textos de `ap2b04` iguales a los anteriores; las preguntas nuevas se agregaron después de todos los grifos del texto.
