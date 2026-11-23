# Farmacología II · rodada de questões (20–23/11/2026) a partir do levantamento da #702

> **ATUALIZAÇÃO DA RODADA 2 (23/11): ler primeiro.** Os números e as decisões da **§R2** (no fim deste arquivo) **substituem** os das §1–§6 (rodada 1, de 20/11): agora são **17 questões novas (236 → 253 no bloco e no banco)**; as questões N4 (β-bloqueantes), N8 (xantinas) e N9 (Cushing) foram **reescritas** conforme o slide da cátedra; todas as páginas dos PDFs grandes foram abertas (§R2-A). A §3-B (limites da rodada 1) está **superada**.

Executor: Claude 2 · Base: `main` `68f212a9` · Branch `claude/farmaco2-questoes-2011`.
Leis lidas antes de mexer: `CLAUDE.md` (5-A, G0), `MANUTENCAO-DIDATICA-REPASSO-MED.md` §8-A (8-A.1, 8-A.1-B, 8-A.2, 8-A.3, 8-A.4, 8-A.5, 8-A.6-D, 8-A.7, 8-A.10, 8-A.11), levantamento `levantamento-questoes-farmaco2-anapat2-*` (#702) e os packs anteriores da matéria (`farmacologia-ii-questoes-2026-11-v1`, `-637-`, `-reconstrucao-1911-`).
Nenhuma matéria foi ativada; nenhum SQL de escrita; nenhuma PR de outro Claude foi tocada.

## 1. RESUMO PARA MERGE (8-A.11)
- **Fontes abertas nesta rodada** (Drive, pasta de questões `1Ov8nvljchyD5EyLI4hSk8iXlNbrlGMIS`): 9 arquivos reabertos (ver matriz §3). **Não reli todas as páginas dos arquivos grandes** (§3-B).
- **O site tinha 236 perguntas (bloco + banco, espelho 236 × 236). Agora tem 243 (243 × 243), 0 divergências.** **7 questões novas** (3 «Basada en preguntas de examen», 4 «Pregunta complementaria»), cada uma no fim do grupo do bloco correspondente **e** no banco geral.
- **Nenhuma questão antiga foi alterada, removida ou renumerada; nenhum id mudou** (a matéria não tem ids de questão). Nenhuma imagem, flashcard, grifo, nota ou traço foi tocado.
- **Reformuladas como canônicas (8-A.1-B): 0** (nenhuma versão do material era demonstravelmente mais completa que a do site).
- **Achado importante sobre o levantamento #702:** ele marcou como «sem equivalente» (FAL) e «a melhorar» (MEL) itens que **já existem no site**, às vezes com o mesmo enunciado (ex.: Belén 2 = `f2b14#8`, Belén 5 = `f2b03#4`). A causa é o método do #702 (candidatos «por grupo», 1:1 não verificada). Aqui comparei **item a item**; os números do #702 **não** devem ser somados como lacunas reais. Das 20+18+32+15+25+19 questões dos 6 arquivos pequenos, só **4** exigiram questão nova (N1, N2, N4, N7); do Belém completo, **2** (N8, N9); do Compilado (págs. 1–4), **1** (N5).
- **Contagens declaradas (8-A.10):** total 236 → 243; «Basadas en exámenes» 139 → 142; «Complementarias» 97 → 101 (somas dos separadores do banco; **o cabeçalho antigo dizia 136/96, que não somava os separadores (139/97): defeito preexistente, corrigido**). Separadores alterados: bloco 05 (12·8), 06 (12·9), 08 (13·14), 14 (15·6).
- **Cobertura RESUMO → QUESTÃO → EXPLICAÇÃO confirmada** para as 7: cada ponto já era ensinado no resumo do bloco antes da pergunta (§2). **Nenhuma frase do resumo foi alterada.**
- **Pendentes** (sem inventar): §5.

## 2. As 7 questões novas (arquivo → decisão → onde → ensino prévio)
| # | Questão (tema) | Rótulo | Fonte (classe) | Bloco / banco | Onde o resumo ensina antes | Gabarito |
|---|---|---|---|---|---|---|
| N1 | Hipertensão por glicocorticoide: **efeito permissivo** (↑ reatividade vascular a catecolaminas e angiotensina II; ↓ NO sintasa) | Pregunta complementaria | Simulado P2 Corticoides, Q3 e Q22 (**B**, simulado) | `f2b07` (Bloque 06) e banco 06, fim das complementarias | `f2b07` §4.3 «Cardiovasculares»: «favorecen la reactividad a las catecolaminas y a la angiotensina II… efecto permisivo… inhibición de la NO sintasa vascular» | b |
| N2 | **Angina típica**: descrição do dolor (opresivo, irradia mandíbula/brazo, síntomas autonómicos, esfuerzo/estrés, reposo/nitratos) | Pregunta complementaria | Questionário Antianginosos, Q2 (**C**, terceiros) | `f2b05` (Bloque 05) e banco 05 | `f2b05` §3 «Clínica: la angina típica» | b |
| N4 | **β-bloqueantes: contraindicación ABSOLUTA** (bloqueo AV; relativas × absolutas; indicações) | Pregunta complementaria | Questionário Antianginosos, Q14 (**C**) | `f2b05` e banco 05 | `f2b05` §8 (tabela «Contraindicaciones ABSOLUTAS × RELATIVAS» e «Indicaciones conforme la cátedra») | a |
| N5 | **Diltiazem = antiarrítmico clase IV** | **Basada en preguntas de examen** | `Provas Compilado farmaco.pdf`, págs. 1–4, folha de prova «Marca la respuesta correcta», item 8, vista em imagem (**A**) | `f2b14` (Bloque 14), no fim das «basadas en exámenes» e no banco; **as complementarias do bloco passam do nº 15–20 ao 16–21** | `f2b14` §9 «Clase IV · verapamilo y diltiazem» e a tabela de Vaughan-Williams | a |
| N7 | **Churg-Strauss** com zafirlukast e montelukast (+ disfunção hepática, neuropsiquiátricas na explicação) | Pregunta complementaria | Simulado P2 Corticoides, Q20 e Caso 4b (**B**) | `f2b08` (Bloque 08) e banco 08 | `f2b08`, antileucotrienos: «casos de síndrome de Churg-Strauss, una vasculitis rara con eosinofilia y asma» (frase que alunos grifaram) | a |
| N8 | **Efeito diurético das xantinas**: antagonismo de receptores de adenosina A₁ | **Basada en preguntas de examen** | `Provas Fármaco II - Belem completo .pdf` (texto nativo; item «En relación con el efecto diurético de este medicamento…») (**A**) | `f2b08` (basadas) e banco 08 | `f2b08`: «diuresis por antagonismo A₁» (slide, tabela de efeitos da teofilina) e «acción diurética» | d |
| N9 | **V/F: Cushing com «10 mg/día»** (o limiar da cátedra é > 100 mg/día de cortisol por > 2 semanas) → FALSO | **Verdadero o falso · basada en examen** | `Provas Fármaco II - Belem completo .pdf`, «Responde verdadero o falso» (**A**) | `f2b07` (basadas) e banco 06 | `f2b07` §7.2: «dosis superiores a 100 mg/día de cortisol… más de 2 semanas» | FALSO (os dois botões passam o mesmo valor, como nas outras V/F da matéria) |
**Reconstruções (8-A.5-B), ditas sem rodeio:** N8: o enunciado do arquivo diz «este medicamento»; o fármaco foi inferido pela opção correta (adenosina → xantinas) e pelas perguntas vizinhas; os distratores a, b, c são os do arquivo reorganizados (o d do arquivo, «aumento do fluxo sanguíneo renal», foi retirado porque não consta do resumo). N2, N4, N7 e N1 são **perguntas elaboradas pelo Repasso Med** sobre pontos dos arquivos, não transcrições (por isso «complementaria»). N5 é o item da folha de prova com as 4 opções originais; N9 é a afirmação do arquivo com a justificativa do resumo. Nenhuma foi chamada «oficial» nem «de prova real».
**Letras (8-A.7):** N1 b (após …c), N2 b e N4 a (após d d d), N5 a, N7 a, N8 d; nenhuma cria sequência de 3 iguais.
**Pistas (8-A.6-D):** nenhuma alternativa leva negrito, itálico, cor ou símbolo; comprimentos próximos; os distratores são plausíveis.

## 3. MATRIZ POR FONTE
### 3-A · Arquivos reabertos e comparados item a item nesta rodada
Legenda: EXISTE = já cobria o conceito e o raciocínio (ref. `bloco#n`, ordem da página; **para N5/N7/N8/N9 a numeração das complementarias do bloco 14 mudou**) · NOVA · DUP.SEM = duplicata semântica descartada · PEND = pendente.
| Fonte (id Drive) | Legibilidade | Itens | EXISTE | NOVA | DUP.SEM/relacionada descartada | PEND |
|---|---|---:|---:|---:|---:|---:|
| `Fármaco – Belén, Turma D, Fila 2 (1).pdf` (`1lqvxU6z…`) — **classe A** | texto nativo, perfeita | 20 | 20 | 0 | 0 | 0 |
| `Simulado P2 Corticoides + Farmacologia Respiratória.pdf` (`1FQjR8Aw…`) — B | texto nativo | 32 | 22 (18 MCQ + 4 casos) + 6 abertas cobertas | 2 (N1, N7) | 0 | 2 abertas |
| `Simulado farmaco II - 2ª parcial.pdf` (`1wkjZ3Wb…`) — B | texto nativo | 15 | 15 | 0 | 0 | 0 |
| `farmaco p2.pdf` (`18S_zzSI…`) — **A** (P2 de 10/11/2025) | imagem, págs. 1, 4 e 5 vistas agora | 18 | 16 | 0 | 0 | 2 (MCQ 1–2 não estão no arquivo) |
| `2. Questionário Antianginosos.pdf` (`1jimtoAX…`) — C | texto nativo | 25 | 20 | 2 (N2, N4) | 1 (Q11) | 2 (Q13 e Q24) |
| `1. Questionário Antihipertensivos.pdf` (`1Ed9LTu1…`) — C | texto nativo, Q1–Q18 lidas | 19 | 16 | 0 | 1 (Q1) | 1 (Q19 não lida) + Q16 parcial |
| `Provas Fármaco II - Belem completo .pdf` (`1i4syhKl…`, 6,2 MB, 38 págs.) — **A** | texto nativo lido inteiro (28 KB); **imagens não vistas** | ≈ 60 itens de texto | ≈ 57 | 2 (N8, N9) | 1 (aminofilina em EPOC → `f2b08#23`) | — |
| `Provas Compilado farmaco.pdf` (`1B33uMV2…`, 56,8 MB) cópia `LEITURA_Provas_Compilado_farmaco_pag_01-07.pdf` (`1JvLxvBD…`) — **A** | imagem (fotos da folha de prova com marcas à mão), **págs. 1–4 vistas agora** | 18 (itens 1–18 da folha) | 17 | 1 (N5) | 0 | 0 |
| `Questoes P1 P2 Farmaco_251206_172249.pdf` (`13Re9_Bhl…`, 22,5 MB) cópia `LEITURA_…_pag_01-28.pdf` (`1hBWqRL4…`) — **A** | imagem, **págs. 5 e 6 vistas agora** (recordações P2 + «Examen en línea») | ≈ 35 temas/itens | ≈ 33 | 0 | 1 (nitrato baixa dose V/F → `f2b05#9`) | 1 (β₂ «mais potentes», §5-1) |
**Detalhe das comparações mais relevantes** (o que o #702 chamou FAL/MEL e o que encontrei):
- **Belén (A):** 1 `f2b02#3` · 2 digoxina `f2b14#8` (**o #702 dizia FAL**) · 3 `f2b05#5` · 4 `f2b03#5` e `#12` · 5 metildopa `f2b03#4` (**#702: FAL**) · 6 `f2b14#3` · 7 `f2b02#4` · 8 `f2b01#4` · 9 amiodarona `f2b14#7` e `f2b10#2` (**#702: MEL; já há perguntas separadas**) · 10 ticagrelor `f2b04#2` · 11 nebivolol `f2b01#12` · 12 verapamilo `f2b03#6`, `f2b14#11` · 13 `f2b02#10` · 14 `f2b01#11`, `#19` · 15 `f2b05#8`, `#4` · 16 `f2b05#9` · 17 `f2b04#4` · 18 `f2b03#12` · 19 `f2b02#9` · 20 `f2b01#14`, `#15`.
- **farmaco p2 (A):** MCQ3 `f2b08#10`, `#7` · MCQ4 `f2b07#3` · MCQ5 `f2b07#2` · MCQ6 `f2b08#18` · MCQ7 `f2b08#19` · MCQ8 `f2b07#1` · MCQ9 `f2b08#20` · MCQ10 `f2b07#6`, `#7` · V/F1 `f2b08#6`, `#8` · V/F2 `f2b08#19` · V/F3 `f2b09#1` · completar 2.1 `f2b09#14` · **2.2 «tiotropio ou teofilina»: o site pergunta o tiotropio (`f2b08#24`); a «teofilina» como adicional não consta do resumo nem do slide `06 - SISTEMA RESPIRATORIO` (que cita LAMA como adicional ao ICS/LABA) — divergência registrada, não copiada** · 2.3 `f2b07#19` · **2.4 PLA2 `f2b06#2`** (**#702: FAL**) · Cite 3.1 `f2b08#15`, `#19`, `#23`.
- **Compilado págs. 1–4 (A):** digoxina `f2b14#8` · β-bloq EXCETO `f2b01#10` · quinidina `f2b14#2` · edema `f2b03#5` · princípio II da IC `f2b14#12` · verapamilo `f2b03#6` · losartán = ARA II (`f2b02#11` classificação e `f2b03#18`, duplicata semântica) · **diltiazem classe IV → N5** · HCTZ `f2b02#3` · amiodarona `f2b14#5`/`#6` · carvedilol `f2b01#3` · pareamento dos 5 princípios `f2b14#14` · IECA pró-fármacos `f2b03#21` · nebivolol V/F `f2b01#12` · celiprolol V/F `f2b01#4` · cite β-bloq na IC `f2b01#15` · classificação anti-hipertensivos `f2b02#11` · β-bloq na ICC `f2b01#16`.
- **Questões págs. 5–6 (A):** SABA na crise `f2b08#3` · roflumilast `f2b08#1`, `#11` · omalizumab `f2b08#18` · IBP `f2b09#2` · omeprazol + clopidogrel `f2b09#7`, `f2b04#7` · esquema H. pylori `f2b09#12` · misoprostol `f2b09#1` · bismuto `f2b09#15`, `#10` · β₂ de ação longa `f2b08#2`, `#9` · anticolinérgicos `f2b08#6` · indicações dos glicocorticoides `f2b07#8` · «Examen en línea»: item 2 nitratos `f2b05#9` · 3 amiodarona `f2b14#6` · 4 `f2b03#5` · 5 `f2b01#10` · «Outro examen»: metildopa `f2b03#23`, carvedilol `f2b01#3`.
- **Belém completo (A), texto:** MgSO₄ `f2b08#10` · antileucotrienos `f2b08#20` · IBP `f2b09#2` · hueso `f2b07#2` · xantinas mecanismo `f2b08#4` · β-adrenérgicos `f2b08#9` · zafirlukast `f2b08#22` · «modificaciones estables» `f2b07#4` · hipoglucemiantes `f2b12#3`–`#8` · insulina basal `f2b13#4` · hipoglicemia por insulina `f2b13#5` · repaglinida `f2b12#5` · sitagliptina `f2b12#8` · metformina `f2b12#7` · levotiroxina/exceso `f2b10` · PTU/tionamidas `f2b11#5` · propranolol T4→T3 `f2b11#2` · metimazol `f2b11#1` · pseudotumor `f2b10#1` · roflumilast `f2b08#1` · antileucotrienos adicional `f2b08#12` · sucralfato `f2b09#14` · misoprostol `f2b09#1` · critérios de insulinização `f2b13#6` · tipos de anti-inflamatórios `f2b06#4` · efeitos metabólicos / RAM crónicas / indicações `f2b07#8`, `#9`.
- **Simulado corticoides (B):** Q1 `f2b07#16` · Q2 `f2b07#18` · **Q3 → N1** · Q4 `f2b07#10`, `#12` · Q5 `f2b07#2` · Q6 `f2b07#6`, `#7`, `#11` · Q7 `f2b06#2` · Q8 `f2b07#3` · Q9 `f2b08#3` · Q10 `f2b08#2` · Q11 `f2b08#14` · Q12–13 `f2b08#6` · Q14 `f2b08#23` · Q15 `f2b08#21` · Q16 `f2b08#10` · Q17 `f2b08#22` · Q18 `f2b08#20`, `#25` · Q19 `f2b08#11` · **Q20 Churg-Strauss → N7** (antes só aparecia na explicação). Abertas: Q22 (N1 + `f2b07#18`), Q23 (`f2b07#8`), Q26 (`f2b08#2`, `#6`, `#8`), Q27 (`f2b08#4`), Q28 (`f2b08#22`) cobertas; **Q21 (círculo vicioso do peso) e Q24 (efeito indireto β₂ e dessensibilização) PENDENTES: o resumo não ensina** (8-A.2). Casos 1–4: cobertos (`f2b07#1`, `#10`, `#12`; `f2b08#2`, `#10`, `#13`, `#14`; `f2b08#6`, `#11`; `f2b08#25`, N7).
- **Simulado 2ª parcial (B):** Q1 `f2b07#3`, `#8` · Q2 `f2b07#2` · Q3 `f2b07#1` · Q4 `f2b07#10`, `#12` · Q5 `f2b07#6`, `#7`, `#18` · Q6 `f2b08#17` · Q7 `f2b08#3` · Q8 `f2b08#1`, `#11` · Q9 `f2b08#18` · Q10 `f2b09#2` · Q11–12 `f2b09#7`, `f2b04#7` · Q13 `f2b09#12` · Q14 `f2b09#1` · Q15 `f2b09#15`.
- **Antianginosos (C):** Q1 `f2b05#14` · **Q2 → N2** · Q3 `f2b05#7` · Q4 `f2b05#1` · Q5 `f2b05#2` · Q6 `f2b05#9`, `#11` · Q7 `f2b05#13` · Q8 `f2b05#3`, `#10` · Q9 `f2b05#4`, `#8` · Q10 `f2b05#12` · **Q11 (indicações dos nitratos / angina de repouso): DUP.SEM descartada** — um aluno que acerta `f2b05#1`/`#2`/`#16` (NTG sublingual no ataque) e `#13` (ISMN para profilaxia) responde esta; não acrescenta valor avaliativo · Q12 `f2b05#6` · Q13 e Q24 (mecanismo antianginoso central dos β-bloq.) **PENDENTES: o resumo ensina o β-bloq. no IAM e nas indicações, não o efeito sobre o tempo diastólico** · **Q14 → N4** · Q15–16 (angina de esforço; HTA + angina) cobertas na explicação de N4 · Q17 `f2b05#5`, `#17`, `f2b03#14` · Q18 `f2b05#17` · Q19 `f2b04#4`, `#6` · Q20 `f2b05#1`, `#2` · Q21–22 `f2b05#17` + N4 · Q23 `f2b03#14` · Q25 `f2b05#7`.
- **Antihipertensivos (C):** Q1 PA = GC × RVP (**DUP.SEM descartada**: ensinada como eixo do bloco 02 e usada em `f2b02#14`; pergunta isolada de fórmula de baixo valor) · Q2 `f2b02#1`, `#4`, `#12` · Q3 `f2b02#3`, `#14`, `#15` · Q4 `f2b02#6`, `#10`, `#13` · Q5 `f2b01#3`, `#12`, `#13` · Q6 `f2b03#4`, `#23` · Q7 `f2b03#5`, `#12`, `#14` · Q8 `f2b03#1`, `#2`, `#11` · Q9 `f2b03#18` · Q10 `f2b03#7`, `#9` · Q11 `f2b02#8`, `f2b03#15`, `#19` · Q12–13 `f2b01#19`, `#21`, `#25` · Q14 `f2b01#7` · Q15 `f2b01#5`, `#18` · Q16 parcial (`f2b01#14`: «perdem seletividade com dose alta» não é perguntado; PEND parcial) · Q17 `f2b01#3`, `#12`, `#13` · Q18 `f2b01#18`, `#27`. Arquivo de terceiros: valeu o resumo do site onde divergia.
- **Divergências entre arquivo e material (8-A.4), as que verifiquei:** `farmaco p2` completar 2.2 (teofilina, §5-2); Simulado corticoides: o comentário do gabarito do Q3 é impreciso (diz «o mecanismo mineralocorticoide é a alternativa a, mas a pergunta pede o do glicocorticoide»): N1 foi redigida só com o mecanismo do glicocorticoide; Questões pág. 6, item β₂ «mais potentes» (§5-1). Nos questionários de terceiros (classe C) valeu o resumo do site quando o arquivo divergia; não listei cada divergência item a item. Nada foi copiado quando divergia do slide.

### 3-B · O que NÃO foi relido nesta rodada (honestidade)
- **Compilado (27 págs.)**: só as págs. **1–4** foram abertas. Págs. 5–27 (cópia de Belén, resumos de aluno, notas à mão) **não foram reabertas**; valem os registros do pack `farmacologia-ii-questoes-2026-11-v1` (27/27 examinadas em 01/11).
- **Questões P1 P2 (55 págs.)**: só as págs. **5 e 6** foram abertas (e as 1–4, 7 baixadas mas não analisadas). Págs. 1–4, 7–55 **não foram reabertas**; valem os registros do pack de 01/11 (55/55).
- **Belém completo (38 págs.)**: li o **texto nativo** inteiro; as páginas que são imagem (fotos) **não foram vistas**.
- `questoes farmaco.pdf` (16 itens) e `prova farmaco.pdf` (cópia de Belén): **não reabertos** (pack anterior: JÁ EXISTENTES).
- `Tabelas Farmaco Final.pdf`: sem questões (classe D), não reaberto.
- Não há literatura-base de Farmacología no Drive (busca repetida); as respostas foram conferidas contra o **resumo do site** e o slide `06 - SISTEMA RESPIRATORIO.pdf` (lido de novo em texto): «Los B adrenérgicos son los broncodilatadores más rápidos y eficaces»; «LAMA… adicionales en asma no controlada con ICS/LABA máxima»; zafirlukast/montelukast e Churg-Strauss. O slide de corticoides (`05`) **não foi reaberto**; N1 e N9 se apoiam no resumo do site (que cita a cátedra).

## 4. Conferência técnica
- **Espelho bloco × banco:** teste real `quiz.test.cjs new`: **486 itens (243 + 243), 408 MCQ, 876 flashcards, 29 mazos, 0 divergências, 0 falhas duras** (avisos de heurística 184, padrão que já existia).
- **V/F novo (N9):** testado no navegador junto com as 28 V/F da matéria (os dois botões passam o mesmo valor; veredito certo aceito, errado rejeitado, explicação aparece).
- **Grifos reais (SELECT somente leitura; só texto, prefixo, sufixo, ocorrência; sem user_id; arquivos fora do Git):** 85+68+17+63+1+60+130+97+2+9 = 532 grifos em Farmacología II; **10 âncoras reais que coincidem com o texto das novas questões foram passadas pelo motor real do site: 10/10 sobrevivem sem remapeamento no mesmo elemento (portão `hl-real --gate` OK)**. Traços: 1 (`f2b00`, fora das seções tocadas); notas: 0. As inserções ficam no fim de grupos, antes dos flashcards; nenhuma frase existente foi alterada.
- Inventário `docs/layout-ensaio/inventario.json` (só a linha da matéria): 472 → 486 itens (`neurologia` e demais linhas intactas).
- Testes de matéria: `temas-farmaco2` 55/55, `real-farmaco2` 121/121, `integracao-farmaco2` 155/155, `nao-ativacao` 39/39, porta `farmacologia-ii` **ABERTA** (não liga nada).

## 5. PENDENTES (sem inventar resposta)
1. **«Los fármacos β₂ agonistas son los broncodilatadores más potentes» (V/F do «Examen en línea», Questões pág. 6; resposta recordada: Falso).** O slide diz que os β₂ são «los broncodilatadores más rápidos y eficaces» e, em outro quadro, que «los más efectivos son los LABA para el asma y LAMA para la COPD». A afirmação é ambígua sem o enunciado original; **não inserida**.
2. **«Tiotropio ou teofilina» como adicional ao ICS/LABA (farmaco p2, completar 2.2):** a prova aceita as duas; o resumo/slide só traz o LAMA. O site mantém `f2b08#24` (tiotropio). Para incluir a teofilina é preciso fonte da cátedra.
3. **Simulado corticoides Q21 (círculo vicioso do peso) e Q24 (efeito indireto do β₂ e dessensibilização):** o resumo não ensina; entram só depois de ensino aprovado.
4. **Antianginosos Q13/Q24 (efeito antianginoso central dos β-bloq.):** idem.
5. **Antihipertensivos Q16 (perda de seletividade com dose alta) e Q19:** não incorporados/lidos.
6. **Páginas não reabertas dos dois PDFs grandes e imagens do Belém completo (§3-B):** reler com 8-A.5-B antes de dar a matéria por esgotada.
7. **Rótulos antigos (#702 §5):** itens antigos rotulados de exame cuja única fonte é classe C continuam como estão (fora do escopo desta PR); recomendo a José decidir em PR própria.
8. **Viés de comprimento / alternativas (#702 §8):** não alterado nesta PR (as 7 novas foram escritas sem viés).

## 6. Autoauditoria
- Diff: só `farmacologia-ii.html` (7 itens × 2 cópias + 5 linhas de contagem), `docs/layout-ensaio/inventario.json` (uma linha) e este pack. Sem arquivo global, função, pagamento, login, Supabase ou migration.
- Nada removido; nenhum texto antigo alterado além dos 5 contadores (separadores 05, 06, 08, 14 e cabeçalho do banco).
- Limites: comparação por raciocínio e referência de ordem de página (`bloco#n`), com leitura das explicações nos casos duvidosos — **não** conferi a pista de cada uma das 486 cópias à mão; arquivos grandes parcialmente relidos (§3-B); sem literatura-base; iPad/Safari não testado.


## §R2 · RODADA 2 (23/11) — páginas que faltavam, correções pedidas e novas questões

### R2-A · Páginas abertas nesta rodada (o que foi aberto, como, e o que não deu para ler)
Todos os PDFs grandes foram abertos pelas cópias `LEITURA_*` da própria pasta (nenhum download falhou). **Nenhuma página deixou de abrir.**
| Arquivo | Páginas | Como foram lidas | Observação de legibilidade |
|---|---|---|---|
| `Provas Compilado farmaco.pdf` (56,8 MB, 27 págs.) | 1–4 | imagem (rodada 1) | legível (fotos da folha de prova com marcas à mão) |
| | 5–9, 10–12, 14, 15–21, 24 | texto nativo (cópia de Belén; **«Gabarito P1 Farmacologia Fila 1»**, págs. 10–12; resumos de aluno 14–21 e 24) | legíveis; 15–21 e 24 são resumo de aluno **sem perguntas** |
| | 13 | folha em branco | — |
| | 22–23, 25–27 | imagem (cadernos manuscritos de antianginosos, antiarrítmicos e digoxina) | legíveis; **notas de aluno**, sem perguntas |
| `Questoes P1 P2 Farmaco_251206_172249.pdf` (22,5 MB, 55 págs.) | 1–4, 7 | imagem (capturas de tela: «Gabarito P1 Turma B Fila 1», recordações P1/P2, lista «Lacuna/Cita») | legíveis |
| | 5–6 | imagem (rodada 1) | legível |
| | 8–28 | texto nativo (cópias de `farmaco p2`, `questoes farmaco`, Belén, e **5 provas «PROVA»** das págs. 21–28) | legíveis |
| | 29–38 | texto nativo (**provas «PROVA» de cardio com 14–20 itens cada**) | legíveis |
| | 39–41 | imagem (fotos de slides da cátedra marcados «EXAME», «V o F», «Completar com: Bismuto») | legíveis, resolução baixa em partes |
| | 42–46 | texto nativo (78 perguntas curtas com resposta) | legíveis |
| | 47–55 | texto nativo (4 casos de hipotireoidismo e capturas de slides) | legíveis |
| `Provas Fármaco II - Belem completo .pdf` (38 págs.) | 1–21 | imagem (**fotos de provas reais P1 e P2 da Dra. Verónica Vega, com carimbos «APROBADO 10/06/26» e data 13/05/2026, e respostas marcadas pelo aluno**) | legíveis; **partes de letra miúda ilegíveis** (pág. 9 direita, pág. 10 esquerda, pág. 14 topo): os itens dessas áreas só foram lidos pelo que aparece em outra versão da mesma prova |
| | 22–38 | texto nativo (já lido na rodada 1) | — |

### R2-B · As duas correções pedidas
1. **Cushing «100 mg/dia» (N9).** Redação exata do slide `05 - Antiinflamatorios esteroideos.pdf` (Drive `1VW6csyen…`, reaberto): «**Dosis superiores a 100 mg/día de cortisol o equivalentes en esteroide sintético durante más de 2 semanas provocarán signos de hipercorticalismo o síndrome de Cushing**»; e, na seção de reações adversas, «los esteroides naturales y sintéticos producen modificaciones estables en la hipófisis y en las suprarrenales **en proporción a la dosis administrada y a la duración de la administración**… si la duración es corta (no mayor de 7-10 días) la función adrenal se recupera de inmediato; si se prolonga **más de 2 semanas**, los cambios atróficos se estabilizan». A prova real (Belém completo, pág. 18, foto) traz o V/F «dosis superiores a **10** mg/día… Cushing» com resposta **F**, e o aluno anotou «≥ 100 mg/dia». **Literatura-base: o Robbins (440 MB) e outros livros não abrem pelo conector; não pude conferir a cifra em literatura.** Por isso a explicação agora diz que **é o número da cátedra** e que o mesmo slide fala em efeito proporcional à dose e à duração, **sem apresentar o número como limite universal**. O flashcard e o parágrafo já existentes no resumo (que dizem «conforme a cátedra» / «umbral») **não foram alterados**.
2. **β-bloqueantes «bloqueio AV» (N4).** Redação exata do slide `03 - antianginosos.pdf` (Drive `1eEZs9BQ…`): «**Absolutas:** Hipotensión · Bradicardia · Bloqueo AV · IC descompensada. **Relativas:** Diabetes · EPOC · Vasculopatía periférica · Angina de reposo · Asma». O slide **não gradua** o bloqueio AV nem a bradicardia. Um caderno de aluno (Compilado pág. 22–23) escreve «BAV de 2º e 3º grau», mas **é nota de aluno, não fonte da cátedra**, e a literatura-base não abre: **o grau do bloqueio fica NÃO CONFIRMADO**. A pergunta foi reformulada para **não depender disso**: a resposta correta passou a ser a **insuficiência cardíaca descompensada** (palavra «descompensada» do slide), e a explicação diz que a cátedra não gradua os outros dois.
3. **Demais afirmações novas** (N1, N2, N5, N7, N8, N10, N12–N20): cada frase foi conferida contra o **resumo do site** e o slide indicado na coluna «Ensino prévio» da §2/R2-C; N8 passou a dizer «aminofilina (uma xantina)» porque o contexto da prova real (item 11 sobre aminofilina, item 12 «este medicamento») **confirma** a inferência da rodada 1.

### R2-C · Questões novas da rodada 2 (além das 7 da §2)
| # | Questão | Rótulo | Fonte (página) | Bloco/banco | Ensino prévio no resumo |
|---|---|---|---|---|---|
| N10 | **Dihidropiridinas na cardiopatia isquêmica** (↑ mortalidade em IAM recente/angina instável; robo coronário) | examen | prova P1 «PROVA 2», item 6 (5 afirmações V/F), `Questoes P1P2` pág. 29–38 | `f2b05` basadas + banco 05 | `f2b05` §9 «Dihidropiridinas · Conforme la cátedra: NO…» |
| N12 | **Aminofilina como causa de náuseas, vômitos, taquicardia e extrassístoles** | examen | Belém completo págs. 8 e 15 (item 11, duas versões da prova); enunciado reconstruído só no «corticoide inhalado», que era distrator no original | `f2b08` + banco 08 | `f2b08` xantinas: RAM por PDE4, PDE3 e A₁ |
| N13 | **Cite 3 efeitos adversos dos anticolinérgicos** (sabor amargo, muco viscoso, rebote) | examen · desarrollo | Belém págs. 6/7 (item 3.1 «Cite») | `f2b08` + banco 08 | `f2b08`: «sequedad de boca, sabor amargo, tos, moco más viscoso… rebote» |
| N14 | **Cite os 3 antitiroideos** (metimazol, PTU, carbimazol) | examen · completar | Belém pág. 13 («Cite 3.1») | `f2b11` + banco 11 | `f2b11` §7.2 e tabela de tionamidas |
| N15 | **Cite 3 SABA e 3 LABA** | examen · desarrollo | Belém págs. 19–21 («Broncodilatadores β de ação curta/longa») | `f2b08` + banco 08 | `f2b08` tabela SABA/LABA |
| N16 | **V/F: sucralfato reduz a absorção de outros fármacos (separar 2 h)** — **reconstruída** a partir de uma foto de slide marcada «V o F» (o enunciado original não aparece) | **Pregunta complementaria · V/F** (por ser reconstruída) | `Questoes P1P2` pág. 40 (foto do slide) | `f2b09` complementarias + banco 09 | `f2b09`: «reduce la absorción de otros fármacos… separar las tomas 2 horas» |
| N17 | **Cite a classificação dos broncodilatadores** (β₂, anticolinérgicos, xantinas) | examen · desarrollo | Belém págs. 12 e 21 (duas provas) | `f2b08` + banco 08 | `f2b08` «Clasificación farmacológica» |
| N18 | **Cite os mecanismos da teofilina** (PDE, adenosina, IL-10, apoptose) | examen · desarrollo | Belém pág. 12 («Cite… mecanismo de acción de las xantinas»); Questões pág. 7 | `f2b08` + banco 08 | `f2b08` teofilina: 4 mecanismos |
| N19 | **Cite as 3 famílias de antianginosos** | examen · desarrollo | Questões págs. 3–4 (lista «Citar: … Fármacos antianginosos e “famílias”», recordações da P1) — **só o tema foi lembrado; enunciado reconstruído** | `f2b05` + banco 05 | `f2b05` «Mapa de los antianginosos: tres familias» |
| N20 | **Cite 3 glicocorticoides de ação intermédia** | examen · desarrollo | Questões pág. 7 (lista «Cita: 3 glucocorticoides de ação intermédia») — tema lembrado; **enunciado reconstruído** | `f2b07` + banco 06 | `f2b07` classificação por duração e tabela de potências |
**Rótulo.** Os itens com enunciado visível em foto de prova real levam «Basada en preguntas de examen». N19 e N20 vêm de **listas de temas lembrados por alunos** (sem enunciado): o rótulo de exame é permitido pela 8-A.4 (recordação), mas o enunciado é reconstrução e isso está dito aqui; se José preferir ser mais conservador, trocar para «Pregunta complementaria». N16 foi marcada como complementaria justamente porque o enunciado não existe.
**Letras:** N10 a · N12 b (as outras desta rodada são abertas).

### R2-D · Registro por arquivo e página (o que as páginas novas continham)
- **Compilado págs. 5–9, 10–12 (texto)** = cópia de Belén (arquivo 9) e «Gabarito P1 Farmacologia Fila 1»: diurético de alça EXCETO (`f2b02#1`) · β-bloq EXCETO (`f2b01#10`) · AINE antiagregante (`f2b04#5`) · edema por calcioantagonista (`f2b03#5`) · carvedilol (`f2b01#3`) · α₂ pré-sináptico/metildopa (`f2b01#8`, `f2b03#4`) · antiarrítmicos classe IC/propafenona (`f2b14#1`, `#13`) · **inibição do SRAA** (`f2b03#11`) · prasugrel (`f2b04#3`) · anti-HTA 1.ª linha em raça negra e **«não responde a IECA/ARA-II → calcioantagonista»** (`f2b02#8`, mesma resposta: calcioantagonista) · HTA+HBP (`f2b01#11`) · Bezold-Jarisch (`f2b05#10`) · AAS V/F (`f2b04#4`) · nebivolol (`f2b01#12`) · celiprolol (`f2b01#4`) · cite efeitos dos nitratos (`f2b05#11`) · cite classificação dos β-bloq (`f2b01#14`) · cite anti-HTA na gravidez (`f2b03#15`). **Todos EXISTE.**
- **Compilado págs. 14–21 e 24 (resumos de aluno)**: sem perguntas (0 linhas de questão). **Págs. 22–23 e 25–27 (cadernos)**: sem perguntas; contêm a nota de aluno sobre «BAV de 2º e 3º grau» (§R2-B.2).
- **Questões págs. 1–2 («Gabarito P1 Turma B Fila 1»)**: mesmos 9 MCQ + completar + V/F + cite do Compilado págs. 10–12 → **EXISTE** (mesmas refs). **Págs. 3–4 e 7**: listas de temas (P1 Belén Turma B Fila 2; Turma D; recordações P2): ahorradores de K⁺ (`f2b02#10`), triada de Bezold (`f2b05#10`), labetalol na gravidez (`f2b03#15`), doxazosina (`f2b01#11`); P2: SABA na crise (`f2b08#3`), roflumilast (`f2b08#1`, `#11`), omalizumab (`f2b08#18`), IBP/omeprazol-clopidogrel (`f2b09#2`, `#7`), H. pylori (`f2b09#12`), misoprostol (`f2b09#1`), bismuto (`f2b09#15`), **cite LABA → N15**, anticolinérgicos (`f2b08#6`; **efeitos adversos → N13**), indicações dos glicocorticoides (`f2b07#8`), **hipertensão por prednisona** (N1, tema), **perda de músculo** (`f2b07#8` e flashcard «catabolismo proteico»: EXISTE parcial, sem pergunta própria), efeitos adversos do sucralfato (`f2b09#16`), **3 glicocorticoides de ação intermédia → N20**, conversor cortisol→cortisona (`f2b07#16`), **mecanismo das xantinas → N18**, IBP prolongado (`f2b09#13`), antagonista H₂ 70 % (`f2b09#6`), fosfolipase A₂ (`f2b06#2`), enzima do zileutón (`f2b08#22`), receptor CysLT₁ (`f2b08#22`).
- **Questões págs. 21–28 e 29–38 («PROVA» de cardio, 6 versões de 14–20 itens)**: furosemida tipo/transportador (`f2b02#16`), α₁ prazosina (`f2b01#21`), β-bloq EXCETO (`f2b01#5`), ergotamina (`f2b01#7`), celiprolol EXCETO (`f2b01#4`), classe III (`f2b14#10`), sildenafilo+nitrato (`f2b05#4`), IECA tosse (`f2b03#1`, `#2`), sotalol (`f2b14#5`), abciximab (`f2b04#1`), classe IA (`f2b14#4`), nitratos incorreta (`f2b05#3`), Prinzmetal (`f2b05#5`), cubeta (`f2b14#9`), IECA contraindicados (`f2b03#3`), diazóxido (`f2b03#7`), alisquireno (`f2b03#8`), AINE tocolítico (`f2b06#1`), «ATIVIDADE» de 15 MCQ (doxazosina `f2b01#11`; canais L: **sem pergunta, tema trivial → não incluída**; verapamilo `f2b03#6`/`#20`; cirrose `f2b02#5`; DHP `f2b03#10`; vasodilatadores `f2b03#9`; hiperpotassemia `f2b02#6`; tosse `f2b03#2`; clonidina `f2b01#8`), caso clínico de angina (`f2b05#1`, `#2`), **DHP V/F de 5 afirmações → N10**. **Pendentes desse grupo:** ① «Sobre a **adrenalina** é correto…» (opção marcada como correta pelo arquivo afirma vasoconstrição das arteríolas **musculares e coronárias (α₁)**, o que **contradiz** o resumo de fisiologia: não inserida); ② «paciente **diabético**: antihipertensivo aconselhado» da «ATIVIDADE» (a resposta do arquivo não é comprovada; o resumo ensina IECA/ARA-II em diabéticos; **elegível como complementaria, não incluída por origem incerta**); ③ «classe **não recomendada** para tratamento inicial» (chave não comprovada).
- **Questões págs. 39–41 (fotos de slides)**: antileucotrienos (esquema 5-LOX/CysLT₁) → `f2b08#22`; **teofilina e diafragma** → `f2b08#19`; **sucralfato: reduz a absorção de outros fármacos, 2 h → N16**; **bismuto «completar»** → `f2b09#15`; anti-H₂ «completar» (70 %) → `f2b09#6`; **fludrocortisona (reações adversas)** → `f2b07#7`; hueso → `f2b07#2`; MgSO₄ → `f2b08#10`. **Págs. 42–46 (78 perguntas curtas)**: tabela item a item em **R2-E**. **Págs. 47–55 (casos de hipotireoidismo)**: `f2b10#3`–`#11` (EXISTE).
- **Belém completo págs. 1–3** (P1, 14 itens): mesmas refs do Compilado págs. 1–4; **diltiazem → N5**. **Pág. 4–5** (celiprolol V/F; cite β-bloq na ICC; cite classificação anti-HTA; explique β-bloq na ICC; **caso P2** de hipotireoidismo subclínico com anti-TPO) → `f2b01#4`, `#15`, `#16`, `f2b02#11`, `f2b10#3`, `#8`. **Págs. 6–7** (P2 turma D): completar transcortina (`f2b07#19`), sucralfato, bismuto, **LAMA** (`f2b08#24`), **cite efeitos adversos dos anticolinérgicos → N13**, esquema H. pylori (`f2b09#12`), anticolinérgicos na asma aguda (`f2b08#6`), asociações fármaco–mecanismo (`f2b08#17`), MgSO₄ (`f2b08#10`), levotiroxina em excesso (`f2b10`), Cushing (`f2b07#1`), omalizumab (`f2b08#18`). **Págs. 8–9** (antileucotrienos `f2b08#20`, hueso `f2b07#2`, xantinas mecanismo `f2b08#4`, IBP `f2b09#2`, **aminofilina → N12**, **diurético → N8**). **Págs. 10–11** (bismuto `f2b09#15`, zileutón/benefício, teofilina V/F `f2b08#4`, β₂ Gs `f2b08#9`, asma refratária MgSO₄ `f2b08#10`, roflumilast `f2b08#11`, antileucotrienos `f2b08#12`/`#22`, PTU V/F `f2b11#5`/`#8`, **caso de lupus com dexametasona: enzima PLA₂** `f2b06#2`, propranolol T₄→T₃ `f2b11#2`, misoprostol `f2b09#1`). **Págs. 12–13** (**cite classificação de broncodilatadores → N17**, **cite mecanismo das xantinas → N18**, levotiroxina `f2b10`, metimazol/peroxidase `f2b11#1`, roflumilast completar `f2b08#1`, antileucotrienos completar `f2b08#12`, IBP bombas novas `f2b09#2`, sucralfato `f2b09#14`, **cite antitiroideos → N14**, indicações dos corticoides `f2b07#8`). **Págs. 14–15** (versão de 13/05/2026: aminofilina **«a) Teofilina»**, diurético, IBP, hueso, xantinas). **Págs. 16–21** (provas de 26/05/2025 e outras: β-adrenérgicos produz `f2b08#9`, antileucotrienos `f2b08#22`, «modificaciones estables» `f2b07#4`, acarbose/biguanida/insulina basal/repaglinida/glibenclamida/DPP-4/taquicardia β/hormonas corticales EXCETO/insulina hipoglucemia (`f2b12#3`–`#8`, `f2b13#4`, `#5`, `f2b08#14`, `f2b07#12`), **V/F Cushing «10 mg» → N9**, critérios de insulinização `f2b13#6`, RAM crónicas dos esteroides `f2b07#9`, **cite LABA/SABA → N15**, classificação de broncodilatadores → N17).

### R2-E · `Questoes P1 P2` págs. 42–46 (perguntas curtas com resposta): decisão por número do arquivo
(Numeração do próprio arquivo: pág. 42 = itens 1–14 da lista de sucralfato/H₂/asma; págs. 43–46 = itens 15–78.)
| Itens do arquivo | Tema | Decisão · ref. no site |
|---|---|---|
| 42·1, 42·2, 49, 65 | sucralfato: mecanismo, pH < 4, barreira, indicação | EXISTE `f2b09#14`, `#8` |
| 42·3 | sucralfato: prostaglandinas e fator de crescimento epidérmico | **PEND** (o resumo ensina só barreira e meio ácido) |
| 42·4, 66, 67, 68, 69, 21, 64 | H₂: mecanismo, representantes, 70 %, cimetidina/CYP, efeitos (confusão no idoso), IBP × H₂ | EXISTE `f2b09#6`, `#11` |
| 42·5 | LABA no asma / LAMA na EPOC | EXISTE `f2b08#2`, `#6` (o resumo traz a frase do slide) |
| 42·6, 61, 62, 22, 41, 8, 45 | antileucotrienos: fármacos, receptor, uso complementar, bronquio | EXISTE `f2b08#20`, `#22`, `#12` |
| 42·7, 27 | esquema de erradicação de H. pylori | EXISTE `f2b09#12` |
| 42·8, 60, 20, 39, 59, 30 | xantinas: efeitos adversos, PDE, diafragma, «incorreta» | EXISTE `f2b08#4`, `#19`, `#23`; efeitos adversos como identificação clínica → **N12** |
| 42·9, 9 (pág. 42), 47, 56 | glicocorticoides e tecido adiposo | EXISTE `f2b07#5` |
| 42·10 | LABA sozinho controla a inflamação? (incorreta) | EXISTE `f2b08#2` |
| 42·11, 36 | MgSO₄ | EXISTE `f2b08#10` |
| 42·12, 48, 70, 63, 28, 50 | IBP: efeitos a longo prazo, mecanismo, usos, lista | EXISTE `f2b09#13`, `#2`; lista de IBP: sem pergunta própria (tema de nomes, valor baixo; **DUP.SEM** parcial de `f2b09#7`) |
| 42·13–14, 15, 16, 44 | fludrocortisona (V/F e efeito principal) | EXISTE `f2b07#6`, `#7` |
| 17, 46, 71 | omalizumab | EXISTE `f2b08#18` |
| 18, 4 (pág. 43) | bismuto | EXISTE `f2b09#15` |
| 19, 39–40, 75, 78 | Addison / ausência ou interrupção do cortisol | EXISTE `f2b07#12` (relacionada) |
| 23, 25, 38, 76 | osteoporose por corticoide | EXISTE `f2b07#2` |
| 24, 29 | anticolinérgicos (ACh; menos eficazes que β₂ no asma) | EXISTE `f2b08#6`, `#8` |
| 25 | roflumilast | EXISTE `f2b08#1`, `#11` |
| 26 | «cite fármacos anticolinérgicos» | **N17** (classificação) e `f2b08#6` |
| 31, 43 | misoprostol | EXISTE `f2b09#1` |
| 33 | tiotropio **ou** teofilina | **PEND** (§5-2) |
| 34 | transcortina | EXISTE `f2b07#19` |
| 35, 51 | fosfolipase A₂ | EXISTE `f2b06#2` |
| 37, 52, 53 | glicocorticoides, leucócitos e sistema imune | EXISTE `f2b07#3` |
| 40 (pág. 44) | Cushing: alterações frequentes | EXISTE `f2b07#1` |
| 42 (pág. 44) | pirose com clopidogrel: «omeprazol» | **Divergência**: o arquivo diz omeprazol (o aluno corrigiu para pantoprazol); o resumo/slide diz que **o omeprazol é o IBP que inibe o CYP2C19**; vale `f2b09#7`; não copiado |
| 54, 55, 57, 58 | glicocorticoides: carboidratos, proteínas, pele, RAM | EXISTE `f2b07#8`, `#9` |
| 72 | 11β-HSD | EXISTE `f2b07#16` |
| 73, 74 | supressão do eixo e retirada brusca | EXISTE `f2b07#10`, `#12` |
| 77 | omeprazol × clopidogrel (CYP2C19) | EXISTE `f2b09#7`, `f2b04#7` |

### R2-F · Números finais e testes
- **Total 236 → 253** (bloco = banco, 0 divergências). Examen **139 → 151** (+12), complementarias **97 → 102** (+5), somas dos separadores (cabeçalho antigo 136/96 não somava: defeito preexistente corrigido). Separadores alterados: 05 (14·8), 06 (13·9), 08 (18·14), 09 (6·11), 11 (8·5), 14 (15·6).
- **Substituições/melhorias de questões antigas (8-A.1-B): 0** (nenhuma versão do material era demonstravelmente mais completa; os ajustes foram só nas minhas próprias questões novas N4, N8, N9). **Sem ids** na matéria; as complementarias do bloco 14 passam de 15–20 a 16–21 por causa de N5.
- **Testes novos** `tools/qa/farmaco2-rodada-2011/farmaco2-rodada.test.cjs`: estático (cada nova 1× no bloco e 1× no banco, idênticas; sem negrito/itálico/cor nas alternativas nem nos enunciados; letra da resposta existe; alternativa correta não muito mais longa; **as 2 V/F novas têm os dois botões com o mesmo valor igual à resposta**; sem 3 letras iguais seguidas nas novas; contadores somam): **104/104**; navegador (os dois botões de cada V/F, bloco e banco: certo aceito, errado rejeitado, explicação aparece): **24/24**.
- `quiz.test.cjs new` (navegador, matéria inteira): 506 itens (253 + 253), 876 flashcards, 29 mazos, **0 divergências, 0 falhas duras**.
- **Grifos (SELECT somente leitura; só texto, prefixo, sufixo, ocorrência; arquivos fora do Git):** 532 grifos; **23 âncoras reais que coincidem com o texto novo, passadas pelo motor real do site: 22 sobrevivem sem remapeamento e 1 (`EPOC`, `f2b08`, ocorrência 16) já não resolvia na `main`** (obsoleta na matéria antiga, **não causada por esta PR**). Traços 1 (`f2b00`), notas 0.
- `temas-farmaco2`, `real-farmaco2`, `integracao-farmaco2`, `nao-ativacao`, porta `farmacologia-ii`: ver o Cartão (resultados na descrição da PR).

### R2-G · Pendências (sem inventar resposta)
1. **Grau do bloqueio AV / gravidade da bradicardia como contraindicação absoluta dos β-bloq.:** o slide não gradua e a literatura-base não abre (Robbins 440 MB; outras sem acesso). Não afirmado.
2. **Limiar «100 mg/dia» de Cushing:** só a cifra da cátedra; sem confirmação em livro.
3. Adrenalina (item de «PROVA 2»): chave do arquivo contradiz o resumo → não inserida. Diabético (ATIVIDADE) e «classe não recomendada no início»: origem/chave não comprovadas.
4. β₂ «mais potentes» V/F, «tiotropio ou teofilina», Q21/Q24 do simulado, Q13/Q24 dos antianginosos (§5): continuam pendentes.
5. Sucralfato e prostaglandinas/EGF: sem ensino.
6. Letra miúda ilegível em 3 trechos das fotos do Belém (R2-A).

## §R3 · RODADA 3 (23/11) — dihidropiridinas e afirmações absolutas nas questões novas

**Pedido de José:** corrigir as questões novas que diziam que TODAS as dihidropiridinas (inclusive amlodipino) não se usam como antianginosos; diferenciar o que a cátedra apresenta dos riscos específicos das formulações de ação curta; revisar explicações para evitar absolutos e ambiguidades.

**O que o slide da cátedra diz (`03 - antianginosos.pdf`):** os calcioantagonistas antianginosos são verapamilo e diltiazem; as dihidropiridinas (nifedipino, amlodipino) ficam no grupo «NO», com a lista de riscos (pode agravar a isquemia, taquicardia reflexa, hipotensão excessiva, roubo coronário, aumento de mortalidade no infarto recente e na angina instável). **O slide não distingue fármacos nem formulações.**

**O que NÃO foi possível confirmar:** a nuance «sobretudo com o nifedipino de ação curta» vem do resumo do site (nota de literatura). A literatura-base de farmacologia **não está acessível** no Drive/projeto (Robbins de 440 MB não baixa; Katzung/Goodman não estão no Drive); as anotações de aluno (`Calcioantagonista.pdf`) não são fonte soberana. Portanto a nuance foi mantida **só como dado do resumo, rotulado como não confirmado**, e as questões já não afirmam que o amlodipino tem o mesmo risco que o nifedipino de ação curta nem que esteja contraindicado.

**Alterações (bloco e banco, idênticas; 13 trocas × 2 cópias):**
| Item | Mudança |
|---|---|
| N10 (f2b05, exame, DHP em IAM/angina instável) | Enunciado «Según el slide…»; explicação separa slide (grupo «NO» + riscos) de dado do resumo (ação curta, não confirmado); alternativas explicadas com «según el slide» |
| N19 (f2b05, desenvolvimento) | Já não diz «no se usan»; diz que o slide apresenta verapamilo/diltiazem e deixa as DHP no grupo «NO»; remete à pergunta de alcance |
| N19 (título do grupo 3) | «según la cátedra» |
| N1(a),(d) corticoides | «los glucocorticoides favorecen…»; «el slide no menciona una acción sobre la renina» |
| N8(a–c) aminofilina diurética | «el slide no describe…» em vez de afirmações categóricas |
| N12(c,d) | «no se asocia a este cuadro»; «explica peor» em vez de «no explica» |
| N12 | «es el escenario típico de la intoxicación» → «hay que vigilar la toxicidad» |
| N7(c,d) | «no figura entre los efectos descritos en el material» |
| N15 | «nunca» → «conforme la cátedra… no se usan solos» |
| N16 | «no se da junto» → «conforme el resumen, conviene no darlo junto» |
| N2(a) | «orienta a otro origen» |

**Gabaritos:** nenhuma resposta correta mudou; contagens inalteradas (253 questões: 151 baseadas em exame · 102 complementarias; 17 novas = 12 exame + 5 complementarias). Nenhuma frase pré-existente do resumo foi alterada nesta rodada → grifos/notas/traços não afetados.

**Testes (executor):** `farmaco2-rodada.test.cjs` estático 104/104 e navegador 24/24 (ambos botões V/F, resposta aparece); `quiz.test.cjs new` FALLAS 0, pares bloco/banco 253/253 sem divergência; `hl-real.cjs --gate` PORTÃO OK (23 grifos reais; 1 obsoleta já conhecida «EPOC», anterior a esta PR); testes nova-era conforme PR.

**Limites:** sem literatura-base de farmacologia; conferência apenas contra slides da cátedra; nuance de formulação não confirmada; sem teste em iPad/Safari; sem conferência manual de pistas por cópia além do teste de comprimento (≤1,6× média).

## §R4 · RODADA 4 (23/11) — retirada da questão nova sobre dihidropiridinas (sobre `dc4a9343`)

**Pedido de José:** as questões novas sobre dihidropiridinas ainda agrupavam nifedipino e amlodipino de forma que podia confundir. Se a diferença entre fármacos e formulações não pudesse ser confirmada na literatura-base disponível, retirar APENAS essas questões novas e registrá-las como pendentes.

**Verificação:** a literatura-base de farmacologia continua inacessível (Drive/projeto: sem Katzung/Goodman/Robbins legível; anotações de aluno não são fonte). O slide `03 - antianginosos` só traz «NO» para nifedipino/amlodipino, sem distinguir fármaco nem formulação. A diferença **não foi confirmada** → critério de José aplicado.

**Retirado (bloco f2b05 e banco f2b15, 2 cópias):**
- **N10** «Basada en preguntas de examen» — afirmações sobre dihidropiridinas (nifedipino, amlodipino) na cardiopatia isquêmica (V/F de 5 afirmações da P1, reescrita como MCQ; resposta a) «pueden aumentar la mortalidad…»). **PENDENTE** até haver literatura-base que confirme a diferença entre fármacos/formulações. Origem preservada neste registro (R2-E, prova P1).

**Ajustado (não retirado):** N19 («Cite las tres familias de fármacos antianginosos», examen·desarrollo) é sobre as três famílias, não sobre DHP. Foi removido só o parágrafo que agrupava nifedipino/amlodipino e remetia à N10; ficam as três famílias (nitratos, β-bloqueantes, calcioantagonistas não dihidropiridínicos: verapamilo e diltiazem) e a frase final sobre demanda/aporte de O₂. Se José preferir retirar a N19 também, é uma única exclusão.

**Contagens (8-A.10):** 253 → **252** (150 baseadas em exame · 102 complementarias); 16 novas (11 exame + 5 complementarias). Cabeçalho do banco 252/150/102; separador do bloco 05: 13 basadas · 8 complementarias (antes 14·8). Inventário: 506 → 504 itens (252 bloco + 252 banco). Nada mais alterado (resumo, flashcards, imagens, grifos, notas, traços intactos; a frase pré-existente do resumo sobre DHP não foi tocada).
