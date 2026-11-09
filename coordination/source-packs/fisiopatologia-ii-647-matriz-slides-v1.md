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

## 3 · O que esta PR muda (3 inserções, todas do slide)
| Bloco | Inserção | Origem |
|---|---|---|
| `fp2b05` | «El slide de la cátedra la llama también **nefrosis lipoide**…» (nefropatia por cambios mínimos) | deck 08, slide 30 |
| `fp2b06` | «…la nombra como **enfermedad de Berger** (es el mismo cuadro)» (nefropatia por IgA) | deck 08, tabela nefrítico × nefrótico |
| `fp2b18` | subtítulo «Hipotiroidismo congénito transitorio» (exceso de yodo/antitiroideos → TSH alta, T baja/normal, temporal) | deck 12, slide 30 |
Nada foi removido ou movido; perguntas (806), flashcards (2181), SVG (77), imagens (33) e tabelas (82) idênticos à #643. Fisio II tem 47 grifos reais (somente leitura, 06/11) em `fp2b01` ×42, `fp2b02` ×4, `fp2b12` ×1; esses três blocos ficam **byte a byte idênticos**; os blocos editados não têm grifos; 0 traços; 0 notas.

## 3-B · Revisão didática (#647) — resultado por bloco

Critérios: desde cero · mecanismo · comparação · síntese. «Bom» = já cumpria, preservado sem tocar. «+» = camada nova inserida **antes de «Puntos a dominar»**, sem tocar em perguntas, flashcards, imagens, IDs nem texto existente.

| Bloco | Estado | O que se fez |
|---|---|---|
| 01 esófago · 02 estómago · 03 EII (fp2b12) | Bom | Intocados (têm os 47 grifos reais de alunos; idênticos byte a byte) |
| 04 páncreas · 05 hígado · 06 ictericia · 07 vías urinarias · 09 nefrítico · 10 IRA · 11 ERC · 12 ITU · 13 Na · 14 K | Bom | Já tinham cartões «desde cero», mecanismo, tabelas e «Puntos a dominar»; sem mudança |
| 05 nefrótico (fp2b05) · 06 nefrítico (fp2b06) | Bom + 1 frase cada | «nefrosis lipoide» e «enfermedad de Berger» (slide) |
| 15 ácido-base (fp2b15) | + | Seção 6: logaritmo do pH, acidose/alcalose metabólicas ligadas aos blocos 02/14/16, compensação, 2 exemplos de gasometria com valores **inventados e rotulados** |
| 16 diabetes (fp2b16) | + | Seção 8: cadeia sinal→sintomas→complicações, analogia basal/prandial, quadro amanecer × Somogyi |
| 17 suprarrenal (fp2b17) | + | Seção 8: espelho Addison × Cushing, diagnóstico em 3 perguntas, por que a retirada brusca é perigosa |
| 18 tiroides (fp2b18) | + 1 subseção do slide | Seção 10: leitura do laboratório TSH/T4 livre, bocio por TSH, hormona→sintoma |
| 19 SNA/consciência (fp2b19) | + | Seção 7: quadro coma × mutismo acinético × cautiverio, analogia interruptor/tela, como se arma o Glasgow |

**Fontes e limites.** Tudo o que vem do slide continua no texto original. As camadas novas são **raciocínio fisiopatológico/conhecimento geral** e levam o aviso visível «Apoyo de la página, no del slide». Nenhum livro-texto foi aberto nesta sessão: não se afirma ter consultado Farreras, Harrison, Guyton nem outro; onde o conteúdo não pôde ser confirmado numa fonte, isso está no aviso. Os valores do Glasgow **não foram incluídos** (tabela do slide inacessível).

**Supabase (leitura, 09/11).** `user_highlights` de Fisiopatología II: fp2b01 = 42, fp2b02 = 4, fp2b12 = 1; nenhum nos blocos editados. Risco para dados: nenhum.

## 3-C · Slide 13 — o que não foi possível abrir

Arquivo: `13 - Unidad 5. Alteraciones de la conciencia.pptx` (Drive id `1wHPoPPpHWtRlZ2t4EJDKoID_iT_2xJpu`, 27 101 529 bytes). Leitura de texto funciona; o download falha (limite de 10 MB da ferramenta; exportar como PDF também falha). Inacessíveis: **slides 3, 4, 8, 12, 15–18** (sem texto extraível), **23** (tabela de Glasgow), **26** (pupilas: heroína/atropina) e o conteúdo gráfico dos slides **6–7**. Para fechar: José exporta o deck em PDF < 10 MB ou envia as figuras; o caso do Glasgow segue «no se fija un puntaje total».

## 3-D · Dependência da #645 (Nova Era)

A #645 mapeia só até fp2b17 (`FP2_NUM`/`FP2_SEMVIG`, testes 17 blocos). **fp2b18 e fp2b19 existem desde a #643 e caem em «otro»** até a #645 ser atualizada (17→19 em tema/tests). Enquanto isso não acontecer, a Nova Era de Fisiopatología II **não está pronta**. Esta PR não toca nos arquivos da #645.

## 4 · Pendências reais (não resolvidas aqui, sem inventar)
1. **Figuras**: o PPTX 13 (27 MB) não pôde ser baixado; só o texto foi lido. Slides 15–18 (figuras), **tabela de Glasgow (24)** e **reatividade pupilar (26: heroína/atropina)** não inspecionados; o caso do Glasgow segue «no se fija un puntaje total». As figuras dos demais decks não foram reinspecionadas nesta PR (a #643 inspecionou 07–12).
2. **Acidose/alcalose metabólicas**: o slide 09 não as desenvolve; o bloco 15 diz isso. Ensinar causas e compensação exigiria literatura-base (Porth cap. 8, citado no slide) que **não está no Drive**; fica como decisão de José (complemento «da literatura» separado do slide).
3. **Verificação científica só contra os slides**: valores da tireoide («Farreras») e demais números não foram confrontados com o livro (indisponível).
4. **Didática**: a cobertura é de conteúdo. Blocos 15–19 são os mais telegráficos (tabelas, poucas frases longas); poderiam ganhar prosa/analogias, mas isso é reescrita editorial (G0 §13) que não foi feita aqui para não misturar com a #643 e sem fonte nova — recomendado como etapa própria, bloco a bloco.
5. **Duplicata PPTX/PDF** do deck 07: lido o PDF (22/10); o PPTX (11/09) é versão anterior editável.
6. **Questões/flashcards**: nenhum foi criado ou alterado nesta PR (8-A: ensino antes da questão; as 3 inserções são ensino extra, sem questão nova). Questões dos blocos 18/19 são da #643 (escritas a partir dos slides, não de prova).

## 5 · Coordenação
- **#643** (conteúdo 07–13, Claude 1): auditada; sem erro encontrado; esta PR depende dela (empilhada) e não a sobrescreve.
- **#645** (Nova Era, Claude 2): o tema de Fisio II lista **17 blocos** (`FP2_NUM` até `fp2b17`). Depois do merge da #643 os blocos `fp2b18` (Tiroides) e `fp2b19` (SNA/consciência) existirão e ficariam como «otro» (sem número). Atualização pedida na branch dela: acrescentar `fp2b18: 18, fp2b19: 19` em `FP2_NUM` (e `18: 1, 19: 1` em `FP2_SEMVIG`, sem vinheta própria), ajustar os testes `temas-fisio2`/`real-fisio2` de 17 para 19 blocos. Esta PR **não** toca a #645.
