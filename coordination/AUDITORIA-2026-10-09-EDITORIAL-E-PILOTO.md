# Auditoria inicial — 2026-10-09

Base verificada: `main` `c304c8e3116f8bdfbfb6993993fbf6f540a42e26`.
Este documento registra uma auditoria inicial e a proposta de alocação para José encaminhar. Não certifica as 27 matérias, não realiza merge e não autoriza publicação ou rollout.

## Decisões de prioridade

1. Fechar caneta no piloto com build identificável e teste físico de José.
2. Em paralelo, revisar qualidade editorial e questões, começando por Anatomopatologia II e Farmacologia II, incluindo as anotações do Drive.
3. Prosseguir por lotes nas demais matérias com critérios G0 §13 e questões 8-A.6-A/B/C; preservar profundidade e anotações existentes.
4. Manter #464 (post-it do layout antigo) pausada. Manter #471 (Biología VIII/X) explícita na fila, dependente da estabilização de #469 e da nova alocação.
5. Layout global somente após autorização explícita de José. Ensaio técnico anterior não equivale a aprovação das 27 matérias. Audiobooks precisam de comprovação operacional além de código de pipeline mergeado.

## PRs em revisão

| PR | Head examinado | Parecer inicial |
|---|---|---|
| #470 caneta | `a4a9a9c80962c168f9f3c5a0b49aaca8af0307c5` | Draft. Código e sintaxe inspecionados. Falta preview utilizável/build identificável e teste físico. Worker relata 124/124 testes e 2 falhas preexistentes de post-it em outra suíte; não reproduzidas nesta auditoria. Não declarar caneta encerrada. |
| #472 alternativas/Neurología | `a32d0cf86a21f6cbe2b4d2b55a9b9742030e2647` | Correção compartilhada CSS/JS. Validar compatibilidade de grifos/tinta e leitura da alternativa: normalização passa de `A) texto` para `A)texto` no textContent ao remover o espaço literal. Não foi demonstrada perda de dados; pedir preservação do separador e QA direcionado. |
| #468 Farmacología I | `db311577aff8b8d4d7dab9caa80f052cafef0249` | Corrigir generalização que agrupa tópica e conjuntival como absorção local geralmente lenta/limitada; explicitar alvo local versus possível absorção sistêmica e variabilidade. Precisar intradérmica como derme. Trocar título interno sobre o que a cátedra cita por título de conteúdo. |
| #469 Biología IX | `3b61a3f688e56c90a341fcf9d141c77c9db295c2` | Corrigir generalização de importinas/exportinas/Ran a todo RNA (mRNA majoritário usa NXF1/NXT1); harmonizar modelo clássico da fibra de 30 nm entre prosa, questões e flashcards; revisar distratores e comprimento da questão de transporte nuclear; corrigir `22 autosomas` para `22 pares de autosomas` onde descrever cariótipo humano diploide. |

Fontes primárias para conferir os achados científicos: [NXF1:NXT1](https://pmc.ncbi.nlm.nih.gov/articles/PMC4330390/), [absorção sistêmica rápida de timolol ocular](https://pubmed.ncbi.nlm.nih.gov/3880069/). São exemplos que invalidam generalizações; não justificam substituir a literatura-base completa da matéria.

## Triagem quantitativa das alternativas na main

Extração estática dos `.quiz-item` com pelo menos três alternativas de `ul.options` e gabarito identificável em `.answer`. Exclusão de V/F; deduplicação por enunciado e conjunto de alternativas para não contar espelhos do banco. Letras iniciais removidas; espaços de formatação normalizados. Origem abaixo é o rótulo no enunciado, ainda não autenticado contra cada prova.

| Matéria | MCQ analisadas | Correta única mais longa (caracteres) | Correta única mais longa (palavras) | Rotuladas baseadas em exame | Destas, correta única mais longa (caracteres) |
|---|---:|---:|---:|---:|---:|
| Anatomopatologia II | 138 | 105 | 100 | 91 | 67 |
| Farmacologia II | 347 | 215 | 192 | 185 | 91 |

Esses números são sinais de auditoria, não diagnóstico automático de cada questão. Incluem diferenças mínimas de tamanho. Não provaram a qualidade de todas as alternativas nem a fidelidade de origem; exigem revisão semântica por bloco e distinção entre originais preservadas e alternativas geradas.

Exemplos claros para revisar: eritroplasia em Anatomopatologia II (correta com 94 caracteres versus alternativas de 27/37/47); suspensão abrupta de atenolol em Farmacologia II (correta com 72 caracteres versus 32/37/39, incluindo distrator distante sobre contratilidade uterina).

## Anotações e fontes pendentes

- Drive de Farmacologia II: oito PDFs de anotações encontrados (anti-inflamatório/corticoide, antianginoso, calcioantagonista, beta-bloqueador, diuréticos, SRAA, resumo P1 e anti-hipertensivos). Inventário não comprova integração. Exigir fonte/página → conceito → trecho atual → decisão → destino.
- Drive de Anatomopatologia II: seis PDFs encontrados (tumores gástricos, perguntas/questões, resumo P1, patologias do estômago, esôfago e cavidade oral). Há relato anterior de cobertura e #458 já incorporada; ainda falta comprovação independente completa. #455 mantém leitura dos slides 4/5/7/8 pendente/parcial.
- Outros pendentes registrados: dois PDFs não verificáveis de Histología I/II Práctica, conferência completa das 239 imagens de Histología II Práctica e lacunas Biología VIII/X. Não converter amostragem ou cobertura estrutural em leitura completa.
- `coordination/tasks.json` possui estados históricos: reconciliar cada linha com PR/issue atual antes de anunciar fila zerada.

## Alocação proposta

- Claude 1: corrigir/verificar #472, #468 e #469 nas respectivas branches; depois abrir revisão de Anatomopatologia II separada, sem esperar merge se os arquivos não conflitarem.
- Claude 2: Farmacologia II, questões + G0 + oito anotações. #464 permanece pausada; #471 preservada para lote posterior.
- Claude 4: #470, entregar caminho de teste real; enquanto aguarda teste físico, atualizar diagnóstico do ensaio global e pendências operacionais de audiobooks sem ativar rollout.

Cada executor registra checkpoints e continua no próprio escopo; entrega relatório final com PR/head, evidências, limitações, arquivos reservados e parecer explícito de merge/publicação. José encaminha os prompts. Nenhuma atribuição foi enviada automaticamente a terceiros nesta auditoria.

## Limites desta auditoria

Diffs e código lidos, leis comparadas, inventário do Drive consultado e sintaxe dos JS alterados conferida. O navegador local não estava instalado e o download falhou; portanto os testes de navegador relatados nas PRs não foram reexecutados aqui. Não houve teste físico da caneta nem validação integral visual/editorial das 27 matérias.
