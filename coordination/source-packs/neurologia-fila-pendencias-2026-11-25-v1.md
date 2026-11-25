# Neurología · fila de pendências, materiais de prova não examinados e plano de integração com a #682 — 25/11/2026

**Estado verificado em 25/11 (GitHub):** `main` `d5022f37` (já com #716 e #721). **#687 ainda ABERTA** (head `f308021f`). A **#715 foi mesclada por José na branch da #687** (não na `main`): as sete questões novas (`q-neu291`–`297`) viajam com a #687 e só chegam à `main` quando a #687 for mesclada. **#682** (Claude 4) em `8446cdd6`, intocada.
> O pedido «depois que José mesclar a #687» **ainda não se cumpriu**; este registro prepara o terreno e o ensaio abaixo foi feito sobre a cabeça atual da #687 (com a #715 dentro). Repetir o ensaio depois que a #687 entrar na `main`.

## 1 · Fila: questão que depende de ensino novo no bloco 21 (item 17 da prova)
- **Item:** «Na escala NIHSS para o ACV isquémico, recomenda-se considerar trombólise IV quando a pontuação está entre > 4 e < 25» (V/F, prova de 18/11/26, sem gabarito oficial).
- **Fonte confirmada:** slide `10..pdf`, página 10 (imagem): «Escala NIHSS · Recomienda trombolisis con puntaje >4 y <25».
- **Por que não entrou:** o resumo do bloco 21 só ensina as faixas de gravidade (1 / 2–5 / 6–15 / 16–20 / > 20); a lei 8-A.2 exige ensinar antes de perguntar. O parágrafo da NIHSS tem grifos de alunos (`neub21`: 120 grifos, vários com prefixo/sufixo vizinho — ex.: «0 es normal y en un ictus grave supera 20», «2–5 ligero», «16–20 importante», «> 20 grave», «edema cerebral y la transformación hemorrágica», todos ancorados por contexto).
- **Plano (para quando José decidir):** (1) escrever UMA frase de ensino, sem as palavras de grifos de uma só palavra do bloco («TAC», «tiempo», «hematoma», «4,5»…), por exemplo «Según el slide, la escala NIHSS también orienta la decisión: se recomienda considerar la trombólisis con un puntaje mayor de 4 y menor de 25 (la indicación depende además de los criterios de elegibilidad).»; (2) inseri-la **num `<p>` novo logo depois da tabela «3 bis · Ventana terapéutica»** (não dentro do parágrafo grifado); (3) rodar o **resolvedor real** (`RMTools.resolverAncora`, `grifos-motor.cjs`) com as 120 linhas de `neub21` (SELECT: `block_id, exact_text, prefix, suffix, occurrence`), antes × depois, exigindo 0 perdidos e nível pior igual; (4) só então acrescentar o V/F `q-neu298` (bloco + banco), «Basada en preguntas de examen», e atualizar contagens (298; V/F 70; bloco 21 = 20 → 11 de exame + 9). **Nada disso foi feito**; nenhuma resposta foi inventada.

## 2 · Materiais de prova AINDA NÃO examinados (para conferência posterior)
Pasta Drive › Site Repasso Med › Biblioteca › 7 semestre › Neurologia › «Questões » (id `1MA9HAVuvGZvYS37zRExWjgUTOxPQhjXN`) e slides (pasta `1XLzbTL_njMklJdPqRyhtIx0wDM8x7fWz`):
| Material | Situação |
|---|---|
| 8 JPG de 18/11 (`9342dc68…`, `31ca7908…`, `18b45a9a…`, `4a5eb65e…`, `d8d7a434…`, `ad63b7e9…`, `1c4919e2…`, `5e84303d…`; ids Drive `1vRi5KLv…`, `1jfWGaER…`, `1rEjDotB…`, `14jnDSy1…`, `1NJGyozv…`, `18a3-Mqy…`, `162fzchy…`, `13OLaGDF…`) | integrados pela #687 (relatório de 18/11), **não reabertos** em 24–25/11 |
| `Examen Final Neurologia seccion A fila 1.docx` (`1gHtU-bR5aObsWqAFG_fBkJ7_lCUWHbJp`) e figura do item 28 | integrado na #687; figura do item 28 **não vista** |
| `Provas neuro Aline .pdf` (`1mvRww39lAwNEr-Nrw-fo7OO90FUarB2l`) e manuscritos | integrados em 25/09; manuscritos **não examinados**; itens ilegíveis: Turma C 2 e 6, Manuscrito 15, D-2 10, GCS com «NT» |
| `provaneurorevisar_sem_repetidas.pdf` (`1cd7m27p9-hwC2nprxOhSriS_oMT0amk7`, 30 MB) | comparado só por texto extraído (281 parágrafos); não relido por imagem |
| «Imagem simulada» da Turma A 20; 479 imagens do Notes | **não vistas** |
| Slide de sono `7..pdf` (base de `q-neu090`/`091`) | só pelo pack da #687; **não reaberto** |
| Slide `8..pdf` (`1jNM6DVE0dWGSSM7CvfzkFYxaNIarmmkU`, aparece na busca por «calórica/oculocefálico») | **ainda não lido**: pode descrever a resposta da prova calórica (`q-neu002`); ler antes de qualquer nova mudança |
| Slides `9..`, `12..`, `13..`, `14..` | não relidos nesta rodada |
| Fotos de 20/11 (4 arquivos «WhatsApp Image … 10.52.40») | **examinadas** (itens 1–20; ver `neurologia-prova-fotos-2026-11-24-v1.md`) |
| `10..`, `11..`, `15..`, `16. TEC II`, `1. seccion D` | **examinados** (texto; `10..` p. 10–11 também como imagem) |
**Inacessível:** literatura-base de Neurologia (Adams-Victor, DeJong, Blumenfeld, Bradley, citadas no site, não estão no Drive); gabaritos oficiais das provas.

## 3 · Integração com a #682 (Claude 4) — plano e ensaio
- **Ordem:** #687 (com a #715 dentro) → `main` → atualizar a #682 com a `main` (feito pelo dono dela) → ensaio → merge de José.
- **Conflitos conhecidos (ensaiados):** `docs/layout-ensaio/inventario.json`, `tools/qa/neu-glosario/neu-glosario.test.cjs`, `tools/qa/neu-questoes-1811/neu-questoes.test.cjs`; **nenhum no `neurologia.html`**.
- **Resolução:** testes — manter as constantes da `main` (297 perguntas; MCQ 197; V/F 69; DEFINE 31; 594 itens) e somar o que a #682 acrescenta (infográficos, glossário); `inventario.json` — aceitar a `main` e **regenerar** a linha da Neurología pelo gerador; nunca à mão. Conferir depois: perguntas (`q-neu001`–`297`), infográficos da #682, glossário, grifos/traços/notas (SELECT).
- **Resultado do ensaio completo** (script corrigido da `main`, `--continuar --browser --tolerar=neu-cierre/neu-cierre.test`; cabeças: #687 `f308021f` [com a #715] · #682 `8446cdd6` · main `d5022f37`; conflitos só os 3 acima, nenhum com a `main` nem no HTML): estático `neu-8a1b` 3852/3852 · `neu-glosario` 414/414 · `neu-negrito` 1258/1258 · `neu-questoes-1811` 119/119 · `neu-vf` 573/573 · `neuro-667` 315/315; navegador `neu-8a1b` 14/14 · `neu-glosario` 24/24 · `neu-infograficos` 60/60 · `neu-negrito` 20/20 · `neu-questoes` 12/12 · `neu-vf` 12/12 · `neuro-667` 36/36; **`neu-cierre` 21/23 = FALHA CONHECIDA, TOLERADA explicitamente, NÃO é aprovação** (as mesmas 2 falhas ocorrem na #687 sozinha: o teste compara «o resto da página» com a `main` anterior à retirada do Cierre). Saída 0 só com `--tolerar`. **Limites:** vale para essas três cabeças; repetir depois que a #687 entrar na `main` e a #682 for atualizada; grifos não reconsultados no resultado integrado (nenhum texto de ensino foi tocado pela integração).
