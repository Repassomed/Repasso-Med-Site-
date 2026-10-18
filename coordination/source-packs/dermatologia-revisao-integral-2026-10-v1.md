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
