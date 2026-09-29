# Painel contínuo de erros globais — Repasso Med

> **READ-ONLY:** registra achados; não corrige matérias, não escreve Supabase e não faz merge.

Atualizado: `2026-09-29T18:49:13.631410+00:00`  
Abertos: **26** · P0 **6** · P1 **11** · P2 **9** · P3 **0**

## Pendências abertas

### P0

- **[anatomia-i] HTML possivelmente desbalanceado: <div>** — `html` · validação `deterministic`
  - Local: anatomia-i
  - Evidência: aberturas=9680, fechamentos=9679
  - Motivo: Pode quebrar layout/componentes.
  - ID: `c6359d8577908760`
- **[anatomia-i] HTML possivelmente desbalanceado: <section>** — `html` · validação `deterministic`
  - Local: anatomia-i
  - Evidência: aberturas=38, fechamentos=37
  - Motivo: Pode quebrar layout/componentes.
  - ID: `7d4af1103987c1ec`
- **[anatomia-i] IDs HTML duplicados** — `html` · validação `deterministic`
  - Local: anatomia-i
  - Evidência: tab-anato1
  - Motivo: Pode quebrar âncoras/navegação/annotation-safety.
  - ID: `4e6075b23973b7a4`
- **[farmacologia-ii] HTML possivelmente desbalanceado: <div>** — `html` · validação `deterministic`
  - Local: farmacologia-ii
  - Evidência: aberturas=5649, fechamentos=5648
  - Motivo: Pode quebrar layout/componentes.
  - ID: `ccf98ddef44edeed`
- **[farmacologia-ii] HTML possivelmente desbalanceado: <section>** — `html` · validação `deterministic`
  - Local: farmacologia-ii
  - Evidência: aberturas=19, fechamentos=18
  - Motivo: Pode quebrar layout/componentes.
  - ID: `20a9c1fb05229c09`
- **[farmacologia-ii] IDs HTML duplicados** — `html` · validação `deterministic`
  - Local: farmacologia-ii
  - Evidência: tab-farmaco2
  - Motivo: Pode quebrar âncoras/navegação/annotation-safety.
  - ID: `ec978e9c70d11ad7`

### P1

- **[anatomia-i] Pregunta oficial Q02-7 con gabarito ambiguo (BLOQUE 02)** — `questions` · validação `KEEP`
  - Local: BLOQUE 02 · Detalles en la sección de preguntas, Q02-7
  - Evidência: Enunciado: 'Marcá la respuesta INCORRECTA' con opciones a), b), c), todas correctas, y d) 'Todas son correctas'. La respuesta es d). Pero la nota honesta del material dice: 'el original de la cátedra incluye además la afirmación «el hueso hioides no posee articulación directa con ningún hueso» —también verdadera— y pide marcar «la incorrecta». Como ninguna de las afirmaciones es falsa, la opción «todas son correctas» funciona aquí como «no hay ninguna incorrecta».' Esta es una ambigüedad del enu
  - Motivo: Una pregunta de examen que dice 'marca la INCORRECTA' pero cuya respuesta correcta es 'Todas son correctas' es confusa por definición. Un estudiante que no lea la nota honesta (que está en el answer reveal, no visible antes) puede marcar mal por lógica gramatical. Aunque el material lo reconoce explícitamente, no debería conservarse así una pregunta ambigua.
  - ID: `fba8b42385b8a83e`
- **[anatomia-patologica-ii] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: anatomia-patologica-ii
  - Evidência: b) Rotura de un conducto de una glándula salival con salida de saliva al estroma conjuntivo; por eso la cavidad no tiene revestimiento epitelial y el moco queda rodeado de tejido d
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `7e97d481a7a8b2b9`
- **[anatomia-patologica-ii] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: anatomia-patologica-ii
  - Evidência: d) El adenoma pleomorfo, cerca del 60% ; hay que resecarlo con un margen de glándula, porque emite prolongaciones a través de la cápsula y la enucleación deja nidos que recidivan .
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `8f2452a287b7ed46`
- **[anatomia-patologica-ii] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: anatomia-patologica-ii
  - Evidência: d) La hiperplásica , porque su placa blanca no se desprende al raspado y por lo tanto no se puede separar clínicamente de una leucoplasia.
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `b86f1f8d1580ed48`
- **[anatomia-patologica-ii] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: anatomia-patologica-ii
  - Evidência: b) Masas exofíticas o polipoideas que protruyen hacia la luz y la obstruyen; lesiones ulceradas de centro necrótico con bordes sobreelevados e indurados; y placas infiltrantes plan
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `0ca8be81b30a744b`
- **[biologia] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: biologia
  - Evidência: d) Ante alta glucosa, las células beta del hígado sintetizan insulina
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `6d27bd6a190ec618`
- **[ortopedia] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: ortopedia
  - Evidência: b) Grupo heterogéneo de condiciones que afectan la integridad del cartílago articular , con compromiso del hueso subcondral y de los márgenes articulares.
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `602689631de7415e`
- **[ortopedia] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: ortopedia
  - Evidência: d) Disminución del espacio articular (pinzamiento).
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `3c417cc90060bbff`
- **[ortopedia] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: ortopedia
  - Evidência: c) Es avascular y carece de inervación : por eso repara muy mal y el cartílago gastado no duele por sí mismo .
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `c6c63c9caa73f0e7`
- **[ortopedia] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: ortopedia
  - Evidência: c) Clasificación de Kellgren-Lawrence .
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `9bd9e5b144d5834c`
- **[ortopedia] Uma única alternativa tem destaque visual** — `questions` · validação `deterministic`
  - Local: ortopedia
  - Evidência: a) Derrame mecánico : líquido claro y viscoso, con menos de 2 000 leucocitos por mm³.
  - Motivo: Pode denunciar o gabarito antes da interação.
  - ID: `1de7aaa2da725f79`

### P2

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
- **[anatomiapatologica-ii] Metatexto de estudo/interface ainda presente** — `alma` · validação `deterministic`
  - Local: anatomiapatologica-ii
  - Evidência: Padrão Cómo estudiar/usar encontrado
  - Motivo: A regra global #147 manda ir direto ao conteúdo real.
  - ID: `e63b89b5ecf554dd`
- **[biologia] Metatexto de estudo/interface ainda presente** — `alma` · validação `deterministic`
  - Local: biologia
  - Evidência: Padrão Cómo estudiar/usar encontrado
  - Motivo: A regra global #147 manda ir direto ao conteúdo real.
  - ID: `5a97372eeb17593c`
- **[ortopedia] Metatexto de estudo/interface ainda presente** — `alma` · validação `deterministic`
  - Local: ortopedia
  - Evidência: Padrão Cómo estudiar/usar encontrado
  - Motivo: A regra global #147 manda ir direto ao conteúdo real.
  - ID: `d38c9aece1f1c798`
- **[toxicologia] Metatexto de estudo/interface ainda presente** — `alma` · validação `deterministic`
  - Local: toxicologia
  - Evidência: Padrão Cómo estudiar/usar encontrado
  - Motivo: A regra global #147 manda ir direto ao conteúdo real.
  - ID: `54ff6c08d08bafbd`

## Regra de uso

Achado aceito vira tarefa separada de correção. Nunca corrigir dentro desta PR de painel. Fechamento continua humano.

## Últimas execuções

- `2026-09-29T18:49:13.631410+00:00` · **anatomia-i** · faixa `['201062:294515', '294515:416442']` · candidatos 14 · mantidos 0 · incertos 2
- `2026-09-29T13:08:11.084202+00:00` · **anatomia-i** · faixa `['0:88206', '88206:201062']` · candidatos 19 · mantidos 2 · incertos 1
