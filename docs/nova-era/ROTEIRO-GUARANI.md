# Guaraní · prévia só para o administrador e volta

> Tudo no **Supabase → SQL Editor**, **depois do merge e do deploy**. **Nada aqui foi executado.** Sem linha em `rm_materia_rollout`, a matéria continua como hoje (`off`). Guaraní não tem grifos, traços nem notas de alunos no último retrato (G2 de `PROXIMAS-MATERIAS-EM-GRUPOS.md`).

## 0 · Antes (só olhar, recomendado)
```sql
select 'grifos' as tipo, count(*) n, count(distinct user_id) contas from public.user_highlights where subject_slug = 'guarani'
union all select 'tracos', count(*), count(distinct user_id) from public.user_ink_strokes where subject_slug = 'guarani'
union all select 'notas', count(*), count(distinct user_id) from public.user_notes where subject_slug = 'guarani';
```

## 1 · Prévia
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
values ('guarani', 'preview', 'preview', 'preview', now())
on conflict (slug) do update set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();
```

## 2 · O que conferir (3 min, conta administradora)
1. **Capa:** terracota com azul e 3 medalhões (saludos, consulta, animales).
2. **Índice:** 13 blocos num grupo só.
3. Bloco → próximo → índice; modos Infografías, Preguntas, Flashcards; responder uma pergunta; ▶ Jugar; ampliar uma infografía.
4. iPad com a caneta: escrever num parágrafo e numa tabela, recarregar.

## 3 · Voltar (imediato)
```sql
update public.rm_materia_rollout set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now() where slug = 'guarani';
```
