# QA visual isolado (investigação da Issue #81)

Script `check.cjs` que abre uma página em quatro larguras — 390 / 768 /
1024 / 1440 px — e procura só o que é objetivo:

- overflow real de página (excluindo o que tem ancestral rolável, como
  `.rmc-scroll` — que é rolável **de propósito**, não é defeito);
- erro de JavaScript não tratado;
- imagem quebrada (`naturalWidth === 0`);
- resposta HTTP 4xx/5xx (só faz sentido para `http(s)://`; `file://` não tem).

## Por que fica fora do runtime principal

**Não** foi adicionado nenhum `package.json`, nenhuma dependência, nenhum
passo de build ao site. O Netlify continua sem saber que isto existe. O
script é `.cjs` (CommonJS, não ESM) de propósito: assim ele resolve o pacote
`playwright` via `NODE_PATH` apontando para uma instalação **fora** do
repositório, em vez de precisar de um `node_modules` commitado ou de rodar
`npm install` na raiz do site.

Este ambiente já traz Playwright e o Chromium pré-instalados fora do
repositório (é assim que os testes abaixo foram rodados). Fora deste
ambiente — no computador do José, ou num runner de CI comum — rodar isto
exige apontar `NODE_PATH` para uma instalação de `playwright`, por exemplo:

```bash
npm install --prefix /tmp/qa-deps playwright
npx --prefix /tmp/qa-deps playwright install chromium
NODE_PATH=/tmp/qa-deps/node_modules node tools/qa/browser-qa/check.cjs <url>
```

Isso é deliberado: enquanto ninguém decidir que este QA visual entra no
runtime de verdade, ele fica investigativo e isolado — rodar (ou não) é
opcional, e nunca bloqueia nada.

## Uso

```bash
NODE_PATH="$(npm root -g)" node tools/qa/browser-qa/check.cjs <url-ou-file> [--json saida.json]
```

`<url-ou-file>` aceita `http://`, `https://` ou `file://`. Saída: `0` se
nada foi encontrado, `1` se algum problema foi encontrado.

## Fixtures de prova

`fixtures/pagina-limpa.html` e `fixtures/pagina-quebrada.html` provam que o
script detecta o que devia e ignora o que não devia (a tabela dentro de
`.rmc-scroll` não conta como overflow). Rodar:

```bash
export NODE_PATH="$(npm root -g)"
node tools/qa/browser-qa/check.cjs "file://$(pwd)/tools/qa/browser-qa/fixtures/pagina-limpa.html"
node tools/qa/browser-qa/check.cjs "file://$(pwd)/tools/qa/browser-qa/fixtures/pagina-quebrada.html"
```

A limpa sai `0` (nada encontrado). A quebrada sai `1`, com overflow real
detectado nas quatro larguras, uma imagem quebrada e os erros de JS
plantados de propósito.

## Não integrado ao GitHub Actions ainda

`guard.yml` **não** chama este script. Ele exigiria um servidor rodando (ou
build estático servido) dentro do workflow, e a Issue #81 pede para
verificar viabilidade antes de acoplar — o que este README documenta. Ligar
isto ao CI fica para uma etapa seguinte, com decisão explícita.
