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
- `--trusted-source`: só descreve, no relatório, de onde veio o CÓDIGO
  desta execução (`base`, `head-bootstrap` ou o padrão `desconhecido` para
  rodada local). Não afeta nenhuma verificação — ver a seção sobre
  autocertificação abaixo.

Sem `--pr-body`, o Guard roda mesmo assim: o escopo fica vazio e a
verificação de escopo vira `WARNING` em vez de comparar contra o declarado.

Código de saída: `1` se houver qualquer `HARD FAIL`, `0` caso contrário
(a menos que `--allow-fail`).

## Um PR não pode se autocertificar (endurecimento pós-auditoria do PR #94)

A primeira auditoria independente da V1 apontou dois jeitos de um PR passar
por cima do próprio Guard. Os dois foram corrigidos:

**1. Código do Guard.** Antes, o workflow rodava `tools/qa/guard` a partir
do HEAD do PR — então um PR que enfraquecesse uma verificação (por exemplo,
neutralizar `check_secrets`) podia usar essa mesma versão enfraquecida para
aprovar a si mesmo. Agora `.github/workflows/guard.yml` extrai o pacote
`tools/` da BASE (via `git archive`) para um diretório separado e roda de
lá via `PYTHONPATH`, a partir de um `cwd` neutro — o HEAD do PR nunca chega
a ser importado. Quando a base ainda não tem o Guard (bootstrap — só
acontece antes desta V1 existir na `main`), isso é dito abertamente no
relatório (`--trusted-source head-bootstrap`), nunca escondido atrás de um
resultado verde.

Limitação que fica **documentada, não escondida**: para PRs do mesmo
repositório, o GitHub Actions roda a versão do PRÓPRIO `guard.yml` que está
no HEAD do PR — então um PR que alterasse também esses passos de extração
poderia, em tese, remover a proteção. A defesa técnica cobre o caso
realista (alguém mexe em `checks.py`/`materia.py` sem tocar no workflow); o
caso em que o próprio `guard.yml` muda só se fecha com uma regra do
repositório (branch protection ou CODEOWNERS exigindo revisão humana para
qualquer mudança em `.github/workflows/**`) — isso é uma decisão do José,
não algo que este PR possa configurar sozinho.

**2. Escopo/reserva.** Antes, `check_scope` unia o que o corpo do PR
declarava como "Arquivos permitidos" com o que `coordination/tasks.json`
dizia — lido do HEAD do próprio PR. Ou seja, um PR podia escrever qualquer
coisa nos dois lugares e o Guard aceitava a união. Agora, quando a tarefa
já existia ANTES deste PR, a reserva da BASE é a única autoridade: o corpo
do PR pode repetir ou estreitar essa reserva, nunca ampliá-la, e uma edição
da própria tarefa dentro do mesmo diff (tentando ampliar `arquivos` em
`tasks.json`) também não conta — vira `HARD FAIL` em vez de escopo extra.
Só quando a tarefa é nova nesta mesma PR (não existia na base) é que não
há reserva anterior para proteger.

Ver o docstring de `checks.check_scope` e `checks.check_guard_integrity`
para o detalhe de cada regra.

## Estrutura

```
tools/qa/
  guard/
    materia.py   leitura estrutural de um arquivo de matéria (sem julgar conteúdo)
    checks.py    as verificações e suas severidades
    __main__.py  CLI: git diff, escopo do PR, orquestração, relatório, audit-pack
  fixtures/      exemplos de teste (matéria de MENTIRA, nunca conteúdo real)
  tests/         test_guard.py (fixtures + escopo) e test_trusted_execution.py (git de verdade)
  browser-qa/    investigação isolada de QA visual com Playwright (não roda em produção)
```

## O que o Guard verifica hoje

- registro de tarefas (`coordination/tasks.json`): JSON válido (na base E no
  head), estados válidos, `BLOCKED-LIMIT` com commit, colisão de arquivo
  entre tarefas ativas;
- escopo do PR: arquivo fora do declarado (Lei 2), tentativa de ampliar a
  reserva original pelo corpo do PR ou pela própria tarefa no mesmo diff
  (endurecido pós-auditoria do PR #94 — ver seção própria abaixo), colisão
  com outra tarefa `IN-PROGRESS`/`BLOCKED-LIMIT` que reserva o mesmo
  arquivo (Lei 3);
- integridade do próprio Guard: de onde veio o código desta execução, e se
  o PR alterou `tools/qa/guard/**` ou `.github/workflows/guard.yml` (idem);
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
python3 -m tools.qa.tests.test_trusted_execution
```

`test_guard` prova quatro coisas: o Guard não reprova o fixture válido; o
Guard reprova o quebrado pelos motivos certos (questão removida, id
duplicado novo — mas **não** o que já era duplicado antes —, gabarito
inválido, alternativas duplicadas, flashcard removido, HTML desbalanceado
novo, rótulo proibido, asset ausente); e os dois testes adversariais do
bloqueador de ESCOPO — o corpo do PR não consegue declarar arquivo fora da
reserva original mesmo dizendo que pode, e a própria tarefa não consegue
se ampliar dentro do mesmo diff.

`test_trusted_execution` é o único teste que usa um repositório git de
verdade (precisa, porque testa um mecanismo de `git archive`, não algo que
dá para simular só com objetos em memória). Ele monta um repo temporário
com um HEAD malicioso de propósito (checks.py adulterado para esconder um
segredo de verdade) e prova as duas metades do bloqueador de INTEGRIDADE:
sem a extração confiável, o ataque funciona (contraprova de que o problema
era real); com ela — exatamente o mecanismo do `guard.yml` — o segredo
continua sendo detectado.
