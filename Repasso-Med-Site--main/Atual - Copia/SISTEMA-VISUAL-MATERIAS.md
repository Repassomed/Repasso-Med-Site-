# Sistema visual de matérias (piloto: Semiología II)

Implementação do piloto visual aprovado pelo Design (`design-sistema/`: GUIA-SISTEMA, tokens, BRIEF-ILUSTRACIONES, GUIA-IMPLEMENTACION do piloto).
**Só aparência.** HTML, ids, âncoras e scripts de cada matéria não mudam.

## Quem vê
Só a conta piloto, só em `semiologia-ii`. É uma CAMADA sobre o Layout V2:

1. `rm-pilot.js` pergunta a `get-pilot-flags` (por UID autenticado) → `{ layout, visual }`;
2. com `layout` anexa o Layout V2 (como antes); **só se também `visual === true`** carrega `rm-materia-sistema.css/js`;
3. falha fechada: sem `visual`, erro de rede ou erro de `attach()` ⇒ nada do sistema entra (o layout fica como estava).

**`visual` é negado por padrão.** Só vale para quem tem `layout` **e** está em `RM_PILOT_VISUAL_UIDS` (lista própria, obrigatória: variável
ausente ou vazia ⇒ ninguém vê o tema; ele **não** herda a lista do layout). Para ver o tema **depois do merge**: configurar no Netlify
`RM_PILOT_VISUAL_UIDS=<UID de José>` (o UID nunca entra no repositório). Sem a variável, o tema fica desligado e o site/Layout V2 seguem como hoje. Kill switch só do tema: remover/esvaziar a variável (o Layout V2 continua).
Teste: `tools/qa/browser-qa/layout/pilot-flags.test.cjs`.

## Arquivos
| arquivo | papel |
|---|---|
| `assets/rm-materia-sistema.css` | tokens + tema + 8 componentes; toda regra começa em `html.rm-sis` |
| `assets/rm-materia-sistema.js` | lê dados reais do DOM, marca capítulos, monta a UI derivada (`[data-rm-ui]`), `attach/detach` |
| `assets/img/semio2/vig/vb-00…10.webp` | vinhetas/medalhões aprovados (recortes de infografías, 480 px, WebP) |
| `tools/qa/browser-qa/layout/sistema.test.cjs` · `pilot-flags.test.cjs` | falha fechada, conteúdo intacto, contagens, detach, funções, geometria, cabeçalho compacto · gate do servidor |
| `tools/qa/browser-qa/layout/capturas-sistema.cjs` | capturas desktop/tablet/celular |

## Estrutura do CSS
`1 constantes` (header, papel, tipografias, recursos C3, notas P4, correto/incorreto) · `2 tema` (só variáveis:
`--rm-surface/--rm-side/--rm-accent/--rm-marker/--rm-pal-1…6(+tons)/--rm-tag-radius/--rm-vig-radius`) ·
`3 [data-rm-cap]` → `--cap-*` locais · `4…14` componentes C-header, C-02 lateral, C-01 capa/C3/índice, C-03 título de bloco,
C-04 resumo, C-05 tabela, C-06 pergunta, C-07 notas P4, C-08 infografia/recursos.
Nenhum componente tem cor própria de matéria: todos leem `--cap-*` e as constantes.

## Como criar a próxima matéria (sem mexer nos componentes)
1. CSS: copiar o bloco `html.rm-sis[data-rm-tema="semiologia-ii"]` (§2), trocar o slug e as 6 cores (+ tons derivados), superfície, lateral, marcador, raios.
2. JS: nova entrada em `TEMAS` (unidades/agrupamento, medalhões, vinhetas, `clasificar(id)` se os ids de seção forem diferentes).
3. Liberar o slug em `rm-pilot.js` e `get-pilot-flags.js` (hoje fixos em `semiologia-ii`) e subir `VER`/a tag em `index.html`.
4. Registrar o tema em `design-sistema/tokens-materias.json`.

## Dados reais (nada digitado)
Contagens de preguntas/tarjetas/infografías/tablas/sonidos vêm do DOM (capa, meta de cada bloco, índice, selo do resumo de preguntas).
Preguntas = só dos blocos (o banco geral repete as mesmas: não se soma). Infografía = `<figure>` com legenda e imagem (mesma regra do Layout V2).

## Contrato com o conteúdo
Em conteúdo só entram atributos `data-rm-cap/-tipo/-cmp/-cc/-label/-n/-tema` e a classe `rm-sis-s` na aba (todos removidos no `detach`).
Toda UI derivada leva `[data-rm-ui]` (fora do índice de marca-texto e das âncoras da tinta) e nunca cria `p/li/h1–h5/table/figure/blockquote`.

## «Sair» (logout) no piloto
O botão flutuante verde do site (`#logout-fab`, canto inferior direito) cobria a leitura no celular. No piloto ele fica oculto (CSS) e o mesmo controle
passa a viver na faixa fixa (`.rm-sis-out`, alvo ≥ 44 px, só ícone abaixo de 480 px); o clique é **delegado** ao `#logout-fab` original, que continua no DOM.
Fora do piloto nada muda. Teste: `sistema.test.cjs` §9–10 (320/390/768/1440, 6 paradas de rolagem, gaveta do índice, caneta armada).
