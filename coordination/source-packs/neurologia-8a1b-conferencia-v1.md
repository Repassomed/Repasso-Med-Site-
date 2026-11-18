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
   - Os dois itens de prova que eu tinha posto nesses ids ganharam **ids novos**: **`q-neu256`** (bloco 03) V/F «segador × tijeras» e **`q-neu257`** (bloco 16) V/F Eaton-Lambert × miastenia.
   - Observação: o slide 1 diz «tijeras: … disfunção da medula espinal» e o resumo do bloco 03 repete «médula» na síntese; não toquei nesse texto de ensino (bloco com grifos de alunos) — decisão de José.
2. **«Complementares» que já absorviam item de prova** (Turma A/C, Manuscrito, docx) passaram a **«Basada en preguntas de examen»**: `q-neu090` (reformulada), `091` (rótulo + frase de integração), `135` (reformulada), `181` (reformulada), `224` (rótulo + pergunta completa). `093`, `183`, `231` **continuam complementares** (não absorvem nenhum item de prova: ver §4).
3. **Itens de prova sem raciocínio equivalente → acrescentados** (`q-neu249`–`257`, todas «Basada en preguntas de examen», no bloco e no banco).
4. **Resumo completado antes de cobrar** (8-A.2): NREM = reposo, tono parassimpático, FC/PA baixas (bloco 17); `moria` (bloco 11); «distonía paroxística» (bloco 19, tabela do diagnóstico diferencial, e resposta de `q-neu134`); epidural de bom prognóstico se drenado a tempo (resumo-chave do bloco 27).
5. **Contagens declaradas (8-A.10)**: portada/banco 254 → **263** (MCQ 168 → 174; V/F 62 → 65); cabeçalhos e subtítulos dos blocos tocados; **8 cabeçalhos antigos estavam defasados** (blocos 01, 04, 05, 06, 10, 14, 15, 16 declaravam menos perguntas do que existem) e foram corrigidos.

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
Turma C 2 (TCE «lesión»), Turma C 6 grave (resposta não recuperada), Manuscrito 15 (subdural subagudo), D-2 10 («epigástrico»), figura do item 28 do docx, «imagem simulada» da Turma A 20 (não vista), PDFs não reabertos (§1). **Clave oficial: nenhuma prova da pasta traz clave publicada pela cátedra**; as respostas são determinadas pelo conteúdo ensinado (slides do site) e as letras foram distribuídas sem padrão (a:39 b:48 c:43 d:42 nas MCQ).

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
**Mudança de gabarito de `q-neu090`:** antes «Los husos de sueño y los complejos K identifican… → **a) N2**»; agora a pergunta é outra («característica correta do NREM») e a alternativa certa é a **b)** (estágios N1–N3, FC/TA baixas e estáveis, husos e K no N2). O conhecimento «husos/K = N2» continua sendo exigido (está dentro da alternativa certa), mas quem já tinha «a) N2» registrado como acerto vê agora outra pergunta com outro gabarito.

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
