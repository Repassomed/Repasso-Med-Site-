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

**Rodada 3** — dois problemas descobertos na própria rodada 2, ambos
corrigidos:

1. **O critério de falha de `run.cjs` não olhava para `advWrong`.**
   `failed` era calculado só com `near.badText`, `far.badText` e
   `advParity !== adv.length` — nunca com `advWrong` diretamente. Quando o
   caminho antigo e o corrigido erram **da mesma forma** (paridade total),
   `advParity` não acusa nada, e os 2/50 casos que pintavam a isca errada
   passavam como sucesso. Corrigido: `failed` agora inclui `advWrong > 0`
   sem condição nenhuma — qualquer pintura na isca reprova, com ou sem
   paridade com o comportamento antigo (paridade prova só "não é regressão
   desta correção específica", nunca "está seguro").
2. **A exceção "sem contexto gravado, aceita às cegas" da rodada 2 era o
   próprio risco, não uma mitigação.** Os 2 casos residuais da rodada 2
   foram reconstruídos usando a SEÇÃO REAL da matéria (não mais uma linha
   HTML isolada tratada como bloco falso — essa isolação é que fazia
   prefix/suffix saírem vazios por acidente de metodologia, não porque o
   registro real seria assim): `advC-041` vem do bloco `f2b07` (caixa-
   trampa da fludrocortisona) e `advC-047` vem do bloco `f2b02` (título
   "Los dos grupos..."), ambos extraídos de
   `farmacologia-ii.html` na base real da PR #474 (commit `2f12e73e`),
   com o texto real que existe de verdade antes/depois da frase marcada —
   ver `rebuild_adversarial_real.cjs`. Rodados os dois casos reconstruídos
   contra o `rm-tools.js` **da própria rodada 2** (antes desta correção):
   as 2 variantes com prefix/suffix vazios (`advC-041b`/`advC-047b` —
   simulando um registro antigo sem contexto gravado) pintam a isca
   errada, confirmando com texto real (não mais uma hipótese de "artefato
   de teste") que a exceção da rodada 2 era um risco real de produção, não
   um caso artificial. Corrigido em `escolher()`: a exceção foi removida —
   um candidato único **sempre** precisa de `notaDeContexto(...) > 0` para
   ser aceito, contexto gravado ou não. Um registro sem `prefix`/`suffix`
   não tem como provar que a sua "unicidade" de hoje é a mesma de quando
   foi criado (pode ter se tornado único porque um gêmeo em outro lugar do
   bloco foi editado) — por isso fica **pendente**, nunca pintado às
   ciegas. Essa é a mesma política que o nível 2/3 (`contextoSolto`) já
   aplicava desde `b0c4a73d`; agora o nível 1 (`escolher`) é consistente
   com ela.

**Rodada 4** — a rodada 3 endureceu `escolher()` o suficiente para abrir
uma pergunta nova e legítima: será que algum grifo REAL de aluno dependia
do "aceita às cegas" removido para continuar visível, mesmo em texto que
nunca mudou? Resposta, com dados reais (consulta somente leitura ao
Supabase, nunca escrita): **não, hoje não** — mas existia um caso
estrutural não coberto, corrigido nesta rodada. Detalhes:

1. **Comparação real `main` × PR, 25 matérias elegíveis.** Consulta
   `select subject_slug, block_id, exact_text, prefix, suffix,
   occurrence, color, id from user_highlights where subject_slug not in
   ('farmacologia-ii','fisiopatologia-ii')` (essas duas já têm teste
   dedicado com diff real das PRs #474/#481) devolveu **1.910 grifos
   reais** em 14 das 25 matérias elegíveis (as outras 11 não têm grifo
   nenhum ainda). `compare_real_highlights_main_vs_pr.cjs` (novo) roda o
   `rm-tools.js` da `main` (nunca mesclou nada desta PR — `escolher()`
   ainda aceita qualquer candidato único às cegas, sem checar contexto
   nenhum) e o da PR contra o HTML REAL e NÃO MODIFICADO de cada matéria
   (controle positivo: texto inalterado desde a criação do grifo) —
   mesmo que `rm-tools.js` mude, o conteúdo da matéria não muda com esta
   PR. Resultado: **1.873/1.910 resolvem igual nos dois** (main e PR
   idênticos, matéria por matéria); os 37 restantes já não resolviam
   nem na `main` (conteúdo mudou desde a criação do grifo por outro
   motivo, confirmado manualmente num caso de `histologia-ii`: a palavra
   "endocárdio" não existe mais no arquivo) — **zero regressão**.
2. **Por quê zero?** A mesma consulta confirmou **0/1.910** grifos reais
   com `prefix` **e** `suffix` vazios ao mesmo tempo — a única condição
   em que a rodada 3 muda o comportamento do nível 1. `marcarRange()`
   sempre grava os dois (até 40 caracteres), então essa condição só
   acontece quando o grifo cobre o bloco INTEIRO (começa e termina com o
   bloco) — um caso raro que nenhum grifo real atinge hoje.
3. **Mas o caso existe estruturalmente, e merece solução — não só
   constatação.** Um teste sintético isolado (`test_full_block_edge_case.cjs`,
   novo) prova a regressão em abstrato: um grifo cobrindo um bloco curto
   por completo, em texto **nunca editado**, resolvia na `main` e ficava
   pendente na PR (rodada 3) — mesmo sem NADA ter mudado. Corrigido em
   `escolher()`: quando `h.exact_text.length === norm.length` (o grifo É
   o bloco inteiro), aceita sem exigir contexto — não é uma reabertura do
   buraco da rodada 2, é uma exceção estreita e **comprovável por
   comprimento**: uma segunda cópia do bloco inteiro dentro do próprio
   bloco exigiria `norm` conter uma cópia de si mesma mais uma sobra, o
   que nenhum texto pode fazer. O mesmo teste sintético confirma que a
   exceção não reabre risco nenhum: se a edição reescreve o parágrafo
   original **e** acrescenta um decoy com o texto antigo verbatim,
   `norm` passa a ter mais conteúdo que o decoy sozinho, a condição de
   comprimento deixa de bater, cai no caminho normal (exige contexto) e
   fica pendente — nunca pinta no decoy. **Achado extra, não corrigido
   por esta PR porque é comportamento pré-existente da `main`:** o mesmo
   teste mostra que a `main`, hoje, PINTA NO DECOY nesse cenário exato
   (bloco-inteiro + reescrita + decoy) — um risco real, silencioso, já em
   produção, que esta PR elimina de passagem ao corrigir `escolher()`.
4. **Carregamento e desfazer com amostra real.** `test_carregamento_desfazer.cjs`
   voltou a rodar (sem mudança, 4 variantes da rodada 3 seguem pendentes,
   nunca na isca). Além disso, uma amostra real das 3 maiores matérias
   (oftalmologia 858, anatomia-patologica-ii 377, medicina-legal 260 —
   1.495 grifos) foi testada duas vezes de forma independente (simulando
   carregamento e, depois, desfazer): 1.484/1.495 resolvem nos dois
   caminhos, **0 divergências** entre eles. Página com
   `page.route('**/*', route => route.abort())` — nenhuma chamada de rede
   ocorreu, logo nenhuma escrita em `user_highlights` ou qualquer outro
   dado de aluno.

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
   ou na frase-isca errada — `advWrong > 0` reprova por si só (rodada 3),
   independente de paridade com o comportamento antigo.
4. `rebuild_adversarial_real.cjs` (rodada 3) — substitui os dois casos
   adversariais que a rodada 2 isolou como linha HTML curta por uma versão
   construída sobre a SEÇÃO REAL da matéria (bloco completo, extraído por
   `git show` do commit-base da PR #474), com prefix/suffix REAIS
   computados pelo `indexar()` verdadeiro — e gera também a variante
   "registro antigo sem prefixo/sufixo" (contexto forçado vazio) para
   testar a nova política de `escolher()` contra um cenário real de
   colisão dentro do bloco, não um artefato de teste.
5. `compare_real_highlights_main_vs_pr.cjs` (rodada 4) — toma um export
   (consulta SELECT, só leitura) de `user_highlights` e compara, para
   cada grifo real, quantos resolvem com o `rm-tools.js` da `main` contra
   quantos resolveriam com o desta PR, usando o HTML REAL e NÃO
   MODIFICADO de cada matéria — controle positivo em escala real, não
   sintético.
6. `test_full_block_edge_case.cjs` (rodada 4) — isola o único caso
   estrutural em que `prefix` e `suffix` saem vazios (grifo = bloco
   inteiro) e prova as três propriedades que importam: resolve sem
   edição, fica pendente com edição, nunca pinta num decoy mesmo que a
   edição acrescente um.

## Como rodar

```bash
export NODE_PATH="$(npm root -g)"   # onde o pacote `playwright` (Node) está instalado

git diff <base> <head> -- caminho/da/materia.html \
  | python3 extract_pairs.py > /tmp/pairs.json
python3 build_cases.py /tmp/pairs.json /tmp/cases.json

# substitui os dois casos adversariais `advC-041`/`advC-047` de /tmp/cases.json
# pela versão reconstruída com a seção real (ver rodada 3) antes de rodar —
# node rebuild_adversarial_real.cjs "<rm-tools.js>" > /tmp/adversarial_real.json
# e fundir manualmente (ou via script) em /tmp/cases.json["adversarial"]

node run.cjs /tmp/cases.json "../../../../Repasso-Med-Site--main/Atual - Copia/assets/rm-tools.js" --json /tmp/resultado.json
```

Sai `0` se nada pintou fora do lugar; `1` se algo pintou errado (inclui
qualquer pintura na isca do conjunto adversarial, mesmo com paridade total
em relação ao comportamento antigo — ver rodada 3).

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

| | antes da rodada 2 | depois da rodada 2 | depois da rodada 3 |
|---|---|---|---|
| pintou a isca errada | 50/50 | 2/50 | **0/52** |

Os 2 casos residuais da rodada 2 (`advC-041`, `advC-047`) eram registros
com `prefix` **e** `suffix` vazios porque a linha HTML isolada usada como
"bloco" de teste virava, sozinha, o bloco inteiro — um artefato de
metodologia, não uma prova de que a situação fosse rara na produção. A
rodada 3 trocou os dois pela SEÇÃO REAL da matéria (`f2b07`/`f2b02` de
`farmacologia-ii.html`, commit-base da PR #474 — ver
`rebuild_adversarial_real.cjs`), com prefix/suffix REAIS computados pelo
`indexar()` verdadeiro, **e** uma segunda variante de cada (`advC-041b`,
`advC-047b`) com prefix/suffix forçados vazios para simular um registro
antigo sem contexto gravado — 52 casos no total (48 do corpus original +
4 da reconstrução real).

Rodando essas 4 variantes contra o `rm-tools.js` **da própria rodada 2**
(antes da correção desta rodada): as 2 variantes sem contexto
(`advC-041b`/`advC-047b`) pintam a isca errada — confirmando com texto
real, não mais uma hipótese, que a exceção "sem contexto, aceita às
cegas" da rodada 2 era um risco genuíno de produção. Depois da correção
da rodada 3 (a exceção removida de `escolher()`), as 4 variantes —
com contexto real e sem contexto — ficam **pendentes** (nenhuma pintura,
nem na isca nem na frase certa): sem como confirmar a posição com
segurança, a marca fica no banco sem ser desenhada em vez de arriscar.
Isso é o comportamento correto e esperado, não uma perda — a frase real
foi editada pela PR #474 e deixou de existir literalmente; o único
candidato que sobra é a isca, e negar-se a pintar nela é exatamente o
"nunca adivinhar" que esta suite inteira existe para garantir.

**Paridade com o comportamento antigo:** dos 52 casos, 51 continuam
idênticos entre o caminho antigo e o corrigido; o único que muda é uma
melhoria genuína (nível 2 recupera corretamente a frase certa onde o
caminho antigo não recuperava nada) — nenhuma regressão introduzida pela
rodada 3 nos 48 casos originais.

### Carregamento e desfazer, isolados (rodada 3)

Além do `resolverAncora()` genérico acima, os dois pontos de entrada reais
foram exercitados explicitamente por `test_carregamento_desfazer.cjs`
contra as 4 variantes reconstruídas (`advC-041`/`advC-041b`/`advC-047`/
`advC-047b`): a sequência de `aplicarHighlights()` (carregamento —
`resolverAncora → rangeDe → pintar` por destaque, dentro do bloco já
localizado por `block_id`) e a mesma sequência que `repintar()` da V2
chama no desfazer de um apagar (confirmada idêntica byte a byte ao código
fonte real). Em nenhuma das 8 combinações (4 casos × carregamento/
desfazer) algo pintou na isca — e a página rodou com
`page.route('**/*', route => route.abort())`, provando que nenhuma
chamada de rede (logo, nenhuma escrita em `user_highlights` ou qualquer
outro dado de aluno) acontece nesse caminho: `resolverAncora`, `rangeDe`,
`pintar` e `aplicarHighlights` nunca chamam `sb()`/Supabase — confirmado
por leitura do código-fonte, não só pelo bloqueio de rede.

```bash
node rebuild_adversarial_real.cjs "<rm-tools.js>" > /tmp/adversarial_real.json
node test_carregamento_desfazer.cjs "<rm-tools.js>" /tmp/adversarial_real.json
```
