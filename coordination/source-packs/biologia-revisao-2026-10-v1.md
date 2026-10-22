# Biología — revisão completa com as fontes do Drive (2026-10-22, PR #550)

**Nível:** revisão de leitura + conferência com os slides da cátedra e o PDF da Unidad V (Drive, `Biologia/Slides` e `Biologia/Pdfs`).
**Não é** declaração de revisão científica integral: as partes que seguem sem fonte estão listadas com precisão no fim.
Nenhuma PR aberta alterava `biologia.html` (verificado contra a main).

## Inventário de fontes (corrigido)
A versão anterior deste registro afirmava que não havia slides das unidades II (parte 3), III (parte 1), V, VI, VII (parte 1), IX e X. **Isso estava errado: esses arquivos existem no Drive e foram lidos nesta rodada.**

| Fonte (Drive) | Blocos conferidos |
|---|---|
| Unidad II parte 1 | 01 Introducción, 02 Agua y sales, 03 Carbohidratos |
| Unidad II parte 3 | blocos de lípidos/estrutura aplicáveis |
| Unidad III (Membranas) parte 1 | bloco 10 (membrana, glicocálix) |
| Unidad IV | começo do bloco 09 (citosol) |
| Unidad V (slides 2024) + `Pdfs/UNIDAD V.pdf` | bloco 09 (citoesqueleto) |
| Unidad VI parte 1 | bloco 08 (MEC e uniões) |
| Unidad VII parte 1 | bloco 12 (endomembranas) |
| Unidad VIII | bloco 15 (já conferido em #469/#471) |
| Unidad IX | bloco 14 (núcleo) |
| Unidad X | bloco 16 (ciclo celular, meiose, fecundação; já incorporado em #471) |
| De Robertis, 16ª ed. | usado nas PRs anteriores (Golgi/RE); **não relido** aqui |
| Questionários e provas | só contexto; não são fonte de conteúdo |

## Fonte → achado → decisão → destino
| Fonte | Achado | Decisão | Destino |
|---|---|---|---|
| Unidad II parte 1 | Água, sais, carboidratos coincidem com a página. O slide diz que a sacarose junta glicose com uma «pentose (frutose)»; a página (frutose + glicose) não repete o deslize | Conferido, sem alteração | blocos 01–03 |
| Unidad VI-1 | O slide diz que os GAG estão sulfatados «a excepción de ácido hialurónico» | **Afirmação da página confirmada pela cátedra** (corrige a linha anterior deste registro, que dizia «sem fonte») | bloco 08 |
| Unidad V (slides + PDF) | Microfilamento = **8 nm** (a página tinha «7–8 nm» na margem e na legenda da figura, ajuste que eu mesmo havia feito sem fonte) | Margem e legenda → «8 nm» | bloco 09 |
| Unidad V | O slide **não** menciona filamina como proteína adesiva dos contatos focais | Removido o item «Filamina…» e o «(y filamina)» da explicação da pergunta de proteínas adesivas. A alternativa «Tubulina y filamina» permanece como distrator; gabarito (b) e posição iguais | bloco 08 e banco |
| Unidad V | Vimentina: o slide diz apenas «células embrionarias»; a página acrescenta «mesénquima» | **Mantido (já existia), sem fonte nos slides** | bloco 09 |
| Unidad IX | A cátedra diz que as proteínas radiais reduzem o orifício e o complexo funciona como diafragma | Frase acrescentada ao parágrafo do complexo do poro | bloco 14 |
| Unidad IX | Os slides **não** trazem FG/importinas/exportinas/Ran/NXF1-NXT1 nem os valores 9–25 nm | **Mantidos (já existiam), sem fonte nos slides** | bloco 14 |
| Unidad II parte 3, III parte 1, VII parte 1, X | Comparados com resumo, perguntas e cartões | Sem divergência comprovada além das acima | blocos 07, 10, 12, 16 |
| Regra G0 | «Trampa(s) clásica(s)», «cae:», «se pregunta», «chuleta», «La cátedra lo marca…» etc. | Reescritos em voz de estudo, fatos intactos | blocos 01–14 e espelhos do banco |
| Ortografia | «desnaturación» → «desnaturalización» (11 ocorrências) | Ponte `data-guard-previous-stem-sha1` nas 2 cópias da pergunta V/F afetada | bloco 06 e banco |
| Figuras | Duas notas de erro de figura (dipeptídeo N–CO; «transtorias») | Notas neutras mantidas; **as figuras não foram redesenhadas** | blocos 05 e 09 |

## Contagens
320 itens de pergunta (160 pares bloco/banco), 242 «Ver respuesta», 410 cartões (205 pares), 39 imagens (todas com `alt`, todas carregam), 21 ids, 968 alternativas; sequência de gabaritos idêntica. Grifos de alunos nesta matéria: nenhum nos trechos alterados (consulta somente leitura).

## O que continua SEM fonte (preciso)
- **Unidad II parte 2** (ácidos nucleicos, aminoácidos, proteínas, lípidos): sem slide no Drive; blocos 04–06 sem conferência com a cátedra.
- **Unidad III parte 2** (transporte de membrana): sem slide; bloco 11.
- **Mitocôndria** (bloco 13): sem slide.
- Sinais **KDEL/KKXX/GPI**: OCR do slide ambíguo, não confirmado.
- **Selectinas E/L/P** e lista de CAM do bloco 08; **«mesénquima»** da vimentina; **FG/importinas/Ran/NXF1-NXT1** e **9–25 nm** do bloco 14.
- De Robertis não relido para os blocos 04–14 e 16.
- Correção artística das duas figuras.
