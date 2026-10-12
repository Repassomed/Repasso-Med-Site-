#!/usr/bin/env node
/* Compara, para grifos REAIS de produção (exportados antes por uma
 * consulta SELECT ao Supabase — este script nunca toca rede nem
 * escreve nada), quantos resolvem hoje com o rm-tools.js da `main`
 * contra quantos resolveriam com o rm-tools.js desta PR — usando o HTML
 * REAL e NÃO MODIFICADO de cada matéria (controle positivo: texto
 * inalterado desde a criação do grifo).
 *
 * Existe porque a rodada 3 (ver README, "Rodada 3") endureceu
 * `escolher()` para exigir contexto (`prefix`/`suffix`) mesmo com um
 * único candidato literal — e isso só é seguro se nenhum grifo real
 * dependesse do antigo "aceita às cegas" para continuar visível em
 * texto que nunca mudou. Este script prova isso com dados reais, não
 * com uma amostra sintética.
 *
 * Entrada esperada em `highlightsJson` (array de objetos):
 *   { subject_slug, block_id, exact_text, prefix, suffix, occurrence,
 *     color, id }
 * — exatamente as colunas de uma consulta:
 *   select subject_slug, block_id, exact_text, prefix, suffix,
 *          occurrence, color, id
 *   from user_highlights;
 *
 * Uso:
 *   NODE_PATH="$(npm root -g)" node compare_real_highlights_main_vs_pr.cjs \
 *     <rm-tools-main.js> <rm-tools-pr.js> <highlights.json> <dir-das-materias> \
 *     [--json saida.json]
 */
const fs = require('fs');
const path = require('path');

async function loadPage(browser, rmToolsSrc) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e));
  await page.route('**/*', (route) => route.abort());
  await page.setContent('<!doctype html><html><body><div id="c"></div></body></html>');
  await page.addScriptTag({ content: rmToolsSrc });
  if (!(await page.evaluate(() => !!window.RMTools))) throw new Error('RMTools não carregou');
  return page;
}

async function runOn(page, html, highlights) {
  return page.evaluate(({ html, highlights }) => {
    const c = document.getElementById('c');
    c.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    c.appendChild(wrap);

    const out = [];
    for (const h of highlights) {
      const bloco = wrap.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(h.block_id) : h.block_id));
      if (!bloco) { out.push({ id: h.id, ok: false, motivo: 'bloco-nao-encontrado' }); continue; }
      const a = window.RMTools.resolverAncora(bloco, h);
      if (!a) { out.push({ id: h.id, ok: false, motivo: 'sem-ancora' }); continue; }
      const r = window.RMTools.rangeDe(a.idx, a.ini, a.fim);
      if (!r) { out.push({ id: h.id, ok: false, motivo: 'sem-range' }); continue; }
      const tmpId = 'cmp-' + h.id;
      const pintou = window.RMTools.pintar(r, h.color || 'red', tmpId, a.nivel === 3);
      if (!pintou) { out.push({ id: h.id, ok: false, motivo: 'pintar-falhou' }); continue; }
      const sp = bloco.querySelector('.rm-hl[data-hl="' + tmpId + '"]');
      const texto = sp ? sp.textContent : null;
      window.RMTools.despintar(tmpId, bloco);
      out.push({ id: h.id, ok: true, nivel: a.nivel, texto });
    }
    return out;
  }, { html, highlights });
}

async function main() {
  const [mainPath, prPath, highlightsPath, subjectsDir] = process.argv.slice(2);
  const jsonOutIdx = process.argv.indexOf('--json');
  const jsonOut = jsonOutIdx >= 0 ? process.argv[jsonOutIdx + 1] : null;
  if (!mainPath || !prPath || !highlightsPath || !subjectsDir) {
    console.error('uso: node compare_real_highlights_main_vs_pr.cjs <rm-tools-main.js> <rm-tools-pr.js> <highlights.json> <dir-das-materias> [--json saida.json]');
    process.exit(2);
  }

  const { chromium } = require('playwright');
  const mainSrc = fs.readFileSync(mainPath, 'utf-8');
  const prSrc = fs.readFileSync(prPath, 'utf-8');
  const allHighlights = JSON.parse(fs.readFileSync(highlightsPath, 'utf-8'));

  const bySubject = {};
  for (const h of allHighlights) (bySubject[h.subject_slug] = bySubject[h.subject_slug] || []).push(h);

  const browser = await chromium.launch();
  const pageMain = await loadPage(browser, mainSrc);
  const pagePr = await loadPage(browser, prSrc);

  const report = [];
  let totalMain = 0, totalPr = 0, totalAll = 0;
  const regressions = [];

  for (const slug of Object.keys(bySubject).sort()) {
    const highlights = bySubject[slug];
    const htmlPath = path.join(subjectsDir, slug + '.html');
    if (!fs.existsSync(htmlPath)) { console.error('AVISO: arquivo não encontrado para', slug); continue; }
    const html = fs.readFileSync(htmlPath, 'utf-8');

    const resMain = await runOn(pageMain, html, highlights);
    const resPr = await runOn(pagePr, html, highlights);
    const mapMain = new Map(resMain.map((r) => [r.id, r]));
    const mapPr = new Map(resPr.map((r) => [r.id, r]));

    let okMain = 0, okPr = 0;
    for (const h of highlights) {
      const rm = mapMain.get(h.id), rp = mapPr.get(h.id);
      if (rm && rm.ok) okMain++;
      if (rp && rp.ok) okPr++;
      if (rm && rm.ok && (!rp || !rp.ok)) {
        regressions.push({ slug, id: h.id, block_id: h.block_id, exact_text: h.exact_text, prefix: h.prefix, suffix: h.suffix, motivoPr: rp ? rp.motivo : 'sem-resultado' });
      }
      if (rm && rm.ok && rp && rp.ok && rm.texto !== rp.texto) {
        console.error(`DIVERGÊNCIA DE TEXTO em ${slug}/${h.id}: main="${rm.texto}" pr="${rp.texto}"`);
      }
    }

    totalMain += okMain; totalPr += okPr; totalAll += highlights.length;
    report.push({ slug, total: highlights.length, okMain, okPr, regressoes: okMain - okPr });
    console.log(`${slug.padEnd(24)} total=${String(highlights.length).padStart(4)}  main=${String(okMain).padStart(4)}  pr=${String(okPr).padStart(4)}  ${okMain === okPr ? '' : '<<< DIFERENÇA'}`);
  }

  await browser.close();

  console.log('\n--- TOTAL ---');
  console.log(`grifos reais: ${totalAll}`);
  console.log(`resolvem hoje na main: ${totalMain}`);
  console.log(`resolveriam com a PR:   ${totalPr}`);
  console.log(`regressões (resolvia e deixaria de resolver): ${regressions.length}`);

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ report, totalAll, totalMain, totalPr, regressions }, null, 2));
    console.log('\nSalvo em ' + jsonOut);
  }

  process.exit(regressions.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
