# Anatomía I e Anatomía Patológica I · prévia só para o administrador (um comando por matéria) e volta

> Tudo no **Supabase → SQL Editor**. Nada no Netlify. **Nada aqui foi executado**: são os comandos para José rodar **depois do merge e do deploy** da PR, **uma matéria de cada vez**. A tabela `rm_materia_rollout` já existe (mesmo mecanismo privado de Medicina Familiar, Fisiopatología I e Farmacología I). Sem linha na tabela, a matéria continua exatamente como hoje (`off`).

## 0 · Antes (só olhar)
1. No Netlify → **Deploys**: a linha do topo (**Production: main**) mostra o commit da PR com status verde **Published**.
2. (Recomendado, somente leitura) conferir quantos grifos, traços e notas existem hoje nas duas matérias. A sessão que preparou a PR **não conseguiu** fazer esta consulta (acesso ao banco bloqueado); o último retrato é de 24/10 (Anatomía I 6 grifos de 2 contas; AP I 60 grifos de 7 contas; 0 traços; 0 notas):
```sql
select 'grifos' as tipo, subject_slug, count(*) as n, count(distinct user_id) as contas from public.user_highlights where subject_slug in ('anatomia-i','anatomia-patologica') group by 2
union all select 'tracos', subject_slug, count(*), count(distinct user_id) from public.user_ink_strokes where subject_slug in ('anatomia-i','anatomia-patologica') group by 2
union all select 'notas', subject_slug, count(*), count(distinct user_id) from public.user_notes where subject_slug in ('anatomia-i','anatomia-patologica') group by 2
order by 2, 1;
```
Se aparecer **traço** ou **nota** (hoje 0), me avise antes da prévia: aí refaço o teste de âncoras com os números do dia.

## 1 · Anatomía I — layout + tema visual + caneta, em prévia, só para o administrador
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
values ('anatomia-i', 'preview', 'preview', 'preview', now())
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();
```

## 2 · Anatomía Patológica I — idem (outro dia, ou depois de conferir a primeira)
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
values ('anatomia-patologica', 'preview', 'preview', 'preview', now())
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();
```
Recarregue a matéria (sem cache). **Só a conta administradora** vê o layout novo, o tema e a caneta; alunos e aba anônima continuam com a versão atual.

## 3 · O que José confere (3 minutos por matéria, na conta administradora)
1. **Capa:** Anatomía I cor de osso com acento azul-petróleo e 3 medalhões (tórax, miembro superior, cuello); AP I rosada/violeta (cores da H-E) com 3 medalhões (necrosis, inflamación, neoplasias) e a legenda das 3 unidades.
2. **Índice:** Anatomía I = 33 blocos num grupo só, com cor por região; AP I = punto de partida «Ideas clave», Unidad I (8 blocos), Unidad II (3), Unidad IV (1). As três seções que o conteúdo deixa sem número aparecem como **06A Calcificación, 06B Aterosclerosis, 08A Reparación**.
3. Abre um bloco, passa ao seguinte, volta ao índice; entra nos modos Infografías, Preguntas, Flashcards. Em Anatomía I, no modo Preguntas, cada bloco mostra a caixa «📝 Preguntas · Bloque NN» fechada: tocar abre.
4. Responde uma pergunta, abre o jogo de flashcards (▶ Jugar). Infografías: em AP I amplia com um clique; em Anatomía I não há ampliação (igual a hoje), e no celular a figura desliza de lado.
5. Os grifos amarelos que já existem (Anatomía I: blocos 05 e 09; AP I: Introducción, Adaptación, Lesión) continuam no mesmo trecho.
6. No iPad com a caneta: escreve num parágrafo e numa tabela; o traço fica onde escreveu e volta ao recarregar.

## 4 · Voltar (imediato, sem deploy)
```sql
update public.rm_materia_rollout set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now() where slug in ('anatomia-i', 'anatomia-patologica');
```
Dados dos alunos nunca são tocados em nenhum passo.

## 5 · O que NÃO está neste roteiro (de propósito)
Liberar para alunos (`all`): outra decisão, depois da prévia, por matéria e por recurso. AP I tem a maior exposição deste par (60 grifos de 7 contas no retrato de 24/10): vale avisar os alunos antes.
