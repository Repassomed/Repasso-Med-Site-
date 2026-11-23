# Anestesiología · clases 5 a 8 (23/11/2026) → bloques 16 a 20

Base: `origin/main` · branch `claude/anestesiologia-slides-5-8-2026-11` · fonte: Drive `Site repassomed › Biblioteca › 7 semestre › Anestesiologia (Dr francisco paiva) › Slides` (id `1GC8JcHKnKeTgYoPdNQW9Urz1etAQfZl5`), arquivos enviados por Gabriel em 23/11/2026 12:16.

## 1 · Arquivos, leitura e destino
| # | Arquivo (id Drive) | KB | Leitura | O que já existia | O que entrou e onde | Pendente |
|---|---|---|---|---|---|---|
| 5 | `5. Complicaciones de la Anestesia.pdf` (`101DuaU7-axSnYM2e60GEzcARJyAnPa2O`) | 2482 | **texto completo lido** (19 páginas) | Só menções soltas (bloco 11: Mendelson/aspiração; 05: capnografia) | **Bloco 16** (hipertermia maligna, anafilaxia/anafilactoide, NVPO) e **bloco 17** (despertar intraoperatório, hipotermia, bloqueio residual, complicações pulmonares, ritmo, postura) | Figuras do PDF não extraídas (só texto); dois pontos do slide estão truncados: ver §3 |
| 6 | `6. Manejo del dolor posoperatorio.pdf` (`1TO7rELOALC-KL_pOtZmzB7CYi55w_tqV`) | 1335 | **texto completo lido** (16 páginas) | Nada (o bloco 03 só cita analgesia na definição) | **Bloco 18** (fisiopatologia, avaliação, multimodal, opioides, PCA, epidural/PCEA, bloqueios, comparação, por cirurgia, algoritmo) | Figuras não extraídas |
| 7 | `7. Complicaciones durante la anestesia.pdf` (`1bXF4WDLtygAAK2hfIuNRXNH0qbmCmAn-`) | 1427 | **texto completo lido** (27 páginas); o desenho do laringoespasmo (pág. 16) só foi lido como texto | Bloco 11 (ayuno e aspiração) cobre o jejum; resto novo | **Bloco 19** (SpO₂ baixa, aspiração, broncoespasmo, laringoespasmo, edema pulmonar, TEP) | Imagem do laringoespasmo não incorporada como figura |
| 8 | `8. Fármacos_P2.pdf` (`1YWFZEXMAVEn56q1KH_Ku5kye83HkbROt`) | 204 | **texto completo lido** (5 páginas, 10 fichas) | Nada | **Bloco 20** (morfina, dexametasona, manitol, amiodarona, fentanilo, propofol, paracetamol, atropina, adrenalina, midazolam) | Interações e posologias pediátricas não detalhadas (só as dos adultos mais úteis) |

Arquivos 1–4 (já cobertos pelos blocos 01–15): não relidos nesta PR; blocos 01–15 ficam **byte a byte idênticos**.

## 2 · O que mudou no site
- `anestesiologia.html`: 5 blocos novos (`aneb16`…`aneb20`) logo antes do banco, **na ordem dos slides**; 60 perguntas novas (`q-ane179`…`q-ane238`) com a cópia no banco (`bq-ane179`…`bq-ane238`); 70 flashcards novos (bloco + mazo geral); estatística do banco 177→**237 preguntas**, 15→**20 bloques**, 232→**302 flashcards**; bibliografia com as 4 clases e as fontes que elas citam (não abertas).
- `rm-materia-sistema.js` (global, **só a função `clasificarAN`**): reconhece `aneb16…aneb20` (antes parava em 15); sem viñeta para os blocos novos. Sem isso a Nova Era não classificaria os blocos novos.
- `docs/layout-ensaio/inventario.json` (só a entrada de Anestesiología) e testes novos.

## 3 · Decisões sobre o texto dos slides
- Slide 5, resumo inicial: a linha «elevación de la cabeza, oxígeno, titulación cuidadosa, hipotermia… son signos precoces de hipertermia maligna» está truncada/embaralhada na extração. Usei a **tabela detalhada do próprio slide** (precoz: ↑ETCO₂; cardiovasculares; rigidez; metabólicas; tardíos: hipertermia, hipotensión, coagulopatía).
- Paracetamol: o slide 6 diz máx. 4 g/24 h; a ficha do slide 8 diz VO 3 g/24 h e IV 4 g/24 h. Os dois números estão no bloco 20 com a via de cada um.
- Doses: são as da ficha da cátedra, marcadas como «no extrapolar»; nenhuma dose foi inventada.
- Literatura: os slides citam Manual Johns Hopkins (pp. 340–349), ASA (2017/2023), ESC TEP 2019 e PROSPECT/ESRA; **nenhum desses livros foi aberto** (não estão no projeto): o ensino segue o texto dos slides, mais explicações básicas de fisiologia.

## 4 · Questões (lei 8-A)
- 60 novas, todas «Pregunta complementaria» (a cátedra não disponibilizou banco de provas de Anestesiología). Tipos: MCQ, CASO, DEFINE, CITA e COMPLETÁ (a página não tem V/F).
- Duplicatas: comparadas com as 177 antigas por conceito: as antigas tratam ASA, risco, ayuno, vía aérea; nenhuma cobre hipertermia maligna, anafilaxia, NVPO, dor, aspiração-algoritmo, broncoespasmo, laringoespasmo, edema, TEP nem as fichas de fármacos. Nenhuma descartada; nenhuma antiga alterada.
- Resumo ensina → questão cobra: teste de cobertura por termos (slide por slide) passa.
- Pistas: sem negrito/itálico em enunciado ou alternativa; a resposta é a única mais longa em 33 % (antes do rebalanceamento era 73 %), nunca mais que 1,25× a média das erradas; letras (a 12 · b 11 · c 11 · d 11 nas MCQ novas) sem abcd/dcba e sem 3 iguais seguidas.

## 5 · Marcações dos alunos (somente leitura, 23/11/2026)
Matéria `anestesiologia`: **10 grifos** (todos em `aneb01`), **4 traços de tinta** (todos em `aneb01`), **0 notas**. `aneb01` e os blocos 02–15 ficam byte a byte idênticos; motor real (`RMTools.resolverAncora`): **10/10 ancoram antes e depois, 0 movidos**. Traços ancoram por seção>índice: a seção não mudou.

## 6 · Testes
Ver o Cartão de Merge da PR.

## 7 · Limitações
1. Figuras dos slides 5–7 não incorporadas (extração só de texto). 2. Sem V/F (a matéria não os usa). 3. Os 5 blocos novos não têm viñeta/infográfico. 4. Livros citados nos slides não lidos. 5. Julgamento didático (G0) feito por mim; a auditoria independente cabe ao coordenador.
