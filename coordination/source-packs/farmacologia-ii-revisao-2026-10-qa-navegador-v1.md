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

**O teste achou defeitos meus, já corrigidos:** (i) #192 — após a transposição b→d o parágrafo antigo, com letras antigas, continuava na explicação; (ii) #105 — «(c)» duplicado; (iii) #43/#180 — o cabeçalho da explicação não repetia a alternativa encurtada. Nenhum desses era detectável por contagem ou por SUB_SEL.

Avisos (não-falhas; 132 na base, 130 na nova): o `<strong>` da explicação **parafraseia** a alternativa (convenção antiga do site). Explicações que nomeiam por letra os 3 distratores: **104 → 151 de 179 MCQ**.

## 2 · Recuperação de grifos (`hl.test.cjs`) — motor real `RMTools.indexar/escolher/resolverAncora`

Os registros são gerados como o motor gera (`exact_text`, 40 caracteres de prefixo/sufixo, `occurrence`), a partir da matéria **da base**, para frases e trechos de **975 elementos cuja tinta/texto mudou** (+ 111 elementos de controle), e resolvidos na matéria **nova**.

| grupo | registros | recuperados (nível 1) | tolerante (nível 2) | não recuperados | **posição errada** |
|---|---|---|---|---|---|
| frases **inalteradas** dentro de elementos tocados | 597 | **597 (100 %)** | 0 | 0 | **0** |
| frases **reescritas** | 336 | 0 | 20 | 316 | **0** |
| controle (elementos intocados) | 296 | **296 (100 %)** | 0 | 0 | 0 |

Leitura honesta: **grifo sobre texto que não mudou volta sempre, no lugar certo** (inclusive dentro do mesmo parágrafo em que outra frase foi reescrita). **Grifo sobre uma frase reescrita deixa de ser pintado** — o motor prefere não pintar a pintar errado; a marca continua no banco (nunca apagada) e o aluno pode marcar de novo. Quanto isso pesa: **3,7 % das frases** (271 de 7 314; 2,5 % fora dos quiz-items, 158 dentro deles — o banco duplica as questões).

## 3 · Alinhamento da tinta (`ink.test.cjs`)

A tinta guarda pontos **normalizados** (0–1) pela caixa do elemento-âncora (`caixa(alvo)`, `rm-tools-v2.js`); a âncora é `seção>índice` (`SUB_SEL`, mínimo 36 px) ou a **seção** inteira quando o ponteiro cai fora de `p,li,h2–h5,table,figure,blockquote` (ex.: o enunciado `div.quiz-question`, ilustrações, cartões `div`).
Método: para cada elemento da base simula-se um traço no seu centro, «grava-se» `(anchor_id,u,v)` e repinta-se na versão nova com `elDeAnchor`+caixa; mede-se a distância até o mesmo conteúdo. Larguras 390 / 768 / 1024 / 1440 px, **com `content-visibility` forçado a visível** (o site usa alturas *estimadas* para seções fora da tela — sem isso a medida é falsa) e todas as imagens carregadas. `anchorDe` foi **transcrita** (o objeto `RMToolsV2` só existe depois do login).

**3.1 Âncoras de elemento (`seção>índice`, 5 123).**

| | 390 px | 768 | 1024 | 1440 |
|---|---|---|---|---|
| texto **e** caixa idênticos (alinhamento exato, 0 px) | 4 148 (81,0 %) | 4 148 | 4 148 | 4 148 |
| mesmo texto, caixa diferente | **0** | 0 | 0 | 0 |
| texto reescrito | 975 (19,0 %) | 975 | 975 | 975 |
| · variação de altura Δh, mediana / p90 / máx. (px) | 24 / 69 / 179 | 22 / 22 / 205 | 0 / 22 / 177 | 0 / 22 / 175 |

Ou seja: **traço em parágrafo não editado cai exatamente onde estava**. Em parágrafo reescrito o traço continua no parágrafo certo, mas a forma é reescalada: no desktop o desvio vertical típico é 0–22 px (1 linha), no celular até ~180 px no pior parágrafo.

**3.2 Âncoras de seção (traço sobre enunciado de questão ou figura).** Aqui o traço é normalizado pela **seção inteira**: qualquer edição que mude a altura da seção desloca o traço proporcionalmente à posição dele. Medido (px, distância entre o ponto regravado e o conteúdo):

| alvo | 390 px | 768 | 1024 | 1440 |
|---|---|---|---|---|
| enunciados `.quiz-question` (428) — mediana / p90 / máx. | 334 / 809 / 957 | 142 / 236 / 310 | 120 / 289 / 346 | 117 / 283 / 407 |
| figuras e ilustrações (269) — mediana / p90 / máx. | 165 / 428 / 647 | 95 / 165 / 227 | 39 / 115 / 218 | 45 / 139 / 218 |

Δ de altura das seções (1024 px): b01 +554 · b02 +365 · b03 +377 · b05 +702 · b07 +140 · b15 (banco) +1 488 (nos demais: −28 a +139); no celular (390 px) o banco cresce **+8 970 px**, porque as alternativas mais longas quebram em mais linhas. Os maiores vêm de: cartões novos (b01, b05), alternativas equilibradas (banco) e alguns parágrafos ampliados.

**Conclusão:** o risco **não é zero**. Para traços e grifos sobre texto que não mudou, a recuperação/alinhamento é exata. Para traços ancorados à seção (enunciados de questão, figuras) e para trechos reescritos há deslocamento mensurável; só o banco geral (f2b15) concentra o pior caso (alternativas mais longas em 97 questões espelhadas).
**Não foi tocado `data-rm-content-rev`**: ele orfanaria também os 81 % de traços que hoje se alinham exatamente. A decisão de aplicá-lo (por seção) é do José; recomendo **não** aplicá-lo no corpo e **considerar** só no banco geral (f2b15), onde o desvio é maior e há pouca tinta provável (o aluno desenha onde estuda, nos blocos).

## 4 · Limites do QA

* Harness local sem login/Supabase; a camada real de sincronização e a caneta física **não** foram testadas (fora do escopo; nada nelas foi alterado).
* A medida de tinta modela a **matemática** do motor (normalização por caixa), não o gesto de caneta em tablet real.
* `anchorDe` foi transcrita; qualquer mudança futura em `rm-tools-v2.js` exige repetir a medida.
