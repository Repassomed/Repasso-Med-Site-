# Nova Era · estado por matéria (19/11/2026)

**Leia isto primeiro:** «código na main» **não** significa «aparecendo na conta do aluno». Hoje o código de uma matéria só *pergunta* ao servidor (`CANDIDATAS`); quem decide é a linha da matéria em `rm_materia_rollout` (`off` ⇒ ninguém; `preview` ⇒ só administrador, hoje 1 conta; `all` ⇒ aluno com acesso). Ver `IMPLANTACAO-POR-MATERIA.md`.

## Evidência de ativação (SELECT só leitura, 19/11)

| O que foi consultado | Resultado |
|---|---|
| `rm_materia_rollout` (tabela inteira) | **1 linha**: `medicina-familiar`, `layout_stage = preview`, `pen_stage = preview`, `visual_stage = preview` (atualizada em 02/11). `preview` = **só administrador**. |
| Qualquer outra matéria | **Sem linha ⇒ `off`** (padrão). |
| Semiología II (piloto) | O piloto não passa pela tabela: depende das listas `RM_PILOT_*_UIDS` e `RM_*_SLUGS` do Netlify, que **não consigo ler** (e não alterei). **Ativação do piloto: não confirmada por mim.** |

**Conclusão com evidência:** nenhuma matéria está em `all` na tabela ⇒ **nenhum aluno vê o layout novo por esta via**. Só José (preview) vê Medicina Familiar. Isto vale para 19/11 e muda no instante em que um SQL do José mudar a tabela.

## Estado por matéria (as 27 do catálogo)

Legenda · **Código na main**: entra em `CANDIDATAS` + `TEMAS` (tema, classificador, vinhetas) + teste `real-*`. **PR aberta**: ainda não mesclada. **Não preparada**: sem tema nem candidata.

| Matéria (slug) | Código na main | PR de origem / PR aberta | Ativação confirmada |
|---|---|---|---|
| Semiología II (`semiologia-ii`) | sim (piloto) | anteriores | não confirmada por mim (listas do Netlify) |
| Medicina Familiar (`medicina-familiar`) | sim | anteriores | **preview (só José)** — tabela |
| Fisiopatología (`fisiopatologia`) | sim | anteriores (origem não reconferida aqui) | nenhuma (sem linha) |
| Farmacología (`farmacologia`) | sim | anteriores (idem) | nenhuma |
| Biología (`biologia`) | sim | anteriores (idem) | nenhuma |
| Embriología (`embriologia`) | sim | #636 | nenhuma |
| Anatomía I (`anatomia-i`) | sim | anteriores (cadeia Anatomía I/AP I) | nenhuma |
| Anatomía Patológica I (`anatomia-patologica`) | sim | idem | nenhuma |
| Anatomía Patológica I Práctica (`anatomia-patologica-practica`) | sim | #653 | nenhuma |
| Histología I (`histologia-i`) | sim | #653 | nenhuma |
| Histología I Práctica (`histologia-i-practica`) | sim | #656 | nenhuma |
| Histología II (`histologia-ii`) | sim | #656 | nenhuma |
| Histología II Práctica (`histologia-ii-practica`) | sim | #656 | nenhuma |
| Fisiopatología II (`fisiopatologia-ii`) | sim | #645 | nenhuma |
| Farmacología II (`farmacologia-ii`) | sim | #644 | nenhuma |
| Anatomía Patológica II (`anatomia-patologica-ii`) | sim | #657 | nenhuma |
| Anatomía Patológica II Práctica (`anatomia-patologica-ii-practica`) | sim (blocos 01–16) | #662; **#689 aberta** (blocos 17–18, conteúdo novo + classificador até `ap2pb18`) | nenhuma |
| Toxicología (`toxicologia`) | sim | #660 | nenhuma |
| Anestesiología (`anestesiologia`) | sim | #663 | nenhuma |
| Ortopedia (`ortopedia`) | sim | #664 | nenhuma |
| Oftalmología (`oftalmologia`) | sim | #664 | nenhuma |
| Dermatología (`dermatologia`) | sim | #655 (mesclada em 19/11) | nenhuma |
| **Guaraní (`guarani`)** | **não** | **#658 aberta** (pronta, depende só de ordem de José) | nenhuma |
| Imagenología (`imagenologia`) | não | — **não preparada** | nenhuma |
| Medicina Legal (`medicina-legal`) | não | — **não preparada** | nenhuma |
| Neurología (`neurologia`) | não | — **não preparada** para a Nova Era; conteúdo em andamento por Claude 1 (#687) e infográficos na #682 | nenhuma |
| Semiología (`semiologia`) | não | — **não preparada** | nenhuma |

Observação: `bioestadistica.html` existe na pasta de matérias, mas **não está no catálogo** do `index.html` (0 ocorrências), nem em `CANDIDATAS`. Não entra na conta acima.

## Totais

- **Código na main:** 22 de 27 (todas em `CANDIDATAS`; o piloto Semiología II é uma delas).
- **PR aberta:** 1 (Guaraní, #658) + 1 extensão de conteúdo de matéria já preparada (AP II Práctica, #689).
- **Não preparadas:** 4 (Imagenología, Medicina Legal, Neurología, Semiología).
- **Com ativação comprovada para aluno:** **0**. Com preview só para administrador: **1** (Medicina Familiar).

## Como esta lista foi feita

`CANDIDATAS` de `rm-pilot.js` e chaves de `TEMAS` em `rm-materia-sistema.js` da main `ac5ed3ac`; catálogo de `index.html`; log de merges do Git; `SELECT * FROM rm_materia_rollout`. **Limites:** não li as variáveis do Netlify; a origem das PRs de 7 matérias antigas não foi reconferida; «código pronto» aqui significa «testes verdes e porta aberta», não «aprovado no iPad».

## Compatibilidade #658 × #689 (ensaio local, nada enviado à #689)

- Merge da #689 sobre a #658: **um conflito**, só num **comentário** de `rm-materia-sistema.js` (a #658 insere o classificador `clasificarGN` logo antes do comentário de `clasificarAP2P`, que a #689 reescreve). `inventario.json` junta sozinho (linhas de matérias diferentes).
- **Receita:** manter o bloco de Guaraní inteiro e, depois dele, o comentário/classificador da #689 (blocos 01–18). Sem perda de nenhum lado.
- No estado composto: `real-guarani` **118/118** · `real-ap2p` **109/109** · `integracao-ap2p` **119/119** · `temas-ap2p` **51/51** · `css-temas` **73/73**; sintaxe JS e `inventario.json` válidos.
- A #689 **não toca** `rm-pilot.js`, `index.html` nem `rm-layout.js`; a #658 sobe `VER` para 2026111118 (tag do `index.html` igual). Conteúdo de AP II Práctica e Neurología: **não alterado** por esta PR.
