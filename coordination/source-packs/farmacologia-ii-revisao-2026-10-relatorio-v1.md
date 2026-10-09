# Farmacología II · Revisão completa 2026-10 — Relatório final (documento interno)

> Agente: Claude 2 · tarefa `farmacologia-ii-revisao-completa-2026-10` · issue #67 · branch `claude/farmacologia-ii-revisao-completa`.
> Único arquivo de conteúdo alterado: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html`. Não houve alteração de CSS/JS global, nem merge, nem publicação.
> Documentos irmãos: `…-fontes-v1.md` (matriz das 8 anotações) e `…-questoes-v1.md` (auditoria de MCQ, perfil de prova, tabela por questão).

## 1 · O que foi encontrado

1. **Fontes (8 PDFs + Resumo P1):** 114 conceitos conferidos — 93 já ensinados, 11 lacunas reais, 8 erros **das anotações** (o site estava certo), 3 sem valor / duplicados. A cobertura já era alta (82 %).
2. **Um defeito científico real do site (E1):** o painel de antianginosos listava *nifedipino e amlodipino* sob «NO» e atribuía a **todas** as dihidropiridinas o aumento de mortalidade, enquanto a mesma tabela dava ao amlodipino indicação em angina estável/vasoespástica — contradição interna.
3. **Questões:** o viés de tamanho estava concentrado nas **complementares geradas** (a correta era a única mais longa em 62 de 81), não nas literais da prova. Perímetro real: **179 MCQ únicas** (a triagem falava em 347 — número que não bate com nenhuma contagem única do arquivo).
4. **Voz de estratégia de prova no texto do aluno** (~200 ocorrências: «lo que más cae», «cae en prueba», «La cátedra insiste en…», «punto garantizado»), contra a G0 (§142) e 8-A.2-B/8-A.6-A.
5. Três dúvidas explícitas do aluno nas anotações sem resposta no texto: feocromocitoma α→β, ENaC, 11β-HSD.

## 2 · O que foi alterado (3 camadas, 4 commits no arquivo)

| commit | conteúdo |
|---|---|
| `bf033355` | 97 MCQ únicas revisadas (194 itens com o espelho do banco): tamanho, distratores, explicações, letras |
| `30b8ef81` | voz G0: neutraliza ~200 referências a estratégia de prova (**commit isolado e reversível**) |
| `ed9ad11e` | editorial lote 1: E1–E10 |
| (este) | documentos internos |

### 2.1 Lacunas incorporadas (E1–E10)

| id | onde | o que entrou |
|---|---|---|
| E1 | b05 §9 (painel + tabela + comparação) | **correção científica**: o excesso de mortalidade é do nifedipino de ação curta; amlodipino (ação prolongada) não entra no quadro agudo mas não é «como toda DHP» |
| E2 | b05 §3.1 | três cartões que *explicam* o que separa angina instável / IAM sem ↑ST / IAM com ↑ST (antes só havia a figura) — corrige o erro da anotação (IAMSEST com «↑ persistente do ST») |
| E3 | b05 §7.7 | nitroglicerina SL/IV na angina instável com dor persistente |
| E4 | b01 §6.5 | cartões «quem aprieta / quem afloja» → por que α antes de β (dúvida do aluno) |
| E5 | b02 §9 | mecanismo da hipercalcemia da tiazida (NCC → Na⁺ intracelular ↓ → trocador Na⁺/Ca²⁺ + canal apical) |
| E6 | b02 §10 | poupadores retêm K⁺, H⁺ e **Mg²⁺** (a anotação dizia «Ca²⁺ e Cl⁻», que não se sustenta) |
| E7 | b03 §6.5 | hiponatremia como RAM do IECA (linha na tabela) |
| E8 | b03 §4.2, §12 | lercanidipino; nifedipino de liberação prolongada na gestação |
| E9 | b07 §3 | 11β-HSD1 vs HSD2; prednisona = profármaco (hepatopatia → prednisolona) |
| E10 | b07 §9 | liga MR → ENaC / Na⁺/K⁺-ATPase (dúvida do aluno) |

## 3 · Cinco trechos antes → depois

**① E1 — painel de dihidropiridinas (b05 §9).**
*Antes:* «🚫 Dihidropiridinas · nifedipino y amlodipino — Conforme la cátedra: NO. … Aumentan la mortalidad en IAM reciente y en angina inestable» e, na tabela, «Amlodipino: Como toda dihidropiridina, aumenta la mortalidad en IAM reciente y angina inestable».
*Depois:* «🚫 Dihidropiridinas · nifedipino de acción corta — Conforme la cátedra: NO en el cuadro agudo (IAM reciente, angina inestable). … Aumentan la mortalidad… así se vio con el nifedipino de acción corta. El amlodipino, de acción prolongada, no mostró ese exceso de mortalidad, pero tampoco tiene lugar en el síndrome coronario agudo»; tabela: «No se usa en el cuadro agudo…; el exceso de mortalidad se describió con las DHP de acción corta, no con él».

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

## 5 · Annotation-safety (invariante testado)

A tinta usa `secção>índice` sobre `p,li,h2,h3,h4,h5,table,figure,blockquote` dentro de `section[id]`. **Teste automatizado** (parser + comparação com `origin/main`): a sequência desses elementos por seção é **idêntica** nas 17 seções; ids idênticos. Para isso: texto editado no lugar; conteúdo novo só em `div` (cartões `f2-chain`); uma linha `<tr>` (E7) dentro de uma tabela já existente; **nenhum** `<p>/<li>/<table>` criado ou removido; `data-rm-content-rev` não foi tocado (decisão humana: orfanaria a tinta antiga). Destaques por `exact_text` nas frases reescritas podem perder o ancoramento exato — inevitável em qualquer correção de texto; sem escrita em banco.

## 6 · O que **não** foi feito (e por quê)

* **Fusão de repetições por remoção de parágrafos.** A mesma ideia aparece até quatro vezes (cálcio asa×tiazida em figura, trap, macete, f2-row e tabela; «lo esencial en cinco líneas», mapa e flashcards). Remover/fundir parágrafos **desloca a tinta** e exigiria `data-rm-content-rev` (decisão do José). Sem solução demonstrada, ficou só o corte *dentro* dos parágrafos (frases de estratégia). Proposta para José decidir: fundir cálcio (b02) e os cinco-linhas de b01/b02/b03 em uma nova revisão de conteúdo.
* **Reorganização de comparações em tabelas novas** — mesmo motivo; preferi `div.f2-chain` (fora do seletor da tinta).
* **Duplicata #114 × #133 (misoprostol, V/F, blocos 06 e 09)** — registrada, não apagada (8-A.9).
* **Erros das anotações** (8) não incorporados — registro em `…-fontes-v1.md` §3 para José orientar os alunos.

## 7 · QA técnico e semântico

| verificação | resultado |
|---|---|
| HTML parseia (lxml/bs4); 17 seções; ids únicos | ✅ |
| SUB_SEL por seção = `origin/main`; 44 ids na mesma ordem | ✅ |
| Bloco ↔ banco (214 pares: tag + alternativas + resposta) | ✅ 0 divergências |
| Contagens declaradas («214 comentadas», 133/81 etc.) | ✅ inalteradas |
| Letras do gabarito | ✅ 40/49/46/44 (maior corrida 4) |
| Render dos cartões E2/E4 e do painel E1 (Chromium, CSS do site) | ✅ capturas conferidas; rótulos sem maiúscula grega ambígua |
| Guard local (`tools.qa.guard`, execução local = informativa) | ✅ sem falhas; 🟡 avisos: `gabarito-alterado` (2 grupos: #188, #192 — ver §8), `contagens` («214» declarado vs 428 itens contados com os espelhos do banco: o texto conta questões únicas; não mudou), `registro-tarefas` (tarefa neurologia alheia a este PR) |
| Playwright do quiz (reveal/shuffle) e flashcards | ⚠️ **não executado** nesta rodada (verificação textual/estrutural apenas) |
| Revisão semântica (cada edição E1–E10 verificada contra Goodman & Gilman/ACC-AHA/ESC na etapa 1) | ✅ |
| Parecer G0 do especialista didático (Anthropic) | ⏳ **pendente** — Guard verde não aprova a G0 |

## 8 · Precisa de revisão humana

1. **E1** altera um dado que a cátedra ensina («DHP: NO»): mantive a regra da cátedra para o quadro agudo e qualifiquei o alcance. José deve confirmar que concorda com o recorte (nifedipino de ação curta vs. amlodipino).
2. **Neutralização G0 (commit `30b8ef81`)** — se José preferir manter alguma frase de estratégia, o commit reverte limpo.
3. **Duas trocas de letra (#188 e #192, ambas em b13):** a resposta científica não mudou (transposição de duas alternativas, explicações remapeadas, bloco e banco iguais), mas o Guard as sinaliza como «gabarito alterado» e a Lei 6 exige aceite humano explícito.
3b. **#114 × #133**; decisão de `data-rm-content-rev` para permitir a fusão de repetições.
4. 34 % das corretas ainda são únicas mais longas (acaso ≈ 25–30 %): resíduo deliberado (originais preservados) — ver questões §3.
5. Parecer didático da G0 sobre os trechos E2/E4 (tom e simplicidade).

## 9 · Parecer final

**PARCIAL → bom.** A matéria ganhou **uma correção científica real**, resposta às três dúvidas dos alunos, mecanismos que faltavam e um banco muito mais equilibrado (62 % → 34 % de corretas únicas mais longas; razão média 1,69 → 1,07), com a voz da G0 restaurada e **zero risco de deslocar tinta**. Não declaro «melhorou plenamente»: a fusão de repetições, o teste em navegador do quiz e o parecer G0 independente ficaram pendentes — por isso **não** recomendo merge sem a auditoria do ChatGPT e a decisão do José.
