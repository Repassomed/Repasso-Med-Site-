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

## 2 · Dados dos alunos (SELECT somente leitura, 04/11/2026, feito pelo Claude 4 — contagens, sem identificadores)
| Matéria | Grifos | Contas | Traços | Notas |
|---|---|---|---|---|
| `anatomia-i` | 6 | 2 | 0 | 0 |
| `anatomia-patologica` | 60 | 7 | 0 | 0 |
| `fisiopatologia` (#632) | 33 | 1 | 0 | 0 |
| `farmacologia` (#632) | 26 | 2 | 0 | 0 |

`rm_materia_rollout` hoje: só `medicina-familiar` (`preview|preview|preview`); as outras quatro matérias não têm linha ⇒ `off` para todos. **Idêntico ao retrato de 24/10 / 02/11:** nenhum dado novo; 0 traços e 0 notas, então não há risco de índice de âncora (`seção>N`). O que cuidar: **não alterar o texto dos blocos com grifo** (grifos ancoram por trecho e contexto). Os testes confirmam que os grifos existentes (A1 blocos 05/09; AP I Introducción/Adaptación) continuam no mesmo trecho com o tema ligado.

## 3 · Correções feitas durante o preparo
- Modo Preguntas de Anatomía I mostrava 0 itens (perguntas dentro de `details.a1-qbox` fechado): a navegação passa a usar a caixa.
- Texto vazando em 320 px (`.a1-freq`, Anatomía I) e 390 px (`.compare`, AP I): quebra de linha só no tema da matéria.

## 4 · Testes (04/11/2026, sobre a main que já contém #632, #633 e #639 + este branch)
temas-anato1-ap1 112/112 · real-anato1-ap1 221/221 · integracao-anato1-ap1 241/241 · visual-conteudo anatomia-i 76/76, anatomia-patologica 32/32 · porta 7/7 nas duas · navegar-ferramentas (6 matérias × 1440/768/390) 1068/1068 · infografias-regra 48/48, infografias-modo 123/123 · nao-ativacao 22/22 · servidor 59/59 · navegador 247/247 · Semiología II sem regressão (layout 535, sistema 124, nav-sistema 216, cover 198, soltos 16, race 140, ink-jump 54, caneta-ipad 197).
Caneta e auditoria pública: **mesmas falhas da main pura, 0 novas** — `caneta-novo-layout` 87/91 (main 87/91 em 2 rodadas, 88/91 em outra; branch 87/91 em 3), `caneta-456` 136/138 (main 136/138), `auditoria-implantacao-publica` 22 falhas idênticas (supõe liberação por variáveis do Netlify). Detalhe em `docs/nova-era/CANETA-FALHAS-ANTIGAS-2026-11.md`.
Observação de método: o `temas-anato1-ap1` falhou uma vez (110/112, vinhetas não carregadas a tempo) quando 4 fluxos de teste rodaram em paralelo; sozinho: 112/112.

## 5 · Achado editorial (não alterado)
`a1notas` diz que as figuras são «SVG originales»; hoje são webp. Corrigir é decisão de conteúdo.
