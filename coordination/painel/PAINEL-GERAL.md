# Painel geral por matéria

**Atualizado:** 17/11/2026 (noite) · Claude 1 (único Claude disponível). **Main de referência:** `6bdeea5e` — já com #660, #663, #664, #645, #668 e #670 mescladas por José. **Nada aqui ativa matéria.**

## Como ler (o que foi e o que não foi verificado)

- **Nova Era – código:** conferido na `main` `9d3124fb` e nas PRs abertas (lista de candidatas lida direto do `rm-pilot.js`: 16 slugs — semiologia-ii, medicina-familiar, fisiopatologia, farmacologia, biologia, embriologia, anatomia-patologica-practica, histologia-i, histologia-i-practica, histologia-ii, histologia-ii-practica, fisiopatologia-ii, toxicologia, anestesiologia, ortopedia, oftalmologia).
- **Ativação:** lida por SELECT somente leitura da tabela `rm_materia_rollout` em 17/11: **existe 1 linha — `medicina-familiar` em `preview` (layout, caneta e visual), atualizada em 02/11.** Linha ausente = desligada. **Nenhuma outra matéria tem linha, logo nenhuma está ligada para alunos.** Mesclar uma PR **não** liga a matéria; este painel não afirma que alguma matéria apareça para o José. As variáveis de Netlify (2.ª fechadura) **não foram lidas**: não confirmado.
- **Manutenção/pendências:** vêm do `CHECKLIST-MATERIAS.md` e dos relatos das PRs; **não foram reabertas matéria por matéria nesta rodada**.
- **Marcações (grifos/notas/traços):** só aparecem quando um relatório de PR registrou contagem por SELECT; nos demais casos, «não verificado nesta rodada».

## PRs (17/11, noite) e ordem segura

**Já mescladas por José:** #664 (Ortopedia e Oftalmología), #645 (Fisiopatología II, layout), #668 (AP II questões) e #670 (painel). Antes: #660 (Toxicología) e #663 (Anestesiología). **As PRs de layout/caneta #634, #644, #655, #657, #662 e #658 estão com o Claude 4 e não foram tocadas depois da atualização de 17/11.**

| PR | matéria(s) | situação | ordem |
|---|---|---|---|
| #634 (rascunho) | Anatomía I, AP I | aberta; atualizada sobre a main; css-temas 64/64 | 1.º |
| #644 | Farmacología II (layout) | aberta; atualizada | 2.º |
| #655 | Dermatología | aberta; atualizada; controles do `nao-ativacao` e do `medfam-implantacao` corrigidos | 3.º |
| #657 | AP II (layout) | aberta; não toca o HTML de AP II | 4.º |
| #662 (rascunho) | AP II Práctica | aberta; falha da caneta em tabela era do alvo do teste, `real-ap2p` 109/109 | 5.º |
| #658 | Guaraní | aberta | 6.º |
| #668 | AP II teoría (questões #666) | **MESCLADA** (17/11 18:46) | — |
| #669 | Neurología (blocos 20–27, #667) | aberta; **em auditoria do coordenador — branch congelada**; estático 238/238, navegador 36/36, porta ABERTA | independente |
| #670 | este painel (versão anterior) | **MESCLADA** (17/11 18:46) | — |
| #673 | Farmacología II · slides novos de endócrino (17/11) | aberta; 1 parágrafo (dose de levotiroxina); 403/406 grifos = main; quiz real 0 falhas | independente |
| #649 | Farmacología II (conteúdo, slides #647) | aberta desde 10/11; **reconfirmada 17/11 noite**: merge limpo com a main atual; quiz real 464 itens 0 falhas; porta ABERTA; 403/406 grifos = main; **literatura-base não encontrada** (bloqueio de conferência bibliográfica) | independente |
| #652 | Semiología II (conteúdo, slides #647) | aberta desde 10/11; **reconfirmada 17/11 noite**: merge limpo; estático 24/24, navegador 24/24, porta ABERTA; 150/152 grifos = main; sem Argente/Harrison | independente |
| #539, #520 | configuração MCP e auditoria antiga (ChatGPT) | abertas desde outubro; **não tocadas nem avaliadas aqui** | fora desta fila |

Depois de cada merge da fila 1→6, a PR seguinte conflita nas mesmas linhas de união (`rm-pilot.js`, `index.html`, testes de pré-voo); quem estiver com a fila atualiza sobre a main (receita em `docs/nova-era-temas/ORDEM-DE-MERGE-NOVA-ERA.md`). Bateria completa da integração das PRs restantes sobre a main de hoje: **todos os `real-*` verdes** (ver comentários das PRs) e `gate`, `caneta-por-materia`, `medfam-implantacao` 87/87.

A ordem é a da integração `claude/int-nova-era-fila` (todas as PRs juntas: temas carregam; css-temas verde). Só 4 arquivos conflitam por PR (listas de união).

## Uma linha por matéria

Nova Era — **mesclada** = tema/vinhetas na `main`, **não ativada** (só `medicina-familiar` tem linha de ativação); **em PR**; **não preparada**.

| matéria | manutenção / pendências | slides e anotações | Nova Era | marcações e testes |
|---|---|---|---|---|
| Anatomía Patológica I | G0 ✅ (#494); voz de prova ⬜ 4 | retroalimentação de prova ✅ | **em PR #634** | não verificado nesta rodada |
| AP I Práctica | G0 ✅; voz ⬜ 12 | anotações vazias | **mesclada** | real-ap1p-histo1 233/233 (integração) |
| Fisiopatología I | G0 ✅; voz ⬜ 1 | vazio | **mesclada** (legado) | pré-voo ok |
| Semiología I | G0 ✅ | vazio | **não preparada** | — |
| Farmacología I | G0 ✅; voz ⬜ 5 | vazio | **mesclada** (legado) | real-fisio1-farmaco1 230/230 |
| Medicina Familiar | G0 ✅; voz ⬜ 10 | vazio | **mesclada; `preview` (só admin) desde 02/11** — única com linha de ativação | medfam-implantacao 87/87 |
| Semiología II | G0 ✅; #652 aberta e reconfirmada (b07/b08/b09); b06 com 3 propostas e perguntas novas pendentes por causa de grifos; Argente/Harrison ausentes do Drive | 9 slides lidos na #652; pasta `Anotaçoes ` com 3 PDFs, todos rastreados (#532/#603/#604) | **mesclada** (legado); não ativada | SELECT 17/11: grifos s2-b01 93, s2-b02 14, s2-b03 4, s2-b06 20, banco 17, guia 4; traços 24+1+1; notas 0. Motor real: 150/152 pintados = main (0 perdidos). #652: estático 24/24, navegador 24/24, porta ABERTA |
| Farmacología II | #649 aberta e reconfirmada (tabela de corticoides, precisões b01); **#673**: slides de endócrino de 17/11 comparados com f2b10/f2b11 (1 lacuna: dose de levotiroxina); literatura-base ⬜ (não está no Drive) | 9 PDFs, todos rastreados (o de 28/10 fechado na #608) | **em PR #644** (layout); não ativada | SELECT 17/11: grifos f2b01 85, f2b02 68, f2b04 17, f2b05 63, f2b06 1, f2b07 7, f2b08 111, f2b09 43, f2b14 2, f2b15 9; 1 traço; notas 0. Motor real: 403/406 pintados = main. Quiz real 464 itens 0 falhas; porta ABERTA |
| Embriología | G0 ✅; voz ⬜ 8 | vazio | **mesclada** | real-embriologia 133/133 |
| Histología I | G0 ✅; voz ⬜ 4 | vazio | **mesclada** | real-histologias 363/363 |
| Histología I Práctica | G0 ✅; alt de 136 imagens ⬜ | vazio | **mesclada** | idem |
| Histología II | G0 ✅; voz ⬜ 22; vídeo e PDF de 718 MB sem comparar | pendente | **mesclada** | idem |
| Histología II Práctica | G0 ✅ | vazio | **mesclada** | idem |
| Anatomía I | G0 ✅; voz ⬜ 7 | vazio | **em PR #634** | não verificado |
| Biología | G0 ✅ (#496, #524) | vazio | **mesclada** | real-biologia 118/118 |
| Medicina Legal | G0 ✅; voz ⬜ 13 | vazio | **não preparada** | — |
| Anatomía Patológica II | G0 ✅; questões da issue #666 **mescladas (#668)**: +3; p-ANCA e gestação pendentes; cifras do CHC marcadas como aproximadas; 3 pendências das anotações | 6 PDFs, sem arquivo novo (17/11) | **em PR #657** (layout) | SELECT 17/11: grifos ap2b01 291, ap2b02 1, ap2b03 74, ap2b04 53, ap2b07 1, ap2intro 2, bancoap2 268; traços 0; notas 0. Motor real: 689/690 pintados = main |
| AP II Práctica | G0 ✅; figuras/questões em auditoria | vazio | **em PR #662** (rascunho) | real-ap2p: ver nota |
| Fisiopatología II | G0 em #481 (histórico) | 5 PDFs, todos rastreados (suprarrenal na #603) | **mesclada** (#645, 17/11); **não ativada** | real-fisio2 109/109 (integração) |
| Toxicología | G0 ✅ | vazio | **mesclada** (#660) | real-toxicologia 121/121 |
| Dermatología | #505 (bloco 06 sem fonte legível) | vazio | **em PR #655** | real-dermatologia (bateria) |
| Guaraní | G0 ✅; voz ⬜ 13 | vazio | **em PR #658** | real-guarani (bateria) |
| Ortopedia | G0 ✅; voz ⬜ 24 | sem conteúdo | **mesclada** (#664); **não ativada** | real-orto-oft 242/242 |
| Oftalmología | G0 ✅ (#464); teste físico pendente | aporte de teste | **mesclada** (#664); **não ativada** | idem |
| Neurología | G0 ✅; voz ⬜ 7; **PR #669 (em auditoria, branch congelada)**: 8 blocos novos (20–27) com os slides de 17/11; figuras dos slides 9, 10, 14, 15, 16 lidas; sem livro-base; tabela de «estado» de consciência do slide 15 pendente | 16 slides no Drive (1–8 já nos blocos 01–18; **9–16 novos, em #669**) | **não preparada** | SELECT 17/11: grifos neub02 10, neub03 29, neub09 68; 1 traço na portada; notas 0. #669: estático 238/238, navegador 36/36, porta ABERTA |
| Anestesiología | G0 ✅; voz ⬜ 18 | vazio | **mesclada** (#663) | real-anestesiologia 121/121 |
| Imagenología / Bioestadística | **fora desta etapa** | — | fora | — |

**Drive 17/11:** listagem direta das 4 pastas = 23 PDFs (9+5+6+3), **os mesmos já registrados em `ANOTACOES-DRIVE.md`; nenhum arquivo novo**. Reli os PDFs de 28/10 (Farmacología II) e suprarrenal só para confirmar o registro; as decisões continuam as das PRs #608 e #603.

## Pendências de Anatomía Patológica II (conferidas em 17/11 contra os documentos do repositório)

Fontes: `coordination/source-packs/anatomia-patologica-ii-auditoria-2026-10-10-v1.md` (seção FECHAMENTO), `…-646-clase7-hepaticas-v1.md` (partes C–E), `…-666-questoes-p2-v1.md` (PR #668) e `ANOTACOES-DRIVE.md`.

| Pendência | Estado em 17/11 | Onde está registrada |
|---|---|---|
| **Granulomas no Crohn:** slide 5 dá «40–60 %» no texto e «~35 %» na tabela; o site mantém 40–60 % | **aberta** (decisão de José; os dois números aparecem no mesmo slide) | auditoria 10/10, FECHAMENTO |
| **Pergunta de p-ANCA na colite ulcerosa** | **aberta**: não consta nos slides; Robbins ilegível; pergunta **não publicada** (#651, mantido na #668). O ensino e o flashcard de serologia (p-ANCA «más asociado, no confirma») seguem na main | #646 parte E; #668 |
| **Gestação como fator de adenoma hepático** | **aberta**: o slide só cita anticoncepcionais e esteroides anabolizantes (#668) | #668 |
| **Cifras do CHC** (β-catenina ≈ 40 %, p53 ≈ 60 %) e a frase «cirrosis… no es lesión premaligna» do slide | **ressalvadas** na #668 (apresentadas como aproximadas; frase absoluta retirada); **sem confirmação em livro-base** | #668 |
| **Literatura-base** (Robbins 9.ª/10.ª, Farreras, Harsh Mohan) | **aberta**: Robbins e Harsh Mohan não cabem na leitura do Drive (> 10 MB); Farreras e Harrison não estão no Drive. Pedido a José: subir capítulos em PDF < 10 MB | #646 parte C |
| Slides oficiais 4, 5, 7 e 8 ilegíveis (auditoria de 10/10) | **resolvida** para a Clase 7 (hepáticas, relida na #646); os demais constam como fechados no FECHAMENTO da auditoria | auditoria 10/10; #646 |
| Virchow/Krukenberg com peso didático; metástase a distância do CEC oral; MALT 40 %/Russell | **resolvidas** (#499, #609) | `ANOTACOES-DRIVE.md` |
| Frases «voz de prova» sob grifos reais (b01, b03, b04) | **protegidas** de propósito (migração de marcações planejada) | `CHECKLIST-MATERIAS.md` |
| Um grifo de `ap2b01` («eritematosa») que **não pinta** | **aberta**, anterior a #668 (já não pintava na main); explicada na #668 | #668 |

Estado atualizado em 17/11 à noite (inclui #668 e #669). Testes citados = últimos resultados registrados nas PRs/integração; os da bateria de 17/11 estão no relatório final.
