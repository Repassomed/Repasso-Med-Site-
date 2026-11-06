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
