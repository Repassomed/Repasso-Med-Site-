# Ortopedia y Traumatología · Unidades 6 e 7 (leitura visual, 26/11/2026)

**Fonte:** Drive › pasta enviada por José (https://drive.google.com/drive/folders/1Xj0CA_UhnekeF0bSUDz5OwNaS1Bb3dIZ): 22 PDFs em imagem (150 dpi, 16:9). Unidade 6 = 12 PDFs (págs. 1–118); Unidade 7 = 10 PDFs (págs. 1–91). Dr. Agustín René Torres.
**Método:** os 22 PDFs foram baixados (conector Drive, binário salvo local), cada página renderizada e **vista uma a uma** (pares de páginas por imagem; 209 páginas = 105 imagens). Sem OCR no ambiente: a transcrição é minha, página por página, nas notas `ortopedia-u6-notas-leitura-visual-2026-11-26.md` e `ortopedia-u7-notas-leitura-visual-2026-11-26.md` (registro por página). Depois comparei cada ponto lido com o texto de ensino de `otb07` (Unidad 6) e `otb08` (Unidad 7): 248 termos da U6 e 191 da U7, checados por regex normalizada contra o texto de ensino (fora das perguntas).

## Resultado da comparação
| Unidade | Bloco | Páginas lidas | Termos conferidos | Já ensinados | Lacunas encontradas | Decisão |
|---|---|---|---|---|---|---|
| 6 · Complicaciones generales de las lesiones traumáticas | `otb07` (35 preguntas) | 118/118 | 248 | 237 (+ variações de grafia) | 4: mecanismo lesional/fatores de risco antes das 5-P; gamagrafia «de três fases» (figuras); exemplo do esquema da neuropraxia (compressão do radial → queda do punho); algoritmo de decisão do nervio (EMG, 3–7 dias, 3–6 semanas) | 4 complementos marcados |
| 7 · Lesiones traumáticas en rodilla asociadas al deporte | `otb08` (30 preguntas) | 91/91 | 191 | 179 | 4: zonas rojo-rojo/rojo-blanco/blanco-blanco e tipos de rotura (vertical, transversa, periférica, asa de cubo, pico de loro, flap; radial/horizontal/oblicuo/longitudinal); «mais de uma manobra»; figura da fratura da espinha tibial; cerclaje com arames | 4 complementos marcados |

Os blocos já eram muito completos (resumo ensina o que as unidades cobram, incluindo números: 16–34 % → 350 %, 40 mmHg, 15/35/25 mmHg, 24–36 h, 6 h, 85–90 %, 60 %/10–20 %/19 %, 6 semanas). Nada existente foi alterado: os 8 complementos são `<div class="rmc-postit">` entre parágrafos, marcados `<!-- orto-u67-1126:begin resumen -->` … `:end -->`.

## Inventário por arquivo (22 PDFs, todos lidos)
U6 p001-010, 011-020, 021-030, 031-040, 041-050, 051-060, 061-070, 071-080, 081-090, 091-100, 101-110, 111-118 · U7 p001-010, 011-020, 021-030, 031-040, 041-050, 051-060, 061-070, 071-080, 081-090, 091-091. **Nenhum ilegível.** Páginas só com vídeo/foto/imagem decorativa estão anotadas como tal (ex.: U6 p17–19, p21, p29–31; U7 p26–28, p50, p52, p54, p56, p71, p73, p84, p88).

## Observações e pendências
1. **O PDF da Unidade 6 não contém todos os slides numerados:** o número impresso salta (a página 39 do PDF é o slide 42) e faltam os slides impressos **39–41, 55–57, 87, 109–111, 118, 124–125** (13 no total: o último é o 131 e o PDF tem 118 páginas). Provavelmente slides ocultos no original. **Conferir com José** se faltam slides; o bloco `otb07` já ensina o assunto geral dessas regiões (síndrome compartimental, Sudeck, lesões nervosas).
2. **Algoritmo do nervio:** a diapositiva é uma imagem com abreviaturas; «EMG en 6 s.» foi lido como 6 semanas (neuropraxia) e «EMG/mes» como cada mês (axonotmesis). Interpretação marcada no próprio complemento; conferir com a cátedra.
3. **Figura da espinha tibial (U7 p32):** a diapositiva não traz texto; o complemento diz isso e descreve só o que a imagem mostra.
4. Diapositivas de vídeo (YouTube, Nucleus, Dr. Gelber) não foram assistidas; nenhum conteúdo foi inventado a partir delas.
5. **Perguntas:** nenhuma adicionada. Os pontos novos são detalhes de figuras ou complementos sem material de prova; as 35+30 perguntas existentes já cobrem o essencial (Lei 8-A.1: nada a duplicar). Se José tiver provas de Ortopedia, tratar numa PR de questões.

## Preservação
`ortopedia.html`: +59 linhas (8 blocos marcados), 0 removidas; 457 perguntas (ids q-orto1…458) e banco, flashcards intactos (teste: arquivo sem os marcados == `main`, byte a byte). Marcas de alunos (só SELECT): 4 grifos (otb01×3, otb02×1), nenhum em otb07/otb08. Motor real de grifos (`rm-tools.js`) com 2 000 grifos sintéticos do texto real de otb07, otb08 e banco: 1 999 ancoram igual; 1 perdido (trecho que atravessa a tabela de técnicas e o cabeçalho da seção, artefato sintético); 7 «movidos» (mesmo texto, vizinhança diferente).
