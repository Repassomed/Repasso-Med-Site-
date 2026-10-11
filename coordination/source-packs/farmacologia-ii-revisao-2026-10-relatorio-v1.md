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
| `2c5c4f48` | **R2:** alternativas e cartões novos **neutros em altura** (tinta ancorada à seção / Banco); acréscimos E1–E10 encurtados |
| `1b137b3c` | **R2:** explicações **aditivas** — 32 cabeçalhos e fragmentos originais restaurados (com a letra nova em #188/#192) |
| `bcd870f4`, `10191e2f` | **R2:** duplicata #114 × #133 resolvida (#114 vira V/F de mecanismo, #133 canônica) + contadores declarados do banco (132/82; bloco 07: 4/7) |
| docs/QA | matriz de fontes, auditoria de questões, QA de navegador, erratum da auditoria geral, harness `tools/qa/browser-qa/farmaco2-2026-10/` |

### 2.1 Lacunas incorporadas (E1–E10)

| id | onde | o que entrou |
|---|---|---|
| E1 | b05 §9 (painel + tabela + comparação) | **correção científica**: painel com o título original e «Conforme la cátedra: NO»; a nuance entra **na própria frase** («en la literatura, sobre todo con el nifedipino de acción corta») e na célula do amlodipino («como grupo, “NO” en IAM reciente y angina inestable; el exceso de mortalidad es de las de acción corta, no del amlodipino») |
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
*Depois (rodada 2):* título e «Conforme la cátedra: NO» **idênticos aos originais**; o marcador fica «· **Aumentan la mortalidad** en IAM reciente y en angina inestable *(en la literatura, sobre todo con el nifedipino de acción corta)*»; célula do amlodipino: «Como grupo, «NO» en IAM reciente y angina inestable; el exceso de mortalidad es de las de acción corta, no del amlodipino»; comparação: «Neutro / DHP corta ↑ mortalidad».
*Fontes conferidas:* meta-análise de Furberg & Psaty (Circulation 1995: nifedipino de liberação imediata, RR 1,16 global e dose-dependente, 2,83 a 80 mg/dia); TRENT (neutro); SPRINT II (mais mortalidade precoce no braço nifedipino IR); bula norte-americana do nifedipino (advertência contra a forma IR em IAM/SCA); CAMELOT (amlodipino reduz eventos em DAC estável) e PRAISE-2 (mortalidade neutra na IC). *Não citei* diretriz de SCA (classe III/“harm”) porque não consegui verificá-la nesta sessão. O texto, portanto, **não** afirma que o amlodipino é “seguro” no IAM: só que o excesso de mortalidade documentado é da DHP de ação curta.

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

* **Grifos (rodada 2):** frases inalteradas recuperam **599/599** (nível 1) e controles **314/314**, **0 em posição errada**; frases reescritas (290 registros) **não** voltam (286 não recuperadas, 4 por correspondência tolerante, nenhuma em lugar errado). Pesa **3,2 %** das frases da matéria (antes 3,7 %); em janelas de 6 palavras, 2,54 % (antes 2,94 %). As **alternativas de quiz não são grifáveis** (o motor as ignora). A lista frase a frase das originais que deixaram de existir está em `…-rastreio-v1.md`.
* **Tinta em elemento (`seção>índice`):** 80,7 % das âncoras com texto e caixa idênticos → alinhamento **exato**; 19,3 % reescritas → o traço fica no parágrafo certo, mas reescalado (Δaltura mediana 0–24 px, p90 22–69 px, máx. 90–141 px).
* **Tinta ancorada à seção** (enunciados `div.quiz-question`, figuras): enunciados — mediana/p90/máx. (px), rodada 3: 390 px: **58/131/279** (rodada 2: 168/716/937) · 768: 30/73/108 · 1024: 28/68/101 · 1440: 35/73/124 (origem: mediana 117–334, p90 236–809, máx. 310–957); figuras 390: 34/163/246. Δ de altura do banco (f2b15): 1024 −580 px, 768 −769, 1440 −580 e **390 px (celular) +1 144 px** (rodada 2: +3 116; origem: +8 970). Mistura de alternativas A/B/O em 51 questões (§3.3 do QA).
* `data-rm-content-rev` **não** foi aplicado e **não é proposto como solução**: orfanaria também os traços que hoje se alinham.

Risco para a tinta: **BAIXO–MÉDIO** (não zero), concentrado em (i) traços sobre enunciados no **Banco em celular (390 px)** e (ii) grifos/traços sobre as ≈ 3 % de frases reescritas por necessidade científica ou da G0. Sem acesso aos dados reais dos alunos (leitura no Supabase negada; não contornada): os números são simulações com o motor real.

## 6 · O que **não** foi feito (e por quê)

* **Fusão de repetições por remoção de parágrafos.** A mesma ideia aparece até quatro vezes (cálcio asa×tiazida em figura, trap, macete, f2-row e tabela; «lo esencial en cinco líneas», mapa e flashcards). Remover/fundir parágrafos **desloca a tinta** e exigiria `data-rm-content-rev` (decisão do José). Sem solução demonstrada, ficou só o corte *dentro* dos parágrafos (frases de estratégia). Proposta para José decidir: fundir cálcio (b02) e os cinco-linhas de b01/b02/b03 em uma nova revisão de conteúdo.
* **Reorganização de comparações em tabelas novas** — mesmo motivo; preferi `div.f2-chain` (fora do seletor da tinta).
* **Erros das anotações** (8) não incorporados — registro em `…-fontes-v1.md` §3 para José orientar os alunos.

## 7 · QA técnico e semântico

| verificação | resultado |
|---|---|
| HTML parseia; 17 seções; nenhum id duplicado **novo** (1 já existia na main) | ✅ |
| SUB_SEL por seção = `origin/main`; 44 ids na mesma ordem | ✅ |
| Bloco ↔ banco (214 pares) | ✅ 0 divergências (também no teste de navegador) |
| Contagens (428 quiz-items, 876 flashcards, 79 SVG, 64 img) | ✅ iguais à main |
| **Guard local** `--base origin/main` | ✅ **PASSOU COM AVISOS**. *Correção:* na rodada anterior eu li só o fim da saída e **afirmei que não havia falhas; havia 2 (HARD FAIL)** — `questoes-removidas` (4 enunciados ampliados sem ponte) e `rename-enunciado-invalido` (marcadores HSD2 obsoletos). Corrigidos no `67ef6a55`. Avisos restantes: `enunciado-renomeado` (as pontes: ticagrelor, bismuto e #114 — 6 itens com os espelhos), `gabarito-alterado` (#188, #192), `contagens` («214» declarado × 428 contados com espelhos — **pré-existente**), `registro-tarefas` (tarefa de Neurologia alheia) |
| Guard na `main` com uma alteração trivial no arquivo | 🔴 **já reprovava** (marcadores HSD2 da PR #386 obsoletos): defeito latente da main, resolvido aqui |
| **Quiz em navegador**: 358 MCQ (cliques certo/errado), 28 V/F, 42 abertas | ✅ 0 falhas duras (base e nova) |
| **Flashcards em navegador**: 29 mazos, 876 cartas (percorrer, girar, barajar, fechar) | ✅ 29/29 |
| Transposições #188 (b→c) e #192 (b→d): opções, explicações, espelhos | ✅ conferido; **#192 tinha um defeito real, corrigido** |
| Grifos e tinta nos trechos reescritos | ✅ medidos — ver §5 (risco BAIXO–MÉDIO, não zero) |
| **Parecer G0 independente** (revisor separado, G0 e 8-A.6/8-A.7 lidas) | ✅ feito: *aprova com ajustes* nos 3 grupos; ajustes aplicados em `a0c457de` (2 bloqueantes de questões — #59 e #168 — e 2 de ciência — hiponatremia e E1 — resolvidos); ver abaixo |
| Playwright de caneta física / sincronização Supabase | ❌ fora de escopo (nada foi tocado) |

**Parecer G0 (resumo).** Voz: adições seguem o tom do entorno; ressalva de fórmula repetida («conviene» 26→59 depois da minha neutralização) → reduzida a 30 e frases vazias/absolutas reescritas. Estratégia de prova: nenhuma frase restante expõe «se pregunta/cae en/cobra». Ciência: apontou (a) hiponatremia por IECA «na IC» sem respaldo (**corrigido**), (b) E1 reescrevia a posição da cátedra (**corrigido**), (c) «retienen Mg²⁺» forte demais (**corrigido**), (d) «impide que se fabriquen» (**corrigido**), (e) nitroglicerina sem ressalvas (**corrigido**), (f) α₂ pós-sináptico e clonidina em #25 (**corrigido**). Questões: #59 e #168 corrigidas; #91, #175, #167, #178, #160, #128 ajustadas. Pontos **não** adotados: acrescentar «cardiomiopatia por catecolaminas» como parágrafo (criaria `<p>`); resíduo de «clave» (10).

## 8 · Precisa de revisão humana

1. **Risco de tinta BAIXO–MÉDIO (§5):** o desvio remanescente é o do Banco em 390 px (+1 144 px; enunciados p90 131 px) e as ≈ 3 % de frases reescritas; aceitar ou orientar nova redução. Sem `data-rm-content-rev`.
2. **Duas trocas de letra (#188, #192, b13):** resposta científica igual; o Guard exige aceite humano explícito (Lei 6).
3. **E1** mantém a regra da cátedra («DHP: NO») e acrescenta a nuance como complemento da literatura; confirmar que concorda com o texto.
4. **Neutralização G0** (commit `30b8ef81`): reversível isoladamente.
5. **#114 × #133** (misoprostol): resolvida — #133 canônica; #114 reformulada como V/F de mecanismo e **reclassificada** «complementaria» (contadores 132/82 atualizados). Confirmar o juízo.
6. **Fusão de repetições** (exigiria `data-rm-content-rev`): não feita.
7. **Marcador HSD2**: removi os 2 `data-guard-previous-stem-sha1` obsoletos da PR #386 — confirmar que não há pareamento de auditoria externo que dependa deles.
8. Corretas únicas mais longas: 111 → **34 de 179 (19 %)** — ligeiramente abaixo do acaso (≈ 25 %); não há pista de tamanho em nenhum sentido.
9. **Fonte externa de #188:** a bula FDA do aspart prevê 5–10 min **antes** da refeição; a janela «até 20 min depois» é da cátedra e a pergunta diz «según la cátedra».

## 9 · Parecer final

**PARCIAL → bom, com risco de tinta BAIXO–MÉDIO declarado.** Ganhos: uma correção científica real (sem reescrever a posição da cátedra), respostas às três dúvidas dos alunos, mecanismos que faltavam, banco mais equilibrado (111 → 34 corretas únicas mais longas de 179; razão média 1,69 → 1,01) e **neutro em altura** em 768–1440 px, voz G0 restaurada, e **QA real**: quiz, flashcards, grifos e tinta medidos em navegador, com dois defeitos meus achados e corrigidos (#192; Guard). Limites: a tinta ancorada à seção e as frases reescritas **se deslocam/ não voltam**; a fusão de repetições ficou de fora; a caneta física e o Supabase não foram testados. **Não recomendo merge** antes de nova auditoria e da sua decisão sobre os itens acima.
