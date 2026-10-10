# #456 · PR #470 — como José testa EXATAMENTE a versão nova (preview × publicação restrita)

> Estado: 🔵 **AGUARDANDO DECISÃO DE JOSÉ** · PR #470 em **draft** · nada foi mesclado, publicado, ativado nem alterado em flags/UIDs/Supabase.
> Nesta página: (1) quem tem acesso efetivo hoje, (2) o que se sabe do preview, (3) a proposta concreta de merge + publicação restrita, com gates, impacto e reversão **demonstrada**, (4) como reconhecer o build na tela.
> Regra: **testar a `main` atual não prova o #470.** O aviso `caneta #456 · build 2026-10-09·456c` (ao abrir a caixa) e a 1.ª linha do diagnóstico são a prova.

## 1 · Contas com acesso efetivo hoje (sem ampliar elegibilidade)

Fonte: Supabase em **leitura** (zero escritas) + código do repositório. As listas do Netlify (`RM_PILOT_LAYOUT_UIDS`, `RM_PILOT_VISUAL_UIDS`, `RM_PILOT_PEN_UIDS`, `RM_PILOT_AUDIO_UIDS`) são variáveis de ambiente: **não são legíveis daqui**.

| Camada | Quem | Evidência | Efeito do #470 |
|---|---|---|---|
| **V2 / toolbox de estudo** (a caneta) | **exatamente 2 contas**: José e uma 2.ª conta | `study_tools_beta` = 2 linhas, ambas `enabled`, e as mesmas 2 estão em `BETA_UIDS` no código (`rm-tools-v2.js`); 0 outras linhas | nenhuma mudança de quem entra; a V2 continua sem montar para qualquer outra conta (testado com UID estranho + `pen:true`: nada monta) |
| **Piloto físico da caneta** (refinamentos + guarda + aviso de build) | José (conta fixa no código) **e** quem o servidor devolver `pen:true` (`RM_PILOT_PEN_UIDS`), **somente** em Semiología II | `pilotoPermitido()` | a 2.ª conta só entra no piloto físico se estiver em `RM_PILOT_PEN_UIDS` **e** já tiver V2. Se não estiver, vê a caneta como hoje (testado: sem selo, sem guarda) |
| **Layout V2 + tema** (`layout`, `visual`) | quem estiver nas listas do Netlify | não legível daqui | o #470 não toca esses gates |
| **Audiobooks** | `RM_PILOT_AUDIO_UIDS` | não legível daqui; ver `docs/layout-ensaio/AUDIOBOOKS-ESTADO-OPERACIONAL.md` | o #470 não toca |

Resposta objetiva à pergunta da auditoria: **a 2.ª conta já tem a V2 pelo caminho legado** (`BETA_UIDS` **e** `study_tools_beta`); `pen:true` sozinho **não** dá a V2 — só liga os refinamentos do piloto físico para quem já a tem. Se a 2.ª conta é a mesma que está em `RM_PILOT_PEN_UIDS` no Netlify, **não dá para saber daqui**: o painel de diagnóstico da própria conta mostra isso (linha 2: `acesso à V2: …` · `flags do servidor: layout=… visual=… pen=…`), sem UID.

## 2 · Preview (Deploy Preview) — o que se sabe

- A PR #470 só tem checks do Netlify `Pages changed` / `Header rules` / `Redirect rules` do deploy `6ac72fa5ac83e3000887790e`, todos `neutral`, concluídos em **7 s** (05:52:39 → 05:52:46Z) — compatível com um deploy **cancelado** pelo site (como José viu). Isso vale também para as PRs #462, #465 e #473: **todas** aparecem canceladas, ou seja, não é falha desta PR.
- O repositório **não** define `ignore` em `netlify.toml`; portanto o cancelamento vem da **configuração do site no painel do Netlify** (Build & deploy → Continuous deployment → *Branches and deploy contexts* / *Build status* / *Ignore builds*), não do código.
- Do ambiente do Claude **não é possível** alcançar `*.netlify.app` (proxy responde 403) nem abrir o painel do Netlify. **Nenhum URL de preview foi verificado e nenhum será prometido.** O que segue são passos para José/quem administra o Netlify, não evidência de funcionamento.

**Se José quiser tentar o preview** (≈ 5 min no painel; se algum item não existir, o preview é inviável → ir para a §3):
1. Netlify ▸ site `repassomed` ▸ **Deploys** ▸ filtrar `Deploy Previews` ▸ o deploy da #470 (`6ac72fa5…`) ▸ ver o motivo do cancelamento (a linha do log diz se foi *Ignore command* ou *deploy previews desligados*).
2. Site configuration ▸ Build & deploy ▸ Continuous deployment ▸ **Deploy Previews** = *Any pull request against your production branch* (não *None*). Se havia comando de *Ignore builds*, ele precisa deixar o contexto `deploy-preview` passar.
3. **Trigger deploy ▸ Deploy site** a partir do branch `claude/caneta-real-456` (*Branch deploys* ligado para esse branch), ou **Retry deploy** no preview.
4. **Variáveis de ambiente com escopo de preview** (sem elas as funções negam tudo e o piloto não abre): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e as listas `RM_PILOT_LAYOUT_UIDS`, `RM_PILOT_VISUAL_UIDS`, `RM_PILOT_PEN_UIDS` com o escopo *Deploy previews* (ou *All scopes*). Não colar valores no chat.
5. **Login:** o domínio `deploy-preview-470--repassomed.netlify.app` (nome provável, não verificado) precisa estar nas *Redirect URLs* do Supabase Auth se o login for por link/OAuth; senha/e-mail funciona em qualquer origem.
6. **Atenção:** o preview usa o **mesmo Supabase de produção**: o que José desenhar no preview **grava** na conta real (mesmo formato de hoje, sem migração). Desfazer a PR depois **não** apaga traços já gravados — por isso, só escreva em um bloco de teste.
7. Abrir o URL, entrar em Semiología II e abrir a caixa de ferramentas e conferir o aviso `caneta #456 · build 2026-10-09·456c` (ou a 1.ª linha do diagnóstico). Sem ele ⇒ não é o #470.

## 3 · Alternativa: merge + publicação restrita ao piloto (PROPOSTA — **não executada**)

**Por que "restrita":** o site publica a `main` para todos os alunos (publish `.`). O que *restringe* o #470 são os **gates do código**, não o deploy:

| Gate | Onde | Quem passa |
|---|---|---|
| Matéria | `SLUG = 'semiologia-ii'` em `rm-pilot.js` / `pilotoPermitido()` | só Semiología II |
| Flags do servidor | `get-pilot-flags` (`layout` + `visual`; env do Netlify) | só as contas das listas |
| Acesso à V2 | `BETA_UIDS` / `study_tools_beta` | 2 contas (§1) |
| Piloto físico | `JOSE_UID` ou `pen:true` | José e, se estiver na lista, a 2.ª conta |

**Impacto para quem NÃO está no piloto (demonstrado por teste, 138/138 em `caneta-456.test.cjs`):**
- estudante comum: a V2 não monta — nenhuma toolbox, guarda ou aviso (mesmo que o servidor devolvesse `pen:true`);
- conta beta sem piloto físico: caneta como hoje; única diferença é um `<div id="rm2-penguard">` inerte (`display:none`) e a classe `rm2-pilot-guard` ausente — a regra de toque legada continua valendo (testado);
- outras matérias: sem mudança (testado);
- `rm-materia-sistema.js` só é carregado no piloto visual; a escrita de `--rm-dock-h` mudou só para essa camada;
- `index.html`: apenas as tags `?v=` (`rm-tools-v2.js?v=2026100901`, `rm-pilot.js?v=2026100803`) — força o navegador a baixar os arquivos novos.

**Reversão (demonstrada, sem deploy de código novo):**
1. *Corte imediato de um comportamento:* no próprio aparelho, o botão **«Sin guarda: sí»** do painel volta à regra de toque antiga (A/B ao vivo, testado).
2. *Netlify, 1 clique:* **Deploys ▸ (deploy anterior à publicação) ▸ Publish deploy** — o Netlify volta ao build anterior sem rebuild.
3. *Git:* `git revert -m 1 <commit de merge>` na `main`. **Simulado em worktree descartável**: `origin/main` + merge do #470 (`a4a9a9c8`) + `revert -m 1` ⇒ **a árvore resultante é idêntica à da `main` original** (`ea217ef8…` = `ea217ef8…`). Nenhuma migração, nenhum dado novo; traços gravados continuam válidos (mesmo formato).
4. *Reduzir o alcance sem deploy:* esvaziar `RM_PILOT_PEN_UIDS` (o piloto físico some para a 2.ª conta) ou `RM_PILOT_VISUAL_UIDS` (o tema sai); a V2 de José/da 2.ª conta permanece como hoje.

**Passos propostos (todos dependem de ordem expressa de José; o Claude não os executa):**
1. José responde «autorizo merge do #470 para teste restrito» **depois** da auditoria do ChatGPT.
2. Marcar a PR *Ready for review* → merge na `main` (com o commit final do build `2026-10-09·456c`).
3. Esperar o deploy de produção terminar; conferir o `?v=` no `index.html` publicado.
4. José roda o `PASSO-FINAL-JOSE.md` (§0 confirma o build).
5. Resultado volta à #456: **ok** ⇒ José fecha a #456; **problema** ⇒ reversão 1/2 acima e diagnóstico (`Copiar resumen`).

**Risco residual:** MÉDIO-BAIXO. Produção passa a servir `rm-tools-v2.js` novo a todas as contas que já o carregam hoje (as 2 contas da V2): para elas, fora do piloto físico, o comportamento é o de antes (testado), mas o arquivo é novo — por isso o aviso de build/diagnóstico e a reversão em 1 clique.

## 4 · Parecer

**«precisa merge/publicação restrita para permitir o teste»** — porque o preview está cancelado em todas as PRs, é inalcançável daqui e depende de configuração que só José/Netlify podem mudar. Se José conseguir um preview funcional pelos passos da §2 (build conferido), ele **substitui** o merge. Em nenhum dos casos o Claude executa merge ou publicação, e a #456 **não** é fechada antes do resultado físico.
