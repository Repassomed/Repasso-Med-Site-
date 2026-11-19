# Medicina Legal · prévia completa só para o administrador (um comando) e volta

> Tudo no **Supabase → SQL Editor**. Nada no Netlify. **Nada aqui foi executado**: são os comandos para rodar **depois do merge e do deploy** desta PR. A tabela `rm_materia_rollout` já existe; enquanto não houver linha, a matéria fica como hoje (tudo `off`). Regra: `off` desliga para todos; `preview` é **só administrador**; `all` é aluno com acesso. **Medicina Legal (`medicina-legal`) não é a Medicina LegalI (`semiologia-ii`, o piloto):** são matérias diferentes e este roteiro só mexe na primeira.

## 0 · Antes (só olhar)
Netlify → site **repassomed** → **Deploys**: a linha do topo (**Production: main**) deve mostrar o commit desta PR com **Published** verde.

## 1 · UM comando: layout + tema visual + caneta, em prévia, só para o administrador
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
values ('medicina-legal', 'preview', 'preview', 'preview', now())
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();
```
Recarregue Medicina Legal sem cache. Só a conta administradora vê o layout novo com identidade visual própria e caneta; alunos e abas anônimas seguem com a versão atual. Grifos, notas e traços usam as mesmas tabelas de sempre.

## 2 · Voltar (imediato, sem deploy)
```sql
update public.rm_materia_rollout set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now() where slug = 'medicina-legal';
```
Dados dos alunos nunca são tocados.

## 3 · O que olhar no iPad (3 minutos)
Capa e índice; abrir um bloco com ilustrações; escrever com a Pencil num parágrafo (a matéria não tem tabelas); conferir que **os grifos e a nota que os alunos já têm** continuam nos mesmos lugares (blocos 01, 02, 03 e 04); abrir os modos Infografías, Preguntas e Flashcards.

## 4 · O que NÃO está neste roteiro (de propósito)
Liberar para alunos (`all`): decisão posterior, depois de ver a prévia. Limite que a automação não cobre: aparelho real (Safari/Apple Pencil).
