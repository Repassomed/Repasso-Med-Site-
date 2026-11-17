# Farmacología II · slides novos de endócrino (17/11/2026) → blocos 10 e 11

Fecha: 17/11/2026 · Base: `main` `6bdeea5e` · Rama `claude/farmaco2-lt4-dosis-1711`.

## Fontes (Drive · `Farmacologia II › Slides atualizados`)

| Arquivo | Id Drive | Data | Leitura |
|---|---|---|---|
| `HIPOTIROIDISMO 2026.pdf` | `1-W8-sVk2zFWHq18T8ymsIs8WrMqnixrh` | 17/11 03:35 | **texto completo** lido; figuras/ilustrações **não renderizadas** |
| `_TIROTOXICOSis 2026.pdf` | `1U07aELUw9Xzdw41lYv2tc4r1xG1Zd1j7` | 17/11 14:53 | **texto completo** lido; figuras (oftalmopatia, dermatopatia) **não renderizadas** |

Docente no slide: Dra. Verónica Vega. **Literatura-base de Farmacología: não consultada** (nenhum livro na pasta; Goodman & Gilman, citado em outros slides, não está no Drive). Sem pesquisa externa.

## Comparação com a `main` (blocos `f2b10` Hipotiroidismo e `f2b11` Tirotoxicosis)

Conferi cerca de **55 dados/ideias** dos dois slides contra o texto atual dos blocos (consulta textual por termo; os que deram «não achado» foram relidos à mão):

- **Já ensinados** (todos, exceto os 4 itens abaixo): valores de referência (TSH 0,4–4,0), síntese hormonal (NIS, pendrina, TPO), tipos de hipotiroidismo e epidemiologia, fármacos que causam hipotiroidismo (Wolff-Chaikoff, lítio, amiodarona…), quadro clínico com frequências, diagnóstico, subclínico (critérios e dose inicial), levotiroxina (dose 1,6–1,8 µg/kg, idosos 12,5–25 µg, jejum, meia-vida, interações, monitorização 6 semanas, meta de TSH), os 4 casos clínicos, Graves (80 %, TRAb, oftalmopatia, dermatopatia), RAIU/ecografia/cintilografia, tratamento (β-bloqueadores, metimazol 10–30 mg/manutenção 5–10 mg, PTU no 1.º trimestre, agranulocitose 0,2–0,5 %, 12–18 meses, remissão).
- **Lacuna real encontrada (1):** *quando muda a necessidade de levotiroxina* — **sobe** na gestação, na má absorção/cirurgia bariátrica e quando piora a doença tireoidiana; **desce** no pós-parto (slide «Parâmetros laboratoriais de controle»). **Não constava no bloco 10.** → **acrescentado** um parágrafo no bloco 10 (§11, depois do ciclo de ajuste), sem tocar em texto existente.
- **Deliberadamente fora (3 grupos):** tabela de preços e marcas comerciais do Brasil (R$), nomes comerciais (Synthroid, Puran T4, Euthyrox, Levoid) e as referências bibliográficas do rodapé (Garber 2012; Ward 2011; Takasu 2000; Orgiazzi 2002; Abraham 2005): não são conteúdo didático.

## Marcações (Supabase, só leitura, 17/11, sem dados pessoais)

`farmacologia-ii`: `f2b10` e `f2b11` **sem grifos, traços ou notas** (os grifos da matéria estão em f2b01, f2b02, f2b04–f2b09, f2b14, f2b15; 1 traço em f2b00). A edição é num bloco sem marcações.
**Prova com o motor real do site:** os 406 grifos reais de Farmacología II foram recolocados numa página real (Chromium), com o HTML da `main` e com o desta PR: **403 de 406 pintados nos dois (0 perdidos, 0 escritas)**; os 3 que não pintam (`f2b02` ×2, `f2b08` ×1) já não pintavam na `main`.

## Testes

- Quiz/flashcards no navegador real (`tools/qa/browser-qa/farmaco2-2026-10/quiz.test.cjs new`): **464 itens, 390 MCQ, espelho bloco × banco 232 × 232, 29 mazos, 0 falhas duras** (igual à base).
- Perguntas e flashcards: **nenhum alterado** (só 1 parágrafo de ensino).

## Limites

- Figuras dos slides não renderizadas; só texto.
- Sem livro-base: o parágrafo repete o que o slide afirma (↑ gestação, má absorção/bariátrica, piora da doença; ↓ pós-parto), sem números novos.
- Não se acrescentou pergunta nova (a lacuna é de um ponto; fica como sugestão para uma rodada com a #649).
