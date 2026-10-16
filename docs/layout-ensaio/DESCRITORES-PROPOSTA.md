# Descritores das matérias — PROPOSTA para aprovação (não é produção)

> **Natureza:** proposta técnica inferida do conteúdo real pelo ensaio (seções, numeração, unidades, agregadoras). A #485 a classifica como **simulação**: nada daqui vai para `assets/` sem aprovação de José, e nunca em lote — **uma matéria por PR**, depois do roteiro físico do piloto.

**Divergências a decidir** (⚠️ na coluna «Ação»): seções cujo título ou id dizem banco/revisão/simulacro, mas cujo conteúdo **não** é cópia dos blocos — a inferência as trata como bloco. Só José decide se são bloco (numerado, com card) ou revisão (fora da numeração). É o motivo de nenhum descritor inferido ir para produção.

Um descritor de produção tem duas partes:

| Parte | Conteúdo | Quem decide |
|---|---|---|
| **Estrutura** | qual seção é bloco (e o número), guia, banco/revisão (agregadora → `data-rm-agrega` no HTML), tabelas; unidades | técnica (abaixo, conferível no HTML) + revisão de José |
| **Identidade** | nome e cor de cada unidade, medalhões/ilustrações da capa, microcopy dos cartões de recursos, paleta | **José** (G0) — hoje só a Semiología II tem |

## Anatopatologia I (`anatomia-patologica`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: **I**, **II**, **IV** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `introduccion` | Introducción a la Anatomía Patológica | BLOQUE 01 · UNIDAD I | bloco 01 | — |
| `analise-guia` | — | IDEAS CLAVE | guia (00) | `<h2>` (hoje sem título direto) |
| `adaptacion` | Adaptación celular: cuando la célula se ajusta para sobrevivir | BLOQUE 02 · UNIDAD I | bloco 02 | — |
| `lesion` | Lesión celular: cuando la adaptación ya no alcanza | BLOQUE 03 · UNIDAD I | bloco 03 | — |
| `necrosis` | Necrosis: la muerte celular accidental | BLOQUE 04 · UNIDAD I | bloco 04 | — |
| `apoptose` | Apoptosis: la muerte programada y silenciosa | BLOQUE 05 · UNIDAD I | bloco 05 | — |
| `acumulacoes` | Acumulaciones intracelulares + Pigmentos | BLOQUE 06 · UNIDAD I | bloco 06 | — |
| `calcificacion` | Calcificación patológica | CALCIFICACIÓN PATOLÓGICA | bloco 07 | — |
| `aterosclerosis` | Aterosclerosis | ATEROSCLEROSIS | bloco 08 | — |
| `inflamacao` | Inflamación Aguda: la respuesta inmediata | BLOQUE 07 · UNIDAD II | bloco 09 | — |
| `inflamacion-cronica` | Inflamación crónica: la respuesta prolongada | BLOQUE 08 · UNIDAD II | bloco 10 | — |
| `reparacion` | Reparación y cicatrización | REPARACIÓN Y CICATRIZACIÓN | bloco 11 | — |
| `neoplasias` | Neoplasias: generalidades de los tumores | BLOQUE 09 · UNIDAD IV | bloco 12 | — |
| `banco-oficiales-anato` | 🎯 Banco final — Repaso general | BANCO FINAL · REPASO GENERAL | revisão de questões (agregadora) | — |
| `flashcards-anato` | 🎴 Flashcards generales — repaso de toda la materia | FLASHCARDS GENERALES | revisão de flashcards (agregadora) | — |

## Anatopatologia Práctica (`anatomia-patologica-practica`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `b1` | Introducción | TEMA 01 · ANATOMÍA PATOLÓGICA · INTRODUCCIÓN | bloco 01 | — |
| `b2` | Hipertrofia y Atrofia | TEMA 02 · ADAPTACIÓN CELULAR · HIPERTROFIA Y ATROFIA | bloco 02 | — |
| `b3` | Hiperplasia y Metaplasia | TEMA 03 · ADAPTACIÓN CELULAR · HIPERPLASIA Y METAPLASIA | bloco 03 | — |
| `b4` | Necrosis y muerte celular | TEMA 04 · LESIÓN CELULAR · NECROSIS Y MUERTE CELULAR | bloco 04 | — |
| `b5` | Lípidos y pigmentos | TEMA 05 · ACUMULACIONES · LÍPIDOS Y PIGMENTOS | bloco 05 | — |
| `b6` | Aguda y crónica | TEMA 06 · INFLAMACIÓN · AGUDA Y CRÓNICA | bloco 06 | — |
| `b7` | Tumores benignos | TEMA 07 · NEOPLASIA · TUMORES BENIGNOS | bloco 07 | — |
| `b8` | Tumores malignos | TEMA 08 · NEOPLASIA · TUMORES MALIGNOS | bloco 08 | — |
| `b9` | Aterosclerosis y hemangioma | TEMA 09 · PATOLOGÍA VASCULAR · ATEROSCLEROSIS Y HEMANGIOMA | bloco 09 | — |
| `b10` | Laminario general — todas las láminas | TEMA 10 · LAMINARIO GENERAL | bloco 10 | — |
| `b11` | Flashcards — entrená el ojo | TEMA 11 · FLASHCARDS GENERAL | revisão de flashcards (agregadora) | `data-rm-agrega` |
| `b12` | 🎲 Ruleta de láminas | TEMA 12 · RULETA DE LÁMINAS | revisão de flashcards (agregadora) | `data-rm-agrega` |

## Fisiopatologia I (`fisiopatologia`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: **I**, **II** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `introduccion-fisio` | Introducción — Adaptación, lesión y muerte celular | UNIDAD I · INTRODUCCIÓN A LA FISIOPATOLOGÍA | bloco 01 | — |
| `inflamacion` | Inflamación | UNIDAD I · INFLAMACIÓN | bloco 02 | — |
| `hemorragia` | Hemorragia | UNIDAD I · HEMORRAGIA | bloco 03 | — |
| `cicatrizacion` | Reparación y Cicatrización | UNIDAD I · REPARACIÓN Y CICATRIZACIÓN | bloco 04 | — |
| `edema` | Edema | UNIDAD I · EDEMA | bloco 05 | — |
| `choque` | Shock (Choque) | UNIDAD I · SHOCK | bloco 06 | — |
| `anemias` | Alteraciones de los Eritrocitos — Anemias | UNIDAD II · ANEMIAS | bloco 07 | — |
| `globulos-brancos` | Alteraciones de los Glóbulos Blancos | UNIDAD I · GLÓBULOS BLANCOS | bloco 08 | — |
| `coagulacao` | Trastornos de la Coagulación | UNIDAD I · COAGULACIÓN | bloco 09 | — |
| `asma-epoc` | Asma y EPOC | UNIDAD I · ENFERMEDADES OBSTRUCTIVAS · ASMA Y EPOC | bloco 10 | — |
| `infecciones-respiratorias` | Infecciones Respiratorias | UNIDAD I · INFECCIONES RESPIRATORIAS (ALTAS) | bloco 11 | — |
| `infecciones-pulmonares` | Infecciones Pulmonares | UNIDAD I · INFECCIONES PULMONARES (BAJAS) | bloco 12 | — |
| `prova-fisio` | Banco general de preguntas | BANCO GENERAL DE PREGUNTAS | bloco 13 | ⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco) |
| `flashcards-fisio` | 🎴 Flashcards — Repaso general | FLASHCARDS · REPASO GENERAL | revisão de flashcards (agregadora) | — |

## Imagenología (`imagenologia`) — excluída (só referência)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `analise-imagen` | El estándar de la cátedra — lo que cae en el examen | BLOQUE 01 · GENERALIDADES | bloco 01 | — |
| `rxtorax` | Radiografía de tórax — técnica, anatomía e índice cardiotorácico | BLOQUE 02 · RADIOGRAFÍA DE TÓRAX | bloco 02 | — |
| `ultrasom` | Ultrasonografía — principios | BLOQUE 03 · ULTRASONOGRAFÍA | bloco 03 | — |
| `ecotorax` | Ecografía de tórax — los 6 signos del pulmón | BLOQUE 04 · ECOGRAFÍA DE TÓRAX | bloco 04 | — |
| `abdomen-rx` | Imágenes del Abdomen — Radiografía | BLOQUE 05 · ABDOMEN · RADIOGRAFÍA | bloco 05 | — |
| `abdomen-tc` | Imágenes del Abdomen — Tomografía Computarizada | BLOQUE 05 · ABDOMEN · TOMOGRAFÍA | bloco 06 | — |
| `fraturas` | Identificación de Fracturas y Luxaciones | BLOQUE 06 · FRACTURAS Y LUXACIONES | bloco 07 | — |
| `urinario` | Sistema Urinario — Imágenes | BLOQUE 07 · SISTEMA URINARIO | bloco 08 | — |
| `craneo` | Cráneo — Rx, TCE, craneosinostosis y ecografía de cuello/tiroides | BLOQUE 08 · CRÁNEO Y CUELLO | bloco 09 | — |
| `casos-clinicos` | Casos Clínicos | CASOS CLÍNICOS | guia (00) | — |
| `flashcards-imagen` | 🎴 Flashcards generales — repaso de toda la materia |  | revisão de flashcards (agregadora) | — |
| `prova-imagen` | Examen de Imagenología + Variantes | BANCO DE QUESTÕES · OFICIALES + VARIANTES | bloco 10 | ⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco) |

## Semiología I (`semiologia`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: **I**, **IV**, **V** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `introduccion-semio` | Introducción a la Semiología | UNIDAD I · INTRODUCCIÓN | bloco 01 | — |
| `signos-vitales` | Signos Vitales | UNIDAD I · SIGNOS VITALES | bloco 02 | — |
| `historia-clinica` | Historia Clínica | UNIDAD I · HISTORIA CLÍNICA | bloco 03 | — |
| `ectoscopia` | Ectoscopía — Inspección General | CLASE 4 · UNIDAD IV · ECTOSCOPÍA | bloco 04 | — |
| `torax-resp` | Examen físico — Tórax Respiratorio | CLASE 5 · UNIDAD V · TÓRAX RESPIRATORIO | bloco 05 | — |
| `torax-cv` | Examen físico — Sistema Cardiovascular | CLASE 5 · UNIDAD V · TÓRAX CARDIOVASCULAR | bloco 06 | — |
| `abdome` | Examen físico — Abdomen | CLASE 6 · UNIDAD V · ABDOMEN | bloco 07 | — |
| `manobras` | Maniobras abdominales — la estrella del examen | BLOQUE · MANIOBRAS ABDOMINALES | bloco 08 | — |
| `cabeza-cuello` | Examen Físico de Cabeza y Cuello | UNIDAD V · CABEZA Y CUELLO | bloco 09 | — |
| `prova-semio` | Banco de preguntas | BANCO DE PREGUNTAS INTERACTIVO | bloco 10 | ⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco) |
| `flashcards-semio` | 🎴 Flashcards generales — repaso de toda la materia | FLASHCARDS GENERALES | revisão de flashcards (agregadora) | — |

## Farmacología I (`farmacologia`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `pk` | 01 · Farmacocinética | BLOQUE 01 · FARMACOCINÉTICA | bloco 01 | — |
| `pd` | 02 · Farmacodinámica | BLOQUE 02 · FARMACODINÁMICA | bloco 02 | — |
| `sna` | 03 · Sistema Nervioso Autónomo (SNA) | BASE · SISTEMA NERVIOSO AUTÓNOMO (SNA) | bloco 03 | — |
| `placa-motora` | 04 · Fisiología de la Placa Motora y Bloqueadores Neuromusculares | BLOQUE 04 · PLACA MOTORA Y BLOQUEADORES NEUROMUSCULARES | bloco 04 | — |
| `adrenergicos` | 05 · Receptores Adrenérgicos (α y β) | BASE · RECEPTORES ADRENÉRGICOS | bloco 05 | — |
| `colinergicos` | 06 · Receptores Colinérgicos (de la Acetilcolina) | BASE · RECEPTORES COLINÉRGICOS | bloco 06 | — |
| `adren-agon-antag` | 07 · Agonistas y Antagonistas de Receptores Adrenérgicos | BLOQUE 07 · AGONISTAS Y ANTAGONISTAS ADRENÉRGICOS | bloco 07 | — |
| `beta-adrenergicos` | 08 · Fármacos Agonistas y Bloqueadores Beta-Adrenérgicos | BLOQUE 08 · BETA-ADRENÉRGICOS | bloco 08 | — |
| `aines` | 09 · AINEs (Antiinflamatorios No Esteroideos) | BLOQUE 09 · AINEs | bloco 09 | — |
| `opioides` | 10 · Analgésicos Opioides | BLOQUE 10 · OPIOIDES | bloco 10 | — |
| `corticoides` | 11 · Hormonas Corticosuprarrenales | BLOQUE 11 · CORTICOSUPRARRENALES | bloco 11 | — |
| `antihistaminicos` | 12 · Antihistamínicos | BLOQUE 12 · ANTIHISTAMÍNICOS | bloco 12 | — |
| `anestesicos` | 13 · Anestésicos | BLOQUE 13 · ANESTÉSICOS | bloco 13 | — |
| `penicilinas` | 14 · Introducción a los Antibióticos y Penicilinas | BLOQUE 14 · ANTIBIÓTICOS · PENICILINAS | bloco 14 | — |
| `cefalosporinas` | 15 · Cefalosporinas | BLOQUE 15 · CEFALOSPORINAS | bloco 15 | — |
| `macrolidos` | 16 · Macrólidos y Tetraciclinas | BLOQUE 16 · MACRÓLIDOS Y TETRACICLINAS | bloco 16 | — |
| `aminoglucosidos` | 17 · Aminoglucósidos y Sulfonamidas | BLOQUE 17 · AMINOGLUCÓSIDOS Y SULFONAMIDAS | bloco 17 | — |
| `farmacos-clave` | 🎯 Fármacos que más caen — tabla única definitiva | RESUMEN FINAL · FÁRMACOS QUE MÁS CAEN | guia (00) | — |
| `cuestionario1` | Preguntas en formato de examen | CUESTIONARIO 1 · ANTIBIÓTICOS · AINEs · OPIOIDES · ANTIHIS | bloco 18 | ⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco) |
| `prova-farmaco` | Banco de preguntas en formato de examen | BANCO DE PREGUNTAS INTERACTIVO | bloco 19 | ⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco) |
| `flashcards-grales` | 🎴 Flashcards generales — repaso de toda la materia | FLASHCARDS GENERALES | bloco 20 | ⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco) |

## Medicina Familiar (`medicina-familiar`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: **I**, **II**, **III** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `portada-medfam` | El mapa de la materia | PORTADA | guia (00) | — |
| `aps` | APS · Atención Primaria de Salud | TEMA 01 · UNIDAD I · APS | bloco 01 | — |
| `principios` | Principios de la Medicina Familiar | TEMA 02 · UNIDAD I · PRINCIPIOS | bloco 02 | — |
| `familiograma` | Familiograma (Genograma) y tipos de familia | TEMA 03 · UNIDAD II · FAMILIOGRAMA | bloco 03 | — |
| `apgar` | APGAR Familiar | TEMA 04 · UNIDAD II · APGAR FAMILIAR | bloco 04 | — |
| `crisis` | Intervención en crisis familiar | TEMA 05 · UNIDAD II · CRISIS FAMILIAR | bloco 05 | — |
| `crecimiento` | Crecimiento y Desarrollo del niño sano | TEMA 06 · UNIDAD III · CRECIMIENTO | bloco 06 | — |
| `desarrollo` | Desarrollo psicomotor del niño | TEMA 06 · UNIDAD III · DESARROLLO | bloco 07 | — |
| `educacion` | Educación para la Salud | TEMA 07 · UNIDAD III · EDUCACIÓN PARA LA SALUD | bloco 08 | — |
| `banco-medfam` | Banco de preguntas — formato examen | BANCO DE PREGUNTAS · FORMATO EXAMEN | bloco 09 | ⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco) |
| `flashcards-medfam` | 🎴 Flashcards generales — repaso de toda la materia | FLASHCARDS GENERALES | bloco 10 | ⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco) |
| `cierre-medfam` | Cierre de la materia | CIERRE · LO QUE TIENE QUE QUEDAR | bloco 11 | — |

## Farmacología II (`farmacologia-ii`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `f2b00` | — |  | bloco 00 | `<h2>` (hoje sem título direto) |
| `f2b01` | 🧠 Sistema Nervioso Autónomo y fármacos que modifican la actividad simpática | BLOQUE 01 · PARCIAL 1 · SISTEMA NERVIOSO AUTÓNOMO | bloco 01 | — |
| `f2b02` | 💧 Antihipertensivos I · Regulación de la presión arterial y diuréticos | BLOQUE 02 · PARCIAL 1 · HIPERTENSIÓN ARTERIAL Y DIURÉTICOS | bloco 02 | — |
| `f2b03` | 🩺 Antihipertensivos II · Simpaticolíticos, calcioantagonistas y bloqueo del SRAA | BLOQUE 03 · PARCIAL 1 · SIMPATICOLÍTICOS, CALCIO Y SRAA | bloco 03 | — |
| `f2b04` | 🩸 Antiagregantes plaquetarios | BLOQUE 04 · PARCIAL 1 · ANTIAGREGANTES PLAQUETARIOS | bloco 04 | — |
| `f2b05` | 💔 Fármacos antianginosos | BLOQUE 05 · PARCIAL 1 · FÁRMACOS ANTIANGINOSOS | bloco 05 | — |
| `f2b07` | 🧪 Esteroides corticales y antiinflamatorios esteroideos | BLOQUE 06 · PARCIAL 2 · CORTICOIDES | bloco 07 | — |
| `f2b06` | 🔥 Antiinflamatorios no esteroideos (AINE) | BLOQUE 07 · PARCIAL 2 · ANTIINFLAMATORIOS NO ESTEROIDEOS | bloco 06 | — |
| `f2b08` | 🫁 Farmacología respiratoria · Antiasmáticos | BLOQUE 08 · PARCIAL 2 · FARMACOLOGÍA RESPIRATORIA | bloco 08 | — |
| `f2b09` | 🍽️ Antiácidos y antiulcerosos | BLOQUE 09 · PARCIAL 2 · ANTIÁCIDOS Y ANTIULCEROSOS | bloco 09 | — |
| `f2b10` | 🦋 Farmacología endócrina · Hipotiroidismo y levotiroxina | BLOQUE 10 · PARCIAL 2 · HIPOTIROIDISMO Y LEVOTIROXINA | bloco 10 | — |
| `f2b11` | 🔥 Tirotoxicosis | BLOQUE 11 · PARCIAL 2 · TIROTOXICOSIS | bloco 11 | — |
| `f2b12` | 🍬 Hipoglucemiantes orales y no insulínicos | BLOQUE 12 · FINAL · HIPOGLUCEMIANTES NO INSULÍNICOS | bloco 12 | — |
| `f2b13` | 💉 Insulinas | BLOQUE 13 · FINAL · INSULINAS | bloco 13 | — |
| `f2b14` | ⚡ Antiarrítmicos y digitálicos | BLOQUE 14 · PARCIAL 1 · ANTIARRÍTMICOS Y DIGITÁLICOS | bloco 14 | — |
| `f2b15` | 🧠 Banco general de preguntas | BANCO GENERAL · REPASO FINAL | revisão de questões (agregadora) | `data-rm-agrega` |
| `f2b16` | 🎴 Flashcards generales de la asignatura | FLASHCARDS GENERALES · REPASO FINAL | revisão de flashcards (agregadora) | `data-rm-agrega` |

## Embriología (`embriologia`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `emb00` | — |  | bloco 00 | `<h2>` (hoje sem título direto) |
| `emb01` | 🔬 Introducción a la Embriología | BLOQUE 01 · BASES CELULARES | bloco 01 | — |
| `emb02` | 🧬 Mitosis | BLOQUE 02 · DIVISIÓN ECUACIONAL | bloco 02 | — |
| `emb03` | 🎲 Meiosis | BLOQUE 03 · DIVISIÓN REDUCCIONAL | bloco 03 | — |
| `emb04` | ⚙️ Gametogénesis y espermatogénesis | BLOQUE 04 · FORMACIÓN DE LOS GAMETOS | bloco 04 | — |
| `emb05` | 🥚 Ovogénesis | BLOQUE 05 · FORMACIÓN DE LOS GAMETOS | bloco 05 | — |
| `emb06` | 🌙 Ciclo sexual femenino | BLOQUE 06 · EL RELOJ HORMONAL | bloco 06 | — |
| `emb07` | 💥 Fecundación | BLOQUE 07 · EL ENCUENTRO | bloco 07 | — |
| `emb08` | 1️⃣ Primera semana | BLOQUE 08 · PARCIAL 2 · DEL CIGOTO AL BLASTOCISTO | bloco 08 | — |
| `emb09` | 2️⃣ Segunda semana · la «semana del 2» | BLOQUE 09 · PARCIAL 2 · LA SEMANA DEL «2» | bloco 09 | — |
| `emb10` | 3️⃣ Tercera semana · gastrulación y notocorda | BLOQUE 10 · PARCIAL 2 · LA SEMANA DEL «3» | bloco 10 | — |
| `emb11` | 🏗️ Tercera a octava semana · organogénesis | BLOQUE 11 · PARCIAL 2 · PERÍODO EMBRIONARIO | bloco 11 | — |
| `emb12` | 9️⃣ Novena semana | BLOQUE 12 · PARCIAL 2 · EMPIEZA EL FETO | bloco 12 | — |
| `emb13` | 🍼 De la novena semana al nacimiento | BLOQUE 13 · PARCIAL 2 · PERÍODO FETAL Y EDAD GESTACIONAL | bloco 13 | — |
| `emb14` | 🧠 Banco general de preguntas | BANCO GENERAL | revisão de questões (agregadora) | `data-rm-agrega` |
| `emb15` | 🎴 Flashcards generales de la asignatura | FLASHCARDS GENERALES | revisão de flashcards (agregadora) | `data-rm-agrega` |

## Biología (`biologia`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: **I**, **II**, **VI**, **III**, **VII**, **IX**, **VIII**, **X** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `bio00` | — |  | guia (00) | `<h2>` (hoje sem título direto) |
| `bio01` | 🔬 Introducción a la Biología celular | BLOQUE 01 · UNIDAD I | bloco 01 | — |
| `bio02` | 💧 Componentes inorgánicos: agua y sales minerales | BLOQUE 02 · UNIDAD II | bloco 02 | — |
| `bio03` | 🍬 Carbohidratos (hidratos de carbono) | BLOQUE 03 · UNIDAD II | bloco 03 | — |
| `bio04` | 🧬 Ácidos nucleicos: ADN y ARN | BLOQUE 04 · UNIDAD II | bloco 04 | — |
| `bio05` | 🧱 Aminoácidos | BLOQUE 05 · UNIDAD II | bloco 05 | — |
| `bio06` | 🧶 Proteínas | BLOQUE 06 · UNIDAD II | bloco 06 | — |
| `bio07` | 🫧 Lípidos | BLOQUE 07 · UNIDAD II | bloco 07 | — |
| `bio08` | 🕸️ Matriz extracelular y uniones celulares | BLOQUE 08 · UNIDAD VI | bloco 08 | — |
| `bio09` | 🧵 Citosol y citoesqueleto | BLOQUE 09 · UNIDADES IV–V | bloco 09 | — |
| `bio10` | 🧫 Membrana plasmática | BLOQUE 10 · UNIDAD III | bloco 10 | — |
| `bio11` | 🔀 Transporte de membrana | BLOQUE 11 · UNIDAD III | bloco 11 | — |
| `bio12` | 🏭 Sistema de endomembranas y organelos | BLOQUE 12 · UNIDAD VII | bloco 12 | — |
| `bio13` | 🔋 Mitocondria | BLOQUE 13 · UNIDAD VII | bloco 13 | — |
| `bio14` | 🪐 Núcleo interfásico | BLOQUE 14 · UNIDAD IX | bloco 14 | — |
| `bio15` | 🔌 Comunicación intercelular y señalización celular | BLOQUE 15 · UNIDAD VIII | bloco 15 | — |
| `bio16` | 🧬 Ciclo celular | BLOQUE 16 · UNIDAD X | bloco 16 | — |
| `bancobio` | 🎯 Banco general de preguntas | REPASO GENERAL · SIMULACRO | revisão de questões (agregadora) | — |
| `bio-flashcards` | 🎴 Flashcards de todos los bloques | FLASHCARDS · TODOS LOS BLOQUES | revisão de flashcards (agregadora) | — |

## Histología I (`histologia-i`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `histo00` | — | PORTADA | guia (00) | `<h2>` (hoje sem título direto) |
| `histo01` | 📘 Introducción a la Histología | BLOQUE 01 · PARCIAL 1 · LAS REGLAS DEL JUEGO | bloco 01 | — |
| `histo02` | 🧫 Tejido epitelial | BLOQUE 02 · PARCIAL 1 · EL TEJIDO QUE TAPIZA | bloco 02 | — |
| `histo03` | 🔶 Tejido glandular | BLOQUE 03 · PARCIAL 1 · EPITELIO QUE SECRETA | bloco 03 | — |
| `histo04` | 🕸️ Tejido conectivo propiamente dicho | BLOQUE 04 · PARCIAL 1 · EL TEJIDO DE SOSTÉN | bloco 04 | — |
| `histo05` | 🟡 Tejido adiposo | BLOQUE 05 · PARCIAL 1 · GRASA CON FUNCIÓN | bloco 05 | — |
| `histo06` | 🦵 Tejido cartilaginoso | BLOQUE 06 · PARCIAL 2 · SOSTÉN FLEXIBLE | bloco 06 | — |
| `histo07` | 🦴 Tejido óseo | BLOQUE 07 · PARCIAL 2 · EL CONECTIVO MÁS DURO | bloco 07 | — |
| `histo08` | 🔨 Osificación | BLOQUE 08 · PARCIAL 2 · CÓMO SE FABRICA EL HUESO | bloco 08 | — |
| `histo09` | 🩸 Tejido sanguíneo | BLOQUE 09 · PARCIAL 2 · CONECTIVO LÍQUIDO | bloco 09 | — |
| `histo10` | 🌱 Tejido hematopoyético | BLOQUE 10 · PARCIAL 2 · LA FÁBRICA DE LA SANGRE | bloco 10 | — |
| `histo11` | 💪 Tejido muscular | BLOQUE 11 · PARCIAL 2 · EL TEJIDO QUE SE CONTRAE | bloco 11 | — |
| `histo12` | 🧠 Tejido nervioso | BLOQUE 12 · PARCIAL 2 · EL TEJIDO QUE COMUNICA | bloco 12 | — |
| `histo13` | 🧠 Banco general de preguntas | BANCO GENERAL | revisão de questões (agregadora) | `data-rm-agrega` |
| `histo14` | 🎴 Flashcards generales de la asignatura | FLASHCARDS GENERALES | revisão de flashcards (agregadora) | `data-rm-agrega` |
| `histo-imgnote` | 📚 Bibliografía y créditos | BIBLIOGRAFÍA Y NOTA SOBRE LAS IMÁGENES | bloco 13 | — |

## Histología I Práctica (`histologia-i-practica`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `hp00` | — | PORTADA | guia (00) | `<h2>` (hoje sem título direto) |
| `hp01` | 🧫 Epitelios de revestimiento | BLOQUE 01 · TEJIDO EPITELIAL DE REVESTIMIENTO | bloco 01 | — |
| `hp02` | 🔶 Glándulas | BLOQUE 02 · TEJIDO EPITELIAL GLANDULAR | bloco 02 | — |
| `hp03` | 🕸️ Conectivo laxo, denso regular y denso irregular | BLOQUE 03 · TEJIDO CONECTIVO PROPIAMENTE DICHO | bloco 03 | — |
| `hp04` | 🟡 Tejido adiposo | BLOQUE 04 · TEJIDO ADIPOSO | bloco 04 | — |
| `hp05` | 🦵 Cartílago hialino, elástico y fibroso | BLOQUE 05 · TEJIDO CARTILAGINOSO | bloco 05 | — |
| `hp06` | 🦴 Hueso compacto y esponjoso | BLOQUE 06 · TEJIDO ÓSEO | bloco 06 | — |
| `hp07` | 🔨 Osificación y células del hueso | BLOQUE 07 · OSIFICACIÓN | bloco 07 | — |
| `hp08` | 🩸 Frotis de sangre periférica | BLOQUE 08 · TEJIDO SANGUÍNEO | bloco 08 | — |
| `hp09` | 🌱 Médula ósea | BLOQUE 09 · TEJIDO HEMATOPOYÉTICO | bloco 09 | — |
| `hp10` | 💪 Esquelético, cardíaco y liso | BLOQUE 10 · TEJIDO MUSCULAR | bloco 10 | — |
| `hp11` | 🧠 Neuronas, glía y médula espinal | BLOQUE 11 · TEJIDO NERVIOSO | bloco 11 | — |
| `hp12` | 🔬 Leer una lámina completa | BLOQUE 12 · ÓRGANOS COMBINADOS Y REPASO | bloco 12 | — |
| `bancolam` | 🧠 Banco general de identificación | BANCO DE IDENTIFICACIÓN | revisão de questões (agregadora) | — |
| `bancofc` | 🎴 Flashcards generales de láminas | FLASHCARDS GENERALES | revisão de flashcards (agregadora) | — |
| `bancoruleta` | 🎲 Ruleta rusa de láminas | RULETA RUSA DE LÁMINAS | revisão de flashcards (agregadora) | — |
| `hp-imgnote` | 📷 Sobre las micrografías |  | bloco 13 | — |

## Histología II Práctica (`histologia-ii-practica`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `h2pportada` | — | PORTADA | guia (00) | `<h2>` (hoje sem título direto) |
| `h2pb01` | ❤️ El corazón en la lámina | BLOQUE 01 · PARCIAL 1 · CORAZÓN | bloco 01 | — |
| `h2pb02` | 🩸 Arterias, venas y capilares | BLOQUE 02 · PARCIAL 1 · VASOS SANGUÍNEOS | bloco 02 | — |
| `h2pb03` | 🌬️ De la nariz al bronquiolo | BLOQUE 03 · PARCIAL 1 · VÍA AÉREA DE CONDUCCIÓN | bloco 03 | — |
| `h2pb04` | 🌫️ Alvéolo y barrera hematogaseosa | BLOQUE 04 · PARCIAL 1 · PORCIÓN RESPIRATORIA | bloco 04 | — |
| `h2pb05` | 🛡️ Ganglio, amígdala y tejido linfático de las mucosas | BLOQUE 05 · PARCIAL 1 · GANGLIO LINFÁTICO Y MALT | bloco 05 | — |
| `h2pb06` | 🧬 Timo y bazo, los dos encapsulados que no son ganglio | BLOQUE 06 · PARCIAL 1 · TIMO Y BAZO | bloco 06 | — |
| `h2pb07` | 🧠 Hipófisis y glándula pineal | BLOQUE 07 · PARCIAL 2 · HIPÓFISIS Y PINEAL | bloco 07 | — |
| `h2pb08` | ⚗️ Tiroides, paratiroides y suprarrenal | BLOQUE 08 · PARCIAL 2 · TIROIDES, PARATIROIDES Y SUPRARREN | bloco 08 | — |
| `h2pb09` | 👅 Boca, labio y papilas linguales | BLOQUE 09 · PARCIAL 2 · CAVIDAD BUCAL Y LENGUA | bloco 09 | — |
| `h2pb10` | 💧 Parótida, submandibular y sublingual | BLOQUE 10 · PARCIAL 2 · GLÁNDULAS SALIVALES | bloco 10 | — |
| `h2pb11` | 🍽️ El tubo digestivo: esófago y estómago | BLOQUE 11 · PARCIAL 2 · ESÓFAGO Y ESTÓMAGO | bloco 11 | — |
| `h2pb12` | 🌾 Del duodeno al canal anal | BLOQUE 12 · PARCIAL 2 · INTESTINO DELGADO Y GRUESO | bloco 12 | — |
| `h2pb13` | 🧡 Hígado, vesícula biliar y páncreas | BLOQUE 13 · PARCIAL 2 · HÍGADO, VESÍCULA Y PÁNCREAS | bloco 13 | — |
| `h2pb14` | 🖐️ Piel gruesa, piel delgada y anexos | BLOQUE 14 · FINAL · PIEL Y ANEXOS | bloco 14 | — |
| `h2pb15` | 💦 Riñón, uréter y vejiga | BLOQUE 15 · FINAL · SISTEMA RENAL Y VÍAS URINARIAS | bloco 15 | — |
| `h2pb16` | ⚭ Aparato genital masculino y femenino | BLOQUE 16 · FINAL · GENITAL MASCULINO Y FEMENINO | bloco 16 | — |
| `h2pbanco` | 🎯 Banco general de preguntas | REPASO GENERAL · TODA LA MATERIA | revisão de questões (agregadora) | — |
| `h2pmazo` | 🎴 Mazo general y ruleta de láminas | REPASO GENERAL · MAZO Y RULETA | revisão de flashcards (agregadora) | `data-rm-agrega` |
| `h2pcierre` | 📚 Bibliografía y créditos | CIERRE · BIBLIOGRAFÍA Y NOTA SOBRE LAS IMÁGENES | bloco 17 | — |

## Histología II (`histologia-ii`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `h2portada` | — |  | guia (00) | `<h2>` (hoje sem título direto) |
| `h2b01` | ❤️ El corazón: un vaso enorme con tres túnicas | BLOQUE 01 · PARCIAL 1 · SISTEMA CARDIOVASCULAR I · CORAZÓN | bloco 01 | — |
| `h2b02` | 🩸 Los vasos: contá las capas de músculo | BLOQUE 02 · PARCIAL 1 · SISTEMA CARDIOVASCULAR II · VASOS  | bloco 02 | — |
| `h2b03` | 👃 La vía aérea superior: el epitelio delata la función | BLOQUE 03 · PARCIAL 1 · SISTEMA RESPIRATORIO I · NARIZ Y L | bloco 03 | — |
| `h2b04` | 🫁 Bajando el árbol: lo que falta da el nombre | BLOQUE 04 · PARCIAL 1 · SISTEMA RESPIRATORIO II · TRÁQUEA, | bloco 04 | — |
| `h2b05` | 🛡️ Primarios y secundarios: ¿se hace acá, o llega ya hecho? | BLOQUE 05 · PARCIAL 1 · SISTEMA LINFÁTICO | bloco 05 | — |
| `h2b06` | ⚗️ Endocrino: la posición de la célula dice la hormona | BLOQUE 06 · PARCIAL 2 · SISTEMA ENDOCRINO | bloco 06 | — |
| `h2b07` | 👅 La boca: la forma sigue al trabajo | BLOQUE 07 · PARCIAL 2 · SISTEMA DIGESTIVO I · BOCA, LENGUA | bloco 07 | — |
| `h2b08` | 🌀 El tubo: cuatro capas fijas y un agregado que da el nombre | BLOQUE 08 · PARCIAL 2 · SISTEMA DIGESTIVO II · TUBO DIGEST | bloco 08 | — |
| `h2b09` | 🫀 Hígado: dos corrientes que se cruzan en el mismo lobulillo | BLOQUE 09 · PARCIAL 2 · SISTEMA DIGESTIVO III · HÍGADO, VE | bloco 09 | — |
| `h2b10` | 🖐️ La piel: contá los estratos y seguí el conducto | BLOQUE 10 · PARCIAL 2 · SISTEMA TEGUMENTARIO | bloco 10 | — |
| `h2b11` | 🫘 El riñón: filtra en un punto y recupera en todo el resto | BLOQUE 11 · PARCIAL 2 · SISTEMA RENAL | bloco 11 | — |
| `h2b12` | ♂️ Genital masculino: el mismo epitelio, distinta pared | BLOQUE 12 · FINAL · SISTEMA GENITAL MASCULINO | bloco 12 | — |
| `h2b13` | ♀️ Genital femenino: dos preguntas resuelven todo el aparato | BLOQUE 13 · FINAL · SISTEMA GENITAL FEMENINO | bloco 13 | — |
| `bancoh2` | 🎯 Banco general de preguntas | REPASO GENERAL · TODA LA MATERIA | revisão de questões (agregadora) | — |
| `bancofch2` | 🎴 Mazo general y ruleta | REPASO GENERAL · MAZO Y RULETA | revisão de flashcards (agregadora) | — |
| `h2cierre` | 📚 Bibliografía y créditos | CIERRE · BIBLIOGRAFÍA Y NOTA SOBRE LAS IMÁGENES | bloco 14 | — |

## Anatomía I (`anatomia-i`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `a1b00` | — |  | bloco 00 | `<h2>` (hoje sem título direto) |
| `a1b01` | 🧭 Generalidades de la Anatomía · el lenguaje, la posición y los planos | BLOQUE 01 · PARCIAL 1 · GENERALIDADES | bloco 01 | — |
| `a1b02` | 🦴 Osteología general · el esqueleto, los tipos de hueso y su estructura | BLOQUE 02 · PARCIAL 1 · OSTEOLOGÍA GENERAL | bloco 02 | — |
| `a1b03` | 🔗 Artrología general · cómo se unen los huesos y cómo se mueven | BLOQUE 03 · PARCIAL 1 · ARTROLOGÍA GENERAL | bloco 03 | — |
| `a1b04` | 💪 Miología general · el músculo, sus formas, sus anexos y su función | BLOQUE 04 · PARCIAL 1 · MIOLOGÍA GENERAL | bloco 04 | — |
| `a1b05` | 📦 Tórax · pared, cavidad torácica y división del mediastino | BLOQUE 05 · PARCIAL 1 · TÓRAX Y MEDIASTINO | bloco 05 | — |
| `a1b06` | 🩻 Esqueleto del tórax · esternón, vértebras torácicas y costillas | BLOQUE 06 · PARCIAL 1 · ESQUELETO DEL TÓRAX | bloco 06 | — |
| `a1b07` | 🫸 Músculos del tórax · intercostales, transverso, pectorales y serrato | BLOQUE 07 · PARCIAL 1 · MÚSCULOS DEL TÓRAX | bloco 07 | — |
| `a1b08` | 🌬️ Diafragma · inserciones, pilares, folíolos e hiatos | BLOQUE 08 · PARCIAL 1 · DIAFRAGMA | bloco 08 | — |
| `a1b09` | ❤️ Corazón I · generalidades, configuración externa y pericardio | BLOQUE 09 · PARCIAL 1 · CORAZÓN I | bloco 09 | — |
| `a1b10` | 🫀 Corazón II · configuración interna, cavidades, tabiques y válvulas | BLOQUE 10 · PARCIAL 1 · CORAZÓN II | bloco 10 | — |
| `a1b11` | ⚡ Corazón III · sistema de conducción, coronarias, venas y circulación | BLOQUE 11 · PARCIAL 1 · CORAZÓN III | bloco 11 | — |
| `a1b12` | 🩸 Arterias del tórax · aorta, arco aórtico y sus ramas | BLOQUE 12 · PARCIAL 1 · ARTERIAS DEL TÓRAX | bloco 12 | — |
| `a1b13` | 🔵 Venas del tórax · cava superior, braquiocefálicas y sistema ácigos | BLOQUE 13 · PARCIAL 1 · VENAS DEL TÓRAX | bloco 13 | — |
| `a1b14` | 🧵 Nervios y linfáticos del tórax · frénico, vago, intercostales y conducto torácico | BLOQUE 14 · PARCIAL 1 · NERVIOS Y LINFÁTICOS DEL TÓRAX | bloco 14 | — |
| `a1b15` | 🍽️ Esófago y tráquea torácicos | BLOQUE 15 · PARCIAL 1 · ESÓFAGO Y TRÁQUEA | bloco 15 | — |
| `a1b16` | 🫁 Árbol bronquial y pulmones · lóbulos, segmentos y vascularización | BLOQUE 16 · PARCIAL 1 · ÁRBOL BRONQUIAL Y PULMONES | bloco 16 | — |
| `a1b17` | 🫧 Pleuras · hojas, recesos y cavidad pleural | BLOQUE 17 · PARCIAL 1 · PLEURAS | bloco 17 | — |
| `a1b18` | 🦴 Osteología I · escápula y clavícula | BLOQUE 18 · PARCIAL 2 · CINTURA ESCAPULAR | bloco 18 | — |
| `a1b19` | 🦾 Osteología II · húmero, radio, cúbito y huesos de la mano | BLOQUE 19 · PARCIAL 2 · HÚMERO, RADIO, CÚBITO Y MANO | bloco 19 | — |
| `a1b20` | 🔗 Articulaciones del miembro superior | BLOQUE 20 · PARCIAL 2 · ARTICULACIONES DEL MIEMBRO SUPERIO | bloco 20 | — |
| `a1b21` | 🧱 Fascias y regiones del miembro superior | BLOQUE 21 · PARCIAL 2 · FASCIAS Y REGIONES | bloco 21 | — |
| `a1b22` | 💪 Músculos del brazo | BLOQUE 22 · PARCIAL 2 · MÚSCULOS DEL BRAZO | bloco 22 | — |
| `a1b23` | ✊ Músculos anteriores del antebrazo · los 8 flexores en 4 planos | BLOQUE 23 · PARCIAL 2 · MÚSCULOS ANTERIORES DEL ANTEBRAZO | bloco 23 | — |
| `a1b24` | 🖐️ Músculos posteriores del antebrazo · los 12 extensores y la tabaquera | BLOQUE 24 · PARCIAL 2 · MÚSCULOS POSTERIORES DEL ANTEBRAZO | bloco 24 | — |
| `a1b25` | 🤏 Músculos de la mano · los 19 intrínsecos | BLOQUE 25 · PARCIAL 2 · MÚSCULOS DE LA MANO | bloco 25 | — |
| `a1b26` | 🩸 Arterias del miembro superior | BLOQUE 26 · PARCIAL 2 · ARTERIAS DEL MIEMBRO SUPERIOR | bloco 26 | — |
| `a1b27` | 💧 Venas y linfáticos del miembro superior | BLOQUE 27 · PARCIAL 2 · VENAS Y LINFÁTICOS | bloco 27 | — |
| `a1b28` | ⚡ Plexo braquial y nervios del miembro superior | BLOQUE 28 · PARCIAL 2 · PLEXO BRAQUIAL | bloco 28 | — |
| `a1b29` | 🦢 El cuello · límites, regiones y osteología | BLOQUE 29 · PARCIAL 2 · CUELLO · LÍMITES, REGIONES Y OSTEO | bloco 29 | — |
| `a1b30` | 🎗️ Músculos y fascias del cuello | BLOQUE 30 · PARCIAL 2 · MÚSCULOS Y FASCIAS DEL CUELLO | bloco 30 | — |
| `a1b31` | 🫀 Vasos y linfáticos del cuello | BLOQUE 31 · PARCIAL 2 · VASOS Y LINFÁTICOS DEL CUELLO | bloco 31 | — |
| `a1b32` | 🔌 Plexo cervical, nervio frénico y cadena simpática | BLOQUE 32 · PARCIAL 2 · PLEXO CERVICAL Y SIMPÁTICO CERVICA | bloco 32 | — |
| `a1b33` | 🗣️ Laringe y faringe | BLOQUE 33 · PARCIAL 2 · LARINGE Y FARINGE | bloco 33 | — |
| `bancoa1` | 🧠 Banco general de preguntas | BANCO GENERAL | revisão de questões (agregadora) | — |
| `bancofca1` | 🎴 Flashcards generales de la asignatura | FLASHCARDS GENERALES | revisão de flashcards (agregadora) | — |
| `a1notas` | 🖼️ Sobre las ilustraciones de esta asignatura |  | guia (00) | — |

## Anatopatologia II (`anatomia-patologica-ii`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `ap2intro` | — |  | guia (00) | `<h2>` (hoje sem título direto) |
| `ap2b01` | 🦷 Patologías de la cavidad oral y glándulas salivales | BLOQUE 01 · PARCIAL 1 · CAVIDAD ORAL Y GLÁNDULAS SALIVALES | bloco 01 | — |
| `ap2b02` | 🫙 Patologías del esófago | BLOQUE 02 · PARCIAL 1 · ESÓFAGO | bloco 02 | — |
| `ap2b03` | 🫃 Patologías del estómago I: gastritis y enfermedad ulcerosa péptica | BLOQUE 03 · PARCIAL 1 · ESTÓMAGO I: GASTRITIS Y ÚLCERA PÉP | bloco 03 | — |
| `ap2b04` | 🩸 Tumores gástricos | BLOQUE 04 · PARCIAL 2 · TUMORES GÁSTRICOS | bloco 04 | — |
| `ap2b05` | 🌿 Enfermedad inflamatoria intestinal | BLOQUE 05 · PARCIAL 2 · ENFERMEDAD INFLAMATORIA INTESTINAL | bloco 05 | — |
| `ap2b06` | 🍇 Pólipos intestinales y adenocarcinoma colorrectal | BLOQUE 06 · PARCIAL 2 · PÓLIPOS Y ADENOCARCINOMA COLORRECT | bloco 06 | — |
| `ap2b07` | 🫀 Nódulos y tumores hepáticos | BLOQUE 07 · FINAL · NÓDULOS Y TUMORES HEPÁTICOS | bloco 07 | — |
| `ap2b08` | 🦋 Patologías tiroideas | BLOQUE 08 · FINAL · PATOLOGÍAS TIROIDEAS | bloco 08 | — |
| `bancoap2` | 🎯 Banco general de preguntas | BANCO GENERAL · TODAS LAS PREGUNTAS | revisão de questões (agregadora) | — |
| `bancofcap2` | 🎴 Flashcards generales | MAZO GENERAL · TODAS LAS FLASHCARDS | revisão de flashcards (agregadora) | — |
| `ap2biblio` | — |  | bloco 09 | `<h2>` (hoje sem título direto) |

## Anatopatologia II Práctica (`anatomia-patologica-ii-practica`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `ap2pportada` | — | PORTADA | guia (00) | `<h2>` (hoje sem título direto) |
| `ap2pb01` | 👅 Carcinoma epidermoide de lengua | BLOQUE 01 · PARCIAL 1 · CAVIDAD ORAL | bloco 01 | — |
| `ap2pb02` | 💧 Adenoma pleomorfo de parótida | BLOQUE 02 · PARCIAL 1 · GLÁNDULA SALIVAL | bloco 02 | — |
| `ap2pb03` | 🧪 Adenocarcinoma esofágico y esófago de Barrett | BLOQUE 03 · PARCIAL 1 · ESÓFAGO I | bloco 03 | — |
| `ap2pb04` | 🔥 Carcinoma epidermoide de esófago | BLOQUE 04 · PARCIAL 1 · ESÓFAGO II | bloco 04 | — |
| `ap2pb05` | 🦠 Gastritis crónica | BLOQUE 05 · PARCIAL 1 · ESTÓMAGO I | bloco 05 | — |
| `ap2pb06` | 💍 Adenocarcinoma gástrico de tipo difuso | BLOQUE 06 · PARCIAL 1 · ESTÓMAGO II | bloco 06 | — |
| `ap2pb07` | 🧬 Adenocarcinoma gástrico de tipo intestinal | BLOQUE 07 · PARCIAL 1 · ESTÓMAGO III | bloco 07 | — |
| `ap2pbanco` | 🎯 Banco general de preguntas | REPASO GENERAL · TODAS LAS LÁMINAS DEL PARCIAL | revisão de questões (agregadora) | — |
| `ap2pmazo` | 🎴 Mazo general y ruleta de láminas | REPASO GENERAL · MAZO Y RULETA DE LÁMINAS | revisão de flashcards (agregadora) | `data-rm-agrega` |
| `ap2pcierre` | 📚 Las siete láminas en una sola pantalla | CIERRE · TABLA INTEGRADORA, BIBLIOGRAFÍA Y CRÉDITOS | bloco 08 | — |

## Medicina Legal (`medicina-legal`)

Numeração dos blocos: **pela ordem** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `medlegb00` | — |  | bloco 01 | `<h2>` (hoje sem título direto) |
| `medlegb01` | ⚖️ Peritaje médico-legal y ejercicio legal de la medicina | BLOQUE 01 · PARCIAL 1 · PERITAJE MÉDICO-LEGAL Y EJERCICIO  | bloco 02 | — |
| `medlegb02` | ⚖️ Introducción a la Medicina Legal | BLOQUE 02 · PARCIAL 1 · INTRODUCCIÓN A LA MEDICINA LEGAL | bloco 03 | — |
| `medlegdocu` | 📑 Documentología, responsabilidad profesional y salud digital | BLOQUE 03 · PARCIAL 1 · DOCUMENTOLOGÍA, RESPONSABILIDAD PR | bloco 04 | — |
| `medlegninez` | 👶 Patología forense de la infancia | BLOQUE 04 · PARCIAL 1 · PATOLOGÍA FORENSE DE LA INFANCIA | bloco 05 | — |
| `medlegb07` | 🩹 Lesionología · contusiones, vitalidad y antigüedad | BLOQUE 05 · PARCIAL 1 · LESIONOLOGÍA: TRAUMATOLOGÍA CONTUS | bloco 06 | — |
| `medlegb08` | 🔫 Arma blanca y arma de fuego | BLOQUE 06 · PARCIAL 1 · ARMA BLANCA Y ARMA DE FUEGO | bloco 07 | — |
| `medlegb09` | ⚡ Agentes físicos · frío, calor, electricidad y cáusticos | BLOQUE 07 · PARCIAL 1 · AGENTES FÍSICOS: FRÍO, CALOR, ELEC | bloco 08 | — |
| `medlegb03` | ⚰️ Tanatología I · diagnóstico de muerte y fenómenos cadavéricos inmediatos | BLOQUE 08 · PARCIAL 1 · TANATOLOGÍA I: DIAGNÓSTICO DE MUER | bloco 09 | — |
| `medlegb04` | 🍂 Tanatología II · putrefacción, conservación y tiempo de muerte | BLOQUE 09 · PARCIAL 1 · TANATOLOGÍA II: FENÓMENOS TARDÍOS  | bloco 10 | — |
| `medlegb05` | 🔬 Autopsia médico-legal · los tres tiempos | BLOQUE 10 · PARCIAL 1 · AUTOPSIA Y NECROPSIA MÉDICO-LEGAL | bloco 11 | — |
| `medlegb06` | 📄 Documentos médico-legales | BLOQUE 11 · PARCIAL 1 · DOCUMENTOS MÉDICO-LEGALES | bloco 12 | — |
| `medlegb10` | 🫁 Asfixias mecánicas | BLOQUE 12 · PARCIAL 2 · ASFIXIAS MECÁNICAS | bloco 13 | — |
| `medlegb11` | 🛟 Atención médico-legal tras violencia sexual | BLOQUE 13 · PARCIAL 2 · ATENCIÓN MÉDICO-LEGAL TRAS VIOLENC | bloco 14 | — |
| `medlegb12` | ⚖️ Deontología médica y bioética | BLOQUE 14 · PARCIAL 2 · DEONTOLOGÍA MÉDICA Y BIOÉTICA | bloco 15 | — |
| `medlegb13` | 🧪 Toxicología forense | BLOQUE 15 · PARCIAL 2 · TOXICOLOGÍA FORENSE | bloco 16 | — |
| `medlegb14` | 🧠 Psiquiatría forense | BLOQUE 16 · PARCIAL 2 · PSIQUIATRÍA FORENSE | bloco 17 | — |
| `medlegb15` | 👶 Tocoginecología médico-legal | BLOQUE 17 · PARCIAL 2 · TOCOGINECOLOGÍA MÉDICO-LEGAL | bloco 18 | — |
| `bancomedleg` | 🎯 Banco general de preguntas | BANCO GENERAL · TODAS LAS PREGUNTAS | revisão de questões (agregadora) | — |
| `bancofcmedleg` | 🎴 Flashcards generales | MAZO GENERAL · TODAS LAS FLASHCARDS | revisão de flashcards (agregadora) | — |
| `bibliomedleg` | 📚 Bibliografía y créditos | BIBLIOGRAFÍA Y NOTA SOBRE LAS IMÁGENES | guia (00) | — |

## Fisiopatologia II (`fisiopatologia-ii`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `fp2portada` | — |  | guia (00) | `<h2>` (hoje sem título direto) |
| `fp2b01` | 🚪 Patologías del esófago | BLOQUE 01 · DIGESTIVO ALTO · ESÓFAGO | bloco 01 | — |
| `fp2b02` | 🛡️ Patologías gástricas | BLOQUE 02 · DIGESTIVO ALTO · ESTÓMAGO | bloco 02 | — |
| `fp2b12` | 🧬 Enfermedades inflamatorias intestinales | BLOQUE 03 · INTESTINO · ENFERMEDAD INFLAMATORIA INTESTINAL | bloco 12 | — |
| `fp2b04` | 🧪 Patologías pancreáticas | BLOQUE 04 · PÁNCREAS | bloco 04 | — |
| `fp2b03` | 🩸 Patologías hepáticas | BLOQUE 05 · HÍGADO | bloco 03 | — |
| `fp2b13` | 🟡 Ictericia y metabolismo de la bilirrubina | BLOQUE 06 · HÍGADO Y VÍAS BILIARES · ICTERICIA | bloco 13 | — |
| `fp2b14` | 🚽 Alteraciones de las vías urinarias | BLOQUE 07 · VÍAS URINARIAS · VEJIGA, MICCIÓN, OBSTRUCCIÓN E  | bloco 14 | — |
| `fp2b05` | 💧 Síndrome nefrótico | BLOQUE 08 · RIÑÓN · SÍNDROME NEFRÓTICO | bloco 05 | — |
| `fp2b06` | 🔥 Síndrome nefrítico y nefropatía diabética | BLOQUE 09 · RIÑÓN · SÍNDROME NEFRÍTICO Y NEFROPATÍA DIABÉTIC | bloco 06 | — |
| `fp2b07` | ⚡ Injuria renal aguda | BLOQUE 10 · RIÑÓN · INJURIA RENAL AGUDA | bloco 07 | — |
| `fp2b08` | 📉 Enfermedad renal crónica | BLOQUE 11 · RIÑÓN · ENFERMEDAD RENAL CRÓNICA | bloco 08 | — |
| `fp2b09` | 🦠 Infecciones de las vías urinarias | BLOQUE 12 · RIÑÓN · INFECCIONES URINARIAS Y PIELONEFRITIS | bloco 09 | — |
| `fp2b10` | 💧 Metabolismo hidrosalino y alteraciones del sodio | BLOQUE 13 · MEDIO INTERNO · METABOLISMO HIDROSALINO Y SODIO | bloco 10 | — |
| `fp2b11` | ⚡ Alteraciones del potasio | BLOQUE 14 · MEDIO INTERNO · ALTERACIONES DEL POTASIO | bloco 11 | — |
| `bancofp2` | 🎯 Banco general · repaso de toda la asignatura |  | revisão de questões (agregadora) | — |
| `revisaofp2` | 🃏 Mazo general y cierre |  | revisão de flashcards (agregadora) | `data-rm-agrega` |

## Toxicología (`toxicologia`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `toxportada` | ☠️ Toxicología · 7.º semestre | PORTADA | guia (00) | — |
| `toxb01` | ⚗️ Bloque 01 · De qué habla la toxicología y cómo se reconoce a un intoxicado | BLOQUE 01 · UNIDAD 1 · FUNDAMENTOS Y TOXIDROMES | bloco 01 | — |
| `toxb02` | 🚪 Bloque 02 · Cortar la entrada: descontaminación según la vía | BLOQUE 02 · UNIDAD 1 · DESCONTAMINACIÓN SEGÚN LA VÍA | bloco 02 | — |
| `toxb03` | 🩸 Bloque 03 · Ya está adentro: adsorbentes, catárticos y depuración | BLOQUE 03 · UNIDAD 1 · ADSORBENTES Y DEPURACIÓN | bloco 03 | — |
| `toxb04` | 🧴 Bloque 04 · Lo que hay debajo de la pileta de la cocina | BLOQUE 04 · UNIDAD 2 · PRODUCTOS DE USO DOMÉSTICO | bloco 04 | — |
| `toxb05` | 🌾 Bloque 05 · Plaguicidas: cinco familias, dos con antídoto | BLOQUE 05 · UNIDAD 2 · PRODUCTOS AGRÍCOLAS · PLAGUICIDAS | bloco 05 | — |
| `toxb06` | 💊 Bloque 06 · AINEs: dos enzimas explican todo | BLOQUE 06 · UNIDAD 2 · INTOXICACIÓN POR AINEs | bloco 06 | — |
| `toxb07` | 🐍 Bloque 07 · Ofidismo: el veneno dice qué suero | BLOQUE 07 · UNIDAD 3 · ACCIDENTE OFÍDICO | bloco 07 | — |
| `toxb08` | 🕷️ Bloque 08 · Cada veneno ataca un sistema distinto | BLOQUE 08 · UNIDAD 3 · ARAÑAS, ESCORPIONES Y ORUGAS | bloco 08 | — |
| `toxb09` | ⚙️ Bloque 09 · Metales: no se destruyen, se acumulan | BLOQUE 09 · UNIDAD 3 · METALES PESADOS | bloco 09 | — |
| `toxb10` | 🌿 Bloque 10 · Tres grupos: la que vomita, la que para el corazón y la que delira | BLOQUE 10 · UNIDAD 3 · PLANTAS TÓXICAS | bloco 10 | — |
| `toxb11` | 💨 Bloque 11 · El oxígeno hace cuatro escalas: cada gas rompe una | BLOQUE 11 · UNIDAD 3 · INTOXICACIÓN POR GASES | bloco 11 | — |
| `toxb12` | ⚡ Bloque 12 · Un solo toxidrome acelerado, dos drogas que lo producen | BLOQUE 12 · UNIDAD 3 · DROGAS ILÍCITAS · ESTIMULANTES | bloco 12 | — |
| `toxb13` | 🌀 Bloque 13 · Uno amenaza la respiración; el otro, la conducta | BLOQUE 13 · UNIDAD 3 · DROGAS ILÍCITAS · DEPRESORES Y ALUCIN | bloco 13 | — |
| `toxb14` | 🧪 Bloque 14 · El veneno no es lo que se bebió: es lo que el hígado fabrica | BLOQUE 14 · UNIDAD 4 · INTOXICACIÓN POR METANOL | bloco 14 | — |
| `toxb15` | 🍷 Bloque 15 · La misma sustancia produce dos cuadros opuestos | BLOQUE 15 · UNIDAD 4 · INTOXICACIÓN POR ALCOHOL ETÍLICO | bloco 15 | — |
| `toxb16` | 💊 Bloque 16 · Dos depresores del mismo sistema, y sólo uno se revierte | BLOQUE 16 · UNIDAD 4 · HIPNÓTICOS Y SEDANTES | bloco 16 | — |
| `bancotox` | 🎯 Banco general de preguntas | BANCO GENERAL · TODA LA MATERIA | revisão de questões (agregadora) | — |
| `toxcierre` | 🎲 Mazo general y ruleta de repaso | MAZO GENERAL · RULETA · BIBLIOGRAFÍA | revisão de flashcards (agregadora) | `data-rm-agrega` |

## Dermatología (`dermatologia`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: **I**, **II**, **III** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `dermportada` | 🩹 Dermatología · 7.º semestre | PORTADA | guia (00) | — |
| `dermb01` | 🧱 Bloque 01 · La piel por dentro | BLOQUE 01 · UNIDAD I · LA PIEL POR DENTRO | bloco 01 | — |
| `dermb02` | ✏️ Bloque 02 · El lenguaje de las lesiones | BLOQUE 02 · UNIDAD I · EL LENGUAJE DE LAS LESIONES | bloco 02 | — |
| `dermb03` | 💊 Bloque 03 · Confirmar y tratar | BLOQUE 03 · UNIDAD I · CONFIRMAR Y TRATAR | bloco 03 | — |
| `dermb04` | 🐛 Bloque 04 · Cuando el bicho vive en la piel | BLOQUE 04 · UNIDAD II · ZOOPARASITOSIS | bloco 04 | — |
| `dermb05` | 🦠 Bloque 05 · Todo depende de la profundidad | BLOQUE 05 · UNIDAD II · PIODERMITIS | bloco 05 | — |
| `dermb06` | 🍄 Bloque 06 · El hongo come queratina | BLOQUE 06 · UNIDAD II · MICOSIS SUPERFICIALES | bloco 06 | — |
| `dermb07` | 🕯️ Bloque 07 · La Candida ya estaba ahí | BLOQUE 07 · UNIDAD II · CANDIDIASIS | bloco 07 | — |
| `dermb08` | 🫧 Bloque 08 · Empieza en el poro, no en la bacteria | BLOQUE 08 · UNIDAD I · ACNÉ Y ROSÁCEA | bloco 08 | — |
| `dermb09` | 🦠 Bloque 09 · El exantema tiene calendario y dirección | BLOQUE 09 · UNIDAD II · INFECCIONES VIRALES Y EXANTEMAS | bloco 09 | — |
| `dermb10` | 🌊 Bloque 10 · La barrera rota pica | BLOQUE 10 · UNIDAD II · DERMATITIS Y PRURITO | bloco 10 | — |
| `dermb11` | 🔵 Bloque 11 · De qué célula nace | BLOQUE 11 · UNIDAD III · TUMORES BENIGNOS Y LESIONES PIGMENT | bloco 11 | — |
| `dermb12` | ☀️ Bloque 12 · El sol lleva la cuenta | BLOQUE 12 · UNIDAD III · CÁNCER DE PIEL NO MELANOMA | bloco 12 | — |
| `dermb13` | ⚫ Bloque 13 · Lo que decide es la profundidad | BLOQUE 13 · UNIDAD III · MELANOMA | bloco 13 | — |
| `dermcierre` | 🎲 Mazo general y ruleta de repaso | MAZO GENERAL · RULETA · BIBLIOGRAFÍA | revisão de flashcards (agregadora) | `data-rm-agrega` |

## Guaraní (`guarani`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: nenhuma.

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `gn00` | — |  | guia (00) | `<h2>` (hoje sem título direto) |
| `gnb01` | 🗣️ El guaraní, el alfabeto y la regla que ordena todo | BLOQUE 01 · PARCIAL 1 · EL IDIOMA Y SU ALFABETO | bloco 01 | — |
| `gnb02` | 👋 Los saludos: preguntar por el momento del día | BLOQUE 02 · PARCIAL 1 · SALUDOS Y PRIMER CONTACTO | bloco 02 | — |
| `gnb03` | 👨‍👩‍👧 El parentesco cambia según quién habla | BLOQUE 03 · PARCIAL 1 · PRESENTACIÓN, PARENTESCO Y VIDA DI | bloco 03 | — |
| `gnb04` | ⚙️ Adelante quién, atrás cuándo | BLOQUE 04 · PARCIAL 1 · DEMOSTRATIVOS, PRONOMBRES Y CONJUG | bloco 04 | — |
| `gnb05` | 🧬 Cuántas raíces tiene la palabra | BLOQUE 05 · PARCIAL 1 · SUSTANTIVOS, POSESIÓN Y ADJETIVOS | bloco 05 | — |
| `gnb06` | 🫀 Ninguna parte del cuerpo se aprende sola | BLOQUE 06 · PARCIAL 2 · PARTES DEL CUERPO HUMANO | bloco 06 | — |
| `gnb07` | 🤕 Quién posee la parte que duele | BLOQUE 07 · PARCIAL 2 · FRASES CON PARTES DEL CUERPO | bloco 07 | — |
| `gnb08` | 🩺 La palabra te dice dónde y qué | BLOQUE 08 · PARCIAL 2 · PATOLOGÍAS Y SÍNTOMAS | bloco 08 | — |
| `gnb09` | ⚙️ ¿El síntoma se conjuga o se posee? | BLOQUE 09 · PARCIAL 2 · VERBOS Y FRASES DE SÍNTOMAS | bloco 09 | — |
| `gnb10` | 👨‍👩‍👧 La misma frase, dicha de dos maneras | BLOQUE 10 · PARCIAL 2 · LAS DOS FORMAS Y LA SALUD DE LA FA | bloco 10 | — |
| `gnb11` | 🩻 El examen físico se pide antes de hacerse | BLOQUE 11 · PARCIAL 2 · LA CONSULTA: PERMISO, INTENSIDAD Y | bloco 11 | — |
| `gnb12` | 🗣️ La consulta tiene un orden fijo | BLOQUE 12 · PARCIAL 2 · DIÁLOGOS CLÍNICOS | bloco 12 | — |
| `gnb13` | 🦟 El que sufre va primero, el animal va al final | BLOQUE 13 · PARCIAL 2 · ANIMALES TRANSMISORES | bloco 13 | — |
| `bancognrl` | 🏦 Banco general de preguntas | BANCO GENERAL · REPASO DE TODA LA MATERIA | revisão de questões (agregadora) | — |
| `mazognrl` | 🎲 Mazo general y ruleta | MAZO GENERAL · RULETA DE REPASO | revisão de flashcards (agregadora) | `data-rm-agrega` |

## Ortopedia y Traumatología (`ortopedia`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: **I**, **II**, **III**, **IV**, **V**, **VI**, **VII**, **VIII**, **IX**, **X**, **XI**, **XII**, **XIII**, **XIV**, **XV**, **XVI** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `otportada` | 🦴 Ortopedia y Traumatología · 7.º semestre | PORTADA | guia (00) | — |
| `otb01` | 🔎 Bloque 01 · El diagnóstico traumatológico | BLOQUE 01 · UNIDAD I · MÉTODOS AUXILIARES DE DIAGNÓSTICO | bloco 01 | — |
| `otb02` | 💪 Bloque 02 · Cuando la fuerza rompe el músculo y el tendón | BLOQUE 02 · UNIDAD II · LESIONES MUSCULARES Y TENDINOSAS | bloco 02 | — |
| `otb03` | 🦵 Bloque 03 · La articulación que se sale y vuelve | BLOQUE 03 · UNIDAD II · ARTICULACIÓN, LIGAMENTO Y ESGUINCE | bloco 03 | — |
| `otb04` | 🦴 Bloque 04 · Fracturas: cinco preguntas, cinco clasificaciones | BLOQUE 04 · UNIDAD III · FRACTURAS | bloco 04 | — |
| `otb05` | 📦 Bloque 05 · Inmovilizar es decidir cómo va a consolidar | BLOQUE 05 · UNIDAD IV · INMOVILIZACIONES | bloco 05 | — |
| `otb06` | 🧬 Bloque 06 · Vasos, células y la cantidad justa de movimiento | BLOQUE 06 · UNIDAD V · CONSOLIDACIÓN | bloco 06 | — |
| `otb07` | ⏱️ Bloque 07 · Lo que pasa después del golpe | BLOQUE 07 · UNIDAD VI · COMPLICACIONES GENERALES DE LAS LESI | bloco 07 | — |
| `otb08` | 🦵 Bloque 08 · El líquido dice la hora | BLOQUE 08 · UNIDAD VII · LESIONES TRAUMÁTICAS DE RODILLA ASO | bloco 08 | — |
| `otb09` | 🦵 Bloque 09 · Cuando el trazo entra en la articulación | BLOQUE 09 · UNIDAD VIII · FRACTURAS DE FÉMUR DISTAL Y RÓTULA | bloco 09 | — |
| `otb10` | 👵 Bloque 10 · Poca energía, mucho riesgo | BLOQUE 10 · UNIDAD IX · FRACTURAS EN LA TERCERA EDAD | bloco 10 | — |
| `otb11` | 🧒 Bloque 11 · El hueso del niño no miente | BLOQUE 11 · UNIDAD X · FRACTURAS EN EL INFANTE | bloco 11 | — |
| `otb12` | 🚦 Bloque 12 · El hueso puede esperar; la médula no | BLOQUE 12 · UNIDAD XI · LESIÓN RAQUIMEDULAR Y FRACTURAS DE C | bloco 12 | — |
| `otb13` | ✋ Bloque 13 · El enemigo es la rigidez | BLOQUE 13 · UNIDAD XII · MUÑECA Y MANO | bloco 13 | — |
| `otb14` | 🦠 Bloque 14 · El reloj se cuenta en días | BLOQUE 14 · UNIDAD XIII · INFECCIONES OSTEOARTICULARES | bloco 14 | — |
| `otb15` | 🧊 Bloque 15 · Frío, blanco y seco | BLOQUE 15 · UNIDAD XIV · TUBERCULOSIS OSTEOARTICULAR | bloco 15 | — |
| `otb16` | 🌀 Bloque 16 · No es una curva, es una rotación | BLOQUE 16 · UNIDAD XV · DEFORMIDADES DE LA COLUMNA · ESCOLIO | bloco 16 | — |
| `otb17` | 🔦 Bloque 17 · El dolor no está donde duele | BLOQUE 17 · UNIDAD XVI · LUMBALGIA Y LUMBOCIATALGIA | bloco 17 | — |
| `bancoorto` | 🗂️ Banco general de preguntas | BANCO GENERAL · TODAS LAS PREGUNTAS EN ORDEN | revisão de questões (agregadora) | — |
| `bancofcorto` | 🎲 Mazo general y ruleta de repaso | MAZO GENERAL · RULETA · BIBLIOGRAFÍA | revisão de flashcards (agregadora) | — |

## Oftalmología (`oftalmologia`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: **I**, **II**, **III**, **IV**, **V** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `ofportada` | 👁️ Oftalmología · 7.º semestre | PORTADA | guia (00) | — |
| `ofb01` | 👁️ Bloque 01 · Cómo está hecho el ojo y por qué funciona así | BLOQUE 01 · PARCIAL 1 · UNIDAD I · ANATOMÍA, FISIOLOGÍA Y EM | bloco 01 | — |
| `ofb02` | 🔦 Bloque 02 · Cómo se examina un ojo, paso por paso | BLOQUE 02 · PARCIAL 1 · UNIDAD II · EXAMEN SEMIOLÓGICO DEL O | bloco 02 | — |
| `ofb03` | 🔬 Bloque 03 · Los aparatos: qué mide cada uno y cuándo pedirlo | BLOQUE 03 · PARCIAL 1 · UNIDAD II · PRUEBAS ESPECIALES | bloco 03 | — |
| `ofb04` | 🔴 Bloque 04 · Ojo rojo: separar lo banal de la urgencia en dos preguntas | BLOQUE 04 · PARCIAL 1 · UNIDAD III · SÍNDROME DE OJO ROJO | bloco 04 | — |
| `ofb05` | 🔎 Bloque 05 · Catarata: la opacidad dice dónde, y el dónde dice qué síntoma | BLOQUE 05 · PARCIAL 1 · UNIDAD III · CATARATA | bloco 05 | — |
| `ofb06` | 🧿 Bloque 06 · Glaucoma: no es la presión, es el nervio | BLOQUE 06 · PARCIAL 1 · UNIDAD IV · GLAUCOMA | bloco 06 | — |
| `ofb07` | 🩻 Bloque 07 · Retina: no duele, y cuando avisa ya avanzó | BLOQUE 07 · PARCIAL 1 · UNIDAD V · RETINA Y RETINOPATÍA DIAB | bloco 07 | — |
| `ofb08` | 🕳️ Bloque 08 · Desprendimiento de retina: la urgencia que tampoco duele | BLOQUE 08 · PARCIAL 1 · UNIDAD V · DESPRENDIMIENTO DE RETINA | bloco 08 | — |
| `ofb09` | 🌒 Bloque 09 · Retinosis pigmentaria: la visión que se apaga desde el borde | BLOQUE 09 · PARCIAL 1 · UNIDAD V · RETINOSIS PIGMENTARIA | bloco 09 | — |
| `bancooft` | 🎯 Banco general de Oftalmología | BANCO GENERAL · REPASO FINAL · TODAS LAS PREGUNTAS | revisão de questões (agregadora) | — |
| `oftcierre` | 🎴 Mazo general, ruleta y bibliografía | CIERRE · REPASO FINAL · MAZO GENERAL Y BIBLIOGRAFÍA | revisão de flashcards (agregadora) | `data-rm-agrega` |

## Neurología (`neurologia`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: **I**, **II**, **III**, **IV** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `neuportada` | 🧠 Neurología · 7.º semestre |  | guia (00) | — |
| `neub01` | 🧠 Estado de conciencia | BLOQUE 01 · UNIDAD I · SEMIOLOGÍA | bloco 01 | — |
| `neub02` | 🗣️ Lenguaje y afasias | BLOQUE 02 · UNIDAD I · SEMIOLOGÍA | bloco 02 | — |
| `neub03` | 🚶 Facies, actitud y marcha · atención | BLOQUE 03 · UNIDAD I · SEMIOLOGÍA | bloco 03 | — |
| `neub04` | 👁️ Pares craneales I–VI · olfato, visión y movimiento ocular | BLOQUE 04 · UNIDAD I · PARES CRANEALES | bloco 04 | — |
| `neub05` | 😶 Pares craneales V, VII y VIII · la cara y el oído | BLOQUE 05 · UNIDAD I · PARES CRANEALES | bloco 05 | — |
| `neub06` | 🗣️ Pares craneales IX, X, XI y XII · los pares bajos | BLOQUE 06 · UNIDAD I · PARES CRANEALES | bloco 06 | — |
| `neub07` | 💪 Sistema motor · fuerza, tono y reflejos | BLOQUE 07 · UNIDAD I · SISTEMA MOTOR | bloco 07 | — |
| `neub08` | 🖐️ Sistema sensitivo · vías y modalidades | BLOQUE 08 · UNIDAD I · SISTEMA SENSITIVO | bloco 08 | — |
| `neub09` | ⚡ Síndromes irritativos | BLOQUE 09 · UNIDAD II · SÍNDROMES | bloco 09 | — |
| `neub10` | 📉 Síndromes deficitarios y centrales | BLOQUE 10 · UNIDAD II · SÍNDROMES | bloco 10 | — |
| `neub11` | 🧠 Síndromes lobares | BLOQUE 11 · UNIDAD II · SÍNDROMES | bloco 11 | — |
| `neub12` | 🪜 Síndromes alternos del tronco encefálico | BLOQUE 12 · UNIDAD II · SÍNDROMES | bloco 12 | — |
| `neub13` | 🪢 Síndromes medulares | BLOQUE 13 · UNIDAD II · SÍNDROMES | bloco 13 | — |
| `neub14` | 🤸 Síndromes cerebeloso, piramidal y extrapiramidal | BLOQUE 14 · UNIDAD II · SÍNDROMES | bloco 14 | — |
| `neub15` | 🔌 Síndromes periféricos y radiculares | BLOQUE 15 · UNIDAD II · SÍNDROMES | bloco 15 | — |
| `neub16` | 🔗 Síndromes de la unión neuromuscular | BLOQUE 16 · UNIDAD II · SÍNDROMES | bloco 16 | — |
| `neub17` | 🌙 Sueño y vigilia | BLOQUE 17 · UNIDAD III · SUEÑO Y VIGILIA | bloco 17 | — |
| `neub18` | 🚨 Glasgow, coma y muerte cerebral | BLOQUE 18 · UNIDAD IV · COMA Y MUERTE CEREBRAL | bloco 18 | — |
| `neub19` | 📚 Temas cobrados en Examen Final · complemento por literatura | BLOQUE 19 · COMPLEMENTO · SIN SLIDE-FUENTE | bloco 19 | ⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco) |
| `banconeu` | 🎯 Banco general de Neurología | BANCO GENERAL · REPASO FINAL · TODAS LAS PREGUNTAS | revisão de questões (agregadora) | — |
| `revisaoneu` | 🧭 Cierre · ¿dónde está la lesión? | REPASO FINAL · NO ES UN BLOQUE NUEVO · NADA DE ESTO SE ESTUD | revisão de flashcards (agregadora) | `data-rm-agrega` |

## Anestesiología (`anestesiologia`)

Numeração dos blocos: **pelo id (`…bNN`)** · Unidades encontradas nos marcadores: **I**, **II** (nome e cor: **a definir por José**).

| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |
|---|---|---|---|---|
| `aneportada` | 💤 Anestesiología · 7.º semestre | PORTADA | guia (00) | — |
| `aneb01` | 🧠 ¿Qué es la anestesiología, y qué hace realmente el anestesiólogo? | BLOQUE 01 · UNIDAD I · QUÉ ES LA ANESTESIOLOGÍA | bloco 01 | — |
| `aneb02` | 🗺️ Modalidades: general, regional, local y sedación | BLOQUE 02 · UNIDAD I · MODALIDADES ANESTÉSICAS | bloco 02 | — |
| `aneb03` | 🌍 Anestesia general: objetivos, etapas y técnicas | BLOQUE 03 · UNIDAD I · ANESTESIA GENERAL | bloco 03 | — |
| `aneb04` | 🎯 Anestesia regional: neuroeje, plexos y bloqueos periféricos | BLOQUE 04 · UNIDAD I · ANESTESIA REGIONAL | bloco 04 | — |
| `aneb05` | 📟 Monitorización básica: qué mide cada aparato y qué NO mide | BLOQUE 05 · UNIDAD I · MONITORIZACIÓN Y CAPNOGRAFÍA | bloco 05 | — |
| `aneb06` | 🧑‍⚕️ La visita preanestésica: convertir datos en un plan | BLOQUE 06 · UNIDAD I · LA VISITA PREANESTÉSICA | bloco 06 | — |
| `aneb07` | ⚖️ Clasificación ASA: qué mide, qué no mide y para qué sirve | BLOQUE 07 · UNIDAD I · CLASIFICACIÓN ASA | bloco 07 | — |
| `aneb08` | ❤️ Riesgo cardíaco perioperatorio: qué obliga a parar y qué obliga a estudiar | BLOQUE 08 · UNIDAD I · RIESGO CARDÍACO PERIOPERATORIO | bloco 08 | — |
| `aneb09` | 🫁 Riesgo pulmonar y pruebas complementarias: pedir con una pregunta clínica | BLOQUE 09 · UNIDAD I · RIESGO PULMONAR Y PRUEBAS COMPLEMEN | bloco 09 | — |
| `aneb10` | 💊 Medicación habitual y premedicación: continuar, ajustar o pausar | BLOQUE 10 · UNIDAD I · MEDICACIÓN PERIOPERATORIA | bloco 10 | — |
| `aneb11` | ⏳ Ayuno preanestésico: por qué se ayuna y cuándo la tabla no alcanza | BLOQUE 11 · UNIDAD I · AYUNO Y RIESGO DE ASPIRACIÓN | bloco 11 | — |
| `aneb12` | 🫁 La vía aérea: anatomía funcional y las tres dificultades | BLOQUE 12 · UNIDAD II · VÍA AÉREA · ANATOMÍA Y DEFINICIONE | bloco 12 | — |
| `aneb13` | 🔍 Evaluación de la vía aérea: LEMON, 3-3-2, Mallampati y Cormack-Lehane | BLOQUE 13 · UNIDAD II · EVALUACIÓN DE LA VÍA AÉREA | bloco 13 | — |
| `aneb14` | 🧰 Dispositivos, ventilación con mascarilla, intubación y confirmación | BLOQUE 14 · UNIDAD II · MANEJO DE LA VÍA AÉREA | bloco 14 | — |
| `aneb15` | 🚨 Vía aérea difícil: prevista, no prevista y el Plan A-B-C-D | BLOQUE 15 · UNIDAD II · VÍA AÉREA DIFÍCIL · PLAN A-B-C-D | bloco 15 | — |
| `bancoane` | 🎯 Banco general de Anestesiología | BANCO GENERAL · REPASO FINAL · TODAS LAS PREGUNTAS | revisão de questões (agregadora) | — |
| `anecierre` | 🎴 Cierre: el algoritmo mental, el mazo general y la bibliografía | CIERRE · REPASO FINAL · ALGORITMO MENTAL, MAZO GENERAL Y BIB | revisão de flashcards (agregadora) | `data-rm-agrega` |

