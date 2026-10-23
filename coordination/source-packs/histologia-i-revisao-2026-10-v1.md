# Histología I — revisão editorial (2026-10) · fonte → decisão → destino

Arquivo: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/histologia-i.html` (slug de grifos `histologia-i`).

**Revisão editorial** com as fontes acessíveis. Histología I já tinha passado por rodadas anteriores (conferência com os slides de H&E, hematócrito, matriz e leucócitos; voz G0; nota de fontes em leucócitos); esta rodada limpa o que restava e confere as figuras.

## 1. Fontes acessíveis (Drive, pasta «Histologia 1 teorica»)

| Fonte | Cobre |
|---|---|
| `Apostila Histologia COMPLETA Emojis Partes1a6_compressed.pdf` (roteiro de aula da cátedra, ~62 mil caracteres) | Tecidos epitelial, conjuntivo e adiposo, cartilaginoso, ósseo, sangue; valores normais «material da cátedra» (hematócrito M 35–40 %, H 40–45 %; leucócitos: neutrófilo 40–60 %, eosinófilo 0–8 %, basófilo 0–1 %, linfócito ≈20–30 %, monócito ≈3–8 %; cartilagem 60–80 % água; matriz óssea ≈ 35 % orgânica / 65 % inorgânica; plasma ≈55 % / elementos figurados ≈45 %) |
| `Histologia P2_compressed.pdf` | Anotações manuscritas de aula, em grande parte ilegíveis na extração |
| Ross & Pawlina 6.ª ed. (55 MB) | Citado na apostila; a leitura não devolve texto; **não consultado** |

## 2. Achados → decisões → destino

| # | Achado | Decisão | Destino |
|---|---|---|---|
| 1 | Voz de prova no texto de ensino: «la pregunta clásica», «trampa clásica», «distractor clásico», «pregunta trampa que se repite todos los años», «es un distractor muy usado» (≈30 ocorrências, bloco e banco) | Reescritas como linguagem de estudo («una duda central», «error frecuente», «error clásico», «confusión más frecuente», «confusiones frecuentes»). Resposta, letra e conteúdo iguais | blocos 01, 02, 04, 06, 08, 09, 10, 11, 12 e as cópias do banco geral |
| 2 | Nota de fontes dos leucócitos citava só «el resumen de la cátedra» com valores que diferem da apostila (neutrófilo 50–70 vs 40–60 %, eosinófilo 1–3 vs 0–8 %, linfócito 25–40 vs 20–30 %, monócito 2–8 vs 3–8 %) | Acrescentada a faixa da apostila à nota, sem mudar os números do texto nem as perguntas (a nota já diz que os rangos variam por fonte e que o que não muda é a ordem) | bloco 09 (nota de fontes; só no bloco, não no banco) |
| 3 | Cobertura: 73 perguntas avaliáveis nos blocos 01–09, mais os blocos 10–12; as respostas têm o assunto ensinado antes no bloco. Duas respostas de baixa coincidência lexical conferidas à mão (PAS e glicosaminoglicanos): ambas ensinadas | Sem mudança | — |
| 4 | Figuras (36, todas vistas uma a uma): tudo em castelhano, nenhuma com «EN EXAMEN» | **3 retoques tipográficos** (nenhuma removida): `b01-01_tecnica_histologica-rev`: caixa «OJO» com texto solto («obtención ≠ primer paso…») → «La obtención no es el primer paso del procesamiento: este empieza con la fijación»; `b06-03_crecimiento_nutricion_reparacion`: «(em articular)» → «(en articular)»; `b11-02_sarcomero_contraccion`: «ac▢rtan» (letra faltando) → «acortan» | assets/img/histo1 |
| 5 | Figura de leucócitos (`b09-01`) mostra faixas aproximadas (neutrófilo 40–70 %, eosinófilo 1–4 %, linfócito 20–45 %, monócito 2–10 %) e a figura de osso mostra colágeno ≈30–40 % / hidroxiapatita ≈60–70 %: coincidem com a nota «rangos de referencia» e não com um valor único | Mantidas (ver §6) | — |

## 3. Contagens antes → depois (conferidas por mim)

| Item | Antes | Depois |
|---|---|---|
| Perguntas | 300 | 300 |
| Alternativas | 1136 | 1136 |
| Letras de gabarito | idênticas | idênticas |
| «Ver respuesta» | 284 | 284 |
| Imagens referenciadas | 36 | 36 |
| IDs | 18 | 18 |
| Tarjetas | 396 | 396 |
| Banco espelhado | igual | igual |

## 4. Grifos

Consulta somente leitura ao Supabase: **0 grifos** para `histologia-i` (há 42 para `histologia-ii`, outra matéria). Nenhuma escrita.

## 5. Navegador (390 e 1280 px)

36/36 imagens carregam, sem rolagem horizontal, «Ver respuesta» abre em 4/4 blocos testados (01, 05, 08, 11), 396 cartões, sem erro de JS.

## 6. Observações / pendências

1. Ross & Pawlina não lido (leitura vazia): os números continuam atribuídos à cátedra/«rangos de referencia».
2. Faixas das figuras de leucócitos e osso diferem um pouco da apostila: já explicado na nota de fontes do bloco 09; não alterei pixels de dados.
3. Os rótulos «Basada en preguntas de examen» / «De examen» são a etiqueta oficial da lei 8-A.4; mantidos.
4. Anotações manuscritas (`Histologia P2`) ilegíveis: não usadas como fonte.
