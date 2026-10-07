# Conformidade com o contrato de novos recursos · issue #457

> Gerado por `tools/qa/ensaio-layout/contrato.cjs` a partir do inventário real. ✔ = a regra já é cumprida pelo conteúdo de hoje; ✖ = exige edição editorial ou o marcador do contrato. **Nenhuma matéria foi alterada.**

## Regras

| Regra | Descrição |
|---|---|
| R1 | toda seção tem título (<h2>): o card do índice e os botões Anterior/Próximo dependem dele |
| R2 | toda questão tem id estável (q-<prefixo><NNN>) |
| R3 | toda seção agregadora (cópia de itens dos blocos) é reconhecida: id casa a heurística do piloto OU leva data-rm-agrega |
| R4 | cada cópia no banco geral está ligada à canônica (por id / data-rm-copia-de), sem órfãs |
| R5 | números declarados na portada = números derivados do conteúdo |
| R6 | nenhum id duplicado no documento |
| R7 | nenhuma mídia local quebrada |
| R8 | nenhuma URL assinada/caminho de storage no HTML estático (áudio só pelo manifesto) |
| R9 | marcadores data-rm-* do contrato presentes (role, agrega, copia-de) |

## Resultado por matéria

| Matéria | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | Observação |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Anatopatologia I | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: analise-guia · 718/718 sem id · casa só por enunciado |
| Anatopatologia Práctica | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | 96/96 sem id · agregadora não reconhecida: b11, b12 |
| Fisiopatologia I | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | 332/332 sem id |
| Imagenología | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | 87/87 sem id |
| Semiología I | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | 220/220 sem id |
| Farmacología I | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | 191/191 sem id |
| Medicina Familiar | ✔ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | 90/90 sem id · 25 órfãs |
| Semiología II | ✔ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | 240/240 sem id · casa só por enunciado |
| Farmacología II | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: f2b00 · 426/428 sem id · agregadora não reconhecida: f2b15, f2b16 |
| Embriología | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: emb00 · 214/214 sem id · agregadora não reconhecida: emb14, emb15 |
| Biología | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: bio00 · 246/246 sem id · casa só por enunciado |
| Histología I | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: histo00 · 300/300 sem id · agregadora não reconhecida: histo13, histo14 |
| Histología I Práctica | ✖ | ✖ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ | sem <h2>: hp00 · 212/212 sem id · casa só por enunciado · portada: 12 bloques (blocos numerados (id …bNN)=0, blocos do índice=16, seções=17); 3 preguntas (distintas(enun.)=106, distintas(enun.+opc.)=106, corpo=106, DOM total=212) |
| Histología II Práctica | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: h2pportada · 578/578 sem id · agregadora não reconhecida: h2pmazo · casa só por enunciado |
| Histología II | ✖ | ✖ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ | sem <h2>: h2portada · 452/452 sem id · casa só por enunciado · portada: 75 preguntas (distintas(enun.)=225, distintas(enun.+opc.)=226, corpo=226, DOM total=452) |
| Anatomía I | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: a1b00 · 918/918 sem id · casa só por enunciado |
| Anatopatologia II | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: ap2intro, ap2biblio · 304/304 sem id · casa só por enunciado |
| Anatopatologia II Práctica | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: ap2pportada · 224/224 sem id · agregadora não reconhecida: ap2pmazo · casa só por enunciado |
| Medicina Legal | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: medlegb00 · 470/470 sem id · casa só por enunciado |
| Fisiopatologia II | ✖ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: fp2portada · agregadora não reconhecida: revisaofp2 · casa só por enunciado |
| Toxicología | ✔ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | agregadora não reconhecida: toxcierre · casa só por enunciado |
| Dermatología | ✔ | ✔ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✖ | agregadora não reconhecida: dermcierre · portada: 294 flashcards (distintos=293, DOM total=482) |
| Guaraní | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ | sem <h2>: gn00 · 418/418 sem id · agregadora não reconhecida: mazognrl · casa só por enunciado |
| Ortopedia y Traumatología | ✔ | ✖ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ | 457/914 sem id · casa só por enunciado · portada: 432 flashcards (distintos=429, DOM total=1296) |
| Oftalmología | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | agregadora não reconhecida: oftcierre |
| Neurología | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | agregadora não reconhecida: revisaoneu |
| Anestesiología | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | agregadora não reconhecida: anecierre |

## Totais

| Regra | Matérias que cumprem (de 27) |
|---|--:|
| R1 | 13 |
| R2 | 6 |
| R3 | 14 |
| R4 | 12 |
| R5 | 23 |
| R6 | 27 |
| R7 | 27 |
| R8 | 27 |
| R9 | 0 |

R9 (marcadores `data-rm-*`) é 0 por construção: o contrato é uma proposta e nenhuma matéria foi editada. R3 mede se a **heurística atual do piloto** já reconheceria as agregadoras; onde ✖, o módulo contaria o dobro ou o triplo.
