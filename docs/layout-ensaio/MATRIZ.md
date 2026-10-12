# Matriz PASSA / FALHA / BLOQUEADO por matéria · issue #457 (2.ª rodada, 11/10, `main` `d51cd1f4` com a caneta #479 aprovada)
> **Nada foi ativado em produção.** Flags, UID, slug do piloto, `index.html`, `rm-*.js/css`, `get-materia.js` e todas as matérias estão intactos. Zero escritas no Supabase (sessão simulada), nenhum áudio tocado. Nada para mergear sem auditoria.

Legenda: **PASSA** = todas as verificações da área passaram nas 4 larguras (390 · 768 · 1024 · 1440) · **FALHA** = alguma falhou e é reproduzível (causa e correção abaixo) · **BLOQUEADO** = não dá para verificar sem algo que este ensaio não pode fazer (p.ex. audiolibro sem manifesto autorizado).

Duas variantes do MESMO ensaio: **«como está»** (módulos reais do piloto, só com o patch mínimo de slug em memória: A1/A2/A7) e **«com correção»** (acrescenta C1–C8, os patches propostos em `PATCHES-PARA-INTEGRACAO.md`, também só em memória). O disco nunca é alterado. O **uso** (caneta real por CDP, palma, goma, pinça, recarregar, questões, flashcards, audiobook) está na matriz irmã `INTERACAO.md`.

## Avisos de leitura (obrigatórios)

1. **«Caneta PASSA» aqui = um traço SIMULADO** (`PointerEvent` sintético). Prova ancoragem, ocultação fora do bloco e que navegar não grava. A caneta com eventos confiáveis (CDP), palma, goma, pinça e recarregar está em `INTERACAO.md`; nenhum dos dois substitui o aparelho físico.
2. **Temas e descritores das 26 matérias sem tema próprio são HIPÓTESE TÉCNICA.** O ensaio os infere do conteúdo (blocos, unidades, agregadoras) e aplica a paleta do piloto só para exercitar os componentes. **Não são a identidade visual aprovada de nenhuma matéria** (decisão editorial G0/José). Só Semiología II usa o tema real.
3. **PASSA/FALHA descrevem o ensaio, não uma liberação.** Nada foi ativado; nenhuma matéria está aprovada para o layout novo por constar aqui.

## 0-A · Quais são as matérias (lista exata e contagem)

Fonte: catálogo do site (`RM_CATALOGO` em `index.html`) × `FILES` de `netlify/functions/get-materia.js` × arquivos em `materias/` (`lib.cjs → reconciliar()`, lido do disco nesta geração).

| # | slug | arquivo | matéria | grupo |
|--:|---|---|---|---|
| 1 | `anatomia-patologica` | `anatomia-patologica.html` | Anatopatologia I | elegível |
| 2 | `anatomia-patologica-practica` | `anatomia-patologica-practica.html` | Anatopatologia Práctica | elegível |
| 3 | `fisiopatologia` | `fisiopatologia.html` | Fisiopatologia I | elegível |
| 4 | `imagenologia` | `imagenologia.html` | Imagenología | fora (decisão de José) |
| 5 | `semiologia` | `semiologia.html` | Semiología I | elegível |
| 6 | `farmacologia` | `farmacologia.html` | Farmacología I | elegível |
| 7 | `medicina-familiar` | `medicina-familiar.html` | Medicina Familiar | elegível |
| 8 | `semiologia-ii` | `semiologia-ii.html` | Semiología II | piloto (já no site) |
| 9 | `farmacologia-ii` | `farmacologia-ii.html` | Farmacología II | elegível |
| 10 | `embriologia` | `embriologia.html` | Embriología | elegível |
| 11 | `biologia` | `biologia.html` | Biología | elegível |
| 12 | `histologia-i` | `histologia-i.html` | Histología I | elegível |
| 13 | `histologia-i-practica` | `histologia-i-practica.html` | Histología I Práctica | elegível |
| 14 | `histologia-ii-practica` | `histologia-ii-practica.html` | Histología II Práctica | elegível |
| 15 | `histologia-ii` | `histologia-ii.html` | Histología II | elegível |
| 16 | `anatomia-i` | `anatomia-i.html` | Anatomía I | elegível |
| 17 | `anatomia-patologica-ii` | `anatomia-patologica-ii.html` | Anatopatologia II | elegível |
| 18 | `anatomia-patologica-ii-practica` | `anatomia-patologica-ii-practica.html` | Anatopatologia II Práctica | elegível |
| 19 | `medicina-legal` | `medicina-legal.html` | Medicina Legal | elegível |
| 20 | `fisiopatologia-ii` | `fisiopatologia-ii.html` | Fisiopatologia II | elegível |
| 21 | `toxicologia` | `toxicologia.html` | Toxicología | elegível |
| 22 | `dermatologia` | `dermatologia.html` | Dermatología | elegível |
| 23 | `guarani` | `guarani.html` | Guaraní | elegível |
| 24 | `ortopedia` | `ortopedia.html` | Ortopedia y Traumatología | elegível |
| 25 | `oftalmologia` | `oftalmologia.html` | Oftalmología | elegível |
| 26 | `neurologia` | `neurologia.html` | Neurología | elegível |
| 27 | `anestesiologia` | `anestesiologia.html` | Anestesiología | elegível |

| Conta | n | slugs |
|---|--:|---|
| Matérias ativas (catálogo **e** `get-materia` **e** arquivo) | **27** | — (lista acima) |
| − piloto | 1 | `semiologia-ii` |
| − fora, entre as ativas | 1 | `imagenologia` |
| **= elegíveis** | **25** | as linhas «elegível» acima |
| Fora, **não** ativa (arquivo sem rota) | 1 | `bioestadistica` — não está no catálogo nem no `get-materia`; não conta nas 27 |
| Arquivos órfãos em `materias/` (não são matérias) | 3 | `anatomiapatologica-ii-practica.html`, `anatomiapatologica-ii.html`, `bioestadistica.html` |
| Só no catálogo / só no `get-materia` / arquivo faltando | 0 / 0 / 0 | — |

**Reconciliação:** 27 ativas = 1 piloto + 1 fora (Imagenología) + **25 elegíveis**. Bioestadística é a 2.ª excluída, mas **não está entre as 27** (`bioestadistica.html` existe só como arquivo, sem rota: #213 encerrada sem merge). Por isso «25/25» abaixo é sempre sobre esta lista de 25 e **nunca inclui o piloto**. A #484 escreve «25 elegíveis = tudo exceto Bioestadística/Imagenología»: essa frase só fecha em 25 se o piloto estiver dentro e Bioestadística fosse uma das ativas. O conjunto deste ensaio é o da tabela acima (piloto à parte).

## 0 · Já funciona no site × passou só no ensaio

| Grupo | Matérias | Situação **no site hoje** | Situação **no ensaio** |
|---|---|---|---|
| Piloto | Semiología II | **já funciona no site** (layout, navegação e caneta `456e` aprovada no iPad), só para as contas liberadas | como está: ❌ FALHA — defeitos que **já existem no piloto publicado**: `indice/sem-residuo` · com correção: ✅ PASSA (as correções mudam esses detalhes no piloto: ver `PATCHES-PARA-INTEGRACAO.md`) |
| **Elegíveis** | 25 matérias (§0-A) | **não funciona no site**: nenhuma matéria além do piloto é ligada (flags e contas intactas) | como está: 0 PASSA / 25 FALHA · **com correção: 25 PASSA / 0 FALHA** (origem de cada correção logo abaixo) |
| Fora | Imagenología (`imagenologia`) | fora | fora da integração por decisão de José (12/10); continua medida só como referência · medida como referência: com correção ✅ PASSA |
| Fora | Bioestadística (`bioestadistica`) | fora | arquivo sem rota no catálogo (#213 encerrada sem merge): não é matéria ativa, não é ensaiada |

**De onde vem cada correção na variante «com correção»** (lido de `adaptacoes` dos resultados e do código no disco):

| Origem | Correções | O que isso quer dizer |
|---|---|---|
| **já na main** | A1, C1, C2, C5a, C5b, C5c, C6, C7 | código mesclado (#486, #488…): vale para o site assim que uma matéria for ligada |
| **PR aberta** (servida por `RM_ENSAIO_REF` = `5cc04ddf`) | A2, C3, C4, A3 | código real, mas **ainda não mesclado** (#487): só vale depois do merge |
| **simulada em memória** | A7, C8 + descritor de tema por matéria | A7/C8 = caneta (aguardam a #484, não mexemos no motor); o descritor é hipótese técnica, não identidade aprovada |

**«PASSA com correção» quer dizer: passou no Chromium com o código acima** — parte já na main, parte numa PR aberta, a caneta simulada. Nada passa a funcionar no site até as PRs de integração serem mescladas **e** o servidor liberar a matéria, uma de cada vez.

## 1 · Resumo (27 do catálogo; ver §0 para o grupo de cada uma)

| Variante | Elegíveis PASSA | Elegíveis FALHA | Todas PASSA | Todas FALHA | BLOQUEADO | Sem dados |
|---|--:|--:|--:|--:|--:|--:|
| Como está | 0 | 25 | 0 | 27 | 0 | 0 |
| Com correção (origem em §0) | 25 | 0 | 27 | 0 | 0 | 0 |

**Audiolibro:** aqui (sem o boot de áudio) o ensaio prova a **ausência** nas 27 (card, player, chip, capa, pílula, lateral e requisição: PASSA). A **presença correta** — o `rm-audio-boot.js` real cria cards só nos blocos do manifesto (simulado) da Semiología II e fecha sem pedir manifesto nas outras 26 — está em `INTERACAO.md`. Áudio real (manifesto e URL assinada do servidor) continua dependendo do piloto/José (`AUDIOBOOKS-ESTADO-OPERACIONAL.md`).

### Por área (de 27 matérias)

| Área | PASSA hoje | FALHA hoje | PASSA com correção | FALHA com correção |
|---|--:|--:|--:|--:|
| Ativa | 27 | 0 | 27 | 0 |
| Índice | 4 | 23 | 27 | 0 |
| Blocos | 5 | 22 | 27 | 0 |
| Modos | 14 | 13 | 27 | 0 |
| Ausentes | 27 | 0 | 27 | 0 |
| Contagens | 27 | 0 | 27 | 0 |
| Teclado/Back | 27 | 0 | 27 | 0 |
| Scroll | 27 | 0 | 27 | 0 |
| Responsivo | 27 | 0 | 27 | 0 |
| Caneta (traço simulado) | 27 | 0 | 27 | 0 |
| Integridade | 27 | 0 | 27 | 0 |
| Áudio | 27 | 0 | 27 | 0 |

## 2 · Matriz por matéria («como está»)

| Semestre | Matéria | Grupo | Veredito | Ativa | Índice | Blocos | Modos | Ausentes | Contagens | Teclado/Back | Scroll | Responsivo | Caneta (traço simulado) | Integridade | Áudio | Audiolibro |
|--:|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | Anatopatologia I (`anatomia-patologica`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Anatopatologia Práctica (`anatomia-patologica-practica`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Fisiopatologia I (`fisiopatologia`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Imagenología (`imagenologia`) | fora | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Semiología I (`semiologia`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Farmacología I (`farmacologia`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 5 | Medicina Familiar (`medicina-familiar`) | elegível | ❌ FALHA | ✅ | ❌ 8 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Semiología II (`semiologia-ii`) | piloto (já no site) | ❌ FALHA | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 piloto |
| 6 | Farmacología II (`farmacologia-ii`) | elegível | ❌ FALHA | ✅ | ❌ 6 | ❌ 4 | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Embriología (`embriologia`) | elegível | ❌ FALHA | ✅ | ❌ 6 | ❌ 4 | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Biología (`biologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Histología I (`histologia-i`) | elegível | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Histología I Práctica (`histologia-i-practica`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Histología II Práctica (`histologia-ii-practica`) | elegível | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Histología II (`histologia-ii`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 1 | Anatomía I (`anatomia-i`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Anatopatologia II (`anatomia-patologica-ii`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Anatopatologia II Práctica (`anatomia-patologica-ii-practica`) | elegível | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Medicina Legal (`medicina-legal`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 6 | Fisiopatologia II (`fisiopatologia-ii`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Toxicología (`toxicologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Dermatología (`dermatologia`) | elegível | ❌ FALHA | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 2 | Guaraní (`guarani`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Ortopedia y Traumatología (`ortopedia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Oftalmología (`oftalmologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Neurología (`neurologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |
| 7 | Anestesiología (`anestesiologia`) | elegível | ❌ FALHA | ✅ | ❌ 4 | ❌ 4 | ❌ 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟨 |

Em «❌ N», N é o número de verificações que falharam (somando as 4 larguras).

## 3 · Matriz «com correção» (código das PRs de integração + caneta simulada; origem em §0; não é o site)

| Semestre | Matéria | Situação no site | Veredito com correção | Ativa | Índice | Blocos | Modos | Ausentes | Contagens | Teclado/Back | Scroll | Responsivo | Caneta (traço simulado) | Integridade | Áudio |
|--:|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | Anatopatologia I | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Anatopatologia Práctica | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Fisiopatologia I | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Imagenología | ⛔ fora | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Semiología I | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Farmacología I | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Medicina Familiar | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Semiología II | ✅ já funciona (piloto) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Farmacología II | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Embriología | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Biología | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Histología I | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Histología I Práctica | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Histología II Práctica | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Histología II | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1 | Anatomía I | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Anatopatologia II | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Anatopatologia II Práctica | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Medicina Legal | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Fisiopatologia II | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Toxicología | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Dermatología | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Guaraní | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Ortopedia y Traumatología | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Oftalmología | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Neurología | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Anestesiología | 🧪 não (só no ensaio) | ✅ PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## 4 · Falhas reproduzíveis por matéria (causa e correção)

### Anatopatologia I (`anatomia-patologica`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.hero# h=701","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral (com a apresentação/conteúdo preservados) é o fim da página (sobram 1505px) → `{"grid":true,"fim":2644,"sh":4149,"cover":[{"k":"fig","n":31},{"k":"quiz","n":359},{"k":"fc","n":161}],"unid":6}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/pager-cadeia** · larguras 390/768/1024/1440 · escopo: modulo+conteudo · resolvida pela correção proposta
  - Medido: nenhuma seção interior sem título efetivo no módulo: ela quebra a cadeia Anterior/Próximo (o módulo esconde o link do vizinho sem título e o aluno fica sem saída) → `["analise-guia"]`
  - Causa: Seção interior sem `<h2>` (ex.: guía no meio do conteúdo) quebra a cadeia Anterior/Próximo: o aluno não consegue seguir lendo e só volta pelo índice.
  - Correção: C4 (título de reserva, verificado na variante «com correção») ou `<h2>` na seção.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=701","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Anatopatologia Práctica (`anatomia-patologica-practica`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.hero# h=676","SECTION.container# h=9247"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral (com a apresentação/conteúdo preservados) é o fim da página (sobram 10001px) → `{"grid":true,"fim":1964,"sh":11965,"cover":[{"k":"fig","n":17},{"k":"quiz","n":76},{"k":"fc","n":92}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=676","SECTION.container# h=9247"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (9) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["b11","b12"],"listados":11}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Fisiopatologia I (`fisiopatologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.hero# h=722","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral (com a apresentação/conteúdo preservados) é o fim da página (sobram 1406px) → `{"grid":true,"fim":2417,"sh":3823,"cover":[{"k":"fig","n":39},{"k":"quiz","n":211},{"k":"fc","n":130}],"unid":4}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=722","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Imagenología (`imagenologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.hero# h=526","DIV.rm-revisao-banner#revisao-geral h=422"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral (com a apresentação/conteúdo preservados) é o fim da página (sobram 1093px) → `{"grid":true,"fim":2033,"sh":3126,"cover":[{"k":"fig","n":20},{"k":"quiz","n":87},{"k":"fc","n":74}],"unid":3}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=526","DIV.rm-revisao-banner#revisao-geral h=422"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Semiología I (`semiologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.hero# h=871","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral (com a apresentação/conteúdo preservados) é o fim da página (sobram 1308px) → `{"grid":true,"fim":2315,"sh":3623,"cover":[{"k":"fig","n":27},{"k":"quiz","n":145},{"k":"fc","n":96},{"k":"aud","n":6},{"k":"vid","n":13}],"unid":5}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=871","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Farmacología I (`farmacologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.hero# h=710","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral (com a apresentação/conteúdo preservados) é o fim da página (sobram 1147px) → `{"grid":true,"fim":3084,"sh":4231,"cover":[{"k":"fig","n":52},{"k":"quiz","n":166},{"k":"fc","n":216},{"k":"vid","n":17}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=710","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Medicina Familiar (`medicina-familiar`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.hero# h=758","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral (com a apresentação/conteúdo preservados) é o fim da página (sobram 1195px) → `{"grid":true,"fim":1996,"sh":3191,"cover":[{"k":"quiz","n":90},{"k":"fc","n":95}],"unid":5}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=758","DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Semiología II (`semiologia-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.s2-hero rmc-hero# h=420"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».

### Farmacología II (`farmacologia-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.hero# h=679"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/1024 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral (com a apresentação/conteúdo preservados) é o fim da página (sobram 732px) → `{"grid":true,"fim":2378,"sh":3110,"cover":[{"k":"quiz","n":214},{"k":"fc","n":292},{"k":"vid","n":9}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=679"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
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
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["SECTION.hero# h=710"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **indice/indice-e-o-fim** · larguras 390/1024 · escopo: modulo · resolvida pela correção proposta
  - Medido: o índice geral (com a apresentação/conteúdo preservados) é o fim da página (sobram 762px) → `{"grid":true,"fim":2435,"sh":3197,"cover":[{"k":"fig","n":39},{"k":"quiz","n":107},{"k":"fc","n":145},{"k":"vid","n":3}],"unid":2}`
  - Causa: Sobra conteúdo original depois do índice (hero, banner, rodapé).
  - Correção: C3.
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["SECTION.hero# h=710"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
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
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Histología I (`histologia-i`)

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
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Histología II Práctica (`histologia-ii-practica`)

- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (16) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["h2pmazo"],"listados":17}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Histología II (`histologia-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Anatomía I (`anatomia-i`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Anatopatologia II (`anatomia-patologica-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Anatopatologia II Práctica (`anatomia-patologica-ii-practica`)

- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (7) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["ap2pmazo"],"listados":8}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Medicina Legal (`medicina-legal`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Fisiopatologia II (`fisiopatologia-ii`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (14) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["revisaofp2"],"listados":15}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Toxicología (`toxicologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (16) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["toxcierre"],"listados":17}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Dermatología (`dermatologia`)

- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (13) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["dermcierre"],"listados":14}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Guaraní (`guarani`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (13) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["mazognrl"],"listados":14}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Ortopedia y Traumatología (`ortopedia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.

### Oftalmología (`oftalmologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (9) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["oftcierre"],"listados":10}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Neurología (`neurologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=431"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
  - Correção: C3.
- **modos/indice-flashcards** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: «flashcards»: o índice lista exatamente os blocos que têm o recurso (19) → `{"nav":"modeidx","mode":"flashcards","faltam":[],"sobram":["revisaoneu"],"listados":20}`
  - Causa: A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.
  - Correção: C1/C2.

### Anestesiología (`anestesiologia`)

- **indice/sem-residuo** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: nada do conteúdo original solto fica visível abaixo do índice geral, exceto o que foi preservado de propósito (apresentação/conteúdo classificados) → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.
  - Correção: C3 (#487: classifica cada filho solto — abertura/fecho/conteúdo ficam no índice geral, anexo só com o seu bloco; nada útil some — ver CONTEUDO-SOLTO.md). Verificado na variante «com correção».
- **blocos/sem-residuo-bloco** · larguras 390/768/1024/1440 · escopo: modulo · resolvida pela correção proposta
  - Medido: na leitura de um bloco nada do conteúdo original (hero, banner) aparece fora dele → `["DIV.rm-revisao-banner#revisao-geral h=330"]`
  - Causa: Idem: o hero/banner/seção sem id original aparece acima/abaixo do bloco aberto.
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
| `modos/indice-flashcards` | 13 | modulo | sim, em todas |
| `indice/indice-e-o-fim` | 9 | modulo | sim, em todas |
| `modos/indice-preguntas` | 3 | modulo | sim, em todas |
| `blocos/pager-cadeia` | 1 | modulo+conteudo | sim, em todas |

## 6 · Risco por grupo (semestre)

| Semestre | Matérias | Veredito hoje (PASSA/FALHA/BLOQ.) | Com correção | Risco principal |
|--:|---|:-:|:-:|---|
| 1º | Biología, Histología I, Histología I Práctica, Anatomía I | 0/4/0 | 4/0/0 | indice/sem-residuo (12); blocos/sem-residuo-bloco (12) |
| 2º | Embriología, Histología II Práctica, Histología II, Guaraní | 0/4/0 | 4/0/0 | indice/sem-residuo (12); blocos/sem-residuo-bloco (12) |
| 5º | Anatopatologia I, Anatopatologia Práctica, Fisiopatologia I, Imagenología, Semiología I, Farmacología I, Medicina Familiar | 0/7/0 | 7/0/0 | indice/sem-residuo (28); indice/indice-e-o-fim (28) |
| 6º | Semiología II, Farmacología II, Anatopatologia II, Anatopatologia II Práctica, Medicina Legal, Fisiopatologia II | 0/6/0 | 6/0/0 | indice/sem-residuo (20); blocos/sem-residuo-bloco (16) |
| 7º | Toxicología, Dermatología, Ortopedia y Traumatología, Oftalmología, Neurología, Anestesiología | 0/6/0 | 6/0/0 | indice/sem-residuo (20); blocos/sem-residuo-bloco (20) |

## 7 · Bloqueios e pendências (não resolvidos nesta PR)

- **Integração dos patches** (`PATCHES-PARA-INTEGRACAO.md`): tocam módulos do piloto e áreas críticas (`rm-layout.js`, `rm-materia-nav.js`, `rm-materia-sistema.js/css`, `rm-tools-v2.js`, `rm-audio-boot.js`, `rm-pilot.js`, funções do Netlify). A caneta (#456) já foi aprovada no piloto; a integração segue em PR própria, auditada, sem ativar nenhuma matéria.
- **Descritor/tema por matéria**: hoje existe só o de Semiología II. Os 26 descritores do ensaio são **hipótese técnica inferida do conteúdo** (paleta e vinhetas do piloto), **não identidade visual aprovada**. Aprovar identidade, unidades e numeração de cada matéria é decisão editorial (G0/José), fora desta PR.
- **Audiolibro**: fora do piloto não há manifesto autorizado (A4/A6 não aplicados): nenhuma matéria pode ter card real; a presença/ausência correta do código atual está provada em `INTERACAO.md`.
- **Conteúdo**: `<h2>` ausente em seções de portada/guia, ids de questão ausentes, agregadoras sem marcador e números de portada divergentes estão em `CONFORMIDADE.md` — são edições editoriais por matéria, não feitas aqui.

## 8 · Falhas que restam mesmo com a correção proposta (C1–C8)

**Nenhuma.** Com C1–C8 em memória as 27 matérias passam em todas as áreas nas 4 larguras. Isso não dispensa as decisões editoriais que C5/C6 apenas contornam (repetições entre blocos, itens só no banco, infografía dentro do contêiner de questões): ver `PENDENCIAS-ENSAIO-GLOBAL.md`.

Gerado a partir de 27 resultados «como está» e 27 «com correção» em `docs/layout-ensaio/resultado-compacto.json` (os JSON completos por matéria não são versionados: ensaio.cjs os regenera).
