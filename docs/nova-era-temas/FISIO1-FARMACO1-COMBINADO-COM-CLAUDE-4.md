# Fisiopatología I e Farmacología I · como entram no carregador da Nova Era (e o que depende do Claude 4)

**Data:** 02/11/2026 · **Autora:** Claude 2 · **Branch:** `claude/nova-era-fisio1-farmaco1-2026-11`

## 1 · Quem é quem
- **Claude 4** (base da Nova Era: `rm-pilot.js`, módulo do tema, `rm_materia_rollout`): branches `claude/modest-rubin-th2yir-*`. Entregou a **#633** (issue #631: fechar a caixa de ferramentas ao navegar e regra única do modo Infografías) em `rm-layout.js`, `rm-modes.js`, `rm-materia-nav.js`, `rm-materia-sistema.js` e `rm-tools-v2.js`; **já está na `main`** e esta branch a contém (merge 03/11).
- **Claude 1** (auditor): branches `claude/charming-maxwell-ah7nxj-*` (inclui `…ap1practica-histologia1` e `…medlegal-p2-628`; **não** são do Claude 4).
- **Claude 2** (esta branch): Fisiopatología I e Farmacología I.

## 2 · Estado da base
A **PR #627 (Medicina Familiar completa) já foi mesclada** na `main` (merge `259049b7`). Esta branch contém a `main` atual. O carregador do Claude 4 registra cada matéria **dentro** de `RMSistema.TEMAS` (`rm-materia-sistema.js`) com um bloco de variáveis em `rm-materia-sistema.css` e o slug em `CANDIDATAS` de `rm-pilot.js`. As duas matérias seguem **exatamente essa convenção** (os arquivos `assets/temas/*` que existiam em versões anteriores desta branch foram retirados: há uma só fonte).

## 3 · O que esta PR toca em arquivos globais (mínimo) e como ficou o merge com a #633
| Arquivo | Mudança desta PR | Resolução |
|---|---|---|
| `assets/rm-materia-sistema.js` | 2 funções de classificação + 2 entradas em `TEMAS`; `curto()` sem prefixo numérico; 1 linha no laço do menu lateral | merge automático (hunks separados); a regra única de infografia da #633 foi preservada |
| `assets/rm-materia-sistema.css` | 2 blocos de identidade no fim do arquivo | sem conflito |
| `assets/rm-materia-nav.js` | 1 linha: `curto()` | merge automático; `ehInfografia`/`infografiasDe` e a navegação da #633 preservados |
| `assets/rm-pilot.js` / `index.html` | `CANDIDATAS` += 2 slugs; `VER` e tag | **conflito concreto resolvido**: a main subiu `VER` para 2026110302; a união mantém as 4 candidatas e usa **2026110303** (maior que o da main, porque os módulos mesclados diferem dos da main), igual no `index.html` |
Não tocados: `rm-layout.js`, `rm-modes.js`, `rm-tools-v2.js`, `get-pilot-flags.js`, migrations.

## 4 · Dependências
**Linhas em `rm_materia_rollout`:** SQL só do José, depois do merge e do deploy (`docs/nova-era/ROTEIRO-FISIO1-FARMACO1.md`). Nada foi executado. Observação: `infografias-modo.test.cjs` (da #633) tem contagens esperadas só para Medicina Familiar e Semiología II e falha com TypeError para outros slugs; o modo Infografías de Fisio I (39) e Farmaco I (52) é provado em `real-fisio1-farmaco1.test.cjs` (cartões = recurso real = total do cabeçalho).
