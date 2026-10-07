# Matriz PASSA / FALHA / BLOQUEADO por matéria · Checkpoint D · issue #457
> **Nada foi ativado em produção.** Flags, UID, slug do piloto, `index.html`, `rm-*.js/css`, `get-materia.js` e todas as matérias estão intactos. Zero escritas no Supabase (sessão simulada), zero áudio simulado. **AGUARDANDO AUDITORIA CHATGPT.**

Legenda: **PASSA** = todas as verificações da área passaram nas 4 larguras (390 · 768 · 1024 · 1440) · **FALHA** = alguma falhou e é reproduzível (causa e correção abaixo) · **BLOQUEADO** = não dá para verificar sem algo que este ensaio não pode fazer (p.ex. audiolibro sem manifesto autorizado).

Duas variantes do MESMO ensaio: **«como está»** (módulos reais do piloto, só com o patch mínimo de slug em memória) e **«com correção»** (acrescenta C1/C2, o patch proposto para as agregadoras, também só em memória). O disco nunca é alterado.

## 1 · Resumo

| Variante | PASSA | FALHA | BLOQUEADO | Sem dados |
|---|--:|--:|--:|--:|
| Como está | 0 | 8 | 0 | 19 |
| Com correção proposta (C1/C2) | 0 | 0 | 0 | 27 |

**Audiolibro: BLOQUEADO nas 27 matérias, por regra**: não há manifesto autorizado fora do piloto, e o ensaio não simula áudio. O que o ensaio prova é a **ausência** (card, player, chip, capa, pílula, lateral e requisição de manifesto/áudio: PASSA nas 27). Em Semiología II o audiolibro real é coberto pelo teste do próprio piloto (#453).

## 2 · Matriz por matéria («como está»)

| Semestre | Matéria | Veredito | Ativa | Índice | Blocos | Modos | Ausentes | Contagens | Teclado/Back | Scroll | Responsivo | Caneta | Integridade | Áudio | Audiolibro |
|--:|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | Anatopatologia I (`anatomia-patologica`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Anatopatologia Práctica (`anatomia-patologica-practica`) | ❌ FALHA | ✅ | ❌ 4 | ✅ | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Fisiopatologia I (`fisiopatologia`) | ❌ FALHA | ✅ | ❌ 4 | ✅ | ❌ 1 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Imagenología (`imagenologia`) | ❌ FALHA | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Semiología I (`semiologia`) | ❌ FALHA | ✅ | ❌ 4 | ✅ | ❌ 1 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Farmacología I (`farmacologia`) | ❌ FALHA | ✅ | ❌ 4 | ✅ | ❌ 4 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Medicina Familiar (`medicina-familiar`) | ❌ FALHA | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Semiología II (`semiologia-ii`) | ❌ FALHA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 piloto |
| 6 | farmacologia-ii (`farmacologia-ii`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 2 | embriologia (`embriologia`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 1 | biologia (`biologia`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 1 | histologia-i (`histologia-i`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 1 | histologia-i-practica (`histologia-i-practica`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 2 | histologia-ii-practica (`histologia-ii-practica`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 2 | histologia-ii (`histologia-ii`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 1 | anatomia-i (`anatomia-i`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 6 | anatomia-patologica-ii (`anatomia-patologica-ii`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 6 | anatomia-patologica-ii-practica (`anatomia-patologica-ii-practica`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 6 | medicina-legal (`medicina-legal`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 6 | fisiopatologia-ii (`fisiopatologia-ii`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 7 | toxicologia (`toxicologia`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 7 | dermatologia (`dermatologia`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 2 | guarani (`guarani`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 7 | ortopedia (`ortopedia`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 7 | oftalmologia (`oftalmologia`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 7 | neurologia (`neurologia`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |
| 7 | anestesiologia (`anestesiologia`) | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — | 🟨 |

Em «❌ N», N é o número de verificações que falharam (somando as 4 larguras).

## 3 · Matriz «com correção proposta»

| Semestre | Matéria | Veredito | Ativa | Índice | Blocos | Modos | Ausentes | Contagens | Teclado/Back | Scroll | Responsivo | Caneta | Integridade | Áudio |
|--:|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | Anatopatologia I | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 5 | Anatopatologia Práctica | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 5 | Fisiopatologia I | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 5 | Imagenología | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 5 | Semiología I | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 5 | Farmacología I | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 5 | Medicina Familiar | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 6 | Semiología II | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 6 | farmacologia-ii | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 2 | embriologia | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 1 | biologia | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 1 | histologia-i | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 1 | histologia-i-practica | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 2 | histologia-ii-practica | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 2 | histologia-ii | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 1 | anatomia-i | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 6 | anatomia-patologica-ii | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 6 | anatomia-patologica-ii-practica | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 6 | medicina-legal | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 6 | fisiopatologia-ii | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 7 | toxicologia | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 7 | dermatologia | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 2 | guarani | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 7 | ortopedia | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 7 | oftalmologia | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 7 | neurologia | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |
| 7 | anestesiologia | — sem dados | — | — | — | — | — | — | — | — | — | — | — | — |

## 4 · Falhas reproduzíveis por matéria (causa e correção)

### Anatopatologia I (`anatomia-patologica`)

- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1505px) → `{"grid":true,"fim":2644,"sh":4149,"cover":[{"k":"fig","n":31},{"k":"quiz","n":359},{"k":"fc","n":162}],"unid":6}`
  - Causa: o índice geral é o fim da página (sobram 1505px)
  - Correção: Analisar `dados` no JSON.
- **blocos/pager** · larguras 390/768/1024/1440 · escopo: conteudo · resolvida pela correção proposta
  - Medido: Anterior/Índice/Próximo corretos (sem anterior no 1.º, sem próximo no último) → `[{"id":"introduccion","k":0,"pager":[{"t":"","hid":true},{"t":"Volver al índice general","hid":false},{"t":"","hid":true}]}]`
  - Causa: Idem: vizinho sem `<h2>` não vira link no pager.
  - Correção: Idem.
- **modos/paginas-preguntas** · larguras 390/768/1024/1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"adaptacion","secs":["adaptacion"],"vis":{"figuras":1,"pregs":27,"fc":0,"ab":0,"aus":0,"tablas":0},"real":27,"outros":[["figuras",1]]}]`
  - Causa: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia
  - Correção: Analisar `dados` no JSON.

### Anatopatologia Práctica (`anatomia-patologica-practica`)

- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 8641px) → `{"grid":true,"fim":1964,"sh":10605,"cover":[{"k":"fig","n":17},{"k":"quiz","n":76},{"k":"fc","n":341}],"unid":2}`
  - Causa: o índice geral é o fim da página (sobram 8641px)
  - Correção: Analisar `dados` no JSON.
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» = distintos (92); mostra 341; DOM tem 341 → `{"capa":341,"distintos":92,"dom":341,"agregadoras":["b11","b12"]}`
  - Causa: Há seção agregadora (cópia dos flashcards dos blocos) cujo id não casa a heurística `/banco|flashcards/i` de rm-materia-nav.js:90 e rm-layout.js:472; a capa soma o DOM, que repete os itens.
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (e o descritor da matéria o põe). Verificado na variante «com correção».
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (9) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["b11","b12"],"listados":11}`
  - Causa: A agregadora de flashcards não reconhecida aparece como se fosse um «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Fisiopatologia I (`fisiopatologia`)

- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1406px) → `{"grid":true,"fim":2417,"sh":3823,"cover":[{"k":"fig","n":39},{"k":"quiz","n":332},{"k":"fc","n":130}],"unid":4}`
  - Causa: o índice geral é o fim da página (sobram 1406px)
  - Correção: Analisar `dados` no JSON.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Preguntas» entre as distintas (211–274); mostra 332; DOM tem 332 → `{"capa":332,"distintas":[211,274],"dom":332,"agregadoras":[]}`
  - Causa: Idem para perguntas: a seção do banco/revisão duplica as questões dos blocos e entra na soma da capa.
  - Correção: C1/C2 (marcador `data-rm-agrega`).
- **modos/paginas-preguntas** · larguras 1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: «preguntas»: 13 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"hemorragia","secs":["hemorragia"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tablas":0},"real":6,"outros":[["figuras",1]]},{"id":"edema","secs":["edema"],"vis":{"figuras":1,"pregs":11,"fc":0,"ab":0,"aus":0,"tablas":0},"real":11,"outros":[["fig`
  - Causa: «preguntas»: 13 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia
  - Correção: Analisar `dados` no JSON.

### Imagenología (`imagenologia`)

- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1093px) → `{"grid":true,"fim":2033,"sh":3126,"cover":[{"k":"fig","n":20},{"k":"quiz","n":87},{"k":"fc","n":75}],"unid":3}`
  - Causa: o índice geral é o fim da página (sobram 1093px)
  - Correção: Analisar `dados` no JSON.

### Semiología I (`semiologia`)

- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1308px) → `{"grid":true,"fim":2315,"sh":3623,"cover":[{"k":"fig","n":27},{"k":"quiz","n":220},{"k":"fc","n":96},{"k":"aud","n":6},{"k":"vid","n":13}],"unid":5}`
  - Causa: o índice geral é o fim da página (sobram 1308px)
  - Correção: Analisar `dados` no JSON.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Preguntas» entre as distintas (143–182); mostra 220; DOM tem 220 → `{"capa":220,"distintas":[143,182],"dom":220,"agregadoras":[]}`
  - Causa: Idem para perguntas: a seção do banco/revisão duplica as questões dos blocos e entra na soma da capa.
  - Correção: C1/C2 (marcador `data-rm-agrega`).
- **modos/paginas-preguntas** · larguras 1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: «preguntas»: 10 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"historia-clinica","secs":["historia-clinica"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tablas":0},"real":6,"outros":[["figuras",1]]},{"id":"torax-resp","secs":["torax-resp"],"vis":{"figuras":1,"pregs":4,"fc":0,"ab":0,"aus":0,"tablas":0},"rea`
  - Causa: «preguntas»: 10 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia
  - Correção: Analisar `dados` no JSON.

### Farmacología I (`farmacologia`)

- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1147px) → `{"grid":true,"fim":3084,"sh":4231,"cover":[{"k":"fig","n":52},{"k":"quiz","n":191},{"k":"fc","n":200},{"k":"vid","n":17}],"unid":2}`
  - Causa: o índice geral é o fim da página (sobram 1147px)
  - Correção: Analisar `dados` no JSON.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Preguntas» entre as distintas (166–176); mostra 191; DOM tem 191 → `{"capa":191,"distintas":[166,176],"dom":191,"agregadoras":[]}`
  - Causa: Idem para perguntas: a seção do banco/revisão duplica as questões dos blocos e entra na soma da capa.
  - Correção: C1/C2 (marcador `data-rm-agrega`).
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» = distintos (216); mostra 200; DOM tem 412 → `{"capa":200,"distintos":216,"dom":412,"agregadoras":[]}`
  - Causa: Há seção agregadora (cópia dos flashcards dos blocos) cujo id não casa a heurística `/banco|flashcards/i` de rm-materia-nav.js:90 e rm-layout.js:472; a capa soma o DOM, que repete os itens.
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (e o descritor da matéria o põe). Verificado na variante «com correção».
- **modos/paginas-preguntas** · larguras 390/768/1024/1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"pk","secs":["pk"],"vis":{"figuras":1,"pregs":16,"fc":0,"ab":0,"aus":0,"tablas":0},"real":16,"outros":[["figuras",1]]}]`
  - Causa: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia
  - Correção: Analisar `dados` no JSON.

### Medicina Familiar (`medicina-familiar`)

- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: ver dados · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1195px) → `{"grid":true,"fim":1996,"sh":3191,"cover":[{"k":"quiz","n":64},{"k":"fc","n":82}],"unid":5}`
  - Causa: o índice geral é o fim da página (sobram 1195px)
  - Correção: Analisar `dados` no JSON.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Preguntas» entre as distintas (89–90); mostra 64; DOM tem 90 → `{"capa":64,"distintas":[89,90],"dom":90,"agregadoras":[]}`
  - Causa: Idem para perguntas: a seção do banco/revisão duplica as questões dos blocos e entra na soma da capa.
  - Correção: C1/C2 (marcador `data-rm-agrega`).
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» = distintos (95); mostra 82; DOM tem 177 → `{"capa":82,"distintos":95,"dom":177,"agregadoras":[]}`
  - Causa: Há seção agregadora (cópia dos flashcards dos blocos) cujo id não casa a heurística `/banco|flashcards/i` de rm-materia-nav.js:90 e rm-layout.js:472; a capa soma o DOM, que repete os itens.
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (e o descritor da matéria o põe). Verificado na variante «com correção».

### Semiología II (`semiologia-ii`)

- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» = distintos (184); mostra 172; DOM tem 366 → `{"capa":172,"distintos":184,"dom":366,"agregadoras":["s2-flashcards"]}`
  - Causa: Há seção agregadora (cópia dos flashcards dos blocos) cujo id não casa a heurística `/banco|flashcards/i` de rm-materia-nav.js:90 e rm-layout.js:472; a capa soma o DOM, que repete os itens.
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (e o descritor da matéria o põe). Verificado na variante «com correção».

## 5 · Falhas por tipo (quantas matérias)

| Verificação | Matérias | Escopo | Resolvida pela correção proposta? |
|---|--:|---|---|
| `indice/indice-e-o-fim` | 7 | ver dados | sim, em todas |
| `modos/paginas-preguntas` | 4 | ver dados | sim, em todas |
| `contagens/capa-flashcards` | 4 | modulo | sim, em todas |
| `contagens/capa-preguntas` | 4 | modulo | sim, em todas |
| `blocos/pager` | 1 | conteudo | sim, em todas |
| `modos/indice-flashcards` | 1 | modulo | sim, em todas |

## 6 · Risco por grupo (semestre)

| Semestre | Matérias | Veredito hoje (PASSA/FALHA/BLOQ.) | Com correção | Risco principal |
|--:|---|:-:|:-:|---|
| 1º | biologia, histologia-i, histologia-i-practica, anatomia-i | 0/0/0 | 0/0/0 | nenhum falho |
| 2º | embriologia, histologia-ii-practica, histologia-ii, guarani | 0/0/0 | 0/0/0 | nenhum falho |
| 5º | Anatopatologia I, Anatopatologia Práctica, Fisiopatologia I, Imagenología, Semiología I, Farmacología I, Medicina Familiar | 0/7/0 | 0/0/0 | indice/indice-e-o-fim (28); contagens/capa-preguntas (16) |
| 6º | Semiología II, farmacologia-ii, anatomia-patologica-ii, anatomia-patologica-ii-practica, medicina-legal, fisiopatologia-ii | 0/1/0 | 0/0/0 | contagens/capa-flashcards (4) |
| 7º | toxicologia, dermatologia, ortopedia, oftalmologia, neurologia, anestesiologia | 0/0/0 | 0/0/0 | nenhum falho |

## 7 · Bloqueios e pendências (não resolvidos nesta PR)

- **Integração dos patches** (`PATCHES-PARA-INTEGRACAO.md`): tocam arquivos reservados (`rm-layout.js`, `rm-materia-nav.js`, `rm-materia-sistema.js/css`, `rm-audio-boot.js`, `rm-pilot.js`). Só depois da PR da caneta (#456) e com auditoria própria.
- **Descritor/tema por matéria**: hoje existe só o de Semiología II. O ensaio gera um descritor genérico a partir do conteúdo (paleta e vinhetas do piloto, sem identidade própria por matéria). A identidade visual de cada matéria é decisão editorial (G0), fora desta PR.
- **Audiolibro**: sem manifesto autorizado nenhuma matéria pode ter card real; nada a testar além da ausência.
- **Conteúdo**: `<h2>` ausente em seções de portada/guia, ids de questão ausentes, agregadoras sem marcador e números de portada divergentes estão em `CONFORMIDADE.md` — são edições editoriais por matéria, não feitas aqui.

Gerado a partir de 8 resultados «como está» e 0 «com correção» em `docs/layout-ensaio/resultados*/`.
