# Evidência · Issue #467 (P0 Neurología — perguntas desconfiguradas)

Capturas reais (Playwright + Chromium headless), harness com `app-core.js`
carregado e `RepassoMed.enhanceTab()` executado sobre o `neurologia.html` da
`main` — não é leitura de HTML cru. Mesma página, mesma rolagem; só muda
`assets/styles.css` + `assets/app-core.js` entre antes/depois.

## Causa raiz

`.interactive-options li { display:flex }` nunca teve `flex-wrap` definido
(default `nowrap`). Quando uma alternativa de MCQ contém `<b>`/`<i>` (ênfase
num termo-chave), cada trecho de texto e a tag inline viram itens de flex
soltos, forçados numa linha só pelo `nowrap` — a alternativa estoura a
largura do card. Bug global, pré-existente (está em `styles.css` desde o
commit inicial do site); Neurología só foi a primeira vez que a #452 usou
`<b>`/`<i>` em alternativas compridas o bastante para expor o defeito. Já
reproduzido em produção em Dermatología (17 alternativas com `<b>`/`<i>`)
e Toxicología (16) antes desta correção — medido com o mesmo harness,
descrito no corpo da PR.

## Pares antes × depois (390px, mobile)

| Pergunta | Antes | Depois |
|---|---|---|
| q-neu011 (marcha, opção D `<i>steppage</i>`) | `antes_q-neu011_390.png` | `depois_q-neu011_390.png` |
| q-neu029 (par XI, opções A/B `<b>mismo</b>`/`<b>contrario</b>`) | `antes_q-neu029_390.png` | `depois_q-neu029_390.png` |
| q-neu082 (Eaton-Lambert, A/B `<b>postsináptico</b>`/`<b>presináptico</b>`) | `antes_q-neu082_390.png` | `depois_q-neu082_390.png` |
| q-neu120 (síndrome medular, 4 opções `<b>peor</b>`/`<b>mejor</b>`) | `antes_q-neu120_390.png` | `depois_q-neu120_390.png` |
| q-neu146 (Trendelenburg, opção A `<b>glúteo medio</b>`) | `antes_q-neu146_390.png` | `depois_q-neu146_390.png` |

## Desktop (1440px) — mesmo bug, forma mais leve (sem estourar o card, mas
texto cortado em duas "colunas" ao redor da palavra em negrito)

`antes_q-neu082_1440.png` → `depois_q-neu082_1440.png`

## Alternativa curta, sem tag — prova de que o layout de quem já estava
correto não muda (comparação pixel a pixel)

`sanity_antes_q-neu001_390.png` ≡ `sanity_depois_q-neu001_390.png`

## Teste funcional de clique (não só visual)

`click-test_q-neu082_correto-marcado.png` — clicou na alternativa errada
(C) em q-neu082; o app marcou B como certa, C como errada e mostrou
"¡INCORRECTO! La correcta era la opción B." (cientificamente correto:
Eaton-Lambert é um defeito pré-sináptico). `checkAnswer()` não foi alterado
e continua funcionando com a nova marcação `<span class="opt-text">`.

## IDs completos afetados (medidos por `scrollWidth > clientWidth`, resumo
e Banco Geral — cada um tem o par `q-neu*`/`bq-neu*`)

- **390px** (5 perguntas × 2 = 10): q-neu011, q-neu029, q-neu082, q-neu120,
  q-neu146.
- **320px** (18 perguntas × 2 = 36): as 5 acima + q-neu001, q-neu040,
  q-neu041, q-neu063, q-neu085, q-neu089, q-neu092, q-neu102, q-neu112,
  q-neu123, q-neu129, q-neu138, q-neu166.
- **768/1024/1440px**: 0 estouros medidos (overflow real); 1440px tinha a
  forma leve do bug (ver acima), corrigida também.

Depois da correção: **0 estouros em 320/390/768/1024/1440px**, em toda a
matéria (resumo + Banco Geral), sem erros de console/JS.
