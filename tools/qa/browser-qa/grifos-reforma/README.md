# Proteção de grifos nas reformas de matéria

Mede, com texto real extraído de reformas editoriais em andamento (PRs de
revisão de matéria), se as marcações dos alunos (`user_highlights`, os
"grifos") sobrevivem quando o texto de uma matéria é reescrito — e, quando
não sobrevivem, se ficam **pendentes de revisão** (guardadas no banco, só
não desenhadas) em vez de aparecerem **no lugar errado**.

Nasceu da retomada da PR #66 (`fix/highlights-ancoragem-segura`). Duas
rodadas:

**Rodada 1** — cobriu o único ponto que a própria retomada de 30/09
documentou e deixou pendente: a V2 (`assets/rm-tools-v2.js`) ainda chamava
`escolher()` directamente no seu `repintar()` (o redesenho ao desfazer um
apagar de marcação), sem usar o `resolverAncora()` em três níveis que
`aplicarHighlights()` (em `rm-tools.js`) já usa. Corrigido: `repintar()`
agora usa `resolverAncora()`.

**Rodada 2** — o teste adversarial da rodada 1 achou um jeito real de uma
marcação reaparecer na **frase errada**: quando o texto literal de um
destaque é reescrito e uma cópia idêntica (nunca tocada) sobrevive em
outro lugar do MESMO bloco — um texto de template repetido, por exemplo —
`escolher()` aceitava essa cópia às cegas, porque virava a única
ocorrência literal e um candidato único nunca era checado contra o
contexto gravado. Corrigido em `escolher()`: um candidato único só é
aceito sem checar contexto quando **não há contexto gravado** (preserva
compatibilidade total com dados antigos); havendo `prefix`/`suffix`
gravados, exige que pelo menos um lado bata, mesmo com um candidato só.
E quando há **mais de um** candidato literal (ambiguidade real), um
vencedor não-empatado só é aceito com pelo menos um lado batendo **à
letra** (não mais um match fraco de 12 caracteres por coincidência — foi
exatamente esse tipo de "vitória por default" que o teste adversarial
pegou numa primeira rodada de correção).

## O que o pipeline faz

1. `extract_pairs.py` — lê um `git diff <base> <head> -- matéria.html` pelo
   stdin e isola trocas de uma linha por uma linha (o padrão de uma frase
   reescrita dentro de um HTML de linha única), tira as tags, filtra CSS e
   trechos curtos demais para serem prosa.
2. `build_cases.py` — separa os pares em `near` (edição pequena,
   `difflib.ratio >= 0.85`) e `far` (reescrita substancial, `< 0.85`);
   escolhe, para cada par, um trecho de **destaque** que **atravessa a
   região realmente editada** (não um pedaço qualquer que por acaso
   sobreviveu intacto — isso testaria o quê?), com prefixo/sufixo de 40
   caracteres, do mesmo jeito que `marcarRange()` grava de verdade. Monta
   também um conjunto adversarial **dentro de um único bloco**: uma frase
   isca que embute o MESMO texto do destaque, nunca editada, com um
   contexto local genuinamente diferente (vem de outra frase do corpus,
   não é só um prefixo decorativo colado na frente do mesmo texto — essa
   foi a falha da primeira versão deste script, corrigida depois de o
   resultado inicial não bater com a inspeção manual).
3. `run.cjs` — abre um Chromium real, carrega o `rm-tools.js` real (sem
   mock nenhum na lógica de ancoragem), e compara dois caminhos para cada
   caso: `indexar()+escolher()` direto (o que a V2 fazia antes da rodada 1)
   contra `resolverAncora()` (o que ela usa agora). No conjunto
   adversarial, verifica onde a marcação pintada realmente caiu no DOM
   (`Node.contains()`, não comparação de texto — um texto curto pode
   coincidir em mais de um lugar e dar falso positivo num `includes()`).
   Critério de aprovação: nunca pintar fora do bloco, fora do texto novo,
   ou na frase-isca errada.

## Como rodar

```bash
export NODE_PATH="$(npm root -g)"   # onde o pacote `playwright` (Node) está instalado

git diff <base> <head> -- caminho/da/materia.html \
  | python3 extract_pairs.py > /tmp/pairs.json
python3 build_cases.py /tmp/pairs.json /tmp/cases.json
node run.cjs /tmp/cases.json "../../../../Repasso-Med-Site--main/Atual - Copia/assets/rm-tools.js" --json /tmp/resultado.json
```

Sai `0` se nada pintou fora do lugar; `1` se algo pintou errado.

## Resultado de referência (validação desta correção)

Rodado contra os textos reais das PRs #474 (Farmacología II,
`2f12e73e..9d28561d`) e #481 (Fisiopatología II,
`25dc12dc..c023c53c`) — as duas reformas de matéria em andamento no
momento desta correção, servindo de amostra real do que as próximas 25
reformas vão parecer:

| | near (n=102) | far (n=139) |
|---|---|---|
| recupera com `escolher()` direto (V2 antiga) | 2/102 | 53/139 |
| recupera com `resolverAncora()` (V2 corrigida) | 2/102 | 55/139 |
| pintou fora do bloco/texto novo | 0 | 0 |

Ganho líquido: **+2 recuperações reais** que a V2 antiga perderia
silenciosamente ao desfazer um apagar de marcação, com **zero** marcação
pintada em lugar errado nos 241 casos. A maioria das frases `near`/`far`
desta amostra são reescritas de conteúdo de verdade (G0, correção
científica), não apenas pontuação — por isso o ganho absoluto é modesto:
o sistema está certo em recusar e deixar pendente a maioria delas, exatamente
como pede a regra "nunca adivinhar". **Esta PR não resolve grifos sobre
frases totalmente reescritas** — essas ficam corretamente pendentes, por
desenho; não há como recuperar com segurança o que mudou de sentido.

### Teste adversarial — marcação na frase errada

Conjunto de 50 casos dentro de um único bloco: uma frase-isca com o MESMO
texto do destaque, nunca editada, com contexto local genuinamente
diferente (de outra frase do corpus), ao lado da frase real que é
editada.

| | antes da rodada 2 | depois da rodada 2 |
|---|---|---|
| pintou a isca errada | 50/50 | **2/50** |

Os **2 casos restantes** são registros com `prefix` **e** `suffix`
totalmente vazios — nenhum contexto gravado para checar. Por desenho (e
por exigência explícita de compatibilidade com os dados reais já
gravados — ver PR #66, "compatibilidade total"), um candidato único sem
nenhum contexto gravado continua sendo aceito, porque não há nada contra
o que verificá-lo e `escolher` exige correspondência literal exacta de
qualquer forma. Inspecionado manualmente: os 2 casos vêm de linhas HTML
que são, sozinhas, `<p>` inteiros muito curtos (um título de caixa de
armadilha) — ao isolar essa única linha como "bloco" de teste, o prefixo
e o sufixo saem vazios; no arquivo real, a mesma linha vive dentro de uma
seção bem maior, com texto real antes e depois (confirmado por inspeção
do diff original), então na produção real o registro teria contexto de
verdade para checar. Isto é uma limitação honesta do desenho do teste
(linha isolada vira bloco artificial), não uma prova de risco real
— mas fica registrada, não escondida, como PR #66 e as correções
seguintes sempre fizeram.

**Paridade com o comportamento antigo:** dos 50 casos, 49 continuam
idênticos entre o caminho antigo e o corrigido; o único que muda é uma
melhoria genuína (nível 2 recupera corretamente a frase certa onde o
caminho antigo não recuperava nada) — nenhuma regressão introduzida pela
rodada 2.
