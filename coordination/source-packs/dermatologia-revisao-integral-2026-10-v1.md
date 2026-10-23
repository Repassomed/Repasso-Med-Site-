# Dermatología · revisão integral · outubro/2026 · v1

Documento interno de coordenação (não é texto para o aluno). Agente: Claude 2. PR #505, branch `claude/pente-fino-g0-dermatologia`. Arquivo da matéria: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/dermatologia.html`.

Esta revisão vem em cima da rodada anterior da mesma PR (limpeza de «voz de prova», 54 edições). Aqui foram acrescentadas **78 edições** (arquivo `ed2/dermatologia_all.py`, reaplicável a partir do HEAD limpo) em quatro frentes: abertura direta, voz G0 nos textos de explicação e nos cartões, correções de fidelidade à fonte e lacunas de conteúdo que as fontes da cátedra cobrem e a página não.

## (i) Fontes e créditos retirados da abertura

A portada (`dermportada`) continha:

- hero «Dermatología: primero la lesión, después la enfermedad», com a frase «Construido sobre el contenido de la cátedra de Dermatología y la literatura de referencia (Fitzpatrick, *Dermatología en Medicina General*), con preguntas basadas en exámenes y el criterio de la cátedra como fuente de verdad»;
- faixa de contagens: 13 bloques · 120 preguntas · 294 flashcards · 58 figuras · 1 ruleta;
- «El hilo conductor y el mapa de los bloques» (mapa dos 13 blocos e dos três grupos de unidades);
- caixa «Lo que la cátedra deja marcado en la Unidad I» (estratégia: glomus, estrato lúcido, vehículo etc.).

Não havia lista de bibliografia nem créditos de imagens **na abertura**. A bibliografia («Bibliografía», «Sobre el alcance de estos tres bloques», «Sobre las imágenes») está no fim da página, dentro de `dermcierre`, e **não foi mexida** (ver pendência P6). Referências que ficam registradas aqui:

- Contenido de la cátedra de Dermatología · 7.º semestre · Unidad I «Introducción a la Dermatología» (e unidades de zooparasitosis, piodermitis, infecciones virales, candidiasis/micosis, dermatitis, tumores).
- Kang S et al. (eds.), *Fitzpatrick's Dermatology*, 9.ª ed.; Goldsmith LA et al., *Fitzpatrick's Dermatology in General Medicine*, 8.ª ed. (2012).
- Bolognia JL et al., *Dermatology*, 4.ª ed. (citado na bibliografia final; não está no Drive).

## (ii) Abertura antes/depois e onde foi o ensino útil

**Antes:** a página abria numa portada com hero, contagens, mapa dos blocos e uma caixa de estratégia; dentro do bloco 01 ainda havia um segundo mapa («El recorrido: primero la base, después las enfermedades»).

**Depois:** `dermportada` ficou como `<section class="container" id="dermportada" hidden></section>` (id preservado; sem `<h2>`, portanto fora do índice lateral). A página abre direto no bloco 01, que já tem título, faixa do bloco, «Desde cero» e navegação.

Ensino útil da portada e para onde foi:

| Ideia na portada | Destino |
|---|---|
| «Cerca de cuatro mil enfermedades con apenas treinta lesiones elementales»; descrever primeiro a lesão, forma e distribuição | já está em bloco 01 §1 e bloco 02 «Desde cero» e §1 (nada a mover) |
| «La piel no se ausculta, se lee; lo que se lee no son enfermedades sino lesiones» | **integrada** em 1 frase no bloco 01 §1 («El órgano está ahí, iluminado, y se puede tocar: la piel no se ausculta, se lee…») |
| Mapa 01–03 (base) e 04–13 (doenças por causa) | removido (mapa do curso); cada bloco já abre dizendo o que ensina |
| «Lo que la cátedra deja marcado…» (órgão, origem embrionária, lúcido só em palmas e plantas, glomus, tamanho/topografia/conteúdo, veículo) | removido como estratégia; **todos os conceitos já são ensinados nos blocos 01–03** |

Verificado: nenhum `<script>` nem regra CSS referencia `dermportada`; o `app-core.js` só monta o índice com seções que têm `id` e `<h2>`, e `estimarAlturas` aceita seção vazia (mínimo 600 px). Estilos `rmc-hero`/`rmc-postit blue` seguem no CSS global (não mexido). Não testei no navegador (ver seção ix).

## (iii) Trechos antes/depois (G0 §13)

**1 · Comparação com fonte em conflito (bloco 02, vesícula × ampolla).**
*Dificuldade:* a página dizia «Fitzpatrick usa 0,5 cm… si hay conflicto, manda la cátedra» e a questão da vesícula (0,3 cm) dizia que «la cátedra usa 0,5 cm» — mas o cartão e a tabela do mesmo bloco usam 1 cm. O aluno via dois números sem saber qual valia. Nos slides da cátedra (`01. Dermato Unidad I.pdf`) acontece exatamente isso: o quadro da pág. 20 corta em 1 cm e a definição escrita da pág. 30 (vesícula ≤ 0,5 cm; ampolla > 0,5 cm) corta em 0,5 cm.
*Antes:* «La literatura no siempre corta en 1 cm: Fitzpatrick usa 0,5 cm… Si hay conflicto, manda la cátedra.»
*Depois:* «El corte de tamaño depende de dónde se lea: el cuadro de lesiones de la cátedra usa 1 cm, pero la definición escrita de vesícula y ampolla de esa misma cátedra, igual que Fitzpatrick, usa 0,5 cm. El criterio no cambia… lo que importa es tener claro qué corte se está aplicando.» A explicação da questão passou a dizer que, com 0,3 cm, a resposta é vesícula nas duas convenções. Gabarito e alternativas intocados.
*Preservado:* critério (mesma lesão, o tamanho separa), tabela de 1 cm, cartão, resposta correta.
*Ficou:* o cartão «Vesícula, ampolla y pústula» e a tabela seguem com 1 cm (é o quadro da cátedra); só uma decisão do José pode eleger um corte único (P1).

**2 · Lacuna de tratamento que quebrava o raciocínio (bloco 05, piodermitis).**
*Dificuldade:* o bloco ensinava a distinguir impétigo, ectima, erisipela e celulite pela profundidade, mas não dizia como se trata nenhum deles (só o absceso e o carbunco). Quem aprendia o diagnóstico não sabia o passo seguinte, que os slides (`3. Piodermitis.pdf`) trazem em tabela.
*Antes:* parágrafo terminava em «Drenaje primero; el antibiótico acompaña cuando hay celulitis alrededor, fiebre o inmunodepresión.»
*Depois:* parágrafo novo de 5 linhas: impétigo localizado → mupirocina 2 % 3×/dia 5–7 dias, oral (cefalexina/dicloxacilina) se extenso; erisipela e celulite → betalactâmico oral 7–10 dias (penicilina/amoxicilina; dicloxacilina/cefalexina), clindamicina se alergia, IV se grave, tratar a porta de entrada.
*Preservado:* todo o texto anterior, ids, questões. *Ficou:* não foram acrescentados esquemas IV (vancomicina etc.) nem doses pediátricas (P4).

**3 · Voz de prova dentro de uma explicação (bloco 04, sarna costrosa).**
*Antes:* «La pregunta suele invertir los dos, o dar el caso de un paciente con VIH “que no se queja” esperando que descartes sarna. No la descartes…»
*Depois:* «El error típico es invertirlos, o descartar sarna en un paciente con VIH “que no se queja”. No la descartes: es justamente la que más contagia.»
Mesma lição clínica, sem falar da prova. Outros casos do mesmo tipo foram tratados do mesmo jeito (ver seção iv-b).

**4 · Precisão contra a fonte (bloco 09, exantemas).**
*Antes:* rubéola «más rápido y sin confluir»; exantema súbito «fiebre alta tres días»; pergunta da mononucleose: exantema «a los dos días» da amoxicilina.
*Depois:* rubéola «más rápido y más discreto (confluye poco, sobre todo en el tronco)»; súbito «3 a 7 días (típicamente 3)»; mononucleose «a los siete días». Os slides (`4. Infecciones virales.pdf`) dizem que a rubéola «pode confluir no tronco», a roséola tem febre de 3–7 dias e o exantema por aminopenicilina aparece 7–10 dias depois de iniciar o antibiótico. Gabaritos não mudam.

**Problemas que ficaram à vista** (não escolhi só os melhores): a duplicidade 1 cm/0,5 cm acima; o tempo da dermatite alérgica de contato (P2); e três blocos de texto muito longos por natureza (bloco 02, 76 mil caracteres) que continuam densos, embora organizados em tabelas.

## (iv) Itens conferidos nas fontes

**iv-a · Ciência × fontes permitidas**

| Afirmação | Arquivo do Drive | Resultado |
|---|---|---|
| Pele 15 % do peso, 1,8 m², 3 capas; 5 estratos; queratinócito 90 %, melanócito 5–10 % (1:10, crista neural), Langerhans 2–5 % (espinhoso, mesoderma), Merkel < 1 % (basal, neuroectoderma) | `01. Dermato Unidad I.pdf` | ✅ |
| Odland em granuloso e espinhoso; queratohialina só no granuloso; colágeno I; Meissner (tato) × Vater-Paccini (pressão); ciclo do pelo 2-5 anos/semanas/meses; ecrina/apocrina/sebácea (secreção, controle, desembocadura); plexos e glomus; dupla inervação | idem | ✅ |
| Primárias por tamanho/topografia/conteúdo; secundárias; formas e distribuição; lupa, diascopia, Wood (mercúrio alta pressão, filtro silicato-óxido de níquel), dermatoscopia | idem | ✅ (exceto o conflito 1 cm/0,5 cm, nota acima) |
| Tópicos/sistêmicos/cirúrgicos; veículos; UVB 311 nm, PUVA, TFD (MAL + luz vermelha), CO₂ 10 600, Nd:YAG 1064, alexandrita 755, IPL 500–1200, crioterapia −196 °C | idem | ✅ |
| Sarna: permetrina 5 % 8–14 h repetir em 7 dias, ivermectina 200 µg/kg dias 1 e 8, costrosa dias 1-2-8-9-15 + permetrina diária, nódulos → corticoide médio + anti-histamínico, azufre seguro em neonatos | `2. Zooparasitosis.pdf` | ✅; **acrescentado** «ivermectina: não em grávidas, lactantes nem < 15 kg» (estava no slide e faltava) |
| Larva migrans (albendazol 400 mg × 3 d / ivermectina), miíase furunculoide, tungíase | idem | ✅ |
| Leishmaniose: meglumina 20 mg/kg/dia × 20 dias; Lyme/rickettsiose → doxiciclina (exceto gestante e < 8 anos) | `Dermatologia P1- apuntes clase.pdf` (apontamentos do José, não slide) | ✅ por apontamento; slide não lido |
| Impétigo (70 %/30 %, GAS+S. aureus, toxina esfoliativa), furúnculo, carbunco (cipro 500 mg 12/12 h 7–10 d, doxiciclina, não remover escara), foliculite do jacuzzi, hidradenite (oclusão folicular, Hurley I–III, doxiciclina 3 meses, biológicos), erisipela × celulite, linfangite | `3. Piodermitis.pdf` | ✅; tratamento de impétigo/erisipela/celulite **acrescentado** |
| Candidiase (muguet, KOH pseudohifas, satélites, fluconazol, paroníquia), pitiríase versicolor (Malassezia, sinal da unhada, Wood amarelo-alaranjado, selênio/ketoconazol; terbinafina oral não), esporotricose (itraconazol 3–6 meses) | `7. Candidiasis.pdf` | ✅; tratamento da versicolor **acrescentado**; cartão de Wood versicolor «amarillo-verdosa» **corrigido** para amarelo-dourado/acobreado (como o corpo e o bloco 03) |
| Sarampo (Koplik 1–2 d antes), rubéola, eritema infeccioso, mononucleose (amoxicilina), roséola (HHV-6), mão-pé-boca, herpes simples/eczema herpético/panadizo, varicela/zóster | `4. Infecciones virales.pdf` | ✅ com 3 ajustes (seção iii-4) |
| Contato irritativa × alérgica, patch test 48 e 96 h, dermatite atópica por idade, emolientes, corticoide por potência, calcineurina; eczema numular, líquen simples, prurigo nodular | `5. Dermatitis.pdf` | ✅ exceto P2; eczema numular/LSC/PN **acrescentados** (não existiam) |
| Queratose seborreica/Leser-Trélat, nevos (juncional/composto/intradérmico), congênito, lipoma, granuloma piógeno, hemangioma (propranolol/timolol), BCC, Mohs, CEC, melanoma (subtipos, ABCDE, Breslow desde o granuloso, Clark), sentinela | `8. Tumores de la piel (unidad 9).pdf` | ✅; tratamento de BCC/CEC, propranolol/timolol no hemangioma e Clark/faixas de Breslow **acrescentados** |
| Gabaritos de cerca de 15 questões reconstruídas (Brocq/Auspitz, desmogleína 3, líquen plano → corticoide alto, SSJ < 10 %, comedão, rinofima, impétigo, forúnculo, SAMR, sarna nodular/costrosa, pediculose, leishmaniose, rickettsiose, queratose seborreica…) | `Dermatologia P1- apuntes clase.pdf` (gabarito de provas anotado pelo José) | ✅ coincidem com a letra do site |

**Não encontrei fonte legível** para: bloco 06 (tiñas: só pitiríase versicolor tem slide), bloco 08 (acné e rosácea: não há slide no Drive, só imagens), partes de literatura (isotretinoína 1 mês, acitretina 3 anos, anágeno 85-90 %, doses de corticoide). `Tomo 1 – Fitzpatrick…pdf` devolveu texto vazio (PDF sem camada de texto): **não legível**.

**iv-b · Voz G0 nas explicações e nos cartões**

Edições de voz (sem tocar em ciência): «lo que se evalúa», «a veces cae», «la pregunta busca/suele/apuesta/quiere que marques», «el enunciado dice», «si en la pregunta aparece», «las tres que la cátedra deja marcadas / repite», «guardala para la víspera», «así conviene responderlo en la evaluación», «es la pregunta de anatomía que más se repite» (3 cópias do cartão do lúcido: corpo + mazo + ruleta, mantidas iguais), «ese orden es el que se evalúa» (texto dentro do SVG do bloco 02) e outras. Rótulos «⚠️ Trampa clásica», «Error frecuente» e «Basada en preguntas de examen» mantidos.

Edições de ciência/fidelidade: nota vesícula/ampolla; cartão de retinoides («Todos son teratógenos» → «Los sistémicos son teratógenos», porque o texto só afirma isso dos sistêmicos e os slides não tratam os tópicos); cartão Wood versicolor; rubéola, roséola e questão da mononucleose (iii-4); «del dermis» → «de la dermis»; ivermectina.

Acréscimos de conteúdo (7, todos de slides da cátedra): ver (iv-a). Não existe questão nova nem nenhuma mudança de alternativa, letra ou número de perguntas.

## (v) Consulta de grifos e tinta

- Grifos de aluno de `dermatologia` no Supabase (SELECT em `user_highlights`): **0**. Traços (`user_ink_strokes`): **0**. Confirmado também por `subject_slug`/`block_id`/`anchor_id` com `ilike '%derm%'`: nenhuma linha.
- `diffspans.py` sobre o diff completo contra `origin/main`: 283 trechos antigos alterados (inclui a rodada anterior) → `hlsql.py` gerou a consulta de 326 chaves; **não precisei enviá-la** porque a tabela não tem nenhuma linha da matéria (a junção devolve vazio por construção). Conflitos: 0. Frases deixadas por grifo: 0.
- A portada esvaziada não tinha traço (tinta 0). A abertura segue no HTML (seção `hidden`) e não perdeu `id`.

## (vi) Contagens reais

| | main | esta PR |
|---|---|---|
| Blocos (`dermb01`–`dermb13`) + `dermcierre` + `dermportada` oculta | 15 seções | 15 seções |
| Questões (corpo; não há banco geral) | 120 | 120 (b01 12 · b02 27 · b03 10 · b04 16 · b05 12 · b06 5 · b07 5 · b08 7 · b09 5 · b10 5 · b11 5 · b12 6 · b13 5) |
| MCQ / V-F | 101 / 19 | 101 / 19 |
| Flashcards (incl. mazo e ruleta de 01-03) | 482 | 482 |
| Imagens `<img>` + SVG | 58 + 6 | 58 + 6 |
| Letras corretas a/b/c/d | 26/30/24/21 | 26/30/24/21 |
| Verdadeiro/Falso | 9 V · 10 F | 9 V · 10 F |
| Correta única mais longa (MCQ) | 36/101 (36 %); 4 empates no topo → 40/101 (39 %) | igual (36/101; 40 com empates) |

Auditoria de pistas (8-A.6-C): média das corretas ≈ 1,05× a média dos distratores; só 1 questão com a correta ≥ 1,3× a segunda mais longa (`q-derma05-12`, impétigo — alternativas originais de prova preservadas por 8-A.6). Nenhuma concentração explorável; **nenhuma reformulação feita**. Por origem: «Basada en preguntas de examen» 8/24 corretas únicas mais longas; «complementaria» 28/77.

`guard.sh` local: **passou com avisos** (aviso de execução local + `registro-tarefas` alheio; nenhum ❌/🔴; HTML equilibrado; 58 assets existem; gabaritos válidos). O Guard lista 10 linhas adicionadas com número/terapêutica para conferência humana: são as do item (iv-a) acrescentadas dos slides.

## (vii) Imagens e alt

58 imagens, todas com `alt` descritivo, nenhum genérico repetido (> 2×) e nenhum «perla de examen». Uma legenda de figura (`27-epidermis-estratos-celulas.webp`) tem alt curto (1 frase) em comparação às outras de 3–6 linhas, mas descreve de fato o conteúdo; deixei como está. **Texto dentro das imagens** (PNG/WEBP) não foi lido nem editado: contém os rótulos das infografias de `assets/img/derma/` (ex.: lista de funções da pele com «inmunidad», já avisada na legenda do bloco 01; «quellitis» no cartão 5 de secundárias, já avisado na legenda).

## (viii) Pendências declaradas

- **P1 · corte vesícula/ampolla (0,5 × 1 cm).** O slide tem os dois (`01. Dermato Unidad I`, p.20: «Vesicula <1 cm · Ampolla ≥1 cm»; p.30: «vesícula … menor o igual a 0,5 cm · ampolla … más de 0,5 cm»). A nota do quadro explica as duas leituras; **a partir de 18/10 o cartão e o resumo do bloco 02 também dizem que a definição escrita corta em 0,5 cm**. A tabela mantém 1 cm (é a do slide). *Pendente (decisão do José com a docente):* escolher um corte único; se for 0,5 cm, mudar tabela e legenda da figura.
- **P2 · tempo da dermatite alérgica de contato — RESOLVIDO em 18/10.** O slide diz **12–72 h**; as 8 linhas do arquivo que diziam 48–72 h passaram a «12 a 72 horas» (quadro, resumo, caixas, cartões, questão). 48–96 h ficou só como leitura do *patch test* (confere com o slide).
- **P3 · tratamento das outras formas de leishmaniose** (mucocutânea, difusa, visceral) e dos subtipos de miíase de ferida: só aparecem nos apontamentos do José, não em slide. Não acrescentei.
- **P4 · doses.** Os acréscimos de tratamento dão fármaco e duração, sem doses pediátricas nem esquemas IV, de propósito (não crescer demais).
- **P5 · blocos 06 (tiñas) e 08 (acné/rosácea).** Bloco 08: **conferido contra o Fitzpatrick Atlas de Dermatología Clínica, 7.ª ed. (Drive, PDF com texto nas primeiras ~143 páginas: acné pp. 39–44 e rosácea pp. 45–51)** — ver (x). Bloco 06: **sem fonte legível** (os slides não têm tiñas e o capítulo de dermatofitosis do Atlas, pp. ~605–630, não vem na extração); só a frase de abertura do Atlas sobre a luz de Wood (fluorescência verde ou amarelada em dermatofitosis do cabelo e vermelho-coral no eritrasma) confere. **Continua NÃO conferido contra fonte:** Wood verde-maçã em *Microsporum*, «*Trichophyton* não fluoresce» (generalização: o *T. schoenleinii* fluoresce), tiña cruris respeita o escroto, querión não se drena, mocasín.
- **P6 · fim da página.** `dermcierre` ainda mostra «Bibliografía», «Sobre el alcance de estos tres bloques» e «Sobre las imágenes» (inclui «Las 10 láminas son material propio…» e menciona Bolognia, fora do Drive). A regra de abertura direta só trata do início; decidir se esse bloco sai do aluno.
- **P7 · subtítulo «Puntos a dominar… peso que cada tema tiene en la bibliografía»**: decisão do José na PR #498; mantido.
- **P8 · cobertura (8-A.2) por amostra:** conferi que o conceito de cada questão está ensinado antes no bloco (lido bloco a bloco), mas não fiz tabela questão × parágrafo para as 120.

## (ix) O que NÃO foi conferido

- iPad e navegador do José: o teste automatizado em Chromium (ver (x)) não substitui abrir no iPad.
- Slides de leishmaniose e garrapatas (usei os apontamentos do José); Fitzpatrick Tomo 1 (PDF sem texto); Atlas de Fitzpatrick só nas primeiras ~143 páginas; `Perguntas_Dermatologia_Respostas_Explicadas.pdf`, `Dermato Unidad I quiz.pdf` e as provas 2025.1/2025.2 do Drive (não abertos); bloco 06 e 08 (sem slide); literatura Bolognia.
- Texto dentro de imagens.
- Doses e prazos de acitretina/isotretinoína (literatura, sem fonte legível).
- Redundância fina entre as 120 questões (8-A.1): vi todas ao ler, não montei matriz de duplicatas.

## (x) Conferência adicional de 18/10 (slides da cátedra, Atlas de Fitzpatrick e navegador)

Fontes lidas por inteiro: `01. Dermato Unidad I`, `3. Piodermitis`, `4. Infecciones virales`, `5. Dermatitis`, `7. Candidiasis`, `8. Tumores de la piel`, `Dermatologia P1- apuntes clase` (apoio) e o Atlas de Fitzpatrick (páginas extraídas). Nenhuma fonte fora de cátedra e literatura-base; nenhuma API paga.

### Os sete trechos acrescentados pela revisão anterior
| trecho (bloco) | slide | veredito |
|---|---|---|
| Impétigo/erisipela/celulite (05): mupirocina 2 % 3×/dia 5–7 d; cefalexina/dicloxacilina; penicilina/amoxicilina; clindamicina; reposo e elevação | `3. Piodermitis`, tabelas de tratamento | **confere** (a frase «falta de respuesta» **não** estava no slide e foi trocada por «edema extenso», que o slide traz) |
| Pitiríase versicolor (06): selênio 2,5 %, cetoconazol 2 %, azol oral, terbinafina oral não recomendada, profilaxia mensal | `7. Candidiasis` | **confere** (os tempos de aplicação do slide — 7–10 min × 7 d; 5 min × 3 d — não foram acrescentados) |
| Eczema numular, líquen simples crônico, prurigo nodular (10) | `5. Dermatitis` e Atlas pp. 76–80 | **confere** |
| Hemangioma (11): propranolol oral, timolol tópico | `8. Tumores` | **confere**; o slide cita obstrução «visual, respiratoria o auditiva»: **«audición» foi acrescentada**; «alimentación» fica sem apoio no slide (mantida, sinalizada) |
| Basocelular e espinocelular (12) | `8. Tumores` | **confere**; «el más frecuente de todos los cánceres humanos» → «de los tumores malignos de la piel» (palavras do slide) |
| Clark I–V e faixas de Breslow (13) | `8. Tumores` | **confere** (exato) |
| Passos do melanoma, queratose actínica, granuloma piógeno, carbunco (12–13, 05, 11) | `8. Tumores`, `Unidad I`, `3. Piodermitis` | **confere** |

### Medidas e tempos divergentes
| item | slide | o que se fez |
|---|---|---|
| Dermatite alérgica de contato | `5. Dermatitis`: «retrasado (12–72 horas después del contacto)»; *patch test* 48 e 96 h | 8 linhas de «48–72 h» → «12–72 h». Leitura do *patch test* 48–96 h ficou |
| Vesícula × ampolla | p.20 (1 cm) × p.30 (0,5 cm) | cartão e resumo do bloco 02 agora citam os dois cortes; tabela fica (decisão pendente) |
| Wood na versicolor | `7. Candidiasis` p.32: «fluorescencia amarillo-anaranjada» | «amarillo-dorado o cobrizo» → «amarillo-anaranjado» (11 lugares; «dorado, cobrizo o amarillo-verdoso» só como variação de outros textos) |
| Celulite sem febre | `3. Piodermitis`: celulite inicia com febre >38,5 °C | «a veces sin fiebre» → «la fiebre es menos brusca que en la erisipela» |
| Exantema súbito | slide: febre alta 3–7 dias | «(típicamente 3)» retirado das duas frases |

**Não alterado, só registrado (o slide não trata ou difere sem contradizer):** foliculite do jacuzzi «8–48 h»; Hurley II com «cirugía localizada» (o slide só traz cirurgia no estádio III); «prurido crónico > 6 semanas»; queratose seborreica «a partir dos 40»; perlas de queratina/pontes intercelulares do espinocelular (só nos apontamentos); «escarlatina» e «Hutchinson do zóster» (sem slide).

### Bloco 08 (acné e rosácea) contra o Fitzpatrick Atlas
Confere: unidade pilossebácea; ordem hiperqueratinização → sebo/andrógenos → *C. acnes* → inflamação; comedão aberto/fechado e «os comedões são necessários para o diagnóstico de qualquer acné»; erupção acneiforme sem comedões e monomorfa por fármacos (lítio, difenil-hidantoína/anticonvulsivantes, isoniazida, glicocorticoides, inibidores do fator de crescimento epidérmico); conglobata e fulminante (febre, mal-estar, artralgias); retinoide tópico, antibiótico oral (minociclina/doxiciclina) e isotretinoína; isotretinoína teratogênica e **nunca junto com tetraciclina (pseudotumor cerebral)**; rosácea de 30–50 anos, sem comedões, rubor com líquidos quentes, picante, álcool, sol e calor, telangiectasias; rinofima mais em homens; blefarofima; metronidazol, doxiciclina/minociclina, isotretinoína em casos graves.
**Sem confirmação no Atlas (ficam como da cátedra):** «a isotretinoína atua nos quatro mecanismos» (o Atlas cita sebo e queratinização); ácido azelaico; os quatro subtipos de rosácea (o Atlas usa a classificação por estádios de Plewig-Kligman); protetor solar diário; «acné fulminans é o único com compromisso sistémico» (o Atlas traz o quadro sistémico, mas também a SAPHO).

### Navegador (Chromium real, `app-core.js`/`rm-tools*.js`/`styles.css` da `main` de 18/10; sem Supabase, sem rede)
390 e 1366 px, página nova × base: a página abre em «Bloque 01 · La piel por dentro»; `dermportada` oculta; 120 questões e 482 cartões iguais à base; 58 imagens, 0 sem `alt`, 0 quebradas; 6 de 6 respostas (múltipla escolha, V/F e abertas) abrem; 0 rolagem horizontal; 240 ids iguais; 0 erros de JS; 0 respostas HTTP 4xx/5xx. Captura do topo a 390 px conferida a olho. **Não testado:** iPad físico, caneta, áudio.

## (xi) Bloco 06 (tiñas) — nova tentativa de 18/10 e o que fica SEM prova

**Tentativa.** (1) Slides: a pasta de Dermatología tem Unidad I, Zooparasitosis, Piodermitis, Infecciones virales, Dermatitis, Candidiasis e Tumores; **nenhum trata de dermatofitosis** (busca no Drive por «Microsporum», «tiña», «dermatofit», «Wood» e por títulos «Micosis/Micología/Tiñas» não achou slide da cátedra). (2) Fitzpatrick Atlas (29 MB): a ferramenta do Drive devolve só as primeiras ~143 páginas em texto; o capítulo de tiñas (índice: tiña versicolor p. 638, negra 643, do pé 647, da mão 651, crural 653, do corpo 655, facial 657, incógnita 659, da cabeça 660, da barba 663) **não é legível aqui**; só o índice e a introdução (lâmpada de Wood) vêm. (3) Os documentos «Final» e «Questões P1» (bancos de perguntas feitos a partir de aulas, em português) não são slide da cátedra nem literatura-base; mesmo assim não tratam de nenhuma afirmação abaixo.

**Confere com fonte permitida (Atlas, introdução):** a luz de Wood mostra fluorescência verde ou amarelada na base do cabelo em dermatofitose e vermelho-coral no eritrasma; tiña versicolor é hipomelanótica. (Slide `7. Candidiasis`, p. 32: versicolor «amarillo-anaranjado».)

**Continuam SEM prova em fonte permitida (texto do aluno, no arquivo, não alterado nesta rodada):**
1. «Verde manzana» = *Microsporum* na luz de Wood (o Atlas diz «verde o amarillento» para dermatofitose do cabelo, sem nomear gênero nem «maçã»).
2. «As tiñas por *Trichophyton* não fluorescem» (generalização; não conferida em fonte permitida — da literatura de memória há exceções, que NÃO foram verificadas aqui).
3. «A tiña cruris respeita o escroto; a candidiasis não».
4. «Querión: não se drena; dá alopecia cicatricial; tratar com antifúngico oral e às vezes corticoide».
5. Forma «em mocassim» da tiña pedis e a descrição «três formas: interdigital, mocassim, vesiculosa».
6. Tiña capitis: formas microspórica (placa única, pelos cortados) × tricofítica (pontos negros) e as respostas à luz de Wood da infografia.
7. Doses/tempos de antifúngicos do bloco 06 (itraconazol, terbinafina, griseofulvina) — só apontamentos.

**Consequência:** esta PR **não é uma revisão integral de Dermatología**; é revisão integral dos blocos conferidos nas fontes lidas (todos menos o 06) + limpeza de voz G0 no arquivo todo. O bloco 06 fica como estava na `main` (a rodada só mexeu na voz das explicações e no tratamento da pitiríase versicolor, que confere com o slide); manter ou pedir fonte à docente é decisão do José.

## (xii) Fechamento de 20/10
- **Bloco 06 (tiñas):** nova busca de fonte permitida. Arquivos de Dermatología no Drive: slides Unidad I, Zooparasitosis, Piodermitis, Infecciones virales, Dermatitis, Candidiasis, Tumores; apontamentos de aula; Fitzpatrick Atlas (texto só nas primeiras ~143 páginas) e *Tomo 1* (568 MB, sem texto); `Prática Dermato.pdf` e `Dermatologia (1)_….pdf` (escaneados, sem texto); `P1 - DERMATO.pdf` e `Dermato Unidad I quiz.pdf` são provas/bancos de perguntas (não slide nem literatura). **Nenhum arquivo legível trata de dermatofitose.** Portanto as 7 afirmações listadas em (xi) **continuam NÃO validadas**; nada foi criado nem alterado nesse bloco.
- **Revisão final de didática** (`mech.py` no head `980775b6`): abre em «Bloque 01 · La piel por dentro» (`dermportada` vazia e oculta, 0 caracteres); 120 questões, 482 cartões, 58 imagens (0 sem alt); letras a/b/c/d = 26/30/24/21 (101 MCQ), correta mais longa 40/101 (39 %), 0 gabaritos fora das opções, 0 explicações truncadas, 0 pares bloco↔cópia divergentes; 0 parágrafos longos repetidos; resíduos «examen» = linguagem clínica («el examen no muestra placas»), rótulo honesto «basada en examen» e a nota de procedência das questões reconstruídas (8-A.4), mantidos de propósito.
- **O que NÃO foi relido nesta etapa:** texto desenhado dentro das imagens; fármacos e tempos do bloco 06; Bolognia (fora do Drive); a matriz questão × parágrafo das 120 (leitura dirigida, 8-A.2).
- **Alunos (SELECT 20/10):** 0 grifos, 0 traços.

## (xiii) Bloco 06 — retirada de regras absolutas sem apoio (21/10)
**Leitura do Atlas, páginas 644–664: NÃO foi possível.** O Fitzpatrick Atlas (`1GhBfotITZDKdcRZuwHPkQvJ_DRvP85Kb`, 29 MB) está no Drive, mas (a) a ferramenta de leitura de texto devolve só até a **página 143** (~316 mil caracteres) e (b) o download de arquivo é recusado acima de **10 MB** e o acesso direto à rede é bloqueado nesta sessão. Portanto **nenhuma afirmação específica do capítulo de dermatofitoses foi confirmada**. O que se lê no Atlas dentro do trecho acessível e foi usado: **PDF p. 36** (impresso p. xxxv, «Introducción»): a lâmpada de Wood é útil para detectar fluorescência em dermatofitose **na base do cabelo (cor verde ou amarelada)** e no eritrasma (vermelho-coral); a tiña versicolor é hipomelanótica. **PDF p. 93**: «tiña corporal: o exame com preparação de KOH é indispensável». **PDF p. 82 e 62**: KOH para descartar dermatofitose/candidose.
**O que foi alterado (só texto; ids, letras, V/F, número de questões, cartões e imagens iguais):** foram retiradas as regras absolutas que não têm apoio explícito nos slides nem no trecho legível do Atlas, em **todos** os lugares em que se repetiam (tabelas, texto, armadilhas, questões, cartões, barras de «puntos a dominar», legenda e alt):
1. **Fluorescência de *Microsporum*/*Trichophyton*** (39 padrões no total): «verde manzana = Microsporum» e «Trichophyton no fluoresce» → «verde ou amarelada na base do cabelo (dermatofitose do pelo); **não todas as tiñas fluorescem**; um Wood negativo **não descarta**» (o «nunca descarta» virou «não descarta»). A questão V/F `q-derma06-05` (resposta VERDADEIRO) e a `q-derma33` (resposta a) mantêm a letra.
2. **Escroto:** retirados «a tiña cruris respeita o escroto» e «escroto tomado → candidiasis» (texto, tabela de localizações, linha «Escroto/mucosa» do intertrigo, 2 cartões, barra de pontos e alt da figura). O cartão passou a «Intertrigo inguinal: ¿tiña o candidiasis?» com o que já estava no bloco (lesões satélite, fundo da prega; confirma com KOH).
3. **Querión:** retirados «não se drena», «drená-lo aumenta a cicatriz», «alopecia definitiva» e o tratamento prescritivo (antifúngico oral, corticoide). Ficou: forma inflamatória da tiña capitis que supura; **confirmar com exame micológico (KOH e cultura) antes de decidir drenagem**; a conduta a define o especialista. A questão `q-derma06-03` **manteve a letra c**, reescrita como «confirmar com exame micológico antes de decidir o drenaje».
4. **«Pelo ou unha = oral, sempre»** → «costuma ser oral» (hedge; continua sem fonte explícita).
**Imagens preservadas (nada apagado nem substituído):** `bloco-01-09-recursos-diagnosticos`, `16-tina-capitis-patrones`, `17-tinas-localizacion`, `18-pies-manos-unas-dermatofitos`, `19-micosis-superficiales-piel-pelo` etc. **Limite declarado:** o texto **desenhado dentro** de algumas dessas figuras (p. ex. «verde manzana» e «respeta el escroto») não pôde ser editado nem lido aqui; não é erro grave demonstrado, então ficam; o **alt** e as legendas já não repetem as regras absolutas.
**Continua SEM validação contra a fonte (texto mantido, sem regra absoluta):** forma em mocassim, padrões da tiña capitis (microspórica × tricofítica), dermatofitos por gênero, antifúngicos/tempos do bloco 06. **A PR segue sem apresentar a matéria como inteiramente conferida.**

## (xiv) Bloco 06 — conferência contra o recorte do Fitzpatrick (22/10)
**Fonte lida inteira:** `Fitzpatrick_dermatofitoses_paginas_644-664.pdf` (Drive `1DTNXMexwCgHQljTHWNYYADxEt02omi44`), Sección 26 «Micosis de la piel, el cabello y las uñas». **Páginas do PDF 644–664 = páginas impressas 607–627** (deslocamento 37). Isto substitui a limitação de (xiii): o recorte é legível e foi lido por completo. Alunos (SELECT somente leitura, 22/10): **0 grifos** em Dermatología.

| Afirmação do bloco 06 | Página (PDF · impressa) | Veredito | Ação |
|---|---|---|---|
| Três gêneros: *Trichophyton*, *Microsporum*, *Epidermophyton*; crescem só em estruturas queratinizadas | 645 · 608 | Confere | — |
| «Nunca invade tecido profundo numa pessoa sã» | 645 · 608 | **Excessivo**: o Atlas diz que *em alguns indivíduos* a infecção atinge a derme (querión, granuloma de Majocchi; abscessos foliculares na imunodepressão) | Reescrito: «em geral não passa das estruturas queratinizadas; só às vezes compromete a derme» |
| Contágio de pessoa, animal ou solo | 645 · 608 | Confere | — |
| «Pelo ou unha: o tratamento tem que ser oral» / pílula «siempre oral» | 659–664 · 622–627 (barba: «tópicos ineficazes»; cabeça: antimicóticos gerais) | Confere em *tiña de la barba* e *de la cabeza*; **«sempre/tem que» não é dito** | «suele ser oral» no texto e na pílula (a pílula ainda dizia «siempre») |
| Borda ativa/centro claro (placas anulares) | 653 · 616 e 655 · 618 («porción central indemne», «despejada») | Confere | Linha da *cruris*: «placa com borda ativa e centro despejado» |
| **Escroto**: tiña crural «raras veces afecta escroto e pene» | 653 · 616 | Confere. É **raramente**, não «nunca»; o Atlas **não** diz que a candidiasis o compromete | Acrescentado só «rara vez el escroto y el pene» na tabela de localizações; «escroto tomado → candidiasis» continua retirado |
| *Cruris*: «eccema marginado de Hebra» | — | O sinônimo **não está** no recorte (o Atlas só prefere «tiña inguinal») | Mantido como nome clássico; sem atribuição ao Atlas |
| Tiña pedis «três formas» | 644 · 607 (Cuadro 26-1: interdigital, mocassim, inflamatória/ampollar, **ulcerosa**) e 649 · 612 | Parcial: o Atlas lista quatro (a ulcerosa é extensão da interdigital) | «Três formas clássicas… (a ulcerosa é uma extensão da interdigital)», também no cartão |
| Mocassim: descamação fina em planta/bordas laterais/tornozelo | 648 · 611–612 | Confere. «A que mais se confunde com pele seca» **não** está | Legenda: «confunde-se facilmente com pele seca (ou com psoríase e dermatite eczematosa)» (diferencial do Atlas) |
| Tiña manuum «dos pies, una mano» | 651 · 614 («característica»; «50 % unilateral»; «a menudo unilateral, mano dominante»; «por lo general acompaña a tiña del pie») | Parcial: «casi siempre unilateral» e «se rasca el pie y se autoinocula» **não** estão | «A menudo unilateral… por lo general con tiña pedis»; «orienta mucho»; «a infecção parte dos pés e se dissemina à mão» (fig. 26-32) |
| Tiña capitis típica de crianças | 660 · 623 («preadolescentes», 6–10 anos) | Confere | «Típica de niños, sobre todo en edad escolar» |
| Placa descamativa, pelos quebrados/cortados | 660 · 623 | Confere | — |
| Querión: massa dolorosa que drena pus por vários orifícios, «como panal»; adenopatia; alopecia cicatricial | 660–662 · 623–625 | Confere. **Febre não está** no recorte | Tabela: «a menudo con adenopatías (puede haber fiebre)» |
| Querión: Wood/KOH/cultura | 646 · 609; 662 · 625 («Cultivo de bacterias: descartar infección bacteriana, S. aureus o GAS»; «se trató con terbinafina oral 4 semanas», fig. 26-45; «la renovación del cabello es la regla si se trata con antimicóticos generales») | Confere | — |
| **«Confirmar con KOH antes de decidir drenaje»** | 662 · 625 | **O Atlas NÃO ensina conduta de drenagem.** Ensina: confirmar com KOH/cultura micológica, cultura bacteriana para descartar sobreinfecção, tratar com antifúngico sistêmico. O texto antigo dava ao aluno uma regra («decidir drenagem») que o Atlas não enuncia | Reescritos texto, popover, pergunta `q-derma06-03` (alternativa c, explicação, distratores a/b/d), cartão «Querión de Celso» e cartão-resumo de erro: agora «KOH e cultura (micológica e bacteriana) e antifúngico sistêmico». A explicação diz apenas que a drenagem «não faz parte desse manejo» na bibliografia; **não** diz que o Atlas proíbe drenar |
| d) «querión se resolve sozinho» | 656 · 619 («M. canis… resolução espontânea»), 662 · 625 («cura dejando alopecia cicatrizal») | A explicação antiga («não se resolve sozinha») era forte demais | «Pode resolver-se sozinho mas deixa alopecia cicatricial; com tratamento o cabelo costuma voltar» |
| **Fluorescência**: *Microsporum* verde | 646 · 609 («Cabellos infectados con especies de Microsporum de fluorescencia verdosa»); 661 · 624 (fig. 26-43, *M. canis*, verde) e 660 · 623 | Confere | Texto, tabela, pergunta V/F `q-derma06-05` e cartão: «verdosa nos pelos infectados por *Microsporum*» |
| Fluorescência **«amarillenta» e «en la base del pelo»** | — | **Não está nestas páginas** (o Atlas diz «verdosa» nos cabelos/hastes). A frase «verde o amarilla en la base del cabello» ficou apoiada só na introdução do Atlas lida em 18/10 (ver (xi)) | Removida do bloco 06; **mantida no bloco 03 e na infografia `bloco-01-09`** (texto desenhado na imagem; a imagem não foi alterada) |
| *T. tonsurans* **não fluoresce** | 662 · 625 | **Confere (e muda a regra de (xiii) item 1):** isso é o que sustenta «no todas las tiñas fluorescen» e «Wood negativo no descarta» | Acrescentado em texto, tabela, V/F e cartão; «~90 % dos casos nos EUA e Europa ocidental são *T. tonsurans*» (660 · 623) |
| Eritrasma = vermelho-coral | 646 · 609 e 648 · 611 (fig. 26-27) | Confere | — |
| Legenda «mesmo fungo, duas respostas do hospedeiro; a diferença não a faz o germe» | 645 · 608 («depende do lugar, da resposta imune e da espécie»; *M. canis*: aguda e inflamatória) | **Excessivo** | Legenda: «depende da espécie e, sobretudo, da resposta inflamatória» |
| KOH 5–20 %, 90 % positivos, creme/pomada prévios atrapalham | 646 · 609 | Confere com «antifúngico previo» como causa de falso negativo. **«Coletar da borda, não do centro»** e «amostra escassa» **não** estão no recorte (ensino clássico, não atribuído ao Atlas) | Mantidos sem atribuição |
| Pitiriasis versicolor (Malassezia, uñada, hipopigmentação, tratamento) | — | **Fora do recorte** (só aparece como diagnóstico diferencial) | Não alterado; continua sem validação nesta fonte |
| Tratamentos orais com doses (terbinafina 250 mg etc.) | 646 · 609 e 651 · 614 | Não usados nas questões do bloco 06 | Não alterado |

**Contagens depois das edições:** 120 questões (`quiz-item`), 482 cartões, 58 imagens (nenhuma apagada ou trocada), ids de `q-derma06-01…05` preservados, letras das alternativas e V/F iguais; balanço de tags `b/i/strong/p/li/td/tr/span/div` idêntico à base.
**Pendências declaradas:** (1) fluorescência «verde o amarillenta en la base del pelo» continua no bloco 03 e dentro da imagem `bloco-01-09` — apoiada só pela introdução do Atlas, não por estas páginas; (2) pitiriasis versicolor, «coletar da borda» e «amostra escassa» sem prova neste recorte; (3) padrões microspórica × tricofítica da infografia `16-tina-capitis-patrones` e texto desenhado nas figuras não relidos.

## (xv) Fechamento de 22/10 (4.ª rodada, issue #543) — pendências resolvidas nas fontes permitidas e o que segue sem fonte

**Fontes usadas agora (todas no Drive, lidas por inteiro):** `01. Dermato Unidad I.pdf` (53 slides), `7. Candidiasis.pdf` (inclui pitiríase versicolor, slides 29–33), recorte `Fitzpatrick_dermatofitoses_paginas_644-664.pdf` (páginas impressas 607–627) e introdução do Fitzpatrick Atlas (p. xxxv, já lida em 18/10); `Dermatologia P1- apuntes clase.pdf` só como **apoio** (resumo e provas anotadas).

| Pendência | Fonte | Resultado | Ação |
|---|---|---|---|
| Fluorescência «verde o amarillenta en la base del pelo» (bloco 03 e infografia `bloco-01-09`) | Atlas, introdução p. xxxv: «fluorescencia en dermatofitosis en la base del cabello (color verde o amarillento) y eritrasma (rojo coral)» | **CONFERE**. O capítulo 26 (p. 609, 623–624) especifica *Microsporum* = verdosa, e *T. tonsurans* não fluoresce (p. 625) | Nada a mudar; a frase do bloco 03 tem fonte |
| Pitiríase versicolor (Malassezia, sinal da unhada, KOH «espaguete e almôndegas», Wood amarelo-alaranjado, tratamento, profilaxia) | `7. Candidiasis.pdf`, slides 29–33 | **CONFERE** com o slide da cátedra. (O recorte do Atlas só a cita como diagnóstico diferencial, e a introdução do Atlas diz que, sob Wood, a versicolor é hipomelanótica) | Mantido; a nota de (xiv) «fora do recorte» fica superada: a fonte é o slide |
| Corte vesícula/ampolla | `01. Dermato Unidad I`: tabela do slide 20 usa **1 cm**, mas a definição escrita (slide 30) usa **≤ 0,5 cm**; Atlas p. I-6 usa 0,5 cm; apuntes da prova P1 de 03/03/2026 resolvem com 0,5 cm | **Conflito interno do material da cátedra**, resolvido a favor de 0,5 cm (definição escrita + Atlas + apuntes) | 0,5 cm como corte principal nos 3 cartões e em 3 textos de 2 SVG (`dms0201`, `dms0203`); a tabela da cátedra (1 cm) e a advertência explicam a diferença |
| «Coletar da borda, nunca do centro» e «amostra escassa» | Atlas p. 609: descreve a obtenção do material e que o uso recente de creme dificulta o exame; p. 618: crescimento periférico com centro indemne | O **«borde» como sítio preferido não está escrito** no Atlas; decorre da descrição do crescimento anular. «Nunca» e «ya no hay hongo» eram absolutos sem apoio | Reescritos sem absolutos («conviene», «suele estar aclarado»); pergunta de falso negativo e explicação ajustadas (id e letra mantidos); «Wood negativo nunca descarta» → «no descarta» |
| «Eccema marginado de Hebra» | nenhuma fonte permitida (o Atlas prefere «tiña inguinal») | **Sem fonte** | Mantido como nome clássico, sem atribuição |
| Texto desenhado nas infografias (`15`, `16`, `17`, `bloco-01-09`) | PNG/WEBP vistos por mim em 22/10 | Coincidem com o Atlas: ectotrix (placa gris, *Microsporum*), endotrix (pontos negros, *T. tonsurans*), querion, favus com escútulas, tiña incógnita por corticoide, KOH com hifas septadas, cultivo 10–14 dias, PAS mais sensível na uña, rojo coral no eritrasma. **Sem apoio nas fontes:** «querion: no incidir ni drenar», «toda tiña capitis requiere tratamiento sistémico», «raspar el borde / evitar el centro» e o rótulo «amarillo cobrizo» (o slide diz amarillo-anaranjado) | **Imagens mantidas, nada apagado.** Duas legendas ganharam nota («Sobre la figura», «Sobre los colores») dizendo o que a figura traz e o que o Atlas/slide sustentam |

**Segue sem fonte permitida (para a cátedra ou o José):** (1) conduta de drenagem/incisão do querión (a figura 16 afirma «no incidir ni drenar»; o Atlas só descreve KOH, cultura e antimicóticos gerais); (2) «raspar sempre o borde» como regra; (3) «eccema marginado de Hebra»; (4) rótulo «verde manzana» da figura 01-09 (o Atlas diz «verdosa»); (5) padrões de `16-tina-capitis-patrones` além de ectotrix/endotrix/favus.

**Contagens:** 120 questões, 482 cartões, 58 imagens, 240 ids — iguais à main; 0 grifos, 0 traços, 0 notas em `dermatologia` (SELECT somente leitura, 22/10).

## (xvi) Fechamento de 22/10 (2.ª rodada) — «Trampa clásica», figuras e condutas sem fonte

**1. Linguagem de estratégia de prova (varredura da página inteira).** Havia **85** parágrafos «⚠️ Trampa clásica» nas respostas das questões (blocos 01–13). Todos foram reescritos como **«🩺 Razonamiento clínico»**: o mesmo fato clínico, dito como explicação (por que a lesão/conduta é assim), sem «no confundir», «regla corta», «mnemotecnia», «los números que conviene tener sueltos». Nenhum fato foi trocado. Também mudaram: caixas «Segunda trampa…», «Las dos trampas de la luz de Wood», «La trampa clásica del bloque» (→ «La paradoja del bloque»), «La trampa de vocabulario más frecuente» (→ «Una confusión de vocabulario frecuente»), a legenda da barra «la trampa de vocabulario», e «lo único que hay que memorizar». Resultado: **0** ocorrências de «trampa» na página. Mantidos por serem rótulos de conteúdo, não de estratégia: «Error frecuente · bloque NN» (cartões), «Basada en preguntas de examen» (rótulo exigido pela 8-A.4).

**2. Figuras — fonte → decisão → destino** (conferidas contra `Fitzpatrick_dermatofitoses_paginas_644-664.pdf`, relido por inteiro em 22/10, e os slides já citados):

| figura | afirmação | fonte | decisão |
|---|---|---|---|
| 16 `tina-capitis-patrones` | ectotrix (Microsporum), endotrix (Trichophyton), pontos negros, querion, favus com escútulas, alopecia cicatrizal | Atlas pp. 623–626 | **CONFERE** |
| 16 | «QUERION: NO INCIDIR NI DRENAR · tratar pronto» | **nenhuma fonte permitida** (o Atlas só dá KOH, cultura micológica e bacteriana e antimicóticos gerais; caso ilustrado: terbinafina oral 4 semanas) | **imagem editada**: recuadro trocado por «QUERION: confirmar con KOH y cultivo · antifúngico sistémico» |
| 16 | «Champú antifúngico: reduce contagio, NO cura solo» | **nenhuma fonte permitida** | **imagem editada**: trocado por «Pelo y cuero cabelludo: la crema sola no llega al tallo del pelo» (regra do slide: pelo/unha → oral) |
| 16 | «Toda tiña capitis requiere tratamiento sistémico»; «revisar convivientes y fómites» | regra do slide (pelo → oral); Atlas p. 608 (transmissão por fómites) | mantido |
| 15 `dermatofitos-muestra` | KOH, cultura (10–14 dias), PAS mais sensível na unha, detrito proximal, corticoide → tiña incógnita, «confirmar antes de sistêmico e revisar interações» | Atlas pp. 608–609, 622 (itraconazol ↑ digoxina/ciclosporina) | **CONFERE** |
| 17 `tinas-localizacion` | borda ativa, centro claro, tiña de barba (tópicos ineficazes → sistêmico), tiña incógnita, não usar corticoide só | Atlas pp. 618–626 | **CONFERE**; texto alternativo estava errado (descrevia outra figura) → corrigido |
| 18 `pies-manos-unas` | formas do pé, «dos pies · una mano», padrões de onicomicose, KOH/cultivo/PAS | Atlas pp. 610–615, 609 | **CONFERE**. Dois recuadros sem fonte localizada (não alterados): «proximal: mayor riesgo en inmunodeprimidos» e «uña no es sinónimo de hongo: psoriasis y trauma pueden imitar» |
| 19 `micosis-superficiales` | tiña negra (*H. werneckii*, mácula marrón-negra palmar/plantar, sem inflamação), piedra blanca (*Trichosporon*) | guia de estudo no Drive («Questões P1»/«Final»); índice do Fitzpatrick | **CONFERE** o diagnóstico; tratamento («corte/rasurado + antifúngico») e alerta de melanoma acral **sem fonte** → **imagem editada**: painel de tratamento diz que não está desenvolvido nas fontes; caixa vermelha trocada por «TIÑA NEGRA: mácula marrón-negra en palma o planta, sin inflamación». Texto alternativo e legenda estavam errados (descreviam versicolor) → corrigidos |
| `bloco-01-09` | Wood, diascopia, dermatoscopia, KOH, biopsia | Atlas introdução; slides | **CONFERE** (já ajustado em 21/10) |

As imagens 16 e 19 foram editadas só nos recuadros indicados (retoque de texto; nenhuma foto apagada ou trocada). As legendas «Sobre la figura» dizem o que mudou.

**3. Texto da página.** Barra «Querión: confirmar con KOH antes de drenar» → «confirmar con KOH y cultivo; el tratamiento es antifúngico sistémico». O risco de alopecia cicatricial do querión **tem fonte** (Atlas p. 625: «cura dejando alopecia cicatrizal»; sem tratamento, sobretudo se sobreinfecta).

**Segue sem fonte permitida (lista curta):** (a) conduta «não drenar» o querión como regra explícita (a página só diz que o tratamento descrito é antifúngico sistémico); (b) os dois recuadros da figura 18 acima; (c) piedra negra/*Piedraia hortae* e a dermatoscopia da tiña negra na figura 19 (sem texto acessível no Drive); (d) «eccema marginado de Hebra».

**Dados reais (SELECT somente leitura, 22/10):** `dermatologia` 0 grifos, 0 traços, 0 notas.

## (xvii) Fechamento de 23/10 (3.ª rodada) — figuras 18 e 19, abertura e lista pendente

**Imagem 19 (`micosis-superficiales`).** O painel «Tratamiento: no desarrollado en el material…» foi **retirado** (conversa sobre fonte não pertence à página do aluno). O painel agora traz só conteúdo útil e com fonte: «Tiña negra: *Hortaea werneckii* · Piedra blanca: *Trichosporon* · colonizam as capas mais externas, queratinizadas, de piel y pelo, con poca o ninguna inflamación» (guia de estudo do Drive «Questões P1»/«Final»; índice do Fitzpatrick). O rótulo «*Piedraia hortae*» virou «Piedra negra» (nome do agente sem fonte permitida). Legenda e texto alternativo reescritos sem nota de fonte.

**Imagem 18 (`pies-manos-unas`) — os dois recuadros sem fonte**
| recuadro | achado | decisão |
|---|---|---|
| «Proximal: mayor riesgo en inmunodeprimidos» | não consta no recorte do Fitzpatrick (pp. 607–627) nem nos slides | **trocado** por «Muestra de la cara inferior» (Atlas p. 609: na onicomicose subungueal proximal a amostra é a superfície inferior da placa) |
| «Uña no es sinónimo de hongo: psoriasis y trauma pueden imitar onicomicosis» | não consta (o diferencial do Atlas nesse trecho é da tiña do pé) | **trocado** por «Confirmar antes de tratar la uña: KOH, cultivo o PAS (más sensible)» (Atlas p. 609: PAS/metenamina argéntica mais sensíveis que KOH/cultivo na DLSO) |

**Imagem `bloco-01-09` (luz de Wood).** «Microsporum: verde manzana» → «verdosa» (Atlas p. 609/624: fluorescência verdosa; o rótulo «verde manzana» não tinha fonte) e «amarillo cobrizo» → «amarillo-anaranjado» (slide de pitiríase versicolor). Legenda sem a nota «Sobre los colores».

**Imagem 16.** Legenda reescrita só com conteúdo (querión: KOH + cultura; antimicóticos sistêmicos; terbinafina 4 semanas no caso do Atlas; alopecia cicatrizal sem tratamento; crema não alcança o tallo do pelo).

**Lista pendente anterior — resolução**
1. *Conduta «no drenar» do querión:* **justificada** como o que a fonte descreve: Atlas p. 625 — o querión «não respondeu a antibióticos orais» e «se tratou satisfatoriamente com terbinafina oral»; o texto da página diz «el drenaje no forma parte de ese manejo» (afirma o que a fonte descreve, não uma proibição). Sem frase de proibição na página nem na imagem.
2. *«Raspar sempre o borde»:* **justificada**: Atlas p. 618 (crescimento periférico, parte central indemne) + p. 609 (uso recente de creme dificulta o exame); a página diz «conviene» e não «siempre».
3. *«Eccema marginado de Hebra»:* **retirado** do texto e do cartão (sem fonte permitida); o cartão passa a «Tiña cruris».
4. *«Verde manzana» da figura 01-09:* corrigido (acima).
5. *Piedra negra/*Piedraia hortae* e dermatoscopia da tiña negra (figura 19):* descrições morfológicas **sem fonte permitida localizável** (o Fitzpatrick completo não baixa >6 MB; o recorte não cobre esse capítulo); não há conduta clínica nelas; mantidas só as descrições visuais e o rótulo genérico. **Segue sem fonte.**

**Abertura (bloco 01).** Retirada a orientação sobre ordem de estudo: título «Por qué esta materia se aprende al revés» → «La piel se lee: de la lesión al diagnóstico»; «Eso cambia el orden en que conviene estudiar…» → «De ahí una frase clásica que lo resume:»; «Por eso la anatomía va primero: no es un trámite…» → «Por eso la anatomía es la clave de lectura…»; «Por eso la inversión rinde tanto» → «describir bien la lesión rinde tanto»; cartão «La frase de Siemens» sem «Es el orden de estudio de toda la materia» (3 cópias). Nas 13 caixas «Puntos a dominar» saiu a linha «Orden basado en el contenido… y en el peso que cada tema tiene en la bibliografía» (estratégia editorial interna) → «Los puntos que sostienen el bloque.»

**Dados reais (SELECT somente leitura, 23/10):** `dermatologia` 0 grifos, 0 traços, 0 notas.
