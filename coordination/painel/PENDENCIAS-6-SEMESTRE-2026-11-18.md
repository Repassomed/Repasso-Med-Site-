# 6.º semestre · pendências de conteúdo, materiais que faltam e fila de trabalho

**Data:** 18/11/2026 · **Autor:** Claude 1 · **Main de referência:** `1ea1021f` (já com #657, #676, #677, #681 e #683 mescladas) · **Este documento não altera o site, nem testes, nem arquivos de PR de outro agente** (só acrescenta este `.md`; `PAINEL-GERAL.md` **não foi editado**, para não colidir com quem estiver atualizando o painel: ver as «linhas prontas» no fim).

## 0 · Escopo, fontes e o que **não** foi verificado

- **Matérias do 6.º semestre** = as pastas de `Site Repasso Med › Biblioteca › 6 semestre` no Drive (listagem direta em 18/11): **Farmacología II, Anatomía Patológica II, AP II Práctica, Fisiopatología II, Semiología II, Semiología II Práctica / Semiología práctica, Medicina Legal, Gestão e Saúde**. Imagenología e Bioestadística seguem **fora** (decisão de José). Neurología (7.º) não entra aqui.
- **Fontes lidas:** `coordination/painel/*` (painel de 17/11, `ANOTACOES-DRIVE.md`, checklist histórico), `coordination/source-packs/*` das matérias, `docs/medicina-legal/P2-REGISTRO-FONTE-DESTINO-628.md`, `git log` da `main`, lista de PRs abertas e as **pastas de slides atualizados** no Drive (listagem por pasta: Fisiopatología II, AP II Práctica, AP II teoría, Medicina Legal, Gestão e Saúde, Semiologia II Prática e as pastas «Questões»), além de 2 fotos de anotações abertas por OCR.
- **PRs abertas hoje:** #682 (Neurología, infográficos blocos 20–27: **fora do 6.º semestre; não tocada**), #655 (Dermatología), #658 (Guaraní), #662 (AP II Práctica, layout; **mesclada depois**, ver «Atualização de 19/11»), #539 e #520 (antigas, fora de escopo). **Nenhuma PR de outro agente foi tocada**; o que as PRs de layout/caneta ainda precisam é trabalho do Claude 4.
- **Não verificado nesta rodada:** não reabri cada PDF/slide; **não** rodei testes de navegador nem SELECT no Supabase (as contagens de grifos abaixo vêm dos registros de 17/11); não listei a pasta de slides de Farmacología II nem a de Semiología II (os registros de 17/11 dizem «nenhum arquivo novo»); a listagem do Drive foi limitada a 40–60 itens por consulta (pastas com mais arquivos podem ter itens não vistos).

## 1 · Quadro-resumo (uma linha por matéria)

| matéria | já atualizado (na `main`) | material novo/sem registro no Drive | prioridade p/ provas | próximo trabalho de maior impacto |
|---|---|---|---|---|
| **AP II Práctica** | 16 láminas (oral → páncreas) e P2 (#580); revisões #594/#595/#597 | **`15 - Nefroblastoma` e `16 - Pielonefritis crónica` (05/11): sem lâmina no site e sem registro** (0 ocorrências nos HTML e nos packs) | **Alta** (prova prática de lâminas) | **2 blocos novos + banco** (ver §3.1) |
| **Semiología II Práctica / Semiología prática** | b05–b09 pelos slides (#647); repaso recuperatório (#676) | **24 fotos manuscritas de 28/10** (`IMG-20261028-WA0093…0116`, edema/godet, síndromes pleurais…) **nunca registradas**; 4 pptx de 28/10 (derrame, pneumotórax, IC, motivo cardio) já cobertos pelos slides do #647 | Média-alta | registrar as 24 fotos (1 linha por arquivo) e integrar só o que agrega (lei de atualização contínua) |
| **Gestão e Saúde** | **nada** (não há matéria no site) | 7 pptx de 28/09 (Unidades I–IV) sem registro | Desconhecida | **decisão de José**: entra no site ou não |
| **Anatomía Patológica II** | oral→tiroides, 8 blocos; #646 (hepáticas), #666 (+3 questões), #675 (conferência do simulado) | nenhum arquivo novo; simulado e gabaritos de 09–10/11 já conferidos (#675) | Alta | fechar 4 pendências de fonte (p-ANCA, gestação, Crohn, CHC) com **Robbins em PDF < 10 MB** |
| **Farmacología II** | 14 blocos; #649, #673/#674 (slides de endócrino, levotiroxina), #677 (+4 questões), #644 | nenhum arquivo novo; slides de 17/11 comparados (#673) | Alta | **ficha técnica / Goodman & Gilman** para doses; 2 questões pendentes (depende de lembrança de José) |
| **Fisiopatología II** | 19 blocos; slides 07–13 integrados (#642/#643), matriz #647, #645 (layout) | `13 - Unidad 5` (04/11) e 17 «extratos» (10/11) **já registrados** (#647 matriz) | Média-alta | **passada visual das figuras** pendentes + livro (Porth cap. 8) |
| **Medicina Legal** | 15 blocos + banco; P2 (#628) | pasta «Questões» (`Examen`, `Prova`, `examen2`, `ilovepdf_merged` 88 MB): **sem comparação registrada nesta rodada** | Média | comparar as 3 provas legíveis com o banco; o PDF de 88 MB é ilegível pelo Drive |

## 2 · Detalhe por matéria

### 2.1 AP II Práctica · **maior lacuna de conteúdo novo**
- **Atualizado:** 16 láminas (`ap2pb01…16`: lengua, parótida, esófago/Barrett, gastritis, gástrico difuso/intestinal, cirrosis, CHC, duodenitis, Crohn, apendicitis, colon no mucinoso/mucinoso, pancreatitis crónica, adenocarcinoma de páncreas) + banco + mazo + cierre; P2 integrada na #580; layout em **#662 (mesclada em 19/11)**.
- **Falta (Drive, `AP II Prática › Slides atualizados`, criados em 05/11):** `15 - Nefroblastoma_261015_110332 (1).pdf` (5,4 MB, id `1oD1MZ11EaV6CnFjY9FFBM1Unr8AM-2cX`) e `16 - Pielonefritis cronica_261015_104549 (1).pdf` (17 MB, id `1f5B9pYH6uPKtdneKZkWXBOWR1uuG9PxI`). Os PDFs `13 - Cancer de Pancreas` e `14 - Pancreatitis cronica` já correspondem a `ap2pb16` e `ap2pb15`.
- **Prioridade p/ prova:** as láminas são a prova prática; duas láminas inteiras (renal) não existem no site.
- **Próximo trabalho:** ler os 2 PDFs (texto + figuras), criar `ap2pb17`/`ap2pb18` no padrão das láminas, perguntas (lei 8-A) e espelho no banco, atualizar contadores e a cierre; **checar grifos por SELECT somente leitura** antes (o HTML é grande e tem alunos usando) e rodar a porta. Limite conhecido: 43 imagens originais grandes da P2 sem conferência visual completa (#580).

### 2.2 Semiología II (+ Práctica)
- **Atualizado:** b01–b10 + tablas/banco/flashcards; #652 (b07 «examen físico en tres preguntas», b08 pauta de PA, b09 ritmo) e #676 (Repaso recuperatório: 12 perguntas conferidas com o PDF de 17/11). **127 perguntas no bloco e 127 no banco** (banco geral declara «127 preguntas de los 10 bloques»; conferido na `main` `b5e1a4e6` em 19/11; a contagem de 120 que constava aqui era anterior à #676). 
- **Falta / sem registro:** (a) **24 fotos manuscritas de 28/10** em `Semiologia II Pratica` (OCR funciona; ex.: «edema: grados de godet», «neumotórax: síndromes pleurales») — a tabela `ANOTACOES-DRIVE.md` só cobre 4 pastas «Anotações» e **não inclui esta pasta**; (b) livros Argente/Harrison ausentes do Drive.
- **Prioridade p/ provas:** média-alta (anotações de aluno são pistas do que a turma estudou, **não** fonte soberana).
- **Próximo trabalho:** registrar cada foto (arquivo → trecho → bloco → coberto/novo/erro → destino), integrar só o que agrega e **não** copiar erros dos alunos; grifos: b01 93 · b02 14 · b03 4 · b06 20 · banco 17 · guía 4 (17/11), então **evitar b01/b06 salvo necessidade**.

### 2.3 Anatomía Patológica II (teoría)
- **Atualizado:** b01–b08 + banco 205 (contagem declarada confere); #458/#476/#499/#609/#646/#648/#651/#666/#668/#675 (todas mescladas). 23 PDFs de anotações das 4 pastas todos rastreados.
- **Falta:** nenhum arquivo novo. **Livro-base:** Robbins/Harsh Mohan não cabem na leitura do Drive (> 10 MB); Farreras/Harrison ausentes.
- **Prioridade:** alta (simulado P2 feito); o que resta é **ciência**, não conteúdo.
- **Próximo trabalho:** com capítulos < 10 MB (hepático e gastrointestinal), fechar numa PR única: p-ANCA × CU, gestação × adenoma, granulomas no Crohn (40–60 % × ~35 %), cifras do CHC (β-catenina ≈ 40 %, p53 ≈ 60 %) e a frase «cirrosis… no es lesión premaligna». Grifo `ap2b01` «eritematosa» que não pinta: anterior, explicado.

### 2.4 Farmacología II
- **Atualizado:** 14 blocos; **232 → 236 perguntas** (#677: +4), banco espelhado; tabela de corticoides por célula, quadro de α/β/ergóticos sem dose fixa (#649); levotiroxina (#673/#674); roflumilast esclarecido (#677). 9 PDFs de anotações todos rastreados.
- **Falta:** literatura-base (Goodman & Gilman é citado nos slides e **não está no Drive**); nenhum arquivo novo desde 17/11.
- **Prioridade:** alta e **já cruzada** com P1/P2 compilados e relatos (#637, #647, #677). Pontos de dose sem fonte: nebivolol (retirado) e dose inicial de levotiroxina (só slide).
- **Próximo trabalho:** (1) ficha técnica/guia para doses; (2) as duas questões pendentes (ver §3) **só se José lembrar o enunciado**.

### 2.5 Fisiopatología II
- **Atualizado:** 19 blocos (fp2b01–fp2b19); slides 01–13 da pasta atualizada integrados (#642/#643); matriz #647; Nova Era #645 mesclada (não ativada). 5 PDFs de anotações rastreados.
- **Falta:** **figuras** dos decks (slides 3, 4, 8, 12, 15–18, tabela de Glasgow, reatividade pupilar não inspecionados) e a **tinta manuscrita do slide 08** (curvas de PCO₂); livro (Porth cap. 8, citado no slide) ausente.
- **Prioridade:** média-alta (acidose/alcalose metabólica está escrita com conhecimento geral, **sem confirmação em livro**).
- **Próximo trabalho:** passada visual das figuras restantes (renderizar páginas) e revisão humana das linhas «não confirmado em livro».

### 2.6 Medicina Legal
- **Atualizado:** b01–b15, banco, flashcards e bibliografia; P2 (Tanatología I/II, Asfixiología, Autopsia, documentos) registrada em `docs/medicina-legal/P2-REGISTRO-FONTE-DESTINO-628.md` (inclui os slides `7 dia` e `8 dia` de 02/11).
- **Falta:** comparação registrada da pasta `Questões` (`Examen.pdf`, `Prova.pdf`, `examen2.pdf`, de 21/09; `ilovepdf_merged.pdf` 88 MB não legível).
- **Pendências já registradas (#628 §F.4):** rótulo de parcial de Autopsia e Documentos («PARCIAL 1», decisão de José); Heimlich fora por ser primeiros auxílios; 1 afirmação «NO SUSTENTABLE» (momificação: o slide diz «ó» sem número) **retirada**.
- **Próximo trabalho:** cruzar as 3 provas legíveis com o banco (lei 8-A) e registrar por pergunta.

### 2.7 Gestão e Saúde
- Pasta com 7 pptx de 28/09 (Unidade I «Gestión en salud», II, III «Organización médica», IV «Organización de la urgencia», em 1.ª e 2.ª partes). **Não existe matéria no site nem registro** (0 ocorrências em `coordination`/`docs`). **Não é prioridade técnica até José decidir** se a matéria entra.

## 3 · Questões que ficaram **pendentes** (por falta de enunciado, gabarito ou fonte) — nada foi inventado

| matéria | item | por que está pendente | o que destrava |
|---|---|---|---|
| Farmacología II | **Completar 2 (famotidina)** (#677) | enunciado reconstruído a partir da resposta da foto; **sem resposta única** (a nizatidina também tem menos interação que a cimetidina) | enunciado original ou critério adicional |
| Farmacología II | **MCQ 2 (prednisona + AINE)** (#677) | a relação «corticoide + AINE» não é determinável e o resumo não a ensina | enunciado original / fonte |
| Farmacología II | #637 itens 1 e 3 (teofilina: IL-10 × apoptose; asma por exercício: corticoide × antileucotrienos) | relato **sem a resposta** | lembrança de José |
| Farmacología II | recordações P1 Belén (lista de tópicos), «tríada de Bezold-Jarisch» | **sem enunciado** | — (já coberto por `f2b05#10`) |
| AP II | **Simulado 41 · p-ANCA na colite ulcerosa** | não consta nos slides; Robbins ilegível; simulado «NO OFICIAL» | slide ou capítulo |
| AP II | **Relato 9 · gestação como fator de adenoma** | o slide cita só anticoncepcionais e esteroides | fonte |
| AP II | **Item 39 do simulado** | numeração ausente no PDF | — |
| AP II | #666: 2 pendentes (4 e 9) | ver linhas acima | idem |
| AP II | Crohn: granulomas «40–60 %» (texto) × «~35 %» (tabela) | **os dois números estão no mesmo slide** | decisão de José |
| Semiología II | **«Angina de Heberden»** e a pergunta final «causa com exceção» (#676) | o PDF diz que a transcrição não ficou clara | enunciado legível |
| Semiología II | critério de HTA (ESC 2024 × AHA/ACC) | pergunta só usa AHA/ACC; a tabela do site traz os dois | a cátedra dizer qual será cobrado |
| Semiología II | b06: 3 propostas e perguntas novas | bloqueadas por **grifos reais** (b06 = 20) | plano de migração de marcações |
| Fisiopatología II | caso do Glasgow «no se fija un puntaje total» | tabela de Glasgow do slide não inspecionada | ler a figura |
| Fisiopatología II | acidose/alcalose metabólicas (seção 6, bloco 15) | sem livro | Porth cap. 8 |
| Medicina Legal | etiqueta de parcial (Autopsia, Documentos) | decisão editorial | José |

## 4 · Fila única (ordem sugerida, com fonte e próximo passo)

| # | trabalho | fonte | resultado esperado | depende de | impacto / risco |
|---|---|---|---|---|---|
| 1 | **AP II Práctica: 2 láminas novas** (nefroblastoma, pielonefritis crónica) — **em andamento na PR #689 (aberta em 19/11, não é minha; aguardar auditoria)** | Drive `AP II Prática › Slides atualizados` (ids acima) | `ap2pb17`/`ap2pb18` + perguntas + banco + cierre, porta aberta | SELECT de grifos (somente leitura); **não** mexer em #662 | **alto** / médio |
| 2 | **Semiología II: registrar e comparar as 24 fotos de 28/10** | Drive `Semiologia II Pratica` (24 JPG) | tabela por arquivo + integração seletiva; linhas novas em `ANOTACOES-DRIVE.md` | evitar b01/b06 (grifos) | médio-alto / baixo |
| 3 | **Pedir a José capítulos em PDF < 10 MB** | Robbins (hepático/GI), Goodman & Gilman (corticoides, respiratório, endócrino), Argente/Harrison, Porth cap. 8 | destrava **8 pendências** de 4 matérias | José | alto / nenhum |
| 4 | Fechar pendências de AP II numa PR única | capítulos do item 3 | p-ANCA, gestação, Crohn, CHC resolvidos ou mantidos com ressalva | item 3 | alto / baixo |
| 5 | Farmacología II: doses em ficha técnica | ficha técnica/guia | nebivolol e levotiroxina confirmados (ou mantidos sem número) | José/fonte | médio / baixo |
| 6 | Fisiopatología II: passada visual das figuras pendentes | PDFs/pptx da pasta | lacunas de §2.5 fechadas ou registradas | — | médio / baixo |
| 7 | Medicina Legal: cruzar `Examen`, `Prova`, `examen2` com o banco | Drive `Medicina Legal › Questões` | registro por pergunta (acrescentada/duplicada/pendente) | — | médio / baixo |
| 8 | Decisões editoriais de José | §3 | parcial ML, critério de HTA, Crohn %, Gestão e Saúde | José | — |
| 9 | Painel: atualizar após os merges de 17–18/11 | este documento (§5) | `PAINEL-GERAL.md` em dia | quem estiver com o painel | baixo |
| — | **Nova Era (#655, #658; #662 já mesclada)** | painel | continua com o **Claude 4**; este documento não os altera | — | — |

## 5 · Linhas prontas para o painel (não aplicadas)
- AP II Práctica: «**⬜ novo no Drive (05/11): 15 Nefroblastoma e 16 Pielonefritis crónica, sem lâmina no site**».
- Semiología II: «**24 fotos de anotações de 28/10 (`Semiologia II Pratica`) sem registro**».
- Farmacología II: «#677 mesclada: 236 perguntas; pendentes completar 2 e MCQ 2». Neurología (7.º): #669, #681 e #683 mescladas (254 perguntas, 186 glosas).
- Gestão e Saúde: «pasta com 7 pptx, **sem matéria no site**».

## 6 · Autoauditoria
- Cada «já atualizado» sai de PR **mesclada** (conferida em `git log origin/main`) ou de pack/registro citado; cada «falta» sai da listagem do Drive de 18/11 **cruzada** com busca no repositório (nefroblastoma, pielonefritis, `IMG-20261028`, «Gestão e Saúde»: 0 ocorrências).
- Limites: listagem do Drive por consulta (paginação limitada); nenhuma comparação de conteúdo foi refeita; contagens de grifos e testes são **as registradas em 17/11**; a avaliação de «prioridade para provas» é **inferência a partir do tipo de material** (lâminas = prova prática; anotações de aluno = pista, não fonte), **não** informação de calendário de provas.
- Nada foi mesclado, ativado ou escrito em banco; nenhum arquivo de outra PR foi tocado.

## 7 · Atualização de 19/11 (correções e vínculo com a fila geral #686)
**Correções ao texto de 18/11**
- **Semiología II:** a contagem atual na `main` é **127 perguntas (127 no bloco e 127 no banco)**, não 120 (§2.2 já corrigido). Conferido por contagem dos itens `.quiz-item` do HTML (254 = 127 + 127) e pelo cabeçalho do banco.
- **PRs:** #662 (AP II Práctica, layout) foi **mesclada**; surgiu a **#689** (AP II Práctica, blocos 17 e 18 do Final = as duas láminas pendentes do §2.1/§4 item 1). **#687** (Neurología, conferência 8-A.1-B) e **#682** (infográficos de Neurología) seguem abertas; #655, #658 (Nova Era), #539 e #520 inalteradas.
- Neurología **fora** deste documento (7.º semestre); sua reconferência está na #687.

**Como este documento se liga à fila geral de questões — issue [#686](https://github.com/Repassomed/Repasso-Med-Site-/issues/686)** («P1 · Conferência geral das questões de prova e versões mais completas por matéria»; aberta em 18/11; lei 8-A, especialmente 8-A.1-B; uma matéria por vez; José decide os merges). Pedido da #686 × estado do 6.º semestre:
| Item da #686 | Estado (19/11) | Evidência / próximo passo |
|---|---|---|
| Neurología: reconferir #683, `q-neu135`, `q-neu131`, fotos e casos | **em PR #687** (aguarda auditoria) | pack `neurologia-8a1b-conferencia-v1.md` |
| Farmacología II | **não feita nesta fila**; há reconstrução prévia de questões (#677) sem a comparação 8-A.1-B por item | abrir tarefa própria; usar `farmacologia-ii-questoes-reconstrucao-1911-v1.md` como base |
| Anatomía Patológica II | **não feita**; simulado de 09–10/11 já conferido (#675) | idem; fechar antes as 4 pendências de fonte (§3) |
| Fisiopatología II | **não feita** | pasta `Questões` (id `1tZo0KiljzAMY1jlVzTZoRimNpcOr8eGa`) por abrir |
| Semiología II | **não feita**; 127 perguntas no site | pasta `Questões` (id `11P-gA_0jZ556kjzKz905AXMhCbStIxKE`) por abrir; PDF de 17/11 já conferido na #676 |
| Medicina Legal | **não feita** (§2.6: cruzar `Examen`, `Prova`, `examen2`) | pasta `Questões` (id `1krKv7ElfW0w6kzc8Qha-exZOsJFNB_PN`) |
| AP II Práctica / Gestão e Saúde | sem pasta de provas registrada; Gestão e Saúde sem matéria no site | decisão de José (§2.7) |
| Demais matérias; Imagenología e Bioestadística | fora do 6.º semestre / **fora** até serem refeitas | — |
**Ordem sugerida para a #686 no 6.º semestre** (prioridade de prova × impacto): 1) Medicina Legal (3 provas legíveis ainda sem registro por pergunta); 2) Semiología II (127 perguntas, 1 PDF já conferido); 3) Farmacología II; 4) Anatomía Patológica II; 5) Fisiopatología II. **Aprendizado da #687 a aplicar em cada uma:** incluir os ids de formato não numérico (ex.: `q-neu-2509-NN`) no buscador de duplicatas, comparar pelo raciocínio e não pelo tema, e preservar ids mesmo ao conciliar duplicatas. Este item **não** marca a #686 como concluída.
