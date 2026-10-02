# Runbook — conteúdo REAL dos 4 Audiobooks de Semiología II (piloto: só José)

**Estado:** os 4 masters reais **não estão acessíveis** a este ambiente (ver §1). Portanto **nenhum** resultado de duração, bitrate, qualidade,
inteligibilidade ou vínculo dos masters reais existe. Este documento só prepara o que o José fornece/executa e o que será testado.
Nada abaixo foi aplicado: nenhuma migration, nenhum upload, nenhuma variável, nenhum deploy.

---

## 1. ARQUIVOS NECESSÁRIOS DO JOSÉ

Verificação feita neste ambiente: nenhum `.m4a` no disco; `drive.google.com` sem resposta (HTTP 000); o conector do Drive só lê metadados
(limite de 10 MB por download; os arquivos têm 26–61 MB). Para processar, o José precisa **transferir os 4 arquivos para este chat/ambiente**
(anexar ao chat ou colocar na pasta de uploads da sessão) — **ou** liberar `drive.google.com` + compartilhamento por link para a sessão.

| | Arquivo (nome no Drive) | Tamanho no Drive (metadado) | Vínculo **candidato** (não confirmado) |
|---|---|---|---|
| A | `Semio_-_Motivo_de_Consulta.m4a` | 61 275 605 B | `s2-b01` — Motivo de consulta respiratorio |
| B | `Semio_EPOC.m4a` | 55 806 805 B | `s2-b03` — Síndrome Obstructivo (Asma y EPOC) |
| C | `Semio - 3 Sindrome Parenquimatoso.m4a` | 26 196 225 B | `s2-b04` — Síndrome Parenquimatoso (Condensación · Neumonía) |
| D | `Semio_-_4_sindrome_pleual.m4a` | 37 840 755 B | `s2-b05` — Síndromes Pleurales (Derrame y Neumotórax) |

Opcional e muito útil: uma **transcrição** (`.txt`) de cada áudio ou a indicação de em que minuto cada tema aparece. Os originais não são alterados.

Enquanto os arquivos não chegam, **a parte de processamento real fica parada**.

## 2. Quando os arquivos existirem (ferramenta já na `main`)

```bash
python3 tools/audio/preparar_audiobooks.py inspecionar --origem ~/masters            # duração, codec, canais, bitrate, faststart (só lê)
python3 tools/audio/preparar_audiobooks.py preparar    --origem ~/masters --saida ~/audiobooks-tratados   # FORA do repositório
```
Por master: SHA-256 antes/depois (o script aborta se o master mudar), AAC-LC **mono** a **48** e **64 kbps** com faststart, e no `relatorio.md/json`:
duração, tamanho, decodificação sem erro, Δ duração, loudness (LUFS) e pico, **STOI a 1×** e **STOI a 2× e 2,5×** (master e cópia aceleradas igual, sem mudar o tom).
**Recomendação:** 48 kbps só se passar o STOI (1× ≥ 0,95; 2×/2,5× ≥ 0,90 — **limiar provisório**, a calibrar), o faststart e o pico; senão 64 kbps.
STOI é objetivo: **a escuta humana a 1×, 2× e 2,5× decide** (`escuta_humana_pendente` sempre `true`).

## 3. Vínculo com o bloco — pelo CONTEÚDO

Para cada áudio, o relatório do Claude conterá: assunto identificado · bloco recomendado · confiança · trechos/temas que justificam · dúvida residual;
com dúvida ⇒ **`REVISÃO HUMANA NECESSÁRIA`**. O nome do arquivo nunca é prova. Ferramenta: `vincular --transcricao … --materia
"Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/semiologia-ii.html"` (TF-IDF contra cada `section#s2-bNN`), ou a escuta do José.

## 4. Manifesto (`RM_AUDIO_MANIFEST`) — só depois de confirmar

Com o `relatorio.json` e um `vinculos.json` (um objeto por áudio: `master`, `audio_id`, `block_id`, `theme`, `title`, `order`, `version`, `kbps`,
`vinculo_confirmado:true`, `confirmado_por:"escuta"|"transcricao"`, `escuta_humana_ok:true`):
```bash
python3 tools/audio/montar_manifesto.py --relatorio ~/audiobooks-tratados/relatorio.json --vinculos ~/audiobooks-tratados/vinculos.json --saida ~/audiobooks-tratados/manifesto
```
Gera **fora do Git** `manifesto.json` (valor candidato da variável) e `plano-upload.md` (arquivo derivado → `path` no bucket). **Falha fechada:** sem vínculo
confirmado + escuta OK, bloco inexistente, `audio_id`/`order` repetido, cópia > 30 MB, sem faststart/decodificação limpa, > ~3,8 KB, ou item recusado pelo
validador do motor/leitor do servidor ⇒ nada é gerado. **Não define a variável.** Forma (valores ilustrativos; `duration` e `order` reais vêm do relatório):
```json
{"semiologia-ii":[{"audio_id":"<id>","block_id":"s2-bNN","theme":"<tema>","title":"<título>","duration":<segundos>,"order":<n>,"version":"v1","path":"semiologia-ii/<audio_id>.m4a","ready":true}]}
```
Sem URL assinada, sem bucket, sem token. `path` só existe no servidor.

## 5. Storage — checklist exato para o José (NADA foi feito)

- [ ] **A.** Aplicar a migration já na `main`: `Repasso-Med-Site--main/Atual - Copia/supabase/migrations/20260930_01_audiobooks_bucket_privado.sql` (idempotente). Validar antes em branch/projeto Supabase **de teste** (exige autorização para criar; pode ter custo).
- [ ] **B.** Confirmar (SQL Editor, só leitura):
  ```sql
  select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'audiobooks';
  -- esperado: public=false · file_size_limit=31457280 (30 MB) · allowed_mime_types={audio/mp4,audio/x-m4a}
  select policyname, permissive, roles, cmd from pg_policies
   where schemaname='storage' and tablename='objects' and policyname='audiobooks_deny_direct_access';
  -- esperado: 1 linha · permissive=RESTRICTIVE · roles={anon,authenticated} · cmd=ALL
  ```
  e que **não** exista policy permissiva própria para `audiobooks`.
- [ ] **C.** Upload dos derivados (os `.m4a` do `plano-upload.md`) no bucket `audiobooks`, **exatamente** nos `path`s do manifesto (`semiologia-ii/<audio_id>.m4a`), pelo painel. Masters **nunca** sobem.
- [ ] **D.** Netlify: `RM_PILOT_AUDIO_UIDS` = UID do José (só ele) e `RM_AUDIO_MANIFEST` = conteúdo de `manifesto.json`. (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` já existem.) Testar primeiro num **deploy preview** com escopo «Deploy previews».
- [ ] **E.** **Novo deploy** (variável só vale no próximo build) e esperar terminar.
- [ ] **F.** Hook do `rm-pilot.js` (dono: Claude 2; **ainda ausente na `main`**): sem ele o card não aparece. Linhas exatas em `tools/qa/browser-qa/audio-integracao/README.md`.
- [ ] **G.** `node tools/qa/audio-server/smoke-remote.cjs on|deny` contra o deploy (ver `tools/qa/audio-server/README.md`), com o JWT por variável de ambiente.

## 6. Roteiro do teste real (quando ativado)

Conta do José no piloto, Semiología II, depois do deploy:
1. **Card só para o José:** card nos blocos vinculados; **outra conta** (e conta deslogada) **não vê** card nem player; `Network` sem pedido de mídia.
2. **Zero mídia antes do play:** abrir a matéria e rolar tudo ⇒ nenhum pedido a `/storage/v1/object/sign/` e nenhum `<audio>` com `src`.
3. **Play solicita a URL só no clique** (1 chamada a `get-audio-url`); o áudio começa; **pause** mantém posição e player.
4. **±15 s** (limitado a 0 e à duração) e **busca** pela barra; **1× / 1,25× / 1,5× / 2× / 2,5×** (voz clara em cada uma).
5. **Fechar** ⇒ pausa, guarda posição, recolhe, foco volta ao card sem rolar.
6. **Recarregar** ⇒ card «Continuar · m:ss» sem mídia; **Continuar** retoma perto do ponto. **Restart** ⇒ 0, pausado, sem autoplay.
7. **A→B:** iniciar outro audiobook pausa o primeiro; sem retomada automática.
8. **Auscultação:** com o audiobook tocando, tocar um som de ausculta ⇒ o audiobook **pausa** e **não retoma sozinho**; e o inverso.
9. **Expiração/reautorização:** com o player em pausa > 10 min, ao dar play a URL é renovada e a posição mantida.
10. **Trocar de matéria** ⇒ pausa, guarda posição, cards e player somem; **logout** ⇒ pausa e remove cards (posição guardada só da conta correta).
11. **Desligar:** esvaziar `RM_PILOT_AUDIO_UIDS` + deploy ⇒ manifesto vazio e 404 (URLs já emitidas valem até 10 min).

### Quadro de evidências (preencher; hoje só a primeira coluna existe)

| Item | TESTADO AUTOMATICAMENTE (sintético/mp3-ogg) | TESTADO COM M4A REAL | PENDENTE DE IPAD/SAFARI |
|---|---|---|---|
| Autorização do servidor (UID, manifesto, URL 10 min, negação uniforme, `no-store`, sem segredo) | ✅ `server.test.cjs` 97 | ❌ | — |
| Migration/rollback, RESTRICTIVE, policies amplas, `service_role` | ✅ `migration.test.cjs` 110 (PostgreSQL 16 real, esquema `storage` **réplica**) | ❌ (Supabase de teste real pendente) | — |
| Motor, A→B, close, restart, ±15 s, velocidades, destroy, retomada por UID | ✅ 589 (adapter sintético) | ❌ | ❌ |
| Integração: card, portões fail-closed, 0 mídia antes do play, ausculta, caneta, layout, 320→1920 | ✅ 294 (mp3/ogg reais via HTTPS local, Layout V2 real) | ❌ | ❌ |
| Reautorização/expiração, rede lenta, Range | ✅ (servidor local com Range/expiração simulados) | ❌ | ❌ |
| Decodificação AAC/M4A, duração e faststart reais, `playbackRate` 2,5× | ❌ (Chromium do Playwright não decodifica AAC) | ❌ | ❌ |
| Safari/iPad: autoplay, Range/206, bloqueio de tela, background | ❌ | ❌ | ❌ **PENDENTE** |
| Supabase Storage/URL assinada reais | ❌ | ❌ | — |
| Preparação dos masters (pipeline, STOI 1×/2×/2,5×, manifesto) | ✅ `tools/audio` 23 testes (master **sintético**) | ❌ (masters reais não processados) | — |

Não declarar «testado com M4A real» antes de existir o relatório dos masters reais e a execução acima.
