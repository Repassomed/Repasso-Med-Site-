# Audiobooks (piloto Semiología II) — estado OPERACIONAL em 2026-10-09

> **Código mergeado não comprova serviço funcionando.** Este documento separa o que foi **verificado agora** do que **só está no código/runbook** e do que **ninguém verificou**. Nenhuma variável, bucket, objeto, função ou flag foi alterado (Supabase: só `select`). Nenhum rollout.

## 0 · Lista curta — o que realmente depende de José (atualização de 10/10)

Tudo o que dava para conferir **em leitura** foi conferido (§1). Falta só isto, e **só José** (ou quem administra Netlify/Supabase) consegue:

1. **Netlify, escopo de produção:** `RM_AUDIO_MANIFEST` existe (4 itens `ready:true`) e `RM_PILOT_AUDIO_UIDS` tem a conta de José. *(Existir basta; não colar valores no chat.)*
2. **Netlify:** `SUPABASE_SERVICE_ROLE_KEY` presente e as funções `get-audio-manifest` / `get-audio-url` aparecem na lista de Functions do deploy publicado, com deploy **posterior** às variáveis.
3. **Ouvir e confirmar o vínculo:** «Motivo de Consulta» é do `s2-b01` (respiratório) ou do `s2-b06` (cardíaco)? Hoje o arquivo subiu como `s2-b01-…` sem registro de escuta.
4. **Rodar o `smoke-remote.cjs on/deny/expirada` contra o site publicado** (precisa do JWT de José, que o Claude não recebe) **ou** simplesmente abrir Semiología II e ver se o card «Audiobook» aparece e toca.
5. **iPad/Safari e Android/Chrome:** tocar 1 áudio com Range/seek (único ponto que só aparelho real prova).

**Regra para o teste da caneta:** se o card de audiobook **não aparecer**, a parte «com áudio» do `PASSO-FINAL-JOSE.md` fica **«não executada»** e **não** conta como falha da caneta. A primeira causa a checar é a lista acima (itens 1–2), nunca o código da caneta.

## 1 · Verificado hoje (Supabase, leitura)

| Item | Resultado | Como |
|---|---|---|
| Bucket `audiobooks` existe e é **privado** | `public=false` (confirmado) | `select … from storage.buckets` |
| Policy `audiobooks_deny_direct_access` | **RESTRICTIVE**, roles `{anon, authenticated}`, cmd `ALL` | `pg_policies` |
| Limite e tipos do bucket | `file_size_limit = 41943040` (40 MiB, migration `20261006_01` aplicada) · `allowed_mime_types = {audio/mp4, audio/x-m4a}` | `storage.buckets` |
| Policies permissivas próprias do bucket | **0** (só a RESTRICTIVE acima) | `pg_policies` (runbook §5, passo 1) |
| Acesso direto com a chave anônima (`/object/…`, `/object/public/…`) | **não verificável daqui**: o ambiente do Claude não alcança `*.supabase.co` (conexão recusada). Pela policy RESTRICTIVE esperado 400/401/403/404 — fica na lista curta (item 4) | `curl` (sem resposta) |
| Workflow «Processar audiobooks» (Drive → runner) | 2 execuções manuais em 05/10, ambas `failure` («AGUARDANDO CONFIGURAÇÃO» por desenho). **Irrelevante para o piloto**: os 4 arquivos subiram pelo painel do Supabase, não por esse workflow | Actions |
| Objetos no bucket | **4**, todos `audio/x-m4a`, subidos em 2026-10-06 | `storage.objects` |
| `semiologia-ii/s2-b01-motivo-consulta.m4a` | 36 758 530 B | idem — mesmo tamanho do arquivo do Drive |
| `semiologia-ii/s2-b03-epoc.m4a` | 33 468 886 B | idem |
| `semiologia-ii/s2-b04-parenquimatoso.m4a` | 15 722 673 B | idem |
| `semiologia-ii/s2-b05-pleural.m4a` | 22 662 090 B | idem |

Os tamanhos batem **byte a byte** com o inventário do runbook. O nome do arquivo `s2-b01-…` indica que "Motivo de Consulta" foi vinculado ao bloco respiratório **no upload**; **não encontrei registro de que José confirmou esse vínculo por escuta** (o runbook exige essa confirmação: `s2-b01` × `s2-b06`).

## 2 · Só no código/runbook (mergeado, NÃO comprovado em produção)

| Peça | Onde | O que o código garante (testado em CI/local com réplicas) | O que NÃO prova |
|---|---|---|---|
| Servidor: `get-audio-manifest` / `get-audio-url` | `netlify/functions/*.js`, `_audio/lib.js` | UID autenticado ∈ `RM_PILOT_AUDIO_UIDS`; manifesto de 8 campos; URL assinada ≤ 10 min só no play; negação uniforme 404; `no-store` | que as funções **estão no deploy de produção**, nem que respondem 200 com o JWT real |
| Cliente: `rm-audio-boot.js` | carregado por `rm-pilot.js` **só** com Layout V2 ativo + manifesto **do servidor** não vazio | 0 mídia antes do play; ausculta × audiobook; caneta encolhe o player sem pausar | decodificação AAC/M4A real, Safari/iPad, voz inteligível a 2×/2,5× |
| Pipeline `tools/audio/*` | scripts + 24 testes (master sintético) | cópias, STOI, manifesto | os masters reais **não foram processados** (os 4 `.m4a` subiram **como estão**, sem conversão) |

Cadeia mínima para **existir um card** de audiobook para José: `layout` e `visual` ligados para a conta → `rm-pilot.js` carrega `rm-audio-boot.js` → `get-audio-manifest` com JWT válido, UID em `RM_PILOT_AUDIO_UIDS` e `RM_AUDIO_MANIFEST` com itens `ready:true`. **Qualquer elo ausente ⇒ nenhum card, sem erro visível** (falha fechada por desenho). Portanto "não aparece" é ambíguo: pode ser variável vazia, função fora do deploy, JWT, ou flag.

## 3 · O que NINGUÉM verificou (e como verificar)

| Pendência operacional | Quem pode verificar | Evidência esperada |
|---|---|---|
| `RM_AUDIO_MANIFEST` definida **no escopo de produção** e válida (4 itens, `block_id` corretos, `ready:true`, `duration` real) | José (Netlify ▸ Environment variables) | existir; sem colar o valor no chat |
| `RM_PILOT_AUDIO_UIDS` = só a conta de José (ou a lista decidida) | José | idem |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` presentes no escopo usado | José | existir |
| Funções `get-audio-manifest` e `get-audio-url` aparecem em **Functions** do deploy publicado | José | lista de funções do deploy |
| Deploy de produção **posterior** à definição das variáveis (variável só vale no próximo build) | José | data do deploy > data da variável |
| Fluxo ponta a ponta: `smoke-remote.cjs on/deny/expirada` contra o URL publicado | quem tem o JWT de José (o Claude não recebe credenciais) | 3 execuções `OK` (README de `tools/qa/audio-server`) |
| Acesso direto ao bucket com a chave anônima recusado | Claude pode fazer em leitura **depois** de José autorizar o teste | 400/401/403/404, nunca 200 |
| Vínculo bloco × áudio por escuta (`s2-b01` × `s2-b06`) e demais três | José | decisão registrada |
| Reprodução em iPad/Safari e Android/Chrome (Range/206, bloqueio de tela) | José | roteiro §6 do runbook |
| Egress/cota do plano Free (≈ 0,74 GB egress usado no ciclo; 4 áudios ≈ 0,109 GB por audição completa) | José (Usage no Supabase) | painel |

**Alcance do que dá para dizer hoje:** o *armazenamento* está correto e privado; o *serviço* (funções + variáveis + deploy) **não está comprovado**. Se o card não aparecer para José, a primeira checagem é a lista acima, não o código.

## 4 · Relação com o teste da caneta (#456)

O roteiro físico (`PASSO-FINAL-JOSE.md`) pede escrever **com o audiobook tocando**. Isso só é possível se a cadeia da §2 estiver completa para a conta de José. **Se não houver card de audiobook, a parte "com áudio" do roteiro é marcada "não testável" e NÃO reprova a caneta** — a cobertura automática dessa interação (`caneta-real.test.cjs`, 55; `integracao.test.cjs`, 294) usa banco falso e adaptador sintético, não áudio real.

## 5 · Fora de escopo (registrado)

- Audiobooks para as 27 matérias: bloqueado (servidor fixo em `semiologia-ii`, manifesto em variável ≈ 4 KB ≈ 14 itens). Ver `PENDENCIAS-ENSAIO-GLOBAL.md` #7 e `tools/audio/PILOTO-SEMIO2-PAINEL.md`.
- Decisão Free × Pro: de José; nada pago foi ativado.
