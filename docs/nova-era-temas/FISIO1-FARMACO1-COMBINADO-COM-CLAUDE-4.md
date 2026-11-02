# Fisiopatología I e Farmacología I · como entram no carregador da Nova Era (e o que depende do Claude 4)

**Data:** 02/11/2026 · **Autora:** Claude 2 · **Branch:** `claude/nova-era-fisio1-farmaco1-2026-11`

## 1 · Quem é quem
- **Claude 4** (base da Nova Era: `rm-pilot.js`, módulo do tema, `rm_materia_rollout`): branches `claude/modest-rubin-th2yir-*`. Tarefa atual: **#631** (fechar a caixa de ferramentas ao navegar e modo Infografías), em `rm-layout.js`, `rm-modes.js`, `rm-materia-nav.js` e, se aplicável, `rm-materia-sistema.js`.
- **Claude 1** (auditor): branches `claude/charming-maxwell-ah7nxj-*` (inclui `…ap1practica-histologia1` e `…medlegal-p2-628`; **não** são do Claude 4).
- **Claude 2** (esta branch): Fisiopatología I e Farmacología I.

## 2 · Estado da base
A **PR #627 (Medicina Familiar completa) já foi mesclada** na `main` (merge `259049b7`). Esta branch contém a `main` atual. O carregador do Claude 4 registra cada matéria **dentro** de `RMSistema.TEMAS` (`rm-materia-sistema.js`) com um bloco de variáveis em `rm-materia-sistema.css` e o slug em `CANDIDATAS` de `rm-pilot.js`. As duas matérias seguem **exatamente essa convenção** (os arquivos `assets/temas/*` que existiam em versões anteriores desta branch foram retirados: há uma só fonte).

## 3 · O que esta PR toca em arquivos globais (mínimo)
| Arquivo | Mudança | Risco de conflito com a #631 |
|---|---|---|
| `assets/rm-materia-sistema.js` | 2 funções de classificação + 2 entradas em `TEMAS` (bloco novo, depois de `medicina-familiar`); `curto()` sem o prefixo numérico; no menu lateral, o rótulo do bloco perde o prefixo numérico repetido (1 linha no laço que já decora a insígnia) | baixo: hunks separados; se a #631 mexer no laço do menu, resolver juntando |
| `assets/rm-materia-sistema.css` | 2 blocos de identidade no fim do arquivo | nenhum (fim do arquivo) |
| `assets/rm-materia-nav.js` | 1 linha: `curto()` sem o prefixo numérico | baixo (linha única) |
| `assets/rm-pilot.js` | `CANDIDATAS` += 2 slugs; `VER` 2026110201 → 2026110202 | **se a #631 também subir `VER`, ficar com o maior valor** e igualar a tag do `index.html` |
| `index.html` | só a tag `rm-pilot.js?v=` | idem |
Não foram tocados: `rm-layout.js`, `rm-modes.js`, `rm-tools-v2.js`, `get-pilot-flags.js`, migrations.

## 4 · Dependências registradas
1. **#631 (Claude 4):** ao entrar na `main`, sincronizar esta branch (`git merge origin/main`), resolver `VER`/tag e repetir `real-fisio1-farmaco1.test.cjs` + `visual-conteudo.test.cjs`. O modo **Infografías já aparece** nas duas matérias (as imagens são `figure` com `figcaption`: 39 em Fisio I e 52 em Farmaco I; testado). Se a #631 mudar a detecção/contagem, reconferir que os números e a navegação ida/volta continuam sem duplicatas.
2. **Linhas em `rm_materia_rollout`:** SQL só do José, depois do merge e do deploy (`docs/nova-era/ROTEIRO-FISIO1-FARMACO1.md`). Nada foi executado.
