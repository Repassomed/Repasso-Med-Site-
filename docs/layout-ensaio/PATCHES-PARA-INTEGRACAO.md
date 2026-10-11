# Patches para a integração do layout + caneta nas outras matérias

> **Nenhum destes patches foi aplicado ao disco.** O ensaio os aplica **em memória** (servidor local do harness, `tools/qa/ensaio-layout/lib.cjs` → `ADAPTACOES`) para medir o efeito. Resultados: `MATRIZ.md` (layout/índice/modos, variantes «como está» e «com correção») e `INTERACAO.md` (uso: caneta, palma, goma, pinça, recarregar, questões, flashcards, audiobook).
> **Linhas conferidas contra a `main` `d51cd1f4`** (com #470 e #479 mescladas; caneta `456e` aprovada por José no iPad em 11/10). Se a `main` mudar, o ensaio avisa: cada adaptação que não encontra o trecho exato é registrada como `<ID>:NAO-ENCONTRADA` no JSON da matéria, em vez de rodar com patch falso.
> **Nada aqui ativa matéria nenhuma.** A ativação continua decidida pelo servidor (`get-pilot-flags`), fail-closed, uma matéria por vez, por ordem de José.

## A · Amarras ao slug do piloto (sem elas o layout e a caneta física não rodam fora de Semiología II)

| ID | Arquivo:linha (`d51cd1f4`) | Hoje | Proposta | No ensaio |
|---|---|---|---|---|
| **A1** | `assets/rm-layout.js:39` | `var SLUG = 'semiologia-ii';` | `RMLayout.attach(tab, slug)` recebe o slug (como `RMSistema.attach` e `RMNav.attach`) | em memória (slug de `window.__RM_ENSAIO`) |
| **A2** | `assets/rm-materia-sistema.css:71` | `html.rm-sis[data-rm-tema="semiologia-ii"] {` | variáveis de paleta por tema, com fallback `html.rm-sis` | em memória (mesma paleta para todos: testa componentes, não identidade) |
| **A3** | `assets/rm-materia-sistema.js:61` (`TEMAS`) e `:652-653` (`sin tema`) | só existe `TEMAS['semiologia-ii']` | `RMSistema.registrarTema(slug, descritor)`; matéria sem descritor aprovado = layout desligado | **hipótese técnica**: o ativador infere o descritor do DOM; **não é identidade visual aprovada** |
| **A4** | `assets/rm-audio-boot.js:38-39` | `SLUG`, `TAB_ID` fixos | `start({ slug, tab })`; manifesto pedido por esse slug | **não aplicado**: o ensaio mede que, sem A4, o boot REAL fecha fora do piloto (0 card, 0 pedido) e cria cards só nos blocos do manifesto simulado da Semiología II |
| **A5** | `assets/rm-pilot.js:33`, `:69`, `:77`, `:80`, `:140` | `SLUG` fixo; `j.slug === SLUG && j.layout === true`; `pen` idem | o servidor devolve a lista de slugs liberados (layout/visual/pen por slug); fail-closed se ausente/erro | não (o ensaio usa ativador próprio; flags e contas intocadas) |
| **A6** | `netlify/functions/_audio/lib.js:32`, `:53`, `:59` (`PILOT_SLUG`) | manifesto/URL assinada só do piloto | manifesto por slug liberado no servidor, mantendo validação de `audio_id`, campos públicos e falha fechada | não (servidor fora do escopo do ensaio) |
| **A7** *(novo)* | `assets/rm-tools-v2.js:77` (`PILOT_SLUGS`) e `:85-86` (`pilotoPermitido`) | `['semiologia-ii']`: a guarda de palma, o adaptador de toque e o `touch-action` da goma (o que José aprovou) só ligam no piloto | `PILOT_SLUGS` = slugs com `pen:true` vindos do servidor (A5); a conta continua exigida (`JOSE_UID` ou `pen` liberado pelo servidor) | em memória: inclui o slug ensaiado; a conta simulada é a do piloto (constante pública do código) |

## C · Correções do que o ensaio mediu (todas verificadas em memória na variante «com correção»; C1–C8)

| ID | Arquivo:linha | Problema medido | Patch (exatamente o do ensaio, `lib.cjs`) | Efeito medido |
|---|---|---|---|---|
| **C1** | `assets/rm-materia-nav.js:90` | agregadora reconhecida só pelo id (`/banco\|flashcards/i`): falha em 16 matérias | `REUNE` aceita também `data-rm-agrega` (o descritor/HTML o declara) | capa e modos deixam de somar a cópia |
| **C2** | `assets/rm-layout.js:472` | idem na contagem da capa | idem | idem |
| **C3** | `assets/rm-materia-sistema.css` (ou `rm-materia-nav.js`) | hero/banner fora de `section[id]` visível abaixo do índice e acima do bloco | ocultar filhos da aba que não são `section[id]`/UI quando a navegação por bloco está ativa | `sem-residuo` passa nas 27 |
| **C4** *(aplicado agora)* | `assets/rm-materia-sistema.js:144` | seção sem `<h2>` direto (Anatopatología I `analise-guia`, título num `div.rm-guide-h2`) fica sem título; `preencherLink` (`rm-materia-nav.js:437`) esconde o vizinho e quebra Anterior/Próximo | título de reserva = 1.º cabeçalho visual da seção (`:scope > [class$="-h2"]`, `h3`, `.analysis-card > h3`), depois o marcador | `pager-cadeia` e `pager` passam em Anatopatología I |
| **C5** *(aplicado agora)* | `assets/rm-layout.js:473-485` (`recursosDaMateria`) | capa conta nós do DOM: soma questões/cartões repetidos entre blocos (Farmaco I, Fisio I, Semio I, AP/Histo/Guaraní) e omite os que só existem no banco (Med. Familiar, Semio II) | contar itens **distintos** em toda a matéria, banco incluído; nova função `distintosDaMateria`. Questão = enunciado + **conjunto** de alternativas (sem ordem e sem o rótulo «A)»/«1)»); cartão = frente. A 1.ª versão comparava as alternativas na ordem e contava em dobro as cópias do banco reordenadas pela 8-A.7 (AP I: 478 em vez de 359) — corrigida e reexecutada | as 12 falhas de contagem somem; o número da capa = o que o aluno realmente encontra |
| **C6** *(aplicado agora)* | `assets/rm-materia-nav.js:345` (`isolar`) | infografía «Cómo leer…» (e a nota que a explica) no **início** de `.quiz-section` aparece no modo Preguntas (AP I, Farmaco I, Fisio I, Semio I) | no modo Preguntas, marcar `data-rm-off` no que vem antes do 1.º `h3/h4`/questão de cada `.quiz-section` | `paginas-preguntas` passa; o modo Infografías continua mostrando a figura |
| **C7** *(achado nesta rodada)* | `assets/rm-materia-nav.js:340` (`isolar` → `visitar`) | recurso dentro de `<details>` fechado: o isolamento mantém o recurso e o caminho até ele, mas esconde o `<summary>` — o aluno vê o bloco e **não tem o que tocar**. Anatomía I: as 66 caixas «📝 Preguntas · Bloque NN» (`details.a1-qbox`) somem no modo Preguntas; Anatopatología Práctica: os 9 mazos «🎴 Flashcards del bloque» (`details.fc-block`) somem no modo Flashcards. A medição anterior não via: o conteúdo de um `<details>` fechado tem caixa > 0 mas não é pintado | o `<summary>` de um `<details>` que está no caminho do recurso fica visível (`c.tagName === 'SUMMARY' && pai.tagName === 'DETAILS' && path.indexOf(pai) !== -1`) | `paginas-preguntas` (Anatomía I) e `paginas-flashcards` (AP Práctica) passam; a bateria de interação abre o summary e responde/joga |
| **C8** *(achado nesta rodada; motor da caneta)* | `assets/rm-tools-v2.js:3808` (ouvintes de reflow, junto do `resize`/`visibilitychange`) | cartões com `:hover { transform: translateY(-3px) }` — **globais** em `styles.css` (`.pattern-card`, `.recep-card`, `.video-grid-2 .v-item`…) — sobem sob a caneta que paira ou o dedo que toca; a tinta é posicionada contra a caixa levantada e, quando o cartão desce, fica ~3 px fora. Transformação não muda tamanho, então o `ResizeObserver` (`:1299`) não dispara; só um `reposicionar()` manual realinhava. Medido em Imagenología (escrevendo dentro de `.pattern-card`) | `transitionend` de `transform` dentro de `#materias-container` → `reflow()` (o mesmo reposicionamento com debounce do `resize`). **Não toca estilo nenhum do conteúdo.** Uma 1.ª versão que anulava `transform` no `:hover` foi **descartada**: desfazia a rotação de repouso dos post-its de margem (`.rmc-margin`) e criava o desvio em Medicina Familiar e Semiología I | com C8: `traco-antigo-preso` passa nas 27; sem C8 (`RM_ENSAIO_SEM=C8`, `interacao-controle-sem-c8/`): Δy −3 → +2,9 px, ainda +2,9 px após 1,2 s, e só realinha com `reposicionar()` manual |

**Editorial recomendado (não feito aqui):** C5 e C6 corrigem o que o aluno vê, mas a causa é de conteúdo — questões/cartões repetidos entre blocos (8-A.1), itens que vivem só no banco (8-A.3) e infografías do resumo guardadas dentro do contêiner de questões (G0: o resumo ensina antes de a questão cobrar). Cada uma é decisão por matéria, nas revisões G0 + 8-A, nunca em massa.

## D · Passos de integração (propostos; nenhum executado)

Cada passo é **uma PR própria**, auditada, com a bateria verde **antes** do merge. Nenhum passo liga matéria: até o passo 5, o site em produção se comporta exatamente como hoje (só Semiología II, só as contas liberadas).

| # | PR | Arquivos | Prova antes do merge | Efeito em produção |
|---|---|---|---|---|
| 1 | A1 + A3 (`registrarTema`) + C1–C7 nos módulos | `rm-layout.js`, `rm-materia-sistema.js/css`, `rm-materia-nav.js` | ensaio «com correção» sem adaptação `C*`: `ensaio.cjs --corr` deve dar o mesmo resultado que hoje dá em memória; testes do piloto (`browser-qa/layout/{layout,cover,sistema,nav-sistema}.test.cjs`, `indice-expansivel-460/qa-piloto.cjs`) verdes | nenhum fora do piloto; no piloto, capa conta itens distintos (Semio II: Flashcards 172 → 184) |
| 2 | A7 + A5 (lista de slugs por flag no servidor) + C8 | `rm-tools-v2.js`, `rm-pilot.js`, `netlify/functions/get-pilot-flags.js` | `caneta-ipad-456/ipad.test.cjs` + `rolagem.cjs` + `browser-qa/layout/{pilot-flags,caneta-novo-layout}.test.cjs` verdes; `interacao.cjs` nas 27; servidor sem slug novo configurado = nada muda | C8 vale também no piloto (a tinta realinha ao fim de uma transição de transform): **reteste físico curto de José na Semiología II** antes de seguir; fora isso, nada (lista de slugs = só `semiologia-ii`) |
| 3 | A4 + A6 (áudio por slug) | `rm-audio-boot.js`, `netlify/functions/_audio/lib.js`, `get-audio-manifest.js` | testes do áudio (`browser-qa/audio-integracao/*.test.cjs`, `audio-server/server.test.cjs`) + `interacao.cjs` (presença/ausência) | nenhum (manifesto só do piloto) |
| 4 | Descritor aprovado de **uma** matéria | `rm-materia-sistema.js` (tema) + `data-rm-agrega`/`<h2>` no HTML da matéria | `ensaio.cjs <slug>` e `interacao.cjs <slug>` verdes nas 4 larguras; Guard; annotation-safety | nenhum até o passo 5 |
| 5 | Liberar essa matéria **para a conta de José** | só configuração do servidor (flag por slug) | roteiro físico de ≤ 3 min (`docs/caneta-ipad-456/PASSO-FINAL-JOSE.md`) nessa matéria | só José vê; repetir 4–5 por matéria |

## E · Reversão

| Situação | Como reverter | Tempo | Efeito colateral |
|---|---|---|---|
| Problema numa matéria liberada (passo 5) | tirar o slug da flag no servidor (`get-pilot-flags`) | imediato, sem deploy de código | nenhum: o `rm-pilot.js` é fail-closed e devolve o layout antigo; tinta/grifos/notas ficam no Supabase e reaparecem iguais (ancoragem por `section>índice`, a mesma nos dois layouts) |
| Problema num módulo (passos 1–3) | `git revert` do merge da PR; publicar | um deploy | nenhum dado tocado (os patches só mudam leitura/exibição; nenhuma migração, nenhuma tabela) |
| Caneta física regride numa matéria nova | tirar `pen` do slug no servidor (a caneta volta à regra legada só nela) | imediato | traços já gravados permanecem |
| Áudio | tirar o slug do manifesto do servidor | imediato | o card some; posição de escuta fica no navegador |

Nada nesta proposta cria tabela, coluna, política RLS, conta, pagamento ou permissão nova.

## F · Fora de escopo, mas registrado

- **Fonte externa:** `rm-materia-sistema.js:44` carrega a Literata do Google Fonts. Igual no piloto; o ensaio bloqueia toda rede externa e registra à parte. Em produção é uma requisição externa por aluno (política de privacidade/CSP: decisão de José).
- **Vídeos do YouTube** (`iframe`) não são exercitados (o ensaio não sai para a rede): tocar com a caneta sobre um vídeo incorporado só pode ser conferido em preview/aparelho.
- **Post-its do layout antigo (#464, pausada)**: não ensaiados aqui.

## Como reproduzir

```bash
export NODE_PATH=$(npm root -g)
node tools/qa/ensaio-layout/inventario.cjs                        # checkpoint A (todas) ou … <slug>
node tools/qa/ensaio-layout/ensaio.cjs [<slug>] [--rapido]        # «como está» (A1/A2/A7)
node tools/qa/ensaio-layout/ensaio.cjs [<slug>] --corr            # «com correção» (C1–C8 em memória)
node tools/qa/ensaio-layout/interacao.cjs [<slug>] [--rapido]     # uso (caneta CDP, palma, goma, pinça, recarregar, questões, flashcards, audiobook)
RM_ENSAIO_REF=ebc53dcd node tools/qa/ensaio-layout/interacao.cjs anatomia-patologica semiologia-ii --rapido   # controle negativo (build 456c reprovado)
RM_ENSAIO_SEM=C8 RM_LARGURAS=768,1440 node tools/qa/ensaio-layout/interacao.cjs imagenologia            # controle sem C8 (tinta 3 px fora)
node tools/qa/ensaio-layout/compactar.cjs && node tools/qa/ensaio-layout/matriz.cjs && node tools/qa/ensaio-layout/interacao-md.cjs
node tools/qa/ensaio-layout/contrato.teste.cjs && node tools/qa/ensaio-layout/contrato.cjs && node tools/qa/ensaio-layout/inventario-md.cjs
```
