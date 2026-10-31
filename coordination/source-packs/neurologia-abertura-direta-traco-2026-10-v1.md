# Neurología · abertura direta com migração do traço (par da #619) — EXCEÇÃO TEMPORÁRIA, NÃO MESCLAR

## Impedimento (por que ficou fora da #619)

`neuportada` tem **1 traço** (id `1dece18a-29b8-4c80-8b08-57bec9f95ce0`, 21 pontos, 14/set), com `anchor_id = neuportada` (a seção inteira). A portada passa a ficar `hidden`; sem migração o traço seguiria no banco mas invisível. O traço cai sobre a tabela «Cuatro unidades» (a 1440 px: x≈485–502 px e y de −33 a 220 px, medidos a partir do canto da tabela; vai do cabeçalho até a linha II). Mudar `anchor_id` e `points` exige **escrever** em `user_ink_strokes`, e Claude 2 só lê. A migração abaixo é para quem tem escrita.

## Solução

- `neuportada` fica vazia e `hidden` (id mantido). Sai: hero, «Estado de la asignatura» (contagens), nota de fontes/auditoria das infografias, «Lo que la cátedra pidió manejar» (mapa e ressalvas de fonte) e a última linha da tabela («Banco · Repaso»).
- Vai para `neub01` (antes de «Resumen explicado»): «El método de toda la materia», o recorrido (com a ordem manifestación → … → abordaje), «las tres ideas», a tabela das quatro unidades + complemento, a anotação ao margem e «Sobre los nombres propios». Glossários `rmc-gl` intactos.
- A tabela passa a ser o elemento `neub01>14`. O traço é reancorado nela, com os pontos recalculados para que fiquem **nos mesmos pixels** em relação à tabela.

## Provas

- Navegador, 1440 px: pontos do traço relativos ao canto da tabela, antes (seção `neuportada`) × depois (`neub01>14` com os pontos novos): **desvio máximo 0 px em x e 0 px em y**; o texto sob o traço é o mesmo (cabeçalho e linhas I–II).
- `verify.py`: ids, quiz, fc, respostas, links e data-attrs iguais; só diferem as classes `ov`/`rmc-hero` (hero removido).
- Grifos reais (gate, 107): 107/107 sem remapeamento. Primeiro conteúdo: `neuportada` com `display:none`, primeira seção visível = `neub01`.
- Porta (7 etapas): 7/7 PASSA. Inventário regenerado (`inventario-fresco`: 0 velhos).
- Limite: a prova é a 1440 px (onde há tabela larga sem rolagem); em telas estreitas a tabela é mais alta que larga e o traço, antes esticado pela seção, passa a esticar com a tabela, o que é mais fiel ao texto.

## Alternativa testada sem migração, e por que foi recusada (revisão da #620)

Pedido: abrir Neurología pelo conteúdo **sem** escrever no banco, sem esconder nem deslocar o traço. Tentei dar o id `neuportada` a um elemento invisível sobre a tabela das unidades em `neub01` (o app acha a âncora por `querySelector('#neuportada')`).

O que funcionou, medido no app real com o traço semeado:

| Tela | Antes | Depois |
|---|---|---|
| 1440 / 1024 | 485, −33, 17 × 253 (px a partir do canto da tabela) | idêntico |
| 768 | 306, 63, 11 × 309 | 358, −26, 13 × 340 |
| 390 | 190, 280, 7 × 406 | 186, −16, 7 × 460 |

Grifos 107/107, traço novo sobre a tabela criado em `neub01>14` sem roubo de toque, sem rolagem horizontal nova, porta 7/7 (variante `span`).

O que reprovou nos checks do próprio repositório:

- **Guard** (🔴 `block-ids`): «block_id de seção removido: neuportada. As marcações do aluno são ancoradas por block_id.» Com o id num `span`, a seção deixa de existir e o Guard bloqueia.
- Com o id numa `<section>` aninhada, o Guard passaria, mas `inventario-fresco.py` falha (21 seções no inventário do navegador × 22 no HTML) e só fecharia editando o inventário à mão, o que seria forçar.
- Em tela estreita a posição do traço muda em relação a hoje (acompanha a tabela).

**Decisão:** não há solução segura sem migração do dado que passe nos checks. Neurología fica como **exceção temporária** (portada visível, como na main) até José autorizar uma das duas saídas: (a) o `UPDATE` de reancoragem no fim deste relatório, junto com o merge desta PR; ou (b) uma mudança no Guard/inventário (código global, fora do escopo) para aceitar a âncora invisível.


## Ordem de execução

1. Mesclar esta PR e rodar o `UPDATE` juntos (se só a PR entrar, o traço não se perde: fica no banco, invisível, até o `UPDATE`).
2. Conferir no navegador o traço junto à tabela das unidades no bloco 01.
3. Se precisar desfazer: reverter a PR e rodar a reversão.

## SQL (não executado)

```sql
-- MIGRAÇÃO (executar por pessoa com escrita; NÃO executada por Claude 2). Mesclar a PR e rodar isto juntos.
-- Traço 1dece18a… : de `neuportada` (seção inteira) para `neub01>14` (a tabela «Cuatro unidades»), mesmos pixels a 1440 px.
update public.user_ink_strokes
   set anchor_id = 'neub01>14', points = '[[0.64396, -0.04963], [0.6455, 0.00501], [0.6455, -0.00835], [0.64332, 0.0478], [0.64332, 0.07148], [0.64396, 0.039], [0.64332, 0.17908], [0.64177, 0.1894], [0.64332, 0.14812], [0.64332, 0.17908], [0.62571, 0.28546], [0.62571, 0.28971], [0.62648, 0.28091], [0.62648, 0.29715], [0.63226, 0.3237], [0.63162, 0.33114], [0.62943, 0.3325], [0.63226, 0.32962], [0.63085, 0.3325], [0.62352, 0.33402], [0.62571, 0.33402]]'::jsonb
 where id = '1dece18a-29b8-4c80-8b08-57bec9f95ce0' and subject_slug = 'neurologia' and anchor_id = 'neuportada';

-- REVERSÃO (só se a PR for revertida)
update public.user_ink_strokes
   set anchor_id = 'neuportada', points = '[[0.54602, 0.34729], [0.54716, 0.35415], [0.54716, 0.35248], [0.54545, 0.35953], [0.54545, 0.3625], [0.54602, 0.35842], [0.54545, 0.37603], [0.54432, 0.37733], [0.54545, 0.37214], [0.54545, 0.37603], [0.53182, 0.38939], [0.53182, 0.38994], [0.53239, 0.38883], [0.53239, 0.39087], [0.53693, 0.39421], [0.53636, 0.39514], [0.53466, 0.39532], [0.53693, 0.39495], [0.5358, 0.39532], [0.53011, 0.39551], [0.53182, 0.39551]]'::jsonb
 where id = '1dece18a-29b8-4c80-8b08-57bec9f95ce0' and subject_slug = 'neurologia' and anchor_id = 'neub01>14';
```
