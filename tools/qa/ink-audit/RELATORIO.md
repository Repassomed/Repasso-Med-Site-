# Caneta (traços) — auditoria independente para expansão além do piloto

**Autor:** Claude 2 · **Base auditada:** `main` @ `5161ed2f1a1659de3fd382a9f0f0e4da3468ca06` (já com #412, #413 e #414) ·
**Branch desta entrega:** `claude/ink-audit-expansao` (só testes e este relatório; **nenhum** arquivo de produto foi alterado — `rm-tools-v2.js` e `index.html` ficaram intactos enquanto o Claude 1 os refina).

## 0. Parecer

| | |
|---|---|
| **Liberação geral (`ROLLOUT = 'all'`)** | **BLOQUEADA.** Mudar só esse interruptor expõe todo aluno ao caminho de caneta *anterior* à #412/#414 (o que falhou no iPad do José) e a 5 riscos de perda/duplicação de dados (§2). |
| **Ampliação controlada** | **APTA COM RESTRIÇÕES:** coorte pequena e nominal, poucas matérias, avisada de que «sem internet no momento de escrever = perde o traço» e de que o desenho não aparece sozinho em outro aparelho (só após recarregar). Gates separados do layout/audiobook (§7). |
| **Persistência e isolamento entre contas** | **OK** no que foi possível provar (§1): gravação confirmada → sessão independente recarrega os mesmos traços; RLS com duas identidades; policies/constraints de **produção idênticas** à migration (leitura de catálogo). |
| **O que NÃO foi provado** | Persistência na **infraestrutura real do Supabase** (não havia projeto Supabase de teste isolado — ver §8); qualquer compatibilidade **física** de iPad/Android/Windows; pinça/zoom ao desenhar; efeito de imagens reais no layout. |

## 1. O que está provado (e com que meios)

**Ambiente de teste (declarado):** Postgres 16 **real**, isolado (porta 54329), com a **migration real** `20260913_09_study_tools_v2.sql` aplicada sem alteração e as **policies reais** avaliadas pelo motor do Postgres (`SET LOCAL ROLE authenticated` + `request.jwt.claims`, o mecanismo do PostgREST). O navegador é Chromium real rodando o `rm-tools-v2.js` real + `supabase-js` real. **Emulados (e portanto não provam o Supabase):** o servidor PostgREST (`adapter.cjs`), o GoTrue, o gateway e o teto `max_rows`. `service_role`/superuser **só observa** o estado; nunca é prova de isolamento. Sem acesso ao PostgREST/Docker Hub (proxy bloqueia), não foi possível rodar o PostgREST original.

| Suíte | Resultado | O que prova |
|---|---|---|
| `01-rls` | **31/31** | RLS com duas identidades reais (A, B): B não lê/altera/apaga/insere traço de A (SQL direto e REST com sessões reais); anon não lê nem escreve; JWT adulterado vira anon; B não se auto-habilita na beta; constraints do banco (1..1200 pontos, cor, espessura, `anchor_id ≤ 200`). |
| `02-persistence` | **25/25** | desenhar → **resposta 201 confirmada** → fechar o contexto do navegador (storage e memória descartados) → **sessão independente (login novo)** carrega os **mesmos ids**; `desfazer` e borracha geram `DELETE` confirmado; `desfazer` da borracha **re-insere com novo id**; 2 sessões escrevendo ao mesmo tempo na mesma conta/matéria: **nenhum traço perdido, ids únicos**. |
| `03-failures` | **50/50** (documentam os riscos; ver §2) | rede lenta, requisição pendurada, offline, 5 códigos de rejeição, resposta perdida após commit, falha de DELETE, fechamento com operação pendente, traço denso. |
| `04-pagination` | **9/9** | teto de 1000 linhas (§2-A). |
| `05-viewports` | **41/41** + 2 achados | 9 perfis de tela emulados, rotação, redimensionar, pinch-zoom (só alinhamento), imagens (não exercitadas). |
| `06-volume` | **9/9** + 1 achado | curva por volume, 10 navegadores simultâneos, concorrência HTTP limitada. |

**Produção (somente leitura, catálogo e contagens agregadas, sem conteúdo):** RLS ligado; 4 policies `user_ink_strokes_*_self` só para `authenticated` (`user_id = auth.uid()`); constraints e índice **idênticos** à migration; `authenticated` tem `statement_timeout = 8 s`; **não há `max_rows` visível no banco** (é configuração do painel da API — confirmar lá). Uso real hoje: **47 traços, 2 usuários, máx. 30 por usuário/matéria, média 21 pontos/traço (máx. 195), tabela de 208 kB**, 307 perfis, 2 linhas na beta. Ou seja: a caneta quase não foi exercitada em produção, e a expansão será o primeiro teste de carga real.

**Sincronização entre aparelhos:** **não é instantânea.** Os traços só são lidos uma vez por carregamento de matéria; em `02-persistence` duas sessões abertas na mesma conta só veem os traços uma da outra **depois de recarregar**. Não existe Realtime/polling para traços. Não afirmar «sincronização em tempo real» para alunos.

## 2. Blockers concretos, correção mínima e responsável

Todos reproduzidos com teste (`tools/qa/ink-audit`). Os arquivos de produto são do **Claude 1** enquanto ele refina a renderização pós-#414; nada foi alterado aqui.

| # | Achado (evidência) | Risco | Correção mínima proposta | Responsável |
|---|---|---|---|---|
| **A** | **Truncamento silencioso em 1000 traços.** `carregarTracos()` faz **um** `SELECT` sem `ORDER BY` e sem `.range()`. Com `max_rows=1000`: 1001/1500/2500 no banco → **1000 carregados**, os **mais recentes ficam de fora**; o 1001º traço é gravado (201) mas **não aparece após recarregar** (`04-pagination`). Sem aviso. | Perda aparente de desenho; alunos que escrevem à mão (muitos traços curtos) chegam a 1000 em poucas páginas. | Paginar: `.order('created_at').order('id').range(i, i+999)` até vir página < 1000 (≈15 linhas). Conferir o **Max rows** no painel do Supabase. | Claude 1 (`rm-tools-v2.js`); José confirma o painel |
| **B** | **`DELETE` que falha é silencioso.** `apagarNoBanco()` só tem `try/catch`, mas o supabase-js **devolve** `{error}` e não lança. DELETE 500 ou conexão cortada → o traço some da tela, **sem nenhum aviso**, e **reaparece ao recarregar**; `desfazer` depois **cria cópia** (2 linhas para 1 desenho) (`03-failures` §6). | «Traço apagado que volta» e duplicação. | Checar `r.error`; avisar; guardar ids pendentes (memória + `localStorage`) e reenviar no próximo carregamento. | Claude 1 |
| **C** | **`INSERT` não é idempotente** (`id` gerado no servidor). (i) Conexão reiniciada depois do commit: o **próprio navegador reenviou o POST** → **2 linhas** para 1 traço (`03` §5a). (ii) 504 do gateway depois do commit: cliente mostra «No se pudo guardar», fica com id `tmp-`; **desfazer não envia DELETE** e o traço **reaparece**; redesenhar duplica (`03` §5b). | Duplicação e «desfeito que volta» em redes instáveis (4G/Wi-Fi de sala). | Enviar `id: crypto.randomUUID()` no insert (a tabela aceita id do cliente; RLS intacta) e tratar 23505 como sucesso: idempotente, e o undo passa a ter o id real desde o início. | Claude 1 |
| **D** | **Sem fila durável/reenvio, sem `keepalive`, sem aviso ao fechar.** Offline: traço só na memória da aba; ao voltar a rede **nada é reenviado** (0 POST em 5 s); fechar a aba com INSERT pendente = perda silenciosa (INSERT cortado antes de chegar ao servidor → 0 linhas). A falha é **avisada** por toast («No se pudo guardar el trazo.»), mas por **2,2 s** e o traço **continua desenhado** (parece salvo). Não há timeout: requisição pendurada 6 s+ sem aviso. | Perda de desenho com rede ruim. **Não é apresentado como sucesso** (há toast), mas é fácil não ver. | Mínimo: indicador persistente «sin guardar» no traço/toolbox enquanto `tmp-`; reenvio único ao voltar `online`. Fila durável completa = mudança maior (fora do mínimo). | Claude 1 |
| **E** | **Traço denso pode ser rejeitado pelo banco.** O cliente decima **uma vez** (`> 1200 → metade`); 3400 eventos com ruído alto geraram ~1400 pontos → POST 400 (corpo 26 KB), **traço perdido** (toast). | Perda de traços longos/«escritos rápido». | Decimar em laço até ≤ 1200 (ou dividir o traço). | Claude 1 |
| **F** | **Tinta deslocada após saltos em matéria longa.** Após **clique no índice** (salto seco) os traços **abaixo do destino** ficaram até **−6 106 px** fora do texto; numa matéria de ≈418 000 px (Histología II Práctica), rolagem rápida até um traço profundo deixou **14 124 px** de desvio **sem se corrigir em 12 s**. Rolagem contínua (roda do mouse) **não** reproduz. `RMToolsV2.reposicionar()` corrige na hora (as âncoras estão certas; as posições guardadas é que ficam velhas: o `ResizeObserver` só vê o tamanho do próprio bloco). Logo após **carregar**, há também 2–7 px de desvio vertical uniforme (`05`). | «Meu desenho sumiu/está no lugar errado» até redimensionar. | Chamar `reposicionar()` ao fim de rolagem/salto (`scrollend` com *debounce*) e/ou ao `contentvisibilityautostatechange`. | Claude 1 (renderização) · e Claude 2 no `irPara()` do layout B1 **depois** da auditoria da #411 |
| **G** | **Sem cota nem validação de matéria no servidor.** RLS só confere o dono: qualquer `authenticated` (inclusive conta não aprovada) pode inserir linhas ilimitadas com `subject_slug` qualquer. | Abuso de armazenamento (não de leitura). Não é bloqueio para coorte pequena; é **pré-requisito** para «todos». | Migration aditiva: gatilho de teto por usuário/matéria (ex.: 20 000) e checagem de `subject_slug` conhecido. **Não aplicada aqui** (mudança de banco exige decisão do José). | José (aprova) · Claude 2 rascunha o SQL |

**Risco menor:** `anotarPermitido()` («porta única» descrita nos comentários) **não é chamada por nenhum caminho de escrita** (só exposta em `_test`); a B2 do layout não pode presumir que ela já bloqueia traços.

## 3. Rede lenta / perda / rejeição / fechamento (resumo de `03-failures`)

| Situação provocada | Resultado observado |
|---|---|
| POST com 3 s de atraso | traço aparece na hora com id `tmp-`; banco 0 linhas por ~4 s; depois confirma (201) e remapeia o id. |
| POST pendurado 12 s, aba fechada | sem timeout nem aviso; o servidor **ainda gravou** porque a requisição já tinha chegado — o cliente nunca soube o resultado. |
| 500 / 401 / 403 / 429 / 503 | servidor recusa, **0 linhas**, toast de erro; traço continua na tela; **nenhum reenvio**; some ao recarregar. |
| Offline | toast de erro; ao voltar a rede, **0 reenvios**; traço feito online depois é gravado. |
| Conexão reiniciada após commit | **duplicação** (2 linhas) por reenvio automático do navegador. |
| 504 após commit | cliente vê falha; desfazer não apaga; traço **volta** ao recarregar; redesenhar **duplica**. |
| DELETE 500 / conexão cortada | silencioso; **reaparece**; desfazer **duplica**. |
| Fechar com INSERT cortado | perda silenciosa; código sem `keepalive`, `sendBeacon`, fila ou `beforeunload` (só as **notas** têm flush no `pagehide`). |

## 4. Paginação, payload e capacidade

- **Teto 1000 (emulado em `RM_MAX_ROWS`, padrão do Supabase):** 999/1000 carregam por inteiro; 1001+ carregam **só 1000**, sem duplicados, **1 única requisição**.
- **Payload:** o banco limita a **1..1200 pontos** (sem validar o intervalo numérico, por desenho). ≈18 bytes por ponto no JSON ⇒ um traço de 1200 pontos ≈ **22 KB** de corpo e ≈ **5,5 KB** no `jsonb`. Produção hoje: média 21 pontos (≈0,4 KB), máx. 195.
- **Curva por volume** (1 usuário/matéria, 40 pontos/traço, teto do servidor elevado; **sandbox, não produção**):

| Traços | Carga total (ms) | GET traços (ms) / KB | Heap JS (MB) | `reposicionar()` (ms) | Quadro p95 na rolagem (ms) | POST (ms) |
|---:|---:|---:|---:|---:|---:|---:|
| 0 | 1455 | 5 / 0 | 3 | 0 | 17 | 4 |
| 100 | 1476 | 9 / 73 | 3 | 12,6 | 17 | 4 |
| 500 | 1578 | 32 / 365 | 4 | 61,5 | 17 | 3 |
| 1000 | 2563 | 55 / 730 | 4 | 74,4 | 17 | 6 |
| 2500 | 3114 | 78 / 1827 | 8 | 97,2 | 17 | 3 |
| 5000 | 3814 | 163 / 3657 | 12 | 87,1 | 17 | 9 |

  Leitura: **a carga cresce ~0,5 ms por traço** (≈ +2,4 s com 5000) e transfere ~0,7 KB por traço (sem compressão no adaptador; o gzip do gateway real não foi medido). `reposicionar()` é **síncrono O(N)**: 75–97 ms a partir de 1000 traços e roda a cada redimensionar/rotação/observação — com 5000 traços provoca um travamento visível (>50 ms) em cada reajuste. Rolagem permaneceu em 60 fps neste Chromium desktop; **celular/tablet reais podem ser várias vezes mais lentos** (não medido).
- **Concorrência (ambiente isolado, com limites):** 10 navegadores simultâneos × 5 traços → 50/50 gravações 201, **nenhum traço perdido**, POST no servidor p50 3 ms / p95 10 ms (o total de 49 s é do navegador, não do servidor). Leituras HTTP simultâneas de 300 traços com pool de 40 conexões: K=10 p95 150 ms · K=50 p95 702 ms · K=150 p95 2,1 s · K=300 p95 3,8 s, **0 erros**. **Limites da conclusão:** CPU/RAM compartilhadas com os navegadores; Postgres local sem rede; não é o Supabase (plano, pooler, `statement_timeout = 8 s` e rede reais). **«300 cadastrados» não são 300 simultâneos:** o perfil de carga medido é **4 requisições REST para abrir a matéria** e **1 POST por traço** (nunca por ponto) — a estimativa de pico deve vir do número de alunos *escrevendo ao mesmo tempo*, que hoje é desconhecido.

## 5. Celular, tablet e computador — **emulação × físico**

*Emulação Chromium* (viewport, DPR, toque, rotação): 9 perfis (iPhone 13, iPhone paisagem, Pixel 7, 320×640, iPad retrato/paisagem, tablet Android, notebook 1366 @1,25×, desktop 1920): os 3 traços carregam em todos, **dx = dw = dh = 0** e sem overflow horizontal; rotação/redimensionamento ao vivo e pinch-zoom (escala 1,5/2/3×, só traços já carregados) **não alteram o alinhamento**. Ressalva: o desvio vertical pós-carga (2–7 px) e o achado F.

**Não provado por nenhuma automação:** hardware real (Apple Pencil, S Pen, caneta Windows), rejeição de palma, pressão, latência, `touch-action` no Safari, desenhar **com** pinça/zoom, imagens reais sobre rede 4G (a emulação não conseguiu disparar o carregamento *lazy* das imagens; o efeito sobre o layout **não foi exercitado**), bateria/memória de aparelhos reais. Os eventos `pointerType=pen` dos testes são **sintéticos**: provam só a rota de código.

## 6. Como está a liberação hoje (gates distintos)

| Gate | Onde | O que controla | Observação |
|---|---|---|---|
| **G1 — beta** | `ROLLOUT='beta'`, `BETA_UIDS` (2 UIDs), tabela `study_tools_beta` (leitura própria por RLS, sem policy de escrita) | quem recebe a **toolbox V2** | `ROLLOUT='all'` muda **só** este. A tabela permite acrescentar testers **sem deploy**. |
| **G2 — piloto físico** | `pilotoPermitido()` = UID do José **e** matéria `semiologia-ii` | todo o **comportamento novo** da caneta pós-#412 (contato antecipado, fallback de âncora, diagnóstico, proteção contra fechamento da toolbox) | Fora dele roda o código **anterior** à correção do iPad. |
| **G3 — Touch Events** | `ligarAdaptadorTouchStylus()`: `window.TouchEvent` **e** `st.uid === JOSE_UID` (+ `pilotoPermitido()` no uso) | adaptador de stylus por Touch Events | específico de iPad/Safari; hoje só a conta do José. |
| **Layout/audiobook** | `RM_PILOT_LAYOUT_UIDS` (Netlify, #411) | shell do layout V2 | independente; `get-pilot-flags` já devolve `pen`/`audio` mas **não são usados**. |
| **Dados** | RLS `user_id = auth.uid()` | só o dono lê/escreve | sem cota nem entitlement (achado G). |

**Consequência:** `ROLLOUT='all'` entregaria a todos o caminho **antigo** da caneta, exatamente o que o teste físico do José mostrou que falha no iPad.

## 7. Proposta de expansão coerente, reversível e separada do layout/audiobooks

1. **Antes de qualquer expansão:** corrigir A–E (F em paralelo) em `rm-tools-v2.js` (Claude 1) e repetir os testes afetados (tabela em §9). Confirmar o **Max rows** do painel (A continua necessário mesmo assim).
2. **Separar decisão de recurso do código:** em vez de novas listas de UID no JS, usar a tabela existente `study_tools_beta` com **uma coluna aditiva** (ex.: `pen_physical boolean not null default false`, `pen_touch boolean not null default false`, migration reversível). Cada aluno/dispositivo é ligado/desligado no painel **sem deploy** e **sem tocar** no layout (`RM_PILOT_LAYOUT_UIDS`) nem em áudio. `pilotoPermitido()` passa a ler a linha própria (já é lida em G1) em vez do UID fixo; `st.uid === JOSE_UID` do adaptador vira *feature-detect* + flag `pen_touch`.
3. **Degraus (cada um reversível pelo painel; dados já gravados não são apagados ao desligar — a toolbox some, os traços ficam):**
   - **S0 (hoje):** José + `semiologia-ii`.
   - **S1:** +3–5 testers nominais, **um por classe de aparelho** (iPad/Apple Pencil, tablet Android/stylus, Windows/caneta, Windows/mouse, celular), só `semiologia-ii`, cientes das restrições, com o checklist físico (§10).
   - **S2:** +matérias curtas (evitar as de >150 000 px até o achado F estar corrigido).
   - **S3:** coorte de ~10–30, monitorando erros de gravação (logs `POST /rest/v1/user_ink_strokes` ≥ 400) e contagem de traços por usuário.
   - **S4 (geral):** só com A–G resolvidos, checklist físico aprovado por classe de aparelho, cota no servidor e decisão explícita do José; então `ROLLOUT='all'`.
4. **Interruptor de emergência:** hoje `ROLLOUT='off'` exige **deploy**; com o desenho acima, `pen_physical=false`/`enabled=false` desliga sem deploy.
5. **Não declarar compatibilidade** de iPad, Android com stylus ou Windows com caneta/mouse por eventos sintéticos: só após o teste físico de cada classe.

## 8. Bloqueio declarado

Não existe projeto Supabase de teste isolado neste ambiente, e as gravações em produção são proibidas para esta auditoria. Por isso a **persistência na infraestrutura real do Supabase (PostgREST, GoTrue, gateway, rede) não foi comprovada**: os testes provam a lógica do cliente e as regras reais do banco (Postgres real + migration real + RLS real), não o serviço hospedado. Um teste ponta a ponta com **duas contas de teste** em um ambiente autorizado precisa ser feito pelo José (§10, itens 1–2) ou em um projeto/branch Supabase de teste, se for criado.

## 9. Repetir após o refinamento do Claude 1 (SHA final combinado)

| Se a mudança tocar… | Repetir |
|---|---|
| carregar traços (A) | `04-pagination`, `02-persistence`, `06-volume` |
| apagar/desfazer (B, C) | `03-failures` §5–6, `02-persistence` |
| gravação/idempotência (C, D, E) | `03-failures` (todas), `02-persistence` |
| posicionamento/renderização (F) | `05-viewports`, e `rm-layout` B1 `repos`/`coexist` se o layout for sincronizado |
| qualquer coisa | `01-rls` (inalterada) |

## 10. Checklist físico curto (só o que a automação não prova)

1. **Persistência real (2 aparelhos):** conta de teste → escrever 10 traços no iPad → fechar o app → abrir em **outro aparelho** → os 10 estão lá. Repetir com **outra conta**: não vê os do primeiro.
2. **Sem internet:** modo avião → escrever → aparece o aviso? → religar → o traço sumiu ao recarregar? (esperado hoje: sim).
3. **Palma + rolagem** com Apple Pencil (iPad) e com S Pen (Android); escrever 30 s sem o texto rolar.
4. **Windows:** caneta (ex. Surface) e mouse; botão da borracha; escrever e recarregar.
5. **Salto pelo índice** para um bloco profundo depois de ter traços em 3 blocos: a tinta aparece sobre o texto certo?
6. **Zoom de pinça ×2 e rotação** escrevendo e depois recarregando: alinhamento.
7. **Matéria com imagens** (Histología Práctica) em 4G: a tinta acompanha as imagens que carregam?
8. **Latência e fluidez** com ~100 traços na página (toque/lápis real).

## 11. Como reproduzir

Ver `README.md` (banco isolado com `db/setup.sh`, `supabase-js` UMD, `pg`, Playwright; `run-all.sh`). Os testes são **diagnósticos**: os de §3 passam **porque documentam o defeito** (marcados «RISCO/ACHADO»); quando o Claude 1 corrigir A–E, essas asserções devem ser **invertidas** (passam a exigir o comportamento correto). A suíte é sensível à carga da máquina; se o cenário 6 de `03-failures` falhar só numa execução completa, repetir a suíte isolada.
