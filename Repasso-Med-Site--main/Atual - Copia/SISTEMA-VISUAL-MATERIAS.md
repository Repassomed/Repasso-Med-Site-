# Sistema visual de matérias (piloto: Semiología II)

Implementação do piloto visual aprovado pelo Design (`design-sistema/`: GUIA-SISTEMA, tokens, BRIEF-ILUSTRACIONES, GUIA-IMPLEMENTACION do piloto).
**Só aparência.** HTML, ids, âncoras e scripts de cada matéria não mudam.

## Quem vê
Só a conta piloto, só em `semiologia-ii`. É uma CAMADA sobre o Layout V2:

1. `rm-pilot.js` pergunta a `get-pilot-flags` (por UID autenticado) → `{ layout, visual }`;
2. com `layout` anexa o Layout V2 (como antes); **só se também `visual === true`** carrega `rm-materia-sistema.css/js`;
3. falha fechada: sem `visual`, erro de rede ou erro de `attach()` ⇒ nada do sistema entra (o layout fica como estava).

**`visual` é negado por padrão.** Só vale para quem tem `layout` **e** está em `RM_PILOT_VISUAL_UIDS` (lista própria, obrigatória: variável
ausente ou vazia ⇒ ninguém vê o tema; ele **não** herda a lista do layout). Para ver o tema **depois do merge**: configurar no Netlify
`RM_PILOT_VISUAL_UIDS=<UID de José>` (o UID nunca entra no repositório). Sem a variável, o tema fica desligado e o site/Layout V2 seguem como hoje. Kill switch só do tema: remover/esvaziar a variável (o Layout V2 continua).
Teste: `tools/qa/browser-qa/layout/pilot-flags.test.cjs`.

## Arquivos
| arquivo | papel |
|---|---|
| `assets/rm-materia-sistema.css` | tokens + tema + 8 componentes; toda regra começa em `html.rm-sis` |
| `assets/rm-materia-sistema.js` | lê dados reais do DOM, marca capítulos, monta a UI derivada (`[data-rm-ui]`), `attach/detach` |
| `assets/rm-materia-nav.js` | **navegação por índice geral · bloco · modos isolados** (issue #453) — `window.RMNav`; só existe com o tema; `attach/detach` |
| `assets/img/semio2/vig/vb-00…10.webp` | vinhetas/medalhões aprovados (recortes de infografías, 480 px, WebP) |
| `tools/qa/browser-qa/layout/sistema.test.cjs` · `pilot-flags.test.cjs` | falha fechada, conteúdo intacto, contagens, detach, funções, geometria, cabeçalho compacto · gate do servidor |
| `tools/qa/browser-qa/layout/capturas-sistema.cjs` | capturas desktop/tablet/celular |
| `tools/qa/browser-qa/layout/nav-sistema.test.cjs` · `capturas-navegacion.cjs` | navegação, modos, caneta, áudio, geometria · capturas antes/depois e A × B do player |

## Estrutura do CSS
`1 constantes` (header, papel, tipografias, recursos C3, notas P4, correto/incorreto) · `2 tema` (só variáveis:
`--rm-surface/--rm-side/--rm-accent/--rm-marker/--rm-pal-1…6(+tons)/--rm-tag-radius/--rm-vig-radius`) ·
`3 [data-rm-cap]` → `--cap-*` locais · `4…14` componentes C-header, C-02 lateral, C-01 capa/C3/índice, C-03 título de bloco,
C-04 resumo, C-05 tabela, C-06 pergunta, C-07 notas P4, C-08 infografia/recursos.
Nenhum componente tem cor própria de matéria: todos leem `--cap-*` e as constantes.

## Como criar a próxima matéria (sem mexer nos componentes)
1. CSS: copiar o bloco `html.rm-sis[data-rm-tema="semiologia-ii"]` (§2), trocar o slug e as 6 cores (+ tons derivados), superfície, lateral, marcador, raios.
2. JS: nova entrada em `TEMAS` (unidades/agrupamento, medalhões, vinhetas, `clasificar(id)` se os ids de seção forem diferentes).
3. Liberar o slug em `rm-pilot.js` e `get-pilot-flags.js` (hoje fixos em `semiologia-ii`) e subir `VER`/a tag em `index.html`.
4. Registrar o tema em `design-sistema/tokens-materias.json`.

## Dados reais (nada digitado)
Contagens de preguntas/tarjetas/infografías/tablas/sonidos vêm do DOM (capa, meta de cada bloco, índice, selo do resumo de preguntas).
Preguntas = só dos blocos (o banco geral repete as mesmas: não se soma). Infografía = `<figure>` com legenda e imagem (mesma regra do Layout V2).

## Contrato com o conteúdo
Em conteúdo só entram atributos `data-rm-cap/-tipo/-cmp/-cc/-label/-n/-tema` e a classe `rm-sis-s` na aba (todos removidos no `detach`).
Toda UI derivada leva `[data-rm-ui]` (fora do índice de marca-texto e das âncoras da tinta) e nunca cria `p/li/h1–h5/table/figure/blockquote`.

## «Sair» (logout) no piloto
O botão flutuante verde do site (`#logout-fab`, canto inferior direito) cobria a leitura no celular. No piloto ele fica oculto (CSS) e o mesmo controle
passa a viver na faixa fixa (`.rm-sis-out`, alvo ≥ 44 px, só ícone abaixo de 480 px); o clique é **delegado** ao `#logout-fab` original, que continua no DOM.
Fora do piloto nada muda. Teste: `sistema.test.cjs` §9–10 (320/390/768/1440, 6 paradas de rolagem, gaveta do índice, caneta armada).

## Ferramentas de estudio (caneta) no celular (< 768 px, só no piloto)
A maleta flutuante (`#rm2-fab`) e o trilho vertical da V2 ficavam sobre tabelas e notas. No piloto, abaixo de 768 px: o controle vira o botão «Herramientas»
da faixa fixa (`.rm-sis-tools`, ≥ 44 px, anel dourado quando há ferramenta armada), que **delega o clique ao `#rm2-fab` original** (oculto); a toolbox abre como uma
**barra horizontal encostada embaixo** (rolável de lado) e o conteúdo ganha espaço reservado (`--rm-dock-h`, medido pelo JS). O motor da caneta (traço, goma, gravação,
âncoras, estado armado, abrir/fechar) é o original e não foi alterado; o botão da faixa só impede que o próprio toque seja tratado como «clique fora» (que minimizaria
a toolbox e a reabriria em seguida). Em ≤ 440 px o botão «Materias» (voltar ao topo) sai da faixa para dar espaço — «Volver arriba» continua na gaveta do índice.
Em ≥ 768 px nada muda (a raia direita já é reservada pelo layout).

## Navegação por índice geral, bloco e modos isolados (issue #453)
Só aparência/navegação — **os nós da matéria não saem do lugar**: cada `section` original, os IDs, `block_id`, anotações, highlights, post-its, traços e o estado das questões
ficam onde estão; o que muda é **qual parte está visível** (atributos no `<html>` e `display:none` por CSS ⇒ o conteúdo oculto sai do foco e da leitura de tela).

| estado (`html[data-rm-nav]`) | o que aparece | URL |
|---|---|---|
| `index` | capa + recursos + **índice geral** em cards por unidade (título curto + descrição + contagens lidas do DOM; altura uniforme). Nenhum bloco abaixo. | sem hash |
| `block` | **só o bloco escolhido** + «Índice general» (topo) e `Bloque anterior · Volver al índice general · Bloque siguiente` (fim) | `#s2-b03` · `#s2-b03-s2` (subtítulo) |
| `modeidx` | índice de blocos **que têm aquele recurso**, com contagens reais (`N preguntas · 17 de examen · 11 complementarias`, `N infografías`, `N tarjetas`, `N audiolibro`, `N sonidos`) | `#modo/preguntas` |
| `modeblk` | **só o recurso daquele tipo naquele bloco**, com `Anterior · modo`, `Volver a modo`, `Siguiente · modo` (só entre blocos que têm o recurso) | `#modo/preguntas/s2-b03` |

- **Uma fonte de estado:** `RMModes` (já existente) ganhou o eixo `block` (+ `nav`); `RMNav` só desenha e cuida de histórico/rolagem/foco. Back/Forward restauram estado e rolagem
  (`history.scrollRestoration = 'manual'` enquanto a navegação está ligada; devolvido no `detach`). Hashes com `=` (tokens de recuperação) não são tocados.
- **Lateral:** no alto, «Índice general» (volta à abertura de qualquer lugar; teclado e link direto) e logo abaixo os modos (grade compacta de 2 colunas, alvos ≥ 44 px): **Infografías · Preguntas · Flashcards · Audiolibros · Auscultación**
  (um modo só existe se há recurso real). **Audiolibros** depende de card real criado pelo manifesto autorizado (`.rm-audio-card`): sem card, sem modo/cartão/pílula/chip — e quando os cards chegam
  de forma assíncrona tudo aparece sozinho (chip «Audiolibro» na árvore só nos blocos com card; nunca se expõe bucket, URL assinada ou caminho). A seção final «Revisión reunida» da lateral
  (atalhos Banco/Todos flashcards) foi retirada **só da lateral**: Banco General e «Flashcards de todos los bloques» seguem no conteúdo e agora são cards do índice geral / do modo Flashcards.
- **Preguntas:** com metadado real (`.quiz-tag.basada`) cada bloco ganha os grupos «Basadas en preguntas de examen» / «Complementarias» (filtro por chips; o estado respondido da questão
  não se perde); sem metadado completo não há grupo inventado. O Banco General entra como revisão geral, **fora** da soma por bloco.
- **Flashcards:** lançador de cada bloco + «Todos los flashcards»; nenhum card/ID é duplicado. **Audiolibros:** o mesmo card/motor/player (posição guardada, um áudio por vez; trocar de bloco **não** para o áudio,
  sair da matéria/logout para). **Auscultación:** por bloco, com a arbitragem original (tocar um `<audio>` da matéria pausa o audiobook).
- **Caneta:** os SVGs de traço ficam `display:none` em toda tela em que a leitura contínua não está à vista (índice geral, índices e páginas de modo) e, no bloco, só o do bloco aberto aparece; voltam (mesma âncora, mesmo traço, sem nova escrita) ao reabrir o bloco; a navegação pede o reposicionamento pela API pública do layout. Modos isolados continuam
  desarmando a ferramenta (comportamento já existente do V2).
- **Ritmo dos subtítulos** (valores recomendados): `h3` com filete de 1 px (`rgba(16,36,61,.11)`), 46 px acima + 28 px de respiro (34 px no 1.º); `h4` 34 px acima; no celular 38/22 e 28 px; tabelas e post-its com `break-inside: avoid`; **sem** quebra de página forçada.
- **Tema desligado / outra matéria / outra conta:** nada disto existe (`RMNav` nem é carregado; o `detach` do tema desfaz classes, atributos, nós, estilos e a restauração de rolagem). Kill switch: `RM_PILOT_VISUAL_UIDS`.
- **Tradução do rótulo:** a interface do piloto está em castelhano; os links são «Bloque anterior / Bloque siguiente / Volver al índice general» (no texto da issue, «Próximo bloque»).

## Player do audiobook no piloto (só apresentação)
O motor de áudio (`rm-audio.js`, boot, manifesto, URLs assinadas, bucket, M4A) **não foi tocado**. O DOM do player (`#rm-l2-player`, `.rm-audio__*`, `data-a`, aria-labels)
e a medição automática de `--rm-player-h` / `--rm-audio-h` são os originais; o tema só muda CSS e espelha estado (atributos no `<html>`/slot) para o CSS.

**Card de entrada por bloco** (`.rm-audio-card`, destacado, paleta navy/dourado da matéria): disco de vinil no lugar do ícone, título real do manifesto, duração e «Escuchar / Continuar · m:ss». Só existe onde o manifesto autorizado criou o card.

**Player ativo = disco de vinil**, compacto e quase quadrado (o botão play/pausa **é** o disco; só gira tocando e respeita `prefers-reduced-motion`; CSS puro — nenhuma mídia/arte é carregada antes do play).

| onde | apresentação | `--rm-player-h` |
|---|---|---|
| desktop (lateral docked) **≥ 1430 px** — opção **A** | **card 204×231 no ALTO À DIREITA**, numa coluna reservada (a folha se recentra; a medida do texto — 780 px — se mantém). Abre já expandido. | **0** (modo `lateral` do motor) |
| desktop (lateral docked) **< 1430 px** — opção **B** | **quadrado 56×56 recolhido** no canto superior direito (a folha não se mexe); toque → expande o card (e só então reserva a coluna). Com a toolbox aberta, o painel dela passa a começar abaixo do quadrado (e o que não couber rola dentro do painel, como já fazia a V2). | **0** |
| desktop com altura < 540 px | a lateral/canto não comporta: barra compacta embaixo (como antes) | = altura medida |
| celular < 640 px | **barra pequena embaixo** (disco · título + tempo · ±15 · fechar); «ampliar» → card completo (seek, velocidade, reiniciar) | = altura medida (≈ 60 px) |
| celular com a toolbox aberta / caneta armada | recolhido (barra/chip); o áudio nunca pausa | ≈ 52–60 px |
| tablet / trilho (640–1199 px) | uma linha compacta (≤ 640 px) com todos os controles | = altura medida |

**A × B (medido, 1440 e 1280 px — `capturas-sistema/navegacion/player-ab/MEDIDAS-PLAYER.md`):** a coluna fixa só preserva a medida do texto quando sobra espaço (≥ 1430 px). Abaixo disso a coluna
reduziria a folha (1280 px: 949 → 733 px; parágrafo 780 → 649 px) — por isso o híbrido: **A onde cabe, B onde não cabe** (expansão sob demanda).

Como o player vai para o alto à direita sem mexer no motor: o tema põe `data-rm-dock-force="side"` no `<html>`; o `rm-layout.js` (ponto já tocado na #446, 3 linhas em `aplicarModo`) só honra o pedido
com a lateral docked e decide `data-rm-dock="side"`; o motor já sabia desenhar o modo «lateral» (e publica `--rm-player-h: 0`); o CSS do tema o posiciona `fixed` no alto à direita. Em trilho/gaveta vale a decisão original (barra embaixo).
O botão «ampliar» (`.rm-sis-aud-x`, UI derivada) é filho do slot; ao mudar de forma o tema pede `refreshLayout()` (API pública do motor, via `RMAudioBoot._engine()`) para que o motor re-meça a altura.
Alvos de toque ≥ 44 px em todos os controles (inclusive a altura do seek). Tudo parte de `html.rm-sis #rm-l2-player …` — **nenhum** seletor alcança a auscultação (os `<audio>` da matéria); isso é checado por teste estático.
Tema desligado ⇒ o player original, exatamente como hoje. Trocar de matéria ou sair da conta (`SIGNED_OUT`, inclusive pelo «Sair» da faixa) continua parando o áudio e desfazendo tudo.
Testes: `tools/qa/browser-qa/layout/player-sistema.test.cjs` (motor de áudio REAL; só o servidor é simulado) · capturas: `capturas-player.cjs`.
