# Semiología II · #647 · revisión completa frente a «Slides atualizados» (Semiología II)

Fecha: 2026-11-10 (revisada 11/11) · Base: `main` `7f329241` · rama `claude/charming-maxwell-ah7nxj-semio2-647`. **PRs abiertas verificadas antes de editar:** ninguna toca `semiologia-ii.html` (abiertas: #650 Fisiopatología II, #649 Farmacología II, #648 y #640 Anatopatología II, #645/#644 Nova Era Fisio II y Farmaco II, #643, #634–#636, #539, #520).

## 1. Fuentes
Carpeta Drive «Semiologia II › Slides atualizados» (`1jNBIVRwwqEWDPyhLOMTgU79vHOyqRpAd`): los 9 PDF de abajo (leídos página por página con `pdftotext`; 236 páginas con texto) + 4 imágenes `.webp` de apoyo (`01-cinco-cuadros…`, `02-perfil-clinico…`, `03-ippa-auscultacion`, `04-examen-confirma-apoya`; ya son recursos de la matéria, sin cambios). Material cardiovascular: 06, 07 y 08; guía de respuestas: 09 (41 diapositivas de respuestas del repaso). No hay Drive de Semiología II con libros legibles (Argente y Harrison, citados en las bibliografías, no están en el Drive): **las afirmaciones se confrontaron con los slides y la guía de la cátedra; el libro no pudo consultarse.**

## 2. Supabase (solo lectura, 10/11/2026) — `semiologia-ii`
Grifos: `s2-b01` 93 · `s2-b02` 14 · `s2-b03` 4 · `s2-b06` 20 · `s2-banco` 17 · `s2-guia` 4 (+ 1 en `semiologia` introduccion-semio, otra matéria). Trazos: `s2-b01` 24 + 1 (anclaje `s2-b01>19`), `s2-b03>1` 1. Notas: **0**. Sin marcas: b04, b05, b07, b08, b09, b10, tablas y flashcards. **Regla:** los 6 bloques con marcas quedan **byte a byte idénticos** (prueba automática); solo se editó en bloques sin marcas, y solo con **inserciones** (el texto anterior sigue íntegro y en orden). Los grifos del banco son de palabra suelta con ocurrencia (p. ej. «un», 33.ª): añadir preguntas en medio del banco los desplazaría → **no se agregaron preguntas**.

## 3. Resultado por bloque
**Bloques alterados: b07, b08 y b09** (los tres sin grifos ni trazos). **Idénticos a la main:** b01, b02, b03, b04, b05, b06, b10, banco, guía, compendio y flashcards. (Una versión anterior de este registro y de la PR decía a la vez que b08 estaba alterado y que estaba idéntico; lo correcto es: b08 está alterado.)
| Bloque | Slides | Ya adecuado | Cambió | Pendiente |
|---|---|---|---|---|
| b01 Motivo respiratorio (93 grifos, 25 trazos) | 01 | Ordem do deck, «desde cero», tablas, 17 preguntas | **Nada** (protegido) | — |
| b02 Síndrome infeccioso (14 grifos) | 01 | Sí | **Nada** | — |
| b03 Obstructivo (4 grifos, 1 trazo) | 02 | Sí (antiproteasa, bronquiectasia, comparación) | **Nada** | — |
| b04 Parenquimatoso | 03 | Sí: filtros de defensa, atelectasia, NAC/nosocomial, CURB-65 | Nada | — |
| b05 Pleurales | 05 | Sí: Light, neumotórax, tabla de 3 síndromes | Nada | — |
| b06 Cardíaco (20 grifos) | 06, 09 | Síntomas, dolor, lipotimia, edema | **Nada** (protegido) | 3 propuestas (ver abajo) |
| b07 IC (0 grifos, 0 trazos) | 07, 09 | Muy completo (bajo gasto, Framingham, NYHA, RHY, estudios) | **+ sección «El examen físico en tres preguntas»** (congestión/hipoperfusión/causa, llenado capilar), altura de la yugular sobre el ángulo esternal, «pre-IC»; líneas B de Kerley: «perpendiculares a la pleura» (guía diap. 15). Frases revisadas para no ser absolutas | — |
| b08 HTA (**alterado**; 0 grifos, 0 trazos) | 06, 09 | Clasificación, Korotkoff, agujero auscultatorio, órganos blanco | **Pauta única de preparación de la toma de PA**, según la clase actualizada: 5 min de reposo; 30 min sin cafeína, tabaco ni ejercicio; piernas descruzadas; sin hablar; 2 lecturas separadas por 1 min y promediadas. Se corrigió en los 3 lugares donde aparecía (cuadro «la lista completa», tarjeta «Paso 0» y párrafo de la clasificación) y se **eliminó** la nota «dos versiones del mismo apunte» (60 min de ejercicio y 3–5 min de reposo ya no figuran) | — |
| b09 ECG (0 grifos, 0 trazos) | 08, 09 | Conducción, papel, FC, derivaciones, territorios | **+ «Cómo se lee el ritmo: ¿es sinusal?»** (criterios «en general», arritmia sinusal, pierna derecha como tierra en el registro convencional, aVR) | — |
| b10 Gástrico | (sin slide en la carpeta) | — | Nada | Sin fuente en «Slides atualizados»: no verificable aquí |
| Compendio | 09 | Tablas por unidad | **Nada.** La tabla «Cómo se construye una respuesta completa» (metadidáctica) se **retiró**; del guía solo se integró conocimiento clínico en el tema correspondiente (ver abajo) | — |

**Preguntas y flashcards (8-A):** 120 preguntas en los bloques = 120 en el banco (espejo íntegro); 366 flashcards (172 en el mazo general) sin cambios; ninguna eliminada. La guía cubre casos ya preguntados (Framingham, NYHA, Korotkoff, bata blanca, hiperaldosteronismo, RHY, territorios del ECG). **Sin pregunta hoy** (propuestas para cuando se pueda tocar el banco sin desplazar grifos, p. ej. migrando grifos con script): líneas B de Kerley y progresión radiológica (cefalización → intersticial → alas de mariposa), lipotimia vs. síncope, cálculo de FC (300/1500; irregular ×10 en 6 s), criterios de ritmo sinusal (el teaching ya está en b09), edema 3+/4+.

## 4. Pendientes por protección (no se tocó texto con marcas)
1. **b06 · slide 06 p.5** (nocturia y disnea de esfuerzo), **p.16** (edema en encamado y de origen linfático), **p.17** (cianosis acral; calentar las extremidades antes de valorar la cianosis): proponer 3 líneas al final de b06 tras migrar/confirmar los 20 grifos.
2. Preguntas nuevas de la guía (arriba): requieren migrar los 17 grifos del banco.
3. **b10 Gástrico:** sin slide en la carpeta; sin verificación.
4. Libros no consultables.

## 5. Nota de la guía (diap. 24)
La guía avisa que la línea «clasificá causas: espontáneo primario/secundario, traumático, iatrogénico» pertenece al neumotórax y no a la placa de edema intersticial; el b05/b07 ya las separan. Divergencias detectadas: ejercicio previo a la toma de PA (30 min en la clase actualizada × 60 min en el texto anterior) — señalada en b08, no se sobrescribió.

## 6. Registro por slide (236 páginas)
Cobertura por términos: % de palabras de ≥5 letras de la página que aparecen en los bloques correspondientes (es una verificación automática, no un juicio didáctico): ≥ 0.75 → «Ya existía»; las demás se revisaron a mano (listas de términos ausentes): casi todas son vocabulario de consigna, portada, bibliografía o paráfrasis. «Mejorado» = cambio de esta PR; «Pendiente» = protegido por marcas.

### 01 - Motivo de Consulta Respiratorio y Sindrome Infeccioso.pdf — `1cbUQHXrqVd-wqmAdheF3mV8ey_6pIBF1` · 2026-08-30 · 23 págs. → b01 + b02

| Slide | Título | Cobertura por términos | Estado |
|---|---|---|---|
| 1 | Hospital Universitario | 0.54 | Portada |
| 2 | AL FINALIZAR ESTA CLASE, EL ESTUDIANTE SERÁ CAPAZ DE | 0.70 | Objetivos/uso |
| 3 | PARTE 1 | 1.00 | Ya existía |
| 4 | UNO DE LOS MOTIVOS DE CONSULTA MÁS FRECUENTES | 0.88 | Ya existía |
| 5 | SEGÚN EL TIEMPO DE DURACIÓN | 1.00 | Ya existía |
| 6 | SEGÚN SUS CARACTERÍSTICAS | 0.98 | Ya existía |
| 7 | ELIMINACIÓN ANORMAL DE SECRECIONES (>100 ML/DÍA) | 0.85 | Ya existía |
| 8 | FALTA O SED DE AIRE | 0.87 | Ya existía |
| 9 | MEDICAL RESEARCH COUNCIL MODIFICADA | 0.86 | Ya existía |
| 10 | CLASIFICACIÓN | 1.00 | Ya existía |
| 11 | ACTIVIDAD | 0.72 | Actividad de aula: el contenido que usa ya existía |
| 12 | SIGNOS DE ALARMA RESPIRATORIA | 0.81 | Ya existía |
| 13 | PARTE 2 | 1.00 | Ya existía |
| 14 | ANTES DE EMPEZAR — ACTIVIDAD | 0.57 | Actividad de aula: el contenido que usa ya existía |
| 15 | TAMBIÉN CONOCIDA COMO BRONQUITIS | 0.83 | Ya existía |
| 16 | SEGÚN SU DURACIÓN | 0.88 | Ya existía |
| 17 | COMPARACIÓN | 1.00 | Ya existía |
| 18 | BRONQUITIS | 0.97 | Ya existía |
| 19 | RESPUESTA INFLAMATORIA DEL ÁRBOL BRONQUIAL POR INFECCIÓN | 0.97 | Ya existía |
| 20 | ASÍ SE EXPLICA EL CUADRO QUE ACABAN DE VER | 0.70 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 21 | EXCLUYENDO OTRAS CAUSAS CON CUADRO CLÍNICO SEMEJANTE | 0.71 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 22 | ACTIVIDAD FINAL — INTEGRACIÓN | 0.56 | Actividad de aula: el contenido que usa ya existía |
| 23 | SÍNTESIS DE LA CLASE | 0.40 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 24 | — | — | Sin texto (imagen/separador) |

### 02 - Sindromes Obstructivos Asma EPOC.pdf — `1zyyr5dACaSD3SdkQ6Mv8rGftw7Xk-9Wf` · 2026-08-30 · 31 págs. → b03

| Slide | Título | Cobertura por términos | Estado |
|---|---|---|---|
| 1 | Hospital Universitario | 0.17 | Portada |
| 2 | AL FINALIZAR ESTA CLASE, EL ESTUDIANTE SERÁ CAPAZ DE | 0.70 | Objetivos/uso |
| 3 | DOS ENFERMEDADES, UN MISMO GRUPO | 0.74 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 4 | PARTE 1 | 1.00 | Ya existía |
| 5 | EMPECEMOS POR LO QUE SE OBSERVA | 0.78 | Ya existía |
| 6 | SEGÚN LA GRAVEDAD DEL EPISODIO | 0.88 | Ya existía |
| 7 | NO TODA SIBILANCIA ES ASMA | 0.84 | Ya existía |
| 8 | ASÍ SE EXPLICA LO QUE ACABAN DE VER | 0.76 | Ya existía |
| 9 | EL ASMA NO ES UNA SOLA ENFERMEDAD | 0.81 | Ya existía |
| 10 | PREGUNTA RELÁMPAGO | 0.62 | Actividad de aula: el contenido que usa ya existía |
| 11 | ENDÓGENOS Y DESENCADENANTES | 0.94 | Ya existía |
| 12 | PATRÓN ORO PARA CONFIRMAR OBSTRUCCIÓN | 1.00 | Ya existía |
| 13 | CUANDO LA ESPIROMETRÍA NO BASTA | 0.89 | Ya existía |
| 14 | EVALUADO EN LAS ÚLTIMAS 4 SEMANAS | 0.84 | Ya existía |
| 15 | ACTIVIDAD — DEBATE EN SUBGRUPOS | 0.60 | Actividad de aula: el contenido que usa ya existía |
| 16 | PARTE 2 | — | Sin texto (imagen/separador) |
| 17 | EMPECEMOS POR LO QUE SE OBSERVA | 0.71 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 18 | TABAQUISMO COMO PROTAGONISTA | 0.96 | Ya existía |
| 19 | MINI-DEBATE — 2 POSTURAS | 0.57 | Actividad de aula: el contenido que usa ya existía |
| 20 | EL SUBTIPO MÁS DESTRUCTIVO DEL EPOC | 0.82 | Ya existía |
| 21 | ENFISEMA PULMONAR | 0.90 | Ya existía |
| 22 | DOS FENOTIPOS CLÍNICOS CLÁSICOS | 0.97 | Ya existía |
| 23 | CASO CORTO | 0.80 | Ya existía |
| 24 | RADIOGRAFÍA DE TÓRAX EN EL ENFISEMA | 0.88 | Ya existía |
| 25 | ACTIVIDAD — LECTURA DE IMAGEN | 0.44 | Actividad de aula: el contenido que usa ya existía |
| 26 | AHORA SÍ: ASÍ SE EXPLICA EL CUADRO | 0.97 | Ya existía |
| 27 | EL MECANISMO DETRÁS DE LO QUE ACABAN DE EXAMINAR | 0.68 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 28 | CONFIRMACIÓN FUNCIONAL | 0.83 | Ya existía |
| 29 | LA COMPARACIÓN CLAVE DE LA CLASE | 0.67 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 30 | ACTIVIDAD FINAL — SIMULACIÓN | 0.66 | Actividad de aula: el contenido que usa ya existía |
| 31 | SÍNTESIS DE LA CLASE | 0.26 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 32 | — | — | Sin texto (imagen/separador) |

### 03 - Sindrome_Parenquimatoso_Pulmonar_SM_II.pdf — `1vfAlln4WNElLFNPOerWpX2-LRPDtLB70` · 2026-09-24 · 17 págs. → b04

| Slide | Título | Cobertura por términos | Estado |
|---|---|---|---|
| 1 | Hospital Universitario | 0.40 | Portada |
| 2 | A L F I N A L I Z A R E S TA C L A S E , E L E S T U D I A N | 0.55 | Objetivos/uso |
| 3 | CUANDO EL PULMÓN DEJA DE SER AÉREO | 0.60 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 4 | LA CAUSA MÁS COMÚN DE SÍNDROME DE CONDENSACIÓN | 0.76 | Ya existía |
| 5 | Q U I É N E S T I E N E N M AY O R R I E S G O | 0.83 | Ya existía |
| 6 | AGENTES CAUSALES | 0.86 | Ya existía |
| 7 | P R E S E N TA C I Ó N C L Í N I C A | 0.68 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 8 | NEUMONÍA | 0.92 | Ya existía |
| 9 | ACTIVIDAD — RAZONAMIENTO CLÍNICO | 0.58 | Actividad de aula: el contenido que usa ya existía |
| 10 | CLÍNICA + IMAGEN | 0.79 | Ya existía |
| 11 | CONSOLIDACIÓN Y BRONCOGRAMA AÉREO | 0.77 | Ya existía |
| 12 | S I G N O D E L A S I L U E TA Y PAT R Ó N I N T E R S T I C | 0.71 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 13 | CONSOLIDACIÓN Y BRONCOGRAMA AÉREO | 0.68 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 14 | — | — | Sin texto (imagen/separador) |
| 15 | ¿ A LTA A M B U L AT O R I A O I N T E R N A C I Ó N ? | 0.61 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 16 | ACTIVIDAD FINAL — CASO CLÍNICO | 0.54 | Actividad de aula: el contenido que usa ya existía |
| 17 | SÍNTESIS DE LA CLASE | 0.32 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 18 | — | — | Sin texto (imagen/separador) |

### 04 - Actividad de Revision PARA P1.pdf — `18XKX0fcAcdxQzoBP5qfHkc52HFrucnYw` · 2026-09-24 · 39 págs. → banco + b01–b05

| Slide | Título | Cobertura por términos | Estado |
|---|---|---|---|
| 1 | REPASEMOS | 0.48 | Actividad de aula: el contenido que usa ya existía |
| 2 | INSTRUCCIONES | 0.61 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 3 | ORIENTACIÓN | 0.70 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 4 | ESTACIÓN 1 | 0.82 | Ya existía |
| 5 | MOTIVOS DE CONSULTA | 0.88 | Ya existía |
| 6 | MOTIVOS DE CONSULTA | 0.83 | Ya existía |
| 7 | MOTIVOS DE CONSULTA | 0.77 | Ya existía |
| 8 | ESTACIÓN 2 | 0.88 | Ya existía |
| 9 | SÍNDROME INFECCIOSO | 0.78 | Ya existía |
| 10 | SÍNDROME INFECCIOSO | 0.84 | Ya existía |
| 11 | SÍNDROME INFECCIOSO | 0.81 | Ya existía |
| 12 | ESTACIÓN 3 | 0.90 | Ya existía |
| 13 | ASMA | 0.89 | Ya existía |
| 14 | ASMA | 0.85 | Ya existía |
| 15 | ASMA | 0.65 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 16 | EPOC | 0.92 | Ya existía |
| 17 | EPOC / ENFISEMA | 0.89 | Ya existía |
| 18 | PLACAS | 0.83 | Ya existía |
| 19 | ESTUDIOS | 0.83 | Ya existía |
| 20 | EPOC | 0.88 | Ya existía |
| 21 | ESTACIÓN 4 | 0.91 | Ya existía |
| 22 | NEUMONÍA | 0.87 | Ya existía |
| 23 | NEUMONÍA | 0.79 | Ya existía |
| 24 | NEUMONÍA | 0.93 | Ya existía |
| 25 | PLACAS | 0.87 | Ya existía |
| 26 | NEUMONÍA | 0.65 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 27 | NEUMONÍA | 0.81 | Ya existía |
| 28 | ESTACIÓN 5 | 0.88 | Ya existía |
| 29 | NEUMOTÓRAX | 0.90 | Ya existía |
| 30 | PLACAS | 0.88 | Ya existía |
| 31 | NEUMOTÓRAX | 0.84 | Ya existía |
| 32 | NEUMOTÓRAX | 0.82 | Ya existía |
| 33 | INTEGRACIÓN | 0.82 | Ya existía |
| 34 | CIERRE ACTIVO | 0.83 | Ya existía |
| 35 | CLAVES | 0.90 | Ya existía |
| 36 | CLAVES | 0.90 | Ya existía |
| 37 | CLAVES | 0.91 | Ya existía |
| 38 | CLAVES | 0.88 | Ya existía |
| 39 | CIERRE | 0.83 | Ya existía |
| 40 | — | — | Sin texto (imagen/separador) |

### 05 - Sindromes_Pleurales_Semiologia_II_.pdf — `1vqrwvAYlw3Ck0uK84lCmwcw53gsFebX3` · 2026-09-24 · 24 págs. → b05

| Slide | Título | Cobertura por términos | Estado |
|---|---|---|---|
| 1 | Hospital Universitario | 0.62 | Portada |
| 2 | A L F I N A L I Z A R E S TA C L A S E , E L E S T U D I A N | 0.63 | Objetivos/uso |
| 3 | D O S S Í N D R O M E S , U N M I S M O E S PA C I O | 0.86 | Ya existía |
| 4 | PA RT E 1 | 0.71 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 5 | E M P E C E M O S P O R L O Q U E S E O B S E R VA | 0.82 | Ya existía |
| 6 | D E L H E M I T Ó R A X A L A A U S C U L TA C I Ó N | 0.93 | Ya existía |
| 7 | AS Í SE EX PL I CA L O Q UE ACA BA N D E EX AM I NAR | 0.81 | Ya existía |
| 8 | E S P O N T Á N E O , T R A U M ÁT I C O O I A T R O G É N I | 0.84 | Ya existía |
| 9 | R AD I OG R AF Í A D E TÓR AX E N E L N EUM OTÓ RA X | 0.83 | Ya existía |
| 10 | AC T I V I D AD — L EC T U R A D E I M AGE N | 0.56 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 11 | N O T O D A H I P E R T R A N S PA R E N C I A E S N E U M O | 0.92 | Ya existía |
| 12 | PA RT E 2 | 0.88 | Ya existía |
| 13 | E M P E C E M O S P O R L O Q U E S E O B S E R VA | 0.90 | Ya existía |
| 14 | SÍ ND R OM E D E I N TE RP OSI C I Ó N L Í Q U I DA | 0.91 | Ya existía |
| 15 | AH O RA SÍ : ASÍ S E E XP LI CA EL CUAD R O | 0.72 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 16 | L A C A U S A O R I E N TA L A N A T U R A L E Z A D E L L Í | 0.80 | Ya existía |
| 17 | S E G Ú N E L C O N T E N I D O D E L E S PA C I O P L E U R | 0.73 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 18 | I M AG EN O LO GÍ A D EL D E RR AM E P LE U R AL | 0.85 | Ya existía |
| 19 | D E LA M ECÁNIC A A LA IM AGEN | 0.82 | Ya existía |
| 20 | AC T I V I D AD — L EC T U R A D E I M AGE N | 0.70 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 21 | CUAND O SE AN ALIZ A E L LÍQ UID O PLE UR AL | 0.74 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 22 | L A P E R C U S I Ó N O R I E N TA A N T E S D E L A I M A G | 0.90 | Ya existía |
| 23 | ACT IVID AD FINA L — SIM UL ACIÓN | 0.57 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 24 | SÍNT ES IS D E LA CL ASE | 0.34 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 25 | — | — | Sin texto (imagen/separador) |

### 06 - Motivo de consulta cardio y HTA.pdf — `1dV7cPhfy5DkQ4uKISKAmQ1c4_fofc5OO` · 2026-10-22 · 30 págs. → b06 + b08

| Slide | Título | Cobertura por términos | Estado |
|---|---|---|---|
| 1 | Hospital Universitario | 0.54 | Portada |
| 2 | A L F I N A L I Z A R E S TA C L A S E , E L E S T U D I A N | 0.60 | Objetivos/uso |
| 3 | S E I S M O T I V O S O R I E N TA N E L I N T E R R O G AT  | 0.84 | Ya existía |
| 4 | PA R T E 1 | 0.88 | Ya existía |
| 5 | L A P O S I C I Ó N Y E L E S F U E R Z O O R I E N TA N L A | 0.71 | **Pendiente** → nocturia y disnea de esfuerzo (b06, 20 grifos): propuesta de 2 líneas |
| 6 | LA CLASE FUNCIONAL NO DEFINE LA ETIOLOGÍA | 0.84 | Ya existía |
| 7 | ACTIVIDAD — ANAMNESIS DIRIGIDA | 0.62 | Actividad de aula: el contenido que usa ya existía |
| 8 | E L C A R Á C T E R , L A D U R A C I Ó N Y L O S M O D I F  | 0.88 | Ya existía |
| 9 | E L I N T E R R O G AT O R I O D E F I N E E L PAT R Ó N | 0.76 | Ya existía |
| 10 | L O S M O D I F I C A D O R E S AY U D A N A D I F E R E N C | 0.85 | Ya existía |
| 11 | A C T I V I D A D — T R E S PAT R O N E S | 0.80 | Ya existía |
| 12 | E L I N I C I O Y E L F I N A L A P O R TA N E L D AT O M Á  | 0.83 | Ya existía |
| 13 | P R I M E R O , I D E N T I F I C A R S I H AY R I E S G O | 0.95 | Ya existía |
| 14 | PÉRDIDA TRANSITORIA DE CONCIENCIA | 0.92 | Ya existía |
| 15 | L A R E C U P E R A C I Ó N E S U N A C L AV E S E M I O LÓ  | 0.98 | Ya existía |
| 16 | L A D I S T R I B U C I Ó N Y E L H O R A R I O O R I E N TA | 0.74 | **Pendiente** → edema en encamado/linfático (b06): propuesta |
| 17 | E L S I T I O Y L A T E M P E R AT U R A P E R M I T E N D I | 0.54 | **Pendiente** → cianosis acral y calentamiento de extremidades (b06): propuesta |
| 18 | ACTIVIDAD — INTEGRACIÓN RÁPIDA | 0.65 | Actividad de aula: el contenido que usa ya existía |
| 19 | PA R T E 2 | 0.78 | Ya existía |
| 20 | EL DIAGNÓSTICO REQUIERE MEDICIONES REPETIDAS | 0.77 | **Mejorado** → b08 (ya traía ESC/AHA; sin cambio) |
| 21 | U N A T É C N I C A I N C O R R E C TA C A M B I A L A C L A | 0.78 | **Mejorado** → b08 técnica de medición (clase actualizada) |
| 22 | M É T O D O A U S C U LTAT O R I O | 0.81 | Ya existía |
| 23 | C R I T E R I O S A H A / A C C 2 0 2 5 PA R A A D U LT O S | 0.83 | Ya existía |
| 24 | E L R I E S G O R E S U LTA D E L A I N T E R A C C I Ó N P  | 0.76 | Ya existía |
| 25 | L A M AY O R Í A E S P R I M A R I A ; A L G U N O S D AT O  | 0.81 | Ya existía |
| 26 | EL EXAMEN BUSCA CAUSA, RIESGO Y DAÑO | 0.77 | Ya existía |
| 27 | L A H TA P U E D E S E R S I L E N C I O S A H A S TA P R O  | 0.93 | Ya existía |
| 28 | C A D A E S T U D I O R E S P O N D E U N A P R E G U N TA C | 0.80 | Ya existía |
| 29 | ACTIVIDAD FINAL — CASO INTEGRADOR | 0.55 | Actividad de aula: el contenido que usa ya existía |
| 30 | SÍNTESIS DE LA CLASE | 0.38 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 31 | — | — | Sin texto (imagen/separador) |

### 07 - Insuficiencia Cardiaca.pdf — `1aVA2MHX3DjcOiuQPDV5PVIXFoAKL3DVw` · 2026-10-22 · 19 págs. → b07

| Slide | Título | Cobertura por términos | Estado |
|---|---|---|---|
| 1 | Hospital Universitario | 0.30 | Portada |
| 2 | A L F I N A L I Z A R E S TA C L A S E , E L E S T U D I A N | 0.63 | Objetivos/uso |
| 3 | UN SÍNDROME CON DOS EXPRESIONES HEMODINÁMICAS | 0.75 | Ya existía |
| 4 | DEFINICIÓN CLÍNICA DEL SÍNDROME | 0.80 | Ya existía |
| 5 | E L E S TA D I O D E S C R I B E L A E V O L U C I Ó N D E L | 0.79 | **Mejorado** → b07 «pre-IC» |
| 6 | DEL HALLAZGO AL TERRITORIO AFECTADO | 0.78 | Ya existía |
| 7 | UNA DESCOMPENSACIÓN SUELE TENER UN DESENCADENANTE | 0.69 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 8 | L A N Y H A M I D E L I M I TA C I Ó N F U N C I O N A L | 0.71 | Actividad de aula: el contenido que usa ya existía |
| 9 | C RI T E RI O S C LÁ SI CO S D E A POYO C LÍ N I CO | 0.86 | Ya existía |
| 10 | EL EXAMEN LOCALIZA LA CONGESTIÓN | 0.77 | Ya existía |
| 11 | LA YUGULAR REFLEJA LA PRESIÓN AURICULAR DERECHA | 0.83 | **Mejorado** → b07 altura sobre el ángulo esternal |
| 12 | E L E X A M E N D E B E R E S P O N D E R T R E S P R E G U  | 0.97 | **Mejorado** → b07 sección «tres preguntas» |
| 13 | L O S H A L L A Z G O S TA M B I É N T I E N E N D I A G N Ó | 0.97 | Ya existía |
| 14 | PEDIR ESTUDIOS CON UNA PREGUNTA CLÍNICA | 0.74 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 15 | LA RADIOGRAFÍA MUESTRA LA PROGRESIÓN DE LA CONGESTIÓN | 0.81 | Ya existía |
| 16 | E C O C A R D I O G R A M A Y B I O M A R C A D O R E S C O  | 0.66 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 17 | Objetivo | — | Sin texto (imagen/separador) |
| 18 | ACTIVIDAD FINAL — CASO INTEGRADOR | 0.57 | Actividad de aula: el contenido que usa ya existía |
| 19 | SÍNTESIS DE LA CLASE | 0.29 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 20 | — | — | Sin texto (imagen/separador) |

### 08 - ECG Interpretacion.pdf — `1n9CTpFl9978_Nryc0T1OM3Ghj-xEPci9` · 2026-10-22 · 27 págs. → b09

| Slide | Título | Cobertura por términos | Estado |
|---|---|---|---|
| 1 | 6.º Semestre · A-B-C-D-E-F-G-H-I | 0.27 | Portada |
| 2 | ELECTROCARDIOGRAMA | 0.43 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 3 | Electrocardiograma | 0.84 | Ya existía |
| 4 | Electrofisiología | 0.58 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 5 | Cual es la importancia de conocer | 0.77 | Ya existía |
| 6 | Ondas, complejos, segmentos e intervalos | 0.84 | Ya existía |
| 7 | Ondas, complejos, segmentos e intervalos | 0.86 | Ya existía |
| 8 | Ondas, complejos, segmentos e intervalos | 0.93 | Ya existía |
| 9 | ELECTROCARDIOGRAMA | 0.56 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 10 |  El papel es termosensible (el estilo se | 0.60 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 11 | ONDA P Ondas, complejos, segmentos e intervalos | 0.82 | Ya existía |
| 12 | ECG - Pasos  Asegurar de tener el equipo listo y papel carg | 0.48 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 13 | Derivaciones electrocardiográficas | 0.64 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 14 | Derivaciones bipolares - Padrones | 0.67 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 15 | Derivaciones aumentadas | 0.70 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 16 | Derivaciones precordiales | 0.85 | Ya existía |
| 17 | V1 – Cruzamiento entre LPD X 4to EIC | — | Sin texto (imagen/separador) |
| 18 | Derivaciones precordiales adicionales - Posteriores | 1.00 | Ya existía |
| 19 | Cada cara del corazon es explorada por | 0.85 | Ya existía |
| 20 | ELECTROCARDIOGRAMA | 0.29 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 21 | Las fuerzas eléctricas del | 0.55 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 22 | Deflexión - Deflexión + | 0.70 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 23 |  Buscar la estandarización y la Derivación aVR Todas las on | 0.63 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 24 |  En el trazo del ECG, existe en nro 300 y su multiplos que | 0.63 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 25 | • Onda P antes del complejo | 0.70 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 26 |  Eje cardiaco | 0.70 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 27 | — | — | Sin texto (imagen/separador) |
| 28 | — | — | Sin texto (imagen/separador) |

### 09 - Guia_de_respuestas_e_interpretacion_Segunda_Parcial.pdf — `1TgIlhFoHg0kMQZlb5D4mgqvwgjx8ioJb` · 2026-11-05 · 17 págs. → b06–b09 + compendio

| Slide | Título | Cobertura por términos | Estado |
|---|---|---|---|
| 1 | GUÍA DE RESPUESTAS E | 0.39 | Objetivos/uso |
| 2 | Cómo utilizar esta guía | 0.73 | **Mejorado** → compendio: estructura de respuesta |
| 3 | ESTACIÓN 1 | 0.80 | Ya existía |
| 4 | Cas Interpretación Datos que justifican | 0.83 | Ya existía |
| 5 | ESTACIÓN 2 | 0.71 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 6 | Diapositiva 12. Caso de hipertensión primaria | 0.81 | Ya existía |
| 7 | Diapositiva 15. Líneas B de Kerley | 0.73 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 8 | ESTACIÓN 3 | 0.84 | Ya existía |
| 9 | Diapositiva 19. Falla anterógrada y retrógrada | 0.86 | Ya existía |
| 10 | Objetivo Estudio Qué aporta | 0.78 | Ya existía |
| 11 | Diapositiva 25. Placa de edema agudo de pulmón | 0.83 | Ya existía |
| 12 | Diapositiva 29. Integración de los tres patrones | 0.78 | Ya existía |
| 13 | ESTACIÓN 4 | 0.72 | Ya existía (paráfrasis; términos ausentes revisados a mano) |
| 14 | Diapositiva 32. Ondas, intervalos y segmentos | 0.83 | **Mejorado** → b09 ritmo sinusal / arritmia sinusal |
| 15 | Diapositiva 36. Derivaciones de los miembros | 0.90 | **Mejorado** → b09 pierna derecha = tierra |
| 16 | Diapositiva 39. Lectura inicial del ECG mostrado | 0.73 | Actividad de aula: el contenido que usa ya existía |
| 17 | Síntesis final para el estudio | 0.69 | **Mejorado** → compendio: respuesta completa |
| 18 | — | — | Sin texto (imagen/separador) |


## 7. Revisión del 11/11/2026
- **Preparación de la toma de PA (b08):** la clase actualizada (slide 06 p. 21) dice «sin cafeína, tabaco ni ejercicio 30 min antes · reposo 5 min · piernas descruzadas · sin hablar · dos lecturas separadas por 1 min · promediar». El texto anterior traía 3–5 min de reposo y 60 min sin ejercicio, y además una nota «dos versiones del mismo apunte». Ahora hay **una sola pauta** (la de la clase) en el cuadro, en la tarjeta «Paso 0» y en el párrafo; no queda la versión de 60 min ni la nota. La guía de respuestas (diap. 9) coincide en reposo previo, vejiga vacía, sin hablar, espalda apoyada, pies en el piso, brazo a la altura del corazón, manguito apropiado y promedio de lecturas repetidas. **Libro:** Argente/Harrison no están en el Drive, así que no pudo confrontarse con literatura; queda registrado.
- **Tabla metadidáctica retirada:** «Cómo se construye una respuesta completa» (compendio) ya no existe en la página del alumno. Conocimiento clínico de la guía que faltaba e integrado en su tema: «perpendiculares a la pleura» (líneas B, b07), pierna derecha como tierra y criterios de ritmo sinusal (b09). El resto de la guía (edema 3+/4+, lipotimia, estudios iniciales de la HTA, hiperaldosteronismo, órganos diana, RHY, Framingham, NYHA) ya estaba en los bloques.
- **Afirmaciones absolutas matizadas (confrontadas con slide 07 p. 5/11/12, slide 08 p. 14–15/23 y guía diap. 13/35/36):** «siempre en este orden» → «conviene… en este orden» (la clase dice «el examen debe responder tres preguntas»); «Los estadios avanzan en un solo sentido» → «Según esta clasificación…» (lo dice el slide); «es sinusal cuando se cumplen cuatro condiciones» → «se considera sinusal cuando se cumplen, en general…»; pierna derecha → «en el registro convencional de 12 derivaciones…»; aVR → «conviene revisar primero si los electrodos están bien colocados» (el slide: «todas las ondas deben estar invertidas en aVR a menos que las derivaciones estén mal colocadas»); la elevación yugular «orienta» y se interpreta con el cuadro clínico. **Literatura base:** no accesible (Argente/Harrison ausentes del Drive).
- **Marcaciones (Supabase, solo lectura, 11/11):** grifos `s2-b01` 93 · `s2-b02` 14 · `s2-b03` 4 · `s2-b06` 20 · `s2-banco` 17 · `s2-guia` 4; trazos `s2-b01` 24 + 1 (`s2-b01>19`) y `s2-b03>1` 1; notas 0. Nada de eso se tocó.
