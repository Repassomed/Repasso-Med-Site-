# Fisiopatología II · conferência com os slides atuais da cátedra · 23/11/2026

Base: `origin/main` `570b40de` · branch `claude/fisio2-slides-atualizados-2026-11` · arquivo único alterado: `netlify/functions/materias-privadas/fisiopatologia-ii.html` (+ ferramentas de teste em `tools/qa/fisio2-rodada-2026-11-23/` e este registro).

## 1 · Fontes
Pasta do Drive «Site Repasso Med → Biblioteca → 6.º semestre → Fisiopatologia II → Slides atualizados» (id `1R3DRkuH6cR0Hvu5KzlXQgh9DeSik7By4`), consultada em 23/11/2026 por metadados: **nenhum arquivo foi modificado depois de 10/11/2026** (os 14 arquivos de 17/08 a 04/11 e os «extratos» da Consciência de 10/11). Os extratos de 10/11 já foram usados na #647. Logo, não há slide novo a incorporar: o trabalho é conferir a página contra os slides e corrigir o que ainda diverge.
Literatura: só a citada nos slides e já usada nas PRs #643/#647; nenhuma fonte externa nova.

## 2 · O que foi conferido e como
- **Todos os 13 decks relidos hoje (texto do Drive) e conferidos contra os blocos**, termo a termo (valores, classificações, critérios, nomes): 01 Esofágicas 36/36 · 02 Gástricas 54/54 (ERGE está em fp2b01, que cobre os dois decks) · 04 Pancreatitis 57/57 · 05 Hepatitis/Cirrosis 58/58 · ICTERICIA 46/46 · 07 Vías urinarias 48/48 · 13 Autônomo/consciência 54/54 (as ausências iniciais eram só grafia: «CO₂», «cuello se ensancha») · 08 a 12 já conferidos na 1.ª rodada. Nenhum conteúdo de slide ficou sem lugar na página.
- **Ordem e subtítulos**: a ordem interna de cada bloco segue a do deck (matriz #647, mantida). **Única divergência de ordem entre blocos**: no deck 08 a professora explica primeiro o nefrítico e depois o nefrótico; a página tem o nefrótico (bloco 08) antes do nefrítico (bloco 09). Ver §5.
- **Matriz #647 (455 termos)** reexecutada: cobertura passa; as falhas desse teste são só contagens congeladas em 06/11 (ver §6).
- Deck 03 (EII, «Enfermedad intestinal inflamatorio.pdf») não foi relido hoje: a matriz #647 o cobre (37/37); sem mudança de conteúdo.

## 3 · Registro por arquivo (já coberto / acrescentado / melhorado / pendente · destino no site)
| Arquivo (deck) | Já coberto (#643/#647) | Acrescentado nesta PR | Melhorado nesta PR | Pendente | Destino |
|---|---|---|---|---|---|
| 01 Esofágicas · 02 Gástricas · 03 EII · 04 Pancreatitis · 05 Hepatitis · ICTERICIA · 07 Vías urinarias | sim; relidos hoje (01, 02, 04, 05, ICTERICIA, 07): 0 ausências | — | — | 03 EII: só matriz #647 | fp2b01–04, 12–14 (sem mudança; 15 grifos em fp2b01, 1 em fp2b12) |
| 08 Trastornos de la función glomerular | sim (37/37) | **Mapa de las glomerulopatías** (tabela por padrão predominante: 4 nefróticas incl. nefropatia diabética como causa secundária, 3 nefríticas, membranoproliferativa em «presentación variable»; coluna «El matiz») no início do bloco 08; **b05q17** (MCQ) e **b05q18** (V/F) | b06q13 e b06q22: negrito removido do enunciado; frases absolutas «no se inflama / sin inflamación» suavizadas no resumo do bloco 08 (legenda, nota ao margem) | reordenar 08/09 (§5); flashcard «Nefrótico: … sin inflamación» (3 cópias) não alterado, ver §7 | | fp2b05, fp2b06, banco |
| 09 Ácido-base | sim (31/31) | — | — | — | fp2b15 |
| 10 Diabetes | sim (44/44) | — | b16q09: alternativas reequilibradas | «acantosis nigricans» consta em fp2b16 (fator de risco); falta no quadro do Cushing (fp2b17) — ver §7 | fp2b16 |
| 11 Endócrino 1 | sim (40/40) | — | b17q06, b17q10, b17q15: alternativas reequilibradas; «el slide» → «el material de la cátedra» em b17q15 | «acantosis nigricans» no Cushing (deck 11), pendente: reler o slide | fp2b17 |
| 12 Endócrino 2 | sim | — | b18q04 e b18q08: alternativas reequilibradas | possíveis termos menores (desyodasas, motilidade intestinal, «hipotiroidismo adquirido») **não** acrescentados: exigem reler o slide; pendente | fp2b18 |
| 13 Autonomo/consciência (+ extratos 10/11) | sim (31/31) | — | b19q04 (enunciado «¿Cómo se define la conciencia?» e alternativas) e b19q11 (alternativas; «el slide aclara» → «en este cuadro») | — (relido hoje: 54/54) | fp2b19 |

## 4 · Perguntas (8-A) — o que foi feito
- **Novas (2, em bloco + banco = 4 cópias)**: b05q17 (qual doença NÃO é nefrótica; correta = postinfecciosa) e b05q18 (V/F, gabarito FALSO: cambios mínimos não têm depósitos na IF). Rótulo «Pregunta complementaria». Ensinadas antes pelo mapa e pelo texto existente do bloco 08/09. Diferem de b05q07/b05q13/b06q03/b06q05: não pedem diagnóstico por caso nem a lesão isolada, e sim a classificação e o contraste. Posição: fim do bloco 08. Contagens declaradas: bloco 08 16→18; banco 403→405 (MCQ 351→352; V/F 48→49).
- **Pistas nas alternativas (8-A.6-C)**: 8 itens tinham a correta como única mais longa (razão 1,85–2,48× a média das erradas). Distratores reescritos, **sem mudar a letra do gabarito nem a ciência**: razões agora 0,74–1,46 (teste §5 do harness).
- **Pista visual (8-A.6-D)**: removido o negrito dos enunciados de b06q13 e b06q22 (blocos sem grifos). Outros enunciados com negrito existem em blocos com grifos reais e **ficaram intactos** (ver §5).
- **Duplicatas**: nenhuma questão descartada; as 2 novas foram comparadas com b05q07/q13, b06q01–q06.
- **V/F**: os 49 V/F (98 cópias) testados com a função real `checkTF` nos dois botões: 98/98 certos, nos dois cliques.
- **Bloco = banco**: 405 perguntas, 0 divergências (as variações de b05q17/18 incluídas).

## 5 · Grifos, notas, traços; ordem dos blocos 08/09
- Supabase só leitura, consultado de novo em 23/11/2026 (contagens e texto da própria matéria, nenhum dado de aluno): **16 grifos** (fp2b01 ×15, fp2b12 ×1); **0 traços, 0 notas** com `fp2b` (tabelas `user_ink_strokes` e `user_notes`). Motor real (`RMTools.resolverAncora`): **16/16 ancoram antes e depois, 0 perdidos, 0 movidos**. fp2b01 e fp2b12 byte a byte idênticos à main. Nenhuma frase com grifo foi tocada; IDs, flashcards (1899), imagens e SVG idênticos.
- **Ordem da professora (nefrítico → nefrótico) — NÃO reordenado nesta PR; bloqueio concreto**:
  1. `assets/rm-materia-sistema.js` (arquivo global, área crítica) fixa `FP2_NUM = {…, fp2b05: 8, fp2b06: 9, …}`: o número do bloco mostrado/usado pela Nova Era. Trocar a ordem exige trocar esses números e o teste `tools/qa/nova-era/temas-fisio2.test.cjs`; isso muda um arquivo compartilhado por todas as matérias.
  2. Textos com «bloque 08/09» (≈14 pontos: marcadores `BLOQUE 08/09`, títulos «Flashcards del bloque 08/09», subtítulos do banco «Bloque 08/09 …», referências cruzadas em b05q16, b05q17, fp2b09 e fp2b18) e a ordem do banco geral precisam mudar juntos; qualquer esquecimento deixa «bloque 09» antes de «bloque 08».
  3. O inventário do ensaio de layout e o teste congelado `fisio2-647` (ordem de ids) são regenerados.
  Ids, âncoras, grifos e traços **não** dependem da posição (ancoram por id da seção e por texto), então a troca é segura para as marcas.
- **Proposta (PR própria, sem mudança de ciência)**: (a) trocar de lugar `fp2b05` e `fp2b06` e os dois grupos do banco; (b) renumerar 08↔09 em marcadores, títulos, referências e `FP2_NUM`; (c) regenerar inventário; (d) provar com `ancoras-estaveis`, `ida-e-volta`, motor de grifos (16/16), `temas-fisio2`, `porta-da-materia` e o teste de espelho bloco×banco. **Solução provisória já entregue**: a frase final do mapa orienta a ler o bloco 09 antes do 08, sem perder nada.

## 6 · Testes (todos somente leitura)
| Teste | Resultado |
|---|---|
| `tools/qa/fisio2-rodada-2026-11-23/fisio2-rodada.test.cjs` (novo) | **38/38** (inclui a posição de cada doença no mapa, a lista exata das perguntas antigas alteradas e a prova de que o teste falha se o mapa ou b05q17 voltam à frase absoluta — verificado com mutação) |
| `grifos-motor.cjs` (novo, generalizado) | **16/16, 0 perdidos, 0 movidos** |
| `tools/qa/fisio2-647` | 57→58/61: as 3 falhas restantes são pinos de contagem de 06/11 (806 perguntas; 93 tabelas; lista de blocos que mudaram) — antes desta PR passava; **por desenho**, mudam quando a matéria muda; não editei o teste antigo |
| `tools/qa/fisio2-642` | 25/27: «perguntas da main idênticas» (mudei 1 enunciado: b19q04) e «SVG 77→77» (pino antigo); não afetam conteúdo |
| porta da matéria / não-ativação | ver Cartão de Merge |

## 7 · Limitações e pendências reais
1. Deck 03 (EII): só a matriz #647 (§2).
2. Termos menores do deck 12 (desyodasas, motilidade intestinal, «hipotiroidismo adquirido») e «acantosis nigricans» no Cushing (deck 11): **não** acrescentados; os dados do slide são esparsos e mereceriam conferência com a tela do slide. Flashcard «Nefrótico: se escapa proteína, sin inflamación» (3 cópias): mantido por preservação de flashcards; proposta: «con poca inflamación».
3. Expressões «el slide» ainda aparecem em dezenas de pontos do texto de ensino e das perguntas (só corrigi nas 3 perguntas editadas); ficam para uma revisão de redação própria.
4. Reordenação 08/09 (§5).
5. «Presentación variable»: as fontes do repositório dão o reparto 50/25/25 (nefrótico/nefrítico/assintomática); a palavra «mista» não foi escrita como categoria porque não há fonte local que a sustente — conferir em Porth/Robbins se José quiser.
5. Revisão humana: conferir se o mapa (tabela) está claro na tela do aluno.
