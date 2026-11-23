# Fisiopatología II · conferência com os slides atuais da cátedra · 23/11/2026

Base: `origin/main` `570b40de` · branch `claude/fisio2-slides-atualizados-2026-11` · arquivo único alterado: `netlify/functions/materias-privadas/fisiopatologia-ii.html` (+ ferramentas de teste em `tools/qa/fisio2-rodada-2026-11-23/` e este registro).

## 1 · Fontes
Pasta do Drive «Site Repasso Med → Biblioteca → 6.º semestre → Fisiopatologia II → Slides atualizados» (id `1R3DRkuH6cR0Hvu5KzlXQgh9DeSik7By4`), consultada em 23/11/2026 por metadados: **nenhum arquivo foi modificado depois de 10/11/2026** (os 14 arquivos de 17/08 a 04/11 e os «extratos» da Consciência de 10/11). Os extratos de 10/11 já foram usados na #647. Logo, não há slide novo a incorporar: o trabalho é conferir a página contra os slides e corrigir o que ainda diverge.
Literatura: só a citada nos slides e já usada nas PRs #643/#647; nenhuma fonte externa nova.

## 2 · O que foi conferido e como (honesto sobre o alcance)
- **Matriz de cobertura por termos (455 termos-chave, 13 decks)** da #647: reexecutada hoje (`tools/qa/fisio2-647`): a cobertura passa; as 4 falhas desse teste são só contagens congeladas em 06/11 (ver §6).
- **Releitura manual hoje** dos decks 08 (glomerular), 09 (ácido-base), 10 (diabetes), 11 e 12 (endócrino), os que o pedido destaca: ordem dos blocos/subtítulos e temas batem com a página; nada de conteúdo dos slides ficou sem lugar.
- **Não relidos hoje, por amostra**: decks 01–07 e 13 (confio na matriz #647 de 06/11 e nos 31–44 termos por deck, que continuam passando). **Pendência declarada**: uma releitura integral desses 8 decks não foi refeita nesta rodada.

## 3 · Registro por arquivo (já coberto / acrescentado / melhorado / pendente · destino no site)
| Arquivo (deck) | Já coberto (#643/#647) | Acrescentado nesta PR | Melhorado nesta PR | Pendente | Destino |
|---|---|---|---|---|---|
| 01 Esofágicas · 02 Gástricas · 03 EII · 04 Pancreatitis · 05 Hepatitis · ICTERICIA · 07 Vías urinarias | sim (matriz #647) | — | — | releitura integral (§2) | fp2b01–04, 12–14 (sem mudança; 15 grifos em fp2b01, 1 em fp2b12) |
| 08 Trastornos de la función glomerular | sim (37/37) | **Mapa de las glomerulopatías** (tabela nefrótico × nefrítico, 8 doenças com a «pista» de cada) no início do bloco 08; **b05q17** (MCQ) e **b05q18** (V/F) | b06q13 e b06q22: negrito removido do enunciado | reordenar fisicamente os blocos 08/09 (ver §5) | fp2b05, fp2b06, banco |
| 09 Ácido-base | sim (31/31) | — | — | — | fp2b15 |
| 10 Diabetes | sim (44/44) | — | b16q09: alternativas reequilibradas | «acantosis nigricans» consta em fp2b16 (fator de risco); falta no quadro do Cushing (fp2b17) — ver §7 | fp2b16 |
| 11 Endócrino 1 | sim (40/40) | — | b17q06, b17q10, b17q15: alternativas reequilibradas; «el slide» → «el material de la cátedra» em b17q15 | «acantosis nigricans» no Cushing (deck 11), pendente: reler o slide | fp2b17 |
| 12 Endócrino 2 | sim | — | b18q04 e b18q08: alternativas reequilibradas | possíveis termos menores (desyodasas, motilidade intestinal, «hipotiroidismo adquirido») **não** acrescentados: exigem reler o slide; pendente | fp2b18 |
| 13 Autonomo/consciência (+ extratos 10/11) | sim (31/31) | — | b19q04 (enunciado «¿Cómo se define la conciencia?» e alternativas) e b19q11 (alternativas; «el slide aclara» → «en este cuadro») | — | fp2b19 |

## 4 · Perguntas (8-A) — o que foi feito
- **Novas (2, em bloco + banco = 4 cópias)**: b05q17 (qual doença NÃO é nefrótica; correta = postinfecciosa) e b05q18 (V/F, gabarito FALSO: cambios mínimos não têm depósitos na IF). Rótulo «Pregunta complementaria». Ensinadas antes pelo mapa e pelo texto existente do bloco 08/09. Diferem de b05q07/b05q13/b06q03/b06q05: não pedem diagnóstico por caso nem a lesão isolada, e sim a classificação e o contraste. Posição: fim do bloco 08. Contagens declaradas: bloco 08 16→18; banco 403→405 (MCQ 351→352; V/F 48→49).
- **Pistas nas alternativas (8-A.6-C)**: 8 itens tinham a correta como única mais longa (razão 1,85–2,48× a média das erradas). Distratores reescritos, **sem mudar a letra do gabarito nem a ciência**: razões agora 0,74–1,46 (teste §5 do harness).
- **Pista visual (8-A.6-D)**: removido o negrito dos enunciados de b06q13 e b06q22 (blocos sem grifos). Outros enunciados com negrito existem em blocos com grifos reais e **ficaram intactos** (ver §5).
- **Duplicatas**: nenhuma questão descartada; as 2 novas foram comparadas com b05q07/q13, b06q01–q06.
- **V/F**: os 49 V/F (98 cópias) testados com a função real `checkTF` nos dois botões: 98/98 certos, nos dois cliques.
- **Bloco = banco**: 405 perguntas, 0 divergências (as variações de b05q17/18 incluídas).

## 5 · Grifos, notas, traços e propostas seguras
- Supabase só leitura (SELECT, sem dados de aluno): **16 grifos** na Fisio II (fp2b01 ×15, fp2b12 ×1), sem traços de tinta e sem notas. Prova com o motor real (`RMTools.resolverAncora`): **16/16 ancoram antes e depois, 0 perdidos, 0 movidos**. fp2b01 e fp2b12 byte a byte idênticos à main.
- Nenhuma frase com grifo foi tocada. IDs, âncoras, flashcards (1899), imagens e SVG idênticos.
- **Risco/proposta**: (a) o mapa foi **inserido** antes da seção 1 do bloco 08 sem renumerar nada; (b) reordenar fisicamente fp2b05/fp2b06 (para a ordem do slide 08 ser nefrítico antes de nefrótico, se José quiser) muda ordem do banco e referências «bloco 08/09»: proposta = só fazer em PR própria, com teste de âncoras; (c) negrito nos enunciados de blocos com grifos: remover só depois de prova de âncoras por bloco.

## 6 · Testes (todos somente leitura)
| Teste | Resultado |
|---|---|
| `tools/qa/fisio2-rodada-2026-11-23/fisio2-rodada.test.cjs` (novo) | **30/30** |
| `grifos-motor.cjs` (novo, generalizado) | **16/16, 0 perdidos, 0 movidos** |
| `tools/qa/fisio2-647` | 57→58/61: as 3 falhas restantes são pinos de contagem de 06/11 (806 perguntas; 93 tabelas; lista de blocos que mudaram) — antes desta PR passava; **por desenho**, mudam quando a matéria muda; não editei o teste antigo |
| `tools/qa/fisio2-642` | 25/27: «perguntas da main idênticas» (mudei 1 enunciado: b19q04) e «SVG 77→77» (pino antigo); não afetam conteúdo |
| porta da matéria / não-ativação | ver Cartão de Merge |

## 7 · Limitações e pendências reais
1. Releitura integral dos decks 01–07 e 13 não refeita (§2).
2. Termos menores de 12 (desyodasas, motilidade intestinal, «hipotiroidismo adquirido») e 11 («acantosis nigricans») dependem de reler o slide: **não** acrescentados.
3. Expressões «el slide» ainda aparecem em dezenas de pontos do texto de ensino e das perguntas (só corrigi nas 3 perguntas editadas); ficam para uma revisão de redação própria.
4. Reordenação 08/09 (§5-b).
5. Revisão humana: conferir se o mapa (tabela) está claro na tela do aluno.
