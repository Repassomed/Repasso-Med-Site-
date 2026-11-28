# Neurología · auditoria de conteúdo e da preparação da Nova Era (sequência #682 → #731) — 28/11/2026

**Estado verificado em 28/11 (GitHub):** `main` `cdbd64f6` (já com a #732). **#682 e #731 seguem ABERTAS** e **#730 também**; novas PRs do Claude 4: #733 e #735 (Toxicología). Nada foi ativado, nenhum SQL, nenhum merge.

## 0 · Anatomía Patológica II teórica — confirmação na `main` (pedido de José)
| Conferência | Resultado |
|---|---|
| `main` `cdbd64f6` (merge da #732 em 28/11 04:57) | contém o arquivo final da PR |
| Questões no bloco / no banco | **252 / 252** |
| Baseadas em exame (bloco / banco) | **192 / 192** |
| Cabeçalho do banco | «252 preguntas · 192 basadas en preguntas de examen · 60 variantes» |
| Teste da PR (`ap2-retro.test.cjs`) rodado **sobre a `main`**, contra a base pré-PR `6860acb9` | **59/59** (inclui «Ver respuesta» real em **44/44** cópias novas e substituídas: 18 novas × bloco+banco = 36, mais 8 substituídas) |
| `real-ap2` (página real no navegador) e porta do pré-voo | 106/106 e 7/7, na versão final da PR (mesmo conteúdo da `main`) |
| Itens anulados / sem gabarito confiável (registrados no pack da #732, agora na `main`: `coordination/source-packs/ap2-retroalimentacion-p2-2026-11-27-v1.md`) | **D15** anulada; **C12, E12, E13, E17, F15, F17** sem gabarito confiável (nenhuma chave inferida) |
| **Site publicado** | **não verificável daqui**: `repassomed.netlify.app` não resolve (DNS) nesta sessão e o conteúdo de AP II é privado (função com login). A `main` tem o commit; os fluxos `Guard Heartbeat` e `Coordinator (AUTO-REPARO)` do commit passaram. O fluxo `Coordinator (WORKER BRIDGE)` falhou no passo «Preflight da suíte do Coordinator», **como já falhava no merge da #728** (não é do site). Para fechar a conferência: José abre AP II logado e confere o cabeçalho do banco («252 · 192») e uma pergunta nova de cada bloco; o deploy de produção aparece em Netlify → Deploys → «Production: main» com o commit `cdbd64f6`. |

## 1 · A sequência para Neurología
1. **#682** (`claude/neurologia-infograficos-b20-b27`) → **mesclar primeiro** (13 infográficos novos, blocos 20–27, e correção do texto de punção lumbar do bloco 20).
2. **#731** (`claude/nova-era-neurologia-2026-11`, empilhada sobre a #682) → mesclar **depois** da #682 e do deploy dela.
3. Só então o roteiro `docs/nova-era/ROTEIRO-NEUROLOGIA.md` (SQL **só para a conta de José**, não executado).

**Ensaio de integração feito hoje** numa árvore descartável: `main` `cdbd64f6` + #682 + #731 → **as duas entram limpas, sem conflito** (34 arquivos, +910 −31).

## 2 · Testes na árvore `main` + #682 + #731 (todos verdes)
`neu-8a1b` · `neu-cierre` · `neu-glosario` · `neu-negrito` · `neu-prova-1124` · `neu-questoes-1811` · `neu-vf` · `preservacao-682` (blocos 20–27) → **8/8 suítes estáticas exit 0** · `nao-ativacao` 0 · `gate-por-materia` 0 · `caneta-por-materia` 0 · `css-temas` 0 · `servidor` 0 · `previa-lote` 0 · `previa-lote-acesso` 0 · **porta do pré-voo de `neurologia`: 7/7, PORTA ABERTA** · **`real-neurologia`: 118/118** (navegador real: layout, tema, caneta, grifos) · `auditoria-implantacao-publica` (base = #682): **169/169** (controle 121/121 + cenários públicos 48/48).
Observação: a mesma auditoria com base na `main` dá 168/169 por «não toca HTML de outra matéria» — é só porque o diff inclui o `neurologia.html` da #682; contra a base certa (#682 já mesclada) passa.

## 3 · Auditoria de conteúdo de `neurologia.html` (árvore combinada)
- **297 perguntas no corpo e 297 no banco** (ids `q-neu…` ↔ `bq-neu…`), texto **idêntico** em todas; ids únicos; **223** rotuladas «Basada en preguntas de examen» (corpo e banco), 110 complementares, 100 V/F de exame, 38 V/F.
- **Duplicatas exatas (mesmo enunciado e mesmas alternativas) no corpo: 2 pares**, ambos já registrados antes:
  - `q-neu-2509-05` = `q-neu234` (neuralgia do trigémino, idênticas).
  - `q-neu148` = `q-neu289` («facies parkinsoniana»): **`q-neu289` tem a resposta incompleta** («Estas son las principales.») e `q-neu148` traz as quatro características — pela Lei 8-A.1-B a canônica é a `q-neu148`.
  - **Não corrigido aqui**: todas têm id, e o Guard trata a baixa de uma pergunta ou id como falha dura; o caminho seguro é **substituir no lugar** (mesmo id, `data-guard-previous-stem-sha1`) por uma pergunta distinta e já ensinada, depois da #682 (que também mexe em `neurologia.html`). Depende de decisão de José sobre qual conteúdo entra no lugar.
- **Slides de Neurología ainda não relidos (pendência da fila de 25/11), lidos hoje por texto e comparados com o site:** `8..` (Glasgow, coma, morte cerebral: 25/25 pontos conferidos presentes, incl. apneia PaCO₂ ≥ 60 e +20, 6–24 h, 2 médicos, provas confirmatórias), `9..` (exames complementares / PL / LCR: valores do LCR, TAC antes da PL com papiledema, traumático × hemorrágico), `12..` (Parkinson: 21/21), `13..` (demências e escalas: 24/24) e `14..` (GBS, EM, cefaleias: 32/32; «85 % RR» no site vs «85–90 %» no slide é só matiz). **Nenhuma lacuna de conteúdo encontrada.** Continuam **sem reabrir**: `11..`/`15..`/`16..` já examinados; imagens dos 8 JPG de 18/11, figura do item 28, manuscritos, `provaneurorevisar_sem_repetidas.pdf` (30 MB), «imagem simulada» da Turma A 20 e as 479 imagens do Notes.
- **Fila já registrada e ainda aberta:** item 17 da prova (NIHSS «> 4 e < 25» para trombólise: o resumo só ensina as faixas de gravidade; precisa de uma frase de ensino sem mexer em grifos do bloco 21, com 120 grifos), NIHSS/4.ª forma da EM/coma no TEC sem livro-base, 2 grifos do bloco 20 que podem ter ficado sem âncora com a correção da #682.

## 4 · Preparação da Nova Era (Neurología) — o que está pronto e o que falta
| Item | Estado |
|---|---|
| 1.ª fechadura (`CANDIDATAS` em `rm-pilot.js`), tema violeta, classificador `clasificarNE`, `VER` e tag no `index.html` | na #731; porta 7/7 |
| 2.ª fechadura (tabela `rm_materia_rollout`, `preview` = só administrador, nunca `all`) | roteiro pronto, **não executado** |
| Teste real no navegador, caneta, grifos | `real-neurologia` 118/118 |
| Dependência de ordem | **#682 → #731** (a #731 está empilhada) |
| Antes do 1.º SQL | deploy da `main` publicado e conferência de acesso (L1: 1 administrador; L2: estado das linhas; L3: nenhuma em `all`) |
| Reversão | uma linha de SQL (`off`), imediata, sem deploy; dados dos alunos nunca tocados |

## 5 · O que resta, sem sobrepor o Claude 4
- **Claude 4** (layout/caneta/flags e Toxicología #733/#735): não tocado.
- **Claude 1**: depois do merge da #682, abrir PR de Neurología para (a) substituir, no lugar, as duplicatas `q-neu289` e `q-neu234`/`q-neu-2509-05`, (b) ensinar e perguntar o item 17 (NIHSS), (c) reabrir os materiais de prova ainda não examinados.
- **José**: ordem de merge #682 → #731; abrir AP II logado para fechar a conferência do site publicado.
