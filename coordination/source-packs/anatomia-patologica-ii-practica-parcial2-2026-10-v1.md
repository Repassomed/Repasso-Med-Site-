# Anatomía Patológica II Práctica · Parcial 2 · inventario de fuentes (2026-10-24)

Tarea: issue #579 (P0). Página: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/anatomia-patologica-ii-practica.html`. Imágenes nuevas: `assets/img/anatoprat2/` (43 archivos, prefijos `lam-6d-p2-` y `p2-`). Se agregan los bloques **08 a 16** después del bloque 07, sin tocar los bloques 01–07 de la P1.

## 1. Qué se leyó realmente y qué no

| Fuente | Estado | Cómo se leyó |
|---|---|---|
| Carpeta oficial de Drive (`1DZ-byFl-xBo4R20lyh5Akm4fRmkxK1u7`): lista de 17 archivos | Leída (nombres, ids, tamaños) | `search_files` |
| `Láminas Anatopato 6D - P2.pdf` (49,8 MB) | **No se abrió el original.** El conector de Drive no entrega archivos grandes: al intentar bajar el PDF «09 - Duodenitis cronica» (7,4 MB) la conexión se cerró por mensaje demasiado grande; `drive.google.com` directo está bloqueado por el proxy | Bloqueo real registrado |
| `07` a `12` (PDFs numerados, 7,4–17 MB cada uno) | **No se abrieron los originales** por el mismo motivo. Se leyó una copia compactada que José subió a la sesión: `ilovepdf_merged_compressed.pdf` (51 páginas) que reúne esos seis contenidos | Texto con `pdftotext`; cada página renderizada a 90 ppp y revisada a ojo (manuscritos, fotos, anotaciones); imágenes extraídas con `pdfimages` |
| Laminario P2 | Se leyó la copia compactada que José subió: `Láminas Anatopato 6D - P2 (compressed)` (19 páginas: portada + 9 diagnósticos con ficha y página en blanco) | Texto con `pdftotext`; imágenes extraídas y **vistas una por una**; fichas leídas completas |
| P1 (`Láminas Anatopato 6D - P1.pdf`) y estructura de la página | Estructura y bloque 07 leídos en el sitio | Lectura del HTML |

**Límite de equivalencia:** no se pudo comprobar que las copias compactadas sean idénticas a los originales de Drive. La correspondencia entre los seis PDFs numerados y el PDF unido se hizo por contenido (órgano y diagnóstico), no por nombre de archivo.

Datos de alumnos (consulta solo de lectura, Supabase, 2026-10-24): `user_highlights`, `user_notes` y `user_ink_strokes` **sin filas** para esta materia (`anatomia-patologica-ii-practica`, `anatoprat2`, bloques `ap2p%`). Nada se escribió ni se migró. Las 377 marcas de `anatomia-patologica-ii` son de la materia teórica y no se tocan.

## 2. Inventario tópico a tópico

| Bloque | Diagnóstico | Fuentes | Qué hay en la fuente | Qué quedó en la página | Límite o pendiente |
|---|---|---|---|---|---|
| 08 | Cirrosis hepática | Ficha P2 (págs. 2–3); PDF «07» (págs. 1–8 del unido) | Esquema manuscrito (definición, causas, fisiopatología), 2 vistas del laminario, micros anotadas, 2 macro, caso de 56 años con 4 preguntas y respuestas | Ficha, 5 vistas micro, 2 macro, caso, 12 preguntas, 19 tarjetas | «Fibrina» de los apuntes = colágeno (ver §4). Tamaño de nódulos y estadio no se juzgan en el campo microscópico |
| 09 | Carcinoma hepatocelular | Ficha P2 (págs. 4–5); PDF «08» | Esquema (factores de riesgo, patrones), macros, micros anotadas, caso de 62 años con preguntas | Ficha, 5 vistas micro, 2 macro, caso, 12 preguntas, 19 tarjetas | Invasión vascular descrita, no demostrada por las imágenes. Falta la pregunta 3 numerada en el original (se usó el contenido de la respuesta 3) |
| 10 | Duodenitis crónica | Ficha P2 (págs. 6–7, imagen única); PDF «09» | Esquema, micros anotadas (erosión, Brunner, lámina propia), caso de 42 años con 3 preguntas | Ficha, 4 vistas, caso, 12 preguntas, 16 tarjetas | La diapositiva «09» dice «diagnóstico presuntivo»; la ficha del laminario (pág. 6) anota solo «Duodenitis crónica». Atrofia de vellosidades y plasmocitos no se resuelven a este aumento |
| 11 | Enfermedad de Crohn | Ficha P2 (págs. 8–9, imagen única); PDF «10» | Esquemas largos (distribución, macro, micro, clínica, extraintestinales), endoscopías, figuras de atlas, caso de 26 años con 4 preguntas | Ficha, 4 vistas, caso, 12 preguntas, 18 tarjetas | Granulomas y células de Paneth no se ven a bajo aumento. Se omitieron endoscopías y figuras de atlas (origen no indicado) |
| 12 | Apendicitis aguda | Ficha P2 (págs. 10–11); PDF «11» | Esquema (fisiopatología, 4 grados, micro 4 puntos), micros anotadas, macros diminutas | Ficha, 7 vistas, 12 preguntas, 17 tarjetas | **Sin caso ni preguntas en la fuente.** Macros demasiado pequeñas (&lt; 270 px), omitidas. No se puede graduar con el laminario |
| 13 | Adenocarcinoma de colon **no mucinoso** | Ficha P2 (págs. 12–13); PDF «12» | Esquema (etiología, clasificación, macro, micro), macros, enema, micros anotadas | Ficha, 3 vistas micro, 2 macro, enema, 12 preguntas, 11 tarjetas | **Sin caso ni preguntas en la fuente.** Necrosis intraglandular e invasión no se resuelven a bajo aumento |
| 14 | Adenocarcinoma de colon **mucinoso** | Ficha P2 (págs. 14–15, imagen única); PDF «12» | Esquema, 4 macros, micros anotadas (lagos, anillo de sello) | Ficha, 3 vistas, 2 macro, 12 preguntas, 12 tarjetas | **Sin caso ni preguntas en la fuente.** Macros no demuestran el carácter gelatinoso. Anillos de sello no se resuelven |
| 15 | Pancreatitis crónica | **Solo la ficha P2** (págs. 16–17, imagen única) | Órgano, proceso, descripción y diagnóstico | Ficha leída palabra por palabra, 1 vista, 12 preguntas, 12 tarjetas | **Una sola fuente.** Causas, clínica y complicaciones fuera por falta de fuente. No se confirma atrofia, islotes, dilatación ni linfocitos en la imagen |
| 16 | Adenocarcinoma de páncreas | **Solo la ficha P2** (págs. 18–19) | Idem | Ficha leída palabra por palabra, 2 vistas, 12 preguntas, 9 tarjetas | **Una sola fuente.** Factores de riesgo, marcadores y estadificación fuera por falta de fuente |

## 3. Imágenes: origen → uso → diagnóstico o límite

Todas se miraron una por una (hojas de contacto y ampliaciones). Formato webp; láminas del laminario hasta 1100 px; el resto hasta 900 px. Los textos alt describen lo que la imagen realmente muestra. Ninguna imagen de pregunta o tarjeta lleva rótulo que dé la respuesta (las vistas del laminario P2 son círculos sin texto; la foto «Stenosing / infiltrating» y el enema con pie original solo están en la galería de enseñanza, no en preguntas).

| Archivo | Origen | Uso | Qué muestra | Límite |
|---|---|---|---|---|
| `lam-6d-p2-cirrosis-01.webp` | Laminario P2, pág. 2 | 08 · vista 1 | Bajo aumento: bloques separados por bandas fibrosas, vacuolas | Muestra el patrón; no mide nódulos ni estadio de fibrosis |
| `lam-6d-p2-cirrosis-02.webp` | Laminario P2, pág. 3 | 08 · vista 2 | Esteatosis, banda fibrosa fina con vaso | Una sola banda; apoyo de la grasa |
| `lam-6d-p2-chc-01.webp` | Laminario P2, pág. 4 | 09 · vista 1 | Masas densas de células oscuras, luz clara central | Muestra el patrón tumoral; no demuestra invasión vascular |
| `lam-6d-p2-chc-02.webp` | Laminario P2, pág. 5 | 09 · vista 2 | Lámina compacta con espacio vascular | Idem |
| `lam-6d-p2-duodenitis-01.webp` | Laminario P2, págs. 6 y 7 (misma imagen) | 10 · vista 1 | Mucosa con vellosidades y lóbulos de Brunner | Muestra Brunner; infiltrado y erosión no se resuelven |
| `lam-6d-p2-crohn-01.webp` | Laminario P2, págs. 8 y 9 (misma imagen) | 11 · vista 1 | Íleon con criptas largas, ramificadas y mal orientadas | Muestra criptas; no se ven granulomas ni Paneth |
| `lam-6d-p2-apendicitis-01.webp` | Laminario P2, pág. 10 | 12 · vista 1 | Apéndice con luz hemorrágica | No permite graduar ni afirmar neutrófilos en la muscular |
| `lam-6d-p2-apendicitis-02.webp` | Laminario P2, pág. 11 | 12 · vista 2 | Luz con material rojo y blanquecino, pared celular | Idem |
| `lam-6d-p2-colon-nomucinoso-01.webp` | Laminario P2, pág. 12 | 13 · vista 1 | Criptas regulares junto a mucosa más oscura | Muestra el borde; el tumor se ve mejor en la vista 2 |
| `lam-6d-p2-colon-nomucinoso-02.webp` | Laminario P2, pág. 13 | 13 · vista 2 | Glándulas irregulares y apretadas | Necrosis intraglandular e invasión no se resuelven a este aumento |
| `lam-6d-p2-colon-mucinoso-01.webp` | Laminario P2, págs. 14 y 15 (misma imagen) | 14 · vista 1 | Lagos de mucina con tiras de epitelio | No mide el 50 %; no confirma anillo de sello |
| `lam-6d-p2-pancreatitis-01.webp` | Laminario P2, págs. 16 y 17 (misma imagen) | 15 · vista 1 | Lobulillos y tejido fibroso con vasos y conductos | No confirma atrofia de acinos, islotes, dilatación ni linfocitos |
| `lam-6d-p2-adenoca-pancreas-01.webp` | Laminario P2, pág. 18 | 16 · vista 1 | Luces irregulares con pliegues y restos | Atipia nuclear e invasión no se juzgan |
| `lam-6d-p2-adenoca-pancreas-02.webp` | Laminario P2, pág. 19 | 16 · vista 2 | Luz irregular con estroma denso | Desmoplasia se interpreta por el aspecto del estroma |
| `p2-cirrosis-nodulos.webp` | PDF numerado, pág. 2 | 08 · vista 3 | Nódulos a bajo aumento | Apoyo |
| `p2-cirrosis-fibrosis-puente.webp` | PDF numerado, pág. 2 | 08 · vista 4 | Banda fibrosa desde espacio portal, grasa | Apoyo |
| `p2-cirrosis-esteatosis.webp` | PDF numerado, pág. 2 | 08 · vista 5 | Vacuolas de grasa | Apoyo |
| `p2-cirrosis-macro-micronodular.webp` | PDF numerado, pág. 4 | 08 · macro | Hígado con nódulos pequeños parejos | Apoyo; origen no indicado |
| `p2-cirrosis-macro-macronodular.webp` | PDF numerado, pág. 4 | 08 · macro | Hígado con nódulos grandes desiguales | Apoyo; origen no indicado |
| `p2-chc-compacto.webp` | PDF numerado, pág. 11 | 09 · vista 3 | Tumor compacto frente al parénquima | Apoyo |
| `p2-chc-pseudoglandular.webp` | PDF numerado, pág. 12 | 09 · vista 4 | Luz grande con material rosado | Apoyo |
| `p2-chc-pseudoglandular-detalle.webp` | PDF numerado, pág. 12 | 09 · vista 5 | Alto aumento de la luz con contenido | Apoyo |
| `p2-chc-macro-nodulos.webp` | PDF numerado, pág. 10 | 09 · macro | Nódulos pálidos con escala | Apoyo; origen no indicado |
| `p2-chc-macro-multinodular.webp` | PDF numerado, pág. 11 | 09 · macro | Múltiples nódulos blanco-amarillentos | Apoyo; origen no indicado |
| `p2-duodenitis-lamina-propia.webp` | PDF numerado, pág. 22 | 10 · vista 4 | Lámina propia con células inflamatorias | Apoyo |
| `p2-duodenitis-brunner.webp` | PDF numerado, pág. 23 | 10 · vista 3 | Lóbulos de Brunner | Apoyo |
| `p2-duodenitis-erosion.webp` | PDF numerado, pág. 23 | 10 · vista 2 | Superficie discontinua y Brunner | Apoyo |
| `p2-crohn-fisura.webp` | PDF numerado, pág. 34 | 11 · vista 3 | Hendidura profunda en la pared | Apoyo |
| `p2-crohn-criptas.webp` | PDF numerado, pág. 32 | 11 · vista 2 | Criptas en abanico | Apoyo |
| `p2-crohn-granuloma.webp` | PDF numerado, pág. 33 | 11 · vista 4 | Zona de inflamación densa | Los granulomas marcados en la diapositiva no se distinguen; solo ubica la zona |
| `p2-apendicitis-ulceracion.webp` | PDF numerado, pág. 42 | 12 · vista 3 | Luz con sangre, mucosa discontinua | Apoyo |
| `p2-apendicitis-neutrofilos.webp` | PDF numerado, pág. 42 | 12 · vista 4 | Pared con muchas células pequeñas | Apoyo; la identificación de neutrófilos es la de la diapositiva |
| `p2-apendicitis-vasos.webp` | PDF numerado, pág. 43 | 12 · vista 5 | Vasos de pared gruesa | Apoyo |
| `p2-apendicitis-serosa.webp` | PDF numerado, pág. 43 | 12 · vista 6 | Borde con material rosado | Apoyo |
| `p2-apendicitis-exudado.webp` | PDF numerado, pág. 43 | 12 · vista 7 | Luz grande con material pálido | Apoyo |
| `p2-colon-nomucinoso-glandulas.webp` | PDF numerado, pág. 47 | 13 · vista 3 | Glándulas irregulares con estroma | Apoyo |
| `p2-colon-nomucinoso-macro-exofitico.webp` | PDF numerado, pág. 46 | 13 · macro | Masa nodular ulcerada con regla | Apoyo; origen no indicado |
| `p2-colon-nomucinoso-macro-estenosante.webp` | PDF numerado, pág. 46 | 13 · macro | Estrechamiento con pared engrosada; rótulo original | Apoyo; rótulo en inglés propio de la imagen |
| `p2-colon-nomucinoso-enema.webp` | PDF numerado, pág. 46 | 13 · radiología | Enema con estrechamiento marcado por flecha | Apoyo; pie de figura original |
| `p2-colon-mucinoso-lagos.webp` | PDF numerado, pág. 50 | 14 · vista 2 | Lagos de mucina | Apoyo |
| `p2-colon-mucinoso-anillo-sello.webp` | PDF numerado, pág. 50 | 14 · vista 3 | Tabiques con motas y células pequeñas | Anillos de sello marcados en la diapositiva no se resuelven |
| `p2-colon-mucinoso-macro-01.webp` | PDF numerado, pág. 49 | 14 · macro | Masa nodular rosada en colon abierto | Apoyo; no demuestra el carácter gelatinoso |
| `p2-colon-mucinoso-macro-02.webp` | PDF numerado, pág. 49 | 14 · macro | Masa tumoral en pieza quirúrgica | Apoyo; no demuestra el carácter gelatinoso |

**Imágenes del PDF unido que no se usaron:** fotos con marca de agencia o crédito (SCIENCEphotoLIBRARY en las págs. 9–10; alamy en la pág. 46) y la foto con rótulo en inglés «Hepatocellular Carcinoma / Adjacent liver»; figuras de publicaciones externas (composición de tres patrones del carcinoma hepatocelular, paneles A/C de Crohn, dibujo de células de Paneth, figura con P/T/D del colon); endoscopías y radiografía del Crohn; seis macros de apendicitis de menos de 270 px; capas de escritura a mano (no son imágenes de tejido). Quedan registradas como pendientes por falta de origen o de resolución.

## 4. Fuente → decisión → destino

| Fuente | Decisión | Destino |
|---|---|---|
| Apunte de cirrosis: «producción de abundante fibrina» | Se enseña **colágeno (tipos I y III)**, como dice la justificación del caso de la misma carpeta; se avisa al alumno que «fibrina» es otra cosa | b08 |
| Apuntes: ascitis por menor albúmina | Se incluye en una frase, con aviso de que la hipertensión portal es tema de otras materias | b08 |
| Casos con preguntas de cirrosis, carcinoma hepatocelular, duodenitis y Crohn | Preguntas reescritas con los mismos datos y respuestas; numeración faltante del original (preguntas 3 en CHC y duodenitis) se completó con el contenido de la clave | b08–b11 |
| Fichas con una sola imagen para duodenitis, Crohn, colon mucinoso y pancreatitis (la segunda página repite la primera) | Una vista de laminario + vistas de apoyo; se avisa en el texto | b10, b11, b14, b15 |
| Ficha de colon no mucinoso (pág. 12 con borde de tumor, pág. 13 con tumor central) | Vista 1 se describe como **borde de la lesión**, vista 2 como tumor; límite explícito | b13 |
| Pancreatitis crónica y adenocarcinoma de páncreas: solo ficha | Se enseña a leer la descripción término a término; **sin** etiología, clínica ni estadificación | b15, b16 |
| Apendicitis, colon, páncreas: no hay casos clínicos | **No se inventaron casos**; preguntas de lámina, conceptuales y V/F | b12–b16 |
| «Asca (+) / Anca (−)» y la nemotecnia «Que ASCO ha Crohn» (apuntes manuscritos) | No se incluyen (apunte de estudiante, fuera de la ficha y sin respaldo en la carpeta) | — |
| Preguntas con voz de prueba | Ninguna frase del alumno habla de «examen»; el rótulo de origen en el banco aclara que no son preguntas de examen | todos |
| Nota «Cómo seguir» del cierre | Se actualizó: ahora cubre los bloques 08 a 16; es el **único** texto de la P1 modificado | cierre |

## 5. Contadores antes → después

| Concepto | `main` | Esta rama |
|---|---|---|
| Bloques `ap2pb` | 7 (`ap2pb01`–`ap2pb07`) | 16 (`ap2pb01`–`ap2pb16`) |
| P1: preguntas (bloque + banco) | 112 + 112 = 224 | 224 (idénticas) |
| P1: flashcards (bloque + mazo + ruleta) | 465 | 465 (idénticas) |
| P2: preguntas nuevas | 0 | 108 (34 de caso o lámina, 18 V/F, 56 conceptuales) × 2 copias (bloque y banco) = 216 |
| P2: flashcards nuevas | 0 | 133 × 3 (bloque, mazo, ruleta) = 399 |
| `quiz-item` total | 224 | 440 |
| `flashcard` total | 465 | 864 |
| `<img>` | 180 | 314 |
| Botones «Ver respuesta» | 196 | 376 |
| Botones V/F | 56 | 128 |
| Ids duplicados | 0 | 0 |

Líneas del archivo contra `main` (diff patience): +4.289, −7: la nota «Cómo seguir» y **seis líneas de la P1 que solo perdieron un atributo de metadato** (`data-guard-previous-stem-sha1`): eran puentes de renombre de enunciados ya corregidos en `main`, apuntaban a enunciados que ya no existen y el Guard los reprobaba como `rename-enunciado-invalido` en cualquier PR que toque el archivo. El texto de esas preguntas no cambió. Contenido de los bloques 01–07, banco P1, mazo P1, ruleta P1 y cierre P1: **sin cambios**.

## 6. Pruebas

Navegador (390 px y 1280 px, servidor local con el CSS real del sitio y `app-core.js` real): 314/314 imágenes cargan; 0 px de desborde horizontal; sin errores de JavaScript; las 108 preguntas nuevas (y las 16 del bloque 07 como control) se resuelven bien con el motor real (opción correcta marcada, V/F correcto). Zoom por toque de las vistas (la imagen crece y vuelve), y los 19 mazos nuevos (9 en los bloques, 9 en el mazo general y la ruleta del Parcial 2) se abren, giran y muestran el total correcto de cartas. Revisión visual de todas las imágenes nuevas hecha antes de escribir los alt.

## 7. Pendientes sin fuente (no validados)

- Originales de Drive (laminario P2 de 49,8 MB y PDFs 07–12) no abiertos: comparar con las copias compactadas.
- Origen de las fotos macroscópicas y del enema: no indicado en la fuente.
- Pancreatitis crónica y adenocarcinoma de páncreas: sin diapositivas; falta material para etiología, clínica y estadificación.
- Casos clínicos para apendicitis, colon mucinoso y no mucinoso, páncreas: no existen en la carpeta.

## 8. Revisión final (27/10/2026)

- Leídos de nuevo los nueve bloques (08–16): voz G0, límites de cada lámina (lo que la imagen no demuestra queda dicho en el bloque), 108 preguntas y 133 tarjetas contra lo que cada bloque enseña antes. Brechas de cobertura cerradas con texto de la fuente (no por suposición).
- Correcciones: «Trampa» → «Error frecuente»; frases de fuente («la ficha describe»); texto de bloque 08 con redacción rota corregida; frase del bloque 09 que era inferencia sin fuente retirada.
- P1 intacta: solo inserciones, la nota «Cómo seguir» y seis atributos de metadato retirados.
- Auditoría independiente de ciencia (Claude 2): recibida después como comentario de la PR; ver §9.
- Pruebas: 108/108 preguntas responden y puntúan (390 y 1280 px), 19 mazos con 133 tarjetas, 314/314 imágenes, 0 px de desborde, sin errores JS; Guard local verde.

## 9. Auditoría independiente de ciencia (Claude 2) · nueve hallazgos

| # | Hallazgo | Resolución |
|---|---|---|
| 1 | Letras de las 90 MCQ (a=31, b=40, c=11, d=8) | **Resuelto.** Solo se reordenaron las alternativas (la correcta cambia de lugar, el contenido no), en el bloque y en el banco, con la misma explicación reescrita con las letras nuevas. Ahora a=22, b=22, c=22, d=24; máxima racha 2; sin «abcd» ni «dcba»; sin ciclos. IDs y orden de preguntas intactos. |
| 2 | «Presuntivo» atribuido a la ficha | **Resuelto.** Se atribuye a la diapositiva «09»; la ficha del laminario solo dice «Duodenitis crónica». Texto, V/F, tabla y tarjetas corregidos. |
| 3 | Islotes («por eso destacan», «grupos de células pálidas rodeados de fibrosis») | **Resuelto.** Queda solo la frase literal de la ficha («aumentados de tamaño»); retirada la explicación sin fuente en texto, tabla, pregunta, tarjeta y error frecuente. |
| 4 | Pregunta «en esta lámina» sobre el tejido que reemplaza al parénquima | **Resuelto.** Reformulada «según la ficha», sin anclar en la imagen. |
| 5 | Restos pálidos = necrosis intraluminal | **Resuelto.** Pasa a hipótesis («podrían corresponder»); la pregunta sobre el «aspecto» del contenido (sin fuente) se sustituyó por una sobre el orden de la descripción de la ficha. |
| 6 | Hepatitis B y C en la lista de causas de cirrosis | **Resuelto.** La diapositiva «07» dice «hepatitis viral» (tipo B); texto, alternativa y tarjeta ajustados. El «C» se conserva solo como factor de riesgo del CHC (deck «08»). |
| 7 | Criptas «se ramifican y cambian de dirección» en la vista 1 de Crohn | **Resuelto.** Pasa a hipótesis; el límite del bloque queda coherente. |
| 8 | Datos correctos pero sin fuente (hemangioma/AFP, Paneth, moco de Brunner, erosión) | **Resuelto.** Cada uno queda marcado como dato de histología/literatura general que no figura en la ficha; ninguno sostiene una pregunta. |
| 9 | Lenguaje «cómo escribir la respuesta» (G0) | **Resuelto.** Encabezado «La ficha completa · órgano, proceso y diagnóstico»; «se escribe»/«consigna» retirados de las cajas, preguntas, V/F y tarjetas; el contenido queda como enseñanza de lo que la ficha dice. |

Límite que sigue: los nueve fueron aplicados contra el texto citado en la auditoría; la paginación de los PDFs compactados y la origen de las 43 imágenes siguen sin comparar con los originales de Drive.

## 10. Auditoría contra los PDFs originales del Drive (28/10/2026)

**Cómo se leyó.** El conector del Drive entrega solo la **capa de texto** de los originales (`Láminas Anatopato 6D - P2.pdf`, 49,8 MB; `07`–`12`, 7–17 MB). Las imágenes y la paginación de los originales **no** se pudieron abrir (el conector no baja archivos grandes y `drive.google.com` directo está bloqueado). Por eso esta auditoría **valida el texto** y **no valida** la correspondencia imagen ↔ página del original.

| Fuente (original, capa de texto) | Hallazgo | Decisión | Destino |
|---|---|---|---|
| Laminario P2 págs. 2, 4, 6, 8, 10, 12, 14, 16, 18 (las 9 fichas) | Las 9 fichas (órgano, proceso, descripción, diagnóstico) coinciden palabra por palabra con las cajas «La ficha completa» de los bloques 08–16. Las págs. 3, 5, 7, 9, 11, 13, 15, 17, 19 son la plantilla en blanco | Sin cambio | `ap2pb08`–`ap2pb16` |
| `07 - Cirrosis hepatica.pdf` | Caso (56 años, 80 g/día, bilirrubina 3,8, albúmina 2,4, INR 1,8, AST/ALT 98/45, plaquetas 85.000), micronodular < 3 mm, Masson y célula de Ito coinciden. La diapositiva dice «Hepatitis Viral» (con una «B» suelta) y «FIBRINA» | Sin cambio (ya tratado: «hepatitis viral», fibrina → colágeno) | `ap2pb08` |
| `08 - Carcinoma hepatocelular.pdf` | Factores de riesgo (VHB y VHC, cirrosis, alcohol, hígado graso, aflatoxina B1, hemocromatosis, α1-antitripsina, Wilson), patrones trabecular, pseudoglandular y compacto, caso (62 años, AFP 850, 4,5 cm, wash-in/wash-out) coinciden | Sin cambio | `ap2pb09` |
| `09 - Duodenitis cronica.pdf` | Diapositiva: «Diagnóstico presuntivo: Duodenitis Crónica»; ficha del laminario sin «presuntivo». Caso (42 años, LIE < 25/100) y claves coinciden | Sin cambio (atribución ya corregida) | `ap2pb10` |
| `10 - Enf crohn.pdf` | Orden de frecuencia (íleon terminal, ciego, delgado, colon, recto), 20 % debut en FID, granulomas en 50–60 %, caso (26 años) y claves coinciden | Sin cambio | `ap2pb11` |
| `11 - Apendicitis aguda.pdf` | Cuatro formas macroscópicas, cuatro hallazgos microscópicos, neutrófilos en la muscular como signo principal y ficha coinciden | Sin cambio | `ap2pb12` |
| `12 - Adenocarcinoma de colon.pdf` | 95 %, 70–80 %, 10–15 %, > 50 %, genes, lesiones predisponentes, derecho/izquierdo y las dos fichas coinciden | Sin cambio | `ap2pb13`, `ap2pb14` |
| Páncreas (pancreatitis crónica, adenocarcinoma) | **Solo** las fichas del laminario (págs. 16 y 18); no hay diapositivas ni caso | Sin cambio (los bloques 15–16 no agregan causas, clínica ni estadificación) | `ap2pb15`, `ap2pb16` |
| Las 43 imágenes (texto alternativo, leyendas, uso) | Ninguna imagen usada en preguntas o tarjetas (21 de 43) lleva rótulo ni pie que dé el diagnóstico. Las dos con texto propio (`p2-colon-nomucinoso-macro-estenosante`: «STENOSING / INFILTRATING»; `p2-colon-nomucinoso-enema`: pie de figura) están **solo en la galería de enseñanza**. Un alt de tarjeta decía «cordones **tumorales**» (`p2-chc-pseudoglandular`) | **Corregido** el alt (3 usos): «cordones de células». Ninguna imagen retirada | `ap2pb09` |

**Lo que NO se pudo comprobar con el original (queda sin prueba):** que cada una de las 43 imágenes corresponda a la página y al diagnóstico del PDF original; la paginación «PDF numerado, pág. N»; la procedencia de las fotos macroscópicas y del enema; el contenido manuscrito o escaneado sin capa de texto. La comparación visual de imágenes sigue pendiente y **no se declara concluida**.
