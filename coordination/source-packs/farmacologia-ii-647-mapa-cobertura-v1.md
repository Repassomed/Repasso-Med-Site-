# Farmacología II · issue #647 · mapa de cobertura dos slides e decisões (documento interno)

**Atualizado:** 12/11/2026 (6.ª rodada, mesma PR #649) · **Agente:** Claude 2 · **Branch:** `claude/farmaco2-issue-647-2026-11` · **Base:** `main` `7f329241` · **PR de layout #644:** aberta, arquivos disjuntos; `temas`/`real`/`integracao-farmaco2` e `visual-conteudo` repetidos com este HTML.
Alvo único: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html`.

## 1 · Fontes (pasta Drive «Slides atualizados» de Farmacología II) e o que foi realmente lido
| Arquivo | Drive (modif.) | Bloco(s) | Leitura nesta PR | Limite |
|---|---|---|---|---|
| `01 - farmaco II-antihipertensivos 2026-2.pdf` | 27/08 | b02, b03 | texto lido **até «Eficacia clínica de los I.E.C.A.»** | a leitura do Drive trunca o arquivo; **o trecho final não pôde ser lido** (download falhou: resposta grande demais para o conector) |
| `03 - antianginosos.pdf` | 29/09 | b05 | texto integral | páginas só-imagem, se houver, não vistas |
| `04 - Antiagregantes.pdf` | 29/09 | b04 | texto integral | idem |
| `05 - Antiinflamatorios esteroideos.pdf` (= `Antiinflamatorios esteroideos 2025.pdf`, mesmo tamanho) | 22/10 | b07 | texto integral **e imagens**: cópia local de 50 páginas renderizada; a Tabela 46-2 foi conferida **visualmente** | — |
| `06 - SISTEMA RESPIRATORIO.pdf` | 22/10 | b08 | texto integral | idem |
| `Fármaco II a y b bloq 2026.pdf` (52 págs., 34 MB) | 25/08 | b01 | **texto de todas as páginas com texto (1–52)** | **páginas 7, 15, 21, 25, 44 e 45 são só imagem e não puderam ser vistas** (limite de 10 MB do conector e rede bloqueada para `drive.google.com`) |
Blocos 09–14 (antiácidos, tiroides, hipoglucemiantes, insulinas, antiarrítmicos) **não têm slide na pasta**: não se declara cobertura de slide para eles.

## 2 · Tabela por célula (b07 §4.2) · fonte exata e conferência visual
Fonte: **«05 - Antiinflamatorios esteroideos.pdf», página 21 (imagem do slide: «TABELA 46-2 · Efectos inhibidores de los glucocorticoides en respuestas inflamatorias/inmunes»)**. Não consultei o livro de onde a tabela vem; no site a atribuição é só ao slide. Conferência linha a linha com a imagem:
| Linha do site | Na imagem do slide | Resultado |
|---|---|---|
| Macrófagos e monócitos | AA, PG e Lt; citocinas IL-1, IL-6 e TNF-α; «mediado por inibição de COX-2 e PLA₂»; produção e liberação bloqueadas; citocinas ↑ células T e ↑ proliferação de fibroblastos; «incluyendo el tercer componente del complemento» | conferido |
| Células endoteliais | ELAM-1 e ICAM-1; reactantes de fase aguda, citocinas (p. ej. IL-1), derivados do AA («igual que arriba»); comentário: «ELAM-1 e ICAM-1 son esenciales para la localización de leucocitos» | conferido; **frase corrigida**: o slide diz «esenciales para a localização», não que sem eles o leucócito «não adere nem sai» → agora «participam na localização… com menos expressão, a adesão e a migração **diminuem**» |
| Basófilos | Histamina, LTC₄; «liberación dependiente de IgE ↓ por glucocorticoides» | conferido |
| Fibroblastos | Metabolitos de AA; «igual que arriba… ↓ síntesis de DNA e proliferación inducidos por factor de crecimiento» | conferido |
| Linfocitos | Citocinas (IL-1, IL-2, IL-3, IL-6, TNF-α, GM-CSF, interferón γ); «igual que arriba» | conferido; **retirado** «metabolitos do AA», que não consta nessa linha do slide (erro da 1.ª rodada) |
Também retirada a menção «Goodman & Gilman» da legenda (livro não consultado).

## 3 · Comparação do slide «a y b bloq» (b01) · o que está correto e o que foi atualizado
- **Já correto no site (≈ 75 conceitos conferidos):** reversíveis × irreversíveis, consequências do bloqueio α₁ (arteríola/veia, reflexo barorreceptor, taquicardia), uso em HBP, prazosina/doxazosina/terazosina/alfuzosina/tamsulosina/silodosina/fentolamina (existência e perfil), feocromocitoma, classificação dos β em gerações, efeitos cardíacos/renina/barorreflexo, celiprolol, broncoespasmo, hipoglicemia, triglicerídeos/HDL, propranolol, atenolol/metoprolol/bisoprolol, CYP2D6 com paroxetina/fluoxetina, carvedilol/labetalol/nebivolol, RAM, aplicações (varizes, hipertiroidismo, enxaqueca, ansiedade), ergóticos (origem, 5-HT, biodisponibilidade 5 %, ergotismo, contraindicações).
- **Lacunas reais → incorporadas** (b01, novo bloco «Precisiones de los slides…», antes da seção 9): prazosina cada 8 h e hipotensão postural após 1.ª dose; doxazosina/terazosina t½ 10–18 h, latência maior e menos hipotensão postural; α₁A de tamsulosina/silodosina e disfunção ejaculatória; fentolamina (má absorção, BHE, RAM: hipotensão, taquicardia, arritmias, ↑ secreção gástrica, diarreia); β: condução AV (↑ PR e ↑ período refratário), tono brônquico e uterino, efeito renal agudo e crônico (exceto nadolol); ergotamina: cafeína acelera absorção, efeito máximo ≈ 5 h oral, evitar em grávidas/hipertensos/cardiovasculares e > 55–60 anos, sem uso contínuo.
- **Não incorporado por ambiguidade do slide:** pág. 34 («o estímulo β promove entrada de K⁺… hipopotassemia») — no contexto de bloqueio β o sentido é ambíguo; fica pendente de confirmação em literatura.
- **Pendente (não verificável):** conteúdo das páginas só-imagem 7, 15, 21, 25, 44 e 45.
- **Ponto de colocação:** o bloco novo ficou no fim do bloco 01 (e não dentro de 6.3/7.4 e 7.5) porque vários grifos de alunos atravessam essas seções (ex.: um grifo com texto «Anotación al margen… Insuficiencia cardíaca crónica…» cobre o fim de 7.4 e o início de 7.5). Solução proposta: após remapeamento verificado dos grifos, mover cada linha para a sua seção.

## 4 · Revisão didática global (#647) · achados e decisões
| Critério | Achado | Decisão |
|---|---|---|
| Sequência dos slides | b07 e b08 seguem a ordem dos slides 05 e 06; único desvio no 06: MgSO₄/roflumilast antes de antileucotrienos/biológicos (site agrupa por função) | manter |
| Clareza para iniciante | cada bloco abre com «desde cero», conceito, fisiologia, tooltips e figuras; mecanismos em cadeia causal | manter |
| Cobertura | lacunas só nos itens do §2 e §3 | incorporadas |
| Repetição/excesso | até 4 sínteses empilhadas no fim de bloco («lo esencial en cinco líneas», «cuadro de memorización», «puntos a dominar», «conceptos que se confunden») | **não removidas**: cada uma é referenciada por navegação/questões; proposta: condensar na migração de grifos, com decisão de José |
| Voz de prova no texto | resíduos em b01 e b05 coincidem com grifos reais (§5) | registrado; neutralizado só onde não há grifo (b12) |
| Questões/flashcards | nenhum alterado | 464 itens, 232 × 232, 0 falhas |

## 5 · Trechos protegidos por grifos (não editados) · fila de migração segura
SELECT somente leitura (09/11): `farmacologia-ii` = 252 grifos (`f2b01` 85, `f2b02` 68, `f2b04` 17, `f2b05` 63, `f2b07` 6, `f2b08` 2, `f2b14` 2, `f2b15` 9), 1 traço (`f2b00`), 0 notas — iguais a 06/11.
- b01: «Detalle de examen» (cabeçalho da tabela de gerações β), «Tal como se enuncia en los exámenes de la cátedra», «El error que más se repite…», «Aparece con frecuencia en las pruebas», «(afirmación FALSA en prueba)», «Farmacocinética que se pregunta».
- b05: «el examen mezcla», «Regla de oro para el examen», «una pregunta que ya cayó en prueba» (dentro da caixa da tríade de Bezold-Jarisch), «El detalle que… siempre se pregunta».
Solução proposta (sem apagar dados): exportar os grifos dessas seções, reescrever a frase, gerar `exact_text/prefix/suffix` novos com `remap-highlights.cjs`, conferir com `hl-real.cjs` e só então aplicar a troca — sempre com decisão de José; nenhuma escrita no banco foi feita ou é proposta aqui.

## 6 · Proteção verificada nesta rodada
- Diferença de texto contra `origin/main` (extração de texto, sem tags): **1 linha removida/alterada** (a expressão de b12 sem grifos); o resto é acréscimo (tabela de b07 e bloco de b01).
- Pontos de inserção sem grifos: b07 (antes de 4.3; grifos de b07 estão na abertura) e b01 (antes de «9 · Cuadro de memorización»; SELECT: **0** grifos cujo prefixo/texto/sufixo contenha o trecho vizinho).
- IDs, âncoras de seção e contagens (232 × 232, 29 mazos) inalterados; inventário em dia (porta 7/7).

## 7 · 3.ª rodada (10/11) · revisão da tabela de bloqueadores/ergóticos e bloqueio de fontes
**Literatura base:** nenhuma disponível (Drive sem Goodman & Gilman/Flórez/Rang com texto; confirmado de novo). Portanto cada afirmação da tabela de b01 só se sustenta **no slide** e passou a dizer isso («el slide indica…», «según el slide»). Revisão linha a linha contra o texto das págs. 17–20, 28, 32, 35, 50–51:
| Afirmação | Slide | Ação |
|---|---|---|
| β₁ seletivos: «estos efectos no aparecen o son menores» | pág. 32 diz isso, mas pág. 26 diz que a cardioseletividade é «relativa y no absoluta» | **qualificado**: «menores o ausentes… pero la cardioselectividad es relativa y no absoluta»; retirada a ideia de ausência garantida |
| Função renal dos β (agudo e crônico) | pág. 35: «en general… con independencia de la selectividad… con excepción del nadolol»; crônico: não cardioselectivos reduzem ligeramente; cardioselectivos «no suelen» afetar | **qualificado** («según el slide», «en general», «no suelen», «tendencias, no reglas absolutas»); não contrastado com literatura |
| Prazosina «cada 8 h» | pág. 17 «debe administrarse cada 8 h» | atribuído ao slide («el slide indica…»); sem literatura para contrastar |
| Doxazosina/terazosina «dosis única diaria»; t½ 10–18 h | pág. 18 «permite la prescripción en dosis única diaria»; «t½ de 10–18 h para la terazosina» | reescrito como «según el slide, permite…»; latência ligada a menos hipotensão postural «se ha relacionado» |
| Ergotamina «> 55–60 años» | pág. 51 «como norma general, en personas mayores de 55-60 años» | marcada como orientação geral do slide, «no un límite fijo» |
| Condução AV / período refratário | pág. 28 | mantido; «el slide señala» que contribui à eficácia antiarrítmica |
Os avisos sobre páginas não lidas **saíram da página do aluno** (legenda de b01); ficam só aqui.

**Bloqueio exato das fontes (testado em 10/11):**
- `Fármaco II a y b bloq 2026.pdf` (34 MB, id `1z2TWYDGs…`): `download_file_content` → «File too large for download, over limit of 10 MB». `read_file_content` devolve o texto das 52 páginas, mas **sem** as páginas 7, 15, 21, 25, 44 e 45 (só imagem). `drive.google.com` → «CONNECT tunnel failed, response 403» (rede da sessão).
- `01 - farmaco II-antihipertensivos 2026-2.pdf` (6,7 MB, id `1Aqqo-eG…`): `read_file_content` trunca em «Eficacia clínica de los I.E.C.A.»; `download_file_content` → «The connection to MCP server "Google_Drive" was closed because a message from the server was too large». A ferramenta disponível só devolve base64 em linha; não há variante que grave o original em arquivo.
- Pendente de verificação: págs. 7, 15, 21, 25, 44, 45 do «a y b bloq»; trecho final do slide 01. **Como destravar:** salvar esses dois PDFs divididos em partes < 4 MB (ou fornecer as páginas como imagens no repositório/Drive), ou usar uma ferramenta que baixe o original para disco sem resposta em base64 (o coordenador relatou ter conseguido com outro arquivo; aqui o conector só expõe `download_file_content`).

## 8 · 4.ª rodada (10/11) · tentativas de obter as páginas em imagem e o final do slide 01 — **resultado: NÃO obtido**
O HTML da matéria **não mudou** nesta rodada (nada novo para integrar além do já lido). Ferramentas e meios tentados, com o resultado exato:
| # | Meio | Alvo | Resultado |
|---|---|---|---|
| 1 | `mcp__Google_Drive__download_file_content` | «a y b bloq» (id `1z2TWYDGs…`, 34 786 905 B) | «File too large for download, over limit of 10 MB» (3 tentativas, em dias/rodadas diferentes) |
| 2 | `mcp__Google_Drive__download_file_content` | slide 01 (id `1Aqqo-eG…`, 6 690 348 B) | «The connection to MCP server "Google_Drive" was closed because a message from the server was too large…» (4 tentativas, também com `exportMimeType: text/plain`) |
| 3 | `mcp__Google_Drive__read_file_content` | ambos | texto sem as págs. 7, 15, 21, 25, 44, 45 do «a y b bloq» (só imagem); slide 01 truncado em «EVIDENCIA EN PR» |
| 4 | `mcp__Google_Drive__get_file_metadata` / `search_files` com `snippetVerbosity: MAX_ALLOWED` | slide 01 | o snippet traz o mesmo texto truncado; nada além |
| 5 | `curl https://drive.google.com/uc?export=download&id=…` (proxy da sessão) | «a y b bloq» | «CONNECT tunnel failed, response 403» |
| 6 | `curl https://www.googleapis.com/drive/v3/files/<id>?alt=media` (sem credencial própria do Drive) | «a y b bloq» | HTTP 403; não usei o `CLOUDSDK_AUTH_ACCESS_TOKEN` do ambiente (é credencial de outra finalidade, fora do que foi autorizado para esta tarefa) |
| 7 | `gcloud auth list` | — | «No credentialed accounts» |
| 8 | Busca no Drive por cópias menores/partes (título «bloq», «antihipertensivos», «ergot»; arquivos modificados desde 09/11) | — | nenhuma parte dividida nem imagem das páginas; só os mesmos arquivos e anotações de alunos já comparadas em outubro |
| 9 | Repositório (`origin/main` e branches): imagens/páginas dos slides | — | não há; `assets/img/farmaco2/*.webp` são infografias do site, **não** páginas dos slides |

**Páginas que seguem inacessíveis:** «Fármaco II a y b bloq 2026» **págs. 7, 15, 21, 25, 44 e 45** (só imagem) e o **trecho do slide 01 depois de «Eficacia clínica de los I.E.C.A.»** (início do «Evidencia en pr…»). **A revisão da matéria NÃO está completa em relação a essas fontes.**
**Para destravar (qualquer uma):** (a) PDFs divididos em partes < 4 MB no Drive; (b) as 6 páginas + o final do slide 01 como PNG/JPEG (a `read_file_content` lê imagens e faz OCR); (c) ferramenta que grave o original em disco sem resposta base64.

## 9 · 5.ª rodada · páginas e trecho final fornecidos por José (extratos na pasta «Slides atualizados»)
José disponibilizou 8 extratos (cópias de páginas dos slides originais, não aulas novas): «A e B bloqueantes - pagina N - extrato.pdf» (N = 7, 15, 21, 25, 34, 44, 45; ids `1l85srBt…`, `1iWFJG__…`, `19PUAYuT…`, `1DbPJFIS…`, `16sHjbQ4…`, `17hA0WCS…`, `1tyxTJG6…`) e «Antihipertensivos - paginas 80 a 96 - extrato.pdf» (`1aPQXuJM…`). **Como foram lidos:** `read_file_content` (extração de texto e OCR do Drive). **Não vi as imagens como imagem** (o `download_file_content` devolveria base64 de 1–2,7 MB em linha, inviável nesta sessão); portanto os números das tabelas de dose vêm de OCR e a atribuição linha-a-linha foi feita só onde a ordem das colunas era inequívoca.
| Extrato | Conteúdo lido | Comparação com o site | Decisão |
|---|---|---|---|
| pág. 7 | Receptores α por órgão (vasos, olho, GU, GI, pele, fígado, baço, pâncreas α₂, terminais pré-sinápticos, plaquetas) | b01 §4 já tem vasos, olho, GU, GI, pâncreas, pré-sináptico; faltavam pele (piloereção), fígado (↓ fluxo), baço (cápsula) e plaquetas α₂ | **incorporado** (1 linha) |
| pág. 15 | Seletividade α₁A; outros efeitos (ejaculação, sudorese, congestão nasal); metabolismo lipídico (LPL; ↓ LDL/VLDL/TG, ↑ HDL) | efeitos e perfil lipídico já estavam; faltava a explicação da seletividade α₁A (menos vasodilatação/hipotensão ortostática/taquicardia reflexa), a sudorese e o mecanismo LPL | **incorporado**, atribuído ao slide («el slide explica…») |
| pág. 21 | Doses de α₁ (doxazosina, prazosina, terazosina) e de β₁ (atenolol, metoprolol tartrato/succinato, bisoprolol, nebivolol); advertência de hipotensão ortostática; usos | b01 não tinha posologia | **incorporado** em tabela «orientativa»; usos só onde inequívocos |
| pág. 25 | Receptores β por órgão | b01 §4 cobre coração, rim, brônquio, útero, fígado, tecido adiposo, olho; **pâncreas β₂: o slide diz «↓ insulina, ↑ glucagón»** | **não incorporado**: contradiz a farmacologia padrão (β₂ estimula a secreção de insulina) e não há literatura base para arbitrar → **pendente de confirmação**; não está no site |
| pág. 34 | «Al inhibir la lipólisis: ↑ TG e ↓ HDL com β-bloqueantes. **El estímulo β-adrenérgico promueve la incorporación de K⁺ a las células musculares esqueléticas, dando lugar a hipopotasemia**» | a 1.ª frase já estava; a 2.ª descreve o efeito do **estímulo** β (agonistas: hipopotassemia, já ensinado no bloco 08), não do bloqueio | **resolvido sem afirmar o que o slide não diz**: linha «β-bloqueantes e potasio» deixa explícito que o slide não informa o efeito do bloqueio sobre o K⁺ |
| pág. 44 | Doses de propranolol, carvedilol e labetalol; usos | doses ausentes | **incorporado** (tabela); nota de que outro slide dá rangos diários maiores (carvedilol 12,5–50, labetalol 200–1200, propranolol 40–240) |
| pág. 45 | OCR devolve apenas «PLUS» (título; sem texto legível) | — | **sem conteúdo legível**; se a página tiver figura, não pude interpretá-la — **pendente** |
| slide 01, págs. 80–96 | Eficácia dos IECA, RAM (tosse 2–15 %, angioedema, hipotensão, hiperpotassemia por aldosterona, erupção/disgeusia/leucopenia, gravidez); ARA II (mecanismo AT₁/AT₂, vantagens, particularidades de cada sartán, comparação com IECA, não combinar em HTA); aliskiren (descontinuado); vasodilatadores (hidralazina, minoxidil/diazóxido, nitroprussiato); resumo por populações | b02/b03: tudo já presente (tosse 2–15 % «hasta 20 %», angioedema, AT₂ com NO/prostaglandinas/condutância K⁺, losartán uricosúrico, olmesartán agonista inverso, telmisartán metabólico, candesartán em IC, irbesartán/losartán em nefropatia, aliskiren a descontinuar, hidralazina/minoxidil/nitroprusiato, resumo por populações) | **correto, sem atualização necessária** |
**Incerto/ não confirmado por literatura base** (indisponível): posologias (valores dos slides, orientativos), mecanismo LPL dos α-bloqueantes (explicação do slide), pâncreas β₂ (não incorporado). **Slide «a y b bloq» agora lido em todas as páginas** (texto + OCR), exceto o conteúdo gráfico, se houver, da pág. 45.

**Dados de alunos (SELECT somente leitura, 11/11):** `farmacologia-ii` = grifos `f2b01` 85, `f2b02` 68, `f2b04` 17, `f2b05` 63, **`f2b06` 1, `f2b07` 7, `f2b08` 111 (novos desde 06/11)**, `f2b14` 2, `f2b15` 9; 1 traço (`f2b00`); 0 notas. Este PR **não toca b06 nem b08**; em b07 os grifos estão na abertura (acima do ponto de inserção); em b01, 0 grifos têm contexto no ponto de inserção.

## 10 · 6.ª rodada · conferência VISUAL das páginas (doses, α₁ e lípidos, pág. 25)
**Como as imagens foram abertas:** `download_file_content` devolve o PDF em base64 e, quando a resposta passa do limite de tokens, a ferramenta a **grava em disco**; decodifiquei cada extrato (7, 15, 21, 25, 34, 44, 45), renderizei com `pdftoppm` e **li as imagens**. (O método não funciona para o arquivo original de 34 MB nem para o slide 01 inteiro; os extratos funcionam.)
**Doses (págs. 21 e 44), linha por linha e coluna por coluna, contra a imagem:** prazosina 1 mg · 2–3 vezes/dia · 6–15 mg/dia (habitual), até 20 · HTA, pesadelos do TEPT; doxazosina 1 mg · 1 vez/dia · 1–16 mg/dia · HTA, HBP; terazosina 1 mg ao deitar · 1 vez/dia · 1–5 mg/dia (habitual), até 20 · HTA, HBP; atenolol 25–50 · 1×/dia · 50–100 · HTA, angina estável; metoprolol tartrato 50–100 · 1–2×/dia · 100–200* · HTA, angina; arritmias, IAM; metoprolol succinato (lib. prolongada) 25–100 · 1×/dia · 100–200* · HTA, IC, angina; arritmias, IAM; bisoprolol 5 · 1×/dia · 5–10 · HTA, IC, angina; nebivolol (β₁ + NO) 5 · 1×/dia · 5–40 · HTA; propranolol (β₁β₂) 40 · 2×/dia · 80–240* (según indicación) · HTA, angina, arritmias, temblores, migraña, ansiedad; carvedilol (α₁β₁β₂) 6,25 · 2×/dia · 12,5–25 mg 2×/dia · HTA, IC, angina; labetalol (α₁β₁β₂) 100 · 2×/dia · 200–400 mg 2×/dia* · HTA (en especial embarazo), crisis hipertensiva. «*Las dosis pueden variar según la formulación y la indicación.» **Todos os valores publicados conferem com a imagem; nenhum precisou ser retirado.** Na 6.ª rodada completei os «usos» de metoprolol (tartrato e succinato) e bisoprolol, agora inequívocos na imagem.
**Anotações manuscritas** (pág. 21 «+ selectivo α1a…», pág. 25, pág. 45 sobre α-metildopa) são marcas de quem copiou o slide, não conteúdo oficial: **não usadas**. A pág. 45 («PLUS») só tem essas anotações; o conteúdo sobre α-metildopa já está no bloco 03 (falso neurotransmissor, α₂, gravidez).
**Pág. 7 (α por órgãos):** conferida (piel/piloerector e vasos cutâneos, hígado ↓ flujo, bazo cápsula, páncreas α₂ ↓ insulina, plaquetas α₂ agregación). **Pág. 15:** conferida; na caixa 3 o esquema traz «↓ estímulo sobre a LPL → ↓ LDL, ↓ VLDL, **↓ catabolismo de triglicéridos**» enquanto o texto diz «disminuyendo LDL, VLDL y **triglicéridos**»: contradição interna (menos LPL não reduz triglicérides). **Decisão:** a página do aluno diz só o que é consistente (↓ LDL, ↓ VLDL, ↑ HDL, «efecto beneficioso adicional»), não adota o mecanismo da LPL e explica o motivo.
**Pág. 25 (β por órgãos):** conferida; a linha do pâncreas atribui ao β₂ «↓ insulina, ↑ glucagón», contra o slide de α (pág. 7: α₂ ↓ insulina) e contra a tabela da seção 4 do próprio bloco (α₂ ↓ insulina; β ↑ insulina). **Decisão:** não adotada; a página do aluno traz uma linha de esclarecimento («Páncreas · aclaración»). Sem literatura base no Drive para arbitrar além dessa consistência interna dos slides e do bloco; fica **pendente de confirmação em livro** se a coordenação quiser fonte bibliográfica.
**Pág. 34:** imagem conferida: duas frases (↑ TG/↓ HDL com β-bloqueio; estímulo β → entrada de K⁺ → hipopotassemia) + figura «Potencial de reposo» alheia ao tema. O site mantém a redação que não afirma o efeito do bloqueio sobre o K⁺.
**Grifos (SELECT somente leitura, 12/11):** `f2b01` 85, `f2b02` 68, `f2b04` 17, `f2b05` 63, `f2b06` 1, `f2b07` 7, `f2b08` 111, `f2b14` 2, `f2b15` 9; 1 traço (`f2b00`); 0 notas — iguais a 11/11. Contexto das inserções: **0** grifos em b01 e **0** em b07. Esta PR não toca b06 nem b08.
