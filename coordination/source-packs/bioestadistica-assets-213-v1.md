# Bioestadística — restauração dos 27 assets ausentes (Issue #213)

Tarefa: [Issue #213](https://github.com/Repassomed/Repasso-Med-Site-/issues/213)
("Bioestadística — recuperar/corrigir 27 assets ausentes sem misturar com a PR #196").

Arquivo tocado: `Repasso-Med-Site--main/Atual - Copia/assets/img/bioest/*.webp`
(27 arquivos binários novos — **nenhum conteúdo de `bioestadistica.html` foi alterado**).

Branch: `claude/bioestadistica-assets-213`, criada a partir da `main` atual.
**Não toca PR #478, PR #476 nem PR #196.**

## 1. Inventário

`bioestadistica.html` referencia 27 caminhos únicos em `/assets/img/bioest/`
(confirmado por varredura de todas as tags `src=`/`url(...)` que apontam
para `assets/img`). A lista bate exatamente com os 27 exemplos citados
pelo Guard na Issue #213.

Verificação de existência: nenhum dos 27 caminhos existia no repositório
— nem o diretório `assets/img/bioest/` em si. Checagem adicional via
`git log --all` e `git ls-tree` em todos os commits do histórico: **zero
ocorrência** de qualquer um dos 27 nomes de arquivo em qualquer commit —
ou seja, não é uma regressão (arquivo apagado em algum merge), é um
asset que nunca chegou a ser commitado.

## 2. Busca no material oficial do Drive

Localizada a pasta oficial `Bioestatistica > Imagens`
(fileId `1xxoSl8-1wNLDtIVRU-u0dwAnXN2BRqIg`), contendo exatamente os 27
arquivos `.webp` com os mesmos nomes referenciados no HTML, mais um
arquivo `manifesto_bioestatistica_imagens.txt` que documenta:

- **Destino declarado:** "Site Repasso Med > Biblioteca > 2 semestre >
  Bioestatistica > Imagens" — ou seja, o próprio manifesto já apontava
  para este exato local do site.
- **Auditoria de conteúdo:** "Conteúdo e nomenclatura foram confrontados
  com os Arquivos I–IX, a prova parcial e o questionário final da
  cátedra." e "Fórmulas e exemplos numéricos foram recalculados antes da
  exportação."
- **Correção científica documentada no próprio manifesto** (Archivo
  VII): a tabela do material leva a variância 218,65, desvio-padrão
  14,79 e CV 34,12% — valores recalculados usados no infográfico, em vez
  do 218,93 que aparece no material original da cátedra. Verificado
  contra o texto já publicado em `bioestadistica.html` (flashcard "El
  ejemplo de los 42 pacientes" e a MCQ correspondente): o site já
  apresenta os dois valores de forma consistente — 218,93 como resultado
  principal do método com a média arredondada (43,33) e "(218,65 con la
  media exacta)" como nota — portanto a figura recuperada (que usa
  218,65) **não contradiz** o texto já publicado; nenhuma ação adicional
  foi necessária aqui.

Isso caracteriza os 27 arquivos como **material oficial comprovado**,
não uma suposição ou reconstrução — são os originais que deveriam ter
sido commitados junto com o texto da matéria.

## 3. Restauração

Os 27 arquivos foram baixados do Drive e gravados em
`assets/img/bioest/`, com verificação individual:

- tamanho em bytes idêntico ao do arquivo de origem no Drive (27/27);
- header RIFF/WEBP válido em todos (27/27 — a maioria VP8, um deles
  VP8L/lossless sem lossy chunk, ambos containers WebP válidos);
- resolução real 1536×1024 px. O manifesto do Drive declara "1800 ×
  1200 px", mas os arquivos exportados são 1536×1024 — **mesma
  proporção 1,5:1** declarada pelos atributos `width="1800"
  height="1200"` já presentes no HTML, portanto sem distorção visual
  (confirmado visualmente — ver seção QA).

Nenhuma imagem foi inventada, gerada ou reconstruída nesta tarefa — as
27 são cópias bit-a-bit do material oficial do Drive. Nenhum conteúdo
do `bioestadistica.html` foi tocado (gabaritos, texto, flashcards,
banco geral — tudo inalterado).

**Nenhuma pendência sem fonte:** os 27/27 assets referenciados foram
localizados e restaurados. Não houve necessidade de decidir entre
"produzir asset" ou "remover referência" (passo 3 da Issue #213), porque
o material oficial comprovado cobriu 100% da lista.

## 4. QA

- **Render real (Playwright + Chromium, servidor HTTP local servindo a
  raiz "Atual - Copia", exatamente como o Netlify resolveria
  `/assets/...`):** 27/27 imagens carregam com `naturalWidth`/
  `naturalHeight` reais (nenhuma quebrada). Primeira tentativa via
  `file://` reportou todas como "quebradas" por dois motivos
  cumulativos — resolução de caminho absoluto e `loading="lazy"` não
  disparado sem servidor; corrigido servindo via HTTP real e forçando
  `scrollIntoView` em cada `<img>` antes de medir.
- **Inspeção visual** em 390 / 768 / 1440 px: primeira figura (John
  Snow) e última (ejemplo de glucosa normal) conferidas em screenshot —
  nítidas, sem distorção, sem corte, texto legível, consistentes com o
  `alt` de cada imagem.
- **HTML:** `git diff` confirma 0 inserções/remoções de texto — apenas
  27 arquivos binários novos (`27 files changed, 0 insertions(+), 0
  deletions(-)`).

## 5. Guard

Rodado via `python3 -m tools.qa.guard --repo . --base origin/main --head
claude/bioestadistica-assets-213`: 🟡 PASSOU COM AVISOS (mesmos 3 avisos
informativos padrão de qualquer PR local: escopo sem tarefa registrada,
origem do código do Guard "desconhecido" por ser execução local, e o
aviso pré-existente sobre `neurologia-p0-fechamento-2026` em
`tasks.json`). `materia: nenhum arquivo de matéria foi alterado` — isto
é esperado e correto: como esta PR só adiciona os binários de imagem e
não toca `bioestadistica.html`, o próprio arquivo não entra em
`ctx.changed`, e a checagem de assets do Guard (`_check_assets`) só roda
para matérias cujo HTML está no diff (ver `tools/qa/guard/checks.py`,
`check_materias`).

Para confirmar objetivamente que a correção resolve o HARD FAIL original
da Issue #213 (e não só "nenhum alarme disparou"), rodei a mesma lógica
de resolução de assets do Guard (`materia.parse` +
`_asset_candidate_paths` + verificação de existência em disco,
importados diretamente de `tools/qa/guard`) contra o estado atual do
HEAD desta branch:

```
Total assets referenciados por materia.parse(): 27
Ausentes (usando a própria lógica do Guard): 0
```

Antes desta PR, os mesmos 27 caminhos resultavam em 27 ausentes — é
exatamente a lista reportada pela Issue #213. Com os arquivos
restaurados, a mesma lógica do Guard confirma 0/27 ausentes.

## 6. Escopo — PR #196 e outras

- **PR #196** (`runner/cleanup-como-estudar-bioestadistica`, head
  `06c5950c`) não foi tocada — branch, arquivos e commits totalmente
  separados.
- **PR #478** (Biología) e **PR #476** (Anatomía Patológica II) não
  foram tocadas nesta rodada.
- Nenhuma auditoria "27/27" foi iniciada enquanto estas PRs de matéria
  permanecem abertas, conforme instrução.

## 7. Decisão

🔴 **NÃO MERGEAR** — PR em draft, pronta para auditoria humana. Todos os
27 assets foram restaurados a partir de material oficial comprovado;
nenhuma pendência sem fonte restante.
