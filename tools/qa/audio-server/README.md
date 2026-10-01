# Audiobook real · autorização no servidor (D2 — preparado, NÃO ativado)

Nada aqui é carregado por página alguma, nenhum bucket foi criado, nenhum arquivo de áudio foi enviado, nenhuma variável foi
definida. Tudo é código + testes para o José auditar:
* `node tools/qa/audio-server/server.test.cjs` — autorização/entrega (Node, sem rede, sem Supabase real);
* `node tools/qa/audio-server/migration.test.cjs` — migration e rollback executados num **PostgreSQL 16 real e descartável**
  (cluster temporário local, réplica mínima do esquema `storage`; requer os binários `initdb`/`pg_ctl`/`psql`, ou `RM_PGBIN`).

## Arquitetura (uma só)

```
navegador ──(JWT)──► get-audio-manifest ─► metadados prontos (8 campos, sem URL/caminho)
navegador ──(JWT, audio_id)──► get-audio-url ─► URL assinada 10 min do bucket privado `audiobooks`
                                   │  1) JWT → /auth/v1/user (Supabase decide quem é)
                                   │  2) UID ∈ RM_PILOT_AUDIO_UIDS  e  slug = semiologia-ii
                                   │  3) audio_id ∈ manifesto PRONTO do servidor (caminho só existe lá)
                                   └  4) service_role (só no servidor) assina o objeto
<audio> ──(Range/206)──► Supabase Storage (URL assinada expira em 10 min; o motor reautoriza sem perder o ponto)
```

* **Quem é piloto:** UID autenticado (variável de ambiente, **nunca no repositório**), nunca só `is_admin`/e-mail/beta antiga.
* **Negação uniforme:** qualquer falha (sem token, token inválido, UID fora da lista, outra matéria, áudio inexistente/pendente,
  Supabase fora do ar…) devolve exatamente a mesma resposta (404 `{error:"unavailable"}`; manifesto vazio com 200).
* **O cliente nunca escolhe caminho nem bucket:** só o `audio_id`; `path`/`bucket`/`url`/`token` na query são ignorados.
* **Sem acesso direto ao bucket:** policy RESTRICTIVE própria nega `audiobooks` a `anon`/`authenticated` (e nunca concede nada).
* **Manifesto fora do repositório:** a pasta publicada é a raiz (`publish = "."`), então qualquer arquivo versionado vira URL.
  O manifesto vem da variável `RM_AUDIO_MANIFEST` (JSON). Item `ready:false`, com campo desconhecido, caminho inseguro ou que
  não passe no validador do motor (recusa URL/caminho/token no título, etc.) **não existe** para o cliente.
* **Limite do ambiente:** variáveis de função do Netlify somam ~4 KB. Serve para os 4 áudios do piloto; para 8–10 por matéria ×
  27 matérias o manifesto passa para uma tabela/arquivo privado (decisão da D3, antes de escalar).

## O que o José precisa fazer para ATIVAR (nada disto foi feito)

1. **Masters → cópias M4A tratadas** (inspeção + 48 × 64 kbps + faststart) e conferir pela escuta o vínculo bloco↔áudio.
2. **Aplicar** `supabase/migrations/20260930_01_audiobooks_bucket_privado.sql`. É **idempotente e corretiva**: deixa SEMPRE o bucket
   `audiobooks` com `public=false`, 30 MB e só `audio/mp4`/`audio/x-m4a` (mesmo que ele já exista público ou com limite/MIME antigos)
   e instala **uma** policy **RESTRICTIVE** (`audiobooks_deny_direct_access`, `for all to anon, authenticated`, `using` e `with check`
   `bucket_id is distinct from 'audiobooks'`). No Postgres, acesso exige passar em ≥1 policy permissiva **e em todas as restritivas**:
   assim nenhuma policy permissiva — hoje (`using (true)`, `bucket_id is not null`, `bucket_id = bucket_id`, `bucket_id <> 'x'`, INSERT/UPDATE/DELETE
   amplos, `for all to public`…) ou no futuro — alcança `audiobooks`, **sem depender de ler o texto de outras policies**. A barreira só
   nega, nunca concede; a `service_role` (BYPASSRLS, só no servidor) não é afetada; os outros buckets seguem pelas policies deles.
   A migration **não lê nem apaga policies alheias**; aborta sem alterar nada se a RLS de `storage.objects` estiver desligada.
3. **Enviar** as cópias ao bucket `audiobooks` (painel do Supabase), p.ex. `semiologia-ii/<nome>.v1.m4a`.
4. No Netlify definir: `RM_PILOT_AUDIO_UIDS` = UID da conta principal; `RM_AUDIO_MANIFEST` = JSON
   `{"semiologia-ii":[{"audio_id":"…","block_id":"s2-b01","theme":"…","title":"…","duration":SEGUNDOS,"order":1,"version":"v1","path":"semiologia-ii/….m4a","ready":true}]}`.
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem.)
5. **Verificar** (com a sessão do José e com outra conta): manifesto lista os itens só para José; `get-audio-url` devolve
   `src` do bucket só para José; outra conta e outra matéria recebem a negação idêntica.

**Desativar (kill switch, sem deploy):** esvaziar `RM_PILOT_AUDIO_UIDS` (ou `RM_AUDIO_MANIFEST`). **Rollback real** (`..._rollback.sql`): bucket vazio ⇒ remove `audiobooks` **e só a policy própria** (nome exato); com objetos ⇒ **aborta,
não apaga nada e a barreira continua ativa** (apague os objetos pelo painel e rode de novo). Os dois scripts rodam como um único bloco atômico.

## Custos / egress

URL de 10 min + `preload="none"` + nada antes do play mantém o tráfego ao mínimo, mas o plano Free tem 5 GB de egress **unificado com
Auth/DB**. 4 áudios de ~0,7–1 h a 48–64 kbps pesam ~20–30 MB cada; 100 reproduções completas ≈ 2–3 GB. Decisão Free × Pro (ou storage
com egress barato atrás da mesma função) é do José **antes** de escalar (D13 do plano).
