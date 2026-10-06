# Capturas do sistema visual (piloto Semiología II)
Geradas por `tools/qa/browser-qa/layout/capturas-sistema.cjs` (Chromium/Playwright, matéria REAL + shell real; gate do piloto simulado com `layout+visual`).
Desktop 1440×900 · tablet 768×1024 · celular 390×844. Emulação, não aparelho. Fontes (Fraunces, Literata, JetBrains Mono, Plus Jakarta Sans)
baixadas à parte só para a captura. A caixa «Marcador/Goma» flutuante é a toolbox existente (não faz parte do sistema visual).

- `antes/` — abertura (início) como estava no HEAD d637ee5 (cabeçalho global + abas + faixa com 2 logos, ≈ 176 px).
- `antes-depois_desktop-1440.webp` · `antes-depois_celular-390.webp` — antes × depois da entrada compacta (≈ 138 px, 1 logo; a faixa mostra a marca só quando gruda).
- `antes-depois-sair/` — celular 390 e 320: o botão flutuante verde «Sair» cobria tabela, post-it e controles da caneta (ANTES, HEAD d72b750); agora o mesmo controle fica na faixa fixa (DEPOIS). Todas as capturas `celular-390_*` e `celular-320_*` são do estado final.
- `antes-depois-caneta/` — celular 390 e 320. Caso 1: a maleta flutuante cobria a tabela com a caneta FECHADA. Caso 2: o trilho vertical da caneta cobria o texto do post-it/tabela com a caneta ABERTA. DEPOIS: o controle vai para a faixa fixa e a toolbox abre como barra horizontal embaixo, com espaço reservado. ANTES = HEAD 1a419a8, DEPOIS = HEAD final, mesmo script.
