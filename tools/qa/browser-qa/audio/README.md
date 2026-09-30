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

## O que cobre (≈360 verificações)

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

## Limites honestos (fica para D2/D3)

- O elemento `<audio>` real (streaming, Range, buffering, autoplay policy do iOS) **não** é exercitado: a D1 prova a
  lógica do motor com um adapter sintético. O comportamento em Safari/iOS real precisa de teste físico na D3.
- Safe-area é verificada no CSS (`env(...)`), não num aparelho com notch.
- Como o motor é encaixado no slot real da Layout V2, o que fazer com o conteúdo por baixo e a coexistência com a
  caixa de ferramentas/lápiz são decisões de integração (D3).
- Nenhuma decisão de produção (Storage, R2, CDN, upload, signed URL, custos de egress): é a D2.
