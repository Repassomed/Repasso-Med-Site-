# Inventário real das matérias ativas · Checkpoint A · issue #457

> Gerado por `tools/qa/ensaio-layout/inventario.cjs` em 2026-10-07. **Somente leitura**: nenhuma matéria, flag, UID ou arquivo de produção foi alterado; zero escritas no Supabase (simulado); zero rede externa.
> Medido no navegador, com o `app-core.js` real, **sem nada do layout novo** (a matéria como o site a serve hoje). Fonte do catálogo: `const CATALOGO` (index.html) × `FILES` (get-materia.js) × `netlify/functions/materias-privadas/`.

## 1 · Reconciliação do catálogo (#366)

| Verificação | Resultado |
|---|---|
| Matérias ativas (catálogo ∩ `FILES`) | **27** |
| Só no catálogo, sem arquivo servido | nenhuma |
| Só em `FILES`, fora do catálogo | nenhuma |
| Arquivo servido que não existe no disco | nenhum |
| Arquivos **órfãos** no disco (não servidos, fora do catálogo) | `anatomiapatologica-ii-practica.html`, `anatomiapatologica-ii.html`, `bioestadistica.html` |

Os 3 arquivos órfãos **não são matérias ativas** e ficam fora do ensaio (não há rota, nem `FILES`, nem entrada no catálogo): um aluno não os alcança. Não foram tocados.

## 2 · Totais (27 matérias)

| Recurso | Total medido |
|---|---:|
| Blocos no índice (`.rm-menu`) | 434 |
| Seções `<section id>` | 450 |
| Questões `.quiz-item` no DOM (somando cópias) | 10098 |
| Questões **distintas** (por enunciado · por enunciado+opções) | 5361 · 5605 |
| Flashcards `.flashcard` no DOM (somando cópias) | 17735 |
| Flashcards **distintos** (pela frente) | 7043 |
| Figuras com legenda | 1440 |
| Videoclases (`details.video-collapsible`) | 48 |
| Elementos `<audio>` (ausculta) | 12 |
| IDs duplicados | 0 |
| Mídia local quebrada | 0 |
| Erros de JavaScript no carregamento | 0 |
| Requisições externas tentadas | 0 |
| Escritas ao Supabase | 0 |

## 3 · Tabela por matéria

Legenda: **Banco** = a matéria tem seção de Banco geral; **cópia** = como as questões do Banco casam com as do corpo (por `id` ou por enunciado). **ID q.** = quantas questões têm `id` próprio. **Áudio** = elementos `<audio>` no DOM de hoje (ausculta de Semiología), **não** audiobook.

| Matéria (slug) | Arquivo | Seções | Blocos (índice) | q. DOM | q. distintas (enun. / +opc.) | q. Banco | Banco? | cópia | ID q. | Flashcards DOM / distintos | Figuras | Vídeos | Áudio |
|---|---|--:|--:|--:|--:|--:|:-:|:-:|--:|--:|--:|--:|--:|
| Anatopatologia I (`anatomia-patologica`) | `anatomia-patologica.html` | 15 | 14 | 718 | **358** / 478 | 359 | SIM | por enunciado | 0/718 | 297 / **161** | 31 | 0 (0 iframe) | 0 |
| Anatopatologia Práctica (`anatomia-patologica-practica`) | `anatomia-patologica-practica.html` | 12 | 12 | 96 | **76** | 0 | NÃO | — | 0/96 | 341 / **92** | 17 | 0 (0 iframe) | 0 |
| Fisiopatologia I (`fisiopatologia`) | `fisiopatologia.html` | 14 | 14 | 332 | **211** / 274 | 0 | NÃO | — | 0/332 | 260 / **130** | 39 | 0 (0 iframe) | 0 |
| Imagenología (`imagenologia`) | `imagenologia.html` | 12 | 12 | 87 | **87** | 0 | NÃO | — | 0/87 | 124 / **74** | 20 | 0 (0 iframe) | 0 |
| Semiología I (`semiologia`) | `semiologia.html` | 11 | 11 | 220 | **143** / 182 | 0 | NÃO | — | 0/220 | 192 / **96** | 27 | 13 (22 iframe) | 6 |
| Farmacología I (`farmacologia`) | `farmacologia.html` | 21 | 21 | 191 | **166** / 176 | 0 | NÃO | — | 0/191 | 412 / **216** | 52 | 17 (23 iframe) | 0 |
| Medicina Familiar (`medicina-familiar`) | `medicina-familiar.html` | 12 | 12 | 90 | **89** / 90 | 26 | SIM | ⚠ 25 sem par | 0/90 | 177 / **95** | 0 | 0 (0 iframe) | 0 |
| Semiología II (`semiologia-ii`) | `semiologia-ii.html` | 14 | 14 | 240 | **120** | 120 | SIM | por enunciado | 0/240 | 366 / **184** | 34 | 0 (0 iframe) | 6 |
| Farmacología II (`farmacologia-ii`) | `farmacologia-ii.html` | 17 | 16 | 428 | **214** | 0 | NÃO | — | 2/428 | 876 / **292** | 0 | 9 (9 iframe) | 0 |
| Embriología (`embriologia`) | `embriologia.html` | 16 | 15 | 214 | **107** | 0 | NÃO | — | 0/214 | 298 / **145** | 39 | 3 (3 iframe) | 0 |
| Biología (`biologia`) | `biologia.html` | 16 | 15 | 246 | **122** / 123 | 123 | SIM | por enunciado | 0/246 | 276 / **136** | 39 | 0 (0 iframe) | 0 |
| Histología I (`histologia-i`) | `histologia-i.html` | 16 | 15 | 300 | **150** | 0 | NÃO | — | 0/300 | 396 / **184** | 36 | 4 (4 iframe) | 0 |
| Histología I Práctica (`histologia-i-practica`) | `histologia-i-practica.html` | 17 | 16 | 212 | **106** | 106 | SIM | por enunciado | 0/212 | 286 / **115** | 153 | 0 (0 iframe) | 0 |
| Histología II Práctica (`histologia-ii-practica`) | `histologia-ii-practica.html` | 20 | 19 | 578 | **289** | 289 | SIM | por enunciado | 0/578 | 1233 / **404** | 281 | 0 (0 iframe) | 0 |
| Histología II (`histologia-ii`) | `histologia-ii.html` | 17 | 16 | 452 | **225** / 226 | 226 | SIM | por enunciado | 0/452 | 906 / **302** | 47 | 0 (0 iframe) | 0 |
| Anatomía I (`anatomia-i`) | `anatomia-i.html` | 37 | 35 | 918 | **457** / 459 | 459 | SIM | por enunciado | 0/918 | 1646 / **820** | 121 | 0 (0 iframe) | 0 |
| Anatopatologia II (`anatomia-patologica-ii`) | `anatomia-patologica-ii.html` | 12 | 10 | 304 | **152** | 152 | SIM | por enunciado | 0/304 | 480 / **153** | 43 | 0 (0 iframe) | 0 |
| Anatopatologia II Práctica (`anatomia-patologica-ii-practica`) | `anatomia-patologica-ii-practica.html` | 11 | 10 | 224 | **109** / 112 | 112 | SIM | por enunciado | 0/224 | 465 / **146** | 104 | 0 (0 iframe) | 0 |
| Medicina Legal (`medicina-legal`) | `medicina-legal.html` | 21 | 20 | 470 | **235** | 235 | SIM | por enunciado | 0/470 | 1122 / **365** | 56 | 0 (0 iframe) | 0 |
| Fisiopatologia II (`fisiopatologia-ii`) | `fisiopatologia-ii.html` | 17 | 16 | 638 | **319** | 319 | SIM | por enunciado | 638/638 | 1857 / **619** | 33 | 0 (0 iframe) | 0 |
| Toxicología (`toxicologia`) | `toxicologia.html` | 19 | 19 | 698 | **349** | 349 | SIM | por enunciado | 698/698 | 1416 / **472** | 45 | 0 (0 iframe) | 0 |
| Dermatología (`dermatologia`) | `dermatologia.html` | 15 | 15 | 120 | **120** | 0 | NÃO | — | 120/120 | 482 / **293** | 58 | 0 (0 iframe) | 0 |
| Guaraní (`guarani`) | `guarani.html` | 16 | 15 | 418 | **207** / 209 | 209 | SIM | por enunciado | 0/418 | 596 / **286** | 38 | 0 (0 iframe) | 0 |
| Ortopedia y Traumatología (`ortopedia`) | `ortopedia.html` | 20 | 20 | 914 | **455** / 457 | 457 | SIM | por enunciado | 457/914 | 1296 / **429** | 47 | 0 (0 iframe) | 0 |
| Oftalmología (`oftalmologia`) | `oftalmologia.html` | 12 | 12 | 278 | **139** | 139 | SIM | por id | 278/278 | 801 / **267** | 27 | 0 (0 iframe) | 0 |
| Neurología (`neurologia`) | `neurologia.html` | 22 | 22 | 358 | **179** | 179 | SIM | por id | 358/358 | 670 / **335** | 34 | 2 (3 iframe) | 0 |
| Anestesiología (`anestesiologia`) | `anestesiologia.html` | 18 | 18 | 354 | **177** | 177 | SIM | por id | 354/354 | 464 / **232** | 19 | 0 (0 iframe) | 0 |

## 4 · Estados por matéria (SIM / NÃO / INDETERMINADO, com evidência)

Critério: **SIM** = presente e medido no DOM; **NÃO** = ausente (contagem 0 no DOM real); **INDETERMINADO** = o DOM não permite concluir (explicado).

| Matéria | Blocos numerados | Banco geral | Questões c/ ID | Flashcards | Figuras c/ legenda | Vídeos | Ausculta (`<audio>`) | Audiobook | Cover/portada | Evidência |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Anatopatologia I | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=15; menu=14 (sem item: analise-guia); q=718 DOM/358 distintas (agregadora banco-oficiales-anato); fc=297 DOM/161 distintos (agregadora flashcards-anato); fig=31; vid=0; audio=0 |
| Anatopatologia Práctica | SIM | NÃO | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | NÃO | seções=12; menu=12; q=96 DOM/76 distintas; fc=341 DOM/92 distintos (agregadora b11); fig=17; vid=0; audio=0 |
| Fisiopatologia I | SIM | NÃO | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=14; menu=14; q=332 DOM/211 distintas; fc=260 DOM/130 distintos (agregadora flashcards-fisio); fig=39; vid=0; audio=0 |
| Imagenología | SIM | NÃO | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | NÃO | seções=12; menu=12; q=87 DOM/87 distintas; fc=124 DOM/74 distintos (agregadora flashcards-imagen); fig=20; vid=0; audio=0 |
| Semiología I | SIM | NÃO | NÃO | SIM | SIM | SIM | SIM | **NÃO** (sem manifesto) | SIM | seções=11; menu=11; q=220 DOM/143 distintas; fc=192 DOM/96 distintos (agregadora flashcards-semio); fig=27; vid=13; audio=6 |
| Farmacología I | SIM | NÃO | NÃO | SIM | SIM | SIM | NÃO | **NÃO** (sem manifesto) | NÃO | seções=21; menu=21; q=191 DOM/166 distintas; fc=412 DOM/216 distintos; fig=52; vid=17; audio=0 |
| Medicina Familiar | SIM | SIM | NÃO | SIM | NÃO | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=12; menu=12; q=90 DOM/89 distintas; fc=177 DOM/95 distintos; fig=0; vid=0; audio=0 |
| Semiología II | SIM | SIM | NÃO | SIM | SIM | NÃO | SIM | **NÃO** (sem manifesto) | SIM | seções=14; menu=14; q=240 DOM/120 distintas (agregadora s2-banco); fc=366 DOM/184 distintos (agregadora s2-flashcards); fig=34; vid=0; audio=6 |
| Farmacología II | SIM | NÃO | PARCIAL | SIM | NÃO | SIM | NÃO | **NÃO** (sem manifesto) | SIM | seções=17; menu=16 (sem item: f2b00); q=428 DOM/214 distintas (agregadora f2b15); fc=876 DOM/292 distintos (agregadora f2b16); fig=0; vid=9; audio=0 |
| Embriología | SIM | NÃO | NÃO | SIM | SIM | SIM | NÃO | **NÃO** (sem manifesto) | SIM | seções=16; menu=15 (sem item: emb00); q=214 DOM/107 distintas (agregadora emb14); fc=298 DOM/145 distintos (agregadora emb15); fig=39; vid=3; audio=0 |
| Biología | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=16; menu=15 (sem item: bio00); q=246 DOM/122 distintas (agregadora bancobio); fc=276 DOM/136 distintos (agregadora bio-flashcards); fig=39; vid=0; audio=0 |
| Histología I | SIM | NÃO | NÃO | SIM | SIM | SIM | NÃO | **NÃO** (sem manifesto) | SIM | seções=16; menu=15 (sem item: histo00); q=300 DOM/150 distintas (agregadora histo13); fc=396 DOM/184 distintos (agregadora histo14); fig=36; vid=4; audio=0 |
| Histología I Práctica | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=17; menu=16 (sem item: hp00); q=212 DOM/106 distintas (agregadora bancolam); fc=286 DOM/115 distintos (agregadora bancofc); fig=153; vid=0; audio=0 |
| Histología II Práctica | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=20; menu=19 (sem item: h2pportada); q=578 DOM/289 distintas (agregadora h2pbanco); fc=1233 DOM/404 distintos (agregadora h2pmazo); fig=281; vid=0; audio=0 |
| Histología II | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=17; menu=16 (sem item: h2portada); q=452 DOM/225 distintas (agregadora bancoh2); fc=906 DOM/302 distintos (agregadora bancofch2); fig=47; vid=0; audio=0 |
| Anatomía I | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=37; menu=35 (sem item: a1b00,a1notas); q=918 DOM/457 distintas (agregadora bancoa1); fc=1646 DOM/820 distintos (agregadora bancofca1); fig=121; vid=0; audio=0 |
| Anatopatologia II | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=12; menu=10 (sem item: ap2intro,ap2biblio); q=304 DOM/152 distintas (agregadora bancoap2); fc=480 DOM/153 distintos (agregadora bancofcap2); fig=43; vid=0; audio=0 |
| Anatopatologia II Práctica | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=11; menu=10 (sem item: ap2pportada); q=224 DOM/109 distintas (agregadora ap2pbanco); fc=465 DOM/146 distintos (agregadora ap2pmazo); fig=104; vid=0; audio=0 |
| Medicina Legal | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=21; menu=20 (sem item: medlegb00); q=470 DOM/235 distintas (agregadora bancomedleg); fc=1122 DOM/365 distintos (agregadora bancofcmedleg); fig=56; vid=0; audio=0 |
| Fisiopatologia II | SIM | SIM | SIM | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=17; menu=16 (sem item: fp2portada); q=638 DOM/319 distintas (agregadora bancofp2); fc=1857 DOM/619 distintos (agregadora revisaofp2); fig=33; vid=0; audio=0 |
| Toxicología | SIM | SIM | SIM | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=19; menu=19; q=698 DOM/349 distintas (agregadora bancotox); fc=1416 DOM/472 distintos (agregadora toxcierre); fig=45; vid=0; audio=0 |
| Dermatología | SIM | NÃO | SIM | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=15; menu=15; q=120 DOM/120 distintas; fc=482 DOM/293 distintos (agregadora dermcierre); fig=58; vid=0; audio=0 |
| Guaraní | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=16; menu=15 (sem item: gn00); q=418 DOM/207 distintas (agregadora bancognrl); fc=596 DOM/286 distintos (agregadora mazognrl); fig=38; vid=0; audio=0 |
| Ortopedia y Traumatología | SIM | SIM | PARCIAL | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=20; menu=20; q=914 DOM/455 distintas (agregadora bancoorto); fc=1296 DOM/429 distintos (agregadora bancofcorto); fig=47; vid=0; audio=0 |
| Oftalmología | SIM | SIM | SIM | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=12; menu=12; q=278 DOM/139 distintas (agregadora bancooft); fc=801 DOM/267 distintos (agregadora oftcierre); fig=27; vid=0; audio=0 |
| Neurología | SIM | SIM | SIM | SIM | SIM | SIM | NÃO | **NÃO** (sem manifesto) | SIM | seções=22; menu=22; q=358 DOM/179 distintas (agregadora banconeu); fc=670 DOM/335 distintos (agregadora revisaoneu); fig=34; vid=2; audio=0 |
| Anestesiología | SIM | SIM | SIM | SIM | SIM | NÃO | NÃO | **NÃO** (sem manifesto) | SIM | seções=18; menu=18; q=354 DOM/177 distintas (agregadora bancoane); fc=464 DOM/232 distintos (agregadora anecierre); fig=19; vid=0; audio=0 |

**Audiobook = NÃO em todas as 27**: o único manifesto autorizado hoje é o do piloto (Semiología II, via `get-audio-manifest`, atrás do flag `audio`). O inventário **não** consulta manifesto, não simula áudio e não lê Supabase. Os `<audio>` de Semiología e Semiología II são a **ausculta** (cards de sons clínicos), um recurso diferente do audiobook.

## 5 · Contagens declaradas à mão × contagens medidas (deriva)

O texto da portada de cada matéria declara números («179 preguntas», «335 flashcards», «34 infografías»…). O quadro compara cada número declarado com o que o DOM realmente tem. **Esses números são editados à mão hoje** — é o ponto central do contrato (checkpoint C).

| Matéria | Escopo (seção) | Declarado | Casa com | Medido (alternativas) | Situação |
|---|---|---|---|---|---|
| Anatopatologia I | blocos | 1 declarações | 0 coincidem | `introduccion`: 4 preguntas × 13 | ✖ **1 divergem** (semântica da frase a confirmar) |
| Anatopatologia Práctica | — | — | — | — | INDETERMINADO (nenhuma contagem reconhecível) |
| Fisiopatologia I | blocos | 1 declarações | 1 coincidem |  | ✔ todas coincidem |
| Imagenología | blocos | 1 declarações | 0 coincidem | `analise-imagen`: 3 preguntas × 0 | ✖ **1 divergem** (semântica da frase a confirmar) |
| Semiología I | blocos | 2 declarações | 0 coincidem | `ectoscopia`: 7 videos × 8; `torax-resp`: 4 videos × 7 | ✖ **2 divergem** (semântica da frase a confirmar) |
| Farmacología I | blocos | 4 declarações | 0 coincidem | `colinergicos`: 4 videos × 5; `adren-agon-antag`: 2 videos × 3; `opioides`: 2 videos × 3; `anestesicos`: 4 videos × 5 | ✖ **4 divergem** (semântica da frase a confirmar) |
| Medicina Familiar | blocos | 1 declarações | 0 coincidem | `apgar`: 5 preguntas × 8 | ✖ **1 divergem** (semântica da frase a confirmar) |
| Semiología II | blocos | 15 declarações | 1 coincidem | `s2-b06`: 3 preguntas × 6; `s2-banco`: 17 preguntas × 120; `s2-banco`: 9 preguntas × 120; `s2-banco`: 28 preguntas × 120; `s2-banco`: 12 preguntas × 120; `s2-banco`: 16 preguntas × 120; … | ✖ **14 divergem** (semântica da frase a confirmar) |
| Farmacología II | blocos | 1 declarações | 1 coincidem |  | ✔ todas coincidem |
| Embriología | blocos | 1 declarações | 1 coincidem |  | ✔ todas coincidem |
| Biología | portada `bio00` | 39 infografias | figuras c/ legenda | figuras c/ legenda=39 | ✔ coincide |
| Biología | blocos | 13 declarações | 1 coincidem | `bancobio`: 5 preguntas × 123; `bancobio`: 6 preguntas × 123; `bancobio`: 12 preguntas × 123; `bancobio`: 9 preguntas × 123; `bancobio`: 7 preguntas × 123; `bancobio`: 8 preguntas × 123; … | ✖ **12 divergem** (semântica da frase a confirmar) |
| Histología I | blocos | 2 declarações | 1 coincidem | `histo-imgnote`: 36 infografias × 0 | ✖ **1 divergem** (semântica da frase a confirmar) |
| Histología I Práctica | portada `hp00` | 12 bloques | — | blocos numerados (id …bNN)=0 · blocos do índice=16 · seções=17 | ✖ **NÃO coincide** |
| Histología I Práctica | portada `hp00` | 3 preguntas | — | distintas(enun.)=106 · distintas(enun.+opc.)=106 · corpo=106 · DOM total=212 | ✖ **NÃO coincide** |
| Histología I Práctica | blocos | 2 declarações | 1 coincidem | `hp-imgnote`: 36 infografias × 0 | ✖ **1 divergem** (semântica da frase a confirmar) |
| Histología II Práctica | blocos | 5 declarações | 1 coincidem | `h2pb11`: 4 preguntas × 15; `h2pbanco`: 44 preguntas × 289; `h2pbanco`: 161 preguntas × 289; `h2pbanco`: 84 preguntas × 289 | ✖ **4 divergem** (semântica da frase a confirmar) |
| Histología II | portada `h2portada` | 75 preguntas | — | distintas(enun.)=225 · distintas(enun.+opc.)=226 · corpo=226 · DOM total=452 | ✖ **NÃO coincide** |
| Histología II | blocos | 16 declarações | 0 coincidem | `h2b01`: 75 preguntas × 16; `h2b02`: 75 preguntas × 16; `h2b03`: 75 preguntas × 16; `h2b04`: 75 preguntas × 16; `h2b05`: 75 preguntas × 18; `h2b06`: 75 preguntas × 18; … | ✖ **16 divergem** (semântica da frase a confirmar) |
| Anatomía I | blocos | 38 declarações | 33 coincidem | `a1b06`: 38 preguntas × 18; `a1b07`: 42 preguntas × 17; `a1b18`: 3 preguntas × 10; `a1b18`: 2 preguntas × 10; `bancoa1`: 13 preguntas × 459 | ✖ **5 divergem** (semântica da frase a confirmar) |
| Anatopatologia II | blocos | 7 declarações | 1 coincidem | `bancoap2`: 33 preguntas × 152; `bancoap2`: 25 preguntas × 152; `bancoap2`: 20 preguntas × 152; `bancoap2`: 15 preguntas × 152; `bancoap2`: 14 preguntas × 152; `bancoap2`: 16 preguntas × 152 | ✖ **6 divergem** (semântica da frase a confirmar) |
| Anatopatologia II Práctica | blocos | 2 declarações | 1 coincidem | `ap2pbanco`: 155 flashcards × 0 | ✖ **1 divergem** (semântica da frase a confirmar) |
| Medicina Legal | blocos | 9 declarações | 1 coincidem | `bancomedleg`: 14 preguntas × 235; `bancomedleg`: 15 preguntas × 235; `bancomedleg`: 25 preguntas × 235; `bancomedleg`: 12 preguntas × 235; `bancomedleg`: 13 preguntas × 235; `bancomedleg`: 18 preguntas × 235; … | ✖ **8 divergem** (semântica da frase a confirmar) |
| Fisiopatologia II | portada `fp2portada` | 14 bloques | blocos numerados (id …bNN) | blocos numerados (id …bNN)=14 · blocos do índice=16 · seções=17 | ✔ coincide |
| Fisiopatologia II | portada `fp2portada` | 319 preguntas | distintas(enun.), distintas(enun.+opc.), corpo | distintas(enun.)=319 · distintas(enun.+opc.)=319 · corpo=319 · DOM total=638 | ✔ coincide |
| Fisiopatologia II | portada `fp2portada` | 619 flashcards | distintos | distintos=619 · DOM total=1857 | ✔ coincide |
| Fisiopatologia II | portada `fp2portada` | 33 infografias | figuras c/ legenda | figuras c/ legenda=33 | ✔ coincide |
| Fisiopatologia II | blocos | 10 declarações | 10 coincidem |  | ✔ todas coincidem |
| Toxicología | portada `toxportada` | 16 bloques | blocos numerados (id …bNN) | blocos numerados (id …bNN)=16 · blocos do índice=19 · seções=19 | ✔ coincide |
| Toxicología | portada `toxportada` | 349 preguntas | distintas(enun.), distintas(enun.+opc.), corpo | distintas(enun.)=349 · distintas(enun.+opc.)=349 · corpo=349 · DOM total=698 | ✔ coincide |
| Toxicología | portada `toxportada` | 472 flashcards | distintos | distintos=472 · DOM total=1416 | ✔ coincide |
| Toxicología | blocos | 9 declarações | 1 coincidem | `bancotox`: 25 preguntas × 349; `bancotox`: 28 preguntas × 349; `bancotox`: 23 preguntas × 349; `bancotox`: 26 preguntas × 349; `bancotox`: 19 preguntas × 349; `bancotox`: 22 preguntas × 349; … | ✖ **8 divergem** (semântica da frase a confirmar) |
| Dermatología | portada `dermportada` | 13 bloques | blocos numerados (id …bNN) | blocos numerados (id …bNN)=13 · blocos do índice=15 · seções=15 | ✔ coincide |
| Dermatología | portada `dermportada` | 120 preguntas | distintas(enun.), distintas(enun.+opc.), corpo, DOM total | distintas(enun.)=120 · distintas(enun.+opc.)=120 · corpo=120 · DOM total=120 | ✔ coincide |
| Dermatología | portada `dermportada` | 294 flashcards | — | distintos=293 · DOM total=482 | ✖ **NÃO coincide** |
| Dermatología | blocos | 4 declarações | 3 coincidem | `dermb02`: 7 preguntas × 27 | ✖ **1 divergem** (semântica da frase a confirmar) |
| Guaraní | — | — | — | — | INDETERMINADO (nenhuma contagem reconhecível) |
| Ortopedia y Traumatología | portada `otportada` | 17 bloques | blocos numerados (id …bNN) | blocos numerados (id …bNN)=17 · blocos do índice=20 · seções=20 | ✔ coincide |
| Ortopedia y Traumatología | portada `otportada` | 457 preguntas | distintas(enun.+opc.), corpo | distintas(enun.)=455 · distintas(enun.+opc.)=457 · corpo=457 · DOM total=914 | ✔ coincide |
| Ortopedia y Traumatología | portada `otportada` | 432 flashcards | — | distintos=429 · DOM total=1296 | ✖ **NÃO coincide** |
| Ortopedia y Traumatología | blocos | 19 declarações | 17 coincidem | `bancoorto`: 29 preguntas × 457; `bancoorto`: 17 preguntas × 457 | ✖ **2 divergem** (semântica da frase a confirmar) |
| Oftalmología | portada `ofportada` | 9 bloques | blocos numerados (id …bNN) | blocos numerados (id …bNN)=9 · blocos do índice=12 · seções=12 | ✔ coincide |
| Oftalmología | portada `ofportada` | 139 preguntas | distintas(enun.), distintas(enun.+opc.), corpo | distintas(enun.)=139 · distintas(enun.+opc.)=139 · corpo=139 · DOM total=278 | ✔ coincide |
| Oftalmología | portada `ofportada` | 267 flashcards | distintos | distintos=267 · DOM total=801 | ✔ coincide |
| Oftalmología | portada `ofportada` | 27 infografias | figuras c/ legenda | figuras c/ legenda=27 | ✔ coincide |
| Oftalmología | blocos | 13 declarações | 10 coincidem | `bancooft`: 267 flashcards × 0; `bancooft`: 19 preguntas × 139; `bancooft`: 15 preguntas × 139 | ✖ **3 divergem** (semântica da frase a confirmar) |
| Neurología | portada `neuportada` | 19 bloques | blocos numerados (id …bNN) | blocos numerados (id …bNN)=19 · blocos do índice=22 · seções=22 | ✔ coincide |
| Neurología | portada `neuportada` | 34 infografias | figuras c/ legenda | figuras c/ legenda=34 | ✔ coincide |
| Neurología | portada `neuportada` | 179 preguntas | distintas(enun.), distintas(enun.+opc.), corpo | distintas(enun.)=179 · distintas(enun.+opc.)=179 · corpo=179 · DOM total=358 | ✔ coincide |
| Neurología | portada `neuportada` | 335 flashcards | distintos | distintos=335 · DOM total=670 | ✔ coincide |
| Neurología | blocos | 28 declarações | 6 coincidem | `neub01`: 7 preguntas × 8; `neub03`: 5 preguntas × 9; `neub04`: 9 preguntas × 11; `neub05`: 2 videos × 3; `neub05`: 15 preguntas × 19; `neub06`: 7 preguntas × 9; … | ✖ **22 divergem** (semântica da frase a confirmar) |
| Anestesiología | portada `aneportada` | 15 bloques | blocos numerados (id …bNN) | blocos numerados (id …bNN)=15 · blocos do índice=18 · seções=18 | ✔ coincide |
| Anestesiología | portada `aneportada` | 177 preguntas | distintas(enun.), distintas(enun.+opc.), corpo | distintas(enun.)=177 · distintas(enun.+opc.)=177 · corpo=177 · DOM total=354 | ✔ coincide |
| Anestesiología | portada `aneportada` | 232 flashcards | distintos | distintos=232 · DOM total=464 | ✔ coincide |
| Anestesiología | portada `aneportada` | 19 infografias | figuras c/ legenda | figuras c/ legenda=19 | ✔ coincide |
| Anestesiología | blocos | 21 declarações | 16 coincidem | `bancoane`: 232 flashcards × 0; `bancoane`: 10 preguntas × 177; `bancoane`: 12 preguntas × 177; `bancoane`: 11 preguntas × 177; `bancoane`: 14 preguntas × 177 | ✖ **5 divergem** (semântica da frase a confirmar) |

Resumo: portadas — 24 declarações coincidem, **5 não coincidem**; blocos — 107 coincidem, **118 divergem** (a frase do bloco nem sempre usa o mesmo critério do DOM: «7 videos» pode contar iframes, «preguntas» pode somar o bloco e a prova). Para as divergências (deriva real ou critério editorial diferente — revisão humana; o contrato do checkpoint C elimina o número manual).

## 6 · Particularidades que afetam o novo layout

- **Anatopatologia I** (`anatomia-patologica`): seção(ões) sem item de índice: `analise-guia` · flashcards: seção agregadora `flashcards-anato` repete os dos blocos (DOM 297; distintos 161) · questões: seção `banco-oficiales-anato` repete as dos blocos (DOM 718; distintas 358) · nenhuma questão tem `id`.
- **Anatopatologia Práctica** (`anatomia-patologica-practica`): flashcards: seção agregadora `b11` repete os dos blocos (DOM 341; distintos 92) · questões repetidas entre seções (DOM 96; distintas 76) · nenhuma questão tem `id`.
- **Fisiopatologia I** (`fisiopatologia`): flashcards: seção agregadora `flashcards-fisio` repete os dos blocos (DOM 260; distintos 130) · questões repetidas entre seções (DOM 332; distintas 211) · nenhuma questão tem `id`.
- **Imagenología** (`imagenologia`): flashcards: seção agregadora `flashcards-imagen` repete os dos blocos (DOM 124; distintos 74) · nenhuma questão tem `id`.
- **Semiología I** (`semiologia`): flashcards: seção agregadora `flashcards-semio` repete os dos blocos (DOM 192; distintos 96) · questões repetidas entre seções (DOM 220; distintas 143) · nenhuma questão tem `id` · 6 <audio> (ausculta).
- **Farmacología I** (`farmacologia`): flashcards repetidos entre seções sem agregadora única (DOM 412; distintos 216) · questões repetidas entre seções (DOM 191; distintas 166) · nenhuma questão tem `id`.
- **Medicina Familiar** (`medicina-familiar`): flashcards repetidos entre seções sem agregadora única (DOM 177; distintos 95) · questões repetidas entre seções (DOM 90; distintas 89) · nenhuma questão tem `id` · 25 questões do Banco sem par no corpo.
- **Semiología II** (`semiologia-ii`): flashcards: seção agregadora `s2-flashcards` repete os dos blocos (DOM 366; distintos 184) · questões: seção `s2-banco` repete as dos blocos (DOM 240; distintas 120) · nenhuma questão tem `id` · usa marcação do piloto (`.s2-hero`/`.s2-quiz-card`) · 6 <audio> (ausculta).
- **Farmacología II** (`farmacologia-ii`): seção(ões) sem item de índice: `f2b00` · flashcards: seção agregadora `f2b16` repete os dos blocos (DOM 876; distintos 292) · questões: seção `f2b15` repete as dos blocos (DOM 428; distintas 214) · 426/428 questões sem `id`.
- **Embriología** (`embriologia`): seção(ões) sem item de índice: `emb00` · flashcards: seção agregadora `emb15` repete os dos blocos (DOM 298; distintos 145) · questões: seção `emb14` repete as dos blocos (DOM 214; distintas 107) · nenhuma questão tem `id`.
- **Biología** (`biologia`): seção(ões) sem item de índice: `bio00` · flashcards: seção agregadora `bio-flashcards` repete os dos blocos (DOM 276; distintos 136) · questões: seção `bancobio` repete as dos blocos (DOM 246; distintas 122) · nenhuma questão tem `id`.
- **Histología I** (`histologia-i`): seção(ões) sem item de índice: `histo00` · flashcards: seção agregadora `histo14` repete os dos blocos (DOM 396; distintos 184) · questões: seção `histo13` repete as dos blocos (DOM 300; distintas 150) · nenhuma questão tem `id`.
- **Histología I Práctica** (`histologia-i-practica`): seção(ões) sem item de índice: `hp00` · flashcards: seção agregadora `bancofc` repete os dos blocos (DOM 286; distintos 115) · questões: seção `bancolam` repete as dos blocos (DOM 212; distintas 106) · nenhuma questão tem `id`.
- **Histología II Práctica** (`histologia-ii-practica`): seção(ões) sem item de índice: `h2pportada` · flashcards: seção agregadora `h2pmazo` repete os dos blocos (DOM 1233; distintos 404) · questões: seção `h2pbanco` repete as dos blocos (DOM 578; distintas 289) · nenhuma questão tem `id`.
- **Histología II** (`histologia-ii`): seção(ões) sem item de índice: `h2portada` · flashcards: seção agregadora `bancofch2` repete os dos blocos (DOM 906; distintos 302) · questões: seção `bancoh2` repete as dos blocos (DOM 452; distintas 225) · nenhuma questão tem `id`.
- **Anatomía I** (`anatomia-i`): seção(ões) sem item de índice: `a1b00`, `a1notas` · flashcards: seção agregadora `bancofca1` repete os dos blocos (DOM 1646; distintos 820) · questões: seção `bancoa1` repete as dos blocos (DOM 918; distintas 457) · nenhuma questão tem `id`.
- **Anatopatologia II** (`anatomia-patologica-ii`): seção(ões) sem item de índice: `ap2intro`, `ap2biblio` · flashcards: seção agregadora `bancofcap2` repete os dos blocos (DOM 480; distintos 153) · questões: seção `bancoap2` repete as dos blocos (DOM 304; distintas 152) · nenhuma questão tem `id`.
- **Anatopatologia II Práctica** (`anatomia-patologica-ii-practica`): seção(ões) sem item de índice: `ap2pportada` · flashcards: seção agregadora `ap2pmazo` repete os dos blocos (DOM 465; distintos 146) · questões: seção `ap2pbanco` repete as dos blocos (DOM 224; distintas 109) · nenhuma questão tem `id`.
- **Medicina Legal** (`medicina-legal`): seção(ões) sem item de índice: `medlegb00` · flashcards: seção agregadora `bancofcmedleg` repete os dos blocos (DOM 1122; distintos 365) · questões: seção `bancomedleg` repete as dos blocos (DOM 470; distintas 235) · nenhuma questão tem `id`.
- **Fisiopatologia II** (`fisiopatologia-ii`): seção(ões) sem item de índice: `fp2portada` · flashcards: seção agregadora `revisaofp2` repete os dos blocos (DOM 1857; distintos 619) · questões: seção `bancofp2` repete as dos blocos (DOM 638; distintas 319).
- **Toxicología** (`toxicologia`): flashcards: seção agregadora `toxcierre` repete os dos blocos (DOM 1416; distintos 472) · questões: seção `bancotox` repete as dos blocos (DOM 698; distintas 349).
- **Dermatología** (`dermatologia`): flashcards: seção agregadora `dermcierre` repete os dos blocos (DOM 482; distintos 293).
- **Guaraní** (`guarani`): seção(ões) sem item de índice: `gn00` · flashcards: seção agregadora `mazognrl` repete os dos blocos (DOM 596; distintos 286) · questões: seção `bancognrl` repete as dos blocos (DOM 418; distintas 207) · nenhuma questão tem `id`.
- **Ortopedia y Traumatología** (`ortopedia`): flashcards: seção agregadora `bancofcorto` repete os dos blocos (DOM 1296; distintos 429) · questões: seção `bancoorto` repete as dos blocos (DOM 914; distintas 455) · 457/914 questões sem `id`.
- **Oftalmología** (`oftalmologia`): flashcards: seção agregadora `oftcierre` repete os dos blocos (DOM 801; distintos 267) · questões: seção `bancooft` repete as dos blocos (DOM 278; distintas 139).
- **Neurología** (`neurologia`): flashcards: seção agregadora `revisaoneu` repete os dos blocos (DOM 670; distintos 335) · questões: seção `banconeu` repete as dos blocos (DOM 358; distintas 179).
- **Anestesiología** (`anestesiologia`): flashcards: seção agregadora `anecierre` repete os dos blocos (DOM 464; distintos 232) · questões: seção `bancoane` repete as dos blocos (DOM 354; distintas 177).

## 7 · O que este inventário NÃO conclui

- Não avalia qualidade científica/didática de nenhuma matéria (fora do escopo da #457).
- «Questões distintas» tem dois critérios porque **o DOM não traz um identificador estável** na maioria das matérias: por enunciado (piso; junta perguntas diferentes com o mesmo enunciado genérico) e por enunciado+opções (teto; separa cópias do Banco reescritas). Quando os dois divergem, a contagem exata é **INDETERMINADA** sem `id`; é exatamente o que o contrato do checkpoint C resolve.
- «Questões c/ ID» mede o atributo `id` do `.quiz-item`; matérias sem `id` não são defeito do layout, mas **impedem rastrear** o par corpo×Banco por id (o casamento é por enunciado).
- «Figuras c/ legenda» conta `<figure>` com `<figcaption>` e imagem; infográficos sem legenda ou fora de `<figure>` não entram (INDETERMINADO quanto a «34 infografías» declaradas).
- Existência de arquivos de mídia foi verificada só para caminhos **relativos**; URLs absolutas (YouTube) não foram acessadas.
