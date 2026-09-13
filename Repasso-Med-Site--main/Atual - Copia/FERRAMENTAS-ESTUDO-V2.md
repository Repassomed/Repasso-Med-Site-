# Ferramentas de estudo V2 — toolbox, caneta, marcador, anotações

Documentação técnica da beta fechada. Sem e-mails; os UID só aparecem onde
são tecnicamente indispensáveis.

---

## 1 · Como o sistema ANTIGO funciona (auditado antes de tocar em nada)

`assets/rm-tools.js` continua a ser o motor. Resumo do que faz hoje:

| Pergunta | Resposta |
|---|---|
| Como identifica a matéria? | `slugDoTab(tabEl)` — lê `tab-<x>` do id da aba e cruza com `window.RM_CATALOGO` para obter o `slug`. |
| Como identifica o texto? | **TextQuoteSelector**, não offsets de HTML. Guarda `block_id` (o id da `<section>`), `exact_text`, `prefix` (40 car.), `suffix` (40 car.) e `occurrence`. `indexar(root)` constrói o texto normalizado do bloco com um mapa de volta para (nó de texto, offset). |
| Como salva? | `INSERT` imediato em `public.user_highlights` no momento da marcação. |
| Como restaura? | `escolher()` pontua as ocorrências pelo contexto; na dúvida devolve −1 e **não desenha nada** — nunca marca texto errado. Depois `pintar()` envolve o `Range` em `<span class="rm-hl c-COR" data-hl="ID">`. |
| Como apaga? | `despintar()` desfaz o span e `DELETE` na tabela. |
| Como lida com erro? | Se o `INSERT` falhar, faz *rollback* da pintura e mostra um toast. Se o Supabase não existir, a matéria continua a funcionar. |
| Tabelas / RLS | `user_highlights` e `user_study_progress`, ambas com RLS `user_id = auth.uid()` nas quatro operações. |

**A V2 não reescreveu nada disto.** `rm-tools.js` recebeu apenas:

1. uma superfície pública em `window.RMTools` (ancoragem, `pintar`/`despintar`,
   `marcarSelecao`, acesso ao Supabase, `lbAberto`, `onAbaPronta`);
2. um interruptor `window.RM_STUDY_V2_ACTIVE` que impede a montagem **só** da
   coluna direita legada (marcador + goma + paleta). O «Volver arriba» da
   esquerda, o progresso e o zoom ficam exactamente como estão, para toda a gente;
3. correcção de `lbAberto()` — a classe do lightbox é `on`, não `rm-lb-open`.

---

## 2 · Acesso à beta

Ponto único do código: topo de `assets/rm-tools-v2.js`.

```js
var ROLLOUT = 'beta';            // 'beta' | 'all' | 'off'
var BETA_UIDS = [ /* dois UID */ ];
```

`hasStudyToolsV2Access(uid)`:

1. `ROLLOUT === 'off'` → `false`;
2. sem `uid` (deslogado) → `false`;
3. `ROLLOUT === 'all'` → `true`;
4. UID na constante → `true`;
5. senão, consulta `public.study_tools_beta` (aditiva: permite juntar testers
   sem novo deploy).

**Falha fechada.** Qualquer erro — rede, tabela inexistente, RLS — devolve
`false`, e o aluno fica com a experiência antiga. Nunca o contrário.

O e-mail **não** entra no frontend e **não** autoriza nada. A protecção real
dos dados é a RLS, que exige `auth.uid()`: mesmo que alguém force a toolbox a
aparecer pelo DevTools, não lê nem escreve o registo de outra pessoa.

`study_tools_beta` tem policy de `SELECT` da própria linha e **nenhuma policy
de escrita** — ninguém se auto-habilita pelo cliente.

---

## 3 · Não regressão

Quem não está na beta:

- `rm-tools-v2.js` sai antes de injectar CSS, montar UI ou ligar escutas;
- a coluna direita legada continua a montar-se normalmente;
- as cores do marcador ficam as de hoje (as novas estão escopadas em
  `body.rm-v2`, que só o tester tem);
- nenhuma tabela nova é consultada.

Verificado em teste automatizado com quatro perfis (ver §10).

---

## 4 · Toolbox

Minimizada por omissão: um botão de 46 px na margem direita, vertical ao meio
no desktop e acima da zona do polegar no telemóvel. Um toque expande **para
dentro** da tela.

Dentro: **Marcador · Lápiz · Goma · Deshacer · Mis apuntes**. Os sub-painéis
(cores, espessuras) só aparecem para a ferramenta activa.

`ESC` fecha, por esta ordem: gaveta de anotações → ferramenta activa → painel.
Tocar fora minimiza, mas nunca no meio de um traço nem com uma ferramenta armada.

Abaixo de 560 px os rótulos desaparecem e fica só o ícone — o nome continua no
`title` e no `aria-label`.

---

## 5 · Marcador — um clique

Um clique em **Marcador** activa o modo e usa a última cor; se nunca houve
nenhuma, **amarelo**. Escolher cor **não** é pré-requisito. Depois é
`seleccionar → soltar → marcado`, sem segundo clique de confirmação.

Cinco cores: `yellow` (nova, padrão), `red`, `blue`, `green`, `pink`. As classes
antigas **não** foram renomeadas — `c-red`, `c-blue`, `c-green`, `c-pink`
continuam iguais, e as marcações já gravadas rendem sem migração nenhuma. A
migração só alarga o `CHECK` para admitir `yellow`.

As cinco ficam mais presentes que as actuais (opacidade 0,36–0,42 contra
0,32–0,38), escopadas em `body.rm-v2` para não mudar nada a quem está fora da beta.

---

## 6 · Caneta

- **Cores:** preto (padrão), azul, vermelho.
- **Espessuras:** fina 2 px, média 4 px (padrão), grossa 7 px.
- **Stylus e rato desenham. O dedo não.** Em tablet o dedo continua a servir
  para rolar e tocar. Não há `touch-action` global mexido em lado nenhum.
- **Rejeição de palma:** enquanto um ponteiro desenha, qualquer outro
  `pointerdown` é ignorado (`traco || apagando` → sai). Testado com stylus e
  toque concorrente: um só traço, nenhum fantasma.
- **Nunca grava em `pointermove`.** Durante o traço só se reescreve o atributo
  `d` de um `<path>` já existente: nenhum nó criado, nenhum reflow do documento.
  Um `INSERT` por traço, no `pointerup`.
- **Simplificação:** Ramer–Douglas–Peucker **em píxeis de ecrã** (tolerância
  0,7 px), uma vez, no fim do traço. Um sinuoso de 28 movimentos fica com ~15
  pontos. `getCoalescedEvents()` é usado quando dá lista não vazia.

### Âncoras e coordenadas

Nada é guardado em coordenadas absolutas da página. Cada traço guarda:

```
subject_slug · anchor_id · color · width · points[[x,y], …]   // 0..1 dentro da âncora
```

`anchor_id` é `idDaSeccao` ou `idDaSeccao>índice`, onde o índice aponta para o
parágrafo (ou tabela, figura, item de lista) dentro dessa secção. O índice é
calculado **no cliente**; nenhuma matéria foi editada para isto. Se o elemento
não for encontrado, cai-se para a secção — o traço pode mudar de sítio dentro do
bloco, mas **nunca muda de bloco**.

Porquê o parágrafo e não só a secção: uma secção pode ter 18 000 px de altura, e
normalizar por uma caixa dessas esmaga a forma do traço quando o viewport muda.

A camada de tinta é um `<div id="rm2-ink">` ao nível do `<body>`, em coordenadas
de **página**: rola com o documento sem um único listener de scroll, e **não**
se põe `position:relative` em componente nenhum da matéria. Com a caneta
desligada é `pointer-events:none` — a matéria fica 100 % clicável.

`vector-effect="non-scaling-stroke"` mantém a espessura em píxeis de ecrã
mesmo quando o bloco cresce (medido: 4 px em todos os viewports).

---

## 7 · Goma e Desfazer

**Uma goma só.** O `preventDefault()` que o traço precisa mata o evento `click`,
por isso apagar marcações num listener de click à parte só funcionaria quando
não houvesse traço por perto. O mesmo gesto trata das duas coisas, e um gesto é
um `undo` — mesmo que apanhe vários traços e várias marcas.

A goma aceita o dedo (um toque apaga e o scroll continua a funcionar, porque
não se faz `preventDefault` para touch). Stylus e rato arrastam para apagar em série.

**Desfazer** é uma pilha única de operações inversas (`hl-add`, `del`,
`ink-add`), nunca uma cópia do estado da página. Máximo 60 operações, só durante
a sessão.

A peça que faz isto funcionar de verdade é o **remapeamento de identidade**:
quando um item é restaurado, o banco dá-lhe um `id` novo, e as operações que já
estavam na pilha apontavam para o id velho — o «desfazer» parecia saltar passos.
`remapear(antigo, novo)` reescreve a pilha inteira sempre que uma identidade muda.

---

## 8 · Minhas anotações

Não existia nenhum sistema de notas do aluno no repositório (procurado antes de
criar). A gaveta vive dentro da mesma toolbox — nenhum botão flutuante novo.

Texto simples, sem editor rico. Guarda `subject_slug`, `anchor_id` e
`anchor_label` do bloco visível, `title`, `body`, `created_at`, `updated_at`.
Gravação com *debounce* de 700 ms e no `blur`, nunca por tecla. Apagar pede confirmação.

---

## 9 · Schema e RLS

`supabase/migrations/20260916_01_study_tools_v2.sql` — aditiva e idempotente.
Sem `DROP` de tabela, sem `TRUNCATE`, sem desabilitar RLS, sem tocar em Auth,
`profiles`, `orders`, `products` ou dispositivos.

| Tabela | Para quê | RLS |
|---|---|---|
| `user_highlights` | já existia — só se alargou o `CHECK` da cor para incluir `yellow` | inalterada |
| `user_ink_strokes` | um traço por linha | SELECT/INSERT/UPDATE/DELETE com `user_id = auth.uid()` |
| `user_notes` | anotações | idem |
| `study_tools_beta` | quem recebe a V2 | **só** SELECT da própria linha |

Um traço por linha (e não um JSON agregado por bloco) é uma decisão de
concorrência: com tablet e desktop abertos ao mesmo tempo, cada um insere e
apaga os seus traços e o pior caso é um traço a mais — nunca todos os desenhos
do bloco perdidos por uma escrita que chegou depois.

Rollback em `20260916_01_study_tools_v2_rollback.sql`. **Para apenas desligar a
V2 sem perder nada, não corra o rollback**: basta
`update public.study_tools_beta set enabled = false;` e pôr `ROLLOUT = 'off'`.

---

## 10 · Testes executados

Harness em Playwright com um Supabase simulado que implementa a superfície real
e filtra por `user_id` (RLS simulada), sobre **Oftalmología + Medicina Legal**
carregadas a sério.

| Teste | Resultado |
|---|---|
| Acesso · 4 perfis (2 testers, 1 aluno comum, 1 deslogado) | V2 só para os dois testers; coluna legada intacta para os outros; 0 erros |
| Marcador · um clique sem escolher cor | amarelo, marcado ao soltar |
| Marcador · 5 cores, DOM + banco + reload | 5/5 |
| Caneta · rato, stylus, dedo, palma concorrente | rato e stylus desenham; dedo não risca; palma não cria traço fantasma |
| Pedidos durante `pointermove` | **0** |
| Desfazer · a sequência de 5 passos do encargo | bate exactamente |
| Resize · 1440 → 1024×1366 → 1366×1024 → 834×1194 → 390×844 → 1440 | posição relativa idêntica às 4 casas decimais; espessura 4 px em todos |
| Persistência · reload e «outro dispositivo» | traços e notas restaurados |
| RLS · outro `user_id` | 0 de 2 registos visíveis |
| Supabase em baixo | matéria viva, scroll vivo, 0 erros novos, **sem loop de pedidos** |
| Regressão · 6 viewports × 2 perfis | quiz, V/F, flashcards, glossário, índice, «arriba» todos OK; 0 overflow; 0 erros; sem listeners duplicados |
| Lightbox | caneta suspensa com o zoom aberto; volta ao fechar |

### Como reproduzir o harness

Os ficheiros de teste **não** estão no repositório de propósito: o
`netlify.toml` publica a raiz (`publish = "."`), portanto qualquer ficheiro
solto aqui fica acessível na web. Reproduz-se assim, fora do repositório:

1. copiar `assets/styles.css`, `app-core.js`, `rm-tools.js` e `rm-tools-v2.js`
   mais as pastas de imagem das matérias a testar;
2. montar um `index.html` com `#materias-container` contendo os fragmentos de
   `netlify/functions/materias-privadas/`, um deles com a classe `active`, e
   definir `window.RM_CATALOGO` com os pares `{slug, tab}`;
3. antes dos scripts, injectar um Supabase simulado em `window.RM_SB` que
   implemente `auth.getUser()` e o encadeamento
   `from(t).select/insert/update/delete/eq/in/order/single/maybeSingle`,
   filtrando sempre por `user_id` — é isso que simula a RLS;
4. passar o UID a testar por query string e servir com um estático qualquer.

Ponto de atenção: `.tab-content` sem `.active` é `display:none`, e medir uma
árvore escondida devolve zeros em tudo. Ligar `.active` antes de medir.

---

## 11 · Limitações reais que ficam

1. **Forma do traço em reflow extremo.** A geometria acompanha o bloco, como
   pedido. Num telemóvel a 390 px um parágrafo fica muito mais alto, e um
   círculo desenhado no desktop aparece esticado na vertical. A **posição**
   mantém-se exacta, e o traço nunca sai do bloco. A alternativa — normalizar
   os dois eixos pela largura — preservaria a forma mas deslocaria a posição, o
   que é pior para o uso real.
2. **Marcar com o Supabase em baixo não pinta.** É o comportamento do motor
   antigo (faz *rollback* da pintura se o `INSERT` falhar) e foi mantido de
   propósito, para não mostrar uma marca que não ficou guardada. O traço da
   caneta, esse, fica visível localmente com aviso de «sin sincronizar».
3. **Sem REDO.** Deliberado: não foi pedido e aumentaria a superfície de risco.
4. **Índice do sub-âncora é sensível a edição da matéria.** Se um parágrafo for
   inserido antes, o traço muda de sítio *dentro* do bloco. Nunca sai do bloco.
5. **Pressão do stylus não é usada.** A espessura escolhida manda sempre, o que
   garante comportamento idêntico em dispositivos sem pressão.
6. **Marca-texto e caneta não foram testados em hardware real de tablet** —
   só com Pointer Events (`pen`, `touch`, `mouse`) num navegador real.

---

## 12 · Como liberar para toda a gente

Uma linha, em `assets/rm-tools-v2.js`:

```js
var ROLLOUT = 'beta';   →   var ROLLOUT = 'all';
```

Não é preciso migração nova, não é preciso mexer em nenhuma matéria, não é
preciso reconstruir nada. A tabela `study_tools_beta` pode ficar onde está.

**Rollback só da V2:** `var ROLLOUT = 'off';` (ou remover a linha do
`<script>` em `index.html`). O sistema antigo volta inteiro, e os dados
gravados ficam intactos no banco à espera de se voltar a ligar.
