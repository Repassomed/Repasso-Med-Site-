# #456 P0 · caneta real no piloto novo — causa, correção, provas, limites e rollback

> Estado: 🔵 **AGUARDANDO AUDITORIA CHATGPT** · PR em draft · **sem merge** · **a #456 NÃO está fechada**: o critério de fechamento é o reteste físico do José (`PASSO-FINAL-JOSE.md`, ≤ 3 min).
> Atrás das flags atuais (layout + visual do servidor; caneta = acesso beta existente). Nenhum UID no código; nada ativado para todos.

## Relato (reteste físico do José, 07/10, após #461 e #462)
Atraso grande e escrita pouco fluida, traço às vezes «desconfigurado»; com a toolbox **aberta**, trocar de bloco ou de modo causa uma **breve travada**. A #461 reduziu o custo de um ponto específico (pointerup, `:has()`, animação do player) **medido no Chromium**, mas não a experiência real.

## O que foi medido (e por que a #461 não bastou)
A #461 olhou o tempo do pointerup e o intervalo entre quadros no **meio** do traço. Reproduzi o fluxo inteiro com o motor real (`tools/qa/caneta-456/`: `perfil.cjs` CPU profile, `trace.cjs` trace do Chromium com nº de elementos por recálculo, `troca.cjs`/`invalida.cjs` quem invalida estilo/layout, `medir.cjs` antes/depois) em pointerdown/move/up/cancel, captura, eventos agrupados, RAF, MutationObserver/ResizeObserver, hit test, animações e player.

| área | resultado |
|---|---|
| JS dos handlers (`onDown/onMove/onUp`, RAF, `pathIncremental`) | desprezível (≤ 5 ms por traço no perfil) |
| quadro a quadro DURANTE o traço (RAF, 17 ms a 4×), hit test (0,2 ms/evento), raster (≈ 0,2 ms/quadro), coalescing | **sem diferença antigo × novo** — não é aqui |
| **pointerdown e pointerup** | **recalculam o estilo da página inteira** (1 282 elementos no novo, 2 675 no antigo; 12–35 ms a 1×) — **duas vezes por letra** |
| **trocar de modo com a toolbox aberta** | **+1 recalculação de estilo da página inteira** (≈ 120 ms a 4×, ~400 ms depois da troca) que não existe com a toolbox fechada |
| trocar de bloco ↔ bloco | custo-base (mostrar/ocultar 1 200–2 400 elementos) igual com a toolbox aberta ou fechada — fica como estava |

## Causas demonstradas
1. **`touch-action` herdado no contêiner** (`rm-tools-v2.js`): `body.rm2-t-pen.rm2-pen-down #materias-container{touch-action:none}` — o `touch-action` efetivo é herdado, então ligar/desligar a classe no contato da caneta reaplicava o estilo a **todos os descendentes**. Medido isolando cada classe: `rm2-pen-down` = 22,8 ms (antigo) / 16,2 ms (novo) a 1×, ligar; 21,4 / 11,7 desligar; `rm2-drawing` ≈ 1 ms (não pesa). Além disso, o diagnóstico existente (`diagLog`) lia `getComputedStyle(#materias-container)` no meio do pointerdown e **forçava** essa recalculação ali. A 6–10× de CPU de um tablet: **100–200 ms por letra, duas vezes**, o «atraso grande» (o começo do traço aparece tarde; o fim demora a «assentar»).
2. **`--rm-dock-h` na raiz** (`rm-materia-sistema.js`, espelho da toolbox): a cada vez que a toolbox aparece/some com a vista, `sync()` escrevia `ROOT.style.setProperty('--rm-dock-h', …)` (0 ↔ altura). Variável herdada na `<html>` ⇒ recalcula a árvore inteira. Com a toolbox **aberta**, ida e volta de modo = 2 escritas e 1 passada grande a mais (a «travada»). O CSS só usa a variável < 768 px: em tablet/desktop era custo puro.

## Correções (mínimas, por causa demonstrada)
1. **Guarda de toque do piloto** (`rm-tools-v2.js`): dentro do piloto físico a regra legada não vale (`:not(.rm2-pilot-guard)`); a mesma proteção (toques seguintes — a palma — não fazem pan enquanto a stylus está em baixo) vem de **um elemento sem filhos**, `#rm2-penguard` (`display:none` em repouso; durante o contato `display:block; pointer-events:auto; touch-action:none`, `z-index:300`, abaixo da faixa/lateral/toolbox/player/gaveta e acima do conteúdo e da tinta). Fora do piloto o comportamento é **byte a byte** o de antes. `diagTouchAction()` deixou de ler estilo no piloto.
2. **`--rm-dock-h` só onde existe dock** (`rm-materia-sistema.js`): < 768 px; toolbox aberta mas oculta pela vista **mantém** a altura em vez de ir a 0 e voltar; só escreve quando o valor muda.
3. **Diagnóstico opt-in** (`rm-tools-v2.js`, painel «Diagnóstico del lápiz», só piloto): tempos do pointerdown/1.º quadro/fila/quadros/pointerup por traço, `pointercancel` e captura perdida **no meio** do traço, tarefas longas e o tempo das trocas de bloco/modo; **só números**, só com o painel aberto, nada em localStorage/servidor, fechar apaga; botão «Copiar resumen».
4. **Gate do 2.º testador sem UID no código** (`rm-pilot.js` + `rm-tools-v2.js`): `get-pilot-flags` já devolvia `pen` (`RM_PILOT_PEN_UIDS`); o cliente agora o consome e `pilotoPermitido()` vale para `JOSE_UID` **ou** `pen:true` do servidor, só em Semiología II. Não dá acesso à V2 (isso segue sendo BETA_UIDS / `study_tools_beta`) nem liga a caneta para ninguém.

Preservados: tinta já salva, IDs, `block_id`, âncoras, grifos, notas, autenticação, controles de áudio. **Não** foi escondida a toolbox, nem atrasado nenhum evento da caneta, nem desativada função. A toolbox continua aberta nas trocas (o aluno não precisa fechá-la).

## Quem vê o quê
| quem | efeito |
|---|---|
| José (UID da V2 no código) em Semiología II com layout+visual do servidor | tudo acima; diagnóstico disponível |
| 2.º testador **beta** (precisa de `study_tools_beta` ou BETA_UIDS, como hoje) com `RM_PILOT_PEN_UIDS` | refinamentos do piloto físico + guarda + adaptador de Touch; **sem** isso, nada muda para ele |
| demais contas beta/outras matérias | caneta como hoje. Mudança única visível a eles: existe um `<div id="rm2-penguard">` **inerte** (`display:none`) no `<body>` e a classe `rm2-pilot-guard` fica ausente — a regra `touch-action` legada segue valendo (testado) |
| estudantes sem acesso beta | nenhuma mudança (a V2 nem monta) |

## Provas (resumo; números em `METRICAS.md`)
- `tools/qa/caneta-456/caneta-456.test.cjs`: **124 verificações** — custo por traço (≤ 400 elementos e ≤ 8 ms; **reprova contra a `main`**, ver abaixo), proteção contra a palma com toque real (Δ 0 px com a stylus em contato; 310–326 px depois), `--rm-dock-h` (0 escritas em 1440/768; reserva mantida em 390), 16 trocas de bloco/modo com traço recém-feito em 1440/768/390 (ids e `d` idênticos, 0 escritas, toolbox aberta, tinta alinhada), escrita em parágrafo/tabela/post-it (rápida e longa, 1440 e 390: 0 pontos perdidos), diagnóstico (só números), gate do 2.º testador.
- Contra a `main` (`RM_ASSETS_REF=origin/main`) as asserções de custo por traço **reprovam** (2 675 e 1 282 elementos; 22 e 16 ms) — o teste detecta o defeito.
- Regressão do piloto rerodada (layout, player-sistema, player-toolbox, race, sistema, ink-jump, cover, nav-sistema, pilot-flags, caneta-novo-layout, #460 isolado e piloto real): ver o corpo da PR. Duas asserções do #461 (`caneta-novo-layout`: «--rm-dock-h = altura da caixa» em 1440) foram **atualizadas** para o contrato novo (dock só < 768 px) — a mudança é intencional e está descrita acima.
- As 2 falhas «post-it» já conhecidas de `caneta-novo-layout` (89/91 na `main`; ver `docs/indice-expansivel-460/caneta-postit-comparacao.md`) **continuam iguais**: não atribuídas a esta PR; o motor da caneta (`onDown/onMove/onUp`, RDP, gravação) não foi alterado.

## Limites (declarados)
- **Emulação.** Chromium em CPU de servidor, `pointerType:'pen'` via CDP, toque emulado. **Não** reproduz GPU/raster, o digitalizador, a rejeição de palma do SO nem Safari/iPadOS. Não consegui reproduzir «traço desconfigurado» nem «perde pedaço»: se existir, é do aparelho/navegador — é exatamente o que o diagnóstico mostra (`pointercancel`, captura perdida, fila, quadros) no reteste.
- O custo-base de trocar de bloco/modo (exibir outro bloco) permanece; foi removido só o excesso medido com a toolbox aberta.
- `RMPilot.penLiberada()` só vale depois de o servidor responder (cache da página); falha de rede = como hoje.
- Nenhum teste físico com stylus real foi possível aqui.

## Rollback
- Reverter esta PR (4 arquivos de código: `rm-tools-v2.js`, `rm-materia-sistema.js`, `rm-pilot.js`, `index.html` — só as tags `?v=`). Nenhuma migração, nenhum dado novo.
- Atenuação sem deploy: tirar o UID de `RM_PILOT_PEN_UIDS` (some o gate do 2.º testador) / esvaziar `RM_PILOT_VISUAL_UIDS` (o tema sai e os custos do tema com ele); para José o painel de diagnóstico pode ser fechado a qualquer momento (para e apaga as medidas).

## Reproduzir
```bash
export NODE_PATH=$(npm root -g)
node tools/qa/caneta-456/caneta-456.test.cjs                       # provas (≈ 8 min)
RM_ASSETS_REF=origin/main node tools/qa/caneta-456/caneta-456.test.cjs   # contra a main: reprova (prova de detecção)
RM_ASSETS_REF=origin/main node tools/qa/caneta-456/medir.cjs --json=a.json && node tools/qa/caneta-456/medir.cjs --json=b.json   # antes × depois
node tools/qa/caneta-456/relatorio.cjs                              # METRICAS.md
bash tools/qa/browser-qa/layout/…                                  # suítes antigas: ver o corpo da PR
```
(`ffmpeg` não existe neste ambiente: `RM_FFMPEG` aponta para um gerador de WAV; o harness antigo precisa de um áudio qualquer.)
