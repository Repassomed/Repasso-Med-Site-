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

## Cobertura ampliada (re-auditoria da #417 sobre a `main` pós-#411)

`layout.test.cjs` agora também roda os **22 viewports** 320 · 390 · 561 · 600 · 700 · 767 · 768 · 1024 · 1280 · 1366 · 1440 · 1480 ·
1495 · 1500 · 1560 · 1600 · 1627 · 1650 · 1690 · 1700 · 1760 · 1920, cada um com a lateral **aberta** e **minimizada**: lateral
(`docked`/`rail`/`off`), dock (`side`/`bottom`), 0 overflow, slot à esquerda da toolbox (a partir de 768 — abaixo disso a raia direita
não é reservada, por desenho), `side` ⇒ não cobre cartão/lateral/toolbox e **abrir o player não desloca parágrafos**, `bottom` ⇒ o último
bloco não fica escondido (reserva `--rm-player-h`). Rotação (celular, tablet, tablet grande, 900×600) volta ao mesmo estado.
Caneta: com `rm2-pen-down` o resize não muda o dock/lateral; ao **levantar** ou **cancelar** a mudança pendente é aplicada **uma vez**;
os listeners de fim de contato são removidos (add = remove) e o `detach()` com mudança pendente não deixa timer nem listener.
A medição espera `fadeInTab` (animação de 0,4 s da aba ativa) terminar: antes ela dava falsos «deslocamentos» de < 1 px.
**509 verificações, 0 falhas** (3 execuções seguidas); sem a #417 (rm-layout.js/css da `main`) o teste reprova.

### Blocker conhecido 561–767 px (NÃO corrigido aqui; pertence à #425)
Com a toolbox **real** da V2 (`.rm2-box`) e um player inferior simulado: entre 561 e 767 px a regra que ergue a toolbox acima do player é
só `@media (max-width: 560px)`; fora dela a toolbox fica na posição padrão da V2 e **pode ficar sob o player**. Medido (altura de janela ×
altura de player 88/120/160/220 px): 390 e 560 → 0/24 combinações com a toolbox coberta; **561, 600, 700, 767 → 5/24** (janelas baixas,
≤ ≈ 420 px, com player ≥ 160 px; ex.: janela 320 px, player 160 px: toolbox bottom = 186, player top = 160); 768 → 0/24. **Continua reproduzível.**

### Contrato com o Audiobook (re-sync pós-#429)
O Audiobook da `main` (`rm-audio.css`, modo lateral) se posiciona com `right: var(--rm-player-edge, 8px); width: var(--rm-player-w, 224px)` dentro do slot
`#rm-l2-player`, e `html[data-rm-dock="side|bottom"]` é a autoridade de modo; o motor publica `--rm-player-h`. O shell publica as três variáveis
(`--rm-player-w: 224px`, `--rm-player-edge: 8px` = `PLAYER_EDGE`, `--rm-player-h: 0px` sem player) e o `layout.test.cjs` trava os valores e prova que um
player posicionado **exatamente com essa regra** fica a ≥ `PLAYER_GAP` do cartão e entre a lateral e a toolbox (1500–1920, aberta e trilho). Validado também
com o **Audiobook real**: `RM_B1_DIR=<assets> node tools/qa/browser-qa/audio-integracao/integracao.test.cjs` → 294 verificações, 0 falhas (mídia real).
**535 verificações** no `layout.test.cjs`.
