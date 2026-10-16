# Próxima PR de integração real — depois da #484 (preparada, NÃO publicada)

**Estado:** patch pronto e validado **localmente**; nenhum arquivo reservado foi alterado em branch publicada. A coordenação com a #484 (Claude 1) está no comentário de 13/10 na própria #484. Esta pasta só guarda o plano e o patch, para leitura e auditoria.

## Pré-condições (nesta ordem)
1. **#484 mesclada** (dona de `rm-tools-v2.js`, `rm-tools.js`, `index.html`).
2. **#487** (tema/conteúdo solto) e **#489** (áudio por matéria) mescladas. A troca de versão dos módulos tem de vir **depois** de todos os módulos que ela publica; se uma delas entrar depois, a versão sobe de novo.
3. Resposta de Claude 1 às duas perguntas do comentário (trechos do motor e ordem do bump do `index.html`).

## O que entra (código real; nada copiado da simulação)
| Item | Arquivo | O que faz | Efeito hoje |
|---|---|---|---|
| **A7** | `rm-tools-v2.js` (`slugsCaneta()` + `pilotoPermitido()`) | A lista de matérias em que valem os refinamentos da caneta física (guarda de palma, adaptador de toque, `touch-action` da goma) passa a vir do **servidor** (`RMPilot.slugsCaneta()`, que só existirá com a ativação por matéria, A5). Sem a função, com erro ou com resposta que não seja lista: `PILOT_SLUGS` = `['semiologia-ii']`. | **nenhum**: o `rm-pilot.js` não expõe `slugsCaneta` |
| **C8** | `rm-tools-v2.js` (ouvintes de reflow) | ao fim de uma transição de `transform` dentro de `#materias-container`, a tinta se reposiciona pelo mesmo `reflow` com debounce (120 ms) | piloto e quem já usa a V2: a tinta deixa de ficar ~3 px fora depois do hover nos cartões |
| **Versão** | `rm-pilot.js` (`VER`) e `index.html` (tags do `rm-pilot.js` e do `rm-tools-v2.js`) | navegadores buscam os módulos novos na hora (assets cacheiam 7 dias) | módulos novos no próximo carregamento |

O gancho do ensaio para a A7 (`PILOT_SLUGS.concat(window.__RM_ENSAIO.slug)`) **não** entra: era um atalho de teste. A A7 de produção não conhece o ensaio. No ensaio, com a A7 real, quem é simulada é só a **resposta do servidor** (`A5:SERVIDOR-SIMULADO`).

## O que NÃO entra
- **Descritores das matérias.** O descritor do piloto tem identidade editorial: nomes e cores das unidades, medalhões, microcopy. O que o ensaio usa para as outras matérias é **inferido do conteúdo** (hipótese técnica, simulada na #485). Nada disso vai para produção. A proposta por matéria, para aprovação de José, está em `../DESCRITORES-PROPOSTA.md`. Cada descritor aprovado entra numa PR própria, uma matéria por vez.
- **A5** (ativação por matéria no `rm-pilot.js` + `get-pilot-flags`): decisão de José, outra PR.
- Flags, contas, `RM_AUDIO_SLUGS`, publicação.

## Validação feita (local, Chromium)
- Commit local `4447b1aa` = head da #484 + este patch; commit local `f7c06d68` = isso + #487 + #489 (a integração completa proposta).
- Ensaio contra `f7c06d68`: **todas** as correções vêm do código (A1, A2, C1–C8, A7). Sobram simulados só a resposta do servidor A5 e o descritor de cada matéria. Resultado completo em `../PENDENCIAS-ENSAIO-GLOBAL.md` §0-E.
- **Controle negativo:** A7 real **sem** a resposta do servidor (`RM_ENSAIO_SEM=A5`) → Neurología **não** liga os refinamentos da caneta física (10 falhas esperadas em `piloto-fisico-ligado`, goma e rolagem). A A7 fica inerte fora do piloto.

## Validação que falta antes de publicar
1. Reaplicar o patch sobre a `main` depois da #484 e rodar: `caneta-novo-layout` (hoje 89/91 na `main`: 2 falhas pré-existentes de post-it, #464), `player-toolbox`, `ink-jump`, `race`, `nav-sistema`, `layout`, `pilot-flags`.
2. Ensaio das 27 contra o commit da PR.
3. **Teste físico no piloto** (`../ROTEIRO-PILOTO-FISICO.md`): a C8 muda o comportamento da tinta no piloto.

## Riscos
- **C8:** hover em cartões no desktop dispara `transitionend` com frequência. O `reflow` tem debounce, mas reposiciona toda a tinta da página. Medir no aparelho se há custo perceptível.
- **Versão:** subir antes de #487/#489 entrarem obriga a subir de novo. Subir sem a #484 conflita com as tags dela (mesma região do `index.html`).
- **A7:** nenhum hoje. Quando A5 existir, a lista do servidor passa a mandar também no piloto: uma lista vazia desliga a caneta física também na Semiología II. É de propósito (kill switch), mas precisa ficar documentado na PR da A5.

## Reversão
`git revert` do commit da PR. A A7 sem A5 já é inerte; a C8 só remove um ouvinte; a versão volta à anterior (os navegadores rebuscam os módulos).
