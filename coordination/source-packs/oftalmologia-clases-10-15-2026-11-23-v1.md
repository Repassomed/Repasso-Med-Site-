# Oftalmología · clases 10 a 15 (23/11/2026) → bloques 10 a 16

Base: `origin/main` · branch `claude/oftalmologia-slides-10-15-2026-11` · fonte: Drive `Site repassomed › Biblioteca › 7 semestre › Oftalmologia (Dr. Lucas segovia) › Slides` (id `14cfZMjhsr0NgmcNvU8Hv6IlNuva4x5tF`), arquivos de Gabriel de 23/11/2026 12:15.

## 1 · Arquivos, leitura e destino
| # | Arquivo (id Drive) | KB | Leitura | O que já existia | O que entrou e onde | Pendente |
|---|---|---|---|---|---|---|
| 10 | `10 viciosderefracción.pdf` (`1SE1YUQmib78B41dStC8JamMDEpYpmECw`) | 4125 | **texto completo lido** | Nada (bloco 02 trata exame, não vícios) | **Bloco 10** vicios de refracción (dioptrías, emetropía, miopía, hipermetropía, astigmatismo, presbicia, ambliopía) | Figuras e imagens do slide não extraídas |
| 11 | `11 TRAUMA OCULAR.pdf` (`1oWAlZv7j_P05uxoJkTyIo_yhCOhjxKVn`) | 3149 | **texto completo lido** | Bloco 04 só trata ojo rojo | **Bloco 11** trauma ocular (cerrado/abierto, hifema, lamelar, CEIO, estallido, químico, Hughes) | Doses de cirurgia não detalhadas; tabelas de pH não reproduzidas |
| 11.1 | `11.1 Trauma en pediatria LS.pdf` (`1fN9qwJGy0m2Q1FIvGeQ6xJluUdfofUXr`) | 1725 | **texto completo lido** | Nada | **Bloco 12** trauma pediátrico (epidemiologia, párpados, abrasão, hifema, órbita, retina, nervio óptico, niño sacudido) | Imagens clínicas não extraídas |
| 12 | `12 OFTALMOPEDIATRIA.pdf` (`1edcXArguzNKY-QinHuRcPtAaSsWjfSyB`) | 3078 | **texto completo lido** | Retinoblastoma só em menções | **Bloco 13** músculos e movimentos, estrabismo, leucocoria, retinoblastoma, ROP | Figuras de anatomia muscular não extraídas |
| 13 | `13. NEURO.pdf` (`1YtojZacoeOD7-zhNhhR5sWHL31QNyIDM`) | 4968 | **texto completo lido** | Bloco 01 cobre a via visual (anatomia) | **Bloco 14** neuro-oftalmología (via visual, exame, pupila, III, IV, VI) | Síndrome do uno e meio / INO só mencionados (slide só traz o título); figuras não extraídas |
| 14 | `14 FARMACOLOGIA OFTALMOLOGIA.pdf` (`1Tn0F0yXsfEmEe8bI5-cqPQRx4I98s64l`) | 3821 | **texto completo lido** | Bloco 06 cita hipotensores no glaucoma | **Bloco 15** fármacos (vias, autonômicos, hipotensores, antiinflamatórios, antialérgicos, antiinfecciosos, anestésicos, lubrificantes) | Preços e marcas do slide (guaraníes) **não** incluídos; antibióticos listados por família |
| 15 | `15 TOXOPLASMOSIS.pdf` (`1l_FF3ttzwmqv-dUqXukkxr1ijoF8Z0_9`) | 2128 | **texto completo lido** | Nada | **Bloco 16** toxoplasmosis | Imagens (faro en la niebla etc.) não extraídas |

Arquivos 1–9 (blocos 01–09): não relidos nesta PR; blocos 01–09 ficam **byte a byte idênticos**.

## 2 · O que mudou no site
- `oftalmologia.html`: 7 blocos novos (`ofb10`…`ofb16`) antes do banco, na ordem dos slides; 56 perguntas (`q-oft140`…`q-oft195`) com cópia no banco (`bq-oft…`); 70 flashcards (bloco + mazo geral + ruleta); banco 139→**195 preguntas**, 9→**16 bloques**, 267→**337 flashcards**; bibliografia.
- `rm-materia-sistema.js` (global, só `clasificarOF`): reconhece `ofb01…ofb16` (parava em 09); blocos 09 e 10–16 sem viñeta.
- `docs/layout-ensaio/inventario.json` (só a entrada de oftalmologia), testes e este registro.

## 3 · Decisões sobre o texto dos slides
- Slide 10: «43 D» da córnea não está no slide (só 22 mm e 19 D no esquema): não foi escrito. Cada vício aparece como o slide o define.
- Slide 14: preços em guaraníes e nomes comerciais omitidos (não são conteúdo médico). Dosagens citadas são as do slide (manitol 1,5–2 g/kg, glicerina 1–1,5 g/kg, ceftazidima 2,25 mg, vancomicina 1 mg).
- Slide 13: da «oftalmoplejía internuclear» e do «síndrome del uno y medio» o slide dá só títulos; o bloco explica o mínimo e remete à integração com Neurología.
- Literatura: os slides citam AAO BCSC, Walsh & Hoyt, Ryan's Retina, Foster & Vitale, Kaufman & Lazzaro: **nenhum aberto**; o ensino segue o texto dos slides + fisiologia básica.

## 4 · Questões (lei 8-A)
56 novas, todas «Pregunta complementaria» (sem banco de provas da cátedra). Duplicatas comparadas com as 139 antigas (conceitos de exame, ojo rojo, catarata, glaucoma, retina): nenhuma cobre os temas novos; nenhuma descartada nem alterada. Tipos MCQ, CASO, DEFINE, CITA, COMPLETÁ. Sem negrito em enunciado ou alternativa; a resposta é a única mais longa em 21 % (antes do rebalanceamento 57 %), nunca > 1,25× a média das erradas. Cobertura por slide: termos-chave presentes (teste).

## 5 · Marcações dos alunos (somente leitura, 23/11/2026)
`oftalmologia`: **858 grifos** (ofb01 143, ofb02 107, ofb03 83, ofb04 88, ofb05 124, ofb06 154, ofb07 90, ofb08 27, ofb09 42), **0 traços**, **0 notas**. Todos em blocos 01–09, intocados. Motor real: **851/858 ancoram antes e depois (os mesmos 7 já não ancoravam na main), 0 perdidos, 0 movidos**.

## 6 · Limitações
Figuras dos 7 PDFs não incorporadas (só texto); livros citados não lidos; blocos novos sem viñeta; 7 grifos antigos já sem âncora na main (não causados por esta PR).
