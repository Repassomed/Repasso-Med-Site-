# AP I Práctica e Histología I · resultados reais dos testes (02/11/2026)

**Estado:** pacote de tema PRONTO e testado de forma isolada. **Integração com a base do Claude 4: PENDENTE** (ver «Bloqueio»). Nenhuma matéria ativada; nenhum arquivo global alterado; nenhuma escrita no Supabase.

## Testes feitos
| Teste | Resultado |
|---|---|
| `tools/qa/nova-era-temas/testar.cjs` (1440 · 1024 · 768 · 390 px, 2 matérias) | **112/112**: descritor próprio em uso, CSS aplicado, blocos e tipos, 20 vinhetas carregam, mesmos ids, texto de cada seção, imagens (53 e 36), questões (96 e 300), flashcards (341 e 396), figuras e tabelas idênticos ao controle, sem escrita, sem rolagem horizontal, sem erro de console, sem rótulo «UNIDAD ·» visível |
| `ensaio-layout/interacao.cjs` com o tema injetado (1440 e 768 px) | **46/46** (23 por matéria): caneta (escreve, grava, palma, dedo rola, pinça, zoom, traço antigo preso, goma, desfazer, recarregar traços), marca-texto e recarregar grifos, troca de bloco/modo, responder, escritas só em anotações, 0 erro JS, 0 rede externa |
| Dados reais do aluno (Supabase, só SELECT) | `user_highlights`, `user_notes`, `user_ink_strokes`: **0 linhas** nas duas matérias ⇒ nada a preservar hoje; o comportamento de preservação foi provado pelos testes de recarga acima |
| Guard | sem falha própria |

## Identificação e ordem dos blocos
AP I Práctica: ids b1…b9 = Tema 01–09 (ordem do conteúdo); b10 laminario (L), b11 flashcards (F), b12 ruleta (R) = repaso. Histología I: histo01…histo12 = Bloque 01–12; histo13 banco (B), histo14 flashcards (F), histo-imgnote bibliografía (C) = repaso; histo00 (vazio e oculto) não vira bloco.

## Limitações
- Chromium/Linux: não é Safari/iPadOS nem Apple Pencil (a caneta física só se prova no aparelho).
- Testes feitos com o tema injetado em memória no harness; falta rodar com o carregador real.
- Cinco vinhetas de Histología I mostram fragmento de legenda na borda (ver PROVENIENCIA-IMAGENS.md).

## Bloqueio
O carregador reutilizável do Claude 4 ainda não existe: a branch dele (`medfam-completa`) ainda escreve o tema de Medicina Familiar dentro de `rm-materia-sistema.js` e `CANDIDATAS` em `rm-pilot.js`. Quando ele publicar o carregamento de `assets/temas/rm-tema-<slug>.js/.css`, falta só: incluir os dois slugs, rodar de novo `testar.cjs`, `interacao.cjs`, a porta 7/7 e as capturas, e abrir a PR com o Cartão de Merge.
