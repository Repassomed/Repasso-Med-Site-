# Prévia de várias matérias só para José — proposta para análise (NADA ativado, NADA executado)

**Problema:** hoje cada matéria da Nova Era tem uma linha em `public.rm_materia_rollout` (layout, caneta, tema em `off | preview | all`). Para ver 5, 8, 10 matérias José precisaria de um comando por matéria, ligar e desligar uma a uma.

**O que já protege (não muda):** `preview` = só `profiles.is_admin` (hoje a conta de José); alunos e visitantes continuam com a versão atual. Além disso, o `rm-pilot.js` só *pergunta* ao servidor pelas matérias que estão em `CANDIDATAS` (as preparadas); matéria fora da lista nunca monta o layout novo, qualquer que seja a tabela.

## Opção A (recomendada) — «pacote de prévia» em SQL, sem mudar código
Um comando liga todas as matérias preparadas em prévia; um comando desliga todas. Nenhum arquivo do site muda; usa só a tabela e a função `get-pilot-flags` que já existem. Rodar no Supabase → SQL Editor, **depois** do merge e do deploy.

```sql
-- LIGAR (prévia só para o administrador) — acrescente/retire slugs da lista conforme as PRs que já entraram na main
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
select s, 'preview', 'preview', 'preview', now()
from unnest(array[
  'biologia','embriologia','anatomia-patologica-practica','histologia-i'
]) as s
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();

-- VER o estado
select slug, layout_stage, pen_stage, visual_stage, atualizado_em from public.rm_materia_rollout order by slug;

-- DESLIGAR TODAS de uma vez (volta imediata, sem deploy; só mexe em quem está em preview)
update public.rm_materia_rollout
   set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now()
 where layout_stage = 'preview' or pen_stage = 'preview' or visual_stage = 'preview';
```
- O último comando **não toca** em linhas `all` (se algum dia uma matéria for liberada aos alunos, o «desligar prévia» não a derruba por acidente — para isso use `where slug = '…'`).
- Matéria cujo slug estiver na lista mas ainda não estiver em `CANDIDATAS` na main não monta nada (o site ignora).
- Medicina Familiar e Semiología II seguem o seu caminho próprio; não entram no pacote.

## Opção B — linha curinga `*` (não recomendada agora)
Uma linha `slug = '*'` valeria para toda candidata sem linha própria. Exige alterar `netlify/functions/get-pilot-flags.js` (área crítica: autenticação e permissões) e o teste `gate-por-materia`. Ganho pequeno sobre a Opção A, risco maior; só vale a pena se o número de matérias passar de ~15.

## Opção C — botão no painel de administração
Um botão «Prévia da Nova Era: ligar/desligar» no `admin.html` exigiria uma função Netlify com *service role* escrevendo a tabela (hoje só o SQL Editor escreve — decisão de segurança da migração). Não recomendada sem uma revisão de segurança própria.

## Recomendação
**Opção A**, mantendo a lista de slugs neste arquivo atualizada a cada PR de matéria. Para José: copiar o primeiro bloco (liga tudo), conferir no iPad, copiar o último bloco (desliga tudo). Nenhuma das opções libera nada para alunos.
