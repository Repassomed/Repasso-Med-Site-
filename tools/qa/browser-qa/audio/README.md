# Harness do motor de audiobook (D1 · sintético e dormente)

Testa `assets/rm-audio.js` + `assets/rm-audio.css` **isolados** num HTML sintético (`harness.html`).
Nenhuma página do site carrega esses ficheiros nesta fase. Não há mídia real, nem URL real, nem
Supabase/Storage/CDN, nem upload: o «áudio» é um `FakeAudio` (`fake-audio.js`) e o «provider» devolve
apenas `synthetic://<audio_id>/<n>`.

```bash
# playwright instalado globalmente (ou RM_PLAYWRIGHT=/caminho/do/modulo)
export NODE_PATH=$(npm root -g)
node tools/qa/browser-qa/audio/audio.test.cjs      # saída ≠ 0 se algo falhar
```

O servidor local escuta só `127.0.0.1` e serve **4 ficheiros** (harness, fake, JS e CSS do motor). Qualquer
outro pedido é abortado/404 e reprovado pelo teste.

## O que cobre (≈550 verificações)

| Bloco | Verificações |
|---|---|
| Validador de manifesto (Node) | 8 campos obrigatórios; recusa URL, caminho privado, token, JWT, `bearer`, `.m4a/.mp3…`, `storage/`, `.supabase.`, campos `url/src/path/token/secret/bucket/signed_url`, campos desconhecidos, durações/ordens inválidas, `audio_id` repetido; item guardado só com os 8 campos e imutável |
| Dormência | nenhum HTML/JS do site referencia `rm-audio`; código sem `fetch/XHR/localStorage/Supabase/createSignedUrl`; sem listeners globais; `.src` só atribuído em 1 ponto |
| Metadados | `loadMetadata` = 0 elemento de áudio, 0 `src`, 0 chamadas ao provider |
| Slot | `#rm-l2-player` fornecido pelo teste; slot ausente ⇒ `attach()` falha fechado sem alterar DOM/`<html style>`; sem player montado `play()` recusa |
| Reprodução | 1.º play pede fonte 1×; pause (mantém posição e player); continuar; close (guarda posição, recolhe, sem zerar); reabrir; restart (0, pausado, **sem autoplay**); ±15 com limites; 5 velocidades (+ persistência por sessão/utilizador, sem storage) |
| Um só player | A→B (1 elemento, nunca 2 a tocar, posição de A guardada); exclusividade entre instâncias; corridas (pause/A→B rápidos cancelam cargas pendentes) |
| Erros | provider em baixo; item inválido/desconhecido; URL real recusada por omissão; sem provider; carga falha 2× ⇒ 1 reautorização e erro; nova tentativa retoma |
| Expiração | URL expira a tocar ⇒ `reason:'expired'`, nova fonte, **currentTime preservado**, volta a tocar; expira em pausa ⇒ silencioso, reautoriza no play; `expiresAt` por relógio |
| Ganchos | `subject-change`, `pause-request`, `exclusive`, `logout` (pausa+destroy), `RMAudio.pauseAll` — sem ligar a nenhum evento global |
| Destroy | UI/marcas removidas, elemento pausado e sem fonte, motor inerte, eventos tardios ignorados |
| UI 320/390/768/1024/1440 | modo lateral ≥1400 / mini-player inferior abaixo; dentro do viewport; sem overflow; título com ellipsis; alvos ≥44 px; não cobre o fim da página (inferior) nem a caixa de ferramentas/coluna (lateral); `--rm-audio-h`; CSS com `env(safe-area-inset-*)`; cliques reais; teclado (Tab, Enter, Espaço, setas, Escape); nomes acessíveis, `aria-valuetext`, `role=alert`; troca 1399↔1400 sem recarregar; tema escuro |
| Zero mídia/rede | guardas no browser (`Audio`, `HTMLMediaElement.play/load/src` reais nunca usados); só 4 pedidos locais; nenhum pedido a ficheiro de áudio; consola limpa; storage vazio |

## Regressões da auditoria `3a48e962`

- **seek()/skip() com provider pendente:** a posição é lida *no momento de usar* (não congelada no início do `play()`).
  Cobre seek durante o provider, durante a carga do elemento, com `pause`/`restart`/`close`/A→B pendentes e durante a
  renovação da fonte (vale o ponto mais recente).
- **provider que lança erro síncrono:** `play()` nunca lança; qualquer falha do provider (síncrona, rejeitada, `null`,
  ou com `code` 2/4/`SRC_EXPIRED`) vira `source-failed` — sem reautorização em laço e sem ficar preso em `loading`.
  Idem para `audioFactory` e `audio.play()` síncronos. Todos os testes novos reprovam no motor antigo (15 falhas).

**Sintético × real:** tudo acima prova a LÓGICA do motor com um adapter sintético (`FakeAudio`, sem áudio, rede ou
Storage). NÃO prova comportamento do `<audio>` real (buffering, Range/206, política de autoplay do iOS, `playbackRate`
2,5× no Safari, expiração real de URL assinada) — isso exige a entrega de áudio real e teste em aparelho.

## Integração futura com a Layout V2 (B1) — `data-rm-dock` é a autoridade

O B1 (`rm-layout.js`, PR #411) já decide onde o player cabe e publica `html[data-rm-dock="side"|"bottom"]`
(viewport, lateral 264/64/0, coluna de texto 880, toolbox, largura/gap do player). O motor **só lê** esse atributo:

- `side` → lateral · `bottom` → inferior. O breakpoint próprio (`BP_LATERAL = 1400`) é **só fallback sintético**
  para o harness isolado (sem `data-rm-dock`) e nunca prevalece sobre o B1.
- O player vive **dentro do slot** `#rm-l2-player` (fixed entre `--rm-left-w` e `--rm-right-w`): inferior = ocupa o
  slot; lateral = encostado à borda direita do slot (= esquerda da toolbox). Nenhum `left: 16px` absoluto com B1.
- Modo inferior publica a altura em `--rm-player-h` (a variável do B1 que reserva espaço e afasta toast/FAB/diagnóstico
  da caneta); modo lateral publica `0`. O slot (que o B1 cria `hidden`) abre com o player e volta a `hidden` no
  `close()`/`destroy()`.
- Acompanha mudanças de `data-rm-dock` **sem** a viewport cruzar breakpoint: `MutationObserver` restrito a
  `<html>` + `attributeFilter:['data-rm-dock']`, criado no `attach()` e desligado no `unmount()`/`destroy()`/`logout`.
  Sem listener global permanente. `engine.refreshLayout()` faz o mesmo de forma síncrona a pedido da integração.
- `harness.html` traz um **snapshot do contrato** do B1 (`<style id="b1-contract">`, da #411 @ `dfd39a45`) — não é o
  `rm-layout.css` e não depende da #411.

Cenários testados: A) 1440 + lateral 264 ⇒ B1 `bottom` ⇒ D1 `bottom` · B) mesma viewport, docked→rail ⇒ `side` ⇒ D1
lateral sem reload · C) side→bottom · D) `--rm-left-w:264px`/`--rm-right-w:67px`: sem cobrir lateral, toolbox nem
diagnóstico · E) trilho 64 px (1024/1440/900) · F) celular (bottom + safe-area) · G) sem `data-rm-dock` ⇒ fallback ·
H) destroy/unmount/logout desligam o observer · I) 0 mídia antes do play.

**Achado para o B1 (não corrigido aqui, `rm-layout.js` é intocável nesta PR):** a condição `cabe` soma
`880 + 67 + 12 + 240 + 32`, mas a coluna de texto é centrada, então o espaço livre se divide entre os dois lados.
Entre ~1495 e ~1627 px com lateral docked o B1 manda `side` e o player de 240 px entra ~14–66 px por baixo do texto.
Com o trilho de 64 px a 1440 px cabe. O teste imprime um `ⓘ AVISO B1` no caso de 1600 px. O motor continua a obedecer o B1.

## Limites honestos (fica para D2/D3)

- O elemento `<audio>` real (streaming, Range, buffering, autoplay policy do iOS) **não** é exercitado: a D1 prova a
  lógica do motor com um adapter sintético. O comportamento em Safari/iOS real precisa de teste físico na D3.
- Safe-area é verificada no CSS (`env(...)`), não num aparelho com notch.
- O teste usa um snapshot do contrato do B1, não o `rm-layout.*` real: a conferência com o B1 real (e com o `hidden`
  do slot, que o B1 nunca remove) é da D3. Coexistência com toast/FAB/lápiz no B1 real idem.
- Nenhuma decisão de produção (Storage, R2, CDN, upload, signed URL, custos de egress): é a D2.
