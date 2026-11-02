# Nova Era · Fisiopatología I e Farmacología I · desenvolvimento (branch, sem PR)

**Data:** 02/11/2026 · **Base:** `main` `7c88fbd4` · **Autora:** Claude 2 · **Branch:** `claude/nova-era-fisio1-farmaco1-2026-11`
**Regra desta rodada:** nenhum arquivo global do Claude 4 foi editado (`assets/rm-pilot.js`, `assets/rm-materia-sistema.js/.css`, `assets/rm-materia-nav.js`, `assets/rm-tools-v2.js`, `index.html`, `netlify/functions/get-pilot-flags.js`, `supabase/migrations/**`); nenhum SQL, nenhum dado de aluno escrito, nada ativado. **Não é PR** (PR completa só depois da ligação final, §B).

## 0 · Resumo em uma tabela

| | Estado |
|---|---|
| **A · Pronto e testado** (nesta branch) | descritores e CSS dos dois temas (padrão `assets/temas/rm-tema-<slug>`), 29 vinhetas e 6 medalhões recortados de imagens existentes, teste do tema 121/121, **teste do fluxo completo com ligação simulada 269/269** (caneta, vídeos, marcações, 6 larguras), proveniência das imagens, estrutura e dados de alunos mapeados |
| **B · Depende do Claude 4** | carregar os arquivos dos temas no `rm-pilot.js` (+ `CANDIDATAS`, versão), linhas em `rm_materia_rollout`, correção dos números duplicados de Farmacología I no módulo. Detalhe em `docs/nova-era-temas/FISIO1-FARMACO1-COMBINADO-COM-CLAUDE-4.md` |
| **C · Só depois de B** | repetir com a ligação REAL: porta no dia, `servidor`/`navegador` da Nova Era e os testes parametrizados por slug do Claude 4 com as duas matérias, `integracao-fisio1-farmaco1.test.cjs` sem simulação, autoauditoria final e PR completa com Cartão de Merge |

## A · O que já foi feito e testado

### A.1 Estrutura real (inventário em dia; `agrega-no-html.py` OK)
| | Fisiopatología I (`fisiopatologia`) | Farmacología I (`farmacologia`) |
|---|---|---|
| Seções com id | 14 | 21 |
| Perguntas / cartões | 332 itens (211 únicos); banco `prova-fisio` 170 / 260 | 191 itens; banco `prova-farmaco` 64 / 412 |
| Imagens · SVG · tabelas | 39 (34 webp, 5 png/jpg; 0 sem alt) · 15 · 35 | 72 (52 webp, 20 png/jpg; 0 sem alt) · 0 · 31 |
| Vídeo | nenhum | 23 iframes do YouTube em 17 cartões · 37 `details` de quiz |
| Âncoras / ids | 2974 / 146 | 1684 / 151 |
| Última edição do conteúdo | 24/10 (`06849e05`) | 24/10 (`4f3ba674`) |

### A.2 Dados de alunos (SELECT somente leitura, 02/11/2026)
| Matéria | Grifos (alunos) | Traços | Notas |
|---|---|---|---|
| `fisiopatologia` | 33 (1 aluno): `introduccion-fisio` 30 · `inflamacion` 2 · `hemorragia` 1 | 0 | 0 |
| `farmacologia` | 26 (1 aluno): `pd` 15 · `sna` 6 · `pk` 5 | 0 | 0 |
Sem traços nem notas: nenhum risco de índice de âncora (`seção>N`). Nenhum texto de conteúdo foi alterado nesta branch; os grifos ancoram por trecho e permanecem válidos.

### A.3 Classificação das seções (pela função real; decisões já tomadas)
| Matéria | Classificação |
|---|---|
| Fisiopatología I | 12 blocos numerados 01–12 na ordem do conteúdo; `prova-fisio` = banco (B); `flashcards-fisio` = cartões (F). **Unidades como estão no conteúdo:** 11 blocos «UNIDAD I» e `anemias` «UNIDAD II», nomes «Unidad I» e «Unidad II» (sem nome novo). |
| Farmacología I | 17 blocos com a **numeração dos títulos** (01–17), incluindo as 3 seções «BASE» (SNA e receptores: ensino de base numerado ⇒ bloco); `farmacos-clave` = tabla de repaso (T); `cuestionario1` = práctica (P); banco (B); cartões (F). **Sem unidades** (o conteúdo não tem): nenhuma criada; o CSS da matéria oculta só os rótulos «UNIDAD ·» que o módulo geraria. |

### A.4 Arte (imagens existentes, sem tocar no conteúdo)
29 vinhetas 480×480 webp (`assets/img/fisio/vig/` 12, `assets/img/farmaco/vig/` 17), recortadas da 1.ª infografía de cada bloco (bloco 04 de Fisio I: `fisio-002.jpg`, o esquema da cicatrização). Cada recorte foi escolhido sobre a imagem inteira com grade de coordenadas e conferido em folha de contato; os que traziam texto foram refeitos. Três medalhões de capa por matéria reutilizam vinhetas. Proveniência (arquivo de origem e coordenadas): `docs/nova-era-temas/PROVENIENCIA-IMAGENS-FISIO1-FARMACO1.md`. Nenhuma imagem de conteúdo foi retirada ou modificada (`git status`: só arquivos novos). Limitação: fragmentos de legenda nas bordas de 5 vinhetas (ilegíveis a 124 px).

### A.5 Teste isolado (`tools/qa/nova-era/temas-fisio1-farmaco1.test.cjs`) · 121/121
Monta o layout, o sistema, a navegação e o índice **reais** sobre as matérias **reais**, carregando os temas como o `rm-pilot.js` vai carregar (arquivos `assets/temas/rm-tema-<slug>`). Por matéria:
- registro aceito, segundo registro recusado, descritor em `RM_TEMAS[slug]`; **carregamento em qualquer ordem** (tema antes do sistema; CSS antes do bloco-base) com a cor própria vencendo;
- cada seção com tipo, número e capítulo esperados (14 e 21), 0 «otro»; rótulos de unidade (Fisio I: 11× «UNIDAD I» e 1× «UNIDAD II»; Farmaco I: nenhum visível);
- ids, contagens (332/260/39/35 e 191/412/72/31, 23 iframes, 37 `details`), **texto** de cada seção e índice de âncoras idênticos com o tema ligado e depois de desligar;
- **critério de âncoras corrigido** (antes havia `uiTags === 0 || true`, que sempre passava): agora todo nó âncora-like criado depois do layout tem de estar dentro de `[data-rm-ui]` (resultado real: **0 criados dentro da matéria**), com controle negativo (um `<p>` solto é apontado pelo mesmo critério);
- 12 e 17 vinhetas carregadas, cada uma com o número do seu bloco; seções de revisão com o logotipo; 3 medalhões carregados; 53 e 93 imagens, 0 quebradas; 0 respostas HTTP ≥ 400;
- 0 overflow horizontal em 390/768/1024/1440; blocos pesados abertos (`asma-epoc`, `sna`, `adrenergicos`, `colinergicos`, `anestesicos`, `opioides`, `farmacos-clave`, `cuestionario1`, bancos, cartões) em 390 e 1440 px sem elemento fora da tela;
- falha fechada sem os arquivos do tema («sin tema», layout intacto); 0 erro JS, 0 `console.error`, 0 requisição que não seja GET/HEAD.
Capturas de tela (celular e computador) foram vistas e conferidas.

### A.7 Fluxo completo com a ligação SIMULADA · `tools/qa/nova-era/integracao-fisio1-farmaco1.test.cjs` · **269/269**
Serve um `rm-pilot.js` **em memória** com só duas mudanças (o disco não é tocado): `CANDIDATAS += fisiopatologia, farmacologia` e carregar `assets/temas/rm-tema-<slug>.css/.js` antes de `RMSistema.attach` (é a «ligação do Claude 4», §B). Daí em diante é o código real: `rm-pilot` → layout V2 → tema da matéria → navegação → caneta V2, Supabase simulado, conta administradora de teste, nada de aluno real. Larguras: 320×640, 360×740, 390×844 (celulares pequenos), 768×1024 e 1024×768 (tablet), 1440×900 (computador).
| Bloco | O que foi provado (todas as larguras, as duas matérias) |
|---|---|
| A · fluxo | layout + tema da matéria + navegação + caneta V2 com refinamentos físicos ligados pelo rm-pilot; 0 erro JS; 0 resposta HTTP ≥ 400 |
| B · marcações | grifos sintéticos ancorados no **texto real** (nenhum dado de aluno no repositório): os mesmos spans, com o mesmo texto, com e sem layout/tema/navegação; a tinta semeada volta desenhada no bloco aberto |
| C · caneta | parágrafo e tabela: 1 traço novo por gesto, 0 pontos perdidos, desvio máximo 0,66–0,67 px (limite 1,6), 1 gravação; a âncora gravada aponta para o parágrafo escrito (ou a tabela que contém a linha escrita) **e resolve para o mesmo texto no layout antigo** (âncora estável); em tela de toque, dedo com a caneta armada não desenha; desfazer remove só o último traço |
| D · vídeos (Farmacología I) | os 23 iframes continuam; nos blocos `colinergicos`, `anestesicos` e `opioides` (cartões abertos) todos visíveis e dentro da largura (≥ 150 px); no modo «Videos»: 9 blocos com vídeo e, ao abrir um, 7 vídeos visíveis e 0 fora da tela; nenhum rótulo «UNIDAD ·» |
| E · telas | blocos pesados (Fisio I: `introduccion-fisio`, `asma-epoc`, `choque`, banco; Farmaco I: `sna`, `adrenergicos`, `colinergicos`, `anestesicos`, `cuestionario1`, banco): 0 overflow horizontal, 0 elemento fora da tela, 0 imagem quebrada |
**Correções feitas durante o teste (mérito do teste, não do código):** o alvo da caneta passou a ser o parágrafo direto da seção (antes podia cair num post-it); a âncora de linha de tabela é a **tabela** que a contém (assim o motor ancora); `details` dos vídeos são abertos antes de medir; e o modo «Videos» foi corrigido no CSS do tema de Farmacología I (rótulo «UNIDAD ·» também aparecia na tela de modos).
**Limite:** Chromium com CDP `pointerType:'pen'`, não Safari/Apple Pencil; YouTube bloqueado no teste (o iframe existe e tem dimensão, o vídeo não carrega).

### A.8 Confirmação sobre o teste que «sempre passava»
`temas-fisio1-farmaco1.test.cjs` já não tem a assertiva `uiTags === 0 || true` (nenhum `|| true` no arquivo). Ela foi substituída por um critério real com controle negativo (todo nó âncora-like criado pelo sistema/navegação/índice deve estar dentro de `[data-rm-ui]`; resultado real: **0 criados dentro da matéria**; um `<p>` solto é apontado pelo mesmo critério). Reexecutado nesta rodada: 121/121.

### A.6 Autoauditoria desta etapa (CLAUDE.md §9)
| Ponto | Resultado |
|---|---|
| Escopo | só arquivos novos: 2 descritores, 2 CSS, 29 vinhetas, 2 documentos, 1 teste; relatório reescrito. Nenhum global do Claude 4, nenhum HTML de matéria, nenhum SQL |
| Imagens existentes | nenhuma retirada/alterada; vinhetas são cópias recortadas; 0 imagem quebrada |
| Conteúdo/grifos | texto e ids idênticos com o tema ligado/desligado; sem alteração de texto de bloco com grifos |
| Teste honesto | assertiva que sempre passava removida e substituída por critério real com controle negativo |
| Ciência/G0 | nada de texto médico novo (só rótulos de UI: «Revisión visual por bloques», «Preguntas de práctica por bloques», «Repaso activo por bloques»; sem frases de prova) |
| Atribuição de branches | corrigida: a branch `charming-maxwell-ah7nxj-…ap1practica-histologia1` é do **Claude 1**; o Claude 4 é `modest-rubin-th2yir-*` |
| Limites | Chromium com Supabase simulado; sem Safari/Apple Pencil; a ligação real do `rm-pilot.js` é simulada (depende de B) |

## B · O que depende do Claude 4 (exatamente)
Ver `docs/nova-era-temas/FISIO1-FARMACO1-COMBINADO-COM-CLAUDE-4.md`. Resumo:
1. `assets/rm-pilot.js`: carregar `assets/temas/rm-tema-<slug>.css/.js` antes de `RMSistema.attach`, registrar `RM_TEMAS[slug]` se o sistema ainda não o tiver, incluir `fisiopatologia` e `farmacologia` em `CANDIDATAS`, subir `VER` e a tag do `index.html`.
2. `rm_materia_rollout`: duas linhas, tudo `off` (SQL do José; não executado).
3. Módulo: números duplicados de Farmacología I («01» na etiqueta + «01 · …» no título): omitir o prefixo numérico do título quando igual à etiqueta (e, opcionalmente, o rótulo «UNIDAD ·» de grupo único).
Estado medido em 02/11: `main` `7c88fbd4`, `CANDIDATAS = ['semiologia-ii','medicina-familiar']`; nenhuma PR do Claude 4 com essa ligação (a branch `modest-rubin-th2yir-medfam-completa` é WIP não mesclado e não tem carregador de temas); Medicina Familiar `off` no banco. A branch `charming-maxwell-ah7nxj-nova-era-ap1practica-histologia1` é do **Claude 1** (não do Claude 4) e usa o mesmo padrão `assets/temas/rm-tema-<slug>`.

## C · Depois da ligação (plano de testes completo)
Porta (7 etapas) refeita no dia por matéria · `servidor.test.cjs` e `navegador.test.cjs` com as duas matérias em `CANDIDATAS` (preview só admin, `all` só com acesso, `off` desliga, troca de conta) · caneta por matéria (tabela larga, imagens pesadas, iframes) e **preservação de grifos e traços** semeados com o layout e o tema (ida e volta) · layout e tema em 390/768/1024/1440 (celular, tablet, computador) · regressão das suítes da Nova Era · Guard · autoauditoria final · PR completa com Cartão de Merge e resultados reais. **Nada é ativado para alunos.**
