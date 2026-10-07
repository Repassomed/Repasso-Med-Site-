# Falhas «post-it» de `caneta-novo-layout.test.cjs` — comparação com a `main` (não são desta PR)

`tools/qa/browser-qa/layout/caneta-novo-layout.test.cjs` (da #456/#461) termina em **89/91** tanto **com** quanto **sem** esta PR. O motor da caneta, `rm-materia-sistema.*`, `rm-audio.*` e o teste em si **não foram alterados nesta branch**.

## Como foi comparado
`bash tools/qa/indice-expansivel-460/comparar-caneta.sh [pasta]` roda o mesmo teste duas vezes, em sequência, trocando **só** o `rm-pilot.js` (restaurado por `trap`; conferido com `diff` contra o HEAD depois):

| Execução | `rm-pilot.js` | Resultado |
|---|---|---|
| A · esta branch (HEAD `a5f0931b` + este lote) | com o índice expansível ligado | **89/91** |
| B · `main` `dfb576ae` | original da `main` (sem `RMIndice`) | **89/91** |

As **mesmas 2 verificações** falham nas duas, com os mesmos números:

```
✗ layout · postit · rapido: 1 traço novo (40→41), 0/360 pontos perdidos (máx 1.68 px), gravado pelo motor (0→1)
✗ layout · postit · longo : 1 traço novo (40→41), 0/200 pontos perdidos (máx 1.68 px), gravado pelo motor (0→1)
```

`diff` entre as duas execuções: só muda a linha de tempo do tick do player (3,6 ms × 4,1 ms; ruído de CPU).

## Leitura da falha (sem atribuir causa à caneta além do que o teste mostra)
- A condição que reprova é só a **tolerância** `maxDist ≤ 1.6 px`: o desvio medido é **1,68 px**. Os demais critérios da mesma linha passam: 1 traço novo, **0 pontos perdidos**, gravado pelo motor (0→1).
- Ocorre na configuração **`layout`** (Layout V2 **sem** o tema), onde `RMSistema`/`RMNav`/`RMIndice` nem são carregados — portanto não depende desta PR. As configurações `antigo` e `novo` (tema + navegação + índice) passam nos mesmos alvos (`post-it` incluído).
- Fica como pendência da #456/caneta (o relato original é do Claude 2); **não** foi tocada aqui, conforme a auditoria.
- Limite: o teste usa o pipeline pointer do Chromium (CDP), **não** é teste físico com caneta.
