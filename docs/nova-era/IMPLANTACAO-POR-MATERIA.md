# Nova Era · implantação real, matéria por matéria, em duas etapas

> **Nada é ligado por esta PR.** Tudo nasce desligado (`off`). Quem liga, por matéria e por recurso, é José, com uma linha de SQL, e desliga com outra, sem deploy.

## 1 · Em palavras simples

Cada matéria tem **uma linha** numa tabelinha do Supabase (`rm_materia_rollout`) com **três botões independentes**: **layout novo**, **caneta** e **tema visual**. Cada botão tem três posições:

| Posição | Quem enxerga |
|---|---|
| `off` | ninguém (padrão) |
| `preview` | **só a conta de José** (as contas de teste que já existem no Netlify) — é a etapa «José vê e aprova no iPad» |
| `all` | **todos os alunos que já têm acesso àquela matéria** (mesma regra de acesso do site: matéria comprada e dentro da validade) |

Como são botões separados: layout pode estar em `all` e caneta em `off` (ou o contrário). Aluno **sem acesso** não recebe nada. **Outra matéria** não é afetada (cada uma é uma linha). **Não existe** botão «todas as matérias».

## 2 · O que a auditoria encontrou (antes → depois)

| # | Achado | Efeito | Solução |
|---|---|---|---|
| 1 | O servidor só liberava por **listas de contas de teste** (`RM_PILOT_LAYOUT_UIDS`, `RM_PILOT_PEN_UIDS`) | impossível chegar a um aluno sem colocar cada um nas listas | listas ficam como **etapa 1 (`preview`)**; a etapa 2 (`all`) libera por **acesso à matéria**, sem listar aluno nenhum |
| 2 | A caneta (V2) só montava para `BETA_UIDS`/`study_tools_beta`, **globalmente** (qualquer matéria) | liberar a caneta a um aluno a daria em todas as matérias | a V2 passa a ter o **modo «por matéria»**: o aluno comum só a recebe quando o servidor libera a matéria aberta; nas outras ela fica **invisível e inerte** e o marcador/goma antigos continuam |
| 3 | `penLiberada()` só valia para refinamentos físicos, sem montar a V2 | caneta «liberada» não aparecia | o mesmo `pen:true` agora também monta a V2 (por matéria) |
| 4 | O tema visual exige descritor aprovado por matéria; Medicina Familiar não tem | ligar o tema numa matéria sem descritor | continua **por cima do layout** e com botão próprio; sem descritor, o tema lança erro interno **capturado**: o layout fica, o tema não entra (testado) |
| 5 | A resposta do servidor não consultava se o aluno **tem acesso** à matéria | não era possível liberar «para quem já tem acesso» | `get-pilot-flags` consulta `my_active_subjects` (a mesma view do `get-materia`) com o token do aluno |
| 6 | Listas de variáveis do Netlify exigem **deploy** para mudar | «volta rápida» lenta | os estágios vivem no banco: **voltar = um `update`, sem deploy** (vale na próxima abertura da matéria) |

## 3 · Como funciona (caminho completo)

1. O site só **pergunta** ao servidor para as matérias da lista `CANDIDATAS` de `assets/rm-pilot.js` (1.ª fechadura, por PR: hoje Semiología II e **Medicina Familiar**). Outras matérias: zero requisição.
2. `get-pilot-flags` (servidor) valida o token do aluno, lê a linha da matéria em `rm_materia_rollout` e decide cada botão: `preview` ⇒ só contas de teste; `all` ⇒ aluno com acesso. Qualquer erro, linha ausente, tabela ausente ou valor estranho ⇒ **tudo `false`** (corpo idêntico, não revela o motivo). **Só lê.**
3. `rm-pilot.js`: `layout:true` ⇒ monta o Layout V2; `visual:true` ⇒ tema (se houver descritor); `pen:true` avisa o `rm-tools-v2.js`.
4. `rm-tools-v2.js`: beta de sempre ⇒ **idêntico a hoje**. Aluno comum ⇒ só monta com `pen:true` da matéria aberta, em modo por matéria; ao trocar para outra matéria, a V2 **some e desarma** (sem ler nem gravar traços/notas) e as ferramentas antigas voltam.
5. Semiología II (piloto) **não muda**: continua pelas listas de conta, e a tabela é ignorada para ela.

## 4 · Medicina Familiar, passo a passo para José

**Uma vez só, antes:** no Supabase → *SQL Editor* → colar e rodar o arquivo `supabase/migrations/20261030_01_rm_materia_rollout.sql` (cria a tabelinha e já põe Medicina Familiar com tudo `off`). Pode rodar antes ou depois do merge; sem a tabela, tudo fica desligado.

**Depois do merge e do deploy da PR** (todos os comandos no *SQL Editor*; nada no Netlify):

| Passo | O que fazer | O que você vê |
|---|---|---|
| 1. Ver só você (layout) | `update public.rm_materia_rollout set layout_stage='preview', atualizado_em=now() where slug='medicina-familiar';` | no iPad (recarregar a página) a matéria abre no layout novo; qualquer aluno ou aba anônima vê o antigo |
| 2. Testar no iPad (3 min) | abrir 3 blocos pelo índice; rolar uma tabela larga (a página não alarga); marcar um trecho e recarregar | tudo certo? vá ao 3. Algo errado? vá à volta |
| 3. Liberar o layout para todos | `update public.rm_materia_rollout set layout_stage='all', atualizado_em=now() where slug='medicina-familiar';` | todo aluno **com acesso** a Medicina Familiar passa a ver o layout novo na próxima vez que abrir |
| 4. Observar | 24 h; repetir `tools/qa/pre-voo/contagens-materia.sql` (grifos, traços e notas **não podem diminuir**) | |
| 5. Caneta, separada | `…set pen_stage='preview'…` → testar com a Pencil → `…set pen_stage='all'…` | só depois de o layout estar tranquilo |

**Volta imediata (por matéria):**
`update public.rm_materia_rollout set layout_stage='off', pen_stage='off', visual_stage='off', atualizado_em=now() where slug='medicina-familiar';`
Quem já estava com a página aberta troca ao recarregar. Os dados do aluno (grifos, notas, traços) **não são tocados** em nenhuma etapa nem na volta.

**Se o passo 1 não mostrar nada no iPad:** a sua conta pode não estar em `RM_PILOT_LAYOUT_UIDS` (Netlify). Se você testou Semiología II com o layout novo, já está.

## 5 · O que não muda

Outras matérias (sem requisição), Semiología II (piloto), login, compras e acesso (`get-materia` e `my_active_subjects` intactos; a função só **lê**), dados existentes (nenhuma migração de dados; a tabela nova é aditiva), áudio (só o piloto), infográficos (fora desta PR).

## 6 · Riscos e limites (honestos)

- **Safari/Apple Pencil e celulares reais** não são provados por automação; o passo 2 (iPad) é o que prova.
- **«Caneta para todos» = a caixa de ferramentas V2 inteira** (marcador V2, caneta, goma, desfazer, «Mis apuntes») naquela matéria. Se a ideia for liberar só parte, é uma decisão antes do passo 5.
- A resposta do servidor é lida **uma vez por abertura da matéria**: depois de `all`, o aluno recebe ao abrir/recarregar; depois de `off`, idem. Sessões abertas não mudam sozinhas.
- Cache de módulos do navegador: `rm-tools-v2.js` subiu para `?v=2026103001`.
- Tema visual: não há descritor aprovado de Medicina Familiar; `visual_stage` fica `off`.
- Uma matéria nova só entra depois de **PR própria** que a coloque em `CANDIDATAS` (e a porta do pré-voo aberta).

## 7 · Testes (somente simulação; nada de aluno real lido ou gravado)

RESULTADOS_TESTES
