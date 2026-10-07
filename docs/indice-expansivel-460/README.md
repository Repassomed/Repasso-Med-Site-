# Índice central expansível por bloco e subtítulo · piloto Semiología II (issue #460)

> Estado: 🔵 AGUARDANDO AUDITORIA CHATGPT · **sem merge** · atrás das flags atuais do piloto (`layout` + `visual` do servidor, só `semiologia-ii`).
> **A escolha visual precisa do teste de José** (aparência de «página de caderno», densidade, ordem dos temas, rótulos). Os testes abaixo provam comportamento, acessibilidade e segurança; não provam que o resultado é o desejado.

## O que muda para o aluno (capa da matéria)

- O card central de um bloco (10 dos 14 cards) **não abre mais o bloco na hora**: ele **expande ali mesmo**, como uma aba de caderno ligada ao card (cor da unidade, entalhe apontando para o card, papel pautado).
- Dentro do painel:
  - o comando separado e destacado **«Empezar por el inicio del bloque»** (abre o bloco no começo; texto em castelhano porque é voltado ao aluno — a issue o chama «Começar pelo início do bloco»);
  - **minicards com os subtítulos reais** do bloco, na ordem do conteúdo (marcador numerado ou o ícone clínico que o próprio título já tem; cor da unidade; alvo ≥ 44 px);
  - os subtítulos de nível 4 aparecem como linhas discretas sob o seu título (até 4; «Ver N temas más» para o resto).
- Clicar num subtítulo abre **só aquele bloco** e posiciona a leitura no título (reuso de `RMNav.irParaAlvo`).
- **Um painel por vez.** Esc fecha e devolve o foco ao card. Os outros cards descem com transição de ~220 ms (altura/opacidade, sem giro/salto); `prefers-reduced-motion` = instantâneo. O card clicado não sai da tela; sem salto de rolagem.
- **Guía de estudio, tablas, banco e flashcards** (4 cards) seguem como links diretos: nenhum subtítulo inventado.

## Como foi feito (e o que não foi tocado)

| Peça | Arquivo | Natureza |
|---|---|---|
| Módulo `RMIndice` | `assets/rm-materia-indice.js` | **novo**, inerte sem `attach()` |
| Estilo | `assets/rm-materia-indice.css` | **novo**, tudo sob `.rm-ix-*` / `[data-rm-ix-open]` |
| Ligação | `assets/rm-pilot.js` (+ tag `?v=` no `index.html`) | 3 pontos pequenos, fail-closed; o diff exato está em `PATCH-INTEGRACAO-rm-pilot.diff` |
| QA | `tools/qa/indice-expansivel-460/**` e 2 ganchos em `tools/qa/ensaio-layout/{ativar.js,lib.cjs}` | só testes |
| Teste existente atualizado | `tools/qa/browser-qa/layout/nav-sistema.test.cjs` | o card agora expande; o teste abre o bloco pelo comando «Empezar…» |

- **Subtítulos derivados do HTML real** em cada `attach` (`RMIndice.subtitulos(secao)`), sem lista manual: só `<h3>/<h4>` filhos diretos da seção, fora de UI `[data-rm-ui]`, fora de quiz/flashcards/mazo/ruleta/banco/«Cómo estudiar» etc. (`subtitulos-derivados.json`: 6/2/2/3/3/7/6/5… subtítulos por bloco).
- **Só UI marcada `data-rm-ui`** é criada. Conteúdo didático não é movido, duplicado nem renomeado: o QA compara o HTML didático (sem `[data-rm-ui]`) antes/depois, IDs e âncoras da caneta idênticos; `detach()` devolve os 14 `<a>` originais.
- **Troca `<a>` → `<button>`** (semântica correta: expande, não navega; `aria-expanded`/`aria-controls`). Sem o módulo, o card volta a ser o `<a>` de hoje.
- **Navegação reaproveitada**: abrir bloco/subtítulo = `RMNav.irParaAlvo` (hash, Back/Forward, lateral, modos isolados e foco continuam do #453).

## Coordenação (#67 / #456)

A reserva #460 foi registrada na #67 (comentário 6045457401). Os arquivos da caneta (#456) eram os mesmos que a integração precisa; por isso o trabalho começou **isolado** (arquivos novos + diff). A #461 (caneta) foi **mesclada na `main`** durante esta tarefa e liberou a reserva (comentário do Claude 2 na #67; ela tocou `rm-materia-sistema.js/css`, `rm-audio.css` e **não** `rm-pilot.js`). A `main` foi incorporada a esta branch, o diff foi aplicado a `rm-pilot.js` e **toda a bateria foi reexecutada** contra a `main` com a caneta nova.

## Evidências

| Bateria | Resultado |
|---|---|
| `tools/qa/indice-expansivel-460/qa.cjs` (derivação, mouse, teclado, toque, 320/390/768/1024/1440, zoom 200%, movimento reduzido, lista longa, conteúdo intacto, lateral/modos/links diretos/Back-Forward, caneta sintética) | **142/142** |
| `…/qa-piloto.cjs` (pilot **real**: flags on/off, outra matéria, 500/404/attach que lança, rollback, player de áudio tocando em 390 e 1440, caneta V2 com tinta semeada) | **51/51** |
| Suítes existentes do piloto (`browser-qa/layout`): `layout` 535/535 · `player-sistema` 275/275 · `player-toolbox` 495/495 · `race` 140/140 · `ink-jump` 54/54 · `cover` 198/198 · `sistema` 124/124 · `pilot-flags` 10/10 · `nav-sistema` 216/216 (após adaptar o clique do card) | verdes |
| `caneta-novo-layout.test.cjs` | **89/91**: 2 falhas «layout · postit · rápido/longo» — **idênticas com o `rm-pilot.js` original da `main`** (testado com o pilot revertido): não vêm desta PR; o relato é do Claude 2 (#456) |

Capturas (antes/depois): `capturas/antes-*` e `capturas/depois-*` (1440 e 390 recolhido/expandido, outra fileira, meio da animação, movimento reduzido, subtítulo escolhido, 320/768/1024, toque, zoom 200%, lista longa).

## Riscos e limitações (leia antes de aprovar)

1. **Decisão visual é de José.** Pontos a olhar: o painel em 2 colunas intercalando linhas de subtítulos de nível 4; o rótulo «Ver N temas más»; a quantidade de texto em blocos com 7 temas.
2. **Idioma do comando**: em castelhano («Empezar por el inicio del bloque»), por ser texto de aluno; a issue o escreveu em português.
3. **Caneta**: testada com **traço sintético** (pointer events no Chromium) e tinta semeada; **não** valida o atraso/perda de traço reais nem o teste físico. A expansão não grava nada (0 escritas).
4. **Só Chromium/Playwright**; sem iOS/Safari real, sem toque físico (toque emulado), zoom 200% emulado por viewport/2.
5. **Achado em `app-core.js`** (fora de escopo, não alterado): `tipoSub` classifica como quiz qualquer título com `/examen/` — «Examen físico…» (b02, b06, b08, b10) fica de fora da lista de subtítulos de `RMLayout`. O módulo usa regra própria (operacional = título que *começa* por pregunta/cuestionario/banco/flashcard/mazo/tarjetas/ruleta), então esses H3 aparecem no painel.
6. Mexe em `rm-pilot.js` e na tag `?v=` do `index.html` (áreas críticas): 3 pontos pequenos, fail-closed, no caminho já atrás de `visual === true`. Cache de 7 dias é invalidado pela tag.
7. Sem UID, Supabase, SQL, pagamentos ou auth alterados. Outras matérias: 0 requisições ao módulo (testado em Biología).
8. O `?v=` do `rm-pilot.js` foi para `2026100802` (e o `VER` interno); outro Claude que mexa nos mesmos 2 literais terá conflito trivial.

## Rollback

- Instantâneo, sem deploy: o servidor desliga `visual` (o módulo nem é baixado) — o índice volta ao de hoje.
- Por código: reverter o diff `PATCH-INTEGRACAO-rm-pilot.diff` (`git apply -R`) e a tag `?v=`; os 2 arquivos `rm-materia-indice.*` ficam órfãos e inofensivos. `qa-piloto.cjs` (seção A2) prova que o pilot original ⇒ cards abrem o bloco direto.
- Falha em tempo de execução: módulo 404 / `attach` lançando ⇒ `detach()` e os cards continuam `<a>` que abrem o bloco (seção B do `qa-piloto.cjs`).

## Reproduzir

```bash
export NODE_PATH=$(npm root -g)
node tools/qa/indice-expansivel-460/qa.cjs            # isolado (~4 min; --rapido para a versão curta)
node tools/qa/indice-expansivel-460/qa-piloto.cjs     # pilot real (precisa de patch no PATH)
node tools/qa/indice-expansivel-460/capturas.cjs      # antes/depois
```

(`ffmpeg` não é necessário aqui; as suítes antigas de player precisam de `ffmpeg` ou de `RM_FFMPEG` apontando para um gerador de áudio.)

## Auditoria

🔵 **AGUARDANDO AUDITORIA CHATGPT.** Não fazer merge antes do parecer e do teste visual de José.
