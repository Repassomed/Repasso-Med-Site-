# Nova Era · Farmacología II · implantação privada (sem ativar alunos)

**Data:** 04/11/2026 · **Autora:** Claude 2 · **Branch:** `claude/nova-era-farmaco2-2026-11` · **Base:** `main` com a #639 (Farmacología II, questões da issue #637) e a #632 (Fisio I / Farmaco I) já mescladas.

**O que foi feito:** Farmacología II foi ligada ao carregador real da Nova Era (`CANDIDATAS` + `TEMAS` inline + CSS próprio) com 12 vinhetas recortadas de infografías do próprio conteúdo. Nenhum texto médico, id, imagem, questão, flashcard ou HTML da matéria foi alterado. Nada foi ativado e nenhum SQL foi executado.

## 1 · Estrutura real (inventário)
- 17 seções com id: `f2b00` (introdução oculta, traço de aluno), `f2b01`–`f2b14` (blocos), `f2b15` (banco geral), `f2b16` (mazo de flashcards).
- Numeração dos blocos **como no marcador do conteúdo** (06 Corticoides = `f2b07`; 07 AINE = `f2b06`).
- Sem marcador «UNIDAD X» ⇒ sem unidades; os rótulos «UNIDAD ·» ficam ocultos pelo CSS do tema.
- Questões 232 no banco = 232 nos blocos (espelho da #639) — intocadas.

## 2 · Dados de alunos (SELECT somente leitura, 04/11/2026)
`farmacologia-ii`: 252 grifos (`f2b01` 85, `f2b02` 68, `f2b04` 17, `f2b05` 63, `f2b07` 6, `f2b08` 2, `f2b14` 2, `f2b15` 9), **1 traço** (`f2b00`), 0 notas. Nenhum texto de conteúdo mudou ⇒ grifos continuam válidos. O traço está ancorado em `f2b00`, que o módulo não monta (oculta): com o tema ligado ele segue gravado e continua visível como hoje; **ponto para José olhar no iPad** (§5).

## 3 · Fonte → decisão
| Fonte | Decisão |
|---|---|
| Convenção Claude 4 (`TEMAS`, `CANDIDATAS`, `rm_materia_rollout`) | mesmo mecanismo de Medicina Familiar / Fisio I / Farmaco I |
| Marcadores de bloco do HTML | número do bloco = marcador; `clasificarFA2` lê id → tipo/n/num/cap |
| 29 infografías do bloco (`assets/img/farmaco2/`) | 12 vinhetas 480×480 recortadas, sem texto nem restos de seta; proveniência em `docs/nova-era-temas/PROVENIENCIA-IMAGENS-FARMACO2.md` |
| Blocos 12 e 14 (só diagramas/quadros de texto) | sem região limpa de ilustração ⇒ usam o logotipo (`vig: null`); arte pendente registrada |
| `rm-modes.js` (`ehInfografia`, regra da #633) | lista explícita de abas (D1 resolvida) |

## 4 · Testes (resultado real, Chromium + `rm-pilot.js` e `get-pilot-flags` reais)
| Teste | Resultado |
|---|---|
| `real-farmaco2` (ligação real, 1440/768/390: navegação, questões, flashcards, infográficos, grifos, caneta) | 109/109 |
| `temas-farmaco2` (tipo/número/capítulo, vinhetas, texto/ids/contagens idênticos com tema ligado e desligado) | 55/55 |
| `integracao-farmaco2` (6 larguras 320–1440, caneta em parágrafo e tabela, vídeos, telas pesadas) | 155/155 |
| `visual-conteudo farmacologia-ii` | 36/36 |
| `navegar-ferramentas` (farmacologia-ii, medicina-familiar, semiologia-ii) | 534/534 |
| `infografias-regra` · `servidor` · `navegador` | 48/48 · 59/59 · 247/247 |
| `nao-ativacao` | 19/19 |
| Porta do pré-voo `porta-da-materia.sh farmacologia-ii` | ABERTA |

**Achado e correção:** a 320 px o contador do divisor do banco (`.f2-bankdiv i`) saía da tela (já acontecia no layout antigo, pior). Corrigido só com CSS do tema (`flex-wrap`), sem tocar no HTML.

## 5 · Limites e dependências
- **D1 resolvida (11/11):** as 64 infografías de Farmacología II são `<div class="material-slide">` (cabeçalho + imagem + legenda) e a regra `ehInfografia` (#633) as excluía, então o modo «Infografías» não aparecia. `rm-modes.js` ganhou uma **lista explícita de abas** (`ABAS_INFO_EM_SLIDE = { 'tab-farmaco2': 1 }`): só nelas um `.material-slide` com imagem e legenda (cabeçalho que não comece por «DIAPOSITIVA»/«imagen de la prueba») conta como infografía. As outras 29 matérias seguem IDÊNTICAS bloco a bloco (`infografias-regra` 55/55, 7 casos novos). Mudança mínima e aditiva em arquivo do Claude 4; se ele preferir outra regra (p. ex. classe `rm-info` no conteúdo), basta trocar a lista.
- Vinhetas dos blocos 12 e 14: logotipo (arte pendente).
- Chromium com caneta simulada por CDP, não Safari/Apple Pencil; YouTube bloqueado no teste (o iframe existe e tem dimensão). A conferência final no iPad é de José.
- SQL de prévia: `docs/nova-era/ROTEIRO-FARMACO2.md` — **não executado**.
