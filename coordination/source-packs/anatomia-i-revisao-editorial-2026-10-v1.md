# Anatomía I — revisão editorial (2026-10) · fonte → decisão → destino

Arquivo: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/anatomia-i.html` (slug de grifos `anatomia-i`).

**Esta entrega é uma revisão editorial** com as fontes acessíveis. Não é conferência científica completa de toda a matéria.

## 1. Fontes acessíveis (Drive, pasta «Anatomia 1»)

| Fonte | Cobre |
|---|---|
| `compilado primer parcial ANATOMIA 1.pdf` (decks da cátedra) | Generalidades, osteologia/artrologia/miologia gerais, tórax (esqueleto, músculos, diafragma), noções de coração |
| `Traquea y pulmones.pdf` (anotações manuscritas) | Traqueia, brônquios, pulmões, pleuras (ilegível em parte) |
| `ilovepdf_merged-1_compressed.pdf` (deck) | Artérias do membro superior; articulações do membro superior |
| `Repaso cuello final anatomia 1.pdf` (deck) | Limites, regiões, ossos, músculos, fáscias, vasos, linfáticos, plexo cervical, laringe, faringe do pescoço |
| `anatomia 1.pdf` (pasta Pdfs, 130 mil caracteres) | Repasso de tórax e pescoço (artérias, veias, nervos) |
| `Questionário Generalidades.pdf` | Texto não extraível (vazio) — não consultado |
| Latarjet / Netter / outros livros | Existem no Drive; não lidos nesta rodada |

## 2. Achados → decisões → destino

| # | Achado | Decisão | Destino |
|---|---|---|---|
| 1 | Linguagem de prova no texto de ensino: «cuestionario oficial» (15 ocorrências), «distractor(es)», «trampa más elegante», «en el examen», «escaneo de esta prueba» | Reescrito como linguagem de estudo («cuestionario», «opciones falsas», «error más sutil», «no los confundas»). A origem das perguntas continua dita como «cuestionario de la cátedra» onde já constava | vários blocos e o banco geral |
| 2 | Bloco 01: caixa dizia «los cuatro distractores» (eram três opções deformadas + a quarta repetida) | Reescrita ensinando a posição anatómica (pés/mãos/membros) sem falar da prova | bloco 01 |
| 3 | «Ligamento cuadrado de Denuncé» (grafia errada) | «Denucé» (como no deck: «cuadrado de Denucé») | blocos 20 e banco (10 ocorrências) |
| 4 | Bloco 26 não ensinava ramos da artéria ulnar/cubital, interóssea comum, recorrentes ulnares, nem a tabela dos arcos palmar superficial/profundo/dorsal, que o deck da cátedra ensina e as perguntas cobram | Tabela de ramos colaterais da cubital, quadro «cada arteria con su nervio» e tabela dos arcos. Contagens de digitais/metacarpianas atribuídas ao deck («el deck cuenta 4») | bloco 26 |
| 5 | Bloco 20 sem bolsas serosas, fascículo arqueado (Cooper), irrigação/inervação por articulação | Tabela «Para completar» (deck da cátedra) + entrada no índice do bloco | bloco 20 |
| 6 | Bloco 31 sem a divisão dos gânglios laterais (yugulodigástrico/yuguloomohioideo) nem as ramas da subclávia | Tabela de gânglios laterais; remissão ao bloco 12 para as ramas da subclávia (já ensinadas ali) | bloco 31 |
| 7 | Figura `a1_b03_06`: rótulo «NO AXIAL*» contradizia o texto (a cátedra: artrodia = multiaxial; outros materiais dizem não axial) | **Retocada**: «MULTIAXIAL*» + nota «otros materiales la dan como no axial» | assets/img/anato1 |
| 8 | Figura `a1_b12_08-rev`: caixa «Corrección del resumen antiguo: posteriores = 2 + 9 … no doce pares» contradizia o texto («3 + 9 posteriores, 6 + 6 anteriores», a convenção da cátedra) | **Retocada**: «Convención de la cátedra: 3 + 9 posteriores y 6 + 6 anteriores. Este esquema muestra el reparto de la anatomía descriptiva: 2 + 9 y anteriores sólo en los espacios 1–9» | assets/img/anato1 |

## 3. Verificações feitas

- **Perguntas/cartões:** 918 perguntas, 3328 alternativas, 832 «Ver respuesta», 1646 cartões (823 nos blocos = 823 no banco, textos idênticos), 121 imagens, 40 ids: **iguais antes e depois**. Letras de gabarito idênticas; nenhum enunciado, alternativa ou gabarito foi alterado.
- **Gabaritos:** 832 MCQ, a letra em negrito coincide com o texto da opção correta em todos; 4 letras bem distribuídas (a 222, b 198, c 190, d 222); sem opções duplicadas.
- **Banco espelhado:** 459 perguntas nos blocos = 459 no banco.
- **Grifos:** 6 no banco (a1b05 ×1, a1b09 ×5; consulta somente leitura). O resolvedor real `rm-tools.js` ancora 6/6 no HTML da main e no deste commit, mesmo texto e nível. Os blocos editados não incluem a1b05 nem a1b09.
- **Cobertura:** as 392 perguntas avaliáveis têm a resposta ensinada antes no bloco (2 com cobertura lexical baixa, bloco 08, conferidas à mão e ensinadas).
- **Figuras:** 121 referenciadas, 0 quebradas. Revisão visual: vistas as figuras dos blocos 12–33 (ver §4); as demais, só por checagem de carga e alt.
- **Navegador (390 e 1280 px):** sem rolagem horizontal, 121/121 imagens, 1646 cartões, «Ver respuesta» abre em 4/4 blocos testados, sem erros de JS.

## 4. Observações das figuras (sem alteração)

- Faringe (`a1_b33_02`): caixa «INERVACIÓN DE LA FARINGE» com título repetido e texto apertado; rótulo «Cavidad nasal» com fragmento («Cans»).
- Plexo braquial: texto da caixa «Relación con la arteria axilar» cortado na borda.
- Várias figuras «Anatomía práctica» (assinadas «REPASO MED · ANATOMÍA PRÁCTICA») moram em `assets/img/anato1`; não foram tocadas (Anatomía I Práctica é de outra frente).

## 5. Pendências / revisão humana

1. **Tórax (blocos 05–17) e membro inferior/superior além dos decks listados:** confrontados só por sonda de termos com o compilado e o «anatomia 1.pdf»; sem leitura linha a linha de Latarjet.
2. Perguntas do bloco 08 sobre nível do hiato da VCI (VT8) seguem a cátedra; uma opção de questionário a dá a VT9 (já explicado no texto).
3. O questionário de Generalidades não pôde ser lido; a atribuição «cuestionario de la cátedra» é a que já existia.
4. Duas divergências de convenção ficam marcadas na página (artrodia multiaxial × não axial; 3+9 × 2+9 intercostais).
5. Palavras de 2.ª pessoa em voseo («tocá», «fijate») são o padrão da matéria; não alteradas.

## 6. Fechamento (2026-10-23, depois do merge da #555)

**Convenções verificadas contra a cátedra**
- **Artrodia = multiaxial:** `compilado primer parcial ANATOMIA 1.pdf`: «Artrodia o plana. Multiaxial» (as 6 articulações: 2 multiaxiais, 2 biaxiais, 2 uniaxiales). O texto do bloco 03 já explica «otros materiales la dan como no axial» e a figura `a1_b03_06` passou a dizer o mesmo. **Coerente.**
- **Intercostais 3 + 9 e 6 + 6:** `anatomia 1.pdf` (repaso da cátedra): anteriores «6 primeras: torácica interna; 6 últimas: musculofrénica»; posteriores «3 primeras: intercostal suprema (tronco costocervical); 9 últimas: aorta torácica». **O resumo ainda misturava as duas formas de contar** (legenda «las dos primeras… de la 3.ª a la 11.ª», e a figura do passo 5 «7.º al 9.º; 10.º e 11.º sem anterior»). Corrigido: legenda e figura na convenção da cátedra, e um quadro «Dos formas de contar, una sola anatomía» explica a outra contagem (2 + 9; anteriores só até o 9.º) sem a chamar de erro. Figura `a1_b12_08-rev` (já retocada na #555) diz o mesmo.

**Rótulos cortados registrados na #555 — corrigidos (figuras retocadas, nenhuma removida)**
- `a1_b33_02_faringe`: etiqueta quebrada «Cans» → «Coanas»; caixa de inervação com título duplicado e texto fora da borda → texto compacto (plexo faríngeo X com XI e simpáticas; estilofaríngeo IX; sensibilidade V2/IX/X).
- `a1_b28_01_plexo_conexiones`: frase cortada na borda → «Los nombres indican su posición respecto de la arteria».

**Latarjet:** `Latarjet - Ruiz Liard … T1.pdf` (81 MB) e T2 (88 MB) existem no Drive, mas a leitura devolve **texto vazio**. Não consegui acessar. **Limite:** as duas convenções ficam verificadas só contra os decks da cátedra; o que «outros materiales» dizem (2 + 9; anteriores só até o 9.º) segue sem conferência no livro. Trecho necessário: Latarjet T1, capítulo de vasos da parede torácica (intercostais posteriores e anteriores), para confirmar de onde nascem as intercostais posteriores 1.ª e 2.ª e até que espaço a musculofrénica dá ramos anteriores.
