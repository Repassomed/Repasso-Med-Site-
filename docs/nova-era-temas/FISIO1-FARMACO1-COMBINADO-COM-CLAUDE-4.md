# Fisiopatología I e Farmacología I · o que combinar com o Claude 4 (arquivos globais)

**Data:** 02/11/2026 · **Autora:** Claude 2 · Não foi editado nenhum arquivo global. Este documento é o pedido exato; o canal (comentário na PR dele ou mensagem do José) é o que estiver aberto no dia.

## 1 · Quem é quem (correção) e a convenção adotada
- **Claude 4** (base da Nova Era: carregador `rm-pilot.js`, módulo do tema, tabela `rm_materia_rollout`): branches `claude/modest-rubin-th2yir-*` (ex.: `…-medfam-completa`, WIP de 02/11 02:50, não mesclada).
- **Claude 1** (auditor): branches `claude/charming-maxwell-ah7nxj-*`. A branch `claude/charming-maxwell-ah7nxj-nova-era-ap1practica-histologia1` (temas de AP I Práctica e Histología I, 02/11) **é do Claude 1, não do Claude 4**. *(A versão anterior deste documento a atribuía ao Claude 4: erro corrigido.)*
- **Claude 2** (esta branch): Fisiopatología I e Farmacología I.

**Convenção de arquivos:** o Claude 1 usa `assets/temas/rm-tema-<slug>.js` + `.css` com o descritor em `window.RM_TEMAS[slug]` (e `RMSistema.registrarTema` se o sistema já existe); adotei **o mesmo padrão** para não haver dois formatos: `assets/temas/rm-tema-fisiopatologia.*`, `assets/temas/rm-tema-farmacologia.*`, vinhetas em `assets/img/fisio/vig/` e `assets/img/farmaco/vig/`. O CSS usa `html.rm-sis[data-rm-tema="<slug>"][data-rm-tema]`.

**O que o Claude 4 faz de diferente (WIP `medfam-completa`, lido em 02/11):** o tema de Medicina Familiar entra **dentro** de `rm-materia-sistema.js` (`TEMAS['medicina-familiar']` + `clasificarMF`) e um bloco de variáveis em `rm-materia-sistema.css`; aceita `vigDir: null`, `sub` e `miga` no descritor e marca `data-rm-sin-meds` quando não há medalhões; o documento `PROXIMAS-MATERIAS-EM-GRUPOS.md` põe **Fisiopatología I + Farmacología I como o grupo G1** (PR de preparação do grupo = código do tema + `CANDIDATAS` + testes + capturas) e prevê parametrizar por slug `navegador.test`, `medfam-caneta` e `capturas`. **Não existe ainda um carregador de arquivos de tema.** Por isso a integração tem duas formas equivalentes, a escolher por ele:
  - **(a) carregador:** `rm-pilot.js` carrega `assets/temas/rm-tema-<slug>.css/.js` antes de `RMSistema.attach` (é o que `integracao-fisio1-farmaco1.test.cjs` simula em memória);
  - **(b) inline:** copiar os dois descritores para `TEMAS` (o `clasificar` e os mapas são autocontidos; o CSS passa para `rm-materia-sistema.css`). Os dois descritores já seguem a mesma interface (`vigDir`, `logo`, `unidades`, `medallones`, `recursos`, `clasificar`).

## 2 · Ligações que só ele pode fazer (arquivos globais dele)
1. **`assets/rm-pilot.js`** (forma (a)): em `ligarSistema()`, antes de `RMSistema.attach(tab, slug)`, carregar `assets/temas/rm-tema-<slug>.css` e `.js` (falha fechada: sem eles o módulo lança «sin tema» e o layout fica) e, se `RM_TEMAS[slug]` existir e `TEMAS[slug]` não, chamar `RMSistema.registrarTema(slug, RM_TEMAS[slug])`. Incluir `'fisiopatologia'` e `'farmacologia'` em `CANDIDATAS`; subir `VER` e a tag do `index.html`.
2. **Banco (`rm_materia_rollout`)**: linhas das duas matérias, tudo `off` (SQL do José; não executado aqui).
3. **Correção dos números duplicados de Farmacología I** (`assets/rm-materia-sistema.js`/`rm-materia-nav.js`): os títulos do conteúdo já começam com o número («01 · Farmacocinética»); o módulo mostra o número também na etiqueta, então ele aparece duas vezes (etiqueta «01» + título «01 · …»; migalha «BLOQUE 10 · 10 · …»). Mudança mínima sugerida em `curto(t)` (e onde a migalha usa o título): remover o prefixo `^\d{1,2}\s*[·.\-–]\s*` quando for igual ao número da etiqueta (`s.c.n`). Não altera o conteúdo (só o texto da UI derivada).
4. **Rótulo de grupo sem unidade** (opcional, melhora para todas as matérias sem «UNIDAD X»): quando nenhum bloco tem unidade, `indice()` e a lateral deveriam omitir o rótulo «UNIDAD ·». Hoje Farmacología I o oculta por CSS próprio (`rm-tema-farmacologia.css`); se ele corrigir no módulo, o CSS fica inofensivo.

## 3 · O que já está pronto e testado do meu lado
Ver `coordination/source-packs/nova-era-fisiopatologia-farmacologia-i-preparo-v1.md` §A (teste isolado 121/121).

## 4 · Quando a base estiver pronta
Rodo a bateria completa (porta, layout, navegação, caneta, vídeos, grifos, telas pequenas, tablet e computador), faço a autoauditoria e abro a PR completa com Cartão de Merge. Nada é ativado.
