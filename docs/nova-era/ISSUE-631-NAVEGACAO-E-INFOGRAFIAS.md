# Issue #631 · navegar com a caixa de ferramentas aberta + modo Infografías

Nada é ligado nem liberado por esta entrega. As mudanças valem onde a Nova Era já está ligada: Semiología II (piloto) e, quando José ligar a prévia, Medicina Familiar (só administrador).

## 1 · Caixa de ferramentas × navegação
**Defeito (medido):** com a goma, ou com o lápis no piloto, a V2 suprimia TODO clique dentro da matéria, inclusive nos botões do Layout V2. O 1.º toque em Próximo/Anterior/Índice/cartão/modo não fazia nada; só o 2.º funcionava, depois de desarmar. Com o marcador, ou só com a caixa aberta, a navegação rodava mas a caixa/ferramenta ficavam; no celular, fechar a caixa no `pointerdown` mexia no layout e o botão fugia debaixo do dedo. Cartões do índice expansível encerravam o clique antes de qualquer fechamento.

**Correção (`rm-tools-v2.js`, 4 pontos, mesma definição de «controle de navegação»):** botão/link/aba dentro da UI derivada (`[data-rm-ui]`), exceto o botão que abre a caixa, o player de áudio, o lightbox e a própria caixa/notas/diagnóstico.
1. Clique num controle: fecha a caixa e desarma a ferramenta ANTES de qualquer outro tratador (`window`/captura, registrado primeiro) e deixa a ação seguir no mesmo toque. Nada é suprimido.
2. `pointerdown` num controle: nunca começa traço, grifo nem «contato de caneta» (não cria marca por engano na interface).
3. Toque de stylus (adaptador de Touch Events, iPad) num controle: não é cancelado, para o clique chegar.
4. «Clicar fora minimiza» não fecha no `pointerdown` quando o alvo é um controle (fecha no clique, junto com a ação).
Desarmar usa o caminho já existente (`escolherFerramenta('none')`): não apaga traço nem grifo, não grava nada. Tocar no CONTEÚDO com lápis/goma armados continua suprimindo clique e mantendo a caixa (comportamento aprovado), e tocar fora sem pedir navegação não muda.

## 2 · Infografías: uma regra, usada por todos
**Defeito:** Medicina Familiar tem 21 `div.med-image.mf-info` com `.med-image-caption`; o detector do modo (`rm-modes.js`) e a navegação (`rm-materia-nav.js`) só viam `figure`, e a regra do cartão excluía `.med-image`. Resultado: nem cartão nem modo.

**Correção:** `RMModes.ehInfografia / infografias` (em `rm-modes.js`) é a ÚNICA definição; `rm-layout.js` (cartão da capa, contagem, cartão do bloco), `rm-materia-nav.js` (nós isolados, contagens, ida/volta) e `rm-materia-sistema.js` (contagens do sistema visual) a usam. Conta: `<figure>` com legenda e imagem; `.med-image` com imagem + `.med-image-caption` marcada como infografia (classe `mf-info`/`rm-info` ou etiqueta que começa com «Infografía»). NÃO conta: diapositivas (`.material-slide`, etiqueta «DIAPOSITIVA…»), imagens de prova («IMAGEM DA PROVA»), radiografias com legenda em `<p>`, figura sem legenda, foto solta (`.s2-photo`/`img.rmc-photo` fora de `<figure>`), contêiner sem imagem, duplicata aninhada. Serve às próximas matérias: basta marcar a infografia no HTML com `mf-info`/`rm-info` ou a etiqueta «Infografía».

**Efeito medido nas 30 matérias reais:** só Medicina Familiar muda (de 0 para 21 infografias, em 8 blocos: 4·2·2·3·3·3·1·3). As outras 29 ficam IDÊNTICAS bloco a bloco (nenhuma ganha, nenhuma perde). O conteúdo (HTML) não foi tocado.

## 3 · Testes (todos feitos pelo Claude; nada pedido a José)
| Teste | Resultado |
|---|---|
| `navegar-ferramentas` (MF + Semiología II × 1440/768/390 × mouse, toque, caneta × lápis, goma, marcador, só caixa × próximo, anterior, índice, cartão, modo; mais traço recém-escrito e conteúdo) | **356/356** |
| `infografias-regra` (17 casos sintéticos + 30 matérias reais) | **48/48** |
| `infografias-modo` (MF + Semiología II × 3 larguras: cartão, modo, contagens, isolamento por bloco, ida/volta, voltar, ver bloco completo, conteúdo idêntico) | **123/123** |
| `visual-conteudo` Medicina Familiar | 26/26 |
| `medfam-caneta` (layout + tema + caneta, 1440/768/390) | 30/30 |
| `navegador` (gates, prévia, troca de conta, dados) | 247/247 |
| `servidor` · `nao-ativacao` · `gate-por-materia` · `medfam-implantacao` · `pilot-flags` | 59 · 18 · 48 · 87 · 22 |
| Semiología II: `layout` · `sistema` · `nav-sistema` · `cover` · `soltos` · `race` · `ink-jump` · `caneta-ipad-456` | 535 · 124 · 216 · 198 · 16 · 140 · 54 · 197 |
| `caneta-novo-layout` · `caneta-456` | 87/91 · 136/138 (IDÊNTICAS na `main` pura, medidas na mesma máquina: post-it acima de 1,6 px e «aluno comum» do caneta-456; sem falha nova) |

Capturas: `docs/nova-era/capturas-631/` (cartão, índice do modo e bloco, MF e Semiología II, 1440/768/390).

## 4 · Limites
Emulação no Chromium (mouse, toque e caneta por CDP). Safari/iPadOS e Apple Pencil reais não são provados por automação; o adaptador de stylus do iPad foi apenas poupado de cancelar o toque em controles (e coberto pelas suítes antigas de iPad). O rótulo do chip por bloco continua «Figuras» (texto antigo de Semiología II; a ação leva ao modo Infografías) — não mexi no texto do aluno.
