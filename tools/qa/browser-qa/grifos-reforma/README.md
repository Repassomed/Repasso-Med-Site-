# Proteção de grifos nas reformas de matéria

Mede, com texto real extraído de reformas editoriais em andamento (PRs de
revisão de matéria), se as marcações dos alunos (`user_highlights`, os
"grifos") sobrevivem quando o texto de uma matéria é reescrito — e, quando
não sobrevivem, se ficam **pendentes de revisão** (guardadas no banco, só
não desenhadas) em vez de aparecerem **no lugar errado**.

Nasceu da retomada da PR #66 (`fix/highlights-ancoragem-segura`) para cobrir
o único ponto que ela próprio documentou e deixou pendente: a V2
(`assets/rm-tools-v2.js`) ainda chamava `escolher()` directamente no seu
`repintar()` (o redesenho ao desfazer um apagar de marcação), sem usar o
`resolverAncora()` em três níveis que `aplicarHighlights()` (em
`rm-tools.js`) já usa desde a retomada de 30/09. Corrigido: `repintar()`
agora usa `resolverAncora()`, exatamente como o resto do motor.

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
   isca com o mesmo texto, nunca editada, ao lado da frase que é editada.
3. `run.cjs` — abre um Chromium real, carrega o `rm-tools.js` real (sem
   mock nenhum na lógica de ancoragem), e compara dois caminhos para cada
   caso: `indexar()+escolher()` direto (o que a V2 fazia antes) contra
   `resolverAncora()` (o que ela usa agora). Critério de aprovação: nunca
   pintar fora do bloco ou fora do texto novo.

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
como pede a regra "nunca adivinhar".

### Achado do teste adversarial (não é regressão desta correção)

O conjunto adversarial-dentro-do-bloco (50 casos) constrói, de propósito,
o cenário mais hostil possível: uma frase-isca contém o texto **idêntico,
nunca editado**, no mesmo bloco da frase que é editada. Resultado: 50/50
"erraram" — pintaram a isca — **nos dois caminhos, sem nenhuma diferença
entre o antigo e o corrigido** (coluna de paridade: 50/50). Isso não é uma
regressão desta PR: é uma característica já existente de `escolher()`
("1 candidato → aceita", comportamento documentado desde a própria PR #66
como o comportamento ANTIGO da `main`, nunca alterado) — quando o texto
literal do destaque sobra como **única** ocorrência no bloco depois da
edição (porque a instância real foi reescrita e uma cópia idêntica
sobrevive em outro lugar do mesmo bloco), o nível 1 aceita sem checar
contexto, porque até agora nunca foi preciso desambiguar um candidato
único. Decidir se vale a pena endurecer essa regra (exigir contexto mesmo
com um candidato só) é uma mudança de desenho maior, fora do escopo desta
correção — fica registada aqui, não escondida, para quem decidir revisitá-la.
