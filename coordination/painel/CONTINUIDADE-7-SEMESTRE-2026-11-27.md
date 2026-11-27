# Continuidade do 7.º semestre · 27/11/2026 · Claude 1

Fatos verificados em 27/11 no GitHub: `main` `6860acb9`; PRs abertas relevantes #682, #726, #729, #730, #731, #732 (Claude 1) e **#733 (Claude 4: Toxicología, 19 fotos de prova)**. Registros são evidência histórica, não prova de estado atual: conferir o GitHub antes de agir. **Só José mescla e publica; nada é ativado sem ele; Nova Era só na conta de José, uma matéria por vez.**

## Quem faz o quê (sem sobreposição)
| Frente | Dono | Estado |
|---|---|---|
| Layout, caneta, flags de ativação, QA em navegador/iPad | **Claude 4** | não tocar; Claude 1 só entrega portas e roteiros |
| Toxicología: fotos de prova (19), pendências 5 itens, «anticoagulante × procoagulante» | **Claude 4 (#733)** | em andamento; Claude 1 **não** abre PR de Toxicología até a #733 fechar |
| Conteúdo/questões de Ortopedia, Oftalmología, Neurología, Anestesiología, Dermatología | **Claude 1** | ver abaixo |
| AP II teórica (6.º sem.) | Claude 1 | #732 aguarda auditoria |

## Próximos passos de Claude 1 (ordem sugerida, uma PR por matéria)
1. **Anestesiología** — slides 1–4 ainda não relidos por conteúdo + figuras dos slides 5–8 (a #710 já mesclada cobre 5–8 como texto). Maior conteúdo não conferido do semestre. *Não depende de José.*
2. **Oftalmología (#726 aberta)** — páginas da prova além da 3.ª; item 6 (artéria central da retina) e corte 1300 g × 1500 g (ROP) precisam de decisão/fonte. *Depende de fotos/decisão de José.*
3. **Neurología** — **depois** de #682 → #731 mescladas: duplicatas na `main` (`q-neu234`/`q-neu-2509-05`, `q-neu148`/`q-neu289`) pela Lei 8-A.1-B; NIHSS, 4.ª forma da EM, coma no TEC (precisam de livro-base). *Depende da ordem de merge.*
4. **Ortopedia (#729 aberta)** — conferir com José os slides impressos que faltam no PDF da U6 (39–41, 55–57, 87, 109–111, 118, 124–125) e «EMG en 6 s.». *Depende de José enviar os slides.*
5. **Dermatología** — bloco 06 sem fonte legível. *Bloqueada por fonte.*

## O que impede o teste privado (inalterado)
Só Neurología: **#682 → #731**. As outras 5 já têm porta 7/7 aberta na `main` (levantamento #730). Antes do primeiro SQL: deploy da `main` publicado + conferência de acesso (roteiro `docs/nova-era-temas/ATIVACAO-SO-JOSE-7-SEMESTRE.md`, não executado).

## Lei de Questões aplicada a toda PR de questões do semestre (lições da #732)
- Duplicata = mesma resposta/raciocínio, não o mesmo tema; cada «já coberto» precisa de pergunta cubridora que exija a mesma resposta.
- Reclassificar rótulo só com ítem equivalente de prova (turma/número registrados no pack).
- Retirada de pergunta: o Guard dá `questoes-removidas` (HARD_FAIL); caminho seguro = substituição com `data-guard-previous-stem-sha1` ou decisão expressa de José em PR à parte; conferir grifos com o motor real antes × depois.
- Grifos reais ficam no Supabase (só leitura, só contagens); conferir `subject_slug` da matéria antes de inserir perguntas no meio do banco.

## Pendências que dependem de José
Merge #682 → #731 (Neurología); decisão sobre retirada de complementares e sobre F11 (AP II, #732); slides faltantes de Ortopedia; fotos/decisão de Oftalmología; fonte do bloco 06 de Dermatología; leitura de Robbins cap. 18 para F11.
