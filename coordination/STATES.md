# Estados oficiais das tarefas

São oito. Não inventar outros. O campo `estado` em `tasks.json` só aceita
estes valores, e o Guard rejeita qualquer outro.

| estado | quando usar | quem pode sair dele |
|---|---|---|
| `READY` | a tarefa está descrita, tem escopo e arquivos declarados, e ninguém começou | o agente que a assume |
| `IN-PROGRESS` | um agente está trabalhando nela agora; os arquivos estão reservados | o próprio agente |
| `BLOCKED` | não pode começar: colisão de arquivo, dependência aberta, ou falta decisão do José | quem resolver o bloqueio |
| `BLOCKED-LIMIT` | o agente parou por limite de uso; há commit e checkpoint registrados | outro agente, continuando do commit |
| `NEEDS-AUDIT` | o trabalho terminou e o PR está aberto, esperando auditoria independente | o auditor |
| `NEEDS-FIX` | a auditoria encontrou problema; volta para correção | o agente responsável |
| `MERGE-READY` | auditado, Guard verde, Cartão de Merge escrito — só falta a decisão do José | **apenas o José** |
| `DONE` | mergeado pelo José | ninguém; é o fim |

---

## Três regras que não se negociam

**1. `MERGE-READY` não é permissão de merge.** É o pedido. A decisão é do José,
sempre. Nenhum agente move uma tarefa de `MERGE-READY` para `DONE` por conta
própria.

**2. `BLOCKED-LIMIT` exige commit.** Sem `commit` preenchido, o estado é
inválido: o próximo agente não teria de onde continuar. O Guard sinaliza.

**3. Quem volta de um `BLOCKED-LIMIT` continuado recebe outra tarefa.** Se o
Claude 2 parou por limite e o Claude 3 continuou, o Claude 2 não retoma aquela
tarefa quando voltar — ele pega a próxima da fila. Isso evita dois agentes
reescrevendo o mesmo trecho.

---

## Estado × Guard

O Guard não muda estado de tarefa. Ele apenas **lê** `tasks.json` para saber:

- quais arquivos a tarefa do PR pode tocar;
- se algum outro registro ativo (`IN-PROGRESS` ou `BLOCKED-LIMIT`) reservou os
  mesmos arquivos.

Mudar estado é ato humano ou do agente, feito por commit em `tasks.json`.
