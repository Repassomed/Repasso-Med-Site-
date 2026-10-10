# #456 · Reprovação da caneta no iPad (build `2026-10-09·456c`) — causas, correção (build `2026-10-10·456e`), provas e limites

> Estado: 🔵 **AGUARDANDO AUDITORIA** · PR em draft · **sem merge, sem publicação** · a **#456 continua aberta**: testes sintéticos verdes **não** a encerram — o critério é o reteste físico do José (`PASSO-FINAL-JOSE.md`).
> Escopo: **só o piloto físico** (`pilotoPermitido()`: José, ou quem o servidor liberou com `pen:true`, e só em Semiología II). Fora dele nada muda (secção G do teste).

## 1 · O relato e o que o vídeo mostra
José, iPad, depois do merge da #470: **escrita falhando, zoom inconsistente e rolagem travando, inclusive sem escrever.**

O vídeo (30 s) tem o painel «Diagnóstico del lápiz» aberto. Os recortes estão em `capturas/`. O que dá para ler com segurança:

- **Build:** `build=2026-10-09·456c`, `guarda=sim`, `flags do servidor: layout=true visual=true pen=false`. A conta entra pela lista beta do código e é piloto físico (conta do piloto no código).
- **Ferramenta:** o teste começa com a **goma armada** (`tool=eraser`) e depois passa ao lápis.
- **Escrita:** os traços «Josel» nascem.
  - traço 1: `pointerdown 8 ms (fila 40)`, `1.º quadro 70 ms`;
  - traço 2: `pointerdown 4 ms (fila 23)`, `1.º quadro 56 ms`, `quadros máx 49 ms`;
  - nos dois, `fim=up` e `rolagem 0 px`.
- **`pointercancel: 3`:** uma soma única. Não dá para saber se foi a caneta, a palma ou o dedo que rolou (achado 3 do auditor).
- **`tarefas longas (≥50 ms): 0`:** o Safari não informa `longtask`, então esse zero não mediu nada (achado 4).
- **Eventos do adaptador:** `touch-adapter-start/end` da stylus (`touchType=stylus`, `cancelable=SIM`), `lostpointercapture type=touch` e, no fim, rolagem e zoom com a ferramenta já em «none».

## 2 · Revisão de referência: o «layout antigo que funcionava»
- O relato original da #456 (07/10, 11:50 −03) comparava com o layout antigo **na `main` `f6547a7c`**.
- Ali o `rm-tools-v2.js` era o blob `91e17cf1`, idêntico ao de `f07852c3` (02/10). Esse arquivo **não mudou** até o merge da #470 (`ebc53dcd`).
- «Layout antigo» = a mesma caneta **sem** `RMLayout`/`RMSistema`/`RMNav` carregados (flags `layout`/`visual` desligadas).
- Diferenças da referência para o build 456c, do lado da caneta:
  - a guarda de contacto (#470) no lugar do `touch-action` do contêiner;
  - `--rm-dock-h` só abaixo de 768 px;
  - o gate `pen`;
  - o diagnóstico.
- Do lado da página, a diferença são os módulos do layout novo.
- **«Sin guarda» não restaura o layout antigo.** Ele só troca a guarda pela regra legada de `touch-action` durante o contacto. Não descarrega o layout novo nem desfaz nenhuma outra diferença.
- **Os defeitos da goma (A1–A3) já existiam na referência.** Só ficam visíveis num roteiro que usa a goma e rola com ela armada, como o vídeo.

## 3 · Causas demonstradas (Chromium, `main` × esta PR — `dados/ipad-antes-main.txt` e o log final)
| # | Causa (arquivo) | Reprodução na `main` | Depois |
|---|---|---|---|
| 1 | **Goma trava a navegação em repouso.** `body.rm2-t-eraser #materias-container{touch-action:none}` vale durante toda a seleção da goma, sem contacto nenhum. | `touch-action=none`; dedo rola **0 px** com a goma armada nos 3 layouts (`rolagem.cjs`; A1) | `manipulation`; o dedo rola (pan + pinça) |
| 2 | **Dedo apaga por acidente.** A goma aceitava o toque como gesto de apagar. | tocar num traço com o dedo apagava (A2) | o dedo só navega; ponta e rato apagam |
| 3 | **Palma encerra o gesto da goma.** `onUpImpl`/`onCancel` chamavam `terminarApagar()` sem conferir `apagando.pid` (achado 2 do auditor). | toque de outro `pointerId` soltando ⇒ o gesto morria; 2 desfazeres para 1 gesto (A3) | só o próprio ponteiro encerra; 1 gesto = 1 desfazer |
| 4 | **Ouvintes de toque não passivos sempre ligados.** `touchstart`/`touchmove` com `passive:false` ficavam no documento desde o mount, inclusive sem ferramenta: cada toque da página espera o JS antes de rolar. | **2** ouvintes não passivos sem ferramenta (H, via CDP `DOMDebugger.getEventListeners`) | **0** sem ferramenta; 2 só com lápis/goma armados |
| 5 | **Contacto órfão prende a guarda.** Se o `pointerup` de um contacto se perde, a guarda (`touch-action:none`, tela toda) fica por cima da página. O toque seguinte da caneta cai **na guarda**, fora de `#materias-container`, então a recuperação nunca corria. | caneta recusada (`reject:stroke-active`), guarda presa, **dedo rola 0 px** (I) | o toque novo da caneta grava o traço órfão, reassume o contacto e solta a guarda |
| 6 | **Diagnóstico enganoso.** `perf.pc` somava qualquer ponteiro; `longtask` aparecia como 0 sem suporte (achados 3 e 4). | soma única; «0» com `longtask` indisponível (A4, A5) | separados por caneta / toque (navegação · palma) / no meio do gesto; «indisponível» |

A causa 5 explica, sozinha, «escrita falhando **e** rolagem travando» ao mesmo tempo. O vídeo não basta para provar que aconteceu no aparelho: o `pointerup` perdido é do navegador. O build 456d conta e mostra isso no diagnóstico (`contato/traço órfão recuperado: N`).

## 3-bis · Auditoria da #479: pointerup perdido, caneta levantada, só os dedos (build 456e)

**Reproduzido no 456d.** Sequência: traço iniciado → `pointerup` perdido → `touchend` da stylus (a caneta saiu) → só dedos.
- A guarda continuava ativa.
- O dedo rolava **0 px** e a pinça não mudava o zoom (escala 1).
- O traço não era gravado.
- A recuperação só vinha com o próximo toque da caneta.

**Correção: `penSaiu()`.** Fecha o contacto como um `pointerup` faria, mas só com evidência do próprio navegador de que a ponta saiu:

| evidência | de onde | quando age |
|---|---|---|
| `stylus-touchend` | o `touchend`/`touchcancel` da stylus registada | no **quadro seguinte**, e só se o `pointerup` do MESMO `pointerId` não tiver chegado. Um fim normal com `touchend` antes do `pointerup` não é órfão (secção M). |
| `toque-sem-stylus` | qualquer `touchstart`/`touchmove`/fim de dedo cuja lista `e.touches` (a do navegador) não tem stylus nenhuma | na hora; **só onde o navegador classifica os toques** (`touchType` presente) |
| `caneta-sem-contato` | `pointermove`/`pointerout` da caneta com `buttons=0` **e** pressão 0 (a ponta pairando ou saindo) | na hora |

**Rejeição da palma preservada.** Com a stylus **ainda** na lista do navegador, nada solta a guarda: o toque da palma tem `touchstart`/`touchmove` suprimidos, e a guarda continua depois que a palma sai (variante «apoiada»). Nenhum temporizador corta letra: só sinais do navegador, e o quadro de espera do `touchend` só confirma a ausência do `pointerup`.

**Resultado (`ipad.test.cjs`, secções K, L e M).** Lápis e goma × diagnóstico fechado e aberto × evidência (`touchend`, toques, hover):
- a guarda sai **sem** novo toque da caneta;
- o dedo rola 260 px ou mais e a pinça dá zoom;
- o traço interrompido é gravado **uma vez** e volta igual depois de recarregar (mesmo id, 1 desenhado);
- a goma apaga e vira 1 desfazer;
- o diagnóstico conta a recuperação e diz por qual evidência.

Variante «apoiada»: a guarda fica e a palma é suprimida. Sem `touchType` (Chromium), nada é concluído às cegas (secção L).

## 4 · Hipóteses NÃO demonstradas (registradas, sem mudança especulativa)
- **`pinch-zoom` no WebKit.**
  - Se o motor não aceitar a palavra `pinch-zoom`, a declaração do lápis inteira cai e o conteúdo volta a `auto`.
  - Isso daria toque duplo com zoom e explicaria o «zoom inconsistente».
  - No piloto o valor passou a ser escrito como `manipulation` (mesmo significado, aceito por todos os motores).
  - O diagnóstico agora mostra `touch-action do conteúdo=…` e `«pinch-zoom» aceito pelo motor=sim/não`. No Chromium as duas formas são idênticas: ele serializa ambas como `manipulation`.
- **Variáveis na raiz durante a rolagem (`rm-layout.js`).**
  - `medirBanda()` escreve `--rm-band-top` e `--rm-band-bottom` na raiz a cada evento de scroll.
  - No Chromium isso não gerou recálculo da árvore: 0 recálculos com ≥ 500 elementos (`rolagem.cjs`).
  - Não alterado, porque o efeito não é demonstrável aqui.
  - O diagnóstico ganhou `rolagem: N quadros · maior intervalo · >50 ms` para medir no iPad, com e sem ferramenta.
- **Palma que já estava apoiada antes da caneta (WebKit).**
  - O Chromium não gera `Touch.touchType`.
  - O caminho do iPad (com a stylus em contacto, o toque da palma também não faz pan; stylus sem `touchend` é podada) está provado só com `TouchEvent` sintético (secção J).

## 5 · Correção (`rm-tools-v2.js`; tag `?v=` no `index.html`) — tudo atrás de `pilotoPermitido()`
1. **Classe `rm2-pilot` no `<body>`** (independente do A/B «Sin guarda»).
   - Lápis e goma: `#materias-container{touch-action:manipulation}`.
   - Goma com «Sin guarda»: a regra legada durante o contacto.
2. **Goma.** O dedo é roteado como no lápis (navegação ou palma, nunca apaga). A ponta da caneta ganha o mesmo contacto, a mesma guarda e o mesmo adaptador de toque do lápis.
3. **`pointerId` conferido ao encerrar a goma** (`outroPonteiroNaGoma`).
4. **Ponta única.** Um `pointerdown` de caneta (inclusive o que cai na guarda) conclui e grava um traço órfão de outro `pointerId`, encerra uma goma órfã e reassume o contacto. `concluirTraco()` é o corpo do antigo `onUpImpl`, sem mudança de algoritmo.
5. **Adaptador de Touch Events:**
   - registrado **só com lápis/goma armados** (`sincronizarAdaptador()` no `refletir()`);
   - elegível também para a goma;
   - com stylus em contacto, a palma não faz pan;
   - poda de stylus sem `touchend` pela lista `e.touches` do próprio navegador.
6. **A goma acha a marcação por baixo da guarda** (`elementsFromPoint`, só quando o elemento no ponto é a guarda).
7. **Diagnóstico (opt-in, só números):**
   - cancelamentos por origem;
   - «tarefas longas: indisponível» onde não há suporte;
   - `ambiente:` com o `touch-action` aplicado, a aceitação de `pinch-zoom`, o zoom visual e os ouvintes;
   - quadros da rolagem;
   - órfãos recuperados.
8. **A caneta saiu sem `pointerup` (auditoria da #479, build 456e).** A guarda sai assim que o navegador PROVA que a ponta já não está no vidro, sem esperar um novo toque da caneta e sem temporizador. O traço é gravado uma vez e a goma termina, como num `pointerup`. Ver §3-bis.
9. **Build `2026-10-10·456e`** (aviso ao abrir a caixa e 1.ª linha do diagnóstico).

Preservados: algoritmo do traço, simplificação, coordenadas e âncoras (`anchor_id`), gravação, tinta salva, grifos, notas, desfazer, regras de palma por pontuação (não mexi em constantes nem temporizadores), marcador.

## 6 · Provas
- `tools/qa/caneta-ipad-456/ipad.test.cjs`, sequências completas, com diagnóstico fechado e aberto:
  - palma antes, durante e depois da escrita;
  - goma em repouso; segundo contato durante a goma;
  - escrever → rolar → zoom 1,6 → escrever (tinta × ponta ≤ 6 px; traço antigo preso ao parágrafo);
  - troca de ferramenta, bloco e modo;
  - blur / app em segundo plano e retorno;
  - escrever 2, apagar 1 e **recarregar** (mesmo id, âncora e pontos, sem duplicar);
  - fora do piloto sem mudança;
  - ouvintes; órfão; caminho WebKit (J).
- Contra a `main`: **14 falhas**, e a secção J aborta porque o hook de teste não existe lá (`dados/ipad-antes-main.txt`).
- Contra o build 456d (primeira revisão desta PR): **141/197, 56 falhas**, todas nas variantes «caneta saiu sem `pointerup`» da secção K (`dados/ipad-antes-456d.txt`). A variante «apoiada» e o fim normal (M) passam também no 456d.
- Com o build 456e: **197/197** (`dados/ipad-depois-456e.txt`).
- `tools/qa/caneta-ipad-456/rolagem.cjs`: rolagem com o dedo por layout × ferramenta. Com a goma: **0 px na `main`** e **311–313 px com esta PR**, nos três layouts. Sem ferramenta e com o lápis: 285–315 px antes e depois. Nenhum recálculo da árvore inteira durante a rolagem (`dados/rolagem-*.json`).
- Regressão do piloto rerodada com o código final, todas verdes: `caneta-456` 138/138 · `sistema` 124 · `layout` 535 · `player-sistema` 275 · `player-toolbox` 495 · `race` 140 · `ink-jump` 54 · `cover` 198 · `nav-sistema` 216 · `pilot-flags` 10 · #460 isolado 167 e piloto real 51.
- `caneta-novo-layout` dá 89/91: as 2 falhas «post-it» conhecidas, idênticas à `main` (`docs/caneta-456/POSTIT-FALHAS-PREEXISTENTES.md`).

## 7 · Limites (declarados)
- **Só Chromium/Playwright.** Não há Safari/iPadOS nem Apple Pencil neste ambiente. Caneta via CDP `pointerType:'pen'`, palma via toque CDP com raio grande, zoom via `Emulation.setPageScaleFactor`.
- `Touch.touchType` não existe no Chromium: o adaptador do iPad foi provado com `TouchEvent` sintético.
- A ordem real de `pointerdown`/`touchstart` no WebKit, o reconhecimento de gesto do sistema e a rejeição de palma do iPadOS **não** são reproduzidos.
- O zoom do Safari (viewport visual) foi verificado só pela emulação do Chromium: 0,9 px de desvio a 1,6×.
- **Onde o navegador não classifica os toques** (sem `touchType`, como no Chromium) e a caneta não manda mais nenhum evento, um dedo sozinho **não** é tomado como prova de que a caneta saiu. Nesse caso a guarda só sai com o próximo toque da caneta, blur, troca de app ou troca de matéria (secção L).
  - No iPad o WebKit classifica (`direct`/`stylus`); é lá que valem as evidências de §3-bis.
- **Quando a única evidência é o próprio dedo** (a stylus não mandou `touchend` nem passou por cima da tela), o primeiro toque do dedo solta a guarda. Esse primeiro gesto pode não rolar: o navegador decide o `touch-action` no início do toque, quando a guarda ainda estava lá. O gesto seguinte rola e pinça normalmente.
  - Com `touchend` ou com a caneta pairando, a guarda já saiu antes do dedo, então o primeiro gesto rola.
- O marcador (`touch-action:none` com o marcador armado) não foi alterado. Fora do escopo desta reprovação.

## 8 · Rollback
- Reverter a PR: 1 arquivo de código + a tag `?v=` do `index.html`. Sem migração, sem dado novo.
- Atenuação sem deploy: esvaziar `RM_PILOT_PEN_UIDS` tira o 2.º testador do piloto físico. Para José, «Sin guarda» volta à regra legada de contacto, e desarmar a ferramenta remove os ouvintes de toque.

## Reproduzir
```bash
export NODE_PATH=$(npm root -g) RM_FFMPEG=…    # gerador de WAV (o harness precisa de um áudio qualquer)
node tools/qa/caneta-ipad-456/ipad.test.cjs                              # sequências (≈ 12 min)
RM_ASSETS_REF=origin/main node tools/qa/caneta-ipad-456/ipad.test.cjs    # contra a main: reprova (detecção)
node tools/qa/caneta-ipad-456/rolagem.cjs                                # rolagem por layout × ferramenta
```
