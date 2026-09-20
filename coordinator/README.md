# Repasso Coordinator V2 — modo OBSERVE

Infraestrutura da Issue #95. Só biblioteca padrão do Python — nenhuma
dependência nova, nenhum SDK da Anthropic importado ainda.

**Regra absoluta desta rodada:**

```
REPASSO_COORDINATOR_ENABLED=false
REPASSO_COORDINATOR_MODE=observe
```

Enquanto `ENABLED` não for exatamente a string `"true"`, **nenhuma chamada
externa acontece** — nem no workflow (o job inteiro não roda, ver
`.github/workflows/coordinator-observe.yml`), nem no código (o portão em
`coordinator/config.py` bloqueia antes de qualquer classificação virar
chamada). Duas camadas, de propósito.

## O que este pacote faz

Recebe um evento permitido (`coordinator/events.py`), classifica tipo
A–D e prioridade P0–P4 de forma determinística (`classify.py`, sem
precisar de API — Issue #90 chama isso de trabalho FAST), monta um
contexto mínimo a partir do Guard/GitHub (`context.py`, nunca o
repositório inteiro), decide qual nível de modelo *seria* usado
(`routing.py` + `models.py`), sugere um worker livre (`worker_registry.py`),
deduplica (`dedup.py`), consulta o orçamento (`budget.py`) e — só se o
portão estivesse aberto — prepararia uma chamada (`anthropic_client.py`).
Nesta V2 o portão nunca abre, então essa última etapa nunca executa de
verdade.

## O que este pacote NÃO faz

- não importa nem chama o SDK da Anthropic (a interface `Transport` em
  `anthropic_client.py` existe para uma V3 injetar uma implementação real);
- não decide correção científica sozinho;
- não edita matéria, Supabase ou qualquer coisa de produção;
- não faz merge;
- não inicia matéria nova sem autorização explícita de José (tipo C);
- não escreve em nenhum arquivo do projeto além do seu próprio estado
  operacional (`--dedup-store`, `--usage-ledger`, `--out` — todos
  caminhos passados como argumento, nunca fixos em `netlify/functions/
  materias-privadas` ou na raiz do site).

`coordinator/tests/test_no_forbidden_writes.py` prova isso estruturalmente
— varre o código-fonte por padrões de escrita em matéria/Supabase/merge e
falha se encontrar qualquer um.

## Estrutura

```
coordinator/
  config.py            portão ENABLED/MODE (a primeira e a última palavra)
  events.py             Event, EventType, lista de eventos permitidos
  classify.py            tipo A-D (#85) + prioridade P0-P4 (#84), sem API
  routing.py              FAST/STANDARD/DEEP (#90)
  models.py               os 3 níveis lógicos -> model id atual
  worker_registry.py      escolha de worker (#82)
  context.py               contexto mínimo (Guard/GitHub, nunca o repo inteiro)
  dedup.py                  deduplicação (memória ou arquivo)
  budget.py                  limites de chamada/token + ledger + freios de custo
  anthropic_client.py         o único lugar que tocaria a rede — e não toca
  redact.py                    sanitização de segredo antes de qualquer log
  observe.py                    o orquestrador — liga tudo isso
  __main__.py                    CLI: python3 -m coordinator --event ...
  fixtures/                       eventos de exemplo para os testes
  tests/                            ver "Testar" abaixo
```

## Rodar localmente

```bash
python3 -m coordinator --event coordinator/fixtures/event_pr_needs_audit.json \
    --dedup-store /tmp/coordinator-seen.json \
    --usage-ledger /tmp/coordinator-usage.json \
    --workers coordinator/fixtures/workers.json \
    --out /tmp/resultado.json
```

Sem `REPASSO_COORDINATOR_ENABLED=true` no ambiente, a saída é sempre
`BLOCKED` — e mesmo definindo `ENABLED=true`, `MODE` precisa ser
exatamente `observe`, e não existe nenhum `Transport` real conectado
nesta rodada (ver `anthropic_client.NotConfiguredTransport`), então uma
chamada de verdade **não tem como acontecer** por este código, mesmo que
alguém ligasse a variável sem querer.

## Testar

```bash
python3 -m coordinator.tests.run_all
```

47 testes, 8 módulos. Provam especificamente (Issue #95):

- `ENABLED=false` ⇒ zero chamadas externas (`test_anthropic_client`,
  `test_observe_pipeline`);
- evento duplicado ⇒ zero chamada nova, status `DUPLICATE`
  (`test_dedup`, `test_observe_pipeline`);
- evento não permitido ⇒ zero chamada, status `REJECTED`
  (`test_observe_pipeline`);
- `MODE` diferente de `observe` ⇒ bloqueado mesmo com `ENABLED=true`
  (`test_config_gate`, `test_anthropic_client`, `test_observe_pipeline`);
- segredo nunca aparece em log (`test_redact`, mais o teste específico em
  `test_anthropic_client` que injeta uma chave falsa num erro simulado);
- erro de API é uma tentativa só, nunca um loop de retry
  (`test_anthropic_client`);
- nenhuma permissão de escrita em matéria/Supabase/merge
  (`test_no_forbidden_writes`, prova estrutural via varredura de código);
- a saída sempre contém tipo, prioridade, worker/modelo sugeridos e
  próxima ação (`test_observe_pipeline`);
- custo/usage é registrado de forma sanitizada com um transporte mock
  (`test_anthropic_client::test_successful_call_registers_usage`,
  `test_budget`).

## Modelos (Issue #90)

Confirmados nos docs oficiais da Anthropic antes de codificar (skill
`claude-api`, tabela "Current Models", 2026-09-20):

| Nível lógico | Model ID | Uso nesta política |
|---|---|---|
| FAST | `claude-haiku-4-5` | classificação, roteamento, administrativo |
| STANDARD | `claude-sonnet-5` | auditoria de diff/audit-pack, conteúdo médico |
| DEEP | `claude-opus-5` | exceção de alto risco — **desabilitado por padrão nesta V2** |

Mudar o mapeamento é só `models.py` — a lógica FAST/STANDARD/DEEP não
depende do nome comercial.

## Próximos passos (fora desta rodada)

- construir o payload de evento a partir do contexto real do GitHub
  Actions (`pull_request`, `issue_comment`, `workflow_run`) — hoje o
  workflow só confirma que o portão fecha corretamente;
- decidir e implementar o `Transport` real (SDK da Anthropic) — só depois
  de uma auditoria independente desta V2 e do "primeiro teste controlado"
  descrito na Issue #95;
- decidir se/quando o Coordinator passa a comentar de verdade em Issues
  (a Issue #95 permite isso em OBSERVE; esta rodada entrega a
  classificação e o texto, não o `POST` do comentário).
