# Harness da geometria do Layout V2 (B1)

Carrega o `rm-layout.js`, `rm-layout.css`, `rm-modes.js` e `styles.css` **reais** numa página sintética com a mesma
estrutura da matéria (`#materias-container > .tab-content.active > section.container`, `.container` = 880 centrado).
Sem Supabase, sem rede (só `127.0.0.1`), sem áudio.

```bash
export NODE_PATH=$(npm root -g)     # ou RM_PLAYWRIGHT=/caminho/do/modulo
node tools/qa/browser-qa/layout/layout.test.cjs
```

## Regra do dock do player (`data-rm-dock`)

Antes: `side` se `(w − left) ≥ 880 + 67 + 12 + 240 + 32`. Errado porque o `.container` é **centrado**: o espaço livre
divide-se pelos dois lados, então entre ~1495 e ~1690 px (lateral aberta) o player de 240 px entrava sob o cartão de texto.

Agora (`decidirDock`): `side` só se o player lateral (224 px, encostado à toolbox com 8 px) ficar a ≥ 8 px da borda
direita do cartão. A borda é **medida** no DOM (`section.container` da aba ativa) e, sem medida, calculada:
`left + (R + min(880, R)) / 2`, `R = clientWidth − left − 67`. Usa `clientWidth` (mesmo referencial do `position:fixed`).
Histerese de 12 px para passar de `bottom` a `side`. Nada muda enquanto `body.rm2-pen-down` (a mudança de lateral/dock é
adiada até a caneta levantar, para não deslocar a escrita no meio de um traço).

| largura | lateral aberta (264) | trilho (64) |
|---|---|---|
| 1024–1440 | bottom | bottom |
| 1495–1627 | bottom | side (≥ ~1495) |
| ≥ ~1700 | side | side |

O teste imprime a tabela medida (largura × modo → dock e folga em px) e falha se `side` cobrir o cartão, se `bottom`
ocorrer com folga real, se o slot invadir a toolbox/lateral, se houver overflow horizontal, ou se abrir o player lateral
deslocar qualquer parágrafo. Validado por mutação (a fórmula antiga reprova com 17 falhas).
