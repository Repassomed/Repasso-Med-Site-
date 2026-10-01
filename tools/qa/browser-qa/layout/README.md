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
(15 falhas; a imagem deixa o traço 489 px fora de forma permanente); com a correção, 54/54.

Não testado: aparelho real; imagens `loading="lazy"` reais (a Semiología II não tem `<img>` e a emulação não dispara o
carregamento lazy: usa-se imagem sintética `eager`); matéria de ~418 mil px (Histología II Práctica) com o layout (o piloto
é só Semiología II).

## Capturas reais do piloto — `capturas.cjs` e `capturas/`

```bash
RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/capturas.cjs <pasta> [prefixo]
```
Layout real + Semiología II real + `<style>`/topbar **reais** do `index.html` (`serve.cjs` compõe a página: logo, «REPASSO MED · Guía de
Estudio», abas). Gera, por caso, `topo`, `drawer` (< 768 px CSS) e `bloque03` (depois de saltar pelo índice) + `metricas.json`
(lateral, dock, overflow-x, logo carregado, nome da matéria inteiro, erros JS). Casos: 320 · 390 · 768 · 1024 · 1440 · **zoom 200 %**
(1440 e 1024 → viewport CSS 720 e 512, escala 2: o piloto cai no drawer, como deve) · larguras críticas do dock do player
1495 · 1627 · 1700 · 1920 (`bottom`, `bottom`, `side`, `side`; o slot do player continua vazio nesta fase).
`capturas/` guarda uma rodada (WebP). **Limites:** emulação (não aparelho); as fontes do Google não carregam no sandbox (caem nas do
sistema, portanto tipografia ≠ produção); não há comparação lado a lado com as 4 referências aprovadas porque elas não estão no
repositório nem no Drive — o acabamento segue a especificação escrita (#67, 30/09, §3).

**Acabamento B1 (só `rm-layout.css/js`):** logo original (`assets/repasso-med-logo.png`, o mesmo do cabeçalho do site) numa pastilha
branca na faixa persistente; acentos do shell em **laranja da marca** (`--l2-orange #e8772e`: borda da faixa, item ativo, bloco atual,
chip «Página completa») no lugar do dourado, mantendo navy/branco e a serifa nos títulos; nada do conteúdo da matéria foi tocado.


## Medida de tinta VÁLIDA (`lib-ink.cjs`) — «0 px com 0 paths» = TESTE INVÁLIDO

Auditoria do #425: no 390 px o traço de `s2-b10` nem estava na janela depois do salto (top 1407 > 844) e o teste passava com «0 px».
Agora uma medida só vale com tinta **realmente visível** no destino: a âncora (bloco de texto) do traço na janela, `paths > 0`,
bounding box do SVG e do `<path>` finitas e não vazias, e o alinhamento medido. Sem isso o teste **reprova** como inválido (nunca
passa). SVG longe da âncora = desvio grande = reprova na tolerância (2 px).

## Corridas de transição e caneta × reposicionamento — `race.test.cjs`

```bash
export NODE_PATH=$(npm root -g)     # ou RM_PLAYWRIGHT=/caminho/do/modulo
node tools/qa/browser-qa/layout/race.test.cjs
```
**Corrigido em `rm-modes.js`:** o callback da volta à Página completa (espera de 2 frames + 120 ms) continuava rodando depois de
uma nova troca de modo, de um `detach()` ou de sair da matéria: reposicionava a tinta e devolvia a rolagem da Página completa já
dentro de outro modo. Agora cada transição tem **geração** (`RMModes.gen`, avança em toda troca efetiva, attach e detach) e **aba**;
depois da espera confere de novo — ainda é a transição atual? mesma aba, ainda ativa/conectada? ainda `full`? ainda anexado? — e
só então reposiciona, restaura a rolagem e executa `opts.depois`; senão **NO-OP**. Também: se a volta anterior ainda não devolveu
a rolagem, uma nova saída **não** sobrescreve a posição de saída original (antes ela virava ≈ 0).
**Corrigido em `rm-layout.js`:** (1) todo `RMToolsV2.reposicionar()` passa por um único caminho coalescido que **nunca** roda com
`body.rm2-pen-down` (nem com traço em curso, via gancho só de leitura da V2): espera `pointerup`/`pointercancel` (+ `touchend`/`touchcancel`
do adaptador e conferência periódica de segurança), reconfere matéria/aba/modo/attach/ausência de novo traço e executa **uma** vez;
(2) `irPara()` e o acompanhamento da altura são invalidados por salto novo, troca de modo, troca de matéria ou detach (geração).
Nada de reconhecimento da Apple Pencil, Touch Events, scroll, palma, captura, latência ou RDP foi tocado: só leitura.

Cenários: A `preguntas→full→flashcards` antes dos 2 frames+120 ms · B `flashcards→full→preguntas` rápido · C sair da matéria durante a
espera · D detach durante a transição · E pedido de reposicionamento → o usuário começa o traço antes da execução (+ E3 novo traço
antes de o pendente executar, E4 matéria sai antes de a caneta levantar) · F `pointerup` → executa UMA vez · G `pointercancel` ·
H `irPara(A)→irPara(B)` (0 rolagens dirigidas a A depois do clique em B) · I `irPara()` → sair da matéria. 1440 e 390 (a caneta, só em
1440). **Validado por mutação:** com o `rm-layout.js/rm-modes.js` do HEAD auditado `94006e54` o teste reprova com 50 falhas; com a
correção, 107/107. Os eventos de caneta são **sintéticos** (`PointerEvent` `pointerType=pen`): provam o caminho de código, não o hardware.

## Etapa 2 — capa da matéria + slot de arte + acabamento (tudo em código) — `cover.test.cjs`

```bash
export NODE_PATH=$(npm root -g)     # ou RM_PLAYWRIGHT=/caminho/do/modulo
node tools/qa/browser-qa/layout/cover.test.cjs
```
**Divisão de responsabilidades:** o Layout (este código) cuida de estrutura, navegação, hierarquia, tipografia, cores, espaçamento,
responsividade, estados, abertura/fechamento, posição das imagens e nitidez da UI — em HTML/CSS/JS, nada vira imagem. A arte autoral
(banners/ilustrações da Semiología II) é produzida fora (ChatGPT → José → integração aqui). **Nenhuma ilustração foi criada.**

- **Capa** (`.rm-l2-cover`, `[data-rm-ui]`, sem ids, filha da aba e irmã das seções — nunca dentro de `section[id]`): eyebrow «Repasso Med ·
  Guía de estudio», `h1` serifado «Semiología II», subtítulo, «N bloques», ações «Ir al contenido» (1º bloco sob a faixa) e «Ver el
  índice» (só quando a lateral não está docked). Substitui, no piloto, o `.rm-subject-head` gerado pelo app-core (mesmo título e
  subtítulo); o hero de **conteúdo** da matéria e todas as seções ficam intactos. Em modo isolado a capa some; `detach()` a remove e
  devolve o header original.
- **Slot de arte `hero`** (`RMLayout.ASSETS.hero` / `RMLayout.setAsset('hero', spec)`): hoje **vazio e `hidden`** (0 px, sem caixa vazia nem
  desenho improvisado). Com arquivo: `w`/`h` reservam o espaço (`aspect-ratio` ⇒ 0 deslocamento), `object-fit: cover` + `pos` (sem
  deformar), `srcset`/`sizes` (retina/tablet), `fetchpriority=high`, estados `cargando` (esqueleto neutro) → `listo`; `error` (404) ⇒ colapsa.
  ≥ 1000 px: duas colunas (arte à direita); abaixo: arte em cima do texto; altura máx. 340 px.
- **Tokens únicos** (`--l2-radius`, `--l2-shadow`, navy/branco/laranja da marca; laranja-texto `#b34e0f` = 5,2:1 sobre branco) para capa, botões, slot e
  painel de modos; foco visível laranja (navy sobre claro) e alvos ≥ 44 px. Sem progresso, percentual, streak, plano, calendário,
  gamificação ou recomendação (verificado no teste).
- Lateral (minimizável, trilho, drawer, hierarquia matéria → bloco → tema, Volver arriba, Sugerencias, Banco, Todos los flashcards):
  **funcionalidade intacta** (suíte B1 176/176); só elevação sutil e foco.

### Evidências — o que é o quê
| | |
|---|---|
| **TESTADO AUTOMATICAMENTE** (Chromium emulado, harness real) | `cover` 102 · `race` 107 · `ink-jump` 54 · `layout` 183 · B1 176 (neutralidade de índice/IDs/125 highlights). 320 · 390 · 768 · 1024 · 1440 · 1600 · 1920, zoom 200 %, rotação, teclado (Enter/foco), contraste, slot (vazio/cargando/listo/erro, 0 deslocamento) |
| **VALIDADO VISUALMENTE** (capturas desta pasta) | 320 · 390 · 768 · 1024 · 1440, zoom 200 % (1440 e 1024), dock 1495/1627/1700/1920, slot com imagem **sintética** (1440 e 390). Conferido por mim nas capturas, **sem** comparação com a referência do José (ver abaixo) |
| **PENDENTE DE TESTE FÍSICO** (José, iPad/aparelho real) | safe-area (notch/home bar), teclado virtual, nitidez real em retina, rotação em hardware, toque/caneta/palma, fluidez com ~100 traços, imagens `lazy` reais, fontes de produção (as do Google não carregam no sandbox) |
| **PENDENTE DE ASSET (ChatGPT → José)** | arte `hero` (banner/ilustração da Semiología II): preencher `RMLayout.ASSETS.hero` com `src/srcset/w/h/alt` |
