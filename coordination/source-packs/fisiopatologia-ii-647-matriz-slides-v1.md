# Fisiopatología II · #647 / #642 · matriz de cobertura por slide (toda a matéria)

Data: 2026-11-06 · Base: `main` `7f329241` + PR #643 (branch `claude/charming-maxwell-ah7nxj-fisio2-642`, ainda não mesclada) · Esta PR é **empilhada** sobre a #643 (não a reescreve).
Fonte única: pasta «Slide atualizados» do Drive (`1R3DRkuH6cR0Hvu5KzlXQgh9DeSik7By4`), 14 arquivos, **nenhum modificado depois de 04/11**; textos lidos pelo conector do Drive em 06/11. Literatura-base só como citada nos slides (Porth 10.ª, Robbins, Farreras, Abbas); **não há texto de livro no Drive**. Nenhuma fonte externa. Supabase só em leitura.

## 1 · Método (reprodutível)
1. Ler o texto de cada deck. 2. Extrair os termos-chave de cada slide (nomes, valores, classificações, critérios) com suas variantes (`a|b`). 3. Conferir, no texto do HTML real da matéria (sem acento/caixa), se cada termo existe no(s) bloco(s) que recebem o deck. 4. Termos ausentes: decidir complementar / já coberto com outra grafia / pendente. **455 termos-chave em 13 decks** ficam em `tools/qa/fisio2-647/cobertura-slides.json` e são reconferidos pelo teste `fisio2-647.test.cjs` (a cobertura não depende de memória).
Limite: confere **presença do conteúdo**, não a qualidade didática nem as figuras (ver §4).

## 2 · Matriz deck → bloco (todos os 13 decks; os 6 primeiros não eram tratados na #643)
| Deck (arquivo, data) | Slides (eixo, na ordem) | Bloco(s) do HTML | Resultado |
|---|---|---|---|
| 01 Esofágicas (17/08) | anatomia em camadas e plexos → irrigação → deglutição (fases) → sinais/sintomas → disfagia (transferência × condução) → distúrbios motores: acalasia (idiopática/chagásica), espasmo difuso, «quebrantanueces» | `fp2b01` §1–7 | **26/26 termos**; ordem igual (o bloco continua com ERGE, Barrett, Mallory-Weiss, câncer e esofagites) |
| 02 Gástricas (17/08) | ERGE (epidemiologia, fisiopatologia, clínica) → síntese de HCl e tratamento → Barrett → gastrite (estresse, crônica, H. pylori em 5 passos) → úlcera péptica (critério 0,5 cm, ciclo de 4 tempos) → caso | `fp2b02` (+ ERGE/Barrett em `fp2b01` §8–9) | **33/33**; o slide abre por ERGE/Barrett, que o HTML ensina no bloco do esôfago |
| 03 EII (17/08) | definição → imunidade da mucosa → genética (NOD2) → ambiente → NOD1/NOD2 → patogenia em 4 passos → Crohn → CU → extraintestinais → comparação → casos | `fp2b12` §1–16 | **37/37**; mesma ordem |
| 04 Pancreatitis (27/08) | anatomia/funções → aguda (critérios 2 de 3, patogenia em 3 mecanismos) → clínica/gravidade → complicações → crônica → comparação de mediadores → casos | `fp2b04` §1–7 | **40/40** |
| 05 Hepatitis/Cirrosis (27/08) | A → B (inclui dados Paraguay/Brasil) → C → cirrose (B, C) → hipertensão portal | `fp2b03` §1–7 | **37/37** (dados regionais incluídos) |
| ICTERICIA (31/08) | função hepática → bilis → bilirrubina → ictericia (3 tipos) → síndromes hereditárias → provas hepáticas → casos | `fp2b13` §1–9 | **35/35** |
| 07 Vías urinarias (22/10; PPTX 11/09 = mesma versão) | bexiga → controle neurológico → continência → obstrução → compensação/descompensação → incontinência (4 tipos) → DIAPPERS → casos | `fp2b14` | **31/31** (#643: coberto) |
| 08 Glomerular (22/10) | GN (primária/secundária, patogenia) → nefrítico (pós-infecciosa, rápida, Goodpasture) → nefrótico (cambios mínimos, membranosa, GESF) → comparação → casos | `fp2b05` + `fp2b06` | **37/37** após esta PR: faltavam só **2 sinônimos de nome** (nefrosis lipoide; enfermedad de Berger), acrescentados |
| 09 Ácido-base (22/10) | pH/valores → ácidos e bases → tampão → MIRO → alcalosis respiratoria → acidosis respiratoria | `fp2b15` | **31/31**; o slide **não desenvolve** as formas metabólicas (o bloco já o declara) |
| 10 Diabetes (22/10) | metabolismo intermediário → ilhotas → classificação → SM → diagnóstico/pré-diabetes → metas → insulinas/esquemas → DM2 (4 alvos) → prática | `fp2b16` | **44/44** (#643 acrescentou GLUT-4) |
| 11 Endócrino 1 (22/10) | suprarrenal (camadas, hormônios, andrógenos, mineralocorticoides, glucocorticoides) → insuficiência → crise → Cushing | `fp2b17` | **40/40**; única diferença de ordem: «andrógenos» é o 3.º assunto no slide e o §4 no bloco (mantido: não altera o fio causal e evita renumerar) |
| 12 Endócrino 2 (04/11) | controle endócrino → eixo tireoidiano → folículo/síntese → TBG/livre → ações → bócio → hipotireoidismo (congênito, adquirido, mixedema) → hipertireoidismo/Graves → tormenta → casos | `fp2b18` (novo, #643) | **33/33** após esta PR: faltava só o **hipotireoidismo congênito transitório** (excesso de iodo/antitireoidianos na gestação ou no neonato), acrescentado |
| 13 Autônomo/consciência (04/11) | hiperatividade simpática paroxística → frequência respiratória → consciência → estruturas → atenção → graus → coma e variantes → Glasgow → caso → pupilas | `fp2b19` (novo, #643) | **31/31**; ver pendências |

Blocos sem deck na pasta atualizada (mantidos como estão, já «desde cero»): `fp2b07` IRA, `fp2b08` ERC, `fp2b09` ITU, `fp2b10` Na, `fp2b11` K.
Ordem dos blocos: segue a dos decks (01→13) com os cinco blocos sem deck intercalados na parte renal; nenhuma renumeração.

## 3 · O que esta PR muda — ESTADO ÚNICO (09/11)
Esta PR faz **duas** coisas: (a) 3 inserções que vêm do slide (tabela abaixo) e (b) uma seção didática nova em **cada** um dos blocos 15–19 (§3-B). Os blocos 15–19 **já receberam** a revisão didática; não há etapa pendente de reescrita. O que segue pendente está só no §4.

### 3-A · As 3 inserções do slide
| Bloco | Inserção | Origem |
|---|---|---|
| `fp2b05` | «El slide de la cátedra la llama también **nefrosis lipoide**…» (nefropatia por cambios mínimos) | deck 08, slide 30 |
| `fp2b06` | «…la nombra como **enfermedad de Berger** (es el mismo cuadro)» (nefropatia por IgA) | deck 08, tabela nefrítico × nefrótico |
| `fp2b18` | subtítulo «Hipotiroidismo congénito transitorio» (exceso de yodo/antitiroideos → TSH alta, T baja/normal, temporal) | deck 12, slide 30 |
Nada foi removido ou movido; perguntas (806), flashcards (2181), SVG (77) e imagens (33) idênticos à #643; tabelas 82 → 89 (+7 nas seções do §3-B). Fisio II tem 47 grifos reais (somente leitura, 06/11) em `fp2b01` ×42, `fp2b02` ×4, `fp2b12` ×1; esses três blocos ficam **byte a byte idênticos**; os blocos editados não têm grifos; 0 traços; 0 notas.

## 3-B · Revisão didática (#647) — resultado por bloco

«Bom» = já cumpria desde cero/mecanismo/comparação e foi preservado. «+» = seção nova **antes de «Puntos a dominar»**, escrita na voz do resumo (sem avisos de bastidor para o aluno), fechada com «En una frase». Perguntas, flashcards, imagens, IDs e texto existente não foram tocados.

| Bloco | Estado | O que se fez |
|---|---|---|
| 01 esófago · 02 estómago · 03 EII (fp2b12) | Bom | Intocados (47 grifos reais; idênticos byte a byte) |
| 04 · 05 · 06 · 07 · 08 · 09 · 10 · 11 · 12 · 13 · 14 (fp2b04, 03, 13, 14, 05, 06, 07, 08, 09, 10, 11) | Bom | Sem mudança, salvo +1 frase do slide em 05 e 06 |
| 15 ácido-base | + seção 6 | Logaritmo do pH; acidose/alcalose metabólicas com a definição do slide e ligadas aos blocos 10, 11, 14, 16 e 17; 2 exemplos de prática («valores de ejemplo»). **Retirados** (10/11): compensação e seus tempos, vómitos/diuréticos como causas. Nota antiga «Qué no desarrolla el slide» reescrita |
| 16 diabetes | + seção 8 | Cadeia sinal → sintomas → complicações; basal/prandial; amanecer × Somogyi (sem conduta de dose) |
| 17 suprarrenal | + seção 8 | Espelho Addison × Cushing; diagnóstico em 3 perguntas; retirada brusca de glucocorticoides |
| 18 tiroides | + seção 10 (e 1 subtítulo do slide) | Leitura TSH/T4 livre (primário e tirotoxicose, com os casos do slide); bocio por TSH; hormona → sintoma |
| 19 SNA/consciência | + seções 7 e 8 + inserções de figura | Coma × mutismo × cautiverio; interruptor/tela; **tabela de Glasgow completa e caso do motociclista (slide 24)**; simpático órgão por órgão (4), quimiorreceptores e umbrais (7), RAS (12), pupilas heroína/atropina (26) |

### Origem e grau de verificação das seções novas (relatório interno; NÃO vai à página do aluno)

| Afirmação | Origem | Verificação |
|---|---|---|
| Quadros de Addison/Cushing, cinco S, pruebas de cribado, eixo TRH–TSH, Graves, graus de consciência, mutismo acinético, cautiverio | Slides (decks 09–13, texto) | Reconferido contra o texto extraído dos slides |
| Definições metabólicas (aumento de H⁺/perda de HCO₃⁻ = acidose; aumento de HCO₃⁻/perda de H⁺ = alcalose); «o digestivo só perde bicarbonato, o rim regula»; MIRO; 4 combinações | Slide 09 (PDF `09 - Desequilibrio acido- base.pdf`, id 1ak5yxGdNMWNZsc0nz-ZLDsR3HP8vGfB8, texto relido em 10/11) | **Confirmado no slide** |
| Causas citadas na seção 6: IRA/ERC (blocos 10–11), hiperpotasemia/ATR IV e hipopotasemia (bloco 14), cetoacidose (16), aldosterona em excesso (14 e 17) | Blocos da própria matéria (texto dos slides 06–08, 10) | Confirmado nos blocos citados, não no slide 09 |
| pH logarítmico (0,3 de pH ≈ dobro de H⁺) | Aritmética (pH = −log[H⁺]) | Verificável matematicamente; **não** vem de livro |
| Cadeia glicemia → poliuria/polidipsia/polifagia/cetose; basal/prandial | Slide 10 (cetoacidosis, tipos de insulina) + fisiologia geral | A passagem da glicose à urina e a poliuria osmótica **não** foram confirmadas em livro (sem número na página): revisão humana |
| Amanecer × Somogyi | Slide: «mañana desprotegida» e «hipoglucemia de madrugada» | A coluna «Qué la distingue» é dedução do próprio slide. **Retirada** a linha de conduta (reforçar/reduzir dose): não sustentada pelo slide |
| Hipotiroidismo secundario/terciario | Eixo do slide | **Retirada** a linha numérica «TSH baja o normal»; fica só a consequência lógica (a orden no sale; não se espera TSH alta) |
| Coma × mutismo × cautiverio | Slide 13 (texto) | Coluna ambígua «¿consciente?» retirada; **retirado** o parágrafo do «hilo común» com o trauma (não vinha do slide) |
| Glasgow: 3 ítens, ≤ 8, tabela de valores, máx. 15 / mín. 3 | Slide 13 (texto) + extrato do slide 24 (imagem legível) | **Confirmado no slide.** O caso do motociclista é faixa 4–8 por leitura nossa de «gemido» e de «ligera tensión» |

## 3-C · Slide 13 — extratos visuais recebidos (10/11)

Fonte: pasta «Slides atualizados», arquivos «Consciencia slide NN - extrato.pptx» (1 slide cada), enviados por José. Baixados pelo conector, convertidos em PDF/PNG e **vistos um a um**. A numeração confere com a do texto extraído do arquivo original (`13 - Unidad 5…pptx`, id 1wHPoPPpHWtRlZ2t4EJDKoID_iT_2xJpu), onde o número impresso vem **depois** do conteúdo do slide.

| Extrato | O que mostra | Efeito no bloco 19 |
|---|---|---|
| 03 | Título «Fisiopatología del sistema nervios autónomo» | — |
| 04 | Figura simpático × parasimpático: simpático dilata pupilas, aumenta latidos, dilata bronquios, diminui contrações do estômago e do intestino, estimula suprarrenais; parasimpático inerva glândula lagrimal, salivares, coração, pulmões, estômago, páncreas, intestino, colon, bexiga, íris (sem efeitos escritos) | **Novo** na seção 1: tabela «El simpático, órgano por órgano» |
| 06 | Título «Como se regula la frecuencia respiratoria?» | — |
| 07 | Figura: núcleos neumotáxico («neumotórax» no rótulo), respiratório ventral (inspiração e expiração) e dorsal (inspiração); rótulo «Mesencéfalo» com seta; quimiorreceptores (bulbo raquídeo, glosofaríngeo, vago, corpo carotídeo, corpos aórticos); gráfico PCO₂ × tempo com dois «umbral» | **Novo** na seção 2: quimiorreceptores e os dois umbrais. O rótulo «Mesencéfalo» **não foi transcrito** (a literatura geral situa o centro pneumotáxico na ponte; não confirmado em livro nesta sessão) |
| 12 | Texto «dos estructuras» + figura do RAS e «Reticular formation» | Seção 3: frase sobre o RAS e suas projeções à córtex |
| 15 | Graus de transtorno da consciência (texto igual ao já preparado) | Conferido, sem mudança |
| 16, 17, 18 | Letargia, obnubilación, estupor: só imagens ilustrativas (foto/meme/desenho), sem conteúdo clínico | Nenhum |
| 23 | «Grados de coma»: texto do Glasgow (igual ao preparado) + duas fotos decorativas (a cidade de Glasgow e um mapa com alfinetes). **Não há tabela** | Conferido; a tabela **não** está aqui |
| 26 | «Reactividad pupilar en los pacientes en coma»: pares imagem–substância. Só «heroína» (olho de pupila pequena, papoula) e «atropina» (olho de pupila grande, planta) têm rótulo; hongos, cocaína, cannabis e álcool aparecem sem texto | **Novo** seção 8: heroína → miose, atropina → midríase; o resto **não** se afirma |

### Extratos «leve final» recebidos depois (10/11) — vistos

| Extrato | O que mostra | Efeito no bloco 19 |
|---|---|---|
| **24** | **Tabela de Glasgow legível** («Escala de coma de Glasgow»: abertura de olhos 4 espontáneamente · 3 a la voz · 2 al dolor · 1 no responde; resposta motora 6 cumple órdenes · 5 localiza el dolor · 4 sólo retira · 3 flexión anormal · 2 extensión anormal · 1 no responde; resposta verbal 5 orientado · 4 confuso · 3 palabras inapropiadas · 2 sonidos incomprensibles · 1 no responde; máxima 15, mínima 3) + figura das posturas decorticada (flexão anormal; lesão em hemisférios ou cápsula interna) e descerebrada (extensão anormal; lesão em mesencéfalo, tronco ou ponte) | **Novo** (seção 6): a tabela completa, as duas posturas e o caso do motociclista como **faixa**: olhos 1 + verbal 2 (gemido = sonidos incomprensibles, leitura nossa) + motora indefinida 1–5 → 4 a 8 = coma. **Não** se fixa um total único porque «ligera tensión de la mano» não define a resposta motora |
| **19** | «Coma» com uma foto ilustrativa (pessoa caída no banheiro); sem conteúdo clínico | Nenhum |
| **08** | Duas capturas de tela embutidas (neuroanatomia com «Mesencéfalo»; «Quimiorreceptores periféricos»: bulbo, glosofaríngeo, vago, corpo carotídeo, corpos aórticos) — **legíveis** apesar da compressão; rótulos «PCO₂ ↓ O₂ ↑», «PCO₂ ↑ O₂ ↓», «apnea»; eixo do gráfico | Nada novo além do já incorporado (quimiorreceptores, seção 2). **Limite:** o slide tem 22 traços de caneta (InkML) com os desenhos das curvas; meu extrator não os decodificou em curvas legíveis, e o LibreOffice não os desenha. As curvas **não** foram lidas |

**Pendência real que resta do deck 13:** apenas as **curvas desenhadas à mão no slide 08** (PCO₂ × tempo, fases de apneia). O texto do slide 9 («En conclusión…») já está no bloco 19 e descreve o mesmo ciclo. Os demais slides do deck foram vistos.

## 3-D · Dependência da #645 (Nova Era)

A #645 mapeia só até fp2b17 (`FP2_NUM`/`FP2_SEMVIG`, testes 17 blocos). **fp2b18 e fp2b19 existem desde a #643 e caem em «otro»** até a #645 ser atualizada (17→19 em tema/tests). Enquanto isso não acontecer, a Nova Era de Fisiopatología II **não está pronta**. Esta PR não toca nos arquivos da #645.

### 3-E · Notas de bastidor da #643 reescritas (10/11)
Na página do aluno não restam «el slide…», «cátedra», «lámina», «Farreras» nos blocos 15–19 (teste automático). O que dizia cada nota e para onde foi:

| Bloco | Texto da #643 (resumo) | Na página agora | Informação interna |
|---|---|---|---|
| 16 | «Meta/algoritmo del slide»; «Dos cortes…el slide de diabetes no aclara la población»; «Cómo leer esta tabla…slide de la cátedra» | Mesma informação sem citar a fonte; 94/80 cm (fígado, caucasiana) × 102/88 cm (aqui) como critérios distintos | O slide de diabetes não indica a população do corte; não se usa um para corrigir o outro |
| 17 | «Una aclaración de fuente», «Lo que el slide da y no da», «Una errata del slide» (hipercalcemia), «Cómo leer los cortes/ACTH» | «Dos formas de decir lo mismo», «Fármaco y dosis», «Ojo con la hipercalcemia», cortes orientativos | O slide nomeia dexametasona ou hidrocortisona sem dose/via; a lista do slide associa hipercalcemia à pigmentação (erro do slide) |
| 18 | Legenda «valores…Farreras Rozman», «diagrama del slide de síntesis», «(así lo escribe el slide)», «Dato de los casos del slide» | «Valores de referencia», «Casos de referencia»; «gen A» sem a observação | O slide cita Farreras Rozman para os valores; grafia «gen A» é a do slide |
| 19 | «Qué falta» (α/β ilegíveis), «Una errata del slide» (neumotórax), «Qué no se afirma acá» (Glasgow, imagem não lida) | «Receptores adrenérgicos», «Ojo con el nombre», «El caso del motociclista» (sem puntaje total) | α/β não legíveis no texto do slide; a tabela de valores do Glasgow era uma imagem (slide 24), **agora vista e integrada (§3-C)**; teste da #642 ajustado para a nova frase |

## 4 · Pendências reais (não resolvidas aqui, sem inventar)
1. **Figuras do deck 13**: todos os extratos (03, 04, 06, 07, 08, 12, 15–19, 23, 24 e 26) foram vistos (§3-C). Resta só a tinta manuscrita do slide 08 (curvas de PCO₂), não decodificada. Slides 3, 4, 8, 12 e 15–18 (figuras), **tabela de Glasgow (slide 23 na numeração do texto extraído)** e **reatividade pupilar (26: heroína/atropina)** não inspecionados; o caso do Glasgow segue «no se fija un puntaje total». As figuras dos demais decks não foram reinspecionadas nesta PR (a #643 inspecionou 07–12).
2. **Acidose/alcalose metabólicas**: o slide 09 não as desenvolve. A seção 6 do bloco 15 as ensina com conhecimento geral de fisiologia, **sem confirmação em livro** (Porth cap. 8, citado no slide, não está no Drive). **Revisão humana pendente** antes de considerar a seção como «da literatura».
3. **Verificação científica só contra os slides**: valores da tireoide («Farreras») e demais números não foram confrontados com o livro (indisponível).
4. **Didática**: concluída nesta PR para 15–19 (§3-B). Pendente só a revisão humana das linhas marcadas como «não confirmado em livro» no §3-B.
5. **Duplicata PPTX/PDF** do deck 07: lido o PDF (22/10); o PPTX (11/09) é versão anterior editável.
6. **Questões/flashcards**: nenhum foi criado ou alterado nesta PR (8-A: ensino antes da questão; as 3 inserções são ensino extra, sem questão nova). Questões dos blocos 18/19 são da #643 (escritas a partir dos slides, não de prova).

## 5 · Coordenação
- **#643** (conteúdo 07–13, Claude 1): auditada; sem erro encontrado; esta PR depende dela (empilhada) e não a sobrescreve.
- **#645** (Nova Era, Claude 2): o tema de Fisio II lista **17 blocos** (`FP2_NUM` até `fp2b17`). Depois do merge da #643 os blocos `fp2b18` (Tiroides) e `fp2b19` (SNA/consciência) existirão e ficariam como «otro» (sem número). Atualização pedida na branch dela: acrescentar `fp2b18: 18, fp2b19: 19` em `FP2_NUM` (e `18: 1, 19: 1` em `FP2_SEMVIG`, sem vinheta própria), ajustar os testes `temas-fisio2`/`real-fisio2` de 17 para 19 blocos. Esta PR **não** toca a #645.
