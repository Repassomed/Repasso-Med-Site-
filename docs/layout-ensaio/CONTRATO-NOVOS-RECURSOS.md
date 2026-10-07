# Contrato de novos recursos · Checkpoint C · issue #457

> **Status:** proposta para auditoria (ChatGPT / José). **Nada disto está ativo em produção.** Nenhum arquivo reservado foi alterado; as mudanças que exigem `rm-*.js`, `get-materia.js` ou `index.html` estão em `PATCHES-PARA-INTEGRACAO.md`, para entrar depois da PR da caneta (#456).
> Todo texto que o aluno vê continua em castelhano simples; este documento é para a equipe e fica em português.

## 0 · O problema que o contrato resolve (medido, não suposto)

O inventário real das 27 matérias (`INVENTARIO.md`) e o ensaio visual (`MATRIZ.md`) mostram três fontes de erro de contagem, todas **editoriais, não do layout**:

1. **Os números aparecem escritos à mão** na portada («179 preguntas», «335 flashcards», «34 infografías»…). 5 de 29 declarações de portada já não coincidem com o conteúdo.
2. **O DOM soma cópias.** Cada matéria guarda os mesmos itens duas vezes (no bloco e no banco geral / "revisión" / "mazo" / "cierre"): 10 098 `.quiz-item` no DOM para 5 361–5 605 questões distintas; 17 735 `.flashcard` para 7 043 distintos.
3. **A cópia é reconhecida pelo `id` da seção** (`/banco|flashcards/i`), e os ids das 27 matérias não seguem convenção. Onde o id não casa (`revisaoneu`, `anecierre`, `dermcierre`, `toxcierre`, `oftcierre`, `h2pmazo`, `mazognrl`, `revisaofp2`…), a capa mostraria o dobro ou o triplo.

**Regra-mãe:** *um recurso tem uma fonte da verdade; toda contagem é derivada dela; nenhuma pessoa digita um número que o conteúdo já determina.*

## 1 · Uma fonte da verdade por recurso

| Recurso | Fonte da verdade (onde se escreve) | O que é derivado (nunca digitado) | Cópias permitidas |
|---|---|---|---|
| **Pergunta** | o `.quiz-item` **dentro do bloco que a ensina**, com `id` estável (`q-<prefixo><NNN>`) | contagem do bloco, da capa, do modo Preguntas, grupos «Basada en preguntas de examen» / «Complementaria» (da etiqueta real), texto «N preguntas» | a cópia no banco geral leva `data-rm-copia-de="<id da canônica>"` e **não entra** em nenhuma soma |
| **Infografía** | `<figure>` com `<figcaption>` e `<img>` (ou `.s2-photo[role=img]`) dentro do bloco | contagem do bloco/capa/modo Infografías | nenhuma |
| **Flashcard** | `.flashcard` (`.fc-front`/`.fc-back`) dentro do bloco, com `data-rm-fc="<id>"` | contagem do bloco/capa/modo Flashcards | a seção «revisión/mazo/cierre» (agregadora) **não é fonte**: é vista sobre os blocos (§4) |
| **Videoclase** | `details.video-collapsible[data-rm-video="<id>"]` dentro do bloco | contagem do bloco/capa; número «N videos» | nenhuma |
| **Ausculta** (sons clínicos) | `.audio-player[data-rm-aus="<id>"]` com arquivo local existente | contagem «N sonidos», modo Auscultación | nenhuma |
| **Audiolibro** | **exclusivamente** o manifesto autenticado (`get-audio-manifest`) | existência do card, contagem, chips, modo Audiolibros | nenhuma: não existe no HTML da matéria |

Consequência: **adicionar um recurso = escrever o recurso no bloco.** Capa, índice, modos, lateral, chips e o texto «N …» da portada se atualizam sozinhos.

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
- `data-rm-copia-de` liga a cópia à canônica. Sem isso, o par corpo×banco só pode ser casado por enunciado (hoje é o caso de 14 matérias; só 3 casam por `id`, 9 não têm banco geral e Medicina Familiar tem 25 questões do banco sem par no corpo) e a contagem exata fica INDETERMINADA.
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
- **Texto da portada:** o número escrito à mão vira `<span data-rm-count="quiz|fc|fig|bloques|video"></span>`; o módulo preenche. O HTML estático guarda o último valor apenas como *fallback* sem JavaScript; o validador (§6) falha se o fallback divergir do derivado, então ninguém precisa recalcular nada.
- **Audiolibros:** `contagem = nº de cards criados a partir do manifesto`. Nunca de texto.

Casos de borda (já medidos nas 27 matérias; ver `INVENTARIO.md §6`):
- flashcards soltos numa seção agregadora que **não** estão nos blocos (Semiología II: 12 em `s2-banco`) → o validador acusa «item só na agregadora»; a decisão (levar ao bloco ou descartar) é editorial.
- homônimos: duas perguntas distintas com o mesmo enunciado genérico só se distinguem pelo `id`. Por isso o `id` é obrigatório.

## 4 · Agregadoras: de cópia para vista (opcional, fase 2)

Fase 1 (esta proposta): **marcar** (`data-rm-agrega`), sem mudar conteúdo. Resolve a contagem e a navegação.

Fase 2 (PR separada, só se José quiser): a agregadora deixa de guardar cópias e passa a ser uma **vista** gerada em tempo de execução a partir dos blocos. Elimina a duplicação (≈ 4 700 questões e ≈ 10 700 flashcards repetidos no DOM), reduz o tamanho das matérias e remove o risco de as cópias divergirem. **Risco:** as âncoras de tinta/notas são `seção>índice`; migrar exige mapa de âncoras antigo→novo e prova de que nenhum traço/nota/grifo se perde. Por isso não é proposto sem a PR da caneta fechada e uma auditoria própria.

## 5 · Audiolibro, ausculta e vídeo

**Audiolibro (regra dura):**
1. O card só existe se o manifesto autenticado devolver `{audio_id, block_id}` e `block_id` existir como seção no DOM da matéria.
2. `audio_id` casa com `^[a-z0-9][a-z0-9-]{1,63}$`; o card carrega `data-rm-audio-id` e `data-rm-block-id`; o módulo **não** cria card para id desconhecido nem para bloco inexistente.
3. Nenhuma URL assinada, bucket ou caminho de arquivo aparece no DOM antes do clique em «Reproducir»; a URL é pedida na hora, curta, e descartada ao sair da matéria/logout.
4. Autorização por **flag + lista de matérias liberadas no servidor** (`get-pilot-flags` / `get-audio-manifest`). Falha = fechado: sem manifesto, nada aparece (lateral, capa, pílula, chip, player).
5. O ensaio **nunca simula áudio** sem manifesto autorizado: ele só prova a ausência (`audio/sem-manifesto-sem-audiolibro` e `audio/sem-requisicao-audio` PASSAM nas 27 matérias).
6. Cada audiolibro novo passa por: fonte autorizada por José → manifesto → card real → QA do piloto (motor de áudio) → só então o flag da matéria.

**Ausculta:** igual a um recurso de bloco (`audio-player`); arquivo local obrigatório e verificado pelo validador (hoje 0 quebrados).

**Vídeo:** `details.video-collapsible` + `data-rm-video`; o validador exige URL de embed válida e título; a contagem do cartão é a de `details`, nunca a de `iframe` (hoje as frases dos blocos misturam os dois critérios: 118 divergências em frases de bloco).

## 6 · Como publicar um recurso novo (passo a passo)

1. **Escrever no bloco** (fonte da verdade). Pergunta: seguir 8-A do `MANUTENCAO-DIDATICA-REPASSO-MED.md` (duplicata, cobertura, rótulo «Basada en preguntas de examen» só com prova real). Infografía/flashcard/vídeo: padrão visual da matéria.
2. **Dar o id estável** e, se houver cópia no banco, `data-rm-copia-de`.
3. **Rodar o validador do contrato** (`tools/qa/ensaio-layout/contrato.cjs <slug>`): falha se faltar id, se houver cópia sem canônica, se a portada divergir do derivado, se houver id duplicado ou mídia quebrada.
4. **Rodar o ensaio** (`tools/qa/ensaio-layout/ensaio.cjs <slug> --rapido`): 390 e 1440, índice, blocos, modos, ausência, teclado, Back, caneta, sem escrita no banco.
5. **QA existentes** do repositório (Guard, annotation-safety, 4 larguras) como hoje.
6. **PR** com a matriz do recurso (o que entrou, onde, contagem derivada antes→depois).
7. **Sem tocar flags.** Ativação do layout novo numa matéria é decisão separada, com auditoria própria.

## 7 · Rollback

- Os marcadores são aditivos e ignorados pelo site atual: reverter a PR da matéria devolve o estado anterior sem efeito colateral.
- O módulo lê o marcador **ou** a convenção antiga: remover um marcador nunca derruba a navegação, só volta ao fallback.
- Layout novo continua atrás de `rm-pilot.js` + flags; desligar o flag basta para voltar à leitura contínua. Nenhum dado de aluno (tinta, notas, grifos) é tocado por qualquer passo acima.

## 8 · Estado atual de conformidade

`CONFORMIDADE.md` (gerado por `contrato.cjs`) mostra, por matéria, quais regras do contrato já são cumpridas pelo conteúdo de hoje e quais exigem edição editorial. **Nenhuma matéria tem os marcadores `data-rm-*` ainda** (esperado: o contrato é uma proposta). O ensaio com os marcadores *gerados em memória* (variante «com correção») mostra o resultado esperado depois da adoção.
