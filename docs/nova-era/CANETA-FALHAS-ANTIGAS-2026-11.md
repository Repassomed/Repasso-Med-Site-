# Caneta · registro das falhas antigas dos testes (03/11/2026)

**Pergunta de José:** separar com clareza o que já falhava na `main` de qualquer falha nova trazida pelo pacote Anatomía I / AP I.

**Método:** os dois testes da caneta rodaram **duas vezes na `main` pura** (`d177474`, antes de qualquer mudança) e **uma vez sobre o pacote** (cópia local = `main` + #632 simulada + Anatomía I/AP I). Comparação linha a linha das falhas (sem os números de diagnóstico): **idênticas**.

## 1 · Já falhavam na `main` (não são desta entrega)

| # | Teste | Verificação | Medido | Limite | Natureza |
|---|---|---|---|---|---|
| 1 | `caneta-novo-layout` | antigo · postit · rápido | 1,66 px | 1,6 px | tolerância de desvio do traço no post-it (layout ANTIGO) |
| 2 | `caneta-novo-layout` | antigo · postit · longo | 1,66 px | 1,6 px | idem |
| 3 | `caneta-novo-layout` | novo · postit · longo | 1,64 px | 1,6 px | idem (layout novo) |
| 4 | `caneta-novo-layout` | novo · postit · rápido | 1,58 px | 1,6 px | **passou hoje** nas 3 rodadas; está no limite e pode oscilar |
| 5 | `caneta-456` | 390 · postit · longo | 2,13 px (1 ponto perdido) | 1,6 px | idem, no celular 390 px |
| 6 | `caneta-456` | «aluno comum: a V2 NÃO monta» | V2 monta | — | **asserção desatualizada**: antecede a Nova Era, em que a caneta passou a ser liberada pela tabela `rm_materia_rollout`, não só pela lista beta. Não é defeito da caneta |

Resultado na `main`: `caneta-novo-layout` **88/91** · `caneta-456` **136/138** (duas rodadas iguais).

Leitura: 1–5 são o **mesmo fenômeno** (desvio de ~0,05–0,5 px no post-it flutuante, com caneta simulada por CDP); nenhum traço se perde fora do post-it, e parágrafo/tabela passam. A 6 é teste a atualizar, não código a corrigir. Nenhuma das seis foi mexida aqui (fora do escopo; corrigir exige decisão separada).

## 2 · Com o pacote Anatomía I / AP I

| Teste | `main` | Pacote | Falhas novas |
|---|---|---|---|
| `caneta-novo-layout` | 88/91 | **88/91** (mesmas 3) | **0** |
| `caneta-456` | 136/138 | **136/138** (mesmas 2) | **0** |
| caneta nas duas matérias (`integracao-anato1-ap1`: parágrafo, tabela, rápido, longo, 6 larguras, âncora estável no layout antigo) | — | **241/241** | **0** |

**Conclusão:** nenhuma falha nova de caneta. Limite: Chromium com `pointerType:'pen'` via CDP, não Safari/Apple Pencil.
