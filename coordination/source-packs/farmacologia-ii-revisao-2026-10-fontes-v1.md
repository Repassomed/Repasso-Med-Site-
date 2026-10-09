# Farmacología II · revisão completa · ETAPA 1 — Fontes (matriz)

Tarefa: `farmacologia-ii-revisao-completa-2026-10` (issue #67) · Agente: Claude 2 · branch `claude/farmacologia-ii-revisao-completa`
Alvo: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html` (reservado; **não** toca `biologia.html`, #471, nem CSS/JS global).

Este documento é **interno** (rastreabilidade). Nada daqui é exposto ao aluno.

## 0 · Como foi feita a conferência

Presença de palavra-chave **não** foi aceita como prova. Para cada afirmação das anotações li o parágrafo/linha do bloco correspondente (texto extraído de `farmacologia-ii.html`, sem espelhos do banco) e conferi **o que ensina**, não só se a palavra aparece. Quando a anotação diverge do slide da cátedra ou da ciência, vale: **ciência/literatura-base → slide da cátedra → anotação** (Lei de Atualização Contínua; anotação = complemento, nunca fonte soberana).

Códigos de decisão:

| código | significado |
|---|---|
| **YA** | já ensinado no site (conferido no parágrafo, não só na palavra) |
| **INC** | incorporado agora (lacuna real, verificada cientificamente, com destino definido) |
| **DUP** | duplicado dentro das anotações (ex.: *Resumo P1* repete os outros sete PDFs) |
| **ERR** | a anotação está cientificamente errada/ambígua → **não** incorporada; o site já está correto ou fica registrada a divergência |
| **NV** | não verificável com o material disponível (ou sem valor avaliativo) → não incorporada |

### Fontes lidas (8 anotações do aluno, OneNote → PDF, pasta *Anotações de Farmacologia II*)

| # | arquivo | págs. | conteúdo |
|---|---|---|---|
| A1 | `SRAA.pdf` | 2 | IECA · ARA-II · aliskiren |
| A2 | `antihipertensivos.pdf` | 1 | fisiopatologia da HTA e mapa de famílias |
| A3 | `Diureticos.pdf` | 2 | tiazídicos · asa · ahorradores de K⁺ |
| A4 | `Beta bloqueador.pdf` | 3 | α-bloqueantes · β-bloqueantes · ergóticos |
| A5 | `Calcioantagonista.pdf` | 2 | canal L · DHP vs não-DHP |
| A6 | `antiinflamatorio corticoide.pdf` | 1 | eixo suprarrenal · classificação · RAM |
| A7 | `Antiangionoso.pdf` | 3 | angina · SCA · nitratos · β · CCB |
| A8 | `Resumo P1 farmaco.pdf` | 9 | **compilação** de A1–A5 e A7 + bloco “Solo lo que cae en examen” (30 pontos) |

Fontes de arbitragem (cátedra, Drive *Slides atuais*): `01 antihipertensivos 2026-2`, `03 antianginosos`, `04 Antiagregantes`, `Antiinflamatorios esteroideos 2025`, `Fármaco II a y b bloq 2026` (todas Dra. Verónica Vega, Farmacología II, UCP — Goodman & Gilman 13.ª ed.).
Provas (para a etapa 2; aqui só para arbitrar): `Provas Fármaco II - Belem completo .pdf` (**legível**, 49 mil caracteres), `GABARITO P1 FARMACOLOGIA FILA 1`, `Prova de Farmacologia – Revisão (Belén, Turma D, Fila 2)`.
**Limitação declarada:** `Provas Fármaco II - Belem.pdf` (a versão de 6,5 MB sem OCR) devolve texto vazio; o conteúdo equivalente foi lido na versão “completo” — *não* foi possível comparar página a página as duas versões.

Observação de comportamento das anotações: o aluno marcou “(tema de examen)” em ~35 pontos e deixou 4 dúvidas explícitas (“¿qué es ENaC?”, “¿Isso ta certo?”, “Não entendi direito” no feocromocitoma e no 11β-HSD). As dúvidas são lacunas didáticas reais e entram na etapa 3.

---

## 1 · Matriz fonte/página → conceito → trecho atual → decisão → destino

Notação do “trecho atual”: `bNN` = bloco `f2bNN` do HTML (o parágrafo citado entre aspas é a âncora de busca).

### A1 `SRAA.pdf` (A8 págs. 1–2 repetem)

| pág. | conceito da anotação | trecho atual no site | decisão | verificação / destino |
|---|---|---|---|---|
| 1 | Tratamento anti-HTA: curto vs longo prazo; mono vs combinada | b02 §5 “Efecto a corto plazo… largo plazo… Monoterapia frente a terapia combinada” | **YA** | idêntico ao slide 01 |
| 1 | 5 famílias; antagonistas do SRAA = IECA/ARA-II/inib. renina | b02 §4 “El mapa completo…” (f2-rama 1–5) | **YA** | — |
| 1 | Sufixo -pril; captopril, enalapril, lisinopril | b03 §6 f2-drug-h “…sufijo -pril” | **YA** | — |
| 1 | Ang II: vasoconstrição, aldosterona, ADH, simpático, remodelado | b03 §5.1 “Efectos deletéreos de la angiotensina II” (6 efeitos + endotelina, PAI-1) | **YA** | mais completo que a nota |
| 1 | ECA degrada bradicinina | b03 §5 (tooltip ECA) e §6 “Bradicininas” | **YA** | — |
| 1 | IECA: ↓AngII + ↑bradicinina → vasodilatação; ↓aldosterona → ↓volemia | b03 cadeia causal “La cadena causal completa de un IECA” | **YA** | — |
| 1–2 | “Acumulación de bradicinina = aumento de K (hiperkalemia) = tos seca y angioedema” | b03 tabela 6.5 (tos/angioedema ← bradicininas; hiperpotasemia ← **inhibición da aldosterona**) | **ERR** | A nota funde dois mecanismos: bradicinina → tos/angioedema; hiper-K⁺ vem de ↓aldosterona. O site está correto; **não** incorporar a versão da nota. |
| 2 | Hiponatremia como RAM do IECA | ausente na tabela 6.5 | **INC** | Slide 01 (guiamed) lista hiponatremia; verificada (IECA em IC/diurético). → b03 tabela 6.5, linha “Brote cutáneo, disgeusia, leucopenia” + “hiponatremia (sobre todo en IC o con diurético)” |
| 2 | Hipotensão | b03 6.5 | **YA** | — |
| 2 | Contraindicação: estenose da artéria renal | b03 6.5 (“Crítico en estenosis bilateral…”) e “las tres contraindicaciones absolutas” | **YA** | a nota diz “estenosis” sem “bilateral”: o site é mais exato |
| 2 | ARA-II: sufixo -sartán; losartán, valsartán, candesartán, “termilsartan” | b03 §7 | **YA** | “termilsartan” = telmisartán (grafia da nota) |
| 2 | ARA-II: bloqueo AT1, “no hay degradación de bradicinina” | b03 §7 “Desventaja teórica…” | **YA** | — |
| 2 | Inibidor de renina: aliskiren “pierde todo el SRAA” | b03 §8 | **YA** | o site acrescenta limitação (sem benefício em mortalidade) |

### A2 `antihipertensivos.pdf`

| pág. | conceito | trecho atual | decisão | nota |
|---|---|---|---|---|
| 1 | “Aumento do GC e RVP” e quatro determinantes (VS, FC, tensão, diâmetro) | b02 §2 “El gasto cardíaco…” e “La resistencia vascular periférica…” | **YA** | — |
| 1 | Reduzir ingestão de sódio (pergunta de exame) | b02 §5 “sodio < 2 g/día…” + tiazídicos “limitar el consumo de sodio” | **YA** | — |
| 1 | β1→GC; α1→RVP | b03 §2 (tooltips α₁, β₁, α₂) | **YA** | — |
| 1 | Inibição do SRAA e diuréticos = 1.ª linha; simpaticolíticos = 2.ª | b02 §5 (4 fármacos de 1.ª linha: IECA, ARA-II, DHP, tiazida-like); b03 §12 (“β-bloqueantes… solo en estos casos son de primera línea”) | **YA** | consistente com ACC/AHA 2025 do slide |
| 1 | Aliskiren “no se utiliza mucho” | b03 §8 | **YA** | — |
| 1 | “Vasos de resistência/capacitância/coração/rim” | b02 §3 “Los cuatro sitios” | **YA** | — |
| 1 | 5 tipos de anti-HTA (“Simpaticolíticos (alfa y beta bloqueantes y agonista ?)”) | b02 §4 | **YA** | a interrogação da nota (“agonista ?”) = agonistas α₂ centrais → ensinado em b03 §2.2 |

### A3 `Diureticos.pdf` (A8 págs. 2–3 repetem)

| pág. | conceito | trecho atual | decisão | verificação / destino |
|---|---|---|---|---|
| 1 | Tiazídicos: sulfonamidas; TCD; “absorção de 5 % do sódio”; menos potentes; ineficazes com TFG < 40 | b02 §9 (f2-row Origen/Mecanismo/Límite) e tabela nefrona (≈ 5 %) | **YA** | — |
| 1 | Clortalidona (melhor evidência) vs HCTZ (a mais usada) | b02 §9 parágrafos “la que más se utiliza…” | **YA** | — |
| 1 | Mecanismo: simporte Na/Cl; curto prazo renal, longo prazo vascular; inibição fraca de AC | b02 §7 e §9 (f2-row Mecanismo corto/largo plazo) | **YA** | — |
| 1 | Compensação: SRAA + ↑RVP → vasodilatação mantida | b02 §7 (6–8 semanas) | **YA** | — |
| 1 | Tiazida → hipercalcemia (“tema de examen”) e o **porquê** (“abre otro transportador, el Na/Ca…”) | b02 f2-row “Calcio — Aumentan la reabsorción…” e linha da tabela RAM: só *diz* que reabsorve, **não explica** o mecanismo | **INC** | Verificado (Goodman&Gilman cap. 25): ↓Na⁺ intracelular no TCD aumenta a força motriz do trocador basolateral Na⁺/Ca²⁺ e a hiperpolarização favorece a entrada apical de Ca²⁺ (TRPV5); a contração de volume soma reabsorção proximal. A nota simplifica (“abre outro transportador”) — reescrever corretamente. → b02 §9 (f2-row Calcio) + 1 linha na tabela |
| 1 | RAM tiazídicos: hipoNa, metabólicos, hiperuricemia/gota, hipoK, hiperCa, alcalose metabólica | b02 §9 tabela “Reacciones adversas de las tiazidas” | **YA** | tabela com mecanismo por linha |
| 1 | Interações: AINE, glicocorticoides, lítio, digoxina | b02 §9 parágrafo de interações | **YA** | — |
| 1 | Dose 2,5–25 mg; baixo custo; mono/combinada; idosos (renina baixa); limitar Na | b02 §9 | **YA** | — |
| 1 | Diuréticos de alça: “65–70 % de absorção de Na e H₂O” | b02 tabela nefrona: TAL ≈ 25 %; proximal ≈ 65 % | **ERR** | 65–70 % é o **túbulo proximal**; a TAL reabsorve ≈ 25 % (a própria nota diz 25 % logo depois). Site correto. Não incorporar. |
| 1 | Alça: potentes mas não 1.ª linha (VM curta); “límite alto”; NKCC2 | b02 §8 | **YA** | — |
| 1 | Furosemida (VO/EV), torsemida (VO) | b02 §8 f2-row Prototipo | **YA** | “torasemida” no site |
| 1 | Usos: crises HTA, EAP, IC, cirrose, DRC < 30, HTA resistente | b02 §8 f2-row Usos; b03 §11 (crise HTA) | **YA** | — |
| 1–2 | Alça: ↓Ca²⁺ e Mg²⁺; furosemida AC fraca; ↑K⁺ e ác. úrico (agudo), cai com uso crônico | b02 §8 cadeia causal + parágrafo ác. úrico bifásico | **YA** | — |
| 2 | RAM alça: hiperuricemia, hiperglicemia, ↑LDL/TG, ↓HDL | b02 §8 | **YA** | — |
| 2 | Ahorradores de K⁺: túbulo coletor; “Disminución de Ca, K, Cl y Mg (tema de examen)” | b02 §10 (K⁺ retido) — **não** diz Mg²⁺ nem Ca²⁺/Cl⁻ | **INC (parcial)** | Verificado: poupadores de K⁺ **reduzem a excreção de K⁺ e Mg²⁺** (a outra face da hipoMg de alça/tiazida). “Ca²⁺ e Cl⁻” da nota **não** se sustenta de forma geral (só amilorida reduz calciúria, de forma modesta) → incorporar apenas K⁺ e Mg²⁺, com a ressalva. → b02 §10, 1 frase |
| 2 | Espironolactona/eplerenona (MR); HCTZ + espironolactona → hiperK; ginecomastia (andrógenos) | b02 §10 | **YA** | a nota associa eplerenona a “hiperkalemia” (sem sentido de diferenciação): o site diferencia por seletividade — correto |
| 2 | Amilorida/triantereno: ENaC; usados em hipoK / IC | b02 §10 | **YA** | — |

### A4 `Beta bloqueador.pdf` (A8 págs. 3–5 e 7–9 repetem) — α e β

| pág. | conceito | trecho atual | decisão | verificação / destino |
|---|---|---|---|---|
| 1 | Mecanismos: bloqueio α/β e manipulação da terminação noradrenérgica | b03 §2 (parágrafo “Conforme el material… dos mecanismos fundamentales”) | **YA** | — |
| 1 | Localização α1 (vasos, olho, trato GU α1A, GI, coração) | b01 §6.2 “Efectos por territorio” | **YA** | — |
| 1 | Consequências CV do α1 (arteríolas ↓pós-carga/PA; veias ↓pré-carga) | b01 §6.1 + enunciado “territorio arteriolar / venoso” | **YA** | inclui a armadilha de enunciado |
| 1 | Taquicardia reflexa: cadeia barorreceptor → β1 → SRAA | b01 §6.1 + caption “seguí los cinco pasos” | **YA** | — |
| 1 | Não-CV: trígono/esfíncter (HBP); congestão nasal | b01 §6.2 | **YA** | — |
| 1 | “Bloqueantes α1a: ↑HDL ↓LDL” | b01 prazosina f2-row “Perfil metabólico favorable: ↓ LDL y triglicéridos, ↑ HDL” | **YA** | a nota atribui só a α1A (uroseletivos); a literatura vale para α1 vasculares (doxazosina/prazosina). Site correto; sem mudança. |
| 1 | Prazosina: seletiva, potente, 1.ª dose, 8/8 h (nota: “2–3/dia”) | b01 §6.3 | **YA** | — |
| 1 | Doxazosina/terazosina: latência maior, 1×/dia; alfuzosina α1A; tamsulosina/silodosina | b01 §6.3 + tabela “¿Vascular o urológico?” | **YA** | — |
| 1 | Fentolamina α1+α2, taquicardia, “generalmente no se utiliza” | b01 §6.3 + 6.1 “prazosina vs fentolamina” | **YA** | — |
| 1 | Aplicações: HTA, HBP, feocromocitoma, migraña | b01 §6.5 lista de usos | **YA** | “ataque agudo de migraña” é de ergóticos (A4 pág. 3) — ver abaixo |
| 1 | α2 em pâncreas, terminais pré-sinápticos e **plaquetas** (“só adrenalina”) | α2 pré-sináptico sim; plaquetas/pâncreas não | **NV** | Sem valor avaliativo nem na cátedra nem nas provas lidas; não acrescenta raciocínio. Documentado, não incorporado. |
| 1 | β1: coração, fígado, adiposo, rins; β2: vasos, pulmão, pâncreas… | b01 §7 (“β₁ vive en el corazón y en el aparato yuxtaglomerular…; β₂ relaja…; β₃…”) | **YA** | localização de β1 “no fígado” da nota é inexata (fígado é predominantemente β2) |
| 1 | Efeitos do bloqueio: crono/ino/dromotropismo; renal β1 → ↓SRAA; β2 broncoconstrição; vasoconstrição | b01 §7.1 “Qué pasa exactamente cuando bloqueamos β” | **YA** | — |
| 1 | “Páncreas β2: **aumenta** secreción de insulina = hiperglucemia” | b01 §7.2 (efeitos metabólicos: ↑TG, hipoglicemia mascarada) | **ERR** | Incoerente: β2 estimula insulina; **bloquear β2 reduz** a secreção (tendência à hiperglicemia) e mascara hipoglicemia. Não incorporar a versão da nota. |
| 1 | “Tejido adiposo β3: aumenta HDL (lipólisis)” | b01 §7 (β₃ adiposo) + efeito lipídico: ↑TG ↓HDL | **ERR** | β3 → lipólise (↑ ácidos graxos livres); β-bloqueantes **pioram** TG/HDL. Não incorporar. |
| 1–2 | Não seletivos: 1.ª geração; propranolol (“bloquea B1”) | b01 §7.3 | **YA** | a nota escreve “B1” onde é β1+β2; o site diz β1+β2 (correto) |
| 2 | “Betabloqueantes **selectivos**: B1 y B2” | b01 §7.3 (“cardioselectivos… β₁”) | **ERR (rótulo)** | Erro de rótulo na nota (selecionado = β1). Site correto. |
| 2 | ISA: pindolol, acebutolol; efeito menos intenso em repouso | b01 §7.3 tooltip ASI + fila | **YA** | — |
| 2 | Mistos/3.ª geração: carvedilol, nebivolol, celiprolol, labetalol | b01 §7.3 + b03 §2.1 | **YA** | — |
| 2 | “Labetalol: **ÚNICO** usado durante el embarazo” | b03 resumo: “labetalol… de las crisis hipertensivas y del embarazo”; tabela de perfil lista α-metildopa e CCB também | **ERR (“único”)** | O site (e a própria A5 da aluna) lista labetalol, α-metildopa e nifedipino. Não incorporar “único”. |
| 2 | Retirada → rebote (up-regulation) | b01 §7.4 + §3 (denervação) | **YA** | — |
| 2 | CYP2D6 (e 3A4); hidrossolúveis (atenolol, nadolol, sotalol); esmolol; 1.º passo (propranolol/carvedilol) | b01 §7.3 f2-row + li | **YA** | — |
| 2 | Efeitos CV/brônquico/uterino/metabólico/renal | b01 §7.2 | **YA** | — |
| 2 | Classificação em 3 gerações “em relação ao receptor” | b01 §7.3 | **YA** | — |
| 2 | RAM: periféricos (bradicardia, BAV, IC); β2 (broncoconstrição, frio, claudicação, hipoglicemia) | b01 §7.4 | **YA** | — |
| 2–3 | Aplicações terapêuticas; varizes esofágicas; hipertireoidismo | b01 §7.5 | **YA** | — |
| 3 | Ergóticos: alcaloides do fungo; agonista/antagonista; carótida externa/interna; cafeína acelera absorção | b01 §8 (ergotamina) | **YA** | — |
| A8 p. 7–8 | “Fenómeno de rebote… hipersensibilidad por denervación” | b01 §3 + §7.4 | **YA** | — |
| A8 p. 7–8 | α: prazosina vs fentolamina (autofreno α2) | b01 §6.1 | **YA** | explicação detalhada |
| A8 p. 8 | “Bloqueo del beta: cronotropismo (**acelera** la frecuencia)…” (ponto 11) | b01 §7.1 (“…bradicardia, menor contractilidad, PR más largo y menos renina”) | **ERR** | Sinal invertido na nota (o item 13 da mesma página diz o oposto). Site correto. |
| A8 p. 8 | 3 gerações; abecedário A–M / N–Z | b01 §7.3 “Atenolol, Acebutolol, Betaxolol… → cardioselectivos. Nadolol, Pindolol…” | **YA** | — |
| A8 p. 8 | Armadilha labetalol vs celiprolol; nebivolol β1 | b01 f2-freq + p. “El error que más se repite” | **YA** | — |
| A8 p. 8 | Armadilha do ECG: β-bloqueante ↑ PR | b01 §7.1 “PR más largo” | **YA** | — |
| A8 p. 9 | Pt 68 a., HBP, normotenso → tamsulosina | b01 §8.1 Caso 1 | **YA** | — |
| A8 p. 9 | Feocromocitoma: α antes de β. **Dúvida do aluno:** “O bloqueio não causa a vasodilatação? Por que elimina a vasodilatação se bloqueamos primeiro o beta? Não entendi direito.” | b01 §6.5 e Caso 2: “se apaga la vasodilatación β₂… queda el α₁ sin oposición” (correto, mas **não resolve a confusão**: assume que o leitor sabe que *bloquear* quita o que o receptor faz) | **INC (didático)** | Lacuna de compreensão real. → b01 §6.5: 2–3 frases + mini-tabela “quién aprieta / quién afloja” (α1 aperta; β2 afloja; bloquear α1 = afloja; bloquear β2 = deja de aflojar) |
| A8 p. 9 | Paciente hipertenso asmático → celiprolol; nunca propranolol | b01 §8.1 Caso 3 | **YA** | — |

### A5 `Calcioantagonista.pdf` (A8 págs. 5 repete)

| pág. | conceito | trecho atual | decisão | verificação / destino |
|---|---|---|---|---|
| 1 | Mecanismo: contração depende de Ca²⁺; canal L; liberação do RS | b03 §3–4 | **YA** | — |
| 1 | “Vasoconstricción em el nódulo…” (sic) / anti-HTA, antiarrítmico, antianginoso | b03 §4.1 e §4.3 | **YA** | a palavra “vasoconstricción” na nota é *contração*; sem mudança |
| 1 | ↓resposta pressora α e ATII | b03 §4.1 (3 componentes) | **YA** | — |
| 1 | 3 grupos químicos | b03 §4.2 | **YA** | — |
| 1 | DHP: nifedipino, **lercanidipino**, amlodipino | b03 tabela 4.2: nifedipino, amlodipino, felodipino, nitrendipino, nisoldipino, nimodipino, isradipino, nicardipino | **INC (menor)** | lercanidipino é DHP real (3.ª geração, lipofílico). → b03 tabela 4.2, “Otros” (+ lercanidipino, lacidipino fora) |
| 1 | “No se asocian β-bloqueantes con no-DHP” (tema de examen) | b03 §4.3 caption e “lo esencial”; b05 comparativa | **YA** | — |
| 1 | Crono/dromo/inotropo; ativação simpática reflexa | b03 §4.2 | **YA** | — |
| 1 | Início rápido, ação curta vs longa, amlodipino, felodipino seletivo | b03 §4.2 li | **YA** | — |
| 1–2 | Diferenças DHP vs não-DHP; diltiazem menos inotropismo; ↓ pressão intraglomerular (não-DHP) | b03 §4.2 | **YA** | — |
| 2 | **HTA na gestação (tema de examen): NIFEDIPINA, labetalol, α-metildopa** | b03 §12 tabela “Embarazo: Calcioantagonistas · α-metildopa · β-bloqueantes (labetalol)”; b03 §2.2 α-metildopa | **INC (parcial)** | Verificado (ACOG/ESC): nifedipino **de liberação prolongada**, labetalol e α-metildopa = 1.ª linha. O site diz “calcioantagonistas” genérico. “(vida corta)” da nota não se sustenta como atributo útil (e a forma imediata é a que se evita em SCA). → b03 §12 linha “Embarazo”: “nifedipino de liberación prolongada” |
| 2 | RAM: bradiarritmias, cefaleia, tontura, palpitações, edema de pé | b03 §4.3 | **YA** | — |
| 2 | Indicações (6) | b03 §4.3 | **YA** | — |

### A6 `antiinflamatorio corticoide.pdf` (1 pág.)

| pág. | conceito | trecho atual | decisão | verificação / destino |
|---|---|---|---|---|
| 1 | Zonas: glomerulosa→aldosterona (MC, ↑Na/H₂O, ↓K, “ENAC (qué es enac)”); fasciculada→cortisol | b07 §1 (macete G-F-R) e §9 Mineralocorticoides | **YA** | — |
| 1 | **Dúvida do aluno: “ENaC?”** | ENaC explicado em b02 §10 (tooltip) mas **b07 não liga** MR→ENaC | **INC (didático)** | → b07 §9 f2-row Mecanismo: 1 frase “…en el colector, esa síntesis incluye el canal ENaC que ya vimos con los ahorradores” |
| 1 | Receptores MC limitados (rim, cólon, salivares); GC difusos (inclui SNC) | b07 §3 | **YA** | — |
| 1 | Indicação terapêutica: anti-inflamatório, imunossupressor, reposição | b07 §8 | **YA** | — |
| 1 | “Receptor que convierte la cortisona en cortisol: 11β-HSD (tema de examen)” — **dúvida: “¿Es solo para receptores mineralocorticoides?”** | b07 §3 só explica a **11β-HSD2** (cortisol→cortisona, protege o MR). Falta a **11β-HSD1** (cortisona→cortisol; ativa prednisona→prednisolona no fígado) | **INC** | Verificado. A pergunta da nota é, na verdade, sobre a HSD1 (a nota diz “receptor” onde é enzima). → b07 §3, `f2-lit`: HSD1 vs HSD2 + consequência prática (hepatopatia grave: prednisolona, não prednisona) |
| 1 | “Isso ta certo?” — cortisol→cortisona por 11β-HSD **renal** protege o MR | b07 §3 (“CORTISOL activo sobre el MR → 11β-HSD2 → CORTISONA”) | **YA — confirmado correto** | resposta à dúvida: sim (tipo 2) |
| 1 | Glicocorticoides com efeito MC → HTA (tema de examen) | b07 §4 tabela atividade MC, §7.2 Cushing (hipoK+HTA+peso+glicemia) | **YA** | — |
| 1 | Classificação: curta (hidrocortisona, cortisona), intermédia (prednisona, prednisolona, metilpred.), longa (dexa, beta), MC (fludrocortisona) | b07 §5 | **YA** | — |
| 1 | “Triancinolona, deflazacort e budesonida → muito usados em vias respiratórias” | b07 classifica triancinolona/deflazacort como intermediários; budesonida está em b08 (ICS) | **NV (parcial)** | Budesonida e triancinolona (acetonido) inalatórios: sim; deflazacort é oral sistêmico. Afirmação agrupada demais; sem valor avaliativo adicional. Sem mudança. |
| 1 | “Efeitos adversos” (↑glicose, lipólise/redistribuição, catabolismo, ↓imunidade, ↓massa muscular, ↓pele, ↓mineralização óssea) + “bloque fosfolipasa A2” | b07 §4–7 (completo, com mecanismo) | **YA** | “bloqueia PLA₂” é a formulação do slide; o site já a refina (anexina A1 → PLA₂) em b07 §3 caption |

### A7 `Antiangionoso.pdf` (3 págs.; A8 págs. 5–7 repetem)

| pág. | conceito | trecho atual | decisão | verificação / destino |
|---|---|---|---|---|
| 1 | Angina: etimologia, 70 % aterosclerose (slide: **60–70 %**) | b05 §1 (“60–70 %”) | **YA** | o site segue o slide; a nota arredonda |
| 1 | Fatores: perfusão coronária (gradiente, diástole, resistências) e MVO₂ (FC, contratilidade, tensão) | b05 §2 + slide da cátedra | **YA** | — |
| 1 | Fatores de risco do IAM (colesterol, tabaco, estresse oxidativo, DM, HTA, obesidade abdominal, sedentarismo) | só no caso clínico (“tabaquismo, dislipidemia, obesidad, HTA y DM2”) | **DUP/baixo valor** | O caso já mostra os fatores; lista solta não acrescenta raciocínio. Sem mudança. |
| 1 | Angina típica | b05 §3 | **YA** | inclui precisão sobre “> 20 min” (nota `rmc-note`) |
| 1 | Cardiopatia isquêmica: oferta/demanda | b05 §1–2 | **YA** | — |
| 1 | **SCA**: angina instável = isquemia **sem necrose**, maior risco de IAM; IAMSEST = necrose; IAMCEST = necrose + oclusão aguda | b05 §3.1: **apenas uma figura SVG** (“Angina inestable / Infarto no Q / Infarto Q”) — sem texto que *explique* o que separa as três | **INC** | Lacuna didática (a figura mostra o corte do ST; não diz o que é “inestable” vs “infarto”). **ERR da nota:** “IAM **sem** elevação ST — ECG: elevação persistente do segmento ST” é contraditório; correto: IAMSEST = ST sem elevação persistente, **com** necrose (troponina +). → b05 §3.1, parágrafo + mini-tabela (isquemia sem necrose / necrose sem ↑ST / necrose com ↑ST) |
| 1 | Tipos de angina (esforço, repouso, estável, instável, típica, atípica, dor não cardíaca, isquemia silenciosa) | b05 §3.1 f2-postit “Tipos de angina que enumera la cátedra” + comentário de mecanismos | **YA** | — |
| 1–2 | Isquemia < 20 min (T) / lesão > 20 min (ST) / necrose > 1 h (Q) | b05 §4 | **YA** | — |
| 2 | Caso clínico: AAS + O₂ + NTG SL ×3 → ambulância | b05 §5 (completo, com por que as outras opções falham) | **YA** | — |
| 2 | Nitratos: ésteres do ác. nitroso com polialcoóis; GTN profármaco → L-cisteína → ALDH2 → NO₂⁻ → NO → GCs → GMPc → ↓Ca²⁺ / desfosforila MLC | b05 §7.1 + figura | **YA** | — |
| 2 | Doses baixas/altas; metabolismo (GTN, ISDN, 5-ISMN 100 %) | b05 §7.2–7.3 | **YA** | — |
| 2 | RAM: cefaleia, tontura, hipotensão, **Bezold-Jarisch**, taquicardia reflexa, retirada, hipersensibilidade | b05 §7.4 | **YA** | inclui armadilha “bradicardia marcada = falso” |
| 2 | Contraindicações: sildenafil (GMPc), gestação 1.º tri, lactação, nitrodilatadores | b05 §7.5 | **YA** | — |
| 2 | Tolerância (24–48 h; espaçar 2–3×/dia) | b05 §7.6 | **YA** | — |
| 2 | Indicações dos nitratos: “Angina de reposo **e inestable**” | b05 §7.7: “Angina inestable: β-bloqueantes, morfina y antiplaquetarios” (slide) — **omite o nitrato**, que é padrão no dolor persistente da angina instável | **INC (complemento, `f2-lit`)** | Verificado (ACC/AHA SCA): nitroglicerina SL/IV para dor isquêmica contínua. Mantém a linha do slide e acrescenta o complemento. → b05 §7.7 |
| 2–3 | β-bloqueantes antianginosos: ↓FC/contractilidade/TA; antiarrítmico, antiapoptótico, antioxidante; contra absolutas/relativas; indicações; “ação mais importante no IAM = ↓mortalidade” | b05 §8 | **YA** | — |
| 3 | CCB não-DHP (verapamilo, diltiazem) antianginosos: ↓FC, contractilidade, pós-carga | b05 §9 | **YA** | — |
| 3 | **DHP:** “Nifedipino de ação curta… agrava isquemia/↑mortalidade em angina instável/IAM recente. **Amlodipino: menor risco de taquicardia reflexa e pode ser utilizado**” | b05 §9 painel “🚫 Dihidropiridinas · **nifedipino y amlodipino** — Conforme la cátedra: NO” + tabela “Amlodipino: *como toda dihidropiridina, aumenta la mortalidad en IAM reciente y angina inestable*” + `compare` “Neutro / DHP ↑ mortalidad”. **Contradição interna:** a mesma tabela dá ao amlodipino indicação em “angina vasoespástica; angina estável asociado a β-bloqueante”, e o flashcard fala em “DHP de **acción corta**” | **INC (correção científica)** | **Defeito do site, não da nota.** O sinal de mortalidade é do nifedipino de ação curta; amlodipino (ação longa, PRAISE) é neutro em mortalidade e aceito em angina crônica/vasospástica. O slide agrupa as DHP sob “NO”: **mantém-se a frase “conforme la cátedra” (o que se responde)** e acrescenta-se a precisão científica no estilo `rmc-note` já usado em b05 §3. → b05 §9 painel + tabela (linhas Nifedipino/Amlodipino) + coluna “Post-IAM” da comparativa |
| 3 | RAM CCB (Stevens-Johnson, edema periférico, BAV…) e contraindicações | b05 §9 | **YA** | — |

### A8 `Resumo P1 farmaco.pdf` (9 págs.)

| págs. | conteúdo | decisão |
|---|---|---|
| 1–2 | = A2 + A1 + A3 (parte) | **DUP** de A1/A2/A3 (mesmas linhas; já classificadas) |
| 3–4 | = A3 (parte) + A4 | **DUP** de A3/A4 |
| 5 | = A5 | **DUP** de A5 |
| 5–7 | = A7 | **DUP** de A7 |
| 7–9 | “**Solo lo que cae en examen**” — 30 pontos (rebote β, armadilhas α, fentolamina vs prazosina, feocromocitoma, abecedário β, etc.) | **material próprio**; cada ponto está classificado acima (bloco A4/A8): todos **YA** exceto os **ERR** (ponto 11) e a **dúvida do feocromocitoma** (INC didático). Pontos 19–23 (CYP, hidrossolúveis, esmolol, 1.º passo, PR): **YA** (b01 §7.3). |

---

## 2 · Lacunas e correções que entram na etapa 3 (resumo)

| id | destino | tipo | origem |
|---|---|---|---|
| E1 | b05 §9 (painel DHP), tabela Nifedipino/Amlodipino, coluna “Post-IAM” | **correção científica** (inconsistência interna) | A7 p. 3 + ciência (PRAISE; nifedipino SL) |
| E2 | b05 §3.1 | texto + mini-tabela que explica SCA (hoje só figura) | A7 p. 1 (e correção do ERR da nota) |
| E3 | b05 §7.7 | complemento: nitrato na angina instável | A7 p. 2 |
| E4 | b01 §6.5 | explicação α antes de β (dúvida do aluno) + mini-tabela “aperta/afrouxa” | A8 p. 9 |
| E5 | b02 §9 | mecanismo da hipercalcemia da tiazida | A3 p. 1 |
| E6 | b02 §10 | poupadores de K⁺ retêm K⁺ e Mg²⁺ | A3 p. 2 |
| E7 | b03 §6.5 | hiponatremia como RAM de IECA | A1 p. 2 + slide 01 |
| E8 | b03 §4.2 e §12 | lercanidipino; nifedipino LP na gestação | A5 p. 1–2 |
| E9 | b07 §3 | 11β-HSD1 vs HSD2 (prednisona = profármaco) | A6 p. 1 |
| E10 | b07 §9 | liga MR→ENaC (dúvida do aluno) | A6 p. 1 |

Itens adicionais surgirão da etapa 2 (provas): armadilhas de enunciado e conteúdos cobrados que o resumo ainda não ensina (Lei 8-A.2: *resumo ensina → questão cobra*).

## 3 · Erros das anotações que **não** foram incorporados (registro para José)

1. Hiper-K⁺ atribuída à bradicinina (A1 p. 1–2, A8 p. 2) — é ↓aldosterona.
2. Diuréticos de alça “65–70 % de absorção” (A3 p. 1, A8 p. 2) — é o proximal; TAL ≈ 25 %.
3. β2 pancreático “aumenta insulina” e β3 “aumenta HDL” (A4 p. 1, A8 p. 4).
4. “Selectivos: B1 y B2”; propranolol “bloquea B1” (rótulos) (A4 p. 2, A8 p. 4).
5. “Bloqueo del beta: acelera…” (A8 p. 8, ponto 11) — sinal invertido.
6. “Labetalol ÚNICO usado em gestação” (A4 p. 2, A8 p. 4).
7. IAMSEST com “elevação persistente do ST” (A7 p. 1, A8 p. 5).
8. Poupadores de K⁺ “↓ Ca²⁺ e Cl⁻” como regra (A3 p. 2) — só K⁺/Mg²⁺ se sustentam.

Nenhum desses é “culpa” do site; ele já estava correto. Ficam registrados porque o aluno estuda por essas anotações.

## 4 · Resultado da etapa 1 (números)

Contagem das 114 linhas de conceito das anotações (cada linha = um conceito conferido; o *Resumo P1* entra à parte):

| classificação | linhas |
|---|---|
| **YA** — já ensinado e conferido no parágrafo | 93 (82 %) |
| **INC** — lacuna real a incorporar na etapa 3 | 11 (E1–E10 + lercanidipino contado dentro de E8) |
| **ERR** — anotação errada, site correto (+1 erro embutido na linha de SCA) | 7 (+1) = 8 erros registrados na §3 |
| **NV / DUP-baixo valor** — sem mudança | 3 |
| *Resumo P1*: 4 blocos **DUP** (repete A1–A5, A7) + 1 bloco próprio (30 pontos “lo que cae”), todos já classificados acima | 5 |

Conclusão honesta: **a cobertura das anotações já é alta**. O valor desta etapa está em (a) **uma incoerência científica real do site** (E1: o painel de DHP em antianginosos), (b) lacunas de *mecanismo* (E2, E5, E6, E9) e (c) três **dúvidas explícitas do aluno** que o texto atual não resolve (feocromocitoma α→β, ENaC, 11β-HSD).
