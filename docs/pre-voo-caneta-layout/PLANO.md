# Pré-voo da caneta e do layout global — plano e testes

> **Nada foi ativado.** Nenhuma flag, lista de UID, `PILOT_SLUGS`, `ROLLOUT`, variável do Netlify, matéria, migração ou módulo de produção foi alterado por este trabalho. Tudo aqui é **leitura + teste isolado** (Supabase simulado no navegador; consulta real ao banco **somente leitura**). Quem decide ativar é José, uma matéria por vez.
> Base medida: `main` `a9a2aa35` (24/10/2026). Os documentos de 12/10 (`docs/layout-ensaio/`) foram **reexecutados** sobre ela, porque desde então entraram ~40 PRs de conteúdo.

## 0 · Veredito em seis linhas

1. **A caneta aprovada e os dados do aluno convivem com o layout novo em todas as 27 matérias** no Chromium (teste 1: 54/54; teste 2: 54/54; uso com caneta CDP, palma, goma, pinça e recarregar: 27/27 matérias, 1 242 verificações, 0 falha — [`RESULTADOS.md`](RESULTADOS.md)). O **layout em si** tem bloqueios de conteúdo/estrutura em 13 matérias (B1–B3 abaixo), todos com causa identificada e fechados em simulação (11 matérias: 1 367 verificações, 0 falha). **Hoje 8 das 25 elegíveis já teriam a porta aberta** (Anatopatologia I, Farmacología I, Fisiopatologia I, Histología II, Medicina Familiar, Medicina Legal, Ortopedia, Semiología I); as outras 17 esperam C9, marcadores ou (AP II) um título. O que **não** está provado é Safari/iPadOS + Apple Pencil — isso só o roteiro físico de 3 min, por matéria, prova.
2. O risco real e específico dos dados do aluno é um só: o traço é gravado como `secção>índice` e o motor resolve o índice **sem excluir a interface do layout novo**. Hoje nenhum módulo do layout insere elemento dentro de uma `section[id]` (teste 1: 27 matérias × 2 larguras × 8 estados = 432 comparações, 103 900 sub-âncoras, 0 diferença); se um dia inserir, **todo traço posterior desloca em silêncio**. O teste 1 vira trava permanente.
3. Grifos, traços e notas gravados **voltam idênticos** ao passar do layout atual para o novo **e de volta** (teste 2, fase «volta» = rollback), sem nenhuma escrita no banco.
4. Os dados reais em produção são pequenos e mapeados: 2 218 grifos (16 matérias), 40 traços (5 matérias; só 10 com índice de parágrafo), 1 nota (2 259 registros). **Todas as 67 âncoras gravadas ainda existem no HTML atual** (`ids-vs-banco.py`).
5. Faltam quatro mudanças de **código** (não feitas, cada uma em PR própria e aprovada por José) antes de qualquer 2.ª matéria: **A5** (servidor devolve a lista de matérias liberadas), **A7** (caneta física por matéria), **C8** (tinta realinha depois de transição de hover) e **C9 (nova, achada agora)** — o layout mostra um cartão «00» em branco, que abre um bloco vazio, nas **10 matérias** em que as revisões de 16–17/10 trocaram a abertura por `<section id="…" hidden></section>` (placeholder que preserva as âncoras dos grifos). Por matéria faltam ainda o **descritor aprovado**, o marcador `data-rm-agrega` e, na Anatopatologia II, um título para `ap2biblio`.
6. A volta à versão anterior é uma linha de configuração do servidor por matéria (sem deploy, sem tocar no banco). Detalhe em §6.

## 1 · Onde estamos (fatos conferidos no código da `main`)

| Peça | Estado hoje | Quem vê |
|---|---|---|
| Layout V2 (`rm-layout`, `rm-modes`) + tema (`rm-materia-sistema`) + navegação (`rm-materia-nav`) | Carregados por `rm-pilot.js` **só** quando a aba é `semiologia-ii` **e** `get-pilot-flags` responde `layout:true` para o UID (variável `RM_PILOT_LAYOUT_UIDS`; falha **fechada**) | contas de José/testers, só Semiología II |
| Correções A1–A4, A6, C1–C7 (slug por parâmetro, tema registrável, conteúdo solto, capa por itens distintos, agregadoras, `<summary>` nos modos, áudio por slug) | **Já na `main`** (PRs #486–#489) — inertes fora do piloto | ninguém além do piloto |
| **A5** — gate por lista de matérias (hoje `SLUG`/`PILOT_SLUG` fixos em `rm-pilot.js` e `get-pilot-flags.js`) | **Não existe** | — |
| **A7** — caneta física (guarda de palma, adaptador de toque) por matéria (hoje `PILOT_SLUGS = ['semiologia-ii']`) | **Não existe** | — |
| **C8** — realinhar a tinta quando um cartão com `:hover{transform}` volta | **Não existe** (medido: ~3 px fora até a próxima medida) | — |
| Caneta V2 / marcador V2 / notas | `ROLLOUT='beta'`: os **2 UID de `BETA_UIDS`** + `study_tools_beta` (2 linhas, 2 habilitadas) veem a V2 em **qualquer** matéria; todos os outros ficam com a coluna legada (marcador + goma + paleta). **Fora da Semiología II a caneta dessas 2 contas roda o código anterior às correções do iPad** (guarda de palma, adaptador de toque, contacto antecipado — `pilotoPermitido()` é o portão, `rm-tools-v2.js:1989`): por desenho; A7 é o que leva essas correções às outras matérias | 2 contas |
| Descritor/tema por matéria e `data-rm-agrega` nas matérias | **Nenhuma matéria** além de Semiología II tem descritor aprovado; **nenhuma** tem `data-rm-agrega` | — |

Duas chaves diferentes (não confundir): **layout** é por matéria (servidor); **`ROLLOUT='all'`** da caneta V2 é **global** (todas as matérias de uma vez, sem granularidade). **Por isso `ROLLOUT='all'` não pode ser o instrumento de liberação** — o plano usa a lista do servidor (A5/A7) e só no fim, se José quiser, converte a V2 em padrão.

## 2 · Inventário das matérias elegíveis

Fonte: catálogo real (`index.html` × `get-materia.js` × arquivos) lido por `tools/qa/pre-voo/inventario-risco.py`; dados vivos por consulta **somente leitura** (`dados-vivos.sql` → `dados-vivos.json`). **27 ativas = 1 piloto + 1 fora (Imagenología, decisão de José) + 25 elegíveis.** Bioestadística não é matéria ativa (arquivo sem rota).

Colunas: *sub-âncoras* = quantos `p,li,h2-h5,table,figure,blockquote` a secção tem (é o que o índice do traço conta; **inclui** questões e `<details>` fechados — a coluna «em questões» mostra o quanto dessa contagem é banco de perguntas); *repet.* = frases idênticas na mesma secção (grifo ambíguo, resolvido por prefixo/sufixo e, na dúvida, deixado pendente); *vivo* = grifos (alunos) · traços (alunos) · notas hoje.

| # | matéria (slug) | grupo | seções | sub-âncoras (total · em questões/cartões) | repet. | grifos·traços·notas hoje (alunos) | reflow tardio (img·tab) | alertas |
|--:|---|---|--:|---|--:|---|---|---|
| 1 | Anatopatologia I (`anatomia-patologica`) | elegivel | 15 | 4336 · 3666/0 | 17 | 60 (7) · 0 (0) · 0 | 31·34 | — |
| 2 | Anatopatologia Práctica (`anatomia-patologica-practica`) | elegivel | 12 | 1026 · 516/0 | 1 | 0 (0) · 0 (0) · 0 | 53·13 | — |
| 3 | Fisiopatologia I (`fisiopatologia`) | elegivel | 14 | 2969 · 2009/0 | 0 | 33 (1) · 0 (0) · 0 | 39·35 | — |
| 4 | Imagenología (`imagenologia`) | fora | 12 | 1116 · 771/0 | 2 | 0 (0) · 0 (0) · 0 | 40·20 | — |
| 5 | Semiología I (`semiologia`) | elegivel | 11 | 2312 · 1524/0 | 2 | 1 (1) · 0 (0) · 0 | 75·56 | — |
| 6 | Farmacología I (`farmacologia`) | elegivel | 21 | 1684 · 1133/0 | 3 | 23 (2) · 0 (0) · 0 | 72·31 | — |
| 7 | Medicina Familiar (`medicina-familiar`) | elegivel | 12 | 855 · 502/0 | 0 | 18 (1) · 0 (0) · 0 | 21·17 | — |
| 8 | Semiología II (`semiologia-ii`) | piloto | 14 | 2633 · 1242/0 | 0 | 132 (7) · 26 (1) · 0 | 0·106 | — |
| 9 | Farmacología II (`farmacologia-ii`) | elegivel | 17 | 5114 · 2778/0 | 0 | 240 (12) · 1 (1) · 0 | 64·56 | placeholder oculto f2b00 (B1) |
| 10 | Embriología (`embriologia`) | elegivel | 16 | 1921 · 1284/0 | 40 | 0 (0) · 0 (0) · 0 | 39·13 | placeholder oculto emb00 (B1) |
| 11 | Biología (`biologia`) | elegivel | 19 | 2764 · 1928/0 | 29 | 0 (0) · 0 (0) · 0 | 39·17 | placeholder oculto bio00 (B1) |
| 12 | Histología I (`histologia-i`) | elegivel | 16 | 2364 · 1736/0 | 24 | 0 (0) · 0 (0) · 0 | 36·22 | placeholder oculto histo00 (B1) |
| 13 | Histología I Práctica (`histologia-i-practica`) | elegivel | 17 | 2077 · 1272/0 | 84 | 0 (0) · 0 (0) · 0 | 645·10 | placeholder oculto hp00 (B1) |
| 14 | Histología II Práctica (`histologia-ii-practica`) | elegivel | 20 | 6372 · 4450/0 | 14 | 0 (0) · 0 (0) · 0 | 680·32 | placeholder oculto h2pportada (B1) |
| 15 | Histología II (`histologia-ii`) | elegivel | 17 | 4735 · 3456/0 | 38 | 42 (1) · 0 (0) · 0 | 47·14 | — |
| 16 | Anatomía I (`anatomia-i`) | elegivel | 37 | 8881 · 6786/0 | 105 | 6 (2) · 0 (0) · 0 | 121·140 | placeholder oculto a1b00 (B1) |
| 17 | Anatopatologia II (`anatomia-patologica-ii`) | elegivel | 12 | 3139 · 2426/0 | 273 | 377 (9) · 0 (0) · 0 | 43·14 | — |
| 18 | Anatopatologia II Práctica (`anatomia-patologica-ii-practica`) | elegivel | 11 | 2341 · 1744/0 | 3 | 0 (0) · 0 (0) · 0 | 180·39 | placeholder oculto ap2pportada (B1) |
| 19 | Medicina Legal (`medicina-legal`) | elegivel | 21 | 5430 · 3876/0 | 377 | 260 (1) · 0 (0) · 1 | 56·0 | — |
| 20 | Fisiopatologia II (`fisiopatologia-ii`) | elegivel | 20 | 9325 · 6128/0 | 30 | 47 (5) · 0 (0) · 0 | 33·65 | placeholder oculto fp2portada (B1) |
| 21 | Toxicología (`toxicologia`) | elegivel | 19 | 7425 · 5940/0 | 534 | 0 (0) · 0 (0) · 0 | 45·77 | — |
| 22 | Dermatología (`dermatologia`) | elegivel | 15 | 1596 · 969/0 | 94 | 0 (0) · 0 (0) · 0 | 58·58 | placeholder oculto dermportada (B1) |
| 23 | Guaraní (`guarani`) | elegivel | 16 | 4045 · 3252/0 | 30 | 0 (0) · 0 (0) · 0 | 38·17 | — |
| 24 | Ortopedia y Traumatología (`ortopedia`) | elegivel | 20 | 8651 · 5972/0 | 463 | 4 (1) · 8 (1) · 0 | 47·89 | — |
| 25 | Oftalmología (`oftalmologia`) | elegivel | 12 | 3558 · 2658/0 | 219 | 858 (3) · 0 (0) · 0 | 27·18 | — |
| 26 | Neurología (`neurologia`) | elegivel | 22 | 4787 · 3122/0 | 171 | 107 (1) · 1 (1) · 0 | 34·147 | — |
| 27 | Anestesiología (`anestesiologia`) | elegivel | 18 | 2444 · 1584/0 | 4 | 10 (1) · 4 (1) · 0 | 19·34 | — |

**Classes de risco usadas na sequência (§5):**

| Classe | Critério | Matérias |
|---|---|---|
| **A · sem dados** | 0 grifos, 0 traços, 0 notas | Anatopatologia Práctica, Embriología, Biología, Histología I, Histología I Práctica, Histología II Práctica, Anatopatologia II Práctica, Dermatología, Guaraní, Toxicología |
| **B · poucos grifos** | ≤ 60 grifos, sem traço | Semiología I, Anatomía I, Farmacología I, Medicina Familiar, Fisiopatologia I, Anatopatologia I, Histología II, Fisiopatologia II |
| **C · muitos grifos** | > 200 grifos ou > 5 alunos | Anatopatologia II (377 · 9), Medicina Legal (260 · 1 + 1 nota), Farmacología II (240 · 12 + 1 traço), Oftalmología (858 · 3) |
| **D · com traços reais** | ≥ 1 traço gravado | Ortopedia (8, índice `otb01>71`), Anestesiología (4), Neurología (1 + 107 grifos), Farmacología II (1) |
| **E · DOM muito grande** (> 7 000 sub-âncoras) | custo de medir/reposicionar a tinta | Anatomía I (8 881), Fisiopatologia II (9 325), Ortopedia (8 651), Toxicología (7 425) |

## 3 · Riscos para grifos, notas e traços — o que é, como se mede, o que mitiga

| # | Risco (fonte) | Peso | Como foi medido | Resultado | Mitigação / trava |
|---|---|---|---|---|---|
| R1 | **Índice do traço desloca se o layout inserir/mover um `p,li,h*,table,figure,blockquote` dentro de `section[id]`** — `elDeAnchor` não exclui `[data-rm-ui]` (`rm-tools-v2.js:1184`; `contrato-motor.cjs` fixa o fato) | **alto se ocorrer** | Teste 1: lista ordenada de sub-âncoras de cada secção, controle × layout (índice geral → blocos → modos Preguntas/Flashcards/Infografías → volta), 390 e 1440 | ver `RESULTADOS.md` §1 | Teste 1 é **trava obrigatória** de qualquer PR em `rm-layout*`, `rm-modes`, `rm-materia-*`. Controle negativo (`--negativo`) prova que ele reprova um `<p>` inserido |
| R2 | **Edição de conteúdo desloca traços** (inserir/remover um parágrafo antes do ponto desenhado); o banco guarda o índice, **não** o conteúdo | médio (hoje 10 traços com índice) | `deslocamento-de-indice.py` aplicado às PRs de conteúdo já mescladas (#502 Ortopedia, #504 Anestesiología, #514 Neurología, #532 e #541 Semiología II) | todas reescreveram texto **no mesmo lugar** (índices estáveis) ou mudaram estrutura **depois** do índice gravado; 0 traço atingido | Passar `deslocamento-de-indice.py --base origin/main --head HEAD` em PR de conteúdo das matérias D; secção com traço e estrutura alterada ⇒ `data-rm-content-rev` (o motor já deixa o traço órfão e **preservado**, nunca realocado). Proposta: virar verificação do Guard (§7) |
| R3 | **Grifo não reaparece / reaparece no lugar errado** (ancoragem por texto: `exact_text` + `prefix`/`suffix` de 40 caracteres, por `block_id` = id da seção) | alto para C | Teste 2: até 10 grifos gravados pelo **motor real** em cada matéria, recarregados no controle, no layout e na volta; compara (secção, texto) um a um; verifica visibilidade no bloco | ver `RESULTADOS.md` §2 | Política do motor já é conservadora (na dúvida **pendente**, nunca no lugar errado). Para classe C, rodar `browser-qa/grifos-reforma/` com as linhas reais (somente leitura) antes e depois |
| R4 | **Layout novo muda a largura/altura dos blocos** (lateral, container mais estreito, capa): a tinta tem de acompanhar | médio | Teste 2 mede a posição relativa do traço dentro do parágrafo (tol. 0,02 da caixa) nas 3 fases; `interacao.cjs` mede desvio ≤ 6 px sob a ponta e preso ao parágrafo depois de zoom/rolagem | ver `RESULTADOS.md` | Camada `#rm2-ink` em coordenadas de página + `reposicionar()`; C8 (pendente) fecha o caso do hover |
| R5 | **Reflow tardio** (imagens preguiçosas: 645 em Histología I Práctica, 680 em Histología II Práctica; `content-visibility:auto`) desloca a caixa depois de a tinta ser desenhada | médio | `diagnosticos/tinta-primeira-pintura.cjs`: no controle atual a 1.ª pintura fica ~7 px fora (0,353 em vez de 0,30 da altura) até `reposicionar()`; **no layout novo nasce alinhada** (Δ ≈ 1 px) | observação, **não é regressão do layout** | Medir no aparelho nas matérias de imagem (A: Histologías Prácticas, AP Práctica) |
| R6 | **Modos isolados**: caneta/marcador/goma só valem na «Página completa» (`activeViewPermitido`); o aluno em Preguntas/Flashcards não anota | baixo (decisão de produto das #64/#66/#67) | `interacao.cjs` (troca bloco/modo/recarregar) | `RESULTADOS.md` | Comunicar ao aluno; nenhum dado é perdido |
| R7 | **Notas** ancoradas só pelo id da secção (`anchor_id` = `sec.id`) | baixo | Teste 2 abre a gaveta e lê o rótulo da nota nas 3 fases | `RESULTADOS.md` §2 | — |
| R8 | **Desempenho em matérias grandes** (8–9 mil sub-âncoras): medir/reposicionar custa; iPad antigo | médio, só aparelho | `pen-bench.cjs` e `caneta-456` existem; Chromium ≠ iPad | não provável no sandbox | Classe E só depois de 3 matérias menores aprovadas no iPad; medir no aparelho |
| R9 | **Safari/iPadOS + Apple Pencil** (latência, rejeição de palma do sistema, Scribble, perda de `pointerup`) | alto, **só o aparelho prova** | `INTERACAO.md` §6 lista o que o teste sintético não cobre | — | Roteiro físico de 3 min (`docs/caneta-ipad-456/PASSO-FINAL-JOSE.md`) **por matéria**, antes de abrir para alunos |
| R10 | **Cache de 7 dias dos módulos** (`assets/*`): quem já abriu o site continua com o módulo velho; versão mista layout×caneta | médio | leitura de `rm-pilot.js` (`VER`) | — | Subir `VER` + a tag no `index.html` em **toda** PR de módulo; nunca liberar matéria com `VER` desatualizado (item da porta) |
| R11 | **Servidor/gate** (`get-pilot-flags`) é a única autoridade; erro ⇒ tudo `false` | baixo | `pilot-flags.test.cjs` 10/10 | `RESULTADOS.md` | A5 deve manter: falha fechada, corpo idêntico em negação, nenhum UID no repositório, lista por variável de ambiente |
| R12 | **Supabase**: paginação dos traços (teto `max_rows`), RLS `user_id = auth.uid()`, rede ruim | baixo | `tools/qa/ink-audit/` (7 suítes, precisa de PostgreSQL local) | relatório existente (`RELATORIO.md`) | Não foi reexecutada aqui (banco local não disponível); reexecutar antes de abrir para todos |
| R13 | **Dados reais x HTML atual** | — | `ids-vs-banco.py` com as 67 âncoras gravadas | **0 problemas** | Reexecutar com consulta nova antes de cada matéria |
| R14 | **Tinta sobre tabela larga com rolagem própria alarga a página no celular**: a camada `#rm2-ink` é do `<body>` (`overflow:visible`) e o traço é normalizado pela caixa INTEIRA da tabela (560 px dentro de um `.s2-scroll` de 390) ⇒ o `svg` passa da viewport, `scrollWidth` vai a 407 > 390 e o Chromium móvel afasta a página (a ponta e a tinta se desencontram em ~31 px) | médio no celular, baixo no tablet | `caneta-novo-layout` 390×844 reprova na `main` de hoje: um traço semeado em `s2-b04>75` (uma `<table>`) — **sem esse traço `scrollWidth` = 390**; reproduzido com `diagnosticos/tinta-em-tabela-larga.cjs` | defeito do **motor**, anterior ao layout novo (acontece também no controle); a suíte falhou só porque o conteúdo da Semiología II (16/10) passou a ter essa tabela na posição semeada | Registrado como falha **conhecida** da linha de base; correção do motor (limitar o `svg` ao retângulo visível do contêiner rolável, ou `overflow:clip` na camada) fica para PR própria — **não** é pré-requisito do layout |

### Achados novos desta rodada (reais e reproduzíveis)

1. **R1 é latente, não ativo**: o motor não protege contra elemento inserido pelo layout; hoje não há nenhum. Está agora travado por teste.
2. **Nenhuma PR de conteúdo mesclada até agora atingiu um traço real** (R2) — mas isso foi sorte controlada, não garantia: **nem o Guard nem o banco sabem disso**. Sugestão em §7.
3. **30 dos 40 traços gravados são de secção inteira** (sem `>índice`, criados por versões anteriores do motor): a forma deles depende da altura da secção (≈ 18 000 px em Semiología II b01) e distorce em reflow — limitação já documentada em `FERRAMENTAS-ESTUDO-V2.md` §11.1.
4. O inventário de 12/10 dizia que «as 25 elegíveis falham como estão»; **sobre a `main` de hoje (A1–A4/C1–C7 já mescladas) a falha «como está» ficou restrita às matérias cujo banco/mazo não é reconhecível pelo nome** — `RESULTADOS.md` §3 lista quais, e §5 lista as seções que cada uma precisa declarar com `data-rm-agrega` (passo P1, editorial).
5. **Três suítes do piloto estavam vermelhas na `main` por deriva de conteúdo, não por defeito de módulo**: `nav-sistema` (4 falhas: números fixos de questões «basada» da Semiología II, que a revisão editorial reduziu de 138 para 64 rótulos), `soltos` (8) e `cover` (queda) dependiam do `.s2-hero`, que a Semiología II perdeu em `4aed8200` (16/10). Corrigi **os testes** (contagens lidas do DOM; a abertura passa a ser um nó posto pelo teste; `.rm-subject-head` no lugar de `.s2-hero`): `nav-sistema` 216/216, `soltos` 16/16, `cover` 198/198 — os mesmos totais documentados em 12/10. Nenhum módulo foi tocado. Sem isso a linha de base «antes × depois» de cada matéria já nasceria vermelha e esconderia regressão de verdade.

### Bloqueios novos que só a reexecução na `main` de hoje revelou

| # | O que é | Onde | Evidência | Correção proposta |
|---|---|---|---|---|
| **B1** | Seção **vazia e `hidden`** (placeholder que mantém o id dos grifos depois que a abertura foi removida) aparece no índice como cartão «00» sem título e abre um bloco vazio; depois do `detach` a seção «não visível» reprova o teste de integridade | **10 matérias**: Anatomía I `a1b00`, Biología `bio00`, Dermatología `dermportada`, Embriología `emb00`, Farmacología II `f2b00`, Fisiopatologia II `fp2portada`, Histología I `histo00`, Histología I Práctica `hp00`, Histología II Práctica `h2pportada`, Anatopatologia II Práctica `ap2pportada` (introduzidas pelas revisões de 16–17/10: `2a4cb984`, `8e2cab1d`, `b47124a8`, `eed8d0b4`, `eb78afb6` e semelhantes) | `ensaio.cjs --corr`: `blocos/abre-so-o-bloco`, `blocos/nao-vazio`, `integridade/detach-limpo` reprovam nas 10 (em 12/10 passavam 25/25); `pv-vazias`: com o placeholder o 1.º cartão é «00»; **sem ele o índice sai limpo** (Biología 19 → 18 cartões, Dermatología 15 → 14) | **C9**: os módulos que enumeram `:scope > section[id]` (`rm-layout.js:129`, `rm-materia-sistema.js:175`, a lista de blocos de `rm-materia-nav.js`) ignoram `section[hidden]:empty` — **sem remover do DOM** (a âncora dos grifos/traços continua lá) |
| **B2** | Seção interior **sem título efetivo** quebra a cadeia Anterior/Próximo | Anatopatologia II, `ap2biblio` (só um `<h4>` dentro de `div.ap2-biblio`) | `blocos/pager-cadeia` | editorial: título `<h2>` na seção, ou ampliar o título de reserva do C4 para `h4` |
| **B3** | Banco/mazo cujo id não casa com `/banco\|flashcards/` é tratado como um bloco | AP Práctica, Anestesiología, Guaraní, Neurología, Oftalmología, Toxicología (e as 10 de B1) | `modos/indice-flashcards`/`indice-preguntas` reprovam «como está» e passam «com correção» | passo P1: declarar `data-rm-agrega` nas seções listadas em `RESULTADOS.md` §5 |

## 4 · Testes automáticos

Tudo roda de uma pasta limpa do repositório, com `export NODE_PATH=$(npm root -g)` (Playwright global; o site não ganha `package.json`). Nada escreve fora de `docs/pre-voo-caneta-layout/resultados/` (ou da pasta indicada em `RM_PREVOO_OUT`) e do `/tmp`.

### 4.1 · Novos (este trabalho) — `tools/qa/pre-voo/`

| # | Arquivo | O que prova | Controle negativo | Tempo (27 matérias) |
|---|---|---|---|---|
| 1 | `ancoras-estaveis.cjs` | A lista de sub-âncoras de **cada** `section[id]` é idêntica entre o controle e o layout novo (índice geral, blocos, 3 modos, volta ao índice), 1440 e 390 | `--negativo` insere um `<p>`: precisa FALHAR | ~12 min |
| 2 | `ida-e-volta.cjs` | Grifos (motor real), traços e nota gravados no layout atual **voltam idênticos** no layout novo e **na volta** (rollback); sem escrita no banco; traço na mesma posição relativa | `--negativo` desloca um parágrafo: precisa FALHAR | ~25 min |
| 3 | `contrato-motor.cjs` | `ANCHOR_SEL`, `SUB_SEL`, `SUB_MIN_H`, fallback para a secção, limites -1.5..2.5 / 1200 pontos e o fato «sem exclusão de `[data-rm-ui]`» continuam como o pré-voo assume | falha se o motor mudar | < 1 s |
| 4 | `inventario-risco.py` | Inventário estático (§2) | — | < 5 s |
| 5 | `ids-vs-banco.py` | Toda âncora gravada existe no HTML; índice dentro da secção | sai 1 se alguma sumiu | < 5 s |
| 6 | `deslocamento-de-indice.py` | Diz, por PR de conteúdo, se a estrutura de uma secção mudou e se atinge traço real | — | segundos |
| 7 | `test_ferramentas.py` | Testa as ferramentas Python (conta, aninhamento, estável × estrutura) | — | < 1 s |
| 8 | `rodar-base.sh` | Roda as 11 suítes do piloto (portão de flags, layout, sistema, navegação, capa, solto, corrida, tinta×salto, caneta, iPad-emulado) e imprime **uma linha por suíte** | — | ~30 min |
| 9 | `porta-da-materia.sh <slug>` | A «porta» de **uma** matéria: inventário em dia (`inventario-fresco.py`) + marcadores no HTML (`agrega-no-html.py`) + 1 + 2 + `ensaio --corr` + `interacao --rapido` + inventário de risco | sai 1 se qualquer etapa falhar | ~6 min/matéria |
| 10 | `inventario-fresco.py` | O `docs/layout-ensaio/inventario.json` bate com as seções do HTML de hoje (senão o ensaio mede a matéria errada) | sai 1 se divergir | < 5 s |
| 11 | `agrega-no-html.py` | A matéria **declara** `data-rm-agrega` nas agregadoras cujo id não casa com `/banco\|flashcards/` (passo P1) | sai 1 se faltar | < 5 s |
| 12 | `marcadores-agrega.cjs` | Deriva, por conteúdo, quais seções cada matéria precisa declarar (alimenta o 11) | — | ~5 min |
| 13 | `sim-c9.js` + `RM_ENSAIO_INIT` (gancho de 3 linhas em `ensaio-layout/lib.cjs`, inerte sem a variável) | Simula em memória C9 + B2 e mede se fecham B1/B2 | prova: 11 matérias, 0 falha | ~15 min |
| 14 | `diagnosticos/*.cjs`, `resumo.py` | Reproduzem B1, R5 e R14 e geram `RESULTADOS.md` | — | segundos |

### 4.2 · Já existentes e reaproveitados (não alterados)

`tools/qa/ensaio-layout/` (inventário medido, ensaio visual 4 larguras, interação com caneta CDP/palma/goma/pinça/recarregar, contrato R1–R9, conteúdo solto), `tools/qa/browser-qa/layout/*.test.cjs`, `tools/qa/caneta-456/`, `tools/qa/caneta-ipad-456/`, `tools/qa/ink-audit/`, `tools/qa/browser-qa/grifos-reforma/`, Guard (`tools/qa/guard`).

### 4.2b · Linha de base medida na `main` `a9a2aa35` (`rodar-base.sh`, máquina sem outra carga)

| Suíte | Resultado | Observação |
|---|---|---|
| `pilot-flags` | 10/10 | portão de flags, falha fechada |
| `layout` | 535/535 | |
| `sistema` | 124/124 | |
| `nav-sistema` | 216/216 | **depois** da correção do teste (antes: 4 falhas por deriva de conteúdo) |
| `cover` | 198/198 | **depois** da correção do teste (antes: caía no `.s2-hero`) |
| `soltos` | 16/16 | **depois** da correção do teste (antes: 8 falhas, `.s2-hero`) |
| `race` | 140/140 | |
| `ink-jump` | 54/54 | |
| `caneta-novo-layout` | **90/91** | **falha conhecida**: 390×844, traço semeado sobre tabela larga (R14). Em 15/10 (`5d90b601`) a falha era outra (post-it, #464) |
| `caneta-456` | **136/138** | **falhas conhecidas**: 2 de tolerância do post-it a 390 px (#464, pré-existentes) |
| `caneta-ipad-456` | 197/197 | |

**Regra:** antes e depois de qualquer passo a lista tem de ser **idêntica**; essas 3 falhas conhecidas não contam como regressão, qualquer outra diferença conta.

### 4.3 · O que os testes **não** provam (e o que cobre cada lacuna)

| Lacuna | Quem cobre |
|---|---|
| Safari/iPadOS, Apple Pencil, latência, rejeição de palma do sistema | Roteiro físico de José, por matéria (§5, passo P6) |
| Gravação real no Supabase hospedado, RLS com contas reais, duas abas/dois aparelhos | `ink-audit` (banco local) antes de abrir para todos + observação 24 h por matéria com consulta somente leitura |
| Identidade visual de cada matéria (os temas ensaiados são **hipótese técnica**) | Decisão editorial G0 de José por matéria (descritor aprovado) |
| Vídeos incorporados (`iframe`) | Conferir em preview/aparelho |
| Áudio | Fora do escopo (`AUDIOBOOKS-ESTADO-OPERACIONAL.md`) |

## 5 · Sequência de implantação, matéria por matéria

**Regra geral:** uma matéria por vez no início; só passa à seguinte depois de 24 h sem incidente e roteiro físico aprovado. Cada passo tem **quem decide**, **o que se roda** e **como volta**. Nenhum passo cria tabela, coluna, política RLS, conta, pagamento ou permissão nova.

### Etapa 0 — pré-requisitos de código (PRs pequenas, **cada uma aprovada por José**; nenhuma liga matéria)

| PR | Conteúdo | Trava de aceite | Volta |
|---|---|---|---|
| 0.1 | **A5**: `get-pilot-flags` devolve a lista de slugs com `layout`/`visual`/`pen` (variáveis de ambiente; **nenhum UID/slug no repositório**); `rm-pilot.js` pergunta pelo slug da aba. Lista ausente/erro/UID fora ⇒ tudo `false`, corpo idêntico | `pilot-flags.test.cjs` estendido (slug fora da lista = negado; lista vazia = como hoje); `rodar-base.sh` igual à linha de base | `git revert` + subir `VER` |
| 0.2 | **A7**: `PILOT_SLUGS` do motor = slugs com `pen:true` do servidor; conta continua exigida | `caneta-456`, `caneta-ipad-456`, `caneta-novo-layout` iguais à base; teste 3 atualizado **na mesma PR** (o fato `PILOT_SLUGS` muda de propósito) | idem |
| 0.3 | **C8**: realinhar a tinta ao fim da transição de hover | `interacao.cjs` com e sem `RM_ENSAIO_SEM=C8` (hoje: –3 px; depois: alinhada); 89/91 do `caneta-novo-layout` não pode piorar | idem |
| 0.4 | **C9** (B1): ignorar `section[hidden]:empty` na lista de blocos, no índice, na lateral e na capa (sem tirar do DOM) | `ensaio.cjs --corr` das 10 matérias de B1 = 0 falha; teste 1 e teste 2 continuam verdes (a âncora tem de continuar no DOM); `rodar-base.sh` igual | idem |
| 0.4b | `VER` + tag no `index.html` (cache) | — | idem |
| 0.5 | (opcional, recomendado) **Guard**: verificação `indice-de-traco` (§7) | `test_guard.py` | revert |

### Etapa 1 — por matéria (a «porta»; repetir para cada slug)

| Passo | O quê | Evidência exigida | Quem |
|---|---|---|---|
| P1 | **Editorial**: descritor/tema aprovado, `data-rm-agrega` nas agregadoras, `<h2>` nas guias, sem seção solta sem destino (C3) | PR de conteúdo com Guard verde; **congelar edições estruturais** da matéria durante o canário | José (G0) |
| P2 | **Estático**: `inventario-risco.py` sem alerta de âncora; `ids-vs-banco.py` com consulta nova ⇒ 0 problemas | saída das duas | Claude |
| P3 | **Porta automática**: `NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/porta-da-materia.sh <slug>` | 7 linhas `PASSA` e «PORTA ABERTA» (exemplos reais em `resultados/porta-exemplos.txt`: Medicina Familiar abre; Dermatología fecha por B1 e por falta de `data-rm-agrega`) | Claude |
| P4 | **Linha de base**: `rodar-base.sh` antes e depois do passo P5 na **mesma** commit | duas listas iguais | Claude |
| P5 | **Servidor**: incluir o slug em `layout` (e `visual`) **só para o UID de José**; depois `pen` para o mesmo UID | variável do Netlify (nenhum UID no repositório) | José |
| P6 | **Roteiro físico ≤ 3 min no iPad + Pencil** (escrever, palma, rolar, goma, Deshacer, grifar, trocar de bloco, recarregar) e abrir a matéria no desktop e no celular | assinatura de José por matéria | José |
| P7 | **Observação 24 h**: consulta somente leitura — escritas novas em `user_ink_strokes`/`user_highlights`/`user_notes` dessa matéria, nenhum erro 4xx/5xx novo nos logs | contagens antes × depois | Claude |
| P8 | **Abrir aos alunos** dessa matéria (slug na lista de todos) | — | José |
| P9 | **Fechamento**: `ids-vs-banco.py` + `ida-e-volta.cjs <slug>` outra vez | 0 problemas | Claude |

### Etapa 2 — ordem proposta das ondas (as matérias com porta **aberta hoje** vêm primeiro; `RESULTADOS.md` §5b)

| Onda | Matérias | Por quê | Observação |
|---|---|---|---|
| **0** | Semiología II (piloto, já ativa) | referência e controle positivo da porta | 26 traços reais (24 de secção inteira): **não mexer** na estrutura do b01 |
| **1** | **Medicina Familiar** | porta aberta hoje; a menor exposição entre as abertas (855 sub-âncoras, 18 grifos de 1 aluno, sem traço) | roteiro físico completo + 24–48 h de canário; vale como prova do caminho ponta a ponta |
| **2** | Fisiopatologia I · Farmacología I · Semiología I | portas abertas; 1–33 grifos | Semiología I: **só depois** da edição G0 em curso (congelar estrutura) |
| **3** | Anatopatologia I · Histología II | portas abertas; 42–60 grifos (AP I: 7 alunos) | `ids-vs-banco.py` com a consulta do dia |
| **4** | Dermatología · Embriología · Biología · Histología I · Guaraní · Anatopatologia Práctica · Histología I Práctica · Histología II Práctica · Anatopatologia II Práctica (classe A: **0 dados**) | só esperam código/editorial: **C9** (B1) + `data-rm-agrega` (B3); as de imagem (Histologías, AP Práctica) pedem medir o reflow no aparelho (R5) | depois de C9 e dos marcadores, a porta deve abrir sem tocar no resto |
| **5** | Toxicología · Anatomía I · Fisiopatologia II (**E**, 7–9 mil sub-âncoras) | só depois de 3 matérias aprovadas no iPad: desempenho (R8) | medir abertura e `reposicionar()` no aparelho |
| **6** | Medicina Legal · Anatopatologia II · Oftalmología · Farmacología II (**C**) | 240–858 grifos; Farmacología II tem 12 alunos; AP II precisa de B2 | **avisar os alunos**; rodar `grifos-reforma` com linhas reais antes/depois |
| **7** | Ortopedia · Anestesiología · Neurología (**D**) | têm traços reais (`otb01>71`, `aneb01`, `neuportada`) | conferir os traços **na conta do dono** antes de abrir; congelar estrutura |
| — | Imagenología | fora por decisão de José | — |

Critério de **parar a onda**: qualquer FALHA da porta, qualquer diferença entre as duas linhas de base, qualquer relato de traço/grifo no lugar errado, ou erro novo nos logs. Quando parar: §6.

## 6 · Volta à versão anterior (rollback)

| Nível | Quando | Como | Tempo | O que acontece com os dados | Prova |
|---|---|---|---|---|---|
| **L1 · uma matéria** | problema numa matéria liberada | tirar o slug da lista do servidor (`layout`/`visual`) | imediato, **sem deploy** | nada é apagado; a matéria abre no layout antigo; grifos, traços e notas reaparecem iguais | **teste 2, fase «volta»** (a mesma aba, mesmo «banco», layout → controle) |
| **L2 · só a caneta física** | a caneta regride numa matéria nova | tirar `pen` do slug | imediato | traços já gravados ficam | `interacao.cjs` |
| **L3 · um módulo** | defeito num `rm-*.js/css` | `git revert` do merge **e subir `VER`** + tag do `index.html` (cache de 7 dias!) | um deploy | nenhum dado tocado | `rodar-base.sh` |
| **L4 · tudo** | incidente geral | esvaziar `RM_PILOT_LAYOUT_UIDS` / `RM_PILOT_VISUAL_UIDS` / `RM_PILOT_PEN_UIDS` no Netlify | imediato | nenhum | `pilot-flags.test.cjs` |
| **L5 · V2 inteira (caneta/marcador/notas)** | só se a V2 em si falhar | `ROLLOUT='off'` (ou `study_tools_beta.enabled=false`) — **não** rodar o rollback SQL (`..._rollback.sql` apagaria tabelas) | um deploy | dados preservados no banco | `FERRAMENTAS-ESTUDO-V2.md` §12 |

## 7 · Decisões que cabem a José

1. **Aprovar a Etapa 0** (A5, A7, C8, `VER`) como PRs separadas — este trabalho **não** as fez.
2. **Aprovar a ordem das ondas** (§5) ou trocar; Dermatología como cobaia?
3. **Verificação nova no Guard** (`indice-de-traco`): comparar a lista de sub-âncoras base × head por secção e exigir `data-rm-content-rev` quando uma secção com traço real mudar de estrutura antes de um índice gravado. A ferramenta `deslocamento-de-indice.py` já faz a análise; falta decidir se vira verificação do Guard (arquivo global — não mexi).
4. **Quem recebe `pen`** e se a V2 vira padrão no fim (`ROLLOUT`), sabendo que é global.
5. **Fonte externa** (Literata, Google Fonts) carregada por `rm-materia-sistema.js`: política de privacidade/CSP (já registrado em `PATCHES-PARA-INTEGRACAO.md` §F).

## 8 · Como reproduzir

```bash
export NODE_PATH=$(npm root -g)
python3 -I tools/qa/pre-voo/inventario-risco.py --vivo docs/pre-voo-caneta-layout/dados-vivos.json
python3 -I tools/qa/pre-voo/ids-vs-banco.py docs/pre-voo-caneta-layout/dados-vivos-ancoras.json
python3 -I -m unittest discover -s tools/qa/pre-voo -p 'test_ferramentas.py'
node tools/qa/pre-voo/contrato-motor.cjs
node tools/qa/pre-voo/ancoras-estaveis.cjs [slug …] [--rapido] [--negativo]
node tools/qa/pre-voo/ida-e-volta.cjs      [slug …] [--rapido] [--negativo]
sh   tools/qa/pre-voo/rodar-base.sh [pasta-de-logs]
sh   tools/qa/pre-voo/porta-da-materia.sh <slug>
python3 -I tools/qa/pre-voo/deslocamento-de-indice.py --base origin/main --head HEAD --vivo docs/pre-voo-caneta-layout/dados-vivos-ancoras.json
node tools/qa/pre-voo/marcadores-agrega.cjs                       # seções a declarar com data-rm-agrega (passo P1)
RM_ENSAIO_INIT=tools/qa/pre-voo/sim-c9.js node tools/qa/ensaio-layout/ensaio.cjs --corr --rapido <slug …>   # simula C9 + B2 em memória
node tools/qa/pre-voo/diagnosticos/{secoes-vazias,tinta-primeira-pintura,tinta-em-tabela-larga}.cjs
python3 -I tools/qa/pre-voo/resumo.py --base <saida-do-rodar-base> > docs/pre-voo-caneta-layout/RESULTADOS.md
```

O ensaio de layout/uso (`tools/qa/ensaio-layout/`) precisa do inventário medido da `main` do dia: `node tools/qa/ensaio-layout/inventario.cjs` antes de `ensaio.cjs`/`interacao.cjs` (o `inventario.json` versionado é de 12/10 e **não** conhece as seções de hoje).

Dados vivos (somente leitura): `tools/qa/pre-voo/dados-vivos.sql`. Os arquivos `dados-vivos*.json` contêm só slug, âncora e contagem — **nenhum texto de aluno, nenhum UID**.
