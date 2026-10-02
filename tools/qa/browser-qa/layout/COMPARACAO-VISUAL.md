# Comparação visual — interface REAL do piloto × referência anexada (#425, rodada 3)

**Referência analisada:** tela de tablet (iPad, paisagem) da matéria «Histologia II» do portal — faixa navy com logo, busca e loja; abas de semestre; **lateral**
com título da matéria e chevron de recolher, «Apresentação», «Planos de Estudo» e a lista de blocos em duas linhas (ícone · «Bloco N» em negrito · título), rodapé com
«Questões da Matéria» e «Materiais Complementares»; **coluna principal** com breadcrumb, título serifado grande, subtítulo em caixa-alta espaçada, texto de apresentação, citação
e arte de tecido à direita; cartão navy de apresentação com lista de recursos; **fileira de cartões de recursos** (Resumo, Aulas e Vídeos, Infográficos, Questões, Flashcards,
Mapas Mentais: ícone em bloco colorido · título · legenda · seta); «Blocos da Matéria» em cartões com imagem, número, contagens e **barra de progresso (37 %)**; atalhos «Continuar de onde parei»,
«Plano de estudo», «Resolver questões», «Materiais extras». (Não anexei a imagem de referência ao repositório; as capturas abaixo são só da interface real.)

**Interface real comparada:** `capturas/` (WebP, 320 · 390 · 561 · 600 · 700 · 720×450 · 767 · 768 · 1024 · 1440 · 1700 · 1920 · 561/700/767×520 · zoom 200 %). Emulação, não aparelho; fontes do Google não carregam no sandbox
(caem nas do sistema), então a tipografia final só se confirma em produção.

## O que já batia
| Aspecto | Referência | Piloto |
|---|---|---|
| Identidade | logo + navy · branco · laranja | logo ORIGINAL do Repasso Med, navy `#13314f`, branco, laranja `#e8772e` (faixa com filete laranja) |
| Matéria identificável | título no topo da lateral | nome «Semiología II» + subtítulo **fixos na faixa durante toda a rolagem** (medido: nome inteiro visível em todas as larguras) |
| Hierarquia da capa | título serifado ≫ subtítulo em caixa-alta | h1 serifado 2–2,9 rem ≫ subtítulo; eyebrow mono laranja; filete laranja sob o título; contraste AA medido |
| Lateral | recolhível; blocos em lista | docked 264 px (≥ 1200) · trilho de ícones (768–1199) · drawer (< 768); **minimizável** (chevron); matéria → bloco → tema; «Volver arriba» e «Sugerencias» no rodapé |
| Arte à direita do título | foto de tecido | **slot `hero` pronto e vazio** (0 px) até chegar a arte do ChatGPT (`ASSETS-CHATGPT.md`); nada improvisado |
| Cartão de apresentação navy | sim | é o hero de CONTEÚDO da matéria (intacto, abaixo da capa) |

## O que foi aproximado nesta rodada (só dentro da #425)
1. **Fileira de cartões de recursos** logo abaixo da capa — o maior vazio organizacional frente à referência. Botões reais (HTML/CSS, acessíveis, foco visível, alvo ≥ 44 px): ícone em bloco
   colorido · título · **contagem real** · seta. Só existem os cartões dos recursos que EXISTEM: Resumen · Infografías (34) · Preguntas (120) · Flashcards (172) · Auscultación (6); **sem «Videos»** (0 vídeos na Semiología II).
   Contagens derivadas do DOM, só dos blocos (o banco geral e «Todos los flashcards» repetem as mesmas entidades; contá-los dobraria o total). «Infografía» = `<figure>` com legenda e imagem — as 10 diapositivas/radiografias NÃO são infográficos.
   Cada cartão salta, na Página completa, para a primeira ocorrência (mesmo caminho com geração/cancelamento do índice). Em tela estreita viram 2 colunas compactas (a capa não vira uma pilha antes do conteúdo).
2. **Salto para flashcards corrigido** (achado desta comparação): o grid de flashcards do site é `display:none` dentro de um lançador visível; o salto mirava o grid (sem caixa) e «chegava» a `top = 0`. Agora mira o lançador (também nos chips «Flashcards» da lateral)
   e `irPara` passa a mirar o ancestral visível mais próximo de qualquer alvo sem caixa.
3. **Rolagem interna da toolbox perceptível** (sombras no topo/base do painel, só quando há mais botões) e painel com mais altura útil.

## O que NÃO foi feito, e por quê
| Elemento da referência | Decisão |
|---|---|
| Barra de **progresso** (37 %), «Meu Progresso», «Continuar de onde parei», «Plano de estudo» | **Não implementado** — regra vigente do piloto: sem progresso, percentual, streak, plano, calendário nem gamificação. Se for decisão do José reverter, vira PR própria com definição de fonte de dados |
| «Blocos da Matéria» em cartões com imagem | Não nesta PR: alongaria a capa antes do conteúdo (a lateral/drawer já navega por bloco) e exigiria imagem por bloco — **nada de imagem improvisada**; proposta de PR separada (cartões só com número · título · contagens reais, sem imagem) |
| Barra superior com busca, loja, sino e avatar; abas de semestre | Fora do escopo: é o cabeçalho do site (`index.html`, área crítica) |
| Breadcrumb «Início › 2.º Semestre › …» | Não há semestre nos dados do catálogo; inventar seria errado. Possível «Inicio › Semiología II» em PR própria |
| «Aulas e Vídeos», «Mapas Mentais» | Não existem na Semiología II ⇒ cartão ausente (recurso ausente = acesso ausente) |
| Lateral com «Apresentação / Planos de Estudo / Questões da Matéria / Materiais Complementares» | A lateral do piloto é o índice real da matéria (blocos → temas → recursos) + modos de estudo; os itens da referência não existem como conteúdo |
| Citação e texto promocional | Conteúdo editorial: decisão do José/cátedra |

## Arte (para o ChatGPT) — posição e especificação exatas
Slot `hero` da capa (`RMLayout.ASSETS.hero`): ≥ 1000 px = coluna da direita (≈ 372 × 209 px), < 1000 px = largura total acima do título (até 816 px, altura máx. 340 px); 16:9; entregar 1x 1200×675 e 2x 2400×1350 (WebP) em
`assets/img/semio2/semio2-hero-1x.webp` / `-2x.webp`; sem texto, sem logo, navy/branco/um acento laranja. Especificação completa e itens que **não** devem aparecer: [`ASSETS-CHATGPT.md`](ASSETS-CHATGPT.md).
