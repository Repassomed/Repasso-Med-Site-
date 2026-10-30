# Prontidão de layout/caneta · lote 2 · Semiología I, Biología, Anatomía I, AP I

**Data:** 30/10/2026 · **Base:** `main` `0a04d0e0`/`60730c32` · **Agente:** Claude 1 · **Escopo:** só relatório; nenhuma matéria, flag, motor, painel ou `tasks.json` alterado. Nada foi ativado.

## Classificação

| Matéria | Resultado | Motivo | Próxima ação |
|---|---|---|---|
| **Biología** (`biologia`) | **Pronta com limite** | Porta 7/7; sem erro que bloqueie. Limite: sem linha de grifos no snapshot de 24/10 e Supabase desconectado hoje (dados não reconsultados) | Reconsultar grifos/notas/traços na implantação; roteiro físico |
| **Semiología I** (`semiologia`) | **Pronta com limite** | Porta 7/7. Snapshot 24/10: 1 grifo, 1 usuário; consulta de hoje não realizada | Idem |
| **Anatomía I** (`anatomia-i`) | **Pronta com limite** | Porta 7/7. Snapshot: 6 grifos, 2 usuários; consulta de hoje não realizada. A matéria é a maior (918 perguntas, 1.646 cartões, 121 imagens): conferir desempenho no aparelho | Idem + medir fluidez no iPad (R5) |
| **AP I** (`anatomia-patologica`) | **Pronta com limite** | Porta 7/7. É a de **maior exposição** do lote: snapshot de 60 grifos de 7 usuários. Dois pontos editoriais sem bloqueio: corrida de 6 respostas «c» seguidas no banco `banco-oficiales-anato`; títulos «La gran trampa» / «La trampa:» / «¡Trampa!» em 4 trechos (uso didático, não voz de prova) | Implantar por último do lote; reordenar alternativas (§8-A.7) e trocar «trampa» por «error frecuente» só se José quiser, **em PR com consulta de grifos antes** (há grifos) |

Nenhuma matéria está bloqueada: nenhum PR de correção.

## Testes executados

`NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/porta-da-materia.sh <slug>` (7 passos: inventário, marcadores `data-rm-agrega`, âncoras, ida e volta, layout 390/768/1024/1440, uso com caneta, inventário de risco): **PORTA ABERTA** nas quatro.

| Verificação | Biología | Semiología I | Anatomía I | AP I |
|---|---|---|---|---|
| Início direto no conteúdo | `bio01` «Introducción a la Biología celular», «Desde cero» (há 1 placeholder oculto anterior, ignorado pelo layout) | `introduccion-semio`, «Resumen explicado (desde cero)» | `a1b01` «Generalidades de la Anatomía», «Desde cero» (1 placeholder oculto ignorado) | `introduccion`, «Resumen explicado (desde cero)» |
| Seções | — | — | 37 | 15 |
| Perguntas / cartões | 320 / 410 | 220 / 192 | 918 / 1.646 | 718 / 297 |
| Letras do gabarito (MCQ) a/b/c/d | 60/64/60/58 | 40/39/41/41 | 222/198/190/222 | 81/85/85/81 |
| Maior corrida da mesma letra | 2 | 3 | 5 | **6** (`banco-oficiales-anato`) |
| Imagens: referenciadas / faltando / sem `alt` | 39 / 0 / 0 | 80 / 0 / 0 | 121 / 0 / 0 | 31 / 0 / 0 |
| IDs duplicados | 0 | 0 | 0* | 0 |
| Voz de prova (varredura) | 0 | 0 | 0 | 0 (4 «trampa» didáticas) |
| `data-rm-agrega` | não necessário | não necessário | não necessário | não necessário |

\* O analisador de HTML aponta 1 ID duplicado e 2 tags desbalanceadas em Anatomía I; é um **falso positivo**: a marcação de exemplo (`<div id="tab-anato1">`, `<section id="a1bXX">`) está dentro do comentário de cabeçalho do arquivo. Sem comentários: 0 duplicados e 0 desbalanceadas.

## Dados de alunos (somente leitura)

- **Consulta de hoje: não realizada** (Supabase desconectado nesta sessão). Nada foi gravado e nenhum texto de matéria foi alterado.
- **Snapshot** (`docs/pre-voo-caneta-layout/dados-vivos.json`, SELECT de 24/10/2026): AP I 60 grifos/7 usuários; Anatomía I 6/2; Semiología I 1/1; Biología sem linha. Notas e traços: nenhuma linha para estas quatro.

## Risco real e ordem recomendada

- **Risco:** baixo em conteúdo e layout; residual no aparelho (Safari/iPadOS e Apple Pencil não provados) e na reconsulta dos dados de alunos.
- **Ordem entre as quatro:** (1) Biología (sem grifos conhecidos), (2) Semiología I (1 usuário), (3) Anatomía I (2 usuários; matéria grande), (4) AP I (7 usuários).
