# Medicina Familiar · estado da conferência (Claude 1, 16–17/10/2026)

**Nível desta entrega:** *correção pontual pronta* — **não** é «matéria inteira conferida».

## Fontes realmente lidas (Drive)
- `Medicina familiar.pdf` (slides, OCR ruidoso), `mf_compressed.pdf` (Dra. Gauto, 5.º semestre), `medicina familiar instruções.docx`.
- Conteúdo: APS, princípios de McWhinney, pilares, tipos de família, familiograma, título do APGAR. **Nada** de peso, estatura, fontanelas, marcos do desenvolvimento nem índices antropométricos.
- A subpasta `Imagens` contém só infográficos gerados para o próprio site (não são fonte). McWhinney, Rakel, PROFAM e curvas OMS **não estão** no Drive.

## Blocos
| bloco | estado |
|---|---|
| `aps`, `principios`, `familiograma` | conteúdo coincide com os slides lidos nos pontos que eles cobrem; demais afirmações **não conferidas** |
| `apgar` | só o título consta no slide; **não conferido** |
| `crisis`, `educacion` | **sem fonte lida**; não conferidos |
| `crecimiento`, `desarrollo` (bloco 06) | **NÃO CONFERIDO**: fórmulas de peso, 50→75 cm, fontanelas, hitos e índices <2 anos sem fonte legível |

## Mudanças desta PR
Voz G0; apresentação/mapa/fontes removidos do começo; a caixa «confusiones frecuentes» foi para o fim (antes do banco), com o texto grifado intacto, para preservar o grifo de aluno; questão do niño de 16 meses sem contradição.

## Bloco 06 — o que continua SEM fonte (lista explícita)
Nenhuma destas afirmações foi conferida com slide ou livro legível; ficam **como estavam** e não devem ser tratadas como verificadas:
- **`crecimiento`:** peso (duplica em 4–5 meses, triplica ao ano, quadruplica aos 2 anos; perda de até 10 % na 1.ª semana e recuperação em ~2 semanas; ganho de 20–30 g/dia; «insuficiente < 20 g/dia»); fórmulas de peso esperado (3–12 meses, 2–6 anos, 7–15 anos) e «não há fórmula entre 12 meses e 2 anos»; estatura 50 cm → ~75 cm no 1.º ano (incluída a **nota de conflito 12 cm × 25 cm** do apunte e das referências OMS); ritmos mensais (1,5 → 1 → 0,5 cm/mês e ~3 → ~2 → ~1,5 cm/mês); fontanela posterior (2–4 meses) e anterior (9–18 meses); etapas da infância e faixas etárias; índices P/E, T/E e P/T < 2 anos.
- **`desarrollo`:** marcos (sorriso social 1–2 m; sustenta a cabeça 3 m; controle total 4 m; senta com apoio ~6 m e sem apoio 8–9 m; ansiedade de estranhos ~8 m; pinça 9–12 m; primeiras palavras ~12 m; caminha ~12–15 m; pensamento simbólico 18 m); ganhos de peso e estatura por trimestre e por faixa (400/250 g/mês; 1,5 cm/mês; ~2 kg/ano; 5–7 cm/ano).
- As questões e cartões desse bloco repetem esses mesmos números.
Fontes que resolveriam: McWhinney/Rakel (base do curso) ou os slides de crescimento e desenvolvimento da cátedra, ausentes do Drive.

## Contagem dos grifos (consulta SOMENTE LEITURA, 2026-10-20)
**18 grifos no total para `medicina-familiar`, de 1 usuário: 17 em `aps` + 1 em `portada-medfam`** (a palavra «Longitudinalidad»). A frase anterior «todos em `aps` e 1 em `portada-medfam`» estava ambígua; o certo é 17 + 1. O teste no navegador agora usa **os 18**: antes da PR 18/18 pintados e a página abria em «El mapa de la materia»; depois **18/18 pintados, sem selo de marcas pendentes, e a página abre em «APS · Atención Primaria de Salud»**. (O teste anterior usava só 2 grifos representativos, 1 da portada e 1 de `aps`; por isso eu dizia «2/2».)

## Revisão completa de leitura (2026-10-22, issue #543) — fonte → decisão → destino
**Fontes lidas (Drive):** `Medicina familiar.pdf` (slides, OCR ruidoso), `mf_compressed.pdf`, `medicina familiar instruções.docx`. Nada novo para crescimento/desenvolvimento, McWhinney, Rakel ou curvas OMS.

| Achado | Fonte | Decisão | Destino |
|---|---|---|---|
| Legendas de infográfico e fecho com voz de prova («donde la pregunta busca el error», «trampa» ×3, «cuando la pregunta insinúa», «resuelven la mayoría de las preguntas», «este material vio repetirse», «no entra en ninguna pregunta suelta») | G0 | Reescritas em voz neutra, sem mexer nos fatos | blocos aps, principios, familiograma, educación, cierre |
| Nota de margem «línea cortada = conflicto o ruptura» contradizia as figuras da guia (distante = tracejada, conflito = zigzag, ruptura = linha cortada) e o cartão | figuras da própria página + slide «Relaciones interpersonales» (muy estrecha, conflictiva, cercana, distante, quiebre) | Nota: doble = muy unida; punteada = distante; zigzag = conflicto; cortada = ruptura | familiograma |
| Slide «Tipos de familia» traz «familia adoptiva: hijos sin parentesco sanguíneo»; a página só dizia «de acogida» | `Medicina familiar.pdf` | Acrescentado «(também família adoptiva)» nas duas tabelas | familiograma |
| Cartão «Formas de adquirir lazos familiares» duplicado (bloco e baralho geral) | — | Segundo cartão virou «Lazo por afinidad» (conteúdo já ensinado); contagem de cartões igual | 2 cópias |
| Tabela de hitos: «18 m: no camina solo» parecia contradizer o limite de 15 m da marcha | texto da própria página | «No camina solo (ya pasó el límite de 15 meses)» | desarrollo |
| Etapas da infância: escolar 7–10 × 6–10 × 6–11 em três tabelas | texto da página | Nota «(6–10 o 6–11 según la fuente)» | crecimiento |
| Cartões/perguntas (pantallas, rendimiento escolar, anamnesis amplia, perímetro cefálico ~35 cm, primeiros dentes ~6 m, talla = edad×6+77) sem ensino prévio no resumo | os próprios cartões/perguntas | Dois parágrafos curtos nos resumos (mesmas afirmações, **sem fonte conferida**) | crecimiento, desarrollo |
| Pergunta do banco «¿A qué edad… camina, dice palabras…?»: alternativa «Al año» também defensável | tabela de hitos da página | Enunciado → «camina con soltura, dice frases de dos palabras, … come solo con cuchara»; gabarito (b) e alternativas iguais; ponte `data-guard-previous-stem-sha1` | banco |
| Bibliografia repetida (fim do bloco 07 e fecho) | — | Removida a do bloco 07; fica a do fecho | educación |
| Ponte `data-guard-previous-stem-sha1` da questão do niño de 16 meses já está na main (ficou inválida contra a base) | Guard | Atributo removido; questão e resposta intactas | crecimiento |

**Contagens antes×depois:** 90 itens de pergunta, 36 interativos, 65 «Ver respuesta», 177 cartões, 21 imagens (todas com `alt` descritivo), `data-correct` iguais. **Grifos:** 18 (17 `aps` + 1 `portada-medfam`) 18/18 antes e depois.

**Continua sem fonte legível (não declarado verificado):** crescimento e desenvolvimento inteiros (pesos, fórmulas, talla 12 × 25 cm, fontanelas, hitos, índices), APGAR (só o título está no slide), crisis familiar e Doherty & Baird, educación para la salud, prevención cuaternaria (Jamoulle), cortes de Leavell e Clark, Pc 10–90 × 3–97, datos do ESF (600 famílias). Bibliografia lista Rakel, PROFAM, McWhinney e Smilkstein, que **não estão no Drive**.
