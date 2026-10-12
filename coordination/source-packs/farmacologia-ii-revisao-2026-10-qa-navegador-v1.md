# Farmacología II · Revisão 2026-10 — QA de navegador, grifos e tinta (documento interno)

> PR #474. Harness reproduzível em `tools/qa/browser-qa/farmaco2-2026-10/` (README com os comandos).
> Chromium real + `app-core.js`, `rm-tools.js` e `styles.css` **do site**; matéria da base (`origin/main`) × matéria do working tree. Sem Supabase, sem rede, nenhum arquivo de produto alterado.

## 1 · Quiz e flashcards (`quiz.test.cjs`) — **0 falhas duras**, base e nova

| verificação | base | nova |
|---|---|---|
| quiz-items no DOM após `enhanceAll` | 428 | 428 |
| MCQ interativas (4 alternativas a–d, `data-correct` derivado da explicação) | 358 | 358 |
| `data-correct` = letra do `<strong>` da explicação, nas 358 | ✅ | ✅ |
| clicar **uma alternativa errada** em cada uma das 358: `.wrong` só na escolhida, `.correct` só na certa, feedback «¡INCORRECTO! La correcta era la opción X», 2.º clique ignorado, resposta revelada | 358/358 | 358/358 |
| clicar **a correta** em cada uma das 358: `.correct`, feedback «¡CORRECTO!» | 358/358 | 358/358 |
| 28 V/F (14 + espelho): botão certo → ✅ | 28/28 | 28/28 |
| 42 abertas («Ver respuesta») revelam a resposta | 42/42 | 42/42 |
| gêmeos bloco ↔ banco (rótulo, alternativas, `data-correct`, resposta) | 214/214 | 214/214 |
| 29 mazos de flashcards (**876 cartas**): abrir, percorrer na ordem comparando frente/dorso com a fonte, girar, «fim de ronda», barajar conserva o conjunto, fechar | 29/29 | 29/29 |
| `pageerror` | 0 | 0 |

**O teste achou defeitos meus, já corrigidos:** (i) #192 — após a transposição b→d o parágrafo antigo, com letras antigas, continuava na explicação; (ii) #105 — «(c)» duplicado; (iii) #43/#180 — o cabeçalho da explicação não repetia a alternativa encurtada. (Rodada 2: o teste continua com **0 falhas duras** depois de restaurar os 32 cabeçalhos originais com a letra nova de #188/#192 e de reformular #114.) Nenhum desses era detectável por contagem ou por SUB_SEL.

Avisos (não-falhas; 132 na base, 130 na nova): o `<strong>` da explicação **parafraseia** a alternativa (convenção antiga do site). Explicações que nomeiam por letra os 3 distratores: **104 → 151 de 179 MCQ**.

## 2 · Recuperação de grifos (`hl.test.cjs`) — motor real `RMTools.indexar/escolher/resolverAncora`

Os registros são gerados como o motor gera (`exact_text`, 40 caracteres de prefixo/sufixo, `occurrence`), a partir da matéria **da base**, para frases e trechos de **989 elementos cuja tinta/texto mudou** (+ 110 elementos de controle), e resolvidos na matéria **nova**.

| grupo | registros | recuperados (nível 1) | tolerante (nível 2) | não recuperados | **posição errada** |
|---|---|---|---|---|---|
| frases **inalteradas** dentro de elementos tocados | 599 | **599 (100 %)** | 0 | 0 | **0** |
| frases **reescritas** | 290 | 0 | 4 | 286 | **0** |
| controle (elementos intocados) | 314 | **314 (100 %)** | 0 | 0 | 0 |

**Rodada 2 (o que mudou para reduzir a perda).** As alternativas de quiz **não são grifáveis** (`indexar` pula `[onclick]`/`[data-option]`/`li` de opção), então reformulá-las não tira nenhum grifo; o que pesa são as frases de **texto** e de **explicação**. Por isso: (i) as 32 explicações cujo cabeçalho tinha sido reescrito voltaram ao cabeçalho original (só a letra muda em #188/#192) e os fragmentos «Las otras…» originais foram restaurados — as explicações novas agora **acrescentam** frases em vez de substituir; (ii) os acréscimos editoriais E1–E10 foram encurtados; (iii) o painel de dihidropiridinas voltou ao título original.
Frases do original que deixam de existir literalmente (7 314 frases de 25–260 caracteres): **233 (3,2 %)** — eram 271 (3,7 %) antes da rodada 2; fora dos quiz-items **113 (2,5 %)**. Em janelas de 6 palavras (o que o nível tolerante procura): **2,54 %** (era 2,94 %). O resto das perdas é **autorizado**: remoção de estratégia/voz de prova (G0), correção científica e refutação de distratores trocados. A lista frase a frase, com a frase mais próxima do texto novo, está em `farmacologia-ii-revisao-2026-10-rastreio-v1.md`.

Leitura honesta: **grifo sobre texto que não mudou volta sempre, no lugar certo** (inclusive dentro do mesmo parágrafo em que outra frase foi reescrita). **Grifo sobre uma frase reescrita deixa de ser pintado** — o motor prefere não pintar a pintar errado; a marca continua no banco (nunca apagada) e o aluno pode marcar de novo. Perda residual: ≈ 3 % das frases, **nenhum grifo fica no lugar errado**.

### 2-B · Grifos afetados pelas reescritas — conferência semântica (rodada 4)

**Universo (do rastreio `…-rastreio-v1.md`):** 646 frases da `main` deixaram de existir literalmente; **400 são alternativas de quiz** (`li` de opção — o motor não as indexa e nenhum aluno consegue grifá-las) → **246 frases grifáveis** (182 nos blocos + 64 no espelho do Banco). Li as 246 (par antes → depois, palavra a palavra) e classifiquei pelo que mudou:

| classe | blocos | Banco | o que significa para um grifo que o aluno tenha feito ali |
|---|---:|---:|---|
| **A · só o enquadramento de prova mudou, o fato está intacto** («muy preguntado», «el examen te quiere hacer tropezar», «dónde concentrar el estudio», «de examen» → «clave»…) | 124 | 15 | o grifo seguia um fato que continua lá; o remapeamento (ferramenta) transfere sem mudar o sentido |
| **B · explicação de questão reescrita junto com as alternativas** («Las otras: (a)…», letras e refutações trocadas) | 18 | 18 | o grifo marcava a refutação de um distrator que deixou de existir naquela forma — **não deve ser transferido**; o aluno refaz |
| **C · conteúdo científico/didático reescrito** (dihidropiridinas, misoprostol→mecanismo, «tubulotóxico»→queda hemodinâmica, ordem α→β no feocromocitoma, ticagrelor, DM1…) | 31 | 25 | o texto marcado **mudou de sentido por correção**; transferir o grifo seria enganoso — decisão humana, caso a caso |
| **D · trivial** (pontuação, uma palavra solta) | 9 | 6 | o nível tolerante do motor às vezes volta sozinho; o remapeamento resolve o resto |

Não há perda de informação ensinável escondida em A (a estratégia de prova foi trocada por texto didático equivalente, conforme a G0), e B/C são trocas **intencionais** (alternativas novas; correção científica). O que se perde é o **grifo antigo**, não o conteúdo.

**Simulação com a ferramenta de remapeamento (`hl-remap.test.cjs`, motor real, marcações SINTÉTICAS geradas do texto da base — não são grifos de alunos):** frases inteiras das 877 marcações em elementos alterados: sem remapear **651 (74,2 %)** voltam; com remapeamento **873 (99,5 %)**, 0 em posição errada; janelas de 5 palavras (5 201): 4 290 (82,5 %) → **5 120 (98,4 %)**, 1 em posição errada (frase repetida em dois elementos de f2b06); controles de texto intacto 246/246 e 1 361/1 361 **sem serem tocados**. O teste achou e corrigi dois defeitos da ferramenta: (i) pares de inserção com pouco contexto («(a) el» → «Las otras: (a) el») casavam em qualquer parágrafo da seção e corrompiam marcações de texto intacto — agora cada marcação é localizada na matéria antiga (`locateAll`, mesmo resolvedor do motor) e só recebe os pares do **seu** elemento; (ii) os pares eram aplicados em cascata sobre o texto já alterado — agora casam simultaneamente no texto original.

**Limites (não tratar como preservação comprovada):** as marcações são fabricadas por mim; marcas reais podem cobrir dois elementos, cortar palavras, ter sido feitas sobre versões anteriores do texto ou ser notas/glossário; a ferramenta **não escreve** em lugar nenhum. **Atualização (12/10): os registros reais foram lidos em consulta somente leitura** — ver o protocolo, seção «Validação com registros REAIS»: dos 238 grifos existentes, 224 sobreviviam à versão com voz neutra em todo o texto, 10 só voltariam com remapeamento e 3 se perdiam; a versão atual devolve ao texto literal os 11 pontos de voz de prova e 2 acréscimos científicos que esses grifos cobrem, e **237 de 238 sobrevivem sem remapeamento** (o 238.º já não existe na `main`). Os números acima (sintéticos) continuam valendo para grifos **futuros** sobre as demais frases reescritas (classes A–D; ficam guardados, mas deixam de ser pintados sem remapeamento).

## 3 · Alinhamento da tinta (`ink.test.cjs`)

A tinta guarda pontos **normalizados** (0–1) pela caixa do elemento-âncora (`caixa(alvo)`, `rm-tools-v2.js`); a âncora é `seção>índice` (`SUB_SEL`, mínimo 36 px) ou a **seção** inteira quando o ponteiro cai fora de `p,li,h2–h5,table,figure,blockquote` (ex.: o enunciado `div.quiz-question`, ilustrações, cartões `div`).
Método: para cada elemento da base simula-se um traço no seu centro, «grava-se» `(anchor_id,u,v)` e repinta-se na versão nova com `elDeAnchor`+caixa; mede-se a distância até o mesmo conteúdo. Larguras 390 / 768 / 1024 / 1440 px, **com `content-visibility` forçado a visível** (o site usa alturas *estimadas* para seções fora da tela — sem isso a medida é falsa) e todas as imagens carregadas. `anchorDe` foi **transcrita** (o objeto `RMToolsV2` só existe depois do login).

**3.1 Âncoras de elemento (`seção>índice`, 5 123).**

| | 390 px | 768 | 1024 | 1440 |
|---|---|---|---|---|
| texto **e** caixa idênticos (alinhamento exato, 0 px) | 4 206 (82,1 %) | 4 206 | 4 206 | 4 206 |
| mesmo texto, caixa diferente | **0** | 0 | 0 | 0 |
| texto reescrito | 917 (17,9 %) | 917 | 917 | 917 |
| · variação de altura Δh, mediana / p90 / máx. (px) | 24 / 71 / 141 | 0 / 22 / 90 | 0 / 22 / 90 | 0 / 22 / 90 |

Ou seja: **traço em parágrafo não editado cai exatamente onde estava**. Em parágrafo reescrito o traço continua no parágrafo certo, mas a forma é reescalada: no desktop o desvio vertical típico é 0–22 px (1 linha), no celular até ~140 px no pior parágrafo.

**3.2 Âncoras de seção (traço sobre enunciado de questão ou figura).** Aqui o traço é normalizado pela **seção inteira**: qualquer edição que mude a altura da seção desloca o traço proporcionalmente à posição dele. Medido (px, distância entre o ponto regravado e o conteúdo), **antes da rodada 2 → depois da rodada 2 → depois da rodada 3** (alternativas misturadas por altura real, §3.3):

| alvo | 390 px | 768 | 1024 | 1440 |
|---|---|---|---|---|
| enunciados `.quiz-question` — mediana / p90 / máx. **antes** | 334 / 809 / 957 | 142 / 236 / 310 | 120 / 289 / 346 | 117 / 283 / 407 |
| enunciados `.quiz-question` — mediana / p90 / máx. **depois (rodada 2)** | 168 / 716 / 937 | 13 / 48 / 96 | 28 / 131 / 171 | 34 / 140 / 192 |
| enunciados `.quiz-question` — mediana / p90 / máx. **depois (rodada 3)** | **58 / 131 / 279** | 30 / 73 / 108 | 28 / 68 / 101 | 35 / 73 / 124 |
| figuras e ilustrações (269) **antes** | 165 / 428 / 647 | 95 / 165 / 227 | 39 / 115 / 218 | 45 / 139 / 218 |
| figuras e ilustrações (269) **depois (rodada 2)** | 63 / 227 / 396 | 22 / 68 / 111 | 16 / 63 / 93 | 18 / 76 / 97 |
| figuras e ilustrações (269) **depois (rodada 3)** | 34 / 163 / 246 | 17 / 76 / 144 | 15 / 84 / 102 | 18 / 78 / 112 |

Δ de altura das seções (px, **depois**): 1024 → b01 +88 · b02 +67 · b03 +47 · b05 +125 · b07 +71 · **b15 (banco) −317** · demais −111 a +23 (antes: b05 +702, b01 +554, **banco +1 488**). 768 → banco −154. 1440 → banco −207. **390 px (celular) → banco +3 116** (antes +8 970): é o limite remanescente — alternativas que quebram em mais linhas numa coluna estreita; a causa é que os distratores novos e equilibrados têm comprimento parecido com o da correta, em vez de ficarem curtos. As alternativas novas foram dimensionadas por largura (tetos calibrados de caracteres por linha) e distribuídas entre as 97 questões (A/B + difusão de erro) para neutralizar a altura em 768–1440; em 390 não há neutralização completa.

**3.3 Rodada 3 — mistura de alternativas por altura real.** Pedido: «resolva o deslocamento de tinta no celular». Método: o Δ de tinta de seção de cada âncora é `v·ΔH_total − cum(y)`; só a **não-linearidade** da deriva acumulada importa. Mediu-se a altura **real** (Chromium, CSS do site) de cada alternativa em 4 larguras, em até 3 variantes — **A** (a da rodada 2), **B** (A encurtada) e **O** (texto original da `main`) — e um recozimento simulado escolheu, por questão, a variante que mantém a deriva acumulada do Banco quase linear, com penalidade para **não** usar o texto original (O=2,0; B=0,6) e restrições de 8-A.6 (correta nunca a única mais longa de forma sistemática; razão correta/distratores 0,78–1,25). **Letras da correta, enunciados e espelho bloco↔banco inalterados.**

Duas passagens, com o teste de posição real (§3.4) decidindo entre elas:
* **v1** (pesos 2,1,1,1 — prioriza o celular): 51 questões; no celular melhorou muito, mas **no tablet (768 px) piorou em relação à rodada 2** (mediana 12 → 30 px; 38 → 31 de 44 traços ficaram na mesma questão).
* **final** (pesos 1,5/1/1/1; **adotada**): **47 das 97 questões**; nas 188 alternativas delas: 126 como na rodada 2 (A), **39 voltaram a ser literalmente o texto original** (O) e 23 foram encurtadas (B). Recupera o 768 px (mediana 18 px; 38/44 na mesma questão) mantendo o ganho no celular. Âncoras de elemento com alinhamento exato: 4 134 → **4 208**.

Medida com `ink.test.cjs` (conteúdo todo renderizado, matemática do motor; Δ altura do Banco): **390 px: +1 239** (rodada 2: +3 116; origem: +8 970) · 768: −681 · 1024: −602 · 1440: −580. Enunciados (mediana / p90 / máx., px): **390: 65 / 132 / 270** (rodada 2: 168 / 716 / 937) · 768: 20 / 58 / 109 · 1024: 29 / 66 / 88 · 1440: 35 / 77 / 103. **O Δ total de altura não é a métrica certa** (pode até subir, como de +1 144 para +1 239, enquanto o deslocamento cai): importa a não-linearidade, e ela é medida em §3.4 com traços de verdade.

Ajustes de explicação exigidos pelas variantes (todos em bloco e banco, dentro do mesmo `<p>`): **#43 (d)** — a alternativa passou a dizer só «las tiazidas aumentan la excreción de calcio», então a refutação deixou de falar de dois erros; **#188 (b)(d)** — a refutação da NPH/glargina ficou precisa («la NPH no es prandial: su pico es tardío y no permite inyectarse después de comer; la glargina es basal, sin pico»), a pedido do revisor independente (§ questões 4-D).

Testes da versão final: quiz **0 falhas duras** (428 itens, 358 MCQ, 214/214 pares sem divergência, 876 cartas); grifos — frases não alteradas **599/599** (nível 1), controles **326/326**, **0 mal colocados**; SUB_SEL e 44 ids idênticos, letras corretas a/b/c/d = 40/49/46/44, correta única mais longa 33 (18 %).

**3.4 Rodada 4 — tinta EM POSIÇÃO REAL (`real-ink.test.cjs`).** Pedido: «resolva ou delimite com teste de anotações em posição real». O teste usa a **caneta de verdade** (`rm-tools-v2.js` montado com um servidor simulado em memória: `RMToolsV2.escolherFerramenta('pen')` + eventos de caneta do Chromium via CDP → `pointerdown/move/up`, captura, `anchorDe`, normalização pela caixa, INSERT capturado), em vez de transcrever a matemática:
1. na matéria da **base** (`origin/main`) desenha-se um sublinhado de ~120 px na 1.ª linha do enunciado ou da 1.ª alternativa de **100 questões** (60 no Banco, 40 nos blocos; amostragem estratificada fixa), em cada largura (390/768/1024/1440);
2. os traços capturados voltam como «vindos do banco» em uma página nova da base (**controle**), da **rodada 2** e da **versão atual**; depois de rolar até a questão e esperar o motor assentar, mede-se onde a tinta caiu em relação à **mesma linha da mesma questão**.

*Validade do teste:* o controle base→base dá mediana 0,2–0,4 px, p90 ≤ 4 px e máx. ≤ 5 px em todas as larguras (exceto 1 alvo de bloco, em 390, que a página não chegou a renderizar — presente também na base, portanto falha de medição, não de edição; excluído das tabelas abaixo). Três armadilhas reais do harness foram corrigidas antes disso: o `click` de uma caneta numa alternativa **revela a resposta** e faz a seção crescer ~600 px (neutralizado só na fase de desenho); imagens `lazy` mudam a altura da seção (carregadas antes); seções fora da janela têm altura **estimada** e itens sem caixa (a rolagem agora vai até o item ter caixa real). Sem isso o controle dava centenas de px de erro.

*Traços ancorados à SEÇÃO (o caso crítico: ponteiro fora de qualquer `p/li/table…`, como o enunciado `div.quiz-question`) — Banco Geral, mediana / p90 / máx. (px) · traços que continuam na mesma questão:*

| largura | rodada 2 | v1 (celular primeiro) | **final** |
|---|---|---|---|
| 390 | 343 / 770 / 892 · 24 de 41 | 49 / 108 / 117 · 33 de 41 | **72 / 114 / 139 · 33 de 41** |
| 768 | 12 / 50 / 94 · 38 de 44 | 30 / 67 / 78 · 31 de 44 | **18 / 48 / 59 · 38 de 44** |
| 1024 | 88 / 141 / 169 · 17 de 41 | 33 / 68 / 79 · 26 de 41 | **32 / 53 / 69 · 27 de 41** |
| 1440 | 106 / 150 / 191 · 18 de 41 | 47 / 78 / 99 · 20 de 41 | **48 / 78 / 99 · 20 de 41** |

*Todos os traços de seção (Banco + blocos; n = 64–73), final:* 390: 68 / 121 / 156 · 53 de 64 na mesma questão; 768: 19 / 56 / 106 · 52 de 73; 1024: 27 / 62 / 88 · 47 de 71; 1440: 38 / 78 / 99 · 40 de 69 (rodada 2: 198 / 736 / 892 · 45; 16 / 50 / 94 · 58; 29 / 134 / 169 · 44; 34 / 143 / 191 · 44). *Traços ancorados ao ELEMENTO (sobre um `li`/`p`):* mediana 0 px; p90 ≤ 16 px em ≥ 768; **em 390, p90 97 px e máx. 236 px (3 de 35 caíram em outra questão)** — são alternativas reescritas que quebram em outro número de linhas.

**Leitura honesta (delimitação, não solução).** (a) O deslocamento de tinta ancorada à seção **não é zero**: ~1 linha (18–32 px) no tablet, 48 px no desktop largo, 72 px no celular, no pior caso 140 px; como o sublinhado fica na 1.ª linha do enunciado (perto do topo da questão, que mede ~310 px de mediana em 768–1440 e ~540 px em 390), um deslocamento para cima de ~20–30 px já o põe na questão anterior — por isso **só metade dos traços de enunciado do Banco continua na mesma questão no desktop largo** (1440: 20 de 41), embora a distância seja pequena. (b) Comparando com a rodada 2, o celular melhorou muito (343 → 72 px de mediana) e 1024/1440 melhoraram o p90 e o máximo (141 → 53 e 169 → 69 px em 1024); **768 px ficou equivalente** (não melhor). (c) Nos **blocos**, os traços de seção seguem 15–52 px deslocados por causa de edições de texto legítimas (voz G0, E1–E10), que esta rodada não desfaz. (d) A mistura A/B/O é um *trade-off* entre larguras: o modelo previu e o teste real confirmou (mediana prevista × medida: 390 → 59 × 72; 768 → 15 × 18; 1024 → 32 × 32; 1440 → 47 × 48). (e) **Limites do teste:** 100 sublinhados por largura em pontos amostrados (enunciado e 1.ª alternativa), não gestos livres; caneta emulada (CDP), não física; servidor simulado; nenhum dado real de aluno. (f) Observação do harness, **não medida com alunos**: no Banco, revelar uma resposta faz a seção crescer; tinta ancorada à seção depende desse estado e isso já ocorre hoje, independente desta PR.

**Conclusão:** o risco **continua não sendo zero**, mas a rodada 2 o reduziu de forma mensurável. Texto não alterado: alinhamento/recuperação exatos. Traços ancorados à seção (teste de posição real, §3.4): mediana 18–72 px e máx. ≤ 139 px no Banco em todas as larguras (rodada 2: até 892 px no celular); permanece a troca de questão vizinha em parte dos traços de enunciado. Como o aluno desenha onde estuda — nos blocos, onde o Δ de seção é ≤ 125 px em 1024 — o efeito esperado está concentrado em traços feitos no Banco, em celular.
*Repetição em `e9334c1f` (12/10, depois de devolver ao texto literal os pontos cobertos por grifos reais):* o teste de posição real foi refeito (100 traços por largura, base × `3990cbff` × head). Banco/seção ficou **idêntico** à linha «final» da tabela (390: 72/114/139 · 33 de 41; 768: 18/48/59 · 38 de 44; 1024: 32/53/69 · 27 de 41; 1440: 48/78/99 · 20 de 41). Blocos: p90 de 70,3 → 75,3 px (1024) e 66,0 → 73,6 px (1440); 390 e 768 iguais — as frases restauradas têm altura ligeiramente diferente das neutras; nenhum traço mudou de questão por causa disso. O único traço de tinta real da matéria está ancorado à seção da portada (f2b00), cuja altura varia ≤ 28 px a 390 px e 0 nas outras larguras.

**Não foi tocado `data-rm-content-rev`**, e não é proposto como solução: ele orfanaria também os 81 % de traços que hoje se alinham exatamente (decisão explícita do José). 

## 4 · Limites do QA

* Harness local sem login/Supabase; a camada real de sincronização e a caneta física **não** foram testadas (fora do escopo; nada nelas foi alterado).
* **Dados reais de tinta/grifos dos alunos não foram consultados**: uma tentativa de leitura no Supabase foi negada pelo sistema de permissões e não foi contornada. Os números acima são **simulados** com o motor real sobre a matéria; não dizem quantos traços reais existem nem onde.
* A medida de tinta modela a **matemática** do motor (normalização por caixa), não o gesto de caneta em tablet real.
* `anchorDe` foi transcrita; qualquer mudança futura em `rm-tools-v2.js` exige repetir a medida.
* Em 390 px o banco geral ainda cresce ≈ 1 140 px (ver 3.2–3.3), contra 3 116 px na rodada 2; o desvio dos enunciados é de mediana 58 px e p90 131 px (máx. 279 px).
