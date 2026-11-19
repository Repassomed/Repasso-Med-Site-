# Neurología · rastreabilidade das questões por arquivo de prova (PR #687 · 19/11/2026)

Complementa `neurologia-8a1b-conferencia-v1.md` (registro por questão) e `neurologia-revisar-triagem-v1.md` (186 candidatos do compilado). Este arquivo responde a uma pergunta só: **de cada arquivo da pasta «Questões», o que foi aberto, quantas questões foram detectadas e o que aconteceu com cada uma — com números que fecham.**

Estado do site: **295 perguntas** (MCQ 195 · V/F 71 · DEFINE 29), no bloco e no banco (590 itens). Antes da PR: 254. Novas desta PR: `q-neu249`–`q-neu289` (41 ids; ver §9).

## 0 · Códigos e regra de contagem
| Código | Significado |
|---|---|
| **COB** | já coberta por pergunta existente **com o mesmo raciocínio** (id citado) |
| **COB-P** | coberta em parte (outro raciocínio ou sem apoio para a variante); motivo na linha |
| **NOVA** | pergunta nova criada a partir do item (id citado), com ensino prévio no resumo (8-A.2) |
| **MEL** | pergunta existente **melhorada/reformulada** (8-A.1-B; id preservado; bloco e banco atualizados) ou re-rotulada |
| **PEND** | pendente: nada foi inventado; motivo e o que falta |
| **REP** | repetição do mesmo item já contado em outro arquivo (não é questão nova) |
| **FORA** | fora do escopo de Neurologia |

**Regra de atribuição:** uma pergunta nova é contada **uma vez**, no arquivo em que o item apareceu **primeiro** na ordem deste documento; nos demais arquivos o mesmo item aparece como **COB (id novo)** ou **REP**. Assim a soma das NOVA por arquivo = número de ids novos, sem dupla contagem.

## 1 · Quadro-resumo por arquivo (os números fecham por linha)
| Arquivo | Aberto como | Detectadas | NOVA | MEL | COB | COB-P | PEND | REP/FORA | Soma |
|---|---|---|---|---|---|---|---|---|---|
| `Examen Final Neurologia seccion A fila 1.docx` | texto integral + **5 imagens extraídas e vistas** | 30 | 3 | 2 | 25 | 0 | 0 | 0 | **30** |
| `Examen Final … fila 1 pdf.pdf` | texto extraído (30 itens; os numerais 10 e 20 não saíram na extração, mas existem no docx); mesma prova do docx | 30 | 0 | 0 | 0 | 0 | 0 | 30 REP | **30** |
| Simulado **Turma A (P2)** — 4 fotos de enunciado + 2 de gabarito | OCR do Drive; **figuras não vistas** | 20 | 1 | 3 | 16 | 0 | 0 | 0 | **20** |
| **Turma C (P2)** — 1 foto manuscrita | OCR do Drive | 10 | 1 | 2 | 5 | 0 | 2 | 0 | **10** |
| **Manuscrito 12–19** — 1 foto | OCR do Drive | 8 | 1 | 0 | 6 | 0 | 1 | 0 | **8** |
| **Prova D-2 (26/09)** — 3 fotos de 06/10 | **vistas como imagem** | 20 | 1 | 0 | 18 | 0 | 1 | 0 | **20** |
| **P1 seção C (19/09)** — 14 fotos de 25/09 + 3 de 19/09 | OCR do Drive (as 3 de 19/09 são anotações manuscritas) | 20 | 1 | 0 | 19 | 0 | 0 | 0 | **20** |
| `Prova de Neurologia P1 - Dra Silvia.pdf` | texto extraído (20 itens) | 20 | 3 | 0 | 17 | 0 | 0 | 0 | **20** |
| `provasneuroP1261.pdf` | texto do Drive (2 provas de março/2026, 20 + 20 itens) | 40 | 3 | 0 | 17 | 0 | 0 | 20 REP | **40** |
| `Notes_261006_214640.pdf` | texto completo (71 itens numerados) | 71 | 0 | 0 | 70 | 1 | 0 | 0 | **71** |
| `Provas neuro Aline .pdf` | OCR parcial do Drive (PDF escaneado de 5,2 MB) | 10 | 0 | 0 | 4 | 0 | 1 | 2 REP + 3 FORA | **10** |
| `provaneurorevisar_sem_repetidas.pdf` — 186 candidatos | texto extraído (1 464 parágrafos) | 186 | 37 linhas ACR (= 23 perguntas) | 0 | 61 | 26 | 60 (40 ENS + 20 FNT) | 2 DESC | **186** |
| `provaneurorevisar_sem_repetidas.pdf` — 281 parágrafos restantes | texto extraído; revisão por sobreposição + leitura parcial (ver §8) | 281 | 3 ids (6 parágrafos ACR) | 0 | 81 (grupo A, provável) | 119 (grupo B, a conferir) | 75 (grupo C, a conferir) | — | **281** |

Observações que mantêm a tabela honesta:
- A linha dos 186: 37 linhas ACR geraram 23 perguntas novas (`q-neu262`–`284`); 61 COB + 26 COB-P + 37 ACR + 60 PEND (40 ENS + 20 FNT) + 2 DESC = **186**. A linha dos 281 usa os grupos A/B/C do §8 (coluna COB = A; COB-P = B; PEND = C, todos «a conferir» por não terem comparação item a item).
- **Soma das perguntas novas:** 3+1+1+1+1+1+3+3+23+3 = 40, mais `q-neu261` (compilado, parágrafo fora dos 186, pack §11) = **41 ids** (`q-neu249`–`289`).
- «Examen pdf»: não é prova diferente — é a mesma do docx; 30 REP.
- `provasneuroP1261.pdf`: 20 itens são a mesma prova de `P1 - Dra Silvia` (REP); os outros 20 são a prova do ano (set A).
- `Aline`: 4 COB + 2 REP (itens 5 e 6, repetem a P1 Silvia) + 3 FORA (trauma geral/urgência) + 1 PEND (GCS com «NT») = 10.

## 2 · O que NÃO foi aberto ou não foi visto (avisos)
1. **Figuras dentro das fotos de 18/11** (a «imagem simulada» de RM do item 20 da Turma A): **não vistas**. A pergunta `q-neu255` descreve em palavras.
2. **Item 28 do docx**: a figura ficou não decidível (só o enunciado de texto); `q-neu129` cobre o raciocínio escrito.
3. **`Notes_261006_214640.pdf`: 479 imagens embutidas não foram abertas**; foi lido só o texto. Aproximadamente 12 trechos sem número (casos soltos, anotações) não foram itemizados.
4. **`Provas neuro Aline .pdf`**: escaneado e manuscrito; só o OCR parcial do Drive. Anotações de estudo manuscritas (listas de pares cranianos etc.) **não foram transcritas** e não são contadas como questões.
5. **3 fotos de 19/09** (`IMG_1262/1263`, `b9b7bb6f…`): anotações manuscritas; só OCR.
6. **`Turma C 2`** e **`Turma C 6 (grave)`**, **`Manuscrito 15`**, **`D-2 10`**: enunciado ou resposta ilegível/parcial → PEND.
7. **Contagem de arquivos:** o pack anterior dizia 37 arquivos na pasta; a listagem do Drive nesta rodada devolveu **35**. Não identifiquei quais 2 faltam (podem ser itens da lixeira ou subpastas); nenhuma prova conhecida ficou de fora.
8. **Gabarito oficial: nenhuma prova da pasta traz clave oficial da cátedra.** Todas as respostas vêm de slide, do compilado ou de anotação de aluno; as perguntas «só do compilado» (§7) não estão confirmadas em slide nem em livro (não existe literatura-base de Neurologia).

## 3 · Itens por arquivo (docx, Turma A/C, manuscrito, D-2, P1 seção C)
O registro por item (n.º do arquivo → id → decisão) está no pack `neurologia-8a1b-conferencia-v1.md` §5.1–§5.6. Resumo dos ids:
- **docx (30):** NOVA `249` (item 7), `251` (22), `252` (29); MEL `134` (10), `135` (14); COB: 1→`111`, 2→`123`, 3→`116`, 4→`087`, 5→`124`, 6→`166`, 8→`120`, 9→`110`, 11→`171`, 12→`114`/`158`, 13→`096`, 15→`122`, 16→`137`, 17→`117`, 18→`133`, 19→`136`, 20→`127`, 21→`173`, 23→`248`, 24→`115`, 25→`003`+`004`, 26→`138`, 27→`128`, 28→`129`, 30→`132` (25 COB).
- **Turma A (20):** NOVA `255` (20); MEL `090` (5), `181` (19), `091` (16, re-rotulada); COB 16 (ids no pack §5.2).
- **Turma C (10):** NOVA `253` (3); MEL `090` (1), `224` (8); COB 4,7,9,10,11; PEND 2 e 6.
- **Manuscrito (8):** NOVA `254` (12); COB 13,14,16,17,18,19 (`168`/`091`, `240`, `239`, `122`, `248`, `173`); PEND 15.
- **D-2 (20):** NOVA `250` (19); COB 18 (ids no pack §5.5; o 18 é variante com mesmo raciocínio); PEND 10 («par craneal epigástrico»).
- **P1 seção C (20):** NOVA `257` (16); COB 19 (`-2509-01`…`06`, `078`, `166`, `087`, `099`, `100`, `142`, `139`, `141`, `024`/`025`, `143`, `140`, `098`, `118`+`249`, `144`).

## 4 · `Prova de Neurologia P1 - Dra Silvia.pdf` (20 itens)
| n.º | Tema | Site | Código | Comparação de raciocínio e completude |
|---|---|---|---|---|
| 1 | origem real do V par | `q-neu109` | COB | mesmo raciocínio (núcleos no tronco + C); site completo |
| 2 | hiperprosexia | `q-neu107` | COB | = ; site cobre hipo e hiperprosexia |
| 3 | lesão do VII | `q-neu154` | COB | = ; distratores do site mais precisos |
| 4 | Sunderland/Seddon | `q-neu125` | COB | = |
| 5 | Wallenberg | `q-neu118` + `q-neu249` | COB | a 249 pede os pares; a prova pede o nome — ambos cobertos |
| 6 | neuralgia do glossofaríngeo | `q-neu112` | COB | = |
| 7 | síndromes irritativas | `q-neu114`/`158` | COB | = |
| 8 | medular posterior | `q-neu121` | COB | = |
| 9 | fácies parkinsoniana (DEFINE) | `q-neu289` | **NOVA** | `q-neu148/149` cobrem a definição curta; a prova pede **citar quatro características** (raciocínio aberto) → DEFINE nova, com slide de Parkinson |
| 10 | síndrome deficitária (DEFINE) | `q-neu159` | COB | = (a existente já é DEFINE) |
| 11 | testes do XI | `q-neu113` | COB | = |
| 12 | Eaton-Lambert | `q-neu257`/`082` | COB | 257 foi criada da P1 seção C (mesmo raciocínio) |
| 13 | marcha em ceifador × tesoura | `q-neu256` | **NOVA** | `q-neu011` cita as marchas; nenhuma V/F testava «inclinado para a frente + tesoura» → `256`, slide 1 |
| 14 | centrais não afetam piramidal | `q-neu117` | COB | = |
| 15 | decorticação | `q-neu003` | COB | = |
| 16 | afasia de condução | `q-neu106`/`259` | COB | = |
| 17 | GCS 10/15 (E2 V4 M5 = 11) | `q-neu288` | **NOVA** | `q-neu097` e `-2509-06` calculam outros casos; este V/F é **falso** porque soma 11 (2+4+5) → `288`, escala do slide de TEC |
| 18 | caso 1: nível de consciência | `q-neu145` | COB | = |
| 19 | caso 2: heminegligência/hemianopsia | `q-neu161` | COB | = |
| 20 | caso 3: dor cervical-ombro | `q-neu075`/`163` | COB | = |
Soma: NOVA 3 + COB 17 = **20**.

## 5 · `provasneuroP1261.pdf` (40 itens detectados)
**Set B (20 itens, 19/03/2026)** = mesma prova de `P1 - Dra Silvia` (tabela §4): 20 REP. **Set A (20 itens, outra turma, «Central»):**
| n.º | Tema | Site | Código |
|---|---|---|---|
| 1 | origem real do IX | `q-neu111` | COB |
| 2 | estado vegetativo | `q-neu145` / `q-neu282` | COB |
| 3 | marcha atáxica tabética | `q-neu258` | **NOVA** (marcha por perda proprioceptiva; antes só citada em explicações; bloco 03) |
| 4 | agrupa paresias, hipoestesias, amnésias, apraxias | `q-neu116` | COB |
| 5 | Benedikt | `q-neu119` | COB |
| 6 | Lasègue, radicular agudo | `q-neu144` | COB |
| 7 | Brown-Séquard (conjunto) | `q-neu250` | COB (250 criada da D-2) |
| 8 | miastenia, fisiopatologia | `q-neu166`/`165` | COB |
| 9 | olfatório | `q-neu151` | COB |
| 10 | neumogástrico | `q-neu156` | COB |
| 11 | síndromes irritativas | `q-neu114` | COB |
| 12 | GCS 8/15 (V/F) | `q-neu260` | **NOVA** (O3 + V3 + M4 = 10; a afirmação «8/15» é falsa; bloco 18) |
| 13 | facies amímica | `q-neu149` | COB |
| 14 | hipoprosexia | `q-neu107` | COB |
| 15 | descerebração | `q-neu004` | COB |
| 16 | pares só motores | `q-neu108` | COB |
| 17 | síndromes centrais (V/F) | `q-neu117` | COB |
| 18 | crise temporal (déjà vu) | `q-neu115` | COB |
| 19 | afasia de condução em caso | `q-neu259` | **NOVA** (`q-neu106` era só V/F) |
| 20 | Froment, nervo ulnar | `q-neu163` | COB |
Soma: 20 REP + 3 NOVA (3, 12, 19) + 17 COB = **40**.

## 6 · `Notes_261006_214640.pdf` (71 itens numerados)
Todas as entradas foram associadas a ids do site por sobreposição de texto e leitura; as entradas em castelhano são tradução das em português (mesmo raciocínio); 9 entradas **repetem** itens do mesmo arquivo (1183, 1189, 1205, 1211, 1212, 1218, 1224, 1247, 1266 repetem 983, 971, 995, 959, 989, 977, 1029, 1003, 1018) — todas contadas como COB (têm o mesmo id).
| Entrada(s) | Tema | Id(s) no site | Código |
|---|---|---|---|
| 84 | origem do V | `q-neu109` | COB |
| 96, 421 | hiper/hipoprosexia | `q-neu107` | COB |
| 106 | lesão do VII | `q-neu154` | COB |
| 119 | Sunderland | `q-neu125` | COB |
| 131, 897 | Wallenberg | `q-neu118`, `q-neu249` | COB |
| 143 | neuralgia do glossofaríngeo | `q-neu112` | COB |
| 154, 436 | irritativas | `q-neu114`/`158` | COB |
| 164 | medular posterior | `q-neu121` | COB |
| 177, 322, 415 | fácies parkinsoniana | `q-neu148`, `q-neu149`, **`q-neu289`** | COB (289 criada na P1 Silvia 9) |
| 184, 360 | síndrome deficitária | `q-neu159`, `q-neu116` | COB |
| 191 | testes do XI | `q-neu113` | COB |
| 198, 339, 892 | Eaton-Lambert | `q-neu257`, `q-neu081` | COB |
| 207, 341 | segador × tesoura | `q-neu256` | COB |
| 211, 344 | centrais | `q-neu117` | COB |
| 219, 347, 426 | decorticação/descerebração | `q-neu003`/`004` | COB |
| 226, 350 | afasia de condução | `q-neu106`, `q-neu259` | COB |
| 233, 353 | GCS 10/15 | `q-neu288`, `q-neu097` | COB |
| 242 | caso 1: nível de consciência | `q-neu145` | COB |
| 249 | caso 2 | `q-neu161` | COB |
| 255 | caso 3 | `q-neu075`, `q-neu163` | COB |
| 393 | olfatório | `q-neu151` | COB |
| 408, 894, 995, 1205 | GCS 8/15 e variantes | `q-neu260`, `q-neu098` | COB (260 criada na P1261-A 12) |
| 431 | pares só motores | `q-neu108` | COB |
| 869 | 4 reflexos de morte encefálica | `q-neu100` | COB |
| 874 | Weber | `q-neu142` | COB |
| 879, 949, 1168 | provas de pares (III, VIII, VII) | `q-neu153` | COB |
| 884 | síndrome frontal | `q-neu141` | COB |
| 886 | facial central | `q-neu025` | COB |
| 888 | Brown-Séquard | `q-neu143`, `q-neu250` | COB |
| 890 | hiposmia no Parkinson | `q-neu140` | COB (conflito de anosmia: ver triagem) |
| 901 | lombociática | `q-neu144` | COB |
| 905, 1029, 1224 | TEC grave / GCS | `q-neu-2509-06`, `q-neu247` | COB |
| 944 | alterações do IX | `q-neu157` | COB |
| 954 | causas estruturais de coma | `q-neu172` | COB |
| 959, 1211 | oblíquo superior | `q-neu150` | COB |
| 971, 1189 | apraxia da marcha | `q-neu147` | COB |
| 977, 1218 | N3 | `q-neu168` | COB |
| 983, 1183 | MNI | `q-neu164` | COB |
| 989, 1212 | ataxia cerebelosa | `q-neu162` | COB |
| 1003, 1247 | trauma medular, Brown-Séquard | `q-neu250` | COB |
| 1018, 1266 | miastenia | `q-neu165` | COB |
| 1146 | causas metabólicas de coma | `q-neu170` | COB |
| 1155 | «par craneal epigástrico» | `q-neu156`/`157` | **COB-P** (nome inexistente; identificação provável) |
Contagem: 71 entradas = **70 COB + 1 COB-P**; 0 NOVA (os ids novos que a fonte originou foram contados na P1 Silvia por ser a 1.ª ocorrência), 0 MEL, 0 PEND.

## 7 · `Provas neuro Aline .pdf` (10 itens legíveis no OCR parcial)
| Item | Tema | Código |
|---|---|---|
| 1 | XABCDE, torniquete (trauma geral) | FORA |
| 2 | GCS: abre ao dor, sons incompreensíveis, decorticação = 7 | COB `q-neu097`/`247` |
| 3 | GCS com componente não testável (NT) | **PEND**: nenhuma pergunta do site pede registrar «NT» e nenhum dos 16 slides o ensina (busca por «no evaluable»/intubado) |
| 4 | risco laboral | FORA |
| — | «Paciente A urgência / B emergência» | FORA |
| 5, 6 | Wallenberg, neuralgia do IX | REP (P1 Silvia 5, 6) |
| V/F 1–3 (manuscrito) | decorticação (flexão anormal), X é misto, tetraplegia não é deficitária | COB `q-neu003`, `q-neu108`, `q-neu159` |
Contagem: 10 itens = 4 COB (item 2 + 3 V/F) + 2 REP + 3 FORA + 1 PEND = **10**.

## 8 · `provaneurorevisar_sem_repetidas.pdf` — os 281 parágrafos restantes
Dos 467 parágrafos que o pipeline marcou como candidatos, 186 foram fechados um a um na triagem (`neurologia-revisar-triagem-v1.md`). Os **281 restantes** foram classificados por **sobreposição de texto com a pergunta mais próxima** e por leitura dos trechos; **não houve comparação item a item de raciocínio** (os parágrafos incluem fragmentos de alternativas e perguntas em duas ou três línguas). Por isso **não os declaro COB definitivos**:
| Grupo | Critério | Parágrafos |
|---|---|---|
| **ACR** | levaram a perguntas novas com slide: `q-neu285` (punção lombar — 169), `q-neu286` (Cheyne-Stokes — 439, 995), `q-neu287` (Argyll Robertson — 741, 974, 975) | 6 |
| **A** | sobreposição ≥ 0,75 — mesmo enunciado/tema de pergunta do site; **COB provável**, confirmada por leitura do trecho | 81 |
| **B** | 0,50–0,74 — mesmo tema do id citado; raciocínio **não** comparado item a item → **a conferir** | 119 |
| **C** | < 0,50 — sem par claro; maioria é tema não ensinado (vascular, siringomielia, miopatias) ou fragmento → **a conferir / ENS** | 75 |
Soma: 6 + 81 + 119 + 75 = **281**. Os grupos B e C são registrados como **pendência na fila #686** (conferência de raciocínio). A lista completa (parágrafo → id mais próximo → escore → grupo) está no anexo §10.

## 9 · Ids novos desta PR e origem
`249` (docx 7) · `250` (D-2 19) · `251`/`252` (docx 22/29, imagens reconstruídas em palavras) · `253` (Turma C 3) · `254` (manuscrito 12) · `255` (Turma A 20) · `256` (Silva 13) · `257` (P1 seção C 16) · `258` (P1261-A 3) · `259` (P1261-A 19) · `260` (P1261-A 12) · `261` (compilado, pack §11) · `262`–`284` (compilado, 23) · `285`–`287` (compilado, 281 restantes) · `288` (Silva 17) · `289` (Silva 9). Total desde a `main`: ver contagem 254 → 295.

## 10 · Fila das 6 perguntas só do compilado (limitação)
`q-neu263`, `265`, `266`, `267`, `268`, `283`: **sem confirmação em slide nem em livro** (não existe literatura-base de Neurologia no projeto). Mantidas com a nota de que a resposta é a do compilado; **gabarito não confirmado, nada inventado**; ficam pendentes de confirmação por José/cátedra.

## 11 · Anexo — 281 parágrafos (parágrafo · id mais próximo · escore · grupo)
| Parágrafo | Id | Escore | Grupo | Início do texto |
|---|---|---|---|---|
| 6 | 240 | 0.38 | C | Pcte mulher, menstruada com cefalea, vomito, papiledema, na TAC está n |
| 21 | 066 | 0.36 | C | Pcte con Parálisis de la pierna de tipo flácido con Babinski e hiperre |
| 22 | 173 | 0.43 | C | La arteria cerebral anterior, posterior de la emergencia de la arteria |
| 28 | 253 | 0.5 | B | ¿Conocida como hemorragia cerebral espontánea, intraparenquimatosa del |
| 30 | 253 | 0.4 | C | Las lesiones productoras de la hemorragia intraparenquimatosa del hipe |
| 35 | 173 | 0.53 | B | En un paciente de 70 años de edad, hipertenso, fumador y en sobrepeso, |
| 51 | 173 | 0.38 | C | Un paciente que tiene como secuela de un INFARTO ISQUÉMICO cerebral, i |
| 53 | 173 | 0.54 | B | En el infarto cerebral isquémico no embolico del territorio superficia |
| 58 | 133 | 1.0 | A | EL ÁREA DE WERNICKE HEMISFERIO DOMINANTE |
| 69 | 249 | 0.67 | B | El vértigo es frecuente en los episodios de ATI de: |
| 71 | 049 | 0.43 | C | Los infartos del territorio vertebro basilar pueden dar hemipléjica al |
| 81 | 173 | 0.44 | C | Los infartos isquémicos circunscritos al territorio profundo de la art |
| 83 | 173 | 0.5 | B | La arteria cerebral anterior irriga la parte inferior de la circunvolu |
| 85 | 242 | 0.43 | C | La causa más frecuente de hemorragia intraparenquimatosa ocurre en hip |
| 91 | 180 | 0.4 | C | Las malformaciones arteriovenosas de la circulación cerebral suelen pr |
| 97 | 175 | 0.57 | B | La rigidez de nuca NO es frecuente encontrarla en pacientes con hemorr |
| 139 | 238 | 0.67 | B | En las crisis epilépticas generalizadas: |
| 141 | 115 | 0.5 | B | En las crisis epilépticas parciales simples NO hay pérdida de la conci |
| 150 | 151 | 0.5 | B | ¿El ataque epiléptico en pacientes portadores de epilepsia del lóbulo  |
| 159 | 238 | 0.5 | B | El EMG sirven para explorar la conducción a través de las vías central |
| 163 | 182 | 0.6 | B | Cefalea, vomito, rigidez de nuca: ¿examen? |
| 165 | 242 | 0.38 | C | ¿En cuáles circunstancias donde puede existir una hipertensión endocra |
| 169 | 285 | 0.6 | ACR | Los espacios más seguros para hacer la punción lumbar son: |
| 173 | 124 | 0.4 | C | De las siguientes condiciones en clínica neurológica ¿en cuál resultar |
| 179 | 132 | 0.38 | C | Las siguientes características de una muestra de LCR: turbio, con 1500 |
| 181 | 036 | 0.43 | C | En las meningoencefalitis bacterianas suele existir pleocitosis a pred |
| 183 | 176 | 0.4 | C | En las meningoencefalitis bacterianas el LCR suele ser claro y transpa |
| 191 | 131 | 0.5 | B | El EMG (electromiograma) es una investigación importante para el diagn |
| 197 | 179 | 0.38 | C | De las siguientes investigaciones neurofisiológicas hay una que es imp |
| 199 | 238 | 0.5 | B | Los potenciales evocados somato-sensoriales sirven para explorar la co |
| 203 | 251 | 0.38 | C | Diga a que corresponde la imagen de la presente TAC, de un paciente qu |
| 225 | 090 | 0.71 | B | El sueño REM se caracteriza por ondas de alta amplitud y de frecuencia |
| 229 | 179 | 0.38 | C | Cuales investigaciones hay una que puede resultar de utilidad en el es |
| 253 | 168 | 1.0 | A | EL SONAMBULISMO ES UN TRASTORNO DEL SUEÑO |
| 256 | 105 | 1.0 | A | El coma se define como un estado de conciencia que: |
| 257 | 001 | 1.0 | A | El paciente no responde a ningún estímulo, ni siquiera de dolor, no ti |
| 258 | 002 | 0.65 | B | Cuando a un paciente en coma le realizamos una prueba calórica de irri |
| 262 | 002 | 0.36 | C | Quando em um paciente em coma é realizado una prova calórica de irriga |
| 274 | 236 | 0.4 | C | CITE AS POSSIVEIS CAUSAS DO ESTADO DE COMA: |
| 332 | 004 | 1.0 | A | La rigidez de descerebración se caracteriza por postura de hiperextens |
| 334 | 003 | 0.87 | A | Un paciente en coma con actitud de hiperextensión de miembros inferior |
| 336 | 005 | 0.77 | A | Si en un paciente en estado comatoso encontramos que al levantarle los |
| 340 | 103 | 0.6 | B | En cuál de las dos de las siguientes circunstancias se produce más ráp |
| 341 | 241 | 0.5 | B | En disminuciones súbitas del flujo sanguíneo cerebral por debajo de 25 |
| 342 | 005 | 0.43 | C | Paciente con EPOC severa, descompensada, que cae em coma, este estado  |
| 355 | 240 | 0.75 | A | El papiledema es exponente de un Sx de hipertensión endocraneana. |
| 363 | 121 | 0.5 | B | Lesión por anosmia, ocurre la pérdida de la sensibilidad al sentido de |
| 367 | 014 | 0.58 | B | Cuando estamos explorando el reflejo fotomotor, normalmente debe produ |
| 369 | 150 | 0.5 | B | El musculo ciliar del ojo esta inervado por: |
| 371 | 015 | 0.77 | A | Un paciente que presenta ptosis palpebral del parpado superior derecho |
| 372 | 015 | 1.0 | A | Las fibras extrínsecas e intrínsecas del III par derecho |
| 373 | 139 | 0.5 | B | En el reflejo de acomodación y convergencia, en su vertiente eferente  |
| 375 | 249 | 0.5 | B | ¿Los pares craneales III, IV e VI se pueden explorar de forma conjunta |
| 377 | 015 | 0.4 | C | Una ptosis palpebral unilateral, con la consiguiente disminución de la |
| 380 | 139 | 0.6 | B | Las fibras parasimpáticas del III par se examinan explorando los refle |
| 382 | 139 | 0.53 | B | En el reflejo de acomodación y convergencia, ambos nervios oculomotore |
| 386 | 022 | 0.93 | A | En las lesiones periféricas del nervio facial puede estar afectada la  |
| 388 | 021 | 0.57 | B | La sensibilidad de una hemicara depende de fibras sensitivas del nervi |
| 390 | 018 | 1.0 | A | La rama maxilar superior del trigémino inerva la córnea y la conjuntiv |
| 398 | 139 | 0.67 | B | La vertiente eferente del reflejo fotomotor depiende del nervio III pa |
| 400 | 110 | 0.5 | B | La vertiente aferente (sensitiva) del reflejo corneal depende de: |
| 402 | 110 | 0.57 | B | La rama motora del reflejo corneal depende del nervio facial |
| 404 | 119 | 0.4 | C | Cuál de las siguientes posibilidades se ajusta a la de un paciente con |
| 408 | 030 | 1.0 | A | Una lesión del nervio X ocasiona parálisis de la hemilengua de ese lad |
| 410 | 020 | 0.77 | A | Un paciente joven, completamente sano, desarrolla en unas pocas horas  |
| 414 | 028 | 0.71 | B | Un paciente presenta al examen físico de los pares craneales una desvi |
| 416 | 029 | 1.0 | A | La lesión de un nervio accesorio XI par da por resultado: |
| 418 | 026 | 0.8 | A | La maniobre de Rinne con el diapasón se utiliza para explorar: |
| 420 | 084 | 0.8 | A | Un paciente con lesión del nervio hipogloso derecho presentará: |
| 422 | 021 | 0.65 | B | Un paciente consulta porque desde hace 2 días, cuando come los aliment |
| 424 | 023 | 1.0 | A | El nervio facial tiene su origen real en: |
| 425 | 023 | 1.0 | A | EN LA PARTE INFERIOR DE LA PROTUBERANCIA |
| 426 | 019 | 1.0 | A | La abolición del reflejo corneal nos hace pensar en: |
| 437 | 011 | 0.83 | A | La marcha en “Steppage” es característica de neuropatías periféricas m |
| 439 | 286 | 0.6 | ACR | La respiración de Cheyne-Stokes suele presentarse en: |
| 441 | 203 | 0.5 | B | Las respuestas anormales de “prensión” y “succión” se pueden producir  |
| 443 | 058 | 1.0 | A | Los abscesos del lóbulo occipital suelen dar: |
| 449 | 201 | 0.4 | C | El cuadro clínico de la enfermedad de Cushing es producido por: |
| 455 | 249 | 0.4 | C | La forma clínica más frecuente de la polineuropatía diabética es: |
| 457 | 247 | 0.5 | B | Sx de afectación Total motora y sensitiva: |
| 459 | 068 | 0.5 | B | Las neuropatías periféricas sensitivas suelen dar un patrón de pérdida |
| 461 | 046 | 0.8 | A | En el Sx de la motoneurona del asta anterior podemos encontrar: |
| 463 | 250 | 0.5 | B | En el Sx de Brown-Sequard existe una parálisis: |
| 465 | 063 | 0.81 | A | Un paciente recibe una herida de arma blanca en la espalda a nivel par |
| 473 | 048 | 0.62 | B | Las lesiones del haz cortico-espinal en la cápsula interna producen un |
| 475 | 050 | 0.67 | B | El Haz Cortico-Espinal se origina en la corteza de la circunvolución p |
| 477 | 180 | 0.5 | B | Los meningiomas son los tumores cerebrales más frecuentes |
| 479 | 042 | 0.75 | A | Las modalidades sensitivas de dolor y temperatura se conducen en la me |
| 481 | 041 | 0.36 | C | Las lesiones transversas de la medula espinal torácica (dorsal) produc |
| 488 | -2509-06 | 0.43 | C | El paciente flexiona ambas piernas cuando se le lleva a posición de se |
| 491 | 075 | 0.76 | A | Un paciente aqueja un Sx sensitivo caracterizado por dolor que irradia |
| 493 | 067 | 0.83 | A | La degeneración combinada subaguda de la médula espinal se caracteriza |
| 495 | 246 | 0.5 | B | Las hemiplejias alternas ocurren por lesiones: |
| 497 | 082 | 0.44 | C | El Sx de bloqueo de la conducción del impulso nervioso en la placa NM  |
| 499 | 083 | 0.55 | B | Una paciente consulta porque cuando lleva varios minutos hablando se l |
| 501 | 078 | 1.0 | A | En la miastenia gravis autoinmune se producen autoanticuerpos contra: |
| 502 | 078 | 0.43 | C | Los receptores nicotínicos post-sinápticos de acetil- colina de la pla |
| 504 | 082 | 0.4 | C | El pcte sufre de un disturbio de la transmisión del impulso nervioso |
| 505 | 064 | 0.68 | B | Un paciente recibió hace un mes una herida de arma blanca por la espal |
| 507 | 159 | 0.4 | C | En el Sx siringomiélico las manifestaciones de disfunción sensitiva de |
| 510 | 172 | 0.5 | B | EN ALGÓN SEGMENTO DEL TRONCO CEREBRAL |
| 511 | 111 | 0.5 | B | Las estructuras del SNC que constituyen el sistema motor, la médula es |
| 513 | 040 | 0.35 | C | Las aferencias sensitivas propioceptivas Inconscientes, procedentes de |
| 515 | 048 | 0.43 | C | La decusación del 80% de las fibras de los haces cortico-espinales se  |
| 527 | 036 | 0.4 | C | A marcha em “STEPAGGE” é características de neuropatias periféricas? |
| 535 | 005 | 0.38 | C | Se um paciente em como ao levantarmos as pálpebras apresenta desvio do |
| 537 | 068 | 0.38 | C | As neuropatias periféricas sensitivas ocorrem em padrão de perda sensi |
| 539 | 074 | 0.6 | B | Em una lesão do nervo radial podemos encontrar: |
| 543 | 032 | 0.56 | B | Quando exploramos o reflexo profundo bicipital, estamos avaliando o es |
| 567 | 067 | 0.67 | B | Diferencie Batiestesia de Palestesia: |
| 602 | 046 | 0.8 | A | Explique a Sx de asta anterior (Motoneurona Inferior): |
| 605 | 076 | 0.75 | A | COMO É A SINDROME DE DÉFICIT MOTOR MEDULAR? |
| 613 | 184 | 0.43 | C | Escreva sobre as síndromes de déficit motor periférico lesão do SNP: |
| 628 | 238 | 0.5 | B | ESCREVA SOBRE AS SINDROMES SENSITIVAS: |
| 650 | 255 | 0.4 | C | Efeitos de lesões unilaterais do lóbulo frontal? |
| 662 | 255 | 0.5 | B | QUAIS SÃO AS SINDROMES DO LÓBULO TEMPORAL? |
| 663 | 151 | 0.5 | B | Efeito de lesão do lóbulo temporal unilateral dominante: |
| 666 | 151 | 0.5 | B | Efeito de lesão do lóbulo temporal unilateral no dominante: |
| 681 | 161 | 0.5 | B | Efeito de lesão unilateral em lóbulo parietal dominante: |
| 686 | 161 | 0.5 | B | Efeito de lesão unilateral em lóbulo parietal D dominante: |
| 693 | 161 | 0.4 | C | Efeito por lesão unilateral do lóbulo Occipital D ou E: |
| 699 | 151 | 0.4 | C | Efeito por lesão bilateral em lóbulo Occiptal: |
| 701 | 145 | 0.4 | C | QUEM É O RESPONSÁVEL PELO ESTADO DE ALERTA? |
| 705 | 079 | 0.67 | B | En la forma clínica de Charcot de esclerosis lateral amiotrófica: |
| 713 | 255 | 0.5 | B | La lesión medular que se muestra en la figura corresponde con el diagn |
| 719 | 067 | 0.5 | B | La degeneración combinada subaguda (Sx Cordonal Posterior) de la medul |
| 721 | 077 | 0.5 | B | Desconecta toda una hemimédula con el resto del sistema nervioso por e |
| 723 | 052 | 0.5 | B | Un paciente que sufrió de una mielitis transversa a nivel T10 hace uno |
| 724 | 052 | 0.44 | C | Una defecto motor parapléjico con hipertonía espática (muelle de navaj |
| 737 | 016 | 0.47 | C | Una lesión de una corteza calcarina de localización muy medial, puede  |
| 739 | 139 | 0.5 | B | La pérdida de este reflejo fotomotor directo y consensual suele ocurri |
| 741 | 287 | 0.42 | ACR | En casos de neurosífilis, ocurre destrucción de las neuronas de la reg |
| 744 | 236 | 0.57 | B | ¿Puede ser crucial para el diagnóstico de una lesión del SNC, definir  |
| 747 | 105 | 0.42 | C | El paciente se encuentra plenamente alerta, con capacidad de respuesta |
| 748 | 152 | 0.43 | C | un pleno dominio de sus actos, de si mismo y de percepción del medio q |
| 749 | 236 | 0.43 | C | Cite algunas circunstancias que se puede evaluar el estado de concienc |
| 756 | 006 | 0.46 | C | Un paciente que tiene una perturbación del estado de conciencia consis |
| 758 | 001 | 0.43 | C | En un paciente que se encuentra con un estado de conciencia en el cual |
| 760 | 001 | 0.77 | A | Un paciente con estado de conciencia em cual, sólo a los estímulos dol |
| 767 | 253 | 0.4 | C | Dentro de las funciones intelectuales están los siguientes: |
| 777 | 173 | 0.36 | C | El reconocimiento de palabras escuchadas y producción del lenguaje hab |
| 779 | -2509-01 | 0.5 | B | La región del hemisferio izquierdo frontal, responsable por poner en m |
| 780 | 007 | 0.44 | C | ¿Cómo se produce la compresión del lenguaje escuchado y como se ejecut |
| 783 | 009 | 0.92 | A | Un paciente con lesión en la corteza del área de Wernicke del hemisfer |
| 785 | 008 | 1.0 | A | El área de Wernicke se localiza en la corteza del lóbulo frontal del h |
| 787 | 008 | 1.0 | A | El área de Broca se localiza en la corteza del lóbulo frontal del hemi |
| 789 | 007 | 0.75 | A | ¿Cómo se denomina el tipo de trastorno que compromete la comprensión d |
| 791 | 010 | 0.6 | B | ¿El comprometimiento del área de Wernicke por una lesión en el hemisfe |
| 793 | 010 | 0.67 | B | La lesión en el área de Wernicke del hemisferio dominante cuando se mu |
| 800 | 161 | 0.45 | C | Un paciente con una dislexia puede ver un texto escrito, pero no tiene |
| 802 | 010 | 0.41 | C | Un paciente que presente una lesión restringida a la región parietal i |
| 806 | 009 | 0.45 | C | La afasia de Broca se caracteriza porque el paciente no es capaz de co |
| 808 | 056 | 0.58 | B | El área de Broca de la corteza frontal en el hemisferio cerebral domin |
| 813 | 059 | 0.8 | A | Las cortezas premotoras y motora suplementaria pertenecen al: |
| 817 | 059 | 0.57 | B | ¿Cuáles son los pasos fundamentales de las cortezas motoras (premotora |
| 827 | 147 | 0.4 | C | Un paciente con apraxia motora tiene afectada la compresión o idea del |
| 846 | 160 | 0.36 | C | La agnosia es el fallo en reconocer objetos, que le son familiares al  |
| 851 | 054 | 0.5 | B | La presencia en un px de agnosia digital, acalculia, agrafia y confusi |
| 853 | 054 | 0.67 | B | Los elementos clínicos suelen encontrarse en lesiones de la corteza pa |
| 856 | 034 | 0.5 | B | Hace parte del examen físico neurológico los siguiente: |
| 858 | 108 | 0.75 | A | El examen de las funciones motoras, comprende: |
| 860 | 167 | 0.5 | B | Para explorar el tono muscular utilizamos: |
| 862 | 036 | 1.0 | A | En las polineuropatías periféricas suele existir hiperreflexia e hiper |
| 864 | 036 | 0.86 | A | En las polineuropatías periféricas suele encontrarse hiporreflexia mus |
| 866 | 034 | 0.57 | B | La hipertonía muscular por una lesión crónica de las vías piramidales  |
| 868 | 066 | 0.67 | B | La hipertonía espástica es característica de: |
| 870 | 033 | 1.0 | A | La hipertonía en “muelle de navaja” es característica del Sx piramidal |
| 872 | 034 | 0.88 | A | El clonus del tobillo y de la rótula suelen encontrarse al examen físi |
| 874 | 034 | 0.44 | C | La presencia de clonus de rótulas y tobillos con hiperreflexia profund |
| 876 | 069 | 0.75 | A | El signo de la rigidez “en rueda dentada” es típica de la hipertonía e |
| 878 | 069 | 0.75 | A | En un px con una enfermedad de Parkinson se desarolla un tipo de trast |
| 880 | 072 | 0.75 | A | En la enf. de Parkinson se encuentra al examen físico: |
| 882 | 069 | 0.6 | B | El signo de la “rueda dentada” (signo de Negro) es característico de: |
| 884 | 070 | 1.0 | A | En el Sx extrapiramidal de la enfermedad de Parkinson, la lesión funda |
| 886 | 199 | 0.5 | B | En la enfermedad de Parkinson la lesión más importante del SNC radica  |
| 890 | 033 | 0.6 | B | En la hipertonía piramidal encontramos fenómeno de la “rueda dentada”  |
| 898 | 035 | 1.0 | A | El reflejo cutáneo plantar en extensión (signo de Babinski) es una señ |
| 900 | 035 | 0.8 | A | El signo de Babinski es patognomónico de disfunción del haz piramidal |
| 902 | 026 | 0.75 | A | La maniobra de Barré se utiliza para explorar: |
| 904 | 073 | 0.57 | B | La maniobra de barré explora la coordinación dinámica en miembro infer |
| 906 | 238 | 0.38 | C | La maniobra de Barré sirve para explorar un defecto motor en los miemb |
| 908 | 154 | 0.5 | B | Un paciente con lesión de los cordones posteriores puede presentar ata |
| 912 | 073 | 0.62 | B | Las maniobras para explorar la coordinación dinámica de las extremidad |
| 914 | 073 | 0.88 | A | La maniobra de índice nariz explora la coordinación dinámica de miembr |
| 919 | 016 | 0.71 | B | Un paciente presenta al examen físico del campo visual por el método d |
| 921 | 016 | 0.73 | B | Si en el examen por confrontación del campo visual de un px encontramo |
| 923 | 016 | 0.38 | C | Una paciente portadora de un adenoma hipofisario presenta galactorrea, |
| 935 | 156 | 0.4 | C | El núcleo de Edinger Westphal es un núcleo motor somático del III par |
| 946 | 024 | 1.0 | A | En las parálisis faciales periféricas encontramos afectación de la mus |
| 954 | 038 | 1.0 | A | La modalidad de sensibilidad profunda que explora la percepción vibrat |
| 956 | 068 | 0.56 | B | La información propioceptiva que recibe el cerebelo le llega por los c |
| 958 | 062 | 0.5 | B | Las fibras del haz corticoespinal (piramidal) se decusan en un 80% a n |
| 960 | 139 | 0.38 | C | Un paciente presenta examen físico neurológico ausencia del reflejo fo |
| 962 | 011 | 0.65 | B | Un paciente consulta por presentar dificultad para la marcha, consiste |
| 970 | 012 | 0.55 | B | Un paciente consulta por inestabilidad (Perdida del equilibrio) Cuando |
| 972 | 011 | 0.42 | C | En las enfermedades motoras de los nervios periféricos (polineuropatía |
| 974 | 287 | 0.75 | ACR | La pupila Argyll Robertson se caracteriza por: |
| 975 | 287 | 0.57 | ACR | Las dos pupilas no responden a la luz, pero si contraen con la converg |
| 976 | 025 | 1.0 | A | Las parálisis faciales centrales afectan solamente la musculatura faci |
| 977 | 025 | 1.0 | A | La lesión está en las fibras del haz piramidal contralateral a la pará |
| 978 | 048 | 0.88 | A | Las lesiones que ocasionan una interrupción de la vía corticoespinal a |
| 979 | 048 | 0.8 | A | Una hemiplejia izquierda, total, directa y proporcional. |
| 980 | 077 | 1.0 | A | Las lesiones del sistema nervioso periférico con afectación motriz sev |
| 982 | 067 | 0.83 | A | En la degeneración combinada subaguda de la médula espinal existen |
| 984 | 052 | 0.73 | B | Si examinamos a un paciente que sufrió una lesión medular transversa d |
| 987 | 049 | 0.86 | A | El haz piramidal desciende a través del brazo anterior de la capsula i |
| 989 | 071 | 1.0 | A | El síndrome motor extrapiramidal conocido como hemibalismo es caracter |
| 991 | 070 | 1.0 | A | En la corea de Huntington se produce pérdida de neuronas del núcleo ca |
| 993 | 036 | 0.57 | B | En las paraplejias flácidas existe hipertonía muscular y arreflexia pr |
| 995 | 286 | 0.38 | ACR | Cuando encontramos en un paciente un ritmo respiratorio de Cheyne-Stok |
| 999 | 166 | 0.75 | A | La miastenia gravis autoinmune se caracteriza por: |
| 1001 | 046 | 1.0 | A | En la esclerosis lateral amiotrófica (ELA) encontramos: |
| 1005 | 070 | 1.0 | A | La corea de Huntington se produce por: |
| 1008 | 080 | 1.0 | A | La miastenia gravis es una enfermedad de la motoneurona. |
| 1010 | 068 | 0.36 | C | La sensibilidad propioceptiva inconsciente, de miembros inferiores asc |
| 1012 | 250 | 0.57 | B | En la siringomielia es característico una pérdida de la sensibilidad q |
| 1016 | 065 | 0.9 | A | En el Sx de Brown-Sequard se produce una lesión de vías sensitivas por |
| 1018 | 056 | 0.88 | A | Las áreas de corteza auditivas primarias se encuentran localizadas en  |
| 1022 | 055 | 1.0 | A | El Sx de extinción sensitiva es propio de lesiones de lóbulo parietale |
| 1024 | 050 | 0.5 | B | El has piramidal se origina en la corteza pré-frontal asociada del pol |
| 1026 | 039 | 0.78 | A | La batiestesia es un tipo de sensibilidad profunda que examinamos por  |
| 1030 | 074 | 1.0 | A | En una lesión del nervio radial podemos encontrar: |
| 1032 | 068 | 0.57 | B | Un paciente presenta ataxia para la marcha, tiene signo de Romberg a l |
| 1034 | 040 | 0.86 | A | Las modalidades de sensibilidad superficial termo- algésica procedente |
| 1036 | 057 | 1.0 | A | Una cuadrantanopsia homónima superior derecha se debe a una lesión del |
| 1038 | 081 | 0.52 | B | Un paciente consulta por fatiga muscular al ejercicio físico, presenta |
| 1039 | 081 | 0.64 | B | el ejercicio, poco a poco se observa que mejora su fuerza muscular. ¿C |
| 1041 | 046 | 1.0 | A | En la esclerosis lateral amiotrófica encontramos |
| 1043 | 046 | 0.47 | C | Cuando existe una lesión localizada en la motoneurona inferior del ast |
| 1045 | 043 | 0.67 | B | La estereognosis es la capacidad sensorial de: |
| 1047 | 041 | 0.87 | A | Las modalidades sensitivas del sentido de posición de segmentos corpor |
| 1049 | 053 | 0.55 | B | Un paciente al cual se le evacua un hematoma subdural del hemisferio d |
| 1051 | 225 | 0.67 | B | La siguiente imagen de TAC, se corresponde con: |
| 1053 | 225 | 0.75 | A | El hematoma SUBDURAL crónico del anciano: |
| 1055 | 180 | 0.5 | B | Los hematomas EPIDURALES más frecuentes ocurren: |
| 1056 | 160 | 0.4 | C | En la región temporal en la zona desplegable de marchant |
| 1059 | 103 | 0.53 | B | Diga cuál de las siguientes condiciones productoras de coma puede caus |
| 1061 | 037 | 0.93 | A | La presencia unilateral en un pct de atrofias musculares, arreflexia p |
| 1063 | 067 | 0.5 | B | En la enfermedad denominada degeneración combinada subaguda de la médu |
| 1065 | 066 | 0.52 | B | Un pct que recibe una herida de arma blanca por la espalda, a nivel de |
| 1066 | 066 | 0.83 | A | Una monoplejia crural de ese lado en fase flácida con Babinski. |
| 1069 | 082 | 1.0 | A | El Sx de Eaton-Lambert se caracteriza por un trastorno: |
| 1070 | 082 | 0.86 | A | Un trastorno de conducción presinaptico del impulso nervioso en la pla |
| 1071 | 044 | 0.71 | B | Las aferencias sensitivas somáticas procedentes de un hemicueroi arrib |
| 1073 | 009 | 0.4 | C | Un envenenamiento con toxina Botulínica suele producir: |
| 1081 | 166 | 0.5 | B | 2.- Marque o subraye la respuesta correcta de cada enunciado: |
| 1099 | 080 | 0.61 | B | B.- Una paciente de 30 años consulta porque desde hace 2 meses present |
| 1173 | 046 | 1.0 | A | La enfermedad SMA-1 es una enfermedad de las motoneuronas del asta ant |
| 1177 | 070 | 0.43 | C | En la corea de Sydenham se produce pérdidas de neuronas de los núcleos |
| 1182 | 072 | 1.0 | A | En la enfermedad de Parkinson encontramos al examen físico temblor de  |
| 1183 | 166 | 0.5 | B | 2.- Marque o subraye la respuesta correcta de cada enunciado: |
| 1188 | 080 | 0.59 | B | B.- Una paciente de 30 años consulta porque desde hace 2 meses present |
| 1194 | 169 | 0.4 | C | C.- En pacientes en coma por lesiones localizadas en la protuberancia, |
| 1211 | 064 | 0.44 | C | H.- El defecto sensitivo del síndrome de disociación siringomiélico de |
| 1216 | 173 | 0.52 | B | J.-.- En un paciente de 70 años de edad, hipertenso, fumador y en sobr |
| 1234 | 037 | 0.6 | B | O.- Diga cuál de las siguientes agrupaciones de signos se corresponde  |
| 1243 | 147 | 0.5 | B | que ha producido este defecto motor? |
| 1285 | 179 | 0.43 | C | la conducción (nos a través questionários de las vías está centrales o |
| 1291 | 173 | 0.38 | C | \- Un paciente presenta como resultado de un evento cerebrovascular un |
| 1314 | 173 | 0.64 | B | C) En un paciente de 70 años, hipertenso, fumador y con sobrepeso, se  |
| 1315 | 181 | 0.37 | C | D) Un paciente de 50 años, con sobrepeso, cae súbitamente al suelo con |
| 1318 | 080 | 0.62 | B | G) Una paciente de 30 años consulta porque desde hace 2 meses presenta |
| 1339 | 020 | 0.68 | B | 1 Un paciente joven, completamente sano, desarolla en unas pocas horas |
| 1341 | 173 | 0.57 | B | 2 En el mismo paciente de la pregunta anterior, la forma de instalació |
| 1360 | 001 | 0.43 | C | 4 En un paciente que se encuentra con un estado de conciencia en el cu |
| 1371 | 011 | 0.56 | B | 6 Un paciente consulta por presentar dificuldad para la marcha, consis |
| 1399 | 026 | 0.5 | B | 1 La maniobra de Barré mostrada mas abajo se utiliza para explorar : |
| 1401 | 012 | 0.55 | B | 2 Un paciente consulta por inestabilidad (Perdida del equilbrio) Cuand |
| 1403 | 028 | 0.65 | B | 3 Um paciente presenta al examen físico de los pares craneales uma des |
| 1405 | 150 | 0.5 | B | 4 El musculo ciliar del ojo esta inervado por: |
| 1407 | 021 | 0.58 | B | 5 Un paciente consulta porque desde hace 2 dias, cuando come los alime |
| 1411 | 015 | 0.69 | B | 7 Un paciente que presenta ptosis palpebral del parpado superior derec |
| 1413 | 006 | 0.36 | C | 8 Un paciente que tiene una perturbación del estado de conciencia cons |
| 1417 | 066 | 0.67 | B | 10 La hipertonia espástica es característica de: |
| 1427 | 010 | 0.41 | C | 1 Un paciente que presente una lesión restingida a la región parietal  |
| 1433 | 029 | 0.5 | B | 4 La lesion de un nervio acessório XI par da por resultado: |
| 1439 | 069 | 0.62 | B | 7 En um paciente com una enfermedad de Parkinson se desarolla um tipo  |
| 1441 | 026 | 0.6 | B | 8 La maniobre de Rinne com el diapasion se utiliza para explorar : |
| 1443 | 161 | 0.4 | C | 9 Un paciente com lesion del nervio hipoglosso derecho presentará : |
| 1460 | 068 | 0.53 | B | 1 ¿Un paciente Presenta ataxia para la marcha, tiene signo Romberg a l |
| 1462 | 213 | 0.75 | A | 2 La pupila Argyll Robertson se caracteriza por: |
