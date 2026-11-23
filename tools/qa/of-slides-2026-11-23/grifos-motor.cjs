/* Oftalmología · clases 10-15 23/11/2026 · PROVA DOS GRIFOS COM O MOTOR REAL (rm-tools.js · resolverAncora)
   Somente leitura: não usa rede nem Supabase. Recebe um arquivo JSON com os grifos já lidos (só block_id, exact_text, prefix, suffix, occurrence:
   texto do próprio site, sem identificação de aluno) e tenta reancorá-los num HTML da matéria.
   Uso:  NODE_PATH=$(npm root -g) node grifos-motor.cjs --grifos g.json --antes <html da main> --depois <html novo> [--out r.json]
   Passa se TODO grifo que ancorava no HTML «antes» ancora no «depois», no mesmo trecho (mesmo texto e mesmas ~20 letras de contexto, nível igual ou melhor). */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const arg = (k, d) => (process.argv.indexOf(k) > 0 ? process.argv[process.argv.indexOf(k) + 1] : d);
const REPO = path.resolve(__dirname, '../../..');
const ASSETS = path.join(REPO, 'Repasso-Med-Site--main/Atual - Copia/assets/rm-tools.js');
const grifos = JSON.parse(fs.readFileSync(arg('--grifos'), 'utf8'));
async function rodar(browser, htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const p = await browser.newPage();
  await p.setContent('<!doctype html><html><body><div id="materias-container"><div class="tab-content" id="tab-oftalmo">' + html + '</div></div></body></html>');
  await p.addScriptTag({ content: fs.readFileSync(ASSETS, 'utf8') });
  const r = await p.evaluate((gs) => gs.map((g, i) => {
    const bloco = document.getElementById(g.block_id);
    let a = null;
    try { a = window.RMTools.resolverAncora(bloco, g); } catch (e) { a = null; }
    if (!a) return { i, ok: false };
    const n = a.idx.norm;
    return { i, ok: true, nivel: a.nivel, txt: n.slice(a.ini, a.fim), pre: n.slice(Math.max(0, a.ini - 20), a.ini), suf: n.slice(a.fim, a.fim + 20) };
  }), grifos);
  await p.close(); return r;
}
(async () => {
  const b = await chromium.launch();
  const A = await rodar(b, arg('--antes')), D = await rodar(b, arg('--depois'));
  await b.close();
  let okA = 0, okD = 0, perdidos = [], movidos = [], pior = [];
  A.forEach((a, i) => {
    const d = D[i]; if (a.ok) okA++; if (d.ok) okD++;
    if (a.ok && !d.ok) perdidos.push(i);
    else if (a.ok && d.ok && (a.txt !== d.txt || a.pre !== d.pre || a.suf !== d.suf)) movidos.push(i);
    else if (a.ok && d.ok && d.nivel > a.nivel) pior.push(i);
  });
  const res = { total: grifos.length, ancoram_antes: okA, ancoram_depois: okD, perdidos: perdidos.map(i => ({ ...grifos[i], antes: A[i], depois: D[i] })), movidos: movidos.map(i => ({ ...grifos[i], antes: A[i], depois: D[i] })), nivel_pior: pior.length };
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
  console.log(`grifos: ${res.total} · ancoram antes: ${okA} · ancoram depois: ${okD} · perdidos: ${perdidos.length} · movidos: ${movidos.length} · nível pior: ${pior.length}`);
  perdidos.slice(0, 15).forEach(i => console.log('  PERDIDO', grifos[i].block_id, JSON.stringify(grifos[i].exact_text.slice(0, 60))));
  movidos.slice(0, 15).forEach(i => console.log('  MOVIDO ', grifos[i].block_id, JSON.stringify(grifos[i].exact_text.slice(0, 60))));
  process.exit(perdidos.length || movidos.length ? 1 : 0);
})();
