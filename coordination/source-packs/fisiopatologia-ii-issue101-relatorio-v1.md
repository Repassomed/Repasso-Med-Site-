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


---

# Checkpoint 2

## 6 · Infográficos: voz G0 também dentro das figuras

**SVG (75 figuras no HTML) — 39 trocas de texto**, sem mudar tamanho/posição das figuras: «DIFERENCIAS CLAVE · ES DONDE EL EXAMEN BUSCA EL ERROR» (11×) → «DIFERENCIAS CLAVE · DONDE MÁS SE CONFUNDEN»; «LO QUE RESUELVE LA PREGUNTA» (12×) → «LA CLAVE PARA DECIDIR» e os textos que diziam «si el enunciado insiste…» / «el examen no suele preguntar…» / «en una pregunta de opción múltiple» viraram linguagem clínica («si predominan…», «ante un signo aislado…», «el horario del dolor orienta la localización antes de pedir la endoscopia»); «LO QUE MÁS CAE» → «LO QUE HAY QUE DOMINAR»; «CÓMO SEPARARLOS EN EL EXAMEN» → «CÓMO SEPARARLOS»; «Detalle que se pregunta» → «Detalle clave» (3×); `aria-label` de 2 figuras. Texto de SVG não é grifável (o motor o ignora).

**Rasters (33 `.webp`) — revisados um a um à vista.** Três continham «**CLAVES DE EXAMEN**» (`bloco-10-02`, `bloco-11-02`, `bloco-11-03`): o rótulo foi refeito para «CLAVES PARA RECORDAR» (fundo repintado, mesma cor/tamanho de letra) e salvo como **`…-v2.webp`** — arquivo novo porque o Netlify cacheia `/assets/img/**` por muito tempo; o `src` no HTML foi trocado e os originais ficam (não apaguei asset). **Não alterei** os rasters que dizem «ALTO RENDIMIENTO» (`bloco-01-01`, `03-03`, `05-03`, `07-01`, `07-02`, `08-01`, `09-03`): é jargão de prioridade, não cita prova nem cátedra; se José quiser, troco pelo mesmo processo. As insígnias «BLOQUE 10/11» dos rasters `bloco-10-*`/`bloco-11-*` (a ordem de leitura é 13/14) continuam explicadas por uma nota no texto.

## 7 · Grifos: como preservar ou recuperar os 96 afetados

**Diagnóstico:** o motor (`rm-tools.js`, nível 1: texto exato dentro da seção; nível 2: ignora pontuação/maiúsculas/acentos, exige contexto) **não** recupera um trecho cujas palavras mudaram — é por desenho («melhor não pintar do que pintar no lugar errado»). Sem mexer no motor (JS global é proibido) e sem ocultar texto, há dois caminhos: (1) mudar menos texto — já feito: só 52 frases, dentro de parágrafos, e a ciência intacta; (2) **remapear os registros** guardados.

**Ferramenta nova** — `tools/qa/browser-qa/fisiopatologia-ii-2026-10/remap-highlights.cjs`: compara a matéria antiga (`origin/main`) e a nova **no próprio motor do site**, pareia os elementos por índice, diferencia por palavras e reescreve `exact_text/prefix/suffix` das marcações (nunca encolhe nem muda de lugar; recalcula os 40 caracteres de contexto). Entrada/saída = JSON; **não toca em Supabase nem em dados de aluno** — quem tem a exportação (José) a roda, confere o relatório e só então atualiza os registros.

**Demonstração (marcações sintéticas, 4 692, motor real):**

| grupo | sem remapear | **com remapear** | no lugar errado |
|---|---|---|---|
| frases inteiras de elementos alterados (166) | 87 voltam | **166 (100 %)** | 0 |
| janelas de 5 palavras de elementos alterados (1 096) | 865 | **1 096 (100 %)** | 0 |
| controles intactos (3 428) | 3 428 | 3 428 | 0 |

(Dois itens «mal colocado»/não recuperado nos testes são alternativas de quiz — `li` de opção, que o motor não indexa e nenhum aluno consegue grifar.) Medido no teste de recuperação tradicional (frases inteiras, sem remapear): texto intacto 121/121 e controles 654/654 voltam; as 103 frases reescritas só voltam **depois** do remapeamento. **Limite honesto:** os números são sintéticos; não consultei dados reais (acesso ao Supabase negado e não contornado). O remapeamento precisa rodar com o head final (cada novo texto muda os pares).

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
| Grifos **com** remapear (sintético) | ✅ 100 %, 0 em lugar errado |
| Tinta em elemento (390/768/1024/1440): âncoras idênticas | ✅ 8 310 de 8 399 (98,9 %); as 89 reescritas ficam no parágrafo (Δh ≤ 28,5 px em ≥ 768; ≤ 118 px a 390) |
| Tinta de seção (figuras): mediana ≤ 3,7 px; p90 ≤ 26 px; máx. ≤ 49 px | ✅ |
| Δ de altura do Banco geral | ✅ −24 / −25 / −24 / −2 px (390/768/1024/1440) — uma linha |
| Guard local | ver PR |

## 11 · Ainda precisa de revisão humana / não feito

1. Rodar `remap-highlights.cjs` sobre a exportação real de marcações (ou decidir não recuperar as ≈ 3 % afetadas).
2. Decks de b05–b12; ZIP de 4,5 MB; proveniência do banco de 19/09.
3. «ALTO RENDIMIENTO» nos 7 rasters: manter ou trocar.
4. Cortes de repetições (instruções de figura, notas 10/11): exigem `data-rm-content-rev` ou nova insígnia nos rasters.
5. Parecer G0 independente da matéria (ainda não pedido) e infográficos/resumões do José (não localizados).
