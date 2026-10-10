# Anatomía Patológica II — matriz de fontes (auditoria 2026-10-10)

Rodada de auditoria independente pós-PR#458, aberta por
`coordination/AUDITORIA-2026-10-09-EDITORIAL-E-PILOTO.md`. Este documento
registra a matriz fonte/página → conteúdo atual → decisão → destino exigida
pela Lei de Atualização Contínua (§13) para os 6 PDFs de anotações e os 4
slides oficiais da cátedra que estavam pendentes/parciais em #455.

Arquivo auditado: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/anatomia-patologica-ii.html`.

PR relacionada: [#476](https://github.com/Repassomed/Repasso-Med-Site-/pull/476) (branch `claude/anatomopatologia-ii-review-69`, não mergeada).

## Método

- Os 6 PDFs de anotações ("Anatopatologia II/Anotações" no Drive) chegaram
  como JSON com `content` em base64 de um PDF real. Decodificado o base64 e
  extraído texto com PyMuPDF página a página — todos os 6 foram lidos na
  íntegra (15, 9, 4, 2, 3 e 4 páginas respectivamente, sem truncamento).
- Os 4 slides oficiais ("Anatopatologia II/Slides", arquivos 4/5/7/8 —
  marcados "pendente/parcial" em #455) foram lidos via
  `mcp__Google_Drive__read_file_content`.
- Cada achado foi cruzado com `grep`/leitura direta do HTML vigente.

## Tabela de achados (fonte → achado → status no site)

| Fonte | Seção aprox. | Achado | No site? | Onde / observação |
|---|---|---|---|---|
| Cavidade oral.pdf | p.1 | Aftas/herpes/candidiasis: causas, latência trigêmeo, fatores de reativação do herpes (trauma, alergia, UV, temp. extrema, IVAS, embarazo, menstruação, imunodepressão) | Sim | linhas 526-538, lista completa e igual |
| Cavidade oral.pdf | p.1-2 | Candidiasis: 3 formas clínicas (pseudomembr., eritematosa, hiperplásica) + única com indicação de biópsia (hiperplásica) | Sim | linha 529 |
| Cavidade oral.pdf | p.2 | Leucoplasia 5-25% displásica; Eritroplasia ~90% displasia grave/CIS/carcinoma mín. invasivo | Sim | linhas 553-555 |
| Cavidade oral.pdf | p.2 | Carcinoma epidermoide: 95% dos cânceres orais; 2 vias (álcool/tabaco→TP53/RAS; HPV-16→p16↑/inativa RB, TP53 via E6) | Sim | linhas 693-698; E6 adicionado nesta rodada (PR #476) |
| Cavidade oral.pdf | p.2 | "los que sobreviven representan un riesgo hasta del 35% de desarrollar al menos un tumor primario nuevo" (2º tumor primário) | **NÃO** | ausente — número vem só da anotação do aluno, não verificado contra literatura-base com essa precisão. **Pendência.** |
| Cavidade oral.pdf | p.2 | Metástase a distância do CEC oral: ganglios mediastínicos, pulmones, hígado, huesos (além dos cervicais) | **NÃO** | site só menciona "ganglios cervicales" nas primeiras metástases. **Pendência.** |
| Cavidade oral.pdf | p.2-3 | Glândulas salivales: xerostomía >70 años, Sjögren; sialoadenitis viral (bilateral) vs bacteriana (unilateral, S. aureus/viridans); mucocele mecanismo | Sim | linhas 706-716 — site inclusive amplia (ránula, Stenon/Wharton) |
| Cavidade oral.pdf | p.3 | Neoplasias salivales: localização×%×malignidade (parótida 65-80%/15-30%; submandibular 10%/40%; menores 70-90%) | Parcial | site dá a regra "risco inversamente proporcional ao tamanho" + % por glândula — números próximos mas tabela benignos/malignos por tipo específico não está como tabela, só texto corrido |
| Cavidade oral.pdf | p.3-4 | Adenoma pleomorfo: achados histológicos marcados "pregunta examen" explícito | Sim | linhas 724, 731-734 |
| Cavidade oral.pdf | p.4 | Tumor de Warthin: 10% multifocal, 10% bilateral, fumadores risco maior, 50-70 anos | Sim | linha 727, 732 |
| patologias do esofago.pdf | p.1-2 | Acalasia: tríade, primária/secundária (Chagas, VHS-1, Sjögren, tireoidopatia autoimune) | Sim | site até acrescenta NO/VIP |
| patologias do esofago.pdf | p.1 | Mallory-Weiss: 10% das HDA | Sim | — |
| patologias do esofago.pdf | p.1-2 | Esofagitis infecciosa: VHS (úlceras em sacabocado, margem), CMV (fundo), Candida (PAS + metenamina de plata) | Sim | — |
| patologias do esofago.pdf | p.2 | **"Tema de examen"** explícito: tríade microscópica da esofagitis por refluxo — eosinófilos→neutrófilos; hiperplasia basal >20%; papilas até terço superior | Sim | números e ordem idênticos |
| patologias do esofago.pdf | p.2-3 | Barrett: homens brancos 40-60a; segmento longo/curto (3cm); progressão ERGE→inflamação→metaplasia→displasia→adenocarcinoma | Sim | — |
| Patologias do estomago.pdf | p.1 | Erosão vs úlcera (membrana basal); úlceras de estrés/Curling/Cushing | Sim | — |
| Patologias do estomago.pdf | p.2 | H. pylori: antro 90%, fatores de virulência, tinções (azul de metileno, plata) | Sim | — |
| Patologias do estomago.pdf | p.3 | Gastritis autoinmune: anticorpos céls parietais+fator intrínseco, ↓pepsinogênio I, hiperplasia céls endócrinas, déf. B12, hipocloridria | Sim | — |
| Patologias do estomago.pdf | p.4 | "Transformación maligna (muy frecuente)" como complicação da EUP (anotação do aluno) | **Corretamente ausente** — afirmação cientificamente imprecisa (úlcera benigna não "se transforma" com frequência); o site não a reproduz |
| Tumores gastricos.pdf | p.1 | 6 marcações explícitas "tema de examen": lesões precursoras (displasia/adenoma), CDH1/E-caderina, Lauren, achado micro/macro do difuso, Borrmann, profundidade+linfonodos como prognóstico | Sim | — |
| Tumores gastricos.pdf | p.1 | Hierarquia: Virchow e Krukenberg são **os dois mais cobrados** entre os 5 sinais metastásicos | **Parcial/divergente** | o site lista os 5 sinais com o mesmo peso editorial ("prioridad alta"). **Pendência — ver §Padrão docente.** |
| Tumores gastricos.pdf | p.2 | MALT/linfoma gástrico: "cuerpos de Russell" e "diferenciación plasmocítica en 40% de los casos" | **NÃO** | detalhe histológico avançado, baixa prioridade didática. **Pendência menor.** |
| perguntas questões.pdf | — | Seção "Perguntas que caíram em prova" (11 perguntas literais) | Sim | todas as 11 têm equivalente no site |
| perguntas questões.pdf | Q29 | "Cita los genes afectados... Resposta: P53 y P63" | **Corretamente não incorporado** — contradiz o próprio Resumo P1.pdf/Cavidade oral.pdf (TP53/RAS, correto); erro de anotação do aluno |
| perguntas questões.pdf | Q30 | "Qué proteínas se expresan o inactivan en HPV-16? E6 y E7" | Parcial→Sim | E7 já estava; **E6 adicionado nesta rodada** (PR #476) |
| Resumo P1.pdf | p.14-15 | "PUNTOS IMPORTANTES PARA EL EXAMEN" — 16 pontos-chave do bloco estômago | Sim, individualmente | dispersos pelo texto, não concentrados num único lugar — observação estrutural, não lacuna de conteúdo |
| Slide oficial 4 — Tumores 2 | Borrmann | Classificação de Borrmann I-IV | Sim | texto confere |
| Slide oficial 5 — Patologías del intestino | Crohn×CU | Granulomas: slide sugere **~35%** para Crohn | **Divergência numérica não resolvida** | site diz 40–60% (3 ocorrências). Slide veio com OCR degradado — **não alterado sem releitura confiável. Pendência.** |
| Slide oficial 5 | Crohn×CU | Malabsorción de grasas/vitaminas listada como manifestação de Crohn | **Adicionado nesta rodada** (PR #476) | esteatorrea/déficit de B₁₂ por compromisso ileal |
| Slide oficial 7 — Px hepáticas | — | **ILEGÍVEL** — `read_file_content` retornou só marcadores de página, sem texto recuperável | Não auditado | confirma a suspeita de #455. **Pendência total.** |
| Slide oficial 8 — Patologías tiroideas | Hashimoto | Mecanismo celular detalhado (Fas/FasL, CD4/CD8, macrófagos) | Não aprofundado | site resume como "autoinmune: anti-TPO/antitiroglobulina" — possível decisão editorial válida, não lacuna óbvia |

## Evidências de padrão docente (ênfase explícita da cátedra)

1. **Tumores gastricos.pdf, p.1**: "Localizaciones frecuentes de metastasis:
   **(tema de examen los dos primeros principalmente)** 1. Virchow 2.
   Krukenberg 3-5. [outros três]" — evidência direta de que a cátedra
   pondera Virchow+Krukenberg mais que os outros 3 epônimos. **Ainda não
   refletido no site**, que trata os 5 com peso editorial igual.
2. **Tumores gastricos.pdf, p.1**: CDH1/E-caderina no tipo difuso — "clave
   en el desarrollo del tumor — tema de examen".
3. **Tumores gastricos.pdf, p.1**: "Clasificación de Lauren... (tema de
   examen - cita)" — pede citar os 2 tipos, não só reconhecer.
4. **Tumores gastricos.pdf, p.2**: "La profundidad de la invasión y la
   extensión de la metástasis ganglionares... siguen siendo los
   indicadores pronósticos más potentes (tema de examen)".
5. **patologias do esofago.pdf, p.2**: tríade da esofagitis por reflujo
   marcada "Tema de examen" — já bem coberta.
6. **perguntas questões.pdf**: seção "Perguntas que caíram em prova" é a
   evidência mais direta de todas — todas as 11 têm equivalente no banco.
7. **Padrão de raciocínio recorrente** (estômago/esôfago): a cátedra cobra
   sistematicamente **cascatas em ordem** (H. pylori→pangastritis→atrofia→
   metaplasia→displasia→adenocarcinoma; ERGE→Barrett→adenocarcinoma) e
   **classificações com nome próprio para "citar"** (Lauren, Borrmann,
   tríades) — não só reconhecer o conceito, enumerar a sequência completa.

Essa evidência não deve virar texto explícito no site (G0 §6 — prioridade
didática silenciosa). O ajuste correto seria dar mais destaque/clareza ao
par Virchow/Krukenberg sem dizer por quê; **não realizado nesta rodada**
para não arriscar prosa apressada — fica como pendência para revisão
dedicada.

## Limitações reais

- **Slide 7 (Px hepáticas) é ilegível** — nenhum conteúdo verificado. Não
  tratar como auditado.
- **Slides 4 e 8 vieram majoritariamente ilegíveis** (OCR picotado); só
  foram recuperados com confiança a classificação de Borrmann (slide 4) e
  um diagrama parcial do mecanismo de Hashimoto (slide 8). O resto desses
  dois slides não foi auditado.
- **Slide 5** foi o mais legível dos 4, mas ainda com ruído disperso — não
  há garantia de que faltem outras seções do mesmo arquivo além da tabela
  Crohn×CU.
- Os 6 PDFs de anotações são anotações de aluno, não a fala literal da
  cátedra — têm pelo menos 2 inconsistências científicas internas (gene
  "P63" vs "RAS"; "transformación maligna muy frecuente" da EUP), ambas
  corretamente não incorporadas ao site.
- Não foi feita comparação com a mesma profundidade para os blocos de
  Pólipos/CCR, Fígado e Tireoide, porque as fontes-PDF fornecidas cobrem
  principalmente oral/esôfago/estômago/tumores gástricos; os achados dos
  slides 5/7/8 foram comparados apenas nos pontos extraídos.

## Resumo executivo

Cobertura geral do site para os blocos auditados é **muito alta e
cientificamente sólida** — a rodada anterior (PR#458) já integrou quase
tudo, inclusive indo além dos PDFs em mecanismo (VacA/CagA, somatostatina,
células ECL). Lacunas reais e verificáveis, em ordem de prioridade:

1. Hierarquia Virchow+Krukenberg > outros 3 sinais metastásicos — evidência
   direta de ênfase da cátedra, não refletida no site. **Pendente.**
2. Granulomas no Crohn: 40–60% no site vs. ~35% no slide oficial (OCR
   degradado, não confiável sem releitura). **Pendente.**
3. Risco de 2º tumor primário e metástases a distância do CEC oral — número
   não verificado na literatura-base. **Pendente.**
4. Corpos de Russell / 40% diferenciação plasmocítica no MALT gástrico —
   detalhe avançado, baixa prioridade. **Pendente menor.**
5. Mecanismo celular detalhado de Hashimoto — possível decisão editorial
   válida manter o resumo atual mais simples.

Nenhuma incoerência científica foi encontrada no site; as únicas
incoerências estão nas fontes de anotação do aluno, e o site corretamente
não as reproduz.

## Rodada AP5 — autodenúncia residual (verificação manual real, não scan)

Uma rodada anterior desta mesma PR (#476) declarou "zero autodenúncias
restantes" com base em varredura por regex. O auditor comprovou, por
leitura direta do HTML publicado, que essa declaração estava errada: cinco
casos continuavam no `HEAD` então vigente (`2e8ab551`). O regex falhava em
três frentes — variações de frase ("como ocurre en" vs. o padrão buscado
"como en"), pistas implícitas sem palavra-gatilho nenhuma ("menos expuesta
al carcinógeno", "poco contacto con el carcinógeno") e construções
introduzidas pela própria rodada anterior ao tentar corrigir outro ponto
("algo que esta translocación no refleja").

Nesta rodada (AP5), o método mudou: leitura manual, linha a linha, do
`git diff` completo entre a base da PR e o `HEAD` (1343 linhas, as duas
cópias — corpo e Banco geral — de cada questão alterada), sem apoio de
regex para decidir o que é ou não autodenúncia. Resultado:

### Os 5 casos apontados pelo auditor (confirmados e corrigidos)

| # | Questão | Alternativa | Frase removida | Correção |
|---|---|---|---|---|
| 1 | Eritroplasia oral | c | "como ocurre en el síndrome de Plummer-Vinson" | "con palidez de la mucosa y queilitis angular concomitante" |
| 2 | Localización CEC oral | a | "menos expuesta al carcinógeno estancado" | "sobre la mucosa masticatoria queratinizada" |
| 2 | Localización CEC oral | c | "poco contacto con el carcinógeno" | "cerca de los conductos de salida de las glándulas salivales menores" |
| 3 | Linfoma MALT/t(11;18) | b | "algo que esta translocación no refleja" | "con compromiso ganglionar mediastínico asociado" |
| 4 | Adenoma hepático × HNF | c | "algo que no forma parte de esta lesión" | "con histiocitos epitelioides, intercalados en el parénquima de la HNF" |
| 5 | Graves × carcinoma papilar | b | "un hallazgo del carcinoma papilar" | "en el estroma folicular" |
| 5 | Graves × carcinoma papilar | c | "otro rasgo del carcinoma papilar" | "en las células foliculares" |

Em todos os 7 pontos, a identificação da doença correta (Plummer-Vinson,
localização real do CEC oral, MALT, HNF, carcinoma papilar) já estava ou
permanece exclusivamente na explicação (`<div class="answer">`), nunca na
alternativa.

### Casos adicionais encontrados pela leitura manual (não citados pelo auditor)

A leitura integral revelou três questões adicionais com o mesmo padrão,
que o regex da rodada anterior também não detectou:

| # | Questão | Alternativa(s) | Problema | Correção |
|---|---|---|---|---|
| 6 | Colangiocarcinoma — etiología | a, b, d | as três nomeavam explicitamente a doença "dona" do fator de risco: "los mismos factores del adenoma hepático" (a), "los factores clásicos del carcinoma hepatocelular" (b), "ambos del carcinoma hepatocelular" (d) | a) "en una mujer joven sin hepatopatía de base"; b) "de larga data... con sobrecarga férrica hepática"; d) "ambiental... e infección crónica por el virus de la hepatitis B" |
| 7 | Linfoma MALT (30% / origem) | b | dentro de uma questão sobre o próprio MALT, a alternativa (b) confirmava o traço diagnóstico do MALT ("sin las lesiones linfoepiteliales que sí tiene el MALT") — autodenúncia cruzada dentro do mesmo item | "con centros germinales conservados y sin atipia citológica" (descreve hiperplasia linfoide reativa, um diferencial real, sem citar o traço do MALT) |
| 8 | Carcinoma medular × MEN 2 | a, c | a) se autocontradizia com o próprio enunciado do caso ("tumores bilaterales y multifocales" vs. opção dizendo "de curso habitualmente unifocal"); c) declarava a própria razão de estar errada ("que no se origina en células C") | a) "sin necesidad de estudio genético ni de los familiares" (consequência clínica errada, sem contradizer o enunciado); c) "no diagnosticado previamente" (plausível sem entregar a resposta) |

Em todos os 8 pontos a explicação (`<div class="answer">`) já continha ou
passou a conter a identificação correta; nenhuma alternativa foi reduzida
a uma opção implausível — cada uma recebeu um detalhe clínico/histológico
real e do mesmo registro, mantendo um distrator forte.

### Verificação real executada (não apenas declarada)

- **Leitura manual completa** do diff cumulativo da PR (1343 linhas, duas
  cópias por questão — corpo e Banco) linha a linha, sem regex, cobrindo
  toda matéria alterada desde a base da PR.
- **Gabaritos**: nenhum alterado; apenas reordenação/reescrita de
  distratores (Lei 8-A.7/8-A.9).
- **Espelho corpo×Banco**: `Edit … replace_all` aplicado às 8 correções —
  confirmado por grep que cada frase nova aparece exatamente 2× (corpo +
  Banco) e cada frase antiga, 0×.
- **Highlights (motor real)**: reexecutado `rm-tools.js` (`indexar` →
  `escolher` → `rangeDe`) contra as 375 marcações reais dos blocos
  ap2b01–04. Resultado: **0 quebradas** por esta rodada, 1 deslocamento de
  posição inofensivo (ainda resolve corretamente), 2 já quebradas antes
  desta rodada (pré-existentes, documentadas em rodada anterior).
- **Tinta/notas**: sem registros para `anatomia-patologica-ii` em
  `user_ink_strokes`/`user_notes` (0 linhas) — sem risco por ausência de
  dado, confirmado em rodada anterior e não alterado nesta.
- **HTML**: tags balanceadas (div/ul/li/p/span/button/strong/i/b, todas
  pareadas) após a edição.
- **Guard** (`python3 -m tools.qa.guard --repo . --base main --head HEAD`,
  com `main` local sincronizado a `origin/main`): 🟡 passou com avisos
  informativos esperados (escopo sem task declarado, origem do Guard
  "desconhecida" por execução local, task do registro sem arquivos
  declarados) — nenhum alerta de autodenúncia, gabarito, espelho ou HTML.
  Regras do Guard não foram alteradas.

### Pendências que seguem sem solução nesta rodada

Os slides 4, 5, 7 e 8 (ver seção "Limitações reais" acima) continuam
parcial/totalmente ilegíveis. Esta rodada não tentou nova extração —
isso é o próximo passo, feito em sequência a este checkpoint, com
imagens/OCR quando necessário, sem inventar cobertura de material
ilegível.
