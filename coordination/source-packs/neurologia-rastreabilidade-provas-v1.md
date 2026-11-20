# Neurología · rastreabilidade das questões por arquivo de prova (PR #687 · 19/11/2026)

Complementa `neurologia-8a1b-conferencia-v1.md` (registro por questão) e `neurologia-revisar-triagem-v1.md` (186 candidatos do compilado). Este arquivo responde a uma pergunta só: **de cada arquivo da pasta «Questões», o que foi aberto, quantas questões foram detectadas e o que aconteceu com cada uma — com números que fecham.**

Estado do site: **289 perguntas** (MCQ 192 · V/F 68 · DEFINE 29), no bloco e no banco (578 itens). Antes da PR: 254. Novas desta PR: 35 ids entre `q-neu249` e `q-neu289` (ver §9). **Em 20/11 foram retiradas da entrega as 6 perguntas sem fonte** (`q-neu263`, `265`, `266`, `267`, `268`, `283`; §10).

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
| `provaneurorevisar_sem_repetidas.pdf` — 186 candidatos | texto extraído (1 464 parágrafos) | 186 | 28 linhas ACR (= 17 perguntas) | 0 | 61 | 26 | 69 (40 ENS + 20 FNT + 9 PEND-R) | 2 DESC | **186** |
| `provaneurorevisar_sem_repetidas.pdf` — 281 parágrafos restantes | texto extraído; **comparados um a um com a pergunta mais próxima (20/11)** | 281 | 6 parágrafos ACR (= 3 perguntas: 285–287) | 0 | 205 | 32 | 23 ENS + 6 FNT + 2 PEND-R | 7 FRAG | **281** |

Observações que mantêm a tabela honesta:
- A linha dos 186: 61 COB + 26 COB-P + 28 ACR (17 perguntas: `262`, `264`, `269`–`282`, `284`) + 69 PEND (40 ENS + 20 FNT + **9 PEND-R**, as que sustentavam as 6 perguntas retiradas) + 2 DESC = **186**.
- A linha dos 281: 6 ACR + 205 COB + 32 COB-P + 23 ENS + 6 FNT + 2 PEND-R + 7 FRAG (fragmentos de alternativa ou enunciados cortados, ligados a um id) = **281** (§8).
- **Soma das perguntas novas que ficaram no site:** 3+1+1+1+1+1 (docx, Turma A/C, manuscrito, D-2, P1 seção C) + 3 (Silva) + 3 (P1261) + 17 (compilado, 186) + 3 (compilado, 281) + `q-neu261` = **35 ids**.
- «Examen pdf»: não é prova diferente — é a mesma do docx; 30 REP. `provasneuroP1261.pdf`: 20 itens repetem a P1 Silvia (REP); os outros 20 são a prova do ano (set A). `Aline`: 4 COB + 2 REP + 3 FORA + 1 PEND = 10.

## 2 · O que NÃO foi aberto ou não foi visto (avisos)
1. **Figuras dentro das fotos de 18/11** (a «imagem simulada» de RM do item 20 da Turma A): **não vistas**. A pergunta `q-neu255` descreve em palavras.
2. **Item 28 do docx**: a figura ficou não decidível (só o enunciado de texto); `q-neu129` cobre o raciocínio escrito.
3. **`Notes_261006_214640.pdf`: 479 imagens embutidas não foram abertas**; foi lido só o texto. Aproximadamente 12 trechos sem número (casos soltos, anotações) não foram itemizados.
4. **`Provas neuro Aline .pdf`**: escaneado e manuscrito; só o OCR parcial do Drive. Anotações de estudo manuscritas (listas de pares cranianos etc.) **não foram transcritas** e não são contadas como questões.
5. **3 fotos de 19/09** (`IMG_1262/1263`, `b9b7bb6f…`): anotações manuscritas; só OCR.
6. **`Turma C 2`** e **`Turma C 6 (grave)`**, **`Manuscrito 15`**, **`D-2 10`**: enunciado ou resposta ilegível/parcial → PEND.
7. **Contagem de arquivos:** o pack anterior dizia 37 arquivos na pasta; a listagem do Drive nesta rodada devolveu **35**. Não identifiquei quais 2 faltam (podem ser itens da lixeira ou subpastas); nenhuma prova conhecida ficou de fora.
8. **Gabarito oficial: nenhuma prova da pasta traz clave oficial da cátedra.** Todas as respostas vêm de slide, do compilado ou de anotação de aluno; as perguntas «só do compilado» (`263`, `265`–`268`, `283`; §10) **foram retiradas** por não estarem confirmadas em slide nem em livro (não existe literatura-base de Neurologia).

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

## 8 · `provaneurorevisar_sem_repetidas.pdf` — os 281 parágrafos restantes (comparados em 20/11)
Dos 467 parágrafos que o pipeline marcou como candidatos, 186 foram fechados na triagem (`neurologia-revisar-triagem-v1.md`). Os **281 restantes foram agora comparados um a um**: cada parágrafo foi lido ao lado do enunciado da pergunta do site mais próxima (anexo §11, com o código e o motivo). Limite honesto: a comparação foi de **enunciado × enunciado e tema**, não releitura de todas as alternativas; os parágrafos incluem fragmentos e versões em português/castelhano.
| Código | Significado | Parágrafos |
|---|---|---|
| **ACR** | levaram a perguntas novas com slide (`q-neu285` PL, `286` Cheyne-Stokes, `287` Argyll Robertson) | 6 |
| **COB** | enunciado e raciocínio já cobertos por pergunta existente (id citado) | 205 |
| **COB-P** | tema citado no resumo, mas a pergunta do site pede outro raciocínio; não acrescentada (motivo na linha) | 32 |
| **ENS** | tema que o resumo e os 16 slides não ensinam (siringomielia, meningioma, Barré, MAV, território da ACM…) | 23 |
| **FNT** | depende de figura ou texto truncado/contraditório | 6 |
| **PEND-R** | era a base de pergunta retirada por falta de fonte (HTE benigna, Sydenham) | 2 |
| **FRAG** | fragmento de alternativa ou enunciado cortado, ligado ao id da pergunta mãe | 7 |
Soma: 6 + 205 + 32 + 23 + 6 + 2 + 7 = **281**.

## 9 · Ids novos desta PR e origem
`249` (docx 7) · `250` (D-2 19) · `251`/`252` (docx 22/29, imagens reconstruídas em palavras) · `253` (Turma C 3) · `254` (manuscrito 12) · `255` (Turma A 20) · `256` (Silva 13) · `257` (P1 seção C 16) · `258` (P1261-A 3) · `259` (P1261-A 19) · `260` (P1261-A 12) · `261` (compilado, pack §11) · `262`, `264`, `269`–`282`, `284` (compilado, com slide) · `285`–`287` (compilado, 281 restantes, com slide) · `288` (Silva 17) · `289` (Silva 9). **Ids reservados e não usados:** `263`, `265`, `266`, `267`, `268`, `283`. Total desde a `main`: 254 → 289.

## 10 · As 6 perguntas sem fonte — RETIRADAS da entrega (20/11/2026)
`q-neu263` (edema vasogênico na contusão), `265` (EEG 3 Hz da ausência), `266` (West × Lennox-Gastaut), `267` (corea de Sydenham), `268` (hiperventilação), `283` (HTE benigna). Nova busca nos 16 slides (palavras-chave 3 Hz, West, Lennox, Sydenham, vasogênico, hiperventilação, pseudotumor) e verificação de que **não existe literatura-base de Neurologia** no repositório nem no Drive: o slide de TEC só nomeia «edema vasogênico e citotóxico»; o de exames complementares só nomeia o pseudotumor cerebral e as punções repetidas; nenhum define as respostas pedidas. Como a única fonte é o compilado de alunos, **as perguntas e o ensino acrescentado só para elas foram retirados** (blocos 19, 22, 23 e 27 voltam ao texto da `main`, exceto a marcha jacksoniana, que o slide 1 sustenta). Nada foi apresentado como confirmado. **Pendente:** confirmação da cátedra ou envio da literatura-base para reincluí-las; os 9+2 parágrafos do compilado que as originaram ficam como PEND-R.

## 11 · Anexo — 281 parágrafos (parágrafo · código · id · escore de sobreposição · motivo)
| Parágrafo | Código | Id | Escore | Motivo |
|---|---|---|---|---|
| 6 | PEND | 283 (retirada) | 0.38 | cefaleia + vômito + papiledema + TC normal: pergunta retirada por falta de fonte |
| 21 | COB-P | 066 | 0.36 | paraplegia flácida com Babinski e incontinência: não discriminada |
| 22 | ENS | — | 0.43 | ACA/ACP/artéria de Heubner: não ensinado |
| 28 | COB-P | 269 | 0.5 | a 269 pede o sítio mais frequente; aqui pede-se reconhecer o nome da entidade |
| 30 | COB | 284 | 0.4 | lesões da HIC hipertensiva: Charcot-Bouchard |
| 35 | COB | 173 | 0.53 | caso de hemiparesia faciobraquial por ACM |
| 51 | COB-P | 007/009 | 0.38 | afasia de expressão (Broca); a pergunta do site é de compreensão |
| 53 | ENS | — | 0.54 | território superficial da ACM esquerda (afasia de Broca): não ensinado |
| 58 | COB | 008 | 1.0 | fragmento: área de Wernicke do hemisfério dominante |
| 69 | ENS | — | 0.67 | vertigem no AIT vertebrobasilar: AIT só definido |
| 71 | COB-P | 061 | 0.43 | hemiplegias alternas no território vertebrobasilar; o território não é ensinado |
| 81 | ENS | — | 0.44 | território profundo da ACM: não ensinado |
| 83 | COB-P | 173/273 | 0.5 | ACA: citada, sem pergunta sobre o giro frontal ascendente |
| 85 | COB | 269/242 | 0.43 | HIC mais frequente em hipertensos |
| 91 | ENS | — | 0.4 | MAV: não ensinadas |
| 97 | COB-P | 182 | 0.57 | HSA com rigidez de nuca: afirmação negativa; a 182 pede conduta |
| 139 | FRAG | 115 | 0.67 | enunciado incompleto «nas crises generalizadas:» |
| 141 | COB | 115 | 0.5 | crise focal simples sem perda de consciência |
| 150 | COB | 115/151 | 0.5 | cacosmia na epilepsia temporal |
| 159 | COB | 238/239/179 | 0.5 | EMG/potenciais evocados: o que exploram |
| 163 | COB | 182 | 0.6 | cefaleia + vômito + rigidez de nuca: imagem/PL |
| 165 | COB | 232 | 0.38 | PL sem TC prévia em meningite/HSA/pseudotumor (decisão de puncionar) |
| 169 | ACR | 285 | 0.6 | pergunta nova com slide |
| 173 | COB | 124 | 0.4 | PL indispensável para confirmar diagnóstico |
| 179 | COB | 132/176 | 0.38 | LCR bacteriano |
| 181 | COB | 176 | 0.43 | LCR bacteriano: neutrófilos, turvo |
| 183 | COB | 176 | 0.4 | LCR bacteriano: neutrófilos, turvo |
| 191 | COB | 238/239/179 | 0.5 | EMG/potenciais evocados: o que exploram |
| 197 | COB | 179 | 0.38 | potenciais evocados: vias centrais |
| 199 | COB | 238/239/179 | 0.5 | EMG/potenciais evocados: o que exploram |
| 203 | FNT | — | 0.38 | pergunta depende de imagem de TC |
| 225 | COB | 088/090 | 0.71 | REM × NREM (ondas) |
| 229 | COB | 239 | 0.38 | EEG/polissonografia nos transtornos do sono |
| 253 | COB | 168 | 1.0 | sonambulismo = parassonia NREM |
| 256 | COB | 105 | 1.0 | definição de coma |
| 257 | COB | 001 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 258 | COB | 002 | 0.65 | prova calórica |
| 262 | COB | 002 | 0.36 | prova calórica (versão em português) |
| 274 | COB | 170 | 0.4 | causas de coma |
| 332 | COB | 004 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 334 | COB | 003 | 0.87 | enunciado equivalente (conferido enunciado × enunciado) |
| 336 | COB | 005 | 0.77 | enunciado equivalente (conferido enunciado × enunciado) |
| 340 | COB | 103 | 0.6 | causas de coma |
| 341 | COB-P | 241 | 0.5 | limiar de 25 ml/100 g/min: a 241 pede outro limiar |
| 342 | ENS | — | 0.43 | coma por EPOC/hipercapnia: fisiopatologia não ensinada |
| 355 | COB-P | 240/182 | 0.75 | papiledema = síndrome de HTE; não há pergunta só dessa afirmação |
| 363 | COB-P | 151 | 0.5 | anosmia ipsilateral; conflito de anosmia (triagem) |
| 367 | COB | 014 | 0.58 | reflexo fotomotor |
| 369 | COB | 150 | 0.5 | inervação intraocular × III par |
| 371 | COB | 015 | 0.77 | III par |
| 372 | COB | 015 | 1.0 | III par |
| 373 | COB | 139 | 0.5 | reflexos fotomotor/acomodação, via eferente e pré-tectal |
| 375 | COB | 153 | 0.5 | III, IV e VI se exploram juntos |
| 377 | COB | 015 | 0.4 | III par |
| 380 | COB | 139 | 0.6 | reflexos fotomotor/acomodação, via eferente e pré-tectal |
| 382 | COB | 139 | 0.53 | reflexos fotomotor/acomodação, via eferente e pré-tectal |
| 386 | COB | 022 | 0.93 | enunciado equivalente (conferido enunciado × enunciado) |
| 388 | COB | 021/110 | 0.57 | sensibilidade da hemiface = trigêmeo |
| 390 | COB | 018 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 398 | COB | 139 | 0.67 | reflexos fotomotor/acomodação, via eferente e pré-tectal |
| 400 | COB | 110 | 0.5 | reflexo corneal: via aferente V, eferente VII |
| 402 | COB | 110 | 0.57 | reflexo corneal: via aferente V, eferente VII |
| 404 | COB | 015 | 0.4 | III par |
| 408 | COB | 030 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 410 | COB | 020 | 0.77 | paralisia facial periférica de início súbito |
| 414 | COB | 028 | 0.71 | desvio da língua |
| 416 | COB | 029 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 418 | COB | 026 | 0.8 | enunciado equivalente (conferido enunciado × enunciado) |
| 420 | COB | 084 | 0.8 | lesão do hipogloso |
| 422 | COB | 021 | 0.65 | paralisia facial (alimentos pela comissura) |
| 424 | COB | 023 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 425 | COB | 023 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 426 | COB | 019 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 437 | COB | 011 | 0.83 | steppage em neuropatias motoras |
| 439 | ACR | 286 | 0.6 | pergunta nova com slide |
| 441 | COB | 255 | 0.5 | reflexos de preensão e sucção = liberação frontal |
| 443 | COB | 058 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 449 | ENS | — | 0.4 | doença de Cushing: não ensinada |
| 455 | ENS | — | 0.4 | polineuropatia diabética: não ensinada |
| 457 | COB-P | 052 | 0.5 | síndrome de secção total; a 052 pede o quadro 24 h após lesão |
| 459 | COB-P | 068 | 0.5 | neuropatias sensitivas: padrão em meia/luva sem pergunta direta |
| 461 | COB | 046 | 0.8 | enunciado equivalente (conferido enunciado × enunciado) |
| 463 | COB | 250/065 | 0.5 | Brown-Séquard |
| 465 | COB | 063 | 0.81 | enunciado equivalente (conferido enunciado × enunciado) |
| 473 | COB | 048 | 0.62 | cápsula interna |
| 475 | COB | 050 | 0.67 | origem do feixe corticoespinhal |
| 477 | ENS | — | 0.5 | meningioma como tumor mais frequente: não ensinado |
| 479 | COB | 042 | 0.75 | enunciado equivalente (conferido enunciado × enunciado) |
| 481 | COB | 052 | 0.36 | lesão medular torácica transversa |
| 488 | FNT | — | 0.43 | sinal de flexão das pernas ao sentar: Brudzinski/Kernig em conflito na triagem |
| 491 | COB | 075 | 0.76 | enunciado equivalente (conferido enunciado × enunciado) |
| 493 | COB | 067 | 0.83 | enunciado equivalente (conferido enunciado × enunciado) |
| 495 | COB | 061 | 0.5 | hemiplegias alternas |
| 497 | COB-P | 082 | 0.44 | botulismo (bloqueio pré-sináptico): só citado por contraste |
| 499 | COB | 083/080 | 0.55 | miastenia: caso clínico |
| 501 | COB | 078 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 502 | COB | 078 | 0.43 | receptores nicotínicos na miastenia |
| 504 | FRAG | 082 | 0.4 | fragmento de alternativa (transtorno de transmissão) |
| 505 | COB | 064/066 | 0.68 | lesão medular por arma branca |
| 507 | ENS | — | 0.4 | siringomielia não ensinada |
| 510 | COB | 172 | 0.5 | causas estruturais de coma (tronco) |
| 511 | FRAG | 059 | 0.5 | lista sem alternativas; sistema motor |
| 513 | COB-P | 040/068 | 0.35 | vias espinocerebelares: citadas, sem pergunta própria |
| 515 | COB-P | 048 | 0.43 | decussação de 80 % no bulbo: sem pergunta direta |
| 527 | COB | 036 | 0.4 | steppage em neuropatias periféricas (português) |
| 535 | COB | 005 | 0.38 | desvio ocular no coma (português) |
| 537 | COB-P | 068 | 0.38 | neuropatias sensitivas: padrão sem pergunta direta |
| 539 | COB | 074 | 0.6 | nervo radial |
| 543 | COB | 032 | 0.56 | reflexo bicipital |
| 567 | COB-P | 039/038 | 0.67 | batiestesia × palestesia: a pergunta pede diferenciar; as do site pedem cada uma |
| 602 | COB | 046 | 0.8 | enunciado equivalente (conferido enunciado × enunciado) |
| 605 | COB | 076 | 0.75 | enunciado equivalente (conferido enunciado × enunciado) |
| 613 | COB-P | 159/046 | 0.43 | síndromes motoras periféricas (pergunta aberta) |
| 628 | COB-P | 041/067 | 0.5 | «escreva sobre síndromes sensitivas»: questão aberta; cobertas por partes |
| 650 | COB | 279 | 0.4 | lobo frontal (DEFINE) |
| 662 | COB | 281 | 0.5 | lobo temporal (DEFINE) |
| 663 | COB | 281 | 0.5 | lobo temporal (DEFINE) |
| 666 | COB | 281 | 0.5 | lobo temporal (DEFINE) |
| 681 | COB-P | 280 | 0.5 | lobo parietal dominante (DEFINE do hemisfério em geral) |
| 686 | COB-P | 280 | 0.5 | lobo parietal dominante (DEFINE do hemisfério em geral) |
| 693 | COB-P | 016/161 | 0.4 | lobo occipital unilateral: hemianopsia coberta; o resto não |
| 699 | ENS | — | 0.4 | lesão occipital bilateral (cegueira cortical): não ensinada |
| 701 | COB | 278 | 0.4 | SRAA, responsável pelo alerta |
| 705 | COB | 079 | 0.67 | ELA forma de Charcot |
| 713 | FNT | — | 0.5 | pergunta depende de figura medular que não está no texto |
| 719 | COB | 067 | 0.5 | degeneração combinada subaguda |
| 721 | COB | 065 | 0.5 | hemissecção medular (Brown-Séquard) |
| 723 | COB | 052 | 0.5 | mielite/lesão transversa |
| 724 | COB | 052 | 0.44 | síndrome medular completa |
| 737 | COB | 016 | 0.47 | córtex calcarino medial: hemianopsia com preservação macular |
| 739 | COB | 139 | 0.5 | reflexos fotomotor/acomodação, via eferente e pré-tectal |
| 741 | ACR | 287 | 0.42 | pergunta nova com slide |
| 744 | COB | 236/145 | 0.57 | importância do estado de consciência |
| 747 | COB | 282/105 | 0.42 | níveis de consciência: alerta |
| 748 | COB | 282/105 | 0.43 | níveis de consciência: alerta |
| 749 | COB-P | 145 | 0.43 | avaliação do estado de consciência: questão aberta |
| 756 | COB | 006 | 0.46 | confusão/obnubilação |
| 758 | COB | 001/282 | 0.43 | estupor/coma pelo estímulo doloroso |
| 760 | COB | 001/282 | 0.77 | estupor/coma pelo estímulo doloroso |
| 767 | ENS | — | 0.4 | funções intelectuais: não ensinado como lista |
| 777 | COB-P | 008 | 0.36 | dominância hemisférica esquerda > 90 %: citada |
| 779 | COB | 007 | 0.5 | área de Broca, hemisfério esquerdo |
| 780 | COB | 007 | 0.44 | compreensão e produção da linguagem |
| 783 | COB | 009 | 0.92 | enunciado equivalente (conferido enunciado × enunciado) |
| 785 | COB | 008 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 787 | COB | 008 | 1.0 | localização de Broca/Wernicke |
| 789 | COB | 007 | 0.75 | enunciado equivalente (conferido enunciado × enunciado) |
| 791 | COB | 010 | 0.6 | lesão extensa de Wernicke |
| 793 | COB | 010 | 0.67 | lesão extensa de Wernicke |
| 800 | ENS | — | 0.45 | dislexia/alexia: não ensinada |
| 802 | ENS | — | 0.41 | lesão parietal inferior esquerda (alexia): não ensinada |
| 806 | COB | 009 | 0.45 | Broca compreende (afirmação falsa) |
| 808 | COB | 008 | 0.58 | Broca: produção, não compreensão (afirmação falsa) |
| 813 | COB | 059 | 0.8 | enunciado equivalente (conferido enunciado × enunciado) |
| 817 | COB-P | 059 | 0.57 | pergunta aberta sobre «passos» das áreas motoras; só a classificação foi cobrada |
| 827 | FNT | — | 0.4 | apraxia motora × ideatória: conflito da triagem |
| 846 | COB | 160 | 0.36 | agnosia |
| 851 | COB | 054 | 0.5 | tétrade de Gerstmann |
| 853 | COB | 054 | 0.67 | tétrade de Gerstmann |
| 856 | FRAG | 034 | 0.5 | lista do exame físico neurológico |
| 858 | COB-P | 108 | 0.75 | fragmento «funções motoras compreende»; lista não ensinada como tal |
| 860 | COB-P | 033 | 0.5 | tono muscular: o resumo ensina os tipos, não uma pergunta de «como explorar» |
| 862 | COB | 036 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 864 | COB | 036 | 0.86 | enunciado equivalente (conferido enunciado × enunciado) |
| 866 | COB | 034 | 0.57 | hipertonia piramidal crônica |
| 868 | COB | 066/033 | 0.67 | hipertonia espástica |
| 870 | COB | 033 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 872 | COB | 034 | 0.88 | clonus (afirmação falsa: não é hipotonia) |
| 874 | COB | 034 | 0.44 | clonus e lesões crônicas piramidais |
| 876 | COB | 069 | 0.75 | enunciado equivalente (conferido enunciado × enunciado) |
| 878 | COB | 069 | 0.75 | enunciado equivalente (conferido enunciado × enunciado) |
| 880 | COB | 072 | 0.75 | enunciado equivalente (conferido enunciado × enunciado) |
| 882 | COB | 069 | 0.6 | roda dentada |
| 884 | COB | 070 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 886 | COB | 199 | 0.5 | substância negra no Parkinson |
| 890 | COB | 033/069 | 0.6 | roda dentada × canivete |
| 898 | COB | 035 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 900 | COB | 035 | 0.8 | enunciado equivalente (conferido enunciado × enunciado) |
| 902 | ENS | — | 0.75 | manobra de Barré não está no resumo nem nos slides (as ocorrências de «Barré» são Guillain-Barré) |
| 904 | ENS | — | 0.57 | manobra de Barré não ensinada |
| 906 | ENS | — | 0.38 | manobra de Barré não ensinada |
| 908 | COB | 068/121 | 0.5 | ataxia sensitiva e Romberg |
| 912 | COB | 073 | 0.62 | índice-nariz |
| 914 | COB | 073 | 0.88 | enunciado equivalente (conferido enunciado × enunciado) |
| 919 | COB | 016 | 0.71 | hemianopsia bitemporal |
| 921 | COB | 016 | 0.73 | hemianopsia bitemporal |
| 923 | COB | 016 | 0.38 | adenoma hipofisário: hemianopsia bitemporal |
| 935 | COB-P | 139 | 0.4 | núcleo de Edinger-Westphal: citado, não perguntado |
| 946 | COB | 024 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 954 | COB | 038 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 956 | COB | 068 | 0.56 | ataxia sensitiva; propriocepção ao cerebelo |
| 958 | COB-P | 062/048 | 0.5 | decussação 80 % (bulbo, não ponte): afirmação falsa sem pergunta própria |
| 960 | COB | 139 | 0.38 | perda do fotomotor com acomodação conservada |
| 962 | COB | 011 | 0.65 | marcha steppage |
| 970 | COB | 012 | 0.55 | ataxia cerebelosa/vestibular |
| 972 | COB-P | 036 | 0.42 | distribuição distal nas polineuropatias motoras |
| 974 | ACR | 287 | 0.75 | pergunta nova com slide |
| 975 | ACR | 287 | 0.57 | pergunta nova com slide |
| 976 | COB | 025 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 977 | COB | 025 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 978 | COB | 048 | 0.88 | enunciado equivalente (conferido enunciado × enunciado) |
| 979 | COB | 048 | 0.8 | enunciado equivalente (conferido enunciado × enunciado) |
| 980 | COB | 077 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 982 | COB | 067 | 0.83 | enunciado equivalente (conferido enunciado × enunciado) |
| 984 | COB | 052 | 0.73 | mielite/lesão transversa |
| 987 | COB | 049 | 0.86 | enunciado equivalente (conferido enunciado × enunciado) |
| 989 | COB | 071 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 991 | COB | 070 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 993 | COB | 036 | 0.57 | paraplegias flácidas |
| 995 | ACR | 286 | 0.38 | pergunta nova com slide |
| 999 | COB | 166 | 0.75 | enunciado equivalente (conferido enunciado × enunciado) |
| 1001 | COB | 046 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 1005 | COB | 070 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 1008 | COB | 080 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 1010 | COB-P | 040 | 0.36 | espinocerebelares: citadas |
| 1012 | ENS | — | 0.57 | siringomielia não ensinada |
| 1016 | COB | 065 | 0.9 | enunciado equivalente (conferido enunciado × enunciado) |
| 1018 | COB | 056 | 0.88 | enunciado equivalente (conferido enunciado × enunciado) |
| 1022 | COB | 055 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 1024 | COB | 050 | 0.5 | origem do feixe corticoespinhal |
| 1026 | COB | 039 | 0.78 | enunciado equivalente (conferido enunciado × enunciado) |
| 1030 | COB | 074 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 1032 | COB | 068 | 0.57 | ataxia sensitiva; propriocepção ao cerebelo |
| 1034 | COB | 040 | 0.86 | enunciado equivalente (conferido enunciado × enunciado) |
| 1036 | COB | 057 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 1038 | COB | 081 | 0.52 | miastenia/fadiga |
| 1039 | COB | 081 | 0.64 | miastenia/fadiga |
| 1041 | COB | 046 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 1043 | COB | 046 | 0.47 | síndrome do neurônio motor inferior |
| 1045 | COB | 043 | 0.67 | estereognosia |
| 1047 | COB | 041 | 0.87 | enunciado equivalente (conferido enunciado × enunciado) |
| 1049 | COB | 053 | 0.55 | hematoma subdural operado |
| 1051 | FNT | — | 0.67 | pergunta depende de imagem de TC |
| 1053 | COB-P | 225 | 0.75 | hematoma subdural crônico: a pergunta do site pede o caso do idoso anticoagulado; a afirmação isolada não |
| 1055 | COB | 224 | 0.5 | hematomas epidurais |
| 1056 | FNT | — | 0.4 | texto truncado («zona desplegable de Marchant») |
| 1059 | COB | 103 | 0.53 | causas de coma |
| 1061 | COB | 037 | 0.93 | enunciado equivalente (conferido enunciado × enunciado) |
| 1063 | COB | 067 | 0.5 | degeneração combinada subaguda |
| 1065 | COB | 064/066 | 0.52 | lesão medular por arma branca |
| 1066 | COB | 066 | 0.83 | enunciado equivalente (conferido enunciado × enunciado) |
| 1069 | COB | 082 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 1070 | COB | 082 | 0.86 | enunciado equivalente (conferido enunciado × enunciado) |
| 1071 | COB | 044 | 0.71 | aferências somáticas ao córtex |
| 1073 | ENS | — | 0.4 | toxina botulínica: não ensinada |
| 1081 | COB | 166 | 0.5 | miastenia: fisiopatologia |
| 1099 | COB | 083/080 | 0.61 | miastenia: caso clínico |
| 1173 | ENS | — | 1.0 | SMA-1/Werdnig-Hoffmann não ensinada (mesma lacuna da triagem 84) |
| 1177 | PEND | 267 (retirada) | 0.43 | corea de Sydenham: pergunta retirada por falta de fonte |
| 1182 | COB | 072 | 1.0 | enunciado equivalente (conferido enunciado × enunciado) |
| 1183 | COB | 166 | 0.5 | miastenia: fisiopatologia |
| 1188 | COB | 083/080 | 0.59 | miastenia: caso clínico |
| 1194 | COB | 189 | 0.4 | coma por hemorragia pontina |
| 1211 | ENS | — | 0.44 | dissociação siringomiélica: não ensinada |
| 1216 | COB | 173 | 0.52 | caso de hemiparesia faciobraquial por ACM |
| 1234 | COB | 037 | 0.6 | síndrome do corno anterior |
| 1243 | FRAG | 147 | 0.5 | fragmento «que ha producido este defecto motor?» (apraxia da marcha) |
| 1285 | FRAG | 179 | 0.43 | fragmento (condução central ou periférica) |
| 1291 | COB-P | 173 | 0.38 | território da hemiparesia faciobraquial esquerda: o território não é discriminado |
| 1314 | COB | 173 | 0.64 | caso de hemiparesia faciobraquial por ACM |
| 1315 | COB | 181/269 | 0.37 | hemorragia em hipertenso com PA 220/130 |
| 1318 | COB | 083/080 | 0.62 | miastenia: caso clínico |
| 1339 | COB | 020 | 0.68 | paralisia facial periférica de início súbito |
| 1341 | FRAG | 020 | 0.57 | segunda pergunta sobre o mesmo caso (instalação) |
| 1360 | COB | 001/282 | 0.43 | estupor/coma pelo estímulo doloroso |
| 1371 | COB | 011 | 0.56 | marcha steppage |
| 1399 | ENS | — | 0.5 | manobra de Barré (figura) não ensinada |
| 1401 | COB | 012 | 0.55 | ataxia cerebelosa/vestibular |
| 1403 | COB | 028 | 0.65 | desvio da língua |
| 1405 | COB | 150 | 0.5 | inervação intraocular × III par |
| 1407 | COB | 021 | 0.58 | paralisia facial (alimentos pela comissura) |
| 1411 | COB | 015 | 0.69 | III par |
| 1413 | COB | 006 | 0.36 | confusão/obnubilação |
| 1417 | COB | 066/033 | 0.67 | hipertonia espástica |
| 1427 | ENS | — | 0.41 | lesão parietal inferior esquerda (alexia): não ensinada |
| 1433 | COB | 029 | 0.5 | lesão do XI |
| 1439 | COB | 069 | 0.62 | tono no Parkinson |
| 1441 | COB | 026 | 0.6 | Rinne |
| 1443 | COB | 084 | 0.4 | lesão do hipoglosso |
| 1460 | COB | 068 | 0.53 | ataxia sensitiva; propriocepção ao cerebelo |
| 1462 | COB | 287 | 0.75 | Argyll Robertson (q-neu287 acrescentada; q-neu213 é outro raciocínio) |
