# Harness da recuperação de senha

Roda o `index.html` **real** com o `supabase-js` **real** (bundle UMD) contra um GoTrue/PostgREST
**simulado** (`harness.cjs`). Nada vai à rede, nada é gravado em banco algum, nenhum e-mail é enviado.

```bash
# 1) bundle UMD do supabase-js (o mesmo que o site carrega do CDN)
npm pack @supabase/supabase-js@2 && tar xzf supabase-supabase-js-*.tgz
export RM_SUPABASE_UMD=$PWD/package/dist/umd/supabase.js
# 2) playwright instalado globalmente (ou RM_PLAYWRIGHT=/caminho/do/modulo)
node tools/qa/browser-qa/recovery/recovery.test.cjs     # saída ≠ 0 se algo falhar
```

O que cobre (56 verificações): e-mail válido → link → tela de nova senha; salvar → PUT → signOut → login com a
senha nova; senha antiga rejeitada; senhas diferentes/curta; link expirado/usado (mensagem + «Solicitar un nuevo
enlace»); `?recovery=1` manual sem prova (0 PUT, inclusive chamando `doNewPassword()` à força); recarga durante a
recuperação; sessão de recuperação esquecida não vira login; usuário não aprovado continua não aprovado; usuário
aprovado mantém os acessos; retorno implícito/hash, fallback para a Site URL, `token_hash`, PKCE; limite de e-mails
(429); resposta neutra para e-mail inexistente; console sem token; desktop/mobile (1440, 390, 320); cadastro, login
e logout sem regressão.

## Configuração manual no Supabase (Authentication → URL Configuration)

O site envia `redirectTo = <origem>/?recovery=1` (caminho normalizado: `/index.html` vira `/`).

1. **Site URL** = a URL de produção do site (ex.: `https://SEU-DOMINIO/`).
2. **Redirect URLs**: adicionar `https://SEU-DOMINIO/**` (aceita qualquer query/caminho) — ou, no mínimo,
   `https://SEU-DOMINIO/?recovery=1` e `https://SEU-DOMINIO/`. Se houver mais de um domínio (ex.: `www.` e
   Netlify), cada um precisa estar na lista.
3. **Email Templates → Reset Password**: manter `{{ .ConfirmationURL }}` (padrão). Opcional e recomendado
   contra «link gasto por pré-visualização do e-mail»: usar
   `<a href="{{ .SiteURL }}/?recovery=1&token_hash={{ .TokenHash }}&type=recovery">Cambiar contraseña</a>` — o site
   mostra um botão «Continuar» e só então gasta o token (o código já suporta os dois formatos).
4. Se o envio falhar com «email rate limit exceeded» (HTTP 429), o SMTP embutido do Supabase tem um limite muito
   baixo por hora: configurar SMTP próprio em Authentication → SMTP Settings.
