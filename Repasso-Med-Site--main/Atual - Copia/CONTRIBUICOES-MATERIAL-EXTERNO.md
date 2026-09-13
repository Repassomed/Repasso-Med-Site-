# CONTRIBUIÇÕES · MATERIAL EXTERNO · DRIVE · ADMIN

Como funciona a via **aluno → material externo → Google Drive → painel administrativo**,
e o que falta fazer à mão para ligá-la.

---

## 1. Onde o aluno encontra isto

Dentro de **qualquer matéria**, no mesmo botão que já existia:
**«Sugerencias y aportes»**, logo abaixo do índice.

O painel agora tem **duas abas**:

| Aba | O que faz | Onde vai parar |
|---|---|---|
| **Sugerencia** | recado de texto (o que já existia) | tabela `feedback` → card «Sugerencias de los alumnos» |
| **Aportar material** | semestre + matéria + recado + arquivos | tabela `external_contributions` + Storage + Drive → aba «Aportes» |

**Não há um segundo botão flutuante.** No celular o botão de sugestões já divide o
canto inferior esquerdo com a barra de ferramentas de estudo; mais um ali tiraria
espaço da matéria. Um botão, um painel, dois modos.

Funciona em **todas as matérias, inclusive nas que ainda não existem**: o card é
criado por `app-core.js` junto com o índice de cada matéria, e a lista de matérias
vem da tabela `subjects`, não de uma lista escrita à mão.

---

## 2. Por onde o arquivo passa — e por que por aí

```
navegador
   │  bytes (upload direto)
   ▼
Supabase Storage · bucket PRIVADO «aportes»
   │  só o caminho
   ▼
Postgres · external_contributions       ← o envio já está salvo AQUI
   │  só o id do envio
   ▼
Netlify Function · aporte-drive         ← valida a sessão, assina as URLs
   │  URLs assinadas (10 min)
   ▼
Apps Script (Web App)                   ← a única peça com permissão no Drive
   │
   ▼
Google Drive · <root>/Aportes de alumnos/<semestre>/<materia>/<envio>
```

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

> «Tu nombre y tu correo van junto con el material, así podemos agradecerte y
> preguntarte si hace falta. **No es un envío anónimo.** Mandá solo material que
> puedas compartir.»

O nome e o e-mail **realmente** viajam com o material. Dizer «100 % anônimo» seria
mentira, e mentira sobre privacidade é a pior espécie.

---

## 4. ⏸️ O QUE FALTA FAZER À MÃO

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
   - Ele também imprime a URL da pasta *Aportes de alumnos*, já criada.
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

## 5. O que foi alterado no repositório

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

### O que **não** foi tocado

Auth, anti-compartilhamento, limite de dispositivos, `profiles`, `user_subjects`,
`subjects`, `products`, `orders`, `user_sessions`, `user_devices`, pagamentos,
InfinitePay, checkout, e as RPCs e policies que já existiam. A migration só
acrescenta; não altera nem apaga nada anterior.

---

## 6. Estrutura de pastas criada no Drive

```
<root>/
└── Aportes de alumnos/
    ├── 7.º semestre/
    │   └── Oftalmología/
    │       └── 2026-09-13 — Ana Gómez — aaaaaaaa/
    │           ├── _ficha.txt          ← quem mandou, para que matéria, o recado
    │           ├── Resumen — Glaucoma (versión ñ).pdf
    │           └── Pizarrón ÁÉÍÓÚ.JPG
    └── Sin semestre/
        └── General/
            └── …
```

O `_ficha.txt` existe porque, daqui a um mês, uma pasta cheia de PDF sem contexto não
serve para nada. Os nomes de arquivo do aluno são **preservados como ele os mandou**;
só o caminho dentro do bucket é achatado (sem acento, sem espaço, sem barra).

---

## 7. Tabela `external_contributions`

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
