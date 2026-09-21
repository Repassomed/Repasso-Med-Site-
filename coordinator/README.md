# Repasso Coordinator V2 — modo OBSERVE

Infraestrutura da Issue #95. Só o pacote `anthropic` como dependência
nova — e isolado a um único arquivo (`anthropic_transport.py`). O resto
do pacote continua biblioteca padrão pura.

**Regra absoluta desta rodada:**

```
REPASSO_COORDINATOR_ENABLED=false
REPASSO_COORDINATOR_MODE=observe
```

Enquanto `ENABLED` não for exatamente a string `"true"`, **nenhuma chamada
externa acontece** — nem no workflow (o job inteiro não roda, ver
`.github/workflows/coordinator-observe.yml`), nem no código (o portão em
`coordinator/config.py` bloqueia antes de qualquer chamada real). Duas
camadas, de propósito.

## Segunda auditoria do PR #97 — os 3 bloqueadores fechados

**1. Caminho real de ponta a ponta.** Antes, `observe()` nunca chegava a
chamar `anthropic_client.call()` — o portão aberto não levava a lugar
nenhum. Agora existe: `coordinator/github_event.py` monta um `Event` de
verdade a partir do payload do GitHub Actions (`pull_request`,
`issue_comment`, `workflow_run`); `coordinator/anthropic_transport.py` é o
`Transport` real, usando o SDK oficial da Anthropic, lendo
`ANTHROPIC_API_KEY` só do ambiente (o GitHub Secret); e `observe()` o usa
por padrão. Continua inerte nesta V2 porque `ENABLED=false` sempre fecha o
portão antes — o que mudou é que agora há algo de verdade para ligar.

**2. Persistência entre execuções independentes.** `FileStore`/
`UsageLedger` de arquivo local não sobreviviam entre runners efêmeros do
GitHub Actions. `coordinator/git_state.py` guarda o mesmo estado (chaves
de dedup, uso/custo) numa branch DEDICADA do mesmo repositório — nunca
`main`, nunca mesclada, nunca toca matéria — e cada execução busca,
atualiza e publica de volta. `GitDedupStore`/`GitUsageLedger` implementam
exatamente a mesma interface que `FileStore`/`UsageLedger` já tinham; não
foi preciso reescrever nada, só adicionar.

**3. Model ID do FAST.** Buscando ao vivo em
`platform.claude.com/docs/en/models/overview` (não só a tabela em cache),
o "Claude API ID" oficial do Haiku 4.5 é o snapshot pinado
`claude-haiku-4-5-20251001` — `claude-haiku-4-5` é um alias válido, mas a
doc lista o snapshot como a forma canônica. `coordinator/models.py` agora
usa o snapshot.

## O que este pacote faz

Recebe um evento permitido (`coordinator/events.py`, construído a partir
do GitHub de verdade por `github_event.py`), classifica tipo A–D e
prioridade P0–P4 de forma determinística (`classify.py`, sem precisar de
API — Issue #90 chama isso de trabalho FAST), monta um contexto mínimo a
partir do Guard/GitHub (`context.py`, nunca o repositório inteiro), decide
qual nível de modelo usar (`routing.py` + `models.py`), sugere um worker
livre (`worker_registry.py`), deduplica e controla orçamento com estado
compartilhado entre execuções (`dedup.py`/`budget.py` +
`git_state.py`) e — só se o portão estiver aberto — tenta uma chamada real
(`anthropic_client.py` + `anthropic_transport.py`).

## O que este pacote NÃO faz

- não decide correção científica sozinho;
- não edita matéria, Supabase ou qualquer coisa de produção;
- não faz merge;
- não inicia matéria nova sem autorização explícita de José (tipo C);
- não escreve em nenhum arquivo do projeto além do seu próprio estado
  operacional (`--dedup-store`/`--usage-ledger` locais, ou
  `--dedup-git-remote`/`--usage-git-remote` numa branch dedicada — nunca
  `main`, nunca `netlify/functions/materias-privadas`);
- não comenta automaticamente em PR/Issue ainda (produz a saída OBSERVE;
  publicar é uma decisão futura separada, não escondida — ver o
  comentário no topo do workflow).

`coordinator/tests/test_no_forbidden_writes.py` prova isso estruturalmente
— varre o código-fonte por padrões de escrita em matéria/Supabase/merge e
falha se encontrar qualquer um. `git_state.py` tem sua própria checagem,
mais estreita (pode rodar `git commit`/`push`, mas nunca para `main`,
matéria ou merge).

## Estrutura

```
coordinator/
  config.py            portão ENABLED/MODE (a primeira e a última palavra)
  events.py             Event, EventType, lista de eventos permitidos
  github_event.py       constrói o Event a partir do payload real do GitHub Actions
  classify.py           tipo A-D (#85) + prioridade P0-P4 (#84), sem API
  routing.py            FAST/STANDARD/DEEP (#90)
  models.py             os 3 níveis lógicos -> model id atual
  worker_registry.py     escolha de worker (#82)
  context.py             contexto mínimo (Guard/GitHub, nunca o repo inteiro)
  dedup.py                deduplicação (memória ou arquivo local)
  budget.py                limites de chamada/token + ledger local + freios de custo
  git_state.py              dedup/ledger persistentes via branch git dedicada
  anthropic_client.py         portão + chamada; Transport é uma interface
  anthropic_transport.py       o Transport REAL — único arquivo que importa `anthropic`
  redact.py                     sanitização de segredo (chave de API e credencial em URL)
  observe.py                     o orquestrador — liga tudo isso, tenta a chamada real
  __main__.py                     CLI: python3 -m coordinator --event ... | --github-event-name ...
  requirements.txt                 só `anthropic` — instalado apenas no job condicionado
  fixtures/                        eventos de exemplo para os testes
  tests/                            ver "Testar" abaixo
```

## Rodar localmente

Formato interno (fixture):

```bash
python3 -m coordinator --event coordinator/fixtures/event_pr_needs_audit.json \
    --dedup-store /tmp/coordinator-seen.json \
    --usage-ledger /tmp/coordinator-usage.json \
    --workers coordinator/fixtures/workers.json \
    --out /tmp/resultado.json
```

Payload real do GitHub, com estado compartilhado via git (o que o workflow
usa):

```bash
python3 -m coordinator --github-event-name issue_comment \
    --event "$GITHUB_EVENT_PATH" --repo "$GITHUB_REPOSITORY" \
    --dedup-git-remote "$(git remote get-url origin)" \
    --usage-git-remote "$(git remote get-url origin)"
```

Sem `REPASSO_COORDINATOR_ENABLED=true` no ambiente, a saída é sempre
`BLOCKED` — e mesmo com `ENABLED=true`, `MODE` precisa ser exatamente
`observe`. O `Transport` real está conectado por padrão (não é mais
`NotConfiguredTransport`), mas isso não muda a garantia: sem o portão
aberto, `transport.send()` nunca é alcançado.

## Testar

```bash
python3 -m coordinator.tests.run_all
```

92 testes, 12 módulos. Provam especificamente (Issue #95 + auditoria do
PR #97):

- `ENABLED=false` ⇒ zero chamadas externas, **mesmo com o `Transport`
  real por padrão** (`test_observe_real_path::test_disabled_with_real_default_transport_makes_zero_http`,
  `test_anthropic_client`);
- `ENABLED=true` + mock ⇒ exatamente 1 chamada, usage registrado
  (`test_observe_real_path`, `test_anthropic_transport`);
- duas execuções independentes compartilham dedup e ledger via
  `git_state.py`, com git de verdade — não simulado
  (`test_git_state`, `test_observe_real_path`);
- evento duplicado na "segunda execução" ⇒ zero chamada nova
  (`test_observe_real_path`, `test_observe_pipeline`);
- evento não permitido ⇒ zero chamada, status `REJECTED`
  (`test_observe_pipeline`);
- `MODE` diferente de `observe` ⇒ bloqueado mesmo com `ENABLED=true`
  (`test_config_gate`, `test_anthropic_client`, `test_observe_pipeline`);
- segredo nunca aparece em log — chave de API E credencial embutida numa
  URL de git (`test_redact`, `test_anthropic_transport`,
  `test_observe_real_path`);
- erro de API é uma tentativa só, nunca um loop de retry
  (`test_anthropic_client`, `test_observe_real_path`);
- o workflow consegue construir o payload de um evento real controlado
  (`test_github_event`);
- nenhuma permissão de escrita em matéria/Supabase/merge
  (`test_no_forbidden_writes`, prova estrutural via varredura de código);
- a saída sempre contém tipo, prioridade, worker/modelo sugeridos e
  próxima ação (`test_observe_pipeline`).

## Modelos (Issue #90)

Confirmados AO VIVO em `platform.claude.com/docs/en/models/overview`
(não só a tabela em cache da skill `claude-api`) em 2026-09-21, depois da
segunda auditoria pedir essa confirmação:

| Nível lógico | Model ID | Uso nesta política |
|---|---|---|
| FAST | `claude-haiku-4-5-20251001` | classificação, roteamento, administrativo |
| STANDARD | `claude-sonnet-5` | auditoria de diff/audit-pack, conteúdo médico |
| DEEP | `claude-opus-5` | exceção de alto risco — **desabilitado por padrão nesta V2** |

Mudar o mapeamento é só `models.py` — a lógica FAST/STANDARD/DEEP não
depende do nome comercial.

## Próximos passos (fora desta rodada)

- o "primeiro teste controlado" descrito na Issue #95: José muda
  `REPASSO_COORDINATOR_ENABLED=true` para UM evento, confirma custo e
  comportamento, desliga de novo se algo sair do esperado;
- decidir se/quando o Coordinator passa a comentar de verdade em
  Issues/PRs (esta rodada produz a saída OBSERVE; publicar continua sendo
  uma decisão separada);
- baixar o audit-pack do Guard como artifact do `workflow_run` para
  enriquecer o contexto de `GUARD_STATE_CHANGE` (hoje `audit_pack` vem
  `None` nesse caminho — ver `github_event.py`);
- branch protection/CODEOWNERS para `.github/workflows/**`, apontado
  desde a auditoria do PR #94.
