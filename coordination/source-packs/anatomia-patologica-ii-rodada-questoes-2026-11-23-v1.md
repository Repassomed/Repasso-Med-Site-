# AP II (teoria) · rodada completa de questões — 23/11/2026
Executor: Claude 1 · Base: `main` `68f212a9` · Branch `claude/ap2-questoes-rodada-2026-11-22` · Leis aplicadas: MANUTENCAO-DIDATICA §8-A (8-A.1 a 8-A.11), G0, atualização contínua (§12 annotation-safety).
Plano de partida: o levantamento da PR #702 (`levantamento-questoes-farmaco2-anapat2-*`). **Nenhuma outra matéria foi alterada.** Não toquei as PRs #687 e #682. Sem merge.

## 1 · RESUMO PARA MERGE
- **Fontes reabertas nesta rodada (conteúdo lido de novo, item a item):** Simulado P2 respondido (51 numerações, 50 itens) · Provas_P1_Resolvidas (92 itens; o texto extraído nesta rodada traz gabarito e explicação — o levantamento anterior os registrou por engano como «só em cor») · 01_F61DBCA78F50 Perguntas e Respostas Provas 2026 (~70 perguntas distintas) · prova_anatopato_formatada (19 distintas) · os 3 JPEG de gabarito de P2 (6H, 6E, Fila 1; imagens vistas) · Simulado «Revisão» (50 MCQ, simulado de aluno) · slides da cátedra Clase 1 a 7 (texto lido: Clase 1, 2, 3, 4, 5, 6 e a Clase 7 nova).
- **Perguntas detectadas nas fontes das classes A/B:** 92 (P1 Resolvidas) + 67 (01_F61) + 19 (prova formatada) + 51 (Simulado P2) + 36 linhas de respostas escritas (JPEG) + 50 (Revisão).
- **Acrescentadas ao site: 19 perguntas** («Basada en preguntas de examen»; 9 MCQ + 10 abertas), todas com 1 parágrafo de ensino só onde faltava (3 parágrafos novos: b02, b04, b06). Site: **205 → 224 perguntas únicas**; baseadas em exame **138 → 157**; complementares/variantes 67 (iguais); V/F 10 (iguais); banco **224 = blocos 224, divergência 0**.
- **Melhoradas (id/posição preservados, bloco e banco juntos):** b02#20 (complicações da ERGE: o adenocarcinoma deixa de ser oferecido como complicação direta — slide Clase 2 e prova 6H) · 7 perguntas com alternativas desequilibradas (b01#13, b02#1, #16, #17, #23, b04#18, b05#7: só os distratores foram acrescentados em detalhe; a correta, o gabarito e as letras da explicação não mudaram) · pistas visuais: itálico retirado das alternativas de 7 perguntas e negrito retirado dos enunciados de 9 perguntas (bloco e banco).
- **Repetidas/duplicatas semânticas descartadas:** ver §4 (marcadas REPETIDA: a mesma ideia aparece em mais de uma turma/arquivo e vira uma só pergunta). **Reformuladas por 8-A.1-B:** 1 (b02#20). **Pendentes:** 9 (§6).
- **Grifos:** 739 grifos reais lidos do Supabase em modo leitura (só texto marcado, contexto e ocorrência; sem aluno) reancorados com o motor real `rm-tools.js`: **738 ancoram antes e 738 depois, 0 perdidos, 0 movidos** (o 1 que não ancora — `ap2b01` «eritematosa» — já não ancorava na main). Traços da caneta e notas: nenhum registro para AP II.
- **Testes:** `ap2-rodada.test.cjs` **31/31 OK**; V/F: 20 de 20 com clique em VERDADERO e 20 de 20 com clique em FALSO (10 no bloco + 10 no banco, função real `checkTF`); Guard e demais verificações no §8.
- **Limitações:** ver §9. **Falta decisão humana:** ver §10.

## 2 · O que muda para o aluno
- 19 perguntas novas, cada uma depois de o bloco ensinar o assunto (3 parágrafos curtos novos no ensino: prognóstico e imunohistoquímica do carcinoma epidermoide de esôfago; lesões precursoras do adenocarcinoma gástrico; dieta e câncer de cólon).
- A pergunta sobre complicações da ERGE passa a aceitar Barrett e hemorragia sem oferecer o adenocarcinoma como complicação direta.
- Alternativas e enunciados sem pista visual (sem itálico nas alternativas, sem negrito nos enunciados); 7 perguntas com alternativas mais equilibradas.
- Contadores do banco: 224 perguntas, 157 baseadas em exame, 67 variantes, 10 V/F, 8 blocos; por bloco 38/32/25/26/26/23/37/17.
- Grifos existentes continuam no lugar (prova com o motor real).

## 3 · MATRIZ POR FONTE (8-A.11)
| Fonte (Drive) | Como foi aberta · legibilidade | Detectadas | Aproveitadas | Novas | Melhoradas | Repetidas | Pendentes | Observação |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Provas_P1_Resolvidas_AP2 (`196Rty4Ja9dqw5nR9o5tVLcMHTABNcplM`) · prova lembrada, 6C/6D/6E/6F/6H | texto extraído por página (49 págs.), CLARA; gabarito e explicação no texto | 92 | 91 | 13 | 1 | 5 | 1 | a seção «casos prováveis dos pareos» (p. 43–48) foi redigida pelo autor do PDF e diz que «não são questões reais»: NÃO usada. 2 alternativas «não recuperadas» (sem efeito) |
| 01_F61DBCA78F50 Perguntas e Respostas Provas 2026 (`1Nua6QlafM9_9TwjzhpWseDeYmkEl8Shv`) · P1 recordada | texto extraído, CLARA | 67 | 65 | 5 | 1 | — | 2 | — |
| prova_anatopato_formatada (`1HD8Cd81IAM3XY1RnON8QpL_s0YuXSRkY`) · prova com anotações | texto extraído (digitado + manuscrito), PARCIAL (manuscrito) | 19 | 18 | 6 | — | — | 1 | gabaritos das de marcar conferidos com os slides |
| Gabarito AP II P2 6H filas 1 e 2 (`1s2vLSaCZ0AiubFMV375DoNSmG7UJNhLb`) | imagem vista, CLARA | escritas 1–11 (fila 1) e 3, 6–11 (fila 2) + letras 12–17 de cada fila | todas as escritas | ver §4 | — | — | 0 | letras de MCQ (12–17) IGNORADAS PARA CONTEÚDO (8-A.5-A) |
| Gabarito P2 6E filas 1, 2 e 3 (`1qBuVnYkS48fPHHGZ9VhMXg1DyJlisEuG`) | imagem vista, CLARA | escritas das 3 filas | todas menos 3 «localização» | ver §4 | — | várias «ver fila 1» | 3 | letras ignoradas; 3 «localização» sem enunciado |
| Gabarito P2 «Fila 1» sem turma (`1r6SwQguU0F9SUVAYNa4_dXNpUaMLPbFp`) | imagem vista, CLARA | 11 escritas + letras | 10 | 1 (item 11) | — | — | 1 («vellosa») | — |
| Simulado P2 respondido (`1IpbVkmkQBBS4JS6IKW0M5zvJNEWkMf5m`) · **identificado por José como base de exame**; o próprio arquivo diz «NO OFICIAL: reconstrução + 20 inéditas» sem separar quais | texto extraído, CLARA | 50 (+ numeração 39 ausente) | 49 | 1 | — | — | 2 | os itens já estavam no site como «Basada en preguntas de examen» (#666); aqui só o item 8 pedia uma pergunta nova |
| Simulado «Revisão» (`1WhCiu0XQValoQnaIPHt1Y26vAsl87GTh`) · simulado de aluno de 29/10/2025 (classe B) | texto extraído, CLARA | 50 | 48 | 2 | — | — | 2 | não é evidência de prova; 2 novas coincidem com evidência de prova (itens 1 e 36) |
| Slides da cátedra Clase 1–7 (pasta «Anatomía Patológica II») | texto lido; Clase 7 = versão de 05/11 | — | usados para conferir cada resposta | — | — | — | — | Clase 8 (tiroides) não relida: nenhuma pergunta de tiroides foi tocada |
| Não reabertos nesta rodada | Banco de 66, Compilado P1, Simulado_100, Exame AP II, Exame Patologia Intestinal, Perguntas Anatopato P2, Apunte | — | — | — | — | — | — | classe C (origem incerta) — não priorizados; mantêm o registro do levantamento #702 |

## 4 · REGISTRO POR ITEM (fonte → item → decisão → destino)
Legenda: **COBERTA** = o site já pergunta o mesmo raciocínio e a mesma resposta (comparados enunciado, alternativas, resposta e explicação, não só o tema) · **ACRESCENTADA** = pergunta nova (nome entre « » em §5) · **MELHORADA** = pergunta existente reformulada com o mesmo id/posição · **REPETIDA** = mesma ideia de outro item/arquivo, vira uma só pergunta · **PENDENTE** = não aproveitada, com motivo.

### 4.1 Provas_P1_Resolvidas_AP2 — COBERTA 72 · ACRESCENTADA 13 · MELHORADA 1 · REPETIDA 5 · PENDENTE 1
| Item | Decisão | Destino | Motivo / observação |
|---|---|---|---|
| 001 | ACRESCENTADA | b01 «afta» | vinheta de diagnóstico (afta × mucocele × sialoadenitis × herpes); b01#5 cobra só a patogenia |
| 002 | COBERTA | b01#19 | fibroma de irritação (linha de mordida): mesmo raciocínio e resposta |
| 003 | ACRESCENTADA | b01 «granuloma piógeno» | gestante, gengiva, massa vermelha: histologia; só havia a pergunta aberta b01#30 |
| 004 | COBERTA | b01#17 | vesícula (completar) idêntica |
| 005 | COBERTA | b01#6, #17, #22 | quadro macro/micro do VHS |
| 006 | COBERTA | b02#23 | biópsia da borda para VHS (explicação) |
| 007 | COBERTA | b01#6 | histologia do VHS |
| 008 | COBERTA | b01#7, #21 | membrana desprendível do muguet |
| 009 | COBERTA | b01#16 | candidíase eritematosa |
| 010 | COBERTA | b01#33 | candidíase hiperplásica = biópsia |
| 011 | COBERTA | b01#7, #21 | muguet |
| 012 | COBERTA | b01#21 | muguet (mesma resposta) |
| 013 | COBERTA | b01#20 | histologia da leucoplasia |
| 014 | ACRESCENTADA | b01 «tabaquismo» | fator de risco adquirido da leucoplasia; o ensino já dizia, não havia pergunta |
| 015 | COBERTA | b01#1, #28 | leucoplasia: não se desprende, risco de displasia |
| 016 | COBERTA | b01#20 | histologia (hiperqueratose/acantose) |
| 017 | COBERTA | b01#3, #13 | fatores do CCE oral (álcool+tabaco; VPH-16) |
| 018 | COBERTA | b01#2, #28 | precursoras orais (leucoplasia/eritroplasia); ressalva do termo «displasia escamosa» registrada |
| 019 | ACRESCENTADA | b01 «VPH» | vinheta de orofaringe (não fumante, base da língua) → VPH; b01#13 cobra a assinatura molecular |
| 020 | COBERTA | b01#27 | Sjögren |
| 021 | COBERTA | b01#18 | bactérias da sialoadenite |
| 022 | COBERTA | b01#18, #31 | sialoadenite bacteriana com litíase/abscesso |
| 023 | COBERTA | b01#18, #29 | alternativas trocadas entre entidades: mesmo conceito |
| 024 | COBERTA | b01#12 | mucocele |
| 025 | COBERTA | b01#12 | mucocele (mesma resposta) |
| 026 | COBERTA | b01#10, #34 | glândula sublingual |
| 027 | COBERTA | b01#26, #32 | macro/micro do adenoma pleomorfo |
| 028 | COBERTA | b01#26, #32 | adenoma pleomorfo (vinheta) |
| 029 | COBERTA | b01#26 | histologia bifásica |
| 030 | COBERTA | b01#9, #25 | Warthin: camada dupla/oncocítica |
| 031 | COBERTA | b01#25 | Warthin |
| 032 | COBERTA | b01#9, #25 | Warthin (vinheta) |
| 033 | COBERTA | b01#24 | mucoepidermoide |
| 034 | COBERTA | b02#1, #2 | acalasia por Chagas |
| 035 | COBERTA | b02#1 | acalasia |
| 036 | COBERTA | b02#1, #2 | acalasia secundária |
| 037 | ACRESCENTADA | b02 «várices» | vinheta: hematemese no cirrótico alcoólico → várices (3 turmas) |
| 038 | REPETIDA | b02 «várices» | mesma ideia de 37 (outra turma): uma só pergunta |
| 039 | REPETIDA | b02 «várices» | mesma ideia de 37 (pareo): uma só pergunta |
| 040 | ACRESCENTADA | b02 «Mallory-Weiss» | vinheta com laceração na JEG (3 ângulos: local, mecanismo, contexto); b02#3 cobra a profundidade × Boerhaave |
| 041 | REPETIDA | b02 «Mallory-Weiss» | mesma pergunta/mecanismo (vômitos repetidos) |
| 042 | REPETIDA | b02 «Mallory-Weiss» | mesmo achado, ângulo «antecedente» — uma só pergunta cobre os três |
| 043 | COBERTA | b02#26 | biópsia da base para CMV |
| 044 | COBERTA | b02#24 | colorações para hifas |
| 045 | COBERTA | b02#23 | esofagite por VHS (vinheta) |
| 046 | COBERTA | b02#5 | eosinófilos e neutrófilos na ERGE |
| 047 | MELHORADA | b02#20 | «complicações da ERGE»: o adenocarcinoma não entra como complicação direta (slide: úlceras, hematêmese, melena, estenose, Barrett) |
| 048 | ACRESCENTADA | b02 «clínica da ERGE» | pirose e regurgitação; o ensino já dizia |
| 049 | COBERTA | b02#4, #22 | distensão gástrica → relaxamento transitório do EEI |
| 050 | COBERTA | b02#22 | tono do EEI |
| 051 | COBERTA | b02#22 | hérnia de hiato |
| 052 | COBERTA | b02#5 | histologia da ERGE |
| 053 | COBERTA | b02#5 | histologia da ERGE grave |
| 054 | ACRESCENTADA | b02 «Barrett histologia» | metaplasia intestinal com células caliciformes (completar) |
| 055 | PENDENTE | — | macroscopia do Barrett (mucosa vermelha aveludada): está no ensino; baixa prioridade, sem pergunta direta |
| 056 | COBERTA | b02#10 | biópsia do Barrett (protocolo de Seattle); «terço distal» no ensino |
| 057 | ACRESCENTADA | b02 «Barrett histologia» | espelho de 53: Barrett × ERGE × displasia |
| 058 | COBERTA | b02#9, #21 | displasia do Barrett: segmento longo ≥ 3 cm |
| 059 | COBERTA | b02#13 | glândulas e mucina do adenocarcinoma |
| 060 | COBERTA | b02#15 | displasia escamosa |
| 061 | ACRESCENTADA | b02 «prognóstico» | metástase ganglionar = mau prognóstico do CCE esofágico (2 turmas) |
| 062 | REPETIDA | b02 «prognóstico» | mesma pergunta de 61 com outras alternativas |
| 063 | COBERTA | b02#12 | terço médio → álcool/epidermoide |
| 064 | COBERTA | b02#12 | terço distal → refluxo/adenocarcinoma |
| 065 | COBERTA | b03#2 | neutrófilos intraepiteliais = atividade |
| 066 | COBERTA | b03#21 | AINE → prostaglandinas |
| 067 | COBERTA | b03#17 | Curling no duodeno proximal |
| 068 | COBERTA | b03#17 | Curling |
| 069 | COBERTA | b03#3, #17 | Curling/Cushing |
| 070 | COBERTA | b03#3, #13 | Cushing |
| 071 | COBERTA | b03#17 | Curling |
| 072 | COBERTA | b03#5 | H. pylori: neutrófilos e plasmócitos |
| 073 | COBERTA | b03#5, #22; b04#5 | H. pylori: linfoma e adenocarcinoma intestinal |
| 074 | COBERTA | b03#19 | azul de metileno e prata |
| 075 | COBERTA | b03#5 | agregados linfoides → MALT |
| 076 | COBERTA | b04#5 | MALT e H. pylori |
| 077 | COBERTA | b04#5 | MALT e H. pylori |
| 078 | COBERTA | b03#22 | complicações (atrofia multifocal → adenocarcinoma) |
| 079 | ACRESCENTADA | b03 «neoplasias do H. pylori» | completar de produção: linfoma MALT + adenocarcinoma intestinal |
| 080 | COBERTA | b03#22 | sequência da pangastrite |
| 081 | COBERTA | b03#7 | linfócitos T CD4+ contra H+/K+-ATPase (na alternativa correta) |
| 082 | COBERTA | b03#20 | autoanticorpos |
| 083 | ACRESCENTADA | b03 «autoimune micro» | atrofia difusa + infiltrado linfoplasmocitário (também 6E fila 1 item 2) |
| 084 | COBERTA | b03#6 | atrofia difusa autoimune |
| 085 | COBERTA | b03#6; b04#10 | I/II/III: mesmo raciocínio (formato I-II-III não replicado) |
| 086 | COBERTA | b03#7 | gastrina alta + B12 baixa |
| 087 | ACRESCENTADA | b03 «EUP duodeno» | localização da úlcera péptica (2 turmas) |
| 088 | COBERTA | b03#4 | critérios de benignidade (resumo e b03#4) |
| 089 | COBERTA | b03#4 | «toda úlcera gástrica deve ser biopsiada» (resumo + nota de b03#4) |
| 090 | COBERTA | b03#18 | úlcera antral → teste do hálito |
| 091 | COBERTA | b03#12, #18 | úlcera duodenal → H. pylori |
| 092 | COBERTA | b03#18 | úlcera antral → teste do hálito |

### 4.2 01_F61DBCA78F50 (P1 recordada) — COBERTA 59 · ACRESCENTADA 5 · MELHORADA 1 · PENDENTE 2
| # | Pergunta recordada | Decisão | Destino / motivo |
|---|---|---|---|
| 1 | Cite 2 bactérias da sialoadenite | COBERTA | b01#18 |
| 2 | Regra de malignidade das glândulas salivares | COBERTA | b01#10, #34 |
| 3 | Patogenia do mucocele | COBERTA | b01#12 |
| 4 | Placa branca que não se desprende + tabagismo → leucoplasia | COBERTA | b01#1, #28 + «tabaquismo» (N) |
| 5 | Micro da leucoplasia | COBERTA | b01#20 |
| 6 | Lesão vermelha = eritroplasia | COBERTA | b01#2 |
| 7 | Base histopatológica dos nódulos reativos (cordas vocais): hiperplasia de tecido conjuntivo | PENDENTE | não consta nos slides da Clase 1 nem na literatura acessível; não acrescentada |
| 8 | VHS-1 no imunodeprimido/quimioterapia | COBERTA | b02#23 |
| 9 | 2 achados macro do VHS | COBERTA | b01#17 |
| 10 | 2 achados micro do VHS | COBERTA | b01#6, #22 |
| 11 | Muguet | COBERTA | b01#7, #21 |
| 12 | 2 colorações para hifas | COBERTA | b02#24 |
| 13 | Localização da úlcera de Curling | COBERTA | b03#17 |
| 14 | Localização do CCE esofágico | COBERTA | b02#12 |
| 15 | Localização do adenocarcinoma esofágico | COBERTA | b02#12 |
| 16 | Precursora do CCE esofágico: displasia escamosa | COBERTA | b02#15 |
| 17 | Perolas de queratina | COBERTA | b02#14 |
| 18 | Agente infeccioso do CCE (VPH) | COBERTA | b02#12 (subgrupo), b01#13 |
| 19 | Fator anatômico da esofagite por reflexo: hérnia hiatal | COBERTA | b02#22 |
| 20 | 2 achados micro da esofagite por refluxo | COBERTA | b02#5 |
| 21 | Complicações da ERGE | MELHORADA | b02#20 (adenocarcinoma não é complicação direta) |
| 22 | Classificação do Barrett por tamanho | COBERTA | b02#21 |
| 23 | 2 achados micro do Barrett/adenocarcinoma (glândulas e mucina) | COBERTA | b02#13 + «Barrett histologia» (N) |
| 24 | Causa do Mallory-Weiss: vômitos repetidos | ACRESCENTADA | b02 «Mallory-Weiss» |
| 25 | Defeito da acalasia | COBERTA | b02#1 |
| 26 | Causa das varizes: cirrose/hipertensão portal | ACRESCENTADA | b02 «várices» |
| 27 | Hematêmese masiva no alcoólico em choque → varizes | ACRESCENTADA | b02 «várices» |
| 28 | Fator de mau prognóstico do CCE esofágico: invasão ganglionar | ACRESCENTADA | b02 «prognóstico» |
| 29 | Estudo auxiliar em tumores esofágicos pouco diferenciados: imunohistoquímica | ACRESCENTADA | b02 «IHQ» + 1 parágrafo no ensino do b02 |
| 30 | Macro do CCE esofágico (3 formas) | COBERTA | b02#25 |
| 31 | Micro do CCE esofágico | COBERTA | b02#14 |
| 32 | 2 tumores da gastrite autoimune | COBERTA | b04#15 |
| 33 | Autoanticorpos da gastrite autoimune | COBERTA | b03#20 |
| 34 | Colorações do H. pylori | COBERTA | b03#19 |
| 35 | Complicações crônicas da EUP (hemorragia, perfuração) | COBERTA | b03#8 (hemorragia mais frequente); perfuração no resumo |
| 36 | Benignidade da úlcera (tamanho pequeno, bordas, pregas radiantes) | COBERTA | b03#4 |
| 37 | Pólipos juvenis: cistos com mucina | COBERTA | b06#1 |
| 38 | Adenoma tubular | COBERTA | b06#16 |
| 39 | Colite ulcerosa: mucosa/submucosa, reto contínuo, pseudopólipos | COBERTA | b05#3, #17, #12 |
| 40 | Linfócitos T na resposta autoimune | COBERTA | b03#7 |
| 41 | Fatores do adenoma hepático: ACO | COBERTA | b07#2, #16 |
| 42 | BilIN-3 (nome completo) | COBERTA | b07#10 |
| 43 | 2 mutações do CHC | COBERTA | b07#15 |
| 44 | Citar fibroma e granuloma piógeno | COBERTA | b01#30 + «granuloma piógeno» (N) |
| 45 | 2 formas clínicas da candidíase (pseudomembranosa e hiperplásica) | COBERTA | b01#21, #33 |
| 46 | 2 fatores de reativação do herpes | COBERTA | b01#23 |
| 47 | 2 complicações da parotidite do adulto | COBERTA | b01#29 |
| 48 | Histopatologia da afta (halo eritematoso + membrana fibrinopurulenta) | COBERTA | b01#5 + «afta» (N) |
| 49 | Fator associado às aftas: doença celíaca | COBERTA | b01#5 |
| 50 | Vírus da gengivoestomatite herpética aguda: VHS-1 | COBERTA | ensino do b01; sem pergunta direta (coberta como fato do resumo) |
| 51 | Prova de Tzanck | COBERTA | b01#22 |
| 52 | Forma mais frequente de candidíase: pseudomembranosa | COBERTA | b01#21 |
| 53 | Composição da membrana (fibrina, neutrófilos, restos epiteliais) | COBERTA | b01#7 (exsudato fibrinopurulento); «restos epiteliais» só nesta recordação |
| 54 | Leucoplasia = maligna até prova em contrário (5–25% displasia) | COBERTA | b01#28 |
| 55 | Eritroplasia ≈ 90% displasia grave/CIS | COBERTA | b01#2 |
| 56 | Localização mais frequente do CCE oral | COBERTA | b01#4 |
| 57 | CCE por HPV-16: melhor prognóstico (menos mutações, p16) | COBERTA | b01#13 |
| 58 | Doença maior associada à xerostomia: Sjögren | COBERTA | b01#27 |
| 59 | Lesão inflamatória mais frequente das salivares: mucocele | COBERTA | b01#12 |
| 60 | Sialoadenite bacteriana submandibular: cálculos | COBERTA | b01#31 |
| 61 | Tumor mais frequente da parótida (60%): adenoma pleomorfo | COBERTA | b01#32 |
| 62 | Histologia do adenoma pleomorfo (heterogeneidade) | COBERTA | b01#26 |
| 63 | Warthin: tabagismo | COBERTA | b01#9 |
| 64 | Warthin: camada luminal oncocítica | COBERTA | b01#25 |
| 65 | Tumor maligno mais frequente da salivar: mucoepidermoide | COBERTA | b01#8 |
| 66 | Mucoepidermoide: 3 tipos celulares | COBERTA | b01#24 |
| 67 | Células mucinosas identificadas por coloração para mucinas | PENDENTE | detalhe do slide (Clase 1) sem pergunta equivalente; baixa prioridade |

### 4.3 prova_anatopato_formatada — COBERTA 12 · ACRESCENTADA 6 · PENDENTE 1
| # | Item | Decisão | Destino / motivo |
|---|---|---|---|
| 1 | 1 e 12 · Lesões precursoras do adenocarcinoma gástrico: displasia e adenomas gástricos | ACRESCENTADA | b04 «precursoras» + 1 parágrafo no ensino do b04 (slide Clase 4) |
| 2 | 2 e 14 · Manifestações extraintestinais da CU (pericolangite, CEP) | ACRESCENTADA | b05 «CU hepatobiliar» |
| 3 | 3 e 15 · Fatores prognósticos do adenocarcinoma de cólon | COBERTA | b06#7 |
| 4 | 4 e 16 · Patologias associadas ao carcinoide gástrico | COBERTA | b04#16 |
| 5 | 5 e 17 · Localização mais frequente de Crohn: íleo terminal | COBERTA | b05#10 |
| 6 | 6 · Pólipo com malformações focais císticas: juvenil | COBERTA | b06#1 |
| 7 | 7 · Borrmann: massa ulcerada infiltrante (III) | COBERTA | tabela de Borrmann no ensino do b04 e b04#3; sem pergunta direta do tipo III (baixa prioridade) |
| 8 | 8 · Alteração com maior risco na CU que em Crohn: CEP | COBERTA | b05#9 |
| 9 | 9 · >100 adenomas tubulares: mutação de APC | COBERTA | b06#4 |
| 10 | 10 · Massa gástrica ulcerada de células fusiformes: GIST | COBERTA | b04#17, #6 |
| 11 | 11 · Inflamação parcheada + abscesso críptico + granuloma: Crohn | COBERTA | b05#2 |
| 12 | 12 (marcar) · Fator de risco do câncer de sigmoide: dieta rica em lipídios | ACRESCENTADA | b06 «dieta» + 1 parágrafo no ensino do b06 (slide Clase 6) |
| 13 | 13 · Linitis plástica: carcinoma difuso | COBERTA | b04#2 |
| 14 | Citar manifestação clínica de Crohn | ACRESCENTADA | b05 «clínica do Crohn» |
| 15 | Citar 2 achados microscópicos do adenoma de cólon | ACRESCENTADA | b06 «adenoma micro» |
| 16 | Citar fatores do adenoma hepático | COBERTA | b07#2, #16 |
| 17 | Citar 2 pólipos não neoplásicos | ACRESCENTADA | b06 «não neoplásicos» |
| 18 | Pólipo com músculo liso arborizado: Peutz-Jeghers | COBERTA | b06#2, #20 |
| 19 | Adenoma hepático com melhor prognóstico (resposta em branco no arquivo) | PENDENTE | CONFLITO: slide (Clase 7) diz «inflamatórios: baixo risco» e não declara o risco do subtipo HNF1-α; Robbins aponta HNF1-α como o de menor risco; sem resposta no arquivo; nenhuma pergunta criada |

### 4.4 Gabaritos em imagem (respostas escritas) — COBERTA 30 · ACRESCENTADA 2 · REPETIDA 2 · PENDENTE 2
| # | Item | Decisão | Destino / motivo |
|---|---|---|---|
| 1 | 6H fila 1 · 1 Borrmann II (massa ulcerada bem delimitada, bordas sobrelevadas) | COBERTA | b04#3 |
| 2 | 6H fila 1 · 2 Uveíte, poliartrite migratória | COBERTA | b05#15 |
| 3 | 6H fila 1 · 3 Bilirrubina, ascite | COBERTA | b07#26 |
| 4 | 6H fila 1 · 4 Pseudopólipos inflamatórios | COBERTA | b05#12, #17 |
| 5 | 6H fila 1 · 5 Colágeno I | COBERTA | b07#17 |
| 6 | 6H fila 1 · 6 E-caderina | COBERTA | b04#2 |
| 7 | 6H fila 1 · 7 Inflamação transmural, granulomas, fissura | COBERTA | b05#22 |
| 8 | 6H fila 1 · 8 Anemia megaloblástica, estenose fibrosante | COBERTA | b05#18 |
| 9 | 6H fila 1 · 9 Célula neuroendócrina | COBERTA | b04#18 |
| 10 | 6H fila 1 · 10 Displasia | COBERTA | b03#9, b04#8 + «precursoras» |
| 11 | 6H fila 1 · 11 Megacólon tóxico | COBERTA | b05#4 |
| 12 | 6H fila 2 · 3 Encefalopatia, tasa de protrombina | COBERTA | b07#26 |
| 13 | 6H fila 2 · 6 a 11 (pseudopólipos, E-caderina, colágeno I, displasia, megacólon, célula neuroendócrina) | REPETIDA | repetidas da fila 1 |
| 14 | 6E fila 1 · 1 Neutrófilos / corpos de Mallory-Denk | COBERTA | b07#30 |
| 15 | 6E fila 1 · 2 Atrofia difusa / metaplasia intestinal | ACRESCENTADA | b03 «autoimune micro» |
| 16 | 6E fila 1 · 3 Pseudopólipos / úlceras de base larga | COBERTA | b05#17 |
| 17 | 6E fila 1 · 4 «Localização» (sem enunciado) | PENDENTE | sem enunciado: não reconstruível |
| 18 | 6E fila 1 · 5 Células estreladas | COBERTA | b07#31 |
| 19 | 6E fila 1 · 6 Granuloma não caseificante | COBERTA | b05#5 |
| 20 | 6E fila 1 · 7 Parede rígida e espessada / perda de pregas | COBERTA | b04#21 |
| 21 | 6E fila 1 · 8 Células em anel de sinete / desmoplasia | COBERTA | b04#22 |
| 22 | 6E fila 1 · 9 Displasia | COBERTA | b03#9, b04#8 |
| 23 | 6E fila 1 · 10 Linfócitos T | COBERTA | b03#7 |
| 24 | 6E fila 1 · 11 Infecção por H. pylori (MALT) | COBERTA | b04#5 |
| 25 | 6E fila 2 e 3 · demais respostas escritas | REPETIDA | repetidas da fila 1 («ver fila 1») ou «localização» sem enunciado (3 itens) |
| 26 | Fila 1 (sem turma) · 1 Cromatina moteada / citoplasma escasso | COBERTA | b04#20 |
| 27 | Fila 1 (sem turma) · 2 Pólipos hamartomatosos no delgado + hiperpigmentação | COBERTA | b06#17 |
| 28 | Fila 1 (sem turma) · 3 Metaplasia seudopilórica / de Paneth | COBERTA | b05#20 |
| 29 | Fila 1 (sem turma) · 4 Úlceras aftosas | COBERTA | b05#6 |
| 30 | Fila 1 (sem turma) · 5 «Vellosa» | PENDENTE | sem enunciado; o slide e o ensino dizem que o TAMANHO pesa mais que a arquitetura (viloso: focos de invasão mais frequentes); não criada |
| 31 | Fila 1 (sem turma) · 6 Miofibroblasto | COBERTA | b07#31 («en qué se transforma») |
| 32 | Fila 1 (sem turma) · 7 Nulo / colo esquerdo | COBERTA | b06#18 |
| 33 | Fila 1 (sem turma) · 8 Acúmulo de células caliciformes e absortivas | COBERTA | b06#19 |
| 34 | Fila 1 (sem turma) · 9 Alfa-fetoproteína | COBERTA | b07#6 |
| 35 | Fila 1 (sem turma) · 10 Fusiformes / epitelioides | COBERTA | b04#23 |
| 36 | Fila 1 (sem turma) · 11 Pericolangite / CEP | ACRESCENTADA | b05 «CU hepatobiliar» |

### 4.5 Simulado P2 respondido — COBERTA 48 · ACRESCENTADA 1 · PENDENTE 2
| Item | Decisão | Destino / motivo |
|---|---|---|
| 1 | COBERTA | b07#15 |
| 2 | COBERTA | b05#16 |
| 3 | COBERTA | b04#16 |
| 4 | COBERTA | b07#10 |
| 5 | COBERTA | b05#4 (explicação cita muscular própria e função neuromuscular) |
| 6 | COBERTA | b04#5, #13 |
| 7 | COBERTA | b05#17 |
| 8 | ACRESCENTADA | b05 «CU hepatobiliar» (era parcial: só CEP em b05#9) |
| 9 | COBERTA | b07#2 |
| 10 | COBERTA | b04#17 |
| 11 | COBERTA | b05#21 |
| 12 | COBERTA | b04#3 |
| 13 | COBERTA | b05#15 |
| 14 | COBERTA | b07#26 |
| 15 | COBERTA | b07#26 |
| 16 | COBERTA | b07#17 |
| 17 | COBERTA | b04#2 |
| 18 | COBERTA | b05#22 |
| 19 | COBERTA | b05#18 |
| 20 | COBERTA | b04#18 |
| 21 | COBERTA | b03#9, b04#8 + «precursoras» (N) |
| 22 | COBERTA | b05#12 |
| 23 | COBERTA | b04#1 |
| 24 | COBERTA | b07#16 |
| 25 | COBERTA | b04#2 |
| 26 | COBERTA | b04#19 |
| 27 | COBERTA | b05#1, #3, #14 |
| 28 | COBERTA | b07#28 (tasa de protrombina e hipoalbuminemia) |
| 29 | COBERTA | b07#18, #22 |
| 30 | COBERTA | b04#2 (+ b03#5) |
| 31 | COBERTA | b07#3, #7, #13 |
| 32 | COBERTA | b03#16 |
| 33 | COBERTA | b03#6, #20 |
| 34 | COBERTA | b04#20 (cromogranina A na resposta aceita) |
| 35 | COBERTA | b04#6 |
| 36 | COBERTA | b04#24 |
| 37 | COBERTA | b04#25 |
| 38 | COBERTA | b05#10 |
| 39 | PENDENTE | numeração ausente no PDF; nada inventado |
| 40 | COBERTA | b05#23 |
| 41 | PENDENTE | p-ANCA na CU: não consta em nenhum slide de AP II (Clase 5 relida nesta rodada); pergunta continua fora; ensino e flashcard mantidos |
| 42 | COBERTA | b05#24 |
| 43 | COBERTA | b07#32 |
| 44 | COBERTA | b07#33 |
| 45 | COBERTA | b07#30, #20 |
| 46 | COBERTA | b07#24 |
| 47 | COBERTA | b07#4 |
| 48 | COBERTA | b07#34 |
| 49 | COBERTA | b07#13 |
| 50 | COBERTA | b07#35 |
| 51 | COBERTA | b07#9 |

### 4.6 Simulado «Revisão» (classe B) — COBERTA 46 · ACRESCENTADA 2 · PENDENTE 2
| Item | Decisão | Destino / motivo |
|---|---|---|
| 1 | ACRESCENTADA | b04 «precursoras» (evidência independente: slide Clase 4 + prova formatada) |
| 2 | COBERTA | b04#8 |
| 3 | COBERTA | b04#2 |
| 4 | COBERTA | b04#2, #22 |
| 5 | COBERTA | b04#8 |
| 6 | COBERTA | b04 (tabela de Lauren no ensino) |
| 7 | COBERTA | b04#21, #2 |
| 8 | COBERTA | b04#25 |
| 9 | COBERTA | b04#4 (nódulo da irmã Maria José no ensino e na explicação) |
| 10 | COBERTA | b03#4 (nota: biopsiar TODA úlcera gástrica) |
| 11 | COBERTA | b04#12 |
| 12 | COBERTA | b04#3 e tabela de Borrmann |
| 13 | PENDENTE | localização do tipo intestinal (antro e curvatura menor): slide Clase 4 confirma; o ensino do b04 não o diz; classe B (simulado de aluno), sem evidência de prova; pendente |
| 14 | COBERTA | b03#9 e ensino do b06 (displasia) |
| 15 | COBERTA | b04#22 |
| 16 | COBERTA | b04#5 |
| 17 | COBERTA | b04#13, #5 |
| 18 | COBERTA | b04#16 |
| 19 | COBERTA | b04#20 |
| 20 | COBERTA | b04#19 |
| 21 | COBERTA | b04#7 |
| 22 | COBERTA | b04#17 |
| 23 | COBERTA | b04#6 |
| 24 | COBERTA | b04#6 e ensino |
| 25 | COBERTA | b04#23 |
| 26 | COBERTA | b05#1, #14 |
| 27 | COBERTA | b05#10 |
| 28 | COBERTA | b05#5 |
| 29 | COBERTA | b05#6 |
| 30 | COBERTA | b05#3 |
| 31 | COBERTA | b05#18, #21 |
| 32 | COBERTA | b05#4 |
| 33 | COBERTA | b05#9 |
| 34 | COBERTA | b05#13 |
| 35 | COBERTA | b05#23 |
| 36 | ACRESCENTADA | b05 «clínica do Crohn» |
| 37 | COBERTA | b05#12, #17 |
| 38 | COBERTA | b05#1, #14 |
| 39 | COBERTA | b05#19 |
| 40 | PENDENTE | reversibilidade da mucosa na CU após remissão: slide Clase 5 confirma; sem pergunta/ensino equivalente; classe B; pendente |
| 41 | COBERTA | b06#18, #10 |
| 42 | COBERTA | b06#8 |
| 43 | COBERTA | b06#8 (explicação: tamanho > arquitetura; vilosos com mais focos de invasão) |
| 44 | COBERTA | b06#2, #20 |
| 45 | COBERTA | b06#4 |
| 46 | COBERTA | b06#6 |
| 47 | COBERTA | b06#6 |
| 48 | COBERTA | b06#5 |
| 49 | COBERTA | b06#5, #11 |
| 50 | COBERTA | b06#9 |

## 5 · As 19 perguntas acrescentadas (fonte → pergunta → destino → ensino prévio)
| # | Bloco | Pergunta (nome interno) | Fonte(s) | Ensino prévio (slide da cátedra) |
|---|---|---|---|---|
| 1 | b01 | «afta» · vinheta diagnóstica (MCQ) | P1 Resolvidas 001 (6F) | slide Clase 1: úlceras aftosas |
| 2 | b01 | «granuloma piógeno» · histologia na gestante (MCQ) | P1 Resolvidas 003 (6H, pareo) · 01_F61 | slide Clase 1: tumor del embarazo |
| 3 | b01 | «VPH» · orofaringe, não fumante (MCQ) | P1 Resolvidas 019 (6E) | slide Clase 1: VPH-16 em criptas amigdalinas/base da língua |
| 4 | b01 | «tabaquismo» · fator de leucoplasia/eritroplasia (completar) | P1 Resolvidas 014 (6E) · 01_F61 | slide Clase 1 |
| 5 | b02 | «várices» · hematêmese no cirrótico alcoólico (MCQ) | P1 Resolvidas 037–039 (6E, 6H, 6D, 6F) · 01_F61 | slide Clase 2: hipertensão portal |
| 6 | b02 | «Mallory-Weiss» · mecanismo (MCQ) | P1 Resolvidas 040–042 (6E, 6C, 6D) · 01_F61 | slide Clase 2: vômitos, UGE, 10% das HDA |
| 7 | b02 | «clínica da ERGE» (citar 2) | P1 Resolvidas 048 (6D) | slide Clase 2: pirose e regurgitação |
| 8 | b02 | «Barrett histologia» (MCQ) | P1 Resolvidas 054, 057 (6D, 6F) · 01_F61 | slide Clase 2: metaplasia intestinal, células caliciformes |
| 9 | b02 | «prognóstico do CCE» (MCQ) | P1 Resolvidas 061–062 (6D, 6C) · 01_F61 | slide Clase 2: metástases ganglionares, mau prognóstico (+1 parágrafo no ensino) |
| 10 | b02 | «IHQ» em tumor pouco diferenciado (MCQ) | 01_F61 | slide Clase 2: imunohistoquímica útil em tumores menos diferenciados (+1 parágrafo no ensino) |
| 11 | b03 | «EUP duodeno» · localização (completar) | P1 Resolvidas 087 (6D, 6F) | slide Clase 3 |
| 12 | b03 | «autoimune micro» (citar 2) | P1 Resolvidas 083 (6D) · gabarito 6E fila 1 item 2 | slide Clase 3 |
| 13 | b03 | «neoplasias do H. pylori» (citar 2) | P1 Resolvidas 079 (6F) | slide Clase 3 |
| 14 | b04 | «precursoras» do adenocarcinoma gástrico (citar 2) | prova formatada 1 e 12 · Revisão 1 | slide Clase 4 (+1 parágrafo no ensino) |
| 15 | b05 | «CU hepatobiliar» (citar 2) | Simulado P2 item 8 · prova formatada 2 · gabarito Fila 1 item 11 | slide Clase 5: pericolangite e CEP, mais frequentes na CU |
| 16 | b05 | «clínica do Crohn» (citar 2) | prova formatada («manifestação clínica») · Revisão 36 | slide Clase 5 |
| 17 | b06 | «dieta» do câncer de sigmoide (MCQ) | prova formatada 12 | slide Clase 6: fibras e gorduras (+1 parágrafo no ensino) |
| 18 | b06 | «não neoplásicos» (citar 2) | prova formatada | slide Clase 6 |
| 19 | b06 | «adenoma micro» (citar 2) | prova formatada | slide Clase 6: hipercromasia, estratificação, células caliciformes reduzidas |
Todas foram inseridas **no fim do bloco** e **no banco geral** (depois das baseadas em exame, antes das complementares), com o mesmo texto, rótulo «Basada en preguntas de examen» e **sem alegar transcrição literal**: os enunciados de vinheta foram reconstruídos a partir do conceito cobrado e as alternativas são reconstruídas segundo 8-A.5/8-A.6 (as originais completas não foram reproduzidas se traziam a correta mais longa). Nenhuma tem id (o site de AP II não usa ids por pergunta); a posição no bloco e o gêmeo no banco são mantidos.
**Ensino acrescentado (só texto novo; nenhuma frase existente alterada):** b02 «Sobre el pronóstico…» (metástase ganglionar e imunohistoquímica; slide Clase 2) · b04 «Una precisión sobre el origen…» (displasia e adenomas gástricos; slide Clase 4) · b06 «Un dato de epidemiología…» (fibras, gorduras e hidratos refinados; AAS/AINE protetores; slide Clase 6).

### 5.1 Discrepâncias gabarito lembrado × fonte (registradas, nenhuma corrigida em silêncio)
1. **Complicações da ERGE (6H):** a prova lembrada não aceitou «adenocarcinoma»; a literatura/slide listam úlceras, hematêmese/melena, estenose e Barrett. O site oferecia «Barrett (y, a partir de él, adenocarcinoma)» como resposta aceita → **corrigido** em b02#20.
2. **Compilado P1 item 4 (levantamento #702):** o arquivo diz «borda lateral da língua» como localização mais frequente do CCE oral; o slide (Clase 1) e o site dizem «superfície ventral da língua, assoalho da boca e lábio inferior» → **site mantido** (o slide decide).
3. **Subtipo de adenoma hepático de menor risco:** o slide (Clase 7) diz «inflamatórios: baixo risco» e não declara risco para HNF1-α; o Robbins aponta HNF1-α; o Simulado_100 (item 35) tem chave «inflamatório». O site segue o slide. **Nenhuma pergunta nova** (resposta em branco na prova formatada) → pendente de decisão.
4. **Diarreia no Crohn:** o slide diz «leve, habitualmente sem sangue»; o ensino do b05 e um flashcard dizem «com ou sem sangue». Não alterei o ensino existente; a pergunta nova «clínica do Crohn» não afirma o aspecto da diarreia. → pendente de decisão (§10).
5. **«Fibras vegetais não absorvíveis» nos quadros de pareo:** o autor do PDF especulou um fitobezoar; o slide da Clase 6 mostra que é um fator dietético do câncer de cólon (pouca fibra). Nada do fitobezoar foi incorporado.
6. **p-ANCA na CU (simulado item 41):** continua sem apoio em slide da cátedra (Clase 5 relida): pergunta não criada.
7. **Azul de metileno para H. pylori:** a recordação e o slide (Clase 3, imagem «Tinción azul de metileno») concordam; o Robbins não o cita. O site já cobra «azul de metileno e prata» (b03#19).

## 6 · Pendências (não aproveitadas) e motivo
| # | Fonte · item | Motivo exato | O que destrava |
|---|---|---|---|
| 1 | P1 Resolvidas 055 | macro do Barrett (mucosa vermelha aveludada) está no ensino, sem pergunta; baixa prioridade | decisão de José |
| 2 | 01_F61 «nódulos das cordas vocais: hiperplasia de tecido conjuntivo» | não consta nos slides da Clase 1 nem na literatura acessível | slide ou capítulo que cite o assunto |
| 3 | 01_F61 «células mucinosas: coloração para mucinas» | detalhe de slide sem pergunta equivalente; baixa prioridade | decisão de José |
| 4 | prova formatada 7 · «Borrmann III» | ensinado na tabela e em b04#3; sem pergunta direta do tipo III | decisão de José |
| 5 | prova formatada · «adenoma hepático de melhor prognóstico» | resposta em branco; conflito slide × Robbins (§5.1.3) | decisão científica |
| 6 | JPEG 6E · «localização» (3 itens) | sem enunciado | outra imagem/transcrição |
| 7 | JPEG Fila 1 · «vellosa» | sem enunciado; o ensino do site (tamanho > arquitetura) segue o slide | enunciado original |
| 8 | Simulado item 41 (p-ANCA) e 39 (ausente) | §5.1.6 / numeração ausente | slide que cite ANCA |
| 9 | Revisão 13 e 40 (classe B) | slide confirma, mas o ensino do site não o diz e não há evidência de prova | decisão de José |

## 7 · Auditoria do conjunto de AP II (8-A.6-C, 8-A.6-D, 8-A.7)
| Medida | Antes (main) | Depois |
|---|---|---|
| Perguntas únicas | 205 | 224 |
| MCQ de 4 alternativas | 157 | 166 |
| Correta = única alternativa mais longa | 96/157 (61,1 %) | 94/166 (56,6 %) · 5 empates |
| Letras a/b/c/d (MCQ) | 39/40/39/39 | 42/41/42/41 · χ² 0,02 · maior corrida 4 (igual à main) · «abcd» 0 · «dcba» 0 |
| Enunciados com negrito | 9 | 0 |
| Listas de alternativas com itálico | 7 | 0 |
| V/F (bloco + banco) | 20 | 20 · botões testados |
- **Viés de tamanho em AP II continua sendo defeito preexistente NÃO resolvido por completo:** das 166 MCQ, 94 têm a correta como única mais longa. Corrigi 7 casos e construí as 9 MCQ novas com alternativas de tamanho próximo; **restam 28 perguntas antigas com a correta única mais longa e ≥ 1,5× a média das demais** (as piores: b07#20 2,33×, b05#19 2,25×, b06#20 2,08×, b07#19 1,92×) — pendência real. Não encurtei fatos corretos nem enchi alternativas com palavras sem conteúdo (8-A.6-C).
- **V/F (8-A.6-D):** nos 10 V/F, nos dois botões, o veredito certo é aceito e o errado é recusado, com a mensagem e a explicação corretas, no bloco e no banco (browser, função real).
- **Itálico de nomes de espécie** continua nos enunciados e nas explicações; foi retirado só das alternativas, para que a presença do itálico não sirva de pista (5 das 7 vezes o itálico estava numa alternativa errada).

## 8 · QA e testes (versão testada: HTML desta branch)
| Verificação | Resultado |
|---|---|
| `tools/qa/ap2-rodada-2026-11-23/ap2-rodada.test.cjs` (nada apagado, espelho, contagens, 19 novas, sem pista visual, letras, V/F no navegador) | **31/31 OK** |
| `grifos-motor.cjs` com 739 grifos reais (motor `rm-tools.js`) | 738 → 738, **0 perdidos, 0 movidos** |
| Diff do ensino: só 3 parágrafos novos (b02, b04, b06); b07 e b08 byte a byte iguais à main; imagens, SVG e 531 flashcards iguais | OK |
| Banco × blocos | 224 = 224, divergência 0 |
| Supabase | só `SELECT` em `user_highlights`, `user_ink_strokes`, `user_notes` (texto marcado/âncoras; sem `user_id`); 0 escritas |
| Testes históricos `ap2-646` e `ap2-638` | **falham por desenho**: `ap2-646` afirma o estado da rodada #646/#666 (205 perguntas, seções byte a byte iguais à #640, b04 «inalterado»), então 13 verificações mudam com qualquer rodada nova (não alterei esses testes); `ap2-638` mantém o 1 defeito já registrado em 17/11 (linha de base antiga) |
| Guard | ver comentário do Guard na PR |

## 9 · Limitações (o que não confirmei)
- Livros-base (Robbins, Harsh Mohan) não foram abertos: as respostas foram conferidas com os slides da cátedra e com o ensino do site; onde o slide é omisso (ex.: risco do adenoma HNF1-α) está registrado como pendência.
- O texto dos 3 JPEG foi lido visualmente; letras de MCQ sem enunciado foram ignoradas para conteúdo.
- Slides da Clase 8 (tiroides) não relidos; nenhuma pergunta de tiroides foi alterada.
- Arquivos de classe C (Banco de 66, Compilado P1, Simulado_100, Exames, Perguntas P2, Apunte) não foram reabertos nesta rodada.
- Não testei iPad/Safari.
- 19 vinhetas são reconstruções de conceito cobrado; nunca afirmam ser o enunciado original.

## 10 · Decisões humanas pendentes
1. Confirmar a procedência do Simulado P2 (o PDF se declara «NO OFICIAL») para manter o rótulo «Basada en preguntas de examen» nos itens que dele vieram.
2. Decidir a diarreia do Crohn (slide × ensino do b05) e o risco do adenoma HNF1-α.
3. Se José quer uma 2ª rodada para o viés de tamanho das 28 perguntas antigas restantes (cada uma exige redação de distratores com conteúdo e nova prova dos grifos).

## 11 · Autoauditoria do executor (§9-A)
- Diff final: 1 HTML de matéria (`anatomia-patologica-ii.html`) + 2 arquivos de teste + este registro. Nenhum arquivo crítico, função, banco ou pagamento tocado.
- Escopo, fontes permitidas (Drive do projeto, slides da cátedra), ciência (cada resposta nova conferida em slide), duplicatas (cada item comparado com a matéria inteira), contagens, espelho, grifos e V/F: conferidos acima.
- Não declarei resolvido o que não resolvi: viés de tamanho e pendências do §6.
- Dados de aluno: nenhum; Supabase só leitura.

## 12 · Cartão de Merge
- **Tarefa:** rodada de questões de AP II (teoria) · **Arquivos:** `anatomia-patologica-ii.html`, `tools/qa/ap2-rodada-2026-11-23/*`, este registro.
- **Impacto no aluno:** +19 perguntas, 3 parágrafos de ensino, 1 pergunta corrigida, sem pista visual; grifos preservados (738/738).
- **Risco:** baixo/médio (1 página de matéria; texto novo; nenhuma remoção). Reversível por revert.
- **Publicação:** NÃO decidida aqui; só José mescla e publica.
- **Recomendação:** pode mesclar após a auditoria independente; ver §10 para decisões que não bloqueiam o merge.
