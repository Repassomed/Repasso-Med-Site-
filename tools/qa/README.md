# Repasso Guard

Verificador automático de PR. Lê o que o PR **mudou** (não o estado absoluto
do repositório) e classifica cada achado em três níveis:

    HARD FAIL   quebra objetiva, mensurável, introduzida por este PR
    WARNING     precisa de olho humano antes do merge
    INFO        contexto; nunca bloqueia

**O Guard não decide correção científica, não faz merge, não escreve no
Supabase e não chama nenhuma API.** Ele só lê o diff do git e o texto do PR.
Biblioteca padrão do Python, sem dependência nenhuma.

## Por que julga o delta, e não o estado absoluto

Um levantamento nas 30 matérias (2026-09-20) mostrou 7 já com HTML
desbalanceado e 2 já com id duplicado na própria `main`. Um verificador que
reprovasse isso reprovaria matérias que nenhum PR novo tocou — e um
verificador que reprova o que já estava certo (ou já estava errado antes de
qualquer um mexer) é pior do que nenhum: ensina a ignorar o resultado.
Por isso: **o PR responde pelo que introduziu.** Ver o cabeçalho de
`guard/checks.py` para o detalhe.

## Rodar localmente

```bash
# da raiz do repositório
python3 -m tools.qa.guard --base origin/main --head HEAD \
    --pr-body corpo-do-pr.md \
    --summary /tmp/resumo.md \
    --audit-pack /tmp/auditoria.json
```

- `--base` / `--head`: qualquer ref do git (branch, commit, `origin/main`).
- `--pr-body`: arquivo de texto com a descrição do PR (o Guard lê o bloco
  `## ESCOPO` do template — ver `.github/pull_request_template.md`).
- `--summary`: onde gravar o resumo humano em Markdown (também vai para
  stdout sempre).
- `--audit-pack`: onde gravar o pacote de auditoria em JSON — pensado para
  uma futura IA coordenadora ler, não só para gente.
- `--allow-fail`: sempre sai com código 0. Útil para inspecionar sem travar
  um script que encadeia o resultado.

Sem `--pr-body`, o Guard roda mesmo assim: o escopo fica vazio e a
verificação de escopo vira `WARNING` em vez de comparar contra o declarado.

Código de saída: `1` se houver qualquer `HARD FAIL`, `0` caso contrário
(a menos que `--allow-fail`).

## Estrutura

```
tools/qa/
  guard/
    materia.py   leitura estrutural de um arquivo de matéria (sem julgar conteúdo)
    checks.py    as verificações e suas severidades
    __main__.py  CLI: git diff, escopo do PR, orquestração, relatório, audit-pack
  fixtures/      exemplos de teste (matéria de MENTIRA, nunca conteúdo real)
  tests/         prova de que o Guard passa o válido e reprova o quebrado
  browser-qa/    investigação isolada de QA visual com Playwright (não roda em produção)
```

## O que o Guard verifica hoje

- registro de tarefas (`coordination/tasks.json`): JSON válido, estados
  válidos, `BLOCKED-LIMIT` com commit, colisão de arquivo entre tarefas ativas;
- escopo do PR: arquivo fora do declarado (Lei 2), colisão com outra tarefa
  `IN-PROGRESS`/`BLOCKED-LIMIT` que reserva o mesmo arquivo (Lei 3);
- arquivos críticos tocados (Lei 8): `app-core.js`, `styles.css`,
  `index.html`, `admin.html`, `netlify.toml`, funções Netlify;
- segredo em linha adicionada (prefixos de provedor conhecidos: `sk-ant-`,
  `ghp_`, `github_pat_`, JWT, atribuição de `api_key`/`secret_key`);
- chamada a API paga introduzida (Anthropic, OpenAI, Google Generative AI);
- por matéria alterada: HTML desbalanceado novo, id duplicado novo, id ou
  block_id removido, questão removida (por chave — id, ou enunciado quando a
  matéria não usa id), flashcard removido, corpo × banco geral não
  espelhados, gabarito com letra que não existe entre as alternativas,
  alternativas com texto literalmente idêntico, gabarito de questão antiga
  alterado (Lei 6 — some para auditoria, não decide sozinho), contagem
  declarada no texto que não bate com o arquivo, asset referenciado que não
  existe no repositório, âncora nova para id inexistente;
- nomenclatura proibida (§8.1) e nome de professor em vez de «la cátedra»
  (§8.2);
- matéria alterada que não está na lista de slugs do `index.html` (arquivo
  órfão, CLAUDE.md §1.2).

O que ele **não** verifica, de propósito: se uma resposta médica está
cientificamente correta, se uma questão nova tem valor avaliativo real, se a
didática está boa. Isso é humano — Lei 6, Lei 10.

## Testar o Guard

```bash
python3 -m tools.qa.tests.test_guard
```

Prova duas coisas: o Guard não reprova o fixture válido, e reprova o
quebrado pelos motivos certos (questão removida, id duplicado novo — mas
**não** o que já era duplicado antes —, gabarito inválido, alternativas
duplicadas, flashcard removido, HTML desbalanceado novo, rótulo proibido,
asset ausente).
