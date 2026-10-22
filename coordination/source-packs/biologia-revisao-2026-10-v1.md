# Biología — revisão de leitura (2026-10-22, issue #543)

**Nível:** correção limitada de LEITURA (abertura → última pergunta). **Não** é revisão científica concluída.
Nenhuma PR aberta alterava `biologia.html` (verificado por diff de todos os ramos abertos contra a main).

## Fontes lidas (Drive) e o que cobrem
| Fonte | Cobre | Uso nesta PR |
|---|---|---|
| `UNIDAD II BIOLOGÍA PARTE 1.pptx.pdf` | Introdução da unidade, água e sais, carboidratos (até glicoproteínas) | Conferidos blocos 01–03 |
| `UNIDAD IV BIOLOGÍA-1.pdf` | Citosol (pH 7,2, inclusões sem membrana, chaperonas hsp60/70/90, proteassomas, ribossomos) | Conferido o começo do bloco 09 |
| `UNIDAD VIII …pptx.pdf` | Comunicação intercelular | Bloco 15 já conferido nas PRs #469/#471; **não rerrevisado** aqui |
| `De-Robertis … 16ª Ed.pdf` | Livro-base | Usado nas PRs anteriores (Golgi/RE); **não relido** nesta |
| `Cuestion P1`, `6./7. Questionario`, `Biologia P2` | Questões de prova | Só como contexto; não são fonte de conteúdo |

**Não há no Drive** slides de: Unidade II parte 2 (ácidos nucleicos, aminoácidos, proteínas, lípidos), III (membrana, transporte), V (citoesqueleto), VI (MEC e uniões), VII (endomembranas, mitocôndria), IX (núcleo) e X (ciclo, meiose, fecundação). Esses blocos **seguem sem conferência com a cátedra** nesta PR.

## Fonte → decisão → destino
| Achado | Fonte | Decisão | Destino |
|---|---|---|---|
| Sal, água, carboidratos: 75–85 % água, 2–3 % sais, K⁺/Mg²⁺ dentro e Na⁺/Cl⁻ fora, fosfato e bicarbonato, oligoelementos (Mn, Cu, Co, I, Se, Ni, Mo, Zn), 1:2:1, oligossacarídeos 3–10, GAG e localizações, homopolissacarídeos | Unidad II parte 1 | **Conferidos, coincidem.** O slide diz que a sacarose junta glicose com uma «pentose (frutose)»; a página (frutose + glicose, sem «pentose») **não** repete esse deslize | blocos 01–03 |
| «Ácido hialurônico é o único GAG não sulfatado» | não consta no slide lido | **Mantido; sem fonte da cátedra nesta PR** | bloco 03 |
| Citosol (pH 7,2, inclusões sem membrana, hsp60/70/90, proteassomas) | Unidad IV | Conferido | bloco 09 |
| Voz de prova: «Trampas clásicas» (×9), «es la pregunta con trampa», «cae:» nas explicações (×6 trocados por «es falsa:»), «se pregunta / suele preguntar / la mitad de las preguntas / pregunta segura / memoria pura / chuleta», «La cátedra lo marca como IMPORTANTE», «es una pregunta de cierre» | G0 | Reescritos em voz de estudo, fatos intactos (sem grifos de alunos nesta matéria) | blocos 01–14 e espelhos do banco |
| Ortografia «desnaturación» (11 ocorrências) | — | → «desnaturalización». A pergunta V/F cujo enunciado tinha a grafia (bloco 06 e banco) recebeu a ponte `data-guard-previous-stem-sha1`; resposta e posição iguais | bloco 06, banco |
| Margem do bloco 09: «microfilamento 7 nm» × texto «8 nm» e figura «7–8 nm» | texto/figura da página | Margem passa a «7–8 nm» (sem fonte do tamanho exato) | bloco 09 |
| Duas notas de erro de FIGURA (dipeptídeo desenhado N–CO; «transtorias») | as próprias figuras | Mantidas em tom neutro («Nota sobre la figura…»). **As figuras NÃO foram corrigidas**: pendência de arte | blocos 05 e 09 |

## Contagens antes × depois
320 itens de pergunta (160 pares bloco/banco, o texto «160 preguntas · 103 + 57» confere), 242 «Ver respuesta», 410 cartões (205 pares, o texto «205 tarjetas» confere), 39 imagens (todas com `alt` descritivo, todas carregam), 21 ids, **968 alternativas e sequência de respostas idênticas**.

## Pendências que dependem de fonte
Slides das unidades II (parte 2), III, V, VI, VII, IX e X; De Robertis para cada afirmação dos blocos 04–14 e 16; o detalhe «único GAG não sulfatado»; correção das duas figuras.
