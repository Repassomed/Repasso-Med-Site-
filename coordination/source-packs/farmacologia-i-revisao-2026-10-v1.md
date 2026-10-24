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

## 5. Segunda rodada (2026-10-24) — fonte e página → decisão → destino

**Livros.** Não existe nenhum livro de farmacologia no Drive (Goodman & Gilman, Katzung e outros não estão lá). Os únicos livros de patologia (Robbins 9.ª ed. e Harsh Mohan 6.ª ed.) não abrem: `read_file_content` devolve texto vazio, `download_file_content` recusa acima de 10 MB (e falha também com o PDF de 8 MB dos decks, por tamanho da resposta), `drive.google.com` está bloqueado no proxy e os livros não são indexados na busca de texto. Nenhum trecho de livro pôde ser lido.

**Fonte lida:** `_P1_merged_compressed.pdf` (decks da cátedra de Farmacología I; texto extraído por completo, mas **fora de ordem** nos slides de opioides) e `REPASO GENERAL — FARMACOLOGÍA I.pdf` (cuestionario com gabarito).

| Afirmação pendente | Fonte e slide | Decisão | Destino |
|---|---|---|---|
| **μ como receptor «principal» da morfina** | Deck, slide «Mecanismo de acción» da morfina (fragmentos: «Interactúa con afinidad variable por los receptores opioides… Tiene una gran afinidad por los receptores µ … baja afinidad … δ y κ y σ») e slide «Efectos resultantes… 1. Analgesia» (μ e κ). O texto extraído do slide está embaralhado e **não consegui ver a imagem** (PDF de 8 MB não baixa) | **Parcialmente sustentada**: só «gran afinidad por μ». Na tabela, a coluna «Acción de la morfina» agora diz «según el material de la cátedra, la morfina tiene gran afinidad por los receptores μ», em vez de «mecanismo predominante». A baixa afinidade por δ, κ e σ **não** foi acrescentada (leitura incerta e em tensão com a analgesia por κ do mesmo deck) | opioides (tabela) |
| «El principal» no cartão μ e frases «μ explica lo central» | idem; o deck não ordena receptores por importância | **Mantidas como estavam** (texto de apoio, sem fonte); pendência | opioides, cartões |
| **Reação cruzada: carbapenêmicos e monobactâmicos** | cuestionario item F (só anel betalactâmico, 1.ª geração); nenhum slide cita carbapenêmicos/monobactâmicos | **Não sustentada.** Mantida como estava (não apagada); pendência | banco |
| **Cadeia R1 / cifra de 10 %** | nenhuma fonte lida | **Continua retirada**; retirada não é validação | banco |
| **Classificação do meloxicam** | deck AINEs: celecoxib e meloxicam «bloqueadores selectivos de la COX-2» | Já corrigida na rodada anterior (#569); **verificada de novo** | — |
| **Segundo mensageiro, succinilcolina, clonidina, SNA** | cuestionario 2 (itens A, C, G, H) | Coerentes; sem mudança | — |
| **PK/PD (biodisponibilidade, primeiro passo, agonista × antagonista)** | deck, slides «Efecto de primer paso hepático y biodisponibilidad» e «Tipos de fármacos según su interacción con receptores» | Coerentes. O deck só define **agonista e antagonista** (não define agonista parcial, inverso nem antagonista competitivo; a página, em `pd`, os usa — bloco com grifos, **não editado**) | — |

**Pendências que continuam bloqueadas (sem livro):** ordem de importância dos receptores opioides; carbapenêmicos/monobactâmicos e cadeia R1 na alergia; classificação de agonista parcial/inverso/competitivo (deck só traz agonista × antagonista); blocos de SNA além do cuestionario, anestésicos, cefalosporinas, macrólidos e aminoglicosídeos (sem deck legível).
