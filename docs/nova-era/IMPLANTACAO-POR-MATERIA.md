# Nova Era · implantação real, matéria por matéria, em duas etapas

> **Nada é ligado por esta PR.** Tudo nasce desligado (`off`). Quem liga, por matéria e por recurso, é José, com uma linha de SQL, e desliga com outra, sem deploy.

## 1 · Em palavras simples

Cada matéria tem **uma linha** numa tabelinha do Supabase (`rm_materia_rollout`) com **três botões independentes**: **layout novo**, **caneta** e **tema visual**. Cada botão tem três posições:

| Posição | Quem enxerga |
|---|---|
| `off` | ninguém (padrão) |
| `preview` | **só administradores** (`profiles.is_admin`; hoje **1 conta: José**) — é a etapa «José vê e aprova no iPad». **Não depende** das listas `RM_PILOT_*_UIDS` do Netlify (que servem também a outros testadores do piloto) |
| `all` | **todos os alunos que já têm acesso àquela matéria** (mesma regra de acesso do site: matéria comprada e dentro da validade) |

Como são botões separados: layout pode estar em `all` e caneta em `off` (ou o contrário). Aluno **sem acesso** não recebe nada. **Outra matéria** não é afetada (cada uma é uma linha). **Não existe** botão «todas as matérias».

## 2 · O que a auditoria encontrou (antes → depois)

| # | Achado | Efeito | Solução |
|---|---|---|---|
| 1 | O servidor só liberava por **listas de contas de teste** (`RM_PILOT_LAYOUT_UIDS`, `RM_PILOT_PEN_UIDS`) | impossível chegar a um aluno sem colocar cada um nas listas | as listas ficam **só para o piloto (Semiología II)**; fora dele a etapa 1 (`preview`) é **só administrador** e a etapa 2 (`all`) libera por **acesso à matéria**, sem listar aluno nenhum |
| 2 | A caneta (V2) só montava para `BETA_UIDS`/`study_tools_beta`, **globalmente** (qualquer matéria) | liberar a caneta a um aluno a daria em todas as matérias | a V2 passa a ter o **modo «por matéria»**: o aluno comum só a recebe quando o servidor libera a matéria aberta; nas outras ela fica **invisível e inerte** e o marcador/goma antigos continuam |
| 3 | `penLiberada()` só valia para refinamentos físicos, sem montar a V2 | caneta «liberada» não aparecia | o mesmo `pen:true` agora também monta a V2 (por matéria) |
| 4 | O tema visual exige descritor aprovado por matéria; Medicina Familiar não tem | ligar o tema numa matéria sem descritor | continua **por cima do layout** e com botão próprio; sem descritor, o tema lança erro interno **capturado**: o layout fica, o tema não entra (testado) |
| 5 | A resposta do servidor não consultava se o aluno **tem acesso** à matéria | não era possível liberar «para quem já tem acesso» | `get-pilot-flags` consulta `my_active_subjects` (a mesma view do `get-materia`) com o token do aluno |
| 6 | Listas de variáveis do Netlify exigem **deploy** para mudar | «volta rápida» lenta | os estágios vivem no banco: **voltar = um `update`, sem deploy** (vale na próxima abertura da matéria) |

## 3 · Como funciona (caminho completo)

1. O site só **pergunta** ao servidor para as matérias da lista `CANDIDATAS` de `assets/rm-pilot.js` (1.ª fechadura, por PR: hoje Semiología II e **Medicina Familiar**). Outras matérias: zero requisição.
2. `get-pilot-flags` (servidor) valida o token do aluno, lê a linha da matéria em `rm_materia_rollout` e decide cada botão: `off` ⇒ ninguém; `preview` ⇒ **só administrador** (`profiles.is_admin` da própria conta); `all` ⇒ **aluno com acesso e administrador**. Qualquer erro, linha ausente, tabela ausente ou valor estranho ⇒ **tudo `false`** (corpo idêntico, não revela o motivo). **Só lê.**
3. `rm-pilot.js`: `layout:true` ⇒ monta o Layout V2; `visual:true` ⇒ tema (se houver descritor); `pen:true` avisa o `rm-tools-v2.js`.
4. `rm-tools-v2.js`: beta de sempre ⇒ **idêntico a hoje**. Aluno comum ⇒ só monta com `pen:true` da matéria aberta, em modo por matéria; ao trocar para outra matéria, a V2 **some e desarma** (sem ler nem gravar traços/notas) e as ferramentas antigas voltam.
5. Semiología II (piloto) **não muda**: continua pelas listas de conta, e a tabela é ignorada para ela.
6. **Fora do piloto, as variáveis antigas `RM_LAYOUT_SLUGS` / `RM_PEN_SLUGS` / `RM_VISUAL_SLUGS` não são mais lidas.** Matéria `off` (ou sem linha, ou tabela ausente) fica desligada para todos, inclusive para as contas de teste, mesmo que alguma dessas variáveis ainda exista no Netlify.

## 4 · Medicina Familiar, passo a passo para José

**Uma vez só, antes:** no Supabase → *SQL Editor* → colar e rodar o arquivo `supabase/migrations/20261030_01_rm_materia_rollout.sql` (cria a tabelinha e já põe Medicina Familiar com tudo `off`). Pode rodar antes ou depois do merge; sem a tabela, tudo fica desligado.

**Depois do merge e do deploy da PR** (todos os comandos no *SQL Editor*; nada no Netlify):

| Passo | O que fazer | O que você vê |
|---|---|---|
| 1. Ver só você (layout) | `update public.rm_materia_rollout set layout_stage='preview', atualizado_em=now() where slug='medicina-familiar';` | no iPad (recarregar a página) a matéria abre no layout novo; qualquer aluno ou aba anônima vê o antigo |
| 2. Testar no iPad (3 min) | abrir 3 blocos pelo índice; rolar uma tabela larga (a página não alarga); marcar um trecho e recarregar | tudo certo? vá ao 3. Algo errado? vá à volta |
| 3. Liberar o layout para todos | `update public.rm_materia_rollout set layout_stage='all', atualizado_em=now() where slug='medicina-familiar';` | todo aluno **com acesso** a Medicina Familiar passa a ver o layout novo na próxima vez que abrir |
| 4. Observar | 24 h; repetir `tools/qa/pre-voo/contagens-materia.sql` (grifos, traços e notas **não podem diminuir**) | |
| 5. Caneta, separada | `…set pen_stage='preview'…` → testar com a Pencil → `…set pen_stage='all'…` | só depois de o layout estar tranquilo |

**Volta imediata (por matéria):**
`update public.rm_materia_rollout set layout_stage='off', pen_stage='off', visual_stage='off', atualizado_em=now() where slug='medicina-familiar';`
Quem já estava com a página aberta troca ao recarregar. Os dados do aluno (grifos, notas, traços) **não são tocados** em nenhuma etapa nem na volta.

**Se o passo 1 não mostrar nada no iPad:** confira que a conta aberta no iPad é a administradora (`select u.email from public.profiles p join auth.users u on u.id = p.id where p.is_admin = true;` deve listar só você) e recarregue sem cache. Não há nada para ajustar no Netlify.

## 5 · O que não muda

Outras matérias (sem requisição), Semiología II (piloto), login, compras e acesso (`get-materia` e `my_active_subjects` intactos; a função só **lê**), dados existentes (nenhuma migração de dados; a tabela nova é aditiva), áudio (só o piloto), infográficos (fora desta PR).

## 6 · Riscos e limites (honestos)

- **Safari/Apple Pencil e celulares reais** não são provados por automação; o passo 2 (iPad) é o que prova.
- **«Caneta para todos» = a caixa de ferramentas V2 inteira** (marcador V2, caneta, goma, desfazer, «Mis apuntes») naquela matéria. Se a ideia for liberar só parte, é uma decisão antes do passo 5.
- A resposta do servidor é lida **uma vez por abertura da matéria**: depois de `all`, o aluno recebe ao abrir/recarregar; depois de `off`, idem. Sessões abertas não mudam sozinhas.
- Cache de módulos do navegador: `rm-tools-v2.js` subiu para `?v=2026103001`.
- Tema visual: não há descritor aprovado de Medicina Familiar; `visual_stage` fica `off`.
- Uma matéria nova só entra depois de **PR própria** que a coloque em `CANDIDATAS` (e a porta do pré-voo aberta).

## 7 · Testes (somente simulação; nada de aluno real lido ou gravado)

| Teste | Resultado |
|---|---|
| `tools/qa/nova-era/servidor.test.cjs` (função real `get-pilot-flags`, banco simulado): tudo `off` por padrão; `preview` só administrador; `all` só aluno COM acesso e administrador; layout × caneta × tema; outra matéria; piloto; áudio nunca; curingas; **configuração antiga do Netlify não liga matéria desligada**; corpo idêntico; só GET | **52/52** |
| `tools/qa/nova-era/navegador.test.cjs` (matéria real, `rm-pilot.js` + função + `rm-tools-v2.js` reais, 390 e 1440 px): padrão desligado · prévia (só administrador; o 2.º testador não vê) · só layout · só caneta · as duas · **volta** · sem acesso · outra matéria · troca de aba · José em outra matéria · piloto · tabela ausente · tema sem descritor · **troca de conta na mesma aba** — com grifos, notas e traços idênticos, atualização da página, 0 erro JS, 0 escrita indevida | **153/153** |
| Controles negativos (o teste reprova o defeito inserido) | V2 sem modo por matéria · `all` sem checar acesso · `preview` aberto · sem o portão `anotarPermitido` · ferramentas antigas não devolvidas · **V2 ignora a troca de conta** · **pilot guarda o cache da conta anterior** · **variável antiga volta a ligar**: todos reprovam |
| Regressão (suítes antigas adaptadas por `fetch-sim.cjs`, que traduz «slug na variável» para uma linha `preview`) | `pilot-flags` 22 · `gate-por-materia` 48 · `medfam-implantacao` 87 · `medfam-grifos-sinteticos` 24 · `nao-ativacao` 18 · porta de Medicina Familiar ABERTA 7/7 · `layout` 535 · `sistema` 124 · `nav-sistema` 216 · `cover` 198 · `soltos` 16 · `race` 140 · `ink-jump` 54 · `caneta-ipad-456` 197 |
| `caneta-456` e `caneta-novo-layout` | ver §9 (3): falhas de **tolerância absoluta do teste** em traços sobre post-it grande; **mesmo resultado no código de 30/10 (`9d59a061`) rodado nesta máquina** — ou seja, deriva do ambiente de teste, não desta PR |

## 8 · Relação com a conferência independente da #618

A #618 (Claude 1, auditor) testa o mecanismo **por variáveis** (`--publico NOME=valor`). Esta PR liberou os alunos por **tabela de estágios**, então quatro resultados do `auditoria-implantacao-publica.test.cjs` rodado sem adaptação **são diferenças de desenho, não defeitos**:

| Fase do auditor | Resultado aqui | Por quê |
|---|---|---|
| S1 / S2 / S3 / S3b / S4 (José e alunos recebem layout/caneta) | falham quando o teste ativa por **variáveis** (agora ignoradas fora do piloto; ver §9 (1)) | o `all` vem da tabela `rm_materia_rollout`; o equivalente passa em `tools/qa/nova-era/servidor.test.cjs` (§3–4) e `navegador.test.cjs` (cenas 2–5) |
| S5 («só faz `GET /auth/v1/user`») | falha | a função também **lê** `rm_materia_rollout` e `my_active_subjects` (item 3.1 do auditor: decidir pela compra); continua só `GET`, nenhuma escrita (provado: `servidor.test.cjs` §11) |
| C («não lê compras») | falha | por pedido de José a função consulta **a view de acesso** (`my_active_subjects`, a mesma do `get-materia`), nunca o conteúdo; `get-materia.js` não foi tocado |
| G (versão de cache sobe) | **corrigido** nesta PR | `rm-pilot.js` `VER` e a tag do `index.html` subiram para `2026103001` (junto de `rm-tools-v2.js?v=2026103001`) |

Pedido ao auditor: adaptar S1–S5 e C ao modo «tabela de estágios» (a PR traz os cenários equivalentes prontos). Medido nesta PR: `auditoria-implantacao-publica.test.cjs --so-servidor` = 86/94, e as 8 diferenças são exatamente essas.

## 9 · Revisão pós-auditoria (os três pontos pedidos)

**(1) Matéria «desligada» não pode ser ligada por configuração antiga do Netlify.** *Achado:* a primeira versão ainda lia `RM_LAYOUT_SLUGS` / `RM_PEN_SLUGS` / `RM_VISUAL_SLUGS` como «prévia por ambiente»: com a linha `off` (ou sem linha) e uma dessas variáveis esquecida no Netlify, uma conta das listas de teste recebia layout/caneta. *Correção:* fora de Semiología II, `get-pilot-flags.js` **não lê mais essas variáveis**; a única fonte é a linha da matéria (`off` ⇒ ninguém, nem José). As listas de conta (`RM_PILOT_*_UIDS`) só definem **quem é «preview»**, e só quando a linha está em `preview`/`all`. *Prova:* `servidor.test.cjs` §10 (linha `off`, sem linha e tabela inexistente, com as três variáveis antigas e José nas listas ⇒ **ninguém recebe nada**; variável antiga não liga a caneta se a linha só liga o layout); mutante «variável antiga volta a ligar» reprovado. Semiología II (piloto) continua pelas listas de conta, como sempre.

**(2) Troca de conta na mesma aba.** *Achado:* a V2 guardava `st.uid` na montagem e ignorava `SIGNED_OUT`/outra conta; `RMTools.userId()` guarda cache; `rm-pilot.js` guardava as liberações por página. Na prática o site recarrega no logout, mas a sessão também muda por outra aba ou sessão derrubada, e então a caneta/layout da conta anterior ficariam ativos. *Correção:* (a) `rm-tools-v2.js`: o uid vem da **sessão de agora** (`uidSessaoAgora()`), nunca do cache; ao detectar saída ou conta diferente da que iniciou a V2, **bloqueia na hora** (todo acesso ao banco passa por `sb()`, que devolve `null`; ferramenta desarmada, tinta, pilha de desfazer e notas pendentes descartadas, caixa escondida); **outra conta entrando** recarrega a página; **saída (`SIGNED_OUT`) só bloqueia, sem recarregar** — o site decide o que mostrar (no logout ele mesmo recarrega; na sessão derrubada por login em outro lugar mostra «Sesión cerrada» com um botão, aviso que um recarregamento esconderia) — e a **próxima entrada** numa página que ficou bloqueada recarrega; se a V2 não estava montada, só esquece a conta anterior; (b) `rm-pilot.js`: descarta na hora o cache de liberações e retira layout/tema/áudio; recarrega quando outra conta entra (ou na entrada seguinte a uma saída) **e só se algo tinha sido ligado**; respostas do servidor que chegam depois da troca são descartadas (época). Cadastro e recuperação de senha (que fazem `signOut` com nada ligado) não recarregam. *(Correção feita na revisão: uma versão anterior recarregava já no `SIGNED_OUT`; o teste `nav-sistema` da suíte do piloto e o fluxo `forceLogout` do `index.html` mostraram que isso esconderia a tela «Sesión cerrada».)* *Prova:* `navegador.test.cjs` cena 13 (a–e) + 3 verificações estáticas; mutantes «V2 ignora a troca» e «pilot guarda o cache» reprovados.

**(3) As falhas declaradas nos testes da caneta com o layout novo — explicação e efeito real.**
- *O que falha:* `caneta-novo-layout` 4 casos «post-it» (`antigo`/`novo` × rápido/longo) e `caneta-456` 1–2 casos «post-it a 390 px». O critério é `maxDist <= 1,6 px`: distância máxima entre os pontos do gesto e o traço **salvo**.
- *O que foi medido* (`tools/qa/nova-era/postit-diagnostico.cjs`): em todos os casos **0 pontos perdidos, 1 traço gravado, âncora correta**; o desvio é 0,67 px no parágrafo e **1,67–1,72 px no post-it**. Tirar a rotação de 0,6° e o `clip-path` do post-it **não muda o valor** (1,67 → 1,67; 1,71 → 1,72): **não é o tema, nem o layout novo**.
- *Causa:* o gesto do teste é desenhado em proporção à caixa do alvo e o traço salvo é simplificado (decimação/curvas); o erro cresce com a **altura da caixa**: parágrafo 114 px → 0,67 px; post-it 281 px → 1,67 px; 363 px → 1,72 px (≈ 0,6 % da altura). O limite absoluto de 1,6 px fica entre os dois, então qualquer variação de ~0,1 px na medição o cruza.
- *Efeito real:* nenhum perceptível: com a espessura padrão (`medium` = 4 px) o desvio é **menos da metade da largura da linha**; nenhum dado se perde e o traço relido após recarregar fica na mesma posição (cenas de ida e volta). Sem diferença entre o layout antigo e o novo.
- *Por que antes dava 91/91:* o mesmo código de 30/10 (`9d59a061`), rodado **agora nesta máquina**, também dá `caneta-novo-layout` 87/91 e `caneta-456` 137/138 (nesta PR: 136/138, variando ±1 entre execuções); o ambiente de execução mudou (kernel/imagem do contêiner e renderização do Chromium) e a caixa do post-it passou de 1,57 px para 1,67–1,71 px. É deriva do ambiente do teste, **não regressão desta PR nem da `main`**.
- *Decisão pendente (não alterei o critério para não esconder nada):* trocar o limite absoluto por um **proporcional** (ex.: `max(1,6 px; 0,6 % da altura do alvo)` ou «≤ metade da largura da linha»). Recomendo; é decisão de quem mantém os testes da caneta.

## 10 · Troca de conta enquanto a consulta de acesso à V2 ainda voa (corrigido)

*Achado (reproduzido):* `iniciar()` marcava `aTentar` e só gravava a conta (`uidBase`) **depois** de `await hasStudyToolsV2Access(uid)`. Se a conta B entrasse durante essa espera, o evento de B não era reconhecido como troca (ainda não havia `uidBase`) e a segunda tentativa era barrada por `aTentar`; quando a resposta da conta A chegava, a V2 era montada com a identificação de A (`st.uid = A`) numa sessão que já era de B. O teste da cena 14 reproduz isto com o código anterior (8 falhas: a V2 monta com o uid de A em 14a, 14b, 14c, 14d e 14e).

*Correção (`rm-tools-v2.js`):* (a) a conta é registrada **antes** de esperar; (b) cada tentativa tem uma **época**; qualquer troca de conta ou saída (`contaMudou`) sobe a época e libera a trava, então a resposta tardia da conta anterior é **descartada** sem montar nada, e a conta nova decide do zero; (c) depois da consulta a sessão é relida (`uidSessaoAgora()`): se trocou sem o evento ter chegado, a tentativa se refaz para a conta de agora; (d) o mesmo vale para a montagem «por matéria».

*Prova (`navegador.test.cjs`, cena 14, a resposta da consulta é **segurada** e só liberada depois da troca):* 14a A (na tabela de beta) → entra B (beta pelo código): só B monta, 1 caixa, 0 escrita; 14b A → entra B **sem** V2: a resposta «sim» de A **não** monta nada para B; 14c **saída** durante a espera: nada monta e não há recarga; 14d sessão trocada sem evento: monta a de B; 14e Semiología II: a conta do piloto entra durante a espera de A e tem layout + caneta do piloto com a identificação dela. Controles negativos: código anterior (8 falhas), sem a checagem de época (2), sem registrar a conta antes e sem invalidar a tentativa (3) — todos reprovam.

## 11 · A prévia é só do administrador (corrigido antes da ativação)

*Achado (leitura do banco, sem alterar nada):* existe **1** administrador (`profiles.is_admin`) — a conta de José — e **2** contas habilitadas na caneta V2 (`study_tools_beta`): José e um segundo testador **que não é administrador**. As listas `RM_PILOT_LAYOUT_UIDS` / `RM_PILOT_PEN_UIDS` / `RM_PILOT_VISUAL_UIDS` ficam no Netlify (não consultáveis daqui) e **servem também ao piloto de Semiología II**, onde o segundo testador participa; portanto era provável que ele estivesse nelas e, com a regra anterior, veria a prévia de Medicina Familiar. *Correção:* fora do piloto, `preview` vale **só para administrador** (leitura da própria linha de `profiles`, com o token da conta; erro ⇒ ninguém). As listas continuam valendo **apenas** para Semiología II. *Prova:* `servidor.test.cjs` §2-B (o 2.º testador nas três listas não vê nada; José vê mesmo com as listas vazias; sem administrador no banco ou erro no perfil ⇒ ninguém; Semiología II intacta para os dois testadores) e `navegador.test.cjs` (cena do 2.º testador), mais o mutante «prévia por lista» reprovado.

**Leitura da política de `profiles` (somente leitura, catálogo do banco, 1/11/2026):** RLS ativo. Há 4 políticas de `SELECT`, todas permissivas (somam-se): `profiles_self_select` e `profiles_select_own` (`id = auth.uid()`), `profiles_select` (`id = auth.uid() OR is_admin()`) e `profiles_select_admin` (`is_admin()`). Logo, **uma conta comum lê apenas o próprio perfil**; quem é administrador pode ler todos (por isso a função consulta `?id=eq.<uid da própria conta>` e só aceita **exatamente uma** linha com `is_admin = true`). `anon` tem o privilégio de tabela, mas nenhuma política o libera (`auth.uid()` nulo e `is_admin()` falso ⇒ nenhuma linha). `is_admin()` é `SECURITY DEFINER` e lê `profiles.is_admin` da própria conta. Nenhuma escrita é feita por esta função.

**Regra final, igual no código, na migração e neste documento:** fora de Semiología II — `off` desliga para todos (inclusive administrador); `preview` é só administrador; `all` libera somente os alunos com acesso à matéria e o administrador; layout, caneta e tema são colunas independentes; as listas `RM_PILOT_*_UIDS` valem só para Semiología II.
