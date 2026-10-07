# Matriz PASSA / FALHA / BLOQUEADO por matéria · Checkpoint D · issue #457
> **Nada foi ativado em produção.** Flags, UID, slug do piloto, `index.html`, `rm-*.js/css`, `get-materia.js` e todas as matérias estão intactos. Zero escritas no Supabase (sessão simulada), zero áudio simulado. **AGUARDANDO AUDITORIA CHATGPT.**

Legenda: **PASSA** = todas as verificações da área passaram nas 4 larguras (390 · 768 · 1024 · 1440) · **FALHA** = alguma falhou e é reproduzível (causa e correção abaixo) · **BLOQUEADO** = não dá para verificar sem algo que este ensaio não pode fazer (p.ex. audiolibro sem manifesto autorizado).

Duas variantes do MESMO ensaio: **«como está»** (módulos reais do piloto, só com o patch mínimo de slug em memória) e **«com correção»** (acrescenta C1/C2, o patch proposto para as agregadoras, também só em memória). O disco nunca é alterado.

## Avisos de leitura (obrigatórios)

1. **«Caneta PASSA» = um traço SIMULADO.** O teste dispara eventos `PointerEvent` sintéticos do tipo `pen` num Chromium, contra um Supabase simulado. Prova ancoragem, ocultação fora do bloco e que navegar não grava. **Não verifica o atraso nem a perda de traço reais, a persistência real, nem qualquer regressão da #456 (Claude 2).**
2. **Temas e descritores das 26 matérias sem tema próprio são HIPÓTESE TÉCNICA.** O ensaio os infere do conteúdo (blocos, unidades, agregadoras) e aplica a paleta do piloto só para exercitar os componentes. **Não são a identidade visual aprovada de nenhuma matéria** (decisão editorial G0/José). Só Semiología II usa o tema real.
3. **PASSA/FALHA descrevem o ensaio, não uma liberação.** Nada foi ativado; nenhuma matéria está aprovada para o layout novo por constar aqui.

## 1 · Resumo

| Variante | PASSA | FALHA | BLOQUEADO | Sem dados |
|---|--:|--:|--:|--:|
| Como está | 0 | 27 | 0 | 0 |
| Com correção proposta (C1/C2) | 15 | 12 | 0 | 0 |

**Audiolibro: BLOQUEADO nas 27 matérias, por regra**: não há manifesto autorizado fora do piloto, e o ensaio não simula áudio. O que o ensaio prova é a **ausência** (card, player, chip, capa, pílula, lateral e requisição de manifesto/áudio: PASSA nas 27). Em Semiología II o audiolibro real é coberto pelo teste do próprio piloto (#453).

### Por área (de 27 matérias)

| Área | PASSA hoje | FALHA hoje | PASSA com correção | FALHA com correção |
|---|--:|--:|--:|--:|
| Ativa | 27 | 0 | 27 | 0 |
| Índice | 4 | 23 | 27 | 0 |
| Blocos | 5 | 22 | 26 | 1 |
| Modos | 10 | 17 | 23 | 4 |
| Ausentes | 27 | 0 | 27 | 0 |
| Contagens | 7 | 20 | 16 | 11 |
| Teclado/Back | 27 | 0 | 27 | 0 |
| Scroll | 27 | 0 | 27 | 0 |
| Responsivo | 27 | 0 | 27 | 0 |
| Caneta (traço simulado) | 27 | 0 | 27 | 0 |
| Integridade | 27 | 0 | 27 | 0 |
| Áudio | 27 | 0 | 27 | 0 |

## 2 · Matriz por matéria («como está»)

| Semestre | Matéria | Veredito | Ativa | Índice | Blocos | Modos | Ausentes | Contagens | Teclado/Back | Scroll | Responsivo | Caneta (traço simulado) | Integridade | Áudio | Audiolibro |
|--:|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | Anatopatologia I (`anatomia-patologica`) | ❌ FALHA | ✅ | ❌ 8 | ❌ 8 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Anatopatologia Práctica (`anatomia-patologica-practica`) | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Fisiopatologia I (`fisiopatologia`) | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ❌ 1 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Imagenología (`imagenologia`) | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Semiología I (`semiologia`) | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ❌ 1 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Farmacología I (`farmacologia`) | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ❌ 4 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Medicina Familiar (`medicina-familiar`) | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ✅ | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Semiología II (`semiologia-ii`) | ❌ FALHA | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 piloto |
| 6 | Farmacología II (`farmacologia-ii`) | ❌ FALHA | ✅ | ❌ 6 | ❌ 4 | ❌ 8 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Embriología (`embriologia`) | ❌ FALHA | ✅ | ❌ 6 | ❌ 4 | ❌ 8 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Biología (`biologia`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Histología I (`histologia-i`) | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 8 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Histología I Práctica (`histologia-i-practica`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Histología II Práctica (`histologia-ii-practica`) | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Histología II (`histologia-ii`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Anatomía I (`anatomia-i`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Anatopatologia II (`anatomia-patologica-ii`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Anatopatologia II Práctica (`anatomia-patologica-ii-practica`) | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Medicina Legal (`medicina-legal`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Fisiopatologia II (`fisiopatologia-ii`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Toxicología (`toxicologia`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Dermatología (`dermatologia`) | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Guaraní (`guarani`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Ortopedia y Traumatología (`ortopedia`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Oftalmología (`oftalmologia`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Neurología (`neurologia`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Anestesiología (`anestesiologia`) | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |

Em «❌ N», N é o número de verificações que falharam (somando as 4 larguras).

## 3 · Matriz «com correção proposta»

| Semestre | Matéria | Veredito | Ativa | Índice | Blocos | Modos | Ausentes | Contagens | Teclado/Back | Scroll | Responsivo | Caneta (traço simulado) | Integridade | Áudio |
|--:|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | Anatopatologia I | ❌ FALHA | ✅ | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Anatopatologia Práctica | ❌ FALHA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Fisiopatologia I | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 1 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Imagenología | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Semiología I | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 1 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Farmacología I | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Medicina Familiar | ❌ FALHA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Semiología II | ❌ FALHA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Farmacología II | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Embriología | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Biología | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Histología I | ❌ FALHA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Histología I Práctica | ❌ FALHA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Histología II Práctica | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Histología II | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Anatomía I | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Anatopatologia II | ❌ FALHA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Anatopatologia II Práctica | ❌ FALHA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Medicina Legal | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Fisiopatologia II | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Toxicología | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Dermatología | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Guaraní | ❌ FALHA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Ortopedia y Traumatología | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Oftalmología | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Neurología | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Anestesiología | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## 4 · Falhas reproduzíveis por matéria (causa e correção)

### Anatopatologia I (`anatomia-patologica`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=701","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1505px) → `{"grid":true,"fim":2644,"sh":4149,"cover":[{"k":"fig","n":31},{"k":"quiz","n":359},{"k":"fc","n":162}],"unid":6}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/pager-cadeia** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · não resolvida pela correção
  - Medido: nenhuma seção interior sem <h2>: ela quebra a cadeia Anterior/Próximo (o módulo esconde o link do vizinho sem título e o aluno fica sem saída) → `["analise-guia"]`
  - Causa: Seção interior sem `<h2>` (ex.: guía no meio do conteúdo) quebra a cadeia Anterior/Próximo: o aluno não consegue seguir lendo e só volta pelo índice.
  - Correção: C4 (título de reserva) ou `<h2>` na seção.
  - Resíduo mesmo com a correção: nenhuma seção interior sem <h2>: ela quebra a cadeia Anterior/Próximo (o módulo esconde o link do vizinho sem título e o aluno fica sem saída) → `["analise-guia"]` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=701","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/paginas-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · não resolvida pela correção
  - Medido: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"adaptacion","secs":["adaptacion"],"vis":{"figuras":1,"pregs":27,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":27,"outros":[["figFora",1]]}]`
  - Causa: Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.
  - Correção: C6 (não aplicado): isolar por nó e tratar `figure` interna do contêiner de questões como recurso do bloco.
  - Resíduo mesmo com a correção: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"adaptacion","secs":["adaptacion"],"vis":{"figuras":1,"pregs":27,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":27,"outros":[["figFora",1]]}]` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)

### Anatopatologia Práctica (`anatomia-patologica-practica`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=676","SECTION.container# h=7887"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 8641px) → `{"grid":true,"fim":1964,"sh":10605,"cover":[{"k":"fig","n":17},{"k":"quiz","n":76},{"k":"fc","n":341}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · não resolvida pela correção
  - Medido: capa «Flashcards» não soma cópias: distintos 92; capa mostra 341; DOM tem 341 → `{"capa":341,"distintos":92,"dom":341,"agregadoras":["b11","b12"]}`
  - Causa: A seção agregadora (b11, b12) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
  - Resíduo mesmo com a correção: capa «Flashcards» não soma cópias: distintos 92; capa mostra 161; DOM tem 341 → `{"capa":161,"distintos":92,"dom":341,"agregadoras":["b11","b12"]}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=676","SECTION.container# h=7887"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (9) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["b11","b12"],"listados":11}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Fisiopatologia I (`fisiopatologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=722","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1406px) → `{"grid":true,"fim":2417,"sh":3823,"cover":[{"k":"fig","n":39},{"k":"quiz","n":332},{"k":"fc","n":130}],"unid":4}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: conteudo · não resolvida pela correção
  - Medido: capa «Preguntas» não soma cópias: distintas 211–274; capa mostra 332; DOM tem 332 → `{"capa":332,"distintas":[211,274],"dom":332,"agregadoras":[]}`
  - Causa: As perguntas se repetem entre seções que não são cópia integral (p.ex. a seção de prova repete parte dos blocos) e não há `id` estável: o DOM soma duplicatas e a contagem exata é INDETERMINADA.
  - Correção: Contrato §1–§3: id canônico por item + `data-rm-copia-de`; decisão editorial sobre as repetições (8-A.1 do MANUTENCAO-DIDATICA).
  - Resíduo mesmo com a correção: capa «Preguntas» não soma cópias: distintas 211–274; capa mostra 332; DOM tem 332 → `{"capa":332,"distintas":[211,274],"dom":332,"agregadoras":[]}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=722","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/paginas-preguntas** · larguras 1440 · escopo: modulo · não resolvida pela correção
  - Medido: «preguntas»: 13 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"hemorragia","secs":["hemorragia"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":6,"outros":[["figFora",1]]},{"id":"edema","secs":["edema"],"vis":{"figuras":1,"pregs":11,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"`
  - Causa: Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.
  - Correção: C6 (não aplicado): isolar por nó e tratar `figure` interna do contêiner de questões como recurso do bloco.
  - Resíduo mesmo com a correção: «preguntas»: 13 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"hemorragia","secs":["hemorragia"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":6,"outros":[["figFora",1]]},{"id":"edema","secs":["edema"],"vis":{"figuras":` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)

### Imagenología (`imagenologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=526","DIV.rm-revisao-banner#revisao-geral h=422"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1093px) → `{"grid":true,"fim":2033,"sh":3126,"cover":[{"k":"fig","n":20},{"k":"quiz","n":87},{"k":"fc","n":75}],"unid":3}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=526","DIV.rm-revisao-banner#revisao-geral h=422"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Semiología I (`semiologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=871","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1308px) → `{"grid":true,"fim":2315,"sh":3623,"cover":[{"k":"fig","n":27},{"k":"quiz","n":220},{"k":"fc","n":96},{"k":"aud","n":6},{"k":"vid","n":13}],"unid":5}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: conteudo · não resolvida pela correção
  - Medido: capa «Preguntas» não soma cópias: distintas 143–182; capa mostra 220; DOM tem 220 → `{"capa":220,"distintas":[143,182],"dom":220,"agregadoras":[]}`
  - Causa: As perguntas se repetem entre seções que não são cópia integral (p.ex. a seção de prova repete parte dos blocos) e não há `id` estável: o DOM soma duplicatas e a contagem exata é INDETERMINADA.
  - Correção: Contrato §1–§3: id canônico por item + `data-rm-copia-de`; decisão editorial sobre as repetições (8-A.1 do MANUTENCAO-DIDATICA).
  - Resíduo mesmo com a correção: capa «Preguntas» não soma cópias: distintas 143–182; capa mostra 220; DOM tem 220 → `{"capa":220,"distintas":[143,182],"dom":220,"agregadoras":[]}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=871","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/paginas-preguntas** · larguras 1440 · escopo: modulo · não resolvida pela correção
  - Medido: «preguntas»: 10 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"historia-clinica","secs":["historia-clinica"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":6,"outros":[["figFora",1]]},{"id":"torax-resp","secs":["torax-resp"],"vis":{"figuras":1,"pregs":4,"fc":0,"ab":0,"aus":0,"tab`
  - Causa: Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.
  - Correção: C6 (não aplicado): isolar por nó e tratar `figure` interna do contêiner de questões como recurso do bloco.
  - Resíduo mesmo com a correção: «preguntas»: 10 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"historia-clinica","secs":["historia-clinica"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":6,"outros":[["figFora",1]]},{"id":"torax-resp","secs":["torax-re` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)

### Farmacología I (`farmacologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=710","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1147px) → `{"grid":true,"fim":3084,"sh":4231,"cover":[{"k":"fig","n":52},{"k":"quiz","n":191},{"k":"fc","n":200},{"k":"vid","n":17}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: conteudo · não resolvida pela correção
  - Medido: capa «Preguntas» não soma cópias: distintas 166–176; capa mostra 191; DOM tem 191 → `{"capa":191,"distintas":[166,176],"dom":191,"agregadoras":[]}`
  - Causa: As perguntas se repetem entre seções que não são cópia integral (p.ex. a seção de prova repete parte dos blocos) e não há `id` estável: o DOM soma duplicatas e a contagem exata é INDETERMINADA.
  - Correção: Contrato §1–§3: id canônico por item + `data-rm-copia-de`; decisão editorial sobre as repetições (8-A.1 do MANUTENCAO-DIDATICA).
  - Resíduo mesmo com a correção: capa «Preguntas» não soma cópias: distintas 166–176; capa mostra 191; DOM tem 191 → `{"capa":191,"distintas":[166,176],"dom":191,"agregadoras":[]}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **contagens/capa-flashcards-omitidos** · larguras 390/768/1024/1440 · escopo: conteudo · não resolvida pela correção
  - Medido: capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos 216; capa mostra 200 → `{"capa":200,"distintos":216,"soNaAgregadora":16}`
  - Causa: Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta.
  - Correção: Editorial: levar o cartão ao bloco que o ensina ou descartá-lo (contrato §3, caso de borda).
  - Resíduo mesmo com a correção: capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos 216; capa mostra 200 → `{"capa":200,"distintos":216,"soNaAgregadora":16}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=710","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/paginas-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · não resolvida pela correção
  - Medido: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"pk","secs":["pk"],"vis":{"figuras":1,"pregs":16,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":16,"outros":[["figFora",1]]}]`
  - Causa: Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.
  - Correção: C6 (não aplicado): isolar por nó e tratar `figure` interna do contêiner de questões como recurso do bloco.
  - Resíduo mesmo com a correção: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"pk","secs":["pk"],"vis":{"figuras":1,"pregs":16,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":16,"outros":[["figFora",1]]}]` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)

### Medicina Familiar (`medicina-familiar`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=758","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1195px) → `{"grid":true,"fim":1996,"sh":3191,"cover":[{"k":"quiz","n":64},{"k":"fc","n":82}],"unid":5}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-preguntas-omitidas** · larguras 390/768/1024/1440 · escopo: conteudo · não resolvida pela correção
  - Medido: capa «Preguntas» não omite questões que o aluno encontra só no banco: distintas 89; capa mostra 64 → `{"capa":64,"distintas":89,"soNaAgregadora":25}`
  - Causa: Há questões só no banco geral (sem par no corpo) que a capa por bloco não conta.
  - Correção: Editorial: levar a questão ao bloco que ensina o assunto (8-A.3) ou descartá-la; contrato §1.
  - Resíduo mesmo com a correção: capa «Preguntas» não omite questões que o aluno encontra só no banco: distintas 89; capa mostra 64 → `{"capa":64,"distintas":89,"soNaAgregadora":25}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **contagens/capa-flashcards-omitidos** · larguras 390/768/1024/1440 · escopo: conteudo · não resolvida pela correção
  - Medido: capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos 95; capa mostra 82 → `{"capa":82,"distintos":95,"soNaAgregadora":13}`
  - Causa: Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta.
  - Correção: Editorial: levar o cartão ao bloco que o ensina ou descartá-lo (contrato §3, caso de borda).
  - Resíduo mesmo com a correção: capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos 95; capa mostra 82 → `{"capa":82,"distintos":95,"soNaAgregadora":13}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=758","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Semiología II (`semiologia-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.s2-hero rmc-hero# h=420"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards-omitidos** · larguras 390/768/1024/1440 · escopo: conteudo · não resolvida pela correção
  - Medido: capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos 184; capa mostra 172 → `{"capa":172,"distintos":184,"soNaAgregadora":12}`
  - Causa: Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta.
  - Correção: Editorial: levar o cartão ao bloco que o ensina ou descartá-lo (contrato §3, caso de borda).
  - Resíduo mesmo com a correção: capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos 184; capa mostra 172 → `{"capa":172,"distintos":184,"soNaAgregadora":12}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)

### Farmacología II (`farmacologia-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=679"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/1024 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 732px) → `{"grid":true,"fim":2378,"sh":3110,"cover":[{"k":"quiz","n":428},{"k":"fc","n":876},{"k":"vid","n":9}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Preguntas» não soma cópias: distintas 214–214; capa mostra 428; DOM tem 428 → `{"capa":428,"distintas":[214,214],"dom":428,"agregadoras":["f2b15"]}`
  - Causa: A seção agregadora (f2b15) repete as perguntas dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 292; capa mostra 876; DOM tem 876 → `{"capa":876,"distintos":292,"dom":876,"agregadoras":["f2b16"]}`
  - Causa: A seção agregadora (f2b16) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=679"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «preguntas»: o índice lista exatamente os blocos que têm o recurso (14) → `{"nav":"modeidx","mode":"preguntas","faltam":[],"sobram":["f2b15"],"listados":15}`
  - Causa: A agregadora de perguntas não reconhecida aparece como «bloco» no índice do modo Preguntas.
  - Correção: C1/C2.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (14) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["f2b16"],"listados":15}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Embriología (`embriologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=710"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/1024 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 762px) → `{"grid":true,"fim":2435,"sh":3197,"cover":[{"k":"fig","n":39},{"k":"quiz","n":214},{"k":"fc","n":298},{"k":"vid","n":3}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Preguntas» não soma cópias: distintas 107–107; capa mostra 214; DOM tem 214 → `{"capa":214,"distintas":[107,107],"dom":214,"agregadoras":["emb14"]}`
  - Causa: A seção agregadora (emb14) repete as perguntas dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 145; capa mostra 298; DOM tem 298 → `{"capa":298,"distintos":145,"dom":298,"agregadoras":["emb15"]}`
  - Causa: A seção agregadora (emb15) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=710"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «preguntas»: o índice lista exatamente os blocos que têm o recurso (13) → `{"nav":"modeidx","mode":"preguntas","faltam":[],"sobram":["emb14"],"listados":14}`
  - Causa: A agregadora de perguntas não reconhecida aparece como «bloco» no índice do modo Preguntas.
  - Correção: C1/C2.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (13) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["emb15"],"listados":14}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Biología (`biologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Histología I (`histologia-i`)

- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Preguntas» não soma cópias: distintas 150–150; capa mostra 300; DOM tem 300 → `{"capa":300,"distintas":[150,150],"dom":300,"agregadoras":["histo13"]}`
  - Causa: A seção agregadora (histo13) repete as perguntas dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · não resolvida pela correção
  - Medido: capa «Flashcards» não soma cópias: distintos 184; capa mostra 396; DOM tem 396 → `{"capa":396,"distintos":184,"dom":396,"agregadoras":["histo14"]}`
  - Causa: A seção agregadora (histo14) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
  - Resíduo mesmo com a correção: capa «Flashcards» não soma cópias: distintos 184; capa mostra 198; DOM tem 396 → `{"capa":198,"distintos":184,"dom":396,"agregadoras":["histo14"]}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **modos/indice-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «preguntas»: o índice lista exatamente os blocos que têm o recurso (12) → `{"nav":"modeidx","mode":"preguntas","faltam":[],"sobram":["histo13"],"listados":13}`
  - Causa: A agregadora de perguntas não reconhecida aparece como «bloco» no índice do modo Preguntas.
  - Correção: C1/C2.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (12) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["histo14"],"listados":13}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Histología I Práctica (`histologia-i-practica`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · não resolvida pela correção
  - Medido: capa «Flashcards» não soma cópias: distintos 115; capa mostra 126; DOM tem 286 → `{"capa":126,"distintos":115,"dom":286,"agregadoras":["bancofc","bancoruleta"]}`
  - Causa: A seção agregadora (bancofc, bancoruleta) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
  - Resíduo mesmo com a correção: capa «Flashcards» não soma cópias: distintos 115; capa mostra 126; DOM tem 286 → `{"capa":126,"distintos":115,"dom":286,"agregadoras":["bancofc","bancoruleta"]}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Histología II Práctica (`histologia-ii-practica`)

- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 404; capa mostra 1233; DOM tem 1233 → `{"capa":1233,"distintos":404,"dom":1233,"agregadoras":["h2pmazo"]}`
  - Causa: A seção agregadora (h2pmazo) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (16) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["h2pmazo"],"listados":17}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Histología II (`histologia-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Anatomía I (`anatomia-i`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Anatopatologia II (`anatomia-patologica-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · não resolvida pela correção
  - Medido: capa «Flashcards» não soma cópias: distintos 153; capa mostra 160; DOM tem 480 → `{"capa":160,"distintos":153,"dom":480,"agregadoras":["bancofcap2"]}`
  - Causa: A seção agregadora (bancofcap2) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
  - Resíduo mesmo com a correção: capa «Flashcards» não soma cópias: distintos 153; capa mostra 160; DOM tem 480 → `{"capa":160,"distintos":153,"dom":480,"agregadoras":["bancofcap2"]}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Anatopatologia II Práctica (`anatomia-patologica-ii-practica`)

- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · não resolvida pela correção
  - Medido: capa «Flashcards» não soma cópias: distintos 146; capa mostra 465; DOM tem 465 → `{"capa":465,"distintos":146,"dom":465,"agregadoras":["ap2pmazo"]}`
  - Causa: A seção agregadora (ap2pmazo) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
  - Resíduo mesmo com a correção: capa «Flashcards» não soma cópias: distintos 146; capa mostra 155; DOM tem 465 → `{"capa":155,"distintos":146,"dom":465,"agregadoras":["ap2pmazo"]}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (7) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["ap2pmazo"],"listados":8}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Medicina Legal (`medicina-legal`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Fisiopatologia II (`fisiopatologia-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 619; capa mostra 1857; DOM tem 1857 → `{"capa":1857,"distintos":619,"dom":1857,"agregadoras":["revisaofp2"]}`
  - Causa: A seção agregadora (revisaofp2) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (14) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["revisaofp2"],"listados":15}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Toxicología (`toxicologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 472; capa mostra 1416; DOM tem 1416 → `{"capa":1416,"distintos":472,"dom":1416,"agregadoras":["toxcierre"]}`
  - Causa: A seção agregadora (toxcierre) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (16) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["toxcierre"],"listados":17}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Dermatología (`dermatologia`)

- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 293; capa mostra 482; DOM tem 482 → `{"capa":482,"distintos":293,"dom":482,"agregadoras":["dermcierre"]}`
  - Causa: A seção agregadora (dermcierre) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (13) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["dermcierre"],"listados":14}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Guaraní (`guarani`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · não resolvida pela correção
  - Medido: capa «Flashcards» não soma cópias: distintos 286; capa mostra 596; DOM tem 596 → `{"capa":596,"distintos":286,"dom":596,"agregadoras":["mazognrl"]}`
  - Causa: A seção agregadora (mazognrl) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
  - Resíduo mesmo com a correção: capa «Flashcards» não soma cópias: distintos 286; capa mostra 298; DOM tem 596 → `{"capa":298,"distintos":286,"dom":596,"agregadoras":["mazognrl"]}` (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (13) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["mazognrl"],"listados":14}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Ortopedia y Traumatología (`ortopedia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Oftalmología (`oftalmologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 267; capa mostra 801; DOM tem 801 → `{"capa":801,"distintos":267,"dom":801,"agregadoras":["oftcierre"]}`
  - Causa: A seção agregadora (oftcierre) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (9) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["oftcierre"],"listados":10}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Neurología (`neurologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 335; capa mostra 670; DOM tem 670 → `{"capa":670,"distintos":335,"dom":670,"agregadoras":["revisaoneu"]}`
  - Causa: A seção agregadora (revisaoneu) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (19) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["revisaoneu"],"listados":20}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Anestesiología (`anestesiologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 232; capa mostra 464; DOM tem 464 → `{"capa":464,"distintos":232,"dom":464,"agregadoras":["anecierre"]}`
  - Causa: A seção agregadora (anecierre) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (15) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["anecierre"],"listados":16}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

## 5 · Falhas por tipo (quantas matérias)

| Verificação | Matérias | Escopo | Resolvida pela correção proposta? |
|---|--:|---|---|
| `indice/sem-residuo` | 23 | modulo | sim, em todas |
| `blocos/sem-residuo-bloco` | 22 | modulo | sim, em todas |
| `contagens/capa-flashcards` | 15 | modulo | não em 6 matéria(s) |
| `modos/indice-flashcards` | 13 | modulo | sim, em todas |
| `indice/indice-e-o-fim` | 9 | modulo | sim, em todas |
| `contagens/capa-preguntas` | 6 | conteudo | não em 3 matéria(s) |
| `modos/paginas-preguntas` | 4 | modulo | não em 4 matéria(s) |
| `contagens/capa-flashcards-omitidos` | 3 | conteudo | não em 3 matéria(s) |
| `modos/indice-preguntas` | 3 | modulo | sim, em todas |
| `blocos/pager-cadeia` | 1 | modulo+conteudo | não em 1 matéria(s) |
| `contagens/capa-preguntas-omitidas` | 1 | conteudo | não em 1 matéria(s) |

## 6 · Risco por grupo (semestre)

| Semestre | Matérias | Veredito hoje (PASSA/FALHA/BLOQ.) | Com correção | Risco principal |
|--:|---|:-:|:-:|---|
| 1º | Biología, Histología I, Histología I Práctica, Anatomía I | 0/4/0 | 2/2/0 | indice/sem-residuo (12); blocos/sem-residuo-bloco (12) |
| 2º | Embriología, Histología II Práctica, Histología II, Guaraní | 0/4/0 | 3/1/0 | indice/sem-residuo (12); contagens/capa-flashcards (12) |
| 5º | Anatopatologia I, Anatopatologia Práctica, Fisiopatologia I, Imagenología, Semiología I, Farmacología I, Medicina Familiar | 0/7/0 | 1/6/0 | indice/sem-residuo (28); indice/indice-e-o-fim (28) |
| 6º | Semiología II, Farmacología II, Anatopatologia II, Anatopatologia II Práctica, Medicina Legal, Fisiopatologia II | 0/6/0 | 3/3/0 | indice/sem-residuo (20); contagens/capa-flashcards (16) |
| 7º | Toxicología, Dermatología, Ortopedia y Traumatología, Oftalmología, Neurología, Anestesiología | 0/6/0 | 6/0/0 | indice/sem-residuo (20); contagens/capa-flashcards (20) |

## 7 · Bloqueios e pendências (não resolvidos nesta PR)

- **Integração dos patches** (`PATCHES-PARA-INTEGRACAO.md`): tocam arquivos reservados (`rm-layout.js`, `rm-materia-nav.js`, `rm-materia-sistema.js/css`, `rm-audio-boot.js`, `rm-pilot.js`). Só depois da PR da caneta (#456) e com auditoria própria.
- **Descritor/tema por matéria**: hoje existe só o de Semiología II. Os 26 descritores do ensaio são **hipótese técnica inferida do conteúdo** (paleta e vinhetas do piloto), **não identidade visual aprovada**. Aprovar identidade, unidades e numeração de cada matéria é decisão editorial (G0/José), fora desta PR.
- **Audiolibro**: sem manifesto autorizado nenhuma matéria pode ter card real; nada a testar além da ausência.
- **Conteúdo**: `<h2>` ausente em seções de portada/guia, ids de questão ausentes, agregadoras sem marcador e números de portada divergentes estão em `CONFORMIDADE.md` — são edições editoriais por matéria, não feitas aqui.

## 8 · As 12 falhas que restam mesmo com a correção proposta (C1/C2/C3)

Todas são **conteúdo repetido/ausente ou comportamento do módulo que a correção proposta não cobre**. Nenhuma foi editada nesta PR. Dono = quem decide: **José/editorial** (conteúdo) ou **integração** (módulo, depois da #456).

| Matéria | Verificação (larguras) | Medido com a correção | Causa | Dono | Próxima ação |
|---|---|---|---|---|---|
| Anatopatologia I (`anatomia-patologica`) | `blocos/pager-cadeia` (390/768/1024/1440) | 1 página(s) com recurso extra; ex.: "analise-guia" | Seção interior sem `<h2>` (ex.: guía no meio do conteúdo) quebra a cadeia Anterior/Próximo: o aluno não consegue seguir lendo e só volta pelo índice. | José + integração | Dar `<h2>` à seção ou aplicar C4 (título de reserva) |
| Anatopatologia I (`anatomia-patologica`) | `modos/paginas-preguntas` (390/768/1024/1440) | 1 página(s) com recurso extra; ex.: {"id":"adaptacion","secs":["adaptacion"],"vis":{"figuras":1,"pregs":27,"fc":0,"ab":0,"aus":0,"tablas":0,"figFo | Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó. | Integração (após #456) | Patch C6 (isolar por nó) ou mover a figura «Cómo leer…» para fora de `.quiz-section` |
| Anatopatologia Práctica (`anatomia-patologica-practica`) | `contagens/capa-flashcards` (390/768/1024/1440) | capa 161 × distintos 92 | Mesmo com a agregadora excluída, os blocos repetem entre si 69+ itens (mesma frente/enunciado em mais de um bloco) e não há `id` canônico para distinguir cópia de homônimo. | José / editorial | Decidir o que fazer com flashcards repetidos entre blocos (ids canônicos); depois reconferir a capa |
| Fisiopatologia I (`fisiopatologia`) | `contagens/capa-preguntas` (390/768/1024/1440) | capa 332 × distintas 211–274 | Mesmo com a agregadora excluída, os blocos repetem entre si 58+ itens (mesma frente/enunciado em mais de um bloco) e não há `id` canônico para distinguir cópia de homônimo. | José / editorial | Decidir sobre as questões repetidas entre blocos e a seção de prova (8-A.1); id canônico por questão |
| Fisiopatologia I (`fisiopatologia`) | `modos/paginas-preguntas` (1440) | 3 página(s) com recurso extra; ex.: {"id":"hemorragia","secs":["hemorragia"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tablas":0,"figFor | Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó. | Integração (após #456) | Patch C6 (isolar por nó) ou mover a figura «Cómo leer…» para fora de `.quiz-section` |
| Semiología I (`semiologia`) | `contagens/capa-preguntas` (390/768/1024/1440) | capa 220 × distintas 143–182 | Mesmo com a agregadora excluída, os blocos repetem entre si 38+ itens (mesma frente/enunciado em mais de um bloco) e não há `id` canônico para distinguir cópia de homônimo. | José / editorial | Decidir sobre as questões repetidas entre blocos e a seção de prova (8-A.1); id canônico por questão |
| Semiología I (`semiologia`) | `modos/paginas-preguntas` (1440) | 3 página(s) com recurso extra; ex.: {"id":"historia-clinica","secs":["historia-clinica"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tabla | Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó. | Integração (após #456) | Patch C6 (isolar por nó) ou mover a figura «Cómo leer…» para fora de `.quiz-section` |
| Farmacología I (`farmacologia`) | `contagens/capa-preguntas` (390/768/1024/1440) | capa 191 × distintas 166–176 | Mesmo com a agregadora excluída, os blocos repetem entre si 15+ itens (mesma frente/enunciado em mais de um bloco) e não há `id` canônico para distinguir cópia de homônimo. | José / editorial | Decidir sobre as questões repetidas entre blocos e a seção de prova (8-A.1); id canônico por questão |
| Farmacología I (`farmacologia`) | `contagens/capa-flashcards-omitidos` (390/768/1024/1440) | capa 200 × distintos 216 | Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta. | José / editorial | Levar o cartão ao bloco que o ensina ou descartá-lo; reconferir |
| Farmacología I (`farmacologia`) | `modos/paginas-preguntas` (390/768/1024/1440) | 1 página(s) com recurso extra; ex.: {"id":"pk","secs":["pk"],"vis":{"figuras":1,"pregs":16,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":16 | Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó. | Integração (após #456) | Patch C6 (isolar por nó) ou mover a figura «Cómo leer…» para fora de `.quiz-section` |
| Medicina Familiar (`medicina-familiar`) | `contagens/capa-preguntas-omitidas` (390/768/1024/1440) | capa 64 × distintas 89 | Há questões só no banco geral (sem par no corpo) que a capa por bloco não conta. | José / editorial | Levar a questão ao bloco (8-A.3) ou descartá-la |
| Medicina Familiar (`medicina-familiar`) | `contagens/capa-flashcards-omitidos` (390/768/1024/1440) | capa 82 × distintos 95 | Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta. | José / editorial | Levar o cartão ao bloco que o ensina ou descartá-lo; reconferir |
| Semiología II (`semiologia-ii`) | `contagens/capa-flashcards-omitidos` (390/768/1024/1440) | capa 172 × distintos 184 | Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta. | José / editorial | Levar o cartão ao bloco que o ensina ou descartá-lo; reconferir |
| Histología I (`histologia-i`) | `contagens/capa-flashcards` (390/768/1024/1440) | capa 198 × distintos 184 | Mesmo com a agregadora excluída, os blocos repetem entre si 14+ itens (mesma frente/enunciado em mais de um bloco) e não há `id` canônico para distinguir cópia de homônimo. | José / editorial | Decidir o que fazer com flashcards repetidos entre blocos (ids canônicos); depois reconferir a capa |
| Histología I Práctica (`histologia-i-practica`) | `contagens/capa-flashcards` (390/768/1024/1440) | capa 126 × distintos 115 | Mesmo com a agregadora excluída, os blocos repetem entre si 11+ itens (mesma frente/enunciado em mais de um bloco) e não há `id` canônico para distinguir cópia de homônimo. | José / editorial | Decidir o que fazer com flashcards repetidos entre blocos (ids canônicos); depois reconferir a capa |
| Anatopatologia II (`anatomia-patologica-ii`) | `contagens/capa-flashcards` (390/768/1024/1440) | capa 160 × distintos 153 | Mesmo com a agregadora excluída, os blocos repetem entre si 7+ itens (mesma frente/enunciado em mais de um bloco) e não há `id` canônico para distinguir cópia de homônimo. | José / editorial | Decidir o que fazer com flashcards repetidos entre blocos (ids canônicos); depois reconferir a capa |
| Anatopatologia II Práctica (`anatomia-patologica-ii-practica`) | `contagens/capa-flashcards` (390/768/1024/1440) | capa 155 × distintos 146 | Mesmo com a agregadora excluída, os blocos repetem entre si 9+ itens (mesma frente/enunciado em mais de um bloco) e não há `id` canônico para distinguir cópia de homônimo. | José / editorial | Decidir o que fazer com flashcards repetidos entre blocos (ids canônicos); depois reconferir a capa |
| Guaraní (`guarani`) | `contagens/capa-flashcards` (390/768/1024/1440) | capa 298 × distintos 286 | Mesmo com a agregadora excluída, os blocos repetem entre si 12+ itens (mesma frente/enunciado em mais de um bloco) e não há `id` canônico para distinguir cópia de homônimo. | José / editorial | Decidir o que fazer com flashcards repetidos entre blocos (ids canônicos); depois reconferir a capa |

Gerado a partir de 27 resultados «como está» e 27 «com correção» em `docs/layout-ensaio/resultado-compacto.json` (os JSON completos por matéria não são versionados: ensaio.cjs os regenera).
