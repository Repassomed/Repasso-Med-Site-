# Post-its/notas laterais encobertos — evidência antes/depois (issue #93, PR #464)

**Relato (José):** em algumas matérias, post-its/notas importantes que aparecem na lateral ficam tapados por outra parte da interface.
**Método:** `../../postits-93.probe.cjs` mede, nas 30 matérias reais (`netlify/functions/materias-privadas/`) a 390/768/1024/1440 px, cada post-it (`.rmc-margin` + legados `*-postit`) em 3 posições de rolagem comparando **por pixel** a região visível «como está» com a mesma região mostrando só o post-it (o aluno só vê o que PINTA; UI fixa e outros post-its laterais somem nas duas capturas), mais hit-test, recorte lateral, overflow horizontal e as aberturas do glossário `#rm-gl-note`. Emulação do Chromium.

## Auditoria da PR: seletor restrito a FILHO direto (contrato de desempenho do `:has()` da #456)
A 1.ª versão usava `.container>:has(.rmc-margin)` (por descendente). Agora: **`.container>:has(>.rmc-margin)`** (combinador de filho). Estrutura real medida em todas as matérias (`.rmc-margin` → bloco que é filho de `.container`): **profundidade 1** em Dermatología (5 post-its, `.rmc-detalle`) e Farmacología (`.pk-step`), em TODOS os que cuelgam do pai (86 na varredura; teste B verifica `prof == 1`). Só há profundidade 2 em Farmacología (`.mapa-mental`, 2) e Semiología II (`figcaption`, 1), e **nenhum desses cuelga/fica coberto** (0 cobertos antes e depois) — por isso o caminho mais limitado cobre o conjunto medido sem perder a correção. O único `:has()` de `styles.css` é esse, e o teste A confere que ele começa por `>`.

## Quais mecanismos falham (e quais não)
| mecanismo | veredito |
|---|---|
| `.rmc-margin` **dentro de um filho de `.container`** (`.rmc-detalle`, `.pk-step`…), float ≥ 920 px | **FALHA**: o filho é contexto de apilamiento (`.container>*{position:relative;z-index:1}`), o `z-index:2` do post-it fica preso nele e o **irmão seguinte** (z:1, depois no DOM) pinta POR CIMA do post-it que cuelga abaixo do pai. Dermatología: 84 % e 43 % cobertos; Farmacología: 23 % (1024 e 1440 px) |
| `.rmc-margin` filho direto de `.container` | ok desde a #370 (`z-index:2`) |
| < 920 px (post-it não flutua) · legados `a1-/em-/f2-/hi-/bio-…postit` em fluxo | ok (0 cobertos) |
| glossário `#rm-gl-note` | **sem defeito**: popover (top layer) + fallback `position:fixed` z 2147483000; sempre 100 % dentro da janela (com e sem Popover API: `postits-encobertos.test.cjs`, E) |
| controles flutuantes (menu, ferramentas, «Salir») | só encostam na margem de post-its largos no celular, transitório; sem perda de texto medida; não alterado |
| overflow horizontal | 0 em 120 combinações |

## Antes × depois (mesma página, mesma rolagem; só muda a ordem de pintura)
Dermatología 1440 — nota 12 (84 % coberta → 0 %) e nota 4 (43 % → 0 %); Farmacología 1440 — nota 17 (23 % → 0 %). Também 1024 px. Com o seletor `:has(> …)` os números são idênticos aos da 1.ª versão. Arquivos `antes-depois_*.webp` + `casos.json`.

![Dermatología 1440, nota 12: antes 84 % coberta, depois 0 %](antes-depois_dermatologia_1440_nota12.webp)
![Dermatología 1440, nota 4: antes 43 % coberta, depois 0 %](antes-depois_dermatologia_1440_nota4.webp)
![Farmacología 1440, nota 17: antes 23 % coberta, depois 0 %](antes-depois_farmacologia_1440_nota17.webp)

## Varredura (30 matérias × 4 larguras = 120 combinações; 908 post-its amostrados, 2 724 posições de rolagem, 86 post-its que cuelgam do pai, 464 aberturas do glossário)
| | post-its cobertos | glossário c/ problema | overflow horizontal | erros JS | arquivo |
|---|---|---|---|---|---|
| **ANTES** (regra neutralizada = `main`), 8 matérias com post-it aninhado × 4 larguras (32 comb., 299 post-its) | **6** (Dermatología 2+2, Farmacología 1+1) | 0 | 0 | 0 | `dados/antes_regra-neutralizada_8-materias-aninhadas.ndjson` |
| ANTES (`main`), 1.ª varredura completa (métrica anterior) | 8 (inclui 2 falsos positivos em Oftalmología, já corrigidos na sonda) | 2 * | 0 | 0 | `dados/antes_main_1a-varredura_30x4.ndjson` |
| **DEPOIS** (esta PR, `:has(> …)`), 120 comb. | **0** | 2 * | 0 | 0 | `dados/depois_esta-PR_30x4.ndjson` |

\* Em ambas as árvores o que fica sob um controle flutuante é o TERMO a 40 px do rodapé (Histologia II Práctica 768, Medicina Legal 390), não o post-it; transitório (sai rolando) e o post-it do termo abre normal. Não é causado nem alterado por esta regra.

**Legibilidade 100 %:** 0 post-its cobertos nas 2 724 posições (comparação por pixel), 0 recortes laterais, 464 aberturas do glossário com 100 % da caixa na janela e 0 cobertas por pixel; nenhuma caixa se move (geometria idêntica nos dois estados, `postits-encobertos.test.cjs` B).

## Custo na escrita com a caneta (`../../caneta-has-93.cjs`; dados em `caneta/`)
Mesma página, estados da regra trocados pelo CSSOM: **sem** a regra (= `main`) · **filho** = `:has(> .rmc-margin)` (esta PR) · **desc** = `:has(.rmc-margin)` (1.ª versão, de contraste). Gestos pela pipeline real do Chromium (CDP `pen` → pointerdown/move/up), motor real da caneta, 150 traços já salvos, 3 rodadas alternadas × 4 traços por estado, mediana. Elementos que a regra casa: Dermatología 5, Fisiopatología II 43, Semiología II (layout NOVO = V2 + tema + navegação) 0 (filho) / 1 (desc).

CPU **4× mais lenta**:
| alvo | estado | pointerup (proc., ms) | pointerup até o quadro | tinta p95 | tarefas longas | estilo/quadro | recálculo p/ mutação (classe no `<body>`) | pontos perdidos |
|---|---|---|---|---|---|---|---|---|
| Dermatología | sem | 26,3 | 88 | 15,9 | 2 | 0,4 | 7,52 | 0/4308 |
| | **filho** | **25,4** | 88 | 16,0 | 2 | 0,4 | **7,92** | 0/4308 |
| | desc | 26,7 | 96 | 16,0 | 2 | 0,4 | 8,26 | 0/4308 |
| Fisiopatología II | sem | 101,6 | 256 | 14,9 | 2 | 0,6 | 15,81 | 0/4308 |
| | **filho** | **103,5** | 256 | 14,8 | 2 | 0,6 | **16,17** | 0/4308 |
| | desc | 102,7 | 256 | 14,8 | 2 | 0,7 | 17,11 | 0/4308 |
| Semiología II (layout novo) | sem | 35,4 | 104 | 15,2 | 2 | 0,5 | 11,83 | 0/4308 |
| | **filho** | **37,7** | 112 | 15,2 | 2 | 0,5 | **11,72** | 0/4308 |
| | desc | 38,0 | 120 | 15,2 | 2 | 0,5 | 11,68 | 0/4308 |

CPU **normal (1×)**: pointerup proc. Dermatología 6,1 → **6,0** (filho) · 5,5 (desc); Fisiopatología II 22,8 → **22,7** · 22,4; Semiología II novo 7,7 → **7,9** · 7,6; recálculo por mutação 7,97 → 7,92 · 8,60; 15,87 → 16,66 · 17,73; 11,50 → 11,52 · 12,22; tinta p95 16 ms (1 quadro de 60 Hz) em todos; 0 tarefas longas; 0 pontos perdidos.
**Leitura:** a regra por FILHO fica dentro do ruído (±2 ms no pointerup; ≤ ~5 % no recálculo de estilo por mutação, que é um recálculo da página inteira — Fisiopatología II, a mais pesada, 15,8 → 16,2 ms), sem aumento de tarefas longas, pior quadro ou latência de tinta; a versão por descendente já mostrava o custo subir um pouco mais (até +12 % no recálculo, 1× Fisiopatología II 17,7 ms), que é o que a restrição elimina. (O pointerup de ~100 ms de Fisiopatología II a 4× existe sem a regra: é o tamanho da matéria — 80 mil nós.)

## Limites
Chromium emulado (não é o aparelho do José, sem stylus físico); a varredura amostra até 6 post-its por matéria + TODOS os que cuelgam do pai; o Layout V2 só liga em Semiología II (piloto) — testado lá, com e sem tema. Navegadores sem `:has()` (muito antigos) ficam como hoje (a regra é descartada sozinha, sem afetar o resto).
