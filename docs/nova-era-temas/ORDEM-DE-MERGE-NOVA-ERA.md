# Ordem de merge — Nova Era (Fisiopatología II e vizinhas) · 10/11

Registro de coordenação. Nada aqui ativa matéria: todas as PRs só *perguntam* ao servidor; quem libera é a linha de `rm_materia_rollout` (SQL do José, depois do deploy).

## PRs abertas e o que cada uma toca nos arquivos compartilhados

| PR | Matéria | Agente | Arquivos compartilhados que altera |
|---|---|---|---|
| #634 | Anatomía I e AP I | Claude 2 | `rm-pilot.js` (CANDIDATAS, VER), `index.html` (tag), `rm-materia-sistema.js/.css` (fim de TEMAS/CSS), `nao-ativacao.test.cjs`, `auditoria-implantacao-publica.test.cjs` |
| #635 | Biología | Claude 1 | os mesmos 6 |
| #636 | Embriología | Claude 1 | `rm-pilot.js`, `rm-materia-sistema.js/.css`, `inventario.json`, os 2 testes (e `index.html`) |
| #644 | Farmacología II | Claude 2 | os mesmos 6 |
| #645 | Fisiopatología II | esta sessão | os mesmos 6 (+ vinhetas e documentos próprios) |
| #643 → #650 | Fisiopatología II (conteúdo) | esta sessão | **só** `fisiopatologia-ii.html`, testes `fisio2-6xx`, `inventario.json` (linha da matéria) |

## Ordem recomendada

1. **#643, depois #650** (conteúdo; não toca arquivos globais). A #650 contém a #643, então pode entrar só ela, mas a ordem registrada é #643 → #650.
2. **#645** pode entrar antes ou depois de #643/#650: o mapa já reconhece `fp2b18`/`fp2b19`; sem o conteúdo, a matéria tem 17 blocos e nada quebra.
3. As demais PRs Nova Era (**#634, #635, #636, #644, #645**) entram **uma de cada vez**, na ordem em que José decidir. Cada uma, ao entrar depois de outra, conflita nas mesmas linhas globais (receita abaixo); quem tiver a PR seguinte a atualiza sobre a `main` e resolve por **união**. Esta sessão **não** alterou as branches de #634–#636 e #644.

## Conflitos (simulados em checkout descartável, 10/11, sobre a `main` `003d39a9`)

Merge sequencial das cinco branches sobre a `main`: #634 entra sem conflito; **cada uma das seguintes conflita** em `rm-pilot.js`, `rm-materia-sistema.js`, `index.html` (tag), `nao-ativacao.test.cjs`, `auditoria-implantacao-publica.test.cjs` (e `.css`/`inventario.json` em alguns casos). São sempre as mesmas linhas.

Receita de resolução (união, nunca descartar o lado de ninguém):
- `CANDIDATAS` (em `rm-pilot.js`) e as listas `CANDIDATAS_ESPERADAS` / `CAND_CONTROLADAS` / a lista de slugs de `arquivos()`: **união** de todos os slugs.
- `VER` do `rm-pilot.js` = o **maior** valor e **igual** à tag `rm-pilot.js?v=` do `index.html`.
- `rm-materia-sistema.js`: manter **todos** os descritores `TEMAS[...]` e funções de classificação; `.css`: manter todos os blocos por matéria.
- `inventario.json`: regenerar com a ferramenta (`tools/qa/pre-voo/inventario-fresco.py`), nunca à mão.
- Depois de cada resolução: `nao-ativacao`, `auditoria-implantacao-publica` e o `real-<matéria>` da matéria que entrou.

## Auditoria de publicação (22 falhas → 0)
O `auditoria-implantacao-publica.test.cjs` ainda ligava a matéria pelas variáveis antigas `RM_LAYOUT_SLUGS`/`RM_PEN_SLUGS`, que o `get-pilot-flags.js` atual **não lê mais** (só a linha de `rm_materia_rollout`). Defeito do teste, não do servidor (fail-closed funcionando). O teste foi atualizado para o mecanismo atual (Supabase simulado com a linha da matéria, perfil de administrador e matérias compradas) e passou a **provar** que as variáveis antigas não ligam nada. Resultado: ver o corpo da #645.


## Atualização 11/11 — estado sobre a `main` `def2bad3` (já com Biología #635, #643 e #650)

| # | PR | Matéria | Agente | Estado da branch sobre a `main` | Testes (quem rodou) | Pendências | Ordem sugerida |
|---|---|---|---|---|---|---|---|
| — | #635, #643, #650 | Biología; conteúdo Fisiopatología II | Claude 1 / esta sessão | **já na `main`** | — | — | feito |
| 1 | #636 | Embriología | Claude 1 | limpa (já contém a `main`) | não rodei | — | **1.º** (sem conflito) |
| 2 | **#645** | Fisiopatología II (19 blocos) | esta sessão | **atualizada com a `main` e resolvida** (`d4c26e41`); CANDIDATAS unidas com Biología | temas 57/57 · real 109/109 · integração 119/119 · visual 46/46 · real-biologia 118/118 · servidor 59/59 · navegador 247/247 · infografias 48/48 · navegar 356/356 · nao-ativação 22/22 · **publicação 189/189** · seções vazias 95/95 · porta 7/7 · fisio2-642 27/27 (`--base 7f329241`) · fisio2-647 61/61 | Safari/Apple Pencil; arte dos blocos 18–19 | 2.º |
| 3 | #634 | Anatomía I e AP I | Claude 2 | conflita com a `main` (rm-pilot, index, 2 testes) — **eles atualizam** | não rodei | — | 3.º |
| 4 | #644 | Farmacología II | Claude 2 | conflita (rm-pilot, index, inventario.json, 2 testes) — **eles atualizam** | não rodei | — | 4.º |
| 5 | #653 | AP I Práctica e Histología I | Claude 1 | conflita (rm-pilot, index, 2 testes) — **eles atualizam** | não rodei | — | 5.º |
| 6 | #655 | Dermatología | esta sessão | branch nova sobre a `main` (sem conflito com ela); conflita com as demais nas mesmas listas | real-dermatologia 118/118 · visual 32/32 · nao-ativação 22/22 · porta 7/7 · publicação 189/189 (com o teste da #645) | arte (logotipo); 1 front de flashcard repetido; 1 grifo real em dermb04 (preservado) | 6.º |

Receita para cada PR que entra depois: atualizar sobre a `main`; `CANDIDATAS` e as listas dos testes = **união**; `VER` = maior = tag do `index.html`; `inventario.json` regenerado pela ferramenta; repetir `nao-ativacao`, `auditoria-implantacao-publica` e o `real-<matéria>`.

**Esclarecimento da verificação que falhava no teste combinado de publicação** (11/11): era a checagem «não toca HTML de outra matéria» (seção G). Ela compara o diff contra a `main`; num merge **combinado** descartável com o conteúdo das #643/#650 ainda fora da `main`, o HTML de Fisiopatología II aparecia como alteração. Com #643/#650 já na `main` ela passa (189/189), e o teste continua barrando HTML de outras matérias. Não era defeito do servidor nem da #645.


## Atualização 11/11 (noite) — `main` já com #635, #636, #643, #650 e #653
- Na `main`: Biología (#635), Embriología (#636), AP I Práctica + Histología I (#653) e o conteúdo de Fisiopatología II (#643, #650).
- **#645** (Fisiopatología II): a branch já foi atualizada sobre essa `main` por Claude 1 (`da6bc145`, «Merge main (#653)…»; antes `331942a4` com a #636); eu integrei por cima só este documento. `CANDIDATAS` na branch: `…, 'biologia', 'embriologia', 'fisiopatologia-ii', 'anatomia-patologica-practica', 'histologia-i'`.
- Ainda abertas: **#634** (Anatomía I/AP I, Claude 2), **#644** (Farmacología II, Claude 2), **#645** (esta) e **#655** (Dermatología). Ordem sugerida: **#645 → #634 → #644 → #655** (cada uma atualiza sobre a `main` e resolve as listas por união; `VER` = maior = tag do `index.html`).

### Posição final 11/11 (noite)
- `main` também com **#656** (Histología II e Práctica). #645 (`7b360453`) e #655 (`ab00b1a0`) já contêm essa `main`; Claude 1 atualizou antes as branches deles (preservado) e eu integrei por cima só o que faltava.
- **O teste de publicação desta `main` ainda tem as 22 falhas antigas** (teste desatualizado); ele só fica correto quando a **#645** entra. Por isso a ordem sugerida é **#645 → #634 → #644 → #655**.


## 14/11 — ORDEM ÚNICA e ensaio de integração (main `76bd0b02`)

### Estado e ordem
| Ordem | PR | Matéria | Quem | Estado na `main` atual | Testes (14/11) | Pendências |
|---|---|---|---|---|---|---|
| **1.º** | **#645** | Fisiopatología II (19 blocos) | esta sessão | limpa | tema 57 · real 109 · integração 119 · visual 46 · nao-ativ 28 · **publicação 189/189** · porta 7/7 | arte blocos 18–19 |
| 2.º | **#634** | Anatomía I e AP I | Claude 2 | **conflito resolvido** (era rascunho; `52d1be5e`) | nao-ativ 29 · tema 112 · real 221 · integração 241 · visual 76 e 32 · portas abertas | caneta: falhas antigas registradas em `CANETA-FALHAS-ANTIGAS-2026-11.md` |
| 3.º | **#644** | Farmacología II | Claude 2 | limpa (toca também `rm-modes.js`, oráculos do ensaio e `inventario.json`) | resultados de Claude 2 na PR (tema 55 · real 121 · integração 155 · visual 36 · infografias 55/201) | doses do conteúdo (#649) conferidas só com slides |
| 4.º | **#657** | AP II | Claude 2 | limpa | tema 53 · real 106 · integração 119 · visual 26 (Claude 2); real 106 e tema 53 repetidos no ensaio | arte limpa blocos 3–4 |
| 5.º | **#662** | AP II Práctica | Claude 2 | limpa (**era rascunho; finalizada**, `cb79ecd7`) | tema 51 · real **109/109** · integração 119 · visual 42 · nao-ativ 28 · porta aberta | — (ver abaixo) |
| 6.º | **#655** | Dermatología | esta sessão | limpa | real 118 · visual 32 · nao-ativ 28 · porta 7/7 | front «Liquenificación» repetido; 1 grifo real em dermb04 |
| 7.º | **#658** | Guaraní | Claude (thread Nova Era) | **conflito resolvido** (`d52b2282`) | nao-ativ 28 · real 118 · visual 34 · porta aberta | blocos 06 e 11 com logotipo |
| 8.º–10.º | #660 · #663 · #664 | Toxicología · Anestesiología e Bioestadística · Ortopedia e Oftalmología | **Claude 1 (corrigindo; não toquei)** | conflitam só nas 4 listas, sobre o ensaio abaixo | a cargo de Claude 1 | entram por último, cada uma atualiza sobre a `main` |

### #662 — a falha que a mantinha em rascunho
«7 · tabela» a 390 px: desvio 2,03 px. Diagnóstico: a tabela do bloco 01 mede **1809 px** de altura numa tela de **844 px** (começa em y = −448), então o gesto de teste saía da tela e perdia 2 pontos (`DIAG` impresso). **Defeito do alvo do teste, não da caneta**: o parágrafo e a tabela passam em 1440/768, e `integracao-ap2p` (6 larguras, tabela, rápido/longo) passa 119/119. Correção: se a tabela é mais alta que 70 % da tela, o alvo é a 1.ª linha. Resultado: `real-ap2p` **109/109**.

### Ensaio de integração (descartável, não publicado): `main` + #634 + #644 + #645 + #657 + #662 + #655 + #658, resolvido por união
19 candidatas = 19 temas (sem duplicata, sem tema órfão); `VER` = tag; JS/CSS carregam. Testes no ensaio: `nao-ativacao` **35/35** · `auditoria-implantacao-publica` **189/189** · `temas` fisio2 57 · ap2 53 · ap2p 51 · anato/AP I 112 · `real` guarani 118 · dermatologia 118 · biologia 118 · fisio2 109 · histologias 354 · ap2 106 · farmaco2 121.
**Achado que a ferramenta corrige:** ao juntar, a lista literal «vizinhas» do B5 (`['toxicologia','anatomia-i']`) reprova assim que `anatomia-i` vira candidata; vale a versão **calculada** (`VIZ_FORA`, desta PR). A auditoria só fica verde com ela.

### Ferramenta de resolução
`tools/qa/nova-era/uniao-nova-era.py <worktree>` (com `_uniao_listas.py` e `_dobra_temas.py`): dentro de um merge da `main`, resolve listas por união, `VER` = maior = tag, B5 = `VIZ_FORA`, e mantém os dois temas em `rm-materia-sistema.js/.css`. Depois: carregar o JS, `nao-ativacao`, `auditoria`, `real-<matéria>`.
