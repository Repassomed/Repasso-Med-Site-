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
| texto **e** caixa idênticos (alinhamento exato, 0 px) | 4 134 (80,7 %) | 4 134 | 4 134 | 4 134 |
| mesmo texto, caixa diferente | **0** | 0 | 0 | 0 |
| texto reescrito | 989 (19,3 %) | 989 | 989 | 989 |
| · variação de altura Δh, mediana / p90 / máx. (px) | 24 / 69 / 141 | 0 / 22 / 90 | 0 / 22 / 90 | 0 / 22 / 90 |

Ou seja: **traço em parágrafo não editado cai exatamente onde estava**. Em parágrafo reescrito o traço continua no parágrafo certo, mas a forma é reescalada: no desktop o desvio vertical típico é 0–22 px (1 linha), no celular até ~140 px no pior parágrafo.

**3.2 Âncoras de seção (traço sobre enunciado de questão ou figura).** Aqui o traço é normalizado pela **seção inteira**: qualquer edição que mude a altura da seção desloca o traço proporcionalmente à posição dele. Medido (px, distância entre o ponto regravado e o conteúdo), **antes da rodada 2 → depois**:

| alvo | 390 px | 768 | 1024 | 1440 |
|---|---|---|---|---|
| enunciados `.quiz-question` — mediana / p90 / máx. **antes** | 334 / 809 / 957 | 142 / 236 / 310 | 120 / 289 / 346 | 117 / 283 / 407 |
| enunciados `.quiz-question` — mediana / p90 / máx. **depois** | 168 / 716 / 937 | 13 / 48 / 96 | 28 / 131 / 171 | 34 / 140 / 192 |
| figuras e ilustrações (269) **antes** | 165 / 428 / 647 | 95 / 165 / 227 | 39 / 115 / 218 | 45 / 139 / 218 |
| figuras e ilustrações (269) **depois** | 63 / 227 / 396 | 22 / 68 / 111 | 16 / 63 / 93 | 18 / 76 / 97 |

Δ de altura das seções (px, **depois**): 1024 → b01 +88 · b02 +67 · b03 +47 · b05 +125 · b07 +71 · **b15 (banco) −317** · demais −111 a +23 (antes: b05 +702, b01 +554, **banco +1 488**). 768 → banco −154. 1440 → banco −207. **390 px (celular) → banco +3 116** (antes +8 970): é o limite remanescente — alternativas que quebram em mais linhas numa coluna estreita; a causa é que os distratores novos e equilibrados têm comprimento parecido com o da correta, em vez de ficarem curtos. As alternativas novas foram dimensionadas por largura (tetos calibrados de caracteres por linha) e distribuídas entre as 97 questões (A/B + difusão de erro) para neutralizar a altura em 768–1440; em 390 não há neutralização completa.

**Conclusão:** o risco **continua não sendo zero**, mas a rodada 2 o reduziu de forma mensurável. Texto não alterado: alinhamento/recuperação exatos. Traços ancorados à seção: no desktop/tablet o pior caso foi de ~346–407 px para ≤ 192 px (mediana ≤ 34 px; 768: mediana 13 px); no celular o banco geral ainda desloca traços de enunciado (mediana 168 px, p90 716 px). Como o aluno desenha onde estuda — nos blocos, onde o Δ de seção é ≤ 125 px em 1024 — o efeito esperado está concentrado em traços feitos no Banco, em celular.
**Não foi tocado `data-rm-content-rev`**, e não é proposto como solução: ele orfanaria também os 81 % de traços que hoje se alinham exatamente (decisão explícita do José). 

## 4 · Limites do QA

* Harness local sem login/Supabase; a camada real de sincronização e a caneta física **não** foram testadas (fora do escopo; nada nelas foi alterado).
* **Dados reais de tinta/grifos dos alunos não foram consultados**: uma tentativa de leitura no Supabase foi negada pelo sistema de permissões e não foi contornada. Os números acima são **simulados** com o motor real sobre a matéria; não dizem quantos traços reais existem nem onde.
* A medida de tinta modela a **matemática** do motor (normalização por caixa), não o gesto de caneta em tablet real.
* `anchorDe` foi transcrita; qualquer mudança futura em `rm-tools-v2.js` exige repetir a medida.
* Em 390 px o banco geral ainda cresce ≈ 3 100 px (ver 3.2).
