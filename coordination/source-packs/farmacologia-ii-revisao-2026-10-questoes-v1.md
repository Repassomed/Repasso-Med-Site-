# Farmacología II · Revisão completa 2026-10 · Etapa 2 — Questões (documento interno)

> **Uso interno / coordenação.** Nada deste documento vai para a página do aluno (G0 §142; MANUTENCAO 8-A.6-A).
> Agente: Claude 2 · tarefa `farmacologia-ii-revisao-completa-2026-10` · branch `claude/farmacologia-ii-revisao-completa` · issue #67.

## 1 · Perímetro auditado (e por que 179, não 347)

A triagem inicial falava em «215/347 corretas como única alternativa mais longa». A contagem real, sem espelhos do banco:

| unidade | n |
|---|---|
| quiz-items no HTML (blocos + banco f2b15) | 428 |
| espelhos do banco (cópia textual 1-para-1 de cada item de bloco) | 214 |
| itens únicos nos blocos | 214 |
| … dos quais **MCQ de 4 alternativas com gabarito legível** | **179** |
| … dos quais completar / V-F / casos de resposta aberta (fora do critério de tamanho) | 35 |
| rótulo «Basada en preguntas de examen» / «Pregunta complementaria» (214 itens de bloco) | 133 / 81 — entre as 179 MCQ: 98 / 81 |

O 347 da triagem não bate com nenhuma contagem única do arquivo (a soma bloco+banco de MCQ dá 358); por isso a auditoria usa **179 MCQ únicas** e trata o banco como espelho (8-A.6-C). Nenhuma MCQ ficou sem passar pelo auditor.

## 2 · Provas disponíveis e padrão da matéria/docente

Fonte lida: o conjunto «Belem completo» (texto de Drive) — vários papéis de avaliação num só arquivo (segunda parcial teórica, final ordinário/complementar/extraordinário, versões reproduzidas pelos alunos, algumas com gabarito manuscrito parcial). O PDF «Belem.pdf» é escaneado e **não foi legível** (a extração devolve vazio); só entrou a versão transcrita.

Padrão **observado** (com a ressalva de que a amostra é pequena e heterogênea; nada aqui é tendência, nem se atribui autoria a um docente específico):

* formatos: «Marca la respuesta correcta» (4 alternativas, a–d), «Verdadero o Falso — justifica las falsas», **completar**, **cite 3** (ex.: RAM de diuréticos, β-bloqueantes e receptores, efeitos dos nitratos), e raros casos curtos de justificativa (início de farmacoterapia);
* enunciados **diretos e classificatórios** (fármaco → classe / mecanismo / efeito adverso), com algumas formas de «EXCETO»; poucos casos clínicos longos;
* alternativas das provas originais são **curtas e homogêneas** — não há sinal de que a correta seja sistematicamente a mais longa; esse viés estava nas questões **complementares geradas** no site (razão correta/outras média 1,95 nas complementares contra 1,16 nas literais), o que confirma que o problema era do banco gerado, não da prova;
* **um único enunciado não gera tendência.** Os itens que parecem recorrentes (edema de DHP, Verapamilo, losartán = ARA II, diltiazem = clase IV, transcortina) já estavam ensinados no resumo; **nenhum conteúdo novo foi adicionado por causa de prova** nesta etapa (8-A.2: resumo ensina → questão cobra).

Cobertura de itens da prova checada contra o resumo (candidatas a lacuna da etapa 1): losartán = ARA II → ensinado (blocos de HTA/SRAA, b02–b03); diltiazem = clase IV → ensinado (bloco de antiarrítmicos, «Clase IV · verapamilo y diltiazem»); transcortina → ensinado (b07, farmacocinética do cortisol) — **sem lacuna**.

## 3 · Classes de origem (heurística de proveniência)

Classificação por cobertura de 3-gramas do enunciado e das alternativas contra o texto das provas lidas — **heurística, não prova documental**: O = literal/quase literal; P = parcial; R = reconstruída (alternativas e/ou enunciado refeitos sobre tema que a prova cobra); C = complementar gerada.

| classe | n | revisadas | corretas únicas mais longas antes → depois | razão média correta/outras antes → depois |
|---|---|---|---|---|
| O (originais) | 9 | **0** (preservadas) | 2 → 2 | 1,16 → 1,16 |
| P | 17 | 2 | 7 → 6 | 1,35 → 1,16 |
| R | 72 | 34 | 40 → 26 | 1,53 → 1,07 |
| C | 81 | 61 | 62 → 26 | 1,95 → 1,03 |
| **total** | **179** | **97** | **111 (62 %) → 60 (34 %)** | **1,69 → 1,07** (mediana 1,49 → 1,05) |

Razão ≥ 1,3: 103 → 17 · razão ≥ 1,5: 89 → 8 · empates de «mais longa» 6 → 10.

Por bloco (corretas únicas mais longas antes → depois / n): b01 14→9/22 · b02 9→5/14 · b03 6→2/18 · b04 3→1/8 · b05 10→4/14 · b06 7→2/9 · b07 7→3/11 · b08 5→3/10 · b09 9→6/10 · b10 8→4/8 · b11 9→6/10 · b12 8→6/15 · b13 8→4/12 · b14 8→5/18.

**Honestidade sobre o resíduo.** 34 % ainda é maior que os ~25–30 % que o acaso daria; o resíduo vem de (i) 9 literais da prova + 15 parciais + 38 reconstruídas **deliberadamente intactas** (já equilibradas, ou com qualificadores necessários) (a lei manda preservar a forma real de cobrança — 8-A.5/8-A.9), (ii) alternativas cuja resposta correta **precisa** de qualificadores (dose, mecanismo + consequência) e que não se podem encurtar sem perder ciência. Nesses casos o desequilíbrio de tamanho foi reduzido (razão mediana ~1,05), mas não eliminado.

## 4 · O que mudou nas 97 MCQ revisadas

* **Tamanho:** corretas alongadas por muitas palavras foram encurtadas **sem perder o conceito**; distratores curtos demais foram completados com um detalhe **plausível e cientificamente defensável** (nenhum absurdo, nenhuma negação artificial).
* **Distrator forte + detalhe discriminante** (8-A.6): em cada questão revisada ficou definido um segundo competidor plausível e o **detalhe** que o aluno precisa compreender para separá-lo da correta (tabela §6). Uma única melhor resposta em todas.
* **Absolutos artificiais** («exclusivamente», «solo», «sin excepción», «Ningún…») neutralizados nos distratores onde faziam de pista.
* **Explicações:** o parágrafo «Las otras» passou a refutar cada distrator pelo seu detalhe (incluindo os que antes só diziam «es falso»); onde não havia o parágrafo, anexou-se **dentro do último `<p>` existente** (um `<p>` novo deslocaria a tinta — ver §8).
* **Letras (8-A.7):** antes a/b/c/d = 40/51/45/43; depois 40/49/46/44. Só **2 itens** mudaram de letra (transposição com remapeamento das explicações, o mesmo em bloco e banco). Maior corrida: 4. Nenhuma reordenação alterou resposta científica.
* **Sincronia bloco ↔ banco: 0 divergências** (214 pares comparados por rótulo + alternativas + resposta).
* **Contagens declaradas** no texto (214 comentadas; 133 basadas en exámenes / 81 complementarias etc.) **não mudaram**: nenhuma questão foi criada, removida nem fundida.

## 5 · Achados que **não** foram alterados (para decisão humana)

1. **#114 e #133** (blocos distintos) cobrem o mesmo raciocínio e são **duplicata semântica** (8-A.1). Não foram removidas: a lei 8-A.9 proíbe apagar sem decisão e a escolha da canônica (8-A.1-B) pede juízo de José. Recomendo manter a mais completa e reformular a outra para outro ângulo.
2. Cabeçalhos de seção «Preguntas basadas en exámenes · Bloque NN» e o contador do banco («N basadas en exámenes · M complementarias») foram **mantidos**: são rótulos de proveniência honestos (8-A.4), não estratégia.
3. As questões marcadas O/P foram mantidas mesmo quando a correta é a mais longa.

## 6 · Tabela por questão — distrator forte e detalhe discriminante (97 revisadas)

Colunas: idx (índice entre os 214 itens de bloco) · bloco · classe · letra da correta antes→depois · razão de tamanho correta/outras antes→depois · início do enunciado · letra do distrator forte · detalhe que separa.

| idx | bl. | cl. | letra | razão | enunciado | forte | detalhe discriminante |
|---|---|---|---|---|---|---|---|
| 0 | b01 | R | b→b | 2.0→1.29 | Un hombre con hipertensión controlada con atenolol suspende el fármaco… | c | mismo número de receptores (renina) vs up-regulation |
| 8 | b01 | R | c→c | 0.41→0.48 | El metabolismo de los β-bloqueantes liposolubles depende principalment… | b | esterasas = esmolol; liposolubles = CYP |
| 16 | b01 | C | b→b | 1.72→1.0 | Un paciente con feocromocitoma va a ser operado. El equipo indica prim… | a | la latencia explica cuándo empezar, no el orden α→β |
| 17 | b01 | C | c→c | 1.77→0.87 | Una mujer diabética tipo 1 con hipertensión recibe propranolol. ¿Cuál … | b | síntomas enmascarados y recuperación lenta (no más hipoglucemias) |
| 18 | b01 | C | d→d | 1.89→1.14 | Paciente de 68 años con hiperplasia benigna de próstata sintomática y … | a | efecto sobre la presión en el normotenso (uroselectividad α₁A) |
| 19 | b01 | C | a→a | 1.52→0.97 | Respecto a la eliminación de la noradrenalina liberada en la hendidura… | b | recaptación (50–80 %) frente a COMT secundaria |
| 21 | b01 | C | d→d | 2.3→1.0 | Se destruye quirúrgicamente la inervación simpática de un territorio v… | c | pérdida de respuesta (taquifilaxia) vs aumento (denervación) |
| 24 | b01 | R | a→a | 1.92→1.04 | Clasificá los antagonistas α adrenérgicos y señalá la opción que da el… | b | yohimbina = antagonista α₂, no α₁-selectivo |
| 25 | b01 | R | c→c | 1.84→1.09 | ¿Cuál es la diferencia funcional entre el receptor α₁ y el receptor α₂… | a | ubicación pre/postsináptica (papeles invertidos) |
| 38 | b02 | C | b→b | 2.58→0.93 | Paciente de 72 años con hipertensión, filtrado glomerular de 24 mL/min… | c | bloqueo secuencial vs. filtrado < 30 mL/min (la tiazida no llega) |
| 39 | b02 | C | c→c | 2.52→1.2 | Varón de 58 años en tratamiento con espironolactona por insuficiencia … | b | amilorida bloquea ENaC: no es antagonista del receptor mineralocorticoide |
| 40 | b02 | C | d→d | 1.45→0.9 | ¿Por qué el efecto antihipertensivo de una tiazida se mantiene a los s… | a | volumen normalizado vs resistencia periférica reducida |
| 41 | b02 | C | a→a | 3.31→0.9 | Un paciente hipertenso con antecedente de gota y diabetes tipo 2 viene… | c | hipercalcemia de la tiazida (cierta pero no es la preocupación aquí) |
| 43 | b02 | R | a→a | 1.68→1.03 | Un hipertenso recibe hidroclorotiazida, losartán y espironolactona. ¿C… | b | cuántos fármacos retienen K⁺ (2 de 3) frente a «la tiazida manda» |
| 44 | b03 | R | d→d | 1.49→0.92 | Un paciente de 50 años con hipertensión y disfunción ventricular izqui… | c | aliskireno sin evidencia vs ARA-II con evidencia en disfunción ventricular |
| 50 | b03 | R | a→a | 1.46→0.91 | Sobre el diazóxido, es correcto afirmar:… | b | canales de K⁺ (diazóxido) frente a óxido nítrico (nitroprusiato) |
| 59 | b03 | R | d→d | 2.79→1.11 | Un hipertenso de 70 años, fumador, con soplo abdominal, inicia enalapr… | c | arteriola eferente (angiotensina II) frente a aferente/bradicinina |
| 60 | b03 | C | d→d | 2.52→1.06 | Paciente hipertenso que inicia enalapril. A la semana, la creatinina s… | b | umbral ≈ 30 % (hemodinámico) frente a nefrotoxicidad |
| 61 | b03 | C | b→b | 0.69→0.99 | ¿Cuál de las siguientes afirmaciones sobre los ARA-II es incorrecta ?… | c | ARA-II sí interfieren con la aldosterona: la diferencia con el IECA es la bradicinina, no el potasio |
| 63 | b03 | C | b→b | 2.05→1.09 | Hipertenso con fibrilación auricular de respuesta rápida y estreñimien… | a | DHP (vaso) vs no-DHP (nodo AV) |
| 64 | b03 | C | d→d | 1.65→0.88 | Señale la afirmación correcta sobre la farmacocinética de los IECA:… | a | captopril y lisinopril son la excepción |
| 72 | b04 | C | d→d | 1.49→0.92 | Paciente que debe operarse en 48 horas y viene tomando AAS 100 mg desd… | b | irreversible (acetilación) frente a reversible; el efecto dura la vida de la plaqueta |
| 73 | b04 | C | c→c | 1.36→0.94 | Paciente con síndrome coronario agudo que no responde adecuadamente al… | b | enzima correcta (CYP2C19) y conducta basada en cambiar de fármaco |
| 76 | b04 | C | b→b | 1.88→0.82 | Paciente de 62 años con stent coronario colocado hace un mes, en doble… | d | hemoglobina estable (descarta anemia) |
| 78 | b05 | R | d→d | 1.94→0.93 | ⏱️ El paciente continúa con dolor y ya han transcurrido 7 minutos desd… | b | antihipertensivo no es antianginoso; nifedipino SL proscrito en SCA |
| 80 | b05 | R | a→a | 1.42→0.91 | 💀 Un hombre de 60 años con cardiopatía isquémica en tratamiento con di… | d | sildenafilo (impide degradar el GMPc) frente a «sobredosis» del nitrato |
| 81 | b05 | R | d→d | 1.63→1.09 | 🧊 Un paciente con angina de Prinzmetal es tratado con un calcioantagon… | b | β-bloqueantes contraindicados en el espasmo (α sin oposición) |
| 83 | b05 | R | c→c | 1.09→1.02 | 📈 Relacione correctamente el estadio de la cardiopatía isquémica con e… | a | T–ST–Q con los tiempos |
| 88 | b05 | C | b→b | 1.58→0.9 | ⏳ Paciente con angina estable que usa parche de nitroglicerina las 24 … | a | la tolerancia no se vence subiendo la dosis |
| 89 | b05 | C | c→c | 2.17→1.11 | 🧪 Paciente con angina estable y cirrosis hepática Child B que necesita… | b | ISDN depende del hígado (primer paso) frente a ISMN sin primer paso |
| 91 | b05 | C | a→a | 1.64→0.9 | 🚫 Paciente con angina vasoespástica documentada, hipertenso, que llega… | b | β-bloqueante = antianginoso de esfuerzo, pero contraindicado en el espasmo |
| 92 | b05 | C | d→d | 1.94→1.04 | 💊 ¿Por qué la nitroglicerina se administra por vía sublingual y no en … | a | primer paso hepático, no degradación ácida |
| 93 | b05 | C | d→d | 2.87→1.15 | 🩸 ¿Qué explica el fenómeno de «robo coronario» producido por vasodilat… | b | vasodilatación del territorio sano (no vasoconstricción de la arteria enferma) |
| 104 | b07 | C | b→b | 2.86→1.05 | 📉 Paciente con artritis reumatoide que recibe prednisona 30 mg/día des… | a | cuadro addisoniano (hipotensión, hipoglucemia) frente a recaída de la artritis |
| 105 | b07 | C | d→d | 2.4→1.03 | 🕗 ¿Por qué se recomienda administrar el corticoide en dosis única por … | c | t½ biológica frente a t½ plasmática |
| 107 | b07 | C | a→a | 2.35→1.13 | 💊 Paciente en tratamiento con prednisona que inicia rifampicina por tu… | b | inductor (rifampicina) frente a inhibidor |
| 108 | b07 | C | d→d | 1.05→1.09 | 🧬 Aunque el cortisol circula en concentraciones mucho mayores que la a… | c | 11β-HSD2 (cortisol→cortisona) frente a HSD1 (inversa) |
| 109 | b07 | C | c→c | 2.11→1.06 | 🫁 Paciente con asma que usa corticoide inhalado a dosis media. Le preo… | d | biodisponibilidad 1–13 %: enjuagar previene la candidiasis, no el efecto sistémico |
| 112 | b06 | R | c→c | 2.23→1.07 | 💊 Algunos AINE, en dosis bajas, actúan como antiagregantes plaquetario… | a | COX-1 plaquetaria (irreversible) frente a COX-2 endotelial |
| 115 | b06 | C | c→c | 3.65→0.96 | 💧 Paciente de 78 años con insuficiencia cardíaca, en tratamiento con e… | d | mecanismo hemodinámico de la triple asociación frente a nefrotoxicidad directa |
| 116 | b06 | C | b→b | 2.81→1.26 | 🫁 Paciente asmática con poliposis nasal que, tras tomar ibuprofeno, pr… | a | reacción farmacológica (no IgE) por desvío hacia la 5-LOX |
| 117 | b06 | C | a→a | 2.7→1.04 | 🫀 ¿Por qué los coxibs (inhibidores selectivos de COX-2) aumentan el ri… | b | COX-2 → prostaciclina; el tromboxano (COX-1) queda intacto |
| 118 | b06 | C | b→b | 2.51→1.05 | 🧊 ¿Cuál de estas afirmaciones sobre el paracetamol es correcta ?… | c | antiagregante = AAS, no paracetamol |
| 119 | b06 | C | d→d | 2.22→1.07 | 🍼 Un recién nacido prematuro presenta ductus arterioso persistente. ¿Q… | a | roles invertidos de PGE₁ y AINE |
| 122 | b08 | R | d→d | 1.97→1.11 | 🚫 ¿Por qué los β₂-agonistas de acción prolongada (LABA) nunca deben ut… | a | taquifilaxia gradual frente a falta de efecto antiinflamatorio |
| 124 | b08 | R | c→c | 0.67→1.05 | ☕ Sobre los mecanismos de acción de la teofilina, señale la INCORRECTA… | b | la teofilina no es agonista adrenérgico |
| 125 | b08 | R | a→a | 2.58→1.18 | 🧲 Sobre el cromoglicato disódico y el nedocromilo, es correcto afirmar… | c | profilaxis frente a broncodilatación inmediata |
| 128 | b08 | C | a→a | 2.02→1.0 | 🫁 Adolescente con asma persistente moderada que usa salmeterol solo, s… | b | falta de corticoide (no de dosis de LABA) |
| 129 | b08 | C | c→c | 3.76→1.08 | ⚠️ Paciente en crisis asmática que recibe salbutamol nebulizado repeti… | b | el enunciado solo menciona salbutamol (no teofilina) |
| 130 | b08 | C | c→c | 1.55→0.95 | ☕ ¿Cuál es la conducta correcta para reducir los efectos adversos inic… | a | titulación gradual frente a dosis plena |
| 131 | b08 | C | b→b | 1.65→0.9 | 🔗 Paciente asmática con rinitis alérgica e intolerancia a los AINE. ¿Q… | c | intolerancia a AINE → desvío a 5-LOX → leucotrienos |
| 134 | b09 | P | d→d | 2.01→1.01 | 🔋 Respecto del mecanismo de acción de los inhibidores de la bomba de p… | a | covalente e irreversible (bomba) frente a competitivo y reversible (receptor H₂) |
| 135 | b09 | R | b→b | 1.91→0.93 | ⏰ ¿Por qué los inhibidores de la bomba de protones deben administrarse… | c | número de bombas activas, no la estabilidad del fármaco |
| 136 | b09 | R | a→a | 2.74→1.28 | 🧪 El síndrome de Zollinger-Ellison se caracteriza por:… | b | hipergastrinemia con hiperacidez (tumor) frente a aclorhidria |
| 138 | b09 | R | a→a | 0.64→1.02 | 🧊 Respecto de los antihistamínicos H₂, señale la INCORRECTA :… | b | potencia menor que el IBP aunque suprima ≈ 70 % |
| 139 | b09 | C | b→b | 2.03→1.13 | 🩸 Paciente con stent coronario en doble antiagregación (AAS + clopidog… | a | omeprazol inhibe CYP2C19 (activación del clopidogrel) |
| 140 | b09 | C | c→c | 2.47→0.88 | 🧱 Paciente con úlcera gástrica al que se indica sucralfato y omeprazol… | a | el sucralfato requiere pH ácido (el IBP lo elimina) |
| 142 | b09 | C | a→a | 1.94→1.14 | ⚗️ Paciente que recibe un esquema cuádruple de erradicación y consulta… | b | ausencia de dolor, mareo e hipotensión |
| 143 | b09 | C | d→d | 2.98→1.12 | 🧊 Anciano de 84 años con insuficiencia renal que recibe cimetidina y p… | a | tratar el síntoma (antipsicótico) frente a cambiar el fármaco causante |
| 145 | b10 | R | b→b | 3.33→1.16 | 💊 ¿Puede la amiodarona producir hipotiroidismo? Señale la opción que m… | a | la amiodarona puede producir hipo e hipertiroidismo |
| 146 | b10 | R | d→d | 2.33→1.05 | 🔬 Mujer de 42 años con fatiga, ganancia de peso y piel seca. TSH 12,8 … | b | T4 libre baja = hipotiroidismo franco (no subclínico) |
| 147 | b10 | R | b→b | 5.3→1.06 | 💊 ¿Por qué no se usa la liotironina (LT3) como fármaco de elección en … | d | la T3 es la hormona activa: el problema es farmacocinético |
| 150 | b10 | C | c→c | 4.0→1.11 | 🚫 Mujer de 48 años con TSH 15,3 pese a levotiroxina 100 µg/d desde hac… | a | el problema es la absorción, no la dosis |
| 151 | b10 | C | d→d | 2.24→0.98 | ⚖️ Hombre de 29 años, IMC 27, sin síntomas, que consulta por dificulta… | a | criterios de tratamiento del subclínico (TSH > 10, anti-TPO +, síntomas…) |
| 152 | b10 | C | a→a | 1.55→0.94 | 🩺 Hombre de 74 años con cardiopatía isquémica y TSH 22 mUI/L, T4L 0,4 … | b | coronariópata: inicio con dosis baja (consumo de O₂) |
| 153 | b10 | C | b→b | 3.53→1.18 | 🔬 Paciente con T4 libre baja y TSH de 1,2 mUI/L (rango normal). ¿Qué s… | a | TSH normal con T4 libre baja (no elevada) |
| 154 | b10 | C | b→b | 1.56→1.07 | 🛡️ ¿Cuál anticuerpo es el marcador con mayor rendimiento para la tiroi… | a | TRAb = Graves; anti-TPO = Hashimoto |
| 157 | b11 | R | d→d | 3.55→1.43 | 🔀 ¿Cuál es la diferencia entre tirotoxicosis e hipertiroidismo?… | b | la tirotoxicosis es el término amplio (efecto tisular); el hipertiroidismo, un subtipo |
| 158 | b11 | R | b→b | 2.15→1.15 | ⚠️ Paciente en tratamiento con metimazol que presenta fiebre y dolor d… | a | fiebre + odinofagia = agranulocitosis hasta demostrar lo contrario |
| 160 | b11 | R | d→d | 2.47→1.02 | 🔬 ¿Cómo se realiza el seguimiento de un paciente que inicia metimazol?… | a | la TSH tarda en recuperarse tras supresión prolongada |
| 161 | b11 | R | a→a | 2.26→1.14 | 👁️ ¿Cuáles son las tres manifestaciones principales de la enfermedad d… | b | bocio difuso (Graves) frente a nodular |
| 162 | b11 | C | a→a | 2.5→1.09 | 🤰 Embarazada de 9 semanas con enfermedad de Graves recién diagnosticad… | b | teratogenicidad del metimazol en el 1.er trimestre |
| 163 | b11 | C | d→d | 2.42→1.22 | ☢️ Paciente con Graves, bocio pequeño y oftalmopatía moderada a grave … | a | oftalmopatía moderada-grave contraindica el radioyodo |
| 164 | b11 | C | b→b | 3.62→1.28 | ⏳ Paciente con Graves que completó 18 meses de metimazol con TSH, T4L … | a | prolongar > 18 meses no aumenta la remisión |
| 167 | b12 | R | b→b | 2.08→1.22 | ⭐ Respecto de la metformina, señale la afirmación correcta :… | a | secretagogo (SUR1) frente a antihiperglucemiante |
| 168 | b12 | R | a→a | 2.36→1.26 | ⚗️ ¿Cuál es el mecanismo por el que la metformina puede producir acido… | c | la gluconeogénesis consume lactato: frenarla lo acumula |
| 169 | b12 | P | d→d | 3.43→1.33 | 🔑 El mecanismo de acción de las sulfonilureas consiste en:… | b | canal de K⁺-ATP (SUR1) frente a DPP-4 |
| 175 | b12 | C | d→d | 2.93→1.33 | ⏱️ ¿Cuál es la diferencia farmacológica fundamental entre las glinidas… | b | ambas actúan sobre SUR1 de la célula β; difieren en dependencia de glucosa y duración |
| 176 | b12 | C | c→c | 1.45→1.13 | 🧬 Paciente con DM2 e insuficiencia cardíaca clase II. ¿Qué grupo debe … | d | metformina está contraindicada en ICC grave pero por acidosis láctica, no por el peso |
| 177 | b12 | C | b→b | 3.2→1.21 | 🍬 Paciente que toma acarbosa y glibenclamida presenta hipoglucemia sin… | a | la acarbosa bloquea la enzima que desdobla la sacarosa |
| 178 | b12 | C | a→a | 2.65→1.01 | 🔗 Un paciente en tratamiento con glibenclamida inicia hidroclorotiazid… | b | tiazida sube la glucemia (no baja); el desplazamiento proteico es de salicilatos |
| 180 | b12 | C | b→b | 1.62→1.02 | 🧪 Un paciente con DM2 inicia acarbosa. A las dos semanas consulta por … | d | fermentación colónica (acarbosa) frente a mecanismo de los análogos de GLP-1 |
| 183 | b13 | R | c→c | 1.6→0.95 | 🕐 ¿A qué se debe la duración intermedia de la insulina NPH?… | a | albúmina = detemir; microcristales/pH = glargina; protamina = NPH |
| 184 | b13 | R | d→d | 1.83→1.17 | 🌙 Respecto de la insulina glargina, señale la correcta :… | a | glargina sin pico y de comienzo más lento (NPH tiene pico) |
| 187 | b13 | R | b→b | 4.51→1.27 | 📋 Señale el conjunto que corresponde a los criterios de insulinización… | c | el fracaso de orales es solo uno de los criterios |
| 188 | b13 | C | b→c | 3.49→1.03 | ⏱️ Paciente que a veces no sabe cuánto va a comer y prefiere inyectars… | a | regular exige anticipación; aspart permite aplicarla después (transposición b↔c por auditoría de letras) |
| 189 | b13 | C | d→d | 3.7→1.27 | ⬆️ Paciente con DM2 y glargina 46 UI/día (0,6 UI/kg). Glucemia en ayun… | a | ayuno en meta + hipoglucemias nocturnas = no subir la basal |
| 190 | b13 | C | a→a | 2.72→0.89 | 💉 Paciente que se inyecta insulina siempre en el mismo punto del abdom… | c | zona endurecida sin signos de infección = lipohipertrofia |
| 192 | b13 | C | b→d | 1.73→0.99 | 🍬 Paciente consciente con hipoglucemia por insulina y glucemia capilar… | a | glucagón solo si no puede tragar (transposición b↔d por auditoría de letras) |
| 193 | b13 | C | b→b | 1.44→1.13 | 💉 ¿Por qué la insulina glargina no debe mezclarse en la misma jeringa … | a | precipitación por pH ácido (no inactivación por zinc) |
| 195 | b14 | R | a→a | 1.13→1.23 | 📊 Los antiarrítmicos de clase IA (quinidina, procainamida, disopiramid… | b | IA bloquea Na⁺ y K⁺ |
| 196 | b14 | R | c→c | 0.72→0.87 | 🅱️ Los antiarrítmicos de la clase IB (por ejemplo, lidocaína):… | b | clase IB acorta el QT (IA y III lo alargan) |
| 204 | b14 | R | d→d | 1.71→1.26 | 🧊 ¿Cuál es la contraindicación principal del verapamilo?… | c | RAM característica frente a contraindicación |
| 208 | b14 | C | c→c | 2.34→1.16 | ❤️‍🩹 Paciente de 62 años con infarto de miocardio hace 4 meses, fracci… | d | la clase IC ensancha el QRS y no alarga el QT |
| 209 | b14 | C | d→d | 1.72→0.9 | 🍌 Paciente con insuficiencia cardíaca en tratamiento con digoxina y fu… | a | síntomas + K⁺ 2,9 = toxicidad (no efecto terapéutico) |
| 210 | b14 | C | c→c | 1.72→0.85 | 🧠 Paciente con taquicardia ventricular en el contexto de un infarto ag… | d | la clase IB acorta el QT (no hay torsade) |
| 211 | b14 | C | a→a | 2.24→1.01 | 💓 Paciente que recibe quinidina desarrolla una taquicardia ventricular… | b | taquicardia ventricular polimorfa (cinta retorcida) con QT largo |

## 7 · Limitações

* Proveniência por 3-gramas é heurística; sem acesso ao PDF escaneado «Belem.pdf», parte do rótulo «Basada en preguntas de examen» não pôde ser reconferida contra a imagem.
* O perfil de prova (§2) descreve **formatos e estilo de enunciado**; não infere frequência temática.
* Não rodei a suíte de navegador sobre o quiz (reveal/shuffle) nesta etapa; a verificação foi **textual/estrutural** (HTML, 214 pares, letras, SUB_SEL). Ver relatório final.

## 8 · Annotation-safety aplicada nas questões

A tinta/âncoras usam `secção>índice` sobre `p,li,h2–h5,table,figure,blockquote` (rm-tools-v2.js). Por isso: **nenhum** elemento deste conjunto foi criado, removido ou reordenado (sequência por seção idêntica à de `origin/main`; 44 ids idênticos e na mesma ordem); só o texto interno de `li`, do parágrafo `<strong>` e de «Las otras». Destaques usam `block_id + exact_text/prefix/suffix`: textos reescritos podem perder o ancoramento exato (esperado e inevitável em qualquer correção de texto) — não foi tocado `data-rm-content-rev`.
