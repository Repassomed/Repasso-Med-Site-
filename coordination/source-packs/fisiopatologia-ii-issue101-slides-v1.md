# Fisiopatología II · Issue #101 · Comparação com os slides atuais da cátedra (checkpoint 2, documento interno)

> Agente: Claude 2 · branch `claude/fisiopatologia-ii-issue101` · 2026-10-10. Fontes lidas do Drive (texto dos decks): `01 - Enfermedades Esofagicas`, `02 - Enfermedades Gastricas`, `04 - Pancreatitis`, `05 - hepatitis a b c`, `ICTERICIA`, `07 - Unidad 2 Alteraciones de las vias urinarias` (IDs no `…-issue101-v1.md`). Docente e sede constam nos próprios decks; **não** entram na página do aluno.

## 1 · Método

Para cada deck foi extraída uma lista de fatos distintivos (termos, números, nomes, classificações — 21 a 26 por deck, 132 no total) e verificada, sem acento e sem maiúsculas, no texto de ensino das seções correspondentes (`fp2b01`–`fp2b04`, `fp2b03`, `fp2b13`, `fp2b14`; quiz, banco e flashcards fora). O que falta foi lido no contexto antes de se decidir.

## 2 · Resultado

| deck | seções do resumo | fatos verificados | ausentes de início | decisão |
|---|---|---|---|---|
| 01 Esofágicas | b01 | 21 | 2 | **0 lacunas reais**: «cólica esofágica» está escrita como «cólico esofágico»; «IX / X / XII» está como numerais romanos |
| 02 Gástricas | b01 + b02 | 25 | 0 | cobertura completa (inclui HCl, IBP/anti-H₂/antiácidos, 4 vs 3 tempos, HP-NAP, VacA, CagA, ROI, retrodifusão) |
| 04 Pancreatitis | b04 | 21 | 1 | **0 lacunas reais**: NF-κB aparece com o símbolo «κ» |
| 05 Hepatitis | b03 | 26 | 3 | **1 lacuna real**: ginecomastia e alteração da distribuição do vello na cirrose avançada → **acrescentada** (uma frase dentro do parágrafo da cirrose descompensada). PRONASIDA/SINAN são só nomes de fonte (os números de Paraguai e Brasil estão no texto) |
| Ictericia | b13 | 19 | 0 | cobertura completa (17 ciclos das sais biliares, 500–600 mL, 7 % Gilbert, Crigler-Najjar I/II, Rotor × Dubin-Johnson, vit. K II-VII-IX-X) |
| 07 Vías urinarias | b14 | 20 | 0 | cobertura completa (trígono, 150–250 / 400–500 mL, 40–50 e 45–65 cm H₂O, DIAPPERS, trabéculas/celdillas, 1000–3000 mL) |

**Resumo:** o texto de ensino já cobre ~99 % dos fatos dos decks; 1 lacuna real corrigida (uma frase, +1 linha em `fp2b03`).

## 3 · Complementar × slides

O resumo já tem a convenção «**Complemento · amplía los slides de la cátedra con la literatura de referencia**» (22 marcadores `rmc-comp`, em `fp2b01`–`fp2b04`). Conferência: os blocos **b13 (Ictericia)** e **b14 (Vías urinarias)** seguem os decks seção por seção e não trazem conteúdo além dos slides; portanto **não precisam de marcador**. Nada foi acrescentado: um marcador novo é um elemento ancorável novo e deslocaria a tinta.
**Fora do alcance desta comparação:** os blocos **b05–b12 (rim e equilíbrio hidroeletrolítico)** — não há deck atual deles no pacote. Preciso que José indique/forneça esses decks para comparar e marcar o que for complementar.

## 4 · Densidade (auditoria, sem alteração)

| indicador | resultado |
|---|---|
| palavras de ensino por bloco | 3 500 – 7 000 (total ≈ 72 000 em 14 blocos) |
| parágrafos com mais de 130 palavras | **0** |
| frases (≥ 50 caracteres) idênticas em elementos diferentes | 1–4 por seção, quase todas **instruções repetidas de figura** («🔍 tocá la figura y ampliá con dos dedos…», 3× por seção) e a nota «insignia BLOQUE 10/11» (3× em b10 e b11) |
| frases casi duplicadas (Jaccard ≥ 0,72) | 0–3 por seção |

Leitura: **a matéria não tem excesso estrutural de prosa nem repetição relevante**; a densidade vem do tamanho (muitos conteúdos e figuras), não de parágrafos inchados. Os únicos candidatos a corte são as **instruções de figura repetidas (≈ 42 parágrafos idênticos)** e as **notas sobre a insignia «BLOQUE 10/11»** das imagens `bloco-10-*` e `bloco-11-*` (a ordem de leitura é 13 e 14): removê-los, porém, **remove elementos ancoráveis** e deslocaria a tinta dos parágrafos seguintes em cada seção — só com `data-rm-content-rev` (decisão do José) ou trocando a insignia nos rasters. **Não foi aplicado.** A redução que cabe sem tocar a tinta (reescrever dentro do parágrafo) não encontrou parágrafo que se beneficie.

## 5 · Limites

* Só 6 decks (unidades I e II-vias urinárias); b05–b12 sem fonte de slides.
* Verificação por termos distintivos: não substitui leitura pedagógica completa nem o parecer G0 independente (ainda não pedido para esta matéria).
