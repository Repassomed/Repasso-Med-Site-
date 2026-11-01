# Toxicología · Prova P2 (nuevo PDF de 31/oct/2026) · integración según 8-A · versión final

Fuente: Drive → Site Repasso Med → Biblioteca → 7 semestre → Toxicologia (Dr Bellon) → Provas → `Prova P2.pdf` (id `1nc5_pkHG2mSbZArIfT8AtUeGm1Kr32kp`, 16 páginas).
Base: `main` con #622 incluida (`30636848`). Nada de layout, caneta, audio ni archivos globales fue tocado.

## 1. Inventario de la fuente (8-A.5-B)

| Páginas | Qué es | Legibilidad | Observación |
|---|---|---|---|
| 3, 4, 5, 8 | Fotos de la «Evaluación Prueba Parcial Teórica» (versiones A y B, Qs 1–5). La p. 4 trae respuestas resaltadas en amarillo | CLARA (p. 4, 8) · PARCIAL (p. 3, 5: baja resolución) | las marcas amarillas coinciden con la clave de la página |
| 6, 7 | Versión C (Qs 6–17, con 3 preguntas abiertas) | PARCIAL (foto oblicua, baja resolución). La Q13 y la Q14 de la p. 7 se releyeron ampliadas | la Q14 dice literalmente «marque la alternativa **correcta**» |
| 1, 2, 9, 10 | Versión D (Qs 6–17). Las pp. 1 y 2 son la misma hoja que 10 y 9, con marcas rojas | CLARA (9, 10) · CLARA con tachaduras (1, 2) | las tachaduras no se interpretaron |
| 11–16 | Transcripción mecanografiada «Toxicologia p2 · Gabriel Rueda» (preguntas abiertas con respuestas del estudiante, portugués y español mezclados) | CLARA | **fuente auxiliar**, no prueba independiente |

Rótulos: las preguntas que salen sólo de la transcripción llevan **«Pregunta complementaria»**; ninguna pregunta de esta PR se presenta como de examen.

## 2. Resultado

El PDF cubre casi por completo lo que la página ya tenía (las versiones A–D son otras fotos de las mismas pruebas). De **84 ítems**: **2 incluidos** (en **2 preguntas nuevas**), **72 descartados por repetición** y **10 pendientes**. Ninguna pregunta existente fue reformulada ni unida (8-A.1-B): «unida a existente» = 0.

| | Antes (`main`) | Después |
|---|---|---|
| Preguntas en los bloques | 349 | **351** (+2) |
| Preguntas en el banco general (espejo) | 349 | **351** |
| Total de ítems `quiz-item` | 698 | **702** |
| «Basada en preguntas de examen» (cuerpo) | 90 (86 + 4 V/F) | **90** (sin cambios) |
| «Pregunta complementaria» (cuerpo) | 259 | **261** |
| Bloque 04 / 07 / 08 | 23 / 22 / 24 | **24 / 23 / 24** |
| Flashcards | 1416 | 1416 |
| IDs antiguos de preguntas | 698 | 698 presentes y sin cambios en enunciado, alternativas, clave ni explicación |
| Divergencias cuerpo × banco | 0 | 0 |

Contagens declaradas actualizadas: encabezados de los bloques 04 («Veinticuatro preguntas») y 07 («Veintitrés»); el bloque 08 no cambia; subtítulos del banco «(24 preguntas)» y «(23 preguntas)»; cabecera del banco: 351 preguntas, 316 de opción múltiple, 35 V/F. Inventario del layout: 702 preguntas, 1416 flashcards.

## 3. Lo que entró

| Pregunta nueva | Bloque | Rótulo | Origen | Cobertura previa (8-A.2) |
|---|---|---|---|---|
| `q-b04q24` cómo se diagnostica la intoxicación por acetona y qué se monitoriza | 04 | Complementaria | transcripción D5 | **faltaba**: se añadió el párrafo «Acetona: cómo se confirma» (historia clínica; acetona en orina y sangre; creatinina, gasometría, glucemia, electrolitos, función hepática), de la Clase 4.1 de la cátedra |
| `q-b07q23` compromiso sistémico del accidente botrópico (latencia de ~30 min, coagulopatía hasta la incoagulabilidad) | 07 | Complementaria | transcripción T8 | ya enseñado (tarjeta «El destructor» y tabla «Lo sistémico») |

Las dos entran al final de su bloque y, con el mismo texto y `-bk` en el id, al final de la sección del bloque en el banco. Claves: c y a. Distribución global del cuerpo: a 80 · b 79 · c 79 · d 78 · V/F 35.

## 4. Retiradas en esta versión final (revisión de la #623)

La primera versión incluía otras dos preguntas, **retiradas del bloque y del banco**:

- **Q14 de la p. 7 (grupos de riesgo del escorpión).** La foto ampliada dice «marque la alternativa **correcta**» con las opciones Ancianos · Niños mayores de 10 años · (cortada) · Personas que presentan comorbilidades. Según el slide (Clase 8) tres de ellas son grupos de riesgo y «niños mayores de 10 años» no lo es (el slide dice «niños pequeños»): no hay respuesta única y la clave no figura en la foto. La versión anterior la reformulaba como «incorrecta» y la presentaba como de examen; eso no es fiel a 8-A.4/8-A.5-B. No existe una versión con respuesta única que sea fiel a la prueba → **pendiente**.
- **Q13 de la p. 7 (acetona, «excepto»).** La opción d («trastornos endocrinos importantes, páncreas y tiroides») sólo sería la falsa si la cátedra o la literatura base lo afirmaran. El slide (Clase 4.1) no la menciona, pero la ausencia no prueba falsedad (y el mismo slide manda monitorizar glucemia y gasometría). Además la opción b («vía principal de intoxicación», sin «laboral») es verdadera sólo en el ámbito laboral, y la foto no trae clave (la flecha sobre c es una marca del estudiante). Sin fuente permitida que sostenga una única respuesta → **pendiente**.

Consecuencias: las ítems de la transcripción relacionados (E8 grupos de riesgo, D3 toxicocinética) pasan a **pendiente / decisión editorial** (el resumo ya los enseña; sería posible una pregunta complementaria con redacción propia, que no se añadió), y D2 (riesgo de la acetona) queda como repetición de q-b04q02, q-b04q15 y q-b04q24.

## 5. Divergencias registradas (sin corregir en silencio)

- **Q9 de la versión C (p. 6):** la opción «uso de antibióticos de forma profiláctica» y la opción «incisión» serían ambas falsas según la página; se conserva `q-b07q08`, que no tiene esa ambigüedad.
- **Compresa en la picadura de araña marrón:** el slide dice «compresa tibia» en la lista de conducta y «compresas frías» en el tratamiento leve; la página sigue «frías».
- **Taturana (transcripción E14–E15):** «compresa fría, mantener elevada, no aplicar crema» y «2 a 10 ampollas, primeras 12 horas» no coinciden con el slide (no frotar ni pomadas; 5 / 10 / 20 ampollas; «lo antes posible»). La página sigue el slide.

## 6. Pendientes (no se inventó respuesta) — 10

1. p. 7 Q13 (acetona «excepto»): ver §4.
2. p. 7 Q14 (grupos de riesgo): ver §4.
3. p. 10 Q17 (V/F): el enunciado no nombra el agente.
4. Transcripción A2′ «araña con forma de violín»: sin respaldo en los slides ni en la página.
5. Transcripción A6 «cuadro clínico de la araña marrón»: respuesta incoherente.
6. Transcripción E8 «grupos de riesgo del escorpión»: decisión editorial.
7. Transcripción E15 «indicación del suero antilonómico»: diverge del slide.
8. Transcripción D1′ «primera causa de muerte de 1 a 4 años»: sin fuente en los slides.
9. Transcripción D3 «toxicocinética de la acetona»: decisión editorial (ninguna pregunta evalúa la vida media).
10. Transcripción H2 «hipnosedante de elección en crisis convulsiva»: contradice la página.

## 7. Matriz página × pregunta del PDF → destino y decisión

| Página | Item do PDF | Decisão | Destino / motivo |
|---|---|---|---|
| 4 | Q1 suero antielapídico: ¿en qué serpiente? (versión A, respuestas resaltadas en amarillo) | Descartada por repetição | duplicata exata de q-b07q01 |
| 4 | Q2 manejo inicial ofídico: lo que NO se puede hacer | Descartada por repetição | duplicata exata de q-b07q02 |
| 4 | Q3 pruebas de laboratorio, excepto (perfil glicémico/amilasas) | Descartada por repetição | duplicata exata de q-b07q03 |
| 4 | Q4 foseta loreal, excepto (introducir el veneno) | Descartada por repetição | duplicata exata de q-b07q04 |
| 4 | Q5 araña marrón moderada a severa: conducta | Descartada por repetição | duplicata exata de q-b08q01 |
| 3 | Q1 araña caranguejeira: opción correcta (versión B) | Descartada por repetição | duplicata exata de q-b08q02 |
| 3 | Q2 veneno crotálico, manifestaciones neurológicas sistémicas | Descartada por repetição | duplicata exata de q-b07q09 |
| 3 | Q3 serpientes con foseta loreal | Descartada por repetição | duplicata exata de q-b07q05 |
| 3 | Q4 pruebas de laboratorio en accidentes con taturanas (estudios de coagulación) | Descartada por repetição | duplicata semântica de q-b08q15 (patrón de laboratorio de la lonomiasis) |
| 3 | Q5 araña marrón moderada a severa (alternativas en otro orden) | Descartada por repetição | duplicata exata de q-b08q01 |
| 8 | Q1–Q5 (misma versión B, otra fotografía) | Descartada por repetição | mismas cinco de la p. 3: q-b08q02, q-b07q09, q-b07q05, q-b08q15, q-b08q01 |
| 5 | Q1–Q3 (araña caranguejeira, crotálico, foseta loreal; foto de baja resolución) | Descartada por repetição | q-b08q02, q-b07q09, q-b07q05 |
| 5 | Q4 lo que NO define la letalidad de una serpiente (colores llamativos) | Descartada por repetição | duplicata exata de q-b07q21 |
| 5 | Q5 taturana: cuadro en el lugar del contacto | Descartada por repetição | duplicata exata de q-b08q24 |
| 6 | Q6 clasificación en tres grupos (crotálicos, elapídicos, botrópicos) | Descartada por repetição | duplicata exata de q-b07q06 |
| 6 | Q7 escorpión amarillo, primeros auxilios, excepto (compresas calientes) | Descartada por repetição | duplicata exata de q-b08q03 |
| 6 | Q8 mordedura de serpiente no identificada: suero | Descartada por repetição | duplicata exata de q-b07q07 |
| 6 | Q9 tratamiento general de mordeduras, excepto (versión con «antibióticos de forma profiláctica» y «incisión») | Descartada por repetição | duplicata semântica de q-b07q08. Nota: en esta versión dos opciones («antibióticos profilácticos» e «incisión») serían falsas según la página; la página conserva la versión sin ambigüedad |
| 6 | Q10 intoxicación por benzodiacepinas (clonazepam): qué indicar | Descartada por repetição | duplicata exata de q-b16q01 |
| 6 | Q11 pruebas de laboratorio, excepto (perfil lipídico) | Descartada por repetição | duplicata semântica de q-b07q03 |
| 7 | Q12 niño con pila botón en vías respiratorias: conducta | Descartada por repetição | duplicata exata de q-b04q04 |
| 7 | Q13 acetona: afirmaciones ciertas, excepto (vida media / vapores / SNC / trastornos endocrinos) | Pendente | RETIRADA de la PR. (1) la foto se lee bien («son ciertas… excepto») pero no trae clave: la flecha sobre la opción c es una marca del estudiante, no una corrección; (2) la opción d («trastornos endocrinos importantes (páncreas y tiroides)») sólo sería falsa si la cátedra o la literatura base lo dijeran: el slide (Clase 4.1) no la menciona y, además, manda monitorizar glucemia y gasometría, de modo que la ausencia en el slide no prueba falsedad; (3) la opción b («vía principal de intoxicación», sin «laboral») es verdadera sólo en el ámbito laboral. No hay fuente permitida que sostenga una única respuesta |
| 7 | Q14 grupos de riesgo del escorpión amarillo (lectura de la foto ampliada: «marque la alternativa correcta»; a. Ancianos · b. Niños mayores de 10 años · c. (cortada) · d. Personas que presentan comorbilidades) | Pendente | RETIRADA de la PR (la versión anterior la reformulaba como «incorrecta» y la presentaba como de examen). Tal como está escrita, pide la «correcta», pero según el slide (Clase 8) al menos tres de las cuatro opciones son grupos de riesgo (ancianos, alérgicos, enfermedades preexistentes), y «niños mayores de 10 años» no lo es (el slide dice «niños pequeños»): no hay respuesta única y la clave de la prueba no figura en la foto. No existe una versión fiel con respuesta única |
| 7 | Q15 intoxicación por cloro inhalatoria: conducta (pregunta abierta) | Descartada por repetição | q-b04q01 |
| 7 | Q16 conducta ante picadura de araña marrón (abierta; respuesta manuscrita ilegible) | Descartada por repetição | q-b08q06 y q-b08q01 |
| 7 | Q17 conducta ante accidente con taturanas (abierta) | Descartada por repetição | q-b08q17 |
| 9 | Q6 veneno que produce rabdomiólisis con mioglobina (versión D) | Descartada por repetição | duplicata semântica de q-b07q11 (crotoxina → rabdomiólisis → mioglobina → necrosis tubular) |
| 9 | Q7 función de la foseta loreal | Descartada por repetição | duplicata semântica de q-b07q04 y q-b07q05 |
| 9 | Q8 escorpión amarillo: síntoma no característico | Descartada por repetição | duplicata exata de q-b08q23 |
| 9 | Q9 paciente rural con necrosis, equimosis, ampollas y sangrado gingival: suero | Descartada por repetição | duplicata semântica de q-b07q07 |
| 9 | Q10 antídoto en accidentes graves con taturanas | Descartada por repetição | duplicata semântica de q-b08q14 y q-b08q17 |
| 9 | Q11 organoclorados: tratamiento (sin antídoto) | Descartada por repetição | duplicata exata de q-b05q07 |
| 9 | Q12 niño con veneno para ratas (warfarina): conducta (vitamina K) | Descartada por repetição | duplicata exata de q-b05q08 |
| 9 | Q13 paracetamol: otro recurso además de las medidas iniciales (N-acetilcisteína) | Descartada por repetição | duplicata semântica de q-b06q06 |
| 10 | Q14 suero antielapídico: ¿en qué serpiente? | Descartada por repetição | duplicata exata de q-b07q01 |
| 10 | Q15 tres características para diagnosticar organoclorados (abierta) | Descartada por repetição | q-b05q14 y q-b05q07 |
| 10 | Q16 verdadero/falso: araña marrón, dolor inicial intenso | Descartada por repetição | duplicata semântica de q-b08q09 (dolor inicial leve) |
| 10 | Q17 verdadero/falso: «efecto secundario cardiovascular… congestión por retención de agua y sodio» (el enunciado no nombra el agente) | Pendente | no se puede determinar el agente ni la respuesta; el contexto parece cortado. Si fuera de AINE, el bloque 06 ya enseña la retención de agua y sodio (q-b06q19) |
| 1 | Q14–Q17 de la versión D (misma hoja que la p. 10, con marcas rojas) | Descartada por repetição | mismas decisiones de la p. 10. Las marcas rojas sobre la Q15 no tienen significado conocido y no se usaron |
| 2 | Q6–Q13 de la versión D (misma hoja que la p. 9, con marcas rojas) | Descartada por repetição | mismas decisiones de la p. 9. Las tachaduras rojas sobre Q11–Q13 no se interpretaron como anulación |
| 11 | T1 definición de ofidismo | Descartada por repetição | flashcard «Ofidismo: definición» y resumo del bloque 07; valor evaluativo bajo como pregunta |
| 11 | T2–T3 géneros de Viperidae y Elapidae | Descartada por repetição | q-b07q05, q-b07q06, q-b07q01 |
| 11 | T4–T5 serpiente con foseta loreal y definición | Descartada por repetição | q-b07q04, q-b07q05 |
| 11 | T6 clasificación de los venenos (acciones) | Descartada por repetição | q-b07q06, q-b07q09, q-b07q11, q-b07q15 y resumo «Los tres venenos» |
| 11 | T7 antiveneno si no se conoce el tipo de serpiente | Descartada por repetição | q-b07q20 |
| 11 | T7′ cuadro clínico local botrópico | Descartada por repetição | q-b07q07 |
| 11 | T8 manifestaciones sistémicas botrópicas (latencia de ~30 min, coagulopatía) | Incluída | q-b07q23 (cuerpo del bloque 07 + banco), «Pregunta complementaria» |
| 11 | T9 pruebas de laboratorio del accidente botrópico | Descartada por repetição | q-b07q10 y q-b07q03 |
| 11 | T10 tratamiento general botrópico (prednisona, antibióticos) | Descartada por repetição | q-b07q08 |
| 12 | T11 crotálico: hidratación, diuresis osmótica, diuréticos | Descartada por repetição | q-b07q12 y q-b07q13 |
| 12 | T12 elapídico: manejo inicial | Descartada por repetição | q-b07q02, q-b07q14, q-b07q18 |
| 12 | A1 arañas más frecuentes en Paraguay y su género | Descartada por repetição | q-b08q04, q-b08q12, q-b08q22 (una por araña) y resumo |
| 12 | A2 araña con priapismo | Descartada por repetição | q-b08q20 y q-b08q22 |
| 12 | A2′ araña con forma de violín en el dorso | Pendente | no figura en los slides de la cátedra (Clase 8) ni en la página; sólo en la transcripción. Se puede confirmar con literatura, pero no hay evidencia de cobranza |
| 12 | A3 loxoscelismo: dos variedades clínicas | Descartada por repetição | q-b08q04 y q-b08q05 |
| 12 | A4 tratamiento de la araña marrón | Descartada por repetição | q-b08q01 y q-b08q06 |
| 12 | A5 caranguejeira (Theraphosidae): característica y comportamiento | Descartada por repetição | q-b08q02. El comportamiento (nocturnas, carnívoras, poco agresivas) no está en el slide: no se incorporó |
| 12 | A6 «cuadro clínico de la araña marrón» (la respuesta transcripta mezcla músculos estriados y contacto con pelos) | Pendente | respuesta incoherente (mezcla Loxosceles con caranguejeira); el cuadro correcto ya está en q-b08q04, q-b08q05, q-b08q09 |
| 13 | A7 conducta tras picadura de araña marrón | Descartada por repetição | q-b08q06 y resumo. Divergencia del slide: «compresa tibia» en la conducta y «compresas frías» en el tratamiento leve; la página sigue «frías» (tratamiento) sin cambios |
| 13 | A6′ qué NO hacer (torniquete) | Descartada por repetição | resumo del bloque 08 y q-b07q18 |
| 13 | A7′ tratamiento de la caranguejeira | Descartada por repetição | q-b08q02 |
| 13 | E8 grupos de riesgo del escorpión amarillo (pregunta abierta de la transcripción) | Pendente | el resumo ya enseña los cinco grupos (tabla del bloque 08). Una pregunta complementaria con redacción propia sería posible, pero se deja a decisión de José: no se añadió para no presentar como de examen algo que no lo es |
| 13 | E9 síntomas del escorpión amarillo | Descartada por repetição | q-b08q23 y q-b08q08 |
| 13 | E10 cómo se administra el suero antiescorpiónico | Descartada por repetição | q-b08q10 ya incluye 15 gotas/min o 50 mL/h durante 1 h, misma dosis, renovable 2 veces cada 5 h |
| 13 | E11 prevención del escorpión amarillo | Descartada por repetição | q-b08q18 (regla de las cuatro A) y resumo |
| 13 | E12 nombre científico de la taturana (Lonomia) | Descartada por repetição | q-b08q07, q-b08q14, q-b08q17 |
| 13 | E13 síntomas y signos de la taturana | Descartada por repetição | q-b08q24 y q-b08q16 |
| 14 | E14 tratamiento de la taturana | Descartada por repetição | q-b08q17. Divergencia: la transcripción dice «compresa fría, mantener elevada, no aplicar crema»; el slide dice «no frotar, no aplicar pomadas caseras ni alcohol». La página sigue el slide |
| 14 | E15 indicación del suero antilonómico («2 a 10 ampollas», «primeras 12 horas») | Pendente | divergencia con el slide (5 / 10 / 20 ampollas según gravedad, «lo antes posible»; q-b08q14). No se incorporó; revisar con la cátedra si José quiere |
| 14 | D1 cómo prevenir accidentes domésticos | Descartada por repetição | q-b04q12, q-b04q16, q-b04q17 |
| 14 | D1′ primera causa de muerte en niños de 1 a 4 años: accidentes domésticos | Pendente | no está en los slides de la cátedra (Clases 4.1 y 4.2) ni en la página; falta fuente |
| 14 | D2 riesgo de la acetona | Descartada por repetição | q-b04q02, q-b04q15, q-b04q24 y resumo del bloque 04 |
| 14 | D3 toxicocinética de la acetona (absorción rápida, excreción sin transformar, vida media 20–30 h) | Pendente | el resumo ya lo enseña y q-b04q02 menciona la excreción sin transformar, pero ninguna pregunta evalúa la vida media; podría ser una pregunta complementaria (slide Clase 4.1). Queda a decisión de José: no se añadió tras retirar la Q13 |
| 14 | D4 síntoma clásico de la acetona (aliento dulzón) | Descartada por repetição | q-b04q02 |
| 14 | D5 diagnóstico de la intoxicación por acetona | Incluída | q-b04q24 + párrafo nuevo «Acetona: cómo se confirma» en el bloque 04 (slide Clase 4.1) |
| 14 | D6 dónde se encuentra el yodo | Descartada por repetição | q-b04q03 y resumo |
| 15 | D7 síntomas de la intoxicación por cloro | Descartada por repetição | resumo del bloque 04 (lista ya enseñada); las preguntas del bloque evalúan la conducta |
| 15 | D8 ingestión de cloro y no puede deglutir a la hora: conducta | Descartada por repetição | q-b04q06 |
| 15 | D9 paciente asintomático 2 h después de ingerir cloro | Descartada por repetição | q-b04q10 y q-b04q06 |
| 15 | D10 conductas por vía tras intoxicación por cloro | Descartada por repetição | q-b04q01, q-b04q13, q-b04q14 |
| 15 | D11 pila botón: vía aérea / esófago / estómago | Descartada por repetição | q-b04q04 y q-b04q05 |
| 15 | H1 por qué no inducir el vómito en benzodiacepinas | Descartada por repetição | q-b02q23 y q-b02q09 (principio del bloque 02: riesgo de broncoaspiración en depresión del SNC) |
| 15 | H2 hipnosedante de elección en crisis convulsiva (la transcripción dice barbitúricos) | Pendente | la transcripción contradice lo que enseña la página (benzodiacepinas con uso en convulsiones; barbitúricos con acción anticonvulsivante) y no se sabe qué pidió la prueba; no se incorporó |
| 15–16 | H3 antídoto de las benzodiacepinas (flumazenilo) | Descartada por repetição | q-b16q01, q-b16q08, q-b16q17 |

## 8. Alumnos y datos (consulta de solo lectura al Supabase)

`user_highlights`, `user_notes` y `user_ink_strokes` con `subject_slug='toxicologia'`: **0 filas**. No hay grifos, notas ni trazos que proteger. El único texto ya existente que se tocó fue una inserción (párrafo nuevo en el bloque 04, antes de «Conducta ante ingesta de acetona»).

## 9. Pruebas (versión final)

- `verify` contra la `main`: ids nuevos = 4 (`q-b04q24`, `q-b07q23` y sus copias `-bk`); claves de las preguntas viejas, flashcards, clases, enlaces y atributos iguales.
- Preservación: 698 ids antiguos presentes; enunciado, alternativas, clave y explicación idénticos; banco antiguo conservado (multiconjunto); espejo cuerpo × banco = **0 divergencias** (351 = 351); flashcards 1416 = 1416.
- Navegador (1440 y 390 px): las 2 preguntas nuevas, en cuerpo y banco (4 copias), tienen 4 alternativas; al tocar una incorrecta se marca «wrong» y la correcta «correct» según la clave; 0 errores de JavaScript.
- Porta de layout/caneta (7 etapas): 7/7. Inventario regenerado (702 preguntas, 1416 flashcards; 0 desactualizados).
- Guard local: ver la PR.

## 10. Limitaciones

- Las fotos de las pp. 3, 5, 6 y 7 son de baja resolución; las alternativas se leyeron con la mejor lectura posible.
- La transcripción de las pp. 11–16 es fuente auxiliar; por eso sus preguntas llevan rótulo «complementaria».
- Revisión semántica G0 hecha por mí; no sustituye una auditoría independiente.
