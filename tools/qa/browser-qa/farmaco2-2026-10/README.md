# QA de navegador · Farmacología II (revisão 2026-10, PR #474)

Testes **reais** (Chromium + `app-core.js`, `rm-tools.js` e `styles.css` do site, sem Supabase e sem rede) que comparam a matéria da base
(`git show origin/main:…`) com a do working tree. Não alteram nenhum arquivo do produto.

```bash
export NODE_PATH="$(npm root -g)" RM_OUT=/tmp/f2qa      # playwright global; saídas JSON
mkdir -p $RM_OUT
node tools/qa/browser-qa/farmaco2-2026-10/quiz.test.cjs new     # quiz (todas as 358 MCQ: clique certo/errado, V/F, abertas) + 29 mazos de flashcards + gêmeos bloco↔banco
node tools/qa/browser-qa/farmaco2-2026-10/quiz.test.cjs orig    # mesma bateria na base, para separar defeito antigo de defeito novo
node tools/qa/browser-qa/farmaco2-2026-10/hl.test.cjs           # recuperação de grifos com o resolvedor real (indexar/escolher/resolverAncora)
W=390,768,1024,1440 node tools/qa/browser-qa/farmaco2-2026-10/ink.test.cjs   # alinhamento da tinta (mesma matemática de rm-tools-v2.js)
node tools/qa/browser-qa/farmaco2-2026-10/real-ink.test.cjs     # TINTA EM POSIÇÃO REAL: caneta de verdade (rm-tools-v2) desenha na base, os traços voltam na versão nova e mede-se onde caem (RM_MID_REF=<commit> compara com uma versão intermediária; NBANCO/NBLOCOS = nº de alvos)
node tools/qa/browser-qa/farmaco2-2026-10/hl-remap.test.cjs     # grifos SINTÉTICOS com e sem remapeamento (prova de conceito: NÃO comprova preservação de grifos reais)
node tools/qa/browser-qa/farmaco2-2026-10/remap-highlights.cjs --in marcas.json --out marcas.remap.json   # remapeia uma exportação real (quem a tem roda; não escreve em lugar nenhum; conferência humana antes de qualquer escrita)
node tools/qa/browser-qa/farmaco2-2026-10/hl-real.cjs --in registros.json --out relatorio.json   # GRIFOS REAIS (consulta somente leitura feita por fora; registros SEM user_id, fora do repositório): quantos sobrevivem na matéria nova sem remap, quantos só com remap, quantos se perdem
```
Variáveis: `RM_BASE_REF` (padrão `origin/main`), `RM_ORIG_HTML` (arquivo da base), `RM_CHROMIUM` (executável), `RM_PLAYWRIGHT`, `RM_OUT`, `RM_DUMP_ROWS=1`.

Notas de método (ver o relatório em `coordination/source-packs/farmacologia-ii-revisao-2026-10-qa-navegador-v1.md`):
* `ink.test.cjs` **transcreve** `anchorDe` (`SUB_SEL`, mínimo 36 px) e a caixa `getBoundingClientRect()+scroll`, porque `window.RMToolsV2` só é montado depois do login;
  força `content-visibility:visible` nas seções (o site usa alturas *estimadas* para seções fora da tela) e carrega todas as imagens antes de medir.
* `hl.test.cjs` gera os registros como o motor cria (`exact_text`, 40 caracteres de prefixo/sufixo, `occurrence`) e resolve com `RMTools.resolverAncora`.

* `real-ink.test.cjs` usa `real-ink.html`: **servidor simulado em memória** (`window.RM_SB`), os INSERTs de traço são só capturados; 0 rede, 0 escrita. O `click` da caneta numa alternativa seria `checkAnswer` (revela a resposta e faz a seção crescer): fica neutralizado na fase de desenho. Valide sempre o controle base→base (`orig`): deve dar ≤ ~5 px.
