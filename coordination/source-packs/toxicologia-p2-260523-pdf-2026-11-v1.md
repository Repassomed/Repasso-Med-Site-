# Toxicología · `Toxicologia P2_260523_043007.pdf` · cruce con el banco según 8-A (PR de auditoría)

Fecha: 27/11/2026 · Agente: Claude 4 · PR apilada sobre la #733 (rama `claude/toxicologia-provas-fotos`); orden de merge propuesta: **#733 → esta**. **Nada fue activado, publicado ni mezclado; sin escrituras en Supabase.**

## 1. Fuente y acceso (8-A.5-B)

- Archivo: Drive → Site Repasso Med → Biblioteca → 7 semestre → Toxicologia → Provas → `Toxicologia P2_260523_043007.pdf` (id `10TRHFyo7koOo4xlKLzSymE5636MmRkn-`, **22,9 MB**).
- **Descarga completa: rechazada** por el conector de Drive (límite de 10 MB; el intento devuelve «over Google's 10 MB limit»), de modo que **no se pudo dividir ni comprimir** el archivo desde esta sesión.
- **Lectura obtenida:** el texto completo del PDF por `read_file_content` (extracción de texto/OCR del propio Drive). **Texto: leído por completo. Imágenes, tachaduras y anotaciones manuscritas: NO vistas** (el texto trae ruido de OCR, caracteres sueltos y anotaciones en chino/símbolos que provienen de escritura a mano). El texto **no trae números de página**, por eso las referencias son por **bloque en el orden del documento** (B1–B10).
- **Para completar la revisión visual** (pendiente, depende de José): dividir el PDF en partes < 10 MB o enviar las páginas como imágenes (como se hizo con los laminarios de AP II Práctica).

| Bloque | Contenido (orden del documento) | Naturaleza |
|---|---|---|
| B1 | «Evaluación prueba parcial teórica», versión A/B, 5 preguntas | examen impreso |
| B2 | 5 casos de AINEs (ibuprofeno, diclofenaco, aspirina, dipirona, meloxicam) | examen impreso |
| B3 | 3 casos de arañas | examen impreso |
| B4 | lista «Prova tóxico», 17 ítems (con respuesta abreviada) | **recuerdo de un estudiante** (auxiliar) |
| B5 | fragmento de otra versión (preguntas 5–12) | examen impreso |
| B6 | «P1 TOXICO», 17 ítems | recuerdo de un estudiante (auxiliar) |
| B7 | «P2 TOXICO», 15 ítems | recuerdo de un estudiante (auxiliar) |
| B8 | **FILA 1**, 16 preguntas + **gabarito impreso** | examen impreso |
| B9 | **FILA 2**, 16 preguntas + **gabarito impreso** | examen impreso |
| B10 | versiones finales (caranguejeiras, crotálico, foseta, letalidad, taturana, clasificación, escorpión, suero, tratamiento general, clonazepam, laboratorio, araña marrón) | examen impreso |

Los bloques de recuerdo (B4, B6, B7) son **fuente auxiliar**, no clave (8-A.5-A); las notas del estudiante no se usan como respuesta oficial.

## 2. Resultado (cada ítem cruzado con el banco por contenido y razonamiento, 8-A.1)

**110 ítems únicos** (varios aparecen en más de una versión de la prueba y se unieron):

| Resultado | Ítems |
|---|---|
| **Ya existían** en el banco (duplicado exacto o semántico) | **105** (100 directos · 2 cubiertos por concepto · 3 con rótulo actualizado, ver §4) |
| **Añadidas** (preguntas nuevas) | **0** |
| **Actualizadas** (rótulo, mismo id, misma clave y alternativas) | **2 preguntas** (`q-b01q05`, `q-b05q19`) — 3 ítems de la fuente |
| **Pendientes** | **5** |

Ninguna pregunta existente fue reformulada, unida ni retirada (8-A.1-B): en todos los casos la versión del banco es igual o más completa que la del PDF (misma clave, explicación propia). Por eso **no se añadió ninguna pregunta**: lo que el PDF cubre ya está en el banco y, cuando faltaba cobertura en el resumen, la pregunta no entra (8-A.2).

## 3. Gabaritos impresos (FILA 1 y FILA 2)

El PDF trae las claves impresas de las dos filas (texto algo desordenado por el OCR). Se reconstruyeron comparándolas con el contenido y con las claves del banco:

- **FILA 2** (`1-B 2-A 3-A 4-D 5-D 6-C 7-A 8-C 9-B 10-D 11-C 12-D 13-D 14-B`): **13 de 13** preguntas con equivalente en el banco coinciden con su clave (la 12 queda pendiente, §5).
- **FILA 1** (letras en orden: B B C A D D C C A D A B C C): **13 de 13** con equivalente coinciden (la 5 queda pendiente, §5; la 15 y la 16 son abiertas).

Es **evidencia auxiliar de calidad**: confirma las claves ya publicadas; no se tocó ninguna.

## 4. Actualizaciones de rótulo (8-A.4, 8-A.1-B)

| Pregunta | Antes | Ahora | Evidencia (fuente → bloque → ítem) |
|---|---|---|---|
| `q-b01q05` «las tres P» (Pupila, peristaltismo y piel) | Pregunta complementaria | **Basada en preguntas de examen** | B9 FILA 2 · Q13, examen impreso, clave D («Pupilas, Peristaltismo y Piel») |
| `q-b05q19` conducta ante intoxicación accidental por piretroides | Pregunta complementaria | **Basada en preguntas de examen** | B9 FILA 2 · Q16, examen impreso (abierta, mismo planteo) |

Ambas conservan **id, enunciado, alternativas, clave y explicación**; sólo cambia el rótulo, en el bloque y en el banco. Contagens: «Basada» (cuerpo) 92 → **94**; «Pregunta complementaria» (cuerpo) 261 → **259**. Se **mantuvo «complementaria»** en `q-b01q11` (FILA 2 Q15 es abierta «mínimo 3 principios»; la pregunta pide ordenar los 4: equivalencia parcial) y en `q-b05q11` (sólo aparece en el recuerdo B6, auxiliar).

## 5. Pendientes y divergencias (nada se inventó)

| # | Ítem | Fuente | Motivo | Qué lo resolvería |
|---|---|---|---|---|
| 1 | FILA 1 Q5: inhalado, conductas ciertas **excepto** «intubación o traqueostomía de urgencia en EPOC y asma» (clave D) | B8 | el resumen enseña «retirar → ventilar → oxígeno»; **no** enseña intubación/traqueostomía ni EPOC/asma → no entra (8-A.2) | slide de la cátedra sobre vía inhalatoria con ese contenido |
| 2 | FILA 2 Q12: inhalado, conductas ciertas **excepto** «broncodilatadores y esteroides en EPOC y asma» (clave D) | B9 | ídem; además la clave D contradice lo habitual (los broncodilatadores se usan en broncoespasmo), por lo que hace falta ver el slide | ídem |
| 3 | «Manejo de la araña caranguejeira: antihistamínicos + esteroides + epinefrina» | B4 #10 (recuerdo) | contradice la página y `q-b08q02` (sin importancia médica, sólo pelos urticantes) | confirmar con la cátedra; la nota del estudiante no es clave |
| 4 | «Veneno neurotóxico y miotóxico → elapídico» | B7 #13 (recuerdo) | la página (bloque 07) dice **crotálico = neurotóxico y miotóxico; elapídico = neurotóxico puro** | confirmar con la cátedra |
| 5 | «Picada del escorpión (alacrán)…» | B7 #6 | enunciado truncado en la fuente | la imagen original |

Otras divergencias de las notas del estudiante (no generan pregunta): B6 #1 da como «catárticos» la definición de los **adsorbentes** (la página y `q-b03q22`/`q-b03q07` los distinguen); B4 #8 («viuda negra: incorrecto = suero phoneutria») es sólo un recuerdo sin alternativas: el tema (indicación del suero anti-Latrodectus y diferencia con Phoneutria) ya está en `q-b08q13` y `q-b08q11`.

## 6. Matriz ítem → decisión → destino

| Ítem | Bloque | Planteo | Resultado | Cobertura / nota |
|---|---|---|---|---|
| A1 | B1 | suero antielapídico: en qué serpiente (coral) | EXISTÍA | q-b07q01 |
| A2 | B1 | manejo inicial ofídico: lo que NO se hace (succionar) | EXISTÍA | q-b07q02 |
| A3 | B1 | lab seguimiento ofídico excepto perfil glicémico/amilasas | EXISTÍA | q-b07q03 |
| A4 | B1 | foseta loreal excepto (introducir veneno / únicos) | EXISTÍA | q-b07q04 |
| A5 | B1 | araña marrón moderado-severo: suero + esteroides + antihistamínicos | EXISTÍA | q-b08q01 |
| N1 | B2 | ibuprofeno 40 tab → carbón activado y monitorizar | EXISTÍA | q-b06q01 |
| N2 | B2 | diclofenaco + melena → úlcera con sangrado | EXISTÍA | q-b06q02 |
| N3 | B2 | aspirina → alcalinizar orina con bicarbonato | EXISTÍA | q-b06q03 |
| N4 | B2 | dipirona → agranulocitosis | EXISTÍA | q-b06q04 |
| N5 | B2 | meloxicam crónico + melena → úlcera péptica | EXISTÍA | q-b06q05 |
| S1 | B3 | picadura araña, placa eritematosa leve → lavar + compresas frías + analgesia | EXISTÍA | q-b08q06 |
| S2 | B3 | lesión necrótica antebrazo 72 h → loxoscelismo cutáneo | EXISTÍA | q-b08q04 |
| S3 | B3 | niño ictericia orina oscura → loxoscelismo cutáneo-visceral + suero antiloxoscélico | EXISTÍA | q-b08q05 |
| T1 | B4 | escorpión amarillo caso clínico → suero y soporte | EXISTÍA | q-b08q10 |
| T2 | B4 | mecanismo veneno oruga anticoagulante y fibrinolítico | EXISTÍA | q-b08q07, q-b08q25 |
| T3 | B4 | escorpión primeros auxilios excepto compresas calientes | EXISTÍA | q-b08q03 |
| T4 | B4 | manejo hospitalario ofídico excepto intubar siempre | EXISTÍA | q-b07q22 |
| T5 | B4 | ofídico sin identificación: evaluar cuadro + suero más probable | EXISTÍA | q-b07q07, q-b07q20 |
| T6 | B4 | ofídico excepto incisión | EXISTÍA | q-b07q08 |
| T7 | B4 | suero araña marrón SALox | EXISTÍA | q-b08q05, q-b08q01 |
| T8 | B4 | incorrecto en viuda negra: suero phoneutria | EXISTÍA (por concepto) | q-b08q13, q-b08q11 (versión de examen sólo recordada, sin alternativas: no reconstruible) |
| T9 | B4 | suero antielapídico = coral verdadera | EXISTÍA | q-b07q01 |
| T10 | B4 | caranguejeira manejo (antihistamínicos+esteroides+epinefrina) | PENDIENTE | q-b08q02 enseña lo contrario (sin importancia médica); la nota del estudiante contradice la página |
| T11 | B4 | carbamatos acción similar a OP | EXISTÍA | q-b05q10 |
| T12 | B4 | orden crotálicos/elapídicos/botrópicos (cascavel, coral, yarará) | EXISTÍA | q-b07q06 |
| T13 | B4 | caso clínico bananera → identificar agente | EXISTÍA | q-b08q22 |
| T14 | B4 | veneno que provoca rabdomiólisis → crotálico | EXISTÍA | q-b07q11 |
| T15 | B4 | V/F paracetamol no tiene antídoto → falso | EXISTÍA | q-b06q06 |
| T16 | B4 | V/F piretrinas/piretroides baja toxicidad no acumulan → V | EXISTÍA | q-b05q09 |
| T17 | B4 | abierta: manejo intoxicación por dipirona | EXISTÍA | q-b06q16 |
| B5 | B5 | inhalado: conducta excepto broncoscopía/intubación EPOC | EXISTÍA | q-b02q26 |
| B6 | B5 | OP síntomas muscarínicos (miosis, broncorrea, sialorrea) | EXISTÍA | q-b05q01 |
| B7 | B5 | toxina = moléculas proteicas de origen natural | EXISTÍA | q-b01q21 |
| B8 | B5 | diagnóstico OP más importante: colinesterasa en sangre | EXISTÍA | q-b05q03 |
| B9 | B5 | DL50 definición | EXISTÍA | q-b01q20 |
| B10 | B5 | organoclorados antídoto: no hay | EXISTÍA | q-b05q07 |
| B11 | B5 | adsorbentes: opción correcta | EXISTÍA | q-b03q22 |
| B12 | B5 | toxidromes definición | EXISTÍA | q-b01q23 |
| B13 | B5 | cloro inhalatorio: conducta (mascarilla O2 si tos irritativa) | EXISTÍA | q-b04q01 |
| P1a | B6 | catárticos: definición | EXISTÍA (por concepto) | q-b03q22, q-b03q07 (la nota del estudiante da la definición del adsorbente para «catártico»: divergencia de la nota, no de la página) |
| P1b | B6 | ejemplos de catárticos | EXISTÍA | q-b03q20, q-b03q08 |
| P1c | B6 | indicaciones del carbón activado (excepto) | EXISTÍA | q-b03q02 |
| P1d | B6 | contraindicaciones del carbón activado | EXISTÍA | q-b03q05, q-b03q21 |
| P1e | B6 | tres P (piel, pupila, peristaltismo) | EXISTÍA · rótulo actualizado | q-b01q05 (rótulo actualizado, ver §4) |
| P1f | B6 | intoxicación ocular: lavado 15 min, no antídotos | EXISTÍA | q-b02q03, q-b02q25 |
| P1g | B6 | contraindicaciones del lavado gástrico | EXISTÍA | q-b02q20 |
| P1h | B6 | posición del lavado gástrico | EXISTÍA | q-b02q21 |
| P1i | B6 | cuándo depuración renal | EXISTÍA | q-b03q23 |
| P1j | B6 | OP caso clínico: conducta (ABC, descontaminación, benzodiacepinas) | EXISTÍA | q-b05q11 |
| P1k | B6 | jarabe de ipecacuana: efecto | EXISTÍA | q-b02q27 |
| P1l | B6 | ipecacuana: contraindicaciones | EXISTÍA | q-b02q23, q-b02q05 |
| P1m | B6 | lavado gástrico: indicación (2–4 h / 1.ª hora) | EXISTÍA | q-b02q08 |
| P1n | B6 | ipecacuana: papel (provocar emesis) | EXISTÍA | q-b02q04 |
| P1o | B6 | OP inhiben la acetilcolinesterasa | EXISTÍA | q-b02q12 |
| P1p | B6 | tratamiento inicial OP grave: atropina y pralidoxima | EXISTÍA | q-b05q04, q-b02q19 |
| P2a | B7 | grupo elapídico: coral verdadera y falsa | EXISTÍA | q-b07q06 |
| P2b | B7 | veneno que causa necrosis: botrópico | EXISTÍA | q-b07q07 |
| P2c | B7 | foseta loreal: jararaca y cascavel | EXISTÍA | q-b07q05, q-b07q04 |
| P2d | B7 | antiofídico cuando no se sabe: polivalente/ evaluar cuadro | EXISTÍA | q-b07q20 |
| P2e | B7 | escorpión picada (veneno actúa en sistema nervioso) | EXISTÍA | q-b08q08 |
| P2f | B7 | lab para accidente ofídico: coagulación, protrombina, hemograma, renal, sedimento | EXISTÍA | q-b07q03, q-b07q19 |
| P2g | B7 | araña marrón leve: limpieza, analgesia, compresa fría, elevación, tétanos | EXISTÍA | q-b08q06 |
| P2h | B7 | 3 manejos hospitalarios post mordedura (reposo, inmovilizar, retirar anillos) | EXISTÍA | q-b07q02, q-b07q22 |
| P2i | B7 | falso sobre araña marrón: no duele | EXISTÍA | q-b08q09 |
| P2j | B7 | taturana causa quemadura por pelos | EXISTÍA | q-b08q24 |
| P2k | B7 | serpiente neurotóxico y miotóxico → elapídico | PENDIENTE | la nota dice «elapídico»; la página (bloque 07) enseña crotálico = neurotóxico y miotóxico, elapídico = neurotóxico puro; no se crea pregunta con esa clave |
| P2l | B7 | gravedad del ofidismo depende de (veneno, inoculación, tto, susceptibilidad) | EXISTÍA | q-b07q21 |
| P2m | B7 | araña marrón: no importancia médica sólo pelos (error: caranguejeira) | EXISTÍA | q-b08q02 |
| F1-1 | B8 | estarticos/catárticos excepto escopolamina | EXISTÍA | q-b03q20 |
| F1-2 | B8 | contraindicaciones lavado gástrico (bajo nivel de consciencia, riesgo convulsiones) | EXISTÍA | q-b02q20 |
| F1-3 | B8 | tóxico por vía cutánea: retirar ropas y lavar con agua y jabón | EXISTÍA | q-b02q24 |
| F1-4 | B8 | contraindicaciones emesis inducida excepto hipotiroidismo | EXISTÍA | q-b02q23 |
| F1-5 | B8 | inhalado excepto intubación en EPOC/asma | PENDIENTE | no cubierta por el resumen: la página enseña «inhalado: retirar → ventilar → oxígeno»; nada sobre intubación/traqueostomía en EPOC y asma (8-A.2) |
| F1-6 | B8 | depuración renal contraindicaciones (hipotensión con oliguria, IR) | EXISTÍA | q-b03q23 |
| F1-7 | B8 | sustancia artificial o natural capaz de producir alteraciones = tóxico | EXISTÍA | q-b01q22 |
| F1-8 | B8 | OP muscarínicos en ojos: miosis e hiperemia | EXISTÍA | q-b05q02 |
| F1-9 | B8 | OP 6–18 meses después: neuropatía retardada | EXISTÍA | q-b05q06 |
| F1-10 | B8 | antídoto más importante OP: atropina | EXISTÍA | q-b05q04 |
| F1-11 | B8 | cetona/acetona: olor dulzón en aliento | EXISTÍA | q-b04q02 |
| F1-12 | B8 | lavado gástrico posición correcta | EXISTÍA | q-b02q21 |
| F1-13 | B8 | niño ingirió warfarina: vitamina K | EXISTÍA | q-b05q08 |
| F1-14 | B8 | contraindicaciones carbón excepto AINEs | EXISTÍA | q-b03q21 |
| F1-15 | B8 | cloro oral 2 h: conducta (abierta) | EXISTÍA | q-b04q06 |
| F1-16 | B8 | pila botón asintomática en estómago/intestino (abierta) | EXISTÍA | q-b04q05 |
| F2-1 | B9 | fármaco rico en yodo: amiodarona | EXISTÍA | q-b04q03 |
| F2-2 | B9 | lavado gástrico contraindicaciones excepto diverticulosis | EXISTÍA | q-b02q20 (duplicado semántico: misma lista de contraindicaciones, formato «excepto»), q-b02q09 |
| F2-3 | B9 | tóxico por vía ocular: lavado 15–30 min con suero y oftalmología | EXISTÍA | q-b02q25 |
| F2-9 | B9 | organoclorados: no tiene antídoto | EXISTÍA | q-b05q07 |
| F2-11 | B9 | pila botón en vías aéreas: conducta | EXISTÍA | q-b04q04 |
| F2-14 | B9 | efectos adversos del lavado gástrico | EXISTÍA | q-b02q22 |
| F2-15 | B9 | principios básicos del tratamiento de intoxicaciones agudas (abierta) | EXISTÍA | q-b01q11 (relacionada; rótulo «complementaria» mantenido: formato abierto × orden de 4 principios) |
| F2-16 | B9 | intoxicación por piretroides: conducta (abierta) | EXISTÍA · rótulo actualizado | q-b05q19 (rótulo actualizado) |
| V1 | B10 | caranguejeiras: sin importancia médica, pelos urticantes | EXISTÍA | q-b08q02 |
| V2 | B10 | crotálico neurológico: diplopía, ptosis, facies miasténica | EXISTÍA | q-b07q09 |
| V3 | B10 | letalidad ofidismo excepto colores llamativos | EXISTÍA | q-b07q21 |
| V4 | B10 | cuadro clínico taturana: dolor, calor, quemazón | EXISTÍA | q-b08q24 |
| V5 | B10 | clonazepam → flumazenil | EXISTÍA | q-b16q01 |
| V6 | B10 | alacrán amarillo primeros auxilios excepto compresas calientes | EXISTÍA | q-b08q03 |
| V7 | B10 | sin identificar, dolor intenso, sangrado, ampollas, necrosis → antibotrópico | EXISTÍA | q-b07q07 |
| V8 | B10 | tratamiento general mordedura excepto incisión | EXISTÍA | q-b07q08 |
| F2-4 | B9 | DL50 definición (FILA 2 Q4) | EXISTÍA | q-b01q20 |
| F2-5 | B9 | inhalado excepto broncoscopia (FILA 2 Q5) | EXISTÍA | q-b02q26 |
| F2-6 | B9 | OP síntomas muscarínicos (FILA 2 Q6) | EXISTÍA | q-b05q01 |
| F2-7 | B9 | moléculas proteicas de origen natural = toxina (FILA 2 Q7) | EXISTÍA | q-b01q21 |
| F2-8 | B9 | diagnóstico OP: colinesterasa (FILA 2 Q8) | EXISTÍA | q-b05q03 |
| F2-10 | B9 | medicamento de elección OP: atropina (FILA 2 Q10) | EXISTÍA | q-b05q04 |
| F2-12 | B9 | inhalado excepto broncodilatadores y esteroides en EPOC y asma (FILA 2 Q12) | PENDIENTE | no cubierta por el resumen (ídem F1-5) |
| F2-13 | B9 | tres P (FILA 2 Q13) | EXISTÍA · rótulo actualizado | q-b01q05 (rótulo actualizado) |
| P2-6 | B7 | «picada del escorpión (alacrán)» (P2 TOXICO #6, truncado) | PENDIENTE | enunciado truncado en la fuente (sólo «Uma questão falava que a picada do escorpião…») |
| V9 | B10 | lab ofídico excepto perfil lipídico (versión final) | EXISTÍA | q-b07q03 (misma pregunta, otro distractor) |

Leyenda: EXISTÍA = ya cubierto (se indica la pregunta cubridora, de contenido y razonamiento equivalentes); PENDIENTE = sin respuesta sostenible por el resumen/fuente.

## 7. Contagens finales (8-A.10)

353 preguntas (cuerpo) = 353 (banco) · 706 ítems · MC 318 + V/F 35 · **«Basada» 94 / «Pregunta complementaria» 259** (cuerpo) · bloque 05 = 27, bloque 08 = 25 · flashcards 1416 · 706 ids sin cambios (sin preguntas nuevas, sin ids retirados). Marcaciones de alumnos (Supabase, solo lectura): ver la #733 (0/0/0 en `toxicologia`).

## 8. Límites

- Imágenes y manuscritos del PDF **no vistos** (descarga rechazada por el límite de 10 MB; sin forma de dividir/comprimir desde la sesión). La lectura es de texto/OCR; las claves FILA 1/2 se contrastaron por contenido.
- Sin iPad/Safari. Sin literatura-base nueva; sin fuentes externas en esta PR.
