# Neurología · preparo da integração #682 (infográficos) × #687 (questões) · 24/11/2026

**Executor:** Claude 2 · **Somente preparo.** Nenhum merge; **nenhuma das duas branches foi alterada** (`claude/neuro-8a1b-1911` do Claude 1 segue em `610104ed`; `claude/neurologia-infograficos-b20-b27` da #682 segue em `8446cdd6`); nenhuma PR de Neurologia tocada. A integração de ensaio está numa **branch própria**: `claude/int-682-687-preparo` (`d5203303`), **sem PR aberta** de propósito (ver §5).

## 1 · Como foi feito
`claude/int-682-687-preparo` = `#687` (`610104ed`) + merge da `#682` (`8446cdd6`) + merge da `main` atual (`3f6b3b2f`: já traz as PRs #706 e #711; a #710, de Anestesiología, segue aberta e fora). Histórico preservado: as duas branches e a `main` são ancestrais da integração (conferido com `git merge-base --is-ancestor`), então uma futura PR não duplica commits.

## 2 · Conflitos (só 3 arquivos; o HTML da matéria funde sozinho)
| arquivo | causa | resolução |
|---|---|---|
| `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/neurologia.html` | — | **sem conflito**: as 13 figuras da #682 (fim dos blocos 20–27) e as perguntas/reformulações da #687 ficam em trechos diferentes |
| `tools/qa/neu-questoes-1811/neu-questoes.test.cjs` | a #687 removeu a seção «ensino idêntico à base» (a #687 muda perguntas/ensino de propósito); a #682 tinha acrescentado nela o filtro `FIG` das figuras | **lado #687** (seção removida); a presença exata das 13 figuras continua provada por `neu-glosario.test.cjs` e `neu-infograficos-browser.cjs` |
| `tools/qa/neu-glosario/neu-glosario.test.cjs` | a #687 trocou uma asserção por `historico(...)` (sem efeito); a #682 acrescentou `.replace(GL, '$1')` | **união**: `historico(sem === N(oe…​.replace(GL, '$1')), …)` |
| `docs/layout-ensaio/inventario.json` | as duas mexem na linha de `neurologia` (e a `main` na de `oftalmologia`) | **regenerado pela ferramenta** (`inventario.cjs neurologia` + substituição da linha): neurologia 30 seções · 580 perguntas · 774 cartões; oftalmologia da `main` |

## 3 · Testes na integração (todos sem rede externa, sem escrita no banco)
| teste | resultado |
|---|---|
| `neu-8a1b` estático / navegador | 3763/3763 · 14/14 |
| `neu-glosario` estático / navegador | 414/414 · 24/24 |
| `neu-infograficos` navegador (13 figuras) | 60/60 |
| `neu-negrito` estático | 1258/1258 |
| `neu-questoes-1811` estático / navegador | 119/119 · 12/12 |
| `neu-vf` estático / navegador | 565/565 · 12/12 |
| `neuro-667` estático / navegador | 294/294 · 36/36 |
| `neu-cierre` estático | **21/23** — as 2 asserções que falham comparam «o resto da página» e «nº de perguntas» **com a `main`**; **falham do mesmo jeito na #687 sozinha** (`610104ed`, conferido num checkout à parte), porque a #687 muda perguntas de propósito. Não é efeito da integração. **Ação para o dono da #687:** atualizar a referência desse teste para a `main` pós-merge da #687. |
| `neu-negrito` navegador | **16/20 e 18/20 em duas rodadas** — a falha é «depois de responder, a explicação das MCQ/V-F aparece (N/386)», com N variando de uma rodada para outra e **também com a #687 sozinha** (18/20): o teste conta explicações que aparecem após um atraso e o computador estava ocupado com outros testes. **Não resolvido**; precisa de nova rodada com a máquina livre (pendente, não afirmo que passa). |

## 4 · Ordem recomendada (decisão é de José)
1. **Mesclar a #687** (Claude 1) como está. 2. Só então **atualizar a #682** sobre a `main`: os mesmos 3 conflitos acima se repetem e a receita é a da tabela §2 (a #687 já terá removido a seção que a #682 estendeu, então a resolução será «lado da main» nos testes). 3. Rodar `neu-glosario`, `neu-infograficos`, `neu-negrito`, `neu-vf`, `neu-questoes` e regenerar a linha de `neurologia` no inventário. 4. Auditoria e merge da #682.
Alternativa (se José preferir uma PR só): abrir PR a partir de `claude/int-682-687-preparo` **depois** de o Claude 1 concordar, porque ela contém o conteúdo da #687.

## 5 · Por que sem PR agora
Uma PR da branch de integração levaria **as duas PRs de uma vez** para a `main` (inclui o conteúdo do Claude 1). Isso é decisão de José e do Claude 1; esta rodada só provou que a união é limpa e que os testes passam.

## 6 · Limites
Não conferi o conteúdo médico de nenhuma das duas (é trabalho das PRs); só a convivência técnica. Browsers rodaram com a máquina ocupada (ver `neu-negrito`). Nada foi publicado.
