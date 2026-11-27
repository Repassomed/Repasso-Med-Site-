# Nova Era · Neurología · preparo para a prévia privada (26/11/2026)

**Executor:** Claude 1 · **Base testada:** `main` `6860acb9` + #682 (`72d4e260`, merge limpo; `git merge-tree` sem conflito) · **PR empilhada sobre a #682.**
**Decisão de José (26/11):** a ativação é **primeiro só na conta dele, matéria por matéria**; nada para alunos; Imagenología e Bioestadística fora do plano. **Nada foi ativado, registrado em tabela ou escrito no Supabase** nesta rodada (nenhum SQL, nem SELECT).

## 1 · Integração da #682 (verificada)
- #682 está **aberta** (não mesclada); #687 e #715 já estão na `main`. A #682 integra **limpa** na `main` atual (4 commits da `main` que ela não tem, 0 conflitos).
- No checkout `main + #682`: inventário em dia (`0-inventario-em-dia`), marcadores no HTML, âncoras estáveis e ida-e-volta de grifos/traços/notas **PASSAM** (porta etapas 0–2).
- **Ordem obrigatória de merge:** #682 → esta PR (a prévia testa Neurología já com as 13 infografias e o texto de PL corrigido).

## 2 · O que a PR faz (código, sem tocar o conteúdo)
| Arquivo | Mudança |
|---|---|
| `assets/rm-pilot.js` | `neurologia` entra em `CANDIDATAS` (1.ª fechadura: só passa a **perguntar** ao servidor; a 2.ª fechadura, o servidor/tabela, continua negando); `VER` → `2026112601` |
| `index.html` | tag do `rm-pilot.js` com a mesma versão |
| `assets/rm-materia-sistema.js` | classificador `clasificarNE` (ids `neub01…27` = «BLOQUE NN»; `neuportada` → card «R»; `banconeu` → «B»; `revisaoneu` → «F»); tema `neurologia` sem unidades (o marcador «UNIDAD X» repete e salta), sem vinhetas (logotipo; arte pendente) |
| `assets/rm-materia-sistema.css` | identidade de cor violeta + rótulos «UNIDAD ·» ocultos (mesmo padrão de Dermatología/Fisiopatología II) |
| `tools/qa/nova-era/real-neurologia.test.cjs` | ligação real (servidor real + rm-pilot real + tema + navegação + caneta V2) para Neurología |
| `tools/qa/pre-voo/nao-ativacao.test.cjs` | Neurología entra nas listas de candidatas; o controle «fora das CANDIDATAS» passa a ser só Imagenología |
| `tools/qa/pre-voo/auditoria-implantacao-publica.test.cjs` | `neurologia` na lista de candidatas aceitas |
| `docs/nova-era/ROTEIRO-NEUROLOGIA.md` | roteiro de José (1 comando SQL de prévia só administrador + conferência + volta) — **não executado** |

**Nenhum texto, id, questão, flashcard, imagem ou HTML da matéria foi alterado.**

## 3 · Achados e correções de oráculo (só ferramentas de QA)
1. A porta fechava na etapa 3 com `toda-secao-tem-card` (4 larguras): a abertura `neuportada` tem conteúdo próprio (hero com contagens) e, ao contrário das outras matérias (portada vazia e oculta), não podia ficar sem card. **Correção no tema:** `neuportada` → repaso «R» (como a portada de Medicina Familiar). Depois disso: **porta 7/7 ABERTA**.
2. `real-neurologia` apontava «capa 296 ≠ modo 297»: o layout conta perguntas **distintas** (enunciado + conjunto de alternativas) e a matéria tem **1 par idêntico** (`q-neu234` = `q-neu-2509-05`, pendência já registrada). O teste agora calcula os repetidos no DOM com a mesma regra do layout (como já fazia para flashcards). **Nenhuma pergunta foi apagada.**

## 4 · Resultados (Chromium real, Supabase simulado, 0 rede externa, 0 escrita real)
Ver o cartão da PR para os números finais. Incluem: porta 7/7 · `real-neurologia` (1440, 768, 390) · `css-temas` 76/76 · `nova-era/servidor` 59/59 · `gate-por-materia` 48/48 · `caneta-por-materia` 34/34 · `nao-ativacao` 38/38 · `previa-lote` 18/18 · `previa-lote-acesso` 18/18 · `auditoria-implantacao-publica` (base = #682).

## 5 · Limites e pendências
- «Preparada» = código + ensaio em navegador com Supabase simulado; **não prova** a tabela real, o deploy, nem o toque físico no iPad com Apple Pencil (isso é de José).
- Vinhetas ilustradas: logotipo em todos os blocos (arte pendente; os 13 infográficos novos são figuras do bloco, não recortes limpos).
- Pendências científicas de Neurología (não bloqueiam a prévia): NIHSS (faixas), 4.ª forma de EM, coma no TEC, duplicatas na `main` (`q-neu234`/`q-neu-2509-05`; `q-neu148`/`q-neu289`), ESCMID/Lublin/Brott citadas de memória.
- Marcas de alunos em Neurología (SELECT 25/11, só contagem): 713 grifos, 1 traço, 0 notas; a #682 pode deixar 2 grifos do bloco 20 sem âncora (frases do erro antigo).
- **Não incluída no lote** `previa-lote.sql` (de propósito): a decisão de José é ligar **uma matéria por vez**, com o roteiro próprio.
