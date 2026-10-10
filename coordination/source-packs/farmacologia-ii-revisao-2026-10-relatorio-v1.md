# Farmacología II · Revisão completa 2026-10 — Relatório final (documento interno)

> Agente: Claude 2 · tarefa `farmacologia-ii-revisao-completa-2026-10` · issue #67 · branch `claude/farmacologia-ii-revisao-completa`.
> Único arquivo de conteúdo alterado: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html`. Não houve alteração de CSS/JS global, nem merge, nem publicação.
> Documentos irmãos: `…-fontes-v1.md` (matriz das 8 anotações) e `…-questoes-v1.md` (auditoria de MCQ, perfil de prova, tabela por questão).

## 1 · O que foi encontrado

1. **Fontes (8 PDFs + Resumo P1):** 114 conceitos conferidos — 93 já ensinados, 11 lacunas reais, 8 erros **das anotações** (o site estava certo), 3 sem valor / duplicados. A cobertura já era alta (82 %).
2. **Um defeito científico real do site (E1):** o painel de antianginosos listava *nifedipino e amlodipino* sob «NO» e atribuía a **todas** as dihidropiridinas o aumento de mortalidade, enquanto a mesma tabela dava ao amlodipino indicação em angina estável/vasoespástica — contradição interna.
3. **Questões:** o viés de tamanho estava concentrado nas **complementares geradas** (a correta era a única mais longa em 62 de 81), não nas literais da prova. Perímetro real: **179 MCQ únicas**. A triagem inicial (347; 215 com a correta única mais longa) **duplicou espelhos do banco por diferenças de espaços**; a conferência independente atual dá 179 e **111** (não 215): o viés era cerca de metade do que se supunha. Errata registrada em `coordination/AUDITORIA-2026-10-09-EDITORIAL-E-PILOTO.md`.
4. **Voz de estratégia de prova no texto do aluno** (~200 ocorrências: «lo que más cae», «cae en prueba», «La cátedra insiste en…», «punto garantizado»), contra a G0 (§142) e 8-A.2-B/8-A.6-A.
5. Três dúvidas explícitas do aluno nas anotações sem resposta no texto: feocromocitoma α→β, ENaC, 11β-HSD.

## 2 · O que foi alterado (commits no arquivo da matéria)

| commit | conteúdo |
|---|---|
| `bf033355` | 97 MCQ únicas revisadas (194 itens com o espelho do banco): tamanho, distratores, explicações, letras |
| `30b8ef81` | voz G0: neutraliza ~200 referências a estratégia de prova (**commit isolado e reversível**) |
| `ed9ad11e` | editorial lote 1: E1–E10 |
| `67ef6a55` | **rastreabilidade do Guard**: 4 pontes `data-guard-previous-stem-sha1` (ticagrelor, bismuto; bloco + banco) e remoção dos 2 marcadores HSD2 obsoletos |
| `fb128de8` | correções achadas pelo teste real de quiz: #192 (explicação com letras antigas), #105, #43/#180 |
| `a0c457de` | ajustes do parecer G0 independente: E1 como «Complemento de la literatura», hiponatremia, Mg²⁺, ENaC, nitroglicerina, «conviene» 59→30, 9 questões |
| docs/QA | matriz de fontes, auditoria de questões, QA de navegador, erratum da auditoria geral, harness `tools/qa/browser-qa/farmaco2-2026-10/` |

### 2.1 Lacunas incorporadas (E1–E10)

| id | onde | o que entrou |
|---|---|---|
| E1 | b05 §9 (painel + tabela + comparação) | **correção científica**: mantém «Conforme la cátedra: NO» e acrescenta, como *Complemento de la literatura*, que o excesso de mortalidade é do nifedipino de ação curta e que o amlodipino (ação prolongada) não é «como toda DHP» |
| E2 | b05 §3.1 | três cartões que *explicam* o que separa angina instável / IAM sem ↑ST / IAM com ↑ST (antes só havia a figura) — corrige o erro da anotação (IAMSEST com «↑ persistente do ST») |
| E3 | b05 §7.7 | nitroglicerina SL/IV na angina instável com dor persistente |
| E4 | b01 §6.5 | cartões «quem aprieta / quem afloja» → por que α antes de β (dúvida do aluno) |
| E5 | b02 §9 | mecanismo da hipercalcemia da tiazida (NCC → Na⁺ intracelular ↓ → trocador Na⁺/Ca²⁺ + canal apical) |
| E6 | b02 §10 | poupadores retêm K⁺ e H⁺ e **reduzem a perda de Mg²⁺** (a anotação dizia «Ca²⁺ e Cl⁻», que não se sustenta) |
| E7 | b03 §6.5 | hiponatremia como RAM do IECA (linha na tabela; rara, sobretudo em idosos, com depleção de volume ou tiazida) |
| E8 | b03 §4.2, §12 | lercanidipino; nifedipino de liberação prolongada na gestação |
| E9 | b07 §3 | 11β-HSD1 vs HSD2; prednisona = profármaco (hepatopatia → prednisolona) |
| E10 | b07 §9 | liga MR → ENaC / Na⁺/K⁺-ATPase (dúvida do aluno) |

## 3 · Cinco trechos antes → depois

**① E1 — painel de dihidropiridinas (b05 §9).**
*Antes:* «🚫 Dihidropiridinas · nifedipino y amlodipino — Conforme la cátedra: NO. … Aumentan la mortalidad en IAM reciente y en angina inestable» e, na tabela, «Amlodipino: Como toda dihidropiridina, aumenta la mortalidad en IAM reciente y angina inestable».
*Depois:* a frase da cátedra fica **como estava** e entra um complemento no mesmo parágrafo: «*Complemento de la literatura:* ese exceso de mortalidad se demostró con el nifedipino de acción corta. El amlodipino, de acción prolongada, no lo mostró y se acepta en la angina estable o vasoespástica, pero no es de primera línea en el cuadro agudo»; tabela: «La cátedra lo agrupa con las DHP: «NO» en IAM reciente y angina inestable; el exceso de mortalidade se describió con las de acción corta, no con él». *(Uma primeira versão reescrevia a posição da cátedra; o parecer G0 apontou e foi corrigida.)*

**② E4 — feocromocitoma (b01 §6.5).**
*Antes:* só a regra e a frase «se apaga la vasodilatación β₂… queda la vasoconstricción α sin oposición» (supõe que o leitor sabe que *bloquear* tira o que o receptor fazia).
*Depois:* mantém o texto e acrescenta três cartões — «El receptor α₁ aprieta… el β₂ afloja… Bloquear un receptor es quitarle al vaso lo que ese receptor hacía» / «Se frena primero al que afloja (β): sigue sola la orden de apretar… crisis» / «Se frena primero al que aprieta (α): el vaso se relaja…».

**③ E5 — tiazida e cálcio (b02 §9).**
*Antes:* «Aumentan la reabsorción de calcio → tienden a la hipercalcemia y reducen la calciuria.»
*Depois:* + «Por qué: al bloquear el NCC entra menos Na⁺ a la célula del túbulo distal; con poco Na⁺ adentro, el intercambiador Na⁺/Ca²⁺ basolateral saca calcio hacia la sangre con más facilidad y desde la luz entra más Ca²⁺ por su canal apical. La pérdida de volumen suma reabsorción proximal.» (A anotação simplificava «abre otro transportador»; o texto agora está correto.)

**④ Voz G0 — abertura de bloco.**
*Antes:* «Bloque 01 · dónde concentrar el estudio — Del análisis de los cuestionarios y de las pruebas ya aplicadas, este bloque se pregunta casi siempre por los mismos seis puntos. Las barras indican con qué frecuencia apareció cada tema en el material revisado.»
*Depois:* «Bloque 01 · puntos a dominar — Estos son los seis puntos de este bloque que más conviene dominar. Las barras marcan el peso relativo de cada uno.» Mesmo padrão em ~200 pontos («🧠 Muy preguntado» → «🧠 Clave», «El examen pone «100» entre las opciones…» → «Es fácil confundirlas justamente porque «100» es el número que se ve impreso mil veces en la etiqueta»).

**⑤ Questão complementar (b10, #150, TSH 15,3).**
*Antes:* correta (c) com 112 caracteres contra 35 / 21 / 28 nas outras — a única longa.
*Depois:* correta (c) 97 caracteres contra 89 / 84 / 89; os distratores passaram a ser plausíveis (b: «liotironina, cuya absorción no depende del pH…»; d: «T3… para acortar el tiempo de normalización») e a explicação refuta cada um.

## 4 · Cobertura preservada

* Nenhuma questão, flashcard, resumo, SVG ou id removido; **44 ids idênticos e na mesma ordem**.
* Blocos 428/428 quiz-items; flashcards 584 gerais + por bloco **inalterados**; banco ↔ blocos **0 divergências**.
* Cada correção da etapa 3 **acrescenta** (ou qualifica); só o painel E1 e a linha de tabela do amlodipino substituem uma afirmação — a anterior era cientificamente imprecisa.
* Matriz fonte→bloco→decisão→destino completa em `…-fontes-v1.md` (93 YA, 11 INC, 8 ERR, 3 NV/DUP).

## 5 · Annotation-safety — o que está demonstrado e o que **não** está (a afirmação «zero risco» foi retirada)

Invariante estrutural (necessário, **não suficiente**): a sequência dos elementos que ancoram a tinta (`p,li,h2–h5,table,figure,blockquote`) é idêntica à de `origin/main` nas 17 seções; 44 ids iguais; só `div` novos (cartões `f2-chain`) e uma `<tr>` dentro de uma tabela existente.
**Medição real** (motor do site em Chromium; detalhes e método em `…-qa-navegador-v1.md`):

* **Grifos:** frases inalteradas recuperam **597/597** (nível 1) e controles **296/296**, **0 em posição errada**; frases reescritas (336 registros) **não** voltam (316 não recuperadas, 20 por correspondência tolerante, nenhuma em lugar errado). Pesa **3,7 %** das frases da matéria.
* **Tinta em elemento (`seção>índice`):** 81 % das âncoras com texto e caixa idênticos → alinhamento **exato**; 19 % reescritas → o traço fica no parágrafo certo, mas reescalado (Δaltura mediana 0–24 px, p90 22–69 px, máx. ~180–205 px).
* **Tinta ancorada à seção** (enunciados `div.quiz-question`, figuras): **deslocamento real** — mediana 120–334 px, p90 289–809 px, máx. 346–957 px conforme a largura; o banco geral (f2b15) é o pior (+1,5 mil px a 1024 px; +9 mil px no celular).
* `data-rm-content-rev` **não** foi aplicado (orfanaria também os traços que hoje se alinham).

Risco para a tinta: **MÉDIO** (não zero), concentrado em (i) traços sobre enunciados/figuras, sobretudo no banco, e (ii) grifos/traços sobre frases reescritas. Decisão do José: aceitar, ou aplicar `data-rm-content-rev` só em f2b15.

## 6 · O que **não** foi feito (e por quê)

* **Fusão de repetições por remoção de parágrafos.** A mesma ideia aparece até quatro vezes (cálcio asa×tiazida em figura, trap, macete, f2-row e tabela; «lo esencial en cinco líneas», mapa e flashcards). Remover/fundir parágrafos **desloca a tinta** e exigiria `data-rm-content-rev` (decisão do José). Sem solução demonstrada, ficou só o corte *dentro* dos parágrafos (frases de estratégia). Proposta para José decidir: fundir cálcio (b02) e os cinco-linhas de b01/b02/b03 em uma nova revisão de conteúdo.
* **Reorganização de comparações em tabelas novas** — mesmo motivo; preferi `div.f2-chain` (fora do seletor da tinta).
* **Duplicata #114 × #133 (misoprostol, V/F, blocos 06 e 09)** — registrada, não apagada (8-A.9).
* **Erros das anotações** (8) não incorporados — registro em `…-fontes-v1.md` §3 para José orientar os alunos.

## 7 · QA técnico e semântico

| verificação | resultado |
|---|---|
| HTML parseia; 17 seções; nenhum id duplicado **novo** (1 já existia na main) | ✅ |
| SUB_SEL por seção = `origin/main`; 44 ids na mesma ordem | ✅ |
| Bloco ↔ banco (214 pares) | ✅ 0 divergências (também no teste de navegador) |
| Contagens (428 quiz-items, 876 flashcards, 79 SVG, 64 img) | ✅ iguais à main |
| **Guard local** `--base origin/main` | ✅ **PASSOU COM AVISOS**. *Correção:* na rodada anterior eu li só o fim da saída e **afirmei que não havia falhas; havia 2 (HARD FAIL)** — `questoes-removidas` (4 enunciados ampliados sem ponte) e `rename-enunciado-invalido` (marcadores HSD2 obsoletos). Corrigidos no `67ef6a55`. Avisos restantes: `enunciado-renomeado` (as 4 pontes), `gabarito-alterado` (#188, #192), `contagens` («214» declarado × 428 contados com espelhos — **pré-existente**), `registro-tarefas` (tarefa de Neurologia alheia) |
| Guard na `main` com uma alteração trivial no arquivo | 🔴 **já reprovava** (marcadores HSD2 da PR #386 obsoletos): defeito latente da main, resolvido aqui |
| **Quiz em navegador**: 358 MCQ (cliques certo/errado), 28 V/F, 42 abertas | ✅ 0 falhas duras (base e nova) |
| **Flashcards em navegador**: 29 mazos, 876 cartas (percorrer, girar, barajar, fechar) | ✅ 29/29 |
| Transposições #188 (b→c) e #192 (b→d): opções, explicações, espelhos | ✅ conferido; **#192 tinha um defeito real, corrigido** |
| Grifos e tinta nos trechos reescritos | ✅ medidos — ver §5 (risco MÉDIO, não zero) |
| **Parecer G0 independente** (revisor separado, G0 e 8-A.6/8-A.7 lidas) | ✅ feito: *aprova com ajustes* nos 3 grupos; ajustes aplicados em `a0c457de` (2 bloqueantes de questões — #59 e #168 — e 2 de ciência — hiponatremia e E1 — resolvidos); ver abaixo |
| Playwright de caneta física / sincronização Supabase | ❌ fora de escopo (nada foi tocado) |

**Parecer G0 (resumo).** Voz: adições seguem o tom do entorno; ressalva de fórmula repetida («conviene» 26→59 depois da minha neutralização) → reduzida a 30 e frases vazias/absolutas reescritas. Estratégia de prova: nenhuma frase restante expõe «se pregunta/cae en/cobra». Ciência: apontou (a) hiponatremia por IECA «na IC» sem respaldo (**corrigido**), (b) E1 reescrevia a posição da cátedra (**corrigido**), (c) «retienen Mg²⁺» forte demais (**corrigido**), (d) «impide que se fabriquen» (**corrigido**), (e) nitroglicerina sem ressalvas (**corrigido**), (f) α₂ pós-sináptico e clonidina em #25 (**corrigido**). Questões: #59 e #168 corrigidas; #91, #175, #167, #178, #160, #128 ajustadas. Pontos **não** adotados: acrescentar «cardiomiopatia por catecolaminas» como parágrafo (criaria `<p>`); resíduo de «clave» (10).

## 8 · Precisa de revisão humana

1. **Risco de tinta MÉDIO (§5):** decidir se se aplica `data-rm-content-rev` ao banco geral (f2b15) — ou se se aceita o desvio medido.
2. **Duas trocas de letra (#188, #192, b13):** resposta científica igual; o Guard exige aceite humano explícito (Lei 6).
3. **E1** mantém a regra da cátedra («DHP: NO») e acrescenta a nuance como complemento da literatura; confirmar que concorda com o texto.
4. **Neutralização G0** (commit `30b8ef81`): reversível isoladamente.
5. **#114 × #133** (misoprostol): duplicata registrada, não removida.
6. **Fusão de repetições** (exigiria `data-rm-content-rev`): não feita.
7. **Marcador HSD2**: removi os 2 `data-guard-previous-stem-sha1` obsoletos da PR #386 — confirmar que não há pareamento de auditoria externo que dependa deles.
8. 34 % das corretas ainda são a única mais longa (acaso ≈ 25–30 %); resíduo deliberado (originais preservados).

## 9 · Parecer final

**PARCIAL → bom, com risco de tinta MÉDIO declarado.** Ganhos: uma correção científica real (sem reescrever a posição da cátedra), respostas às três dúvidas dos alunos, mecanismos que faltavam, banco mais equilibrado (111 → 61 corretas únicas mais longas de 179; razão média 1,69 → 1,07), voz G0 restaurada, e **QA real**: quiz, flashcards, grifos e tinta medidos em navegador, com dois defeitos meus achados e corrigidos (#192; Guard). Limites: a tinta ancorada à seção e as frases reescritas **se deslocam/ não voltam**; a fusão de repetições ficou de fora; a caneta física e o Supabase não foram testados. **Não recomendo merge** antes de nova auditoria e da sua decisão sobre os itens acima.
