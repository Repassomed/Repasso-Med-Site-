# Neurología · abertura direta, sem migração de dados (par da #619)

## O problema

`neuportada` guarda 1 traço de aluno (id `1dece18a-29b8-4c80-8b08-57bec9f95ce0`, 21 pontos, 14/set), ancorado à **seção inteira** (`anchor_id = neuportada`; pontos = fração da caixa dessa seção). Esvaziar e esconder a seção faria o traço sumir da tela; reancorá-lo no banco exigiria `UPDATE` em `user_ink_strokes`, que Claude 2 não faz e que José não deveria precisar fazer.

## A saída (nenhuma escrita no banco)

O app acha a âncora com `querySelector('#neuportada')` (qualquer elemento, não só `section`) e desenha o traço sobre a caixa dele. Então:

- a seção `neuportada` deixa de existir como bloco; o **mesmo id** passa para um elemento vazio, invisível e sem clique (`span`, `aria-hidden`, `pointer-events:none`), dentro de um contêiner relativo que envolve a tabela das unidades em `neub01`;
- a caixa desse elemento foi calculada em percentagens do contêiner para reproduzir, na tela larga, exatamente a posição antiga do traço sobre a tabela; o mesmo traço, sem tocar nos pontos nem no `anchor_id`;
- o ensino útil da portada (método, três ideias, tabela das unidades, nomes próprios) está no começo de `neub01`; saíram hero, contagens, fontes/auditoria e o mapa «Lo que la cátedra pidió manejar».

## Testes (app real do repositório, Supabase simulado com o traço real semeado)

Posição do traço medida a partir do canto da tabela das unidades (px; x, y, largura × altura):

| Tela | Antes (seção `neuportada`) | Depois (âncora na tabela) |
|---|---|---|
| 1440 | 485, −33, 17 × 253 | **485, −33, 17 × 253** (idêntico) |
| 1024 | — | 485, −33, 17 × 253 |
| 768 | 306, 63, 11 × 309 | 358, −26, 13 × 340 |
| 390 | 190, 280, 7 × 406 | 186, −16, 7 × 460 |

- Em tela larga o traço fica no mesmo pixel e continua sobre o cabeçalho e as linhas I–II da tabela.
- Em tela estreita muda em relação a **hoje**: hoje a caixa da seção inteira esticava o traço sem relação com o texto (a 390 px ele cai nas linhas II–IV); agora ele acompanha a tabela em todas as larguras e fica sobre o mesmo trecho que na tela larga. É a única diferença visível e é uma correção, mas **é uma mudança** e precisa do olho de José.
- Sem rolagem horizontal nova (`scrollWidth` = largura da tela em 390/768/1440).
- Grifos reais (107 registros): 107/107 sem remapeamento (medido com a seção presente numa cópia de teste, porque o conferidor `hl-real` recusa seções removidas; nenhum grifo está em `neuportada`).
- `verify`: ids, quiz, fc, respostas, links e data-attrs iguais; só mudam as classes do hero removido e a do contêiner novo.
- Primeiro conteúdo: a primeira seção do bloco é `neub01`; o índice não lista mais a portada.
- Traço novo: com o traço antigo carregado, desenhar com a caneta sobre a tabela (1440 e 390) cria um traço novo em `neub01>14` e o antigo continua em `neuportada`; a âncora invisível não rouba o toque.
- Porta de layout/caneta (7 etapas, inclui ida e volta): **7/7 PASSA**. Inventário regenerado (0 velhos).

## Riscos que continuam

1. É uma âncora de truque: se alguém mexer na tabela (ou nas percentagens) o traço sai do lugar. Há um comentário no HTML avisando.
2. O conferidor manual `hl-real` não aceita a seção removida (só é usado à mão; não roda em CI).
3. O traço nunca é apagado nem alterado no banco; no pior caso fica invisível.

## Se José preferir o caminho sem truque

Reancorar o traço no banco para `neub01>14` (a tabela) com pontos recalculados é a alternativa limpa, mas exige `UPDATE` por quem tem escrita. Não é necessária com esta PR.


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

**Decisão:** não há solução segura sem migração do dado que passe nos checks. Neurología fica como **exceção temporária** (portada visível, como na main) até José autorizar uma das duas saídas: (a) o `UPDATE` de reancoragem abaixo, junto com o merge desta PR; ou (b) uma mudança no Guard/inventário (código global, fora do escopo) para aceitar a âncora invisível.
