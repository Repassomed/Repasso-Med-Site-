# Prévia de várias matérias só para José — proposta para análise (NADA ativado, NADA executado)

**Problema:** hoje cada matéria da Nova Era tem uma linha em `public.rm_materia_rollout` (layout, caneta, tema em `off | preview | all`). Para ver 5, 8, 10 matérias José precisaria de um comando por matéria, ligar e desligar uma a uma.

**O que já protege (não muda):** `preview` = só `profiles.is_admin` (hoje a conta de José); alunos e visitantes continuam com a versão atual. Além disso, o `rm-pilot.js` só *pergunta* ao servidor pelas matérias que estão em `CANDIDATAS` (as preparadas); matéria fora da lista nunca monta o layout novo, qualquer que seja a tabela.

## Opção A (recomendada) — «prévia em lote» em SQL, sem mudar código, que PRESERVA os estados existentes
Dois arquivos (nada executado; copiar para o Supabase → SQL Editor **depois** do merge e do deploy; **um bloco por vez**):
- `previa-lote.sql` — bloco 0 (só leitura: mostra, por matéria, o que seria promovido), bloco 1 (ligar), bloco 2 (ver o estado);
- `previa-lote-volta.sql` — a volta segura, em arquivo **separado** (para que colar «tudo» nunca rode a volta junto).

**Regras (provadas por `tools/qa/nova-era/previa-lote.test.cjs`, 18 verificações, num Postgres local em memória — nenhum Supabase, nenhuma escrita real):**
1. **Nunca reduz nem desliga** o que já foi liberado: o lote só promove uma coluna (layout, caneta, tema) de `off` para `preview`. Coluna em `preview` ou `all` — inclusive `all` já liberado aos alunos — **não é alterada**.
2. Matéria ausente da tabela = tudo `off` (regra do site): ganha uma linha só com o que estava `off` promovido.
3. O lote **anota na própria linha o que promoveu** (`[previa-lote:layout,pen,visual]`, acrescentado à nota existente, que é preservada). Rodar o lote duas vezes não muda nada na segunda.
4. **Volta segura:** devolve a `off` **somente** as colunas que o lote promoveu **e** que ainda estão em `preview`; remove o marcador e restaura a nota original. Não toca em: coluna que José promoveu a `all` depois do lote, coluna que já estava em `preview`/`all` antes, matéria fora da lista, matéria sem o marcador. A volta também é idempotente. Matéria criada pelo lote volta a tudo `off` (equivale a ausente).
5. Voltar **uma** matéria só: copiar a volta e acrescentar `and r.slug = '…'`.

**Estados misturados testados:** matéria ausente · parcialmente liberada com nota (layout `all`, caneta `preview`, tema `off`) · tudo `off` · totalmente liberada aos alunos (`all/all/all`) · prévia manual parcial anterior ao lote · matérias fora da lista (uma com `all`) · promoção a `all` feita por José **depois** do lote (a volta não a derruba).

**Atenção — o que NÃO fazer:** não usar `update … set … = 'off' where … = 'preview'` em massa (derrubaria prévias manuais de José e de outras matérias que não são do lote). Esse atalho, que constava da primeira versão desta proposta, foi **removido**.

## Opção B — linha curinga `*` (não recomendada agora)
Uma linha `slug = '*'` valeria para toda candidata sem linha própria. Exige alterar `netlify/functions/get-pilot-flags.js` (área crítica: autenticação e permissões) e o teste `gate-por-materia`. Ganho pequeno sobre a Opção A, risco maior; só vale a pena se o número de matérias passar de ~15.

## Opção C — botão no painel de administração
Um botão «Prévia da Nova Era: ligar/desligar» no `admin.html` exigiria uma função Netlify com *service role* escrevendo a tabela (hoje só o SQL Editor escreve — decisão de segurança da migração). Não recomendada sem uma revisão de segurança própria.

## Recomendação
**Opção A**, mantendo a lista de slugs neste arquivo atualizada a cada PR de matéria. Para José: rodar o bloco 0 (só leitura) para ver o que muda, o bloco 1 (liga), conferir no iPad e, quando quiser, rodar `previa-lote-volta.sql` (devolve só o que o lote ligou). Nenhuma das opções libera nada para alunos nem reduz o que já foi liberado.
