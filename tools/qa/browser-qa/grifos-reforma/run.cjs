#!/usr/bin/env node
/* Roda os casos (near/far/adversarial) montados por build_cases.py contra
 * o rm-tools.js REAL, num Chromium real — nada simulado na lógica de
 * ancoragem em si. Compara explicitamente dois caminhos:
 *
 *   - "old"   — indexar()+escolher() direto, o que a V2 fazia em
 *     repintar() antes desta correção (nível 1 apenas, nunca recupera
 *     texto que mudou, mesmo que levemente);
 *   - "fixed" — resolverAncora(), o que repintar() usa agora (os mesmos
 *     três níveis que aplicarHighlights() já usa há mais tempo).
 *
 * Critério de aprovação: NUNCA pintar fora do bloco/texto correto. Uma
 * recuperação a mais (nível 2/3) é ganho; uma recusa (null) é aceitável
 * e esperado sempre que o texto mudou demais para ter certeza.
 *
 * Uso:
 *   NODE_PATH="$(npm root -g)" node run.cjs cases.json rm-tools.js [--json saida.json]
 */
const fs = require('fs');
const path = require('path');

async function main() {
  const casesPath = process.argv[2];
  const rmToolsPath = process.argv[3];
  const jsonOutIdx = process.argv.indexOf('--json');
  const jsonOut = jsonOutIdx >= 0 ? process.argv[jsonOutIdx + 1] : null;

  if (!casesPath || !rmToolsPath) {
    console.error('uso: node run.cjs <cases.json> <rm-tools.js> [--json saida.json]');
    process.exit(2);
  }

  const { chromium } = require('playwright');
  const data = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
  const rmToolsSrc = fs.readFileSync(rmToolsPath, 'utf-8');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e));

  await page.setContent('<!doctype html><html><body><div id="materias-container"></div></body></html>');
  await page.addScriptTag({ content: rmToolsSrc });
  const loaded = await page.evaluate(() => !!window.RMTools);
  if (!loaded) {
    console.error('window.RMTools não carregou — rm-tools.js mudou de forma incompatível?');
    process.exit(1);
  }

  const harness = ({ cases, adversarial }) => {
    const container = document.getElementById('materias-container');
    const results = { near: [], far: [] };

    function mkBlock(id, text) {
      const sec = document.createElement('section');
      sec.id = id;
      const p = document.createElement('p');
      p.textContent = text;
      sec.appendChild(p);
      container.appendChild(sec);
      return sec;
    }

    /* `marcos` é uma lista opcional de { el, label } — quando passada, o
       resultado inclui `landedIn` com o label do elemento que REALMENTE
       contém o span pintado no DOM (closest(), não um match de texto, que
       pode dar falso positivo se a mesma frase existir em mais de um
       lugar). */
    function landedLabel(sp, marcos) {
      if (!sp || !marcos) return null;
      for (const m of marcos) {
        if (m.el.contains(sp)) return m.label;
      }
      return null;
    }

    function repintarOld(bloco, h, marcos) {
      const idx = window.RMTools.indexar(bloco);
      const i = window.RMTools.escolher(idx.norm, h);
      if (i < 0) return { ok: false };
      const r = window.RMTools.rangeDe(idx, i, i + h.exact_text.length);
      if (!r) return { ok: false };
      const tmpId = 'old-' + h.id;
      if (!window.RMTools.pintar(r, h.color, tmpId)) return { ok: false };
      const sp = bloco.querySelector('.rm-hl[data-hl="' + tmpId + '"]');
      const txt = sp ? sp.textContent : null;
      const landedIn = landedLabel(sp, marcos);
      window.RMTools.despintar(tmpId, bloco);
      return { ok: true, nivel: 1, text: txt, landedIn };
    }

    function repintarFixed(bloco, h, marcos) {
      const a = window.RMTools.resolverAncora(bloco, h);
      if (!a) return { ok: false };
      const r = window.RMTools.rangeDe(a.idx, a.ini, a.fim);
      if (!r) return { ok: false };
      const tmpId = 'fixed-' + h.id;
      if (!window.RMTools.pintar(r, h.color, tmpId, a.nivel === 3)) return { ok: false };
      const sp = bloco.querySelector('.rm-hl[data-hl="' + tmpId + '"]');
      const txt = sp ? sp.textContent : null;
      const landedIn = landedLabel(sp, marcos);
      window.RMTools.despintar(tmpId, bloco);
      return { ok: true, nivel: a.nivel, text: txt, landedIn };
    }

    for (const c of cases) {
      const blockId = 'blk-' + c.id;
      const bloco = mkBlock(blockId, c.old_text);
      const h = { id: c.id, block_id: blockId, exact_text: c.exact_text, prefix: c.prefix, suffix: c.suffix, occurrence: 0, color: 'red' };
      const sane = window.RMTools.resolverAncora(bloco, h);
      bloco.querySelector('p').textContent = c.new_text;

      const oldWay = repintarOld(bloco, h);
      const fixedWay = repintarFixed(bloco, h);
      const newNorm = c.new_text.replace(/\s+/g, ' ');
      let textInsideBlock = null, withinNewText = null;
      if (fixedWay.ok) {
        textInsideBlock = bloco.textContent.includes(fixedWay.text);
        withinNewText = newNorm.indexOf(fixedWay.text.replace(/\s+/g, ' ')) >= 0;
      }
      results[c.kind].push({
        id: c.id, saneCreationOk: !!sane,
        oldOk: oldWay.ok, oldNivel: oldWay.nivel || null,
        fixedOk: fixedWay.ok, fixedNivel: fixedWay.nivel || null,
        textInsideBlock, withinNewText, ratio: c.ratio,
      });
    }

    const advResults = [];
    for (const c of adversarial) {
      const blockId = 'advblk-' + c.id;
      const sec = document.createElement('section');
      sec.id = blockId;
      const pDecoy = document.createElement('p'); pDecoy.textContent = c.decoy_text;
      const pMain = document.createElement('p'); pMain.textContent = c.old_text;
      sec.appendChild(pDecoy); sec.appendChild(pMain);
      container.appendChild(sec);

      const h = { id: c.id, block_id: blockId, exact_text: c.exact_text, prefix: c.prefix, suffix: c.suffix, occurrence: 0, color: 'red' };
      pMain.textContent = c.new_text;

      const marcos = [{ el: pDecoy, label: 'decoy' }, { el: pMain, label: 'main' }];
      const oldWay = repintarOld(sec, h, marcos);
      const fixedWay = repintarFixed(sec, h, marcos);
      advResults.push({
        id: c.id,
        ok: fixedWay.ok, nivel: fixedWay.nivel || null,
        landedInMain: fixedWay.landedIn === 'main', landedInDecoy: fixedWay.landedIn === 'decoy',
        oldOk: oldWay.ok,
        oldLandedInMain: oldWay.landedIn === 'main', oldLandedInDecoy: oldWay.landedIn === 'decoy',
      });
    }

    return { results, advResults };
  };

  const out = await page.evaluate(harness, { cases: data.cases, adversarial: data.adversarial });
  await browser.close();

  const summarize = (kind) => {
    const lst = out.results[kind] || [];
    const n = lst.length;
    const oldOk = lst.filter((x) => x.oldOk).length;
    const fixedOk = lst.filter((x) => x.fixedOk).length;
    const badText = lst.filter((x) => x.fixedOk && !(x.textInsideBlock && x.withinNewText)).length;
    console.log(`--- ${kind} (n=${n}) ---`);
    console.log(`  OLD (escolher direto) recupera após a reforma: ${oldOk}/${n}`);
    console.log(`  FIXED (resolverAncora) recupera após a reforma: ${fixedOk}/${n}  (ganho +${fixedOk - oldOk})`);
    console.log(`  FIXED com texto fora do bloco/texto novo (tem de ser 0): ${badText}`);
    return { n, oldOk, fixedOk, badText };
  };

  const near = summarize('near');
  const far = summarize('far');

  const adv = out.advResults;
  const advOk = adv.filter((x) => x.ok).length;
  const advWrong = adv.filter((x) => x.ok && x.landedInDecoy).length;
  const advParity = adv.filter((x) => x.ok === x.oldOk && x.landedInDecoy === x.oldLandedInDecoy).length;
  console.log(`--- adversarial-within-block (n=${adv.length}) ---`);
  console.log(`  resolvido (pintou algo): ${advOk}/${adv.length}`);
  console.log(`  pintou no texto-isca (decoy) errado: ${advWrong}/${adv.length} — ver nota no README`);
  console.log(`  paridade OLD vs FIXED (prova que não é regressão desta correção): ${advParity}/${adv.length}`);

  const failed = near.badText > 0 || far.badText > 0 || advParity !== adv.length;

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ results: out.results, advResults: out.advResults, summary: { near, far, advOk, advWrong, advParity } }, null, 2));
    console.log(`\nResultado completo salvo em ${jsonOut}`);
  }

  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
