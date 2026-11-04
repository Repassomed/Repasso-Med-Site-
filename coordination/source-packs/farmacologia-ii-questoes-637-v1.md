# Farmacología II · issue #637 · questões relatadas por José em 04/11/2026

Autor: Claude 2 · Base: `main` `7299aa13` · Branch: `claude/farmaco2-issue-637-2026-11`
Regras: CLAUDE.md, G0, `MANUTENCAO-DIDATICA-REPASSO-MED.md` §8-A. Supabase só em leitura. Nenhuma fonte externa.

## 0 · Fontes e limites

| Fonte | Uso | Limite |
|---|---|---|
| Relato de José (issue #637), 10 itens numerados 1–5 e 7–11 (**o item 6 não veio no relato**) | enunciados parciais; **não é gabarito oficial** | vários enunciados terminam em «…»; a alternativa certa de 1, 3 e 4 não foi informada |
| `06 - SISTEMA RESPIRATORIO.pdf` (Drive `1nSKmR4r_Ee7L_Mo6iLSajfSPBw9E6iFH`, slide «SISTEMA_RESPIRATORIO 2026 actualizado», modificado 22/10) | texto lido integralmente hoje (`read_file_content`) | só texto extraído; figuras não conferidas como imagem |
| `05 - Antiinflamatorios esteroideos.pdf` (Drive `1VW6csyenswiW9Yyik35H5KiUPFG0q3Gm`) | texto lido na rodada de 29/10 (registro `farmacologia-ii-resumen-clases-2026-10-v1.md`); a página de hoje não mudou desde 22/10 | idem |
| Literatura base (Rang & Dale, Goodman, Katzung, Flórez…) | **não está no Drive** (busca por título retornou vazio, 04/11) | nada foi confirmado em livro; nada veio de fonte externa |
| Banco e blocos de `farmacologia-ii.html` (`f2b07` corticoides, `f2b08` respiratório, banco `f2b15`) | comparação de duplicatas (8-A.1) | — |

## 1 · Registro item → decisão → destino (8-A.1, 8-A.1-B)

Critério de duplicata: o **conhecimento exigido**, não o texto. «Um aluno que acertou a existente poderia errar a nova por não saber algo a mais?»

| # | Relato (resumo) | Cobertura já existente | Classificação | Decisão / destino |
|---|---|---|---|---|
| 1 | «El aumento de la … constituye otro mecanismo antiinflamatorio de la teofilina» | bloco 08 · «Sobre los mecanismos de la teofilina, señale la INCORRECTA» (opção d = IL-10; explicação cita a apoptose de granulócitos e linfócitos T); a página ensina os dois mecanismos (itens 3 e 4) | **DUPLICATA SEMÂNTICA** (as duas possíveis respostas já estão ensinadas e perguntadas) | Não inserida. **Pendência:** o relato não permite saber se o espaço era *liberação de IL-10* ou *apoptose*; no slide 06 só a apoptose consta (a IL-10 vem de fonte não presente no slide) |
| 2 | Cortisol → cortisona pela enzima … (11β-HSD2) | bloco 07 · «Aunque el cortisol circula en concentraciones mucho mayores…» (opção correta 11β-HSD2) | **DUPLICATA SEMÂNTICA** (mesma enzima, mesmo raciocínio; a existente é mais completa: discute 11β-HSD1, transcortina e o MR) | Não inserida; id existente preservado |
| 3 | Asma por exercício: terapia antiinflamatória complementar ao LABA … | só o cromoglicato é citado para exercício; **nenhuma pergunta** cobre antileucotrienos × asma por exercício | **NOVA** (conhecimento distinto), com ressalva | **Inserida como «Pregunta complementaria»** (bloco 08 e banco). O relato não traz a alternativa certa: ela poderia ser corticoide inhalado (já perguntado: «LABA solo no trata la inflamación») ou antileucotrienos. A pergunta nova usa o que o slide 06 sustenta («eficaces en la prevención del asma inducida por el ejercicio, similar a los LABA»; «terapia complementaria»), com enunciado que exclui a ambiguidade (já usa corticoide inhalado em dose baixa). **O gabarito do exame original não é determinável: pendente de José** |
| 4 | Inibidor oral seletivo de PDE4 na EPOC grave | bloco 08 · «completar»: «…inhibiendo selectivamente la ____» → roflumilast/PDE4 | **DUPLICATA SEMÂNTICA** | Não inserida. **Reformulação enriquecedora da existente (mesmo id/posição, bloco e banco):** a explicação agora diz EPOC **grave** (FEV₁ < 50 %), como o slide; resumo ajustado igual |
| 5 | Enzima cuja inibição é o passo inicial da ação antiinflamatória dos glicocorticoides | bloco 06 · «¿Cuál es la enzima cuya inhibición reduce la liberación de ácido araquidónico?» (fosfolipase A₂; explicação cita glicocorticoides, anexina-1) | **DUPLICATA SEMÂNTICA** | Não inserida |
| 7 | Anticolinérgicos broncodilatadores (a–d) | bloco 08 · «Respecto de los anticolinérgicos…» tem **outra** resposta certa (EPOC ≥ β₂) | **RELACIONADA MAS DISTINTA → NOVA** (a afirmação certa do relato —antagonizam a ACh: broncodilatação e **menor secreção de moco**— não era perguntada) | **Inserida** («Basada en preguntas de examen», reconstrução) |
| 8 | Agonistas β₂ (a–d) | LABA em monoterapia, RAM do salbutamol, não há pergunta de **mecanismo** | **NOVA** | **Inserida** (idem) |
| 9 | MgSO₄ na asma aguda grave | V/F «útil como broncodilatador adicional…» (indicação) | **RELACIONADA MAS DISTINTA → NOVA** (exige o mecanismo — ↓ Ca²⁺ citosólico — e descarta β₂/histamina/↑Ca²⁺) | **Inserida**; pedido «precisar contexto e evitar opção ambígua» atendido: a alternativa certa junta **indicação (niños y adultos, asma aguda grave) + mecanismo**; as erradas são uma só afirmação falsa cada |
| 10 | Xantinas: efeito que melhora a força respiratória | bloco 08 · «Sobre las xantinas… INCORRECTA» (contratilidade do diafragma, centro respiratório, ação diurética) | **DUPLICATA SEMÂNTICA** (mesmo núcleo: contratilidade diafragmática) | Não inserida. O resumo já ensina o aclaramento mucociliar e os 6 efeitos |
| 11 | Mineralocorticoide sintético na insuficiência suprarrenal («Gludrocortisona» = **fludrocortisona**) | bloco 07 · V/F «fludrocortisona… alta atividade mineralocorticoide» (+ V/F da HTA/alcalose hipopotassêmica) | **DUPLICATA SEMÂNTICA** | Não inserida. Grafia verificada no slide 05: *fludrocortisona* |
| 6 | (não veio no relato) | — | — | **Pendência de José:** enviar o enunciado |

Resultado: **4 perguntas novas** (3 «Basada en preguntas de examen» —reconstruções do relato, não transcrições literais— e 1 «Pregunta complementaria»), **1 explicação enriquecida** (roflumilast), **6 duplicatas** registradas, **2 pendências** (item 6; gabarito original dos itens 1 e 3).

## 2 · Verificação de cada pergunta nova nos slides atuais (8-A.5, 8-A.6)

| Nova | Resposta e distratores | Onde está no slide 06 |
|---|---|---|
| Anticolinérgicos (tipo exame, letra **a**) | certa: «los antimuscarínicos antagonizan estos efectos de la ACh, lo que resulta en broncodilatación y secreción de moco reducida» (via M₃–Gq–PLC–IP₃–Ca²⁺). Falsas: menos efetivos que β₂ no asma («en pacientes asmáticos… menos efectivos»); só inibem a broncoconstrição reflexa por ACh, não a de histamina/leucotrienos; a crise se trata com β₂ de ação curta | slides «Anticolinérgicos» e «Uso clínico» |
| β₂ (tipo exame, letra **d**) | certa: ocupam β₂ → Gs–adenililciclase–cAMP–PKA; «indirectamente… inhibir mediadores de broncoconstricción en células inflamatorias. Ej mastocitos»; «inhibición de la liberación de mediadores (efecto antiinflamatorio agudo)». Falsas: M₃/histamina; leucotrienos (montelukast); PDE4 (roflumilast) | slide «Beta-adrenérgicos o simpaticomiméticos» |
| MgSO₄ (tipo exame, letra **a**) | certa: «útil como broncodilatador adicional en niños y adultos con asma aguda grave… reduce las concentraciones citosólicas de Ca²⁺». Falsas: β₂ direto, ↑ histamina, ↑ Ca²⁺ | slide «Sulfato de magnesio» |
| Asma por exercício (complementar, letra **c**) | certa: antileucotrienos = terapia complementar; «efectivos en la prevención del asma inducida por el ejercicio, con una eficacia similar a la de los LABA». Falsas: roflumilast («no es tratamiento habitual del asma»), ipratropio (broncodilatador), omalizumab (asma grave selecionada) | slides «Antileucotrienos» e «Otros antiinflamatorios y terapias dirigidas» |

Letras certas das 4 novas: a · d · a · c (o banco tinha a 41, b 52, c 51, d 47: as novas aproximam o «a»; 8-A.7).

## 3 · O resumo ensina o que a pergunta cobra (8-A.2 · RESUMO ENSINA → QUESTÃO COBRA → EXPLICAÇÃO REFORÇA)

Três frases curtas, só com o que o slide diz, no bloco 08:
1. Anticolinérgicos: «Al antagonizar esa acción de la ACh, el resultado es broncodilatación y menor secreción de moco».
2. Sulfato de magnesio: uso **«en niños y adultos con asma aguda grave»** e mecanismo **«reduce el Ca²⁺ citosólico»** (antes: «crisis graves»/«antagoniza el calcio»).
3. Roflumilast: **EPOC grave** (FEV₁ < 50 %).
Já ensinados (sem mudança): β₂ → mastócito (mediadores), antileucotrienos × exercício e como terapia complementar, aclaramento mucociliar das xantinas.

## 4 · Onde entram (8-A.3) e contagens (8-A.10)

- Bloco `f2b08`: as 3 de tipo exame no fim de «Preguntas basadas en exámenes · Bloque 08» (depois do V/F do MgSO₄); a complementar no fim de «complementarias». Mesma ordem no **banco `f2b15`** (grupo 08), idêntica ao bloco (espelho verificado: 232 = 232, texto idêntico).
- Contagens declaradas: banco **228 → 232**; exame **132 → 135**; complementares **96 → 97**; grupo 08: **7·12 → 10·13**.
- Nenhuma pergunta/flashcard/id antigo removido ou renomeado; uma só explicação existente foi enriquecida (roflumilast), nas duas cópias.

## 5 · Grifos, traços, imagens (SELECT somente leitura, 04/11/2026)

`farmacologia-ii`: grifos em `f2b01` (85), `f2b02` (68), `f2b04` (17), `f2b05` (63), `f2b07` (6), `f2b08` (2), `f2b14` (2), `f2b15` (9); 1 traço (âncora `f2b00`); 0 notas. Os grifos de `f2b07` estão nos 1.º–2.º parágrafos (intro do cortisol); os de `f2b08`, em «neutrofílico» e «inflamación» (introdução); os de `f2b15`, na 1.ª pergunta do banco (atenolol). **Nenhum está em texto alterado** (as edições são nas frases do anticolinérgico, MgSO₄, roflumilast e em perguntas novas ao final das seções). Nenhuma imagem foi tocada.

## 6 · Testes
(ver o corpo da PR: preenchidos ao fim da bateria)

## 7 · Pendências para José
1. **Item 6** do relato: não chegou; enviar o enunciado (e alternativas, se lembrar).
2. **Itens 1 e 3**: o relato não informa a resposta; se José lembrar qual era (item 1: «liberação de IL-10» ou «apoptose»? item 3: corticoide inalado ou antileucotrienos?), a pergunta correspondente pode ser ajustada.
3. Literatura base fora do Drive: se José a disponibilizar, as explicações podem ser conferidas também no livro.
