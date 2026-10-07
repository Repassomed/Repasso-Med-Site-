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


## Blocker 561–767 px — CORRIGIDO na #425 (`player-toolbox.test.cjs`, rodada 2: mede CADA botão)
**Causa:** a V2 só ancora a toolbox embaixo em `@media (max-width: 560px)`; de 561 a 767 px ela fica centrada na vertical (`top:50%`) e o player
inferior (largura toda, altura `--rm-player-h`) podia cobri-la, sobretudo em janela baixa e com o painel aberto. Com o CSS da `main` o teste reprova (160 falhas).

**Auditoria do Claude 4 (53 px · toolbox aberta · caneta armada · 561×520, 700×520, 767×520, 720×450):** o teste anterior medava só o retângulo da caixa/painel e
deixava escapar os botões que SAEM dele. Reproduzido com a V2 real. **Leitura exata do que acontece:** o painel da V2 é uma lista **rolável** (`overflow-y:auto`);
com o chip de caneta armada ele tem 492 px de conteúdo, e em janela de 520 px só cabem ~330. Os últimos botões («Deshacer», «Mis apuntes», «Diagnóstico»)
ficam **recortados pelo próprio painel** (abaixo da caixa), não pintados sobre o player — `elementFromPoint` nesses pontos devolve o player, não o botão, e rolando o painel
eles aparecem inteiros ACIMA do player (capturas `{561,700,767}x520_player_compacto53_caneta_*` e `720x450_player_compacto53_caneta_*`, com o painel no topo e rolado até o fim; player e chip são SIMULADOS). Mesmo assim: (a) a medida antiga contava botão recortado como «visível», e (b) o aluno não percebia que havia mais
botões e a caixa deixava ~50 px sem uso. Corrigido nas duas pontas:
1. **Posição (só `rm-layout.css`):** em 561–767 a caixa é centrada na região livre **entre a faixa do shell e o player** (não mais simétrica em torno do meio) e o painel recebe a altura que sobra
   (`100% − player − faixa − 75px`): 292 → **333 px** em 561×520 com player de 53 px (o «Goma» passa a caber inteiro). Em ≤ 560 px, onde a V2 ancora a caixa embaixo, o mesmo limite vale (antes o painel podia passar do topo da janela
   com player alto). Sem player (`--rm-player-h: 0`) a posição é a original (centrada).
2. **Sombras de rolagem** (só pintura, `html.rm-l2 .rm2-panel`): quando o painel rola por dentro aparece sombra suave no lado que ainda tem botões (capas `local`/`scroll`); sem rolagem nada aparece.
Não foram tocados: motor do player, V2 (`rm-tools*.js`), caneta, Apple Pencil, Touch Events, palma, `rm-audio*`.

**Teste (480 verificações, 420 combinações):** toolbox REAL da V2 × {fechada · aberta · aberta+caneta} × player {0 · 53 · 88 · 120 · 135 · 160 · 220} px × 20 viewports (320×700 · 390×844 e 520 · 560×844 e 520 ·
561×844 · **561×520** · 561×420 · 600×844 e 360 · 700×900 · **700×520** · 700×420 · **720×450** · 767×1024 · **767×520** · 767×400 · 768 · 1024 · 1440). Para **cada botão visível** de `.rm2-box` (2 898 medidas):
visível = interseção com a área rolável do painel; se visível agora: 0 px² sob o player e o clique no centro cai nele; **alcançável**: depois de rolar o painel ele fica INTEIRO na área do painel, acima do player, dentro da janela, o clique no centro
cai nele e o alvo tem ≥ 44 px (≥ 40 em ≤ 560, como a V2); o painel não rola quando há espaço; se rola, há sombra. Em 561/700/767×520 com 53 px e caneta armada: **10 de 13 botões visíveis de imediato**
(os 3 últimos alcançáveis rolando) e 720×450: 9 de 13; sem a caneta armada (7 botões) todos cabem. 6 combinações têm área livre < 60 px (ex.: 360 px de altura com player de 220 px) e só conferem a interseção da caixa com o player.
**Contra o CSS da #425 (`0d56af12`) o teste novo reprova (155)** — espaço sem uso, sem sombra de aviso, painel fora da janela em ≤ 560 —; contra o da `main`, reprova com sobreposição real (botões sob o player).
**Limite:** emulação; o player é o slot real com a altura publicada (o motor de áudio não roda aqui); rolagem por toque do painel com a caneta armada e o chip real do Audiobook são **pendentes de teste físico**.
Nota: a suíte `audio-integracao` (Claude 4) ainda imprime «B1-BLOCKER ATIVO» em 720×450 porque o harness dela usa uma **toolbox simulada** (`#b1-tools`) com cópia
inline da regra antiga, não a `.rm2-box` real nem o CSS do Layout; o teste do Claude 4 com a toolbox real é `caneta-real.test.cjs` (branch `claude/audiobooks-preativacao`).

## Assets de arte (ChatGPT → José → integração)
Especificação completa em [`ASSETS-CHATGPT.md`](ASSETS-CHATGPT.md): hoje 1 slot (`hero`), entregue em 2 resoluções.

## Navegação por bloco + modos isolados (issue #453) — `nav-sistema.test.cjs` e `capturas-navegacion.cjs`
`rm-materia-nav.js` (`window.RMNav`) sobre o `RMModes` (eixo `block`): índice geral · um bloco por vez · modos Infografías/Preguntas/Flashcards/Audiolibros/Auscultación com índice de blocos e só o recurso do tipo.
```
export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo ; precisa de ffmpeg (ou RM_FFMPEG)
node tools/qa/browser-qa/layout/nav-sistema.test.cjs
RM_FONTS_DIR=<pasta com local.css> node tools/qa/browser-qa/layout/capturas-navegacion.cjs <pasta-de-saída> [--so=nav|mobile|ab]
```
Prova (A–H): tema desligado = leitura contínua e nada da navegação · abertura (capa, 5 recursos, 14 cards com contagens = DOM, sem «Revisión reunida», modos no alto da lateral, nós/IDs idênticos aos da página sem o tema, nada de URL/bucket no DOM) ·
um bloco por vez (card, lateral, árvore, pager, extremos, Back/Forward, hash, deep link na carga, teclado, foco, oculto = `display:none`) · modos (índice só com blocos que têm o recurso, contagens reais, 1 página «modo+bloco» por recurso sem páginas vazias,
grupos de Preguntas só com metadado real e estado da questão preservado, Flashcards + «todos» sem duplicar, Audiolibros só com card real — inclusive manifesto tardio e deep link adiado) · caneta (traço persiste, bloco oculto esconde o SVG, volta ancorado, 0 escritas na navegação; **regressão `atualizarTinta`**: índice geral / índice de Preguntas / Preguntas do bloco → nenhum SVG com `display` ≠ `none`, sem caixa e sem pixel — `RM_EVID_DIR` grava as capturas) ·
áudio (6 trocas sem parar, 1 mídia, sair da matéria/logout para) · 320/390/768/1024/1440 e zoom 200 % (sem overflow/sobreposição, pager acima do player) · detach limpo. `lib-player.cjs` abre com a navegação **desligada** por padrão (`nav:false`) para os testes de geometria/tema/player,
que medem a leitura contínua; `nav:true` liga. `ink-jump.test.cjs` com `RM_VISUAL=1` roda os saltos/revisitas de bloco COM a navegação e os cenários de leitura contínua sem ela.
`capturas-navegacion.cjs` gera antes (leitura contínua) × depois e a comparação A × B do player com `MEDIDAS-PLAYER.md`. Emulação de toque, não aparelho real.

## Player do audiobook no tema do piloto — `player-sistema.test.cjs` e `capturas-player.cjs`
**(Atualizado na #453: disco de vinil quase quadrado no ALTO À DIREITA — A coluna reservada ≥ 1430 px · B quadrado recolhido que expande; ver `SISTEMA-VISUAL-MATERIAS.md`.)** Na #446 era um card dentro da lateral colorida (desktop ≥ 1200 px); barra compacta (celular/tablet/trilho), convivência com a toolbox aberta e com a caneta armada. **Motor de áudio REAL**
(rm-audio-boot → rm-audio/store/provider, mp3 gerado com ffmpeg); só o servidor (gate, manifesto, URL assinada, mídia) é simulado — `lib-player.cjs`.
```
export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo ; precisa de ffmpeg (ou RM_FFMPEG)
node tools/qa/browser-qa/layout/player-sistema.test.cjs
RM_FONTS_DIR=<pasta com local.css> node tools/qa/browser-qa/layout/capturas-player.cjs <pasta-de-saída> [--sem-tema] [--so=390,1440]
```
Prova (A–F): tema desligado = player original · CSS do player só sob `html.rm-sis #rm-l2-player …` (nada alcança a auscultação) · desktop 1440 e 1545×665 (card na lateral, `--rm-player-h` = 0, lista do índice
acima do card, controles ≥ 44 px, seek/±15/velocidade/play/progresso/retomada, aria-labels originais) · celular 320/390 (barra ≤ 64 px, `--rm-player-h` = altura medida, tabela/post-it/auscultação sem cobertura por
hit-test, fim da página legível, card ampliado por TOQUE, toolbox aberta, caneta armada com ESCRITA enquanto o áudio toca, borracha) · tablet 768 e trilho · 6 `<audio>` de ausculta intactos e exclusivos com o audiobook ·
trocar de matéria e `SIGNED_OUT` (inclusive pelo «Sair» da faixa) param o áudio e desfazem o tema. Capturas: `capturas-sistema/player/`. Emulação de toque, não aparelho real.
