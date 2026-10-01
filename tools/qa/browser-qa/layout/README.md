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

## Tinta × saltos e alturas que mudam (achado F da auditoria #420) — `ink-jump.test.cjs`

```bash
export NODE_PATH=$(npm root -g)     # ou RM_PLAYWRIGHT=/caminho/do/modulo
node tools/qa/browser-qa/layout/ink-jump.test.cjs
```

Semiología II **real** + `app-core.js`/`rm-tools.js`/`rm-tools-v2.js` **reais** + piloto (`rm-pilot` → `rm-layout`/`rm-modes` reais).
Supabase e o gate do piloto são simulados (`harness-ink.html`; 0 rede real, 0 escrita). A tinta é **semeada** como se viesse
do banco (`?seed=id1,id2`): 1 traço em `s2-b10` e outro em `s2-banco`. Mede, em px, o desvio entre o SVG de cada traço e o
bloco âncora (os da janela e todos).

**Causa:** as seções usam `content-visibility:auto`; ao saltar/rolar, seções puladas são renderizadas e mudam de altura.
O `ResizeObserver` da V2 só observa âncoras/seções **com** tinta, então uma seção **sem** tinta que cresce acima de um traço
já renderizado não dispara nada e o traço fica a milhares de px do texto (medido: 4 000–21 000 px; 489 px com uma imagem
sem `width/height`), sem se corrigir sozinho.

**Correção (só layout, via API pública `RMToolsV2.reposicionar`):** o layout guarda a altura do documento no último
reposicionamento e reposiciona (a) ao terminar `irPara()` e acompanhar até a altura estabilizar, (b) ao fim da rolagem
(200 ms) se a altura mudou, (c) quando uma `<img>` da matéria termina de carregar, (d) ao voltar à Página completa, depois de
devolver a rolagem. Não toca âncoras, algoritmo nem persistência.

Cenários (1440×900 e 390×844): salto a blocos profundos; **revisitar** (fundo → mais acima → fundo, em página nova);
volta da Página completa em posição profunda (inclusive vindo de um modo isolado direto a um tema profundo); imagem
carregando depois do salto. **Validado por mutação:** com o `rm-layout.js`/`rm-modes.js` anteriores o teste reprova
(9 falhas; a imagem deixa o traço 489 px fora de forma permanente); com a correção, 55/55.

Não testado: aparelho real; imagens `loading="lazy"` reais (a Semiología II não tem `<img>` e a emulação não dispara o
carregamento lazy: usa-se imagem sintética `eager`); matéria de ~418 mil px (Histología II Práctica) com o layout (o piloto
é só Semiología II).
