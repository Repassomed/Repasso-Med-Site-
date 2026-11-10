# Ordem de merge — Nova Era (Fisiopatología II e vizinhas) · 10/11

Registro de coordenação. Nada aqui ativa matéria: todas as PRs só *perguntam* ao servidor; quem libera é a linha de `rm_materia_rollout` (SQL do José, depois do deploy).

## PRs abertas e o que cada uma toca nos arquivos compartilhados

| PR | Matéria | Agente | Arquivos compartilhados que altera |
|---|---|---|---|
| #634 | Anatomía I e AP I | Claude 2 | `rm-pilot.js` (CANDIDATAS, VER), `index.html` (tag), `rm-materia-sistema.js/.css` (fim de TEMAS/CSS), `nao-ativacao.test.cjs`, `auditoria-implantacao-publica.test.cjs` |
| #635 | Biología | Claude 1 | os mesmos 6 |
| #636 | Embriología | Claude 1 | `rm-pilot.js`, `rm-materia-sistema.js/.css`, `inventario.json`, os 2 testes (e `index.html`) |
| #644 | Farmacología II | Claude 2 | os mesmos 6 |
| #645 | Fisiopatología II | esta sessão | os mesmos 6 (+ vinhetas e documentos próprios) |
| #643 → #650 | Fisiopatología II (conteúdo) | esta sessão | **só** `fisiopatologia-ii.html`, testes `fisio2-6xx`, `inventario.json` (linha da matéria) |

## Ordem recomendada

1. **#643, depois #650** (conteúdo; não toca arquivos globais). A #650 contém a #643, então pode entrar só ela, mas a ordem registrada é #643 → #650.
2. **#645** pode entrar antes ou depois de #643/#650: o mapa já reconhece `fp2b18`/`fp2b19`; sem o conteúdo, a matéria tem 17 blocos e nada quebra.
3. As demais PRs Nova Era (**#634, #635, #636, #644, #645**) entram **uma de cada vez**, na ordem em que José decidir. Cada uma, ao entrar depois de outra, conflita nas mesmas linhas globais (receita abaixo); quem tiver a PR seguinte a atualiza sobre a `main` e resolve por **união**. Esta sessão **não** alterou as branches de #634–#636 e #644.

## Conflitos (simulados em checkout descartável, 10/11, sobre a `main` `003d39a9`)

Merge sequencial das cinco branches sobre a `main`: #634 entra sem conflito; **cada uma das seguintes conflita** em `rm-pilot.js`, `rm-materia-sistema.js`, `index.html` (tag), `nao-ativacao.test.cjs`, `auditoria-implantacao-publica.test.cjs` (e `.css`/`inventario.json` em alguns casos). São sempre as mesmas linhas.

Receita de resolução (união, nunca descartar o lado de ninguém):
- `CANDIDATAS` (em `rm-pilot.js`) e as listas `CANDIDATAS_ESPERADAS` / `CAND_CONTROLADAS` / a lista de slugs de `arquivos()`: **união** de todos os slugs.
- `VER` do `rm-pilot.js` = o **maior** valor e **igual** à tag `rm-pilot.js?v=` do `index.html`.
- `rm-materia-sistema.js`: manter **todos** os descritores `TEMAS[...]` e funções de classificação; `.css`: manter todos os blocos por matéria.
- `inventario.json`: regenerar com a ferramenta (`tools/qa/pre-voo/inventario-fresco.py`), nunca à mão.
- Depois de cada resolução: `nao-ativacao`, `auditoria-implantacao-publica` e o `real-<matéria>` da matéria que entrou.

## Auditoria de publicação (22 falhas → 0)
O `auditoria-implantacao-publica.test.cjs` ainda ligava a matéria pelas variáveis antigas `RM_LAYOUT_SLUGS`/`RM_PEN_SLUGS`, que o `get-pilot-flags.js` atual **não lê mais** (só a linha de `rm_materia_rollout`). Defeito do teste, não do servidor (fail-closed funcionando). O teste foi atualizado para o mecanismo atual (Supabase simulado com a linha da matéria, perfil de administrador e matérias compradas) e passou a **provar** que as variáveis antigas não ligam nada. Resultado: ver o corpo da #645.
