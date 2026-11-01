# Farmacología II · pasta de questões (arquivos de 01/11/2026) · integração pela 8-A

> **ESTADO: PARCIAL — NÃO MESCLAR.** Dois PDFs (56,8 MB e 22,5 MB) não puderam ser baixados como arquivo bruto neste ambiente (erros exatos em §1-B). Nenhuma página deles foi examinada em imagem; nada foi inventado.

Fonte: Drive → pasta de questões de Farmacología II (id `1Ov8nvljchyD5EyLI4hSk8iXlNbrlGMIS`): 11 arquivos de 01/11 + o arquivo mais antigo da pasta (referência de repetições).
Base: `main` em `fb9b3f45` (inclui #623). Nenhum layout, caneta, áudio, arquivo global, Supabase ou flag foi tocado. Único arquivo de conteúdo alterado: `farmacologia-ii.html` (+ este registro + `docs/layout-ensaio/inventario.json`).

Convenção dos códigos de questão existente: `f2bNN#K` = K-ésima questão da seção `f2bNN` (ordem da página). Atenção: a seção `f2b07` mostra «Bloque 06» (corticoides) e `f2b06` mostra «Bloque 07» (AINE); os separadores do banco usam o número exibido (06 = corticoides, 07 = AINE).
Nas decisões: **INCLUÍDA** (questão nova), **JÁ EXISTENTE** (conceito e raciocínio já cobrados), **SUBSTITUIR** (versão mais completa; nenhuma foi necessária — ver §5), **PENDENTE** (sem verificação ou sem fonte).

## 1. Inventário e verificação dos 12 arquivos

| # | Arquivo | Tamanho | Págs. | Natureza | Como foi lido | Estado |
|---|---|---|---|---|---|---|
| 0 | `Provas Fármaco II - Belem completo .pdf` (**referência**, 04/08/2026) | 6,5 MB | não contadas | fotos de provas reais da Dra. Verónica Vega | só texto OCR do Drive (download falha: conexão do conector cai com 6,5 MB) | **parcial**: base para repetições, sem conferência visual |
| 1 | `farmaco p2.pdf` | 2,45 MB | 5 | recordação de aluno da prova de 10/11/2025, com respostas | imagens das 5 páginas | lido inteiro |
| 2 | `Simulado farmaco II - 2ª parcial.pdf` | 3,96 MB | 4 | **simulado** (15 MCQ com gabarito comentado) | texto | lido inteiro |
| 3 | `1. Questionário Antihipertensivos.pdf` | 177 KB | 6 | **questionário de terceiros** (resumomedicina.py, Uanderson Alves) | texto | lido inteiro |
| 4 | **`Provas Compilado farmaco.pdf`** | **56.815.528 bytes (56,8 MB)** | **não foi possível contar** | provável compilado de fotos de provas | download recusado (limite 10 MB do conector); extração de texto do Drive vazia (só imagem) | **NÃO VERIFICADO** |
| 5 | `Tabelas Farmaco Final.pdf` | 127 KB | 3 | tabelas-resumo, sem questões | texto | lido inteiro: 0 questões |
| 6 | **`Questoes P1 P2 Farmaco_251206_172249.pdf`** | **22.496.018 bytes (22,5 MB)** | **não foi possível contar** | colagem de recordações P1/P2, cópias de outros arquivos, atividade e perguntas curtas | download recusado (limite 10 MB); só o texto OCR do Drive (≈89 mil caracteres, sem paginação) | **PARCIAL**: nenhuma página conferida em imagem |
| 7 | `prova farmaco.pdf` | 1,66 MB | 5 | foto da «Prova de Farmacologia – Revisão» (Belén, Turma D, Fila 2) | imagens | lido; = arquivo 9 |
| 8 | `questoes farmaco.pdf` | 857 KB | 3 | «Farmacologia II – Dra Belen»: 10 MCQ sem gabarito + 6 abertas | imagens | lido inteiro |
| 9 | `Fármaco – Belén, Turma D, Fila 2 (1).pdf` | 119 KB | 5 | revisão com respostas (12 MCQ + 3 completar + 3 V/F + 2 discursivas) | texto | lido inteiro |
| 10 | `2. Questionário Antianginosos.pdf` | 203 KB | 7 | **questionário de terceiros** (mesmo autor) | texto | lido inteiro (gabaritos comentados) |
| 11 | `Simulado P2 Corticoides + Farmacologia Respiratória.pdf` | 169 KB | 6 | **simulado** («Dra. Verónica Vega», 20 MCQ + 8 abertas + 4 casos) | texto | lido inteiro |

**Não conseguiu verificar (José precisa comprimir ou dividir):**
1. `Provas Compilado farmaco.pdf` — 56.815.528 bytes (56,8 MB) — páginas: **não foi possível contar**; 100 % das páginas sem verificação. Nenhuma questão, resposta ou decisão foi inventada para este arquivo.
2. `Questoes P1 P2 Farmaco_251206_172249.pdf` — 22.496.018 bytes (22,5 MB) — páginas: **não foi possível contar**; só o texto OCR foi lido (§4); nenhuma página conferida visualmente; recomenda-se comprimir para conferir imagens, tabelas e a resposta correta de cada item.
3. `Provas Compilado` e a referência (arquivo 0): a referência foi lida só em texto OCR (6,5 MB; páginas não contadas).

### 1-B. Nova tentativa de baixar os dois PDFs brutos (2.ª rodada) — erros exatos
Ambiente: sessão em nuvem, saída HTTPS por proxy; sem credencial do Google Drive (`gcloud auth list` → «No credentialed accounts»); o token de ambiente disponível é do `gcloud`/GitHub e **não foi usado** para o Drive (não foi concedido para isso).
| Arquivo (id) | Tentativa | Resultado exato |
|---|---|---|
| `Questoes P1 P2 Farmaco_251206_172249.pdf` (`13Re9_Bhlz7I87HY2CQeSuCO0jRkQyIWn`, 22.496.018 bytes) | conector Drive `download_file_content` | `File too large for download, over limit of 10 MB. For downloading larger files, use the standard Google Drive API. See https://developers.google.com/workspace/drive/api/guides/manage-downloads#curl` |
| idem | `curl https://drive.google.com/uc?export=download&id=…` | `curl: (56) CONNECT tunnel failed, response 403` (host `drive.google.com` bloqueado pela política de rede do ambiente) |
| idem | `curl https://www.googleapis.com/drive/v3/files/<id>?alt=media` (sem credencial) | HTTP `403` |
| `Provas Compilado farmaco.pdf` (`1B33uMV2aNLv3U6zSBb9DIZlMi62mrvnq`, 56.815.528 bytes) | conector Drive `download_file_content` | mesmo erro: `File too large for download, over limit of 10 MB. …` |
| idem | `curl` ao Drive | mesmo bloqueio (`CONNECT tunnel failed, response 403` / HTTP `403`) |
Como não houve download, não foi possível dividir uma cópia local. Os originais no Drive **não foram alterados** (só leitura).
**Para destravar (José):** dividir ou comprimir os dois PDFs em partes de até ~9 MB (por exemplo, páginas 1–N, N+1–M) e salvá-los como cópias novas na mesma pasta; ou liberar `drive.google.com`/`www.googleapis.com` na rede do ambiente **e** fornecer uma credencial de leitura do Drive.

**3.ª rodada (01/11, após o pedido de exame visual):** a pasta do Drive foi listada de novo (`parentId = 1Ov8nvljchyD5EyLI4hSk8iXlNbrlGMIS`): **não há arquivo novo** (nenhuma cópia dividida ou comprimida; busca por `createdTime > 2026-11-01T22:00:00Z` retornou vazio). `download_file_content` dos dois ids repetiu o mesmo erro («File too large for download, over limit of 10 MB…»). `read_file_content` de `Provas Compilado farmaco.pdf` devolveu `fileContent: ""` (PDF só de imagem; nenhuma página legível por texto). O proxy do ambiente nega `drive.google.com` (política de rede); não foi contornado.
**Páginas não examinadas:** `Provas Compilado farmaco.pdf` — todas (total de páginas desconhecido); `Questoes P1 P2 Farmaco_251206_172249.pdf` — todas em imagem (total desconhecido; só o texto OCR sem paginação).

**Rótulos (8-A.4):** nenhum arquivo desta pasta prova por si só que um item é de prova oficial (os de 01/11 são simulados, questionários, tabelas ou recordações de aluno). Por isso **as 13 questões novas levam «Pregunta complementaria»**. As questões já existentes mantêm o rótulo que tinham.

## 2. Resultado

De **≈175 itens** registrados (§3 e §4): **13 questões novas** incluídas (bloco + banco), **≈140 JÁ EXISTENTES** (conceito e raciocínio já cobrados em 214 questões), os demais não incluídos por falta de resposta determinável, erro do arquivo ou item aberto sem valor novo (todos listados). Nenhuma questão antiga foi alterada, substituída ou removida.

| | Antes (`main`) | Depois |
|---|---|---|
| Questões nos blocos | 214 | **227** (+13) |
| Questões no banco geral (espelho) | 214 | **227** |
| `quiz-item` totais | 428 | **454** |
| «Basada en preguntas de examen» (inclui completar, desarrollo e V/F de exame) | 132 | **132** |
| «Pregunta complementaria» (inclui completar e V/F) | 82 | **95** |
| Bloque 06 (corticoides) / 08 (respiratorio) / 09 (antiácidos) | 15 / 12 / 11 | **17 / 19 / 15** |
| Demais blocos | — | sem mudança |
| Flashcards | 584 | 584 |
| Textos do cabeçalho do banco | «214 · 132 · 82 · 14» | «227 · 132 · 95 · 14» |
| Separadores do banco | 06: 9+6 · 08: 7+5 · 09: 6+5 | 06: 9+8 · 08: 7+12 · 09: 6+9 |

(Observação: o bloco 09 tinha 11 questões; passa a 15. O quadro conta as questões por seção da página.)

Todas as novas entram **no fim das «Preguntas complementarias»** do bloco e **no fim do grupo do bloco no banco**, mesma redação nas duas cópias (espelho verificado: 227 × 227 idênticas). Nenhuma recebeu `id` (as questões desta matéria não têm). Cobertura (8-A.2): cada ponto cobrado é ensinado antes no resumo do bloco (verificado frase por frase nos textos de `f2b07`, `f2b08` e `f2b09`; origem: slides da cátedra).

## 3. Questões novas (13): arquivo/página → bloco → decisão

| Nova | Bloco | Tema | Origem (arquivo · página) | Ensinado no resumo |
|---|---|---|---|---|
| N1 | 06 corticoides | Qual corticoide retém mais Na⁺/água (hidrocortisona; MC ++ × dexametasona 0) | 11 · p. 1, Q2 e p. 5 caso 1; Q22 (resposta aberta) | tabela de potências e «Hidrocortisona … retiene Na⁺ y agua» |
| N2 | 06 | Completar: transcortina (75–80 % do cortisol; albúmina 10–15 %) | 1 · p. 5, 2.3 | «Unión a proteínas» |
| N3 | 08 respiratorio | Omalizumab = anti-IgE (distrator: mepolizumab, anti-IL-5) | 1 · p. 2, Q6; 2 · p. 2, Q9 | «Biológicos · omalizumab» |
| N4 | 08 | Xantinas — INCORRECTA: «disminuyen la contractilidad del diafragma» | 1 · p. 2, Q7 e p. 4, V/F 2 | «e) Aumenta la contractilidad del diafragma» |
| N5 | 08 | Antileucotrienos = terapia complementaria, não 1.ª escolha | 1 · p. 3, Q9; 11 · Q18 | «terapia complementaria… no ayudan con dosis altas de ICS + LABA» |
| N6 | 08 | Aminofilina = teofilina + etilendiamina (alergia) | 11 · p. 2, Q15 | «aminofilina (teofilina + etilendiamina)… reacciones alérgicas» |
| N7 | 08 | Zileutón (5-LOX) × montelukast (CysLT₁); Churg-Strauss na explicação | 11 · p. 2, Q17/Q20/Q28 e caso 4 | tabela de antileucotrienos e «Churg-Strauss» |
| N8 | 08 | Arritmia da teofilina: PDE3 + antagonismo A₁ | 11 · p. 2, Q14/Q27 | «arritmia por inhibición de PDE3 y antagonismo A₁» |
| N9 | 08 | Asma não controlada com ICS + LABA máximos: soma-se tiotropio | 1 · p. 5, 2.2 | «Tiotropio… se suma a ICS/LABA cuando no alcanzan» |
| N10 | 09 antiácidos | Esquema triplo clássico de H. pylori (IBP + claritromicina + amoxicilina, 14 d) | 2 · p. 3, Q13 | quadro «Triple clásica / Cuádruple» |
| N11 | 09 | IBP prolongado: hipomagnesemia e déficit de B₁₂ | 6 · seção K (OCR, itens de IBP) | «hipomagnesemia y déficit de B₁₂ con uso prolongado» |
| N12 | 09 | Completar: sucralfato (barreira, inibe pepsina; precisa de meio ácido) | 1 · p. 4, 2.1 | «🧱 Sucralfato» |
| N13 | 09 | Bismuto: bactericida + capa protetora (não neutraliza ácido) | 2 · p. 4, Q15 | «Sales de bismuto» |

Respostas conferidas contra o resumo do bloco (slides) e contra o gabarito dos arquivos; onde o arquivo discordava ou era vago, valeu o slide. Chave das 13: c, —, d, a, b, c, d, b, c, d, b, —, c (sem padrão previsível; 2 «completar» sem letra).

## 4. Registro por arquivo e página: item → tema/bloco → decisão

### Arquivo 1 · `farmaco p2.pdf` (5 pp.)
| Pág. | Item | Tema / bloco | Decisão |
|---|---|---|---|
| 1 | Q3 MgSO₄ no asma grave | resp. (08) | JÁ EXISTENTE `f2b08#07` |
| 1 | Q4 corticoides × leucócitos (incorreta) | 06 | JÁ EXISTENTE `f2b07#03` |
| 1–2 | Q5 corticoides no osso | 06 | JÁ EXISTENTE `f2b07#02` |
| 2 | Q6 anti-IgE | 08 | **INCLUÍDA N3** |
| 2 | Q7 xantinas incorreta | 08 | **INCLUÍDA N4** |
| 2–3 | Q8 Cushing | 06 | JÁ EXISTENTE `f2b07#01` |
| 3 | Q9 antileucotrienos | 08 | **INCLUÍDA N5** (relacionada distinta de `f2b08#11`, que cobra a tríade de Samter) |
| 3–4 | Q10 fludrocortisona V/F (4 afirmações) | 06 | JÁ EXISTENTE `f2b07#06`, `#07` (afirmações 2 e 4 = duplicata semântica) |
| 4 | V/F 1 anticolinérgicos menos eficazes no asma | 08 | JÁ EXISTENTE `f2b08#06` e resumo |
| 4 | V/F 2 teofilina e diafragma | 08 | duplicata semântica de N4 → coberta por N4 |
| 4 | V/F 3 misoprostol e gravidez | 09 | JÁ EXISTENTE `f2b09#01` (a explicação do arquivo — «aumenta a contratilidade» — não foi copiada; vale a cátedra) |
| 4 | Completar 2.1 sucralfato | 09 | **INCLUÍDA N12** |
| 5 | Completar 2.2 broncodilatador adicional | 08 | **INCLUÍDA N9** (só tiotropio; a resposta «ou teofilina» do arquivo não está no resumo e criaria duas respostas) |
| 5 | Completar 2.3 transcortina | 06 | **INCLUÍDA N2** |
| 5 | Completar 2.4 fosfolipase A₂ | 06 | JÁ EXISTENTE `f2b06#02` (mesmo mecanismo) |
| 5 | Cite 3.1 efeitos adversos das xantinas | 08 | JÁ EXISTENTE `f2b08#10` + N8 |

### Arquivo 2 · `Simulado farmaco II - 2ª parcial.pdf` (4 pp.; simulado)
Q1 glicocorticoides anti-inflamatórios/imunossupressores → JÁ `f2b07#04`, `#08` · Q2 osso → JÁ `f2b07#02` · Q3 Cushing → JÁ `f2b07#01`, `#09` · Q4 eixo HHA / suspensão gradual → JÁ `f2b07#10` · Q5 mineralocorticoide (fludrocortisona) → JÁ `f2b07#06`, `#07` · Q6 broncodilatadores → JÁ `f2b08#12` · Q7 salbutamol na crise → JÁ `f2b08#03` · Q8 roflumilast PDE4 → JÁ `f2b08#01` · Q9 omalizumab → **INCLUÍDA N3** · Q10 IBP irreversível → JÁ `f2b09#02` · Q11 interação omeprazol–clopidogrel → JÁ `f2b09#07` · Q12 CYP2C19 → JÁ `f2b09#07` (explicação) · Q13 esquema de H. pylori → **INCLUÍDA N10** · Q14 misoprostol → JÁ `f2b09#01` · Q15 bismuto → **INCLUÍDA N13**. Rótulo: complementar (simulado).

### Arquivo 3 · `1. Questionário Antihipertensivos.pdf` (6 pp.; questionário de terceiros)
Q1 PA = DC × RVP → conceito ensinado no resumo, sem questão direta de fórmula: NÃO INCLUÍDA (valor avaliativo baixo; coberto por `f2b03#22`) · Q2 diuréticos de alça → JÁ `f2b02#01`, `#04`, `#12` · Q3 tiazídicos → JÁ `f2b02#03`, `#14`, `#15` · Q4 poupadores de K⁺ → JÁ `f2b02#06`, `#10`, `#13` · Q5 β vasodilatadores → JÁ `f2b01#03`, `#12`, `#13` · Q6 α₂ centrais → JÁ `f2b03#04`, `#23` · Q7 calcioantagonistas → JÁ `f2b03#05`, `#06`, `#10`, `#12`, `#20` · Q8 IECA → JÁ `f2b03#01`, `#02`, `#17`, `#21` · Q9 ARA-II → JÁ `f2b03#13`, `#18` · Q10 vasodilatadores diretos → JÁ `f2b03#07`, `#09`, `#19` · Q11 situações especiais → JÁ `f2b02#08`, `f2b03#15`, `#19` · Q12 α₁ → JÁ `f2b01#06`, `#19`, `#25`, `#26` · Q13 prazosina → JÁ `f2b01#21` · Q14 ergóticos → JÁ `f2b01#07` · Q15 β não seletivos → JÁ `f2b01#05`, `#18` · Q16 β cardiosseletivos → JÁ `f2b01#14`, `#15`; **o item pede «duas corretas»** (A e C): sem resposta única → não incluída · Q17 β de 3.ª geração → JÁ `f2b01#03`, `#12`, `#13` · Q18 efeitos adversos dos β → JÁ `f2b01#01`, `#18` · Q19 aplicações dos β → JÁ `f2b01#15`, `#16`, `f2b11#02`. Observações de qualidade do arquivo (não copiadas): grafia «Nevibolol»; Q13 D afirma que a prazosina «não é dependente de ação central» de forma confusa. Rótulo: complementar (nenhuma incluída).

### Arquivo 4 · `Provas Compilado farmaco.pdf` (56,8 MB)
**NÃO VERIFICADO** (ver §1). Nenhum item registrado.

### Arquivo 5 · `Tabelas Farmaco Final.pdf` (3 pp.)
Tabelas-resumo de farmacologia (autor Fábio Gorgônio, 07/12/2025). **Sem questões**; nada a incluir. Não deve ser apresentada como prova.

### Arquivo 6 · `Questoes P1 P2 Farmaco_251206_172249.pdf` (22,5 MB) — só OCR, sem conferência visual
| Seção do texto OCR | Conteúdo | Decisão |
|---|---|---|
| A | recordações de P1/P2 (turmas B, C, 6A, 6G; Fila 1/2), listas de tópicos | tópicos de cardio/AINE/endócrino: JÁ EXISTENTES (blocos 01–05, 06–07, 10–14); sem gabarito conferível: PENDENTE onde falta resposta |
| B | cópia de `farmaco p2` | ver arquivo 1 |
| C | cópia de `questoes farmaco` | ver arquivo 8 |
| D | cópia da revisão da Belén (Fila 2) | ver arquivo 9 |
| E, I | variantes de «PROVA» | repetem itens de B–D: JÁ EXISTENTES |
| F | «ATIVIDAD»: 15 MCQ + caso de angina | cardio JÁ EXISTENTE (bloco 05, `f2b05#01`–`#18`); itens sem gabarito: PENDENTE |
| G | diazóxido | JÁ EXISTENTE `f2b03#07` |
| H | «PROVA 2»: IECA contraindicado, signo de la cubeta, abciximab, α-bloqueio, atenolol (rebote), propafenona, efeitos da furosemida, nitratos incorreta, carvedilol, classe IA, Prinzmetal | JÁ EXISTENTES: `f2b03#03`, `f2b14#09`, `f2b04#01`, `f2b01#06`, `#01`, `f2b14#01`, `f2b02#02`/`#04`, `f2b05#03`, `f2b01#03`, `f2b14#02`/`#04`, `f2b05#05` |
| J | notas OCR | sem questões utilizáveis |
| K | perguntas curtas 1–78 (sucralfato, H₂, antileucotrienos, esquema H. pylori, efeitos dos glicocorticoides, IBP, fludrocortisona V/F, omalizumab, xantinas, misoprostol, Addison, 11β-HSD, omeprazol–clopidogrel…) | JÁ EXISTENTES quando há questão (ver arquivos 1, 2, 11); lacunas viraram N3–N5, N10–N13; Addison/11β-HSD: JÁ `f2b07#10`, `#14` |
| L | casos de hipotireoidismo 1–4 | JÁ EXISTENTES `f2b10#07`–`#11` |

A conferência página a página (imagens, tabelas e a resposta correta de cada item) **ficou pendente** até José comprimir o arquivo.

### Arquivos 7 e 9 · Belén, Turma D, Fila 2 (`prova farmaco.pdf` 5 pp. = `Fármaco – Belén … Fila 2 (1).pdf` 5 pp.)
Q1 tiazídicos → JÁ `f2b02#03` · Q2 digoxina → JÁ `f2b14#08` · Q3 Prinzmetal → JÁ `f2b05#05` · Q4 DHP e edema → JÁ `f2b03#05` · Q5 α-metildopa → JÁ `f2b03#04` · Q6 classe Ib → JÁ `f2b14#03` · Q7 alça (incorreta) → JÁ `f2b02#04` · Q8 celiprolol → JÁ `f2b01#04` · Q9 amiodarona → JÁ `f2b14#07` · Q10 ticagrelor → JÁ `f2b04#02` · Q11 nebivolol → JÁ `f2b01#12` · Q12 verapamilo → JÁ `f2b03#06`, `f2b14#11` · Completar 13 → JÁ `f2b02#10` · Completar 14 (HPB) → JÁ `f2b01#11`, `#19` · Completar 15 (sildenafil) → JÁ `f2b05#08` · V/F 16 nitratos → JÁ `f2b05#09` · V/F 17 AAS → JÁ `f2b04#04` · V/F 18 DHP × não DHP → JÁ `f2b03#12` · Discursiva 19 → JÁ `f2b02#09` · Discursiva 20 → JÁ `f2b01#14`. Os itens de 7 e 9 são o mesmo conteúdo. A própria revisão não prova ser prova oficial: nada foi reclassificado.

### Arquivo 8 · `questoes farmaco.pdf` (3 pp.; «Dra Belen», sem gabarito)
Diazóxido → JÁ `f2b03#07` · β-bloqueador exceto → JÁ `f2b01#05`, `#10` · AINE tocolítico → JÁ `f2b06#01` · edema periférico → JÁ `f2b03#05` · clonidina → JÁ `f2b01#08` · classe Ia → JÁ `f2b14#02`, `#04` · alisquireno → JÁ `f2b03#08` · propafenona → JÁ `f2b14#01` · HCTZ → JÁ `f2b02#03` · carvedilol → JÁ `f2b01#03` · abertas: β-bloqueadores na gestação → JÁ `f2b03#15` · HAS + HBP → JÁ `f2b01#11` · dois poupadores de K⁺ → JÁ `f2b02#10` · bisoprolol/nebivolol/celiprolol → JÁ `f2b01#04`, `#12` · efeitos dos BCC → JÁ `f2b03#14` · classificação dos β → JÁ `f2b01#14`. Sem gabarito no arquivo: nenhuma inclusão.

### Arquivo 10 · `2. Questionário Antianginosos.pdf` (7 pp.; 25 itens com gabarito comentado)
Registrado por tema (comentário do gabarito): oferta × demanda de O₂ → JÁ `f2b05#14` · angina típica e ECG (T–ST–Q) → JÁ `f2b05#07` · nitroglicerina SL e até 3 comprimidos → JÁ `f2b05#01`, `#02`, `#16` · dose baixa × alta (venoso × arterial) → JÁ `f2b05#09`, `#11` · mononitrato (sem 1.º passo) → JÁ `f2b05#13` · reações adversas «exceto» → JÁ `f2b05#10`; **o arquivo trata a bradicardia como a exceção; a página, conforme a cátedra, ensina que o reflexo de Bezold-Jarisch inclui bradicardia**: divergência registrada, nada copiado · contraindicações e sildenafila → JÁ `f2b05#04`, `#08` · tolerância (24–48 h) → JÁ `f2b05#12` · β-bloqueadores (mortalidade, MVO₂, contraindicações) → JÁ `f2b05#06`, `#15` · verapamilo/diltiazem e DHP em IAM → JÁ `f2b05#05`, `#17` · AAS/clopidogrel → JÁ `f2b04#01`–`#10` · fluxo prático e casos → JÁ `f2b05#01`, `#02`. 25 itens, nenhum incluído; sem valor avaliativo novo.

### Arquivo 11 · `Simulado P2 Corticoides + Farmacologia Respiratória.pdf` (6 pp.; simulado)
| Item | Tema | Decisão |
|---|---|---|
| Q1 | 11β-HSD2 (cortisol → cortisona) | JÁ `f2b07#14` |
| Q2 | quem retém mais sal | **INCLUÍDA N1** (fludrocortisona já em `f2b07#06`/`#07`) |
| Q3 | glicocorticoide e PA (efeito permissivo) | JÁ `f2b07#01` (explicação) e resumo |
| Q4 | prednisona 20 dias: desmame | JÁ `f2b07#10` |
| Q5 | osteoporose por corticoide | JÁ `f2b07#02` |
| Q6 | fludrocortisona | JÁ `f2b07#06` |
| Q7 | corticoide × AINE (PLA2) | JÁ `f2b06#02` |
| Q8 | imunossupressão e leucócitos | JÁ `f2b07#03` |
| Q9 | broncodilatador na crise | JÁ `f2b08#03` |
| Q10 | LABA em monoterapia | JÁ `f2b08#02`, `#08` |
| Q11 | tremor por salbutamol | JÁ `f2b08#09` |
| Q12 | 1.ª escolha na EPOC (LAMA) | JÁ `f2b08#06` |
| Q13 | anticolinérgico só contra ACh | JÁ `f2b08#06` |
| Q14 | arritmia da teofilina | **INCLUÍDA N8** |
| Q15 | aminofilina e etilendiamina | **INCLUÍDA N6** |
| Q16 | MgSO₄ | JÁ `f2b08#07` |
| Q17 | zileutón | **INCLUÍDA N7** |
| Q18 | montelukast com ICS + LABA máx. | **INCLUÍDA N5** |
| Q19 | roflumilast | JÁ `f2b08#01` |
| Q20 | Churg-Strauss | **INCLUÍDA N7** (explicação) |
| 21–28 | abertas (círculo vicioso do peso, PA, 3 indicações, β₂ direto/indireto, efeitos adversos, asma × EPOC, teofilina, zileutón) | JÁ cobertas por `f2b07#05`, `#08`, `f2b08#02`, `#04`, `#06`, `#09`, `#10`, `#11` e N1/N7/N8; sem pergunta aberta nova (não há resposta única conferível em prova) |
| Casos 1–4 | Cushing iatrogênico · asma com salmeterol isolado · EPOC grave · criança com asma por exercício | JÁ `f2b07#10`/`#09`, `f2b08#08`/`#09`/`#07`, `f2b08#06`/`#01`, `f2b08#11`; sem inclusão |
O gabarito do arquivo tem uma nota imprecisa («Q3: … mas a pergunta pede o do glicocorticoide»): a página ensina o efeito permissivo; nada foi copiado do comentário.

### Referência (arquivo 0, mais antigo, 6,5 MB, só OCR)
Usada para checar repetições: os itens de prova real que reaparecem nos arquivos 1, 9 e 6 correspondem às questões já rotuladas como exame na página (cardio e AINE). Nenhuma questão do arquivo de 01/11 foi promovida a «Basada en preguntas de examen» porque a conferência visual da referência não foi possível.

## 5. Repetições, versão mais completa e substituições (8-A.1-B)
- **Comparação entre os arquivos:** `prova farmaco.pdf` = `Fármaco – Belén … Fila 2 (1).pdf`; `questoes farmaco.pdf` ⊂ `Questoes P1 P2` (seção C); `farmaco p2.pdf` ⊂ `Questoes P1 P2` (seção B); as questões de cardio repetem-se em 5–6 arquivos e todas já estavam no site.
- **Comparação com o site:** as questões parecidas foram comparadas pelo conceito e pelo raciocínio (8-A.1). Nenhuma versão do arquivo era demonstravelmente mais completa e correta que a do site: **nenhuma substituição**; todos os ids e textos antigos ficaram idênticos (verificado por diff: só linhas adicionadas, exceto os 6 números do cabeçalho/separadores do banco).
- **Relacionadas mas distintas mantidas como novas:** N5 (antileucotrienos × `f2b08#11`), N8 (teofilina × `f2b08#04`), N13 (bismuto × `f2b09#10`: aquela cobra as fezes negras; esta, o mecanismo).

## 6. Grifos, notas e traços dos alunos (somente leitura, antes de editar)
`SELECT` em `user_highlights`, `user_notes` e `user_ink_strokes` (`subject_slug='farmacologia-ii'`): 252 grifos (f2b01 85 · f2b02 68 · f2b04 17 · f2b05 63 · f2b07 6 · f2b08 2 · f2b14 2 · f2b15 9), 0 notas, 1 traço (`f2b00`).
- Nenhum texto existente foi alterado ou reordenado; só se **acrescentaram** questões no fim de três grupos (bloco e banco).
- Os 6 grifos de `f2b07` e os 2 de `f2b08` estão no texto do resumo, anterior às inserções. Os 9 grifos de `f2b15` estão na primeira questão do banco, anterior a qualquer inserção (a ocorrência de cada trecho não muda).
- O traço de `f2b00` ancora no topo da página, fora das seções tocadas.
- **Migração de dados: nenhuma necessária.**

## 7. Pendências reais
1. `Provas Compilado farmaco.pdf` (56,8 MB): não verificado. Comprimir/dividir.
2. `Questoes P1 P2` (22,5 MB): só OCR; conferir as imagens e os itens sem gabarito.
3. Referência (6,5 MB): só OCR.
4. Rótulos: itens de `farmaco p2.pdf` (recordação de 10/11/2025) já estavam no site como «de examen» (`f2b07#01`–`#03`, `f2b08#07`) por decisão anterior; os novos dela (N2–N5, N9, N12) ficaram como complementares até José confirmar a origem.
5. Divergência de conteúdo no arquivo 10 (bradicardia × Bezold-Jarisch) e a explicação do misoprostol no arquivo 1: não copiadas.
