# Fisiopatología II · Issue #101 · Relatório do checkpoint 1 (documento interno)

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
| Grifos (motor real): texto não alterado em elementos tocados | ✅ 110/110 recuperados; controles 660/660; **0 em lugar errado** |
| Grifos sobre as frases reescritas (96 registros) | ⚠️ **não voltam** (esperado: é o texto que a G0 manda trocar) |
| Tinta em elemento (4 larguras: 390, 768, 1024, 1440): âncoras com texto e caixa idênticos | ✅ 8 323 de 8 399 (99,1 %); as 76 reescritas ficam no parágrafo, Δh ≤ 28,5 px |
| Tinta ancorada à seção (figuras): mediana 0 px, p90 ≤ 16 px, máx. ≤ 28,5 px | ✅ |
| Δ de altura do banco geral | ✅ 0 px |

## 4 · Limites e pendências do checkpoint 1

* **Não feitos nesta etapa (objetivos do #101):** comparação do resumo com os **6 decks atuais da cátedra** e marcação de «complementar» (objetivos 8–9); **redução de densidade/prosa** (10); **infográficos/resumões** (12); abrir o ZIP de 4,5 MB; confirmar a proveniência do banco de 19/09.
* A **única questão nova** (`b13q19`) está pronta mas **não aplicada** por custo de tinta no banco (1 357 âncoras): decisão do José (ver `…-fotos-v2.md` §5).
* Sem acesso aos dados reais de tinta/grifos dos alunos; caneta física e sincronização não testadas; o parecer didático G0 independente ainda não foi pedido para esta matéria.

## 5 · Precisa de revisão humana

1. Aceitar ou não inserir `b13q19` (e como tratar a tinta do banco).
2. Conferir se «Puntos a dominar de este bloque» agrada como título e se as barras de peso devem permanecer.
3. Proveniência do banco de 19/09 e ZIP.
