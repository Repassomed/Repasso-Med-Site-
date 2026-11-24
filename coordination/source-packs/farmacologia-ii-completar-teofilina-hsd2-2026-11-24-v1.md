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
