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
