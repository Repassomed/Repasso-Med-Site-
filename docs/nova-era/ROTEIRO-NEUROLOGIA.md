# Neurología · prévia completa só para o administrador (um comando) e volta

> Tudo no **Supabase → SQL Editor**. Nada no Netlify. **Nada aqui foi executado**: são os comandos para José rodar **depois do merge e do deploy** (primeiro a #682, depois a PR «Nova Era Neurología»). A tabela `rm_materia_rollout` já existe (mesmo mecanismo privado de Medicina Familiar). Sem linha na tabela a matéria continua exatamente como está para todos. **Decisão de José (26/11): a ativação é primeiro SOMENTE na conta dele, matéria por matéria; nada vai para alunos.**

## 0 · Antes (só olhar)
1. No Netlify → **Deploys**: a linha do topo (**Production: main**) mostra o commit da PR com status verde **Published**.
2. No Supabase (só leitura): `docs/nova-era-temas/previa-lote-leitura.sql` — L1 (administradores: esperado 1), L2 (estado das linhas), L3 (nenhuma matéria em `all`).

## 1 · Layout + tema visual + caneta, em prévia, só para o administrador
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, atualizado_em)
values ('neurologia', 'preview', 'preview', 'preview', now())
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'preview', visual_stage = 'preview', atualizado_em = now();
```
Recarregue Neurología (sem cache). **Só a conta administradora** vê o layout novo, o tema próprio (violeta) e a caneta; alunos e abas anônimas seguem com a versão atual.

## 2 · O que José confere (conta administradora)
1. Capa com o tema e o índice com os **27 blocos numerados como no conteúdo** (sem «UNIDAD ·»: o conteúdo repete e salta números), o card **«R» da abertura**, o banco (297) e o mazo (387).
2. Abre um bloco, passa para o seguinte, volta ao índice; entra nos modos **Infografías**, **Preguntas** e **Flashcards**.
3. Nos blocos 20–27 confere as **13 infografias novas** (rodapé sem nome de docente) e o texto de punção lumbar corrigido.
4. Responde uma pergunta (V/F e múltipla escolha), abre o jogo de flashcards (▶ Jugar).
5. Confere que os grifos amarelos que já existem continuam no mesmo trecho (a PR só mexeu no bloco 20: 2 grifos sobre frases do erro antigo podem ter ficado sem âncora).
6. No iPad com a caneta: escreve em um parágrafo e em uma tabela; o traço fica onde escreveu e volta ao recarregar.

## 3 · Voltar (imediato, sem deploy)
```sql
update public.rm_materia_rollout set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now() where slug = 'neurologia';
```
Dados dos alunos nunca são tocados em nenhum passo.

## 4 · O que NÃO está neste roteiro (de propósito)
Liberar para alunos (`all`): outra decisão, depois da prévia. `layout_stage`, `visual_stage` e `pen_stage` são independentes (José pode ligar só o layout e depois a caneta).
