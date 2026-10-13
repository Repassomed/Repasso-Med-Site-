# Fisiopatología II · Issue #101 · Relatório dos checkpoints 1 e 2 (documento interno)

> Agente: Claude 2 · branch `claude/fisiopatologia-ii-issue101` · tarefa `fisiopatologia-ii-issue101-r3-sourcepack` · **sem merge**.
> Fontes e reconciliação das fotos: `fisiopatologia-ii-issue101-fotos-v2.md`. Este relatório cobre o que foi **alterado no HTML** e os testes.

## 1 · O que foi encontrado

1. **Cobertura de prova já quase completa.** Dos 20 itens da prova fotografada (21/09) e dos 30 do banco numerado (19/09), só **1** não tinha equivalente (Crigler-Najjar I: tipo de hiperbilirrubinemia). 9 dos 20 já estavam como «Basada en preguntas de examen».
2. **Voz de estratégia de prova no texto do aluno** (G0 §142; MANUTENCAO 8-A.6-A): 14 caixas «Lo que más cae de este bloque», «Dato que más cae», «Detalle que se pregunta», «¿Qué se pregunta?», «lo que la cátedra pide/quiere», «el examen elige/usa/cruza/construye…», «se pregunta(n)». Era o mesmo defeito corrigido em Farmacología II.
3. As fotos de 19/09 parecem um **banco de estudo** numerado 1–30 de que a prova de 16/09 tirou seus 8 MCQ; proveniência a confirmar com José.

## 2 · O que foi alterado

`fisiopatologia-ii.html` — **77 trocas pontuais em 52 frases** (a mesma frase aparece no bloco e no espelho do banco), todas por reescrita **dentro** do parágrafo; nenhum parágrafo/elemento foi criado, fundido ou removido:

* 14× cabeçalho «Lo que más cae de este bloque» → «**Puntos a dominar de este bloque**» (as barras de peso continuam e continuam ordenadas pelo espaço que a clase dedica ao ponto); 1 introdução que citava «las preguntas con las que cierra la clase» → «el detalle con que se desarrolla en la clase»;
* cabeçalhos de tabela: «Dato que más cae» → «Dato clave»; «Detalle que se pregunta» → «Detalle clave»; «¿Qué se pregunta?» → «¿Qué hay que saber?»;
* frases tipo «el examen elige/usa/cruza/mezcla/construye sus distractores/espera…», «lo que más se pregunta», «la cátedra pide/quiere…», «material de examen», «suelen convertirse en enunciado» → versão didática neutra, **mantendo o conteúdo científico e o aviso do que é fácil de confundir**.

Tabela completa antes → depois (texto sem tags):

| antes | depois |
|---|---|
| Lo que más cae de este bloque | Puntos a dominar de este bloque |
| y por las preguntas con las que cierra la clase. | y por el detalle con que se desarrolla en la clase. |
| La cátedra pide además el retrato del paciente típico y la conducta, dos cosas que suelen faltar | Además del cuadro histológico conviene tener el retrato del paciente típico y la conducta, dos cosas que suelen faltar |
| Las tres confusiones que más caen, juntas: | Las tres confusiones más frecuentes, juntas: |
| La cátedra pide el matiz: transitoria y vagal. | El matiz que importa: transitoria y vagal. |
| Tres números en la misma frase y el examen elige uno: | Tres números en la misma frase, y conviene no mezclarlos: |
| Y la cátedra pide distinguir tres variedades por su nombre propio: | Y conviene distinguir tres variedades por su nombre propio: |
| En el examen es un término histológico: sin inflamación, no es gastritis. | Es un término histológico: sin inflamación, no es gastritis. |
| Es un detalle fino y muy preguntado: los | Es un detalle fino: los |
| no son sinónimos, y el examen usa esa diferencia todo el tiempo. | no son sinónimos, y esa diferencia pesa en todo el bloque. |
| del mismo germen, y el examen los intercambia. | del mismo germen, y es fácil intercambiarlos. |
| 15 · La comparación que decide el examen | 15 · La comparación que lo ordena todo |
| y el examen usa las dos mitades: la genética | y hay que sostener las dos mitades: la genética |
| de leve a grave, y el examen las cruza. | de leve a grave, y es fácil cruzarlas. |
| los tres hallazgos que se preguntan juntos: | los tres hallazgos que van juntos: |
| Lo que sigue es lo que la cátedra pide saber además de la descripción anterior: | Lo que sigue completa la descripción anterior: |
| Dato que más cae | Dato clave |
| Detalle que se pregunta | Detalle clave |
| ¿Qué se pregunta? | ¿Qué hay que saber? |
| Ésa es la asimetría que se pregunta | Ésa es la asimetría que importa |
| Son los dos datos que se preguntan siempre. | Son los dos datos centrales. |
| son dos circuitos distintos que el examen cruza. | son dos circuitos distintos que suelen confundirse. |
| Lo que la cátedra quiere enseñar — | Lo que enseña la cátedra — |
| Respondé lo que pide la cátedra, y guardá el matiz: | Quedate con la versión de la cátedra, y guardá el matiz: |
| porque el examen los mezcla. | porque se mezclan con facilidad. |
| Esa es la pregunta que el examen hace cuando te da un nefrótico con una trombosis de vena renal y espera que digas «antitrombina III». | Esa es la pregunta clínica ante un nefrótico con una trombosis de vena renal: la respuesta es «antitrombina III». |
| Y es la respuesta que el examen espera cuando da una trombosis de vena renal. | Y es la respuesta ante una trombosis de vena renal en un nefrótico. |
| porque el examen las contrasta: | porque se contrastan: |
| Y esas asociaciones son las que más se preguntan porque permiten | Y esas asociaciones son las más útiles porque permiten |
| y ahí es donde el examen construye sus mejores distractores. | y ahí es donde más se confunden. |
| Es el cruce que más se pregunta de los dos bloques, y siempre por los mismos ejes. | Es el cruce central de los dos bloques, y siempre se hace por los mismos ejes. |
| es el atajo temporal que más se pregunta: | es el atajo temporal más útil: |
| Dos matices que se preguntan: | Dos matices importantes: |
| Es una frase que el examen invierte con facilidad. | Es una frase que se invierte con facilidad. |
| es exactamente el tipo de detalle que se pregunta: | es exactamente el tipo de detalle que se pasa por alto: |
| La clase insiste en un punto de anatomía funcional que es la clave | Hay un punto de anatomía funcional que es la clave |
| que suelen convertirse en enunciado. | que suelen pasar inadvertidas. |
| los tres detalles de esa fila son los que suelen convertirse en enunciado. | los tres detalles de esa fila son los que más conviene retener. |
| Y la regla que se pregunta: | Y la regla práctica: |
| La segunda, y es la que más se pregunta: | La segunda, y la más importante: |
| Ese porcentaje es de los datos más preguntados del tema. | Ese porcentaje es de los datos más reveladores del tema. |
| porque el enunciado de examen suele darlo por hecho: | porque suele darse por hecho: |
| Este es el apartado más mecanístico del bloque y el que más se pregunta. | Este es el apartado más mecanístico del bloque. |
| es característico y suele aparecer en los enunciados. | es característico. |
| mecanismos distintos y los dos se preguntan. | mecanismos distintos y los dos importan. |
| que es el resumen que se pregunta: | que es el resumen del bloque: |
| porque el examen las cruza. | porque se confunden con facilidad. |
| y los tres son material de examen: | y los tres importan: |
| una pareja que se repite en los enunciados: | una pareja que se repite en la clínica: |
| porque las dos se preguntan. | porque las dos importan. |
| Las dos alteraciones se preguntan enfrentadas, y siempre | Las dos alteraciones se estudian enfrentadas, y siempre |
| las tres cosas que la matriz no dice y se preguntan igual. | las tres cosas que la matriz no dice y que también importan. |

**Mantido de propósito:** rótulos de proveniência («Basada en preguntas de examen»), «Trampa clásica» (aviso didático), usos médicos de «examen» (físico, de orina, del sedimento), «el enunciado…» dentro de explicações de questão, e as notas de transparência sobre a chave da cátedra (`b03q28`, caso clínico de `b12`).

## 3 · Testes (browser real, harness da PR #474 adaptado à matéria)

| verificação | resultado |
|---|---|
| Sequência `SUB_SEL` por seção = `origin/main`; 733 ids na mesma ordem | ✅ 0 seções alteradas |
| Quiz em navegador: 558 MCQ (clique certo/errado), V/F, abertas, gêmeos bloco↔banco (319 pares) | ✅ **0 falhas duras**, 0 avisos |
| Flashcards: 16 mazos / 1 857 cartas | ✅ |
| Grifos (motor real, marcações **simuladas**): texto não alterado em elementos tocados | ✅ 110/110 recuperados; controles 660/660; **0 em lugar errado** (simulado) |
| Grifos sobre as frases reescritas (96 registros **simulados**) | ⚠️ **não voltam** sem remapeamento; **grifos reais: preservação NÃO comprovada** |
| Tinta em elemento (4 larguras: 390, 768, 1024, 1440): âncoras com texto e caixa idênticos | ✅ 8 323 de 8 399 (99,1 %); as 76 reescritas ficam no parágrafo, Δh ≤ 28,5 px |
| Tinta ancorada à seção (figuras): mediana 0 px, p90 ≤ 16 px, máx. ≤ 28,5 px | ✅ |
| Δ de altura do banco geral | ✅ 0 px |

## 4 · Limites e pendências do checkpoint 1

* **Não feitos nesta etapa (objetivos do #101):** comparação do resumo com os **6 decks atuais da cátedra** e marcação de «complementar» (objetivos 8–9); **redução de densidade/prosa** (10); **infográficos/resumões** (12); abrir o ZIP de 4,5 MB; confirmar a proveniência do banco de 19/09.
* A **única questão nova** (`b13q19`) está pronta mas **não aplicada** por custo de tinta no banco (1 357 âncoras): decisão do José (ver `…-fotos-v2.md` §5).
* Grifos reais lidos em consulta somente leitura (47/47 sobrevivem — §7-C); **não há nenhum traço de tinta real** desta matéria; caneta física e sincronização não testadas; o parecer didático G0 independente ainda não foi pedido para esta matéria.

## 5 · Precisa de revisão humana

1. Aceitar ou não inserir `b13q19` (e como tratar a tinta do banco).
2. Conferir se «Puntos a dominar de este bloque» agrada como título e se as barras de peso devem permanecer.
3. Proveniência do banco de 19/09 e ZIP.


---

# Checkpoint 2

## 6 · Infográficos: voz G0 também dentro das figuras

**SVG (75 figuras no HTML) — 39 trocas de texto**, sem mudar tamanho/posição das figuras: «DIFERENCIAS CLAVE · ES DONDE EL EXAMEN BUSCA EL ERROR» (11×) → «DIFERENCIAS CLAVE · DONDE MÁS SE CONFUNDEN»; «LO QUE RESUELVE LA PREGUNTA» (12×) → «LA CLAVE PARA DECIDIR» e os textos que diziam «si el enunciado insiste…» / «el examen no suele preguntar…» / «en una pregunta de opción múltiple» viraram linguagem clínica («si predominan…», «ante un signo aislado…», «el horario del dolor orienta la localización antes de pedir la endoscopia»); «LO QUE MÁS CAE» → «LO QUE HAY QUE DOMINAR»; «CÓMO SEPARARLOS EN EL EXAMEN» → «CÓMO SEPARARLOS»; «Detalle que se pregunta» → «Detalle clave» (3×); `aria-label` de 2 figuras. Texto de SVG não é grifável (o motor o ignora).

**Rasters (33 `.webp`) — revisados um a um à vista.** Três continham «**CLAVES DE EXAMEN**» (`bloco-10-02`, `bloco-11-02`, `bloco-11-03`): o rótulo foi refeito para «CLAVES PARA RECORDAR» (fundo repintado, mesma cor/tamanho de letra) e salvo como **`…-v2.webp`** — arquivo novo porque o Netlify cacheia `/assets/img/**` por muito tempo; o `src` no HTML foi trocado e os originais ficam (não apaguei asset). **Não alterei** os rasters que dizem «ALTO RENDIMIENTO» (`bloco-01-01`, `03-03`, `05-03`, `07-01`, `07-02`, `08-01`, `09-03`): é jargão de prioridade, não cita prova nem cátedra; se José quiser, troco pelo mesmo processo. As insígnias «BLOQUE 10/11» dos rasters `bloco-10-*`/`bloco-11-*` (a ordem de leitura é 13/14) continuam explicadas por uma nota no texto.

## 7 · Grifos: os 96 afetados — **o que está e o que NÃO está provado**

> **Atualização de 12/10:** com a consulta somente leitura dos registros reais (§7-C), **47 de 47 grifos reais sobrevivem** sem remapeamento — nenhum cai nas 52 frases reescritas. O texto abaixo é o estado anterior (só marcações simuladas) e vale como risco para grifos **futuros**.
>
> **Estado (correção da rodada 3):** a preservação dos grifos **reais** dos alunos **não está comprovada**. Tudo o que foi medido usa marcações **simuladas**, fabricadas por mim a partir do próprio texto da matéria no formato que o motor grava. Isso prova que a ferramenta consegue casar texto antigo → novo; **não prova** que os grifos de alunos reais voltarão, nem que ainda fazem sentido depois da troca. Enquanto ninguém rodar o remapeamento sobre uma exportação real **e** escrever o resultado no banco (o que não fiz e não faço sem autorização), **os grifos feitos sobre as 52 frases reescritas deixam de ser pintados** (continuam guardados no banco, nada é apagado; o aluno pode marcar de novo).

**Diagnóstico:** o motor (`rm-tools.js`, nível 1: texto exato dentro da seção; nível 2: ignora pontuação/maiúsculas/acentos, exige contexto) **não** recupera um trecho cujas palavras mudaram — é por desenho («melhor não pintar do que pintar no lugar errado»). Sem mexer no motor (JS global é proibido) e sem ocultar texto, há dois caminhos: (1) mudar menos texto — já feito: só 52 frases, dentro de parágrafos, e a ciência intacta; (2) **remapear os registros** guardados.

**Ferramenta nova** — `tools/qa/browser-qa/fisiopatologia-ii-2026-10/remap-highlights.cjs`: compara a matéria antiga (`origin/main`) e a nova **no próprio motor do site**, pareia os elementos por índice, diferencia por palavras e reescreve `exact_text/prefix/suffix` das marcações (nunca encolhe nem muda de lugar; recalcula os 40 caracteres de contexto). Entrada/saída = JSON; **não toca em Supabase nem em dados de aluno** — quem tem a exportação (José) a roda, confere o relatório e só então atualiza os registros.

**Prova de conceito com marcações SINTÉTICAS (4 692, motor real) — não é evidência sobre grifos de alunos:**

| grupo | sem remapear | **com remapear** | no lugar errado |
|---|---|---|---|
| frases inteiras de elementos alterados (166) | 87 voltam | **166 (100 %)** | 0 |
| janelas de 5 palavras de elementos alterados (1 096) | 865 | **1 096 (100 %)** | 0 |
| controles intactos (3 428) | 3 428 | 3 428 | 0 |

(Dois itens «mal colocado»/não recuperado nos testes são alternativas de quiz — `li` de opção, que o motor não indexa e nenhum aluno consegue grifar.) Medido no teste de recuperação tradicional (frases inteiras, sem remapear): texto intacto 121/121 e controles 654/654 voltam; as 103 frases reescritas só voltam **depois** do remapeamento. **Correção da ferramenta (rodada 3):** o mesmo teste, rodado na matéria de Farmacología II (PR #474), achou dois defeitos em `remap-highlights.cjs` — pares de inserção com pouco contexto casavam em qualquer parágrafo e corrompiam marcações de texto intacto, e os pares eram aplicados em cascata. Corrigido aqui também (cada marcação é localizada na matéria antiga e só recebe os pares do seu elemento; os pares casam simultaneamente no texto original). Nova rodada sintética em Fisiopatología II: frases 166/166, janelas 1 096/1 098 (as 2 restantes são alternativas de quiz), **0 em posição errada, 0 controles tocados** (464 + 2 964).

**Limites (o que a simulação não cobre):** (1) as marcações são geradas **a partir do texto atual**, sempre dentro de um único elemento, com contexto de 40 caracteres perfeito — marcas reais podem ter sido feitas sobre texto que já mudou em edições anteriores, cobrir dois elementos, cortar palavra ao meio ou colidir com outra ocorrência; (2) «100 %» mede só que o motor volta a **encontrar** o trecho novo, não que o aluno **ainda queira** grifar o trecho trocado; (3) o formato dos registros reais (campos, versões antigas, notas e glossário) não foi inspecionado — uma leitura no Supabase foi negada e **não foi contornada**; (4) aplicar o remapeamento significa **escrever** em `user_highlights`, fora do escopo e proibido nesta tarefa; (5) cada novo texto altera os pares, então o remapeamento só vale rodado com o head final. **Antes de qualquer uso real:** rodar sobre exportação real, conferir uma amostra por humano e só então decidir a escrita (decisão do José).

### 7-B · Protocolo de preservação e livro-razão (rodada 5)
Antes de reescrever mais frases: aditivo primeiro; toda substituição entra no livro-razão (`hl-ledger.cjs`; portão com código 1); migração real só em 5 passos e **só com você** (exportar + backup → simulação a seco → conferência pelo motor → amostra humana → escrita). Livro-razão hoje (sintético): 81 frases em risco (79 + 2 do ajuste de b13q09 de 13/10), 81 verificadas, 0 sem remap. Detalhe: `fisiopatologia-ii-issue101-anotacoes-v1.md` §3 e `farmacologia-ii-revisao-2026-10-protocolo-grifos-v1.md` (PR #474). **Enquanto houver grifos reais que possam sumir, não peço merge.**


### 7-C · Grifos REAIS — consulta somente leitura (12/10/2026)
Método: `SELECT block_id, exact_text, prefix, suffix, occurrence FROM user_highlights WHERE subject_slug = 'fisiopatologia-ii'` (sem `user_id`; nenhuma escrita; os registros ficam fora do repositório). Cada registro é resolvido pelo **motor real** (`RMTools.resolverAncora`) na matéria **antiga** (controle: se não resolve na `main`, não conta) e na **nova**, e comparado no mesmo elemento (`hl-real.cjs`).

| registros reais | resolvem na `main` (controle) | **sobrevivem na versão nova sem remap** | só com remap | perdidos |
|---:|---:|---:|---:|---:|
| 47 (fp2b01: 42 · fp2b02: 4 · fp2b12: 1) | 47 | **47** | 0 | 0 |

Leitura: **hoje nenhum dos 47 grifos reais cobre as 52 frases reescritas** (elas estão em outros blocos); o texto novo não derruba nenhum deles. Este é o resultado que faltava na rodada 3 (ali só havia marcas simuladas). Limites: (1) são os registros que existiam no momento da consulta — qualquer aluno pode grifar uma das 52 frases (ou as outras) **antes do merge**; por isso o `hl-real.cjs` deve ser **rodado de novo logo antes do merge**, e o livro-razão (79 frases, 79 verificadas) continua a ser a rede de segurança; (2) a tabela de traços de tinta (`user_ink_strokes`) não tem nenhum traço desta matéria; (3) a consulta cobre a tabela do projeto do site; não há como saber se algum aluno guarda grifos só no navegador (`localStorage`).

### 7-D · Tinta em posição REAL depois das edições (12/10)
Harness da #474 portado (`real-ink.test.cjs`, caneta real emulada por CDP, servidor simulado em memória, 0 escritas): 100 traços por largura desenhados na `main` e repintados na versão do checkpoint 2 (`ed08884e`) e no head atual.

| largura | âncoras (elemento / seção) | todos: p50 / p90 / máx. (px) | no mesmo item | Banco/seção (n) p50 / máx. | blocos p90 / máx. |
|---|---|---|---|---|---|
| 390 | 97 / 3 | 0,1 / 0,1 / 72,1 | 95 de 100 (base: 97) | — (0 alvos) | 26,3 / 72,1 |
| 768 | 95 / 5 | 0 / 0,3 / 12,7 | 99 de 100 (base: 99) | 4,2 / 12,7 (4) | 0,3 / 1,8 |
| 1024 | 89 / 11 | 0 / 2 / 14,1 | 100 de 100 | 8 / 14,1 (8) | 0,1 / 3,5 |
| 1440 | 92 / 8 | 0 / 0,1 / 2,9 | 100 de 100 | 1,8 / 2,9 (7) | 0,1 / 0,3 |

Leitura: as 4 adições do checkpoint 3 **não mudam** nada em relação ao checkpoint 2 (390, 768 e 1440 idênticos; 1024: p90 0,5 → 2 px, máx. igual). O desvio máximo (72 px a 390) vem das reescritas do checkpoint 1, em blocos; 5 dos 100 traços caem em outro item a 390 px (3 já na base: ruído do teste). Os traços ancorados à seção no Banco ficam a ≤ 14 px. Limite: o Banco desta matéria tem poucos enunciados ancoráveis por seção (4–8 por largura nesta amostra).

### 7-E · Acréscimos e seus espelhos
As 4 adições (Crohn: absceso/fístula/perforación libre; espasmo difuso: causa na literatura; sialosis: terminologia; ranitidina: retirada em 2020) estão em **parágrafos de teoria** e não têm cópia no Banco nem nos mazos (bloco ↔ banco: 319 pares, 0 divergências). Há reapresentações que **mantêm de propósito** a definição da cátedra: tabela «Sialosis = inflamação das glândulas salivais», alternativa d) e explicação do quiz, e mazo «Los siete términos del esófago» (3 cópias idênticas); a explicação do quiz de espasmo difuso repete «degeneración de los axones del plexo de Auerbach» (a teoria agora diz explicitamente que é a explicação da cátedra). Não os alterei: a ressalva fica no ponto onde o termo é ensinado e mexer nas cópias criaria divergência com o que o aluno será cobrado.

### 7-F · Parecer G0 independente (13/10) e voz de prova que sobra
Um revisor separado (só leitura; G0 e 8-A.6 lidos) comparou os 116 nós de texto alterados (58 únicos, bloco + Banco). **Veredito: aprova com ajustes.** Feito nesta rodada (só no que a própria PR escreveu): Crohn passa a «estenosis, absceso, fístula e, menos frecuente, perforación libre» (sem a simplificação agudo/crônico); espasmo difuso «permite que el músculo se contraiga sin la pausa…»; ranitidina «la famotidina sigue siendo la más usada»; b13q09: alternativa **b** sem o absoluto «sólo» (era o distrator eliminável), refutação b) coerente, bloco e Banco idênticos, gabarito **c) inalterado**. Os 5 acréscimos foram julgados cientificamente corretos.

**Não feito, por decisão de escopo** (a instrução desta rodada é não reescrever texto só por estilo e cada frase reescrita aumenta a exposição a grifos novos): a voz de prova que o revisor encontrou **já existia na `main` e a PR não a tocou** — 6 «preguntable(s)», 3 «más rinde» no sentido de rendimento em prova, 1 «La pregunta casi nunca es…», 1 heurística de teste («cuando una alternativa usa un número correcto…»), vários «el enunciado suele/elige…» e o rótulo «Trampa clásica» (638, o mesmo número da `main`). Também: os cabeçalhos padronizados novos («Puntos a dominar de este bloque», «La clave para decidir») se repetem de bloco em bloco, o que a G0 §2 reprova; o revisor sugere variar e trocar «dominar». **Esta PR, portanto, NÃO afirma ter removido toda a voz de prova da matéria**: removeu as 52 frases e 39 textos de figura listados e deixou a lista acima para uma próxima rodada (cada item é uma frase isolada; verificar antes se há grifo real — hoje os 47 existentes estão todos em fp2b01/02/12). A tabela de vocabulário continua com a definição da cátedra de sialosis e o glossário traz a ressalva: tensão conhecida e documentada.

## 8 · Slides atuais, complementar, densidade

Detalhe em `fisiopatologia-ii-issue101-slides-v1.md`: 132 fatos dos 6 decks verificados contra o resumo — **1 lacuna real** (ginecomastia/vello na cirrose avançada), corrigida com uma frase; b13/b14 seguem os slides e não precisam de marcador «Complemento» (os 22 existentes em b01–b04 ficam); b05–b12 sem decks no pacote. Densidade: nenhum parágrafo > 130 palavras e quase nenhuma repetição relevante; os únicos cortes possíveis (instruções de figura repetidas, notas da insígnia 10/11) removeriam elementos e deslocariam a tinta — **não aplicados**.

## 9 · Questão do MCQ 3 sem deslocar tinta

`b13q19` **não** foi inserida. O conteúdo foi incorporado **no lugar** a `b13q09` (+ espelho): alternativa certa e distrator **d** agora cobrem «Crigler-Najjar I = ausência total da enzima, ictericia grave, sobe a **não conjugada**»; alternativas **equilibradas** (104/91/135/135 caracteres; antes 98/97/190/72); `SUB_SEL` e os 733 ids **idênticos à main**; Δ de altura do item no Banco −24 / 0 / +23 / 0 px (390/768/1024/1440), medido por `<li>` com a CSS real. Ver `…-fotos-v2.md` §5.

## 10 · Testes do checkpoint 2 (browser real)

| verificação | resultado |
|---|---|
| `SUB_SEL` por seção e 733 ids vs `origin/main` | ✅ 0 seções alteradas |
| Quiz: 558 MCQ (clique certo/errado), V/F, abertas, 319 pares bloco↔banco | ✅ 0 falhas duras, 0 avisos |
| Flashcards: 16 mazos / 1 857 cartas | ✅ |
| Grifos sem remapear: texto intacto 121/121, controles 654/654, 0 em lugar errado; reescritas 103 não voltam | ✅/⚠️ |
| Grifos **com** remapear (prova de conceito **sintética**) | 🧪 100 % das marcas simuladas, 0 em lugar errado — **não comprova preservação de grifos reais** |
| Tinta em elemento (390/768/1024/1440): âncoras idênticas | ✅ 8 310 de 8 399 (98,9 %); as 89 reescritas ficam no parágrafo (Δh ≤ 28,5 px em ≥ 768; ≤ 118 px a 390) |
| Tinta de seção (figuras): mediana ≤ 3,7 px; p90 ≤ 26 px; máx. ≤ 49 px | ✅ |
| Δ de altura do Banco geral | ✅ −24 / −25 / −24 / −2 px (390/768/1024/1440) — uma linha |
| Guard local | ver PR |

## 11 · Ainda precisa de revisão humana / não feito

1. ~~Rodar `remap-highlights.cjs` sobre a exportação real~~ → **dispensado em 13/10:** os 47 grifos reais (reconsulta com *hash*: os mesmos de 12/10, 0 novos) sobrevivem no head sem remapeamento; para grifos futuros vale o aviso de marca pendente da PR #484 (ver o protocolo de grifos da #474, «Reconsulta de 13/10»: Fisiopatología II, pior caso hipotético 79 frases, 0 pintam, 16 blocos no aviso).
2. Decks de b05–b12; ZIP de 4,5 MB; proveniência do banco de 19/09.
3. «ALTO RENDIMIENTO» nos 7 rasters: manter ou trocar.
4. Cortes de repetições (instruções de figura, notas 10/11): exigem `data-rm-content-rev` ou nova insígnia nos rasters.
5. Parecer G0 independente da matéria (ainda não pedido) e infográficos/resumões do José (não localizados).
