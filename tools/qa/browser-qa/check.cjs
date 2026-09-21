#!/usr/bin/env node
// Arquivo .cjs (CommonJS) de propósito: assim ele resolve `playwright` via
// NODE_PATH sem precisar de node_modules dentro do repositório. Import ESM
// não consulta NODE_PATH; require() consulta.
/**
 * QA visual isolado — investigação da Issue #81, NÃO instalado no runtime
 * principal do site.
 *
 * Abre uma URL (http:// ou file://) em quatro larguras (390 / 768 / 1024 /
 * 1440) e procura só o que é objetivo:
 *
 *   - overflow real de página (excluindo elementos com ancestral rolável,
 *     como .rmc-scroll — que é rolável DE PROPÓSITO);
 *   - erro de JavaScript não tratado;
 *   - imagem quebrada (natural size 0);
 *   - resposta HTTP 4xx/5xx (só se aplica a http/https; file:// não tem).
 *
 * Depende do módulo `playwright`, que este repositório NÃO instala como
 * dependência — nada em package.json, nada no build do Netlify. Este
 * ambiente já traz Playwright e Chromium pré-instalados fora do repo
 * (PLAYWRIGHT_BROWSERS_PATH), por isso o script funciona aqui sem
 * `npm install`. Fora deste ambiente, rodar exige instalar playwright à
 * parte — de propósito, para nunca virar dependência do site.
 *
 * Uso:
 *   node tools/qa/browser-qa/check.mjs <url-ou-file> [--json saida.json]
 *
 * Saída: 0 se nada foi encontrado, 1 se algum problema foi encontrado.
 */

const { chromium } = require("playwright");
const fs = require("node:fs");

const LARGURAS = [390, 768, 1024, 1440];

function uso() {
  console.error("uso: node check.mjs <url-ou-file> [--json saida.json]");
  process.exit(2);
}

const argv = process.argv.slice(2);
if (argv.length < 1) uso();
const alvo = argv[0];
const jsonIdx = argv.indexOf("--json");
const jsonPath = jsonIdx >= 0 ? argv[jsonIdx + 1] : null;

async function medirOverflow(page) {
  return page.evaluate(() => {
    function temAncestralRolavel(el) {
      let n = el.parentElement;
      while (n) {
        const cs = getComputedStyle(n);
        if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflow)) {
          return true;
        }
        n = n.parentElement;
      }
      return false;
    }
    const larguraPagina = document.documentElement.clientWidth;
    const estourou = document.documentElement.scrollWidth > larguraPagina + 1;
    if (!estourou) return { estourou: false, elementos: [] };

    // Só interessa achar QUEM estoura, ignorando quem está dentro de algo
    // rolável de propósito.
    const candidatos = [];
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.right > larguraPagina + 1 && !temAncestralRolavel(el)) {
        candidatos.push({
          tag: el.tagName.toLowerCase(),
          classe: el.className && typeof el.className === "string" ? el.className.slice(0, 60) : "",
          direita: Math.round(r.right),
        });
      }
      if (candidatos.length >= 20) break;
    }
    return { estourou: candidatos.length > 0, elementos: candidatos };
  });
}

async function medirImagensQuebradas(page) {
  return page.evaluate(async () => {
    const imgs = Array.from(document.images);
    // Força carregamento mesmo de imagem lazy fora da tela — sem isso,
    // `naturalWidth` de uma <img loading="lazy"> nunca preenche.
    for (const img of imgs) {
      img.loading = "eager";
      const src = img.src;
      img.src = "";
      img.src = src;
    }
    await new Promise((r) => setTimeout(r, 800));
    return imgs
      .filter((img) => img.naturalWidth === 0 && img.naturalHeight === 0)
      .map((img) => img.getAttribute("src"));
  });
}

async function rodar() {
  const browser = await chromium.launch();
  const achadosPorLargura = {};
  const errosJS = [];
  const respostasRuins = [];

  for (const largura of LARGURAS) {
    const page = await browser.newPage({ viewport: { width: largura, height: 900 } });
    page.on("pageerror", (e) => errosJS.push({ largura, mensagem: String(e.message || e) }));
    page.on("console", (msg) => {
      if (msg.type() === "error") errosJS.push({ largura, mensagem: msg.text() });
    });
    page.on("response", (resp) => {
      const status = resp.status();
      if (status >= 400) {
        respostasRuins.push({ largura, url: resp.url(), status });
      }
    });

    let resp;
    try {
      resp = await page.goto(alvo, { waitUntil: "networkidle", timeout: 20000 });
    } catch (e) {
      achadosPorLargura[largura] = { erroNavegacao: String(e.message || e) };
      await page.close();
      continue;
    }

    const overflow = await medirOverflow(page);
    const quebradas = await medirImagensQuebradas(page);

    achadosPorLargura[largura] = {
      statusHttp: resp ? resp.status() : null,
      overflow,
      imagensQuebradas: quebradas,
    };
    await page.close();
  }

  await browser.close();

  const total =
    Object.values(achadosPorLargura).reduce(
      (acc, v) => acc + (v.overflow?.estourou ? 1 : 0) + (v.imagensQuebradas?.length || 0),
      0
    ) +
    errosJS.length +
    respostasRuins.length;

  const resultado = {
    alvo,
    larguras: LARGURAS,
    porLargura: achadosPorLargura,
    errosJS,
    respostasRuins: respostasRuins.filter((r) => r.url !== alvo || true),
    total,
  };

  if (jsonPath) fs.writeFileSync(jsonPath, JSON.stringify(resultado, null, 2));

  console.log(`QA visual · ${alvo}`);
  for (const l of LARGURAS) {
    const a = achadosPorLargura[l];
    if (a.erroNavegacao) {
      console.log(`  ${l}px: erro ao navegar — ${a.erroNavegacao}`);
      continue;
    }
    const linhas = [];
    if (a.overflow.estourou) linhas.push(`overflow real (${a.overflow.elementos.length} elemento(s))`);
    if (a.imagensQuebradas.length) linhas.push(`${a.imagensQuebradas.length} imagem(ns) quebrada(s)`);
    console.log(`  ${l}px: ${linhas.length ? linhas.join("; ") : "OK"}`);
  }
  if (errosJS.length) console.log(`  JS: ${errosJS.length} erro(s)`);
  if (respostasRuins.length) console.log(`  HTTP: ${respostasRuins.length} resposta(s) 4xx/5xx`);
  console.log(total === 0 ? "RESULTADO: nada encontrado." : `RESULTADO: ${total} problema(s) encontrado(s).`);

  process.exit(total === 0 ? 0 : 1);
}

rodar().catch((e) => {
  console.error("Falha ao rodar o QA visual:", e);
  process.exit(2);
});
