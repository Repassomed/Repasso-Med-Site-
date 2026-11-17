# Farmacología II · reconstrução provável de questões (19/11/2026) → banco do site

Base: `main` `44aceb97` · Branch `claude/farmaco2-questoes-recon-1911`.

## Fonte e limites

- Fonte: texto «FARMACOLOGÍA II — RECONSTRUCCIÓN PROBABLE» enviado por José no chat (14 de múltipla escolha + 5 de completar; a 15 está sem enunciado). **Não é transcrição literal de prova**: as próprias anotações dizem que são reconstruções (alternativas e, em alguns casos, o contexto foram reconstruídos). **As letras do gabarito original não são conhecidas**; as letras do site foram redistribuídas (sem padrão) e **não refletem a prova**.
- Conferido contra os slides atuais da cátedra no Drive (`Farmacologia II › Slides`): `06 - SISTEMA RESPIRATORIO.pdf` (id `1nSKmR4r_Ee7L_Mo6iLSajfSPBw9E6iFH`) e `05 - Antiinflamatorios esteroideos.pdf` (id `1VW6csyenswiW9Yyik35H5KiUPFG0q3Gm`), texto completo lido. As bulas citadas por links do texto recebido (DailyMed) **não foram abertas**. **Literatura-base de Farmacología (Goodman & Gilman etc.): não há no Drive** (busca em 17–19/11 sem resultado); onde o slide cita as figuras do Goodman & Gilman, o conteúdo do slide foi tomado como a fonte.
- Marcações: Supabase só leitura (17/11, sem dados pessoais): grifos de `f2b07` e `f2b08` existem. Prova com o motor real: **406 grifos → 403 pintados na `main` e 403 nesta PR (iguais), 0 escritas**.

## Resultado por questão

Auditoria de duplicatas (8-A.1) comparando conceito, conhecimento, raciocínio e conclusão com as 464 questões do site (232 + espelho do banco). Legenda: **JÁ EXISTIA** (duplicata; fica a existente, que já é a canônica) · **INCORPORADA A OUTRA** (a existente cobre o ponto e foi mantida como mais completa) · **ACRESCENTADA** · **PENDENTE**.

| # | Tema | Decisão | Onde / com quê |
|---|---|---|---|
| MCQ 1 | Riscos do corticoide prolongado (eixo, osteoporose, infecção, retirada brusca) | **ACRESCENTADA** | `f2b07` (bloco 06) + banco. Relacionada a b07#2/#9/#10, mas só esta cobra o **feedback sobre ACTH, a infecção sem sinais de alarme e a gliconeogênese** (b07 ensina, slide 05 confirma) |
| MCQ 2 | Prednisona + AINE, misoprostol | **JÁ EXISTIA** (misoprostol: b06#5, b09#1) · **PENDENTE** o trecho «corticoide + AINE» | A relação com o corticoide não é determinável (a própria reconstrução diz que é incerta) e o resumo não a ensina: não foi acrescentada |
| MCQ 3 | Sais de bismuto | **JÁ EXISTIA** | b09#15 (bactericida + capa protetora; efeitos: fezes negras em b09#10) |
| MCQ 4 | Hidrocortisona × fludrocortisona na reposição | **ACRESCENTADA** | `f2b07` + banco. b07#6/#7 só testam o perfil da fludrocortisona; esta cobra a reposição (Caso 1 do resumo; slide 05: mineralocorticoides «em associação com glucocorticoides») |
| MCQ 5 | Zileutón | **JÁ EXISTIA** | b08#20 |
| MCQ 6 | Anticolinérgicos (I–IV) | **INCORPORADA A OUTRA** | b08#6 e b08#8 já cobrem cada uma das 4 afirmações (histamina/leucotrienos, tono vagal, M₃) |
| MCQ 7 | β₂ → Gs → AC → AMPc → PKA | **INCORPORADA A OUTRA** | b08#9 (a explicação traz a sequência) |
| MCQ 8 | Sulfato de magnésio | **JÁ EXISTIA** | b08#10 (e V/F b08#7) |
| MCQ 9 | Sucralfato (mecanismo) | **INCORPORADA A OUTRA** | b09#14 (completar) + b09#8 + b09#16 |
| MCQ 10 | Misoprostol (uso GI) | **JÁ EXISTIA** | b09#1 e b06#5 |
| MCQ 11 | Anticolinérgicos asma × EPOC | **JÁ EXISTIA** | b08#6 (e explicação de b08#8) |
| MCQ 12 | Osteoporose por glicocorticoide | **INCORPORADA A OUTRA** | b07#2 (a explicação já lista os 4 mecanismos do slide); a opção correta da recebida junta osteoblastos + cálcio, equivalente |
| MCQ 13 | Crise asmática: salbutamol | **JÁ EXISTIA** | b08#3 |
| MCQ 14 | Roflumilast (uso clínico) | **ACRESCENTADA** | `f2b08` (bloco 08) + banco. b08#1 só pergunta o mecanismo; esta cobra via oral, EPOC grave, exacerbações e «não é de resgate» (slide 06) |
| MCQ 15 | sem enunciado | **FORA** | não reconstruída (sem tema determinável) |
| Completar 1 | Antileucotrienos sem papel na EPOC | **ACRESCENTADA** | `f2b08` + banco. Slide 06: «os antagonistas dos receptores CisLT1 não têm nenhum papel na terapia da COPD»; o bloco já ensina («no tienen papel en la EPOC») |
| Completar 2 | Famotidina (menos interações que a cimetidina) | **PENDENTE** | O enunciado foi reconstruído a partir da resposta da foto e **não tem resposta única**: o resumo diz que «famotidina e nizatidina são mais seguras» (e a ranitidina 10 %). Sem enunciado original não é possível torná-lo inequívoco sem inventar dado |
| Completar 3 | Sucralfato (proteção local + interfere na absorção) | **JÁ EXISTIA** | b09#14 (barreira + «se adhiere a otros fármacos, separar las tomas»); «absorção mínima» não está no resumo/slide, não foi acrescentada |
| Completar 4 | Misoprostol: gravidez / contração uterina | **JÁ EXISTIA** | b09#1 (V/F) + explicação de b06#5 |
| Completar 5 | Fosfolipase A₂ | **JÁ EXISTIA** | b06#2 (MCQ) e glossário do b06 |

Total: 19 recebidas (14 MCQ + 5 completar), 15 consideradas além da sem enunciado → **4 acrescentadas** (3 MCQ + 1 completar), 8 já existiam, 5 incorporadas a outra, 2 pendentes (MCQ 2 no trecho do corticoide; completar 2), 1 fora (MCQ 15). Nenhuma questão antiga foi alterada, removida ou renumerada.

## O que mudou no site

- `f2b07` (+2): MCQ 1 e MCQ 4, no fim do grupo «Basada en preguntas de examen» do bloco 06.
- `f2b08` (+2): MCQ 14 e completar 1, no fim do grupo «Basada en preguntas de examen» do bloco 08.
- `f2b15` (banco): as mesmas 4, **idênticas** às do bloco, no fim dos mesmos grupos.
- Contadores (8-A.10): banco 232 → 236 · baseadas em exame 132 → 136 · bloco 06: «11 basadas en exámenes · 8 complementarias» · bloco 08: «12 basadas en exámenes · 13 complementarias». Inventário `docs/layout-ensaio/inventario.json` (só a linha da matéria): 464 → 472 itens.
- **Resumo (8-A.2):** nenhuma frase nova foi necessária: cada ponto cobrado já é ensinado antes (b07: feedback CRH/ACTH, infecções sem sinais de alarme, osteoporose, Caso 1 de Addison; b08: roflumilast, «no tienen papel en la EPOC»).

## Testes

- Quiz/flashcards em navegador real (`quiz.test.cjs new`): **472 itens · 396 MCQ · espelho 236 × 236 · 0 divergências · 0 falhas duras** (avisos de heurística 170 → 178: cabeçalho da explicação parafraseia a opção, padrão já existente).
- Motor real de grifos: 403/406 = `main` (0 perdidos, 0 escritas).
- Porta do pré-voo `farmacologia-ii`: **ABERTA** (7 etapas PASSA; a 1.ª tentativa falhou no layout porque o inventário ainda dizia 17/23 questões; regenerado).

## Limites / revisão humana

- Reconstruções: não declarar como «questão oficial» (o rótulo usado é «Basada en preguntas de examen»).
- Pendências: MCQ 2 (relação corticoide + AINE) e completar 2 (famotidina); precisam do enunciado original ou de fonte.
- Sem literatura-base no Drive; bulas DailyMed não abertas.
