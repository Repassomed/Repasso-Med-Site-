# Checklist do 7.º semestre · atualizado em 27/11/2026

**Decisão de José (26/11):** **Primeros Auxilios e Interculturalidad NÃO fazem parte do projeto** (PRs #724 e #725 não devem ser mescladas nem ativadas; trabalho parado). Imagenología e Bioestadística seguem fora do plano. Restam **6 matérias**: Toxicología, Anestesiología, Dermatología, Oftalmología, Ortopedia y Traumatología, Neurología.
**Base verificada:** `main` `6860acb9` (27/11). **Regra:** «completa» só com leitura por conteúdo de cada fonte; comparação por título não conta. O que não reli nesta sessão aparece como «registro do pack».
**Ativação:** primeiro **só na conta de José, uma matéria por vez** (roteiros em `docs/nova-era/ROTEIRO-*.md` e `docs/nova-era-temas/ATIVACAO-SO-JOSE-7-SEMESTRE.md`); nada foi ativado nem registrado em tabela.

## 1 · Pendências que IMPEDEM o teste privado (só Neurología tem)
| Matéria | O que impede | Onde está | Ação |
|---|---|---|---|
| **Neurología** | Não é candidata na `main`. Falta integrar **#682** (infográficos + correção de PL; aberta, Guard ok) e **#731** (candidata, tema, teste real, roteiro; empilhada sobre a #682, porta 7/7) | branch `claude/neurologia-infograficos-b20-b27` e `claude/nova-era-neurologia-2026-11` | José mescla **#682 → #731** e espera o deploy; só então roda o SQL do roteiro |
| Toxicología, Anestesiología, Dermatología, Oftalmología, Ortopedia | **Nada técnico**: já são candidatas na `main` e a porta está **7/7 ABERTA** em `6860acb9` | levantamento 26/11 (#730) | Exigência comum a todas: deploy da `main` publicado + conferência de acesso (L1: 1 administrador; L2: estado das linhas; L3: nenhuma em `all`) antes do 1.º SQL |

## 2 · Pendências que podem ser resolvidas DEPOIS (não impedem o teste privado)
| Matéria | Fontes e leitura | Pendências | PRs |
|---|---|---|---|
| **Ortopedia y Traumatología** | 16 PDFs de slides; unidades 1–5 e 8–16 lidas por texto (24/11); **unidades 6 e 7 lidas visualmente, 209 págs. (26/11)** | PDF da U6 sem os slides impressos 39–41, 55–57, 87, 109–111, 118, 124–125 (conferir com José); «EMG en 6 s.»; vídeos não assistidos; voz de prova | #664 (mesclada); **#729** (aberta, Guard ok) · completa quanto aos slides enviados |
| **Oftalmología** | Slides 10–15 (+11.1): texto completo (23/11); 3 fotos de prova lidas por inteiro (25/11) | item 6 da prova (artéria central da retina: slide × anatomia); corte 1300 g × 1500 g (ROP); figuras dos slides não extraídas; páginas da prova além da 3.ª | #664 (mesclada); **#726** (aberta, Guard ok) · **não completa** |
| **Neurología** | 16 slides + provas (packs `neurologia-*`) | NIHSS (faixas), 4.ª forma da EM, coma no TEC, duplicatas na `main` (`q-neu234`/`q-neu-2509-05`; `q-neu148`/`q-neu289`), ESCMID/Lublin/Brott de memória, sem livro-base; 2 grifos do bloco 20 | #687, #715 (mescladas); #682, #731 (abertas) · **não completa** |
| **Anestesiología** | 8 slides: 5–8 lidos como texto (23/11) e **mesclados na #710 em 24/11**; 1–4 não relidos | figuras; interações/posologias pediátricas; fentanilo por formulação/via e propofol × alergia alimentar (sem literatura) | #663, **#710** (ambas mescladas) · **não completa** (1–4 e figuras) |
| **Dermatología** | sem slides novos; revisão integral (#505) | bloco 06 sem fonte legível | Nova Era já candidata · **não completa** (bloco 06) |
| **Toxicología** | Provas P1, P2 (16 págs.), fotos de 20/09 e 21/09 | fotos de prova não todas extraídas; gabaritos anotados divergem em pontos (registrados) | #660 (mesclada) · **não completa** |

## 3 · Testes (registro)
Rodados nesta sessão: `orto-u67` 26/26; `oft-exame` 37/37 + 19/19; porta do pré-voo nas 25 candidatas (175/175 etapas); Neurología: porta 7/7, `real-neurologia` 118/118, `nao-ativacao` 38/38 e suites estáticas `neu-*`. Demais valores: registro das PRs/packs.
