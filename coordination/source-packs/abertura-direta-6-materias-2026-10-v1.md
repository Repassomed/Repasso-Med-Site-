# Abertura direta · 6 matérias (decisão de José, #617)

Rodada: Guaraní, Histología II, Oftalmología, Medicina Legal, Anestesiología e Ortopedia entram direto na aula. **Neurología ficou fora** (ver o fim). Nada foi ligado para alunos; nenhuma imagem, ID, pergunta, cartão ou gabarito mudou (`verify.py` contra a main: ids, quiz, fc, tags, respostas, classes, links e data-attrs iguais).

## Antes → depois

| Matéria | Antes (primeira tela) | Depois | Saiu da abertura | Ensino útil → onde foi |
|---|---|---|---|---|
| Guaraní | `gn00` visível: hero, post-it, aviso de ortografia, «Fuentes», nota das infografias | `gn00` vazio e `hidden` (id mantido); abre em `gnb01` | hero, «Fuentes» (achegety/cátedra), nota das infografias, o parágrafo «tres o cuatro reglas» (instrução de estudo; a regra oral × nasal já é o «Desde cero» de `gnb01`) | aviso «Una advertencia sobre la ortografía» (akã × aka, tãi) → `gnb01`, logo depois do «Desde cero» |
| Histología II | `h2portada` visível: hero, 5 pasos, post-it, tabela dos 13 blocos, «Tres confusiones», barras «Puntos a dominar», recuento | `h2portada` vazio e `hidden`; abre em `h2b01` | hero (fontes, «trece bloques»), tabela dos 13 blocos (mapa do curso), barras «Puntos a dominar» (peso de prova), recuento 75/74/66/8 | 5 pasos + lógica «cada estructura es la respuesta a un problema» + «Tres confusiones» → `h2b01` (após o «Desde cero») |
| Oftalmología | `ofportada` visível: hero com literatura, 5 contagens, «Fuentes», mapa dos 9 blocos | `ofportada` vazio e `hidden`; abre em `ofb01` | hero, contagens (9/139/267/28/27), «Fuentes», «Una idea por bloque» + tabela | «El eje clínico de Oftalmología» (comparar: conjuntivitis × queratitis, uveítis × glaucoma agudo, ángulo, retinopatía) → `ofb04` (Ojo rojo, o primeiro bloco onde essas comparações aparecem) |
| Medicina Legal | `medlegb00` visível: hero descritivo + post-it | `medlegb00` vazio e `hidden`; abre em `medlegb01` | hero (lista de temas, literatura, «desde cero») | «El eje de Medicina Legal» (certeza, achado × interpretação, cronologias estimativas) → `medlegb01` |
| Anestesiología | `aneportada` visível: hero, 5 contagens, recorrido, «De dónde sale… qué NO tiene», 3 divergências cátedra × literatura | `aneportada` vazio e `hidden`; abre em `aneb01` | hero, contagens, recorrido (mapa), alcance/fontes, «no hay banco de exámenes», divergências (já ensinadas em `aneb08`, `aneb11`, `aneb14`, `aneb15`) | «Cómo se razona en Anestesiología» (¿qué hago con esto?, orden temporal, as 2 perguntas) → **`aneb02`**, não `aneb01` (ver riscos) |
| Ortopedia | `otportada` visível: hero, 5 contagens, hilo conductor, nota 274/183, caixa «Las ideas que ordenan las unidades» | `otportada` vazio e `hidden`; abre em `otb01` | hero, contagens (17/457/432/108/1), nota dos rótulos das perguntas, caixa-mapa das ideias (cada ideia está nos blocos: Daniels, Garden/Pauwels, Salter-Harris, Denis, escafoides, líquido articular…) | «El hilo que ordena el resto de la materia» (3 perguntas: tecido, força, cura) → `otb01`, **depois** do elemento 71 e antes de «Puntos a dominar de este bloque» |

## Traços, notas e grifos (consulta somente leitura ao Supabase)

| Matéria | O que existe | Decisão | Prova |
|---|---|---|---|
| Ortopedia | 8 traços em `otb01>71` (a figura «movimientos anatómicos») | o card novo entra **depois** do elemento 71 | os 72 primeiros elementos de `otb01` são idênticos à main (HTML e índice `>71`) |
| Anestesiología | 4 traços em `aneb01` (âncora = a seção inteira, y≈0,50–0,55) | `aneb01` **não foi tocado** (idêntico à main); o ensino foi para `aneb02` | qualquer linha nova em `aneb01` deslocaria os 4 traços (coordenadas = fração da altura da seção) |
| Medicina Legal | 1 nota em `medlegb01` (âncora = seção, sem coordenada) + 260 grifos | o card entra depois do «Desde cero»; a nota continua na seção | gate de grifos 260/260 sem pintar frase errada (259 sobrevivem sem remapeamento, igual à main) |
| Histología II | 42 grifos (21 já órfãos na main) | — | gate 42/42; os mesmos 21 órfãos da main, nenhum novo |
| Oftalmología | 858 grifos | — | gate 858/858; 851 sem remapeamento, os mesmos 7 da main |
| Guaraní | nenhum traço/grifo/nota | — | — |

## Testes (rodados na branch)

- `verify.py` (ids/quiz/fc/tags/respostas/classes/links/data-attrs): OK nas 6.
- Primeiro conteúdo no navegador (1366 px): a portada tem `display:none` e a primeira seção visível é o bloco 01 nas 6.
- Porta de layout/caneta (`porta-da-materia.sh`, 7 etapas — inventário em dia, marcadores, âncoras estáveis, ida e volta com grifos/traços/nota semeados, 4 larguras, uso/modos, inventário de risco): **7/7 PASSA nas 6 matérias**.
- Inventário `docs/layout-ensaio/inventario.json` regenerado para as 6 matérias (`inventario-fresco.py`: 0 velhos).
- Guard local: passou com avisos já existentes na main (`banco-geral` de Anestesiología/Oftalmología/Ortopedia e `contagens` de Histología II). Aviso novo e esperado: em Ortopedia, as contagens do texto (457…) foram retiradas, então o Guard já não encontra o total declarado.

## Observação (não é desta PR)

Em Medicina Legal o selo do bloco 1 aparece como «02» no modo controle, igual à main (vem do app-core, arquivo global; não foi tocado).

## Neurología — fora desta PR

`neuportada` guarda 1 traço de 21 pontos (id de aluno único, 14/set), ancorado à **seção inteira** (`neuportada`), em x≈0,53–0,55 e y≈0,35–0,40. No navegador (1440 px) ele cai sobre a tabela «Cómo está armada la asignatura» (unidade I). Esvaziar a portada com `hidden` esconderia o traço, e movê-lo exige reescrever `anchor_id` e `points` na tabela `user_ink_strokes`, o que só uma pessoa com acesso de escrita pode fazer. Por isso ficou para uma PR própria, com SQL de migração e de reversão e a prova no navegador.
