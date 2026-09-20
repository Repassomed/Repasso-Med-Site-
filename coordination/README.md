# Coordenação do Repasso Med · V1

Este diretório é a parte **operacional** da coordenação: quem trabalha em quê,
em que estado está cada tarefa e quais arquivos estão reservados.

Ele **não** contém leis didáticas nem médicas. Essas continuam onde sempre
estiveram e não foram alteradas por esta versão:

- `CLAUDE.md` — manual central;
- `MANUTENCAO-DIDATICA-REPASSO-MED.md` — protocolo didático, incluindo a
  seção 8-A (integração e atualização de questões).

A **Issue #67** continua sendo o painel central. Tarefas grandes passam a ter
Issue própria, e a #67 guarda o checkpoint e o índice.

---

## Regra absoluta

**Quem dá merge é o José.** Nenhum agente mergeia, em nenhuma circunstância,
nem quando o Guard passa em tudo.

---

## Os três arquivos desta pasta

| arquivo | para que serve | quem lê |
|---|---|---|
| `tasks.json` | registro de tarefas: escopo, arquivos reservados, agente, estado | pessoas **e** o Guard |
| `STATES.md` | o significado exato de cada um dos oito estados | pessoas |
| `CHECKPOINT-TEMPLATE.md` | o formato do comentário de checkpoint na Issue | pessoas |

---

## Como uma tarefa nasce e morre

```
READY → IN-PROGRESS → NEEDS-AUDIT → MERGE-READY → DONE
            ↓              ↓
         BLOCKED       NEEDS-FIX
      BLOCKED-LIMIT
```

1. **Antes de começar**, o agente lê `tasks.json` e confere se algum dos
   arquivos que pretende tocar já está reservado por outra tarefa em
   `IN-PROGRESS` ou `BLOCKED-LIMIT`. Se estiver, a tarefa nasce **BLOCKED** e o
   agente **não começa** (Lei 3 — sem colisão).
2. O agente abre branch própria e PR próprio, e preenche a seção **ESCOPO** do
   modelo de PR. O Guard lê essa seção.
3. O Guard roda sozinho no PR e devolve um resumo. Ele **não** mergeia e
   **não** decide conteúdo médico.
4. O PR termina com o **Cartão de Merge**, escrito para o José, sem jargão.
5. O José decide.

---

## Reserva de arquivos (Lei 3)

A reserva é o campo `arquivos` de cada tarefa em `tasks.json`. Vale a regra
simples: **dois agentes não editam o mesmo arquivo ao mesmo tempo.**

O Guard confere duas coisas:

- se o PR toca arquivo **fora** do escopo declarado → sinaliza;
- se o PR toca arquivo reservado por **outra** tarefa ativa → sinaliza colisão.

Reservar não é opcional. Uma tarefa sem `arquivos` declarados não pode ser
verificada, e o Guard diz isso.

**A reserva já registrada é intocável pelo próprio PR que a usa.** Depois da
primeira auditoria independente (PR #94), o Guard passou a ler a reserva de
uma tarefa já existente **da BASE**, nunca do HEAD do PR — nem o corpo do
PR, nem uma edição de `tasks.json` dentro do mesmo diff, conseguem ampliar
o que já estava reservado antes. Ampliar uma reserva exige um PR à parte,
revisado por si só. (Tarefa nova, criada dentro do próprio PR, não tem essa
restrição — não existe reserva anterior para proteger.)

---

## Integridade do próprio Guard

Um PR não pode alterar `tools/qa/guard/**` e usar essa mesma versão
alterada para se autocertificar. O workflow extrai o código do Guard **da
base**, nunca do HEAD do PR, antes de rodá-lo — ver o comentário no topo de
`.github/workflows/guard.yml` e a seção correspondente em `tools/qa/README.md`.

**Limitação que o José precisa saber, não escondida:** essa extração
protege contra um PR que altera a *lógica* das verificações
(`checks.py`, `materia.py`). Ela **não** protege sozinha contra um PR que
altera também o `guard.yml` — o GitHub Actions roda a versão desse arquivo
que está no HEAD de PRs do mesmo repositório. Fechar esse buraco de vez
exige uma regra do próprio GitHub (branch protection ou CODEOWNERS
exigindo revisão humana para qualquer mudança em `.github/workflows/**`),
que só o dono do repositório configura.

---

## N workers

Hoje o time é Claude 1 a 4, e a previsão é encolher para Claude 1 a 3. Nada
neste diretório depende do número: `tasks.json` aceita qualquer valor no campo
`agente`, e a colisão é calculada por **arquivo**, não por agente. Adicionar ou
remover um worker não exige mudar nenhuma regra.

Nomes usados hoje: `Claude 1`, `Claude 2`, `Claude 3`, `Claude 4`, `humano`.

---

## O que a V1 deliberadamente **não** faz

- não corrige matérias;
- não decide correção científica;
- não mergeia;
- não faz deploy;
- não chama API paga;
- não escreve no Supabase — nem para testar;
- não altera autenticação, pagamentos, liberação de matérias nem produção.

A correção autônoma de castelhano, prosa e didática (Lei 10 da Issue #81)
fica para depois de a V1/V2 provarem estabilidade.

---

## Checkpoint por limite de uso (Lei 4)

Quando um agente chega perto do limite, ele **não** começa nada novo. Termina
a menor unidade coerente, faz commit e push, e registra o checkpoint na Issue
usando `CHECKPOINT-TEMPLATE.md`. A tarefa passa a **BLOCKED-LIMIT** com o
commit anotado.

Outro agente pode continuar **a partir daquele commit**. Quando o primeiro
voltar, ele recebe **outra** tarefa — não refaz o que já foi continuado.
