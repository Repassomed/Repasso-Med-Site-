# Capturas do player do audiobook no tema (piloto Semiología II)
Geradas por `tools/qa/browser-qa/layout/capturas-player.cjs` (Chromium/Playwright; matéria REAL + shell real + caneta V2 real + tema + **motor de áudio REAL**,
mp3 gerado com ffmpeg; só o servidor — gate, manifesto, URL assinada, mídia — é simulado). Emulação de toque nas telas < 900 px, **não aparelho real**.
Fontes (Fraunces, Literata, JetBrains Mono, Plus Jakarta Sans) baixadas à parte só para a captura.

- `antes-depois_*.webp` — esquerda **ANTES** (HEAD `f26bdd0`: tema ligado, player antigo — barra branca de 135 px; 1109×135 em 1440 px) × direita **DEPOIS** (HEAD final).
  Mesmo script, mesmos passos, áudio tocando. Desktop 1440 e 1545×665 (card na lateral) · celular 390 e 320 (tabela, toolbox aberta, caneta armada sobre o post-it, fim da página) · tablet 768.
- `depois/` — todos os estados do estado final, por tela (`<tela>_<NN>-<estado>.webp`): `01-tocando` · `02-pausa` · `03-tabla` · `04-postit` · `05-toolbox-aberta` ·
  `06-caneta-armada-postit` · `07-caneta-armada-tabla` · `08-auscultacion` · `09-fim-da-pagina` · `10-ampliado` (só celular: card completo com seek/velocidade).
  Telas: celular 320×640 · celular 390×844 · tablet 768×1024 · desktop 1440×900 · desktop 1545×665.
- `depois_<tela>_resumo.webp` — folha-resumo com todos os estados de uma tela.

Como ler: «tocando» e «pausa» mostram o card/barra com título, estado e controles; «tabla» e «postit» são rolagens reais com o player aberto (nada fixo cobre o conteúdo entre a faixa
e o topo do player); «toolbox-aberta» e «caneta-armada» mostram o dock/chip convivendo com a barra; «fim-da-pagina» é o fim REAL da página (a última folha termina acima do player).
