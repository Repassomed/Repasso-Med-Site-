# Fisiopatología I e Farmacología I · prévia completa só para o administrador (um comando por matéria) e volta

> Tudo no **Supabase → SQL Editor**. Nada no Netlify. **Nada aqui foi executado**: são os comandos para José rodar **depois do merge e do deploy** da PR. A tabela `rm_materia_rollout` já existe (mesmo mecanismo privado de Medicina Familiar). Sem linha na tabela, a matéria continua exatamente como hoje (`off`).

## 0 · Antes (só olhar)
No Netlify → **Deploys**: a linha do topo (**Production: main**) mostra o commit da PR com status verde **Published**.

## 1 · Fisiopatología I — layout + tema visual + caneta, em prévia, só para o administrador
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
values ('fisiopatologia', 'preview', 'preview', 'preview', now())
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();
```

## 2 · Farmacología I — idem
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
values ('farmacologia', 'preview', 'preview', 'preview', now())
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();
```
Recarregue cada matéria (sem cache). **Só a conta administradora** vê o layout novo, o tema próprio e a caneta; alunos e qualquer aba anônima continuam com a versão atual. A prévia pode ficar ligada.

## 3 · O que José confere (3 minutos por matéria, na conta administradora)
1. Abre a matéria: aparece a capa com o tema (Fisio I vinho/terracota, Farmaco I azul-índigo), o índice com os blocos (Fisio I: 12 blocos em Unidad I e II; Farmaco I: 17 blocos **sem número repetido** nos títulos).
2. Abre um bloco, passa para o seguinte, volta ao índice; entra nos modos Infografías, Preguntas, Flashcards (e Videos em Farmaco I).
3. Responde uma pergunta, abre o jogo de flashcards (▶ Jugar), amplia uma infografía com um clique.
4. Confere que os grifos amarelos que já existem continuam no mesmo trecho.
5. No iPad com a caneta: escreve em um parágrafo e em uma tabela; o traço fica onde escreveu, e volta ao recarregar.

## 4 · Voltar (imediato, sem deploy)
```sql
update public.rm_materia_rollout set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now() where slug in ('fisiopatologia', 'farmacologia');
```
Dados dos alunos nunca são tocados em nenhum passo.

## 5 · O que NÃO está neste roteiro (de propósito)
Liberar para alunos (`all`): outra decisão, depois da prévia, uma linha por recurso (`layout_stage`, `visual_stage`, `pen_stage` são independentes).
