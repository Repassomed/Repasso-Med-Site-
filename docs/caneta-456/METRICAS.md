# Métricas antes/depois · #456 P0 (Chromium, motor REAL — **emulação, não aparelho real**)

Antes = `origin/main` · Depois = (árvore de trabalho) · medido em 2026-10-08. CPU 1× (trace) ou 4×/6× (`Emulation.setCPUThrottlingRate`: aproxima um tablet, não o substitui). Medianas de 3 execuções independentes (o harness varia ±20–30% entre execuções; o que decide é a ordem de grandeza e as medidas determinísticas — contagem de elementos recalculados).

## A · Custo POR TRAÇO — recálculo de estilo no pointerdown e no pointerup (trace, CPU 1×, toolbox aberta, lápis armado)

| layout | evento | elementos reaplicados (antes → depois) | maior recálculo, ms (antes → depois) | soma de estilo, ms (antes → depois) |
|---|---|---|---|---|
| antigo | pointerdown | 2675 → **64** | 22.6 → **1.6** | 30.2 → **9** |
| antigo | pointerup | 2685 → **74** | 21.7 → **1.6** | 33.8 → **13.1** |
| novo | pointerdown | 1282 → **55** | 13.8 → **1** | 15.4 → **2.6** |
| novo | pointerup | 1292 → **65** | 14 → **1.1** | 14.5 → **1.9** |

Causa: `body.rm2-t-pen.rm2-pen-down #materias-container{touch-action:none}` — `touch-action` efetivo é herdado; mudá-lo no contêiner reaplica o estilo a **todos** os descendentes, 2 vezes por letra. A 6–10× de CPU de um tablet isso são 100–200 ms **por letra**, antes mesmo de a tinta aparecer.

## B · Escrita DURANTE o traço (bancada do #461, CPU 4×, toolbox aberta, lápis armado, 360/200 pontos)

| layout · gesto | maior quadro, ms (antes → depois) | quadros > 50 ms | tarefas longas (n · máx ms) | entrega p95, ms | tinta p95, ms | pontos perdidos | desvio máx, px |
|---|---|---|---|---|---|---|---|
| antigo/rapido | 166.7 → **33.3** | 2 → **0** | 2 · 171 → **0 · 0** | 14.4 → 14.1 | 14.8 → 16 | 0 → 0 | 0.7 → 0.7 |
| antigo/longo | 183.3 → **33.3** | 2 → **0** | 2 · 168 → **0 · 0** | 15.4 → 14.2 | 14.9 → 16 | 0 → 0 | 0.7 → 0.7 |
| novo/rapido | 116.6 → **33.4** | 2 → **0** | 2 · 112 → **0 · 0** | 14.6 → 13.5 | 14.2 → 15.3 | 0 → 0 | 0.7 → 0.7 |
| novo/longo | 100 → **33.3** | 2 → **0** | 2 · 107 → **0 · 0** | 14.9 → 14.1 | 14.2 → 15.3 | 0 → 0 | 0.6 → 0.6 |

Leitura: o intervalo entre quadros no MEIO do traço (≈ 17 ms) já era bom nos dois layouts — o atraso medido estava no **começo** de cada traço (o pointerdown bloqueava a thread principal de 100 a 180 ms a 4×; 2 tarefas longas por traço) e no **fim** (pointerup). Depois: 0 quadros > 50 ms e 0 tarefas longas.

## B2 · Celular 390×844 (DPR 2, CPU 6×, toolbox aberta, lápis armado, gesto rápido)

| layout | maior quadro, ms (antes → depois) | quadros > 50 ms | tarefas longas (n · máx ms) | pontos perdidos |
|---|---|---|---|---|
| antigo | 166.7 → **50.1** | 2 → **1** | 2 · 166 → **1 · 52** | 0 → 0 |
| novo | 183.3 → **33.4** | 2 → **0** | 2 · 192 → **0 · 0** | 0 → 0 |

## C · Trocar de bloco/modo no piloto novo (CPU 4×; toolbox ABERTA + lápis armado + traço recém-feito, e toolbox FECHADA)

| estado · transição | até o 2.º quadro, ms (antes → depois) | CPU total da transição, ms (antes → depois) | tarefa longa máx, ms (antes → depois) |
|---|---|---|---|
| aberta+armado+traco · bloco → modo | 224 → **192** (−14%) | 312 → **277** | 187 → **157** |
| aberta+armado+traco · modo → bloco | 457 → **301** (−34%) | 571 → **442** | 466 → **278** |
| aberta+armado+traco · bloco ↔ bloco | 243 → **262** (+8%) | 379 → **358** | 257 → **271** |
| fechada · bloco → modo | 174 → **168** (−3%) | 287 → **289** | 143 → **139** |
| fechada · modo → bloco | 350 → **519** (+48%) | 509 → **629** | 505 → **566** |
| fechada · bloco ↔ bloco | 250 → **266** (+6%) | 389 → **396** | 263 → **284** |

> Nota (ruído): a linha «fechada · modo → bloco» varia ±25–50% entre execuções do harness (ordem de execução, CPU compartilhada). Com 6 medições **intercaladas** antes/depois nessa mesma transição (`dados/intercalado-fechada-modo-bloco.json`) a média é 473 ms (antes) × 468 ms (depois): **sem diferença** — e as medidas determinísticas abaixo (C2) são idênticas (1 passe grande, ≈ 3 620 elementos). O que muda de verdade é o caso com a toolbox ABERTA.

### C2 · Medida DETERMINÍSTICA (não depende de tempo): recalculações de estilo de ≥ 800 elementos numa ida e volta de modo (CPU 1×)

| estado | passes grandes por ida e volta (antes → depois) | elementos reaplicados (antes → depois) | tempo de estilo, ms (antes → depois) |
|---|---|---|---|
| aberta+armado+traco | 2 → **1** | 5911 → **3858** | 85.9 → **52.7** |
| fechada | 1 → **1** | 3621 → **3627** | 42.3 → **50.7** |

Causa: `rm-materia-sistema.js` (`sync` do espelho da toolbox) escrevia `--rm-dock-h` na `<html>` toda vez que a caixa aparecia/sumia com a vista. Com a toolbox aberta, cada ida e volta de modo mudava o valor **duas vezes** (ocultar → 0, mostrar → altura) e cada mudança de uma variável herdada reaplica o estilo da página inteira (a segunda passada grande, ~120 ms a 4×, ~400 ms depois da troca — a «breve travada»). O CSS só usa a variável < 768 px.

## Limites

- Emulação no Chromium sobre CPU de servidor (rápida). Nenhum número aqui substitui o aparelho real do José; o teste de ≤ 3 min (`PASSO-FINAL-JOSE.md`) mede os mesmos itens no tablet.
- O custo-base de trocar de bloco/modo (mostrar/ocultar ~1 200–2 400 elementos) continua: é o preço de exibir outro bloco. O que saiu foi o excesso medido da toolbox aberta.
- Pontos perdidos = 0 antes e depois (rajadas, sem ack): se o aparelho real cortar o traço (pointercancel/captura perdida) isso só aparece no diagnóstico opt-in.
