/* VALIDAÇÃO DE GRIFOS REAIS (offline) — recebe um JSON de registros de `user_highlights` obtido em CONSULTA SOMENTE LEITURA
   (campos usados: block_id, exact_text, prefix, suffix, occurrence — NUNCA user_id) e mede, com o motor real do site:
     1. antiga : o registro resolve na matéria ANTIGA (`origin/main`)? (controle: se não resolve, já estava obsoleto/ transcrito errado)
     2. nova   : resolve na matéria NOVA sem nenhuma ajuda, e no MESMO elemento?  → o grifo SOBREVIVE sem remapeamento no banco
     3. remap  : se não sobrevive, a ferramenta de remapeamento (offline) o recupera no mesmo elemento?
   Saída: contagens + lista das marcas que NÃO sobrevivem sem remapeamento (trecho curto) → são as «frases que precisam continuar intactas».
   Não escreve em lugar nenhum; o JSON de entrada fica fora do repositório.
   Uso: node hl-real.cjs --in registros.json [--out relatorio.json]   (registros: [{b|block_id, e|exact_text, p|prefix, s|suffix, o|occurrence}]) */
const fs = require('fs');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { start } = require('./server.cjs');
const { buildPairs, remapRecord, secNorms, locateAll } = require('./remap-highlights.cjs');
const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const inp = arg('in'); if (!inp) { console.error('uso: node hl-real.cjs --in registros.json [--out relatorio.json]'); process.exit(2); }
  const raw = JSON.parse(fs.readFileSync(inp, 'utf8')).map(r => ({ block_id: r.block_id || r.b, exact_text: r.exact_text ?? r.e, prefix: r.prefix ?? r.p ?? '', suffix: r.suffix ?? r.s ?? '', occurrence: r.occurrence ?? r.o ?? 0 }));
  const { s, base } = await start();
  const br = await chromium.launch({ ...(process.env.RM_CHROMIUM ? { executablePath: process.env.RM_CHROMIUM } : {}) });
  const open = async v => { const p = await br.newPage({ viewport: { width: 1280, height: 900 } }); await p.goto(base + '/qa.html?v=' + v, { waitUntil: 'domcontentloaded' }); await p.waitForFunction('window.__ready===true', { timeout: 120000 }); return p; };
  const po = await open('orig'), pn = await open('new');
  const RES = `({part,SUB})=>{const RT=window.RMTools,lists={};return part.map(h=>{const b=document.getElementById(h.block_id);if(!b)return null;lists[h.block_id]=lists[h.block_id]||[...b.querySelectorAll(SUB)];const a=RT.resolverAncora(b,h);if(!a)return null;const r=RT.rangeDe(a.idx,a.ini,a.fim);if(!r)return null;return {el:lists[h.block_id].indexOf(r.startContainer.parentElement.closest(SUB)),nivel:a.nivel,txt:a.idx.norm.slice(a.ini,a.fim)};});}`;
  const resolve = async (page, recs) => { const out = []; for (let k = 0; k < recs.length; k += 300) out.push(...await page.evaluate(eval(RES), { part: recs.slice(k, k + 300), SUB })); return out; };
  const antiga = await resolve(po, raw), nova = await resolve(pn, raw);
  const pairs = await buildPairs(po, pn), norms = await secNorms(pn), loc = await locateAll(po, raw);
  const remapped = raw.map((h, i) => remapRecord(h, pairs, norms, loc[i]));
  const remapRes = await resolve(pn, remapped.map(r => r.rec));
  const rows = raw.map((h, i) => {
    const a = antiga[i], n = nova[i], r = remapRes[i];
    const status = !a ? 'obsoleta-na-matéria-antiga' : (n && n.el === a.el && n.txt === a.txt ? 'sobrevive-sem-remap' : (n && n.el === a.el ? 'sobrevive-com-texto-diferente' : (n ? 'volta-em-outro-elemento' : (r && r.el === a.el ? 'recuperável-com-remap' : 'perdida'))));
    return { block_id: h.block_id, status, tocada: remapped[i].tocada, nivel_nova: n && n.nivel, trecho: (h.exact_text || '').slice(0, 90) };
  });
  const cnt = {}; rows.forEach(r => { cnt[r.status] = (cnt[r.status] || 0) + 1; });
  const porSec = {}; rows.forEach(r => { const k = r.block_id + '|' + r.status; porSec[k] = (porSec[k] || 0) + 1; });
  console.log(JSON.stringify({ registros: rows.length, ...cnt }, null, 1));
  const ruins = rows.filter(r => !/^sobrevive-sem-remap$/.test(r.status));
  console.log('\nNão sobrevivem sem remapeamento (' + ruins.length + '):'); ruins.forEach(r => console.log(' -', r.status, '|', r.block_id, '|', r.trecho));
  const out = arg('out'); if (out) fs.writeFileSync(out, JSON.stringify({ resumo: cnt, porSec, rows }, null, 1));
  await br.close(); s.close();
})().catch(e => { console.error(e); process.exit(2); });
