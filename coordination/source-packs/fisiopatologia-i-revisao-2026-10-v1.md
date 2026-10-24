# Fisiopatología I — revisão editorial (2026-10) · fonte → decisão → destino

Arquivo: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/fisiopatologia.html` (slug de grifos `fisiopatologia`).

**Esta entrega é uma revisão editorial. Não é validação científica completa da matéria.**

## 1. Fontes acessíveis (Drive)
| Fonte | Cobre | Situação |
|---|---|---|
| `ilovepdf_merged_compressed.pdf` (pasta Fisiopatologia, Dra. Evelyn Fretez) | Unidad 1: adaptação, lesão, necrose, apoptose, inflamação, hemorragia | legível |
| `06 - SISTEMA RESPIRATORIO.pdf` (Farmacología II, Dra. Vega) | Asma: mediadores da fase efetora (LTC4, LTD4, LTE4) | legível (trecho de busca) |
| Semiología II: asma / EPOC (decks) | Asma e EPOC | só o trecho de busca |
| Porth, Guyton, Robbins, Harrison (livros-base citados na página) | — | **não lidos**: leitura devolve texto vazio ou não foram abertos |

Restante da página (choque, anemias, glóbulos brancos, coagulação, infecções respiratórias): **sem fonte lida linha a linha nesta rodada**.

## 2. Achados → decisões → destino
| # | Achado | Decisão | Destino |
|---|---|---|---|
| 1 | Voz de prova nas explicações: «¡TRAMPA!» ×8, «el enunciado …» ×9, «punto trampa frecuente» ×2, «distractor típico» ×2, «forma típica de la cátedra de evaluar» | Reescrito como conteúdo (sem alterar pergunta, alternativa ou gabarito) | banco, blocos de hemorragia, coagulação, choque, asma/EPOC |
| 2 | Caixa «Trampas frecuentes en las preguntas» (estratégia de prova no banco) | Substituída por «Pares que se confunden con facilidad» (hemostasia, vias, neutropenia, hemofilia), só com dados já ensinados na página | prova-fisio |
| 3 | Caixa «Según la cátedra × Según la literatura» (leucotrienos) citava artigo externo (Annu Rev Pathol 2025) | Mantida a distinção LTC4/LTD4/LTE4 × LTB4; fonte trocada para o deck de Farmacología II da cátedra, que lista LTC4, LTD4 e LTE4 na fase efetora do asma. A afirmação do LTB4 quimiotático segue a classe de inflamação da cátedra | inflamacion (bloco de leucotrienos) |
| 4 | Parágrafo «Según la literatura — GINA 2026» (controle × gravidade do asma), sem fonte acessível | **Retirado**; fica a classificação da cátedra | asma-epoc |
| 5 | Caixa «Fuente (literatura)» com 3 DOIs/PMC (hiperinsuflação, hipoxemia, hipercapnia) | **Caixa de citação retirada**; o parágrafo de fisiopatologia fica, sem validação por fonte acessível (pendência abaixo) | asma-epoc |

## 3. Verificações
- Contagens iguais à main: 332 «Ver respuesta», 39 imagens, 260 tarjetas; nenhuma pergunta, alternativa, gabarito, id ou imagem alterados (diff só em texto de explicação e nas caixas dos itens 2–5).
- Grifos (Supabase, só leitura): 33 (introduccion-fisio 30, inflamacion 2, hemorragia 1). O bloco `introduccion-fisio` é byte a byte igual ao da main; nos outros dois, os trechos grifados continuam presentes e não foram editados.
- Navegador (390 e 1280 px): sem erro de JS, 39/39 imagens, «Ver respuesta» abre. No celular, `overflowPx` = 131 no harness **igual ao da main** (não introduzido aqui).

## 4. Pendências / revisão humana
1. Textos grifados contêm voz de prova («Muy preguntado», «Cuando una pregunta te dé un dato suelto»); **não editados** para não quebrar os grifos de alunos. Decisão de José.
2. Fisiopatología de hiperinsuflação, hipoxemia (V/Q) e hipercapnia na EPOC e a clasificação GINA de controle × gravidade: não validadas por fonte acessível (Robbins/Porth/Guyton não abrem). Trecho necessário: Porth, capítulo de doenças pulmonares obstrutivas.
3. Choque, anemias, leucemias/linfomas, coagulação e infecções respiratórias: coerência interna conferida (resumo × pergunta × gabarito), sem conferência contra a fonte.
