# Patches para a integração do layout + caneta nas outras matérias

> **Nenhum destes patches está na `main`.** A1–A4, A6 e C1–C7 estão **prontos em PRs pequenas, em draft e sem merge** (§D: #486, #487, #488, #489). A7 e C8 (motor da caneta) ficam para depois da #484. O ensaio os aplica **em memória** — ou, apontado para o código de uma PR, reconhece que a correção já está lá (servidor local do harness, `tools/qa/ensaio-layout/lib.cjs` → `ADAPTACOES`) para medir o efeito. Resultados: `MATRIZ.md` (layout/índice/modos, variantes «como está» e «com correção») e `INTERACAO.md` (uso: caneta, palma, goma, pinça, recarregar, questões, flashcards, audiobook).
> **Linhas conferidas contra a `main` `d51cd1f4`/`9cff8ca0`** (com #470 e #479 mescladas; caneta `456e` aprovada por José no iPad em 11/10). Se a `main` mudar, o ensaio avisa: cada adaptação que não encontra o trecho exato é registrada como `<ID>:NAO-ENCONTRADA` no JSON da matéria, em vez de rodar com patch falso.
> **Nada aqui ativa matéria nenhuma.** A ativação continua decidida pelo servidor (`get-pilot-flags`), fail-closed, uma matéria por vez, por ordem de José.

## A · Amarras ao slug do piloto (sem elas o layout e a caneta física não rodam fora de Semiología II)

| ID | Arquivo:linha (`d51cd1f4`) | Hoje | Proposta | No ensaio |
|---|---|---|---|---|
| **A1** | `assets/rm-layout.js:39` | `var SLUG = 'semiologia-ii';` | `RMLayout.attach(tab, slug)` recebe o slug (como `RMSistema.attach` e `RMNav.attach`) | em memória (slug de `window.__RM_ENSAIO`) |
| **A2** | `assets/rm-materia-sistema.css:71` | `html.rm-sis[data-rm-tema="semiologia-ii"] {` | variáveis de paleta por tema, com fallback `html.rm-sis` | em memória (mesma paleta para todos: testa componentes, não identidade) |
| **A3** | `assets/rm-materia-sistema.js:61` (`TEMAS`) e `:652-653` (`sin tema`) | só existe `TEMAS['semiologia-ii']` | `RMSistema.registrarTema(slug, descritor)`; matéria sem descritor aprovado = layout desligado | **hipótese técnica**: o ativador infere o descritor do DOM; **não é identidade visual aprovada** |
| **A4** | `assets/rm-audio-boot.js:38-39` | `SLUG`, `TAB_ID` fixos | `start({ slug, tab })`; manifesto pedido por esse slug | **PR #489** (em draft): `start()` sem argumentos = piloto; `start({ slug, tab })` = outra matéria; testes 15/15 no navegador |
| **A5** | `assets/rm-pilot.js:33`, `:69`, `:77`, `:80`, `:140` | `SLUG` fixo; `j.slug === SLUG && j.layout === true`; `pen` idem | o servidor devolve a lista de slugs liberados (layout/visual/pen por slug); fail-closed se ausente/erro | não (o ensaio usa ativador próprio; flags e contas intocadas) |
| **A6** | `netlify/functions/_audio/lib.js:32`, `:53`, `:59` (`PILOT_SLUG`) | manifesto/URL assinada só do piloto | manifesto por slug liberado no servidor, mantendo validação de `audio_id`, campos públicos e falha fechada | **PR #489** (em draft): `RM_AUDIO_SLUGS` (ausente = só o piloto); testes 19/19 no servidor |
| **A7** *(novo)* | `assets/rm-tools-v2.js:77` (`PILOT_SLUGS`) e `:85-86` (`pilotoPermitido`) | `['semiologia-ii']`: a guarda de palma, o adaptador de toque e o `touch-action` da goma (o que José aprovou) só ligam no piloto | `PILOT_SLUGS` = slugs com `pen:true` vindos do servidor (A5); a conta continua exigida (`JOSE_UID` ou `pen` liberado pelo servidor) | em memória: inclui o slug ensaiado; a conta simulada é a do piloto (constante pública do código) |

## C · Correções do que o ensaio mediu (todas verificadas em memória na variante «com correção»; C1–C8)

| ID | Arquivo:linha | Problema medido | Patch (exatamente o do ensaio, `lib.cjs`) | Efeito medido |
|---|---|---|---|---|
| **C1** | `assets/rm-materia-nav.js:90` | agregadora reconhecida só pelo id (`/banco\|flashcards/i`): falha em 16 matérias | `REUNE` aceita também `data-rm-agrega` (o descritor/HTML o declara) | capa e modos deixam de somar a cópia |
| **C2** | `assets/rm-layout.js:472` | idem na contagem da capa | idem | idem |
| **C3** | `assets/rm-materia-sistema.js` + `.css` (#487) | hero/banner/seção sem id fora de `section[id]` aparecem **em todo bloco** (e o banner abaixo do índice) | **classificar** cada filho solto (`data-rm-solto`): abertura/fecho/conteúdo ficam no índice geral, o anexo (texto entre blocos, p.ex. banner «Repaso General · Simulacro») só com o bloco dele; nada escondido sem navegação. A 1.ª versão escondia tudo e tirava do aluno o hero, o banner e as 20 questões da seção sem id da AP Práctica — inventário em `CONTEUDO-SOLTO.md` | `sem-residuo`, `preserva-conteudo-solto`, `anexo-com-seu-bloco` passam; `soltos.test` 16/16 |
| **C4** *(aplicado agora)* | `assets/rm-materia-sistema.js:144` | seção sem `<h2>` direto (Anatopatología I `analise-guia`, título num `div.rm-guide-h2`) fica sem título; `preencherLink` (`rm-materia-nav.js:437`) esconde o vizinho e quebra Anterior/Próximo | título de reserva = 1.º cabeçalho visual da seção (`:scope > [class$="-h2"]`, `h3`, `.analysis-card > h3`), depois o marcador | `pager-cadeia` e `pager` passam em Anatopatología I |
| **C5** *(aplicado agora)* | `assets/rm-layout.js:473-485` (`recursosDaMateria`) | capa conta nós do DOM: soma questões/cartões repetidos entre blocos (Farmaco I, Fisio I, Semio I, AP/Histo/Guaraní) e omite os que só existem no banco (Med. Familiar, Semio II) | contar itens **distintos** em toda a matéria, banco incluído; nova função `distintosDaMateria`. Questão = enunciado + **conjunto** de alternativas (sem ordem e sem o rótulo «A)»/«1)»); cartão = frente. A 1.ª versão comparava as alternativas na ordem e contava em dobro as cópias do banco reordenadas pela 8-A.7 (AP I: 478 em vez de 359) — corrigida e reexecutada | as 12 falhas de contagem somem; o número da capa = o que o aluno realmente encontra |
| **C6** *(aplicado agora)* | `assets/rm-materia-nav.js:345` (`isolar`) | infografía «Cómo leer…» (e a nota que a explica) no **início** de `.quiz-section` aparece no modo Preguntas (AP I, Farmaco I, Fisio I, Semio I) | no modo Preguntas, marcar `data-rm-off` só na **figura** (e na `rmc-note` logo depois dela) que vem antes do 1.º `h3/h4`/questão de cada `.quiz-section`; subtítulos e instruções do grupo ficam (1.ª versão escondia tudo antes do título — corrigida na #488) | `paginas-preguntas` passa; o modo Infografías continua mostrando a figura |
| **C7** *(achado nesta rodada)* | `assets/rm-materia-nav.js:340` (`isolar` → `visitar`) | recurso dentro de `<details>` fechado: o isolamento mantém o recurso e o caminho até ele, mas esconde o `<summary>` — o aluno vê o bloco e **não tem o que tocar**. Anatomía I: as 66 caixas «📝 Preguntas · Bloque NN» (`details.a1-qbox`) somem no modo Preguntas; Anatopatología Práctica: os 9 mazos «🎴 Flashcards del bloque» (`details.fc-block`) somem no modo Flashcards. A medição anterior não via: o conteúdo de um `<details>` fechado tem caixa > 0 mas não é pintado | o `<summary>` de um `<details>` que está no caminho do recurso fica visível (`c.tagName === 'SUMMARY' && pai.tagName === 'DETAILS' && path.indexOf(pai) !== -1`) | `paginas-preguntas` (Anatomía I) e `paginas-flashcards` (AP Práctica) passam; a bateria de interação abre o summary e responde/joga |
| **C8** *(achado nesta rodada; motor da caneta)* | `assets/rm-tools-v2.js:3808` (ouvintes de reflow, junto do `resize`/`visibilitychange`) | cartões com `:hover { transform: translateY(-3px) }` — **globais** em `styles.css` (`.pattern-card`, `.recep-card`, `.video-grid-2 .v-item`…) — sobem sob a caneta que paira ou o dedo que toca; a tinta é posicionada contra a caixa levantada e, quando o cartão desce, fica ~3 px fora. Transformação não muda tamanho, então o `ResizeObserver` (`:1299`) não dispara; só um `reposicionar()` manual realinhava. Medido em Imagenología (escrevendo dentro de `.pattern-card`) | `transitionend` de `transform` dentro de `#materias-container` → `reflow()` (o mesmo reposicionamento com debounce do `resize`). **Não toca estilo nenhum do conteúdo.** Uma 1.ª versão que anulava `transform` no `:hover` foi **descartada**: desfazia a rotação de repouso dos post-its de margem (`.rmc-margin`) e criava o desvio em Medicina Familiar e Semiología I | com C8: `traco-antigo-preso` passa nas 27; sem C8 (`RM_ENSAIO_SEM=C8`, `interacao-controle-sem-c8/`): Δy −3 → +2,9 px, ainda +2,9 px após 1,2 s, e só realinha com `reposicionar()` manual |

**Editorial recomendado (não feito aqui):** C5 e C6 corrigem o que o aluno vê, mas a causa é de conteúdo — questões/cartões repetidos entre blocos (8-A.1), itens que vivem só no banco (8-A.3) e infografías do resumo guardadas dentro do contêiner de questões (G0: o resumo ensina antes de a questão cobrar). Cada uma é decisão por matéria, nas revisões G0 + 8-A, nunca em massa.

## D · Passos de integração (PRs pequenas; nenhuma liga matéria)

**Escopo:** 25 matérias elegíveis (as 27 do catálogo menos Imagenología, fora por decisão de José, e Semiología II, o piloto que já funciona no site). Bioestadística não está no catálogo.

| # | PR | Arquivos | Correções | Estado | Efeito em produção |
|---|---|---|---|---|---|
| 1 | Repassomed/Repasso-Med-Site#486 | `rm-layout.js` (+ `cover`/`sistema` test) | A1, C2, C5 | **mesclada** na `main` | nenhum fora do piloto; no piloto capa Flashcards 172 → 184 |
| 2 | Repassomed/Repasso-Med-Site#487 | `rm-materia-sistema.js/.css` | A2, A3, C3, C4 | **draft, pronta** (C3 refeita: classifica em vez de esconder) | nenhum fora do piloto; no piloto **nenhum** (o `.s2-hero` segue no índice geral e fora dos blocos, como hoje) |
| 3 | Repassomed/Repasso-Med-Site#488 | `rm-materia-nav.js` | C1, C6, C7 | **mesclada** na `main` | nenhum (nada medido no piloto) |
| 4 | Repassomed/Repasso-Med-Site#489 | `rm-audio-boot.js`, `_audio/lib.js` (+ testes) | A4, A6 | **draft, pronta** | nenhum: sem `RM_AUDIO_SLUGS` o servidor é idêntico ao de hoje |
| 5 | caneta (depois da #484) | `rm-tools-v2.js` | A7, C8 | **adiada**: Claude 1 trabalha no motor na #484 | — |
| 6 | versão dos módulos (depois da #484) | `rm-pilot.js` (`VER`) + tag no `index.html` | cache | **adiada**: `index.html` está na #484 | navegadores buscam os módulos novos na hora |
| 7 | ativação por matéria (decisão de José) | `rm-pilot.js` + `get-pilot-flags.js` | A5 | não iniciada | lista de matérias vinda do servidor; vazia = como hoje |
| 8 | descritor aprovado de **uma** matéria | tema + `data-rm-agrega`/`<h2>` no HTML | — | por matéria | nenhum até o passo 9 |
| 9 | liberar essa matéria só para a conta de José | configuração do servidor | — | por matéria | roteiro físico de 3 min; repetir 8–9 |

**Prova de que as PRs 1–3 entregam o que o ensaio simulava:** o ensaio da #485 agora reconhece cada correção já presente no código (`<ID>:NO-CODIGO`) e deixa de simulá-la. Rodando contra o código das três PRs juntas (`RM_ENSAIO_REF=<commit>`), todas as correções de layout vêm do código; só A7/C8 (caneta) continuam simuladas. Resultado em `PENDENCIAS-ENSAIO-GLOBAL.md` §0-C.

**Passos 1–4 são independentes entre si** (arquivos distintos, sem dependência de ordem). Cada um volta com `git revert`.

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
