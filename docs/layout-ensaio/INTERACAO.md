# Matriz de interação · 25 elegíveis + piloto + Imagenología (referência) × 390 / 768 / 1024 / 1440 · #457/#459

> **Nada foi ativado.** Flags, contas liberadas, `PILOT_SLUGS`, slug do piloto e publicação continuam como na `main`. O ensaio roda num servidor local com os arquivos REAIS da `main` e aplica, **em memória**, os patches da integração proposta (A1/A2/A7 + C1–C8, ver `PATCHES-PARA-INTEGRACAO.md`). Supabase e manifesto de áudio são **simulados**; zero rede externa.

Esta bateria (`tools/qa/ensaio-layout/interacao.cjs`) complementa a `MATRIZ.md` (layout, índice, modos, contagens): aqui se mede o **uso** — escrever, apoiar a palma, rolar, dar zoom, apagar, desfazer, grifar, trocar de bloco/modo, recarregar, responder questão, abrir flashcards e a presença/ausência de audiobook.

Legenda: ✅ todas as verificações da área passaram nas larguras medidas · ❌ N = N verificações falharam · 🟨 N = N verificações não puderam ser medidas neste ambiente (ver «Bloqueios») · n/a = a matéria não tem o recurso (p.ex. sem tabela larga).

## 0 · Já funciona no site × passou só com correções simuladas

**Tudo nesta matriz roda com as correções simuladas** (A1/A2/A7 + C1–C8 na memória do servidor de teste). Por isso «PASSA» aqui **não** quer dizer que funciona no site.

| Grupo | Matérias | No site hoje | Nesta bateria |
|---|---|---|---|
| Piloto | Semiología II | **já funciona no site** (contas liberadas); a caneta `456e` foi aprovada por José no iPad (#456) | PASSA |
| **Elegíveis** | 25 | **não funciona no site** (layout novo só roda no piloto; motor da caneta física só liga no piloto) | **passou com correções simuladas: 25 / 25** · falha: 0 |
| Fora | Imagenología | fora | fora da integração por decisão de José (12/10); continua medida só como referência · referência: PASSA |
| Fora | Bioestadística | fora | arquivo sem rota no catálogo (#213 encerrada sem merge): não é matéria ativa, não é ensaiada |

## 1 · Resumo (27 do catálogo)

| PASSA | PASSA com bloqueio declarado | FALHA | Sem dados |
|--:|--:|--:|--:|
| 27 | 0 | 0 | 0 |

| Área | Matérias ✅ | ❌ | 🟨 | n/a |
|---|--:|--:|--:|--:|
| Ativa | 27 | 0 | 0 | 0 |
| Audiobook | 27 | 0 | 0 | 0 |
| Caneta | 27 | 0 | 0 | 0 |
| Palma | 27 | 0 | 0 | 0 |
| Rolagem | 27 | 0 | 0 | 0 |
| Pinça/zoom | 27 | 0 | 0 | 0 |
| Goma | 27 | 0 | 0 | 0 |
| Grifo | 27 | 0 | 0 | 0 |
| Troca bloco/modo | 27 | 0 | 0 | 0 |
| Recarregar | 27 | 0 | 0 | 0 |
| Questões | 27 | 0 | 0 | 0 |
| Flashcards | 27 | 0 | 0 | 0 |

Tabela larga com rolagem própria (dedo rola a tabela com o lápis armado): medida em 19 matérias, 45 verificações (só nas larguras em que a tabela é mais larga que o contêiner); nas demais não há tabela assim. Total de verificações de interação: 2529.

## 2 · Matriz por matéria

| Matéria | Grupo | Veredito (simulado) | Ativa | Audiobook | Caneta | Palma | Rolagem | Pinça/zoom | Goma | Grifo | Troca bloco/modo | Recarregar | Questões | Flashcards | Verificações |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|--:|
| Anatopatologia I (`anatomia-patologica`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 92 |
| Anatopatologia Práctica (`anatomia-patologica-practica`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 92 |
| Fisiopatologia I (`fisiopatologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 92 |
| Imagenología (`imagenologia`) | ⛔ fora | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 92 |
| Semiología I (`semiologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 92 |
| Farmacología I (`farmacologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 92 |
| Medicina Familiar (`medicina-familiar`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 92 |
| Semiología II (`semiologia-ii`) | ✅ piloto (já no site) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 93 |
| Farmacología II (`farmacologia-ii`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96 |
| Embriología (`embriologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 94 |
| Biología (`biologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 93 |
| Histología I (`histologia-i`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 94 |
| Histología I Práctica (`histologia-i-practica`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 94 |
| Histología II Práctica (`histologia-ii-practica`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 94 |
| Histología II (`histologia-ii`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 93 |
| Anatomía I (`anatomia-i`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96 |
| Anatopatologia II (`anatomia-patologica-ii`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 93 |
| Anatopatologia II Práctica (`anatomia-patologica-ii-practica`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96 |
| Medicina Legal (`medicina-legal`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 92 |
| Fisiopatologia II (`fisiopatologia-ii`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96 |
| Toxicología (`toxicologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 94 |
| Dermatología (`dermatologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 93 |
| Guaraní (`guarani`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 93 |
| Ortopedia y Traumatología (`ortopedia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96 |
| Oftalmología (`oftalmologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 93 |
| Neurología (`neurologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96 |
| Anestesiología (`anestesiologia`) | 🧪 elegível (só simulado) | PASSA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96 |

## 3 · Falhas reproduzíveis

Nenhuma falha na rodada final. (As falhas encontradas durante o ensaio e o que foi feito com cada uma estão em `PENDENCIAS-ENSAIO-GLOBAL.md` §0-B.)

## 4 · Bloqueios (não mensurável neste ambiente)

Nenhum.


## 5 · Controle negativo: a bateria reprova a versão que José reprovou

Mesma bateria, mesmos arquivos, mas com os `assets/` servidos da `main` `ebc53dcd` (build `456c`, reprovado no iPad): `RM_ENSAIO_REF=ebc53dcd node tools/qa/ensaio-layout/interacao.cjs anatomia-patologica semiologia-ii --rapido`. Resultado versionado em `interacao-controle-456c/`.

| Matéria | Largura | Verificação | Medido |
|---|--:|---|---|
| anatomia-patologica | 1024 | `borracha/dedo-nao-apaga` | {"nG0":3,"nG1":1} |
| anatomia-patologica | 1024 | `rolagem/dedo-rola-com-goma` | {"y4":331,"y5":331} |
| anatomia-patologica | 1024 | `borracha/ponta-apaga` | {"alvoG":{"x":124.92112731933594,"y":351.8636474609375,"w":160.0559844970703,"h":14.0042724609375,"id":"c9a316e3-a5ff-43 |
| anatomia-patologica | 390 | `borracha/dedo-nao-apaga` | {"nG0":3,"nG1":1} |
| anatomia-patologica | 390 | `rolagem/dedo-rola-com-goma` | {"y4":711,"y5":711} |
| anatomia-patologica | 390 | `borracha/ponta-apaga` | {"alvoG":{"x":36.01219940185547,"y":395.8332824707031,"w":159.99020385742188,"h":13.99041748046875,"id":"ab1cb595-1067-4 |
| semiologia-ii | 1024 | `borracha/dedo-nao-apaga` | {"nG0":3,"nG1":1} |
| semiologia-ii | 1024 | `rolagem/dedo-rola-com-goma` | {"y4":1461,"y5":1461} |
| semiologia-ii | 1024 | `borracha/ponta-apaga` | {"alvoG":{"x":124.92112731933594,"y":335.30364990234375,"w":160.0559844970703,"h":14.010833740234375,"id":"71566a35-4a8e |
| semiologia-ii | 390 | `borracha/dedo-nao-apaga` | {"nG0":3,"nG1":1} |
| semiologia-ii | 390 | `rolagem/dedo-rola-com-goma` | {"y4":2231,"y5":2231} |
| semiologia-ii | 390 | `borracha/ponta-apaga` | {"alvoG":{"x":36.01219940185547,"y":307.35272216796875,"w":159.99020385742188,"h":13.993377685546875,"id":"45139921-a3ba |

`borracha/ponta-apaga` falha em cascata: o dedo já tinha apagado o traço-alvo, e a sequência para aí (a bateria interrompe a largura em vez de seguir com estado errado).

São exatamente os sintomas do vídeo de José (o dedo apagava traços com a goma armada e a goma travava a rolagem). Com a `main` atual (`456e`, aprovada) as mesmas verificações passam. Isso mostra que a bateria **distingue** a versão ruim da boa — não prova sozinha o aparelho físico (§6).

**Sem a correção C8** (`RM_ENSAIO_SEM=C8`, versionado em `interacao-controle-sem-c8/`): a tinta escrita dentro de um cartão com `:hover { transform }` fica fora do lugar quando o cartão desce.

| Matéria | Largura | Verificação | Medido |
|---|--:|---|---|
| imagenologia | 1440 | `pinca/traco-antigo-preso` | {"anc0":{"dx":0,"dy":-3,"dw":0,"disp":"block"},"anc1":{"dx":0,"dy":2.9,"dw":0,"disp":"block"},"reconv":{"antes":{"dx":0,"dy":2.9,"dw":0,"disp":"block"},"depois1 |

## 6 · O que o teste sintético comprova × o que só o aparelho físico prova

| Tema | O ensaio comprova (Chromium, eventos CDP confiáveis) | Exige aparelho físico (iPad + Apple Pencil, Safari) |
|---|---|---|
| Caneta | o motor da caneta aprovado no piloto liga em cada matéria (guarda, adaptador), escreve com a tinta sob a ponta (desvio ≤ 6 px) e ancora o traço ao parágrafo certo, nas 4 larguras | latência real ponta→tinta, pressão, `touchType: stylus` do WebKit, Scribble do iPadOS, perda real de `pointerup` |
| Palma | palma (toque de raio grande) apoiada e arrastada no meio do traço não corta o traço nem rola a página | rejeição de palma do próprio iPadOS, palma que encosta antes da ponta, mão inteira apoiada por muito tempo |
| Rolagem | com lápis ou goma armados e a caneta fora da tela, o dedo rola a página; tabela larga rola na horizontal | inércia/«rubber band» do Safari, rolagem com a barra de endereço recolhendo, rolagem longa em matéria muito grande |
| Pinça/zoom | pinça de dois dedos dá zoom com o lápis armado; escrever ampliado põe a tinta sob a ponta; o traço antigo fica preso ao parágrafo | zoom nativo do Safari (duplo toque, limites de escala), zoom + rolagem simultâneos |
| Goma | dedo não apaga; ponta apaga e grava; Deshacer devolve | borracha da ponta traseira (Pencil sem botão), duplo toque no Pencil 2 |
| Grifo | arrastar com o marcador grifa e grava | seleção com o dedo/lupa do iPadOS, menu de contexto nativo |
| Troca bloco/modo | traço some fora do bloco e volta no lugar, sem duplicar, em bloco → outro → índice → Preguntas → bloco | trocar com a caixa de ferramentas aberta durante a escrita, multitarefa (Split View/Slide Over), voltar da tela inicial |
| Recarregar | traços e grifos voltam iguais e presos ao parágrafo (persistência SIMULADA em sessionStorage) | gravação real no Supabase (RLS, rede lenta/offline, duas abas, dois aparelhos) |
| Questões / Flashcards | responder alternativa marca a correta; questão aberta mostra a resposta; «Jugar» abre o mazo, tocar gira, Esc fecha | toque rápido com a caneta armada sobre a alternativa, teclado virtual |
| Audiobook | o `rm-audio-boot.js` REAL só cria cards onde o manifesto (SIMULADO) tem item (Semiología II: 2 blocos) e, fora do piloto, fecha no portão da aba sem pedir manifesto | manifesto e URL assinada reais do Netlify/Supabase, reprodução, tela bloqueada/fundo, fones |

**Conclusão honesta:** o ensaio prova que a caneta aprovada no piloto **convive** com o layout e o conteúdo real de cada matéria no Chromium. Não substitui um teste físico por matéria; recomenda-se repetir o roteiro físico de ≤ 3 min (`docs/caneta-ipad-456/PASSO-FINAL-JOSE.md`) **em cada matéria liberada**, uma por vez.

Gerado de 27 resultados em `docs/layout-ensaio/interacao/` (não versionados; `interacao.cjs` os regenera) → evidência compacta em `interacao-compacto.json`.
