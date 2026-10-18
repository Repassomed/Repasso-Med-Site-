# Fisiopatología II · revisão integral · outubro/2026 · v1

> Agente: Claude 2 · branch `claude/fisiopatologia-ii-issue101` · PR #481 · documento interno (não vai para a página do aluno).
> **A #484 já está mesclada e testada pelo José no iPad (16/10)**: a dependência dela, que o corpo da PR antiga citava, não existe mais.

## (i) Abertura direta (decisão do José, 16/10)
`fp2portada` (≈4 000 caracteres) virou `<section class="container" id="fp2portada" hidden></section>`: id preservado, sem título, fora do índice. Saíram: o cabeçalho «Repasso Med · 6.º semestre / Fisiopatología II», a frase de apresentação, «Estado de la asignatura» (14 bloques · 319 preguntas · 619 flashcards · 75 esquemas · 33 infografías), o mapa dos 14 blocos («la idea que lo organiza» / «lo que resuelve»), o parágrafo «Leído de arriba abajo…» e o aviso «Sobre las preguntas de esta asignatura» (origem «Basada en…» × «Pregunta complementaria»; o rótulo de cada pergunta continua visível). A página abre em «🚪 Patologías del esófago».
**Onde foi o ensino útil:** a «idea que organiza cada bloco» já abre o respectivo bloco (cada um começa por «Desde cero» com essa pergunta); o mapa era só um índice e foi retirado sem repetir. Nenhuma ciência da portada se perdeu.
**Fontes e créditos retirados da abertura** (agora só aqui): cátedra de Fisiopatología II (6.º semestre) e literatura de referência já citados no resto da página; 6 decks da cátedra do Drive (`01 Enfermedades Esofágicas`, `02 Enfermedades Gástricas`, `04 Pancreatitis`, `05 Hepatitis A B C`, `Ictericia`, `07 Unidad 2 Alteraciones de las vías urinarias`) — ver `fisiopatologia-ii-issue101-slides-v1.md`.
Tinta e grifos na portada: **0** (consulta somente leitura). CSS/JS: nada referencia `fp2portada`; as classes `ov` e `rmc-hero` deixam de aparecer no HTML e continuam no CSS global.

## (ii) Voz G0 — o que mudou e o que ficou
Commits desta rodada: `56097a31` (abertura) e `a3e2a4bc` (voz G0 no corpo, nas «Trampas» e nos infográficos; distratores) + o commit desta conferência. Em texto: **«el enunciado …», «la pregunta busca/pide», «lo que más rinde/rentable», «muy preguntable», «te regala», «a propósito», «Leé…/marcá…»** viraram descrição clínica. Mantidos de propósito: o rótulo «⚠️ Trampa clásica» (638, igual à `main`), «Basada en preguntas de examen» e «Pregunta complementaria», «el enunciado» como simples referência ao caso quando a explicação refuta uma alternativa («nada en el enunciado sugiere…», ≈ 25 ocorrências) e «a propósito» em sentido fisiológico («la presión es alta a propósito»).

**Antes / depois (G0 §13):**
1. *Mecanismo* — síndrome nefrótico. Antes: «Si en el caso clínico aparece dolor lumbar agudo en un nefrótico, ya está dicha la respuesta.» Depois: «Un nefrótico con dolor lumbar agudo debe hacer pensar en trombosis de la vena renal.» Dificuldade: a frase dava a resposta pronta («ya está dicha la respuesta») em vez de apontar o diagnóstico a pensar.
2. *Comparação* — acalasia × câncer. Antes: «Cuando el enunciado te da un plazo de meses con adelgazamiento marcado, está señalando el tumor.» Depois: «Un plazo de meses con adelgazamiento marcado señala al tumor, aunque el resto se parezca.» Preservado: o critério discriminador (tempo e emagrecimento).
3. *Opção de questão* — Antes: «Hernia hiatal». Depois: «Hernia hiatal, que desalinea el esfínter intrínseco del extrínseco». Preservado: letra e gabarito; a alternativa agora diz o mecanismo em que o aluno poderia cair.
**Problemas que ficaram:** (a) «La pregunta pide el primero.» no fim de uma «Trampa clásica» do bloco 01 (colada ao grifo «12 anuncia que la várice puede romperse»; **não tocada**, ver (v)); (b) «Puntos a dominar» e «La clave para decidir» repetem-se como rótulos; (c) nos rasters ficam textos «ALTO RENDIMIENTO» (7) — não editável aqui; (d) o alt de `bloco-07-01…` mencionava «un recuadro de alto rendimiento»; agora diz «un recuadro con los puntos clave».

## (iii) Alterações científicas do commit `a3e2a4bc` e seu estado de fonte
| alteração | fonte permitida? | estado |
|---|---|---|
| ERC: lista de complicações «hipercalcemia» → **«hipocalcemia»** | só o resumo do próprio bloco (osteodistrofia: hiperfosfatemia + hipocalcemia) | coerência interna; **sem deck da cátedra para b05–b12** |
| VHB: «causa más común de hepatopatía crónica (Asia y África)»; acrescenta que no mundo a mais frequente é a esteatose não alcoólica | o próprio bloco 05 («esteatosis no alcohólica», vista antes); o deck `05 Hepatitis` **não foi reaberto nesta rodada** | coerência interna; **não conferido contra o deck nesta rodada** |
| Pielonefrite: «Diabético aparece en **dos** de las cuatro complicaciones: necrosis papilar y pielonefritis enfisematosa» (antes «tres», incluindo pionefrosis por obstrução neurógena) | bloco 12 (infecções urinárias) | coerente com o resto da página; **sem deck da cátedra** → interpretação não confirmada |
| Potássio: «sodio en el límite alto y cloruro normal (referencia 95-105 mEq/L)» | — | só reformatação |
| Distratores das MCQ: cada alternativa errada ganhou uma justificativa curta (ex.: «…, porque la nicotina es antiinflamatoria en el intestino») | resumo do bloco | texto plausível e falso; letras e gabaritos **iguais à `main`** |
**Não conferido contra fonte da cátedra:** blocos b05–b12 (rim e equilíbrio hidroeletrolítico) — o Drive não tem decks deles (`…slides-v1.md` §3/§5). Nenhuma frase desses blocos foi alterada além de voz G0 e dos itens da tabela acima.

## (iv) Pistas de resposta (8-A.6-C)
Letras corretas a/b/c/d = 144/142/134/138 (558 MCQ): sem padrão. **A alternativa correta é a mais longa em 344 de 558 (61 %)** — era 360 de 558 (64 %) na `main`. O viés **continua alto**; esta PR só reduziu 3 pontos. Corrigir exigiria reescrever distratores de ≈ 190 perguntas; fica como **pendência declarada** (proposta: rodada própria, preservando letras e ids).

## (v) Grifos e tinta (somente leitura, reconsultados em 18/10)
`user_highlights` de `fisiopatologia-ii`: **47** (fp2b01 ×42, fp2b02 ×4, fp2b12 ×1), os mesmos de 12/10 (`md5` das 47 linhas conferido contra o banco). Método: posiciono cada grifo (texto + 40 caracteres de prefixo/sufixo) no texto da `main` e comparo com **todas** as mudanças de texto desta PR contra a `main` (≈ 990 trechos): **47 intactos, 0 tocados, 0 colados a ≤ 15 caracteres**. (7 não resolvem com o contexto completo nem na `main`; testei todas as ocorrências do texto: também intactas.) `user_ink_strokes`: **0**; `user_notes`: não aplicável aqui. Nada foi escrito.

## (vi) Imagens
Três rasters foram refeitos como `…-v2.webp` (blocos 10-02, 11-02, 11-03; o rótulo «CLAVES DE EXAMEN» virou «CLAVES PARA RECORDAR»); **os três originais continuam no repositório** e o `src` do HTML aponta para os v2. Conferi o píxel: a diferença entre original e v2 fica numa faixa de ≈ 100 × 40 px (o rótulo); resto idêntico; tipografia do rótulo levemente mais leve que a original. 33 imagens, 0 sem `alt`, 0 quebradas no navegador. **Não revisado:** texto desenhado dentro dos outros rasters (inclui «ALTO RENDIMIENTO», 7).

## (vii) Contagens e navegador
Quiz-items 638 (319 + 319 espelho), flashcards 1 857, imagens 33, ids 905 — iguais à `main`. Chromium real, 390 e 1366 px, assets da `main` de 18/10: abre em «Patologías del esófago»; `fp2portada` oculta; 8 de 8 respostas de teste abrem; 0 erros de JS; 0 rolagem horizontal; 0 respostas HTTP ≥ 400; 0 imagens quebradas. **Não testado:** iPad físico, caneta, áudio.

## (viii) O que NÃO foi conferido
Blocos b05–b12 contra a cátedra (sem decks); a pielonefrite «dois de quatro»; a leitura de **todas** as 638 perguntas contra uma fonte (só os decks de b01–b04, b13, b14 foram comparados, em `…slides-v1.md`); o texto dentro dos rasters; a questão Crigler-Najjar I continua fora (decisão do coordenador).
