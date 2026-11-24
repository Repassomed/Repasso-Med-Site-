# Farmacología II · três questões de «completar» (comparação antes de acrescentar) — 24/11/2026

Fonte do pedido: José (tarefa anterior). O enunciado literal dos três itens **não está no repositório** (só a descrição curta), então são **reconstruções**, nunca transcrições. Fonte de ciência: slide «06 Sistema respiratorio» e «05 Antiinflamatorios esteroideos» já lidos nos packs anteriores (`farmacologia-ii-questoes-637-v1.md`). Nenhuma fonte externa.

| # | Item | Comparação com o site | Decisão / destino |
|---|---|---|---|
| 1 | Efeito adverso comum da teofilina | Existe o caso da aminofilina (BPE; pergunta *qual fármaco*), a pergunta de conduta para efeitos iniciais (complementar) e a de arritmias; **nenhuma** pede o efeito em si | **ACRESCENTADA** (completar, «Basada en preguntas de examen», bloco 08 e banco): náuseas e vómitos (também cefalea e malestar gástrico), PDE4, margem estreita |
| 2 | Enzima cortisol → cortisona no rim | `q-f2-hsd2-renal` (11β-HSD2, mais completa: 11β-HSD1, transcortina, MR, regaliz) | **DUPLICATA SEMÂNTICA → mantida e melhorada:** mesmo id, **rótulo corrigido** de «Pregunta complementaria» para «Basada en preguntas de examen» (bloco e banco), pois José relatou o tema como de prova. Posição não alterada (ela continua entre as complementares) |
| 3 | Mecanismo da diurese das xantinas | pergunta «Basada en preguntas de examen» sobre o efeito diurético da aminofilina (resposta: antagonismo dos receptores de adenosina A₁) + resumo («diuresis por antagonismo A₁») | **DUPLICATA SEMÂNTICA → nada inserido**; já é de exame; id preservado |

Contagens: banco 252 → **253** (basadas em exame 149 → **151**: +1 nova, +1 rótulo; complementares 103 → **102**); cabeçalhos do banco: bloco 06 «13 basadas · 9 complementarias», bloco 08 «19 basadas · 14 complementarias».

## Preservação e marcas (SELECT, sem dados pessoais)
- Arquivo final menos a pergunta nova (2 cópias), menos o rótulo e menos as contagens = **idêntico byte a byte à `main`** (teste `f2-completar` 5/5).
- Marcas: f2b07 60 grifos, f2b08 130, f2b15 9, f2b06 1; 1 traço (`f2b00`); 0 notas. Os grifos de f2b08/f2b15 conferidos (textos e contexto) ficam **antes** do ponto de inserção (ensino e primeira pergunta do banco); a pergunta nova entra depois deles, então nenhuma ocorrência é deslocada. O rótulo trocado não contém texto grifado.
- Limite: não rodei o resolvedor real de grifos (as 140 linhas não foram baixadas inteiras); a conclusão é estrutural.

## Rodada de fechamento (24/11/2026): as três em formato COMPLETAR
José pediu as três em **completar**. As duas que já existiam eram de alternativas; foram **adaptadas para completar sem criar duplicata e sem trocar o id**:
- `q-f2-hsd2-renal` / `bq-f2-hsd2-renal`: «…porque la enzima ____ lo convierte en cortisona» → **11β-HSD2**. A explicação manteve o conteúdo (regaliz, cátedra × literatura, 11β-HSD1, transcortina, MR).
- diurese da aminofilina (sem id no HTML; identificada pelo enunciado, bloco 08 e banco): «…antagonismo de los receptores de ____» → **adenosina A₁**.
- teofilina (nova): «Un efecto adverso común de la teofilina es ____» → náuseas y vómitos.
Os três com o rótulo «Basada en preguntas de examen · completar» (mesma convenção das demais de completar), bloco = banco (teste). A 11β-HSD2 continua na posição em que estava (entre as complementares) para não deslocar as âncoras de traços; o cabeçalho do banco já a conta como «de examen» (bloco 06: 13 · 9). Nenhuma impossibilidade concreta encontrada.
**Também corrigido:** o `inventario.json` (layout-ensaio) da Farmacología II estava velho (504 q → 506 q) e fazia a porta falhar em «páginas por modo» do bloco 08 (a contagem real era 32, a página mostrava 33); regenerado. O teste `farmaco2-rodada` foi adaptado ao novo formato da pergunta da aminofilina (fragmento «acción diurética…» como completar).
