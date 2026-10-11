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

**3.3 Rodada 3 — celular (390 px) no Banco.** Pedido: «resolva o deslocamento de tinta no celular». Método: o Δ de tinta de seção de cada âncora é `v·ΔH_total − cum(y)`; só a **não-linearidade** da deriva acumulada importa. Mediu-se a altura **real** (Chromium, CSS do site) de cada alternativa em 4 larguras, em até 3 variantes — **A** (a da rodada 2), **B** (A encurtada) e **O** (texto original da `main`) — e um recozimento simulado escolheu, por questão, a variante de cada alternativa que mantém a deriva acumulada do Banco quase linear, com penalidade para **não** usar o texto original (O=2,0; B=0,6) e restrições de 8-A.6 (correta nunca a única mais longa de forma sistemática; razão correta/distratores 0,78–1,25). Resultado: **51 das 97 questões** receberam alternativas A/B/O misturadas (**letras da correta inalteradas**, enunciados inalterados, bloco e banco idênticos); nas 204 alternativas dessas 51 questões: 138 ficaram como na rodada 2 (A), **38 voltaram a ser literalmente o texto original** (O) e 28 foram encurtadas (B). Efeito colateral útil: âncoras de elemento com alinhamento exato passaram de 4 134 → **4 206**.

Medida final (`ink.test.cjs`, 4 larguras): **banco (b15) Δ altura 390 px: +1 144** (rodada 2: +3 116; origem: +8 970) · 768: −769 · 1024: −580 · 1440: −580. Enunciados no celular: mediana 168 → **58 px**, p90 716 → **131 px**, máx. 937 → **279 px** (o modelo previu máx. 157; a diferença vem de interações de quebra de linha que o modelo linear não vê). Custo: em 768 px a mediana subiu de 13 para 30 px (p90 48 → 73) e o máximo em 1440 caiu 192 → 124. O celular **não chegou a zero** (o Banco ainda cresce +1 144 px em 390) — o remanescente vem do restante das mudanças da seção (explicações e cartões), que não foram tocadas nesta rodada.

Único ajuste de explicação exigido pela mistura: **#43 (d)** — a alternativa passou a dizer apenas «las tiazidas aumentan la excreción de calcio», então a refutação deixou de falar de dois erros («y el losartán no modifica la calciuria»).

Testes depois da mistura: quiz **0 falhas duras** (428 itens, 358 MCQ, 214/214 pares sem divergência, 876 cartas); grifos — frases não alteradas **599/599** (nível 1), controles **322/322**, **0 mal colocados**; verificação estática — SUB_SEL e ids idênticos (44 ids), letras corretas a/b/c/d = 40/49/46/44, correta única mais longa 35 (20 %).

**Conclusão:** o risco **continua não sendo zero**, mas a rodada 2 o reduziu de forma mensurável. Texto não alterado: alinhamento/recuperação exatos. Traços ancorados à seção: no desktop/tablet o pior caso foi de ~346–407 px para ≤ 192 px (mediana ≤ 34 px; 768: mediana 13 px); no celular o banco geral ainda desloca traços de enunciado (mediana 168 px, p90 716 px). Como o aluno desenha onde estuda — nos blocos, onde o Δ de seção é ≤ 125 px em 1024 — o efeito esperado está concentrado em traços feitos no Banco, em celular.
**Não foi tocado `data-rm-content-rev`**, e não é proposto como solução: ele orfanaria também os 81 % de traços que hoje se alinham exatamente (decisão explícita do José). 

## 4 · Limites do QA

* Harness local sem login/Supabase; a camada real de sincronização e a caneta física **não** foram testadas (fora do escopo; nada nelas foi alterado).
* **Dados reais de tinta/grifos dos alunos não foram consultados**: uma tentativa de leitura no Supabase foi negada pelo sistema de permissões e não foi contornada. Os números acima são **simulados** com o motor real sobre a matéria; não dizem quantos traços reais existem nem onde.
* A medida de tinta modela a **matemática** do motor (normalização por caixa), não o gesto de caneta em tablet real.
* `anchorDe` foi transcrita; qualquer mudança futura em `rm-tools-v2.js` exige repetir a medida.
* Em 390 px o banco geral ainda cresce ≈ 1 140 px (ver 3.2–3.3), contra 3 116 px na rodada 2; o desvio dos enunciados é de mediana 58 px e p90 131 px (máx. 279 px).
