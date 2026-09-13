# CONTRIBUIÇÕES · MATERIAL EXTERNO · DRIVE · ADMIN

Como funciona a via **aluno → material externo → Google Drive → painel administrativo**,
e o que falta fazer à mão para ligá-la.

---

## 1. Onde o aluno encontra isto

Em **dois lugares**, os dois abrindo a **mesma** gaveta:

- **«Caja de sugerencias»** no cabeçalho, ao lado da Loja de matérias — alcançável de
  qualquer parte do site, inclusive fora de uma matéria;
- o **envelope** na coluna esquerda da matéria, para quem já está lendo.

O painel agora tem **duas abas**:

| Aba | O que faz | Onde vai parar |
|---|---|---|
| **Sugerencia** | recado de texto (o que já existia) | tabela `feedback` → card «Sugerencias de los alumnos» |
| **Aportar material** | semestre + matéria + recado + arquivos | tabela `external_contributions` + Storage + Drive → aba «Aportes» |

**Não há um segundo painel.** `#rm-sug` é instância única no `<body>`, e os dois
atalhos chamam a mesma `RepassoMed.abrirSugestoes`. Dois atalhos, uma caixa,
duas abas.

Funciona em **todas as matérias, inclusive nas que ainda não existem**: o card é
criado por `app-core.js` junto com o índice de cada matéria, e a lista de matérias
vem da tabela `subjects`, não de uma lista escrita à mão.

---

## 2. Por onde o arquivo passa — e por que por aí

```
navegador
   │  bytes (upload direto)
   ▼
Supabase Storage · bucket PRIVADO «aportes»   ← BUFFER, não destino
   │  só o caminho
   ▼
Postgres · external_contributions       ← o envio já está salvo AQUI
   │  só o id do envio
   ▼
Netlify Function · aporte-drive         ← valida a sessão, assina as URLs
   │  URLs assinadas (10 min) · NENHUMA identidade viaja
   ▼
Apps Script (Web App)                   ← a única peça com permissão no Drive
   │
   ▼
Google Drive · Material Externo/<semestre>/<materia>/<AAAA-MM-DD_HHmm_XXXXXX>/
   │
   └─ cópia confirmada arquivo por arquivo → o buffer do Storage é apagado
```

### O Storage é buffer; o Drive é destino

Confirmada a cópia de **todos** os arquivos, a função apaga a cópia temporária do
bucket: material de aluno não fica guardado em dois lugares sem motivo. Se **um**
arquivo faltar, o buffer permanece — é ele que permite ao botão «Copiar al Drive»
do painel tentar de novo. Falhar ao apagar o buffer nunca derruba o envio: o
material já está no Drive, que é o que importa.

### Por que os bytes não passam pela função Netlify

Uma Netlify Function aceita **6 MB de payload por requisição**. Em base64 sobram
uns **4,4 MB de arquivo real** — menos que um PDF de aula. Mandar o arquivo por ali
quebraria no caso mais comum. Por isso os bytes vão do navegador direto para o
Storage, exatamente como o painel administrativo já faz com os flyers.

### Limites reais de cada camada

| Camada | Limite | Como o desenho lida |
|---|---|---|
| Navegador | sem limite prático | — |
| Supabase Storage | 50 MB por arquivo | teto do bucket + validação no navegador |
| Netlify Functions | 6 MB de payload | não recebe arquivo, só o id |
| Apps Script | ~50 MB por POST · `UrlFetchApp` até 50 MB · 6 min de execução | busca um arquivo por vez |
| Postgres | — | nunca guarda bytes; só `{path,name,size,mime}` |

Tetos aplicados: **10 arquivos por envio**, **50 MB por arquivo**, **5 envios por hora
por aluno** (trigger `external_contributions_rate_limit`).

### Se o Drive falhar, o material não se perde

O envio é gravado **antes** de qualquer coisa tocar o Google. Se o Apps Script não
responder, a linha fica com `drive_status = 'pendiente'` ou `'error'`, o painel
mostra o motivo, e o botão **«Copiar al Drive»** refaz a cópia. O aluno vê uma
mensagem honesta, não um erro.

---

## 3. Segurança

- **Nenhum segredo no frontend.** O navegador só tem a chave `anon`, que já era pública.
  `service_role`, a URL do Apps Script e o token compartilhado existem apenas em
  `process.env` na Netlify.
- **Nenhuma Drive API key.** Quem escreve no Drive é o Apps Script, com a autorização
  da conta Google que o publicou.
- **A identidade não vem do navegador.** O cliente manda só `contribution_id`; quem é
  o aluno sai do token de sessão, e o dono da linha sai do banco.
- **Bucket privado.** O `flyers`, que já existia, é público — feito para anúncios.
  Material de aluno ganhou bucket próprio, **privado**, com teto de tamanho e lista de
  tipos aceitos. Não existe URL pública do material: os links do painel são assinados
  no clique e valem 10 minutos.
- **Caminho travado pelo RLS.** O arquivo só pode ser escrito em
  `<uuid-do-aluno>/<id-do-envio>/…`; a policy compara a primeira pasta com `auth.uid()`.
- **Nada é criado fora do root do Drive.** O frontend não escolhe pasta: manda semestre
  e matéria, e o Apps Script resolve o caminho sempre abaixo de `ROOT_FOLDER_ID`.
  O script **só cria** — nunca apaga, nunca move, nunca toca a Biblioteca.
- **Nada de segredo nos logs.** Quando falta uma variável de ambiente, o log registra o
  **nome** dela, nunca o valor; o token recebido pelo Apps Script nunca é registrado,
  nem quando está errado.

### O que o aluno lê, e por que não promete anonimato

> «**Tu contribución es confidencial.** Tu identidad no se mostrará públicamente ni
> será asociada al material frente a otros estudiantes. El equipo de Repasso Med puede
> identificar al remitente para organización, seguridad y, si fuera necesario, contacto
> sobre el material.»

Isto é exatamente o que acontece, e a distinção importa:

| | vê quem enviou? |
|---|---|
| Outros estudantes | **não** — o material nunca aparece associado a alguém |
| Google Drive | **não** — pasta e ficha não levam nome, e-mail nem `user_id` |
| Painel administrativo | **sim** — nome, e-mail, `user_id`, data, semestre, matéria, recado |

Dizer «100 % anônimo» seria mentira, e mentira sobre privacidade é a pior espécie.
Dizer «confidencial» é verdade, e é o que o aluno precisa saber para se sentir à
vontade de contribuir.

### Quando alguma coisa falha no meio

O caminho tem quatro etapas, e cada uma erra de um jeito. A regra que atravessa todas
é a mesma: **material só se apaga quando já está guardado em outro lugar.**

| Onde falha | O que acontece | O buffer é apagado? |
|---|---|---|
| upload de um arquivo | nada é gravado; os que já subiram são apagados | — não chega a existir envio |
| INSERT da linha | os arquivos já subidos são apagados (ver §4) | — idem |
| **uma assinatura de URL** | **não chama o Apps Script**; envio fica `error` | **não** |
| destino inválido (matéria/semestre/caminho) | **não chama o Apps Script**; envio fica `error` | **não** |
| **cópia parcial no Drive** (`complete:false`) | envio fica `error` com o link da pasta | **não** |
| Apps Script recusa ou cai | envio fica `error` | **não** |
| tudo certo (`ok` **e** `complete`) | envio fica `enviado` | **sim** |

Uma assinatura que falha **para tudo**: seguir com os outros faria o Apps Script
declarar «completo» sobre um conjunto menor, e o buffer inteiro — inclusive o arquivo
que nunca viajou — seria apagado. Uma cópia parcial **nunca** vira `enviado`: dizer ao
painel que está resolvido quando falta material é pior do que mostrar o erro.

Em todos os casos de `error` o botão **«Copiar al Drive»** termina o trabalho. O Apps
Script conta como gravado o arquivo cujo nome já existe na pasta, então o retry só
busca o que falta, e a pasta do envio é sempre a mesma — o nome dela carrega 12
dígitos hexadecimais do `contribution_id`.

### O destino é conferido no servidor, não aceito do navegador

`semester` e `subject_slug` vêm de uma linha que o próprio aluno inseriu: são dados,
não verdade. Antes de qualquer coisa tocar o Drive, a função Netlify confere contra
`public.subjects`:

- o slug tem de **existir** e estar **ativo**;
- o semestre da linha tem de **bater** com o do catálogo — divergência é recusa, não
  correção silenciosa: a divergência em si já diz que o dado não é confiável;
- o **nome** da pasta sai do registro real, nunca de texto do cliente;
- sem matéria («General»), o semestre ainda é conferido; um valor que não existe no
  catálogo não recusa o envio — seria perder material por um detalhe — e sim cai em
  `Sin clasificar`.

E antes de a chave de serviço assinar qualquer coisa, **todo** caminho de arquivo tem
de morar exatamente em `<user_id do dono>/<id do aporte>/`. Um caminho fora do lugar
aborta o espelhamento inteiro: um metadado adulterado não pode fazer a `service_role`
assinar o arquivo de outra pessoa.

---

## 4. Arquivos órfãos no Storage

Os bytes sobem antes de a linha existir. Se o INSERT falhar — rede, anti-spam,
navegador fechado —, os objetos ficam sem nada que os explique: ninguém os vê no
painel, ninguém os apaga, e eles contam no plano.

**Abrir o DELETE para o dono resolveria o órfão e criaria um problema pior:** ele
poderia apagar o material de um envio já feito, antes do espelhamento, e o painel
ficaria apontando para o nada.

Então a policy `aportes_delete_huerfano` (migration 05) deixa o dono apagar **só
enquanto o arquivo for órfão de verdade**:

```sql
(storage.foldername(name))[1] = auth.uid()::text      -- é da minha pasta
and not exists (select 1 from public.external_contributions c
                 where c.id::text = (storage.foldername(name))[2])   -- e o envio não existe
```

Criada a linha, a policy deixa de casar e o navegador não apaga mais nada. Comprovado:

| | pode apagar? |
|---|---|
| órfão da própria pasta | **sim** |
| órfão de outro aluno | não |
| arquivo de um envio já gravado | não |

**O caso que isto não cobre, de propósito:** se o navegador fechar *entre* o upload e o
INSERT, não há mais quem chame a limpeza, e o órfão fica. Não vale um job agendado nem
uma função com chave de serviço varrendo sozinha material de aluno — o custo de um
engano é apagar coisa boa. A limpeza desse resto é manual, pelo painel do Supabase
(Storage → `aportes`), e é segura porque a regra é simples: **uma pasta
`<uid>/<id>/` cujo `<id>` não aparece em `external_contributions` não pertence a
nenhum envio.**

---

## 5. ⏸️ O QUE FALTA FAZER À MÃO

Isto **não pode ser feito por um agente**: exige a sua conta Google e o painel da
Netlify. Enquanto não for feito, a funcionalidade **funciona pela metade** — o aluno
consegue enviar, o painel mostra tudo, mas a cópia no Drive fica «pendiente».

### Passo 1 — publicar o Apps Script

1. Abra **https://script.google.com** com a conta Google **dona do Drive da equipe**.
2. **Novo projeto** → apague o conteúdo → cole o arquivo
   **`google-apps-script/Code.gs`** deste repositório.
3. Confira a primeira linha de configuração:
   ```js
   var ROOT_FOLDER_ID = '1jE4fwQblxZsPWR6R8IM02iMI-DxxwZoQ';
   ```
   Este é o root informado. Nada é criado fora dele.
4. No seletor de funções escolha **`setup`** e clique em **Executar**.
   - O Google vai pedir autorização: **Revisar permissões** → escolha a conta →
     **Avançado** → **Acessar (não seguro)** → **Permitir**.
     O aviso aparece porque o script é seu e não passou por verificação pública.
   - Abra **Registro de execução**. Ele imprime um **token gerado** (uma linha longa
     de letras e números). **Copie essa linha** — é o valor de `APPS_SCRIPT_TOKEN`.
   - Ele também imprime o **diagnóstico da árvore**: quantos semestres achou e, em
     cada um, que matérias já existem. Confira essa lista — é ela que o script vai
     reaproveitar. Se faltar alguma pasta que você esperava, crie-a à mão no Drive e
     rode **`recarregarArvore()`** (não precisa autorizar de novo).
   - `setup()` **não cria, não move e não apaga nada.** Só lê e guarda os ids.
5. **Implantar → Nova implantação → Aplicativo da Web**
   - Descrição: `Repasso Med · aportes`
   - **Executar como: Eu**
   - **Quem pode acessar: Qualquer pessoa**
     *(é o que permite a chamada vinda do servidor da Netlify; quem protege o
     endpoint é o token, não a obscuridade da URL)*
   - **Implantar** → copie a **URL do aplicativo da Web**, a que termina em **`/exec`**.

### Passo 2 — colar as duas variáveis na Netlify

**Netlify → Site settings → Environment variables → Add a variable**

| NOME_DA_VARIAVEL | VALOR |
|---|---|
| `APPS_SCRIPT_URL` | a URL terminada em `/exec` do Passo 1.5 |
| `APPS_SCRIPT_TOKEN` | a linha longa impressa pelo `setup()` no Passo 1.4 |

Depois de salvar, **refaça o deploy** (*Deploys → Trigger deploy → Deploy site*):
variáveis novas só entram em vigor em um build novo.

> As outras três (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
> **já existem** — são as mesmas que `create-checkout` usa. Não mexa nelas.

### Passo 3 — conferir

1. Abra o site como aluno, entre em qualquer matéria, clique em
   **«Sugerencias y aportes» → «Aportar material»**, escolha semestre e matéria,
   anexe um PDF pequeno e envie.
2. No painel administrativo, aba **«Aportes»**: o envio tem que aparecer com
   **«En el Drive»** e o botão **«Abrir en el Drive»**.
3. Se aparecer **«Falló el Drive»**, o motivo vem escrito no próprio card.

---

## 6. O que foi alterado no repositório

| Arquivo | O que mudou |
|---|---|
| `assets/app-core.js` | painel de sugestões vira painel de duas abas; formulário de aporte, validação, upload e chamada da função |
| `assets/styles.css` | estilo das abas e do formulário (classes novas `rm-sug-tab*`, `rm-ap-*`) |
| `index.html` | só o `?v=` de `styles.css` e `app-core.js`, para o cache soltar a versão nova |
| `admin.html` | aba **«Aportes»** com badge de não lidos, lista, links assinados, reenvio e «marcar como leído»; `.adm-nav` passa a quebrar linha |
| `netlify/functions/aporte-drive.js` | **novo** — valida a sessão, assina as URLs, chama o Apps Script, grava o resultado |
| `google-apps-script/Code.gs` | **novo** — o Web App que escreve no Drive |
| `supabase/migrations/20260913_03_external_contributions.sql` | **novo** — tabela, RLS, anti-spam e bucket privado (já aplicada) |
| `supabase/migrations/20260913_03_external_contributions_rollback.sql` | **novo** — desfaz, com o `DROP` do bucket comentado de propósito |
| `supabase/migrations/20260913_04_external_contributions_review.sql` | **novo** — coluna `review_status` (curadoria), aditiva à tabela criada na 03 |
| `supabase/migrations/20260913_05_aportes_limpeza_huerfanos.sql` | **novo** — policy que deixa o dono apagar o arquivo **só enquanto for órfão** |

### O que **não** foi tocado

Auth, anti-compartilhamento, limite de dispositivos, `profiles`, `user_subjects`,
`subjects`, `products`, `orders`, `user_sessions`, `user_devices`, pagamentos,
InfinitePay, checkout, e as RPCs e policies que já existiam. A migration só
acrescenta; não altera nem apaga nada anterior.

---

## 7. Onde o material cai no Drive

A raiz **já é** «Material Externo» e **já tem** a árvore montada à mão. O script
**reutiliza** essa árvore; não monta uma segunda ao lado dela.

```
Material Externo/                      ← ROOT_FOLDER_ID, já existente
├── 1º Semestre/                       ← já existente
│   └── Biologia/                      ← já existente
├── 7 semestre/                        ← já existente
│   └── Oftalmologia/                  ← já existente
│       └── 2026-09-13_1420_A82F92/    ← ÚNICA pasta criada por envio
│           ├── contribuicao.txt
│           ├── Resumen — Glaucoma (versión ñ).pdf
│           └── Pizarrón ÁÉÍÓÚ.JPG
└── Sin clasificar/                    ← só se o envio não trouxer semestre
```

### Reutilizar exige normalizar

Os dois lados escrevem diferente, e comparar os nomes crus criaria duplicatas:

- o semestre aparece como **«1º Semestre»** e como **«7 semestre»**;
- as pastas estão em **português sem acento** («Oftalmologia», «Ortopedia e
  Traumatologia», «Anatopatologia»), e o catálogo do site está em **castelhano**
  («Oftalmología», «Ortopedia y Traumatología», «Anatomía Patológica I»).

O script compara uma forma reduzida: minúsculas, sem acento, sem pontuação, sem os
conectores `e`/`y`/`de`, com `pratica`/`praticas` → `practica`, `anatomia
patologica` → `anatopatologia`, o sufixo `teórica` descartado (é ele que separa
«Histologia I Teórica» de «Histología I») e um `I` solto no fim removido («Fisiopatología»
↔ «Fisiopatologia I»). `II` e `III` **ficam**, que aí distinguem de verdade.

Conferido contra as pastas reais e o catálogo real: **22 das 27 matérias reutilizam
a pasta existente, 5 criariam pasta nova** (as que de fato ainda não existem no
Drive: as quatro do 2.º semestre e Imagenología). **Zero colisões.**

Uma matéria sem pasta ganha uma **dentro do semestre já validado**, com o nome do
catálogo. Um semestre sem pasta ganha uma no formato que já se usa (`7 semestre`).
**Nunca fora do root.**

### Nenhuma identidade vai para o Drive

A pasta do envio chama-se `AAAA-MM-DD_HHmm_XXXXXX` — data, hora e seis dígitos do
`contribution_id`. Nem nome, nem e-mail, nem `user_id`. O `contribuicao.txt` leva id,
data, semestre, matéria, o recado do aluno e a lista de arquivos, e termina dizendo
onde o remetente se identifica: **só no painel administrativo**.

Reenviar o mesmo aporte **não duplica**: o script procura a pasta que termina com
aquele sufixo e reaproveita; arquivo com nome que já existe é considerado gravado.

Os nomes de arquivo do aluno são **preservados como ele os mandou**; só o caminho
dentro do bucket é achatado (sem acento, sem espaço, sem barra).

---

## 8. Tabela `external_contributions`

| Coluna | Para que serve |
|---|---|
| `id` | também é a pasta do envio dentro do bucket |
| `user_id` | dono; `auth.uid()` tem que bater na hora do INSERT |
| `nombre`, `email` | fotografia do cadastro no momento do envio |
| `semester`, `subject_slug` | destino pedagógico, vindo de `subjects` |
| `mensaje` | recado do aluno |
| `files` | `[{path,name,size,mime}]` — **nunca** bytes |
| `drive_status` | `pendiente` · `enviado` · `error` |
| `drive_folder_url`, `drive_error`, `drive_sent_at` | resultado do espelhamento |
| `leido_en` | badge NOVA do painel |
| `review_status` | curadoria humana: `nueva` · `vista` · `aprovechada` · `descartada` |

`drive_status` é **máquina** (o espelhamento deu certo ou não); `review_status` é
**gente** (a equipe olhou, aproveitou ou descartou). São eixos diferentes de
propósito: empilhá-los num campo só daria um estado que mente metade do tempo.

**RLS** — o mesmo trio já usado em `feedback`:
`insert_self` (`user_id = auth.uid()`), `select_self`, `admin_all` (`is_admin()`).
Não há policy de UPDATE para o aluno: depois de enviado, nem o estado do Drive nem o
`leido_en` podem ser mexidos por ele.

Comprovado por teste, em transação abortada (nada ficou gravado):

| Teste | Resultado |
|---|---|
| aluno insere para si | ✅ passa |
| aluno insere em nome de outro | 🔒 bloqueado |
| aluno lê envio de outro | 🔒 não vê |
| aluno se marca como lido | 🔒 0 linhas |
| envio vazio (sem arquivo e sem recado) | 🔒 bloqueado |
| 11 arquivos | 🔒 bloqueado |
| `drive_status` inventado | 🔒 bloqueado |
| 6.º envio na mesma hora | 🔒 bloqueado |
| admin lê e atualiza envio de aluno | ✅ passa |
