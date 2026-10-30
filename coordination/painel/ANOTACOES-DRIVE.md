# Registro de anotações do Drive → site

**Conferido em 28/10/2026; atualizar após cada merge e novo PDF.** Fonte: pastas do Drive e PRs mescladas na `main`. Lei: [LEI-ATUALIZACAO-CONTINUA-REPASSO-MED.md](../../LEI-ATUALIZACAO-CONTINUA-REPASSO-MED.md). Esta conferência verifica o inventário e a rastreabilidade documental; **não é uma releitura independente dos 22 PDFs já analisados nem uma certificação de perfeição médica**.

**Total encontrado nas quatro pastas de Anotações:** **23 PDFs = Farmacología II 9 + Fisiopatología II 5 + Anatomía Patológica II 6 + Semiología II 3**. Os 22 PDFs anteriores têm registro de leitura/comparação nas PRs abaixo; o PDF novo de Farmacología II, recebido em 28/10, está **⬜ pendente**. Uma anotação pode ter sido comparada e **não** copiada porque já estava ensinada, estava errada ou não tinha base. O rastreio individual de Semiología II e do PDF suprarrenal foi concluído nas PRs #603 e #604, mescladas; a conferência usou a camada de texto dos PDFs, sem ler imagens internas.

## Legenda

| Estado | Significado |
|---|---|
| ✅ integrado | Acréscimo pertinente consta de PR mesclada na `main` (detalhe e bloco indicados). |
| ➖ já coberto/descartado | PDF comparado; nada novo entrou, por duplicação, erro ou falta de fonte. |
| 🟠 comparado, rastreio incompleto | PR mesclada atesta leitura e integração seletiva do conjunto; falta demonstrar a decisão e o destino de **cada** PDF. Não equivale a afirmar que seu conteúdo inteiro entrou. |
| ⬜ novo | Ainda não comparado. Registrar assim quando José colocar outro arquivo. |

## Farmacología II — 9 PDFs

Drive: `Biblioteca › 6 semestre › Farmacologia II › Anotações`. [PR #474](https://github.com/Repassomed/Repasso-Med-Site-/pull/474) mesclada em 22/10. Evidência detalhada: `coordination/source-packs/farmacologia-ii-revisao-2026-10-anotacoes-v1.md` (E1–E10). A indicação de E1 “espera aceite” no registro antigo perdeu validade após o fechamento e merge da #474.

| PDF | Estado na main | Decisão → destino |
|---|---|---|
| [Resumen_Clases_Farmacologia.pdf](https://drive.google.com/file/d/1rwBXwpoLLvQbG9i9g1wWMcY1qwdAWPo3/view) | ⬜ novo; **não integrado** | Recebido em 28/10. Resumo de transcrições de quatro aulas (29/09, 05/10, 19/10, 27/10: corticoides e asma/EPOC). Claude 2 deve comparar item a item com site e slides, validar ciência e registrar decisão/destino. O PDF diz “Prohibido Compartir”: uso apenas para conferência interna; **não reproduzir sua redação ou páginas no site**. |
| `SRAA.pdf` | ✅ integrado | E7 → bloco b03; “bradicinina = hiper-K⁺” rejeitado. |
| `antihipertensivos.pdf` | ➖ já coberto | Bloco b02 já ensinava os pontos aproveitáveis. |
| `Diureticos.pdf` | ✅ integrado | E5–E6 → b02; percentual de alça sem confirmação não entrou. |
| `Beta bloqueador.pdf` | ✅ integrado | E4 → b01; β2/β3 sem base não entraram. |
| `Calcioantagonista.pdf` | ✅ integrado | E8 → b05. |
| `antiinflamatorio corticoide.pdf` | ✅ integrado | E9–E10 → b07. |
| `Antiangionoso.pdf` | ✅ integrado | E1–E3 → b05; consultar decisão final da #474 para a ressalva cátedra × literatura. |
| `Resumo P1 farmaco.pdf` | ➖ já coberto/descartado | Duplicações e afirmações incorretas; sem acréscimo. |

**Limite editorial distinto de anotação:** frases G0 sob grifos reais permanecem preservadas até uma migração de marcações planejada; não justificam frear o layout em outras matérias.

## Fisiopatología II — 5 PDFs

Drive: `Biblioteca › 6 semestre › Fisiopatologia II › Anotações`. [PR #481](https://github.com/Repassomed/Repasso-Med-Site-/pull/481) mesclada em 23/10. Evidência dos quatro primeiros: `coordination/source-packs/fisiopatologia-ii-issue101-anotacoes-v1.md`. O quinto PDF chegou em 22/10 e consta explicitamente do escopo e da descrição final da #481.

| PDF | Estado na main | Decisão → destino |
|---|---|---|
| `Fisiopato - esofago.pdf` | ✅ integrado | Ressalvas de sialosis e espasmo difuso → fp2b01; erro “espasmo = cascanueces” não entrou. |
| `Fisiopato - Reflujo.pdf` | ✅ integrado | Nota sobre ranitidina/anti-H₂ → fp2b02; erros de pepsina/B12 e hérnia não entraram. |
| `Fisiopato - Pacreatites.pdf` | ➖ já coberto | fp2b04 já cobria a nota; final “pancreatitis crónica” não tinha conteúdo. |
| `Fisiopato - intestino.pdf` | ✅ integrado | Abscesso, fístula e perfuração livre no Crohn → fp2b12. |
| `Fisiopato suprarenal.pdf` | ➖ já coberto | Rastreio item a item na [#603](https://github.com/Repassomed/Repasso-Med-Site-/pull/603), mesclada: itens legíveis do PDF já estavam em fp2b17; campos em branco não acrescentam conteúdo. Imagens internas não conferidas. |

**Limite das fontes:** a #481 não conferiu visualmente todas as figuras dos slides 09–10; essa lacuna é dos slides, não significa PDF de anotações sem leitura.

## Anatomía Patológica II — 6 PDFs

Drive: `Biblioteca › 6 semestre › Anatomia Patologica II › Anotações`. [PRs #458](https://github.com/Repassomed/Repasso-Med-Site-/pull/458), [#476](https://github.com/Repassomed/Repasso-Med-Site-/pull/476) e [#499](https://github.com/Repassomed/Repasso-Med-Site-/pull/499). A #499 (22/10) **resolveu três pendências** que o painel de 15/10 ainda dizia abertas: CEC oral a distância, 35% de segundo primário segundo slide e MALT 40%/Russell. Evidências: `coordination/source-packs/anatomia-patologica-ii-auditoria-2026-10-10-v1.md` e descrição da #499.

| PDF | Estado na main | Decisão → destino |
|---|---|---|
| `Cavidade oral.pdf` | ✅ integrado | HPV-16 (#476); metástase a distância e risco de segundo primário (#499) → AP II b01. Tabela de tumores salivares: confirmar no registro de fonte antes de declarar integração. |
| `patologias do esofago.pdf` | ➖ já coberto | Bloco de esôfago conferido na #458; sem ganho identificado no painel anterior. |
| `Patologias do estomago.pdf` | ➖ já coberto/descartado | Já coberto; transformação “muito frequente” de úlcera não entrou por erro. |
| `Tumores gastricos.pdf` | ✅ integração parcial | MALT 40%/Russell entrou na #499. A maior ênfase em Virchow/Krukenberg consta do painel antigo; **a descrição da #499 não comprova seu destino**, requer checagem pontual no HTML/source pack. |
| `perguntas questões.pdf` | ✅ já correspondia às questões | 11/11 equivalentes; Q30 completada na #476; “P53 y P63” de Q29 rejeitado. |
| `Resumo P1.pdf` | ➖ já coberto | 16 pontos já no site, conforme auditoria antiga. |

**Limites científicos/editoriais registrados na #499:** Robbins não legível, alguns itens sem fonte confirmada e frases G0 mantidas por grifos. Não declarar “matéria perfeita” nem corrigir frases grifadas sem plano de migração.

## Semiología II — 3 PDFs

Drive: `Biblioteca › 6 semestre › Semiologia II › Anotaçoes `. A afirmação antiga de “não existe pasta” estava errada. A [#532](https://github.com/Repassomed/Repasso-Med-Site-/pull/532) registrou a leitura do conjunto; a [#603](https://github.com/Repassomed/Repasso-Med-Site-/pull/603) fez o rastreio **por PDF** e a [#604](https://github.com/Repassomed/Repasso-Med-Site-/pull/604) integrou dois pontos validados por slides. Todas mescladas. Rastreio detalhado: `coordination/source-packs/semiologia-ii-anotaciones-rastreo-2026-10-v1.md`. **Limite:** texto dos PDFs conferido; imagens internas não inspecionadas.

| PDF | Estado na main | Decisão → destino |
|---|---|---|
| `Actividade de repasso Semio.pdf` | ➖ já coberto/erros descartados | Respostas do aluno e casos cotejados com b01–b04; regra da exacerbação da asma já estava na #532. Imprecisões de casos não copiadas. Não é prova original. |
| `Motivo de consulta Semio.pdf` | ✅ integração seletiva | Derrame pleural como complicação mais frequente da pneumonia → b04 na #604; demais pontos em b01–b05 ou rejeitados quando incorretos/sem base. |
| `Revisao P1 semio.pdf` | ✅ integração parcial | Explicação dos 3 lobos direitos e 2 esquerdos → b04 e espelho do banco na #604, confirmada por slide de Anatomía I. Erro “pleura de 3 capas” rejeitado. Não é prova original. |

O conteúdo de **Material atual** sobre pleura e diferencial radiológico é outra fonte: a #603 não o atribui retroativamente a estes três PDFs.

## Fora destas pastas / decisões de prioridade

- AP II Práctica P2 é **material oficial**, não PDF da pasta Anotações; integração feita na [PR #580](https://github.com/Repassomed/Repasso-Med-Site-/pull/580). Verificação visual de todas as imagens originais grandes ficou incompleta.
- Histología II: PDF externo grande e vídeo de aula fora de “Anotações”; sem comparação integral registrada. Monitorar, sem travar as demais matérias.
- Medicina Legal: imagens mantidas por decisão de José. Medicina Familiar: infográficos mantidos por ora. Imagenología e Bioestadística: refazer do zero depois. Infográficos mais profundos: após layout/caneta.

## Protocolo obrigatório quando chegar PDF novo

1. Coordenador registra **uma linha por arquivo**, título, pasta e data, com ⬜.
2. Claude lê e compara com a versão atual do bloco e com slides/literatura-base; preenche **PDF → página/trecho → bloco → já coberto/novo/erro/conflito → decisão justificada → destino no HTML/questão ou motivo da exclusão → PR**. Não copiar automaticamente.
3. Claude confere ciência, G0, espelhos de questões e grifos por consulta somente leitura; testa antes de entregar.
4. Após merge feito por José, coordenador confere a `main`, troca o estado e registra a data. **PR aberta nunca é ✅.**
5. No começo de cada rodada, comparar a lista de arquivos da pasta do Drive com esta tabela; arquivo sem linha = ⬜ e vira tarefa rastreável.
