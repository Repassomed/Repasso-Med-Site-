# Audiobook real · autorização no servidor (D2 — preparado, NÃO ativado)

Nada aqui é carregado por página alguma, nenhum bucket foi criado, nenhum arquivo de áudio foi enviado, nenhuma variável foi
definida. Tudo é código + testes para o José auditar. `node tools/qa/audio-server/server.test.cjs` (Node, sem rede, sem Supabase real).

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
* **Sem acesso direto ao bucket:** a migration não cria política alguma (RLS fecha `anon` e `authenticated`).
* **Manifesto fora do repositório:** a pasta publicada é a raiz (`publish = "."`), então qualquer arquivo versionado vira URL.
  O manifesto vem da variável `RM_AUDIO_MANIFEST` (JSON). Item `ready:false`, com campo desconhecido, caminho inseguro ou que
  não passe no validador do motor (recusa URL/caminho/token no título, etc.) **não existe** para o cliente.
* **Limite do ambiente:** variáveis de função do Netlify somam ~4 KB. Serve para os 4 áudios do piloto; para 8–10 por matéria ×
  27 matérias o manifesto passa para uma tabela/arquivo privado (decisão da D3, antes de escalar).

## O que o José precisa fazer para ATIVAR (nada disto foi feito)

1. **Masters → cópias M4A tratadas** (inspeção + 48 × 64 kbps + faststart) e conferir pela escuta o vínculo bloco↔áudio.
2. **Aplicar** `supabase/migrations/20260930_01_audiobooks_bucket_privado.sql` (cria o bucket **privado**, 30 MB, só M4A; sem políticas).
3. **Enviar** as cópias ao bucket `audiobooks` (painel do Supabase), p.ex. `semiologia-ii/<nome>.v1.m4a`.
4. No Netlify definir: `RM_PILOT_AUDIO_UIDS` = UID da conta principal; `RM_AUDIO_MANIFEST` = JSON
   `{"semiologia-ii":[{"audio_id":"…","block_id":"s2-b01","theme":"…","title":"…","duration":SEGUNDOS,"order":1,"version":"v1","path":"semiologia-ii/….m4a","ready":true}]}`.
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem.)
5. **Verificar** (com a sessão do José e com outra conta): manifesto lista os itens só para José; `get-audio-url` devolve
   `src` do bucket só para José; outra conta e outra matéria recebem a negação idêntica.

**Desativar (kill switch, sem deploy):** esvaziar `RM_PILOT_AUDIO_UIDS` (ou `RM_AUDIO_MANIFEST`). Reversão do bucket: ver o `_rollback.sql`.

## Custos / egress

URL de 10 min + `preload="none"` + nada antes do play mantém o tráfego ao mínimo, mas o plano Free tem 5 GB de egress **unificado com
Auth/DB**. 4 áudios de ~0,7–1 h a 48–64 kbps pesam ~20–30 MB cada; 100 reproduções completas ≈ 2–3 GB. Decisão Free × Pro (ou storage
com egress barato atrás da mesma função) é do José **antes** de escalar (D13 do plano).
