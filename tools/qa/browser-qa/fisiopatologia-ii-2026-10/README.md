# QA de navegador · Fisiopatología II (issue #101, PR #481)

Mesmo harness da PR #474 (Farmacología II), adaptado a `fisiopatologia-ii.html` (`#tab-fisio2`, banco = `section#bancofp2`). Chromium real + `app-core.js`, `rm-tools.js` e `styles.css` do site; sem Supabase e sem rede; nenhum arquivo de produto é alterado.

```bash
export NODE_PATH="$(npm root -g)" RM_OUT=/tmp/fp2qa RM_BASE_REF=origin/main && mkdir -p $RM_OUT
H=tools/qa/browser-qa/fisiopatologia-ii-2026-10
node $H/quiz.test.cjs new                       # 558 MCQ (clique certo/errado), V/F, abertas, 16 mazos de flashcards, gêmeos bloco↔banco
node $H/hl.test.cjs                             # recuperação de grifos SEM remapear (motor real)
W=390,768,1024,1440 node $H/ink.test.cjs        # alinhamento da tinta por largura
node $H/hl-remap.test.cjs                       # grifos sintéticos COM remapeamento
node $H/remap-highlights.cjs --in marcas.json --out marcas.remap.json   # remapeia uma exportação real (quem a tem roda; não escreve em lugar nenhum)
```
Variáveis: `RM_BASE_REF`, `RM_ORIG_HTML`, `RM_NEW_HTML`, `RM_CHROMIUM`, `RM_PLAYWRIGHT`, `RM_OUT`.
`remap-highlights.cjs` pareia os elementos ancoráveis por índice (a sequência tem de ser idêntica nas duas versões) e usa `RMTools.indexar` para obter o mesmo texto normalizado que o motor usa; rodar com o **head final**.
