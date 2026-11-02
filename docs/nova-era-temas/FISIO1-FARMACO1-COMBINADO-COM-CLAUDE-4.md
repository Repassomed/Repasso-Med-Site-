# Fisiopatología I e Farmacología I · o que combinar com o Claude 4 (arquivos globais)

**Data:** 02/11/2026 · **Autora:** Claude 2 · Não foi editado nenhum arquivo global. Este documento é o pedido exato; o canal (comentário na PR dele ou mensagem do José) é o que estiver aberto no dia.

## 1 · Convenção adotada (alinhada ao que ele já faz)
A branch `claude/charming-maxwell-ah7nxj-nova-era-ap1practica-histologia1` (Claude 4) usa `assets/temas/rm-tema-<slug>.js` + `.css` e deixa o descritor em `window.RM_TEMAS[slug]` para «o carregador da base» (e chama `RMSistema.registrarTema` se o sistema já existe). **Fisiopatología I e Farmacología I seguem exatamente o mesmo padrão**:
- `assets/temas/rm-tema-fisiopatologia.js` / `.css`
- `assets/temas/rm-tema-farmacologia.js` / `.css`
- vinhetas em `assets/img/fisio/vig/` e `assets/img/farmaco/vig/`.
O CSS usa `html.rm-sis[data-rm-tema="<slug>"][data-rm-tema]` (vence o bloco-base em qualquer ordem de carga).

## 2 · Ligações que só ele pode fazer (arquivos globais dele)
1. **`assets/rm-pilot.js`**: em `carregarSistema()`/`ligarSistema()`, antes de `RMSistema.attach(tab, slug)`, carregar `assets/temas/rm-tema-<slug>.css` e `.js` (falha fechada: sem eles o módulo lança «sin tema» e o layout fica) e, se `RM_TEMAS[slug]` existir e `TEMAS[slug]` não, chamar `RMSistema.registrarTema(slug, RM_TEMAS[slug])`. Incluir `'fisiopatologia'` e `'farmacologia'` em `CANDIDATAS`; subir `VER` e a tag do `index.html`.
2. **Banco (`rm_materia_rollout`)**: linhas das duas matérias, tudo `off` (SQL do José; não executado aqui).
3. **Correção dos números duplicados de Farmacología I** (`assets/rm-materia-sistema.js`/`rm-materia-nav.js`): os títulos do conteúdo já começam com o número («01 · Farmacocinética»); o módulo mostra o número também na etiqueta, então ele aparece duas vezes (etiqueta «01» + título «01 · …»; migalha «BLOQUE 10 · 10 · …»). Mudança mínima sugerida em `curto(t)` (e onde a migalha usa o título): remover o prefixo `^\d{1,2}\s*[·.\-–]\s*` quando for igual ao número da etiqueta (`s.c.n`). Não altera o conteúdo (só o texto da UI derivada).
4. **Rótulo de grupo sem unidade** (opcional, melhora para todas as matérias sem «UNIDAD X»): quando nenhum bloco tem unidade, `indice()` e a lateral deveriam omitir o rótulo «UNIDAD ·». Hoje Farmacología I o oculta por CSS próprio (`rm-tema-farmacologia.css`); se ele corrigir no módulo, o CSS fica inofensivo.

## 3 · O que já está pronto e testado do meu lado
Ver `coordination/source-packs/nova-era-fisiopatologia-farmacologia-i-preparo-v1.md` §A (teste isolado 121/121).

## 4 · Quando a base estiver pronta
Rodo a bateria completa (porta, layout, navegação, caneta, grifos, tablet e computador), faço a autoauditoria e abro a PR completa com Cartão de Merge. Nada é ativado.
