# Anatomía Patológica II · prévia completa só para o administrador (um comando) e volta

> Tudo no **Supabase → SQL Editor**. Nada no Netlify. **Nada aqui foi executado**: são os comandos para José rodar **depois do merge e do deploy** da PR. A tabela `rm_materia_rollout` já existe (mesmo mecanismo privado de Medicina Familiar). Sem linha na tabela a matéria continua exatamente como hoje (`off`).

## 0 · Antes (só olhar)
No Netlify → **Deploys**: a linha do topo (**Production: main**) mostra o commit da PR com status verde **Published**.

## 1 · Layout + tema visual + caneta, em prévia, só para o administrador
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
values ('anatomia-patologica-ii', 'preview', 'preview', 'preview', now())
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();
```
Recarregue Anatomía Patológica II (sem cache). **Só a conta administradora** vê o layout novo, o tema e a caneta; alunos e abas anônimas seguem com a versão atual.

## 2 · O que José confere (3 minutos, conta administradora)
1. Capa com o tema (vinho), medalhões e o índice com os **8 blocos** (Parcial 1: 01–03 · Parcial 2: 04–06 · Final: 07–08) + banco, mazo, bibliografía e a nota de «subrayados anteriores» no grupo REPASO.
2. Abre um bloco, passa ao seguinte, volta ao índice; entra nos modos **Infografías**, **Preguntas** e **Flashcards**.
3. Responde uma pergunta e abre o jogo de flashcards (▶ Jugar).
4. Confere que os grifos amarelos que já existem (inclusive os da antiga introdução, hoje em «subrayados anteriores») continuam no mesmo trecho.
5. No iPad com a caneta: escreve em um parágrafo e em uma tabela; o traço volta ao recarregar.

## 3 · Voltar (imediato, sem deploy)
```sql
update public.rm_materia_rollout set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now() where slug = 'anatomia-patologica-ii';
```
Dados dos alunos nunca são tocados em nenhum passo.

## 4 · O que NÃO está neste roteiro (de propósito)
Liberar para alunos (`all`): outra decisão, depois da prévia. A matéria irmã **Anatomía Patológica II Práctica** (`anatomia-patologica-ii-practica`) **não** faz parte desta PR.
