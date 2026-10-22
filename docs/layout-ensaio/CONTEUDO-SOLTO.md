# Conteúdo fora de `section[id]` na navegação — inventário (#487)

Gerado por `tools/qa/ensaio-layout/soltos.cjs` (1440 px, navegação montada) + `soltos-md.cjs`. **Antes** = main (`disco`, 2026-10-12) · **depois** = código da #487 (`e9ae75d2`).
Os controles do site (`.rm-tools`, `.rm-sug-fab`, `.rm-menu`) ficam fora: o layout já os esconde na main e não são conteúdo.

**A 1.ª versão da #487** escondia com a navegação montada **tudo** o que está fora de `section[id]` — no índice geral e em todos os blocos. Este inventário mediu o que isso tiraria do aluno:
o hero de abertura das matérias que o têm, o banner «Repaso General · Simulacro» (anexo do 1.º bloco do banco, criado pelo `app-core.js`) e, na Anatomía Patológica Práctica,
uma `<section class="container">` **sem id** com **20 questões**, que ficaria inalcançável. A regra foi trocada por uma classificação.

## Regra nova (código da #487)
| classe | o que é | índice geral («Página completa» da navegação) | bloco | sem navegação |
|---|---|---|---|---|
| abertura | antes do 1.º bloco (hero, cabeçalho) | visível (como na main) | escondida | como sempre |
| conteúdo | tem questão/flashcard/figura/tabela/mídia, ou fica entre blocos sem um bloco logo depois | **visível** | escondido | como sempre |
| anexo | texto entre blocos com um bloco logo depois (`data-rm-anexo-de`) | escondido | **só no bloco dele**; em modo+bloco o filtro do modo (já na main) mostra só o recurso | como sempre |
| fecho | depois do último bloco | visível | escondido | como sempre |

## Resumo por elemento
Colunas de visibilidade: **main** índice / outro bloco · **#487** índice / outro bloco / bloco do anexo / sem navegação.

| elemento | classe | matérias | main | #487 | útil? | decisão |
|---|---|---|---|---|---|---|
| `HEADER.rm-subject-head` | abertura | 27: anatomia-patologica, anatomia-patologica-practica, fisiopatologia, imagenologia (fora), semiologia, farmacologia, medicina-familiar, semiologia-ii (piloto), farmacologia-ii, embriologia, biologia, histologia-i, histologia-i-practica, histologia-ii-practica, histologia-ii, anatomia-i, anatomia-patologica-ii, anatomia-patologica-ii-practica, medicina-legal, fisiopatologia-ii, toxicologia, dermatologia, guarani, ortopedia, oftalmologia, neurologia, anestesiologia | não / não | não / não / – / não | não (menu/cabeçalho que o layout substitui) | sem mudança (o layout já o esconde) |
| `DIV.rm-revisao-banner` | anexo | 19: anatomia-patologica, fisiopatologia, imagenologia (fora), semiologia, farmacologia, medicina-familiar, biologia, histologia-i-practica, histologia-ii, anatomia-i, anatomia-patologica-ii, medicina-legal, fisiopatologia-ii, toxicologia, guarani, ortopedia, oftalmologia, neurologia, anestesiologia | sim / sim | não / não / sim / sim | sim (resumo do banco) | acompanha o seu bloco; não vaza para os outros |
| `SECTION.hero` | abertura | 9: anatomia-patologica, anatomia-patologica-practica, fisiopatologia, imagenologia (fora), semiologia, farmacologia, medicina-familiar, farmacologia-ii, embriologia | sim / sim | sim / não / – / sim | sim (apresentação da matéria) | fica no índice geral (como hoje); não vaza para os blocos |
| `NAV.nav` | abertura | 7: anatomia-patologica, anatomia-patologica-practica, fisiopatologia, imagenologia (fora), semiologia, farmacologia, medicina-familiar | não / não | não / não / – / não | não (menu/cabeçalho que o layout substitui) | sem mudança (o layout já o esconde) |
| `SECTION.container` | conteúdo | 1: anatomia-patologica-practica | sim / sim | sim / não / – / sim | sim (20 questões) | fica no índice geral; não vaza para os blocos |
| `SECTION.s2-hero` | abertura | 1: semiologia-ii (piloto) | sim / não | sim / não / – / sim | sim (apresentação da matéria) | fica no índice geral (como hoje); não vaza para os blocos |

## O que a regra nova muda para o aluno (navegação montada)
- **Índice geral:** nada útil some. O hero continua onde está hoje; a seção sem id da AP Práctica (20 questões) continua visível, como hoje.
- **Blocos:** deixam de mostrar o que não é deles. Na main, o hero e o banner apareciam **em todos os blocos** (resíduo medido pelo ensaio); agora o banner aparece só com o bloco do banco, e o hero e a seção sem id não aparecem em bloco nenhum.
- **Piloto (Semiología II):** sem mudança — o `.s2-hero` segue no índice geral e escondido nos blocos, como hoje.
- **Sem navegação (tema desligado / conta sem o tema):** sem mudança; nenhum atributo fica depois do detach.

## Recomendação editorial (não feita aqui)
A `<section class="container">` sem id da **Anatomía Patológica Práctica** (20 questões) só é alcançável pelo índice geral: não tem card, não entra em Anterior/Próximo nem no modo Preguntas.
Dar um `id` a ela (e um título) a transforma num bloco normal. É edição de matéria, fora do escopo das PRs de layout.

## Por matéria
| matéria | grupo | elemento | classe | questões | texto (car.) | main índice / bloco | #487 índice / outro / seu / sem nav |
|---|---|---|---|---|---|---|---|
| anatomia-patologica | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 49 | não / não | não / não / – / não |
| anatomia-patologica | elegivel | `NAV.nav` | abertura | 0 | 93 | não / não | não / não / – / não |
| anatomia-patologica | elegivel | `SECTION.hero` | abertura | 0 | 476 | sim / sim | sim / não / – / sim |
| anatomia-patologica | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → banco-oficiales-anato | 0 | 186 | sim / sim | não / não / sim / sim |
| anatomia-patologica-practica | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 53 | não / não | não / não / – / não |
| anatomia-patologica-practica | elegivel | `NAV.nav` | abertura | 0 | 232 | não / não | não / não / – / não |
| anatomia-patologica-practica | elegivel | `SECTION.hero` | abertura | 0 | 457 | sim / sim | sim / não / – / sim |
| anatomia-patologica-practica | elegivel | `SECTION.container` | conteúdo | 20 | 7869 | sim / sim | sim / não / – / sim |
| fisiopatologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 49 | não / não | não / não / – / não |
| fisiopatologia | elegivel | `NAV.nav` | abertura | 0 | 183 | não / não | não / não / – / não |
| fisiopatologia | elegivel | `SECTION.hero` | abertura | 0 | 578 | sim / sim | sim / não / – / sim |
| fisiopatologia | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → prova-fisio | 0 | 186 | sim / sim | não / não / sim / sim |
| imagenologia | fora | `HEADER.rm-subject-head` | abertura | 0 | 35 | não / não | não / não / – / não |
| imagenologia | fora | `NAV.nav` | abertura | 0 | 173 | não / não | não / não / – / não |
| imagenologia | fora | `SECTION.hero` | abertura | 0 | 419 | sim / sim | sim / não / – / sim |
| imagenologia | fora | `DIV.rm-revisao-banner#revisao-geral` | anexo → prova-imagen | 0 | 195 | sim / sim | não / não / sim / sim |
| semiologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 37 | não / não | não / não / – / não |
| semiologia | elegivel | `NAV.nav` | abertura | 0 | 164 | não / não | não / não / – / não |
| semiologia | elegivel | `SECTION.hero` | abertura | 0 | 653 | sim / sim | sim / não / – / sim |
| semiologia | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → prova-semio | 0 | 186 | sim / sim | não / não / sim / sim |
| farmacologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 47 | não / não | não / não / – / não |
| farmacologia | elegivel | `NAV.nav` | abertura | 0 | 100 | não / não | não / não / – / não |
| farmacologia | elegivel | `SECTION.hero` | abertura | 0 | 516 | sim / sim | sim / não / – / sim |
| farmacologia | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → cuestionario1 | 0 | 186 | sim / sim | não / não / sim / sim |
| medicina-familiar | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 50 | não / não | não / não / – / não |
| medicina-familiar | elegivel | `NAV.nav` | abertura | 0 | 94 | não / não | não / não / – / não |
| medicina-familiar | elegivel | `SECTION.hero` | abertura | 0 | 575 | sim / sim | sim / não / – / sim |
| medicina-familiar | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → banco-medfam | 0 | 184 | sim / sim | não / não / sim / sim |
| semiologia-ii | piloto | `HEADER.rm-subject-head` | abertura | 0 | 46 | não / não | não / não / – / não |
| semiologia-ii | piloto | `SECTION.s2-hero` | abertura | 0 | 591 | sim / não | sim / não / – / sim |
| farmacologia-ii | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 48 | não / não | não / não / – / não |
| farmacologia-ii | elegivel | `SECTION.hero` | abertura | 0 | 500 | sim / sim | sim / não / – / sim |
| embriologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 35 | não / não | não / não / – / não |
| embriologia | elegivel | `SECTION.hero` | abertura | 0 | 515 | sim / sim | sim / não / – / sim |
| biologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 41 | não / não | não / não / – / não |
| biologia | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancobio | 0 | 186 | sim / sim | não / não / sim / sim |
| histologia-i | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 33 | não / não | não / não / – / não |
| histologia-i-practica | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 41 | não / não | não / não / – / não |
| histologia-i-practica | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancolam | 0 | 186 | sim / sim | não / não / sim / sim |
| histologia-ii-practica | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 53 | não / não | não / não / – / não |
| histologia-ii | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 54 | não / não | não / não / – / não |
| histologia-ii | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancoh2 | 0 | 198 | sim / sim | não / não / sim / sim |
| anatomia-i | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 43 | não / não | não / não / – / não |
| anatomia-i | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancoa1 | 0 | 186 | sim / sim | não / não / sim / sim |
| anatomia-patologica-ii | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 46 | não / não | não / não / – / não |
| anatomia-patologica-ii | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancoap2 | 0 | 198 | sim / sim | não / não / sim / sim |
| anatomia-patologica-ii-practica | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 63 | não / não | não / não / – / não |
| medicina-legal | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 50 | não / não | não / não / – / não |
| medicina-legal | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancomedleg | 0 | 198 | sim / sim | não / não / sim / sim |
| fisiopatologia-ii | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 54 | não / não | não / não / – / não |
| fisiopatologia-ii | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancofp2 | 0 | 197 | sim / sim | não / não / sim / sim |
| toxicologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 50 | não / não | não / não / – / não |
| toxicologia | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancotox | 0 | 198 | sim / sim | não / não / sim / sim |
| dermatologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 53 | não / não | não / não / – / não |
| guarani | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 63 | não / não | não / não / – / não |
| guarani | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancognrl | 0 | 198 | sim / sim | não / não / sim / sim |
| ortopedia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 65 | não / não | não / não / – / não |
| ortopedia | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancoorto | 0 | 198 | sim / sim | não / não / sim / sim |
| oftalmologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 51 | não / não | não / não / – / não |
| oftalmologia | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → bancooft | 0 | 186 | sim / sim | não / não / sim / sim |
| neurologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 52 | não / não | não / não / – / não |
| neurologia | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → banconeu | 0 | 197 | sim / sim | não / não / sim / sim |
| anestesiologia | elegivel | `HEADER.rm-subject-head` | abertura | 0 | 56 | não / não | não / não / – / não |
| anestesiologia | elegivel | `DIV.rm-revisao-banner#revisao-geral` | anexo → aneb15 | 0 | 186 | sim / sim | não / não / sim / sim |
