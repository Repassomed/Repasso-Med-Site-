# Farmacología II · issue #647 · mapa de cobertura dos slides e decisões (documento interno)

**Data:** 06/11/2026 · **Agente:** Claude 2 · **Branch:** `claude/farmaco2-issue-647-2026-11` · **Base:** `main` `7f329241` (já com #632 e #639) · **PR de layout #644:** aberta, sem conflito (`git merge-tree` limpo; `temas`/`real`/`integracao-farmaco2` repetidos com este HTML: 55/55, 109/109, 155/155).
Alvo único: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html`.

## 1 · Fontes (pasta Drive «Slides atualizados» de Farmacología II)
| Arquivo | Drive (modificado) | Bloco(s) | Como foi comparado nesta rodada |
|---|---|---|---|
| `01 - farmaco II-antihipertensivos 2026-2.pdf` | 27/08 | b02, b03 | texto lido (leitura do Drive trunca no fim da seção IECA); 60+ conceitos conferidos no HTML |
| `03 - antianginosos.pdf` | 29/09 | b05 | texto lido; ~100 conceitos conferidos |
| `04 - Antiagregantes.pdf` | 29/09 | b04 | texto lido; ~60 conceitos conferidos |
| `05 - Antiinflamatorios esteroideos.pdf` (= `Antiinflamatorios esteroideos 2025.pdf`, mesmo tamanho) | 22/10 | b07 | texto lido integralmente; ~130 conceitos |
| `06 - SISTEMA RESPIRATORIO.pdf` | 22/10 | b08 | texto lido integralmente; ~100 conceitos |
| `Fármaco II a y b bloq 2026.pdf` (34 MB) | 25/08 | b01 (+ blocos de Parcial 2) | **não relido nesta rodada** (arquivo não mudou desde a conferência de 18/10 registrada em `farmacologia-ii-revisao-2026-10-passo-integral-v1.md`; p. 7, 15, 21, 25, 44, 45 são só imagem) |
Blocos 09–14 (antiácidos, tiroides, hipoglucemiantes, insulinas, antiarrítmicos) **não têm slide na pasta**: ficam sobre as fontes já registradas (anotações/provas/literatura); nenhuma cobertura de slide é declarada para eles.

## 2 · Resultado da comparação (coverage por busca de conceito e leitura da seção)
- **Slides 05 e 06** (os dois pedidos): ordem do bloco = ordem dos slides em todos os eixos (fisiologia → mecanismo GR/MR → ações → classificação → farmacocinética → RAM/retirada → aplicações → mineralocorticoides; asma: fisiopatologia → classificação → β₂ → xantinas → anticolinérgicos → anti-inflamatórios/biológicos → Mg → comparação/crise). Único desvio de ordem: no slide 06 o MgSO₄ e o roflumilast vêm antes de antileucotrienos/biológicos; no site ficam em «7 Antiinflamatorios y otros» e «8 Sulfato de magnesio». **Mantido**: reordenar não melhora a compreensão (a página agrupa por função: broncodilatar × desinflamar) e mexeria em seções com âncora.
- **Lacuna real encontrada (1):** a tabela de efeitos inibidores dos glucocorticoides **por célula** (macrófago/monócito, endotélio, basófilo, fibroblasto, linfócito) do slide 05 não estava no site (só a frase geral). → **Incorporada** em b07 §4.2 como tabela curta, com a explicação causal «sem ELAM-1/ICAM-1 o leucócito não chega ao foco».
- **Itens do slide 06/05 que o site já ensinava**: fisiopatologia Th2 em 4 tempos, mediadores, genética/higiene, SABA/LABA e regra do LABA, efeitos adversos β₂ (com mecanismo), xantinas (cinco vias, farmacocinética, fatores de eliminação, efeitos adversos), SAMA/LAMA e combinações, MgSO₄, PDE4/roflumilast, antileucotrienos e síndrome de Churg-Strauss, biológicos; no 05: eixo HHS/ritmo, GR/MR/11β-HSD2, ações metabólicas/ósseas/musculares/SNC, potências e equivalentes, supressão do eixo e retirada, terapia alternante, interações, mineralocorticoides, Cushing/Addison.
- **Slides 01, 03, 04**: nenhuma lacuna de conteúdo; diferenças só de grafia/variante (ex.: «poscarga», «gmpc», «60–70 %»).
- **Questões/flashcards**: nenhuma alterada. Bateria real de quiz (464 itens, 390 MCQ, V/F e abertas, 29 mazos): 0 falhas; espelho bloco × banco 232 × 232, 0 divergências; idêntica à da base (`orig`).

## 3 · Decisões de conteúdo
| Decisão | Onde | Motivo |
|---|---|---|
| **Complementar**: tabela «Qué frena el glucocorticoide en cada célula» | b07 §4.2 (antes de 4.3) | único conteúdo do slide 05 ausente; liga o mecanismo (COX-2/PLA₂, adesão endotelial) à «llegada de leucocitos» e à imunodepressão celular |
| **Neutralizar** «resuelve una pregunta clásica» → «resume una idea clave» | b12 | resíduo de voz de prova no texto do aluno; b12 não tem grifos |
| **Manter** a estrutura dos blocos (conceito → mecanismo → comparação → crise/clínica → síntese → quadro de memorização → questões → cartões) | todos | já segue o padrão do #647 (básico → complexo, tooltips, tabelas, síntese); reescrita em massa de 14 blocos (≈ 120 mil palavras) arriscaria 252 grifos e dados reais sem ganho demonstrado |
| **Não remover** as sínteses empilhadas do fim de bloco («lo esencial en cinco líneas», «cuadro de memorización», «puntos a dominar», «conceptos que se confunden») | todos | há sobreposição, mas cada uma é usada por questões/cartões e por navegação; remover exige decisão de José/coordenação (registrado como achado, não como correção) |
| **Manter** a «Nota sobre las fuentes» de b06 e b14 | b06, b14 | é atribuição de fonte, não estratégia de prova |

## 4 · Trechos com voz de prova que **não** foram tocados (protegidos por grifos de alunos) — fila para migração segura
SELECT somente leitura (06/11): estes trechos coincidem com `prefix/exact_text/suffix` de grifos reais; alterar o texto os deixaria «pendientes». Não editei; registro para migração futura (com remapeamento verificado):
- b01: cabeçalho «Detalle de examen» (tabela de gerações β), «Tal como se enuncia en los exámenes de la cátedra», «El error que más se repite…», «Aparece con frecuencia en las pruebas», «(afirmación FALSA en prueba)», «Farmacocinética que se pregunta».
- b05: «el examen mezcla», «Regla de oro para el examen», «una pregunta que ya cayó en prueba» (dentro da caixa da tríada de Bezold-Jarisch), «El detalle que… siempre se pregunta».
Sugestão de redação neutra para cada um está implícita (ex.: «Detalle clínico», «Regla de oro del ECG»), a aplicar só junto de um remapeamento de grifos.

## 5 · Proteção de dados reais (SELECT somente leitura, 06/11)
`farmacologia-ii`: 252 grifos (`f2b01` 85, `f2b02` 68, `f2b04` 17, `f2b05` 63, `f2b07` 6, `f2b08` 2, `f2b14` 2, `f2b15` 9), 1 traço (`f2b00`), 0 notas. Texto removido neste PR: **uma única expressão em b12** (sem grifos). Tudo mais é acréscimo (tabela nova em b07). Os 6 grifos de b07 estão nos parágrafos de abertura e permanecem intactos. IDs, âncoras de seção e contagens (232 × 232, 29 mazos) inalterados.

## 6 · Limites
- Slide `Fármaco II a y b bloq 2026` e a parte final do slide 01 (após IECA) não foram relidos nesta rodada.
- Literatura base (Goodman & Gilman etc.) não está no Drive; só se usou o que os slides citam.
- Verificação de gabaritos/questões desta rodada = bateria automática + relatório #639; não houve revisão questão a questão nova (nenhuma foi alterada).
