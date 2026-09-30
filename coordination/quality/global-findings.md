# Painel contínuo de erros globais — Repasso Med

> **READ-ONLY:** registra achados; não corrige matérias, não escreve Supabase e não faz merge.

Atualizado: `2026-09-30T12:48:13.296856+00:00`  
Abertos: **11** · P0 **0** · P1 **3** · P2 **8** · P3 **0**

## Pendências abertas

### P1

- **[anatomia-i] Conflicto no rotulado entre cátedra y Latarjet sobre hiato aórtico (T12 vs T11-T12)** — `science` · validação `UNCERTAIN`
  - Local: Bloque 08, post-it azul (Nota sobre el nivel del hiato aórtico)
  - Evidência: Material dice: 'Con el hiato aórtico ocurre algo parecido a la inversa: la referencia clásica de Latarjet es la VT12, y la cátedra lo describe entre VT11 y VT12'. Luego afirma 'aquí se conserva VT11-VT12'. Pero tabla y flashcards dicen solo 'VT11-VT12' sin aclarar rango vs punto.
  - Motivo: Alumno no queda enterado en tabla principal que hay conflicto Latarjet (T12 puro) vs cátedra (rango). Si cátedra pregunta 'exactamente a qué nivel' y respuesta es T12, alumno con rango puede fallar. Conflicto cátedra×literatura NO está rotulado en la tabla misma, solo en nota posterior.
  - ID: `47fbec5c9c0b61cf`
- **[anatomia-i] Inconsistencia nivel vertebral foramen VCI (T8 vs T9)** — `science` · validação `KEEP`
  - Local: Bloque 08, sección 4 (Los hiatos), tabla comparativa y postit azul
  - Evidência: La tabla dice 'VT8' para foramen de la VCI. El postit azul declara: 'una de las preguntas del cuestionario oficial lo enuncia a nivel de la VT9 dentro de una opción que se da por correcta' pero luego afirma 'Acá se sigue a Latarjet y a las diapositivas: VT8.' Hay conflicto entre lo que dice la cátedra (mencionado como T9 en examen) y lo que el material enseña (T8).
  - Motivo: Alumno estudia T8 pero examen oficial puede usar T9 como correcta según propio material. Confusión directa sobre nivel anatomía. El postit intenta resolver pero crea incertidumbre residual.
  - ID: `06bc5d8a1aa2359e`
- **[anatomia-i] Pregunta oficial Q02-7 con gabarito ambiguo (BLOQUE 02)** — `questions` · validação `KEEP`
  - Local: BLOQUE 02 · Detalles en la sección de preguntas, Q02-7
  - Evidência: Enunciado: 'Marcá la respuesta INCORRECTA' con opciones a), b), c), todas correctas, y d) 'Todas son correctas'. La respuesta es d). Pero la nota honesta del material dice: 'el original de la cátedra incluye además la afirmación «el hueso hioides no posee articulación directa con ningún hueso» —también verdadera— y pide marcar «la incorrecta». Como ninguna de las afirmaciones es falsa, la opción «todas son correctas» funciona aquí como «no hay ninguna incorrecta».' Esta es una ambigüedad del enu
  - Motivo: Una pregunta de examen que dice 'marca la INCORRECTA' pero cuya respuesta correcta es 'Todas son correctas' es confusa por definición. Un estudiante que no lea la nota honesta (que está en el answer reveal, no visible antes) puede marcar mal por lógica gramatical. Aunque el material lo reconoce explícitamente, no debería conservarse así una pregunta ambigua.
  - ID: `fba8b42385b8a83e`

### P2

- **[anatomia-i] Claridad insuficiente sobre 'vena cava' en hiato aórtico (nivel T11-T12 vs mnemotecnia 'aorta 12')** — `consistency` · validação `UNCERTAIN`
  - Local: Bloque 08, postit azul (nota sobre nivel aórtico) y tabla comparativa hiatos
  - Evidência: La mnemotecnia clásica es 'cava 8, esófago 10, aorta 12' (T12 punto). Pero el material dice 'VT11-VT12' para hiato aórtico. El postit aclara 'la referencia clásica de Latarjet es la VT12' pero 'la cátedra lo describe entre VT11 y VT12'. Genera rango donde alumno esperaba un punto único.
  - Motivo: Mnemotecnia memorística clásica vs rango actual enseñado. Alumno que confía en 'aorta 12' puede marcar error si pregunta dice 'exactamente T12' vs 'rango T11-T12'. Inconsistencia entre referencias internas.
  - ID: `51c9f40fead17916`
- **[anatomia-i] Conflicto de castellano en bloque 06: 'esternebras de Blainville' vs. literatura estándar** — `consistency` · validação `UNCERTAIN`
  - Local: Bloque 06, sección 2, párrafo sobre cara anterior del esternón
  - Evidência: El texto usa 'esternebras de Blainville' con definición glossada, pero esta nomenclatura no es estándar en anatomía española/hispanoamericana. La literatura anatómica clásica (Gray, Moore, Latarjet) los denomina simplemente 'centros de osificación' o 'núcleos de osificación esternales', sin el epónimo de Blainville.
  - Motivo: Si bien 'Blainville' aparece en algunas referencias francesas antiguas, su uso aquí sin justificación cátedra vs. literatura crea ambigüedad. El texto no aclara si es nomenclatura local o si la cátedra exige este término específico. Puede generar confusión en estudiantes que consulten bibliografía estándar.
  - ID: `deceef50b1221dcb`
- **[anatomia-i] Contradicción entre SVG y texto sobre ejes/planos** — `consistency` · validação `KEEP`
  - Local: Figura SVG 'Los tres planos y los tres ejes' (a1_b01_02_planos_y_ejes.webp) vs. tabla de ejes
  - Evidência: En la tabla se define eje transverso como 'Laterolateral · horizontal' y 'Perpendicular a los planos **sagitales**'. Pero en la nota rmc-note se lee: 'el eje transverso es **transversal y vertical**, y el eje que le es perpendicular es el **transverso**, no el sagital.' Esta frase es contradictoria consigo misma ('eje transverso es perpendicular al eje transverso').
  - Motivo: Aparente error en redacción de la nota aclaratoria. Debería decir 'el plano sagital es anteroposterior y vertical, y el eje que le es perpendicular es el transverso'. La frase actual crea confusión lógica.
  - ID: `601e4129737fc0eb`
- **[anatomia-i] Densidad extrema en tabla de contenido mediastínico (sección 5)** — `consistency` · validação `UNCERTAIN`
  - Local: Bloque 05, sección 5, tabla 'Contenido del mediastino, órgano por órgano'
  - Evidência: La tabla tiene 14 filas con estructura + compartimiento + bloque de estudio. Algunas celdas son confusas: 'Aorta ascendente y arco aórtico' está en 'Medio (ascendente) y superior (arco)' — el 'ascendente' está en el medio pero el arco está en superior, lo que obliga a releer. Además, la tabla promete ordenarse 'por estructura justamente para que sirva con cualquiera de las dos divisiones' pero después dice 'Leela por compartimiento', generando contradicción interna.
  - Motivo: Un estudiante que memoriza por fila puede terminar confundiendo 'aorta ascendente/arco' como una sola estructura cuando son dos. Y la instrucción de lectura ('por compartimiento' vs. 'por estructura') no es coherente con el formato presentado.
  - ID: `4aa5ed0c3edcfd4e`
- **[anatomia-i] Incertidumbre explícita sobre número de piezas del aparato valvular sin resolución clara** — `consistency` · validação `UNCERTAIN`
  - Local: Sección 6.1 · Aparato valvular auriculoventricular, nota al pie de figura
  - Evidência: El texto dice: 'algunos materiales agrupan las comisuras dentro de las valvas y hablan de cuatro; respondé con el número de tu material'. Esto deja al estudiante en incertidumbre sobre qué responder en examen.
  - Motivo: Aunque la intención es reconocer pluralismo, la instrucción 'respondé con el número de tu material' es una abdicación de estándar. Si hay duda legítima, debe resolverse indicando cuál definición usa la cátedra local, no dejar al estudiante adivinar.
  - ID: `ccb0dcfb6898d8d2`
- **[anatomia-i] Metatexto de estudo/interface ainda presente** — `alma` · validação `deterministic`
  - Local: anatomia-i
  - Evidência: Padrão Cómo estudiar/usar encontrado
  - Motivo: A regra global #147 manda ir direto ao conteúdo real.
  - ID: `6ca7789a3ba8b0ad`
- **[anatomia-i] Nomenclatura dual de géneros sin jerarquía clara (BLOQUE 03)** — `consistency` · validação `UNCERTAIN`
  - Local: BLOQUE 03 · Tabla 4.2 y flashcards finales
  - Evidência: Cada género tiene dos nombres: 'Esferoidea [enartrosis]', 'Elipsoidea [condílea]', etc. El material no explicita cuál es el nombre preferido o si ambos son equivalentes. En respuestas de examen (Q03-4) se usa indistintamente 'articulación esferoidea' y 'articulación glenohumeral', pero la tabla solo lista 'escapulohumeral'.
  - Motivo: En una pregunta de examen, un estudiante podría marcar erróneamente si el enunciado usa un sinónimo no presentado en la tabla. Aunque la diversidad terminológica es reflejo de la realidad anatómica, necesita una etiqueta explícita ('nombres equivalentes') o una jerarquía ('se prefiere X, también llamado Y').
  - ID: `7f7eae056d284c5a`
- **[biologia] Metatexto de estudo/interface ainda presente** — `alma` · validação `deterministic`
  - Local: biologia
  - Evidência: Padrão Cómo estudiar/usar encontrado
  - Motivo: A regra global #147 manda ir direto ao conteúdo real.
  - ID: `5a97372eeb17593c`

## Regra de uso

Achado aceito vira tarefa separada de correção. Nunca corrigir dentro desta PR de painel. Fechamento continua humano.

## Últimas execuções

- `2026-09-30T12:48:13.296856+00:00` · **anatomia-i** · faixa `['416442:546496', '546496:629210']` · candidatos 15 · mantidos 1 · incertos 3
- `2026-09-29T18:49:13.631410+00:00` · **anatomia-i** · faixa `['201062:294515', '294515:416442']` · candidatos 14 · mantidos 0 · incertos 2
- `2026-09-29T13:08:11.084202+00:00` · **anatomia-i** · faixa `['0:88206', '88206:201062']` · candidatos 19 · mantidos 2 · incertos 1
