# Anatomía Patológica II · issue #638 · relatos de José + foto del gabarito (04/11/2026) · rastreabilidad (8-A.5-B / 8-A.11)

Páginas tocadas: `anatomia-patologica-ii.html` (teoría, bloques 04, 05, 07 y banco general) y `anatomia-patologica-ii-practica.html` (bloque 08 y banco). Ningún grifo, imagen, id de sección, pregunta o flashcard fue retirado (probado en `tools/qa/ap2-638/ap2-638.test.cjs`).

## 1. Fuentes
| Fuente | Qué es | Legibilidad | Uso |
|---|---|---|---|
| Issue #638 (relatos de José) | 11 ítems escritos + 7 relatos de contenido + 6 «cerradas» (12–17) recordadas, **no** respuestas oficiales | texto | enunciados (reconstrucción rastreable) |
| Foto `Gabarito AP II P2 - 6H filas 1 e 2 - recebido 2026-11-04.jpeg` (Drive `1s2vLSaCZ0AiubFMV375DoNSmG7UJNhLb`) | 2 hojas manuscritas, filas 1 y 2, 17 ítems cada una | **CLARA** (leída directo; coincide con la transcripción provisional del issue en los 34 ítems) | 11 respuestas escritas por fila (22 líneas) + 12 letras |
| Slides cátedra `Clase 4 - Patologías del estómago - Tumores.pdf` (`1xtq6kdBWNlzT7Brl2ctG9SXq84-vTBrj`) | texto extraído | CLARA | carcinoide gástrico, GIST, Lauren, MALT |
| Slides cátedra `Clase 5 - Patologías del intestino.pptx.pdf` (`1G0_FCwBOXxBsLYI9feBEpz9J4sQkbsk2`) | texto extraído | CLARA | Crohn, colitis ulcerosa, extraintestinales, megacolon |
| Slides cátedra `Clase 7 - Patologías hepáticas - Nódulos y tumores.pptx.PDF` (`1392I-s2Bs8g0INrOBVlZnS3M0WqeO0sN`) | texto extraído (41 slides) | CLARA | CHC (mutaciones), adenoma (3 subtipos), HNF, colangiocarcinoma |
| Material oficial P2 práctica `07 - Cirrosis hepatica.pdf`, `08 - Carcinoma hepatocelular.pdf`, `10 - Enf crohn.pdf` | texto extraído | PARCIAL (manuscrito + OCR) | cirrosis (colágeno I y III), Crohn macro/clínica |
| Robbins Cotran (literatura base) | PDF sin capa de texto | **ILEGIBLE** (igual que en rondas anteriores) | **no consultado**; ninguna afirmación se apoya sólo en él |

Supabase (solo lectura, 04/11): `anatomia-patologica-ii` tiene 10 grifos en `ap2b04` (texto protegido, intacto y antes de cualquier edición del bloque), 0 en `ap2b05` y `ap2b07`; `…-practica` 0 grifos, 0 notas, 0 trazos. No se escribió nada.

## 2. Regla aplicada a las letras (8-A.5-A)
Las **12 letras MCQ** de la foto (fila 1: 12 C · 13 B · 14 A · 15 D · 16 B · 17 A; fila 2: 12 C · 13 A · 14 B · 15 D · 16 C · 17 D) fueron **IGNORADAS para contenido**: sólo se registran como dato estructural (las dos filas barajan las alternativas de 13, 14, 16 y 17). Ninguna letra se unió a una pregunta por número. Las **respuestas escritas** (las 11 de la fila 1; la fila 2 repite las mismas, reordenadas, salvo el ítem 3) se analizaron **por contenido**; la numeración del relato no corresponde a la de la foto (p. ej. relato 5 «megacolon» ↔ foto 11) y no se usó para unir.

## 3. Matriz respuesta escrita (foto) → decisión → destino
| Respuesta en la foto | Concepto | Decisión | Destino / evidencia |
|---|---|---|---|
| «Masa ulcerada, bien delimitada, bordes sobreelevados» | macroscopía del adenocarcinoma intestinal | DUPLICATA SEMÂNTICA (enunciado no recuperable) | `ap2b04#1` (Lauren intestinal, «masa ulcerada en el antro») y práctica `ap2pb07` («masa ulcerada o exofítica») |
| «Uveítis / poliartritis migratoria» | manifestaciones extraintestinales de la EII | **NUEVA** | N6 (`ap2b05`); slide 5, pp. «Manifestaciones extraintestinales» |
| «Bilirrubina / ascitis» (fila 1) · «Encefalopatía / tasa de protrombina» (fila 2) | dos pares distintos para el mismo ítem (¿parámetros de gravedad de cirrosis?) | **PENDIENTE** | falta el enunciado; ni los slides ni el material oficial traen Child-Pugh ni «descompensación» como concepto. No se inventó |
| «Seudopólipos inflamatorios» | islotes de mucosa regenerativa | DUPLICATA | `ap2b05#12` (se mantiene: ya rotulada examen) |
| «Colágeno I» | colágeno de las células estrelladas | **RELACIONADA PERO DISTINTA** (la existente pregunta la célula, no el colágeno) | N9 (`ap2pb08`, complementaria) + «tipo I y III» ahora en el cuerpo; material oficial `07 - Cirrosis` |
| «E-cadherina» | CDH1 en el difuso | DUPLICATA | `ap2b04#2` |
| «Inflamación transmural / granulomas no caseificantes / fisura» | Crohn | DUPLICATA | `ap2b05#1`, `#2`, `#5` |
| «Anemia megaloblástica / estenosis fibrosante» | complicaciones del Crohn | **NUEVA** | N10 (`ap2b05`); slide 5: B₁₂ por compromiso ileal y «estenosis fibrosantes» |
| «Cél. neuroendocrina» | origen del carcinoide | **NUEVA** (complementaria: enunciado desconocido) | N5 (`ap2b04`); slide 4: «sistema endocrino difuso» |
| «Displasia» | lesión premaligna del colangiocarcinoma | DUPLICATA | `ap2b07#10` (BilIN-3; slide 7: «BilIN-3 máximo riesgo») |
| «Megacolon tóxico» | complicación grave de la CU | DUPLICATA + canónica reforzada (8-A.1-B) | `ap2b05#4` se mantiene (mismo id/lugar); se agregó el mecanismo a su explicación y al bloque |

## 4. Matriz relatos de José → decisión → destino
| Relato | Decisión | Destino |
|---|---|---|
| 1 · dos mutaciones más frecuentes del CHC | NUEVA (cubierta: ya enseñada) | N1 `ap2b07`; slide 7 p. 27: β-catenina ~40 % y p53 ~60 % |
| 2 · Crohn macro: distribución y grosor de pared | NUEVA (parcial: «pared engrosada» sólo estaba en la tabla comparativa; ahora también en la tarjeta de estenosis) | N7 `ap2b05`; slide 5 «Pared intestinal engrosada» |
| 3 · dos patologías asociadas a carcinoides gástricos | NUEVA (cubierta: tipos I/II/III ya en el bloque 04) | N3 `ap2b04`; slide 4 «gastritis atrófica autoinmunitaria, Zollinger-Ellison, hiperplasia de células endocrinas» |
| 4 · lesión premaligna del colangiocarcinoma y grado | DUPLICATA EXACTA | `ap2b07#10` |
| 5 · complicación grave de CU con daño de la muscular propia | DUPLICATA SEMÂNTICA → canónica reforzada | `ap2b05#4` (+ mecanismo, slide 5 «dañan la muscular propia y alteran la función neuromuscular») |
| 6 · DD de linfoma gástrico: qué se evidencia | DUPLICATA SEMÂNTICA (lesiones linfoepiteliales) | `ap2b04#5`, `#13` |
| 7 · dos hallazgos macroscópicos de la CU | RELACIONADA PERO DISTINTA | N8 `ap2b05` (formato «Citá dos»; agrega pared sin engrosamiento/serosa normal/sin estenosis) |
| 8 · dos complicaciones extraintestinales de la CU | NUEVA (= relato «dos manifestaciones extraintestinales de EII») | N6 |
| 9 · mujer 22 años, SOP, masa sólida bien delimitada: factor de riesgo | **PENDIENTE** | no se determina el órgano ni la opción; el adenoma (ACO/anabolizantes) ya está enseñado y N2 lo cubre |
| 10 · masa submucosa en curvatura menor, CD117+: célula de origen | NUEVA (reconstruida; alternativas nuevas) | N4 `ap2b04`; slide 4 «células intersticiales de Cajal» |
| 11 · cólico, edema, úlceras y zonas normales, abscesos crípticos: manifestación clínica | **PENDIENTE** (la respuesta no es determinable; los abscesos crípticos existen en CU y Crohn) | la clínica de ambas ya está enseñada en el bloque 05 |
| «islotes aislados de mucosa regenerativa» | DUPLICATA | `ap2b05#12` |
| «mutación de adhesión en adenocarcinoma difuso» / «aplanamiento de rugosidades sin linitis» | DUPLICATA | `ap2b04#2` |
| «componente principal de células estrelladas perisinusoidales» | RELACIONADA PERO DISTINTA | N9 |
| «caso Lauren / adenocarcinoma intestinal» | DUPLICATA | `ap2b04#1` |
| «clasificación del adenoma hepático y subtipo de mayor riesgo» | NUEVA (parcial: subtipos incompletos → 1 párrafo mínimo) | N2 `ap2b07`; slide 7 p. 16 |
| 12 · pronóstico del carcinoide digestivo («localización») | DUPLICATA | `ap2b04#7` (se reforzó «factor pronóstico más importante»; slide 4) |
| 13 · colitis continua / Crohn segmentaria | DUPLICATA | `ap2b05#1`, `#3` |
| 14 · cirrosis descompensada, «algo con protrombina» | **PENDIENTE** | sin enunciado ni opciones; no hay material de descompensación |
| 15 · alcoholismo, puentes fibrosos, nódulos regenerativos | COBERTA (sin inserción) | práctica `ap2pb08` (caso de 56 años + 12 preguntas) |
| 16 · pérdida de peso, 6 cm irregular, mucosa fúndica sin rugosidades, H. pylori, «difuso» | DUPLICATA (respuesta recordada compatible con la ciencia, enunciado incompleto) | `ap2b04#2` |
| 17 · masa >9 cm, cicatriz estrellada, septos, arterias prominentes, «HNF» | DUPLICATA | `ap2b07#3`; slide 7: «puede alcanzar muchos cm» (compatible); la variante fibrolamelar (`ap2b07#7`) también tiene cicatriz |

## 5. Preguntas nuevas (10) y dónde entran
N1 CHC mutaciones (abierta) · N2 subtipos del adenoma (MCQ, **b**) · N3 patologías del carcinoide (abierta) · N4 GIST→Cajal (MCQ, **b**) · N5 origen del carcinoide (MCQ complementaria, **d**) · N6 extraintestinales (abierta) · N7 Crohn macro (abierta) · N8 CU macro (abierta) · N10 complicaciones del Crohn (abierta) — todas en bloque **y** banco, mismas en ambas copias; N9 colágeno I/III (MCQ complementaria, **a**) en práctica bloque 08 y banco. Rótulo: «Basada en preguntas de examen» (reconstruida: enunciado de José, respuesta de los slides; **no** transcripción literal) o «Pregunta complementaria»; ninguna «oficial».

## 6. Enseñanza agregada (8-A.2: lo mínimo) y divergencias registradas
- Bloque 05: poliartritis migratoria/sacroilitis/espondilitis; «estenosis fibrosante» + pared engrosada; «anemia megaloblástica»; mecanismo del megacolon; **CU: «pared fina» → «sin engrosamiento»** (el slide dice «no hay engrosamiento mural»; la imagen del bloque conserva el rótulo portugués «parede fina»: se aclara en la nota bajo la figura, la imagen no se tocó).
- Bloque 07: párrafo de los tres subtipos del adenoma (HNF1-α · β-catenina, alto riesgo · inflamatorio).
- Bloque 04: frase de la explicación de `ap2b04#7` («factor pronóstico más importante»). **Divergencia:** el slide anota la hiperplasia de «células G»; el sitio dice «ECL» (la célula que origina el tumor); se mantuvo ECL y N3 acepta «hiperplasia de células endocrinas».
- Práctica 08: «tipo I y III» en el paso 3.
- `ap2b04#10` (tipo I) tiene como distractor el Zollinger-Ellison (tipo II): sigue siendo incorrecto porque el enunciado dice «tipo I»; no se tocó.

## 7. Contagens declaradas
Teoría: banco 156 → **165** (104 → **112** basadas en examen, 52 → **53** variantes); por bloque 04: 15 → 18 · 05: 14 → 18 · 07: 14 → 16. Práctica: bloque 08 12 → **13**; Parcial 2 108 → **109**; banco completo 220 → **221**.

## 8. Gabaritos (8-A.7)
Teoría (bloques 01–08, 138 → 141 MCQ): A/B/C/D 36/35/34/33 → 36/37/34/34; mayor corrida 4 (preexistente) → 4; abcd/dcba 0 → 0. Práctica (188 → 189): 46/49/49/44 → 47/49/49/44; corrida 2; abcd/dcba 3 → 3 (preexistentes, no tocados).

## 9. Pendientes que requieren decisión humana
Foto ítem 3 (bilirrubina/ascitis ↔ encefalopatía/protrombina) y relatos 9, 11, 14: falta enunciado/opciones. Si José recuerda los enunciados o consigue el material de cirrosis descompensada, se incorporan con la ley 8-A.
