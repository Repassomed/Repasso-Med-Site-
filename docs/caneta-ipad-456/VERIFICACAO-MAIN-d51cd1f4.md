# Verificação pós-merge da caneta no piloto — `main` `d51cd1f4` (build `2026-10-10·456e`)

> Só piloto (Semiología II, `pilotoPermitido()`); nada ampliado para outras matérias. **A #456 continua aberta: o critério é o reteste físico do José.**

## O que foi verificado e contra o quê
- **Código:** a `main` em `d51cd1f4` = merge da #479 (`rm-tools-v2.js` com `BUILD_456 = '2026-10-10·456e'`, tag `?v=2026101002`).
  - Inclui também o que entrou na `main` depois da base da #479: a #472 (`app-core.js`, `styles.css`) e matérias de outras áreas.
- **«Versão publicada»:** não dá para abrir `repassomed.netlify.app` deste ambiente (conexão recusada pelo proxy). A verificação foi feita sobre o **código da `main`**, que é o que o deploy de produção publica.
  - Confirmar no iPad que a página carregada é esta: aviso `caneta #456 · build 2026-10-10·456e` ao abrir a maleta.
- **Ambiente:** Chromium/Playwright (caneta via CDP `pointerType:'pen'`, palma via toque com raio grande, iPad simulado com `TouchEvent` + `touchType`). Não é Safari nem Apple Pencil.

## Resultados (todos sobre `d51cd1f4`)
| Caso | Bateria | Resultado |
|---|---|---|
| **Desfazer × persistência** (nova) | `tools/qa/caneta-ipad-456/desfazer.test.cjs` | **28/28**: a tabela abaixo detalha os 4 cenários, com diagnóstico fechado e aberto |
| Rolagem, pinça, palma antes/durante/depois, goma (repouso, dedo, palma no meio), zoom e alinhamento, trocas, interrupção, recarregar, `pointerup` perdido + só dedos (K/L/M), adaptador do iPad (J) | `ipad.test.cjs` | **197/197** |
| Rolagem com o dedo por layout × ferramenta | `rolagem.cjs` | 307–329 px em todos (antigo, layout e novo; nenhuma, lápis e goma); 0 recálculos da árvore inteira |
| Custo por traço, `--rm-dock-h`, trocas de bloco/modo, diagnóstico, gate | `caneta-456.test.cjs` | **138/138** |
| Regressão do piloto | `sistema` 124 · `layout` 535 · `player-sistema` 275 · `player-toolbox` 495 · `race` 140 · `ink-jump` 54 · `cover` 198 · `nav-sistema` 216 · `pilot-flags` 10 · #460 piloto real 51 | **verdes** |
| `caneta-novo-layout` | — | 89/91: as 2 falhas «post-it» conhecidas e idênticas à `main` desde a #461 (desvio de medição de 1,68 px num post-it girado 0,6°, 0 pontos perdidos; `docs/caneta-456/POSTIT-FALHAS-PREEXISTENTES.md`) |

### Desfazer × persistência (detalhe da bateria nova)
| Cenário | Esperado e obtido |
|---|---|
| U1 lápis: 2 traços → Deshacer → recarregar | volta só o 1.º, mesmo id, 1 desenhado; o banco simulado fica com 1 linha |
| U2 goma: apaga 1 → Deshacer → recarregar | restaura o mesmo desenho (âncora e pontos; o restauro grava um id novo, como sempre fez) e depois de recarregar há 2, sem duplicar |
| U3 goma com a palma no meio do gesto | a palma não corta o gesto (2 apagados); 1 Deshacer restaura os 2; depois de recarregar há 2, sem duplicar |
| U4 `pointerup` perdido → caneta levantada → Deshacer | o traço interrompido foi gravado e a guarda saiu; Deshacer remove esse traço (o último), não o anterior; depois de recarregar fica só o 1.º |

## Falhas reproduzíveis
**Nenhuma nova.** A única falha que persiste é a dos 2 post-its em `caneta-novo-layout`: é de medição, é preexistente e é igual à `main` anterior. Não foi tocada, porque a reforma do post-it está pausada (#464).

## O que só o iPad decide (aguardando José)
- Aceitação de `pinch-zoom` pelo WebKit. A linha `ambiente:` do diagnóstico mostra.
- Ordem real de `pointerup`/`touchend` da Apple Pencil.
- Rejeição de palma do iPadOS.
- Fluidez da rolagem (linha `rolagem:` do diagnóstico).
- O comportamento do primeiro toque de dedo quando a única prova da saída da caneta é o próprio dedo (README §7).

Roteiro: `docs/caneta-ipad-456/PASSO-FINAL-JOSE.md`.

## Reproduzir
```bash
export NODE_PATH=$(npm root -g) RM_FFMPEG=…
node tools/qa/caneta-ipad-456/desfazer.test.cjs
node tools/qa/caneta-ipad-456/ipad.test.cjs
node tools/qa/caneta-ipad-456/rolagem.cjs
```
