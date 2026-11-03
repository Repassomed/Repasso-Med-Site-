# Nova Era · Anatomía I e Anatomía Patológica I · preparo (sem ativar)

**Data:** 03/11/2026 · **Base:** `main` `d177474` · **Agente:** Claude 2 · **Branch:** `claude/project-thread-vmqz6n` · **PR:** #634 (rascunho até a #632 entrar na main)

## 0 · Resumo
| | Estado |
|---|---|
| Nesta PR agora | 45 vinhetas, 3 testes novos, proveniência, roteiro (SQL não executado), registro da caneta |
| Depois da #632 | 5 arquivos globais (TEMAS, CSS, 1 linha da navegação, CANDIDATAS + VER, tag do index) e 2 testes do pré-voo; patch pronto e testado |
| Ativação | nenhuma; sem linha em `rm_materia_rollout` tudo fica como hoje |

## 1 · Estrutura (classificação real)
- **Anatomía I** (`anatomia-i`): 33 blocos `a1b01`–`a1b33` num grupo só (sem unidades no conteúdo; o rótulo «UNIDAD» fica oculto como em Farmacología I), cor de capítulo por região; `bancoa1` = banco (B), `bancofca1` = cartões (F), `a1notas` = notas (N). `a1b00` (abertura) fica fora da lista de blocos.
- **AP I** (`anatomia-patologica`): guia «Ideas clave» (`analise-guia`, 00); Unidad I (8: 01–06, 06A Calcificación, 06B Aterosclerosis), Unidad II (3: 07, 08, 08A Reparación), Unidad IV (09 Neoplasias); banco (B), flashcards (F). 06A/06B/08A: seções sem número no conteúdo; nomes de unidade propostos — **decisão de José**.

## 2 · Dados dos alunos
SELECT desta sessão **bloqueado**. Retrato de 24/10: Anatomía I 6 grifos (2 contas), AP I 60 grifos (7 contas), 0 traços, 0 notas. Nenhum texto de conteúdo mudou; grifos ancoram por trecho e os testes confirmam que os existentes (A1 blocos 05/09; AP I Introducción/Adaptación) continuam no lugar. O roteiro pede o SELECT a José antes da prévia.

## 3 · Correções feitas durante o preparo
- Modo Preguntas de Anatomía I mostrava 0 itens (perguntas dentro de `details.a1-qbox` fechado): a navegação passa a usar a caixa.
- Texto vazando em 320 px (`.a1-freq`, Anatomía I) e 390 px (`.compare`, AP I): quebra de linha só no tema da matéria.

## 4 · Testes (sobre main + #632 simulada + pacote)
integracao-anato1-ap1 241/241 · temas-anato1-ap1 112/112 · real-anato1-ap1 221/221 · visual-conteudo anatomia-i 76/76, anatomia-patologica 32/32 · porta 7/7 nas duas · nao-ativacao 22/22 · servidor 59/59 · navegador 247/247 · real-fisio1-farmaco1 (rápido) 158/158 · caneta: só as falhas antigas da main (`docs/nova-era/CANETA-FALHAS-ANTIGAS-2026-11.md`).

## 5 · Achado editorial (não alterado)
`a1notas` diz que as figuras são «SVG originales»; hoje são webp. Corrigir é decisão de conteúdo.
