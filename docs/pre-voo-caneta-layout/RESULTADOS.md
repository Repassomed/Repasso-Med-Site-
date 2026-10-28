# Resultados do pré-voo — `main` `99f67b80`, 28/10/2026

> Gerado por `tools/qa/pre-voo/resumo.py` a partir dos JSON em `docs/pre-voo-caneta-layout/resultados/` e dos logs desta execução. **Nada aqui ativa nada.** Chromium/Linux, Supabase simulado, zero rede externa. «PASSA» = passou no ensaio; **não** = liberado.

## 1 · Teste 1 — as âncoras dos traços sobrevivem à troca de layout (`ancoras-estaveis.cjs`)

**54 medidas** (matéria × largura 1440/390) · **54 PASSA · 0 FALHA** · 432 estados comparados (índice geral, 3 blocos, 3 modos, volta) · 103939 sub-âncoras (soma das 27 matérias, em 1440) comparadas uma a uma, por posição.


Controle negativo (um `<p>` inserido de propósito): 3/3 medidas reprovaram — o teste **enxerga** o defeito.

## 2 · Teste 2 — ida e volta de grifos, traços e notas (`ida-e-volta.cjs`)

**54 medidas** · **54 PASSA · 0 FALHA** · 396 grifos, 322 traços e 54 notas gravados e relidos em 3 fases (controle → layout novo → volta ao controle); 0 escrita no banco nas fases de leitura.


Controle negativo: 3/3 reprovaram.

## 3 · Ensaio do layout nas matérias (`ensaio.cjs`) — «como está» × «com correção simulada»

«Como está» = módulos reais da `main` + ativador do ensaio (descritor **inferido**). «Com correção» (`--corr`) acrescenta em memória o marcador `data-rm-agrega` e C8. 390·768·1024·1440 (`--rapido` na correção: 1440 e 390).

| matéria | grupo | como está (PASSA · FALHA · BLOQ.) | com correção | falhas «como está» | falhas «com correção» |
|---|---|---|---|---|---|
| `semiologia-ii` | piloto | 247 · 0 · 1 | 131 · 0 · 1 | — | — |
| `anatomia-i` | elegível | 226 · 9 · 1 | 120 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `anatomia-patologica` | elegível | 235 · 0 · 1 | 125 · 0 · 1 | — | — |
| `anatomia-patologica-ii` | elegível | 235 · 4 · 1 | 125 · 2 · 1 | blocos/pager-cadeia (390,768,1024,1440) | blocos/pager-cadeia (390,1440) |
| `anatomia-patologica-ii-practica` | elegível | 218 · 13 · 1 | 118 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); modos/indice-flashcards (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `anatomia-patologica-practica` | elegível | 227 · 4 · 1 | 123 · 0 · 1 | modos/indice-flashcards (390,768,1024,1440) | — |
| `anestesiologia` | elegível | 231 · 4 · 1 | 125 · 0 · 1 | modos/indice-flashcards (390,768,1024,1440) | — |
| `biologia` | elegível | 226 · 9 · 1 | 120 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `dermatologia` | elegível | 222 · 13 · 1 | 120 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); modos/indice-flashcards (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `embriologia` | elegível | 218 · 17 · 1 | 120 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); modos/indice-preguntas (390,768,1024,1440); modos/indice-flashcards (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `farmacologia` | elegível | 235 · 0 · 1 | 125 · 0 · 1 | — | — |
| `farmacologia-ii` | elegível | 202 · 17 · 1 | 112 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); modos/indice-preguntas (390,768,1024,1440); modos/indice-flashcards (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `fisiopatologia` | elegível | 235 · 0 · 1 | 125 · 0 · 1 | — | — |
| `fisiopatologia-ii` | elegível | 226 · 13 · 1 | 122 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); modos/indice-flashcards (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `guarani` | elegível | 235 · 4 · 1 | 127 · 0 · 1 | modos/indice-flashcards (390,768,1024,1440) | — |
| `histologia-i` | elegível | 218 · 17 · 1 | 120 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); modos/indice-preguntas (390,768,1024,1440); modos/indice-flashcards (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `histologia-i-practica` | elegível | 226 · 9 · 1 | 120 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `histologia-ii` | elegível | 239 · 0 · 1 | 127 · 0 · 1 | — | — |
| `histologia-ii-practica` | elegível | 218 · 13 · 1 | 118 · 5 · 1 | blocos/abre-so-o-bloco (390,768,1024,1440); blocos/nao-vazio (390,768,1024,1440); modos/indice-flashcards (390,768,1024,1440); integridade/detach-limpo (1440) | blocos/abre-so-o-bloco (390,1440); blocos/nao-vazio (390,1440); integridade/detach-limpo (1440) |
| `medicina-familiar` | elegível | 219 · 0 · 1 | 117 · 0 · 1 | — | — |
| `medicina-legal` | elegível | 239 · 0 · 1 | 127 · 0 · 1 | — | — |
| `neurologia` | elegível | 231 · 4 · 1 | 125 · 0 · 1 | modos/indice-flashcards (390,768,1024,1440) | — |
| `oftalmologia` | elegível | 231 · 4 · 1 | 125 · 0 · 1 | modos/indice-flashcards (390,768,1024,1440) | — |
| `ortopedia` | elegível | 239 · 0 · 1 | 127 · 0 · 1 | — | — |
| `semiologia` | elegível | 247 · 0 · 1 | 131 · 0 · 1 | — | — |
| `toxicologia` | elegível | 235 · 4 · 1 | 127 · 0 · 1 | modos/indice-flashcards (390,768,1024,1440) | — |
| `imagenologia` | fora | 239 · 0 · 1 | 127 · 0 · 1 | — | — |

### 3b · O que fecha os bloqueios B1 e B2 (simulação em memória, `RM_ENSAIO_INIT=tools/qa/pre-voo/sim-c9.js`)

As 11 matérias que falhavam «com correção» (10 com placeholder oculto + Anatopatologia II com `ap2biblio` sem título), ensaiadas de novo com os placeholders fora da lista de blocos e um título em `ap2biblio`: **1367 PASSA · 0 FALHA** (1440 e 390). Prova que B1+B2 são **as únicas** causas.

| `anatomia-i` 125·0 | `anatomia-patologica-ii-practica` 123·0 | `anatomia-patologica-ii` 127·0 | `biologia` 125·0 | `dermatologia` 125·0 | `embriologia` 125·0 | `farmacologia-ii` 117·0 | `fisiopatologia-ii` 127·0 | `histologia-i-practica` 125·0 | `histologia-i` 125·0 | `histologia-ii-practica` 123·0 |

## 4 · Uso: caneta (CDP), palma, rolagem, pinça, goma, grifo, troca de bloco/modo, recarregar (`interacao.cjs --rapido`)

| matéria | grupo | PASSA | FALHA | BLOQ. | falhas |
|---|---|--:|--:|--:|---|
| `semiologia-ii` | piloto | 46 | 0 | 0 | — |
| `anatomia-i` | elegível | 46 | 0 | 0 | — |
| `anatomia-patologica` | elegível | 46 | 0 | 0 | — |
| `anatomia-patologica-ii` | elegível | 46 | 0 | 0 | — |
| `anatomia-patologica-ii-practica` | elegível | 46 | 0 | 0 | — |
| `anatomia-patologica-practica` | elegível | 46 | 0 | 0 | — |
| `anestesiologia` | elegível | 46 | 0 | 0 | — |
| `biologia` | elegível | 46 | 0 | 0 | — |
| `dermatologia` | elegível | 46 | 0 | 0 | — |
| `embriologia` | elegível | 46 | 0 | 0 | — |
| `farmacologia` | elegível | 46 | 0 | 0 | — |
| `farmacologia-ii` | elegível | 46 | 0 | 0 | — |
| `fisiopatologia` | elegível | 46 | 0 | 0 | — |
| `fisiopatologia-ii` | elegível | 46 | 0 | 0 | — |
| `guarani` | elegível | 46 | 0 | 0 | — |
| `histologia-i` | elegível | 46 | 0 | 0 | — |
| `histologia-i-practica` | elegível | 46 | 0 | 0 | — |
| `histologia-ii` | elegível | 46 | 0 | 0 | — |
| `histologia-ii-practica` | elegível | 46 | 0 | 0 | — |
| `medicina-familiar` | elegível | 46 | 0 | 0 | — |
| `medicina-legal` | elegível | 46 | 0 | 0 | — |
| `neurologia` | elegível | 46 | 0 | 0 | — |
| `oftalmologia` | elegível | 46 | 0 | 0 | — |
| `ortopedia` | elegível | 46 | 0 | 0 | — |
| `semiologia` | elegível | 46 | 0 | 0 | — |
| `toxicologia` | elegível | 46 | 0 | 0 | — |
| `imagenologia` | fora | 46 | 0 | 0 | — |

## 5 · Marcadores `data-rm-agrega` que cada matéria precisa declarar (passo P1, editorial)

Derivados **por conteúdo** (seção cujas questões/cartões já existem nas seções de bloco). Hoje **nenhum** arquivo de matéria os traz. O código reconhece sozinho as seções cujo **id** casa com `/banco|flashcards/i`; as demais (**obrigatórias** na coluna da direita) só são reconhecidas se declararem `data-rm-agrega`.

| matéria | agregadoras (id · questões · cartões) | **precisam** do marcador (id não casa) |
|---|---|---|
| `anatomia-patologica` | `banco-oficiales-anato (359 q · 0 fc)`, `flashcards-anato (0 q · 135 fc)` | — |
| `anatomia-patologica-practica` | `b11 (0 q · 95 fc)`, `b12 (0 q · 85 fc)` | `b11`, `b12` |
| `fisiopatologia` | `flashcards-fisio (0 q · 130 fc)` | — |
| `imagenologia` | `flashcards-imagen (0 q · 49 fc)` | — |
| `semiologia` | `flashcards-semio (0 q · 96 fc)` | — |
| `farmacologia` | — | — |
| `medicina-familiar` | — | — |
| `semiologia-ii` | — | — |
| `farmacologia-ii` | `f2b15 (214 q · 0 fc)`, `f2b16 (0 q · 584 fc)` | `f2b15`, `f2b16` |
| `embriologia` | `emb14 (107 q · 0 fc)`, `emb15 (0 q · 149 fc)` | `emb14`, `emb15` |
| `biologia` | `bancobio (160 q · 0 fc)`, `bio-flashcards (0 q · 205 fc)` | — |
| `histologia-i` | `histo13 (150 q · 0 fc)`, `histo14 (0 q · 198 fc)` | `histo13`, `histo14` |
| `histologia-i-practica` | `bancolam (106 q · 0 fc)`, `bancofc (0 q · 80 fc)`, `bancoruleta (0 q · 80 fc)` | — |
| `histologia-ii-practica` | `h2pbanco (289 q · 0 fc)`, `h2pmazo (0 q · 822 fc)` | `h2pmazo` |
| `histologia-ii` | `bancoh2 (226 q · 0 fc)`, `bancofch2 (0 q · 604 fc)` | — |
| `anatomia-i` | `bancoa1 (459 q · 0 fc)`, `bancofca1 (0 q · 823 fc)` | — |
| `anatomia-patologica-ii` | `bancoap2 (156 q · 0 fc)`, `bancofcap2 (0 q · 320 fc)` | — |
| `anatomia-patologica-ii-practica` | `ap2pbanco (112 q · 0 fc)`, `ap2pmazo (0 q · 310 fc)` | `ap2pmazo` |
| `medicina-legal` | `bancomedleg (235 q · 0 fc)`, `bancofcmedleg (0 q · 748 fc)` | — |
| `fisiopatologia-ii` | `bancofp2 (364 q · 0 fc)`, `revisaofp2 (0 q · 1364 fc)` | `revisaofp2` |
| `toxicologia` | `bancotox (349 q · 0 fc)`, `toxcierre (0 q · 944 fc)` | `toxcierre` |
| `dermatologia` | `dermcierre (0 q · 188 fc)` | `dermcierre` |
| `guarani` | `bancognrl (209 q · 0 fc)`, `mazognrl (0 q · 298 fc)` | `mazognrl` |
| `ortopedia` | `bancoorto (457 q · 0 fc)`, `bancofcorto (0 q · 864 fc)` | — |
| `oftalmologia` | `bancooft (139 q · 0 fc)`, `oftcierre (0 q · 534 fc)` | `oftcierre` |
| `neurologia` | `banconeu (179 q · 0 fc)`, `revisaoneu (0 q · 335 fc)` | `revisaoneu` |
| `anestesiologia` | `bancoane (177 q · 0 fc)`, `anecierre (0 q · 232 fc)` | `anecierre` |

**17 seções** em 13 matérias precisam do marcador antes de a matéria entrar na lista.

### 5b · Prontidão hoje de cada matéria (o que a porta diria agora)

| matéria | grupo | teste 1 | teste 2 | uso | marcador no HTML | layout «com correção» | **porta hoje** |
|---|---|---|---|---|---|---|---|
| `semiologia-ii` | piloto | PASSA | PASSA | PASSA | ok | PASSA | **piloto (já ativo)** |
| `anatomia-i` | elegível | PASSA | PASSA | PASSA | ok | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: layout (B1/B2)** |
| `anatomia-patologica` | elegível | PASSA | PASSA | PASSA | ok | PASSA | **ABERTA** |
| `anatomia-patologica-ii` | elegível | PASSA | PASSA | PASSA | ok | FALHA pager-cadeia | **fechada: layout (B1/B2)** |
| `anatomia-patologica-ii-practica` | elegível | PASSA | PASSA | PASSA | falta `ap2pmazo` | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: marcador + layout (B1/B2)** |
| `anatomia-patologica-practica` | elegível | PASSA | PASSA | PASSA | falta `b11`, `b12` | PASSA | **fechada: marcador** |
| `anestesiologia` | elegível | PASSA | PASSA | PASSA | falta `anecierre` | PASSA | **fechada: marcador** |
| `biologia` | elegível | PASSA | PASSA | PASSA | ok | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: layout (B1/B2)** |
| `dermatologia` | elegível | PASSA | PASSA | PASSA | falta `dermcierre` | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: marcador + layout (B1/B2)** |
| `embriologia` | elegível | PASSA | PASSA | PASSA | falta `emb14`, `emb15` | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: marcador + layout (B1/B2)** |
| `farmacologia` | elegível | PASSA | PASSA | PASSA | ok | PASSA | **ABERTA** |
| `farmacologia-ii` | elegível | PASSA | PASSA | PASSA | falta `f2b15`, `f2b16` | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: marcador + layout (B1/B2)** |
| `fisiopatologia` | elegível | PASSA | PASSA | PASSA | ok | PASSA | **ABERTA** |
| `fisiopatologia-ii` | elegível | PASSA | PASSA | PASSA | falta `revisaofp2` | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: marcador + layout (B1/B2)** |
| `guarani` | elegível | PASSA | PASSA | PASSA | falta `mazognrl` | PASSA | **fechada: marcador** |
| `histologia-i` | elegível | PASSA | PASSA | PASSA | falta `histo13`, `histo14` | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: marcador + layout (B1/B2)** |
| `histologia-i-practica` | elegível | PASSA | PASSA | PASSA | ok | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: layout (B1/B2)** |
| `histologia-ii` | elegível | PASSA | PASSA | PASSA | ok | PASSA | **ABERTA** |
| `histologia-ii-practica` | elegível | PASSA | PASSA | PASSA | falta `h2pmazo` | FALHA abre-so-o-bloco, detach-limpo, nao-vazio | **fechada: marcador + layout (B1/B2)** |
| `medicina-familiar` | elegível | PASSA | PASSA | PASSA | ok | PASSA | **ABERTA** |
| `medicina-legal` | elegível | PASSA | PASSA | PASSA | ok | PASSA | **ABERTA** |
| `neurologia` | elegível | PASSA | PASSA | PASSA | falta `revisaoneu` | PASSA | **fechada: marcador** |
| `oftalmologia` | elegível | PASSA | PASSA | PASSA | falta `oftcierre` | PASSA | **fechada: marcador** |
| `ortopedia` | elegível | PASSA | PASSA | PASSA | ok | PASSA | **ABERTA** |
| `semiologia` | elegível | PASSA | PASSA | PASSA | ok | PASSA | **ABERTA** |
| `toxicologia` | elegível | PASSA | PASSA | PASSA | falta `toxcierre` | PASSA | **fechada: marcador** |
| `imagenologia` | fora | PASSA | PASSA | PASSA | ok | PASSA | **fora do escopo** |

**8 das 25 elegíveis já estariam com a porta aberta hoje** (faltando, para todas, a Etapa 0 de código, o descritor aprovado e o roteiro físico).

## 6 · Linha de base das suítes do piloto (`rodar-base.sh`)

```
pilot-flags          saída=0  10/10 verificações OK
layout               saída=0  535 verificações OK · 0 falhas
sistema              saída=0  124/124 verificações OK
nav-sistema          saída=0  216 verificações OK · 0 falhas
cover                saída=0  cover: 198/198 verificações OK
soltos               saída=0  16 verificações OK · 0 falhas
race                 saída=0  race: 140/140 verificações OK
ink-jump             saída=0  ink-jump: 54/54 verificações OK
caneta-novo-layout saída=1 caneta-novo-layout: 90/91 verificações OK — 1 FALHAS
caneta-456 saída=1 caneta-456: 136/138 verificações OK — 2 FALHAS
caneta-ipad-456 saída=0 caneta-ipad-456: 197/197 verificações OK
FIM
```

## 8 · A porta em ação (`porta-da-materia.sh`, exemplos reais)

```
$ sh tools/qa/pre-voo/porta-da-materia.sh medicina-familiar
PASSA  0-inventario-em-dia
PASSA  0b-marcadores-no-html
PASSA  1-ancoras-estaveis
PASSA  2-ida-e-volta
PASSA  3-layout-4-larguras
PASSA  4-uso-caneta-modos
PASSA  5-inventario-risco
---
PORTA ABERTA para medicina-familiar (isto NÃO liga nada: falta o roteiro físico de 3 min e a ordem de José)

$ sh tools/qa/pre-voo/porta-da-materia.sh dermatologia
PASSA  0-inventario-em-dia
FALHA  0b-marcadores-no-html  (veja /tmp/porta-dermatologia-0b-marcadores-no-html.log)
PASSA  1-ancoras-estaveis
PASSA  2-ida-e-volta
FALHA  3-layout-4-larguras  (ensaio dermatologia 390 768 1024 1440 → 236 verificações · 9 FALHA · 155s)
PASSA  4-uso-caneta-modos
PASSA  5-inventario-risco
---
PORTA FECHADA para dermatologia
```

## 7 · Diagnósticos pontuais (`tools/qa/pre-voo/diagnosticos/`)

```
biologia (como está) {"secoes":19,"vazias_ocultas":["bio00"],"cartoes":19,"primeiro_cartao":"00"}
biologia (sem placeholders) {"secoes":18,"vazias_ocultas":[],"cartoes":18,"primeiro_cartao":"01🔬 Introducción a la Biología celular5 preguntas"}
dermatologia (como está) {"secoes":15,"vazias_ocultas":["dermportada"],"cartoes":15,"primeiro_cartao":"00"}
dermatologia (sem placeholders) {"secoes":14,"vazias_ocultas":[],"cartoes":14,"primeiro_cartao":"01🧱 Bloque 01 · La piel por dentro12 preguntas30 "}
dermatologia controle 300 ms {"fy":0.353,"alturaPx":140,"imgsPendentes":56}
dermatologia controle 900 ms {"fy":0.353,"alturaPx":140,"imgsPendentes":56}
dermatologia controle 2000 ms {"fy":0.353,"alturaPx":140,"imgsPendentes":56}
dermatologia controle 5000 ms {"fy":0.353,"alturaPx":140,"imgsPendentes":56}
após reposicionar() {"fy":0.3,"alturaPx":140,"imgsPendentes":56}
dermatologia nav 300 ms {"fy":0.3,"alturaPx":164,"imgsPendentes":55}
dermatologia nav 900 ms {"fy":0.3,"alturaPx":164,"imgsPendentes":55}
dermatologia nav 2000 ms {"fy":0.3,"alturaPx":164,"imgsPendentes":55}
dermatologia nav 5000 ms {"fy":0.3,"alturaPx":164,"imgsPendentes":55}
após reposicionar() {"fy":0.3,"alturaPx":164,"imgsPendentes":55}
{"scrollWidth":407,"clientWidth":390,"innerWidth":407,"svgForaDaViewport":[{"a":"s2-b04>75","right":407}]}
com esses svg escondidos: {"scrollWidth":390,"innerWidth":390}
âncora s2-b04>75 → { tag: 'TABLE', larguraPx: 560, contenedorRolavel: true }
```

- `secoes-vazias`: com o placeholder `hidden` o 1.º cartão do índice é «00» (sem título); sem ele, o índice sai limpo (B1).
- `tinta-primeira-pintura`: no controle atual a tinta nasce ~7 px fora (0,353 em vez de 0,30 da altura de 140 px) e fica assim até `reposicionar()`; com o layout novo nasce alinhada (R5).
- `tinta-em-tabela-larga`: o traço sobre uma `<table>` de 560 px em rolagem própria leva `scrollWidth` a 407 (>390); sem esse `svg`, 390 (R14).

