# Farmacología II · passo integral (abertura direta e voz G0) · outubro/2026 · v1

> Agente: Claude 2 · PR #474 · documento interno. **A #484 já está mesclada e foi testada pelo José no iPad (16/10).** Os números abaixo foram medidos com o motor da `main` atual (que já inclui a #484).

## (i) Abertura direta (decisão do José, 16/10)
- `<section class="hero">` (sem id): capa «Farmacología II · del receptor a la receta», «14 temas · 214 comentadas · 292 tarjetas», «Base», «Refuerzo» → **removida**.
- `f2b00` (`data-rm-content-rev="2026-09-29"`): «Farmacología II no se aprueba memorizando listas…», post-it «Cómo se enlazan los bloques entre sí», «Sobre las fuentes», **Bibliografía**, nota das figuras → virou `<section class="f2-intro" id="f2b00" data-rm-content-rev="2026-09-29" hidden></section>` (id e atributo preservados).
- **Onde foi o ensino útil.** A ideia «entender dónde actúa cada droga dentro de un circuito fisiológico» já abre cada bloco («Desde cero»); o fio entre blocos já está dito dentro deles («como vimos en el bloque 01», «vuelven a aparecer en el bloque 05»). Só uma ligação não estava explícita e entrou em 1 frase: **a Na⁺/K⁺-ATPasa da digoxina é a mesma da nefrona (bloque 02)**. O resto do post-it era mapa e saiu sem repetir.
- **Fontes e créditos retirados da abertura (registro):** Brunton, Hilal-Dandan, Knollmann (eds.), *Goodman & Gilman: las bases farmacológicas de la terapéutica*, 13.ª ed., McGraw-Hill; Flórez J., *Farmacología humana*, 6.ª ed., Elsevier Masson; Rang, Ritter, Flower, Henderson, *Rang y Dale. Farmacología*, 9.ª ed., Elsevier; Hall JE, *Guyton y Hall. Tratado de fisiología médica*, 14.ª ed., Elsevier; Guía ACC/AHA de hipertensión arterial, 2025; contenido de la cátedra de Farmacología II · 6.º semestre · Universidad Central del Paraguay. Nota de figuras: «Las figuras marcadas como "material de la cátedra" reproducen diapositivas del contenido de la asignatura, con fines exclusivamente didácticos. Los esquemas y las ilustraciones vectoriales fueron elaborados para Repasso Med a partir de ese contenido y de la bibliografía citada.» (cada figura da cátedra continua marcada na própria legenda).
- **Tinta:** há **1 traço** (vermelho, fino, 3 pontos quase imóveis, criado em 16/09) ancorado em `f2b00`. Ele **fica guardado no banco, mas invisível**, porque a seção ficou oculta. Parece um toque acidental, não uma anotação. **Decisão do José.** Nenhum dado foi apagado.
- **Grifos na abertura:** 0.

## (ii) Voz G0 (≈ 200 frases, só texto; nenhum id, gabarito, questão ou cartão alterado)
Padrões trocados por descrição clínica: «Si el enunciado dice…», «la pregunta más repetida», «lo que cae», «Memorizá…», «perdés el punto», «Cualquier alternativa que diga… es falsa», «es una mina de preguntas», «entendés el 40 % de las preguntas».
**Antes / depois (G0 §13):**
1. *Mecanismo.* Antes: «Es el β-bloqueante que… Si el enunciado dice QT, es sotalol.» Depois: «Un β-bloqueante que alarga el QT es el sotalol.» Preservado: o dado discriminador (QT).
2. *Comparação.* Antes: «Estrategia: cuando dos alternativas de un mismo ítem son coherentes… la contradictoria suele ser la respuesta buscada.» Depois: «La lógica: el asa pierde calcio por la orina, así que el calcio en sangre baja; la tiazida lo retiene, así que tiende a subir.» Dificuldade: a frase ensinava a adivinhar, não o mecanismo; agora liga causa e consequência.
3. *Regra.* Antes: «🪤 LA pregunta del bloque. Los LABA…» Depois: «🪤 La regla central del bloque. Los LABA…». Preservado: a regra (LABA nunca solos no asma).
4. *Ensino acrescentado onde só havia estratégia:* «Para decidir: las alternativas (a) y (c) describen al mismo fármaco con los papeles de β₁ y β₂ invertidos… antagonista β₁, agonista parcial β₂.»
**Problemas que ficaram:** as **11 frases congeladas por causa de grifos reais** (p. ex. «Por qué se pregunta», «Aparece con frecuencia en las pruebas», «es una pregunta que ya cayó en prueba», «La fila de la frecuencia es la que más se pregunta») continuam como na `main`, como o coordenador decidiu; o rótulo «⚠️ Trampa clásica» fica; «el enunciado» em explicações que refutam alternativas fica.

## (iii) Ajustes de ciência feitos nesta rodada e seu estado de fonte
Fontes lidas na conferência de 18/10: `Antiinflamatorios esteroideos 2025.pdf` (tabela farmacocinética com extração desordenada), `Fármaco II a y b bloq 2026.pdf` (bloqueantes α/β; p.7, 15, 21, 25, 44 e 45 são só imagem), `04 Antiagregantes` (sem PGI₂); as demais conferências da PR estão nos documentos anteriores. **Não há** no Drive slides de asma/broncodilatadores, antiarrítmicos nem antidiabéticos orais, nem Goodman & Gilman/Flórez/Rang com texto extraível.
| ponto | resultado |
|---|---|
| Deflazacort: a rodada de edição o tinha movido para «18–36 h / intermedio» | **revertido** para 36–54 h (a linha do slide é ilegível na extração e o site já seguia 36–54); *pendente:* olhar a imagem da tabela do slide. O slide põe deflazacort no grupo de **potência** intermédia |
| Doxazosina/terazosina «sin selectividad de subtipo (α₁A y α₁B)» | slide (p.18): «selectividad similar [à prazosina] para os receptores α₁»; tamsulosina/silodosina: «mayor selectividad por el subtipo α₁A». Mantido «sin selectividad de subtipo»; **a enumeração «α₁A y α₁B» foi retirada** (o slide não a traz) |
| Prostaciclina «(una parte; la mayor depende de la COX-2…)» | **revertido** (nenhum slide trata a PGI₂) |
| LABA: salmeterol «inicio lento, no sirve de rescate» / formoterol «inicio rápido» | a **tabela do próprio bloco já dizia** salmeterol «inicio lento»; o cartão e a lista de «conceptos que se confunden» diziam o contrário. Foram igualados à tabela e a atribuição à cátedra («salmeterol agonista completo, formoterol agonista parcial») ficou como «La cátedra los formula además como…». **Sem slide que confirme nem refute.** *Pendente:* conferir com a «Provas Fármaco II – Belem completo» ou com Goodman/Rang (que, de memória, descrevem o inverso do agonismo: salmeterol parcial, formoterol pleno) |
| Classe I: «el orden alfabético coincide con la potencia de bloqueo del sodio» → «va así (ojo: no es el orden de las letras): IB débil < IA moderado < IC potente» | a lista ao lado já dizia IB < IA < IC (contradição interna); **sem slide** de antiarrítmicos |
| Fludrocortisona | o site não traz duração para ela; nada a corrigir (o slide a põe em ação intermédia, 12–36 h) |

## (iv) Grifos e tinta, reconferidos com o motor da `main` (que já tem a #484)
- `user_highlights` de `farmacologia-ii`: **238** (f2b01 ×85, f2b02 ×68, f2b04 ×8, f2b05 ×63, f2b07 ×3, f2b14 ×2, f2b15 ×9). Reconstruí os 238 registros (bloco, texto, 40 caracteres de prefixo/sufixo, ocorrência) e **conferi linha a linha por *hash* com o banco** (os 238 batem).
- **Teste com o motor real** (`hl-real.cjs` desta PR, Chromium, `app-core.js`/`rm-tools*.js` da `main` de 18/10): **236 sobrevivem sem remapeamento; 2 já eram obsoletos na própria `main`** («. 🎯» e o texto em português do f2b02). Nenhum grifo se perdeu.
- Em separado, comparei os ≈ 240 trechos de texto alterados nesta rodada com todos os grifos por consulta SQL: **0 toques**.
- Tinta: 1 traço, em `f2b00` (ver (i)). Nenhuma escrita no banco.
- **Não testado:** caneta física.

## (v) Navegador (Chromium real, 390 e 1366 px, assets da `main`)
Abre em «Sistema Nervioso Autónomo y fármacos que modifican la actividad simpática» (bloco 01); `f2b00` oculta; 428 questões, 876 cartões, 64 imagens (0 sem alt, 0 quebradas); 8/8 respostas abrem; 257 ids iguais à `main`; 0 erros de JS; sem rolagem horizontal.

## (vi) Decisões registradas (coordenador: aceitar; **o José confirma**)
1. Letras de #188 (b→c) e #192 (b→d). 2. #114 vira V/F de mecanismo (canônica #133). 3. E1 com «según la cátedra: NO» + nuance da literatura. 4. As 11 frases com grifo ficam como estão. Nenhuma foi desfeita nesta rodada. O Guard continua avisando `gabarito-alterado` (#188/#192) e `enunciado-renomeado` ×6: são essas decisões.

## (vii) Não conferido
Leitura integral das 428 questões contra os slides (os slides disponíveis cobrem antiinflamatórios, bloqueantes α/β, antiagregantes e antihipertensivos); salmeterol/formoterol; ordem de potência da classe I; caneta; iPad.
