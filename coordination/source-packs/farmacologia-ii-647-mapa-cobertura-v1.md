# Farmacología II · issue #647 · mapa de cobertura dos slides e decisões (documento interno)

**Atualizado:** 09/11/2026 (2.ª rodada, mesma PR #649) · **Agente:** Claude 2 · **Branch:** `claude/farmaco2-issue-647-2026-11` · **Base:** `main` `7f329241` · **PR de layout #644:** aberta, arquivos disjuntos; `temas`/`real`/`integracao-farmaco2` e `visual-conteudo` repetidos com este HTML.
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
