# Matriz PASSA / FALHA / BLOQUEADO por matéria · issue #457 (2.ª rodada, 11/10, `main` `d51cd1f4` com a caneta #479 aprovada)
> **Nada foi ativado em produção.** Flags, UID, slug do piloto, `index.html`, `rm-*.js/css`, `get-materia.js` e todas as matérias estão intactos. Zero escritas no Supabase (sessão simulada), nenhum áudio tocado. Nada para mergear sem auditoria.

Legenda: **PASSA** = todas as verificações da área passaram nas 4 larguras (390 · 768 · 1024 · 1440) · **FALHA** = alguma falhou e é reproduzível (causa e correção abaixo) · **BLOQUEADO** = não dá para verificar sem algo que este ensaio não pode fazer (p.ex. audiolibro sem manifesto autorizado).

Duas variantes do MESMO ensaio: **«como está»** (módulos reais do piloto, só com o patch mínimo de slug em memória: A1/A2/A7) e **«com correção»** (acrescenta C1–C8, os patches propostos em `PATCHES-PARA-INTEGRACAO.md`, também só em memória). O disco nunca é alterado. O **uso** (caneta real por CDP, palma, goma, pinça, recarregar, questões, flashcards, audiobook) está na matriz irmã `INTERACAO.md`.

## Avisos de leitura (obrigatórios)

1. **«Caneta PASSA» aqui = um traço SIMULADO** (`PointerEvent` sintético). Prova ancoragem, ocultação fora do bloco e que navegar não grava. A caneta com eventos confiáveis (CDP), palma, goma, pinça e recarregar está em `INTERACAO.md`; nenhum dos dois substitui o aparelho físico.
2. **Temas e descritores das 26 matérias sem tema próprio são HIPÓTESE TÉCNICA.** O ensaio os infere do conteúdo (blocos, unidades, agregadoras) e aplica a paleta do piloto só para exercitar os componentes. **Não são a identidade visual aprovada de nenhuma matéria** (decisão editorial G0/José). Só Semiología II usa o tema real.
3. **PASSA/FALHA descrevem o ensaio, não uma liberação.** Nada foi ativado; nenhuma matéria está aprovada para o layout novo por constar aqui.

## 0 · Já funciona no site × passou só com correções simuladas

| Grupo | Matérias | Situação **no site hoje** | Situação **no ensaio** |
|---|---|---|---|
| Piloto | Semiología II | **já funciona no site** (layout, navegação e caneta `456e` aprovada no iPad), só para as contas liberadas | como está: ❌ FALHA — defeitos que **já existem no piloto publicado**: `indice/sem-residuo`, `contagens/capa-flashcards-omitidos` · com correção: ✅ PASSA (as correções mudam esses detalhes no piloto: ver `PATCHES-PARA-INTEGRACAO.md`) |
| **Elegíveis** | 25 matérias | **não funciona no site**: o layout novo não roda fora do piloto (módulos presos ao slug; nenhuma flag liberada) | como está: 0 PASSA / 25 FALHA · **com correções simuladas (C1–C8, em memória): 25 PASSA / 0 FALHA** |
| Fora | Imagenología (`imagenologia`) | fora | fora da integração por decisão de José (12/10); continua medida só como referência · medida como referência: com correção ✅ PASSA |
| Fora | Bioestadística (`bioestadistica`) | fora | arquivo sem rota no catálogo (#213 encerrada sem merge): não é matéria ativa, não é ensaiada |

**«PASSA com correção» quer dizer: passou no Chromium com patches aplicados só na memória do servidor de teste.** Nenhum desses patches está no código publicado. Nada passa a funcionar no site até as PRs de integração serem mescladas **e** o servidor liberar a matéria, uma de cada vez.

## 1 · Resumo (27 do catálogo; ver §0 para o grupo de cada uma)

| Variante | Elegíveis PASSA | Elegíveis FALHA | Todas PASSA | Todas FALHA | BLOQUEADO | Sem dados |
|---|--:|--:|--:|--:|--:|--:|
| Como está | 0 | 25 | 0 | 27 | 0 | 0 |
| Com correções simuladas (C1–C8) | 25 | 0 | 27 | 0 | 0 | 0 |

**Audiolibro:** aqui (sem o boot de áudio) o ensaio prova a **ausência** nas 27 (card, player, chip, capa, pílula, lateral e requisição: PASSA). A **presença correta** — o `rm-audio-boot.js` real cria cards só nos blocos do manifesto (simulado) da Semiología II e fecha sem pedir manifesto nas outras 26 — está em `INTERACAO.md`. Áudio real (manifesto e URL assinada do servidor) continua dependendo do piloto/José (`AUDIOBOOKS-ESTADO-OPERACIONAL.md`).

### Por área (de 27 matérias)

| Área | PASSA hoje | FALHA hoje | PASSA com correção | FALHA com correção |
|---|--:|--:|--:|--:|
| Ativa | 27 | 0 | 27 | 0 |
| Índice | 4 | 23 | 27 | 0 |
| Blocos | 5 | 22 | 27 | 0 |
| Modos | 9 | 18 | 27 | 0 |
| Ausentes | 27 | 0 | 27 | 0 |
| Contagens | 7 | 20 | 27 | 0 |
| Teclado/Back | 27 | 0 | 27 | 0 |
| Scroll | 27 | 0 | 27 | 0 |
| Responsivo | 27 | 0 | 27 | 0 |
| Caneta (traço simulado) | 27 | 0 | 27 | 0 |
| Integridade | 27 | 0 | 27 | 0 |
| Áudio | 27 | 0 | 27 | 0 |

## 2 · Matriz por matéria («como está»)

| Semestre | Matéria | Grupo | Veredito | Ativa | Índice | Blocos | Modos | Ausentes | Contagens | Teclado/Back | Scroll | Responsivo | Caneta (traço simulado) | Integridade | Áudio | Audiolibro |
|--:|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | Anatopatologia I (`anatomia-patologica`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 8 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Anatopatologia Práctica (`anatomia-patologica-practica`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ❌ 8 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Fisiopatologia I (`fisiopatologia`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ❌ 1 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Imagenología (`imagenologia`) | fora | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Semiología I (`semiologia`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ❌ 1 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Farmacología I (`farmacologia`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ❌ 4 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Medicina Familiar (`medicina-familiar`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ✅ | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Semiología II (`semiologia-ii`) | piloto (já no site) | ❌ FALHA | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 piloto |
| 6 | Farmacología II (`farmacologia-ii`) | elegível | ❌ FALHA | ✅ | ❌ 6 | ❌ 4 | ❌ 8 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Embriología (`embriologia`) | elegível | ❌ FALHA | ✅ | ❌ 6 | ❌ 4 | ❌ 8 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Biología (`biologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Histología I (`histologia-i`) | elegível | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 8 | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Histología I Práctica (`histologia-i-practica`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Histología II Práctica (`histologia-ii-practica`) | elegível | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Histología II (`histologia-ii`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Anatomía I (`anatomia-i`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Anatopatologia II (`anatomia-patologica-ii`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Anatopatologia II Práctica (`anatomia-patologica-ii-practica`) | elegível | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Medicina Legal (`medicina-legal`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Fisiopatologia II (`fisiopatologia-ii`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Toxicología (`toxicologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Dermatología (`dermatologia`) | elegível | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Guaraní (`guarani`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Ortopedia y Traumatología (`ortopedia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Oftalmología (`oftalmologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Neurología (`neurologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Anestesiología (`anestesiologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |

Em «❌ N», N é o número de verificações que falharam (somando as 4 larguras).

## 3 · Matriz «com correções simuladas» (patches só em memória; não é o site)

| Semestre | Matéria | Situação no site | Veredito com correções simuladas | Ativa | Índice | Blocos | Modos | Ausentes | Contagens | Teclado/Back | Scroll | Responsivo | Caneta (traço simulado) | Integridade | Áudio |
|--:|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | Anatopatologia I | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Anatopatologia Práctica | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Fisiopatologia I | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Imagenología | ⛔ fora | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Semiología I | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Farmacología I | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Medicina Familiar | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Semiología II | ✅ já funciona (piloto) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Farmacología II | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Embriología | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Biología | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Histología I | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Histología I Práctica | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Histología II Práctica | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Histología II | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Anatomía I | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Anatopatologia II | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Anatopatologia II Práctica | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Medicina Legal | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Fisiopatologia II | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Toxicología | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Dermatología | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Guaraní | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Ortopedia y Traumatología | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Oftalmología | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Neurología | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Anestesiología | 🧪 não (só simulado) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

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
- **blocos/pager-cadeia** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · resolvida pela correção proposta
  - Medido: nenhuma seção interior sem título efetivo no módulo: ela quebra a cadeia Anterior/Próximo (o módulo esconde o link do vizinho sem título e o aluno fica sem saída) → `["analise-guia"]`
  - Causa: Seção interior sem `<h2>` (ex.: guía no meio do conteúdo) quebra a cadeia Anterior/Próximo: o aluno não consegue seguir lendo e só volta pelo índice.
  - Correção: C4 (título de reserva, verificado na variante «com correção») ou `<h2>` na seção.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=701","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/paginas-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"adaptacion","secs":["adaptacion"],"vis":{"figuras":1,"pregs":27,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":27,"outros":[["figFora",1]]}]`
  - Causa: Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.
  - Correção: C6 (verificado na variante «com correção»): no modo Preguntas o isolamento esconde o que vem antes do 1.º título/questão de cada `.quiz-section`. Editorial (melhor): levar a infografía para o resumo, antes das questões (G0: o resumo ensina, a questão cobra).

### Anatopatologia Práctica (`anatomia-patologica-practica`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=676","SECTION.container# h=9247"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 10001px) → `{"grid":true,"fim":1964,"sh":11965,"cover":[{"k":"fig","n":17},{"k":"quiz","n":76},{"k":"fc","n":341}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 92; capa mostra 341; DOM tem 341 → `{"capa":341,"distintos":92,"dom":341,"agregadoras":["b11","b12"]}`
  - Causa: A seção agregadora (b11, b12) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=676","SECTION.container# h=9247"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (9) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["b11","b12"],"listados":11}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.
- **modos/paginas-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"b1","secs":["b1"],"vis":{"figuras":0,"pregs":0,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":0},"real":10,"outros":[]},{"id":"b2","secs":["b2"],"vis":{"figuras":0,"pregs":0,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":0},"real":19,"outros":[]}]`
  - Causa: O lançador do mazo («Jugar») está dentro de `<details>` fechado e o isolamento do modo esconde o `<summary>` (só mantém o lançador e o caminho até ele): a página do modo mostra o bloco sem nada que o aluno possa abrir.
  - Correção: C7 (verificado na variante «com correção»): o `<summary>` de um `<details>` do caminho fica visível; o aluno abre com um toque.

### Fisiopatologia I (`fisiopatologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=722","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1406px) → `{"grid":true,"fim":2417,"sh":3823,"cover":[{"k":"fig","n":39},{"k":"quiz","n":332},{"k":"fc","n":130}],"unid":4}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · resolvida pela correção proposta
  - Medido: capa «Preguntas» não soma cópias: distintas 211–211; capa mostra 332; DOM tem 332 → `{"capa":332,"distintas":[211,211],"dom":332,"agregadoras":[]}`
  - Causa: As perguntas se repetem entre seções que não são cópia integral (p.ex. a seção de prova repete parte dos blocos) e não há `id` estável: o DOM soma duplicatas e a contagem exata é INDETERMINADA.
  - Correção: C5 (verificado na variante «com correção»): a capa conta itens DISTINTOS. Continua editorial: id canônico por item + `data-rm-copia-de` e decidir as repetições (8-A.1 do MANUTENCAO-DIDATICA).
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=722","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/paginas-preguntas** · larguras 1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «preguntas»: 13 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"hemorragia","secs":["hemorragia"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":6,"outros":[["figFora",1]]},{"id":"edema","secs":["edema"],"vis":{"figuras":1,"pregs":11,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"`
  - Causa: Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.
  - Correção: C6 (verificado na variante «com correção»): no modo Preguntas o isolamento esconde o que vem antes do 1.º título/questão de cada `.quiz-section`. Editorial (melhor): levar a infografía para o resumo, antes das questões (G0: o resumo ensina, a questão cobra).

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
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · resolvida pela correção proposta
  - Medido: capa «Preguntas» não soma cópias: distintas 143–145; capa mostra 220; DOM tem 220 → `{"capa":220,"distintas":[143,145],"dom":220,"agregadoras":[]}`
  - Causa: As perguntas se repetem entre seções que não são cópia integral (p.ex. a seção de prova repete parte dos blocos) e não há `id` estável: o DOM soma duplicatas e a contagem exata é INDETERMINADA.
  - Correção: C5 (verificado na variante «com correção»): a capa conta itens DISTINTOS. Continua editorial: id canônico por item + `data-rm-copia-de` e decidir as repetições (8-A.1 do MANUTENCAO-DIDATICA).
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=871","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/paginas-preguntas** · larguras 1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «preguntas»: 10 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"historia-clinica","secs":["historia-clinica"],"vis":{"figuras":1,"pregs":6,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":6,"outros":[["figFora",1]]},{"id":"torax-resp","secs":["torax-resp"],"vis":{"figuras":1,"pregs":4,"fc":0,"ab":0,"aus":0,"tab`
  - Causa: Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.
  - Correção: C6 (verificado na variante «com correção»): no modo Preguntas o isolamento esconde o que vem antes do 1.º título/questão de cada `.quiz-section`. Editorial (melhor): levar a infografía para o resumo, antes das questões (G0: o resumo ensina, a questão cobra).

### Farmacología I (`farmacologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=710","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1147px) → `{"grid":true,"fim":3084,"sh":4231,"cover":[{"k":"fig","n":52},{"k":"quiz","n":191},{"k":"fc","n":200},{"k":"vid","n":17}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-preguntas** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · resolvida pela correção proposta
  - Medido: capa «Preguntas» não soma cópias: distintas 166–166; capa mostra 191; DOM tem 191 → `{"capa":191,"distintas":[166,166],"dom":191,"agregadoras":[]}`
  - Causa: As perguntas se repetem entre seções que não são cópia integral (p.ex. a seção de prova repete parte dos blocos) e não há `id` estável: o DOM soma duplicatas e a contagem exata é INDETERMINADA.
  - Correção: C5 (verificado na variante «com correção»): a capa conta itens DISTINTOS. Continua editorial: id canônico por item + `data-rm-copia-de` e decidir as repetições (8-A.1 do MANUTENCAO-DIDATICA).
- **contagens/capa-flashcards-omitidos** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos 216; capa mostra 200 → `{"capa":200,"distintos":216,"soNaAgregadora":16}`
  - Causa: Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta.
  - Correção: C5 (verificado na variante «com correção») passa a contá-los. Continua editorial: levar o cartão ao bloco que o ensina ou descartá-lo (contrato §3).
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=710","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/paginas-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"pk","secs":["pk"],"vis":{"figuras":1,"pregs":16,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":1},"real":16,"outros":[["figFora",1]]}]`
  - Causa: Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.
  - Correção: C6 (verificado na variante «com correção»): no modo Preguntas o isolamento esconde o que vem antes do 1.º título/questão de cada `.quiz-section`. Editorial (melhor): levar a infografía para o resumo, antes das questões (G0: o resumo ensina, a questão cobra).

### Medicina Familiar (`medicina-familiar`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.hero# h=758","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral é o fim da página (sobram 1195px) → `{"grid":true,"fim":1996,"sh":3191,"cover":[{"k":"quiz","n":64},{"k":"fc","n":82}],"unid":5}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **contagens/capa-preguntas-omitidas** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · resolvida pela correção proposta
  - Medido: capa «Preguntas» não omite questões que o aluno encontra só no banco: distintas 89; capa mostra 64 → `{"capa":64,"distintas":89,"soNaAgregadora":25}`
  - Causa: Há questões só no banco geral (sem par no corpo) que a capa por bloco não conta.
  - Correção: C5 (verificado na variante «com correção») passa a contá-las. Continua editorial: levar a questão ao bloco que ensina o assunto (8-A.3) ou descartá-la.
- **contagens/capa-flashcards-omitidos** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos 95; capa mostra 82 → `{"capa":82,"distintos":95,"soNaAgregadora":13}`
  - Causa: Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta.
  - Correção: C5 (verificado na variante «com correção») passa a contá-los. Continua editorial: levar o cartão ao bloco que o ensina ou descartá-lo (contrato §3).
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=758","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Semiología II (`semiologia-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["SECTION.s2-hero rmc-hero# h=420"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards-omitidos** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não omite cartões que o aluno encontra só na revisão geral: distintos 184; capa mostra 172 → `{"capa":172,"distintos":184,"soNaAgregadora":12}`
  - Causa: Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta.
  - Correção: C5 (verificado na variante «com correção») passa a contá-los. Continua editorial: levar o cartão ao bloco que o ensina ou descartá-lo (contrato §3).

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
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 184; capa mostra 396; DOM tem 396 → `{"capa":396,"distintos":184,"dom":396,"agregadoras":["histo14"]}`
  - Causa: A seção agregadora (histo14) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
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
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 115; capa mostra 126; DOM tem 286 → `{"capa":126,"distintos":115,"dom":286,"agregadoras":["bancofc","bancoruleta"]}`
  - Causa: A seção agregadora (bancofc, bancoruleta) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
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
- **modos/paginas-preguntas** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «preguntas»: 2 página(s) modo+bloco mostram só o recurso, com a contagem real, sem página vazia → `[{"id":"a1b01","secs":["a1b01"],"vis":{"figuras":0,"pregs":0,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":0},"real":13,"outros":[]},{"id":"a1b02","secs":["a1b02"],"vis":{"figuras":0,"pregs":0,"fc":0,"ab":0,"aus":0,"tablas":0,"figFora":0},"real":13,"outros":[]}]`
  - Causa: Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.
  - Correção: C6 (verificado na variante «com correção»): no modo Preguntas o isolamento esconde o que vem antes do 1.º título/questão de cada `.quiz-section`. Editorial (melhor): levar a infografía para o resumo, antes das questões (G0: o resumo ensina, a questão cobra).

### Anatopatologia II (`anatomia-patologica-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original (hero, banner de revisão…) fica visível abaixo do índice geral → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 153; capa mostra 160; DOM tem 480 → `{"capa":160,"distintos":153,"dom":480,"agregadoras":["bancofcap2"]}`
  - Causa: A seção agregadora (bancofcap2) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Anatopatologia II Práctica (`anatomia-patologica-ii-practica`)

- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 146; capa mostra 465; DOM tem 465 → `{"capa":465,"distintos":146,"dom":465,"agregadoras":["ap2pmazo"]}`
  - Causa: A seção agregadora (ap2pmazo) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
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
- **contagens/capa-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: capa «Flashcards» não soma cópias: distintos 286; capa mostra 596; DOM tem 596 → `{"capa":596,"distintos":286,"dom":596,"agregadoras":["mazognrl"]}`
  - Causa: A seção agregadora (mazognrl) repete os flashcards dos blocos e o módulo a soma, porque o id não casa a heurística `/banco|flashcards/i` (rm-materia-nav.js:90, rm-layout.js:472).
  - Correção: C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».
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
| `contagens/capa-flashcards` | 15 | modulo | sim, em todas |
| `modos/indice-flashcards` | 13 | modulo | sim, em todas |
| `indice/indice-e-o-fim` | 9 | modulo | sim, em todas |
| `contagens/capa-preguntas` | 6 | modulo+conteudo | sim, em todas |
| `modos/paginas-preguntas` | 5 | modulo | sim, em todas |
| `contagens/capa-flashcards-omitidos` | 3 | modulo+conteudo | sim, em todas |
| `modos/indice-preguntas` | 3 | modulo | sim, em todas |
| `blocos/pager-cadeia` | 1 | modulo+conteudo | sim, em todas |
| `modos/paginas-flashcards` | 1 | modulo | sim, em todas |
| `contagens/capa-preguntas-omitidas` | 1 | modulo+conteudo | sim, em todas |

## 6 · Risco por grupo (semestre)

| Semestre | Matérias | Veredito hoje (PASSA/FALHA/BLOQ.) | Com correção | Risco principal |
|--:|---|:-:|:-:|---|
| 1º | Biología, Histología I, Histología I Práctica, Anatomía I | 0/4/0 | 4/0/0 | indice/sem-residuo (12); blocos/sem-residuo-bloco (12) |
| 2º | Embriología, Histología II Práctica, Histología II, Guaraní | 0/4/0 | 4/0/0 | indice/sem-residuo (12); contagens/capa-flashcards (12) |
| 5º | Anatopatologia I, Anatopatologia Práctica, Fisiopatologia I, Imagenología, Semiología I, Farmacología I, Medicina Familiar | 0/7/0 | 7/0/0 | indice/sem-residuo (28); indice/indice-e-o-fim (28) |
| 6º | Semiología II, Farmacología II, Anatopatologia II, Anatopatologia II Práctica, Medicina Legal, Fisiopatologia II | 0/6/0 | 6/0/0 | indice/sem-residuo (20); contagens/capa-flashcards (16) |
| 7º | Toxicología, Dermatología, Ortopedia y Traumatología, Oftalmología, Neurología, Anestesiología | 0/6/0 | 6/0/0 | indice/sem-residuo (20); contagens/capa-flashcards (20) |

## 7 · Bloqueios e pendências (não resolvidos nesta PR)

- **Integração dos patches** (`PATCHES-PARA-INTEGRACAO.md`): tocam módulos do piloto e áreas críticas (`rm-layout.js`, `rm-materia-nav.js`, `rm-materia-sistema.js/css`, `rm-tools-v2.js`, `rm-audio-boot.js`, `rm-pilot.js`, funções do Netlify). A caneta (#456) já foi aprovada no piloto; a integração segue em PR própria, auditada, sem ativar nenhuma matéria.
- **Descritor/tema por matéria**: hoje existe só o de Semiología II. Os 26 descritores do ensaio são **hipótese técnica inferida do conteúdo** (paleta e vinhetas do piloto), **não identidade visual aprovada**. Aprovar identidade, unidades e numeração de cada matéria é decisão editorial (G0/José), fora desta PR.
- **Audiolibro**: fora do piloto não há manifesto autorizado (A4/A6 não aplicados): nenhuma matéria pode ter card real; a presença/ausência correta do código atual está provada em `INTERACAO.md`.
- **Conteúdo**: `<h2>` ausente em seções de portada/guia, ids de questão ausentes, agregadoras sem marcador e números de portada divergentes estão em `CONFORMIDADE.md` — são edições editoriais por matéria, não feitas aqui.

## 8 · Falhas que restam mesmo com a correção proposta (C1–C8)

**Nenhuma.** Com C1–C8 em memória as 27 matérias passam em todas as áreas nas 4 larguras. Isso não dispensa as decisões editoriais que C5/C6 apenas contornam (repetições entre blocos, itens só no banco, infografía dentro do contêiner de questões): ver `PENDENCIAS-ENSAIO-GLOBAL.md`.

Gerado a partir de 27 resultados «como está» e 27 «com correção» em `docs/layout-ensaio/resultado-compacto.json` (os JSON completos por matéria não são versionados: ensaio.cjs os regenera).
