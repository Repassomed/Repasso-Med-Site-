# Neurología · sequência de integração #687 → #715 → #682 (preparo; 24/11/2026)

Nada foi mesclado nem publicado. **Nenhuma branch alheia foi alterada:** `claude/neuro-8a1b-1911` (#687, `610104ed`) e `claude/neurologia-infograficos-b20-b27` (#682, `8446cdd6`, Claude 4) seguem como estavam. Complementa o preparo do Claude 2 (`neurologia-integracao-682-687-preparo-2026-11-24-v1.md`).

## Ordem recomendada
1. **#687** (questões, conferência 8-A.1-B) — base de tudo; **ainda não está na `main`**.
2. **#715** (6 perguntas das fotos novas) — **depende da #687**: a branch dela é empilhada sobre a da #687 (PR com base `claude/neuro-8a1b-1911`). **Mesclar a #715 antes da #687 não é possível sem levar a #687 junto.** Depois de mesclar a #687, a base da #715 deve ser trocada para `main` (ou ela mescla na própria branch da #687 antes da #687 entrar).
3. **#682** (infográficos; Claude 4) — por último, atualizada com a `main` já com #687 e #715.

## O que já testei (ensaio local, sem push, sem tocar nas branches)
Merge de ensaio da `claude/neuro-prova-1124` (#715) com a #682 e, em separado, da #687 com a #682:
- **mesmos 3 conflitos nos dois casos:** `docs/layout-ensaio/inventario.json`, `tools/qa/neu-glosario/neu-glosario.test.cjs`, `tools/qa/neu-questoes-1811/neu-questoes.test.cjs`. **A #715 não cria conflito novo no HTML** (`neurologia.html` funde sozinho).
- Resolução proposta (a executar só depois que José decidir a ordem): nos dois testes manter as constantes da `main` + #682 e somar as da #687/#715 (296 perguntas; MCQ 196; V/F 69; DEFINE 31; 592 itens); no `inventario.json`, **regenerar a linha da Neurología** com `NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/inventario.cjs neurologia` (nunca resolver à mão).
- Depois da integração: rodar `neu-8a1b` (estático/navegador), `neu-negrito`, `neu-vf`, `neu-prova` e as suítes da #682.

## Estado atual (verificado hoje)
- `main` `c288d1a5` já contém #712 e #713; **#687 e #715 não**.
- A #715 inclui a linha regenerada da Neurología no inventário (592 q); a #682 tem a sua; é o conflito acima.

## Atualização (24/11, fechamento)
- **#687 atualizada com a `main` (`c288d1a5`)** em `b8edf38c`: o **único conflito era `docs/layout-ensaio/inventario.json`**; `neurologia.html` ficou **idêntico ao da #687 anterior** (a `main` não mexeu nele desde a base `d72973ed`), logo questões, marcas, correções de V/F e a retirada do Cierre (#699) não mudaram. Resolução: arquivo da `main` + linha da Neurología **regenerada** pelo gerador (580 q). Testes depois do merge: `neu-8a1b` 3763/3763, `neu-negrito` 1258/1258, `neu-vf` 565/565, `neu-glosario` 398/398, `neu-questoes-1811` 119/119, `neuro-667` 294/294; navegador `neu-8a1b` 14/14 e `neu-vf` 12/12.
- **#715** recebeu esse merge em `23931854` (conflito só no inventário; linha regenerada, **592 q**). As 6 perguntas novas intactas; testes: ver corpo da PR.
- **#682** (`claude/neurologia-infograficos-b20-b27`, Claude 4) segue em `8446cdd6`, **não foi tocada**. Ensaio de merge dela com a #687 atual e com a #715 atual: **mesmos 3 conflitos** (`inventario.json`, `neu-glosario.test.cjs`, `neu-questoes-1811.test.cjs`); o HTML funde sozinho. Resolução proposta no §anterior; fica para depois da #687 e da #715 entrarem.

## Fechamento (25/11)
- **#687** em `922c5d06` (árvore idêntica à `b8edf38c`; um commit de registro foi desfeito por revert para não mexer no escopo declarado dela). O registro questão a questão (reordenadas × reescritas × reformuladas) está em `neurologia-687-gabaritos-comparacao-2026-11-24-v1.md`, nesta PR (#715), com o script `tools/qa/neu-prova-1124/comparar-687-com-main.py`.
- **Como resolver os conflitos com a #682 depois que #687 e #715 forem mescladas** (a #682 segue em `8446cdd6`, não alterada; só o Claude 4 mexe nela): 1) atualizar a branch da #682 com a `main` nova (pelo dono dela); 2) `neu-glosario.test.cjs` e `neu-questoes-1811.test.cjs`: manter as constantes da `main` (296 perguntas; MCQ 196; V/F 69; DEFINE 31; 592 itens) e somar o que a #682 acrescenta; 3) `docs/layout-ensaio/inventario.json`: aceitar a `main` e **regenerar** a linha da Neurología (`NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/inventario.cjs neurologia`, depois copiar a linha para o arquivo e apagar `inventario.parcial.json`); 4) rodar `neu-8a1b`, `neu-negrito`, `neu-vf`, `neu-prova` e as suítes da #682.

## Ensaio de integração com a versão corrigida do teste da #716 (25/11)
A #716 já está na `main` (`5f186e48`) e o `integracao-682-687.sh` corrigido (status real, fail-fast, `--tolerar` explícito) foi usado. Para incluir a #715, usei uma **cópia do script em /tmp** com a referência da #687 trocada pela branch da #715 (que contém a #687); o script do repositório não foi alterado. Resultados: ver o corpo da PR #715.
