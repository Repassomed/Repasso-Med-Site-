# Medicina Familiar · roteiro curto (criar desligado → só layout para José → voltar)

> Tudo no **Supabase → SQL Editor**. Nada no Netlify. Nada aqui foi executado: são os comandos para você rodar, na ordem. Pré-requisito: a #622 e a #624 (prévia só do administrador) já mescladas e com deploy. Regra: `off` desliga para todos; `preview` é só administrador (hoje, só você); `all` libera só os alunos com acesso à matéria e o administrador.

**0 · Conferir que só você é administrador** (somente leitura; deve listar 1 linha, a sua):
```sql
select u.email, p.is_admin from public.profiles p join auth.users u on u.id = p.id where p.is_admin = true;
```

**1 · Criar o controle, desligado** (cole o arquivo inteiro `supabase/migrations/20261030_01_rm_materia_rollout.sql`; cria a tabela e a linha de Medicina Familiar em `off`). Conferir:
```sql
select slug, layout_stage, pen_stage, visual_stage from public.rm_materia_rollout where slug = 'medicina-familiar';   -- off | off | off
```

**2 · Ligar SÓ o layout, SÓ para você (prévia)**
```sql
update public.rm_materia_rollout set layout_stage = 'preview', atualizado_em = now() where slug = 'medicina-familiar';
```
Recarregue Medicina Familiar no iPad: layout novo **só para você**. Aluno ou aba anônima: layout antigo. Teste de 3 min: abrir 3 blocos pelo índice; rolar uma tabela larga (a página não alarga); marcar um trecho e recarregar.

**3 · Voltar atrás (imediato, sem deploy; vale quando a página recarrega)**
```sql
update public.rm_materia_rollout set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now() where slug = 'medicina-familiar';
```

**Só depois de aprovar no iPad (outro passo, não agora):** `layout_stage = 'all'` libera para todos os alunos com acesso; a caneta é separada (`pen_stage = 'preview'` → `'all'`). Detalhes e riscos: `IMPLANTACAO-POR-MATERIA.md`.

**Se algo estranho aparecer:** rodar o comando do passo 3; depois o rollback `20261030_01_rm_materia_rollout_rollback.sql` remove a tabela (tudo volta a desligado).
