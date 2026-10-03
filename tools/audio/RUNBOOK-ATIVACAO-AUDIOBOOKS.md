# Runbook — conteúdo REAL dos 4 Audiobooks de Semiología II (piloto: só José)

**Estado:** os 4 masters reais **não estão acessíveis** a este ambiente (ver §1). Portanto **nenhum** resultado de duração, bitrate, qualidade,
inteligibilidade ou vínculo dos masters reais existe. Este documento só prepara o que o José fornece/executa e o que será testado.
Nada abaixo foi aplicado: nenhuma migration, nenhum upload, nenhuma variável, nenhum deploy.

---

## 1. ARQUIVOS NECESSÁRIOS DO JOSÉ — como disponibilizar (sem repetir tentativas que já falharam)

Já tentado e **barrado** (não repetir): download pelo conector do Drive (limite de 10 MB por arquivo; os masters têm 26–61 MB) e acesso direto a
`drive.google.com` (a política de rede do ambiente nega o host, HTTP 000). Nenhum `.m4a` existe no disco da sessão.

| | Arquivo (nome no Drive) | Tamanho no Drive (metadado) | Vínculo **candidato** (não confirmado) |
|---|---|---|---|
| A | `Semio_-_Motivo_de_Consulta.m4a` | 61 275 605 B | `s2-b01` — Motivo de consulta respiratorio |
| B | `Semio_EPOC.m4a` | 55 806 805 B | `s2-b03` — Síndrome Obstructivo (Asma y EPOC) |
| C | `Semio - 3 Sindrome Parenquimatoso.m4a` | 26 196 225 B | `s2-b04` — Síndrome Parenquimatoso (Condensación · Neumonía) |
| D | `Semio_-_4_sindrome_pleual.m4a` | 37 840 755 B | `s2-b05` — Síndromes Pleurales (Derrame y Neumotórax) |

**Inventário real do Drive (conferido em 2026-10-02 pelo conector, só metadados):** a pasta `Semiologia II ▸ Audiobooks` (id `1APjpeMTDGrBzytbZSKcsxi704PniIEmT`,
criada em 2026-09-21; o nome real é «Audiobooks») contém **exatamente 4 arquivos `.m4a`** — os da tabela acima, com os mesmos ids e tamanhos do inventário anterior (modificados em 21–24/09/2026).
Nenhum outro arquivo (nem transcrição, nem sons de ausculta) está nessa pasta. O ambiente continua sem alcançar o conteúdo (`drive.google.com` e `drive.usercontent.google.com` sem resposta; conector limitado a 10 MB).

**Reconferido na etapa 2 (depois do merge da #430):** nada mudou. Os 4 arquivos continuam só no Drive; o conector entrega metadados (e `read_file_content` **não suporta áudio**); `drive.google.com`, `drive.usercontent.google.com`
e `docs.google.com` seguem sem resposta; `uploads/` vazia. **Detalhe novo que muda o caminho 2:** as permissões de cada `.m4a` são só `owner repasso.med` + 3 editores nominais (sem «qualquer pessoa com o link»).
Logo, **liberar a rede não basta**: o arquivo também precisaria ser compartilhado por link. Não tentei nenhuma contorno de acesso.

Três caminhos, **um basta** (em ordem de preferência):

1. **Rodar na máquina do José** (não depende deste ambiente): `bash tools/audio/rodar_local.sh ~/masters ~/audiobooks-tratados` (confere dependências, recusa saída dentro do Git, roda `inspecionar` + `preparar`; nada é enviado) — equivale ao §2, com os 4 arquivos numa pasta local fora do Git. O José devolve o `relatorio.md`/`relatorio.json`
   e a pasta `amostras/` (trechos de ~25 s, pequenos; os derivados completos não precisam voltar). **Este é o caminho mais curto.**
2. **Liberar a rede do ambiente para o Drive:** no menu do ambiente na barra de título da sessão ▸ *Edit* ▸ *Network access*: nível mais amplo **ou** adicionar
   `drive.google.com`, `drive.usercontent.google.com` e `*.googleusercontent.com` aos domínios permitidos; e em cada arquivo do Drive ▸ Compartilhar ▸
   *Qualquer pessoa com o link* (leitor). Depois o José diz aqui que liberou; **a sessão ainda precisará ser testada** (não está provado que o download funcione).
3. **Anexar os arquivos ao chat.** Pode haver limite de tamanho do anexo; se recusar, usar o caminho 1 ou 2.

Opcional e muito útil em qualquer caminho: uma **transcrição** (`.txt`) de cada áudio, ou os minutos em que cada tema aparece.
Os originais nunca são alterados. Enquanto os arquivos não chegam, **o processamento real fica parado**; o restante (runbook, testes, contrato) segue independente.

## 1-B. Pipeline REAL a partir do ZIP dos 4 masters (`processar_zip.py`)

Com o `audiobooks_semiologia2_masters.zip` acessível (nesta sessão ou na máquina do José), um comando faz tudo, **fora do repositório**:
```bash
pip install sherpa-onnx imageio-ffmpeg pystoi soundfile numpy scipy
# modelo de ASR (espanhol) — release do GitHub, ≈ 640 MB (small) ou ≈ 207 MB (base):
curl -L -o whisper.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2 && tar xjf whisper.tar.bz2
python3 tools/audio/processar_zip.py --zip ~/audiobooks_semiologia2_masters.zip --trabalho ~/audiobooks-trabalho --modelo ./sherpa-onnx-whisper-small
```
Etapas: extrai o zip (recusa caminho fora da pasta) e confere os 4 nomes + SHA-256 → inspeciona (codec/duração/canais/bitrate/faststart) → `preparar` (AAC-LC mono 48/64 kbps, faststart, STOI 1×/2×/2,5×, amostras) →
`transcrever` (ASR local em janelas de 28 s a cada 120 s) → vínculo **pelo conteúdo** (TF-IDF contra os 10 blocos, texto inteiro + blocos de 5 min). Saídas em `~/audiobooks-trabalho`: `RELATORIO-REAL.md`,
`vinculos-evidencia.json`, `vinculos.json` (RASCUNHO: `vinculo_confirmado` só true com evidência forte e consistente; `escuta_humana_ok` **sempre false**), `tratados/` (derivados + `amostras/`), `transcricoes/`.
O ASR erra termos médicos: vale como evidência de **tema**. Dúvida ⇒ `REVISÃO HUMANA NECESSÁRIA` e fora do manifesto. Em seguida: escuta humana das amostras → `montar_manifesto.py` → `verificar_upload.py` (§4–§5).

## 2. Quando os arquivos existirem (ferramenta já na `main`)

```bash
python3 tools/audio/preparar_audiobooks.py inspecionar --origem ~/masters            # duração, codec, canais, bitrate, faststart (só lê)
python3 tools/audio/preparar_audiobooks.py preparar    --origem ~/masters --saida ~/audiobooks-tratados   # FORA do repositório
```
Por master: SHA-256 antes/depois (o script aborta se o master mudar), AAC-LC **mono** a **48** e **64 kbps** com faststart, e no `relatorio.md/json`:
duração, tamanho, decodificação sem erro, Δ duração, loudness (LUFS) e pico, **STOI a 1×** e **STOI a 2× e 2,5×** (master e cópia aceleradas igual, sem mudar o tom).
E em `amostras/` (fora do Git): 3 trechos de ~25 s por master — a **referência do master**, cada cópia (48 e 64 kbps) a **1×, 2× e 2,5×** — para a escuta humana (a 2×/2,5× o trecho de 25 s cobre 50/62 s de conteúdo).
**Recomendação:** 48 kbps só se passar o STOI (1× ≥ 0,95; 2×/2,5× ≥ 0,90 — **limiar provisório**, a calibrar), o faststart e o pico; senão 64 kbps.
STOI é objetivo: **a escuta humana a 1×, 2× e 2,5× decide** (`escuta_humana_pendente` sempre `true`).

## 3. Vínculo com o bloco — pelo CONTEÚDO

Para cada áudio, o relatório do Claude conterá: assunto identificado · bloco recomendado · confiança · trechos/temas que justificam · dúvida residual;
com dúvida ⇒ **`REVISÃO HUMANA NECESSÁRIA`**. O nome do arquivo nunca é prova. Ferramenta: `vincular --transcricao … --materia
"Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/semiologia-ii.html"` (TF-IDF contra cada `section#s2-bNN`), ou a escuta do José.

### O que ouvir para confirmar (derivado do TEXTO da matéria — não do áudio)

A matéria Semiología II tem **10 blocos** (`s2-b01`…`s2-b10`). O vínculo candidato por nome não vale; o conteúdo falado decide, **entre todos os 10**.
**Armadilha já identificada:** há **dois** blocos de «motivo de consulta» — `s2-b01` (respiratório) e `s2-b06` (cardíaco). O áudio A (`Semio_-_Motivo_de_Consulta`) só se vincula depois de ouvir de qual deles fala.

| Bloco | Título | Termos mais distintivos do bloco (TF-IDF do texto da matéria; procurar no áudio) |
|---|---|---|
| `s2-b01` | Motivo de consulta respiratorio | hemoptisis, hematemesis, platipnea, trepopnea, mMRC, glotis, mucosas, tos inspiratoria/forzada, receptores |
| `s2-b02` | Síndrome Infeccioso (traqueobronquitis y bronquitis) | — (sem áudio candidato) |
| `s2-b03` | Síndrome Obstructivo (Asma y EPOC) | asma, espirometría, broncodilatador, reversibilidad, atopia, cociente (VEF1/CVF), hiperinsuflación, espiración |
| `s2-b04` | Síndrome Parenquimatoso (Condensación · Neumonía) | neumonía, nosocomial, CURB-65, urea, condensación, atelectasia, broncograma, soplo tubárico, vibraciones |
| `s2-b05` | Síndromes Pleurales (Derrame y Neumotórax) | neumotórax, derrame, trasudado/exudado, criterios de Light, toracocentesis, hidrotórax, hemotórax, abovedamiento |
| `s2-b06`…`s2-b10` | motivo cardíaco · insuficiencia cardíaca · HTA · ECG · sistema gástrico | — |

Para cada áudio o relatório do Claude trará: assunto identificado · bloco recomendado · confiança · trechos que justificam · dúvida residual. **Dúvida ⇒ `REVISÃO HUMANA NECESSÁRIA` e o áudio fica FORA do manifesto.**
Sons de ausculta (mp3 próprios, em `assets/audio/semio*`) **não** recebem o perfil de fala: nada deste pipeline os toca.

## 4. Manifesto (`RM_AUDIO_MANIFEST`) — só depois de confirmar

**Manifesto candidato desta etapa: VAZIO — `{"semiologia-ii":[]}`.** Nenhum dos 4 áudios foi acessado, ouvido, transcrito nem aprovado; portanto nenhum item pode entrar (item não confirmado fica de fora, e com ele fora nada aparece para ninguém).
**Não existe arquivo de manifesto no repositório de propósito:** a pasta publicada é a raiz (`publish = "."`), então qualquer arquivo versionado vira URL pública; o manifesto vive só na variável de ambiente.
`tools/audio/vinculos.exemplo.json` é o **modelo** do `vinculos.json` (4 masters, tudo `vinculo_confirmado:false`; ids/títulos «PROPUESTA»; o áudio A pergunta explicitamente `s2-b01` × `s2-b06`) — um teste garante que ele **não gera manifesto**.

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

## 5. Ativação — roteiro EXECUTÁVEL, em ordem (NADA disto foi feito; cada passo só começa se o anterior passou)

**Regras:** só José + `semiologia-ii`; item sem confirmação fica `ready:false` (ou fora do manifesto) e **não existe** para ninguém; nada de recurso pago sem a sua
autorização; produção só depois do ensaio em preview/projeto de teste. **Parar** em qualquer passo que falhe.

**Pré-requisitos (porteiros):** [x] #425, #430 e #431 (gancho do `rm-pilot.js`) **já na `main`** (ver §7) · [ ] os 4 áudios com vínculo **confirmado** e escuta aprovada (§3) ·
[ ] `manifesto.json` gerado por `montar_manifesto.py` (§4) · [ ] decisão Free × Pro de egress (README de `tools/qa/audio-server`).

1. **Ensaio no Supabase de TESTE** (exige a sua autorização — pode ter custo; **não** criado). Aplicar `.../supabase/migrations/20260930_01_audiobooks_bucket_privado.sql` e conferir:
   ```sql
   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'audiobooks';
   -- esperado: public=false · file_size_limit=31457280 (30 MB) · allowed_mime_types={audio/mp4,audio/x-m4a}
   select policyname, permissive, roles, cmd from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='audiobooks_deny_direct_access';
   -- esperado: 1 linha · permissive=RESTRICTIVE · roles={anon,authenticated} · cmd=ALL
   select policyname, permissive from pg_policies where schemaname='storage' and tablename='objects' and qual ilike '%audiobooks%' and permissive='PERMISSIVE';
   -- esperado: 0 linhas (nenhuma policy permissiva própria)
   ```
2. **Conferir os arquivos ANTES de subir** (local, não envia nada): `python3 tools/audio/verificar_upload.py --manifesto ~/audiobooks-tratados/manifesto/manifesto.json --pasta ~/audiobooks-tratados --plano ~/audiobooks-tratados/manifesto/plano-upload.md`
   — por item: derivado existe (e não é master), AAC-LC mono, **faststart**, decodifica limpo, ≤ 30 MB, duração = a do manifesto (± 1,5 s), `path` = `semiologia-ii/<audio_id>.m4a`; imprime o SHA-256. Só com `APROVADO` segue o upload.
   **Upload dos derivados** (painel do Supabase) no bucket `audiobooks`, **exatamente** nos `path` do `plano-upload.md` (`semiologia-ii/<audio_id>.m4a`), Content-Type `audio/mp4`. Masters **nunca** sobem.
3. **Variáveis do Netlify** com escopo **só «Deploy previews»** no ensaio: `RM_PILOT_AUDIO_UIDS` = UID do José (**só ele**) e `RM_AUDIO_MANIFEST` = conteúdo de `manifesto.json`.
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` já existem.) **Novo deploy de preview** e esperar terminar (a variável só vale no próximo build).
4. **Validação do servidor contra o preview** (só lê; o JWT vai por variável de ambiente e nunca é impresso):
   ```bash
   export RM_BASE=https://deploy-preview-<N>--<site>.netlify.app
   RM_TOKEN=<jwt do José>  RM_AUDIO_ID=<audio_id> node tools/qa/audio-server/smoke-remote.cjs on --save-src /tmp/src-<audio_id>.txt
       # ⇒ manifesto só com os 8 campos · URL do bucket privado (rota sign) · TTL ≤ 10 min · Range 206 ESTRITO (0-1, meio do arquivo, até o fim) · Content-Type de áudio · ≤ 30 MB
   RM_TOKEN=<jwt de OUTRA conta> node tools/qa/audio-server/smoke-remote.cjs deny      # outra conta: manifesto vazio + 404 uniforme
   node tools/qa/audio-server/smoke-remote.cjs deny                                       # sem token
   # ≥ 10 min depois do primeiro comando (a idade é conferida pelo arquivo guardado):
   RM_TOKEN=<jwt do José> RM_AUDIO_ID=<audio_id> node tools/qa/audio-server/smoke-remote.cjs expirada --src /tmp/src-<audio_id>.txt
       # ⇒ a URL antiga é RECUSADA pelo Storage e o servidor emite uma URL NOVA (reautorização)
   rm /tmp/src-<audio_id>.txt        # a URL guardada contém token de assinatura
   ```
   Todos têm de sair `OK`. O que o script **não** prova: Safari/iPad, decodificação do M4A, voz inteligível (ver quadro).
5. **Bloqueio direto ao bucket** (anon/authenticated): com a *anon key* e **sem** service_role, `GET <SUPABASE_URL>/storage/v1/object/audiobooks/semiologia-ii/<audio_id>.m4a`
   e `.../object/public/audiobooks/...` ⇒ **recusado** (400/401/403/404), nunca 200. Repetir logado como outra conta.
6. **Teste no navegador no preview** (§6) — o gancho do `rm-pilot.js` (#431) já está na `main`. **Se algo falhar:** esvaziar `RM_PILOT_AUDIO_UIDS` + novo deploy (corte; URLs já emitidas valem ≤ 10 min).
7. **Produção** (só com o ensaio 100 % verde e sua ordem expressa): repetir 1–5 no projeto de produção, variáveis no escopo de produção, **novo deploy**, `smoke-remote on/deny/expirada` contra produção, e o roteiro §6 com a sua conta.
   **Rollback:** esvaziar a variável + deploy; se precisar remover o bucket, esvaziá-lo no painel e rodar `..._rollback.sql` (aborta se houver objetos; nunca apaga objetos).

## 6. Roteiro do teste real no navegador (depois da ativação no preview/produção)

Conta do José, Semiología II. Abrir DevTools ▸ Network ▸ filtro `sign` (e `storage`) **antes** de abrir a matéria; Preserve log ligado.
1. **Card só para o José:** card nos blocos vinculados. **Outra conta** (e a conta deslogada): **nenhum** card nem player, nenhum arquivo `rm-audio*` carregado e 0 pedidos a `get-audio-*` além do manifesto vazio.
2. **Zero mídia antes do play:** abrir a matéria, rolar do início ao fim, expandir/recolher blocos ⇒ **0** pedidos a `/storage/v1/object/sign/` e nenhum `<audio>`/`new Audio()` com `src`.
3. **Play** solicita a URL **só no clique** (1 chamada a `get-audio-url`); o áudio começa; **pause** mantém a posição e o player.
4. **±15 s**, busca pela barra, **1× / 1,25× / 1,5× / 2× / 2,5×** (voz inteligível em cada uma — a escuta decide).
5. **Fechar** ⇒ pausa, guarda a posição, recolhe, foco volta ao card sem rolar. **Recarregar** ⇒ «Continuar · m:ss» sem mídia; **Continuar** retoma perto do ponto. **Restart** ⇒ 0, pausado, sem autoplay.
6. **A→B:** iniciar outro audiobook pausa o primeiro; **sem retomada automática**.
7. **Auscultação:** tocar um som de ausculta com o audiobook tocando ⇒ o audiobook **pausa** e **não retoma sozinho**; e o inverso.
8. **Caneta** (tablet/Apple Pencil, se houver): escrever com o áudio tocando; o player encolhe, **não pausa**; os traços ficam alinhados depois de recarregar.
9. **Expiração/reautorização:** com o player em pausa > 10 min, ao dar play a URL é renovada e a posição mantida; rede lenta (DevTools ▸ Slow 3G): «Cargando…» sem erro.
10. **Trocar de matéria** ⇒ pausa, guarda posição, cards e player somem; **logout** ⇒ pausa e remove cards (posição só da conta correta).
11. **iPad/Safari e Android/Chrome:** repetir 3–7 (autoplay, Range/206, bloqueio de tela, background) — **só aqui se prova o iOS**.

### Quadro de evidências — o que está COMPROVADO e o que depende de Storage real / Safari-iPad

| Item | COMPROVADO automaticamente (sintético / mp3-ogg / réplica) | Depende de **M4A real** | Depende de **Storage real** | Depende de **Safari/iPad** |
|---|---|---|---|---|
| Autorização do servidor (UID, manifesto, URL 10 min, negação uniforme, `no-store`, sem segredo) | ✅ `server.test.cjs` 97 | — | ⏳ `smoke-remote on/deny` | — |
| Migration/RESTRICTIVE/rollback, policies amplas, `service_role` | ✅ `migration.test.cjs` 110 (PostgreSQL 16 real, esquema `storage` **réplica**) | — | ⏳ passo 1 e 5 | — |
| Verificador do deploy (`smoke-remote`: Range 206 estrito, deny, off, **expirada**) | ✅ `smoke-remote.selftest.cjs` 13 (contra as funções reais + Storage falso) | — | ⏳ rodar contra o preview | — |
| Motor, A→B, close, restart, ±15 s, velocidades, retomada por UID | ✅ `audio.test.cjs` 589 (adapter sintético) | ⏳ decodificação | — | ⏳ |
| Integração: card, portões fail-closed, 0 mídia antes do play, ausculta, caneta simulada, 320→1920 | ✅ `integracao.test.cjs` 294 (mp3/ogg reais por HTTPS local, Layout V2 real) | — | — | ⏳ |
| **Caneta REAL (`rm-tools-v2.js`) + Layout real + áudio:** escrever tocando, alinhamento de traço **e** marca-texto ao inserir/remover cards e ao recarregar, pausar/fechar, troca de matéria e logout **durante o carregamento** | ✅ `caneta-real.test.cjs` 55 (banco falso em memória; sem tablet) | — | — | ⏳ Apple Pencil/tablet físico |
| Toolbox REAL × player (561–767 px, 720×450 a zoom 200 % e demais): área visível, hit-test e rolagem do painel, nos dois sentidos | ✅ `caneta-real.test.cjs` 136/137: **nenhuma sobreposição real** (o alerta anterior era falso positivo: botões recortados pelo painel rolável) | — | — | ⏳ confirmar em tablet físico (§9 #9) |
| Decodificação AAC/M4A, duração e faststart **reais**, `playbackRate` 2,5× | ❌ (o Chromium do Playwright não decodifica AAC) | ⏳ | — | ⏳ |
| Pipeline dos masters (cópias, STOI 1×/2×/2,5×, amostras, manifesto) | ✅ `tools/audio` 24 testes (master **sintético**) | ⏳ masters reais **não processados** | — | — |
| Voz inteligível / vínculo do bloco pelo conteúdo | ❌ | ⏳ escuta humana | — | — |

Não declarar «áudio real funcionando» antes de existirem: o relatório dos masters reais, o `smoke-remote` verde contra o Storage real e o roteiro §6 no navegador (incluindo iPad/Safari).

## 7. Dependências com o Claude 2 (dono de `rm-layout.*`, `rm-modes.js`, `rm-pilot.js`)

| Entrega | Dono | Estado em 2026-10-02 |
|---|---|---|
| **Hook no `rm-pilot.js`** (único ponto de ligação) | Claude 2 | ✅ **na `main` (#431)**: `pilot-gancho.test.cjs` 72/72 com o `rm-pilot.js` real; sem manifesto autorizado o boot carrega e nada aparece |
| ~~Sobreposição player × toolbox em 561–767 px / 720×450~~ | — | **retirada**: falso positivo do teste (botões recortados pelo painel rolável, acessíveis ao rolar); verificado por área visível + hit-test + rolagem nos Layouts da `main` e da #425 `cb84bff3` |
| Contrato consumido pelo áudio (não muda): `#rm-l2-player`, `html[data-rm-dock]`, `--rm-player-h`, `--rm-player-edge` | Claude 2 publica; Claude 4 consome | estável |

O áudio **não edita** esses arquivos. O gancho já está na `main`; `pilot-gancho.test.cjs` carrega o boot pelo `rm-pilot` real.

## 8. Ensaio em PREVIEW / Supabase de TESTE — valores concretos para revisão do José (nada aplicado)

**Quando começa:** os merges **#425, #430 e #431 já aconteceram** e os testes foram re-sincronizados com a `main` integrada (abaixo). O que falta é de conteúdo e autorização: masters, vínculos, escuta, Supabase de teste. Comando de re-sincronização (read-only) que o Claude roda, e o José pode rodar para conferir:
```bash
git checkout main && git pull
export NODE_PATH=$(npm root -g)
node tools/qa/browser-qa/audio-integracao/pilot-gancho.test.cjs        # 72/72 esperado (rm-pilot REAL carrega/para o boot, fail-closed)
node tools/qa/browser-qa/audio-integracao/caneta-real.test.cjs         # 136/137 esperado (caneta + layout + áudio reais; inclui toolbox × player por hit-test)
node tools/qa/browser-qa/audio-integracao/integracao.test.cjs          # 294 esperado
node tools/qa/browser-qa/audio/audio.test.cjs && node tools/qa/audio-server/server.test.cjs
```
(Verificado na `main` integrada (`a2b0e0e1`): `pilot-gancho` 72/72, `caneta-real` 137, `integracao` 294, `audio` 589, `server` 97, `migration` 110, `smoke-remote` autoteste 13, `tools/audio` 30.)

**Valores concretos propostos (revisar; nenhum aplicado):**

| Item | Valor | Observação |
|---|---|---|
| Bucket | `audiobooks` | privado: `public=false`, `file_size_limit=31457280` (30 MB), `allowed_mime_types={audio/mp4,audio/x-m4a}` |
| Policy | `audiobooks_deny_direct_access` | RESTRICTIVE, `for all to anon, authenticated`, nega o bucket; nenhuma policy permissiva criada |
| Migration | `supabase/migrations/20260930_01_audiobooks_bucket_privado.sql` (rollback `..._rollback.sql`) | já na `main` (#419) |
| URL assinada | 600 s (10 min) | `get-audio-url`, `no-store` |
| `RM_PILOT_AUDIO_UIDS` | `d4d215d3-36dd-4efb-8869-bdea5376c648` | UID do José (o mesmo `JOSE_UID` já público em `rm-tools-v2.js`); **só ele**; conferir no painel Auth antes de salvar |
| `RM_AUDIO_MANIFEST` (hoje) | `{"semiologia-ii":[]}` | **manifesto candidato VAZIO: nenhum áudio está confirmado/aprovado**, então nada pode aparecer. Só `montar_manifesto.py` o preenche, por áudio confirmado + escuta aprovada |
| Escopo das variáveis | «Deploy previews» (ensaio) | produção só depois do ensaio 100 % verde e sua ordem expressa |
| Paths dos objetos | `semiologia-ii/<audio_id>.m4a` | sugeridos pelo `plano-upload.md` |
| Ids/ordem propostos (NÃO confirmados) | A `s2-b01-…` · B `s2-b03-…` · C `s2-b04-…` · D `s2-b05-…` | o `audio_id`, `block_id`, `theme`, `title`, `order` finais saem do vínculo confirmado |

**Passos do ensaio (cada um exige a sua autorização explícita; o Claude não os executa sozinho):**
1. Supabase de TESTE (branch ou projeto; pode ter custo) → migration → SQL de verificação (§5.1) → upload dos derivados aprovados.
2. Variáveis só no escopo «Deploy previews» → deploy do preview.
3. `smoke-remote on / deny / expirada` (§5.4) contra o preview; bloqueio direto ao bucket (§5.5).
4. Teste no navegador, desktop (§6), e depois o teste físico (§9).
5. Relatório de evidências no PR; só então o José decide a produção.

## 9. Teste físico — Safari/iPad e Android/Chrome (depois do ensaio no preview)

Pré-requisito: preview ativo com **um** áudio aprovado. Aparelhos: iPad (Safari, com e sem Apple Pencil), iPhone (Safari), Android (Chrome, com e sem stylus). Conta do José; depois uma **outra** conta (deve não ver nada).

| # | Verificação | Passa se |
|---|---|---|
| 1 | Card só para o José; outra conta e deslogado | outra conta: 0 cards, 0 `rm-audio*`, 0 pedidos de áudio |
| 2 | Toque no card → player; URL só no toque | 1 chamada a `get-audio-url`; 0 mídia antes do toque (inspetor remoto: Safari Web Inspector / Chrome `chrome://inspect`) |
| 3 | Reproduzir/pausar; ±15 s; barra de posição (**Range/206**) | busca no meio do áudio funciona sem recomeçar do zero (200 em vez de 206 = reprova no iOS) |
| 4 | 1× / 1,25× / 1,5× / 2× / 2,5× | tom não muda (`preservesPitch`); voz inteligível em cada velocidade |
| 5 | Bloqueio de tela e app em segundo plano (iOS/Android) | comportamento documentado (pausa ou continua); ao voltar, estado coerente; sem erro |
| 6 | Fechar, recarregar, «Continuar» | retoma perto do ponto; restart = 0 sem autoplay |
| 7 | Auscultação × audiobook | iniciar ausculta pausa o audiobook e não retoma sozinho; e o inverso |
| 8 | **Caneta**: armar a caneta e escrever com o áudio tocando | o player encolhe (chip), **não pausa**; o traço sai sem atraso nem deslocamento; ao levantar a caneta nada salta |
| 9 | **Toolbox × player** em retrato e paisagem, janela baixa | com o painel da toolbox aberto (rolando-o se preciso) nenhum botão fica sob o player e nenhum controle do player fica sob a toolbox; todos os botões ficam acessíveis ao rolar o painel (automático: sem sobreposição; falta o tablet físico) |
| 10 | Inserção de cards com a caneta em contato | nada salta durante o contato; alinha depois de levantar |
| 11 | Expiração: pausar > 10 min e dar play | URL renovada, posição mantida |
| 12 | Trocar de matéria e sair da conta | pausa, cards somem; outra conta no mesmo aparelho não herda a posição |

Registrar por aparelho: modelo/OS/navegador, resultado (✅/❌) por linha e capturas. **Nada disto foi executado.**
