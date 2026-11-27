# Ativação do 7.º semestre · SÓ na conta de José · uma matéria por vez · 27/11/2026

> **Nada aqui foi executado.** São comandos para José rodar no **Supabase → SQL Editor**, **uma matéria por vez**, depois do merge e do deploy. Mecanismo: tabela `rm_materia_rollout` (a mesma de Medicina Familiar). `preview` = **só a conta administradora** (`profiles.is_admin`); alunos e abas anônimas continuam com a versão atual. **Nunca use `all`** neste roteiro (`all` = alunos). Primeros Auxilios, Interculturalidad, Imagenología e Bioestadística **não entram**.

## 0 · Condições para começar (uma vez só)
1. **Deploy:** Netlify → Deploys: a linha do topo (**Production: main**) está **Published** e contém o commit esperado. Para **Neurología**, antes disso: merge da **#682** e depois da **#731** (sem elas Neurología não é candidata).
2. **Acesso (SELECT, só leitura)** — rodar `docs/nova-era-temas/previa-lote-leitura.sql`:
   - **L1** `administradores` = **1** (a conta de José). Se for mais de 1, essas contas também verão a prévia: **pare** e avise.
   - **L2** mostra as linhas existentes (esperado hoje: só `medicina-familiar` em `preview` e, se houver, as que José já ligou). Linha ausente = desligada.
   - **L3** (alguma em `all`?) = **nenhuma**. Se aparecer alguma, **pare**.
3. Entre no site **com a conta de José** e anote a aparência atual da matéria (layout antigo).

## 1 · Ordem sugerida (do menos arriscado ao que depende de merges)
| # | Matéria (slug) | Antes de ligar |
|---|---|---|
| 1 | Dermatología (`dermatologia`) | nada além da seção 0 |
| 2 | Toxicología (`toxicologia`) | idem |
| 3 | Anestesiología (`anestesiologia`) | idem (#710 já está na `main`) |
| 4 | Ortopedia (`ortopedia`) | idem; se a #729 já tiver sido mesclada, deploy dela publicado |
| 5 | Oftalmología (`oftalmologia`) | idem; se a #726 já tiver sido mesclada, deploy dela publicado |
| 6 | Neurología (`neurologia`) | **#682 e depois #731 mescladas e publicadas** |

**Uma matéria só passa à seguinte quando José disser que a anterior está boa.** Se uma PR de conteúdo (#726, #729) for mesclada depois de a matéria já estar em prévia, a prévia continua; basta recarregar sem cache.

## 2 · Para CADA matéria (troque `<slug>`)
### 2A · Layout + tema visual (caneta ainda desligada)
```sql
insert into public.rm_materia_rollout (slug, layout_stage, pen_stage, visual_stage, nota, atualizado_em)
values ('<slug>', 'preview', 'off', 'preview', '[so-jose 27/11] etapa A: layout e tema', now())
on conflict (slug) do update
  set layout_stage = 'preview', pen_stage = 'off', visual_stage = 'preview', nota = '[so-jose 27/11] etapa A: layout e tema', atualizado_em = now();
```
**Verificação de acesso (1 min):**
1. Recarregue a matéria **sem cache** na conta de José: layout novo + tema próprio.
2. **Mesma matéria numa aba anônima (sem login) e, se possível, em outra conta de aluno:** tem de continuar **exatamente como antes** (layout antigo). Se algum aluno vê o layout novo → **volte agora** (seção 3) e avise.
3. SELECT de conferência (só leitura): `select slug, layout_stage, pen_stage, visual_stage from public.rm_materia_rollout where slug = '<slug>';` → `preview | off | preview`.
4. Confira no iPad/computador: abrir um bloco, passar ao seguinte, voltar ao índice; modos Infografías, Preguntas, Flashcards; responder uma pergunta; ▶ Jugar; os grifos amarelos continuam no mesmo trecho.

### 2B · Caneta (só depois da etapa A boa)
```sql
update public.rm_materia_rollout
set pen_stage = 'preview', nota = '[so-jose 27/11] etapa B: caneta', atualizado_em = now()
where slug = '<slug>';
```
Verificação: no iPad com a Apple Pencil, escreva num parágrafo e numa tabela: o traço fica onde escreveu, **o dedo não desenha**, desfazer remove o último traço, e o traço **volta ao recarregar** no mesmo lugar. Repita a verificação de acesso (aba anônima/aluno **não** veem caneta).

## 3 · Reversão (imediata, sem deploy) — uma matéria
```sql
update public.rm_materia_rollout
set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', nota = '[so-jose 27/11] revertida', atualizado_em = now()
where slug = '<slug>';
```
Só caneta: `update public.rm_materia_rollout set pen_stage = 'off', atualizado_em = now() where slug = '<slug>';`
**Reverter as seis de uma vez (emergência):**
```sql
update public.rm_materia_rollout
set layout_stage = 'off', pen_stage = 'off', visual_stage = 'off', atualizado_em = now()
where slug in ('dermatologia','toxicologia','anestesiologia','ortopedia','oftalmologia','neurologia');
```
Os dados dos alunos (grifos, notas, traços) **nunca** são tocados em nenhum passo.

## 4 · Neurología (observações próprias)
`ROTEIRO-NEUROLOGIA.md` traz a conferência específica (27 blocos, card «R» da abertura, 13 infografias novas sem nome de docente, texto de punção lumbar corrigido). Pode haver 2 grifos do bloco 20 sem âncora (frases do erro antigo).

## 5 · O que este roteiro NÃO faz
Não liga alunos; não muda `medicina-familiar` nem o piloto `semiologia-ii`; não mexe em variáveis do Netlify; não é um lote (o lote `previa-lote.sql` continua separado e **não** é usado aqui).
