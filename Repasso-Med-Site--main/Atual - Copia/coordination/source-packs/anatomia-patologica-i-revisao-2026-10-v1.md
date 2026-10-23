# Anatomía Patológica I — revisão completa (2026-10) · fonte → decisão → destino

Arquivo: `netlify/functions/materias-privadas/anatomia-patologica.html` (slug de grifos `anatomia-patologica`).

## 1. Fontes realmente disponíveis

| Fonte | Situação |
|---|---|
| Slides originais da cátedra de AP I | **Não existem no Drive.** Só há resumos visuais derivados. |
| Robbins (literatura-base) | Não consultado nesta rodada. |
| Texto atual do site, grifos (Supabase, somente leitura), figuras do site | Consultados. |

Consequência: **nenhuma afirmação científica nova foi acrescentada.** A rodada corrigiu língua, ordem de ensino, repetição, voz G0 e enunciados. Não há revisão científica completa por fonte original.

## 2. Contagens antes → depois

| Item | Antes | Depois |
|---|---|---|
| Perguntas (blocos + bancos) | 718 | 718 |
| Alternativas | 1320 | 1320 |
| Letras de gabarito | idênticas | idênticas |
| Cartões | 297 | 297 |
| Imagens referenciadas | 31 | 31 (nenhuma removida) |
| «Ver respuesta» | 538 | 538 |
| IDs | 28 | 28 |
| Grifos de alunos | 60 (introduccion 32, adaptacion 27, lesion 1) | 60, nenhum texto alterado dentro ou ao redor |

## 3. Fonte → achado → decisão → destino

| Achado | Decisão | Destino |
|---|---|---|
| Explicações/opções com português misturado (≈80 trechos: «licuefactiva», «húmeda», «hongos», «apoptosoma», «exudado/trasudado», «sustancia P»…) | Passar a castelhano; ciência intacta | explicações e opções, bloco + banco |
| 13 enunciados em português/híbrido (necrosis licuefactiva, hemosiderina, exudado, linfangitis, opsonina, fagocitosis, necroptosis, BCL-2 ×2, factores de riesgo modificables, patrón morfológico, ion/bomba Na⁺/K⁺) | Corrigir o texto; resposta e letra mantidas | 26 cópias (bloco + banco), cada uma com ponte `data-guard-previous-stem-sha1` |
| Pseudomonas: enunciado dizia «neutropénico», contradizia a explicação | Alinhado ao caso de queimaduras extensas; gabarito igual | pergunta + explicação |
| Pergunta do íon: «se concentra» ambíguo; opção «Ca²⁺ que sale» | Reescrita como consequência da falha da bomba Na⁺/K⁺; opção simplificada | pergunta (2 cópias) |
| «Truco ex-Sudado tem Substâncias» em português | Trocado por frase sobre o mecanismo | explicação |
| Apêndice «similares a Staphylococcus»; MPO «libera hierro del hemo» | Retirados por não terem fonte | explicações |
| Resumo duplicado de calcificação (analysis-card + key-box) na seção de necrosis | Fundido; conteúdo mantido uma vez | bloco necrosis |
| Card «Desde cero — Citología…» depois das perguntas que o cobram | Movido para antes do grupo (RESUMO ENSINA → QUESTÃO COBRA) | introducción |
| Voz G0: «la 1.ª pregunta de la cátedra», «Tema recurrente de la cátedra», «Caso tomado de exámenes», «Contenido… NO está en las diapositivas pero se toma» | Reescritos como linguagem de estudo, sem expor estratégia editorial | texto de apoio |
| Cabeçalhos internos «cierre de la materia», «banco consolidado» | «repaso del bloque», «práctica adicional» | cabeçalhos |

## 4. Figuras (31) — revisão visual

As 31 figuras foram abertas uma a uma e comparadas com legenda/alt e com o texto do bloco. Nenhuma foi removida.

| Figura | Achado | Decisão |
|---|---|---|
| `ap1_b09_05_molecular_marcadores` | Cabeçalhos cortados: «TOQUERATINAS», «S 00», «C LINFOIDES» | **Retocada**: 4 cabeçalhos redesenhados (CITOQUERATINAS, VIMENTINA, S100 / HMB-45, CD LINFOIDES) |
| `ap1_b08_04_primera_segunda_intencion` | Etiqueta «ICATRIZ AMPLIA» estourava a pílula | **Retocada**: pílula alargada, «CICATRIZ AMPLIA» |
| `ap1_b01_01`, `ap1_b03_01`, `ap1_b02_03`, `ap1_b09_01`, `ap1_b09_04` | Textos que tocam a borda de caixas (ex.: «El impacto», «Mitocondria…»); legíveis | Sem alteração; observação |
| `ap1_b01_03` | Subtítulo em voseo («Asociá…») | Sem alteração; observação (padrão castelhano neutro) |
| Demais 22 | Sem erro de rótulo encontrado frente ao texto do site | Sem alteração |
| `ap1_b04_03_infartos_calcificaciones.webp` (sem `-rev`) | Arquivo não referenciado pelo HTML (o HTML usa `-rev`) | Mantido; sem apagar |

## 5. Pendências (não alteradas, por falta de fonte ou por grifo)

1. **Fonte original ausente** para toda a matéria; Robbins 9.ª ed. não consultado.
2. «Vía de diseminación típica de un tumor pulmonar (y de los sarcomas) = hematógena» e a explicação «sarcomas carecen de linfáticos…» não têm fonte; a figura b09_04 reforça «sarcomas = hematógena, carcinomas = linfática». Gabarito mantido. **Precisa de revisão humana** (carcinoma de pulmão usa as duas vias).
3. Duplicados semânticos mantidos por 8-A.9 (toracocentesis, COX-2, primera intención, β2-integrina, absceso cerebral).
4. Perguntas fora do bloco temático (apoptose do ciclo menstrual no bloco 2; cicatrização na inflamação aguda; hipertrofia em acumulações): não movidas para não mexer em ids/âncoras.
5. **Frases adjacentes a grifos** (60 grifos) ficaram sem edição, mesmo se contêm português residual; migração segura de grifos pendente.
6. Bancos-espelho têm ordem própria de alternativas (normal).
7. Layout celular 390 px com 2 px de overflow horizontal: já existia em `main`.

## 6. Verificação

Navegador (390 px e 1280 px): 31 imagens, 0 quebradas, reveal 3/3, 297 cartões, sem erros de JS; 2 px de overflow no celular idêntico ao de `main`. Guard: ver PR.
