# Contrato de novos recursos · Checkpoint C · issue #457

> **Status:** proposta para auditoria (ChatGPT / José). **Nada disto está ativo em produção.** Nenhum arquivo reservado foi alterado; as mudanças que exigem `rm-*.js`, `get-materia.js` ou `index.html` estão em `PATCHES-PARA-INTEGRACAO.md`, para entrar depois da PR da caneta (#456).
> Todo texto que o aluno vê continua em castelhano simples; este documento é para a equipe e fica em português.

## 0 · O problema que o contrato resolve (medido, não suposto)

O inventário real das 27 matérias (`INVENTARIO.md`) e o ensaio visual (`MATRIZ.md`) mostram três fontes de erro de contagem, todas **editoriais, não do layout**:

1. **Os números aparecem escritos à mão** na portada («179 preguntas», «335 flashcards», «34 infografías»…). Medido com a regra R5 (cada número da portada × contagem **canônica** do recurso): de 39 números declarados com recurso verificável, 28 batem, **7 divergem** (4 deles só coincidem com o total do DOM com cópias) e 4 são **indeterminados** (a matéria não tem marcador nem convenção para contar os blocos).
2. **O DOM soma cópias.** Cada matéria guarda os mesmos itens duas vezes (no bloco e no banco geral / "revisión" / "mazo" / "cierre"): 10 106 `.quiz-item` no DOM para 5 365–5 609 questões distintas; 17 735 `.flashcard` para 7 043 distintos.
3. **A cópia é reconhecida pelo `id` da seção** (`/banco|flashcards/i`), e os ids das 27 matérias não seguem convenção. Onde o id não casa (`revisaoneu`, `anecierre`, `dermcierre`, `toxcierre`, `oftcierre`, `h2pmazo`, `mazognrl`, `revisaofp2`…), a capa mostraria o dobro ou o triplo.

**Regra-mãe (alvo):** *um recurso tem uma fonte da verdade; toda contagem é derivada dela; nenhuma pessoa digita um número que o conteúdo já determina.*

### Duas fases — leia antes de qualquer seção

| | **Fase 1 · marcar e validar** (o que esta proposta entrega) | **Fase 2 · agregadora vira vista** (futura, PR e auditoria próprias) |
|---|---|---|
| Conteúdo das matérias | **não muda de estrutura**: só entram atributos `data-rm-*` | a agregadora (banco geral, «revisión», «mazo», «cierre») deixa de guardar cópias |
| Pergunta nova | escrever no bloco **e fazer a cópia física no Banco General** (nas matérias que têm banco), com `data-rm-copia-de`; corpo e Banco continuam espelhados à mão, como hoje (8-A.3) | escrever **uma vez**, no bloco |
| Número da portada | **continua sendo conferido por pessoa**: o validador acusa a divergência, e quem edita corrige o número (ou adota `data-rm-count`, edição de conteúdo por matéria) | sempre derivado |
| Contagem de capa/índice/modos | derivada pelo módulo dos ids canônicos fora de agregadoras (depende de C1/C2/C5 e dos marcadores) | idem |
| Âncoras da caneta/notas | **intactas** (nenhum nó muda) | exigem **migração segura** das âncoras (mapa antigo→novo, prova de que nenhum traço/nota/grifo se perde) |

**A promessa «escreva só uma vez no bloco» pertence exclusivamente à Fase 2.** Na Fase 1 o fluxo editorial de hoje (bloco + cópia no Banco + conferência do número) **continua obrigatório**; o ganho da Fase 1 é que o validador e o módulo deixam de depender de regex de id e de número digitado sem conferência.

## 1 · Uma fonte da verdade por recurso

| Recurso | Fonte da verdade (onde se escreve) | O que é derivado (nunca digitado) | Cópias permitidas |
|---|---|---|---|
| **Pergunta** | o `.quiz-item` **dentro do bloco que a ensina**, com `id` estável (`q-<prefixo><NNN>`) | contagem do bloco, da capa, do modo Preguntas, grupos «Basada en preguntas de examen» / «Complementaria» (da etiqueta real); texto «N preguntas» só na Fase 2 | **Fase 1:** a cópia física no Banco General é obrigatória (nas matérias com banco) e leva `data-rm-copia-de="<id da canônica>"`; **não entra** em nenhuma soma. **Fase 2:** deixa de existir |
| **Infografía** | `<figure>` com `<figcaption>` e `<img>` (ou `.s2-photo[role=img]`) dentro do bloco | contagem do bloco/capa/modo Infografías | nenhuma |
| **Flashcard** | `.flashcard` (`.fc-front`/`.fc-back`) dentro do bloco, com `data-rm-fc="<id>"` | contagem do bloco/capa/modo Flashcards | **Fase 1:** a seção «revisión/mazo/cierre» continua guardando cópias, marcada `data-rm-agrega`, e **não é fonte**. **Fase 2:** vira vista sobre os blocos (§4) |
| **Videoclase** | `details.video-collapsible[data-rm-video="<id>"]` dentro do bloco | contagem do bloco/capa; número «N videos» | nenhuma |
| **Ausculta** (sons clínicos) | `.audio-player[data-rm-aus="<id>"]` com arquivo local existente | contagem «N sonidos», modo Auscultación | nenhuma |
| **Audiolibro** | **exclusivamente** o manifesto autenticado (`get-audio-manifest`) | existência do card, contagem, chips, modo Audiolibros | nenhuma: não existe no HTML da matéria |

Consequência **na Fase 2**: adicionar um recurso = escrever o recurso no bloco; capa, índice, modos, lateral, chips e o texto «N …» da portada se atualizam sozinhos. **Na Fase 1** valem as colunas «Fonte da verdade» e «Derivado» para capa, índice, modos, lateral e chips, mas a cópia física no Banco/«revisión» e a conferência do número escrito na portada seguem sendo passos humanos (ver §6).

## 2 · Marcadores mínimos no HTML da matéria (aditivos e retrocompatíveis)

Todos são atributos novos; o site atual os ignora, então podem entrar matéria por matéria sem mudar nada visível.

```html
<section id="neub05" data-rm-role="bloque" data-rm-n="05" data-rm-unidad="II">…</section>
<section id="neuportada" data-rm-role="guia">…</section>
<section id="banconeu" data-rm-role="repaso" data-rm-agrega="quiz">…</section>
<section id="revisaoneu" data-rm-role="repaso" data-rm-agrega="fc">…</section>

<div class="quiz-item" id="q-neu107" data-rm-q="q-neu107">…</div>            <!-- canônica, no bloco -->
<div class="quiz-item" id="bq-neu107" data-rm-copia-de="q-neu107">…</div>  <!-- cópia no banco: não conta -->
<div class="flashcard" data-rm-fc="fc-neu-b05-03">…</div>
<details class="video-collapsible" data-rm-video="v-neu-b05-01">…</details>
<div class="audio-player" data-rm-aus="aus-semio-b01-03">…</div>
```

Regras:
- `data-rm-role` / `data-rm-n` / `data-rm-unidad` substituem a dedução por regex de id e a numeração por ordem. O módulo continua aceitando a convenção antiga (`-bNN`) como *fallback* para as matérias ainda não marcadas.
- `data-rm-agrega` declara uma seção como **agregadora**: ela é leitura geral e fica fora de qualquer soma por bloco.
- `data-rm-copia-de` liga a cópia à canônica. Sem isso, o par corpo×banco só pode ser casado por enunciado (medido por R4, cópia a cópia: 21 das 27 matérias têm Banco geral; **só 3** — Neurología, Oftalmología, Anestesiología — têm vínculo verificável, e por convenção de id `bq-`↔`q-`, **0 por marcador**; 18 têm Banco sem vínculo, inclusive Medicina Familiar, com 26 cópias para 64 canônicas e 25 questões do banco sem par no corpo) e a contagem exata fica INDETERMINADA.
- `id` de questão: formato `q-<prefixo><NNN>` com prefixo da matéria; **imutável** (outros sistemas ancoram nele: relatórios, correções de gabarito, exames).
- Âncoras da caneta (`seção>índice`) **não mudam** com estes atributos: nenhum nó é criado, movido ou removido.

## 3 · Como a contagem é derivada (e onde)

```
contagem(recurso, escopo) = |{ ids canônicos distintos do recurso
                               em seções que NÃO são agregadoras,
                               dentro do escopo (bloco | matéria) }|
```

- **Escopo bloco:** cartão do índice, cabeçalho do bloco, índice do modo.
- **Escopo matéria:** capa, lateral, texto da portada.
- Fonte de leitura no navegador: o módulo (`RMSistema`/`RMNav`) já lê o DOM; passa a ler **o conjunto de ids canônicos** em vez de contar nós.
- **Texto da portada (Fase 1):** o número continua escrito no HTML e **a pessoa que edita o confere**; `contrato.cjs` (regra R5) falha se ele divergir do derivado, e a correção é manual. Opcionalmente a matéria adota `<span data-rm-count="quiz|fc|fig|bloques|video">N</span>` (edição de conteúdo, matéria a matéria): o módulo preenche o valor derivado e o `N` estático fica só como fallback sem JavaScript, ainda validado por R5. **Fase 2:** o placeholder é o padrão e o número deixa de ser digitado.
- **Audiolibros:** `contagem = nº de cards criados a partir do manifesto`. Nunca de texto.

Casos de borda (já medidos nas 27 matérias; ver `INVENTARIO.md §6`):
- flashcards soltos numa seção agregadora que **não** estão nos blocos (Semiología II: 12 em `s2-banco`) → o validador acusa «item só na agregadora»; a decisão (levar ao bloco ou descartar) é editorial.
- homônimos: duas perguntas distintas com o mesmo enunciado genérico só se distinguem pelo `id`. Por isso o `id` é obrigatório.

## 4 · Agregadoras: Fase 1 (marcar) × Fase 2 (vista)

**Fase 1 (esta proposta):** **marcar** (`data-rm-agrega`) e ligar cópias (`data-rm-copia-de`), **sem mudar a estrutura do conteúdo**. Resolve a contagem e a navegação, mas **não elimina a duplicação nem o trabalho de espelhar o Banco**.

**Fase 2 (futura; só se José quiser; PR separada com auditoria própria):** a agregadora deixa de guardar cópias e passa a ser uma **vista** gerada em tempo de execução a partir dos blocos. Elimina a duplicação (≈ 4 700 questões e ≈ 10 700 flashcards repetidos no DOM), reduz o tamanho das matérias e remove o risco de as cópias divergirem. **Pré-condição obrigatória:** migração segura das âncoras. As âncoras de tinta, notas e grifos são `seção>índice`; apagar as cópias muda os índices. É preciso um mapa antigo→novo, a prova (com dados reais, não simulados) de que nenhum traço/nota/grifo se perde ou se desloca, e a PR da caneta (#456) fechada. Só depois disso vale a promessa de escrever uma vez.

## 5 · Audiolibro, ausculta e vídeo

**Audiolibro (regra dura):**
1. O card só existe se o manifesto autenticado devolver `{audio_id, block_id}` e `block_id` existir como seção no DOM da matéria.
2. **Formato validado hoje (fonte: o código, não esta proposta):** `audio_id`, `block_id` e `subject_slug` casam com **`/^[a-z0-9][a-z0-9._-]{0,79}$/i`** (1 a 80 caracteres, letras ASCII sem distinção de caixa, dígitos, ponto, sublinhado e hífen; começa por letra ou dígito). A mesma expressão está em `netlify/functions/_audio/lib.js:35` (`ID_RE`) e em `assets/rm-audio.js:118` (`ID_RE`, usada por `validateItem`); `contrato.cjs` falha se as duas divergirem entre si ou desta documentação. Além do formato, o validador rejeita: campo fora dos 8 públicos (`audio_id, subject_slug, block_id, theme, title, duration, order, version`; no servidor ainda `path` e `ready`), valor que pareça URL/caminho/token/arquivo, `duration` fora de 1–21600 s e `order` não inteiro fora de 0–9999. Convenção editorial (opcional, **dentro** do formato): `<sigla>-<bloco>-<NN>`, p.ex. `semio2-b01-03`. O card real criado pelo motor (`rm-audio-boot.js`) traz `data-audio-id="<audio_id>"` e é inserido na seção `section#<block_id>`; o módulo **não** cria card para id fora do formato, id desconhecido nem bloco inexistente.
3. Nenhuma URL assinada, bucket ou caminho de arquivo aparece no DOM antes do clique em «Reproducir»; a URL é pedida na hora, curta, e descartada ao sair da matéria/logout.
4. Autorização por **flag + lista de matérias liberadas no servidor** (`get-pilot-flags` / `get-audio-manifest`). Falha = fechado: sem manifesto, nada aparece (lateral, capa, pílula, chip, player). **Hoje o servidor só lê o manifesto do slug do piloto** (`_audio/lib.js`, `PILOT_SLUG`; `rm-audio-boot.js:38-39` também): liberar outra matéria exige patch de servidor e de cliente (A4/A6 em `PATCHES-PARA-INTEGRACAO.md`), fora desta PR.
5. O ensaio **nunca simula áudio** sem manifesto autorizado: ele só prova a ausência (`audio/sem-manifesto-sem-audiolibro` e `audio/sem-requisicao-audio` PASSAM nas 27 matérias).
6. Cada audiolibro novo passa por: fonte autorizada por José → manifesto → card real → QA do piloto (motor de áudio) → só então o flag da matéria.

**Ausculta:** igual a um recurso de bloco (`audio-player`); arquivo local obrigatório e verificado pelo validador (hoje 0 quebrados).

**Vídeo:** `details.video-collapsible` + `data-rm-video`; o validador exige URL de embed válida e título; a contagem do cartão é a de `details`, nunca a de `iframe` (hoje as frases dos blocos misturam os dois critérios: 118 divergências em frases de bloco).

## 6 · Como publicar um recurso novo (passo a passo)

### Fase 1 (a que vale enquanto a Fase 2 não existir)

1. **Escrever no bloco** que ensina o assunto (fonte da verdade). Pergunta: seguir 8-A do `MANUTENCAO-DIDATICA-REPASSO-MED.md` (duplicata, cobertura, rótulo «Basada en preguntas de examen» só com prova real). Infografía/flashcard/vídeo: padrão visual da matéria.
2. **Dar o id estável** (`q-<prefixo><NNN>` para perguntas; `data-rm-fc`, `data-rm-video`, `data-rm-aus` nos demais).
3. **Fazer a cópia física no Banco General / «revisión» / «mazo» / «cierre»** quando a matéria tiver (perguntas: com `data-rm-copia-de="<id do bloco>"`), mantendo corpo e Banco **espelhados**, como hoje. **Matéria sem banco geral não ganha um por isso** (8-A.3).
4. **Conferir o número escrito na portada** (e nos textos «N preguntas/flashcards/infografías/videos» dos blocos): atualizar à mão ou adotar `data-rm-count`.
5. **Rodar o validador do contrato** (`contrato.cjs <slug>`, que lê o HTML da matéria; não precisa do inventário): falha **item a item** — id ou marcador faltando em qualquer seção/pergunta/cópia, cópia sem vínculo com canônica existente e de texto igual, número da portada diferente da contagem canônica, id duplicado, mídia quebrada. `contrato.teste.cjs` prova que R4, R5 e R9 falham nos casos negativos.
6. **Rodar o ensaio** (`ensaio.cjs <slug> --rapido`): 390 e 1440, índice, blocos, modos, ausência, teclado, Back, um traço de caneta **simulado**, sem escrita no banco.
7. **QA existentes** do repositório (Guard, annotation-safety, 4 larguras) como hoje.
8. **PR** com a matriz do recurso (o que entrou, onde, contagem derivada antes→depois).
9. **Sem tocar flags.** Ativação do layout novo numa matéria é decisão separada, com auditoria própria.

### Fase 2 (futura)

Passos 1–2, 5–9 iguais; os passos 3 e 4 desaparecem (a agregadora é vista; o número é derivado). **Só começa depois da migração segura das âncoras (§4).**

## 7 · Rollback

- Os marcadores são aditivos e ignorados pelo site atual: reverter a PR da matéria devolve o estado anterior sem efeito colateral.
- O módulo lê o marcador **ou** a convenção antiga: remover um marcador nunca derruba a navegação, só volta ao fallback.
- Layout novo continua atrás de `rm-pilot.js` + flags; desligar o flag basta para voltar à leitura contínua. Nenhum dado de aluno (tinta, notas, grifos) é tocado por qualquer passo acima.

## 8 · O que cada regra do validador confere (item a item)

`contrato.cjs` extrai um modelo por item do HTML real (`modelo.cjs`) e aplica `regras.cjs`. As três regras abaixo foram **endurecidas** depois da auditoria da PR #459 (ver `MUDANCAS-VALIDADOR.md`); antes, bastava existir *um* marcador no arquivo, ou um número coincidir com *qualquer* contagem, para aprovar a matéria inteira.

| Regra | Confere | Falha quando |
|---|---|---|
| **R4** | **cada cópia** de pergunta nas agregadoras do Banco | (a) sem vínculo (`data-rm-copia-de` ou, na Fase 1, `bq-X`↔`q-X`); (b) alvo inexistente, ou que é outra cópia, ou a própria cópia; (c) duas cópias da mesma canônica; (d) enunciado/alternativas diferentes da canônica; (e) canônica sem id (vínculo impossível); (f) canônica sem cópia no Banco (espelho quebrado). Matéria sem Banco: N/A (passa) |
| **R5** | **cada número** declarado na capa (seção de portada **e** hero/banner sem id) | o número ≠ contagem **canônica** do recurso (itens distintos fora das agregadoras; identidade = `id`/`data-rm-fc`, senão texto). Igualar o total do DOM com cópias **não** conta; recurso sem como contar (p.ex. «bloques» sem marcador nem `…bNN`) = **indeterminado = falha**. «Esquemas» está fora do contrato (não verificável) |
| **R9** | **cada seção e item aplicável** | seção sem `data-rm-role` (guia/bloque/repaso); bloco sem `data-rm-n`; bloco sem `data-rm-unidad` igual ao marcador «UNIDAD X»; agregadora sem `data-rm-agrega` do tipo dos seus itens ou com role ≠ repaso; pergunta canônica sem `data-rm-q` = id; cópia de pergunta/flashcard sem `data-rm-copia-de` (flashcard: apontando para `data-rm-fc` existente); flashcard canônico sem `data-rm-fc` único; vídeo sem `data-rm-video`; ausculta sem `data-rm-aus` |

**Limites do validador (declarados):** (1) a *agregadora* é inferida por conteúdo (seção cujos itens, ≥ 90%, estão em outra maior ou posterior) + o marcador + a heurística de id do piloto; é uma hipótese técnica até haver `data-rm-agrega` em todas. (2) R5 trata todo número junto de uma palavra de recurso na capa como afirmação sobre a **matéria inteira**; frase que descreve só um subconjunto («Banco de preguntas: 170») diverge e deve ser reescrita ou escopada com `data-rm-count`. (3) A identidade de flashcard sem `data-rm-fc` é frente+verso; de pergunta sem id, enunciado+alternativas; homônimos só se distinguem com id. (4) Números dentro dos blocos («13 preguntas · 7 complementarias») **não** são verificados por R5. (5) O validador lê HTML estático: não executa JavaScript, não vê o que os módulos criam em tempo de execução.

## 9 · Estado atual de conformidade

`CONFORMIDADE.md` (gerado por `contrato.cjs`) mostra, por matéria, quais regras do contrato já são cumpridas pelo conteúdo de hoje e quais exigem edição editorial. **Nenhuma matéria tem os marcadores `data-rm-*` ainda** (esperado: o contrato é uma proposta; R9 = 0/27 por construção, agora medido seção a seção e item a item). O ensaio com os marcadores *gerados em memória* (variante «com correção») mostra o resultado esperado depois da adoção da **Fase 1**; os descritores/temas que o ensaio infere do conteúdo são **hipótese técnica** para exercitar os componentes, **não** a identidade visual aprovada de nenhuma matéria.

> **Limite do teste de caneta:** o «caneta PASSA» da matriz usou **um traço sintético** (eventos `PointerEvent` do tipo `pen`) no Chromium, contra um Supabase simulado. Prova que o traço se ancora, que some fora do bloco e que navegar não grava. **Não** verifica o atraso, a perda de traço, a persistência real nem as regressões da #456 (Claude 2).
