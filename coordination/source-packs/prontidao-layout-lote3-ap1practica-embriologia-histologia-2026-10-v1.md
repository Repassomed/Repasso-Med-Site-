# Prontidão de layout/caneta · lote 3 · AP I Práctica, Embriología, Histología I, Histología I Práctica

**Data:** 30/10/2026 · **Base:** `main` `0a04d0e0`/`60730c32` · **Agente:** Claude 1 · **Escopo:** só relatório; nenhuma matéria, flag, motor, painel ou `tasks.json` alterado. Nada foi ativado.

## Classificação

| Matéria | Resultado | Motivo | Próxima ação |
|---|---|---|---|
| **AP I Práctica** (`anatomia-patologica-practica`) | **Pronta com limite** | Porta 7/7, 12 seções, 96 perguntas, 341 cartões, 181 imagens (0 faltando). Só falta reconsultar dados de alunos (snapshot: 0 grifos em 28/10) e o roteiro físico. Matéria de muitas imagens: medir o reflow no aparelho (R5) | Reconsultar dados + roteiro físico, com atenção ao peso das imagens |
| **Embriología** (`embriologia`) | **Pronta com limite** | Porta 7/7; 214 perguntas, 298 cartões. Sem grifos (consulta de 28/10); consulta de hoje não realizada | Reconsultar dados + roteiro físico |
| **Histología I** (`histologia-i`) | **Pronta com limite** | Porta 7/7; 300 perguntas, 396 cartões. Sem grifos (28/10); consulta de hoje não realizada | Idem |
| **Histología I Práctica** (`histologia-i-practica`) | **Pronta com limite** | Porta 7/7; 212 perguntas, 286 cartões, 159 imagens (0 faltando). **4 grifos de 1 usuário** (28/10), dos quais **3 já estavam desencontrados antes das #570/#571** (pendência anterior, sem apagar nem migrar). Um ponto editorial: o enunciado «Marcá la respuesta MÁS completa» aparece em 4 perguntas (instrução de resposta, não bloqueia) | Implantar depois dos três sem dados; tratar os 3 grifos desencontrados e a frase dos enunciados só em PR própria, com consulta de grifos antes |

Nenhuma matéria está bloqueada: nenhum PR de correção.

## Testes executados

`NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/porta-da-materia.sh <slug>` (7 passos): **PORTA ABERTA** nas quatro.

| Verificação | AP I Práctica | Embriología | Histología I | Histología I Práctica |
|---|---|---|---|---|
| Início direto no conteúdo | `b1` «Introducción» | `emb01` «Introducción a la Embriología» (1 placeholder oculto anterior, ignorado pelo layout) | `histo01` «Introducción a la Histología» (1 placeholder oculto ignorado) | `hp01` «Epitelios de revestimiento» (1 placeholder oculto ignorado) |
| Seções | 12 | 16 | 16 | 17 |
| Perguntas / cartões | 96 / 341 | 214 / 298 | 300 / 396 | 212 / 286 |
| Letras do gabarito a/b/c/d | 21/23/29/19 (92 MCQ) | 44/54/48/44 | 76/72/70/66 | 54/54/52/52 |
| Maior corrida da mesma letra | 3 | 3 | 3 | 1 |
| Imagens referenciadas / faltando / sem `alt` | 181 / 0 / 0 | 39 / 0 / 0 | 36 / 0 / 0 | 159 / 0 / 0 |
| IDs duplicados | 0 | 0 | 0 | 0 |
| Voz de prova | 0 | 0 | 0 | 0 (4 instruções «MÁS completa») |
| `data-rm-agrega` | já declarado (`b11`, `b12`) | já declarado (`emb14`, `emb15`) | já declarado (`histo13`, `histo14`) | não necessário |
| Guard (arquivo inteiro: assets, gabaritos, HTML) | ok | ok | ok | ok |

As imagens de Histología I Práctica e AP I Práctica incluem as versões `-sr`/`-g0` das #570/#571, já na `main`; os originais seguem nas galerias.

## Dados de alunos (somente leitura)

- **Consulta de hoje: não realizada** (Supabase desconectado nesta sessão). Nada gravado e nenhum texto de matéria alterado.
- **Últimas consultas reais** (28/10/2026, SELECT somente leitura): `histologia-i-practica` 4 grifos de 1 usuário (blocos `hp04` e `hp06`; 3 já desencontrados antes das #570/#571); `anatomia-patologica-practica`, `embriologia` e `histologia-i`: 0 grifos; notas e traços: 0 nas quatro. O snapshot de 24/10 do repositório também não tem linha para elas.

## Risco real e ordem recomendada

- **Risco:** baixo; o único dado de aluno é o de Histología I Práctica. Residual: roteiro físico no iPad e peso das imagens nas duas práticas.
- **Ordem:** (1) Embriología, (2) Histología I, (3) AP I Práctica (muitas imagens), (4) Histología I Práctica (único com grifos).
