# As 2 falhas «post-it» de `caneta-novo-layout.test.cjs` — causa, e o #470 mantém o comportamento

> Resultado: **89/91 no #470 e a `main` dá as mesmas 2 falhas**, com o **mesmo número ao dígito** (`maxDist 1.6816338970234195`, 0 pontos perdidos). O #470 **não altera nem piora** esse comportamento. Não é um defeito de perda de traço: é uma tolerância de **medição** (1,6 px) sendo ultrapassada por 0,08 px num elemento que o tema gira.

## O que reprova
`layout · postit · rapido` e `layout · postit · longo` — **só** na configuração `layout` (Layout V2 sem o tema):
`1 traço novo (40→41), 0/360 pontos perdidos (máx 1.68 px), gravado pelo motor (0→1)`. Reprova apenas a condição `maxDist ≤ 1.6 px`; as outras três da mesma linha (1 traço, 0 perdidos, gravado) passam. `antigo` e `novo` passam nos mesmos alvos.

## Por que acontece (medido por `tools/qa/caneta-456/postit-rotacao.cjs`, 1440×900)
O `.rm-postit` do bloco `s2-b04` é **girado 0,6°** (`transform: matrix(0.999945, 0.0104718, -0.0104718, 0.999945, 0, 0)`) nas configurações que carregam a camada do layout novo. O teste mede a distância do ponto enviado ao traço gravado usando `getBoundingClientRect()` do elemento — que, para um elemento girado, devolve a **caixa envolvente** (maior que a caixa de layout):

| cfg | caixa de layout (offset) | `getBoundingClientRect` | transform | maxDist |
|---|---|---|---|---|
| `antigo` | 782 × 281 | 782 × 281,2 | nenhum | 1,397 px |
| `layout` | 782 × 281 | **784,9 × 289,4** | rotação 0,6° | **1,682 px** |
| `novo` | 520 × 363 | 523,8 × 368,6 | rotação 0,6° | 1,386 px |

A diferença entre a caixa envolvente e a caixa de layout (≈ 3 px × 8 px aqui) é da ordem do desvio medido; a mesma rotação aparece em `novo`, onde a caixa é menor e o desvio fica abaixo de 1,6 px. Ou seja, o desvio depende de **onde o gesto cai dentro de um elemento girado**, não de pontos perdidos (0 em todos), e o piso de ~1,4 px já existe no `antigo` (sem rotação) por causa da simplificação do traço (RDP 0,7 px) + curvas Q da medição. **Hipótese não provada isoladamente:** a parcela exata da rotação sobre os 0,28 px acima do `antigo`; para provar seria preciso medir com o `transform` do post-it desligado. Não fiz isso porque não é desta PR.

## O #470 altera isso?
**Não.** Evidência:
- `main` (`RM_ASSETS_REF=origin/main`, mesmo teste, sem o patch): as mesmas 2 falhas, `maxDist 1.6816338970234195`, `perdidos 0`; branch: idêntico (`postit-main.log` × `postit-branch.log` do probe, abaixo).
- O motor do traço (`onDown/onMove/onUp`, RDP, gravação) e a geometria do post-it não foram alterados pelo #470; as mudanças são a guarda de toque, `--rm-dock-h` e diagnóstico.
- Na `main` o mesmo teste ainda reprova **2 outras** verificações (`--rm-dock-h` 368 px em 1440×900), que são exatamente a mudança intencional do #470 (dock só < 768 px); o teste do #470 foi atualizado para esse contrato.

## Estado
Pendência da caneta/layout, **não** retomada aqui (a reforma do post-it está pausada — #464 do Claude 2). Proposta para quando for retomada: medir com a caixa **sem rotação** (`offsetWidth/Height`) ou aceitar a tolerância de 2,0 px para elementos girados — decisão de quem retomar o post-it.

Reproduzir: `NODE_PATH=$(npm root -g) RM_FFMPEG=… node tools/qa/caneta-456/postit-rotacao.cjs` (e com `RM_ASSETS_REF=origin/main`).
