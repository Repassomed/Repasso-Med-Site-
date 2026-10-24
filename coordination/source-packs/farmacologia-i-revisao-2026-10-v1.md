# Farmacología I — revisão editorial (2026-10) · fonte → decisão → destino

Arquivo: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia.html` (slug de grifos `farmacologia`).

**Esta entrega é uma revisão editorial. Não é validação científica completa da matéria.**

## 1. Fontes acessíveis (Drive)
| Fonte | Cobre | Situação |
|---|---|---|
| `_P1_merged_compressed.pdf` (pasta Farmacologia, decks da cátedra) | Introdução, farmacocinética e farmacodinâmica | legível (trecho) |
| `REPASSO GENERAL — FARMACOLOGÍA I.pdf` (cuestionario da cátedra) | Opções de verdadeiro/falso e múltipla escolha (AINEs, aminoglicosídeos, penicilinas, morfina, etc.) | legível |
| Livros-base de farmacologia | — | **não lidos** (texto vazio ou não abertos) |

O restante dos blocos (SNA, placa motora, adrenérgicos, colinérgicos, AINEs, opioides, corticoides, anti-histamínicos, anestésicos, antibióticos) não foi conferido linha a linha com os decks nesta rodada.

## 2. Achados → decisões → destino
| # | Achado | Decisão | Destino |
|---|---|---|---|
| 1 | Legendas de infografia em voz de prova: «Es lo que pide la pregunta G / C / A del cuestionario» (3), «resuelve la pregunta de opción múltiple», «la pregunta de seguridad», «Aquí se pide la regla general» | Reescritas como conteúdo (dobutamina → β → AMPc; clonidina α2 (Gi) reduz noradrenalina; succinilcolina despolarizante; etc.) | blocos de adrenérgicos, placa motora, antibióticos, banco |
| 2 | Pergunta da morfina na sustancia gelatinosa: nota «Según la literatura» (μ predominante, κ secundário, sigma «no es opioide verdadero») com citações externas (J Neurosci 2008; StatPearls) | Citações e afirmações externas retiradas. O que fica é verificável no cuestionario do Drive: as opções são δ, κ, bloqueio de μ e bloqueio de σ (**não há «agonista μ»**), e a cátedra dá κ. Mantida a regra da tabela «morfina = agonista μ» e que «bloqueo de μ» é incorreto. **Resposta e gabarito intactos** | opioides (tabela + pergunta, 2 cópias) |
| 3 | «Matiz de la literatura actual» (reação cruzada penicilina–cefalosporina depende da cadeia R1; 10 % sobrestimado), sem fonte acessível | Frase **retirada**; fica o critério da cátedra (anel betalactâmico) | banco |

## 3. Verificações
- Contagens iguais à main: 4 «Ver respuesta», 191 enunciados, 72 imagens, 412 tarjetas; nenhuma pergunta, alternativa, gabarito, id ou imagem alterados.
- Grifos (Supabase, só leitura): 23 (pd 15, pk 5, sna 3). Os blocos `pk`, `pd` e `sna` são **byte a byte iguais** aos da main. Uma legenda grifada em `pd` que dizia «lo que realmente se pregunta» foi mantida por isso.
- Navegador (390 e 1280 px): sem rolagem horizontal, 72/72 imagens, 412 tarjetas, sem erro de JS (igual à main).

## 4. Pendências / revisão humana
1. Textos grifados com voz de prova («Cae: …», «muy preguntado», «lo que realmente se pregunta») **não editados** para não quebrar os grifos. Decisão de José.
2. A explicação μ × κ da morfina e o critério de reação cruzada seguem sem validação por livro (os livros-base não abrem). Trecho necessário: farmacologia dos opioides (receptores) e alergia a β-lactâmicos em livro-base.
3. Blocos de antibióticos, anestésicos, corticoides e SNA: coerência interna conferida, sem leitura linha a linha dos decks.
