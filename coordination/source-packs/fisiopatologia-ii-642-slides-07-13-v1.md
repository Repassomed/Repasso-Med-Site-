# Fisiopatología II · #642 · slides atualizados 07–13 × HTML real

Data: 2026-11-04 · Base: `main` `7f329241` (inclui #632) · Branch `claude/charming-maxwell-ah7nxj-fisio2-642`
Fonte única: pasta do Drive de Fisiopatología II (`1R3DRkuH6cR0Hvu5KzlXQgh9DeSik7By4`) e literatura-base citada nos próprios slides. Nenhuma fonte externa. Supabase só em leitura.

## 1. Inventário da pasta (14 arquivos)

| # | Arquivo | Id Drive | Modificado | Tamanho | Papel nesta tarefa |
|---|---|---|---|---|---|
| 1 | 01 - Enfermedades Esofagicas.pdf | 1Ta0t_6VeFIEb3O5SZjdaqQS8WDLs847Z | 2026-08-17 | 5,7 MB | Fora do escopo (digestivo, blocos já existentes) |
| 2 | 02 - Enfermedades Gastricas.pdf | 1Z8O1K7OQtlmFHvlSIsB-AMU-v3p1kAtZ | 2026-08-17 | 14,1 MB | Fora do escopo |
| 3 | Enfermedad intestinal inflamatorio.pdf | 1WyXpJi2nCPiI9en0z8JHDp4sGVJoXrUA | 2026-08-17 | 17,2 MB | Fora do escopo |
| 4 | 04 - Pancreatitis.pdf | 19emy3fQ9E3rlbaTcv00tsTEk-RiTWg5w | 2026-08-27 | 3,5 MB | Fora do escopo |
| 5 | 05 - hepatitis a b c ..pdf | 1BZS84z_R98M8LBAqBMcfcrOSk6LuXs86 | 2026-08-27 | 2,4 MB | Fora do escopo |
| 6 | ICTERICIA.pdf | 1jAJepSKHfOFVxDlPxPDxkSYjfy6IW9Je | 2026-08-31 | 8,2 MB | Fora do escopo |
| 7 | 07 - Unidad 2 Alteraciones de las vias urinarias.pptx | 1mq6P4v7DTCgEp0ppmOhXdl0yl1Bdko03 | 2026-09-11 | 9,1 MB | Slide 07 (versão editável) |
| 8 | 07 - Unidad 2 … .pptx.pdf | 1hgevYtCzUwU07FvdUjcRGxoa7HjRezmL | 2026-10-22 | 0,7 MB | **Duplicata do nº 7** (mesmo título, PDF exportado; conferido pelo texto extraído, sem reler as figuras duas vezes) |
| 9 | 08 - Trastornos de la función glomerular.pdf | 1fISnaYNxSdGNpSRAAVNhoSvJf70X2lKa | 2026-10-22 | 5,8 MB | Slide 08 |
| 10 | 09 - Desequilibrio acido- base.pdf | 1ak5yxGdNMWNZsc0nz-ZLDsR3HP8vGfB8 | 2026-10-22 | 8,4 MB | Slide 09 |
| 11 | 10 - Diabetes.pdf | 13cYveCzhTj0KfN7OXjywuW9oSo1QZWhu | 2026-10-22 | 6,5 MB | Slide 10 |
| 12 | 11 - Transtorno endocrino parte 1.pdf | 1rq-3vMyqjJgI2Oa-oZiOJaWFHKUCIM0X | 2026-10-22 | 0,9 MB | Slide 11 |
| 13 | 12 - Transtorno endocrino parte 2 PDF.pdf | 1bH_h1U8kOO7U1wVvVdN8KwZf3UTNbFTQ | 2026-11-04 | 9,2 MB | Slide 12 (**novo**) |
| 14 | 13 - Unidad 5. Alteraciones de la conciencia.pptx | 1wHPoPPpHWtRlZ2t4EJDKoID_iT_2xJpu | 2026-11-04 | 27,1 MB | Slide 13 (**novo**; só texto extraível) |

## 2. Matriz slide → assunto → bloco → decisão

| Deck | Assunto | Bloco do HTML | Decisão |
|---|---|---|---|
| 07 | Alteraciones de las vías urinarias | fp2b14 | **Coberto**; sem alteração |
| 08 | Função glomerular (tipos de glomerulopatia, GESF, poliangitis, hidrocarburos, causas mundiais) | fp2b05, fp2b06 | **Coberto em essência**; lacunas pequenas → complemento no fim de fp2b06 (+2 questões `b06q23–24`, +2 flashcards) e “dos datos más” em fp2b05 (+1 flashcard) |
| 09 | Ácido-base | fp2b15 | **Coberto**; sem alteração (figuras do slide manuscritas/meme, sem valor didático) |
| 10 | Diabetes | fp2b16 | **Coberto**; faltava GLUT-4 na sinalização da insulina → frase em fp2b16 e flashcard ajustado |
| 11 | Endócrino parte 1 (suprarrenal) | fp2b17 | **Coberto**; sem alteração |
| 12 | Endócrino parte 2 · **tiroides** | — (faltava) | **Incluir → novo bloco 18** (`fp2b18`): eixo HPT, síntese hormonal, TBG, hipo/hipertiroidismo, Graves/oftalmopatia, mixedema, tormenta tiroidea; 20 questões, 25 flashcards, 2 figuras próprias |
| 13 | Alteraciones de la conciencia / SNA | — (faltava) | **Incluir → novo bloco 19** (`fp2b19`): hiperatividade simpática paroxística, centro respiratório, SRAA de vigília, conteúdo × nível de consciência, graus, mutismo acinético, cativeiro, Glasgow; 17 questões, 17 flashcards |

Ordem: os decks existentes já seguem a sequência atual da professora; nada foi renumerado, então ligações como “bloque 10/12” permanecem válidas. Blocos 18 e 19 entram ao fim, antes do banco e do mazo.

## 3. Figuras

- Decks 07–12 inspecionados em folhas de contato por página. Ilustrações já presentes no HTML foram preservadas (75 SVG/imagens originais intactos; agora 77 com as duas novas).
- Figuras novas próprias do bloco 18 (SVG, texto verificado sem estouro em 390/1440 px): `f2sTIR1` eixo hipotálamo-hipófise-tiroides e `f2sTIR2` síntese e acoplamento.
- Não reaproveitadas: micrografias do deck 08 (IF granular/linear, medias lunas) e cartuns de sinalização do deck 10 — o conteúdo foi ensinado em texto/tabela existente.
- **Limitação**: o PPTX 13 (27 MB) não pôde ser baixado/renderizado; só o texto foi lido. Figuras dos slides 15–18, a tabela de pontuação de Glasgow (slide 24) e a reatividade pupilar (slide 26) não foram inspecionadas.

## 4. Pendências declaradas (nada inventado)

1. Caso clínico de Glasgow (moto) do deck 13: sem a chave de pontuação visível → o HTML diz “no se fija un puntaje total”; só os 3 ítens e o limite ≤ 8 são afirmados.
2. Símbolos de receptores (α/β) ilegíveis → escritos como “adrenérgicos”.
3. Slide de reatividade pupilar (heroína/atropina) não afirmado.
4. Erro do slide (“centro neumotáxico” escrito “neumotórax”) sinalizado no texto, não copiado.
5. Valores de referência da tiroides (TSH 0,4–4 µUI/mL; T4 libre 0,7–1,48 ng/dL) citados como “del slide (Farreras)”, sem texto da literatura no Drive para confrontar.
6. Blocos renais IRA/ERC/ITU/Na/K não têm deck na pasta atualizada (decks antigos em outra pasta) → mantidos como estão.

## 5. Supabase (somente leitura, 04/11)

`user_highlights` para `fisiopatologia-ii`: 47 grifos (fp2b01 ×42, fp2b02 ×4, fp2b12 ×1); `user_ink_strokes`: 0; `user_notes`: 0. Os três blocos com grifos reais ficam **byte a byte idênticos** ao main (teste automático). Nenhum SQL de escrita.

## 6. Registro por arquivo

| Arquivo | Mudança |
|---|---|
| `…/materias-privadas/fisiopatologia-ii.html` | + `fp2b18`, `fp2b19`; complementos em `fp2b05/06/16`; banco: 403 preguntas (351 MC · 48 V/F · 4 completar · 17 basadas en exámenes · 19 bloques), grupos “Bloque 18/19”, “Bloque 09” 22→24; mazo 727 tarjetas (+45); ids originais preservados |
| `tools/qa/fisio2-642/fisio2-642.test.cjs` | novo teste estático, 27 verificações |
| `docs/layout-ensaio/inventario.json` | só a linha de `fisiopatologia-ii` regenerada (22 seções · 806 q · 2181 fc) |
| `coordination/source-packs/fisiopatologia-ii-642-slides-07-13-v1.md` | este registro |

## 7. Testes

- `fisio2-642.test.cjs`: 27/27 (ids/ordem; nada removido: 728 questões originais, fronts de flashcards, imagens; espelho corpo↔banco 403 pares, 0 divergências; contagens declaradas; letras A–D equilibradas, corrida máx. 2; V/F `checkTF` coerente; cobertura dos slides 08/10/12/13).
- `quiz.test.cjs new`: 806 itens, 403 pares, 0 divergências, FALLAS 0.
- `hl.test.cjs`: 0 grifos mal colocados, 0 texto distinto. `ink.test.cjs` (768/1024/1440): deslocamento de altura só em fp2b05/06/16 e banco (conteúdo acrescentado); 0 traços reais.
- `secoes-vazias.test.cjs`: 95/95. Porta `porta-da-materia.sh fisiopatologia-ii`: PASSA 0…5 (não liga nada).
- Layout 390/768/1440: 0 erros de JS, 0 estouro de texto nos SVG novos.

## 8. Layout / Nova Era

O Claude 2 prepara a Nova Era de Fisiopatología II; esta PR não toca motor, caneta, layout nem ativação. Depois do merge do conteúdo, a branch da Nova Era deve ser atualizada sobre esta versão final.

## Corrección posterior (11/11) — coma vigil / estado apálico vs cautiverio
La frase del deck 13 («coma vígil: despierto y consciente, pero totalmente incapaz de producir respuestas motoras»; «estado apálico: no responde a estímulo») describe en realidad el cuadro del síndrome de cautiverio, no el del coma vigil. En la página el coma vigil/estado apálico pasa a ser **vigilia sin conciencia** (ojos abiertos, sin conciencia de sí ni del entorno, con posibles movimientos reflejos o espontáneos sin intención) y se agrega una nota que lo distingue del cautiverio (consciente, se comunica con los ojos). **Fuente:** los slides dan el cautiverio (slide 22) y la frase ambigua; la distinción de coma vigil = vigilia sin conciencia es **conocimiento general** (término equivalente al estado vegetativo/apálico); **no se pudo confirmar en el libro base** (Porth, citado en el material, no está en el Drive). Preguntas y flashcards existentes no afirman conciencia para el coma vigil; no se tocaron.
