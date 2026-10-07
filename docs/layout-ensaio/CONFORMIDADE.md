# Conformidade com o contrato de novos recursos · issue #457

> Gerado por `tools/qa/ensaio-layout/contrato.cjs` (modelo por item em `modelo.cjs`, regras em `regras.cjs`). ✔ = a regra é cumprida item a item pelo conteúdo de hoje; ✖ = exige edição editorial ou o marcador do contrato. **Nenhuma matéria foi alterada.** Os casos negativos que provam que R4, R5 e R9 falham quando devem estão em `contrato.teste.cjs`.

## Regras

| Regra | Descrição |
|---|---|
| R1 | toda seção tem título (<h2>): o card do índice e os botões Anterior/Próximo dependem dele |
| R2 | toda questão tem id estável (q-<prefixo><NNN>) |
| R3 | toda seção agregadora (cópia de itens dos blocos) é reconhecida: id casa a heurística do piloto OU leva data-rm-agrega |
| R4 | CADA cópia do Banco tem vínculo verificável (data-rm-copia-de ou bq-↔q-) com UMA questão canônica existente, de texto igual, sem repetição; e toda canônica tem a sua cópia |
| R5 | CADA número declarado na portada é igual à contagem CANÔNICA do recurso correspondente (agregadoras fora; coincidir com o total do DOM com cópias não basta) |
| R6 | nenhum id duplicado no documento |
| R7 | nenhuma mídia local quebrada |
| R8 | nenhuma URL assinada/caminho de storage no HTML estático (áudio só pelo manifesto) |
| R9 | marcadores data-rm-* presentes em CADA seção e item aplicável (role/n/unidad por seção; agrega nas agregadoras; q, copia-de, fc, video, aus por item) |

## Resultado por matéria

| Matéria | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Anatopatologia I | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Anatopatologia Práctica | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Fisiopatologia I | ✔ | ✖ | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✖ |
| Imagenología | ✔ | ✖ | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✖ |
| Semiología I | ✔ | ✖ | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✖ |
| Farmacología I | ✔ | ✖ | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✖ |
| Medicina Familiar | ✔ | ✖ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| Semiología II | ✔ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Farmacología II | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Embriología | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Biología | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Histología I | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Histología I Práctica | ✖ | ✖ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| Histología II Práctica | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Histología II | ✖ | ✖ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✖ |
| Anatomía I | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Anatopatologia II | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Anatopatologia II Práctica | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Medicina Legal | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Fisiopatologia II | ✖ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Toxicología | ✔ | ✔ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Dermatología | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Guaraní | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Ortopedia y Traumatología | ✔ | ✖ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Oftalmología | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Neurología | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ |
| Anestesiología | ✔ | ✔ | ✖ | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ |

## Totais

| Regra | Matérias que cumprem (de 27) |
|---|--:|
| R1 | 13 |
| R2 | 6 |
| R3 | 14 |
| R4 | 9 |
| R5 | 20 |
| R6 | 27 |
| R7 | 27 |
| R8 | 27 |
| R9 | 0 |

## R4 · cópias do Banco × questão canônica (cópia a cópia)

| Matéria | Cópias | Por marcador | Por convenção `bq-`↔`q-` | Sem vínculo | Alvo inexistente/é cópia | Repetidas | Texto diferente | Canônicas sem id | Canônicas sem cópia | Resultado |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|:-:|
| Anatopatologia I | 359 | 0 | 0 | 359 | 0 | 0 | 0 | 359 | 0 | ✖ |
| Anatopatologia Práctica | — | — | — | — | — | — | — | — | — | ✔ sem Banco geral |
| Fisiopatologia I | — | — | — | — | — | — | — | — | — | ✔ sem Banco geral |
| Imagenología | — | — | — | — | — | — | — | — | — | ✔ sem Banco geral |
| Semiología I | — | — | — | — | — | — | — | — | — | ✔ sem Banco geral |
| Farmacología I | — | — | — | — | — | — | — | — | — | ✔ sem Banco geral |
| Medicina Familiar | 26 | 0 | 0 | 26 | 0 | 0 | 0 | 64 | 0 | ✖ |
| Semiología II | 120 | 0 | 0 | 120 | 0 | 0 | 0 | 120 | 0 | ✖ |
| Farmacología II | 214 | 0 | 1 | 213 | 0 | 0 | 0 | 213 | 0 | ✖ |
| Embriología | 107 | 0 | 0 | 107 | 0 | 0 | 0 | 107 | 0 | ✖ |
| Biología | 123 | 0 | 0 | 123 | 0 | 0 | 0 | 123 | 0 | ✖ |
| Histología I | 150 | 0 | 0 | 150 | 0 | 0 | 0 | 150 | 0 | ✖ |
| Histología I Práctica | 106 | 0 | 0 | 106 | 0 | 0 | 0 | 106 | 0 | ✖ |
| Histología II Práctica | 289 | 0 | 0 | 289 | 0 | 0 | 0 | 289 | 0 | ✖ |
| Histología II | 226 | 0 | 0 | 226 | 0 | 0 | 0 | 226 | 0 | ✖ |
| Anatomía I | 459 | 0 | 0 | 459 | 0 | 0 | 0 | 459 | 0 | ✖ |
| Anatopatologia II | 156 | 0 | 0 | 156 | 0 | 0 | 0 | 156 | 0 | ✖ |
| Anatopatologia II Práctica | 112 | 0 | 0 | 112 | 0 | 0 | 0 | 112 | 0 | ✖ |
| Medicina Legal | 235 | 0 | 0 | 235 | 0 | 0 | 0 | 235 | 0 | ✖ |
| Fisiopatologia II | 319 | 0 | 0 | 319 | 0 | 0 | 0 | 0 | 319 | ✖ |
| Toxicología | 349 | 0 | 0 | 349 | 0 | 0 | 0 | 0 | 349 | ✖ |
| Dermatología | — | — | — | — | — | — | — | — | — | ✔ sem Banco geral |
| Guaraní | 209 | 0 | 0 | 209 | 0 | 0 | 0 | 209 | 0 | ✖ |
| Ortopedia y Traumatología | 457 | 0 | 0 | 457 | 0 | 0 | 0 | 0 | 457 | ✖ |
| Oftalmología | 139 | 0 | 139 | 0 | 0 | 0 | 0 | 0 | 0 | ✔ |
| Neurología | 179 | 0 | 179 | 0 | 0 | 0 | 0 | 0 | 0 | ✔ |
| Anestesiología | 177 | 0 | 177 | 0 | 0 | 0 | 0 | 0 | 0 | ✔ |

O vínculo por convenção de id (`bq-X` ↔ `q-X`) só vale se o alvo existe como questão canônica, tem **texto igual** (enunciado e alternativas) e não é repetido; casar «por enunciado» sem id nem marcador **não é vínculo** (a contagem exata fica indeterminada).

## R5 · números declarados na portada × contagem canônica

| Matéria | Declarado | Canônico (agregadoras fora) | Total do DOM (com cópias) | Estado |
|---|---|--:|--:|:-:|
| Anatopatologia I | — | — | — | ✔ sem número declarado na portada |
| Anatopatologia Práctica | — | — | — | ✔ sem número declarado na portada |
| Fisiopatologia I | 12 bloques | ? | — | ✖ indeterminado |
| Fisiopatologia I | 170 preguntas | 274 | 332 | ✖ diverge |
| Imagenología | 8 bloques | ? | — | ✖ indeterminado |
| Semiología I | 220 preguntas | 182 | 220 | ✖ diverge (= total do DOM duplicado) |
| Farmacología I | 52 infografias | 52 | 52 | ✔ |
| Farmacología I | 191 preguntas | 176 | 191 | ✖ diverge (= total do DOM duplicado) |
| Medicina Familiar | 8 bloques | ? | — | ✖ indeterminado |
| Medicina Familiar | 90 preguntas | 64 | 90 | ✖ diverge (= total do DOM duplicado) |
| Medicina Familiar | 177 flashcards | 82 | 177 | ✖ diverge (= total do DOM duplicado) |
| Semiología II | — | — | — | ✔ sem número declarado na portada |
| Farmacología II | 292 tarjetas | 292 | 876 | ✔ |
| Embriología | — | — | — | ✔ sem número declarado na portada |
| Biología | 39 infografias | 39 | 39 | ✔ |
| Histología I | — | — | — | ✔ sem número declarado na portada |
| Histología I Práctica | 12 bloques | ? | — | ✖ indeterminado |
| Histología I Práctica | 3 preguntas | 106 | 212 | ✖ diverge |
| Histología II Práctica | — | — | — | ✔ sem número declarado na portada |
| Histología II | 75 preguntas | 226 | 452 | ✖ diverge |
| Anatomía I | — | — | — | ✔ sem número declarado na portada |
| Anatopatologia II | — | — | — | ✔ sem número declarado na portada |
| Anatopatologia II Práctica | — | — | — | ✔ sem número declarado na portada |
| Medicina Legal | — | — | — | ✔ sem número declarado na portada |
| Fisiopatologia II | 14 bloques | 14 | 17 | ✔ |
| Fisiopatologia II | 319 preguntas | 319 | 638 | ✔ |
| Fisiopatologia II | 619 flashcards | 619 | 1857 | ✔ |
| Fisiopatologia II | 33 infografias | 33 | 33 | ✔ |
| Toxicología | 16 bloques | 16 | 19 | ✔ |
| Toxicología | 349 preguntas | 349 | 698 | ✔ |
| Toxicología | 472 flashcards | 472 | 1416 | ✔ |
| Dermatología | 13 bloques | 13 | 15 | ✔ |
| Dermatología | 120 preguntas | 120 | 120 | ✔ |
| Dermatología | 294 flashcards | 294 | 482 | ✔ |
| Guaraní | — | — | — | ✔ sem número declarado na portada |
| Ortopedia y Traumatología | 17 bloques | 17 | 20 | ✔ |
| Ortopedia y Traumatología | 457 preguntas | 457 | 914 | ✔ |
| Ortopedia y Traumatología | 432 flashcards | 432 | 1296 | ✔ |
| Oftalmología | 9 bloques | 9 | 12 | ✔ |
| Oftalmología | 139 preguntas | 139 | 278 | ✔ |
| Oftalmología | 267 flashcards | 267 | 801 | ✔ |
| Oftalmología | 27 infografias | 27 | 27 | ✔ |
| Neurología | 19 bloques | 19 | 22 | ✔ |
| Neurología | 34 infografias | 34 | 34 | ✔ |
| Neurología | 179 preguntas | 179 | 358 | ✔ |
| Neurología | 335 flashcards | 335 | 670 | ✔ |
| Anestesiología | 15 bloques | 15 | 18 | ✔ |
| Anestesiología | 177 preguntas | 177 | 354 | ✔ |
| Anestesiología | 232 flashcards | 232 | 464 | ✔ |
| Anestesiología | 19 infografias | 19 | 19 | ✔ |

## R9 · marcadores por seção e por item (faltas / aplicáveis)

| Matéria | Seções sem `data-rm-role` | Agregadoras sem `data-rm-agrega` | Perguntas canônicas sem `data-rm-q` | Cópias de pergunta sem `data-rm-copia-de` | Flashcards sem `data-rm-fc` | Cópias de flashcard sem link | Vídeos sem id | Resultado |
|---|--:|--:|--:|--:|--:|--:|--:|:-:|
| Anatopatologia I | 15/15 | 2 | 359/359 | 359/359 | 162/162 | 135/135 | 0/0 | ✖ |
| Anatopatologia Práctica | 12/12 | 1 | 76/76 | 0/0 | 246/246 | 95/95 | 0/0 | ✖ |
| Fisiopatologia I | 14/14 | 1 | 332/332 | 0/0 | 130/130 | 130/130 | 0/0 | ✖ |
| Imagenología | 12/12 | 1 | 87/87 | 0/0 | 75/75 | 49/49 | 0/0 | ✖ |
| Semiología I | 11/11 | 1 | 220/220 | 0/0 | 96/96 | 96/96 | 13/13 | ✖ |
| Farmacología I | 21/21 | 1 | 191/191 | 0/0 | 200/200 | 212/212 | 17/17 | ✖ |
| Medicina Familiar | 12/12 | 2 | 64/64 | 26/26 | 82/82 | 95/95 | 0/0 | ✖ |
| Semiología II | 14/14 | 2 | 120/120 | 120/120 | 172/172 | 194/194 | 0/0 | ✖ |
| Farmacología II | 17/17 | 2 | 214/214 | 214/214 | 292/292 | 584/584 | 9/9 | ✖ |
| Embriología | 16/16 | 2 | 107/107 | 107/107 | 149/149 | 149/149 | 3/3 | ✖ |
| Biología | 16/16 | 2 | 123/123 | 123/123 | 138/138 | 138/138 | 0/0 | ✖ |
| Histología I | 16/16 | 2 | 150/150 | 150/150 | 198/198 | 198/198 | 4/4 | ✖ |
| Histología I Práctica | 17/17 | 3 | 106/106 | 106/106 | 126/126 | 160/160 | 0/0 | ✖ |
| Histología II Práctica | 20/20 | 2 | 289/289 | 289/289 | 411/411 | 822/822 | 0/0 | ✖ |
| Histología II | 17/17 | 2 | 226/226 | 226/226 | 302/302 | 604/604 | 0/0 | ✖ |
| Anatomía I | 37/37 | 2 | 459/459 | 459/459 | 823/823 | 823/823 | 0/0 | ✖ |
| Anatopatologia II | 12/12 | 2 | 156/156 | 156/156 | 160/160 | 320/320 | 0/0 | ✖ |
| Anatopatologia II Práctica | 11/11 | 2 | 112/112 | 112/112 | 155/155 | 310/310 | 0/0 | ✖ |
| Medicina Legal | 21/21 | 2 | 235/235 | 235/235 | 374/374 | 748/748 | 0/0 | ✖ |
| Fisiopatologia II | 17/17 | 2 | 319/319 | 319/319 | 619/619 | 1238/1238 | 0/0 | ✖ |
| Toxicología | 19/19 | 2 | 349/349 | 349/349 | 472/472 | 944/944 | 0/0 | ✖ |
| Dermatología | 15/15 | 1 | 120/120 | 0/0 | 294/294 | 188/188 | 0/0 | ✖ |
| Guaraní | 16/16 | 2 | 209/209 | 209/209 | 298/298 | 298/298 | 0/0 | ✖ |
| Ortopedia y Traumatología | 20/20 | 2 | 457/457 | 457/457 | 432/432 | 864/864 | 0/0 | ✖ |
| Oftalmología | 12/12 | 2 | 139/139 | 139/139 | 267/267 | 534/534 | 0/0 | ✖ |
| Neurología | 21/22 | 2 | 179/179 | 179/179 | 335/335 | 335/335 | 2/2 | ✖ |
| Anestesiología | 18/18 | 2 | 177/177 | 177/177 | 232/232 | 232/232 | 0/0 | ✖ |

## Observações por matéria (R1–R3, R6–R8)

- **Anatopatologia I**: R1: sem <h2>: analise-guia · R2: 718/718 questões sem id
- **Anatopatologia Práctica**: R2: 76/76 questões sem id · R3: agregadora não reconhecida: b11
- **Fisiopatologia I**: R2: 332/332 questões sem id
- **Imagenología**: R2: 87/87 questões sem id
- **Semiología I**: R2: 220/220 questões sem id
- **Farmacología I**: R2: 191/191 questões sem id
- **Medicina Familiar**: R2: 90/90 questões sem id
- **Semiología II**: R2: 240/240 questões sem id
- **Farmacología II**: R1: sem <h2>: f2b00 · R2: 426/428 questões sem id · R3: agregadora não reconhecida: f2b15, f2b16
- **Embriología**: R1: sem <h2>: emb00 · R2: 214/214 questões sem id · R3: agregadora não reconhecida: emb14, emb15
- **Biología**: R1: sem <h2>: bio00 · R2: 246/246 questões sem id
- **Histología I**: R1: sem <h2>: histo00 · R2: 300/300 questões sem id · R3: agregadora não reconhecida: histo13, histo14
- **Histología I Práctica**: R1: sem <h2>: hp00 · R2: 212/212 questões sem id
- **Histología II Práctica**: R1: sem <h2>: h2pportada · R2: 578/578 questões sem id · R3: agregadora não reconhecida: h2pmazo
- **Histología II**: R1: sem <h2>: h2portada · R2: 452/452 questões sem id
- **Anatomía I**: R1: sem <h2>: a1b00 · R2: 918/918 questões sem id
- **Anatopatologia II**: R1: sem <h2>: ap2intro, ap2biblio · R2: 312/312 questões sem id
- **Anatopatologia II Práctica**: R1: sem <h2>: ap2pportada · R2: 224/224 questões sem id · R3: agregadora não reconhecida: ap2pmazo
- **Medicina Legal**: R1: sem <h2>: medlegb00 · R2: 470/470 questões sem id
- **Fisiopatologia II**: R1: sem <h2>: fp2portada · R3: agregadora não reconhecida: revisaofp2
- **Toxicología**: R3: agregadora não reconhecida: toxcierre
- **Dermatología**: R3: agregadora não reconhecida: dermcierre
- **Guaraní**: R1: sem <h2>: gn00 · R2: 418/418 questões sem id · R3: agregadora não reconhecida: mazognrl
- **Ortopedia y Traumatología**: R2: 457/914 questões sem id
- **Oftalmología**: R3: agregadora não reconhecida: oftcierre
- **Neurología**: R3: agregadora não reconhecida: revisaoneu
- **Anestesiología**: R3: agregadora não reconhecida: anecierre

## Formato de `audio_id` (código real × contrato)

- Servidor `_audio/lib.js:35`: `/^[a-z0-9][a-z0-9._-]{0,79}$/i`
- Motor `assets/rm-audio.js:118`: `/^[a-z0-9][a-z0-9._-]{0,79}$/i`
- Documentado no contrato: ✔ idêntico · servidor = motor: ✔

R9 é ✖ em todas por construção: o contrato é uma proposta e nenhuma matéria foi editada. R3 mede se a **heurística atual do piloto** já reconheceria as agregadoras; onde ✖, o módulo contaria o dobro ou o triplo.
