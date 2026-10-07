# Patches para a integração (depois da PR da caneta #456)

> **Nenhum destes patches foi aplicado ao disco.** Todos tocam arquivos reservados pelos Claudes 1 e 2 (#67) ou áreas críticas (CLAUDE.md §7). O ensaio os aplica **em memória** (servidor local do harness) para medir o efeito; o resultado está em `MATRIZ.md` (variante «com correção»). Linhas conferidas contra a `main` `f6547a7c`.
> Ordem proposta: A1 → A2 → A3 → A4 → A5 (liberam o layout para outras matérias, mas **não ativam nada**: `rm-pilot.js` continua fail-closed) e C1 → C4 (corrigem o que o ensaio mediu).

## A · Amarras ao slug do piloto (sem elas o layout não roda fora de Semiología II)

| ID | Arquivo:linha | Hoje | Proposta | Aplicado no ensaio? |
|---|---|---|---|---|
| **A1** | `assets/rm-layout.js:39` | `var SLUG = 'semiologia-ii';` | `RMLayout.attach(tab, slug)` recebe o slug (como `RMSistema.attach` e `RMNav.attach` já recebem) | sim, em memória: o slug vem de `window.__RM_ENSAIO.slug` |
| **A2** | `assets/rm-materia-sistema.css:71` | `html.rm-sis[data-rm-tema="semiologia-ii"] {` (paleta, superfície, lateral só do piloto) | variáveis de paleta por tema (`[data-rm-tema="<slug>"]` com fallback `html.rm-sis`) | sim: mesma paleta para qualquer slug (o ensaio testa componentes, não identidade) |
| **A3** | `assets/rm-materia-sistema.js:61` (`TEMAS`) e `:633-639` (`attach` lança `sin tema`) | só existe `TEMAS['semiologia-ii']` | `RMSistema.registrarTema(slug, descritor)` + derivador por conteúdo a partir de `data-rm-role` (contrato §2); matéria sem descritor = layout desligado (fail-closed) | sim: o ativador **gera** o descritor do DOM real (classificação por conteúdo, unidades pelos marcadores «UNIDAD X»), sem vinhetas/medalhões |
| **A4** | `assets/rm-audio-boot.js:38-39` | `SLUG = 'semiologia-ii'`, `TAB_ID = 'tab-semio2'` | slug/aba recebidos de `start({slug, tab})`; manifesto pedido por esse slug | **não** (o ensaio não toca áudio) |
| **A5** | `assets/rm-pilot.js:33` e `:77` | `SLUG` fixo; `j.slug === SLUG && j.layout === true` | lista de slugs liberados vinda de `get-pilot-flags` (servidor decide); fail-closed se ausente | **não** (o ensaio usa ativador próprio; flags e UID intocados) |

## C · Correções do que o ensaio mediu

| ID | Arquivo:linha | Problema medido | Patch | Efeito medido |
|---|---|---|---|---|
| **C1** | `assets/rm-materia-nav.js:90` | `var REUNE = /banco\|flashcards/i;` reconhece a agregadora (cópia de itens dos blocos) **pelo id**; falha em 16 matérias (ids `revisaoneu`, `…cierre`, `…mazo`…): contagem 2×–3× e a cópia aparece como «bloco» nos modos | `REUNE = { test: id => /banco\|flashcards/i.test(id) \|\| document.getElementById(id)?.hasAttribute('data-rm-agrega') }` (e o descritor/HTML põe `data-rm-agrega`) | variante «com correção»: capa e modos deixam de somar cópias |
| **C2** | `assets/rm-layout.js:472` | `RES_REUNE` igual, na contagem de recursos do Layout V2 | idem C1 | idem |
| **C3** | `assets/rm-materia-sistema.css` (ou `rm-materia-nav.js`) | o conteúdo original que **não é** `section[id]` (hero, `.rm-revisao-banner`) continua visível abaixo do índice geral e acima de cada bloco; em Semiología II sobra o `.s2-hero` (213 px) | `html.rm-nav[data-rm-nav] #tab-x > *:not(section[id]):not(footer):not([data-rm-ui]) { display:none }` | variante «com correção»: `indice/sem-residuo` e `blocos/sem-residuo-bloco` passam |
| **C4** | `assets/rm-materia-nav.js:437-440` (`preencherLink`) | `if (!titulo) { a.hidden = true; … }`: vizinho **sem `<h2>`** some do Anterior/Próximo → beco sem saída (ex.: Anatopatología I: `analise-guia` sem título; de `introduccion` não há «siguiente») | título de reserva: marcador da seção, depois «Bloque NN» | **não aplicado no ensaio**; falha reportada na matriz como conteúdo/módulo |
| **C5** | `assets/rm-materia-sistema.js` / `rm-materia-nav.js` (contagens) | contam nós do DOM | contar **ids canônicos distintos** fora de agregadoras e preencher `[data-rm-count]` na portada (contrato §3) | não aplicado; depende de ids de questão (19 matérias não têm) |

## D · Fora de escopo, mas registrado

- **Fonte externa:** `rm-materia-sistema.js:44` carrega a Literata do Google Fonts (`fonts.googleapis.com`). É igual no piloto; o ensaio a bloqueia como todo o resto da rede e registra à parte. Em produção é uma requisição externa por aluno (política de privacidade/CSP a confirmar por José).
- **Semiología II (piloto):** 12 flashcards existem só em `s2-banco` (não estão nos blocos nem em «Flashcards de todos»): a capa mostra 172 e o aluno encontra 184. Decisão editorial.
- **Aplicação por matéria:** só depois de A1–A5 e do descritor da matéria, com ensaio `--rapido` verde, Guard e annotation-safety, e **flag próprio** (nunca em lote).

## Como reproduzir

```bash
NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/inventario.cjs                 # checkpoint A (todas) ou … <slug>
NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/ensaio.cjs <slug> [--rapido]  # «como está»
NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/ensaio.cjs <slug> --corr      # «com correção» (C1/C2/C3 em memória)
node tools/qa/ensaio-layout/contrato.cjs && node tools/qa/ensaio-layout/matriz.cjs
```
