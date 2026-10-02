# Integração do audiobook (card no bloco + player único) — testes com MÍDIA REAL

Roda no Chromium (Playwright) contra um **servidor HTTPS local** (certificado autoassinado, só `127.0.0.1`):
a matéria **Semiología II REAL** (14 blocos + os 6 sons de ausculta reais), as funções **reais** `get-audio-manifest`/`get-audio-url`
(`_audio/lib.js`) atrás de um «Supabase» **falso em memória**, e áudio **real** (mp3/ogg gerados com ffmpeg) servido com `Range`,
limite de banda, latência, expiração de token e falhas injetáveis. **Sem rede externa, sem Supabase real, sem escrita em banco.**

```bash
export NODE_PATH=$(npm root -g)                 # playwright global; ffmpeg: PATH, RM_FFMPEG ou `pip install imageio-ffmpeg`; openssl
node tools/qa/browser-qa/audio-integracao/integracao.test.cjs                 # B1 = snapshot do contrato (sem dependências)
RM_B1_DIR=/pasta/com/rm-layout.js,.css,rm-modes.js  node …/integracao.test.cjs   # B1 REAL (#417): o harness usa os arquivos dele
node tools/qa/browser-qa/audio-integracao/capturas.cjs /tmp/capturas          # capturas PNG→WebP nas larguras críticas
```

## O que prova (≈190 verificações)
| Bloco | |
|---|---|
| **Portões** | sem sessão · outra conta · token inválido · piloto desligado no servidor · manifesto 500 · outra matéria ativa · sem Layout V2 · sem slot ⇒ `start()` = `false`, 0 cards, **nenhum** css/js/store/provider/mídia carregado |
| **Cards** | um em `s2-b01` e outro em `s2-b03`, logo após o título, `[data-rm-ui]`, só `div/span/b/button/svg`; **âncoras neutras** (por seção: nº de `p/li/h2–h5/table/figure/blockquote`, tamanho do texto e IDs idênticos; contagem não muda com o card); **0 mídia, 0 assinaturas, 0 `Audio`, 0 `src`** antes do play (também rolando a página toda); os 6 sons de ausculta intactos (`preload=none`, `loop`) |
| **Reprodução real** | 1 assinatura no play; `Range`; 1 elemento `Audio`; `currentTime` avança; 5 velocidades no elemento **real** (`preservesPitch`); pausa mantém aberto; **fechar não rola**, foco volta ao card, slot volta a `hidden`; «Continuar · m:ss»; reiniciar = 0 pausado sem autoplay |
| **Busca** | barra → ≈42 s e continua dali; ±15; limites 0 e duração |
| **Rede lenta** | 2,5 KB/s num mp3 de 8 KB/s + 1,8 s de latência: `loading`/«Cargando…»/`aria-busy`, pausa durante a espera, sem erro, volta a tocar |
| **Expiração** | token de 1,5 s; busca em zona não bufferizada ⇒ 403 ⇒ **1** reautorização, 2 assinaturas, volta a tocar perto de 50 s (posição preservada), sem erro visível |
| **Erros** | URL negada (kill switch) ⇒ «Reintentar» + `role=alert`, sem `Audio` nem mídia; mídia inválida ⇒ erro sem laço |
| **Recarregar** | posição em `localStorage` (só um número); card «Continuar · 0:23» **sem** mídia; play continua ≈ 0:23; outro navegador/aparelho e outra conta **não** herdam |
| **Um por vez** | A→B (1 `Audio`, 1 a tocar); tocar a **ausculta real** pausa o audiobook sem fechá-lo; retomar o audiobook para a ausculta |
| **Caneta** | armada ⇒ slot `data-rm-pen`, player encolhe (chip), `--rm-player-h` acompanha, áudio **não** pausa, parágrafos não mudam de retângulo, traço `pen` (PointerEvents) sem `preventDefault` do áudio nem rolagem; **nenhum listener global de pointer/touch/mouse/gesture/wheel/scroll** do audiobook |
| **Ciclo de vida** | mudar `data-rm-dock` a tocar; trocar de matéria; `SIGNED_OUT`; `RMLayout.detach()` ⇒ pausa, guarda posição, remove tudo; stop→start e start repetido sem duplicar |
| **Larguras** | 320/390/561/600/700/767/768/1024/1440/1700/1920 (+ 561–767 também com viewport baixo de 520 px) + zoom 200 % (195 e 720 CSS px): card e player dentro do viewport, alvos ≥ 44 px, o áudio **não cria overflow** (a matéria já tem elementos largos em 320 px), não cobre lateral/toolbox, fim da página fica acima do player |

## Limites honestos
* O Chromium do Playwright **não decodifica AAC/M4A**: aqui o áudio é mp3/ogg. O M4A é validado pelo pipeline (`tools/audio`) e **precisa de teste em aparelho real** (Safari iOS/Chrome Android: `Range`, autoplay, `playbackRate` 2,5×).
* A caneta é exercitada com `body.rm2-t-pen` + PointerEvents; o motor real da caneta (`rm-tools-v2.js`) não é carregado: coexistência de verdade é teste físico.
* `Input.dispatchMouseEvent` sobre texto com áudio tocando travou o Chromium headless (instabilidade da ferramenta, reproduzida sem o audiobook-só com mídia a tocar); por isso o traço usa PointerEvents.
* O Supabase é falso. A migration do bucket **não** foi validada num Supabase real (ver PR #419).

## Como o audiobook é ligado (nada disto foi feito)
1. **Pilha de PRs (ordem de merge, uma de cada vez, só o José):** #415 (motor) → #418 (retomada) → #419 (servidor/migration) → esta (integração). Depois de cada merge, a seguinte é reapontada para `main`.
2. **Layout V2 (Claude 2, #411/#417):** em `rm-pilot.js`, depois de `RMLayout.attach(tab)`, carregar `assets/rm-audio-boot.js` e chamar `RMAudioBoot.start()`; em `desativar()` chamar `RMAudioBoot.stop()` (contrato no comentário da #417). **Esta PR não edita `rm-pilot.js`, `index.html` nem `rm-layout.*`.**
3. **Servidor:** migration do bucket, objetos tratados (ver `tools/audio/`), variáveis `RM_PILOT_AUDIO_UIDS` + `RM_AUDIO_MANIFEST`, **deploy**, verificação com `smoke-remote.cjs` (ver `tools/qa/audio-server/README.md`, incluindo desligamento e limites).
4. **Sem as duas pontas** (hook no `rm-pilot` + manifesto no servidor) **nada aparece para ninguém**: o boot nem é baixado e, se for, `start()` devolve `false` sem pedir mídia.

## Blocker conhecido do Layout V2 (561–767 px) — DETECTADO e REPORTADO, não corrigido aqui

A suíte mede, em 561/600/700/767 px (alturas 900/1024 e 520) e em 720×450 (zoom 200 %), se o player inferior cobre a toolbox.
O resultado sai numa seção própria **«RELATÓRIO · blocker conhecido do Layout V2»**, com `⚠ B1-BLOCKER` quando há cobertura (hoje:
**720×450 px a zoom 200 %**, player de 135 px; nas demais combinações medidas a toolbox não é coberta). Isso **não reprova** a suíte:
a regra é do `rm-layout.css` (Claude 2 · #425) e o audiobook não a corrige. Quando o B1 corrigir, a linha passa a `✔ B1-BLOCKER NÃO reproduzido`.
Com `RM_B1_DIR=<dir com rm-layout.js/css e rm-modes.js>` a mesma suíte roda contra o B1 real (294 verificações nos dois modos).

## Hook no `rm-pilot.js` — NÃO implementado aqui (Claude 2)

Sobre a `main` com a #411 (`rm-pilot.js`, 152 linhas), a integração final precisa de **duas edições**, ambas em `assets/rm-pilot.js`:

1. **`avaliar()`**, logo depois de `window.RMLayout.attach(tab);` (hoje linha 122, dentro do `try`):
   ```js
   js(BASE + 'rm-audio-boot.js?v=' + VER).then(function () { if (n === emVoo && tabAtiva() === tab && window.RMAudioBoot) window.RMAudioBoot.start(); }, function () {});
   ```
   (`start()` é idempotente e falha fechada: sem manifesto do servidor para o UID, nada aparece e nada é baixado.)
2. **`desativar()`** (hoje linha 110), antes do `detach`:
   ```js
   try { if (window.RMAudioBoot) window.RMAudioBoot.stop(); } catch (e) {}
   ```

O `rm-audio-boot.js` consome só o contrato do B1: slot `#rm-l2-player`, `html[data-rm-dock="side|bottom"]` e `--rm-player-h`. Não depende de `RMLayout._dock` (que só existe a partir da #417).

## Caneta REAL + Layout REAL (`caneta-real.test.cjs`)

`NODE_PATH=$(npm root -g) node tools/qa/browser-qa/audio-integracao/caneta-real.test.cjs` → **55 verificações**. Carrega os arquivos **reais** do repositório
(`rm-tools.js`, `rm-tools-v2.js`, `rm-layout.js/css`, `rm-modes.js`, `rm-audio-boot.js` + motor) com a matéria Semiología II real (`/h?pen=1&real=1`, conta do José).
O «Supabase» é um fake em memória (subconjunto do PostgREST que a caneta usa; sobrevive a reload via `sessionStorage`) e o áudio é mp3/ogg sintético — prova a
**convivência do código**, não o áudio real, não o tablet e não o banco real. `RM_B1_DIR=<dir>` testa outra versão do Layout (p.ex. a branch da #425).
Cobre: tocar enquanto se escreve (a caneta real gera os mesmos `preventDefault` com e sem áudio; o áudio continua avançando); **alinhamento** de traço e marca-texto
(posição relativa à âncora) ao **inserir/remover cards** e ao **recarregar** (cards antes ou depois da caneta sincronizar); pausa/fechar com a caneta armada;
**troca de matéria e logout DURANTE o carregamento do manifesto**; toolbox real × player em 561–767/720×450 (relatório `B1-BLOCKER`, não reprova).
Regressões encontradas e corrigidas em `rm-audio-boot.js`: (1) trocar de aba ou **sair da conta com o manifesto ainda a caminho** deixava os cards/o player nascerem
(os observadores só eram ligados depois do carregamento ⇒ agora `vigiar()` desde o início); (2) com o Layout da #425 os traços **não se reposicionavam** ao remover os cards
(⇒ `RMToolsV2.reposicionar()` — API pública — depois de inserir/remover os cards).
