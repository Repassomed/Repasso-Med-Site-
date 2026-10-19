# QA de navegador · Fisiopatología II (issue #101, PR #481)

Mesmo harness da PR #474 (Farmacología II), adaptado a `fisiopatologia-ii.html` (`#tab-fisio2`, banco = `section#bancofp2`). Chromium real + `app-core.js`, `rm-tools.js` e `styles.css` do site; sem Supabase e sem rede; nenhum arquivo de produto é alterado.

```bash
export NODE_PATH="$(npm root -g)" RM_OUT=/tmp/fp2qa RM_BASE_REF=origin/main && mkdir -p $RM_OUT
H=tools/qa/browser-qa/fisiopatologia-ii-2026-10
node $H/quiz.test.cjs new                       # 558 MCQ (clique certo/errado), V/F, abertas, 16 mazos de flashcards, gêmeos bloco↔banco
node $H/hl.test.cjs                             # recuperação de grifos SEM remapear (motor real)
W=390,768,1024,1440 node $H/ink.test.cjs        # alinhamento da tinta por largura
node $H/hl-remap.test.cjs                       # grifos SINTÉTICOS COM remapeamento (prova de conceito: NÃO comprova preservação de grifos reais)
node $H/remap-highlights.cjs --in marcas.json --out marcas.remap.json   # remapeia uma exportação real (quem a tem roda; não escreve em lugar nenhum)
node $H/svgfit.cjs                              # texto de SVG que mudou (orig × new) cabe na caixa? (getBBox real; sai com código 1 se estourar)
node $H/hl-real.cjs --in registros.json --out relatorio.json   # GRIFOS REAIS (consulta somente leitura feita por fora; registros SEM user_id, fora do repositório): quantos sobrevivem na matéria nova sem remap
RM_MID_REF=ed08884e node $H/real-ink.test.cjs   # TINTA EM POSIÇÃO REAL: caneta de verdade (rm-tools-v2) desenha na base e mede-se onde os traços caem na versão nova (alvos: bancofp2 × blocos); RM_MID_REF = commit intermediário opcional
```
Variáveis: `RM_BASE_REF`, `RM_ORIG_HTML`, `RM_NEW_HTML`, `RM_CHROMIUM`, `RM_PLAYWRIGHT`, `RM_OUT`.
`remap-highlights.cjs` pareia os elementos ancoráveis por índice (a sequência tem de ser idêntica nas duas versões) e usa `RMTools.indexar` para obter o mesmo texto normalizado que o motor usa; rodar com o **head final**.

> **Aviso sobre grifos:** `hl.test.cjs` e `hl-remap.test.cjs` usam marcações **fabricadas a partir do texto da própria matéria**. Os números mostram o comportamento do motor sobre texto conhecido; não são evidência de que os grifos reais dos alunos foram preservados. Nenhuma dessas ferramentas lê ou escreve no banco.
