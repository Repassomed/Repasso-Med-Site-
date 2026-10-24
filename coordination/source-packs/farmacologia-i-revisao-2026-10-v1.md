# Farmacología I — revisão editorial (2026-10) · fonte → decisão → destino

Arquivo: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia.html` (slug de grifos `farmacologia`).

**Esta entrega é uma revisão editorial. Não é validação científica completa da matéria.**

## 1. Fontes realmente lidas (Drive)
| Fonte | Cobre | Situação |
|---|---|---|
| `_P1_merged_compressed.pdf` (decks da cátedra, pasta Farmacologia) | Introdução, farmacocinética (LADME), farmacodinâmica, **AINEs**, paracetamol, dipirona, **opioides** (receptores, morfina, meperidina, metadona, fentanil, mistos, antagonistas); corticoides só o começo (fisiologia suprarrenal, texto truncado) | lido por inteiro; o texto vem **fora de ordem** em alguns slides (opioides), lido por trechos |
| `REPASO GENERAL — FARMACOLOGÍA I.pdf` (cuestionario 1 e 2 com gabarito) | Verdadeiro/falso e múltipla escolha de AINEs, antibióticos, morfina, alergia cruzada, antihistamínicos, SNA, adrenérgicos, colinérgicos, placa motora | lido por inteiro; **todas as respostas do site para esses itens coincidem com o gabarito** |
| Livros-base (Goodman & Gilman, Katzung etc.) | — | **não abrem** (texto vazio/arquivos grandes) |
| `GABARITO P1 FARMACOLOGIA FILA 1.pdf` | é de Farmacología II | não usado |

Sem fonte lida para a página: SNA/placa motora/adrenérgicos/colinérgicos além do cuestionario; antihistamínicos, anestésicos, penicilinas, cefalosporinas, macrólidos, aminoglucósidos além dos itens do cuestionario.

## 2. Temas pedidos → fonte lida → conclusão → mudança
| Tema | Fonte lida | Conclusão | Mudança / pendência |
|---|---|---|---|
| μ × κ da morfina | deck opioides + cuestionario E | O deck diz que a analgesia medular da morfina (sustancia gelatinosa de Rolando, asta posterior) é mediada por agonismo sobre **μ e κ**; cita cinco famílias (μ, κ, δ, σ, ε) e μ e κ como as da analgesia. O cuestionario só oferece κ (δ, κ, bloqueio de μ, bloqueio de σ) → κ. **Não há divergência dentro da cátedra.** | Nota e linha κ da tabela reescritas com isso; gabarito intacto. **Pendência:** o deck não explica por que μ é «o principal» (afirmação da tabela, não conferida em livro). Afinidade relativa da morfina (μ alta; δ, κ, σ baixa) aparece no deck, mas o texto extraído está embaralhado: não afirmei. Trecho necessário: Goodman & Gilman, capítulo de analgésicos opioides, tabela de receptores. |
| Reação cruzada penicilina × cefalosporina | cuestionario F | A cátedra responde **anel betalactâmico** (1.ª geração). Nada foi lido sobre cadeia R1 nem sobre a cifra de 10 %. | Frase «matiz de la literatura» continua **retirada** (sem fonte; retirar não valida nem refuta). O trecho sobre carbapenêmicos/monobactâmicos seguirá como estava (sem fonte lida). Trecho necessário: Goodman & Gilman, capítulo de β-lactâmicos, seção de alergia e reatividade cruzada. |
| Meloxicam | deck AINEs + cuestionario A | O deck chama celecoxib e meloxicam de **bloqueadores selectivos da COX-2**; o cuestionario dá meloxicam como resposta. A página dizia «preferencial, não estritamente selectivo» (sem fonte). | Tabelas, explicação da pergunta e «fármacos clave» alinhadas à cátedra; a nuance «preferencial» saiu (não confirmada nem refutada). |
| AINEs, paracetamol, dipirona, AAS | deck AINEs | COX-1/COX-2, febre (PGE2, hipotálamo, «COX-3» no deck), AAS irreversível, Reye, NAPQI e dipirona coerentes com a página | sem alteração; **COX-3** só aparece no deck (a página não a usa) |
| SNA, adrenérgicos, colinérgicos, placa motora, antihistamínicos, penicilinas, aminoglucósidos, sulfas, H. pylori | cuestionario 1 e 2 | 100 % dos itens coincidem com o gabarito | sem alteração |

**Outras mudanças desta PR:** 6 legendas/explicações com voz de prova reescritas (dobutamina → β → AMPc; clonidina α2; succinilcolina despolarizante; «la pregunta de seguridad»; «se pide la regla general»; «resuelve la pregunta de opción múltiple»); citações externas da morfina (J Neurosci 2008, StatPearls) e a nota «sigma no es opioide verdadero» retiradas.

## 3. Verificações
- Contagens iguais à main: 4 «Ver respuesta», 191 enunciados, 72 imagens, 412 tarjetas; nenhuma pergunta, alternativa, gabarito, id ou imagem alterados.
- Grifos (Supabase, só leitura): 23 (pd 15, pk 5, sna 3). Os blocos `pk`, `pd` e `sna` são **byte a byte iguais** aos da main. Uma legenda grifada em `pd` que dizia «lo que realmente se pregunta» foi mantida por isso. Alterações desta rodada: tabela de AINEs (meloxicam), nota da morfina, linha κ, «fármacos clave», explicação das perguntas de meloxicam e morfina.
- Navegador (390 e 1280 px): sem rolagem horizontal, 72/72 imagens, 412 tarjetas, sem erro de JS (igual à main).

## 4. Pendências / revisão humana
1. Textos grifados com voz de prova («Cae: …», «muy preguntado», «lo que realmente se pregunta») **não editados** para não quebrar os grifos. Decisão de José.
2. Livros-base não abrem: μ «principal», carbapenêmicos/monobactâmicos na alergia e cadeia R1 seguem sem validação por livro (trechos na tabela acima).
3. Blocos de antibióticos, anestésicos, corticoides e SNA: coerência interna conferida, sem leitura linha a linha dos decks.
