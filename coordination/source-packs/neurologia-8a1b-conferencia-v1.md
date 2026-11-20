# Neurología · conferência 8-A.1-B de TODA a pasta «Questões» (18/11/2026)

Base: `main` `1ea1021f` · branch `claude/neuro-8a1b-1911`. Pasta: Site Repasso Med › Biblioteca › 7º semestre › Neurologia (Dra. Silva Duarte) › **Questões** (id `1MA9HAVuvGZvYS37zRExWjgUTOxPQhjXN`, 37 arquivos).
Lei aplicada: `MANUTENCAO-DIDATICA-REPASSO-MED.md` 8-A.1-B (e CLAUDE.md §5-A). Hierarquia usada: ciência → cátedra (slides) → forma real de cobrança → profundidade. **Um tema já existente no banco não resolve a questão**: cada item foi comparado pelo raciocínio que exige.

## 1 · O que foi lido (e o que não)
| Fonte | Como foi lida |
|---|---|
| `Examen Final Neurologia seccion A  fila 1.docx` (30 itens) | texto integral **e as 5 imagens do .docx extraídas e vistas** (ver §3) |
| 8 fotos de 18/11 (Turma A simulado 4 págs + gabarito 2 págs, manuscrito V/F, Turma C) | texto OCR do Drive; **as figuras dentro das fotos (a «imagem simulada» de RM do caso 20) não foram vistas** |
| 3 fotos de 06/10 (prova D-2, 26/09) | **vistas como imagem** |
| 3 fotos de 19/09 (`IMG_1262/1263`, `b9b7bb6f…`) | OCR (anotações manuscritas das 20 perguntas da P1 seção C) |
| 14 fotos de 25/09 (WhatsApp, prova P1 seção C em tela) | OCR, todas as 14 |
| `Notes_261006_214640.pdf` | texto completo (compilado de P1 com «Resposta no gabarito» e alternativas marcadas) |
| Slides da cátedra · `11..pdf` (Epilepsia) | lido inteiro (decide o item docx 14) |
| `Provas neuro Aline .pdf`, `provaneurorevisar_sem_repetidas.pdf` (30 MB), `Prova de Neurologia P1 - Dra Silvia.pdf`, `provasneuroP1261.pdf`, `Examen Final … fila 1 pdf.pdf` | **não reabertos** nesta rodada (já integrados nos packs `neurologia-p0-*`/`intake-8ee837`; o PDF de 30 MB não é legível pelo Drive; o «Examen Final pdf» é a mesma prova do .docx) |
| Literatura-base de Neurología | **não existe no Drive**; nada foi conferido contra livro |

## 2 · Achados que mudaram o site
1. **Duplicatas exatas introduzidas por mim na #683 e identidade dos ids.** `q-neu233` (marcha en tijeras) = `q-neu-2509-03` (Jaccard 1,00) e `q-neu234` (neuralgia do trigêmeo) = `q-neu-2509-05` (0,93): o pesquisador de duplicatas não carregava os ids `q-neu-2509-NN`. Numa primeira versão desta PR reaproveitei `233`/`234` para outros itens; **isso foi revertido: `233` e `234` (e `bq-neu233/234`) voltam a ser, byte a byte, as questões originais da `main`** (teste). Motivo: um id deve identificar sempre a mesma questão (referências em packs, relatórios e na #683); reaproveitar é desnecessário e não é «solução comprovada».
   - **Verificação de histórico de alunos e de referências (somente leitura):** (a) tabelas do Supabase: nenhuma guarda respostas por questão (existem `user_highlights` por bloco/texto, `user_ink_strokes` por âncora, `user_notes`, `user_study_progress` por matéria); (b) código do site: `toggleAnswer`/`checkAnswer`/`checkTF` só mudam classes do DOM (`answered`, `correct`, `wrong`), sem `localStorage`/`sessionStorage`/chamada ao banco; nenhuma Netlify Function cita ids de questão; (c) referências a `q-neu233/234`: só o pack `neurologia-questoes-1811-v1.md` (histórico), este pack, o inventário (regenerado) e os testes antigos da #683. Conclusão: não há histórico por id a perder, **e** a identidade foi preservada mesmo assim.
   - **Duplicatas que continuam e precisam de decisão de José:** `233 ≈ -2509-03` e `234 ≈ -2509-05` são a mesma pergunta. **Canônica (8-A.1-B): a original do exame (`-2509-03`, `-2509-05`)**, de enunciado e alternativas idênticos às fotos de 25/09. Não retirei nenhuma das duas para não violar a preservação de ids (8-A.9 e Guard). **Pendente: José decide se `233`/`234` devem ser aposentadas (exige exceção ao Guard) ou mantidas.** Da 233 se herdou a correção pedida em 18/11 («sem origem medular»): aplicada em `q-neu-2509-03`.
   - **Estado exato de `q-neu233` e `q-neu234` (19/11, commit final):** **permanecem no bloco 27/19 e no banco**, com `id` e enunciado idênticos à `main` (o teste `neu-8a1b` compara byte a byte o enunciado e o início da resposta correta; apenas as alternativas foram reordenadas/equilibradas pela revisão de viés, mantendo a mesma resposta). **Nada foi retirado nem reutilizado**; o Cartão anterior, ao falar em «retiradas», estava errado. As âncoras (`id`) e referências existentes foram preservadas; as duas duplicatas (`233 ≈ -2509-03`, `234 ≈ -2509-05`) seguem existindo aguardando a decisão de José.
   - Os dois itens de prova que eu tinha posto nesses ids ganharam **ids novos**: **`q-neu256`** (bloco 03) V/F «segador × tijeras» e **`q-neu257`** (bloco 16) V/F Eaton-Lambert × miastenia.
   - Observação: o slide 1 diz «tijeras: … disfunção da medula espinal» e o resumo do bloco 03 repete «médula» na síntese; não toquei nesse texto de ensino (bloco com grifos de alunos) — decisão de José.
2. **«Complementares» que já absorviam item de prova** (Turma A/C, Manuscrito, docx) passaram a **«Basada en preguntas de examen»**: `q-neu090` (reformulada), `091` (rótulo + frase de integração), `135` (reformulada), `181` (reformulada), `224` (rótulo + pergunta completa). `093`, `183`, `231` **continuam complementares** (não absorvem nenhum item de prova: ver §4).
3. **Itens de prova sem raciocínio equivalente → acrescentados** (`q-neu249`–`261`, todas «Basada en preguntas de examen», no bloco e no banco).
4. **Resumo completado antes de cobrar** (8-A.2): NREM = reposo, tono parassimpático, FC/PA baixas (bloco 17); `moria` (bloco 11); «distonía paroxística» (bloco 19, tabela do diagnóstico diferencial, e resposta de `q-neu134`); epidural de bom prognóstico se drenado a tempo (resumo-chave do bloco 27).
5. **Contagens declaradas (8-A.10)**: portada/banco 254 → **290** (MCQ 168 → 193; V/F 62 → 68; DEFINE 24 → 29: as 4 anteriores + `q-neu289`; inclui `q-neu285`–`289`; as 6 perguntas sem fonte foram retiradas em 20/11, §18); cabeçalhos e subtítulos dos blocos tocados; **8 cabeçalhos antigos estavam defasados** (blocos 01, 04, 05, 06, 10, 14, 15, 16 declaravam menos perguntas do que existem) e foram corrigidos.

## 3 · Imagens do .docx e as perguntas gerais (q-neu131)
Imagens extraídas e vistas: `image3.png` (após o caso 21 → **item 22**), `image4.png` (no item 28), `image5.png` (item 29); `image1/2` são o brasão/cabeçalho.
| Item | O que a imagem mostra (leitura própria) | Cobertura anterior | Decisão |
|---|---|---|---|
| **22** «descrição tomográfica de esta imagen; diagnóstico presuntivo» | TC axial sem contraste: lesão **hiperdensa, homogênea, ovoide, intraparenquimatosa frontal, com halo hipodenso** | `q-neu131` ensina os 6 passos e só 3 padrões (epidural, subdural, HSA); **não inclui o padrão intraparenquimatoso**, nem pede aplicá-lo a uma imagem | **NOVA `q-neu251`** (descrição em palavras + diagnóstico: hemorragia intraparenquimatosa). Lateralidade omitida de propósito (convenção radiológica) |
| **29** «descripción tomográfica y diagnóstico» | dois cortes: colección hiperdensa extraaxial **em meia-lua** sobre a convexidade, apagamento de sulcos, compressão ventricular e desvio da linha média | `q-neu131` pede **nomear** o padrão a partir do diagnóstico; o item pede o caminho inverso (imagem → diagnóstico) | **NOVA `q-neu252`** (hematoma subdural agudo; o epidural é o distrator plausível; critério do bloco: lente × meia-lua) |
| **28** (TC no caso de cefaleia em trovão) | hiperdensidades serpiginosas nos sulcos de um hemisfério; **pode ser HSA de convexidade ou realce com contraste** | `q-neu129` (dx e exame seguinte) + `q-neu131` (padrão HSA) | **sem pergunta nova**: a figura não permite fixar um gabarito; não se inventa. Registrado |
Em `q-neu251/252` o texto diz que é **reconstrução em palavras** da imagem de um exame e que a cátedra não publicou a clave. As imagens do exame **não foram incorporadas** ao site.
**Veredito sobre `q-neu131`:** continua **(mantida)**: é a melhor versão para ensinar a *descrever em ordem*; **não cobre sozinha os casos com imagem**, por isso as duas novas.

## 4 · Epilepsia (docx 14 × `q-neu135`)
Item (V/F): «En un paciente con diagnóstico de epilepsia, primera línea es valproato; como combinación, levetiracetam con valproato.» **Slide da cátedra (11..pdf):** «Monoterapia primero… **Selección según el tipo de crisis**»; valproato listado para *generalizada*, levetiracetam amplio espectro, lamotrigina focal/generalizada/ausência; **nenhuma primeira linha universal nem par de combinação**. **Clave oficial: não publicada** (registrado, não inventado).
- Versão do site (MCQ «¿qué determina la elección?»): **mais completa** como ensino; **não fiel à forma** e rotulada «complementar» embora o tema venha do exame.
- **Decisão: reformular `q-neu135` (mesmo id)** para a forma real: a afirmação do exame + «¿Cómo se valora?», resposta: **incorreta como regra geral** (sem primeira linha universal nem par fixo), apoiada no slide e no §5.2. A explicação diz expressamente que a clave não foi publicada. Rótulo → «Basada en preguntas de examen». Bloco e banco idênticos.

## 5 · Registro por questão (arquivo · número → id no site → versão mais completa / mais fiel → decisão)
Legenda: **=** equivalentes (a do site pode ser a mais clara) · **MANTIDA** · **REFORMULADA** (id preservado, banco atualizado) · **NOVA** · **PENDENTE**. «Fiel» = forma de cobrança.

### 5.1 `Examen Final Neurologia seccion A fila 1.docx` (n.º do documento)
| n.º | Site | Mais completa / mais fiel | Decisão e motivo |
|---|---|---|---|
| 1 IX par | `q-neu111` | site (distrator ambíguo do exame trocado por outro inequívoco) / exame | MANTIDA: mesma competência, resposta idêntica |
| 2 Guillain-Barré | `q-neu123` | = | MANTIDA (alternativas iguais, reordenadas) |
| 3 deficitários | `q-neu116` | = | MANTIDA |
| 4 N3 | `q-neu087` | = | MANTIDA |
| 5 punção lombar | `q-neu124` | = | MANTIDA |
| 6 miastenia | `q-neu166` | = | MANTIDA (inclui a pegadinha timo 10–15 % × 70–80 %) |
| 7 Wallenberg (**nervos**) | `q-neu118` só pede o *nome* da síndrome | exame (pede o conjunto V, VIII, IX, X + Horner; o bloco 12 o ensina) | **NOVA `q-neu249`**: aluno que identifica a síndrome pode não saber quais pares |
| 8 medular anterior | `q-neu120` | = | MANTIDA |
| 9 alterações do V par | `q-neu110` | = | MANTIDA |
| 10 DDx de epilepsias | `q-neu134` | site; faltava a «distonía paroxística» do slide | **REFORMULADA** (item 8 na resposta) + linha na tabela do bloco 19 |
| 11 achados no coma | `q-neu171` | = (inclui postura e padrão respiratório) | MANTIDA |
| 12 irritativos (V/F) | `q-neu114` + `q-neu158` | = | MANTIDA |
| 13 morte encefálica (V/F) | `q-neu096` | = | MANTIDA |
| **14 epilepsia (V/F)** | `q-neu135` | ver §4 | **REFORMULADA** |
| 15 raquimedular (V/F) | `q-neu122` | = | MANTIDA |
| 16 esclerose múltipla (V/F) | `q-neu137` | = | MANTIDA |
| 17 centrais (V/F) | `q-neu117` | = | MANTIDA |
| 18 encefalite (V/F) | `q-neu133` | = | MANTIDA |
| 19 Parkinson (V/F) | `q-neu136` | = | MANTIDA |
| 20 miastênica/steppage (V/F) | `q-neu127` | = | MANTIDA |
| 21 ACM esquerda | `q-neu173` | = | MANTIDA |
| **22 TC (imagem)** | — | ver §3 | **NOVA `q-neu251`** |
| 23 GCS 12 + TEC | `q-neu248` | = (pede escore, classe e conduta) | MANTIDA |
| 24 crise temporal | `q-neu115` | = | MANTIDA |
| 25 rigidez (descerebração, GCS 3) | `q-neu003` + `q-neu004` | = (003 pede reconhecer a postura oposta; 004 define a descerebração) | MANTIDA: dois itens cobrem o par |
| 26 Alzheimer | `q-neu138` | = | MANTIDA |
| 27 cefaleia em salvas | `q-neu128` | = | MANTIDA |
| 28 cefaleia em trovão | `q-neu129` | = (+ figura não decidível, §3) | MANTIDA |
| **29 TC (imagem)** | — | ver §3 | **NOVA `q-neu252`** |
| 30 meningite | `q-neu132` | = | MANTIDA |

### 5.2 Simulado «Turma A (P2)» (4 fotos de enunciado + 2 de gabarito; **sem clave oficial**: gabarito de autoria não identificada, com erro conhecido no GCS «4», correto 6)
| n.º | Site | Decisão |
|---|---|---|
| 1 PE · 2 hidrocefalia · 3 fluxo < 10 · 6 TEC leve · 8 HSA · 9 lesões secundárias · 10 DDx coma · 11 indicações PL · 12 insônia · 14 EEG×EMG · 17 ME · 18 TEC grave | `q-neu238`, `243`, `241`, `244`, `242`, `245`, `236`, `240`, `235`, `239`, `237`, `247` | MANTIDAS (criadas da própria fonte em 18/11; = em raciocínio e forma) |
| 4 coma (achados) | `q-neu001`, `q-neu171` | MANTIDA = |
| **5 NREM** | `q-neu090` (só «husos e K → N2») | **REFORMULADA**: o item pede a caracterização do NREM (estágios, tono parassimpático, FC/PA, husos/K em N2); a pergunta antiga era um subconjunto. Resumo completado primeiro (bloco 17). Rótulo → exame |
| 7 pré-requisitos ME | `q-neu096` | MANTIDA = |
| 13 narcolepsia tipos 1/2 | `q-neu167` | MANTIDA = |
| 15 LCR traumático (V/F) | `q-neu124`, `q-neu177` | MANTIDA = |
| **16 RBD é parassonia NREM? (V/F)** | `q-neu091` (vinheta: diagnosticar RBD) | MANTIDA e **rotulada exame**: o raciocínio é o mesmo (RBD é do REM, não NREM); a explicação ganhou a classificação NREM × REM |
| **19 ACV hemorrágico** | `q-neu181` (vinheta com a TC já dando «hiperdensa no putâmen») | **REFORMULADA** na forma do exame (clínica pura + «qual diagnóstico e que imagem pedir»), com TC sem contraste; id preservado |
| **20 tumor frontal direito** | — | **NOVA `q-neu255`** (síndrome frontal). Antes pendente porque o resumo não ensinava «moria»; agora ensina (bloco 11). Autoria da fonte não identificada; a «imagem simulada» da RM **não foi vista** |

### 5.3 «Turma C (P2)» (recordação manuscrita)
| n.º | Site | Decisão |
|---|---|---|
| 1 NREM | `q-neu090` | REFORMULADA (ver 5.2-5) |
| 2 TCE «lesión» | — | **PENDENTE**: só resta uma resposta parcial («deterioro de conciencia, amnesia, fractura») sem enunciado |
| **3 ACV isquêmico (definição)** | `q-neu183` (penumbra), `q-neu241` (limiar do núcleo) são **outro** raciocínio | **NOVA `q-neu253`** (definição) |
| 4 sueño REM «sueños vívidos» | `q-neu088` (REM) | MANTIDA = (o resumo já ensina «a maioria dos sonhos lembrados ocorre em REM») |
| 6 tratamento do TEC grave | `q-neu247` (conduta), `q-neu231` (complementar) | **PENDENTE-PARCIAL**: a resposta anotada («TAC en todos los casos») é a do **TEC moderado** (nota «turma B = moderada») → já em `q-neu248`; a resposta do «grave» não foi recuperada. **`q-neu231` não é rotulada exame** (não absorve item de prova) |
| 7 ME | `q-neu096` | MANTIDA = |
| **8 hematoma epidural** | `q-neu224` | **REFORMULADA/rotulada exame**: pergunta passa a pedir diagnóstico **e** característica (lente + bom prognóstico se drenado), que o exame anotou; resumo completado (bloco 27) |
| 9 lesões primárias | `q-neu246` | MANTIDA = |
| 10 causas metabólicas · 11 achados no coma | `q-neu170`, `q-neu171` | MANTIDAS = |

### 5.4 Manuscrito (turma não identificada, 12–19)
12 insônia aguda (benzodiazepínico de longa duração, F) → **NOVA `q-neu254`** (V/F; `q-neu093` trata do crônico, `235` da definição: raciocínio diferente) · 13 parassonias NREM → `q-neu168` + `091` = · 14 PL terapêutica → `q-neu240` = · 15 hematoma subdural subagudo (F, «é progressivo») → **PENDENTE** (enunciado ilegível) · 16 EMG × EEG → `q-neu239` = · 17 raquimedular → `q-neu122` = · 18 ECG 12 → `q-neu248` = · 19 dislipidemia + hemiparesia → `q-neu173` = .

### 5.5 Prova D-2 (26/09; 3 fotos de 06/10; sem clave)
1 `q-neu167` · 2 `q-neu160` · 3 `q-neu146` · 4 pupilas médias arreativas → `q-neu169` (**a tabela da cátedra do próprio resumo dá «medias, no reactivas = tegmento mesencefálico ventral»**, então a resposta c é a da cátedra; a alternativa «tectum dorsal» é a da midríase) · 5 `q-neu126`/`074` · 6 `q-neu033`/`037` · 7 `q-neu152` · 8 `q-neu060` · 9 `q-neu170` · 11 `q-neu153` · 12 `q-neu036`/`046` · 13 `q-neu147` · 14 `q-neu098` · 15 `q-neu150` · 16 `q-neu162` · 17 `q-neu168` · 18 `q-neu247` (variante do exame: O1 V2 M2 = 5; a pergunta do site usa O2 → 6: **mesmo raciocínio**) · 19 Brown-Séquard (vinheta) → **NOVA `q-neu250`** (as existentes `143/065/066/063` cobrem partes; **nenhuma pede identificar a síndrome pelo conjunto**; a mesma identificação aparece na P2 do Notes) · 20 `q-neu165` — todas = MANTIDAS, salvo 18/19 como indicado. **10** «par craneal epigástrico» → **PENDENTE** (nome inexistente; provável neumogástrico, já em `q-neu156`).

### 5.6 P1 seção C (19/09 · 14 fotos de 25/09 + 3 de 19/09; 20 itens digitados por José)
1 `q-neu-2509-01` · 2 `-2509-02` · 3 `-2509-03` (**canônica**, ver §2) · 4 `-2509-04` · 5 `-2509-05` (**canônica**) · 6 `q-neu078`/`166` · 7 `q-neu087` · 8 `q-neu099` · 9 `q-neu100` · 10 `q-neu142` · 11 `q-neu139` · 12 `q-neu141` · 13 `q-neu024`/`025` (central poupa a testa) · 14 `q-neu143` · 15 `q-neu140` · 16 `q-neu081`/`082`/`165` + **NOVA `q-neu257`** (a V/F com as duas metades falsas, que as três anteriores não cobrem) · 17 `q-neu098` · 18 `q-neu118` + **`q-neu249`** · 19 `q-neu144` · 20 `q-neu-2509-06` — MANTIDAS =.

### 5.7 `Notes_261006_214640.pdf`
Todos os itens (P1, P2, «Seção C») têm equivalente = (`q-neu107`, `154`, `125`, `112`, `121`, `148`, `159`, `113`, `081`/`082`, `106`, `097`/`098`, `119`, `164`/`144`, `143`, `151`, `156`, `158`, `108`, `117`, `145`, `161`, `163`, `115`, `126`, `118`, `099`, `100`, `142`, `139`, `141`, `153`, `140`) **exceto**: «síndrome de Brown-Séquard pelo conjunto de achados» (agora `q-neu250`) e o Wallenberg pelos pares (`q-neu249`). «Marcha en tijeras» e «neuralgia do trigêmeo» já existiam (`-2509-03`/`-05`; `233`/`234` as repetem, ver §2). A V/F «segador ≠ tijera» do Notes ganhou **`q-neu256`**. PENDENTE: «signo patognomónico do aparelho vestibular» do Notes tem a alternativa a cortada; na prova de 25/09 (fotos legíveis) a alternativa é «nistagmo» → `q-neu-2509-04`.

## 6 · Pendências que continuam (nada foi inventado)
Turma C 2 (TCE «lesión»), Turma C 6 grave (resposta não recuperada), Manuscrito 15 (subdural subagudo), D-2 10 («epigástrico»), figura do item 28 do docx, «imagem simulada» da Turma A 20 (não vista), PDFs não reabertos (§1). **Clave oficial: nenhuma prova da pasta traz clave publicada pela cátedra**; as respostas são determinadas pelo conteúdo ensinado (slides do site) e as letras foram distribuídas sem padrão (a:50 b:48 c:48 d:47 nas MCQ após a revisão de viés e as questões novas; ver §10).

## 7 · Marcações dos alunos (Supabase, SELECT somente leitura, 18/11 à noite, sem dados pessoais)
**Grifos de Neurología hoje: `neub02` 10 · `neub03` 29 · `neub09` 68 · `neub20` 49 · `neub21` 88 = 244** (os de `neub20`/`neub21` são novos: o último é de 18/11 21:13 UTC; a primeira versão deste texto dizia «só 02, 03, 09» e estava defasada). **Traços:** 1 (`neuportada`, intocada). **Notas:** 0.
Verificação (consulta de texto, sem `user_id`; contexto comparado no HTML da `main` × este branch):
- **Texto de ensino alterado só em 11, 17, 19 e 27**, blocos sem grifos. Em 03, 09, 20 e 21 **o ensino é idêntico**; só mudam itens do grupo de perguntas (03: `-2509-03` explicação, `256` nova; 09: nada; 21: `181` reformulada e `253` nova no início do grupo; 16: `257` nova).
- **Nenhum grifo está ancorado em texto de pergunta alterada**: das 244 âncoras, as que repetem texto de uma pergunta alterada/nova (`localiza`, `TAC`, `lesión cerebelosa`, `VII par`, `tabética`, as duas frases de `tijeras/segador` e `interrupción focal del flujo sanguíneo`) têm a ocorrência marcada **no texto de ensino**, e o contexto é idêntico na `main` e aqui. As âncoras com `occurrence` > 0 (`TAC` 2, `tiempo` 3, `Parkinson` 1, `lesión cerebelosa` 1, `nervio periférico` 1, `segundos de duración` 1, `activación excesiva…` 1, `fenómenos positivos…` 1, em 03/09/20/21) também caem no ensino, com contexto idêntico.
- **Limite:** não usei o motor real de grifos (`RMTools`) nesta rodada para as 244; a conferência é por texto e ocorrência. Os blocos 20 e 21 **recebem grifos novos a cada dia**: antes do merge convém repetir a consulta.

## 8 · Conferência das novas questões com os slides (Drive, `Neurologia (Dra. Silva Duarte) › Slides`)
| Pergunta | Slide lido | O que o slide confirma | O que NÃO está no slide |
|---|---|---|---|
| `q-neu090` | `7..pdf` (sono) | estágios N1–N3; N2 = husos e complexos K; tono reduzido; FC e TA «disminuidas, estables»; mov. oculares lentos no N1 | «predomínio parassimpático» (fisiologia geral; o resumo diz «fisiologia geral») |
| `q-neu091` | `7..pdf` | RBD é parassonia **REM**; parassonias NREM = sonambulismo, terrores, despertar confusional, alimentação | — |
| `q-neu254` | `7..pdf` | agudo: higiene do sono, benzodiazepínicos de curta duração (máx. 2 semanas); crônico: TCC-I | «as de longa duração se acumulam/sedação/quedas» (farmacologia geral) |
| `q-neu135`, `q-neu134` | `11..pdf` | «selección según el tipo de crisis»; valproato: generalizada; DDx inclui **distonía paroxística** | clave do exame (não publicada) |
| `q-neu249` | `5.pdf` | Wallenberg: V (espinal), VIII, IX-X, Horner ipsilateral, termoanalgesia cruzada | — |
| `q-neu250` | `5.pdf` | Brown-Séquard: paresia + propriocepção/vibração ipsilaterais, dor/temperatura contralaterais | — |
| `q-neu255` | `5.pdf` | frontal: abulia, desinibição (orbitofrontal), reflexos de liberação (sucção, preensão palmar), desvio do olhar | **«moria»**: vem do enunciado do exame (simulado Turma A), não do slide; foi acrescentada ao resumo como termo, e a resposta não depende dela |
| `q-neu181`, `q-neu253` | `10..pdf` | ACV isquêmico = «interrupção focal do fluxo… necrose (núcleo)…»; hemorrágico: tríade cefaleia–vômitos–consciência, TC sem contraste hiperdensa, HTA, putâmen/tálamo; ACM: desvio do olhar para a lesão | — |
| `q-neu224`, `q-neu252` | `15..pdf` | epidural: lente biconvexa, intervalo lúcido, não cruza suturas, **bom prognóstico se drenagem precoz**, parênquima indemne; subdural: media luna, venas puente | «cruza as suturas, não cruza a linha média» do subdural vem do resumo do bloco 19 (literatura), não do slide |
| `q-neu251` | `15..pdf`/bloco 19 | padrão «mancha branca profunda» é do resumo do bloco 19 (literatura); o slide de TEC não traz a imagem | — |
| `q-neu256` | `1. seccion D PDF.pdf` | segador = unilateral; tijeras = bilateral | a postura «inclinada para a frente» do enunciado é do exame (item falso) |
| `q-neu257` | `6. .pdf` | E-L: facilitação com exercício breve; extraoculares infrequentes; tabela MG × E-L | — |
**Mudança de gabarito de `q-neu090`:** antes «Los husos de sueño y los complejos K identifican… → **a) N2**»; agora a pergunta é outra («característica correta do NREM») e a alternativa certa é a **c)** na versão atual do código (bloco e banco): «Progresa en estadios N1, N2 y N3, con tono parasimpático predominante y husos de sueño y complejos K en el N2». **Correção de registro (19/11):** os relatórios anteriores diziam «b)»; a letra era b numa versão intermediária e passou a c quando as letras corretas foram rebalanceadas (reordenação, 8-A.7). Conferido em pergunta, alternativas e explicação: a explicação abre pelo mesmo texto da c), e as notas a), b) e d) apontam para REM, N3 e REM, que são as alternativas a, b e d de hoje. O conhecimento «husos/K = N2» continua sendo exigido (está dentro da alternativa certa), mas quem já tinha «a) N2» registrado como acerto vê agora outra pergunta com outro gabarito.

## 9 · Questões reconstruídas e matriz de fontes (8-A.5-B)
Marca visível ao aluno (no enunciado ou na explicação) nas reconstruídas; todas levam «Basada en preguntas de examen», **nunca «oficial»**, e nenhuma clave é declarada oficial.
| Id | Tipo de fonte | O que é literal e o que é reconstruído | Fontes conferidas (arquivo · n.º) | Conflito com outro item de prova? |
|---|---|---|---|---|
| `q-neu090` | adaptada | alternativas reescritas em castelhano a partir de simulado (autoria não identificada) | Turma A 5; Turma C 1; slide 7 | não |
| `q-neu091` | rótulo + frase | vinheta já existente; só se acrescentou a classificação REM × NREM | Turma A 16; Manuscrito 13; slide 7 | não |
| `q-neu134` | acréscimo | item «distonía paroxística» do slide | docx 10; slide 11 | não |
| `q-neu135` | literal (afirmação) | afirmação copiada do docx 14 / Notes; alternativas e explicação próprias | docx 14; Notes P1; slide 11 | não; **clave não publicada** |
| `q-neu181` | **reconstruída** | enunciado traduzido do simulado, alternativas reescritas | Turma A 19; slide 10 | não |
| `q-neu224` | **reconstruída** | só a resposta do exame foi anotada | Turma C 8; slide 15 | não |
| `q-neu249` | literal (enunciado e alternativas do docx, limpas) | — | docx 7; Notes P1 (4 alternativas); slide 5 | não; clave não publicada |
| `q-neu250` | literal (vinheta D-2) + alternativas do Notes | — | D-2 19 (foto 06/10); Notes P2; slide 5 | não |
| `q-neu251` | **reconstruída da imagem** | descrição em palavras da TC; a imagem não está no site | docx 22 (`image3.png`) | não; clave não publicada |
| `q-neu252` | **reconstruída da imagem** | idem | docx 29 (`image5.png`) | não; clave não publicada |
| `q-neu253` | **reconstruída** | só a resposta da recordação foi anotada | Turma C 3; slide 10 (definição quase literal) | não |
| `q-neu254` | **reconstruída** | de uma anotação manuscrita | Manuscrito 12; slide 7 | não; clave = a da anotação |
| `q-neu255` | **reconstruída** (imagem «simulada» não vista) | traduzida do simulado, imagem descrita em palavras | Turma A 20; slide 5 | não |
| `q-neu256` | traduzida | enunciado de uma anotação em português | Notes P1 V/F; slide 1 | não |
| `q-neu257` | literal | copiado das fotos | P1 seção C 16 (fotos de 25/09); slide 6 | não; clave não publicada |
**Proveniência dos simulados:** «Turma A (P2)» tem autoria não identificada, «imagem simulada» e gabarito comentado com erro (GCS «4» em vez de 6); por isso o rótulo vale como «baseada em material de prova», **sem afirmar que seja prova oficial**. Se José concluir que é material preparado por terceiros, as perguntas que dele vêm (`090`, `181`, `255` e as `235`–`248` da #683) devem passar a «complementares».

## 10 · Auditoria de viés e de pistas visuais (rodada de 18/11, noite) — as perguntas (na época 295), no bloco e no banco
**Medido antes (HTML da `main`):** (a) **60 de 174 MCQ** tinham negrito/itálico nas alternativas; em **56** só a alternativa **correta** tinha ênfase; (b) **63 de 65 V/F** traziam negrito no enunciado (o negrito costuma cair na parte que torna a frase falsa); (c) a alternativa correta era a **mais longa em 113 de 174 MCQ (65 %)**, com razão mediana correta/média das erradas de **1,46** (91 itens > 1,4; 46 > 1,8); (d) alternativas «absurdas» curtas («Esperar 15 minutos más», «Solo observación», «La mitad superior de la cara no tiene inervación motora»); (e) absolutos («siempre», «nunca», «toda», «únicamente») concentrados nas erradas em 8 itens; (f) letras corretas a:39 b:48 c:43 d:42.
**Corrigido:**
- **Ênfase:** removido todo `<b>/<i>` das alternativas das 177 MCQ e do enunciado dos 66 V/F; em 14 enunciados de MCQ desmarcadas as palavras em negrito que só a alternativa correta repetia (ex.: «lente biconvexa», «insomnio crónico»). Resposta/explicação seguem com destaque (só aparecem depois de responder).
- **Comprimento/plausibilidade:** **90 perguntas** tiveram as alternativas reescritas (mesmo conceito, mesma resposta correta) para equalizar extensão, trocar absurdos por distratores plausíveis e suavizar absolutos; 2 enunciados reformulados (`q-neu249`, `q-neu135`). Depois: correta mais longa (≥ 5 caracteres) em **46/177 (26 %)**; razão mediana **1,09**.
- **Letra correta:** alternativas **reordenadas** (8-A.7: só reordenação, nunca mudança de resposta) com semente fixa: a 45 · b 44 · c 44 · d 44 (≈ 25 % cada) e **nenhuma sequência de 3 iguais** na ordem do arquivo; as letras citadas nas explicações («a) …», «b) y d) …») foram remapeadas e conferidas item a item (nenhuma nota cita a letra correta; mesma alternativa continua correta).
- **Exceção declarada:** `q-neu166` (miastenia) mantém as alternativas a/d quase idênticas do exame original (a diferença é a frase «no existe relación con el timo»); a correta não é a mais longa.
**Bug real encontrado e corrigido (afetava a `main`):** em **10 V/F da `main`** (`q-neu186, 196, 201, 208, 215, 222, 228, 235, 237, 239`) os botões chamavam `checkTF(this, true)` mesmo quando a resposta é FALSO; o aluno que clicava em «FALSO» (certo) via «¡INCORRECTO!». Origem: o gerador dos blocos 20–27 e da #683. Agora todos os V/F (66) passam o argumento certo, e o teste novo confere isso e o comportamento no navegador. Os testes antigos não pegavam o defeito.
**Resposta só após a interação:** conferido no navegador (1440 e 390): em todos os 534 itens a explicação está oculta antes do toque, nenhum item nasce com `answered/correct/wrong`, as alternativas têm o mesmo peso/cor/fundo; depois, 354 MCQ e 132 V/F respondem e marcam corretamente.

## 11 · Novas questões desta rodada (da conferência das provas restantes)
| Id | Fonte | Decisão e motivo |
|---|---|---|
| `q-neu258` (bloco 03) | P1 2026 item 3 (`provasneuroP1261.pdf`) + Notes P1 | **NOVA**: identificar a marcha atáxica sensitiva/tabética pela descrição; o banco só a citava dentro de explicações |
| `q-neu259` (bloco 02) | P1 2026 item 19 + Notes caso 2 | **NOVA**: afasia de conducción **em caso clínico** (o banco só tinha a V/F `q-neu106`) |
| `q-neu260` (bloco 18) | P1 2026 item 12 + Notes P2 V/F | **NOVA**: Glasgow com O3 (à ordem) + V3 + M4 = 10, afirmação «8/15» é falsa; valores M4 e O3 não eram testados |
| `q-neu261` (bloco 26) | `provaneurorevisar_sem_repetidas.pdf` («profilaxis de migraña que no puede usarse en asmático: propranolol») | **NOVA, reconstruída**; o resumo ganhou a frase «propranolol: betabloqueante no selectivo, se evita en el asma» |
| `q-neu262` (bloco 21) | compilado `provaneurorevisar` (itens 4/5) | **NOVA, reconstruída**: FA ⇒ cardioembolismo; **slide de ACV** (TOAST: cardioembolismo 20 %, FA, valvulopatías) e o bloco 21 já ensinam |
| `q-neu263` (bloco 27) | compilado (item 85) | **NOVA V/F, reconstruída**: edema vasogênico na contusão; vem **só do compilado** (o slide de TEC apenas nomeia «vasogênico e citotóxico»); ensino acrescentado no bloco 27; falta confirmar com a literatura-base |
| `q-neu264` (bloco 25) | compilado (item 59) | **NOVA, reconstruída**: oftalmoplegia internuclear / FLM (a fonte dizia «abduce» onde corresponde «aduce»); **slide de EM** (unidade X) e o bloco 25 já ensinam |
| `q-neu265` (bloco 22) | compilado (itens 32/125) | **NOVA V/F**: punta-onda 3 Hz na ausência típica; **só do compilado** (não está nos slides); ensino acrescentado no bloco 22; falta confirmar |
| `q-neu266` (bloco 22) | compilado (itens 28/31/122) | **NOVA, reconstruída**: síndrome de West (4–7 meses); Lennox-Gastaut 1–8 anos; **só do compilado**; ensino acrescentado; falta confirmar |
| `q-neu267` (bloco 23) | compilado (itens 145/146) | **NOVA, reconstruída**: coreia de Sydenham; **só do compilado** (o slide de Parkinson/disquinesias não a cita; Huntington e antipsicóticos dos distratores sim); ensino acrescentado no bloco 23; falta confirmar |
| `q-neu268` (bloco 27) | compilado (item 25) | **NOVA V/F**: hiperventilação forçada não é primeira linha; **só do compilado**; ensino acrescentado no bloco 27; falta confirmar |
| `q-neu269` (bloco 21) | compilado (item 8) | **NOVA, reconstruída**: HIC hipertensiva, sítio mais frequente = putaminal (35 %, **slide de ACV**) |
| `q-neu270` (bloco 24) | compilado (itens 129/130/131/186; resposta cortada) | **NOVA, reconstruída**: apraxia ideatória (caixa de fósforos); resposta pelo **slide da unidade IX** (ideatória = sequência; «encender una vela con fósforos»); o bloco 24 já ensinava |
| `q-neu271` (bloco 24) | idem | **NOVA, reconstruída**: apraxia ideomotora («haga como si se cepillara los dientes»); slide da unidade IX |
| `q-neu272` (bloco 24) | compilado (item 132; resposta cortada) | **NOVA, reconstruída**: anosognosia (desconhecimento da doença; parietal direito); slide da unidade IX |
| `q-neu273` (bloco 21) | compilado (item 175) | **NOVA, reconstruída**: infarto da ACA (paresia crural contralateral, abulia, incontinência urinária); slide de ACV; o bloco 21 já ensinava |
| `q-neu274` (bloco 21) | compilado (item 3) | **NOVA V/F**: hemorrágico menos frequente (10–15 %) e mais letal (40–50 %); slide de ACV |
| `q-neu275` (bloco 22) | compilado (itens 29/34) | **NOVA, reconstruída**: crise focal motora com marcha jacksoniana, origem na circunvolução frontal ascendente contralateral; slide da unidade II (síndromes irritativos); frase de ensino acrescentada no bloco 22 |
| `q-neu276` (bloco 22) | compilado (item 82) | **NOVA, reconstruída**: crise generalizada tónico-clónica (1–3 min; posictal com confusão, cefaleia, mialgias); **slide da unidade VII** |
| `q-neu277` (bloco 18) | compilado (item 58) | **NOVA, reconstruída**: coma com rigidez de nuca ⇒ HSA; slides de ACV (tríade) e de coma; frase de ensino acrescentada no bloco 18 |
| `q-neu278` (bloco 17) | compilado (itens 50/158) | **NOVA, reconstruída**: função do SRAA (vigília); **slide da unidade III** |
| `q-neu279`–`281` (bloco 11) | compilado (perguntas abertas por lobo, itens 104–113) | **NOVAS DEFINE**: manifestações do lobo frontal, parietal e temporal; conteúdo do **slide da unidade II**, que o bloco 11 já ensinava |
| `q-neu282` (bloco 01) | compilado (item 123) | **NOVA DEFINE**: obnubilação, estupor, coma; **slide da unidade I** |
| `q-neu283` (bloco 19) | compilado (item 166; a resposta estava no texto, eu a tinha lido mal) | **NOVA, só do compilado**: HTE benigna (pseudotumor) com TAC normal; ensino acrescentado no bloco 19; falta confirmar com literatura |
| `q-neu284` (bloco 21) | compilado (item 170) | **NOVA, reconstruída**: microaneurismas de Charcot-Bouchard; **slide de ACV** |
| `q-neu115` | compilado (item 39) | **MELHORADA** (mesmo id, bloco e banco): a explicação passa a distinguir crise focal *sem* alteração da consciência (déjà vu isolado) da *com* alteração (este caso) |
| `q-neu004` | P1 2026 item 15 (V/F falso «brazos en abducción y flexión rígida») | **integrada** na explicação da canônica (mesma competência) |
Itens da P1 2026 / `Prova … Dra Silvia` / Notes já cobertos por equivalência (conferidos um a um): origem do V e do IX, vegetativo, hiperprosexia/hipoprosexia, facial, Sunderland, Wallenberg, glossofaríngeo, irritativos, cordões posteriores, fácies parkinsoniana, deficitários, nervio espinal, Eaton-Lambert, segador × tijeras (`256`), centrais, decorticação, afasia de conducción, Glasgow 10/15, nivel de conciencia, heminegligencia, Bakody (`163`), Benedikt, Lasègue, Brown-Séquard (`250`), miastenia, caso temporal, cubital.
`Provas neuro Aline .pdf`: páginas com a P1 já conferida + uma prova de **urgências** (XABCDE, Glasgow-P/«NT», riscos laborais) que **não é de Neurologia**; o item de Glasgow com componente «não testável» (E NT V NT M5) **não está no resumo** → **não incorporado** (exigiria ensino prévio). `Examen Final … pdf` = mesma prova do `.docx`.
`provaneurorevisar_sem_repetidas.pdf`: texto obtido pela primeira vez (≈145 mil caracteres); triagem em `neurologia-revisar-triagem-v1.md` (**186 candidatos agora conferidos item a item em 19/11: ver a tabela do pack**). Resultado: 85 já cobertos, 25 cobertos em parte, 12 itens acrescentados (8 questões novas), 40 pendentes por **falta de ensino no resumo**, 29 pendentes por **fonte** truncada/contraditória, 2 descartados. O que falta é ensinar (slides/literatura) os 40 temas ENS e esclarecer as fontes FNT; nada foi inventado.

## 12 · Testes antigos atualizados (sem esconder falhas)
`neuro-667`, `neu-questoes-1811` e `neu-glosario` comparavam o HTML com «a main de antes da PR» e contavam 238/254. Foram atualizados: contagens agora lidas do próprio arquivo, rótulos aceitos conforme o registro (complementar ou baseada em exame, nunca «oficial»), DEFINE reconhecido como tipo. As asserções «idêntico à base» foram **aposentadas com comentário** (as PRs seguintes e esta alteram esses trechos de propósito); as invariantes continuam: ids, espelho, forma, glosas só no ensino, e as novas em `neu-8a1b`. O defeito real do `checkTF` **não** vinha dessas falhas: foi achado pelo teste de navegador novo.


## 13 · Auditoria de reordenação e dos V/F (19/11/2026, rodada 3)

Script de auditoria comparando `main` × branch, id a id (bloco **e** banco refletem o mesmo conteúdo):
- **MCQ não reescritas (74):** a alternativa correta tem o **mesmo texto** que na `main`; a letra mudou em 52. As notas de cada alternativa errada **seguem a sua alternativa** (a nota «b) … y d) …» virou «a) … y c) …» quando as alternativas se moveram; conferi à mão os 4 casos de nota combinada: `q-neu035`, `q-neu116`, `q-neu118`, `q-neu119`). Resposta científica **inalterada**.
- **MCQ reescritas (88 ids, lista no teste estático):** li as 88 pares «correta antiga ⇒ correta nova»: mesma resposta, texto equalizado; mudanças com conteúdo: `q-neu058` (explicação já dizia «respeito macular»), `q-neu090` (a→c na versão atual, decisão de José pendente), `q-neu181` (enunciado reformulado, ver §2), `q-neu224` (+ «bom prognóstico se drenado a tempo», já ensinado), `q-neu102` (+ «lesão pontina ventral»). Exceção documentada: `q-neu166` (texto da resposta mais longo que a alternativa, igual à `main`).
- **V/F (62 → 70):** em **todos** o cabeçalho VERDADERO/FALSO concorda com o argumento de `checkTF` (teste estático em bloco e banco) e com a explicação («Es falso/verdadero…»); 0 incoerentes.
- **Número real de V/F corrigidos:** o «28» dito antes contava **ocorrências** (bloco + banco). Os itens reais são **14**: **10 já estavam errados na `main`** (`q-neu235`, `237`, `239` com `true` para FALSO; `186`, `196`, `201`, `208`, `215`, `222`, `228` com `false` para VERDADERO) e **4 foram introduzidos por commits anteriores desta mesma PR** (V/F novos que o ajudante gerava com `true`) e corrigidos antes do commit final. Na `main`, 10 de 62 V/F (16 %) respondiam ao contrário.

## 14 · Rodada 4 (19/11): linhas «cobertas em parte», temas sem ensino e as perguntas só do compilado

- **48 linhas COB-P revisadas uma a uma** (resultado em `neurologia-revisar-triagem-v1.md`): 13 passaram a **ACR** (com pergunta nova ou DEFINE de slide), 7 a **COB** (o id citado cobre o mesmo raciocínio), 2 a **FNT** (o compilado contradiz o slide: FRAA «só bulbar» e rafe «inibidor»). As demais continuam COB-P com o motivo escrito (a prova cobra uma variante que nenhum slide ensina, p.ex. «lesão pré-tectal»).
- **38 linhas sem ensino:** re-buscadas por palavra-chave nos **16 slides** (baixados e extraídos em texto). **Nenhum** tema tem apoio; também **não há literatura-base** no repositório nem no Drive. Permanecem pendentes (nada inventado). Duas linhas FNT passaram a ENS porque a resposta existe no compilado mas o tema não está nos slides (encefalopatia crônica não progressiva; síndrome de Klüver-Bucy).
- **Releitura do compilado:** várias respostas que eu dera por ausentes estavam na linha vizinha. Recuperadas: HTE benigna (`q-neu283`), cefaleia tensional («occipital, nuca con estrés», COB `q-neu220`), motoneurona do corno anterior (COB `q-neu037`), Charcot-Bouchard (`q-neu284`).
- **As 6 perguntas só do compilado** (`q-neu263`, `265`, `266`, `267`, `268`, `283`): fonte textual exata e limite na tabela do pack de triagem. Não são apresentadas como confirmadas: cada explicação diz que falta confirmar com a literatura-base.
- **Novas com apoio em slide:** `q-neu276`–`282` e `284`; teaching acrescentado: bloco 18 (rigidez de nuca ⇒ HSA) e bloco 19 (HTE sem massa).
- **Sem mexer:** grifos, imagens, ids, `q-neu233/234`, a PR #682.

## 15 · V/F que marcavam a resposta certa como errada (19/11/2026)

**Defeito:** em 10 V/F da `main` (20 com o banco) o argumento de `checkTF(this, X)` estava ao contrário do cabeçalho da explicação; clicar no veredito certo marcava «wrong». Medido no navegador: na `main`, só 104 de 124 V/F respondiam certo (20 falhavam, em 1440 e 390, clicando em VERDADERO ou em FALSO).

**Validação de cada um dos 10 contra o enunciado, a explicação e o slide da cátedra** (o cabeçalho já estava certo; o que estava errado era o argumento):
| Id (bloco e banco) | Enunciado resumido | Veredito | Slide |
|---|---|---|---|
| `235` | insomnio agudo = ≥ 3 meses, ≥ 3 noites/semana | FALSO (é o crônico; agudo < 3 meses) | unidade III (sono): agudo < 3 meses; crônico ≥ 3 meses e ≥ 3 noites |
| `237` | morte encefálica «não equivale» à morte, é estado prévio | FALSO | unidade IV: equivalência jurídica e médica com a morte |
| `239` | EEG = agulhas finas nos músculos | FALSO (é o EMG) | unidade V: EEG × EMG |
| `186` | HSA: aneurisma em ~85 % | VERDADERO | unidade VIII (ACV) |
| `196` | 2 anos sem crises ⇒ retirada gradual, recorrência 30–40 % | VERDADERO | unidade VII (epilepsia): ≥ 2 anos livres; 30–40 % |
| `201` | Parkinson: diagnóstico clínico, bradicinesia + temblor ou rigidez | VERDADERO | unidade VIII (Parkinson) |
| `208` | MoCA mais sensível que MMSE para DCL e demências não-Alzheimer | VERDADERO | unidade IX |
| `215` | EM: gravidez reduz surtos no 2.º e 3.º trimestres, aumenta no puerpério | VERDADERO | unidade X |
| `222` | aura de migraña < 60 min e reversível | VERDADERO | unidade X (cefaleias) |
| `228` | queda ≥ 2 pontos no Glasgow ⇒ repetir TAC e considerar neurocirurgia | VERDADERO (o slide dá «TAC seriada se deterioro clínico ou GCS cai ≥ 2»; «considerar neurocirurgia» é a leitura de hematoma em expansão, já na explicação) | unidade XIV–XV (TCE) |

**Correção:** só o argumento de `checkTF` (nos dois botões de cada item, no bloco e no banco). Nenhum enunciado, veredito, explicação ou id foi alterado para isso.

**Os demais V/F** (todos os 70 pares, 140 itens): teste estático (argumento × cabeçalho × explicação, dois botões iguais) e teste de navegador clicando em VERDADERO numa carga e em FALSO na outra, em 1440 e 390: o veredito certo recebe «correct», o clique errado recebe «wrong», o aviso diz CORRECTO/INCORRECTO conforme o clique e a explicação aparece. **0 defeitos além dos 10.**

## 16 · Revisão final (19/11/2026, após o merge da #696)

- **Base:** a `main` já tem o negrito removido (#693) e os 10 V/F corrigidos (#696); a #687 foi mesclada sobre ela sem conflito no `neurologia.html` (arquivo idêntico ao da #687; só os testes duplicados foram reconciliados, mantendo as versões da #687 que contavam 295/195/71).
- **`q-neu090`** (conferido de novo na versão final, bloco e banco): pergunta «característica correta do NREM»; a resposta certa é a alternativa **c)** «Progresa en estadios N1, N2 y N3, con tono parasimpático predominante y husos de sueño y complejos K en el N2»; a explicação abre por esse texto e as notas a), b), d) apontam para REM, N3 e REM. O Cartão passa a dizer **c)** (o «b)» era de uma versão intermediária).
- **Duplicatas preservadas com seus ids:** `q-neu233` ≈ `q-neu-2509-03` e `q-neu234` ≈ `q-neu-2509-05` continuam no bloco e no banco; teste novo confere.
- **Fonte de cada pergunta acrescentada (`q-neu249`–`284`), no bloco e no banco — todas declaram na própria explicação a origem e que não há clave oficial:**
  - **Com apoio em slide da cátedra:** `262`, `264`, `269`, `270`–`282`, `284` (a nota agora o diz).
  - **Resposta determinada pelo conteúdo ensinado no bloco, sem clave oficial:** `249`–`261` (fotos/docx/Notes de exames; a clave não foi publicada).
  - **Reconstruídas de imagem de exame que não está no site:** `251`, `252`, `255` (nota acrescentada nesta rodada).
  - **Só do compilado de alunos, sem slide e sem livro (insuficiente para dar por confirmada):** `263`, `265`, `266`, `267`, `268`, `283`. Ficam marcadas «falta confirmar com a literatura-base».
- **Literatura-base:** não existe literatura-base de Neurologia no repositório nem no Drive; a revisão final usou os 16 slides.
- **Alternativas reordenadas:** auditoria por script (id a id, resposta pelo texto da alternativa e notas seguindo a alternativa) sem divergência; as 88 reescritas foram lidas em pares; nenhuma depende de fonte além de slide/bloco.
- **Pendências mantidas, sem inventar resposta:** 40 temas do compilado sem ensino (nenhum slide); 20 linhas de fonte truncada/contraditória; anosmia bilateral; apraxia ideatória; Kernig/Brudzinski; FRAA bulbar e rafe inibidor.

## 17 · Rodada 5 (19/11/2026): rastreabilidade por arquivo e `q-neu285`–`289`
- **Documento novo:** `neurologia-rastreabilidade-provas-v1.md` — tabela por arquivo de prova (aberto como, detectadas, NOVA/MEL/COB/COB-P/PEND/REP), itens de P1 Silvia, P1261, Notes e Aline com id existente e comparação, grupo A/B/C dos 281 parágrafos restantes do compilado, avisos do que não foi aberto. As somas fecham por arquivo.
- **Cinco perguntas novas, todas com ensino prévio e apoio em slide da cátedra** (`Basada en preguntas de examen`): `q-neu285` (nível da punção lombar; bloco 15; compilado par. 169), `q-neu286` (Cheyne-Stokes ⇒ lesão diencefálica/hemisférica bilateral; bloco 18; par. 439/995), `q-neu287` (pupila de Argyll Robertson; bloco 04; par. 741/974/975), `q-neu288` (V/F, Glasgow 2+4+5 = 11 e não 10; bloco 01; P1 Silvia 17/Notes 233/353), `q-neu289` (DEFINE, quatro características da fácies parkinsoniana; bloco 03; P1 Silvia 9/Notes 177). Letras corrigidas por permutação para não formar 3 iguais seguidas.
- **Contagem do site:** 295 (MCQ 195 · V/F 71 · DEFINE 29) × 2 (bloco e banco) = 590.
- **Limitações (não resolvidas, nada inventado):** as 6 perguntas só do compilado (`263`, `265`–`268`, `283`) continuam sem confirmação em slide ou livro; 119 + 75 parágrafos (grupos B e C do §8 da rastreabilidade) aguardam conferência item a item; GCS com componente «NT» (Aline) sem ensino; 479 imagens do Notes e figuras das fotos de 18/11 não foram abertas.

## 18 · Rodada 6 (20/11/2026): retirada das 6 perguntas sem fonte e comparação dos 281 parágrafos
- **Retiradas da entrega** (bloco e banco): `q-neu263`, `265`, `266`, `267`, `268`, `283`. Motivo: a resposta só existe no compilado de alunos; os 16 slides não as sustentam (o de TEC só nomeia «vasogênico e citotóxico»; o de exames complementares só nomeia o pseudotumor cerebral) e não existe literatura-base de Neurologia no projeto. Também saíram os parágrafos de ensino acrescentados só para elas (blocos 19, 22, 23 e 27, que voltam ao texto da `main`); permanece a frase da **marcha jacksoniana** (bloco 22), sustentada pelo slide 1. Ids reservados, não reutilizados. Para reincluí-las: confirmação da cátedra ou a literatura-base.
- **Contagem do site:** 289 (MCQ 192 · V/F 68 · DEFINE 29) × 2 = 578. Triagem dos 186: 61 COB + 26 COB-P + 28 ACR + 9 PEND-R + 40 ENS + 20 FNT + 2 DESC.
- **281 parágrafos restantes**: comparados um a um; resultado em `neurologia-rastreabilidade-provas-v1.md` §8/§11 (205 COB, 32 COB-P, 23 ENS, 6 FNT, 2 PEND-R, 7 FRAG, 6 ACR).
- Regra do projeto (CLAUDE.md 9-B, `main` de 20/11): conteúdo médico segue os slides atuais e a literatura-base permitida; por isso nada sem fonte entra.

## 19 · Rodada 7 (20/11/2026): fontes de `q-neu254`/`261`, grifos, amostra e duplicatas
- **`q-neu254`** confirmada no slide 7 (insomnio agudo: benzodiacepinas de corta duración, máx. 2 semanas); retirada a frase sobre acúmulo/quedas (sem fonte). **`q-neu261`** confirmada no slide de cefaleas (preventivos) e na página de Farmacología II (propranolol não seletivo, profilaxis de migraña, contraindicação asma). Detalhe em `neurologia-rastreabilidade-provas-v1.md` §13.
- **Amostra de 13 itens** (§12): 1 classificação corrigida → **`q-neu290`** (músculo ciliar, bloco 04, slide de pares cranianos); nota de `q-neu286` agora declara o conflito compilado × slide (Cheyne-Stokes). Site: **290 perguntas** (MCQ 193 · V/F 68 · DEFINE 29) × 2 = 580.
- **Grifos** com o resolvedor real do site: 24/24 iguais na `main` e na branch (§14).
- **Duplicatas 233/234:** recomendação em §15; nada removido.
