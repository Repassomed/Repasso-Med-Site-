# Medicina Familiar · prévia completa só para o administrador (um comando) e volta

> Tudo no **Supabase → SQL Editor**. Nada no Netlify. Nada aqui foi executado: são os comandos para você rodar **depois do merge e do deploy** desta PR. A tabela `rm_materia_rollout` já existe e a linha de Medicina Familiar está em `off | off | off`. Regra: `off` desliga para todos; `preview` é **só administrador** (hoje, só você); `all` libera só os alunos com acesso à matéria e o administrador.

## 0 · Antes (só olhar; nada a testar)
No Netlify → site **repassomed** → **Deploys**: a linha do topo (**Production: main**) deve mostrar o commit desta PR com status verde **Published**. (Sem isso, o código novo ainda não está no ar e a prévia mostraria a versão anterior.)

## 1 · UM comando: layout + tema visual + caneta, em prévia, só para o administrador
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
values ('medicina-familiar', 'preview', 'preview', 'preview', now())
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();
```
Recarregue Medicina Familiar (sem cache). **Só a conta administradora** vê o layout novo com o sistema visual próprio e a caneta; alunos, o segundo testador e qualquer aba anônima continuam com a versão atual. A prévia **pode ficar ligada** enquanto preparamos as outras matérias: não afeta aluno nenhum, não grava nada diferente do que você já faz (grifos, notas e traços seguem as mesmas tabelas) e outras matérias não mudam.

## 2 · Voltar (imediato, sem deploy; vale quando a página recarrega)
```sql
update public.rm_materia_rollout set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now() where slug = 'medicina-familiar';
```
Dados dos alunos nunca são tocados em nenhum passo. Se quiser remover tudo: `20261030_01_rm_materia_rollout_rollback.sql` apaga a tabela e a matéria volta à versão atual.

## 3 · O que NÃO está neste roteiro (de propósito)
Liberar para alunos (`all`). Isso é outra decisão, depois de você ver a prévia, e é uma linha por recurso: `layout_stage`, `visual_stage` e `pen_stage` são independentes. Testes de engenharia (dados, conta de aluno, volta, outra matéria, celular e tablet emulados) já foram feitos e estão em `MEDICINA-FAMILIAR-COMPLETA.md`; o único limite que a automação não cobre é o aparelho real (Safari/Apple Pencil), descrito lá.
