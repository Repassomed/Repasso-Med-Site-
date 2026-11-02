# Nova Era · Fisiopatología I e Farmacología I · implantação privada (sem ativar alunos)

**Data:** 02/11/2026 · **Base:** `main` `259049b7` (já inclui a PR #627, Medicina Familiar, **mesclada**) · **Autora:** Claude 2 · **Branch:** `claude/nova-era-fisio1-farmaco1-2026-11`
**O que foi feito:** as duas matérias foram ligadas ao carregador real da Nova Era (`CANDIDATAS` + `TEMAS` inline + CSS), com 29 vinhetas recortadas de imagens do próprio conteúdo. Nenhum texto médico, id, imagem de conteúdo ou dado de aluno foi alterado. Nenhum SQL executado; nada ativado: sem linha em `rm_materia_rollout` as matérias abrem como hoje.

## 0 · Resumo
| | Estado |
|---|---|
| Ligação | **real**: `rm-pilot.js` (CANDIDATAS) → `get-pilot-flags` (função real) → layout → tema (`TEMAS` inline) → navegação → índice → caneta V2 |
| Testes | `real-fisio1-farmaco1.test.cjs` **122/122**; `integracao-fisio1-farmaco1.test.cjs` **271/271** (sem simulação do carregador); `temas-fisio1-farmaco1.test.cjs` **111/111**; `visual-conteudo` **30/30** e **44/44**; `servidor` 59/59; `navegador` 247/247 |
| Depende de outros | **#631** (Claude 4, caixa de ferramentas/infográficos): sincronizar com a main quando entrar; **SQL do José** depois do merge (`docs/nova-era/ROTEIRO-FISIO1-FARMACO1.md`) |

### A.1 Estrutura real (inventário em dia; `agrega-no-html.py` OK)
| | Fisiopatología I (`fisiopatologia`) | Farmacología I (`farmacologia`) |
|---|---|---|
| Seções com id | 14 | 21 |
| Perguntas / cartões | 332 itens (211 únicos); banco `prova-fisio` 170 / 260 | 191 itens; banco `prova-farmaco` 64 / 412 |
| Imagens · SVG · tabelas | 39 (34 webp, 5 png/jpg; 0 sem alt) · 15 · 35 | 72 (52 webp, 20 png/jpg; 0 sem alt) · 0 · 31 |
| Vídeo | nenhum | 23 iframes do YouTube em 17 cartões · 37 `details` de quiz |
| Âncoras / ids | 2974 / 146 | 1684 / 151 |
| Última edição do conteúdo | 24/10 (`06849e05`) | 24/10 (`4f3ba674`) |

### A.2 Dados de alunos (SELECT somente leitura, refeito em 02/11/2026)
| Matéria | Grifos (alunos) | Traços | Notas |
|---|---|---|---|
| `fisiopatologia` | 33 (1 aluno): `introduccion-fisio` 30 · `inflamacion` 2 · `hemorragia` 1 | 0 | 0 |
| `farmacologia` | 26 (2 contas): `pd` 15 · `sna` 6 · `pk` 5 | 0 | 0 |
Sem traços nem notas: nenhum risco de índice de âncora (`seção>N`). Nenhum texto de conteúdo foi alterado nesta branch; os grifos ancoram por trecho e permanecem válidos.

### A.3 Classificação das seções (pela função real; decisões já tomadas)
| Matéria | Classificação |
|---|---|
| Fisiopatología I | 12 blocos numerados 01–12 na ordem do conteúdo; `prova-fisio` = banco (B); `flashcards-fisio` = cartões (F). **Unidades como estão no conteúdo:** 11 blocos «UNIDAD I» e `anemias` «UNIDAD II», nomes «Unidad I» e «Unidad II» (sem nome novo). |
| Farmacología I | 17 blocos com a **numeração dos títulos** (01–17), incluindo as 3 seções «BASE» (SNA e receptores: ensino de base numerado ⇒ bloco); `farmacos-clave` = tabla de repaso (T); `cuestionario1` = práctica (P); banco (B); cartões (F). **Sem unidades** (o conteúdo não tem): nenhuma criada; o CSS da matéria oculta só os rótulos «UNIDAD ·» que o módulo geraria. |

### A.4 Arte (imagens existentes, sem tocar no conteúdo)
29 vinhetas 480×480 webp (`assets/img/fisio/vig/` 12, `assets/img/farmaco/vig/` 17), recortadas da 1.ª infografía de cada bloco (bloco 04 de Fisio I: `fisio-002.jpg`, o esquema da cicatrização). Cada recorte foi escolhido sobre a imagem inteira com grade de coordenadas e conferido em folha de contato; os que traziam texto foram refeitos. Três medalhões de capa por matéria reutilizam vinhetas. Proveniência (arquivo de origem e coordenadas): `docs/nova-era-temas/PROVENIENCIA-IMAGENS-FISIO1-FARMACO1.md`. Nenhuma imagem de conteúdo foi retirada ou modificada (`git status`: só arquivos novos). Limitação: fragmentos de legenda nas bordas de 5 vinhetas (ilegíveis a 124 px).

### A.5 Testes e o que cada um prova
| Teste | O que prova | Resultado |
|---|---|---|
| `tools/qa/nova-era/real-fisio1-farmaco1.test.cjs` | **ligação real** (função `get-pilot-flags` real + `rm-pilot.js` real; só Supabase e rede simulados). Servidor: off ⇒ nada; preview ⇒ só administrador; all ⇒ só aluno com acesso; sem acesso ⇒ nada. Em 1440/768/390: layout + tema + caneta ligados; navegação (bloco, próximo, índice, atalhos de modo); **questões** (V/F, alternativa, «Ver respuesta»); **flashcards** (▶ Jugar abre dentro da tela); **infográficos** (0 quebradas, 0 passam da largura, clique amplia e restaura); **grifos** iguais com o layout novo; **caneta** (parágrafo e tabela: 1 traço, 0 pontos perdidos, desvio ≤ 1,6 px, 1 gravação; dedo não desenha; desfazer; recarregar mantém a âncora); 0 erro JS | 122/122 |
| `integracao-fisio1-farmaco1.test.cjs` | fluxo completo em 6 larguras (320–1440): caneta em parágrafo e tabela com âncora estável, vídeos (23 iframes de Farmaco I), grifos, telas pesadas; inclui checagem de que `CANDIDATAS`/`TEMAS` estão no código e de que não há segunda fonte | 271/271 |
| `temas-fisio1-farmaco1.test.cjs` | cada seção com tipo/número/capítulo pela função real (14 e 21 seções, 0 «otro»), unidades, vinhetas e medalhões carregam, texto/ids/contagens idênticos com o tema ligado e depois de desligar, **sem número repetido nos títulos** (índice e menu), âncoras só em `[data-rm-ui]` (critério real, com controle negativo) | 111/111 |
| `visual-conteudo.test.cjs <slug>` | nenhum elemento didático visível sem o tema fica escondido com ele | 30/30 · 44/44 |
| `servidor` · `navegador` (Nova Era) | regressão do mecanismo (estágios, contas, volta) | 59/59 · 247/247 |
| `nao-ativacao.test.cjs` | CANDIDATAS esperadas atualizadas para as 4 matérias; nada de variável de ambiente ou curinga | ver §A.6 |
| Porta do pré-voo (`porta-da-materia.sh`) | inventário, marcadores, âncoras, ida e volta, layout em 4 larguras, caneta e modos | ver §A.6 |
Limite: Chromium com `pointerType:'pen'` (CDP), não Safari/Apple Pencil; YouTube bloqueado no teste (o iframe existe e tem dimensão).

### A.6 Resultados finais (preenchido ao fim da bateria)
- Porta do pré-voo (`porta-da-materia.sh`): **ABERTA 7/7** em `fisiopatologia` e em `farmacologia` (inventário, marcadores, âncoras estáveis, ida e volta, layout em 4 larguras, caneta e modos, risco).
- `nao-ativacao.test.cjs`: **20/20** (CANDIDATAS = piloto + Medicina Familiar + estas duas; as três candidatas só perguntam ao servidor e recebem «não»; nenhuma variável de matéria, nenhum curinga). Ajuste do teste: as duas novas candidatas entram na mesma regra de Medicina Familiar.
- Guard: ver comentário da PR.

### A.7 Autoauditoria (CLAUDE.md §9)
| Ponto | Resultado |
|---|---|
| Escopo | dentro: 2 funções de classificação + 2 `TEMAS` + CSS no sistema, 1 linha em `curto()` (nav), `CANDIDATAS`/`VER`/tag, 29 vinhetas novas, testes e docs. Nenhum HTML de matéria, nenhum SQL, nenhum `rm-layout/modes/tools-v2/get-pilot-flags` |
| Conteúdo médico | não alterado: textos, ids, contagens (332/260/39/35 e 191/412/72/31), 23 iframes e 37 `details` idênticos com o tema ligado e depois de desligar |
| Dados de alunos | SELECT (02/11): Fisio I 33 grifos (1 aluno), Farmaco I 26 (2 contas), 0 traços, 0 notas; nada escrito; os grifos continuam nos mesmos spans |
| Imagens | vinhetas = recortes de imagens existentes (`PROVENIENCIA-IMAGENS-FISIO1-FARMACO1.md`); nenhuma imagem de conteúdo tocada; 0 quebradas |
| Ativação | nenhuma: sem linha na tabela, `off`; SQL só no roteiro (não executado) |
| Teste honesto | assertiva que sempre passava (`uiTags === 0 \|\| true`) substituída por critério real com controle negativo; a simulação do carregador foi removida |
| Atribuição | corrigida: Claude 1 = `charming-maxwell`; Claude 4 = `modest-rubin`; #627 já mesclada |
| Limites | sem Safari/Apple Pencil; conferência visual final no iPad é de José (roteiro de 3 min) |

## B · Dependências
Ver `docs/nova-era-temas/FISIO1-FARMACO1-COMBINADO-COM-CLAUDE-4.md` (arquivos globais tocados, #631, `VER`) e `docs/nova-era/ROTEIRO-FISIO1-FARMACO1.md` (SQL do José, não executado).
