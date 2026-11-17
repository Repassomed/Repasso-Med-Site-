# Nova Era · Fisiopatología II · implantação privada (sem ativar alunos)

**Data:** 04/11/2026 · **Autora:** Claude 2 · **Branch:** `claude/nova-era-fisio2-2026-11` · **Base:** `main` com a #632 (Fisio I / Farmaco I) e a #639 já mescladas.

**O que foi feito:** Fisiopatología II foi ligada ao carregador real da Nova Era (`CANDIDATAS` + `TEMAS` inline + CSS próprio) com 9 vinhetas recortadas de infografías do próprio conteúdo. Nenhum texto médico, id, imagem, questão, flashcard ou HTML da matéria foi alterado. Nada foi ativado e nenhum SQL foi executado.

## 1 · Estrutura real
- Com o conteúdo das #643/#650: 22 seções no DOM, 21 montadas pelo módulo: 19 blocos `fp2b01`–`fp2b19` (o 18 = `fp2b18` Tiroides, cap. 6; o 19 = `fp2b19` SNA/conciencia, cap. 1), banco (`bancofp2`), mazo (`revisaofp2`); `fp2portada` é a capa oculta (não é montada).
- Numeração dos blocos **como no marcador do conteúdo**, que não segue os ids: `fp2b12` = bloco 03 (EII), `fp2b04` = 04 (Páncreas), `fp2b03` = 05 (Hígado), `fp2b13` = 06, `fp2b14` = 07, `fp2b05` = 08 … `fp2b11` = 14, `fp2b15` = 15, `fp2b16` = 16, `fp2b17` = 17.
- Sem «UNIDAD X» no conteúdo ⇒ sem unidades.
- Itens: 728 `.quiz-item`, 2046 `.flashcard`, 33 imagens, 65 tabelas (idênticos com o tema ligado e desligado).

## 2 · Dados de alunos (SELECT somente leitura, 04/11/2026)
`fisiopatologia-ii`: **47 grifos** (`fp2b01` 42 de 4 contas, `fp2b02` 4, `fp2b12` 1), **0 traços, 0 notas**. Nenhum texto de conteúdo mudou ⇒ grifos válidos; sem traços, sem risco de índice de âncora.

## 3 · Fonte → decisão
| Fonte | Decisão |
|---|---|
| Convenção Claude 4 (`TEMAS`, `CANDIDATAS`, `rm_materia_rollout`) | mesmo mecanismo das demais matérias em implantação |
| Marcadores de bloco do HTML | `clasificarFP2` lê id → tipo/n/num/cap |
| Infografías do bloco (`assets/img/fisio2/`) | 9 vinhetas 480×480 recortadas; proveniência em `docs/nova-era-temas/PROVENIENCIA-IMAGENS-FISIO2.md` |
| Blocos 03, 04, 06, 07, 12, 15, 16, 17, 18, 19 (só SVG/quadros ou recortes com rótulo na borda) | logotipo existente (`vig: null`); arte pendente registrada |
| `rm-modes.js` (regra da #633) | modo «Infografías» aparece (as infografías desta matéria são `figure.rmc-fig`); «Videos» não existe (sem vídeos) |

## 4 · Testes (resultado real, Chromium)
Ver o corpo da PR (resultados finais sobre a main atualizada).

## 5 · Limites
- Vinhetas: 10 blocos usam o logotipo (arte pendente).
- **Blocos 18 e 19 (09–10/11):** o mapa `FP2_NUM`/`FP2_SEMVIG` os reconhece; `temas-fisio2` exige 19 blocos quando o HTML os tem (17 quando ainda não) e `RM_EXIGE_19=1` o torna obrigatório. Integração testada em merge descartável com a branch da #650 (que contém a #643); a #645 NÃO inclui o conteúdo.
- **Ordem de merge:** #643 → #650 → #645. Se a #645 entrar antes, a matéria continua correta com 17 blocos (nada quebra); só ganha 18 e 19 quando o conteúdo entrar.
- **Pendência do conteúdo (não desta PR):** figuras do slide 13 (Glasgow, pupilas, slides 3–4, 8, 12, 15–18) não lidas; ver a matriz da #650.
- Chromium com caneta simulada por CDP, não Safari/Apple Pencil. A conferência final no iPad é de José.
- SQL de prévia: `docs/nova-era/ROTEIRO-FISIO2.md` — **não executado**.

## 6 · Atualização 10/11 — `main`, ordem de merge e auditoria de publicação
- Branch atualizada com a `main` `003d39a9` (merge limpo; só conteúdo de AP II entrou).
- Ordem de merge e receita de conflitos com as PRs #634/#635/#636/#644: `docs/nova-era-temas/ORDEM-DE-MERGE-NOVA-ERA.md`.
- `auditoria-implantacao-publica`: as 22 falhas eram do **teste** (ligava a matéria por variáveis que o servidor já não lê). Teste atualizado para a tabela `rm_materia_rollout`; resultado na PR.
