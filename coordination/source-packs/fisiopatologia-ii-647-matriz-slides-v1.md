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
| 15 ácido-base | + seção 6 | Logaritmo do pH; acidose/alcalose metabólicas ligadas aos blocos 02, 14 e 16; compensação; 2 exemplos de prática rotulados «valores de ejemplo». A nota antiga «Qué no desarrolla el slide» foi reescrita para apontar a seção 6 |
| 16 diabetes | + seção 8 | Cadeia sinal → sintomas → complicações; basal/prandial; amanecer × Somogyi (sem conduta de dose) |
| 17 suprarrenal | + seção 8 | Espelho Addison × Cushing; diagnóstico em 3 perguntas; retirada brusca de glucocorticoides |
| 18 tiroides | + seção 10 (e 1 subtítulo do slide) | Leitura TSH/T4 livre (primário e tirotoxicose, com os casos do slide); bocio por TSH; hormona → sintoma |
| 19 SNA/consciência | + seção 7 | Coma × mutismo acinético × cautiverio; interruptor/tela; como se arma o Glasgow, sem valores |

### Origem e grau de verificação das seções novas (relatório interno; NÃO vai à página do aluno)

| Afirmação | Origem | Verificação |
|---|---|---|
| Quadros de Addison/Cushing, cinco S, pruebas de cribado, eixo TRH–TSH, Graves, graus de consciência, mutismo acinético, cautiverio | Slides (decks 09–13, texto) | Reconferido contra o texto extraído dos slides |
| pH logarítmico (0,3 de pH ≈ dobro de H⁺); causas de acidose/alcalose metabólica; compensação respiratória/renal e seu tempo; exemplos de gasometria | Conhecimento geral de fisiologia (o slide 09 não os desenvolve) | **NÃO confirmado em livro** (Porth/Guyton não estão no Drive nem foram abertos). Mantido por ser conteúdo padrão e coerente com MIRO; **revisão humana pendente** |
| Cadeia glicemia → poliuria/polidipsia/polifagia/cetose; basal/prandial | Slide 10 (cetoacidosis, tipos de insulina) + fisiologia geral | Limiar renal da glicose não confirmado em livro; sem número na página |
| Amanecer × Somogyi | Slide: «mañana desprotegida» e «hipoglucemia de madrugada» | A coluna «Qué la distingue» é dedução do próprio slide. **Retirada** a linha de conduta (reforçar/reduzir dose): não sustentada pelo slide |
| Hipotiroidismo secundario/terciario | Eixo do slide | **Retirada** a linha numérica «TSH baja o normal»; fica só a consequência lógica (a orden no sale; não se espera TSH alta) |
| Coma × mutismo × cautiverio | Slide 13 (texto) | Coluna ambígua «¿consciente?» retirada; **retirado** o parágrafo do «hilo común» com o trauma (não vinha do slide) |
| Glasgow: 3 ítens e ≤ 8 | Slide 13 (texto) | Valores por resposta **não incluídos** (tabela em figura inacessível) |

## 3-C · Slide 13 — o que não foi possível abrir

Arquivo: `13 - Unidad 5. Alteraciones de la conciencia.pptx` (Drive id `1wHPoPPpHWtRlZ2t4EJDKoID_iT_2xJpu`, 27 101 529 bytes). Leitura de texto funciona; o download falha (limite de 10 MB da ferramenta; exportar como PDF também falha). Inacessíveis: **slides 3, 4, 8, 12, 15–18** (sem texto extraível), **23** (tabela de Glasgow), **26** (pupilas: heroína/atropina) e o conteúdo gráfico dos slides **6–7**. **Nova tentativa (09/11):** o coordenador relatou ter aberto o arquivo pelo download do original; esta sessão repetiu `download_file_content` (mesmo fileId, sem `exportMimeType`) e recebeu «File too large for download, over limit of 10 MB»; a API pública do Drive responde 403 sem credencial e não há conta autenticada (`gcloud auth list` vazio). Bloqueio = ferramenta/credencial desta sessão, não o arquivo. Para fechar: José exporta o deck em PDF < 10 MB ou envia as figuras; o caso do Glasgow segue «no se fija un puntaje total».

## 3-D · Dependência da #645 (Nova Era)

A #645 mapeia só até fp2b17 (`FP2_NUM`/`FP2_SEMVIG`, testes 17 blocos). **fp2b18 e fp2b19 existem desde a #643 e caem em «otro»** até a #645 ser atualizada (17→19 em tema/tests). Enquanto isso não acontecer, a Nova Era de Fisiopatología II **não está pronta**. Esta PR não toca nos arquivos da #645.

## 4 · Pendências reais (não resolvidas aqui, sem inventar)
1. **Figuras**: o PPTX 13 (27 MB) não pôde ser baixado; só o texto foi lido. Slides 3, 4, 8, 12 e 15–18 (figuras), **tabela de Glasgow (slide 23 na numeração do texto extraído)** e **reatividade pupilar (26: heroína/atropina)** não inspecionados; o caso do Glasgow segue «no se fija un puntaje total». As figuras dos demais decks não foram reinspecionadas nesta PR (a #643 inspecionou 07–12).
2. **Acidose/alcalose metabólicas**: o slide 09 não as desenvolve. A seção 6 do bloco 15 as ensina com conhecimento geral de fisiologia, **sem confirmação em livro** (Porth cap. 8, citado no slide, não está no Drive). **Revisão humana pendente** antes de considerar a seção como «da literatura».
3. **Verificação científica só contra os slides**: valores da tireoide («Farreras») e demais números não foram confrontados com o livro (indisponível).
4. **Didática**: concluída nesta PR para 15–19 (§3-B). Pendente só a revisão humana das linhas marcadas como «não confirmado em livro» no §3-B.
5. **Duplicata PPTX/PDF** do deck 07: lido o PDF (22/10); o PPTX (11/09) é versão anterior editável.
6. **Questões/flashcards**: nenhum foi criado ou alterado nesta PR (8-A: ensino antes da questão; as 3 inserções são ensino extra, sem questão nova). Questões dos blocos 18/19 são da #643 (escritas a partir dos slides, não de prova).

## 5 · Coordenação
- **#643** (conteúdo 07–13, Claude 1): auditada; sem erro encontrado; esta PR depende dela (empilhada) e não a sobrescreve.
- **#645** (Nova Era, Claude 2): o tema de Fisio II lista **17 blocos** (`FP2_NUM` até `fp2b17`). Depois do merge da #643 os blocos `fp2b18` (Tiroides) e `fp2b19` (SNA/consciência) existirão e ficariam como «otro» (sem número). Atualização pedida na branch dela: acrescentar `fp2b18: 18, fp2b19: 19` em `FP2_NUM` (e `18: 1, 19: 1` em `FP2_SEMVIG`, sem vinheta própria), ajustar os testes `temas-fisio2`/`real-fisio2` de 17 para 19 blocos. Esta PR **não** toca a #645.
